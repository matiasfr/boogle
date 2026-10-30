import * as CANNON from 'cannon-es';
import { FIXED, GRAVITY, SEA, HALF, CELL, BALL_R, BALL_MASS, PLAYER_MASS } from '../constants.js';
import { clamp } from '../math.js';
import { groundHeight, heights } from '../adapters/terrain.js';
import { waterField } from './water-field.js';

const cur = { x: 0, z: 0 };
const PLAYER_DRIFT = 0.6; // share of a stream's speed that carries a wading player

export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVITY, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = false;

export const groundMat = new CANNON.Material('ground');
export const playerMat = new CANNON.Material('player');
export const ballMat = new CANNON.Material('ball');
world.addContactMaterial(new CANNON.ContactMaterial(playerMat, groundMat, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(playerMat, playerMat, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(ballMat, groundMat, { friction: 0.6, restitution: 0.55 }));
world.addContactMaterial(new CANNON.ContactMaterial(ballMat, playerMat, { friction: 0.2, restitution: 0.45 }));

// The shape reads `heights` directly, so edits only need to invalidate its caches (see refreshGround).
// Collision groups. Static scenery (the ground, trees, rocks, POI structures) is its own group so bodies that never
// need it can skip it: kinematic bodies (they are moved by code, so contacts with static things are wasted work) and
// anyone underground (the caves switch players and the ball to the CAVE group's colliders instead of the ground).
export const GROUP = { DEFAULT: 1, SCENERY: 2, CAVE: 4 };
export const NOT_SCENERY = ~(GROUP.SCENERY | GROUP.CAVE); // mask for bodies moved by code

// Height of the ground below a point. The terrain, unless a feature with ground under the terrain (the caves) says
// the point is underground.
export const groundProbe = { under: (x, y, z) => groundHeight(x, z) };

const groundBody = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: GROUP.SCENERY });
const groundShape = new CANNON.Heightfield(heights, { elementSize: CELL });
groundBody.addShape(groundShape);
groundBody.position.set(-HALF, 0, HALF);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Call after changing `heights` in place so collisions use the new ground immediately.
export function refreshGround() {
  groundShape.update();
  groundShape.updateMinValue();
  groundShape.updateMaxValue();
  groundShape.updateBoundingSphereRadius();
  groundBody.updateBoundingRadius();
  groundBody.aabbNeedsUpdate = true;
}

export function addStaticSpheres(spheres) {
  // Centre the body on its spheres: the broadphase culls by a bounding sphere around body.position.
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const s of spheres) {
    cx += s.x / spheres.length;
    cy += s.y / spheres.length;
    cz += s.z / spheres.length;
  }
  const body = new CANNON.Body({ mass: 0, material: groundMat, collisionFilterGroup: GROUP.SCENERY });
  for (const s of spheres) body.addShape(new CANNON.Sphere(s.r), new CANNON.Vec3(s.x - cx, s.y - cy, s.z - cz));
  body.position.set(cx, cy, cz);
  world.addBody(body);
  return body;
}

export function teleport(body, x, y, z) {
  body.position.set(x, y, z);
  body.previousPosition.set(x, y, z);
  body.interpolatedPosition.set(x, y, z);
}

// Controller feel knobs (src/features/feel.js changes them when the `feel` prototype flag is on).
export const feelTune = { jumpAdd: false, brakeAccel: 70 };

