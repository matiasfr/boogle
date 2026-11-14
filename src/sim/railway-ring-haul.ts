// Railhead traveller, step 1: a pose derived only from the haul's inputs and the rule clock.
// No row fields or live callers yet; docs/plans/railhead-traveller.md owns their later integration.
import { RING_HEAD } from './railway-ring-layout.ts';

/** Rule ticks (100 ms), centimetres per tick. The archived MOVE timings, without the view's landed gate. */
export const HAUL = { after: 60, ready: 10, speed: 50, ramp: 8, settle: 9 } as const;

/** Structural input, not an ECS/wire schema. set is a nonnegative footing count; moved is -1 before any pair,
 * otherwise its accepted rule tick. from is the deck end's u in cm at that tick, no farther than haulTarget. */
export type RailheadHaul = Readonly<{ set: number; moved: number; from: number }>;

/** Ticks of travel over dist cm. Short remainders use the archived smoothstep, at least half a second. */
export const haulTravel = (dist: number) =>
  dist >= HAUL.speed * HAUL.ramp ? dist / HAUL.speed + HAUL.ramp : Math.max(5, (3 * dist) / (2 * HAUL.speed));

/** Centimetres travelled t ticks into a haul: eased ends, at most HAUL.speed, clamped before/after travel.
 * Keep fractional positions: quantizing here would make the view jump at centimetre boundaries. */
export function haulAlong(dist: number, t: number) {
  if (dist <= 0 || t <= 0) return 0;
  const total = haulTravel(dist);
  if (t >= total) return dist;
  if (dist < HAUL.speed * HAUL.ramp) {
    const k = t / total;
    return dist * k * k * (3 - 2 * k);
  }
  const { speed, ramp } = HAUL;
  if (t < ramp) return (speed * t * t) / (2 * ramp);
  if (t > total - ramp) {
    const left = total - t;
    return dist - (speed * left * left) / (2 * ramp);
  }
  return speed * (t - ramp / 2);
}

/** The last completed pair's head; later island footings leave it at head 7. */
export const haulTarget = (a: Pick<RailheadHaul, 'set'>) => RING_HEAD[Math.min(7, Math.floor(a.set / 2))]!.u;

/** Ticks since told (negative during construction). Callers skip cues when moved < 0. */
export const haulPhase = (a: RailheadHaul, tick: number) => tick - a.moved - HAUL.after;

/** The deck end's u in cm, including fractional view ticks. Learning a row late never starts a new haul. */
export function haulU(a: RailheadHaul, tick: number) {
  const target = haulTarget(a);
  return a.moved < 0 ? target : a.from + haulAlong(target - a.from, haulPhase(a, tick) - HAUL.ready);
}

/** First whole rule tick at which chocking has finished, or -1 before any pair. */
export function haulEnd(a: RailheadHaul) {
  if (a.moved < 0) return -1;
  const travel = haulTravel(haulTarget(a) - a.from);
  return a.moved + HAUL.after + HAUL.ready - Math.floor(-travel) + HAUL.settle;
}

export const haulSettled = (a: RailheadHaul, tick: number) => a.moved < 0 || tick >= haulEnd(a);
