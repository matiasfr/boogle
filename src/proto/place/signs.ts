// What tells you what to do in ?proto=place: a signpost at the fork, a beacon over the next thing, one line of objective on
// the HUD and the numbers (logs, kilometres, town, money). "A small prompt is direction enough" (the
// owner, 2 November): no big sign. Local.
import { playObjective } from '../mark.ts';
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { flat } from '../flat.ts';
import { replay } from '../../ui/ui-sound.ts';
import { cam, me } from '../../player/player.ts';
import { H, addStatic } from './land.ts';
import { toWorld } from './layout.ts';

// ---------------------------------------------------------------- boards you can read
const PAPER = '#fff3d6',
  INK = '#2a1c10';
function board(lines: { t: string; px: number; color?: string }[], w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = INK;
  g.lineWidth = 16;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const total = lines.reduce((t, l) => t + l.px * 1.22, 0);
  let y = (c.height - total) / 2;
  for (const l of lines) {
    g.font = `900 ${l.px}px Figtree, system-ui, sans-serif`;
    g.fillStyle = l.color ?? INK;
    g.fillText(l.t, c.width / 2, y + (l.px * 1.22) / 2, c.width - 60);
    y += l.px * 1.22;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.MeshBasicNodeMaterial({ map: tex });
}
/** A board on two posts, facing (fx, fz) in local map coordinates. */
export function sign(
  x: number,
  z: number,
  fx: number,
  fz: number,
  w: number,
  h: number,
  up: number,
  lines: Parameters<typeof board>[0],
) {
  const wx = toWorld(x),
    y = H(wx, z),
    yaw = Math.atan2(fx - x, fz - z);
  const g = new THREE.Group();
  g.position.set(wx, y, z);
  g.rotation.y = yaw;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.2), flat('#7f5630'));
  back.position.y = up + h / 2;
  back.castShadow = true;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), board(lines, w, h));
  front.position.set(0, up + h / 2, 0.11);
  g.add(back, front);
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, up + 0.2, 0.3), flat('#7f5630'));
    post.position.set(dx, (up + 0.2) / 2, 0);
    post.castShadow = true;
    g.add(post);
  }
  scene.add(g);
  const cos = Math.cos(yaw),
    sin = Math.sin(yaw);
  const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  addStatic({ kind: 'box', hx: w / 2, hy: h / 2, hz: 0.15 }, { x: wx, y: y + up + h / 2, z }, q);
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3])
    addStatic({ kind: 'box', hx: 0.15, hy: up / 2, hz: 0.15 }, { x: wx + cos * dx, y: y + up / 2, z: z - sin * dx }, q);
  return g;
}
export function buildSigns() {
  // Only the fork at your feet: the owner found the big sign heavy-handed, and the bold path and the objective do the rest.
  sign(-104, 1, -98, 9, 2.4, 0.8, 1.0, [{ t: '↑ TIMBER CAMP', px: 130 }]);
  sign(-104.5, 18, -98, 9, 2.4, 0.8, 1.0, [{ t: 'QUARRY, LATER ↓', px: 110 }]);
}

// ---------------------------------------------------------------- the beacon over the next thing
const beacon = new THREE.Group();
const beam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, 60, 6),
  new THREE.MeshStandardNodeMaterial({ color: '#ffa94a', emissive: '#ff8a1a', emissiveIntensity: 1.6 }),
);
beam.position.y = 34;
const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), beam.material);
gem.scale.set(1, 1.5, 1);
beacon.add(beam, gem);
beacon.visible = false;
scene.add(beacon);
/** The beacon stands over a world point; null hides it. */
export function setBeacon(at: { x: number; y: number; z: number } | null, now: number) {
  beacon.visible = !!at;
  if (!at) return;
  beacon.position.set(at.x, at.y + 3 + Math.sin(now * 0.004) * 0.25, at.z);
  gem.rotation.y = now * 0.002;
  // Far off, a hair's width and a speck wouldn't lead anyone: both grow with the distance, so they read across the place.
  const b = me.body?.position;
  const far = b ? Math.max(1, Math.hypot(b.x - at.x, b.z - at.z) / 60) : 1;
  beam.scale.set(far, 1, far);
  gem.scale.set(far, 1.5 * far, far);
}
export const beaconAt = () => (beacon.visible ? beacon.position : null);

