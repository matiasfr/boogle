// Timing budgets that survive a busy machine. A budget test exists to catch an algorithmic regression (tens of times
// slower), not a noisy neighbour (a few times slower), so: measure up to RUNS times and keep each metric's best,
// stop at the first run that is within budget, and stretch the absolute limits by the machine's load (capped, so a
// real regression still stands out). Over a limit is a printed warning with the numbers, never a failure. Each test
// also has hard limits, 2x its warning limits and far above today's numbers (17x or more today's idle best, and over 2x
// the worst best seen with 20 copies running beside npm run check on HOTBOX), stretched by the same load scale: only a
// real regression, tens of times slower, fails (owner, 11 November: "Add a limit far above today's numbers").
// BUDGET_RUNS and BUDGET_LOAD_SCALE=off override, for debugging. os.loadavg() is all zeros on Windows, so the load
// scale is always 1 on HOTBOX.
import os from 'node:os';

export const RUNS = Number(process.env.BUDGET_RUNS) || 5;
const MAX_SCALE = 4;

/** 1 on an idle machine; the 1-minute load average over cores when busier, capped at MAX_SCALE. */
export function loadScale(): number {
  if (process.env.BUDGET_LOAD_SCALE === 'off') return 1;
  const s = os.loadavg()[0]! / os.availableParallelism();
  return Math.min(MAX_SCALE, Math.max(1, s));
}

export type Metrics = Record<string, number>;

/**
 * Runs `measure` until every metric is within `limits * loadScale()` (or RUNS runs), returning the per-metric minimum
 * and the limits that applied. Each run builds its own state, so a slow run poisons nothing.
 */
export function measureWithinBudget<M extends Metrics>(
  limits: Record<keyof M, number>,
  measure: () => M,
): { best: M; limits: Record<keyof M, number>; scale: number; runs: number } {
  const scale = loadScale();
  const keys = Object.keys(limits) as (keyof M & string)[];
  const scaled = {} as Record<keyof M, number>;
  for (const k of keys) scaled[k] = limits[k] * scale;
  let best: M | undefined;
  let runs = 0;
  while (runs < RUNS) {
    runs++;
    const m = measure();
    if (!best) best = { ...m };
    else for (const k of keys) best[k] = Math.min(best[k]!, m[k]!) as M[typeof k];
    if (keys.every((k) => best![k]! < scaled[k])) break;
  }
  return { best: best!, limits: scaled, scale, runs };
}

/**
 * A timing budget guides and never fails a run (owner, 10 November: performance numbers guide, they never fail a build
 * or cut scope; docs/agents/owner-calls.md, "Performance guides, it doesn't gate"). The metrics over their limits as one
 * printed warning line that keeps the numbers, or null when all are within them. `print` is console.warn by default.
 */
export function budgetWarning(
  name: string,
  best: Metrics,
  limits: Metrics,
  scale: number,
  runs: number,
  print: (line: string) => void = console.warn,
): string | null {
  const over = overBudget(best, limits, scale, runs);
  if (!over) return null;
  const line = `warning: ${name} over its timing target (reported, not a failure): ${over}`;
  print(line);
  return line;
}

/**
 * The tripwire under the warning: the metrics over their hard limits (stretched by the same load scale) as one failure
 * message, or '' when all are within them. The test asserts it is ''. Hard limits sit above the warning limits, so a
 * run over one keeps measuring up to RUNS times first and the best of those is what is judged.
 */
export function hardLimitFailure(name: string, best: Metrics, hard: Metrics, scale: number, runs: number): string {
  const scaled: Metrics = {};
  for (const k of Object.keys(hard)) scaled[k] = hard[k]! * scale;
  const over = overBudget(best, scaled, scale, runs);
  return over && `${name} over its hard limit (a real regression, tens of times slower than today): ${over}`;
}

/** The metrics over their limits as one message, or '' when all are within their limits. */
export function overBudget(best: Metrics, limits: Metrics, scale: number, runs: number): string {
  return Object.keys(limits)
    .filter((k) => !(best[k]! < limits[k]!))
    .map(
      (k) =>
        `${k} ${best[k]!.toFixed(3)} ms (limit ${limits[k]!.toFixed(1)}, best of ${runs}, load x${scale.toFixed(1)})`,
    )
    .join('; ');
}
