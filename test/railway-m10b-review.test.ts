// Review of M10 b (branch ecs/m10b-line1-views): line 1's five views read rows and queries through the read facade
// (`adapter.read.world()`, `read.tick()`). These tests run the very reads the five views make (view.ts, sources.ts,
// reward.ts, line-cargo.ts, crates-view.ts; each expression below names its line) against a client's worlds, the
// mirror and the predicted clone, at the stages the plan names, and compare them with the `inspect()` fields they
// replaced, step by step over a random action stream. The views themselves need three.js and the DOM, so their reads
// are reproduced here as written; a change to a view's read is a change to its function below.
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
import { LINE1_HARDWOODS, LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { RAIL_ROCKS } from '../src/sim/railway-works-layout.ts';
import { Pile } from '../src/sim/railway-components.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import {
  account as accountRow,
  accounts as accountRows,
  beam as beamRow,
  buildSeedWorld,
  hardwood as hardwoodRow,
  job as jobRow,
  logs,
  advance,
  pile as pileRow,
  qjob as qjobRow,
  rail as railRow,
  rock as rockRow,
  rocks as rockRows,
  act,
  apply,
  createRailway,
  railSession,
  tree as treeRow,
  type Seed,
  type SeedStage,
} from './helpers/rail.ts';
import { activeStation, carryMax, railJobs, timingOf } from '../src/sim/railway-queries.ts';
import { railPanelCount, railPanelStock, railPhase } from '../src/sim/railway-queries-line1.ts';
import { railCounts } from '../src/sim/railway-queries-line2.ts';
import type { World as EWorld } from '../src/ecs/index.ts';

type Adapter = ReturnType<typeof createRailwayAdapter>;
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });

// ---------------------------------------------------------------- a room and its clients (test/railway-adapter.test.ts)
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

// ---------------------------------------------------------------- the five views' reads, as written on the branch
/** The crates (crates-view.ts:26-32): every stretch with a crate, the first two (reward.ts's) left out. */
const BOXES = [
  ...LINE1_STATIONS.map((s, station) => ({ line: 0, station, crate: s.crate })),
  ...LINE2_STATIONS.map((s, station) => ({ line: 1, station, crate: s.crate })),
]
  .filter((s) => s.crate)
  .slice(2);

