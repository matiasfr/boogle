// High Gorge's yard as the views stand it (docs/plans/greybox-leg2.md, step 4): where yard leg k's yard stands, and the
// units in the air into it. Local presentation: train-view.ts counts a flight up as a line 2 train unloads past what
// the incline's first rack lacks, and down as each crate lands; route-greybox/leg-view.ts draws the yard's accepted
// count less it.
import type { ReadWorld } from '../../sim/railway-rows.ts';
import { RAIL_LEGS, RAIL_YARDS, legRack, legS } from '../../sim/railway-route.ts';
import { legRow } from '../../sim/railway-queries-route.ts';
import { line2At } from './line2-path.ts';

/** The units a line 2 train sets into High Gorge's yard (the incline's, past what its first rack lacks):
 * the yard's pile draws its accepted count less this. */
export const legYardFlight = { logs: 0, rails: 0 };
/** Where yard leg k's yard stands, world metres: 3.4 m further along line 2's south platform from its first rack
 * (toward Ring Island), so the pile and the rack read as two piles side by side and the hop lands on either. */
export function legYardSpot(k: number) {
  const rack = legRack(RAIL_LEGS[k]!, 0),
    fed = RAIL_LEGS[RAIL_YARDS[RAIL_LEGS[k]!.kit as number]!.fedBy]!,
    at = line2At(legS(fed, fed.sections.at(-1)!.toCm) / 100 - 10, { x: 0, z: 0, ux: 0, uz: 1 });
  return { x: rack.x / 100 - at.ux * 3.4, y: rack.y / 100, z: rack.z / 100 - at.uz * 3.4, reach: rack.reach };
}
/** Where a take from leg `leg`'s current rack lifts from, world metres (0.3 m over the rack), or null for a take with
 * no leg (the old depot's). */
export function legRackLift(w: ReadWorld, leg: number | undefined) {
  if (leg === undefined) return null;
  const rack = legRack(RAIL_LEGS[leg]!, legRow(w, leg).laid);
  return { x: rack.x / 100, y: rack.y / 100 + 0.3, z: rack.z / 100 };
}
