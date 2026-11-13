# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 13 November 02:45 UTC (12 November 18:45 PST), in the 12–13 November orchestrator session (started 11:50 PST; hourly heartbeat; the owner has not said when it ends, so wind-down is assumed for 11:30 PST on 13 November). Main is `7b8e11017`, world v32, CI and deploys running on the last two ships. Normal mode (Claude only) until 13 November; withCodex after.

## Links

- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [Ring Island build 2](../plans/ring-island-build2.md), [slice 5 town economy](../plans/slice5-town-economy.md), [greybox route](../plans/greybox-route.md), [campaign outline](../plans/campaign-outline.md) (hub towns), [remote runner](../plans/remote-runner.md); the ECS migration is done.
- [Production core](../plans/production-core.md), [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Open calls page (version 6, all 14 questions answered): https://claude.ai/artifact/MQizAujJpyybXc7fL7Fw3W
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Where the work stands

**Status at 13 November 18:45 UTC (read this first; paragraphs below are older and may be superseded).** Mode: withCodex. `WORLD_NS` is v40; next free v41. Main is at #1734.

*On main on 13 November UTC, newest last (each reviewed independently where its stamp asked):*

- Owner-call records #1694–#1715; research docs #1704, #1707, #1716 (dev saves and stage jumps, engine long term, ECS alternatives live); ECS-facade and input lint rules #1701; simplify pass 1 (d7fb4d713, reviewed up to 1b6d7a93f for its areas).
- Railway: fourth car (v33), Ring Island foot crossing #1712, train spacing with six trains and the Ring Island hold (v34), leg 1 step 5 seeds and bot, leg 2 massing, the lost-ask fix #1723 (v35; leg 1 playable end to end by bot), stack-head lever plaques and order #1725.
- Home flip: F1/F2 #1721, X1/X2 #1729 (v36): layout B is the only Home, `?home=` is gone, hall treads, spawn faces the open bay. Generated world pages now cap numbers at three decimals (a Linux/macOS byte difference failed CI once).
- Prefab data ([plan](../plans/prefab-data.md)): steps 1–3 #1726 (six review rounds on the collider scale rule), step 4 #1727 (High Gorge north platform from compiled records).
- Server-owned state ([plan](../plans/server-owned-state.md)): steps 1–2 #1722, step 3 #1730 (30 rail tunables, v37), step 4 #1732 (live roster, v38; 3 s per-player rename limit, coalesced roster snapshots), step 5 #1733 (seven classic states retired, v39, 12,455 lines), step 9 #1734 (classic lockstep transport deleted, v40). Steps 6–8 are skipped (owner chose Retire). Checkpoint B (`npm run check:full`, a two-device play of join, reconnect and restart) is not done.
- CI: eight balanced unit shards #1724; smoke waits up to 12 minutes for the server deploy #1731 (passed first time on #1732–#1733).

*In flight:* prefab step 5 (lint rules that force placed content through prefab records) on `codex/prefab-data-step-5-4`, in its sixth review round; it needs a rebase after #1734. Design fixed by the orchestrator: an importer COUNT ratchet per construction export, not a full edge list (the full list was 23,539 edges and reached `engine`, `entity`, `physics`); importer swaps and reflection are accepted gaps.

*Next:* seats and The Boogler off the lead tab (owner: right after server-state); Home flip R1–R3 (the Round's first step; the gate cottage opens empty); prefab steps 6 on; the engine decision (Bevy ECS in Rust, needs Rust installed and the owner's go, or checked Becsy) is still the owner's.

*Owner calls made on 13 November* are in [owner-calls](owner-calls.md) and the decision logs: playtest before bespoke functionality; pre-playtest list; one live game with fast-forward instead of jump-in rooms; development is live (not a live-service game, no flags hiding unfinished work); save resets never block development; no ship holds for online sessions unless he says so; engine foundations first; retire the seven classic states and move authority now; Home flip and prefab steps approved.

*Open for the owner (13 November):* where players cross line 1 at Home's terminus (the walking plank at s 30 now lies on grass past the island's end, P3); the lighthouse frisbee prop is gone and nothing gives a frisbee (P3); the classic island lost its Section plaques, signs and track machine (P3); the proposed DESIGN.md sync-table text in `docs/plans/server-owned-state-step9-report.md` is his to commit; who may replace a room, and going back (fast-forward build held); fender on every line or the Ring Island halt only; Bell Rock cut and incline tunnel; suspect placeholder lines: "Request stop: to <end>" in all its forms ("to Camp", "to Far Head", "to Village", "to Stack railhead"), the Steel car tile strings, and the archived "Opening day happened while you were away".

*Leftovers from 13 November (ranked):*

