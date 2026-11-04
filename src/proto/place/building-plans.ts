// Shared construction plans with explicit ground height, no world or game lifecycle.
import * as THREE from 'three/webgpu';
import { boxAt, place, type Box } from '../net/box-plan.ts';
// ---------------------------------------------------------------- the plan of a building
export type Hull = { dx: number; dy: number; dz: number; hx: number; hy: number; hz: number; room?: boolean };
export type Plan = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scaffold: Box[];
  pieces: Box[];
  FRAME: number; // pieces[0..FRAME) are the frame, up to WALLS the walls, up to ROOFED the roof, the rest the chimney or top
  WALLS: number;
  ROOFED: number;
  hulls: Hull[];
  /** What you're moved out of if it goes up around you, when that isn't `hulls[0]` (a hollow building's whole footprint). */
  keepOut?: Hull;
  poles: Hull[]; // the scaffold's corner poles and walkway: solid while they stand
  hw: number;
  hd: number;
  smoke: { x: number; y: number; z: number } | null;
  top: { x: number; y: number; z: number };
};
type Parter = (
  dx: number,
  dy: number,
  dz: number,
  w: number,
  h: number,
  d: number,
  color: string,
  tilt?: THREE.Euler,
) => Box;
function parter(x: number, y: number, z: number, yaw: number): Parter {
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  return (dx, dy, dz, w, h, d, color, tilt) => {
    const b = boxAt(x + dx * cos + dz * sin, y, z - dx * sin + dz * cos, place(0, dy, 0, w, h, d, yaw, tilt), color);
    b.y = y;
    return b;
  };
}
const POLE = '#c9a86a',
  PLANK = '#a9824f';
