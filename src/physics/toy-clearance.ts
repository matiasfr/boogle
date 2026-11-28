import type { Vector3, Vector3Like } from 'three';
import type { sweepSphere } from './engine.ts';
import { ROOM_GROUP, SCENERY_GROUP } from '../constants.ts';

// The engine supplies a read-only query. Before its world exists there are no solids to hit.
let sweep: typeof sweepSphere = () => -1;
export function bindToySweep(query: typeof sweepSphere) {
  sweep = query;
}

/** Keep the whole toy on the player's side of the first static obstruction between body and hand. */
export function clearToyRelease(from: Vector3Like, hand: Vector3, radius: number) {
  const length = hand.distanceTo(from);
  if (!length) return hand;
  const mask = SCENERY_GROUP | ROOM_GROUP;
  let clear = length;
  for (const thin of ['skip', 'only'] as const) {
    const hit = sweep(from, hand, radius, { mask, thin });
    if (hit >= 0) clear = Math.min(clear, Math.max(0, hit - 0.001));
  }
  return hand.lerp(from, 1 - clear / length);
}
