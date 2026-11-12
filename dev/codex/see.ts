// How a sandboxed Codex job sees the game: `node dev/codex/see.ts <npm run look options>`, then
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
if (!['look', 'playthrough', 'scenario', 'cold-start', 'net', 'perf'].includes(operation))
  throw new Error('Use see.ts [look|playthrough|scenario|cold-start|net|perf] <options>');
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
if (production && operation === 'net') throw new Error('net tests source modules, not a production page');
if (production) args.splice(args.indexOf('--production'), 1);
const seedAt = args.indexOf('--rail-seed');
const railSeed = seedAt < 0 ? undefined : args[seedAt + 1];
if (seedAt >= 0) {
  if (!railSeed || railSeed.startsWith('--')) throw new Error('--rail-seed needs a stage');
  if (operation !== 'look' || production || args.includes('--url'))
    throw new Error('--rail-seed needs a local look stack');
  args.splice(seedAt, 2);
}
const { coopWarpOptions } = (await import(
  pathToFileURL(path.resolve('dev/look/coop-warp.ts')).href
)) as typeof import('../look/coop-warp.ts');
// A brokered look uses our local URL. Supply its clock URL even with one player, so look does not classify it as an
// external site and silently disable its requested warm-up warp. The local server remains at 1x unless a pair scales it.
const real = args.includes('--real') && args.lastIndexOf('--real') > args.lastIndexOf('--warp');
const pairWarp = (operation === 'look' || operation === 'playthrough') && coopWarpOptions(args).enabled;
const warp = (!production && operation === 'look' && !real) || pairWarp;
if (production && warp)
  throw new Error(
    '--production --players 2 needs --real; omit --production to use the disposable dev server for warped co-op.',
  );
const stack =
  operation === 'net'
    ? await startNet()
    : operation === 'cold-start' || production
      ? await (
          (await import(
            pathToFileURL(path.resolve('dev/cold-start/production.ts')).href
          )) as typeof import('../cold-start/production.ts')
        ).startProduction(dir, { harness: operation !== 'cold-start' })
      : await startStack({ dataRoot: dir, warp });
let status: number;
try {
  if (railSeed) {
    const roomAt = args.indexOf('--room');
    const room = roomAt < 0 ? 'look-rail' : args[roomAt + 1];
    if (!room || room.startsWith('--')) throw new Error('--room needs a name');
    if (roomAt < 0) args.push('--room', room);
    const { writeRailSeed } = (await import(
      pathToFileURL(path.resolve('dev/look/rail-seed.ts')).href
    )) as typeof import('../look/rail-seed.ts');
    await writeRailSeed(stack.dataDir!, room, railSeed);
  }
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

// The worker's server stays inside the sandbox. Only the trusted broker starts browsers or drives tests.
async function startNet(): Promise<import('../look/lib.ts').Stack> {
  const { createServer } = await import('node:http');
  const { createService, loadConfig } = (await import(
    pathToFileURL(path.resolve('server/src/server.ts')).href
  )) as typeof import('../../server/src/server.ts');
  const { freePort } = (await import(
    pathToFileURL(path.resolve('dev/look/lib.ts')).href
  )) as typeof import('../look/lib.ts');
  const dataDir = fs.mkdtempSync(path.join(dir, 'boogle-net-'));
  const port = await freePort();
  let service: ReturnType<typeof createService> | undefined;
  const control = createServer((req, res) => {
    void (async () => {
      if (req.method !== 'POST' || !['/start', '/stop', '/save'].includes(req.url ?? '')) {
        res.writeHead(404).end();
        return;
      }
      if (req.url === '/start') {
        if (service) throw new Error('Server already running');
        service = createService(
          loadConfig(
            { DATA_DIR: dataDir, SERVER_ROOMS: '*', MAX_PLAYERS: '4', SERVER_SAVE_MS: '200' },
            { log: () => {} },
          ),
        );
        await service.listen(port);
      } else {
        await service?.close({ save: req.url === '/save' });
        service = undefined;
      }
      res.end(JSON.stringify({ port }));
    })().catch((error: unknown) => {
      res.writeHead(500).end(String(error));
    });
  });
  await new Promise<void>((resolve) => control.listen(0, '127.0.0.1', resolve));
  const address = control.address() as import('node:net').AddressInfo;
  return {
    base: `http://127.0.0.1:${address.port}/`,
    dataDir,
    async close() {
      await service?.close({ save: false });
      await new Promise<void>((resolve, reject) => control.close((error) => (error ? reject(error) : resolve())));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
