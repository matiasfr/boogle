import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readReturnSpot,
  captureReturnSpot,
  returnCandidates,
  haltLandings,
  createReturnSearch,
  type ReturnPosition,
} from '../src/place/return-spot.ts';
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

const halts = [
  { x: 100, y: 10, z: 20 },
  { x: 200, y: 10, z: 20 },
];
const probes = {
  settled: () => true,
  standable: () => true,
  near: (): ReturnPosition | null => null,
};
test('return search holds before querying, then places the valid spot', () => {
  const search = createReturnSearch(spot, halts);
  assert.deepEqual(search.step(0, probes), { kind: 'hold' });
  assert.deepEqual(search.step(0.02, probes), { kind: 'land', at: { x: spot.x, y: spot.y, z: spot.z } });
  assert.equal(search.current(), null);
});
test('a gone or occupied exact spot uses a ring before considering halts', () => {
  const search = createReturnSearch(spot, halts);
  const beside = { x: 11.4, y: 12, z: 20 };
  const p = {
    ...probes,
    standable: () => false,
    near: (_p: ReturnPosition, radii: readonly number[]) => {
      assert.deepEqual(radii, [1.4, 3, 6]);
      return beside;
    },
  };
  search.step(0, p);
  assert.deepEqual(search.step(0.02, p), { kind: 'land', at: beside });
});
test('a removed deck and missing ring fall back to the nearest standing halt, then the second', () => {
  const search = createReturnSearch(spot, halts);
  const p = { ...probes, standable: (at: ReturnPosition) => at.x === 200 };
  search.step(0, p);
  assert.deepEqual(search.step(0.02, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 100);
  assert.deepEqual(search.step(0.04, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 200);
  assert.deepEqual(search.step(0.06, p), { kind: 'land', at: halts[1] });
});
test('a distant train or water observation skips the old spot for its nearest halt', () => {
  for (const y of [22, 0]) {
    const search = createReturnSearch({ ...spot, ride: { x: 180, y, z: 20 } }, halts);
    assert.equal(search.current()!.x, 200);
    search.step(0, probes);
    assert.deepEqual(search.step(0.02, probes), { kind: 'land', at: halts[1] });
  }
});
test('an unchecked halt probes platform rings, and same-halt platforms do not consume both choices', () => {
  const candidates = [
    { ...halts[0]!, halt: 'a', checked: false },
    { x: 101, y: 10, z: 20, halt: 'a' },
    { ...halts[1]!, halt: 'b', checked: true },
  ];
  const search = createReturnSearch({ ...spot, ride: { x: 110, y: 10, z: 20 } }, candidates);
  const p = {
    ...probes,
    near: (_at: ReturnPosition, radii: readonly number[]) => {
      assert.deepEqual(radii, [3, 4.5, 6, 8]);
      return halts[0]!;
    },
  };
  search.step(0, p);
  assert.deepEqual(search.step(0.02, p), { kind: 'land', at: halts[0] });
  assert.equal(returnCandidates({ ...spot, ride: { x: 110, y: 10, z: 20 } }, candidates).length, 2);
});
test('every unsettled candidate times out after 2.5 seconds, ending at Home', () => {
  const search = createReturnSearch(spot, halts);
  const p = {
    ...probes,
    settled: () => false,
    standable: () => {
      throw new Error('must not query unmounted scenery');
    },
  };
  search.step(0, p);
  assert.deepEqual(search.step(2.49, p), { kind: 'hold' });
  assert.deepEqual(search.step(2.5, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 100);
  assert.deepEqual(search.step(5, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 200);
  assert.deepEqual(search.step(7.5, p), { kind: 'home' });
});
test('settled candidates with no standing surface exhaust the chain to Home', () => {
  const search = createReturnSearch(spot, halts);
  const p = { ...probes, standable: () => false };
  search.step(0, p);
  search.step(0.02, p);
  search.step(0.04, p);
  assert.deepEqual(search.step(0.06, p), { kind: 'home' });
});
test('expired, disabled, malformed or cleared memory goes straight Home without probing', () => {
  for (const value of [
    readReturnSpot(spot, 2001, 1000),
    readReturnSpot(spot, 1000, 0),
    readReturnSpot({ bad: 1 }, 1000, 1000),
    readReturnSpot(null, 1000, 1000),
  ]) {
    assert.equal(value, null);
    assert.deepEqual(createReturnSearch(value, halts).step(0, probes), { kind: 'home' });
  }
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
