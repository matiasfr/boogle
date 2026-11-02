// The island's base ground on the world grid, in whole centimetres: the island (index.ts: natural shape plus every
// POI's stamps) with the volleyball court levelled, quantized once. The render side (terrain.ts: mesh and
// heightfield) builds from it; the lockstep rules don't read it.
//
// An input, not the sim: like shape.ts it uses Math.hypot, so it stays out of the determinism lint's lockstep files.
// No three.js, no DOM.
import { GRID_RES, CELL, HALF, COURT } from '../world/grid.ts';
import { lerp, smoothstep } from '../math-pure.ts';

import type { createIsland } from './stamps.ts';

type Island = ReturnType<typeof createIsland>;
const courtH = new WeakMap<Island, number>(); // island -> the ground height at the court's centre, which the court is levelled to
const courtWeight = (x: number, z: number) =>
  1 - smoothstep(COURT.r, COURT.r + 6, Math.hypot(x - COURT.x, z - COURT.z));

// The island's height (metres) at world (x, z), with the court levelled.
function levelledHeight(island: Island, x: number, z: number) {
  let h = courtH.get(island);
  if (h === undefined) courtH.set(island, (h = island.heightAt(COURT.x, COURT.z)));
  return lerp(island.heightAt(x, z), h, courtWeight(x, z));
}

// Base heights in cm, index i*n + j (cell (i, j) sits at x = i*CELL - HALF, z = HALF - j*CELL).
export function islandBaseCm(island: Island) {
  const n = GRID_RES;
  const out = new Int16Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      out[i * n + j] = Math.round(levelledHeight(island, i * CELL - HALF, HALF - j * CELL) * 100);
  return out;
}
