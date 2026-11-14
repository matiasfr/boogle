// Ring Island's near view (docs/plans/ring-island-build1.md, R2b): the folk's side as R1 lays it out
// (src/sim/railway-ring-layout.ts). Their half-crossing (the Pilgrims' Way, u 277-470) with laid double track and truss
// posts, the hinge pier, the brace platform with its gold strut and a waving folk, the steps up to their deck, the
// hinge pier's sea ramp, the raised leaf (a pivot group R4c turns through ringIslandPose, its bracket empty and its
// outline painted), the island halt's two platforms (and the foot crossing at their south end) with the RINGWORKS
// board, the fingerpost (emblems only), the low map table, the crossover, the works yard (steel under a tarp, the drop
// hammer, the prophecy mural), the path to the summit lookout with its footbridge over the stack line's cutting (plain
// solid blocks: docs/plans/ring-summit-path.md), and the ground with its sand band. Nothing here does
// anything yet and nothing prompts (call 22). Static geometry merged into one vertex-coloured mesh; the leaf, its bracket, the hammer's head and the board's
// face are their own. Colliders: the ground's heightfield, the decks, ramps, platforms and yard, the leaf (kinematic).
// Local: no state, no sync. Positions in world metres from (u, lat) metres via ringAt.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY, createBody, type Body, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { getAudio } from '../../render/audio.ts';
import { hearGain } from '../../render/hearing.ts';
import { camera } from '../../render/scene.ts';
import type { FrameCtx } from '../../loop.ts';
import {
  RING_BRACE,
  RING_BRACE_PLATFORM,
  RING_END,
  RING_FORMATION,
  RING_GAP,
  RING_HALT,
  RING_RAMPS,
  RING_STEPS,
  ringAt,
  ringDeckY,
  type RingFlight,
  type RingLanding,
} from '../../sim/railway-ring-layout.ts';
import type { Cone, IslandGround } from './ground.ts';
import { SUMMIT_BRIDGE, summitBridge, summitPath, summitPathFoot } from './path.ts';
import { RING_CROSSING, RING_MAP_TABLE, ringCrossingPlanks, ringIslandPose } from './state.ts';
import { addFarGround } from '../../place/far-ground.ts';
import { BRACKET_Z, CRADLE, HANGER, PLATE_BOTTOM, WEIGHT, WEIGHT_X } from './bracket.ts';
import {
  LEAF_ORANGE,
  PENNANT_CREAM,
  PENNANT_POLE,
  POLE_PENNANT,
  pennantFooting,
  pennantGeometry,
} from '../ring-island-far/view.ts';

// ---------------------------------------------------------------- the layout, in metres
const FORM = {
  left: RING_FORMATION.left / 100,
  right: RING_FORMATION.right / 100,
  mid: RING_FORMATION.mid / 100,
};
const TRACKS = RING_FORMATION.tracks.map((t) => t / 100);
const HINGE = RING_GAP.hinge / 100,
  GAP = RING_GAP.leaf / 100;
const HALT = [RING_HALT.u0 / 100, RING_HALT.u1 / 100] as const;
const WAY_END = HALT[1] + 2;
const deckY = (u: number) => ringDeckY(Math.round(u * 100)) / 100;
const HINGE_Y = deckY(HINGE),
  HALT_Y = RING_HALT.y / 100,
  PLATFORM_Y = HALT_Y + 0.9;
