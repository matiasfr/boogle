// Several trains on a line (docs/plans/generic-lines.md, step 4a): the block rule, the end blocks and their signals,
// the headway hold, who serves a lever ask, a rider's own ask, the wagon's exemption, the pier opening mid-run, and
// the worst wait for a train each way at every halt under random asks. The fuzz, the signal-to-signal leg and the
// wagon under random asks come from the independent review of 4a (10 November); FUZZ_TICKS lengthens the fuzz (the
// review ran 40,000) and FUZZ_LIGHT=1 asks at a playtest's rate, one lever ask every 60-90 s.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import {
  RAIL_HALTS,
  RAIL_LINES,
  RAIL_TRAINS,
  TRAIN_EXTENT,
  circuitLen,
  trainPlaces,
} from '../src/sim/railway-lines.ts';
import {
  TRAIN,
  TRAIN_PHASE,
  TRAIN_STOPS,
  reqHas,
  trainAlong,
  trainDir,
  trainSpeed,
  type RailTrain,
} from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  TRAIN_HEAD_PCT,
  blockFree,
  cycleTicks,
  endBlocks,
  endMoved,
  headTicks,
  lineSpacing,
  stopMoved,
  trainStepLine,
  trainServes,
  trainSpacing,
  validateRailTrains,
} from '../src/sim/railway-trains.ts';
import { line2Completed, trainStops } from '../src/sim/railway-line2.ts';
import { Line, Train, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { railwayAtTrains } from './helpers/railway-trains.ts';
import { act } from './helpers/railway-q2.ts';
import { advanceWorks, railwayAtWorks } from './helpers/railway-works.ts';
import { footingTotal } from '../src/sim/railway-works.ts';
import { edit, invariant, live, railTick, restore, worldOf } from './railway-live.ts';
import type { World as Fixture } from './helpers/railway-q2.ts';
import { FixtureLine, V27_LINE2, standingAt, v27Stops } from './helpers/railway-v27-line.ts';
import {
  qCompleted,
  railTick as worldTick,
  railwayAtTrains as worldAtTrains,
  restore as worldRestore,
  stopsOf,
  train,
  trainId,
} from './helpers/rail.ts';

const LINE2 = 1;
const [A, B] = LINE_SLOTS[LINE2] as [number, number];
const BRAKE = (TRAIN.speed * TRAIN.speed) / (2 * TRAIN.accel);
const rows = (w: Fixture) => (k: number) => w.s.trains[k]!;
const stops = (w: Fixture) => (line: number) => trainStops(w.s, line);
const row = (w: Fixture, k: number) => w.s.trains[k]!;
const along = (w: Fixture, k: number, t = w.t) => trainAlong(row(w, k), RAIL_TRAINS[k]!.line, t);
/** A halt's id (rail.call's `id`) by line and stop. */
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const QUARRY = haltId(LINE2, 1);
// The shared seed fixtures are built once a process: here, outside any one test's time.
railwayAtTrains('q6-done');
railwayAtTrains('q6-stocked');
railwayAtTrains('q6-finishing');
railwayAtWorks('wagon-on');
railwayAtWorks('cradle-fitted');
const lever = (w: Fixture, id: number, dir: number) => act(w, 'a', 'rail.call', { id, dir });
/** One rule tick, checking every train's pose stays continuous and the spacing invariants hold. */
function step(w: Fixture, headPct = TRAIN_HEAD_PCT) {
  const before = w.s.trains.map((_r, k) => along(w, k, w.t));
  railTick(w.s, ++w.t, headPct);
  w.s.trains.forEach((_r, k) =>
    assert.ok(Math.abs(along(w, k) - before[k]!) <= TRAIN.speed + 1, `train ${k} jumps at tick ${w.t}`),
  );
  const broken = trainSpacing(rows(w), stops(w), w.t);
  assert.equal(broken, null, `tick ${w.t}`);
}
function until(w: Fixture, ok: () => boolean, max = 6000, headPct = TRAIN_HEAD_PCT) {
  for (let t = 0; !ok(); t++) {
    assert.ok(t < max, `in time (tick ${w.t})`);
    step(w, headPct);
  }
}
const standing = (w: Fixture, k: number, stop: number, dir?: number) => () => {
  const r = row(w, k);
  return r.phase === TRAIN_PHASE.STAND && r.at === stop && (dir === undefined || trainDir(r) === dir);
};
/** Train k's stands over `ticks`: [stop, its way] each (stop -1 a signal). */
function stands(w: Fixture, k: number, ticks: number, headPct = TRAIN_HEAD_PCT) {
  const out: [number, number][] = [];
  for (let t = 0; t < ticks; t++) {
    const was = row(w, k).phase;
    step(w, headPct);
    const r = row(w, k);
    if (was === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) out.push([r.at, trainDir(r)]);
  }
  return out;
}
/** Two trains standing where a test puts them, awake, nothing asked, the ends never left. */
function place(w: Fixture, at: { k: number; stop: number; track: number; depart: number; s?: number }[]) {
  edit(w.s, (e) => {
    for (const p of at) {
      const s = p.s ?? TRAIN_STOPS[RAIL_TRAINS[p.k]!.line]![p.stop]!;
      Object.assign(e.mut(Train, e.lookup(Train, p.k)!)!, {
        phase: TRAIN_PHASE.STAND,
        at: p.stop,
        to: p.stop,
        track: p.track,
        depart: p.depart,
        req: 0,
        from: s,
        v0: 0,
        dest: s,
      });
    }
    for (const id of e.ids(Line)) Object.assign(e.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  });
  assert.equal(invariant(w.s), null);
}
/** A trains-on world past the wake, every train's dwell over. */
function awake(stage: 'trains-on' | 'q6-done' = 'trains-on', audit = true) {
  const seed = railwayAtTrains(stage);
  // The long runs skip the write audit (which re-reads every row each system run): the same rules, unaudited.
  let w = seed;
  if (!audit) {
    const raw = createRailwayWorld();
    raw.load(JSON.parse(JSON.stringify(worldOf(seed.s).snapshot())), railwayCheck);
    w = { s: live(raw), t: seed.t };
  }
  for (let t = 0; t < TRAIN.wakeTicks; t++) railTick(w.s, ++w.t);
  return w;
}

// ---------------------------------------------------------------- the catalog's numbers
test("line 2's cycle and headway: 92.4 s to the pier (34.6 s apart), 72 s before it (27 s)", () => {
  const all = TRAIN_STOPS[LINE2]!,
    before = all.slice(0, 3);
  assert.equal(cycleTicks(LINE2, all), 924);
  assert.equal(headTicks(LINE2, all), 346);
  assert.equal(cycleTicks(LINE2, before), 722);
  assert.equal(headTicks(LINE2, before), 270);
  assert.equal(headTicks(0, TRAIN_STOPS[0]!), 0, 'one train: no hold');
  // Line 2's two start spread round the circuit: the Village (up) and Far Head (down, its end before the pier).
  assert.deepEqual(trainPlaces(LINE2, before), [
    { stop: 0, track: 0 },
    { stop: 2, track: 1 },
  ]);
  assert.deepEqual(trainPlaces(0, TRAIN_STOPS[0]!), [{ stop: 1, track: 1 }], "line 1's one at Camp, as v25");
  // Every block reaches past its stub's turnout (a crossover's starts at it), and every signal stands on the inbound
  // track outside it by a train's lead, at least a train's gap from the end stop (review of v26, P2-1).
  const [village, farHead] = endBlocks(LINE2, before);
  assert.deepEqual([village.from, village.to, village.signal], [1700, 5400, 6300]);
  assert.deepEqual([farHead.from, farHead.to, farHead.signal], [49000, 52400, 48380]);
  assert.deepEqual(
    endBlocks(LINE2, all).map((b) => b.signal),
    [6300, 52980],
    "the far end's block moves to the pier's stub",
  );
});

// ---------------------------------------------------------------- spacing and the worst wait
/** The worst wait test's flat bound on line 2 (orchestrator, 10 November): 105 s, from the review's long fuzz (91-97
 * s at the default hold over 5 seeds × 40,000 ticks). Two trains do NOT meet the design's one-minute bound under heavy
 * random asks; v27's third train (or an even-spacing hold) is to. */
const WAIT_BOUND = 1050;
const FUZZ_TICKS = Number(process.env.FUZZ_TICKS ?? 3000);
const LIGHT = process.env.FUZZ_LIGHT === '1';
const unaudited = (w: Fixture): Fixture => {
  const raw = createRailwayWorld();
  raw.load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
  return { s: live(raw), t: w.t };
};
/** Q6's kit off the train and its logs and rails into the frame, so the pier opens a few hundred ticks on. */
function fundQ6(w: Fixture) {
  assert.equal(act(w, 'a', 'rail.pack'), 1);
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      assert.equal(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
      assert.equal(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
    }
}
for (const [seed, headPct] of [
  [0xc0ffee, TRAIN_HEAD_PCT],
  [0x777, 0],
] as const)
  test(`fuzz ${seed.toString(16)} at ${headPct}%: lever and rider asks, the pier at a random tick, restores; the worst wait`, (t) => {
    let w = unaudited(railwayAtTrains('q6-stocked'));
    for (let k = 0; k < TRAIN.wakeTicks; k++) railTick(w.s, ++w.t, headPct);
    const rand = mulberry32(seed);
    const packAt = Math.floor(rand() * Math.min(3000, FUZZ_TICKS / 2));
    let pierAt = -1,
      restores = 0,
      nextAsk = w.t;
    // Lever waits by "halt/dir" (the ask's tick until a train of its line stands there leaving that way), riders' by
    // "slot/stop"; how long a line-2 train stood at most.
    const asked = new Map<string, number>(),
      worst = new Map<string, number>(),
      riderAsk = new Map<string, number>(),
      riderWorst = new Map<string, number>(),
      standSince = new Map<number, number>(),
      waits: number[] = [];
    let longest = { slot: -1, ticks: 0, at: -1, tick: 0 };
    for (let k = 0; k < FUZZ_TICKS; k++) {
      if (k === packAt) fundQ6(w);
      if (pierAt < 0 && line2Completed(w.s) >= 6) pierAt = w.t;
      const n2 = trainStops(w.s, LINE2).length;
      if (LIGHT ? w.t >= nextAsk : rand() < 0.05) {
        nextAsk = w.t + 600 + Math.floor(rand() * 300);
        const id = Math.floor(rand() * RAIL_HALTS.length),
          dir = rand() < 0.5 ? -1 : 1;
        const h = RAIL_HALTS[id]!;
        if (h.stop < trainStops(w.s, h.line).length && lever(w, id, dir) && !asked.has(`${id}/${dir}`))
          asked.set(`${id}/${dir}`, w.t);
      }
      if (!LIGHT && rand() < 0.03) {
        const slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 2)]!,
          stop = 1 + Math.floor(rand() * (n2 - 2));
        if (
          act(w, 'a', 'rail.call', { id: haltId(LINE2, stop), dir: trainDir(row(w, slot)), train: slot }) &&
          !riderAsk.has(`${slot}/${stop}`)
        )
          riderAsk.set(`${slot}/${stop}`, w.t);
      }
      // Junk the server's validation would refuse: the rule refuses it too, and never throws.
      if (rand() < 0.01) {
        const train = [-1, 3, 99, 1.5, -0, Number.NaN, 2 ** 60, '1', null][Math.floor(rand() * 9)];
        act(w, 'a', 'rail.call', { id: Math.floor(rand() * 8) - 1, dir: rand() < 0.5 ? -1 : 2, train } as never);
      }
      step(w, headPct);
      w.s.trains.forEach((r, slot) => {
        if (r.phase !== TRAIN_PHASE.STAND) return void standSince.delete(slot);
        if (!standSince.has(slot)) standSince.set(slot, w.t);
        const d = w.t - standSince.get(slot)!;
        if (RAIL_TRAINS[slot]!.line === LINE2 && d > longest.ticks) longest = { slot, ticks: d, at: r.at, tick: w.t };
      });
      for (const [key, since] of asked) {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        const h = RAIL_HALTS[id]!;
        if (LINE_SLOTS[h.line]!.some((s) => standing(w, s, h.stop, dir)())) {
          worst.set(key, Math.max(worst.get(key) ?? 0, w.t - since));
          if (h.line === LINE2) waits.push(w.t - since);
          asked.delete(key);
        }
      }
      for (const [key, since] of riderAsk) {
        const [slot, stop] = key.split('/').map(Number) as [number, number];
        const r = row(w, slot);
        if (r.phase === TRAIN_PHASE.STAND && r.at === stop) {
          riderWorst.set(key, Math.max(riderWorst.get(key) ?? 0, w.t - since));
          riderAsk.delete(key);
        } else if (r.at === 0 || r.at === trainStops(w.s, LINE2).length - 1) riderAsk.delete(key); // dropped at a turnback
      }
      if (k % 50 === 0) assert.equal(invariant(w.s), null, `invariant at ${w.t}`);
      if (rand() < 0.002) {
        w = unaudited({ s: restore(w.s), t: w.t });
        restores++;
      }
    }
    for (const [key, since] of asked) worst.set(key, Math.max(worst.get(key) ?? 0, w.t - since));
    const table = [...worst]
      .sort(([p], [q]) => (p < q ? -1 : 1))
      .map(([key, ticks]) => {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        return `${RAIL_HALTS[id]!.name} ${dir > 0 ? 'up' : 'down'} ${(ticks / 10).toFixed(1)} s`;
      });
    t.diagnostic(`${FUZZ_TICKS} ticks${LIGHT ? ', light asks' : ''}; pier opened at ${pierAt}; restores ${restores}`);
    t.diagnostic(`worst lever waits: ${table.join('; ')}`);
    const mean = waits.reduce((a, b) => a + b, 0) / Math.max(1, waits.length);
    t.diagnostic(`line 2 lever waits: ${waits.length} served, mean ${(mean / 10).toFixed(1)} s`);
    t.diagnostic(`worst rider waits (slot/stop): ${[...riderWorst].map(([k, v]) => `${k} ${v / 10} s`).join('; ')}`);
    t.diagnostic(`longest line-2 stand: ${JSON.stringify(longest)}`);
    for (const [key, ticks] of worst)
      if (RAIL_HALTS[Number(key.split('/')[0])]!.line === LINE2)
        assert.ok(ticks <= WAIT_BOUND, `line 2 ${key}: waited ${ticks} ticks (bound ${WAIT_BOUND})`);
    assert.ok(pierAt >= 0, 'the pier opened');
    assert.ok(longest.ticks < 1200, 'no line-2 train stands two minutes');
    assert.equal(invariant(w.s), null);
  });

test('a train held at the old Far Head signal when the pier opens runs signal to signal, a leg the save check takes', () => {
  // The review's P1: the far signal moves out with the pier's stub, so a train standing at Far Head's (48000) plans a
  // leg from one signal to the next (at = to = -1), which the validator must accept: a real, positive leg.
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.s) < 6) railTick(probe.s, ++probe.t);
  const opens = probe.t;
  const w = unaudited(base);
  while (w.t < opens - 10) railTick(w.s, ++w.t);
  edit(w.s, (e) => {
    Object.assign(e.mut(Train, e.lookup(Train, A)!)!, {
      phase: TRAIN_PHASE.RUN,
      at: 1,
      to: 2,
      track: 0,
      depart: w.t,
      req: 0,
      from: 51000,
      v0: 0,
      dest: TRAIN_STOPS[LINE2]![2]!,
    });
    Object.assign(e.mut(Train, e.lookup(Train, B)!)!, {
      phase: TRAIN_PHASE.STAND,
      at: -1,
      to: -1,
      track: 0,
      depart: w.t,
      req: 0,
      from: 48000,
      v0: 0,
      dest: 48000,
    });
    for (const id of e.ids(Line)) Object.assign(e.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  });
  assert.equal(invariant(w.s), null, 'the placed state is valid');
  let signalLeg = false,
    after = -1;
  for (let k = 0; k < 1500 && (after < 0 || w.t < after); k++) {
    step(w);
    const r = row(w, B);
    if (r.phase === TRAIN_PHASE.RUN && r.at < 0 && r.to < 0) {
      signalLeg = true;
      after = w.t + 100;
      assert.ok((r.dest - r.from) * trainDir(r) > 0, 'a signal-to-signal leg runs forward, of positive length');
    }
    if (k % 10 === 0 || signalLeg)
      assert.equal(invariant(w.s), null, `tick ${w.t} (pier at ${opens}): ${JSON.stringify(r)}`);
  }
  assert.ok(signalLeg, 'the held train ran a signal-to-signal leg');
  // A zero-length leg is still refused.
  const bad = { ...row(w, B), phase: TRAIN_PHASE.RUN, at: -1, to: -1, from: 48000, dest: 48000 };
  assert.throws(() => validateRailTrains({ ...w.s, trains: w.s.trains.map((r, k) => (k === B ? bad : r)) }, stops(w)));
});

