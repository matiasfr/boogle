// The map of ?proto=place: a slice of Threefold Reach (.look/previz/home-redesign/board.md, section 3), authored in one
// table so a change of mind is a change of numbers. All coordinates are metres relative to ORIGIN, north is -z. The
// gorge is three straight arms from the spire's islet with a slight wiggle; the lobes' heights meet along those rays, and
// the walls hide the seam. Foot paths are polylines with explicit heights; rail lines are curves with explicit ends.
// docs/research/big-walk-level-design.md, sections 5 and 9, recs 5-7 and 10. Local: nothing here reaches the sim; it
// reads the sim's station rows (LINE1_STATIONS, LINE2_STATIONS) and turnout length, never the other way round.
import { smoothstep } from '../math.ts';
import { TURNOUT_CM } from '../sim/railway-lines.ts';
import { LINE1_STATIONS, type LineStation, type LineStationId } from '../sim/railway-line-layout.ts';
import { LINE2_STATIONS, type Line2Station, type Line2StationId } from '../sim/railway-line2-layout.ts';
import { SHORE_COAST, SHORE_LANDING } from './shore-layout.ts';
import { CHOP_CONTACT, CHOP_RESTART } from './chop-timing.ts';
import {
  ISLAND_HALTS,
  LINE_ORIGIN,
  PROPS,
  SHELF_B,
  TABLE,
  headPoints,
  homeLayout,
  spliceHead,
} from './home-station.ts';

/** `?home=b` (docs/plans/home-station.md, step 3): draw Home as one terminus station. Look only; the rules keep today's
 * anchors, so prompts at Home stay in the old places. */
const HOME_B = homeLayout();

/** Far from today's island, past its soft wall, as the crossing does. */
// The bank cart has one level resting place on the shoulder, clear of the steep bank.
export const BANK_CART = { x: -62, z: 157, y: 18.6, yaw: 0.5 };

export const ORIGIN = { x: 1000, z: 0 };
export const toWorld = (x: number) => x + ORIGIN.x;

// Round 4's numbers are hypotheses, set with dev/economy/model.ts (`node dev/economy/model.ts round4`) until played.
export const TUNE = {
  carry: 8, // pieces on your back at first; the pack frame makes it PACK.carry
  strokes: 5, // chops to fell a tree with the first axe
  logsPerStroke: 2,
  swingS: CHOP_RESTART, // s before the next chop can start
  contactS: CHOP_CONTACT, // s from the press to the axe meeting the bark
  flyS: 0.26, // s a log takes from the bark to your back
  unloadS: 0.09, // s between pieces leaving your back at a station
  feedS: 0.07, // s between pieces rolling from a frame into the machine
  laySpeed: 5, // m/s the machine lays at, unless a station says otherwise
  runSpeed: 7, // m/s it runs over track that's already there, into the village
  turnS: 2.6, // s on the turntable
  cruise: 20, // m/s, trains (the crossing's accepted speed), and a rider goes express
  accel: 3.5, // m/s²
  dwell: 5, // s at each stop
  deckCrates: 8, // what a train carries: its capacity, the number on the board
  pileEvery: 1.4, // s per crate a working camp makes
  pileMax: 14,
  roofCrates: 8, // crates of timber the first train cranes onto the forge: trains finish what your hands started
  craneS: 1.5, // s the crane takes per crate
  railEvery: 0.5, // s per rail the lit forge pours
  railEveryRoofed: 0.25, // and with its roof on
  rackMax: 24,
  rackStart: 12, // stock units on the machine's own stack, for line 1; each lays as its rail pairs
  crateLogs: 6, // logs a crate on the village heap gives
  people: 12, // the village's population at the start
  stepAt: [6, 16], // crates of a kind at the village for its first and second step-up
  reachStation: 3.6, // m from a frame's middle where your back unloads
};
/** The better axe: the first swing tells you. */
export const AXE2 = { strokes: 3, logsPerStroke: 5 }; // 2.5 x the logs a stroke, half again the logs a tree: fewer retargets
/** The pack frame: 16 crosses real trip thresholds (docs/research/rail-economy-model.md, "capacity has cliffs"). */
export const PACK = { carry: 16 };
/** Rocks with an orange band: strokes and stones a stroke, either axe. */
export const ROCK_WORK = { strokes: 4, stonePerStroke: 2 };
/** The great tree: one trunk, on your shoulder. It takes strokes, not a bigger axe. */
export const GREAT = { strokes: 12, soloSpeed: 2.2, pairSpeed: 5 };
/** The handcart that brings logs to a rack by the next frame, once the depot's open (./depot.ts). */
export const CART = { speed: 9, load: 24, loadS: 3, rails: 16, forgeS: 8, leaveS: 3, hx: 0.75, hz: 1.35, top: 0.55 };
/** Money, a comic score: what a piece delivered pays (./score.ts). */
export const PAY = { logs: 15, rails: 40, stone: 25, beam: 1500, stretch: 500 };

