// What CI costs and how long it takes, from GitHub's own run and job records (read-only; starts nothing).
//   node dev/ci/run-costs.ts [--runs 300] [--steps]
// Groups the last N runs of ci.yml by what they were (a docs ship, a ship with the selected unit tests, a ship with
// the full suite, a main run that finished, a main run a newer one cancelled) and prints, per group: wall time
// (run created to last update), runner time (the sum of every job's start to end, which is what a private repo is
// billed for, before rounding each job up to a minute), and each job's p50, p90 and total. --steps adds the steps
// that took the most runner time. Compare two printouts to judge a CI change; a cancelled main run's runner time is
// work that produced no verdict.
import { execFileSync } from 'node:child_process';

interface Run {
  databaseId: number;
  headBranch: string;
  conclusion: string;
  createdAt: string;
  updatedAt: string;
}
interface Step {
  name: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}
interface Job {
  name: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps?: Step[];
}
interface Group {
  runs: number;
  wall: number[];
  runner: number[];
  jobs: Map<string, number[]>;
  steps: Map<string, number[]>;
}

const arg = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const limit = Number(arg('--runs') ?? 300);
const gh = (...args: string[]) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const seconds = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 1000;
const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const quantile = (a: readonly number[], p: number) =>
  Math.round([...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] ?? NaN);
const push = (map: Map<string, number[]>, key: string, value: number) => {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
};

const runs = JSON.parse(
  gh(
    'run',
    'list',
    '--workflow',
    'ci.yml',
    '--limit',
    String(limit),
    '--status',
    'completed',
    '--json',
    'databaseId,headBranch,conclusion,createdAt,updatedAt',
  ),
) as Run[];
const groups = new Map<string, Group>();
let unread = 0;
for (const run of runs) {
  let jobs: Job[];
  try {
    jobs = (
      JSON.parse(gh('api', `repos/{owner}/{repo}/actions/runs/${run.databaseId}/jobs?per_page=100`)) as { jobs: Job[] }
    ).jobs;
  } catch {
    unread++; // GitHub answers 502 for some runs' jobs
    continue;
  }
  // A job cancelled before it got a runner has an end before its start.
  const ran = jobs.filter(
    (j) => j.started_at && j.completed_at && j.conclusion !== 'skipped' && j.completed_at >= j.started_at,
  );
  if (ran.length === 0) continue; // a ship PR's own pull_request run, or a pending run that was replaced
  const shards = ran.filter((j) => j.name.startsWith('unit')).length;
  const kind =
    run.headBranch === 'main'
      ? `main, ${run.conclusion}`
      : shards === 0
        ? 'ship, docs only'
        : shards === 1
          ? 'ship, selected unit tests'
          : 'ship, full unit suite';
  const group: Group = groups.get(kind) ?? { runs: 0, wall: [], runner: [], jobs: new Map(), steps: new Map() };
  groups.set(kind, group);
  group.runs++;
  group.wall.push(seconds(run.createdAt, run.updatedAt));
  let runner = 0;
  for (const job of ran) {
    const name = job.name.replace(/ \(.*/, ''); // unit (3) -> unit
    const took = seconds(job.started_at!, job.completed_at!);
    runner += took;
    push(group.jobs, name, took);
    for (const step of job.steps ?? [])
      if (step.started_at && step.completed_at && step.conclusion !== 'skipped')
        push(group.steps, `${name}: ${step.name.slice(0, 50)}`, seconds(step.started_at, step.completed_at));
  }
  group.runner.push(runner);
}

const minutes = (s: number) => Math.round(s / 60);
const oldest = runs.at(-1)?.createdAt ?? '';
const newest = runs[0]?.createdAt ?? '';
const hours = oldest && newest ? seconds(oldest, newest) / 3600 : 0;
const total = sum([...groups.values()].map((g) => sum(g.runner)));
console.log(`${runs.length} completed CI runs, ${oldest} to ${newest} (${hours.toFixed(1)} h); ${unread} unreadable.`);
console.log(`Runner time in all: ${minutes(total)} min (${Math.round(total / 60 / Math.max(hours, 1))} min an hour).`);
for (const [kind, g] of [...groups].sort((a, b) => sum(b[1].runner) - sum(a[1].runner))) {
  console.log(
    `\n${kind}: ${g.runs} runs, wall p50 ${quantile(g.wall, 0.5)} s p90 ${quantile(g.wall, 0.9)} s, ` +
      `runner p50 ${quantile(g.runner, 0.5)} s, total ${minutes(sum(g.runner))} min (${Math.round((100 * sum(g.runner)) / total)}%)`,
  );
  for (const [name, took] of g.jobs)
    console.log(
      `  ${name.padEnd(9)} ${String(took.length).padStart(4)} jobs  p50 ${String(quantile(took, 0.5)).padStart(4)} s  ` +
        `p90 ${String(quantile(took, 0.9)).padStart(4)} s  total ${String(minutes(sum(took))).padStart(5)} min`,
    );
  if (process.argv.includes('--steps'))
    for (const [name, took] of [...g.steps].sort((a, b) => sum(b[1]) - sum(a[1])).slice(0, 8))
      console.log(
        `    step ${name.padEnd(62)} p50 ${String(quantile(took, 0.5)).padStart(4)} s  total ${minutes(sum(took))} min`,
      );
}
