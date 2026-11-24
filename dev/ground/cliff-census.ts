// Where Home's heightfield shows rock (docs/plans/cliff-kit-everywhere.md, the census): every 2 m grid vertex the
// ground material paints as rock (src/place/ground-material.ts: `steep` past its border, or the broad 3 m slope's
// `soil` under 0.57), grouped into connected walls (8-neighbour), each with its extent, height, the triangles it draws
// and how close the paths, the shore climb, the rails and the sea come to it. Plain Node, no browser, no game code
// changed; reads the same ground the game builds.
//   node dev/ground/cliff-census.ts            the table
//   node dev/ground/cliff-census.ts --json     the walls as JSON (.look/cliff-census.json too)
//   node dev/ground/cliff-census.ts --min 40   only walls of at least 40 vertices (default 25, 100 m²)
//   node dev/ground/cliff-census.ts --anchors  also trial a 6 m face every ANCHOR_SPACING m along each wall's seen toe,
//                                              against the canyon kit's own rules (kitPieceProblems, as level-check
//                                              runs them) and the rails' clearance; .look/cliff-anchors.json
import fs from 'node:fs';
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
import type { Placement } from '../../src/prefab/types.ts';

const argv = process.argv.slice(2);
const MIN = argv.includes('--min') ? Number(argv[argv.indexOf('--min') + 1]) : 25;
/** A wall's edge counts as seen within this many metres of a path, the shore climb or a rail, or at the sea (under 3 m). */
const SEEN = 80;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The material's rock mask at each grid vertex, without its per-pixel wander: rock past half strength.
const layers = { steep: new Float32Array(1), foot: new Float32Array(1), soil: new Float32Array(1) };
const rock = new Uint8Array(NX * NZ);
for (let j = 0; j < NZ; j++)
  for (let i = 0; i < NX; i++) {
    describeGround(cellX(i), cellZ(j), 0, layers);
    const r = Math.max(smooth(0.3, 0.42, layers.steep[0]!), 1 - smooth(0.54, 0.6, layers.soil[0]!));
    if (r > 0.5) rock[at(i, j)] = 1;
  }

// Who looks at it: dense samples along each view line, binned in a coarse grid for the nearest-distance queries.
type View = 'path' | 'shore' | 'rail' | 'sea';
const views: Record<View, [number, number][]> = { path: [], shore: [], rail: [], sea: [] };
for (const line of PATH_SAMPLES) for (const [x, z] of line) views.path.push([x, z]);
for (const [x, z] of SHORE_SAMPLES) views.shore.push([x, z]);
for (const line of Object.values(LINES))
  for (let k = 0; k < line.xs.length; k += 2) views.rail.push([line.xs[k]!, line.zs[k]!]);
for (let j = 1; j < NZ - 1; j += 2)
  for (let i = 1; i < NX - 1; i += 2) if (heights[at(i, j)]! < -0.5) views.sea.push([cellX(i), cellZ(j)]);
function nearest(list: [number, number][], x: number, z: number) {
  let best = Infinity;
  for (const [px, pz] of list) best = Math.min(best, (px - x) ** 2 + (pz - z) ** 2);
  return Math.sqrt(best);
}

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

type Wall = {
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
  edge: { toe: number; rim: number; toeSeen: number; rimSeen: number };
  nearest: Record<View, number>;
};
const seen = new Uint8Array(NX * NZ);
const walls: Wall[] = [];
/** Each wall's seen toe vertices, for --anchors. */
const toes = new Map<Wall, number[]>();
const seenToe: number[] = [];
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
  if (cells.length < MIN) continue;
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
  // above it: the lip, where caps go), in metres of edge (a 2 m cell each), and
  // how much of each lies within SEEN m of a path, the shore climb, a rail or the sea: what the kit would dress.
  seenToe.length = 0;
  let toe = 0,
    rim = 0,
    toeSeen = 0,
    rimSeen = 0;
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
    const seen = (['path', 'shore', 'rail'] as const).some((v) => nearest(views[v], x, z) < SEEN) || y < 3;
    if (low && seen) seenToe.push(k);
    if (low) {
      toe += CELL;
      if (seen) toeSeen += CELL;
    }
    if (high) {
      rim += CELL;
      if (seen) rimSeen += CELL;
    }
  }
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
    edge: { toe, rim, toeSeen, rimSeen },
    nearest: Object.fromEntries(Object.entries(near).map(([k, v]) => [k, Math.round(v)])) as Record<View, number>,
  };
  walls.push(wall);
  toes.set(wall, [...seenToe]);
}
walls.sort((a, b) => b.vertices - a.vertices);
for (const [n, w] of walls.entries()) w.id = n;

