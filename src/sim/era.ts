// Eras and opening day (vertical-slice S1, S3; docs/plans/find-the-fun.md step 4). The era is derived, never stored:
// it comes from the age and the sections laid (`sites`) plus one flag, the tick opening day started. Opening day can
// start once the age's last section is laid; it is a scripted run (./scripted-run.ts): a bell countdown, then the
// era turns over. Pure and integer only (lockstep), like ./sites.ts.
import { ROUTE } from './route.ts';
import { runAt, type Phase, type RunState } from './scripted-run.ts';
import { MS_PER_TICK } from './bank.ts';
import { FNV_SEED, fold } from './hash.ts';

/** Seconds of bell before the swap. The owner hasn't decided whether to keep the countdown: this is its one knob. */
export const BELL_S = 10;
export const OPENING_DAY: readonly Phase[] = [{ name: 'bell', len: (BELL_S * 1000) / MS_PER_TICK }];

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

/** Opening day's state: the tick it started, -1 before. rev counts changes for views (neither saved nor hashed). */
export type Opening = { t0: number; rev: number };
export const createOpening = (): Opening => ({ t0: -1, rev: 0 });
export const canOpen = (o: Opening, laid: number): boolean => o.t0 < 0 && openingReady(laid);
export function startOpening(o: Opening, tick: number): void {
  o.t0 = tick;
  o.rev++;
}
export function resetOpening(o: Opening): void {
  o.t0 = -1;
  o.rev++;
}
export const openingAt = (o: Opening, tick: number): RunState => runAt(OPENING_DAY, o.t0, tick);
export const openedAt = (o: Opening, tick: number): boolean => openingAt(o, tick).done;

export const serializeOpening = (o: Opening): { t0: number } => ({ t0: o.t0 });
export function loadOpening(o: Opening, json: unknown): void {
  const t0 = (json as { t0?: unknown } | null)?.t0;
  if (!Number.isSafeInteger(t0) || (t0 as number) < -1) throw new Error('opening: bad snapshot');
  o.t0 = t0 as number;
  o.rev++;
}
export const hashOpening = (o: Opening): number => fold(FNV_SEED, o.t0 + 1);
