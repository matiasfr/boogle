import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SPAWN, BALL_SPAWN, PLAYER_R, GRAVITY, SEA, SUN_DIR, DEFAULT_NAME, reducedMotion } from './constants.js';
import { clamp, angleLerp, sanitizeName } from './math.js';
import { groundHeight } from './terrain.js';
import { scene, camera, sun, sky } from './scene.js';
import { world, teleport } from './physics.js';
import { makeAvatar, makePlayerBody } from './avatars.js';
import { sendPresence } from './net.js';
import { dom, renderPeople } from './hud.js';
import { input } from './input.js';

export const me = {
  entered: false,
  name: '',
  colorIdx: 0,
  body: null,
  avatar: null,
  yaw: 0,
  coyote: 0,
  jumpQueued: 0,
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
  return me.body ? me.body.interpolatedPosition : new CANNON.Vec3(SPAWN.x, 2, SPAWN.z);
}
// Right hand, on the camera's shoulder side; must stay over PLAYER_R + BALL_R from the body axis.
export function handPosition(out = new THREE.Vector3()) {
  const p = playerPos();
  const s = Math.sin(me.yaw),
    c = Math.cos(me.yaw);
  return out.set(p.x - s * 0.85 + c * 0.55, p.y + 0.75, p.z - c * 0.85 - s * 0.55);
}
function aimDirection(from) {
  const fwd = camForward();
  const target = camera.position.clone().addScaledVector(fwd, 30);
  const dir = target.sub(from).normalize();
  dir.y += 0.12;
  return dir.normalize();
}
export const chargeAmount = () => clamp((performance.now() - me.chargeStart) / 900, 0, 1);
export function throwVelocity(c, from) {
  const dir = aimDirection(from);
  const power = 8 + c * 20;
  const v = me.body ? me.body.velocity : { x: 0, z: 0 };
  return new THREE.Vector3(dir.x * power + v.x * 0.5, dir.y * power + 1.5, dir.z * power + v.z * 0.5);
}

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
  world.addBody(me.body);
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

const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3(),
  fwd = new THREE.Vector3();
export function updateCamera(elapsed) {
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
    const floor = Math.max(groundHeight(camPos.x, camPos.z) + 0.45, me.swimming ? SEA - 3 : SEA + 0.3);
    camPos.y = Math.max(camPos.y, floor);
    camera.position.copy(camPos);
    camera.lookAt(camLook.addScaledVector(fwd, 8));
  }
  sky.position.copy(camera.position);
  const focus = me.body ? me.body.interpolatedPosition : { x: 0, y: 0, z: 0 };
  sun.target.position.set(focus.x, focus.y, focus.z);
  sun.position.set(focus.x + SUN_DIR.x * 80, focus.y + SUN_DIR.y * 80, focus.z + SUN_DIR.z * 80);
}

// ---------------------------------------------------------------- throw preview
const dotTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(16, 16, 13, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
})();
const PREVIEW_N = 48;
const previewGeo = new THREE.BufferGeometry();
previewGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PREVIEW_N * 3), 3));
const preview = new THREE.Points(
  previewGeo,
  new THREE.PointsMaterial({
    map: dotTex,
    size: 0.2,
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.3,
    depthWrite: false,
  }),
);
preview.frustumCulled = false;
preview.visible = false;
scene.add(preview);

export function updatePreview() {
  preview.visible = me.charging;
  if (!me.charging) return;
  const p = handPosition();
  const v = throwVelocity(chargeAmount(), p);
  const arr = previewGeo.attributes.position.array;
  let n = 0;
  for (; n < PREVIEW_N; n++) {
    arr[n * 3] = p.x;
    arr[n * 3 + 1] = p.y;
    arr[n * 3 + 2] = p.z;
    for (let k = 0; k < 3; k++) {
      v.y -= GRAVITY * (1 / 60);
      p.addScaledVector(v, 1 / 60);
    }
    if (p.y < groundHeight(p.x, p.z) || p.y < SEA - 0.3) {
      n++;
      break;
    }
  }
  previewGeo.setDrawRange(0, n);
  previewGeo.attributes.position.needsUpdate = true;
}
