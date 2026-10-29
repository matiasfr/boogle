// Island gifts: fruit growing on the palms, and odds and ends washing up on the beach. Pure and integer-only (see
// src/world/README.md), so every client agrees on what lies where. Ops: `fruit.drop` (shake a palm or hit it with the
// ball), `gift.take` (pick something up). State key: `gifts`.
import { mulberry32 } from './rng.js';
import { GIFTS } from '../gift-catalog.js';

export const MAX_TREES = 64;
export const REGROW_TICKS = 2400;
export const MAX_SHORE = 12;
export const MAX_ITEMS = 48;
export const WASH_EVERY = 450;
export const WASH_EVERY_SPARSE = 100; // while fewer than SPARSE shore items lie around
export const SPARSE = 3;
export const LIFE = { shore: 12000, fruit: 6000 }; // then the tide takes it back, or it rots away
const SRC_SHORE = 0,
  SRC_FRUIT = 1;
const FIELDS = 6; // id, kind, i, j, src, born

const SHORE_KINDS = GIFTS.flatMap((g, k) => (g.src === 'shore' ? [k] : []));
const SHORE_TOTAL = SHORE_KINDS.reduce((s, k) => s + GIFTS[k].weight, 0);
const FRUIT_CYCLE = ['coconut', 'mango', 'coconut', 'banana', 'pomegranate', 'coconut', 'apricot'].map((id) =>
  GIFTS.findIndex((g) => g.id === id),
);
// Where fruit lands around its palm, by direction 0..7: k * 45 degrees from world +x toward +z (grid j grows toward -z).
export const DROP_OFFSETS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function treeFruit(t) {
  return FRUIT_CYCLE[(Math.imul(t + 1, 2654435761) >>> 0) % FRUIT_CYCLE.length];
}

// layout.trees: [{ i, j }] palm cells by tree index; layout.shore: [[i, j]] beach cells things wash up on. Both are
// the same on every client. `trees` may be filled in after creation (props are built later than this state).
export function createGifts(layout) {
  return {
    trees: layout.trees,
    shore: layout.shore,
    ripeAt: new Array(MAX_TREES).fill(0),
    items: [],
    nextId: 1,
    washed: 0,
    nextWash: 0,
  };
}

const isInt = Number.isSafeInteger;
const shoreCount = (s) => s.items.reduce((n, it) => n + (it.src === SRC_SHORE ? 1 : 0), 0);

export function isRipe(s, t, tick) {
  return isInt(t) && t >= 0 && t < s.trees.length && t < MAX_TREES && tick >= s.ripeAt[t];
}

export function canDrop(s, t, tick, dir = 0) {
  return isRipe(s, t, tick) && s.items.length < MAX_ITEMS && isInt(dir) && dir >= 0 && dir < DROP_OFFSETS.length;
}

// Returns the fallen fruit's ground item (on the `dir` side of the palm), or null if the tree had nothing ripe.
export function dropFruit(s, t, tick, dir = 0) {
  if (!canDrop(s, t, tick, dir)) return null;
  s.ripeAt[t] = tick + REGROW_TICKS;
  const [di, dj] = DROP_OFFSETS[dir];
  const tree = s.trees[t];
  const it = { id: s.nextId++, kind: treeFruit(t), i: tree.i + di, j: tree.j + dj, src: SRC_FRUIT, born: tick };
  s.items.push(it);
  return it;
}

export function findItem(s, id) {
  return s.items.find((it) => it.id === id) ?? null;
}

// Returns the removed item, or null if somebody got there first.
export function takeItem(s, id) {
  const k = s.items.findIndex((it) => it.id === id);
  return k < 0 ? null : s.items.splice(k, 1)[0];
}

function wash(s, tick, seed) {
  const rng = mulberry32((seed ^ Math.imul(s.washed + 1, 0x9e3779b1)) | 0);
  s.washed++;
  let cell = null;
  for (let tries = 0; tries < 4 && !cell; tries++) {
    const c = s.shore[Math.floor(rng() * s.shore.length)];
    if (!s.items.some((it) => Math.abs(it.i - c[0]) < 2 && Math.abs(it.j - c[1]) < 2)) cell = c;
  }
  if (!cell) return;
  let roll = Math.floor(rng() * SHORE_TOTAL),
    kind = SHORE_KINDS[0];
  for (const k of SHORE_KINDS) {
    roll -= GIFTS[k].weight;
    if (roll < 0) {
      kind = k;
      break;
    }
  }
  s.items.push({ id: s.nextId++, kind, i: cell[0], j: cell[1], src: SRC_SHORE, born: tick });
}

// Every tick, after edits: old things wash away or rot, and new things wash up on a schedule.
export function tickGifts(s, tick, seed) {
  s.items = s.items.filter((it) => tick - it.born < (it.src === SRC_SHORE ? LIFE.shore : LIFE.fruit));
  if (tick < s.nextWash) return;
  const shore = shoreCount(s);
  if (shore < MAX_SHORE && s.items.length < MAX_ITEMS && s.shore.length) wash(s, tick, seed);
  s.nextWash = tick + (shoreCount(s) < SPARSE ? WASH_EVERY_SPARSE : WASH_EVERY);
}

export function serializeGifts(s) {
  return {
    r: s.ripeAt.slice(),
    it: s.items.flatMap((it) => [it.id, it.kind, it.i, it.j, it.src, it.born]),
    n: s.nextId,
    w: s.washed,
    at: s.nextWash,
  };
}

export function loadGifts(s, json) {
  s.ripeAt = new Array(MAX_TREES).fill(0);
  s.items = [];
  s.nextId = 1;
  s.washed = 0;
  s.nextWash = 0;
  if (!json || typeof json !== 'object') return;
  if (Array.isArray(json.r)) json.r.slice(0, MAX_TREES).forEach((v, t) => (s.ripeAt[t] = isInt(v) ? v : 0));
  if (isInt(json.n) && json.n > 0) s.nextId = json.n;
  if (isInt(json.w) && json.w >= 0) s.washed = json.w;
  if (isInt(json.at) && json.at >= 0) s.nextWash = json.at;
  const flat = Array.isArray(json.it) ? json.it : [];
  for (let k = 0; k + FIELDS <= flat.length && s.items.length < MAX_ITEMS; k += FIELDS) {
    const [id, kind, i, j, src, born] = flat.slice(k, k + FIELDS);
    if (![id, kind, i, j, src, born].every(isInt)) continue;
    if (kind < 0 || kind >= GIFTS.length || (src !== SRC_SHORE && src !== SRC_FRUIT) || id >= s.nextId) continue;
    if (s.items.some((it) => it.id === id)) continue;
    s.items.push({ id, kind, i, j, src, born });
  }
}

export function hashGifts(s) {
  const { r, it, n, w, at } = serializeGifts(s);
  let h = 2166136261;
  for (const v of [...r, ...it, n, w, at]) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
