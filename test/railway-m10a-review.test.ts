// Independent review of M10 a (branch ecs/m10a-trains-halts): the four per-train queries added to
// src/sim/railway-queries-trains.ts (railServing, railTrainAsked, railTrainHeld, railOpenEnd) against their adapter twins,
// at the edges a random stream at the frame clock rarely lands on: every whole and half tick around the wake's end and a
// stand's dwell, a train at a signal and at each stop, a turned train at the Pier stub, line 2's three trains, the
// railhead's open end moving bent by bent, asks left standing at a stop that closes, and fuzzed rows. Then, in a room,
// the same queries swept over a window of ticks at each frame (not only the frame's tickNow), and the views' shared stops
// indexed as the views index them. Modelled on test/railway-m10e-review.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRailwayAdapter,
  railMovement,
  railServing as oldServing,
  railStopsNow,
  railTrainAsked as oldAsked,
  railTrainHeld as oldHeld,
  railOpenEnd as oldOpenEnd,
  type RailTrainsRead,
} from '../src/adapters/railway.ts';
import { specOf } from '../src/sim/tune.ts';
import { SERVER_ID } from '../src/net/ids.ts';
import { createSync, type WorldRoom } from '../src/world/sync.ts';
import { installRules } from '../src/world/rules/index.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { createRailwayRequests } from '../server/src/host/railway-requests.ts';
import { RAILWAY_T1 as T1 } from '../src/sim/railway-layout.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { homeLand } from './helpers/land.ts';
import { buildSeedWorld, type Seed, type SeedStage } from './helpers/rail.ts';
import { aperture, lines, rail, trains, type ReadWorld } from '../src/sim/railway-rows.ts';
import { apertureId, qjob, railId, trainId } from '../src/sim/railway-queries.ts';
import { line2Completed, line2Trains } from '../src/sim/railway-queries-line2.ts';
import {
  railOpenEnd,
  railServing,
  railTrainAsked,
  railTrainHeld,
  trainStops,
} from '../src/sim/railway-queries-trains.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { LINE_HALTS, TRAIN, TRAIN_PHASE } from '../src/sim/railway-train.ts';
import { LINE_SLOTS } from '../src/sim/railway-trains.ts';
import { RAILWAY_WINDOW } from '../src/sim/railway.ts';
import { Aperture, Line, QJob, Rail, Train } from '../src/sim/railway-components.ts';
import type { World } from '../src/ecs/index.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';

type Adapter = ReturnType<typeof createRailwayAdapter>;
const MOVEMENT = railMovement({ get: (k) => specOf(k)!.def });
const DIRS = [-1, 1] as const;

// ---------------------------------------------------------------- the adapter's inspection of a world, as buildState
/** What the adapter's per-train functions read of an inspection, built from a world as buildState builds it
 * (src/adapters/railway.ts: trains, lines, line2.trains = line2Trains, line2.trainsAt = Rail.trains, line2.completed,
 * ring = the Aperture row). The room test below checks this mapping against a client's real inspect(). */
function inspectOf(w: World): RailTrainsRead {
  const rw = w as unknown as ReadWorld;
  return {
    trains: trains(rw).map((r) => ({ ...r })),
    lines: lines(rw).map((r) => ({ ...r })),
    line2: { trains: line2Trains(w), trainsAt: rail(rw).trains, completed: line2Completed(w) },
    ring: { set: aperture(rw).set, joined: aperture(rw).joined },
  };
}

/** Every value of the four queries at `tick`, the new (world) and the old (inspection) side by side. `viewStops` is
 * how train-view.ts update() shares a frame's stops: `[trainStops(w, 0), trainStops(w, LINE2)]`, indexed by the
 * train's line. */
