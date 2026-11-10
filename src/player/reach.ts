// Is a thing that stands somewhere in reach of you? The reach across stays as generous as ever, but you have to be up at
// its level: a box on a ledge isn't in reach from the ground under the ledge (owner, 10 November 2026, the mossy scarf
// opened from the ground under the lookout). Pure: test/reach.test.ts.
import { PLAYER_R } from '../constants.ts';

export const LEVEL = {
  /** m your feet may be under the thing's base, right beside it. */
  below: 0.6,
  /** And this much more for each metre across: reaching down a slope to a box on the ground still works. */
  slope: 0.3,
  /** m your feet may be over its base: mid-jump beside it, or a step up. */
  above: 2.2,
} as const;

type At = { x: number; y: number; z: number };

/** `body`: the player's body centre (the feet are PLAYER_R under it). `base`: where the thing rests. `reach`: across. */
export function inReach(body: At, base: At, reach: number): boolean {
  const d = Math.hypot(body.x - base.x, body.z - base.z);
  if (d >= reach) return false;
  const up = body.y - PLAYER_R - base.y;
  return up <= LEVEL.above && up >= -(LEVEL.below + LEVEL.slope * d);
}