export type Pt = [x: number, z: number, y: number];
export const SPIRE = { x: 8, z: -10, h: 105 };

// The gorge: rays from the spire, bearings in degrees clockwise from north.
export const ARMS = { nw: -38, ne: 16, stem: -164 };
export const GORGE = { river: 4.5, bank: 12.5, wall: 3, floor: 1.3, bed: -2.2 };

/** The lobes' top: the west commons (the village), the north ridge (55 m), the east table. */
export const LOBE = { west: 18, north: 30, east: 24 };

export const VILLAGE = { x: -100, z: 14, y: 18, r: 42 };
/** Far Head: a low headland past the quarry, over the sea, that a long trestle reaches. The second route ends here. */
export const HEAD = { x: 392, z: -170, r: 78, y: 24 };
/** The land's grid: wider now, for Far Head. */
export const GRID = { x0: -260, x1: 520, z0: -280, z1: 260, cell: 2 };

export type Foot = { pts: Pt[]; bridgeAt: number; bold: boolean };
// `bridgeAt`: the path's segment from pts[bridgeAt] to pts[bridgeAt + 1] is a low footbridge, not ground. `bold`: the way
// you're sent first, wide and strong from your feet at spawn.
export const PATHS: Foot[] = [
  {
    // To the timber camp: straight out of the village from where you stand, then north along the commons, past a lookout
    // on the rim, down the wall to the river under where the trestle will go, over the bridge, then up the far wall and
    // round the shoulder of the ridge to the machine.
    pts: [
      [-98, 9, 18],
      [-98, -6, 18],
      [-102, -14, 18],
      [-122, -30, 18],
      [-142, -70, 17.5],
      [-130, -125, 17],
      [-100, -118, 17],
      [-82, -95, 9],
      [-56, -77, 1.7],
      [-41.5, -88, 1.7],
      [-61, -121, 12],
      [-61, -147, 19],
      [-82, -165, 22],
      [-50, -178, 26],
      [-20, -162, 30],
      [-14, -154, 30],
    ],
    bridgeAt: 8,
    bold: true,
  },
  {
    // To the quarry: south along the commons, down to the bank behind a shoulder, over the bridge with the spire up the
    // gorge, then up the far wall and along the table's edge.
    pts: [
      [-98, 9, 18],
      [-100, 62, 18],
      [-78, 108, 17.5],
      [-70, 146, 12],
      [-50, 150, 8],
      [-42, 132, 3.2],
      [-36.5, 112.4, 1.7],
      [-19.2, 117.4, 1.7],
      [-10, 150, 8],
      [20, 160, 14],
      [45, 130, 21],
      [70, 100, 24],
      [92, 70, 24],
      [92, 45, 24],
    ],
    bridgeAt: 6,
    bold: false,
  },
];

