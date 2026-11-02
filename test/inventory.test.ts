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
    { id: 'seeds' },
    { id: 'can' },
    { id: 'frisbee' },
    { id: 'seeds' },
    { id: 'seeds' },
  ]),
);
const { inv, SLOTS, cycle, select, take, drop } = await import('../src/player/inventory.ts');

test('a longer save compacts to the first five filled known items', () => {
  assert.equal(SLOTS, 5);
  assert.equal(inv.slots.length, 5);
  assert.deepEqual(
    inv.slots.map((s) => s && s.id),
    ['seeds', 'frisbee', 'seeds', 'seeds', null],
  );
});

test('cycling wraps and select outside the bar does nothing', () => {
  inv.sel = 4;
  cycle(1);
  assert.equal(inv.sel, 0);
  select(5);
  assert.equal(inv.sel, 0);
});

test('take refuses an id that is not in the catalog', () => {
  drop('frisbee');
  const version = inv.version;
  assert.equal(take('driftwood'), false, 'a removed item never reaches a slot the HUD would name');
  assert.equal(inv.version, version);
  assert.ok(!inv.slots.some((s) => s?.id === 'driftwood'));
  assert.equal(take('frisbee'), true);
});
