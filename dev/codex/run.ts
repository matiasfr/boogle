// Hand a job to Codex CLI (GPT-6-Astra on the ChatGPT subscription) and collect its report. See
// .claude/skills/codex/SKILL.md.
//
//   node dev/codex/run.ts <mode> <topic> [--effort low|medium|high|xhigh|max] [--model gpt-6-astra]
//                         [--base-ref <ref> | --snapshot] [--ref a.png,b.png] [--shots 4] [--ref-branch <branch>]
//                         [--eyes off] [--dry] [--detach] "<brief>"
//
// Modes:
// - previz: art-directs the idealized look of a moment, prototype or effect and paints it with $imagegen. Output in
//   .look/previz/<topic>/ (board.md + shot-<n>.png), never in the repo.
// - research: writes docs/research/<topic>.md with live web search, on branch codex/<topic> in its own worktree.
// - task: implements the brief on branch codex/<topic> in its own worktree, commits, never pushes. It can see the game:
//   its sandbox gets network access for a local server, and ./look-broker.ts runs the browser outside it (./see.ts).
// - review: `codex exec review` of a branch (default: this checkout's HEAD) against origin/main, in a detached worktree.
//
// Worktrees live beside the main repo in boogle-codex/<topic>, with their own dependencies. Reports, evidence and metadata
// go to .look/codex/<topic>/. Nothing is pushed: whoever ran it reviews the report and ships.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { git, snapshot } from './source.ts';
import { handoff } from './evidence.ts';
import {
  archiveTurn,
  launchJob,
  supervise,
  runSession,
  reportText,
  type Lifecycle,
  type JobControl,
} from './session.ts';

type Mode = 'previz' | 'research' | 'task' | 'review';
const MODES: Mode[] = ['previz', 'research', 'task', 'review'];
const DEFAULT_EFFORT: Record<Mode, string> = { previz: 'medium', research: 'high', task: 'high', review: 'high' };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (['--dry', '--snapshot', '--detach'].includes(args[i]!)) opts[args[i]!.slice(2)] = '1';
  else if (args[i]!.startsWith('--')) {
    const flag = args[i]!;
    if (
      ![
        '--effort',
        '--model',
        '--base-ref',
        '--base',
        '--ref',
        '--shots',
        '--ref-branch',
        '--eyes',
        '--supervisor',
      ].includes(flag)
    )
      throw new Error(`Unknown option: ${flag}`);
    const value = args[++i];
    if (value === undefined) {
      console.error(`${flag} needs a value`);
      process.exit(2);
    }
    opts[flag.slice(2)] = value;
  } else pos.push(args[i]!);
}
const [command, rawTopic, ...briefParts] = pos as [Mode | 'resume', string, ...string[]];
const brief = briefParts.join(' ').trim();
if ((!MODES.includes(command as Mode) && command !== 'resume') || !rawTopic || (command !== 'review' && !brief)) {
  console.error(`usage: node dev/codex/run.ts <${MODES.join('|')}|resume> <topic> [--effort xhigh] "<brief>"`);
  process.exit(2);
}
const topic = rawTopic
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
if (!topic) throw new Error('Use a nonempty topic');
if (opts.base && opts['base-ref']) throw new Error('Use only one of --base and --base-ref');
if (opts.base) opts['base-ref'] = opts.base;
if (opts.snapshot && (command !== 'task' || opts['base-ref']))
  throw new Error('--snapshot is for tasks and uses the caller HEAD; do not combine it with --base-ref');
if (opts['base-ref'] && command !== 'task') throw new Error('--base-ref is for tasks');

const repo = git(process.cwd(), 'rev-parse', '--show-toplevel');
const gitDir = path.resolve(repo, git(repo, 'rev-parse', '--git-common-dir'));
const logs = path.join(repo, '.look/codex', topic);
type Job = Lifecycle & {
  mode: Mode;
  topic: string;
  model: string;
  effort: string;
  cwd: string;
  brief: string;
  sourceRef: string;
  sourceCommit: string;
  snapshot: boolean;
  started: string;
  argv: string[];
  launchArgv?: string[];
  sessionId?: string;
  turn?: number;
  feedback?: string;
};
const metaFile = path.join(logs, 'meta.json');
const previous: Job | undefined = command === 'resume' ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : undefined;
const mode = previous?.mode ?? (command as Mode);
const effort = opts.effort || previous?.effort || DEFAULT_EFFORT[mode];
const model = opts.model || previous?.model || 'gpt-6-astra';
const eyes =
  mode === 'task' &&
  (previous ? previous.argv.includes('sandbox_workspace_write.network_access=true') : opts.eyes !== 'off');
