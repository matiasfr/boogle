// How the local player looks: the avatar, and how it follows the body. The Buddy (src/player/buddy/) poses it through
// animateAvatar. `me.avatar` is this file's to set; everything else here only reads the player's state.
import { PLAYER_R, SWIM_DEPTH } from '../../constants.ts';
import { carry } from '../../physics/platforms.ts';
import { waterField } from '../../physics/water-field.ts';
import { animateAvatar, makeAvatar } from '../../player/avatars.ts';
import { deepWater, waterColumn } from '../../player/buddy/swim-pose.ts';
import { localJumpCount, me } from './state.ts';

export function makePlayerAvatar() {
  me.avatar = makeAvatar(me.colorIdx, 'local');
  return me.avatar;
}

const column = waterColumn();
const FLOAT = PLAYER_R + SWIM_DEPTH; // m of water over the bed at which the physics floats you
const BOB = 0.3; // m: a bobbing body's centre stays this close to its swim threshold; a dock or rock is far above it

// The avatar follows the body. You walk at your speed on a deck, not over the ground.
export function syncAvatar(dt: number) {
  const avatar = me.avatar!;
  const body = me.body!;
  const ip = body.interpolatedPosition;
  avatar.position.set(ip.x, ip.y, ip.z);
  avatar.rotation.y = me.yaw;
  avatar.userData.riding = carry.on !== null;
  avatar.userData.jumpSequence = localJumpCount();
  const v = body.velocity;
  // Swim or wade by the water's depth at your feet (src/player/buddy/swim-pose.ts), not by the physics' bobbing flags:
  // in deep water a bob that touches the seabed is not footing, and in shallow water a wave that floats you still wades.
  const water = waterField.nearby(ip);
  const deep = deepWater(column, water.height, water.bedHeight, FLOAT, dt);
  const grounded = me.coyote > 0;
  const bobbing = water.height - (ip.y + SWIM_DEPTH) > -BOB;
  animateAvatar(
    avatar,
    Math.hypot(v.x - carry.x, v.z - carry.z),
    !grounded && !me.swimming,
    dt,
    deep && (me.swimming || (grounded && bobbing)),
  );
}