function both(w: World, s: RailTrainsRead, tick: number) {
  const viewStops = [trainStops(w, 0), trainStops(w, LINE2)];
  const stopsNew = RAIL_LINES.map((_l, k) => trainStops(w, k));
  const stopsOld = RAIL_LINES.map((_l, k) => railStopsNow(s, k));
  const fresh = {
    stops: stopsNew.map((x) => [...x]),
    held: RAIL_TRAINS.map((_t, k) => railTrainHeld(w, k, tick)),
    askedView: RAIL_TRAINS.map((t, k) => railTrainAsked(w, k, tick, viewStops[t.line])),
    askedAlone: RAIL_TRAINS.map((_t, k) => railTrainAsked(w, k, tick)),
    serving: RAIL_LINES.map((_l, k) =>
      stopsNew[k]!.flatMap((_x, stop) => DIRS.map((dir) => railServing(w, k, stop, dir, tick, stopsNew[k]))),
    ),
    servingAlone: RAIL_LINES.map((_l, k) =>
      stopsNew[k]!.flatMap((_x, stop) => DIRS.map((dir) => railServing(w, k, stop, dir, tick))),
    ),
    // Every halt of the catalog, open or not (a closed stop index past the open ones is never an open end).
    openEnd: RAIL_LINES.map((_l, k) =>
      LINE_HALTS.filter((h) => h.line === k).map((h) => railOpenEnd(w, k, h.stop, stopsNew[k])),
    ),
    openEndAlone: RAIL_LINES.map((_l, k) =>
      LINE_HALTS.filter((h) => h.line === k).map((h) => railOpenEnd(w, k, h.stop)),
    ),
  };
  const old = {
    stops: stopsOld.map((x) => [...x]),
    held: RAIL_TRAINS.map((_t, k) => oldHeld(s, k, tick)),
    askedView: RAIL_TRAINS.map((_t, k) => oldAsked(s, k, tick)),
    askedAlone: RAIL_TRAINS.map((_t, k) => oldAsked(s, k, tick)),
    serving: RAIL_LINES.map((_l, k) =>
      stopsOld[k]!.flatMap((_x, stop) => DIRS.map((dir) => oldServing(s, k, stop, dir, tick))),
    ),
    servingAlone: RAIL_LINES.map((_l, k) =>
      stopsOld[k]!.flatMap((_x, stop) => DIRS.map((dir) => oldServing(s, k, stop, dir, tick))),
    ),
    openEnd: RAIL_LINES.map((_l, k) => LINE_HALTS.filter((h) => h.line === k).map((h) => oldOpenEnd(s, k, h.stop))),
    openEndAlone: RAIL_LINES.map((_l, k) =>
      LINE_HALTS.filter((h) => h.line === k).map((h) => oldOpenEnd(s, k, h.stop)),
    ),
  };
  return { fresh, old };
}
let compared = 0;
const lit = { held: 0, asked: 0, serving: 0 };
function agreeAt(w: World, tick: number, where: string, s = inspectOf(w)) {
  const { fresh, old } = both(w, s, tick);
  assert.deepEqual(fresh, old, `${where} @ tick ${tick}`);
  compared++;
  for (const k of RAIL_TRAINS.keys()) {
    if (fresh.held[k]) lit.held++;
    if (fresh.askedView[k]) lit.asked++;
  }
  for (const xs of fresh.serving) for (const x of xs) if (x >= 0) lit.serving++;
  return fresh;
}
/** The ticks around every edge the held lamp and the queries' floor() have: the wake's end, each train's dwell end
 * (+10), each whole tick near `t0`, and their halves. */
function edgeTicks(w: World, t0: number) {
  const rw = w as unknown as ReadWorld;
  const out = new Set<number>();
  const around = (x: number) => {
    for (const d of [-1, -0.5, -0.01, 0, 0.01, 0.5, 1]) if (x + d >= 0) out.add(x + d);
  };
  const at = rail(rw).trains;
  if (at >= 0) around(at + TRAIN.wakeTicks);
  for (const r of trains(rw)) {
    around(r.depart + TRAIN.dwellTicks + 10);
    around(r.depart + TRAIN.dwellTicks);
    around(r.depart);
    if (r.arrived >= 0) around(r.arrived);
  }
  for (let d = -3; d <= 3; d++) around(Math.floor(t0) + d);
  return [...out].sort((a, b) => a - b);
}

