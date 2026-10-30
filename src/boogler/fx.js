// Cosmetic Boogler effects: hearts floating off his head and the orb he puffs up to launch riders. Local only, so
// Math.random is fine here.
import * as THREE from 'three';
import { scene } from '../render/scene.js';
import { reducedMotion } from '../constants.js';
import { boogler, booglerReact, PUFF_MS } from './boogler.js';

function heartTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const heart = () => {
    g.beginPath();
    g.moveTo(32, 54);
    g.bezierCurveTo(6, 36, 4, 14, 20, 10);
    g.bezierCurveTo(28, 8, 32, 14, 32, 18);
    g.bezierCurveTo(32, 14, 36, 8, 44, 10);
    g.bezierCurveTo(60, 14, 58, 36, 32, 54);
    g.closePath();
  };
  heart();
  g.lineWidth = 7;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = '#ff4f8b';
  heart();
  g.fill();
  g.fillStyle = 'rgba(255, 255, 255, 0.55)';
  g.beginPath();
  g.ellipse(22, 20, 5, 3.5, -0.6, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const MAX_HEARTS = 64;
const heartTex = heartTexture();
const hearts = [];
for (let k = 0; k < MAX_HEARTS; k++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
  s.visible = false;
  s.renderOrder = 11;
  scene.add(s);
  hearts.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 0.3, sway: 0, delay: 0 });
}

function spawnHeart(size, spread, speed, delay) {
  const h = hearts.find((x) => x.life <= 0 && x.delay <= 0);
  if (!h) return;
  const a = Math.random() * Math.PI * 2;
  const r = Math.random() * spread;
  h.s.position.set(boogler.center.x + Math.cos(a) * r, boogler.center.y + 0.35, boogler.center.z + Math.sin(a) * r);
  h.vx = Math.cos(a) * r * 0.8;
  h.vz = Math.sin(a) * r * 0.8;
  h.vy = speed * (0.75 + Math.random() * 0.5);
  h.max = h.life = 1.3 + Math.random() * 0.7;
  h.size = size * (0.7 + Math.random() * 0.6);
  h.sway = Math.random() * Math.PI * 2;
  h.delay = delay;
  h.s.visible = false;
}

// 'pet': a couple of small hearts. 'level': a big fountain for reaching a new friendship level.
export function booglerHearts(kind) {
  if (kind === 'level') {
    const n = reducedMotion ? 8 : 30;
    for (let k = 0; k < n; k++) spawnHeart(0.42, 0.9, 2.4, (k / n) * 1.1);
  } else for (let k = 0; k < 3; k++) spawnHeart(0.24, 0.4, 1.4, k * 0.12);
}

// ---------------------------------------------------------------- the launch orb
const orb = new THREE.Mesh(
  new THREE.SphereGeometry(1, 28, 16),
  new THREE.MeshStandardMaterial({
    color: '#d9c8ff',
    emissive: '#8f6bff',
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }),
);
orb.visible = false;
orb.renderOrder = 9;
scene.add(orb);

const POP_N = 18;
const popGeo = new THREE.SphereGeometry(0.09, 8, 6);
const popMat = new THREE.MeshStandardMaterial({ color: '#efe6ff', emissive: '#b99cff', emissiveIntensity: 0.4 });
const pops = Array.from({ length: POP_N }, () => {
  const m = new THREE.Mesh(popGeo, popMat);
  m.visible = false;
  scene.add(m);
  return { m, v: new THREE.Vector3(), life: 0 };
});

let puffAt = -1e9;
let popped = true;

// He swells, an orb grows on his head, and at PUFF_MS it pops. The rider's launch is in src/boogler/play.js.
export function booglerPuff(now = performance.now()) {
  puffAt = now;
  popped = false;
  booglerReact('puff', now);
}

function pop() {
  popped = true;
  orb.visible = false;
  for (const p of pops) {
    const a = Math.random() * Math.PI * 2,
      up = Math.random() * 0.8 + 0.2;
    p.m.position.copy(orb.position);
    p.v.set(Math.cos(a) * 4, up * 4, Math.sin(a) * 4);
    p.life = 0.45 + Math.random() * 0.2;
    p.m.visible = true;
  }
}

export function updateBooglerFx(dt, now) {
  for (const h of hearts) {
    if (h.delay > 0) {
      h.delay -= dt;
      if (h.delay <= 0) h.s.visible = true;
      continue;
    }
    if (h.life <= 0) continue;
    h.life -= dt;
    if (h.life <= 0) {
      h.s.visible = false;
      continue;
    }
    h.sway += dt * 4;
    h.vy *= Math.exp(-dt * 0.8);
    h.s.position.x += (h.vx + Math.cos(h.sway) * 0.35) * dt;
    h.s.position.y += h.vy * dt;
    h.s.position.z += h.vz * dt;
    const age = 1 - h.life / h.max;
    const pop = Math.min(1, age * 8);
    h.s.scale.setScalar(h.size * (0.4 + 0.6 * pop) * (age > 0.15 ? 1 : 1 + (0.15 - age) * 3));
    h.s.material.opacity = Math.min(1, (h.life / h.max) * 2.5);
  }

  if (!popped) {
    const u = (now - puffAt) / PUFF_MS;
    if (u >= 1) pop();
    else {
      const r = 0.15 + 1.05 * u * u;
      orb.visible = true;
      orb.position.set(boogler.center.x, boogler.center.y + 0.35 + r * 0.6, boogler.center.z);
      const wob = reducedMotion ? 0 : Math.sin(now / 35) * 0.04;
      orb.scale.set(r * (1 + wob), r * (1 - wob), r * (1 + wob));
    }
  }
  for (const p of pops) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.v.y -= 9 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.scale.setScalar(Math.max(0.01, p.life * 2));
    if (p.life <= 0) p.m.visible = false;
  }
}
