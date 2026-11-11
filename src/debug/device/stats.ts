// The device test's arithmetic, pure (no DOM, no game): percentiles of frame intervals, counts over a limit and the
// verdict of a scene. Shared with the CLI's tests. Local, debug only.

/** A scene passes when its p95 frame interval is under this many refresh intervals of the device. One constant, so the
 * first week of runs on an iPad and a phone can set the real line (owner, 10 November: "Yes" to the start). */
export const PASS_P95_REFRESH_INTERVALS = 2;
/** ... and it drew at least this many frames a second of sample. */
export const PASS_MIN_FPS = 30;
/** A frame this long is a stall to a player (frames over 33 and over 50 ms are counted for every scene). */
export const STALL_MS = 100;

/** The p-th percentile (0..100) of an ascending array, by linear interpolation; NaN for an empty one. */
export function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return NaN;
  const at = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
}

export const median = (values: readonly number[]) =>
  percentile(
    values.slice().sort((a, b) => a - b),
    50,
  );

export const countOver = (values: readonly number[], limit: number) => values.filter((v) => v > limit).length;

export type FrameStats = {
  n: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  over33: number;
  over50: number;
};

/** The figures of a frame-interval sample (ms); null for an empty one: that is "not measured", never zeros. */
export function frameStats(intervals: readonly number[]): FrameStats | null {
  const s = intervals.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!s.length) return null;
  return {
    n: s.length,
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    p99: percentile(s, 99),
    max: s.at(-1)!,
    over33: countOver(s, 33),
    over50: countOver(s, 50),
  };
}

export type Verdict = 'pass' | 'fail' | 'not-measured';
export type SceneVerdict = { verdict: Verdict; why: string };

/** pass / fail with the reason / not measured (a hidden tab, no frames). Never a silent zero. */
export function sceneVerdict(input: {
  stats: FrameStats | null;
  seconds: number;
  hidden: boolean;
  refreshMs: number;
}): SceneVerdict {
  const { stats, seconds, hidden, refreshMs } = input;
  if (hidden) return { verdict: 'not-measured', why: 'the tab was hidden during the sample' };
  if (!stats || seconds <= 0) return { verdict: 'not-measured', why: 'no frames in the sample' };
  const fps = stats.n / seconds;
  const line = PASS_P95_REFRESH_INTERVALS * refreshMs;
  const why: string[] = [];
  if (fps < PASS_MIN_FPS) why.push(`${fps.toFixed(1)} frames a second, under ${PASS_MIN_FPS}`);
  if (stats.p95 >= line) why.push(`p95 ${stats.p95.toFixed(1)} ms, not under ${line.toFixed(1)} ms`);
  return why.length ? { verdict: 'fail', why: why.join('; ') } : { verdict: 'pass', why: '' };
}

/** The change of p50 from the first spawn to the last, in percent of the first; null when either is missing. A rough
 * proxy for heat: the web has no thermal reading. */
export function heatDrift(first: number | null, last: number | null): number | null {
  if (first === null || last === null || !(first > 0) || !Number.isFinite(last)) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

/** The headline of a run's load: "Ready in 2.8 s (warm load)". `ms` is the game's interactive mark in ms since the
 * navigation began; `warm` is whether a service worker already controlled the page (the first visit has none);
 * `coldAsked` is a `cold=1` link, which wants a first visit. A warm load hides the real first-visit time. */
export function readyLine(ms: number | null, warm: boolean | null, coldAsked = false): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return 'Ready: not measured';
  const kind = warm === null ? 'load' : warm ? 'warm load' : 'cold load';
  const note = coldAsked && warm === true ? '; a cold one was asked for, so open the link in a private tab' : '';
  return `Ready in ${(ms / 1000).toFixed(1)} s (${kind}${note})`;
}

/** Whether this browser delivers `longtask` entries (Chromium; Safari and Firefox accept the observer and never fire),
 * judged from the user agent, for the runs sent before the page said so. */
export function longTasksSupported(ua: string): boolean {
  return /Chrome\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}
