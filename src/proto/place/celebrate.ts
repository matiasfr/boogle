// The moments of ?proto=place: the machine waking, a line coming through, and the one camera move in the run. The owner
// "barely noticed" the last round's celebration and wanted more drama from the wake. You keep control throughout: nothing
// here stops the player, and any input ends the pull-out at once (docs/research/construction-you-can-watch.md, rec 9: the
// completion beat is the one place for a camera move). Local and cosmetic.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { camConstraints, camForward, me } from '../../player/player.ts';
import { input } from '../../player/input.ts';
import { chuff, thump, whistle } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { fanfare } from '../minis/common.ts';
import { SHELLS } from '../net/town-fx.ts';
import { dustRing } from './pieces.ts';
import type { Machine } from './rail.ts';

// ---------------------------------------------------------------- a little timeline
const queue: { t: number; fn: () => void }[] = [];
export const after = (t: number, fn: () => void) => void queue.push({ t, fn });
export const clearMoments = () => {
  queue.length = 0;
  pull.w = pull.t = 0;
  pull.on = false;
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
const pull = {
  on: false,
  t: 0,
  dur: 3,
  w: 0,
  cut: 1,
  shot: new THREE.Vector3(),
  shotTo: new THREE.Vector3(),
  at: new THREE.Vector3(),
  keys: '',
  sx: 0,
  sy: 0,
  pads: 0,
};
const ease = (u: number) => u * u * (3 - 2 * u);
const padsDown = () => {
  let n = 0;
  for (const p of navigator.getGamepads?.() ?? []) if (p) for (const b of p.buttons) if (b.pressed) n++;
  return n;
};
const keysNow = () => [...input.keys].sort().join();
const stop = () => {
  if (pull.on) pull.cut = Math.min(pull.cut, 0.999); // starts the quick fade back
};
for (const ev of ['pointerdown', 'wheel', 'mousemove', 'touchstart'] as const)
  addEventListener(ev, () => pull.on && pull.t > 0.05 && stop(), { capture: true, passive: true });
/** The camera eases out to `shot`, looking at `at`, drifting to `shotTo`. Any input brings it straight back. */
export function pullOut(shot: THREE.Vector3, shotTo: THREE.Vector3, at: THREE.Vector3, seconds = 3) {
  if (reducedMotion) return;
  pull.on = true;
  pull.t = 0;
  pull.dur = seconds;
  pull.cut = 1;
  pull.shot.copy(shot);
  pull.shotTo.copy(shotTo);
  pull.at.copy(at);
  pull.keys = keysNow();
  pull.sx = input.stickX;
  pull.sy = input.stickY;
  pull.pads = padsDown();
}
export const pullOn = () => pull.on;
const fwd = new THREE.Vector3(),
  aim = new THREE.Vector3(),
  shotNow = new THREE.Vector3();
let shake = 0;
/** A little shudder of the view, near something heavy. */
export const shakeView = (amount: number) => void (shake = Math.max(shake, reducedMotion ? 0 : amount));
camConstraints.push((look, pos) => {
  if (shake > 0.001) {
    pos.x += (Math.random() - 0.5) * shake;
    pos.y += (Math.random() - 0.5) * shake;
    pos.z += (Math.random() - 0.5) * shake;
  }
  if (!pull.on || pull.w <= 0) return false;
  camForward(fwd);
  shotNow.lerpVectors(pull.shot, pull.shotTo, pull.t / pull.dur);
  aim.copy(look).addScaledVector(fwd, 8).lerp(pull.at, pull.w);
  pos.lerp(shotNow, pull.w);
  look.copy(aim).addScaledVector(fwd, -8);
  return true;
});

// ---------------------------------------------------------------- the machine waking
const rust = new THREE.Color('#8a5a34'),
  flake = new THREE.Color('#6d4426'),
  dustC = new THREE.Color('#cdb48c'),
  steam = new THREE.Color('#f6f4ee'),
  soot = new THREE.Color('#7c7770');
const v = new THREE.Vector3();
function shedRust(m: Machine, n: number) {
  for (const c of [m.flatbed, m.loco])
    for (let k = 0; k < n; k++) {
      const sx = (Math.random() - 0.5) * 2 * c.spec.hx,
        sz = (Math.random() - 0.5) * 2 * c.spec.hz,
        cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw);
      emit({
        x: c.x + sx * cos + sz * sin,
        y: c.y + Math.random() * 1.3,
        z: c.z - sx * sin + sz * cos,
        vx: (Math.random() - 0.5) * 2.6,
        vy: 0.6 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 2.6,
        life: 0.8 + Math.random() * 0.6,
        size: 0.08 + Math.random() * 0.1,
        color: Math.random() < 0.5 ? rust : flake,
        gravity: 9,
        shrink: 0.3,
      });
      if (k % 3 === 0)
        emit({
          x: c.x + sx * cos + sz * sin,
          y: c.y - 0.4 + Math.random(),
          z: c.z - sx * sin + sz * cos,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0.4,
          vz: (Math.random() - 0.5) * 1.5,
          life: 1 + Math.random() * 0.6,
          size: 0.5,
          grow: [1, 3],
          alpha: 0.55,
          fade: 0.6,
          color: dustC,
          drag: 1.4,
        });
    }
}
function cough(m: Machine, heavy: number) {
  m.look.chimneyTop.getWorldPosition(v);
  chuff(v.x, v.z, heavy);
  for (let k = 0; k < 3 + heavy * 5; k++)
    emit({
      x: v.x,
      y: v.y,
      z: v.z,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 2 + heavy * 2,
      vz: (Math.random() - 0.5) * 0.8,
      life: 1.4,
      size: 0.4 + heavy * 0.2,
      grow: [1, 3],
      alpha: 0.7,
      fade: 0.5,
      color: heavy < 0.6 ? soot : steam,
    });
}
function steamBurst(m: Machine) {
  m.look.chimneyTop.getWorldPosition(v);
  for (let k = 0; k < 60; k++) {
    const a = Math.random() * Math.PI * 2,
      s = Math.random() * 2.6;
    emit({
      x: v.x,
      y: v.y,
      z: v.z,
      vx: Math.cos(a) * s,
      vy: 5 + Math.random() * 7,
      vz: Math.sin(a) * s,
      life: 1.8 + Math.random() * 1.4,
      size: 0.7 + Math.random() * 0.5,
      grow: [1, 4],
      alpha: 0.9,
      fade: 0.5,
      color: steam,
      drag: 0.9,
    });
  }
  // Out of the sides, low down, at the height of the wheels.
  const c = m.loco;
  for (const side of [-1, 1])
    for (let k = 0; k < 18; k++) {
      const cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw),
        s = 4 + Math.random() * 5;
      emit({
        x: c.x + side * 0.9 * cos,
        y: c.y - 0.5,
        z: c.z - side * 0.9 * sin,
        vx: side * cos * s + (Math.random() - 0.5),
        vy: Math.random() * 1.2,
        vz: -side * sin * s + (Math.random() - 0.5),
        life: 0.9 + Math.random() * 0.5,
        size: 0.5,
        grow: [1, 3.4],
        alpha: 0.8,
        fade: 0.5,
        color: steam,
        drag: 2.2,
      });
    }
}
/** About 3 s, and the player keeps control: a shudder, rust and dust shaking off, the boiler catching, a big burst of
 * steam, the headlamps, a whistle. `done` is when it's ready for work. */
