// Frame intervals of the running game, collected from the game loop's own frame hook (a second frame loop is not
// allowed). Registers once, when this lazy module loads between frames. Local, debug only.
import { onFrame } from '../../loop.ts';
import { renderer } from '../../render/scene.ts';

type Sink = { intervals: number[]; rendered: number };
let sink: Sink | null = null;
/** The last frame that drew anything: three resets `renderer.info` on every animation tick, so a tick the frame limit
 * skipped reads 0 calls and 0 triangles; only a frame with draw calls is a measurement of a frame. */
let lastDraw: { calls: number; tris: number } | null = null;
let previous = 0;
let waiters: (() => void)[] = [];
let hiddenSeen = false;

onFrame(
  ({ now }) => {
    if (document.hidden) hiddenSeen = true;
    if (previous && sink && !document.hidden) sink.intervals.push(now - previous);
    previous = document.hidden ? 0 : now;
    // The render comes after this hook in the same animation callback, so read the counts once that callback is over
    // (a microtask runs right after it). Read here they are always the reset zeros.
    queueMicrotask(() => {
      const r = renderer.info.render;
      if (r.drawCalls <= 0) return;
      lastDraw = { calls: r.drawCalls, tris: r.triangles };
      if (sink && !document.hidden) sink.rendered++;
    });
    if (waiters.length) {
      const w = waiters;
      waiters = [];
      for (const fn of w) fn();
    }
  },
  { phase: 'late', order: 90, name: 'device frames' },
);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenSeen = true;
});

/** Starts collecting frame intervals (ms); returns what stop() needs. */
export function collectFrames() {
  const mine: Sink = { intervals: [], rendered: 0 };
  hiddenSeen = document.hidden;
  lastDraw = null;
  sink = mine;
  return {
    count: () => mine.intervals.length,
    /** The intervals so far, whether the tab was hidden since the start, how many of the frames drew (a frame limit
     * skips the others) and the counts of the last frame that drew (null if none did). */
    stop() {
      if (sink === mine) sink = null;
      return { intervals: mine.intervals, hidden: hiddenSeen, rendered: mine.rendered, draw: lastDraw };
    },
  };
}

/** Resolves on the game's next frame (rejects never: a hidden tab simply waits). */
export const nextFrame = () => new Promise<void>((r) => waiters.push(r));

/** The median of the next `n` frame intervals, in ms; gives up after `timeoutMs` with what it has (null if nothing). */
export async function refreshInterval(n = 60, timeoutMs = 4000): Promise<number | null> {
  const c = collectFrames();
  const end = performance.now() + timeoutMs;
  while (performance.now() < end && c.count() < n)
    await Promise.race([nextFrame(), new Promise((r) => setTimeout(r, 500))]);
  const { intervals } = c.stop();
  if (!intervals.length) return null;
  const s = intervals.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}
