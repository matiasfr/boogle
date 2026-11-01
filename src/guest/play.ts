// Playing as the guest. While it is on, the engine's guest (src/guest/engine.ts) runs at his own 30 Hz inside the physics
// step and this player's physics body becomes kinematic and follows him, so everything that reads the body (the ball,
// the camera, interact targets, the hotbar, presence) keeps working. Other players' guests are drawn from the pose they
// publish. Loaded on first use by src/features/dino.ts.
import * as THREE from 'three';
import { FIXED, PLAYER_R, PLAYER_MASS, reducedMotion } from '../constants.ts';
import { onPreStep, setMotion, getMask } from '../physics/engine.ts';
import { waterField } from '../physics/water-field.ts';
import { ball, claimBall } from '../physics/ball.ts';
import { scene } from '../render/scene.ts';
import { emit } from '../render/particles.ts';
import { me, cam } from '../player/player.ts';
import { input } from '../player/input.ts';
import { onFrame } from '../loop.ts';
import { getSim, BUTTON } from './engine.ts';
import type { Sim } from './engine.ts';
import type { RomPieces } from './rom.ts';
import type { ModelMesh } from './model.ts';
import type { Remote } from '../netplay/net.ts';
import { gatherSurfaces, UNITS } from './collision.ts';
import { getAtlas, createModelMesh, updateModelMesh } from './model.ts';
import { guest } from './state.ts';

const RECENTRE = 40; // metres from the frame origin before the origin moves to the guest
const PER_S = 30 / 100; // engine units per frame (30 Hz) to metres per second
const TURN = 32768 / Math.PI;
const ACT_GROUP_MASK = 0x1c0,
  ACT_GROUP_AIRBORNE = 0x80,
  ACT_GROUP_SUBMERGED = 0xc0;
const PARTICLE_DUST = 1 << 0,
  PARTICLE_MIST_CIRCLE = 1 << 16;
const ATTACKING = 0x100000 | 0x200000 | 0x400000; // the engine's punching, kicking and tripping flags
const DUST = new THREE.Color('#e9dcc0');

let sim: Sim | null = null,
  mesh: ModelMesh | null = null;
// The guest's collision lives in a frame centred near him (the engine keeps everything within ±8192 units).
const origin = { x: 0, z: 0 };
let phase = 0,
  last: State = null as unknown as State, // set by startGuest before anything reads it
  hitAt = 0;
const target = { x: 0, y: 0, z: 0 },
  expected = { x: 0, y: 0, z: 0 };
type State = ReturnType<Sim['state']>;
type XYZ = { x: number; y: number; z: number };
const put = (v: XYZ, p: XYZ) => ((v.x = p.x), (v.y = p.y), (v.z = p.z));

export async function loadSim(data: RomPieces) {
  if (sim) return sim;
  const s = await getSim();
  s.setAnims(data.anims);
  getAtlas(data.textures);
  return (sim = s);
}

const toShort = (rad: number) => ((((Math.round(rad * TURN) % 65536) + 98304) % 65536) - 32768) | 0;

function moveOrigin(x: number, z: number) {
  origin.x = Math.round(x);
  origin.z = Math.round(z);
}

// Loads the triangles around world point (x, z) and the water there.
function loadSurfaces(sim: Sim, x: number, z: number) {
  const n = gatherSurfaces(sim, x, z, origin.x, origin.z, getMask(me.body!));
  sim.loadSurfaces(n, waterField.surfaceAt(x, z) * UNITS);
}

export async function startGuest(data: RomPieces) {
  const sim = await loadSim(data);
  const b = me.body!;
  const m = (mesh ??= createModelMesh());
  moveOrigin(b.position.x, b.position.z);
  loadSurfaces(sim, b.position.x, b.position.z);
  sim.spawn(
    (b.position.x - origin.x) * UNITS,
    (b.position.y - PLAYER_R) * UNITS,
    (b.position.z - origin.z) * UNITS,
    toShort(me.yaw - Math.PI),
  );
  last = sim.state();
  setMotion(b, 'kinematic', true, 0);
  put(target, b.position);
  put(expected, b.position);
  phase = 0;
  scene.add(m);
  me.avatar!.userData.inner.visible = false;
  guest.active = true;
}

export function stopGuest() {
  if (!guest.active) return;
  guest.active = false;
  guest.pose = null;
  const b = me.body!;
  setMotion(b, 'dynamic', true, PLAYER_MASS);
  b.velocity.set(last.vx * PER_S, last.vy * PER_S, last.vz * PER_S);
  scene.remove(mesh!);
  me.avatar!.userData.inner.visible = true;
}

function readStick() {
  const k = input.keys;
  let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - input.stickY;
  let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + input.stickX;
  const len = Math.hypot(f, s);
  if (len > 1) {
    f /= len;
    s /= len;
  }
  return me.entered && !me.down ? [s * 64, f * 64] : [0, 0];
}

function readButtons() {
  const k = input.keys;
  let buttons = 0;
  if (me.jumpHeld || me.jumpQueued > 0) buttons |= BUTTON.A;
  if (guest.b || guest.bHeld) buttons |= BUTTON.B;
  if (guest.zHeld || k.has('ShiftLeft') || k.has('ShiftRight')) buttons |= BUTTON.Z;
  me.jumpQueued = 0;
  guest.b = false;
  return me.entered && !me.down ? buttons : 0;
}

