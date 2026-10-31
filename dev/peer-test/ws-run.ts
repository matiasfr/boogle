// End-to-end test of the server room (src/net/ws-room.ts, `npm run test:net`): the real server in-process, hosting
// random rooms, and headless pages running ws-page.ts with the world sync on the home land. Part 2 drives the room
// picker (src/net/room.ts) through the server going down, coming back and turning hosting off, with a second
// PeerServer playing the public fallback signaling. WS_LOAD=1 adds an 8-page
// load run that prints the server's CPU share. Plan: docs/plans/server-host.md, step 8.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PeerServer } from 'peer';
import { startWeb, waitFor, ev, snap, seesAll, sleep } from './harness.mjs';
import { freePort } from '../look/lib.mjs';
import { createService, loadConfig } from '../../server/src/server.js';
import { loadHomeLand } from '../../server/src/host/land.ts';
import { PATCH } from '../../src/sim/mushrooms.ts';

type Page = { name: string; page: import('playwright').Page; selfId: string | { error: string; max?: number } };
const results: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}

const room = 'ws' + Math.random().toString(36).slice(2, 8),
  room2 = room + 'p';
const port = await freePort();
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-ws-'));
async function serve(env: Record<string, string> = {}) {
  const env0 = { DATA_DIR: dataDir, SERVER_ROOMS: `${room},${room2}`, MAX_PLAYERS: '4', SERVER_SAVE_MS: '200', ...env };
  const svc = createService(loadConfig(env0, { log: () => {}, unrefTimers: true }));
  await svc.listen(port);
  return svc;
}
let svc = await serve();
const web = await startWeb('ws-page.ts');
const open = (name: string): Promise<Page> => web.open(name, `room=${room}&server=http://127.0.0.1:${port}`);
const world = (p: Page) => ev(p.page, () => window.T.world());
const plots = async (p: Page) => (await world(p)).plots as [number, number][];
const hasPlot = async (p: Page, [i, j]: number[]): Promise<boolean> =>
  (await plots(p)).some(([a, b]) => a === i && b === j);
