// End-to-end test of the server room (src/net/ws-room.ts, `npm run test:net`): the real server in-process, hosting
// random rooms, and headless pages running ws-page.ts with the world sync on the home land. WS_LOAD=1 adds an 8-page
// load run that prints the server's CPU share. Plan: docs/plans/server-host.md, step 8.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startWeb, waitFor, ev, snap, seesAll, sleep } from './harness.ts';
import { freePort } from '../look/lib.ts';
import { createService, loadConfig } from '../../server/src/server.ts';
import { RAILWAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import type { RailAction } from '../../src/sim/railway.ts';
import type { RailwayProbe, RailwayAdapterProbe } from './ws-page.ts';

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
const adapter = (p: Page): Promise<RailwayAdapterProbe> => ev(p.page, () => window.T.railAdapter());
// One terminal result per original token, regardless of how many status/retry replies arrived.
async function burstResults(p: Page, epoch: number, next: number, count: number) {
  const messages = (await rail(p)).messages;
  return Array.from({ length: count }, (_, k) => next - count + k).flatMap((request) => {
    const result = messages.findLast(
      (m) => m.t === 'r:result' && m.epoch === epoch && m.request === request && m.status !== 'snapshot-required',
    );
    return result ? [result] : [];
  });
}
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
  await ev(p.page, ({ target, id }: { target: 'station' | 'source'; id?: number }) => window.T.railPose(target, id), {
    target,
    id: e.id,
  });
  await sleep(60); // the presence fact is delivered before the request whose reach it validates
  const done = await waitFor(async () => {
    await ev(p.page, (edit: RailAction) => window.T.railEdit(edit), e);
    return (await rail(p)).messages.some((m) => m.t === 'r:result' && m.epoch === e.epoch && m.request === e.request);
  });
  railCheck('railway request receives a terminal receipt', done >= 0);
  const result = (await rail(p)).messages.findLast(
    (m) => m.t === 'r:result' && m.epoch === e.epoch && m.request === e.request,
  )!;
  if (result.status !== 'snapshot-required')
    railCheck(
      'terminal request is reflected in the verified local account',
      (await waitFor(async () => {
        const state = await rail(p);
        return state.accounts.some((a) => a.pid === state.pid && a.epoch === e.epoch && a.request >= e.request);
      })) >= 0,
    );
  return result;
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
  for (const railRoom of [`${RAILWAY_NS}-proto-${room}`, railwayRoomId(room)]) {
    console.log(`\nRailway namespace: ${railRoom}`);
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
      (await waitFor(async () =>
        (await Promise.all([RA, RB].map(rail))).every((s) => s.ready && s.phase === 'idle'),
      )) >= 0,
    );
    const chopA = {
      op: 'rail.chop',
      epoch: epochA,
      request: 2,
      id: RAILWAY_SOURCES[0]![0],
      ...(railRoom === railwayRoomId(room) ? { yaw: 0, collapsed: false } : {}),
    };
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
    if (railRoom === railwayRoomId(room)) {
      const initial = await rail(RA2);
      railCheck(
        'playable room has the exact appended registry',
        JSON.stringify(initial.registry.states) ===
          JSON.stringify([
            'gifts',
            'roster',
            'stacks',
            'piles',
            'sites',
            'sources',
            'bank',
            'ball',
            'tune',
            'opening',
            'railway',
          ]),
      );
      await ev(RA2.page, () => window.T.railBaseEdit({ op: 'who.set', i: 0, j: 0, n: 'Alice', c: 2 }));
      railCheck(
        'playable identity is accepted in the same authoritative roster',
        (await waitFor(async () => (await rail(RB)).people.some((p) => p.pid === 'raila' && p.name === 'Alice'))) >= 0,
      );
      await ev(RA2.page, () =>
        window.T.railBaseEdit({ op: 'gift.toss', i: 230, j: 205, k: 1, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] }),
      );
      await sleep(500);
      railCheck(
        'playable room rejects the legacy material channel',
        (await rail(RA2)).classicItems === initial.classicItems,
      );

      const epochB2 = await openRailSession(RB);
      const next = new Map<Page, number>([
        [RA2, 1],
        [RB, 1],
      ]);
      const epochs = new Map<Page, number>([
        [RA2, epochRestored],
        [RB, epochB2],
      ]);
      const request = (p: Page, fields: Omit<RailAction, 'epoch' | 'request'> & { station?: string }) => {
        const request = next.get(p)!;
        next.set(p, request + 1);
        return { ...fields, epoch: epochs.get(p)!, request };
      };
      const carryOf = async (p: Page, pid: string) => (await rail(p)).accounts.find((a) => a.pid === pid)!.carry;
      const harvestTo = async (p: Page, pid: string, wanted: number) => {
        while ((await carryOf(p, pid)) < wanted) {
          const source = (await rail(p)).sources.find((source) => source.remaining > 0);
          railCheck('finite catalog has an unspent source', !!source);
          const result = await railAction(
            p,
            request(p, { op: 'rail.chop', id: source!.id, yaw: 0, collapsed: false }),
            'source',
          );
          railCheck('real source request harvests accepted material', Number(result.accepted) > 0);
        }
        const extra = (await carryOf(p, pid)) - wanted;
        if (extra > 0) {
          const result = await railAction(
            p,
            request(p, { op: 'rail.drop', n: extra, x: RAILWAY_T1.x, y: 3000, z: RAILWAY_T1.z }),
            'station',
          );
          railCheck('odd carry remainder moves to a conserved shared pile', result.accepted === extra);
        }
      };
      while ((await rail(RA2)).counts.stock < 23) {
        await harvestTo(RA2, 'raila', 8);
        const n = Math.min(8, 23 - (await rail(RA2)).counts.stock);
        const result = await railAction(RA2, request(RA2, { op: 'rail.deposit', station: 'T1', n }), 'station');
        railCheck('legitimate production deposits prepare the final-piece race', result.accepted === n);
      }
      await harvestTo(RA2, 'raila', 4);
      await harvestTo(RB, 'railb', 4);
      await Promise.all([RA2, RB].map((p) => ev(p.page, () => window.T.railPose('station'))));
      await sleep(60);
      const race = [RA2, RB].map((p) => ({ p, e: request(p, { op: 'rail.deposit', station: 'T1', n: 4 }) }));
      await Promise.all(race.map(({ p, e }) => ev(p.page, (e: RailAction) => window.T.railEdit(e), e)));
      let raceProbeAt = Date.now();
      const raceSettled = await waitFor(async () => {
        const states = await Promise.all(race.map(({ p }) => rail(p)));
        const replies = states.map((s, k) =>
          s.messages.filter((m) => m.epoch === race[k]!.e.epoch && m.request === race[k]!.e.request),
        );
        if (replies.every((messages) => messages.some((m) => m.t === 'r:result'))) return true;
        // Separate socket callbacks can straddle a durable write. Like the real adapter, retry the SAME
        // token after correlated busy; busy itself is never a terminal result. Missing replies still fail.
        if (Date.now() - raceProbeAt >= 1000) {
          raceProbeAt = Date.now();
          await Promise.all(
            race.map(async ({ p, e }, k) => {
              const messages = replies[k]!;
              if (
                !messages.some((m) => m.t === 'r:result') &&
                messages.some((m) => m.t === 'r:state' && m.state === 'busy')
              )
                await ev(p.page, (e: RailAction) => window.T.railEdit(e), e);
            }),
          );
        }
        return false;
      });
      const raceReplies = await Promise.all(
        race.map(async ({ p, e }) => ({
          player: p.name,
          epoch: e.epoch,
          request: e.request,
          replies: (await rail(p)).messages.filter((m) => m.epoch === e.epoch && m.request === e.request),
        })),
      );
      railCheck('both final-piece requests receive terminal outcomes', raceSettled >= 0, JSON.stringify(raceReplies));
      const outcomes = await Promise.all(
        race.map(async ({ p, e }) =>
          (await rail(p)).messages.findLast(
            (m) => m.t === 'r:result' && m.epoch === e.epoch && m.request === e.request,
          )!,
        ),
      );
      railCheck(
        'one final log is accepted across the two concurrent requests',
        outcomes.reduce((sum, result) => sum + Number(result.accepted), 0) === 1,
      );
      railCheck(
        'final-piece race leaves seven carried logs and one funded bill',
        (await waitFor(async () =>
          (await Promise.all([RA2, RB, RC].map(rail))).every(
            (s) => s.counts.carry === 7 && s.counts.delivered === 24 && s.counts.total === RAILWAY_SUPPLY,
          ),
        )) >= 0,
      );
      railCheck(
        'production peers finish T1 exactly once',
        (await waitFor(
          async () =>
            (await Promise.all([RA2, RB, RC].map(rail))).every(
              (s) => s.counts.completion === 1 && s.counts.used === 24 && s.phase === 'done',
            ),
          15000,
        )) >= 0,
      );
      railCheck(
        'production completion hashes match at common ticks',
        (await waitFor(() => hashesAgree([RA2, RB, RC]))) >= 0,
      );
      const completed = (await rail(RC)).counts;
      await RC.page.reload();
      await ev(RC.page, () => window.T.start());
      await openRailSession(RC);
      railCheck(
        'reloading a completed production room restores exact material and completion',
        JSON.stringify((await rail(RC)).counts) === JSON.stringify(completed),
      );
      railCheck(
        'reloaded production peer hashes match the active players',
        (await waitFor(() => hashesAgree([RA2, RB, RC]))) >= 0,
      );
    }
    await Promise.all([RA2, RB, RC].map((p) => p.page.close()));
  }

  // 11. The production browser adapter owns reservations, but only local application can retire or depict them.
  const adapterRoom = railwayRoomId(`${room}-adapter`);
  const openAdapter = (name: string, pid: string) =>
    web.open(name, `room=${adapterRoom}&server=http://127.0.0.1:${port}&pid=${pid}&adapter=1`);
  const AA = await openAdapter('AA', 'adaptera'),
    AB = await openAdapter('AB', 'adapterb');
  const adapterReady = async () => (await Promise.all([AA, AB].map(adapter))).every((p) => p.state.ready);
  railCheck('real browser adapters wait for verified sessions', (await waitFor(adapterReady)) >= 0);
  await ev(AA.page, () => window.T.railPose('station'));
  await sleep(60);
  railCheck('adapter queues wake intent', await ev(AA.page, () => window.T.railIntent({ op: 'rail.wake' })));
  railCheck(
    'adapter wake becomes ready from accepted phase',
    (await waitFor(async () =>
      (await Promise.all([AA, AB].map(adapter))).every((p) => p.state.phase === 'idle' && p.state.pending === 0),
    )) >= 0,
  );
  // Prove rejection without relying on socket batches landing inside a real-time cadence window.
  const beforeRejected = await adapter(AA);
  railCheck(
    'adapter queues an out-of-reach stroke',
    await ev(AA.page, () => window.T.railIntent({ op: 'rail.chop', id: 0, yaw: 0, collapsed: false })),
  );
  railCheck(
    'a rejected stroke retires through verified state without material or success effects',
    (await waitFor(async () => {
      const p = await adapter(AA);
      const results = await burstResults(AA, beforeRejected.state.epoch, beforeRejected.state.next + 1, 1);
      return (
        p.state.ready &&
        p.state.pending === 0 &&
        p.state.carry === 0 &&
        p.effects.length === beforeRejected.effects.length &&
        results.length === 1 &&
        results[0]!.status === 'rejected' &&
        results[0]!.accepted === 0
      );
    })) >= 0,
  );
  const beforeBurst = await adapter(AA);
  await ev(AA.page, () => window.T.railPose('source'));
  await sleep(60);
  const incoming = await ev(
    AA.page,
    (id: number) => {
      const queued: boolean[] = [];
      for (let n = 0; n < 9; n++) queued.push(window.T.railIntent({ op: 'rail.chop', id, yaw: 0, collapsed: false }));
      return { queued, state: window.T.railAdapter().state };
    },
    RAILWAY_SOURCES[0]![0],
  );
  railCheck(
    'incoming reservations cannot offer more than eight carry slots',
    incoming.queued.filter(Boolean).length === 4 &&
      incoming.state.reservations.incoming === 8 &&
      incoming.state.freeCarry === 0 &&
      incoming.state.carry === 0,
  );
  railCheck(
    'every burst stroke retires through its terminal outcome and conserved state',
    (await waitFor(async () => {
      const s = (await adapter(AA)).state;
      const results = await burstResults(AA, incoming.state.epoch, incoming.state.next, 4);
      const harvested = results.reduce((sum, r) => sum + Number(r.accepted), 0);
      return (
        results.length === 4 &&
        results.every((r) => r.accepted === 0 || r.accepted === 2) &&
        harvested > 0 &&
        s.pending === 0 &&
        s.ready &&
        s.carry === harvested &&
        s.counts.source === beforeBurst.state.counts.source - harvested &&
        s.counts.total === RAILWAY_SUPPLY
      );
    })) >= 0,
    JSON.stringify(await burstResults(AA, incoming.state.epoch, incoming.state.next, 4)),
  );
  const afterBurst = await adapter(AA);
  const chopResults = await burstResults(AA, incoming.state.epoch, incoming.state.next, 4);
  const acceptedChops = afterBurst.effects.filter((e) => e.op === 'rail.chop');
  railCheck(
    'success effects are unique positive outcomes; snapshots never replay them',
    new Set(acceptedChops.map((e) => e.request)).size === acceptedChops.length &&
      acceptedChops.every((e) =>
        chopResults.some(
          (r) =>
            r.epoch === e.epoch &&
            r.request === e.request &&
            r.status === 'accepted' &&
            r.accepted === e.accepted &&
            e.accepted > 0,
        ),
      ) &&
      (afterBurst.resets > beforeBurst.resets ||
        acceptedChops.length === chopResults.filter((r) => Number(r.accepted) > 0).length),
  );
  while ((await adapter(AA)).state.carry < 8) {
    await ev(AA.page, () => window.T.railPose('source'));
    await sleep(60);
    const before = (await adapter(AA)).state.carry;
    railCheck(
      'adapter queues an ordinary harvest',
      await ev(
        AA.page,
        (id: number) => window.T.railIntent({ op: 'rail.chop', id, yaw: 0, collapsed: false }),
        RAILWAY_SOURCES[0]![0],
      ),
    );
    railCheck(
      'ordinary accepted harvest updates carry',
      (await waitFor(async () => {
        const s = (await adapter(AA)).state;
        return s.pending === 0 && s.carry === before + 2;
      })) >= 0,
    );
  }
  await ev(AA.page, () => window.T.railPose('station'));
  await sleep(60);
  const outgoing = await ev(AA.page, () => {
    const queued: boolean[] = [];
    for (let n = 0; n < 9; n++) queued.push(window.T.railIntent({ op: 'rail.deposit', station: 'T1', n: 1 }));
    return { queued, state: window.T.railAdapter().state };
  });
  railCheck(
    'eight outgoing reservations prevent a ninth spend without debiting carry',
    outgoing.queued.filter(Boolean).length === 8 &&
      outgoing.state.pending === 8 &&
      outgoing.state.reservations.outgoing === 8 &&
      outgoing.state.availableCarry === 0 &&
      outgoing.state.carry === 8,
  );
  railCheck(
    'every deposit has a terminal outcome and only its accepted logs leave carry',
    (await waitFor(async () => {
      const states = await Promise.all([AA, AB].map(adapter));
      const results = await burstResults(AA, outgoing.state.epoch, outgoing.state.next, 8);
      const deposited = results.reduce((sum, r) => sum + Number(r.accepted), 0);
      return (
        results.length === 8 &&
        results.every((r) => r.accepted === 0 || r.accepted === 1) &&
        deposited > 0 &&
        states.every(
          (p) =>
            p.state.ready &&
            p.state.pending === 0 &&
            p.state.counts.stock === deposited &&
            p.state.counts.carry === 8 - deposited &&
            p.state.counts.total === RAILWAY_SUPPLY,
        )
      );
    })) >= 0,
    JSON.stringify({
      results: await burstResults(AA, outgoing.state.epoch, outgoing.state.next, 8),
      states: (await Promise.all([AA, AB].map(adapter))).map(({ state, resets }) => ({
        ready: state.ready,
        status: state.status,
        pending: state.pending,
        counts: state.counts,
        resets,
      })),
      messages: (await rail(AA)).messages.filter(
        (m) => m.epoch === outgoing.state.epoch && Number(m.request) >= outgoing.state.next - 8,
      ),
    }),
  );
  const beforeSnapshot = await adapter(AA);
  let snapshotProbes = 0;
  let snapshotRequests = 0;
  railCheck(
    'snapshot rebuilds the adapter without historical accepted effects',
    (await waitFor(async () => {
      const p = await adapter(AA);
      if (p.state.ready && p.resets > beforeSnapshot.resets && p.effects.length === beforeSnapshot.effects.length)
        return true;
      // The burst may just have resynced. A throttled requestResync call queues nothing; retry it,
      // as the adapter's reconciliation path does, until a real snapshot has rebuilt the view.
      if (!snapshotRequests) {
        snapshotProbes++;
        if (await ev(AA.page, () => window.T.railSnapshot())) snapshotRequests++;
      }
      return false;
    })) >= 0,
    `${snapshotRequests} requests issued; ${snapshotProbes - snapshotRequests} probes throttled`,
  );
  await AB.page.reload();
  await ev(AB.page, () => window.T.start());
  railCheck(
    'late reload reconstructs balances without replaying effects',
    (await waitFor(async () => {
      const p = await adapter(AB);
      return (
        p.state.ready &&
        p.state.counts.stock === beforeSnapshot.state.counts.stock &&
        p.state.counts.carry === beforeSnapshot.state.counts.carry &&
        p.effects.length === 0
      );
    })) >= 0,
  );
  const beforeRestart = await adapter(AA);
  await svc.close({ save: true });
  svc = await serve();
  await Promise.all([AA, AB].map((p) => ev(p.page, () => (window.T.hashes = {}))));
  railCheck(
    'adapters reconcile restart-fenced reconnects before becoming ready',
    (await waitFor(async () => {
      const p = await adapter(AA);
      return (
        (await adapterReady()) &&
        p.state.epoch === beforeRestart.state.epoch + 1 &&
        p.state.counts.stock === beforeRestart.state.counts.stock &&
        p.state.counts.carry === beforeRestart.state.counts.carry &&
        p.effects.length === beforeRestart.effects.length
      );
    }, 15000)) >= 0,
  );
  railCheck('reconnected adapter peers share exact hashes', (await waitFor(() => hashesAgree([AA, AB]))) >= 0);
  await Promise.all([AA, AB].map((p) => p.page.close()));

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
