# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, and keep it short. It holds only what cannot be looked up: who is running what, what waits on the owner, and the lessons. Main, CI, pull requests and worktrees come from `npm run heartbeat`; committed work and its next steps from [the backlog](../backlog.md); what merged from git. How to work is in the [orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 17 November 2026 about 22:40 UTC by the heartbeat; the file was split at 09:50 UTC ([owner decision](../decisions-process.md#d-2026-11-17-short-state-claimed-jobs)). Dated history went to [the log](orchestrator-log.md) and leftovers to [their own file](orchestrator-leftovers.md), both moved word for word.

## Jobs in flight

The one record of who is running what, and what the three-job limit is counted from ([decision](../decisions-process.md#d-2026-11-16-three-jobs-in-flight)). Add a row and ship it in the turn that starts a job, before its first commit; change its state when it reports, blocks or goes to review; delete the row when its branch merges or is dropped. A session never starts a backlog row that has a row here. `npm run heartbeat` prints this table from `origin/main`. Keep these column headers.

| Job | Backlog row | Branch | Started by | Started (UTC) | State |
| --- | --- | --- | --- | --- | --- |

## Where the work stands

- **Machine:** HOTBOX (Windows, clone `C:\Users\matia\Claude work\boogle`) has orchestrated since 17 November; the MacBook's schedules are paused ([automations](automations.md)). The hourly heartbeat runs in its own thread with a fresh session each run (#2006); the owner's live orchestrator thread ran beside it until 09:36 UTC on 17 November, when it settled; no live session was running at 11:35 UTC. Sessions cannot message each other, so they split work through the table above and the Line Map board.
- **Focus:** the choice-and-payoff loop ([decision](../decisions-process.md#d-2026-11-16-focus-choice-and-payoff)); the backlog's P1 rows, at most five. World v59 is on main (garage step 3, #2029).
- **Next work by rank** (17 November handover; the backlog rows carry the detail): the town's sack on the counter (C2 and K1 shipped 17 November; K3 closed 17 November with the away host test, independently reviewed; left on the row are the designer’s items and the P2 gold-outline follow-up); garage choices: step 3 (steel spent) is on main (#2029, v59, independently reviewed); the designer's Quick or Strong rebalance, owed before step 4 is briefed now that an extra car can mean rider capacity, is on main as a proposal (see Open owner questions; step 4 waits for playable stage-4 lines); the gate cottage opening (home-flip D1) shipped 17 November (independently reviewed twice; the push-out fix in `src/place/sites.ts` is not pinned by a test, by the test diet); D2, the green and the kerb, shipped 17 November (view only; phone width and motion not looked at); next on that row is D3, the forge's west door; then riders walking to the coach's doors instead of popping into seats (needs a short plan); a reliable frame-cost measurement of the coach (R4's timings are provisional: find the two 404 errors first); the P3 row of small fixes.
- **Proof debts and leftovers:** [orchestrator-leftovers](orchestrator-leftovers.md). Nothing from 16 or 17 November was tested on a device.

## Open owner questions

One list, newest first. Each proceeds on its recommendation unless it says it waits; the heartbeat starts nothing on a question that waits. When he answers, record the answer in the decision log and delete the item here. Answered lately: [the town’s first choice, 16 November](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers); [the first line, 17 November: no fork](../decisions-core-loop.md#d-2026-11-17-first-line-no-fork); the names "Blast pipe" and "Big boiler" (16 November).

**From 16 and 17 November:**

- The Quick or Strong rebalance (17 November, [proposal](../brainstorms/garage-trade-rebalance.md), [page](../world/garage-choices.html)): Quick 25 m/s with one 10-footing cargo car, Strong 20 m/s with two, same 6 steel; on the page's model Quick leads North–south by 14.8 s and Bay by 33.4 s and Strong leads Cave by 12.1 minutes, at one and three players. The split is fragile (bills at three quarters, or half the travel legs, and Strong leads everywhere), and the page's layout was not seen (the browser gave no screenshot). Its scope question: should step 4 also own the future lines' sources assembling and delivering a full 20-footing load? Recommended: no, that stays in the future-line freight brief, which owes a loaded-departure proof before the 10/20 figures are called real. Nothing waits; step 4 starts when stage-4 lines are playable.
- Suspect string from garage step 3 (17 November): the Footing wagon tile still says "6 footings a trip, Quarry to Pier" after the bigger cradle makes it 10 (`src/entities/railway/garage-data.ts:189`). His to reword; left as it is.
- The gate cottage reviewer's regression test for the push-out (61 lines in `test/prefab-furnishing.test.ts`, `73d5b2d9` on `codex/review-gate-cottage-d1`) was run against the fix and not kept: the builder read the [test diet](tests.md#tests) as having no exception for view code, so the sphere-against-box clearance in `src/place/sites.ts`, which runs for every building, is pinned by no test. Recommended: leave it off main, as the diet says, and let the 48-hour archive take the branch. Nothing waits.
- The reviewer's two passing host tests for garage step 3 (install orders and arriving steel) sit unmerged on `codex/review-garage-steel-spent` (`cf9f4235`); only the reviewed commit shipped. Recommended: leave them off main (the [test diet](tests.md#tests)) and let the 48-hour archive take the branch. Nothing waits.
- The rooftop route to the balcony, with plots 3 and 2 built (K3, 17 November, [report](../reports/town-k3-checkpoint.md)): the chain is closed to a walking second jump (plot 3’s roof to plot 2’s is 9.94 m against 7.4 to 7.9 m) and open by the figures to a sprinting one (12.6 m); nobody has jumped it. Recommended: accept, as the plan’s finding 7 and B4’s question 1 did. Nothing waits.
- A delegate's report does wake the heartbeat's thread (corrected 17 November, the 21:35 UTC run; the 20:35 run said it does not). At 19:40 UTC the gate cottage builder's early stop woke the thread, but the wake landed in a follow-up check's session, which read the report and started nothing, so the job sat 52 minutes. From 21:03 to 21:29 four such wakes took the same job from report to review, fix, re-check and ship in 26 minutes, without waiting for the hourly run; section 9 does not mention these wakes. Recommended: section 9 says a wake from a delegate's report acts on that job only (answer a scope question the plan settles, review, send the fix, ship) and starts no new job; no extra scheduled check is needed. Nothing waits; the heartbeat acts on such wakes this way until he says.
- The heartbeat starts one job an hour while three may run (17 November, the 13:35 UTC run's workflow review): after C2 merged at 12:58 UTC nothing ran for 40 minutes, with two free job slots and the machine at 3% CPU, because section 9 lets a run start exactly one next step and only when no P1 row has a job. Again after K1 merged at 14:12 UTC: about 30 minutes with nothing running until the 14:35 run started K3, and garage step 3 (a different P1 row, no shared file with K3) still waits for the next run. A third time after K3 closed at 16:10 UTC: about 30 minutes idle before the 16:35 run started garage step 3. Recommended: a run may fill the free slots, one job per P1 row, when the jobs share no file and at most two are browser-heavy on HOTBOX (rule 4). Nothing waits; the heartbeat keeps to one until he says.
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
- **Earlier unresolved calls:** (the DESIGN.md text and the agent-instruction drafts were applied on 16 November) ([step 8 report](../archive/plans/server-owned-players-step8-report.md)); settle the earlier after-the-fact independent reviews; level-pacing's "should the cart ever be ridden" (no), "are the yards still the drop box you mean" (yes), the resident's wagon line (not now), and suspect copy "No line beyond yet", "Needs the powered pick", "Stop requested".

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

- **Tidy:** last full pass 17 November 2026 (HOTBOX). Code: simplify covered `72b79c3f3..5fa88131` outside `src/sim`, `src/world`, `src/net`, `src/ecs` and `server/` (#2022, #2023, #2024); **last code pass end `5fa88131`**; those high-risk areas were not simplified for this range and want a pass with an independent review. Architecture and docs: reviewed through `5fa88131`, no new findings, AR-2 still open (#2025, [report](../reports/tidy-2026-11-17.md)); the tidy restored the gold-outline P2 row that left with the town row. Weekly agent-calls review: 17 November, 1 open call (flags 1, [ranking](../reports/agent-calls-review-2026-11-17.md)); the review page was not republished. Memory: 17 November (the "a good model" rule moved to models.md, #2021). Debris: 17 November (2 merged `ship/*` branches; `ship/matias-franco-97aed0d`, two weeks old with one unmerged research commit and no PR, left for the owner).

## Rules learned

The lessons; the orchestrator keeps them.

1. Never run `ship-queue` through `| tail`: it hides the exit code. Log to a file, grep narrowly (`ship-check|error|rejected`).
2. A test that spawns git under the pre-push hook inherits `GIT_DIR` (fixed in #1601: `test/helpers/scratch-git.ts`). If every worktree says "this operation must be run in a work tree", check `git config core.bare`.
3. A rebased branch is pushed under a new name, never force-pushed. A branch with merge commits can't be rebased by `ship-branch`: squash it onto origin/main on a new branch.
4. About three full-suite agents is a machine's limit (the Mac's, measured; HOTBOX's is untested); briefs ask for typecheck, lint and touched tests only. HOTBOX: two looks at once at most.
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
16. Before telling the owner he played, check the room: a tab the orchestrator left open on boogle.club logs as play sessions under the default name (the `freight-running-gm82nj` sessions on 12 November were the orchestrator's pane). The orchestrator's own browser checks log the same way.
17. The owner's earlier words are often in `docs/brainstorms` and `docs/plans/town-layout.md` under his own term (he says "rotunda" for the Roundhouse): search those before saying something is not in the plan.
18. A probe that copies a test's fuzz must reproduce the test's own printed figures and ask rate before its numbers are used (HOTBOX's probe threw away two asks in three and every wait figure for a day was low).
19. A bound proven on a test's own seeds is not proven: try 24 to 48 seeds and the long length before telling the owner a limit holds. Leg 1's 1,400 held on four seeds and is 1,553 on 48.
20. When a gate fails, the designer restates it only where it measured the wrong thing; after two rounds the question goes to the owner as a choice.
21. An agent must not edit files while its bot run is in flight (the edit reloads the page under the bot). Read a bot run's `verdict.json` yourself rather than waiting for the agent to say.
22. A rule test that calls `apply()` proves the rule, not the path: every new op needs a host test that sends it as a real `r:edit` (the server stripped `leg` and `id` from three v32 ops and nothing noticed until a reviewer pressed the prompts). A review of sim or server code drives a real server at least once.
23. Reviewers must exercise what the builder did not: dwell before acting, press every prompt, walk every stair, hold a phone upright. Each of today's blockers was outside the builder's own captures.
24. A hidden browser pane has zero size and the game waits for a drawable size: give the pane a size (`resize_window`) before judging a boot slow.
25. A smoke failure on the server's source commit right after a server-path merge is usually the race with `deploy-server.yml` (19 minutes on 17 November; smoke waits 24 since then): check that the deploy finished and `/version` shows the commit, then rerun the smoke.
26. A change to label or layout costs must be diffed against main for the states most rooms are in (the pre-rivet maps), not only the new state.
27. After a ship lands, the next queued branch was checked against the old main. When two branches touch neighbouring code (v45 renamed a helper the meadow used), re-run `node dev/ship-check.ts origin/main HEAD` on the second after the first lands, before shipping it.
28. `dev/codex/run.ts review` takes `--ref-branch` only; `--base-ref` is for tasks.
29. The heartbeat's STALLED mark on a Codex job is often false (low CPU while waiting on the model): check `.look/codex/<topic>/events.jsonl` mtime.
30. `npm run server -- reset <room>` resets a room (backup first); the owner asked how, for future playtests.
31. Tell builders to commit at most about 16 curated stills, 1200 px wide, a few MB, and keep raw dumps and clips local under `.look/`; one brief that said "keep evidence in the repo" produced 119 MB (16 November).
32. A branch that changes test assertions or fixtures is refused by `ship-queue` without `--reviewed`: send it to review before queuing.
33. Asset work on HOTBOX needs `BLENDER="/c/Program Files/Blender Foundation/Blender 5.3/blender"`: Blender is not on PATH and `dev/assets/build.ts` and `inspect.ts` default to the Mac path.
34. A thread that ships a job and ends leaves its "Jobs in flight" row, backlog row and plan line stale, and the stale row blocks that backlog row for every other session (C1, 17 November: merged 10:35 UTC, still claimed an hour later). The session that sees the merge deletes the row.
35. A view brief says two things or the review finds them: no new unit test files (rule 7), and a solid that switches on must first move a player standing in it (garage step 2, 17 November: both came back from review and cost a 16-minute fix round). Name the shared clearance for it, `src/place/sites.ts` (the player's two body spheres against each solid box, since #2034), and say "use it, do not write another": the gate cottage builder wrote a widened rectangle that moved a player standing 0.40 m outside a wall, and the review, fix and re-check cost 25 minutes (D1, 17 November).
36. A brief's "no new unit test files" (rule 7) must name the exception when the plan step is a host test: say which existing server test file takes it (K3, 17 November: the builder stopped "rather than add the forbidden host test", and the step needed a second job an hour later).
37. A cancelled CI run on main with no newer run is a timeout, not a superseded run: read its job times. `npm run heartbeat` now says NO VERDICT for it (17 November: two server-job timeouts went unseen).
38. A pre-push refusal whose log names no test: rerun `node dev/ship-check.ts origin/main HEAD` in that worktree with its output in a file, and run no other suite on the machine while a ship's check runs (garage step 3, 17 November: two refusals and 45 minutes from the reviewer's verdict to main; the first was `test/prefab-dynamic.test.ts`, whose likely cause, NTFS file ids rounding as numbers, is fixed in #2028; the second ran beside the heartbeat's own unit run and left no error).
39. A brief's "no catalog entry" must say wire or persistence catalog, and a view brief's file list must include the records the plug-in contract requires: `src/content/prefabs`, `src/content/levels` and the compiled JSON from `npm run prefabs` (gate cottage D1, 17 November: the builder stopped before any edit and the job lost an hour). Tell a builder to list every scope wall in one report rather than stop at the first.
40. A brief that adds a prefab builder or level names the hand-kept lists it must join and asks for the full `node dev/ship-check.ts origin/main HEAD`, not `--unit-only`: the stub builder maps in `test/prefab-workshop.test.ts` (two), `test/prefab-gorge.test.ts` and `test/prefab-leg2.test.ts`, and the record lists in `test/prefab-portability.test.ts` (D2, 17 November: the builder’s `--unit-only` check passed 50 of 50, the ship was refused with 143 failures of `missing builder town.green-kerb`, and the review found the fifth list; a refused ship and a fix round). A mesh laid on the terrain is checked against every far-ground level (`LEVELS` in `src/place/far-ground.ts`): the coarse ground stood 0.29 m above the green.

## How merging works

`npm run ship-queue -- <worktree> --wait [--reviewed "<stamp> <who, what they found>"]`, in the background, one branch after another ([orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md), "Merge"). The gate prints the stamp it needs. It finds Node 26 itself. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

On the Mac `../boogle-trusted/node_modules` symlinks to the main checkout's node_modules, and an `npm ci` there empties it; on HOTBOX it is its own install. Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

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
