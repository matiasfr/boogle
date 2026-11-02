import * as THREE from 'three/webgpu';
import { SPAWN, PLAYER_R, SEA, DEFAULT_NAME, reducedMotion } from '../constants.ts';
import { SUN_DIR } from '../render/sun-dir.ts';
import { angleLerp, sanitizeName } from '../math.ts';
import { groundHeight } from '../island/terrain.ts';
import { scene, camera, sun, sky } from '../render/scene.ts';
import { teleport } from '../physics/physics.ts';
import { addBody, getMask } from '../physics/engine.ts';
import { carry } from '../physics/platforms.ts';
import { makeAvatar, makePlayerBody, animateAvatar } from './avatars.ts';
import { makeCameraArm } from './camera-arm.ts';
import { sendPresence, setLocalPresence, peopleChanged } from '../netplay/net.ts';
import { dom } from './dom.ts';
import { input, inputState } from './input-state.ts';
import { me, cam, camForward } from './state.ts';
import { onFrame } from '../loop.ts';

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

const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3(),
  camFrom = new THREE.Vector3(),
  fwd = new THREE.Vector3();
const camArm = makeCameraArm();
const camFloor = (x: number, z: number) => Math.max(groundHeight(x, z) + 0.45, me.swimming ? SEA - 3 : SEA + 0.3);
function updateCamera(elapsed: number) {
  if (!me.entered || !me.body) {
    const a = reducedMotion ? 0.9 : 0.9 + elapsed * 0.04;
    camera.position.set(Math.cos(a) * 66, 26, Math.sin(a) * 66);
    camera.lookAt(0, 3, 0);
  } else {
    const ip = me.body.interpolatedPosition;
    camForward(fwd);
    const rx = Math.cos(cam.yaw),
      rz = -Math.sin(cam.yaw);
    camLook.set(ip.x + rx * 0.55, ip.y + 1.35, ip.z + rz * 0.55);
    camPos.copy(camLook).addScaledVector(fwd, -cam.dist);
    if (!camConstraints.some((fn) => fn(camLook, camPos))) {
      // Up over the ground first, so a slope lifts the camera instead of pulling it in; then the arm, out of whatever's
      // left in the way (a ridge, a wall). It collides with what you collide with: outside the caves, not their rock.
      camPos.y = Math.max(camPos.y, camFloor(camPos.x, camPos.z));
      camArm.solve(camFrom.set(ip.x, camLook.y, ip.z), camPos, getMask(me.body));
      camPos.y = Math.max(camPos.y, camFloor(camPos.x, camPos.z));
    } else camArm.reset();
    camera.position.copy(camPos);
    camera.lookAt(camLook.addScaledVector(fwd, 8));
  }
  sky.position.copy(camera.position);
  const focus = me.body ? me.body.interpolatedPosition : { x: 0, y: 0, z: 0 };
  sun.target.position.set(focus.x, focus.y, focus.z);
  sun.position.set(focus.x + SUN_DIR.x * 80, focus.y + SUN_DIR.y * 80, focus.z + SUN_DIR.z * 80);
}

// ---------------------------------------------------------------- frame hooks (orders: top of src/loop.ts)
// world -290, after the ball's respawn check (src/entities/ball/, -300): falling off the world puts you back at the spawn.
onFrame(
  () => {
    if (me.body && me.body.position.y < -25) {
      teleport(me.body, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + 1.2, SPAWN.z);
      me.body.velocity.set(0, 0, 0);
    }
  },
  { phase: 'world', order: -290 },
);

// update -290, after the ball mesh (src/entities/ball/, -300), before remote avatars (remote-player, -280): the avatar follows the
// body.
// A deck you ride turns you and the camera with it, and you walk at your speed on the deck, not over the ground.
onFrame(
  ({ dt }) => {
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
  { phase: 'update', order: -290 },
);

// update -200, after every visual sync, before the clouds (props.ts, -190) and the features.
onFrame(({ elapsed }) => updateCamera(elapsed), { phase: 'update', order: -200 });
