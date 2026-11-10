// Several trains on a line (docs/plans/generic-lines.md, step 4a): the block rule, the end blocks and their signals,
// the headway hold, who serves a lever ask, a rider's own ask, the wagon's exemption, the pier opening mid-run, and
// the worst wait for a train each way at every halt under random asks.
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
} from '../src/sim/railway-trains.ts';
import { line2Completed, trainStops } from '../src/sim/railway-line2.ts';
import { Line, Train, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import { WORKS } from '../src/sim/railway-works-layout.ts';
import { railwayAtTrains } from './helpers/railway-trains.ts';
import { act } from './helpers/railway-q2.ts';
import { advanceWorks, railwayAtWorks } from './helpers/railway-works.ts';
import { edit, invariant, live, railTick, worldOf } from './railway-live.ts';
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
railwayAtWorks('wagon-on');
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
  // Every signal stands on the inbound track outside its merge, at least a train's gap from the end stop.
  const [village, farHead] = endBlocks(LINE2, before);
  assert.deepEqual([village.from, village.to, village.signal], [1700, 3400, 4440]);
  assert.deepEqual([farHead.from, farHead.to, farHead.signal], [49000, 52400, 48000]);
  assert.deepEqual(
    endBlocks(LINE2, all).map((b) => b.signal),
    [4440, 54600],
    "the far end's block moves to the pier's stub",
  );
});

// ---------------------------------------------------------------- spacing and the worst wait
/** What a request stop adds to the wait for the train behind it: about 11 s (design review, finding 1). */
const STOP_TICKS = 110;
for (const stage of ['trains-on', 'q6-done'] as const)
  test(`random lever asks for 2,000 ticks (${stage}): never closer than sepCm, and the worst wait each way`, (t) => {
    const w = awake(stage, false),
      rand = mulberry32(stage === 'trains-on' ? 0x1ead : 0xbe11);
    const open = (id: number) => RAIL_HALTS[id]!.stop < trainStops(w.s, RAIL_HALTS[id]!.line).length;
    // Waits by "halt/dir": the ask's tick until a train of its line stands there leaving that way, and the request
    // stops (at middle halts) its line's trains made meanwhile.
    const asked = new Map<string, { since: number; stops: number }>(),
      worst = new Map<string, { ticks: number; stops: number }>();
    const keyOf = (id: number, dir: number) => `${id}/${dir}`;
    const done = (key: string, ticks: number, stops: number) => {
      const was = worst.get(key);
      if (!was || ticks - STOP_TICKS * stops > was.ticks - STOP_TICKS * was.stops) worst.set(key, { ticks, stops });
    };
    for (let k = 0; k < 2000; k++) {
      if (rand() < 0.06) {
        const id = Math.floor(rand() * RAIL_HALTS.length),
          dir = rand() < 0.5 ? -1 : 1;
        if (open(id) && lever(w, id, dir) + 1 && !asked.has(keyOf(id, dir))) {
          const n = trainStops(w.s, RAIL_HALTS[id]!.line).length,
            stop = RAIL_HALTS[id]!.stop;
          if (!((stop === 0 && dir < 0) || (stop === n - 1 && dir > 0)))
            asked.set(keyOf(id, dir), { since: w.t, stops: 0 });
        }
      }
      const was = w.s.trains.map((r) => r.phase);
      step(w);
      w.s.trains.forEach((r, s) => {
        const line = RAIL_TRAINS[s]!.line,
          n = trainStops(w.s, line).length;
        if (was[s] === TRAIN_PHASE.RUN && r.phase === TRAIN_PHASE.STAND && r.at > 0 && r.at < n - 1)
          for (const [key, a] of asked) if (RAIL_HALTS[Number(key.split('/')[0])]!.line === line) a.stops++;
      });
      for (const [key, a] of asked) {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        const h = RAIL_HALTS[id]!;
        if (LINE_SLOTS[h.line]!.some((s) => standing(w, s, h.stop, dir)())) {
          done(key, w.t - a.since, a.stops);
          asked.delete(key);
        }
      }
      if (k % 200 === 0) assert.equal(invariant(w.s), null);
    }
    for (const [key, a] of asked) done(key, w.t - a.since, a.stops);
    const report = [...worst]
      .sort(([p], [q]) => (p < q ? -1 : 1))
      .map(([key, { ticks, stops }]) => {
        const [id, dir] = key.split('/').map(Number) as [number, number];
        return `${RAIL_HALTS[id]!.name} ${dir > 0 ? 'up' : 'down'} ${(ticks / 10).toFixed(1)} s (${stops} stops)`;
      });
    t.diagnostic(`worst waits (${stage}): ${report.join('; ')}`);
    // Line 2's bound (design review, finding 1): about a minute, plus about 11 s for each request stop made meanwhile.
    for (const [key, { ticks, stops }] of worst)
      if (RAIL_HALTS[Number(key.split('/')[0])]!.line === LINE2)
        assert.ok(ticks <= 600 + STOP_TICKS * stops, `line 2 ${key}: waited ${ticks} ticks over ${stops} stops`);
    assert.ok(worst.size >= 6, 'asks at most halts');
    assert.equal(invariant(w.s), null);
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
  assert.deepEqual([row(w, B).to, row(w, B).dest], [-1, 4440], "B's leg ends at the village block's signal");
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
      { k: B, stop: -1, track: 1, depart: w.t, s: 4440 },
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
