// The moments of ?proto=place: the machine waking, a line coming through, and the one camera move in the run. The owner
// "barely noticed" the last round's celebration and wanted more drama from the wake. You keep control throughout: nothing
// here stops the player, and only the highlighted Interact skip ends the pull-out early (docs/research/construction-you-can-watch.md, rec 9: the
// completion beat is the one place for a camera move). Local and cosmetic.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { camConstraints, me } from '../../player/player.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { emit } from '../../render/particles.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { fanfare } from '../../render/fanfare.ts';
import { SHELLS } from '../net/town-fx.ts';
import { dustRing } from '../../place/pieces.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { scheduleWake, type Waker } from '../../render/wake-presentation.ts';
import { seated } from '../../entities/railway/seat.ts';

// ---------------------------------------------------------------- a little timeline
const queue: { t: number; fn: () => void }[] = [];
export const after = (t: number, fn: () => void) => void queue.push({ t, fn });
export const clearMoments = () => {
  queue.length = 0;
  pull.reset();
  shake = 0;
  banner.classList.remove('on');
};

// ---------------------------------------------------------------- a banner for the big ones
const banner = document.createElement('div');
banner.className = 'place-banner';
const big = document.createElement('b'),
  small = document.createElement('span');
banner.append(big, small);
(document.querySelector('.hud') ?? document.body).append(banner);
let bannerT = 0;
export function showBanner(title: string, line: string, seconds = 3.4) {
  big.textContent = title;
  small.textContent = line;
  banner.classList.remove('on');
  void banner.offsetWidth; // so the animation runs again
  banner.classList.add('on');
  bannerT = seconds;
}

// ---------------------------------------------------------------- the whistle you can't miss
/** Heard where you stand, wherever the engine is: it's yours. */
function whistleHere() {
  const b = me.body;
  if (b) whistle(b.position.x, b.position.z);
}

// ---------------------------------------------------------------- big fireworks
const rockets: { t: number; x: number; y: number; z: number; top: number; c: THREE.Color; big: number }[] = [];
const trail = new THREE.Color('#ffe9b0');
/** A rocket goes up from (x, y, z) and bursts `height` m above it. `size`: how far you can read it from. */
function rocket(x: number, y: number, z: number, height: number, size: number, delay: number) {
  rockets.push({ t: -delay, x, y, z, top: height, c: SHELLS[Math.floor(Math.random() * SHELLS.length)]!, big: size });
}
function burst(x: number, y: number, z: number, c: THREE.Color, size: number) {
  const n = Math.round(44 + size * 8);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 2 - 1,
      r = Math.sqrt(1 - u * u),
      s = (10 + Math.random() * 3) * size;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * r * s,
      vy: u * s,
      vz: Math.sin(a) * r * s,
      life: 1.5 + Math.random() * 0.5,
      size: 0.55 * size,
      color: c,
      intensity: readableIntensity(),
      gravity: 7,
      drag: 1.4,
      shrink: 0.4,
    });
  }
}
/** A long show: `n` rockets over a stretch of the sky. */
export function barrage(cx: number, y: number, cz: number, n: number, gap: number, spread: number, size: number) {
  for (let k = 0; k < n; k++)
    rocket(
      cx + (Math.random() - 0.5) * spread,
      y,
      cz + (Math.random() - 0.5) * spread,
      24 + Math.random() * 16,
      size,
      k * gap,
    );
}

// ---------------------------------------------------------------- the pull-out
const pull = createCameraPullOut(
  () => false,
  false,
  () => !!seated(),
);
/** The camera eases out to `shot`, looking at `at`, drifting to `shotTo`. Only the highlighted Interact skip brings it back early. */
export function pullOut(shot: THREE.Vector3, shotTo: THREE.Vector3, at: THREE.Vector3, seconds = 3) {
  pull.play(shot, shotTo, at, seconds);
}
export const pullOn = pull.active;
let shake = 0;
/** A little shudder of the view, near something heavy. */
export const shakeView = (amount: number) => void (shake = Math.max(shake, reducedMotion ? 0 : amount));
camConstraints.push((_look, pos) => {
  if (shake > 0.001) {
    pos.x += (Math.random() - 0.5) * shake;
    pos.y += (Math.random() - 0.5) * shake;
    pos.z += (Math.random() - 0.5) * shake;
  }
  return false;
});

