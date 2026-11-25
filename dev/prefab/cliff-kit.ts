// The cliff kit's generator (docs/plans/cliff-kit-everywhere.md, step 0): one generator over the census
// (dev/ground/cliff-walls.ts), writing one level an area, so each area mounts, culls and ships on its own. Records are
// src/content/prefabs/terrain.ts; src/entities/terrain-kit/view.ts stands every area's level in the world (Place-local
// x + ORIGIN.x), one instance batch a piece an area. Placed from the ground the game builds, so a terrain change shows
// up as a stale artifact (`npm run prefabs -- --check`), not floating rock. Every placement is checked here against the
// kit's piece rules (`kitPieceProblems`, which `npm run level-check` runs again on the built levels) and generation
// fails on the first broken one:
// - The tread keeps its full width: every collider, as placed and tilted, stays CLEAR m outside the tread's edge.
// - No piece's solid within KEEP_AWAY m of a gated place: the layout's pads, secrets (and where each is fetched from),
//   devices and pillars, and the sites' reach points, plus any the area names.
// - The trains pass: no solid inside a rail's loading gauge, sampled every 0.25 m through pieces near a track: a car's
//   body from its floor up to 4.5 m over the rail (half its 2.2 m width) and its running gear under the floor (half the
//   track's gauge), each with the 0.25 m static clearance level-check holds furniture to beside trains
//   (dev/level/home-cart.ts, rider-coach R1b).
// - Art only stands, never a new way up: no standable top more than a step off the bare world's own footing (the gate
//   in level-check, dev/level/cliff-kit-standing.ts; not run here, so a piece that breaks it is reported, not built
//   round).
// Areas: the canyon (dev/prefab/cliff-kit-canyon.ts, by stations along the path) and the shore
// (dev/prefab/cliff-kit-shore.ts, by runs along its walls: `runAlong` and `layAlong` below).
import type { LevelDef, Placement, Vec3 } from '../../src/prefab/types.ts';
import { segDist } from '../../src/island/stamps.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { DEVICES, PADS, PILLARS, SECRETS, ringAt } from '../../src/place/tech-layout.ts';
import { H } from '../../src/place/terrain.ts';
import { FACE_TOP } from '../../src/content/prefabs/terrain.ts';
import { GAUGE } from '../../src/entities/ring-island/bracket.ts';
import { KIT } from '../../src/place/turnout.ts';
import type { prefabs } from '../../src/content/prefabs/terrain.ts';
import { baseSites } from '../level/sites.ts';
import { solidHulls, solidSamples, type V3 } from './cliff-kit-solids.ts';
import { drawnTracks } from '../level/rail-network.ts';
import { canyon } from './cliff-kit-canyon.ts';
import { shore } from './cliff-kit-shore.ts';
import { gorgeRim } from './cliff-kit-gorge-rim.ts';
import { gorgeMouth } from './cliff-kit-gorge-mouth.ts';
import { gorgeWalls } from './cliff-kit-gorge-walls.ts';

import { northRidge, eastCutting } from './cliff-kit-north-ridge.ts';

export type Key = (typeof prefabs)[number]['key'];
/** Places one piece in an area, checked against the piece rules; `where` names it in a failure. */
export type Kit = { place(prefab: Key, pos: Vec3, rot: Vec3, where: string): void };
/** One area's record: what it dresses and how. */
export type Area = {
  /** Its placements' id prefix. */
  id: string;
  /** The level it writes, content/built/levels/<level>.json: cliff-kit-<id> unless set (the canyon keeps its first
   * name, canyon-kit, inside its bytes). */
  level?: string;
  /** A Place-local point on each census wall it dresses (dev/ground/cliff-walls.ts `wallAt`). */
  walls: readonly (readonly [number, number])[];
  /** Gated places of its own, beyond the layout's (Place-local x, z). */
  keepClear?: readonly (readonly [number, number])[];
  /** A square (Place-local centre, half its side, m) where nobody may be walled off from the treads by the kit: the
   * audit's reverse flood (dev/level/cliff-kit.ts) for an area whose pieces stand at the water. */
  stranded?: { x: number; z: number; half: number };
  dress(kit: Kit): void;
};
export const AREAS: readonly Area[] = [canyon, shore, gorgeRim, gorgeWalls, gorgeMouth, northRidge, eastCutting];
/** The level an area writes. */
export const levelOf = (area: Area) => area.level ?? `cliff-kit-${area.id}`;

