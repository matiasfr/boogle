# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 16 November 2026 about 17:40 UTC, by the last unattended tick, on the owner's word to fold it into the heartbeat (skill section 9). World **v54** is live; main is `7ed010434` (#1936), CI, deploy and smoke green. Models and effort: `npm run models`.

## 16 November: the focus, what shipped, what is open

- **Owner call** ([decision](../decisions-process.md#d-2026-11-16-focus-choice-and-payoff)): the next work is the choice-and-payoff loop. [The backlog](../backlog.md) has four P1 rows; P1 is the focus, at most five rows.
- **Shipped today, game:** #1926 garage step 1 (the 20 m/s upgrade as an install, v53); #1927 stakes and piles on the Round; #1928 riders and the till; #1929 `rail.buy` and houses that raise fares (v54); #1930 the gold ghost, the hold and the house going up. Every one had an independent review and its fixes before shipping.
- **Shipped today, docs:** #1907 backlog and direction; #1910 plan status lines; #1912 DESIGN.md's server model; #1913 agent instructions to match; #1916 the owner-calls index (`npm run owner-calls`); #1924 the archive pass (`docs/archive/`, `npm run docs-archive`); #1920 the unattended tick (skill section 9); the 2D pages for garage choices (#1909) and the first line (#1908); the first-line brief (#1914) and its crossing probe (#1923).
- **Tick, 13:15 UTC:** shipped since the last update: #1932 (the two-tab buy scenario `dev/scenarios/town-buy.ts`, the town economy's game-design chapter, [the checkpoint report](../reports/town-checkpoints-k1-k2.md); K2 ticked, K1 still open) and #1933 ([town-choice](../plans/town-choice.md), a plan shipped as a proposal: not designer-reviewed, nothing built from it). Nothing was waiting for review or merge.
- **Tick, about 15:00 UTC: A1 shipped; nothing is running.** Town economy A1 (crate stacks and count boards at the Camp and Quarry, freight crates on the train's flat car; view only, no world bump) was built by `town-a1-freight` (Codex gpt-6-astra high). Its first stills showed the Camp pile sunk in the rear ramp and the Quarry pile through a shelter post, so a designer review ruled both placements (two Default rows in [agent-calls](../agent-calls.md)); the builder applied them and the tick opened the retaken stills (both piles and boards on open ground, counts 4 and 8 matching stock). Not seen: real-time motion, the unload moment, riding on freight, a line 2 train stopped at the Quarry (the flat car lining up with that pile is calculated). Not tested on a device. P3 leftover: the stone icon on the count board reads as a pale blue shard, not stone. Next by rank: K1 (the stills and one real-time clip, a runner job), garage step 2 (view only), garage step 3 (high-risk). The town-choice plan waits on the owner (Open owner questions).
- **Tick, 17:10 UTC: started nothing (the first tick in a row that could not).** Main green; nothing was waiting for review or merge. The hourly heartbeat in the "Orchestrate Boogle with T3" thread started the day's tidy at 17:00 UTC as two Codex delegates (`tidy/simplify-1116`, and the architecture review and docs audit on `tidy/docs-arch-1116`), which fills the limit of two jobs in flight, so K1 was not started; that session reviews and ships its own tidy. K1 is still the next P1 job, then garage step 2. Not touched: the `review/gorge-4372df4f4-scratch` worktree (6 unmerged commits, last commit 14 November; its cleanup is the owner's).
- **Handover, 17 November (owner: "wind down and spin up a thread on the connected HOTBOX environment instead"):** the Mac's live orchestrator session ended with main at #1999, world v57, no job running, no open ship PR and nothing unmerged. Orchestration continues in a thread on HOTBOX (Windows, project `C:\Users\matia\Claude work\boogle`; the link's access was approval-required when it was opened, so its commands pause for the owner unless he raises it). HOTBOX answering again also unblocks the backlog's "Device tests run remotely" row, which said it had been down since 12 November. The Mac's "Boogle heartbeat" and "Boogle daily tidy" were paused at 06:05 UTC (checked over the link at 07:35: both disabled); both now run from the HOTBOX orchestrator thread ([automations](automations.md)), so there is one heartbeat. **First things for the HOTBOX thread:** check its own setup (Node from `.nvmrc`, `npm ci`, `gh` signed in, whether the look captures and Blender work on Windows) and report before dispatching. **Next work by rank:** the town's sack (C1, C2 of [town-economy-visible](../plans/town-economy-visible.md)) and its K1 and K3; garage choices step 2 (view only) and step 3 (steel spent, high risk), with the designer's Quick or Strong rebalance first, now that an extra car can mean rider capacity; riders walking to the coach's doors instead of popping into seats (the roughest edge on the coach; needs a short plan); a reliable frame-cost measurement of the coach (R4's timings are provisional: both captures logged two 404 errors for an unknown resource, the same seen in an earlier perf run, and CPU timing was invalid, so find the 404 first); the P3 row of small fixes. **Owner questions still open:** whether the footing wagon stays on its train after the ring's last footing (recommended: stays); more red on the coach or not; the first line: no fork, or build a crossing; the placeholder strings.
- **Heartbeat, 17 November 07:35 UTC (HOTBOX, the first run there):** main green at #2000, nothing in flight, no open PR. **Bottleneck: look captures on Windows.** Playwright's headless shell has no `dxcompiler.dll`, so WebGPU's `requestDevice` failed and the game never reached the lobby; every player-visible job depends on looks. Fixed in `dev/look/lib.ts`: Windows defaults to the `chromium` channel (the full build, headless), and the favicon route follows the channel in use. Proven: one-player overview passes (WebGPU, about 55 game frames/s, no console errors) and a two-player look passes at `--warp-speed 2` (the default warp of 5 leaves the second clock behind on this machine). Also merged the duplicated town-economy P1 row (#1999 re-added an older copy). Blender 5.3 is installed; untried. Nothing started this run: it shipped the look fix first, so the next run can start K1 or the sack (C1, C2) on a harness that works.
- **16 to 17 November (the owner's live session; world v57 on main):** the first island teaches, so its town is judged as lessons, not choices ([decision](../decisions-core-loop.md#d-2026-11-16-first-island-teaches)). **Shipped:** rider places as their own number and plot 3 at 1,600 (#1968); the loader yard on plot 2 (#1975, v55); the model and loader times (#1977: ring solo 334 to 198 s, pier 177 to 135 s); line 2's trains wait for the depot cart, which used to drive through a waking train (#1981, v56); cars by role (#1982); Home proven for the coach train on today's track (#1983); the CI unit shards' time limit fixed by splitting two slow files, a per-file 480 s deadline and drift warnings (#1984; main's shards now 253 to 379 s); the Pier's west foot crossing moved 3.4 m (#1986); the riders' coach in every line 2 train, eight places, Home's and Ring Island's stops and High Gorge's crossover moved (#1992, v57); candidate A's model (#1995). Plans: [first-town-lesson](../plans/first-town-lesson.md) (A became the coach plan; K open) and [rider-coach](../plans/rider-coach.md) (R1c, the relay, not built by his choice). **Owner decisions,** all in the rail and rewards logs and owner-calls: a dedicated coach, candidate A, built from the reference sheets; not counted in a boiler's allowance for now; Home keeps today's track (confirmed on stills); the blockout acceptable as a v1; names "Blast pipe" and "Big boiler"; the right solution over less work. **In flight:** nothing. R4 and the evidence trim are on main (#1999: every check passes on v57 with the modelled coach; the blockout step's evidence cut from 64 MB to 3 MB). The rider-coach plan is complete apart from what R4 lists as unverified. **Lesson for dispatch:** tell builders to commit at most about 16 curated stills, 1200 px wide, a few MB, and keep raw dumps and clips local under `.look/`; one brief that said "keep evidence in the repo" produced 119 MB. A branch that changes test assertions or fixtures is refused by `ship-queue` without `--reviewed`: send it to review before queuing. **Open for him:** whether the footing wagon stays on its train after the ring's last footing (designer and orchestrator recommend it stays; nothing waits); placeholders "Every train", "Loader yard", the Cars tile's counts line; the first line: no fork, or build a crossing. **Known, stated:** eight rider places add no fare income in the q6-done window (supply-limited); headway gaps 551/653 against an even 602 at one fleet size; riders appear in their seats, no boarding walk; nothing tested on a device. Small fixes found are a P3 backlog row.
- **One unattended orchestrator** (owner, 16 November, [decision](../decisions-process.md#d-2026-11-16-one-heartbeat)): the four-hour "Boogle unattended tick" schedule is deleted and its rules are the hourly "Boogle heartbeat"'s (skill section 9). The heartbeat's scheduled prompt now works from the `../boogle-heartbeat` worktree, not the stale launcher, and may start one next step when no P1 job is running. P3, for him: the heartbeat still runs inside the long "Orchestrate Boogle with T3" thread and rereads its history each hour; a fresh session per run would be cheaper.
- **Open owner questions from today** (each proceeds on its recommended yes unless marked): the town plan's five are answered as recommended (16 November) except the second plot, which waits for the designer's review of the first town as a lesson; the first line: no fork, or build a crossing (the orchestrator recommends closing it as no fork under "the first island teaches"; not yet his word); how many riders a passenger car holds and how cars are added (new, from his seats call); "Blast pipe" and the board and till placeholder strings; whether the buy's reach check (3.2 m from the board, live) is wanted.
- **Proof debts from today, none tested on a device:** K2's two-player buy scenario shipped in #1932; remaining gaps include real-time motion and sound for the garage install and the house build; the rooftop run with a controller; a second real player inside a plot when a house completes; the full Works bot route after v53.
- **Leftover moved here from the backlog:** P2, the rotunda's quiet-machine frame timing, smoothness and device performance are still unverified (its steps 1–5 shipped, #1880 and #1890).
- **Docs clean-up left:** 66 plans kept as "unsure" in `docs/archive/README.md`; 707 links that were broken before the archive pass (evidence files never committed); `docs/game-design/place.md` still wants splitting; P3 `.claude/skills/look/references/performance.md` still says "lockstep tick".

## Links

- [Backlog](../backlog.md): every effort the owner has committed to, ranked, with its status and next step. This file holds live job status, proof gaps and leftovers; it does not repeat that list.
- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [Ring Island build 2](../plans/ring-island-build2.md), [slice 5 town economy](../plans/slice5-town-economy.md), [greybox route](../plans/greybox-route.md), [campaign outline](../plans/campaign-outline.md) (hub towns), [remote runner](../plans/remote-runner.md); the ECS migration is done.
- [Production core](../plans/production-core.md), [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Open calls page (version 6, all 14 questions answered): https://claude.ai/artifact/MQizAujJpyybXc7fL7Fw3W
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Rules learned

The lessons; the orchestrator keeps them.

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
29. After a ship lands, the next queued branch was checked against the old main. When two branches touch neighbouring code (v45 renamed a helper the meadow used), re-run `node dev/ship-check.ts origin/main HEAD` on the second after the first lands, before shipping it.
30. `dev/codex/run.ts review` takes `--ref-branch` only; `--base-ref` is for tasks.
31. The heartbeat's STALLED mark on a Codex job is often false (low CPU while waiting on the model): check `.look/codex/<topic>/events.jsonl` mtime.
32. `npm run server -- reset <room>` resets a room (backup first); the owner asked how, for future playtests.

**Peers.** HOTBOX, the owner's Windows desktop, has been down since 12 November. Do not queue proofs there.

**Housekeeping.** The 13 November cleanup archived removed tips under local `archive/worktree/*` tags, including `codex/hook-swing-prototype-wip`, `codex/two-player-track-wip` and `review/leaf-coop` (its test was not on main). Old worktree counts are superseded; inspect current worktrees before cleanup. Daily-job checkouts under `~/.boogle/daily` stay untouched. The parked traveller branch and tag above are kept.

## Leftovers from 11–12 November, by rank

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

## Notes kept from earlier snapshots

Prefab portability still matters: committed artifacts hold authored operands only; transcendental math runs at load, because macOS arm64 and Linux x64 differed in the last digit. Runtime goldens compare within a tolerance ([record](../archive/plans/prefab-data-step-7-portability.md)). Room fast-forward remains off on production until `ADVANCE_KEY` is set there; its Dev dock control and countdown are on main.

## How merging works

`npm run ship-queue -- <worktree> --wait [--reviewed "<stamp> <who, what they found>"]`, in the background, one branch after another ([orchestrate-boogle skill](../../.claude/skills/orchestrate-boogle/SKILL.md), "Merge"). The gate prints the stamp it needs. It finds Node 26 itself. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` symlinks to the main checkout's node_modules; an `npm ci` there empties it. Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

**Process, 14 November.** Every code change ships only after an independent review; docs-only changes ship with `--orchestrator-read`. Today's code batches above received independent Codex Astra reviews, two to five rounds. That does not settle the earlier after-the-fact reviews owed for the hall posts, Far Head's seated shot, seated Request stop/cab roof/vehicle spacing and catalogue ceilings; keep those with the owner. The rule was reaffirmed that morning after a slip: the orchestrator had shipped four code changes on its own read (#1771, #1782, #1783, #1784) before a permission check refused a fifth. #1771 (the hall's posts) was undone by #1778 on the owner's word; #1782 and #1783 were reviewed after the fact and one defect found (the seated bell), fixed in #1789; #1784 only removed test ceilings on the owner's call. Do not ship code with `--orchestrator-read`.

The Codex sandbox cannot launch a browser: the orchestrator runs `npm run test:net` in the job worktree itself; do not treat a sandbox launch failure as a network regression. The B4 outside-sandbox run was 190/190, as was rotunda 1a's reported run.

The repo-root main checkout is a detached launcher hundreds of commits behind `origin/main`. Agents work in their own worktrees from `origin/main`, never read plans from the launcher, and fetch and reset first when told to start from `origin/main`. For this docs-only snapshot, no fetch was run: the job forbids network access beyond its local server. Local refs and log were checked; active jobs, review rounds and live deployment were not independently polled.

## Leftovers

- **14 November, after the fixes (ranked, in this order; nothing in this list was tested on a device):**
  - **P2, the Round's shadows:** from above only half the Round has shadows; the shadow map covers the area near the player.
  - **P2, the Round's performance:** no reading; `npm run perf` has no town view.
  - **P2, J1:** no train yet seen running through the frog; the blade is hard to read.
  - **P2, frame fold:** never seen with a second player.
  - **P2, reload:** fade-then-move variant and the Gorge, deck, swim, window-0 and two-player cases not seen in a browser since the fixes.
  - **P3, commuters:** may be clipped by a train just after a hard camera cut (accepted).
  - **P3, friend's frame:** walk-through of a frame drawn for a friend on a tab loaded after the stretch was laid (accepted).
  - **P3, canyon tread:** dotted line across it predates the terrain pass.
  - **P3, bot:** stalls at the canyon bend near (939, −121).
  - **P3, garage:** older teardown leak.

- **Other playtest notes still open:** the content ending on a refusal at High Gorge; the leaf's strike beat and island map table; other junctions after J1; yards at halts; the garage's "choose what to add" brief; "Stop requested" with no held-request cue; the steel works never fed or lit; tumbles around trains and footings (cause unknown); the trace's catch-all "wake" row; recorder gaps. Keep their original ranks and owner words in [the tracker](../plans/round-4-notes.md#owner-solo-session-14-november-ipad-with-a-keyboard-the-whole-built-route-ranked). Rotunda, running-side, train ladder, great tree and rack moves are tracked with the shared v45 reset above, not undispatched fixes. Reload, the gap cues, footings cues and finished-frame packing are shipped, with the proof gaps listed here.

- **Earlier 13–14 November findings still open (not re-tested for this snapshot):**
  - **P2:** two-device join, reconnect and server-restart checkpoints; `reconnect-edit` can fail in an idle room when two tabs never sample the same server step (passed on rerun); workshop chair faces the wall. The summit walk's severed leg is now measured, with its bridge in work above.
  - **P3:** equivalent address spellings get separate rate budgets; an operator sharing a flooder's address is throttled; the Fly edge must overwrite `Fly-Client-IP` (accepted under the owner's attacker call). The Boogler can trail a rider by 86 cm for about 1.5 s during Talk and draws a friend's rider about 30 cm farther back; a real backgrounded tab is untested. The prefab numeric guard rejects thirds and float sums and can miss a short derived value; a small leg 2 scale change can trip the six-metre clearance rule.
  - **P3:** Dev dock Room tab clips its new-room button when a status line shows; atlas opening cites deleted files. A swapped-out held item disappears instead of dropping; the camera enters a standing train at Home; canopy posts and map board stand on the deck centreline; Works evals retain old-Home coordinates. Stale retirement wording remains in haul/net docs, atlas, code comments and skill references; check current files before fixing it.
  - **Suspect copy for the owner:** Room tab strings, replacement countdown and notice (listed in the Dev menu's "Replace room with stage"); The Boogler's unheard frisbee line; the request-stop destinations, Steel car tiles and archived "Opening day happened while you were away". The Boogler's copy stays his.

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

Answered: [the town’s first choice, 16 November](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers); [the first line, 17 November](../decisions-core-loop.md#d-2026-11-17-first-line-no-fork).

**From 16 November, waiting on him** (the heartbeat starts nothing on these):



From 5–6 November; drop each when answered.

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
2. **First-path verdict** on slice 3.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
5. **Museum:** inspect the miniature, the crystal specimen, or both.
6. **Worktree archives:** the 13 November cleanup supersedes the old keep-or-archive question; inspect the local archive tags before recovering any experiment (Housekeeping above).
7. **From 10 November** (one lever per platform side and the passenger car at four are answered; see the [decision log](../decisions-rail.md#current-rules)): end-game train direction ([mock-ups](../brainstorms/engine-endgame-mockups.md)): steam to modern (freight or high speed) or the dark plated sci-fi train, or that one as a rival; lengthen halts and gates past 6 m or articulate short cars; a tender on the largest current-era engine or not. The glider banner wording is still his to reword.

8. **From 14 November, proceeding on the recommendations** (the gap's earlier three questions, the record ceiling and no try-on are answered; do not ask again):
   5. **Open orchestrator default, track layer:** add a second hand so Q5/Q6 motion reads; keep laying speed. Newly stated after the owner answer; not owner-confirmed ([agent calls](../agent-calls.md#rail-construction-levels-and-travel)).
   6. **Footings:** the pier still accepts a hand-carried footing although the bill says by wagon (recommended: do not refuse it yet); "stall" versus "rotunda" on the footings board.
   7. **Turnouts:** J1 proof looks rough from above; the other junctions wait for his look.
   8. **Open orchestrator default, draft strings:** stay live until he edits them; keep one consolidated list of new strings owed to him ([agent calls](../agent-calls.md#controls-hud-and-arrival)): "Next load: on the wagon"; kiln, cradle, seal, great tree, rack and wagon prompts; footings board lines in `src/entities/railway/footing-cues.ts`.
   10. **Earlier unresolved calls:** (the DESIGN.md text and the agent-instruction drafts were applied on 16 November; P3 left: `.claude/skills/look/references/performance.md` still describes "ms per lockstep tick" and `onApplied`, unchecked against what `npm run perf` prints now) ([step 8 report](../archive/plans/server-owned-players-step8-report.md)); settle the earlier after-the-fact independent reviews; level-pacing's "should the cart ever be ridden" (no), "are the yards still the drop box you mean" (yes), the resident's wagon line (not now), and suspect copy "No line beyond yet", "Needs the powered pick", "Stop requested".


- **Tidy:** last full pass 16 November 2026. Code: simplify pass 4 covered `12ba8f7ba..72b79c3f3` ([#1937](https://github.com/matiasfr/boogle/pull/1937), [#1938](https://github.com/matiasfr/boogle/pull/1938), [#1940](https://github.com/matiasfr/boogle/pull/1940)); **last code pass end `72b79c3f3`**, start the next range after it. Architecture and docs: reviewed through `aa7861150` ([#1939](https://github.com/matiasfr/boogle/pull/1939), [report](../reports/tidy-2026-11-16.md)). Memory: consolidated 16 November (full-links rule moved to owner-calls). Debris: 16 November (25 merged or closed `ship/*` branches, 15 merged worktrees, 141 week-old `.look/` captures).

**Owner questions still open** (each proceeds on its recommendation): the board plan's three (above); suspect strings owed to him in one list (footings board lines in `src/entities/railway/footing-cues.ts`, "Next load: on the wagon", kiln, cradle, seal, great tree, rack and wagon prompts); the statue's facing and size, the glider trail's brightness and the wind sound (his walk); the right-hand running plan's three questions; walk the Round blockout. Items the backlog agent could not tell were commitments (train ladder, short turn, co-op abilities E, great beam, 2D economy prototype, express and east bay, yards, production-core slices 6 and 7, the target-quality pass, the 12 November hold list, mini-golf, critters) were put to him on 14 November and are unanswered: ask once.

**Earlier calls, still open:**

- Leg 1 shipped under the 1,600 cap (agent call 109): keep it, or revisit train spacing. The earlier 48-seed settled worst was 1,553 heavy and 1,535 light; the 1,400 gate held on four seeds only. Candidate A added waits on main's stages; candidate B helped light asks only. The short turn still needs its own plan; preserve the `scratch/spacing-*` sheets and record the results in the spacing plan.
- After the rivet, should the footing wagon's train stop for stone (call 108)? The earlier measurement was 2,884 ticks between loads because its train never takes stone.
- Does the shared pool replace halt yards for upgrades, or cover only goods carried to a hub ([entry](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool))?
- Maps compress the leg to about 30% of its true length; Home shrinks after the rivet and names have leaders. His call on that trade.
- Suspect copy still his: "It runs faster and pulls one more car", "Look at the engine", "Railhead" beside "Stack railhead", and the leg labels. The fourth car is now built; the old "no fourth car yet" note is superseded.

## Next moves

The order is in the dated section at the top and in [the backlog](../backlog.md). Standing: about three browser-heavy jobs at once; HOTBOX is the orchestrator machine (Windows): look captures run there on Playwright's full Chromium (the default on Windows), and two-player looks need `--warp-speed 2`; report perf work in frame time as well as triangles ([owner call](owner-calls.md#frame-time-60)); code ships only after an independent review, docs with `--orchestrator-read`; work from a current `origin/main` worktree, never the detached launcher at `~/Developer/boogle`.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage. HOTBOX is described under "Where the work stands".
