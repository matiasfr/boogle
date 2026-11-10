// ?ring=greybox, in any build: Ring Island's near view as a walkable greybox, the Meet laid out at the 10 November
// rulings (docs/brainstorms/ring-island.md, docs/plans/world-blockout.md "Rulings"). Our bow at 4% out to the railhead,
// the gap, the folk's orange half-crossing (the Pilgrims' Way) with its raised leaf, the brace platform, the hook ring,
// ladders out of the sea, the island halt with its turning loop, the shore and the path up to the summit lookout under
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
import { refreshMaterials } from './build.ts';

// ---------------------------------------------------------------- the layout (world metres; u = metres out from the pier head)
/** Line 2's track at the pier head (the crossing's line: bent n stands at u = 20 n, CROSSING_BENTS), and its heading. */
const HEAD = { x: 1402.0, z: -372 };
const HX = 0.0272;
/** Where along u, and how far right (east) of line 2's track, in world x/z. */
const at = (u: number, lat = 0) => ({ x: HEAD.x + HX * u + lat, z: HEAD.z - u + HX * lat });
/** The ruling grade's bow: level to the first bent, then 4% down to the island halt, level after (ruling 2). */
const deckY = (u: number) => (u <= 20 ? 24.3 : Math.max(7.5, 24.3 - 0.04 * (u - 20)));
/** The double formation (ruling 11): 7.6 m, its middle 2 m west of line 2's track; the second track 4 m west. */
const FORM = { left: -5.8, right: 1.8, mid: -2 };
const TRACKS = [0, -4];
export const RING_LAYOUT = {
  railhead: 260, // bent 13, the last bent: the leaf's toe lands here
  gap: 17, // the leaf's length, 16-18 m (design review finding 1)
  hinge: 277,
  brace: 4, // the brace platform, metres under the hinge's deck
  halt: [428, 468] as const, // the island halt's platforms, centred on about (1414, -820)
  loop: { x: 1462, z: -822, r: 40 }, // the turning loop, over the shallows east of the halt
  lookout: { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z }, // the main cone's summit, under the shard
};
const L = RING_LAYOUT;
const hingeY = deckY(L.hinge);
const braceY = hingeY - L.brace;

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
/** A ladder's look: two stiles and rungs from (x, z) at `bottom` to `top`, on a face turned by `yaw`. */
function ladder(x: number, z: number, bottom: number, top: number, yaw: number) {
  const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  for (const s of [-0.4, 0.4]) {
    const o = new THREE.Vector3(s, 0, 0).applyQuaternion(q);
    add(
      GOLD,
      new THREE.BoxGeometry(0.1, top - bottom + 1, 0.1),
      tmp.compose(new THREE.Vector3(x + o.x, (bottom + top + 1) / 2, z + o.z), q, new THREE.Vector3(1, 1, 1)),
    );
  }
  for (let y = bottom + 0.3; y < top; y += 0.4)
    add(
      GOLD,
      new THREE.BoxGeometry(0.8, 0.06, 0.06),
      tmp.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)),
    );
}
/** The walkable stand-in for a ladder: a 50 degree stair-ramp (WALKABLE_NY allows 56), from the sea up to `top`,
 * running `dir` (a unit x/z) away from (x, z), its foot under water. The game has no climb verb. */
function seaStair(x: number, z: number, top: number, dir: { x: number; z: number }) {
  const run = (top + 1.5) / Math.tan((50 * Math.PI) / 180);
  beam(CONCRETE, { x, y: top, z }, { x: x + dir.x * run, y: -1.5, z: z + dir.z * run }, 1.6, 0.4);
  const yaw = Math.atan2(dir.x, dir.z);
  // the drawn ladder stands at the stair's foot, up the face it climbs
  ladder(x + dir.x * 0.3, z + dir.z * 0.3, -1, top, yaw);
}
/** A little folk figure: a body, a head and an orange hard hat. */
function folk(x: number, y: number, z: number) {
  add(FOLK, new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8), tmp.makeTranslation(x, y + 0.5, z));
  add(SAND, new THREE.SphereGeometry(0.3, 10, 8), tmp.makeTranslation(x, y + 1.3, z));
  add(HAT, new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), tmp.makeTranslation(x, y + 1.55, z));
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
// The hook ring on the last bent, beside the platform's end, facing the island (within 20 m of the brace platform).
const ringAt = { ...at(rh + 0.2, FORM.right + 6.2), y: platTop(rh) + 3.2 };
post(TIMBER_DARK, ringAt.x, ringAt.z, -6, ringAt.y - 0.9, 0.5);
add(
  RING,
  new THREE.TorusGeometry(0.9, 0.12, 8, 20),
  tmp.compose(
    new THREE.Vector3(ringAt.x, ringAt.y, ringAt.z),
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, YAW),
    new THREE.Vector3(1, 1, 1),
  ),
);
// The last bent's ladder: up out of the sea to the platform's end, on its east side.
{
  const foot = at(rh - 2, FORM.right + 4.7);
  seaStair(foot.x, foot.z, platTop(rh - 2), { x: 1, z: HX });
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
  // the hinge pier's ladder: up from the sea onto the brace platform's far edge
  const foot = at(L.hinge + 8, w1);
  seaStair(foot.x, foot.z, braceY, { x: 1, z: HX });
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
  lookout: { cam: { x: CX + 4, y: coneY(CX, CZ) + 2, z: CZ + 3 }, look: { x: CX - 400, y: 50, z: CZ - 30 } },
};
const api = { root, views, layout: L, deckY, coneY, at, braceY, hingeY };
(window as unknown as { __ring: typeof api }).__ring = api;
console.log('RING GREYBOX', JSON.stringify({ meshes: root.children.length, solids: shapes.length, braceY, hingeY }));
