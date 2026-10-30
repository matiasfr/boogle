// The island's base ground on the world grid, in whole centimetres: the island (index.js: natural shape plus every
// POI's stamps) with the volleyball court levelled, quantized once. Every peer builds it with this same code, the game
// from index.js and Node tests from test/helpers/land.mjs, so the shared sim starts from identical integers.
//
// An input, not the sim: like shape.js it uses Math.hypot, so it stays out of the determinism lint's lockstep files.
// No three.js, no DOM.
import { GRID_RES, CELL, HALF, SEABED, COURT } from '../world/grid.js';
import { lerp, smoothstep } from '../math-pure.js';

const courtH = new WeakMap(); // island -> the ground height at the court's centre, which the court is levelled to
const courtWeight = (x, z) => 1 - smoothstep(COURT.r, COURT.r + 6, Math.hypot(x - COURT.x, z - COURT.z));

// The island's height (metres) at world (x, z), with the court levelled.
function levelledHeight(island, x, z) {
  let h = courtH.get(island);
  if (h === undefined) courtH.set(island, (h = island.heightAt(COURT.x, COURT.z)));
  return lerp(island.heightAt(x, z), h, courtWeight(x, z));
}

// Base heights in cm, index i*n + j (cell (i, j) sits at x = i*CELL - HALF, z = HALF - j*CELL). With `box`
// ({ i0, i1, j0, j1 }, inclusive) only the cells inside it are built; the rest are sea floor.
export function islandBaseCm(island, n = GRID_RES, box = null) {
  const out = new Int16Array(n * n).fill(Math.round(SEABED * 100));
  const { i0 = 0, i1 = n - 1, j0 = 0, j1 = n - 1 } = box ?? {};
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++)
      out[i * n + j] = Math.round(levelledHeight(island, i * CELL - HALF, HALF - j * CELL) * 100);
  return out;
}
