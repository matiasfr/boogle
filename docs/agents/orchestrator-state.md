# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, and keep it short. It holds only what cannot be looked up: who is running what, what waits on the owner, and the lessons. Main, CI, pull requests and worktrees come from `npm run heartbeat`; committed work and its next steps from [the backlog](../backlog.md); what merged from git. How to work is in the [orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 17 November 2026 about 13:00 UTC by the heartbeat; the file was split at 09:50 UTC ([owner decision](../decisions-process.md#d-2026-11-17-short-state-claimed-jobs)). Dated history went to [the log](orchestrator-log.md) and leftovers to [their own file](orchestrator-leftovers.md), both moved word for word.

## Jobs in flight

The one record of who is running what, and what the three-job limit is counted from ([decision](../decisions-process.md#d-2026-11-16-three-jobs-in-flight)). Add a row and ship it in the turn that starts a job, before its first commit; change its state when it reports, blocks or goes to review; delete the row when its branch merges or is dropped. A session never starts a backlog row that has a row here. `npm run heartbeat` prints this table from `origin/main`. Keep these column headers.

| Job | Backlog row | Branch | Started by | Started (UTC) | State |
| --- | --- | --- | --- | --- | --- |

## Where the work stands

- **Machine:** HOTBOX (Windows, clone `C:\Users\matia\Claude work\boogle`) has orchestrated since 17 November; the MacBook's schedules are paused ([automations](automations.md)). The hourly heartbeat runs in its own thread with a fresh session each run (#2006); the owner's live orchestrator thread ran beside it until 09:36 UTC on 17 November, when it settled; no live session was running at 11:35 UTC. Sessions cannot message each other, so they split work through the table above and the Line Map board.
- **Focus:** the choice-and-payoff loop ([decision](../decisions-process.md#d-2026-11-16-focus-choice-and-payoff)); the backlog's P1 rows, at most five. World v58 is on main (C1, #2005).
- **Next work by rank** (17 November handover; the backlog rows carry the detail): the town's sack on the counter (C2 shipped 17 November; K1 and K3 are the next free jobs); garage choices step 3 (steel spent, high risk), with the designer's Quick or Strong rebalance first, now that an extra car can mean rider capacity; riders walking to the coach's doors instead of popping into seats (needs a short plan); a reliable frame-cost measurement of the coach (R4's timings are provisional: find the two 404 errors first); the P3 row of small fixes.
- **Proof debts and leftovers:** [orchestrator-leftovers](orchestrator-leftovers.md). Nothing from 16 or 17 November was tested on a device.

## Open owner questions

One list, newest first. Each proceeds on its recommendation unless it says it waits; the heartbeat starts nothing on a question that waits. When he answers, record the answer in the decision log and delete the item here. Answered lately: [the town’s first choice, 16 November](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers); [the first line, 17 November: no fork](../decisions-core-loop.md#d-2026-11-17-first-line-no-fork); the names "Blast pipe" and "Big boiler" (16 November).

**From 16 and 17 November:**

- A server merge takes 19 minutes to go live (17 November, twice: 05:23 and 10:35 UTC): `deploy-server.yml`'s test job reruns the server tests (5.5 minutes) and builds and boots the image (5.7 minutes) that CI's server job passed on the same commit minutes earlier, then Fly builds it a third time (7 minutes). Smoke waited 12 minutes and failed after C1 with nothing wrong; the heartbeat raised its wait to 24. Recommended: the deploy's test job is skipped when CI was green on that commit, which brings a server merge live in about 8 minutes. Nothing waits.
- The footing wagon: does it stay on its train after the ring's last footing (the designer and orchestrator recommend it stays; nothing waits)? With it, call 108: after the rivet, should the footing wagon's train stop for stone? The earlier measurement was 2,884 ticks between loads because its train never takes stone.
- More red on the coach, or not.
- The town plan's second plot: waits for the designer's review of the first town as a lesson.
- How many riders a passenger car holds and how cars are added (from his seats call; asked before the riders' coach shipped with eight places, so check [his answers](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) before asking again).
- Whether the buy's reach check (3.2 m from the board, live) is wanted.
- Placeholder strings: "Every train", "Loader yard", the Cars tile's counts line, the board and till strings, and C1's "Sack waiting" and "Back after a night: the coin sack is on the counter", and C2's "Empty" (the prompt), "Sack <n>" and "<n> Boogles" on the till board.
- Device tests run remotely: both plans assume the Mac orchestrates and HOTBOX is an ssh runner; with HOTBOX orchestrating they need re-planning before any step (the orchestrator's reading, not yet his word).

**From 14 November:**

**Owner questions still open** (each proceeds on its recommendation): the board plan's three (above); suspect strings owed to him in one list (footings board lines in `src/entities/railway/footing-cues.ts`, "Next load: on the wagon", kiln, cradle, seal, great tree, rack and wagon prompts); the statue's facing and size, the glider trail's brightness and the wind sound (his walk); the right-hand running plan's three questions; walk the Round blockout. Items the backlog agent could not tell were commitments (train ladder, short turn, co-op abilities E, great beam, 2D economy prototype, express and east bay, yards, production-core slices 6 and 7, the target-quality pass, the 12 November hold list, mini-golf, critters) were put to him on 14 November and are unanswered: ask once.

Proceeding on the recommendations (the gap's earlier three questions, the record ceiling and no try-on are answered; do not ask again):

- **Open orchestrator default, track layer:** add a second hand so Q5/Q6 motion reads; keep laying speed. Newly stated after the owner answer; not owner-confirmed ([agent calls](../agent-calls.md#rail-construction-levels-and-travel)).
- **Footings:** the pier still accepts a hand-carried footing although the bill says by wagon (recommended: do not refuse it yet); "stall" versus "rotunda" on the footings board.
- **Turnouts:** J1 proof looks rough from above; the other junctions wait for his look.
- **Open orchestrator default, draft strings:** stay live until he edits them; keep one consolidated list of new strings owed to him ([agent calls](../agent-calls.md#controls-hud-and-arrival)): "Next load: on the wagon"; kiln, cradle, seal, great tree, rack and wagon prompts; footings board lines in `src/entities/railway/footing-cues.ts`.
- **Earlier unresolved calls:** (the DESIGN.md text and the agent-instruction drafts were applied on 16 November; P3 left: `.claude/skills/look/references/performance.md` still describes "ms per lockstep tick" and `onApplied`, unchecked against what `npm run perf` prints now) ([step 8 report](../archive/plans/server-owned-players-step8-report.md)); settle the earlier after-the-fact independent reviews; level-pacing's "should the cart ever be ridden" (no), "are the yards still the drop box you mean" (yes), the resident's wagon line (not now), and suspect copy "No line beyond yet", "Needs the powered pick", "Stop requested".

Earlier calls, still open:

- Leg 1 shipped under the 1,600 cap (agent call 109): keep it, or revisit train spacing. The earlier 48-seed settled worst was 1,553 heavy and 1,535 light; the 1,400 gate held on four seeds only. Candidate A added waits on main's stages; candidate B helped light asks only. The short turn still needs its own plan; preserve the `scratch/spacing-*` sheets and record the results in the spacing plan.
- Does the shared pool replace halt yards for upgrades, or cover only goods carried to a hub ([entry](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool))?
- Maps compress the leg to about 30% of its true length; Home shrinks after the rivet and names have leaders. His call on that trade.
- Suspect copy still his: "It runs faster and pulls one more car", "Look at the engine", "Railhead" beside "Stack railhead", and the leg labels. The fourth car is now built; the old "no fourth car yet" note is superseded.

**From 5 to 10 November:**

- **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
- **First-path verdict** on slice 3.
- **Brief questions** in money, cart first and first evening.
- **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
- **Museum:** inspect the miniature, the crystal specimen, or both.
- **Worktree archives:** the 13 November cleanup supersedes the old keep-or-archive question; inspect the local archive tags before recovering any experiment (Housekeeping above).
- **From 10 November** (one lever per platform side and the passenger car at four are answered; see the [decision log](../decisions-rail.md#current-rules)): end-game train direction ([mock-ups](../brainstorms/engine-endgame-mockups.md)): steam to modern (freight or high speed) or the dark plated sci-fi train, or that one as a rival; lengthen halts and gates past 6 m or articulate short cars; a tender on the largest current-era engine or not. The glider banner wording is still his to reword.

## Tidy

- **Tidy:** last full pass 16 November 2026. Code: simplify pass 4 covered `12ba8f7ba..72b79c3f3` ([#1937](https://github.com/matiasfr/boogle/pull/1937), [#1938](https://github.com/matiasfr/boogle/pull/1938), [#1940](https://github.com/matiasfr/boogle/pull/1940)); **last code pass end `72b79c3f3`**, start the next range after it. Architecture and docs: reviewed through `aa7861150` ([#1939](https://github.com/matiasfr/boogle/pull/1939), [report](../reports/tidy-2026-11-16.md)). Memory: consolidated 16 November (full-links rule moved to owner-calls). Debris: 16 November (25 merged or closed `ship/*` branches, 15 merged worktrees, 141 week-old `.look/` captures).

## Rules learned

The lessons; the orchestrator keeps them.

1. Never run `ship-queue` through `| tail`: it hides the exit code. Log to a file, grep narrowly (`ship-check|error|rejected`).
2. A test that spawns git under the pre-push hook inherits `GIT_DIR` (fixed in #1601: `test/helpers/scratch-git.ts`). If every worktree says "this operation must be run in a work tree", check `git config core.bare`.
3. A rebased branch is pushed under a new name, never force-pushed. A branch with merge commits can't be rebased by `ship-branch`: squash it onto origin/main on a new branch.
4. About three full-suite agents is the Mac's limit; briefs ask for typecheck, lint and touched tests only. HOTBOX: two looks at once at most.
5. Default shell is Node 24: export Node 26 (`$HOME/.nvm/versions/node/v26.13.0/bin` on the Mac, `$HOME/AppData/Local/nvm/v26.13.0` on HOTBOX). Run tests with `node dev/test-unit.ts <files>`, not `npx vitest`.
6. Keep independent reviewers: they found real defects in batch C, the CI diet and ring2 R1–R2.
7. New test files need review and must fit the [test diet](tests.md#tests); briefs say "no new unit test files" unless the code is lockstep, even when the plan's step names one (garage step 2, 17 November: a review round to delete it).
8. The registry's 14,000-character must-read budget per route is nearly full: an edit to `tests.md` or `sync.md` must not grow them.
9. A solo look warps page time about 12x while the server runs at real speed: evals wait on server ticks (`railAt()`). Two-player warp looks need `--warp-speed 2`.
10. `refs/stash` is shared across worktrees: no `git stash` in any brief. Two ships fetching at once fail with "cannot lock ref"; rerun.
11. After a ship that changes startup loading, load https://boogle.club/ before calling the site healthy (`dev/live-boot.ts` guards it). During a GitHub Actions outage, run CI locally and merge by PR ([owner call](owner-calls.md)).
12. An artifact page must copy what its store returns before mutating it: the store's objects are read-only and a write fails silently (the open-calls page lost answers this way). Do not republish a page while the owner is using it.
13. A proof gate for anything touching line 2's trains must include the footing wagon's arrival trip by trip and every footing delivery tick; a gate on stage ticks and lever waits missed a cumulative wagon delay.
14. A rule change that moves pinned fixtures needs its own WORLD_NS bump even when the save shape is unchanged.
15. Give a peer or agent the plan text on a pushed branch before asking it to build to a ruling; HOTBOX built two steps from a chat summary and had to reconcile.
16. Before telling the owner he played, check the room: a tab the orchestrator left open on boogle.club logs as play sessions under the default name (the `freight-running-gm82nj` sessions on 12 November were the orchestrator's pane).
17. The owner's earlier words are often in `docs/brainstorms` and `docs/plans/town-layout.md` under his own term (he says "rotunda" for the Roundhouse): search those before saying something is not in the plan.
18. A probe that copies a test's fuzz must reproduce the test's own printed figures and ask rate before its numbers are used (HOTBOX's probe threw away two asks in three and every wait figure for a day was low).
19. A bound proven on a test's own seeds is not proven: try 24 to 48 seeds and the long length before telling the owner a limit holds.
20. When a gate fails, the designer restates it only where it measured the wrong thing; after two rounds the question goes to the owner as a choice.
21. An agent must not edit files while its bot run is in flight (the edit reloads the page under the bot). Read a bot run's `verdict.json` yourself rather than waiting for the agent to say.
22. The orchestrator's own browser checks log as play sessions under the default name (see 16).
23. A cancelled CI run on main with no newer run is a timeout, not a superseded run: read its job times. `npm run heartbeat` now says NO VERDICT for it (17 November: two server-job timeouts went unseen).

23. A rule test that calls `apply()` proves the rule, not the path: every new op needs a host test that sends it as a real `r:edit` (the server stripped `leg` and `id` from three v32 ops and nothing noticed until a reviewer pressed the prompts). A review of sim or server code drives a real server at least once.
24. Reviewers must exercise what the builder did not: dwell before acting, press every prompt, walk every stair, hold a phone upright. Each of today's blockers was outside the builder's own captures.
25. A gate proven on the test's four seeds is not proven (rule 19 again): leg 1's 1,400 held on four seeds and is 1,553 on 48.
26. A hidden browser pane has zero size and the game waits for a drawable size: give the pane a size (`resize_window`) before judging a boot slow.
27. A smoke failure on the server's source commit right after a server-path merge is usually the race with `deploy-server.yml` (19 minutes on 17 November; smoke waits 24 since then): check that the deploy finished and `/version` shows the commit, then rerun the smoke.
36. A thread that ships a job and ends leaves its "Jobs in flight" row, backlog row and plan line stale, and the stale row blocks that backlog row for every other session (C1, 17 November: merged 10:35 UTC, still claimed an hour later). The session that sees the merge deletes the row.
37. A view brief says two things or the review finds them: no new unit test files (rule 7), and a solid that switches on must first move a player standing in it (garage step 2, 17 November: both came back from review and cost a 16-minute fix round).
28. A change to label or layout costs must be diffed against main for the states most rooms are in (the pre-rivet maps), not only the new state.
29. After a ship lands, the next queued branch was checked against the old main. When two branches touch neighbouring code (v45 renamed a helper the meadow used), re-run `node dev/ship-check.ts origin/main HEAD` on the second after the first lands, before shipping it.
30. `dev/codex/run.ts review` takes `--ref-branch` only; `--base-ref` is for tasks.
31. The heartbeat's STALLED mark on a Codex job is often false (low CPU while waiting on the model): check `.look/codex/<topic>/events.jsonl` mtime.
32. `npm run server -- reset <room>` resets a room (backup first); the owner asked how, for future playtests.
33. Tell builders to commit at most about 16 curated stills, 1200 px wide, a few MB, and keep raw dumps and clips local under `.look/`; one brief that said "keep evidence in the repo" produced 119 MB (16 November).
34. A branch that changes test assertions or fixtures is refused by `ship-queue` without `--reviewed`: send it to review before queuing.
35. Asset work on HOTBOX needs `BLENDER="/c/Program Files/Blender Foundation/Blender 5.3/blender"`: Blender is not on PATH and `dev/assets/build.ts` and `inspect.ts` default to the Mac path.

## How merging works

`npm run ship-queue -- <worktree> --wait [--reviewed "<stamp> <who, what they found>"]`, in the background, one branch after another ([orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md), "Merge"). The gate prints the stamp it needs. It finds Node 26 itself. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` symlinks to the main checkout's node_modules; an `npm ci` there empties it. Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

Every code change ships only after an independent review; docs-only changes ship with `--orchestrator-read`. Do not ship code with `--orchestrator-read` (the 14 November slip is in [the log](orchestrator-log.md#process-14-november)).

The Codex sandbox cannot launch a browser: the orchestrator runs `npm run test:net` in the job worktree itself; do not treat a sandbox launch failure as a network regression. The B4 outside-sandbox run was 190/190, as was rotunda 1a's reported run.

## Standing

About three browser-heavy jobs at once. Look captures on HOTBOX run on Playwright's full Chromium (the default on Windows), and two-player looks need `--warp-speed 2`. Report perf work in frame time as well as triangles ([owner call](owner-calls.md#frame-time-60)). Work from a current `origin/main` worktree, never the project root checkout, which is a stale launcher.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage where T3 allows it; where it refuses (an approval-required thread to a full-access one), the Jobs in flight table is the channel.

## Read when needed

- [Leftovers, proof debts and queued items](orchestrator-leftovers.md): before picking a small job, and when a job reports something it did not fix.
- [The log](orchestrator-log.md): dated history of handovers, heartbeat runs and what shipped each day. Add to it only what git and the backlog do not record.
- [Backlog](../backlog.md): every effort the owner has committed to, ranked, with its status and next step. This file holds live job status, proof gaps and leftovers; it does not repeat that list.
- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [Ring Island build 2](../plans/ring-island-build2.md), [slice 5 town economy](../plans/slice5-town-economy.md), [greybox route](../plans/greybox-route.md), [campaign outline](../plans/campaign-outline.md) (hub towns), [remote runner](../plans/remote-runner.md); the ECS migration is done.
- [Production core](../plans/production-core.md), [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Open calls page (version 6, all 14 questions answered): https://claude.ai/artifact/MQizAujJpyybXc7fL7Fw3W
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).