/** Every read the five views make in a frame and in their handlers, at the facade's world and tick. */
function newReads(adapter: Adapter) {
  const w = adapter.read.world();
  const tick = adapter.read.tick();
  const pid = adapter.read.pid;
  // view.ts:180-188 (phaseNow, activeNow, jobAt, panelState, opened)
  const phase = railPhase(w, tick, tick);
  const active = activeStation(w);
  const jobs = railJobs(w, tick).map(({ job, run }) => ({
    start: job.start,
    completion: job.completion,
    stock: job.stock,
    stoneStock: job.stoneStock,
    delivered: job.delivered,
    elapsed: run.elapsed,
    lastTick: run.lastTick,
    allocation: run.allocation,
    used: run.used,
    stoneAllocation: run.stoneAllocation,
    stoneUsed: run.stoneUsed,
    cruise: job.cruiseCmPerTick,
    timing: timingOf(job),
  }));
  const mine = accountRow(w, pid);
  const beam = beamRow(w);
  const r = railRow(w);
  const piles: { id: number; x: number; y: number; z: number; n: number; kind: number; age: number }[] = [];
  // sources.ts:342-347 (listPiles)
  w.each([Pile], (id, p) => piles.push({ id, x: p.x, y: p.y, z: p.z, n: p.n, kind: p.kind, age: p.age }));
  return {
    tick,
    phase,
    active,
    jobs,
    panelStock: railPanelStock(w, tick), // view.ts:186
    panelCount: railPanelCount(w, tick), // view.ts:187
    opened: jobRow(w, 2).completion === 1, // view.ts:189
    awake: r.awake, // view.ts:344, sources.ts:324
    score: railCounts(w, tick).score, // view.ts:557
    delivered: railJobs(w, tick).reduce((n, { job }) => n + job.delivered, 0), // view.ts:558
    beam: { state: beam.state, holder: beam.holder, revision: beam.revision, work: beam.work },
    carry: mine?.carry ?? 0, // view.ts:509, sources.ts:640
    stone: mine?.stone ?? 0,
    rails: mine?.rails ?? 0,
    foot: mine?.foot ?? 0, // sources.ts:694
    capacity: carryMax(w), // sources.ts:666
    axe: r.axe,
    rack: r.rack,
    stoneRack: r.stoneRack,
    pack: r.pack,
    // sources.ts:436-446, 563-589, 744-752
    trees: RAILWAY_SOURCES.map((_s, k) => {
      const t = treeRow(w, k);
      return { work: t.work, left: t.left, big: t.big, yaw: t.yaw, fell: t.fell };
    }),
    hardwood: LINE1_HARDWOODS.map((_s, h) => {
      const t = hardwoodRow(w, h);
      return { work: t.work, left: t.left };
    }),
    piles,
    pilesById: piles.map((p) => pileRow(w, p.id)?.n ?? -1), // sources.ts:500
    rocks: RAIL_ROCKS.map((rk) => rockRow(w, rk.id).left), // line-cargo.ts:121
    accounts: accountRows(w).map((a) => [a.pid, a.carry, a.stone, a.rails]), // line-cargo.ts:143
    reward: [jobRow(w, 0).completion, jobRow(w, 1).completion], // reward.ts:183
    crates: BOXES.map((b) => (b.line === 0 ? jobRow(w, b.station) : qjobRow(w, b.station)).completion), // crates-view.ts:103
    greatDress: activeStation(w) === 2 && beam.state === 'standing', // sources.ts:760
  };
}
/** The same facts from the inspection the views read before the branch (main's view.ts, sources.ts, ...). */
function oldReads(s: RailwayInspection) {
  const piles = s.piles.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    z: p.z,
    n: p.n,
    kind: p.kind ?? 0,
    age: p.age,
  }));
  return {
    tick: s.tick,
    phase: s.phase,
    active: s.activeStation,
    jobs: s.stations.map((j) => ({
      start: j.start,
      completion: j.completion,
      stock: j.stock,
      stoneStock: j.stoneStock,
      delivered: j.delivered,
      elapsed: j.elapsed,
      lastTick: j.lastTick,
      allocation: j.allocation,
      used: j.used,
      stoneAllocation: j.stoneAllocation,
      stoneUsed: j.stoneUsed,
      cruise: j.timing.cruiseCmPerTick,
      timing: { ...j.timing },
    })),
    panelStock: s.panelStock,
    panelCount: s.panelCount,
    opened: s.stations[2]?.completion === 1,
    awake: s.awake,
    score: s.counts.score,
    delivered: s.stations.reduce((n, j) => n + j.delivered, 0),
    beam: { state: s.beam.state, holder: s.beam.holder, revision: s.beam.revision, work: s.beam.work },
    carry: s.availableCarry,
    stone: s.stoneCarry,
    rails: s.railsCarry,
    foot: s.foot,
    capacity: s.carryMax,
    axe: s.axe,
    rack: s.rack,
    stoneRack: s.stoneRack,
    pack: s.line2.pack,
    trees: RAILWAY_SOURCES.map((_s, k) => ({
      work: s.work[k]!,
      left: s.sources[k]!,
      big: s.upgrades[k]!,
      yaw: s.falls.yaw[k] ?? 0,
      fell: s.falls.collapsed[k] ?? false,
    })),
    hardwood: LINE1_HARDWOODS.map((_s, h) => ({ work: s.hardwoodWork[h] ?? 0, left: s.hardwood[h] ?? 15 })),
    piles,
    pilesById: piles.map((p) => p.n),
    rocks: RAIL_ROCKS.map(
      (rk) => (s.rocks.find((r) => r.id === rk.id) ?? s.works.rocks.find((r) => r.id === rk.id))?.remaining ?? 0,
    ),
    accounts: s.accounts.map((a) => [a.pid, a.carry, a.stone ?? 0, a.rails ?? 0]),
    reward: [0, 1].map((i) => s.stations[i]?.completion ?? (i === 0 ? s.completion : 0)),
    crates: BOXES.map((b) =>
      b.line === 0 ? (s.stations[b.station]?.completion ?? 0) : (s.line2.stations[b.station]?.completion ?? 0),
    ),
    greatDress: s.activeStation === 2 && s.beam.state === 'standing',
  };
}
/** The reads must not throw, and must equal the inspection they replaced. */
function agree(c: Client, where: string) {
  let fresh: ReturnType<typeof newReads>;
  assert.doesNotThrow(() => (fresh = newReads(c.adapter)), where);
  assert.deepEqual(fresh!, oldReads(c.adapter.inspect()), where);
}
const isClient = (c: Client) => {
  const w = c.adapter.read.world() as unknown as EWorld;
  assert.throws(() => railJobs(w)[0]!.run, /needs the tick/, 'a client world (the run getter throws without at)');
};

