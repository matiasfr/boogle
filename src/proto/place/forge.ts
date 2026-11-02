// The forge of ?proto=place: bare foundations and scaffolding from the start, and a crane that lifts each crate off the
// dock straight into it. Every crate adds its pieces (frame, walls, roof, chimney), and they drop into place: no scaling.
// When it's done the chimney lights and rails pour onto a rack in plain sight, which is why you go home.
// docs/proposals/boogle-2.md, 2026-11-02 "construction is physical" and "the next test". Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { removeBody } from '../../physics/engine.ts';
import { flat } from '../flat.ts';
import { box, draw, makeSet, place } from '../net/boxes.ts';
import { smooth } from '../net/town-fx.ts';
import { H, addStatic } from './land.ts';
import { CRANE, FORGE, ORIGIN, RACK, TUNE } from './layout.ts';
import { RAIL_SIZE, dropSet, dustRing, send } from './pieces.ts';

const WOOD = '#a9794c',
  WOOD2 = '#8a6236',
  STONE = '#b2ad9f',
  BRICK = '#9a4a3a',
  ROOF = '#5a5f6b',
  POLE = '#c9a86a';

const X = FORGE.x + ORIGIN.x,
  Z = FORGE.z + ORIGIN.z,
  Y = H(X, Z);
const W = FORGE.w,
  D = FORGE.d,
  HIGH = 4.6; // to the wall tops

// ---------------------------------------------------------------- what's there from the start
const part = (
  dx: number,
  dy: number,
  dz: number,
  w: number,
  h: number,
  d: number,
  color: string,
  tilt?: THREE.Euler,
) => {
  const b = box(X + dx, Z + dz, place(0, dy, 0, w, h, d, 0, tilt), color);
  b.y = Y;
  return b;
};
const start = [part(0, 0, 0, W + 1.6, 0.5, D + 1.6, STONE)];
for (const sx of [-1, 1])
  for (const sz of [-1, 1]) start.push(part((sx * (W + 1.4)) / 2, 0, (sz * (D + 1.4)) / 2, 0.22, HIGH + 3, 0.22, POLE));
for (const y of [1.8, 3.6, 5.6])
  for (const sz of [-1, 1]) {
    start.push(part(0, y, (sz * (D + 1.4)) / 2, W + 1.6, 0.14, 0.14, POLE));
    start.push(part((sz * (W + 1.4)) / 2, y, 0, 0.14, 0.14, D + 1.6, POLE));
  }
const scaffold = makeSet(start);
draw(scaffold, () => 1);
addStatic({ kind: 'box', hx: (W + 1.6) / 2, hy: 0.25, hz: (D + 1.6) / 2 }, { x: X, y: Y + 0.25, z: Z });

// ---------------------------------------------------------------- what the crates add, in the order they add it
const FLOOR = 0.5;
const pieces: ReturnType<typeof part>[] = [];
// Frame: posts, then the plates on them.
const posts: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
  [0.45, 1],
  [-0.45, 1],
  [-1, 0],
  [1, 0],
];
for (const [sx, sz] of posts) pieces.push(part((sx * W) / 2, FLOOR, (sz * D) / 2, 0.42, HIGH - FLOOR, 0.42, WOOD2));
for (const sz of [-1, 1]) pieces.push(part(0, HIGH, (sz * D) / 2, W + 0.5, 0.36, 0.42, WOOD2));
for (const sx of [-1, 1]) pieces.push(part((sx * W) / 2, HIGH, 0, 0.42, 0.36, D + 0.4, WOOD2));
const FRAME = pieces.length;
// Walls: boards row by row, a gap for the door on the south side, where the rails come out.
for (let row = 0; row < 5; row++) {
  const y = FLOOR + row * 0.82;
  for (const dx of [-W / 2 + 1.25, -W / 2 + 3.75, W / 2 - 3.75, W / 2 - 1.25])
    pieces.push(part(dx, y, -D / 2, 2.5, 0.8, 0.18, WOOD));
  for (const dz of [-D / 2 + 2, D / 2 - 2]) {
    pieces.push(part(-W / 2, y, dz, 0.18, 0.8, 4, WOOD));
    pieces.push(part(W / 2, y, dz, 0.18, 0.8, 4, WOOD));
  }
  pieces.push(part(-W / 2 + 1.35, y, D / 2, 2.7, 0.8, 0.18, WOOD));
  pieces.push(part(W / 2 - 1.35, y, D / 2, 2.7, 0.8, 0.18, WOOD));
  if (row >= 3) pieces.push(part(0, y, D / 2, W - 5.4, 0.8, 0.18, WOOD));
}
const WALLS = pieces.length;
// Roof: rafter boards up each slope, then the ridge.
const RISE = 2.1,
  slope = Math.hypot(RISE, D / 2 + 0.5),
  roofTilt = Math.atan2(RISE, D / 2 + 0.5);
