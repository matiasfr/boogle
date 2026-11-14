// Whether any player this tab draws (you, or a friend's avatar) stands on or in a station frame: a finished frame
// keeps its colliders and waits to fold until it is clear (frame-pack.ts; stations.ts `settle`). Local.
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';

type Holds = { holds(p: { x: number; y: number; z: number }): boolean };
export function frameOccupied(frame: Holds) {
  if (me.body && frame.holds(me.body.position)) return true;
  for (const peer of remotes.values())
    if (peer.entered && peer.avatar && frame.holds(peer.avatar.position)) return true;
  return false;
}
