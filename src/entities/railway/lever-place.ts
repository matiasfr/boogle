// Where a request lever stands on a platform this view places itself, and how it yields the Interact pick
// (docs/plans/running-side.md, the lever rule; owner, 14 November: "the signal to request a stop is right next to where
// I deposit the footings"). Pure numbers, so test/halt-lever-place.test.ts can hold the clearances.
import { RING_HEAD, RING_PLATFORM_LAT } from '../../sim/railway-ring-layout.ts';

/** The lever rule's two distances (cm): in from the boarding edge, and from the end the train leaves toward. The
 * generated halts' levers use the same two (src/prefab/halt-attachments.ts). */
export const LEVER_PLACE = { edge: 80, fromEnd: 140 } as const;

/** The railhead's east lever at head `head`, metres along the ring and off the down track: at its sliding platform's
 * home end, the way its train leaves. It stood 6 m short of the far end, 3.2 m from the jib's foot and inside its
 * reach; here the jib is 20.6 m off and the rack 6.0 m (its reach ends 0.6 m short of the lever's: the 25 m platform
 * is too short, inside the server's reach of its middle, to clear the rack by more). */
export const railheadLever = (head: number) => ({
  u: (RING_HEAD[head]!.u - RING_PLATFORM_LAT.len + LEVER_PLACE.fromEnd) / 100,
  lat: (RING_PLATFORM_LAT.lat0 + LEVER_PLACE.edge) / 100,
});

/** How much further off (m) a lever counts for the Interact pick (src/sim/interact-pick.ts, `r`) while you carry a
 * footing: more than the widest reach of anything a footing is set at or shouldered from (6 m) plus both facing
 * nudges, so the footing's action wins wherever both are in reach and the lever still answers where nothing else does. */
export const LEVER_YIELD = 8;
