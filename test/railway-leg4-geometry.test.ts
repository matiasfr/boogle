import assert from 'node:assert/strict';
import test from 'node:test';
import { tracks } from '../dev/level/rail-network.ts';
import { checkLeg4 } from '../dev/level/route-leg4.ts';
import { measure } from '../dev/level/track-continuity.ts';
import { ENGINE_CAB } from '../src/entities/railway/engine.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';

test('the cave line meets the two-degree kink limit from West landing to the quay buffers', () => {
  const row = WORLD_LINES.find((line) => line.id === 'cave')!;
  const west = row.stops[0]! / 100;
  const buffers = row.legs[1]!.toCm / 100 - 2;
  const track = tracks().find((entry) => entry.id === 'cave-centre')!;
  const kinks = measure(track).findings.filter((f) => f.kind === 'kink' && f.s >= west && f.s <= buffers);
  assert.deepEqual(
    kinks.map((f) => `${f.text} at ${f.s.toFixed(1)} m`),
    [],
  );
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
