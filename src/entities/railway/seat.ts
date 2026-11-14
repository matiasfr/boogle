// Authored resting places. Movement and pose stay Owner; the server owns transient seats, predicted on the press.
// DESIGN: Cooperation is automatic, not negotiated; Start animation simple (owner, 5 November).
import * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { onPreStep, teleport } from '../../physics/engine.ts';
import { carry, carryVerticalSpeed, fromPlatform, type Local, type Platform } from '../../physics/platforms.ts';
import { addPresenceField, onPeerRemoved, onRemotePresence, remotes } from '../../netplay/net.ts';
import { me } from '../../player/player.ts';
import { setJumpLabel } from '../../player/input.ts';
import type { Interactable } from '../../player/hands.ts';
import { pop } from '../../render/fanfare.ts';
import { flat } from '../../render/flat.ts';
import { merged } from '../../render/part-geometry.ts';
import { MACHINE_CHAIR_SEAT } from './machine-model.ts';
import type { Part } from '../../render/cosmetic-parts.ts';
import { onRailwayCommands } from './state.ts';
import { createSeatSession } from './seat-session.ts';
import { seatViews, type SeatPose } from './seat-view.ts';
import { railwayMirror } from '../../world/game-world.ts';
import { recordSeats } from '../../adapters/seat-recording.ts';

export type Seat = {
  id: string;
  group: string;
  platform?: Platform;
  /** Nonblocking chairs have no standing support: draw the granted rider in the platform frame. */
  anchorView?: boolean;
  /** View only, with `anchorView`: the drawn deck that pitches and shudders under this seat (a car's rock, a child of
   * the platform's drawn frame, resting at its parent's x and z). The granted rider's drawn body leans with it; the seat,
   * capsule, claims and wire keep the platform's level frame. */
  frame?: THREE.Object3D;
  /** View only, with `anchorView`: metres the granted rider is drawn ahead of `at`, the way they face (a bench with a
   * back: clear of it). The seat, capsule, claims, wire and exit keep `at`. */
  forward?: number;
  /** How far over the deck the sitter's stowaway sits (a bench it can sit on): view only, 0 sits it on the deck. */
  perch?: number;
  at: Local;
  exit: Local;
  available: () => boolean;
};
const seats: Seat[] = [];
let sitting: Seat | null = null;
let claims: ReturnType<typeof createSeatSession> | null = null;
const remoteSeats = new Map<string, Seat>();
const remotePoses = new Map<string, SeatPose>();
// ?proto pages have no production mirror: sitting stays LOCAL and unarbitrated, even with other tabs connected.
const occupants = railwayMirror?.seats;
if (occupants) recordSeats(occupants);
const pose: Local = { x: 0, y: 0, z: 0, yaw: 0 };
const surfacePose: Local = { x: 0, y: 0, z: 0, yaw: 0 };
// Local diagnostics only: retain the cause before a transient release destroys its evidence.
let lastRelease: {
  reason: string;
  seat: string | null;
  pending: ReturnType<ReturnType<typeof createSeatSession>['pending']>;
  platform: string | null;
  distance: number | null;
  at: number;
} | null = null;
function recordRelease(reason: string, distance: number | null = null) {
  if (!sitting) return;
  lastRelease = {
    reason,
    seat: sitting?.id ?? null,
    pending: claims?.pending() ?? null,
    platform: carry.on?.id ?? null,
    distance,
    at: performance.now(),
  };
}
/** Returns the unregistration: a view that is rebuilt must not leave its old chairs (and their platform) behind. */
export function registerSeat(seat: Seat) {
  seats.push(seat);
  return () => {
    const i = seats.indexOf(seat);
    if (i < 0) return;
    if (sitting === seat) standUp('seat removed');
    seats.splice(i, 1);
  };
}
const find = (id: unknown) => (typeof id === 'string' ? seats.find((s) => s.id === id) : undefined);
export const seated = () => sitting !== null;
/** Someone sits in this chair: this tab's prediction, or the authoritative server row. */
export const seatHeld = (id: string) => sitting?.id === id || !!occupants?.occupant(id);
/** Read-only capture diagnostics for pending claims versus actual sitting. */
export const seatState = () => ({
  pending: claims?.pending() ?? null,
  sitting: sitting?.id ?? null,
  occupants: Object.fromEntries(occupants?.rows().map(({ id, pid }) => [id, pid]) ?? []),
  lastRelease,
});
const world = (s: Seat, exit = false, interpolated = false) => {
  const local = exit ? s.exit : s.at;
  if (!s.platform) return Object.assign(pose, local);
  Object.assign(surfacePose, local);
  // Preserve the authored chair/aisle, but never pin a rider below changing cargo or deck solids.
  surfacePose.y = Math.max(local.y, (s.platform.topAt?.(local.x, local.z) ?? s.platform.top) + PLAYER_R);
  return fromPlatform(s.platform, surfacePose, interpolated, pose);
};
/** How far a seated Buddy's drawn body comes down from its capsule (the seated pose's frame; every chair's anchor
 * height assumes it, e.g. the track layer's hips 0.63 m under the capsule centre). */
