import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REST_GAP,
  MAX_XZ_CM,
  createBallRest,
  canRest,
  rest,
  serializeBallRest,
  loadBallRest,
  hashBallRest,
} from '../src/sim/ball-rest.ts';
import { HALF } from '../src/world/grid.ts';

test('canRest rejects floats, out-of-range values and a second rest within REST_GAP', () => {
  const s = createBallRest();
  assert.equal(canRest(s, 100, 50, -200, 0), true);
  assert.equal(canRest(s, 100.5, 50, -200, 0), false);
  assert.equal(canRest(s, '100', 50, -200, 0), false);
  assert.equal(canRest(s, MAX_XZ_CM + 1, 50, 0, 0), false);
  assert.equal(canRest(s, 0, 50, -MAX_XZ_CM - 1, 0), false);
  assert.equal(canRest(s, 0, 20001, 0, 0), false);
  assert.equal(canRest(s, 0, -1501, 0, 0), false);
  assert.equal(canRest(s, 0, 0, 0, 0.5), false);
  rest(s, 100, 50, -200, 10);
  assert.equal(canRest(s, 300, 50, 0, 10 + REST_GAP - 1), false);
  assert.equal(canRest(s, 300, 50, 0, 10 + REST_GAP), true);
});

test('a rest round-trips through serialize and load to the same hash', () => {
  const a = createBallRest();
  rest(a, 1200, 150, 2000, 77);
  const b = createBallRest();
  loadBallRest(b, JSON.parse(JSON.stringify(serializeBallRest(a))));
  assert.deepEqual(b, a);
  assert.equal(hashBallRest(b), hashBallRest(a));
  const empty = createBallRest();
  loadBallRest(empty, JSON.parse(JSON.stringify(serializeBallRest(createBallRest()))));
  assert.equal(empty.p, null);
});

test('load throws on a bad shape, so sync starts it fresh', () => {
  const s = createBallRest();
  for (const bad of [{ p: 'x' }, null, 'no', { p: [1, 2], at: 0 }, { p: [1.5, 2, 3], at: 0 }, { p: null, at: -1 }])
    assert.throws(() => loadBallRest(s, bad));
  assert.throws(() => loadBallRest(s, { p: [MAX_XZ_CM + 1, 0, 0], at: 0 }));
});

test('a null spot hashes differently from the spot [0, 0, 0]', () => {
  const a = createBallRest();
  const b = createBallRest();
  rest(b, 0, 0, 0, 0);
  assert.notEqual(hashBallRest(a), hashBallRest(b));
});

test('the horizontal limit is the world half size in centimetres', () => {
  assert.equal(MAX_XZ_CM, HALF * 100);
});
