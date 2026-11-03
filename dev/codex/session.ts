// Session identity and turn history belong to a job, never to the CLI's global "last session".
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

export function alive(pid: unknown): pid is number {
  if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function lockJob(logs: string, token = randomUUID()): () => void {
  fs.mkdirSync(logs, { recursive: true });
  const lock = path.join(logs, 'active');
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8'));
    if (!Number.isSafeInteger(pid) || pid <= 0 || alive(pid)) throw new Error(`Job is locked: ${lock}`);
    // Claim this dead owner's directory before removing it. A competing reclaimer cannot remove a new owner's lock.
    const claim = path.join(lock, 'reclaim');
    fs.mkdirSync(claim);
    try {
      if (Number(fs.readFileSync(path.join(lock, 'pid'), 'utf8')) !== pid || alive(pid))
        throw new Error(`Job is locked: ${lock}`);
      fs.rmSync(lock, { recursive: true });
    } finally {
      fs.rmSync(claim, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(lock);
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
  fs.writeFileSync(path.join(lock, 'token'), token);
  return () => {
    if (fs.readFileSync(path.join(lock, 'token'), 'utf8') === token) fs.rmSync(lock, { recursive: true, force: true });
  };
}

export type Lifecycle = {
  state?: 'running' | 'finished';
  pid?: number;
  codexPid?: number | null;
  brokerPid?: number | null;
  started?: string;
  finished?: string;
  status?: number;
  heartbeat?: string;
};

const pause = () => new Promise((resolve) => setTimeout(resolve, 100));

/** The intermediate exits immediately: the detached supervisor is both a session leader and an orphan. */
export async function launchJob(logs: string, args: string[], detach: boolean): Promise<number> {
  const token = randomUUID();
  const unlock = lockJob(logs, token);
  const output = fs.openSync(path.join(logs, 'launcher.txt'), 'a');
  let pid: number;
  try {
    pid = Number(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
      import { spawn } from 'node:child_process';
      import fs from 'node:fs';
      const child = spawn(process.execPath, process.argv.slice(2), { detached: true, stdio: ['ignore', 3, 3] });
      fs.writeFileSync(process.argv[1], String(child.pid));
      console.log(child.pid);
      child.unref();
    `,
          path.join(logs, 'active/pid'),
          ...args,
          '--supervisor',
          token,
        ],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe', output],
        },
      ).trim(),
    );
  } catch (error) {
    unlock();
    throw error;
  } finally {
    fs.closeSync(output);
  }
  console.log(`Job: ${logs}\nSupervisor: ${pid}\nLauncher: ${path.join(logs, 'launcher.txt')}`);
  // Wait for this turn, not a previous turn's finished metadata. Only the supervisor writes meta.json.
  const file = path.join(logs, 'meta.json');
  for (;;) {
    let meta: Lifecycle & { launchToken?: string; mode?: string } = {};
    try {
      meta = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      /* startup */
    }
    if (meta.launchToken === token) {
      if (meta.state === 'finished') {
        const report = path.join(logs, 'report.md');
        console.log(`exit ${meta.status}; report: ${report}`);
        if (meta.mode === 'task')
          console.log(`Handoff: ${path.join(logs, 'handoff.md')}\nEvidence: ${path.join(logs, 'evidence.json')}`);
        if (fs.existsSync(report)) console.log('\n' + fs.readFileSync(report, 'utf8'));
        return meta.status ?? 1;
      }
      if (detach) return 0;
    }
    if (!alive(pid)) throw new Error(`Supervisor ${pid} died; see ${path.join(logs, 'launcher.txt')}`);
    await pause();
  }
}

export type JobControl = {
  save: () => void;
  signal: AbortSignal;
  track: (child: ChildProcess) => void;
  command: (command: string, args: string[], cwd: string) => Promise<void>;
};

/** Owns metadata and signals from setup through handoff, including the long dependency install. */
export async function supervise<T extends Lifecycle>(
  logs: string,
  token: string,
  meta: T,
  run: (job: JobControl) => Promise<number>,
): Promise<number> {
  // The intermediate must have exited before the waiter can report a successful start. Elsewhere than a Mac, a subreaper
  // can adopt the orphan instead of pid 1, so don't wait for it forever.
  const orphanBy = Date.now() + 5000;
  while (process.ppid !== 1 && Date.now() < orphanBy) await pause();
  const lock = path.join(logs, 'active');
  if (fs.readFileSync(path.join(lock, 'token'), 'utf8') !== token) throw new Error('Job lock changed during launch');
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
  const save = () => {
    meta.heartbeat = new Date().toISOString();
    const file = path.join(logs, 'meta.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(meta, null, 2) + '\n');
    fs.renameSync(file + '.tmp', file);
  };
  const controller = new AbortController();
  const children = new Set<ChildProcess>();
  const stop = () => {
    controller.abort();
    for (const child of children) child.kill('SIGTERM');
  };
  const track = (child: ChildProcess) => {
    children.add(child);
    child.once('close', () => children.delete(child));
    if (controller.signal.aborted) child.kill('SIGTERM');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  Object.assign(meta, {
    state: 'running',
    pid: process.pid,
    codexPid: null,
    brokerPid: null,
    started: new Date().toISOString(),
    finished: undefined,
    status: undefined,
    launchToken: token,
  });
  save();
  const heartbeat = setInterval(save, 30_000);
  let status = 1;
  try {
    status = await run({
      save,
      signal: controller.signal,
      track,
      command: async (command, args, cwd) => {
        controller.signal.throwIfAborted();
        const child = spawn(command, args, { cwd, stdio: 'inherit' });
        track(child);
        await new Promise<void>((resolve, reject) => {
          child.once('error', reject);
          child.once('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
        });
        controller.signal.throwIfAborted();
      },
    });
  } catch (error) {
    console.error(error);
  } finally {
    for (const child of children) child.kill('SIGTERM');
    if (controller.signal.aborted) status = 130;
    clearInterval(heartbeat);
    Object.assign(meta, { state: 'finished', finished: new Date().toISOString(), status });
    save();
    fs.rmSync(lock, { recursive: true, force: true });
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
  return status;
}

/** Archive the previous turn before replacing the latest entry points. Shared evidence stays at the job root. */
export function archiveTurn(logs: string, turn: number, previous: unknown) {
  const dest = path.join(logs, 'turns', String(turn).padStart(3, '0'));
  if (fs.existsSync(dest)) throw new Error(`Turn archive already exists: ${dest}`);
  const staging = dest + `.tmp-${process.pid}`;
  fs.mkdirSync(staging, { recursive: true });
  for (const name of ['meta.json', 'log.txt', 'events.jsonl', 'report.md', 'handoff.md', 'evidence.json']) {
    const source = path.join(logs, name);
    if (!fs.existsSync(source)) continue;
    const target = path.join(staging, name);
    const text = name === 'meta.json' ? JSON.stringify(previous, null, 2) + '\n' : fs.readFileSync(source, 'utf8');
    fs.writeFileSync(target, name.endsWith('.md') ? text.replaceAll('](evidence/', '](../../evidence/') : text);
  }
  fs.renameSync(staging, dest);
}

export async function runSession(
  argv: string[],
  cwd: string,
  prompt: string,
  log: number,
  eventsFile: string,
  onSession: (id: string) => void,
  onSpawn: (child: ChildProcess) => void,
  signal: AbortSignal,
): Promise<number> {
  signal.throwIfAborted();
  const events = fs.openSync(eventsFile, 'w');
  let invalidSession = false;
  let interrupted = false;
  const child = spawn('codex', argv, { cwd, stdio: ['pipe', 'pipe', log] });
  const stop = () => {
    interrupted = true;
    child.kill('SIGTERM');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  onSpawn(child);
  const lines = createInterface({ input: child.stdout! });
  lines.on('line', (line) => {
    fs.writeSync(events, line + '\n');
    fs.writeSync(log, line + '\n');
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event?.type !== 'thread.started') return;
    try {
      if (typeof event.thread_id !== 'string' || !/^[a-f0-9-]{36}$/i.test(event.thread_id))
        throw new Error('Invalid Codex session ID');
      onSession(event.thread_id);
    } catch (error) {
      fs.writeSync(log, String(error) + '\n');
      invalidSession = true;
      stop();
    }
  });
  try {
    return await new Promise<number>((resolve) => {
      child.on('error', (error) => fs.writeSync(log, String(error) + '\n'));
      child.on('close', (code) => resolve(invalidSession ? 1 : interrupted ? 130 : (code ?? 1)));
      child.stdin!.on('error', () => {});
      child.stdin!.end(prompt);
    });
  } finally {
    lines.close();
    fs.closeSync(events);
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
