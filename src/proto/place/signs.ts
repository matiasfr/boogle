// What tells you what to do in ?proto=place: the big sign at spawn, signposts along the way, a beacon over the next thing,
// one line of objective on the HUD and the shared numbers (the train's capacity, the town's people). The owner, on the
// last test: "I didn't know what to do". More directed than Death Stranding: you always know the next thing. The crowd is
// here too: little people who jump when the first line comes in. Local.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { flat } from '../flat.ts';
import { replay } from '../../ui/ui-sound.ts';
import { H, PATH_SAMPLES, addStatic } from './land.ts';
import { ORIGIN, toWorld } from './layout.ts';

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
  // At spawn: what, where, why.
  sign(-99.5, -3, -97, 14, 9, 4.4, 1.4, [
    { t: 'THE TRACK LAYER IS STRANDED', px: 96 },
    { t: 'AT THE TIMBER CAMP, ACROSS THE GORGE.', px: 74 },
    { t: 'FOLLOW THE PATH AND WAKE IT.', px: 96, color: '#c4501a' },
    { t: 'THEN BUILD THE LINE HOME.', px: 74 },
  ]);
  // The fork at your feet, and the turns where you could lose it.
  sign(-101.5, 8, -97, 16, 3.2, 1, 1.0, [{ t: '↑ TIMBER CAMP', px: 130 }]);
  sign(-103, 20, -97, 14, 3.2, 1, 1.0, [{ t: 'QUARRY, LATER ↓', px: 110 }]);
  sign(-127, -62, -142, -70, 3.2, 1, 1.2, [{ t: 'TIMBER CAMP', px: 130 }]);
  sign(-117, -111, -130, -125, 3.2, 1, 1.2, [{ t: 'TO THE BRIDGE', px: 120 }]);
  sign(-68, -128, -61, -121, 3.2, 1, 1.2, [{ t: 'TIMBER CAMP', px: 130 }]);
  sign(-72, -172, -61, -147, 3.2, 1, 1.2, [{ t: 'ALMOST THERE', px: 120 }]);
  // Little orange arrows every so often on the way to the camp, so you can't doubt it.
  const path = PATH_SAMPLES[0]!;
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), flat('#f4f1e8'), 40);
  const heads = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.7, 4).rotateX(-Math.PI / 2), flat('#f0752c'), 40);
  posts.frustumCulled = heads.frustumCulled = false;
  const o = new THREE.Object3D();
  let n = 0;
  for (let k = 26; k < path.length - 10 && n < 40; k += 26) {
    const q = path[k]!,
      r = path[k + 4]!;
    const dx = r[0] - q[0],
      dz = r[1] - q[1],
      len = Math.hypot(dx, dz) || 1;
    if (q[2] < 3) continue;
    const x = q[0] + ORIGIN.x - (dz / len) * 4.2,
      z = q[1] + (dx / len) * 4.2,
      y = H(x, z);
    o.rotation.set(0, 0, 0);
    o.position.set(x, y + 0.65, z);
    o.updateMatrix();
    posts.setMatrixAt(n, o.matrix);
    o.position.y = y + 1.45;
    o.rotation.y = Math.atan2(dx, dz);
    o.updateMatrix();
    heads.setMatrixAt(n++, o.matrix);
  }
  posts.count = heads.count = n;
  scene.add(posts, heads);
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
  lastObj = text;
  obj.textContent = text;
  replay(obj, 'place-pop');
}
let lastNums = '';
export function setNumbers(train: number | null, people: number) {
  const s = `${train === null ? '' : `<span>Train holds <b>${train}</b> crates</span>`}<span>Village <b>${people}</b> people</span>`;
  if (s === lastNums) return;
  lastNums = s;
  nums.innerHTML = s;
}

// ---------------------------------------------------------------- little people
const CROWD = 14;
const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 0.5, 2, 6), flat('#e9a14a'), CROWD);
const headM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 7, 6), flat('#f4d0a8'), CROWD);
const COLORS = ['#e05a4a', '#4a8ae0', '#e0c04a', '#58b56b', '#b46ae0'].map((c) => new THREE.Color(c));
const crowd = Array.from({ length: CROWD }, (_, k) => {
  const a = (k / CROWD) * Math.PI * 2;
  // around the platform and the yard
  const x = toWorld(-72 + Math.cos(a) * 9 + ((k * 7) % 5)),
    z = 10 + Math.sin(a) * 7 + ((k * 3) % 4);
  return { x, z, y: H(x, z), phase: k * 1.3 };
});
body.frustumCulled = headM.frustumCulled = false;
body.castShadow = headM.castShadow = true;
crowd.forEach((_, k) => body.setColorAt(k, COLORS[k % COLORS.length]!));
scene.add(body, headM);
const pm = new THREE.Matrix4();
let cheer = 0;
export const cheerNow = (s = 9) => void (cheer = s);
function drawCrowd(now: number) {
  crowd.forEach((p, k) => {
    const hop = cheer > 0 ? Math.abs(Math.sin(now * 0.008 + p.phase)) * 1 : 0;
    body.setMatrixAt(k, pm.makeTranslation(p.x, p.y + 0.55 + hop, p.z));
    headM.setMatrixAt(k, pm.makeTranslation(p.x, p.y + 1.25 + hop, p.z));
  });
  body.instanceMatrix.needsUpdate = headM.instanceMatrix.needsUpdate = true;
}
drawCrowd(0);
export function updateCrowd(dt: number, now: number) {
  if (cheer <= 0) return;
  cheer -= dt;
  drawCrowd(now);
  if (cheer <= 0) drawCrowd(0);
}
