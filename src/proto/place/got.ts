// "You got ___": a new thing (a cosmetic, a tool, a move) is held up over your head, turning and glowing, under a text box
// you dismiss. Generic finds (logs, stone, rails, money, crystals, gold) never come through here. You stand still while it's
// up: Interact, Jump, Back, a click or a tap puts it away, and the next one in the queue comes up. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { cam, me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { setPadGrab } from '../../player/controls.ts';
import { glyph } from '../../player/glyphs.ts';
import type { Avatar } from '../../player/avatars.ts';
import { emit } from '../../render/particles.ts';
import { camera, scene } from '../../render/scene.ts';
import { fanfare, pop } from '../minis/common.ts';
import { softGlow } from './look.ts';

export type Got = {
  /** As it reads after "You got": "the multi-axe", "a pack frame". */
  name: string;
  line?: string;
  color?: string;
  model: THREE.Object3D;
  /** Where it rises from (an opened crate); over your head when missing. */
  from?: THREE.Vector3;
  done?: () => void;
};

const queue: Got[] = [];
let cur: (Got & { t: number; start: THREE.Vector3 }) | null = null;
export const gettingItem = () => !!cur || queue.length > 0;

const RISE_S = 0.45;
const MIN_S = 0.6; // a press that started it can't also put it away
const SIZE = 0.95; // m across, whatever it is

const holder = new THREE.Group();
holder.visible = false;
const haloGlow = softGlow('#fff2b8', 0.35);
const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), haloGlow.mat);
const raysGlow = softGlow('#ffe08a', 0.4, 'up');
const rays = new THREE.Group();
const rayGeo = new THREE.PlaneGeometry(0.12, 1.5).translate(0, 0.75, 0);
for (let k = 0; k < 8; k++) {
  const r = new THREE.Mesh(rayGeo, raysGlow.mat);
  r.rotation.z = (k / 8) * Math.PI * 2;
  rays.add(r);
}
const spin = new THREE.Group();
holder.add(halo, rays, spin);
scene.add(holder);

const box = document.createElement('div');
box.className = 'place-got';
box.hidden = true;
box.innerHTML = '<div class="place-got-text"><b></b><span></span></div><div class="place-got-hint"></div>';
const title = box.querySelector('b')!,
  sub = box.querySelector('span')!,
  hint = box.querySelector<HTMLElement>('.place-got-hint')!;
(document.querySelector('.hud') ?? document.body).append(box);

/** Hold it up: now, or after whatever's up already. */
export function youGot(g: Got) {
  queue.push(g);
  if (!cur) next();
}

function next() {
  const g = queue.shift();
  if (!g) return;
  cur = { ...g, t: 0, start: new THREE.Vector3() };
  spin.clear();
  const fit = new THREE.Box3().setFromObject(g.model).getSize(new THREE.Vector3());
  g.model.scale.multiplyScalar(SIZE / Math.max(fit.x, fit.y, fit.z, 0.01));
  const mid = new THREE.Box3().setFromObject(g.model).getCenter(new THREE.Vector3());
  g.model.position.sub(mid);
  spin.add(g.model);
  overHead(cur.start);
  if (g.from) cur.start.copy(g.from);
  holder.position.copy(cur.start);
  holder.visible = true;
  document.body.classList.add('place-getting');
  inputState.held = true;
  me.charging = false;
  me.yaw = cam.yaw + Math.PI; // turned to face you
  setAloft(true);
  setPadGrab(press, ['a', 'b', 'x', 'rt'], { stick: true });
  title.textContent = `You got ${g.name.charAt(0).toLowerCase()}${g.name.slice(1)}!`;
  title.style.color = g.color ?? '';
  sub.textContent = g.line ?? '';
  sub.hidden = !g.line;
  hint.innerHTML = '';
  box.hidden = false;
  box.classList.remove('on');
  void box.offsetWidth; // so the pop-in runs again
  box.classList.add('on');
  fanfare(true);
}

function putAway() {
  if (!cur) return;
  const g = cur;
  cur = null;
  holder.visible = false;
  box.hidden = true;
  document.body.classList.remove('place-getting');
  setAloft(false);
  inputState.held = false;
  setPadGrab(null);
  sparkles(holder.position, 24, 3.4);
  pop(7, 0.7);
  g.done?.();
  next();
}

/** Start over: whatever's up or waiting goes, with nothing handed over. */
export function dropGot() {
  queue.length = 0;
  if (!cur) return;
  cur.done = undefined;
  putAway();
}

/** Interact, Jump, Back, a click or a tap: put it away, once it's been up long enough to read. */
export function press() {
  if (cur && cur.t >= MIN_S) putAway();
}

function setAloft(on: boolean) {
  const a = me.avatar as Avatar | null;
  if (a) a.userData.aloft = on;
}

function overHead(out: THREE.Vector3) {
  const b = me.body;
  if (b) out.set(b.interpolatedPosition.x, b.interpolatedPosition.y + 1.72, b.interpolatedPosition.z);
  return out;
}

const gold = new THREE.Color('#ffd76a');
function sparkles(at: THREE.Vector3, n: number, sp: number) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 1.4 - 0.2;
    emit({
      x: at.x,
      y: at.y,
      z: at.z,
      vx: Math.cos(a) * sp,
      vy: u * sp,
      vz: Math.sin(a) * sp,
      life: 0.6 + Math.random() * 0.5,
      size: 0.12 + Math.random() * 0.08,
      color: gold,
      gravity: 3,
      drag: 1.2,
      shrink: 0.5,
    });
  }
}

const top = new THREE.Vector3();
export function updateGot(dt: number) {
  if (!cur) return;
  const u = (cur.t += dt);
  overHead(top);
  const rise = Math.min(1, u / RISE_S),
    ease = 1 - (1 - rise) ** 3;
  holder.position.lerpVectors(cur.start, top, ease);
  holder.position.y += Math.sin(u * 2.2) * 0.06 * rise;
  spin.rotation.y = u * 1.7;
  spin.scale.setScalar(0.4 + 0.6 * ease);
  // Turned towards the view, so the rays fan out around it.
  rays.quaternion.copy(camera.quaternion);
  rays.rotation.z += u * 0.5;
  haloGlow.strength.value = 0.3 + Math.sin(u * 5) * 0.06;
  raysGlow.strength.value = 0.35 * ease;
  if (Math.floor(u * 6) !== Math.floor((u - dt) * 6)) sparkles(holder.position, 3, 1.6);
  if (u >= MIN_S && !hint.innerHTML) hint.innerHTML = `${glyph('interact')}<i>▼</i>`;
}

// Capture phase on window, before the game's own handlers: the keys that answer a text box put it away and go no further.
const KEYS = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter', 'Escape']);
addEventListener(
  'keydown',
  (e) => {
    if (!cur || !KEYS.has(e.code)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) press();
  },
  { capture: true },
);
// A click or a tap anywhere: it doesn't also chop, throw or press a touch button.
addEventListener(
  'pointerdown',
  (e) => {
    if (!cur) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    press();
  },
  { capture: true },
);
addEventListener('mousedown', (e) => cur && e.stopImmediatePropagation(), { capture: true });
