// The wardrobe's rules (src/entities/wardrobe/state.ts): Place's try-on, keep, wear and swap, and a save that only
// ever holds catalog ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWardrobe,
  parseStowaway,
  parseWardrobe,
  parseWorn,
  type WardrobeCatalog,
} from '../src/entities/wardrobe/state.ts';
import { startPage } from '../src/player/pause-pages.ts';

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

test('the stowaway comes out of its box, swaps at the shelf and is kept, but is never worn', () => {
  const { store, io } = memory();
  const w = createWardrobe(catalog, io);
  w.openBox('Q5', 'critter', false);
  assert.equal(w.pet(), null); // still in its box until the card is put away
  w.unbox('critter');
  assert.equal(w.pet(), 'critter');
  assert.equal(w.wearing(), null); // not in the `wardrobe` presence
  assert.deepEqual(parseWardrobe(store.text, catalog).worn, { pet: 'critter' });
  assert.equal(w.swapLabel('pet', 'Take it off'), 'Swap pet: Take it off');
  w.swapSlot('pet');
  assert.equal(w.pet(), null);
  assert.equal(w.swapLabel('pet', 'Take it off'), 'Swap pet: A small stowaway');
  w.swapSlot('pet');
  w.flush();
  assert.equal(createWardrobe(catalog, io).pet(), 'critter'); // a reload keeps it out
  assert.deepEqual(
    parseWardrobe(JSON.stringify({ got: ['hat'], bought: [], worn: { pet: 'hat' }, dry: 0, opened: [] }), catalog).worn,
    {},
  );
});

test("a partner's stowaway is a riding flag and nothing else", () => {
  assert.deepEqual(parseStowaway({ riding: true }), { riding: true });
  assert.deepEqual(parseStowaway({ riding: false, extra: 1 }), { riding: false });
  for (const v of [null, undefined, true, 'critter', [], { riding: 'yes' }, {}]) assert.equal(parseStowaway(v), null);
});

test('cycling a slot walks what you own, nothing at the left end, wrapping both ways', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  w.grant('paperhat', { wear: false });
  w.grant('hat', { wear: false });
  w.grant('beanie', { wear: false }); // not granted in catalog order; the cycle still is
  w.grant('scarf', { wear: false }); // other slots don't join the hat cycle
  const seen = (dir: 1 | -1, n: number) => Array.from({ length: n }, () => (w.cycleSlot('hat', dir), w.current('hat')));
  assert.equal(w.current('hat'), null);
  assert.deepEqual(seen(1, 5), ['hat', 'beanie', 'paperhat', null, 'hat']);
  assert.deepEqual(seen(-1, 3), [null, 'paperhat', 'beanie']);
  assert.deepEqual(w.wearing(), { hat: 'beanie' }); // what presence sends
  assert.equal(w.current('accessory'), null);
});

test('cycling never reaches what you do not own, and a slot with nothing owned stays put', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  w.cycleSlot('hat', 1);
  assert.equal(w.current('hat'), null);
  w.grant('beanie', { wear: false });
  for (let k = 0; k < 6; k++) {
    w.cycleSlot('hat', 1);
    assert.ok([null, 'beanie'].includes(w.current('hat')));
  }
  w.cycleSlot('pet', 1);
  assert.equal(w.pet(), null);
  w.grant('critter', { wear: false });
  w.cycleSlot('pet', 1);
  assert.equal(w.pet(), 'critter'); // the pet is in the cycle like the rest
  w.cycleSlot('pet', -1);
  assert.equal(w.pet(), null);
});

test('cycling drops a shop try-on in that slot', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  w.grant('hat', { wear: true });
  w.tryOn('paperhat');
  w.cycleSlot('hat', 1);
  assert.equal(w.tried(), null);
  assert.equal(w.current('hat'), null); // one step on from the conductor's hat is nothing
  assert.deepEqual(w.inspect().worn, {});
});

test('Pause opens on You only once you own something to wear', () => {
  const { io } = memory();
  const w = createWardrobe(catalog, io);
  const pages = [{ id: 'graphics' }, { id: 'you', start: () => w.ownsWearable() }];
  assert.equal(w.ownsWearable(), false);
  assert.equal(startPage(pages), undefined); // a new player lands on Options
  w.grant('hat', { wear: true });
  assert.equal(startPage(pages)?.id, 'you');
  w.takeOff('hat'); // owning is what counts, not wearing
  assert.equal(startPage(pages)?.id, 'you');
  const pet = createWardrobe(catalog, memory().io);
  pet.grant('critter', { wear: false });
  assert.equal(pet.ownsWearable(), true);
  assert.equal(startPage([{ id: 'x' }]), undefined);
});
