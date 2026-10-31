// Ground piles: loose material anyone can pick up (spills, overflow from a source, leftovers). Integer counts, merged
// when near, never ageing (SETTLED: nothing decays). Separate from gifts and its 48-item cap. Pure and deterministic
// (lockstep): the rules (src/world/rules/piles.js) run it, the adapter draws each pile as Local pieces.
import { okKind } from './materials.js';
import { FNV_SEED, fold, foldAll } from './hash.js';

export const MAX_PILES = 128; // per room
export const PILE_CAP = 64; // per pile, unless the room is full (then the nearest same-kind pile takes the rest)
export const MAX_N = 65535; // Uint16: the hard ceiling of one pile
export const MERGE_CELLS = 2; // a drop joins a same-kind pile within this many cells (Chebyshev)
const isInt = Number.isSafeInteger;
// Where a new pile goes when the spot is taken: the cell itself, then its ring of neighbours.
const SPOTS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

// list: { id, i, j, k, n }, in id order. rev counts every change, for views to redraw on (neither saved nor hashed).
export function createPiles() {
  return { list: [], nextId: 1, rev: 0 };
}

export const findPile = (s, id) => s.list.find((p) => p.id === id) ?? null;
const d2 = (p, i, j) => (p.i - i) * (p.i - i) + (p.j - j) * (p.j - j);
// Same-kind piles, nearest first (ties: lower id).
const nearest = (s, i, j, k) =>
  s.list.filter((p) => p.k === k).sort((a, b) => d2(a, i, j) - d2(b, i, j) || a.id - b.id);

// How many of n units of kind k a drop at (i, j) would place: all of them unless the room is full of other kinds (or
// every same-kind pile is at MAX_N).
export function room(s, k, n) {
  if (s.list.length < MAX_PILES) return n;
  let free = 0;
  for (const p of s.list) if (p.k === k) free += MAX_N - p.n;
  return Math.min(n, free);
}

// Puts n units of kind k on the ground at (i, j): first into same-kind piles within MERGE_CELLS (nearest first) up to
// PILE_CAP, then into new piles on the spot or beside it, and once the room holds MAX_PILES, into the nearest same-kind
// piles past PILE_CAP. Returns { placed, ids } (the piles that grew or appeared, in order).
export function dropPile(s, i, j, k, n) {
  const ids = [];
  let left = n;
  s.rev++;
  const put = (p, cap) => {
    const add = Math.min(left, cap - p.n);
    if (add <= 0) return;
    p.n += add;
    left -= add;
    if (!ids.includes(p.id)) ids.push(p.id);
  };
  for (const p of nearest(s, i, j, k)) {
    if (Math.max(Math.abs(p.i - i), Math.abs(p.j - j)) > MERGE_CELLS) continue;
    put(p, PILE_CAP);
  }
  while (left > 0 && s.list.length < MAX_PILES) {
    const spot = SPOTS.find(([di, dj]) => !s.list.some((p) => p.i === i + di && p.j === j + dj));
    if (!spot) break;
    const p = { id: s.nextId++, i: i + spot[0], j: j + spot[1], k, n: 0 };
    s.list.push(p);
    put(p, PILE_CAP);
  }
  if (left > 0) for (const p of nearest(s, i, j, k)) put(p, MAX_N);
  return { placed: n - left, ids };
}

// Takes up to n units from pile id. Returns { id, k, n } (n: what was taken), or null if there is no such pile.
export function takePile(s, id, n) {
  const p = findPile(s, id);
  if (!p) return null;
  const got = Math.min(n, p.n);
  s.rev++;
  p.n -= got;
  if (p.n === 0) s.list.splice(s.list.indexOf(p), 1);
  return { id, k: p.k, n: got };
}

export const totalOf = (s, k) => s.list.reduce((t, p) => t + (p.k === k ? p.n : 0), 0);

// { id: nextId, p: [id, i, j, k, n, ...] }
export function serializePiles(s) {
  return { id: s.nextId, p: s.list.flatMap((p) => [p.id, p.i, p.j, p.k, p.n]) };
}
export function loadPiles(s, json) {
  const flat = json?.p;
  if (!isInt(json?.id) || json.id < 1 || !Array.isArray(flat) || flat.length % 5 || flat.length > MAX_PILES * 5)
    throw new Error('piles: bad snapshot');
  const list = [];
  for (let x = 0; x < flat.length; x += 5) {
    const [id, i, j, k, n] = flat.slice(x, x + 5);
    const ok = [id, i, j, n].every(isInt) && okKind(k) && id >= 1 && id < json.id && n >= 1 && n <= MAX_N;
    if (!ok || list.some((p) => p.id === id)) throw new Error('piles: bad pile');
    list.push({ id, i, j, k, n });
  }
  s.list = list.sort((a, b) => a.id - b.id);
  s.nextId = json.id;
  s.rev++;
}
export function hashPiles(s) {
  let h = fold(FNV_SEED, s.nextId);
  for (const p of s.list) h = foldAll(h, [p.id, p.i, p.j, p.k, p.n]);
  return h;
}
