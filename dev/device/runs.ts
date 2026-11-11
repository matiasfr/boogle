// The Mac's side of waiting for and collecting device runs. Pure: the clock, the sleep and the server's list are
// passed in, so the logic runs under a fake clock in test/device-runs.test.ts.
import type { PlaySession } from '../../server/src/playdata.ts';

export const POLL_MS = 10_000;
export const WAIT_MS = 30 * 60_000;
/** A run that sent nothing for this long is cut off, not running (a tab closed or a phone locked). */
export const STALE_MS = 10 * 60_000;
/** Server errors in a row that end a wait: one dropped request must not. */
const MAX_FAILURES = 6;

export type Local = { pulled: boolean; complete: boolean };
export type PullPlan = {
  /** Oldest first. */
  pull: PlaySession[];
  /** Runs still sending: left for the next round. */
  running: PlaySession[];
};

const isDone = (s: PlaySession) => s.meta?.state === 'done';
/** Whether the session's last event is recent enough for the run to be still going. */
export const active = (s: PlaySession, now: number) => now - Date.parse(s.last) < STALE_MS;

/**
 * Which device runs `pull --new` takes: every finished run not on disk; a run on disk that was cut off when pulled,
 * when the server has since seen more of it (finished or newer events); and a run that stopped sending, as cut off.
 * A run still sending is left alone, so a half-run is not frozen as the pulled copy.
 */
export function planPull(
  rows: PlaySession[],
  local: (id: string) => Local,
  lastPulled: (id: string) => number,
  now: number,
): PullPlan {
  const plan: PullPlan = { pull: [], running: [] };
  for (const s of rows) {
    if (s.card !== 'device') continue;
    const have = local(s.id);
    if (have.pulled && have.complete) continue;
    if (!isDone(s) && active(s, now)) {
      plan.running.push(s);
      continue;
    }
    // On disk but cut off: only again when the server has newer events than the copy had.
    if (have.pulled && !isDone(s) && Date.parse(s.last) <= lastPulled(s.id)) continue;
    plan.pull.push(s);
  }
  plan.pull.sort((a, b) => a.first.localeCompare(b.first));
  return plan;
}

export type WaitEnv = {
  list: () => Promise<PlaySession[]>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  /** Called after each poll with what was seen, for a progress line. */
  tick?: (seen: 'none' | 'started' | 'done', elapsedMs: number) => void;
};
export type WaitResult =
  | { status: 'done'; session: PlaySession }
  /** The run began but stopped sending before it finished. */
  | { status: 'cut-off'; session: PlaySession }
  /** Nothing arrived in the time given. */
  | { status: 'timeout' }
  | { status: 'error'; error: string };

/**
 * Polls the server until the run `id` is done. Ends early when the run began and then went quiet for STALE_MS, so a
 * closed tab does not hold the Mac for the whole wait; ends on repeated list failures.
 */
export async function waitForRun(id: string, env: WaitEnv, pollMs = POLL_MS, limitMs = WAIT_MS): Promise<WaitResult> {
  const start = env.now();
  const errors: string[] = []; // the list failures since the last good answer
  for (;;) {
    try {
      const row = (await env.list()).find((s) => s.id === id && s.card === 'device');
      errors.length = 0;
      const elapsed = env.now() - start;
      if (row && isDone(row)) {
        env.tick?.('done', elapsed);
        return { status: 'done', session: row };
      }
      env.tick?.(row ? 'started' : 'none', elapsed);
      if (row && !active(row, env.now())) return { status: 'cut-off', session: row };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      if (errors.length >= MAX_FAILURES) return { status: 'error', error: errors.at(-1)! };
    }
    if (env.now() - start + pollMs > limitMs) return { status: 'timeout' };
    await env.sleep(pollMs);
  }
}
