// Shared High Gorge coordinates. All massing construction lives in content/levels/gorge.ts.
import { RAIL_GATES, RAIL_GRANTS } from '../../sim/railway-route.ts';

/** The split's frame (docs/world/map-prototypes.html, the `gorge` terrain line; world metres). */
const G0 = { x: -103, z: -1988 },
  A = { x: 0.8565, z: 0.5162 },
  C = { x: -0.5162, z: 0.8565 };
export const gorgeAt = (a: number, c: number, y = 0) => ({
  x: G0.x + A.x * a + C.x * c,
  y,
  z: G0.z + A.z * a + C.z * c,
});
/** The halt's deck: the platforms' top, 0.9 m over the 3.0 m rails. */
export const GORGE_DECK = 3.9;
/** The rim (the stacks' top in the map). */
export const GORGE_RIM = 85;
const WALL = 45;
/** The stair (answer k): four flights of 38 m rising 20.3 m (the Ring ramps' 5.4 in 10), 3 m wide, in two strips side
 * by side on the north wall (c -45 to -42 and -42 to -39; odd flights against the wall, even flights outside them: stacked on one strip, a flight's
 * last metres ran under the next one's first with a metre of headroom), a 3 m landing at each turn. */
export const STAIR = { a0: 3, a1: 41, rise: 20.3, w: 3, inner: -WALL, flights: 4 } as const;
/** The stand-in town's pad, west of the gangway on the way to the stair. */
export const TOWN_PAD = { a0: -26, a1: -4, c0: -40, c1: -14 } as const;

const metres = (p: { x: number; y: number; z: number }) => ({ x: p.x / 100, y: p.y / 100, z: p.z / 100 });
/** The pickup post on the north rim and the incline's barrier behind the south platform (the catalog's points). */
export const PICK_AT = metres(RAIL_GRANTS[0]!.at),
  GATE_AT = metres(RAIL_GATES[0]!.at);
