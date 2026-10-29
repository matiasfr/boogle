import * as CANNON from 'cannon-es';
import { FIXED, GRAVITY, SEA, HALF, CELL, BALL_R, BALL_MASS, PLAYER_MASS } from './constants.js';
import { clamp } from './math.js';
import { groundHeight, heights } from './terrain.js';

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

{
  const body = new CANNON.Body({ mass: 0, material: groundMat });
  body.addShape(new CANNON.Heightfield(heights, { elementSize: CELL }));
  body.position.set(-HALF, 0, HALF);
  body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(body);
}

export function addStaticSpheres(spheres) {
  const body = new CANNON.Body({ mass: 0, material: groundMat });
  for (const s of spheres) body.addShape(new CANNON.Sphere(s.r), new CANNON.Vec3(s.x, s.y, s.z));
  world.addBody(body);
}

export function teleport(body, x, y, z) {
  body.position.set(x, y, z);
  body.previousPosition.set(x, y, z);
  body.interpolatedPosition.set(x, y, z);
}

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
      const depth = SEA - (b.position.y + 0.35);
      me.swimming = depth > 0;
      const speed = (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
      const accel = me.coyote > 0 ? 70 : me.swimming ? 18 : 14;
      let dx = me.wish.x * speed - b.velocity.x,
        dz = me.wish.z * speed - b.velocity.z;
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
          b.velocity.y = 7.6;
          me.coyote = 0;
          me.jumpQueued = 0;
        } else if (me.swimming) {
          b.velocity.y = Math.max(b.velocity.y, 4.5);
          me.jumpQueued = 0;
        }
      }
      if (depth > 0)
        b.force.y += PLAYER_MASS * GRAVITY * (1 + Math.min(depth * 2.2, 1.4)) - PLAYER_MASS * 3 * b.velocity.y;
      const rr = Math.hypot(b.position.x, b.position.z);
      if (rr > 72) {
        const nx = b.position.x / rr,
          nz = b.position.z / rr;
        const out = b.velocity.x * nx + b.velocity.z * nz;
        if (out > -2) {
          b.velocity.x -= nx * (out + 2);
          b.velocity.z -= nz * (out + 2);
        }
      }
    }

    if (ball.mine && !ball.held) {
      const bb = ball.body;
      if (bb.position.y - groundHeight(bb.position.x, bb.position.z) < BALL_R + 0.08) {
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
      const surf = SEA + Math.sin(px * 0.21 + t * 1.3) * 0.06 + Math.cos(pz * 0.17 - t * 1.1) * 0.06;
      const sub = clamp((surf - (bb.position.y - BALL_R)) / (2 * BALL_R), 0, 1);
      if (sub > 0) {
        const rr = Math.hypot(px, pz) || 1;
        const nx = px / rr,
          nz = pz / rr;
        const along = 0.9 * Math.sin(t * 0.045 + 1.3) + 0.5 * Math.sin(t * 0.13 + rr * 0.05);
        const inward = 0.28 + 0.22 * Math.sin(t * 0.35 + rr * 0.1) + 0.12 * Math.sin(t * 0.11);
        const cx = -nx * inward - nz * along,
          cz = -nz * inward + nx * along;
        bb.force.y += BALL_MASS * GRAVITY * 3.2 * sub - BALL_MASS * 2.5 * bb.velocity.y * sub;
        bb.force.x += (cx - bb.velocity.x) * 0.9 * BALL_MASS * sub;
        bb.force.z += (cz - bb.velocity.z) * 0.9 * BALL_MASS * sub;
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
