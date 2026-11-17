// The process eval: the same past tasks rebuilt by different routes of dev/models.ts, scored on their known-good
// tests, so a route change is compared on evidence (docs/agents/models.md, "Changing a route"; ./README.md).
//
//   npm run process-eval                         the tasks
//   npm run process-eval -- prepare <task> --route <name>
//                                                a worktree at the task's base commit, and the brief to hand a builder
//   npm run process-eval -- score <task> <worktree> --route <name> [--rounds n] [--findings n] [--minutes n] [--note s]
//                                                runs the task's known-good tests on the worktree's HEAD and records it
//   npm run process-eval -- report [--compare <routeA> <routeB>]
//                                                pass rates per task and route, and the tasks that flipped
//   npm run process-eval -- verify [task...]     each task's tests fail on its base and pass on its reference commit
import '../node-version.ts'; // first: re-runs under the pinned Node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tasks, type Task } from './tasks.ts';

const HERE = import.meta.dirname;
const RESULTS = path.join(HERE, 'results.jsonl');
const git = (cwd: string, ...a: string[]) =>
  execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const ROOT = git(HERE, 'rev-parse', '--show-toplevel');
/** The checkout that owns the worktrees, so eval worktrees and `.look/` sit beside the others. */
const MAIN = path.dirname(git(ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'));
const SCRATCH = path.join(MAIN, '.look', 'process-eval');

export type Result = {
  task: string;
  route: string;
  run: number;
  date: string;
  head: string;
  passed: boolean;
  pass: number;
  fail: number;
  rounds?: number;
  findings?: number;
  minutes?: number;
  note?: string;
};

const fail = (message: string): never => {
  console.error(`process-eval: ${message}`);
  process.exit(1);
};
const task = (id: string | undefined): Task =>
  tasks.find((t) => t.id === id) ?? fail(`no task "${id ?? ''}" (${tasks.map((t) => t.id).join(', ')})`);
const results = (): Result[] =>
  fs.existsSync(RESULTS)
    ? fs
        .readFileSync(RESULTS, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Result)
    : [];

/** Every file under test/ the reference commit changed: the tests to run, and the helpers and fixtures they need. */
const referenceFiles = (t: Task) =>
  git(ROOT, 'diff', '--name-only', '--diff-filter=AM', `${t.commit}^`, t.commit, '--', 'test')
    .split('\n')
    .filter(Boolean);
const testFiles = (t: Task) => referenceFiles(t).filter((f) => /^test\/[^/]+\.test\.ts$/.test(f));

/** Runs the task's known-good tests against `ref` in a scratch worktree, so the scored checkout is never edited. */
function runTests(t: Task, ref: string, label: string): { passed: boolean; pass: number; fail: number; tail: string } {
  const dir = path.join(SCRATCH, `${t.id}-${label}`);
  fs.mkdirSync(SCRATCH, { recursive: true });
  if (fs.existsSync(dir)) git(MAIN, 'worktree', 'remove', '--force', dir);
  git(MAIN, 'worktree', 'add', '--detach', dir, ref);
  try {
    git(dir, 'checkout', t.commit, '--', ...referenceFiles(t));
    // Unit tests are pure logic, but some import packages: borrow this checkout's install rather than run npm ci.
    const modules = path.join(ROOT, 'node_modules');
    if (fs.existsSync(modules)) fs.symlinkSync(modules, path.join(dir, 'node_modules'), 'dir');
    // node --test directly, not the checkout's own runner: an old base's dev/test-unit.ts ran every test whatever was
    // asked for. The local run's settings (dev/test-env.ts): the rail audit off, and a timeout a loaded Mac can meet.
    const preload = path.join('test', 'helpers', 'rail-no-audit.ts');
    const flags = fs.existsSync(path.join(dir, preload)) ? ['--import', `./${preload}`] : [];
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    const run = spawnSync(process.execPath, [...flags, '--test', '--test-timeout=60000', ...testFiles(t)], {
      cwd: dir,
      encoding: 'utf8',
      env,
      timeout: 5 * 60_000,
    });
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const count = (name: string) => Number(new RegExp(`^ℹ ${name} (\\d+)$`, 'm').exec(out)?.[1] ?? 0);
    const pass = count('pass');
    return {
      passed: run.status === 0 && pass > 0,
      pass,
      fail: count('fail'),
      tail: out.split('\n').slice(-25).join('\n'),
    };
  } finally {
    git(MAIN, 'worktree', 'remove', '--force', dir);
  }
}

const show = (ref: string, file: string) => {
  try {
    return git(ROOT, 'show', `${ref}:${file}`);
  } catch {
    return ''; // new in the reference commit
  }
};

/**
 * The brief a builder gets: the ask, then what the hidden tests need from it, read from the reference commit's tests
 * (the names they import and their titles, which in this repo are sentences). Never the test bodies or the fix.
 */
export function brief(t: Task): string {
  const imports = new Set<string>();
  const checks: string[] = [];
  for (const file of testFiles(t)) {
    const before = show(`${t.commit}^`, file);
    const after = show(t.commit, file);
    for (const m of after.matchAll(/^import\s[^;]*?from\s+'(\.\.\/[^']+)';/gm))
      if (!before.includes(m[0])) imports.add(m[0].replace(/\s+/g, ' '));
    for (const m of after.matchAll(/\btest\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g))
      if (!before.includes(m[0])) checks.push(m[2]!.replace(/\\(.)/g, '$1'));
  }
  const touched = git(ROOT, 'diff', '--name-only', `${t.commit}^`, t.commit)
    .split('\n')
    .filter((f) => f && !f.startsWith('test/') && !f.startsWith('docs/') && !f.includes('/test/'));
  return [
    t.ask,
    '',
    `Code the merged version touched: ${touched.join(', ')}`,
    ...(imports.size
      ? ['', 'The hidden tests import (keep these names and paths):', ...[...imports].map((i) => `  ${i}`)]
      : []),
    ...(checks.length ? ['', 'They check:', ...checks.map((c) => `  - ${c}`)] : []),
  ].join('\n');
}

function flag(args: string[], name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (value === undefined) fail(`--${name} needs a value`);
  args.splice(at, 2);
  return value;
}
const number = (args: string[], name: string) => {
  const value = flag(args, name);
  if (value === undefined) return undefined;
  if (!Number.isFinite(Number(value))) fail(`--${name} must be a number`);
  return Number(value);
};

function list() {
  console.log('| Task | Kind | Reference | Tests | Asks |');
  console.log('| --- | --- | --- | --- | --- |');
  for (const t of tasks) console.log(`| ${t.id} | ${t.kind} | ${t.commit} | ${testFiles(t).join(' ')} | ${t.ask} |`);
}

function prepare(args: string[]) {
  const route = flag(args, 'route') ?? fail('prepare needs --route <name>');
  const t = task(args[0]);
  const run = results().filter((r) => r.task === t.id && r.route === route).length + 1;
  const dir = path.join(MAIN, '.claude', 'worktrees', `eval-${t.id}-${route}-${run}`);
  git(MAIN, 'worktree', 'add', '-b', `eval/${t.id}-${route}-${run}`, dir, `${t.commit}^`);
  console.log(
    `worktree: ${dir}\nbase: ${git(dir, 'rev-parse', '--short', 'HEAD')} (the commit before the reference)\n`,
  );
  console.log('Brief for the builder (the known-good tests stay hidden; do not show the reference commit):\n');
  console.log(brief(t));
  console.log('\nCommit on this branch; do not push or ship. This is an eval run, not work for main.');
  console.log(
    `\nThen: npm run process-eval -- score ${t.id} ${dir} --route ${route} --rounds <n> --findings <n> --minutes <n>`,
  );
}

function score(args: string[]) {
  const route = flag(args, 'route') ?? fail('score needs --route <name>');
  const extra = {
    rounds: number(args, 'rounds'),
    findings: number(args, 'findings'),
    minutes: number(args, 'minutes'),
    note: flag(args, 'note'),
  };
  const t = task(args[0]);
  const worktree = path.resolve(args[1] ?? fail('score needs the worktree to score'));
  if (git(worktree, 'status', '--porcelain')) fail(`${worktree} has uncommitted changes; the score reads its HEAD`);
  const head = git(worktree, 'rev-parse', 'HEAD');
  const ran = runTests(t, head, 'score');
  const result: Result = {
    task: t.id,
    route,
    run: results().filter((r) => r.task === t.id && r.route === route).length + 1,
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD, local
    head: head.slice(0, 9),
    passed: ran.passed,
    pass: ran.pass,
    fail: ran.fail,
    ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)),
  };
  fs.appendFileSync(RESULTS, `${JSON.stringify(result)}\n`);
  if (!ran.passed) console.log(ran.tail);
  console.log(
    `${t.id} on ${route}, run ${result.run}: ${ran.passed ? 'PASS' : 'FAIL'} (${ran.pass} passed, ${ran.fail} failed)`,
  );
}

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)]! : undefined;
};

