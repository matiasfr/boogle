// Ring Island's ground (docs/plans/ring-island-build1.md, R2b): a 2 m grid over the island's waterline box, the max of
// the four cones' surfaces (Place's buildFar, src/proto/greybox/ring-cones.ts) carried on below their -4 m base to the
// sea bed, graded to a fill under the island halt and 1.5 m under the loop deck and its neck (Level findings 7 and 8).
// Pure: no three.js, no physics. The view builds the drawn mesh and the heightfield collider from `heights`; recovery
// and the saved pose read `islandH`, the same triangles the collider has. World metres.
import { RING_FORMATION, RING_HALT, RING_LOOP, RING_ORIGIN, ringAt } from '../../sim/railway-ring-layout.ts';

/** dx, dz, radius, height from the island's centre, as RING_CONES. */
export type Cone = readonly [number, number, number, number];
export const ISLAND_CELL = 2;
/** The open sea bed off the island's shore (src/world/grid.ts SEABED). */
export const ISLAND_BED = -7.5;
/** The fill under the island halt: its top, under the 8.0 m deck's 0.5 m slab with 10 cm spare, and the embankment's
 * fall per metre outside it (1 in 1.5). */
export const ISLAND_FILL = { top: 7.4, u0: 42700, u1: 46900, lat0: -1030, lat1: 630, fall: 1 / 1.5 } as const;
/** The loop deck's grade (Level finding 8): ground at most 1.5 m under the 8.0 m deck within `band` m of the loop's
 * centreline or its neck, rising at `fall` per metre beyond. */
export const ISLAND_LOOP_GRADE = { cap: 6.5, band: 3.5, fall: 1 / 1.5 } as const;

const m = (p: { x: number; z: number }) => ({ x: p.x / 100, z: p.z / 100 });
const UNIT = Math.sqrt(1 + 0.0272 * 0.0272);
/** u and lat (m) of a world point: the inverse of ringAt (its orthogonal unit axes, unrounded). */
export function ringUL(x: number, z: number) {
  const dx = x - RING_ORIGIN.x / 100,
    dz = z - RING_ORIGIN.z / 100;
  return { u: (0.0272 * dx - dz) / UNIT, lat: (dx + 0.0272 * dz) / UNIT };
}

/** The loop's neck and ring as segments (world m) for the grade: both tracks off the halt's north end, 12 m on, then
 * to the loop's mouth beside its west point (the greybox's links, at RING_LOOP's angles). */
