// Saved islands from before the island grew (2026-10-29) used a 129-cell grid; the grid is now 409 cells a side with
// the same 1.25 m cells, and the old square sits exactly LEGACY_SHIFT cells in from the new grid's corner. State
// loaders use these to move a persisted snapshot's cells to where they are now, so sand castles and gardens survive.
export const LEGACY_N = 129;
export const LEGACY_SHIFT = 140;

// True for a cell index pair that can only have come from the old grid (every shared cell is now >= LEGACY_SHIFT).
export const isLegacyCell = (i, j) => i >= 0 && j >= 0 && i < LEGACY_N && j < LEGACY_N;
export const fromLegacy = (i, j) => [i + LEGACY_SHIFT, j + LEGACY_SHIFT];

// Terrain deltas are stored as flat [idx, value, ...] with idx = i * n + j.
export function migrateTerrainDeltas(d, n) {
  const out = [];
  for (let k = 0; k + 1 < d.length; k += 2) {
    const idx = d[k];
    if (!Number.isInteger(idx) || idx < 0 || idx >= LEGACY_N * LEGACY_N) continue;
    const [i, j] = fromLegacy(Math.floor(idx / LEGACY_N), idx % LEGACY_N);
    out.push(i * n + j, d[k + 1]);
  }
  return out;
}
