// Other players as this tab draws them: an entity for each Remote on the island, its mesh their avatar with a name label
// and its body a kinematic one, posed from their presence (src/netplay/net.ts owns the Remote and its network fields; this
// module adds the display fields, which features read). Also the `riding` presence field, which keeps a rider steady on a
// shared platform. Serves DESIGN.md 4.
//
// It reads the local player through localPresence().
import * as THREE from 'three';
import { INTERP_MS } from '../../constants.ts';
import { lerp, angleLerp, finiteArr, r2 } from '../../math.ts';
import { setMask, teleport } from '../../physics/engine.ts';
import { defineKind, despawn, spawn, type GameEntity } from '../../entity/entity.ts';
import { carry, platformById, toPlatform, fromPlatform, type Local } from '../../physics/platforms.ts';
import { makeAvatar, animateAvatar, paintAvatar } from '../../player/avatars.ts';
import { createNameLabel } from '../../components/name-label/view.ts';
import { chaseKinematic, makePlayerBody, NOT_SCENERY } from '../../physics/physics.ts';
import {
  addPresenceField,
  localPresence,
  onPeerAdded,
  onPeerLeftIsland,
  onPeerRemoved,
  onRemotePresence,
  type Remote,
} from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';

type RideSample = { l: number[]; r: number };
/** A remote standing on a shared platform. Visual attachment follows fresh Owner intent, not train agreement. */
type Ride = {
  id: string;
  snaps: ReturnType<typeof createSnaps<RideSample>>;
  on: boolean;
  leaving: boolean; // they stopped sending `riding`: blending back to world presence
  bodyOn: boolean; // preserve the collision proxy's existing world-distance guard
  bodyW: number;
  lastSeen: number; // existing presence sample time, in this page's clock
  drawn: boolean;
  boarding: boolean; // a new boarding blends current world presence, not an obsolete pre-boarding avatar pose
  blendLeft: number;
  drawOffset: Local; // continuity from the last displayed pose when attachment changes
  world: THREE.Vector3; // their world presence pose this frame
  worldYaw: number;
  l: Local;
  prev: Local;
};

declare module '../../netplay/net.ts' {
  interface Remote {
    player: GameEntity | null; // on the island
    avatar: ReturnType<typeof makeAvatar> | null; // its mesh
    target: THREE.Vector3;
    yaw: number;
    speed: number;
    ride?: Ride | null; // standing on a shared platform (riding, below)
  }
}

// ---------------------------------------------------------------- lifecycle
onPeerAdded((r) => {
  r.player = null;
  r.avatar = null;
  r.target = new THREE.Vector3();
  r.yaw = 0;
  r.speed = 0;
});

// Goes now: readers see r.avatar null at once, and the entity's mesh and body leave before the next physics step.
function leave(r: Remote) {
  if (!r.player) return;
  despawn(r.player);
  r.player = null;
  r.avatar = null;
}
onPeerLeftIsland(leave);
onPeerRemoved(leave);

// ---------------------------------------------------------------- riding a shared platform (Owner)
// World presence trails a moving deck by the interpolation delay (0.3 m at the wagon's 3 m/s, more on a stop or a
// corner), so a rider on another tab would slide about on it. While you stand on a shared platform
// (src/physics/platforms.ts) you also send `riding`: [platform id, x, y, z, yaw] in its frame; other tabs smooth that
// and draw you on their own copy of the platform. Missing key: not riding. Old tabs ignore it. Serves DESIGN.md 4.
// Presentation follows fresh riding intent even when local train copies disagree. Missing/expired state blends
// back to world presence. The collision proxy retains its prior distance guard; this is not a physics correction.
const RIDE_TRUST = 1.5; // m
const RIDE_BLEND_S = 0.2;
const RIDE_MAX_AGE_MS = 1000;
const mine: Local = { x: 0, y: 0, z: 0, yaw: 0 };
addPresenceField('riding', () => {
  const p = carry.on,
    me = localPresence();
  if (!p?.shared || !p.id || !me?.entered || !me.body) return null;
  const l = toPlatform(p, me.body.position, me.yaw, mine);
  return [p.id, r2(l.x), r2(l.y), r2(l.z), r2(l.yaw)];
});
onRemotePresence((r, pr, time) => {
  const v = pr.riding as unknown[] | undefined;
  const ok = r.entered && Array.isArray(v) && v.length === 5 && typeof v[0] === 'string' && finiteArr(v.slice(1), 4);
  if (!ok) {
    if (!r.entered) r.ride = null;
    else if (r.ride) r.ride.leaving = true; // blend back out to world presence from their last place on the deck
    return;
  }
  const id = v[0] as string,
    [x, y, z, yaw] = v.slice(1) as number[];
  if (r.ride?.id !== id)
    r.ride = {
      id,
      snaps: createSnaps<RideSample>(),
      on: false,
      leaving: false,
      bodyOn: false,
      bodyW: 0,
      lastSeen: time,
      drawn: false,
      boarding: !r.ride,
      blendLeft: 0,
      drawOffset: { x: 0, y: 0, z: 0, yaw: 0 },
      world: new THREE.Vector3(),
      worldYaw: 0,
      l: { x: 0, y: 0, z: 0, yaw: 0 },
      prev: { x: 0, y: 0, z: 0, yaw: NaN },
    };
  r.ride.leaving = false;
  r.ride.lastSeen = time;
  r.ride.snaps.push(time, { l: [x!, y!, z!], r: yaw! });
});
const rideAt: Local = { x: 0, y: 0, z: 0, yaw: 0 },
  rideV = new THREE.Vector3();
