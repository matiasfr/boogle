// Load a hosted server (default: the Fly staging app) with railway rooms of headless players that chop, drop and take,
// and sample each room's step meter (GET /rooms/:id/host `steps`, server/src/host/step-meter.ts). Plan:
// docs/plans/replication.md, "Fly shared-cpu-1x throttling check". Never point it at the production server.
//
//   node dev/peer-test/staging-load.ts --server https://boogle-server-staging.fly.dev --phases 1:600,3:600,10:600
//   --phases rooms:seconds,...   --players 6   --sample 30 (seconds between status samples, printed as JSON lines)
import { startWeb, waitFor, sleep } from './harness.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

const arg = (name: string, d: string) => {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const server = arg('server', '').replace(/\/$/, '');
if (!server) throw new Error('--server is required');
if (/^https?:\/\/(www\.)?boogle-server\./.test(server) || /boogle\.club/.test(server))
  throw new Error('refusing to load the production server');
const players = Number(arg('players', '6'));
const sampleS = Number(arg('sample', '30'));
const phases = arg('phases', '1:600,3:600,10:600')
  .split(',')
  .map((p) => p.split(':').map(Number) as [number, number]);
const run = 'ld' + Math.random().toString(36).slice(2, 6);

const web = await startWeb('ws-page.ts');
type P = Awaited<ReturnType<typeof web.open>>;
const roomPages = new Map<number, P[]>();
const epochs = new Map<number, number[]>();
const nextRequest = new Map<string, number>(); // per page: the next request token (the first page's wake is 1)
const roomId = (r: number) => railwayRoomId(`${run}${r}`);
async function status(r: number) {
  const res = await fetch(`${server}/rooms/${encodeURIComponent(roomId(r))}/host`);
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
}
async function addRoom(r: number) {
  const pages: P[] = [];
  for (let k = 0; k < players; k++) {
    const name = `${run}r${r}p${k}`;
    const p = await web.open(name, `room=${roomId(r)}&server=${server}&pid=${name}`);
    if (typeof p.selfId !== 'string') throw new Error(`${name} refused: ${JSON.stringify(p.selfId)}`);
    pages.push(p);
  }
  roomPages.set(r, pages);
  await waitFor(async () => (await Promise.all(pages.map((p) => p.page.evaluate(() => window.T.rail().ready)))).every(Boolean), 20000);
  // Each page's session (r:session) is its own epoch; the server issues them.
  await waitFor(async () => {
    await Promise.all(pages.map((p) => p.page.evaluate(() => window.T.railOpen())));
    await sleep(300);
    return (await Promise.all(pages.map((p) => p.page.evaluate(() => window.T.rail().messages.some((m: { t: string }) => m.t === 'r:session'))))).every(Boolean);
  }, 20000);
  epochs.set(r, await Promise.all(pages.map((p) => p.page.evaluate(() => Number(window.T.rail().messages.findLast((m: { t: string }) => m.t === 'r:session')!.epoch)))));
  // The first request of a fresh room wakes the line (as the end-to-end test does).
  const epoch = epochs.get(r)![0]!;
  await pages[0]!.page.evaluate((epoch) => {
    window.T.railPose('station');
    window.T.railEdit({ op: 'rail.wake', epoch, request: 1 });
  }, epoch);
  await sleep(1500);
}
const t0 = Date.now();
const loads: Promise<unknown>[] = [];
for (const [rooms, seconds] of phases) {
  for (let r = roomPages.size; r < rooms; r++) await addRoom(r);
  console.log(JSON.stringify({ phase: { rooms, seconds }, at: Math.round((Date.now() - t0) / 1000) }));
  // Every page runs its own loop for this phase (restarted at each phase, so new rooms join the load).
  const running = [...roomPages].flatMap(([r, pages]) =>
    pages.map(async (p, k) => {
      const key = `${r}:${k}`;
      const next = await p.page.evaluate(
        (o) => window.T.railLoad(o),
        { ms: seconds * 1000, every: 260, first: k * 40, epoch: epochs.get(r)![k]!, next: nextRequest.get(key) ?? (k === 0 ? 2 : 1) },
      );
      nextRequest.set(key, next as number);
      return next;
    }),
  );
  for (let s = 0; s < seconds; s += sampleS) {
    await sleep(Math.min(sampleS, seconds - s) * 1000);
    const sample = await Promise.all([...roomPages.keys()].map(async (r) => [r, await status(r)] as const));
    console.log(
      JSON.stringify({ at: Math.round((Date.now() - t0) / 1000), rooms, status: sample.map(([r, st]) => ({ r, ...(st as object) })) }),
    );
  }
  await Promise.all(running);
  const total = [...nextRequest.values()].reduce((n, x) => n + x, 0);
  console.log(JSON.stringify({ phaseDone: { rooms, requestTokensUsed: total } }));
}
await web.close();
process.exit(0);