// A punch, kick or trip that reaches the beach ball knocks it away.
function hitBall(now: number) {
  if (!(last.flags & ATTACKING) || ball.held || now - hitAt < 350) return;
  const yaw = last.faceYaw / TURN;
  const fx = Math.sin(yaw),
    fz = Math.cos(yaw);
  const hx = target.x + fx * 0.6,
    hy = target.y + 0.2,
    hz = target.z + fz * 0.6;
  const p = ball.disp.p;
  if (Math.hypot(p.x - hx, p.y - hy, p.z - hz) > 1.1) return;
  hitAt = now;
  if (!ball.mine) claimBall(false);
  const kick = last.flags & 0x200000 ? 14 : 10;
  ball.body.velocity.set(fx * kick + last.vx * PER_S, 5.5, fz * kick + last.vz * PER_S);
}

function puffs(st: State) {
  if (reducedMotion || !(st.particles & (PARTICLE_DUST | PARTICLE_MIST_CIRCLE))) return;
  const feetY = st.y / UNITS;
  const ring = st.particles & PARTICLE_MIST_CIRCLE;
  for (let k = 0; k < (ring ? 14 : 2); k++) {
    const a = ring ? (k / 14) * Math.PI * 2 : Math.random() * Math.PI * 2;
    const sp = ring ? 2.6 : 0.4;
    emit({
      x: target.x + Math.cos(a) * 0.2,
      y: feetY + 0.1,
      z: target.z + Math.sin(a) * 0.2,
      vx: Math.cos(a) * sp,
      vy: 0.6,
      vz: Math.sin(a) * sp,
      color: DUST,
      life: 0.6,
      size: 0.35,
      grow: [1, 2.2],
      fade: 1,
      alpha: 0.7,
      drag: 3,
    });
  }
}

function tick(sim: Sim, now: number) {
  const wx = origin.x + last.x / UNITS,
    wz = origin.z + last.z / UNITS;
  loadSurfaces(sim, wx, wz);
  const [sx, sy] = readStick();
  sim.input(sx, sy, readButtons(), toShort(cam.yaw));
  sim.tick();
  const st = (last = sim.state());
  target.x = origin.x + st.x / UNITS;
  target.y = st.y / UNITS + PLAYER_R;
  target.z = origin.z + st.z / UNITS;
  const group = st.action & ACT_GROUP_MASK;
  me.yaw = st.faceYaw / TURN + Math.PI;
  me.coyote = group === ACT_GROUP_AIRBORNE || group === ACT_GROUP_SUBMERGED ? 0 : 0.1;
  me.swimming = group === ACT_GROUP_SUBMERGED;
  guest.pose = sim.pose();
  updateModelMesh(mesh!, sim.verts, sim.vertexCount());
  puffs(st);
  hitBall(now);
  if (Math.abs(st.x) > RECENTRE * UNITS || Math.abs(st.z) > RECENTRE * UNITS) {
    const dx = Math.round(st.x / UNITS),
      dz = Math.round(st.z / UNITS);
    origin.x += dx;
    origin.z += dz;
    sim.shift(-dx * UNITS, -dz * UNITS);
    last = sim.state();
  }
}

// The body arrives where the guest is at the next 30 Hz tick, one 60 Hz step at a time. If something else moved it (a
// respawn, the caves' safety net), the guest goes there.
onPreStep(() => {
  if (!guest.active || !me.body || !sim) return;
  const b = me.body;
  const p = b.position;
  if (Math.hypot(p.x - expected.x, p.y - expected.y, p.z - expected.z) > 0.75) {
    moveOrigin(b.position.x, b.position.z);
    sim.teleport(
      (b.position.x - origin.x) * UNITS,
      (b.position.y - PLAYER_R) * UNITS,
      (b.position.z - origin.z) * UNITS,
    );
    last = sim.state();
    put(target, b.position);
  }
  if (phase === 0) tick(sim, performance.now());
  const left = (2 - phase) * FIXED;
  b.velocity.set((target.x - b.position.x) / left, (target.y - b.position.y) / left, (target.z - b.position.z) / left);
  expected.x = b.position.x + b.velocity.x * FIXED;
  expected.y = b.position.y + b.velocity.y * FIXED;
  expected.z = b.position.z + b.velocity.z * FIXED;
  phase = (phase + 1) % 2;
});

// The guest's feet are a ball radius under the body's centre.
onFrame(
  () => {
    if (!guest.active || !me.body || !mesh || !me.avatar) return;
    const ip = me.body.interpolatedPosition;
    mesh.position.set(ip.x, ip.y - PLAYER_R, ip.z);
    me.avatar.userData.inner.visible = false;
  },
  { phase: 'update', order: -5 },
);

// ---------------------------------------------------------------- other players' guests

const remoteMeshes = new Map<Remote, { mesh: ModelMesh; pose: number[] | null }>();

// Draws every remote who is the guest (r.guest holds their pose) and lets their usual avatar show again when they stop.
export function updateRemoteGuests(remotes: Map<string, Remote>) {
  if (!sim) return;
  for (const [r, entry] of remoteMeshes) {
    if (remotes.get(r.peer) === r && r.guest && r.avatar) continue;
    scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    if (r.avatar) r.avatar.userData.inner.visible = true;
    remoteMeshes.delete(r);
  }
  for (const r of remotes.values()) {
    if (!r.guest || !r.avatar) continue;
    let entry = remoteMeshes.get(r);
    if (!entry) {
      entry = { mesh: createModelMesh(), pose: null };
      scene.add(entry.mesh);
      remoteMeshes.set(r, entry);
    }
    if (entry.pose !== r.guest) {
      entry.pose = r.guest;
      sim.renderPose(r.guest);
      updateModelMesh(entry.mesh, sim.verts, sim.vertexCount());
    }
    entry.mesh.position.set(r.avatar.position.x, r.avatar.position.y - PLAYER_R, r.avatar.position.z);
    r.avatar.userData.inner.visible = false;
  }
}
