import { ServiceHealth } from './helpers/railway-service-health.ts';
import { intentOf, railwayActs } from '../src/adapters/railway-intents.ts';
// The install and the longer boiler (docs/plans/ring-island-build2.md, R3): rail.install's refusals (no steel in the
// bay, line 1, another part, a stale revision or a malformed hold, the table mid roll-out), two presses on one tick
// installing once, each line 2 train taking the fit only standing at the Village, the fastest row's braking
// boundary, the train's extent clearing every middle halt and signal, and the mixed fleet: one (or two) of line 2's trains at 25 m/s among trains at 20 for 20,000 ticks under random
// lever and rider asks and restores, holding the block rule (sepCm round the circuit, one train an end block) and every
// invariant. Ordinary service has a two-headway budget plus intermediate dwells. The handover's first circuit and
// the forced mixed fleet keep the safety checks, including draining outstanding calls. FUZZ_TICKS lengthens the fuzz.
//
// What the mixed fleet proves: the real rules run it (railTick on a world), so blockFree, the end blocks, the headway
// hold (by the leaving train's boiler) and the balanced hold all meet a faster train behind and ahead of slower ones.
// In play the fleet is mixed for at most one round trip (each train takes the fit at its next Village stand); here the
// slower trains are put back on the standard boiler each time they stand at the Village and take it, so the mix lasts
// the whole run. That reset is the only hand edit, made only to a standing train (no pose or leg changes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { Line, Shed, Train } from '../src/sim/railway-components.ts';
import {
  LINE2,
  RAIL_HALTS,
  RAIL_LINES,
  RAIL_TRAINS,
  TRAIN_EXTENT,
  circuitAhead,
  circuitLen,
} from '../src/sim/railway-lines.ts';
import {
  BOILER_SPEED,
  TRAIN,
  TRAIN_PHASE,
  lineStages,
  trainAlong,
  trainDir,
  trainLegSpeed,
  trainCanBrake,
  trainNextStop,
  trainRequestable,
  trainPassesBy,
  BOILER,
  kitBills,
} from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  TRAIN_HEAD_PCT,
  cycleTicks,
  endBlocks,
  servingSlots,
  trainPose,
  trainSpacing,
} from '../src/sim/railway-trains.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { apply } from '../src/sim/railway-drive.ts';
import { BRING_TICKS, CRADLE_CAP, INSTALL_STEEL, WORKS, steelPool } from '../src/sim/railway-works-layout.ts';
import { RAIL_GATES, RAIL_LEGS, ROW_LINE } from '../src/sim/railway-route.ts';
import { legDone, legOpen, legRow, routeRow, tradeOpen } from '../src/sim/railway-queries-route.ts';
import { laySection } from '../src/sim/railway-seed-legs.ts';
import { RAILS } from '../src/sim/railway-line2-layout.ts';
import type { World } from '../src/ecs/index.ts';
import { footCap } from '../src/sim/railway-queries-trade.ts';
import { tableFree } from '../src/sim/railway-queries-works.ts';
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { fuzzTicks } from './helpers/fuzz.ts';
import { railRoom } from './helpers/rail-room.ts';
import type { RailwayAccepted, RailwayRefusal } from '../src/adapters/railway-effects.ts';
import {
  LOGS,
  account,
  act,
  advance,
  roomOf,
  stopsOf,
  invariant,
  line as lineRow,
  railTick,
  railwayAtRing,
  railwayAtWorks,
  restore,
  shed,
  train,
  trains,
  unaudited,
  type Seed,
  buildSeedWorld,
  steelHome,
} from './helpers/rail.ts';

const [A, B, C] = LINE_SLOTS[LINE2] as [number, number, number];
const ISLAND = 5;
const copy = (s: Seed): Seed => unaudited({ w: restore(s.w), t: s.t });
const install = (s: Seed, pid = 'a', fields: Record<string, unknown> = {}) =>
  act(s, pid, 'rail.install', { line: LINE2, part: 2, revision: lineRow(s.w, LINE2).rev, ...fields });
/** The garage table's hold after an accepted install (garage step 4): wait it out before the next install. */
const settle = (s: Seed) => advance(s, WORKS.upgradeTicks);

const HOME = steelHome(railwayAtRing('ring-joined'));
const GORGE = steelHome(buildSeedWorld('gorge-reached'));

function landed(source: Seed, count: number) {
  const s = copy(source);
  for (let t = 0; shed(s.w).steel < count; t++) {
    assert.ok(t < 12000, 'steel lands by train');
    advance(s, 1);
  }
  return s;
}
const FULL_HOME = landed(HOME, STEEL.total);
const FULL_GORGE = landed(GORGE, STEEL.total);

test('paid installs spend only the shared pool, refuse short/stale/repeated holds and restore', () => {
  const s = landed(GORGE, INSTALL_STEEL[3]);
  assert.equal(install(s), 1);
  assert.equal(install(s, 'a', { part: 3 }), 0, "the table's hold");
  settle(s);
  assert.equal(install(s, 'a', { part: 3 }), 1);
  settle(s);
  assert.ok(steelPool(shed(s.w)) < INSTALL_STEEL[4]);
  assert.equal(install(s, 'a', { part: 4 }), 0, 'short pool');
  const shortBig = landed(GORGE, INSTALL_STEEL[3]);
  assert.equal(install(shortBig), 1);
  settle(shortBig);
  assert.equal(install(shortBig, 'a', { part: 4 }), 1);
  settle(shortBig);
  assert.ok(steelPool(shed(shortBig.w)) < INSTALL_STEEL[3]);
  assert.equal(install(shortBig, 'a', { part: 3 }), 0, 'short pool at High Gorge');
  const full = copy(FULL_HOME);
  const rev = lineRow(full.w, LINE2).rev;
  const original = trains(full.w).map((r) => ({ ...r }));
  assert.equal(install(full, 'a', { part: 4, revision: rev }), 1);
  assert.deepEqual(trains(full.w), original, 'capacity changes no cargo or running leg');
  assert.equal(shed(full.w).steel, STEEL.total, 'landed does not go backwards');
  assert.equal(shed(full.w).spent, INSTALL_STEEL[4]);
  assert.equal(steelPool(shed(full.w)), STEEL.total - INSTALL_STEEL[4]);
  assert.equal(install(full, 'b', { part: 2, revision: rev }), 0, 'cross-part race is stale');
  assert.equal(install(full, 'b', { part: 4 }), 0, 'new request cannot buy it twice');
  const resumed = copy(full);
  assert.equal(install(full, 'b'), 0, 'the cradle holds the table even on the new revision');
  advance(resumed, WORKS.upgradeTicks - 1);
  assert.equal(install(resumed, 'b'), 0, 'the cradle hold survives a save');
  settle(full);
  assert.equal(install(full), 1, 'free longer boiler still reads landed steel');
  assert.equal(shed(full.w).spent, INSTALL_STEEL[4]);
  const wagon = trains(full.w).find((r) => r.wagon)!;
  assert.equal(footCap(full.w, wagon), CRADLE_CAP[1]);
  assert.equal(
    footCap(
      FULL_HOME.w,
      trains(FULL_HOME.w).find((r) => r.wagon)!,
    ),
    CRADLE_CAP[0],
  );
  assert.equal(
    footCap(
      full.w,
      trains(full.w).find((r) => !r.wagon)!,
    ),
    WORKS.loaderCap,
  );
  assert.equal(lineRow(restore(full.w), LINE2).cradle, 1);
  assert.equal(invariant(full.w), null);
});

