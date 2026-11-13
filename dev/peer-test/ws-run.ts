// End-to-end test of the server room (src/net/ws-room.ts, `npm run test:net`): the real server in-process, hosting
// random rooms, and headless pages running ws-page.ts with the world sync on the home land. WS_LOAD=1 adds an 8-page
// load run that prints the server's CPU share. Plan: docs/plans/server-host.md, step 8.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { useWorkerSource } from './worker-source.ts';

type Page = { name: string; page: import('playwright').Page; selfId: string | { error: string; max?: number } };
const results: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}

const args = process.argv.slice(2);
const option = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const controlUrl = option('--url');
const root = option('--root');
// Install before loading any harness dependencies: they can import src transitively, too.
useWorkerSource(root);
const { startWeb, waitFor, ev, snap, seesAll, sleep } = await import('./harness.ts');
const { freePort } = await import('../look/lib.ts');
const { createService, loadConfig } = await import('../../server/src/server.ts');
const {
  railwayChecks,
  railwaySeats,
  railwayJumpIn,
  railwayRequestStop,
  railwayLeaf,
  railwayLoad,
  railwayCartRide,
  railwayTrainRide,
} = await import('./ws-railway.ts');
const { worldRoomId } = await import('../../src/world/namespace.ts');
// Namespaced like the real game's rooms, so boot cleanup keeps it across the restart check.
const room = worldRoomId('ws' + Math.random().toString(36).slice(2, 8));
const dataDir = option('--data-dir') ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-ws-')));
let port = await freePort();
async function control(command: string) {
  const response = await fetch(new URL(command, controlUrl), { method: 'POST' });
  if (!response.ok) throw new Error(`Worker net server: ${await response.text()}`);
  return (await response.json()) as { port: number };
}
async function serve(env: Record<string, string> = {}) {
  if (controlUrl) {
    if (Object.keys(env).length) throw new Error('Broker net does not support WS_LOAD');
    port = (await control('start')).port;
    return {
      close: async ({ save }: { save: boolean }) => {
        await control(save ? 'save' : 'stop');
      },
      roomHost: () => undefined,
    };
  }
  const env0 = { DATA_DIR: dataDir, SERVER_ROOMS: '*', MAX_PLAYERS: '4', SERVER_SAVE_MS: '200', ...env };
  const svc = createService(loadConfig(env0, { log: () => {} }));
  await svc.listen(port);
  return svc;
}
let svc = await serve();
const web = await startWeb('ws-page.ts', root);
// Each page is its own player (pid from its name) unless `pid` says otherwise.
const open = (name: string, pid = 'pl' + name.toLowerCase()): Promise<Page> =>
  web.open(name, `room=${room}&server=http://127.0.0.1:${port}&pid=${pid}`);
const world = (p: Page) => ev(p.page, () => window.T.world());
const clocksReady = async (group: Page[]) =>
  (await Promise.all(group.map(world))).every((w) => w.status.ready && w.status.mode === 'client');

