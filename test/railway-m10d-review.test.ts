// Review of M10 d (branch ecs/m10d-works-views): the Works group's views read rows through the read facade
// (`adapter.read.world()`, `read.ready()`, `read.pid`, `read.movement()`) and the line-two queries. These tests run the
// very reads the views make (works-view, breaker-view, footing-view, crossing-view, roundhouse-view with garage-state's
// roomFacts, home-station-view, trophy-plinth; each block below names its file) against a client's worlds, the mirror
// and the predicted clone, and compare them with the `inspect()` fields they replaced (main's code), frame by frame over
// scripted runs at the Works seeds and a random action stream. The views need three.js and the DOM, so their reads are
// reproduced here as written; a change to a view's read is a change to its function below. Modelled on
// test/railway-m10e-review.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailwayAdapter, railMovement, type RailwayInspection } from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import {
  account,
  accounts,
  beam,
  boiler,
  rail,
  rock,
  shed,
  trains,
  works,
  type ReadWorld,
} from '../src/sim/railway-rows.ts';
import { railJobs } from '../src/sim/railway-queries.ts';
import { line2Completed, line2Trains } from '../src/sim/railway-queries-line2.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { WORKS_ROCKS } from '../src/sim/railway-works-layout.ts';
import { Pile } from '../src/sim/railway-components.ts';
import { roomFacts } from '../src/entities/railway/garage-state.ts';
import type { World as EWorld } from '../src/ecs/index.ts';
import { readFileSync } from 'node:fs';

type Adapter = ReturnType<typeof createRailwayAdapter>;
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });

// ---------------------------------------------------------------- a room and its clients (as M10 b's review)
type Client = { cid: string; pid: string; adapter: Adapter; mirror: ReturnType<typeof createRailwayMirror> } & {
  live: boolean;
  disconnect(): void;
  reconnect(): void;
};
function room(seed?: Seed) {
  const sync = createSync();
  sync.setSelfId('server');
  const replication = createReplicator();
  const api = installRailway(sync, installRules(sync, homeLand()), replication);
  if (seed) {
    while (sync.world.tick < seed.t) sync.stepWorld(100);
    api.world().load(JSON.parse(JSON.stringify(seed.w.snapshot())));
  }
  api.touchAll();
  const clients = new Map<string, Client>();
  const delays = new Map<string, number>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  let step = 0;
  const clock = { now: 1000 };
  const up: { at: number; cid: string; m: unknown }[] = [];
  const down: { at: number; cid: string; m: unknown }[] = [];
  const requests = createRailwayRequests({
    api,
    pidOf: (sid) => clients.get(sid)?.pid ?? null,
    send: (m) => down.push({ at: step + (delays.get(m.to) ?? 0), cid: m.to, m }),
    replication,
    available: () => true,
    unavailable: () => 'starting',
    actor: () => ({ reach: () => true, height: () => true, cadence: () => true }),
  });
  function join(cid: string, pid: string, delay = 0) {
    delays.set(cid, delay);
    const hs = new Set<(m: unknown, from: string) => void>();
    handlers.set(cid, hs);
    const connection = new Set<(live: boolean) => void>();
    const mirror = createRailwayMirror();
    const adapter = createRailwayAdapter({
      mirror,
      movement: () => MOVEMENT,
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c: Client = {
      cid,
      pid,
      adapter,
      mirror,
      live: true,
      disconnect() {
        c.live = false;
        for (const q of [up, down]) for (let i = q.length - 1; i >= 0; i--) if (q[i]!.cid === cid) q.splice(i, 1);
        replication.removeClient(cid);
        for (const h of connection) h(false);
      },
      reconnect() {
        c.live = true;
        replication.addClient(cid);
        for (const h of connection) h(true);
      },
    };
    const r: WorldRoom = {
      selfId: cid,
      send(m) {
        if (c.live) up.push({ at: step + delay, cid, m });
      },
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: (h) => (connection.add(h), () => connection.delete(h)),
    };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  /** One server step; `each` runs on every client after its frame's update, as the views' frame would. */
  function run(n = 1, each?: (c: Client) => void) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        if (clients.get(x.cid)?.live) requests.receive(x.m, x.cid);
      }
      sync.stepWorld(1000 / 60 + 1);
      clock.now += 17;
      replication.commit(sync.roomStep());
      replication.flush(sync.roomStep(), (cid, _p, json) =>
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: JSON.parse(json) }),
      );
      for (const cid of clients.keys())
        down.push({ at: step + (delays.get(cid) ?? 0), cid, m: { t: 'w:c', ht: sync.world.tick } });
      for (const x of down.filter((x) => x.at <= step)) {
        down.splice(down.indexOf(x), 1);
        const c = clients.get(x.cid);
        if (c?.live) for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        c.adapter.update(clock.now);
        each?.(c);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.inspect().ready); k++) run();
  };
  return { sync, api, join, run, ready, clients, clock };
}

