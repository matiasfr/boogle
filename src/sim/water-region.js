// Pure helpers for putting the water sim on the island: which part of the grid is simulated, the
// slosh edit (a ball slapping a pool throws water outwards) and its validation. No three.js, no DOM.
// All integers, fixed iteration order, so every machine gets the same result.

export const SLOSH = {
  minDepthCm: 8, // the impact cell must hold at least this much water
  maxCm: 360, // most water one slosh can move, in total
  perCellCm: 40, // most any single centre cell gives up
  rateTicks: 4, // a player may slosh once per 400 ms
};

// Bounding box (grid cells) of everything with base height above `thresholdCm`, padded. The open ocean
// outside it is not simulated; the sea shader still draws it.
export function regionFromBase(baseCm, n, thresholdCm, pad) {
  let i0 = n,
    j0 = n,
    i1 = -1,
    j1 = -1;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (baseCm[i * n + j] > thresholdCm) {
        if (i < i0) i0 = i;
        if (i > i1) i1 = i;
        if (j < j0) j0 = j;
        if (j > j1) j1 = j;
      }
  if (i1 < 0) return null;
  i0 = Math.max(0, i0 - pad);
  j0 = Math.max(0, j0 - pad);
  i1 = Math.min(n - 1, i1 + pad);
  j1 = Math.min(n - 1, j1 + pad);
  return { i0, j0, w: i1 - i0 + 1, h: j1 - j0 + 1 };
}

// Host-side check. `state.lastTick` is the player's previous slosh tick. Returns null if fine, else a reason.
export function checkSlosh(edit, water, tick, lastTick) {
  const { i, j, amt } = edit;
  if (!Number.isInteger(i) || !Number.isInteger(j) || !Number.isInteger(amt)) return 'int';
  if (amt < 1 || amt > SLOSH.maxCm) return 'amount';
  if (i < 2 || j < 2 || i > water.width - 3 || j > water.height - 3) return 'range';
  if (water.depth[i * water.height + j] < SLOSH.minDepthCm) return 'dry';
  if (tick - lastTick < SLOSH.rateTicks) return 'rate';
  return null;
}

// Moves up to `amt` cm of water out of the 3x3 block around (ci, cj) and spreads it evenly over the
// ring of cells 2-3 away (skipping any outside the grid). Water is conserved exactly. Returns cm moved.
export function applySlosh(depth, width, height, ci, cj, amt) {
  let taken = 0;
  let left = Math.min(amt, SLOSH.maxCm);
  for (let di = -1; di <= 1; di++)
    for (let dj = -1; dj <= 1; dj++) {
      const a = ci + di,
        b = cj + dj;
      if (a < 0 || b < 0 || a >= width || b >= height) continue;
      const c = a * height + b;
      const m = Math.min(SLOSH.perCellCm, depth[c] >> 1, left);
      if (m <= 0) continue;
      depth[c] -= m;
      taken += m;
      left -= m;
    }
  if (taken === 0) return 0;
  const dest = [];
  for (let di = -3; di <= 3; di++)
    for (let dj = -3; dj <= 3; dj++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) < 2) continue;
      const a = ci + di,
        b = cj + dj;
      if (a < 0 || b < 0 || a >= width || b >= height) continue;
      dest.push(a * height + b);
    }
  if (dest.length === 0) {
    depth[ci * height + cj] += taken; // nowhere to throw it: put it back
    return 0;
  }
  const each = Math.floor(taken / dest.length);
  const extra = taken - each * dest.length;
  for (let k = 0; k < dest.length; k++) depth[dest[k]] += each + (k < extra ? 1 : 0);
  return taken;
}