let exitCode = 1;
try {
  // 1. join: all on the server, nobody the lockstep host, the first page the lead
  const A = await open('A'),
    B = await open('B'),
    C = await open('C');
  let all = [A, B, C];
  const snaps = await Promise.all(all.map(snap));
  check(
    'every page is on the server transport',
    snaps.every((s) => s.transport === 'server'),
  );
  check(
    'no page is the lockstep host',
    snaps.every((s) => !s.host),
  );
  check('only the first page is the lead', snaps.map((s) => s.lead).join() === 'true,false,false');
  check('each page sees the other two', (await waitFor(() => seesAll(all), 5000)) >= 0);
  check('default room does not install the railway registry', (await ev(A.page, () => window.T.rail())) === null);

  // 2. presence: values propagate, null deletes, latency
  await Promise.all(
    all.map((p, i) => ev(p.page, (i: number) => window.T.room.presence({ name: 'p' + i, x: i }), i as number)),
  );
  const presOk = await waitFor(async () => {
    for (const p of all) {
      const s = await snap(p);
      for (const o of all)
        if (
          o !== p &&
          s.peers.find((x: { peer: string }) => x.peer === o.selfId)?.presence.name !== 'p' + all.indexOf(o)
        )
          return false;
    }
    return true;
  }, 3000);
  check('presence values propagate', presOk >= 0, presOk + ' ms');
  await ev(A.page, () => window.T.room.presence({ x: null }));
  const nullOk = await waitFor(
    async () => !('x' in (await snap(B)).peers.find((x: { peer: string }) => x.peer === A.selfId).presence),
    2000,
  );
  check('presence null deletes key', nullOk >= 0);
  await Promise.all(all.map((p) => ev(p.page, () => window.T.latency(40, 50))));
  await sleep(500);
  const lats = (await Promise.all(all.map((p) => ev(p.page, () => window.T.lat)))).flat().sort((a, b) => a - b);
  const p50 = lats[Math.floor(lats.length / 2)],
    maxLat = lats[lats.length - 1];
  check(
    'presence latency < 500 ms',
    lats.length > 200 && maxLat < 500,
    `n=${lats.length} p50=${p50}ms max=${maxLat}ms`,
  );

  // 3. send(): ordered, exactly once, not echoed, from = selfId
  await Promise.all(all.map((p) => ev(p.page, () => window.T.burst(100))));
  const want = JSON.stringify([...Array(100).keys()]);
  const sendOk = await waitFor(async () => {
    for (const p of all) {
      const msgs = await ev(p.page, () => window.T.msgs);
      if (msgs[p.selfId as string]) return false;
      for (const o of all) if (o !== p && JSON.stringify(msgs[o.selfId as string]) !== want) return false;
    }
    return true;
  }, 5000);
  check('send(): 3 x 100 messages, in order, once each, not echoed', sendOk >= 0, sendOk + ' ms');
  const errs = (await Promise.all(all.map((p) => ev(p.page, () => window.T.errors)))).flat();
  check('from matches every sender', errs.length === 0, errs.join());

  // 4. Ordinary rooms retain the clock; shared state is exercised in railwayChecks below.
  check('every page follows the server clock', (await waitFor(() => clocksReady(all), 5000)) >= 0);
  const firstTick = (await world(A)).tick;
  check('the server clock advances', (await waitFor(async () => (await world(A)).tick > firstTick, 2000)) >= 0);

  // 5. A late joiner receives the clock; past the cap a page is turned away.
  let D = await open('D');
  check('late joiner D follows the clock', (await waitFor(() => clocksReady([D]), 3000)) >= 0);
  const E = await open('E');
  const refusal = E.selfId as { error?: string; max?: number };
  check(
    'E is turned away with room_full and max 4',
    refusal.error === 'room_full' && refusal.max === 4,
    JSON.stringify(refusal),
  );
  all = [B, C, D];

  // 5b. a second tab of D's player: the newer one plays on, the older stops and is left at once
  const D2 = await open('D2', 'pld'); // the same pid and so the same key: D's browser
  const elsewhereMs = await waitFor(async () => (await ev(D.page, () => window.T.fatal)) === 'elsewhere', 2000);
  check('an older tab of the same player is told elsewhere', elsewhereMs >= 0, elsewhereMs + ' ms');
  const goneMs = await waitFor(async () => {
    const left = await ev(B.page, () => window.T.left);
    return left.some((l: { peer: string }) => l.peer === D.selfId);
  }, 1000);
  check('the older tab is left on the others within 1 s', goneMs >= 0, goneMs + ' ms');
  check('the newer tab is in the room', typeof D2.selfId === 'string');
  await D.page.close();
  D = D2;
  all = [B, C, D];

  // 6. the lead leaves: the next page leads, and the others see it leave
  await A.page.close();
  const leadMs = await waitFor(async () => (await snap(B)).lead, 2000);
  check('B becomes the lead within 2 s', leadMs >= 0, leadMs + ' ms');
  const leftMs = await waitFor(async () => {
    for (const p of all)
      if (!(await ev(p.page, () => window.T.left)).some((l: { peer: string }) => l.peer === A.selfId)) return false;
    return true;
  }, 3000);
  check('A is left on the others within 3 s', leftMs >= 0, leftMs + ' ms');

  // 7. a graceful server restart: everyone reconnects, the plot is kept, little time is lost, edits flow again
  const before = (await world(B)).tick;
  const connsBefore = await Promise.all(all.map((p) => ev(p.page, () => window.T.conn.length)));
  await svc.close({ save: true });
  svc = await serve();
  const backMs = await waitFor(async () => {
    for (const [k, p] of all.entries()) {
      const conn = await ev(p.page, () => window.T.conn);
      if (conn.length < connsBefore[k] + 2 || !conn[conn.length - 1].c) return false;
    }
    return true;
  }, 5000);
  check('pages reconnect within 5 s of a restart', backMs >= 0, backMs + ' ms');
  check('all clocks reconnect after the restart', (await waitFor(() => clocksReady(all), 3000)) >= 0);
  await sleep(500);
  const after = (await world(B)).tick;
  check('the world went back at most 5 ticks', after >= before - 5, `before ${before}, after ${after}`);
  check('the restarted clock advances', (await waitFor(async () => (await world(B)).tick > after, 2000)) >= 0);

  // 8. A crash without final save reconnects to the periodic checkpoint clock.
  await sleep(400);
  const crashConns = await Promise.all(all.map((p) => ev(p.page, () => window.T.conn.length)));
  await svc.close({ save: false });
  svc = await serve();
  const syncMs = await waitFor(async () => {
    for (const [k, p] of all.entries()) {
      const conn = await ev(p.page, () => window.T.conn);
      if (conn.length < crashConns[k] + 2 || !conn.at(-1).c) return false;
    }
    return clocksReady(all);
  }, 5000);
  check('after a crash every page reconnects to the clock within 5 s', syncMs >= 0, syncMs + ' ms');

  // 9. WS_LOAD=1: 8 pages at 20 Hz for 20 s
  if (process.env.WS_LOAD) {
    for (const p of [B, C, D]) await p.page.close();
    await svc.close({ save: false });
    svc = await serve({ MAX_PLAYERS: '8' });
    const pages: Page[] = [];
    for (let k = 0; k < 8; k++) pages.push(await open('L' + k));
    await waitFor(() => seesAll(pages), 8000);
    const cpu0 = process.cpuUsage(),
      wall0 = performance.now();
    const got: number[] = await Promise.all(pages.map((p) => ev(p.page, () => window.T.load(20, 20000))));
    const cpu = process.cpuUsage(cpu0),
      wall = performance.now() - wall0;
    const share = ((cpu.user + cpu.system) / 1000 / wall) * 100;
    const rate = got.reduce((a, b) => a + b, 0) / (8 * 7 * 20 * 20);
    console.log(`  load: server CPU ${share.toFixed(1)}% of one core; presence delivered ${(rate * 100).toFixed(0)}%`);
  }

  // 10. Railway rooms: the railway is Server kind, mirrored by every page (ws-railway.ts).
  const ctx = {
    web,
    port: () => port,
    room,
    check,
    async restart() {
      await svc.close({ save: true });
      svc = await serve();
    },
    hosted: (id: string) => svc.roomHost()?.room(id),
    dataDir,
  };
  await railwayChecks(ctx);
  await railwaySeats(ctx); // Server-kind chairs survive a hidden/closed lead and a sitter's reconnect.
  await railwayJumpIn(ctx); // a seeded playtest room, two players, through a restart
  await railwayRequestStop(ctx); // a lever request, mirrored on three tabs, and the train stopping for it
  await railwayLeaf(ctx); // Ring Island's leaf: two players bring it down, a late joiner, a reload and a restart

  // 11. WS_LOAD=1: R1a's and R1b's measurements (2, 4, 6 players at 0, 100, 200 ms added latency, normal and 5x
  // churn). WS_LOAD_PLAYERS=6 / WS_LOAD_LAT=200 / WS_LOAD_CHURN=5x pick rows.
  if (process.env.WS_LOAD) {
    await svc.close({ save: false });
    svc = await serve({ MAX_PLAYERS: '8', SERVER_SAVE_MS: '2000', UPGRADES_PER_MIN: '1000' }); // every page is one IP
    const list = (v: string | undefined) => v?.split(',').map(Number);
    if (process.env.WS_LOAD_CHURN?.split(',').includes('cart'))
      await railwayCartRide(ctx, { seconds: Number(process.env.WS_LOAD_SECONDS || 60) });
    if (process.env.WS_LOAD_CHURN?.split(',').includes('train'))
      await railwayTrainRide(ctx, { seconds: Number(process.env.WS_LOAD_SECONDS || 60) });
    await railwayLoad(ctx, {
      seconds: Number(process.env.WS_LOAD_SECONDS || 15),
      ...(process.env.WS_LOAD_PLAYERS ? { players: list(process.env.WS_LOAD_PLAYERS) } : {}),
      ...(process.env.WS_LOAD_LAT ? { lat: list(process.env.WS_LOAD_LAT) } : {}),
      ...(process.env.WS_LOAD_CHURN ? { churns: process.env.WS_LOAD_CHURN.split(',') } : {}),
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length}/${results.length} checks passed`,
  );
  exitCode = failed.length ? 1 : 0;
} catch (e) {
  console.error(e);
} finally {
  await web.close();
  await svc.close({ save: false });
  if (!controlUrl) await fs.rm(dataDir, { recursive: true, force: true });
}
process.exit(exitCode);
