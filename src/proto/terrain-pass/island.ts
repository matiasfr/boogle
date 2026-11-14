// The terrain pass over all of Home (docs/plans/terrain-pass.md, step 2 of the rollout; owner, 10 November: "apply to
// all of Home"). Pure numbers, no three.js, so dev/terrain-pass/prove.ts can check the tolerance in Node. Walkable cells
// keep the land's own 2 m triangles; every unwalkable cell outside the cove's patch is drawn at 1 m with the strata
// ledges. Nothing here reaches the collider, H, the shore provider, the tree catalog or the level check.
import { smoothstep } from '../../math.ts';
import { WALKABLE_NY } from '../../constants.ts';
import { GRID, ORIGIN, ROCKS } from '../../place/layout.ts';
import { CELL, NX, NZ, at, cellX, cellZ, clearMask, pathMask } from '../../place/terrain.ts';
import { LAND_TREES } from '../../place/tree-catalog.ts';
import { colliderHeight, colliderNy, describeGround, ledgeOffset } from './surface.ts';

/** Placed things whose ground must not move (every tree and rock on the land), bucketed so a lookup reads its
 * neighbourhood only. */
const BUCKET = 16;
const keeps = new Map<number, { x: number; z: number; r: number }[]>();
const bucket = (x: number, z: number) => Math.floor(x / BUCKET) + 4096 * Math.floor(z / BUCKET);
for (const k of [
  ...LAND_TREES.map((t) => ({ x: t.x - ORIGIN.x, z: t.z - ORIGIN.z, r: 2.5 + t.size })),
  ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r + 2 })),
]) {
  const key = bucket(k.x, k.z);
  const list = keeps.get(key) ?? [];
  list.push(k);
  keeps.set(key, list);
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
  for (let dj = -1; dj <= 1; dj++)
    for (let di = -1; di <= 1; di++)
      for (const k of keeps.get(bucket(x + di * BUCKET, z + dj * BUCKET)) ?? [])
        keep = Math.max(keep, smoothstep(k.r + 1, k.r, Math.hypot(x - k.x, z - k.z)));
  return keep;
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
 * coarser, stays that cell's straight edge.
 */
export function buildIslandSurface(base: number, skip: (i: number, j: number) => boolean, tile: number): IslandSurface {
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
    return colliderHeight(x, z) + (free(a, b) ? ledgeOffset(x, z, protectionAt(x, z)) : 0);
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
