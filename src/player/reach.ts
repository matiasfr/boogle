// Is a thing that stands somewhere in reach of you? The reach across stays as generous as ever, but you have to be up at
// its level: a box on a ledge isn't in reach from the ground under the ledge (owner, 10 November 2026, the mossy scarf
// opened from the ground under the lookout), nor from the top of one jump beside it when it is meant to need two (G27,
// 18 November 2026: Grant opened it so; docs/plans/grant-c8-batch.md). Pure: test/reach.test.ts.
import { PLAYER_R } from '../constants.ts';

export const LEVEL = {
  /** m your feet may be under the thing's base, right beside it. */
  below: 0.6,
  /** And this much more for each metre across: reaching down a slope to a box on the ground still works. */
  slope: 0.3,
  /** m your feet may be over its base: mid-jump beside it, or a step up. */
  above: 2.2,
  /** m your feet may be under the ledge a raised thing is opened from, at any distance (no slope). */
  ledge: 0.3,
} as const;

type At = { x: number; y: number; z: number };

/** `body`: the player's body centre (the feet are PLAYER_R under it). `base`: where the thing rests. `reach`: across.
 * `ledge`: for a thing up on a ledge, the height of the ledge you're meant to stand on to open it (its own base, or the
 * slab a plinth under it stands on); left out for a thing on the ground. */
export function inReach(body: At, base: At, reach: number, ledge?: number): boolean {
  const d = Math.hypot(body.x - base.x, body.z - base.z);
  if (d >= reach) return false;
  const feet = body.y - PLAYER_R,
    up = feet - base.y;
  if (up > LEVEL.above) return false;
  return ledge === undefined ? up >= -(LEVEL.below + LEVEL.slope * d) : feet >= ledge - LEVEL.ledge;
}
