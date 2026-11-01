// Scripted runs: something that plays out over a fixed number of ticks from a start tick, the same on every peer with
// no state but t0 (a machine laying track; later, spark and balloon emitters). Integer only (lockstep), like
// ./sky-clock.js. Visuals read the same function at a smooth fractional tick (src/netplay/shared-time.ts).
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

// The wood-age track layer: it warms up, crawls the section laying track, and whistles. 50 s.
export const MACHINE_RUN: readonly Phase[] = [
  { name: 'warm', len: 30 },
  { name: 'lay', len: 450 },
  { name: 'whistle', len: 20 },
];
// Laying-run variants (docs/game-design/haul.md, "Machine runs"), chosen per room by the `run` tune key (./tune.ts) so
// every peer and the server play the same script. APPEND ONLY: a variant's index is the tuned value.
//   crawl  today's run (MACHINE_RUN)
//   quick  the same three phases in 14 s
//   push   its lay phase only advances while players push (./sites.ts stallRun / pushRun): ~25 s for one pusher
export const QUICK_RUN: readonly Phase[] = [
  { name: 'warm', len: 15 },
  { name: 'lay', len: 110 },
  { name: 'whistle', len: 15 },
];
export const PUSH_RUN: readonly Phase[] = [
  { name: 'warm', len: 20 },
  { name: 'lay', len: 250 },
  { name: 'whistle', len: 20 },
];
export const RUNS = [MACHINE_RUN, QUICK_RUN, PUSH_RUN] as const;
export const RUN_KINDS = ['crawl', 'quick', 'push'] as const;
export const PUSH_RUN_KIND = 2;
export const PUSH_TICKS = 5; // lay ticks one push (site.push) buys: a pusher sends one every 5 ticks, so solo runs at 1x
