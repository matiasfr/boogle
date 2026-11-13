// Greybox leg 2's level report (docs/plans/greybox-leg2-massing.md, step 1 and its design review's changes 2 and 3):
// the planned boxes of Bell Rock and Home's West landing (src/entities/route-greybox/leg2-layout.ts) on a height grid,
// walked and swum with the controller's limits (./flood.ts, MOVER). Run from `npm run level-check`, or alone:
//   node --import ./dev/sim/hooks.ts dev/level/route-leg2.ts
//
// Bell Rock has two levels, so it is two grids: `under` leaves out what stands over other boxes (the bridge) and
// `over` has everything. A walk moves between them wherever both have the same surface. Not modelled: headroom, the
// posts, swimming under a deck (the sea under a deck counts as closed here, which only makes a reach harder), and at
// Home everything but the terrain's height (no buildings, props or track).
import fs from 'node:fs';
import { H } from '../../src/place/terrain.ts';
import { inside, layout, parseMapPage, type XZ as MapXZ } from '../../src/sickle/map-data.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import { LEG2, PAD_SIZE, type Piece, type Reserve, type XZ } from '../../src/entities/route-greybox/leg2-layout.ts';
import { flood, type Grid } from './flood.ts';
import { MOVER } from './rules.ts';

type Entry = { kind: 'fact' | 'section'; message: string } | { kind: 'assertion'; passed: boolean; message: string };
const f1 = (x: number) => x.toFixed(1);
const SEA = -6;

/** Where `p` is in a piece's own frame: metres along its length and across, from its centre. */
function local(b: { x: number; z: number; yaw: number }, p: XZ) {
  const dx = p.x - b.x,
    dz = p.z - b.z,
    s = Math.sin(b.yaw),
    c = Math.cos(b.yaw);
  return { along: dx * s + dz * c, across: dx * c - dz * s };
}
/** The piece's top at `p`, or null outside it. */
function topAt(b: Piece, p: XZ) {
  const l = local(b, p);
  if (Math.abs(l.along) > b.d / 2 || Math.abs(l.across) > b.w / 2) return null;
  return b.top + (b.rise ?? 0) * (l.along / b.d + 0.5);
}
const corners = (b: { x: number; z: number; yaw: number; w: number; d: number }) => {
  const s = Math.sin(b.yaw),
    c = Math.cos(b.yaw);
  return [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([i, j]) => ({
    x: b.x + (s * i! * b.d) / 2 + (c * j! * b.w) / 2,
    z: b.z + (c * i! * b.d) / 2 - (s * j! * b.w) / 2,
  }));
};
type Rect = { x: number; z: number; yaw: number; w: number; d: number };
/** Whether two rectangles on the ground overlap by more than a centimetre (separating axes). */
function overlaps(a: Rect, b: Rect) {
  const ca = corners(a),
    cb = corners(b);
  for (const r of [a, b])
    for (const axis of [
      { x: Math.sin(r.yaw), z: Math.cos(r.yaw) },
      { x: Math.cos(r.yaw), z: -Math.sin(r.yaw) },
    ]) {
      const pa = ca.map((p) => p.x * axis.x + p.z * axis.z),
        pb = cb.map((p) => p.x * axis.x + p.z * axis.z);
      if (Math.min(...pa) >= Math.max(...pb) - 0.01 || Math.min(...pb) >= Math.max(...pa) - 0.01) return false;
    }
  return true;
}
/** Every leg 2 thing that stands in a reserve: boxes, pads and sign posts. */
function intruders(area: (typeof LEG2)['bell' | 'west' | 'gorge'], r: Reserve): string[] {
  const out: string[] = [];
  for (const b of area.pieces) {
    const lo = Math.min(b.top, b.top + (b.rise ?? 0)) - b.h,
      hi = Math.max(b.top, b.top + (b.rise ?? 0));
    if (hi > r.y0 + 0.01 && lo < r.y1 - 0.01 && overlaps(b, r)) out.push(b.id);
  }
  for (const p of area.pads)
    if (p.y < r.y1 && p.y + 3 > r.y0 && overlaps({ ...p, w: PAD_SIZE.across, d: PAD_SIZE.along }, r)) out.push(p.id);
  for (const p of area.posts)
    if (p.y < r.y1 && p.y + 3 > r.y0 && overlaps({ x: p.x, z: p.z, yaw: 0, w: 0.5, d: 0.5 }, r)) out.push(p.id);
  return out;
}

