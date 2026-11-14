// The meadow experiments' field (docs/research/small-magic-look.md, "What was built"): the pure half of meadow.ts and
// meadow-flowers.ts, over one lawn wedge of Home on the land's own 2 m grid. Four numbers a vertex: the collider's
// height, whether a flower or tuft may stand there, and two slow noises that the ground tint and the planting both
// read, so the lawn's colour and what grows on it agree. Integer-hashed noise, so every client bakes the same field.
// Local view data only: nothing here moves a height or is saved.
import { smoothstep, valueNoise } from '../math.ts';
import { GRID, ORIGIN } from './layout.ts';
import { steepness } from './ground-layers.ts';
import { CELL, NX, NZ, at, clearMask, heights } from './terrain.ts';
import { DEVICES, LEVER, PADS, SECRETS } from './tech-layout.ts';
import { TOWN_CENTRE, TOWN_GROUND } from './town-plan.ts';
import { pathAt } from './path-field.ts';

/** The wedge, Place-local metres: the village's south slope down to the gorge path (the old terrain-pass wedge). */
export const MEADOW_WEDGE = { x0: -104, x1: 4, z0: 50, z1: 196 };
const I0 = (MEADOW_WEDGE.x0 - GRID.x0) / CELL,
  J0 = (MEADOW_WEDGE.z0 - GRID.z0) / CELL;
/** Texels: the wedge's grid vertices plus one spare row and column, so a reader may fetch its cell's far corners. */
export const MEADOW_W = (MEADOW_WEDGE.x1 - MEADOW_WEDGE.x0) / CELL + 2,
  MEADOW_H = (MEADOW_WEDGE.z1 - MEADOW_WEDGE.z0) / CELL + 2;
/** The wedge's bounds in world space, heights included: what the planting's draws are culled by. */
export const MEADOW_BOUNDS = { min: [0, 0, 0] as [number, number, number], max: [0, 0, 0] as [number, number, number] };

/** Nothing is planted within this of a pad, a device, a secret or the lever (terrain-clean's design review). */
const KEEP_CLEAR = 6;
const KEPT: { x: number; z: number }[] = [
  ...PADS,
  ...Object.values(DEVICES),
  ...SECRETS.flatMap((s) => [s, s.from]),
  LEVER,
];
/** Below this the beach's wandering line may draw sand (ground-material.ts: 2.6 m plus its 0.42 m wander). */
const SAND_TOP = 3.4;

/** A path's levelled strip clears this far from its tread (terrain.ts strip()); beyond it a cleared cell is a footing. */
const STRIP = 10;
/** Planting keeps this many cells from a footing. */
const FOOTING_MARGIN = 7;
const footings = new Map<number, boolean>();
/** Whether a grid vertex is levelled for something that stands there (a building's pad, the Round, a rail bed): cleared
 * in clearMask, as for the trees, and not merely a path's strip. Paths themselves are left to the path field, which is
 * finer than this grid, so flowers may come up to a tread's verge. */
function footing(i: number, j: number) {
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return false;
  const k = at(i, j);
  let is = footings.get(k);
  if (is === undefined) {
    is = clearMask[k]! > 0.02 && pathAt(GRID.x0 + i * CELL, GRID.z0 + j * CELL).edge >= STRIP;
    footings.set(k, is);
  }
  return is;
}

/** 1 where a flower or tuft may stand at a grid vertex, 0 where it may not, with a soft rim inside the wedge's edge. */
export function meadowAllowed(i: number, j: number) {
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return 0;
  const x = GRID.x0 + i * CELL,
    z = GRID.z0 + j * CELL,
    k = at(i, j);
  const edge = Math.min(x - MEADOW_WEDGE.x0, MEADOW_WEDGE.x1 - x, z - MEADOW_WEDGE.z0, MEADOW_WEDGE.z1 - z);
  if (edge <= 0) return 0;
  for (let dj = -FOOTING_MARGIN; dj <= FOOTING_MARGIN; dj++)
    for (let di = -FOOTING_MARGIN; di <= FOOTING_MARGIN; di++) if (footing(i + di, j + dj)) return 0;
  if (Math.hypot(x - TOWN_CENTRE.x, z - TOWN_CENTRE.z) < TOWN_GROUND.r + TOWN_GROUND.soft + 2) return 0;
  if (heights[k]! < SAND_TOP) return 0;
  // Rock: the vertex's own facets, and the broad 3 m slope the material also calls rock.
  if (steepness(x, z) > 0.02) return 0;
  const hAt = (dx: number, dz: number) =>
    heights[at(Math.max(0, Math.min(NX - 1, i + dx)), Math.max(0, Math.min(NZ - 1, j + dz)))]!;
  const gx = (hAt(1, 0) - hAt(-1, 0)) / (2 * CELL),
    gz = (hAt(0, 1) - hAt(0, -1)) / (2 * CELL);
  if (1 / Math.hypot(1, gx, gz) < 0.72) return 0;
  for (const p of KEPT) if (Math.hypot(x - p.x, z - p.z) < KEEP_CLEAR + CELL) return 0;
  return smoothstep(0, 8, edge);
}

/** Two slow noises in 0..1 at a Place-local point: `sun` (lush and dark at 0, sunny and flowered at 1; patches of 20
 * to 60 m) and `zone` (which flower keeps this ground; patches of 10 to 30 m). */
export function meadowNoise(x: number, z: number) {
  const sun = 0.62 * valueNoise(x / 34 + 11.3, z / 34 - 4.7) + 0.38 * valueNoise(x / 15 - 2.1, z / 15 + 8.9);
  const zone = 0.65 * valueNoise(x / 21 - 17.9, z / 21 + 3.3) + 0.35 * valueNoise(x / 9.5 + 6.4, z / 9.5 - 12.2);
  return { sun: smoothstep(-0.55, 0.55, sun), zone: smoothstep(-0.6, 0.6, zone) };
}

/** The field, four floats a texel, row by row from the wedge's (x0, z0): height, allowed, sun, zone. A vertex is
 * allowed only if its neighbours are too, so a reader blending four texels never plants beside a footing. */
export function bakeMeadowField() {
  const data = new Float32Array(MEADOW_W * MEADOW_H * 4);
  let lo = Infinity,
    hi = -Infinity;
  for (let j = 0; j < MEADOW_H; j++)
    for (let i = 0; i < MEADOW_W; i++) {
      const gi = Math.min(NX - 1, I0 + i),
        gj = Math.min(NZ - 1, J0 + j);
      const h = heights[at(gi, gj)]!;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      let allowed = 1;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) allowed = Math.min(allowed, meadowAllowed(gi + di, gj + dj));
      const n = meadowNoise(GRID.x0 + gi * CELL, GRID.z0 + gj * CELL);
      data.set([h, allowed, n.sun, n.zone], (i + j * MEADOW_W) * 4);
    }
  MEADOW_BOUNDS.min = [ORIGIN.x + MEADOW_WEDGE.x0, lo - 0.5, ORIGIN.z + MEADOW_WEDGE.z0];
  MEADOW_BOUNDS.max = [ORIGIN.x + MEADOW_WEDGE.x1, hi + 1.5, ORIGIN.z + MEADOW_WEDGE.z1];
  return data;
}
