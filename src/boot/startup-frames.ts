// Local startup evidence, using the existing frame profiler and playtest marks. No second loop or GPU wait.
// A callback's interval includes the PREVIOUS callback's CPU work, plus work/scheduling between callbacks.
// Keep those separate from this callback's CPU. Named spans may nest: retain their largest, never sum them.
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
  if (!until || (!inFrame && performance.now() > until) || emitted >= LIMIT) return;
  const work = inFrame ? current : gap;
  work.count++;
  if (work.count === 1 || ms > work.ms) {
    work.name = name.slice(0, 180);
    work.ms = ms;
  }
}

export function beginStartupFrame(now: number) {
  if (!until) return;
  if (now > until || emitted >= LIMIT) {
    until = 0;
    return;
  }
  inFrame = true;
}

/** null closes a deliberately skipped draw; the next rendered interval includes that callback. */
export function recordStartupFrame(now: number, frame: Frame | null) {
  inFrame = false;
  if (!until || now > until || emitted >= LIMIT) return;
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
  if (interval > 33 || frame.ms > 33) {
    emitted++;
    const data = {
      frame: frame.frames,
      startMs: round(now),
      intoMs: round(now - started),
      intervalMs: round(interval),
      cpuMs: round(frame.ms),
      top: frame.top,
      topMs: round(frame.topMs),
      previousFrame: previous.frames,
      previousStartMs: round(previousStart),
      previousCpuMs: round(previous.ms),
      previousTop: previous.top,
      previousTopMs: round(previous.topMs),
      work: current.name,
      workMs: round(current.ms),
      workCount: current.count,
      previousWork: previousWork.name,
      previousWorkMs: round(previousWork.ms),
      previousWorkCount: previousWork.count,
      gapWork: gap.name,
      gapWorkMs: round(gap.ms),
      gapWorkCount: gap.count,
      skippedCallbacks: skipped,
      hidden,
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
  clear(current);
  clear(gap);
}