// ---------------------------------------------------------------- the machine waking
export type { Waker } from '../../render/wake-presentation.ts';
export function wakeShow(m: Waker, onLamps: () => void, done: () => void) {
  scheduleWake(m, { after, shakeView, fanfare, dustRing }, onLamps, done);
}

// ---------------------------------------------------------------- a path opening
/** The first path: a warm opening chord, rockets down the gorge, a shake, the pull-out along what
 * you built, with the village running out onto it. Only the highlighted skip ends the camera move early; you keep control throughout. */
export function firstPathShow(o: {
  village: THREE.Vector3;
  gorge: THREE.Vector3;
  shot: THREE.Vector3;
  shotTo: THREE.Vector3;
  at: THREE.Vector3;
}) {
  const p = me.body?.position;
  if (p) placeSound('pathOpen', p.x, p.z);
  shakeView(0.22);
  showBanner('A way across!', '', 4);
  barrage(o.village.x, o.village.y, o.village.z, 14, 0.38, 44, 2.6);
  barrage(o.gorge.x, o.gorge.y, o.gorge.z, 14, 0.42, 70, 3.2);
  after(0.6, () => pullOut(o.shot, o.shotTo, o.at, 4.2));
}
/** Line 2 reaches Far Head: no camera, but rockets at both ends and everyone's whistle. */
export function headShow(at: THREE.Vector3, village: THREE.Vector3) {
  fanfare(true);
  shakeView(0.1);
  showBanner('Far Head!', '', 3.5);
  for (const t of [0, 1.4]) after(t, whistleHere);
  barrage(at.x, at.y, at.z, 10, 0.5, 36, 2.2);
  barrage(village.x, village.y, village.z, 5, 0.6, 26, 1.6);
}
/** Trains. The top of the ladder: the biggest show after the first path. */
export function trainsShow(at: THREE.Vector3, shot: THREE.Vector3, shotTo: THREE.Vector3) {
  fanfare(true);
  showBanner('TRAINS', '', 4);
  for (const t of [0, 0.9, 1.8, 2.7]) after(t, whistleHere);
  barrage(at.x, at.y, at.z, 14, 0.36, 50, 2.6);
  after(0.5, () => pullOut(shot, shotTo, at, 3.4));
}
/** The pier's out. */
export function pierShow(at: THREE.Vector3, shot: THREE.Vector3, shotTo: THREE.Vector3, look: THREE.Vector3) {
  fanfare(true);
  showBanner('Thanks for playing!', '', 7);
  for (const t of [0, 1.2]) after(t, whistleHere);
  barrage(at.x, at.y, at.z, 16, 0.42, 40, 2.8);
  after(0.4, () => pullOut(shot, shotTo, look, 4.2));
}

// ---------------------------------------------------------------- each frame
export function updateMoments(dt: number) {
  for (let k = queue.length - 1; k >= 0; k--) {
    const q = queue[k]!;
    q.t -= dt;
    if (q.t > 0) continue;
    queue.splice(k, 1);
    q.fn();
  }
  shake = Math.max(0, shake - dt * 0.5);
  if (bannerT > 0) {
    bannerT -= dt;
    if (bannerT <= 0) banner.classList.remove('on');
  }
  for (let k = rockets.length - 1; k >= 0; k--) {
    const r = rockets[k]!;
    r.t += dt;
    if (r.t < 0) continue;
    const u = r.t / 0.8;
    if (u >= 1) {
      burst(r.x, r.y + r.top, r.z, r.c, r.big);
      rockets.splice(k, 1);
      continue;
    }
    emit({
      x: r.x,
      y: r.y + r.top * (1 - (1 - u) * (1 - u)),
      z: r.z,
      vx: 0,
      vy: -1,
      vz: 0,
      life: 0.5,
      size: 0.35 * r.big,
      color: trail,
      intensity: readableIntensity(),
      shrink: 0.5,
    });
  }
  pull.update(dt);
}
