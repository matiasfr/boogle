// Owner state that changes hands: one physics object that any tab may simulate, and exactly one does. This is who
// simulates it (authority): the claim rule, each peer's latest claim and snapshots, the orphan pick, the flip between
// simulating and following, and sampling the owner's snapshots. What the object is stays with the object: its wire
// shape, its presence key, who may grab it and what holding means (docs/research/coop-physics-vehicles-netcode.md,
// recommendation 5, keeps grabbing apart from simulating). The ball is the example (src/entities/ball/).
//
//   const owner = createOwnerSync<Wire>(state, {
//     setMode(mode)                 'sim': dynamic, collides. 'ghost': kinematic, moved by hand or by the network
//     loadBody()                    the body takes the pose (position, rotation, velocity): a claim starts from there,
//                                   then setMode, so a claim as 'ghost' has setMode stop the body
//     writePose(p, a, b, u)         the pose follows the owner: position p (extrapolated), rotation from a.q to b.q by u,
//                                   anything else on the wire likewise
//     adoptOrphan()                 nobody has it and this tab should: claim it, and whatever else that means here
//     onRelease()                   this tab is letting go, by choice or outbid: whatever else that means here
//     onOwner(claim)                once a frame while this tab isn't the owner: the winning claim, or null for nobody
//     extrapolateMs                 how far past the last snapshot the pose may run on its velocity
//   });
//
// The object keeps `state` (below) on itself, so game code reads `ball.mine`, and calls these:
//
//   owner.claim(mode)               this tab takes it, one epoch up: the body takes the pose, the mode flips, presence goes
//   owner.release()                 this tab lets go, if it had it: onRelease, back to ghost, presence goes
//   owner.hear(peer, wire, time)    from onRemotePresence: a peer's claim, or anything else for none
//   owner.resolve(now)              once a frame, before the step: settles who owns it, then onOwner if it isn't this tab
//                                   (a tab that isn't on screen won't pick up an orphan)
//   owner.sample()                  once a frame, after resolve: writePose from the owner's snapshots, if it isn't this tab
//
// The presence key is the object's own `addPresenceField('key', ...)` and `hear(r.peer, pr.key, time)`, literal so
// `npm run registry` sees it. Each object lives as long as the page: nothing here unhooks from net.ts yet.
import { INTERP_MS } from '../constants.ts';
import { finiteArr, lerp } from '../math.ts';
import { net, remotes, keepPresenceWhile, onPeerRemoved, sendPresence, tabHidden } from './net.ts';
import { createSnaps } from './snaps.ts';

export type OwnerMode = 'sim' | 'ghost';
/** Who simulates the object, as this tab sees it. Lives on the object; only this module writes it. */
export type OwnerState = {
  e: number; // highest ownership epoch seen anywhere
  myE: number; // epoch of this tab's current claim
  mine: boolean; // this tab simulates the object and publishes it
  remoteOwned: boolean; // another tab simulates it
};
/** The least a claim carries on the wire. An object adds what else it needs. */
export type OwnerClaim = { e: number; p: number[]; v: number[]; q: number[] };
export type OwnedObject<C extends OwnerClaim> = {
  setMode(mode: OwnerMode): void;
  loadBody(): void;
  writePose(p: readonly number[], a: C, b: C, u: number): void;
  adoptOrphan(): void;
  onRelease(): void;
  onOwner(claim: C | null): void;
  extrapolateMs: number;
};

const ORPHAN_WAIT_MS = 600; // an owner that just left may only be between packets
const JOIN_WAIT_MS = 1500; // a tab that just joined hasn't heard everyone's claim yet

export function createOwnerSync<C extends OwnerClaim>(state: OwnerState, object: OwnedObject<C>) {
  type Peer = { peer: string; claim: C | null; snaps: ReturnType<typeof createSnaps<C>> };
  const peers = new Map<string, Peer>();
  let owner: Peer | null = null; // the peer simulating it, if it isn't this tab
  let orphanSince = 0;
  const p = [0, 0, 0];

  onPeerRemoved((r) => peers.delete(r.peer));
  keepPresenceWhile(() => state.mine); // the owner keeps publishing even from the title screen

  function release() {
    if (!state.mine) return;
    object.onRelease();
    state.mine = false;
    object.setMode('ghost');
    sendPresence();
  }

  // Highest epoch wins; a tie goes to the lexically larger peer label, so every tab picks the same owner. Nobody owns
  // it: the visible peer with the lowest label picks it up, and alone (solo) that's this tab at once.
  function settle(now: number): C | null {
    let best: Peer | null = null;
    let bestE = state.mine ? state.myE : -Infinity;
    let bestPeer = net.myPeer ?? '';
    for (const peer of peers.values()) {
      const c = peer.claim;
      if (!c) continue;
      if (c.e > bestE || (c.e === bestE && peer.peer > bestPeer)) {
        best = peer;
        bestE = c.e;
        bestPeer = peer.peer;
      }
      state.e = Math.max(state.e, c.e);
    }
    if (best) release();
    owner = best;
    state.remoteOwned = !!best;
    if (best || state.mine) {
      orphanSince = 0;
      return best ? best.claim : null;
    }

    if (net.state === 'solo') {
      object.adoptOrphan();
      return null;
    }
    if (!net.room) return null;
    if (!orphanSince) orphanSince = now;
    if (now - orphanSince < ORPHAN_WAIT_MS || now - net.readyAt < JOIN_WAIT_MS || !net.myPeer || tabHidden())
      return null;
    let lowest = net.myPeer;
    for (const r of remotes.values()) if (r.visible && r.peer < lowest) lowest = r.peer;
    if (lowest === net.myPeer) object.adoptOrphan();
    return null;
  }

  return {
    claim(mode: OwnerMode) {
      state.myE = state.e + 1;
      state.e = state.myE;
      state.mine = true;
      state.remoteOwned = false;
      object.loadBody();
      object.setMode(mode);
      sendPresence();
    },

    release,

    hear(peerId: string, wire: unknown, time: number) {
      let peer = peers.get(peerId);
      if (!peer) peers.set(peerId, (peer = { peer: peerId, claim: null, snaps: createSnaps<C>() }));
      const c = wire as C | null | undefined;
      if (c && Number.isFinite(c.e) && finiteArr(c.p, 3) && finiteArr(c.v, 3) && finiteArr(c.q, 4)) {
        peer.claim = c;
        peer.snaps.push(time, { ...c });
      } else {
        peer.claim = null;
        peer.snaps.clear();
      }
    },

    resolve(now: number) {
      const claim = settle(now);
      if (!state.mine) object.onOwner(claim);
    },

    sample() {
      if (state.mine || !owner?.claim || !owner.snaps.length) return;
      const s = owner.snaps.sample(performance.now() - INTERP_MS);
      if (!s) return;
      const { a, b, u, over } = s;
      const ex = Math.min(over, object.extrapolateMs) / 1000;
      for (let k = 0; k < 3; k++) p[k] = lerp(a.p[k]!, b.p[k]!, u) + b.v[k]! * ex;
      object.writePose(p, a, b, u);
    },
  };
}
