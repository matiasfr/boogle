import type * as THREE from 'three/webgpu';
import { SPAWN, PLAYER_R, DEFAULT_NAME } from '../constants.ts';
import { angleLerp, sanitizeName } from '../math.ts';
import { groundHeight } from '../island/terrain.ts';
import { scene } from '../render/scene.ts';
import { teleport } from '../physics/physics.ts';
import { addBody } from '../physics/engine.ts';
import { makeAvatar, makePlayerBody } from './avatars.ts';
import { sendPresence, setLocalPresence, peopleChanged } from '../netplay/net.ts';
import { dom } from './dom.ts';
import { input, inputState } from './input-state.ts';
import { me, cam } from './state.ts';

export { me, cam, camForward, handPosition, carryPosition, ITEM_HAND, throwFrom } from './state.ts';
setLocalPresence(me);

export function enterIsland() {
  if (me.entered) return;
  me.name = sanitizeName(dom.nameInput.value) || DEFAULT_NAME;
  me.entered = true;
  document.body.classList.add('playing');
  dom.lobbyEl.hidden = true;
  const ang = Math.random() * Math.PI * 2,
    rr = Math.random() * 3;
  const x = SPAWN.x + Math.cos(ang) * rr;
  const z = SPAWN.z + Math.sin(ang) * rr;
  const y = groundHeight(x, z) + PLAYER_R + 0.6;
  // By hand, not through the player entity's mesh and bodies: the entity spawns at load and these arrive here. Left for
  // the player's state and view split (docs/plans/entity-architecture.md, step 12).
  me.body = makePlayerBody(false);
  teleport(me.body, x, y, z);
  addBody(me.body);
  me.avatar = makeAvatar(me.colorIdx);
  scene.add(me.avatar);
  me.yaw = cam.yaw;
  try {
    localStorage.setItem('boogle.name', me.name);
    localStorage.setItem('boogle.color', String(me.colorIdx));
  } catch {
    // storage unavailable (private mode); the name just will not be remembered
  }
  sendPresence();
  peopleChanged();
}

const KEY_TURN = 2; // rad/s while ← or → is held without mouse look

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

// Features that need the third-person camera somewhere special (the caves keep it inside the tunnel) push
// fn(look, pos) -> true when they placed `pos` themselves; then the usual "stay above the ground" rule is skipped.
export const camConstraints: ((look: THREE.Vector3, pos: THREE.Vector3) => boolean)[] = [];
