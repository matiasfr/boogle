// Round-two review: an old departure must still own its physical single-track block.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureLine, line2Stops, standingAt } from './helpers/rail-rows.ts';
import { endTransitions } from './helpers/rail-transitions.ts';
import {
  trainStepLine,
  endMoved,
  stopMoved,
  endBlocks,
  blockFree,
  retainedEndBlock,
  lineSpacing,
} from '../src/sim/railway-trains.ts';
import { TRAIN_PHASE, trainAlong } from '../src/sim/railway-train.ts';
import { line2Lat, line2At } from '../src/entities/railway/line2-path.ts';
import { TRAIN_OFFSETS, TRAIN_CARS } from '../src/entities/railway/cars.ts';
import {
  trainPlaces,
  deckAt,
  deckGap,
  ENGINE_BUFFERS,
  CAR_BUFFERS,
  type TrackAt,
} from '../src/entities/railway/car-spacing.ts';

const vehicles = TRAIN_CARS.slice(0, 3).map((c, i) => ({
  d: TRAIN_OFFSETS[i]!,
  hx: c.hx,
  back: c.hz,
  front: c.hz,
  buffers: i ? CAR_BUFFERS : ENGINE_BUFFERS,
}));
function poses(f: FixtureLine, slot: number, tick: number) {
  const r = f.rows[slot]!,
    along = trainAlong(r, f.line, tick) / 100;
  const lat = (s: number) => line2Lat(r, s, f.stops, undefined, true);
  const at: TrackAt = (s, o) => {
    const p = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 }, true);
    o.x = p.x - p.uz * lat(s);
    o.z = p.z + p.ux * lat(s);
  };
  return trainPlaces(
    at,
    along,
    vehicles,
    [],
    vehicles.some((v) => lat(along + v.d) !== 0),
  ).map((s, i) => deckAt(at, s, vehicles[i]!, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 }));
}
function transition(before: readonly number[], after: readonly number[]) {
  const f = new FixtureLine(before),
    last = before.length - 1;
  const signal = endBlocks(f.line, before)[1].signal;
  f.rows = [
    standingAt(before, 0, 0),
    standingAt(before, last, 1),
    { ...standingAt(before, last - 1, 0), at: -1, to: -1, from: signal, dest: signal },
  ];
  f.stops = after;
  if (before.length === after.length) stopMoved(f.io(), f.line, last, 0);
  else endMoved(f.io(), f.line, last, 0);
  return f;
}
test('reviewer Q7 case: retained departure and old signal waiter never intersect', (t) => {
  const f = transition(line2Stops(6), line2Stops(7));
  let min = Infinity;
  for (let tick = 1; tick <= 300; tick++) {
    trainStepLine(f.io(), f.line, tick);
    for (const a of poses(f, 1, tick)) for (const b of poses(f, 2, tick)) min = Math.min(min, deckGap(a, b));
  }
  assert.ok(min >= 0, `minimum deck clearance ${min.toFixed(3)} m`);
  t.diagnostic(`reviewer Q7: minimum deck clearance ${min.toFixed(3)} m over 300 ticks`);
});
for (const { name, before, after } of endTransitions)
  test(`${name}: protected departure clears, releases its waiter, and never overlaps`, (t) => {
    const f = transition(before, after),
      signal = f.rows[2]!.from;
    let clear = 0,
      released = 0,
      min = Infinity;
    for (let tick = 1; tick <= 1000; tick++) {
      trainStepLine(f.io(), f.line, tick);
      assert.equal(lineSpacing(f.io().row, f.line, after, tick), null, `tick ${tick}`);
      if (!clear && !retainedEndBlock(f.rows[1]!, f.line, tick)) clear = tick;
      if (!released && trainAlong(f.rows[2]!, f.line, tick) > signal) released = tick;
      if (!released)
        for (const a of poses(f, 1, tick)) for (const b of poses(f, 2, tick)) min = Math.min(min, deckGap(a, b));
      if (tick === 40) f.restore();
    }
    assert.ok(clear > 0 && released >= clear, `clear ${clear}, released ${released}`);
    assert.ok(min >= 0, `${name}: minimum clearance ${min}`);
    t.diagnostic(`clear ${clear}, release ${released}, minimum clearance ${min.toFixed(3)} m`);
  });
test('an inbound train committed to an old end keeps its block through arrival and departure', () => {
  for (const { name, before, after } of endTransitions.filter((x) => x.after.length > x.before.length)) {
    const f = transition(before, after),
      last = before.length - 1,
      origin = before[last]!;
    f.rows[1] = {
      ...standingAt(before, last - 1, 0),
      phase: TRAIN_PHASE.RUN,
      from: origin - 1000,
      dest: origin,
      to: last,
      depart: 0,
    };
    endMoved(f.io(), f.line, last, 0);
    assert.equal(f.rows[1]!.turn, true, name);
    assert.equal(retainedEndBlock(f.rows[1]!, f.line, 0)?.stop, last, name);
    assert.equal(blockFree(f.io().row, f.line, after, 2, 0, after.at(-1)!, 0), false, name);
    for (let tick = 1; tick <= 70; tick++) {
      trainStepLine(f.io(), f.line, tick);
      assert.equal(trainAlong(f.rows[2]!, f.line, tick), f.rows[2]!.from, name);
    }
  }
});
test('every growing end retains its occupied block, including a leg passing through it', () => {
  for (const { name, before, after } of endTransitions) {
    const f = transition(before, after);
    assert.equal(blockFree(f.io().row, f.line, after, 2, 0, after.at(-1)!, 0), false, name);
  }
});
