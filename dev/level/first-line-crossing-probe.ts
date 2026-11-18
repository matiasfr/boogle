// Read-only terrain survey. Run: timeout 120 node --import ./dev/sim/hooks.ts dev/level/first-line-crossing-probe.ts
// Outputs .look/first-line-crossing-probe.json. No controller/collider witness or wall-clock timings.
import fs from 'node:fs';
import * as terrain from '../../src/place/terrain.ts';
import * as layout from '../../src/place/layout.ts';
import * as tech from '../../src/place/tech-layout.ts';
import * as constants from '../../src/constants.ts';
import * as seeds from '../../src/sim/railway-seeds.ts';
import * as route from '../../src/sim/railway-seed-route.ts';
import * as rows from '../../src/sim/railway-rows.ts';
import * as line2 from '../../src/sim/railway-line2-layout.ts';
import * as railLayout from '../../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_ROCKS } from '../../src/sim/railway-line-layout.ts';
import { NODES, WALK_MPS } from '../loop/graph.ts';
import { sourceModule } from './source.ts';

type Point = { x: number; z: number };
const { surfaceHeight } = terrain;
const slope = Math.sqrt(1 - constants.WALKABLE_NY ** 2) / constants.WALKABLE_NY;
// Encloses both sides of the timber footbridge and all of the nearest source groves.
const bounds = { x0: 840, x1: 1050, z0: -210, z1: 20 };
function survey(cell: number, target: Point) {
  const nx = Math.round((bounds.x1 - bounds.x0) / cell) + 1;
  const nz = Math.round((bounds.z1 - bounds.z0) / cell) + 1;
  const pos = (k: number) => ({ x: bounds.x0 + (k % nx) * cell, z: bounds.z0 + Math.floor(k / nx) * cell });
  const node = (p: Point) => Math.round((p.x - bounds.x0) / cell) + Math.round((p.z - bounds.z0) / cell) * nx;
  const h = Float64Array.from({ length: nx * nz }, (_, k) => {
    const p = pos(k);
    return surfaceHeight(p.x, p.z);
  });
  const d = new Float64Array(h.length).fill(Infinity);
  const prev = new Int32Array(h.length).fill(-1);
  const heap: [number, number][] = [];
  const push = (entry: [number, number]) => {
    heap.push(entry);
    let k = heap.length - 1;
    while (k > 0) {
      const parent = (k - 1) >> 1;
      if (heap[parent]![0] <= entry[0]) break;
      heap[k] = heap[parent]!;
      k = parent;
    }
    heap[k] = entry;
  };
  const pop = () => {
    const first = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      let k = 0;
      while (2 * k + 1 < heap.length) {
        let child = 2 * k + 1;
        if (child + 1 < heap.length && heap[child + 1]![0] < heap[child]![0]) child++;
        if (heap[child]![0] >= last[0]) break;
        heap[k] = heap[child]!;
        k = child;
      }
      heap[k] = last;
    }
    return first;
  };
  // Same authored footbridge links as place-level.ts; connect its endpoints above the river floor.
  const links = new Map<number, [number, number][]>();
  for (const p of layout.PATHS) {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    const an = node({ x: a[0] + layout.ORIGIN.x, z: a[1] });
    const bn = node({ x: b[0] + layout.ORIGIN.x, z: b[1] });
    if (an < 0 || bn < 0 || an >= h.length || bn >= h.length) continue;
    const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
    links.set(an, [[bn, distance]]);
    links.set(bn, [[an, distance]]);
  }
  const start = node(target);
  d[start] = 0;
  push([0, start]);
  while (heap.length) {
    const [distance, k] = pop();
    if (distance !== d[k]) continue;
    const i = k % nx,
      j = Math.floor(k / nx);
    const edges = [...(links.get(k) ?? [])];
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if ((!di && !dj) || i + di < 0 || i + di >= nx || j + dj < 0 || j + dj >= nz) continue;
        const q = k + di + dj * nx,
          metres = cell * Math.hypot(di, dj);
        // Symmetric dry walking only: no drops, jump links, swimming, or early abilities.
        if (h[q]! < 0.2 || Math.abs(h[q]! - h[k]!) > slope * metres) continue;
        if (
          di &&
          dj &&
          (Math.abs(h[k + di]! - h[k]!) > slope * cell || Math.abs(h[k + dj * nx]! - h[k]!) > slope * cell)
        )
          continue;
        edges.push([q, metres]);
      }
    for (const [q, metres] of edges)
      if (distance + metres < d[q]!) {
        d[q] = distance + metres;
        prev[q] = k;
        push([d[q]!, q]);
      }
  }
  return (p: Point) => {
    const source = node(p),
      way: Point[] = [];
    for (let k = source; k >= 0; k = prev[k]!) way.push(pos(k));
    way[0] = p;
    way[way.length - 1] = target;
    const clear = (a: Point, b: Point) => {
      const length = Math.hypot(b.x - a.x, b.z - a.z),
        n = Math.max(1, Math.ceil(length / 0.125));
      let last = surfaceHeight(a.x, a.z);
      for (let t = 1; t <= n; t++) {
        const h = surfaceHeight(a.x + ((b.x - a.x) * t) / n, a.z + ((b.z - a.z) * t) / n);
        if (h < 0.2 || Math.abs(h - last) > (slope * length) / n + 1e-6) return false;
        last = h;
      }
      return true;
    };
    const smooth = [p];
    for (let i = 0; i < way.length - 1;) {
      let end = way.length - 1;
      while (end > i + 1 && !clear(way[i]!, way[end]!)) end--;
      smooth.push(way[end]!);
      i = end;
    }
    const metres = smooth.slice(1).reduce((sum, q, i) => sum + Math.hypot(q.x - smooth[i]!.x, q.z - smooth[i]!.z), 0);
    return { metres, seconds: metres / WALK_MPS, rawGridMetres: d[source]!, way: smooth };
  };
}