test('big boiler needs High Gorge and row 2; fits once, spends six, then adopts only at Home', () => {
  const early = copy(FULL_HOME);
  assert.equal(install(early), 1);
  settle(early);
  assert.equal(install(early, 'a', { part: 3 }), 0, 'not High Gorge');
  const s = copy(FULL_GORGE);
  assert.equal(install(s, 'a', { part: 3 }), 0, 'cannot skip longer boiler');
  assert.equal(install(s), 1);
  settle(s);
  assert.equal(install(s, 'a', { part: 4 }), 1);
  settle(s);
  const rev = lineRow(s.w, LINE2).rev;
  const before = trains(s.w).map((r) => ({ ...r }));
  assert.equal(install(s, 'a', { part: 3, revision: rev }), 1);
  assert.equal(install(s, 'b', { part: 3, revision: rev }), 0);
  assert.equal(install(s, 'a', { part: 3 }), 0);
  assert.deepEqual(trains(s.w), before);
  assert.equal(shed(s.w).spent, INSTALL_STEEL[3] + INSTALL_STEEL[4]);
  const pending = new Set(servingSlots((k) => train(s.w, k), LINE2));
  for (let t = 0; pending.size; t++) {
    assert.ok(t < 10000, 'all serving trains adopt');
    advance(s, 1);
    for (const k of pending) {
      const r = train(s.w, k);
      if (r.boiler !== 3) continue;
      assert.equal(r.from, trainStops(s.w, LINE2)[0]);
      assert.equal(r.v0, 0);
      assert.ok(r.phase === TRAIN_PHASE.STAND || r.depart === s.t);
      pending.delete(k);
    }
  }
  assert.equal(lineRow(restore(s.w), LINE2).boiler, 3);
  assert.equal(invariant(s.w), null);
});

test('the fastest row cruises at its speed, and the late request boundary is its own braking distance', () => {
  const kin = BOILER[BOILER.length - 1]!;
  // v^2 / 2b, in whole centimetres: one centimetre short and the train cannot stop for the halt.
  const edge = Math.ceil((kin.speed * kin.speed) / (2 * kin.brake));
  assert.equal(trainLegSpeed(100000, 200, 0, kin), kin.speed);
  assert.equal(trainCanBrake(0, kin.speed, 1, edge - 1, kin), false);
  assert.equal(trainCanBrake(0, kin.speed, 1, edge, kin), true);
  assert.equal(
    trainNextStop([0, edge - 1, 50000], 0, kin.speed, 1, () => true, kin),
    2,
  );
  assert.equal(
    trainNextStop([0, edge, 50000], 0, kin.speed, 1, () => true, kin),
    1,
  );
  const row = {
    ...train(FULL_GORGE.w, A),
    boiler: BOILER.length - 1,
    phase: TRAIN_PHASE.RUN,
    from: 0,
    dest: 100000,
    depart: 0,
    to: 2,
    track: 0,
    v0: kin.speed,
    req: 0,
  };
  assert.equal(trainRequestable(row, LINE2, [0, edge, 100000], 0)?.stop, 1);
  assert.equal(trainRequestable(row, LINE2, [0, edge - 1, 100000], 0), null);
});

for (const part of [1, 2] as const)
  test(`accepted part ${part} reaches installer and peer through replication exactly once`, () => {
    const seed = part === 1 ? copy(railwayAtWorks('cradle-fitted')) : copy(HOME);
    if (part === 1) act(seed, 'a', 'rail.turn', { to: 1, revision: 0 });
    const room = railRoom(seed);
    const clients = [room.join('installer', 'a', 2), room.join('peer', 'b', 6)];
    const effects: RailwayAccepted[][] = [[], []];
    const refusals: RailwayRefusal[][] = [[], []];
    clients.forEach((c, i) => {
      c.adapter.onAccepted((e) => effects[i]!.push(e));
      c.adapter.onRefused((e) => refusals[i]!.push(e));
    });
    room.ready();
    assert.equal(clients[0]!.adapter.installBoiler(part - 1, part), true);
    room.run(120);
    assert.equal(lineRow(room.serverWorld(), LINE2).boiler, part, 'the server accepted the install');
    clients.forEach((c, i) => {
      assert.equal(lineRow(c.adapter.read.world(), LINE2).boiler, part);
      assert.equal(c.adapter.read.pending(), 0);
      assert.deepEqual(refusals[i], [], 'an accepted install must not report noop');
      const installs = effects[i]!.filter((e) => e.op === 'rail.install');
      assert.equal(installs.length, 1, 'each client receives the shared install once');
      assert.equal(installs[0]!.part, part);
    });
  });

test('an upgrade at the Village waits for wagon rollout and coupling before adopting row 1', () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  while (train(s.w, A).phase !== TRAIN_PHASE.STAND || train(s.w, A).at !== 0) advance(s, 1);
  assert.equal(train(s.w, A).phase, TRAIN_PHASE.STAND);
  assert.equal(train(s.w, A).at, 0);
  assert.equal(train(s.w, A).boiler, 0);
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  assert.equal(shed(s.w).ready, -1, 'the table turn alone cannot send the wagon');
  assert.equal(install(s, 'a', { part: 1 }), 1);
  const ready = shed(s.w).ready;
  assert.equal(ready, s.t + WORKS.upgradeTicks + WORKS.rollTicks);
  while (s.t < ready - 1) {
    advance(s, 1);
    assert.equal(train(s.w, A).boiler, 0, `no platform beat during rollout at tick ${s.t}`);
    assert.equal(train(s.w, A).wagon, false);
    assert.equal(train(s.w, A).phase, TRAIN_PHASE.STAND);
  }
  advance(s, 1);
  assert.equal(train(s.w, A).wagon, true, 'the wagon has coupled');
  assert.equal(train(s.w, A).boiler, 1, 'the Village stand can now adopt the faster row');
  assert.equal(invariant(s.w), null);
});

test('the upgrade commissions both lines; running legs keep their speed until a Village stand', () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  while (train(s.w, 0).phase !== TRAIN_PHASE.RUN) advance(s, 1);
  const before = trains(s.w).map((r) => ({ ...r }));
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  assert.equal(shed(s.w).ready, -1, 'the table turn alone cannot send the wagon');
  assert.equal(install(s, 'a', { part: 1 }), 1);
  for (const l of [0, LINE2]) assert.equal(lineRow(s.w, l).boiler, 1);
  assert.deepEqual(trains(s.w), before, 'the install changes the fit, never a train in flight');
  const pending = new Set(servingSlots((k) => train(s.w, k), 0).concat(servingSlots((k) => train(s.w, k), LINE2)));
  for (let t = 0; pending.size; t++) {
    assert.ok(t < 4000, 'every active train adopts within a round trip');
    const was = trains(s.w).map((r) => ({ ...r }));
    advance(s, 1);
    for (const k of pending) {
      const r = train(s.w, k);
      if (r.boiler === 0) continue;
      assert.equal(r.boiler, 1);
      const home = trainStops(s.w, RAIL_TRAINS[k]!.line)[0];
      assert.ok(r.from === home && r.v0 === 0 && (r.phase === TRAIN_PHASE.STAND || r.depart === s.t));
      if (was[k]!.phase === TRAIN_PHASE.RUN) assert.equal(was[k]!.to, 0, 'an arriving leg finishes at the Village');
      pending.delete(k);
    }
  }
  assert.equal(invariant(s.w), null);
});

