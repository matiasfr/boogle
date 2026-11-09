// One verdict file per harness run (playthrough, look, scenario), stamped with the code and machine state it was taken
// on. It reads `running` from the start (pid, start time), so a run that vanished without a word reads as "did not
// finish", never as a pass or as an older run's verdict. A run stopped from outside (SIGTERM/SIGINT/SIGHUP, or its
// browser/page closed under it) ends `killed` with the reason and exits KILLED_EXIT; a game failure stays exit 1.
// Best effort: nothing here can be written once the machine is already gone. No game/runtime imports.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { maxLoad, slotRecord, wasShared, type Slot } from './bot-queue.ts';

export const KILLED_EXIT = 3;
/** The load a run is judged against when the gate is off (BOOGLE_BOT_MAX_LOAD=0): turning it off isn't evidence. */
const EVIDENCE_LOAD = 30;
const CLOSED =
  /Target page, context or browser has been closed|Target closed|Browser has been closed|browser has disconnected/i;
const SIGNALS = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const;
const GRACE_MS = 5000;

export type Git = { commit?: string; tree?: string; dirty?: number };
export type Stamp = Git & {
  loadAtStart?: number;
  loadAtEnd: number;
  underLoad: boolean;
  queueWaitMs?: number;
  shared: boolean;
  startedAt: string;
  endedAt: string;
  command: string;
};
type Body = { verdict: string; error?: unknown; errors?: unknown[]; [key: string]: unknown };

/** Why a finished run is `killed`, or undefined when its own verdict stands. */
export function killReason(body: Body, signal?: string): string | undefined {
  if (signal) return `signal ${signal}`;
  if (body.verdict === 'pass') return;
  const closed = [body.error, ...(body.errors ?? [])].map(String).find((e) => CLOSED.test(e));
  return closed && `browser closed from outside: ${closed.split('\n')[0]!.slice(0, 300)}`;
}

/** The stamp's derived fields. `limit` is BOOGLE_BOT_MAX_LOAD (0 is off). */
export function stampOf(input: {
  git: Git;
  slot?: Slot;
  shared?: boolean;
  loadAtEnd: number;
  limit: number;
  startedAt: number;
  endedAt: number;
  command: string;
}): Stamp {
  const { git, slot, loadAtEnd, startedAt, endedAt, command } = input;
  const limit = input.limit > 0 ? input.limit : EVIDENCE_LOAD;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    ...git,
    loadAtStart: slot && round(slot.loadAtStart),
    loadAtEnd: round(loadAtEnd),
    underLoad: !!slot?.loadTimedOut || (slot?.loadAtStart ?? 0) > limit || loadAtEnd > limit,
    queueWaitMs: slot?.queueWaitMs,
    shared: !!input.shared,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    command,
  };
}

/** The verdict's one line in report.txt. */
export function stampLine(verdict: string, s: Stamp) {
  const load = `load ${s.loadAtStart ?? '?'} → ${s.loadAtEnd}${s.underLoad ? ' (UNDER LOAD)' : ''}`;
  const tree = `${s.commit?.slice(0, 8) ?? '?'}${s.dirty ? ` + ${s.dirty} uncommitted` : ''}`;
  const wait = s.queueWaitMs === undefined ? '' : `, queued ${(s.queueWaitMs / 1000).toFixed(0)} s`;
  const shared = s.shared ? ', shared the machine with another run' : '';
  const note = verdict === 'pass' && s.underLoad ? '; passed under load: not evidence of timing or feel' : '';
  return `verdict: ${verdict} on ${tree}, ${load}${wait}${shared}, ${s.startedAt} to ${s.endedAt}${note}`;
}

function git(checkout: string): Git {
  const run = (...args: string[]) => execFileSync('git', args, { cwd: checkout, encoding: 'utf8' }).trim();
  try {
    const dirty = run('status', '--porcelain');
    return {
      commit: run('rev-parse', 'HEAD'),
      tree: run('rev-parse', 'HEAD^{tree}'),
      dirty: dirty ? dirty.split('\n').length : 0,
    };
  } catch {
    return {};
  }
}

const quote = (a: string) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`);
function commandLine() {
  const env = Object.entries(process.env)
    .filter(([k]) => /^BOOGLE_(BOT_|QUERY)|^LOOK_/.test(k) && k !== 'BOOGLE_BOT_LEASE')
    .map(([k, v]) => `${k}=${quote(v ?? '')}`);
  const script = path.relative(process.cwd(), process.argv[1] ?? '') || (process.argv[1] ?? '');
  return [...env, 'node', script, ...process.argv.slice(2)].map((a, k) => (k < env.length ? a : quote(a))).join(' ');
}

type Run = {
  file: string;
  report?: string;
  git: Git;
  startedAt: number;
  command: string;
  signal?: string;
  final?: string;
};
let current: Run | undefined;

function write(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}

/** Before anything can fail or queue: the run's verdict reads `running` until it ends. */
export function startRun(file: string, { checkout, report }: { checkout: string; report?: string }) {
  const run: Run = { file, report, git: git(checkout), startedAt: Date.now(), command: commandLine() };
  current = run;
  write(file, {
    verdict: 'running',
    pid: process.pid,
    startedAt: new Date(run.startedAt).toISOString(),
    command: run.command,
    ...run.git,
    note: 'If this pid is gone, the run did not finish: not a pass.',
  });
  for (const signal of SIGNALS)
    process.on(signal, () => {
      if (run.signal) process.exit(KILLED_EXIT); // a second signal: no more cleanup
      run.signal = signal;
      console.error(`${signal}: the run was stopped from outside; its verdict is "killed"`);
      if (!run.final) finishRun({ verdict: 'killed' }, false);
      // Cleanup (browser, Vite, the server child) runs on in the caller's finally; this bounds it.
      setTimeout(() => process.exit(run.final === 'pass' ? Number(process.exitCode ?? 0) : KILLED_EXIT), GRACE_MS);
    });
  process.on('exit', () => {
    if (run.final === 'killed') process.exitCode = KILLED_EXIT;
  });
}

/** A run started and not yet given a verdict: for a top-level catch. */
export const runOpen = () => !!current && !current.final;

/** The run's verdict, stamped. A run already stopped by a signal stays `killed` whatever its caller concludes. */
export function finishRun(body: Body, report = true) {
  const run = current;
  if (!run) throw new Error('finishRun before startRun');
  const reason = killReason(body, run.signal);
  const verdict = reason ? 'killed' : body.verdict;
  const stamp = stampOf({
    git: run.git,
    slot: slotRecord(),
    shared: wasShared(),
    loadAtEnd: os.loadavg()[0]!,
    limit: maxLoad(),
    startedAt: run.startedAt,
    endedAt: Date.now(),
    command: run.command,
  });
  run.final = verdict;
  try {
    write(run.file, {
      ...body,
      ...(body.error === undefined ? {} : { error: String(body.error) }),
      verdict,
      ...(reason ? { reason, ...(body.verdict === 'killed' ? {} : { outcome: body.verdict }) } : {}),
      ...stamp,
      ...(verdict === 'pass' && stamp.underLoad ? { note: 'passed under load: not evidence of timing or feel' } : {}),
    });
    const line = stampLine(verdict, stamp);
    // A signal's own write leaves report.txt to the caller, which may still be writing it.
    if (run.report && report) fs.appendFileSync(run.report, line + '\n');
    console.log(line);
  } catch (error) {
    console.error('verdict not written:', error);
  }
}
