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
  cost: 24, // logs one track segment takes
  segments: 3, // per link
  bundleTake: 8, // logs on your back from one press at a bundle: the room's hard cap until a link is open
  depotTake: 24, // logs from one press at a depot: a whole segment
  crateLogs: 8,
  depotCrates: 9,
  layS: 7, // s the machine takes per segment
  cruise: 12, // m/s
  accel: 3.5, // m/s²
  dwell: 5, // s at each end
  stopIn: 14, // m from each end of a line to where the train stands
  pileEvery: 1.6, // s per crate a working camp makes
  pileMax: 14,
  stepAt: [6, 16], // crates of a kind at the village for its first and second step-up
  ringR: 3.2,
  cableSpeed: 20, // m/s, crates on the depot's cable
};

export type Pt = [x: number, z: number, y: number];
export const SPIRE = { x: 8, z: -10, h: 105 };

// The gorge: rays from the spire, bearings in degrees clockwise from north.
export const ARMS = { nw: -38, ne: 16, stem: -164 };
export const GORGE = { river: 4.5, bank: 12.5, wall: 3, floor: 1.3, bed: -2.2 };

/** The lobes' top: the west commons (the village), the north ridge (55 m), the east table. */
export const LOBE = { west: 18, north: 30, east: 24 };

export const VILLAGE = { x: -100, z: 14, y: 18, r: 42 };

export type Foot = { pts: Pt[]; bridgeAt: number };
// `bridgeAt`: the path's segment from pts[bridgeAt] to pts[bridgeAt + 1] is a low footbridge, not ground.
export const PATHS: Foot[] = [
  {
    // To the timber camp: north along the commons, past a lookout on the rim, down the wall to the river under where
    // the trestle will go, over the bridge, then up the far wall and round the shoulder of the ridge.
    pts: [
      [-105, 15, 18],
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
      [-20, -160, 30],
      [-13, -140, 30],
    ],
    bridgeAt: 6,
  },
  {
    // To the quarry: south along the commons, down to the bank behind a shoulder, over the bridge with the spire up the
    // gorge, then up the far wall and along the table's edge.
    pts: [
      [-105, 15, 18],
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
};
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
function makeLine(pts: [number, number][], y0: number, y1: number): Line {
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
  return { xs: Float32Array.from(xs), zs: Float32Array.from(zs), len: (xs.length - 1) * STEP, y0, y1 };
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
export const railY = (l: Line, s: number) =>
  l.y0 + (l.y1 - l.y0) * smoothstep(TUNE.stopIn * 2, l.len - TUNE.stopIn * 2, s);

export const LINES = {
  north: makeLine(
    [
      [-82, 12], // straight for its first 36 m: the platform is one straight box
      [-70, -2],
      [-58, -16],
      [-46, -36],
      [-38, -60],
      [-30, -90],
      [-20, -112],
      [-14, -130],
    ],
    18.3,
    30.3,
  ),
  east: makeLine(
    [
      [-70, 30],
      [-60, 32],
      [-25, 28],
      [8, 30],
      [45, 38],
      [75, 38],
      [88, 36],
    ],
    18.3,
    24.3,
  ),
};

// ---------------------------------------------------------------- the two links
export type LinkSpec = {
  id: 'timber' | 'quarry';
  kind: 'wood' | 'stone';
  line: Line;
  camp: { x: number; z: number; y: number };
  stake: { x: number; z: number };
  ring: { x: number; z: number };
  bundles: { x: number; z: number }[];
  depot: { x: number; z: number };
};
export const LINKS: LinkSpec[] = [
  {
    id: 'timber',
    kind: 'wood',
    line: LINES.north,
    camp: { x: -13, z: -142, y: 30 },
    stake: { x: -30, z: -118 },
    ring: { x: -38, z: -106 }, // at the rim: you haul with the trestle going up beside you
    bundles: [
      { x: -44, z: -128 },
      { x: -56, z: -132 },
      { x: -30, z: -134 },
      { x: -22, z: -132 },
    ],
    depot: { x: -46, z: -118 },
  },
  {
    id: 'quarry',
    kind: 'stone',
    line: LINES.east,
    camp: { x: 98, z: 52, y: 24 },
    stake: { x: 62, z: 50 },
    ring: { x: 38, z: 50 }, // toward the rim, as on the ridge
    bundles: [
      { x: 60, z: 66 },
      { x: 38, z: 78 },
      { x: 16, z: 66 },
      { x: 12, z: 46 },
    ],
    depot: { x: 50, z: 62 },
  },
];

/** Where crates land at the village, and where the depots' cable starts. */
export const HEAP = { x: -66, z: 13 };
/** Spawn: at the village's edge, with both smoke columns and the spire across the gorge. */
export const SPAWN = { x: -90, z: 9, yaw: -1.05 };