test('the free upgrade refuses early, stale, raced and repeated holds, and survives restore', () => {
  const early = copy(railwayAtWorks('stall-done'));
  assert.equal(install(early, 'a', { part: 1 }), 0, 'no fitted cradle');
  const s = copy(railwayAtWorks('cradle-fitted'));
  assert.equal(install(s, 'a', { part: 1 }), 0, 'table still faces the stall');
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: 0 }), 1);
  advance(s, WORKS.rollTicks * 2);
  assert.equal(shed(s.w).ready, -1, 'waiting never installs the upgrade');
  for (const home of [0, LINE2]) assert.equal(lineRow(s.w, home).boiler, 0);
  assert.equal(install(s, 'a', { part: 1, revision: 1 }), 0, 'a revision not yet seen');
  assert.equal(install(s, 'a', { part: 2 }), 0, 'cannot skip row 1');
  const steel = shed(s.w).steel;
  assert.equal(install(s, 'a', { part: 1, revision: 0 }), 1);
  const ready = shed(s.w).ready;
  assert.equal(install(s, 'b', { part: 1, revision: 0 }), 0, 'same-tick race loses');
  assert.equal(install(s, 'a', { part: 1, revision: 1 }), 0, 'already installed');
  assert.equal(shed(s.w).steel, steel, 'free, even with no steel');
  assert.equal(shed(s.w).ready, ready, 'a repeat cannot restart the roll-out');
  const loaded = restore(s.w);
  for (const home of [0, LINE2]) assert.equal(lineRow(loaded, home).boiler, 1);
  assert.equal(shed(loaded).ready, ready);
  assert.equal(invariant(loaded), null);
  const busy = copy(railwayAtWorks('cradle-fitted'));
  act(busy, 'a', 'rail.turn', { to: 1, revision: 0 });
  busy.w.mut(Shed, busy.w.single(Shed))!.ready = busy.t + WORKS.rollTicks;
  const a = account(busy.w, 'a')!;
  assert.equal(
    apply(
      busy.w,
      'a',
      { op: 'rail.install', line: 1, part: 1, revision: 0, epoch: a.epoch, request: a.request + 1 },
      busy.t,
    ).accepted,
    0,
    'table reserved by a roll-out',
  );
});

test("with the train's extent every middle halt stands clear of both end blocks, and every signal of its own", () => {
  for (let line = 0; line < RAIL_LINES.length; line++)
    for (const st of lineStages(line)) {
      const [near, far] = endBlocks(line, st);
      // A held train stands outside its block, at least a train's gap short of the end stop.
      assert.ok(near.signal - TRAIN_EXTENT.behindCm >= near.to && near.signal - st[0]! >= TRAIN.sepCm);
      assert.ok(far.signal + TRAIN_EXTENT.aheadCm <= far.from && st.at(-1)! - far.signal >= TRAIN.sepCm);
      // A train standing at a middle halt (the Pier, Far Head, the Railhead by stage) is in neither block, by 1 m.
      for (const s of st.slice(1, -1)) {
        assert.ok(far.from - (s + TRAIN_EXTENT.aheadCm) >= 100, `line ${line} stop ${s} clear of the far block`);
        assert.ok(s - TRAIN_EXTENT.behindCm - near.to >= 100, `line ${line} stop ${s} clear of the near block`);
      }
    }
});

// ---------------------------------------------------------------- rail.install
test('rail.install: refused with no steel home, for line 1, another part, a stale revision or a malformed hold', () => {
  const joined = copy(railwayAtRing('ring-joined'));
  assert.equal(shed(joined.w).steel, 0);
  assert.equal(install(joined), 0, 'no steel in the bay');
  const s = copy(HOME);
  assert.equal(install(s, 'a', { line: 0 }), 0, 'line 1');
  assert.equal(install(s, 'a', { part: 3 }), 0, 'another part');
  assert.equal(install(s, 'a', { revision: 2 }), 0, 'a revision not yet seen');
  // One validation line serves every part (railway-sys-steel.ts install): its malformed holds are swept here once.
  for (const bad of [-1, 1.5, -0, Number.NaN, '0', '1', null, undefined, 2 ** 60])
    assert.equal(install(s, 'a', { revision: bad }), 0, `revision ${String(bad)}`);
  for (const bad of [2, '1', 1.5, Number.NaN, null, undefined]) assert.equal(install(s, 'a', { line: bad }), 0);
  for (const bad of [0, 5, '2', 2.5, Number.NaN, null]) assert.equal(install(s, 'a', { part: bad }), 0);
  assert.equal(lineRow(s.w, LINE2).boiler, 1);
  // The table mid roll-out (the wagon ready and rolling, not yet coupled): refused. A hand-made state, so applied
  // without the load check.
  const busy = restore(s.w);
  for (const k of LINE_SLOTS[LINE2]!)
    Object.assign(busy.mut(Train, busy.lookup(Train, k)!)!, { wagon: false, foot: 0 });
  busy.mut(Shed, busy.single(Shed))!.ready = s.t + 10;
  const a = account(busy, 'a')!;
  const r = apply(
    busy,
    'a',
    { op: 'rail.install', epoch: a.epoch, request: a.request + 1, line: 1, part: 2, revision: 1 },
    s.t,
  );
  assert.equal(r.accepted, 0, 'the table is busy');
});

test('two presses on one tick install once; the fit spends nothing and records its tick', () => {
  const s = copy(HOME);
  const bay = shed(s.w).steel;
  assert.equal(install(s, 'a', { revision: 1 }), 1);
  assert.equal(install(s, 'b', { revision: 1 }), 0, 'the second press on the same tick carries a stale revision');
  assert.deepEqual(
    { boiler: lineRow(s.w, LINE2).boiler, fitted: lineRow(s.w, LINE2).fitted },
    { boiler: 2, fitted: s.t },
  );
  assert.equal(shed(s.w).steel, bay, 'the stack is shown, not spent');
  assert.equal(install(s, 'b'), 0, 'installed: nothing more to fit');
  assert.equal(lineRow(s.w, 0).boiler, 1, 'line 1 keeps the table fit');
});