// ---------------------------------------------------------------- the Works views' reads, as written on the branch
/** Every read the Works group's views make in a frame and in their handlers (`hand` is false: heldId() is the DOM
 * inventory and the same call either side). Each block names its file. The Works views read no tick: no phase, no
 * panel count, no timed job fact, so there is no edge across two reads and no expensive query to run once. */
function newReads(adapter: Adapter) {
  const w = adapter.read.world() as ReadWorld;
  const pid = adapter.read.pid;
  const ready = adapter.read.ready();
  const wk = works(w),
    sh = shed(w),
    mine = account(w, pid);
  const done = line2Completed(w);
  const movement = adapter.read.movement();
  // footing-view.ts: footPiles (kind 3, by entity id)
  const footPiles: number[][] = [];
  w.each([Pile], (id, p) => void (p.kind === 3 && footPiles.push([id, p.x, p.y, p.z])));
  const empty = (a: ReturnType<typeof account>) => !!a && !a.carry && !a.stone && !a.rails && !a.foot;
  const load = [mine?.carry ?? 0, mine?.stone ?? 0, mine?.rails ?? 0];
  // back-down.ts onlyALoadIn (hand false: heldId() is the same call either side)
  const onlyALoad =
    load.reduce((x, y) => x + y, 0) > 0 && !mine?.foot && beam(w).holder !== pid && boiler(w).holder !== pid;
  const backFree = !mine?.carry && !mine?.stone && !mine?.rails && !mine?.foot;
  return {
    pid,
    ready,
    // works-view.ts: drawBill/drawKiln/drawGhosts/effects (kiln), snap/update (seams, poured, breaker), drawRack (rack),
    // rockMotes (the bowl's rocks), targets (the back, the holders, fills)
    kiln: { logs: wk.logs, stone: wk.stone, lit: wk.lit },
    seams: wk.seams,
    poured: wk.poured,
    breaker: wk.breaker,
    rack: wk.rack,
    rocks: WORKS_ROCKS.map((spot) => rock(w, spot.id).left),
    backFree,
    free: backFree && beam(w).holder !== pid && boiler(w).holder !== pid,
    fillsLogs: (mine?.carry ?? 0) > 0,
    fillsStone: (mine?.stone ?? 0) > 0,
    onlyALoad,
    // breaker-view.ts pose/targets: the boiler held by you
    boilerHeldByMe: boiler(w).state === 'held' && boiler(w).holder === pid,
    // footing-view.ts
    accounts: accounts(w).map((a) => [a.pid, a.foot]),
    holds: Object.fromEntries(accounts(w).map((a) => [a.pid, a.foot === 1])),
    otherFree: Object.fromEntries(
      accounts(w).map((a) => [a.pid, empty(account(w, a.pid)) && beam(w).holder !== a.pid]),
    ),
    footPiles,
    foot: mine?.foot ?? 0,
    movement: [movement.footSoloSpeed, movement.footHelpSpeed],
    // crossing-view.ts
    open: ready && line2Trains(w) && done >= LINE2_STATIONS.length,
    pierSet: wk.pierSet,
    pierRack: wk.pierRack,
    crossing: wk.crossing,
    aboard: trains(w).reduce((n, r) => n + r.foot, 0),
    // roundhouse-view.ts
    shed: [sh.stall, sh.fitted, sh.cradle, sh.cradleRails, sh.table, sh.tableRev, sh.ready],
    wagon: trains(w).some((r) => r.wagon),
    facts: roomFacts(w),
    rails: mine?.rails ?? 0,
    // home-station-view.ts, trophy-plinth.ts
    legLaid: done >= 1,
    plinthOn: ready && rail(w).jump,
  };
}
/** The same facts from the inspection the views read before the branch (main's code). */
function oldReads(s: RailwayInspection) {
  const empty = (a: (typeof s.accounts)[number] | undefined) =>
    !!a && !a.carry && !(a.stone ?? 0) && !(a.rails ?? 0) && !(a.foot ?? 0);
  const load = [s.availableCarry, s.availableStone, s.availableRails];
  const wagonCoupled = s.trains.some((r) => r.wagon);
  const backFree = !s.carry && !s.stoneCarry && !s.railsCarry && !s.foot;
  const onlyALoad = load.some((n) => n > 0) && !s.foot && s.beam?.holder !== s.pid && s.line2.boiler.holder !== s.pid;
  return {
    pid: s.pid,
    ready: s.ready,
    kiln: { logs: s.works.kiln.logs, stone: s.works.kiln.stone, lit: s.works.kiln.lit },
    seams: s.works.seams,
    poured: s.works.poured,
    breaker: s.works.breaker,
    rack: s.works.rack,
    rocks: s.works.rocks.map((r) => r.remaining),
    backFree,
    free: backFree && s.beam?.holder !== s.pid && s.line2.boiler.holder !== s.pid,
    fillsLogs: s.carry > 0,
    fillsStone: s.stoneCarry > 0,
    onlyALoad,
    boilerHeldByMe: s.line2.boiler.state === 'held' && s.line2.boiler.holder === s.pid,
    accounts: s.accounts.map((a) => [a.pid, a.foot ?? 0]),
    holds: Object.fromEntries(s.accounts.map((a) => [a.pid, (a.foot ?? 0) === 1])),
    otherFree: Object.fromEntries(s.accounts.map((a) => [a.pid, empty(a) && s.beam?.holder !== a.pid])),
    footPiles: s.piles.filter((p) => p.kind === 3).map((p) => [p.id, p.x, p.y ?? 0, p.z]),
    foot: s.foot,
    movement: [s.footSoloSpeed, s.footHelpSpeed],
    open: s.ready && s.line2.trains && s.line2.completed >= LINE2_STATIONS.length,
    pierSet: s.works.pierSet,
    pierRack: s.works.pierRack,
    crossing: s.works.crossing,
    aboard: s.trains.reduce((n, r) => n + r.foot, 0),
    shed: [s.shed.stall, s.shed.fitted, s.shed.cradle, s.shed.cradleRails, s.shed.table, s.shed.tableRev, s.shed.ready],
    wagon: wagonCoupled,
    facts: { boilerFitted: s.line2.trains, wagonCoupled, tableBusy: s.shed.ready >= 0 && !wagonCoupled },
    rails: s.railsCarry,
    legLaid: s.line2.completed >= 1,
    plinthOn: s.ready && s.jump,
  };
}
/** What changed at least once over a run (coverage: an equal pair that never moved proves little). */
const moved = new Set<string>();
const last = new Map<string, string>();
function note(c: Client, reads: ReturnType<typeof newReads>) {
  const flat: Record<string, unknown> = {
    kiln: reads.kiln,
    seams: reads.seams,
    poured: reads.poured,
    breaker: reads.breaker,
    rack: reads.rack,
    rocks: reads.rocks,
    free: reads.free,
    onlyALoad: reads.onlyALoad,
    accounts: reads.accounts,
    footPiles: reads.footPiles.length,
    foot: reads.foot,
    open: reads.open,
    pierSet: reads.pierSet,
    pierRack: reads.pierRack,
    crossing: reads.crossing,
    aboard: reads.aboard,
    shed: reads.shed,
    wagon: reads.wagon,
    legLaid: reads.legLaid,
    ready: reads.ready,
  };
  for (const [k, v] of Object.entries(flat)) {
    const key = `${c.cid}:${k}`,
      s = JSON.stringify(v);
    if (last.has(key) && last.get(key) !== s) moved.add(k);
    last.set(key, s);
  }
}
/** The reads must not throw, and must equal the inspection they replaced. */
function agree(c: Client, where: string) {
  let fresh: ReturnType<typeof newReads>;
  assert.doesNotThrow(() => (fresh = newReads(c.adapter)), where);
  assert.deepEqual(fresh!, oldReads(c.adapter.inspect()), where);
  note(c, fresh!);
}
const isClient = (c: Client) => {
  const w = c.adapter.read.world() as unknown as EWorld;
  assert.throws(() => railJobs(w)[0]!.run, /needs the tick/, 'a client world (the run getter throws without at)');
};