export { solidHulls, solidSamples };
export const CLEAR = 0.4; // m, a collider's footprint outside the tread's edge

/** A run along a wall (docs/plans/cliff-kit-everywhere.md, "runs, not stations"): a polyline of Place-local (x, z)
 * points along its toe or front, measured by arc length. `at(s)` is the point s m along it, with its unit tangent and
 * the normal to its left (u turned a quarter: (-uz, ux)). */
export function runAlong(points: readonly (readonly [number, number])[]) {
  const lengths = [0];
  for (let k = 1; k < points.length; k++)
    lengths.push(lengths[k - 1]! + Math.hypot(points[k]![0] - points[k - 1]![0], points[k]![1] - points[k - 1]![1]));
  const length = lengths[lengths.length - 1]!;
  const at = (s: number) => {
    let k = 1;
    while (k < points.length - 1 && lengths[k]! < s) k++;
    const [ax, az] = points[k - 1]!,
      [bx, bz] = points[k]!;
    const span = lengths[k]! - lengths[k - 1]!,
      t = (s - lengths[k - 1]!) / span;
    const ux = (bx - ax) / span,
      uz = (bz - az) / span;
    return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, ux, uz, nx: -uz, nz: ux };
  };
  return { length, at };
}
/** Pieces end to end along a run from `from` m, each its `width` plus `gap` m of it: each centred on its chord and
 * turned so its front (+z) faces the chord's normal on `side` (+1 the run's left, -1 its right). `put` places it, given
 * its centre and that outward normal (x, z), and its yaw. */
export function layAlong(
  run: ReturnType<typeof runAlong>,
  from: number,
  pieces: readonly (readonly [Key, number])[],
  gap: number,
  side: 1 | -1,
  put: (prefab: Key, at: { x: number; z: number; nx: number; nz: number }, yaw: number, s: number) => void,
) {
  let s = from;
  for (const [prefab, width] of pieces) {
    const a = run.at(s),
      b = run.at(Math.min(run.length, s + width));
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = (-(b.z - a.z) / span) * side,
      nz = ((b.x - a.x) / span) * side;
    put(prefab, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, nx, nz }, Math.atan2(nx, nz), s);
    s += width + gap;
  }
}
export const KEEP_AWAY = 6; // m
/** Fill a contour with the two-course faces, overlapping each join by 0.4 m. */
export function layCourses(run: ReturnType<typeof runAlong>, side: 1 | -1, put: Parameters<typeof layAlong>[5]) {
  const pieces: [Key, number][] = [];
  for (let left = run.length; left >= 6;) {
    const width = left >= 10 ? 10 : 6;
    pieces.push([width === 10 ? 'terrain.sea-face-10' : 'terrain.sea-face-6', width]);
    left -= width - 0.4;
  }
  layAlong(run, 0, pieces, -0.4, side, put);
}
/** Every gated place in the layout, Place-local: a point and the radius it holds (a pad's or pillar's own size). */
const highPad = (p: (typeof PADS)[number]) =>
  (p.look === 'float' || p.id === 'summit') && p.top - H(ORIGIN.x + p.x, ORIGIN.z + p.z) > FACE_TOP;
type Gate = { what: string; x: number; z: number; r: number; clearance?: number };
const GATED: readonly Gate[] = [
  ...PADS.map((p) => ({
    what: `pad ${p.id}`,
    x: p.x,
    z: p.z,
    r: Math.hypot(p.hx, p.hz),
    clearance: highPad(p) ? 0 : KEEP_AWAY,
  })),
  ...SECRETS.flatMap((s) => [
    { what: `secret ${s.id}`, x: s.x, z: s.z, r: 0 },
    { what: `secret ${s.id}'s approach`, x: s.from.x, z: s.from.z, r: 0 },
  ]),
  ...Object.entries(DEVICES).map(([id, d]) => ({ what: `device ${id}`, x: d.x, z: d.z, r: 0 })),
  ...PILLARS.map((p) => ({ what: `pillar ${p.id}`, x: p.x, z: p.z, r: p.r })),
  ...baseSites.flatMap((s) =>
    [{ name: s.id, x: 0, z: 0 }, ...(s.reach ?? [])].map((r) => ({
      what: `site ${s.id} ${r.name}`,
      x: s.x + (r.x ?? 0) - ORIGIN.x,
      z: s.z + (r.z ?? 0) - ORIGIN.z,
      r: 0,
    })),
  ),
];

