import { PLAYER_R } from '../../constants.ts';
import { fromPlatform, platformById } from '../../physics/platforms.ts';
import type { ReturnCandidate, ReturnPosition } from '../../place/return-spot.ts';
import type { ReturnHalts } from './return-halts.ts';

/** Read the live row and the fixed-step collider together, at placement. The four aisle ends avoid the centre bench. */
export function passengerSpot(
  halts: ReturnHalts,
  halt: ReturnCandidate,
  free: (x: number, y: number, z: number) => boolean,
): ReturnPosition | null {
  for (const id of halts.passengerDecks(halt.line!, halt.stop!)) {
    const deck = platformById(id);
    if (!deck) continue;
    const { position, velocity, angularVelocity } = deck.body;
    if (
      Math.hypot(position.x - halt.x, position.z - halt.z) > 50 ||
      Math.hypot(velocity.x, velocity.y, velocity.z, angularVelocity.y) > 0.01
    )
      continue;
    for (const end of [-1, 1])
      for (const side of [-1, 1]) {
        // The bench extends to x=0.56. Keep the player's radius clear, feet just inside the deck edge.
        const local = { x: side * (deck.hx - 0.08), y: deck.top, z: end * (deck.hz - PLAYER_R), yaw: 0 };
        const p = fromPlatform(deck, local, false, { ...local });
        if (free(p.x, p.y, p.z)) return p;
      }
  }
  return null;
}
