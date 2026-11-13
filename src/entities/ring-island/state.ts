// Ring Island's near view, the shared reads (docs/plans/ring-island-build1.md, R2b). Local: no sync, no saves.
//   ringIslandPose   the leaf's pose other views write (R4c) and view.ts draws each frame, so R4 never edits R2's files
//   ringIslandNear   whether the near view is mounted (the far leaf, R2c, draws only while it isn't), and `keep`, which
//                    R4a sets once Q7 is laid so the near view stays mounted at any distance
//   islandGround()   the island's ground (./ground.ts) once, for recovery and the saved pose (railway arrival.ts)
//   ringUnstuck()    where Get unstuck puts someone past the gap (call 31)
import { jumpOf, type JumpLand } from '../../world/railway-jump.ts';
import { RING_GAP, RING_FORMATION, RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
import { createIslandGround, ringUL, type IslandGround } from './ground.ts';

/** The leaf: degrees up from the deck (78 raised, 0 down), counterweight footings in its bracket (0..4), braced. */
export const ringIslandPose = { leaf: 78, bracket: 0, braced: false };
export const ringIslandNear = { mounted: false, keep: false };
/** The low map table on the west platform (view.ts builds it; railway/ring-map-table.ts lays the halt map over its
 * paint from the rivet): the middle of its top in world metres, `top` the height its top's box starts at, the top
 * `w` m along world x by `d` m along z. */
export const RING_MAP_TABLE = (() => {
  const p = ringAt(RING_HALT.u0 + 1400, RING_FORMATION.left - 175);
  return { x: p.x / 100, z: p.z / 100, top: RING_HALT.y / 100 + 0.9 + 0.95, w: 2.4, d: 2.0 };
})();

let ground: Promise<IslandGround> | null = null;
/** The island's ground, built once (about 40 ms) from Place's cones. */
export function islandGround() {
  ground ??= Promise.all([import('../../proto/greybox/ring-cones.ts'), import('../../place/layout.ts')]).then(
    ([{ RING_CONES }, { FAR, ORIGIN }]) => createIslandGround(RING_CONES, { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z }),
  );
  return ground;
}

/** Past the gap: beyond the joint's toe (u 262 m) within the folk's reach of the line, or anywhere on the island's grid. */
export function pastGap(g: IslandGround, x: number, z: number) {
  if (g.onIsland(x, z)) return true;
  const { u, lat } = ringUL(x, z);
  return u > RING_GAP.toe / 100 + 2 && u < RING_HALT.u1 / 100 + 120 && lat > RING_FORMATION.left / 100 - 60 && lat < 60;
}
/** Before the Meet, Get unstuck from past the gap puts you on our side (design review call 31). Before v27 there is no
 * railhead and bents 1-6 carry no deck (no collider stands on bent 6 until Q7), so our side is the farthest built deck
 * on line 2: the Pier halt's, crossing-done's jump-in landing (src/world/railway-jump.ts: the east platform's south
 * end since v27, call 57), facing the crossing. It stays the Pier's through build 1 (call 49). */
export const ringUnstuckHome: JumpLand = { ...jumpOf('crossing-done')!.land! };
export function ringUnstuck(g: IslandGround, x: number, z: number) {
  return pastGap(g, x, z) ? ringUnstuckHome : null;
}
