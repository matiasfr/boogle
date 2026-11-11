// Frame intervals of the running game, collected from the game loop's own frame hook (a second frame loop is not
// allowed). Registers once, when this lazy module loads between frames. Local, debug only.
import { onFrame } from '../../loop.ts';

let sink: number[] | null = null;
let previous = 0;
let waiters: (() => void)[] = [];
let hiddenSeen = false;

onFrame(
  ({ now }) => {
    if (document.hidden) hiddenSeen = true;
    if (previous && sink && !document.hidden) sink.push(now - previous);
    previous = document.hidden ? 0 : now;
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
  const mine: number[] = [];
  hiddenSeen = document.hidden;
  sink = mine;
  return {
    count: () => mine.length,
    /** The intervals so far, and whether the tab was hidden since the start. */
    stop() {
      if (sink === mine) sink = null;
      return { intervals: mine, hidden: hiddenSeen };
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
