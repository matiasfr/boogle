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
  reqAdd,
  reqHas,
  trainAlong,
  trainLegTicks,
  trainDir,
  trainSpeed,
  type RailTrain,
} from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  TRAIN_HEAD_PCT,
  balancedHold,
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
} from '../src/sim/railway-trains.ts';
import { line2Completed } from '../src/sim/railway-queries-line2.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { Line, Train } from '../src/sim/railway-components.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { footingTotal } from '../src/sim/railway-queries-works.ts';
import { FixtureLine, LINE2_ROWS, standingAt, line2Stops } from './helpers/rail-rows.ts';
import {
  act,
  advanceWorks,
  buildSeedWorld,
  check,
  invariant,
  line as lineRow,
  qCompleted,
  railTick,
  railwayAtTrains,
  railwayAtWorks,
  restore,
  shed as shedRow,
  stopsOf,
  train,
  trainId,
  trains,
  unaudited,
  works as worksRow,
  type Seed,
} from './helpers/rail.ts';
import { FUZZ_LIGHT as LIGHT, firstCases, fuzzSeeds, fuzzTicks, fuzzTrains } from './helpers/fuzz.ts';

const LINE2 = 1;
/** Line 2's trains: A at the Village (up), B at Far Head (down) and, since v27, C at the Quarry (down). */
const [A, B, C] = LINE_SLOTS[LINE2] as [number, number, number];
const BRAKE = (TRAIN.speed * TRAIN.speed) / (2 * TRAIN.accel);
const rows = (w: Seed) => (k: number) => train(w.w, k);
const stops = (w: Seed) => (line: number) => trainStops(w.w, line);
const row = (w: Seed, k: number) => train(w.w, k);
const along = (w: Seed, k: number, t = w.t) => trainAlong(row(w, k), RAIL_TRAINS[k]!.line, t);
/** A halt's id (rail.call's `id`) by line and stop. */
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const QUARRY = haltId(LINE2, 1);
// The shared seed fixtures are built once a process: here, outside any one test's time.
railwayAtTrains('q6-done');
railwayAtTrains('q6-stocked');
railwayAtTrains('q6-finishing');
railwayAtWorks('wagon-on');
railwayAtWorks('cradle-fitted');
for (const stage of ['crossing-done', 'deck-laid', 'gap-footed', 'ring-joined'] as const) buildSeedWorld(stage);
const lever = (w: Seed, id: number, dir: number) => act(w, 'a', 'rail.call', { id, dir });
/** One rule tick, checking every train's pose stays continuous and the spacing invariants hold. */
function step(w: Seed, headPct = TRAIN_HEAD_PCT) {
  const before = trains(w.w).map((_r, k) => along(w, k, w.t));
  railTick(w.w, ++w.t, headPct);
  trains(w.w).forEach((_r, k) =>
    assert.ok(Math.abs(along(w, k) - before[k]!) <= TRAIN.speed + 1, `train ${k} jumps at tick ${w.t}`),
  );
  const broken = trainSpacing(rows(w), stops(w), w.t);
  assert.equal(broken, null, `tick ${w.t}`);
}
function until(w: Seed, ok: () => boolean, max = 6000, headPct = TRAIN_HEAD_PCT) {
  for (let t = 0; !ok(); t++) {
    assert.ok(t < max, `in time (tick ${w.t})`);
    step(w, headPct);
  }
}
const standing = (w: Seed, k: number, stop: number, dir?: number) => () => {
  const r = row(w, k);
  return r.phase === TRAIN_PHASE.STAND && r.at === stop && (dir === undefined || trainDir(r) === dir);
};
/** Train k's stands over `ticks`: [stop, its way] each (stop -1 a signal). */
function stands(w: Seed, k: number, ticks: number, headPct = TRAIN_HEAD_PCT) {
  const out: [number, number][] = [];
  for (let t = 0; t < ticks; t++) {
    const was = row(w, k).phase;
    step(w, headPct);
    const r = row(w, k);
    if (was === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND) out.push([r.at, trainDir(r)]);
  }
  return out;
}
/** Trains standing where a test puts them, awake, nothing asked, the ends never left. v26's two-train tests also park
 * v27's third train (`parked`): standing at a halt, its dwell never over, out of the way of the two they watch. */
