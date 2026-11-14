// Greybox leg 2's level report (docs/plans/greybox-leg2-massing.md, step 1 and its design review's changes 2 and 3):
// the placed colliders of Bell Rock and Home's West landing (content/built/levels/*.json) on a height grid,
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
import type { XZ } from '../../src/entities/route-greybox/leg2-layout.ts';
import type { Leg2Analysis, Reserve } from '../../src/content/levels/leg2.ts';
import artifact from '../../content/built/prefabs.json' with { type: 'json' };
import { validateArtifact, loadLevelArtifact } from '../../src/prefab/validate.ts';
import { flood, type Grid } from './flood.ts';
import { MOVER } from './mover.ts';
import { Matrix4, Vector3 } from 'three';
import {
  resolvePlacedColliders,
  boxVolume,
  heightAt,
  reserveVolume,
  volumesOverlap,
  type Volume,
} from './prefab-colliders.ts';

const records = (() => {
  const value: unknown = artifact;
  validateArtifact(value);
  return value;
})();
type Surface = { id: string; volume: Volume; solid: boolean; over: boolean };
function readArea<K extends keyof Leg2Analysis>(id: K) {
  const value = loadLevelArtifact(
    JSON.parse(fs.readFileSync(`content/built/levels/${id}.json`, 'utf8')),
    records.prefabs,
  );
  if (!value.analysis) throw new Error(`route-leg2: missing analysis for ${id}`);
  const analysis = value.analysis as unknown as Leg2Analysis[K];
  const byId = new Map(value.placements.map((p) => [p.id, p]));
  const placement = (id: string) => {
    const p = byId.get(id);
    if (!p) throw new Error(`route-leg2: missing surface ${id}`);
    return p;
  };
  const resolved = resolvePlacedColliders(value, records.prefabs);
  const pieces = analysis.surfaces.flatMap<Surface>((s) => {
    const p = placement(s.id);
    const colliders = resolved.colliders.filter((c) => c.placement.id === p.id);
    if (colliders.some((c) => c.definition.shape !== 'box'))
      throw new Error(`route-leg2: unsupported reserve surface ${s.id}`);
    return colliders.length
      ? colliders.map((c) => ({ id: s.name, volume: c.volume, solid: true, over: s.over }))
      : [{ id: s.name, volume: resolved.visualBounds(p), solid: false, over: s.over }];
  });
  const point = (s: { id: string; name: string }, pad: boolean) => {
    const p = placement(s.id),
      world = resolved.world(p),
      at = new Vector3().applyMatrix4(world);
    let volume: Volume;
    if (pad) volume = resolved.visualBounds(p);
    else {
      const label = Object.values(records.prefabs[p.prefab]!.attach ?? {}).find((a) => a.kind === 'label');
      if (!label || label.kind !== 'label') throw new Error(`route-leg2: missing placed label ${s.id}`);
      const top = label.at[1] + label.h;
      volume = boxVolume(
        world
          .clone()
          .multiply(new Matrix4().makeTranslation(label.at[0], top / 2, label.at[2]))
          .multiply(new Matrix4().makeRotationY(Math.atan2(label.facing[0], label.facing[2]))),
        [label.w / 2, top / 2, 0.25],
      );
    }
    return { id: s.name, x: at.x, y: at.y, z: at.z, volume };
  };
  const { pads, posts, ...context } = analysis;
  return {
    ...context,
    pieces,
    colliders: resolved.colliders,
    pads: pads.map((s) => point(s, true)),
    posts: posts.map((s) => point(s, false)),
  };
}
const LEG2 = { bell: readArea('bell'), west: readArea('west'), gorge: readArea('gorge') };
type Entry = { kind: 'fact' | 'section'; message: string } | { kind: 'assertion'; passed: boolean; message: string };
const f1 = (x: number) => x.toFixed(1);
const SEA = -6;

