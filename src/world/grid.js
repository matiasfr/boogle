// The world grid and the fixed places on it: pure numbers, no three.js or DOM, so the shared sim, Node tests and the
// game all read the same values. src/constants.js re-exports these for everything else.

export const SEA = 0;
// Terrain grid: 1.25 m cells over a 510 m square around the origin (see src/island/ for the island's shape).
export const GRID_RES = 409;
export const GRID_SIZE = 510;
export const CELL = GRID_SIZE / (GRID_RES - 1);
export const HALF = GRID_SIZE / 2;
export const SEABED = -7.5;
// The original island's square: the shared water sim, sand digging and beach gifts stay inside it.
export const HOME = { x0: -80, x1: 80, z0: -80, z1: 80 };
export const COURT = { x: 12, z: 21, r: 8 };

// HOME in grid cells (inclusive), the box the shared water sim is clipped to. Cell (i, j) sits at
// x = i*CELL - HALF, z = HALF - j*CELL.
export function homeBox() {
  return {
    i0: Math.round((HOME.x0 + HALF) / CELL),
    i1: Math.round((HOME.x1 + HALF) / CELL),
    j0: Math.round((HALF - HOME.z1) / CELL),
    j1: Math.round((HALF - HOME.z0) / CELL),
  };
}
