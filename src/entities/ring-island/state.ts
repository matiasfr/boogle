// Ring Island's near view, the shared reads (docs/plans/ring-island-build1.md, R2b). Local: no sync, no saves.
//   ringIslandPose   the leaf's pose other views write (R4c) and view.ts draws each frame, so R4 never edits R2's files
//   ringIslandNear   whether the near view is mounted (the far leaf, R2c, draws only while it isn't), and `keep`, which
//                    R4a sets once Q7 is laid so the near view stays mounted at any distance
//   islandGround()   the island's ground (./ground.ts) once, for recovery and the saved pose (railway arrival.ts)
//   ringUnstuck()    where Get unstuck puts someone past the gap (call 31)
//   RING_CROSSING    the island halt's foot crossing, and ringCrossingPlanks() its spans between the rails
import { jumpOf, type JumpLand } from '../../world/railway-jump.ts';
import { RING_GAP, RING_FORMATION, RING_HALT, ringAt } from '../../sim/railway-ring-layout.ts';
import { createIslandGround, ringUL, type IslandGround } from './ground.ts';

/** The leaf: degrees up from the deck (78 raised, 0 down), counterweight footings in its bracket (0..4), braced. */
export const ringIslandPose = { leaf: 78, bracket: 0, braced: false };
export const ringIslandNear = { mounted: false, keep: false };
const mountListeners = new Set<() => void>();
export function onRingSceneryMounted(fn: () => void) {
  mountListeners.add(fn);
  return () => {
    mountListeners.delete(fn);
  };
}
export function ringSceneryMounted() {
  for (const fn of mountListeners) fn();
}
/** The same two anchors and near radius used by index.ts's body-driven residency. */
export function ringAreaPending(x: number, z: number) {
  const anchors = [
    ringAt(RING_GAP.hinge, RING_FORMATION.mid),
    ringAt((RING_HALT.u0 + RING_HALT.u1) / 2, RING_FORMATION.mid),
  ];
  return !ringIslandNear.mounted && anchors.some((p) => Math.hypot(x - p.x / 100, z - p.z / 100) < 500);
}
/** The low map table on the west platform (view.ts builds it; railway/ring-map-table.ts lays the halt map over its
 * paint from the rivet): the middle of its top in world metres, `top` the height its top's box starts at, the top
 * `w` m along world x by `d` m along z. */
export const RING_MAP_TABLE = (() => {
  const p = ringAt(RING_HALT.u0 + 1400, RING_FORMATION.left - 175);
  return { x: p.x / 100, z: p.z / 100, top: RING_HALT.y / 100 + 0.9 + 0.95, w: 2.4, d: 2.0 };
})();
/** The island halt's foot crossing (docs/plans/ring-island-crossing.md), in ring metres: planks over both tracks from
 * `u0` to `u1` at the platforms' south end, a landing each side over `landing` at the rail tops (`top`, m), and a ramp
 * the platform's full width up to the platform at `rampTop`, where the platforms now start. view.ts builds it and
 * dev/level/ring.ts checks it against the standing trains. Static scenery: no state, no sync. */
export const RING_CROSSING = {
  u0: 428.1,
  u1: 430.5,
  landing: [428, 430.6],
  rampTop: 434.6,
  top: RING_HALT.y / 100 + 0.22,
} as const;
/** The crossing's plank spans across the bed, [lat0, lat1] m, east to west: the bed's width less a flangeway by each
 * rail (rails 0.5 m either side of a track, 0.08 m clear each side, as Place's crossingPlanks). */
export function ringCrossingPlanks(): [number, number][] {
  const out: [number, number][] = [];
  let from = RING_FORMATION.right / 100;
  for (const t of [...RING_FORMATION.tracks].sort((a, b) => b - a))
    for (const rail of [t / 100 + 0.5, t / 100 - 0.5]) {
      out.push([rail + 0.08, from]);
      from = rail - 0.08;
    }
  out.push([RING_FORMATION.left / 100, from]);
  return out;
}

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
