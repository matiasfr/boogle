// The independent review of WORLD_NS v26 (generic lines step 4: two trains on line 2, block signals, headway, request
// stops). Scratch probes; the ones that fail are the review's findings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, TRAIN_STOPS, trainDir } from '../src/sim/railway-train.ts';
import { LINE_SLOTS, trainSpacing } from '../src/sim/railway-trains.ts';
import { line2Completed, trainStops } from '../src/sim/railway-line2.ts';
import { Line, Train, createRailwayWorld, railwayCheck } from '../src/sim/railway-world.ts';
import { railwayAtTrains } from './helpers/railway-trains.ts';
import { act } from './helpers/railway-q2.ts';
import { edit, invariant, live, railTick, worldOf } from './railway-live.ts';
import type { World as Fixture } from './helpers/railway-q2.ts';

const LINE2 = 1;
const [A, B] = LINE_SLOTS[LINE2] as [number, number];
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const unaudited = (w: Fixture): Fixture => {
  const raw = createRailwayWorld();
  raw.load(JSON.parse(JSON.stringify(worldOf(w.s).snapshot())), railwayCheck);
  return { s: live(raw), t: w.t };
};
function fundQ6(w: Fixture) {
  assert.equal(act(w, 'a', 'rail.pack'), 1);
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      assert.equal(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
      assert.equal(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
    }
}

// Every tick's save must load: the snapshot through railwayCheck, every tick, under heavy asks, at the hold's extremes.
for (const [seed, pct] of [
  [0x51, 75],
  [0x52, 0],
  [0x53, 100],
] as const)
  test(`review: every tick's save loads (seed ${seed}, ${pct}%)`, () => {
    const w = unaudited(railwayAtTrains('q6-stocked'));
    const rand = mulberry32(seed);
    const packAt = 200 + Math.floor(rand() * 1500);
    for (let k = 0; k < 2500; k++) {
      if (k === packAt) fundQ6(w);
      if (rand() < 0.08) {
        const id = Math.floor(rand() * RAIL_HALTS.length);
        act(w, 'a', 'rail.call', { id, dir: rand() < 0.5 ? -1 : 1 });
      }
      if (rand() < 0.05) {
        const slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 2)]!,
          n = trainStops(w.s, LINE2).length,
          stop = 1 + Math.floor(rand() * (n - 2));
        act(w, 'a', 'rail.call', { id: haltId(LINE2, stop), dir: trainDir(w.s.trains[slot]!), train: slot });
      }
      railTick(w.s, ++w.t, pct);
      assert.equal(
        trainSpacing(
          (s) => w.s.trains[s]!,
          (l) => trainStops(w.s, l),
          w.t,
        ),
        null,
        `spacing ${w.t}`,
      );
      assert.equal(invariant(w.s), null, `tick ${w.t}: ${JSON.stringify(w.s.trains)}`);
    }
    assert.ok(line2Completed(w.s) >= 6);
  });

// A train whose engine is past the start of Far Head's crossover (s 490 m) on the up track when Q6 opens the pier has
// already taken the crossover onto the down track (train-view.ts latches `cross`, drawing it there). The sim keeps it
// on the up track (track 0) and runs it on to the pier, so the drawn train and the sim's disagree from Far Head to the
// pier's merge (s 512-556), where a train coming down from the pier on the down track is drawn on the same rails.
test('review: a train already on the Far Head crossover when the pier opens turns back there (it has crossed)', () => {
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.s) < 6) railTick(probe.s, ++probe.t);
  const w = unaudited(base);
  while (w.t < probe.t - 5) railTick(w.s, ++w.t);
  edit(w.s, (e) => {
    Object.assign(e.mut(Train, e.lookup(Train, A)!)!, {
      phase: TRAIN_PHASE.RUN,
      at: 1,
      to: 2,
      track: 0,
      depart: w.t,
      req: 0,
      from: 50000,
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
    for (const id of e.ids(Line)) Object.assign(e.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  });
  for (let k = 0; k < 600 && !(w.s.trains[A]!.phase === TRAIN_PHASE.STAND && w.s.trains[A]!.at === 2); k++)
    railTick(w.s, ++w.t);
  assert.ok(line2Completed(w.s) >= 6, 'the pier opened while A was on the crossover');
  assert.equal(w.s.trains[A]!.at, 2, 'A stands at Far Head');
  assert.equal(w.s.trains[A]!.track, 1, "A stands on the down track, where the crossover put it (it can't go on up)");
});

// Line 1 keeps its single train: nothing about it changed but its track. A sanity check that line 1 still serves both
// ends under v26 (the cart hold included) and never stands for good.
test('review: line 1 still shuttles end to end', () => {
  const w = unaudited(railwayAtTrains('q6-stocked'));
  const seen = new Set<number>();
  for (let k = 0; k < 3000; k++) {
    railTick(w.s, ++w.t);
    const r = w.s.trains[0]!;
    if (r.phase === TRAIN_PHASE.STAND) seen.add(r.at);
  }
  assert.deepEqual([...seen].sort(), [0, 1]);
  assert.equal(RAIL_TRAINS[0]!.line, 0);
  assert.ok(TRAIN.sepCm > 0);
});