/** One route's runs of one task: passes, and whether it may be compared (the article's "run each task more than once"). */
export function summary(runs: Result[]) {
  const passes = runs.filter((r) => r.passed).length;
  const of = (key: 'rounds' | 'findings' | 'minutes') =>
    median(runs.map((r) => r[key]).filter((v): v is number => v !== undefined));
  return {
    runs: runs.length,
    passes,
    verdict: !runs.length ? 'none' : passes === runs.length ? 'pass' : passes === 0 ? 'fail' : 'mixed',
    rounds: of('rounds'),
    findings: of('findings'),
    minutes: of('minutes'),
  };
}

function report(args: string[]) {
  const at = args.indexOf('--compare');
  const compare = at < 0 ? undefined : [args[at + 1], args[at + 2]];
  if (compare && (!compare[0] || !compare[1])) fail('--compare needs two route names');
  const all = results();
  const routes = [...new Set(all.map((r) => r.route))].sort();
  if (!all.length) return console.log('No runs recorded yet (npm run process-eval -- prepare <task> --route <name>).');
  const cell = (id: string, route: string) => {
    const s = summary(all.filter((r) => r.task === id && r.route === route));
    if (!s.runs) return '-';
    const more = [s.rounds !== undefined && `${s.rounds} rounds`, s.findings !== undefined && `${s.findings} findings`]
      .concat(s.minutes !== undefined && `${s.minutes} min`)
      .filter(Boolean);
    return `${s.passes}/${s.runs}${more.length ? ` (${more.join(', ')})` : ''}`;
  };
  console.log(`| Task | ${routes.join(' | ')} |\n| --- | ${routes.map(() => '---').join(' | ')} |`);
  for (const t of tasks) console.log(`| ${t.id} | ${routes.map((route) => cell(t.id, route)).join(' | ')} |`);
  console.log('\nCells: passes/runs (median rounds to merge, review findings, minutes).');
  if (!compare) return;
  const [a, b] = compare as [string, string];
  console.log(`\n${a} against ${b}:`);
  let flips = 0;
  for (const t of tasks) {
    const sa = summary(all.filter((r) => r.task === t.id && r.route === a));
    const sb = summary(all.filter((r) => r.task === t.id && r.route === b));
    if (sa.runs < 2 || sb.runs < 2) {
      console.log(`- ${t.id}: not comparable yet (${a} ${sa.runs} runs, ${b} ${sb.runs}; each needs two)`);
    } else if (sa.verdict !== sb.verdict) {
      flips++;
      console.log(
        `- ${t.id}: FLIPPED, ${a} ${sa.verdict} (${sa.passes}/${sa.runs}), ${b} ${sb.verdict} (${sb.passes}/${sb.runs})`,
      );
    }
  }
  console.log(flips ? `${flips} task(s) flipped: read each before keeping the change.` : 'No comparable task flipped.');
}

function verify(args: string[]) {
  let bad = 0;
  for (const t of args.length ? args.map(task) : tasks) {
    if (!testFiles(t).length) fail(`${t.id}: its reference commit changes no test/*.test.ts`);
    const base = runTests(t, `${t.commit}^`, 'verify-base');
    const reference = runTests(t, t.commit, 'verify-reference');
    const ok = !base.passed && reference.passed;
    if (!ok) bad++;
    console.log(
      `${ok ? 'ok ' : 'BAD'} ${t.id}: base ${base.passed ? 'passes (the tests prove nothing)' : 'fails'}, reference ${reference.passed ? 'passes' : 'FAILS'}`,
    );
    if (!reference.passed) console.log(reference.tail);
  }
  if (bad) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === 'list') list();
  else if (command === 'prepare') prepare(args);
  else if (command === 'score') score(args);
  else if (command === 'report') report(args);
  else if (command === 'verify') verify(args);
  else fail(`unknown command "${command}" (list, prepare, score, report, verify)`);
}
