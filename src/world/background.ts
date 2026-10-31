// Keeps the shared world ticking while the tab is hidden (requestAnimationFrame stops there, which would stall every client
// if this is the host). A worker heartbeat drives updateWorld only while the document is hidden; when visible the frame loop owns it.
const CHUNK_S = 0.4; // updateWorld runs at most 5 ticks per call, so feed it small slices
const MAX_CATCHUP_S = 5; // a long-throttled tab never replays more than this at once; the rest is dropped

// Returns advance(nowMs, active): always records the time; when active, feeds the elapsed real time to update(dt) in slices.
export function createBackgroundAdvance(update: (dt: number) => void, start: number) {
  let last = start;
  return (now: number, active: boolean) => {
    let left = Math.min((now - last) / 1000, MAX_CATCHUP_S);
    last = now;
    while (active && left > 1e-6) {
      const dt = Math.min(left, CHUNK_S);
      left -= dt;
      update(dt);
    }
  };
}

export function startBackgroundClock(update: (dt: number) => void) {
  if (typeof Worker === 'undefined' || typeof document === 'undefined') return () => {};
  const advance = createBackgroundAdvance(update, performance.now());
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
