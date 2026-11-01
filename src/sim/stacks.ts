// Haul stacks: what each player carries on their back, one material at a time (brief 7, loop A). Keyed by roster
// index (src/sim/roster.ts). Lockstep, so a pour can be checked against what you really hold, two tabs can't carry the
// same logs, and a stack belongs to its room (and age). Past SOFT_CAP the stack wobbles and a jump spills the top
// (a visual and spill rule, never a reject); HARD_CAP is where pickups stop and the rest stays on the ground.
// Pure and deterministic (lockstep).
import { okKind } from './materials.ts';
import { FNV_SEED, foldAll } from './hash.ts';

export const SOFT_CAP = 20;
export const HARD_CAP = 60;
export const SPILL = 3; // pieces a jump past SOFT_CAP knocks off (never below SOFT_CAP)
// The most a stack can ever hold: the ceiling of a playtest's tuned hard cap (./tune.ts). The caps above are today's
// defaults; the rules pass a room's tuned ones in.
export const HARD_MAX = 200;
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

/** k: material kind by roster index (-1: empty-handed); n: how many. */
export type Stacks = { k: number[]; n: number[] };
/** Saved form: [idx, kind, count] per player carrying something. */
export type StacksJson = [number, number, number][];

export function createStacks(): Stacks {
  return { k: [], n: [] }; // by roster index; k -1 and n 0: empty-handed
}

export const countOf = (s: Stacks, idx: number): number => s.n[idx] ?? 0;
export const kindOf = (s: Stacks, idx: number): number => (countOf(s, idx) > 0 ? s.k[idx] : -1);
// How many of kind k player idx could still pick up: none of another kind than they carry.
// A stack over a lowered cap just takes no more.
export function roomFor(s: Stacks, idx: number, k: number, hard = HARD_CAP): number {
  const n = countOf(s, idx);
  return n > 0 && s.k[idx] !== k ? 0 : Math.max(0, hard - n);
}
export const spillOf = (n: number, soft = SOFT_CAP, spill = SPILL): number =>
  n > soft ? Math.min(spill, n - soft) : 0;

function grow(s: Stacks, idx: number): void {
  while (s.n.length <= idx) {
    s.k.push(-1);
    s.n.push(0);
  }
}
// Adds up to n of kind k; returns how many fitted.
export function addTo(s: Stacks, idx: number, k: number, n: number, hard = HARD_CAP): number {
  const add = Math.max(0, Math.min(n, roomFor(s, idx, k, hard)));
  if (!add) return 0;
  grow(s, idx);
  s.k[idx] = k;
  s.n[idx] += add;
  return add;
}
// Takes up to n off the top; returns how many came off.
export function takeFrom(s: Stacks, idx: number, n: number): number {
  const got = Math.max(0, Math.min(n, countOf(s, idx)));
  if (!got) return 0;
  s.n[idx] -= got;
  if (s.n[idx] === 0) s.k[idx] = -1;
  return got;
}

// [[idx, k, n], ...] for every player carrying something.
export function serializeStacks(s: Stacks): StacksJson {
  const out: StacksJson = [];
  for (let idx = 0; idx < s.n.length; idx++) if (s.n[idx] > 0) out.push([idx, s.k[idx], s.n[idx]]);
  return out;
}
export function loadStacks(s: Stacks, json: unknown, maxIdx: number): void {
  if (!Array.isArray(json)) throw new Error('stacks: not an array');
  const next = createStacks();
  for (const row of json) {
    const [idx, k, n] = Array.isArray(row) ? row : [];
    if (!isInt(idx) || idx < 0 || idx >= maxIdx || !okKind(k) || !isInt(n) || n < 1 || n > HARD_MAX)
      throw new Error('stacks: bad row');
    if (countOf(next, idx)) throw new Error('stacks: duplicate player');
    grow(next, idx);
    next.k[idx] = k;
    next.n[idx] = n;
  }
  Object.assign(s, next);
}
export function hashStacks(s: Stacks): number {
  let h = FNV_SEED;
  for (let idx = 0; idx < s.n.length; idx++) if (s.n[idx] > 0) h = foldAll(h, [idx, s.k[idx], s.n[idx]]);
  return h;
}
