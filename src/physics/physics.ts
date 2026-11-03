import { HALF, CELL, FIXED, HEAD_OFFSET, PLAYER_MASS, PLAYER_R } from '../constants.ts';
import { BODY, material, createBody, addBody, teleport } from './engine.ts';
import { groundHeight, heights } from '../island/heights.ts';
import type { Body } from './engine.ts';

// The physics world lives in ./engine.ts, the only module that imports a physics library.

// Moves a kinematic body to where it should be by the next step, as a speed so what it touches is pushed; a long way off,
// it jumps there.
export function chaseKinematic(body: Body, x: number, y: number, z: number) {
  const p = body.position;
  const dx = x - p.x,
    dy = y - p.y,
    dz = z - p.z;
  if (dx * dx + dy * dy + dz * dz > 36) {
    teleport(body, x, y, z);
    body.velocity.set(0, 0, 0);
  } else body.velocity.set(dx / FIXED, dy / FIXED, dz / FIXED);
}

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
// own safety net), so the fall-through net (catchFallThrough) leaves bodies there alone.
export const groundProbe = {
  under: (x: number, _y: number, z: number) => groundHeight(x, z),
  netted: (_x: number, _z: number) => true, // eslint-disable-line @typescript-eslint/no-unused-vars -- the caves replace it
};

// The physics engine has no continuous collision: a sphere that moves more than its radius in one step can end up with its
// centre under the heightfield, and the contact then pushes it out the bottom. Falls are capped below that speed
// (src/entities/player/state.ts: 0.33 m a step against a 0.45 m radius), and anything that still gets through is put back
// on top.
const NET_DEPTH = 0.1; // m of centre below the surface that counts as through (bilinear vs the heightfield's triangles)
export function catchFallThrough(body: Body, r: number) {
  const p = body.position;
  if (!groundProbe.netted(p.x, p.z)) return;
  const g = groundProbe.under(p.x, p.y, p.z);
  if (p.y > g - NET_DEPTH) return;
  teleport(body, p.x, g + r, p.z);
  if (body.velocity.y < 0) body.velocity.y = 0;
}

export const terrainBody = createBody({
  material: groundMat,
  group: GROUP.SCENERY,
  position: { x: -HALF, y: 0, z: HALF },
  shapes: [{ kind: 'heightfield', heights, cell: CELL }],
});
addBody(terrainBody);

// A player's body: yours (dynamic), or a remote's (kinematic: moved by the network, not by the ground).
export function makePlayerBody(kinematic: boolean) {
  return createBody({
    mass: kinematic ? 0 : PLAYER_MASS,
    type: kinematic ? BODY.KINEMATIC : BODY.DYNAMIC,
    material: playerMat,
    fixedRotation: true,
    mask: kinematic ? NOT_SCENERY : -1,
    shapes: [
      { kind: 'sphere', r: PLAYER_R },
      { kind: 'sphere', r: PLAYER_R, offset: { x: 0, y: HEAD_OFFSET, z: 0 } },
    ],
  });
}

/** A static body of spheres, not yet in the world: for an entity's `bodies`. */
export function staticSpheresBody(spheres: { x: number; y: number; z: number; r: number }[]) {
  // Centre the body on its spheres: the broadphase culls by a bounding sphere around body.position.
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const s of spheres) {
    cx += s.x / spheres.length;
    cy += s.y / spheres.length;
    cz += s.z / spheres.length;
  }
  return createBody({
    material: groundMat,
    group: GROUP.SCENERY,
    position: { x: cx, y: cy, z: cz },
    shapes: spheres.map((s) => ({ kind: 'sphere', r: s.r, offset: { x: s.x - cx, y: s.y - cy, z: s.z - cz } })),
  });
}
