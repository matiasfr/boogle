// Foreground launchd job. A crash deliberately leaves the lock for inspection: children may still be running.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { jobs, jobName, prompt, reviewPrompt, stateDir, scenarios, liveScenarios as LIVE } from './jobs.ts';
import { compare, invalid, report, type Bench, type Entry } from './perf.ts';

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
    'Usage: npm run daily -- atlas|patch-video|scenarios|perf [--dry-run] [--force] [--notes "..."] [--only scenario] [--local]',
  );
if (args.includes('--local') && job !== 'perf') throw new Error('--local is for the perf job');
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
  } finally {
    fs.closeSync(log);
  }
}

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
            : ['fetch origin/main and create fresh worktree', 'npm ci', 'install Playwright Chromium']),
          'caffeinate -dimu node dev/look/bench.ts --out <run>/bench.json (visible Chromium on the Mac GPU)',
          'compare with the median of the last valid runs; flag regressions, budgets and the commit range',
          ...(local ? [] : ['append a valid run to history', 'comment on the Performance issue (created once)']),
          'keep bench.json, bench.log, comparison.json and notification.md; remove the worktree; release lock',
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
            : ['fetch origin/main and create fresh worktree', 'npm ci', 'install Playwright Chromium']),
          'run scenarios sequentially on Mac GPU',
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
      run('git', ['fetch', '--prune', '--tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
      run('git', ['worktree', 'add', '-b', branch, work, 'origin/main']);
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
      // A visible browser: keep the display awake for the run (a sleeping display stops animation frames).
      const execution = spawnSync(
        'caffeinate',
        ['-dimu', process.execPath, 'dev/look/bench.ts', '--out', benchFile, '--commit', base],
        { cwd: work, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000 },
      );
      fs.writeFileSync(path.join(dir, 'bench.log'), (execution.stdout ?? '') + (execution.stderr ?? ''));
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
          const lines = run('git', ['log', '--oneline', '--first-parent', `${comparison.baselineFrom}..${base}`], work)
            .split('\n')
            .filter(Boolean);
          range = lines.slice(0, 40).join('\n') + (lines.length > 40 ? `\n... and ${lines.length - 40} more` : '');
        } catch {
          range = `${comparison.baselineFrom}..${base} (log unavailable)`;
        }
      const body = report(bench, comparison, { base, range, dir, problems });
      fs.writeFileSync(path.join(dir, 'comparison.json'), JSON.stringify({ problems, ...comparison }, null, 2) + '\n');
      const file = path.join(dir, 'notification.md');
      fs.writeFileSync(file, body + '\n');
      console.log(body);
      result.regressions = comparison.regressions.map((c) => c.name);
      result.overBudget = comparison.over;
      result.problems = problems;
      if (!local) {
        // An invalid run (a hidden page, missing GPU times) is reported but never becomes a baseline.
        if (!problems.length) {
          fs.mkdirSync(path.dirname(perfHistory), { recursive: true });
          const entry: Entry = { date: new Date().toISOString(), base, dir, metrics: comparison.metrics };
          fs.appendFileSync(perfHistory, JSON.stringify(entry) + '\n');
        }
        const issues = JSON.parse(
          run(
            'gh',
            ['issue', 'list', '--label', 'performance', '--state', 'open', '--limit', '100', '--json', 'number'],
            work,
          ),
        ) as { number: number }[];
        if (issues.length > 1) throw new Error('Multiple open performance issues; resolve duplicates before reporting');
        let issue = String(issues[0]?.number ?? '');
        if (!issue) {
          run(
            'gh',
            ['label', 'create', 'performance', '--color', '1d76db', '--description', 'Daily benchmark', '--force'],
            work,
          );
          const intro = path.join(dir, 'issue.md');
          fs.writeFileSync(
            intro,
            'The daily benchmark comments here every night (dev/daily/README.md, the perf job; dev/look/bench.ts). Each ' +
              'comment compares origin/main with the median of the last valid runs and lists regressions, budgets and ' +
              'the commit range. Keep it open: it is the history agents read.\n',
          );
          issue = run(
            'gh',
            ['issue', 'create', '--title', 'Performance', '--label', 'performance', '--body-file', intro],
            work,
          );
        }
        run('gh', ['issue', 'comment', issue, '--body-file', file], work);
      }
      result.status = problems.length ? 'invalid' : comparison.regressions.length ? 'regressed' : 'passed';
      succeeded = true;
    } else if (job === 'scenarios') {
      if (!local) {
        run('npm', ['ci'], work);
        run('npx', ['playwright', 'install', 'chromium'], work);
      }
      const failures: string[] = [];
      for (const name of selected) {
        const execution = spawnSync(
          process.execPath,
          [
            'dev/scenarios/run.ts',
            name,
            ...(LIVE[name] ? ['--url', LIVE[name]] : []),
            '--out',
            path.join(dir, 'artifacts', 'scenarios'),
          ],
          {
            cwd: work,
            env,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
            timeout: 15 * 60 * 1000,
          },
        );
        const output = (execution.stdout ?? '') + (execution.stderr ?? '');
        fs.writeFileSync(path.join(dir, `${name}.log`), output);
        if (execution.status !== 0) {
          const lines = output.split('\n').filter((line) => /\bFAIL\b/i.test(line));
          failures.push(
            `- ${name}: ${(execution.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' ? 'FAIL: timed out after 15 minutes' : lines.length ? lines.join('\n  ') : `exit ${execution.status}: ${execution.error?.message ?? 'no FAIL line'}`}`,
          );
        }
      }
      result.failures = failures;
      if (!local) {
        const issues = JSON.parse(
          run(
            'gh',
            ['issue', 'list', '--label', 'scenarios', '--state', 'open', '--limit', '100', '--json', 'number'],
            work,
          ),
        ) as { number: number }[];
        if (issues.length > 1) throw new Error('Multiple open scenarios issues; resolve duplicates before reporting');
        const body = path.join(dir, 'notification.md');
        fs.writeFileSync(
          body,
          failures.length
            ? `Nightly scenarios failed on ${base}:\n\n${failures.join('\n')}\n\nMac run: ${dir}\n`
            : `Nightly scenarios passed on ${base}.\n\nMac run: ${dir}\n`,
        );
        if (failures.length && !issues.length) {
          run(
            'gh',
            [
              'label',
              'create',
              'scenarios',
              '--color',
              'd93f0b',
              '--description',
              'Nightly browser scenarios',
              '--force',
            ],
            work,
          );
          run(
            'gh',
            [
              'issue',
              'create',
              '--title',
              'Nightly browser scenarios are failing',
              '--label',
              'scenarios',
              '--body-file',
              body,
            ],
            work,
          );
        } else if (issues.length) {
          run('gh', ['issue', 'comment', String(issues[0]!.number), '--body-file', body], work);
          if (!failures.length) run('gh', ['issue', 'close', String(issues[0]!.number)], work);
        }
      }
      result.status = failures.length ? 'failed' : 'passed';
      succeeded = true;
    } else {
      const prs = JSON.parse(
        run('gh', ['pr', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,headRefName'], work),
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
          const owner = run('gh', ['repo', 'view', '--json', 'owner', '-q', '.owner.login'], work);
          const issues = JSON.parse(
            run(
              'gh',
              ['issue', 'list', '--state', 'open', '--search', 'Patch videos in:title', '--json', 'number,title'],
              work,
            ),
          ) as { number: number; title: string }[];
          let issue = String(issues.find((i) => i.title === 'Patch videos')?.number ?? '');
          if (!issue)
            issue = run(
              'gh',
              [
                'issue',
                'create',
                '--title',
                'Patch videos',
                '--body',
                'Every published patch video is posted here by the owner Mac daily Codex job (dev/daily/README.md).',
              ],
              work,
            );
          const request = JSON.parse(fs.readFileSync(publish, 'utf8'));
          const body = path.join(dir, 'notification.md');
          fs.writeFileSync(body, `@${owner} new patch video, **${request.title}**: ${url}\n\nMac run: ${id}`);
          run('gh', ['issue', 'comment', issue, '--body-file', body], work);
        }
        result.status = result.shipped || result.url ? 'delivered' : 'no changes';
      }
      succeeded = true;
    }
  } catch (error) {
    result.status = 'failed';
    result.error = error instanceof Error ? error.message : String(error);
    console.error(result.error);
  } finally {
    result.finished = new Date().toISOString();
    fs.writeFileSync(path.join(dir, 'evidence.json'), JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(
      path.join(dir, 'handoff.md'),
      `# Daily ${job}\n\nStatus: ${result.status}\n\n[Evidence](evidence.json) · [Agent report](report.md)\n\n${result.error ?? result.reason ?? ''}\n`,
    );
    try {
      if (created && succeeded) {
        const artifacts = path.join(work, '.look');
        if (job !== 'scenarios' && fs.existsSync(artifacts)) fs.renameSync(artifacts, path.join(dir, 'artifacts'));
        run('git', ['worktree', 'remove', '--force', work]);
        run('git', ['branch', '-D', branch]);
      }
    } finally {
      fs.rmSync(lock, { recursive: true });
    }
    console.log(`Daily ${job}: ${result.status}. Evidence: ${dir}`);
  }
  if (result.status === 'failed') process.exitCode = 1;
}
