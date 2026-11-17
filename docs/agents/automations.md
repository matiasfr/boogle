# Orchestrator automations

The owner's scheduled orchestrator runs, recorded so they can be recreated exactly on another machine. They are
T3 Code scheduled tasks in the Boogle project, both bound to one orchestrator thread (`bindToCurrentThread: true`,
`freshSession: false`): every run posts in that thread and keeps its context.

Paused on 17 November 2026 at 06:05 UTC on the MacBook (`/Users/matiasfranco/Developer/boogle`). The owner is moving
orchestration to another device. Pausing kept the tasks, so they can be turned back on here with `enabled: true`.

## Moving them to another device

1. **Machine setup:** clone the repo and check `gh auth status` and `git fetch origin`. Install Node 26 with nvm
   (the prompts use `$HOME/.nvm/versions/node/v26.13.0/bin`). Add the Codex provider to T3, since delegates run as
   `gpt-6.1-sol` and `gpt-6-astra`.
2. **Paths:** the prompts name the old clone's path. Change `/Users/matiasfranco/Developer/boogle` to the new clone's
   path. `../boogle-heartbeat` is relative to the clone, so it needs no change.
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
- Delegates keep running on the machine that started them. Leave the MacBook on until in-flight jobs have shipped,
  or the work in their worktrees stays there.

## Boogle heartbeat

- Schedule: `{type: "interval", everyMs: 3600000}` (hourly). Enabled. Bound to the orchestrator thread,
  `freshSession: false`.
- Prompt (verbatim):

```text
Orchestrator heartbeat: Boogle's one unattended orchestrator (owner, 16 November 2026; the four-hour tick was folded into this run). Everything you need is in the repo, not in this thread's history. This thread is not a live owner session (owner, 16 November).

The project root checkout (/Users/matiasfranco/Developer/boogle) is a stale launcher: do not read plans, skills or instructions from it, and do not edit it. First run `git fetch origin`. Then work from a worktree at origin/main, `../boogle-heartbeat`:
- If it doesn't exist, create it with `git worktree add --detach ../boogle-heartbeat origin/main`.
- If it exists and is clean, run `git -C ../boogle-heartbeat checkout --detach origin/main`.
- Run `npm ci` there if node_modules is missing or the lock changed.
Use Node 26: `export PATH=$HOME/.nvm/versions/node/v26.13.0/bin:$PATH`. Run every command from that worktree.

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

- Schedule: `{type: "fixed_time", timeOfDay: "09:00"}`, every day, in the machine's local time (17:00 UTC on the
  MacBook). Enabled. Bound to the same thread, `freshSession: false`.
- Prompt (verbatim):

```text
Daily tidy pass. In /Users/matiasfranco/Developer/boogle, run the `tidy` skill: simplify code merged since the last pass, run the architecture review, audit docs and agent instructions for drift, and clear merged worktrees and branches. Ship any changes through the usual review and ship-queue rules, then report what was done in a few lines.
```

Unlike the heartbeat, this prompt runs the skill through the Skill tool from the project root, which the heartbeat
treats as a stale launcher. It is recorded as it ran. The orchestrator's suggestion, not adopted: give it the
heartbeat's worktree preamble.