// ---------------------------------------------------------------- (1) synthetic edges on a seed world
const mutTrain = (w: World, slot: number) => w.mut(Train, trainId(w, slot))!;
const STOP_STAGES: readonly SeedStage[] = ['trains-on', 'q6-done', 'crossing-done', 'deck-laid', 'ring-joined'];

test('line 2 has three trains, and the views index the shared stops by a train line that has them', () => {
  assert.equal(LINE_SLOTS[LINE2]!.length, 3, 'line 2 runs three trains');
  assert.equal(RAIL_LINES.length, 2, "halts-view's refreshStops covers lines [0, 1] only");
  assert.equal(LINE2, 1, "train-view's stops = [trainStops(w, 0), trainStops(w, LINE2)] is indexed by tr.line");
  for (const t of RAIL_TRAINS) assert.ok(t.line === 0 || t.line === LINE2);
});

for (const stage of STOP_STAGES)
  test(
    `${stage}: each train standing at each stop and at a signal, across the wake's end and the dwell's end`,
    { timeout: 120000 },
    () => {
      const w = buildSeedWorld(stage).w as World;
      const s0 = inspectOf(w);
      assert.ok(s0.line2.trains, `${stage}: trains run`);
      const t0 = rail(w as unknown as ReadWorld).trains + TRAIN.wakeTicks + 200;
      for (const slot of RAIL_TRAINS.keys()) {
        const l = RAIL_TRAINS[slot]!.line;
        const n = trainStops(w, l).length;
        for (let at = -1; at < n; at++)
          for (const track of [0, 1]) {
            Object.assign(mutTrain(w, slot), {
              phase: TRAIN_PHASE.STAND,
              at,
              to: Math.max(0, at),
              track,
              depart: t0,
              req: 0,
            });
            for (const t of edgeTicks(w, t0)) agreeAt(w, t, `${stage}: train ${slot} stands at ${at} track ${track}`);
            // Held lamp exactly at the boundary (dwell + 10): on, half a tick before off, for a halt.
            if (at >= 0) {
              assert.equal(railTrainHeld(w, slot, t0 + TRAIN.dwellTicks + 10), true);
              assert.equal(railTrainHeld(w, slot, t0 + TRAIN.dwellTicks + 9.5), false);
            } else assert.equal(railTrainHeld(w, slot, t0), true, 'a signal stand is held at once');
          }
      }
    },
  );

test("the wake: no lamp before the trains' wake ends, exactly at its end and half a tick before", () => {
  const w = buildSeedWorld('trains-on').w as World;
  const at = rail(w as unknown as ReadWorld).trains;
  // Every train standing at a signal (held as soon as the wake is over).
  for (const slot of RAIL_TRAINS.keys()) Object.assign(mutTrain(w, slot), { phase: TRAIN_PHASE.STAND, at: -1 });
  for (const t of edgeTicks(w, at + TRAIN.wakeTicks)) agreeAt(w, t, 'the wake');
  assert.deepEqual(
    RAIL_TRAINS.map((_t, k) => railTrainHeld(w, k, at + TRAIN.wakeTicks - 0.5)),
    RAIL_TRAINS.map(() => false),
  );
  assert.deepEqual(
    RAIL_TRAINS.map((_t, k) => railTrainHeld(w, k, at + TRAIN.wakeTicks)),
    RAIL_TRAINS.map(() => true),
  );
  // Asleep (Rail.trains -1): nothing held, nothing asked.
  w.mut(Rail, railId(w))!.trains = -1;
  for (const t of edgeTicks(w, at + TRAIN.wakeTicks)) agreeAt(w, t, 'asleep');
});

