// Haul stacks: what each player carries on their back, one material at a time (brief 7, loop A). Keyed by roster
// index (src/sim/roster.js). Lockstep, so a pour can be checked against what you really hold, two tabs can't carry the
// same logs, and a stack belongs to its room (and age). Past SOFT_CAP the stack wobbles and a jump spills the top
// (a visual and spill rule, never a reject); HARD_CAP is where pickups stop and the rest stays on the ground.
// Pure and deterministic (lockstep).
import { okKind } from './materials.js';
import { FNV_SEED, foldAll } from './hash.js';

export const SOFT_CAP = 20;
export const HARD_CAP = 60;
export const SPILL = 3; // pieces a jump past SOFT_CAP knocks off (never below SOFT_CAP)
const isInt = Number.isSafeInteger;

export function createStacks() {
  return { k: [], n: [] }; // by roster index; k -1 and n 0: empty-handed
}

export const countOf = (s, idx) => s.n[idx] ?? 0;
export const kindOf = (s, idx) => (countOf(s, idx) > 0 ? s.k[idx] : -1);
// How many of kind k player idx could still pick up: none of another kind than they carry.
export function roomFor(s, idx, k) {
  const n = countOf(s, idx);
  return n > 0 && s.k[idx] !== k ? 0 : HARD_CAP - n;
}
export const spillOf = (n) => (n > SOFT_CAP ? Math.min(SPILL, n - SOFT_CAP) : 0);

function grow(s, idx) {
  while (s.n.length <= idx) {
    s.k.push(-1);
    s.n.push(0);
  }
}
// Adds up to n of kind k; returns how many fitted.
export function addTo(s, idx, k, n) {
  const add = Math.max(0, Math.min(n, roomFor(s, idx, k)));
  if (!add) return 0;
  grow(s, idx);
  s.k[idx] = k;
  s.n[idx] += add;
  return add;
}
// Takes up to n off the top; returns how many came off.
export function takeFrom(s, idx, n) {
  const got = Math.max(0, Math.min(n, countOf(s, idx)));
  if (!got) return 0;
  s.n[idx] -= got;
  if (s.n[idx] === 0) s.k[idx] = -1;
  return got;
}

// [[idx, k, n], ...] for every player carrying something.
export function serializeStacks(s) {
  const out = [];
  for (let idx = 0; idx < s.n.length; idx++) if (s.n[idx] > 0) out.push([idx, s.k[idx], s.n[idx]]);
  return out;
}
export function loadStacks(s, json, maxIdx) {
  if (!Array.isArray(json)) throw new Error('stacks: not an array');
  const next = createStacks();
  for (const row of json) {
    const [idx, k, n] = Array.isArray(row) ? row : [];
    if (!isInt(idx) || idx < 0 || idx >= maxIdx || !okKind(k) || !isInt(n) || n < 1 || n > HARD_CAP)
      throw new Error('stacks: bad row');
    if (countOf(next, idx)) throw new Error('stacks: duplicate player');
    grow(next, idx);
    next.k[idx] = k;
    next.n[idx] = n;
  }
  Object.assign(s, next);
}
export function hashStacks(s) {
  let h = FNV_SEED;
  for (let idx = 0; idx < s.n.length; idx++) if (s.n[idx] > 0) h = foldAll(h, [idx, s.k[idx], s.n[idx]]);
  return h;
}
