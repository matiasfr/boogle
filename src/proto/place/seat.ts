// Authored resting places. Movement stays Owner; the lead assigns transient seats before anyone snaps in.
// DESIGN: Cooperation is automatic, not negotiated; Start animation simple (owner, 5 November).
import * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { onPreStep, teleport } from '../../physics/engine.ts';
import { carry, fromPlatform, type Local, type Platform } from '../../physics/platforms.ts';
import {
  addHostField,
  addPresenceField,
  isLead,
  net,
  onNetState,
  onPeerRemoved,
  onRemotePresence,
  onRoomReady,
  remotes,
} from '../../netplay/net.ts';
import { me } from '../../player/player.ts';
import { flat } from '../flat.ts';
import { merged } from './part-geometry.ts';

export type Seat = {
  id: string;
  group: string;
  platform?: Platform;
  at: Local;
  exit: Local;
  available: () => boolean;
};
const seats: Seat[] = [];
export type SeatRequest = { id: string; ticket: number };
export type SeatGrant = { peer: string; ticket: number };
let serial = 0;
let request: SeatRequest | null = null;
let sitting: Seat | null = null;
const requests = new Map<string, SeatRequest>();
let grants: Record<string, SeatGrant> = {};
const pose: Local = { x: 0, y: 0, z: 0, yaw: 0 };
const surfacePose: Local = { x: 0, y: 0, z: 0, yaw: 0 };
export const registerSeat = (seat: Seat) => seats.push(seat);
const find = (id: unknown) => (typeof id === 'string' ? seats.find((s) => s.id === id) : undefined);
export const seated = () => sitting !== null || request !== null;
/** Read-only capture diagnostics for pending claims versus actual sitting. */
export const seatState = () => ({ request, sitting: sitting?.id ?? null, grants: { ...grants } });
const world = (s: Seat, exit = false, interpolated = false) => {
  const local = exit ? s.exit : s.at;
  if (!s.platform) return Object.assign(pose, local);
  Object.assign(surfacePose, local);
  // Preserve the authored chair/aisle, but never pin a rider below changing cargo or deck solids.
  surfacePose.y = Math.max(local.y, (s.platform.topAt?.(local.x, local.z) ?? s.platform.top) + PLAYER_R);
  return fromPlatform(s.platform, surfacePose, interpolated, pose);
};
const reachable = (s: Seat) => {
  const b = me.body;
  const p = world(s);
  return (
    !!b &&
    s.available() &&
    (!s.platform || carry.on === s.platform) &&
    Math.hypot(b.position.x - p.x, b.position.z - p.z) < 2.5 &&
    Math.abs(b.position.y - p.y) < 1.4
  );
};
export function freeSeat() {
  return seats
    .filter((s) => reachable(s) && !grants[s.id])
    .sort((a, b) => {
      const p = me.body!.position;
      const wa = { ...world(a) },
        wb = world(b);
      return Math.hypot(p.x - wa.x, p.z - wa.z) - Math.hypot(p.x - wb.x, p.z - wb.z);
    })[0];
}
export function sitDown(s = freeSeat()) {
  if (!s || !reachable(s) || seated()) return;
  request = { id: s.id, ticket: ++serial };
  // An offline/explicit solo visit has nobody to contend with. Live rooms always wait for the lead.
  if (!net.room || net.state !== 'live') occupy(s);
}
function occupy(s: Seat) {
  if (!me.body || !reachable(s)) return standUp();
  sitting = s;
  const p = world(s);
  teleport(me.body, p.x, p.y, p.z);
  me.yaw = p.yaw;
  me.body.velocity.set(carry.x, carry.y, carry.z);
}
export function standUp() {
  const s = sitting;
  sitting = null;
  request = null;
  if (!s || !me.body) return;
  const p = world(s, true);
  teleport(me.body, p.x, p.y, p.z);
  me.body.velocity.set(s.platform ? carry.x : 0, s.platform ? carry.y : 0, s.platform ? carry.z : 0);
}
function assign() {
  if (net.myPeer) {
    if (request) requests.set(net.myPeer, request);
    else requests.delete(net.myPeer);
  }
  // Keep incumbents until their owner explicitly releases or leaves. Never time out a held seat and double-book it.
  const next: Record<string, SeatGrant> = {};
  for (const [id, grant] of Object.entries(grants)) {
    const req = requests.get(grant.peer);
    const wanted = find(req?.id);
    if (req?.ticket === grant.ticket && wanted && wanted.group === find(id)?.group && find(id)?.available())
      next[id] = grant;
  }
  for (const [peer, req] of [...requests].sort(([a], [b]) => a.localeCompare(b))) {
    if (Object.values(next).some((g) => g.peer === peer)) continue;
    const wanted = find(req.id);
    if (!wanted) continue;
    const s = [wanted, ...seats.filter((s) => s !== wanted && s.group === wanted.group)].find(
      (s) => s.available() && !next[s.id],
    );
    if (s) next[s.id] = { peer, ticket: req.ticket };
  }
  grants = next;
  return grants;
}
addPresenceField('placeSeatRequest', () => request);
addPresenceField('placeSeatPose', () => sitting?.id ?? null);
addHostField('placeSeatGrants', assign, (value) => {
  if (isLead() || !value || typeof value !== 'object' || Array.isArray(value)) return;
  const next: Record<string, SeatGrant> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue;
    const g = raw as Partial<SeatGrant>;
    if (
      find(id) &&
      typeof g.peer === 'string' &&
      g.peer.length <= 128 &&
      Number.isSafeInteger(g.ticket) &&
      g.ticket! > 0 &&
      !Object.values(next).some((v) => v.peer === g.peer)
    )
      next[id] = { peer: g.peer, ticket: g.ticket! };
  }
  grants = next;
});
onRemotePresence((r, pr) => {
  const raw = pr.placeSeatRequest;
  const req = raw && typeof raw === 'object' ? (raw as Partial<SeatRequest>) : null;
  const s = find(req?.id);
  if (s && r.entered && Number.isSafeInteger(req?.ticket) && req!.ticket! > 0)
    requests.set(r.peer, { id: s.id, ticket: req!.ticket! });
  else requests.delete(r.peer);
  const seated = find(pr.placeSeatPose);
  if (seated && grants[seated.id]?.peer === r.peer && r.avatar) r.avatar.userData.seatedAt = performance.now();
});
onPeerRemoved((r) => {
  requests.delete(r.peer);
  for (const id of Object.keys(grants)) if (grants[id]?.peer === r.peer) delete grants[id];
});
const reset = () => {
  standUp();
  requests.clear();
  grants = {};
};
onNetState((state, prev) => {
  if (state !== 'live' || prev !== 'live') reset();
});
onRoomReady((room) =>
  room.onLeadChange(() => {
    standUp();
  }),
);
onPreStep(
  () => {
    if (request && me.jumpQueued > 0) {
      me.jumpQueued = 0;
      standUp();
      return;
    }
    if (request && !sitting && net.myPeer) {
      const id = Object.keys(grants).find(
        (id) => grants[id]?.peer === net.myPeer && grants[id]?.ticket === request?.ticket,
      );
      const s = find(id);
      if (s) occupy(s);
    }
    const s = sitting,
      b = me.body;
    if (!s || !b) return;
    const p = world(s);
    if (!s.available() || Math.hypot(p.x - b.position.x, p.y - b.position.y, p.z - b.position.z) > 3) {
      sitting = null;
      request = null;
      return;
    }
    me.wish.set(0, 0, 0);
    b.position.set(p.x, p.y, p.z);
    b.velocity.set(
      s.platform?.body.velocity.x ?? 0,
      s.platform?.body.velocity.y ?? 0,
      s.platform?.body.velocity.z ?? 0,
    );
  },
  { order: 21 },
);
onFrame(
  () => {
    if (sitting) me.yaw = world(sitting, false, true).yaw;
  },
  { phase: 'world', order: 100 },
);
onFrame(
  () => {
    if (sitting && me.avatar) me.avatar.userData.seatedAt = performance.now();
    for (const r of remotes.values()) {
      if (!r.avatar) continue;
      if (performance.now() - (r.avatar.userData.seatedAt ?? -1e9) < 200) {
        const inner = r.avatar.userData.inner as THREE.Object3D | undefined;
        if (inner) inner.position.y -= 0.55;
      }
    }
    if (sitting && me.avatar?.userData.inner) (me.avatar.userData.inner as THREE.Object3D).position.y -= 0.55;
  },
  { phase: 'update', order: 20 },
);
// Rigid Local geometry: all chairs share one colored mesh instead of four separate draws.
// The host surface still owns the matching solid and every seat anchor.
const chairGeometry = merged([
  ['b', 0, 0.49, 0, 0.8, 0.12, 0.65, '#bd8a50'],
  ['b', 0, 0.95, -0.3, 0.8, 0.8, 0.12, '#56847b'],
  ['b', -0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
  ['b', 0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
]);
const chairMaterial = flat('#ffffff').clone();
chairMaterial.vertexColors = true;
/** A low chair with a back. Its matching solid is owned by the host surface. */
export function seatMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(chairGeometry, chairMaterial);
  m.name = 'place chair';
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}
export const seatHeight = 0.55 + PLAYER_R;
