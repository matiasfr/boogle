// Local contact recipes over the shared pool. Shapes, colours and envelopes are ours; no physics bodies.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../constants.ts';
import { emit, type Particle } from './particles.ts';

/** Small typed authoring surface; visual-only, never saved or sent to another player. */
const particleEffects = {
  dustAlpha: 0.36,
  chipSize: 0.22,
  chipGravity: 12,
  landingMaxHeight: 4,
};
const timber = [new THREE.Color('#e5b77c'), new THREE.Color('#bb793e'), new THREE.Color('#f2d2a0')];
const stone = new THREE.Color('#9caaa9');
const dust = new THREE.Color('#cdbb9a'),
  dustMid = new THREE.Color('#d8cbb1'),
  dustEnd = new THREE.Color('#e0d8c5');
// Reused birth records: emit copies scalars synchronously, so bursts allocate no arrays, vectors or colours.
const chip: Particle = {
  x: 0,
  y: 0,
  z: 0,
  life: 1,
  size: 0.2,
  color: timber[0]!,
  shape: 'chip',
  gravity: 12,
  drag: 0.7,
  bounce: 0.18,
  fade: 0.22,
  sizeCurve: [0.8, 1, 0.85],
};
const puff: Particle = {
  x: 0,
  y: 0,
  z: 0,
  life: 0.8,
  size: 0.5,
  color: dust,
  shape: 'dust',
  alpha: 0.3,
  drag: 3,
  sizeCurve: [0.5, 2.2, 2.8],
  alphaCurve: [0.35, 0.9, 0],
  colorCurve: [dust, dustMid, dustEnd],
};
export function chips(x: number, y: number, z: number, n = 10, floor = y - 1.1, yaw?: number, rock = false, scale = 1) {
  if (reducedMotion) return;
  n = Math.min(36, n);
  chip.x = x;
  chip.y = y;
  chip.z = z;
  chip.floor = floor + 0.025;
  chip.gravity = particleEffects.chipGravity;
  for (let k = 0; k < n; k++) {
    const a = yaw === undefined ? Math.random() * Math.PI * 2 : yaw + (Math.random() - 0.5) * 2.5;
    const speed = (1.5 + Math.random() * 2.5) * Math.sqrt(scale);
    chip.vx = Math.sin(a) * speed;
    chip.vz = Math.cos(a) * speed;
    chip.vy = (1.5 + Math.random() * 2) * Math.sqrt(scale);
    chip.life = 0.85 + Math.random() * 0.35;
    chip.size = particleEffects.chipSize * (0.7 + Math.random() * 0.6) * scale;
    chip.color = rock ? stone : timber[k % timber.length]!;
    chip.shape = rock ? 'quad' : 'chip';
    chip.rotation = Math.random() * Math.PI * 2;
    chip.spin = (k % 2 ? 1 : -1) * (5 + Math.random() * 9);
    emit(chip);
  }
}

/** Low-alpha lobes, not a smoke wall. Dust keeps intensity one under the existing exposure policy. */
export function dustRing(
  x: number,
  y: number,
  z: number,
  n = 10,
  speed = 2.2,
  size = 0.3,
  intensity = 1,
  life = 1,
) {
  if (reducedMotion) return;
  n = Math.min(40, n);
  puff.alpha = particleEffects.dustAlpha;
  puff.intensity = intensity; // celebratory rings pass readableIntensity(); every other caller keeps one
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.3;
    const sp = speed * (0.5 + Math.random() * 0.4);
    puff.x = x + Math.cos(a) * 0.18;
    puff.y = y + size * 0.5 + 0.06;
    puff.z = z + Math.sin(a) * 0.18;
    puff.vx = Math.cos(a) * sp;
    puff.vz = Math.sin(a) * sp;
    puff.vy = 0.2 + Math.random() * 0.25;
    puff.life = (0.65 + Math.random() * 0.25) * life;
    puff.size = size * (2.2 + Math.random() * 0.5);
    puff.rotation = Math.random() * Math.PI * 2;
    puff.spin = (Math.random() - 0.5) * 0.7;
    emit(puff);
  }
}

/** Same measured apex-to-contact height as the landing sound; no velocity guess or new landing detector. */
export function landingDust(x: number, y: number, z: number, height: number) {
  const weight = Math.min(1, Math.max(0, height) / particleEffects.landingMaxHeight);
  dustRing(x, y, z, 4 + Math.round(weight * 8), 0.8 + weight * 1.6, 0.2 + weight * 0.35);
}