function loopNeck() {
  const r = RING_LOOP.r / 100,
    cx = RING_LOOP.x / 100,
    cz = RING_LOOP.z / 100;
  const segs: [number, number, number, number][] = [];
  for (const [t, a] of [
    [RING_FORMATION.tracks[1], Math.PI - 0.22],
    [RING_FORMATION.tracks[0], Math.PI + 0.22],
  ] as const) {
    const from = m(ringAt(RING_HALT.u1, t)),
      mid = m(ringAt(RING_HALT.u1 + 1200, t));
    segs.push([from.x, from.z, mid.x, mid.z], [mid.x, mid.z, cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return segs;
}
function segDist(x: number, z: number, [ax, az, bx, bz]: readonly number[]) {
  const dx = bx! - ax!,
    dz = bz! - az!;
  const t = Math.max(0, Math.min(1, ((x - ax!) * dx + (z - az!) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax! - dx * t, z - az! - dz * t);
}

/** The island's ground: `centre` is the cones' origin (Place's FAR + ORIGIN), `cones` RING_CONES. */
export function createIslandGround(cones: readonly Cone[], centre: { x: number; z: number }) {
  // The box: every cone carried down to the sea bed, plus a cell, snapped to the grid.
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (const [dx, dz, r, h] of cones) {
    const reach = (r * (h - 4 - ISLAND_BED)) / h + ISLAND_CELL;
    minX = Math.min(minX, centre.x + dx - reach);
    maxX = Math.max(maxX, centre.x + dx + reach);
    minZ = Math.min(minZ, centre.z + dz - reach);
    maxZ = Math.max(maxZ, centre.z + dz + reach);
  }
  const x0 = Math.floor(minX / ISLAND_CELL) * ISLAND_CELL,
    z0 = Math.floor(minZ / ISLAND_CELL) * ISLAND_CELL;
  const nx = Math.ceil((maxX - x0) / ISLAND_CELL) + 1,
    nz = Math.ceil((maxZ - z0) / ISLAND_CELL) + 1;
  const neck = loopNeck();
  const loop = { x: RING_LOOP.x / 100, z: RING_LOOP.z / 100, r: RING_LOOP.r / 100 };

  /** The cones alone, carried below their base: ringHeight wherever that stands, the sea bed under the rest. */
  function cone(x: number, z: number) {
    let best = ISLAND_BED;
    for (const [dx, dz, r, h] of cones)
      best = Math.max(best, h - 4 - (h * Math.hypot(x - centre.x - dx, z - centre.z - dz)) / r);
    return best;
  }
  /** Metres outside the halt fill's rect (0 inside). */
  function fillOut(x: number, z: number) {
    const { u, lat } = ringUL(x, z);
    const du = Math.max(ISLAND_FILL.u0 / 100 - u, 0, u - ISLAND_FILL.u1 / 100),
      dl = Math.max(ISLAND_FILL.lat0 / 100 - lat, 0, lat - ISLAND_FILL.lat1 / 100);
    return Math.hypot(du, dl);
  }
  /** Metres outside the loop's and neck's grade band (0 inside). */
  function loopOut(x: number, z: number) {
    let d = Math.abs(Math.hypot(x - loop.x, z - loop.z) - loop.r);
    for (const s of neck) d = Math.min(d, segDist(x, z, s));
    return Math.max(0, d - ISLAND_LOOP_GRADE.band);
  }
  /** The graded ground at a world point (grid nodes sample this). */
  function graded(x: number, z: number) {
    const capped = Math.min(cone(x, z), ISLAND_LOOP_GRADE.cap + ISLAND_LOOP_GRADE.fall * loopOut(x, z));
    return Math.max(capped, ISLAND_FILL.top - ISLAND_FILL.fall * fillOut(x, z));
  }

  // Row-major from (x0, z0): heights[i + j * nx], i along +x, j along +z.
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) heights[i + j * nx] = graded(x0 + i * ISLAND_CELL, z0 + j * ISLAND_CELL);
  const at = (i: number, j: number) => heights[i + j * nx]!;
  const bounds = { minX: x0, maxX: x0 + (nx - 1) * ISLAND_CELL, minZ: z0, maxZ: z0 + (nz - 1) * ISLAND_CELL };

  /** Whether (x, z) is inside the island's grid. */
  const onIsland = (x: number, z: number) =>
    x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
  /** The ground's height at a world point, on the collider's triangles (Place's anti-diagonal split, as
   * src/proto/place/terrain.ts's triangleHeight); -Infinity off the grid. */
  function islandH(x: number, z: number) {
    if (!onIsland(x, z)) return -Infinity;
    const fx = (x - x0) / ISLAND_CELL,
      fz = (z - z0) / ISLAND_CELL;
    const i = Math.min(nx - 2, Math.floor(fx)),
      j = Math.min(nz - 2, Math.floor(fz));
    const u = fx - i,
      v = fz - j;
    const a = at(i, j),
      b = at(i + 1, j),
      c = at(i, j + 1),
      d = at(i + 1, j + 1);
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  }
  /** The grid as a heightfield shape's rows (src/physics/engine.ts: heights[i][j], i along +x, j along -z from the
   * body's position at the grid's (minX, maxZ) corner), as Place's terrainCollisionTiles lays its tiles. */
  const collider = () => ({
    heights: Array.from({ length: nx }, (_, i) => Array.from({ length: nz }, (_, j) => at(i, nz - 1 - j))),
    cell: ISLAND_CELL,
    position: { x: bounds.minX, y: 0, z: bounds.maxZ },
  });
  return {
    x0,
    z0,
    nx,
    nz,
    cell: ISLAND_CELL,
    heights,
    bounds,
    at,
    islandH,
    onIsland,
    cone,
    fillOut,
    loopOut,
    collider,
  };
}
export type IslandGround = ReturnType<typeof createIslandGround>;
