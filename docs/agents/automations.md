# Orchestrator automations

The owner's scheduled orchestrator runs, recorded so they can be recreated exactly on another machine. They are
T3 Code scheduled tasks in the Boogle project, each bound to a thread (`bindToCurrentThread: true`), so every run
posts there. Since 17 November they are bound to different threads: the heartbeat to "Boogle orchestrator" (named "Move Boogle Heartbeat Thread" until 19 November)
with a fresh session each run, the daily tidy to "Set Up Scheduled Boogle Tasks", where it keeps its context.

Running since 17 November 2026 (first heartbeat 07:24 UTC) on the Windows machine `hotbox`, clone
`C:\Users\matia\Claude work\boogle`, Pacific time. Paused on 19 November 2026 while Claude and Codex were at usage limits, and re-enabled on 24 November on the owner's "Let's resume development" ([log](orchestrator-log.md#24-november-resumed-state-file-cleaned)). The prompts below are the ones configured there.

The MacBook's copies (`/Users/matiasfranco/Developer/boogle`) were paused on 17 November at 06:05 UTC and kept, so
they can be turned back on there with `enabled: true` (and the Windows ones paused).

## Moving them to another device

1. **Machine setup:** clone the repo and check `gh auth status` and `git fetch origin`. Install Node 26 and put it
   and gh on the heartbeat's `PATH` line. On Windows, nvm-windows (`winget install CoreyButler.NVMforWindows`) puts
   it in `$HOME/AppData/Local/nvm/v26.13.0`, and gh's MSI installs to `/c/Program Files/GitHub CLI`, which T3 does
   not see until it restarts. On macOS, nvm uses `$HOME/.nvm/versions/node/v26.13.0/bin`. Add the Codex provider to
   T3, since delegates run as `gpt-6.2-sol` and `gpt-6.2-astra`. Run `npm ci` in the clone root as well as in the
   heartbeat's worktree (`npm run heartbeat` reads play sessions and device runs from the root), copy the old clone's
   `.env.local` (`REPORT_TOKEN` and the other keys), and run `npx playwright install chromium` for bots and looks.
   In T3, set the Boogle project's `defaultThreadEnvMode` to `worktree` and `autoPull` on (owner, 19 November,
   [decision](../decisions-process.md#d-2026-11-19-finished-work-ships-threads-in-worktrees)): new threads then get their own checkout, and the
   root, which every delegate worktree starts from, follows main.
2. **Paths:** the prompts name the clone's path (`C:\Users\matia\Claude work\boogle` now); change it to the new
   clone's path. `../boogle-heartbeat` is relative to the clone, so it needs no change.
3. **Create:** open the new orchestrator thread in the Boogle project and create both tasks from it with
   `schedule_task`, using the prompt, schedule and settings below. That binds them to the thread.
4. **Turn off the old ones:** do not run both machines at once. Two heartbeats would break the
   [one-heartbeat rule](../decisions-process.md#d-2026-11-16-one-heartbeat) and double-count the job limit.
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

- Schedule: `{type: "interval", everyMs: 3600000}` (hourly). Enabled. Task id
  `scheduled-task:ae9bad7f-91a5-4e85-bf10-3472d12db915`, created 17 November 2026 at 09:32 UTC.
- Bound to the thread "Boogle orchestrator" (`b15f0ebb-023a-4024-89ef-dfc8344f4c84`), full access,
  `freshSession: true`: every run posts in that thread but starts a fresh session, so nothing carries over from
  earlier runs.
- Model: **Fable 5.2 medium** (`claude-fable-5-2`, effort medium, the thread's default), set in the bound thread's
  model picker; the scheduled task has no model of its own ([owner call](owner-calls.md#heartbeat-workflow),
  17 November).
- The old task (`…:schedule-task:boogle-heartbeat-windows-2026-11-17`, bound to "Set Up Scheduled Boogle Tasks", on
  Opus with `freshSession: false`) was paused on 17 November with `enabled: false` and kept. Do not turn it back on
  while this one runs ([one-heartbeat rule](../decisions-process.md#d-2026-11-16-one-heartbeat)).
- Prompt (verbatim):

```text
Orchestrator heartbeat: Boogle's one unattended orchestrator (owner, 16 November 2026; on Fable medium with a workflow review since 17 November). Everything you need is in the repo, not in this thread's history. This thread is not a live owner session.

The project root checkout (C:\Users\matia\Claude work\boogle) is a stale launcher: do not read plans, skills or instructions from it, and do not edit it. First run `git fetch origin`. Then work from a worktree at origin/main, `../boogle-heartbeat`:
- If it doesn't exist, create it with `git worktree add --detach ../boogle-heartbeat origin/main`.
- If it exists and is clean, run `git -C ../boogle-heartbeat checkout --detach origin/main`.
- Run `npm ci` there if node_modules is missing or the lock changed.
Use Node 26: `export PATH="$HOME/AppData/Local/nvm/v26.13.0:/c/Program Files/GitHub CLI:$PATH"` (this also puts gh on PATH). Run every command from that worktree.

Read `AGENTS.md` and `.claude/skills/orchestrate-boogle/SKILL.md` from that worktree with the Read tool. Don't use the Skill tool, which would load the stale copy. Follow the skill's section "9. The heartbeat keeps work moving" exactly: its order of work, what it may start, what it must leave for the owner, and its limits. Read `docs/agents/orchestrator-state.md` first: another orchestrator thread may be running jobs, so count running delegates as well as `npm run inflight`, and never start a row the state file says is running. In short:
- A red main, or a failed deploy or smoke: triage it now.
- **Workflow review** (owner, 17 November): look at all the work since the previous run for throughput, friction, rework, waste and waits on the owner. Name the biggest loss and act on it within section 9's limits. Send any change to how work is run to "Open owner questions" with a recommendation (skill section 9, step 2).
- A stuck, failed or DIRTY (conflicting) ship PR: rebase, fix or reship.
- A merged branch's worktree: clean it up.
- A delegate that has reported: review it and ship it per the usual rules.
- **Name the bottleneck and act on it** (owner, 11 November).
  - A STALLED test or check process: find its test file, rerun that file alone with a timeout, kill the stuck run and tell its agent.
  - Idle browser or MCP processes left by finished jobs: kill them, but never one that belongs to a running delegate.
  - Bot-queue waits, slow CI: do whatever unblocks the most work.
- Fill the free job slots as section 9 allows, up to its limit (owner, 18 November). Start nothing the owner hasn't approved, and nothing section 9 leaves for him.

If nothing needed action, reply with one line: "heartbeat: all clear", the bottleneck and the hour's biggest loss in a few words, and a count of running jobs and open PRs. Otherwise report what you found and did in a few lines, always including the bottleneck and the workflow review's one line, and end with three lines: shipped, started, waiting on the owner.
```

## Boogle daily tidy

- Schedule: `{type: "fixed_time", timeOfDay: "09:00"}`, every day, in the machine's local time (17:00 UTC in Pacific
  standard time, on both machines). Enabled. Bound to the thread "Set Up Scheduled Boogle Tasks"
  (`7462337a-3dd9-47e5-9d69-ea52fd33ffb9`), `freshSession: false`.
- Prompt (verbatim):

```text
Daily tidy pass. Everything you need is in the repo, not in this thread's history.

The project root checkout (C:\Users\matia\Claude work\boogle) is a stale launcher: do not read skills or instructions from it, and do not edit it. First run `git fetch origin`. Then work from a worktree at origin/main, `../boogle-tidy` (the tidy's own, not the heartbeat's):
- If it doesn't exist, create it with `git worktree add --detach ../boogle-tidy origin/main`.
- If it exists and is clean, run `git -C ../boogle-tidy checkout --detach origin/main`.
- Run `npm ci` there if node_modules is missing or the lock changed.
Use Node 26: `export PATH="$HOME/AppData/Local/nvm/v26.13.0:/c/Program Files/GitHub CLI:$PATH"` (this also puts gh on PATH). Run every command from that worktree.

Read `AGENTS.md` and `.claude/skills/tidy/SKILL.md` from that worktree with the Read tool, and follow the tidy skill. Don't load a repo skill (tidy, architecture-review) through the Skill tool, which would load the stale copy: read its SKILL.md from the worktree instead. Built-in skills the tidy names (simplify, consolidate-memory) run through the Skill tool as usual.

Run every part that is due: simplify code merged since the last pass, run the architecture review, audit docs and agent instructions for drift (the orchestrator state file included), consolidate memory, and clear merged worktrees and branches. The tidy's delegates count toward the jobs-in-flight limit: read the "Jobs in flight" table in `docs/agents/orchestrator-state.md` first (it names the limit), start none past it, and give each delegate a row there. Ship any changes through the usual review and ship-queue rules, then report what was done in a few lines.
```

Since 17 November (owner: "Fix all the problems you highlighted") it has the heartbeat's preamble: it works from its
own worktree at `origin/main`, `../boogle-tidy`, and reads the tidy skill from there, not from the stale project
root. Its first run on this prompt is the 17 November one, so the prompt is unproven until that run reports. It
still keeps its thread's context (`freshSession: false`); the skill reads each part's last run from the state file,
so a fresh session would lose nothing (the orchestrator's reading; not changed).
