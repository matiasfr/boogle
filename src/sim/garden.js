// Garden sim (Phase 5): pure, deterministic crop logic. No three.js, no DOM, no Math.random, no Date.
//
// DESIGN (toy-like and generous; see DESIGN.md "toys before chores")
//  - A crop lives in one heightfield cell (i, j). Kinds: flower (fast), melon (medium), palm (slow, regrows).
//  - Growth is driven by HYDRATED TIME. A crop is hydrated on a tick when the water sim says its cell is wet
//    (isWet(i, j)) or someone watered it by hand recently (wetUntil). Growth is stored in milli-ticks
//    (`growth`), so integer multipliers (per-mille) stay exact. stage = floor(growth / (stageTicks * 1000)).
//    stage === kind.stages means ripe. Nothing ever rots or dies from neglect: unwatered crops just wait.
//  - Hand watering (op 'water') hydrates a crop for WATER_TICKS (1 min) even if dry. Repeats do not stack.
//  - Visitor bonus (Animal Crossing): each DISTINCT player who watered the crop during the current game day
//    adds to the growth multiplier: 1 -> x1.0, 2 -> x1.4, 3 -> x1.7, 4 -> x2.1, 5+ -> x2.5. The same player
//    watering again does not stack. The set resets when the day changes (day = floor(tick / DAY_TICKS),
//    DAY_TICKS = 20 real minutes), so friends who water at different times still help.
//  - Communal garden, personal rewards: anyone can harvest any ripe crop; the item goes to the harvester.
//    There is deliberately NO uproot/destroy op (DESIGN principle 5); only the environment (salt) removes crops.
//  - Planting is rate limited per player (SEED_COOLDOWN_TICKS = 30 s, r/place style) and the garden is capped
//    at MAX_CROPS so it can't be spammed. The cell must be empty and canPlant(i, j) (injected by the caller;
//    the garden knows nothing about terrain) must be true: sand/soil above sea level.
//  - Salt (Phase 6 hook): salt(g, i, j, tick) marks a crop wilting. A wilting crop stops growing; hand watering
//    it (fresh water) rinses the salt. Left unrinsed for SALT_GRACE_TICKS (3 min) it is removed.
//
// TIME: one tick = 100 ms (10 ticks/s, see src/world/README.md). All math is integers.
//
// OFFLINE GROWTH: the host stores the tick at which the garden was last saved (and world.epochMs, the wall-clock
// ms of tick 0). On load: toTick = floor((Date.now() - world.epochMs) / TICK_MS); then
// catchUp(g, savedTick, toTick, wetFraction) where wetFraction is per-mille of the elapsed time each cell is
// wet (number or (i,j)=>number; e.g. 1000 if the saved pond/soil was wet, 0 if not, or a rain schedule value).
// It is O(crops) (not O(ticks)) and clamped to MAX_CATCHUP_TICKS (7 real days). For constant 0 or 1000
// wetness it yields state identical to stepping every tick; partial fractions use floor() per segment.
//
// RANDOMNESS: only harvest yield uses RNG, mulberry32 seeded by hash(world seed, cell, tick) so every client
// agrees.
//
// OPS (plain functions, for registerOp later): plant / water / harvest return {ok:true,...} or
// {ok:false, reason}. They validate fully, so the host can call validatePlant/validateWater/validateHarvest
// and clients call the op itself in apply() (deterministic; same result everywhere).

import { mulberry32 } from '../math.js';

export const TICKS_PER_SEC = 10;
export const DAY_TICKS = 20 * 60 * TICKS_PER_SEC; // 12000
export const WATER_TICKS = 60 * TICKS_PER_SEC; // hand-watering hydrates for 1 minute
export const SEED_COOLDOWN_TICKS = 30 * TICKS_PER_SEC;
export const SALT_GRACE_TICKS = 3 * 60 * TICKS_PER_SEC;
export const MAX_CROPS = 400;
export const MAX_CATCHUP_TICKS = 7 * 24 * 3600 * TICKS_PER_SEC;
export const GRID_MAX = 4096; // cell index = j * GRID_MAX + i
export const WATERER_PERMILLE = [1000, 1000, 1400, 1700, 2100, 2500]; // index = distinct waterers today (5+ capped)

export const KINDS = {
  flower: { id: 1, stages: 3, stageTicks: 600, item: 'flower', regrowTo: null },
  melon: { id: 2, stages: 4, stageTicks: 1800, item: 'melon', regrowTo: null },
  palm: { id: 3, stages: 5, stageTicks: 6000, item: 'coconut', regrowTo: 3 },
};
const KIND_BY_ID = Object.fromEntries(Object.entries(KINDS).map(([name, k]) => [k.id, name]));

