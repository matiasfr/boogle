// Where Home's heightfield shows rock (docs/plans/cliff-kit-everywhere.md, the census): every 2 m grid vertex the
// ground material paints as rock (src/place/ground-material.ts: `steep` past its border, or the broad 3 m slope's
// `soil` under 0.57), grouped into connected walls (8-neighbour), each with its extent, height, the triangles it draws,
// how close the paths, the shore climb, the rails and the sea come to it, and its toe cells (rock beside lower open
// ground: where faces stand). Plain Node, no browser; reads the same ground the game builds. The census table is
// dev/ground/cliff-census.ts; the cliff kit's generator (dev/prefab/cliff-kit.ts) and its audit read the walls here.
import { describeGround } from '../../src/place/ground-layers.ts';
import {
  CELL,
  NX,
  NZ,
  at,
  cellX,
  cellZ,
  gorgeD,
  heights,
  PATH_SAMPLES,
  SHORE_SAMPLES,
} from '../../src/place/terrain.ts';
import { HEAD, LINES, ORIGIN, VILLAGE } from '../../src/place/layout.ts';
import { SHORE_LANDING } from '../../src/place/shore-layout.ts';

/** A wall's edge counts as seen within this many metres of a path, the shore climb or a rail, or at the sea. */
export const SEEN = 80;
/** Kit faces go on toe within this many metres of a tread or rail, or at the sea; farther walls take the kit's colour
 * and rim caps (owner, 24 November 2026, docs/decisions-look.md d-2026-11-24-cliff-kit-scope). */
export const DRESS = 40;
/** A toe or rim cell under this height stands at the sea. */
export const SEA_Y = 3;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type View = 'path' | 'shore' | 'rail' | 'sea';
/** A toe or rim cell: the grid vertex, Place-local, and how near the nearest tread (path or shore climb) or rail is. */
export type EdgeCell = { k: number; x: number; z: number; y: number; near: number };
export type Wall = {
  id: number;
  name: string;
  vertices: number;
  areaM2: number;
  box: { x0: number; x1: number; z0: number; z1: number };
  worldBox: { x0: number; x1: number; z0: number; z1: number };
  centre: [number, number];
  y: [number, number];
  triangles: number;
  inGorge: boolean;
  edge: { toe: number; rim: number; toeSeen: number; rimSeen: number; toeDressed: number };
  nearest: Record<View, number>;
};

const ANCHORS: [string, number, number][] = [
  ['gorge north, canyon climb', -21, -170],
  ['gorge, rim lookout side', -100, -120],
  ['gorge west wall', -50, 20],
  ['gorge east wall', 30, -20],
  ['gorge mouth', -20, 160],
  ['south sea cliff', 70, 182],
  ['north ridge', -40, -186],
  ['east rail cutting', 192, -40],
  ['shore climb', SHORE_LANDING.x + 15, SHORE_LANDING.z - 10],
  ['village', VILLAGE.x, VILLAGE.z],
  ['Far Head', HEAD.x, HEAD.z],
];

/** Whether an edge cell is dressed with faces: within `within` m of a tread or rail, or at the sea. */
export const dressed = (c: EdgeCell, within = DRESS) => c.near < within || c.y < SEA_Y;

