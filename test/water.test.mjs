import test from 'node:test';
import assert from 'node:assert/strict';
import { createWater } from '../src/sim/water.js';

const mk = (W, H, f) => {
  const t = new Int32Array(W * H);
  for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) t[i * H + j] = f(i, j) | 0;
  return t;
};
const run = (w, n) => {
  for (let k = 0; k < n; k++) w.step();
};
const total = (w) => w.stats().total;
const bal = (w) => {
  const s = w.stats();
  return s.total - (s.added + s.seaNet - s.evaporated);
};

test('closed basin conserves water exactly', () => {
  const t = mk(24, 24, (i, j) => (i === 0 || j === 0 || i === 23 || j === 23 ? 10000 : (i * 7 + j * 3) % 40));
  const w = createWater({ width: 24, height: 24, terrain: t, seaEdges: 0, evapInterval: 0 });
  w.addWater(5, 5, 500);
  w.addWater(18, 12, 300);
  run(w, 500);
  assert.equal(total(w), 800);
  assert.equal(bal(w), 0);
});

test('water flows downhill and pools at the bottom', () => {
  const t = mk(20, 20, (i) => 1000 - i * 50);
  const w = createWater({ width: 20, height: 20, terrain: t, seaEdges: 0, evapInterval: 0 });
  w.addWater(2, 10, 400);
  run(w, 300);
  let low = 0;
  for (let j = 0; j < 20; j++) low += w.depth[19 * 20 + j];
  assert.ok(low > 300, `expected most water at low edge, got ${low}`);
  assert.equal(total(w), 400);
});

test('water poured at the head of a channel reaches a target basin', () => {
  const t = mk(40, 40, () => 500);
  for (let i = 5; i <= 30; i++) t[i * 40 + 20] = 400 - i * 4; // channel sloping down
  for (let i = 30; i <= 34; i++) for (let j = 18; j <= 22; j++) t[i * 40 + j] = 200; // basin
  const w = createWater({ width: 40, height: 40, terrain: t, seaEdges: 0 });
  for (let k = 0; k < 400; k++) {
    w.addWater(5, 20, 5); // a steady trickle at the head, poured before each step
    w.step();
  }
  assert.ok(w.depth[32 * 40 + 20] > 20, 'basin center should hold water');
  assert.equal(w.depth[10 * 40 + 5], 0, 'water stays in channel');
  assert.equal(bal(w), 0);
});

function scenario() {
  const t = mk(24, 24, (i, j) => 300 + ((i * 31 + j * 17) % 23) - Math.abs(i - 12) * 2);
  const w = createWater({ width: 24, height: 24, terrain: t, sea: 0 });
  w.addWater(12, 12, 2100);
  w.addWater(5, 5, 800);
  return w;
}

test('identical runs give identical hash after 300 ticks', () => {
  const a = scenario(),
    b = scenario();
  run(a, 300);
  run(b, 300);
  assert.equal(a.hash(), b.hash());
  assert.ok(Number.isInteger(a.hash()) && a.hash() >= 0 && a.hash() < 2 ** 32);
  assert.ok(a.stats().total > 0);
});

test('serialize/load mid-run then continue equals uninterrupted run', () => {
  const a = scenario();
  run(a, 150);
  const snap = JSON.parse(JSON.stringify(a.serialize()));
  run(a, 200);
  const b = createWater({ width: 24, height: 24, terrain: scenario().terrain });
  b.load(snap);
  assert.equal(b.hash(), JSON.parse(JSON.stringify(snap)) && b.hash());
  run(b, 200);
  assert.equal(b.hash(), a.hash());
});

test('load ignores the src field of snapshots from builds with springs', () => {
  const a = scenario();
  run(a, 50);
  const { src, ...snap } = a.serialize();
  assert.deepEqual(src, []); // still written, so tabs on those builds can load it
  const fresh = () => createWater({ width: 24, height: 24, terrain: scenario().terrain });
  const b = fresh();
  b.load({ ...snap, src: [b.idx(3, 3), 9] });
  const c = fresh();
  c.load(snap);
  assert.equal(b.hash(), a.hash());
  assert.equal(c.hash(), a.hash());
  run(a, 50);
  run(b, 50);
  assert.equal(b.hash(), a.hash());
});

test('sea fills a below-sea hole near the shore', () => {
  const t = mk(30, 30, () => 50);
  for (let i = 0; i <= 8; i++) t[i * 30 + 15] = -20;
  t[8 * 30 + 15] = -100;
  const w = createWater({ width: 30, height: 30, terrain: t, sea: 0, seaEdges: 1 });
  run(w, 300);
  const surf = t[8 * 30 + 15] + w.depth[8 * 30 + 15];
  assert.ok(Math.abs(surf) <= 9, `hole surface ${surf}`); // 1 cm slope per channel cell
  assert.ok(w.stats().seaNet > 80);
  assert.equal(bal(w), 0);
  // a hole without connection stays dry
  assert.equal(w.depth[20 * 30 + 3], 0);
});

test('raised pool drains into the sea when connected; rising sea floods', () => {
  const t = mk(30, 30, () => 50);
  for (let i = 0; i <= 8; i++) t[i * 30 + 15] = -20;
  const w = createWater({ width: 30, height: 30, terrain: t, sea: 0, seaEdges: 1, evapInterval: 0 });
  run(w, 100);
  w.addWater(8, 15, 300);
  run(w, 400);
  for (let i = 0; i <= 8; i++) {
    const s = t[i * 30 + 15] + w.depth[i * 30 + 15];
    assert.ok(Math.abs(s) <= i + 1, `cell ${i} surface ${s}`);
  }
  w.setSeaLevel(30);
  run(w, 300);
  const s = t[8 * 30 + 15] + w.depth[8 * 30 + 15];
  assert.ok(Math.abs(s - 30) <= 9, `after tide ${s}`);
});

test('active set goes quiet on still water', () => {
  const t = mk(40, 40, () => 100);
  const w = createWater({ width: 40, height: 40, terrain: t, seaEdges: 0, evapInterval: 0 });
  w.addWater(20, 20, 200);
  run(w, 500);
  const before = w.hash();
  assert.equal(w.stats().active, 0);
  run(w, 1);
  assert.equal(w.stats().active, 0);
  assert.equal(
    w.depth.reduce((a, b) => a + b, 0),
    200,
  );
  // terrain edit + wake restarts flow
  t[21 * 40 + 20] = 0;
  w.wake(21, 20);
  assert.ok(w.stats().active > 0);
  run(w, 100);
  assert.notEqual(w.hash(), before);
});

test('thin films evaporate; removeWater clamps', () => {
  const t = mk(20, 20, () => 100);
  const w = createWater({ width: 20, height: 20, terrain: t, seaEdges: 0, evapInterval: 5 });
  w.addWater(10, 10, 1);
  run(w, 10);
  assert.equal(total(w), 0);
  w.addWater(10, 10, 50);
  assert.equal(w.removeWater(10, 10, 999), 50);
});
