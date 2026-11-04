// The existing fork signs, material boards and HUD counters (logs, kilometres, town, money). Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { flat } from '../flat.ts';
import { H, addStatic } from './land.ts';
import { toWorld } from './layout.ts';
import { pauseSections } from '../../player/pause-pages.ts';

// ---------------------------------------------------------------- boards you can read
const PAPER = '#fff3d6',
  INK = '#2a1c10';
export function paintBoard(lines: { t: string; px: number; color?: string }[], w: number, h: number) {
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
  lines: Parameters<typeof paintBoard>[0],
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
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paintBoard(lines, w, h));
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
  // Only the fork at your feet: the owner found the big sign heavy-handed, and the bold path does the rest.
  sign(-104, 1, -98, 9, 2.4, 0.8, 1.0, [{ t: '↑ TIMBER CAMP', px: 130 }]);
  sign(-104.5, 18, -98, 9, 2.4, 0.8, 1.0, [{ t: 'QUARRY, LATER ↓', px: 110 }]);
}

// ---------------------------------------------------------------- the HUD
const nums = document.createElement('div');
nums.className = 'place-nums';
pauseSections.push(nums);
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
