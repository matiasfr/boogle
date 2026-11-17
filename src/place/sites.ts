// How anything gets built in ?proto=place: the forge's way, for every building. Bare poles first, then a frame, walls row by
// row, a roof board by board and a chimney, each piece falling into place with a thud, and only then do the poles come down.
// Nothing scales up. docs/decisions.md, "construction is physical" and "town buildings get scaffolding and are
// solid"; docs/research/growing-towns.md (8-10 s for an ordinary addition, the longest for the landmark). Every building's
// pieces share one instanced set, batched by shape. Local.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../render/owned-view.ts';
import { thump } from '../render/machine-sfx.ts';
import { siteExit } from './site-clearance.ts';
import { PLAYER_R } from '../constants.ts';
import { me } from '../player/player.ts';
import { teleport, type Body } from '../physics/engine.ts';
import type { Box } from '../render/boxes.ts';
import { H, ROOM_GROUP, addStatic } from './land.ts';
import { paintSite } from './look.ts';
import { dropSet, dustRing, type DropSet } from './pieces.ts';

import {
  housePlan as planHouse,
  towerPlan as planTower,
  blockPlan as planBlock,
  type HouseSpec,
  type TowerSpec,
  type BlockSpec,
  type Hull,
  type Plan,
} from './building-plans.ts';
export type { HouseSpec, TowerSpec, BlockSpec, Hull, Plan } from './building-plans.ts';
export const housePlan = (s: HouseSpec) => planHouse(s, H(s.x, s.z));
export const towerPlan = (s: TowerSpec) => planTower(s, H(s.x, s.z));
export const blockPlan = (s: BlockSpec, lifts = 1, top?: string) => planBlock(s, H(s.x, s.z), lifts, top);

// ---------------------------------------------------------------- where people can't walk
export type Foot = { x: number; z: number; c: number; s: number; hw: number; hd: number };
/** Every footprint in the place, for the little guys to walk round. */
export const feet: Foot[] = [];
export function addFoot(x: number, z: number, yaw: number, hw: number, hd: number, owner?: OwnedView) {
  const foot = { x, z, c: Math.cos(yaw), s: Math.sin(yaw), hw, hd };
  feet.push(foot);
  /** Retires the footprint early (a station frame that packed up); safe to call twice. */
  const remove = () => {
    const index = feet.indexOf(foot);
    if (index >= 0) feet.splice(index, 1);
  };
  owner?.cleanup(remove);
  return remove;
}
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
type RecordBodies = { readonly bodies: readonly Body[]; setEnabled(on: boolean): void };
type SiteRecords = { hulls: readonly RecordBodies[]; poles: readonly RecordBodies[] };
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
  foot: Foot;
};
const boxes: Box[] = [];
const records = new WeakMap<Site, SiteRecords>();
export const sites: Site[] = [];
let set: DropSet | null = null;
let owned: OwnedView | undefined;
/** Sites before this one were there at the last buildSites. */
let built = 0;
export function addSite(id: string, plan: Plan, pace: number, parts: SiteRecords): Site {
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
    foot: { x: plan.x, z: plan.z, c: Math.cos(plan.yaw), s: Math.sin(plan.yaw), hw: plan.hw, hd: plan.hd },
  };
  records.set(site, parts);
  feet.push(site.foot);
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
export function hullBodies(plan: Plan, hulls: Hull[], owner: OwnedView) {
  const { x, y, z, yaw } = plan;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  return hulls.map((h) =>
    addStatic(
      { kind: 'box', hx: h.hx, hy: h.hy, hz: h.hz },
      { x: x + h.dx * cos + h.dz * sin, y: y + h.dy, z: z - h.dx * sin + h.dz * cos },
      q,
      h.room ? ROOM_GROUP : undefined,
      owner,
    ),
  );
}
const polesOff = (site: Site) => {
  for (const part of records.get(site)!.poles) part.setEnabled(false);
  site.poleBodies.length = 0;
};
function solid(site: Site, on: boolean) {
  const parts = records.get(site)!;
  if (!on) {
    for (const part of parts.hulls) part.setEnabled(false);
    site.bodies.length = 0;
    return;
  }
  if (site.bodies.length || !owned) return;
  // Clear an overlapping local player before any record enables its solids (including a join/reload snap).
  pushOut(site);
  for (const part of parts.hulls) {
    part.setEnabled(true);
    site.bodies.push(...part.bodies);
  }
  if (site.state === 'building')
    for (const part of parts.poles) {
      part.setEnabled(true);
      site.poleBodies.push(...part.bodies);
    }
}
function pushOut(site: Site) {
  const { y, hulls, poles, keepOut } = site.plan;
  if (!me.body) return;
  const exit = siteExit(
    me.body.position,
    site.foot,
    y,
    site.state === 'building' ? [...hulls, ...poles] : hulls,
    outOf,
    keepOut ?? hulls[0],
  );
  if (exit) {
    teleport(me.body, exit.x, H(exit.x, exit.z) + PLAYER_R + 0.2, exit.z);
    me.body.velocity.set(0, 0, 0);
  }
}

/** Call once, after every addSite. With an owner, its mesh and bodies are the owner's, and disposing it (or calling the
 * returned disposer) forgets every site added since the last call. */
export function buildSites(owner: OwnedView) {
  set = dropSet(boxes, onLand, owner);
  paintSite(set.mesh, boxes);
  owned = owner;
  const from = built;
  built = sites.length;
  let done = false;
  const dispose = () => {
    if (done) return;
    done = true;
    const gone = sites.splice(from);
    for (const site of gone) {
      polesOff(site);
      solid(site, false);
      const k = feet.indexOf(site.foot);
      if (k >= 0) feet.splice(k, 1);
    }
    if (gone.length) boxes.length = gone[0]!.k0;
    built = from;
    set = null;
    owned = undefined;
  };
  owner.cleanup(dispose);
  return dispose;
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
/** One finished piece, for this tab only: there or not, or `y` metres off its place. Nobody else's copy moves. */
export const showPiece = (k: number, on: boolean) => set?.snap(k, on);
export const liftPiece = (k: number, y: number) => set?.lift(k, y);
/** Start over: nothing's in the air. */
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
