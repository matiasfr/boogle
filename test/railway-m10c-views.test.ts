// Proof of M10 c (branch ecs/m10c-line2): line 2's views read rows and queries through the read facade
// (`adapter.read`) and no longer call `adapter.inspect()`. These tests run the very reads the views make (line2-view,
// shelf-view, cart-view, boiler-view, forge-finish, sea-gate-view and glide-device-view, with forge-offer's
// waitsForTrainOn; each block below names its file) against a client's worlds, the mirror and the predicted clone, and
// compare them value for value with the `inspect()` fields they replaced, frame by frame, over scripted runs at every
// seed the earlier groups used and at q6-done, deck-laid and ring-joined, with two players, a disconnect and refill
// and a late joiner. The views need three.js and the DOM, so their reads are reproduced here as written; a change to a
// view's read is a change to its function below. Modelled on test/railway-m10d-review.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createRailwayAdapter,
  railMovement,
  railTrainsOf as inspectedTrainsOf,
  type RailwayInspection,
} from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { LINE2 } from '../src/sim/railway-lines.ts';
import { LINE2_STATIONS, line2Routes } from '../src/sim/railway-line2-layout.ts';
import { CART_PHASE, cartAlong } from '../src/sim/railway-cart.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import {
  account,
  accounts,
  beam,
  boiler,
  cart,
  forge,
  job as line1Job,
  qjob,
  rail,
  shed,
  type ReadWorld,
} from '../src/sim/railway-rows.ts';
import { aboard, line2Jobs, railJobs } from '../src/sim/railway-queries.ts';
import {
  line2Active,
  line2CartStatus,
  line2Completed,
  line2GateOpen,
  line2KitOwed,
  line2SeaOpen,
  line2Served,
  line2Trains,
} from '../src/sim/railway-queries-line2.ts';
import { freeCarryIgnoringBig, railPhase } from '../src/sim/railway-queries-line1.ts';
import { forgeRailsOffered, waitsForTrain, waitsForTrainOn } from '../src/entities/railway/forge-offer.ts';
import type { World as EWorld } from '../src/ecs/index.ts';

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

// ---------------------------------------------------------------- line 2's reads, as written on the branch
const TICK_FOR_ALONG = 1234.5;
/** Every read line 2's views make in a frame and in their handlers. Each block names its file. `hand` is false:
 * heldId() is the DOM inventory and the same call either side. */