// Moves r.target and r.yaw (world presence, from samplePose) onto our copy of the platform r rides, by the blend.
// Before the step it keeps the existing collision-proxy behavior. In update it independently blends the avatar
// onto the drawn deck. Returns whether the avatar is fully attached (for deck-relative walking animation).
function placeRider(r: Remote, rt: number, interpolated: boolean, dt = 0) {
  const ride = r.ride;
  if (!ride) return false;
  if (!interpolated) {
    ride.world.copy(r.target);
    ride.worldYaw = r.yaw;
  }
  const p = platformById(ride.id);
  const s = p && ride.snaps.sample(rt);
  if (p && s) {
    const { a, b, u } = s;
    ride.l.x = lerp(a.l[0]!, b.l[0]!, u);
    ride.l.y = lerp(a.l[1]!, b.l[1]!, u);
    ride.l.z = lerp(a.l[2]!, b.l[2]!, u);
    ride.l.yaw = angleLerp(a.r, b.r, u);
    fromPlatform(p, ride.l, interpolated, rideAt);
    if (!interpolated) {
      const v = p.body.velocity;
      const trust = RIDE_TRUST + (Math.hypot(v.x, v.y, v.z) * INTERP_MS) / 1000;
      ride.bodyOn = ride.world.distanceTo(rideV.set(rideAt.x, rideAt.y, rideAt.z)) < trust;
    }
  } else if (!interpolated) ride.bodyOn = false;
  if (!interpolated) {
    if (!ride.bodyOn || ride.bodyW === 0) return false; // samplePose already supplied world presence
    r.target.set(
      lerp(ride.world.x, rideAt.x, ride.bodyW),
      lerp(ride.world.y, rideAt.y, ride.bodyW),
      lerp(ride.world.z, rideAt.z, ride.bodyW),
    );
    r.yaw = angleLerp(ride.worldYaw, rideAt.yaw, ride.bodyW);
    return ride.bodyW === 1;
  }
  const step = dt / RIDE_BLEND_S;
  ride.bodyW = ride.bodyOn && !ride.leaving ? Math.min(1, ride.bodyW + step) : Math.max(0, ride.bodyW - step);
  const on = !!p && !!s && !ride.leaving && rt + INTERP_MS - ride.lastSeen <= RIDE_MAX_AGE_MS;
  const at = on ? rideAt : ride.world;
  const yaw = on ? rideAt.yaw : ride.worldYaw;
  if (!ride.drawn || on !== ride.on) {
    if (ride.drawn) ride.boarding = false;
    const shown = r.avatar;
    ride.drawOffset.x = (shown?.position.x ?? ride.world.x) - at.x;
    ride.drawOffset.y = (shown?.position.y ?? ride.world.y) - at.y;
    ride.drawOffset.z = (shown?.position.z ?? ride.world.z) - at.z;
    ride.drawOffset.yaw = angleLerp(yaw, shown?.rotation.y ?? ride.worldYaw, 1) - yaw;
    ride.blendLeft = RIDE_BLEND_S;
    ride.drawn = true;
  }
  if (on && ride.boarding) {
    // As on main, let incoming world presence finish the approach instead of replaying a frozen old offset.
    // Later attachment changes retain the last-displayed-pose easing above for continuity across train gaps.
    ride.drawOffset.x = ride.world.x - at.x;
    ride.drawOffset.y = ride.world.y - at.y;
    ride.drawOffset.z = ride.world.z - at.z;
    ride.drawOffset.yaw = angleLerp(yaw, ride.worldYaw, 1) - yaw;
  }
  ride.on = on;
  ride.blendLeft = Math.max(0, ride.blendLeft - dt);
  if (ride.blendLeft === 0) ride.boarding = false;
  const u = ride.blendLeft / RIDE_BLEND_S;
  const ease = u * u * (3 - 2 * u);
  r.target.set(at.x + ride.drawOffset.x * ease, at.y + ride.drawOffset.y * ease, at.z + ride.drawOffset.z * ease);
  r.yaw = yaw + ride.drawOffset.yaw * ease;
  if (ride.leaving && ride.bodyW === 0 && ride.blendLeft === 0) r.ride = null;
  return on && ride.blendLeft === 0;
}

