// The map of ?proto=place: a slice of Threefold Reach (.look/previz/home-redesign/board.md, section 3), authored in one
// table so a change of mind is a change of numbers. All coordinates are metres relative to ORIGIN, north is -z. The
// gorge is three straight arms from the spire's islet with a slight wiggle; the lobes' heights meet along those rays, and
// the walls hide the seam. Foot paths are polylines with explicit heights; rail lines are curves with explicit ends.
// docs/research/big-walk-level-design.md, sections 5 and 9, recs 5-7 and 10. Local: nothing here reaches the sim.
import { smoothstep } from '../../math.ts';

/** Far from today's island, past its soft wall, as the crossing does. */
export const ORIGIN = { x: 1000, z: 0 };
export const toWorld = (x: number) => x + ORIGIN.x;

export const TUNE = {
  carry: 12, // pieces on your back
  strokes: 3, // chops to fell a tree
  logsPerStroke: 4,
  swingS: 0.24, // s before the next chop can start
  contactS: 0.06, // s from the press to the axe meeting the bark
  flyS: 0.26, // s a log takes from the bark to your back
  unloadS: 0.09, // s between pieces leaving your back at a station
  feedS: 0.07, // s between pieces rolling from a frame into the machine
  laySpeed: 5, // m/s the machine lays at
  runSpeed: 7, // m/s it runs over track that's already there, into the village
  turnS: 2.6, // s on the turntable
  cruise: 12, // m/s, trains
  accel: 3.5, // m/s²
  dwell: 5, // s at each end
  stopIn: 14, // m from each end of a line to where the train stands
  deckCrates: 8, // what a train carries: its capacity, the number on the board
  pileEvery: 1.4, // s per crate a working camp makes
  pileMax: 14,
  forgeCost: 12, // crates of timber the forge takes
  forgePieces: 4, // pieces each crate adds
  craneS: 1.5, // s the crane takes per crate
  railEvery: 0.9, // s per rail the lit forge pours
  rackMax: 24,
  rackStart: 12, // rails on the machine's own rack, for line 1
  crateLogs: 6, // logs a crate on the village heap gives
  people: 12, // the village's population at the start
  stepAt: [6, 16], // crates of a kind at the village for its first and second step-up
  reachStation: 3.6, // m from a frame's middle where your back unloads
};

export type Pt = [x: number, z: number, y: number];
export const SPIRE = { x: 8, z: -10, h: 105 };

// The gorge: rays from the spire, bearings in degrees clockwise from north.
export const ARMS = { nw: -38, ne: 16, stem: -164 };
export const GORGE = { river: 4.5, bank: 12.5, wall: 3, floor: 1.3, bed: -2.2 };

/** The lobes' top: the west commons (the village), the north ridge (55 m), the east table. */
export const LOBE = { west: 18, north: 30, east: 24 };

export const VILLAGE = { x: -100, z: 14, y: 18, r: 42 };

export type Foot = { pts: Pt[]; bridgeAt: number; bold: boolean };
// `bridgeAt`: the path's segment from pts[bridgeAt] to pts[bridgeAt + 1] is a low footbridge, not ground. `bold`: the way
// you're sent first, wide and strong from your feet at spawn.
export const PATHS: Foot[] = [
  {
    // To the timber camp: straight out of the village from where you stand, then north along the commons, past a lookout
    // on the rim, down the wall to the river under where the trestle will go, over the bridge, then up the far wall and
    // round the shoulder of the ridge to the machine.
    pts: [
      [-97, 8, 18],
      [-94, -6, 18],
      [-100, -14, 18],
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
      [-97, 8, 18],
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
export const TURNTABLE = { x: -82, z: 12, r: 4.8 };
export const LINES = {
  north: makeLine(
    [
      [TURNTABLE.x, TURNTABLE.z], // straight for its first 36 m: the platform is one straight box
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
      [TURNTABLE.x, TURNTABLE.z],
      [-70, 24],
      [-58, 36],
      [-40, 38],
      [-15, 30],
      [8, 30],
      [45, 38],
      [75, 38],
      [88, 36],
    ],
    18.3,
    24.3,
    [72, 112],
  ),
};

// ---------------------------------------------------------------- the lines' stations
export type Station = {
  s: number; // along the line: where the laid track ends when this station's turn comes
  to: number; // how far along the line this station's stretch lays
  side: number; // which side of the track its frame stands
  logs: number; // what it needs
  rails: number;
  label: string;
};
export type LineSpec = {
  id: 'timber' | 'quarry';
  kind: 'wood' | 'stone';
  line: Line;
  dir: 1 | -1; // which way along the line the machine lays
  camp: { x: number; z: number; y: number };
  stations: Station[];
};
const N = LINES.north.len,
  E = LINES.east.len;
/** Where the track is already down at each end of line 1; line 2 has a few metres off the turntable. */
export const STUB = { camp: N - 30, village: 30, east: 7 };
export const LINKS: LineSpec[] = [
  {
    id: 'timber',
    kind: 'wood',
    line: LINES.north,
    dir: -1,
    camp: { x: -13, z: -142, y: 30 },
    stations: [
      { s: STUB.camp, to: 116, side: 1, logs: 24, rails: 0, label: 'Station 1' },
      { s: 116, to: 62, side: 1, logs: 24, rails: 0, label: 'Station 2' },
      { s: 62, to: STUB.village, side: 1, logs: 24, rails: 0, label: 'Station 3' },
    ],
  },
  {
    id: 'quarry',
    kind: 'stone',
    line: LINES.east,
    dir: 1,
    camp: { x: 98, z: 52, y: 24 },
    stations: [
      { s: STUB.east, to: 42, side: -1, logs: 8, rails: 4, label: 'Line 2, station 1' },
      { s: 42, to: 122, side: -1, logs: 8, rails: 8, label: 'Line 2, station 2' },
      { s: 122, to: E - 1, side: -1, logs: 4, rails: 8, label: 'Line 2, station 3' },
    ],
  },
];

/** The trees you can chop: a grove by station 1, and one by the rim for stations 2 and 3. */
export const GROVES = [
  { x: 8, z: -120, n: 7, r: 9 },
  { x: -13, z: -100, n: 9, r: 8 },
];

// ---------------------------------------------------------------- the village's working yard, by the end of line 1
export const FORGE = { x: -86, z: -14, w: 10, d: 8 };
export const CRANE = { x: -80, z: -3 };
export const DOCK = { x: -79.6, z: 1 }; // where crates off the train land for the crane
export const HEAP = { x: -88, z: 3 }; // the village's timber heap, once the forge has what it needs
export const RACK = { x: -85.5, z: -5 }; // where the forge's rails stack
export const YARD = { x: -62, z: 20 }; // where the stone lands
/** Spawn: at the village's edge, with the path, the sign, the forge, the stub and the gorge ahead. */
export const SPAWN = { x: -97, z: 14, yaw: -0.25 };
/** What stands across the sea: too far to reach, north-east of the ridge. */
export const FAR = { x: 330, z: -1120 };