for (const stage of STOP_STAGES)
  test(
    `${stage}: every ask left standing at every stop and way, the trains running, then the stops closing`,
    { timeout: 120000 },
    () => {
      const w = buildSeedWorld(stage).w as World;
      const rw = w as unknown as ReadWorld;
      const t0 = rail(rw).trains + TRAIN.wakeTicks + 50;
      const rand = mulberry32(stage.length * 31 + 7);
      // Run every train with a departure in the window (RUN from its stop), then sweep forward through its leg.
      for (let it = 0; it < 12; it++) {
        for (const slot of RAIL_TRAINS.keys()) {
          const l = RAIL_TRAINS[slot]!.line,
            n = trainStops(w, l).length,
            from = Math.floor(rand() * n),
            to = Math.floor(rand() * n);
          Object.assign(mutTrain(w, slot), {
            phase: rand() < 0.25 ? TRAIN_PHASE.STAND : TRAIN_PHASE.RUN,
            at: rand() < 0.2 ? -1 : from,
            to,
            track: rand() < 0.5 ? 0 : 1,
            depart: t0 - Math.floor(rand() * 400),
            // Every stop's ask both ways (the req digits), or some.
            req: rand() < 0.5 ? (1 << (2 * n)) - 1 : Math.floor(rand() * (1 << (2 * n))),
          });
        }
        for (let t = t0 - 5; t < t0 + 600; t += 3.5) agreeAt(w, t, `${stage}: asks iteration ${it}`);
        for (const t of edgeTicks(w, t0)) agreeAt(w, t, `${stage}: asks iteration ${it} edges`);
      }
      // The stops close under the asks: Q6 (the Pier) and every later stretch back to undone, the ring shut.
      for (let q = LINE2_STATIONS.length - 1; q >= 5; q--) {
        w.mut(QJob, qjob(w, q))!.completion = false as never;
        for (let t = t0; t < t0 + 300; t += 7) agreeAt(w, t, `${stage}: Q${q + 1} undone`);
      }
      const ap = w.mut(Aperture, apertureId(w))!;
      ap.joined = -1;
      ap.set = 0;
      for (let t = t0; t < t0 + 300; t += 7) agreeAt(w, t, `${stage}: ring shut`);
    },
  );

// The line's own lever asks (Line.req) are written through the world in the fuzz below; the loop above leaves them.
test(
  'fuzzed rows, lever asks and ring: every query equals its adapter twin over 4000 worlds',
  { timeout: 120000 },
  () => {
    const rand = mulberry32(90210);
    const bases = STOP_STAGES.map((st) => buildSeedWorld(st).w as World);
    for (let it = 0; it < 4000; it++) {
      const w = bases[it % bases.length]!;
      const rw = w as unknown as ReadWorld;
      const t0 = rail(rw).trains + Math.floor(rand() * 2000);
      // The ring's head moving out bent by bent, the rivet struck or not (line 2's open end past the Pier).
      if (rand() < 0.5) {
        const ap = w.mut(Aperture, apertureId(w))!;
        ap.set = Math.floor(rand() * 15);
        ap.joined = rand() < 0.5 ? -1 : t0 - 100;
      }
      for (const k of RAIL_LINES.keys()) {
        const n = trainStops(w, k).length;
        const row = w.mut(Line, w.lookup(Line, k)!)!;
        row.req = Math.floor(rand() * (1 << (2 * n)));
      }
      for (const slot of RAIL_TRAINS.keys()) {
        const l = RAIL_TRAINS[slot]!.line,
          n = trainStops(w, l).length;
        Object.assign(mutTrain(w, slot), {
          phase: rand() < 0.4 ? TRAIN_PHASE.STAND : TRAIN_PHASE.RUN,
          at: Math.floor(rand() * (n + 1)) - 1,
          to: Math.floor(rand() * n),
          track: rand() < 0.5 ? 0 : 1,
          depart: t0 - Math.floor(rand() * 500),
          req: Math.floor(rand() * (1 << (2 * n))),
          turn: rand() < 0.3,
        });
      }
      const ticks = [t0, t0 + 0.5, t0 + Math.floor(rand() * 300), ...edgeTicks(w, t0).filter(() => rand() < 0.3)];
      for (const t of ticks) agreeAt(w, t, `fuzz ${it}`);
    }
    assert.ok(compared > 10000);
  },
);