const parked = (stop: number, track: number) => ({ k: C, stop, track, depart: 1e9 });
function place(w: Seed, at: { k: number; stop: number; track: number; depart: number; s?: number }[]) {
  {
    const e = w.w;
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
  }
  assert.equal(invariant(w.w), null);
}
/** A trains-on world past the wake, every train's dwell over. */
function awake(stage: 'trains-on' | 'q6-done' = 'trains-on', audit = true) {
  const seed = railwayAtTrains(stage);
  // The long runs skip the write audit (which re-reads every row each system run): the same rules, unaudited.
  const w = audit ? seed : unaudited(seed);
  for (let t = 0; t < TRAIN.wakeTicks; t++) railTick(w.w, ++w.t);
  return w;
}

// ---------------------------------------------------------------- the catalog's numbers
test("line 2's cycle and headway: 92.4 s to the pier, 72 s before it, 105 s to the Railhead; three trains (v27; the same ticks from v33's 18.25 m stop)", () => {
  const pier = TRAIN_STOPS[LINE2]!.slice(0, 4),
    before = pier.slice(0, 3),
    railhead = line2Stops(7, 0);
  assert.equal(cycleTicks(LINE2, pier), 924);
  assert.equal(headTicks(LINE2, pier), 231);
  assert.equal(cycleTicks(LINE2, before), 722);
  assert.equal(headTicks(LINE2, before), 180);
  assert.equal(cycleTicks(LINE2, railhead), 1050);
  assert.equal(headTicks(0, TRAIN_STOPS[0]!), 0, 'one train: no hold');
  // Line 2's three start spread round the circuit: the Village (up), Far Head (down, its end before the pier) and the
  // Quarry (down).
  assert.deepEqual(trainPlaces(LINE2, before), [
    { stop: 0, track: 0 },
    { stop: 2, track: 1 },
    { stop: 1, track: 1 },
  ]);
  assert.deepEqual(trainPlaces(0, TRAIN_STOPS[0]!), [{ stop: 1, track: 1 }], "line 1's one at Camp, as v25");
  // Every block reaches past its stub's turnout (a crossover's starts at it), and every signal stands on the inbound
  // track outside it by a train's lead, at least a train's gap from the end stop (review of v26, P2-1).
  const [village, farHead] = endBlocks(LINE2, before);
  assert.deepEqual([village.from, village.to, village.signal], [1825, 5400, 6670]);
  assert.deepEqual([farHead.from, farHead.to, farHead.signal], [49000, 52400, 48180]);
  assert.deepEqual(
    endBlocks(LINE2, pier).map((b) => b.signal),
    [6670, 52780],
    "the far end's block moves to the pier's stub",
  );
  assert.deepEqual(
    endBlocks(LINE2, railhead).map((b) => b.signal),
    [6670, 80380],
    "and on to the Railhead's at Q7",
  );
});

// ---------------------------------------------------------------- spacing and the worst wait
/** The worst wait test's flat bound on line 2 (orchestrator, 10 November): 105 s, from the review's long fuzz (91-97
 * s at the default hold over 5 seeds × 40,000 ticks). Two trains do NOT meet the design's one-minute bound under heavy
 * random asks; v27's third train (or an even-spacing hold) is to. */