export function wakeShow(m: Machine, onLamps: () => void, done: () => void) {
  const x = m.flatbed.x,
    z = m.flatbed.z;
  const near = () => (me.body ? Math.max(0, 1 - m.distance(me.body.position.x, me.body.position.z) / 18) : 0);
  thump(x, z);
  m.shudder(0.35);
  m.setRust(1);
  dustRing(m.loco.x, m.loco.y - 1, m.loco.z, 10, 2.4, 0.5);
  shedRust(m, 8);
  shakeView(0.05 * near());
  // The boiler tries, and tries faster.
  for (const [t, heavy] of [
    [0.45, 0.2],
    [0.95, 0.3],
    [1.3, 0.4],
    [1.55, 0.5],
    [1.72, 0.6],
    [1.85, 0.7],
  ] as const)
    after(t, () => {
      cough(m, heavy);
      thump(x, z);
      shedRust(m, 5);
      m.shudder(0.35 + heavy);
      shakeView(0.08 * near());
    });
  for (let k = 0; k <= 16; k++) after(0.2 + k * 0.11, () => m.setRust(1 - k / 16));
  after(1.0, () => m.setFire(0.4));
  after(1.5, () => m.setFire(0.7));
  after(1.95, () => {
    m.setFire(1);
    steamBurst(m);
    chuff(x, z, 1);
    thump(x, z);
    shedRust(m, 10);
    dustRing(m.flatbed.x, m.flatbed.y - 0.9, m.flatbed.z, 16, 4, 0.6);
    m.shudder(1);
    shakeView(0.16 * near());
  });
  after(2.35, () => {
    m.setLamps(true);
    onLamps();
    m.shudder(0.25);
  });
  after(2.6, () => {
    whistleHere();
    whistle(x, z);
    fanfare(false);
  });
  after(3.1, () => {
    m.shudder(0);
    done();
  });
}

// ---------------------------------------------------------------- a line coming through
/** The first line. You can't miss this one: a long whistle, a big show over the village and the gorge, and the pull-out. */
export function firstLineShow(o: {
  village: THREE.Vector3;
  gorge: THREE.Vector3;
  shot: THREE.Vector3;
  shotTo: THREE.Vector3;
  at: THREE.Vector3;
}) {
  fanfare(true);
  showBanner('The line is through!', 'Your timber is on its way home.', 4.2);
  for (const t of [0, 1.3, 2.6]) after(t, whistleHere);
  barrage(o.village.x, o.village.y, o.village.z, 12, 0.42, 40, 2.6);
  barrage(o.gorge.x, o.gorge.y, o.gorge.z, 10, 0.5, 70, 3);
  after(0.5, () => pullOut(o.shot, o.shotTo, o.at, 3));
}
/** Line 2: no camera, but still an event. */
export function nextLineShow(at: THREE.Vector3, village: THREE.Vector3) {
  fanfare(true);
  showBanner('Line 2 is through!', 'Stone is coming to the village.');
  for (const t of [0, 1.4]) after(t, whistleHere);
  barrage(at.x, at.y, at.z, 7, 0.5, 24, 1.6);
  barrage(village.x, village.y, village.z, 5, 0.6, 26, 1.6);
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
      shrink: 0.5,
    });
  }
  if (!pull.on) return;
  pull.t += dt;
  // Anything new from the player ends it: a key, a stick, a pad button. (A key held since before it started doesn't.)
  if (keysNow() !== pull.keys || Math.abs(input.stickX - pull.sx) > 0.2 || Math.abs(input.stickY - pull.sy) > 0.2)
    stop();
  if (padsDown() > pull.pads) stop();
  if (pull.cut < 1) pull.cut = Math.max(0, pull.cut - dt / 0.14);
  const out = Math.min(1, pull.t / 0.95),
    back = Math.max(0, (pull.t - (pull.dur - 0.55)) / 0.55);
  pull.w = ease(out) * (1 - ease(Math.min(1, back))) * pull.cut;
  if (pull.t >= pull.dur || pull.cut <= 0) {
    pull.on = false;
    pull.w = 0;
  }
}
