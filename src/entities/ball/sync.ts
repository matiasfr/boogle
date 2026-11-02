// The beach ball on the wire. Owner state that changes hands (src/netplay/owner-sync.ts, set up in ./state.ts): the tab
// that simulates it publishes it as `b: { e, p, v, q, h }` (epoch, position, velocity, quaternion, held); a held ball
// reports its holder's velocity.
import { r2, r3 } from '../../math.ts';
import { me } from '../../player/state.ts';
import { addPresenceField, onRemotePresence } from '../../netplay/net.ts';
import { ball, ballOwner, type BallWire } from './state.ts';

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
