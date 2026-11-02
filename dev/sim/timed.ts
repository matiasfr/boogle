// How fast a course ran. performance.now() is the run's own clock under virtualClock(), so this times with hrtime.
import { frame } from './world.ts';

export const hrtimeMs = () => Number(process.hrtime.bigint()) / 1e6;

/** Runs a course (`runCourse` of ./ball-course.ts and the like) a frame at a time. Returns what it gave, frames and ms. */
export async function timedCourse<R>(runCourse: (advance: (done: () => boolean) => void) => Promise<R>) {
  let frames = 0;
  const t0 = hrtimeMs();
  const result = await runCourse((done) => {
    while (!done()) {
      frame();
      frames++;
    }
  });
  return { result, frames, ms: hrtimeMs() - t0 };
}