const WAIT_BOUND = 1050;
const FUZZ_TICKS = fuzzTicks(3000);
/** Q6's kit off the train and its logs and rails into the frame, so the pier opens a few hundred ticks on. */
function fundQ6(w: Seed) {
  assert.equal(act(w, 'a', 'rail.pack'), 1);
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      assert.equal(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
      assert.equal(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
    }
}
// The same fuzz from the stages after the pier's twelfth footing (slice 5 R2b's gate: the Quarry stone stop is on), so
// the worst wait there is judged the WAIT_BOUND way too; its diagnostics give the per-stage figures. leaf-raised's world
// is gap-footed's with the wagon away, the same trains.
const FUZZ_STAGES = ['q6-stocked', 'crossing-done', 'deck-laid', 'gap-footed', 'ring-joined'] as const;
for (const stage of FUZZ_STAGES)
  for (const [seed, headPct] of [
    [0xc0ffee, TRAIN_HEAD_PCT],
    [0x777, 0],
  ] as const)
    test(`fuzz ${seed.toString(16)} at ${headPct}%${stage === 'q6-stocked' ? '' : ` from ${stage}`}: lever and rider asks, the pier at a random tick, restores; the worst wait`, (t) => {
      let w = unaudited(stage === 'q6-stocked' ? railwayAtTrains('q6-stocked') : buildSeedWorld(stage));
      for (let k = 0; k < TRAIN.wakeTicks; k++) railTick(w.w, ++w.t, headPct);
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
        if (k === packAt && stage === 'q6-stocked') fundQ6(w);
        if (pierAt < 0 && line2Completed(w.w) >= 6) pierAt = w.t;
        const n2 = trainStops(w.w, LINE2).length;
        if (LIGHT ? w.t >= nextAsk : rand() < 0.05) {
          nextAsk = w.t + 600 + Math.floor(rand() * 300);
          const id = Math.floor(rand() * RAIL_HALTS.length),
            dir = rand() < 0.5 ? -1 : 1;
          const h = RAIL_HALTS[id]!;
          if (h.stop < trainStops(w.w, h.line).length && lever(w, id, dir) && !asked.has(`${id}/${dir}`))
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
        trains(w.w).forEach((r, slot) => {
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
          } else if (r.at === 0 || r.at === trainStops(w.w, LINE2).length - 1) riderAsk.delete(key); // dropped at a turnback
        }
        if (k % 50 === 0) assert.equal(invariant(w.w), null, `invariant at ${w.t}`);
        if (rand() < 0.002) {
          w = unaudited({ w: restore(w.w), t: w.t });
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
      if (stage === 'q6-stocked') assert.ok(pierAt >= 0, 'the pier opened');
      assert.ok(longest.ticks < 1200, 'no line-2 train stands two minutes');
      assert.equal(invariant(w.w), null);
    });

test('a train held at the old Far Head signal when the pier opens runs signal to signal, a leg the save check takes', () => {
  // The review's P1: the far signal moves out with the pier's stub, so a train standing at Far Head's (48000) plans a
  // leg from one signal to the next (at = to = -1), which the validator must accept: a real, positive leg.
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.w) < 6) railTick(probe.w, ++probe.t);
  const opens = probe.t;
  const w = unaudited(base);
  while (w.t < opens - 10) railTick(w.w, ++w.t);
  {
    const e = w.w;
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
    // v27's third train parked at the Quarry going down, out of the way.
    Object.assign(e.mut(Train, e.lookup(Train, C)!)!, standingAt(TRAIN_STOPS[LINE2]!, 1, 1, 1e9));
    for (const id of e.ids(Line)) Object.assign(e.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  }
  assert.equal(invariant(w.w), null, 'the placed state is valid');
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
      assert.equal(invariant(w.w), null, `tick ${w.t} (pier at ${opens}): ${JSON.stringify(r)}`);
  }
  assert.ok(signalLeg, 'the held train ran a signal-to-signal leg');
  // A zero-length leg is still refused.
  const bad = { ...row(w, B), phase: TRAIN_PHASE.RUN, at: -1, to: -1, from: 48000, dest: 48000 };
  const refused = restore(w.w);
  Object.assign(refused.mut(Train, trainId(refused, B))!, bad);
  assert.match(check(refused) ?? '', /^railway:/, 'the load check refuses it');
});

test("the wagon's twelve footings reach the pier under random asks and restores", (t) => {
  let w = unaudited(railwayAtWorks('cradle-fitted'));
  const rand = mulberry32(0xfee7);
  assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: shedRow(w.w).tableRev }), 1);
  const start = w.t;
  const wagons = new Set<number>();
  for (let guard = 0; worksRow(w.w).pierSet < WORKS.pier; guard++) {
    assert.ok(guard < 20000, `the crossing finishes (pierSet ${worksRow(w.w).pierSet})`);
    if (rand() < 0.05) {
      const id = Math.floor(rand() * RAIL_HALTS.length);
      if (RAIL_HALTS[id]!.stop < trainStops(w.w, RAIL_HALTS[id]!.line).length) lever(w, id, rand() < 0.5 ? -1 : 1);
    }
    if (worksRow(w.w).pierRack > 0) {
      assert.equal(act(w, 'a', 'rail.footTake', { rack: 1 }), 1);
      assert.equal(act(w, 'a', 'rail.footSet', { site: 2 }), 1);
    }
    railTick(w.w, ++w.t);
    assert.equal(footingTotal(w.w), worksRow(w.w).poured, `footings conserved at ${w.t}`);
    trains(w.w).forEach((r, k) => r.wagon && wagons.add(k));
    if (guard % 200 === 0) assert.equal(invariant(w.w), null);
    if (rand() < 0.003) w = unaudited({ w: restore(w.w), t: w.t });
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
  const st = trainStops(w.w, LINE2);
  // The next up train behind A (with three trains, whichever comes round first) is named, not A.
  const next = trainServes(rows(w), LINE2, st, 1, 1, w.t);
  assert.ok(next >= 0 && next !== A, `the next up train, ${next}, is named`);
  // The named train can reach the quarry before A reaches Far Head (C, just short of the village): watch both at once.
  const a: [number, number][] = [];
  let served = false;
  for (let t = 0; t < 3000 && !(served && a.length); t++) {
    const was = row(w, A).phase,
      waiting = standing(w, next, 1, 1)();
    step(w);
    if (was === TRAIN_PHASE.RUN && row(w, A).phase === TRAIN_PHASE.STAND) a.push([row(w, A).at, trainDir(row(w, A))]);
    if (standing(w, next, 1, 1)())
      assert.notEqual(lineRow(w.w, LINE2).req, 0, 'the ask stands until the named train leaves with it');
    if (waiting && row(w, next).phase === TRAIN_PHASE.RUN) {
      served = true;
      assert.equal(lineRow(w.w, LINE2).req, 0, 'served by the named train');
    }
  }
  assert.ok(served, 'the named train stood at the quarry going up and left with the ask');
  assert.deepEqual(a[0], [2, -1], 'A runs through to Far Head');
  assert.equal(invariant(w.w), null);
});
test('a lever ask in time stops the first train; the one behind is not named', () => {
  const w = awake('trains-on');
  until(w, () => row(w, A).phase === TRAIN_PHASE.RUN && row(w, A).track === 0);
  until(w, () => trainSpeed(row(w, A), LINE2, w.t) === TRAIN.speed);
  assert.ok(TRAIN_STOPS[LINE2]![1]! - along(w, A) > BRAKE + 400);
  assert.equal(lever(w, QUARRY, 1), 1);
  assert.equal(trainServes(rows(w), LINE2, trainStops(w.w, LINE2), 1, 1, w.t), A);
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
    parked(2, 1),
  ]);
  step(w);
  assert.equal(row(w, B).phase, TRAIN_PHASE.RUN);
  assert.deepEqual([row(w, B).to, row(w, B).dest], [-1, 6670], "B's leg ends at the village block's signal");
  return w;
}
test('a train held at a signal leaves the tick the block clears; the end block holds one train', () => {
  const w = blocked(200);
  until(w, standing(w, B, -1));
  const st = trainStops(w.w, LINE2);
  for (let t = 0; row(w, B).phase === TRAIN_PHASE.STAND; t++) {
    assert.ok(t < 600);
    assert.equal(blockFree(rows(w), LINE2, st, B, 1, st[0]!, w.t), false, 'still standing only while blocked');
    step(w);
  }
  // The tick it left, the block (and the gap behind A) had just cleared.
  assert.deepEqual([row(w, B).at, row(w, B).to, row(w, B).depart], [-1, 0, w.t]);
  assert.ok(along(w, A) >= st[0]! + TRAIN.sepCm, 'A is a gap clear of the village');
  until(w, standing(w, B, 0, 1));
  assert.equal(invariant(w.w), null);
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
      { k: B, stop: -1, track: 1, depart: w.t, s: 6670 },
    ]);
    // v27: three trains, so an even spacing is a third of the cycle; the balanced hold at the ends evens them too.
    const st = trainStops(w.w, LINE2),
      even = cycleTicks(LINE2, st) / RAIL_LINES[LINE2]!.trains,
      head = headTicks(LINE2, st, pct);
    const left: number[] = [];
    let last = lineRow(w.w, LINE2).left0;
    for (let t = 0; left.length < 7; t++) {
      assert.ok(t < 20000);
      step(w, pct);
      const now = lineRow(w.w, LINE2).left0;
      if (now !== last) left.push(now);
      last = now;
    }
    // Departures from the village take turns; after two laps each gap is at least the hold and about even.
    const gaps = left.slice(-2).map((v, k) => v - left.at(-3 + k)!);
    assert.ok(Math.min(...gaps) >= head - TRAIN.dwellTicks, `${gaps} at least ${head}`);
    for (const g of gaps) assert.ok(Math.abs(g - even) <= TRAIN.dwellTicks, `${g} vs ${even}`);
  });
