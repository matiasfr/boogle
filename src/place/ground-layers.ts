// Home ground material inputs, read only from the collider grid. Local, pure numbers; no height writes.
import { smoothstep } from '../math.ts';
import { WALKABLE_NY } from '../constants.ts';
import { GRID } from './layout.ts';
import { CELL, NX, NZ, at, heights } from './terrain.ts';

export const STRATA = 2.4;
type GroundLayers = { steep: Float32Array; foot: Float32Array; soil: Float32Array };
const corner = (i: number, j: number) =>
  heights[at(Math.max(0, Math.min(NX - 1, i)), Math.max(0, Math.min(NZ - 1, j)))]!;

export function colliderHeight(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.min(Math.floor(fx), NX - 2),
    j = Math.min(Math.floor(fz), NZ - 2),
    u = fx - i,
    v = fz - j;
  const a = corner(i, j),
    b = corner(i + 1, j),
    c = corner(i, j + 1),
    d = corner(i + 1, j + 1);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

export function colliderNy(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.min(Math.floor(fx), NX - 2),
    j = Math.min(Math.floor(fz), NZ - 2),
    u = fx - i,
    v = fz - j;
  const a = corner(i, j),
    b = corner(i + 1, j),
    c = corner(i, j + 1),
    d = corner(i + 1, j + 1);
  const [gx, gz] = u + v <= 1 ? [(b - a) / CELL, (c - a) / CELL] : [(d - c) / CELL, (d - b) / CELL];
  return 1 / Math.hypot(1, gx, gz);
}

export function vertexNy(x: number, z: number) {
  const e = 1e-3;
  let flattest = 0;
  for (const [dx, dz] of [
    [2, 1],
    [1, 2],
    [-1, 2],
    [-2, 1],
    [-2, -1],
    [-1, -2],
    [1, -2],
    [2, -1],
  ] as const)
    flattest = Math.max(flattest, colliderNy(x + dx * e, z + dz * e));
  return flattest;
}

export function steepness(x: number, z: number) {
  return smoothstep(WALKABLE_NY, WALKABLE_NY - 0.15, vertexNy(x, z));
}

export function describeGround(x: number, z: number, k: number, out: GroundLayers) {
  out.steep[k] = steepness(x, z);
  // Foot-to-rim position within a 6 m neighbourhood of the collider.
  let lo = Infinity,
    hi = -Infinity;
  for (const [dx, dz] of [
    [-6, 0],
    [6, 0],
    [0, -6],
    [0, 6],
    [0, 0],
  ]) {
    const s = colliderHeight(x + dx!, z + dz!);
    lo = Math.min(lo, s);
    hi = Math.max(hi, s);
  }
  out.foot[k] = hi - lo > 0.5 ? (colliderHeight(x, z) - lo) / (hi - lo) : 1;
  let gx = 0,
    gz = 0;
  for (const o of [-1.5, 0, 1.5]) {
    const w = o === 0 ? 2 : 1;
    gx += w * (colliderHeight(x + 3, z + o) - colliderHeight(x - 3, z + o));
    gz += w * (colliderHeight(x + o, z + 3) - colliderHeight(x + o, z - 3));
  }
  out.soil[k] = 1 / Math.hypot(1, gx / 24, gz / 24);
}
