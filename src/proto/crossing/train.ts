// The crossing's train (?proto=crossing): the wagon's look (../../render/wagon-look.ts) on kinematic cars registered as platforms,
// running a Local timetable (./line.ts). Push-pull like the wagon: the loco stays at the far end of the train, so it
// pulls going out and pushes coming home. Cars are level (platforms take yaw only); the climb shows as a drawn pitch.
// Local: every tab runs its own, nothing is sent. Serves DESIGN.md 1 (Toys before chores).
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, stepAlpha, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf, type Platform } from '../../physics/platforms.ts';
import { wagonLook, LOCO, TRAILER, CRATES, type CarSpec } from '../../render/wagon-look.ts';
import { lineAt, railY, trainAt, timeAtS, type LinePoint, type TrainState } from './line.ts';
import { FEEL, TIMETABLE } from './tuning.ts';

const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 7.4 },
  { spec: TRAILER, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
  { spec: TRAILER, off: -7.4 },
];
const BOTTOM = 0.4; // m over the rails where a car's collider starts (the wheels are drawn under it)
const BOGIE = 1.1; // m from a car's centre to each bogie: the heading is the chord between them

type Car = {
  spec: CarSpec;
  off: number;
  hy: number;
  body: Body;
  mesh: THREE.Group;
  rock: THREE.Object3D;
  prevYaw: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  platform: Platform;
};

/** The timetable's clock, seconds. It stands still until `start()` so the first wait counts from when you arrive. */
export const clock = { t: 0, running: false };
export const train: TrainState = { s: 0, v: 0, stop: 0 };
export const start = () => {
  clock.running = true;
  clock.t = TIMETABLE.dwell - TIMETABLE.firstLeave;
};
/** Puts the train outbound at `s`, the look evals' shortcut. */
export const seekS = (s: number) => {
  clock.running = true;
  clock.t = timeAtS(s);
};

const look = wagonLook(CARS.length - 1);
onFrame(look.step, { phase: 'update', order: 8 });
const a: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 },
  b: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };

export const cars: Car[] = CARS.map(({ spec, off }, k) => {
  const hy = (spec.top - BOTTOM) / 2;
  const body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: 0, y: -50, z: 0 },
    shapes: [
      { kind: 'box', hx: spec.hx, hy, hz: spec.hz },
      ...(k === CARS.length - 1 ? CRATES : []).map(({ x, z, sz, base }) => ({
        kind: 'box' as const,
        hx: sz / 2,
        hy: sz / 2,
        hz: sz / 2,
        offset: { x, y: spec.top + base + sz / 2 - (BOTTOM + hy), z },
      })),
    ],
  });
  addBody(body);
  const mesh = new THREE.Group(),
    rock = look.cars[k]!;
  rock.position.y = -(BOTTOM + hy); // body centre -> rails
  mesh.add(rock);
  scene.add(mesh);
  const car: Car = {
    spec,
    off,
    hy,
    body,
    mesh,
    rock,
    prevYaw: 0,
    x: 0,
    y: -50,
    z: 0,
    yaw: 0,
    pitch: 0,
    platform: { body, hx: spec.hx, hz: spec.hz, top: hy, move: (dt) => move(car, k, dt) },
  };
  registerPlatform(car.platform);
  return car;
});
export const onTrain = (p: Platform | null) => cars.some((c) => c.platform === p);

function plan(dt: number) {
  if (clock.running) clock.t += dt;
  trainAt(clock.t, train);
  for (const c of cars) {
    const s = train.s + c.off;
    lineAt(s + BOGIE, a);
    lineAt(s - BOGIE, b);
    c.x = (a.x + b.x) / 2;
    c.z = (a.z + b.z) / 2;
    c.yaw = Math.atan2(a.x - b.x, a.z - b.z);
    const ya = railY(s + BOGIE),
      yb = railY(s - BOGIE);
    c.y = (ya + yb) / 2 + BOTTOM + c.hy;
    c.pitch = Math.atan2(ya - yb, 2 * BOGIE);
  }
}
function move(c: Car, k: number, dt: number) {
  if (k === 0) plan(dt);
  const p = c.body;
  c.prevYaw = yawOf(p.quaternion);
  const dx = c.x - p.position.x,
    dy = c.y - p.position.y,
    dz = c.z - p.position.z;
  if (dx * dx + dy * dy + dz * dz > 25) {
    // The first step, or a seek: place it, don't fling anyone.
    p.position.set(c.x, c.y, c.z);
    p.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
    p.velocity.set(0, 0, 0);
    p.angularVelocity.set(0, 0, 0);
    c.prevYaw = c.yaw;
    return;
  }
  p.velocity.set(dx / dt, dy / dt, dz / dt);
  p.angularVelocity.set(0, (angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw) / dt, 0);
}

// ---------------------------------------------------------------- drawing, and the smoke trail
const smoke = new THREE.Color('#ece8e0');
const chimney = new THREE.Vector3();
let puffs = 0;
onFrame(
  ({ dt }) => {
    const alpha = stepAlpha();
    for (const c of cars) {
      const ip = c.body.interpolatedPosition;
      c.mesh.position.set(ip.x, ip.y, ip.z);
      c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), alpha);
      c.rock.rotation.x = -c.pitch;
    }
    // A long trail hanging over the sea behind the train at speed, a lazy chuff standing.
    const speed = Math.abs(train.v);
    puffs += speed * dt * FEEL.smokePerM + (speed < 0.1 ? dt / 1.5 : 0);
    if (puffs < 1) return;
    look.chimneyTop.getWorldPosition(chimney);
    const ux = Math.sin(cars[0]!.yaw) * train.v,
      uz = Math.cos(cars[0]!.yaw) * train.v;
    for (; puffs >= 1; puffs--)
      emit({
        x: chimney.x + (Math.random() - 0.5) * 0.3,
        y: chimney.y,
        z: chimney.z + (Math.random() - 0.5) * 0.3,
        // a light wind off the walkway side carries the trail out over the sea, not through your face
        vx: ux * 0.2 + 2 + (Math.random() - 0.5) * 0.6,
        vy: 1.5 + Math.random() * 0.8,
        vz: uz * 0.2 + (Math.random() - 0.5) * 0.6,
        life: 3 + Math.random() * 2,
        size: 0.4,
        color: smoke,
        alpha: 0.5,
        drag: 0.6,
        grow: [1, 3.2],
        fade: 0.6,
      });
  },
  { phase: 'update', order: 6 }, // before look.ts animates the wheels (order 8)
);
