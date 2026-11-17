# Orchestrator automations

The owner's scheduled orchestrator runs, recorded so they can be recreated exactly on another machine. They are
T3 Code scheduled tasks in the Boogle project, both bound to one orchestrator thread (`bindToCurrentThread: true`,
`freshSession: false`): every run posts in that thread and keeps its context.

Running since 17 November 2026 (first heartbeat 07:24 UTC) on the Windows machine `hotbox`, clone
`C:\Users\matia\Claude work\boogle`, Pacific time. The prompts below are the ones live there.

The MacBook's copies (`/Users/matiasfranco/Developer/boogle`) were paused on 17 November at 06:05 UTC and kept, so
they can be turned back on there with `enabled: true` (and the Windows ones paused).

## Moving them to another device

1. **Machine setup:** clone the repo and check `gh auth status` and `git fetch origin`. Install Node 26 and put it
   and gh on the heartbeat's `PATH` line. On Windows, nvm-windows (`winget install CoreyButler.NVMforWindows`) puts
   it in `$HOME/AppData/Local/nvm/v26.13.0`, and gh's MSI installs to `/c/Program Files/GitHub CLI`, which T3 does
   not see until it restarts. On macOS, nvm uses `$HOME/.nvm/versions/node/v26.13.0/bin`. Add the Codex provider to
   T3, since delegates run as `gpt-6.1-sol` and `gpt-6-astra`. Run `npm ci` in the clone root as well as in the
   heartbeat's worktree (`npm run heartbeat` reads play sessions and device runs from the root), copy the old clone's
   `.env.local` (`REPORT_TOKEN` and the other keys), and run `npx playwright install chromium` for bots and looks.
2. **Paths:** the prompts name the clone's path (`C:\Users\matia\Claude work\boogle` now); change it to the new
   clone's path. `../boogle-heartbeat` is relative to the clone, so it needs no change.
3. **Create:** open the new orchestrator thread in the Boogle project and create both tasks from it with
   `schedule_task`, using the prompt, schedule and settings below. That binds them to the thread.