export const cellKey = (i, j) => j * GRID_MAX + i;
export const dayOf = (tick) => Math.floor(tick / DAY_TICKS);
const maxGrowth = (kind) => KINDS[kind].stages * KINDS[kind].stageTicks * 1000;
const stageFor = (kind, growth) => Math.min(KINDS[kind].stages, Math.floor(growth / (KINDS[kind].stageTicks * 1000)));
const validCell = (i, j) => Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < GRID_MAX && j < GRID_MAX;

/** canPlant(i, j) -> bool is injected by the caller (terrain knowledge lives outside). */
export function createGarden({ seed = 0, canPlant = () => true } = {}) {
  return { seed: seed | 0, canPlant, crops: new Map(), lastPlant: new Map() };
}

export const cropAt = (g, i, j) => g.crops.get(cellKey(i, j)) || null;
export const isRipe = (c) => c.stage >= KINDS[c.kind].stages;

/** Distinct players who watered this crop during the day containing `tick`. */
export function visitorCount(c, tick) {
  return c.waterDay === dayOf(tick) ? c.waterers.length : 0;
}
export function visitorMultiplier(c, tick) {
  return WATERER_PERMILLE[Math.min(5, visitorCount(c, tick))];
}

// ---------- ops ----------

export function validatePlant(g, { i, j, kind, p }, tick) {
  if (!KINDS[kind] || !Object.hasOwn(KINDS, kind)) return 'bad-kind';
  if (typeof p !== 'string' || !p) return 'bad-player';
  if (!validCell(i, j)) return 'bad-cell';
  if (g.crops.has(cellKey(i, j))) return 'occupied';
  if (!g.canPlant(i, j)) return 'bad-ground';
  if (g.crops.size >= MAX_CROPS) return 'garden-full';
  const last = g.lastPlant.get(p);
  if (last !== undefined && tick - last < SEED_COOLDOWN_TICKS) return 'cooldown';
  return null;
}

export function plant(g, op, tick) {
  const why = validatePlant(g, op, tick);
  if (why) return { ok: false, reason: why };
  const { i, j, kind, p } = op;
  g.crops.set(cellKey(i, j), {
    kind, i, j, by: p, plantedTick: tick, hydratedTicks: 0, growth: 0, stage: 0,
    wetUntil: 0, waterDay: dayOf(tick), waterers: [], salted: -1,
  });
  g.lastPlant.set(p, tick);
  return { ok: true };
}

export function validateWater(g, { i, j, p }) {
  if (typeof p !== 'string' || !p) return 'bad-player';
  if (!validCell(i, j) || !g.crops.has(cellKey(i, j))) return 'no-crop';
  return null;
}

export function water(g, op, tick) {
  const why = validateWater(g, op);
  if (why) return { ok: false, reason: why };
  const c = cropAt(g, op.i, op.j);
  const d = dayOf(tick);
  if (c.waterDay !== d) { c.waterDay = d; c.waterers = []; }
  if (!c.waterers.includes(op.p)) { c.waterers.push(op.p); c.waterers.sort(); }
  c.wetUntil = Math.max(c.wetUntil, tick + WATER_TICKS);
  c.salted = -1; // fresh water rinses salt
  return { ok: true, visitors: c.waterers.length, multiplier: visitorMultiplier(c, tick) };
}

export function validateHarvest(g, { i, j, p }) {
  if (typeof p !== 'string' || !p) return 'bad-player';
  const c = validCell(i, j) && cropAt(g, i, j);
  if (!c) return 'no-crop';
  if (!isRipe(c)) return 'not-ripe';
  return null;
}

/** Returns {ok, item:{kind, count, to}}; the game spawns `count` throwable props for player `to`. */
export function harvest(g, op, tick) {
  const why = validateHarvest(g, op);
  if (why) return { ok: false, reason: why };
  const c = cropAt(g, op.i, op.j);
  const k = KINDS[c.kind];
  const rng = mulberry32(Math.imul(g.seed ^ 0x9e3779b9, 1) ^ Math.imul(cellKey(c.i, c.j) + 1, 0x85ebca6b) ^ Math.imul(tick + 1, 0xc2b2ae35));
  const chance = visitorCount(c, tick) >= 3 ? 500 : 150; // per-mille chance of a bonus item
  const count = 1 + (Math.floor(rng() * 1000) < chance ? 1 : 0);
  if (k.regrowTo === null) g.crops.delete(cellKey(c.i, c.j));
  else { c.growth = k.regrowTo * k.stageTicks * 1000; c.stage = k.regrowTo; }
  return { ok: true, item: { kind: k.item, count, to: op.p } };
}

