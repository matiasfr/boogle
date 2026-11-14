// Where a request lever stands on a platform this view places itself, and how it yields the Interact pick
// (docs/plans/running-side.md, the lever rule; owner, 14 November: "the signal to request a stop is right next to where
// I deposit the footings"). Pure numbers, so test/halt-lever-place.test.ts can hold the clearances.
import { RING_HEAD, RING_PLATFORM_LAT } from '../../sim/railway-ring-layout.ts';
import { PIER_FRAME, PIER_RACK, SHED_STALL, WORKS_RACK } from '../../sim/railway-works-layout.ts';
import { haltPlatform, type RailPlatform } from '../../sim/railway-lines.ts';
import { haltHead } from '../../sim/railway-queries-route.ts';
import { ringHead } from '../../sim/railway-queries.ts';
type World = Parameters<typeof ringHead>[0];

/** The lever rule's distances (cm): in from the boarding edge, and from the end the train leaves toward (the
 * generated halts' levers use the same two, src/prefab/halt-attachments.ts). The railhead's lever stands `railheadEnd`
 * from its platform's end instead: the rack is on the same 25 m platform, and every centimetre toward the end is
 * clearance from it. */
export const LEVER_PLACE = { edge: 80, fromEnd: 140, railheadEnd: 60 } as const;

/** The railhead's east lever at head `head`, metres along the ring and off the down track: at its sliding platform's
 * home end, the way its train leaves. It stood 6 m short of the far end, 3.2 m from the jib's foot and inside its
 * reach; here the jib is 21.4 m off, and the knob is 6.35 m from the rack with the handle over (its nearest), so the
 * two prompts' reaches end 0.95 m apart at the least (test/halt-lever-place.test.ts). */
export const railheadLever = (head: number) => ({
  u: (RING_HEAD[head]!.u - RING_PLATFORM_LAT.len + LEVER_PLACE.railheadEnd) / 100,
  lat: (RING_PLATFORM_LAT.lat0 + LEVER_PLACE.edge) / 100,
});

/** The platform the server judges a lever's ask from: `rail.call`'s own choice (src/world/railway-server.ts). */
export const leverPlatform = (w: World, halt: number, way: number) =>
  haltPlatform(halt, way, haltHead(w, halt, ringHead(w)));
/** Whether the server would take a lever ask from (x, y, z) metres: `rail.call`'s position test, both limits (flat
 * reach of the platform's middle, and within 2.6 m of 0.4 m over it), on the centimetres the adapter sends. A lever
 * offers no prompt where this is false. */
export function leverAskTaken(plat: RailPlatform, x: number, y: number, z: number) {
  const cm = (n: number) => Math.round(n * 100),
    dx = cm(x) - plat.x,
    dz = cm(z) - plat.z;
  return Math.abs(cm(y) - (plat.y + 40)) <= 260 && dx * dx + dz * dz <= plat.reach * plat.reach;
}

/** How much further off (m) a lever counts for the Interact pick (src/sim/interact-pick.ts, `r`) while you carry a
 * footing where a footing is worked: more than the widest such reach (5 m) plus both facing nudges, so the footing's
 * action wins wherever both are in reach. */
export const LEVER_YIELD = 8;
/** Where a footing is shouldered or set (rail.footTake's racks and rail.footSet's sites, railway-server.ts): the
 * Works rack, the pier's and the railhead's racks, the stall and cradle, the pier's frame and the railhead's jib. */
export const footingSites = (head: number) => [
  WORKS_RACK,
  PIER_RACK,
  RING_HEAD[head]!.rack,
  SHED_STALL,
  PIER_FRAME,
  RING_HEAD[head]!.jib,
];
/** The lever's `r` for the pick: it yields only while you carry a footing and stand inside the reach of somewhere a
 * footing is worked. Anywhere else (a loose pile beside the lever, a bench) the lever competes as it always did. */
export function leverYield(carrying: boolean, x: number, z: number, head: number) {
  if (!carrying) return 0;
  const near = footingSites(head).some((s) => Math.hypot(x - s.x / 100, z - s.z / 100) <= s.reach / 100);
  return near ? -LEVER_YIELD : 0;
}
