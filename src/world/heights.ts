// The client and baked server land sample the same grid, with exactly the same interpolation.
import { GRID_RES, CELL, HALF, SEABED } from './grid.ts';
import { lerp } from '../math-pure.ts';

/** The ground at world x, z from heights in metres, where h[i][j] sits at x = i*CELL - HALF, z = HALF - j*CELL. Off the grid: the seabed. */
export function heightIn(h: number[][], x: number, z: number) {
  const fi = (x + HALF) / CELL,
    fj = (HALF - z) / CELL;
  if (fi < 0 || fj < 0 || fi >= GRID_RES - 1 || fj >= GRID_RES - 1) return SEABED;
  const i = Math.floor(fi),
    j = Math.floor(fj),
    u = fi - i,
    v = fj - j;
  return lerp(lerp(h[i]![j]!, h[i + 1]![j]!, u), lerp(h[i]![j + 1]!, h[i + 1]![j + 1]!, u), v);
}