// Registered from main.js with the game state so this module stays free of import cycles.
export function installStepHooks({ me, ball, remotes }) {
  world.addEventListener('preStep', () => {
    for (const r of remotes.values()) {
      if (!r.body) continue;
      const p = r.body.position;
      const dx = r.target.x - p.x,
        dy = r.target.y - p.y,
        dz = r.target.z - p.z;
      if (dx * dx + dy * dy + dz * dz > 36) {
        teleport(r.body, r.target.x, r.target.y, r.target.z);
        r.body.velocity.setZero();
      } else {
        r.body.velocity.set(dx / FIXED, dy / FIXED, dz / FIXED);
      }
    }

    const b = me.body;
    if (b) {
      me.coyote -= FIXED;
      const surfY = waterField.surfaceAt(b.position.x, b.position.z);
      const depth = surfY - (b.position.y + 0.35);
      me.swimming = depth > 0;
      const speed = (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
      const braking = me.wish.x * b.velocity.x + me.wish.z * b.velocity.z < 0;
      const accel = me.coyote > 0 ? (braking ? feelTune.brakeAccel : 70) : me.swimming ? 18 : 14;
      let cx = 0,
        cz = 0;
      if (depth > 0.05) {
        waterField.currentAt(b.position.x, b.position.z, cur); // streams carry waders downstream
        cx = cur.x * PLAYER_DRIFT;
        cz = cur.z * PLAYER_DRIFT;
      }
      let dx = me.wish.x * speed + cx - b.velocity.x,
        dz = me.wish.z * speed + cz - b.velocity.z;
      const dl = Math.hypot(dx, dz),
        maxDv = accel * FIXED;
      if (dl > maxDv) {
        dx *= maxDv / dl;
        dz *= maxDv / dl;
      }
      b.velocity.x += dx;
      b.velocity.z += dz;
      if (me.jumpQueued > 0) {
        if (me.coyote > 0) {
          b.velocity.y = feelTune.jumpAdd ? Math.min(Math.max(b.velocity.y, 0), 6) + 7.6 : 7.6; // add: bounces chain
          me.coyote = 0;
          me.jumpQueued = 0;
        } else if (me.swimming) {
          b.velocity.y = Math.max(b.velocity.y, 4.5);
          me.jumpQueued = 0;
        }
      }
      if (depth > 0)
        b.force.y += PLAYER_MASS * GRAVITY * (1 + Math.min(depth * 2.2, 1.4)) - PLAYER_MASS * 3 * b.velocity.y;
      // Soft wall a little inside the edge of the map: swimming out to sea turns you back.
      const lim = HALF - 18;
      for (const ax of ['x', 'z']) {
        const p = b.position[ax];
        if (Math.abs(p) > lim) {
          const out = Math.sign(p) * b.velocity[ax];
          if (out > -2) b.velocity[ax] -= Math.sign(p) * (out + 2);
        }
      }
    }

    if (ball.mine && !ball.held) {
      const bb = ball.body;
      if (bb.position.y - groundProbe.under(bb.position.x, bb.position.y, bb.position.z) < BALL_R + 0.08) {
        const k = 1 - (Math.hypot(bb.velocity.x, bb.velocity.z) < 0.5 ? 10 : 1.2) * FIXED;
        bb.velocity.x *= k;
        bb.velocity.z *= k;
        bb.angularVelocity.scale(k, bb.angularVelocity);
      }
      // Surf: the surface bobs with the same waves the sea shader draws, and a slow, smoothly varying
      // current runs along the shore. A gentle, surging inward drift keeps the ball washing in eventually.
      const t = world.time;
      const px = bb.position.x,
        pz = bb.position.z;
      const simSurf = waterField.surfaceAt(px, pz);
      const inSim = simSurf > SEA + 0.06; // a pool or stream above sea level: no waves, no sea drift
      const surf = inSim ? simSurf : SEA + Math.sin(px * 0.21 + t * 1.3) * 0.06 + Math.cos(pz * 0.17 - t * 1.1) * 0.06;
      const sub = clamp((surf - (bb.position.y - BALL_R)) / (2 * BALL_R), 0, 1);
      if (sub > 0) {
        let cx, cz, grip;
        if (inSim) {
          // carried downstream: pulled towards the local flow, more firmly the deeper the water
          waterField.currentAt(px, pz, cur);
          cx = cur.x;
          cz = cur.z;
          grip = Math.max(sub, Math.min(1, (surf - groundHeight(px, pz)) / 0.2) * 0.6);
        } else {
          const rr = Math.hypot(px, pz) || 1;
          const nx = px / rr,
            nz = pz / rr;
          const along = 0.9 * Math.sin(t * 0.045 + 1.3) + 0.5 * Math.sin(t * 0.13 + rr * 0.05);
          const inward = 0.28 + 0.22 * Math.sin(t * 0.35 + rr * 0.1) + 0.12 * Math.sin(t * 0.11);
          cx = -nx * inward - nz * along;
          cz = -nz * inward + nx * along;
          grip = sub;
        }
        bb.force.y += BALL_MASS * GRAVITY * 3.2 * sub - BALL_MASS * 2.5 * bb.velocity.y * sub;
        bb.force.x += (cx - bb.velocity.x) * 0.9 * BALL_MASS * grip;
        bb.force.z += (cz - bb.velocity.z) * 0.9 * BALL_MASS * grip;
      }
    }
  });

  world.addEventListener('postStep', () => {
    const b = me.body;
    if (!b) return;
    for (const c of world.contacts) {
      if (!c.enabled || (c.bi !== b && c.bj !== b)) continue;
      const ny = c.bi === b ? -c.ni.y : c.ni.y;
      if (ny > 0.55) {
        me.coyote = 0.1;
        break;
      }
    }
  });
}
