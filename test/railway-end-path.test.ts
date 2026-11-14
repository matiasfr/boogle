// Running-side review P1 two: the accepted departure path preserves every car, not just the reference point.
// Ported from the review's actual trainPlaces/deckAt case, including the footing wagon and steel car.
import test from 'node:test';
import assert from 'node:assert/strict';
import { line2Lat, line2At } from '../src/entities/railway/line2-path.ts';
import { TRAIN_OFFSETS, TRAIN_CARS, STEEL_CAR, steelCarOffset } from '../src/entities/railway/cars.ts';
import { trainPlaces, deckAt, ENGINE_BUFFERS, CAR_BUFFERS, type TrackAt } from '../src/entities/railway/car-spacing.ts';
import { line2Stops } from './helpers/rail-rows.ts';

const vehicles = [...TRAIN_CARS, STEEL_CAR].map((c, i) => ({
  d: [...TRAIN_OFFSETS, steelCarOffset(true)][i]!,
  hx: c.hx,
  back: c.hz,
  front: c.hz,
  buffers: i ? CAR_BUFFERS : ENGINE_BUFFERS,
}));
function poses(stops: readonly number[], origin: number, along: number) {
  const row = { track: 1, origin };
  const lat = (s: number) => line2Lat(row, s, stops, undefined, true);
  const at: TrackAt = (s, out) => {
    const p = line2At(s, { x: 0, z: 0, ux: 0, uz: 1 }, true);
    out.x = p.x - p.uz * lat(s);
    out.z = p.z + p.ux * lat(s);
  };
  const spaced = vehicles.some((v) => lat(along + v.d) !== 0) || lat(along) !== 0;
  return trainPlaces(at, along, vehicles, [], spaced).map((s, i) =>
    deckAt(at, s, vehicles[i]!, { x: 0, z: 0, yaw: 0, hx: 0, back: 0, front: 0 }),
  );
}

test('Q7 preserves all five car poses while standing and throughout departure', () => {
  const before = line2Stops(6),
    after = line2Stops(7),
    origin = before[3]!;
  for (let along = origin / 100; along >= 510; along -= 0.5) {
    const a = poses(before, origin, along),
      b = poses(after, origin, along);
    a.forEach((p, i) => {
      const jump = Math.hypot(p.x - b[i]!.x, p.z - b[i]!.z);
      assert.ok(jump < 1e-9, `car ${i}, reference ${along}: ${jump} m jump`);
      assert.equal(p.yaw, b[i]!.yaw, `car ${i}, reference ${along}: heading`);
    });
  }
});

test('every old end keeps its full-car path when Q6, the Railhead or the rivet opens', () => {
  for (const [before, after] of [
    [line2Stops(5), line2Stops(6)],
    [line2Stops(7), line2Stops(7, 1)],
    [line2Stops(7, 7), line2Stops(7, 7, true)],
  ]) {
    const origin = before!.at(-1)!;
    for (let along = origin / 100; along >= origin / 100 - 100; along -= 2)
      assert.deepEqual(
        poses(after!, origin, along),
        poses(before!, origin, along),
        `origin ${origin}, reference ${along}`,
      );
  }
});
