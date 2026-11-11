// Foreground launchd job. A crash deliberately leaves the lock for inspection: children may still be running.
import '../node-version.ts'; // first: re-runs under the pinned Node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { acquireBotSlot } from '../look/bot-queue.ts';
import { jobs, jobName, longArgs, prompt, reviewPrompt, stateDir, scenarios, liveScenarios as LIVE } from './jobs.ts';
import { longReport } from './long.ts';
import { PERF_POLICY, compare, invalid, report, type Bench, type Entry } from './perf.ts';

const args = process.argv.slice(2);
const job = jobName(args.shift());
const dry = args.includes('--dry-run');
const force = args.includes('--force');
const noteIndex = args.indexOf('--notes');
const notes = noteIndex >= 0 ? args[noteIndex + 1] : '';
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
const known = args.filter(
  (_, i) =>
    (noteIndex < 0 || (i !== noteIndex && i !== noteIndex + 1)) &&
    (onlyIndex < 0 || (i !== onlyIndex && i !== onlyIndex + 1)),
);
if (
  known.some((a) => !['--dry-run', '--force', '--local'].includes(a)) ||
  notes === undefined ||
  (onlyIndex >= 0 && !only)
)
  throw new Error(
    'Usage: npm run daily -- atlas|patch-video|scenarios|perf|long [--dry-run] [--force] [--notes "..."] [--only scenario] [--local]',
  );
if (args.includes('--local') && job !== 'perf' && job !== 'long')
  throw new Error('--local is for the perf and long jobs');
// A local check: this worktree and its installed dependencies, no GitHub (scenarios --only, perf --local).
const local = only !== undefined || args.includes('--local');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const spec = jobs[job];
const env = { ...process.env, SHIP_NO_AI: '1', PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1', GIT_TERMINAL_PROMPT: '0' };
let commandLog: string | undefined;
// Subscription login only. Never accidentally fall back to API billing or Claude during delivery.
for (const key of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'ANTHROPIC_API_KEY']) delete env[key as keyof typeof env];

