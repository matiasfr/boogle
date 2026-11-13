// Playtest tuning (docs/playtest-kits/haul.md): the haul loop's lockstep numbers as a room-wide state, so a `proto-`
// room can change a cap or a cost for everyone at the same tick. The complete effective configuration, including
// defaults, is saved and hashed. Pure and deterministic (lockstep).
import { AGES, ROUTE, TRACK, costOf } from './route.ts';
import { HARD_CAP, HARD_MAX } from './stacks.ts';
import { FULL, YIELD, TRICKLE_EVERY, FULL_MAX } from './sources.ts';
import { WAGON_CRUISE, WAGON_ACCEL, type WagonPace } from './wagon.ts';
import { FNV_SEED, foldAll } from './hash.ts';
import type { CostFn } from './sites.ts';

// Stable order: a key's index is folded into the hash.
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
  { key: 'railFeedMs', def: 70, min: 10, max: 1000, label: 'Railway feed interval (milliseconds)' },
  { key: 'railLaySpeed', def: 50, min: 1, max: 200, label: 'Railway laying speed (centimetres per tick)' },
  { key: 'railDepartureTicks', def: 20, min: 0, max: 100, label: 'Railway departure easing (ticks)' },
  { key: 'railBeamSoloSpeed', def: 220, min: 10, max: 1000, label: 'Railway solo beam speed (centimetres per second)' },
  {
    key: 'railBeamHelpSpeed',
    def: 500,
    min: 10,
    max: 2000,
    label: 'Railway helped beam speed (centimetres per second)',
  },
  {
    key: 'railJumpImpulse',
    def: 680,
    min: 100,
    max: 2000,
    label: 'Railway second jump impulse (centimetres per second)',
  },
  { key: 'railJumpTurn', def: 70, min: 0, max: 100, label: 'Railway second jump turn (percent)' },
  {
    key: 'railJumpSteer',
    def: 2500,
    min: 1400,
    max: 5000,
    label: 'Railway second jump steering (centimetres per second squared)',
  },
  {
    key: 'railJumpApexSpeed',
    def: 160,
    min: 0,
    max: 1000,
    label: 'Railway second jump apex threshold (centimetres per second)',
  },
  { key: 'railBeamGraceS', def: 180, min: 5, max: 3600, label: 'Railway beam kept for an absent carrier (seconds)' },
  // The glider (piece B), at docs/research/botw-glide-target.md's target. Appended: the order is hashed.
  { key: 'railGlideSpeed', def: 1000, min: 300, max: 2000, label: 'Railway glide speed (centimetres per second)' },
  { key: 'railGlideSink', def: 320, min: 50, max: 1500, label: 'Railway glide sink (centimetres per second)' },
  {
    key: 'railGlideAccel',
    def: 1800,
    min: 200,
    max: 6000,
    label: 'Railway glide speed-up (centimetres per second squared)',
  },
  {
    key: 'railGlideBrake',
    def: 1200,
    min: 100,
    max: 6000,
    label: 'Railway glide brake, stick let go (centimetres per second squared)',
  },
  {
    key: 'railGlideOver',
    def: 800,
    min: 100,
    max: 6000,
    label: 'Railway glide settle from overspeed (centimetres per second squared)',
  },
  { key: 'railGlideTurnTau', def: 120, min: 20, max: 1000, label: 'Railway glide turn time constant (milliseconds)' },
  { key: 'railGlideTurnMax', def: 360, min: 45, max: 1080, label: 'Railway glide turn rate cap (degrees per second)' },
  { key: 'railGlideDeploy', def: 100, min: 10, max: 1000, label: 'Railway glide deploy (milliseconds)' },
  // The boiler's haul pace on its rope (docs/plans/boiler-first-choice.md, step 7; designer, 9 November).
  {
    key: 'railBoilerSoloSpeed',
    def: 300,
    min: 10,
    max: 1000,
    label: 'Railway solo boiler speed (centimetres per second)',
  },
  {
    key: 'railBoilerHelpSpeed',
    def: 540,
    min: 10,
    max: 2000,
    label: 'Railway helped boiler speed (centimetres per second)',
  },
  // A footing's own pace, no longer the great beam's (docs/plans/works-late-game.md, step 2b). Appended: hashed order.
  {
    key: 'railFootSoloSpeed',
    def: 300,
    min: 10,
    max: 1000,
    label: 'Railway solo footing speed (centimetres per second)',
  },
  {
    key: 'railFootHelpSpeed',
    def: 540,
    min: 10,
    max: 2000,
    label: 'Railway helped footing speed (centimetres per second)',
  },
  // The trains' headway hold at a line's ends (docs/plans/generic-lines.md, 4; railway-trains.ts TRAIN_HEAD_PCT).
  // The greybox route's grown line 2 (docs/plans/greybox-route.md, rulings on round 3): the default 75% does not pass
  // its wait gates 8 and 9 on five trains; 0, 25 and 50% did not either, measured under-asked (not re-run on the
  // gates' ruled ask method); see owner question 1.
  {
    key: 'railTrainHeadPct',
    def: 75,
    min: 0,
    max: 100,
    label: 'Railway train headway hold (percent of an even split)',
  },
  // Slice 5's trade (docs/plans/slice5-town-economy.md, R3): the fare, the riders and (R4) the prices, as percents of
  // the stand-ins in src/sim/railway-trade-layout.ts. Appended: hashed order.
  { key: 'railFarePct', def: 100, min: 0, max: 1000, label: 'Railway fares (percent of the stand-in fare)' },
  { key: 'railRiderPct', def: 100, min: 0, max: 1000, label: 'Railway riders (percent of the stand-in rate)' },
  { key: 'railPricePct', def: 100, min: 1, max: 1000, label: 'Railway prices (percent of the stand-in prices)' },
  // The Ring Island hold (docs/plans/short-turn.md, the ruling on step 1's sheet, call 7; railway-trains.ts
  // TRAIN_HOLD): how long past its arrival plus the dwell a train may stand at a control halt (a lever ask at its own
  // platform restarts the dwell, as at the end holds), and the gap difference that stops it, as a percent of an even
  // split of the line's whole circuit over its most trains. Either at 0 turns the hold off.
  // Appended: hashed order.
  {
    key: 'railTrainHoldCap',
    def: 200,
    min: 0,
    max: 1800,
    label: 'Railway train hold at a control halt (most ticks past arrival plus the dwell)',
  },
  {
    key: 'railTrainHoldPct',
    def: 15,
    min: 0,
    max: 100,
    label: 'Railway train hold at a control halt (gap difference, percent of an even split)',
  },
] as const;
export type TuneKey = (typeof TUNABLES)[number]['key'];
export type TuneSpec = (typeof TUNABLES)[number];
/** revision is authoritative; rev only invalidates views after edits or loads. */
export type Tune = { v: Record<TuneKey, number>; revision: number; rev: number };
export type TuneJson = { revision: number; values: Record<TuneKey, number> };

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
  return { revision: t.revision, values: { ...t.v } };
}
export function loadTune(t: Tune, json: unknown): void {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tune: bad snapshot');
  const j = json as Partial<TuneJson>;
  if (!isInt(j.revision) || j.revision < 0) throw new Error('tune: bad revision');
  if (!j.values || typeof j.values !== 'object' || Array.isArray(j.values)) throw new Error('tune: missing values');
  const entries = Object.entries(j.values);
  if (entries.length !== TUNABLES.length || entries.some(([key, n]) => !okTune(key, n)))
    throw new Error('tune: incomplete or invalid values');
  Object.assign(t, { v: { ...j.values }, revision: j.revision, rev: t.rev + 1 });
}
// Full values and revision in stable key order; defaults never disappear from the identity.
export function hashTune(t: Tune): number {
  let h = foldAll(FNV_SEED, [t.revision]);
  TUNABLES.forEach(({ key }, k) => {
    h = foldAll(h, [k, t.v[key]]);
  });
  return h;
}
