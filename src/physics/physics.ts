import { FIXED, GRAVITY, SEA, HALF, CELL, BALL_R, BALL_MASS, PLAYER_MASS, PLAYER_R } from '../constants.ts';
import {
  material,
  createBody,
  addBody,
  teleport,
  onPreStep,
  onPostStep,
  physicsTime,
  forEachContact,
} from './engine.ts';
import { clamp } from '../math.ts';
import { groundHeight, heights } from '../island/terrain.ts';
import { waterField } from './water-field.ts';
import { carry, carryStep } from './platforms.ts';
import type { Body } from './engine.ts';
import type { Remote } from '../netplay/net.ts';
import type * as THREE from 'three';

const q = new URLSearchParams(location.search);
/**
 * ?ctl=odyssey: a modern-Mario-style controller to compare against today's (docs/research/third-person-platformer-
 * movement.md, Odyssey's numbers). On the ground you run where you face, not where the stick points: facing turns
 * towards the stick at a capped rate (src/player/player.ts), so runs carve arcs; speed follows stick tilt and builds
 * over about a quarter second instead of snapping to it; pulling the stick back past 95° at speed skids to a stop and
 * then pivots. Top speed is about 6 body heights per second, as Mario's. Unset, nothing here changes.
 */
export const ODYSSEY = q.get('ctl') === 'odyssey';
const ODY = { run: 7.5, sprint: 10.5, accel: 30, brake: 60, skid: 50 }; // m/s, m/s²
// Air acceleration (m/s²). ?air=35 tries another on any page (rec 6: Celeste's air control is 0.65 of ground, ours
// 0.2); unset, it stays 14 (35 with ?ctl=odyssey).
const AIR_ACCEL = Number(q.get('air')) || (ODYSSEY ? 35 : 14);

// The physics world lives in ./engine.ts, the only module that imports a physics library.
export { teleport };

// A contact uses the product of its two materials' values (ground is neutral): ball on ground 0.6 / 0.55.
export const groundMat = material('ground', { friction: 1, restitution: 1 });
export const playerMat = material('player', { friction: 0, restitution: 0 });
export const ballMat = material('ball', { friction: 0.6, restitution: 0.55 });

// Collision groups. Static scenery (the ground, trees, rocks, POI structures) is its own group so bodies that never
// need it can skip it: kinematic bodies (they are moved by code, so contacts with static things are wasted work) and
// anyone underground (the caves switch players and the ball to the CAVE group's colliders instead of the ground).
export const GROUP = { DEFAULT: 1, SCENERY: 2, CAVE: 4 };
export const NOT_SCENERY = ~(GROUP.SCENERY | GROUP.CAVE); // mask for bodies moved by code

// Height of the ground below a point. The terrain, unless a feature with ground under the terrain (the caves) says
// the point is underground. `netted(x, z)`: false where a feature owns what is below the terrain (the caves have their
// own safety net), so the fall-through net in installStepHooks leaves bodies there alone.
export const groundProbe = {
  under: (x: number, _y: number, z: number) => groundHeight(x, z),
  netted: (_x: number, _z: number) => true, // eslint-disable-line @typescript-eslint/no-unused-vars -- the caves replace it
};

// The physics engine has no continuous collision: a sphere that moves more than its radius in one step can end up with its
// centre under the heightfield, and the contact then pushes it out the bottom. Falls are capped below that speed
// (0.33 m a step against a 0.45 m radius), and anything that still gets through is put back on top.
const MAX_FALL = 20; // m/s
const NET_DEPTH = 0.1; // m of centre below the surface that counts as through (bilinear vs the heightfield's triangles)
function catchFallThrough(body: Body, r: number) {
  const p = body.position;
  if (!groundProbe.netted(p.x, p.z)) return;
  const g = groundProbe.under(p.x, p.y, p.z);
  if (p.y > g - NET_DEPTH) return;
  teleport(body, p.x, g + r, p.z);
  if (body.velocity.y < 0) body.velocity.y = 0;
}

addBody(
  createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: -HALF, y: 0, z: HALF },
    shapes: [{ kind: 'heightfield', heights, cell: CELL }],
  }),
);

export function addStaticSpheres(spheres: { x: number; y: number; z: number; r: number }[]) {
  // Centre the body on its spheres: the broadphase culls by a bounding sphere around body.position.
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const s of spheres) {
    cx += s.x / spheres.length;
    cy += s.y / spheres.length;
    cz += s.z / spheres.length;
  }
  const body = createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: cx, y: cy, z: cz },
    shapes: spheres.map((s) => ({ kind: 'sphere', r: s.r, offset: { x: s.x - cx, y: s.y - cy, z: s.z - cz } })),
  });
  addBody(body);
  return body;
}

