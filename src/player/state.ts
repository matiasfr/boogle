// The local player's state and the poses read off it: a leaf module, so hands, the HUD, input, the ball and the
// adapters can read them without importing the systems that drive them (src/entities/player/state.ts; player.ts re-exports all of this).
import * as THREE from 'three/webgpu';
import { SPAWN, BALL_SPAWN } from '../constants.ts';
import type { Body } from '../physics/engine.ts';
import type { Avatar } from './avatars.ts';

export const me = {
  entered: false,
  name: '',
  colorIdx: 0,
  body: null as Body | null,
  avatar: null as Avatar | null,
  yaw: 0,
  coyote: 0,
  jumpQueued: 0,
  jumpHeld: false,
  swimming: false,
  sprint: false,
  holding: false,
  charging: false,
  chargeStart: 0,
  suppressUp: false,
  down: false,
  lostBallAt: -1e9,
  wish: new THREE.Vector3(),
};
export const cam = { yaw: Math.atan2(SPAWN.x - BALL_SPAWN.x, SPAWN.z - BALL_SPAWN.z), pitch: -0.22, dist: 5.2 };

export function camForward(out = new THREE.Vector3()) {
  const cp = Math.cos(cam.pitch);
  return out.set(-Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp);
}
function playerPos() {
  return me.body ? me.body.interpolatedPosition : { x: SPAWN.x, y: 2, z: SPAWN.z };
}
// A point beside the player in their own frame (x right, y up, z back; the avatar faces -z), in world space.
function fromBody(out: THREE.Vector3, x: number, y: number, z: number) {
  const p = playerPos();
  const s = Math.sin(me.yaw),
    c = Math.cos(me.yaw);
  return out.set(p.x + x * c + z * s, p.y + y, p.z - x * s + z * c);
}
// Right hand, on the camera's shoulder side; must stay over PLAYER_R + BALL_R from the body axis.
export const handPosition = (out = new THREE.Vector3()) => fromBody(out, 0.55, 0.75, -0.85);
// The beach ball rides on your back while something else is in your hand. A body can say where (its back is its own).
export const ballOnBack = { y: 1.05, z: 0.85 };
export const carryPosition = (out = new THREE.Vector3()) =>
  me.holding ? handPosition(out) : fromBody(out, 0, ballOnBack.y, ballOnBack.z);
// Where small held things sit (src/features/hotbar.ts draws them there).
export const ITEM_HAND = { x: 0.5, y: 0.42, z: -0.42 };
// Where they leave from when thrown: an overhand throw from head height, which clears a waist-high railing.
export const throwFrom = (out = new THREE.Vector3()) => fromBody(out, 0.45, 1.0, -0.5);
