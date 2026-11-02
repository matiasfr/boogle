import { FIXED, GRAVITY, HALF, CELL, PLAYER_MASS, PLAYER_R } from '../constants.ts';
import { material, createBody, addBody, teleport, onPreStep, onPostStep, forEachContact } from './engine.ts';
import { groundHeight, heights } from '../island/heights.ts';
import { waterField } from './water-field.ts';
import { carry, carryStep } from './platforms.ts';
import type { Body } from './engine.ts';
import type { Remote } from '../netplay/net.ts';
import type * as THREE from 'three';

const q = new URLSearchParams(globalThis.location?.search);
// Air acceleration (m/s²). ?air=35 tries another on any page (rec 6: Celeste's air control is 0.65 of ground, ours
// 0.2); unset, it stays 14.
const AIR_ACCEL = Number(q.get('air')) || 14;

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
export function catchFallThrough(body: Body, r: number) {
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
/** What the step hooks read and write on this player (src/player/player.ts). */
type StepPlayer = {
  body: Body | null;
  coyote: number;
  swimming: boolean;
  sprint: boolean;
  jumpQueued: number;
  wish: THREE.Vector3;
  yaw: number;
};
export function installStepHooks({ me, remotes }: { me: StepPlayer; remotes: Map<string, Remote> }) {
  onPreStep(
    () => {
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
        const speed = (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
        const rvx = b.velocity.x - carry.x,
          rvz = b.velocity.z - carry.z;
        const braking = me.wish.x * rvx + me.wish.z * rvz < 0;
        const accel = me.coyote > 0 ? (braking ? 115 : 70) : me.swimming ? 18 : AIR_ACCEL;
        let dx = me.wish.x * speed - rvx,
          dz = me.wish.z * speed - rvz;
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
    },
    { order: 40 },
  );

  onPostStep(
    () => {
      const b = me.body;
      if (!b) return;
      catchFallThrough(b, PLAYER_R);
      forEachContact(b, (nx, ny) => {
        if (ny <= 0.55) return false;
        me.coyote = 0.1;
        return true;
      });
    },
    { order: 20 },
  );
}