if (previous) {
  if (Object.keys(opts).some((key) => !['dry', 'detach', 'model', 'effort', 'supervisor'].includes(key)))
    throw new Error(
      'Resume accepts only --dry, --detach, --model and --effort; it keeps the original build and permissions',
    );
  if (previous.mode === 'review') throw new Error('Start a task for review fixes; review jobs cannot resume');
  // Old jobs logged the explicit ID in the CLI header, before JSON events were enabled.
  previous.sessionId ??= /^session id: ([a-f0-9-]{36})$/im.exec(
    fs.readFileSync(path.join(logs, 'log.txt'), 'utf8'),
  )?.[1];
  if (!previous.sessionId) throw new Error('This job has no recorded Codex session ID; it cannot be resumed');
  if (!fs.existsSync(previous.cwd)) throw new Error(`Keep the original worktree to resume: ${previous.cwd}`);
  if (
    mode !== 'previz' &&
    fs.realpathSync(git(previous.cwd, 'rev-parse', '--show-toplevel')) !== fs.realpathSync(previous.cwd)
  )
    throw new Error('The original job worktree is no longer available');
}

// Install each job's actual lockfile. A branch or working snapshot can need different dependencies from the caller.
async function worktree(job: JobControl, ref: string, branch?: string): Promise<string> {
  const dir = path.resolve(gitDir, '../..', 'boogle-codex', topic);
  if (fs.existsSync(dir)) throw new Error(`${dir} exists; pick another topic or \`git worktree remove\` it`);
  await job.command(
    'git',
    ['worktree', 'add', '-q', ...(branch ? ['-b', branch, dir, ref] : ['--detach', dir, ref])],
    repo,
  );
  meta.cwd = dir;
  job.save();
  await job.command('npm', ['ci', '--no-audit', '--no-fund'], dir);
  return dir;
}

const HOUSE = `You are working on Boogle, a goofy co-op browser game (three.js WebGPURenderer + TSL, Rapier, Vite). AGENTS.md and its referenced requirements bind you. Read the docs named in the brief and the sections needed for this task, including any reading required by AGENTS.md; use npm run map before reading whole source files.`;

function previzPrompt(out: string, refs: string[]): string {
  const shots = Number(opts.shots) || 4;
  return `${HOUSE} The repository is at ${repo}; read anything in it (DESIGN.md, docs/game-design/, protos/protos.ts, the code under src/ for what is involved) but write only in the current directory, ${out}.

You are the art director doing previz: picture the idealized version of what is described below — the look and the moment as they would be in the best version of this game — not a concept painting of a different game. Stay true to what Boogle is (its places, characters, scale, camera and principles), and to what our renderer could plausibly reach: stylized, toy-like, real-time, one WebGPU pipeline with TSL materials, particles, post effects. Push the lighting, colour, composition, motion cues and juice as far as they would go in the best version.
${refs.length ? `\nReference images in this folder: ${refs.join(', ')}. Open each with view_image first. They show the game as it is today: keep its layout and identity, raise the look.\n` : ''}
Brief: ${brief}

Do this:
1. Work out ${shots} shots that together show the idea: the key moments, beats or variations (a before/after, a sequence, or alternative directions — say which). For each: the gameplay moment, camera (height, lens, framing, as the game's camera would see it), time of day and light, a palette of 4-6 linear-ish hex colours, what makes it read at a glance, and what motion or effect the still implies.
2. Paint each with $imagegen at 16:9, one image per shot, and copy it unchanged to shot-<n>.png in this folder. Keep one shared style sentence across all prompts so they read as one world.
3. Write board.md: a one-paragraph pitch of the look, then per shot its image, the exact imagegen prompt, the notes from step 1, and "how we'd build it": the concrete TSL nodes, particles (src/render/particles.ts emit), post passes, lights or geometry that would get the real game there, and what is hard or expensive. End with the 3 changes that would move today's game furthest toward this look.
Your final message: the pitch paragraph and one line per shot.`;
}

