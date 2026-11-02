// The local player, as one blob for now: what it wants from input, its controller each physics step, the fall back to the
// spawn, and its avatar. The state and view split comes later (docs/plans/entity-architecture.md, step 12), so `me`, the
// intent and entering the island stay in src/player/player.ts for now, and enterIsland adds its body and avatar.
// Spawned at load, without either: intent runs before you enter. Orders: top of src/loop.ts.
import { FIXED, GRAVITY, HALF, PLAYER_MASS, PLAYER_R, SPAWN } from '../../constants.ts';
import { defineKind, spawn } from '../../entity/entity.ts';
import { groundHeight } from '../../island/terrain.ts';
import { forEachContact } from '../../physics/engine.ts';
import { catchFallThrough, teleport } from '../../physics/physics.ts';
import { carry, carryStep } from '../../physics/platforms.ts';
import { waterField } from '../../physics/water-field.ts';
import { animateAvatar } from '../../player/avatars.ts';
import { cam, me, updateIntent } from '../../player/player.ts';

const q = new URLSearchParams(globalThis.location?.search);
// Air acceleration (m/s²). ?air=35 tries another on any page (rec 6: Celeste's air control is 0.65 of ground, ours
// 0.2); unset, it stays 14.
const AIR_ACCEL = Number(q.get('air')) || 14;
const MAX_FALL = 20; // m/s: see catchFallThrough in src/physics/physics.ts

defineKind('player', { prePhysics: -80, fixedPre: 40, fixedPost: 20, postPhysics: -290, update: -290 });

spawn({
  kind: 'player',
  prePhysics: ({ dt }) => updateIntent(dt),

  fixedPre() {
    const b = me.body;
    if (b) {
      me.coyote -= FIXED;
      carryStep(b, me); // a deck under you (./platforms.ts): steering below is relative to its motion
      const surfY = waterField.surfaceAt(b.position.x, b.position.z);
      const depth = surfY - (b.position.y + 0.35);
      me.swimming = depth > 0;
      const speed = (me.sprint ? 9.5 : 5.6) * (me.swimming ? 0.55 : 1);
      const rvx = b.velocity.x - carry.x,
        rvz = b.velocity.z - carry.z;
      const braking = me.wish.x * rvx + me.wish.z * rvz < 0;
      const accel = me.coyote > 0 ? (braking ? 115 : 70) : me.swimming ? 18 : AIR_ACCEL;
      let dx = me.wish.x * speed - rvx,
        dz = me.wish.z * speed - rvz;
      const dl = Math.hypot(dx, dz),
        maxDv = accel * FIXED;
      if (dl > maxDv) {
        dx *= maxDv / dl;
        dz *= maxDv / dl;
      }
      b.velocity.x += dx;
      b.velocity.z += dz;
      if (b.velocity.y < -MAX_FALL) b.velocity.y = -MAX_FALL;
      if (me.jumpQueued > 0) {
        if (me.coyote > 0) {
          b.velocity.y = Math.min(Math.max(b.velocity.y, 0), 6) + 7.6; // adds to an upward bounce: bounces chain
          me.coyote = 0;
          me.jumpQueued = 0;
        } else if (me.swimming) {
          b.velocity.y = Math.max(b.velocity.y, 4.5);
          me.jumpQueued = 0;
        }
      }
      if (depth > 0)
        b.force.y += PLAYER_MASS * GRAVITY * (1 + Math.min(depth * 2.2, 1.4)) - PLAYER_MASS * 3 * b.velocity.y;
      // Soft wall a little inside the edge of the map: swimming out to sea turns you back.
      const lim = HALF - 18;
      for (const ax of ['x', 'z'] as const) {
        const p = b.position[ax];
        if (Math.abs(p) > lim) {
          const out = Math.sign(p) * b.velocity[ax];
          if (out > -2) b.velocity[ax] -= Math.sign(p) * (out + 2);
        }
      }
    }
  },

  fixedPost() {
    const b = me.body;
    if (!b) return;
    catchFallThrough(b, PLAYER_R);
    forEachContact(b, (nx, ny) => {
      if (ny <= 0.55) return false;
      me.coyote = 0.1;
      return true;
    });
  },

  // After the ball's respawn check (src/entities/ball/, -300): falling off the world puts you back at the spawn.
  postPhysics() {
    if (me.body && me.body.position.y < -25) {
      teleport(me.body, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + 1.2, SPAWN.z);
      me.body.velocity.set(0, 0, 0);
    }
  },

  // After the ball mesh (src/entities/ball/, -300), before remote avatars (remote-player, -280): the avatar follows the
  // body. A deck you ride turns you and the camera with it, and you walk at your speed on the deck, not over the ground.
  update({ dt }) {
    if (!me.avatar || !me.body) return;
    me.yaw += carry.spin;
    cam.yaw += carry.spin;
    carry.spin = 0;
    const ip = me.body.interpolatedPosition;
    me.avatar.position.set(ip.x, ip.y, ip.z);
    me.avatar.rotation.y = me.yaw;
    const v = me.body.velocity;
    animateAvatar(
      me.avatar,
      Math.hypot(v.x - carry.x, v.z - carry.z),
      me.coyote <= 0 && !me.swimming,
      dt,
      me.swimming && me.coyote <= 0,
    );
  },
});
