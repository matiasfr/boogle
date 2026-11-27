// Whether any player this tab draws (you, or a friend's avatar) stands on or in a station frame: a finished frame
// keeps its colliders and waits to fold until it is clear (frame-pack.ts; stations.ts `settle`). Local.
import type { Shape } from '../../physics/engine.ts';
import { liftOrWait } from '../../prefab/instantiate.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';

type Holds = { holds(p: { x: number; y: number; z: number }): boolean };
/** A friend's avatar is on or in it. */
export function frameHasRemote(frame: Holds) {
  for (const peer of remotes.values())
    if (peer.entered && peer.avatar && frame.holds(peer.avatar.position)) return true;
  return false;
}
/** You or a friend's avatar is on or in it. */
export const frameOccupied = (frame: Holds) => (!!me.body && frame.holds(me.body.position)) || frameHasRemote(frame);

/** Stand a whole set together, once it clears visitors and the local body can stand safely. */
export function standWhenClear(shapes: readonly Shape[], on: () => void) {
  return liftOrWait([{ shapes, on }], me.body, { lift: true, visitor: frameHasRemote }).kind !== 'wait';
}