- P2 harness: `reconnect-edit`'s last assertion (rewritten in #1734) can fail in an idle room when two tabs never sample the same server step; it passed on rerun. Compare the latest stable sample or trigger a shared change first.
- P2: Ring Island walk to the lookout fails about 60 m north of the platforms. P2: the workshop chair's sit pose faces the wall.
- P3 tooling: the Codex broker's net and world-inputs harness is stale (imports deleted files; with `--url` its `roomHost` is a stub); run `npm run test:net` in the worktree instead (140/140 on #1734).
- P3: a seated rider is stood up when the lead tab changes (goes away with server-owned seats). P3: a swapped-out held item disappears instead of dropping. P3: the follow camera goes inside a standing train on Home's island; canopy posts and the map board stand on the deck's centreline. P3: `dev/look/evals/railway-works-at.ts` and `railway-works-act.ts` hold old-Home coordinates.
- P3 docs: stale text after the retirements: `docs/game-design/haul.md`, `docs/game-design/net.md`, `docs/atlas/stories/opening.json`, comments citing deleted files (`src/features/acts.ts:13`, `src/net/ws-room.ts:5`, `src/features/syncsafety.ts`, `src/pois/lighthouse/index.ts:34`), `.claude/skills/new-feature/SKILL.md:16`, `.claude/skills/look/references/scenarios.md`.
- Not started: simplify pass 2 over sim, net and server; Sit before Request stop; the small fixes (Boogler bubble distance, cosmetics fit, the "Connecting to the railway" toast); the playtest guide; the failing long weekly job; worktree housekeeping (48-hour archive rule; due from the evening of 13 November).

**On main since 17:30 PST on 11 November (12 November UTC, newest last):**

- #1622 rail kit levels and split rings. #1623–#1626 M13e–M13g close the ECS migration. #1628 the `?home=b` boot crash. #1630 the adapter's clock is `adapter.read.tickNow()`.
- #1633–#1636: campaign outline fix, slice 5 plan with design review, the breaker prompt fix, R5b (both Ring Island jump-ins). #1638 greybox route plan. #1639 the owner's 14 answers. #1640 slice 5 stone-stop ruling. #1641 slice 5 R1+R2 (v28). #1642 greybox leg 1 step 1. #1643 hub towns decision. #1644 market hub; #1645 its answer. #1646 economy-stops ruling. #1647 greybox leg 1 step 2 (`src/sim/railway-route.ts`).
- Since 07:00 UTC: #1649 host hotfix (every room socket has an error listener, typeof checks, dropped count in status). #1650 slice 5 R2b, the Quarry stone stop (v29). #1651 Wall and Bell Rock design rulings. #1652 slice 5 R3, riders and fares (v30). #1653 greybox map rails and the economy model on the ruled route. #1654 Fares paid landing. #1655, #1656, #1658 greybox leg 1 step 3 design rulings. #1659 step 4 design answers and catalog positions. #1657 the ride-home fix (carry keeps the deck you ride; the parked track layer is stowed once Q7 is laid).

