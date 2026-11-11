// The independent review of WORLD_NS v25 (request stops): its two defects, kept as regression tests. Asks never starve
// the kit (railway-train.ts trainNextStop, railway-systems.ts serviceOf); a rider's reach survives a replan
// (railway-server.ts nearTrain).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAIN,
  TRAIN_PHASE,
  TRAIN_STOPS,
  trainAlong,
  trainDir,
  trainSpeed,
  type RailTrain,
} from '../src/sim/railway-train.ts';
import { railLinePoint } from '../src/sim/railway-line-path.ts';
import { railValid } from '../src/world/railway-server.ts';
import { Forge } from '../src/sim/railway-components.ts';
import { act, advance, forge, rail, railwayAtTrains, train, type Seed } from './helpers/rail.ts';

const H = { quarry: 3, farHead: 4 } as const;
const STOPS = TRAIN_STOPS[1]!;
const BRAKE = (TRAIN.speed * TRAIN.speed) / (2 * TRAIN.accel);
const line2 = (w: Seed) => train(w.w, 1);
const ask = (w: Seed, id: number, dir: -1 | 1) => act(w, 'a', 'rail.call', { id, dir });
const kitAboard = (w: Seed) => line2(w).logs + line2(w).rails > 0;

test('review: a Far Head ask never turns an empty kit train back before the village (kit starvation loop)', () => {
  // Q6's kit is owed: the train must reach the village to load it. Someone waiting at Far Head (where the kit is for)
  // presses its lever each time the train leaves Far Head without it.
  const w = railwayAtTrains('trains-on');
  // The forge out for the first kit trip's wait, so the kit takes two trips (5 rails on the second).
  const lit = forge(w.w).lit;
  w.w.mut(Forge, w.w.single(Forge))!.lit = -1;
  let pressed = 0;
  for (let t = 0; rail(w.w).depot !== 32 || rail(w.w).depotRails !== 32; t++) {
    if (t === 200) w.w.mut(Forge, w.w.single(Forge))!.lit = lit;
    // Without asks the second trip lands by tick ~1700; allow three times that.
    assert.ok(
      t < 5000,
      `kit delivered in time (Far Head pressed ${pressed} times, depot ${rail(w.w).depot}/${rail(w.w).depotRails})`,
    );
    const r = line2(w);
    if (
      r.phase === TRAIN_PHASE.RUN &&
      trainDir(r) < 0 &&
      !kitAboard(w) &&
      trainAlong(r, 1, w.t) - STOPS[1]! > BRAKE + 400 &&
      !(r.req > 0)
    ) {
      ask(w, H.farHead, -1);
      pressed++;
    }
    advance(w, 1);
  }
});

test("review: a rider on the train's rear car keeps reach for the lag window after another rider's ask replans the leg", () => {
  const w = railwayAtTrains('q6-stocked');
  // Line 2 out from the village, cruising, well short of the quarry.
  for (let t = 0; ; t++) {
    assert.ok(t < 3000);
    const r = line2(w);
    if (r.phase === TRAIN_PHASE.RUN && trainDir(r) > 0 && trainSpeed(r, 1, w.t) === TRAIN.speed) break;
    advance(w, 1);
  }
  assert.ok(STOPS[1]! - trainAlong(line2(w), 1, w.t) > BRAKE + 1000, 'the quarry is still in braking reach');
  const before: RailTrain = { ...line2(w) };
  // A rider on the rear car (7.4 m behind the pose), whose view of the train lags the room clock by 3 ticks.
  const LAG = 3,
    CAR = 740;
  const rider = (tick: number) => {
    const p = railLinePoint(1, trainAlong(before, 1, tick - LAG) - CAR);
    return {
      reach: (x: number, z: number, r: number) => Math.hypot(p.x - x, p.z - z) <= r,
      height: () => true,
      cadence: () => true,
    };
  };
  const bell = { op: 'rail.call', epoch: 1, request: 1, id: H.farHead, dir: 1, train: 1 };
  assert.equal(railValid(w.w, bell, rider(w.t), w.t), true, 'aboard, before any replan');
  // Another passenger asks for the quarry: the leg is replanned from this tick.
  assert.equal(ask(w, H.quarry, 1), 1);
  advance(w, 1);
  assert.equal(line2(w).depart, w.t, 'replanned now');
  assert.ok(trainAlong(line2(w), 1, w.t) === trainAlong(before, 1, w.t), 'same pose');
  assert.equal(railValid(w.w, bell, rider(w.t), w.t), true, 'the same rider, one tick later, still aboard');
});