4. **Turn off the old ones:** do not run both machines at once. Two heartbeats would break the
   [one-heartbeat rule](../decisions-process.md#d-2026-11-16-one-heartbeat) and double-count the three-job limit.
5. **Claude memory** is per machine. Copy `~/.claude/projects/<encoded clone path>/memory/` across; everything
   binding is already in the repo ([decision log](../decisions.md)).
6. **Local-only state:** archive tags and unpushed branches exist only on the machine that made them; push what the
   new machine needs before switching.

## The 17 November move: what stayed on the MacBook

- 91 `archive/*` tags are local only, among them `archive/home-road2-rework-2026-11-17` (the cancelled Home road 2
  commit). The owner decides whether to push them (`git push origin 'refs/tags/archive/*'`).
- Unpushed branches: `claude/fold-subagents` (one commit, the owner's own session's planner-roles work);
  `review/gorge-4372df4f4-scratch` (six commits from 15 November reproducing a Gorge surface hole);
  `t3/rider-coach-art` (a running delegate with uncommitted work, which ships through `npm run ship` when done).
- Claude memory (`~/.claude/projects/-Users-matiasfranco-Developer-boogle/memory/`) has not been copied yet: the
  Windows T3 had no linked environment for the MacBook, so it could not read it.
- Delegates keep running on the machine that started them. Leave the MacBook on until in-flight jobs have shipped,
  or the work in their worktrees stays there.

## Boogle heartbeat

- Schedule: `{type: "interval", everyMs: 3600000}` (hourly). Enabled. Bound to the orchestrator thread,
  `freshSession: false`.
- Model: **Fable medium** (`claude-fable-5-2`, effort medium), set in the bound thread's model picker; the
  scheduled task has no model of its own ([owner call](owner-calls.md#heartbeat-workflow), 17 November).
- **Pending, 17 November:** the owner's Fable and workflow-review change is in the skill (section 9, step 2) but not yet
  in the live task: the HOTBOX orchestrator thread reached this machine through a link without full access, so T3
  refused both the thread's model change and the task's prompt update. To apply: in the heartbeat's thread pick
  Fable 5.2, effort medium; and in the prompt below, after the "Name the bottleneck" list, add this line, then
  update the verbatim copy here:
  `- **Workflow review** (owner, 17 November): look at all the work since the previous run for throughput, friction, rework, waste and waits on the owner; name the biggest loss and act on it within section 9's limits, and send any change to how work is run to "Open owner questions" with a recommendation (skill section 9, step 2).`
- Prompt (verbatim):

```text
Orchestrator heartbeat: Boogle's one unattended orchestrator (owner, 16 November 2026; the four-hour tick was folded into this run). Everything you need is in the repo, not in this thread's history. This thread is not a live owner session (owner, 16 November).

The project root checkout (C:\Users\matia\Claude work\boogle) is a stale launcher: do not read plans, skills or instructions from it, and do not edit it. First run `git fetch origin`. Then work from a worktree at origin/main, `../boogle-heartbeat`:
- If it doesn't exist, create it with `git worktree add --detach ../boogle-heartbeat origin/main`.
- If it exists and is clean, run `git -C ../boogle-heartbeat checkout --detach origin/main`.
- Run `npm ci` there if node_modules is missing or the lock changed.
Use Node 26: `export PATH="$HOME/AppData/Local/nvm/v26.13.0:/c/Program Files/GitHub CLI:$PATH"` (this also puts gh on PATH). Run every command from that worktree.

Read `AGENTS.md` and `.claude/skills/orchestrate-boogle/SKILL.md` from that worktree with the Read tool. Don't use the Skill tool, which would load the stale copy. Follow the skill, and its section "9. The heartbeat keeps work moving" exactly: its order of work, what it may start, what it must leave for the owner, and its limits. In short:
- A red main, or a failed deploy or smoke: triage it now.
- A stuck, failed or DIRTY (conflicting) ship PR: rebase, fix or reship.
- A merged branch's worktree: clean it up.
- A delegate that has reported: review and ship it per the usual rules.
- **Name the bottleneck and act on it** (owner, 11 November).
  - A STALLED test or check process: find its test file, rerun that file alone with a timeout, kill the stuck run and tell its agent.
  - Idle browser or MCP processes left by finished jobs: kill them, but never one that belongs to a running delegate.
  - A load average over ~30 that is starving the bot queue: hold or stagger browser-heavy jobs.
  - Bot-queue waits, slow CI: do whatever unblocks the most work.
- If no job is running on a P1 backlog row and fewer than three jobs are in flight (owner, 16 November), start exactly one next step as section 9 allows. Start nothing the owner hasn't approved, and nothing section 9 leaves for him.

If nothing needed action, reply with one line: "heartbeat: all clear", the bottleneck in a few words, and a count of running jobs and open PRs. Otherwise report what you found and did in a few lines, always including the bottleneck, and end with three lines: shipped, started, waiting on the owner.
```

## Boogle daily tidy

- Schedule: `{type: "fixed_time", timeOfDay: "09:00"}`, every day, in the machine's local time (17:00 UTC in Pacific
  standard time, on both machines). Enabled. Bound to the same thread, `freshSession: false`.
- Prompt (verbatim):

```text
Daily tidy pass. In C:\Users\matia\Claude work\boogle, run the `tidy` skill: simplify code merged since the last pass, run the architecture review, audit docs and agent instructions for drift, and clear merged worktrees and branches. Ship any changes through the usual review and ship-queue rules, then report what was done in a few lines.
```

Unlike the heartbeat, this prompt runs the skill through the Skill tool from the project root, which the heartbeat
treats as a stale launcher. It is recorded as it ran. The orchestrator's suggestion, not adopted: give it the
heartbeat's worktree preamble.
