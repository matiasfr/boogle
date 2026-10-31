// Ground piles: loose material anyone can pick up (spills, overflow from a source, leftovers). Integer counts, merged
// when near, never ageing (SETTLED: nothing decays). Separate from gifts and its 48-item cap. Pure and deterministic
// (lockstep): the rules (src/world/rules/piles.ts) run it, the adapter draws each pile as Local pieces.
import { okKind } from './materials.ts';
import { FNV_SEED, fold, foldAll } from './hash.ts';

export const MAX_PILES = 128; // per room
export const PILE_CAP = 64; // per pile, unless the room is full (then the nearest same-kind pile takes the rest)
export const MAX_N = 65535; // Uint16: the hard ceiling of one pile
export const MERGE_CELLS = 2; // a drop joins a same-kind pile within this many cells (Chebyshev)
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
// Where a new pile goes when the spot is taken: the cell itself, then its ring of neighbours.
const SPOTS: readonly [number, number][] = [
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
export type Pile = { id: number; i: number; j: number; k: number; n: number };
export type Piles = { list: Pile[]; nextId: number; rev: number };
/** Saved form: next id, then [id, i, j, kind, count] per pile, flat. */
export type PilesJson = { id: number; p: number[] };

export function createPiles(): Piles {
  return { list: [], nextId: 1, rev: 0 };
}

export const findPile = (s: Piles, id: unknown): Pile | null => s.list.find((p) => p.id === id) ?? null;
const d2 = (p: Pile, i: number, j: number): number => (p.i - i) * (p.i - i) + (p.j - j) * (p.j - j);
// Same-kind piles, nearest first (ties: lower id).
const nearest = (s: Piles, i: number, j: number, k: number): Pile[] =>
  s.list.filter((p) => p.k === k).sort((a, b) => d2(a, i, j) - d2(b, i, j) || a.id - b.id);

// How many of n units of kind k a drop at (i, j) would place (dropPile's own capacity): every same-kind pile can grow
// to MAX_N, and each free spot on or beside (i, j) can take a new pile while the room has fewer than MAX_PILES.
export function room(s: Piles, i: number, j: number, k: number, n: number): number {
  let cap = 0;
  for (const p of s.list) if (p.k === k) cap += MAX_N - p.n;
  const free = SPOTS.filter(([di, dj]) => !s.list.some((p) => p.i === i + di && p.j === j + dj)).length;
  cap += Math.min(free, MAX_PILES - s.list.length) * MAX_N;
  return Math.max(0, Math.min(n, cap));
}

// Puts n units of kind k on the ground at (i, j): first into same-kind piles within MERGE_CELLS (nearest first) up to
// PILE_CAP, then into new piles on the spot or beside it, and once the room holds MAX_PILES, into the nearest same-kind
// piles past PILE_CAP. Returns { placed, ids } (the piles that grew or appeared, in order).
export function dropPile(s: Piles, i: number, j: number, k: number, n: number): { placed: number; ids: number[] } {
  const ids: number[] = [];
  let left = n;
  s.rev++;
  const put = (p: Pile, cap: number) => {
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
export function takePile(s: Piles, id: number, n: number): { id: number; k: number; n: number } | null {
  const p = findPile(s, id);
  if (!p) return null;
  const got = Math.min(n, p.n);
  s.rev++;
  p.n -= got;
  if (p.n === 0) s.list.splice(s.list.indexOf(p), 1);
  return { id, k: p.k, n: got };
}

export const totalOf = (s: Piles, k: number): number => s.list.reduce((t, p) => t + (p.k === k ? p.n : 0), 0);

// { id: nextId, p: [id, i, j, k, n, ...] }
export function serializePiles(s: Piles): PilesJson {
  return { id: s.nextId, p: s.list.flatMap((p) => [p.id, p.i, p.j, p.k, p.n]) };
}
export function loadPiles(s: Piles, json: unknown): void {
  const { id: next, p: flat } = (json ?? {}) as Partial<PilesJson>;
  if (!isInt(next) || next < 1 || !Array.isArray(flat) || flat.length % 5 || flat.length > MAX_PILES * 5)
    throw new Error('piles: bad snapshot');
  const list: Pile[] = [];
  for (let x = 0; x < flat.length; x += 5) {
    const [id, i, j, k, n]: unknown[] = flat.slice(x, x + 5);
    if (!isInt(id) || !isInt(i) || !isInt(j) || !okKind(k) || !isInt(n)) throw new Error('piles: bad pile');
    if (id < 1 || id >= next || n < 1 || n > MAX_N || list.some((p) => p.id === id)) throw new Error('piles: bad pile');
    list.push({ id, i, j, k, n });
  }
  s.list = list.sort((a, b) => a.id - b.id);
  s.nextId = next;
  s.rev++;
}
export function hashPiles(s: Piles): number {
  let h = fold(FNV_SEED, s.nextId);
  for (const p of s.list) h = foldAll(h, [p.id, p.i, p.j, p.k, p.n]);
  return h;
}