// ---------------------------------------------------------------- (1) scripted runs at the seeds that hold the Works
/** Each press the Works views (and their neighbours) can send, so every Works fact and the back load move. */
function press(c: Client, rand: () => number) {
  const s = c.adapter.inspect();
  const x = Math.floor(rand() * 20);
  switch (x) {
    case 0:
      return c.adapter.takeBreaker();
    case 1:
    case 2:
      return c.adapter.strike(x - 1);
    case 3:
    case 4:
      return c.adapter.fillKiln();
    case 5:
    case 6:
      return c.adapter.shoulderFooting(rand() < 0.5 ? 0 : 1);
    case 7:
    case 8:
    case 9:
      return c.adapter.setFooting(Math.floor(rand() * 3) as 0 | 1 | 2);
    case 10:
      return c.adapter.fitCradle();
    case 11:
      return c.adapter.turnTable(rand() < 0.5 ? 0 : 1, s.shed.tableRev);
    case 12:
      return c.adapter.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
    case 13:
      return c.adapter.mine(Math.floor(rand() * 3));
    case 14:
      return c.adapter.drop(
        T1.x + Math.floor(rand() * 600),
        3000,
        T1.z + Math.floor(rand() * 600),
        1,
        Math.floor(rand() * 4) as 0 | 1 | 2 | 3,
      );
    case 15: {
      const p = s.piles[0];
      return p ? c.adapter.take(p.id) : false;
    }
    case 16:
      return c.adapter.takeBoiler(s.line2.boiler.revision);
    case 17:
      return c.adapter.claimJump();
    case 18:
      return c.adapter.beamTake(s.beam.revision);
    default:
      return c.adapter.rackTake(0);
  }
}
const STAGES: readonly (SeedStage | 'fresh')[] = [
  'fresh',
  'q6-done',
  'works-arrive',
  'works-open',
  'works-stocked',
  'works-lit',
  'stall-done',
  'cradle-fitted',
  'wagon-on',
  'crossing-finishing',
  'crossing-done',
];
for (const stage of STAGES)
  test(
    `Works reads at ${stage}: two players, every press and every frame equal to inspect()`,
    { timeout: 240000 },
    () => {
      const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 2);
      // Before ready: the fresh world, then arriving (the account missing for a while).
      agree(a, `${stage}: before any state`);
      for (let k = 0; k < 60 && !a.adapter.inspect().ready; k++) r.run(1, (c) => agree(c, `${stage}: arriving`));
      r.ready();
      isClient(a);
      const rand = mulberry32(stage.length * 7919 + 17);
      let predicted = 0;
      for (let k = 0; k < 200; k++) {
        for (const c of [a, b]) {
          if (press(c, rand)) predicted++;
          agree(c, `${stage}: step ${k} ${c.pid}, the press frame`);
        }
        r.run(1, (c) => agree(c, `${stage}: step ${k} ${c.pid}, frame`));
        // A restore halfway: a's connection drops and comes back (the frozen view, then the refill).
        if (k === 100) {
          a.disconnect();
          r.run(4, (c) => agree(c, `${stage}: disconnected`));
          a.reconnect();
          r.run(20, (c) => agree(c, `${stage}: refill`));
        }
      }
      assert.ok(predicted > 0, `${stage}: some presses were taken`);
    },
  );

