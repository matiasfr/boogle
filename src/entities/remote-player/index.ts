// Other players as this tab draws them: an avatar, a name label and a kinematic body for each Remote on the island,
// posed from their presence (src/netplay/net.ts owns the Remote and its network fields; this module adds the display
// fields). Also the `riding` presence field, which keeps a rider steady on a shared platform. Serves DESIGN.md 4.
//
// Always eager (src/main.ts imports it). It reads the local player through localPresence().
import * as THREE from 'three';
import { COLORS, INTERP_MS } from '../../constants.ts';
import { lerp, angleLerp, finiteArr, r2 } from '../../math.ts';
import { scene } from '../../render/scene.ts';
import { teleport } from '../../physics/physics.ts';
import { addBody, removeBody, type Body } from '../../physics/engine.ts';
import { carry, platformById, toPlatform, fromPlatform, type Local } from '../../physics/platforms.ts';
import { makeAvatar, makeLabel, makePlayerBody, animateAvatar } from '../../player/avatars.ts';
import {
  remotes,
  addPresenceField,
  localPresence,
  onPeerAdded,
  onPeerLeftIsland,
  onPeerRemoved,
  onRemotePresence,
  type Remote,
} from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';
import { onFrame } from '../../loop.ts';

type RideSample = { l: number[]; r: number };
/** A remote standing on a shared platform: their pose in its frame (presence key `riding`). on: drawn on our copy of
 * it this frame (false: the platform is missing here, or our copy is somewhere else, so world presence it is). */
type Ride = {
  id: string;
  snaps: ReturnType<typeof createSnaps<RideSample>>;
  on: boolean;
  leaving: boolean; // they stopped sending `riding`: blending back to world presence
  w: number; // the blend, 0 world presence .. 1 on the deck
  world: THREE.Vector3; // their world presence pose this frame
  worldYaw: number;
  l: Local;
  prev: Local;
};

declare module '../../netplay/net.ts' {
  interface Remote {
    avatar: ReturnType<typeof makeAvatar> | null;
    body: Body | null;
    label: ReturnType<typeof makeLabel> | null;
    labelText: string;
    target: THREE.Vector3;
    yaw: number;
    speed: number;
    prevPos: THREE.Vector3;
    ride?: Ride | null; // standing on a shared platform (riding, below)
  }
}

// ---------------------------------------------------------------- lifecycle
onPeerAdded((r) => {
  r.avatar = null;
  r.body = null;
  r.label = null;
  r.labelText = '';
  r.target = new THREE.Vector3();
  r.yaw = 0;
  r.speed = 0;
  r.prevPos = new THREE.Vector3();
});

function disposeLabel(label: NonNullable<Remote['label']>) {
  label.material.map?.dispose();
  label.material.dispose();
}

function dropRemoteBody(r: Remote) {
  if (r.avatar) {
    scene.remove(r.avatar);
    r.avatar.userData.mat.dispose();
    r.avatar = null;
  }
  if (r.label) {
    disposeLabel(r.label);
    r.label = null;
    r.labelText = '';
  }
  if (r.body) {
    removeBody(r.body);
    r.body = null;
  }
}
onPeerLeftIsland(dropRemoteBody);
onPeerRemoved(dropRemoteBody);

// ---------------------------------------------------------------- riding a shared platform (Owner)
// World presence trails a moving deck by the interpolation delay (0.3 m at the wagon's 3 m/s, more on a stop or a
// corner), so a rider on another tab would slide about on it. While you stand on a shared platform
// (src/physics/platforms.ts) you also send `riding`: [platform id, x, y, z, yaw] in its frame; other tabs smooth that
// and draw you on their own copy of the platform. Missing key: not riding. Old tabs ignore it. Serves DESIGN.md 4.
// Boarding and leaving blend between world and deck space over RIDE_BLEND_S, so the switch never pops. Our copy of
// the deck is trusted while the rider's world presence is near it: within RIDE_TRUST plus the distance the deck covers
// in the presence delay (presence trails a moving deck by that much, so the check is relative to the deck).
const RIDE_TRUST = 1.5; // m
const RIDE_BLEND_S = 0.2;
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
      w: 0,
      world: new THREE.Vector3(),
      worldYaw: 0,
      l: { x: 0, y: 0, z: 0, yaw: 0 },
      prev: { x: 0, y: 0, z: 0, yaw: NaN },
    };
  r.ride.leaving = false;
  r.ride.snaps.push(time, { l: [x!, y!, z!], r: yaw! });
});
const rideAt: Local = { x: 0, y: 0, z: 0, yaw: 0 },
  rideV = new THREE.Vector3();