// A high pad still reserves its column. Its approach needs body clearance along
// the actual pull, from the previous landing to the ring above the destination.
const pulls = PADS.filter(highPad).flatMap((p) => {
  const start = PADS.find((q) => q.id === p.ring);
  if (!start) return [];
  const end = ringAt(p);
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.top, end.z - start.z));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      pad: p.id,
      x: start.x + t * (end.x - start.x),
      y: start.top + t * (end.y - start.top),
      z: start.z + t * (end.z - start.z),
    };
  });
});

/** How far a point (x, z) is, across the ground, from a solid: the distance to its footprint, the outline of its
 * corners seen from above (0 inside it). */
function footprint(points: readonly V3[]) {
  const corners = points.map((q): [number, number] => [q[0], q[2]]);
  // The outline: the convex hull of the corners (monotone chain), counter-clockwise.
  corners.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const half = (points: [number, number][]) => {
    const out: [number, number][] = [];
    for (const q of points) {
      while (out.length > 1 && cross(out[out.length - 2]!, out[out.length - 1]!, q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  const hull = [...half(corners), ...half([...corners].reverse())];
  return (x: number, z: number) => {
    let inside = hull.length > 2,
      near = Infinity;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i]!,
        b = hull[(i + 1) % hull.length]!;
      if (cross(a, b, [x, z]) < 0) inside = false;
      near = Math.min(near, segDist(x, z, a[0], a[1], b[0], b[1]).d);
    }
    return inside ? 0 : near;
  };
}

/** Every drawn track's segments (live, drawn and Ring Island's planned ones), Place-local with the rail top's height,
 * binned on a RAIL_BIN m grid in every bin their bounding box covers (so a long segment's middle is binned too), built
 * on first use: those in the bins round (x, z), every segment passing within RAIL_BIN m. */
const RAIL_BIN = 8;
type Segment = [number, number, number, number, number, number];
let railBins: Map<string, Segment[]> | undefined;
function railsNear(x: number, z: number) {
  if (!railBins) {
    railBins = new Map();
    for (const t of drawnTracks())
      for (let n = 0; n + 1 < t.pts.length; n++) {
        const a = t.pts[n]!,
          b = t.pts[n + 1]!;
        const seg: Segment = [a.x - ORIGIN.x, a.z - ORIGIN.z, a.y, b.x - ORIGIN.x, b.z - ORIGIN.z, b.y];
        const bin = (v: number) => Math.floor(v / RAIL_BIN);
        for (let i = bin(Math.min(seg[0], seg[3])); i <= bin(Math.max(seg[0], seg[3])); i++)
          for (let j = bin(Math.min(seg[1], seg[4])); j <= bin(Math.max(seg[1], seg[4])); j++)
            (railBins.get(`${i},${j}`) ?? railBins.set(`${i},${j}`, []).get(`${i},${j}`)!).push(seg);
      }
  }
  const i = Math.floor(x / RAIL_BIN),
    j = Math.floor(z / RAIL_BIN);
  const out: Segment[] = [];
  for (let di = -1; di <= 1; di++)
    for (let dj = -1; dj <= 1; dj++) out.push(...(railBins.get(`${i + di},${j + dj}`) ?? []));
  return out;
}
/** The loading gauge over a rail's top, m: a car's floor (src/entities/railway/car.ts BOTTOM) and body half width
 * (dev/level/track-continuity.ts CAR_HX), the running gear's half width under the floor, and the static clearance. */
const STATIC = 0.25,
  FLOOR = 0.4,
  BODY_HALF = 1.1 + STATIC,
  GEAR_HALF = KIT.gauge / 2 + STATIC;
/** Whether a point is inside a rail's loading gauge: over the railhead there (the track's points are the rail's top),
 * up to the cars' floor within GEAR_HALF of the track's centre line across the ground, and from the floor up to
 * GAUGE.y1 within BODY_HALF. (Ring Island bracket's GAUGE.y0 is the rail's height over its leaf, so it is not used.) */
function inGauge(rails: ReturnType<typeof railsNear>, x: number, y: number, z: number) {
  for (const [ax, az, ay, bx, bz, by] of rails) {
    const { d: across, t } = segDist(x, z, ax, az, bx, bz);
    if (across >= BODY_HALF) continue;
    const up = y - (ay + (by - ay) * t);
    if (up > 0 && up < GAUGE.y1 && (up >= FLOOR || across < GEAR_HALF)) return true;
  }
  return false;
}

/** How far a placed piece's solids come outside the nearest tread's edge, m (negative: over it), sampled through each
 * box no more than 0.5 m apart. */
export function treadClearance(p: Placement) {
  let tread = Infinity;
  for (const q of solidSamples(p, 0.5)) tread = Math.min(tread, pathAt(q[0], q[2]).edge);
  return tread;
}
/** What a placed piece breaks: its solids over or within CLEAR of a tread (sampled through each box no more than 0.5 m
 * apart) or inside a rail's gauge (0.25 m apart, against the tracks in the bins round the piece: every solid is within
 * RAIL_BIN m of its origin), or within KEEP_AWAY of a gated place (exactly, beyond the place's own radius). */
export function kitPieceProblems(p: Placement, keepClear: Area['keepClear'] = []): string[] {
  const problems: string[] = [];
  const tread = treadClearance(p);
  let gauge: readonly number[] | undefined;
  const rails = railsNear(p.pos[0], p.pos[2]);
  if (rails.length)
    for (const q of solidSamples(p, 0.25))
      if (inGauge(rails, q[0], q[1], q[2])) {
        gauge = q;
        break;
      }
  if (tread < CLEAR)
    problems.push(`${p.id} (${p.prefab}) narrows the tread: its solid comes ${tread.toFixed(3)} m from the edge`);
  if (gauge)
    problems.push(`${p.id} (${p.prefab}) inside a rail's gauge at (${gauge.map((n) => n.toFixed(2)).join(', ')})`);
  const hulls = solidHulls(p);
  const outlines = hulls.map((h) => footprint(h.points));
  const points = hulls.flatMap((h) => h.points);
  const low = Math.min(...points.map((q) => q[1])) - 2,
    high = Math.max(...points.map((q) => q[1])) + 2;
  const blockedPull = pulls.find(
    (q) => q.y >= low && q.y <= high && outlines.some((distance) => distance(q.x, q.z) < 1),
  );
  if (blockedPull) problems.push(`${p.id} obstructs the pull to ${blockedPull.pad}`);
  for (const g of [...GATED, ...keepClear.map(([x, z]): Gate => ({ what: "the area's gated place", x, z, r: 0 }))]) {
    const near = Math.min(...outlines.map((distance) => distance(g.x, g.z))) - g.r;
    const clearance = g.clearance ?? KEEP_AWAY;
    if (near < clearance)
      problems.push(
        `${p.id} (${p.prefab}) violates ${g.what} clearance (${g.x.toFixed(1)}, ${g.z.toFixed(1)}): ${near.toFixed(3)} m, requires ${clearance} m`,
      );
  }
  return problems;
}

/** One area's placements, from the ground as it is now; throws on the first piece that breaks a rule. */
export function generateArea(area: Area): Placement[] {
  const placements: Placement[] = [];
  area.dress({
    place(prefab, pos, rot, where) {
      const placement: Placement = { id: `${area.id}.${placements.length}`, prefab, pos, rot };
      const problems = kitPieceProblems(placement, area.keepClear);
      if (problems.length) throw new Error(`cliff kit, ${area.id} ${where}: ${problems.join('; ')}`);
      placements.push(placement);
    },
  });
  return placements;
}

// Generated at import, so a placement that breaks a rule fails `npm run prefabs` and any audit that loads this file.
const built = AREAS.map(generateArea);
/** One level an area: as generated at import, or `fresh` (the portability test's perturbed Math runs through it). */
export const cliffKitContent = (fresh = false): { levels: LevelDef[] } => ({
  levels: AREAS.map((area, n) => ({ place: levelOf(area), placements: fresh ? generateArea(area) : built[n]! })),
});
