// The finds store (src/entities/finds/state.ts): a bad field never costs the others. (The gold finds' cases went with
// the owner's cut of the gold finds, 9 November.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinds, parseFinds } from '../src/entities/finds/state.ts';

function memory() {
  const box: { text: string | null } = { text: null };
  return { box, storage: { read: () => box.text, write: (t: string) => void (box.text = t) } };
}

test('a malformed finds field starts empty and keeps the crystals', () => {
  const save = parseFinds(JSON.stringify({ crystals: [2], finds: [1, 1] }));
  assert.deepEqual(save, { crystals: [2], finds: [], secrets: [], hubbed: [] });
});

test('a secret is taken once, and its box at the bay is recorded apart, both at once', () => {
  const { box, storage } = memory();
  const store = createFinds(storage);
  assert.equal(store.hubSecret('yard'), true);
  assert.equal(store.hubSecret('yard'), false);
  assert.equal(store.takeSecret('yard'), true);
  assert.equal(store.takeSecret('yard'), false);
  assert.equal(store.takeSecret('no such!'), false);
  assert.deepEqual(parseFinds(box.text), { crystals: [], finds: [], secrets: ['yard'], hubbed: ['yard'] });
});
