// The former scenery trees, in their original seeded order. Local numeric placement; no render-instance identity.
import { mulberry32 } from '../sim/rng.ts';
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
import { CELL, H, PATH_SAMPLES, SHORE_SAMPLES, at, catalogClearMask, clearMask, gorgeD, NX, NZ } from './terrain.ts';
import { PLANTING_CLEAR, PLANTING_LOW, PLANTING_HEIGHT_BITS } from './tree-planting-mask.ts';
import { SHORE_COAST, SHORE_LANDING } from './shore-layout.ts';
import { JUMP_COURSE, JUMP_RECOVERY } from './tech-layout.ts';

export type LandTree = { id: number; x: number; y: number; z: number; size: number; hardwood: boolean };
// The planting mask is frozen, not re-baked from today's roads. Changing an exclusion before the later draws
// would replant the island. Assign identities before removing trees covered by the station's new ground.
const plantingMask = new Uint8Array(NX * NZ);
for (const [start, end] of [...PLANTING_CLEAR, ...PLANTING_LOW]) plantingMask.fill(1, start, end);
const planted: LandTree[] = [];
const plantingHeights = new Float32Array(Uint32Array.from(PLANTING_HEIGHT_BITS).buffer);
const firstId = GROVES.reduce((n, g) => n + g.n, 0) + 2; // the oak and great tree follow the groves
const rng = mulberry32(31);
for (let n = 0; n < 2600 && planted.length < 400; n++) {
  // Keep every RNG call and exclusion in the original order: append IDs must survive reloads.
  const old = planted.length < 340,
    x = old ? (rng() * 2 - 1) * 248 : HEAD.x + (rng() * 2 - 1) * HEAD.r,
    z = old ? (rng() * 2 - 1) * 248 : HEAD.z + (rng() * 2 - 1) * HEAD.r;
  const i = Math.round((x - GRID.x0) / CELL),
    j = Math.round((z - GRID.z0) / CELL);
  if (plantingMask[at(i, j)] || gorgeD(x, z) < 21) continue;
  if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 30) continue;
  if (GROVES.some((g) => Math.hypot(x - g.x, z - g.z) < g.r + 6)) continue;
  const grove = Math.sin(x * 0.036 + 1.2) * Math.cos(z * 0.041 - 0.4) + (z < -100 ? 0.8 : 0);
  if (old && grove < 0.15 + rng() * 0.25) continue;
  if (!old && rng() < 0.4) continue;
  planted.push({
    id: firstId + planted.length,
    x: x + ORIGIN.x,
    y: plantingHeights[planted.length]!,
    z: z + ORIGIN.z,
    size: 0.8 + rng() * 0.7,
    hardwood: false,
  });
}

// The two nearest existing trees north of the forge: visible on the later walk back along the village ridge.
// Selection does not move a tree or consume RNG; IDs still follow the original scenery planting order.
const hardwoods = planted
  .map((t, i) => ({ t, i }))
  .filter(({ t }) => t.x < ORIGIN.x - 55 && t.z < 0 && t.z > -80)
  .sort(
    (a, b) =>
      Math.hypot(a.t.x - ORIGIN.x - FORGE_FRAME.x, a.t.z - FORGE_FRAME.z) -
      Math.hypot(b.t.x - ORIGIN.x - FORGE_FRAME.x, b.t.z - FORGE_FRAME.z),
  )
  .slice(0, 2);
for (const { t } of hardwoods) t.hardwood = true;

// Only the new station ground may remove an already planted tree. Keep every survivor's id and ordering.
// X1 covers no existing trunks: all 362 survive (the v35 comparison is in home-flip's proof report).
export const LAND_TREES = planted.filter((t) => {
  const i = Math.round((t.x - ORIGIN.x - GRID.x0) / CELL),
    j = Math.round((t.z - ORIGIN.z - GRID.z0) / CELL);
  return catalogClearMask[at(i, j)]! <= 0.05;
});

const puzzleDecks = [...JUMP_COURSE, ...JUMP_RECOVERY.slabs.map((p) => ({ ...p, top: JUMP_RECOVERY.top }))];
/** Local scenery clearance only: retain every harvest ID and its accepted state across old/new tabs. */
export function shoreTreeCleared(x: number, z: number, size: number) {
  const ground = H(x, z);
  // Clear the whole crown from both the jumping landings and the lower return walk.
  // The authored course, heights and gaps stay put; hidden trees retain their catalog slots.
  if (
    puzzleDecks.some(
      (p) =>
        Math.abs(x - ORIGIN.x - p.x) < p.hx + 2.8 * size &&
        Math.abs(z - ORIGIN.z - p.z) < p.hz + 2.8 * size &&
        ground + 13 * size > p.top - 1.2 &&
        ground < p.top + 2,
    )
  )
    return true;
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
  for (const [x, z] of SHORE_SAMPLES) protectedPoints.push({ x: x + ORIGIN.x, z, r: 6 });
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
for (const p of [TOWN.start, ...TOWN.wood, ...TOWN.stone, ...TOWN.camps.flatMap((c) => [c.asleep, c.awake])].flat()) {
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
