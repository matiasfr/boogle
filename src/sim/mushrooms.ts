// Mushroom garden: buried seeds that grow into bouncy mushrooms once watered. Pure and integer-only (see
// src/world/README.md), so it runs the same on every client and in Node tests. Seeds go in anywhere; the game layer
// (src/adapters/mushroom-garden.ts) refuses water, rocks and trees before an edit reaches this state.

// The seed stall's dirt patch in heightfield cells: i in [I0, I0 + W), j in [J0, J0 + H). Kept clear of trees;
// mushrooms grow there or anywhere else.
export const PATCH = { i0: 218, j0: 192, w: 20, h: 20 };
// Minimum Chebyshev distance in cells between two plots, so grown caps do not overlap much.
export const SPACING = 3;
export const GROW_TICKS = 120;
export const MAX_PLOTS = 60;
const MAX_CELL = 4096;

const inGrid = (i: unknown, j: unknown): boolean =>
  Number.isInteger(i) &&
  Number.isInteger(j) &&
  (i as number) >= 0 &&
  (j as number) >= 0 &&
  (i as number) < MAX_CELL &&
  (j as number) < MAX_CELL;

// g: 0 = buried and dry, 1..GROW_TICKS-1 = growing, GROW_TICKS = grown.
export type Plot = { i: number; j: number; g: number };
export type Garden = { plots: Plot[] };
// The saved shape (wire and snapshots): v 2, then i, j, g per plot.
export type GardenJSON = { v: 2; p: number[] };

export function createGarden(): Garden {
  return { plots: [] };
}

function findPlot(garden: Garden, i: number, j: number) {
  return garden.plots.find((p) => p.i === i && p.j === j) ?? null;
}

export function canPlant(garden: Garden, i: number, j: number) {
  if (!inGrid(i, j) || garden.plots.length >= MAX_PLOTS) return false;
  return !garden.plots.some((p) => Math.max(Math.abs(p.i - i), Math.abs(p.j - j)) < SPACING);
}

export function plant(garden: Garden, i: number, j: number) {
  if (!canPlant(garden, i, j)) return false;
  garden.plots.push({ i, j, g: 0 });
  return true;
}

export function canWater(garden: Garden, i: number, j: number) {
  return findPlot(garden, i, j)?.g === 0;
}

export function water(garden: Garden, i: number, j: number) {
  const plot = findPlot(garden, i, j);
  if (plot?.g !== 0) return false;
  plot.g = 1;
  return true;
}

export function tickGarden(garden: Garden) {
  for (const p of garden.plots) if (p.g > 0 && p.g < GROW_TICKS) p.g++;
}

export function serializeGarden(garden: Garden): GardenJSON {
  return { v: 2, p: garden.plots.flatMap((p) => [p.i, p.j, p.g]) };
}

// Reads the { v: 2, p } form; anything else loads as an empty garden.
export function loadGarden(garden: Garden, json: unknown) {
  garden.plots = [];
  const j2 = json as Partial<GardenJSON> | null | undefined;
  const flat: unknown[] = j2?.v === 2 && Array.isArray(j2.p) ? j2.p : [];
  for (let k = 0; k + 2 < flat.length && garden.plots.length < MAX_PLOTS; k += 3) {
    const [i, j, g] = flat.slice(k, k + 3);
    if (inGrid(i, j) && typeof g === 'number' && Number.isInteger(g) && g >= 0 && g <= GROW_TICKS)
      garden.plots.push({ i: i as number, j: j as number, g });
  }
}

export function hashGarden(garden: Garden) {
  let h = 2166136261;
  for (const v of serializeGarden(garden).p) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
