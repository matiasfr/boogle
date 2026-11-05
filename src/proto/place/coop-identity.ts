// Whole-place wire version: older peers can be visible without sharing this railway.
// Keep publishing and every capability consumer on the same identity.
export const COOP_IDENTITY = 'placeCoopCargo1';
export function currentCoopPeer(pr: Record<string, unknown>): pr is Record<string, unknown> & {
  [COOP_IDENTITY]: number;
} {
  const since = pr[COOP_IDENTITY];
  return typeof since === 'number' && Number.isSafeInteger(since) && since >= 0;
}
