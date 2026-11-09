// The wardrobe's rules (src/entities/wardrobe/state.ts): Place's try-on, keep, wear and swap, and a save that only
// ever holds catalog ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWardrobe, parseWardrobe, parseWorn, type WardrobeCatalog } from '../src/entities/wardrobe/state.ts';

const items = [
  { id: 'hat', name: "A conductor's hat", slot: 'hat' },
  { id: 'beanie', name: 'A beanie', slot: 'hat' },
  { id: 'scarf', name: 'A very long scarf', slot: 'accessory' },
  { id: 'critter', name: 'A small stowaway', slot: 'pet' },
  { id: 'paperhat', name: 'A paper work hat', slot: 'hat' },
];
const catalog: WardrobeCatalog = {
  items,
  wearable: (id, slot): id is string => items.some((g) => g.id === id && g.slot === slot),
};
function memory(text: string | null = null) {
  const store = { text, writes: 0 };
  return {
    store,
    io: {
      read: () => store.text,
      write: (t: string) => {
        store.text = t;
        store.writes++;
      },
    },
  };
}

test('a claim is granted, worn and saved at once', () => {
  const { store, io } = memory();
  const w = createWardrobe(catalog, io);
  assert.equal(w.wearing(), null);
  w.grant('hat', { wear: true });
  assert.deepEqual(w.wearing(), { hat: 'hat' });
  assert.equal(store.writes, 1);
  assert.deepEqual(parseWardrobe(store.text, catalog).worn, { hat: 'hat' });
});

test('trying on shows on you without owning it, and what it replaced comes back', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  w.grant('hat', { wear: true });
  assert.equal(w.tryOn('paperhat'), true);
  assert.deepEqual(w.wearing(), { hat: 'paperhat' });
  assert.deepEqual(w.inspect().worn, { hat: 'hat' });
  assert.equal(w.isOwned('paperhat'), false);
  w.tryOn('beanie'); // another in the same slot still remembers the conductor's hat
  w.untry();
  assert.deepEqual(w.wearing(), { hat: 'hat' });
  assert.equal(w.tryOn('critter'), false); // the pet slot isn't worn
});

test('keeping, swapping and taking off', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  w.grant('hat', { wear: true });
  w.tryOn('paperhat');
  assert.equal(w.keepTried(), 'paperhat');
  assert.deepEqual(w.inspect().bought, ['paperhat']);
  assert.deepEqual(w.wearing(), { hat: 'paperhat' });
  assert.equal(w.swapLabel('hat', 'Take it off'), 'Swap hat: Take it off');
  w.swapSlot('hat');
  assert.equal(w.wearing(), null);
  assert.equal(w.swapLabel('hat', 'Take it off'), "Swap hat: A conductor's hat");
  w.swapSlot('hat');
  assert.deepEqual(w.wearing(), { hat: 'hat' });
  w.takeOff('hat');
  assert.equal(w.wearing(), null);
  w.wearOwned('beanie'); // not owned: nothing happens
  assert.equal(w.wearing(), null);
});

test('a bad save starts empty, and a good one comes back', () => {
  for (const text of [
    '{',
    '[]',
    JSON.stringify({ got: ['nope'], bought: [], worn: {}, dry: 0, opened: [] }),
    JSON.stringify({ got: ['hat'], bought: [], worn: { hat: 'beanie' }, dry: 0, opened: [] }),
    JSON.stringify({ got: ['hat', 'hat'], bought: [], worn: {}, dry: 0, opened: [] }),
    JSON.stringify({ got: [], bought: [], worn: {}, dry: -1, opened: [] }),
    JSON.stringify({ got: [], bought: [], worn: {}, dry: 0, opened: ['<script>'] }),
  ])
    assert.deepEqual(parseWardrobe(text, catalog), { got: [], bought: [], worn: {}, dry: 0, opened: [] }, text);
  const good = { got: ['hat', 'scarf'], bought: ['paperhat'], worn: { hat: 'paperhat' }, dry: 2, opened: ['T3'] };
  const w = createWardrobe(catalog, memory(JSON.stringify(good)).io);
  assert.deepEqual(w.wearing(), { hat: 'paperhat' });
  assert.deepEqual(w.inspect().got, ['hat', 'scarf']);
});

test("a partner's presence keeps only catalog ids in their own slot", () => {
  assert.deepEqual(parseWorn({ hat: 'scarf', accessory: 'scarf', outfit: 1, pet: 'critter' }, catalog), {
    accessory: 'scarf',
  });
  assert.deepEqual(parseWorn('hat', catalog), {});
  assert.deepEqual(parseWorn(null, catalog), {});
});
