import test from 'node:test';
import assert from 'node:assert/strict';
import { regionFromBase, checkSlosh, applySlosh, SLOSH } from '../src/sim/water-region.js';

test('regionFromBase boxes the land and pads, clamped to the grid', () => {
  const n = 10;
  const base = new Int32Array(n * n).fill(-500);
  base[4 * n + 5] = 100;
  base[6 * n + 3] = 50;
  assert.deepEqual(regionFromBase(base, n, -150, 1), { i0: 3, j0: 2, w: 5, h: 5 });
  assert.deepEqual(regionFromBase(base, n, -150, 20), { i0: 0, j0: 0, w: 10, h: 10 });
  assert.equal(regionFromBase(new Int32Array(n * n).fill(-500), n, -150, 1), null);
});

test('applySlosh conserves water and is deterministic', () => {
  const W = 12,
    H = 12;
  const mk = () => new Int32Array(W * H).fill(30);
  const a = mk(),
    b = mk();
  const sum = (d) => d.reduce((s, v) => s + v, 0);
  const moved = applySlosh(a, W, H, 6, 6, 300);
  applySlosh(b, W, H, 6, 6, 300);
  assert.ok(moved > 0 && moved <= SLOSH.maxCm);
  assert.equal(sum(a), sum(mk()));
  assert.deepEqual(a, b);
});

test('checkSlosh validates type, range, dryness and rate', () => {
  const water = { width: 12, height: 12, depth: new Int32Array(144).fill(20) };
  assert.equal(checkSlosh({ i: 6, j: 6, amt: 50 }, water, 100, 0), null);
  assert.equal(checkSlosh({ i: 6.5, j: 6, amt: 50 }, water, 100, 0), 'int');
  assert.equal(checkSlosh({ i: 6, j: 6, amt: 9999 }, water, 100, 0), 'amount');
  assert.equal(checkSlosh({ i: 0, j: 6, amt: 50 }, water, 100, 0), 'range');
  assert.equal(checkSlosh({ i: 6, j: 6, amt: 50 }, water, 101, 100), 'rate');
  water.depth[6 * 12 + 6] = 0;
  assert.equal(checkSlosh({ i: 6, j: 6, amt: 50 }, water, 100, 0), 'dry');
});
