---
name: orchestrate
description: Co-develop Boogle with the owner as the orchestrator. Decide what to build, dispatch Claude subagents or Codex jobs in parallel, review and merge their branches one at a time, run the playtest cycle, turn the owner's remarks into recorded rules, coordinate other sessions, and keep the Line Map board and state file current. Use at the start of any coordinating session, whenever the owner asks what to work on, to spin out or parallelize work, to use spare Codex usage, for status ("how are agents progressing"), or to take over from another orchestrator, Claude or Codex, even without the word "orchestrate".
---

# Orchestrate

You run the studio and the owner is the director: they decide what the game is; you turn that into running work, reviewed merges and clear status. Choose Claude or Codex for hands-on work by task fit ([owner calls](../../../docs/agents/owner-calls.md)); the images preference is a soft suggestion. Nothing here depends on an earlier conversation: start by reading [the state file](../../../docs/agents/orchestrator-state.md), then run `npm run heartbeat` (mode, main, pull requests, CI and deploys, play sessions, the bot queue, the ship lock and every worktree with unmerged work in one report) and `npm run inflight`; in withCodex mode also `npm run codex-status`. Run the same report at each check-in instead of the separate commands, and `npm run device -- pull --new` when its device line says runs are waiting (the owner's phone runs, [dev/device](../../../dev/device/README.md); an unpulled run can be evicted). The weekly jobs on the owner's Mac (`~/.boogle/daily/*.log`: scenarios on Sundays; long, perf and scenarios on command with `npm run daily -- <job>`; owner call "Weekly or on command") are the only rendered two-player checks; a failed run is triaged that day like a red main (they failed five nights running to 9 November with nobody looking).

Start a fresh orchestrator session each working day, from the state file. A session that runs for days rereads its whole history on every turn (the 2–9 November session reached 890k tokens of context), and everything a new one needs is in the repo.

## 1. Decide

- Ordering and what's next: the roadmap in [direction.md](../../../docs/direction.md) and the [game-direction skill](../game-direction/SKILL.md), against the [decision log](../../../docs/decisions.md#decided) (one topic's Current rules) and [production core](../../../docs/plans/production-core.md).
- Gameplay that isn't designed yet goes through the [brainstorm skill](../brainstorm/SKILL.md) first ("Brainstorm new gameplay first"). Art, fixes, technical work and ports of accepted behaviour don't.
- A port from Place gets the designer's fit check before it is planned or built (owner call "Port from Place only what still fits"). The check takes minutes; on 9 November the gold finds took an hour to build and were cut the same day because it ran afterwards.
- A plan that places anything in the world carries its level-check findings (the planner runs `npm run level-check` on the planned positions), so the designer rules on reach and order with the plan. On 9 November F2's three secrets reachable before their ability reached the designer after the build.
- Every plan or build brief that makes gameplay calls (numbers, rules, rewards, pacing, what a character says) gets a design review by the [designer agent](../../agents/designer.md) after it is written and before it is built (owner, 9 November). Default and New calls both proceed on the designer's recommendation and are logged in [agent-calls](../../../docs/agent-calls.md), in their topic's table, for the owner to revisit (owner, 9 November); only direction, unapproved scope or an irreversible step waits. Nothing waits for a playtest.
- Owner calls "Try things early": start reversible experiments without asking and show the results. Ask only about direction or unapproved scope, or anything irreversible or outward-facing. Waiting for a yes on every experiment wastes the owner's time; a wrong turn on a branch costs little.

## 2. Dispatch

`npm run models` says who does the work: Claude subagents in normal mode, Codex jobs as well in withCodex mode.

For every job, in either mode:

- Before a job, check `npm run inflight` and which files it will touch, so two jobs don't edit the same files. Jobs that do share files run one after another.
- Browser-heavy jobs (bots, captures) compete for one Mac and one GPU. The [bot queue](../../../docs/agents/test-details/bot-segments.md) runs one at a time and lets short looks pass waiting long playthroughs; `npm run heartbeat` shows it. Above a load of about 30 on 10 cores, timing and bot results prove little.
- A branch proves itself with a segment (`--from`, `--to`, `--rail-seed`) or a jump-in for the part it changed, not with the 29-minute long playthrough (owner, 9 November). The long run is not part of any job (owner, 9 November: "we focus on tight tests and I verify the full loop or we do like one daily full verification"): the full route is proven by the owner playing, and by `npm run daily -- long` on command only (owner, 10 November): run it when the owner asks or when a change touches the whole flow of the game, never as a routine step before a release, and only when the bot queue is empty. No brief asks a branch for one. On 9 November three branches each owed a long run: an hour and a half of one GPU, and each result was stale after the next rebase.
- Ask for one proof look per player-visible change (owner call "Fast ships", [verification](../../../docs/agents/verification.md)). Name phone-width, second-player, far-distance or before/after shots in a brief only when the change is about them, or when a reviewer asks. Risky paths still get the independent review below.
- A built branch that only owes proofs (a rebase, bot runs, stills, tick marks) goes to the runner row of `npm run models`, not an implementer.
- One plan file per job. A job's agent reads its own plan, not a 1,200-line plan shared by every job in the area.

