// Where Q7's kit stands: on the Pier's piled deck (s 703-713 m, lat +1.8 to +6.0, at the trestle's deck height; call 55),
// not on the ground, which is the sea floor there. Its frame is the sim's (RING_Q7_FRAME, s 710, lat +4.5); the depot
// rack stands south of it, the rails' shelf between the rack and the platform's ramp. Pure numbers over ./line2-path.ts.
import { line2At, line2World, line2Y } from './line2-path.ts';

/** The deck's top over the rail line (planks 0.04 m proud, as the trestle's). */
export const Q7_DECK_UP = 0.04;
const SPOTS = {
  /** The log rack: 2.4 m along the line, its stack 4 wide. */
  rack: { s: 705.2, lat: 5.0 },
  /** The rails' shelf, 2.3 m along the line. */
  shelf: { s: 706.2, lat: 2.9 },
  /** Q7's personal box, at the deck's south end by the shelf (crates-view.ts). */
  crate: { s: 704, lat: 3.4 },
  /** The survey stake: the east edge of the deck where Q7's stretch ends (s 862). */
  stake: { s: 862, lat: 1.2 },
} as const;
export type Q7Spot = keyof typeof SPOTS;
/** World (x, z), the deck's top `y`, and the heading `yaw` (along the line, +z when the line runs due south) at a spot. */
export function q7Spot(spot: Q7Spot, out: { x: number; y: number; z: number; yaw: number }) {
  const { s, lat } = SPOTS[spot];
  const p = line2At(s, tmp);
  line2World(s, lat, out);
  out.y = line2Y(s) + (spot === 'stake' ? 0.1 : Q7_DECK_UP);
  out.yaw = Math.atan2(p.ux, p.uz);
  return out;
}
const tmp = { x: 0, z: 0, ux: 0, uz: 1 };
