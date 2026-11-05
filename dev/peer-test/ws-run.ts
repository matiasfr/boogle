// End-to-end test of the server room (src/net/ws-room.ts, `npm run test:net`): the real server in-process, hosting
// random rooms, and headless pages running ws-page.ts with the world sync on the home land. WS_LOAD=1 adds an 8-page
// load run that prints the server's CPU share. Plan: docs/plans/server-host.md, step 8.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startWeb, waitFor, ev, snap, seesAll, sleep } from './harness.ts';
import { freePort } from '../look/lib.ts';
import { createService, loadConfig } from '../../server/src/server.ts';
import { RAILWAY_NS } from '../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY } from '../../src/sim/railway-layout.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import type { RailwayProbe } from './ws-page.ts';

type Page = { name: string; page: import('playwright').Page; selfId: string | { error: string; max?: number } };
const results: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}

const room = 'ws' + Math.random().toString(36).slice(2, 8);
const port = await freePort();
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'boogle-ws-'));
async function serve(env: Record<string, string> = {}) {
  const env0 = { DATA_DIR: dataDir, SERVER_ROOMS: '*', MAX_PLAYERS: '4', SERVER_SAVE_MS: '200', ...env };
  const svc = createService(loadConfig(env0, { log: () => {} }));
  await svc.listen(port);
  return svc;
}
let svc = await serve();
const web = await startWeb('ws-page.ts');
// Each page is its own player (pid from its name) unless `pid` says otherwise.
const open = (name: string, pid = 'pl' + name.toLowerCase()): Promise<Page> =>
  web.open(name, `room=${room}&server=http://127.0.0.1:${port}&pid=${pid}`);
const world = (p: Page) => ev(p.page, () => window.T.world());
const items = async (p: Page) => (await world(p)).items as [number, number][];
const hasItem = async (p: Page, [i, j]: number[]): Promise<boolean> =>
  (await items(p)).some(([a, b]) => a === i && b === j);
