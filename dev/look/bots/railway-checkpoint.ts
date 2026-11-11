// The seeded route evals' checkpoint (railway-b4-bot, railway-b5b8-bot, railway-works-bot): note the beat, print one
// RAILWAY CHECKPOINT line, and at `?railStop=<beat>` stop there for good (finishing the run unless a photo is wanted).
// Runs in the page; the facts are read when the beat is reached, never held.
import type { Bot } from '../bot.ts';
import { me } from '../../../src/player/player.ts';
import { inspectRailway, line2Active, line2Completed, line2Jobs, rail, railAt, railRead, rw } from '../rail-read.ts';

type Shot = Window & { __railStop?: string; __railPhoto?: boolean };

/** `label` names the run in its finish line; `fields` are the line's facts after the beat, the tick and the hash. */
export function railCheckpoint(bot: Bot, label: string, fields: () => Record<string, unknown>) {
  const stop = new URLSearchParams(location.search).get('railStop');
  const shot = window as Shot;
  return async (beat: string) => {
    bot.note(beat);
    console.log(
      `RAILWAY CHECKPOINT ${JSON.stringify({
        beat,
        tick: railAt(),
        hash: railRead()!.debug().hash,
        ...fields(),
        position: me.body!.position,
        swimming: me.swimming,
      })}`,
    );
    if (stop !== beat) return;
    shot.__railStop = beat;
    if (!shot.__railPhoto) bot.finish(`${label}: ${beat}; no recovery`);
    await new Promise<void>(() => {});
  };
}

/** Line two's facts for a checkpoint: the rail row, the active and completed stretches, each Q job's completion, and
 * the line-two view's own inspection. */
export function line2Checkpoint() {
  const w = rw();
  return {
    line2: {
      ...rail(w),
      active: line2Active(w),
      completed: line2Completed(w),
      completions: line2Jobs(w).map((j) => j.job.completion),
    },
    line2View: inspectRailway()!.line2View,
  };
}