test('the wagon train is never held for headway while the pier owes footings', () => {
  const w = railwayAtWorks('wagon-on');
  const k = LINE_SLOTS[LINE2]!.find((s) => row(w, s).wagon)!;
  let ends = 0;
  for (let t = 0; t < 4000 && ends < 3; t++) {
    const r = row(w, k),
      st = trainStops(w.w, LINE2);
    // Whenever it stands at an end, make the hold as long as it can be: someone just left.
    if (r.phase === TRAIN_PHASE.STAND && (r.at === 0 || r.at === st.length - 1) && w.t === r.depart) {
      Object.assign(w.w.mut(Line, w.w.lookup(Line, LINE2)!)!, { left0: w.t, left1: w.t });
      ends++;
    }
    const due = r.phase === TRAIN_PHASE.STAND && r.at >= 0 && w.t + 1 >= r.depart + TRAIN.dwellTicks;
    advanceWorks(w, 1);
    if (due && worksRow(w.w).pierSet < WORKS.pier && row(w, k).phase === TRAIN_PHASE.STAND && row(w, k).at >= 0) {
      const st2 = trainStops(w.w, LINE2),
        free = blockFree(rows(w), LINE2, st2, k, row(w, k).track, row(w, k).from + 1, w.t);
      assert.ok(!free || row(w, k).at === 0, `held at ${row(w, k).at} (tick ${w.t})`);
    }
  }
  assert.ok(ends >= 2);
  assert.equal(invariant(w.w), null);
});
test('opening the pier mid-run moves no train', () => {
  const w = railwayAtTrains('q6-finishing');
  while (line2Completed(w.w) < 6) {
    const before = trains(w.w).map((r) => ({ ...r }));
    step(w);
    // At the tick the pier opens (and every tick), the rows give the pose the old rows gave.
    trains(w.w).forEach((r, k) =>
      assert.equal(trainAlong(r, RAIL_TRAINS[k]!.line, w.t), trainAlong(before[k]!, RAIL_TRAINS[k]!.line, w.t)),
    );
  }
  assert.equal(trainStops(w.w, LINE2).length, 4);
  assert.ok(
    trains(w.w).some((r) => r.phase === TRAIN_PHASE.RUN),
    'a train was under way',
  );
  until(w, () => LINE_SLOTS[LINE2]!.some((k) => standing(w, k, 3)()), 3000);
  assert.equal(invariant(w.w), null);
});
test('a train bound for Far Head as its end when the pier opens still stops there once, then runs to the pier', () => {
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.w) < 6) railTick(probe.w, ++probe.t);
  const w = unaudited(base);
  while (w.t < probe.t - 5) step(w);
  // Train A runs up toward Far Head's crossover, short of it, bound for Far Head as the line's end; B stands at the
  // village. (One already on the crossover turns back there: review-v26.test.ts.)
  {
    const e = w.w;
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
    // v27's third train parked at the Quarry going down, out of the way.
    Object.assign(e.mut(Train, e.lookup(Train, C)!)!, standingAt(TRAIN_STOPS[LINE2]!, 1, 1, 1e9));
  }
  until(w, () => line2Completed(w.w) >= 6, 50);
  assert.equal(row(w, A).to, 2, 'still bound for Far Head');
  until(w, standing(w, A, 2, 1), 600);
  until(w, standing(w, A, 3), 1200);
  assert.equal(invariant(w.w), null);
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
  assert.equal(circuitLen(trainStops(done.w, LINE2)), 2 * (TRAIN_STOPS[LINE2]![3]! - TRAIN_STOPS[LINE2]![0]!));
  assert.equal(RAIL_LINES[LINE2]!.trains, 3);
});

