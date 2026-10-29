// Mushroom garden: buried seeds that grow into bouncy mushrooms once watered. Pure and integer-only (see
// src/world/README.md), so it runs the same on every client and in Node tests.

// Dirt patch in heightfield cells: i in [I0, I0 + W), j in [J0, J0 + H).
export const PATCH = { i0: 78, j0: 52, w: 10, h: 10 };
// Minimum Chebyshev distance in cells between two plots, so grown caps do not overlap much.
export const SPACING = 3;
export const GROW_TICKS = 40;

export function inPatch(i, j) {
  return i >= PATCH.i0 && i < PATCH.i0 + PATCH.w && j >= PATCH.j0 && j < PATCH.j0 + PATCH.h;
}

// g: 0 = buried and dry, 1..GROW_TICKS-1 = growing, GROW_TICKS = grown.
export function createGarden() {
  return { plots: [] };
}

function findPlot(garden, i, j) {
  return garden.plots.find((p) => p.i === i && p.j === j) ?? null;
}

export function canPlant(garden, i, j) {
  if (!Number.isInteger(i) || !Number.isInteger(j) || !inPatch(i, j)) return false;
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
  return garden.plots.flatMap((p) => [p.i, p.j, p.g]);
}

export function loadGarden(garden, flat) {
  garden.plots = [];
  if (!Array.isArray(flat)) return;
  for (let k = 0; k + 2 < flat.length; k += 3) {
    const [i, j, g] = flat.slice(k, k + 3);
    if (inPatch(i, j) && Number.isInteger(g) && g >= 0 && g <= GROW_TICKS) garden.plots.push({ i, j, g });
  }
}

export function hashGarden(garden) {
  let h = 2166136261;
  for (const v of serializeGarden(garden)) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