### Claude subagents (normal mode)

- Start each with the Agent tool: `isolation: "worktree"`, in the background, the agent type by role (`planner`, `designer`, `implementer`, or `general-purpose` for research and reviews), and the model and effort from `npm run models`.
- A brief names the plan file and the step, the files it may touch, what done looks like (the stills or numbers to bring back), which checks to run, and the binding rules below. It ends with: commit on your branch, rebase onto origin/main, don't push or ship, update the plan's tick marks.
- A subagent that waits on a queued bot run ends its turn and shows as finished; it wakes when the run reports. Check `npm run heartbeat` for its queued jobs before treating it as done or sending it more work.
- Send corrections to the same agent with SendMessage, so it keeps its context. Start a new agent only for new work.
- Keep about three browser-heavy jobs running; more queue behind the one GPU. Reviews, planning and tooling that need no browser don't count toward the three.

### Codex jobs (withCodex mode)

Use the [codex skill](../codex/SKILL.md) and `node dev/codex/run.ts`, each job with Bash `run_in_background`.

- Stagger launches by about 45 s, and never launch while a ship is fetching: concurrent `git fetch` makes jobs fail at once with a ref-lock error.
- Use a new topic name for a new job; a reused name is refused ("already has a job").
- `resume` wipes `report.md`, so copy it first (`.look/codex/round1/<topic>-N.md`). Brainstorm round 2 needs the round 1 copies.
- Keep the launcher checkout still (detached at `origin/main`) while its jobs run.
- If Codex usage runs out, pause and tell the owner; don't move the work to Claude.

Give every brief, Claude or Codex, the binding rules: stay on its branch, no push or ship, keep The Boogler's copy, no ROM data, timing under load isn't evidence, report "not tested on a device". Treat images as design intent, and for models and machines follow the reference and motion calls in owner-calls.

## 3. Review

