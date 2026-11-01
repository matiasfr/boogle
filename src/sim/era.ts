// Eras and opening day (vertical-slice S1, S3; docs/plans/find-the-fun.md step 4). The era is derived, never stored:
// it comes from the age and the sections laid (`sites`) plus one flag, the tick opening day started. Opening day can
// start once the age's last section is laid; it is a scripted run (./scripted-run.ts): a gathering call (up to CALL_S,
// ended early once everyone is at the platform: one stamped tick, `here`), then the bell countdown, then the era turns
// over. Pure and integer only (lockstep), like ./sites.ts.
import { ROUTE } from './route.ts';
import { runAt, type Phase, type RunState } from './scripted-run.ts';
import { MS_PER_TICK } from './bank.ts';
import { FNV_SEED, fold } from './hash.ts';

/** The gathering call's longest run, in seconds (docs/research/shared-moments-and-events.md, rec 1): about the walk
 * from anywhere on the island to the platform. It ends early once every online player is at the platform. */
export const CALL_S = 45;
/** Seconds of bell before the swap. The owner hasn't decided whether to keep the countdown: this is its one knob. */
export const BELL_S = 10;
export const CALL_TICKS = (CALL_S * 1000) / MS_PER_TICK;
export const BELL_TICKS = (BELL_S * 1000) / MS_PER_TICK;
/** The full script, when nobody ends the call early. */
export const OPENING_DAY: readonly Phase[] = [
  { name: 'call', len: CALL_TICKS },
  { name: 'bell', len: BELL_TICKS },
];

/** How many ROUTE sections belong to ages up to and including `age`. */
export const sectionsThrough = (age: number): number => ROUTE.filter((s) => s.age <= age).length;
/** The first age's last section is laid (laid = sections laid from the start, `sites.open`): opening day may start. */
export const openingReady = (laid: number): boolean => laid >= sectionsThrough(0);

/**
 * The era the island shows: 1 until the first age's opening day has played out, then 2 (later ages add more).
 *   age     the age the route has reached (./sites.ts ageAt)
 *   laid    sections laid (`sites.open`)
 *   opened  opening day's countdown is over
 */
export function eraOf(age: number, laid: number, opened: boolean): number {
  return opened && age >= 1 && openingReady(laid) ? 2 : 1;
}

/**
 * Opening day's state: the tick it started, -1 before; `here` the tick everyone was at the platform (the call ended
 * early), -1 if not (yet). `laid`: the playtest shortcut `open.lay`'s [first section it
 * laid, tick], or null (so a late joiner knows when those sections came, for the wagon's timetable). rev counts changes
 * for views (neither saved nor hashed).
 */
export type Opening = { t0: number; here: number; laid: [number, number] | null; rev: number };
export const createOpening = (): Opening => ({ t0: -1, here: -1, laid: null, rev: 0 });
export const canOpen = (o: Opening, laid: number): boolean => o.t0 < 0 && openingReady(laid);
export function startOpening(o: Opening, tick: number): void {
  o.t0 = tick;
  o.rev++;
}
/** The call can still be ended early: it is running and nobody has ended it. */
export const canGather = (o: Opening, tick: number): boolean => o.t0 >= 0 && o.here < 0 && tick < o.t0 + CALL_TICKS;
export function gather(o: Opening, tick: number): void {
  o.here = tick;
  o.rev++;
}
export function resetOpening(o: Opening): void {
  o.t0 = -1;
  o.here = -1;
  o.laid = null;
  o.rev++;
}
/** Notes that `open.lay` laid every section from `from` on at `tick`. */
export function noteLaid(o: Opening, from: number, tick: number): void {
  o.laid = [from, tick];
  o.rev++;
}
/** This run's script: the call cut short at `here` (at least a tick), then the bell. */
export const scriptOf = (o: Opening): readonly Phase[] =>
  o.here < 0
    ? OPENING_DAY
    : [
        { name: 'call', len: Math.max(1, Math.min(CALL_TICKS, o.here - o.t0)) },
        { name: 'bell', len: BELL_TICKS },
      ];
/** The tick the bell starts (-1 before opening day). */
export const bellTick = (o: Opening): number => (o.t0 < 0 ? -1 : o.t0 + scriptOf(o)[0].len);
export const openingAt = (o: Opening, tick: number): RunState => runAt(scriptOf(o), o.t0, tick);
export const openedAt = (o: Opening, tick: number): boolean => openingAt(o, tick).done;

// `la` only once the shortcut was used, `h` only once the call ended early: an untouched room saves and hashes as
// before.
export function serializeOpening(o: Opening): { t0: number; h?: number; la?: [number, number] } {
  const out: { t0: number; h?: number; la?: [number, number] } = { t0: o.t0 };
  if (o.here >= 0) out.h = o.here;
  if (o.laid) out.la = [o.laid[0], o.laid[1]];
  return out;
}
export function loadOpening(o: Opening, json: unknown): void {
  const { t0, h, la } = (json ?? {}) as { t0?: unknown; h?: unknown; la?: unknown };
  if (!Number.isSafeInteger(t0) || (t0 as number) < -1) throw new Error('opening: bad snapshot');
  if (h !== undefined && (!Number.isSafeInteger(h) || (h as number) < 0)) throw new Error('opening: bad h');
  const ok = Array.isArray(la) && la.length === 2 && la.every((n) => Number.isSafeInteger(n) && n >= 0);
  if (la !== undefined && !ok) throw new Error('opening: bad la');
  o.t0 = t0 as number;
  o.here = h === undefined ? -1 : (h as number);
  o.laid = ok ? [la[0], la[1]] : null;
  o.rev++;
}
export const hashOpening = (o: Opening): number => {
  let h = fold(FNV_SEED, o.t0 + 1);
  if (o.laid) h = fold(fold(h, o.laid[0]), o.laid[1]);
  return o.here >= 0 ? fold(fold(h, 0x68657265), o.here) : h; // 'here', so h never collides with la
};
