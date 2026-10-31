// Island gifts: things players threw, and the frisbee waiting on the lighthouse deck. Pure and integer-only (see
// src/world/README.md), so every client agrees on what lies where. Ops: `gift.take` (pick something up) and
// `gift.toss` (something thrown lands). State key: `gifts`.
import { GIFTS } from './gift-catalog.ts';

export const MAX_ITEMS = 48;
export const LIFE = 6000; // ticks a thrown thing lies on the ground before it rots (10 min)
export const PERCH_REFILL = 600; // a perch gets a new item this long after its last one was taken
const MAX_PERCHES = 4;
export const SRC = { TOSS: 0, PERCH: 1 };
// Item height: on the terrain, on its perch, or a resting height in cm (a deck, a rock, a cap).
export const ON_GROUND = -1;
export const ON_PERCH = -2;
const MAX_Y = 20000;
const MAX_CELL = 4096;
const FIELDS = 7; // id, kind, i, j, src, born, y

// A thing lying on the island. kind: index into GIFTS; i, j: grid cell; src: SRC; born: tick it appeared; y: ON_GROUND,
// ON_PERCH or a resting height in cm.
export type Item = { id: number; kind: number; i: number; j: number; src: number; born: number; y: number };
export type Layout = { perches?: { i: number; j: number; kind: number }[] };
export type Gifts = {
  perches: NonNullable<Layout['perches']>;
  perchAt: number[];
  items: Item[];
  nextId: number;
};
// The saved shape (wire and snapshots): items flattened to FIELDS numbers each.
export type GiftsJSON = { pa: number[]; it: number[]; n: number };

// layout.perches: [{ i, j, kind }] spots that always get their item back. The same on every client and may be filled in
// after creation (props are built later than this state).
export function createGifts(layout: Layout): Gifts {
  layout.perches ??= [];
  return { perches: layout.perches, perchAt: new Array(MAX_PERCHES).fill(0), items: [], nextId: 1 };
}

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const perchOf = (s: Gifts, it: Item) => s.perches.findIndex((p) => p.i === it.i && p.j === it.j);

export function findItem(s: Gifts, id: number) {
  return s.items.find((it) => it.id === id) ?? null;
}

// Returns the removed item, or null if somebody got there first. Taking a perch's item starts its refill timer.
export function takeItem(s: Gifts, id: number, tick = 0): Item | null {
  const k = s.items.findIndex((it) => it.id === id);
  if (k < 0) return null;
  const it = s.items.splice(k, 1)[0];
  const p = it.src === SRC.PERCH ? perchOf(s, it) : -1;
  if (p >= 0 && p < MAX_PERCHES) s.perchAt[p] = tick + PERCH_REFILL;
  return it;
}

// A thrown thing comes to rest: kind lies at cell (i, j), y = ON_GROUND or a resting height in cm.
export function canToss(kind: number, i: number, j: number, y: number) {
  if (![kind, i, j, y].every((v) => isInt(v)) || kind < 0 || kind >= GIFTS.length || GIFTS[kind].src === 'ball')
    return false;
  if (i < 0 || j < 0 || i >= MAX_CELL || j >= MAX_CELL) return false;
  return y === ON_GROUND || (y >= 0 && y <= MAX_Y);
}

// Returns the new item. When the island is full, the oldest thrown thing is swept away to make room; if nothing
// thrown is left to sweep, returns null.
export function tossItem(s: Gifts, kind: number, i: number, j: number, y: number, tick: number): Item | null {
  if (!canToss(kind, i, j, y)) return null;
  if (s.items.length >= MAX_ITEMS) {
    const k = s.items.findIndex((it) => it.src === SRC.TOSS);
    if (k < 0) return null;
    s.items.splice(k, 1);
  }
  const it: Item = { id: s.nextId++, kind, i, j, src: SRC.TOSS, born: tick, y };
  s.items.push(it);
  return it;
}

// Every tick, after edits: old thrown things rot, and empty perches refill.
export function tickGifts(s: Gifts, tick: number) {
  s.items = s.items.filter((it) => it.src === SRC.PERCH || tick - it.born < LIFE);
  for (let k = 0; k < s.perches.length && k < MAX_PERCHES; k++) {
    const p = s.perches[k];
    if (tick < s.perchAt[k] || s.items.length >= MAX_ITEMS) continue;
    if (s.items.some((it) => it.src === SRC.PERCH && it.i === p.i && it.j === p.j)) continue;
    s.items.push({ id: s.nextId++, kind: p.kind, i: p.i, j: p.j, src: SRC.PERCH, born: tick, y: ON_PERCH });
  }
}

export function serializeGifts(s: Gifts): GiftsJSON {
  return {
    pa: s.perchAt.slice(),
    it: s.items.flatMap((it) => [it.id, it.kind, it.i, it.j, it.src, it.born, it.y]),
    n: s.nextId,
  };
}

const validY = (src: number, y: number) =>
  src === SRC.PERCH ? y === ON_PERCH : y === ON_GROUND || (y >= 0 && y <= MAX_Y);

export function loadGifts(s: Gifts, data: unknown) {
  s.perchAt = new Array(MAX_PERCHES).fill(0);
  s.items = [];
  s.nextId = 1;
  if (!data || typeof data !== 'object') return;
  const json = data as Partial<Record<keyof GiftsJSON, unknown>>;
  if (Array.isArray(json.pa))
    json.pa.slice(0, MAX_PERCHES).forEach((v: unknown, k: number) => (s.perchAt[k] = isInt(v) ? v : 0));
  if (isInt(json.n) && json.n > 0) s.nextId = json.n;
  const flat: unknown[] = Array.isArray(json.it) ? json.it : [];
  for (let k = 0; k + FIELDS <= flat.length && s.items.length < MAX_ITEMS; k += FIELDS) {
    const [id, kind, i, j, src, born, y] = flat.slice(k, k + FIELDS);
    if (!isInt(id) || !isInt(kind) || !isInt(i) || !isInt(j) || !isInt(src) || !isInt(born) || !isInt(y)) continue;
    if (kind < 0 || kind >= GIFTS.length || !Object.values(SRC).includes(src) || id >= s.nextId) continue;
    if (!validY(src, y) || s.items.some((it) => it.id === id)) continue;
    s.items.push({ id, kind, i, j, src, born, y });
  }
}

export function hashGifts(s: Gifts) {
  const { pa, it, n } = serializeGifts(s);
  let h = 2166136261;
  for (const v of [...pa, ...it, n]) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
