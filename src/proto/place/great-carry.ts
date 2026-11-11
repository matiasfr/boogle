// Station 3's great beam: one cargo owner and an optional supporting shoulder, never chained physics.
// DESIGN.md 4, Cooperation is automatic; 8, Designed for drop-in, drop-out. Helper grip is Owner presence;
// the beam stays on its original back, so coop.ts's existing departure/refund/deposit rules remain its only authority.
import * as THREE from 'three/webgpu';
import { INTERP_MS } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { addPresenceField, net, onPeerRemoved, onRemotePresence, onRoomReady, remotes } from '../../netplay/net.ts';
import { registerInteractable } from '../../player/hands.ts';
import { heldId } from '../../player/inventory.ts';
import { input } from '../../player/input-state.ts';
import { me } from '../../player/player.ts';
import { back, greatBeamView } from './chop.ts';
import { COOP, job } from './job.ts';
import { currentCoopPeer } from './coop-identity.ts';
import { GREAT } from '../../place/layout.ts';
import { pair } from './pair.ts';

export type GreatBeamHelp = string | null;
type Peer = { beam: boolean; help: GreatBeamHelp; empty: boolean; seen: number };
const peers = new Map<string, Peer>();
let helping: GreatBeamHelp = null;
const free = () => back.empty() && !heldId() && pair.grip() === null;
function pose(peer: string, now: number) {
  const r = remotes.get(peer),
    p = peers.get(peer);
  if (!r?.visible || !r.entered || !p || now - p.seen > 1500) return null;
  const s = r.snaps.sample(now - INTERP_MS);
  if (!s || s.over > 1500) return null;
  return {
    x: s.a.p[0]! + (s.b.p[0]! - s.a.p[0]!) * s.u,
    y: s.a.p[1]! + (s.b.p[1]! - s.a.p[1]!) * s.u,
    z: s.a.p[2]! + (s.b.p[2]! - s.a.p[2]!) * s.u,
    yaw: s.b.r,
  };
}
const near = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z) <= 5 && Math.abs(a.y - b.y) <= 2;
function carrier(now: number) {
  const p = helping && pose(helping, now);
  return p && peers.get(helping!)?.beam && free() && me.body && near(p, me.body.position) ? p : null;
}
function helperFor(owner: string | null, now: number) {
  const id = owner ?? net.myPeer;
  const p = owner ? pose(owner, now) : me.body?.position;
  if (!id || !p || (owner ? !peers.get(owner)?.beam : back.big !== 'beam')) return null;
  const candidates: string[] = [];
  if (helping === id && carrier(now) && net.myPeer) candidates.push(net.myPeer);
  for (const [peer, state] of peers) {
    if (state.help !== id || !state.empty) continue;
    const other = pose(peer, now);
    if (other && near(p, other)) candidates.push(peer);
  }
  return candidates.sort()[0] ?? null;
}
function endOf(p: { x: number; y: number; z: number; yaw: number }) {
  return new THREE.Vector3(p.x + Math.sin(p.yaw) * 2.7, p.y + 1.05, p.z + Math.cos(p.yaw) * 2.7);
}
export const greatCarry = {
  helping: () => helping,
  assisted: () => helperFor(null, performance.now()) !== null,
};
if (COOP) {
  addPresenceField('placeGreatBeamHelp', (): GreatBeamHelp => {
    if (!carrier(performance.now())) helping = null;
    return helping;
  });
  onRemotePresence((r, pr) => {
    if (!currentCoopPeer(pr)) return void peers.delete(r.peer);
    const h = pr.placeGreatBeamHelp;
    const load = pr.placeLoad as { rails?: unknown; stone?: unknown } | undefined;
    peers.set(r.peer, {
      beam: pr.placeBig === 'beam',
      help: typeof h === 'string' && h.length > 0 && h.length <= 128 ? h : null,
      empty:
        !pr.placeBig &&
        !pr.placeBack &&
        !load?.rails &&
        !load?.stone &&
        pr.placeLongBeam !== 0 &&
        pr.placeLongBeam !== 1 &&
        !r.hd,
      seen: performance.now(),
    });
  });
  onPeerRemoved((r) => {
    peers.delete(r.peer);
    if (helping === r.peer) helping = null;
  });
  onRoomReady((room) =>
    room.onConnection((connected) => {
      if (!connected) {
        helping = null;
        peers.clear();
      }
    }),
  );
  registerInteractable(() => {
    const now = performance.now(),
      p = me.body?.position;
    if (helping && carrier(now))
      return [
        {
          id: 'place-great-release',
          verb: 'Let go',
          at: endOf(carrier(now)!),
          run: () => {
            helping = null;
          },
        },
      ];
    if (!p || !job.awake || !free()) return [];
    return [...peers.keys()].flatMap((peer) => {
      const other = pose(peer, now);
      if (!other || !peers.get(peer)?.beam || helperFor(peer, now) || !near(p, other)) return [];
      const at = endOf(other);
      return Math.hypot(p.x - at.x, p.z - at.z) <= 4
        ? [
            {
              id: `place-great-help-${peer}`,
              verb: 'Help carry',
              at,
              run: () => {
                helping = peer;
              },
            },
          ]
        : [];
    });
  });
  greatBeamView.helper = (owner) => {
    const helper = helperFor(owner, performance.now());
    return helper === net.myPeer ? me.avatar : helper ? (remotes.get(helper)?.avatar ?? null) : null;
  };
}
onFrame(
  () => {
    if (!carrier(performance.now())) helping = null;
    if (back.big === 'beam') {
      input.sprint = me.sprint = false;
      me.wish.multiplyScalar((greatCarry.assisted() ? GREAT.pairSpeed : GREAT.soloSpeed) / 5.6);
    } else if (helping) input.sprint = me.sprint = false;
  },
  { phase: 'prePhysics', order: -60 },
);