test("the wagon's twelve footings reach the pier under random asks and restores", (t) => {
  let w = unaudited(railwayAtWorks('cradle-fitted'));
  const rand = mulberry32(0xfee7);
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: w.s.shed!.tableRev }), 1);
  const start = w.t;
  const wagons = new Set<number>();
  for (let guard = 0; w.s.works!.pierSet < WORKS.pier; guard++) {
    assert.ok(guard < 20000, `the crossing finishes (pierSet ${w.s.works!.pierSet})`);
    if (rand() < 0.05) {
      const id = Math.floor(rand() * RAIL_HALTS.length);
      if (RAIL_HALTS[id]!.stop < trainStops(w.s, RAIL_HALTS[id]!.line).length) lever(w, id, rand() < 0.5 ? -1 : 1);
    }
    if (w.s.works!.pierRack > 0) {
      assert.equal(act(w, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(w, 'a', 'rail.footSet', { site: 2 }), 1);
    }
    railTick(w.s, ++w.t);
    assert.equal(footingTotal(w.s), w.s.works!.poured, `footings conserved at ${w.t}`);
    w.s.trains.forEach((r, k) => r.wagon && wagons.add(k));
    if (guard % 200 === 0) assert.equal(invariant(w.s), null);
    if (rand() < 0.003) w = unaudited({ s: restore(w.s), t: w.t });
  }
  assert.equal(wagons.size, 1, 'the wagon stays on one train');
  t.diagnostic(`crossing after ${((w.t - start) / 10).toFixed(1)} s`);
});