// ---------------------------------------------------------------- rail lines
const STEP = 1;
export type Line = {
  xs: Float32Array;
  zs: Float32Array;
  len: number;
  y0: number;
  y1: number;
  ramp: [number, number]; // where along the line it climbs from y0 to y1
};
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
function makeLine(pts: [number, number][], y0: number, y1: number, ramp: [number, number]): Line {
  const dense: [number, number][] = [];
  for (let k = 0; k < pts.length - 1; k++)
    for (let n = 0; n < 40; n++) {
      const t = n / 40,
        a = pts[Math.max(0, k - 1)]!,
        b = pts[k]!,
        c = pts[k + 1]!,
        d = pts[Math.min(pts.length - 1, k + 2)]!;
      dense.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]);
    }
  dense.push(pts[pts.length - 1]!);
  const xs: number[] = [dense[0]![0]],
    zs: number[] = [dense[0]![1]];
  let carry = 0;
  for (let k = 1; k < dense.length; k++) {
    const [ax, az] = dense[k - 1]!,
      [bx, bz] = dense[k]!;
    const seg = Math.hypot(bx - ax, bz - az);
    let d = STEP - carry;
    while (d <= seg) {
      xs.push(ax + ((bx - ax) * d) / seg);
      zs.push(az + ((bz - az) * d) / seg);
      d += STEP;
    }
    carry = seg - (d - STEP);
  }
  return { xs: Float32Array.from(xs), zs: Float32Array.from(zs), len: (xs.length - 1) * STEP, y0, y1, ramp };
}
export type LinePoint = { x: number; z: number; ux: number; uz: number };
/** Local coordinates of `s` metres along the line, straight past its ends. */
export function lineAt(l: Line, s: number, out: LinePoint) {
  const n = l.xs.length;
  const f = Math.max(0, Math.min(n - 1.001, s / STEP)),
    k = Math.floor(f),
    t = f - k;
  let dx = l.xs[k + 1]! - l.xs[k]!,
    dz = l.zs[k + 1]! - l.zs[k]!;
  const len = Math.hypot(dx, dz) || 1;
  dx /= len;
  dz /= len;
  const past = s - (k + t) * STEP;
  out.x = l.xs[k]! + (l.xs[k + 1]! - l.xs[k]!) * t + dx * past;
  out.z = l.zs[k]! + (l.zs[k + 1]! - l.zs[k]!) * t + dz * past;
  out.ux = dx;
  out.uz = dz;
  return out;
}
/** Rail height at `s`. */
export const railY = (l: Line, s: number) => l.y0 + (l.y1 - l.y0) * smoothstep(l.ramp[0], l.ramp[1], s);

/** Line 1's village end, and the turntable there: line 2 leaves from the same spot. */
export const TURNTABLE = HOME_B ? { x: TABLE.x, z: TABLE.z, r: TABLE.r } : { x: -82, z: 12, r: 4.8 };
// Both lines start at LINE_ORIGIN, not TURNTABLE: moving the table (docs/plans/home-station.md) must not reshape them.
const TODAY = {
  north: makeLine(
    [
      [LINE_ORIGIN.x, LINE_ORIGIN.z], // straight for its first 36 m: the platform is one straight box
      [-70, -2],
      [-58, -16],
      [-46, -36],
      [-38, -60],
      [-30, -90],
      [-24, -110],
      [-28, -128],
      [-24, -143],
      [-8, -149],
      [8, -149],
      [24, -149],
    ],
    18.3,
    30.3,
    [50, 118],
  ),
  east: makeLine(
    [
      [LINE_ORIGIN.x, LINE_ORIGIN.z],
      [-70, 24],
      [-58, 36],
      [-40, 38],
      [-15, 30],
      [8, 30],
      [45, 38],
      [75, 38],
      [88, 36],
      // On past the quarry: over the table, across the sea on a long trestle, up onto Far Head...
      [118, 16],
      [150, -8],
      [182, -30],
      [222, -62],
      [262, -94],
      [306, -128],
      [346, -156],
      [376, -176],
      [392, -200],
      // ...and the pier, north off the Head towards the shard across the sea.
      [400, -232],
      [404, -270],
      [404, -320],
      [402, -372],
    ],
    18.3,
    24.3,
    [72, 112],
  ),
};
/** Layout B splices each line's new head over its first metres: every `s` past the join is where it was. */
export const LINES = HOME_B
  ? { north: spliceHead(TODAY.north, headPoints(0)), east: spliceHead(TODAY.east, headPoints(1)) }
  : TODAY;

