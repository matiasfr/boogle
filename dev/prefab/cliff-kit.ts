// The cliff kit's generator (docs/plans/cliff-kit-everywhere.md, step 0): one generator over the census
// (dev/ground/cliff-walls.ts), writing one level an area, so each area mounts, culls and ships on its own. Records are
// src/content/prefabs/terrain.ts; src/entities/terrain-kit/view.ts stands every area's level in the world (Place-local
// x + ORIGIN.x), one instance batch a piece an area. Placed from the ground the game builds, so a terrain change shows
// up as a stale artifact (`npm run prefabs -- --check`), not floating rock. Every placement is checked here against the
// kit's piece rules (`kitPieceProblems`, which `npm run level-check` runs again on the built levels, with the reach
// flood of dev/level/cliff-kit-reach.ts) and generation fails on the first broken one:
// - The tread keeps its full width: every collider, as placed and tilted, stays CLEAR m outside the tread's edge.
// - No piece's solid within KEEP_AWAY m of a gated place: the layout's pads, secrets (and where each is fetched from),
//   devices and pillars, and the sites' reach points, plus any the area names.
// - The trains pass: no solid inside a rail's loading gauge, sampled every 0.25 m through pieces near a track: a car's
//   body from its floor up to 4.5 m over the rail (half its 2.2 m width) and its running gear under the floor (half the
//   track's gauge), each with the 0.25 m static clearance level-check holds furniture to beside trains
//   (dev/level/home-cart.ts, rider-coach R1b).
// - Art only stands, never a new way up (the reach flood, in level-check).
// Areas: the canyon (dev/prefab/cliff-kit-canyon.ts). No other area is dressed yet.
import type { LevelDef, Placement, Vec3 } from '../../src/prefab/types.ts';
import { segDist } from '../../src/island/stamps.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { pathAt } from '../../src/place/path-field.ts';
import { DEVICES, PADS, PILLARS, SECRETS } from '../../src/place/tech-layout.ts';
import { GAUGE } from '../../src/entities/ring-island/bracket.ts';
import { KIT } from '../../src/place/turnout.ts';
import { prefabs } from '../../src/content/prefabs/terrain.ts';
import { baseSites } from '../level/sites.ts';
import { drawnTracks } from '../level/rail-network.ts';
import { canyon } from './cliff-kit-canyon.ts';

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
  dress(kit: Kit): void;
};
export const AREAS: readonly Area[] = [canyon];
/** The level an area writes. */
export const levelOf = (area: Area) => area.level ?? `cliff-kit-${area.id}`;

export const CLEAR = 0.4; // m, a collider's footprint outside the tread's edge
export const KEEP_AWAY = 6; // m
/** Every gated place in the layout, Place-local: a point and the radius it holds (a pad's or pillar's own size). */
const GATED: readonly { what: string; x: number; z: number; r: number }[] = [
  ...PADS.map((p) => ({ what: `pad ${p.id}`, x: p.x, z: p.z, r: Math.hypot(p.hx, p.hz) })),
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

/** Turns (x, y, z) by a record rotation [yaw, pitch, roll] in its order, YXZ: roll, then pitch, then yaw. */
function turn([x, y, z]: readonly number[], [yaw = 0, pitch = 0, roll = 0]: readonly number[]) {
  [x, y] = [x! * Math.cos(roll) - y! * Math.sin(roll), x! * Math.sin(roll) + y! * Math.cos(roll)];
  [y, z] = [y * Math.cos(pitch) - z! * Math.sin(pitch), y * Math.sin(pitch) + z! * Math.cos(pitch)];
  return [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)] as const;
}
/** A placed piece's box solids, each as a function from box-local (-1..1 on each axis) to Place-local (x, y, z): the
 * box's own rotation and offset, then the placement's scale, whole rotation and position (three's TRS order), with the
 * box's half sizes. Plain arithmetic, so audits can run this source with only its data bound. */
export function solidBoxes(p: Placement) {
  return prefabs
    .find((q) => q.key === p.prefab)!
    .colliders.map((c) => {
      if (c.shape !== 'box') throw new Error(`cliff kit: ${p.prefab} has a solid that is not a box`);
      const box = (u: number, v: number, w: number) => {
        const inBox = turn([c.half[0] * u, c.half[1] * v, c.half[2] * w], c.rot ?? []);
        const [sx = 1, sy = 1, sz = 1] = p.scale ?? [];
        const placed = turn(
          [(inBox[0] + c.at[0]) * sx, (inBox[1] + c.at[1]) * sy, (inBox[2] + c.at[2]) * sz],
          p.rot ?? [],
        );
        return [placed[0] + p.pos[0], placed[1] + p.pos[1], placed[2] + p.pos[2]] as const;
      };
      return Object.assign(box, { half: c.half });
    });
}
/** Every point through a placed piece's boxes, no more than `spacing` m apart along each box axis. */
export function* solidSamples(p: Placement, spacing: number) {
  for (const box of solidBoxes(p)) {
    const steps = box.half.map((h) => Math.max(1, Math.ceil((2 * h) / spacing)));
    for (let i = 0; i <= steps[0]!; i++)
      for (let j = 0; j <= steps[1]!; j++)
        for (let k = 0; k <= steps[2]!; k++)
          yield box((2 * i) / steps[0]! - 1, (2 * j) / steps[1]! - 1, (2 * k) / steps[2]! - 1);
  }
}
/** How far a point (x, z) is, across the ground, from a box: the distance to its footprint, the outline of its eight
 * corners seen from above (0 inside it). */
function footprint(box: ReturnType<typeof solidBoxes>[number]) {
  const corners: [number, number][] = [];
  for (const u of [-1, 1])
    for (const v of [-1, 1])
      for (const w of [-1, 1]) {
        const q = box(u, v, w);
        corners.push([q[0], q[2]]);
      }
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

/** What a placed piece breaks: its solids over or within CLEAR of a tread (sampled through each box no more than 0.5 m
 * apart) or inside a rail's gauge (0.25 m apart, against the tracks in the bins round the piece: every solid is within
 * RAIL_BIN m of its origin), or within KEEP_AWAY of a gated place (exactly, beyond the place's own radius). */
export function kitPieceProblems(p: Placement, keepClear: Area['keepClear'] = []): string[] {
  const problems: string[] = [];
  let tread = Infinity,
    gauge: readonly number[] | undefined;
  for (const q of solidSamples(p, 0.5)) tread = Math.min(tread, pathAt(q[0], q[2]).edge);
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
  const outlines = solidBoxes(p).map(footprint);
  for (const g of [...GATED, ...keepClear.map(([x, z]) => ({ what: "the area's gated place", x, z, r: 0 }))]) {
    const near = Math.min(...outlines.map((distance) => distance(g.x, g.z))) - g.r;
    if (near < KEEP_AWAY)
      problems.push(
        `${p.id} (${p.prefab}) within ${KEEP_AWAY} m of ${g.what} (${g.x.toFixed(1)}, ${g.z.toFixed(1)}): ${near.toFixed(3)} m`,
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