// ---------------------------------------------------------------- who serves a lever ask
test('a lever ask goes to the next train that way that can brake; the one too close runs through', () => {
  const w = awake('trains-on');
  // Train A out from the village, inside its braking distance of the quarry.
  until(w, () => row(w, A).phase === TRAIN_PHASE.RUN && row(w, A).track === 0);
  until(w, () => TRAIN_STOPS[LINE2]![1]! - along(w, A) < BRAKE - 600);
  assert.equal(lever(w, QUARRY, 1), 1);
  const st = trainStops(w.s, LINE2);
  assert.equal(trainServes(rows(w), LINE2, st, 1, 1, w.t), B, 'B, the next up train, is named');
  const a = stands(w, A, 400);
  assert.deepEqual(a[0], [2, -1], 'A runs through to Far Head');
  until(w, standing(w, B, 1, 1));
  assert.equal(w.s.lines[LINE2]!.req !== 0, true, 'the ask stands until B leaves with it');
  until(w, () => row(w, B).phase === TRAIN_PHASE.RUN);
  assert.equal(w.s.lines[LINE2]!.req, 0, 'served by B');
  assert.equal(invariant(w.s), null);
});
test('a lever ask in time stops the first train; the one behind is not named', () => {
  const w = awake('trains-on');
  until(w, () => row(w, A).phase === TRAIN_PHASE.RUN && row(w, A).track === 0);
  until(w, () => trainSpeed(row(w, A), LINE2, w.t) === TRAIN.speed);
  assert.ok(TRAIN_STOPS[LINE2]![1]! - along(w, A) > BRAKE + 400);
  assert.equal(lever(w, QUARRY, 1), 1);
  assert.equal(trainServes(rows(w), LINE2, trainStops(w.s, LINE2), 1, 1, w.t), A);
  step(w);
  assert.deepEqual([row(w, A).to, row(w, A).depart], [1, w.t], 'A replanned to the quarry from where it is');
  until(w, standing(w, A, 1, 1));
});
test("a rider's ask is never served by the train ahead", () => {
  const w = awake('trains-on');
  // B rides down to the village and out again behind A; its rider asks for the quarry up while A is still short of it.
  until(w, () => row(w, A).phase === TRAIN_PHASE.RUN && row(w, A).track === 0);
  assert.ok(TRAIN_STOPS[LINE2]![1]! - along(w, A) > BRAKE + 400, 'A could still brake for it');
  assert.equal(act(w, 'a', 'rail.call', { id: QUARRY, dir: 1, train: A + 1 }), 0, 'not on B: its way is down');
  until(w, () => row(w, B).track === 0);
  const a0 = stands(w, A, 1);
  assert.deepEqual(a0, []);
  assert.equal(act(w, 'a', 'rail.call', { id: QUARRY, dir: 1, train: B }), 1, "B's rider asks");
  assert.equal(act(w, 'a', 'rail.call', { id: QUARRY, dir: 1, train: 0 }), 0, "line 1's train is not on line 2");
  assert.equal(act(w, 'a', 'rail.call', { id: QUARRY, dir: 1, train: 9 }), 0, 'no such train');
  // A goes through the quarry; B stops there.
  for (let t = 0; t < 3000 && !standing(w, B, 1, 1)(); t++) {
    step(w);
    assert.ok(!standing(w, A, 1)(), 'the train ahead never stops for it');
  }
  assert.ok(standing(w, B, 1, 1)(), 'B stops at the quarry');
  until(w, () => row(w, B).phase === TRAIN_PHASE.RUN);
  assert.equal(row(w, B).req, 0, 'served as it left');
});