// ---------------------------------------------------------------- the lines' stations
export type Goods = 'logs' | 'rails' | 'stone' | 'beam';
export const GOODS: Goods[] = ['logs', 'rails', 'stone', 'beam'];
export type Stock = Record<Goods, number>;
export const noStock = (): Stock => ({ logs: 0, rails: 0, stone: 0, beam: 0 });
export type Station = {
  id: string;
  s: number; // along the line: where the laid track ends when this station's turn comes
  to: number; // how far along the line this station's stretch lays
  side: number; // which side of the track its frame stands
  logs: number; // what it needs
  rails: number;
  stone?: number;
  beam?: number; // the great tree's trunk: one thing, on your shoulder
  speed?: number; // m/s it lays at, when not TUNE.laySpeed
  label: string;
  crate?: boolean; // the machine hands down a crate when it's laid (./gifts.ts)
  rack?: 'cart' | 'train'; // a rack by the frame that something brings logs (and rails) to; you do the last carry
  gate?: 'quarry' | 'sea'; // a slab stands across the line here: this frame takes nothing until it's down (./tech.ts)
};
export type LineSpec = {
  id: 'timber' | 'quarry';
  kind: 'wood' | 'stone';
  line: Line;
  dir: 1 | -1; // which way along the line the machine lays
  camp: { x: number; z: number; y: number };
  stations: Station[];
  stops: number[]; // where trains stand, in metres along the line
  freeUpTo: number; // the last of `stations` that opens the line for trains; the rest lay on past the last stop
};
const N = LINES.north.len;
/** Where the track is already down at each end of line 1; line 2 has a few metres off the turntable. */
export const STUB = { camp: N - 30, village: 30, east: 7 };
/** Line 2's landmarks in metres along it. */
export const EAST = { quarry: 178, rim: 286, head: 546, headStop: 524 };
/** What the land keeps of each station beside the sim's row (LINE1_STATIONS, LINE2_STATIONS: the one list of
 * stations): which side of the track its frame stands, and its board. Typed over every sim station id, so a station
 * added there without its entry here fails the typecheck (the 11 November outage: v27 added Q7 to the sim only).
 * `own`: the station has its own frame, not one beside the line (Q7's on the pier's piled deck, RING_Q7_FRAME, built
 * by line2-view.ts), so it is not in its line's `LINKS` stations and the laying machine never works it. */
const STATION_LAND: Record<LineStationId | Line2StationId, { side: number; label: string; own?: true }> = {
  T1: { side: 1, label: 'Station 1' },
  T2: { side: 1, label: 'Station 2' },
  T3: { side: 1, label: 'Station 3' },
  // In B the island is on road 2's north side, so Q1's frame stands south of it.
  Q1: { side: HOME_B ? 1 : -1, label: 'Line 2, station 1' },
  Q2: { side: -1, label: 'Line 2, station 2' },
  Q3: { side: -1, label: 'Line 2, station 3' },
  Q4: { side: -1, label: 'Line 2, station 4' },
  Q5: { side: -1, label: 'Line 2, station 5' },
  Q6: { side: -1, label: 'The pier' },
  // "Line 2, station 7" follows the others' board ("Station 7"); the plan names no label for it.
  Q7: { side: 1, label: 'Line 2, station 7', own: true },
};
/** A sim station row as the land reads it: metres along its line, its bill by goods, line 2's laying speed in m/s
 * (the row's is per cent of TUNE.laySpeed) and its rack (a depot's cart, or a kit by train). Line 1's second good is
 * stone, line 2's rails. Fields the row leaves at nothing are left out, as the hand-written rows did. */