test('coverage: the fields that moved over the scripted runs', () => {
  // Reports which reads were exercised through a change, not only held equal.
  const expect = [
    'kiln',
    'seams',
    'poured',
    'rack',
    'free',
    'onlyALoad',
    'foot',
    'accounts',
    'pierSet',
    'pierRack',
    'shed',
    'ready',
  ];
  const missing = expect.filter((k) => !moved.has(k));
  console.log(`moved: ${[...moved].sort().join(', ')}; never moved: ${missing.join(', ') || 'none'}`);
  assert.deepEqual(missing, [], 'the Works facts and the back load changed at least once in some run');
});

// ---------------------------------------------------------------- (2) a late joiner and the second player's pid
test('a late joiner reads its own account and the room-wide Works, every frame from its join', () => {
  const r = room(buildSeedWorld('works-lit'));
  const a = r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  for (let k = 0; k < 80; k++) r.run(1, (c) => agree(c, `late joiner ${c.pid} frame ${k}`));
  assert.equal(newReads(b.adapter).pid, 'b');
  assert.ok(newReads(b.adapter).kiln.lit >= 0, 'the room-wide kiln is lit for the late joiner');
  void a;
});

// ---------------------------------------------------------------- (3) a predicted press shows on the press
test('a predicted press shows in the same reads before the server answers', () => {
  const r = room(buildSeedWorld('works-open'));
  const a = r.join('a', 'a', 12);
  r.ready();
  const before = newReads(a.adapter);
  assert.equal(before.backFree, true);
  let pressed = false;
  for (const source of RAILWAY_SOURCES) if ((pressed = a.adapter.chop(source[0], 0, false))) break;
  assert.ok(pressed, 'a chop was taken');
  const after = newReads(a.adapter);
  assert.equal(a.adapter.inspect().pending, 1, 'the server has not answered');
  assert.equal(after.backFree, false, 'the logs are on the back on the press, ahead of the answer');
  assert.equal(after.onlyALoad, true);
  assert.deepEqual(after, oldReads(a.adapter.inspect()));
});

