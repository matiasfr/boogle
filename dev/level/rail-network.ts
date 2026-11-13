// The whole rail network as the game draws and runs it, in one place, for level-check's "Track continuity" report
// (./track-continuity.ts) and the rail map (./rail-map.ts, docs/world/rail-map.html). Read-only: every point comes from
// the owning data, nothing here is a second copy of a layout.
//   live lines   Place's rail splines (src/place/layout.ts LINES, 1 m samples): what the view draws and poses cars
//                on (rail.ts poseCarOnLine), today's track (down) and the up track's lateral offset (FORMATION, upLat,
//                crossLat: the stub turnouts, Far Head's crossover)
//   sim paths    RAIL_LINES[...].path (src/sim/railway-lines.ts, 10 m samples): what railLinePoint reads (the server's
//                near-train check only)
//   v27          line 2 on over the bents to Ring Island (src/sim/railway-ring-layout.ts: ringAt, ringDeckY,
//                RING_PATH, RING_LOOP), both tracks and the loop
//   tentative    every future line in the blockout catalog (src/sim/railway-world-lines.ts), its crossovers and loops
// World metres: x east, z south, y the rail (or deck) top.
import {
  FORMATION,
  HALTS,
  LINES,
  ORIGIN,
  TURNTABLE,
  UP_HALTS,
  crossLat,
  lineAt,
  railY,
  upLat,
  type Line,
  type LinePoint,
} from '../../src/place/layout.ts';
import { GATES } from '../../src/place/tech-layout.ts';
import { LINE2_ON, RAIL_LINES } from '../../src/sim/railway-lines.ts';
import { TRAIN_STOPS } from '../../src/sim/railway-train.ts';
import { FORMATION as WORLD_FORMATION, WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import {
  CROSSING_BENTS,
  CROSSING_DECK_Y,
  PIER_RACK,
  WORKS_KILN,
  WORKS_RACK,
  SHED_STALL,
} from '../../src/sim/railway-works-layout.ts';
import {
  RING_FORMATION,
  RING_HALT,
  RING_HEAD,
  RING_LOOP,
  RING_PATH,
  RING_S_HEAD,
  ringAt,
  ringDeckY,
} from '../../src/sim/railway-ring-layout.ts';
import { ENGINE } from '../../src/entities/railway/engine.ts';
import { BUFFERS, LEG, SPUR, homeLayout } from '../../src/place/home-station.ts';
import { TRAILER, TRAIN_OFFSETS } from '../../src/entities/railway/cars.ts';

export type Pt = { x: number; z: number; y: number; s: number };
/** Who runs it: `live` trains run on it today; `v26` drawn in the game today, trains from v26; `v27` Ring Island build
 * 1's planned data; `later` the blockout's tentative lines (map stage 3-8). */
export type Status = 'live' | 'v26' | 'v27' | 'later';
export type Track = {
  id: string;
  /** The service it belongs to (rail map line id). */
  line: string;
  label: string;
  status: Status;
  kind: 'down' | 'up' | 'single' | 'crossover' | 'loop' | 'sim-path' | 'centre';
  /** The spacing it is sampled at, m (0: a hand-drawn polyline). */
  nominal: number;
  pts: Pt[];
  /** What a car on it is posed from: 'spline' (Place's 1 m Catmull-Rom, poseCarOnLine's 2.2 m chord), 'polyline'. */
  pose: 'spline' | 'polyline' | 'none';
  /** Hard limits fail level-check only where a train can be drawn on it today (live and v26). */
  enforce: boolean;
};

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** A point `lat` m beside Place line `line` at `s` (rail.ts's `lateral`: +lat is right of the drawn direction). */
export function beside(line: Line, s: number, lat: number): Pt {
  lineAt(line, s, P);
  return { x: P.x - P.uz * lat + ORIGIN.x, z: P.z + P.ux * lat + ORIGIN.z, y: railY(line, s), s };
}
function placeTrack(line: Line, lat: (s: number) => number | null, s0: number, s1: number, step = 1) {
  const pts: Pt[] = [];
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    const l = lat(s);
    if (l !== null) pts.push(beside(line, s, l));
  }
  return pts;
}
const m = (cm: number) => cm / 100;

export const LIVE = [
  { id: 'line1', name: 'Line 1', line: LINES.north, f: FORMATION.timber, index: 0 },
  { id: 'line2', name: 'Line 2', line: LINES.east, f: FORMATION.quarry, index: 1 },
] as const;

/** Ring Island's lat (cm east of track 1) for a track. */
const RING_TRACK_LAT = { down: RING_FORMATION.tracks[1], up: RING_FORMATION.tracks[0] } as const;
/** u (cm) along the crossing of a world point: the pier head's datum, line 2's heading (inverse of ringAt). */
function ringU(x: number, z: number) {
  const ux = 0.0272,
    n = Math.sqrt(1 + ux * ux);
  const dx = x * 100 - 140200,
    dz = z * 100 - -37200;
  return { u: (ux * dx - dz) / n, lat: (dx + ux * dz) / n };
}
function ringTrack(lat: number, u0: number, u1: number, step = 1000): Pt[] {
  const pts: Pt[] = [];
  for (let u = u0; u <= u1; u += step) {
    const p = ringAt(u, lat);
    pts.push({ x: m(p.x), z: m(p.z), y: m(ringDeckY(u)), s: m(RING_S_HEAD + u) });
  }
  return pts;
}
/** The balloon loop as Ring Island's R1 lays it out: from the halt's north end 12 m on along the line, then straight to
 * the circle's west point (the greybox's straight links), round the circle and back. */
function ringLoop(): Pt[] {
  const y = m(ringDeckY(46800));
  const a = ringAt(46800),
    b = ringAt(48000);
  const pts: Pt[] = [
    { x: m(a.x), z: m(a.z), y, s: 0 },
    { x: m(b.x), z: m(b.z), y, s: 0 },
  ];
  const cx = m(RING_LOOP.x),
    cz = m(RING_LOOP.z),
    r = m(RING_LOOP.r);
  for (let k = 0; k <= 252; k++) {
    const t = Math.PI - (k / 252) * 2 * Math.PI; // from the west point, southward first (the neck arrives heading south)
    pts.push({ x: cx + r * Math.cos(t), z: cz + r * Math.sin(t), y, s: 0 });
  }
  return withS(pts);
}
function withS(pts: Pt[]) {
  let s = 0;
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p.x - pts[i - 1]!.x, p.z - pts[i - 1]!.z);
    return { ...p, s };
  });
}
/** A balloon loop of a future line: the circle that touches the line's end, from the catalog's `ends`. */
function futureLoop(cx: number, cz: number, tx: number, tz: number, y: number): Pt[] {
  const r = WORLD_FORMATION.loopCm / 100;
  const t0 = Math.atan2(tz - cz, tx - cx);
  const pts: Pt[] = [];
  for (let k = 0; k <= 252; k++) {
    const t = t0 + (k / 252) * 2 * Math.PI;
    pts.push({ x: cx + r * Math.cos(t), z: cz + r * Math.sin(t), y, s: 0 });
  }
  return withS(pts);
}