function poles(part: Parter, w: number, d: number, top: number, every: number) {
  const out: Box[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) out.push(part((sx * (w + 1.4)) / 2, 0, (sz * (d + 1.4)) / 2, 0.22, top, 0.22, POLE));
  for (let y = every; y < top - 0.5; y += every)
    for (const s of [-1, 1]) {
      out.push(part(0, y, (s * (d + 1.4)) / 2, w + 1.6, 0.14, 0.14, POLE));
      out.push(part((s * (w + 1.4)) / 2, y, 0, 0.14, 0.14, d + 1.6, POLE));
    }
  // A walkway along the front, where the little guys hammer.
  out.push(part(0, every + 0.14, (d + 1.4) / 2, w + 1.4, 0.08, 0.7, PLANK));
  return out;
}
/** The solid part of `poles`. */
function poleHulls(w: number, d: number, top: number, every: number): Hull[] {
  const out: Hull[] = [];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      out.push({ dx: (sx * (w + 1.4)) / 2, dy: top / 2, dz: (sz * (d + 1.4)) / 2, hx: 0.13, hy: top / 2, hz: 0.13 });
  out.push({ dx: 0, dy: every + 0.18, dz: (d + 1.4) / 2, hx: (w + 1.4) / 2, hy: 0.06, hz: 0.35 });
  return out;
}
export type HouseSpec = {
  x: number;
  z: number;
  yaw?: number;
  w: number;
  d: number;
  high: number; // to the wall tops
  rise: number;
  wall: string;
  post: string;
  roof: string;
  /** A gap in the +z wall. */
  door?: { w: number; rows: number };
  /** The forge's stands open. */
  closed?: boolean;
  windows?: string;
  chimney?: { dx: number; dz: number; n: number; a: string; b: string };
  rowH?: number;
  poleTop?: number;
  /** How high its slab stands; a building you walk into has a low one. */
  floor?: number;
};
const FLOOR = 0.5;
/** The forge's build, for any house: a frame, walls by rows, a roof by boards, then a chimney, in that order. */
export function housePlan(s: HouseSpec, ground: number): Plan {
  const { x, z, w, d, high, rise, wall, post, roof } = s;
  const floor = s.floor ?? FLOOR;
  const yaw = s.yaw ?? 0,
    y = ground,
    part = parter(x, y, z, yaw);
  const pieces: Box[] = [];
  const postsZ = Math.max(1, Math.round(w / 5)),
    postsX = Math.max(1, Math.round(d / 4));
  for (let k = 0; k <= postsZ; k++) {
    const px = -w / 2 + (k * w) / postsZ;
    pieces.push(part(px, floor, -d / 2, 0.42, high - floor, 0.42, post));
    if (!s.door || Math.abs(px) > s.door.w / 2) pieces.push(part(px, floor, d / 2, 0.42, high - floor, 0.42, post));
  }
  if (s.door)
    for (const sx of [-1, 1])
      pieces.push(part((sx * s.door.w) / 2 + sx * 0.2, floor, d / 2, 0.42, high - floor, 0.42, post));
  for (let k = 1; k < postsX; k++)
    for (const sx of [-1, 1])
      pieces.push(part((sx * w) / 2, floor, -d / 2 + (k * d) / postsX, 0.42, high - floor, 0.42, post));
  for (const sz of [-1, 1]) pieces.push(part(0, high, (sz * d) / 2, w + 0.5, 0.36, 0.42, post));
  for (const sx of [-1, 1]) pieces.push(part((sx * w) / 2, high, 0, 0.42, 0.36, d + 0.4, post));
  const FRAME = pieces.length;
  // Walls, a row at a time, going round.
  const rowH = s.rowH ?? 0.82,
    rows = Math.round((high - floor) / rowH),
    h = (high - floor) / rows;
  const boardsW = Math.max(2, Math.round(w / 2.5)),
    boardsD = Math.max(1, Math.round(d / 4));
  for (let row = 0; row < rows; row++) {
    const yy = floor + row * h;
    const off = s.floor === undefined ? (row % 2) * 0.3 : 0; // courses overlap, so it reads as built; a room has to be shut
    for (let k = 0; k < boardsW; k++) {
      const bw = w / boardsW;
      pieces.push(
        part(-w / 2 + (k + 0.5) * bw + (k === 0 || k === boardsW - 1 ? 0 : off), yy, -d / 2, bw, h, 0.18, wall),
      );
    }
    for (let k = 0; k < boardsD; k++) {
      const bd = d / boardsD;
      for (const sx of [-1, 1]) pieces.push(part((sx * w) / 2, yy, -d / 2 + (k + 0.5) * bd, 0.18, h, bd, wall));
    }
    const gap = s.door && row < s.door.rows ? s.door.w : 0;
    if (gap) {
      const side = (w - gap) / 2;
      for (const sx of [-1, 1]) pieces.push(part((sx * (gap + side)) / 2, yy, d / 2, side, h, 0.18, wall));
    } else
      for (let k = 0; k < boardsW; k++) {
        const bw = w / boardsW;
        pieces.push(part(-w / 2 + (k + 0.5) * bw, yy, d / 2, bw, h, 0.18, wall));
      }
  }
  if (s.windows) {
    const wy = floor + (high - floor) * 0.42;
    for (const sx of [-1, 1]) {
      pieces.push(part(sx * (w / 2 + 0.04), wy, 0, 0.14, 1, Math.min(1.3, d * 0.3), s.windows));
      pieces.push(part(sx * (w / 2 + 0.08), wy - 0.08, 0, 0.14, 0.08, Math.min(1.6, d * 0.34), post));
      if (w > 5) {
        pieces.push(part(sx * w * 0.27, wy, d / 2 + 0.04, 1.1, 1, 0.14, s.windows));
        pieces.push(part(sx * w * 0.27, wy - 0.08, d / 2 + 0.08, 1.4, 0.08, 0.14, post));
      }
    }
  }
  if (s.door && s.closed !== false)
    pieces.push(part(0, floor, d / 2 - 0.02, s.door.w, s.door.rows * h, 0.1, '#5c3a20'));
  const WALLS = pieces.length;
  // Gable ends, then boards up each slope, then the ridge.
  const eave = d / 2 + 0.5,
    slope = Math.hypot(rise, eave),
    tilt = Math.atan2(rise, eave);
  for (const sx of [-1, 1])
    for (let k = 0; k < 3; k++)
      pieces.push(part((sx * w) / 2, high + 0.3 + (k * rise) / 3, 0, 0.16, rise / 3, d * (1 - (k + 0.5) / 3), wall));
  const boards = Math.max(3, Math.round((w + 0.8) / 1.7));
  for (let k = 0; k < boards; k++) {
    const dx = -w / 2 - 0.4 + ((k + 0.5) * (w + 0.8)) / boards;
    for (const sz of [-1, 1])
      pieces.push(
        part(
          dx,
          high + 0.36 + rise / 2,
          (sz * eave) / 2,
          (w + 0.8) / boards + 0.02,
          0.16,
          slope,
          roof,
          new THREE.Euler(sz * tilt, 0, 0),
        ),
      );
  }
  pieces.push(part(0, high + 0.3 + rise, 0, w + 1, 0.26, 0.44, post));
  const ROOFED = pieces.length;
  let smoke: Plan['smoke'] = null;
  if (s.chimney) {
    const c = s.chimney;
    const start = Math.max(floor, high - 1.4);
    for (let k = 0; k < c.n; k++) pieces.push(part(c.dx, start + k, c.dz, 1.15, 1, 1.15, k % 2 ? c.a : c.b));
    const cos = Math.cos(yaw),
      sin = Math.sin(yaw);
    smoke = { x: x + c.dx * cos + c.dz * sin, y: y + start + c.n, z: z - c.dx * sin + c.dz * cos };
  }
  return {
    x,
    y,
    z,
    yaw,
    scaffold: [
      part(0, -1, 0, w + 1.6, floor + 1, d + 1.6, '#b2ad9f'),
      ...poles(part, w, d, s.poleTop ?? high + rise + 0.8, 1.8),
    ],
    pieces,
    FRAME,
    WALLS,
    ROOFED,
    hulls: [
      { dx: 0, dy: high / 2, dz: 0, hx: w / 2 + 0.1, hy: high / 2, hz: d / 2 + 0.1 },
      { dx: 0, dy: high + rise * 0.3, dz: 0, hx: w / 2, hy: rise * 0.3, hz: (d / 2) * 0.7 },
      { dx: 0, dy: floor / 2, dz: 0, hx: w / 2 + 0.8, hy: floor / 2, hz: d / 2 + 0.8 },
    ],
    poles: poleHulls(w, d, s.poleTop ?? high + rise + 0.8, 1.8),
    hw: w / 2 + 0.8,
    hd: d / 2 + 0.8,
    smoke,
    top: { x, y: y + high + rise, z },
  };
}
export type TowerSpec = {
  x: number;
  z: number;
  w: number;
  high: number;
  course: number;
  a: string;
  b: string;
  /** Stacked on top: each a block `w` wide and `h` high. */
  tops: { w: number; h: number; color: string }[];
};
/** A landmark: posts in lengths, courses going round, then what crowns it. */
export function towerPlan(s: TowerSpec, ground: number): Plan {
  const { x, z, w, high, course, a, b } = s;
  const y = ground,
    part = parter(x, y, z, 0);
  const pieces: Box[] = [];
  const lengths = Math.ceil(high / 6);
  for (let k = 0; k < lengths; k++)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        pieces.push(part((sx * w) / 2, FLOOR + k * 6, (sz * w) / 2, 0.5, Math.min(6, high - FLOOR - k * 6), 0.5, b));
  const FRAME = pieces.length;
  const rows = Math.round((high - FLOOR) / course);
  for (let row = 0; row < rows; row++) {
    const yy = FLOOR + row * course,
      c = row % 2 ? a : b;
    pieces.push(part(0, yy, -w / 2, w + 0.2, course, 0.3, c));
    pieces.push(part(w / 2, yy, 0, 0.3, course, w + 0.2, c));
    pieces.push(part(0, yy, w / 2, w + 0.2, course, 0.3, c));
    pieces.push(part(-w / 2, yy, 0, 0.3, course, w + 0.2, c));
  }
  const WALLS = pieces.length;
  let yy = high;
  for (const t of s.tops) {
    pieces.push(part(0, yy, 0, t.w, t.h, t.w, t.color));
    yy += t.h;
  }
  return {
    x,
    y,
    z,
    yaw: 0,
    scaffold: [part(0, -1, 0, w + 2.4, FLOOR + 1, w + 2.4, '#b2ad9f'), ...poles(part, w, w, high + 2, 2.6)],
    pieces,
    FRAME,
    WALLS,
    ROOFED: pieces.length,
    hulls: [{ dx: 0, dy: yy / 2, dz: 0, hx: w / 2 + 0.2, hy: yy / 2, hz: w / 2 + 0.2 }],
    poles: poleHulls(w, w, high + 2, 2.6),
    hw: w / 2 + 1,
    hd: w / 2 + 1,
    smoke: null,
    top: { x, y: y + yy, z },
  };
}
export type BlockSpec = {
  x: number;
  z: number;
  y?: number;
  yaw?: number;
  w: number;
  h: number;
  d: number;
  color: string;
};
/** Something plain and solid that drops in whole, in a few pieces: a log stack, a quarry face, a kiln's stack. */
export function blockPlan(s: BlockSpec, ground: number, lifts = 1, top?: string): Plan {
  const yaw = s.yaw ?? 0,
    y = ground,
    part = parter(s.x, y, s.z, yaw);
  const pieces: Box[] = [];
  const rowH = s.h / lifts,
    y0 = s.y ?? 0;
  for (let k = 0; k < lifts; k++) pieces.push(part(0, y0 + k * rowH, 0, s.w, rowH, s.d, s.color));
  if (top) pieces.push(part(0, y0 + s.h, 0, s.w + 0.6, 0.5, s.d + 0.6, top));
  return {
    x: s.x,
    y,
    z: s.z,
    yaw,
    scaffold: [],
    pieces,
    FRAME: 0,
    WALLS: pieces.length,
    ROOFED: pieces.length,
    hulls: [{ dx: 0, dy: y0 + s.h / 2, dz: 0, hx: s.w / 2, hy: s.h / 2, hz: s.d / 2 }],
    poles: [],
    hw: s.w / 2 + 0.4,
    hd: s.d / 2 + 0.4,
    smoke: null,
    top: { x: s.x, y: y + y0 + s.h, z: s.z },
  };
}
