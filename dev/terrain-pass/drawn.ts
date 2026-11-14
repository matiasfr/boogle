// The terrain pass's drawn ground on Home, measured against the collider without asking the pass how it classified
// anything (docs/plans/terrain-pass.md): it reads only what the pass outputs (vertex heights and triangles) and the
// collider's own triangles. Shared by dev/terrain-pass/prove.ts and test/terrain-pass-island.test.ts. No browser.
import { WALKABLE_NY } from '../../src/constants.ts';
import { GRID, ORIGIN } from '../../src/place/layout.ts';
import { CELL, COVE_FINE, NX, NZ, at, cellX, cellZ, heights } from '../../src/place/terrain.ts';
import { buildIslandSurface, type IslandSurface } from '../../src/proto/terrain-pass/island.ts';

/** The far ground's tile size in cells (src/place/far-ground.ts GROUND_TILE; that file needs a browser). */
export const TILE = 96;
export const inCove = (i: number, j: number) =>
  cellX(i) >= COVE_FINE.x0 && cellX(i) < COVE_FINE.x1 && cellZ(j) >= COVE_FINE.z0 && cellZ(j) < COVE_FINE.z1;

/** The collider triangle under a Place-local point: its height there and its normal's up component. Written here from
 * the grid's heights (the anti-diagonal split land.ts and the heightfield share), not taken from the pass. */
export function collider(x: number, z: number) {
  const fx = (x - GRID.x0) / CELL,
    fz = (z - GRID.z0) / CELL;
  const i = Math.max(0, Math.min(NX - 2, Math.floor(fx))),
    j = Math.max(0, Math.min(NZ - 2, Math.floor(fz))),
    u = fx - i,
    v = fz - j;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  const lower = u + v <= 1;
  const height = lower ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  const [gx, gz] = lower ? [(b - a) / CELL, (c - a) / CELL] : [(d - c) / CELL, (d - b) / CELL];
  return { height, ny: 1 / Math.hypot(1, gx, gz) };
}

export type DrawnHome = {
  surface: IslandSurface;
  /** The drawn height at a Place-local point: the 1 m triangle under it in a fine cell, else the land's own triangle. */
  heightAt: (x: number, z: number) => number;
  /** Every drawn triangle the pass changes, as three Place-local [x, y, z] corners: each fine cell's eight 1 m
   * triangles (a far tile's nearest level) and its two plain 2 m triangles (coarser levels, which share moved corners). */
  triangles: () => Generator<[number, number, number][]>;
};

export function drawnHome(): DrawnHome {
  const base = NX * NZ;
  const surface = buildIslandSurface(base, inCove, TILE);
  const movedY = new Map(surface.moved);
  const vertex = (id: number): [number, number, number] =>
    id < base
      ? [cellX(id % NX), movedY.get(id) ?? heights[id]!, cellZ(Math.floor(id / NX))]
      : [
          surface.position[(id - base) * 3]! - ORIGIN.x,
          surface.position[(id - base) * 3 + 1]!,
          surface.position[(id - base) * 3 + 2]! - ORIGIN.z,
        ];
  const interpolate = (t: [number, number, number][], x: number, z: number) => {
    const [a, b, c] = t as [[number, number, number], [number, number, number], [number, number, number]];
    const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    const wa = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det,
      wb = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
    return { height: wa * a[1] + wb * b[1] + (1 - wa - wb) * c[1], inside: Math.min(wa, wb, 1 - wa - wb) };
  };
  const cellTriangles = (i: number, j: number) => {
    const list = surface.triangles.get(i + j * NX);
    if (!list) return null;
    const out: [number, number, number][][] = [];
    for (let k = 0; k < list.length; k += 3) out.push([vertex(list[k]!), vertex(list[k + 1]!), vertex(list[k + 2]!)]);
    return out;
  };
  const heightAt = (x: number, z: number) => {
    const i = Math.max(0, Math.min(NX - 2, Math.floor((x - GRID.x0) / CELL))),
      j = Math.max(0, Math.min(NZ - 2, Math.floor((z - GRID.z0) / CELL)));
    const fine = cellTriangles(i, j);
    if (!fine) {
      // A 2 m cell: the land's own two triangles, over corners the pass may have moved.
      const u = (x - GRID.x0) / CELL - i,
        v = (z - GRID.z0) / CELL - j;
      const [a, b, c, d] = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)].map((id) => vertex(id)[1]) as [
        number,
        number,
        number,
        number,
      ];
      return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
    }
    let best = { height: NaN, inside: -Infinity };
    for (const t of fine) {
      const hit = interpolate(t, x, z);
      if (hit.inside > best.inside) best = hit;
    }
    return best.height;
  };
  function* triangles() {
    for (const cell of surface.triangles.keys()) {
      const i = cell % NX,
        j = Math.floor(cell / NX);
      yield* cellTriangles(i, j)!;
      const [a, b, c, d] = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)].map(vertex) as [
        [number, number, number],
        [number, number, number],
        [number, number, number],
        [number, number, number],
      ];
      yield [a, c, b];
      yield [b, c, d];
    }
  }
  return { surface, heightAt, triangles };
}

