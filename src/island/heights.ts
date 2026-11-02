// The ground's heights and the lookups on them, with no scene or renderer: physics and entity state read these, and
// terrain.ts builds the mesh from them.
import { GRID_RES, CELL, HALF, SEABED } from '../constants.ts';
import { lerp } from '../math.ts';
import { baseCm } from './index.ts';

// heights[i][j] sits at world x = i*CELL - HALF, z = HALF - j*CELL (the heightfield body's frame). It starts as the
// island's base ground (src/island/ground.ts: natural shape plus every POI's stamps, court levelled), in whole
// centimetres like the shared sim. Nothing edits it.
export const heights: number[][] = [];
for (let i = 0; i < GRID_RES; i++) {
  const col = new Array(GRID_RES);
  for (let j = 0; j < GRID_RES; j++) col[j] = baseCm[i * GRID_RES + j]! / 100;
  heights.push(col);
}

export const cellX = (i: number) => i * CELL - HALF;
export const cellZ = (j: number) => HALF - j * CELL;
// The cell [i, j] nearest world x, z, kept off the grid's edge (where edits are refused).
export const cellOf = (x: number, z: number): [number, number] => [
  Math.min(GRID_RES - 2, Math.max(1, Math.round((x + HALF) / CELL))),
  Math.min(GRID_RES - 2, Math.max(1, Math.round((HALF - z) / CELL))),
];

export function groundHeight(x: number, z: number) {
  const fi = (x + HALF) / CELL,
    fj = (HALF - z) / CELL;
  if (fi < 0 || fj < 0 || fi >= GRID_RES - 1 || fj >= GRID_RES - 1) return SEABED;
  const i = Math.floor(fi),
    j = Math.floor(fj),
    u = fi - i,
    v = fj - j;
  return lerp(lerp(heights[i]![j]!, heights[i + 1]![j]!, u), lerp(heights[i]![j + 1]!, heights[i + 1]![j + 1]!, u), v);
}
