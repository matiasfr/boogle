// One throw for everything you hold: the beach ball, the frisbee and every other item (src/player/throw-curve.ts has the
// numbers). Hold to charge, aim where the camera looks, release to launch; the dots show where it will go. The thing
// itself flies in src/entities/ball/. Item profiles remain for previews; classic gift flights are retired. Serves DESIGN.md 10 (slapstick: every
// throw feels the same). The charge state stays in me.charging / me.chargeStart (the HUD, impact and the input
// code read or reset it), but only startCharge here starts one.
import * as THREE from 'three/webgpu';
import { SEA } from '../constants.ts';
import { waterField } from '../physics/water-field.ts';
import { groundHeight } from '../island/terrain.ts';
import { camera } from '../render/scene.ts';
import { dynAttr, instancedSprite } from '../render/sprites.ts';
import { readableUnlit } from '../render/readable-unlit.ts';
import { stepFlight, stepBall } from '../physics/flight.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { me, camForward, handPosition, throwFrom } from './state.ts';
import { heldId } from './inventory.ts';
import { AIM_DIST, chargeOf, launchVelocity, profileFor } from './throw-curve.ts';

export function startCharge() {
  me.charging = true;
  me.chargeStart = performance.now();
  return true;
}
export function cancelCharge() {
  me.charging = false;
}
export const chargeAmount = () => chargeOf(performance.now() - me.chargeStart);

// The point the camera looks at, AIM_DIST ahead.
export const aimPoint = (out = new THREE.Vector3()) =>
  out.copy(camera.position).addScaledVector(camForward(), AIM_DIST);

const aim = new THREE.Vector3();
// What throwing `id` at charge c would do right now: { p: where it leaves your hand, v: its velocity, profile }.
export const releasePoint = (id: string | null) => (id === 'ball' ? handPosition() : throwFrom());

export function launch(id: string | null, c: number) {
  const profile = profileFor(id);
  const p = releasePoint(id);
  const dir = aimPoint(aim).sub(p).normalize();
  const bodyV = me.body ? me.body.velocity : { x: 0, y: 0, z: 0 };
  const v = launchVelocity(profile, c, dir, bodyV);
  return { p, v: new THREE.Vector3(v.x, v.y, v.z), profile };
}

// ---------------------------------------------------------------- aim preview
const dotTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(16, 16, 13, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
})();
const PREVIEW_N = 48;
const previewAttr = dynAttr(new Float32Array(PREVIEW_N * 3), 3);
const previewMat = readableUnlit(
  new THREE.PointsNodeMaterial({
    map: dotTex,
    size: 0.2,
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.3,
    depthWrite: false,
  }),
);
const preview = instancedSprite(previewMat, previewAttr);

const DT = 1 / 60;
function updatePreview() {
  preview.visible = me.charging;
  if (!me.charging) return;
  const { p, v, profile } = launch(heldId(), chargeAmount());
  const glide = profile.flight === 'glide';
  const sub = glide ? 5 : 3; // flight steps per dot
  const arr = previewAttr.array as Float32Array;
  let n = 0;
  for (; n < PREVIEW_N; n++) {
    arr[n * 3] = p.x;
    arr[n * 3 + 1] = p.y;
    arr[n * 3 + 2] = p.z;
    for (let k = 0; k < sub; k++) {
      if (profile.flight === 'ball') stepBall(p, v, DT);
      else stepFlight(p, v, glide, DT);
    }
    const surface = waterField.moving ? waterField.nearby(p).height : SEA;
    if (p.y < groundHeight(p.x, p.z) || p.y < surface - 0.3) {
      n++;
      break;
    }
  }
  preview.count = n;
  previewAttr.needsUpdate = true;
}

// late -200, first in late, before the HUD (hud.ts, -190).
defineKind('throw-preview', { lateUpdate: -200 });
spawn({ kind: 'throw-preview', mesh: preview, lateUpdate: updatePreview });
