// The finds store (src/entities/finds/state.ts): a gold find is taken once, written at once, and a bad field never
// costs the others.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFinds, parseFinds } from '../src/entities/finds/state.ts';

const memory = (text: string | null = null) => {
  const box = { text };
  return { box, storage: { read: () => box.text, write: (t: string) => void (box.text = t) } };
};

test('a gold find is taken once and written at once', () => {
  const { box, storage } = memory();
  const store = createFinds(storage);
  const seen: string[] = [];
  store.onFinds((e) => seen.push(`${e.kind} ${e.id}`));
  assert.equal(store.takeFind(11), true);
  assert.equal(store.takeFind(11), false);
  assert.equal(store.hasFind(11), true);
  assert.deepEqual(parseFinds(box.text).finds, [11]);
  assert.deepEqual(seen, ['find 11']);
});

test('a find id outside 0–99 is refused', () => {
  const store = createFinds(memory().storage);
  for (const id of [-1, 100, 1.5, Number.NaN]) assert.equal(store.takeFind(id), false);
  assert.deepEqual(store.finds(), []);
});

test('a malformed finds field starts empty and keeps the crystals', () => {
  const save = parseFinds(JSON.stringify({ crystals: [2], finds: [1, 1] }));
  assert.deepEqual(save, { crystals: [2], finds: [], secrets: [], hubbed: [] });
});
