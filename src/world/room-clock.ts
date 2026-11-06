// One fixed simulation clock for a room (docs/plans/replication.md, "One fixed clock"). The server steps at STEP_HZ
// (60 Hz) and runs the rules every RULE_STEPS steps (10 Hz, sync.ts's TICK_MS), so every tick-denominated tuning keeps
// its meaning. The step counter is the room clock: step = tick * RULE_STEPS + phase, so it persists with the world
// tick and resumes where a saved room left off. Clients run their own body on the same 60 Hz step (src/physics) and
// estimate the server's step from the stamps they hear (createStepEstimate). Headless and pure: no timers here.
//
//   createFixedSteps(maxSteps)        an accumulator: advance(ms, fn) calls fn() once per whole 60 Hz step, at most
//                                     maxSteps per call (a stall drops the rest instead of spiralling)
//   createStepEstimate()              hear(step, atMs) per server stamp; now(atMs, aheadMs) = estimated server step
export const STEP_HZ = 60;
export const RULE_STEPS = 6;
/** Rule tick length: 6 steps of 1/60 s, exactly 100 ms. */
export const RULE_MS = (RULE_STEPS * 1000) / STEP_HZ;
/** One step in ms (16.67): for display and estimates only; the accumulator counts in whole ms × STEP_HZ. */
export const STEP_MS = 1000 / STEP_HZ;
/** At most this many steps per advance call: 5 rule ticks, the same cap the lockstep clock has always had. */
export const MAX_CATCH_UP = 5 * RULE_STEPS;

export function createFixedSteps(maxSteps = MAX_CATCH_UP) {
  // In ms × STEP_HZ, so integer ms advance by whole units and 1000 units are exactly one step (no float drift).
  let acc = 0;
  return {
    advance(ms: number, fn: () => void) {
      if (!(ms > 0)) return 0;
      acc += ms * STEP_HZ;
      let n = 0;
      while (acc >= 1000 && n < maxSteps) {
        acc -= 1000;
        n++;
        fn();
      }
      if (acc >= 1000) acc = 0; // too far behind: drop the backlog, like the physics step and the old lockstep clock
      return n;
    },
    reset() {
      acc = 0;
    },
  };
}

// A server stamp is a lower bound on the server's current step (it was true when sent, and time has passed since).
// The estimate follows the freshest lower bound plus local elapsed time, so it settles on the lowest-latency sample:
// the server's step as of one one-way delay ago. aheadMs adds a known lead (half an RTT) for prediction. Stamps far
// behind the estimate (a hidden tab whose clock ran on, a server restart) re-anchor it.
const REANCHOR_STEPS = 30; // 0.5 s

export function createStepEstimate() {
  let base = -1;
  let baseAt = 0;
  let last = -1;
  const project = (at: number) => base + ((at - baseAt) * STEP_HZ) / 1000;
  return {
    hear(step: number, at: number) {
      if (!Number.isSafeInteger(step) || step < 0 || !Number.isFinite(at)) return;
      if (base < 0 || step >= project(at) || project(at) - step > REANCHOR_STEPS) {
        if (base >= 0 && project(at) - step > REANCHOR_STEPS) last = -1;
        base = step;
        baseAt = at;
      }
    },
    /** Estimated server step at local time `at` (fractional), never going backwards between re-anchors; -1 before
     * any stamp. */
    now(at: number, aheadMs = 0) {
      if (base < 0) return -1;
      const est = project(at);
      if (est > last) last = est;
      return last + (aheadMs * STEP_HZ) / 1000;
    },
    /** The rule tick that estimate falls in. */
    tick(at: number, aheadMs = 0) {
      const s = this.now(at, aheadMs);
      return s < 0 ? -1 : Math.floor(s / RULE_STEPS);
    },
    reset() {
      base = -1;
      last = -1;
    },
  };
}