/** A square grid of `half` metres each way about `o`, and the lookups the checks share. */
function gridAbout(o: XZ, half: number, cell: number) {
  const n = Math.round((2 * half) / cell) + 1;
  const x = (i: number) => o.x - half + i * cell,
    z = (j: number) => o.z - half + j * cell;
  const node = (p: XZ) => {
    const i = Math.round((p.x - o.x + half) / cell),
      j = Math.round((p.z - o.z + half) / cell);
    if (i < 0 || j < 0 || i >= n || j >= n) throw new Error(`route-leg2: (${f1(p.x)}, ${f1(p.z)}) is off the grid`);
    return i * n + j;
  };
  const heights = (ground: (p: XZ) => number, pieces: readonly Piece[]) => {
    const h = new Float32Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const p = { x: x(i), z: z(j) };
        let y = ground(p);
        for (const b of pieces) {
          if (b.solid === false) continue;
          const t = topAt(b, p);
          if (t !== null && t > y) y = t;
        }
        h[i * n + j] = y;
      }
    return { n, cell, h } satisfies Grid;
  };
  return { n, cell, x, z, node, heights };
}

/** The nodes reached from `starts` over two layers that share a surface wherever their heights agree. */
function reach2(under: Grid, over: Grid, starts: number[], swim: boolean) {
  let a = new Uint8Array(under.n * under.n),
    b = new Uint8Array(under.n * under.n);
  // A start is on whichever layer has ground there; on the upper one when they differ.
  let seedA = starts.filter((k) => under.h[k] === over.h[k]),
    seedB = starts.slice();
  for (;;) {
    a = flood(under, MOVER, [...seedA, ...indices(a)], { swim });
    b = flood(over, MOVER, [...seedB, ...indices(b)], { swim });
    seedA = [];
    seedB = [];
    for (let k = 0; k < a.length; k++) {
      if (under.h[k] !== over.h[k]) continue;
      if (a[k] && !b[k]) seedB.push(k);
      if (b[k] && !a[k]) seedA.push(k);
    }
    if (!seedA.length && !seedB.length) return { under: a, over: b };
  }
}
function indices(seen: Uint8Array) {
  const out: number[] = [];
  for (let k = 0; k < seen.length; k++) if (seen[k]) out.push(k);
  return out;
}

