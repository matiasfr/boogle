// Smooth shared time for cosmetic motion that should look the same for everyone (windmill sails, lighthouse beam):
// the world clock (10 Hz ticks, the same on every client once synced) filled in between ticks with local time.
// Not for the deterministic sim, which works in whole ticks.
import { world, TICK_MS } from '../world/sync.ts';

let tick = -1,
  tickAt = 0,
  last = 0;

// Seconds of shared world time, never going backwards (jumps forward after a snapshot load).
export function sharedSeconds() {
  const now = performance.now();
  if (world.tick !== tick) {
    tick = world.tick;
    tickAt = now;
  }
  const ms = tick * TICK_MS + Math.min(now - tickAt, TICK_MS * 1.5);
  if (ms > last || ms < last - 5000) last = ms;
  return last / 1000;
}
