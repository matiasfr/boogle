import assert from 'node:assert/strict';
import test from 'node:test';
import { tracks } from '../dev/level/rail-network.ts';
import { measure } from '../dev/level/track-continuity.ts';
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
