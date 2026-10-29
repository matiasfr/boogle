// Island gifts: fruit growing on the palms, odds and ends washing up on the beach, things players threw, and the
// frisbee waiting on the lighthouse deck. Pure and integer-only (see src/world/README.md), so every client agrees on
// what lies where. Ops: `fruit.drop` (shake a palm or hit it with the ball), `gift.take` (pick something up),
// `gift.toss` (something thrown lands). State key: `gifts`.
import { mulberry32 } from './rng.js';
import { GIFTS } from './gift-catalog.js';

export const MAX_TREES = 64;
export const REGROW_TICKS = 2400;
export const MAX_SHORE = 12;
export const MAX_ITEMS = 48;
export const WASH_EVERY = 450;
export const WASH_EVERY_SPARSE = 100; // while fewer than SPARSE shore items lie around
export const SPARSE = 3;
export const LIFE = { shore: 12000, fruit: 6000, toss: 6000 }; // then the tide takes it back, or it rots away
export const PERCH_REFILL = 600; // a perch gets a new item this long after its last one was taken
export const MAX_PERCHES = 4;
export const SRC = { SHORE: 0, FRUIT: 1, TOSS: 2, PERCH: 3 };
// Item height: on the terrain (follows digging), on its perch, or a resting height in cm (a deck, a rock, a cap).
export const ON_GROUND = -1;
export const ON_PERCH = -2;
const MAX_Y = 20000;
const MAX_CELL = 4096;
const FIELDS = 7; // id, kind, i, j, src, born, y
const LEGACY_FIELDS = 6; // snapshots without `v`: no y

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

// layout.trees: [{ i, j }] palm cells by tree index; layout.shore: [[i, j]] beach cells things wash up on;
// layout.perches: [{ i, j, kind }] spots that always get their item back. All are the same on every client and may be
// filled in after creation (props are built later than this state).
export function createGifts(layout) {
  layout.perches ??= [];
  return {
    trees: layout.trees,
    shore: layout.shore,
    perches: layout.perches,
    ripeAt: new Array(MAX_TREES).fill(0),
    perchAt: new Array(MAX_PERCHES).fill(0),
    items: [],
    nextId: 1,
    washed: 0,
    nextWash: 0,
  };
}

const isInt = Number.isSafeInteger;
const shoreCount = (s) => s.items.reduce((n, it) => n + (it.src === SRC.SHORE ? 1 : 0), 0);
const lifeOf = (it) => (it.src === SRC.SHORE ? LIFE.shore : it.src === SRC.TOSS ? LIFE.toss : LIFE.fruit);
const perchOf = (s, it) => s.perches.findIndex((p) => p.i === it.i && p.j === it.j);

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
  const it = {
    id: s.nextId++,
    kind: treeFruit(t),
    i: tree.i + di,
    j: tree.j + dj,
    src: SRC.FRUIT,
    born: tick,
    y: ON_GROUND,
  };
  s.items.push(it);
  return it;
}

export function findItem(s, id) {
  return s.items.find((it) => it.id === id) ?? null;
}

// Returns the removed item, or null if somebody got there first. Taking a perch's item starts its refill timer.
export function takeItem(s, id, tick = 0) {
  const k = s.items.findIndex((it) => it.id === id);
  if (k < 0) return null;
  const it = s.items.splice(k, 1)[0];
  const p = it.src === SRC.PERCH ? perchOf(s, it) : -1;
  if (p >= 0 && p < MAX_PERCHES) s.perchAt[p] = tick + PERCH_REFILL;
  return it;
}

// A thrown thing comes to rest: kind lies at cell (i, j), y = ON_GROUND or a resting height in cm.
export function canToss(kind, i, j, y) {
  if (![kind, i, j, y].every(isInt) || kind < 0 || kind >= GIFTS.length || GIFTS[kind].src === 'ball') return false;
  if (i < 0 || j < 0 || i >= MAX_CELL || j >= MAX_CELL) return false;
  return y === ON_GROUND || (y >= 0 && y <= MAX_Y);
}