// ---------------------------------------------------------------- v27's rules on the fixture line (R3a)
// docs/plans/ring-island-build1.md, R3a: the island terminus, the moving end and stop, the homeward-only Pier and three
// trains, on test/helpers/railway-v27-line.ts's line (R3b puts its row in the catalog with the WORLD_NS bump). Pure
// rows over a pure TrainIO; FUZZ_TICKS lengthens the fuzzes as above.
const V = LINE2_ROWS;
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
  const joined = line2Stops(7, 7, true);
  assert.equal(cycleTicks(V, joined), 1388);
  assert.equal(Math.floor(cycleTicks(V, joined) / 3), 462);
  assert.equal(headTicks(V, joined), Math.floor((1388 * TRAIN_HEAD_PCT) / 300));
  const [, island] = endBlocks(V, joined);
  assert.deepEqual([island.from, island.to, island.signal], [113700, 119000, 112880]);
  // The railhead's block and signal follow its stop: at bent 6 and at bent 13, its end in turn.
  const [, at6] = endBlocks(V, line2Stops(7, 0)),
    [, at13] = endBlocks(V, line2Stops(7, 7));
  assert.deepEqual([at6.from, at6.to, at6.signal], [81200, 85200, 80380]);
  assert.deepEqual([at13.from, at13.to, at13.signal], [95200, 99200, 94380]);
  // v26's ends are unmoved at Q6 (the catalog's line and its copy, the same row).
  assert.deepEqual(endBlocks(LINE2, TRAIN_STOPS[LINE2]!.slice(0, 4)), endBlocks(V, line2Stops(6)));
});