/** Measure every changed triangle against the one collider triangle it lies in: the worst vertical gap on faces a
 * player can stand on, and the worst gap along the face's normal on faces they can't. */
export function measureHome(home: DrawnHome = drawnHome()) {
  const worst = {
    walkable: { gap: 0, at: [0, 0] as [number, number], ny: 1, triangles: 0 },
    steep: { gap: 0, vertical: 0, at: [0, 0] as [number, number], ny: 1, triangles: 0 },
  };
  for (const t of home.triangles()) {
    const [a, b, c] = t as [[number, number, number], [number, number, number], [number, number, number]];
    const cx = (a[0] + b[0] + c[0]) / 3,
      cz = (a[2] + b[2] + c[2]) / 3;
    const face = collider(cx, cz); // a drawn triangle lies inside one collider triangle: its centroid names it
    // The gap is linear across the triangle, so its corners bound it; each is measured on this face's own plane.
    const plane = (x: number, z: number) => face.height + planeSlope(cx, cz, x, z);
    let gap = 0;
    for (const p of [a, b, c]) gap = Math.max(gap, Math.abs(p[1] - plane(p[0], p[2])));
    if (face.ny >= WALKABLE_NY) {
      worst.walkable.triangles++;
      if (gap > worst.walkable.gap) worst.walkable = { ...worst.walkable, gap, at: [cx, cz], ny: face.ny };
    } else {
      worst.steep.triangles++;
      if (gap * face.ny > worst.steep.gap)
        worst.steep = { ...worst.steep, gap: gap * face.ny, vertical: gap, at: [cx, cz], ny: face.ny };
    }
  }
  return worst;
}

/** The collider face under (cx, cz), extended as a plane to (x, z): its height there minus its height at the centre. */
function planeSlope(cx: number, cz: number, x: number, z: number) {
  const fx = (cx - GRID.x0) / CELL,
    fz = (cz - GRID.z0) / CELL;
  const i = Math.max(0, Math.min(NX - 2, Math.floor(fx))),
    j = Math.max(0, Math.min(NZ - 2, Math.floor(fz)));
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  const [gx, gz] = fx - i + (fz - j) <= 1 ? [(b - a) / CELL, (c - a) / CELL] : [(d - c) / CELL, (d - b) / CELL];
  return gx * (x - cx) + gz * (z - cz);
}

/** Under and around everything standing on the ground: the worst gap between the drawn ground and the collider within
 * each keep's radius (its footprint plus a metre), sampled every metre across its disc and round its rim. */
export function measureKeeps(home: DrawnHome, keeps: readonly { kind: string; x: number; z: number; r: number }[]) {
  let worst = { gap: 0, kind: '', keep: [0, 0, 0] as [number, number, number], at: [0, 0] as [number, number] };
  let samples = 0;
  const probe = (k: { kind: string; x: number; z: number; r: number }, x: number, z: number) => {
    if (x <= GRID.x0 || x >= GRID.x1 || z <= GRID.z0 || z >= GRID.z1) return;
    samples++;
    const gap = Math.abs(home.heightAt(x, z) - collider(x, z).height);
    if (gap > worst.gap) worst = { gap, kind: k.kind, keep: [k.x, k.z, k.r], at: [x, z] };
  };
  for (const k of keeps) {
    for (let dz = -Math.floor(k.r); dz <= k.r; dz++)
      for (let dx = -Math.floor(k.r); dx <= k.r; dx++) if (Math.hypot(dx, dz) <= k.r) probe(k, k.x + dx, k.z + dz);
    for (let n = 0; n < 16; n++) {
      const angle = (n / 16) * 2 * Math.PI;
      probe(k, k.x + Math.cos(angle) * k.r, k.z + Math.sin(angle) * k.r);
    }
  }
  return { ...worst, samples, keeps: keeps.length };
}
