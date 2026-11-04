// How a sandboxed Codex job sees the game: `BOOGLE_QUERY='proto=water' node dev/codex/see.ts <npm run look options>`, then
// open the PNGs it names with view_image. macOS's sandbox won't let Chromium start, so this runs the job's own server and
// Vite in the sandbox and asks ./look-broker.ts, outside it, to point a browser at them. See .claude/skills/codex/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Operation, Request } from './evidence.ts';

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
  const deadline = Date.now() + (operation === 'cold-start' || args.includes('--long') ? 36 : 8) * 60_000;
  while (!fs.existsSync(done)) {
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