const BRACE = {
  u0: RING_BRACE_PLATFORM.u0 / 100,
  u1: RING_BRACE_PLATFORM.u1 / 100,
  l0: RING_BRACE_PLATFORM.lat0 / 100,
  l1: RING_BRACE_PLATFORM.lat1 / 100,
  y: RING_BRACE_PLATFORM.y / 100,
};
/** World (x, z) metres of (u, lat) metres. */
const at = (u: number, lat = 0) => {
  const p = ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
const p3 = (u: number, lat: number, y: number) => ({ ...at(u, lat), y });
/** The line's yaw: a box's local z runs along u. */
const YAW = Math.atan2(0.0272, -1);
/** The drop hammer (call 19): lift 0.6 s, a short hold, drop, thump, every 2.4 s; heard within 120 m. */
const HAMMER = { cycle: 2.4, lift: 0.6, hold: 0.25, drop: 0.18, rise: 2.6, hear: 120 };

// ---------------------------------------------------------------- colours (the greybox's)
const TIMBER = '#8a6a48',
  TIMBER_DARK = '#6a5038',
  STEEL = '#e8742c', // the folk's orange steel
  STEEL_DARK = '#b8551e',
  GOLD = '#ffc83a',
  RAIL = '#3d3a38',
  BED = '#5d5650',
  CONCRETE = '#a6a29a',
  SAND = '#d6c69c',
  PATH = '#c9b48a',
  TARP = '#4f6b8a',
  WHITE = '#f4f1e8',
  FOLK = '#7a8f6a',
  HAT = '#ff8a1f',
  LAND = '#4a4d5c', // buildFar's cones
  LAND2 = '#3b3e4c',
  ROCK = '#7d7a78', // the cuttings' faces
  SKY = '#8fc4e0',
  NIGHT = '#2c2e3a';

/** Geometry merged into one vertex-coloured mesh, and the solids beside it. */
function createParts() {
  const list: THREE.BufferGeometry[] = [];
  const shapes: Shape[] = [];
  const colour = new THREE.Color();
  function add(color: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4) {
    if (m) geo.applyMatrix4(m);
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    colour.set(color);
    const n = g.getAttribute('position').count,
      c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) c.set([colour.r, colour.g, colour.b], k * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(g);
  }
  function solid(w: number, h: number, d: number, m: THREE.Matrix4) {
    const p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    m.decompose(p, q, s);
    shapes.push({
      kind: 'box',
      hx: w / 2,
      hy: h / 2,
      hz: d / 2,
      offset: { x: p.x, y: p.y, z: p.z },
      rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
    });
  }
  const merged = () => {
    const geo = mergeGeometries(list);
    for (const g of list) g.dispose();
    list.length = 0;
    return geo;
  };
  return { add, solid, shapes, merged };
}
type Parts = ReturnType<typeof createParts>;

/** The greybox's builders on R1's numbers (src/proto/greybox/ring.ts), writing into `parts`. */
function builders({ add, solid }: Parts) {
  const tmp = new THREE.Matrix4();
  /** A box from a to b (its centreline, top surface at a.y and b.y), w wide and h deep. */
  function beam(color: string, a: THREE.Vector3Like, b: THREE.Vector3Like, w: number, h: number, isSolid = true) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      full = Math.hypot(len, dy);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - h / 2, (a.z + b.z) / 2),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    add(color, new THREE.BoxGeometry(w, h, full + 0.04), m);
    if (isSolid) solid(w, h, full + 0.04, m);
  }
  /** An upright box, its top at `top`, yawed to the line: w across it, d along it. */
  function post(color: string, x: number, z: number, bottom: number, top: number, w: number, d = w, isSolid = true) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, (bottom + top) / 2, z),
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
      new THREE.Vector3(1, 1, 1),
    );
    add(color, new THREE.BoxGeometry(w, top - bottom, d), m);
    if (isSolid) solid(w, top - bottom, d, m);
  }
  /** An upright box over (u0..u1, l0..l1), bottom to top. */
  function block(
    color: string,
    u0: number,
    u1: number,
    l0: number,
    l1: number,
    bottom: number,
    top: number,
    isSolid = true,
  ) {
    const c = at((u0 + u1) / 2, (l0 + l1) / 2);
    post(color, c.x, c.z, bottom, top, l1 - l0, u1 - u0, isSolid);
  }
  /** A deck between u0 and u1 across [left, right], following `y(u)`, in `step` metre spans. */
  function deck(
    color: string,
    u0: number,
    u1: number,
    left: number,
    right: number,
    y: (u: number) => number,
    step = 10,
  ) {
    const mid = (left + right) / 2,
      w = right - left;
    for (let u = u0; u < u1 - 1e-6; u += step) {
      const v = Math.min(u1, u + step);
      beam(color, p3(u, mid, y(u)), p3(v, mid, y(v)), w, 0.5);
    }
  }
  /** Rails and a bed on each track, visual only. */
  function track(u0: number, u1: number, y: (u: number) => number, step = 10) {
    for (const t of TRACKS)
      for (let u = u0; u < u1 - 1e-6; u += step) {
        const v = Math.min(u1, u + step);
        beam(BED, p3(u, t, y(u) + 0.08), p3(v, t, y(v) + 0.08), 2.4, 0.1, false);
        for (const r of [-0.5, 0.5])
          beam(RAIL, p3(u, t + r, y(u) + 0.22), p3(v, t + r, y(v) + 0.22), 0.12, 0.14, false);
      }
  }
  /** A little folk figure: a body, a head and an orange hard hat; `wave` raises an arm. */
  function folk(x: number, y: number, z: number, wave = false) {
    add(FOLK, new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8), tmp.makeTranslation(x, y + 0.5, z));
    add(SAND, new THREE.SphereGeometry(0.3, 10, 8), tmp.makeTranslation(x, y + 1.3, z));
    add(HAT, new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), tmp.makeTranslation(x, y + 1.55, z));
    if (wave)
      add(
        FOLK,
        new THREE.BoxGeometry(0.14, 0.75, 0.14),
        new THREE.Matrix4().compose(
          new THREE.Vector3(x + 0.42, y + 1.35, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.5)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
  }
  /** A waist-high handrail with posts, from (u0, lat0) to (u1, lat1) with its foot at y0..y1. Visual only. */
  function handrail(u0: number, lat0: number, u1: number, lat1: number, y0: number, y1: number) {
    beam(STEEL, p3(u0, lat0, y0 + 1.05), p3(u1, lat1, y1 + 1.05), 0.07, 0.07, false);
    const n = Math.max(1, Math.round(Math.hypot(u1 - u0, lat1 - lat0) / 3));
    for (let k = 0; k <= n; k++) {
      const t = k / n,
        c = at(u0 + (u1 - u0) * t, lat0 + (lat1 - lat0) * t),
        y = y0 + (y1 - y0) * t;
      post(STEEL, c.x, c.z, y, y + 1.05, 0.08, 0.08, false);
    }
  }
  /** One ramp flight (RingFlight, cm): a smooth solid ramp, treads, kerbs and rails; a slipway is plain sand. */
  function flight(f: RingFlight) {
    const u0 = f.u0 / 100,
      u1 = f.u1 / 100,
      lat = f.lat / 100,
      y0 = f.y0 / 100,
      y1 = f.y1 / 100,
      W = 1.6;
    beam(f.slip ? SAND : CONCRETE, p3(u0, lat, y0), p3(u1, lat, y1), W, 0.4);
    if (f.slip) return;
    const len = Math.abs(u1 - u0),
      y = (t: number) => y0 + (y1 - y0) * t;
    for (let k = 0; k * 0.4 < len - 0.2; k++) {
      const t0 = (k * 0.4) / len,
        t1 = (k * 0.4 + 0.22) / len;
      beam(
        TIMBER,
        p3(u0 + (u1 - u0) * t0, lat, y(t0) + 0.05),
        p3(u0 + (u1 - u0) * t1, lat, y(t1) + 0.05),
        W - 0.3,
        0.05,
        false,
      );
    }
    for (const s of [-1, 1]) {
      beam(CONCRETE, p3(u0, lat + s * 0.74, y0 + 0.25), p3(u1, lat + s * 0.74, y1 + 0.25), 0.12, 0.25, false);
      handrail(u0, lat + s * 0.85, u1, lat + s * 0.85, y0, y1);
    }
    const c = at((u0 + u1) / 2, lat);
    post(TIMBER_DARK, c.x, c.z, -6, y(0.5) - 0.45, 0.4, 0.4, false);
  }
  /** A flat landing (RingLanding, cm), solid, with a pile under its middle and a rail along its seaward (high-lat) edge. */
  function landing(l: RingLanding) {
    const u0 = Math.min(l.u0, l.u1) / 100,
      u1 = Math.max(l.u0, l.u1) / 100,
      l0 = l.lat0 / 100,
      l1 = l.lat1 / 100,
      y = l.y / 100;
    deck(CONCRETE, u0, u1, l0, l1, () => y, 50);
    const c = at((u0 + u1) / 2, (l0 + l1) / 2);
    post(TIMBER_DARK, c.x, c.z, -6, y - 0.5, 0.6, 0.6, false);
    handrail(u0, l1 - 0.05, u1, l1 - 0.05, y, y);
  }
  return { tmp, beam, post, block, deck, track, folk, handrail, flight, landing };
}