function newReads(adapter: Adapter) {
  const rd = adapter.read;
  const w = rd.world() as ReadWorld;
  const pid = rd.pid,
    tick = rd.tick(),
    ready = rd.ready();
  const fg = forge(w),
    stock = rail(w),
    c = cart(w),
    b = boiler(w),
    bm = beam(w),
    sh = shed(w),
    mine = account(w, pid);
  const active = line2Active(w),
    completed = line2Completed(w);
  const jobs = line2Jobs(w, tick);
  const moves = rd.movement();
  const owed = waitsForTrainOn(w, active);
  // line2-view.ts kitComing
  const kitComing = (() => {
    if (!line2Trains(w) || active < 0 || LINE2_STATIONS[active]!.feed !== 'train' || qjob(w, active).start >= 0)
      return false;
    const k = line2KitOwed(w);
    return k.logs + k.rails + aboard(w, 'logs') + aboard(w, 'rails') > 0;
  })();
  const carry = mine?.carry ?? 0,
    stone = mine?.stone ?? 0,
    rails = mine?.rails ?? 0;
  const holds = (who: string) => b.state === 'held' && b.holder === who;
  // boiler-view.ts backFree
  const backFree = (who: string) => {
    const a = account(w, who);
    return !!a && !a.carry && !a.stone && !a.rails && !a.foot && !(bm.state === 'held' && bm.holder === who);
  };
  return {
    pid,
    tick,
    ready,
    // line2-view.ts: the forge (pieces, mouth, rack, pours), the stretches and the depot
    forge: { used: fg.used, lit: fg.lit, rack: fg.rack, poured: fg.poured },
    stock: {
      sea: stock.sea,
      lever: stock.lever,
      hook: stock.hook,
      depot: stock.depot,
      depotRails: stock.depotRails,
      trains: line2Trains(w),
    },
    active,
    completed,
    gateOpen: line2GateOpen(w),
    seaOpen: line2SeaOpen(w),
    routes: line2Routes(completed),
    jobs: jobs.map(({ job, run }) => ({
      start: job.start,
      completion: job.completion,
      stock: job.stock,
      railStock: job.railStock,
      delivered: job.delivered,
      railDelivered: job.railDelivered,
      elapsed: run.elapsed,
      timing: [
        job.depositMs,
        job.feedIntervalMs,
        job.logFlightMs,
        job.stoneFlightMs,
        job.beamFlightMs,
        job.cruiseCmPerTick,
        job.departureTicks,
      ],
    })),
    pathOpen: line1Job(w, 2).completion === 1,
    phase: railPhase(w, tick, tick),
    owed,
    kitComing,
    forgeRails: forgeRailsOffered(active, line2Trains(w), sh.cradleRails, rails),
    cradleRails: sh.cradleRails,
    carry,
    rails,
    freeCarry: freeCarryIgnoringBig(w, pid),
    accounts: accounts(w).map((a) => [a.pid, a.carry, a.rails]),
    // cart-view.ts
    cart: {
      on: ready && completed >= 1 && !(line2Trains(w) && c.phase === CART_PHASE.REST),
      phase: c.phase,
      logs: c.logs,
      rails: c.rails,
      along: cartAlong(c, TICK_FOR_ALONG),
      status: line2CartStatus(w),
      served: line2Served(w),
    },
    // shelf-view.ts
    shelf: { active, depotRails: stock.depotRails, owed, railsCarry: rails },
    // boiler-view.ts
    boiler: { ...b },
    boilerMine: holds(pid),
    holdsOther: accounts(w).map((a) => holds(a.pid)),
    backFree: accounts(w).map((a) => backFree(a.pid)),
    beam: [bm.state, bm.holder],
    pending: rd.pending(),
    placeHasLoad: holds(pid) || (bm.state === 'held' && bm.holder === pid) || carry + rails + stone > 0,
    onlyALoad: carry + stone + rails > 0 && !mine?.foot && bm.holder !== pid && b.holder !== pid,
    speeds: [moves.boilerHelpSpeed, moves.boilerSoloSpeed],
    // forge-finish.ts
    lit: fg.lit >= 0,
    // glide-device-view.ts and sea-gate-view.ts take these two
    glideCompleted: completed,
    sea: stock.sea,
  };
}
/** The same facts from the inspection the views read before the branch (main's code). */
function oldReads(s: RailwayInspection) {
  const l = s.line2;
  const holds = (who: string) => l.boiler.state === 'held' && l.boiler.holder === who;
  const backFree = (who: string) => {
    const a = s.accounts.find((row) => row.pid === who);
    return (
      !!a &&
      !a.carry &&
      !(a.stone ?? 0) &&
      !(a.rails ?? 0) &&
      !(a.foot ?? 0) &&
      !(s.beam?.state === 'held' && s.beam.holder === who)
    );
  };
  const kitComing =
    l.trains &&
    l.active >= 0 &&
    LINE2_STATIONS[l.active]!.feed === 'train' &&
    l.stations[l.active]!.start < 0 &&
    l.kitOwed.logs + l.kitOwed.rails + inspectedTrainsOf(s, LINE2).reduce((n, { row }) => n + row.logs + row.rails, 0) >
      0;
  return {
    pid: s.pid,
    tick: s.tick,
    ready: s.ready,
    forge: { used: l.forge.used, lit: l.forge.lit, rack: l.forge.rack, poured: l.forge.poured },
    stock: { sea: l.sea, lever: l.lever, hook: l.hook, depot: l.depot, depotRails: l.depotRails, trains: l.trains },
    active: l.active,
    completed: l.completed,
    gateOpen: l.gateOpen,
    seaOpen: l.seaOpen,
    routes: l.routes,
    jobs: l.stations.map((j) => ({
      start: j.start,
      completion: j.completion,
      stock: j.stock,
      railStock: j.railStock,
      delivered: j.delivered,
      railDelivered: j.railDelivered,
      elapsed: j.elapsed,
      timing: [
        j.timing.depositMs,
        j.timing.feedIntervalMs,
        j.timing.logFlightMs,
        j.timing.stoneFlightMs,
        j.timing.beamFlightMs,
        j.timing.cruiseCmPerTick,
        j.timing.departureTicks,
      ],
    })),
    pathOpen: s.stations[2]?.completion === 1,
    phase: s.phase,
    owed: waitsForTrain(l),
    kitComing,
    forgeRails: forgeRailsOffered(l.active, l.trains, s.shed.cradleRails, s.railsCarry),
    cradleRails: s.shed.cradleRails,
    carry: s.availableCarry,
    rails: s.availableRails,
    freeCarry: s.freeCarry,
    accounts: s.accounts.map((a) => [a.pid, a.carry, a.rails ?? 0]),
    cart: {
      on: s.ready && l.completed >= 1 && !(l.trains && l.cart.phase === CART_PHASE.REST),
      phase: l.cart.phase,
      logs: l.cart.logs,
      rails: l.cart.rails,
      along: cartAlong(l.cart, TICK_FOR_ALONG),
      status: l.cartStatus,
      served: l.served,
    },
    shelf: { active: l.active, depotRails: l.depotRails, owed: waitsForTrain(l), railsCarry: s.railsCarry },
    boiler: { ...l.boiler },
    boilerMine: holds(s.pid),
    holdsOther: s.accounts.map((a) => holds(a.pid)),
    backFree: s.accounts.map((a) => backFree(a.pid)),
    beam: [s.beam.state, s.beam.holder],
    pending: s.pending,
    placeHasLoad:
      (l.boiler.state === 'held' && l.boiler.holder === s.pid) ||
      (s.beam?.state === 'held' && s.beam.holder === s.pid) ||
      s.carry + s.railsCarry + s.stoneCarry > 0,
    onlyALoad:
      [s.availableCarry, s.availableStone, s.availableRails].some((n) => n > 0) &&
      !s.foot &&
      s.beam?.holder !== s.pid &&
      l.boiler.holder !== s.pid,
    speeds: [s.boilerHelpSpeed, s.boilerSoloSpeed],
    lit: (l.forge.lit ?? -1) >= 0,
    glideCompleted: l.completed,
    sea: l.sea,
  };
}
/** What changed at least once over the runs (coverage: an equal pair that never moved proves little). */
const moved = new Set<string>();
const last = new Map<string, string>();
function note(c: Client, reads: ReturnType<typeof newReads>) {
  const flat: Record<string, unknown> = {
    forge: reads.forge,
    stock: reads.stock,
    active: reads.active,
    completed: reads.completed,
    jobElapsed: reads.jobs.map((j) => j.elapsed),
    jobStock: reads.jobs.map((j) => [j.stock, j.railStock]),
    jobStart: reads.jobs.map((j) => j.start),
    phase: reads.phase,
    cartPhase: reads.cart.phase,
    cartLoad: [reads.cart.logs, reads.cart.rails],
    cartStatus: reads.cart.status,
    boiler: reads.boiler.state,
    boilerHolder: reads.boiler.holder,
    carry: reads.carry,
    rails: reads.rails,
    freeCarry: reads.freeCarry,
    kitComing: reads.kitComing,
    owed: reads.owed,
    pending: reads.pending,
    ready: reads.ready,
    sea: reads.sea,
    lit: reads.lit,
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

// ---------------------------------------------------------------- (1) scripted runs at the seeds
/** Each press line 2's views (and their neighbours) can send, so every fact and the back load move. */
function press(c: Client, rand: () => number) {
  const s = c.adapter.inspect();
  const x = Math.floor(rand() * 24);
  const spec = LINE2_STATIONS[Math.floor(rand() * LINE2_STATIONS.length)]!;
  switch (x) {
    case 0:
      return c.adapter.forgeTake();
    case 1:
      return c.adapter.depotTake();
    case 2:
      return c.adapter.depotRailTake();
    case 3:
    case 4:
      return c.adapter.depositLine2('F', 1, 0);
    case 5:
    case 6:
      return c.adapter.depositLine2(spec.id, 1, 0);
    case 7:
    case 8:
      return c.adapter.depositLine2(spec.id, 1, 2);
    case 9:
      return c.adapter.pullLever();
    case 10:
      return c.adapter.pullSeaSwitch();
    case 11:
      return c.adapter.claimHook();
    case 12:
      return c.adapter.claimGlide();
    case 13:
    case 14:
      return c.adapter.takeBoiler(s.line2.boiler.revision);
    case 15:
      return c.adapter.fitBoiler(s.line2.boiler.revision);
    case 16:
      return c.adapter.dropBoiler(T1.x + 100, 3000, T1.z + 100, s.line2.boiler.revision);
    case 17:
    case 18:
      return c.adapter.chop(RAILWAY_SOURCES[Math.floor(rand() * RAILWAY_SOURCES.length)]![0], 0, false);
    case 19:
      return c.adapter.mine(Math.floor(rand() * 3));
    case 20:
      return c.adapter.drop(
        T1.x + Math.floor(rand() * 600),
        3000,
        T1.z + Math.floor(rand() * 600),
        1,
        Math.floor(rand() * 3) as 0 | 1 | 2,
      );
    case 21: {
      const p = s.piles[0];
      return p ? c.adapter.take(p.id) : false;
    }
    case 22:
      return c.adapter.beamTake(s.beam.revision);
    default:
      return c.adapter.rackTake(0);
  }
}
const STAGES: readonly (SeedStage | 'fresh')[] = [
  'fresh',
  'awake',
  'q1-done',
  'q2-arriving',
  'q3-stocked',
  'q3-done',
  'q4-arriving',
  'q4-done',
  'q5-carry',
  'q5-finishing',
  'glide-earned',
  'boiler',
  'boiler-camp',
  'trains-on',
  'q6-finishing',
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
  'deck-laid',
  'ring-joined',
];
const FRAMES = 300;
for (const stage of STAGES)
  test(
    `line 2 reads at ${stage}: two players, every press and every frame equal to inspect()`,
    { timeout: 300000 },
    () => {
      const r = room(stage === 'fresh' ? undefined : buildSeedWorld(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 2);
      agree(a, `${stage}: before any state`);
      for (let k = 0; k < 60 && !a.adapter.inspect().ready; k++) r.run(1, (c) => agree(c, `${stage}: arriving`));
      r.ready();
      isClient(a);
      const rand = mulberry32(stage.length * 7919 + 31);
      let predicted = 0;
      for (let k = 0; k < FRAMES; k++) {
        for (const c of [a, b]) {
          if (press(c, rand)) predicted++;
          agree(c, `${stage}: step ${k} ${c.pid}, the press frame`);
        }
        r.run(1, (c) => agree(c, `${stage}: step ${k} ${c.pid}, frame`));
        // A disconnect halfway: a's connection drops and comes back (the frozen view, then the refill).
        if (k === 150) {
          a.disconnect();
          r.run(4, (c) => agree(c, `${stage}: disconnected`));
          a.reconnect();
          r.run(20, (c) => agree(c, `${stage}: refill`));
        }
      }
      assert.ok(predicted >= 0);
    },
  );

test('coverage: the fields that moved over the scripted runs', () => {
  const expect = [
    'forge',
    'stock',
    'active',
    'completed',
    'jobElapsed',
    'jobStock',
    'jobStart',
    'phase',
    'cartPhase',
    'cartLoad',
    'cartStatus',
    'boiler',
    'carry',
    'rails',
    'freeCarry',
    'owed',
    'pending',
    'ready',
  ];
  const missing = expect.filter((k) => !moved.has(k));
  console.log(`moved: ${[...moved].sort().join(', ')}; never moved: ${missing.join(', ') || 'none'}`);
  assert.deepEqual(missing, [], 'line 2 facts and the back load changed at least once in some run');
});

// ---------------------------------------------------------------- (2) a late joiner and the second player's pid
test('a late joiner reads its own account and the room-wide line 2, every frame from its join', () => {
  const r = room(buildSeedWorld('q6-done'));
  const a = r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const b = r.join('b', 'b', 6);
  for (let k = 0; k < 80; k++) r.run(1, (c) => agree(c, `late joiner ${c.pid} frame ${k}`));
  assert.equal(newReads(b.adapter).pid, 'b');
  assert.ok(newReads(b.adapter).completed >= 6, 'the room-wide line 2 is laid for the late joiner');
  void a;
});

// ---------------------------------------------------------------- (3) a predicted press shows on the press
test('a predicted press shows in the same reads before the server answers', () => {
  const r = room(buildSeedWorld('q3-stocked'));
  const a = r.join('a', 'a', 12);
  r.ready();
  const before = newReads(a.adapter);
  assert.equal(before.carry, 0);
  let pressed = false;
  for (const source of RAILWAY_SOURCES) if ((pressed = a.adapter.chop(source[0], 0, false))) break;
  assert.ok(pressed, 'a chop was taken');
  const after = newReads(a.adapter);
  assert.equal(a.adapter.inspect().pending, 1, 'the server has not answered');
  assert.equal(after.pending, 1);
  assert.ok(after.carry > 0, 'the logs are on the back on the press, ahead of the answer');
  assert.deepEqual(after, oldReads(a.adapter.inspect()));
});

// ---------------------------------------------------------------- (4) the group reads nothing from inspect()
test("none of the group's views calls the adapter's inspect()", () => {
  const files = [
    'line2-view',
    'shelf-view',
    'cart-view',
    'boiler-view',
    'forge-call',
    'forge-finish',
    'forge-offer',
    'far-head-view',
    'pier-view',
    'sea-gate-view',
    'glide-device-view',
    // R4a and R4b's, already on the facade
    'ring-deck',
    'line2-path',
    'q7-site',
    'railhead-view',
  ];
  for (const f of files) {
    const text = readFileSync(new URL(`../src/entities/railway/${f}.ts`, import.meta.url), 'utf8');
    assert.equal([...text.matchAll(/adapter\.inspect\(/g)].length, 0, `${f}.ts reads adapter.inspect()`);
    assert.equal([...text.matchAll(/RailwayInspection|\['inspect'\]/g)].length, 0, `${f}.ts names the inspection type`);
  }
});

// ---------------------------------------------------------------- (5) cost: the branch's per-frame reads vs inspect()
test('cost of line 2 reads per frame (a guide, not a gate)', () => {
  const r = room(buildSeedWorld('q6-finishing'));
  const a = r.join('a', 'a', 0);
  r.ready();
  r.run(10);
  const N = 1000;
  let t0 = performance.now();
  for (let i = 0; i < N; i++) newReads(a.adapter);
  const branch = ((performance.now() - t0) / N) * 1000;
  t0 = performance.now();
  for (let i = 0; i < N; i++) oldReads(a.adapter.inspect());
  const main = ((performance.now() - t0) / N) * 1000;
  console.log(`per frame: branch reads ${branch.toFixed(1)} us, main's inspect reads ${main.toFixed(1)} us`);
});
