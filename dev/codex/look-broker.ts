// Trusted browser broker for see.ts. The worker owns its server; only this checkout's harness/scenarios run outside it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { artifacts, type Request, type Evidence, type Operation } from './evidence.ts';
import { buildAt, sameBuild } from './source.ts';
import { acquireBotSlot } from '../look/bot-queue.ts';

const worktree = fs.realpathSync(process.argv[2]!);
const dir = path.join(worktree, '.look/see');
const trusted = fileURLToPath(new URL('../../', import.meta.url));
const parent = process.ppid;
const ENTRIES: Record<Operation, string> = {
  look: 'dev/look/look.ts',
  playthrough: 'dev/look/playthrough.ts',
  scenario: 'dev/scenarios/run.ts',
  'cold-start': 'dev/cold-start.ts',
  net: 'dev/peer-test/ws-run.ts',
  perf: 'dev/look/perf.ts',
};
const VALUES: Record<Operation, string[]> = {
  look: [
    '--view',
    '--cam',
    '--look',
    '--eval',
    '--action',
    '--question',
    '--warm',
    '--frames',
    '--seconds',
    '--region',
    '--size',
    '--fov',
    '--name',
    '--room',
    '--query',
    '--until',
    '--at',
    '--saves',
    '--players',
    '--warp-speed',
    '--curves-vs',
    '--target',
  ],
  playthrough: ['--query', '--eval', '--stall', '--players', '--warp-speed', '--from', '--to', '--saves'],
  scenario: [],
  'cold-start': ['--runs', '--mode', '--seconds', '--query'],
  net: [],
  perf: ['--seconds', '--view', '--size', '--query'],
};
const FLAGS: Record<Operation, string[]> = {
  look: ['--video', '--heatmap', '--hud', '--warp', '--real', '--curves'],
  playthrough: ['--full', '--long', '--real'],
  scenario: ['--no-trace'],
  'cold-start': ['--video-probe'],
  net: [],
  perf: ['--render', '--sim', '--hardware'],
};
const FILES = ['--eval', '--action', '--curves-vs', '--saves'];
let active: ChildProcess | undefined;
const publish = (file: string, value: unknown) => {
  fs.writeFileSync(file + '.tmp', JSON.stringify(value));
  fs.renameSync(file + '.tmp', file);
};

function stopChild() {
  if (active?.pid) {
    try {
      process.kill(-active.pid, 'SIGTERM');
    } catch {
      /* already finished */
    }
  }
}
process.on('SIGTERM', () => {
  stopChild();
  process.exit(1);
});
process.on('SIGINT', () => {
  stopChild();
  process.exit(1);
});

function inside(file: string) {
  const real = fs.realpathSync(path.resolve(worktree, file));
  if (!real.startsWith(worktree + path.sep)) throw new Error(`${file} is outside the worktree`);
  return real;
}

function vet(value: unknown): Request {
  if (!value || typeof value !== 'object') throw new Error('Expected a request object');
  const r = value as Partial<Request>;
  if (!r.operation || !Object.hasOwn(ENTRIES, r.operation)) throw new Error('Unknown operation');
  const operation = r.operation;
  if (typeof r.url !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+\/$/.test(r.url))
    throw new Error('url must be on 127.0.0.1');
  if (typeof r.query !== 'string' || typeof r.dataDir !== 'string') throw new Error('Missing query or data directory');
  if (
    r.clockUrl !== undefined &&
    (typeof r.clockUrl !== 'string' || !/^http:\/\/127\.0\.0\.1:\d+\/clock$/.test(r.clockUrl))
  )
    throw new Error('clockUrl must be a local server clock');
  if (!Array.isArray(r.args) || r.args.some((a) => typeof a !== 'string')) throw new Error('args must be strings');
  const args = [...r.args];
  let scenarios = 0;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (FLAGS[operation].includes(flag)) continue;
    if (VALUES[operation].includes(flag)) {
      const value = args[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`${flag} needs a value`);
      if (FILES.includes(flag)) args[i] = inside(value);
      if (flag === '--name' && !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Use a simple capture name');
    } else if (
      operation === 'scenario' &&
      /^[a-z0-9-]+$/.test(flag) &&
      flag !== 'run' &&
      fs.existsSync(path.join(trusted, 'dev/scenarios', flag + '.ts'))
    ) {
      scenarios++;
    } else throw new Error(`Unsupported ${operation} argument: ${flag}`);
  }
  if (operation === 'scenario' && !scenarios) throw new Error('Name at least one existing scenario');
  const dataDir = fs.realpathSync(r.dataDir);
  // Older builds put their temporary server data directly in the OS temp directory.
  const localTemp =
    path.dirname(dataDir) === fs.realpathSync(os.tmpdir()) && path.basename(dataDir).startsWith('boogle-look-');
  if (!localTemp && !dataDir.startsWith(dir + path.sep)) throw new Error('Unexpected server data directory');
  if (r.clockUrl && operation !== 'look' && operation !== 'playthrough') throw new Error('This operation cannot warp');
  return { operation, url: r.url, query: r.query, dataDir, args, clockUrl: r.clockUrl };
}