/** The leaf's local frame: +z along it from the heel toward the toe (toward Home when down), its top face at y 0. */
function buildLeaf(group: THREE.Group) {
  const parts = createParts();
  const W = FORM.right - FORM.left;
  const box = (color: string, w: number, h: number, d: number, x: number, y: number, z: number) =>
    parts.add(color, new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().makeTranslation(x, y, z));
  box(LEAF_ORANGE, W, 0.8, GAP, 0, -0.4, GAP / 2); // the deck plate, the far leaf's own orange (no pop at the swap)
  for (const s of [-W / 2 + 0.2, W / 2 - 0.2]) box(STEEL_DARK, 0.4, 1.4, GAP, s, 0.3, GAP / 2); // the side girders
  for (const t of TRACKS)
    for (const r of [-0.5, 0.5]) box(RAIL, 0.12, 0.14, GAP - 0.4, t - FORM.mid + r, 0.15, GAP / 2);
  // The counterweight bracket, empty: a cradle and short hangers under the plate, and the painted outline of where four
  // footings go (call 22's outline, lit by R4c while a footing waits on the railhead rack) on the underside, where the jib
  // hangs them. Nothing of it stands on the running line (./bracket.ts; owner, 11 November).
  const bz = BRACKET_Z;
  box(STEEL_DARK, CRADLE.w, CRADLE.h, CRADLE.d, 0, CRADLE.y, bz);
  for (const x of WEIGHT_X) box(STEEL_DARK, HANGER.w, HANGER.h, HANGER.d, x, HANGER.y, bz);
  for (const s of [-1, 1]) {
    box(GOLD, W - 1, 0.04, 0.12, 0, PLATE_BOTTOM - 0.02, bz + s * 1.3);
    box(GOLD, 0.12, 0.04, 2.6, s * ((W - 1) / 2), PLATE_BOTTOM - 0.02, bz);
  }
  for (const x of WEIGHT_X) box(GOLD, 0.06, 0.04, 2.2, x, PLATE_BOTTOM - 0.02, bz);
  const mesh = new THREE.Mesh(parts.merged(), undefined);
  group.add(mesh);
  // The footings hung in the bracket (ringIslandPose.bracket, 0..4): one instanced draw, none while it's empty.
  const footings = new THREE.InstancedMesh(new THREE.BoxGeometry(WEIGHT.w, WEIGHT.h, WEIGHT.d), undefined, 4);
  const m = new THREE.Matrix4();
  WEIGHT_X.forEach((x, k) => footings.setMatrixAt(k, m.makeTranslation(x, WEIGHT.y, bz)));
  footings.count = 0;
  group.add(footings);
  return { mesh, footings, W };
}

/** The RINGWORKS board's face (the brief's word; copy for the owner, not The Boogler's). */
function boardTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = STEEL;
  c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#fff6e6';
  c.font = 'bold 76px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('RINGWORKS', 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type RingIslandView = ReturnType<typeof createRingIslandView>;