export function landStation(row: LineStation | Line2Station): Station {
  const two = 'speed' in row,
    [logs, second] = row.bill,
    { side, label } = STATION_LAND[row.id];
  return {
    id: row.id,
    s: row.fromCm / 100,
    to: row.toCm / 100,
    side,
    logs,
    rails: two ? second : 0,
    ...(!two && second ? { stone: second } : {}),
    ...(row.beam ? { beam: row.beam } : {}),
    ...(two && row.speed !== 100 ? { speed: (row.speed * TUNE.laySpeed) / 100 } : {}),
    label,
    ...(two && (row.feed === 'train' || row.depot) ? { rack: row.feed === 'train' ? 'train' : 'cart' } : {}),
    ...(row.crate ? { crate: true } : {}),
    ...(two && row.gate ? { gate: row.gate } : {}),
  };
}
/** The stations whose frames stand beside a line's laid track: every sim row not marked `own`. Checked at load, so a
 * mismatch fails every Node run and the pre-deploy live boot by name instead of dropping or doubling a frame: a row
 * beside the line must lie on it, and an `own` row must lie past its end. */
function onLine(rows: readonly (LineStation | Line2Station)[], line: Line) {
  for (const row of rows) {
    const on = Math.max(row.fromCm, row.toCm) <= line.len * 100;
    if (on === !!STATION_LAND[row.id].own)
      throw new Error(
        `layout: station ${row.id} ${on ? 'is marked own but lies on its line' : `runs past its line's end (${line.len} m) but is not marked own`}`,
      );
  }
  return rows.filter((row) => !STATION_LAND[row.id].own).map(landStation);
}
export const LINKS: LineSpec[] = [
  {
    id: 'timber',
    kind: 'wood',
    line: LINES.north,
    dir: -1,
    camp: { x: -13, z: -142, y: 30 },
    // Three on the ridge, and the last is the big one: its stretch is the trestle and the run home, and it opens the path.
    stations: onLine(LINE1_STATIONS, LINES.north),
    stops: [14, N - 14],
    freeUpTo: 2,
  },
  {
    id: 'quarry',
    kind: 'stone',
    line: LINES.east,
    dir: 1,
    camp: { x: 98, z: 52, y: 24 },
    stations: onLine(LINE2_STATIONS, LINES.east),
    stops: [17, EAST.quarry - 4, EAST.headStop],
    freeUpTo: 4,
  },
];

/** The stations' platforms (halts.ts): which line, metres along it, the platform's centre offset from the rails and the stop's
 * place in that line's `stops`. Straight boxes, so each stays on a straight stretch: dev/level/timber-track.ts checks them
 * against both lines' rails and sleepers. */
export type Halt = { name: string; line: 0 | 1; s0: number; s1: number; lat: number; stop: number; island?: boolean };
/** Layout B's two village halts are the two edges of one island: halts-view.ts builds its deck once. */
const island = (line: 0 | 1, name: string): Halt => ({ name, line, ...ISLAND_HALTS[line], stop: 0, island: true });
export const HALTS: Halt[] = [
  HOME_B ? island(0, 'Village') : { name: 'Village', line: 0, s0: 8, s1: 30, lat: -2.9, stop: 0 },
  { name: 'Camp', line: 0, s0: N - 26, s1: N - 2, lat: 2.9, stop: 1 },
  HOME_B ? island(1, 'Village, line 2') : { name: 'Village, line 2', line: 1, s0: 6, s1: 28, lat: 3.1, stop: 0 }, // 3.1: the line bends toward it
  { name: 'Quarry', line: 1, s0: EAST.quarry - 12, s1: EAST.quarry + 8, lat: 2.9, stop: 1 }, // the straight before the quarry's bend
  { name: 'Far Head', line: 1, s0: EAST.headStop - 11, s1: EAST.headStop + 11, lat: 2.9, stop: 2 },
];

/** The double formation, drawn (docs/plans/generic-lines.md, step 2; view only, trains stay on today's track): each
 * line's up track runs `UP_LAT` m left of today's (left-hand running, +s away from Home) from merge to merge, easing
 * in and out over a 20 m stub turnout at each end; line 2 also has Far Head's facing crossover, up track to down,
 * while Far Head is its end. Metres along each line. Step 4a moves the merges into the sim catalog's `RailHalt.end`. */
