# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 12 November 19:00 UTC (11:00 PST), at the wind-down of the 11–12 November orchestrator session; nothing is running on the Mac. Main is `32886fd93` (#1668), green and deployed. World v30 is on main (slice 5 R1 to R3); main's CI takes about 5.5 minutes. Normal mode (Claude only) until 13 November; the models table puts player-visible work, reviews and design on Fable medium.

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

**On main since 17:30 PST on 11 November (12 November UTC, newest last):**

- #1622 rail kit levels and split rings. #1623–#1626 M13e–M13g close the ECS migration. #1628 the `?home=b` boot crash. #1630 the adapter's clock is `adapter.read.tickNow()`.
- #1633–#1636: campaign outline fix, slice 5 plan with design review, the breaker prompt fix, R5b (both Ring Island jump-ins). #1638 greybox route plan. #1639 the owner's 14 answers. #1640 slice 5 stone-stop ruling. #1641 slice 5 R1+R2 (v28). #1642 greybox leg 1 step 1. #1643 hub towns decision. #1644 market hub; #1645 its answer. #1646 economy-stops ruling. #1647 greybox leg 1 step 2 (`src/sim/railway-route.ts`).
- Since 07:00 UTC: #1649 host hotfix (every room socket has an error listener, typeof checks, dropped count in status). #1650 slice 5 R2b, the Quarry stone stop (v29). #1651 Wall and Bell Rock design rulings. #1652 slice 5 R3, riders and fares (v30). #1653 greybox map rails and the economy model on the ruled route. #1654 Fares paid landing. #1655, #1656, #1658 greybox leg 1 step 3 design rulings. #1659 step 4 design answers and catalog positions. #1657 the ride-home fix (carry keeps the deck you ride; the parked track layer is stowed once Q7 is laid).