// ---------------------------------------------------------------- holds: the end block, its signal, the headway
/** A at the village (in its end block) leaving `delay` ticks from now; B leaving the quarry down now, toward the village. */
function blocked(delay: number) {
  const w = awake('trains-on');
  place(w, [
    { k: A, stop: 0, track: 0, depart: w.t + delay - TRAIN.dwellTicks },
    { k: B, stop: 1, track: 1, depart: w.t - TRAIN.dwellTicks },
  ]);
  step(w);
  assert.equal(row(w, B).phase, TRAIN_PHASE.RUN);
  assert.deepEqual([row(w, B).to, row(w, B).dest], [-1, 6300], "B's leg ends at the village block's signal");
  return w;
}
test('a train held at a signal leaves the tick the block clears; the end block holds one train', () => {
  const w = blocked(200);
  until(w, standing(w, B, -1));
  const st = trainStops(w.s, LINE2);
  for (let t = 0; row(w, B).phase === TRAIN_PHASE.STAND; t++) {
    assert.ok(t < 600);
    assert.equal(blockFree(rows(w), LINE2, st, B, 1, st[0]!, w.t), false, 'still standing only while blocked');
    step(w);
  }
  // The tick it left, the block (and the gap behind A) had just cleared.
  assert.deepEqual([row(w, B).at, row(w, B).to, row(w, B).depart], [-1, 0, w.t]);
  assert.ok(along(w, A) >= st[0]! + TRAIN.sepCm, 'A is a gap clear of the village');
  until(w, standing(w, B, 0, 1));
  assert.equal(invariant(w.s), null);
});
test('a held leg lengthens without a jump once the train ahead moves on', () => {
  const w = blocked(30);
  let lengthened = false;
  for (let t = 0; t < 400 && !lengthened; t++) {
    const was = { ...row(w, B) };
    step(w); // checks the pose is continuous
    if (was.to === -1 && row(w, B).to === 0) {
      lengthened = true;
      assert.equal(row(w, B).phase, TRAIN_PHASE.RUN, 'still running: lengthened, not stopped');
      assert.equal(row(w, B).from, trainAlong(was, LINE2, w.t), 'from where it was');
      assert.ok(Math.abs(row(w, B).v0 - trainSpeed(was, LINE2, w.t)) <= 1, 'at the speed it had');
    }
  }
  assert.ok(lengthened);
  until(w, standing(w, B, 0, 1));
});
for (const pct of [100, TRAIN_HEAD_PCT])
  test(`the headway hold spaces two trains that started together (${pct}%)`, () => {
    const w = awake('q6-done', false);
    place(w, [
      { k: A, stop: 0, track: 0, depart: w.t - TRAIN.dwellTicks },
      { k: B, stop: -1, track: 1, depart: w.t, s: 6300 },
    ]);
    const st = trainStops(w.s, LINE2),
      half = cycleTicks(LINE2, st) / 2,
      head = headTicks(LINE2, st, pct);
    const left: number[] = [];
    let last = w.s.lines[LINE2]!.left0;
    for (let t = 0; left.length < 7; t++) {
      assert.ok(t < 20000);
      step(w, pct);
      const now = w.s.lines[LINE2]!.left0;
      if (now !== last) left.push(now);
      last = now;
    }
    // Departures from the village alternate A, B; after three laps each gap is as the hold sets it.
    const gaps = left.slice(-2).map((v, k) => v - left.at(-3 + k)!);
    if (pct === 100) for (const g of gaps) assert.ok(Math.abs(g - half) <= TRAIN.dwellTicks, `${g} vs ${half}`);
    else {
      assert.ok(Math.min(...gaps) >= head, `${gaps} at least ${head}`);
      assert.ok(Math.min(...gaps) <= head + TRAIN.dwellTicks, `${gaps}: the follower stays at the hold`);
    }
  });
