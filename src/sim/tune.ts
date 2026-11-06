// Playtest tuning (docs/playtest-kits/haul.md): the haul loop's lockstep numbers as a room-wide state, so a `proto-`
// room can change a cap or a cost for everyone at the same tick. The complete effective configuration, including
// defaults, is saved and hashed. Pure and deterministic (lockstep).
import { AGES, ROUTE, TRACK, costOf } from './route.ts';
import { HARD_CAP, HARD_MAX } from './stacks.ts';
import { FULL, YIELD, TRICKLE_EVERY, FULL_MAX } from './sources.ts';
import { WAGON_CRUISE, WAGON_ACCEL, type WagonPace } from './wagon.ts';
import { FNV_SEED, foldAll, foldStr } from './hash.ts';
import type { CostFn } from './sites.ts';

// APPEND ONLY: a key's index is folded into the hash. A key that goes away moves to RETIRED.
export const TUNABLES = [
  { key: 'cost0', def: AGES[0]!.cost, min: 2, max: 600, label: 'Section cost (wood)' },
  { key: 'helper0', def: AGES[0]!.helper, min: 1, max: 600, label: 'Helper hut cost (wood)' },
  { key: 'hard', def: HARD_CAP, min: 1, max: HARD_MAX, label: 'Hard cap' },
  { key: 'yield', def: YIELD, min: 1, max: 60, label: 'Logs per take' },
  { key: 'full', def: FULL, min: 1, max: FULL_MAX, label: 'Takes per bundle' },
  { key: 'trickle', def: TRICKLE_EVERY, min: 10, max: 6000, label: 'Bundle refill every (ticks)' },
  { key: 'wagonCruise', def: WAGON_CRUISE, min: 10, max: 100, label: 'Wagon cruise (cm per tick)' },
  { key: 'wagonAccel', def: WAGON_ACCEL, min: 5, max: 100, label: 'Wagon speed-up (ticks to cruise)' },
  { key: 'railRegrowMinutes', def: 31, min: 1, max: 1440, label: 'Railway regrowth wait (minutes)' },
  { key: 'railRecoveryMinutes', def: 21, min: 1, max: 1440, label: 'Railway drop recovery (minutes)' },
] as const;
// Keys a save may still hold from an older build, skipped on load: the soft cap and spill per jump (the haul stack's
// wobble and jump spill, removed after the first playtest) and the machine run variant (one run since the laying
// playtest).
const RETIRED: readonly string[] = ['soft', 'spill', 'run'];
export type TuneKey = (typeof TUNABLES)[number]['key'];
export type TuneSpec = (typeof TUNABLES)[number];
/** revision is authoritative; rev only invalidates views after edits or loads. */
export type Tune = { v: Record<TuneKey, number>; revision: number; rev: number };
export type TuneJson = { catalog: string; revision: number; values: Record<TuneKey, number> };

// The schema, key meanings and defaults are admission identity, even when a room never overrides anything.
export function tuneCatalog(
  specs: readonly { key: string; def: number; min: number; max: number; label: string }[],
): string {
  let h = foldStr(FNV_SEED, 'classic-tune:1:integer:next-action');
  for (const spec of specs) h = foldAll(foldStr(foldStr(h, spec.key), spec.label), [spec.def, spec.min, spec.max]);
  return h.toString(16).padStart(8, '0');
}
export const TUNE_CATALOG = tuneCatalog(TUNABLES);
const HASH_SEED = foldStr(FNV_SEED, TUNE_CATALOG);

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const defaults = (): Record<TuneKey, number> =>
  Object.fromEntries(TUNABLES.map((t) => [t.key, t.def])) as Record<TuneKey, number>;

export function createTune(): Tune {
  return { v: defaults(), revision: 0, rev: 0 };
}
export const specOf = (key: unknown): TuneSpec | null => TUNABLES.find((t) => t.key === key) ?? null;
// A known key and an integer within its bounds (state-free; the rules add what depends on the world).
export function okTune(key: unknown, v: unknown): boolean {
  const t = specOf(key);
  return !!t && isInt(v) && v >= t.min && v <= t.max;
}
export function setTune(t: Tune, key: TuneKey, v: number): void {
  t.v[key] = v;
  t.revision++;
  t.rev++;
}
// A ring's cost under this tuning: the wood age's from the tuning, every later age's default.
export const costIn =
  (t: Tune): CostFn =>
  (s, ring) =>
    ROUTE[s]?.age === 0 ? (ring === TRACK ? t.v.cost0 : t.v.helper0) : costOf(s, ring);

