import * as THREE from 'three/webgpu';
import { SPAWN, BALL_SPAWN, PLAYER_R, SEA, SUN_DIR, DEFAULT_NAME, reducedMotion } from '../constants.ts';
import { angleLerp, sanitizeName } from '../math.ts';
import { groundHeight } from '../adapters/terrain.js';
import { scene, camera, sun, sky } from '../render/scene.js';
import { teleport } from '../physics/physics.js';
import { addBody } from '../physics/engine.ts';
import { makeAvatar, makePlayerBody, animateAvatar } from './avatars.js';
import { sendPresence } from '../netplay/net.ts';
import { dom, renderPeople } from './hud.js';
import { input } from './input.js';
import { onFrame } from '../loop.ts';

export const me = {
  entered: false,
  name: '',
  colorIdx: 0,
  /** @type {import('../physics/engine.ts').Body | null} */
  body: null,
  /** @type {import('three').Group | null} */
  avatar: null,
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
export const cam = { yaw: Math.atan2(SPAWN.x - BALL_SPAWN.x, SPAWN.z - BALL_SPAWN.z), pitch: -0.22, dist: 6.5 };

export function camForward(out = new THREE.Vector3()) {
  const cp = Math.cos(cam.pitch);
  return out.set(-Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), -Math.cos(cam.yaw) * cp);
}
function playerPos() {
  return me.body ? me.body.interpolatedPosition : { x: SPAWN.x, y: 2, z: SPAWN.z };
}
// A point beside the player in their own frame (x right, y up, z back; the avatar faces -z), in world space.
function fromBody(out, x, y, z) {
  const p = playerPos();
  const s = Math.sin(me.yaw),
    c = Math.cos(me.yaw);
  return out.set(p.x + x * c + z * s, p.y + y, p.z - x * s + z * c);
}
// Right hand, on the camera's shoulder side; must stay over PLAYER_R + BALL_R from the body axis.
export const handPosition = (out = new THREE.Vector3()) => fromBody(out, 0.55, 0.75, -0.85);
// The beach ball rides on your back while something else is in your hand.
export const carryPosition = (out = new THREE.Vector3()) =>
  me.holding ? handPosition(out) : fromBody(out, 0, 1.05, 0.85);
// Where small held things sit (src/features/hotbar.js draws them there).
export const ITEM_HAND = { x: 0.5, y: 0.42, z: -0.42 };
// Where they leave from when thrown: an overhand throw from head height, which clears a waist-high railing.
export const throwFrom = (out = new THREE.Vector3()) => fromBody(out, 0.45, 1.0, -0.5);
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
  renderPeople();
}

export function updateIntent(dt) {
  const k = input.keys;
  if (!input.stickX && !input.stickY) input.sprint = false; // the pad's sprint latch ends when the stick rests
  me.sprint = input.sprint || k.has('ShiftLeft') || k.has('ShiftRight');
  let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  f -= input.stickY;
  s += input.stickX;
  const fx = -Math.sin(cam.yaw),
    fz = -Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw),
    rz = -Math.sin(cam.yaw);
  me.wish.set(fx * f + rx * s, 0, fz * f + rz * s);
  if (me.wish.lengthSq() > 1) me.wish.normalize();
  if (!me.entered || me.down) me.wish.set(0, 0, 0); // me.down: knocked flat by a fast ball (features/impact.js)
  me.jumpQueued = me.down ? 0 : Math.max(0, me.jumpQueued - dt);

  let targetYaw = null;
  if (me.holding || me.charging) targetYaw = cam.yaw;
  else if (me.wish.lengthSq() > 0.01) targetYaw = Math.atan2(-me.wish.x, -me.wish.z);
  if (targetYaw !== null) me.yaw = angleLerp(me.yaw, targetYaw, 1 - Math.exp(-dt * 12));
}

// Features that need the third-person camera somewhere special (the caves keep it inside the tunnel) push
// fn(look, pos) -> true when they placed `pos` themselves; then the usual "stay above the ground" rule is skipped.
export const camConstraints = [];

const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3(),
  fwd = new THREE.Vector3();
function updateCamera(elapsed) {
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
      const floor = Math.max(groundHeight(camPos.x, camPos.z) + 0.45, me.swimming ? SEA - 3 : SEA + 0.3);
      camPos.y = Math.max(camPos.y, floor);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook.addScaledVector(fwd, 8));
  }
  sky.position.copy(camera.position);
  const focus = me.body ? me.body.interpolatedPosition : { x: 0, y: 0, z: 0 };
  sun.target.position.set(focus.x, focus.y, focus.z);
  sun.position.set(focus.x + SUN_DIR.x * 80, focus.y + SUN_DIR.y * 80, focus.z + SUN_DIR.z * 80);
}

// ---------------------------------------------------------------- frame hooks (orders: top of src/loop.ts)
// world -290, after the ball's respawn check (ball.js, -300): falling off the world puts you back at the spawn.
onFrame(
  () => {
    if (me.body && me.body.position.y < -25) {
      teleport(me.body, SPAWN.x, groundHeight(SPAWN.x, SPAWN.z) + 1.2, SPAWN.z);
      me.body.velocity.set(0, 0, 0);
    }
  },
  { phase: 'world', order: -290 },
);

// update -290, after the ball mesh (ball.js, -300), before remote avatars (net.js, -280): the avatar follows the body.
onFrame(
  ({ dt }) => {
    if (!me.avatar || !me.body) return;
    const ip = me.body.interpolatedPosition;
    me.avatar.position.set(ip.x, ip.y, ip.z);
    me.avatar.rotation.y = me.yaw;
    animateAvatar(me.avatar, Math.hypot(me.body.velocity.x, me.body.velocity.z), me.coyote <= 0 && !me.swimming, dt);
  },
  { phase: 'update', order: -290 },
);

// update -200, after every visual sync, before the clouds (props.js, -190) and the features.
onFrame(({ elapsed }) => updateCamera(elapsed), { phase: 'update', order: -200 });
