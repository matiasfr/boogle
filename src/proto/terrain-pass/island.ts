// The terrain pass over all of Home (docs/plans/terrain-pass.md, step 2 of the rollout; owner, 10 November: "apply to
// all of Home"). Pure numbers, no three.js, so dev/terrain-pass/prove.ts can check the tolerance in Node. Walkable cells
// keep the land's own 2 m triangles; every unwalkable cell outside the cove's patch is drawn at 1 m with the strata
// ledges. Nothing here reaches the collider, H, the shore provider, the tree catalog or the level check.
import { smoothstep } from '../../math.ts';
import { WALKABLE_NY } from '../../constants.ts';
import { GRID, ORIGIN, ROCKS } from '../../place/layout.ts';
import { CELL, GRADED, NX, NZ, at, cellX, cellZ, clearMask, pathMask } from '../../place/terrain.ts';
import { LAND_TREES } from '../../place/tree-catalog.ts';
import { placements } from './placements.ts';
import { colliderHeight, colliderNy, describeGround, ledgeOffset } from './surface.ts';

/** One thing standing on Home's ground: the drawn ground is the collider's everywhere within `r` of it (Place-local
 * metres; `r` already includes KEEP_MARGIN around the footprint). `id` names a catalogued placement. */
export type GroundKeep = {
  kind: 'pad' | 'strip' | 'support' | 'tree' | 'rock' | 'placed';
  id?: string;
  x: number;
  z: number;
  r: number;
};
/** How far past a footprint the drawn ground stays exact, metres. */
export const KEEP_MARGIN = 1;
/** A 1 m drawn triangle that reaches into a keep has its far corner at most this much further out, so vertices are held
 * this far beyond `r`: then every point within `r` lies on triangles whose corners are all exact. */
const KEEP_REACH = 1.5;
/**
 * Everything standing on Home's ground, the one list the pass protects and test/terrain-pass-island.test.ts iterates,
 * each with a metre around it: every footprint the terrain grades for (terrain.ts GRADED: pads, each metre of rail bed
 * and path, support boxes), every catalogued placement whether or not the terrain graded for it (placements.ts: the
 * ancient technology's platforms, pillars, devices and walks, halts, station frames and props, every plot by name),
 * every tree and every rock. Read from the live layout at load.
 */
export const GROUND_KEEPS: GroundKeep[] = [
  ...GRADED.map((g) => ({ ...g, r: g.r + KEEP_MARGIN })),
  ...placements().map((p) => ({ kind: 'placed' as const, ...p, r: p.r + KEEP_MARGIN })),
  ...LAND_TREES.map((t) => ({ kind: 'tree' as const, x: t.x - ORIGIN.x, z: t.z - ORIGIN.z, r: t.size + KEEP_MARGIN })),
  ...ROCKS.map((r) => ({ kind: 'rock' as const, x: r.x, z: r.z, r: r.r + KEEP_MARGIN })),
];
/** The keeps by 16 m bucket: each is filed under every bucket its fade reaches, so a lookup reads one bucket. */
const BUCKET = 16;
const keeps = new Map<number, GroundKeep[]>();
const bucket = (x: number, z: number) => Math.floor(x / BUCKET) + 4096 * Math.floor(z / BUCKET);
for (const k of GROUND_KEEPS) {
  const reach = k.r + KEEP_REACH + 1;
  for (let bz = Math.floor((k.z - reach) / BUCKET); bz <= Math.floor((k.z + reach) / BUCKET); bz++)
    for (let bx = Math.floor((k.x - reach) / BUCKET); bx <= Math.floor((k.x + reach) / BUCKET); bx++) {
      const key = bx + 4096 * bz;
      const list = keeps.get(key) ?? [];
      list.push(k);
      keeps.set(key, list);
    }
}
function gridMask(field: Float32Array, x: number, z: number) {
  const fx = Math.max(0, Math.min(NX - 1.0001, (x - GRID.x0) / CELL)),
    fz = Math.max(0, Math.min(NZ - 1.0001, (z - GRID.z0) / CELL));
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  return (
    field[at(i, j)]! * (1 - u) * (1 - v) +
    field[at(i + 1, j)]! * u * (1 - v) +
    field[at(i, j + 1)]! * (1 - u) * v +
    field[at(i + 1, j + 1)]! * u * v
  );
}
/** 1 where the drawn ground must equal the collider exactly (paths, pads, graded beds, trees, rocks), anywhere on Home. */
export function protectionAt(x: number, z: number) {
  let keep = Math.max(smoothstep(0, 0.05, gridMask(clearMask, x, z)), smoothstep(0, 0.05, gridMask(pathMask, x, z)));
  for (const k of keeps.get(bucket(x, z)) ?? []) {
    if (keep >= 1) break;
    const held = k.r + KEEP_REACH;
    keep = Math.max(keep, smoothstep(held + 1, held, Math.hypot(x - k.x, z - k.z)));
  }
  return keep;
}

