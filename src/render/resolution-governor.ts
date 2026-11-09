// The frame-time governor behind adaptive resolution (src/features/adaptive-res.ts), as pure logic: frame intervals in,
// one step out. No DOM, storage or renderer, so test/resolution-governor.test.ts can drive it with simulated frames.
//
// The cadence is the 10th percentile of the last 2 s of intervals: the rate the browser delivers frames at when nothing
// is late (Safari caps rAF at 60 Hz on a 120 Hz screen and at 30 Hz in Low Power Mode), stopping at 34 ms. A frame is
// late when its interval is over 1.5 cadences: it missed a vsync.
//
// Down: slow for 2 s, slow being the frame-time moving average over max(18.5 ms, 1.08 x cadence) or more than 10 % of
// the last 2 s of frames late.
//
// Up: under vsync a 16.7 ms frame says nothing about headroom, so the governor cannot wait for frames faster than the
// cadence; it probes instead. It is calm while the median interval is on the cadence and at most 5 % of the last 2 s of
// frames are late. A hitch does not reset the calm (it moves the average, not the share), a sustained slowdown does. After 5 s calm it steps up; a step that is slow again
// within 10 s doubles the wait (up to 40 s), and a step that holds for 10 s puts the wait back to 5 s. The 9 November
// 2026 playtest had a Mac at a steady 17 ms sit at the floor for four minutes: the old rule needed every frame's
// average under 1.06 x a 10th percentile that Safari's 1 ms timer resolution rounds down to 16 ms.
//
// Measured on the simulated series in the test: 3 s from heavy load to the first step down, the floor within 10 s;
// back to full resolution within 25 s of the load ending (75 s after repeated failed probes); a device on the edge
// of a step probes it at most once per 40 s after the first minute.
//
// Below the resolution floor the same calm and slow signals shed and restore detail rungs (owner call, 7 November
// 2026): slow for 4 s at the floor sheds one; calm for 10 s restores the last one shed, and only with every rung back
// does resolution climb again.

export const RATIO_MIN = 0.6;
export const RATIO_STEP = 0.1;
export const START_MIN = 0.8; // of the maximum ratio: where a load starts at the lowest, whatever was remembered
export const FIRST_TOUCH = 0.8;

const SLOW_MS = 18.5;
const SLOW_K = 1.08; // of the cadence
const LATE_K = 1.5; // an interval this many cadences long missed a vsync
const LATE_CALM = 0.05; // the share of late frames a calm stretch allows
const LATE_SLOW = 0.1; // more late frames than this is slow, whatever the average says
const MEDIAN_K = 1.15; // the median interval stays within this many cadences while calm
const CADENCE_MAX = 34; // ms: Low Power Mode's 30 Hz, the slowest cap a browser sets
const LONGEST = 250; // ms: one frame's weight, so a single hitch can't fill the window
const DOWN_AFTER = 2,
  UP_AFTER = 5,
  UP_MAX = 40,
  RETRY_WINDOW = 10,
  COOLDOWN = 2,
  WARMUP = 5,
  SHED_AFTER = 4,
  RESTORE_AFTER = 10; // seconds

const N = 120; // intervals kept (2 s at 60 Hz)

export type GovernorStep = 'down' | 'up' | 'shed' | 'restore' | null;
/** What the caller's detail rungs allow this frame. */
export type RungState = { canShed: boolean; rungShed: boolean };

/** Where a fresh load starts: the remembered ratio, but never below START_MIN, so a load after a heavy spot doesn't
 *  begin at the floor; a first touch visit starts at 0.8. */
export function startRatio(saved: number | null, touch: boolean) {
  if (saved === null || !(saved >= RATIO_MIN && saved <= 1)) return touch ? FIRST_TOUCH : 1;
  return Math.max(START_MIN, saved);
}

export function createGovernor(start: number) {
  const ring = new Float32Array(N);
  const sorted = new Float32Array(N);
  let filled = 0,
    head = 0,
    cadence = 16.7,
    median = 16.7,
    lateShare = 0;
  let ratio = Math.min(1, Math.max(RATIO_MIN, start)),
    ema = 16.7,
    slow = 0,
    calm = 0,
    sinceChange = 0,
    sinceUp = Infinity,
    probing = false,
    upAfter = UP_AFTER,
    restoreAfter = RESTORE_AFTER,
    age = 0;

  function measure() {
    sorted.set(ring);
    const s = sorted.subarray(0, filled).sort();
    cadence = Math.min(CADENCE_MAX, Math.max(4, s[Math.floor(filled * 0.1)]!));
    median = s[Math.floor(filled * 0.5)]!;
    const late = cadence * LATE_K;
    let n = 0;
    for (let i = 0; i < filled; i++) if (s[i]! > late) n++;
    lateShare = n / filled;
  }

  function changed() {
    slow = calm = sinceChange = 0;
  }
  const step = (by: number) => Math.min(1, Math.max(RATIO_MIN, Math.round((ratio + by) * 100) / 100));

  return {
    get ratio() {
      return ratio;
    },
    /** Read-only view for marks and tests. */
    inspect: () => ({ ratio, ema, cadence, median, lateShare, slow, calm, upAfter, restoreAfter, age }),
    /** A hidden tab's long frames say nothing about the GPU: start the window over. */
    reset() {
      slow = calm = 0;
      ema = cadence;
      filled = head = 0;
    },
    /** One frame interval in ms; returns the step taken (already applied to `ratio`) or null. */
    frame(intervalMs: number, rungs: RungState): GovernorStep {
      const ms = Math.min(intervalMs, LONGEST);
      if (!(ms > 0)) return null;
      const dt = ms / 1000;
      age += dt;
      sinceChange += dt;
      sinceUp += dt;
      ema += (ms - ema) * 0.1;
      ring[head] = ms;
      head = (head + 1) % N;
      if (filled < N) filled++;
      if (head % 30 === 0) measure();
      const late = lateShare > LATE_SLOW;
      slow = late || ema > Math.max(SLOW_MS, cadence * SLOW_K) ? slow + dt : 0;
      calm = lateShare <= LATE_CALM && median <= cadence * MEDIAN_K ? calm + dt : 0;
      if (probing && sinceUp >= RETRY_WINDOW) {
        probing = false; // that step held: the load it was waiting out has gone
        upAfter = UP_AFTER;
        restoreAfter = RESTORE_AFTER;
      }
      if (age < WARMUP || sinceChange < COOLDOWN) return null;
      const atFloor = ratio <= RATIO_MIN + 1e-3;
      if (slow >= DOWN_AFTER && !atFloor) {
        if (probing) upAfter = Math.min(UP_MAX, upAfter * 2); // that step up did not hold
        probing = false;
        ratio = step(-RATIO_STEP);
        changed();
        return 'down';
      }
      if (slow >= SHED_AFTER && atFloor) {
        if (probing) restoreAfter = Math.min(UP_MAX, restoreAfter * 2); // that restore did not hold
        probing = false;
        changed(); // shed or not, look again after the cooldown rather than every frame
        return rungs.canShed ? 'shed' : null;
      }
      if (rungs.rungShed) {
        if (calm < restoreAfter) return null;
        changed();
        sinceUp = 0;
        probing = true;
        return 'restore';
      }
      if (calm >= upAfter && ratio < 1 - 1e-3) {
        ratio = step(RATIO_STEP);
        changed();
        sinceUp = 0;
        probing = true;
        return 'up';
      }
      return null;
    },
  };
}