test('the wagon train is never held for headway while the pier owes footings', () => {
  const w = railwayAtWorks('wagon-on');
  const k = LINE_SLOTS[LINE2]!.find((s) => row(w, s).wagon)!;
  let ends = 0;
  for (let t = 0; t < 4000 && ends < 3; t++) {
    const r = row(w, k),
      st = trainStops(w.s, LINE2);
    // Whenever it stands at an end, make the hold as long as it can be: someone just left.
    if (r.phase === TRAIN_PHASE.STAND && (r.at === 0 || r.at === st.length - 1) && w.t === r.depart) {
      edit(w.s, (e) => Object.assign(e.mut(Line, e.lookup(Line, LINE2)!)!, { left0: w.t, left1: w.t }));
      ends++;
    }
    const due = r.phase === TRAIN_PHASE.STAND && r.at >= 0 && w.t + 1 >= r.depart + TRAIN.dwellTicks;
    advanceWorks(w, 1);
    if (due && w.s.works!.pierSet < WORKS.pier && row(w, k).phase === TRAIN_PHASE.STAND && row(w, k).at >= 0) {
      const st2 = trainStops(w.s, LINE2),
        free = blockFree(rows(w), LINE2, st2, k, row(w, k).track, row(w, k).from + 1, w.t);
      assert.ok(!free || row(w, k).at === 0, `held at ${row(w, k).at} (tick ${w.t})`);
    }
  }
  assert.ok(ends >= 2);
  assert.equal(invariant(w.s), null);
});
test('opening the pier mid-run moves no train', () => {
  const w = railwayAtTrains('q6-finishing');
  while (line2Completed(w.s) < 6) {
    const before = w.s.trains.map((r) => ({ ...r }));
    step(w);
    // At the tick the pier opens (and every tick), the rows give the pose the old rows gave.
    w.s.trains.forEach((r, k) =>
      assert.equal(trainAlong(r, RAIL_TRAINS[k]!.line, w.t), trainAlong(before[k]!, RAIL_TRAINS[k]!.line, w.t)),
    );
  }
  assert.equal(trainStops(w.s, LINE2).length, 4);
  assert.ok(
    w.s.trains.some((r) => r.phase === TRAIN_PHASE.RUN),
    'a train was under way',
  );
  until(w, () => LINE_SLOTS[LINE2]!.some((k) => standing(w, k, 3)()), 3000);
  assert.equal(invariant(w.s), null);
});
test('a train bound for Far Head as its end when the pier opens still stops there once, then runs to the pier', () => {
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.s) < 6) railTick(probe.s, ++probe.t);
  const w = unaudited(base);
  while (w.t < probe.t - 5) step(w);
  // Train A runs up toward Far Head's crossover, short of it, bound for Far Head as the line's end; B stands at the
  // village. (One already on the crossover turns back there: review-v26.test.ts.)
  edit(w.s, (e) => {
    Object.assign(e.mut(Train, e.lookup(Train, A)!)!, {
      phase: TRAIN_PHASE.RUN,
      at: 1,
      to: 2,
      track: 0,
      depart: w.t,
      req: 0,
      from: 44000,
      v0: 0,
      dest: TRAIN_STOPS[LINE2]![2]!,
    });
    Object.assign(e.mut(Train, e.lookup(Train, B)!)!, {
      phase: TRAIN_PHASE.STAND,
      at: 0,
      to: 0,
      track: 0,
      depart: w.t,
      req: 0,
      from: TRAIN_STOPS[LINE2]![0]!,
      v0: 0,
      dest: TRAIN_STOPS[LINE2]![0]!,
    });
  });
  until(w, () => line2Completed(w.s) >= 6, 50);
  assert.equal(row(w, A).to, 2, 'still bound for Far Head');
  until(w, standing(w, A, 2, 1), 600);
  until(w, standing(w, A, 3), 1200);
  assert.equal(invariant(w.s), null);
});
test("Far Head's up lever is refused while Far Head is the end; the pier's the way in, always", () => {
  const w = awake('trains-on');
  const farHead = haltId(LINE2, 2),
    pier = haltId(LINE2, 3),
    village = haltId(LINE2, 0);
  assert.equal(lever(w, farHead, 1), 0, 'no train stands at the up platform before the pier opens');
  assert.equal(lever(w, farHead, -1), 1);
  assert.equal(lever(w, pier, -1), 0, 'no pier halt before Q6');
  assert.equal(lever(w, village, -1), 0, "the village's way in");
  const done = awake('q6-done');
  assert.equal(lever(done, farHead, 1), 1, 'a middle halt once the pier is open');
  assert.equal(lever(done, pier, 1), 0, "the pier's way in");
  assert.equal(lever(done, pier, -1), 1);
  assert.equal(circuitLen(trainStops(done.s, LINE2)), 2 * (TRAIN_STOPS[LINE2]![3]! - TRAIN_STOPS[LINE2]![0]!));
  assert.equal(RAIL_LINES[LINE2]!.trains, 2);
});

