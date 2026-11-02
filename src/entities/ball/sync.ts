// Who owns the beach ball. Owner state (DESIGN.md): the tab that simulates it publishes it as `b: { e, p, v, q, h }`
// (epoch, position, velocity, quaternion, held); a held ball reports its holder's velocity. Other tabs keep each peer's
// last claim and snapshots here, and smooth only the owner's into the pose in ./state.ts.
import * as THREE from 'three';
import { INTERP_MS } from '../../constants.ts';
import { lerp, finiteArr, r2, r3 } from '../../math.ts';
import { me } from '../../player/state.ts';
import {
  net,
  remotes,
  addPresenceField,
  onRemotePresence,
  onPeerRemoved,
  keepPresenceWhile,
} from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';
import { ball, claimBall, releaseBall } from './state.ts';

/** The ball as its owner publishes it (presence `b`). */
export type BallWire = { e: number; p: number[]; v: number[]; q: number[]; h: number };
type BallSample = { p: number[]; v: number[]; q: number[]; h: number };
/** A peer as this module sees them: their last ball claim and its snapshots. */
type PeerBall = { peer: string; claim: BallWire | null; snaps: ReturnType<typeof createSnaps<BallSample>> };

const peers = new Map<string, PeerBall>();
let owner: PeerBall | null = null; // the peer simulating the ball, if it isn't this tab
let orphanSince = 0;

export function remoteHoldsBall() {
  return !ball.mine && ball.remoteOwned && ball.held;
}

addPresenceField('b', () => {
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
onRemotePresence((r, pr, time) => {
  let peer = peers.get(r.peer);
  if (!peer) peers.set(r.peer, (peer = { peer: r.peer, claim: null, snaps: createSnaps<BallSample>() }));
  const b = pr.b as BallWire | undefined;
  if (b && Number.isFinite(b.e) && finiteArr(b.p, 3) && finiteArr(b.v, 3) && finiteArr(b.q, 4)) {
    peer.claim = b;
    peer.snaps.push(time, { p: b.p, v: b.v, q: b.q, h: b.h });
  } else {
    peer.claim = null;
    peer.snaps.clear();
  }
});
onPeerRemoved((r) => peers.delete(r.peer));

// The owner keeps publishing the ball even from the title screen.
keepPresenceWhile(() => ball.mine);

// Highest epoch wins; a tie goes to the lexically larger peer label, so every tab picks the same owner. `hidden`: this
// tab isn't on screen, so it won't pick up an orphaned ball.
export function resolveBallOwner(now: number, hidden: boolean) {
  let best: PeerBall | null = null;
  let bestE = ball.mine ? ball.myE : -Infinity;
  let bestPeer = net.myPeer ?? '';
  for (const p of peers.values()) {
    const b = p.claim;
    if (!b) continue;
    if (b.e > bestE || (b.e === bestE && p.peer > bestPeer)) {
      best = p;
      bestE = b.e;
      bestPeer = p.peer;
    }
    ball.e = Math.max(ball.e, b.e);
  }
  if (ball.mine && best) releaseBall();
  owner = best;
  ball.remoteOwned = !!best;
  if (best) ball.held = !!best.claim!.h;
  if (best || ball.mine) {
    orphanSince = 0;
    return;
  }

  if (net.state === 'solo') {
    claimBall(false);
    return;
  }
  if (!net.room) return;
  if (!orphanSince) orphanSince = now;
  if (now - orphanSince < 600 || now - net.readyAt < 1500 || !net.myPeer || hidden) return;
  let lowest = net.myPeer;
  for (const r of remotes.values()) if (r.visible && r.peer < lowest) lowest = r.peer;
  if (lowest === net.myPeer) claimBall(false);
}

const tmpQa = new THREE.Quaternion(),
  tmpQb = new THREE.Quaternion();

// Before the step: another tab's ball, its pose from that tab's snapshots.
export function sampleBallPose() {
  if (ball.mine || !owner?.claim || !owner.snaps.length) return;
  const s = owner.snaps.sample(performance.now() - INTERP_MS);
  if (!s) return;
  const { a, b, u, over } = s;
  const ex = Math.min(over, 150) / 1000;
  ball.pose.p.set(
    lerp(a.p[0]!, b.p[0]!, u) + b.v[0]! * ex,
    lerp(a.p[1]!, b.p[1]!, u) + b.v[1]! * ex,
    lerp(a.p[2]!, b.p[2]!, u) + b.v[2]! * ex,
  );
  tmpQa.set(a.q[0]!, a.q[1]!, a.q[2]!, a.q[3]!).normalize();
  tmpQb.set(b.q[0]!, b.q[1]!, b.q[2]!, b.q[3]!).normalize();
  ball.pose.q.slerpQuaternions(tmpQa, tmpQb, u);
  ball.pose.v.set(b.v[0]!, b.v[1]!, b.v[2]!);
}
