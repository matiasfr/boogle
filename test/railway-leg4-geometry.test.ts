import assert from 'node:assert/strict';
import test from 'node:test';
import { tracks } from '../dev/level/rail-network.ts';
import { checkLeg4 } from '../dev/level/route-leg4.ts';
import { LIMITS, measure } from '../dev/level/track-continuity.ts';
import { ENGINE_CAB } from '../src/entities/railway/engine.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';

test('only the three surveyed corners exceed two degrees from West landing to the quay buffers', () => {
  const row = WORLD_LINES.find((line) => line.id === 'cave')!;
  const west = row.stops[0]! / 100;
  const buffers = row.legs[1]!.toCm / 100 - 2;
  const track = tracks().find((entry) => entry.id === 'cave-centre')!;
  assert.equal(LIMITS.kinkSoft, 2);
  const kinks = measure(track).findings.filter(
    (f) => (f.kind === 'kink' || f.kind === 'reversed') && f.s >= west && f.s <= buffers,
  );
  const corners = [
    { s: 65.3, degrees: 23.8 },
    { s: 322.7, degrees: 12.4 },
    { s: 1080.6, degrees: 20.8 },
  ];
  assert.deepEqual(kinks.map((k) => Number(k.s.toFixed(1))), corners.map((corner) => corner.s));
  for (const [i, kink] of kinks.entries()) {
    const { s, degrees } = corners[i]!;
    assert.ok(Math.abs(kink.value - degrees) <= 0.5, `at ${s} m: ${kink.value}° outside ${degrees}° ± 0.5°`);
  }
});

test('the cave hood clearance check fails when the cab roof reaches the hood', () => {
  assert.equal(checkLeg4().failures, 0, 'the current standard train fits');
  const original = ENGINE_CAB.roofTop;
  try {
    ENGINE_CAB.roofTop = 7;
    const hood = checkLeg4().entries.find((entry) => entry.message.startsWith('Planned hood'))!;
    assert.equal(hood.passed, false, hood.message);
  } finally {
    ENGINE_CAB.roofTop = original;
  }
});
