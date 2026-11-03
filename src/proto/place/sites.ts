// How anything gets built in ?proto=place: the forge's way, for every building. Bare poles first, then a frame, walls row by
// row, a roof board by board and a chimney, each piece falling into place with a thud, and only then do the poles come down.
// Nothing scales up. docs/proposals/boogle-2.md, "construction is physical" and "town buildings get scaffolding and are
// solid"; docs/research/growing-towns.md (8-10 s for an ordinary addition, the longest for the landmark). Every building's
// pieces share one instanced mesh, so a town costs one draw. Local.
import * as THREE from 'three/webgpu';
import { thump } from '../../render/machine-sfx.ts';
import { PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { removeBody, teleport, type Body } from '../../physics/engine.ts';
import { box, place, type Box } from '../net/boxes.ts';
import { H, addStatic } from './land.ts';
import { boardMaterial } from './look.ts';
import { dropSet, dustRing, type DropSet } from './pieces.ts';

// ---------------------------------------------------------------- the plan of a building
export type Hull = { dx: number; dy: number; dz: number; hx: number; hy: number; hz: number };
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
    const b = box(x + dx * cos + dz * sin, z - dx * sin + dz * cos, place(0, dy, 0, w, h, d, yaw, tilt), color);
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
};
const FLOOR = 0.5;
/** The forge's build, for any house: a frame, walls by rows, a roof by boards, then a chimney, in that order. */
export function housePlan(s: HouseSpec): Plan {
  const { x, z, w, d, high, rise, wall, post, roof } = s;
  const yaw = s.yaw ?? 0,
    y = H(x, z),
    part = parter(x, y, z, yaw);
  const pieces: Box[] = [];
  const postsZ = Math.max(1, Math.round(w / 5)),
    postsX = Math.max(1, Math.round(d / 4));
  for (let k = 0; k <= postsZ; k++) {
    const px = -w / 2 + (k * w) / postsZ;
    pieces.push(part(px, FLOOR, -d / 2, 0.42, high - FLOOR, 0.42, post));
    if (!s.door || Math.abs(px) > s.door.w / 2) pieces.push(part(px, FLOOR, d / 2, 0.42, high - FLOOR, 0.42, post));
  }
  if (s.door)
    for (const sx of [-1, 1])
      pieces.push(part((sx * s.door.w) / 2 + sx * 0.2, FLOOR, d / 2, 0.42, high - FLOOR, 0.42, post));
  for (let k = 1; k < postsX; k++)
    for (const sx of [-1, 1])
      pieces.push(part((sx * w) / 2, FLOOR, -d / 2 + (k * d) / postsX, 0.42, high - FLOOR, 0.42, post));
  for (const sz of [-1, 1]) pieces.push(part(0, high, (sz * d) / 2, w + 0.5, 0.36, 0.42, post));
  for (const sx of [-1, 1]) pieces.push(part((sx * w) / 2, high, 0, 0.42, 0.36, d + 0.4, post));
  const FRAME = pieces.length;
  // Walls, a row at a time, going round.
  const rowH = s.rowH ?? 0.82,
    rows = Math.round((high - FLOOR) / rowH),
    h = (high - FLOOR) / rows;
  const boardsW = Math.max(2, Math.round(w / 2.5)),
    boardsD = Math.max(1, Math.round(d / 4));
  for (let row = 0; row < rows; row++) {
    const yy = FLOOR + row * h;
    const off = (row % 2) * 0.3; // courses overlap, so it reads as built
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
    const wy = FLOOR + (high - FLOOR) * 0.42;
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
    pieces.push(part(0, FLOOR, d / 2 - 0.02, s.door.w, s.door.rows * h, 0.1, '#5c3a20'));
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
    const start = Math.max(FLOOR, high - 1.4);
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
      part(0, -1, 0, w + 1.6, FLOOR + 1, d + 1.6, '#b2ad9f'),
      ...poles(part, w, d, s.poleTop ?? high + rise + 0.8, 1.8),
    ],
    pieces,
    FRAME,
    WALLS,
    ROOFED,
    hulls: [
      { dx: 0, dy: high / 2, dz: 0, hx: w / 2 + 0.1, hy: high / 2, hz: d / 2 + 0.1 },
      { dx: 0, dy: high + rise * 0.3, dz: 0, hx: w / 2, hy: rise * 0.3, hz: (d / 2) * 0.7 },
      { dx: 0, dy: FLOOR / 2, dz: 0, hx: w / 2 + 0.8, hy: FLOOR / 2, hz: d / 2 + 0.8 },
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
export function towerPlan(s: TowerSpec): Plan {
  const { x, z, w, high, course, a, b } = s;
  const y = H(x, z),
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
export function blockPlan(s: BlockSpec, lifts = 1, top?: string): Plan {
  const yaw = s.yaw ?? 0,
    y = H(s.x, s.z),
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

// ---------------------------------------------------------------- where people can't walk
export type Foot = { x: number; z: number; c: number; s: number; hw: number; hd: number };
/** Every footprint in the place, for the little guys to walk round. */
export const feet: Foot[] = [];
export const addFoot = (x: number, z: number, yaw: number, hw: number, hd: number) =>
  void feet.push({ x, z, c: Math.cos(yaw), s: Math.sin(yaw), hw, hd });
/** Moves a point out of a footprint it's in, by the shortest way. True if it had to. */
export function outOf(f: Foot, p: { x: number; z: number }, r: number) {
  const dx = p.x - f.x,
    dz = p.z - f.z;
  const lx = dx * f.c - dz * f.s,
    lz = dx * f.s + dz * f.c;
  const ax = f.hw + r - Math.abs(lx),
    az = f.hd + r - Math.abs(lz);
  if (ax <= 0 || az <= 0) return false;
  const nx = ax < az ? lx + Math.sign(lx || 1) * ax : lx,
    nz = ax < az ? lz : lz + Math.sign(lz || 1) * az;
  p.x = f.x + nx * f.c + nz * f.s;
  p.z = f.z - nx * f.s + nz * f.c;
  return true;
}

// ---------------------------------------------------------------- building them, all in one mesh
type Span = [from: number, to: number, seconds: number];
export type Site = {
  plan: Plan;
  k0: number; // its scaffold starts here in the shared mesh
  k1: number;
  pole1: number; // the scaffold ends here
  spans: Span[];
  bodies: Body[];
  poleBodies: Body[];
  state: 'none' | 'building' | 'done';
  t: number;
  solidAt: number;
  doneAt: number;
  struck: number;
  onDone: (() => void) | null;
  id: string;
};
const boxes: Box[] = [];
export const sites: Site[] = [];
let set: DropSet | null = null;
export function addSite(id: string, plan: Plan, pace = 1): Site {
  const k0 = boxes.length;
  boxes.push(...plan.scaffold);
  const pole1 = boxes.length;
  boxes.push(...plan.pieces);
  const a = pole1 + plan.FRAME,
    b = pole1 + plan.WALLS,
    c = pole1 + plan.ROOFED,
    e = boxes.length;
  const spans: Span[] = [
    [k0, pole1, 1 * pace],
    [pole1, a, 1.5 * pace],
    [a, b, 3.6 * pace],
    [b, c, 2.2 * pace],
    [c, e, 0.8 * pace],
  ];
  const site: Site = {
    plan,
    k0,
    k1: e,
    pole1,
    spans,
    bodies: [],
    poleBodies: [],
    state: 'none',
    t: 0,
    solidAt: (1 + 1.5) * pace,
    doneAt: spans.reduce((t, q) => t + q[2], 0) + 0.3,
    struck: 0,
    onDone: null,
    id,
  };
  addFoot(plan.x, plan.z, plan.yaw, plan.hw, plan.hd);
  sites.push(site);
  return site;
}
let landed = 0;
function onLand(k: number) {
  const b = boxes[k]!;
  if (landed++ % 3 === 0) thump(b.x, b.z);
  if (landed % 4 === 0) dustRing(b.x, b.y + 0.3, b.z, 4, 1.8, 0.3);
}
/** Solid boxes from a plan's hulls. */
export function hullBodies(plan: Plan, hulls: Hull[]) {
  const { x, y, z, yaw } = plan;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  return hulls.map((h) =>
    addStatic(
      { kind: 'box', hx: h.hx, hy: h.hy, hz: h.hz },
      { x: x + h.dx * cos + h.dz * sin, y: y + h.dy, z: z - h.dx * sin + h.dz * cos },
      q,
    ),
  );
}
const polesOff = (site: Site) => {
  for (const b of site.poleBodies) removeBody(b);
  site.poleBodies.length = 0;
};
function solid(site: Site, on: boolean) {
  if (!on) {
    for (const b of site.bodies) removeBody(b);
    site.bodies.length = 0;
    return;
  }
  if (site.bodies.length) return;
  const { x, y, z, yaw, hulls } = site.plan;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  site.bodies.push(...hullBodies(site.plan, hulls));
  if (site.state === 'building') site.poleBodies.push(...hullBodies(site.plan, site.plan.poles));
  // Standing in the plot when the walls go up: you're moved to the nearest edge.
  const me_ = me.body;
  if (!me_) return;
  const pos = { x: me_.position.x, z: me_.position.z };
  const f: Foot = { x, z, c: cos, s: sin, hw: hulls[0]!.hx, hd: hulls[0]!.hz };
  if (me_.position.y < y + hulls[0]!.hy * 2 && outOf(f, pos, PLAYER_R + 0.2)) {
    teleport(me_, pos.x, H(pos.x, pos.z) + PLAYER_R + 0.2, pos.z);
    me_.velocity.set(0, 0, 0);
  }
}
/** Call once, after every addSite. */
export function buildSites() {
  set = dropSet(boxes, onLand);
  set.mesh.material = boardMaterial(set.mesh.material as THREE.Material);
}
/** The pieces fall in order, starting after `delay` s. */
export function startSite(site: Site, delay = 0, onDone?: () => void) {
  if (site.state !== 'none' || !set) return;
  site.state = 'building';
  site.t = -delay;
  site.struck = 0;
  site.onDone = onDone ?? null;
  let at = delay;
  for (const [a, b, secs] of site.spans) {
    for (let k = a; k < b; k++) set.drop(k, 3.2, at + ((k - a) / Math.max(1, b - a)) * secs);
    at += secs;
  }
}
/** Start over: nothing's in the air. */
export const clearDrops = () => set?.clear();
/** There or not, with no show. */
export function snapSite(site: Site, on: boolean) {
  if (!set) return;
  for (let k = site.k0; k < site.k1; k++) set.snap(k, on && (k >= site.pole1 || k === site.k0));
  site.state = on ? 'done' : 'none';
  site.onDone = null;
  polesOff(site);
  solid(site, on);
}
const building: Site[] = [];
/** Who's being built right now, for the little guys to hammer at. */
export const underway = () => building;
export function updateSites(dt: number) {
  if (!set) return;
  set.update(dt);
  building.length = 0;
  for (const site of sites) {
    if (site.state !== 'building') continue;
    site.t += dt;
    if (site.t >= 0) building.push(site);
    if (site.t >= site.solidAt) solid(site, true);
    if (site.t < site.doneAt) continue;
    // The poles come down, top first, and the slab stays.
    polesOff(site);
    const want = Math.ceil((site.t - site.doneAt) * 40);
    for (let k = site.pole1 - 1 - site.struck; k > site.k0 && site.struck < want; k--) {
      set.snap(k, false);
      site.struck++;
      if (site.struck % 5 === 0) dustRing(boxes[k]!.x, boxes[k]!.y + 0.3, boxes[k]!.z, 3, 1.4, 0.3);
    }
    if (site.k0 + site.struck >= site.pole1 - 1 && !set.busy()) {
      site.state = 'done';
      site.onDone?.();
      site.onDone = null;
    }
  }
}
export const siteSmokes = () => sites.filter((q) => q.state === 'done' && q.plan.smoke).map((q) => q.plan.smoke!);