test('each line 2 train takes the boiler only standing at the Village, and its pose never jumps', (t) => {
  const s = copy(HOME);
  const from = s.t;
  assert.equal(install(s), 1);
  const took = new Map<number, number>();
  for (let k = 0; took.size < 3; k++) {
    assert.ok(k < 4000, `every train fitted in time (tick ${s.t})`);
    const before = trains(s.w).map((r, slot) => ({ boiler: r.boiler, s: trainAlong(r, RAIL_TRAINS[slot]!.line, s.t) }));
    railTick(s.w, ++s.t);
    trains(s.w).forEach((r, slot) => {
      const was = before[slot]!;
      assert.ok(
        Math.abs(trainAlong(r, RAIL_TRAINS[slot]!.line, s.t) - was.s) <= BOILER_SPEED[r.boiler]! + 1,
        'no jump',
      );
      if (r.boiler === was.boiler) return;
      assert.equal(RAIL_TRAINS[slot]!.line, LINE2);
      // Standing there now, or it left from its stand there this very tick (its leg starts at the Village at rest).
      const village = trainStops(s.w, LINE2)[0]!;
      assert.ok(
        r.from === village && r.v0 === 0 && (r.phase === TRAIN_PHASE.STAND ? r.at === 0 : r.depart === s.t),
        `train ${slot} took it standing at the Village`,
      );
      took.set(slot, s.t - from);
    });
    if (k % 50 === 0) assert.equal(invariant(s.w), null);
  }
  assert.equal(
    train(
      s.w,
      RAIL_TRAINS.findIndex((x) => x.line !== LINE2),
    ).boiler,
    1,
    'line 1 keeps the table fit',
  );
  t.diagnostic(`fitted after install: ${[...took].map(([k, d]) => `train ${k} ${d / 10} s`).join(', ')}`);
});

// ---------------------------------------------------------------- the fleets (the plan's P1)
const MEAN_BOUND = 525;
const FUZZ = fuzzTicks(20000);
const haltId = (stop: number) => RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === stop);
type Fleet = 'standard' | 'handover' | 'longer' | 'mixed';
/** 20,000 ticks of `fleet` from the steel-home world on the real rules, under 5% lever and 3% rider asks a tick and
 * restores. Every tick: no pose jump past its cruise, `trainSpacing` (sepCm, one train an end block); every 50 ticks
 * the load check. `fast` names the trains held on the longer boiler for the mixed fleet: the slower trains are put back
 * on the standard boiler each time they take the fit at the Village, the only hand edit, made only to a standing train
 * (no pose or leg changes). */
function fleetRun(fleet: Fleet, seed: number, headPct: number, fast: readonly number[] = []) {
  let s = copy(HOME);
  if (fleet !== 'standard') assert.equal(install(s), 1);
  if (fleet === 'longer')
    // The trains in service (servingSlots): the fleet's shed rows never stand at the Village to take the fit.
    for (let k = 0; servingSlots((j) => train(s.w, j), LINE2).some((k2) => train(s.w, k2).boiler !== 2); k++) {
      assert.ok(k < 4000, `every train fitted in time (tick ${s.t})`);
      railTick(s.w, ++s.t, headPct);
    }
  // During the first circuit after install the trains fit at successive Village stops.
  // Only calls arriving in this window use mixed-fleet safety rules. Keep tracking them to boarding.
  // docs/decisions-rail.md#d-2026-11-23-greybox-service-health
  const installTick = s.t;
  const handoverEnd = fleet === 'handover' ? installTick + cycleTicks(LINE2, trainStops(s.w, LINE2), 1) : -1;
  const health = new ServiceHealth([LINE2], s.w);
  const rand = mulberry32(seed);
  const slow = fleet === 'mixed' ? LINE_SLOTS[LINE2]!.filter((k) => !fast.includes(k)) : [];
  const asked = new Map<string, number>(),
    worst = new Map<string, number>(),
    waits: number[] = [],
    standSince = new Map<number, number>(),
    villageStands = new Map<number, number>(),
    signalStands = new Map<number, number>();
  let longest = 0,
    restores = 0,
    resets = 0,
    mixedTicks = 0,
    closest = Infinity;
  const served = (key: string, since: number) => {
    worst.set(key, Math.max(worst.get(key) ?? 0, s.t - since));
    waits.push(s.t - since);
  };
  for (let k = 0; k < FUZZ; k++) {
    if (rand() < 0.05) {
      const stop = Math.floor(rand() * 6),
        dir = rand() < 0.5 ? -1 : 1,
        id = haltId(stop);
      if (act(s, 'a', 'rail.call', { id, dir }) && !asked.has(`${stop}/${dir}`)) {
        health.ask(s.w, id, dir, s.t, fleet === 'mixed' || s.t < handoverEnd);
        asked.set(`${stop}/${dir}`, s.t);
      }
    }
    if (rand() < 0.03) {
      const slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 3)]!;
      act(s, 'a', 'rail.call', {
        id: haltId(1 + Math.floor(rand() * 4)),
        dir: trainDir(train(s.w, slot)),
        train: slot,
      });
    }
    const before = trains(s.w).map((r, slot) => trainAlong(r, RAIL_TRAINS[slot]!.line, s.t));
    const was = trains(s.w).map((r) => r.phase);
    railTick(s.w, ++s.t, headPct);
    health.tick(s.w, s.t);
    trains(s.w).forEach((r, slot) => {
      const step = Math.abs(trainAlong(r, RAIL_TRAINS[slot]!.line, s.t) - before[slot]!);
      assert.ok(step <= BOILER_SPEED[r.boiler]! + 1, `train ${slot} jumps ${step} at ${s.t}`);
      if (was[slot] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) {
        if (r.at === 0) villageStands.set(slot, (villageStands.get(slot) ?? 0) + 1);
        if (r.at < 0) signalStands.set(slot, (signalStands.get(slot) ?? 0) + 1);
      }
    });
    // Keep the fleet mixed: a slower train that took the fit (standing at the Village) goes back to the standard
    // boiler; a fast one that has not yet taken it waits for its next Village stand, as in play. It took it this
    // tick, standing at the Village, and may have left on the same tick: its leg starts now from a stand there, so
    // its pose this tick is the same on either boiler (it only left on the faster train's slightly shorter headway).
    for (const k2 of slow) {
      const r = train(s.w, k2);
      if (r.boiler < 2) continue;
      const village = trainStops(s.w, LINE2)[0]!;
      assert.ok(
        r.from === village && r.v0 === 0 && (r.phase === TRAIN_PHASE.STAND ? r.at === 0 : r.depart === s.t),
        'took it standing at the Village this tick',
      );
      s.w.mut(Train, s.w.lookup(Train, k2)!)!.boiler = 1;
      resets++;
    }
    const boilers = LINE_SLOTS[LINE2]!.map((k2) => train(s.w, k2).boiler);
    if (boilers.includes(1) && boilers.includes(2)) mixedTicks++;
    // How close a fast train came to the train ahead of it round the circuit (the block rule's floor is sepCm).
    {
      const st = trainStops(s.w, LINE2),
        c = circuitLen(st),
        at = LINE_SLOTS[LINE2]!.map((k2) => trainPose(train(s.w, k2), LINE2, st, s.t).c);
      LINE_SLOTS[LINE2]!.forEach((k2, i) => {
        if (train(s.w, k2).boiler !== 2) return;
        const gap = Math.min(...at.filter((_p, j) => j !== i).map((p) => circuitAhead(at[i]!, p, c)));
        closest = Math.min(closest, gap);
      });
    }
    assert.equal(
      trainSpacing(
        (slot) => train(s.w, slot),
        (line) => trainStops(s.w, line),
        s.t,
      ),
      null,
      `spacing at ${s.t}`,
    );
    trains(s.w).forEach((r, slot) => {
      if (r.phase !== TRAIN_PHASE.STAND) return void standSince.delete(slot);
      if (!standSince.has(slot)) standSince.set(slot, s.t);
      if (RAIL_TRAINS[slot]!.line === LINE2) longest = Math.max(longest, s.t - standSince.get(slot)!);
    });
    for (const [key, since] of asked) {
      const [stop, dir] = key.split('/').map(Number) as [number, number];
      if (
        LINE_SLOTS[LINE2]!.some((k2) => {
          const r = train(s.w, k2);
          return r.phase === TRAIN_PHASE.STAND && r.at === stop && trainDir(r) === dir;
        })
      ) {
        served(key, since);
        asked.delete(key);
      }
    }
    if (k % 50 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
    if (rand() < 0.002) {
      s = unaudited({ w: restore(s.w), t: s.t });
      restores++;
    }
  }
  for (const [key, since] of asked) served(key, since);
  assert.equal(invariant(s.w), null);
  const name = (stop: number) => RAIL_HALTS[haltId(stop)]!.name;
  const mean = waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length);
  const notes = [
    `start ${installTick}, handover end ${handoverEnd}; mixed ${mixedTicks} of ${FUZZ} ticks; restores ${restores}; slow trains reset ${resets} times`,
    `worst lever wait ${Math.max(0, ...worst.values())} ticks, mean ${mean.toFixed(1)} over ${waits.length} asks: ${[
      ...worst,
    ]
      .sort(([p], [q]) => (p < q ? -1 : 1))
      .map(
        ([key, v]) => `${name(Number(key.split('/')[0]))} ${Number(key.split('/')[1]) > 0 ? 'up' : 'down'} ${v / 10} s`,
      )
      .join('; ')}`,
    `Village stands by train: ${LINE_SLOTS[LINE2]!.map((k2) => `${k2}${fast.includes(k2) ? ' (fast)' : ''} ${villageStands.get(k2) ?? 0}`).join(', ')}; ` +
      `signal stands: ${LINE_SLOTS[LINE2]!.map((k2) => `${k2} ${signalStands.get(k2) ?? 0}`).join(', ')}; longest stand ${longest / 10} s; a fast train's closest to the one ahead ${closest / 100} m (sepCm ${TRAIN.sepCm / 100} m)`,
  ];
  health.drain(s.w, s.t, () => railTick(s.w, ++s.t, headPct));
  return { worst, mean, longest, mixedTicks, notes, health };
}

