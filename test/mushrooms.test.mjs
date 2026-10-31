import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PATCH,
  SPACING,
  GROW_TICKS,
  MAX_PLOTS,
  createGarden,
  plant,
  canPlant,
  water,
  tickGarden,
  serializeGarden,
  loadGarden,
  hashGarden,
} from '../src/sim/mushrooms.ts';

const { i0, j0 } = PATCH;

test('plants on any whole grid cell, not just the dirt patch', () => {
  const g = createGarden();
  assert.equal(plant(g, -1, j0), false);
  assert.equal(plant(g, i0 + 0.5, j0), false);
  assert.equal(plant(g, i0, j0), true);
  assert.equal(plant(g, i0 + PATCH.w + 30, j0 - 100), true);
  assert.equal(plant(g, 2, 2), true);
});

test('stops taking seeds at MAX_PLOTS', () => {
  const g = createGarden();
  for (let k = 0; k < MAX_PLOTS; k++) assert.equal(plant(g, (k % 10) * SPACING, Math.floor(k / 10) * SPACING), true);
  assert.equal(canPlant(g, 500, 500), false);
});

test('rejects plots closer than SPACING', () => {
  const g = createGarden();
  plant(g, i0, j0);
  assert.equal(canPlant(g, i0 + SPACING - 1, j0 + SPACING - 1), false);
  assert.equal(canPlant(g, i0 + SPACING, j0), true);
});

test('seed stays buried until watered, then grows to full in GROW_TICKS', () => {
  const g = createGarden();
  plant(g, i0, j0);
  for (let t = 0; t < 100; t++) tickGarden(g);
  assert.equal(g.plots[0].g, 0);
  assert.equal(water(g, i0, j0), true);
  assert.equal(water(g, i0, j0), false);
  for (let t = 0; t < GROW_TICKS * 2; t++) tickGarden(g);
  assert.equal(g.plots[0].g, GROW_TICKS);
});

test('snapshot round-trips and hashes match', () => {
  const a = createGarden();
  plant(a, i0, j0);
  plant(a, i0 + 5, j0 + 5);
  water(a, i0 + 5, j0 + 5);
  tickGarden(a);
  const b = createGarden();
  loadGarden(b, JSON.parse(JSON.stringify(serializeGarden(a))));
  assert.deepEqual(b.plots, a.plots);
  assert.equal(hashGarden(b), hashGarden(a));
  water(b, i0, j0);
  assert.notEqual(hashGarden(b), hashGarden(a));
});

test('load drops plots off the grid or with bad growth', () => {
  const g = createGarden();
  loadGarden(g, { v: 2, p: [i0, j0, 0, -1, 0, 0, i0 + 4, j0, GROW_TICKS + 1, i0 + 4, j0 + 4, 3, 1.5, 2, 0] });
  assert.deepEqual(g.plots, [
    { i: i0, j: j0, g: 0 },
    { i: i0 + 4, j: j0 + 4, g: 3 },
  ]);
});

test('load ignores the old bare-array form and garbage', () => {
  const g = createGarden();
  for (const bad of [[i0, j0, 2], null, 'x', { v: 3, p: [i0, j0, 0] }]) {
    loadGarden(g, bad);
    assert.equal(g.plots.length, 0);
  }
});
