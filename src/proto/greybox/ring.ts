// ?ring=greybox, in any build: Ring Island's near view as a walkable greybox, the Meet laid out at the 10 November
// rulings (docs/brainstorms/ring-island.md, docs/plans/world-blockout.md "Rulings"). Our bow at 4% out to the railhead,
// the gap, the folk's orange half-crossing (the Pilgrims' Way) with its raised leaf, the brace platform, the hook ring on
// its own sea post, ramps out of the sea, the island halt with its fingerpost, map and turning loop, the shore and the path up to the summit lookout under
// the shard. Local static colliders for your own body (the live cones become solid too), nothing else: no ops, state,
// saves, sim or world change. Positions are a layout proposal for build 1's R1, not a catalog.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from '../../render/scene.ts';
import { background } from '../../async.ts';
import { precompile } from '../../render/precompile.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { flat } from '../flat.ts';
import { FAR, ORIGIN } from '../place/layout.ts';
import { RING_CONES } from './ground.ts';
import { at, CONCOURSE, HOUSE, HX, houseBoxes, houseYaw, slab } from './ring-house.ts';
import { refreshMaterials } from './build.ts';

// ---------------------------------------------------------------- the layout (world metres; u = metres out from the pier head)
// Line 2's track at the pier head (the crossing's line: bent n stands at u = 20 n, CROSSING_BENTS), its heading HX and
// `at(u, lat)`, the world x/z of u along and lat right (east) of it, come from ./ring-house.ts (pure, shared with its test).
/** The ruling grade's bow, u from the pier head (ruling 5): 24.3 m to bent 1, 4% down to the island halt's south end
 * (u 428), 8.0 m level through the halt and the loop. Bent 6 is 20.3 m, the railhead 14.7 m, the hinge 14.0 m. */
const deckY = (u: number) => (u <= 20 ? 24.3 : Math.max(8, 24.3 - 0.04 * (u - 20)));
/** The double formation (ruling 11): 7.6 m, its middle 2 m west of line 2's track; the second track 4 m west. */
const FORM = { left: -5.8, right: 1.8, mid: -2 };
const TRACKS = [0, -4];
export const RING_LAYOUT = {
  railhead: 260, // bent 13, the last bent: the leaf's toe lands here
  gap: 17, // the leaf's length, 16-18 m (design review finding 1)
  hinge: 277,
  braceY: 10.0, // the brace platform's deck (ruling 5)
  hookPile: { u: 270, lat: 12, y: 17.5 }, // the hook ring on its own sea post, 10 m into the gap (ruling 1)
  landPad: { lat: 5 }, // the hook's landing spot on the railhead platform, 5 m east of the track (ruling 6)
  halt: [428, 468] as const, // the island halt's platforms, centred on about (1414, -820)
  loop: { x: 1462, z: -822, r: 40 }, // the turning loop, over the shallows east of the halt
  lookout: { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z }, // the main cone's summit, under the shard
};
const L = RING_LAYOUT;
const hingeY = deckY(L.hinge);
const braceY = L.braceY;

// ---------------------------------------------------------------- colours
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
  LINE2 = '#2ec4b6', // line 2's colour (LINE_MARK[1] in src/entities/railway/halt-map.ts): the Ring Island halt's edge paint
  RING = '#f4f1e8',
  FOLK = '#7a8f6a',
  HAT = '#ff8a1f';

// ---------------------------------------------------------------- builders: geometry merged per colour, one static body
const parts = new Map<string, THREE.BufferGeometry[]>();
const shapes: Shape[] = [];
const tmp = new THREE.Matrix4();
function add(color: string, geo: THREE.BufferGeometry, m?: THREE.Matrix4) {
  if (m) geo.applyMatrix4(m);
  let list = parts.get(color);
  if (!list) parts.set(color, (list = []));
  list.push(geo.index ? geo.toNonIndexed() : geo);
}
function solidBox(w: number, h: number, d: number, m: THREE.Matrix4) {
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
/** A box from a to b (its centreline, top surface at a.y and b.y), w wide and h deep. */
function beam(
  color: string,
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  w: number,
  h: number,
  solid = true,
) {
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
  if (solid) solidBox(w, h, full + 0.04, m);
}
/** An upright box, its top at `top`, yawed to the line. */
const YAW = Math.atan2(HX, -1);
function post(color: string, x: number, z: number, bottom: number, top: number, w: number, d = w, solid = true) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, (bottom + top) / 2, z),
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
    new THREE.Vector3(1, 1, 1),
  );
  add(color, new THREE.BoxGeometry(w, top - bottom, d), m);
  if (solid) solidBox(w, top - bottom, d, m);
}
const p3 = (u: number, lat: number, y: number) => ({ ...at(u, lat), y });
/** A deck between u0 and u1 across [left, right], following `y(u)`, in `step` metre spans. */
function deck(color: string, u0: number, u1: number, left: number, right: number, y: (u: number) => number, step = 10) {
  const mid = (left + right) / 2,
    w = right - left;
  for (let u = u0; u < u1 - 1e-6; u += step) {
    const v = Math.min(u1, u + step);
    beam(color, p3(u, mid, y(u)), p3(v, mid, y(v)), w, 0.5);
  }
}
/** Rails and a bed on each track, visual only. */
function track(u0: number, u1: number, y: (u: number) => number, which = TRACKS, step = 10) {
  for (const t of which)
    for (let u = u0; u < u1 - 1e-6; u += step) {
      const v = Math.min(u1, u + step);
      beam(BED, p3(u, t, y(u) + 0.08), p3(v, t, y(v) + 0.08), 2.4, 0.1, false);
      for (const r of [-0.5, 0.5]) beam(RAIL, p3(u, t + r, y(u) + 0.22), p3(v, t + r, y(v) + 0.22), 0.12, 0.14, false);
    }
}
/** A little folk figure: a body, a head and an orange hard hat. */
function folk(x: number, y: number, z: number) {
  add(FOLK, new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8), tmp.makeTranslation(x, y + 0.5, z));
  add(SAND, new THREE.SphereGeometry(0.3, 10, 8), tmp.makeTranslation(x, y + 1.3, z));
  add(HAT, new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), tmp.makeTranslation(x, y + 1.55, z));
}