**Owner decisions, 12 November UTC** (all in the log): the 14 answers ([core loop](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered), [rail](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered), [town economy](../decisions-rewards.md#d-2026-11-12-town-economy-answered)); hub towns (Home, Ring Island, High Gorge, Canopy Town, Port Quay; the others are sources: [entry](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight)); the market hub at Bell Rock, built out in stages ([entry](../decisions-rewards.md#d-2026-11-12-market-hub-answered)); the seed-fixture regeneration call (owner-calls).

**On main from this session (12 November 19:50 UTC on, newest last):** #1671 ship-check runs the registry check on every diff. #1672 Ring Island build 2 (v31). #1673 the owner's ten answers ([rail](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered), [rewards](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered), [shared pool](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool)). #1674 the designer's gate 5 and 9 rulings. #1675 greybox leg 1 step 3 (v32; two independent reviews, four P2s fixed; HOTBOX's suites green). The [garage install-moment plan](../plans/garage-install-moment.md) with its design review. #1677 the server keeps `leg` and `id` for the leg's three ops, and the position bound follows the route catalog (`railPos`, `RAIL_POSITION_MAX` in `src/sim/railway-route.ts`). #1678 leg 1 step 4, the views. `d295602ef` the garage's G1 to G3 (the works copy on today's table, the real Install). `895700ca0` step 4b's maps. `7b8e11017` the garage's G4, G5 and portrait camera rows.

**The wait limit (owner, 12 November):** he picked "A looser rate for the greybox" ("waits up to about 2 minutes 15"). Leg 1 then measured worse on 48 seeds than on the gate's four: settled worst 1,553 (heavy asks) and 1,535 (light), 7.2% and 3.0% of waits over 1,050; whole leg worst 1,548. It shipped under the 1,600 cap only, on the orchestrator's recommendation, logged as [call 109](../agent-calls.md); **his to keep or reverse.** Train spacing: candidate A dies on main's stages (a passed ask waits 340 to 380 ticks extra against 250; the lamp goes out); candidate B (a Ring Island hold, on 15%, cap 200) cuts light settled 3.0% to 0.4% and does nothing under heavy asks, so by the designer's rule it is not built; the plan's next step is the short turn, which needs its own plan. Sheets and harness on `scratch/spacing-e0`, `-a`, `-leg1-e0`, `-leg1-b` (pushed; never merged). The train-spacing plan does not yet carry these results.

**Owner's word, 12 November: "Don't hold any ship".** v32 shipped without waiting for his play sessions. Asked whether that retires the 9 November mid-session rule for good; no answer, so it is read as that day only and AGENTS.md's line stands. _13 November: he answered, "don't ever stop deploying a change because you see a session online"; it is standing, see [owner calls](owner-calls.md#save-resets-never-block-development-or-architecture)._

**Nothing is running.** HOTBOX is idle (its `wip/greybox-leg1-step3` and `greybox/leg1-step3-v2` are superseded by main; keep 48 hours). Its evidence is in `C:/Users/matia/boogle-evidence/`.

**Next, in order:** leg 1 step 4b's rest (Ring Island's own map table, kit cars' number boards, the joining train's scale-in and board marker, the kit's hop to the rack, the `STEEL KIT` plate); the fourth car (the next Ring Island step: it moves line 2's stop mark, a rules change with its own bump); the short turn's plan; leg 1 step 5 (the bot segment and catalog stages, replacing `dev/look/stack-seed.ts`); record the spacing results in the train-spacing plan; Ring Island R6 docs; a frame-time pass and device run ([owner call](owner-calls.md#frame-time-60)).

**Open owner questions** (each proceeding as stated):

- Call 109 above: keep leg 1 live under the 1,600 cap, or hold it for train spacing.
- Is 2 min 20 inside "about 2 minutes 15" (call 105)? Moot while call 109 stands.
- After the rivet, should the footing wagon's train stop for stone (call 108)? Today one of line 2's three trains never takes stone, so loads come 2,884 ticks apart.
- The shared pool: does it replace "a yard at each halt, taken where it lies" for upgrades, or only cover what trains have carried to a hub ([entry](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool))?
- "Don't hold any ship": that day, or for good.
- The garage: the plain grey post's prompt is gone at today's table (the designer ruled it needs no owner; shown to him); `test/garage-geo.test.ts` is a feature test kept as a diet exception until the Home flip; the frame as built (barrel lower left, player in front of the buffer).
- The maps: the leg is drawn at about 30% of true length so one map holds the line; the Home island shrinks after the rivet and names carry leaders. His call whether that trade is right.
- Suspect copy: "It runs faster and pulls one more car." (no fourth car yet); "Look at the engine" with the boiler ready; "Railhead" beside "Stack railhead"; every leg label in step 4's as-built list.
- Train spacing's plan questions 2 and 3; the session's end time.


**Rules learned** (the lessons; the orchestrator keeps them):

1. Never run `ship-queue` through `| tail`: it hides the exit code. Log to a file, grep narrowly (`ship-check|error|rejected`).
2. A test that spawns git under the pre-push hook inherits `GIT_DIR` (fixed in #1601: `test/helpers/scratch-git.ts`). If every worktree says "this operation must be run in a work tree", check `git config core.bare`.
3. A rebased branch is pushed under a new name, never force-pushed. A branch with merge commits can't be rebased by `ship-branch`: squash it onto origin/main on a new branch.
4. About three full-suite agents is the Mac's limit; briefs ask for typecheck, lint and touched tests only. HOTBOX: two looks at once at most.
5. Default shell is Node 24: export Node 26 (`$HOME/.nvm/versions/node/v26.13.0/bin`). Run tests with `node dev/test-unit.ts <files>`, not `npx vitest`.
6. Keep independent reviewers: they found real defects in batch C, the CI diet and ring2 R1–R2.
7. New test files need review and must fit the [test diet](tests.md#tests); briefs say "no new unit test files" unless the code is lockstep.
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

23. A rule test that calls `apply()` proves the rule, not the path: every new op needs a host test that sends it as a real `r:edit` (the server stripped `leg` and `id` from three v32 ops and nothing noticed until a reviewer pressed the prompts). A review of sim or server code drives a real server at least once.
24. Reviewers must exercise what the builder did not: dwell before acting, press every prompt, walk every stair, hold a phone upright. Each of today's blockers was outside the builder's own captures.
25. A gate proven on the test's four seeds is not proven (rule 19 again): leg 1's 1,400 held on four seeds and is 1,553 on 48.
26. A hidden browser pane has zero size and the game waits for a drawable size: give the pane a size (`resize_window`) before judging a boot slow.
27. The smoke test gives up after five minutes and the server deploy often takes six: a smoke failure on "server deployed source commit" right after a server-path merge is the race; rerun it once the deploy is done.
28. A change to label or layout costs must be diffed against main for the states most rooms are in (the pre-rivet maps), not only the new state.

**Peers.** HOTBOX is the owner's Windows desktop; its peer session since the 12 November restart is "Reconnect with orchestrator and resume work" (the owner confirmed it, 12 November; SendMessage by that name from ListAgents; delivery is never confirmed but it answers). The old session "Orchestrator coordination for development" (`bridge:session_013GeHMBXhojhecCo8EUn8eh`) is offline. It shares the build load ([owner call](owner-calls.md)). D3D12 looks run there with `LOOK_CHANNEL=msedge`. `gh` and ffmpeg are installed there.

**Housekeeping.** Cleared at wind-down (12 November 19:00 UTC): 84 clean, fully merged worktrees with their branches, and every landed branch with no worktree. Left, 41 worktrees and about 80 branches: `ring2/v3-garage` (build 2, keep); the unmerged `review/*` test branches (`review/ring2-rules-tests`, `-r3-tests`, `-r4-tests`, `review/ring2-final`, `review/leaf-coop`, `review/m12e`, `review/m12b-1`, `review/unit-speed`), the `ecs/m12e`/`m12f` and `batch/1111-b`/`-c` worktrees, `feature/ring-r4e`, `ring2/before-rebase-2` and `-3`, `ring2/rules*`, `ring2/v1-works`, `ring2/v2-train` and about 20 one-commit `worktree-agent-*` branches: check each one's tests are on main, then archive-tag and remove once 48 hours old (from 13 November evening). Three with uncommitted changes stay for the owner (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`). The daily-job checkouts are never touched. The five `archive/review/*` tags and `archive/place` are local only.

**Leftovers from 11–12 November, by rank:**
- P2 (12 November evening): the request guard test is blind to `kind` on every op and to `rail.wake`'s `tk` (`server/test/railway-steel-host.test.ts`, the baseline subtraction): subtract the baseline from `railValid`'s reads only.
- P2: the garage on a phone: a real touch hold is untested; sound is unchecked on every capture; the race loser hears a deny and sees a second lift; a refusal's resync test was not run against the old code. Closed by F1/X1: the stand is radial at 85°, 6.5 m out, with its inner end outside the 4.8 m sweep; X1's garage view is still owed.
- P2: leg 1 step 4: the barrier is a red fleck from the stair's top landing and its plate is unreadable from the concourse; the legs' deck batch is never frustum-culled; the old heads keep their platform one section longer than the review said (step 3's `closesAt`).
- P2: the maps after the rivet: 18 of 37 faces have a name as near another stop as its own (each with a leader); "Village" beside Camp's dot on Far Head's board when a train covers Village; train markers cover the leg's end stops; the dim High Gorge is faint at phone width.
- P3: G5's puff sits above the chimney and the squash is invisible; readouts pass through in-between values after the drop; one frame inside the smokebox on leaving the garage (main has it by the code); Closed in X1: `test/garage-geo.test.ts` uses the sole station, with the sweep, install reach, landing and steel-car clearance assertions passing.
- P3: `server/test/railway-steel-host.test.ts`'s yard take ran 4.8 s against a 5 s limit locally; `legKitArrive` returns at the kit halt before the unload branch (matters only for a home-kit leg whose rack halt is the line's home halt); a late piece of P3 from the step 3 review: gates 8 and 9 on four seeds run only in the long mode.
- P2: Spotlight took the Mac to load 30 on 12 November (`corespotlightd` at 240% CPU); the owner may exclude `~/Developer/boogle/.claude/worktrees` (an agent must not change system settings).

- P1: leg 1's finished-line waits on 48 seeds: worst 1,553 (heavy) and 1,535 (light), 7.2% and 3.0% over 1,050; the 1,400 gate holds on the test's four seeds only (call 109). Train spacing: candidate A dies on main's stages (a passed ask waits 340 to 380 ticks extra); candidate B (Ring Island hold, on 15%, cap 200) cuts light settled 3.0% to 0.4% but does nothing under heavy asks; next is the short turn's own plan. Sheets on `scratch/spacing-*`.

- Closed in X1: the sole Home plants against frozen v35 exclusions. All 362 scenery trees retain IDs, positions and order; zero trees dropped. Starter-source and hardwood tables match. See [X1 proof](../reviews/home-flip-x1.md).
- P2: `railway-session.ts` is 573 lines against the 450 cap (needs a state object).
- Closed: the map JSON's stale rail heights (#1653, `c9906f458`/`d0b43a588`: rails written from the catalog, a test fails on disagreement). The Ring Island ride-home drop is fixed (#1657, `c37c555d5`).
- P2: the server has no last-resort crash handler and the rail step timer is unguarded (`server/src/index.ts:30-31`, `server/src/host/world-host.ts:482`, `src/world/sync.ts:391`). Classic rooms accept an array op and save it (`src/world/sync.ts` stamp).
- Closed: the parked track layer (#1667: no train reaches it at line 1 or line 2's frontiers; the Pier engine stops 1.65 m short). `test:net`'s one-off failures and the slow server tests (#1664; the new timeout message is unverified).
- P2: Spotlight (`corespotlightd`, `mds_stores`) burns CPU on the Mac, probably indexing agent worktrees; the owner may exclude `~/Developer/boogle/.claude/worktrees` in System Settings (an agent must not change system settings).
- P3: a rider at the front of the boiler stands inside the chimney model (no collider); a small dark square floats above the engine in every still; a rider dropped into the cab's solid parts is not carried (the cab floor carries). `test/kinematic-turn.test.ts`'s dynamic half only asserts "falls"; a kinematic body's Rapier mass now reads 1.
- P2: the headway hold never binds under lever asks (identical results at 75% and 0% on main).
- P2: the footing wagon's train never takes stone (slice 5 call 4 exempts it and nothing uncouples the wagon), so after the rivet loads come 2,884 ticks apart; whether the exemption ends once no footings are owed is a question for the owner (call 108).
- P3: "Bring logs or rails" family and install prompt strings are placeholders; the longer engine is hard to tell apart without a side-by-side; closed: steel's fourth car landed, and G1 made the garage tile read installed state (X1 retains it on the sole Home).
- P2: White Wall sections 437 to 850 m and both ending sections (865, 726 m) exceed the design review's 650 m guide; the designer rules before that leg is built.
- P2: how the ring's goods reach Bell Rock (open design item).
- P2: Port Quay's rotunda and the engine sheds are decided (10 November) but not drawn in map data.
- P2: town prices were tuned for six hours, not re-run for four to five.
- P2: frame time is unmeasured for every perf change of 11 November; nothing tested on a device. Other evals may wait in page time (q6, the cart waits in `bots/railway.ts`).
- P2: nothing audits the T3 and stack physical probes since M13d. The wing is not solid and has no level check. The notify lane sits over Drop at 568x320, and Toss is off-screen in landscape. A red pre-deploy boot skips `recover` and opens no issue.
- P3: the avatar is drawn face-to-camera on a jump-in landing though its node faces up the line (pre-existing).
- P3: the load check accepts a train standing at a line's end on the un-turned track, which then never leaves.
- P3: Works seeds drop Q5 logs on the breaker pedestal (`seed-route.ts:181`). A 0.7 m dip at the Q2 trestle abutment. The bot `earlyLedge` branch is untested.
- P3: `npm run perf` cannot take a pose or a production build; level-check cannot take planned positions.
- P3: the seat and workshop are on the old wiring; seated-rider is still never taken.
- P3: the `boiler fit` check rejects a fitted boiler with an empty bay; relax it when something first spends `Shed.steel`.
- P3: the drawn longer engine is 6.7 m ahead while `TRAIN_EXTENT.aheadCm` is 820 (the views step reconciles).
- P3: 14 evals "unknown" and `double-jump-action` is a delete candidate.
- P3: Ring Island's ground is about 101k triangles at the island; `bloom.ts:13` re-sets its size every frame on a canvas under 64 px; `src/proto/greybox` precompiles without awaiting `drawable`.
- P3: the gifts, piles and mushrooms adapters have no unit tests; `toeShove` has no sideways bound; lint skips `server/`; the halt map at phone size is the owner's look.
- P2: `backOf` in `dev/peer-test/ws-railway.ts` and `mark()` in `dev/look/bots/railway.ts` still own shapes.
- P2: R5: the standing rider over the bow, a two-player run, the plan's `ring-glide.ts` eval and perf runs.
- P3: Ring Island's ground wants its own LOD distances; far-ground tiles build at land load, cost unmeasured; the far ground's seams at 180 m and 420 m are unchecked on a phone. A canvas collapsing to 0x0 mid-game is untested.
- P3: `reconnect-edit`'s "landed" check proves the roster changed, not that it was the held edit; `dev/codex/look-broker.ts:56` has a dead `--regenerate` entry; the trusted broker needs a relaunch for M13c's change.
- P3: the lighting wedge's play-distance camera hides Buddy at the spawn; the `__placeDone` and `--place=` names remain.
- P3: `ship-check`'s walker misses a path passed as a function parameter (the UNFOLLOWED gap); `ship-check` reported 0 affected tests for a new test file.
- P2: `dev/look/restore-pair.ts` and `look --at` restore checks still import Place (M13e).
- P3: the Talk prompt during an act card is untested; a stall cue's clear on reconnect is unverified; the cart at `trains-on` parks underground on the baseline too.
- P3: the pennant is untested beside a real train and from Home's shore; the "mayor" comment in `src/place/folk.ts` is stale.
- P3: `rewardBusy` is separate from `momentBusy`; the adapter exposes `tickNow` twice; Q7 `started` is untested at the seeds.
- P3: the halt map at phone size (names small, the hold badge reads as the Pier's, the glider icon crowds "Quarry").
- P3: the live smoke after #1610 timed out reading the server's commit; the next four passed.
- P3: stutter during the arrival fall through the clouds "until it jump in", again on a fresh reload; curio shelves "weirdly at angles" (owner picked layout A). Ball throw: extremely low priority (owner, 10 November).
- Bot queue: a served look session held the slot for 47 minutes, and 44 runs sat on one slot at 22:00 UTC on 9 November. Sessions must open, capture and close; ask for one proof look per fix, no "before" capture where the code already shows the bug, and withdraw lower-rank looks when P1 proofs are waiting.
- Water: the owner's from-scratch rebuild request (no Ultra baggage, flat underwater tint, light shallows and foam kept, Mario Odyssey/Sunshine range, seabed following terrain; archive tag `archive/water-ultra-2026-11-09`) is unverified as complete; check against the water rebuild (#1354).
- Parked (owner's build-order call): R4d's breaker carried at the rivet, the whistle bark and rivet toss, and a sim-side early-strike guard (needs a field and a bump).
- Unverified on GitHub: the automerge `--touches` step, the bisect.

## How merging works

`npm run ship-queue -- <worktree> --wait [--reviewed "<stamp> <who, what they found>"]`, in the background, one branch after another ([orchestrate skill](../../.claude/skills/orchestrate/SKILL.md), "Merge"). The gate prints the stamp it needs. It finds Node 26 itself. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` symlinks to the main checkout's node_modules; an `npm ci` there empties it. Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

## Leftovers

- **10 November:**
  - **Ring Island gap, measured (step 0, #1443, eval fixed in #1446):** the "2.0 m past the model" reading was an eval artifact (the landing was recorded after more sprinting). Rerun: apex u 276.4 (model 276.4), late press u 278.7 (model 279.3), so only a glide crosses. A braking train's kept carry did cross in review, so trains ease into the end stop at 2 m/s² (`RING_END_BRAKE_CMS2`). The last bent's ramp walks in 11.2 s against a 10 s bound (P3). The greybox hook ring is scenery, so the hook from the brace platform is measured in R4b.
  - **R2a's cost:** with the island's provider the coast texture is 13.9 MB (6.3 MB today), not the plan's estimate; R2b measures it at the phone tier and updates water.md.
  - **v26 worst waits (4a):** 27–49 s at most halts, 60.7 s at the Quarry down and 71.4 s at the Pier when four request stops are served meanwhile. The first bound (600 ticks plus 110 per request stop) tested nothing; real worst waits are 91–97 s. Orchestrator's call: v26 keeps two trains and fails over 1,050 ticks; the one-minute goal moves to v27. The headless loop's footing laps are 2:59 for two (it never rides); 4b's bot gives the real number against 10 November's 1:45.
  - **Long job:** on command only (owner, 10 November). Its last run, 10 November 07:40, failed before playing on `gh auth status` ("The token in keyring is invalid"). P3: retry the auth check or play and report locally.
  - **Pause wardrobe (#1448):** on main. Not tested on a device; a real train seat, a shared cutscene and reduced motion are unchecked. The "new" dot (step 3) is not built. The decision index was not updated (its routing budget is full).
  - **Schedule (owner, 10 November):** launchd runs only `scenarios`, Sundays 03:30 (next 15 November); the long, atlas, patch-video and perf agents are removed. The last scenarios verdict is red (machine load, triaged), so risky ships need `--nightly-known` or a fresh `npm run daily -- scenarios`. Run perf by hand in the circumstances the owner call lists. `atlas --check`'s 8 stale citations wait until the owner turns atlas back on.
  - **Nightly jobs (triaged 10 November, no game regression):** scenarios and perf failed on machine load at 02:50–03:30 local (1-minute load 12–32; all five failed scenarios pass on a quieter machine); what loads the Mac then is unknown (Spotlight is a suspect), and perf's `evidence.json` now records the busiest processes. Atlas and patch-video stopped on the Codex usage limit (back 12 November 02:20) and now report `skipped`. `atlas --check` still has 8 stale citations in `docs/atlas/` for the next Codex atlas run. The throw prompt was already hidden on 9 November (30381ae38, the owner's call). Not verified: the skip path end to end, and a valid perf night.
  - **Level check:** it measures reach from the line's centre every 2 m, so it misses jumps from the deck's edge (one jump onto p2 from s 94–97 already works). Its hook-walk standing places turn on once line 2 is laid over s 84–92, earlier than the game does (Q2, s 122).
  - **Up-track bed edge:** still 0.25–0.89 m in about 11 m of each line (trestle and ramp ends, the Village merge s 40–45, line 2 s 307).
  - **Bot detour:** the B8 bot's Far Head detour is probably unneeded now that the ground is banked.
  - **Shadow on/off stall:** turning the sun's shadow off and on stalled 3–21 s in a direct probe (10 November, on a loaded Mac), seen with and without the toon lighting since removed; benches missed Home's timing sample right after the switch. Phones turn shadows off on the detail ladder, so bench it on a quiet Mac and a phone.
  - **Rooms:** a room whose disk never answers still refuses joins and holds a hosted-room slot. Shutdown skips a room that `offline()` is closing; the 8 s hard exit covers it.
  - **Smoke rooms:** `smoke-node-N` keep their names across `WORLD_NS` bumps, so an old save that won't load fails their close every week. Resetting them is an owner call.
  - **Pages deploy:** `actions/deploy-pages` timed out twice for f8576e65 (15:18 and about 15:40 UTC) and the site lagged the server. The smoke then fails on a build mismatch; wait for the site before treating it as real.
  - **v25 notes:** a rider beside the line near a passing train can ring the bell cord (the reach is about 37 m at cruise); the quarry is a service stop whenever the pier still needs footings, so a short dwell can happen with nothing to load.
  - **Ring Island:** a strong swimmer can skip the glide (about 15 s against 2.5 s); accepted. Untested: the hook from the water, and a swimmer walking out at the last bent.

- **Pages deploys still hang:** twice more on 10 November (03:00 and 03:06 UTC). The server restarts first, so until the site deploy lands the smoke test fails on a build mismatch; cancel the hung run and the queued one goes. From 10 November 03:20 UTC the deploy step fails after three minutes instead of ten, so the workflow's own `recover` job retries; unproven until a hang meets it.
- **Production resets of `rail-v23-boogle` on the owner's word (peer session):** 02:04 UTC (1 player kicked, backup `rail-v23-boogle@20261110T020452261Z.json`) and 02:51 UTC (empty, backup `rail-v23-boogle@20261110T025116035Z.json`). Both predate the reset feature, so players landed in town.

- **Owner playtest notes, 10 November about 02:40 UTC (live build, desktop):**
  - P3: "due to proximity of e to open, i was able to open the mossy scarf chest from the ground instead of on the platform". The chest's open reach ignores height; it should need you on its platform (vertical limit or a reach test from the platform). Not started.
  - P3, with an iPad screenshot at the gorge: "the bridge is longer than it needs to be and it's narrow to walk around when i cross. it can be made nicer". The footbridge overshoots both banks; shorten it to the banks and give each end a proper landing with room to pass. Not started. (The same screenshot is the first real-device sight of the new water: shallows, foam lip and caustics render on iPad Safari.)

- **Ball throw:** extremely low priority (owner, 10 November); it comes back with the old island.
- **Pages deploys hang in `actions/deploy-pages`** (four times on 9 and 10 November, twice in a row at 01:36 and 01:44 UTC). Cancel after five minutes and rerun; the site stays on the previous build meanwhile, which also makes the smoke test fail on a server identity mismatch. After the playtest: rerun `deploy.yml` on main.
- **Flaky server test:** "SIGKILL during checkpoint replacement restores a whole checkpoint with every unit conserved" failed once in CI on a branch with no server change (F2, #1340).

- **Glider B nits** (second review, 9 Nov): `forge-call.ts` line 66's comment and the plan's "NaN scale" sentence are wrong (a zero-length line returns a finite distance); the reach host tests bracket the glider's window without pinning its edges (±1 cm at 320/321 across, +300/+301 above, −220/−221 below); the v23 history line in `namespace.ts` credits the 24-rail cart, which shipped under v22.
- **Smoke "bye":** the live smoke failed twice at 23:49 and 23:51 UTC on 9 November with `WebSocket timed out: ["bye"]` (the server answering "restart") and passed by hand at 00:05; the same happened at 22:53. Find what restarts the server after a Pages-only merge.
- **Pier halt review nits:** footings hop 11 to 19 m in a fixed 0.9 s; `MACHINE_GAP` and the parked setback are copied into the test, not imported; `split-rock-roundhouse.md` still pins 730 m.
- **Draw calls:** `buildStation` (about 20 meshes a station), supply stone piles (6 draws each) and Far Head's buildings are the next merge-by-material targets; hide small props past about 250 m.
- **Gifts in the live game:** the server refuses `gift.take` and `gift.toss`, so the deck frisbee can't be picked up and a touch "Grab" does nothing while holding one. Remove gifts from the live game or make them work in R3.
- **CI:** the `pull_request`-event CI runs on ship PRs show "action required" or failed (#1277, #1290) while the push and dispatch runs that gate the merge pass. Not investigated.
- **Pages deploys can hang:** the deploy for `824aeb94` sat in `actions/deploy-pages` for eleven minutes and blocked v23's site deploy behind the `pages` concurrency group until it was cancelled (`gh run cancel`). Don't ship docs ahead of a release someone is waiting on.
Small things jobs reported and didn't fix. Fold each into the next job that touches its area, and delete it here when it lands.

- **Home flow** ([audit](../reviews/home-flow.md)): the paper hat floats about 10 cm above the head; the telescope view is half sea with the pier just off its right edge; the log rack beside Q6 at Far Head reads as clutter. Check what glider B's Home flow batch fixed before queuing these.
- **Split-rock Works (J4):** the kiln mouth is a flat peach square and needs a glow; particles reach about 440 a second at the pier. Suspect copy for the owner: "Take the breaker", "Strike the seam", "Fill the kiln", "Shoulder a footing", "Set the footing", "Fit the cradle", "Turn the table", "Help carry", "Let go", "Empty your back first".
- **Wagon, Pier halt and crossing (J5):** a footing trip takes about 2.5 minutes; about 2 ms extra GPU time at the pier; an orange-posted cart near the turntable that nobody identified; wagon performance unmeasured; the shunt wagon has no collider; the throat photo is badly framed; line 2 stops at every stop while footings are owed.
- **iPad:** the cart and rack don't draw, and rockets weren't seen (owner sessions, 9 November). Not reproduced on the Mac.
- **Ability pickups** have no particles. The **sea-gate camera** is hidden by pines.
- **`rail-seed.ts`** conflicts on almost every ship, because each job appends to the same lists. A table keyed by seed name would stop that.

## Queued

Older parked items, not on the roadmap anywhere else; check each against [direction.md](../direction.md) before starting it.

- **P3, overlap view for z-fighting (owner, 10 November: "a rendering mode that's like a level editor that can highlight the overlap"; ranked "P3 though").** A `?view=overlap` debug mode and Dev toggle: one pass stores each pixel's depth and object id, a second draws the scene flat grey and paints magenta wherever a different object sits at the same depth; hover names the two objects; looks can capture it at any spot. Later, the same coplanar check on every built GLB in dev/assets/inspect.ts (engine.py and passenger-car.py already check within one recipe). Test case: the passenger car's level boards through its tilted deck, fixed on 10 November, so revert it on a scratch branch.
- **P3, water question dropped from the board (10 November cleanup):** replace the 16 MiB sky cube with a gradient and cloud sprites? Owner to answer.
- **P3, cosmetics fitting pass** (owner: low priority, later): the conductor hat sits a bit above the head; the paper hat floats about 10 cm (Home flow leftover).
- **P2, Station 5's wait** (owner: getting rails to Far Head was "the longest grind"; he took rails by hand six times). After the 24-rail cart is live, measure the wait at the rim and have the designer judge it and whether the rack's status reads; the expected 80–125 s may still be too long.
- **Split the hot files, and start the bot from any seed (owner call "Workflow pass", items 2 and 6).** After glider B, F2 and jump-ins land, since all three edit these files: `dev/look/rail-seed.ts` as a table keyed by seed name; `dev/look/bots/railway.ts` (1,900 lines) by segment, each segment startable from its jump-in seed so `playthrough --from <stage>` works for every stage; `docs/game-design/place.md` (1,411 lines, 66 commits in three days) as one file per feature. Planner first.

From 5–7 November and not on the roadmap anywhere else, so kept here; check each against [direction.md](../direction.md) before starting it.

- **Great beam first build (owner approved 7 Nov):** after the track-chunk and pile-culling fixes land (they share railway-line.ts and sources.ts). Spec: docs/brainstorms/great-beam-clarity.md, first build then the rope drag; WORLD_NS bump.
- **Co-op abilities, option E (owner approved 6 Nov):** after R1b, the smallest first build on the double jump: finder-only card, a non-stopping flourish for everyone else (fills on landing if mid-air), a late joiner's flourish on first landing, a one-time apex prompt, and a greybox trophy plinth at Home. Spec: docs/brainstorms/coop-abilities.md. Touches src/render/reward-reveal.ts and src/entities/railway/tools.ts.
- **Owner's 6 November order (tool assignment clarified 7 November: Claude or Codex by task fit):** (1) replication R1a, railway replicated with no prediction, after slice 4 part 1 merges; (2) R1b, predicted mine, chop, take and drop, plus instant local feedback for waking the track layer and pulling levers (owner, 6 November: the wake felt delayed); (3) smaller track chunks (towards one rail pair per commit), shorter gantry beam; (4) track-layer seats working in the production railway (chairs are decorative today); (5) slice 4 part 2 (Q4–Q6, cart trip, pack chest, trains) on replication. Island throwing, mushrooms and frisbee wait for replication R3 (owner: low priority). Fly shared-cpu 60 Hz check approved by the owner as a staging deploy (separate app; never touch boogle-server).
- **Answered 6 November (end-of-day brief, https://claude.ai/artifact/9SG7GBxEgoChpamS3vCuvj):** ECS-shaped E, queued after R1b and before slice 4 part 2 adds more kinds; Fresh palette default (agent running); after the line 2 playtest: Split-rock Works (2D page first), the smallest Roundhouse, then the approved jump upgrades and gate puzzles briefs. Still open: the old experiment worktrees (recommend keep).
- **Paused world and away credit, after R1b** (owner, 6 November, [economy principles amended](../decisions.md#progress-and-rewards)). Code the approved amendments, each with its own proof:
  - stop simulating a room when its last player leaves, after a short grace for reloads (`server/src/host/rooms.ts` ticks empty rooms for `roomIdleMs`, 10 minutes);
  - replace R1a's offline catch-up (`server/src/host/world-host.ts`, "Catch up the time nobody hosted, once, for the funded job") with one away credit on the next join, filling each producer's yard `H × (1 − e^(−away/H))` hours (H a tunable, 2 h), never past the yard, and finishing the funded job;
  - keep the supply pulse's catch-up of up to 24 hours of regrowth and drop recovery (`src/sim/railway-supply.ts`), because it guards against lockout; apply it on join;
  - bring the forge and depot cart into the away credit (`src/sim/railway-line2.ts`: "the forge and depot never produce offline");
  - retire or isolate classic's helper bank (`src/sim/bank.ts`, `bank.wake` in `world-host.ts`) with classic.
- **Playable 2D economy prototype, after the map layout is picked and the economy amendments land** (owner, 6 November: "With these 2D simulations, we should be able to simulate the entire economy to understand the flow of the upgrades, and what the game would feel like before building it in 3D"). A top-down HTML page on the chosen layout (`docs/world/map-prototypes.html` data), driven by `dev/economy/ring-data.ts` and `ring-sim.ts` as the one source of truth. The player hauls by hand, connects places, upgrades producers, spends the shared wallet and takes the order choices, in real time or fast-forward, with 1, 2 and 3-player modes, so the owner can feel the flow and the hand-versus-machine crossovers.
- **Visual pass stages 3 to 5** (lighting and sky, shadows, water, post and grade) after the palette and sky picks.
- **Room-owned time:** after T1; the evening look is on main behind `?evening=1`.
- **Brainstorm:** the telescope build-out.
- **Replay guide refresh** before the owner plays.
- **Framework and tool upgrades:** last.

## Open owner questions

Answered questions are in the decision log, not here.
From 5–6 November; drop each when answered.

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
2. **First-path verdict** on slice 3.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
5. **Museum:** inspect the miniature, the crystal specimen, or both.
6. **Worktrees left after the 9 November cleanup** (30 archived as local `archive/worktree/<branch>` tags, 39 merged ones removed): three with uncommitted changes (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`) and four recent ones (`claude/godot-assumptions`, `claude/glider-b-plan`, `claude/idea-land-ack`, `claude/playtest-jump-in-plan`). Commit-and-archive, or keep?
7. **From 10 November** (one lever per platform side and the passenger car at four are answered; see the [decision log](../decisions-rail.md#current-rules)): end-game train direction ([mock-ups](../brainstorms/engine-endgame-mockups.md)): steam to modern (freight or high speed) or the dark plated sci-fi train, or that one as a rival; lengthen halts and gates past 6 m or articulate short cars; a tender on the largest current-era engine or not. The glider banner wording is still his to reword.

- **Tidy:** last code pass `ca3212d0` (render/audio, #1248, 9 November). Next: the other areas since `1af61213`, then architecture, docs, memory.

## Next moves

- The order is in "Where the work stands". Start a fresh orchestrator session from this file at the next pause: this one is very long.
- Keep about three agents running; no more than two browser looks at once on HOTBOX.
- Report perf work in frame time as well as triangles ([owner call](owner-calls.md#frame-time-60)).
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- First: reach HOTBOX and get the train-spacing results to the owner with the wait-limit question; then ship build 2 on his answer.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage. HOTBOX is described under "Where the work stands".
