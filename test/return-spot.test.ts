import test from 'node:test';
import assert from 'node:assert/strict';
import { readReturnSpot, captureReturnSpot, returnCandidates, haltLandings } from '../src/place/return-spot.ts';
import { RAIL_LINES } from '../src/sim/railway-lines.ts';
import { JUMPS } from '../src/world/railway-jump.ts';

const spot = { x: 10, y: 12, z: 20, yaw: 1, at: 1000 };
test('remember only finite, bounded, recent records; zero disables return', () => {
  assert.deepEqual(readReturnSpot(spot, 2000, 1000), spot);
  for (const [now, window] of [
    [2001, 1000],
    [999, 1000],
    [1000, 0],
    [NaN, 1000],
    [2000, Infinity],
  ])
    assert.equal(readReturnSpot(spot, now!, window!), null);
  for (const value of [
    null,
    'bad',
    {},
    [],
    { ...spot, x: Infinity },
    { ...spot, y: NaN },
    { ...spot, x: 5001 },
    { ...spot, z: -5001 },
    { ...spot, y: -51 },
    { ...spot, y: 501 },
    { ...spot, yaw: '0' },
    { ...spot, at: NaN },
    { ...spot, ride: null },
    { ...spot, ride: { x: 0, y: 0, z: Infinity } },
  ])
    assert.equal(readReturnSpot(value, 2000, 1000), null);
  assert.doesNotThrow(() =>
    readReturnSpot(
      new Proxy(
        {},
        {
          get() {
            throw new Error('bad record');
          },
        },
      ),
      2000,
      1000,
    ),
  );
});
test('aboard, swimming, airborne and unsafe captures retain the last standing spot and refresh ride/time', () => {
  const pos = { x: 40, y: 2, z: 20 };
  for (const state of [
    { standing: false, standable: true },
    { standing: true, standable: false },
  ]) {
    assert.deepEqual(captureReturnSpot(spot, { ...state, pos, yaw: 2 }, 2000), { ...spot, at: 2000, ride: pos });
    assert.equal(captureReturnSpot(null, { ...state, pos, yaw: 2 }, 2000), null);
  }
  assert.deepEqual(captureReturnSpot({ ...spot, ride: pos }, { standing: true, standable: true, pos, yaw: 2 }, 3000), {
    ...pos,
    yaw: 2,
    at: 3000,
  });
});
test('candidate order uses the spot within 25m, otherwise only the two nearest halts to the ride', () => {
  const halts = [
    { x: 0, y: 1, z: 20 },
    { x: 35, y: 1, z: 20 },
    { x: 60, y: 1, z: 20 },
  ];
  assert.deepEqual(returnCandidates(spot, halts), [{ x: 10, y: 12, z: 20 }, halts[0], halts[1]]);
  assert.deepEqual(returnCandidates({ ...spot, ride: { x: 36, y: 20, z: 20 } }, halts), [halts[1], halts[2]]);
  assert.equal(returnCandidates({ ...spot, ride: { x: 35, y: 20, z: 20 } }, halts).length, 3);
});
test('every halt platform has its own or a checked nearby catalogue landing', () => {
  const landings = haltLandings();
  for (const line of RAIL_LINES)
    for (const halt of line.halts)
      for (const platform of halt.platforms) {
        const x = platform.x / 100,
          z = platform.z / 100;
        const nearby = JUMPS.flatMap((j) => (j.land ? [j.land] : [])).filter((p) => Math.hypot(p.x - x, p.z - z) <= 30);
        assert.ok(
          landings.some((p) =>
            nearby.length
              ? nearby.some((j) => j.x === p.x && j.z === p.z && j.y === p.y)
              : p.x === x && p.z === z && p.y === platform.y / 100,
          ),
          `${line.id}: ${halt.name}`,
        );
      }
});