function bell(entries: Entry[]) {
  const fact = (message: string) => entries.push({ kind: 'fact', message });
  const assertion = (passed: boolean, message: string) => entries.push({ kind: 'assertion', passed, message });
  const B = LEG2.bell,
    M = B.marks;
  const g = gridAbout(B.origin, 140, 0.5);
  const under = g.heights(
      () => SEA,
      B.pieces.filter((p) => !p.over),
    ),
    over = g.heights(() => SEA, B.pieces);
  const on = (seen: { under: Uint8Array; over: Uint8Array }, p: XZ, upper = false) =>
    (upper ? seen.over : seen.under)[g.node(p)] === 1 || (!upper && seen.over[g.node(p)] === 1);
  const pad = (id: string) => B.pads.find((p) => p.id === id)!;
  const list = (rows: [string, boolean][]) => {
    const missed = rows.filter((r) => !r[1]).map((r) => r[0]);
    return { ok: !missed.length, text: missed.length ? `NOT ${missed.join(', ')}` : rows.map((r) => r[0]).join(', ') };
  };

  entries.push({ kind: 'section', message: 'Bell Rock (0.5 m grid, two levels)' });
  // Finding 2: reach on foot, and back.
  const low = reach2(under, over, [g.node(M.lowerWest)], false);
  const fromLow = list([
    ['the High Gorge pad', on(low, pad('pad-gorge'))],
    ['the Ring Island pad', on(low, pad('pad-ring'))],
    ['the seeds spot', on(low, M.seeds)],
    ["the ramp's foot", on(low, M.rampFoot)],
    ["the ramp's head", on(low, M.rampHead)],
    ['the Home pad', on(low, pad('pad-home'))],
    ['the Canopy Town pad', on(low, pad('pad-canopy'))],
    ['the Port Quay pad', on(low, pad('pad-quay'))],
    ['the lower east platform', on(low, M.lowerEast)],
    ['the west rock', on(low, M.westRock)],
  ]);
  assertion(fromLow.ok, `on foot from the lower west platform: ${fromLow.text}`);
  const up = reach2(under, over, [g.node(M.upperDeck)], false);
  const fromUp = list([
    ['the in half north platform', on(up, M.upperInN, true)],
    ['the in half south platform', on(up, M.upperInS, true)],
    ['the out half north platform', on(up, M.upperOutN, true)],
    ['the out half south platform', on(up, M.upperOutS, true)],
    ['the east rock', on(up, M.eastRock)],
    ["the pinnacle's foot", on(up, M.feet["the pinnacle's foot"]!)],
    ['the lower west platform (back down)', on(up, M.lowerWest)],
  ]);
  assertion(fromUp.ok, `on foot from the upper deck: ${fromUp.text}`);
  // The east rock is the bridge's alone: with the bridge's boxes gone, nothing walks there from the lower level.
  const noBridge = flood(under, MOVER, [g.node(M.lowerWest)]);
  fact(
    `  the east rock and the pinnacle's foot are reached ${noBridge[g.node(M.eastRock)] ? 'without the bridge too' : 'by the bridge only'}`,
  );
  // Change 3: from the sea on each side of the cut the slipway is reached, and the lower deck from it.
  for (const [name, at] of [
    ['west of the lower deck (the cut, south)', M.seaWest],
    ['east of the bed (the cut, north)', M.seaEast],
    ['outside, north of the rock', M.seaOutside],
  ] as const) {
    const swum = reach2(under, over, [g.node(at)], true);
    const got = list([
      ["the slipway's foot", on(swum, M.slipwayFoot)],
      ['the lower west platform', on(swum, M.lowerWest)],
      ['the lower deck (the seeds spot)', on(swum, M.seeds)],
    ]);
    assertion(got.ok, `a swimmer in the sea ${name}: ${got.text}`);
  }
  const noSlip = g.heights(
    () => SEA,
    B.pieces.filter((p) => !p.over && p.id !== 'slipway'),
  );
  const stranded = flood(noSlip, MOVER, [g.node(M.seaOutside)], { swim: true });
  fact(
    `  without the slipway a swimmer reaches ${stranded[g.node(M.lowerWest)] || stranded[g.node(M.westRock)] ? 'the rock anyway' : 'neither level: the slipway is the one way out of the sea'}`,
  );

  // The rim: inside the map's two polys, outside every collider. Drawn by the backdrop, not solid (call 121).
  const map = layout(parseMapPage(fs.readFileSync('docs/world/map-prototypes.html', 'utf8')), 'sickle');
  const polys = map.land.filter((l) => l.on?.includes('bell')).map((l) => l.outline);
  if (polys.length !== 2)
    throw new Error(`route-leg2: expected Bell Rock's two lands in the map, found ${polys.length}`);
  const n = g.n;
  const rim = new Uint8Array(n * n),
    rock = new Uint8Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * n + j,
        p: MapXZ = [g.x(i) - ORIGIN.x, g.z(j) - ORIGIN.z];
      if (over.h[k]! > SEA) rock[k] = 1;
      else if (polys.some((poly) => inside(p, poly))) rim[k] = 1;
    }
  const toRock = distances(rock, n, g.cell);
  // A sliver is rim under 2 m wide between a collider's edge and the map's outline (the cut's walls, where the drop
  // is the cut's own): the feet are measured against rim wider than that.
  const SLIVER = 2;
  const wide = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) if (rim[k] && toRock[k]! >= SLIVER) wide[k] = 1;
  const toWide = distances(wide, n, g.cell);
  let widest = 0,
    at = 0,
    drawn = 0;
  for (let k = 0; k < n * n; k++) {
    if (!rim[k]) continue;
    drawn++;
    if (toRock[k]! > widest) {
      widest = toRock[k]!;
      at = k;
    }
  }
  const wi = Math.floor(at / n),
    wj = at - wi * n;
  fact(
    `  the widest unsolid rim (drawn rock with no collider under it): ${f1(widest)} m from the nearest solid box, at (${f1(g.x(wi))}, ${f1(g.z(wj))}); ${Math.round(drawn * g.cell * g.cell)} m² of rim in all`,
  );
  // Change 2: every ramp foot, the step's foot and the pinnacle's foot stand on a collider, 6 m from any rim.
  for (const [name, p] of Object.entries(M.feet)) {
    const k = g.node(p),
      solid = over.h[k]! >= 13.9,
      clear = toWide[k]! - SLIVER;
    assertion(
      solid && clear >= 6,
      `${name} lands on solid rock ${solid ? `${f1(clear)} m from the nearest unsolid rim` : `: NOT, the ground there is ${f1(over.h[k]!)} m`} (needs 6; slivers under ${SLIVER} m at a collider's edge aside)`,
    );
  }
  reserves(entries, 'bell');
}

/** Metres from each node to the nearest marked one (a two-pass chamfer; good to a few per cent). */
function distances(mark: Uint8Array, n: number, cell: number) {
  const d = new Float32Array(n * n).fill(1e9);
  const D = cell * Math.SQRT2;
  for (let k = 0; k < n * n; k++) if (mark[k]) d[k] = 0;
  const relax = (k: number, q: number, w: number) => {
    if (d[q]! + w < d[k]!) d[k] = d[q]! + w;
  };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * n + j;
      if (i > 0) relax(k, k - n, cell);
      if (j > 0) relax(k, k - 1, cell);
      if (i > 0 && j > 0) relax(k, k - n - 1, D);
      if (i > 0 && j < n - 1) relax(k, k - n + 1, D);
    }
  for (let i = n - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--) {
      const k = i * n + j;
      if (i < n - 1) relax(k, k + n, cell);
      if (j < n - 1) relax(k, k + 1, cell);
      if (i < n - 1 && j < n - 1) relax(k, k + n + 1, D);
      if (i < n - 1 && j > 0) relax(k, k + n - 1, D);
    }
  return d;
}