// Sea ramps (ruling 2): a slipway into the water, then switchback flights of no more than 30 degrees, 1.6 m wide with a
// kerb. The collider is a smooth ramp; the look is steps and a handrail. The game has no climb verb.
const RAMP_W = 1.6;
const rampGrades: number[] = [];
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
/** One flight along u at `lat`, rising from y0 at u0 to y1 at u1; `slip` is the beach-like slipway (no treads or rails). */
function flight(u0: number, u1: number, lat: number, y0: number, y1: number, slip = false) {
  beam(slip ? SAND : CONCRETE, p3(u0, lat, y0), p3(u1, lat, y1), RAMP_W, 0.4);
  rampGrades.push(+((Math.atan2(Math.abs(y1 - y0), Math.abs(u1 - u0)) * 180) / Math.PI).toFixed(1));
  if (slip) return;
  const len = Math.abs(u1 - u0),
    y = (t: number) => y0 + (y1 - y0) * t;
  for (let k = 0; k * 0.4 < len - 0.2; k++) {
    const t0 = (k * 0.4) / len,
      t1 = (k * 0.4 + 0.22) / len;
    beam(
      TIMBER,
      p3(u0 + (u1 - u0) * t0, lat, y(t0) + 0.05),
      p3(u0 + (u1 - u0) * t1, lat, y(t1) + 0.05),
      RAMP_W - 0.3,
      0.05,
      false,
    );
  }
  for (const s of [-1, 1]) {
    const e = lat + s * (RAMP_W / 2 - 0.06);
    beam(CONCRETE, p3(u0, e, y0 + 0.25), p3(u1, e, y1 + 0.25), 0.12, 0.25, false); // the kerb
    handrail(u0, lat + s * 0.85, u1, lat + s * 0.85, y0, y1);
  }
  for (const t of [0.5]) {
    const c = at(u0 + (u1 - u0) * t, lat);
    post(TIMBER_DARK, c.x, c.z, -6, y(t) - 0.45, 0.4, 0.4, false);
  }
}
/** A flat landing, solid, with a pile under its middle and a rail along the named sea-facing edges. */
function landing(u0: number, u1: number, l0: number, l1: number, y: number, rails: ('l0' | 'l1' | 'u0' | 'u1')[]) {
  deck(CONCRETE, u0, u1, l0, l1, () => y, 50);
  const c = at((u0 + u1) / 2, (l0 + l1) / 2);
  post(TIMBER_DARK, c.x, c.z, -6, y - 0.5, 0.6, 0.6, false);
  if (rails.includes('l0')) handrail(u0, l0 + 0.05, u1, l0 + 0.05, y, y);
  if (rails.includes('l1')) handrail(u0, l1 - 0.05, u1, l1 - 0.05, y, y);
  if (rails.includes('u0')) handrail(u0, l0, u0, l1, y, y);
  if (rails.includes('u1')) handrail(u1, l0, u1, l1, y, y);
}

