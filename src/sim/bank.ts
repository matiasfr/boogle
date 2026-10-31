// The offline helper bank (brief 10 M8): helper huts keep working while nobody hosts, capped at one section's worth.
// Ticks only run while someone hosts and world.epochMs is the wall time of tick 0, so the time nobody hosted is
// now - (epochMs + tick * MS_PER_TICK); `credited` is what earlier wakes already banked. Pure: the host computes the
// gap from its clock, the lockstep op only ever sees the number it validated.
export const MS_PER_TICK = 100; // src/world/sync.ts TICK_MS
export const MIN_GAP_MS = 60000; // shorter absences (a host hand-over, a reload) bank nothing
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

export function offlineGap(now: number, epochMs: number, tick: number, credited: number): number {
  if (![now, epochMs, tick, credited].every(isInt)) return 0;
  return Math.max(0, now - (epochMs + tick * MS_PER_TICK) - credited); // clock skew: never negative
}

// Freight pieces `helpers` huts make in `ms`, one per hut every `every` ticks, capped at `cap` (a section).
export const offlineFreight = (helpers: number, ms: number, every: number, cap: number): number =>
  Math.min(cap, Math.floor((helpers * ms) / (every * MS_PER_TICK)));