const rail = (p: Page): Promise<RailwayProbe> => ev(p.page, () => window.T.rail());
// A failed authority proof ends this run immediately; later checks cannot turn it into a pass.
function railCheck(name: string, ok: boolean, detail = '') {
  check(name, ok, detail);
  if (!ok) throw new Error(`Railway proof stopped: ${name}`);
}
async function openRailSession(p: Page) {
  railCheck('railway peer receives a verified snapshot', (await waitFor(async () => (await rail(p)).ready)) >= 0);
  await ev(p.page, () => (window.T.railMessages.length = 0));
  const started = await waitFor(async () => {
    await ev(p.page, () => window.T.railOpen());
    return (await rail(p)).messages.some((m) => m.t === 'r:session');
  });
  railCheck('railway peer receives a server-issued session', started >= 0);
  const message = (await rail(p)).messages.findLast((m) => m.t === 'r:session')!;
  return Number(message.epoch);
}
async function railAction(p: Page, e: RailAction & { station?: string }, target: 'station' | 'source') {
  await ev(p.page, (at: 'station' | 'source') => window.T.railPose(at), target);
  await sleep(60); // the presence fact is delivered before the request whose reach it validates
  const done = await waitFor(async () => {
    await ev(p.page, (edit: RailAction) => window.T.railEdit(edit), e);
    return (await rail(p)).messages.some((m) => m.t === 'r:result' && m.epoch === e.epoch && m.request === e.request);
  });
  railCheck('railway request receives a terminal receipt', done >= 0);
  return (await rail(p)).messages.findLast(
    (m) => m.t === 'r:result' && m.epoch === e.epoch && m.request === e.request,
  )!;
}
// Recorded state hashes agree at every tick (after `from`) that all of `group` recorded; true if at least one is shared.
async function hashesAgree(group: Page[], from = 0): Promise<boolean> {
  const all = await Promise.all(group.map((p) => ev(p.page, () => window.T.hashes)));
  const ticks = Object.keys(all[0])
    .map(Number)
    .filter((t) => t > from && all.every((h) => t in h));
  return ticks.length > 0 && ticks.every((t) => all.every((h) => h[t] === all[0][t]));
}
const cells = [
  [230, 205],
  [232, 207],
];

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

  // 4. world: a toss reaches everyone through the server, and everyone hashes the same
  await waitFor(async () => (await Promise.all(all.map(world))).every((w) => w.status.ready), 5000);
  await ev(A.page, ([i, j]: number[]) => window.T.toss(i, j), cells[0]);
  const tossMs = await waitFor(
    async () => (await Promise.all(all.map((p) => hasItem(p, cells[0]!)))).every(Boolean),
    3000,
  );
  check('a toss reaches every page within 1 s', tossMs >= 0 && tossMs < 1000, tossMs + ' ms');
  check('every page hashes the same at shared ticks', (await waitFor(() => hashesAgree(all), 4000)) >= 0);

  // 5. a late joiner gets the item from a snapshot; past the cap a page is turned away
  let D = await open('D');
  check('late joiner D has the item', (await waitFor(() => hasItem(D, cells[0]!), 3000)) >= 0);
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
  check(
    'the item survives the restart',
    (await waitFor(async () => (await Promise.all(all.map((p) => hasItem(p, cells[0]!)))).every(Boolean), 3000)) >= 0,
  );
  await sleep(500);
  const after = (await world(B)).tick;
  check('the world went back at most 5 ticks', after >= before - 5, `before ${before}, after ${after}`);
  await ev(B.page, ([i, j]: number[]) => window.T.toss(i, j), cells[1]);
  check(
    'an edit after the restart reaches everyone',
    (await waitFor(async () => (await Promise.all(all.map((p) => hasItem(p, cells[1]!)))).every(Boolean), 3000)) >= 0,
  );

  // 8. a crash (no final save): pages resync to the last periodic save and agree again
  await sleep(400); // one periodic save holds the second item
  await svc.close({ save: false });
  svc = await serve();
  await Promise.all(all.map((p) => ev(p.page, () => (window.T.hashes = {}))));
  const syncMs = await waitFor(() => hashesAgree(all), 4000); // only hashes recorded after the crash
  check('after a crash the pages resync and hash the same within 4 s', syncMs >= 0, syncMs + ' ms');

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

  // 10. The opted-in namespace uses the same room transport with a different registry and durable receipts.
  // Headless peers have no flights or views: all observed material comes from accepted rules/snapshots.
  const railRoom = `${RAILWAY_NS}-proto-${room}`;
  const openRail = (name: string, pid: string): Promise<Page> =>
    web.open(name, `room=${railRoom}&server=http://127.0.0.1:${port}&pid=${pid}`);
  const RA = await openRail('RA', 'raila'),
    RB = await openRail('RB', 'railb');
  const epochA = await openRailSession(RA),
    epochB = await openRailSession(RB);
  railCheck(
    'wake has one terminal acceptance',
    (await railAction(RA, { op: 'rail.wake', epoch: epochA, request: 1 }, 'station')).accepted === 1,
  );
  railCheck(
    'both peers observe the completed wake before harvesting',
    (await waitFor(async () => (await Promise.all([RA, RB].map(rail))).every((s) => s.ready && s.phase === 'idle'))) >=
      0,
  );
  const chopA = { op: 'rail.chop', epoch: epochA, request: 2, id: RAILWAY_SOURCES[0]![0] };
  const harvestedA = await railAction(RA, chopA, 'source');
  railCheck('A harvests two conserved logs', harvestedA.accepted === 2, JSON.stringify(harvestedA));
  railCheck(
    'B harvests two conserved logs',
    (await railAction(RB, { ...chopA, epoch: epochB, request: 1 }, 'source')).accepted === 2,
  );
  // Retry an already accepted token after its original action. It must return that outcome without another stroke.
  await ev(RA.page, (e: RailAction) => window.T.railEdit(e), chopA);
  await sleep(400);
  railCheck(
    'duplicate request does not harvest twice',
    (await waitFor(async () => (await rail(RA)).counts.carry === 4 && (await rail(RB)).counts.carry === 4)) >= 0,
  );
  railCheck(
    'accepted deposit moves two logs to shared stock',
    (await railAction(RA, { op: 'rail.deposit', epoch: epochA, request: 3, station: 'T1', n: 2 }, 'station'))
      .accepted === 2,
  );
  railCheck(
    'two railway peers agree on conserved balances',
    (await waitFor(async () => {
      const states = await Promise.all([RA, RB].map(rail));
      return states.every((s) => s.counts.stock === 2 && s.counts.carry === 2 && s.counts.total === RAILWAY_SUPPLY);
    })) >= 0,
  );
  railCheck('railway hashes match at common ticks', (await waitFor(() => hashesAgree([RA, RB]))) >= 0);
  const RC = await openRail('RC', 'railc');
  await openRailSession(RC);
  railCheck(
    'late railway snapshot contains exact stock and carry',
    (await waitFor(async () => {
      const s = await rail(RC);
      return s.counts.stock === 2 && s.counts.carry === 2 && s.counts.total === RAILWAY_SUPPLY;
    })) >= 0,
  );
  const RA2 = await openRail('RA2', 'raila');
  const epochA2 = await openRailSession(RA2);
  railCheck('same-pid takeover advances the durable session epoch', epochA2 === epochA + 1);
  railCheck(
    'same-pid takeover retires the old socket',
    (await waitFor(async () => (await ev(RA.page, () => window.T.fatal)) === 'elsewhere')) >= 0,
  );
  const stale = await railAction(RA2, { ...chopA, request: 4 }, 'source');
  railCheck('an old epoch cannot spend through the new session', stale.status === 'snapshot-required');
  await RA.page.close();
  railCheck('takeover peers still hash identically', (await waitFor(() => hashesAgree([RA2, RB, RC]))) >= 0);
  // A normal process restart exercises socket reconnect/status; SIGKILL and replacement windows are server tests.
  await svc.close({ save: true });
  svc = await serve();
  await Promise.all([RA2, RB, RC].map((p) => ev(p.page, () => (window.T.hashes = {}))));
  railCheck('reconnected railway peers agree after restore', (await waitFor(() => hashesAgree([RA2, RB, RC]))) >= 0);
  railCheck(
    'restored progress and persistent carry are exact',
    (await Promise.all([RA2, RB, RC].map(rail))).every(
      (s) => s.counts.stock === 2 && s.counts.carry === 2 && s.counts.total === RAILWAY_SUPPLY,
    ),
  );
  const epochRestored = await openRailSession(RA2);
  railCheck('reconnect retires the old epoch before more requests', epochRestored === epochA2 + 1);
  await ev(RA2.page, (epoch: number) => window.T.railStatus(epoch, 3), epochA);
  railCheck(
    'reconnect status recovers the old accepted deposit receipt',
    (await waitFor(async () =>
      (await rail(RA2)).messages.some(
        (m) => m.t === 'r:result' && m.epoch === epochA && m.request === 3 && m.accepted === 2,
      ),
    )) >= 0,
  );

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
