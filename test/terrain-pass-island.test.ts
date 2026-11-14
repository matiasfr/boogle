import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALKABLE_NY } from '../src/constants.ts';
import { GRID, ORIGIN } from '../src/place/layout.ts';
import { CELL, COVE_FINE, NX, NZ, cellX, cellZ } from '../src/place/terrain.ts';
import { buildIslandSurface, protectionAt } from '../src/proto/terrain-pass/island.ts';
import { TOLERANCE, colliderHeight, vertexNy } from '../src/proto/terrain-pass/surface.ts';

const TILE = 96;
const inCove = (i: number, j: number) =>
  cellX(i) >= COVE_FINE.x0 && cellX(i) < COVE_FINE.x1 && cellZ(j) >= COVE_FINE.z0 && cellZ(j) < COVE_FINE.z1;
const base = NX * NZ;
const s = buildIslandSurface(base, inCove, TILE);
// Every vertex the pass adds or moves, Place-local, with its drawn height (stored as 32-bit floats).
const drawn: [x: number, y: number, z: number][] = [];
for (let k = 0; k < s.position.length; k += 3)
  drawn.push([s.position[k]! - ORIGIN.x, s.position[k + 1]!, s.position[k + 2]! - ORIGIN.z]);
for (const [id, y] of s.moved) drawn.push([cellX(id % NX), y, cellZ(Math.floor(id / NX))]);

test('the pass on Home keeps walkable and protected ground on the collider', () => {
  assert.ok(s.fineCells > 3000, 'the unwalkable cells are found');
  let steep = 0;
  for (const [x, y, z] of drawn) {
    const offset = Math.abs(y - colliderHeight(x, z)),
      ny = vertexNy(x, z);
    if (protectionAt(x, z) > 0.999) assert.ok(offset < 1e-3, `protected ground moved ${offset} at ${x}, ${z}`);
    else if (ny >= WALKABLE_NY) assert.ok(offset < 1e-4, `walkable ground moved ${offset} at ${x}, ${z}`);
    else steep = Math.max(steep, offset * ny);
  }
  assert.ok(steep <= TOLERANCE.steep + 1e-5, `rock strays ${steep} m along its normal`);
  assert.ok(steep > 0.1, 'the ledges are there');
});

test('nothing moves on a far-ground tile border or beside a 2 m cell', () => {
  const onBorder = (v: number) => Math.abs(v / (TILE * CELL) - Math.round(v / (TILE * CELL))) < 1e-9;
  for (const [x, y, z] of drawn) {
    if (onBorder(x - GRID.x0) || onBorder(z - GRID.z0))
      assert.ok(Math.abs(y - colliderHeight(x, z)) < 1e-4, `a tile-border vertex moved at ${x}, ${z}`);
  }
  // A grid vertex moves only when all four cells around it are 1 m cells.
  for (const [id] of s.moved) {
    const i = id % NX,
      j = Math.floor(id / NX);
    for (const [di, dj] of [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
    ] as const)
      assert.ok(s.fine(i + di, j + dj), `vertex ${i}, ${j} moved beside a 2 m cell`);
  }
});

test('every 1 m cell is eight triangles over the land and new vertices', () => {
  assert.equal(s.triangles.size, s.fineCells);
  const count = base + s.position.length / 3;
  for (const list of s.triangles.values()) {
    assert.equal(list.length, 24);
    for (const v of list) assert.ok(v >= 0 && v < count);
  }
});