for (let k = 0; k < 6; k++) {
  const dx = -W / 2 - 0.2 + ((k + 0.5) * (W + 0.4)) / 6;
  for (const sz of [-1, 1]) {
    const m = part(
      dx,
      HIGH + 0.36 + RISE / 2,
      (sz * (D / 2 + 0.5)) / 2,
      (W + 0.4) / 6 + 0.02,
      0.16,
      slope,
      ROOF,
      new THREE.Euler(sz * roofTilt, 0, 0),
    );
    pieces.push(m);
  }
}
pieces.push(part(0, HIGH + 0.3 + RISE, 0, W + 0.5, 0.26, 0.44, WOOD2));
const ROOFED = pieces.length;
// Chimney: brick courses up the north-west corner, past the ridge.
const CHIM = { dx: -W / 2 + 1.4, dz: -D / 2 + 1.2 };
for (let c = 0; c < 8; c++)
  pieces.push(part(CHIM.dx, HIGH - 1.4 + c * 1, CHIM.dz, 1.15, 1, 1.15, c % 2 ? BRICK : '#8a4032'));
const TOTAL = pieces.length;
const chimneyTop = new THREE.Vector3(X + CHIM.dx, Y + HIGH + 6.6, Z + CHIM.dz);

const set = dropSet(pieces, (k) => {
  const b = pieces[k]!;
  thump(b.x, b.z);
  dustRing(b.x, b.y + FLOOR + 0.1, b.z, k >= ROOFED ? 8 : 6, 2, 0.3);
});
pieces.forEach((_, k) => set.snap(k, false));
set.mesh.visible = true;

/** Pieces shown for this many crates. */
const piecesFor = (crates: number) => Math.min(TOTAL, Math.round((crates / TUNE.forgeCost) * TOTAL));

// A glowing mouth for when it's lit.
const mouth = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 1.8, 0.1),
  new THREE.MeshStandardNodeMaterial({ color: '#3a1a08', emissive: '#ff5a0a', emissiveIntensity: 1.3 }),
);
mouth.position.set(X, Y + 1.5, Z + D / 2 - 0.5);
mouth.visible = false;
scene.add(mouth);
const forgeWalls = { body: null as ReturnType<typeof addStatic> | null };
function wallsSolid(on: boolean) {
  if (on && !forgeWalls.body)
    forgeWalls.body = addStatic({ kind: 'box', hx: W / 2, hy: HIGH / 2, hz: D / 2 }, { x: X, y: Y + HIGH / 2, z: Z });
  if (!on && forgeWalls.body) {
    removeBody(forgeWalls.body);
    forgeWalls.body = null;
  }
}

// ---------------------------------------------------------------- the crane
const MAST = 13;
const CX = CRANE.x + ORIGIN.x,
  CZ = CRANE.z + ORIGIN.z,
  CY = H(CX, CZ);
const crane = new THREE.Group();
crane.position.set(CX, CY, CZ);
const pole = new THREE.Mesh(new THREE.BoxGeometry(0.7, MAST, 0.7), flat('#d9a03a'));
pole.position.y = MAST / 2;
pole.castShadow = true;
const jib = new THREE.Group();
jib.position.y = MAST;
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 15), flat('#e0b04a'));
arm.position.z = 5.5;
arm.castShadow = true;
const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.6), flat('#3a302c'));
counter.position.set(0, -0.3, -2);
jib.add(arm, counter);
crane.add(pole, jib);
scene.add(crane);
addStatic({ kind: 'box', hx: 0.35, hy: MAST / 2, hz: 0.35 }, { x: CX, y: CY + MAST / 2, z: CZ });
const rope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), flat('#2a2a2e'));
const hook = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.34), flat('#2a2a2e'));
scene.add(rope, hook);
const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), flat('#a8703a', 0.85));
crateMesh.castShadow = true;
crateMesh.visible = false;
scene.add(crateMesh);

