// The terrain pass's drawn surface for one wedge of Place (docs/plans/terrain-pass.md). Pure numbers, no three.js, so
// dev/terrain-pass/prove.ts can check the tolerance in Node. Nothing here reaches the collider, H, the shore provider,
// the tree catalog or the level check: they all keep reading terrain.ts's 2 m grid. Local look experiment.
import { smoothstep } from '../../math.ts';
import { WALKABLE_NY } from '../../constants.ts';
import { GRID, ORIGIN, ROCKS } from '../../place/layout.ts';
import { CELL, GRADED, NX, NZ, at, cellX, cellZ, clearMask, gorgeD, heights, pathMask } from '../../place/terrain.ts';
import { LAND_TREES } from '../../place/tree-catalog.ts';

/** The wedge, Place-local metres on the 2 m grid: the village's south slope, the path's switchback down into the
 * gorge's stem, the south footbridge, both gorge walls and the south coast. No rail bed inside it. */
export const WEDGE = { x0: -104, x1: 4, z0: 50, z1: 196 };
/** Whether coarse cell (i, j) (its corner at cellX(i), cellZ(j)) lies inside the wedge. */
export const wedgeCell = (i: number, j: number) =>
  cellX(i) >= WEDGE.x0 && cellX(i) < WEDGE.x1 && cellZ(j) >= WEDGE.z0 && cellZ(j) < WEDGE.z1;

/** Tolerances, metres. Walkable ground: vertical offset from the collider. Steep (unwalkable) rock: offset along the
 * collider face's normal. Protected ground (paths, pads, trees, rocks): none. */
export const TOLERANCE = { walkable: 0.05, steep: 0.25, protectedGround: 0 };
/** Strata period, metres: the cove's `bandScale`, so geometric ledges and painted beds can share one rhythm. */
export const STRATA = 2.4;
/** The wedge's border blends back to the collider's own triangles over this many metres. */
const EDGE_FADE = 6;

const corner = (i: number, j: number) =>
  heights[at(Math.max(0, Math.min(NX - 1, i)), Math.max(0, Math.min(NZ - 1, j)))]!;

/** The collider's (and today's drawn) surface: the grid's anti-diagonal triangles. */
export function colliderHeight(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.min(Math.floor(fx), NX - 2),
    j = Math.min(Math.floor(fz), NZ - 2),
    u = fx - i,
    v = fz - j;
  const a = corner(i, j),
    b = corner(i + 1, j),
    c = corner(i, j + 1),
    d = corner(i + 1, j + 1);
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

/** Up component of the collider triangle's normal under (x, z). */
export function colliderNy(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.min(Math.floor(fx), NX - 2),
    j = Math.min(Math.floor(fz), NZ - 2),
    u = fx - i,
    v = fz - j;
  const a = corner(i, j),
    b = corner(i + 1, j),
    c = corner(i, j + 1),
    d = corner(i + 1, j + 1);
  const [gx, gz] = u + v <= 1 ? [(b - a) / CELL, (c - a) / CELL] : [(d - c) / CELL, (d - b) / CELL];
  return 1 / Math.hypot(1, gx, gz);
}

function cubic(a: number, b: number, c: number, d: number, t: number) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}

/** Catmull-Rom through the grid, clamped to the cell's corners like the cove's fine patch (no new peaks or pits). */
export function smoothHeight(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  const row = (dz: number) =>
    cubic(corner(i - 1, j + dz), corner(i, j + dz), corner(i + 1, j + dz), corner(i + 2, j + dz), u);
  const corners = [corner(i, j), corner(i + 1, j), corner(i, j + 1), corner(i + 1, j + 1)];
  return Math.max(Math.min(...corners), Math.min(Math.max(...corners), cubic(row(-1), row(0), row(1), row(2), v)));
}

