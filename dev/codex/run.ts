// Hand a job to Codex CLI (GPT-6-Astra on the ChatGPT subscription) and collect its report. See
// .claude/skills/codex/SKILL.md.
//
//   node dev/codex/run.ts <mode> <topic> [--effort low|medium|high|xhigh|max] [--model gpt-6-astra]
//                         [--ref a.png,b.png] [--shots 4] [--ref-branch <branch>] [--eyes off] [--dry] "<brief>"
//
// Modes:
// - previz: art-directs the idealized look of a moment, prototype or effect and paints it with $imagegen. Output in
//   .look/previz/<topic>/ (board.md + shot-<n>.png), never in the repo.
// - research: writes docs/research/<topic>.md with live web search, on branch codex/<topic> in its own worktree.
// - task: implements the brief on branch codex/<topic> in its own worktree, commits, never pushes. It can see the game:
//   its sandbox gets network access for a local server, and ./look-broker.ts runs the browser outside it (./see.ts).
// - review: `codex exec review` of a branch (default: this checkout's HEAD) against origin/main, in a detached worktree.
//
// Worktrees live in ../boogle-codex/<topic> and share this checkout's node_modules. The log, last message (report.md)
// and meta.json go to .look/codex/<topic>/. Nothing is pushed: whoever ran it reviews the report and ships.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process';

type Mode = 'previz' | 'research' | 'task' | 'review';
const MODES: Mode[] = ['previz', 'research', 'task', 'review'];
const DEFAULT_EFFORT: Record<Mode, string> = { previz: 'medium', research: 'xhigh', task: 'high', review: 'xhigh' };

const args = process.argv.slice(2);
const opts: Record<string, string> = {};
const pos: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry') opts.dry = '1';
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

const git = (cwd: string, ...a: string[]) =>
  execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const repo = git(process.cwd(), 'rev-parse', '--show-toplevel');
const gitDir = path.resolve(repo, git(repo, 'rev-parse', '--git-common-dir'));
const logs = path.join(repo, '.look/codex', topic);
fs.mkdirSync(logs, { recursive: true });

// A fresh worktree outside the repo, with this checkout's node_modules linked in so check scripts run offline.
function worktree(ref: string, branch?: string): string {
  const dir = path.resolve(repo, '..', 'boogle-codex', topic);
  if (fs.existsSync(dir)) throw new Error(`${dir} exists; pick another topic or \`git worktree remove\` it`);
  git(repo, 'fetch', '-q', 'origin', 'main');
  git(repo, 'worktree', 'add', '-q', ...(branch ? ['-b', branch, dir, ref] : ['--detach', dir, ref]));
  for (const nm of ['node_modules', 'server/node_modules']) {
    const from = path.join(repo, nm);
    if (fs.existsSync(from)) fs.symlinkSync(from, path.join(dir, nm), 'dir');
  }
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

// AGENTS.md says to run npm ci in a fresh checkout, but through worktree()'s link that empties the main checkout's modules.
const SHARED_MODULES =
  "node_modules here is a link to the main checkout's, shared with other running jobs. Never run npm ci or npm install, which would empty it for everyone; if a dependency is missing, say so in your final message.";

const researchPrompt =
  () => `${HOUSE} Then read docs/research/README.md and two existing docs in docs/research/ for the format.

Deep-research this facet with live web search: ${brief}

${SHARED_MODULES}

Use primary sources where you can: GDC talks, developer postmortems and blogs, papers, engine docs, shipped games. Write docs/research/${topic}.md in the house format, with sources inline and numbered recommendations specific to Boogle (cite the code or plan they touch). Add a line for it to docs/research/README.md. Run \`npx prettier --write\` on the files you changed, then commit on this branch with an imperative subject (no push). Your final message: the recommendations, one line each.`;

const taskPrompt = () => `${HOUSE}

Task: ${brief}

${SHARED_MODULES}

Work in this worktree only, on its branch. Follow AGENTS.md (sync kinds, lockstep math, test diet, game-design docs). Run \`npx prettier --write\` on the files you changed, then \`npm run check\`, and fix what fails. Commit in small imperative commits with the DESIGN.md principle in the body. Do not push or run npm run ship. Network access is only for the local server below: no other network use.

${
  eyes
    ? `You can see the running game. \`BOOGLE_QUERY='proto=x' node dev/codex/see.ts <options>\` takes the same options as \`npm run look\` (.claude/skills/look/SKILL.md; not --url or --out), runs on the real GPU and takes a minute or two. Open the PNGs it writes to .look/ with view_image. Use it for anything a player can see: name the question, frame it, look, fix what's off, up to three rounds (AGENTS.md, "See it before you ship"). To play, use --action: page code that holds keys and queues jumps (dev/look/evals/sprint-jump.ts), framing the player itself, since a fixed --cam may not see them; then decide your next action from what you saw. --curves writes the motion as numbers. view_image takes no video: pull frames from a --video recording with ffmpeg and open consecutive ones. That is frames and scripted input, not watching or playing in real time, so say that feel and smoothness are unverified. run.ts already started the broker: don't start another.`
    : 'You cannot see the running game.'
}

Your final message: what you changed, what check printed, what you saw, and anything you were unsure of or could not verify.`;

const FORMAT_HOOK = `hooks.PostToolUse=[{matcher="apply_patch|Edit|Write",hooks=[{type="command",timeout=30,command='node "$(git rev-parse --show-toplevel)/.claude/hooks/format-lint.ts"'}]}]`;

function main() {
  const reportFile = path.join(logs, 'report.md');
  let cwd: string;
  let argv: string[];
  let prompt: string;
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
    const ref = opts['ref-branch'] || git(repo, 'rev-parse', 'HEAD');
    cwd = opts.dry ? repo : worktree(ref);
    argv = ['exec', 'review', ...base, '--base', 'origin/main'];
    if (brief) argv.push('-');
    prompt = brief;
  } else {
    if (opts.dry) cwd = repo;
    else cwd = worktree('origin/main', `codex/${topic}`);
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

  const meta = { mode, topic, model, effort, cwd, brief, started: new Date().toISOString(), argv };
  if (opts.dry) {
    console.log(JSON.stringify(meta, null, 2) + '\n\n' + prompt);
    return;
  }
  fs.writeFileSync(path.join(logs, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`codex ${mode} "${topic}" (${model}, ${effort}) in ${cwd}\nlog: ${path.join(logs, 'log.txt')}`);
  const log = fs.openSync(path.join(logs, 'log.txt'), 'w');
  let broker: ChildProcess | null = null;
  if (eyes) broker = spawn(process.execPath, [path.join(repo, 'dev/codex/look-broker.ts'), cwd], { stdio: 'ignore' });
  const r = spawnSync('codex', argv, { cwd, input: prompt, stdio: ['pipe', log, log] });
  broker?.kill();
  fs.closeSync(log);
  const done = { ...meta, finished: new Date().toISOString(), status: r.status };
  fs.writeFileSync(path.join(logs, 'meta.json'), JSON.stringify(done, null, 2));
  console.log(`exit ${r.status}; report: ${reportFile}`);
  if (fs.existsSync(reportFile)) console.log('\n' + fs.readFileSync(reportFile, 'utf8'));
  process.exit(r.status ?? 1);
}

main();