type Job = { t: number; from: THREE.Vector3; to: THREE.Vector3; land: () => void };
let job: Job | null = null;
const hookAt = new THREE.Vector3(CX + 3, CY + 8, CZ),
  rest = new THREE.Vector3(CX + 3, CY + 8, CZ);
let jibYaw = 0;
const towards = (p: THREE.Vector3) => Math.atan2(p.x - CX, p.z - CZ);
const radius = (p: THREE.Vector3) => Math.hypot(p.x - CX, p.z - CZ);
/** The crane takes a crate from `from` to `to`. False while it's busy. */
export function craneLift(from: THREE.Vector3, to: THREE.Vector3, land: () => void) {
  if (job) return false;
  job = { t: 0, from: from.clone(), to: to.clone(), land };
  return true;
}
export const craneBusy = () => !!job;
export function craneClear() {
  job = null;
  crateMesh.visible = false;
}
const a = new THREE.Vector3();
const lerpPolar = (out: THREE.Vector3, p: THREE.Vector3, q: THREE.Vector3, u: number, y: number) => {
  const py = towards(p);
  let qy = towards(q);
  if (qy - py > Math.PI) qy -= Math.PI * 2;
  if (py - qy > Math.PI) qy += Math.PI * 2;
  const yaw = py + (qy - py) * u,
    r = radius(p) + (radius(q) - radius(p)) * u;
  return out.set(CX + Math.sin(yaw) * r, y, CZ + Math.cos(yaw) * r);
};
function updateCrane(dt: number) {
  const TOPY = CY + 9.5;
  if (job) {
    job.t += dt / TUNE.craneS;
    const u = job.t;
    const { from, to } = job;
    const CARRY = 0.22,
      HOIST = 0.34,
      SWING = 0.7,
      LOWER = 0.88;
    if (u < CARRY) hookAt.lerpVectors(rest, a.copy(from).setY(from.y + 0.6), smooth(u / CARRY));
    else if (u < HOIST)
      hookAt.copy(from).setY(from.y + 0.6 + (TOPY - from.y - 0.6) * smooth((u - CARRY) / (HOIST - CARRY)));
    else if (u < SWING) lerpPolar(hookAt, from, to, smooth((u - HOIST) / (SWING - HOIST)), TOPY);
    else if (u < LOWER) hookAt.copy(to).setY(TOPY + (to.y + 0.6 - TOPY) * ((u - SWING) / (LOWER - SWING)) ** 2);
    else {
      hookAt.copy(to).setY(to.y + 0.6);
      const land = job.land;
      rest.copy(hookAt).setY(TOPY);
      job = null;
      crateMesh.visible = false;
      land();
    }
    if (job) {
      crateMesh.visible = u >= CARRY;
      crateMesh.position.copy(hookAt).setY(hookAt.y - 0.6);
    }
  } else if (Math.abs(hookAt.y - rest.y) > 0.02) hookAt.y += (rest.y - hookAt.y) * Math.min(1, dt * 6);
  jibYaw = towards(hookAt);
  jib.rotation.y = jibYaw;
  const top = CY + MAST - 0.25;
  rope.position.set(hookAt.x, (top + hookAt.y) / 2, hookAt.z);
  rope.scale.y = Math.max(0.2, top - hookAt.y);
  hook.position.copy(hookAt);
}

// ---------------------------------------------------------------- the rack
const RX = RACK.x + ORIGIN.x,
  RZ = RACK.z + ORIGIN.z,
  RY = H(RX, RZ);
const rackPosts = new THREE.Group();
rackPosts.position.set(RX, RY, RZ);
for (const dz of [-1.2, 1.2])
  for (const dx of [-1.25, 1.25]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.8, 0.2), flat(WOOD2));
    m.position.set(dx, 0.9, dz);
    m.castShadow = true;
    rackPosts.add(m);
  }
for (const dz of [-1.2, 1.2]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.14, 0.2), flat(WOOD2));
  m.position.set(0, 0.32, dz);
  rackPosts.add(m);
}
scene.add(rackPosts);
addStatic({ kind: 'box', hx: 1.35, hy: 0.45, hz: 1.3 }, { x: RX, y: RY + 0.45, z: RZ });
const racked = new THREE.InstancedMesh(
  new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z),
  flat('#4c5058', 0.6),
  TUNE.rackMax,
);
racked.castShadow = true;
racked.frustumCulled = false;
racked.count = 0;
scene.add(racked);
const slot = (k: number, out: THREE.Vector3) => {
  const perRow = 8;
  return out.set(RX - 1 + (k % perRow) * 0.285, RY + 0.46 + Math.floor(k / perRow) * 0.19, RZ);
};
const m4 = new THREE.Matrix4();
function drawRack(n: number) {
  racked.count = n;
  for (let k = 0; k < n; k++) racked.setMatrixAt(k, m4.makeTranslation(slot(k, a)));
  racked.instanceMatrix.needsUpdate = true;
}
export const rackTop = (n: number, out: THREE.Vector3) => slot(Math.max(0, n - 1), out);
export const rackFrom = new THREE.Vector3(RX, RY + 1.6, RZ);