/** The census: every wall of at least `min` vertices, largest first, with its toe cells, the view samples and a lookup by place. */
export function censusWalls(min = 25) {
  // The material's rock mask at each grid vertex, without its per-pixel wander: rock past half strength.
  const layers = { steep: new Float32Array(1), foot: new Float32Array(1), soil: new Float32Array(1) };
  const rock = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      describeGround(cellX(i), cellZ(j), 0, layers);
      const r = Math.max(smooth(0.3, 0.42, layers.steep[0]!), 1 - smooth(0.54, 0.6, layers.soil[0]!));
      if (r > 0.5) rock[at(i, j)] = 1;
    }

  // Who looks at it: dense samples along each view line.
  const views: Record<View, [number, number][]> = { path: [], shore: [], rail: [], sea: [] };
  for (const line of PATH_SAMPLES) for (const [x, z] of line) views.path.push([x, z]);
  for (const [x, z] of SHORE_SAMPLES) views.shore.push([x, z]);
  for (const line of Object.values(LINES))
    for (let k = 0; k < line.xs.length; k += 2) views.rail.push([line.xs[k]!, line.zs[k]!]);
  for (let j = 1; j < NZ - 1; j += 2)
    for (let i = 1; i < NX - 1; i += 2) if (heights[at(i, j)]! < -0.5) views.sea.push([cellX(i), cellZ(j)]);
  // Nearest-distance queries over each list, binned on a BIN m grid and searched ring by ring outward.
  const BIN = 16,
    RINGS = Math.ceil((Math.max(NX, NZ) * CELL) / BIN) + 1;
  const binned = new Map<[number, number][], Map<number, [number, number][]>>();
  const key = (i: number, j: number) => i * 4096 + j;
  const nearest = (list: [number, number][], x: number, z: number) => {
    let bins = binned.get(list);
    if (!bins) {
      bins = new Map();
      for (const q of list) {
        const k = key(Math.floor(q[0] / BIN), Math.floor(q[1] / BIN));
        (bins.get(k) ?? bins.set(k, []).get(k)!).push(q);
      }
      binned.set(list, bins);
    }
    const i = Math.floor(x / BIN),
      j = Math.floor(z / BIN);
    let best = Infinity;
    for (let ring = 0; ring <= RINGS; ring++) {
      for (let di = -ring; di <= ring; di++)
        for (let dj = -ring; dj <= ring; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue;
          for (const [px, pz] of bins.get(key(i + di, j + dj)) ?? [])
            best = Math.min(best, (px - x) ** 2 + (pz - z) ** 2);
        }
      // Every point in the next ring out is at least ring BIN m away.
      if (best <= (ring * BIN) ** 2) break;
    }
    return Math.sqrt(best);
  };

  const seen = new Uint8Array(NX * NZ);
  const walls: Wall[] = [];
  const toes = new Map<Wall, EdgeCell[]>();
  const cellsOf = new Map<Wall, number[]>();
  for (let start = 0; start < NX * NZ; start++) {
    if (!rock[start] || seen[start]) continue;
    const stack = [start],
      cells: number[] = [];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      cells.push(k);
      const i = k % NX,
        j = (k - i) / NX;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const a = i + di,
            b = j + dj;
          if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
          const n = at(a, b);
          if (rock[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
    }
    if (cells.length < min) continue;
    let x0 = Infinity,
      x1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity,
      sx = 0,
      sz = 0,
      gorge = 0;
    for (const k of cells) {
      const x = cellX(k % NX),
        z = cellZ(Math.floor(k / NX)),
        y = heights[k]!;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      sx += x;
      sz += z;
      if (gorgeD(x, z) < 25) gorge++;
    }
    const cx = sx / cells.length,
      cz = sz / cells.length;
    // The nearest view distances, over a sample of the wall's vertices (every vertex for small walls).
    const stride = Math.max(1, Math.floor(cells.length / 400));
    const near: Record<View, number> = { path: Infinity, shore: Infinity, rail: Infinity, sea: Infinity };
    for (let n = 0; n < cells.length; n += stride) {
      const k = cells[n]!,
        x = cellX(k % NX),
        z = cellZ(Math.floor(k / NX));
      for (const v of Object.keys(views) as View[]) near[v] = Math.min(near[v], nearest(views[v], x, z));
    }
    // The toe (rock beside lower open ground: the foot, where faces stand) and the rim (rock beside open ground at or
    // above it: the lip, where caps go), in metres of edge (a 2 m cell each), and how much of each is seen (within SEEN
    // m of a path, the shore climb or a rail, or at the sea) and, for the toe, dressed with faces (within DRESS m).
    const toe: EdgeCell[] = [],
      rim: EdgeCell[] = [];
    for (const k of cells) {
      const i = k % NX,
        j = (k - i) / NX,
        y = heights[k]!;
      let low = false,
        high = false;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const a = i + di,
          b = j + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ || rock[at(a, b)]) continue;
        const h = heights[at(a, b)]!;
        if (h < y) low = true;
        else high = true;
      }
      if (!low && !high) continue;
      const x = cellX(i),
        z = cellZ(j);
      const cell = {
        k,
        x,
        z,
        y,
        near: Math.min(...(['path', 'shore', 'rail'] as const).map((v) => nearest(views[v], x, z))),
      };
      if (low) toe.push(cell);
      if (high) rim.push(cell);
    }
    const metres = (list: EdgeCell[], within: number) => list.filter((c) => dressed(c, within)).length * CELL;
    const anchor = ANCHORS.map(([name, ax, az]) => [name, Math.hypot(cx - ax, cz - az)] as const).sort(
      (a, b) => a[1] - b[1],
    )[0]!;
    const wall: Wall = {
      id: walls.length,
      name: `${anchor[0]}${anchor[1] > 60 ? ` +${Math.round(anchor[1])} m` : ''}`,
      vertices: cells.length,
      areaM2: cells.length * CELL * CELL,
      box: { x0, x1, z0, z1 },
      worldBox: { x0: x0 + ORIGIN.x, x1: x1 + ORIGIN.x, z0: z0 + ORIGIN.z, z1: z1 + ORIGIN.z },
      centre: [Math.round(cx), Math.round(cz)],
      y: [Math.round(y0 * 10) / 10, Math.round(y1 * 10) / 10],
      // Two triangles a grid cell, a cell per rock vertex near enough; the cove's fine patch is not counted.
      triangles: cells.length * 2,
      inGorge: gorge > cells.length / 2,
      edge: {
        toe: toe.length * CELL,
        rim: rim.length * CELL,
        toeSeen: metres(toe, SEEN),
        rimSeen: metres(rim, SEEN),
        toeDressed: metres(toe, DRESS),
      },
      nearest: Object.fromEntries(Object.entries(near).map(([k, v]) => [k, Math.round(v)])) as Record<View, number>,
    };
    walls.push(wall);
    toes.set(wall, toe);
    cellsOf.set(wall, cells);
  }
  walls.sort((a, b) => b.vertices - a.vertices);
  for (const [n, w] of walls.entries()) w.id = n;
  const label = new Int32Array(NX * NZ).fill(-1);
  for (const w of walls) for (const k of cellsOf.get(w)!) label[k] = w.id;
  /** The wall holding the grid vertex nearest Place-local (x, z), if any. */
  const wallAt = (x: number, z: number) => {
    const i = Math.round((x - cellX(0)) / CELL),
      j = Math.round((z - cellZ(0)) / CELL);
    return i < 0 || j < 0 || i >= NX || j >= NZ ? undefined : walls[label[at(i, j)]!];
  };
  return { walls, toes, views, nearest, wallAt };
}
