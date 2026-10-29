import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SHORE,
  DROP_OFFSETS,
  MAX_ITEMS,
  REGROW_TICKS,
  LIFE,
  createGifts,
  canDrop,
  dropFruit,
  takeItem,
  treeFruit,
  tickGifts,
  serializeGifts,
  loadGifts,
  hashGifts,
} from '../src/sim/gifts.js';
import { GIFTS } from '../src/gift-catalog.js';

const SEED = 20261028;
const layout = () => ({
  trees: [
    { i: 40, j: 40 },
    { i: 60, j: 70 },
    { i: 80, j: 30 },
  ],
  shore: Array.from({ length: 60 }, (_, k) => [10 + k, 100 + (k % 5)]),
});
const run = (s, from, to) => {
  for (let t = from; t <= to; t++) tickGifts(s, t, SEED);
};

test('same ticks and edits give the same island on every client', () => {
  const a = createGifts(layout()),
    b = createGifts(layout());
  for (const s of [a, b]) {
    run(s, 1, 3000);
    dropFruit(s, 1, 3001);
    takeItem(s, s.items[0].id);
    run(s, 3002, 5000);
  }
  assert.equal(hashGifts(a), hashGifts(b));
  assert.deepEqual(serializeGifts(a), serializeGifts(b));
});

test('shore items wash up over time, never past MAX_SHORE', () => {
  const s = createGifts(layout());
  run(s, 1, 400);
  assert.ok(s.items.length >= 3, 'an empty beach fills quickly');
  run(s, 401, LIFE.shore - 1);
  assert.equal(s.items.length, MAX_SHORE);
  for (const it of s.items) {
    assert.equal(GIFTS[it.kind].src, 'shore');
    assert.ok(s.shore.some(([i, j]) => i === it.i && j === it.j));
  }
});

test('the tide takes old shore items back', () => {
  const s = createGifts(layout());
  run(s, 1, 1);
  const first = s.items[0].id;
  run(s, 2, LIFE.shore + 1);
  assert.ok(!s.items.some((it) => it.id === first));
});

test('a palm drops one fruit, then regrows', () => {
  const s = createGifts(layout());
  const it = dropFruit(s, 2, 10);
  assert.equal(it.kind, treeFruit(2));
  assert.equal(GIFTS[it.kind].src, 'tree');
  assert.equal(dropFruit(s, 2, 11), null);
  assert.equal(canDrop(s, 2, 10 + REGROW_TICKS - 1), false);
  assert.equal(canDrop(s, 2, 10 + REGROW_TICKS), true);
  assert.equal(canDrop(s, 3, 10), false, 'no such tree');
  assert.equal(canDrop(s, 0.5, 10), false);
});

test('taking an item works once', () => {
  const s = createGifts(layout());
  const it = dropFruit(s, 0, 5);
  assert.equal(takeItem(s, it.id)?.id, it.id);
  assert.equal(takeItem(s, it.id), null);
});

test('ground items never exceed MAX_ITEMS', () => {
  const s = createGifts({ trees: Array.from({ length: 64 }, (_, k) => ({ i: k, j: 5 })), shore: layout().shore });
  for (let t = 0; t < 64; t++) dropFruit(s, t, 1);
  assert.equal(s.items.length, MAX_ITEMS);
  assert.equal(canDrop(s, 63, 1), false);
});

test('snapshot round-trips and hashes match', () => {
  const a = createGifts(layout());
  run(a, 1, 2000);
  dropFruit(a, 0, 2001);
  const b = createGifts(layout());
  loadGifts(b, JSON.parse(JSON.stringify(serializeGifts(a))));
  assert.equal(hashGifts(b), hashGifts(a));
  run(a, 2002, 2600);
  run(b, 2002, 2600);
  assert.equal(hashGifts(b), hashGifts(a));
});

test('load drops bad items and survives garbage', () => {
  const s = createGifts(layout());
  loadGifts(s, {
    r: [5, 'x'],
    it: [1, 0, 3, 4, 0, 0, 2, 999, 3, 4, 0, 0, 3, 1, 1.5, 4, 0, 0, 9, 1, 3, 4, 7, 0],
    n: 10,
  });
  assert.deepEqual(
    s.items.map((it) => it.id),
    [1],
  );
  assert.equal(s.ripeAt[0], 5);
  assert.equal(s.ripeAt[1], 0);
  for (const bad of [null, 'nope', [], { it: 'x' }]) {
    loadGifts(s, bad);
    assert.equal(s.items.length, 0);
  }
});

test('fruit lands on the requested side, and bad directions are refused', () => {
  const s = createGifts(layout());
  const it = dropFruit(s, 0, 1, 2);
  assert.deepEqual([it.i - 40, it.j - 40], DROP_OFFSETS[2]);
  assert.equal(canDrop(s, 1, 1, 8), false);
  assert.equal(canDrop(s, 1, 1, -1), false);
  assert.equal(canDrop(s, 1, 1, 1.5), false);
});
