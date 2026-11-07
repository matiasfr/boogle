// Load a hosted server (default: the Fly staging app) with railway rooms of headless players that chop, drop and take,
// and sample each room's step meter (GET /rooms/:id/host `steps`, server/src/host/step-meter.ts). Plan:
// docs/plans/replication.md, "Fly shared-cpu-1x throttling check". Never point it at the production server.
// Players are Node worker threads running ws-page.ts (node-player.ts), so no browser is needed.
//
//   node dev/peer-test/staging-load.ts --server https://boogle-server-staging.fly.dev --phases 1:600,3:600,10:600
//   --phases rooms:seconds,...   --players 6   --sample 30 (seconds between status samples, printed as JSON lines)
import { Worker } from 'node:worker_threads';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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

type Player = { call: (cmd: string, ...args: unknown[]) => Promise<any>; close: () => void }; // oxlint-disable-line typescript/no-explicit-any
async function spawn(room: string, name: string): Promise<Player> {
  const w = new Worker(new URL('./node-player.ts', import.meta.url), {
    workerData: { search: `?room=${room}&server=${server}&pid=${name}` },
  });
  const waiting = new Map<number, (v: unknown) => void>();
  let n = 0;
  await new Promise<void>((resolve, reject) => {
    w.on('error', reject);
    w.on('message', ({ id, result }: { id: number; result: unknown }) => {
      if (id === -1) resolve();
      else {
        const done = waiting.get(id);
        waiting.delete(id);
        done?.(result);
      }
    });
  });
  return {
    call: (cmd, ...args) =>
      new Promise((resolve) => {
        const id = n++;
        waiting.set(id, resolve);
        w.postMessage({ id, cmd, args });
      }),
    close: () => void w.terminate(),
  };
}

const roomId = (r: number) => railwayRoomId(`${run}${r}`);
const rooms = new Map<number, Player[]>();
const epochs = new Map<string, number>(); // room:player -> the server-issued session epoch (r:session)
const nextRequest = new Map<string, number>(); // room:player -> the next request token
async function status(r: number) {
  const res = await fetch(`${server}/rooms/${encodeURIComponent(roomId(r))}/host`);
  return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
}
async function addRoom(r: number) {
  const ps: Player[] = [];
  for (let k = 0; k < players; k++) {
    const name = `${run}r${r}p${k}`;
    const p = await spawn(roomId(r), name);
    const self = await p.call('start');
    if (typeof self !== 'string') throw new Error(`${name} refused: ${JSON.stringify(self)}`);
    ps.push(p);
  }
  rooms.set(r, ps);
  const ready = async () => (await Promise.all(ps.map((p) => p.call('ready')))).every(Boolean);
  while (!(await ready())) await sleep(200);
  await Promise.all(ps.map((p) => p.call('railOpen')));
  // A session open can answer busy while another player's durable write is pending: ask again until each has one.
  for (;;) {
    const got = await Promise.all(ps.map((p) => p.call('epoch')));
    if (got.every((e) => e >= 0)) break;
    await sleep(1000);
    await Promise.all(ps.filter((_, k) => got[k] < 0).map((p) => p.call('railOpen')));
  }
  // The first request of a fresh room wakes the line (as the end-to-end test does).
  for (let k = 0; k < ps.length; k++) {
    epochs.set(`${r}:${k}`, await ps[k]!.call('epoch'));
    nextRequest.set(`${r}:${k}`, k === 0 ? 2 : 1);
  }
  const epoch = epochs.get(`${r}:0`)!;
  await ps[0]!.call('railPose', 'station');
  await ps[0]!.call('railEdit', { op: 'rail.wake', epoch, request: 1 });
  await sleep(1500);
}

const t0 = Date.now();
const at = () => Math.round((Date.now() - t0) / 1000);
for (const [n, seconds] of phases) {
  for (let r = rooms.size; r < n; r++) await addRoom(r);
  console.log(JSON.stringify({ phase: { rooms: n, seconds }, at: at() }));
  // Every player runs ws-page.ts's replicated-request loop (chop, drop, take every 260 ms, acked by the railway's
  // replication packets) for this phase, restarted at each phase so new rooms join the load.
  const running = [...rooms].flatMap(([r, ps]) =>
    ps.map(async (p, k) => {
      const key = `${r}:${k}`;
      const next = await p.call('railLoad', {
        ms: seconds * 1000,
        every: 260,
        first: k * 40,
        epoch: epochs.get(key)!,
        next: nextRequest.get(key)!,
      });
      const sent = (next as number) - nextRequest.get(key)!;
      nextRequest.set(key, next);
      return sent;
    }),
  );
  for (let s = 0; s < seconds; s += sampleS) {
    await sleep(Math.min(sampleS, seconds - s) * 1000);
    const sample = await Promise.all([...rooms.keys()].map(async (r) => ({ r, ...(await status(r)) })));
    console.log(JSON.stringify({ at: at(), rooms: n, status: sample }));
  }
  const used = await Promise.all(running);
  console.log(JSON.stringify({ phaseDone: { rooms: n, requests: used.reduce((a, x) => a + x, 0) } }));
}
for (const ps of rooms.values()) for (const p of ps) p.close();
process.exit(0);
