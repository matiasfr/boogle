// Split-rock Works and Roundhouse positions, world centimetres, pinned from Place and the Sickle map (8 Nov 2026).
// The Works rules (./railway-works.ts, ./railway-sys-works.ts) and the server read it. No prototype imports.
import { LINE1_ROCKS } from './railway-line-layout.ts';
import { RING_RIVET } from './railway-ring-layout.ts';

export const WORKS = {
  kilnLogs: 16,
  kilnStone: 16,
  castTicks: 80,
  rackCap: 6,
  stall: 2,
  // The cradle takes its eight rails and no footings (docs/plans/works-late-game.md, step 2): two footings go home by
  // hand, for the stall, and the kiln casts the stall's two and the pier's twelve.
  cradle: 0,
  cradleRails: 8,
  pier: 12,
  // Ring Island (ring-island-build1, R3b; call 18): fourteen footings for bents 7-13 and four for the counterweight,
  // from the same kiln fill: 2 + 12 + 14 + 4.
  ring: 14,
  counterweight: 4,
  total: 32,
  wagonCap: 6,
  rollTicks: 60,
} as const;
export const WORKS_SEAMS = [
  { id: 0, name: 'stall', x: 91240, z: 1760, y: 1830, reach: 400 },
  { id: 1, name: 'throat', x: 111900, z: 8200, y: 2400, reach: 500 },
  // The gold rivet at the leaf's toe (rail.strike id 2, Ring Island's): struck once the leaf is down.
  { id: 2, name: 'rivet', ...RING_RIVET },
] as const;
export const WORKS_BREAKER = { x: 91900, z: 540, y: 1815, reach: 420 } as const;
export const WORKS_CLEFT = { x: 116000, z: 12000, y: 2148 } as const;
export const WORKS_KILN = { x: 112800, z: 8700, y: 2420, reach: 450 } as const;
export const WORKS_RACK = { x: 108800, z: 5000, y: 2400, reach: 400 } as const;
export const WORKS_ROCKS = [
  { id: 3, x: 114500, z: 10500, y: 2462, initial: 8 },
  { id: 4, x: 115000, z: 9800, y: 2468, initial: 8 },
] as const;
export const SHED_STALL = { x: 90950, z: 2050, y: 1800, reach: 500 } as const;
export const SHED_TABLE = { x: 91800, z: 1200, y: 1830, reach: 600 } as const;
export const SHED_ROAD = { stall: 0, line2: 1 } as const;
export const WAGON_S = 960;
// Line 2 stands 3.5 m short of the Pier halt's middle (s 730), so its engine stops 2.7 m clear of the track layer
// parked at the rails' end (742 m, its loco's back at 734.4 m), still 1.2 m with an engine half as long again, and the
// wagon still stands at the halt's landward end (s 719-741).
export const PIER_STOP_CM = 72650;
export const PIER_STOP = { x: 140275, z: -35496, y: 2430 } as const;
// Least displacement on the centimetre grid to clear the real rail by 3.5 m (not its 1 m sample vertices), east of
// the down track at s 733 m since v27 (ring-island-build1, call 54): on the Pier platform's seaward edge, so a footing
// goes rack to jib without crossing the track and the up track Q7 lays passes clear of it.
export const PIER_RACK = { x: 140594, z: -36208, y: 2430, reach: 400 } as const;
export const PIER_FRAME = { x: 140554, z: -37107, y: 2430, reach: 500 } as const;
// The six bents carry the 7.6 m double deck (world-blockout ruling 11): each centre is the formation's middle, 2 m west
// of line 2's track at u = 20 n (bent n), and its two footings stand 3.3 m either side of it. View only: the sim counts
// set footings (`Works.pierSet`) and never reads a socket's position.
export const CROSSING_BENTS = [
  { x: 140054, z: -39205 },
  { x: 140109, z: -41204 },
  { x: 140163, z: -43203 },
  { x: 140217, z: -45202 },
  { x: 140272, z: -47202 },
  { x: 140326, z: -49201 },
] as const;
export const CROSSING_FOOT_OFF = 330;
/** Each bent's deck top, world cm: the bow at the 4% ruling grade from the pier head (ring-island ruling 5), 24.3 m at
 * bent 1 and 0.8 m lower each 20 m bent, so bent 6 is 20.3 m. */
export const CROSSING_DECK_Y = [2430, 2350, 2270, 2190, 2110, 2030] as const;
export const RAIL_ROCKS = [...LINE1_ROCKS, ...WORKS_ROCKS] as const;
/** Every rock slot's starting stone: the conserved stone total before renewal (`railCounts(s).stone.total` and
 * validateRailLine both equal this plus `stoneProduced`). */
export const RAIL_STONE = RAIL_ROCKS.reduce((n, r) => n + r.initial, 0);
