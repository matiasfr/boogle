// What tells you what to do in ?proto=place: a signpost at the fork, a beacon over the next thing, one line of objective on
// the HUD and the shared numbers (the train's capacity, the town's people). "A small prompt is direction enough" (the
// owner, 2 November): no big sign. Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { flat } from '../flat.ts';
import { replay } from '../../ui/ui-sound.ts';
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
}

// ---------------------------------------------------------------- the HUD
const obj = document.createElement('div');
obj.className = 'place-objective';
const nums = document.createElement('div');
nums.className = 'place-nums';
(document.querySelector('.hud') ?? document.body).append(obj, nums);
let lastObj = '';
export function setObjective(text: string) {
  if (text === lastObj) return;
  // A number ticking over (a count, a countdown) isn't news: only a new line pops.
  if (text.replace(/\d+/g, '') !== lastObj.replace(/\d+/g, '')) replay(obj, 'place-pop');
  lastObj = text;
  obj.textContent = text;
}
let lastNums = '';
export function setNumbers(train: number | null, people: number) {
  const s = `${train === null ? '' : `<span>Train holds <b>${train}</b> crates</span>`}<span>Village <b>${people}</b> people</span>`;
  if (s === lastNums) return;
  lastNums = s;
  nums.innerHTML = s;
}