// Registered from main.ts with the game state so this module stays free of import cycles.
/** What the step hooks read and write on this player and the ball (src/player/player.ts, ./ball.ts). */
type StepPlayer = {
  body: Body | null;
  coyote: number;
  swimming: boolean;
  sprint: boolean;
  jumpQueued: number;
  wish: THREE.Vector3;
  yaw: number;
  skid: boolean;
};
type StepBall = { mine: boolean; held: boolean; body: Body };
export function installStepHooks({
  me,
  ball,
  remotes,
}: {
  me: StepPlayer;
  ball: StepBall;
  remotes: Map<string, Remote>;
}) {
  onPreStep(() => {
    for (const r of remotes.values()) {
      if (!r.body) continue;
      const p = r.body.position;
      const dx = r.target.x - p.x,
        dy = r.target.y - p.y,
        dz = r.target.z - p.z;
      if (dx * dx + dy * dy + dz * dz > 36) {
        teleport(r.body, r.target.x, r.target.y, r.target.z);
        r.body.velocity.set(0, 0, 0);
      } else {
        r.body.velocity.set(dx / FIXED, dy / FIXED, dz / FIXED);
      }
    }

    const b = me.body;
    if (b) {
      me.coyote -= FIXED;
      carryStep(b, me); // a deck under you (./platforms.ts): steering below is relative to its motion
      const surfY = waterField.surfaceAt(b.position.x, b.position.z);
      const depth = surfY - (b.position.y + 0.35);
      me.swimming = depth > 0;
      const ground = me.coyote > 0 && !me.swimming;
      const speed = ODYSSEY
        ? (me.sprint ? ODY.sprint : ODY.run) * (me.swimming ? 0.55 : 1)
        : (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
      const rvx = b.velocity.x - carry.x,
        rvz = b.velocity.z - carry.z;
      const braking = me.wish.x * rvx + me.wish.z * rvz < 0;
      let accel = me.coyote > 0 ? (braking ? 115 : 70) : me.swimming ? 18 : AIR_ACCEL;
      // The wanted velocity: where the stick points, or with ?ctl=odyssey on the ground, where you face.
      let wx = me.wish.x * speed,
        wz = me.wish.z * speed;
      if (ODYSSEY && ground) {
        const tilt = Math.min(1, Math.hypot(me.wish.x, me.wish.z));
        const v = me.skid ? 0 : tilt * speed;
        wx = -Math.sin(me.yaw) * v;
        wz = -Math.cos(me.yaw) * v;
        accel = me.skid ? ODY.skid : v * v < rvx * rvx + rvz * rvz ? ODY.brake : ODY.accel;
      }
      let dx = wx - rvx,
        dz = wz - rvz;
      const dl = Math.hypot(dx, dz),
        maxDv = accel * FIXED;
      if (dl > maxDv) {
        dx *= maxDv / dl;
        dz *= maxDv / dl;
      }
      b.velocity.x += dx;
      b.velocity.z += dz;
      if (b.velocity.y < -MAX_FALL) b.velocity.y = -MAX_FALL;
      if (me.jumpQueued > 0) {
        if (me.coyote > 0) {
          b.velocity.y = Math.min(Math.max(b.velocity.y, 0), 6) + 7.6; // adds to an upward bounce: bounces chain
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
      for (const ax of ['x', 'z'] as const) {
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
        bb.angularVelocity.set(bb.angularVelocity.x * k, bb.angularVelocity.y * k, bb.angularVelocity.z * k);
      }
      // Surf: the surface bobs with the same waves the sea shader draws, and a slow, smoothly varying
      // current runs along the shore. A gentle, surging inward drift keeps the ball washing in eventually.
      const t = physicsTime();
      const px = bb.position.x,
        pz = bb.position.z;
      const pondSurf = waterField.surfaceAt(px, pz);
      const still = pondSurf > SEA + 0.06; // a pond above sea level: no waves, no sea drift
      const surf = still ? pondSurf : SEA + Math.sin(px * 0.21 + t * 1.3) * 0.06 + Math.cos(pz * 0.17 - t * 1.1) * 0.06;
      const sub = clamp((surf - (bb.position.y - BALL_R)) / (2 * BALL_R), 0, 1);
      if (sub > 0) {
        let cx = 0,
          cz = 0,
          grip: number;
        if (still) {
          // pulled to a stop, more firmly the deeper the water
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

  onPostStep(() => {
    if (ball.mine && !ball.held) catchFallThrough(ball.body, BALL_R);
    const b = me.body;
    if (!b) return;
    catchFallThrough(b, PLAYER_R);
    forEachContact(b, (nx, ny) => {
      if (ny <= 0.55) return false;
      me.coyote = 0.1;
      return true;
    });
  });
}
