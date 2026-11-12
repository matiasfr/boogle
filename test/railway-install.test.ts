// The install and the longer boiler (docs/plans/ring-island-build2.md, R3): rail.install's refusals (no steel in the
// bay, line 1, another part, a stale or malformed revision, the table mid roll-out), two presses on one tick
// installing once, each line 2 train taking the fit only standing at the Village, the standard boiler's legs being
// v27's bit for bit, the ten-second rule on the real stops, the 8.2 m extent clearing every middle halt and signal,
// and the mixed fleet: one (or two) of line 2's trains at 25 m/s among trains at 20 for 20,000 ticks under random
// lever and rider asks and restores, holding the block rule (sepCm round the circuit, one train an end block) and every
// invariant; and line 2's wait bound (105 s worst, 52.5 s mean) on all standard and the real handover after an
// install (all longer is a todo test, with the owner). FUZZ_TICKS lengthens the fuzz.
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
  lineDef,
} from '../src/sim/railway-lines.ts';
import {
  BOILER_SPEED,
  TRAIN,
  TRAIN_PHASE,
  boilerKin,
  lineStages,
  stopKin,
  trainAlong,
  trainDir,
  trainLegAlong,
  trainLegTicks,
  type RailTrain,
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
import { STEEL } from '../src/sim/railway-ring-layout.ts';
import { fuzzTicks } from './helpers/fuzz.ts';
import {
  account,
  act,
  advance,
  invariant,
  line as lineRow,
  railTick,
  railwayAtRing,
  restore,
  shed,
  steel,
  train,
  trains,
  unaudited,
  type Seed,
} from './helpers/rail.ts';

const [A, B, C] = LINE_SLOTS[LINE2] as [number, number, number];
const ISLAND = 5;
const copy = (s: Seed): Seed => unaudited({ w: restore(s.w), t: s.t });
const install = (s: Seed, pid = 'a', fields: Record<string, unknown> = {}) =>
  act(s, pid, 'rail.install', { line: LINE2, part: 1, revision: lineRow(s.w, LINE2).boiler, ...fields });

/** Ring-joined played on until the first steel is in the bay, from accepted ops and ticks only: the kit train, the
 * bill fed by one player, the casts and the ride home. Built once, outside any one test's time. */
function steelHome(): Seed {
  const s = copy(railwayAtRing('ring-joined'));
  const run = (ok: () => boolean, max: number, what: string) => {
    for (let t = 0; !ok(); t++) {
      assert.ok(t < max, `${what} in time (tick ${s.t})`);
      advance(s, 1);
    }
  };
  run(() => steel(s.w).yardLogs + steel(s.w).yardRails === STEEL.logs + STEEL.rails, 4000, 'the kit in the yard');
  for (const kind of [0, 1])
    for (let k = 0; k < 8; k++) {
      act(s, 'a', 'rail.steelTake', { kind });
      if (!act(s, 'a', 'rail.steel')) break;
    }
  assert.ok(steel(s.w).lit >= 0, 'the works lit');
  run(() => shed(s.w).steel >= 1, 6000, 'the first steel in the bay');
  assert.equal(invariant(s.w), null);
  return s;
}
const HOME = steelHome();

// ---------------------------------------------------------------- the standard boiler is v27's
test("the standard boiler's legs are v27's bit for bit; the longer one cruises at 25 m/s", () => {
  RAIL_LINES.forEach((l, line) => {
    assert.equal(BOILER_SPEED[0], l.speed, `${l.name}: row 0 is the line's own cruise`);
    assert.equal(boilerKin(line, 0), lineDef(line), 'the very same kin object');
    l.halts.forEach((_h, to) => {
      for (const track of [0, 1]) {
        const v27 = stopKin(line, to, track),
          now = stopKin(line, to, track, 0);
        assert.deepEqual(now, v27);
        for (const dist of [1, 999, 2500, 30000, 119000])
          for (const v0 of [0, 37, 200]) {
            assert.equal(trainLegTicks(dist, v0, now), trainLegTicks(dist, v0, v27));
            for (const t of [1, 50, 333, 1000])
              assert.equal(trainLegAlong(dist, t, v0, now), trainLegAlong(dist, t, v0, v27));
          }
        assert.equal(stopKin(line, to, track, 1).speed, 250);
        assert.equal(stopKin(line, to, track, 1).brake, v27.brake, 'a halt brakes at its own rate on either boiler');
      }
    });
  });
  // A row with no boiler field (a fixture's) runs as boiler 0.
  const row: RailTrain = {
    ...train(HOME.w, A),
    phase: TRAIN_PHASE.RUN,
    depart: 0,
    from: 1400,
    dest: 60000,
    to: -1,
    v0: 0,
  };
  const bare: RailTrain = { ...row };
  delete bare.boiler;
  for (const t of [0, 10, 100, 1000])
    assert.equal(trainAlong({ ...row, boiler: 0 }, LINE2, t), trainAlong(bare, LINE2, t));
});

test('the ten-second rule on the real stops: Village to Ring Island saves at least 10 s at 25 m/s', (t) => {
  const stops = trainStops(HOME.w, LINE2);
  assert.equal(stops.length, 6, 'the island is open');
  const leg = (from: number, to: number, boiler: number) =>
    trainLegTicks(Math.abs(stops[to]! - stops[from]!), 0, stopKin(LINE2, to, to > from ? 0 : 1, boiler));
  const out = [leg(0, ISLAND, 0), leg(0, ISLAND, 1)],
    // Home with a stop at the homeward-only Pier.
    pier = [leg(ISLAND, 3, 0) + leg(3, 0, 0), leg(ISLAND, 3, 1) + leg(3, 0, 1)];
  t.diagnostic(
    `Village to Ring Island ${out[0]! / 10} s at 20 m/s, ${out[1]! / 10} s at 25 (saves ${(out[0]! - out[1]!) / 10} s); ` +
      `home by the Pier ${pier[0]! / 10} s, ${pier[1]! / 10} s (saves ${(pier[0]! - pier[1]!) / 10} s); ` +
      `round trip ${cycleTicks(LINE2, stops) / 10} s, ${cycleTicks(LINE2, stops, 1) / 10} s`,
  );
  assert.ok(out[0]! - out[1]! >= 100, 'about ten seconds a trip, non-stop');
  assert.ok(cycleTicks(LINE2, stops, 1) < cycleTicks(LINE2, stops));
});

test('with the 8.2 m extent every middle halt stands clear of both end blocks, and every signal of its own', () => {
  assert.equal(TRAIN_EXTENT.aheadCm, 820);
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
test('rail.install: refused with no steel home, for line 1, another part, a stale or malformed revision', () => {
  const joined = copy(railwayAtRing('ring-joined'));
  assert.equal(shed(joined.w).steel, 0);
  assert.equal(install(joined), 0, 'no steel in the bay');
  const s = copy(HOME);
  assert.equal(install(s, 'a', { line: 0 }), 0, 'line 1');
  assert.equal(install(s, 'a', { part: 2 }), 0, 'another part');
  assert.equal(install(s, 'a', { revision: 1 }), 0, 'a revision not yet seen');
  for (const bad of [-1, 1.5, -0, Number.NaN, '0', null, undefined, 2 ** 60])
    assert.equal(install(s, 'a', { revision: bad }), 0, `revision ${String(bad)}`);
  for (const bad of ['1', 1.5, Number.NaN, null, undefined]) assert.equal(install(s, 'a', { line: bad }), 0);
  assert.equal(lineRow(s.w, LINE2).boiler, 0);
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
    { op: 'rail.install', epoch: a.epoch, request: a.request + 1, line: 1, part: 1, revision: 0 },
    s.t,
  );
  assert.equal(r.accepted, 0, 'the table is busy');
});

test('two presses on one tick install once; the fit spends nothing and records its tick', () => {
  const s = copy(HOME);
  const bay = shed(s.w).steel;
  assert.equal(install(s, 'a', { revision: 0 }), 1);
  assert.equal(install(s, 'b', { revision: 0 }), 0, 'the second press on the same tick carries a stale revision');
  assert.deepEqual(
    { boiler: lineRow(s.w, LINE2).boiler, fitted: lineRow(s.w, LINE2).fitted },
    { boiler: 1, fitted: s.t },
  );
  assert.equal(shed(s.w).steel, bay, 'the stack is shown, not spent');
  assert.equal(install(s, 'b'), 0, 'installed: nothing more to fit');
  assert.equal(lineRow(s.w, 0).boiler, 0, "line 1's fit is untouched");
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
    0,
    'line 1 never',
  );
  t.diagnostic(`fitted after install: ${[...took].map(([k, d]) => `train ${k} ${d / 10} s`).join(', ')}`);
});

// ---------------------------------------------------------------- the fleets (the plan's P1)
// Line 2's wait bound (greybox-route's design review of 12 November, section A): worst lever wait 1,050 ticks, mean
// 525. It is asserted on all standard (no install) and the real handover (the install made through the accepted op,
// each train taking the fit at its next Village stand, within about 91 s); all longer is a todo test, below.
// A fleet held mixed by hand is not reachable in play, so it is a safety test only: its waits are printed, not bounded
// (docs/agent-calls.md, Rail, 12 November: one seed in fifteen measured 1,064 ticks there).
const WAIT_BOUND = 1050,
  MEAN_BOUND = 525;
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
    for (let k = 0; servingSlots((j) => train(s.w, j), LINE2).some((k2) => train(s.w, k2).boiler !== 1); k++) {
      assert.ok(k < 4000, `every train fitted in time (tick ${s.t})`);
      railTick(s.w, ++s.t, headPct);
    }
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
      if (act(s, 'a', 'rail.call', { id, dir }) && !asked.has(`${stop}/${dir}`)) asked.set(`${stop}/${dir}`, s.t);
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
      if (r.boiler === 0) continue;
      const village = trainStops(s.w, LINE2)[0]!;
      assert.ok(
        r.from === village && r.v0 === 0 && (r.phase === TRAIN_PHASE.STAND ? r.at === 0 : r.depart === s.t),
        'took it standing at the Village this tick',
      );
      s.w.mut(Train, s.w.lookup(Train, k2)!)!.boiler = 0;
      resets++;
    }
    const boilers = LINE_SLOTS[LINE2]!.map((k2) => train(s.w, k2).boiler);
    if (boilers.includes(0) && boilers.includes(1)) mixedTicks++;
    // How close a fast train came to the train ahead of it round the circuit (the block rule's floor is sepCm).
    {
      const st = trainStops(s.w, LINE2),
        c = circuitLen(st),
        at = LINE_SLOTS[LINE2]!.map((k2) => trainPose(train(s.w, k2), LINE2, st, s.t).c);
      LINE_SLOTS[LINE2]!.forEach((k2, i) => {
        if (train(s.w, k2).boiler !== 1) return;
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
    `mixed ${mixedTicks} of ${FUZZ} ticks; restores ${restores}; slow trains reset ${resets} times`,
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
  return { worst, mean, longest, mixedTicks, notes };
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
  test(`${fleet} fleet ${seed.toString(16)} at ${headPct}%: ${FUZZ} ticks hold the blocks, the 105 s worst wait and the 52.5 s mean`, (t) => {
    const r = fleetRun(fleet, seed, headPct);
    for (const n of r.notes) t.diagnostic(n);
    for (const [key, v] of r.worst) assert.ok(v <= WAIT_BOUND, `${key}: waited ${v} ticks (bound ${WAIT_BOUND})`);
    assert.ok(r.mean <= MEAN_BOUND, `mean wait ${r.mean} ticks (bound ${MEAN_BOUND})`);
    assert.ok(r.longest < 1200, 'no line 2 train stands two minutes');
  });

// TODO, with the owner: an all-longer fleet (every line 2 train on the longer boiler, from the tick the last one takes
// the fit) breaches the 1,050 worst wait on one seed: 1,100 ticks at b011e7 with the headway hold on (an ask for the
// Quarry down while all three trains run out; the nearest makes three lever stops on its way down), 991 or under on
// eight more seeds. Whether line 2's wait bound holds for the longer boiler is the owner's open question (docs/agent-calls.md,
// Rail, 12 November); until he answers this is a todo test: it prints its figures and its failure does not fail the
// suite. The safety checks inside fleetRun (spacing, end blocks, jumps, the load check) still throw as todo failures.
// On the greybox route's world (v32) b011e7 measures 1,152 (the Quarry down) and fa575 at 0% passes (worst 730), so
// only b011e7 stays todo; fa575 is held to the bound.
for (const [seed, headPct, todo] of [
  [0xb011e7, TRAIN_HEAD_PCT, true],
  [0x0fa575, 0, false],
] as const)
  test(
    `longer fleet ${seed.toString(16)} at ${headPct}%: ${FUZZ} ticks, the 105 s worst wait and the 52.5 s mean`,
    todo ? { todo: 'all-longer breaches 1,050 on one seed (1,152 at b011e7 on v32); with the owner' } : {},
    (t) => {
      const r = fleetRun('longer', seed, headPct);
      for (const n of r.notes) t.diagnostic(n);
      for (const [key, v] of r.worst) assert.ok(v <= WAIT_BOUND, `${key}: waited ${v} ticks (bound ${WAIT_BOUND})`);
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