function reserves(entries: Entry[], id: 'bell' | 'west' | 'gorge', extra: Reserve[] = []) {
  const area = LEG2[id];
  const all = [...area.reserves, ...extra];
  const bad = all.map((r) => ({ r, in: intruders(area, r) })).filter((x) => x.in.length);
  entries.push({
    kind: 'assertion',
    passed: !bad.length,
    message: bad.length
      ? `room left for the rules plan: ${bad.map((x) => `${x.in.join(', ')} in "${x.r.id}"`).join('; ')}`
      : `room left for the rules plan is clear of leg 2's boxes, pads and posts: ${all.map((r) => r.id).join(', ')}`,
  });
}

function west(entries: Entry[]) {
  const W = LEG2.west,
    M = W.marks;
  entries.push({ kind: 'section', message: "Home's West landing (1 m grid over Home's terrain)" });
  const g = gridAbout(W.origin, 110, 1);
  const grid = g.heights((p) => Math.max(SEA, H(p.x, p.z)), W.pieces);
  const y = (p: XZ) => grid.h[g.node(p)]!;
  entries.push({
    kind: 'fact',
    message: `  ground under the root ${f1(H(W.at(0, 0).x, W.at(0, 0).z))} m, under the stop ${f1(H(W.origin.x, W.origin.z))} m, under the platforms' sea end ${f1(H(W.at(40, 0).x, W.at(40, 0).z))} m; the commons mark stands at ${f1(y(M.commons))} m`,
  });
  // Change 3. The flood passes the 56 degree cliff by a thin margin: step 5's walk, up and down, is the proof
  // (change 1), and a plain grey stair the fix if the way up fails.
  for (const [name, from, to] of [
    ['from platform A to the commons', M.platformA, M.commons],
    ['from platform B to the commons', M.platformB, M.commons],
    ['from the commons down to platform A', M.commons, M.platformA],
  ] as const) {
    const seen = flood(grid, MOVER, [g.node(from)]);
    entries.push({
      kind: 'assertion',
      passed: seen[g.node(to)] === 1,
      message: `on foot ${name}${seen[g.node(to)] ? '' : ': NOT reached'} (the flood only; step 5 walks it)`,
    });
  }
  // The `cave` row leaves the same root: its first 80 m, as wide as a bed.
  const cave = WORLD_LINES.find((l) => l.id === 'cave')!.pts.map(([x, z, yy]) => ({
    x: x / 100,
    z: z / 100,
    y: yy / 100,
  }));
  const corridor: Reserve[] = [];
  for (let k = 0, run = 0; k + 1 < cave.length && run < 80; k++) {
    const a = cave[k]!,
      b = cave[k + 1]!,
      len = Math.min(Math.hypot(b.x - a.x, b.z - a.z), 80 - run),
      ux = (b.x - a.x) / Math.hypot(b.x - a.x, b.z - a.z),
      uz = (b.z - a.z) / Math.hypot(b.x - a.x, b.z - a.z);
    corridor.push({
      id: `cave row (${f1(run)} to ${f1(run + len)} m)`,
      x: a.x + (ux * len) / 2,
      z: a.z + (uz * len) / 2,
      yaw: Math.atan2(ux, uz),
      w: 7.6,
      d: len,
      y0: a.y - 0.1,
      y1: a.y + 5,
    });
    run += len;
  }
  reserves(entries, 'west', corridor);
}

function gorge(entries: Entry[]) {
  entries.push({ kind: 'section', message: "High Gorge's incline platforms" });
  reserves(entries, 'gorge');
}

export function checkLeg2() {
  const entries: Entry[] = [];
  bell(entries);
  west(entries);
  gorge(entries);
  const failures = entries.filter((e) => e.kind === 'assertion' && !e.passed).length;
  return { level: 'route leg 2 (planned)', entries, failures };
}

export function printLeg2(report: ReturnType<typeof checkLeg2>) {
  console.log('\nGreybox leg 2 (planned boxes)');
  for (const e of report.entries)
    console.log(e.kind === 'assertion' ? `${e.passed ? '  ok  ' : ' FAIL '} ${e.message}` : e.message);
  console.log(`route leg 2 (planned): ${report.failures ? `${report.failures} PROBLEMS` : 'ok'}`);
}

if (import.meta.main) {
  const report = checkLeg2();
  printLeg2(report);
  process.exitCode = report.failures ? 1 : 0;
}
