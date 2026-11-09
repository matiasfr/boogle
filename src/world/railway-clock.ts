// Local presentation time for replicated movers. Action prediction keeps the conservative mirror clock.
import { createStepEstimate, STEP_MS } from './room-clock.ts';

export const RAIL_CLOCK_EVERY_MS = 500;
export const RAIL_CLOCK_TIMEOUT_MS = 2000;

export function createRailwayClock() {
  const estimate = createStepEstimate();
  let sampled = false;
  let last = -1;
  let lastAt = -1;
  let rtt = 0;
  return {
    hear(step: number, sent: number, received: number) {
      const elapsed = received - sent;
      if (
        !Number.isSafeInteger(step) ||
        step < 0 ||
        !Number.isFinite(elapsed) ||
        elapsed < 0 ||
        elapsed > RAIL_CLOCK_TIMEOUT_MS
      )
        return false;
      // The server sampled its step between these two local instants: compensate half the measured round trip.
      estimate.hear(step, (sent + received) / 2);
      rtt = elapsed;
      sampled = true;
      return true;
    },
    now(at: number, fallback: number) {
      const target = sampled ? estimate.now(at) : fallback;
      if (target < 0) return last;
      if (last < 0 || Math.abs(target - last) > 30)
        last = target; // join/restart, not an ordinary clock correction
      else {
        const dt = Math.max(0, at - lastAt) / STEP_MS;
        const error = target - (last + dt);
        // Correct small offsets by changing rate, never by moving a running deck abruptly.
        last += dt * (1 + Math.max(-0.1, Math.min(0.1, error / 30)));
      }
      lastAt = at;
      return last;
    },
    rtt: () => rtt,
    reset() {
      estimate.reset();
      sampled = false;
    },
  };
}