/** Geometry comes from placed collider/visual transforms; analysis supplies only ids and intent. */
function intruders(area: (typeof LEG2)['bell' | 'west' | 'gorge'], r: Reserve): string[] {
  const reserve = reserveVolume(r);
  return [
    ...new Set(
      [...area.pieces, ...area.pads, ...area.posts].filter((p) => volumesOverlap(p.volume, reserve)).map((p) => p.id),
    ),
  ];
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
  const heights = (ground: (p: XZ) => number, pieces: readonly Surface[]) => {
    const h = new Float32Array(n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const p = { x: x(i), z: z(j) };
        let y = ground(p);
        for (const b of pieces) {
          if (b.solid === false) continue;
          const t = heightAt(b.volume.triangles, p);
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
  const page = fs.readFileSync('docs/world/map-prototypes.html', 'utf8');
  // Only triangles from actual placements count; absence and every world transform affect coverage.
  const rockTriangles = B.colliders.filter((c) => c.definition.shape === 'trimesh').flatMap((c) => c.volume.triangles);
  const drawn = layout(parseMapPage(page), 'sickle')
    .land.filter((l) => l.on?.includes('bell'))
    .map((l) => l.outline);
  if (drawn.length !== 2)
    throw new Error(`route-leg2: expected Bell Rock's two lands in the map, found ${drawn.length}`);
  const rockAt = (p: XZ) => heightAt(rockTriangles, p) ?? SEA;
  const under = g.heights(
      rockAt,
      B.pieces.filter((p) => !p.over),
    ),
    over = g.heights(rockAt, B.pieces);
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
    rockAt,
    B.pieces.filter((p) => !p.over && p.id !== 'slipway'),
  );
  const stranded = flood(noSlip, MOVER, [g.node(M.seaOutside)], { swim: true });
  fact(
    `  without the slipway a swimmer reaches ${stranded[g.node(M.lowerWest)] || stranded[g.node(M.westRock)] ? 'the rock anyway' : 'neither level: the slipway is the one way out of the sea'}`,
  );

  // The rim: drawn rock (inside the map's two lands) with nothing solid under it. The massing makes the lands solid
  // as drawn, so this is the grid's own error; it was 68.5 m with the plan's four boxes.
  const n = g.n;
  const rim = new Uint8Array(n * n),
    solid = new Uint8Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const k = i * n + j,
        p: MapXZ = [g.x(i) - ORIGIN.x, g.z(j) - ORIGIN.z];
      const world = { x: g.x(i), z: g.z(j) };
      const support = heightAt(rockTriangles, world, B.rockTop + 0.1);
      const drawnRock = drawn.some((poly) => inside(p, poly));
      const supported = support !== null && support >= B.rockTop - 0.1;
      // A displaced top above/below the drawn surface cannot be its own nearest valid support.
      if (drawnRock ? supported : over.h[k]! > SEA) solid[k] = 1;
      if (drawnRock && !supported) rim[k] = 1;
    }
  const toSolid = distances(solid, n, g.cell),
    toRim = distances(rim, n, g.cell);
  let widest = 0,
    at = 0,
    area = 0;
  for (let k = 0; k < n * n; k++) {
    if (!rim[k]) continue;
    area++;
    if (toSolid[k]! > widest) {
      widest = toSolid[k]!;
      at = k;
    }
  }
  const wi = Math.floor(at / n),
    wj = at - wi * n;
  assertion(
    widest < 3,
    `the widest unsolid rim (drawn rock with nothing solid under it) is ${f1(widest)} m${widest ? ` from the nearest solid ground, at (${f1(g.x(wi))}, ${f1(g.z(wj))})` : ''}; ${Math.round(area * g.cell * g.cell)} m² of rim in all (needs under 3 m)`,
  );
  // Change 2: every ramp foot, the step's foot and the pinnacle's foot stand on the rock, 6 m from any unsolid rim.
  for (const name of B.footOrder) {
    const p = M.feet[name as keyof typeof M.feet]!;
    const k = g.node(p),
      rock = over.h[k]! >= B.rockTop - 0.1;
    assertion(
      rock && toRim[k]! >= 6,
      `${name} lands on solid rock${rock ? (area ? `, ${f1(toRim[k]!)} m from the nearest unsolid rim (needs 6)` : '') : `: NOT, the ground there is ${f1(over.h[k]!)} m`}`,
    );
  }
  reserves(entries, 'bell', [], rockAt);
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

/** `rock`: the height of solid ground that is not a box (Bell Rock's lands), sampled each half metre of a reserve. */
function reserves(entries: Entry[], id: 'bell' | 'west' | 'gorge', extra: Reserve[] = [], rock?: (p: XZ) => number) {
  const area = LEG2[id];
  const all = [...area.reserves, ...extra];
  const inRock = (r: Reserve) => {
    if (!rock) return false;
    const s = Math.sin(r.yaw),
      c = Math.cos(r.yaw);
    for (let a = -r.d / 2 + 0.25; a < r.d / 2; a += 0.5)
      for (let b = -r.w / 2 + 0.25; b < r.w / 2; b += 0.5)
        if (rock({ x: r.x + s * a + c * b, z: r.z + c * a - s * b }) > r.y0 + 0.01) return true;
    return false;
  };
  const bad = all
    .map((r) => ({ r, in: [...intruders(area, r), ...(inRock(r) ? ['the rock'] : [])] }))
    .filter((x) => x.in.length);
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
    message: `  ground under the root ${f1(H(M.root.x, M.root.z))} m, under the stop ${f1(H(W.origin.x, W.origin.z))} m, under the platforms' sea end ${f1(H(M.seaEnd.x, M.seaEnd.z))} m; the commons mark stands at ${f1(y(M.commons))} m`,
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
