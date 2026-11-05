// The former scenery trees, in their original seeded order. Local numeric placement; no render-instance identity.
import { mulberry32 } from '../../sim/rng.ts';
import {
  FORGE,
  FORGE_FRAME,
  GRID,
  GROVES,
  HEAD,
  LINKS,
  ORIGIN,
  ROOM_PLOTS,
  SPAWN,
  SPIRE,
  TOWN,
  lineAt,
} from './layout.ts';
import { CELL, H, PATH_SAMPLES, at, catalogClearMask, catalogHeights, clearMask, gorgeD, heights } from './terrain.ts';
import { SHORE_COAST, SHORE_LANDING, SHORE_PATH, shorePlot } from './shore-layout.ts';

export type LandTree = { x: number; y: number; z: number; size: number; hardwood: boolean };
export const LAND_TREES: LandTree[] = [];
const rng = mulberry32(31);
for (let n = 0; n < 2600 && LAND_TREES.length < 400; n++) {
  // Keep every RNG call and exclusion in the original order: append IDs must survive reloads.
  const old = LAND_TREES.length < 340,
    x = old ? (rng() * 2 - 1) * 248 : HEAD.x + (rng() * 2 - 1) * HEAD.r,
    z = old ? (rng() * 2 - 1) * 248 : HEAD.z + (rng() * 2 - 1) * HEAD.r;
  const i = Math.round((x - GRID.x0) / CELL),
    j = Math.round((z - GRID.z0) / CELL),
    h = catalogHeights[at(i, j)]!;
  if (h < 4 || catalogClearMask[at(i, j)]! > 0.05 || gorgeD(x, z) < 21) continue;
  if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 30) continue;
  if (GROVES.some((g) => Math.hypot(x - g.x, z - g.z) < g.r + 6)) continue;
  const grove = Math.sin(x * 0.036 + 1.2) * Math.cos(z * 0.041 - 0.4) + (z < -100 ? 0.8 : 0);
  if (old && grove < 0.15 + rng() * 0.25) continue;
  if (!old && rng() < 0.4) continue;
  LAND_TREES.push({
    x: x + ORIGIN.x,
    y: heights[at(i, j)]!,
    z: z + ORIGIN.z,
    size: 0.8 + rng() * 0.7,
    hardwood: false,
  });
}

// The two nearest existing trees north of the forge: visible on the later walk back along the village ridge.
// Selection does not move a tree or consume RNG; IDs still follow the original scenery planting order.
const hardwoods = LAND_TREES.map((t, i) => ({ t, i }))
  .filter(({ t }) => t.x < ORIGIN.x - 55 && t.z < 0 && t.z > -80)
  .sort(
    (a, b) =>
      Math.hypot(a.t.x - ORIGIN.x - FORGE_FRAME.x, a.t.z - FORGE_FRAME.z) -
      Math.hypot(b.t.x - ORIGIN.x - FORGE_FRAME.x, b.t.z - FORGE_FRAME.z),
  )
  .slice(0, 2);
for (const { t } of hardwoods) t.hardwood = true;

/** Local clearance only: retain every harvest ID and its accepted state across old/new tabs. */
export function shoreTreeCleared(x: number, z: number, size: number) {
  if (!SHORE_COAST) return false;
  if (H(x, z) < 3) return true;
  // Include the crown footprint, so neither trunks nor branches intrude on the new grass shoulders.
  for (let n = 0; n <= 8; n++) {
    const r = n === 8 ? 0 : 2.6 * size;
    const px = x - ORIGIN.x + Math.cos((n * Math.PI) / 4) * r;
    const pz = z - ORIGIN.z + Math.sin((n * Math.PI) / 4) * r;
    const k = at(Math.round((px - GRID.x0) / CELL), Math.round((pz - GRID.z0) / CELL));
    if (clearMask[k]! > catalogClearMask[k]! + 0.05) return true;
  }
  return false;
}

