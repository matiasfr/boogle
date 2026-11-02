// The beach ball on the wire. Owner state that changes hands (src/netplay/owner-sync.ts, set up in ./state.ts): the tab
// that simulates it publishes it as `b: { e, p, v, q, h }` (epoch, position, velocity, quaternion, held); a held ball
// reports its holder's velocity.
import { r2, r3 } from '../../math.ts';
import { me } from '../../player/state.ts';
import { addPresenceField, onRemotePresence } from '../../netplay/net.ts';
import { ball, ballOwner } from './state.ts';

/** The ball as its owner publishes it (presence `b`). */
export type BallWire = { e: number; p: number[]; v: number[]; q: number[]; h: number };

export function remoteHoldsBall() {
  return !ball.mine && ball.remoteOwned && ball.held;
}

addPresenceField('b', (): BallWire | null => {
  if (!ball.mine) return null;
  const bp = ball.body.position,
    bq = ball.body.quaternion;
  const bv = ball.held && me.body ? me.body.velocity : ball.body.velocity;
  return {
    e: ball.myE,
    p: [r2(bp.x), r2(bp.y), r2(bp.z)],
    v: [r2(bv.x), r2(bv.y), r2(bv.z)],
    q: [r3(bq.x), r3(bq.y), r3(bq.z), r3(bq.w)],
    h: ball.held ? 1 : 0,
  };
});
onRemotePresence((r, pr, time) => ballOwner.hear(r.peer, pr.b, time));

export function resolveBallOwner(now: number, hidden: boolean) {
  const claim = ballOwner.resolve(now, hidden);
  if (claim) ball.held = !!(claim as BallWire).h;
  // Its holder is gone: nobody holds it, even in a hidden tab that won't adopt it (placeBall would refuse for good).
  else if (!ball.mine) ball.held = false;
}
