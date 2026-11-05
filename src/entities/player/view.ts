// How the local player looks: the avatar, and how it follows the body. The Buddy (src/player/buddy/) poses it through
// animateAvatar. `me.avatar` is this file's to set; everything else here only reads the player's state.
import { carry } from '../../physics/platforms.ts';
import { animateAvatar, makeAvatar } from '../../player/avatars.ts';
import { me } from './state.ts';

export function makePlayerAvatar() {
  me.avatar = makeAvatar(me.colorIdx, 'local');
  return me.avatar;
}

// The avatar follows the body. You walk at your speed on a deck, not over the ground.
export function syncAvatar(dt: number) {
  const avatar = me.avatar!;
  const body = me.body!;
  const ip = body.interpolatedPosition;
  avatar.position.set(ip.x, ip.y, ip.z);
  avatar.rotation.y = me.yaw;
  const v = body.velocity;
  animateAvatar(
    avatar,
    Math.hypot(v.x - carry.x, v.z - carry.z),
    me.coyote <= 0 && !me.swimming,
    dt,
    me.swimming && me.coyote <= 0,
  );
}
