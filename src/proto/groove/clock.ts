// The music clock, kept from the cut groove prototype for the owner's own music later (docs/proposals/boogle-2.md,
// "Sound"): maps shared world time (sharedSeconds(), src/netplay/shared-time.ts) to the AudioContext's clock, so every
// tab can start a bar on the same downbeat. Two clocks (web.dev, "A tale of two clocks"): schedule on the audio clock a
// little ahead, from a smoothed offset that survives main-thread stalls. Nothing imports it yet. Local; cosmetic.
import { sharedSeconds } from '../../netplay/shared-time.ts';

export function createMusicClock() {
  let off = NaN; // audio-clock time minus the shared time heard at that moment
  let samples = 0;
  return {
    /** Call every scheduler pass (every ~25 ms) to track the offset. */
    sync(ctx: AudioContext) {
      const now = performance.now();
      const ts = ctx.getOutputTimestamp?.();
      const ok = ts && ts.contextTime && ts.performanceTime;
      const c = ok ? ts.contextTime! : ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      const p = ok ? ts.performanceTime! : now;
      const sample = c - (sharedSeconds() - (now - p) / 1000);
      // sharedSeconds() steps with the 10 Hz world tick; smooth it (faster for the first seconds, while a joining
      // tab's world clock settles), but jump when it jumps (a snapshot load).
      const k = Math.max(0.05, 0.3 - samples * 0.0025);
      samples++;
      off = off === off && Math.abs(sample - off) < 0.2 ? off + (sample - off) * k : sample;
    },
    /** The AudioContext time of a shared second (NaN until the first sync). */
    at: (shared: number) => shared + off,
    ready: () => off === off,
  };
}