// ---------------------------------------------------------------- v27's rules on the fixture line (R3a)
// docs/plans/ring-island-build1.md, R3a: the island terminus, the moving end and stop, the homeward-only Pier and three
// trains, on test/helpers/railway-v27-line.ts's line (R3b puts its row in the catalog with the WORLD_NS bump). Pure
// rows over a pure TrainIO; FUZZ_TICKS lengthens the fuzzes as above.
const V = V27_LINE2;
const PIER = 3,
  HEAD = 4,
  ISLAND = 5;
const alongF = (f: FixtureLine, k: number, t: number) => trainAlong(f.rows[k]!, f.line, t);
/** One tick of the fixture line, checking every pose stays continuous, the spacing and the load check. */
function stepF(f: FixtureLine, t: number) {
  const before = f.rows.map((_r, k) => alongF(f, k, t - 1));
  trainStepLine(f.io(), f.line, t);
  f.rows.forEach((_r, k) =>
    assert.ok(Math.abs(alongF(f, k, t) - before[k]!) <= TRAIN.speed + 1, `fixture train ${k} jumps at ${t}`),
  );
  assert.equal(
    lineSpacing((k) => f.rows[k]!, f.line, f.stops, t),
    null,
    `fixture spacing at ${t}`,
  );
  assert.equal(f.broken(), null, `fixture rows at ${t}`);
}
const runRow = (from: number, to: number, dest: number, depart: number, track = 0, v0 = 0): RailTrain => ({
  ...standingAt([from], 0, track, depart),
  phase: TRAIN_PHASE.RUN,
  at: -1,
  to,
  dest,
  v0,
});
const standF = (f: FixtureLine, k: number, stop: number, track?: number) => {
  const r = f.rows[k]!;
  return r.phase === TRAIN_PHASE.STAND && r.at === stop && (track === undefined || r.track === track);
};

test('the fixture line: three trains, a 1173 m line, 138.8 s round, 462 ticks apart evenly', () => {
  const joined = v27Stops(7, 7, true);
  assert.equal(cycleTicks(V, joined), 1388);
  assert.equal(Math.floor(cycleTicks(V, joined) / 3), 462);
  assert.equal(headTicks(V, joined), Math.floor((1388 * TRAIN_HEAD_PCT) / 300));
  const [, island] = endBlocks(V, joined);
  assert.deepEqual([island.from, island.to, island.signal], [113700, 119000, 113080]);
  // The railhead's block and signal follow its stop: at bent 6 and at bent 13, its end in turn.
  const [, at6] = endBlocks(V, v27Stops(7, 0)),
    [, at13] = endBlocks(V, v27Stops(7, 7));
  assert.deepEqual([at6.from, at6.to, at6.signal], [81200, 85200, 80580]);
  assert.deepEqual([at13.from, at13.to, at13.signal], [95200, 99200, 94580]);
  // v26's ends are unmoved (no halt of the catalog has heads).
  assert.deepEqual(endBlocks(LINE2, TRAIN_STOPS[LINE2]!), endBlocks(V, v27Stops(6)));
});

test('an up train into the open island stands at 119000 on its row alone, turns onto the down track and leaves', () => {
  const stops = v27Stops(7, 7, true);
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, HEAD, 0), standingAt(stops, 1, 1), standingAt(stops, 0, 0)];
  let t = 0;
  for (; !standF(f, 0, ISLAND); t++) {
    assert.ok(t < 2000, 'arrives');
    stepF(f, t + 1);
    const r = f.rows[0]!;
    // The pose is the row's: from, dest and the leg, never a stop table; it crosses nothing on its way in.
    if (r.phase === TRAIN_PHASE.RUN) assert.ok(r.to === ISLAND && r.dest === 119000 && r.track === 0);
  }
  assert.equal(f.rows[0]!.from, 119000);
  assert.equal(f.rows[0]!.track, 1, 'flipped to the down track at the buffers');
  for (; f.rows[0]!.phase === TRAIN_PHASE.STAND; t++) {
    assert.ok(t < 4000, 'leaves');
    stepF(f, t + 1);
  }
  assert.equal(f.rows[0]!.track, 1);
  assert.ok(f.rows[0]!.dest < 119000, 'homeward');
});

test("a second up train holds at the island's signal (113080) until the first is out of its block", () => {
  const stops = v27Stops(7, 7, true);
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, ISLAND, 1, 0), standingAt(stops, HEAD, 0, 0), standingAt(stops, 0, 0)];
  f.lineRow = { req: 0, left0: -1, left1: 0 };
  const [, block] = endBlocks(V, stops);
  let held = false;
  for (let t = 1; !standF(f, 1, ISLAND); t++) {
    assert.ok(t < 4000, 'B reaches the island');
    stepF(f, t);
    const b = f.rows[1]!;
    if (b.to === -1 && b.dest === 113080) held = true;
    const aIn = alongF(f, 0, t) + TRAIN_EXTENT.aheadCm > block.from;
    if (aIn)
      assert.ok(alongF(f, 1, t) + TRAIN_EXTENT.aheadCm <= block.from, `B is out of the block while A is in (${t})`);
  }
  assert.ok(held, 'B was held at the signal');
});

test("endMoved at Far Head is v26's Q6 hunk, row for row, on the world", () => {
  const base = worldAtTrains('q6-finishing');
  const probe = { w: worldRestore(base.w), t: base.t };
  while (qCompleted(probe.w) < 6) worldTick(probe.w, ++probe.t);
  let turned = 0,
    asked = 0;
  for (const from of [40000, 46000, 48300, 48380, 48381, 48500, 50000, 52000]) {
    const w = worldRestore(base.w);
    for (let t = base.t + 1; t < probe.t; t++) worldTick(w, t);
    // A runs up to Far Head as the line's end, its nose `from` + 6.2 m at the opening tick; B stands at the village.
    Object.assign(w.mut(Train, trainId(w, A))!, runRow(from, 2, 52400, probe.t));
    Object.assign(w.mut(Train, trainId(w, A))!, { at: 1 });
    Object.assign(w.mut(Train, trainId(w, B))!, standingAt(TRAIN_STOPS[LINE2]!, 0, 0, probe.t));
    const pre = [train(w, A), train(w, B)].map((r) => ({ ...r }));
    worldTick(w, probe.t);
    assert.equal(qCompleted(w), 6, 'the pier opened this tick');
    const out = [...pre];
    endMoved(
      {
        row: (k) => out[k - A]!,
        set: (k, p) => void (out[k - A] = { ...out[k - A]!, ...p }),
        stops: () => stopsOf(w, LINE2),
      },
      LINE2,
      2,
      probe.t,
    );
    assert.deepEqual({ ...train(w, A) }, out[0], `A from ${from}`);
    assert.deepEqual({ ...train(w, B) }, out[1], `B, A from ${from}`);
    if (out[0]!.turn) turned++;
    else if (out[0]!.req) asked++;
  }
  assert.ok(turned >= 3 && asked >= 3, `${turned} turned, ${asked} asked`);
});