// ---------------------------------------------------------------- our side: the bow, the bents, the railhead
deck(TIMBER, 0, L.railhead, FORM.left, FORM.right, deckY);
track(0, L.railhead - 2, deckY);
for (let n = 1; n <= 13; n++) {
  const u = 20 * n,
    top = deckY(u) - 0.5;
  for (const lat of [FORM.left + 0.6, FORM.mid, FORM.right - 0.6]) {
    const c = at(u, lat);
    post(TIMBER_DARK, c.x, c.z, -6, top, 0.8);
  }
  beam(TIMBER_DARK, p3(u - 0.01, FORM.left, top), p3(u + 0.01, FORM.right, top), 0.9, 0.7, false);
}
// The railhead: a buffer stop, and a platform at least 4 m wide beside the track for the rack, jib and lever (finding 6),
// whose end is where you take off.
const rh = L.railhead;
{
  const b = at(rh - 1.5, 0);
  post(TIMBER_DARK, b.x, b.z, deckY(rh) + 0.2, deckY(rh) + 1.4, 2.6, 0.6);
}
const platTop = (u: number) => deckY(u) + 0.9;
deck(TIMBER, rh - 25, rh, FORM.right, FORM.right + 4.5, platTop, 25);
for (const u of [rh - 22, rh - 12, rh - 1]) {
  const c = at(u, FORM.right + 4);
  post(TIMBER_DARK, c.x, c.z, -6, platTop(u) - 0.5, 0.6);
}
{
  const rack = at(rh - 18, FORM.right + 3);
  post(TIMBER_DARK, rack.x, rack.z, platTop(rh - 18), platTop(rh - 18) + 1.6, 1.6, 3); // the counterweight rack
  const lever = at(rh - 22, FORM.right + 1);
  post(RAIL, lever.x, lever.z, platTop(rh - 22), platTop(rh - 22) + 1.3, 0.15); // the request lever
  // the jib: a mast at the platform's end, its arm out over the gap toward the leaf's bracket
  const mast = at(rh - 3, FORM.right + 3.6);
  post(TIMBER_DARK, mast.x, mast.z, platTop(rh - 3), platTop(rh - 3) + 9, 0.5);
  beam(
    TIMBER_DARK,
    p3(rh - 3, FORM.right + 3.6, platTop(rh) + 8.5),
    p3(rh + 9, FORM.right - 1, platTop(rh) + 7.5),
    0.4,
    0.4,
  );
}
// The hook ring on its own sea post (ruling 1): 10 m into the gap, 12 m east of line 2's track, the ring 17.5 m up.
// The pile is solid only to 3 m above the sea; above that a thin spar, nothing to stand on.
{
  const h = L.hookPile,
    c = at(h.u, h.lat);
  post(TIMBER_DARK, c.x, c.z, -6, 3, 1.1);
  post(TIMBER_DARK, c.x, c.z, 3, h.y - 0.9, 0.3, 0.3, false);
  add(
    RING,
    new THREE.TorusGeometry(0.9, 0.12, 8, 20),
    tmp.compose(
      new THREE.Vector3(c.x, h.y, c.z),
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  // the hook's landing spot: a gold pad on the railhead platform's end, 5 m east of the track
  const pad = at(rh - 1.8, L.landPad.lat);
  add(
    GOLD,
    new THREE.CylinderGeometry(1.1, 1.1, 0.06, 18),
    tmp.makeTranslation(pad.x, platTop(rh - 1.8) + 0.03, pad.z),
  );
  // a waist-high rail along the track side of the platform's last 5 m, keeping the glide lane clear of the leaf
  beam(
    RAIL,
    p3(rh - 5, FORM.right + 0.15, platTop(rh - 5) + 1.1),
    p3(rh, FORM.right + 0.15, platTop(rh) + 1.1),
    0.12,
    1.1,
  );
}
// The last bent's ramp (ruling 2): a slipway at lat 14, then three switchback flights up the platform's east side,
// 15.6 m to its deck, about 27 m of slope.
{
  const top = platTop(250); // the platform follows the 4% grade: 16.0 m here, 15.6 m at its end
  flight(232, 238, 14, -1.2, 0.4, true);
  flight(238, 248, 14, 0.4, 5.6);
  landing(248, 251, 10.8, 14.8, 5.6, ['l1', 'u1']);
  flight(248, 238, 11.8, 5.6, 10.6);
  landing(235, 238, 8.7, 12.7, 10.6, ['l1', 'u0']);
  flight(238, 248, 9.6, 10.6, top);
  landing(248, 252, FORM.right + 4.4, 10.4, top, ['l1', 'u1']);
}

// ---------------------------------------------------------------- their side: the hinge pier, the brace platform, the leaf
// The hinge pier carries the leaf's heel; its east wing is the brace platform, 4 m down, open to the sky and in line
// with the railhead platform, so the glide passes beside the raised leaf instead of into it.
{
  for (const [u0, u1] of [
    [L.hinge - 3, L.hinge + 3],
    [L.hinge + 3, L.hinge + 20],
  ] as const) {
    const c = at((u0 + u1) / 2, FORM.mid);
    post(STEEL_DARK, c.x, c.z, -6, deckY(u1) - 0.5, FORM.right - FORM.left - 0.4, u1 - u0, true);
  }
  // the brace platform (lat 2..10, u hinge..hinge+12), on its own leg
  const w0 = FORM.right + 0.4,
    w1 = FORM.right + 8.4;
  deck(CONCRETE, L.hinge - 0.5, L.hinge + 12, w0, w1, () => braceY, 12.5);
  const leg = at(L.hinge + 6, (w0 + w1) / 2);
  post(STEEL_DARK, leg.x, leg.z, -6, braceY - 0.5, 3, 6);
  // the brace: a gold strut under the heel, on the platform, facing the railhead (finding 4)
  beam(
    GOLD,
    p3(L.hinge + 0.6, FORM.right + 1.2, braceY + 0.3),
    p3(L.hinge + 0.2, FORM.right + 0.2, hingeY - 0.6),
    0.6,
    0.6,
    false,
  );
  post(GOLD, at(L.hinge + 1.5, FORM.right + 1.6).x, at(L.hinge + 1.5, FORM.right + 1.6).z, braceY, braceY + 0.5, 1.4);
  // one of the folk on the platform, waving you over (elbow-pointing is theirs)
  const f = at(L.hinge + 4, FORM.right + 5);
  folk(f.x, braceY, f.z);
  // steps up from the platform to their deck
  beam(
    CONCRETE,
    p3(L.hinge + 12, FORM.right + 1.6, braceY),
    p3(L.hinge + 22, FORM.right + 1.6, deckY(L.hinge + 22)),
    2.8,
    0.4,
  );
  // the hinge pier's ramp (ruling 2): foot on the far, east side, two flights up round the platform's east end
  flight(280, 286, 16, -1.2, 0.4, true);
  flight(286, 296, 16, 0.4, 5.4);
  landing(296, 299, 12.9, 16.9, 5.4, ['l1', 'u1', 'l0']);
  flight(296, 287, 13.8, 5.4, braceY);
  landing(283.5, 287, w1 - 0.2, 14.7, braceY, ['l1', 'u0']);
}
// The raised leaf: 17 m of orange steel, hinged at the heel, toe up toward Home (78 degrees), the empty counterweight
// bracket painted on its Home face.
{
  const leaf = new THREE.Group();
  const hinge = at(L.hinge, FORM.mid);
  leaf.position.set(hinge.x, hingeY, hinge.z);
  // local +z toward Home (yaw turned half round from the line's heading), then the toe tipped up 78 degrees
  leaf.rotation.set((-78 * Math.PI) / 180, YAW + Math.PI, 0, 'YXZ');
  leaf.updateMatrixWorld(true);
  const W = FORM.right - FORM.left;
  const local = (geo: THREE.BufferGeometry, x: number, y: number, z: number) =>
    geo.applyMatrix4(tmp.makeTranslation(x, y, z)).applyMatrix4(leaf.matrixWorld);
  // the deck plate: local +z toward Home, top face at y 0
  add(STEEL, local(new THREE.BoxGeometry(W, 0.8, L.gap), 0, -0.4, L.gap / 2));
  const m = new THREE.Matrix4().multiplyMatrices(
    leaf.matrixWorld,
    new THREE.Matrix4().makeTranslation(0, -0.4, L.gap / 2),
  );
  solidBox(W, 0.8, L.gap, m);
  for (const s of [-W / 2 + 0.2, W / 2 - 0.2])
    add(STEEL_DARK, local(new THREE.BoxGeometry(0.4, 1.4, L.gap), s, 0.3, L.gap / 2));
  for (const t of TRACKS)
    for (const r of [-0.5, 0.5])
      add(RAIL, local(new THREE.BoxGeometry(0.12, 0.14, L.gap - 0.4), t - FORM.mid + r, 0.15, L.gap / 2));
  // the counterweight bracket, empty, with its painted outline
  add(GOLD, local(new THREE.BoxGeometry(W - 1, 0.05, 2.6), 0, 0.03, L.gap * 0.3));
  add(STEEL_DARK, local(new THREE.BoxGeometry(2.4, 0.6, 1.2), 0, 0.3, L.gap * 0.3));
}

// ---------------------------------------------------------------- the Pilgrims' Way: the folk's half-crossing to the halt
const wayEnd = L.halt[1] + 2;
deck(STEEL, L.hinge, wayEnd, FORM.left, FORM.right, deckY);
track(L.hinge, wayEnd, deckY);
for (let u = L.hinge + 3; u <= L.halt[0]; u += 6) {
  // the side girders' posts: a truss rhythm along the Way
  for (const lat of [FORM.left + 0.15, FORM.right - 0.15]) {
    const c = at(u, lat);
    post(STEEL_DARK, c.x, c.z, deckY(u), deckY(u) + 1.4, 0.25, 0.25, false);
  }
}
for (const lat of [FORM.left + 0.15, FORM.right - 0.15])
  for (let u = L.hinge + 3; u < L.halt[0]; u += 10) {
    const v = Math.min(L.halt[0], u + 10);
    beam(STEEL_DARK, p3(u, lat, deckY(u) + 1.4), p3(v, lat, deckY(v) + 1.4), 0.25, 0.3, false);
  }
for (let u = L.hinge + 40; u < L.halt[0]; u += 20) {
  const c = at(u, FORM.mid);
  post(STEEL_DARK, c.x, c.z, -6, deckY(u) - 0.5, 6, 1.2);
}

// ---------------------------------------------------------------- the island halt and its turning loop
const haltY = deckY(L.halt[0]);
{
  // a platform outside each track (5.8 m off the formation's middle), 0.9 m over the deck
  for (const [l0, l1] of [
    [FORM.right, FORM.right + 3.5],
    [FORM.left - 3.5, FORM.left],
  ] as const)
    deck(CONCRETE, L.halt[0], L.halt[1], l0, l1, () => haltY + 0.9, 40);
  // a fill under the halt, down to the shore
  const c = at((L.halt[0] + L.halt[1]) / 2, FORM.mid);
  post(SAND, c.x, c.z, -4, haltY - 0.5, 15, L.halt[1] - L.halt[0], true);
  // the RINGWORKS board (blank: its words are the owner's) and the steel waiting under a tarp (design review finding 5)
  const sign = at(L.halt[0] + 20, FORM.right + 3.2);
  post(RAIL, sign.x, sign.z, haltY + 0.9, haltY + 3.4, 0.15);
  post(STEEL, sign.x, sign.z, haltY + 3.4, haltY + 4.6, 0.25, 5, false);
  const stack = at(L.halt[0] + 8, FORM.right + 9);
  post(STEEL, stack.x, stack.z, -1, haltY + 0.9, 8, 14);
  post(TARP, stack.x, stack.z, haltY + 0.9, haltY + 2.6, 6, 10);
}
// The branch read (ruling 4), beside the west platform: a two-armed fingerpost, each arm along its line with a painted
// emblem (the Gorge's split, Canopy's tree; the place names are left for the owner's copy), and the low map display
// with the branch lines drawn on it, dashed and their stations dim until laid.
{
  const halt = at((L.halt[0] + L.halt[1]) / 2, FORM.mid),
    deckTop = haltY + 0.9;
  const toward = (x: number, z: number) => {
    const dx = x - halt.x,
      dz = z - halt.z,
      n = Math.hypot(dx, dz);
    return { x: dx / n, z: dz / n };
  };
  const GORGE = toward(-103, -1988), // High Gorge: the stack line
    CANOPY = toward(-1085, -313); // Canopy Town: the bay trestle
  const fp = at(L.halt[1] - 4, FORM.left - 1.7); // the platforms' north end, where the walk to the west platform ends
  post(TIMBER_DARK, fp.x, fp.z, deckTop, deckTop + 3.7, 0.28, 0.28, false);
  for (const [dir, y, emblem] of [
    [GORGE, 3.2, 'gorge'],
    [CANOPY, 2.45, 'canopy'],
  ] as const) {
    // built along local +x, then turned so +x runs along the line
    const M = new THREE.Matrix4().compose(
      new THREE.Vector3(fp.x, deckTop + y, fp.z),
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(-dir.z, dir.x)),
      new THREE.Vector3(1, 1, 1),
    );
    const piece = (color: string, geo: THREE.BufferGeometry, x: number, py: number, z: number, rx = 0, rz = 0) =>
      add(
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
        // a forked "Y" in gold
        piece(GOLD, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.1, z);
        piece(GOLD, new THREE.BoxGeometry(0.06, 0.24, 0.02), 0.88, 0.1, z, 0, 0.5);
        piece(GOLD, new THREE.BoxGeometry(0.06, 0.24, 0.02), 1.02, 0.1, z, 0, -0.5);
      } else {
        // a round green tree on a trunk
        piece(TIMBER_DARK, new THREE.BoxGeometry(0.06, 0.2, 0.02), 0.95, -0.12, z);
        piece(FOLK, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12), 0.95, 0.06, z, Math.PI / 2);
      }
    }
  }
  // the map: a low table 0.95 m up, north (-z) at the top, the halt at its south-east corner
  const mc = at(L.halt[0] + 14, FORM.left - 1.75),
    top = deckTop + 0.95;
  const flat2 = (color: string, w: number, d: number, x: number, z: number, h = 0.03, rotY = 0) =>
    add(
      color,
      new THREE.BoxGeometry(w, h, d),
      new THREE.Matrix4().compose(
        new THREE.Vector3(mc.x + x, top + h / 2, mc.z + z),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotY),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  flat2(TARP, 2.4, 2.0, 0, 0, 0.08);
  for (const [x = 0, z = 0] of [
    [-1.0, -0.8],
    [1.0, -0.8],
    [-1.0, 0.8],
    [1.0, 0.8],
  ])
    post(TIMBER_DARK, mc.x + x, mc.z + z, deckTop, top, 0.12, 0.12, false);
  const hx = 1.0,
    hz = 0.35,
    lay = 0.08 + 0.005;
  const line = (color: string, dx: number, dz: number, len: number, dashed: boolean) => {
    const rot = Math.atan2(-dz, dx);
    const seg = dashed ? 0.12 : len;
    for (let d = 0; d < len - 1e-6; d += dashed ? 0.2 : len) {
      const l = Math.min(seg, len - d),
        c = d + l / 2;
      add(
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
    add(
      color,
      new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12),
      tmp.makeTranslation(mc.x + hx + dx * len, top + lay + 0.015, mc.z + hz + dz * len),
    );
  line(RING, 0, -1, 1.2, false); // the laid line north, to Home
  station(RING, 0, -1, 1.2);
  line(STEEL, GORGE.x, GORGE.z, 1.4, true); // the stack line, to the Gorge
  station(BED, GORGE.x, GORGE.z, 1.4);
  line(FOLK, CANOPY.x, CANOPY.z, 2.05, true); // the bay trestle, to Canopy
  station(BED, CANOPY.x, CANOPY.z, 2.05);
  station(GOLD, 0, 0, 0); // this halt
}
// The loop: line 2's track runs off the halt's end and swings round over the shallows, back onto the other track, so
// the train turns for Home without reversing (generic lines, "Turnbacks").
{
  const { x: cx, z: cz, r } = L.loop;
  const N = 36;
  const ring = (a: number) => ({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, y: haltY });
  // the loop deck, its track and its legs, leaving a mouth where the links come in (west, toward the halt)
  const mouth = Math.PI; // west
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2,
      a1 = ((i + 1) / N) * Math.PI * 2;
    const da = Math.abs((((a0 + a1) / 2 - mouth + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (da < 0.2) continue;
    const a = ring(a0),
      b = ring(a1);
    beam(STEEL, a, b, 5, 0.5);
    beam(BED, { ...a, y: haltY + 0.08 }, { ...b, y: haltY + 0.08 }, 2.4, 0.1, false);
    for (const s of [-0.5, 0.5]) {
      const ra = ring(a0),
        rb = ring(a1);
      const k = (r + s) / r;
      beam(
        RAIL,
        { x: cx + (ra.x - cx) * k, z: cz + (ra.z - cz) * k, y: haltY + 0.22 },
        { x: cx + (rb.x - cx) * k, z: cz + (rb.z - cz) * k, y: haltY + 0.22 },
        0.12,
        0.14,
        false,
      );
    }
    if (i % 3 === 0) post(STEEL_DARK, a.x, a.z, -4, haltY - 0.5, 1.6, 1.6, false);
  }
  // the two links from the halt's end into the loop's mouth (a balloon's neck)
  const end = L.halt[1];
  for (const [t, a] of [
    [0, mouth - 0.22],
    [-4, mouth + 0.22],
  ] as const) {
    const from = p3(end, t, haltY),
      mid = p3(end + 12, t, haltY),
      to = ring(a);
    beam(STEEL, from, mid, 4.4, 0.5);
    beam(STEEL, mid, to, 4.4, 0.5);
    for (const [p, q] of [
      [from, mid],
      [mid, to],
    ] as const) {
      beam(BED, { ...p, y: haltY + 0.08 }, { ...q, y: haltY + 0.08 }, 2.4, 0.1, false);
    }
  }
}

// ---------------------------------------------------------------- the concourse, the station house and the edge paint
// `&house=0` leaves all three out (today's halt), so the draw count can be measured with and without them.
const HOUSE_ON = new URLSearchParams(location.search).get('house') !== '0';
// Junction-stations design review, finding 1 (docs/brainstorms/junction-stations.md): the house stands at the halt's
// north-west corner, where land touches the fill, on a terrace level with the platforms; the way between the platforms
// is a plank crossing at their north end that runs on into the terrace and the house door. The house leans (its two long
// walls, 24 degrees), has a doorway with no leaf and a 5 x 4 m room under a 3.2 m ceiling, and a bench facing a tall
// tilted window that the lean points at the shard. Numbers and colliders: ./ring-house.ts (and test/ring-house.test.ts).
if (HOUSE_ON) {
  const cr = CONCOURSE.crossing,
    tr = CONCOURSE.terrace;
  // the crossing's planks, over the track ends, one level with both platforms (drawn raised: see the README)
  const mid = (u0: number, u1: number, l0: number, l1: number) => at((u0 + u1) / 2, (l0 + l1) / 2);
  const cp = mid(cr.u0, cr.u1, cr.lat0, cr.lat1);
  post(TIMBER, cp.x, cp.z, CONCOURSE.y - 0.5, CONCOURSE.y, cr.lat1 - cr.lat0, cr.u1 - cr.u0);
  // the terrace: a retained fill up to platform height, the house's floor and its forecourt
  const tp = mid(tr.u0, tr.u1, tr.lat0, tr.lat1);
  post(CONCRETE, tp.x, tp.z, -2, CONCOURSE.y, tr.lat1 - tr.lat0, tr.u1 - tr.u0);

  // the house, local frame to world
  const c0 = at(HOUSE.u, HOUSE.lat);
  const base = new THREE.Matrix4().compose(
    new THREE.Vector3(c0.x, HOUSE.floorY, c0.z),
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, houseYaw()),
    new THREE.Vector3(1, 1, 1),
  );
  const X = new THREE.Vector3(1, 0, 0);
  const place = (b: { x: number; y: number; z: number; rx: number }) =>
    new THREE.Matrix4().multiplyMatrices(
      base,
      new THREE.Matrix4().compose(
        new THREE.Vector3(b.x, b.y, b.z),
        new THREE.Quaternion().setFromAxisAngle(X, b.rx),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  for (const b of houseBoxes()) {
    const m = place(b);
    solidBox(b.hx * 2, b.hy * 2, b.hz * 2, m);
    if (b.name === 'east' || b.name === 'west') continue; // drawn below, as parallelograms
    const color = b.name === 'roof' ? RING : b.name.startsWith('bench') ? TIMBER_DARK : PATH;
    add(color, new THREE.BoxGeometry(b.hx * 2, b.hy * 2, b.hz * 2), m);
  }
  // the side walls: parallelograms, vertical at the floor and leaning with the long walls at the top
  const tan = Math.tan((HOUSE.lean * Math.PI) / 180),
    h = HOUSE.room.h,
    zn = -(HOUSE.room.d / 2 + HOUSE.wall),
    zs = HOUSE.room.d / 2 + HOUSE.wall;
  const outline = new THREE.Shape();
  outline.moveTo(zn, 0);
  outline.lineTo(zs, 0);
  outline.lineTo(zs + h * tan, h);
  outline.lineTo(zn + h * tan, h);
  const toLocal = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(-1, 0, 0),
  );
  for (const x of [HOUSE.room.w / 2 + HOUSE.wall, -HOUSE.room.w / 2]) {
    const geo = new THREE.ExtrudeGeometry(outline, { depth: HOUSE.wall, bevelEnabled: false });
    geo.applyMatrix4(toLocal).applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, 0));
    add(PATH, geo, base);
  }
  // the window's frame: four orange bars, a little proud of the leaning wall
  {
    const w = HOUSE.window,
      zp = zn + HOUSE.wall / 2,
      bar = (x0: number, x1: number, s0: number, s1: number) => {
        const piece = slab('frame', zp, x0, x1, s0, s1);
        add(STEEL, new THREE.BoxGeometry(piece.hx * 2, piece.hy * 2, HOUSE.wall + 0.12), place(piece));
      };
    bar(-w.w / 2 - 0.12, -w.w / 2, w.s0 - 0.12, w.s1 + 0.12);
    bar(w.w / 2, w.w / 2 + 0.12, w.s0 - 0.12, w.s1 + 0.12);
    bar(-w.w / 2, w.w / 2, w.s0 - 0.12, w.s0);
    bar(-w.w / 2, w.w / 2, w.s1, w.s1 + 0.12);
  }
  // the floor: boards over the terrace, inside the walls
  add(
    SAND,
    new THREE.BoxGeometry(HOUSE.room.w, 0.03, HOUSE.room.d),
    new THREE.Matrix4().multiplyMatrices(base, new THREE.Matrix4().makeTranslation(0, 0.015, 0)),
  );
}
// The platform edges, painted in line 2's colour: a stripe along each edge and LOOK UP in block letters beside it, the
// right way up for someone standing on the platform and facing the track. Draft copy for the owner (the brief's joke).
if (HOUSE_ON) {
  const GLYPH: Record<string, string[]> = {
    L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
    O: ['.XXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
    K: ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
    U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
    P: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X....', 'X....', 'X....'],
  };
  const TEXT = 'LOOK UP',
    px = 0.14,
    top = haltY + 0.9;
  const cols = [...TEXT].reduce((n, ch) => n + (ch === ' ' ? 4 : 6), -1);
  for (const [edge, away, sign] of [
    [FORM.left, -1, -1], // west platform: facing east, left is north, the text runs south; its top toward the track
    [FORM.right, 1, 1], // east platform: facing west, left is south, the text runs north; its top toward the track
  ] as const) {
    const stripe = at(448, edge + away * 0.15);
    post(LINE2, stripe.x, stripe.z, top - 0.01, top + 0.012, 0.3, 36, false);
    const u0 = 446 - (sign * cols * px) / 2;
    let col = 0;
    for (const ch of TEXT) {
      GLYPH[ch]?.forEach((row, r) =>
        [...row].forEach((cell, k) => {
          if (cell !== 'X') return;
          const p = at(u0 + sign * (col + k + 0.5) * px, edge + away * (0.4 + r * px));
          post(LINE2, p.x, p.z, top - 0.01, top + 0.012, px * 0.92, px * 0.92, false);
        }),
      );
      col += ch === ' ' ? 4 : 6;
    }
  }
}

// ---------------------------------------------------------------- the island: the live cones, solid; the shore; the path
// The cones exactly as Place's buildFar draws them (src/proto/place/land.ts), as trimesh solids, so the shore and the
// slopes are walkable; a sand band marks the shore; a trodden path climbs to the lookout on the main cone's summit.
const CX = FAR.x + ORIGIN.x,
  CZ = FAR.z + ORIGIN.z;
const cones = new THREE.Group();
for (const [dx, dz, r, h] of RING_CONES) {
  const geo = new THREE.ConeGeometry(r, h, 7);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(CX + dx, h / 2 - 4, CZ + dz),
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, dx),
    new THREE.Vector3(1, 1, 1),
  );
  geo.applyMatrix4(m);
  shapes.push({
    kind: 'trimesh',
    vertices: Array.from(geo.getAttribute('position').array),
    indices: Array.from(geo.index!.array),
  });
  cones.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial()));
}
cones.updateMatrixWorld(true);
const ray = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
/** The live cones' surface height at (x, z) (the sea, -1, where none stands). */
function coneY(x: number, z: number) {
  ray.set(new THREE.Vector3(x, 400, z), down);
  const hit = ray.intersectObjects(cones.children, false)[0];
  return hit ? hit.point.y : -1;
}
{
  // the shore: the main cone's skirt from under the water to 2.5 m, in sand, a hair proud of the dark cone
  const [, , r, h] = RING_CONES[0]!;
  const top = 2.5,
    rTop = (r * (h - 4 - top)) / h,
    rBot = (r * (h - 4 + 2)) / h;
  add(
    SAND,
    new THREE.CylinderGeometry(rTop * 1.003, rBot * 1.003, top + 2, 7, 1, true),
    new THREE.Matrix4().makeTranslation(CX, top / 2 - 1, CZ),
  );
}
{
  // the path: off the halt's west platform, round the shoulder and up the main cone's slope to the lookout
  // a ramp down off the west platform's north end onto the slope
  const top = at(L.halt[1] - 4, FORM.left - 3.3),
    start = at(L.halt[1] - 4, FORM.left - 13);
  beam(CONCRETE, { ...top, y: haltY + 0.9 }, { ...start, y: coneY(start.x, start.z) + 0.15 }, 3, 0.4);
  const way: [number, number][] = [
    [start.x, start.z],
    [start.x - 18, start.z - 8],
    [1380, -870],
    [1395, -930],
    [1360, -975],
    [1372, -1035],
    [1345, -1075],
    [CX + 4, CZ + 6],
  ];
  for (let i = 0; i < way.length - 1; i++) {
    const [ax, az] = way[i]!,
      [bx, bz] = way[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 6));
    for (let k = 0; k < n; k++) {
      const x0 = ax + ((bx - ax) * k) / n,
        z0 = az + ((bz - az) * k) / n,
        x1 = ax + ((bx - ax) * (k + 1)) / n,
        z1 = az + ((bz - az) * (k + 1)) / n;
      beam(PATH, { x: x0, y: coneY(x0, z0) + 0.12, z: z0 }, { x: x1, y: coneY(x1, z1) + 0.12, z: z1 }, 2.6, 0.3, false);
    }
  }
  // the lookout: a railed deck on the summit, the shard 74 m overhead in the ring
  const y = coneY(CX, CZ) + 0.3;
  add(CONCRETE, new THREE.CylinderGeometry(6, 6.5, 1.2, 7), new THREE.Matrix4().makeTranslation(CX, y - 0.6, CZ));
  shapes.push({ kind: 'cylinder', rTop: 6, rBottom: 6.5, h: 1.2, segments: 7, offset: { x: CX, y: y - 0.6, z: CZ } });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    post(STEEL, CX + Math.cos(a) * 5.7, CZ + Math.sin(a) * 5.7, y, y + 1.1, 0.15, 0.15, false);
  }
  folk(CX + 2, y, CZ - 1.5); // a looker, on shift
}

