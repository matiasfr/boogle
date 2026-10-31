// Material sources (brief 8 section 1): things on the island that give the current age's material. Age 0 (wood): the
// home palms (`layout.trees`), shaken with the same gesture as their fruit. Each source holds FULL charges; a take
// spends one and yields a fixed handful. Refill is deterministic: every source fills when a section is laid (R1), and
// a seeded trickle refills one empty source every TRICKLE_EVERY ticks (R2). State is only what has been spent, in the
// current age, so a source nobody touched needs no entry and the layout (filled before tick 1) is read, never copied.
// Pure and deterministic (lockstep).
import { mulberry32 } from './rng.js';
import { FNV_SEED, fold, foldAll } from './hash.js';

export const FULL = 2; // charges a source holds
export const YIELD = 4; // pieces a take gives
export const TRICKLE_EVERY = 200; // ticks (20 s)
const isInt = Number.isSafeInteger;

// The sources of an age, from the static land layout: [{ i, j }] by source id.
export const sourcesOf = (age, layout) => (age === 0 ? layout.trees : []);

// a: the age the spent counts belong to; spent: source id -> charges spent (absent: full). rev counts every change, for
// views to redraw on (neither saved nor hashed).
export function createSources() {
  return { a: 0, spent: new Map(), rev: 0 };
}

// Charges left at source id of `age` (count: how many sources that age has). Reading never changes state: counts from
// an older age read as full.
export function chargesOf(s, age, count, id) {
  if (!isInt(id) || id < 0 || id >= count) return 0;
  return FULL - (s.a === age ? (s.spent.get(id) ?? 0) : 0);
}
// Ticks and apply only: forget the spent counts of an age that is over.
export function matchAge(s, age) {
  if (s.a === age) return;
  s.a = age;
  s.spent.clear();
  s.rev++;
}
export function take(s, age, count, id) {
  if (chargesOf(s, age, count, id) <= 0) return 0;
  matchAge(s, age);
  s.spent.set(id, (s.spent.get(id) ?? 0) + 1);
  s.rev++;
  return YIELD;
}
export function refillAll(s) {
  s.spent.clear();
  s.rev++;
}
// R2: on every TRICKLE_EVERY-th tick, one empty source (picked from the room seed and the tick) fills. Returns its id
// or -1.
export function trickle(s, tick, seed) {
  if (tick % TRICKLE_EVERY !== 0) return -1;
  const empty = [...s.spent]
    .filter(([, n]) => n >= FULL)
    .map(([id]) => id)
    .sort((a, b) => a - b);
  if (!empty.length) return -1;
  const id = empty[Math.floor(mulberry32((seed ^ tick) | 0)() * empty.length)];
  s.spent.delete(id);
  s.rev++;
  return id;
}

// { a, s: [id, spent, ...] } in id order
export function serializeSources(s) {
  return { a: s.a, s: [...s.spent].sort((x, y) => x[0] - y[0]).flat() };
}
export function loadSources(s, json) {
  const flat = json?.s;
  const ok = isInt(json?.a) && json.a >= 0 && Array.isArray(flat) && flat.length % 2 === 0 && flat.length <= 8192;
  if (!ok || !flat.every((v, k) => isInt(v) && v >= 0 && (k % 2 === 0 || (v >= 1 && v <= FULL))))
    throw new Error('sources: bad snapshot');
  const spent = new Map();
  for (let k = 0; k < flat.length; k += 2) spent.set(flat[k], flat[k + 1]);
  Object.assign(s, { a: json.a, spent, rev: s.rev + 1 });
}
export function hashSources(s) {
  return foldAll(fold(FNV_SEED, s.a), serializeSources(s).s);
}
