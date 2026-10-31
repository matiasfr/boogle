export { clamp, lerp, smoothstep, hash2, valueNoise, fbm } from './math-pure.js';
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export const finiteArr = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);

export function angleLerp(a, b, t) {
  const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

export { mulberry32 } from './sim/rng.ts';

export { cleanName as sanitizeName } from './sim/roster.ts'; // one name rule, also the roster's (lockstep)