export function createRingIslandView(g: IslandGround, cones: readonly Cone[], centre: { x: number; z: number }) {
  const root = new THREE.Group();
  root.name = 'ring-island';
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  const parts = createParts();
  const b = builders(parts);
  const { beam, post, block, deck, track, folk, flight, landing, handrail } = b;

  // ---------------------------------------------------------------- the hinge pier, the brace platform, the steps
  for (const [u0, u1] of [
    [HINGE - 3, HINGE + 3],
    [HINGE + 3, HINGE + 20],
  ] as const)
    block(STEEL_DARK, u0, u1, FORM.left + 0.2, FORM.right - 0.2, -6, deckY(u1) - 0.5);
  if (POLE_PENNANT)
    for (const f of pennantFooting(deckY(PENNANT_POLE.u))) block(CONCRETE, f.u0, f.u1, f.lat0, f.lat1, f.y0, f.y1);
  deck(CONCRETE, BRACE.u0, BRACE.u1, BRACE.l0, BRACE.l1, () => BRACE.y, BRACE.u1 - BRACE.u0);
  block(STEEL_DARK, BRACE.u0 + 3, BRACE.u0 + 7, BRACE.l0 + 2, BRACE.l1 - 2, -6, BRACE.y - 0.5);
  handrail(BRACE.u0, BRACE.l1 - 0.05, BRACE.u1 - 3.5, BRACE.l1 - 0.05, BRACE.y, BRACE.y);
  {
    // The gold strut under the heel, its foot on the platform (rail.brace's site, RING_BRACE), facing the railhead.
    const foot = { u: 28450 / 100, lat: 3.4 };
    const c = { x: RING_BRACE.x / 100, z: RING_BRACE.z / 100 };
    post(GOLD, c.x, c.z, BRACE.y, BRACE.y + 0.5, 1.4);
    beam(
      GOLD,
      p3(foot.u - 0.4, foot.lat - 0.3, BRACE.y + 0.5),
      p3(HINGE + 0.4, FORM.right - 0.4, HINGE_Y - 0.6),
      0.6,
      0.6,
      false,
    );
    // One of the folk, waving you over (a looker, never Rivet: call 37).
    const f = at(BRACE.u0 + 4, BRACE.l1 - 3);
    folk(f.x, BRACE.y, f.z, true);
  }
  {
    // Steps from the platform's far end up to their deck (RING_STEPS), and a landing onto the deck's east edge.
    const s = RING_STEPS,
      lat = s.lat / 100,
      top = s.y1 / 100;
    beam(CONCRETE, p3(s.u0 / 100, lat, s.y0 / 100), p3(s.u1 / 100, lat, top), 2.8, 0.4);
    deck(CONCRETE, s.u1 / 100, s.u1 / 100 + 2.5, FORM.right - 0.3, lat + 1.4, () => top, 2.5);
    handrail(s.u0 / 100, lat + 1.35, s.u1 / 100, lat + 1.35, s.y0 / 100, top);
  }
  for (const ramp of RING_RAMPS) {
    for (const f of ramp.flights) flight(f);
    for (const l of ramp.landings) landing(l);
  }

  // ---------------------------------------------------------------- the Pilgrims' Way: their stub, laid double track
  deck(STEEL, HINGE, WAY_END, FORM.left, FORM.right, deckY);
  track(HINGE, WAY_END, deckY);
  for (let u = HINGE + 3; u <= HALT[0]; u += 6)
    for (const lat of [FORM.left + 0.15, FORM.right - 0.15]) {
      const c = at(u, lat);
      post(STEEL_DARK, c.x, c.z, deckY(u), deckY(u) + 1.4, 0.25, 0.25, false);
    }
  for (const lat of [FORM.left + 0.15, FORM.right - 0.15])
    for (let u = HINGE + 3; u < HALT[0]; u += 10) {
      const v = Math.min(HALT[0], u + 10);
      beam(STEEL_DARK, p3(u, lat, deckY(u) + 1.4), p3(v, lat, deckY(v) + 1.4), 0.25, 0.3, false);
    }
  for (let u = HINGE + 40; u < HALT[0]; u += 20) {
    const c = at(u, FORM.mid);
    post(STEEL_DARK, c.x, c.z, -6, deckY(u) - 0.5, 6, 1.2, false);
  }

  // ---------------------------------------------------------------- the island halt
  const [upL0, upL1] = RING_HALT.upLat.map((l) => l / 100) as [number, number];
  const [dnL0, dnL1] = RING_HALT.downLat.map((l) => l / 100) as [number, number];
  // The platforms, solid down to the fill (ground.ts), so no gap shows under them. They start at the foot crossing's
  // ramp tops (docs/plans/ring-island-crossing.md): their first 6.6 m are its landings and ramps.
  const X = RING_CROSSING;
  for (const [l0, l1] of [
    [upL0, upL1],
    [dnL0, dnL1],
  ] as const) {
    block(CONCRETE, X.rampTop, HALT[1], l0, l1, HALT_Y - 0.8, PLATFORM_Y);
    // A landing at the rail tops, carried on under the ramp as its fill, and the ramp the platform's full width,
    // deep enough that its underside stays inside the fill.
    block(CONCRETE, X.landing[0], X.rampTop, l0, l1, HALT_Y - 0.8, X.top);
    const mid = (l0 + l1) / 2;
    beam(CONCRETE, p3(X.landing[1], mid, X.top), p3(X.rampTop, mid, PLATFORM_Y), l1 - l0, 0.75);
  }
  // The planks between the landings: five timber spans with a flangeway by each rail, drawn only, over one solid slab
  // whose top is the rail tops (drawn a plank's depth lower, as the bed in the flangeways, so the rails show).
  for (const [l0, l1] of ringCrossingPlanks()) block(TIMBER, X.u0, X.u1, l0, l1, X.top - 0.12, X.top, false);
  block(BED, X.u0, X.u1, FORM.left, FORM.right, HALT_Y, X.top - 0.12, false);
  {
    const c = at((X.u0 + X.u1) / 2, (FORM.left + FORM.right) / 2);
    parts.solid(
      FORM.right - FORM.left,
      X.top - HALT_Y,
      X.u1 - X.u0,
      new THREE.Matrix4().compose(
        new THREE.Vector3(c.x, (HALT_Y + X.top) / 2, c.z),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  }
  // The west platform's ramp off its north end, down onto the slope where the path starts.
  const pathFoot = summitPathFoot();
  beam(
    CONCRETE,
    p3(HALT[1] - 4, upL0 + 0.2, PLATFORM_Y),
    { ...pathFoot, y: g.islandH(pathFoot.x, pathFoot.z) + 0.15 },
    3,
    0.4,
  );
  {
    // The RINGWORKS board on the east platform, its face to the tracks.
    const c = at(HALT[0] + 20, dnL1 - 0.3);
    post(STEEL_DARK, c.x, c.z, PLATFORM_Y + 3.3, PLATFORM_Y + 4.7, 0.2, 5.2, false);
    for (const du of [-2.3, 2.3]) {
      const p = at(HALT[0] + 20 + du, dnL1 - 0.3);
      post(RAIL, p.x, p.z, PLATFORM_Y, PLATFORM_Y + 3.4, 0.15, 0.15, false);
    }
  }
  // The works yard east of the halt: its deck level with the east platform, the steel waiting under a tarp (finding 5),
  // the drop hammer, and the works wall with the prophecy mural on its face to the halt.
  block(CONCRETE, HALT[0] + 2, HALT[1], dnL1, 16, -1, PLATFORM_Y);
  block(STEEL, HALT[0] + 3, HALT[0] + 15, 7.5, 13.5, PLATFORM_Y, PLATFORM_Y + 1.4);
  block(TARP, HALT[0] + 2.6, HALT[0] + 15.4, 7.1, 13.9, PLATFORM_Y + 1.4, PLATFORM_Y + 1.9);
  const hammerAt = { u: HALT[0] + 24, lat: 11 };
  {
    const { u, lat } = hammerAt;
    block(STEEL_DARK, u - 1.2, u + 1.2, lat - 1.2, lat + 1.2, PLATFORM_Y, PLATFORM_Y + 0.6); // the anvil
    for (const s of [-1, 1])
      block(STEEL_DARK, u - 0.25, u + 0.25, lat + s * 1.9 - 0.25, lat + s * 1.9 + 0.25, PLATFORM_Y, PLATFORM_Y + 6);
    block(STEEL_DARK, u - 0.3, u + 0.3, lat - 2.2, lat + 2.2, PLATFORM_Y + 6, PLATFORM_Y + 6.5);
  }
  {
    // The works wall and the mural: the island under the ring, the line coming in from the south, a box on the line.
    const u0 = HALT[1] - 12,
      u1 = HALT[1] - 0.5,
      face = 15.2;
    block(CONCRETE, u0, u1, face, 16, PLATFORM_Y, PLATFORM_Y + 6.5);
    const panel = (color: string, a0: number, a1: number, y0: number, y1: number, inset = 0.02) =>
      block(color, u0 + a0, u0 + a1, face - inset - 0.03, face - inset, PLATFORM_Y + y0, PLATFORM_Y + y1, false);
    panel(SKY, 0.6, 10.9, 1.2, 6.0);
    panel(LAND, 2.0, 9.0, 1.2, 2.4, 0.04); // the island
    panel(LAND2, 3.6, 7.0, 2.4, 3.3, 0.04);
    for (let k = 0; k < 9; k++) {
      // the ring overhead, as an arch of dark tiles
      const a = Math.PI * (0.1 + (0.8 * k) / 8),
        cu = 5.5 + Math.cos(a) * 3.4,
        cy = 3.0 + Math.sin(a) * 2.6;
      panel(NIGHT, cu - 0.35, cu + 0.35, cy - 0.3, cy + 0.3, 0.06);
    }
    panel('#7fd0ff', 5.2, 5.8, 4.4, 5.3, 0.08); // the shard
    panel(STEEL, 0.6, 5.0, 1.4, 1.7, 0.06); // the line, coming in
    panel(GOLD, 3.2, 3.9, 1.7, 2.3, 0.08); // the box on it
  }
  {
    // The branch read (ruling 4), beside the west platform: a two-armed fingerpost with painted emblems only (the
    // Gorge's fork, Canopy's tree; the names are the owner's), and the low map table with the branch lines dashed.
    const halt = at((HALT[0] + HALT[1]) / 2, FORM.mid);
    const toward = (x: number, z: number) => {
      const dx = x - halt.x,
        dz = z - halt.z,
        n = Math.hypot(dx, dz);
      return { x: dx / n, z: dz / n };
    };
    const GORGE = toward(-103, -1988),
      CANOPY = toward(-1085, -313);
    const fp = at(HALT[0] + 8, FORM.left - 1.7);
    post(TIMBER_DARK, fp.x, fp.z, PLATFORM_Y, PLATFORM_Y + 3.7, 0.28, 0.28, false);
    for (const [dir, y, emblem] of [
      [GORGE, 3.2, 'gorge'],
      [CANOPY, 2.45, 'canopy'],
    ] as const) {
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(fp.x, PLATFORM_Y + y, fp.z),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(-dir.z, dir.x)),
        new THREE.Vector3(1, 1, 1),
      );
      const piece = (color: string, geo: THREE.BufferGeometry, x: number, py: number, z: number, rx = 0, rz = 0) =>
        parts.add(
          color,
          geo,
          new THREE.Matrix4().multiplyMatrices(
            M,
            new THREE.Matrix4().compose(
              new THREE.Vector3(x, py, z),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)),
              new THREE.Vector3(1, 1, 1),
            ),
          ),
        );
      piece(TIMBER, new THREE.BoxGeometry(2.3, 0.52, 0.08), 1.25, 0, 0);
      piece(TIMBER, new THREE.ConeGeometry(0.37, 0.55, 4), 2.65, 0, 0, 0, -Math.PI / 2);
      for (const s of [-1, 1]) {
        const z = s * 0.06;
        if (emblem === 'gorge') {
          piece(GOLD, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.1, z);
          piece(GOLD, new THREE.BoxGeometry(0.06, 0.24, 0.02), 0.88, 0.1, z, 0, 0.5);
          piece(GOLD, new THREE.BoxGeometry(0.06, 0.24, 0.02), 1.02, 0.1, z, 0, -0.5);
        } else {
          piece(TIMBER_DARK, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.12, z);
          piece(FOLK, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12), 0.95, 0.06, z, Math.PI / 2);
        }
      }
    }
    // Where it stands is state.ts's (the halt map lies over this paint from the rivet: railway/ring-map-table.ts).
    const mc = RING_MAP_TABLE,
      top = RING_MAP_TABLE.top;
    parts.add(
      TARP,
      new THREE.BoxGeometry(mc.w, 0.08, mc.d),
      new THREE.Matrix4().makeTranslation(mc.x, top + 0.04, mc.z),
    );
    for (const [x, z] of [
      [-1.0, -0.8],
      [1.0, -0.8],
      [-1.0, 0.8],
      [1.0, 0.8],
    ] as const)
      post(TIMBER_DARK, mc.x + x, mc.z + z, PLATFORM_Y, top, 0.12, 0.12, false);
    const hx = 1.0,
      hz = 0.35,
      lay = 0.085;
    const line = (color: string, dx: number, dz: number, len: number, dashed: boolean) => {
      const rot = Math.atan2(-dz, dx);
      const seg = dashed ? 0.12 : len;
      for (let d = 0; d < len - 1e-6; d += dashed ? 0.2 : len) {
        const l = Math.min(seg, len - d),
          c = d + l / 2;
        parts.add(
          color,
          new THREE.BoxGeometry(l, 0.02, 0.06),
          new THREE.Matrix4().compose(
            new THREE.Vector3(mc.x + hx + dx * c, top + lay + 0.01, mc.z + hz + dz * c),
            new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rot),
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    };
    const station = (color: string, dx: number, dz: number, len: number) =>
      parts.add(
        color,
        new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12),
        new THREE.Matrix4().makeTranslation(mc.x + hx + dx * len, top + lay + 0.015, mc.z + hz + dz * len),
      );
    line(WHITE, 0, -1, 1.2, false);
    station(WHITE, 0, -1, 1.2);
    line(STEEL, GORGE.x, GORGE.z, 1.4, true);
    station(BED, GORGE.x, GORGE.z, 1.4);
    line(FOLK, CANOPY.x, CANOPY.z, 2.05, true);
    station(BED, CANOPY.x, CANOPY.z, 2.05);
    station(GOLD, 0, 0, 0);
  }

  // ---------------------------------------------------------------- the run-off, the buffers and the end board
  // Not here since the greybox route (docs/plans/greybox-route.md, leg 1 step 4): line 2 runs on from WAY_END along
  // the stack line's row, which curves west through where R2d's straight bed and buffers stood, so the run-off's deck
  // and rails, the buffers and the end board are route-greybox/leg-view.ts's, drawn at the line's end as it is laid
  // (here until the first section, then at each railhead). The cutting is ground.ts's.

  // ---------------------------------------------------------------- the crossover's rails on the Way (R2d)
  {
    // The up track's lateral eased from its own (-4) to the down track's (0) over RING_END.cross, as place/layout.ts's
    // crossLat does at Far Head: ballast and a pair of rails, a metre at a time, on the Way's grade. Rails only.
    const [c0, c1] = [RING_END.cross.u0 / 100, RING_END.cross.u1 / 100];
    const ease = (t: number) => t * t * (3 - 2 * t);
    const lat = (u: number) => TRACKS[0]! * (1 - ease((u - c0) / (c1 - c0)));
    for (let u = c0; u < c1 - 1e-6; u += 1) {
      const v = Math.min(c1, u + 1);
      beam(BED, p3(u, lat(u), deckY(u) + 0.08), p3(v, lat(v), deckY(v) + 0.08), 2.4, 0.1, false);
      for (const r of [-0.5, 0.5])
        beam(RAIL, p3(u, lat(u) + r, deckY(u) + 0.22), p3(v, lat(v) + r, deckY(v) + 0.22), 0.12, 0.14, false);
    }
  }

  // ---------------------------------------------------------------- the path up to the summit lookout
  const CX = centre.x,
    CZ = centre.z;
  {
    const { way, bridgeLeg } = summitPath(g, centre);
    for (let i = 0; i < way.length - 1; i++) {
      if (i === bridgeLeg) continue; // the deck, below: no ground path draped into the cutting
      const [ax, az] = way[i]!,
        [bx, bz] = way[i + 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 6));
      for (let k = 0; k < n; k++) {
        const x0 = ax + ((bx - ax) * k) / n,
          z0 = az + ((bz - az) * k) / n,
          x1 = ax + ((bx - ax) * (k + 1)) / n,
          z1 = az + ((bz - az) * (k + 1)) / n;
        beam(
          PATH,
          { x: x0, y: g.islandH(x0, z0) + 0.12, z: z0 },
          { x: x1, y: g.islandH(x1, z1) + 0.12, z: z1 },
          2.6,
          0.3,
          false,
        );
      }
    }
  }
  // The footbridge over the stack line's cutting, blocked out at true size (docs/plans/ring-summit-path.md): a timber
  // deck flush with the path at both rims, two orange parapets low enough to hop, a concrete abutment under each end
  // and two dark steel bents standing just outside the cutting's flat floor. Everything here is solid.
  {
    const { a, b } = summitBridge(g),
      B = SUMMIT_BRIDGE;
    const span = Math.hypot(b.x - a.x, b.z - a.z),
      ax = (b.x - a.x) / span,
      az = (b.z - a.z) / span;
    /** A point `d` metres along the deck from a and `side` metres to its right, `dy` over the deck's top. */
    const on = (d: number, side = 0, dy = 0) => ({
      x: a.x + ax * d - az * side,
      y: a.y + ((b.y - a.y) * d) / span + dy,
      z: a.z + az * d + ax * side,
    });
    beam(TIMBER, a, b, B.width, B.thick);
    for (const s of [-1, 1]) {
      const side = s * (B.width / 2 - 0.06);
      beam(STEEL, on(0, side, B.parapet), on(span, side, B.parapet), 0.12, B.parapet);
    }
    for (const [d0, d1] of [
      [-1.5, 0.5],
      [span - 0.5, span + 1.5],
    ] as const)
      beam(CONCRETE, on(d0, 0, -B.thick), on(d1, 0, -B.thick), 3.4, 1.2);
    const yaw = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(ax, az));
    for (const d of B.bents) {
      const under = on(d, 0, -B.thick).y;
      beam(STEEL_DARK, on(d, -1.7, -B.thick), on(d, 1.7, -B.thick), 0.5, 0.4);
      for (const side of [-1.2, 1.2]) {
        const c = on(d, side),
          bottom = g.islandH(c.x, c.z) - 0.5,
          top = under - 0.4;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(c.x, (bottom + top) / 2, c.z),
          yaw,
          new THREE.Vector3(1, 1, 1),
        );
        parts.add(STEEL_DARK, new THREE.BoxGeometry(0.5, top - bottom, 0.5), m);
        parts.solid(0.5, top - bottom, 0.5, m);
      }
    }
  }
  const summit = g.islandH(CX, CZ) + 0.3;
  {
    parts.add(
      CONCRETE,
      new THREE.CylinderGeometry(6, 6.5, 1.2, 7),
      new THREE.Matrix4().makeTranslation(CX, summit - 0.6, CZ),
    );
    parts.shapes.push({
      kind: 'cylinder',
      rTop: 6,
      rBottom: 6.5,
      h: 1.2,
      segments: 7,
      offset: { x: CX, y: summit - 0.6, z: CZ },
    });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      post(STEEL, CX + Math.cos(a) * 5.7, CZ + Math.sin(a) * 5.7, summit, summit + 1.1, 0.15, 0.15, false);
    }
    folk(CX + 2, summit, CZ - 1.5);
    // A short ramp from the path's end up onto the deck, whose rim stands about 1.5 m over the slope.
    const n = Math.hypot(4, 6),
      ox = 4 / n,
      oz = 6 / n;
    const foot = { x: CX + ox * 11.5, z: CZ + oz * 11.5 };
    beam(
      CONCRETE,
      { ...foot, y: g.islandH(foot.x, foot.z) + 0.15 },
      { x: CX + ox * 5.2, y: summit, z: CZ + oz * 5.2 },
      2.4,
      0.4,
    );
  }

  const shell = new THREE.Mesh(parts.merged(), material);
  shell.castShadow = shell.receiveShadow = true;
  root.add(shell);
  const solids = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: 0, y: 0, z: 0 },
    shapes: parts.shapes,
  });

  // ---------------------------------------------------------------- the ground: the grid as one mesh and one heightfield
  const ground = (() => {
    const { nx, nz, x0, z0, cell } = g;
    const pos = new Float32Array(nx * nz * 3),
      col = new Float32Array(nx * nz * 3);
    const land = new THREE.Color(LAND),
      land2 = new THREE.Color(LAND2),
      sand = new THREE.Color(SAND),
      rock = new THREE.Color(ROCK),
      c = new THREE.Color();
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const k = i + j * nx,
          x = x0 + i * cell,
          z = z0 + j * cell,
          h = g.at(i, j);
        // A hair over buildFar's faceted cones, which hide while this view is mounted (src/place/far-hills.ts).
        pos.set([x, h + 0.03, z], k * 3);
        // buildFar's colour of whichever cone stands highest here, sand along the shore and on the halt's fill.
        let best = -Infinity,
          which = 0;
        cones.forEach(([dx, dz, r, hh], n) => {
          const y = hh - 4 - (hh * Math.hypot(x - centre.x - dx, z - centre.z - dz)) / r;
          if (y > best) {
            best = y;
            which = n;
          }
        });
        c.copy(which === 1 || which === 2 ? land2 : land);
        const shore = 1 - THREE.MathUtils.smoothstep(h, 1.6, 2.6);
        const fill = g.fillOut(x, z) < 12 && h > g.cone(x, z) + 0.2 ? 1 : 0;
        c.lerp(sand, Math.max(shore, fill * 0.85));
        // Cut rock where the railway's cuttings took the hillside away (the run-off's notch and the stack line's
        // walls and floor): paler than the hill's skin, so a cutting reads as cut from the track and from above.
        c.lerp(rock, THREE.MathUtils.smoothstep(g.cone(x, z) - h, 0.3, 1.5));
        col.set([c.r, c.g, c.b], k * 3);
      }
    // Cells entirely under the sea are left out of the mesh (and so out of its tiles).
    const underwater = (i: number, j: number) =>
      Math.max(g.at(i, j), g.at(i + 1, j), g.at(i, j + 1), g.at(i + 1, j + 1)) < -6.5;
    const index: number[] = [];
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = i + j * nx,
          bb = a + 1,
          cc = a + nx,
          d = cc + 1;
        if (underwater(i, j)) continue;
        // The collider's anti-diagonal split (ground.ts islandH): (a, b, c) and (d, c, b), both facing up.
        index.push(a, cc, bb, d, bb, cc);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95 }));
    mesh.receiveShadow = true;
    mesh.name = 'ring-island-ground';
    return { mesh, underwater, mainEnd: index.length };
  })();
  const groundMesh = ground.mesh;
  root.add(groundMesh);
  // Frustum-culled tiles in three levels of detail, as the main island's far ground (place/far-ground.ts).
  const disposeTiles = addFarGround(groundMesh, g.nx, g.nz, ground.mainEnd, ground.underwater);
  const hf = g.collider();
  const groundBody = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: hf.position,
    shapes: [{ kind: 'heightfield', heights: hf.heights, cell: hf.cell }],
  });

  // ---------------------------------------------------------------- the raised leaf: a pivot at the heel
  const hinge = p3(HINGE, FORM.mid, HINGE_Y);
  const leaf = new THREE.Group();
  leaf.name = 'ring-island-leaf';
  leaf.position.set(hinge.x, hinge.y, hinge.z);
  const leafParts = buildLeaf(leaf);
  leafParts.mesh.material = material;
  leafParts.mesh.castShadow = leafParts.mesh.receiveShadow = true;
  leafParts.footings.material = material;
  {
    const grey = new THREE.Color(CONCRETE);
    for (let k = 0; k < 4; k++) leafParts.footings.setColorAt(k, grey);
  }
  root.add(leaf);
  const leafBody: Body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    group: GROUP.SCENERY,
    position: hinge,
    shapes: [{ kind: 'box', hx: leafParts.W / 2, hy: 0.4, hz: GAP / 2, offset: { x: 0, y: -0.4, z: GAP / 2 } }],
  });
  let leafAngle = NaN;
  function poseLeaf() {
    const deg = ringIslandPose.leaf;
    leafParts.footings.count = Math.max(0, Math.min(4, Math.round(ringIslandPose.bracket)));
    if (deg === leafAngle) return;
    leafAngle = deg;
    // local +z toward Home (the line's heading turned half round), then the toe tipped up by `deg`
    leaf.rotation.set((-deg * Math.PI) / 180, YAW + Math.PI, 0, 'YXZ');
    const q = leaf.quaternion;
    leafBody.quaternion.set(q.x, q.y, q.z, q.w);
  }
  poseLeaf();

  // The pennant on its own fixed pole beside the hinge pier (the owner, 11 November), the far leaf's own: one definition
  // (PENNANT_POLE), so the handover at the mount distance matches. It does not turn with the leaf and stays up after the
  // Meet. Visual only.
  let pennant: THREE.Mesh | null = null;
  if (POLE_PENNANT) {
    const c = p3(PENNANT_POLE.u, PENNANT_POLE.lat, deckY(PENNANT_POLE.u));
    pennant = new THREE.Mesh(
      pennantGeometry(),
      new THREE.MeshStandardNodeMaterial({
        color: PENNANT_CREAM,
        emissive: PENNANT_CREAM,
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    pennant.position.set(c.x, c.y, c.z);
    pennant.rotation.y = YAW + Math.PI; // local +z toward Home, as the leaf's
    root.add(pennant);
  }

  // ---------------------------------------------------------------- the drop hammer's head and the board's face
  const hammerBase = p3(hammerAt.u, hammerAt.lat, PLATFORM_Y + 0.6);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.1, 1.3),
    new THREE.MeshStandardNodeMaterial({ color: RAIL, roughness: 0.6 }),
  );
  head.rotation.y = YAW;
  head.castShadow = true;
  root.add(head);
  const boardTex = boardTexture();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(4.9, 1.2),
    new THREE.MeshStandardNodeMaterial({ map: boardTex, roughness: 0.8 }),
  );
  {
    const c = p3(HALT[0] + 20, dnL1 - 0.42, PLATFORM_Y + 4.0);
    board.position.set(c.x, c.y, c.z);
    // its face to the west (toward the tracks): the plane's +z along -lat
    board.rotation.y = Math.atan2(-1, -0.0272);
  }
  root.add(board);

  let lastPhase = 0;
  function thump(x: number, z: number) {
    const a = getAudio('work');
    if (!a) return;
    const gain = 0.6 * hearGain(Math.hypot(camera.position.x - x, camera.position.z - z), HAMMER.hear);
    if (gain < 0.003) return;
    const { ctx, out } = a,
      t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator(),
      env = ctx.createGain();
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.22);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(env).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }
  /** The hammer's lift above the anvil at time t into its cycle. */
  function hammerLift(t: number) {
    const { lift, hold, drop, rise } = HAMMER;
    if (t < lift) return rise * THREE.MathUtils.smootherstep(t, 0, lift);
    if (t < lift + hold) return rise;
    if (t < lift + hold + drop) {
      const f = (t - lift - hold) / drop;
      return rise * (1 - f * f);
    }
    return 0;
  }
  const strike = HAMMER.lift + HAMMER.hold + HAMMER.drop;

  return {
    root,
    bodies: [solids, groundBody, leafBody] as readonly Body[],
    update(ctx: FrameCtx) {
      poseLeaf();
      const phase = ctx.elapsed % HAMMER.cycle;
      head.position.set(hammerBase.x, hammerBase.y + 0.55 + hammerLift(phase), hammerBase.z);
      if (lastPhase < strike && phase >= strike) thump(hammerBase.x, hammerBase.z);
      lastPhase = phase;
    },
    inspect() {
      let meshes = 0;
      root.traverse((o) => {
        if (o instanceof THREE.Mesh && o.visible) meshes++;
      });
      return {
        meshes,
        solids: parts.shapes.length,
        ground: { nx: g.nx, nz: g.nz, cell: g.cell, bounds: g.bounds },
        leaf: { ...ringIslandPose },
        summit: +summit.toFixed(2),
      };
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      material.dispose();
      disposeTiles();
      (groundMesh.material as THREE.Material).dispose();
      (head.material as THREE.Material).dispose();
      (board.material as THREE.Material).dispose();
      boardTex.dispose();
      leafParts.footings.dispose();
      pennant?.geometry.dispose();
      (pennant?.material as THREE.Material | undefined)?.dispose();
    },
  };
}