export const UP_LAT = -4;
export const TURNOUT = TURNOUT_CM / 100; // the sim's: its end blocks and signals reach past it
export type Formation = { from: number; to: number; crossover?: readonly [number, number] };
export const FORMATION: Record<LineSpec['id'], Formation> = {
  timber: { from: 36, to: 182 },
  quarry: { from: 34, to: 556, crossover: [490, 512] },
};
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
/** The up track's lateral offset at `s` (UP_LAT between the turnouts), or null where the line is single. */
export function upLat(f: Formation, s: number): number | null {
  if (s < f.from || s > f.to) return null;
  return UP_LAT * Math.min(ease((s - f.from) / TURNOUT), ease((f.to - s) / TURNOUT));
}
/** The crossover's lateral offset at `s`: from the up track at its start to today's track at its end; null off it. */
export function crossLat(f: Formation, s: number): number | null {
  const c = f.crossover;
  if (!c || s < c[0] || s > c[1]) return null;
  return UP_LAT * (1 - ease((s - c[0]) / (c[1] - c[0])));
}
/** The up track's platforms, outside it (a lever each, halts-view.ts; no board or signal), and the plank crossing over both
 * tracks at each pair's end (`crossS`), from today's platform to the up one. Quarry's stands clear of the Q4 frame
 * (s 175-178, 6.5-8.5 m left; orchestrator, 10 November), so it has no ramp off that end (`endRamp` false). Each
 * crossing lies outside where a train stands: Far Head's by the foot of today's platform's end ramp; Quarry's, whose
 * platforms overlap along the line, just before the up platform's start ramp, its planks running on (`crossTo`, lateral
 * metres) to that ramp's far edge so you step off the crossing onto the ramp's foot. `pair`: today's halt's row. */
export type UpHalt = {
  name: string;
  line: 1;
  s0: number;
  s1: number;
  lat: number;
  pair: number;
  crossS: number;
  crossTo?: number;
  endRamp: boolean;
};
export const UP_HALTS: UpHalt[] = [
  {
    name: 'Quarry, up',
    line: 1,
    s0: EAST.quarry - 24,
    s1: EAST.quarry - 3.5,
    lat: -6.95,
    pair: 3,
    crossS: EAST.quarry - 24 - 6 - 1.2, // the start ramp's foot (s0 - 6), less half the crossing's width
    crossTo: -6.95 - 1.25, // the ramp's far edge
    endRamp: false,
  },
  {
    name: 'Far Head, up',
    line: 1,
    s0: EAST.headStop - 11,
    s1: EAST.headStop + 11,
    lat: -6.95,
    pair: 4,
    crossS: EAST.headStop + 14.5,
    endRamp: true,
  },
];
/** A plank crossing's span across the formation, lateral metres (today's side, up side), and its width along the line.
 * Its planks lie on the sleepers, flush with the rail tops, with a flangeway beside each rail. */
export const CROSSING_SPAN = [1.5, -5.5] as const;
export const CROSSING_WIDTH = 2.4;
/** The crossing's planks as lateral spans [from, to] (from > to), given the up track's offset at the crossing's two
 * edges (they differ where it still eases out of a turnout): a flangeway beside each rail over that range. */
export function crossingPlanks(upA: number, upB = upA, to: number = CROSSING_SPAN[1]): [number, number][] {
  const hi = Math.max(upA, upB),
    lo = Math.min(upA, upB);
  const rails: [number, number][] = [
    [0.5, 0.5],
    [-0.5, -0.5],
    [hi + 0.5, lo + 0.5],
    [hi - 0.5, lo - 0.5],
  ];
  const out: [number, number][] = [];
  let from: number = CROSSING_SPAN[0];
  for (const [top, bottom] of rails) {
    if (from - (top + 0.08) > 0.05) out.push([from, top + 0.08]);
    from = bottom - 0.08;
  }
  out.push([from, to]);
  return out;
}

/** The lamps along the ridge trestle's edges, s 116 back to 60 every 7 m, 1.72 m in from each edge of the deck: on the
 * left that edge is the up track's since the second track (generic-lines step 2), so they stand outside both tracks.
 * `up` is the up track's offset at `s` (layout.ts upLat), 0 where the line is single. */
