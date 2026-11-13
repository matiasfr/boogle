// The halt displays' map names never overlap, leave the face or cover a stop's ring or standing train, for every
// display, including Home's shared island display.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHaltLabels } from './helpers/island-labels.ts';

test('every halt display places its names clear of each other, the edge and the stops', async () => {
  // The island's two edges share one display: five, then the stack line's three heads and High Gorge.
  assert.equal(await checkHaltLabels(), 9);
});
