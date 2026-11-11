// The railhead's numbers (ring-island-build1, R4b), pure: what stands where as the gap is footed, in metres out from the
// pier head (`u`, src/sim/railway-ring-layout.ts) and metres east of the down track (`lat`). No three.js, no rows: the
// view (./railhead-view.ts), the lookout's buoys and the tests read the same functions.
import { RING_BUOYS, RING_HEAD, RING_WALK } from '../../sim/railway-ring-layout.ts';

/** Bents 7..13 (index 0..6) stand at u 140, 160 ... 260; bent index j carries the deck from u 120 + 20 j to 140 + 20 j. */
export const BENTS = 7;
export const bentU = (j: number) => 140 + 20 * j;
export const spanFrom = (j: number) => 120 + 20 * j;
export const spanTo = (j: number) => 140 + 20 * j;
/** Footings set (0..14) to railheads (0..7): a bent's second footing moves the railhead on. */
export const headOf = (set: number) => Math.max(0, Math.min(BENTS, Math.floor(set / 2)));
/** The railhead's end, metres out (RING_HEAD[k].u). */
export const headU = (k: number) => RING_HEAD[Math.max(0, Math.min(BENTS, k))]!.u / 100;
/** The formation (lat -5.8 to +1.8; centre -2) and the side platform and walkway east of it (lat +1.8 to +6.3). */
export const DECK = { lat0: -5.8, lat1: 1.8, mid: -2 } as const;
export const SIDE = { lat0: 1.8, lat1: 6.3 } as const;
/** The railhead platform: 25 m behind the end, 0.9 m over the deck. */
export const PLATFORM = { len: 25, up: 0.9 } as const;
/** Where the platform stands with the railhead at `u`, and what is walkway behind it. */
export const platformSpan = (u: number) => [u - PLATFORM.len, u] as const;
export const walkwaySpan = (u: number) => [RING_WALK(0).u0 / 100, u] as const;
/** Fixtures along the railhead (metres out from the end, lat): the rack (RING_HEAD.rack), the jib's foot, the buffer's
 * face, and the stub's crossover (the up track eases onto the down track between merge - 20 and merge). */
export const RACK_BACK = 18,
  JIB_BACK = 3,
  BUFFER_BACK = 1.8,
  MERGE_BACK = 30,
  CROSS_LEN = 20;
export const crossoverSpan = (u: number) => [u - MERGE_BACK - CROSS_LEN, u - MERGE_BACK] as const;
/** How fast the railhead's kit follows a new railhead (m/s): a bent in about 3 s, as the lever's and the trains' merge. */
export const SLIDE = 7;
/** One frame of the slide: `shown` moves toward `goal` at most SLIDE m/s; a long way (a restore, a rewind) snaps. */
export function slide(shown: number, goal: number, dt: number) {
  if (Math.abs(goal - shown) > 25) return goal;
  return shown + Math.max(-SLIDE * dt, Math.min(SLIDE * dt, goal - shown));
}
/** How far the drawn deck reaches with `stood` bents standing (0..7): Q7's deck ends at u 120. */
export const deckEnd = (stood: number) => (stood > 0 ? spanTo(stood - 1) : 120);
/** The farthest a train's nose stands at railhead k (RING_HEAD: 3.8 m short of the end) while the gap is open. */
export const noseU = (k: number) => headU(k) - 3.8;
/** The buoy line (call 16): buoy `i` (0..6) is lifted from the start, at a railhead, or on the rivet. */
export function buoyLifted(i: number, head: number, joined: boolean) {
  const b = RING_BUOYS[i]!;
  return 'start' in b ? true : 'head' in b ? head >= b.head : joined;
}
/** Bent 13's extras (the hook pile and pad, the take-off rail, the joint's west platform and its plank crossing) stand
 * once the thirteenth bent's deck is down. */
export const extrasOn = (stood: number) => stood >= BENTS;