// ---------------------------------------------------------------- (1) no read throws on a client's world
function seedAt(stage: SeedStage | 'mid-lay'): Seed {
  if (stage !== 'mid-lay') return buildSeedWorld(stage);
  // T1 funded and laying: 24 logs in, then partway through its schedule.
  const s = buildSeedWorld('awake');
  logs(s, 'a', 'T1', 24);
  advance(s, 60);
  return s;
}
for (const stage of ['awake', 'mid-lay', 'q3-stocked', 'q6-done', 'crossing-done'] as const)
  test(
    `the five views' reads on a client's world at ${stage}: mirror and predicted clone, no throw, equal to inspect()`,
    { timeout: 120000 },
    () => {
      const r = room(seedAt(stage));
      const a = r.join('a', 'a', 6);
      const b = r.join('b', 'b', 0);
      r.ready();
      r.run(20);
      agree(a, `${stage}: mirror`);
      agree(b, `${stage}: mirror (b)`);
      isClient(a);
      // A pending action of yours: the facade's world is now the predicted clone.
      const before = a.adapter.inspect();
      const acted =
        a.adapter.drop(T1.x, 3000, T1.z, 1) ||
        a.adapter.chop(
          RAILWAY_SOURCES.find((_s, k) => before.sources[k]! > 0)?.[0] ?? RAILWAY_SOURCES[0]![0],
          0,
          false,
        ) ||
        a.adapter.wake();
      if (acted) {
        assert.ok(a.adapter.inspect().pending > 0, `${stage}: pending`);
        isClient(a);
        agree(a, `${stage}: predicted clone`);
      }
      r.run(1, (c) => agree(c, `${stage}: settling`));
      r.run(30);
      for (const c of [a, b]) agree(c, `${stage}: settled`);
    },
  );

test("the views' reads before the first whole state, while the account is missing, during a resend and after reset()", () => {
  const r = room(seedAt('mid-lay'));
  const a = r.join('a', 'a', 6);
  // Brand new: nothing has arrived yet (the facade's world is the fresh seeded one).
  agree(a, 'before any state');
  // The whole state is in but this pid's session (its account) is not yet: two one-way delays.
  for (let k = 0; k < 40 && !a.adapter.inspect().synced; k++) r.run(1, (c) => agree(c, 'arriving'));
  assert.ok(a.adapter.inspect().synced);
  agree(a, 'synced');
  r.ready();
  r.run(10);
  // A late joiner, with other players' accounts and piles in the room.
  const b = r.join('b', 'b', 6);
  // b's account does not exist until its session arrives: every frame from the join is read.
  let missing = 0;
  for (let k = 0; k < 60 && !b.adapter.inspect().ready; k++)
    r.run(1, (c) => {
      if (c === b && b.adapter.inspect().synced && !accountRow(b.adapter.read.world() as unknown as EWorld, 'b'))
        missing++;
      agree(c, 'late joiner arriving');
    });
  assert.ok(missing > 0, 'a synced world with no account for this pid was read');
  r.ready();
  assert.ok(b.adapter.drop(T1.x + 300, 3000, T1.z, 1) || true);
  r.run(10, (c) => agree(c, 'late joiner'));
  // A lost connection: the whole state comes again while the last one stays shown (the frozen view).
  a.disconnect();
  r.run(5, (c) => agree(c, 'disconnected'));
  a.reconnect();
  r.run(20, (c) => agree(c, 'refill'));
  // reset(): the read model stays linked to its last whole world.
  // (Unreachable today: nothing in src/ calls the railway mirror's reset(). The inspection then lists no accounts or
  // piles while the facade's world keeps its last whole state, so only the no-throw half is asserted.)
  a.mirror.reset();
  r.run(20, (c) => void assert.doesNotThrow(() => newReads(c.adapter), 'after reset'));
});