// ---------------------------------------------------------------- one mesh per colour, one static body
const root = new THREE.Group();
root.name = 'ring-greybox';
for (const [color, list] of parts) {
  const mesh = new THREE.Mesh(mergeGeometries(list), flat(color, color === GOLD ? 0.5 : 0.95));
  mesh.castShadow = mesh.receiveShadow = true;
  root.add(mesh);
}
addBody(createBody({ material: groundMat, group: GROUP.SCENERY, position: { x: 0, y: 0, z: 0 }, shapes }));
root.visible = false;
scene.add(root);
background(
  precompile(root).then(() => {
    root.visible = true;
    setTimeout(() => refreshMaterials(root), 500);
  }),
  'ring greybox pipelines',
);

/** Named views for stills and visitors (world metres): the pier head, the last bent, the halt, the lookout. */
const views = {
  pier: { cam: p3(-6, FORM.mid + 3, 26.2), look: p3(L.hinge, FORM.mid, hingeY + 8) },
  gap: {
    cam: p3(L.railhead - 1, FORM.right + 3.5, platTop(L.railhead) + 1.7),
    look: p3(L.hinge + 8, FORM.right + 4, braceY),
  },
  // toward the branch choice: High Gorge (-103, -1988) and Canopy Town (-1085, -313) both lie west
  halt: { cam: p3(L.halt[0] + 14, FORM.left - 4.5, haltY + 2.6), look: { x: 900, y: 20, z: -980 } },
  hook: {
    cam: p3(L.hinge + 4, FORM.right + 5, braceY + 1.7),
    look: p3(L.hookPile.u, L.hookPile.lat, L.hookPile.y - 3),
  },
  hingeRamp: { cam: p3(322, 20, 1.2), look: p3(292, 15, 4.5) },
  bentRamp: { cam: p3(222, 20, 1.2), look: p3(244, 12, 7) },
  fingerpost: {
    cam: p3(L.halt[1] - 14, FORM.left - 1.2, haltY + 2.6),
    look: p3(L.halt[1] - 4, FORM.left - 1.7, haltY + 2.6),
  },
  lookout: { cam: { x: CX + 4, y: coneY(CX, CZ) + 2, z: CZ + 3 }, look: { x: CX - 400, y: 50, z: CZ - 30 } },
};
const api = { root, views, layout: L, deckY, coneY, at, braceY, hingeY };
(window as unknown as { __ring: typeof api }).__ring = api;
console.log(
  'RING GREYBOX',
  JSON.stringify({ meshes: root.children.length, solids: shapes.length, braceY, hingeY, rampGrades }),
);
