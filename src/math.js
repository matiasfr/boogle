import * as THREE from 'three';

export { clamp, lerp, smoothstep, hash2, valueNoise, fbm } from './math-pure.js';
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export const finiteArr = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);

export function angleLerp(a, b, t) {
  const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

export { mulberry32 } from './sim/rng.js';

export function srgbVec(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function sanitizeName(s) {
  return String(s ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}