**Owner decisions, 12 November UTC** (all in the log): the 14 answers ([core loop](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered), [rail](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered), [town economy](../decisions-rewards.md#d-2026-11-12-town-economy-answered)); hub towns (Home, Ring Island, High Gorge, Canopy Town, Port Quay; the others are sources: [entry](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight)); the market hub at Bell Rock, built out in stages ([entry](../decisions-rewards.md#d-2026-11-12-market-hub-answered)); the seed-fixture regeneration call (owner-calls).

**Answered (owner, 12 November UTC): the platform wait limit.** He picked "A looser rate for the greybox": "Ship build 2 and leg 1 now with waits up to about 2 minutes 15, and tighten when train spacing lands." Orchestrator's reading ([entry](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered)): until train spacing lands, build 2's and leg 1's wait gates are a worst lever wait of 1,350 ticks settled and 1,600 growing (measured: build 2 worst 1,100; leg 1 settled 1,343, growing 1,408), mean and share over 1,050 printed, not gated; the [train-spacing](../plans/train-spacing.md#c-the-limit-as-a-rate) table is the target they tighten to. The same page answered the other open questions, each as recommended except the Village's far goods ([rewards](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered); the shared-pool note, [to confirm](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool)); the plain install stands until the Home flip, with "but prioritize the garage moment".

**Ready but not shipped:**

| Branch | State |
| --- | --- |
| `ring2/v3-garage` (local only, worktree `.claude/worktrees/agent-a8f0bb88b7688c06c`) | Ring Island build 2: rules R1–R5, views V1–V3 (the install is a plain hold at Home's table until the Home flip; the garage's moment waits), steel bot, v31. All reviews done (final review: ship after fixes, fixed); the bot's full loop passed (ring-joined to boiler installed); the all-longer fleet's wait is a TODO test. Needs (wait limit answered: the looser rate): a rebase onto whatever main is then, ship-check, a ship outside his sessions |
| HOTBOX `wip/greybox-leg1-step3` (local, not on origin: the pre-push hook refuses until bump and fixtures) | Greybox leg 1 step 3 (rules): fleet 3 then 5, block signals at section ends, kit on at most running trains minus one, the stone stop allowed for a kit that cannot unload, call 88 ride-on, heads closing two lays on, catalog positions. Every gate passes except the wait gates 8 and 9 (printed, TODO; the owner's looser rate sets them). Needs (wait limit answered: gates 8 and 9 at 1,350 settled, 1,600 growing): build 2 on main, rebase, steel-first, gate 15, bump (v32), fixtures, independent review, `test:net` |

HOTBOX is a peer session (address under Peers). The Mac ships its branches when HOTBOX sends tips and stamps.

**On main since 15:00 UTC:** #1661 and #1662 the [train-spacing plan](../plans/train-spacing.md) and its design review (candidate A "pass the ask back", fallback B a Ring Island hold capped at 20 s; the designer adds a light-asks run, since 8 asks a minute is no real room's rate). #1664 test fixes (the server suite builds rail seed stages unaudited unless `RAIL_AUDIT=1`, which CI sets, so CI time is unchanged; `test:net` waits on ticks). #1667 the parked track layer measured safe (look eval `railway-pier-parked-layer.ts`). #1668 kinematic bodies turn about their origin (`src/physics/backend-rapier.ts`; Rapier turned the engine about its centre of mass and slid riders 0.26 m sideways per Village to Pier ride; reviewed, not lockstep, no bump; https://boogle.club/ loaded clean after it).

**HOTBOX at wind-down: silent since a system-update restart about 17:15 UTC.** The owner opened a new session there at about 19:00 UTC (see Peers); it was sent the questions below and had not answered at hand-over. Unconfirmed: whether local `wip/greybox-leg1-step3` survived, and how far the train-spacing experiments got (E0 at heavy and light ask rates, on main and on step 3; nothing reported). Ask before restarting them.

**Bump order:** build 2 v31, greybox step 3 v32; renumber at ship time.

**Next, in order:** ship build 2 (load https://boogle.club/ after it); greybox leg 1 step 3 (v32) and step 4 views on the looser rate; the garage's install moment (owner: prioritise); train spacing, then tighten the rate; Ring Island R6 docs; a frame-time pass and device run ([owner call](owner-calls.md#frame-time-60)); trees, then shadow draws.

**Other open owner questions** (each proceeding on its recommendation):

- To confirm: the reading of his shared-pool note (upgrades pay from one world-wide pool; towns visibly receive neighbours' goods only), and how it meets "taken where it lies" ([entry](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool)).
- Train spacing's questions 2 (a late train passes the ask back) and 3 (a capped hold at Ring Island).
- Older: his picks in the [story brief](https://claude.ai/artifact/F7U3suEtidLnJyyd3eK2Hk) (saving unconfirmed on his device: read `picks/owner`); the wing's folded size; the remote runner's five questions; the halt map at phone size. Eight server symlink tests fail on HOTBOX until he turns on Developer Mode there.

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

**Peers.** HOTBOX is the owner's Windows desktop; its peer session since the 12 November restart is "Reconnect with orchestrator and resume work" (the owner confirmed it, 12 November; SendMessage by that name from ListAgents; delivery is never confirmed but it answers). The old session "Orchestrator coordination for development" (`bridge:session_013GeHMBXhojhecCo8EUn8eh`) is offline. It shares the build load ([owner call](owner-calls.md)). D3D12 looks run there with `LOOK_CHANNEL=msedge`. `gh` and ffmpeg are installed there.

**Housekeeping.** Cleared at wind-down (12 November 19:00 UTC): 84 clean, fully merged worktrees with their branches, and every landed branch with no worktree. Left, 41 worktrees and about 80 branches: `ring2/v3-garage` (build 2, keep); the unmerged `review/*` test branches (`review/ring2-rules-tests`, `-r3-tests`, `-r4-tests`, `review/ring2-final`, `review/leaf-coop`, `review/m12e`, `review/m12b-1`, `review/unit-speed`), the `ecs/m12e`/`m12f` and `batch/1111-b`/`-c` worktrees, `feature/ring-r4e`, `ring2/before-rebase-2` and `-3`, `ring2/rules*`, `ring2/v1-works`, `ring2/v2-train` and about 20 one-commit `worktree-agent-*` branches: check each one's tests are on main, then archive-tag and remove once 48 hours old (from 13 November evening). Three with uncommitted changes stay for the owner (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`). The daily-job checkouts are never touched. The five `archive/review/*` tags and `archive/place` are local only.

**Leftovers from 11–12 November, by rank:**

- P2: `?home=b` draws 315 of 388 trees off the sim's positions.
- P2: `railway-session.ts` is 573 lines against the 450 cap (needs a state object).
- Closed: the map JSON's stale rail heights (#1653, `c9906f458`/`d0b43a588`: rails written from the catalog, a test fails on disagreement). The Ring Island ride-home drop is fixed (#1657, `c37c555d5`).
- P2: the server has no last-resort crash handler and the rail step timer is unguarded (`server/src/index.ts:30-31`, `server/src/host/world-host.ts:482`, `src/world/sync.ts:391`). Classic rooms accept an array op and save it (`src/world/sync.ts` stamp).
- Closed: the parked track layer (#1667: no train reaches it at line 1 or line 2's frontiers; the Pier engine stops 1.65 m short). `test:net`'s one-off failures and the slow server tests (#1664; the new timeout message is unverified).
- P2: Spotlight (`corespotlightd`, `mds_stores`) burns CPU on the Mac, probably indexing agent worktrees; the owner may exclude `~/Developer/boogle/.claude/worktrees` in System Settings (an agent must not change system settings).
- P3: a rider at the front of the boiler stands inside the chimney model (no collider); a small dark square floats above the engine in every still; a rider dropped into the cab's solid parts is not carried (the cab floor carries). `test/kinematic-turn.test.ts`'s dynamic half only asserts "falls"; a kinematic body's Rapier mass now reads 1.
- P2: the headway hold never binds under lever asks (identical results at 75% and 0% on main).
- P3: "Bring logs or rails" family and install prompt strings are placeholders; the longer engine is hard to tell apart without a side-by-side; steel's fourth car is not built; the garage tile in `?home=b` still reads "Needs steel" after an install.
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
