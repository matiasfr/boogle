import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PATCH,
  SPACING,
  GROW_TICKS,
  createGarden,
  plant,
  canPlant,
  water,
  tickGarden,
  serializeGarden,
  loadGarden,
  hashGarden,
} from '../src/sim/mushrooms.js';

const { i0, j0 } = PATCH;

test('plants only inside the dirt patch', () => {
  const g = createGarden();
  assert.equal(plant(g, i0 - 1, j0), false);
  assert.equal(plant(g, i0 + PATCH.w, j0), false);
  assert.equal(plant(g, i0 + 0.5, j0), false);
  assert.equal(plant(g, i0, j0), true);
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

test('load drops plots outside the patch or with bad growth', () => {
  const g = createGarden();
  loadGarden(g, [i0, j0, 0, 0, 0, 0, i0 + 4, j0, GROW_TICKS + 1, i0 + 4, j0 + 4, 3]);
  assert.deepEqual(g.plots, [
    { i: i0, j: j0, g: 0 },
    { i: i0 + 4, j: j0 + 4, g: 3 },
  ]);
});
