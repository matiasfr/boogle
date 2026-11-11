// Several trains on a line (docs/plans/generic-lines.md, step 4a): the block rule, the end blocks and their signals,
// the headway hold, who serves a lever ask, a rider's own ask, the wagon's exemption, the pier opening mid-run, and
// the worst wait for a train each way at every halt under random asks. The fuzz, the signal-to-signal leg and the
// wagon under random asks come from the independent review of 4a (10 November); FUZZ_TICKS lengthens the fuzz (the
// review ran 40,000) and FUZZ_LIGHT=1 asks at a playtest's rate, one lever ask every 60-90 s.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_HALTS, RAIL_LINES, RAIL_TRAINS, circuitLen, trainPlaces } from '../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, TRAIN_STOPS, trainAlong, trainDir, trainSpeed } from '../src/sim/railway-train.ts';
import {
  LINE_SLOTS,
  TRAIN_HEAD_PCT,
  blockFree,
  cycleTicks,
  endBlocks,
  headTicks,
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