test('an up train into the open island stands at 119000 on its row alone, turns onto the down track and leaves', () => {
  const stops = line2Stops(7, 7, true);
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

test("a second up train holds at the island's signal (112880) until the first is out of its block", () => {
  const stops = line2Stops(7, 7, true);
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, ISLAND, 1, 0), standingAt(stops, HEAD, 0, 0), standingAt(stops, 0, 0)];
  f.lineRow = { req: 0, left0: -1, left1: 0 };
  const [, block] = endBlocks(V, stops);
  let held = false;
  for (let t = 1; !standF(f, 1, ISLAND); t++) {
    assert.ok(t < 4000, 'B reaches the island');
    stepF(f, t);
    const b = f.rows[1]!;
    if (b.to === -1 && b.dest === 112880) held = true;
    const aIn = alongF(f, 0, t) + TRAIN_EXTENT.aheadCm > block.from;
    if (aIn)
      assert.ok(alongF(f, 1, t) + TRAIN_EXTENT.aheadCm <= block.from, `B is out of the block while A is in (${t})`);
  }
  assert.ok(held, 'B was held at the signal');
});

test('the balanced hold: an end waits while the gap ahead is the shorter, never past its cap or a waiter at its signal', () => {
  const stops = line2Stops(7, 7, true);
  // Train 0 standing at the Village going up, its dwell done; train 1 at Far Head going up (507 m ahead round the
  // circuit), train 2 at the island going down (1173 m behind): the gap ahead is the shorter.
  const f = new FixtureLine(stops);
  f.rows = [standingAt(stops, 0, 0), standingAt(stops, 2, 0), standingAt(stops, ISLAND, 1)];
  const cap = V.balance!;
  assert.equal(cap, 600);
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, 100), true, 'bunched behind train 1: it waits');
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, TRAIN.dwellTicks + cap - 1), true, 'the last tick of its cap');
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, TRAIN.dwellTicks + cap), false, 'the cap: 60 s past its dwell');
  assert.equal(balancedHold(f.io(), { ...V, balance: undefined }, stops, 0, 0, 100), false, 'a line without it');
  assert.equal(balancedHold({ ...f.io(), headExempt: () => true }, V, stops, 0, 0, 100), false, 'the wagon, exempt');
  // The gap behind the shorter (train 2 just round the Far Head side of the island): it goes.
  f.rows[1] = standingAt(stops, HEAD, 1);
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, 100), false, 'even or behind: no hold');
  // A train waiting at the Village's signal on the down track is never kept out of the end block, even bunched.
  const sig = endBlocks(V, stops)[0].signal;
  f.rows = [
    standingAt(stops, 0, 0),
    { ...runRow(1700, -1, 1700 + 2800, 0), from: 1700 + 2800, phase: TRAIN_PHASE.STAND, v0: 0 },
    { ...standingAt([sig], 0, 1), at: -1, to: -1 },
  ];
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, 100), false, 'a waiter behind at the signal');
  f.rows[2] = standingAt(stops, ISLAND, 1);
  assert.equal(balancedHold(f.io(), V, stops, 0, 0, 100), true, 'the same gap ahead with no waiter: it waits');
  // In the step: held while bunched, gone the tick its cap runs out.
  const g = new FixtureLine(stops);
  g.rows = [standingAt(stops, 0, 0), standingAt(stops, 2, 0, 1e6), standingAt(stops, ISLAND, 1, 1e6)];
  trainStepLine(g.io(), V, 100);
  assert.equal(g.rows[0]!.phase, TRAIN_PHASE.STAND);
  trainStepLine(g.io(), { ...V, balance: undefined }, 100);
  assert.equal(g.rows[0]!.phase, TRAIN_PHASE.RUN, 'without the hold it leaves');
});

