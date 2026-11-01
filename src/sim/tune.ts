// Playtest tuning (docs/playtest-kits/haul.md): the haul loop's lockstep numbers as a room-wide state, so a `proto-`
// room can change a cap or a cost for everyone at the same tick. Every key defaults to today's constant, and only
// overrides are saved and hashed, so a room that never tunes anything is unchanged. Pure and deterministic (lockstep).
import { AGES, ROUTE, TRACK, costOf } from './route.ts';
import { HARD_CAP, HARD_MAX } from './stacks.ts';
import { FULL, YIELD, TRICKLE_EVERY, FULL_MAX } from './sources.ts';
import { WAGON_CRUISE, WAGON_ACCEL, type WagonPace } from './wagon.ts';
import { FNV_SEED, foldAll } from './hash.ts';
import { RUNS } from './scripted-run.ts';
import type { CostFn } from './sites.ts';

// APPEND ONLY: a key's index is folded into the hash. A key that goes away moves to RETIRED.
export const TUNABLES = [
  { key: 'cost0', def: AGES[0].cost, min: 2, max: 600, label: 'Section cost (wood)' },
  { key: 'helper0', def: AGES[0].helper, min: 1, max: 600, label: 'Helper hut cost (wood)' },
  { key: 'hard', def: HARD_CAP, min: 1, max: HARD_MAX, label: 'Hard cap' },
  { key: 'yield', def: YIELD, min: 1, max: 60, label: 'Logs per take' },
  { key: 'full', def: FULL, min: 1, max: FULL_MAX, label: 'Takes per bundle' },
  { key: 'trickle', def: TRICKLE_EVERY, min: 10, max: 6000, label: 'Bundle refill every (ticks)' },
  { key: 'wagonCruise', def: WAGON_CRUISE, min: 10, max: 100, label: 'Wagon cruise (cm per tick)' },
  { key: 'wagonAccel', def: WAGON_ACCEL, min: 5, max: 100, label: 'Wagon speed-up (ticks to cruise)' },
  { key: 'run', def: 0, min: 0, max: RUNS.length - 1, label: 'Machine run (0 crawl, 1 quick, 2 push)' },
] as const;
// Keys a save may still hold from an older build, skipped on load: the soft cap and spill per jump (the haul stack's
// wobble and jump spill, removed after the first playtest).
const RETIRED: readonly string[] = ['soft', 'spill'];
export type TuneKey = (typeof TUNABLES)[number]['key'];
export type TuneSpec = (typeof TUNABLES)[number];
/** v: every key's current value; rev counts every change, for views (neither saved nor hashed). */
export type Tune = { v: Record<TuneKey, number>; rev: number };
/** Saved form: the overrides only, by key. */
export type TuneJson = Partial<Record<TuneKey, number>>;

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const defaults = (): Record<TuneKey, number> =>
  Object.fromEntries(TUNABLES.map((t) => [t.key, t.def])) as Record<TuneKey, number>;

export function createTune(): Tune {
  return { v: defaults(), rev: 0 };
}
export const specOf = (key: unknown): TuneSpec | null => TUNABLES.find((t) => t.key === key) ?? null;
// A known key and an integer within its bounds (state-free; the rules add what depends on the world).
export function okTune(key: unknown, v: unknown): boolean {
  const t = specOf(key);
  return !!t && isInt(v) && v >= t.min && v <= t.max;
}
export function setTune(t: Tune, key: TuneKey, v: number): void {
  t.v[key] = v;
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
  const out: TuneJson = {};
  for (const { key, def } of TUNABLES) if (t.v[key] !== def) out[key] = t.v[key];
  return out;
}
export function loadTune(t: Tune, json: unknown): void {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tune: bad snapshot');
  const v = defaults();
  for (const [key, n] of Object.entries(json)) {
    if (RETIRED.includes(key)) continue;
    if (!okTune(key, n)) throw new Error(`tune: bad ${key}`);
    v[key as TuneKey] = n;
  }
  Object.assign(t, { v, rev: t.rev + 1 });
}
// Overrides only, as [key index, value] in key order: a key at its default adds nothing.
export function hashTune(t: Tune): number {
  let h = FNV_SEED;
  TUNABLES.forEach(({ key, def }, k) => {
    if (t.v[key] !== def) h = foldAll(h, [k, t.v[key]]);
  });
  return h;
}
