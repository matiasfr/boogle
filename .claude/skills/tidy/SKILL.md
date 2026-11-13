---
name: tidy
description: Boogle's one-stop cleanup pass, run once a day by the orchestrator's heartbeat or on request. Simplifies code merged since the last pass, runs the architecture review (including implicit state machines), audits docs and agent instructions for drift, consolidates Claude's memory, and clears merged worktrees and branches. Use when the owner asks to tidy, clean up, audit or simplify the repo, says /tidy, or when the daily pass is due.
argument-hint: '[catch-up | code | arch | docs | memory | debris]'
---

The owner's 9 November call: with many agents merging automatically, run one cleanup shop on a schedule to keep things
running well. One pass a day; each part is small. Models come from `npm run models`. Follow the owner's pick-and-log
rule: small fixes ship, judgment calls go in `docs/agent-calls.md`, and only direction, scope or something irreversible
waits for the owner.

With an argument, run only that part. Without one, run all five in order, skipping a part that ran within the last day
(the state file's "Tidy" line records each part's last run and end commit).

## 1. Code: simplify what merged

- Range: `<last code pass>..origin/main`, from the state file. Skip docs, generated files and assets.
- Run the `simplify` skill over that range in a fresh worktree from origin/main. If the range is large (`catch-up`, or
  more than about 60 changed source files), split it by area (for example `src/entities/railway` and `src/sim`;
  `src/render`; `src/player` and features; `server`; `dev`) and run one pass per area, one area at a time.
- First run `npm run inflight` and skip files an in-flight branch is editing; say which.
- Keep lockstep behaviour identical, never touch The Boogler's copy, and prove with `npm run check` plus the checks
  `npm run checks-for` picks. Ship each area with `npm run ship-queue` (or `npm run ship`). Record the end commit.

## 2. Architecture: drift and implicit state machines

- Run the `architecture-review` skill. Its checks live in `docs/research/engine-architecture.md`; check 13 covers
  implicit state machines (loose flags read together instead of one named state). An empty report is normal.
- A surviving finding becomes either a small fix (ship it, as in part 1) or an `agent-calls.md` entry with the
  recommended fix. A bigger refactor is a plan for the planner, not a tidy change.

## 3. Docs and agent instructions

Report and fix:

- broken links and anchors in `docs/`, `AGENTS.md` and `.claude/`;
- `npm run map` routes and AGENTS.md table rows pointing at missing or renamed files;
- skills, agents and docs that contradict `docs/agents/owner-calls.md` or `dev/models.ts`;
- plans whose jobs have all merged but still read as open (mark them done with the PRs), and briefs whose status lags;
- `docs/direction.md`'s Now/Next older than the newest merges;
- research docs missing from `docs/research/README.md` or without a top block;
- `docs/agent-calls.md`: count the open calls (one table per topic) and list any older than a week for the owner; `npm run decisions` must pass (no ruled row left in the live tables, every entry with its Current rules line).

Keep each fix small and factual; don't rewrite decisions or The Boogler's copy.

## 4. Memory

Run `anthropic-skills:consolidate-memory` on Claude's memory directory. Anything that binds every agent moves into the
repo (owner-calls or decisions) and the memory becomes a pointer. Delete memories that are now wrong.

## 5. Debris

- Worktrees: `git worktree list`; remove those whose branch is fully merged into origin/main and that have no local
  changes (`git worktree remove`, no force; owner, 7 November). Keep any with unmerged commits or locked by a live agent.
- Remote `ship/*` branches whose PR is merged or closed: delete them with `git push origin --delete` (they are
  automation branches, not people's work). Never delete `main` or a branch with an open PR.
- `.look/` captures older than 7 days that no doc links to.
- Never touch the daily-job checkouts (`boogle-daily`, `boogle-daily-jobs`), `~/Developer/THAT FRANCO CODE` or the
  Godot lab, and never drop a git stash. Use `"${var:?}"` in any `rm` path.

## Report

One short report: per part, what changed (with PRs), what was skipped and why, and the open-call count. Update the
state file's "Tidy" line. Report only verified states.
