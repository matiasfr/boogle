// The away credit (docs/decisions.md, "2026-11-06, economy principles amended"): an empty room is paused, and
// the next join applies one credit for the time away. Each producer's yard fills H × (1 − e^(−away/H)) of production
// time, never past the yard, and the funded job finishes. Pure integer ticks in, integer ticks out; e^(−x) is a
// polynomial (no Math.exp in src/sim, docs/agents/lockstep.md), so every host computes the same credit.
//
//   railAwayCredit(awayTicks)        production ticks to credit (≤ awayTicks, < H)
//   RAIL_AWAY.finishTicks            an absence at least this long finishes the funded job

/** Rule ticks are 100 ms; the railway's markers use the same unit. */
const TICKS_PER_HOUR = 36000;
export const RAIL_AWAY = {
  /** H, the credit's soft limit: an absence of H credits ~63% of H, a long one approaches H. Tunable. */
  hours: 2,
  /** A room keeps simulating this long after it empties, for reloads (server cfg.roomPauseMs). */
  pauseMs: 30000,
  /** An absence of at least one pause grace finishes the funded job; a shorter one (a quick restart) only advances it. */
  finishTicks: 300,
} as const;
const INV_E = 0.36787944117144233; // e^(−1)
/** e^(−x) for x ≥ 0 with + − × ÷ only: e^(−1) per whole unit, then a Taylor series on the fraction. */
export function expNeg(x: number): number {
  if (!(x > 0)) return 1;
  if (x >= 64) return 0;
  const whole = Math.floor(x);
  const f = x - whole;
  let sum = 1,
    term = 1;
  for (let n = 1; n <= 20; n++) {
    term = (-term * f) / n;
    sum += term;
  }
  for (let k = 0; k < whole; k++) sum *= INV_E;
  return sum;
}
/** Production ticks credited for `awayTicks` away, with soft limit `hours`: floor(H × (1 − e^(−away/H))). */
export function railAwayCredit(awayTicks: number, hours: number = RAIL_AWAY.hours): number {
  if (!Number.isSafeInteger(awayTicks) || awayTicks <= 0 || !(hours > 0)) return 0;
  const h = hours * TICKS_PER_HOUR;
  return Math.min(awayTicks, Math.floor(h * (1 - expNeg(awayTicks / h))));
}