test('the Pier stub: a turned line 2 train at the Pier, on each track, across its dwell', () => {
  const w = buildSeedWorld('q6-done').w as World;
  const stops = trainStops(w, LINE2);
  const pier = stops.length - 1;
  assert.ok(railOpenEnd(w, LINE2, pier), 'the Pier is the open end at q6-done');
  const t0 = rail(w as unknown as ReadWorld).trains + TRAIN.wakeTicks + 500;
  for (const slot of LINE_SLOTS[LINE2]!)
    for (const track of [0, 1])
      for (const phase of [TRAIN_PHASE.STAND, TRAIN_PHASE.RUN]) {
        Object.assign(mutTrain(w, slot), { phase, at: pier, to: pier - 1, track, depart: t0, turn: true, req: 0 });
        for (const t of edgeTicks(w, t0)) agreeAt(w, t, `pier train ${slot} track ${track} phase ${phase}`);
      }
});

test('the open end moving: line 2 from Q6 to the ring joined, bent by bent', () => {
  const w = buildSeedWorld('ring-joined').w as World;
  const ap = w.mut(Aperture, apertureId(w))!;
  const joined = ap.joined;
  const ends = new Set<string>();
  for (const j of [-1, joined])
    for (let set = 0; set <= 14; set++) {
      ap.set = set;
      ap.joined = j;
      const fresh = agreeAt(w, rail(w as unknown as ReadWorld).trains + 1000, `ring set ${set} joined ${j}`);
      ends.add(JSON.stringify(fresh.openEnd[LINE2]));
    }
  assert.ok(ends.size > 1, 'the open end moved with the railhead');
});

// ---------------------------------------------------------------- (2) a room: a window of ticks at every frame
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
  const clients = new Map<string, { cid: string; pid: string; adapter: Adapter; live: boolean }>();
  const handlers = new Map<string, Set<(m: unknown, from: string) => void>>();
  const delays = new Map<string, number>();
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
    const adapter = createRailwayAdapter({
      mirror: createRailwayMirror(),
      movement: () => MOVEMENT,
      pid,
      pose: () => ({ x: T1.x / 100, y: 30, z: T1.z / 100 }),
      now: () => clock.now,
    });
    const c = { cid, pid, adapter, live: true };
    const r: WorldRoom = {
      selfId: cid,
      send(m) {
        if (c.live) up.push({ at: step + delay, cid, m });
      },
      onMessage: (h) => (hs.add(h), () => hs.delete(h)),
      onConnection: () => () => {},
    };
    clients.set(cid, c);
    replication.addClient(cid);
    adapter.attach(r);
    return c;
  }
  function run(n: number, each?: (c: { adapter: Adapter; pid: string }) => void) {
    for (let k = 0; k < n; k++) {
      step++;
      for (const x of up.filter((x) => x.at <= step)) {
        up.splice(up.indexOf(x), 1);
        requests.receive(x.m, x.cid);
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
        for (const h of handlers.get(x.cid)!) h(x.m, SERVER_ID);
      }
      for (const c of clients.values()) {
        c.adapter.update(clock.now);
        each?.(c);
      }
    }
  }
  const ready = () => {
    for (let k = 0; k < 300 && ![...clients.values()].every((c) => c.adapter.inspect().ready); k++) run(1);
  };
  return { join, run, ready };
}

