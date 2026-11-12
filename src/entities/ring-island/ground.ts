// Ring Island's ground (docs/plans/ring-island-build1.md, R2b): a 2 m grid over the island's waterline box, the max of
// the four cones' surfaces (Place's buildFar, src/proto/greybox/ring-cones.ts) carried on below their -4 m base to the
// sea bed, graded to a fill under the island halt and capped under the run-off bed (RING_END.cut, R2d; Level findings 7,
// 15 and 20).
// Pure: no three.js, no physics. The view builds the drawn mesh and the heightfield collider from `heights`; recovery
// and the saved pose read `islandH`, the same triangles the collider has. World metres.
import { RING_END, RING_ORIGIN } from '../../sim/railway-ring-layout.ts';
import { ROW_SHIFT, rowPoint } from '../../sim/railway-route.ts';

/** dx, dz, radius, height from the island's centre, as RING_CONES. */
export type Cone = readonly [number, number, number, number];
export const ISLAND_CELL = 2;
/** The open sea bed off the island's shore (src/world/grid.ts SEABED). */
export const ISLAND_BED = -7.5;
/** The fill under the island halt: its top, under the 8.0 m deck's 0.5 m slab with 10 cm spare, and the embankment's
 * fall per metre outside it (1 in 1.5). */
export const ISLAND_FILL = { top: 7.4, u0: 42700, u1: 46900, lat0: -1030, lat1: 630, fall: 1 / 1.5 } as const;
/** The deepest the run-off's cutting goes into the cones (Level finding 15 counts 1.5 m at the faces; the cone is 9.4 m at the bed's end, so 2 m leaves room). */
export const ISLAND_CUT_MAX = 2;
/** The stack line's cutting (docs/plans/greybox-route.md, leg 1 step 4): line 2 runs on from the halt along the `ring`
 * row, across the island's north-west hillside (the cones stand up to 26.7 m over its 4.0 m deck there), falling from
 * 8.0 m to that deck. The ground is cut to 0.6 m under the rails across both tracks (the formation's middle is 2 m west
 * of the down track, 4.6 m either side) with rock walls rising 3 in 1 outside, a notch and not a slice through the hill;
 * it stops at the station house terrace (STACK_KEEP: Level finding 20's ground, kept as it was). Samples every 2 m from
 * s 1210 m (the platforms' north end) to s 1580 m, where the hillside has fallen under the deck; world metres. */
const STACK_CUT = (() => {
  const out: { x: number; z: number; y: number }[] = [];
  for (let cm = 121000; cm <= 158000; cm += 200) {
    const p = rowPoint('ring', cm + ROW_SHIFT.ring),
      q = rowPoint('ring', cm + ROW_SHIFT.ring + 100),
      len = Math.hypot(q.x - p.x, q.z - p.z);
    out.push({ x: (p.x + ((q.z - p.z) / len) * 200) / 100, z: (p.z - ((q.x - p.x) / len) * 200) / 100, y: p.y / 100 });
  }
  return out;
})();
// 4.6 m of formation and a 2 m grid cell, so the triangles between nodes stay under the deck's edge.
const STACK_CUT_HALF = 6.6,
  STACK_CUT_WALL = 3;
/** The station house terrace grown by a metre (src/proto/greybox/ring-house.ts CONCOURSE.terrace; u and lat, m). */
/** The cutting's samples' box, grown by the reach of its walls: outside it no node is tested against them. */
const STACK_BOX = {
  x0: Math.min(...STACK_CUT.map((p) => p.x)) - 16,
  x1: Math.max(...STACK_CUT.map((p) => p.x)) + 16,
  z0: Math.min(...STACK_CUT.map((p) => p.z)) - 16,
  z1: Math.max(...STACK_CUT.map((p) => p.z)) + 16,
};
const STACK_KEEP = { u0: 467, u1: 478.5, lat0: -21, lat1: -8.3 };
const UNIT = Math.sqrt(1 + 0.0272 * 0.0272);
/** u and lat (m) of a world point: the inverse of ringAt (its orthogonal unit axes, unrounded). */
export function ringUL(x: number, z: number) {
  const dx = x - RING_ORIGIN.x / 100,
    dz = z - RING_ORIGIN.z / 100;
  return { u: (0.0272 * dx - dz) / UNIT, lat: (dx + 0.0272 * dz) / UNIT };
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
  /** Metres outside the run-off bed's rect (0 inside; RING_END.bed, u from the halt's north end to the buffers). */
  function bedOut(x: number, z: number) {
    const { u, lat } = ringUL(x, z),
      B = RING_END.bed;
    return Math.hypot(Math.max(B.u0 / 100 - u, 0, u - B.u1 / 100), Math.max(B.lat0 / 100 - lat, 0, lat - B.lat1 / 100));
  }
  /** The graded ground at a world point (grid nodes sample this): the cones, cut to RING_END.cut under the bed and back up
   * the fill's 1 in 1.5 outside it, the cut at most ISLAND_CUT_MAX deep and gone within ISLAND_CUT_MAX / fall metres of
   * the bed (so the cutting is a notch, not a slice through the hillside), never below the halt's fill. */
  function graded(x: number, z: number) {
    const c = cone(x, z),
      d = bedOut(x, z);
    const depth = Math.max(
      0,
      Math.min(c - RING_END.cut / 100 - ISLAND_FILL.fall * d, ISLAND_CUT_MAX - ISLAND_FILL.fall * d),
    );
    return Math.max(stackCut(x, z, c - depth), ISLAND_FILL.top - ISLAND_FILL.fall * fillOut(x, z));
  }
  /** The height the stack line's cutting caps the ground at (STACK_CUT): 0.6 m under the rails across the formation,
   * rising 3 in 1 outside it; Infinity away from the line and on the station house terrace. */
  function stackCap(x: number, z: number) {
    if (x < STACK_BOX.x0 || x > STACK_BOX.x1 || z < STACK_BOX.z0 || z > STACK_BOX.z1) return Infinity;
    const { u, lat } = ringUL(x, z);
    if (u >= STACK_KEEP.u0 && u <= STACK_KEEP.u1 && lat >= STACK_KEEP.lat0 && lat <= STACK_KEEP.lat1) return Infinity;
    let best = Infinity;
    for (const p of STACK_CUT) {
      const dx = x - p.x,
        dz = z - p.z;
      if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
      const out = Math.max(0, Math.hypot(dx, dz) - STACK_CUT_HALF);
      best = Math.min(best, p.y - 0.6 + STACK_CUT_WALL * out);
    }
    return best;
  }
  const stackCut = (x: number, z: number, h: number) => Math.min(h, stackCap(x, z));

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
   * src/place/terrain.ts's triangleHeight); -Infinity off the grid. */
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
    bedOut,
    stackCap,
    collider,
  };
}
export type IslandGround = ReturnType<typeof createIslandGround>;