const SEATED_DROP = 0.55;
/** How far this chair holds its sitter's capsule above where the stowaway beside them sits: the deck under them, or
 * the bench (`perch` over it) where there is one (src/entities/wardrobe/view.ts reads it from the avatar's seatRise). */
const seatRise = (s: Seat) =>
  s.platform
    ? Math.max(0, s.at.y - ((s.platform.topAt?.(s.at.x, s.at.z) ?? s.platform.top) + PLAYER_R) - (s.perch ?? 0))
    : 0;
/** How far this chair draws its sitter ahead of the seat (`forward`); wardrobe/view.ts keeps the stowaway by the seat. */
const seatAhead = (s: Seat) => (s.anchorView ? (s.forward ?? 0) : 0);
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
function freeSeat() {
  return seats
    .filter((s) => reachable(s) && !seatHeld(s.id))
    .sort((a, b) => {
      const p = me.body!.position;
      const wa = { ...world(a) },
        wb = world(b);
      return Math.hypot(p.x - wa.x, p.z - wa.z) - Math.hypot(p.x - wb.x, p.z - wb.z);
    })[0];
}
function seatChoices(s: Seat) {
  const p = me.body!.position;
  const alt = seats
    .filter((other) => other !== s && other.group === s.group && reachable(other))
    .map((other) => {
      const w = world(other);
      return { id: other.id, d: (p.x - w.x) ** 2 + (p.z - w.z) ** 2 };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 7)
    .map((other) => other.id);
  return { id: s.id, alt };
}
onRailwayCommands((session) => {
  claims?.dispose();
  claims =
    session && occupants
      ? createSeatSession(session, occupants, performance.now.bind(performance), {
          move(id) {
            const next = find(id);
            if (next) occupy(next);
            else standUp('seat missing');
          },
          taken: () => standUp('taken'),
        })
      : null;
  if (sitting && me.body) claims?.sit(seatChoices(sitting));
});
export function sitDown(s = freeSeat()) {
  if (!s || !reachable(s) || seated()) return;
  const choices = seatChoices(s);
  // Sit on the press; the receipt only corrects a contested chair, never repeats the predicted effect.
  occupy(s);
  if (sitting) {
    pop(2, 0.35);
    claims?.sit(choices);
  }
}
function occupy(s: Seat) {
  // Sliding over to a neighbour on the same deck is always allowed: a seated capsule rides above the deck support.
  const sliding = sitting !== null && sitting !== s && sitting.platform === s.platform && s.available();
  if (!me.body || (!sliding && !reachable(s))) return standUp('unreachable grant');
  sitting = s;
  carry.seat = s.platform ?? null; // aboard for the `riding` presence and your stowaway, though off the deck
  const p = world(s);
  teleport(me.body, p.x, p.y, p.z);
  me.yaw = p.yaw;
  me.body.velocity.set(carry.x, carry.y, carry.z);
}
function standUp(reason = 'stand input') {
  recordRelease(reason);
  const s = sitting;
  sitting = null;
  carry.seat = null;
  // A taken sit owns no chair. All other exits free our server row, including a correction we cannot display.
  if (s && reason !== 'taken') claims?.stand();
  if (!s || !me.body) return;
  if (reason === 'stand input' || reason === 'jump input') pop(1, 0.3);
  const p = world(s, true);
  teleport(me.body, p.x, p.y, p.z);
  me.body.velocity.set(s.platform ? carry.x : 0, s.platform ? carry.y : 0, s.platform ? carry.z : 0);
}
const promptAt = new THREE.Vector3();
const STAND = 'Stand up';
/** The one target that goes with a chair: the train's "Request stop: <halt>" (train-view.ts), offered anywhere aboard. */
const ABOARD = 'railway-request-aboard';
/** How near a chair Sit beats Request stop: the chair counts this much nearer than it is (and the pick's nudge
 * toward where you look adds 0.6 m), so Sit is the press facing a chair within 1.4 m, or beside one within 0.8 m;
 * anywhere else aboard the press requests the stop. */
const SIT_EDGE = 0.8;
/** The Interact button around chairs, for a view without Place's verbs (the production railway).
 * Seated: jump stands you up (onPreStep below), so Interact is free for the train's Request stop when the train
 * offers one (owner, 14 November: he couldn't request a stop sitting down); its prompt names both, and once the stop
 * is requested it stays, greyed, so a second press doesn't stand you up. With nothing to request, the press stands you.
 * Standing: Sit joins the other targets when none of them acts, and beside Request stop the nearer chair wins. */
export function withSeatTargets(others: Interactable[]): Interactable[] {
  if (!me.body) return others;
  const p = me.body.interpolatedPosition;
  promptAt.set(p.x, p.y + 1.1, p.z);
  if (seated()) {
    const ask = others.find((t) => t.id === ABOARD);
    if (ask) return [{ ...ask, at: promptAt, also: { action: 'jump', verb: STAND } }];
    return [{ id: 'place-stand', verb: STAND, at: promptAt, r: 100, fadeAfter: 3, run: () => standUp() }];
  }
  if (others.some((t) => t.run && t.id !== ABOARD)) return others;
  const seat = freeSeat();
  if (!seat) return others;
  if (!others.some((t) => t.run))
    return [...others, { id: 'place-sit', verb: 'Sit', at: promptAt, r: -100, run: () => sitDown(seat) }];
  const w = world(seat);
  sitAt.set(w.x, w.y + 0.9, w.z);
  return [...others, { id: 'place-sit', verb: 'Sit', at: sitAt, r: SIT_EDGE, run: () => sitDown(seat) }];
}
const sitAt = new THREE.Vector3();
addPresenceField('placeSeatPose', () => sitting?.id ?? null);
onRemotePresence((r, pr) => {
  const seated = find(pr.placeSeatPose);
  if (seated && r.pid) remotePoses.set(r.peer, { id: seated.id, pid: r.pid, at: performance.now() });
  else remotePoses.delete(r.peer);
});
onPeerRemoved((r) => {
  remoteSeats.delete(r.peer);
  remotePoses.delete(r.peer);
});
onPreStep(
  () => {
    claims?.update();
    if (sitting && me.jumpQueued > 0) {
      me.jumpQueued = 0;
      standUp('jump input');
      return;
    }
    const s = sitting,
      b = me.body;
    if (!s || !b) return;
    const p = world(s);
    if (!s.available()) {
      recordRelease('seat unavailable', Math.hypot(p.x - b.position.x, p.y - b.position.y, p.z - b.position.z));
      claims?.stand();
      sitting = null;
      carry.seat = null;
      return;
    }
    // A deck that jumps (a restored or caught-up machine snaps to its accepted place) carries its sitter along:
    // releasing here would leave them in mid-air where the chair was.
    me.wish.set(0, 0, 0);
    if (Math.hypot(p.x - b.position.x, p.y - b.position.y, p.z - b.position.z) > 3) teleport(b, p.x, p.y, p.z);
    else b.position.set(p.x, p.y, p.z);
    // carryStep compares against last step's carry before applying the new deck motion. Pre-applying the deck's
    // next vertical speed here makes a slope/correction look like a jump and drops seated contact.
    b.velocity.set(
      s.platform?.body.velocity.x ?? 0,
      s.platform ? carryVerticalSpeed(s.platform) : 0,
      s.platform?.body.velocity.z ?? 0,
    );
  },
  { order: 21 },
);
onFrame(
  ({ now }) => {
    if (sitting) me.yaw = world(sitting, false, true).yaw;
    // Set the animation input before remote-player poses its rig in the update phase. A quiet Owner stream
    // must not expire a confirmed seated animation while the server keeps the chair through reconnect grace.
    const drawn = seatViews(occupants?.rows() ?? [], [...remotePoses.values()], now, sitting?.id ?? null);
    remoteSeats.clear();
    for (const r of remotes.values()) {
      const seat = find(r.pid ? drawn.get(r.pid) : undefined);
      if (seat) remoteSeats.set(r.peer, seat);
      if (!r.avatar) continue;
      r.avatar.userData.seatedAt = seat ? now : -Infinity;
      r.avatar.userData.seatRise = seat ? seatRise(seat) : 0;
      r.avatar.userData.seatAhead = seat ? seatAhead(seat) : 0;
    }
  },
  { phase: 'world', order: 100 },
);
onFrame(
  () => {
    // Seated, jump stands you up: the touch Jump button says so.
    setJumpLabel(sitting ? STAND : undefined);
    if (sitting && me.avatar) {
      me.avatar.userData.seatedAt = performance.now();
      me.avatar.userData.seatRise = seatRise(sitting);
      me.avatar.userData.seatAhead = seatAhead(sitting);
    }
    [leant, leaning] = [leaning, leant];
    leaning.clear();
    for (const r of remotes.values()) {
      if (!r.avatar) continue;
      const seat = remoteSeats.get(r.peer);
      if (seat) {
        drawAtSeat(r.avatar, seat);
        const inner = r.avatar.userData.inner as THREE.Object3D | undefined;
        if (inner) inner.position.y -= SEATED_DROP;
      }
    }
    if (sitting && me.avatar) {
      if (sitting.anchorView) drawAtSeat(me.avatar, sitting);
      if (me.avatar.userData.inner) (me.avatar.userData.inner as THREE.Object3D).position.y -= SEATED_DROP;
    }
    for (const a of leant) if (!leaning.has(a)) a.rotation.x = a.rotation.z = 0;
  },
  { phase: 'update', order: 20 },
);
function drawAtSeat(avatar: THREE.Object3D, seat: Seat) {
  // A visual chair leaves carry.on empty, so ordinary world interpolation trails a moving deck.
  // The accepted seat already supplies the frame; keep this cosmetic and leave body/support/exits alone.
  const p = world(seat, false, true),
    ahead = seatAhead(seat);
  // Yaw 0 faces -z and turns toward -x.
  avatar.position.set(p.x - Math.sin(p.yaw) * ahead, p.y, p.z - Math.cos(p.yaw) * ahead);
  avatar.rotation.set(0, p.yaw, 0);
  const f = seat.frame;
  if (!f?.parent) return;
  // The rock's own lean, round its resting place in the drawn deck's frame, carried into the world: the drawn deck's
  // frame times the rock's matrix, with the rock's resting offset taken back out, times the deck frame's inverse.
  f.updateWorldMatrix(true, false);
  lean
    .makeTranslation(0, -f.position.y, 0)
    .premultiply(f.matrixWorld)
    .multiply(unlean.copy(f.parent.matrixWorld).invert());
  avatar.updateMatrix();
  avatar.matrix.premultiply(lean).decompose(avatar.position, avatar.quaternion, leanScale);
  leaning.add(avatar);
}
const lean = new THREE.Matrix4(),
  unlean = new THREE.Matrix4(),
  leanScale = new THREE.Vector3();
/** Avatars drawn leaning this frame and the last: the other views write only yaw, so one who stands is set upright. */
let leaning = new Set<THREE.Object3D>(),
  leant = new Set<THREE.Object3D>();
// Rigid Local geometry: all stools share one colored mesh.
// The host surface still owns the matching solid and every seat anchor.
const chairGeometry = merged([
  ['b', 0, 0.49, 0, 0.8, 0.12, 0.65, '#bd8a50'],
  ['b', -0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
  ['b', 0.3, 0.23, 0, 0.12, 0.46, 0.55, '#bd8a50'],
]);
const chairMaterial = flat('#ffffff').clone();
chairMaterial.vertexColors = true;
/** The stool's vertex-coloured material, for other kit props to share (one program). */
export const kitMaterial = chairMaterial;
/** A plain low stool. Its matching solid is owned by the host surface. */
export function seatMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(chairGeometry, chairMaterial);
  m.name = 'place stool';
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}
export const seatHeight = 0.55 + PLAYER_R;

/** The seated pose (Driving_Loop) puts Buddy's hips this far under his capsule centre (measured on the bones, with
 * SEATED_DROP applied): a chair whose top is `t` over the deck holds its rider at t + SEATED_HIPS. */
export const SEATED_HIPS = 0.63;
/** The track layer's low stool (assets/src/track-layer.py chair_wood): its seat top and where its rider's capsule sits
 * over the deck, hips over the seat and feet on the deck. */
export const lowStoolAnchor = MACHINE_CHAIR_SEAT + SEATED_HIPS;
// The track layer's stool, in its rider's frame (they face +Z here): a 6 cm slab, 0.44 m wide and 0.46 m deep, set
// 0.13 m behind the rider anchor, on four 8 cm legs at X ±0.15 m, Z −0.26/+0.02 m. Turn it by the rider's yaw + π.
const SLAB = 0.06;
const lowStoolGeometry = merged([
  ['b', 0, MACHINE_CHAIR_SEAT - SLAB / 2, -0.13, 0.44, SLAB, 0.46, '#bd8a50'],
  ...[-0.15, 0.15].flatMap((x) =>
    [-0.26, 0.02].map((z): Part => [
      'b',
      x,
      (MACHINE_CHAIR_SEAT - SLAB) / 2,
      z,
      0.08,
      MACHINE_CHAIR_SEAT - SLAB,
      0.08,
      '#bd8a50',
    ]),
  ),
]);
/** The track layer's low stool, at its rider anchor's deck point: rotation.y = the seat's yaw + π. No solid. */
export function lowStoolMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(lowStoolGeometry, chairMaterial);
  m.name = 'low stool';
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return g;
}
