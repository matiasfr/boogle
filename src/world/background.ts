// One elapsed-time cursor for the shared world: visible frames and the hidden-tab worker hand it off.
// Physics clamps its frame delta; world ticks and snapshot retry timers need real elapsed time instead.
const CHUNK_S = 0.4; // updateWorld runs at most 5 ticks per call, so feed it small slices
const MAX_CATCHUP_S = 5; // a long-throttled tab never replays more than this at once; the rest is dropped

// Inactive callbacks must not consume the other clock's elapsed time. A stale rAF stamp cannot rewind it.
export function createBackgroundAdvance(update: (dt: number) => void, start: number) {
  let last = start;
  return (now: number, active: boolean) => {
    if (!active || now <= last) return;
    let left = Math.min((now - last) / 1000, MAX_CATCHUP_S);
    last = now;
    while (left > 1e-6) {
      const dt = Math.min(left, CHUNK_S);
      left -= dt;
      update(dt);
    }
  };
}

export function startBackgroundClock(advance: (now: number, active: boolean) => void) {
  if (typeof Worker === 'undefined' || typeof document === 'undefined') return () => {};
  let worker: Worker;
  try {
    worker = new Worker(new URL('./clock-worker.ts', import.meta.url), { type: 'module' });
  } catch (e) {
    console.warn('[world] background clock unavailable', e);
    return () => {};
  }
  worker.onmessage = () => advance(performance.now(), document.hidden);
  return () => worker.terminate();
}
