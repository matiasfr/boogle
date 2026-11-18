// The baseline for a suite: one pulled device run of that suite, made in the owner's own browser on the machine to
// compare against when it is quiet (docs/plans/remote-device-tests.md). The run names its own device, so the file says
// nothing about the machine that pulled it. One file per suite in the pulling machine's ~/.boogle/device/baseline/
// <suite>.json (any OS), outside every worktree, so all worktrees on that machine read the same one; another machine
// that pulls makes its own with `npm run device -- baseline <code>`. BOOGLE_DEVICE_DIR moves the directory.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SUITE_NAMES } from '../../src/debug/device/id.ts';
import type { DeviceResult } from './read.ts';

export type Baseline = { saved: string; result: DeviceResult };

const dir = () => process.env.BOOGLE_DEVICE_DIR || path.join(os.homedir(), '.boogle', 'device');
export const baselineFile = (suite: string) => path.join(dir(), 'baseline', `${suite}.json`);

/** Whether a run may stand as the baseline: finished, with scenes, of a suite we know. Null when it may; else why not. */
export function refuseBaseline(r: DeviceResult): string | null {
  if (!(SUITE_NAMES as readonly string[]).includes(r.suite))
    return `its suite "${r.suite}" is not one of ${SUITE_NAMES.join(', ')}`;
  if (!r.complete) return 'the run is incomplete (no dev.done); wait for it to finish or run it again';
  if (!r.scenes.length) return 'the run has no scenes';
  if (!r.scenes.some((s) => s.verdict === 'pass')) return 'no scene passed, so there is nothing to compare against';
  return null;
}

export function saveBaseline(r: DeviceResult, now = new Date()): string {
  const why = refuseBaseline(r);
  if (why) throw new Error(`run ${r.code} cannot be a baseline: ${why}`);
  const file = baselineFile(r.suite);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body: Baseline = { saved: now.toISOString(), result: r };
  fs.writeFileSync(file, JSON.stringify(body, null, 2) + '\n');
  return file;
}

/** The suite's baseline, or null when there is none or the file is not one (never a throw: a report still prints). */
export function loadBaseline(suite: string): Baseline | null {
  try {
    const b = JSON.parse(fs.readFileSync(baselineFile(suite), 'utf8')) as Baseline;
    return b && typeof b.saved === 'string' && b.result && Array.isArray(b.result.scenes) ? b : null;
  } catch {
    return null;
  }
}

/** This machine's daily bench history (dev/daily/perf.ts), oldest first. Only a machine that runs the daily perf job
 * has one; elsewhere the file is missing and this is empty, so no bench line prints. Bad lines are skipped. */
export function loadBenchHistory(): BenchEntry[] {
  const file = path.join(
    process.env.BOOGLE_DAILY_DIR || path.join(os.homedir(), '.boogle', 'daily'),
    'perf',
    'history.jsonl',
  );
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line) => {
        try {
          const e = JSON.parse(line) as BenchEntry;
          return e && typeof e.base === 'string' && e.metrics && typeof e.metrics === 'object' ? [e] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}
export type BenchEntry = { date: string; base: string; metrics: Record<string, number> };