function run(cmd: string, argv: string[], cwd = root, extra: NodeJS.ProcessEnv = {}): string {
  console.log(`> ${cmd} ${argv.map((a) => JSON.stringify(a)).join(' ')} (in ${cwd})`);
  const output = execFileSync(cmd, argv, {
    cwd,
    env: { ...env, ...extra },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (commandLog) fs.appendFileSync(commandLog, `> ${cmd} ${argv.join(' ')}\n${output}\n`);
  return output.trim();
}

function codex(work: string, report: string, brief: string) {
  const argv = [
    'exec',
    '-C',
    work,
    '-m',
    spec.model,
    '-c',
    `model_reasoning_effort="${spec.effort}"`,
    '-c',
    'forced_login_method="chatgpt"',
    '-c',
    'approval_policy="never"',
    '-s',
    'danger-full-access',
    '-o',
    report,
    '-',
  ];
  console.log(`> codex ${argv.join(' ')}`);
  fs.writeFileSync(report + '.prompt.txt', brief);
  const log = fs.openSync(report + '.log', 'w', 0o600);
  try {
    execFileSync('codex', argv, { cwd: work, env, input: brief, stdio: ['pipe', log, log] });
  } catch (error) {
    // Out of subscription usage (9-10 November) is a skipped night, not a failed job: name when it comes back.
    const limit = /You.ve hit your usage limit\..*?(try again at [^.\n]*)?\.?$/m.exec(
      fs.readFileSync(report + '.log', 'utf8'),
    );
    if (limit) throw new UsageLimit(`skipped: Codex usage limit${limit[1] ? `, ${limit[1]}` : ''}`);
    throw error;
  } finally {
    fs.closeSync(log);
  }
}
class UsageLimit extends Error {}

// GitHub calls run from the durable checkout with an explicit repository, never from the run's worktree: on 9 November
// another session's worktree cleanup removed that worktree mid-run and the report then failed outside a git repository.
let repo = '';
const gh = (argv: string[]) => run('gh', [...argv, '--repo', repo]);

/** Holds the machine bot slot (dev/look/bot-queue.ts) around `fn`, so no other harness browser shares the GPU and a
 * child's timeout starts once the slot is ours. The child inherits it through BOOGLE_BOT_LEASE; one child per slot. */
async function holding<T>(job: string, long: boolean, fn: (leased: NodeJS.ProcessEnv) => T | Promise<T>) {
  const lease = await acquireBotSlot(job, () => {}, long);
  try {
    return await fn({ ...env, BOOGLE_BOT_LEASE: lease.file });
  } finally {
    lease.release();
  }
}

/** Harness Chromium processes (Playwright's, not the owner's browser). With the slot held, any is an orphan or a launcher
 * that skips the queue, and it would share the GPU. */
function harnessBrowsers() {
  const ps = spawnSync('ps', ['-Ao', 'command'], { encoding: 'utf8' }).stdout ?? '';
  return ps.split('\n').filter((l) => l.includes('/ms-playwright/') && !l.includes(' --type=')).length;
}

/** The busiest processes now, `<%cpu> <command>`: a loaded night's evidence names what shared the machine. */
function busiest(n = 8) {
  const ps = spawnSync('ps', ['-Arwwo', 'pcpu=,command='], { encoding: 'utf8' }).stdout ?? '';
  return ps
    .split('\n')
    .map((l) => l.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, n);
}

/** Waits, bounded, for a quiet machine. Returns '' once quiet, or the reason it gave up. */
async function waitForQuiet() {
  const { maxLoad, waitMinutes } = PERF_POLICY.quiet;
  const until = Date.now() + waitMinutes * 60_000;
  for (;;) {
    const load = os.loadavg()[0]!;
    const browsers = harnessBrowsers();
    if (load <= maxLoad && !browsers) return '';
    if (Date.now() > until)
      return `skipped: machine busy (load ${load.toFixed(1)}${browsers ? `; ${browsers} other harness browser${browsers > 1 ? 's' : ''}` : ''})`;
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

/** The one open issue labelled `performance`, created on the first run. */
function performanceIssue(dir: string) {
  const issues = JSON.parse(
    gh(['issue', 'list', '--label', 'performance', '--state', 'open', '--limit', '100', '--json', 'number']),
  ) as { number: number }[];
  if (issues.length > 1) throw new Error('Multiple open performance issues; resolve duplicates before reporting');
  if (issues[0]) return String(issues[0].number);
  gh(['label', 'create', 'performance', '--color', '1d76db', '--description', 'Daily benchmark', '--force']);
  const intro = path.join(dir, 'issue.md');
  fs.writeFileSync(
    intro,
    'The daily benchmark comments here every night (dev/daily/README.md, the perf job; dev/look/bench.ts). Each ' +
      'comment compares origin/main with the median of the last valid runs and lists regressions, budgets and ' +
      'the commit range. Keep it open: it is the history agents read.\n',
  );
  return gh(['issue', 'create', '--title', 'Performance', '--label', 'performance', '--body-file', intro]);
}

/** One issue per check (scenarios, long-run): created or commented on a failure, commented and closed on a pass. */
function reportIssue(label: string, title: string, description: string, file: string, failed: boolean) {
  const issues = JSON.parse(
    gh(['issue', 'list', '--label', label, '--state', 'open', '--limit', '100', '--json', 'number']),
  ) as { number: number }[];
  if (issues.length > 1) throw new Error(`Multiple open ${label} issues; resolve duplicates before reporting`);
  if (failed && !issues.length) {
    gh(['label', 'create', label, '--color', 'd93f0b', '--description', description, '--force']);
    gh(['issue', 'create', '--title', title, '--label', label, '--body-file', file]);
  } else if (issues.length) {
    gh(['issue', 'comment', String(issues[0]!.number), '--body-file', file]);
    if (!failed) gh(['issue', 'close', String(issues[0]!.number)]);
  }
}

const output = (execution: SpawnSyncReturns<string>) => (execution.stdout ?? '') + (execution.stderr ?? '');

if (onlyIndex >= 0 && (job !== 'scenarios' || !scenarios.includes(only!))) throw new Error('Unknown nightly scenario');
const selected = only ? [only] : scenarios;
const perfHistory = path.join(stateDir, 'perf', 'history.jsonl');
if (dry && job === 'perf') {
  console.log(
    JSON.stringify(
      {
        job,
        stateDir,
        lock: path.join(stateDir, 'active'),
        time: '02:50 local',
        history: perfHistory,
        steps: [
          'acquire shared lock',
          ...(local
            ? ['use current worktree and installed dependencies; do not contact GitHub or write history']
            : ['fetch origin/main and create a fresh, locked worktree', 'npm ci', 'install Playwright Chromium']),
          'take the machine bot slot and hold it until the benchmark ends',
          `wait up to ${PERF_POLICY.quiet.waitMinutes} min for 1-minute load <= ${PERF_POLICY.quiet.maxLoad} and no other harness browser; else "skipped: machine busy (load N)"`,
          'caffeinate -dimu node dev/look/bench.ts --out <run>/bench.json (visible Chromium on the Mac GPU, in the held slot)',
          'compare with the median of the last valid runs; flag regressions, budgets and the commit range',
          ...(local ? [] : ['append a valid run to history', 'comment on the Performance issue (created once)']),
          'keep bench.json, bench.log, comparison.json and notification.md; remove the worktree; release lock',
        ],
      },
      null,
      2,
    ),
  );
} else if (dry && job === 'long') {
  console.log(
    JSON.stringify(
      {
        job,
        stateDir,
        lock: path.join(stateDir, 'active'),
        time: '07:40 local',
        steps: [
          'acquire shared lock',
          ...(local
            ? ['use current worktree and installed dependencies; do not contact GitHub']
            : ['fetch origin/main and create a fresh, locked worktree', 'npm ci', 'install Playwright Chromium']),
          'take the machine bot slot as a long job (shorter runs pass it for 20 min), then start the 60 min timeout',
          `node dev/look/playthrough.ts ${longArgs.join(' ')} --out <run>/playthrough --name long`,
          'read verdict.json and report.txt: checkpoints (RAIL_STOPS) with game times, total game-minutes',
          ...(local
            ? ['print the report']
            : ['update the long-run issue: open or comment on failure, close on a pass']),
          'keep playthrough/long, long.log and notification.md; remove the worktree; release lock',
        ],
      },
      null,
      2,
    ),
  );
} else if (dry && job === 'scenarios') {
  console.log(
    JSON.stringify(
      {
        job,
        stateDir,
        lock: path.join(stateDir, 'active'),
        time: '03:30 local',
        scenarios: selected,
        steps: [
          'acquire shared lock',
          ...(local
            ? ['use current worktree and installed dependencies; do not contact GitHub']
            : ['fetch origin/main and create a fresh, locked worktree', 'npm ci', 'install Playwright Chromium']),
          'run scenarios sequentially on Mac GPU, each in its own bot slot; its 15 min timeout starts once the slot is held',
          'stop and report a runner failure if the worktree disappears mid-run',
          ...(local ? ['skip issue reporting'] : ['update scenarios issue once']),
          'preserve artifacts and release lock',
        ],
      },
      null,
      2,
    ),
  );
} else if (dry) {
  console.log(
    JSON.stringify(
      {
        job,
        force,
        stateDir,
        lock: path.join(stateDir, 'active'),
        source: 'fresh worktree from fetched origin/main; caller files never copied',
        steps: [
          'acquire shared atomic lock (skip if held)',
          'verify ChatGPT Codex login and gh auth',
          'git fetch origin main --tags',
          'git worktree add -b daily/<job>-<id> <run>/worktree origin/main',
          'skip if an earlier daily/legacy job PR is still open',
          job === 'atlas' ? 'node dev/atlas/cli.ts --gate --event schedule' : 'node dev/video/changes.ts --count (>=3)',
          'skip gate=false unless --force',
          'npm ci (separate dependencies)',
          ...(job === 'patch-video' ? ['check ffmpeg/ffprobe; npx playwright install chromium'] : []),
          `codex exec -m ${spec.model} -c model_reasoning_effort="${spec.effort}" -s danger-full-access (ChatGPT login)`,
          ...(job === 'patch-video' ? ['if publish.json: independent Codex review; require review.json approval'] : []),
          `reject edits outside ${spec.scope}; prettier; npm run check; commit only changed allowed files`,
          'if committed: SHIP_NO_AI=1 npm run ship -- --wait; no changes means no commit or ship',
          ...(job === 'patch-video'
            ? [
                'if approved cut: video:publish --from .look/publish.json',
                'post share link to Patch videos issue, mentioning repository owner',
              ]
            : []),
          'preserve .look artifacts/reports; remove successful worktree; retain failed worktree; release lock',
        ],
        prompt: prompt(job, '<fetched-main-sha>', notes),
        ...(job === 'patch-video' ? { reviewPrompt } : {}),
      },
      null,
      2,
    ),
  );
} else {
  if (process.platform !== 'darwin' || Number(process.versions.node.split('.')[0]) < 26)
    throw new Error('Daily jobs require macOS and Node 26 or newer');
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const lock = path.join(stateDir, 'active');
  try {
    fs.mkdirSync(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    console.log(
      `Skipped: another daily run holds ${lock}. If stale, inspect its owner.json and children before removal.`,
    );
    process.exit(0);
  }
  const id = `${job}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
  const dir = path.join(stateDir, 'runs', id);
  const work = local ? root : path.join(dir, 'worktree');
  const branch = `daily/${id}`;
  fs.writeFileSync(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, job, dir, started: new Date() }));
  fs.mkdirSync(dir, { recursive: true });
  commandLog = path.join(dir, 'commands.log');
  let created = false;
  let succeeded = false;
  const result: Record<string, unknown> = { job, dir, branch, started: new Date().toISOString() };
  /** Why the run's worktree is gone, or '' while it is intact. The runner locks it, so this means something forced it. */
  const vanished = () => {
    if (!created || fs.existsSync(path.join(work, '.git'))) return '';
    const kept = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: root }).status;
    return (
      `the run's worktree ${work} was removed mid-run (its .git file is gone` +
      `${kept === 0 ? '' : ' and its branch deleted, as a worktree cleanup does'}) although the run had locked it`
    );
  };
  try {
    if (job === 'atlas' || job === 'patch-video') {
      const login = spawnSync('codex', ['login', 'status'], {
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (login.status !== 0 || !/ChatGPT/i.test(login.stdout + login.stderr))
        throw new Error('Use codex login with the owner ChatGPT account; subscription login was not confirmed');
    }
    if (!local) {
      run('gh', ['auth', 'status']);
      repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
      run('git', ['fetch', '--prune', '--tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
      // Locked: on 9 November another session's cleanup of "merged, clean" worktrees removed this run's worktree (a
      // daily branch sits at origin/main) halfway through the scenarios. Cleanups that honour locks now leave it.
      const reason = `daily ${job} run, pid ${process.pid}; the runner removes it, a failed run keeps it for inspection`;
      run('git', ['worktree', 'add', '--lock', '--reason', reason, '-b', branch, work, 'origin/main']);
      created = true;
    }
    const base = run('git', ['rev-parse', 'HEAD'], work);
    result.base = base;
    if (job === 'perf') {
      if (!local) {
        run('npm', ['ci'], work);
        run('npx', ['playwright', 'install', 'chromium'], work);
      }
      const benchFile = path.join(dir, 'bench.json');
      // The whole measurement holds the bot slot: no agent's browser shares the GPU while it waits or measures.
      const measured = await holding(`daily perf ${id}`, false, async (leased) => {
        const busy = await waitForQuiet();
        if (busy) return { busy };
        const before = os.loadavg()[0]!;
        const busyBefore = busiest();
        // A visible browser: keep the display awake for the run (a sleeping display stops animation frames).
        const execution = spawnSync(
          'caffeinate',
          ['-dimu', process.execPath, 'dev/look/bench.ts', '--out', benchFile, '--commit', base],
          { cwd: work, env: leased, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 },
        );
        return {
          execution,
          load: [before, os.loadavg()[0]!] as [number, number],
          busiest: { before: busyBefore, after: busiest() },
        };
      });
      const file = path.join(dir, 'notification.md');
      if (!measured.execution) {
        // Not "invalid": nothing was measured. The night says why, and the baseline is untouched.
        result.status = 'skipped';
        result.reason = measured.busy;
        fs.writeFileSync(
          file,
          `Daily benchmark of ${base.slice(0, 8)}: ${measured.busy}. Waited ${PERF_POLICY.quiet.waitMinutes} min with ` +
            `the bot slot held for a 1-minute load of at most ${PERF_POLICY.quiet.maxLoad} and no other harness ` +
            `browser; nothing was measured.\n\nMac run: ${dir}\n`,
        );
        console.log(measured.busy);
      } else {
        const { execution, load } = measured;
        result.load = load;
        result.busiest = measured.busiest;
        fs.writeFileSync(path.join(dir, 'bench.log'), output(execution));
        if (execution.status !== 0 || !fs.existsSync(benchFile))
          throw new Error(
            `Benchmark failed (exit ${execution.status}${execution.error ? ': ' + execution.error.message : ''}); see bench.log`,
          );
        const bench = JSON.parse(fs.readFileSync(benchFile, 'utf8')) as Bench;
        const history: Entry[] = fs.existsSync(perfHistory)
          ? fs
              .readFileSync(perfHistory, 'utf8')
              .split('\n')
              .filter(Boolean)
              .map((l) => JSON.parse(l) as Entry)
          : [];
        const problems = invalid(bench);
        const comparison = compare(bench, history);
        let range = '';
        if (comparison.baselineFrom && comparison.baselineFrom !== base)
          try {
            const lines = run('git', ['log', '--oneline', '--first-parent', `${comparison.baselineFrom}..${base}`])
              .split('\n')
              .filter(Boolean);
            range = lines.slice(0, 40).join('\n') + (lines.length > 40 ? `\n... and ${lines.length - 40} more` : '');
          } catch {
            range = `${comparison.baselineFrom}..${base} (log unavailable)`;
          }
        const body = report(bench, comparison, { base, range, dir, problems, load });
        fs.writeFileSync(
          path.join(dir, 'comparison.json'),
          JSON.stringify({ problems, ...comparison }, null, 2) + '\n',
        );
        fs.writeFileSync(file, body + '\n');
        console.log(body);
        result.regressions = comparison.regressions.map((c) => c.name);
        result.overBudget = comparison.over;
        result.problems = problems;
        // An invalid run (a hidden page, missing GPU times) is reported but never becomes a baseline.
        if (!local && !problems.length) {
          fs.mkdirSync(path.dirname(perfHistory), { recursive: true });
          const entry: Entry = { date: new Date().toISOString(), base, dir, metrics: comparison.metrics };
          fs.appendFileSync(perfHistory, JSON.stringify(entry) + '\n');
        }
        result.status = problems.length ? 'invalid' : comparison.regressions.length ? 'regressed' : 'passed';
      }
      if (!local) gh(['issue', 'comment', performanceIssue(dir), '--body-file', file]);
      succeeded = true;
    } else if (job === 'scenarios') {
      if (!local) {
        run('npm', ['ci'], work);
        run('npx', ['playwright', 'install', 'chromium'], work);
      }
      const failures: string[] = [];
      for (const name of selected) {
        const gone = vanished();
        if (gone) {
          // Not a scenario result: stop, and say so in the report (which runs from the durable checkout).
          result.runnerError = gone;
          failures.push(`- runner: ${gone}; stopped before ${name}, so the remaining scenarios did not run`);
          break;
        }
        // Each scenario takes the bot slot first, so its 15 minutes measure the scenario, not the queue: on 9 November
        // reconnect-edit and shared-kinds spent their whole timeout queued behind an agent's long playthrough.
        const started = Date.now();
        const { execution, waited } = await holding(`daily scenario ${name}`, false, (leased) => {
          const waited = Date.now() - started;
          const execution = spawnSync(
            process.execPath,
            [
              'dev/scenarios/run.ts',
              name,
              ...(LIVE[name] ? ['--url', LIVE[name]] : []),
              '--out',
              path.join(dir, 'artifacts', 'scenarios'),
            ],
            { cwd: work, env: leased, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 },
          );
          return { execution, waited };
        });
        const log = output(execution);
        const header = `daily: bot slot after ${Math.round(waited / 1000)} s queued; 1-minute load ${os.loadavg()[0]!.toFixed(1)} at the end\n`;
        fs.writeFileSync(path.join(dir, `${name}.log`), header + log);
        if (execution.status !== 0) {
          const lines = log.split('\n').filter((line) => /\bFAIL\b/i.test(line));
          failures.push(
            `- ${name}: ${(execution.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' ? 'FAIL: timed out after 15 minutes (after taking the bot slot)' : lines.length ? lines.join('\n  ') : `exit ${execution.status}: ${execution.error?.message ?? 'no FAIL line'}`}`,
          );
        }
      }
      result.failures = failures;
      if (!local) {
        const body = path.join(dir, 'notification.md');
        fs.writeFileSync(
          body,
          failures.length
            ? `Nightly scenarios failed on ${base}:\n\n${failures.join('\n')}\n\nMac run: ${dir}\n`
            : `Nightly scenarios passed on ${base}.\n\nMac run: ${dir}\n`,
        );
        reportIssue(
          'scenarios',
          'Nightly browser scenarios are failing',
          'Nightly browser scenarios',
          body,
          failures.length > 0,
        );
      }
      result.status = failures.length ? 'failed' : 'passed';
      succeeded = true;
    } else if (job === 'long') {
      if (!local) {
        run('npm', ['ci'], work);
        run('npx', ['playwright', 'install', 'chromium'], work);
      }
      const out = path.join(dir, 'playthrough');
      // A long ticket: shorter runs pass it while it waits (dev/look/bot-queue.ts); its hour starts once it has the slot.
      const execution = await holding(`daily long ${id}`, true, (leased) =>
        spawnSync(process.execPath, ['dev/look/playthrough.ts', ...longArgs, '--out', out, '--name', 'long'], {
          cwd: work,
          env: leased,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
          timeout: 60 * 60 * 1000,
        }),
      );
      fs.writeFileSync(path.join(dir, 'long.log'), output(execution));
      const gone = vanished();
      if (gone) throw new Error(gone);
      const read = longReport(path.join(out, 'long'), { base, dir });
      const timedOut = (execution.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
      const passed = read.passed && execution.status === 0;
      const body = path.join(dir, 'notification.md');
      fs.writeFileSync(
        body,
        (timedOut ? 'The runner stopped the playthrough after 60 minutes with the bot slot held.\n\n' : '') + read.body,
      );
      console.log(read.body);
      Object.assign(result, { verdict: read.verdict, gameMinutes: read.gameMinutes, checkpoints: read.checkpoints });
      if (!local)
        reportIssue('long-run', 'Nightly long playthrough is failing', 'Nightly long playthrough', body, !passed);
      result.status = passed ? 'passed' : 'failed';
      succeeded = true;
    } else {
      const prs = JSON.parse(
        gh(['pr', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,headRefName']),
      ) as { number: number; title: string; headRefName: string }[];
      const pending = prs.find(
        (p) => p.title.startsWith(`Daily ${job}:`) || p.headRefName.startsWith(`claude/${job}-`),
      );
      const gate =
        job === 'atlas'
          ? run(process.execPath, ['dev/atlas/cli.ts', '--gate', '--event', 'schedule'], work)
          : run(process.execPath, ['dev/video/changes.ts', '--count', '--no-fetch', '--until', base], work);
      const go = job === 'atlas' ? /^go=1$/m.test(gate) : /^\d+$/.test(gate) && Number(gate) >= 3;
      if (pending || (!force && !go)) {
        result.status = 'skipped';
        result.reason = pending ? `PR #${pending.number} is still open; inspect it before replacing` : gate;
        console.log(result.reason);
      } else {
        run('npm', ['ci'], work);
        if (job === 'patch-video') {
          run('ffmpeg', ['-version'], work);
          run('ffprobe', ['-version'], work);
          run('npx', ['playwright', 'install', 'chromium'], work);
        }
        codex(work, path.join(dir, 'report.md'), prompt(job, base, notes));
        const publish = path.join(work, '.look/publish.json');
        if (job === 'patch-video' && fs.existsSync(publish)) {
          fs.rmSync(path.join(work, '.look/review.json'), { force: true });
          codex(work, path.join(dir, 'review.md'), reviewPrompt);
          const review = JSON.parse(fs.readFileSync(path.join(work, '.look/review.json'), 'utf8'));
          if (review.approved !== true || !Array.isArray(review.images) || !review.images.length)
            throw new Error('No independent visual approval; retaining the cut without publishing');
          const request = JSON.parse(fs.readFileSync(publish, 'utf8'));
          if (
            request.target !== base ||
            typeof request.file !== 'string' ||
            !request.file.startsWith('.look/reels/') ||
            !request.file.endsWith('.mp4') ||
            !fs.realpathSync(path.resolve(work, request.file)).startsWith(work + '/.look/reels/') ||
            typeof request.title !== 'string' ||
            !request.title.trim() ||
            typeof request.summary !== 'string' ||
            !Array.isArray(request.features) ||
            request.features.length < 3 ||
            request.features.some((f: unknown) => typeof f !== 'string')
          )
            throw new Error(
              'Invalid publish request; expected this main commit, a local reel and at least three features',
            );
          const allowed = ['file', 'title', 'summary', 'features', 'target'];
          if (Object.keys(request).some((key) => !allowed.includes(key))) throw new Error('Unexpected publish fields');
        }
        if (
          run('git', ['rev-parse', 'HEAD'], work) !== base ||
          run('git', ['branch', '--show-current'], work) !== branch
        )
          throw new Error('Agent changed the branch or committed unexpectedly; inspect worktree');
        const changed = [
          ...new Set(
            [
              ...run('git', ['diff', 'HEAD', '--name-only', '-z'], work).split('\0'),
              ...run('git', ['ls-files', '--others', '--exclude-standard', '-z'], work).split('\0'),
            ].filter(Boolean),
          ),
        ];
        if (changed.some((f) => !f.startsWith(spec.scope)))
          throw new Error('Agent edited outside the job scope; inspect worktree');
        if (changed.length) {
          const existing = changed.filter((f) => fs.existsSync(path.join(work, f)));
          if (existing.length) run('npx', ['prettier', '--write', ...existing], work);
          if (job === 'atlas') {
            const check = run('npm', ['run', '--silent', 'atlas', '--', '--check'], work);
            if (!/^0 problems$/m.test(check)) throw new Error(`Atlas still needs fixes:\n${check}`);
          }
          run('npm', ['run', 'check'], work);
          run('git', ['add', '--', ...changed], work);
          // Formatting can undo the only diff. Never create an empty commit.
          if (run('git', ['diff', '--cached', '--name-only'], work)) {
            run(
              'git',
              [
                'commit',
                '-m',
                `Daily ${job}: update ${new Date().toISOString().slice(0, 10)}`,
                '-m',
                `DESIGN.md principle: ${job === 'atlas' ? 'Understandable at a glance' : "Show, don't tell"}.\n\nMaintain the daily ${job} output using Codex on the owner Mac.`,
              ],
              work,
            );
            run('npm', ['run', 'ship', '--', '--wait'], work);
            result.shipped = true;
          }
        }
        if (job === 'patch-video' && fs.existsSync(publish)) {
          const output = path.join(dir, 'publish-output.txt');
          run('npm', ['run', 'video:publish', '--', '--from', '.look/publish.json'], work, { GITHUB_OUTPUT: output });
          const url = /^url=(.+)$/m.exec(fs.readFileSync(output, 'utf8'))?.[1];
          if (!url || !url.startsWith('https://')) throw new Error('Publisher did not return a share URL');
          result.url = url;
          const owner = repo.split('/')[0];
          const issues = JSON.parse(
            gh(['issue', 'list', '--state', 'open', '--search', 'Patch videos in:title', '--json', 'number,title']),
          ) as { number: number; title: string }[];
          let issue = String(issues.find((i) => i.title === 'Patch videos')?.number ?? '');
          if (!issue)
            issue = gh([
              'issue',
              'create',
              '--title',
              'Patch videos',
              '--body',
              'Every published patch video is posted here by the owner Mac daily Codex job (dev/daily/README.md).',
            ]);
          const request = JSON.parse(fs.readFileSync(publish, 'utf8'));
          const body = path.join(dir, 'notification.md');
          fs.writeFileSync(body, `@${owner} new patch video, **${request.title}**: ${url}\n\nMac run: ${id}`);
          gh(['issue', 'comment', issue, '--body-file', body]);
        }
        result.status = result.shipped || result.url ? 'delivered' : 'no changes';
      }
      succeeded = true;
    }
  } catch (error) {
    if (error instanceof UsageLimit) {
      // The worktree is kept (not succeeded): the agent may have worked for a while before the limit.
      result.status = 'skipped';
      result.reason = error.message;
      console.log(result.reason);
    } else {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      console.error(result.error);
    }
  } finally {
    result.finished = new Date().toISOString();
    fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(
      path.join(dir, 'handoff.md'),
      `# Daily ${job}\n\nStatus: ${result.status}\n\n[Evidence](evidence.json) · [Agent report](report.md)\n\n${result.error ?? result.reason ?? ''}\n`,
    );
    try {
      // A worktree something else removed is left as it is; its error is in the evidence.
      if (created && succeeded && !vanished()) {
        const artifacts = path.join(work, '.look');
        if (job !== 'scenarios' && fs.existsSync(artifacts)) fs.renameSync(artifacts, path.join(dir, 'artifacts'));
        // Twice --force: the worktree is locked for the run, and may hold untracked output.
        run('git', ['worktree', 'remove', '--force', '--force', work]);
        run('git', ['branch', '-D', branch]);
      }
    } finally {
      fs.rmSync(lock, { recursive: true });
    }
    console.log(`Daily ${job}: ${result.status}. Evidence: ${dir}`);
  }
  if (result.status === 'failed') process.exitCode = 1;
}