// ---------------------------------------------------------------- (3b) a footing worn, then put down as a pile
test('a footing shouldered and set down as a pile reads the same in the accounts and the pile list', () => {
  const r = room(buildSeedWorld('wagon-on'));
  const a = r.join('a', 'a', 6);
  const b = r.join('b', 'b', 2);
  r.ready();
  r.run(10);
  const racked = [0, 1].find((rack) => a.adapter.shoulderFooting(rack as 0 | 1));
  assert.notEqual(racked, undefined, 'a footing was on a rack');
  agree(a, 'the footing on the press');
  r.run(30, (c) => agree(c, 'the footing worn'));
  assert.equal(newReads(a.adapter).foot, 1);
  assert.equal(newReads(b.adapter).accounts.find((x) => x[0] === 'a')![1], 1, 'the other player sees it worn');
  assert.equal(a.adapter.drop(T1.x + 100, 3000, T1.z + 100, 1, 3), true);
  agree(a, 'the pile on the press');
  assert.equal(newReads(a.adapter).footPiles.length, 1, 'the pile shows on the press');
  r.run(30, (c) => agree(c, 'the pile down'));
  assert.equal(newReads(b.adapter).footPiles.length, 1, 'the second player sees it');
});

// ---------------------------------------------------------------- (4) the group reads nothing from inspect()
test("none of the group's views calls the adapter's inspect()", () => {
  const files = [
    'works-view',
    'works-live',
    'works-box-view',
    'breaker-view',
    'footing-view',
    'crossing-view',
    'crossing-show',
    'roundhouse-view',
    'home-station-view',
    'trophy-plinth',
    'garage-state',
  ];
  for (const f of files) {
    const text = readFileSync(new URL(`../src/entities/railway/${f}.ts`, import.meta.url), 'utf8');
    assert.equal([...text.matchAll(/adapter\.inspect\(/g)].length, 0, `${f}.ts reads adapter.inspect()`);
  }
});

// ---------------------------------------------------------------- (5) cost: the branch's per-frame reads vs inspect()
test('cost of the Works reads per frame (a guide, not a gate)', () => {
  const r = room(buildSeedWorld('crossing-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(10);
  const N = 2000;
  let t0 = performance.now();
  for (let i = 0; i < N; i++) newReads(a.adapter);
  const branch = ((performance.now() - t0) / N) * 1000;
  t0 = performance.now();
  for (let i = 0; i < N; i++) oldReads(a.adapter.inspect());
  const main = ((performance.now() - t0) / N) * 1000;
  console.log(`per frame: branch reads ${branch.toFixed(1)} us, main's inspect reads ${main.toFixed(1)} us`);
});
