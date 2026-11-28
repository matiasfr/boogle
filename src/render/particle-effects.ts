// Local contact recipes over the shared pool. Shapes, colours and envelopes are ours; no physics bodies.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../constants.ts';
import { emit, type Particle } from './particles.ts';
import { readableIntensity } from './readable-unlit.ts';
import { camera, hemi, sun } from './scene.ts';

/** Small typed authoring surface; visual-only, never saved or sent to another player. */
const particleEffects = {
  dustAlpha: 0.36,
  chipSize: 0.22,
  chipGravity: 12,
  landingMaxHeight: 4,
};
const timber = [new THREE.Color('#e5b77c'), new THREE.Color('#bb793e'), new THREE.Color('#f2d2a0')];
const stone = new THREE.Color('#9caaa9');
const steamAlbedo = new THREE.Color('#eee8dc');
const skyFill = new THREE.Color();
const steam: Particle = {
  x: 0,
  y: 0,
  z: 0,
  color: new THREE.Color(),
  shape: 'puff',
  size: 0.6,
  life: 3,
  vy: 1.6,
  drag: 0.18,
  alpha: 0.7,
  sizeCurve: [0.65, 1.65, 2.15],
  alphaCurve: [0.85, 0.75, 0],
};

/** A round breath from an existing stack. The pool copies this record at birth. */
export function stackPuff(x: number, y: number, z: number, size: number) {
  if (
    reducedMotion ||
    (x - camera.position.x) ** 2 + (y - camera.position.y) ** 2 + (z - camera.position.z) ** 2 > 90 ** 2
  )
    return;
  steam.x = x;
  steam.y = y;
  steam.z = z;
  // The sprite pool blends scene-linear radiance. Light this scattering volume at birth,
  // as for the water's diffuse surface, before the shared exposure and tone mapping.
  skyFill.copy(hemi.color).multiplyScalar(hemi.intensity / Math.PI);
  steam.color.copy(sun.color).multiplyScalar(sun.intensity / Math.PI).add(skyFill).multiply(steamAlbedo);
  steam.size = size * (1.25 + Math.random() * 0.45);
  steam.rotation = Math.random() * Math.PI * 2;
  steam.vz = (Math.random() - 0.5) * 0.36;
  steam.vy = 1.45 + Math.random() * 0.4;
  emit(steam);
}
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
export function chips(
  x: number,
  y: number,
  z: number,
  n = 10,
  floor = y - 1.1,
  yaw?: number,
  rock = false,
  scale = 1,
  palette: readonly THREE.Color[] = timber,
) {
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
    chip.color = rock ? stone : palette[k % palette.length]!;
    chip.shape = rock ? 'quad' : 'chip';
    chip.rotation = Math.random() * Math.PI * 2;
    chip.spin = (k % 2 ? 1 : -1) * (5 + Math.random() * 9);
    emit(chip);
  }
}

// Fresh-cut wood, the colour of a felling notch's faces, with one bark flake in four.
const freshWood = [
  new THREE.Color('#f0d7a4'),
  new THREE.Color('#e3c48b'),
  new THREE.Color('#f6e2b8'),
  new THREE.Color('#7a5430'),
];
/**
 * A chop's chips, pale like the cut they came out of and as bright as authored (readable intensity, not the dimmer
 * default that suits dust). The first `settle` fly short and low towards `yaw` (out of the cut), land on `floor`, lie
 * still and fade over a few seconds; the rest fly and are gone as they land.
 */
export function woodChips(x: number, y: number, z: number, n: number, floor: number, settle: number, yaw: number) {
  if (reducedMotion) return;
  chip.intensity = readableIntensity();
  chips(x, y, z, n - settle, floor, undefined, false, 1, freshWood);
  chip.floor = floor + 0.025;
  for (let k = 0; k < settle; k++) {
    const a = yaw + (Math.random() - 0.5) * 2.4,
      speed = 1.3 + Math.random() * 1.1;
    chip.vx = Math.sin(a) * speed;
    chip.vz = Math.cos(a) * speed;
    chip.vy = 0.8 + Math.random();
    chip.life = 4 + Math.random() * 2;
    chip.fade = 0.35;
    chip.settle = true;
    chip.size = particleEffects.chipSize * (0.8 + Math.random() * 0.4);
    chip.color = freshWood[k % 3]!; // wood, not the bark flake
    chip.rotation = Math.random() * Math.PI * 2;
    chip.spin = (k % 2 ? 1 : -1) * (5 + Math.random() * 9);
    emit(chip);
  }
  chip.fade = 0.22;
  chip.settle = false;
  chip.intensity = 1;
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
