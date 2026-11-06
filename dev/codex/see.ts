// How a sandboxed Codex job sees the game: `node dev/codex/see.ts --query 'proto=place' <npm run look options>`, then
// open the PNGs it names with view_image. macOS's sandbox won't let Chromium start, so this runs the job's own server and
// Vite in the sandbox and asks ./look-broker.ts, outside it, to point a browser at them. See .claude/skills/codex/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Operation, Request } from './evidence.ts';

// Frontend-only queue: each reload group still uses the trusted broker's existing look operation.
if (process.argv[2] === 'shots') {
  process.argv.splice(2, 1);
  await import(pathToFileURL(path.resolve('dev/look/shots.ts')).href);
  process.exit(process.exitCode ?? 0);
}

// run.ts also copies this client to .look/see-client.ts, so --base-ref can target a build predating the broker.
// Load that build's server inside the worker sandbox, never in the trusted broker process.
const { startStack, sleep } = (await import(
  pathToFileURL(path.resolve('dev/look/lib.ts')).href
)) as typeof import('../look/lib.ts');

const dir = path.resolve('.look/see');
fs.mkdirSync(dir, { recursive: true });
const id = `${Date.now()}-${process.pid}`;
const args = process.argv.slice(2);
const operation = (args[0] && !args[0].startsWith('--') ? args.shift() : 'look') as Operation;
if (!['look', 'playthrough', 'scenario', 'cold-start'].includes(operation))
  throw new Error('Use see.ts [look|playthrough|scenario|cold-start] <options>');
const ready = path.join(dir, 'ready.json');
if (!fs.existsSync(ready)) throw new Error('No broker: run this task through dev/codex/run.ts');
const { pid } = JSON.parse(fs.readFileSync(ready, 'utf8')) as { pid: number };
function brokerAlive() {
  try {
    process.kill(pid, 0);
  } catch (error) {
    // macOS denies even signal 0 across the sandbox boundary. EPERM still means the process exists.
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
  }
}
brokerAlive();
const production = args.includes('--production');
if (production) args.splice(args.indexOf('--production'), 1);
const { coopWarpOptions } = (await import(
  pathToFileURL(path.resolve('dev/look/coop-warp.ts')).href
)) as typeof import('../look/coop-warp.ts');
const warp = (operation === 'look' || operation === 'playthrough') && coopWarpOptions(args).enabled;
if (production && warp)
  throw new Error(
    '--production --players 2 needs --real; omit --production to use the disposable dev server for warped co-op.',
  );
const stack =
  operation === 'cold-start' || production
    ? await (
        (await import(
          pathToFileURL(path.resolve('dev/cold-start/production.ts')).href
        )) as typeof import('../cold-start/production.ts')
      ).startProduction(dir, { harness: operation !== 'cold-start' })
    : await startStack({ dataRoot: dir, warp });
let status: number;
try {
  const request: Request = {
    operation,
    url: stack.base,
    dataDir: stack.dataDir!,
    args,
    query: process.env.BOOGLE_QUERY ?? '',
    clockUrl: stack.clockUrl,
  };
  fs.writeFileSync(path.join(dir, `${id}.tmp`), JSON.stringify(request));
  fs.renameSync(path.join(dir, `${id}.tmp`), path.join(dir, `${id}.json`)); // the broker never reads half a request
  const done = path.join(dir, `${id}.done.json`);
  const started = path.join(dir, `${id}.started.json`);
  let deadline = Infinity;
  let queued = '';
  while (!fs.existsSync(done)) {
    const queueFile = path.join(dir, `${id}.queued.json`);
    const activeFile = path.join(dir, 'active.json');
    let message = '';
    if (fs.existsSync(queueFile))
      message = (JSON.parse(fs.readFileSync(queueFile, 'utf8')) as { message: string }).message;
    else {
      try {
        const active = JSON.parse(fs.readFileSync(activeFile, 'utf8')) as { id: string; job: string };
        if (active.id !== id) message = `bot queue: queued behind ${active.job}`;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    if (message && message !== queued) console.log(message);
    queued = message;
    if (deadline === Infinity && fs.existsSync(started)) {
      const { at } = JSON.parse(fs.readFileSync(started, 'utf8')) as { at: number };
      deadline = at + (operation === 'cold-start' || args.includes('--long') ? 36 : 8) * 60_000;
    }
    if (Date.now() > deadline)
      throw new Error('No answer from the look broker (is this running under dev/codex/run.ts?)');
    brokerAlive();
    await sleep(300);
  }
  const answer = JSON.parse(fs.readFileSync(done, 'utf8')) as { status: number; output: string; evidence?: string };
  console.log(answer.output);
  if (answer.evidence) console.log(`Evidence: ${answer.evidence}`);
  status = answer.status;
} finally {
  await stack.close();
}
process.exit(status);
