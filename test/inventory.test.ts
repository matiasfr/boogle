import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  },
});
store.set(
  'boogle.hotbar',
  JSON.stringify([
    null,
    { id: 'nonsense' },
    { id: 'ball' },
    { id: 'seeds', n: 99 },
    { id: 'can' },
    { id: 'frisbee' },
    { id: 'seeds', n: 3 },
    { id: 'seeds', n: 2 },
  ]),
);
const { inv, SLOTS, cycle, select } = await import('../src/player/inventory.js');

test('a longer save compacts to the first five filled known items', () => {
  assert.equal(SLOTS, 5);
  assert.equal(inv.slots.length, 5);
  assert.deepEqual(
    inv.slots.map((s) => s && s.id),
    ['seeds', 'can', 'frisbee', 'seeds', 'seeds'],
  );
  assert.equal(inv.slots[0].n, 20, 'seeds are clamped to 20');
  assert.equal(inv.slots[3].n, 3);
});

test('cycling wraps and select outside the bar does nothing', () => {
  inv.sel = 4;
  cycle(1);
  assert.equal(inv.sel, 0);
  select(5);
  assert.equal(inv.sel, 0);
});