// Moves r.target and r.yaw (world presence, from updateRemotes) onto our copy of the platform r rides, by the blend.
// Before the step it keeps the world pose and decides whether our copy is trusted; in the frame hook (interpolated:
// the deck where its mesh is drawn this frame) it advances the blend. Returns whether r is fully on the deck.
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
      ride.on = ride.world.distanceTo(rideV.set(rideAt.x, rideAt.y, rideAt.z)) < trust;
    }
  } else ride.on = false;
  if (interpolated) {
    const to = ride.on && !ride.leaving ? 1 : 0;
    const step = dt / RIDE_BLEND_S;
    ride.w = to > ride.w ? Math.min(to, ride.w + step) : Math.max(to, ride.w - step);
    if (ride.leaving && ride.w === 0) r.ride = null;
  }
  if (!ride.on || ride.w === 0) {
    r.target.copy(ride.world);
    r.yaw = ride.worldYaw;
    return false;
  }
  const w = ride.w;
  r.target.set(lerp(ride.world.x, rideAt.x, w), lerp(ride.world.y, rideAt.y, w), lerp(ride.world.z, rideAt.z, w));
  r.yaw = angleLerp(ride.worldYaw, rideAt.yaw, w);
  return w === 1;
}

// ---------------------------------------------------------------- remote interpolation
export function updateRemotes(now: number) {
  const rt = now - INTERP_MS;
  for (const r of remotes.values()) {
    if (r.entered && r.snaps.length) {
      const s = r.snaps.sample(rt)!;
      r.target.set(lerp(s.a.p[0]!, s.b.p[0]!, s.u), lerp(s.a.p[1]!, s.b.p[1]!, s.u), lerp(s.a.p[2]!, s.b.p[2]!, s.u));
      r.yaw = angleLerp(s.a.r, s.b.r, s.u);
      r.state = s.b.s;
      placeRider(r, rt, false);
      if (!r.avatar) {
        r.avatar = makeAvatar(r.colorIdx);
        r.avatar.position.copy(r.target);
        r.prevPos.copy(r.target);
        scene.add(r.avatar);
        r.body = makePlayerBody(true);
        teleport(r.body, r.target.x, r.target.y, r.target.z);
        addBody(r.body);
      }
      r.avatar.userData.mat.color.set(COLORS[r.colorIdx]!);
      if (r.labelText !== r.name) {
        if (r.label) {
          r.avatar.remove(r.label);
          disposeLabel(r.label);
        }
        r.label = makeLabel(r.name);
        r.labelText = r.name;
        r.avatar.add(r.label);
      }
    }
  }
}

// update -280, after this player's avatar (player.ts, -290), before the camera (-200): remote avatars take their
// interpolated pose and walk at the speed they moved since last frame (orders: top of src/loop.ts).
const tmpV = new THREE.Vector3();
onFrame(
  ({ dt, now }: { dt: number; now: number }) => {
    for (const r of remotes.values()) {
      if (!r.avatar) continue;
      // Riding: drawn on the deck as our copy of it is drawn, and walking only as fast as they move on it.
      const riding = placeRider(r, now - INTERP_MS, true, dt),
        l = r.ride?.l,
        was = r.ride?.prev;
      r.avatar.position.copy(r.target);
      r.avatar.rotation.y = r.yaw;
      let speed = dt > 0 ? tmpV.copy(r.target).sub(r.prevPos).setY(0).length() / dt : 0;
      if (riding && l && was) {
        speed = was.yaw === was.yaw && dt > 0 ? Math.hypot(l.x - was.x, l.z - was.z) / dt : 0;
        Object.assign(was, l);
      } else if (was) was.yaw = NaN;
      r.speed = lerp(r.speed, speed, 1 - Math.exp(-dt * 10));
      r.prevPos.copy(r.target);
      animateAvatar(r.avatar, r.speed, r.state === 1, dt, r.state === 2);
    }
  },
  { phase: 'update', order: -280 },
);