const hauls = LINE1_STATIONS.slice(1).map((station) => {
  const frame = { x: station.x / 100, z: station.z / 100 };
  const graph = NODES.find((n) => n.id === station.id)!;
  const supply = graph.supply.logs!;
  if (supply.by !== 'hand') throw new Error('Expected hand logs');
  const nearest = supply.from
    .map((p) => {
      const id = railLayout.RAILWAY_SOURCES.find(([, x, z]) => x === p.x && z === p.z)![0];
      return { id, x: p.x / 100, z: p.z / 100, straight: Math.hypot(p.x / 100 - frame.x, p.z / 100 - frame.z) };
    })
    .sort((a, b) => a.straight - b.straight)
    .slice(0, 12);
  const resolutions = [2, 1, 0.5].map((cell) => {
    const path = survey(cell, frame);
    return {
      cell,
      sources: nearest.map((p) => ({ ...p, h: surfaceHeight(p.x, p.z), ...path(p) })),
      rocks: LINE1_ROCKS.map((r) => ({
        id: r.id,
        x: r.x / 100,
        z: r.z / 100,
        ...path({ x: r.x / 100, z: r.z / 100 }),
      })),
    };
  });
  return { id: station.id, frame: { ...frame, h: surfaceHeight(frame.x, frame.z) }, bill: station.bill, resolutions };
});

// Instrument the existing checker in memory, keeping its private flood/pad rules exactly. No tracked source is changed.
const early: { stage: string; single: string[]; double: string[] }[] = [];
let source = fs.readFileSync('dev/economy/place-level.ts', 'utf8');
source = source.slice(0, source.indexOf('// Keep the old direct command'));
const marker = "  section('double-jump-course',";
if (!source.includes(marker)) throw new Error('Checker instrumentation anchor changed');
source = source.replace(
  marker,
  `
  for (const [stage, tracks] of [['after-T1', [[N,150,191]]], ['after-T2', [[N,116,191]]]]) {
    const seen = flood(tracks);
    recordEarly({stage,
      single: [...padsReachable(seen, {jump:false,hook:false,glide:false}, tracks)],
      double: [...padsReachable(seen, {jump:true,hook:false,glide:false}, tracks)]});
  }
${marker}`,
);
const { runPlaceLevelCheck } = sourceModule<{ runPlaceLevelCheck: () => { failures: number; entries: unknown[] } }>(
  source,
  {
    ...constants,
    ...terrain,
    ...layout,
    ...tech,
    ...seeds,
    ...route,
    ...rows,
    ...line2,
    ...railLayout,
    CELL: terrain.CELL,
    cellAt: terrain.at,
    recordEarly: (row: (typeof early)[number]) => early.push(row),
  },
);
const level = runPlaceLevelCheck();

// Flat-ground held-jump analytic envelopes from the actual force phases; not a physics traversal proof.
const g = constants.GRAVITY,
  v = constants.JUMP_SPEED,
  second = tech.MOVE.second,
  apex = tech.MOVE.apexSpeed;
const rise = (speed: number) => (speed * speed - apex * apex) / (2 * g) + (apex * apex) / (2 * g * 0.5);
const up = (speed: number) => (speed - apex) / g + apex / (g * 0.5);
const oneH = rise(v),
  twoH = oneH + rise(second);
