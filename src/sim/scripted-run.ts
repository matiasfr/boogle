// Scripted runs: something that plays out over a fixed number of ticks from a start tick, the same on every peer with
// no state but t0 (a machine laying track; later, spark and balloon emitters). Integer only (lockstep), like
// ./sky-clock.ts. Visuals read the same function at a smooth fractional tick (src/netplay/shared-time.ts).
//
//   script        [{ name, len }]: phases in order, len in ticks (integers > 0)
//   runAt(script, t0, tick) -> { phase, name, progress, total, done }
//     phase       index of the current phase (-1 before t0 or with no run; the last one once done)
//     progress    0..1000 through the current phase; total 0..1000 through the whole run

export type Phase = { name: string; len: number };
export type RunState = { phase: number; name: string; progress: number; total: number; done: boolean };

export const lengthOf = (script: readonly Phase[]): number => script.reduce((t, p) => t + p.len, 0);

export function runAt(script: readonly Phase[], t0: number, tick: number): RunState {
  const len = lengthOf(script);
  if (t0 < 0 || tick < t0) return { phase: -1, name: '', progress: 0, total: 0, done: false };
  let e = tick - t0;
  if (e >= len)
    return { phase: script.length - 1, name: script[script.length - 1].name, progress: 1000, total: 1000, done: true };
  const total = Math.floor((e * 1000) / len);
  let k = 0;
  while (e >= script[k].len) e -= script[k++].len; // e < len, so this stops inside the script
  return { phase: k, name: script[k].name, progress: Math.floor((e * 1000) / script[k].len), total, done: false };
}

// The wood-age track layer: it warms up, lays the section's sleepers and rails, and whistles. 14 s: the quick run the
// laying playtest picked (docs/proposals/boogle-2.md, 2026-11-01); the 50 s crawl and the push run were cut.
export const MACHINE_RUN: readonly Phase[] = [
  { name: 'warm', len: 15 },
  { name: 'lay', len: 110 },
  { name: 'whistle', len: 15 },
];