/** Phase 6 hook: salt water touched this cell. */
export function salt(g, i, j, tick) {
  const c = validCell(i, j) && cropAt(g, i, j);
  if (!c) return false;
  if (c.salted < 0) c.salted = tick;
  return true;
}

// ---------- simulation ----------

/** Advance one tick `tick`. isWet(i, j) -> bool comes from the water sim. Call after that tick's ops. */
export function step(g, tick, isWet) {
  for (const [key, c] of g.crops) {
    if (tick < c.plantedTick) continue;
    if (c.salted >= 0) {
      if (tick - c.salted >= SALT_GRACE_TICKS) g.crops.delete(key);
      continue;
    }
    if (isRipe(c)) continue;
    if (tick < c.wetUntil || isWet(c.i, c.j)) {
      c.growth = Math.min(maxGrowth(c.kind), c.growth + visitorMultiplier(c, tick));
      c.hydratedTicks++;
      c.stage = stageFor(c.kind, c.growth);
    }
  }
}

/**
 * Offline catch-up over ticks [fromTick, toTick) without per-tick simulation.
 * wetFraction: per-mille (0..1000) of the time cells are wet, number or (i, j) => number.
 */
export function catchUp(g, fromTick, toTick, wetFraction = 0) {
  if (toTick <= fromTick) return;
  fromTick = Math.max(fromTick, toTick - MAX_CATCHUP_TICKS);
  for (const [key, c] of [...g.crops]) {
    const wf = Math.max(0, Math.min(1000, Math.floor(typeof wetFraction === 'function' ? wetFraction(c.i, c.j) : wetFraction)));
    const a = Math.max(fromTick, c.plantedTick);
    if (a >= toTick) continue;
    if (c.salted >= 0) {
      if (c.salted + SALT_GRACE_TICKS <= toTick - 1 && c.salted + SALT_GRACE_TICKS >= a) g.crops.delete(key);
      continue;
    }
    // Split at the boundaries of the watering day so the visitor multiplier applies only inside it.
    const ds = c.waterDay * DAY_TICKS, de = ds + DAY_TICKS;
    const segs = c.waterers.length
      ? [[a, Math.min(toTick, ds), 1000], [Math.max(a, ds), Math.min(toTick, de), visitorMultiplier(c, ds)], [Math.max(a, de), toTick, 1000]]
      : [[a, toTick, 1000]];
    for (const [s, e, mult] of segs) {
      const len = e - s;
      if (len <= 0 || isRipe(c)) continue;
      const handOverlap = Math.max(0, Math.min(len, c.wetUntil - s));
      let h = Math.max(handOverlap, Math.floor((len * wf) / 1000));
      h = Math.min(h, Math.ceil((maxGrowth(c.kind) - c.growth) / mult));
      c.growth = Math.min(maxGrowth(c.kind), c.growth + h * mult);
      c.hydratedTicks += h;
      c.stage = stageFor(c.kind, c.growth);
    }
  }
}

// ---------- persistence ----------

/** Compact JSON-safe snapshot, crops sorted by cell index, players sorted by id. */
export function serialize(g) {
  const keys = [...g.crops.keys()].sort((x, y) => x - y);
  return {
    v: 1,
    seed: g.seed,
    crops: keys.map((k) => {
      const c = g.crops.get(k);
      return [c.i, c.j, KINDS[c.kind].id, c.by, c.plantedTick, c.hydratedTicks, c.growth, c.wetUntil, c.waterDay, c.waterers.slice(), c.salted];
    }),
    lastPlant: [...g.lastPlant.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)),
  };
}

export function load(g, json) {
  g.seed = json.seed | 0;
  g.crops = new Map();
  g.lastPlant = new Map(json.lastPlant);
  for (const [i, j, id, by, plantedTick, hydratedTicks, growth, wetUntil, waterDay, waterers, salted] of json.crops) {
    const kind = KIND_BY_ID[id];
    g.crops.set(cellKey(i, j), {
      kind, i, j, by, plantedTick, hydratedTicks, growth, stage: stageFor(kind, growth),
      wetUntil, waterDay, waterers: waterers.slice(), salted,
    });
  }
}

/** FNV-1a over the canonical serialization -> uint32 (desync detection). */
export function hash(g) {
  const s = JSON.stringify(serialize(g));
  let h = 0x811c9dc5;
  for (let n = 0; n < s.length; n++) h = Math.imul(h ^ s.charCodeAt(n), 0x01000193);
  return h >>> 0;
}
