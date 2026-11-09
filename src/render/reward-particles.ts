// The celebration a reward throws: gold sparkles, confetti and the bright ring of dust when a box opens. Reward colours
// are display-range ink, so every birth here folds readableIntensity() in once (readable-unlit.ts): callers never pass
// an intensity, and a reward built from these cannot come out at the scene's 0.12 surface gain. Local and cosmetic.
import * as THREE from 'three/webgpu';
import { emit, type Particle } from './particles.ts';
import { dustRing } from './particle-effects.ts';
import { readableIntensity } from './readable-unlit.ts';

const GOLD = new THREE.Color('#ffd76a');
const IVORY = new THREE.Color('#fff4dc');
const ABILITY_TINTS: Readonly<Record<string, THREE.Color>> = {
  hook: new THREE.Color('#428bff'),
  jump: new THREE.Color('#ac72ff'),
  pack: new THREE.Color('#ff9466'),
  axe: GOLD,
  multi: GOLD,
  'multi-axe': GOLD,
};
export const acquisitionTint = (key?: string) => (key ? ABILITY_TINTS[key] : undefined);
const mote: Particle = { x: 0, y: 0, z: 0, life: 0.4, size: 0.18, color: GOLD };

/** Bounded Local births over the same pool as the second jump's axe glints. No persistent emitter or new draw. */
export function acquisitionMotes(at: THREE.Vector3, tint: THREE.Color, kind: 'gather' | 'burst' | 'settle', n: number) {
  const gather = kind === 'gather',
    burst = kind === 'burst';
  Object.assign(mote, {
    intensity: readableIntensity(),
    gravity: 0,
    drag: burst ? 2 : 0,
    shape: 'glint',
    alphaCurve: [0.7, 1, 0],
    sizeCurve: [0.55, 1, 0.2],
    spin: 1.5,
  });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.2;
    const radius = gather ? 1.1 + Math.random() * 0.6 : burst ? 0.35 : 0.3 + Math.random() * 0.3;
    const dx = Math.cos(a) * radius,
      dz = Math.sin(a) * radius,
      dy = burst ? (Math.random() - 0.5) * 0.2 : (Math.random() - 0.3) * 0.9;
    mote.x = at.x + dx;
    mote.y = at.y + dy;
    mote.z = at.z + dz;
    mote.life = gather ? 0.4 : burst ? 0.45 : 0.28;
    mote.vx = burst ? Math.cos(a) * 3.2 : -dx / mote.life;
    mote.vy = burst ? (i % 2 ? 0.6 : -0.3) : -dy / mote.life;
    mote.vz = burst ? Math.sin(a) * 3.2 : -dz / mote.life;
    mote.size = (burst ? 0.19 : 0.13) + Math.random() * 0.07;
    mote.color = i % 4 === 0 ? IVORY : tint;
    mote.rotation = a;
    emit(mote);
  }
}
export const CONFETTI = ['#ff4f4f', '#ffcf33', '#2f8cff', '#4fdc7a', '#ff7ad9', '#ffffff'].map((c) => new THREE.Color(c));
// One reused birth record: emit copies its scalars synchronously, so bursts allocate nothing.
const spark: Particle = { x: 0, y: 0, z: 0, life: 1, size: 0.2, color: GOLD };

export type SparkleLook = {
  color?: THREE.Color;
  /** Seconds: life + up to lifeJitter. */
  life?: number;
  lifeJitter?: number;
  /** Metres: size + up to sizeJitter. */
  size?: number;
  sizeJitter?: number;
  gravity?: number;
  drag?: number;
};

/** Gold sparkles bursting from a point at `speed` m/s, mostly outwards and up. Defaults are the reward box's. */
export function rewardSparkles(x: number, y: number, z: number, n: number, speed: number, look: SparkleLook = {}) {
  const { color = GOLD, life = 0.7, lifeJitter = 0.6, size = 0.16, sizeJitter = 0.1, gravity = 5, drag = 1 } = look;
  Object.assign(spark, { x, y, z, color, gravity, drag, shrink: 0.5, intensity: readableIntensity() });
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      u = Math.random() * 1.4 - 0.2;
    spark.vx = Math.cos(a) * speed;
    spark.vy = u * speed;
    spark.vz = Math.sin(a) * speed;
    spark.life = life + Math.random() * lifeJitter;
    spark.size = size + Math.random() * sizeJitter;
    emit(spark);
  }
}

/** A box's confetti: 110 pieces thrown up and out from a point. */
export function confettiBurst(x: number, y: number, z: number) {
  Object.assign(spark, { x, y, z, gravity: 8, drag: 1.5, shrink: 0.3, intensity: readableIntensity() });
  for (let k = 0; k < 110; k++) {
    const a = Math.random() * Math.PI * 2,
      s = 1.5 + Math.random() * 5;
    spark.vx = Math.cos(a) * s;
    spark.vy = 6 + Math.random() * 8;
    spark.vz = Math.sin(a) * s;
    spark.life = 1.6 + Math.random();
    spark.size = 0.17 + Math.random() * 0.13;
    spark.color = CONFETTI[k % CONFETTI.length]!;
    emit(spark);
  }
}

/** The ring of dust a box throws as it opens: bright with the confetti, not the grey-brown contact dust. A box
 * landing is an ordinary contact and keeps dustRing's own intensity. */
export function rewardDust(x: number, y: number, z: number, n = 12, speed = 3.2, size = 0.45) {
  dustRing(x, y, z, n, speed, size, readableIntensity() * 0.5);
}
