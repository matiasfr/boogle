import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ITEMS,
  LIFE,
  ON_GROUND,
  ON_PERCH,
  PERCH_REFILL,
  SRC,
  createGifts,
  takeItem,
  tossItem,
  tickGifts,
  serializeGifts,
  loadGifts,
  hashGifts,
} from '../src/sim/gifts.ts';
import { GIFTS, giftIndex, carryable } from '../src/sim/gift-catalog.ts';

const layout = () => ({ perches: [{ i: 200, j: 150, kind: giftIndex('frisbee') }] });
const run = (s: ReturnType<typeof createGifts>, from: number, to: number) => {
  for (let t = from; t <= to; t++) tickGifts(s, t);
};

test('same ticks and edits give the same island on every client', () => {
  const a = createGifts(layout()),
    b = createGifts(layout());
  for (const s of [a, b]) {
    run(s, 1, 3000);
    tossItem(s, giftIndex('can'), 30, 31, ON_GROUND, 3001);
    takeItem(s, s.items[0].id);
    run(s, 3002, 5000);
  }
  assert.equal(hashGifts(a), hashGifts(b));
  assert.deepEqual(serializeGifts(a), serializeGifts(b));
});

test('a perch holds its item and refills PERCH_REFILL ticks after it is taken', () => {
  const s = createGifts(layout());
  run(s, 1, 1);
  const on = () => s.items.filter((it) => it.src === SRC.PERCH);
  assert.deepEqual(
    on().map((it) => [it.kind, it.i, it.j, it.y]),
    [[giftIndex('frisbee'), 200, 150, ON_PERCH]],
  );
  run(s, 2, LIFE + 10);
  assert.equal(on().length, 1, 'a perch item never rots');
  takeItem(s, on()[0].id, 20000);
  run(s, 20001, 20000 + PERCH_REFILL - 1);
  assert.equal(on().length, 0);
  run(s, 20000 + PERCH_REFILL, 20000 + PERCH_REFILL);
  assert.equal(on().length, 1);
});

test('thrown things land where they were thrown and rot after LIFE ticks', () => {
  const s = createGifts({});
  const can = giftIndex('can');
  const it = tossItem(s, can, 7, 9, 2950, 100)!;
  assert.deepEqual([it.kind, it.i, it.j, it.y, it.src], [can, 7, 9, 2950, SRC.TOSS]);
  assert.equal(tossItem(s, can, 7, 9, -2, 100), null, 'only perches use ON_PERCH');
  assert.equal(tossItem(s, giftIndex('ball'), 7, 9, ON_GROUND, 100), null, 'the beach ball is never a ground item');
  assert.equal(tossItem(s, can, -1, 9, ON_GROUND, 100), null);
  run(s, 101, 100 + LIFE - 1);
  assert.equal(s.items.length, 1);
  run(s, 100 + LIFE, 100 + LIFE);
  assert.equal(s.items.length, 0);
});

test('a full island sweeps away the oldest thrown thing to make room', () => {
  const s = createGifts({});
  const can = giftIndex('can');
  for (let k = 0; k < MAX_ITEMS; k++) tossItem(s, can, k, 0, ON_GROUND, k);
  const it = tossItem(s, can, 99, 0, ON_GROUND, 500)!;
  assert.equal(s.items.length, MAX_ITEMS);
  assert.equal(s.items[0].i, 1);
  assert.equal(s.items.at(-1)!.id, it.id);
});

test('taking an item works once', () => {
  const s = createGifts({});
  const it = tossItem(s, giftIndex('can'), 5, 5, ON_GROUND, 5)!;
  assert.equal(takeItem(s, it.id)?.id, it.id);
  assert.equal(takeItem(s, it.id), null);
});

test('ground items never exceed MAX_ITEMS', () => {
  const s = createGifts({});
  for (let k = 0; k < MAX_ITEMS + 20; k++) tossItem(s, giftIndex('can'), k, 5, ON_GROUND, 1);
  assert.equal(s.items.length, MAX_ITEMS);
});

test('snapshot round-trips and hashes match', () => {
  const a = createGifts(layout());
  run(a, 1, 2000);
  tossItem(a, giftIndex('can'), 30, 31, 1210, 2001);
  takeItem(a, a.items.find((it) => it.src === SRC.PERCH)!.id, 2001);
  const json = JSON.parse(JSON.stringify(serializeGifts(a)));
  assert.deepEqual(Object.keys(json).sort(), ['it', 'n', 'pa']);
  const b = createGifts(layout());
  loadGifts(b, json);
  assert.equal(hashGifts(b), hashGifts(a));
  run(a, 2002, 2600);
  run(b, 2002, 2600);
  assert.equal(hashGifts(b), hashGifts(a));
});

test('load drops bad items and survives garbage', () => {
  const s = createGifts(layout());
  loadGifts(s, {
    pa: [5, 'x'],
    // ok; kind out of range; a float cell; id at nextId; a perch item that is not on its perch (y), a toss on the perch
    it: [
      1,
      0,
      3,
      4,
      SRC.TOSS,
      0,
      -1,
      2,
      999,
      3,
      4,
      SRC.TOSS,
      0,
      -1,
      3,
      1,
      1.5,
      4,
      SRC.TOSS,
      0,
      -1,
      10,
      1,
      3,
      4,
      SRC.TOSS,
      0,
      -1,
    ],
    n: 10,
  });
  assert.deepEqual(
    s.items.map((it) => it.id),
    [1],
  );
  assert.equal(s.perchAt[0], 5);
  assert.equal(s.perchAt[1], 0);
  loadGifts(s, {
    it: [1, 0, 3, 4, SRC.TOSS, 0, -5, 2, 0, 3, 4, SRC.PERCH, 0, ON_GROUND, 3, 0, 3, 4, SRC.TOSS, 0, 40],
    n: 9,
  });
  assert.deepEqual(
    s.items.map((it) => it.id),
    [3],
  );
  for (const bad of [null, 'nope', [], { it: 'x' }]) {
    loadGifts(s, bad);
    assert.equal(s.items.length, 0);
  }
});

test('only the ball is not carryable', () => {
  for (const g of GIFTS) assert.equal(carryable(g), g.id !== 'ball', g.id);
  assert.deepEqual(
    GIFTS.map((g) => g.id),
    ['seeds', 'can', 'frisbee', 'ball'],
  );
  assert.ok(GIFTS.filter(carryable).every((g) => g.name && g.taste && g.line));
});
