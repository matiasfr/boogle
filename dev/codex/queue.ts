// Run independent Codex jobs with staggered starts and optional dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { alive } from './session.ts';

type Job = {
  mode: string;
  topic: string;
  model: string;
  effort: string;
  brief: string;
  after?: string | { onMain: string };
};
type Entry = { job: Job; state: string; child?: ChildProcess; started?: number; detail?: string };
const [file, ...args] = process.argv.slice(2);
const maxIndex = args.indexOf('--max');
const max = maxIndex < 0 ? 3 : Number(args[maxIndex + 1]);
if (!file || !Number.isInteger(max) || max < 1 || max > 3 || args.length !== (maxIndex < 0 ? 0 : 2))
  throw new Error('Usage: npm run queue -- <file.json> [--max 1..3]');
const jobs: Job[] = JSON.parse(fs.readFileSync(file, 'utf8'));
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
    if (/usage limit|rate limit|too many requests|exceeded your (?:current )?quota/i.test(log)) {
      entry.detail = 'Codex usage limit';
      stop = 'Codex usage limit; no more jobs started';
      break;
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
    if (entry.child?.exitCode !== null && entry.child?.exitCode !== undefined) {
      entry.state = entry.child.exitCode === 0 ? 'done' : 'failed';
      if (entry.state === 'failed') {
        stop = `${entry.job.topic} failed`;
        break;
      }
    } else if (now - entry.started! > 120_000 && !fs.existsSync(path.join(dir, 'meta.json'))) {
      entry.state = 'stalled';
      stop = `${entry.job.topic} stalled during startup`;
      break;
    }
  }
  if (stop) break;
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
    const child = spawn(
      process.execPath,
      ['dev/codex/run.ts', job.mode, job.topic, '--model', job.model, '--effort', job.effort, job.brief],
      { stdio: 'ignore' },
    );
    child.on('error', () => {
      next.state = 'failed';
      stop = `${job.topic} failed to start`;
    });
    next.child = child;
    next.started = now;
    next.state = 'running';
    lastStart = now;
  }
  if (!stop && entries.some((entry) => entry.state === 'waiting' || entry.state === 'running')) await pause(1000);
}
for (const entry of entries)
  console.log(`${entry.job.topic}: ${entry.state}${entry.detail ? ` (${entry.detail})` : ''}`);
if (stop) {
  console.log(stop);
  process.exitCode = 1;
}
