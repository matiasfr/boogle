import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeRuns, loadHomeLand } from '../src/host/land.ts';
import { PATCH } from '../../src/sim/mushrooms.ts';

test('decodeRuns alternates off and on and must cover the grid', () => {
  assert.deepEqual([...decodeRuns([2, 3, 1], 6)], [0, 0, 1, 1, 1, 0]);
  assert.deepEqual([...decodeRuns([0, 2], 2)], [1, 1]);
  assert.throws(() => decodeRuns([2, 3], 6), /covers 5 cells/);
});

test('the home land: n * n cells, the corner dry, the mushroom patch plantable', () => {
  const { land, canPlantAt } = loadHomeLand();
  assert.ok(land.n > 100 && Array.isArray(land.layout.trees));
  assert.equal(canPlantAt(0, 0), false);
  assert.equal(canPlantAt(-1, 5), false);
  assert.equal(canPlantAt(land.n, 5), false);
  let inPatch = 0;
  for (let i = PATCH.i0; i < PATCH.i0 + PATCH.w; i++)
    for (let j = PATCH.j0; j < PATCH.j0 + PATCH.h; j++) if (canPlantAt(i, j)) inPatch++;
  assert.ok(inPatch > 0, 'no plantable cell in the mushroom patch');
});
