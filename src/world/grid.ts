// The world grid and the fixed places on it: pure numbers, no three.js or DOM, so the shared sim, Node tests and the
// game all read the same values. src/constants.js re-exports these for everything else.

export const SEA = 0;
// Terrain grid: 1.25 m cells over a 510 m square around the origin (see src/island/ for the island's shape).
export const GRID_RES = 409;
export const GRID_SIZE = 510;
export const CELL = GRID_SIZE / (GRID_RES - 1);
export const HALF = GRID_SIZE / 2;
export const SEABED = -7.5;
// The original island's square (the ground within HOME_KEEP of the origin never changes).
export const HOME = { x0: -80, x1: 80, z0: -80, z1: 80 };
export const COURT = { x: 12, z: 21, r: 8 };
