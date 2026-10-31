// Flights of thrown things (everything but the beach ball, which has its own physics body). Cosmetic: every client
// replays a throw from the same launch with flyPath, and only the landing spot the thrower submitted is shared state,
// so paths on different machines only need to look alike.
//
//   stepFlight(p, v, glide, dt)   one free-flight step, in place (the aim preview uses it too)
//   stepBall(p, v, dt)            one step of the beach ball's flight: gravity and its linear damping (the preview only)
//   flyPath(p, v, glide)          -> { points: [Vector3 every STEP], rest: Vector3, lost }; lost = it sank
//
// A glide (the frisbee) gets lift that grows with airspeed, heavy drag and a fade to the left as it slows.
import * as THREE from 'three';
import { GRAVITY, BALL_DAMPING } from '../constants.js';
import { GROUP } from './physics.js';
import { raycastClosest, rayHit } from './engine.ts';
import { groundHeight } from '../adapters/terrain.js';
import { waterField } from './water-field.js';

export const STEP = 1 / 60;
const MAX_STEPS = 8 * 60;
const MAX_BOUNCES = 6;
const DRAG = 0.002; // quadratic drag (1/m) for ordinary things
const GLIDE = {
  lift: 0.05, // m/s² of lift per (m/s)² of horizontal speed
  maxLift: GRAVITY * 0.85,
  drag: 0.009,
  fade: 1.6, // m/s² sideways once it has slowed right down
  fadeFrom: 18, // m/s: no fade at or above this horizontal speed
};
const BOUNCE = { plain: 0.3, glide: 0.12 }; // share of the speed into a surface kept on a bounce
const SLIDE = { plain: 0.55, glide: 0.8 }; // share of the speed along a surface kept on a bounce
const REST_SPEED = 2;

export function stepFlight(p, v, glide, dt = STEP) {
  v.y -= GRAVITY * dt;
  const sp = Math.hypot(v.x, v.y, v.z);
  if (glide) {
    const h = Math.hypot(v.x, v.z);
    v.y += Math.min(GLIDE.maxLift, GLIDE.lift * h * h) * dt;
    if (h > 0.5) {
      const fade = (GLIDE.fade * Math.max(0, 1 - h / GLIDE.fadeFrom) * dt) / h,
        vx = v.x;
      v.x += v.z * fade;
      v.z -= vx * fade;
    }
  }
  const k = 1 - Math.min(0.5, (glide ? GLIDE.drag : DRAG) * sp * dt);
  v.multiplyScalar(k);
  p.addScaledVector(v, dt);
}

// The beach ball flies on its own physics body; this is the same arc for the aim preview (gravity, then the body's
// linear damping, which the physics engine applies as v / (1 + dt * damping)).
export function stepBall(p, v, dt = STEP) {
  v.y -= GRAVITY * dt;
  v.multiplyScalar(1 / (1 + dt * BALL_DAMPING));
  p.addScaledVector(v, dt);
}

const hit = rayHit(),
  RAY = { mask: GROUP.SCENERY, skipBackfaces: true };
const cast = (a, b) => (raycastClosest(a, b, RAY, hit) ? hit : null);

const underwater = (p) => waterField.surfaceAt(p.x, p.z) > p.y + 0.05;
const normal = new THREE.Vector3(),
  vBefore = new THREE.Vector3();

// Where something comes down if it is dropped at p: the first surface below it, or the ground.
export function dropPoint(p) {
  const h = cast(p, { x: p.x, y: groundHeight(p.x, p.z) - 0.5, z: p.z });
  return new THREE.Vector3(p.x, h ? h.hitPointWorld.y : groundHeight(p.x, p.z), p.z);
}

export function flyPath(p0, v0, glide) {
  const p = p0.clone(),
    v = v0.clone(),
    next = new THREE.Vector3();
  const points = [p.clone()];
  let bounces = 0;
  for (let k = 0; k < MAX_STEPS; k++) {
    next.copy(p);
    vBefore.copy(v);
    stepFlight(next, v, glide);
    const h = cast(p, next);
    if (h) {
      normal.set(h.hitNormalWorld.x, h.hitNormalWorld.y, h.hitNormalWorld.z);
      p.set(h.hitPointWorld.x, h.hitPointWorld.y, h.hitPointWorld.z).addScaledVector(normal, 0.03);
      v.copy(vBefore);
      const into = v.dot(normal);
      if (into < 0) {
        v.addScaledVector(normal, -into);
        v.multiplyScalar(glide ? SLIDE.glide : SLIDE.plain);
        v.addScaledVector(normal, -into * (glide ? BOUNCE.glide : BOUNCE.plain));
      }
      bounces++;
      points.push(p.clone());
      if ((normal.y > 0.6 && v.length() < REST_SPEED) || bounces >= MAX_BOUNCES) return land(points, p);
      continue;
    }
    p.copy(next);
    points.push(p.clone());
    if (underwater(p)) return { points, rest: p.clone(), lost: true };
  }
  return land(points, p);
}

function land(points, p) {
  const rest = dropPoint(p.clone().setY(p.y + 0.2));
  if (rest.y < p.y - 0.05) points.push(rest.clone());
  return { points, rest, lost: underwater(rest) };
}
