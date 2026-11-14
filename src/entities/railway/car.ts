// A car: a kinematic body following a planned pose (moved from the rail of ?proto=place).
import { P } from './line-geometry.ts';
import * as THREE from 'three/webgpu';
import { FIXED } from '../../constants.ts';
import { angleLerp } from '../../math.ts';
import { BODY, createBody, onPreStep, teleport, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import {
  carry,
  CARRY,
  fromPlatform,
  registerPlatform,
  toPlatform,
  yawOf,
  type Platform,
} from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { type CarSpec } from '../../render/wagon-look.ts';
import { ORIGIN, TUNE, lineAt, lineSmoothAt, railY, type Line } from '../../place/layout.ts';
import type { OwnedView } from '../../render/owned-view.ts';

// ---------------------------------------------------------------- a car: a kinematic body following a planned pose
export const BOTTOM = 0.4;
// The deck's edge holds you while you stand. The body is a sphere on a box and counts as standing up to CARRY.edge past the
// box (src/physics/platforms.ts). With its centre past the box, though, the contact's normal leans outward, so a player who
// stopped at the edge crept off at about 0.1 m/s, moving or not, until the deck let go of them over the river. Standing with
// no stick pushed, you're eased back inside instead. Push out and you walk off, and a jump's a jump, so no railing: nothing
// here looks solid that isn't. Serves "you can stand on it", docs/decisions.md.
const HOLD = { inset: 0.04, speed: 1.2 }; // m inside the box's edge you settle; m/s you're eased back
const decks = new Map<Platform, Car>();
onPreStep(
  () => {
    const b = me.body,
      p = carry.on;
    if (!b || !p || !decks.has(p) || me.wish.lengthSq() > 0.01 || me.jumpQueued > 0) return;
    const q = p.body.position,
      yaw = yawOf(p.body.quaternion),
      c = Math.cos(yaw),
      s = Math.sin(yaw);
    const rx = b.position.x - q.x,
      rz = b.position.z - q.z;
    const lx = rx * c - rz * s,
      lz = rx * s + rz * c;
    // Cargo tops have their own edges inside the flatbed. Holding only the flatbed's outline lets an idle
    // rider creep off a crate's rounded contact and lose the train before reaching that outer guard.
    const support = decks.get(p)?.supportAt?.(lx, lz);
    const dx = lx - (support?.x ?? 0),
      dz = lz - (support?.z ?? 0),
      most = HOLD.speed * FIXED,
      overX = Math.abs(dx) - ((support?.hx ?? p.hx) - HOLD.inset),
      overZ = Math.abs(dz) - ((support?.hz ?? p.hz) - HOLD.inset);
    if (overX <= 0 && overZ <= 0) return;
    const inX = overX > 0 ? -Math.sign(dx) * Math.min(most, overX) : 0,
      inZ = overZ > 0 ? -Math.sign(dz) * Math.min(most, overZ) : 0;
    b.position.set(b.position.x + inX * c + inZ * s, b.position.y, b.position.z - inX * s + inZ * c);
  },
  { order: 20 }, // after the decks move (10), before the player's controller (40)
);
export type Car = {
  spec: CarSpec;
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
  speedLimit: number;
  platform: Platform;
  /** Footprint of the cargo surface currently supporting a rider; absent means the flatbed. */
  supportAt?: (x: number, z: number) => { x: number; z: number; hx: number; hz: number } | undefined;
  /** Local presentation odometers must not roll through an explicit physics relocation. */
  onSnap?: () => void;
};
export function makeCar(
  spec: CarSpec,
  rock: THREE.Object3D,
  before: () => void,
  extra: Parameters<typeof createBody>[0],
  owner: OwnedView,
) {
  const hy = (spec.top - BOTTOM) / 2;
  const body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: ORIGIN.x, y: -60, z: ORIGIN.z },
    shapes: [{ kind: 'box', hx: spec.hx, hy, hz: spec.hz }, ...(extra?.shapes ?? [])],
  });
  owner.addBody(body);
  const mesh = new THREE.Group();
  rock.position.y = -(BOTTOM + hy);
  mesh.add(rock);
  mesh.visible = false;
  owner.add(mesh);
  const car: Car = {
    spec,
    hy,
    body,
    mesh,
    rock,
    prevYaw: 0,
    x: ORIGIN.x,
    y: -60,
    z: ORIGIN.z,
    yaw: 0,
    pitch: 0,
    speedLimit: TUNE.cruise * 1.5, // slopes and small reconciliation nudges, never a snapshot's distance / FIXED
    platform: {
      body,
      hx: spec.hx,
      hz: spec.hz,
      top: hy,
      move: (dt) => {
        before();
        moveCar(car, dt);
      },
    },
  };
  const unregister = registerPlatform(car.platform);
  decks.set(car.platform, car);
  owner.cleanup(() => {
    unregister();
    decks.delete(car.platform);
  });
  return car;
}
function moveCar(c: Car, dt: number) {
  const p = c.body;
  c.prevYaw = yawOf(p.quaternion);
  const dx = c.x - p.position.x,
    dy = c.y - p.position.y,
    dz = c.z - p.position.z;
  const turn = angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw;
  // A 1.65 m correction used to become ~99 m/s. Position corrections still relocate deck and rider
  // together. A road junction's new heading is ordinary travel: turn towards it at a bounded rate
  // and ease the last part, keeping the collider, drawn deck and rider on the same smooth heading.
  if (Math.hypot(dx, dy, dz) > c.speedLimit * dt) return snapCar(c);
  p.velocity.set(dx / dt, dy / dt, dz / dt);
  p.angularVelocity.set(0, Math.max(-2, Math.min(2, turn * Math.min(8, 1 / dt))), 0);
}
const riderLocal = { x: 0, y: 0, z: 0, yaw: 0 },
  riderWorld = { ...riderLocal };