if (argv.includes('--json')) console.log(JSON.stringify(walls, null, 1));
else {
  const total = walls.reduce((s, w) => s + w.vertices, 0);
  console.log(`Home heightfield rock: ${walls.length} walls of ${MIN}+ vertices, ${total} vertices, ${total * 4} m²`);
  console.log(
    'id  name                          vertices  Place-local box (x0..x1, z0..z1)    y (min..max)   gorge  path shore rail sea (m)  toe/seen rim/seen (m)',
  );
  for (const w of walls)
    console.log(
      [
        String(w.id).padEnd(3),
        w.name.padEnd(30),
        String(w.vertices).padStart(7),
        `  (${w.box.x0}..${w.box.x1}, ${w.box.z0}..${w.box.z1})`.padEnd(36),
        `${w.y[0]}..${w.y[1]}`.padEnd(14),
        (w.inGorge ? 'yes' : 'no').padEnd(6),
        ...(['path', 'shore', 'rail', 'sea'] as const).map((v) => String(w.nearest[v]).padStart(5)),
        `  ${w.edge.toe}/${w.edge.toeSeen}`.padEnd(10),
        `${w.edge.rim}/${w.edge.rimSeen}`,
      ].join(' '),
    );
}
fs.mkdirSync('.look', { recursive: true });
fs.writeFileSync('.look/cliff-census.json', JSON.stringify(walls, null, 1));

// Trial anchors: not a kit, only where one would stand and what it would break today. A 6 m face at the toe, sunk 0.5 m,
// turned to face downhill (+z out of the wall, as src/content/prefabs/terrain.ts has it), is checked by the canyon
// kit's rules (its gated places are the canyon's own: other areas' lists are a build step) and against every rail's
// centre line (RAIL_CLEAR m from the face's footprint centre).
if (argv.includes('--anchors')) {
  const { kitPieceProblems } = await import('../prefab/canyon-kit.ts');
  const ANCHOR_SPACING = 8,
    RAIL_CLEAR = 6;
  const out: {
    wall: number;
    name: string;
    tried: number;
    clean: number;
    problems: Record<string, number>;
    anchors: unknown[];
  }[] = [];
  for (const wall of walls) {
    const picked: [number, number][] = [];
    const anchors: unknown[] = [];
    const problems: Record<string, number> = {};
    for (const k of toes.get(wall) ?? []) {
      const i = k % NX,
        j = (k - i) / NX,
        x = cellX(i),
        z = cellZ(j);
      if (picked.some(([px, pz]) => Math.hypot(px - x, pz - z) < ANCHOR_SPACING)) continue;
      picked.push([x, z]);
      const h = (a: number, b: number) =>
        heights[at(Math.max(0, Math.min(NX - 1, a)), Math.max(0, Math.min(NZ - 1, b)))]!;
      const gx = h(i + 1, j) - h(i - 1, j),
        gz = h(i, j + 1) - h(i, j - 1);
      const yaw = Math.atan2(-gx, -gz);
      const p: Placement = {
        id: `trial.${wall.id}.${anchors.length}`,
        prefab: 'terrain.face-6',
        pos: [x, heights[k]! - 0.5, z],
        rot: [yaw, 0, 0],
      };
      const found: string[] = kitPieceProblems(p).map((m) =>
        m.includes('narrows the tread') ? 'tread' : 'gated place',
      );
      if (nearest(views.rail, x, z) < RAIL_CLEAR) found.push('rail');
      for (const f of found) problems[f] = (problems[f] ?? 0) + 1;
      anchors.push({
        pos: p.pos.map((n) => Math.round(n * 10) / 10),
        yaw: Math.round(yaw * 100) / 100,
        problems: found,
      });
    }
    out.push({
      wall: wall.id,
      name: wall.name,
      tried: anchors.length,
      clean: anchors.filter((a) => !(a as { problems: string[] }).problems.length).length,
      problems,
      anchors,
    });
  }
  console.log(`\nTrial 6 m faces along each seen toe, every ${ANCHOR_SPACING} m:`);
  for (const w of out)
    console.log(
      `${String(w.wall).padEnd(3)} ${w.name.padEnd(30)} ${String(w.tried).padStart(4)} tried ${String(w.clean).padStart(4)} clean  ${JSON.stringify(w.problems)}`,
    );
  fs.writeFileSync('.look/cliff-anchors.json', JSON.stringify(out, null, 1));
}
