import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSnaps } from '../src/netplay/snaps.js';

test('sample interpolates between the two snapshots around t', () => {
  const s = createSnaps();
  assert.equal(s.sample(0), null);
  s.push(100, { x: 0 });
  s.push(200, { x: 10 });
  s.push(300, { x: 20 });
  const r = s.sample(250);
  assert.deepEqual([r.a.x, r.b.x, r.u, r.over], [10, 20, 0.5, 0]);
  assert.equal(s.length, 2); // older samples are dropped once passed
});

test('before the first snapshot it holds; after the last it reports how far over', () => {
  const s = createSnaps();
  s.push(100, { x: 0 });
  assert.deepEqual(s.sample(50), { a: { x: 0, time: 100 }, b: { x: 0, time: 100 }, u: 0, over: 0 });
  assert.equal(s.sample(130).over, 30);
  s.push(200, { x: 10 });
  const r = s.sample(260);
  assert.deepEqual([r.u, r.over], [1, 60]);
});

test('the buffer is capped and clear empties it', () => {
  const s = createSnaps(3);
  for (let i = 0; i < 10; i++) s.push(i * 50, { i });
  assert.equal(s.length, 3);
  s.clear();
  assert.equal(s.sample(0), null);
});
