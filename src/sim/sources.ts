// Material sources (brief 8 section 1): things on the island that give the current age's material. Age 0 (wood): the
// home palm cells (`layout.trees`), where the wood age's log bundles lie; taken from the bundle. Each source holds FULL charges; a take
// spends one and yields a fixed handful. Refill is deterministic: every source fills when a section is laid (R1), and
// a seeded trickle refills one empty source every TRICKLE_EVERY ticks (R2). State is only what has been spent, in the
// current age, so a source nobody touched needs no entry and the layout (filled before tick 1) is read, never copied.
// Pure and deterministic (lockstep).
import { mulberry32 } from './rng.ts';
import { FNV_SEED, fold, foldAll } from './hash.ts';

export const FULL = 2; // charges a source holds
export const YIELD = 4; // pieces a take gives
export const TRICKLE_EVERY = 200; // ticks (20 s)
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

// The sources of an age, from the static land layout: [{ i, j }] by source id.
export type Cell = { i: number; j: number };
export const sourcesOf = (age: number, layout: { trees: readonly Cell[] }): readonly Cell[] =>
  age === 0 ? layout.trees : [];

// a: the age the spent counts belong to; spent: source id -> charges spent (absent: full). rev counts every change, for
// views to redraw on (neither saved nor hashed).
export type Sources = { a: number; spent: Map<number, number>; rev: number };
/** Saved form: the age, then [source id, charges spent] pairs in id order, flat. */
export type SourcesJson = { a: number; s: number[] };

export function createSources(): Sources {
  return { a: 0, spent: new Map(), rev: 0 };
}

// Charges left at source id of `age` (count: how many sources that age has). Reading never changes state: counts from
// an older age read as full.
export function chargesOf(s: Sources, age: number, count: number, id: unknown): number {
  if (!isInt(id) || id < 0 || id >= count) return 0;
  return FULL - (s.a === age ? (s.spent.get(id) ?? 0) : 0);
}
// Ticks and apply only: forget the spent counts of an age that is over.
export function matchAge(s: Sources, age: number): void {
  if (s.a === age) return;
  s.a = age;
  s.spent.clear();
  s.rev++;
}
export function take(s: Sources, age: number, count: number, id: number): number {
  if (chargesOf(s, age, count, id) <= 0) return 0;
  matchAge(s, age);
  s.spent.set(id, (s.spent.get(id) ?? 0) + 1);
  s.rev++;
  return YIELD;
}
export function refillAll(s: Sources): void {
  s.spent.clear();
  s.rev++;
}
// R2: on every TRICKLE_EVERY-th tick, one empty source (picked from the room seed and the tick) fills. Returns its id
// or -1.
export function trickle(s: Sources, tick: number, seed: number): number {
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
export function serializeSources(s: Sources): SourcesJson {
  return { a: s.a, s: [...s.spent].sort((x, y) => x[0] - y[0]).flat() };
}
export function loadSources(s: Sources, json: unknown): void {
  const { a, s: flat } = (json ?? {}) as Partial<SourcesJson>;
  if (!isInt(a) || a < 0 || !Array.isArray(flat) || flat.length % 2 || flat.length > 8192)
    throw new Error('sources: bad snapshot');
  const spent = new Map<number, number>();
  for (let k = 0; k < flat.length; k += 2) {
    const id: unknown = flat[k],
      n: unknown = flat[k + 1];
    if (!isInt(id) || id < 0 || !isInt(n) || n < 1 || n > FULL) throw new Error('sources: bad snapshot');
    spent.set(id, n);
  }
  Object.assign(s, { a, spent, rev: s.rev + 1 });
}
export function hashSources(s: Sources): number {
  return foldAll(fold(FNV_SEED, s.a), serializeSources(s).s);
}