for (const stage of ['trains-on', 'q6-done', 'ring-joined'] as const)
  test(
    `${stage} in a room: the inspection matches inspectOf, and the queries agree over a window of ticks each frame`,
    { timeout: 120000 },
    () => {
      const r = room(buildSeedWorld(stage));
      const a = r.join('a', 'a', 3);
      r.ready();
      const rand = mulberry32(stage.length * 97);
      let held = 0,
        asked = 0;
      for (let k = 0; k < 400; k++) {
        // Lever asks at every halt both ways, often (a stream that keeps asks standing).
        if (k % 3 === 0) a.adapter.callTrain(Math.floor(rand() * LINE_HALTS.length), rand() < 0.5 ? -1 : 1);
        r.run(1, (c) => {
          const s = c.adapter.inspect();
          const w = c.adapter.read.world() as unknown as World;
          // The fixture mapping is the adapter's.
          const mine = inspectOf(w);
          assert.deepEqual(
            {
              trains: mine.trains,
              // The inspection's line rows carry no slot (the per-train reads use only req).
              lines: mine.lines.map((x) => ({ req: x.req, left0: x.left0, left1: x.left1 })),
              line2: mine.line2,
              ring: mine.ring,
            },
            {
              trains: s.trains.map((x) => ({ ...x })),
              lines: s.lines.map((x) => ({ ...x })),
              line2: { trains: s.line2.trains, trainsAt: s.line2.trainsAt, completed: s.line2.completed },
              ring: { set: s.ring.set, joined: s.ring.joined },
            },
            `${stage} frame ${k}: inspectOf(world) equals inspect()`,
          );
          const now = c.adapter.tickNow();
          for (const t of [now, ...edgeTicks(w, now)]) {
            const f = agreeAt(w, t, `${stage} frame ${k}`, s as unknown as RailTrainsRead);
            held += f.held.filter(Boolean).length;
            asked += f.askedView.filter(Boolean).length;
          }
        });
      }
      // Which lamps a stage lights depends on its seed (trains-on's trains stand held, q6-done's run asked).
      assert.ok(held + asked > 0, `${stage}: some lamp on (held ${held}, asked ${asked})`);
    },
  );

test('coverage: the sweeps saw held lamps, asked lamps and served asks', () => {
  console.log(`compared ${compared}; held ${lit.held}, asked ${lit.asked}, serving ${lit.serving}`);
  assert.ok(lit.held > 0 && lit.asked > 0 && lit.serving > 0);
});

// ---------------------------------------------------------------- (3) pre-existing, not this branch: the hide condition
// train-view.ts step() hides every car (y -60) while `!read.ready()` (main: `!inspect().ready`, the same value).
// ready() is false not only before the whole state is in but also while RAILWAY_WINDOW actions are pending, so a
// player with a full window (a burst of presses on a slow link) sees every train vanish until an answer comes back.
// This test expects the trains to stay shown on a whole, connected state with a full window: it fails on main and on
// the branch alike. Owner's call whether that is intended.
// Skipped, not deleted: P2, logged in orchestrator-state for the owner (11 November). Unskip with the fix.
test(
  'pre-existing: a full pending window hides every train (train-view.ts step: hidden = !read.ready())',
  { skip: 'P2 on main before M10 a; owner call' },
  () => {
    const r = room(buildSeedWorld('trains-on'));
    const a = r.join('a', 'a', 30);
    r.ready();
    let pressed = 0;
    for (let k = 0; k < 40 && a.adapter.read.pending() < RAILWAY_WINDOW; k++)
      if (a.adapter.callTrain(k % LINE_HALTS.length, k % 2 ? 1 : -1)) pressed++;
    assert.equal(a.adapter.read.pending(), RAILWAY_WINDOW, `the window filled (${pressed} presses)`);
    const s = a.adapter.inspect();
    assert.ok(s.connected && s.synced && line2Trains(a.adapter.read.world() as unknown as World), 'whole and running');
    // train-view.ts:385: const hidden = !ready || ...
    const hidden = !a.adapter.read.ready();
    assert.equal(hidden, false, 'the trains stay shown while the whole state is in and the link is up');
  },
);
