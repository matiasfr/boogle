// Place participation and its authority-election tick, not a build capability.
// Other prototypes can share transport rooms without participating in this railway.
export const COOP_IDENTITY = 'placeCoop';
export function currentCoopPeer(pr: Record<string, unknown>): pr is Record<string, unknown> & {
  [COOP_IDENTITY]: number;
} {
  const since = pr[COOP_IDENTITY];
  return typeof since === 'number' && Number.isSafeInteger(since) && since >= 0;
}