test("endMoved at Far Head is v26's Q6 hunk, row for row, on the world", () => {
  const base = railwayAtTrains('q6-finishing');
  const probe = { w: restore(base.w), t: base.t };
  while (qCompleted(probe.w) < 6) railTick(probe.w, ++probe.t);
  let turned = 0,
    asked = 0;
  for (const from of [40000, 46000, 48100, 48180, 48181, 48500, 50000, 52000]) {
    const w = restore(base.w);
    for (let t = base.t + 1; t < probe.t; t++) railTick(w, t);
    // A runs up to Far Head as the line's end, its nose `from` + 8.2 m at the opening tick; B stands at the village.
    Object.assign(w.mut(Train, trainId(w, A))!, runRow(from, 2, 52400, probe.t));
    Object.assign(w.mut(Train, trainId(w, A))!, { at: 1 });
    Object.assign(w.mut(Train, trainId(w, B))!, standingAt(TRAIN_STOPS[LINE2]!, 0, 0, probe.t));
    Object.assign(w.mut(Train, trainId(w, C))!, standingAt(TRAIN_STOPS[LINE2]!, 1, 1, 1e9)); // v27's third, parked
    const pre = [train(w, A), train(w, B), train(w, C)].map((r) => ({ ...r }));
    railTick(w, probe.t);
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
    // A train's yard freight and riders (slice 5) are the tick's, not endMoved's: C stands at the Quarry heading home and
    // loads, and riders board and step off where trains stand.
    const moved = (k: number) => ({ ...train(w, k), freight: out[k - A]!.freight, riders: out[k - A]!.riders });
    assert.deepEqual(moved(A), out[0], `A from ${from}`);
    assert.deepEqual(moved(B), out[1], `B, A from ${from}`);
    assert.deepEqual(moved(C), out[2], `C, A from ${from}`);
    if (out[0]!.turn) turned++;
    else if (out[0]!.req) asked++;
  }
  assert.ok(turned >= 3 && asked >= 3, `${turned} turned, ${asked} asked`);
});

