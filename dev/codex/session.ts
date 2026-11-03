// Session identity and turn history belong to a job, never to the CLI's global "last session".
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export function lockJob(logs: string): () => void {
  fs.mkdirSync(logs, { recursive: true });
  const lock = path.join(logs, 'active');
  try {
    fs.mkdirSync(lock);
  } catch {
    throw new Error(`Job is locked: ${lock}. If its launcher is no longer running, remove this directory and resume.`);
  }
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
  return () => fs.rmSync(lock, { recursive: true, force: true });
}

/** Archive the previous turn before replacing the latest entry points. Shared evidence stays at the job root. */
export function archiveTurn(logs: string, turn: number) {
  const dest = path.join(logs, 'turns', String(turn).padStart(3, '0'));
  if (fs.existsSync(dest)) throw new Error(`Turn archive already exists: ${dest}`);
  const staging = dest + `.tmp-${process.pid}`;
  fs.mkdirSync(staging, { recursive: true });
  for (const name of ['meta.json', 'log.txt', 'events.jsonl', 'report.md', 'handoff.md', 'evidence.json']) {
    const source = path.join(logs, name);
    if (!fs.existsSync(source)) continue;
    const target = path.join(staging, name);
    const text = fs.readFileSync(source, 'utf8');
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
): Promise<number> {
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
