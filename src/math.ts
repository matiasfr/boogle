export { clamp, lerp, smoothstep, hash2, valueNoise, fbm } from './math-pure.ts';
export const r2 = (v: number) => Math.round(v * 100) / 100;
export const r3 = (v: number) => Math.round(v * 1000) / 1000;
export const finiteArr = (a: unknown, n: number): a is number[] =>
  Array.isArray(a) && a.length === n && a.every((v) => Number.isFinite(v));

export function angleLerp(a: number, b: number, t: number) {
  const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

export { mulberry32 } from './sim/rng.ts';

export { cleanName as sanitizeName } from './sim/roster.ts'; // one name rule, also the roster's (lockstep)