/** railwayAtQ2's opening (src/sim/railway-seed-route.ts) up to the great tree felled, then b takes the beam. */
function beamHeldByB(): Seed {
  const w = createRailway();
  for (const pid of ['a', 'b']) railSession(w, pid, 1);
  apply(w, 'a', { op: 'rail.wake', epoch: 1, request: 1 }, 0);
  const s = { w, t: 40 };
  logs(s, 'a', 'T1', 24);
  advance(s, 300);
  for (let i = 0; i < 8;) {
    const n = act(s, 'b', 'rail.mine', { id: rockRows(w).findIndex((r) => r.left > 0) });
    act(s, 'b', 'rail.deposit', { station: 'T2', kind: 1, n });
    i += n;
  }
  logs(s, 'a', 'T2', 32);
  advance(s, 300);
  act(s, 'a', 'rail.axe');
  for (let i = 0; i < 12; i++) act(s, 'a', 'rail.beamChop');
  assert.equal(act(s, 'b', 'rail.beamTake', { revision: beamRow(w).revision }), 1);
  assert.equal(beamRow(w).holder, 'b');
  return s;
}
test('the beam held by another player, and all of line 1 complete: the views read them as the inspection did', () => {
  const r = room(beamHeldByB());
  const a = r.join('a', 'a', 4);
  const b = r.join('b', 'b', 2);
  r.ready();
  r.run(10, (c) => agree(c, 'beam held by b'));
  assert.equal(a.adapter.inspect().beam.holder, 'b');
  // a presses beside it (a refused take is "not yet"; a chop is predicted): the reads stay equal.
  a.adapter.beamTake(a.adapter.inspect().beam.revision);
  a.adapter.chop(RAILWAY_SOURCES[3]![0], 0, false);
  r.run(20, (c) => agree(c, 'beam held by b, a acting'));
  void b;
  // Every line-1 job complete (q6-done) is the stage loop's; zero trees fallen is `awake`'s.
});

// ---------------------------------------------------------------- (3) a differential over a random action stream
test('a random action stream: every new read equals the inspect() field it replaced, at every frame', () => {
  const rand = mulberry32(1013);
  const r = room(buildSeedWorld('awake'));
  const a = r.join('a', 'a', 6);
  const b = r.join('b', 'b', 2);
  r.ready();
  const trees = RAILWAY_SOURCES.map((s) => s[0]);
  const stations = LINE1_STATIONS.map((s) => s.id);
  for (let k = 0; k < 900; k++) {
    for (const c of [a, b]) {
      const x = rand();
      if (x < 0.35) c.adapter.chop(trees[Math.floor(rand() * trees.length)]!, 0, false);
      else if (x < 0.45) c.adapter.mine(Math.floor(rand() * 3));
      else if (x < 0.55) c.adapter.deposit(1 + Math.floor(rand() * 3), 0);
      else if (x < 0.6) c.adapter.deposit(1, 1);
      else if (x < 0.67) c.adapter.drop(T1.x + Math.floor(rand() * 600), 3000, T1.z + Math.floor(rand() * 600), 1);
      else if (x < 0.72) {
        const p = c.adapter.inspect().piles[0];
        if (p) c.adapter.take(p.id);
      } else if (x < 0.74) c.adapter.rackTake(0);
      void stations;
      agree(c, `step ${k} ${c.pid} after its action`);
    }
    r.run(1, (c) => agree(c, `step ${k} ${c.pid} frame`));
  }
  assert.ok(a.adapter.inspect().prediction.predicted > 20, 'actions were predicted (pending reads were compared)');
});