// ---------------------------------------------------------------- the entity
function samplePose(r: Remote, rt: number) {
  const s = r.snaps.sample(rt)!;
  r.target.set(lerp(s.a.p[0]!, s.b.p[0]!, s.u), lerp(s.a.p[1]!, s.b.p[1]!, s.u), lerp(s.a.p[2]!, s.b.p[2]!, s.u));
  r.yaw = angleLerp(s.a.r, s.b.r, s.u);
  r.state = s.b.s;
}

// prePhysics -100: remote poses, before the ball's owner (-90) and this player's intent (-80). fixedPre 39: the body
// heads for the pose, before the player's controller (40). update -280: after this player's avatar (-290), before the
// camera (-200) (orders: top of src/loop.ts).
defineKind('remote-player', { prePhysics: -100, fixedPre: 39, update: -280 });

const tmpV = new THREE.Vector3();
function spawnRemotePlayer(r: Remote, time: number): GameEntity {
  samplePose(r, time);
  const avatar = makeAvatar(r.colorIdx);
  avatar.position.copy(r.target);
  const body = makePlayerBody(true);
  teleport(body, r.target.x, r.target.y, r.target.z);
  const prevPos = r.target.clone();
  const nameLabel = createNameLabel(avatar);
  let shownColor = -1,
    shownMat: THREE.MeshStandardMaterial | null = null;
  let posed = false; // the first frame puts it at that frame's pose: no walk from where its first presence arrived
  const entity = spawn({
    kind: 'remote-player',
    mesh: avatar,
    bodies: [body],
    nameLabel,
    prePhysics({ now }) {
      if (!r.snaps.length) return;
      const rt = now - INTERP_MS;
      samplePose(r, rt);
      placeRider(r, rt, false);
      if (!posed) {
        posed = true;
        avatar.position.copy(r.target);
        prevPos.copy(r.target);
        teleport(body, r.target.x, r.target.y, r.target.z);
      }
      if (r.colorIdx !== shownColor || avatar.userData.mat !== shownMat) {
        // A Buddy's skin swaps the material once it loads, so that counts as a change too.
        shownColor = r.colorIdx;
        shownMat = avatar.userData.mat;
        paintAvatar(shownMat, shownColor);
      }
      nameLabel.setText(r.name);
    },
    fixedPre() {
      // A co-rider's body is an interpolated proxy, not another simulated passenger. Its catch-up velocity must
      // not shove our real rider off their common deck. Off the shared ride, ordinary player collisions return.
      setMask(body, carry.on?.id && r.ride?.id === carry.on.id && !r.ride.leaving ? 0 : NOT_SCENERY);
      chaseKinematic(body, r.target.x, r.target.y, r.target.z);
    },
    // The avatar takes its interpolated pose and walks at the speed it moved since last frame.
    update({ dt, now }) {
      // Riding: drawn on the deck as our copy of it is drawn, and walking only as fast as they move on it.
      const riding = placeRider(r, now - INTERP_MS, true, dt),
        l = r.ride?.l,
        was = r.ride?.prev;
      avatar.position.copy(r.target);
      avatar.rotation.y = r.yaw;
      let speed = dt > 0 ? tmpV.copy(r.target).sub(prevPos).setY(0).length() / dt : 0;
      if (riding && l && was) {
        speed = was.yaw === was.yaw && dt > 0 ? Math.hypot(l.x - was.x, l.z - was.z) / dt : 0;
        Object.assign(was, l);
      } else if (was) was.yaw = NaN;
      r.speed = lerp(r.speed, speed, 1 - Math.exp(-dt * 10));
      prevPos.copy(r.target);
      animateAvatar(avatar, r.speed, r.state === 1, dt, r.state === 2);
    },
    describe: () => ({ components: { nameLabel: nameLabel.describe() } }),
    dispose() {
      try {
        avatar.userData.mat.dispose();
      } finally {
        nameLabel.dispose();
      }
    },
  });
  r.avatar = avatar;
  return entity;
}

// They're on the island from their first pose (net.ts has already pushed it), until onPeerLeftIsland or onPeerRemoved. A
// peer who leaves and comes back gets a new entity, avatar and body.
onRemotePresence((r, _pr, time) => {
  if (r.entered && !r.player) r.player = spawnRemotePlayer(r, time);
});