// ---------------------------------------------------------------- the way back to it
// Only when you've turned away from where to go: a small chevron at the screen's edge turns you back. Local.
const arrow = document.createElement('div');
arrow.className = 'place-arrow';
(document.querySelector('.hud') ?? document.body).append(arrow);
const FACING = 0.62; // radians either side of straight ahead where you can see it for yourself
/** Points the chevron from where you stand towards `to`; null hides it. */
export function pointArrow(to: { x: number; z: number } | null) {
  const b = me.body?.position;
  if (!b || !to || !me.entered || Math.hypot(to.x - b.x, to.z - b.z) < 8) return void arrow.classList.remove('on');
  let a = cam.yaw - Math.atan2(-(to.x - b.x), -(to.z - b.z));
  a = Math.atan2(Math.sin(a), Math.cos(a));
  if (Math.abs(a) < FACING) return void arrow.classList.remove('on');
  arrow.classList.add('on');
  // Round the screen's edge, and no lower than the middle of the objective's row.
  const w = innerWidth / 2,
    h = innerHeight / 2,
    down = Math.cos(a) < 0 ? 0.55 : 1;
  const x = w + Math.sin(a) * (w - 64),
    y = h - Math.cos(a) * (h - 92) * down;
  arrow.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${a.toFixed(3)}rad)`;
}

// ---------------------------------------------------------------- the HUD
const obj = document.createElement('div');
obj.className = 'place-objective';
const nums = document.createElement('div');
nums.className = 'place-nums';
(document.querySelector('.hud') ?? document.body).append(obj, nums);
// It shows when it changes or when you seem unsure, then gets out of the way: the owner found it "always on", covering the
// game. The beacon and the chevron do the rest of the time. A number ticking over isn't news.
const OBJ = { showS: 5.5, unsureS: 16 };
let lastObj = '',
  objT = 0, // s it stays up
  stillT = 0; // s you've gone without moving or doing anything
export function setObjective(text: string) {
  if (text === lastObj) return;
  const news = text.replace(/\d+/g, '') !== lastObj.replace(/\d+/g, '');
  lastObj = text;
  obj.textContent = text;
  playObjective(text);
  if (news) showObjective();
}
/** Up it comes for a few seconds, with a little pop. */
export function showObjective() {
  if (!lastObj) return;
  if (objT <= 0) replay(obj, 'place-pop');
  objT = OBJ.showS;
  stillT = 0;
}
/** Each frame. `busy`: you're moving or something's happening, so you don't look unsure. */
export function updateObjective(dt: number, busy: boolean) {
  stillT = busy ? 0 : stillT + dt;
  if (stillT > OBJ.unsureS) showObjective();
  objT = Math.max(0, objT - dt);
  obj.classList.toggle('on', objT > 0 && !!lastObj);
}
// The numbers: logs, kilometres, town and a running money count, a comic score. They tick up one by one, so you can feel them.
const shownNum = { logs: 0, km: 0, people: 0, money: 0 };
let lastNums = '';
export function setNumbers(score: { money: number; logs: number; metres: number }, people: number) {
  const ease = (a: number, b: number, k: number) => (Math.abs(b - a) < 1 ? b : a + (b - a) * k);
  shownNum.logs = ease(shownNum.logs, score.logs, 0.2);
  shownNum.km = score.metres / 1000;
  shownNum.people = people;
  shownNum.money = ease(shownNum.money, score.money, 0.12);
  const s =
    `<span>Logs <b>${Math.round(shownNum.logs)}</b></span>` +
    `<span>Track <b>${shownNum.km.toFixed(2)}</b> km</span>` +
    `<span>Town <b>${shownNum.people}</b></span>` +
    `<span class="place-money"><b>$${Math.round(shownNum.money).toLocaleString('en-US')}</b></span>`;
  if (s === lastNums) return;
  lastNums = s;
  nums.innerHTML = s;
}
