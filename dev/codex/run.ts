// Hand a job to Codex CLI (GPT-6-Astra on the ChatGPT subscription) and collect its report. See
// .claude/skills/codex/SKILL.md.
//
//   node dev/codex/run.ts <mode> <topic> [--effort low|medium|high|xhigh|max] [--model gpt-6-astra]
//                         [--base-ref <ref> | --snapshot] [--ref a.png,b.png] [--shots 4] [--ref-branch <branch>]
//                         [--eyes off] [--dry] "<brief>"
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
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { git, snapshot } from './source.ts';
import { handoff } from './evidence.ts';

type Mode = 'previz' | 'research' | 'task' | 'review';
const MODES: Mode[] = ['previz', 'research', 'task', 'review'];
const DEFAULT_EFFORT: Record<Mode, string> = { previz: 'medium', research: 'xhigh', task: 'high', review: 'xhigh' };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry' || args[i] === '--snapshot') opts[args[i]!.slice(2)] = '1';
  else if (args[i]!.startsWith('--')) {
    const flag = args[i]!;
    const value = args[++i];
    if (value === undefined) {
      console.error(`${flag} needs a value`);
      process.exit(2);
    }
    opts[flag.slice(2)] = value;
  } else pos.push(args[i]!);
}
const [mode, rawTopic, ...briefParts] = pos as [Mode, string, ...string[]];
const brief = briefParts.join(' ').trim();
if (!MODES.includes(mode) || !rawTopic || (mode !== 'review' && !brief)) {
  console.error(`usage: node dev/codex/run.ts <${MODES.join('|')}> <topic> [--effort xhigh] "<brief>"`);
  process.exit(2);
}
const topic = rawTopic
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const effort = opts.effort || DEFAULT_EFFORT[mode];
const model = opts.model || 'gpt-6-astra';
const eyes = mode === 'task' && opts.eyes !== 'off';
if (!topic) throw new Error('Use a nonempty topic');
if (opts.snapshot && (mode !== 'task' || opts['base-ref']))
  throw new Error('--snapshot is for tasks and uses the caller HEAD; do not combine it with --base-ref');
if (opts['base-ref'] && mode !== 'task') throw new Error('--base-ref is for tasks');

const repo = git(process.cwd(), 'rev-parse', '--show-toplevel');
const gitDir = path.resolve(repo, git(repo, 'rev-parse', '--git-common-dir'));
const logs = path.join(repo, '.look/codex', topic);
if (!opts.dry && fs.existsSync(path.join(logs, 'meta.json')))
  throw new Error(`${logs} already has a job; choose a new topic`);
if (!opts.dry) fs.mkdirSync(logs, { recursive: true });

// Install each job's actual lockfile. A branch or working snapshot can need different dependencies from the caller.
function worktree(ref: string, branch?: string): string {
  const dir = path.resolve(gitDir, '../..', 'boogle-codex', topic);
  if (fs.existsSync(dir)) throw new Error(`${dir} exists; pick another topic or \`git worktree remove\` it`);
  git(repo, 'worktree', 'add', '-q', ...(branch ? ['-b', branch, dir, ref] : ['--detach', dir, ref]));
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
  return dir;
}

const HOUSE = `You are working on Boogle, a goofy co-op browser game (three.js WebGPURenderer + TSL, Rapier, Vite). Read AGENTS.md and DESIGN.md first; they bind you. For design, level, art or character work, also read docs/proposals/boogle-2.md.`;

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

