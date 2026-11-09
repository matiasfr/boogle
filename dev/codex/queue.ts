// Run independent Codex jobs with staggered starts and optional dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { alive } from './session.ts';
import { activeMode, codexInNormal } from '../models.ts';

type Job = {
  mode: string;
  topic: string;
  model: string;
  effort: string;
  brief: string;
  after?: string | { onMain: string };
};
type Entry = { job: Job; state: string; child?: ChildProcess; started?: number; detail?: string; hadResult?: boolean };
const [file, ...args] = process.argv.slice(2);
const maxIndex = args.indexOf('--max');
const max = maxIndex < 0 ? 5 : Number(args[maxIndex + 1]);
if (!file || !Number.isInteger(max) || max < 1 || max > 8 || args.length !== (maxIndex < 0 ? 0 : 2))
  throw new Error('Usage: npm run queue -- <file.json> [--max 1..8]');
const jobs: Job[] = JSON.parse(fs.readFileSync(file, 'utf8'));
if (activeMode() === 'normal' && jobs.some((job) => !codexInNormal.includes(job.mode))) {
  console.error(
    'Normal mode is Claude only (dev/models.ts): Codex queues are off. Run `npm run models` for the Claude route.',
  );
  process.exit(2);
}
if (!Array.isArray(jobs) || !jobs.length) throw new Error('Queue must be a nonempty array');
const entries: Entry[] = jobs.map((job) => {
  if (
    !['task', 'research', 'previz', 'review'].includes(job.mode) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.topic) ||
    !job.model ||
    !job.effort ||
    !job.brief ||
    (job.after !== undefined &&
      typeof job.after !== 'string' &&
      (typeof job.after !== 'object' || !job.after || typeof job.after.onMain !== 'string' || !job.after.onMain))
  )
    throw new Error('Invalid queue job');
  return { job, state: 'waiting' };
});
const byTopic = new Map(entries.map((entry) => [entry.job.topic, entry]));
if (byTopic.size !== entries.length) throw new Error('Duplicate topic');
for (const entry of entries) {
  const seen = new Set<string>();
  let current: Entry | undefined = entry;
  while (current && typeof current.job.after === 'string') {
    if (seen.has(current.job.topic)) throw new Error('Cyclic dependency');
    seen.add(current.job.topic);
    current = byTopic.get(current.job.after);
    if (!current) throw new Error('Unknown dependency');
  }
}
const root = process.cwd();
let lastStart = 0;
let lastFetch = 0;
let fetchOk = false;
let stop = '';
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
while (!stop && entries.some((entry) => entry.state === 'waiting' || entry.state === 'running')) {
  const now = Date.now();
  for (const entry of entries.filter((item) => item.state === 'running')) {
    const dir = path.join(root, '.look/codex', entry.job.topic);
    let log = '';
    try {
      log = fs.readFileSync(path.join(dir, 'log.txt'), 'utf8');
    } catch {
      /* starting */
    }
    const limited = log.split('\n').some((line) => {
      try {
        const event = JSON.parse(line);
        const message =
          event.type === 'error'
            ? event.message
            : event.type === 'turn.failed'
              ? event.error?.message
              : event.type === 'item.completed' && event.item?.type === 'error'
                ? event.item.message
                : undefined;
        return (
          typeof message === 'string' &&
          /usage limit|rate limit|too many requests|exceeded your (?:current )?quota/i.test(message)
        );
      } catch {
        return false; // A log line may be incomplete while Codex is writing it.
      }
    });
    if (limited) {
      entry.detail = 'Codex usage limit';
      stop = 'Codex usage limit; no more jobs started';
      break;
    }
    try {
      const modified = fs.statSync(path.join(dir, 'log.txt')).mtimeMs;
      if (now - modified > 20 * 60_000) {
        entry.state = 'stalled';
        stop = `${entry.job.topic} stalled (no log activity for 20 minutes)`;
        break;
      }
    } catch {
      /* setup has not opened the log yet */
    }
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
      if (meta.state === 'running' && (!alive(meta.pid) || Date.now() - Date.parse(meta.heartbeat) > 120_000)) {
        entry.state = 'stalled';
        stop = `${entry.job.topic} stalled`;
        break;
      }
    } catch {
      /* starting */
    }
    if (entry.child && (entry.child.exitCode !== null || entry.child.signalCode !== null)) {
      let outcome: string | undefined;
      if (!entry.hadResult) {
        try {
          outcome = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')).outcome;
        } catch {
          /* Fall back to the launcher status when there is no structured result. */
        }
      }
      entry.state = outcome ? (outcome === 'done' ? 'done' : 'failed') : entry.child.exitCode === 0 ? 'done' : 'failed';
    } else if (now - entry.started! > 10 * 60_000 && !fs.existsSync(path.join(dir, 'meta.json'))) {
      entry.state = 'stalled';
      stop = `${entry.job.topic} stalled during startup`;
      break;
    }
  }
  if (stop) break;
  // Propagate failed dependencies, including chains, without blocking unrelated jobs.
  let blocked: boolean;
  do {
    blocked = false;
    for (const entry of entries) {
      if (entry.state !== 'waiting' || typeof entry.job.after !== 'string') continue;
      if (['failed', 'blocked', 'stalled'].includes(byTopic.get(entry.job.after)!.state)) {
        entry.state = 'blocked';
        entry.detail = `dependency ${entry.job.after} did not finish`;
        blocked = true;
      }
    }
  } while (blocked);
  const needsMain = entries.some((entry) => entry.state === 'waiting' && typeof entry.job.after === 'object');
  if (needsMain && now - lastFetch >= 60_000) {
    lastFetch = now;
    fetchOk = spawnSync('git', ['fetch', '-q', 'origin', 'main'], { stdio: 'ignore' }).status === 0;
  }
  const active = entries.filter((entry) => entry.state === 'running').length;
  const next = entries.find((entry) => {
    if (entry.state !== 'waiting') return false;
    const after = entry.job.after;
    if (!after) return true;
    if (typeof after === 'string') return byTopic.get(after)?.state === 'done';
    return (
      fetchOk && spawnSync('git', ['cat-file', '-e', `origin/main:${after.onMain}`], { stdio: 'ignore' }).status === 0
    );
  });
  if (next && active < max && now - lastStart >= 30_000) {
    const { job } = next;
    next.hadResult = fs.existsSync(path.join(root, '.look/codex', job.topic, 'result.json'));
    const child = spawn(
      process.execPath,
      ['dev/codex/run.ts', job.mode, job.topic, '--model', job.model, '--effort', job.effort, job.brief],
      { stdio: 'ignore' },
    );
    child.on('error', () => {
      next.state = 'failed';
    });
    next.child = child;
    next.started = now;
    next.state = 'running';
    lastStart = now;
  }
  if (!stop && entries.some((entry) => entry.state === 'waiting' || entry.state === 'running')) await pause(1000);
}
for (const entry of entries) {
  let result = '';
  try {
    const data = JSON.parse(fs.readFileSync(path.join(root, '.look/codex', entry.job.topic, 'result.json'), 'utf8'));
    result = ` — ${data.outcome}: ${String(data.summary).replace(/\s+/g, ' ')}`;
  } catch {
    /* No structured result. */
  }
  console.log(`${entry.job.topic}: ${entry.state}${entry.detail ? ` (${entry.detail})` : ''}${result}`);
}
if (stop) {
  console.log(stop);
  process.exitCode = 1;
}
if (entries.some((entry) => entry.state === 'failed' || entry.state === 'blocked')) process.exitCode = 1;