/** Where a body can touch rock: within this of ground a player can stand on (a rim above it, a foot below), metres. */
export const CONTACT = { reach: 1.5, fade: 1, vertical: 0.25 };
/**
 * A ledge's vertical offset, held to CONTACT.vertical within CONTACT.reach of any walkable collider face and freed over
 * the next metre. Rock is drawn up to 0.25 m off its collider along its normal, which on the steepest faces is 0.83 m of
 * height; where a player stands at the foot of a face or on its rim their body would show that gap, so there the drawn
 * rock stays within a quarter metre of height (under 0.14 m along the normal of any unwalkable face).
 */
function capNearWalkable(x: number, z: number, offset: number) {
  const size = Math.abs(offset);
  if (size <= CONTACT.vertical) return offset;
  // A drawn triangle that comes within reach of walkable ground has its far corner up to KEEP_REACH further out, so
  // vertices are held that much beyond the reach: then every drawn point within reach is on capped corners only.
  const held = CONTACT.reach + KEEP_REACH;
  let nearest = Infinity;
  for (let d = 0.5; d <= held + CONTACT.fade && nearest === Infinity; d += 0.5)
    for (let n = 0; n < 24; n++) {
      const angle = (n / 24) * 2 * Math.PI;
      if (colliderNy(x + Math.cos(angle) * d, z + Math.sin(angle) * d) >= WALKABLE_NY) {
        nearest = d;
        break;
      }
    }
  const free = smoothstep(held, held + CONTACT.fade, nearest);
  return Math.sign(offset) * (CONTACT.vertical + free * (size - CONTACT.vertical));
}

/** Whether coarse cell (i, j) has a collider triangle you can't stand on. */
export function steepCell(i: number, j: number) {
  const x = cellX(i),
    z = cellZ(j);
  return Math.min(colliderNy(x + 0.5, z + 0.5), colliderNy(x + 1.5, z + 1.5)) < WALKABLE_NY;
}

export type IslandSurface = {
  /** Whether cell (i, j) is drawn at 1 m. */
  fine: (i: number, j: number) => boolean;
  fineCells: number;
  /** New vertices (cell centres and edge midpoints), world coordinates; their ids start at `base`. */
  position: Float32Array;
  /** The land's own grid vertices that the ledges move: vertex id and its drawn height. */
  moved: [id: number, y: number][];
  /** A fine cell's eight triangles, by cell `i + j * NX`. */
  triangles: Map<number, number[]>;
  /** Material inputs for the grid's vertices, then for the new ones (see describeGround). */
  steep: Float32Array;
  foot: Float32Array;
  soil: Float32Array;
};