Work in this worktree only, on its branch. Follow AGENTS.md (sync kinds, lockstep math, test diet, game-design docs). Run \`npx prettier --write\` on the files you changed, then \`npm run check\`, and fix what fails. Commit in small imperative commits with the DESIGN.md principle in the body. Do not push or run npm run ship. Network access is only for the local server below: no other network use.

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

async function main() {
  const reportFile = path.join(logs, 'report.md');
  let cwd: string;
  let argv: string[];
  let prompt: string;
  const sourceRef = opts.snapshot
    ? 'HEAD (working snapshot)'
    : opts['base-ref'] || (mode === 'review' ? opts['ref-branch'] || 'HEAD' : 'origin/main');
  if (!opts.dry && mode !== 'previz' && !opts.snapshot) git(repo, 'fetch', '-q', 'origin', 'main');
  const sourceCommit =
    mode === 'previz'
      ? git(repo, 'rev-parse', 'HEAD')
      : opts.snapshot && !opts.dry
        ? snapshot(repo)
        : git(repo, 'rev-parse', '--verify', `${opts.snapshot ? 'HEAD' : sourceRef}^{commit}`);
  const base = ['-m', model, '-c', `model_reasoning_effort="${effort}"`, '-o', reportFile];

  if (mode === 'previz') {
    cwd = path.join(repo, '.look/previz', topic);
    fs.mkdirSync(cwd, { recursive: true });
    const refs = (opts.ref || '')
      .split(',')
      .filter(Boolean)
      .map((r, k) => {
        const name = `ref-${k + 1}${path.extname(r) || '.png'}`;
        fs.copyFileSync(path.resolve(r), path.join(cwd, name));
        return name;
      });
    prompt = previzPrompt(cwd, refs);
    argv = ['exec', ...base, '-C', cwd, '-s', 'workspace-write', '--skip-git-repo-check', '-'];
  } else if (mode === 'review') {
    cwd = opts.dry ? repo : worktree(sourceCommit);
    argv = ['exec', 'review', ...base, '--base', 'origin/main'];
    if (brief) argv.push('-');
    prompt = brief;
  } else {
    if (opts.dry) cwd = repo;
    else cwd = worktree(sourceCommit, `codex/${topic}`);
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

  const meta = {
    mode,
    topic,
    model,
    effort,
    cwd,
    brief,
    sourceRef,
    sourceCommit,
    snapshot: !!opts.snapshot,
    started: new Date().toISOString(),
    argv,
  };
  if (opts.dry) {
    console.log(JSON.stringify(meta, null, 2) + '\n\n' + prompt);
    return;
  }
  fs.writeFileSync(path.join(logs, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`codex ${mode} "${topic}" (${model}, ${effort}) in ${cwd}\nlog: ${path.join(logs, 'log.txt')}`);
  const log = fs.openSync(path.join(logs, 'log.txt'), 'w');
  let broker: ChildProcess | null = null;
  let status: number;
  try {
    if (eyes) {
      fs.mkdirSync(path.join(cwd, '.look'), { recursive: true });
      fs.copyFileSync(path.join(repo, 'dev/codex/see.ts'), path.join(cwd, '.look/see-client.ts'));
      broker = spawn(process.execPath, [path.join(repo, 'dev/codex/look-broker.ts'), cwd], {
        stdio: ['ignore', log, log],
      });
      const ready = path.join(cwd, '.look/see/ready.json');
      const deadline = Date.now() + 10000;
      while (!fs.existsSync(ready)) {
        if (broker.exitCode !== null || Date.now() > deadline)
          throw new Error('Browser broker did not start; see log.txt');
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    status = await new Promise<number>((resolve) => {
      const child = spawn('codex', argv, { cwd, stdio: ['pipe', log, log] });
      child.on('error', (error) => {
        console.error(error);
        resolve(1);
      });
      child.on('close', (code) => resolve(code ?? 1));
      child.stdin!.on('error', () => {}); // an early CLI error may close stdin before reading the brief
      child.stdin!.end(prompt);
    });
  } catch (error) {
    console.error(error);
    status = 1;
  } finally {
    broker?.kill();
    fs.closeSync(log);
    if (mode === 'task') handoff(cwd, logs);
  }
  const done = { ...meta, finished: new Date().toISOString(), status };
  fs.writeFileSync(path.join(logs, 'meta.json'), JSON.stringify(done, null, 2));
  console.log(`exit ${status}; report: ${reportFile}`);
  if (mode === 'task')
    console.log(`Handoff: ${path.join(logs, 'handoff.md')}\nEvidence: ${path.join(logs, 'evidence.json')}`);
  if (fs.existsSync(reportFile)) console.log('\n' + fs.readFileSync(reportFile, 'utf8'));
  process.exit(status);
}

await main();
