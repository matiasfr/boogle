// The forge of ?proto=place: bare foundations and scaffolding from the start, and a crane that lifts each crate off the
// dock straight into it. Every crate adds its pieces (frame, walls, roof, chimney), and they drop into place: no scaling.
// Every other building copies its plan (./sites.ts). It stands just past where the train stops, on the platform's side,
// so you can't miss it on the way in. When it's done the chimney lights, the poles come down and rails pour onto a rack in
// plain sight, which is why you go home.
// docs/proposals/boogle-2.md, 2026-11-02 "construction is physical" and "the next test". Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { PLAYER_R } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { removeBody, teleport } from '../../physics/engine.ts';
import { flat } from '../flat.ts';
import { draw, makeSet } from '../net/boxes.ts';
import { smooth } from '../net/town-fx.ts';
import { H, addStatic } from './land.ts';
import { CRANE, FORGE, ORIGIN, RACK, TUNE } from './layout.ts';
import { LOOK, STEEL, boardMaterial } from './look.ts';
import { kitBatch } from './look-kit.ts';
import { RAIL_SIZE, dropSet, dustRing, send } from './pieces.ts';
import { addFoot, housePlan, outOf } from './sites.ts';

const WOOD = '#a9794c',
  WOOD2 = '#8a6236',
  BRICK = '#9a4a3a',
  ROOF = '#5a5f6b';

const X = FORGE.x + ORIGIN.x,
  Z = FORGE.z + ORIGIN.z;
const W = FORGE.w,
  D = FORGE.d,
  HIGH = 4.6; // to the wall tops

// ---------------------------------------------------------------- the plan: the standard every building copies
const plan = housePlan({
  x: X,
  z: Z,
  w: W,
  d: D,
  high: HIGH,
  rise: 2.1,
  wall: WOOD,
  post: WOOD2,
  roof: ROOF,
  door: { w: W - 5.4, rows: 3 },
  closed: false,
  chimney: { dx: -W / 2 + 1.4, dz: -D / 2 + 1.2, n: 8, a: BRICK, b: '#8a4032' },
  poleTop: HIGH + 3,
});
const Y = plan.y;
addFoot(X, Z, 0, plan.hw, plan.hd);
/** Bare foundations and poles, from the start. */
const scaffold = makeSet(plan.scaffold);
draw(scaffold, () => 1);
addStatic({ kind: 'box', hx: (W + 1.6) / 2, hy: 0.25, hz: (D + 1.6) / 2 }, { x: X, y: Y + 0.25, z: Z });
const { pieces, FRAME, WALLS, ROOFED } = plan;
const FLOOR = 0.5;
const TOTAL = pieces.length;
const chimneyTop = new THREE.Vector3(plan.smoke!.x, plan.smoke!.y + 0.2, plan.smoke!.z);

const set = dropSet(pieces, (k) => {
  const b = pieces[k]!;
  thump(b.x, b.z);
  dustRing(b.x, b.y + FLOOR + 0.1, b.z, k >= ROOFED ? 8 : 6, 2, 0.3);
});
set.mesh.material = boardMaterial(set.mesh.material as THREE.Material);
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
  if (on && !forgeWalls.body) {
    forgeWalls.body = addStatic({ kind: 'box', hx: W / 2, hy: HIGH / 2, hz: D / 2 }, { x: X, y: Y + HIGH / 2, z: Z });
    const b = me.body; // standing in the plot when the walls go up: you're moved to the nearest edge
    const p = b && { x: b.position.x, z: b.position.z };
    if (b && p && outOf({ x: X, z: Z, c: 1, s: 0, hw: W / 2, hd: D / 2 }, p, PLAYER_R + 0.2)) {
      teleport(b, p.x, Y + PLAYER_R + 0.8, p.z);
      b.velocity.set(0, 0, 0);
    }
  }
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
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 19), flat('#e0b04a'));
arm.position.z = 7.5;
arm.castShadow = true;
const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.6), flat('#3a302c'));
counter.position.set(0, -0.3, -2);
jib.add(arm, counter);
crane.add(pole, jib);
scene.add(crane);
addStatic({ kind: 'box', hx: 0.35, hy: MAST / 2, hz: 0.35 }, { x: CX, y: CY + MAST / 2, z: CZ });
addFoot(CX, CZ, 0, 0.6, 0.6);
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
addFoot(RX, RZ, 0, 1.5, 1.5);
const racked = LOOK.kit
  ? kitBatch('rail', STEEL, TUNE.rackMax)
  : new THREE.InstancedMesh(
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
const smokeCol = new THREE.Color(LOOK.light ? '#d9d5cc' : '#5d5a55');
let smokeAcc = 0;
/** A crate just landed in the forge: its pieces drop. */
export function crateIn() {
  const was = piecesFor(forge.crates);
  forge.crates++;
  dropPieces(was, piecesFor(forge.crates));
  if (piecesFor(forge.crates) >= FRAME) wallsSolid(true);
}
export function snapForge() {
  const shown = piecesFor(forge.crates);
  pieces.forEach((_, k) => set.snap(k, k < shown));
  set.mesh.visible = true;
  wallsSolid(shown >= FRAME);
  forge.lit = forge.crates >= TUNE.forgeCost;
  mouth.visible = forge.lit;
  poles(!forge.lit);
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
    poles(false);
    dustRing(X, Y + 0.4, Z, 16, 3.2, 0.5);
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
/** The poles stand until the forge is lit; the foundation stays. */
function poles(on: boolean) {
  draw(scaffold, (k) => (on || k === 0 ? 1 : 0));
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