/** Bilinear lookup of a per-vertex grid mask. */
function mask(field: Float32Array, x: number, z: number) {
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

/** Placed things inside the wedge whose ground must not move, Place-local, with a keep radius. */
export const KEEPS: { x: number; z: number; r: number }[] = [
  ...LAND_TREES.map((t) => ({ x: t.x - ORIGIN.x, z: t.z - ORIGIN.z, r: 2.5 + t.size })),
  ...ROCKS.map((r) => ({ x: r.x, z: r.z, r: r.r + 2 })),
  // Whatever the terrain graded ground for (pads, rail beds, paths, supports), with a metre around and the reach of a
  // drawn triangle beyond that, as island.ts keeps them for all of Home.
  ...GRADED.map((g) => ({ x: g.x, z: g.z, r: g.r + 2.5 })),
].filter((k) => k.x > WEDGE.x0 - 6 && k.x < WEDGE.x1 + 6 && k.z > WEDGE.z0 - 6 && k.z < WEDGE.z1 + 6);

/** 1 where the drawn ground must equal the collider exactly (paths, pads, graded beds, trees, rocks). */
export function protection(x: number, z: number) {
  let keep = Math.max(smoothstep(0, 0.05, mask(clearMask, x, z)), smoothstep(0, 0.05, mask(pathMask, x, z)));
  for (const k of KEEPS) keep = Math.max(keep, smoothstep(k.r + 1, k.r, Math.hypot(x - k.x, z - k.z)));
  return keep;
}

/** The flattest collider triangle touching (x, z): a vertex on a rim belongs to the grass as much as to the rock, and
 * its offset must satisfy the stricter of the two. Offsets are linear inside a drawn triangle, which lies inside one
 * collider triangle, so bounding every vertex by its flattest neighbour bounds every drawn point.
 *
 * Every incident face counts. Six triangles meet at a grid vertex (the anti-diagonal split gives two of the four cells
 * both their triangles there), so four diagonal probes are not enough: a probe along a cell's own diagonal lands on one
 * of its two triangles and never sees the other (review, 14 November: a walkable face sank 0.49 m that way). These
 * eight directions fall strictly inside each of the six, and inside both faces at an edge's midpoint or a cell's centre. */
export function vertexNy(x: number, z: number) {
  const e = 1e-3;
  let flattest = 0;
  for (const [dx, dz] of [
    [2, 1],
    [1, 2],
    [-1, 2],
    [-2, 1],
    [-2, -1],
    [-1, -2],
    [1, -2],
    [2, -1],
  ] as const)
    flattest = Math.max(flattest, colliderNy(x + dx * e, z + dz * e));
  return flattest;
}

/** How unwalkable the collider is here: 0 on walkable ground, 1 on rock you can't stand on. */
export function steepness(x: number, z: number) {
  return smoothstep(WALKABLE_NY, WALKABLE_NY - 0.15, vertexNy(x, z));
}

/** Height-keyed strata ledges: flat treads, steep risers, one per STRATA metres, wandering gently sideways. */
function ledge(x: number, z: number, h: number) {
  const warp = 0.35 * Math.sin(x * 0.08) + 0.3 * Math.sin(z * 0.06 + 1.3);
  const q = (h + warp) / STRATA,
    bed = Math.floor(q),
    f = q - bed;
  return (bed + smoothstep(0.3, 1, f)) * STRATA - warp;
}

/** 0 on the wedge's border .. 1 from EDGE_FADE metres in. */
export const edgeFade = (x: number, z: number) =>
  smoothstep(0, EDGE_FADE, Math.min(x - WEDGE.x0, WEDGE.x1 - x, z - WEDGE.z0, WEDGE.z1 - z));

/** The drawn height at a Place-local point, and the parts it came from. */
export function drawnHeight(x: number, z: number) {
  const collider = colliderHeight(x, z),
    ny = vertexNy(x, z),
    steep = steepness(x, z),
    keep = protection(x, z),
    fade = edgeFade(x, z);
  const flat = Math.max(-TOLERANCE.walkable, Math.min(TOLERANCE.walkable, smoothHeight(x, z) - collider));
  // A vertical offset dh is dh * ny along the face's normal.
  const rock = Math.max(-TOLERANCE.steep / ny, Math.min(TOLERANCE.steep / ny, ledge(x, z, collider) - collider));
  const offset = fade * (1 - keep) * ((1 - steep) * flat + steep * rock);
  const ledgeOffset = fade * (1 - keep) * steep * rock;
  return { height: collider + offset, collider, offset, ledgeOffset, ny, steep, keep };
}

export type WedgeSurface = {
  /** The drawn cell, metres (round two mixes 2 m and 1 m: 1). */
  step: number;
  position: Float32Array;
  normal: Float32Array;
  /** 0 walkable .. 1 unwalkable, for the materials. */
  steep: Float32Array;
  /** 0 at a face's foot .. 1 at its rim, from the coarse neighbourhood. */
  foot: Float32Array;
  path: Float32Array;
  /** Broad 3 m soil slope (normal Y) for coverage, as land.ts bakes for the cove. */
  soil: Float32Array;
  /** 1 on the gorge's low floor (not a beach). */
  gorge: Float32Array;
  index: Uint32Array;
};

type Layers = Pick<WedgeSurface, 'steep' | 'foot' | 'path' | 'soil' | 'gorge'>;
/** The material's per-vertex inputs at a Place-local point, all read from the collider's grid. */
function describe(x: number, z: number, k: number, out: Layers) {
  describeGround(x, z, k, out);
  out.path[k] = mask(pathMask, x, z);
  out.gorge[k] = smoothstep(20, 16, gorgeD(x, z)) * smoothstep(3.6, 2.8, colliderHeight(x, z));
}

/** Round two's per-vertex inputs (how unwalkable, foot-to-rim, the broad soil slope) at a Place-local point. */
export function describeGround(x: number, z: number, k: number, out: Pick<WedgeSurface, 'steep' | 'foot' | 'soil'>) {
  out.steep[k] = steepness(x, z);
  // Foot-to-rim position within a 6 m neighbourhood of the collider.
  let lo = Infinity,
    hi = -Infinity;
  for (const [dx, dz] of [
    [-6, 0],
    [6, 0],
    [0, -6],
    [0, 6],
    [0, 0],
  ]) {
    const s = colliderHeight(x + dx!, z + dz!);
    lo = Math.min(lo, s);
    hi = Math.max(hi, s);
  }
  out.foot[k] = hi - lo > 0.5 ? (colliderHeight(x, z) - lo) / (hi - lo) : 1;
  let gx = 0,
    gz = 0;
  for (const o of [-1.5, 0, 1.5]) {
    const w = o === 0 ? 2 : 1;
    gx += w * (colliderHeight(x + 3, z + o) - colliderHeight(x - 3, z + o));
    gz += w * (colliderHeight(x + o, z + 3) - colliderHeight(x + o, z - 3));
  }
  out.soil[k] = 1 / Math.hypot(1, gx / 24, gz / 24);
}

/** The strata ledges' vertical offset at a Place-local point, for ground kept by `keep` (0 free .. 1 exact): nothing on
 * walkable ground, at most TOLERANCE.steep along the face's normal on rock you can't stand on. */
export function ledgeOffset(x: number, z: number, keep: number) {
  const collider = colliderHeight(x, z),
    ny = vertexNy(x, z);
  const rock = Math.max(-TOLERANCE.steep / ny, Math.min(TOLERANCE.steep / ny, ledge(x, z, collider) - collider));
  return (1 - keep) * steepness(x, z) * rock;
}

/** The wedge drawn `sub` vertices per 2 m cell side. sub 1 with `fine` false is today's mesh exactly. */
export function buildWedgeSurface(sub: number, fine: boolean): WedgeSurface {
  const step = CELL / sub,
    nx = Math.round((WEDGE.x1 - WEDGE.x0) / step) + 1,
    nz = Math.round((WEDGE.z1 - WEDGE.z0) / step) + 1,
    count = nx * nz;
  const position = new Float32Array(count * 3),
    normal = new Float32Array(count * 3),
    steep = new Float32Array(count),
    foot = new Float32Array(count),
    path = new Float32Array(count),
    soil = new Float32Array(count),
    gorge = new Float32Array(count);
  const heightAt = (x: number, z: number) => (fine ? drawnHeight(x, z).height : colliderHeight(x, z));
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = i + j * nx,
        x = WEDGE.x0 + i * step,
        z = WEDGE.z0 + j * step,
        h = heightAt(x, z);
      position.set([x + ORIGIN.x, h, z + ORIGIN.z], k * 3);
      describe(x, z, k, { steep, foot, path, soil, gorge });
    }
  // Normals: walkable ground takes the smooth surface's slope (visual only: no position moves for it), so lighting loses
  // the 2 m diamonds; rock takes the drawn ledges' own facets, which the material flattens per pixel anyway.
  const e = step * 0.5;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = i + j * nx,
        x = WEDGE.x0 + i * step,
        z = WEDGE.z0 + j * step;
      const drawn = (dx: number, dz: number) => {
        const ii = Math.max(0, Math.min(nx - 1, i + dx)),
          jj = Math.max(0, Math.min(nz - 1, j + dz));
        return position[(ii + jj * nx) * 3 + 1]!;
      };
      const ix0 = i > 0 ? -1 : 0,
        ix1 = i < nx - 1 ? 1 : 0,
        jz0 = j > 0 ? -1 : 0,
        jz1 = j < nz - 1 ? 1 : 0;
      let gx = (drawn(ix1, 0) - drawn(ix0, 0)) / ((ix1 - ix0) * step),
        gz = (drawn(0, jz1) - drawn(0, jz0)) / ((jz1 - jz0) * step);
      if (fine) {
        const sx = (smoothHeight(x + e, z) - smoothHeight(x - e, z)) / (2 * e),
          sz = (smoothHeight(x, z + e) - smoothHeight(x, z - e)) / (2 * e);
        // Near a rim the smooth surface rounds the crease: keep the drawn facets within 4 m of any rock.
        const near = Math.max(steepness(x + 4, z), steepness(x - 4, z), steepness(x, z + 4), steepness(x, z - 4));
        const w = (1 - near) * edgeFade(x, z);
        gx += (sx - gx) * w;
        gz += (sz - gz) * w;
      }
      const n = Math.hypot(gx, 1, gz);
      normal.set([-gx / n, 1 / n, -gz / n], k * 3);
    }
  // Same anti-diagonal split as land.ts: every drawn triangle lies inside one collider triangle when sub divides it.
  const index = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let n = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = i + j * nx,
        b = a + 1,
        c = a + nx,
        d = c + 1;
      index.set([a, c, b, b, c, d], n);
      n += 6;
    }
  return { step, position, normal, steep, foot, path, soil, gorge, index };
}