export const pathLamps = (up: (s: number) => number) => {
  const out: { s: number; l: number }[] = [];
  for (let s = 116; s >= 60; s -= 7)
    for (const side of [-1, 1]) out.push({ s, l: side * 1.72 + (side < 0 ? up(s) : 0) });
  return out;
};

/** The forge's own frame, by its north wall: logs land in it and its pieces drop. By hand first; trains finish the roof. */
export const FORGE_FRAME = { x: -88, z: -12, yaw: 0 };
/** The proper axe's stand, beside the forge frame on the hardwoods' side: the lit forge's first made thing (7 November). */
export const AXE_STAND = { x: -92.5, z: -15 };
export const FORGE_BILLS: Station[] = [
  { id: 'F1', s: 0, to: 0, side: 1, logs: 24, rails: 0, label: 'The forge' },
  { id: 'F2', s: 0, to: 0, side: 1, logs: 32, rails: 0, label: 'The forge' },
];

/** The trees you can chop. The near ones run out, and you walk further. */
export const GROVES = [
  { x: 2, z: -128, n: 5, r: 7 }, // by station 1
  { x: -42, z: -146, n: 7, r: 7 }, // by station 2
  { x: -52, z: -178, n: 8, r: 9 }, // up the ridge
  { x: 12, z: -176, n: 7, r: 9 }, // behind the camp
];
/** One old tree by the forge, for trying the new axe on the spot. */
export const OAK = { x: -74, z: -12 };
/** The great tree, on the ridge, in sight of station 3. Its trunk is station 3's main beam. */
export const GREAT_TREE = { x: -4, z: -138 };
/** Banded rocks, near station 2. */
export const ROCKS = [
  { x: 1, z: -106, r: 1.7 },
  { x: 8, z: -101, r: 1.5 },
  { x: 7, z: -110, r: 1.6 },
];
/** The telescope on the ridge that points across the sea. The buoys lead out from the Head. */
export const SCOPE = { x: -30, z: -205 };
export const BUOYS = { n: 12, gap: 62 };

// ---------------------------------------------------------------- the village's working yard, by the end of line 1
// The platform is on the forge's side of the track, and the forge stands just past where the train stops, so what your
// cargo builds fills the view as you pull in and from the platform (the owner "had to go and look for what cargo built").
export const FORGE = { x: -87, z: -3, w: 10, d: 8 };
export const CRANE = HOME_B ? PROPS.crane : { x: -80, z: 2.5 };
export const DOCK = HOME_B ? PROPS.dock : { x: -78.6, z: -1.5 }; // where crates off the train land for the crane
export const HEAP = { x: -78, z: -9.5 }; // the village's timber heap, once the forge has what it needs
export const RACK = HOME_B ? PROPS.rack : { x: -85.5, z: 5.4 }; // where the forge's rails stack
export const YARD = HOME_B ? PROPS.yard : { x: -62, z: 20 }; // where the stone lands
/** The curio shelf at the station. In A (until v24), on the forge's west wall line, square to the street and facing
 * west across it (curio placement plan, 10 November). `y`, when set, is the floor it stands on (`?home=b`: the hall's);
 * otherwise the ground. */
export const SHELF: { x: number; z: number; yaw: number; y?: number } = HOME_B
  ? SHELF_B
  : { x: -91.6, z: 8.5, yaw: -Math.PI / 2 };
/** Spawn: at the village's edge, with the path, the shelf, the forge, the stub and the gorge ahead. */
export const SPAWN = { x: -97, z: 14, yaw: -0.25 };
export const LANDING = SHORE_COAST ? SHORE_LANDING : SPAWN;

// ---------------------------------------------------------------- the town's plots
export type Plot = {
  type: 'cottage' | 'hall' | 'stone' | 'shed' | 'clock' | 'keep' | 'water' | 'stack' | 'rock' | 'block' | 'derrick';
  x: number;
  z: number;
  yaw?: number;
  w?: number;
  d?: number;
  h?: number;
  smoke?: boolean;
  tile?: boolean;
  color?: string;
  top?: string;
};
const cottage = (x: number, z: number, yaw: number, smoke = false): Plot => ({
  type: 'cottage',
  x,
  z,
  yaw,
  w: 5.4,
  d: 4.4,
  smoke,
});
/** Fewer buildings than the last round, placed for the views: the arriving train looks down the line at the great hall and
 * the clock behind it; the stone street lines the way in from the quarry. */