// Recorded state hashes agree at every tick (after `from`) that all of `group` recorded; true if at least one is shared.
async function hashesAgree(group: Page[], from = 0): Promise<boolean> {
  const all = await Promise.all(group.map((p) => ev(p.page, () => window.T.hashes)));
  const ticks = Object.keys(all[0])
    .map(Number)
    .filter((t) => t > from && all.every((h) => t in h));
  return ticks.length > 0 && ticks.every((t) => all.every((h) => h[t] === all[0][t]));
}
const { canPlantAt } = loadHomeLand();
const cells: number[][] = [];
for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w; i += 3)
  for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h; j += 3) if (canPlantAt(i, j)) cells.push([i, j]);

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

  // 4. world: a plant reaches everyone through the server, and everyone hashes the same
  await waitFor(async () => (await Promise.all(all.map(world))).every((w) => w.status.ready), 5000);
  await ev(A.page, ([i, j]: number[]) => window.T.plant(i, j), cells[0]);
  const plantMs = await waitFor(
    async () => (await Promise.all(all.map((p) => hasPlot(p, cells[0])))).every(Boolean),
    3000,
  );
  check('a plant reaches every page within 1 s', plantMs >= 0 && plantMs < 1000, plantMs + ' ms');
  check('every page hashes the same at shared ticks', (await waitFor(() => hashesAgree(all), 4000)) >= 0);

  // 5. a late joiner gets the plot from a snapshot; past the cap a page is turned away
  const D = await open('D');
  check('late joiner D has the plot', (await waitFor(() => hasPlot(D, cells[0]), 3000)) >= 0);
  const E = await open('E');
  const refusal = E.selfId as { error?: string; max?: number };
  check(
    'E is turned away with room_full and max 4',
    refusal.error === 'room_full' && refusal.max === 4,
    JSON.stringify(refusal),
  );
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
  check(
    'the plot survives the restart',
    (await waitFor(async () => (await Promise.all(all.map((p) => hasPlot(p, cells[0])))).every(Boolean), 3000)) >= 0,
  );
  await sleep(500);
  const after = (await world(B)).tick;
  check('the world went back at most 5 ticks', after >= before - 5, `before ${before}, after ${after}`);
  await ev(B.page, ([i, j]: number[]) => window.T.plant(i, j), cells[1]);
  check(
    'an edit after the restart reaches everyone',
    (await waitFor(async () => (await Promise.all(all.map((p) => hasPlot(p, cells[1])))).every(Boolean), 3000)) >= 0,
  );

  // 8. a crash (no final save): pages resync to the last periodic save and agree again
  await sleep(400); // one periodic save holds the second plot
  await svc.close({ save: false });
  svc = await serve();
  await Promise.all(all.map((p) => ev(p.page, () => (window.T.hashes = {}))));
  const syncMs = await waitFor(() => hashesAgree(all), 4000); // only hashes recorded after the crash
  check('after a crash the pages resync and hash the same within 4 s', syncMs >= 0, syncMs + ' ms');

  // ---- part 2: the room picker ----
  const fbPort = await freePort();
  const fbServer = PeerServer({ port: fbPort, host: '127.0.0.1', path: '/peerjs' });
  const pick = (name: string) => web.open(name, `room=${room2}&server=http://127.0.0.1:${port}&picker=1&fb=${fbPort}`);
  const P = await pick('P'),
    Q = await pick('Q'),
    R = await pick('R');
  const group = [P, Q, R];
  const on = (t: string) => async () => (await Promise.all(group.map(snap))).every((s) => s.transport === t);
  check('picker: every page joins the server', (await waitFor(on('server'), 5000)) >= 0);
  await waitFor(async () => (await Promise.all(group.map(world))).every((w) => w.status.ready), 5000);

  // 10. the server goes away: everyone moves to the fallback, one tab hosts there, play goes on
  await svc.close({ save: true });
  const fbMs = await waitFor(on('fallback'), 12000);
  check('server down: every page moves to the fallback', fbMs >= 0, fbMs + ' ms');
  const oneHost = await waitFor(
    async () => (await Promise.all(group.map(snap))).filter((s) => s.host).length === 1,
    5000,
  );
  check('exactly one page hosts the fallback', oneHost >= 0);
  await ev(P.page, () => window.T.room.presence({ fb: 1 }));
  const fbPres = await waitFor(async () => {
    for (const p of [Q, R])
      if ((await snap(p)).peers.find((x: { peer: string }) => x.peer === P.selfId)?.presence.fb !== 1) return false;
    return true;
  }, 3000);
  check('presence flows on the fallback', fbPres >= 0, fbPres + ' ms');
  await ev(Q.page, ([i, j]: number[]) => window.T.plant(i, j), cells[2]);
  const fbPlant = await waitFor(
    async () => (await Promise.all(group.map((p) => hasPlot(p, cells[2])))).every(Boolean),
    4000,
  );
  check('a plot planted on the fallback reaches every page', fbPlant >= 0, fbPlant + ' ms');
  const fbTick = Math.max(...(await Promise.all(group.map(world))).map((w) => w.tick));

  // 11. the server comes back (from its older save): everyone moves back, and the server adopts the fallback's world
  svc = await serve();
  const backWs = await waitFor(on('server'), 8000);
  check('server back: every page is on the server again within 6 s', backWs >= 0 && backWs < 6000, backWs + ' ms');
  const status = await (await fetch(`http://127.0.0.1:${port}/rooms/${room2}/host`)).json();
  check(
    'the server took over the fallback world (tick)',
    status.tick >= fbTick,
    `server ${status.tick}, fallback ${fbTick}`,
  );
  const F = await pick('F');
  check('a new page sees the plot planted on the fallback', (await waitFor(() => hasPlot(F, cells[2]), 4000)) >= 0);
  group.push(F);

  // 12. hosting switched off for this room: everyone moves to a peer room on our signaling and keeps the world
  const tickBefore = Math.min(...(await Promise.all(group.map(world))).map((w) => w.tick));
  await svc.close({ save: true });
  svc = await serve({ SERVER_ROOMS: room });
  const peerMs = await waitFor(on('peer'), 10000);
  check('hosting off: every page moves to peer', peerMs >= 0, peerMs + ' ms');
  const kept = await waitFor(
    async () => (await Promise.all(group.map((p) => hasPlot(p, cells[2])))).every(Boolean),
    4000,
  );
  const tickAfter = Math.min(...(await Promise.all(group.map(world))).map((w) => w.tick));
  check('the peer room keeps the world', kept >= 0 && tickAfter >= tickBefore, `ticks ${tickBefore} -> ${tickAfter}`);

  // 13. hosting on again: the pages move back, and an old-style peer tab can't host beside the server
  await svc.close({ save: true });
  svc = await serve();
  check('hosting on: every page moves back to the server', (await waitFor(on('server'), 10000)) >= 0);
  const G = await web.open('G', `room=${room2}&idle=1`);
  check(
    'a plain peer tab never hosts a server-hosted room',
    !(await ev(G.page, (p: number) => window.T.plainPeer(p, 10000), port)),
  );

  // 14. nothing reachable: the join fails within the connect timeout
  const [deadA, deadB] = [await freePort(), await freePort()];
  const dead = await ev(G.page, ([a, b]: number[]) => window.T.tryJoin(a, b), [deadA, deadB]);
  check('with nothing reachable the join rejects in time', !!dead.error && dead.ms < 6000, JSON.stringify(dead));
  (fbServer as unknown as { close?: () => void }).close?.();

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
  await fs.rm(dataDir, { recursive: true, force: true });
}
process.exit(exitCode);