const DEPENDENCIES =
  "Dependencies are already installed from this worktree's lockfile; they are not shared with the caller.";

const researchPrompt =
  () => `${HOUSE} Then read docs/research/README.md and two existing docs in docs/research/ for the format.

Deep-research this facet with live web search: ${brief}

${DEPENDENCIES}

Use primary sources where you can: GDC talks, developer postmortems and blogs, papers, engine docs, shipped games. Write docs/research/${topic}.md in the house format, with sources inline and numbered recommendations specific to Boogle (cite the code or plan they touch). Add a line for it to docs/research/README.md. Run \`npx prettier --write\` on the files you changed, then commit on this branch with an imperative subject (no push). Your final message: the recommendations, one line each.`;

const taskPrompt = () => `${HOUSE}

Task: ${brief}

${DEPENDENCIES}

Work in this worktree only, on its branch. Follow AGENTS.md (its tool table before writing a shot or script, sync kinds, lockstep math, test diet, game-design docs). Run \`npx prettier --write\` on the files you changed, then \`npm run check\`, and fix what fails. Commit in small imperative commits with the DESIGN.md principle in the body. Do not push or run npm run ship. Network access is only for the local server below: no other network use.

${
  eyes
    ? `Use the broker already started by run.ts, not Chromium directly:
- \`node .look/see-client.ts playthrough\`: the full place bot, reports, saved checkpoints and end still. Optional --query, --eval and --stall. A missed expected beat fails the run; read its report even on failure.
- \`node .look/see-client.ts look --at list\`: names this job's bot checkpoints. Then --at "<beat>" captures one; --query 'proto=x', --eval, --action, --curves and other look options work too. --saves selects an explicit checkpoint directory.
- \`node .look/see-client.ts scenario world-inputs\`: existing trusted scenarios against YOUR running build. Name the relevant scenario(s), not a new harness.
The broker owns --url, --root, --data-dir and --out. Each command prints a manifest in .look/evidence with the tested commit/tree, status, logs and artifact paths. Open the PNGs with view_image; a successful command is not a visual verdict. Name a visual question, frame the action, inspect and iterate up to three rounds. For motion use --curves and consecutive frames extracted from --video with ffmpeg; real-time feel and smoothness remain unverified. Never edit source while a run is in progress. After code changes, repeat the affected checks so the evidence matches the final tree.`
    : 'You cannot see the running game.'
}

Your final message is Claude's assessment: keep it short. State what changed, check results, which images you actually opened, what you observed against the visual question, bot failures, and anything unverified. Link the evidence manifests. The launcher also returns handoff.md and evidence.json, copying the artifacts beside them.`;

const FORMAT_HOOK = `hooks.PostToolUse=[{matcher="apply_patch|Edit|Write",hooks=[{type="command",timeout=30,command='node "$(git rev-parse --show-toplevel)/.claude/hooks/format-lint.ts"'}]}]`;

const sourceRef = opts.snapshot
  ? 'HEAD (working snapshot)'
  : opts['base-ref'] || (mode === 'review' ? opts['ref-branch'] || 'HEAD' : 'origin/main');
const meta: Job = {
  ...previous,
  mode,
  topic,
  model,
  effort,
  cwd:
    previous?.cwd ??
    (mode === 'previz' ? path.join(repo, '.look/previz', topic) : path.resolve(gitDir, '../..', 'boogle-codex', topic)),
  brief: previous?.brief ?? brief,
  sourceRef: previous?.sourceRef ?? sourceRef,
  sourceCommit: previous?.sourceCommit ?? '',
  snapshot: previous?.snapshot ?? !!opts.snapshot,
  started: new Date().toISOString(),
  argv: previous?.argv ?? [],
  turn: (previous?.turn ?? (previous ? 1 : 0)) + 1,
  ...(previous ? { feedback: brief } : {}),
};