const singleTime = up(v) + Math.sqrt((2 * oneH) / (g * 1.7));
const doubleTime = up(v) + up(second) + Math.sqrt((2 * twoH) / (g * 1.7));
// Range can be longer with a late air jump. Balance the two falling distances, not the two apex heights.
const lateDoubleTime = up(v) + up(second) + 2 * Math.sqrt(twoH / (g * 1.7));
const jump = {
  singleHeight: oneH,
  doubleHeight: twoH,
  singleTime,
  doubleTime,
  singleWalk: singleTime * WALK_MPS,
  doubleWalk: doubleTime * WALK_MPS,
  singleSprint: (singleTime + 0.1) * 9.5 + 2 * constants.PLAYER_R,
  doubleSprint: doubleTime * 9.5,
  lateDoubleTime,
  lateDoubleWalk: lateDoubleTime * WALK_MPS,
  lateDoubleSprint: lateDoubleTime * 9.5,
  lateDoubleSprintEnvelope: (lateDoubleTime + 0.1) * 9.5 + 2 * constants.PLAYER_R,
};
// Concrete finite-stock itineraries, independent full-stock start per station (as in the brief).
// Walk-nearest four trees, ten units each; fill a bundle before returning to the frame.
const itineraries = hauls.map((haul) => {
  const measured = haul.resolutions.at(-1)!;
  const sources = [...measured.sources].sort((a, b) => a.metres - b.metres).slice(0, 4);
  const variants = [
    { comfort: 8, cap: 8 },
    { comfort: 12, cap: 12 },
    { comfort: 8, cap: 12 },
    { comfort: 12, cap: 18 },
  ].map(({ comfort, cap }) => {
    let left = haul.bill[0],
      k = 0,
      stock: number = railLayout.RAILWAY_T1.sourceYield,
      metres = 0,
      seconds = 0;
    const trips: { stops: { id: number; take: number }[]; metres: number; seconds: number }[] = [];
    // No cargo slows a walker since separate capacities (owner, 17 November 2026); the probe's decision is closed.
    while (left > 0) {
      let pos: Point = haul.frame,
        walked = 0,
        elapsed = 0,
        load = 0;
      const stops: { id: number; take: number }[] = [];
      while (left > 0 && load < cap) {
        const p = sources[k]!;
        // These four sources and their inter-tree segments occupy the same continuous plateau.
        const distance = Math.hypot(pos.x - p.x, pos.z - p.z);
        walked += distance;
        elapsed += distance / WALK_MPS;
        const take = Math.min(cap - load, stock, left);
        left -= take;
        stock -= take;
        load += take;
        stops.push({ id: p.id, take });
        pos = p;
        if (stock === 0) {
          k++;
          stock = railLayout.RAILWAY_T1.sourceYield;
        }
      }
      const distance = Math.hypot(pos.x - haul.frame.x, pos.z - haul.frame.z);
      walked += distance;
      elapsed += distance / WALK_MPS;
      metres += walked;
      seconds += elapsed;
      trips.push({ stops, metres: walked, seconds: elapsed });
    }
    const stone = haul.bill[1] ? 2 * measured.rocks[0]!.metres : 0;
    const walkSeconds = seconds + stone / WALK_MPS;
    return {
      comfort,
      cap,
      logMetres: metres,
      stoneMetres: stone,
      walkSeconds,
      withSwingStandIn: walkSeconds + ((haul.bill[0] / 2) * railLayout.RAILWAY_T1.swingMs) / 1000,
      trips,
    };
  });
  return { station: haul.id, sources: sources.map((p) => p.id), variants };
});
const chord = { from: { x: 977.44, z: -88.73 }, to: { x: 948.3, z: -53.14 } };
const chordLength = Math.hypot(chord.from.x - chord.to.x, chord.from.z - chord.to.z);
const chordSamples = Array.from({ length: Math.ceil(chordLength / 0.1) + 1 }, (_, k) => {
  const t = Math.min(1, (k * 0.1) / chordLength),
    x = chord.from.x + (chord.to.x - chord.from.x) * t,
    z = chord.from.z + (chord.to.z - chord.from.z) * t;
  return { x, z, along: t * chordLength, h: surfaceHeight(x, z) };
});
const lowSpan = chordSamples.filter((p) => p.h < 15);
const ravine = {
  ...chord,
  chordLength,
  fromHeight: chordSamples[0]!.h,
  toHeight: chordSamples.at(-1)!.h,
  below15Start: lowSpan[0],
  below15End: lowSpan.at(-1),
  below15Width: lowSpan.at(-1)!.along - lowSpan[0]!.along,
  bottom: Math.min(...chordSamples.map((p) => p.h)),
};
fs.mkdirSync('.look', { recursive: true });
fs.writeFileSync(
  '.look/first-line-crossing-probe.json',
  JSON.stringify({ bounds, hauls, itineraries, ravine, jump, early, level }, null, 2),
);
console.log(
  JSON.stringify(
    {
      jump,
      early,
      checkerFailures: level.failures,
      itineraries,
      ravine,
      hauls: hauls.map((h) => ({
        id: h.id,
        frame: h.frame,
        resolutions: h.resolutions.map((r) => ({
          cell: r.cell,
          sources: r.sources.map(({ way, ...p }) => ({ ...p, samples: way.length })),
          rocks: r.rocks.map(({ way, ...p }) => ({ ...p, samples: way.length })),
        })),
      })),
    },
    null,
    2,
  ),
);
