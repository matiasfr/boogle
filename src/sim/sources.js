// Material sources (brief 8 section 1): things on the island that give the current age's material. Age 0 (wood): the
// home palms (`layout.trees`), shaken with the same gesture as their fruit. Each source holds a few charges; a take
// spends one and yields a fixed handful. Refill is deterministic: every source fills when a section is laid (R1), and
// a seeded trickle refills one empty source every TRICKLE_EVERY ticks (R2). Only the current age's charges are kept.
// Pure and deterministic (lockstep).
import { mulberry32 } from './rng.js';

export const FULL = 2; // charges a source holds
export const YIELD = 4; // pieces a take gives
export const TRICKLE_EVERY = 200; // ticks (20 s)
const isInt = Number.isSafeInteger;

// The sources of an age, from the static land layout: [{ i, j }] by source id.
export const sourcesOf = (age, layout) => (age === 0 ? layout.trees : []);

export function createSources() {
  return { a: 0, c: [] }; // a: the age these charges belong to; c: charges by source id
}

// Matches the charges to the current age's sources: a new age starts every source full; a layout that grew (filled
// before tick 1) gets full charges for the new ones.
export function sync(s, age, layout) {
  const n = sourcesOf(age, layout).length;
  if (s.a !== age) {
    s.a = age;
    s.c = [];
  }
  while (s.c.length < n) s.c.push(FULL);
  if (s.c.length > n) s.c.length = n;
}

export const chargesOf = (s, id) => (isInt(id) ? (s.c[id] ?? 0) : 0);
export function take(s, id) {
  if (chargesOf(s, id) <= 0) return 0;
  s.c[id]--;
  return YIELD;
}
export function refillAll(s) {
  s.c.fill(FULL);
}
// R2: on every TRICKLE_EVERY-th tick, one empty source (picked from the room seed and the tick) fills. Returns its id
// or -1.
export function trickle(s, tick, seed) {
  if (tick % TRICKLE_EVERY !== 0) return -1;
  const empty = [];
  for (let id = 0; id < s.c.length; id++) if (s.c[id] === 0) empty.push(id);
  if (!empty.length) return -1;
  const id = empty[Math.floor(mulberry32((seed ^ tick) | 0)() * empty.length)];
  s.c[id] = FULL;
  return id;
}

export const serializeSources = (s) => ({ a: s.a, c: s.c.slice() });
export function loadSources(s, json) {
  const ok = isInt(json?.a) && json.a >= 0 && Array.isArray(json.c) && json.c.length <= 4096;
  if (!ok || !json.c.every((v) => isInt(v) && v >= 0 && v <= FULL)) throw new Error('sources: bad snapshot');
  s.a = json.a;
  s.c = json.c.slice();
}
export function hashSources(s) {
  let h = Math.imul(2166136261 ^ s.a, 16777619);
  for (const v of s.c) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