async function main(job?: JobControl): Promise<number> {
  const reportFile = path.join(logs, 'report.md');
  let cwd: string;
  let argv: string[];
  let prompt: string;
  if (!previous && job && mode !== 'previz' && !opts.snapshot && !opts['base-ref'])
    await job.command('git', ['fetch', '-q', 'origin', 'main'], repo);
  const sourceCommit = previous
    ? previous.sourceCommit
    : mode === 'previz'
      ? git(repo, 'rev-parse', 'HEAD')
      : opts.snapshot && !opts.dry
        ? snapshot(repo)
        : git(repo, 'rev-parse', '--verify', `${opts.snapshot ? 'HEAD' : sourceRef}^{commit}`);
  meta.sourceCommit = sourceCommit;
  job?.save();
  const base = ['-m', model, '-c', `model_reasoning_effort="${effort}"`, '-o', reportFile];

  if (previous) {
    cwd = previous.cwd;
    argv = [...(previous.launchArgv ?? previous.argv)];
    if (argv.at(-1) === '-') argv.pop();
    argv[argv.indexOf('-m') + 1] = model;
    const reasoning = argv.findIndex((arg) => arg.startsWith('model_reasoning_effort='));
    argv[reasoning] = `model_reasoning_effort="${effort}"`;
    argv.push('resume', previous.sessionId!, '-');
    prompt = `Continue this same job in ${cwd}. Keep its earlier context and work. Do not push or ship.\n\nFollow-up feedback: ${brief}\n\nFix the requested issues, rerun affected checks after your last edit, and report what changed and any remaining failures. Earlier evidence may be stale. ${eyes ? 'The browser broker has been restarted; use node .look/see-client.ts as before. This job retains its bot checkpoints. Open new PNGs and distinguish execution success from visual quality.' : ''}`;
  } else if (mode === 'previz') {
    cwd = path.join(repo, '.look/previz', topic);
    if (job) fs.mkdirSync(cwd, { recursive: true });
    const refs = (opts.ref || '')
      .split(',')
      .filter(Boolean)
      .map((r, k) => {
        const name = `ref-${k + 1}${path.extname(r) || '.png'}`;
        if (job) fs.copyFileSync(path.resolve(r), path.join(cwd, name));
        return name;
      });
    prompt = previzPrompt(cwd, refs);
    argv = ['exec', ...base, '-C', cwd, '-s', 'workspace-write', '--skip-git-repo-check', '-'];
  } else if (mode === 'review') {
    cwd = job ? await worktree(job, sourceCommit) : repo;
    argv = ['exec', 'review', ...base, '--base', 'origin/main'];
    argv.push('-');
    prompt = brief;
  } else {
    if (opts.dry) cwd = repo;
    else cwd = await worktree(job!, sourceCommit, `codex/${topic}`);
    prompt = mode === 'research' ? researchPrompt() : taskPrompt();
    // This repository's own format hook, passed here because a job can't stop to approve the project's copy.
    argv = [
      'exec',
      ...base,
      '-C',
      cwd,
      '-s',
      'workspace-write',
      '--add-dir',
      gitDir,
      '--dangerously-bypass-hook-trust',
      '-c',
      FORMAT_HOOK,
    ];
    if (mode === 'research') argv.push('-c', 'web_search="live"');
    if (eyes) argv.push('-c', 'sandbox_workspace_write.network_access=true');
    argv.push('-');
  }

  prompt +=
    '\n\nEnd your final message with a fenced json block containing {outcome: done|partial|blocked, summary, numbers, unverified, departures}. Keep the whole final message under about 150 words.';
  if (!argv.includes('--json')) argv.splice(1, 0, '--json');
  Object.assign(meta, { cwd, sourceCommit, argv, launchArgv: previous?.launchArgv ?? previous?.argv ?? argv });
  if (opts.dry) {
    console.log(JSON.stringify(meta, null, 2) + '\n\n' + prompt);
    return 0;
  }
  const { save: saveMeta, signal, track } = job!;
  saveMeta();
  console.log(
    `codex ${command} "${topic}" turn ${meta.turn} (${model}, ${effort}) in ${cwd}\nlog: ${path.join(logs, 'log.txt')}`,
  );
  const log = fs.openSync(path.join(logs, 'log.txt'), 'w');
  let broker: ChildProcess | null = null;
  let status: number;
  try {
    signal.throwIfAborted();
    if (eyes) {
      fs.mkdirSync(path.join(cwd, '.look'), { recursive: true });
      fs.copyFileSync(path.join(repo, 'dev/codex/see.ts'), path.join(cwd, '.look/see-client.ts'));
      broker = spawn(process.execPath, [path.join(repo, 'dev/codex/look-broker.ts'), cwd], {
        stdio: ['ignore', log, log],
      });
      broker.on('error', (error) => fs.writeSync(log, String(error) + '\n'));
      track(broker);
      meta.brokerPid = broker.pid ?? null;
      saveMeta();
      const ready = path.join(cwd, '.look/see/ready.json');
      const deadline = Date.now() + 10000;
      while (!fs.existsSync(ready) || JSON.parse(fs.readFileSync(ready, 'utf8')).pid !== broker.pid) {
        signal.throwIfAborted();
        if (broker.exitCode !== null || Date.now() > deadline)
          throw new Error('Browser broker did not start; see log.txt');
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    status = await runSession(
      argv,
      cwd,
      prompt,
      log,
      path.join(logs, 'events.jsonl'),
      (id) => {
        if (meta.sessionId && meta.sessionId !== id) throw new Error('Codex resumed a different session');
        meta.sessionId = id;
        saveMeta(); // Keep the session resumable even if this turn fails or is interrupted.
      },
      (child) => {
        track(child);
        meta.codexPid = child.pid ?? null;
        saveMeta();
      },
      signal,
    );
    if (!meta.sessionId && mode !== 'review') status = 1;
  } catch (error) {
    console.error(error);
    status = 1;
  } finally {
    broker?.kill();
    fs.closeSync(log);
  }
  try {
    if (mode === 'task') handoff(cwd, logs);
  } catch (error) {
    console.error(error);
    status = 1;
  }
  console.log(`exit ${status}; report: ${reportFile}`);
  if (mode === 'task')
    console.log(`Handoff: ${path.join(logs, 'handoff.md')}\nEvidence: ${path.join(logs, 'evidence.json')}`);
  if (fs.existsSync(reportFile)) console.log('\n' + reportText(reportFile));
  return status;
}

if (!previous && fs.existsSync(metaFile)) throw new Error(`${logs} already has a job; use resume or a new topic`);
if (!previous && mode !== 'previz' && fs.existsSync(meta.cwd))
  throw new Error(`${meta.cwd} exists; pick another topic`);
if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) throw new Error(`Invalid effort: ${effort}`);
if (opts.eyes && !['on', 'off'].includes(opts.eyes)) throw new Error('--eyes must be on or off');
if (opts.shots && (!Number.isSafeInteger(Number(opts.shots)) || Number(opts.shots) < 1))
  throw new Error('--shots must be a positive integer');
if (opts.ref)
  for (const ref of opts.ref.split(',').filter(Boolean)) fs.accessSync(path.resolve(ref), fs.constants.R_OK);
if (opts['base-ref']) git(repo, 'rev-parse', '--verify', `${opts['base-ref']}^{commit}`);
if (opts['ref-branch']) git(repo, 'rev-parse', '--verify', `${opts['ref-branch']}^{commit}`);
if (!previous && ['task', 'research'].includes(mode) && git(repo, 'branch', '--list', `codex/${topic}`))
  throw new Error(`Branch codex/${topic} exists; pick another topic`);
if (opts.dry) process.exitCode = await main();
else if (!opts.supervisor) process.exitCode = await launchJob(logs, [process.argv[1]!, ...args], !!opts.detach);
else {
  process.exitCode = await supervise(logs, opts.supervisor, meta, async (job) => {
    if (previous) {
      archiveTurn(logs, previous.turn ?? 1, previous);
      for (const name of ['report.md', 'result.json', 'handoff.md', 'evidence.json', 'events.jsonl'])
        fs.rmSync(path.join(logs, name), { force: true });
    }
    return main(job);
  });
}
