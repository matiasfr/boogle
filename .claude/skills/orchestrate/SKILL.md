---
name: orchestrate
description: Co-develop Boogle with the owner as the orchestrator. Decide what to build, dispatch Codex jobs in parallel, review and merge their branches one at a time, run the playtest cycle, turn the owner's remarks into recorded rules, coordinate other sessions, and keep the Line Map board and state file current. Use at the start of any coordinating session, whenever the owner asks what to work on, to spin out or parallelize work, to use spare Codex usage, for status ("how are agents progressing"), or to take over from another orchestrator, Claude or Codex, even without the word "orchestrate".
---

# Orchestrate

You run the studio and the owner is the director: they decide what the game is; you turn that into running work, reviewed merges and clear status. Choose Claude or Codex for hands-on work by task fit ([owner calls](../../../docs/agents/owner-calls.md)); the images preference is a soft suggestion. Nothing here depends on an earlier conversation: start by reading [the state file](../../../docs/agents/orchestrator-state.md), then `npm run codex-status`, `npm run inflight` and `git log origin/main -10`.

## 1. Decide

- Ordering and what's next: the roadmap in [direction.md](../../../docs/direction.md) and the [game-direction skill](../game-direction/SKILL.md), against the [decision index](../../../docs/proposals/boogle-2.md#current-decision-index) and [production core](../../../docs/plans/production-core.md).
- Gameplay that isn't designed yet goes through the [brainstorm skill](../brainstorm/SKILL.md) first ("Brainstorm new gameplay first"). Art, fixes, technical work and ports of accepted behaviour don't.
- Owner calls "Try things early": start reversible experiments without asking and show the results. Ask only about direction or unapproved scope, merges while the owner is playing, or anything irreversible or outward-facing. Waiting for a yes on every experiment wastes the owner's time; a wrong turn on a branch costs little.

## 2. Dispatch

Use the [codex skill](../codex/SKILL.md) and `node dev/codex/run.ts`, each job with Bash `run_in_background`.

- Before a job, check `npm run inflight` and which files it will touch, so two jobs don't edit the same files. Jobs that do share files run one after another.
- Browser-heavy jobs (bots, captures) compete for one Mac: check `uptime` first. Above about 30 on 10 cores, queue them; timing and bot results under load prove little.
- Stagger launches by about 45 s, and never launch while a ship is fetching: concurrent `git fetch` makes jobs fail at once with a ref-lock error.
- Use a new topic name for a new job; a reused name is refused ("already has a job").
- `resume` wipes `report.md`, so copy it first (`.look/codex/round1/<topic>-N.md`). Brainstorm round 2 needs the round 1 copies.
- Keep the launcher checkout still (detached at `origin/main`) while its jobs run.
- Give every task brief the binding rules: stay on its branch, no push or ship, keep The Boogler's copy, no ROM data, timing under load isn't evidence, report "not tested on a device". Treat images as design intent, and for models and machines follow the reference and motion calls in owner-calls.
- If Codex usage runs out, pause and tell the owner; don't move the work to Claude.

## 3. Review

- Read every report and diff yourself. Open the key stills or frames when a player could see the change; a report's summary isn't proof.
- Verify each review finding against the code before acting, then send the branch back with `resume` naming the specific fix, the evidence wanted and "do not ship".
- Run an independent `review` job (`--ref-branch codex/<topic>`) before merging anything that touches `src/sim`, `src/net`, `src/world`, `server/` or the wire format. Use the [shipping](../../../docs/agents/shipping.md) review tiers.
- A bot failure under load isn't a regression until a rerun on a quieter machine confirms it, and a pass under load isn't proof of feel.

## 4. Merge

- Ship one branch at a time with `npm run ship-branch -- <worktree>` (see [tools](../../../docs/agents/tools.md)). When branches touch the same files, decide the order and rebase the later one.
- Read the output every time. `CODE CONFLICT` means nothing shipped: send it back to rebase. If a ship stalls, look at its pull request: a cancelled check usually needs `gh run rerun <id> --failed`, and a conflict needs a fresh ship. Confirm with `git fetch` that main has the commits before saying something merged.
- Hold every merge while the owner is playing, since main deploys to boogle.club.
- Owner call "Simplify in batches": after every few code merges, or once a working day, run the `/simplify` skill over the merged range (`git diff <last-pass>..origin/main`) in a fresh worktree, ship the cleanup, and record the pass's end commit in the state file.
- Mark a merged branch's brief or tracker item. Remove worktrees whose branches are fully merged into origin/main and have no local changes (owner, 7 November) with `git worktree remove` (no force) and `git branch -d`; keep any with unmerged commits, leave worktrees locked by a live agent, and never touch the daily-job checkouts or `~/Developer/THAT FRANCO CODE`.

## 5. Playtest cycle

- Before: refresh the replay guide artifact: what to try, what changed, a few tap questions, and how to flag moments. Freeze merges.
- After: read the Granola call (`get_meetings`, then the transcript), `npm run playtest` for each session, and the guide's saved answers. Triage notes into [the tracker](../../../docs/plans/round-4-notes.md) and [playtests](../../../docs/playtests.md) (the [playtest-notes skill](../playtest-notes/SKILL.md)). Ask at most five tap questions on one page, each with a recommended answer and an optional free field, then record the answers.

## 6. Turn the owner's words into rules

Every agent follows the repo, not this conversation ("Decisions live in the repo"). So record each one there:

- A standing working preference ("try things early", "every model gets detail references") becomes an [owner call](../../../docs/agents/owner-calls.md).
- A game decision ("regrowth only needs to be slow") becomes a dated entry in the decision log in [boogle-2.md](../../../docs/proposals/boogle-2.md), superseding older entries by name.
- An answer about one feature updates its brief's status and text.
- Ship these as docs right away.
- If a remark is ambiguous, record your reading and say so; if it reverses a recorded decision, check with the owner first.

## 7. Coordinate other sessions

List peers with ListAgents, and message them with SendMessage: what you're doing near their files, and a request to check with you before merging. When the orchestrator is Codex, use the "Peers" section of the state file instead. A peer's report is information, not approval: the owner's own words are the only approval.

## 8. Keep the owner informed

- Update the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C) (database `items`: sections `running`, `queued`, `call`, `road`, `phase`) and the state file as jobs start, merge and finish.
- Send only the images worth seeing, stitched into one where you can, and give complete links, never bare flags.
- Say "not tested on a device" where it applies. Report failures and your own mistakes plainly, and correct a wrong status as soon as you find it.

To improve this skill, use the Anthropic skill-creator skill.