// The fleets a room can have, both hold settings: the headway hold on, and off (railTrainHeadPct 0, as the trains
// fuzz's second case), where nothing but the block rule and the balanced hold keeps a faster train off a slower one.
for (const [fleet, seed, headPct] of [
  ['handover', 0xb011e7, TRAIN_HEAD_PCT],
  ['handover', 0x5eed25, TRAIN_HEAD_PCT],
  ['handover', 0x0fa575, TRAIN_HEAD_PCT],
  ['handover', 0xb011e7, 0],
  ['handover', 0x5eed25, 0],
  ['handover', 0x0fa575, 0],
  ['standard', 0xb011e7, TRAIN_HEAD_PCT],
  ['standard', 0x0fa575, 0],
] as const)
  test(`${fleet} fleet ${seed.toString(16)} at ${headPct}%: ${FUZZ} ticks hold the blocks, service health and the 52.5 s mean`, (t) => {
    const r = fleetRun(fleet, seed, headPct);
    for (const n of r.notes) t.diagnostic(n);
    assert.deepEqual(r.health.failures, []);
    assert.ok(r.mean <= MEAN_BOUND, `mean wait ${r.mean} ticks (bound ${MEAN_BOUND})`);
    assert.ok(r.longest < 1200, 'no line 2 train stands two minutes');
  });

for (const [seed, headPct] of [[0xb011e7, TRAIN_HEAD_PCT], [0x0fa575, 0]] as const)
  test(
    `longer fleet ${seed.toString(16)} at ${headPct}%: service health and mean wait`,
    (t) => {
      const r = fleetRun('longer', seed, headPct);
      for (const n of r.notes) t.diagnostic(n);
      assert.deepEqual(r.health.failures, []);
      assert.ok(r.mean <= MEAN_BOUND, `mean wait ${r.mean} ticks (bound ${MEAN_BOUND})`);
    },
  );

// The hand-held mixed fleet, a safety test: spacing, end blocks and the load check hold with a faster train behind and
// ahead of slower ones for the whole run. Its waits are printed only.
for (const [seed, fast, headPct] of [
  [0xb011e7, [A], TRAIN_HEAD_PCT],
  [0x5eed25, [B, C], TRAIN_HEAD_PCT],
  [0x0fa575, [A], 0],
] as const)
  test(`mixed fleet ${seed.toString(16)} at ${headPct}%: trains ${fast.join(', ')} at 25 m/s among 20 for ${FUZZ} ticks hold the blocks`, (t) => {
    const r = fleetRun('mixed', seed, headPct, fast);
    for (const n of r.notes) t.diagnostic(n);
    assert.ok(r.mixedTicks >= FUZZ * 0.9, 'the fleet stayed mixed');
    assert.ok(r.longest < 1200, 'no line 2 train stands two minutes');
  });

