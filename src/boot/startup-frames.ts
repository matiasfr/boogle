// Local startup evidence, using the existing frame profiler and playtest marks. No second loop or GPU wait.
// A callback's interval includes the PREVIOUS callback's CPU work, plus work/scheduling between callbacks.
// Keep those separate from this callback's CPU. Named spans may nest: retain their largest, never sum them.
// The play data keeps a mark's first 12 fields (src/proto/playdata/record.ts), so the ones that name a stall come first;
// performance.mark keeps them all.
// After the startup window, a frame over 250 ms (interval or CPU) still leaves a 'long frame' mark, 24 at most: with
// cpuMs and top it says whether the stall was inside the game's frame (which section) or between frames (the GPU, the
// browser or another task), and hiddenMs and visibilityEvents say whether the page was really hidden meanwhile. On the
// 9 November iPhone freeze the page sent nothing for 29 s, then two visibility events that both read "visible".
import { playMark } from '../proto/mark.ts';

type Frame = { frames: number; ms: number; top: string; topMs: number };
type Work = { name: string; ms: number; count: number };
const current: Work = { name: '', ms: 0, count: 0 };
const gap: Work = { name: '', ms: 0, count: 0 };
const previousWork: Work = { name: '', ms: 0, count: 0 };
const previous: Frame = { frames: 0, ms: 0, top: '', topMs: 0 };
const WINDOW_MS = 20000;
const LIMIT = 120;
let started = 0,
  until = 0,
  previousStart = 0,
  emitted = 0,
  skipped = 0;
let inFrame = false,
  previousHidden = false;
const LONG_MS = 250,
  LONG_LIMIT = 24;
let longMarks = 0,
  visibilityEvents = 0,
  hiddenMs = 0,
  hiddenAt = -1;
document.addEventListener('visibilitychange', () => {
  visibilityEvents++;
  const now = performance.now();
  if (document.hidden) {
    if (hiddenAt < 0) hiddenAt = now;
  } else if (hiddenAt >= 0) {
    hiddenMs += now - hiddenAt;
    hiddenAt = -1;
  }
});
const round = (n: number) => Math.round(n * 10) / 10;
function clear(work: Work) {
  work.name = '';
  work.ms = work.count = 0;
}

/** Called once by the loading timeline, after its first GPU-completed draw. Safe to import in headless loop users. */
export function startStartupFrames(now: number) {
  if (started) return;
  started = previousStart = now;
  until = now + WINDOW_MS;
  previousHidden = document.hidden;
}

/** Synchronous CPU/API elapsed time only. The caller names the owner, material, pass or resolution transition. */
export function startupWork(name: string, ms: number) {
  if (!started) return;
  const work = inFrame ? current : gap;
  work.count++;
  if (work.count === 1 || ms > work.ms) {
    work.name = name.slice(0, 180);
    work.ms = ms;
  }
}

export function beginStartupFrame(now: number) {
  if (!started) return;
  if (until && (now > until || emitted >= LIMIT)) until = 0;
  inFrame = true;
}

/** null closes a deliberately skipped draw; the next rendered interval includes that callback. */
export function recordStartupFrame(now: number, frame: Frame | null) {
  inFrame = false;
  if (!started) return;
  if (!frame) {
    skipped++;
    if (current.count) {
      if (!gap.count || current.ms > gap.ms) {
        gap.name = current.name;
        gap.ms = current.ms;
      }
      gap.count += current.count;
      clear(current);
    }
    return;
  }
  const interval = now - previousStart;
  const hidden = document.hidden;
  const hiddenNow = round(hiddenMs + (hiddenAt >= 0 ? now - hiddenAt : 0));
  if (!until || now > until || emitted >= LIMIT) {
    // Past the window: only a long frame the page's real hidden time does not explain.
    if ((frame.ms > LONG_MS || interval - hiddenNow > LONG_MS) && longMarks < LONG_LIMIT) {
      longMarks++;
      playMark('long frame', {
        intervalMs: round(interval),
        cpuMs: round(frame.ms),
        top: frame.top,
        topMs: round(frame.topMs),
        previousCpuMs: round(previous.ms),
        gapWork: gap.name,
        gapWorkMs: round(gap.ms),
        // Really hidden meanwhile, or events queued behind a stalled page that all read "visible"?
        hiddenMs: hiddenNow,
        visibilityEvents,
        sinceStartS: round((now - started) / 1000),
      });
    }
  } else if (interval > 33 || frame.ms > 33) {
    emitted++;
    const data = {
      // The play data keeps these first twelve.
      intoMs: round(now - started),
      intervalMs: round(interval),
      cpuMs: round(frame.ms),
      top: frame.top,
      topMs: round(frame.topMs),
      previousCpuMs: round(previous.ms),
      previousTop: previous.top,
      gapWork: gap.name,
      gapWorkMs: round(gap.ms),
      work: current.name,
      workMs: round(current.ms),
      hidden,
      frame: frame.frames,
      startMs: round(now),
      previousFrame: previous.frames,
      previousStartMs: round(previousStart),
      previousTopMs: round(previous.topMs),
      workCount: current.count,
      previousWork: previousWork.name,
      previousWorkMs: round(previousWork.ms),
      previousWorkCount: previousWork.count,
      gapWorkCount: gap.count,
      skippedCallbacks: skipped,
      previousHidden,
    };
    playMark('startup frame', data);
    // PerformanceEntry.toJSON omits detail in the benchmark browser; retain names in the opt-in timeline too.
    performance.mark('startup:frame:' + JSON.stringify(data));
  }
  Object.assign(previous, frame);
  Object.assign(previousWork, current);
  previousStart = now;
  previousHidden = hidden;
  skipped = 0;
  hiddenMs = 0;
  visibilityEvents = 0;
  clear(current);
  clear(gap);
}
