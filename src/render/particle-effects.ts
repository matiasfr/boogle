// Local contact recipes over the shared pool. Shapes, colours and envelopes are ours; no physics bodies.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../constants.ts';
import { emit, type Particle } from './particles.ts';

/** Small typed authoring surface; visual-only, never saved or sent to another player. */
const particleEffects = {
  dustAlpha: 0.36,
  contactAlpha: 0.62,
  contactMaxHeight: 4,
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
// Separate birth record: heavy contacts must not retune footsteps, wake steam or construction rings.
const billow: Particle = {
  ...puff,
  intensity: 1,
  drag: 2.4,
  gravity: 0.9,
  sizeCurve: [0.8, 1.9, 2.4],
  alphaCurve: [0.7, 1, 0],
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
export function dustRing(x: number, y: number, z: number, n = 10, speed = 2.2, size = 0.3, intensity = 1) {
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
    puff.life = 0.65 + Math.random() * 0.25;
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

const contactWeight = (height: number) => Math.min(1, Math.max(0, height) / particleEffects.contactMaxHeight);

/** Outward momentum damps while gravity returns the low lobes to their contact plane. */
function contactBillow(x: number, y: number, z: number, weight: number, n: number, direction?: number) {
  billow.alpha = particleEffects.contactAlpha * (direction === undefined ? 1 : 0.85);
  billow.floor = y + 0.025;
  for (let k = 0; k < n; k++) {
    const a = direction === undefined ? (k / n) * Math.PI * 2 : direction + (Math.random() - 0.5) * 1.3;
    const speed = (1.6 + weight * 2.2) * (0.8 + Math.random() * 0.4);
    // Wide, staggered beam lobes overlap between sites instead of making a dotted line.
    const along = direction === undefined ? 0 : (Math.random() - 0.5) * 0.9;
    billow.x = x + Math.cos(a) * 0.18 + Math.sin(a) * along;
    billow.y = y + 0.24 + Math.random() * 0.12;
    billow.z = z + Math.sin(a) * 0.18 - Math.cos(a) * along;
    billow.vx = Math.cos(a) * speed;
    billow.vz = Math.sin(a) * speed;
    billow.vy = 0.35 + Math.random() * 0.2;
    billow.life = 1.05 + weight * 0.3 + Math.random() * 0.15;
    billow.size = (0.65 + weight * 0.45) * (0.85 + Math.random() * 0.3) * (direction === undefined ? 1 : 1.7);
    billow.rotation = Math.random() * Math.PI * 2;
    billow.spin = (k % 2 ? 1 : -1) * (0.35 + Math.random() * 0.45);
    emit(billow);
  }
}

/** A completed log flight or rock collapse, at the existing contact edge only. */
export function impactDust(x: number, y: number, z: number, height: number, rock = false) {
  if (reducedMotion) return;
  const weight = contactWeight(height);
  contactBillow(x, y, z, weight, 10 + Math.round(weight * 10));
  // Rock strikes already throw fragments; only log deposits need the extra small splinters.
  if (!rock) chips(x, y + 0.18, z, 2, y, undefined, false, 0.65);
}

/** Seven contact sites on both sides, reaching the beam ends without burying births inside its footprint. */
export function cargoDust(x: number, y: number, z: number, yaw: number, beam: boolean, height: number) {
  if (reducedMotion) return;
  if (!beam) {
    dustRing(x, y, z, 12, 2.2, 0.5);
    return;
  }
  const weight = contactWeight(height);
  for (let k = -3; k <= 3; k++)
    for (let side = -1; side <= 1; side += 2) {
      const cx = x + Math.sin(yaw) * k * 1.5 + Math.cos(yaw) * side * 0.8;
      const cz = z + Math.cos(yaw) * k * 1.5 - Math.sin(yaw) * side * 0.8;
      contactBillow(cx, y, cz, weight, 3 + Math.round(weight * 3), -yaw + (side < 0 ? Math.PI : 0));
      if (k % 3 === 0) chips(cx, y + 0.2, cz, 1, y, undefined, false, 0.65);
    }
}