export function snapCar(c: Car) {
  c.onSnap?.();
  const p = c.body;
  const rider =
    c.y > -30 && carry.on === c.platform && me.body && me.body.velocity.y - carry.y <= CARRY.leaveVy ? me.body : null;
  if (c.y <= -30 && carry.on === c.platform) carry.on = null;
  const turn = angleLerp(yawOf(p.quaternion), c.yaw, 1) - yawOf(p.quaternion);
  if (rider) toPlatform(c.platform, rider.position, me.yaw, riderLocal);
  teleport(p, c.x, c.y, c.z);
  p.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
  p.velocity.set(0, 0, 0);
  p.angularVelocity.set(0, 0, 0);
  c.prevYaw = c.yaw;
  if (rider) {
    fromPlatform(c.platform, riderLocal, false, riderWorld);
    teleport(rider, riderWorld.x, riderWorld.y, riderWorld.z);
    const vx = rider.velocity.x - carry.x,
      vz = rider.velocity.z - carry.z;
    rider.velocity.set(
      vx * Math.cos(turn) + vz * Math.sin(turn),
      rider.velocity.y - carry.y,
      -vx * Math.sin(turn) + vz * Math.cos(turn),
    );
    carry.x = carry.y = carry.z = 0;
    carry.spin += turn;
  }
}
export function drawCar(c: Car, alpha: number) {
  const ip = c.body.interpolatedPosition;
  c.mesh.position.set(ip.x, ip.y, ip.z);
  c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), alpha);
  c.rock.rotation.x = -c.pitch;
  c.mesh.visible = c.y > -30; // a train not yet needed waits under the land: nothing to draw, nor to shadow
}
/** `lat` (optional) is the car's track's offset from the line at s, metres (the up track's, layout.ts upLat): each
 * axle end is set across by its own offset, so a car on a turnout's curve yaws with it. */
export function poseCarOnLine(c: Car, line: Line, s: number, sign: number, lat?: (s: number) => number) {
  // Set across along the line's smooth heading (layout.ts lineSmoothAt; `lat` is the offset for it): along the
  // stepped one an axle beside the line stood back at every metre of a bend.
  (lat ? lineSmoothAt : lineAt)(line, s + 1.1, a);
  (lat ? lineSmoothAt : lineAt)(line, s - 1.1, b);
  if (lat) {
    const la = lat(s + 1.1),
      lb = lat(s - 1.1);
    a.x -= a.uz * la;
    a.z += a.ux * la;
    b.x -= b.uz * lb;
    b.z += b.ux * lb;
  }
  c.x = (a.x + b.x) / 2 + ORIGIN.x;
  c.z = (a.z + b.z) / 2 + ORIGIN.z;
  c.yaw = Math.atan2((a.x - b.x) * sign, (a.z - b.z) * sign);
  const ya = railY(line, s + 1.1),
    yb = railY(line, s - 1.1);
  c.y = (ya + yb) / 2 + BOTTOM + c.hy;
  c.pitch = Math.atan2((ya - yb) * sign, 2.2);
}
const a = { ...P },
  b = { ...P };