async function execute(id: string, request: Request) {
  const out = path.join(worktree, '.look/evidence', id);
  fs.mkdirSync(out, { recursive: true });
  const before = buildAt(worktree);
  const harness = buildAt(trusted);
  const started = new Date().toISOString();
  const { operation, url, query } = request;
  const args = [...request.args];
  if (request.clockUrl) args.push('--clock-url', request.clockUrl);
  if (operation === 'cold-start') args.push('--direct');
  if (operation === 'net') args.push('--root', worktree, '--data-dir', request.dataDir);
  if (operation === 'perf') args.push('--json', path.join(out, 'render.json'));
  if (operation === 'look' && args.includes('--at') && !args.includes('--saves')) {
    const latest = path.join(dir, 'latest-playthrough.json');
    if (!fs.existsSync(latest)) throw new Error('Run see.ts playthrough first, or give --saves <directory>');
    const saves = JSON.parse(fs.readFileSync(latest, 'utf8')) as { directory: string };
    args.push('--saves', inside(saves.directory));
  }
  if (operation === 'playthrough') {
    // No --eval: playthrough's own default, the production railway bot.
    args.push('--data-dir', request.dataDir, '--name', 'run', '--root', worktree);
  }
  const outputFile = path.join(out, 'output.txt');
  const job = `${path.basename(worktree)}: ${operation} ${request.args.join(' ')}`;
  publish(path.join(dir, 'active.json'), { id, job });
  const lease = await acquireBotSlot(
    job,
    (message) => {
      publish(path.join(dir, `${id}.queued.json`), { message });
    },
    request.args.includes('--long'),
  );
  publish(path.join(dir, `${id}.started.json`), { at: Date.now(), waitedMs: lease.waitedMs });
  const status = await new Promise<number>((resolve) => {
    const log = fs.openSync(outputFile, 'w');
    const child = (active = spawn(
      process.execPath,
      [
        path.join(trusted, ENTRIES[operation]),
        ...args,
        '--url',
        url,
        ...(operation === 'net' || operation === 'perf' ? [] : ['--out', out]),
      ],
      {
        cwd: worktree,
        env: {
          ...process.env,
          BOOGLE_QUERY: query,
          BOOGLE_BOT_LEASE: lease.file,
          ...(operation === 'net' ? { WS_LOAD: '' } : {}),
        },
        detached: true,
        stdio: ['ignore', log, log],
      },
    ));
    let timedOut = false;
    const timeout =
      operation === 'cold-start' || (operation === 'playthrough' && args.includes('--long')) ? 35 * 60_000 : 7 * 60_000;
    const timer = setTimeout(() => {
      timedOut = true;
      stopChild();
    }, timeout);
    const parentCheck = setInterval(() => {
      try {
        process.kill(parent, 0);
      } catch {
        stopChild();
      }
    }, 1000);
    child.on('error', (error) => fs.writeSync(log, String(error) + '\n'));
    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(parentCheck);
      active = undefined;
      if (timedOut) fs.writeSync(log, `Broker timed out after ${timeout / 60000} minutes\n`);
      fs.closeSync(log);
      resolve(timedOut ? 124 : (code ?? 1));
    });
  }).finally(lease.release);
  fs.rmSync(path.join(dir, 'active.json'), { force: true });
  const after = buildAt(worktree);
  const harnessAfter = buildAt(trusted);
  const changedDuringRun = !sameBuild(before, after) || !sameBuild(harness, harnessAfter);
  const evidence: Evidence = {
    id,
    operation,
    args: request.args,
    query,
    started,
    finished: new Date().toISOString(),
    status: changedDuringRun ? 1 : status,
    before,
    after,
    harness,
    harnessAfter,
    changedDuringRun,
    artifacts: artifacts(out),
  };
  fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
  if (operation === 'playthrough' && fs.existsSync(path.join(out, 'run/saves'))) {
    fs.writeFileSync(
      path.join(dir, 'latest-playthrough.json'),
      JSON.stringify({ directory: path.join(out, 'run/saves') }),
    );
  }
  const output = fs.readFileSync(outputFile, 'utf8');
  return {
    status: evidence.status,
    output: output + (changedDuringRun ? '\nBuild changed during this run; repeat verification.\n' : ''),
    evidence: path.join(out, 'evidence.json'),
  };
}

fs.mkdirSync(dir, { recursive: true });
// A resumed job keeps checkpoints, but an interrupted request's old local server is gone.
for (const name of fs.readdirSync(dir)) {
  if (!/^\d+-\d+\.json$/.test(name)) continue;
  const done = path.join(dir, name.replace('.json', '.done.json'));
  if (!fs.existsSync(done))
    fs.writeFileSync(done, JSON.stringify({ status: 130, output: 'Previous broker stopped; rerun this operation.' }));
}
fs.writeFileSync(path.join(dir, 'ready.tmp'), JSON.stringify({ pid: process.pid }));
fs.renameSync(path.join(dir, 'ready.tmp'), path.join(dir, 'ready.json'));
for (;;) {
  try {
    process.kill(parent, 0);
  } catch {
    process.exit(0);
  }
  for (const name of fs.readdirSync(dir)) {
    if (!/^\d+-\d+\.json$/.test(name)) continue;
    const id = name.slice(0, -5);
    const done = path.join(dir, `${id}.done.json`);
    if (fs.existsSync(done)) continue;
    let answer;
    try {
      answer = await execute(id, vet(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'))));
    } catch (error) {
      answer = { status: 2, output: String(error) };
    }
    fs.writeFileSync(`${done}.tmp`, JSON.stringify(answer));
    fs.renameSync(`${done}.tmp`, done);
  }
  await new Promise((r) => setTimeout(r, 200));
}
