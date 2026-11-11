// The independent review of WORLD_NS v26 (generic lines step 4: two trains on line 2, block signals, headway, request
// stops), 10 November: its probes, kept as regression tests once its two findings (P2-1, the stub signals; P2-2, the
// Far Head crossover at the pier's opening) were fixed. SAVE_TICKS lengthens the every-tick save check (the review ran
// 2,500 ticks a seed; `npm run check` runs 500 to stay inside its 5 s a test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_HALTS, RAIL_TRAINS } from '../src/sim/railway-lines.ts';
import { TRAIN, TRAIN_PHASE, TRAIN_STOPS, trainDir } from '../src/sim/railway-train.ts';
import { LINE_SLOTS, trainSpacing } from '../src/sim/railway-trains.ts';
import { line2Completed } from '../src/sim/railway-queries-line2.ts';
import { trainStops } from '../src/sim/railway-queries-trains.ts';
import { Line, Train, createRailwayWorld } from '../src/sim/railway-components.ts';
import { railwayCheck } from '../src/sim/railway-check.ts';
import { act, invariant, railTick, railwayAtTrains, train, trains, type Seed } from './helpers/rail.ts';

const LINE2 = 1;
const [A, B] = LINE_SLOTS[LINE2] as [number, number];
const haltId = (line: number, stop: number) => RAIL_HALTS.findIndex((h) => h.line === line && h.stop === stop);
const unaudited = (s: Seed): Seed => {
  const raw = createRailwayWorld();
  raw.load(JSON.parse(JSON.stringify(s.w.snapshot())), railwayCheck);
  return { w: raw, t: s.t };
};
function fundQ6(w: Seed) {
  assert.equal(act(w, 'a', 'rail.pack'), 1);
  for (const kind of [0, 2])
    for (const pid of ['a', 'b']) {
      assert.equal(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
      assert.equal(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
    }
}

// Every tick's save must load: the snapshot through railwayCheck, every tick, under heavy asks, at the hold's extremes.
const SAVE_TICKS = Number(process.env.SAVE_TICKS ?? 500);
railwayAtTrains('boiler'); // the shared base, built outside every test's 5 s
for (const [seed, pct] of [
  [0x51, 75],
  [0x52, 0],
  [0x53, 100],
] as const)
  test(`review: every tick's save loads (seed ${seed}, ${pct}%)`, () => {
    const w = unaudited(railwayAtTrains('q6-stocked'));
    const rand = mulberry32(seed);
    const packAt = 100 + Math.floor(rand() * (SAVE_TICKS - 400)); // Q6 lays in 279 ticks
    for (let k = 0; k < SAVE_TICKS; k++) {
      if (k === packAt) fundQ6(w);
      if (rand() < 0.08) {
        const id = Math.floor(rand() * RAIL_HALTS.length);
        act(w, 'a', 'rail.call', { id, dir: rand() < 0.5 ? -1 : 1 });
      }
      if (rand() < 0.05) {
        const slot = LINE_SLOTS[LINE2]![Math.floor(rand() * 2)]!,
          n = trainStops(w.w, LINE2).length,
          stop = 1 + Math.floor(rand() * (n - 2));
        act(w, 'a', 'rail.call', { id: haltId(LINE2, stop), dir: trainDir(train(w.w, slot)), train: slot });
      }
      railTick(w.w, ++w.t, pct);
      assert.equal(
        trainSpacing(
          (s) => train(w.w, s),
          (l) => trainStops(w.w, l),
          w.t,
        ),
        null,
        `spacing ${w.t}`,
      );
      assert.equal(invariant(w.w), null, `tick ${w.t}: ${JSON.stringify(trains(w.w))}`);
    }
    assert.ok(line2Completed(w.w) >= 6);
  });

// P2-2: a train whose engine is past the start of Far Head's crossover (s 490 m) on the up track when Q6 opens the
// pier has already taken the crossover onto the down track; it used to stay on the up track (track 0) and run on to the
// pier, drawn crossed over by a latch a restore lost. Now it turns back at Far Head (`turn`), and the view draws it
// crossing from that alone.
test('review: a train already on the Far Head crossover when the pier opens turns back there (it has crossed)', () => {
  const base = railwayAtTrains('q6-finishing');
  const probe = unaudited(base);
  while (line2Completed(probe.w) < 6) railTick(probe.w, ++probe.t);
  const w = unaudited(base);
  while (w.t < probe.t - 5) railTick(w.w, ++w.t);
  {
    const e = w.w;
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
  }
  for (let k = 0; k < 600 && !(train(w.w, A).phase === TRAIN_PHASE.STAND && train(w.w, A).at === 2); k++)
    railTick(w.w, ++w.t);
  assert.ok(line2Completed(w.w) >= 6, 'the pier opened while A was on the crossover');
  assert.equal(train(w.w, A).at, 2, 'A stands at Far Head');
  assert.equal(train(w.w, A).track, 1, "A stands on the down track, where the crossover put it (it can't go on up)");
});

// Line 1 keeps its single train: nothing about it changed but its track. A sanity check that line 1 still serves both
// ends under v26 (the cart hold included) and never stands for good.
test('review: line 1 still shuttles end to end', () => {
  const w = unaudited(railwayAtTrains('q6-stocked'));
  const seen = new Set<number>();
  for (let k = 0; k < 3000; k++) {
    railTick(w.w, ++w.t);
    const r = train(w.w, 0);
    if (r.phase === TRAIN_PHASE.STAND) seen.add(r.at);
  }
  assert.deepEqual([...seen].sort(), [0, 1]);
  assert.equal(RAIL_TRAINS[0]!.line, 0);
  assert.ok(TRAIN.sepCm > 0);
});

// The 4a review's P3c, claimed fixed in 33d7c0a96 with no test: a rider's ask made too late for the train to brake
// leaves its amber lamp dark; one in time lights it.
test('review: the amber lamp is dark for a rider ask too late to stop for, lit for one in time', async () => {
  // The world twin the views call (train-view's amber lamp); the adapter's own copy went in M12.
  const { railTrainAsked } = await import('../src/sim/railway-queries-trains.ts');
  const { trainAlong, trainSpeed } = await import('../src/sim/railway-train.ts');
  const brake = (TRAIN.speed * TRAIN.speed) / (2 * TRAIN.accel);
  const quarry = TRAIN_STOPS[LINE2]![1]!;
  const run = (late: boolean) => {
    const w = unaudited(railwayAtTrains('trains-on'));
    for (let k = 0; k < TRAIN.wakeTicks; k++) railTick(w.w, ++w.t);
    // A out from the village up, at cruise; ask from aboard either well before its braking point or inside it.
    for (let k = 0; k < 3000; k++) {
      const r = train(w.w, A);
      const left = quarry - trainAlong(r, LINE2, w.t);
      if (r.phase === TRAIN_PHASE.RUN && r.track === 0 && trainSpeed(r, LINE2, w.t) >= TRAIN.speed - 1)
        if (late ? left < brake - 300 && left > 0 : left > brake + 600) break;
      railTick(w.w, ++w.t);
    }
    assert.equal(act(w, 'a', 'rail.call', { id: haltId(LINE2, 1), dir: 1, train: A }), 1, 'the ask is taken');
    return railTrainAsked(w.w, A, w.t);
  };
  assert.equal(run(false), true, 'in time: lit');
  assert.equal(run(true), false, 'too late: dark');
});

// P2-1: the end blocks started at the merge (RailHalt.end.mergeCm) and a train that couldn't enter waited 10 m outside
// it, but the drawn tracks only part over a 20 m turnout beyond the merge (src/place/layout.ts TURNOUT, upLat),
// and a train stretches 9 m behind its reference point (the wagon at -7.4 m, src/entities/railway/cars.ts): a train held at
// a stub end's signal stood on the turnout, and the train leaving the end block passed through it. Checked on the
// drawn footprint: each car's box at its pose and its track's offset.
test('review: no two drawn trains overlap (a train held at a stub signal stands clear of the one leaving)', async () => {
  const { FORMATION, LINKS, upLat, crossLat } = await import('../src/place/layout.ts');
  const { TRAIN_CARS, TRAIN_OFFSETS } = await import('../src/entities/railway/cars.ts');
  const { trainAlong } = await import('../src/sim/railway-train.ts');
  const w = unaudited(railwayAtTrains('q6-stocked'));
  const rand = mulberry32(0x5a);
  const boxes = (slot: number) => {
    const r = train(w.w, slot),
      line = RAIL_TRAINS[slot]!.line,
      f = FORMATION[LINKS[line]!.id],
      open = line2Completed(w.w) >= 6;
    const along = trainAlong(r, line, w.t) / 100;
    return TRAIN_OFFSETS.slice(0, r.wagon ? 4 : 3).map((off, n) => {
      const s = along + off;
      const lat = r.track
        ? 0
        : (r.turn || !open) && f.crossover && s >= f.crossover[0]
          ? (crossLat(f, s) ?? 0)
          : (upLat(f, s) ?? 0);
      return { s, lat, hx: TRAIN_CARS[n]!.hx, hz: TRAIN_CARS[n]!.hz };
    });
  };
  // The held-at-a-signal case first: A at the village (in its block) leaving in 200 ticks, B leaving the quarry down
  // now, so B comes to the village signal and waits there while A leaves past it on the up track.
  for (let k = 0; k < TRAIN.wakeTicks; k++) railTick(w.w, ++w.t);
  {
    const e = w.w;
    for (const [k, stop, track, depart] of [
      [A, 0, 0, w.t + 200 - TRAIN.dwellTicks],
      [B, 1, 1, w.t - TRAIN.dwellTicks],
    ] as const) {
      const s = TRAIN_STOPS[LINE2]![stop]!;
      Object.assign(e.mut(Train, e.lookup(Train, k)!)!, {
        phase: TRAIN_PHASE.STAND,
        at: stop,
        to: stop,
        track,
        depart,
        arrived: depart,
        req: 0,
        from: s,
        v0: 0,
        dest: s,
      });
    }
    for (const id of e.ids(Line)) Object.assign(e.mut(Line, id)!, { req: 0, left0: -1, left1: -1 });
  }
  let first: string | null = null,
    held = false;
  for (let k = 0; k < 4000 && !first; k++) {
    if (k === 1500) fundQ6(w);
    if (train(w.w, B).phase === TRAIN_PHASE.STAND && train(w.w, B).at === -1) held = true;
    if (rand() < 0.05)
      act(w, 'a', 'rail.call', { id: Math.floor(rand() * RAIL_HALTS.length), dir: rand() < 0.5 ? -1 : 1 });
    railTick(w.w, ++w.t);
    for (const p of boxes(A))
      for (const q of boxes(B))
        if (!first && Math.abs(p.s - q.s) < p.hz + q.hz && Math.abs(p.lat - q.lat) < p.hx + q.hx)
          first = `tick ${w.t}: A car s ${p.s.toFixed(1)} m lat ${p.lat.toFixed(2)}, B car s ${q.s.toFixed(1)} m lat ${q.lat.toFixed(2)}; ${JSON.stringify([train(w.w, A), train(w.w, B)])}`;
  }
  assert.equal(first, null, `held at the signal: ${held}`);
  assert.ok(held, 'B was held at the village signal (the case under test)');
});