test("at Q7 a train past the Pier stub's turnout (s 536 m) turns back there; one short runs on with no Pier stop", () => {
  for (const [from, turns] of [
    [52000, false],
    [52979, false],
    [52981, true],
    [60000, true],
  ] as const) {
    const q6 = v27Stops(6),
      q7 = v27Stops(7, 0);
    const f = new FixtureLine(q6);
    f.rows = [runRow(from, PIER, 72650, 0), standingAt(q6, 0, 0), standingAt(q6, 1, 1)];
    f.rows[0] = { ...f.rows[0]!, at: 2 };
    f.stops = q7;
    endMoved(f.io(), V, PIER, 0);
    assert.equal(f.rows[0]!.turn, turns, `from ${from}`);
    assert.equal(f.rows[0]!.req, 0, 'no courtesy stop at a homeward-only halt');
    assert.equal(f.broken(), null);
    const goal = turns ? PIER : HEAD;
    for (let t = 1; !standF(f, 0, goal); t++) {
      assert.ok(t < 3000, `reaches ${goal}`);
      assert.ok(!standF(f, 0, PIER, 0), 'never stands at the Pier going up');
      stepF(f, t);
    }
    assert.equal(f.rows[0]!.track, 1, turns ? 'turned onto the down track at the pier' : 'turned at the railhead');
  }
});

test("on the rivet a train past the railhead stub's turnout turns back; one short stops there once and runs on", () => {
  for (const [from, turns] of [
    [90000, false],
    [94579, false],
    [94581, true],
    [97000, true],
  ] as const) {
    const before = v27Stops(7, 7),
      joined = v27Stops(7, 7, true);
    const f = new FixtureLine(before);
    f.rows = [runRow(from, HEAD, 99200, 0), standingAt(before, 0, 0), standingAt(before, 1, 1)];
    f.rows[0] = { ...f.rows[0]!, at: PIER };
    f.stops = joined;
    endMoved(f.io(), V, HEAD, 0);
    assert.equal(f.rows[0]!.turn, turns, `from ${from}`);
    assert.equal(reqHas(f.rows[0]!.req, HEAD, 1, joined.length), !turns, 'one stop there if it runs on');
    assert.equal(f.broken(), null);
    let t = 1;
    for (; !standF(f, 0, HEAD); t++) {
      assert.ok(t < 3000, 'reaches the railhead');
      stepF(f, t);
    }
    assert.equal(f.rows[0]!.track, turns ? 1 : 0, turns ? 'turned back' : 'stands on the up track, to go on');
    if (!turns) {
      for (; !standF(f, 0, ISLAND); t++) {
        assert.ok(t < 4000);
        stepF(f, t);
      }
    }
  }
});

test("stopMoved over the railhead's seven advances moves no pose; a standing train is at a signal, a running one bound on", () => {
  for (const running of [false, true]) {
    let stops = v27Stops(7, 0);
    const f = new FixtureLine(stops);
    f.rows = [
      running ? { ...runRow(76000, HEAD, stops[HEAD]!, 0), at: PIER } : standingAt(stops, HEAD, 1, 0),
      standingAt(stops, 0, 0),
      standingAt(stops, 1, 1),
    ];
    let t = 0;
    for (let k = 1; k <= 7; k++) {
      t += running ? 12 : 30;
      const r0 = f.rows.map((r) => ({ ...r })),
        poses = f.rows.map((_r, j) => alongF(f, j, t));
      stops = v27Stops(7, k);
      f.stops = stops;
      stopMoved(f.io(), V, HEAD, t);
      f.rows.forEach((_r, j) => assert.equal(alongF(f, j, t), poses[j], `head ${k}: train ${j} did not move`));
      const r = f.rows[0]!;
      if (r0[0]!.phase === TRAIN_PHASE.STAND && r0[0]!.at === HEAD) assert.ok(r.at === -1 && r.to === -1);
      if (r0[0]!.phase === TRAIN_PHASE.RUN && r0[0]!.to === HEAD) assert.ok(r.to === HEAD && r.dest === stops[HEAD]);
      assert.equal(f.broken(), null, `head ${k}`);
      assert.deepEqual(f.rows.slice(1), r0.slice(1), 'the others untouched');
    }
    if (running) {
      for (t++; !standF(f, 0, HEAD); t++) {
        assert.ok(t < 2000);
        stepF(f, t);
      }
      assert.equal(f.rows[0]!.from, 99200, 'stands at the railhead at bent 13');
    }
  }
});

