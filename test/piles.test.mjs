// Ground piles (src/sim/piles.js): drops merge when near and conserve every unit, caps hold, takes are partial, and
// serialize/load round-trips with the same hash.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPiles,
  dropPile,
  takePile,
  totalOf,
  room,
  serializePiles,
  loadPiles,
  hashPiles,
  MAX_PILES,
  PILE_CAP,
} from '../src/sim/piles.js';

test('a drop near a same-kind pile joins it; another kind or a far spot makes a new pile', () => {
  const s = createPiles();
  dropPile(s, 100, 100, 0, 5);
  dropPile(s, 102, 99, 0, 3);
  assert.equal(s.list.length, 1);
  assert.equal(s.list[0].n, 8);
  dropPile(s, 100, 100, 1, 4); // ore beside logs
  dropPile(s, 110, 100, 0, 2);
  assert.equal(s.list.length, 3);
  assert.equal(totalOf(s, 0), 10);
});

test('past PILE_CAP the rest spills into a new pile beside it; nothing is lost', () => {
  const s = createPiles();
  dropPile(s, 50, 50, 0, PILE_CAP - 2);
  const r = dropPile(s, 50, 50, 0, 10);
  assert.equal(r.placed, 10);
  assert.equal(s.list.length, 2);
  assert.equal(s.list[0].n, PILE_CAP);
  assert.notDeepEqual([s.list[1].i, s.list[1].j], [50, 50]);
  assert.equal(totalOf(s, 0), PILE_CAP + 8);
});

test('a full room merges into the nearest same-kind pile; another kind has no room', () => {
  const s = createPiles();
  for (let k = 0; k < MAX_PILES; k++) dropPile(s, 10 + (k % 16) * 5, 10 + Math.floor(k / 16) * 5, 0, 1);
  assert.equal(s.list.length, MAX_PILES);
  const r = dropPile(s, 200, 200, 0, 7);
  assert.equal(r.placed, 7);
  assert.equal(s.list.length, MAX_PILES);
  assert.equal(totalOf(s, 0), MAX_PILES + 7);
  assert.equal(room(s, 200, 200, 1, 5), 0);
  assert.equal(room(s, 200, 200, 0, 5), 5);
  assert.equal(dropPile(s, 200, 200, 1, 5).placed, 0);
});

test('takes are partial; an emptied pile goes', () => {
  const s = createPiles();
  dropPile(s, 5, 5, 0, 6);
  const id = s.list[0].id;
  assert.deepEqual(takePile(s, id, 4), { id, k: 0, n: 4 });
  assert.deepEqual(takePile(s, id, 9), { id, k: 0, n: 2 });
  assert.equal(s.list.length, 0);
  assert.equal(takePile(s, id, 1), null);
});

test('serialize/load round-trips with the same hash; bad data throws', () => {
  const s = createPiles();
  dropPile(s, 5, 5, 0, 6);
  dropPile(s, 40, 5, 2, 3);
  const t = createPiles();
  loadPiles(t, JSON.parse(JSON.stringify(serializePiles(s))));
  assert.equal(hashPiles(t), hashPiles(s));
  assert.deepEqual(t.list, s.list);
  assert.notEqual(hashPiles(createPiles()), hashPiles(s));
  assert.throws(() => loadPiles(t, { id: 2, p: [1, 5, 5, 0, 0] }), /bad pile/);
  assert.throws(() => loadPiles(t, { id: 2, p: [3, 5, 5, 0, 1] }), /bad pile/);
  assert.throws(() => loadPiles(t, { id: 1, p: [1, 5] }), /bad snapshot/);
});

test('room() is exact: a drop where every spot is taken and no same-kind pile exists places nothing', () => {
  const s = createPiles();
  for (const [di, dj] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ])
    dropPile(s, 50 + di * 3, 50 + dj * 3, 1, 1); // ore piles far enough apart not to merge
  const t = createPiles();
  for (const [di, dj] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ])
    t.list.push({ id: t.nextId++, i: 50 + di, j: 50 + dj, k: 1, n: 1 });
  assert.equal(room(t, 50, 50, 0, 4), 0);
  assert.equal(dropPile(t, 50, 50, 0, 4).placed, 0);
  assert.equal(room(s, 50, 50, 0, 4), 4);
});