export const TOWN: {
  start: Plot[];
  wood: Plot[][];
  stone: Plot[][];
  camps: { asleep: Plot[]; awake: Plot[] }[];
} = {
  start: [cottage(-108, -4, 0.5, true), cottage(-123, 19, 1.6), cottage(-135, 24, 1.1, true), cottage(-139, 5, 1.5)],
  wood: [
    [
      { type: 'hall', x: -88, z: 31, w: 11, d: 8, yaw: 2.73, smoke: true },
      { type: 'hall', x: -84, z: -18, w: 7, d: 6, h: 4.2, yaw: 0.1 },
      { type: 'clock', x: -105, z: 37 },
    ],
    [
      { type: 'shed', x: -71, z: -21, w: 8, d: 6, yaw: -0.5 },
      { type: 'hall', x: -96, z: -25, w: 8, d: 6, yaw: 0.2, smoke: true },
      { type: 'water', x: -131, z: SHORE_COAST ? 17 : 8 },
    ],
  ],
  stone: [
    [
      { type: 'stone', x: -83, z: 44, w: 6, d: 6, h: 7, yaw: 0.6, smoke: true },
      { type: 'stone', x: -71, z: 47, w: 6, d: 5, h: 8, yaw: 0.5, tile: true },
      { type: 'keep', x: -89, z: 57 },
    ],
    [
      { type: 'stone', x: -74, z: 61, w: 7, d: 6, h: 10, yaw: 0.3, smoke: true },
      { type: 'stone', x: -60, z: 54, w: 6, d: 6, h: 7, yaw: 0.8, tile: true },
      { type: 'stack', x: -112, z: 50, h: 22 },
      { type: 'shed', x: -112, z: 60, w: 9, d: 7, tile: true },
    ],
  ],
  camps: [
    {
      asleep: [
        { type: 'stack', x: -3, z: -158, h: 11 },
        { type: 'shed', x: 9, z: -163, w: 6, d: 5, h: 2.6 },
      ],
      awake: [
        { type: 'shed', x: 13, z: -126, w: 12, d: 7, h: 4.5 },
        { type: 'block', x: 27.2, z: -137, w: 1.4, h: 6, d: 6, color: '#8a6a48' },
        { type: 'block', x: 32, z: -144, w: 5, h: 2.4, d: 3 },
      ],
    },
    {
      asleep: [
        { type: 'stack', x: 106, z: 7, h: 13 },
        { type: 'rock', x: 118, z: 56, w: 10, h: 9, d: 22 },
        { type: 'rock', x: 112, z: 64, w: 8, h: 4, d: 10, color: '#a8a498' },
      ],
      awake: [
        { type: 'derrick', x: 100, z: 62 },
        { type: 'shed', x: 76, z: 50, w: 10, d: 7, h: 5, tile: true },
        { type: 'block', x: 84, z: 58, w: 5, h: 2.2, d: 4, color: '#b2ad9f' },
        { type: 'stone', x: 108, z: 54, w: 7, d: 6, h: 7 },
      ],
    },
  ],
};
/** The buildings you can walk into (./rooms.ts). Their doors are local +z, so `yaw` turns each door to face the street. Sizes
 * are the outside; docs/research/town-interiors.md, "How little room is enough?". */
export type RoomId = 'house' | 'shop' | 'museum';
export const ROOM_PLOTS: Record<RoomId, { x: number; z: number; yaw: number; w: number; d: number; high: number }> = {
  house: { x: -114, z: 11, yaw: 1.42, w: 7.4, d: 7.4, high: 3.7 },
  shop: { x: -116, z: 31, yaw: 2.05, w: 10, d: 8, high: 3.9 },
  museum: { x: -125, z: -8, yaw: 0.97, w: 13, d: 12, high: 5 },
};
/** What stands across the sea: too far to reach, north-east of the ridge. */
export const FAR = { x: 330, z: -1120 };
