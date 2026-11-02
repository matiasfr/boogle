// The local player's body and rules: what you want from input, entering the island, the controller each physics step,
// the fall back to the spawn. No scene, DOM or HUD here: test/entity-state-node.test.ts holds it to that, so a headless
// run drives the player by writing to `input` and `cam` (src/player/input-state.ts, src/player/state.ts), as input.ts does.
// `me` and `cam` live in src/player/state.ts, a leaf that hands, the HUD and the ball read too.
import { FIXED, GRAVITY, HALF, PLAYER_MASS, PLAYER_R, SPAWN } from '../../constants.ts';
import { angleLerp } from '../../math.ts';
import { groundHeight } from '../../island/heights.ts';
import { forEachContact } from '../../physics/engine.ts';
import { catchFallThrough, makePlayerBody, teleport } from '../../physics/physics.ts';
import { carry, carryStep } from '../../physics/platforms.ts';
import { waterField } from '../../physics/water-field.ts';
import { peopleChanged, sendPresence, setLocalPresence } from '../../netplay/net.ts';
import { input, inputState } from '../../player/input-state.ts';
import { cam, me } from '../../player/state.ts';

export { cam, me };
setLocalPresence(me);

const q = new URLSearchParams(globalThis.location?.search);
// Air acceleration (m/s²). ?air=35 tries another on any page (rec 6: Celeste's air control is 0.65 of ground, ours
// 0.2); unset, it stays 14.
const AIR_ACCEL = Number(q.get('air')) || 14;
const MAX_FALL = 20; // m/s: see catchFallThrough in src/physics/physics.ts
const KEY_TURN = 2; // rad/s while ← or → is held without mouse look

const onEnter: (() => void)[] = [];
/** fn() when you enter the island, with me.body made and placed: ./headless.ts spawns the body, ./index.ts the avatar. */
export const onEntered = (fn: () => void) => void onEnter.push(fn);

/** Into the world as `name`, once. The lobby's part (its name field, closing it) is in src/player/hud.ts. */
export function enterIsland(name: string) {
  if (me.entered) return;
  me.name = name;
  me.entered = true;
  const ang = Math.random() * Math.PI * 2,
    rr = Math.random() * 3;
  const x = SPAWN.x + Math.cos(ang) * rr;
  const z = SPAWN.z + Math.sin(ang) * rr;
  const y = groundHeight(x, z) + PLAYER_R + 0.6;
  me.body = makePlayerBody(false);
  teleport(me.body, x, y, z);
  for (const fn of onEnter) fn();
  me.yaw = cam.yaw;
  sendPresence();
  peopleChanged();
}

export function updateIntent(dt: number) {
  const k = input.keys;
  if (!input.stickX && !input.stickY) input.sprint = false; // the pad's sprint latch ends when the stick rests
  me.sprint = input.sprint || k.has('ShiftLeft') || k.has('ShiftRight');
  // With no mouse look (unlocked: keyboard only, or the iPad, which has no Pointer Lock) ← → turn the camera instead of
  // stepping sideways (research/cross-device-input.md rec 15). Seated, they only steer the vehicle (setSeated).
  const arrowsTurn = !inputState.locked;
  const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
  if (arrowsTurn && turn && me.entered && !inputState.seated) cam.yaw += turn * KEY_TURN * dt;
  let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
  if (!arrowsTurn) s -= turn;
  f -= input.stickY;
  s += input.stickX;
  const fx = -Math.sin(cam.yaw),
    fz = -Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw),
    rz = -Math.sin(cam.yaw);
  me.wish.set(fx * f + rx * s, 0, fz * f + rz * s);
  if (me.wish.lengthSq() > 1) me.wish.normalize();
  // me.down: knocked flat by a fast ball (features/impact.ts); held: talking (src/player/conversation.ts)
  if (!me.entered || me.down || inputState.held) me.wish.set(0, 0, 0);
  me.jumpQueued = me.down || inputState.held ? 0 : Math.max(0, me.jumpQueued - dt);

  let targetYaw = null;
  if (me.holding || me.charging) targetYaw = cam.yaw;
  else if (me.wish.lengthSq() > 0.01) targetYaw = Math.atan2(-me.wish.x, -me.wish.z);
  if (targetYaw !== null) me.yaw = angleLerp(me.yaw, targetYaw, 1 - Math.exp(-dt * 12));
}

// Each physics step: steer the body's velocity toward what you want, jump, swim, and stay inside the map.
export function steerPlayer() {
  const b = me.body!;
  me.coyote -= FIXED;
  carryStep(b, me); // a deck under you (src/physics/platforms.ts): steering below is relative to its motion
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
  if (depth > 0) b.force.y += PLAYER_MASS * GRAVITY * (1 + Math.min(depth * 2.2, 1.4)) - PLAYER_MASS * 3 * b.velocity.y;
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

// Each physics step, after it: back on top if you fell through, and ground under your feet starts the ledge grace.
export function groundPlayer() {
  const b = me.body!;
  catchFallThrough(b, PLAYER_R);
  forEachContact(b, (nx, ny) => {
    if (ny <= 0.55) return false;
    me.coyote = 0.1;
    return true;
  });
}

// After the ball's respawn check (src/entities/ball/, -300): falling off the world puts you back at the spawn.
export function fallRespawn() {
  const b = me.body!;
  if (b.position.y < -25) {
    teleport(b, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + 1.2, SPAWN.z);
    b.velocity.set(0, 0, 0);
  }
}

// A deck you ride turns you and the camera with it. Once a frame, as the avatar syncs (./index.ts), so whatever draws
// before it this frame still sees last frame's yaw. A headless run has no update phase and skips this; it has no decks.
export function turnWithDeck() {
  me.yaw += carry.spin;
  cam.yaw += carry.spin;
  carry.spin = 0;
}

export function describePlayer() {
  const { position: p, velocity: v } = me.body!;
  return {
    position: { x: p.x, y: p.y, z: p.z },
    velocity: { x: v.x, y: v.y, z: v.z },
    grounded: me.coyote > 0,
    swimming: me.swimming,
    sprint: me.sprint,
  };
}