// ---------------------------------------------------------------- the tick boundary: read.tick() inside one frame
// main's views read inspect(), whose frame memo holds one estimated tick for the whole frame (adapter "The frame memo":
// the estimated tick ... taken as they were at the head of the frame). read.tick() is live (performance.now()), so a
// frame that straddles a tick boundary reads two ticks: view.ts computes `phase` at :421 and sets
// `previousPhase = phaseNow()` at :519, and the edge at :432 (waking -> idle: machine.wake(true)) is lost when the
// wake ends between the two.
function wokenRoom() {
  const r = room();
  const a = r.join('a', 'a', 0);
  r.ready();
  assert.equal(a.adapter.wake(), true);
  r.run(3);
  return { r, a };
}
/** The clock (ms) at which a room's estimated tick first passes `tick`, found on a twin room driven the same way:
 * the estimate never goes backwards, so probing it moves it, and the room under test is never probed. */
function edgeOf(twin: { r: ReturnType<typeof room>; a: Client }, tick: number) {
  const from = twin.r.clock.now;
  for (let ms = 0; ms < 400; ms += 0.25) {
    twin.r.clock.now = from + ms;
    if (Math.floor(twin.a.mirror.mirror.step(from + ms) / 6) > tick) return from + ms;
  }
  throw new Error('no tick boundary within 400 ms');
}
test('read.tick() holds one value for a whole frame, as the inspection the views read did', () => {
  const { r, a } = wokenRoom();
  const t0 = a.adapter.read.tick();
  assert.equal(t0, a.adapter.inspect().tick);
  // A frame begins (update) 1 ms before a tick boundary; 1.5 ms later, still inside it, the views read again.
  const edge = edgeOf(wokenRoom(), t0);
  r.clock.now = edge - 1;
  a.adapter.update(r.clock.now);
  const head = a.adapter.read.tick();
  const inspectHead = a.adapter.inspect().tick;
  assert.equal(head, inspectHead);
  r.clock.now = edge + 0.5;
  assert.equal(a.adapter.inspect().tick, inspectHead, "inspect() keeps the frame's tick (main)");
  assert.equal(a.adapter.read.tick(), head, "read.tick() keeps the frame's tick too (the views' reads replaced it)");
});
for (const path of ['main (inspect)', 'branch (read)'] as const)
  test(`view.ts's waking -> idle edge (machine.wake(true)) fires when the wake ends inside a frame: ${path}`, () => {
    const { r, a } = wokenRoom();
    const twin = wokenRoom();
    // view.ts's update: phase at :421, the edge at :432, previousPhase at :519; main read both off one inspect().
    // The branch holds the tick it took at the frame's entry (view.ts beginFrame), as main's inspect() did.
    let frameTick = a.adapter.read.tick();
    const phaseNow =
      path === 'branch (read)'
        ? () => railPhase(a.adapter.read.world(), frameTick, frameTick)
        : () => a.adapter.inspect().phase;
    let previousPhase = phaseNow();
    assert.equal(previousPhase, 'waking');
    const awake = railRow(a.adapter.read.world() as unknown as EWorld).awake;
    // Frames until the tick before the wake ends (both rooms alike).
    for (let f = 0; f < 400 && a.adapter.read.tick() + 1 < awake + T1.wakeTicks; f++) {
      r.run(1);
      twin.r.run(1);
    }
    assert.equal(a.adapter.read.tick() + 1, awake + T1.wakeTicks);
    assert.equal(phaseNow(), 'waking');
    // This frame starts 1 ms before the boundary that ends the wake, and its tail (the stations loop, the feed,
    // path.update, view.ts:427-517) runs 2 ms later: any frame whose reads straddle a tick boundary does this.
    let woke = 0;
    r.clock.now = edgeOf(twin, a.adapter.read.tick()) - 1;
    a.adapter.update(r.clock.now);
    frameTick = a.adapter.read.tick();
    const phase = phaseNow();
    if (previousPhase === 'waking' && phase !== 'waking' && phase !== 'asleep') woke++;
    r.clock.now += 2;
    previousPhase = phaseNow();
    for (let g = 0; g < 3; g++) {
      r.run(1);
      frameTick = a.adapter.read.tick();
      const p = phaseNow();
      if (previousPhase === 'waking' && p !== 'waking' && p !== 'asleep') woke++;
      previousPhase = phaseNow();
    }
    assert.equal(phaseNow(), 'idle');
    assert.equal(woke, 1, 'the machine is woken once (main read one phase per frame, so it always was)');
  });