type Point = { x: number; z: number; r: number };
const protectedPoints: Point[] = [];
for (const path of PATH_SAMPLES)
  for (const [x, z] of path) protectedPoints.push({ x: x + ORIGIN.x, z: z + ORIGIN.z, r: 3 });
if (SHORE_COAST) {
  protectedPoints.push({ x: SHORE_LANDING.x + ORIGIN.x, z: SHORE_LANDING.z, r: 9 });
  for (let k = 1; k < SHORE_PATH.length; k++) {
    const a = SHORE_PATH[k - 1]!,
      b = SHORE_PATH[k]!,
      n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let j = 0; j <= n; j++)
      protectedPoints.push({ x: a[0] + ((b[0] - a[0]) * j) / n + ORIGIN.x, z: a[1] + ((b[1] - a[1]) * j) / n, r: 6 });
  }
}
for (const link of LINKS) {
  for (let s = 0; s <= link.line.len; s += 1) {
    const p = lineAt(link.line, s, { x: 0, z: 0, ux: 0, uz: 0 });
    protectedPoints.push({ x: p.x + ORIGIN.x, z: p.z + ORIGIN.z, r: 4 });
  }
  for (const station of link.stations) {
    const p = lineAt(link.line, station.s, { x: 0, z: 0, ux: 0, uz: 0 });
    // Include feeder and walking apron on either side of the line.
    protectedPoints.push({ x: p.x + ORIGIN.x, z: p.z + ORIGIN.z, r: 10 });
  }
}
for (const original of [
  TOWN.start,
  ...TOWN.wood,
  ...TOWN.stone,
  ...TOWN.camps.flatMap((c) => [c.asleep, c.awake]),
].flat()) {
  const p = shorePlot(original);
  protectedPoints.push({ x: p.x + ORIGIN.x, z: p.z + ORIGIN.z, r: Math.hypot(p.w ?? 6, p.d ?? 6) / 2 + 3 });
}
for (const p of Object.values(ROOM_PLOTS))
  protectedPoints.push({ x: p.x + ORIGIN.x, z: p.z + ORIGIN.z, r: Math.hypot(p.w, p.d) / 2 + 4 });
protectedPoints.push(
  { x: SPAWN.x + ORIGIN.x, z: SPAWN.z + ORIGIN.z, r: 6 },
  { x: FORGE.x + ORIGIN.x, z: FORGE.z + ORIGIN.z, r: 10 },
  { x: FORGE_FRAME.x + ORIGIN.x, z: FORGE_FRAME.z + ORIGIN.z, r: 6 },
);

/** Checks the entire falling crown/trunk footprint, including future track and building plots. */
export function treeFallClear(x: number, z: number, size: number, yaw: number, great = false) {
  const length = (great ? 12 : 13) * size;
  const hardwood = LAND_TREES.some((t) => t.hardwood && t.x === x && t.z === z);
  const y = H(x, z);
  for (let d = 0; d <= length; d += 0.75) {
    const px = x + Math.sin(yaw) * d,
      pz = z + Math.cos(yaw) * d,
      radius = (d < 4 * size ? (hardwood ? 1.1 : 0.55) : hardwood ? 5.2 : 2.8) * size;
    if (H(px, pz) < 3 || Math.abs(H(px, pz) - y) > 3) return false;
    for (const p of protectedPoints) if ((px - p.x) ** 2 + (pz - p.z) ** 2 < (p.r + radius) ** 2) return false;
  }
  return true;
}

/** The accepting authority chooses this once; peers use the accepted yaw and compact-collapse flag. */
export function safeTreeFall(x: number, z: number, size: number, yaw: number, great = false) {
  for (let n = 0; n < 16; n++) {
    const turn = n === 0 ? 0 : Math.ceil(n / 2) * (n % 2 ? 1 : -1) * (Math.PI / 8);
    const candidate = Math.atan2(Math.sin(yaw + turn), Math.cos(yaw + turn));
    if (treeFallClear(x, z, size, candidate, great)) return { yaw: candidate, collapsed: false };
  }
  return { yaw, collapsed: true };
}