// The wagon's speed profile under this tuning (../sim/wagon.ts).
export const paceIn = (t: Tune): WagonPace => ({ cruise: t.v.wagonCruise, accel: t.v.wagonAccel });

// Tuning is for playtest rooms only: the room id (after the world namespace, ../world/namespace.ts) starts `proto-`.
export const isProtoRoom = (id: unknown): boolean => typeof id === 'string' && /^(v\d+-)?proto-/.test(id);

export function serializeTune(t: Tune): TuneJson {
  return { catalog: TUNE_CATALOG, revision: t.revision, values: { ...t.v } };
}
export function migrateTune(json: unknown): TuneJson {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tune: bad snapshot');
  // Some tools remove the version map from a current snapshot. Accept the already-versioned shape idempotently.
  if ('catalog' in json) return json as TuneJson;
  const v = defaults();
  for (const [key, n] of Object.entries(json)) {
    if (RETIRED.includes(key)) continue;
    if (!okTune(key, n)) throw new Error(`tune: bad ${key}`);
    v[key as TuneKey] = n;
  }
  return { catalog: TUNE_CATALOG, revision: 0, values: v };
}
// The one published v1 profile (main e7fbc853) had these eight integer keys. Do not
// derive its identity/ranges from a future catalog: unknown defaults must stay refused.
const MAIN_V1_BOUNDS = {
  cost0: [2, 600],
  helper0: [1, 600],
  hard: [1, 200],
  yield: [1, 60],
  full: [1, 20],
  trickle: [10, 6000],
  wagonCruise: [10, 100],
  wagonAccel: [5, 100],
} as const;
export function migrateTuneV1(json: unknown): TuneJson {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tune: bad v1 snapshot');
  const j = json as Partial<TuneJson>;
  // Legacy v0 migration and tools that strip versions may already produce the current shape.
  // loadTune still validates every field afterward; this is not an admission compatibility rule.
  if (j.catalog === TUNE_CATALOG) return j as TuneJson;
  if (j.catalog !== 'e0d64927') throw new Error('tune: incompatible v1 catalog');
  if (!isInt(j.revision) || j.revision < 0) throw new Error('tune: bad v1 revision');
  if (!j.values || typeof j.values !== 'object' || Array.isArray(j.values)) throw new Error('tune: missing v1 values');
  const entries = Object.entries(j.values);
  if (
    entries.length !== 8 ||
    entries.some(([key, n]) => {
      if (!Object.hasOwn(MAIN_V1_BOUNDS, key)) return true;
      const [min, max] = MAIN_V1_BOUNDS[key as keyof typeof MAIN_V1_BOUNDS];
      return !isInt(n) || n < min || n > max;
    })
  )
    throw new Error('tune: incomplete or invalid v1 values');
  return { catalog: TUNE_CATALOG, revision: j.revision, values: { ...defaults(), ...j.values } };
}
export function loadTune(t: Tune, json: unknown): void {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tune: bad snapshot');
  const j = json as Partial<TuneJson>;
  if (j.catalog !== TUNE_CATALOG) throw new Error('tune: incompatible catalog');
  if (!isInt(j.revision) || j.revision < 0) throw new Error('tune: bad revision');
  if (!j.values || typeof j.values !== 'object' || Array.isArray(j.values)) throw new Error('tune: missing values');
  const entries = Object.entries(j.values);
  if (entries.length !== TUNABLES.length || entries.some(([key, n]) => !okTune(key, n)))
    throw new Error('tune: incomplete or invalid values');
  Object.assign(t, { v: { ...j.values }, revision: j.revision, rev: t.rev + 1 });
}
// Full values and revision in stable key order; defaults never disappear from the identity.
export function hashTune(t: Tune): number {
  let h = foldAll(HASH_SEED, [t.revision]);
  TUNABLES.forEach(({ key }, k) => {
    h = foldAll(h, [k, t.v[key]]);
  });
  return h;
}
