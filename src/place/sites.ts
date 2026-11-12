// How anything gets built in ?proto=place: the forge's way, for every building. Bare poles first, then a frame, walls row by
// row, a roof board by board and a chimney, each piece falling into place with a thud, and only then do the poles come down.
// Nothing scales up. docs/decisions.md, "construction is physical" and "town buildings get scaffolding and are
// solid"; docs/research/growing-towns.md (8-10 s for an ordinary addition, the longest for the landmark). Every building's
// pieces share one instanced set, batched by shape. Local.
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../render/owned-view.ts';
import { thump } from '../render/machine-sfx.ts';
import { PLAYER_R } from '../constants.ts';
import { me } from '../player/player.ts';
import { removeBody, teleport, type Body } from '../physics/engine.ts';
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
  owner?.cleanup(() => {
    const index = feet.indexOf(foot);
    if (index >= 0) feet.splice(index, 1);
  });
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
export const sites: Site[] = [];
let set: DropSet | null = null;
let owned: OwnedView | undefined;
/** Sites before this one were there at the last buildSites. */
let built = 0;
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
    foot: { x: plan.x, z: plan.z, c: Math.cos(plan.yaw), s: Math.sin(plan.yaw), hw: plan.hw, hd: plan.hd },
  };
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
const unbody = (b: Body) => (owned ? owned.removeBody(b) : removeBody(b));
const polesOff = (site: Site) => {
  for (const b of site.poleBodies) unbody(b);
  site.poleBodies.length = 0;
};
function solid(site: Site, on: boolean) {
  if (!on) {
    for (const b of site.bodies) unbody(b);
    site.bodies.length = 0;
    return;
  }
  if (site.bodies.length || !owned) return; // the view is gone: its bodies went with it
  const { x, y, z, yaw, hulls } = site.plan;
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  site.bodies.push(...hullBodies(site.plan, hulls, owned));
  if (site.state === 'building') site.poleBodies.push(...hullBodies(site.plan, site.plan.poles, owned));
  // Standing in the plot when the walls go up: you're moved to the nearest edge.
  const me_ = me.body;
  if (!me_) return;
  const pos = { x: me_.position.x, z: me_.position.z };
  const out = site.plan.keepOut ?? hulls[0]!;
  const f: Foot = { x, z, c: cos, s: sin, hw: out.hx, hd: out.hz };
  if (me_.position.y < y + out.hy * 2 && outOf(f, pos, PLAYER_R + 0.2)) {
    teleport(me_, pos.x, H(pos.x, pos.z) + PLAYER_R + 0.2, pos.z);
    me_.velocity.set(0, 0, 0);
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