// A train holds only at a halt or a signal (planLeg), so a fast train caught behind a slow one is held at the halt behind
// it: the gap it closes to is the halt spacing, never under sepCm.
test('a fast train let go right behind a slow one is held at the halt behind it, never nearer than the block rule', (t) => {
  const s = copy(HOME);
  assert.equal(install(s), 1);
  const st = trainStops(s.w, LINE2),
    c = circuitLen(st);
  const stand = (k: number, stop: number, track: number, depart: number, boiler: number) =>
    Object.assign(s.w.mut(Train, s.w.lookup(Train, k)!)!, {
      phase: TRAIN_PHASE.STAND,
      at: stop,
      to: stop,
      track,
      origin: track === 1 && stop === st.length - 1 ? st[stop]! : 0,
      depart,
      arrived: depart,
      req: 0,
      from: st[stop]!,
      v0: 0,
      dest: st[stop]!,
      boiler,
    });
  // B (slow) at the Quarry going up, leaving when its dwell ends; A (fast) ready at the Village; C parked at the Pier,
  // going home. No headway hold, so only the block rule keeps A off B.
  stand(B, 1, 0, s.t, 0);
  stand(A, 0, 0, s.t - TRAIN.dwellTicks, 1);
  stand(C, 3, 1, 1e9, 0);
  for (const id of s.w.ids(Line)) Object.assign(s.w.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  assert.equal(invariant(s.w), null);
  let closest = Infinity,
    held = 0;
  for (let k = 0; !(train(s.w, A).phase === TRAIN_PHASE.STAND && train(s.w, A).at === ISLAND); k++) {
    assert.ok(k < 3000, `A reaches the island (tick ${s.t})`);
    const before = [A, B].map((k2) => trainAlong(train(s.w, k2), LINE2, s.t));
    railTick(s.w, ++s.t, 0);
    [A, B].forEach((k2, i) =>
      assert.ok(
        Math.abs(trainAlong(train(s.w, k2), LINE2, s.t) - before[i]!) <= BOILER_SPEED[train(s.w, k2).boiler]! + 1,
      ),
    );
    assert.equal(
      trainSpacing(
        (slot) => train(s.w, slot),
        (line) => trainStops(s.w, line),
        s.t,
      ),
      null,
      `at ${s.t}`,
    );
    const a = train(s.w, A),
      b = train(s.w, B);
    if (a.track === 0 && b.track === 0) {
      const gap = circuitAhead(trainPose(a, LINE2, st, s.t).c, trainPose(b, LINE2, st, s.t).c, c);
      closest = Math.min(closest, gap);
    }
    if (a.phase === TRAIN_PHASE.RUN && a.to !== ISLAND) held++;
    if (k % 50 === 0) assert.equal(invariant(s.w), null);
  }
  t.diagnostic(`A's closest to B ${closest / 100} m (sepCm ${TRAIN.sepCm / 100} m); ticks on a held leg ${held}`);
  assert.ok(held > 0, 'the block rule held the fast train');
  assert.ok(closest >= TRAIN.sepCm);
  assert.ok(
    trainAlong(train(s.w, B), LINE2, s.t) >= trainAlong(train(s.w, A), LINE2, s.t) || train(s.w, B).track === 1,
    'never past B',
  );
  assert.equal(invariant(s.w), null);
});

// ---------------------------------------------------------------- garage step 4: the trade lines (v67)
// docs/plans/garage-step4.md, step 2: rail.install's parts 5 (Quick, row 4) and 6 (Strong, row 5) on a trade line once
// its trade is open, with its copy brought to the table by rail.bring; one revision a line (`Line.rev`); the table's
// hold; adoption at the line's halt 0, a swap back too, unless the kit aboard would not fit the new row.
const NS = ROW_LINE.ns,
  BAYL = ROW_LINE.bay,
  CUT = RAIL_LEGS.findIndex((l) => l.id === 'bay-cut'),
  CANOPY_GATE = RAIL_GATES.findIndex((g) => g.id === 'canopy');
/** `bay-mid` (both trades open; `canopy-reached`: leg 3 laid, no kit running) with the works lit and the first steel
 * home, by accepted ops and ticks only. Built once each, on first use. */
const tradeSeeds = new Map<string, Seed>();
const tradeReady = (stage: 'bay-mid' | 'canopy-reached' = 'bay-mid') => {
  if (!tradeSeeds.has(stage)) tradeSeeds.set(stage, steelHome(buildSeedWorld(stage)));
  return copy(tradeSeeds.get(stage)!);
};
const bring = (s: Seed, line: unknown, pid = 'a', fields: Record<string, unknown> = {}) =>
  act(s, pid, 'rail.bring', { line, revision: shed(s.w).bringRev, ...fields } as never);
const fit = (s: Seed, line: number, part: unknown, pid = 'a', fields: Record<string, unknown> = {}) =>
  act(s, pid, 'rail.install', { line, part, revision: lineRow(s.w, line).rev, ...fields } as never);
/** Brought and the copies' swap waited out. */
function brought(s: Seed, line: number) {
  assert.equal(bring(s, line), 1, `line ${line} brought`);
  advance(s, BRING_TICKS);
}
/** An op on a hand-made or fuzzed world (no load check after it), as the server would apply it. */
function raw(w: World, op: string, fields: Record<string, unknown>, t: number, pid = 'a') {
  const a = account(w, pid)!;
  return apply(w, pid, { op, epoch: a.epoch, request: a.request + 1, ...fields } as never, t).accepted;
}

test('trade installs: refusals, the first fit spends 1, swaps spend nothing, ten swaps, two on one tick fit once', () => {
  const s = tradeReady();
  assert.deepEqual([tradeOpen(s.w, NS), tradeOpen(s.w, BAYL)], [true, true]);
  assert.equal(shed(s.w).tableLine, LINE2, "line 2's copy stands on the table");
  assert.equal(fit(s, BAYL, 6), 0, 'the bay copy is not on the table');
  brought(s, BAYL);
  assert.equal(fit(s, BAYL, 2), 0, 'a line 2 part on a trade line');
  for (const part of [5, 6])
    assert.equal(act(s, 'a', 'rail.install', { line: LINE2, part, revision: lineRow(s.w, LINE2).rev }), 0);
  assert.equal(fit(s, NS, 5), 0, "another line's copy is on the table");
  assert.equal(fit(s, BAYL, 6, 'a', { revision: 1 }), 0, 'a revision not yet seen');
  for (const bad of [-1, 1.5, -0, Number.NaN, '0', null, undefined, 2 ** 60])
    assert.equal(fit(s, BAYL, 6, 'a', { revision: bad }), 0, `revision ${String(bad)}`);
  for (const bad of [4, 7, '6', 5.5, null]) assert.equal(fit(s, BAYL, bad), 0, `part ${String(bad)}`);
  // The roll-out reserves the table (a hand-made state, so applied without the load check).
  const busy = restore(s.w);
  for (const k of LINE_SLOTS[LINE2]!) Object.assign(busy.mut(Train, busy.lookup(Train, k)!)!, { wagon: false, foot: 0 });
  busy.mut(Shed, busy.single(Shed))!.ready = s.t + 10;
  assert.equal(raw(busy, 'rail.install', { line: BAYL, part: 6, revision: 0 }, s.t), 0, 'the table is busy');
  assert.equal(raw(busy, 'rail.bring', { line: NS, revision: 1 }, s.t), 0, 'no bring mid roll-out');
  // The first fit spends one steel; two presses on one tick fit once.
  const spent = shed(s.w).spent,
    pool = steelPool(shed(s.w));
  assert.ok(pool >= 1);
  assert.equal(fit(s, BAYL, 6), 1);
  assert.equal(fit(s, BAYL, 6, 'b', { revision: 0 }), 0, 'the same press on the same tick is stale');
  assert.equal(fit(s, BAYL, 5, 'b'), 0, "the table's hold");
  assert.deepEqual(
    { boiler: lineRow(s.w, BAYL).boiler, fitted: lineRow(s.w, BAYL).fitted, rev: lineRow(s.w, BAYL).rev },
    { boiler: 5, fitted: s.t, rev: 1 },
  );
  assert.equal(shed(s.w).spent, spent + INSTALL_STEEL[6]);
  assert.equal(bring(s, NS), 0, "no bring inside the install's hold");
  advance(s, WORKS.upgradeTicks - 1);
  assert.equal(fit(s, BAYL, 5), 0, 'one tick short of the hold');
  advance(s, 1);
  assert.equal(fit(s, BAYL, 6), 0, 'the current row again');
  assert.equal(steelPool(shed(s.w)), pool - 1);
  for (let k = 0; k < 10; k++) {
    assert.equal(fit(s, BAYL, k % 2 ? 6 : 5), 1, `swap ${k + 1}`);
    advance(s, WORKS.upgradeTicks);
  }
  assert.deepEqual({ boiler: lineRow(s.w, BAYL).boiler, rev: lineRow(s.w, BAYL).rev }, { boiler: 5, rev: 11 });
  assert.equal(shed(s.w).spent, spent + 1, 'swaps are free');
  // The other line's first fit spends its own one.
  brought(s, NS);
  assert.equal(fit(s, NS, 5), 1);
  assert.equal(shed(s.w).spent, spent + 2);
  // With no steel home, a first fit is refused (the screen's STEEL 0/1).
  const dry = copy(buildSeedWorld('bay-mid'));
  assert.equal(steelPool(shed(dry.w)), 0);
  brought(dry, BAYL);
  assert.equal(fit(dry, BAYL, 5), 0, 'an empty pool');
  const loaded = restore(s.w);
  assert.equal(invariant(loaded), null);
  assert.deepEqual([lineRow(loaded, BAYL).rev, lineRow(loaded, NS).rev, shed(loaded).tableLine, shed(loaded).bringRev], [11, 1, NS, 2]);
});

test('line 2 refuses trade parts in the legacy adapter and the receipt decoder', () => {
  const acts = railwayActs(() => true, () => HOME.w);
  for (const part of [5, 6] as const) {
    const event = { op: 'rail.install', line: LINE2, part, revision: 1 };
    assert.deepEqual([acts.installBoiler(1, part), intentOf(event)], [false, null]);
  }
});

test('trade installs are refused before each trade opens, even with the copy on the table', () => {
  // incline-mid: neither trade open; bay-open: the incline laid (ns open), the bay cut not yet laid.
  for (const [stage, line, open] of [
    ['incline-mid', NS, false],
    ['bay-open', NS, true],
    ['bay-open', BAYL, false],
  ] as const) {
    const s = copy(buildSeedWorld(stage));
    assert.equal(tradeOpen(s.w, line), open, `${stage} line ${line}`);
    if (!open) assert.equal(bring(s, line), 0, `${stage}: no bring before the trade opens`);
    // A hand-made table with the copy on it, and a pool: the rule still refuses until the trade opens.
    const w = restore(s.w);
    Object.assign(w.mut(Shed, w.single(Shed))!, { tableLine: line, steel: 1 });
    assert.equal(raw(w, 'rail.install', { line, part: 5, revision: 0 }, s.t), open ? 1 : 0, `${stage} install`);
  }
  // The cave line, line 1 and junk lines never come to the table.
  const s = tradeReady();
  for (const bad of [ROW_LINE.cave, 0, 5, -1, 1.5, '2', null, Number.NaN])
    assert.equal(bring(s, bad), 0, `line ${String(bad)}`);
});

test('rail.bring: refusals (not open, already there, stale, the hold); two on one tick bring once; restores', () => {
  const s = tradeReady();
  assert.equal(bring(s, LINE2), 0, "line 2's copy is already on the table");
  assert.equal(bring(s, BAYL, 'a', { revision: 1 }), 0, 'a revision not yet seen');
  for (const bad of [-1, 1.5, -0, '0', null, undefined, 2 ** 60])
    assert.equal(bring(s, BAYL, 'a', { revision: bad }), 0, `revision ${String(bad)}`);
  assert.equal(bring(s, BAYL), 1);
  assert.equal(bring(s, NS, 'b', { revision: 0 }), 0, 'two on one tick: the second is stale');
  assert.equal(bring(s, NS, 'b'), 0, "the copies' swap holds the table");
  assert.deepEqual([shed(s.w).tableLine, shed(s.w).bringRev, shed(s.w).brought], [BAYL, 1, s.t]);
  advance(s, BRING_TICKS - 1);
  assert.equal(bring(s, NS), 0, 'one tick short');
  advance(s, 1);
  assert.equal(bring(s, BAYL), 0, 'already on the table');
  assert.equal(bring(s, LINE2), 1, "line 2's copy back");
  const loaded = restore(s.w);
  assert.deepEqual([shed(loaded).tableLine, shed(loaded).bringRev], [LINE2, 2]);
  assert.equal(invariant(loaded), null);
});

test('a save with no bring history must still have the original table copy', () => {
  const s = tradeReady();
  assert.deepEqual([shed(s.w).tableLine, shed(s.w).bringRev, shed(s.w).brought], [LINE2, 0, -1]);
  s.w.mut(Shed, s.w.single(Shed))!.tableLine = BAYL;
  assert.throws(() => restore(s.w), /garage table/);
});

test("line 2's install revision is its two fits' sum across its whole install order", () => {
  const s = copy(railwayAtWorks('cradle-fitted'));
  const sum = (w: World) => assert.equal(lineRow(w, LINE2).rev, lineRow(w, LINE2).boiler + lineRow(w, LINE2).cradle);
  sum(s.w);
  assert.equal(act(s, 'a', 'rail.turn', { to: 1, revision: shed(s.w).tableRev }), 1);
  assert.equal(install(s, 'a', { part: 1 }), 1);
  sum(s.w);
  assert.equal(lineRow(s.w, 0).rev, 0, 'line 1 takes the table fit and no revision');
  const g = copy(FULL_GORGE);
  for (const part of [2, 4, 3]) {
    assert.equal(install(g, 'a', { part }), 1, `part ${part}`);
    sum(g.w);
    settle(g);
  }
  assert.equal(lineRow(g.w, LINE2).rev, 4);
});

test('a trade fit adopts only standing at its halt 0, never in flight, and a swap back adopts', () => {
  // Leg 3 laid: no kit runs, so the kit guard never holds a row (its own test is below).
  const s = tradeReady('canopy-reached');
  brought(s, BAYL);
  for (const [part, row] of [
    [6, 5],
    [5, 4],
    [6, 5],
  ] as const) {
    advance(s, Math.max(0, tableFree(s.w) - s.t));
    assert.equal(fit(s, BAYL, part), 1);
    const pending = new Set(servingSlots((k) => train(s.w, k), BAYL));
    for (let t = 0; pending.size; t++) {
      assert.ok(t < 8000, `every bay train adopts row ${row}`);
      const was = trains(s.w).map((r) => r.boiler);
      advance(s, 1);
      for (const k of LINE_SLOTS[BAYL]!) {
        const r = train(s.w, k);
        if (r.boiler === was[k]) continue;
        assert.equal(r.boiler, row);
        assert.ok(r.at === 0 && r.v0 === 0 && (r.phase === TRAIN_PHASE.STAND || r.depart === s.t), `#${k} at halt 0`);
        pending.delete(k);
      }
    }
    assert.equal(invariant(s.w), null);
  }
});

test('a Strong train with two bills aboard, swapped to Quick, keeps Strong until its kit fits one bill', () => {
  const s = tradeReady();
  brought(s, BAYL);
  assert.equal(fit(s, BAYL, 6), 1);
  const slot = LINE_SLOTS[BAYL]![0]!;
  const row = () => train(s.w, slot);
  const bill = 20;
  const until = (ok: () => boolean, what: string) => {
    for (let k = 0; !ok(); k++) {
      assert.ok(k < 8000, what);
      const was = row().boiler;
      advance(s, 1);
      // The row changes only standing at halt 0, and only to a row whose kit bills hold the kit aboard.
      if (row().boiler !== was) assert.ok(row().at === 0 && Math.max(row().logs, row().rails) <= bill * kitBills(row().boiler));
      assert.ok(Math.max(row().logs, row().rails) <= bill * kitBills(row().boiler), `the cargo bound at ${s.t}`);
      if (k % 100 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
    }
  };
  until(() => row().logs === 40 && row().rails === 40 && row().at === 0 && row().boiler === 5, 'two bills aboard');
  assert.equal(row().phase, TRAIN_PHASE.STAND, 'standing at the West landing');
  advance(s, Math.max(0, tableFree(s.w) - s.t));
  assert.ok(row().at === 0 && row().logs === 40, 'still at the West landing with both bills');
  assert.equal(fit(s, BAYL, 5), 1, 'swapped to Quick with two bills aboard');
  advance(s, 1);
  assert.equal(row().boiler, 5, 'two bills do not fit a Quick train: it keeps Strong');
  assert.equal(invariant(s.w), null);
  laySection(s, CUT);
  assert.equal(act(s, 'a', 'rail.gate', { id: CANOPY_GATE }), 1);
  until(() => row().at === 2 && row().phase === TRAIN_PHASE.STAND && row().logs === bill, 'one bill off at Bell Rock');
  assert.equal(row().boiler, 5, 'never adopts in flight');
  until(() => row().boiler === 4, 'adopts Quick at a later halt 0 stand');
  assert.equal(row().at, 0);
  assert.ok(row().logs <= bill && row().rails <= bill);
  assert.equal(invariant(s.w), null);
});

// The swap fuzz: the leg 2 rules' method (test/railway-leg2-rules.test.ts, waits) and its four ruled seeds, from
// bay-mid with the steel home, the open leg fed and the Canopy barrier opened, under random lever and rider asks and
// restores, with random accepted brings and swaps among rows 0, 4 and 5 on both trade lines. The block rule and every
// invariant hold. The 23 November service gate: an ask made within one circuit of an accepted swap on its line, or
// pending at it, is held to the mixed-fleet checks (safety and the three-budget stall limit); every other ask to the
// ordinary budget. FUZZ_TICKS lengthens it.
const SWAP_TICKS = fuzzTicks(6000);
function askable(w: World) {
  const stops: Record<number, number> = { [NS]: stopsOf(w, NS).length, [BAYL]: stopsOf(w, BAYL).length };
  return RAIL_HALTS.flatMap((h, id) => {
    if (h.line !== NS && h.line !== BAYL) return [];
    const n = stops[h.line]!;
    return h.stop < n && !(trainPassesBy(h.line, h.stop, 1, n) && trainPassesBy(h.line, h.stop, -1, n)) ? [id] : [];
  });
}
function swapFuzz(seed: number) {
  let s = unaudited(tradeReady());
  const rand = mulberry32(seed),
    health = new ServiceHealth([NS, BAYL], s.w),
    mixedUntil = new Map<number, number>([
      [NS, -1],
      [BAYL, -1],
    ]);
  let swaps = 0,
    brings = 0,
    kept = 0;
  const op = (o: string, f: Record<string, unknown>, pid = 'a') => raw(s.w, o, f, s.t, pid);
  for (let k = 0; k < SWAP_TICKS; k++) {
    if (rand() < 0.05) {
      const pool = askable(s.w),
        id = pool[Math.floor(rand() * pool.length)],
        dir = rand() < 0.5 ? -1 : 1;
      if (id !== undefined && op('rail.call', { id, dir }))
        health.ask(s.w, id, dir, s.t, s.t <= mixedUntil.get(RAIL_HALTS[id]!.line)!);
    }
    for (const line of [NS, BAYL]) {
      if (rand() >= 0.015) continue;
      const n = stopsOf(s.w, line).length,
        serving = servingSlots((j) => train(s.w, j), line);
      if (n > 2 && serving.length) {
        const slot = serving[Math.floor(rand() * serving.length)]!;
        const id = RAIL_HALTS.findIndex((h) => h.line === line && h.stop === 1 + Math.floor(rand() * (n - 2)));
        op('rail.call', { id, dir: trainDir(train(s.w, slot)), train: slot });
      }
    }
    // The room at the table: bring a line's copy, or fit Quick or Strong on the one there.
    if (rand() < 0.004) {
      const line = rand() < 0.5 ? NS : BAYL;
      if (shed(s.w).tableLine !== line) brings += op('rail.bring', { line, revision: shed(s.w).bringRev });
      else if (op('rail.install', { line, part: rand() < 0.5 ? 5 : 6, revision: lineRow(s.w, line).rev })) {
        swaps++;
        const st = stopsOf(s.w, line);
        mixedUntil.set(line, s.t + Math.max(...[0, 4, 5].map((b) => cycleTicks(line, st, b))));
        for (const p of health.pending.values()) if (RAIL_HALTS[p.id]!.line === line) p.safetyOnly = true;
      }
    }
    // The leg being built, fed by a and b off its rack; the Canopy barrier opened once it may be.
    const open = RAIL_LEGS.findIndex((_l, j) => legOpen(s.w, j));
    if (open >= 0 && legRow(s.w, open).start < 0)
      for (const pid of ['a', 'b']) {
        if (roomOf(s.w, account(s.w, pid)!, LOGS) > 0) op('rail.depotTake', {}, pid);
        if (roomOf(s.w, account(s.w, pid)!, RAILS) > 0) op('rail.depotRailTake', {}, pid);
        op('rail.legStock', { leg: open }, pid);
      }
    if (legDone(s.w, CUT) && !(routeRow(s.w).gates & (1 << CANOPY_GATE))) op('rail.gate', { id: CANOPY_GATE });
    const was = trains(s.w).map((r) => r.boiler);
    railTick(s.w, ++s.t, 75);
    for (const line of [NS, BAYL])
      for (const j of LINE_SLOTS[line]!) {
        const r = train(s.w, j);
        if (r.boiler !== was[j]) assert.ok(r.at === 0, `#${j} adopts at halt 0 (tick ${s.t})`);
        if (r.phase === TRAIN_PHASE.STAND && r.at === 0 && r.boiler !== lineRow(s.w, line).boiler) kept++;
      }
    health.tick(s.w, s.t);
    if (k % 10 === 0)
      assert.equal(
        trainSpacing(
          (j) => train(s.w, j),
          (l) => stopsOf(s.w, l),
          s.t,
        ),
        null,
        `spacing at ${s.t}`,
      );
    if (k % 250 === 0) assert.equal(invariant(s.w), null, `invariant at ${s.t}`);
    if (rand() < 0.002) s = unaudited({ w: restore(s.w), t: s.t });
  }
  health.drain(s.w, s.t, () => railTick(s.w, ++s.t, 75));
  assert.equal(invariant(s.w), null);
  return { health, swaps, brings, kept, laid: [CUT, CUT + 1].map((j) => legRow(s.w, j).laid) };
}
test(
  'the swap fuzz: random brings and swaps on both trade lines keep the blocks, the invariants and service',
  { timeout: 1200000 },
  (t) => {
    const failures: string[] = [];
    let swaps = 0;
    for (const seed of [0xc0ffee, 0x777, 0x5eed, 0xbadd]) {
      const r = swapFuzz(seed);
      swaps += r.swaps;
      t.diagnostic(
        `${seed.toString(16)}: brings ${r.brings}, swaps ${r.swaps}, halt 0 stands keeping a row ${r.kept}, bay cut/leg 3 laid ${r.laid.join('/')}; ${[...r.health.stages].join('; ')}`,
      );
      if (r.health.failures.length) failures.push(`${seed.toString(16)}: ${r.health.failures[0]}`);
    }
    assert.ok(swaps > 0, 'the fuzz made accepted swaps');
    assert.deepEqual(failures, []);
  },
);