/**
 * Home's unwalkable cells at 1 m. `base` is the id of the first new vertex; `skip` names cells the land leaves out (the
 * cove's patch); `tile` is the far ground's tile size in cells. Crack-free: a vertex moves only when every cell it
 * touches is a 1 m cell and it is not on a tile's border, so an edge shared with a 2 m cell, or with a far tile drawn
 * coarser, stays that cell's straight edge. `contactCap` (on; `?terrainCap=0` turns it off to compare) holds the rock
 * a body can touch close to its collider: see capNearWalkable.
 */
export function buildIslandSurface(
  base: number,
  skip: (i: number, j: number) => boolean,
  tile: number,
  contactCap = true,
): IslandSurface {
  const cw = NX - 1,
    cd = NZ - 1;
  const mark = new Uint8Array(cw * cd);
  let fineCells = 0;
  for (let j = 0; j < cd; j++)
    for (let i = 0; i < cw; i++)
      if (!skip(i, j) && steepCell(i, j)) {
        mark[i + j * cw] = 1;
        fineCells++;
      }
  const fine = (i: number, j: number) => i >= 0 && j >= 0 && i < cw && j < cd && mark[i + j * cw] === 1;
  // Lattice points in 1 m (half-cell) units from the grid's corner. Even-even points are the land's own vertices.
  const ids = new Map<number, number>();
  const xyz: number[] = [];
  const moved: [number, number][] = [];
  const seen = new Set<number>();
  const free = (a: number, b: number) => {
    if (a % (2 * tile) === 0 || b % (2 * tile) === 0) return false;
    const ia = a % 2 ? [(a - 1) / 2] : [a / 2 - 1, a / 2],
      jb = b % 2 ? [(b - 1) / 2] : [b / 2 - 1, b / 2];
    return ia.every((i) => jb.every((j) => fine(i, j)));
  };
  const height = (a: number, b: number) => {
    const x = GRID.x0 + a * (CELL / 2),
      z = GRID.z0 + b * (CELL / 2);
    if (!free(a, b)) return colliderHeight(x, z);
    const offset = ledgeOffset(x, z, protectionAt(x, z));
    return colliderHeight(x, z) + (contactCap ? capNearWalkable(x, z, offset) : offset);
  };
  const vertex = (a: number, b: number) => {
    if (a % 2 === 0 && b % 2 === 0) {
      const id = at(a / 2, b / 2);
      if (!seen.has(id)) {
        seen.add(id);
        if (free(a, b)) moved.push([id, height(a, b)]);
      }
      return id;
    }
    const key = a + b * (2 * cw + 1);
    let id = ids.get(key);
    if (id === undefined) {
      id = base + ids.size;
      ids.set(key, id);
      xyz.push(GRID.x0 + a * (CELL / 2) + ORIGIN.x, height(a, b), GRID.z0 + b * (CELL / 2) + ORIGIN.z);
    }
    return id;
  };
  const triangles = new Map<number, number[]>();
  for (let j = 0; j < cd; j++)
    for (let i = 0; i < cw; i++) {
      if (!fine(i, j)) continue;
      const list: number[] = [];
      for (const [da, db] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        const a = 2 * i + da,
          b = 2 * j + db;
        const p = vertex(a, b),
          q = vertex(a + 1, b),
          r = vertex(a, b + 1),
          t = vertex(a + 1, b + 1);
        list.push(p, r, q, q, r, t);
      }
      triangles.set(i + j * NX, list);
    }
  const extra = xyz.length / 3,
    grid = NX * NZ;
  const steep = new Float32Array(grid + extra),
    foot = new Float32Array(grid + extra),
    soil = new Float32Array(grid + extra);
  const out = { steep, foot, soil };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) describeGround(cellX(i), cellZ(j), at(i, j), out);
  for (let k = 0; k < extra; k++) describeGround(xyz[k * 3]! - ORIGIN.x, xyz[k * 3 + 2]! - ORIGIN.z, grid + k, out);
  return { fine, fineCells, position: Float32Array.from(xyz), moved, triangles, steep, foot, soil };
}