/** The fixture line under random lever and rider asks and restores from `stops0`; `stage(t)` may move it on. */
function fixtureFuzz(
  seed: number,
  headPct: number,
  stops0: readonly number[],
  ticks: number,
  stage?: (f: FixtureLine, t: number, rand: () => number) => void,
  line = V,
) {
  let f = new FixtureLine(stops0, 0, headPct, line);
  const rand = mulberry32(seed);
  const asked = new Map<string, number>(),
    worst = new Map<string, number>(),
    riderAsk = new Map<string, number>(),
    riderWorst = new Map<string, number>();
  let restores = 0;
  for (let t = 1; t <= ticks; t++) {
    stage?.(f, t, rand);
    const n = f.stops.length;
    // As v26's fuzz: the asks start once the trains are awake.
    if (t <= TRAIN.wakeTicks) {
      stepF(f, t);
      continue;
    }
    if (rand() < 0.05) {
      const stop = Math.floor(rand() * n),
        dir = rand() < 0.5 ? -1 : 1;
      if (f.call(stop, dir, t) && !asked.has(`${stop}/${dir}`)) asked.set(`${stop}/${dir}`, t);
    }
    if (rand() < 0.03 && n > 2) {
      const slot = Math.floor(rand() * f.rows.length),
        stop = 1 + Math.floor(rand() * (n - 2));
      if (f.call(stop, trainDir(f.rows[slot]!), t, slot) && !riderAsk.has(`${slot}/${stop}`))
        riderAsk.set(`${slot}/${stop}`, t);
    }
    stepF(f, t);
    for (const [key, since] of asked) {
      const [stop, dir] = key.split('/').map(Number) as [number, number];
      if (f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === stop && trainDir(r) === dir)) {
        worst.set(key, Math.max(worst.get(key) ?? 0, t - since));
        asked.delete(key);
      }
    }
    for (const [key, since] of riderAsk) {
      const [slot, stop] = key.split('/').map(Number) as [number, number];
      const r = f.rows[slot]!;
      if (r.phase === TRAIN_PHASE.STAND && r.at === stop) {
        riderWorst.set(key, Math.max(riderWorst.get(key) ?? 0, t - since));
        riderAsk.delete(key);
      } else if (r.at === 0 || r.at === f.stops.length - 1) riderAsk.delete(key);
    }
    if (rand() < 0.002) {
      const next = new FixtureLine(f.stops, f.awake, headPct, line);
      next.rows = f.rows;
      next.lineRow = f.lineRow;
      next.restore();
      f = next;
      restores++;
    }
  }
  for (const [key, since] of asked) worst.set(key, Math.max(worst.get(key) ?? 0, ticks - since));
  return { f, worst, riderWorst, restores };
}
const waitTable = (worst: Map<string, number>) =>
  [...worst]
    .sort(([p], [q]) => (p < q ? -1 : 1))
    .map(([key, ticks]) => {
      const [stop, dir] = key.split('/').map(Number) as [number, number];
      return `${V.halts[stop]!.name} ${dir > 0 ? 'up' : 'down'} ${(ticks / 10).toFixed(1)} s`;
    })
    .join('; ');

/** The island fuzz's seeds (v26's two by default; FUZZ_SEEDS=hex,hex,... for the long runs, each at the default hold
 * and at 0%) and train count (FUZZ_TRAINS: the fixture's 3, or 4 to size the line, call 47). R3a's long runs (10
 * November; FUZZ_TICKS=40000, seeds c0ffee,777,15a4d,5eed,bee at 75% and 0%): three trains do NOT hold WAIT_BOUND
 * (worst 137.9 s; 8 of 10 runs over 105 s), four trains do (worst 98.4 s, all 10 under). By call 47 the catalog goes to
 * four trains: R3b's row (reported to the orchestrator). The default runs pass and print the waits. */
const ISLAND_SEEDS: readonly (readonly [number, number])[] = process.env.FUZZ_SEEDS
  ? process.env.FUZZ_SEEDS.split(',').flatMap((h) => [
      [Number.parseInt(h, 16), TRAIN_HEAD_PCT] as const,
      [Number.parseInt(h, 16), 0] as const,
    ])
  : [
      [0xc0ffee, TRAIN_HEAD_PCT],
      [0x777, 0],
    ];
const ISLAND_LINE = { ...V, trains: Number(process.env.FUZZ_TRAINS ?? V.trains) };
for (const [seed, headPct] of ISLAND_SEEDS)
  test(`fixture fuzz ${seed.toString(16)} at ${headPct}%: ${ISLAND_LINE.trains} trains to the open island, the worst wait each way`, (t) => {
    const { worst, riderWorst, restores } = fixtureFuzz(
      seed,
      headPct,
      v27Stops(7, 7, true),
      FUZZ_TICKS,
      undefined,
      ISLAND_LINE,
    );
    t.diagnostic(`${FUZZ_TICKS} ticks; restores ${restores}`);
    t.diagnostic(`worst lever waits: ${waitTable(worst)}`);
    t.diagnostic(`worst rider waits (slot/stop): ${[...riderWorst].map(([k, v]) => `${k} ${v / 10} s`).join('; ')}`);
    for (const [key, ticks] of worst)
      assert.ok(ticks <= WAIT_BOUND, `${key}: waited ${ticks} ticks (bound ${WAIT_BOUND})`);
    // The Pier's up way is never asked: the lever refuses it.
    assert.ok(![...worst.keys()].includes(`${PIER}/1`));
  });

for (const seed of [0x5eed, 0xbee])
  test(`fixture fuzz ${seed.toString(16)}: Q7, the railhead's seven bents and the rivet under random asks; no up train stands at the Pier after Q7`, (t) => {
    const at = { q7: 400 + (seed % 300), heads: [] as number[], rivet: 0 };
    for (let k = 1; k <= 7; k++) at.heads.push(at.q7 + 250 * k + ((seed >> k) % 120));
    at.rivet = at.heads[6]! + 400;
    let head = 0,
      q7 = false,
      upAtPier = 0,
      atIsland = 0;
    const { f } = fixtureFuzz(seed, TRAIN_HEAD_PCT, v27Stops(6), Math.max(FUZZ_TICKS, at.rivet + 2000), (f, tick) => {
      if (q7 && f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === PIER && r.track === 0)) upAtPier++;
      if (tick > at.rivet && f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === ISLAND)) atIsland++;
      if (tick === at.q7) {
        f.stops = v27Stops(7, 0);
        endMoved(f.io(), V, PIER, tick);
        q7 = true;
      }
      if (at.heads[head] === tick) {
        head++;
        f.stops = v27Stops(7, head);
        stopMoved(f.io(), V, HEAD, tick);
      }
      if (tick === at.rivet) {
        f.stops = v27Stops(7, 7, true);
        endMoved(f.io(), V, HEAD, tick);
      }
      assert.equal(f.broken(), null, `after the stage at ${tick}`);
    });
    t.diagnostic(`Q7 at ${at.q7}, bents at ${at.heads.join(', ')}, rivet at ${at.rivet}`);
    assert.equal(upAtPier, 0, 'no up train stood at the Pier once Q7 was laid');
    assert.deepEqual(f.stops, v27Stops(7, 7, true));
    assert.ok(atIsland > 0, 'trains stood at the island after the rivet');
  });