// ---------------------------------------------------------------- state
export const forge = {
  crates: 0, // crates that have landed in it
  rails: 0, // rails standing on the rack
  made: 0, // how many it has poured
  pour: 0,
  drawn: 0,
  lit: false,
};
/** Where the crane lowers the next crate: into the part it builds. */
export function nextDrop(out: THREE.Vector3) {
  const k = Math.min(TOTAL - 1, piecesFor(forge.crates));
  const b = pieces[k]!;
  return out.set(b.x, Y + Math.max(FLOOR + 1, k >= WALLS ? HIGH + 1.5 : k >= FRAME ? 2.5 : 2), b.z);
}
function dropPieces(k0: number, k1: number) {
  for (let k = k0; k < k1; k++) set.drop(k, 3.2, (k - k0) * 0.13);
}
const smokeCol = new THREE.Color('#5d5a55');
let smokeAcc = 0;
/** A crate just landed in the forge: its pieces drop. */
export function crateIn() {
  const was = piecesFor(forge.crates);
  forge.crates++;
  dropPieces(was, piecesFor(forge.crates));
  if (piecesFor(forge.crates) >= WALLS) wallsSolid(true);
}
export function snapForge() {
  const shown = piecesFor(forge.crates);
  pieces.forEach((_, k) => set.snap(k, k < shown));
  set.mesh.visible = true;
  wallsSolid(shown >= WALLS);
  forge.lit = forge.crates >= TUNE.forgeCost;
  mouth.visible = forge.lit;
  forge.drawn = forge.rails;
  drawRack(forge.rails);
}
export const forgePhase = () =>
  forge.crates >= TUNE.forgeCost
    ? 'chimney lit'
    : piecesFor(forge.crates) < FRAME
      ? 'frame'
      : piecesFor(forge.crates) < WALLS
        ? 'walls'
        : piecesFor(forge.crates) < ROOFED
          ? 'roof'
          : 'chimney';

export function updateForge(dt: number, onLit: () => void) {
  set.update(dt);
  updateCrane(dt);
  if (!forge.lit && forge.crates >= TUNE.forgeCost && !set.busy()) {
    forge.lit = true;
    mouth.visible = true;
    whistle(X, Z);
    onLit();
  }
  if (!forge.lit) return;
  smokeAcc += dt * 3;
  for (; smokeAcc >= 1; smokeAcc--)
    emit({
      x: chimneyTop.x + (Math.random() - 0.5) * 0.4,
      y: chimneyTop.y,
      z: chimneyTop.z + (Math.random() - 0.5) * 0.4,
      vx: 0.5,
      vy: 3.2 + Math.random(),
      vz: 0,
      life: 5,
      size: 1.1,
      grow: [1, 3.4],
      alpha: 0.75,
      fade: 0.5,
      color: smokeCol,
      drag: 0.2,
    });
  // Rails come out of the mouth one at a time and land on the rack.
  forge.pour += dt;
  if (forge.pour >= TUNE.railEvery && forge.made < TUNE.rackMax) {
    forge.pour = 0;
    const n = forge.made++;
    const to = slot(Math.min(TUNE.rackMax - 1, forge.rails + inFlight), new THREE.Vector3());
    inFlight++;
    send('rail', mouth.position, to, {
      dur: 0.55,
      apex: 1.1,
      land: () => {
        inFlight--;
        forge.rails++;
        drawRack(forge.rails);
        if (n % 2 === 0) clank(to.x, to.z);
        dustRing(to.x, to.y, to.z, 2, 0.6, 0.1);
      },
    });
  }
}
let inFlight = 0;
export function takeRail() {
  forge.rails--;
  drawRack(forge.rails);
}
export function resetForge() {
  forge.crates = 0;
  forge.rails = 0;
  forge.made = 0;
  forge.lit = false;
  forge.pour = 0;
  inFlight = 0;
  craneClear();
  snapForge();
}