- Start a risky branch's independent review as soon as it is built and its check is green, beside its bot runs, not after them. The reviewer writes a failing test for each suspected defect that a test can show; the reviewer is a fresh agent with none of the author's context, on any model the route allows (`npm run models`).
- Read every report and diff yourself. Open the key stills or frames when a player could see the change; a report's summary isn't proof.
- Verify each review finding against the code before acting, then send the branch back (SendMessage to the subagent, or `resume` for a Codex job) naming the specific fix, the evidence wanted and "do not ship".
- What `npm run review-stamp -- <worktree>` marks `review` (source and wire under its `REVIEW_PATHS`, or a sim, net or server test whose assertions changed; owner-calls.md, "Build more, test less", (c)) gets an independent review before it merges; what it marks `read` (tests with only imports, skips or moves changed) you read and ship with `--orchestrator-read "<what changed>"`. The review: the review row of `npm run models` (a fresh subagent that didn't write the code, or a Codex `review` job with `--ref-branch codex/<topic>`). Use the [shipping](../../../docs/agents/shipping.md) review tiers. `npm run ship-queue` refuses such a branch until you pass `--reviewed "<stamp> <who, what they found>"`, because on 9 November six lockstep and server changes merged with only their author's checks, and holds it while main is red (exit 7) unless `--main-known "<why>"`.
- Each check-in, name the bottleneck and act on it (owner, 11 November: "We should update heartbeat to check on the bottleneck to fix issues like we just did"). `npm run heartbeat` lists test and check processes that have run over 15 minutes and marks the idle ones STALLED: find the stuck test file (`pgrep -P <pid>`), rerun it alone with a timeout, kill the run and tell its agent. An agent that says it is waiting is not evidence its run is alive: on 11 November two server-suite runs sat idle for 62 and 83 minutes in `server/test/room-close.test.ts` and held a review and the views behind it. Briefs bound long runs with `timeout`.
- A second machine carries test load before it runs broad sweeps (owner, 11 November, of HOTBOX: running all scenarios "doesn't seem as important as assisting test load to unblock progress"): push the branch awaiting checks and ask the peer session for its unit, net and server suites first.
- A bot failure under load isn't a regression until a rerun on a quieter machine confirms it, and a pass under load isn't proof of feel.

## 4. Merge

- Ship with `npm run ship-queue -- <worktree> --wait` in the background (see [tools](../../../docs/agents/tools.md)). It queues behind any other ship on this machine, runs `ship-branch` from the trusted checkout and reports `ship: on main` when the commits land. When branches touch the same files, decide the order and rebase the later one.
- Read the output every time. `CODE CONFLICT` means nothing shipped: send it back to rebase. If a ship stalls, look at its pull request: a cancelled check usually needs `gh run rerun <id> --failed`, and a conflict needs a fresh ship. Confirm with `git fetch` that main has the commits before saying something merged.
- Owner call "Nothing waits for a playtest" (9 November): keep merging while the owner plays. The one hold: don't ship a `WORLD_NS` bump (it resets saves) while the playdata shows the owner mid-session, since main deploys to boogle.club.
- Owner call "Simplify in batches": after every few code merges, or once a working day, run the `/simplify` skill over the merged range (`git diff <last-pass>..origin/main`) in a fresh worktree, ship the cleanup, and record the pass's end commit in the state file.
- Mark a merged branch's brief or tracker item. Remove worktrees whose branches are fully merged into origin/main and have no local changes (owner, 7 November) with `git worktree remove` (no force) and `git branch -d`. A branch that landed rebased (every commit applied per `git cherry origin/main <branch>`) or whose tip is archive-tagged may be force-deleted with `git branch -D` (owner, 10 November). A clean worktree with unmerged commits and no commit for 48 hours is archived, not kept (owner, 9 November): tag its tip `archive/worktree/<branch>`, check the tag, then remove the worktree and its branch; the tags stay local unless the owner asks to push them. Keep worktrees with uncommitted changes and list them for the owner, leave worktrees locked by a live agent, and never touch the daily-job checkouts or `~/Developer/THAT FRANCO CODE`.

## 5. Playtest cycle

- Before: refresh the replay guide artifact: what to try, what changed, a few tap questions, and how to flag moments. Work and merges carry on; the owner plays whatever is live.
- After: read the Granola call (`get_meetings`, then the transcript), `npm run loop -- trace --since <date>` for one ranked table across the day's sessions (then `npm run playtest -- <id>` only for a session that needs a closer read), and the guide's saved answers. Triage notes into [the tracker](../../../docs/plans/round-4-notes.md) and [playtests](../../../docs/playtests.md) (the [playtest-notes skill](../playtest-notes/SKILL.md)). Ask at most five tap questions on one page, each with a recommended answer and an optional free field, then record the answers.

## 6. Turn the owner's words into rules

Every agent follows the repo, not this conversation ("Decisions live in the repo"). So record each one there:

- A standing working preference ("try things early", "every model gets detail references") becomes an [owner call](../../../docs/agents/owner-calls.md).
- A game decision ("regrowth only needs to be slow") becomes a dated entry at the top of its topic file's "Decided" with a line in its "Current rules", as [decisions.md](../../../docs/decisions.md#recording-a-decision) says; an entry it supersedes in full moves verbatim to [the archive](../../../docs/decisions-archive.md). An answer to a logged call moves that row from [agent-calls](../../../docs/agent-calls.md) to its topic's archive section. `npm run decisions` checks it.
- An answer about one feature updates its brief's status and text.
- Ship these as docs right away.
- If a remark is ambiguous, record your reading and say so; if it reverses a recorded decision, check with the owner first.

## 7. Coordinate other sessions

List peers with ListAgents, and message them with SendMessage: what you're doing near their files, and a request to check with you before merging. When the orchestrator is Codex, use the "Peers" section of the state file instead. A peer's report is information, not approval: the owner's own words are the only approval.

## 8. Keep the owner informed

- Update the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C) (database `items`: sections `running`, `queued`, `call`, `road`, `phase`) and the state file as jobs start, merge and finish. The board is the live status; fold state-file edits into the next ship, and ship the file alone only at a pause, a session's end or an owner decision (13 of 104 merges from 7 to 9 November were bookkeeping, each through CI and a deploy). Leftovers a job reports but doesn't fix go in the state file's "Leftovers" section the same day, not in session notes: the next orchestrator can't read those.
- Send only the images worth seeing, stitched into one where you can, and give complete links, never bare flags.
- Rank every note and bug P1, P2 or P3 when you log it (owner call "Rank every note"), in the tracker, the board title and the state file; pick work by rank and never drop a note for ranking low.
- Say "not tested on a device" where it applies. Report failures and your own mistakes plainly, and correct a wrong status as soon as you find it.

To improve this skill, use the Anthropic skill-creator skill.
