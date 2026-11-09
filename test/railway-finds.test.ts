// The finds store (src/entities/finds/state.ts): a bad field never costs the others. (The gold finds' cases went with
// the owner's cut of the gold finds, 9 November.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFinds } from '../src/entities/finds/state.ts';

test('a malformed finds field starts empty and keeps the crystals', () => {
  const save = parseFinds(JSON.stringify({ crystals: [2], finds: [1, 1] }));
  assert.deepEqual(save, { crystals: [2], finds: [], secrets: [], hubbed: [] });
});