test("at Q7 a train past the Pier stub's turnout (s 536 m) turns back there; one short runs on with no Pier stop", () => {
  for (const [from, turns] of [
    [52000, false],
    [52779, false],
    [52781, true],
    [60000, true],
  ] as const) {
    const q6 = line2Stops(6),
      q7 = line2Stops(7, 0);
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
    [94379, false],
    [94381, true],
    [97000, true],
  ] as const) {
    const before = line2Stops(7, 7),
      joined = line2Stops(7, 7, true);
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
    let stops = line2Stops(7, 0);
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
      stops = line2Stops(7, k);
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
 * and at 0%) and train count (FUZZ_TRAINS: the fixture's 3, or 4, call 47). R3a's long runs (10 November;
 * FUZZ_TICKS=40000, seeds c0ffee,777,15a4d,5eed,bee at 75% and 0%, a legal start): three trains at today's hold do NOT
 * hold WAIT_BOUND (worst 130.5 s, 10 of 10 over), four do (98.4 s). The cause is the hold (sized off the non-stop
 * cycle, only a minimum): R3b keeps three trains and adds a balanced hold (the plan's R3b, call 47; the fixture's
 * `balance: 600`). With it (11 November, the same long runs): worst 87.7 s (Quarry up), 0 of 10 over, and the 75% and
 * 0% runs give the same waits (the balanced hold binds before the headway hold does). The default runs pass and print
 * the waits. */
const LONG_SEEDS = fuzzSeeds([]);
const ISLAND_SEEDS: readonly (readonly [number, number])[] = LONG_SEEDS.length
  ? LONG_SEEDS.flatMap((sd) => [[sd, TRAIN_HEAD_PCT] as const, [sd, 0] as const])
  : firstCases([
      [0xc0ffee, TRAIN_HEAD_PCT],
      [0x777, 0],
    ] as const);
const ISLAND_LINE = { ...V, trains: fuzzTrains(V.trains) };
for (const [seed, headPct] of ISLAND_SEEDS)
  test(`fixture fuzz ${seed.toString(16)} at ${headPct}%: ${ISLAND_LINE.trains} trains to the open island, the worst wait each way`, (t) => {
    const { worst, riderWorst, restores } = fixtureFuzz(
      seed,
      headPct,
      line2Stops(7, 7, true),
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

// The same seeds as the island fuzz's long runs (FUZZ_SEEDS, ./helpers/fuzz.ts).
for (const seed of fuzzSeeds([0x5eed, 0xbee]))
  test(`fixture fuzz ${seed.toString(16)}: Q7, the railhead's seven bents and the rivet under random asks; no up train stands at the Pier after Q7`, (t) => {
    const at = { q7: 400 + (seed % 300), heads: [] as number[], rivet: 0 };
    for (let k = 1; k <= 7; k++) at.heads.push(at.q7 + 250 * k + ((seed >> k) % 120));
    at.rivet = at.heads[6]! + 400;
    let head = 0,
      q7 = false,
      upAtPier = 0,
      atIsland = 0;
    const { f } = fixtureFuzz(seed, TRAIN_HEAD_PCT, line2Stops(6), Math.max(FUZZ_TICKS, at.rivet + 2000), (f, tick) => {
      if (q7 && f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === PIER && r.track === 0)) upAtPier++;
      if (tick > at.rivet && f.rows.some((r) => r.phase === TRAIN_PHASE.STAND && r.at === ISLAND)) atIsland++;
      if (tick === at.q7) {
        f.stops = line2Stops(7, 0);
        endMoved(f.io(), V, PIER, tick);
        q7 = true;
      }
      if (at.heads[head] === tick) {
        head++;
        f.stops = line2Stops(7, head);
        stopMoved(f.io(), V, HEAD, tick);
      }
      if (tick === at.rivet) {
        f.stops = line2Stops(7, 7, true);
        endMoved(f.io(), V, HEAD, tick);
      }
      assert.equal(f.broken(), null, `after the stage at ${tick}`);
    });
    t.diagnostic(`Q7 at ${at.q7}, bents at ${at.heads.join(', ')}, rivet at ${at.rivet}`);
    assert.equal(upAtPier, 0, 'no up train stood at the Pier once Q7 was laid');
    assert.deepEqual(f.stops, line2Stops(7, 7, true));
    assert.ok(atIsland > 0, 'trains stood at the island after the rivet');
  });

test('the load check refuses an up train standing at the homeward-only Pier; a leg held onto it ends at no halt', () => {
  const stops = line2Stops(7, 0);
  const f = new FixtureLine(stops);
  assert.equal(f.broken(), null);
  f.rows[0] = standingAt(stops, PIER, 0);
  assert.equal(f.broken(), 'railway: train', 'up at the Pier: no platform');
  f.rows[0] = standingAt(stops, PIER, 1);
  assert.equal(f.broken(), null, 'down at the Pier: its platform');
  // The refused way's asks (test/fixtures/railway-bad-worlds.ts lists them unreachable on today's catalog).
  const n = stops.length;
  f.lineRow = { ...f.lineRow, req: reqAdd(0, PIER, 1, n) };
  assert.equal(f.broken(), 'railway: line', "the Pier's up lever ask");
  f.lineRow = { ...f.lineRow, req: reqAdd(0, PIER, -1, n) };
  assert.equal(f.broken(), null, "its down ask is the lever's");
  f.lineRow = { ...f.lineRow, req: 0 };
  f.rows[1] = { ...runRow(30000, HEAD, stops[HEAD]!, 0), at: 1, req: reqAdd(0, PIER, 1, n) };
  assert.equal(f.broken(), 'railway: rider ask', "an up rider's ask for the Pier");
  f.rows[1] = { ...f.rows[1]!, req: 0 };
  assert.equal(f.broken(), null);
  // A leg still bound for the Pier going up when it ends (endMoved short of the stub, held off every replan by a busy
  // railhead) stands at no halt, as at a signal: its arrival tick is the step's, so no replan runs first.
  f.rows = [{ ...runRow(70000, PIER, 72650, 0), at: 2 }, standingAt(stops, 0, 0), standingAt(stops, 1, 1)];
  f.rows[0] = { ...f.rows[0]!, depart: -trainLegTicks(2650) };
  trainStepLine(f.io(), V, 0);
  const r = f.rows[0]!;
  assert.ok(r.phase === TRAIN_PHASE.STAND && r.at === -1 && r.to === -1 && r.from === 72650, JSON.stringify(r));
  assert.equal(f.broken(), null);
});
