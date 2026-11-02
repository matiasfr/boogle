// Prototype: riding (?proto=ride). A greybox flatbed on a kinematic body shuttles along a route beside the court
// (straights, two gentle corners, a grade that follows the ground), stopping at each end so you can hop on. It proves
// platform carry (src/physics/platforms.ts) before the real wagon (docs/plans/find-the-fun.md, step 2). Serves
// DESIGN.md 1 (Toys before chores): a ride with nothing to achieve. Local: each tab runs its own flatbed, so it is not a
// shared platform (no `id`): a rider on it shows on other tabs at their world presence, a little behind the deck.
// Tune live: window.__ride.RIDE.cruise = 6 (or ?ridespeed=6).
import * as THREE from 'three';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { groundHeight } from '../../island/terrain.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, stepAlpha, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf } from '../../physics/platforms.ts';

const params = new URLSearchParams(location.search);
const RIDE = {
  cruise: Number(params.get('ridespeed')) || 3, // m/s
  accel: 1, // m/s², speeding up and braking
  dwell: 5, // s stopped at each end
  clearance: 0.45, // m from the ground to the deck's centre (deck top about 0.6 m up: a hop)
};
const DECK = { hx: 1.25, hz: 2, hy: 0.15 }; // half sizes: 2.5 × 4 m, 0.3 m thick
// From the start, heading (yaw: 0 is +z, the deck's long axis), then straights and arcs (radius, signed angle).
const START = { x: 0, z: 34, yaw: Math.PI };
// North past the court's west side, two right-hand corners, then east along its north edge, short of the track's
// work sites (src/sim/route.ts) and the garden.
const LEGS: ([number] | [number, number])[] = [[12], [10, Math.PI / 4], [2], [10, Math.PI / 4], [4]];

// ---------------------------------------------------------------- the route: a pose for every metre along it
type Pose = { x: number; y: number; z: number; yaw: number };
const STEP = 0.25; // m between samples
const route: Pose[] = [];
{
  let { x, z, yaw } = START;
  route.push({ x, y: 0, z, yaw });
  for (const [len, turn = 0] of LEGS)
    for (let d = STEP; d <= (turn ? len * Math.abs(turn) : len) + 1e-6; d += STEP) {
      if (turn) yaw -= Math.sign(turn) * (STEP / len); // a right turn (positive) turns clockwise seen from above
      x += Math.sin(yaw) * STEP;
      z += Math.cos(yaw) * STEP;
      route.push({ x, y: 0, z, yaw });
    }
  // Height: the highest ground under the deck, smoothed into a gentle grade, lifted to clear every bump.
  const under = route.map((p) => {
    let g = -Infinity;
    for (const [a, b] of [
      [0, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const ox = a * DECK.hx,
        oz = b * DECK.hz,
        c = Math.cos(p.yaw),
        s = Math.sin(p.yaw);
      g = Math.max(g, groundHeight(p.x + ox * c + oz * s, p.z - ox * s + oz * c));
    }
    return g;
  });
  const W = Math.round(5 / STEP);
  let lift = 0;
  route.forEach((p, k) => {
    let sum = 0,
      n = 0;
    for (let j = Math.max(0, k - W); j <= Math.min(route.length - 1, k + W); j++, n++) sum += under[j];
    p.y = sum / n;
    lift = Math.max(lift, under[k] - p.y);
  });
  for (const p of route) p.y += lift + RIDE.clearance;
}
const LENGTH = (route.length - 1) * STEP;
function poseAt(s: number, out: Pose) {
  const f = Math.min(route.length - 1.000001, Math.max(0, s / STEP)),
    k = Math.floor(f),
    u = f - k;
  const a = route[k],
    b = route[k + 1];
  out.x = a.x + (b.x - a.x) * u;
  out.y = a.y + (b.y - a.y) * u;
  out.z = a.z + (b.z - a.z) * u;
  out.yaw = angleLerp(a.yaw, b.yaw, u);
  return out;
}

// ---------------------------------------------------------------- the look (the real wagon replaces this function)
function flatbedLook() {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  };
  box(DECK.hx * 2, DECK.hy * 2, DECK.hz * 2, 0x9a7b55, 0, 0, 0); // deck
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.2, 0.5, 0.5, 0x3a3a40, sx * 1.05, -0.3, sz * 1.4); // wheels
  box(DECK.hx * 2, 0.5, 0.15, 0xd8503c, 0, 0.4, DECK.hz - 0.08); // a red front board, so you can tell which way is on
  return g;
}

// ---------------------------------------------------------------- the shuttle
const state = { s: 0, speed: 0, dir: 1, wait: RIDE.dwell };
const target: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
let body: Body | null = null,
  mesh: THREE.Object3D | null = null,
  prevYaw = 0;

function move(dt: number) {
  const b = body!;
  if (state.wait > 0) {
    state.wait -= dt;
    if (state.wait <= 0) state.dir = state.s > LENGTH / 2 ? -1 : 1;
  } else {
    const left = state.dir > 0 ? LENGTH - state.s : state.s;
    state.speed = Math.min(state.speed + RIDE.accel * dt, RIDE.cruise, Math.sqrt(2 * RIDE.accel * left));
    if (left <= state.speed * dt + 1e-4) {
      state.s = state.dir > 0 ? LENGTH : 0;
      state.speed = 0;
      state.wait = RIDE.dwell;
    } else state.s += state.dir * state.speed * dt;
  }
  // Track the route exactly: velocity is whatever lands the body on this step's pose.
  poseAt(state.s, target);
  prevYaw = yawOf(b.quaternion);
  b.velocity.set((target.x - b.position.x) / dt, (target.y - b.position.y) / dt, (target.z - b.position.z) / dt);
  b.angularVelocity.set(0, angleLerp(prevYaw, target.yaw, 1) - prevYaw, 0);
  b.angularVelocity.y /= dt;
}

// Gated by src/features/proto-ride.ts.
{
  poseAt(0, target);
  body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: target.x, y: target.y, z: target.z },
    rotation: { x: 0, y: Math.sin(target.yaw / 2), z: 0, w: Math.cos(target.yaw / 2) },
    shapes: [{ kind: 'box', hx: DECK.hx, hy: DECK.hy, hz: DECK.hz }],
  });
  addBody(body);
  prevYaw = target.yaw;
  registerPlatform({ body, hx: DECK.hx, hz: DECK.hz, top: DECK.hy, move });
  mesh = flatbedLook();
  scene.add(mesh);
  onFrame(
    () => {
      const ip = body!.interpolatedPosition;
      mesh!.position.set(ip.x, ip.y, ip.z);
      mesh!.rotation.y = angleLerp(prevYaw, yawOf(body!.quaternion), stepAlpha());
    },
    { phase: 'update', order: 5 },
  );
  // For the look evals (dev/look/evals/ride.js): put the flatbed somewhere along the route, already moving.
  const place = (s: number, speed = RIDE.cruise, dir = 1) => {
    Object.assign(state, { s, speed, dir, wait: 0 });
    poseAt(s, target);
    body!.position.set(target.x, target.y, target.z);
    body!.quaternion.set(0, Math.sin(target.yaw / 2), 0, Math.cos(target.yaw / 2));
    prevYaw = target.yaw;
  };
  window.__ride = { RIDE, state, LENGTH, LEGS, body, place, poseAt: (s: number) => poseAt(s, { ...target }) };
}