/** Map stage → status. Stage 2 is Ring Island (v27); 3-8 later. */
const futureStatus = (id: string): Status => (id === 'ring' ? 'v27' : 'later');

export function tracks(): Track[] {
  const out: Track[] = [];
  for (const L of LIVE) {
    const len = L.line.len;
    out.push({
      id: `${L.id}-down`,
      line: L.id,
      label: `${L.name}, today's track (down; single where the up track merges)`,
      status: 'live',
      kind: 'down',
      nominal: 1,
      pts: placeTrack(L.line, () => 0, 0, len),
      pose: 'spline',
      enforce: true,
    });
    out.push({
      id: `${L.id}-up`,
      line: L.id,
      label: `${L.name}, up track (s ${L.f.from}-${L.f.to}, drawn; trains from v26)`,
      status: 'v26',
      kind: 'up',
      nominal: 1,
      pts: placeTrack(L.line, (s) => upLat(L.f, s), L.f.from, L.f.to),
      pose: 'spline',
      enforce: true,
    });
    const c = 'crossover' in L.f ? L.f.crossover : undefined;
    if (c)
      out.push({
        id: `${L.id}-crossover`,
        line: L.id,
        label: `${L.name}, Far Head crossover (s ${c[0]}-${c[1]}, up to down)`,
        status: 'v26',
        kind: 'crossover',
        nominal: 0.5,
        pts: placeTrack(L.line, (s) => crossLat(L.f, s), c[0], c[1], 0.5),
        pose: 'spline',
        enforce: true,
      });
    const path = RAIL_LINES[L.index]!.path;
    const sim: Pt[] = [];
    for (let i = 0; i < path.length; i += 2)
      sim.push({ x: m(path[i]!), z: m(path[i + 1]!), y: railY(L.line, (i / 2) * 10), s: (i / 2) * 10 });
    out.push({
      id: `${L.id}-sim`,
      line: L.id,
      label: `${L.name}, the sim's coarse path (RAIL_LINES path, railLinePoint; never drawn)`,
      status: 'live',
      kind: 'sim-path',
      nominal: 10,
      pts: sim,
      pose: 'none',
      enforce: false,
    });
  }
  // v27: line 2 on from the pier head. The view: Place's spline to its end, then ringAt's straight line; the up track
  // on the widened pier (no merge at s 556 once Q7 is laid) and on over the bents.
  const E = LINES.east;
  for (const k of ['down', 'up'] as const) {
    const pier = k === 'down' ? [] : placeTrack(E, () => -4, 556, E.len);
    const ring = ringTrack(RING_TRACK_LAT[k], 0, 46800);
    out.push({
      id: `ring-${k}`,
      line: 'line2',
      label: `Line 2 to Ring Island, ${k} track (${k === 'up' ? 'the widened pier from s 556, then ' : ''}pier head u 0 to the island halt's north end, u 468 m)`,
      status: 'v27',
      kind: k,
      nominal: 10,
      pts: k === 'down' ? ring : [...pier.filter((p) => p.s <= E.len), ...ring.map((p) => ({ ...p }))],
      pose: 'polyline',
      enforce: false,
    });
  }
  // The sim's path in v27: line 2's RAIL_LINES path (to s 740) with RING_PATH appended (railLinePoint, 10 m).
  // As far as RING_PATH: the greybox route's path on (LINE2_ON) is the ring row's own draft.
  const l2 = RAIL_LINES[1]!.path.slice(0, RAIL_LINES[1]!.path.length - LINE2_ON.length);
  const simRing: Pt[] = [];
  for (let i = l2.length - 8; i < l2.length; i += 2)
    simRing.push({ x: m(l2[i]!), z: m(l2[i + 1]!), y: 24.3, s: (i / 2) * 10 });
  for (let i = 0; i < RING_PATH.length; i += 2) {
    const u = 800 + 1000 * (i / 2);
    simRing.push({ x: m(RING_PATH[i]!), z: m(RING_PATH[i + 1]!), y: m(ringDeckY(u)), s: m(RING_S_HEAD + u) });
  }
  out.push({
    id: 'ring-sim',
    line: 'line2',
    label: "Line 2's sim path in v27 (RAIL_LINES path + RING_PATH, railLinePoint)",
    status: 'v27',
    kind: 'sim-path',
    nominal: 10,
    pts: simRing,
    pose: 'none',
    enforce: false,
  });
  out.push({
    id: 'ring-loop',
    line: 'line2',
    label: "Ring Island halt's balloon loop (RING_LOOP: neck, then r 40 m)",
    status: 'v27',
    kind: 'loop',
    nominal: 0,
    pts: ringLoop(),
    pose: 'polyline',
    enforce: false,
  });
  for (const l of WORLD_LINES) {
    out.push({
      id: `${l.id}-centre`,
      line: l.id,
      label: `${l.name} (blockout catalog centreline; both tracks share its joints)`,
      status: futureStatus(l.id),
      kind: 'centre',
      nominal: 0,
      pts: l.pts.map((p, i) => ({
        x: m(p[0]),
        z: m(p[1]),
        y: m(p[2]),
        s:
          m(l.fromCm) +
          l.pts
            .slice(1, i + 1)
            .reduce((a, q, k) => a + Math.round(Math.hypot(q[0] - l.pts[k]![0], q[1] - l.pts[k]![1])) / 100, 0),
      })),
      pose: 'polyline',
      enforce: false,
    });
    for (const e of l.ends) {
      if (e.kind !== 'loop') continue;
      const tip = e.at === 'start' ? l.pts[0]! : l.pts.at(-1)!;
      out.push({
        id: `${l.id}-loop-${e.at}`,
        line: l.id,
        label: `${l.name}, turning loop at its ${e.at}`,
        status: futureStatus(l.id),
        kind: 'loop',
        nominal: 0,
        pts: futureLoop(m(e.x), m(e.z), m(tip[0]), m(tip[1]), m(e.y)),
        pose: 'polyline',
        enforce: false,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- joins between separately defined pieces
export type Join = {
  name: string;
  /** How bad, against its threshold (1 = at it); 0 for a join that is a fact, not a defect. */
  severity: number;
  status: Status;
  x: number;
  z: number;
  gap: number;
  heading: number;
  note: string;
};
const head = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(b.x - a.x, b.z - a.z);
export const deg = (r: number) => (r * 180) / Math.PI;
export const wrap = (r: number) => Math.atan2(Math.sin(r), Math.cos(r));
export function joins(): Join[] {
  const out: Join[] = [];
  const E = LINES.east;
  // Turntable: both lines start at the table, which turns only between the stall road and line 2's road. Layout B
  // (`?home=b`, BOOGLE_HOME=b): the lines start at their buffers and the table is on its own spur, so there is no join.
  const t = { x: TURNTABLE.x + ORIGIN.x, z: TURNTABLE.z + ORIGIN.z };
  const a1 = beside(LINES.north, 0, 0),
    b1 = beside(LINES.north, 2, 0);
  const a2 = beside(E, 0, 0),
    b2 = beside(E, 2, 0);
  if (!homeLayout())
    out.push({
      name: 'Turntable: line 1 and line 2 at s 0',
      severity: 0,
      status: 'live',
      x: t.x,
      z: t.z,
      gap: Math.hypot(a1.x - t.x, a1.z - t.z),
      heading: deg(Math.abs(wrap(head(a1, b1) - head(a2, b2)))),
      note: `both lines start ${Math.hypot(a1.x - t.x, a1.z - t.z).toFixed(1)} m from the table's centre (r ${TURNTABLE.r} m); heading between them at the table`,
    });
  // The view: Place's spline end (s 743) against ringAt's line.
  const end = beside(E, E.len, 0),
    pre = beside(E, E.len - 2, 0);
  const r0 = ringU(end.x, end.z);
  const ra = ringAt(Math.round(r0.u)),
    rb = ringAt(Math.round(r0.u) + 1000);
  out.push({
    name: "Pier head: line 2's spline end (s 743) onto the crossing's line (ringAt, v27)",
    severity: -1,
    status: 'v27',
    x: end.x,
    z: end.z,
    gap: Math.abs(r0.lat) / 100,
    heading: deg(Math.abs(wrap(head(pre, end) - head({ x: m(ra.x), z: m(ra.z) }, { x: m(rb.x), z: m(rb.z) })))),
    note: `spline end at u ${(r0.u / 100).toFixed(2)} m, ${(r0.lat / 100).toFixed(2)} m off the crossing's line`,
  });
  // The sim: line 2's path end (s 740) to RING_PATH[0] (u 8): the reviewer's 11.55 m chord.
  const p = RAIL_LINES[1]!.path.slice(0, RAIL_LINES[1]!.path.length - LINE2_ON.length);
  const q0 = { x: m(p.at(-4)!), z: m(p.at(-3)!) },
    q1 = { x: m(p.at(-2)!), z: m(p.at(-1)!) },
    r1 = { x: m(RING_PATH[0]!), z: m(RING_PATH[1]!) },
    r2 = { x: m(RING_PATH[2]!), z: m(RING_PATH[3]!) };
  out.push({
    name: "Pier head, sim: line 2's path end (s 740) to RING_PATH's first point (u 8)",
    severity: Math.max((Math.hypot(r1.x - q1.x, r1.z - q1.z) - 10) / 1, 0),
    status: 'v27',
    x: q1.x,
    z: q1.z,
    gap: Math.hypot(r1.x - q1.x, r1.z - q1.z),
    heading: Math.max(
      deg(Math.abs(wrap(head(q0, q1) - head(q1, r1)))),
      deg(Math.abs(wrap(head(q1, r1) - head(r1, r2)))),
    ),
    note: 'chord length (nominal 10 m) and the worst heading change either side of it',
  });
  // The bents against the crossing's line: centres should stand on lat -2 m, decks at ringDeckY.
  let worst = 0,
    dy = 0;
  CROSSING_BENTS.forEach((b, i) => {
    const r = ringU(m(b.x), m(b.z));
    worst = Math.max(worst, Math.abs(r.lat - RING_FORMATION.mid) / 100);
    dy = Math.max(dy, Math.abs(ringDeckY(Math.round(r.u)) - CROSSING_DECK_Y[i]!) / 100);
  });
  out.push({
    name: 'Bents 1-6 under the crossing (CROSSING_BENTS against ringAt lat -2, CROSSING_DECK_Y against ringDeckY)',
    severity: -1,
    status: 'v26',
    x: m(CROSSING_BENTS[0]!.x),
    z: m(CROSSING_BENTS[0]!.z),
    gap: worst,
    heading: 0,
    note: `worst bent centre ${worst.toFixed(2)} m off the formation's middle; worst deck height ${dy.toFixed(2)} m off the bow`,
  });
  // The loop's neck.
  const loop = ringLoop();
  const before = ringAt(46800 - 1000);
  out.push({
    name: "Ring Island loop: the line into the neck, the neck's reversal and the neck onto the circle",
    severity: -1,
    status: 'v27',
    x: loop[1]!.x,
    z: loop[1]!.z,
    gap: 0,
    heading: Math.max(
      deg(Math.abs(wrap(head({ x: m(before.x), z: m(before.z) }, loop[0]!) - head(loop[1]!, loop[2]!)))),
    ),
    note: `the neck runs 12 m on (u 480 m), then ${Math.hypot(loop[2]!.x - loop[1]!.x, loop[2]!.z - loop[1]!.z).toFixed(1)} m back to the circle's west point; tangent mismatch onto the circle ${deg(Math.abs(wrap(head(loop[1]!, loop[2]!) - head(loop[2]!, loop[3]!)))).toFixed(1)}°`,
  });
  // The blockout's ring line against line 2's rail end.
  const ring = WORLD_LINES.find((l) => l.extends === 1)!;
  const w0 = { x: m(ring.pts[0]![0]), z: m(ring.pts[0]![1]) },
    w1 = { x: m(ring.pts[1]![0]), z: m(ring.pts[1]![1]) };
  out.push({
    name: "Blockout catalog: 'Line 2 to Ring Island' from line 2's rail end",
    severity: 0,
    status: 'v27',
    x: w0.x,
    z: w0.z,
    gap: Math.hypot(w0.x - end.x, w0.z - end.z),
    heading: deg(Math.abs(wrap(head(pre, end) - head(w0, w1)))),
    note: 'the catalog line is the greybox draft; R1 (ringAt) supersedes it',
  });
  // Every future loop: the line's last chord against the circle's tangent where they touch.
  for (const l of WORLD_LINES)
    for (const e of l.ends) {
      if (e.kind !== 'loop') continue;
      const tip = e.at === 'start' ? l.pts[0]! : l.pts.at(-1)!,
        nb = e.at === 'start' ? l.pts[1]! : l.pts.at(-2)!;
      const tx = m(tip[0]),
        tz = m(tip[1]);
      const cx = m(e.x),
        cz = m(e.z);
      const lineHead = Math.atan2(tx - m(nb[0]), tz - m(nb[1]));
      const radial = Math.atan2(tx - cx, tz - cz);
      const off = Math.abs(Math.abs(deg(wrap(lineHead - radial))) - 90);
      out.push({
        name: `${l.name}: into its loop at the ${e.at}`,
        severity: -1,
        status: futureStatus(l.id),
        x: tx,
        z: tz,
        gap: Math.abs(Math.hypot(tx - cx, tz - cz) - WORLD_FORMATION.loopCm / 100),
        heading: off,
        note: 'the end point against the circle (gap) and the line against its tangent (heading)',
      });
    }
  // Unless set, a join is as bad as its worse of a 5 cm gap and a 2° turn.
  for (const o of out) if (o.severity < 0) o.severity = Math.max(o.gap / 0.05, o.heading / 2);
  return out;
}

// ---------------------------------------------------------------- consists, halts and the things a train must clear
/** The nominal long train (owner, 10 November: cars longer than the platform; only the passenger part aligns): engine,
 * the passenger car and three cargo cars at today's 3.7 m pitch. `along` is the passenger car's centre (TRAIN_OFFSETS:
 * car 1 at 0), which is where a train's s stands at a stop. The largest engine planned is the longer boiler (Ring
 * Island build 2), whose length isn't in the data: taken as half as long again (6 m), as PIER_STOP_CM's note does. */
export const CONSIST = (() => {
  const pass = TRAILER.hz;
  const engineNose = TRAIN_OFFSETS[0]! + ENGINE.hz;
  const big = { hz: ENGINE.hz * 1.5 };
  const bigNose = TRAILER.hz + 0.6 + 2 * big.hz;
  const tail = -3 * 3.7 - TRAILER.hz;
  return {
    pass,
    engineNose,
    bigNose,
    tail,
    todayTail: TRAIN_OFFSETS.at(-1)! - TRAILER.hz,
    engineLength: 2 * ENGINE.hz,
    bigLength: 2 * big.hz,
  };
})();

export type Obstacle = { s0: number; s1: number; what: string; tracks: 'both' | 'up' | 'down' };
export type LiveHalt = {
  name: string;
  line: 'line1' | 'line2';
  stop: number;
  /** The platform each direction's train stands at: [s0, s1], lat (m, + right of line). null: no platform that way. */
  up: { s0: number; s1: number; lat: number } | null;
  down: { s0: number; s1: number; lat: number } | null;
  status: Status;
};
export function liveHalts(): LiveHalt[] {
  const l1 = TRAIN_STOPS[0]!.map((s) => s / 100),
    l2 = TRAIN_STOPS[1]!.map((s) => s / 100);
  const p = (name: string) => HALTS.find((h) => h.name === name)!;
  const u = (name: string) => UP_HALTS.find((h) => h.name === name)!;
  const span = (h: { s0: number; s1: number; lat: number }) => ({ s0: h.s0, s1: h.s1, lat: h.lat });
  return [
    { name: 'Village', line: 'line1', stop: l1[0]!, up: span(p('Village')), down: span(p('Village')), status: 'live' },
    { name: 'Camp', line: 'line1', stop: l1[1]!, up: span(p('Camp')), down: span(p('Camp')), status: 'live' },
    {
      name: 'Village, line 2',
      line: 'line2',
      stop: l2[0]!,
      up: span(p('Village, line 2')),
      down: span(p('Village, line 2')),
      status: 'live',
    },
    { name: 'Quarry', line: 'line2', stop: l2[1]!, up: span(u('Quarry, up')), down: span(p('Quarry')), status: 'live' },
    {
      name: 'Far Head',
      line: 'line2',
      stop: l2[2]!,
      up: span(u('Far Head, up')),
      down: span(p('Far Head')),
      status: 'live',
    },
    // Place's pier halt (layout.ts PIER: s 719-741, lat -2.9 on the rack side); v27 adds the up platform at lat -6.9.
    { name: 'Pier', line: 'line2', stop: l2[3]!, up: null, down: { s0: 719, s1: 741, lat: -2.9 }, status: 'live' },
  ];
}
/** Along-line obstacles a standing train must clear (s in m), per live line. */
export function obstacles(line: 'line1' | 'line2'): Obstacle[] {
  const L = line === 'line1' ? LIVE[0] : LIVE[1];
  const f = L.f;
  const table = TURNTABLE.r;
  const home: Obstacle[] = homeLayout()
    ? [
        {
          s0: BUFFERS[L.index]! - 10,
          s1: BUFFERS[L.index]!,
          what: `the buffer stops (s ${BUFFERS[L.index]})`,
          tracks: 'both',
        },
        ...(L.index === 1
          ? [
              {
                s0: SPUR.s - 1,
                s1: SPUR.s + 3,
                what: `the engine spur's points (s ${SPUR.s})`,
                tracks: 'both' as const,
              },
            ]
          : []),
        {
          s0: (L.index ? LEG.to : LEG.from) - 2,
          s1: (L.index ? LEG.to : LEG.from) + 2,
          what: `the cart's leg (s ${L.index ? LEG.to : LEG.from})`,
          tracks: 'both',
        },
      ]
    : [{ s0: -1, s1: table, what: `the turntable (r ${table} m)`, tracks: 'both' }];
  const out: Obstacle[] = [
    ...home,
    { s0: f.from, s1: f.from + 20, what: `the stub turnout at s ${f.from}`, tracks: 'both' },
    { s0: f.to - 20, s1: f.to, what: `the stub turnout at s ${f.to}`, tracks: 'both' },
    { s0: L.line.len, s1: L.line.len + 50, what: `the rail end (s ${L.line.len})`, tracks: 'both' },
  ];
  if (line === 'line2') {
    const c = FORMATION.quarry.crossover!;
    out.push({ s0: c[0], s1: c[1], what: `Far Head's crossover (s ${c[0]}-${c[1]})`, tracks: 'both' });
    for (const h of UP_HALTS)
      out.push({
        s0: h.crossS - 1.2,
        s1: h.crossS + 1.2,
        what: `${h.name.split(',')[0]}'s plank crossing`,
        tracks: 'both',
      });
    for (const [id, g] of Object.entries(GATES))
      out.push({ s0: g.s - 0.45, s1: g.s + 0.45, what: `the ${id} gate's slab (while shut)`, tracks: 'both' });
    out.push({
      s0: 734.4,
      s1: 743,
      what: 'the track layer parked at the rails end (its loco back 734.4)',
      tracks: 'down',
    });
  }
  return out;
}
/** Where a point stands along a live line: nearest s (1 m) and lateral offset (+ right). */
export function alongLive(line: Line, x: number, z: number) {
  let best = { s: 0, d: Infinity, lat: 0 };
  for (let s = homeLayout() ? -6 : 0; s <= line.len; s += 0.5) {
    lineAt(line, s, P);
    const px = P.x + ORIGIN.x,
      pz = P.z + ORIGIN.z;
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { s, d, lat: (x - px) * -P.uz + (z - pz) * P.ux };
  }
  return best;
}
/** Resource sources the trains serve, world m, for the cargo-loader plan. */
export const SOURCES = [
  {
    id: 'works-rack',
    name: 'Split-rock Works rack (footings, the kiln)',
    x: m(WORKS_RACK.x),
    z: m(WORKS_RACK.z),
    line: 'line2',
  },
  { id: 'kiln', name: 'The kiln', x: m(WORKS_KILN.x), z: m(WORKS_KILN.z), line: 'line2' },
  { id: 'pier-rack', name: 'The pier rack', x: m(PIER_RACK.x), z: m(PIER_RACK.z), line: 'line2' },
  { id: 'stall', name: 'The Roundhouse stall', x: m(SHED_STALL.x), z: m(SHED_STALL.z), line: 'line2' },
] as const;
export const RING = { RING_HALT, RING_HEAD, RING_LOOP, RING_S_HEAD };
