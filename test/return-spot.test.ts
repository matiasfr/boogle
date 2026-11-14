import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readReturnSpot,
  captureReturnSpot,
  returnCandidates,
  haltLandings,
  createReturnSearch,
  yawToward,
  RETURN_BUDGET_S,
  type ReturnCandidate,
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
  const at = { x: spot.x, y: spot.y, z: spot.z };
  assert.deepEqual(search.step(0.02, probes), { kind: 'land', at, from: at });
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
  assert.deepEqual(search.step(0.02, p), { kind: 'land', at: beside, from: { x: spot.x, y: spot.y, z: spot.z } });
});
test('a removed deck and missing ring fall back to the nearest standing halt, then the second', () => {
  const search = createReturnSearch(spot, halts);
  const p = { ...probes, standable: (at: ReturnPosition) => at.x === 200 };
  search.step(0, p);
  assert.deepEqual(search.step(0.02, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 100);
  assert.deepEqual(search.step(0.04, p), { kind: 'hold' });
  assert.equal(search.current()!.x, 200);
  assert.deepEqual(search.step(0.06, p), { kind: 'land', at: halts[1], from: halts[1] });
});
test('a distant train or water observation skips the old spot for its nearest halt', () => {
  for (const y of [22, 0]) {
    const search = createReturnSearch({ ...spot, ride: { x: 180, y, z: 20 } }, halts);
    assert.equal(search.current()!.x, 200);
    search.step(0, probes);
    assert.deepEqual(search.step(0.02, probes), { kind: 'land', at: halts[1], from: halts[1] });
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
  assert.deepEqual(search.step(0.02, p), { kind: 'land', at: halts[0], from: candidates[1] });
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
const built = (h: ReturnCandidate) => !!h.halt && (h.halt.startsWith('line1:') || h.halt.startsWith('line2:'));
const run = (search: ReturnType<typeof createReturnSearch>, p: Parameters<typeof search.step>[1]) => {
  for (let t = 0; t < 20; t += 0.1) {
    const result = search.step(t, p);
    if (result.kind !== 'hold') return result;
  }
  throw new Error('the search never ended');
};
test('halts not standing in this room are never candidates, however near', () => {
  const all = haltLandings();
  // By the stack line, where the catalogue's future lines have halts nearer than any built one.
  const riding = { x: -84.3, y: 3.9, z: -1980.3, yaw: 0, at: 1000, ride: { x: -50, y: 1, z: -849.79 } };
  const unfiltered = returnCandidates(riding, all),
    standing = returnCandidates(riding, all, built);
  assert.ok(!built(unfiltered[0]!), 'the fixture needs an unbuilt halt nearest');
  assert.ok(standing.every(built));
  const expected = standing[0]!;
  const result = run(createReturnSearch(riding, all, built), {
    settled: () => true,
    standable: (p) => p === expected,
    near: (p) => (p === expected ? expected : null),
  });
  assert.equal(result.kind, 'land');
  assert.equal(result.kind === 'land' && result.from.halt, expected.halt);
});
test('two catalogue halts with one physical landing are one candidate', () => {
  const all = haltLandings();
  const gorge = all.find((p) => p.halt === 'line2:9')!;
  const twins = all.filter((p) => p.x === gorge.x && p.y === gorge.y && p.z === gorge.z);
  assert.ok(twins.length > 1, 'the fixture needs a shared landing (line2:9 and a future line at Gorge)');
  const list = returnCandidates({ ...gorge, yaw: 0, at: 1000, ride: { x: gorge.x + 40, y: 1, z: gorge.z } }, all);
  assert.equal(list.filter((p) => p.x === gorge.x && p.y === gorge.y && p.z === gorge.z).length, 1);
  assert.equal(new Set(list.map((p) => `${p.x}:${p.y}:${p.z}`)).size, list.length);
});
test('a failed Gorge landing goes on to the next standing halt, and the third nearest when two fail', () => {
  const all = haltLandings();
  const gorge = all.find((p) => p.halt === 'line2:9')!;
  const spot = { x: gorge.x, y: gorge.y, z: gorge.z, yaw: 0, at: 1000 };
  const halts = returnCandidates(spot, all, built).filter((p) => p.halt);
  assert.ok(halts.length >= 3);
  for (const k of [1, 2]) {
    const result = run(createReturnSearch(spot, all, built), {
      settled: () => true,
      standable: (p) => p === halts[k],
      near: (p) => (p === halts[k] ? halts[k]! : null),
    });
    assert.equal(result.kind === 'land' && result.from.halt, halts[k]!.halt, `halt ${k + 1} nearest`);
  }
});
test('the search gives up for Home once its time budget is spent, however many halts remain', () => {
  const all = haltLandings();
  const search = createReturnSearch({ x: 0, y: 5, z: 0, yaw: 0, at: 1000 }, all, built);
  const p = { settled: () => false, standable: () => false, near: () => null };
  let tried = 0;
  for (let t = 0; t <= RETURN_BUDGET_S; t += 0.5) {
    assert.deepEqual(search.step(t, p), { kind: 'hold' });
    tried = Math.max(tried, 1);
  }
  assert.deepEqual(search.step(RETURN_BUDGET_S + 0.01, p), { kind: 'home' });
  assert.ok(returnCandidates({ x: 0, y: 5, z: 0, yaw: 0, at: 1000 }, all, built).length > 4);
});
test('a train reload goes to the halt it was running to, falling back to the nearest', () => {
  const halts = [
    { x: 0, y: 1, z: 20, halt: 'line1:0' },
    { x: 170, y: 1, z: 20, halt: 'line1:1' },
    { x: 400, y: 1, z: 20, halt: 'line1:2' },
  ];
  const ride = { x: 12, y: 2, z: 20 }; // just out of the first halt, bound for the second
  const order = (halt?: string, stands?: (h: ReturnCandidate) => boolean) =>
    returnCandidates({ ...spot, x: 900, ride: { ...ride, ...(halt ? { halt } : {}) } }, halts, stands).map(
      (p) => p.halt,
    );
  assert.deepEqual(order(), ['line1:0', 'line1:1', 'line1:2'], 'no train known: nearest first');
  assert.deepEqual(order('line1:1'), ['line1:1', 'line1:0', 'line1:2'], 'the next halt first, then nearest');
  assert.deepEqual(order('line9:4'), ['line1:0', 'line1:1', 'line1:2'], 'an unknown halt: nearest');
  assert.deepEqual(
    order('line1:1', (h) => h.halt !== 'line1:1'),
    ['line1:0', 'line1:2'],
    'a next halt that does not stand: nearest',
  );
  const riding = captureReturnSpot(spot, { standing: false, standable: false, pos: ride, yaw: 0, halt: 'line1:1' }, 5);
  assert.deepEqual(riding!.ride, { ...ride, halt: 'line1:1' });
  assert.deepEqual(readReturnSpot(JSON.parse(JSON.stringify(riding)), 6, 1000), riding);
  for (const halt of [7, '', 'x'.repeat(40), 'line1:', '<script>:1'])
    assert.equal(readReturnSpot({ ...spot, ride: { ...ride, halt } }, 1001, 1000), null, `halt ${String(halt)}`);
  assert.equal(
    captureReturnSpot(spot, { standing: false, standable: false, pos: ride, yaw: 0, halt: 'bad id' }, 5)!.ride!.halt,
    undefined,
  );
});
test('a fallback halt faces its track, which lies beside its platform', () => {
  // Forward is (-sin yaw, -cos yaw): facing +x from the origin is yaw -pi/2.
  assert.ok(Math.abs(yawToward({ x: 0, z: 0 }, { x: 5, z: 0 }) + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(yawToward({ x: 0, z: 0 }, { x: 0, z: -5 })) < 1e-9);
  for (const p of haltLandings().filter(built)) {
    assert.ok(p.track && p.line !== undefined && p.stop !== undefined, `${p.halt}`);
    const d = Math.hypot(p.x - p.track.x, p.z - p.track.z);
    // A checked landing can stand up to 30 m from its platform; the track runs beside the platform.
    assert.ok(d < 35, `${p.halt}: the track is ${d.toFixed(1)} m from the landing`);
  }
});
test('candidate order uses the spot within 25m, then every halt nearest the last sighting first', () => {
  const halts = [
    { x: 0, y: 1, z: 20 },
    { x: 35, y: 1, z: 20 },
    { x: 60, y: 1, z: 20 },
  ];
  assert.deepEqual(returnCandidates(spot, halts), [{ x: 10, y: 12, z: 20 }, halts[0], halts[1], halts[2]]);
  assert.deepEqual(returnCandidates({ ...spot, ride: { x: 36, y: 20, z: 20 } }, halts), [halts[1], halts[2], halts[0]]);
  assert.equal(returnCandidates({ ...spot, ride: { x: 35, y: 20, z: 20 } }, halts).length, 4);
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
