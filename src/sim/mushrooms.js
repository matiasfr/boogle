// Mushroom garden: buried seeds that grow into bouncy mushrooms once watered. Pure and integer-only (see
// src/world/README.md), so it runs the same on every client and in Node tests. Seeds go in anywhere; the game layer
// (src/adapters/mushroom-garden.js) refuses water, rocks and trees before an edit reaches this state.

// The seed stall's dirt patch in heightfield cells: i in [I0, I0 + W), j in [J0, J0 + H). Kept clear of trees, beach
// gifts and digging; mushrooms grow there or anywhere else.
export const PATCH = { i0: 218, j0: 192, w: 20, h: 20 };
// Minimum Chebyshev distance in cells between two plots, so grown caps do not overlap much.
export const SPACING = 3;
export const GROW_TICKS = 120;
export const MAX_PLOTS = 60;
const MAX_CELL = 4096;

const inGrid = (i, j) => Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < MAX_CELL && j < MAX_CELL;

// g: 0 = buried and dry, 1..GROW_TICKS-1 = growing, GROW_TICKS = grown.
export function createGarden() {
  return { plots: [] };
}

function findPlot(garden, i, j) {
  return garden.plots.find((p) => p.i === i && p.j === j) ?? null;
}

export function canPlant(garden, i, j) {
  if (!inGrid(i, j) || garden.plots.length >= MAX_PLOTS) return false;
  return !garden.plots.some((p) => Math.max(Math.abs(p.i - i), Math.abs(p.j - j)) < SPACING);
}

export function plant(garden, i, j) {
  if (!canPlant(garden, i, j)) return false;
  garden.plots.push({ i, j, g: 0 });
  return true;
}

export function canWater(garden, i, j) {
  return findPlot(garden, i, j)?.g === 0;
}

export function water(garden, i, j) {
  if (!canWater(garden, i, j)) return false;
  findPlot(garden, i, j).g = 1;
  return true;
}

export function tickGarden(garden) {
  for (const p of garden.plots) if (p.g > 0 && p.g < GROW_TICKS) p.g++;
}

export function serializeGarden(garden) {
  return { v: 2, p: garden.plots.flatMap((p) => [p.i, p.j, p.g]) };
}

// Reads the { v: 2, p } form; anything else (such as the bare arrays saved on the 129-cell island before 2026-10-29)
// loads as an empty garden.
export function loadGarden(garden, json) {
  garden.plots = [];
  const flat = json?.v === 2 && Array.isArray(json.p) ? json.p : [];
  for (let k = 0; k + 2 < flat.length && garden.plots.length < MAX_PLOTS; k += 3) {
    const [i, j, g] = flat.slice(k, k + 3);
    if (inGrid(i, j) && Number.isInteger(g) && g >= 0 && g <= GROW_TICKS) garden.plots.push({ i, j, g });
  }
}

export function hashGarden(garden) {
  let h = 2166136261;
  for (const v of serializeGarden(garden).p) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