/** Whether coarse cell (i, j) has a collider triangle you can't stand on. */
function steepCell(i: number, j: number) {
  const x = cellX(i),
    z = cellZ(j);
  return Math.min(colliderNy(x + 0.5, z + 0.5), colliderNy(x + 1.5, z + 1.5)) < WALKABLE_NY;
}

/** Round two (owner, 10 November: denser triangles only on unwalkable cells). Walkable cells keep today's 2 m
 * triangles exactly; steep cells are drawn at 1 m with the strata ledges. Crack-free: a 1 m vertex moves only when every
 * cell it touches is a 1 m cell, so a midpoint on an edge shared with a 2 m cell (or the wedge's border) stays on that
 * edge's line. Normals: grass from the smooth surface (lighting only), rock from its own facets. */
export function buildSteepSurface(): WedgeSurface {
  const ci0 = Math.round((WEDGE.x0 - GRID.x0) / CELL),
    cj0 = Math.round((WEDGE.z0 - GRID.z0) / CELL),
    cw = Math.round((WEDGE.x1 - WEDGE.x0) / CELL),
    cd = Math.round((WEDGE.z1 - WEDGE.z0) / CELL);
  const fine = new Uint8Array(cw * cd);
  for (let j = 0; j < cd; j++) for (let i = 0; i < cw; i++) fine[i + j * cw] = steepCell(ci0 + i, cj0 + j) ? 1 : 0;
  const isFine = (i: number, j: number) => i >= 0 && j >= 0 && i < cw && j < cd && fine[i + j * cw] === 1;
  // Lattice points in 1 m (half-cell) units from the wedge's corner.
  const ids = new Map<number, number>();
  const xs: number[] = [],
    zs: number[] = [],
    free: boolean[] = [];
  const vertex = (a: number, b: number) => {
    const key = a + b * (2 * cw + 1);
    let id = ids.get(key);
    if (id === undefined) {
      id = xs.length;
      ids.set(key, id);
      xs.push(WEDGE.x0 + a * (CELL / 2));
      zs.push(WEDGE.z0 + b * (CELL / 2));
      const ia = a % 2 ? [(a - 1) / 2] : [a / 2 - 1, a / 2],
        jb = b % 2 ? [(b - 1) / 2] : [b / 2 - 1, b / 2];
      free.push(ia.every((i) => jb.every((j) => isFine(i, j))));
    }
    return id;
  };
  const tris: number[] = [];
  const quad = (a: number, b: number, s: number) => {
    const p = vertex(a, b),
      q = vertex(a + s, b),
      r = vertex(a, b + s),
      t = vertex(a + s, b + s);
    tris.push(p, r, q, q, r, t);
  };
  for (let j = 0; j < cd; j++)
    for (let i = 0; i < cw; i++) {
      if (!isFine(i, j)) quad(2 * i, 2 * j, 2);
      else
        for (const [da, db] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const)
          quad(2 * i + da, 2 * j + db, 1);
    }
  const count = xs.length;
  const position = new Float32Array(count * 3),
    normal = new Float32Array(count * 3),
    layers: Layers = {
      steep: new Float32Array(count),
      foot: new Float32Array(count),
      path: new Float32Array(count),
      soil: new Float32Array(count),
      gorge: new Float32Array(count),
    };
  for (let k = 0; k < count; k++) {
    const x = xs[k]!,
      z = zs[k]!;
    const d = drawnHeight(x, z);
    position.set([x + ORIGIN.x, d.collider + (free[k] ? d.ledgeOffset : 0), z + ORIGIN.z], k * 3);
    describe(x, z, k, layers);
  }
  // Facet normals, area-weighted, then the smooth surface on grass away from any rock.
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t]!, tris[t + 1]!, tris[t + 2]!];
    const ux = position[b * 3]! - position[a * 3]!,
      uy = position[b * 3 + 1]! - position[a * 3 + 1]!,
      uz = position[b * 3 + 2]! - position[a * 3 + 2]!,
      vx = position[c * 3]! - position[a * 3]!,
      vy = position[c * 3 + 1]! - position[a * 3 + 1]!,
      vz = position[c * 3 + 2]! - position[a * 3 + 2]!;
    // (b - a) x (c - a) points up for this winding.
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normal[v * 3] = normal[v * 3]! + nx;
      normal[v * 3 + 1] = normal[v * 3 + 1]! + ny;
      normal[v * 3 + 2] = normal[v * 3 + 2]! + nz;
    }
  }
  const e = 0.5;
  for (let k = 0; k < count; k++) {
    const x = xs[k]!,
      z = zs[k]!;
    let gx = -normal[k * 3]! / normal[k * 3 + 1]!,
      gz = -normal[k * 3 + 2]! / normal[k * 3 + 1]!;
    const sx = (smoothHeight(x + e, z) - smoothHeight(x - e, z)) / (2 * e),
      sz = (smoothHeight(x, z + e) - smoothHeight(x, z - e)) / (2 * e);
    const near = Math.max(steepness(x + 4, z), steepness(x - 4, z), steepness(x, z + 4), steepness(x, z - 4));
    const w = (1 - near) * edgeFade(x, z);
    gx += (sx - gx) * w;
    gz += (sz - gz) * w;
    const n = Math.hypot(gx, 1, gz);
    normal.set([-gx / n, 1 / n, -gz / n], k * 3);
  }
  return { step: 1, position, normal, ...layers, index: Uint32Array.from(tris) };
}