// Returns the new item. When the island is full, the oldest thrown thing is swept away to make room; if nothing
// thrown is left to sweep, returns null.
export function tossItem(s, kind, i, j, y, tick) {
  if (!canToss(kind, i, j, y)) return null;
  if (s.items.length >= MAX_ITEMS) {
    const k = s.items.findIndex((it) => it.src === SRC.TOSS);
    if (k < 0) return null;
    s.items.splice(k, 1);
  }
  const it = { id: s.nextId++, kind, i, j, src: SRC.TOSS, born: tick, y };
  s.items.push(it);
  return it;
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
  s.items.push({ id: s.nextId++, kind, i: cell[0], j: cell[1], src: SRC.SHORE, born: tick, y: ON_GROUND });
}

// Every tick, after edits: old things wash away or rot, empty perches refill, and new things wash up on a schedule.
export function tickGifts(s, tick, seed) {
  s.items = s.items.filter((it) => it.src === SRC.PERCH || tick - it.born < lifeOf(it));
  s.perches.slice(0, MAX_PERCHES).forEach((p, k) => {
    if (tick < s.perchAt[k] || s.items.length >= MAX_ITEMS) return;
    if (s.items.some((it) => it.src === SRC.PERCH && it.i === p.i && it.j === p.j)) return;
    s.items.push({ id: s.nextId++, kind: p.kind, i: p.i, j: p.j, src: SRC.PERCH, born: tick, y: ON_PERCH });
  });
  if (tick < s.nextWash) return;
  const shore = shoreCount(s);
  if (shore < MAX_SHORE && s.items.length < MAX_ITEMS && s.shore.length) wash(s, tick, seed);
  s.nextWash = tick + (shoreCount(s) < SPARSE ? WASH_EVERY_SPARSE : WASH_EVERY);
}

export function serializeGifts(s) {
  return {
    v: 2,
    r: s.ripeAt.slice(),
    pa: s.perchAt.slice(),
    it: s.items.flatMap((it) => [it.id, it.kind, it.i, it.j, it.src, it.born, it.y]),
    n: s.nextId,
    w: s.washed,
    at: s.nextWash,
  };
}

const validY = (src, y) => (src === SRC.PERCH ? y === ON_PERCH : y === ON_GROUND || (y >= 0 && y <= MAX_Y));

export function loadGifts(s, json) {
  s.ripeAt = new Array(MAX_TREES).fill(0);
  s.perchAt = new Array(MAX_PERCHES).fill(0);
  s.items = [];
  s.nextId = 1;
  s.washed = 0;
  s.nextWash = 0;
  if (!json || typeof json !== 'object') return;
  if (Array.isArray(json.r)) json.r.slice(0, MAX_TREES).forEach((v, t) => (s.ripeAt[t] = isInt(v) ? v : 0));
  if (Array.isArray(json.pa)) json.pa.slice(0, MAX_PERCHES).forEach((v, k) => (s.perchAt[k] = isInt(v) ? v : 0));
  if (isInt(json.n) && json.n > 0) s.nextId = json.n;
  if (isInt(json.w) && json.w >= 0) s.washed = json.w;
  if (isInt(json.at) && json.at >= 0) s.nextWash = json.at;
  const flat = Array.isArray(json.it) ? json.it : [];
  const fields = json.v === 2 ? FIELDS : LEGACY_FIELDS;
  for (let k = 0; k + fields <= flat.length && s.items.length < MAX_ITEMS; k += fields) {
    const [id, kind, i, j, src, born, y = ON_GROUND] = flat.slice(k, k + fields);
    if (![id, kind, i, j, src, born, y].every(isInt)) continue;
    if (kind < 0 || kind >= GIFTS.length || !Object.values(SRC).includes(src) || id >= s.nextId) continue;
    if (!validY(src, y) || s.items.some((it) => it.id === id)) continue;
    s.items.push({ id, kind, i, j, src, born, y });
  }
}

export function hashGifts(s) {
  const { r, pa, it, n, w, at } = serializeGifts(s);
  let h = 2166136261;
  for (const v of [...r, ...pa, ...it, n, w, at]) h = Math.imul(h ^ v, 16777619);
  return h >>> 0;
}
