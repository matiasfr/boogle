# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 11 November 2026, 17:30 PST, in the 11–12 November orchestrator session (started about 11:20, assumed 24 hours; hourly heartbeat; wind-down at 11:00 on 12 November). World v27 is live; main is green at R5 part 1, and main's CI takes about 5.5 minutes. Everything dated below is 11 November, times PST, unless it says otherwise.

## Links

- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [ECS migration](../plans/ecs-migration-railway.md), [M12 and M13 steps](../plans/ecs-m12-m13.md), [CI diet](../plans/ci-diet.md), [Ring Island build 1](../plans/ring-island-build1.md), [line 2 B5–B8](../plans/line2-b5-b8.md), [remote runner](../plans/remote-runner.md)
- [Production core](../plans/production-core.md), [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Patch notes video: https://boogle.club/updates/video-2026-11-11/
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Where the work stands

**On main, in order (11 November):**

- #1590–#1603: the owner's answers and calls; batches A and B (unit shards, R2d, the halt map, X1–X4, M12c, M13a and b, the leaf with several players); CI diet batch 1; the pennant pole; docs.
- #1604, #1606: Windows tool fixes. #1605: the wing model behind `?layer=wing`, with an asset-viewer entry (`/character/?asset=track-wing`). #1607: acts.
- #1608: the migration stack (batch C, M12e, M12f): tools and views read rows and queries; the adapter is `railway-session.ts`, `railway-intents.ts`, `railway-effects.ts`. #1610: M12b, the old read model deleted.
- #1611: CI diet batch 2. #1612: the gated-fill eval waits in server ticks; the reload bot's command is in its eval's header.
- #1613: the chunked far ground on by default ([owner](../decisions-process.md#d-2026-11-11-far-ground-on-by-default)). #1617: Ring Island's ground tiled the same way.
- d975817e3: R4d the Meet and R4e the island's folk. a5f54113c: the hook-walk ledge fix (a level landing in `src/place/tech-layout.ts`), the zero-size boot fix (`src/render/drawable-size.ts`), a Windows test fix.
- #1616: M13c (64 Place-only tools deleted, 15 rebuilt native). #1618: M13d (the level check off Place, a service-walkway ledge rule).
- R5 part 1: the Ring Island bot segment (`npm run playthrough -- --from gap-footed --to ring-ride`) and its stops in the loop graph.

**Running at 17:30 PST (branch, state):**

| Branch | State |
| --- | --- |
| `ecs/m13e` | Deleting `src/proto/place` and its entry. Its report lists any Boogler lines that exist only in Place. Needs an independent review if it touches a review path |
| `perf/rail-kit-distance` | Distance LOD and culling for the rail kit chunks (about 31k triangles each, dozens drawn at Far Head) and the always-drawn rings-and-cove mesh |
| `feature/ring-r5b` | The ring seeds carry the glider (dev seed data, may be under `src/sim`: independent review); prove `--from leaf-raised`; build `--from deck-laid` |
| HOTBOX | The full eval and scenario sweep on dbc3ebb4e; then a frame-time pass (below) |

**Next, in order:** review and ship the three branches (load https://boogle.club/ after any that changes what loads); M13f and M13g, which end the migration; R6 docs; a frame-time pass on HOTBOX and a device run, before and after the perf changes ([owner call](owner-calls.md#frame-time-60)); trees (one always-drawn batch), then shadow draws; cut `railway-session.ts` (668 lines against the plan's 450) into a `railway-read.ts`.

**Rules learned on 11 November** (the lessons; the orchestrator keeps them):

1. Never run `ship-queue` through `| tail`: it hides the exit code and the error. Log to a file, and grep the log narrowly (`ship-check|error|rejected`), never the whole test output.
2. A test that spawns git under the pre-push hook inherits `GIT_DIR`. One set `core.bare=true` and a fake user in the real `.git/config`; fixed in #1601 (`test/helpers/scratch-git.ts`; `testEnv()` strips `GIT_*`). If every worktree says "this operation must be run in a work tree", check `git config core.bare`.
3. A rebased branch is pushed under a new name, never force-pushed. A branch with merge commits can't be rebased by `ship-branch`: squash it onto origin/main on a new branch.
4. Agents that each run the full unit suite count toward the Mac's limit of about three. Briefs ask for typecheck, lint and the touched tests only. HOTBOX crashes tabs with three looks at once: two at most.
5. The default shell is Node 24: export Node 26 on `PATH` (`$HOME/.nvm/versions/node/v26.13.0/bin`). Run unit tests with `node dev/test-unit.ts <files>`, not `npx vitest`.
6. Reviewers found real defects in three reviews (batch C's tick-less queries; the CI diet's classifier holes, twice). Keep them.
7. The ship gate asks for a review of any new test file. Three ships bounced on feature tests outside the [test diet](tests.md#tests); every brief now says "no new unit test files" unless the code is lockstep.
8. The registry's 14,000-character must-read budget per route is nearly full (the one-off-message route has a few characters spare): an edit to `tests.md` or `sync.md` must not grow them.
9. A solo look warps page time about 12x while the server runs at real speed: evals wait on server ticks (`railAt()`), never page seconds. Two-player warp looks need `--warp-speed 2`.
10. `refs/stash` is shared across worktrees: no `git stash` in any brief (HOTBOX lost and restored a hunk this way).
11. Two ships fetching at once fail with "cannot lock ref"; rerun the ship.
12. After a ship that changes what loads at startup, load https://boogle.club/ before calling the site healthy (the 04:55–07:10 outage; `dev/live-boot.ts` is now the guard). A pane opened hidden showed the zero-size error until a5f54113c; that fix is unverified in the real pane.
13. During a GitHub Actions outage, run the CI jobs locally and merge by pull request ([owner call](owner-calls.md)).

**Peers.** HOTBOX is the owner's Windows desktop; its peer session is "Orchestrator coordination for development", address `bridge:session_013GeHMBXhojhecCo8EUn8eh`. It shares the build load ([owner call](owner-calls.md)). D3D12 looks run there with `LOOK_CHANNEL=msedge`. `gh` (portable, logged in as the owner) and ffmpeg are installed there. Messages to it are not confirmed read, but it answers.

**Housekeeping.** To clear at wind-down: about 20 merged agent worktrees and their branches (`batch-1111-*`, `agent-*`, `ci-diet-2`, `ci-diet-2b`, `save-cleanup-win`, `hotbox-fixes`, `state-evening`, `review-*`; `review-m12c` has a symlinked `node_modules`: delete it, don't reuse it); `/private/tmp/claude-501/wt-main`; the `boogle-test-speed` worktree and `claude/test-speed` (PR #1553 closed on the owner's word); the five `archive/review/*` tags (all checked: landed or obsolete). The 2D trade prototype artifact is dropped (owner, 11 November: "no need").

**Still waiting on the owner** (nothing blocks): his picks in the [story brief](https://claude.ai/artifact/F7U3suEtidLnJyyd3eK2Hk) ([his call](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s); its saving was rebuilt six times and is unconfirmed on his device: read `picks/owner`, or use its Copy responses button); the wing's folded size (wider and longer than today's machine); the remote runner's five questions ([plan](../plans/remote-runner.md)); the halt map at phone size. His to overrule when seen: one cottage on arrival, the clock free with a stone footing, blank stake boards until the first fare, the village sign's 12; the Pier's platform and rack east from Q6; the forge's show length; the hook walk's level landing. Eight server symlink tests fail on HOTBOX until he turns on Developer Mode there.

**Leftovers from 11 November, by rank:**

- P1: the ring seeds never take the glider (`rail.glide` is set only in `glide-earned`); in `feature/ring-r5b`.
- P2: frame time is unmeasured for every perf change of 11 November (triangles and draws only); nothing was tested on a device.
- P2: other evals may wait in page time on server-paced things (q6, the cart waits in `bots/railway.ts`).
- P2: `dev/look/restore-pair.ts` and `look --at` restore checks still import Place (M13e).
- P2: nothing audits the T3 and stack physical probes since M13d (the old audit was never green).
- P2: R4d: the breaker is not visibly carried at the rivet; the whistle bark and rivet toss are not built; a sim-side early-strike guard needs a field and a bump.
- P2: the wing is not solid and has no level check.
- P2: the notify lane sits over Drop at 568x320, and Toss is off-screen in landscape.
- P2: a red pre-deploy boot skips `recover` and opens no issue.
- P2: `backOf` in `dev/peer-test/ws-railway.ts` and `mark()` in `dev/look/bots/railway.ts` still own shapes.
- P2: R5: the standing rider over the bow, a two-player run, the plan's `ring-glide.ts` eval and perf runs.
- P3: Ring Island's ground is still about 101k triangles at the island (wants its own LOD distances); far-ground tiles build at land load, cost unmeasured; the far ground's seams at 180 m and 420 m are unchecked on a phone.
- P3: `bloom.ts:13` re-sets its size every frame on a canvas under 64 px; `src/proto/greybox` precompiles without awaiting `drawable`; a canvas collapsing to 0x0 mid-game is untested.
- P3: `reconnect-edit`'s "landed" check proves the roster changed, not that it was the held edit; `dev/codex/look-broker.ts:56` has a dead `--regenerate` entry (M13e); the trusted broker needs a relaunch for M13c's change.
- P3: the lighting wedge's play-distance camera hides Buddy at the spawn; the `__placeDone` and `--place=` names remain.
- P3: `ship-check`'s walker misses a path passed as a function parameter (the UNFOLLOWED gap); `ship-check` reported 0 affected tests for a new test file.
- P3: the Talk prompt during an act card is untested; a stall cue's clear on reconnect is unverified; the cart at `trains-on` parks underground on the baseline too.
- P3: the pennant is untested beside a real train and from Home's shore; the "mayor" comment in `src/place/folk.ts` is stale.
- P3: the gifts, piles and mushrooms adapters have no unit tests; `toeShove` has no sideways bound; `rewardBusy` is separate from `momentBusy`; lint skips `server/`; the adapter exposes `tickNow` twice; Q7 `started` is untested at the seeds.
- P3: the halt map at phone size (names small, the hold badge reads as the Pier's, the glider icon crowds "Quarry"): the owner's look.
- P3: the live smoke after #1610 timed out reading the server's commit; the next four passed.
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
  - **Passenger car on a grade (fixed 10 November, on main):** the bench, the cargo car's stakes and boards, and seated riders' drawn bodies take the car's pitch (`Seat.frame`, view only); the level boards cutting the tilted deck were the doubled planks. Not checked: the wardrobe pet beside a rider still sits level on a grade; pets read `avatar.rotation.y`, which is now a fraction of a degree off while tilted.
  - **Shadow on/off stall:** turning the sun's shadow off and on stalled 3–21 s in a direct probe (10 November, on a loaded Mac), seen with and without the toon lighting since removed; benches missed Home's timing sample right after the switch. Phones turn shadows off on the detail ladder, so bench it on a quiet Mac and a phone.
  - **Rooms:** a room whose disk never answers still refuses joins and holds a hosted-room slot. Shutdown skips a room that `offline()` is closing; the 8 s hard exit covers it.
  - **Smoke rooms:** `smoke-node-N` keep their names across `WORLD_NS` bumps, so an old save that won't load fails their close every week. Resetting them is an owner call.
  - **Pages deploy:** `actions/deploy-pages` timed out twice for f8576e65 (15:18 and about 15:40 UTC) and the site lagged the server. The smoke then fails on a build mismatch; wait for the site before treating it as real.
  - **v25 notes:** a rider beside the line near a passing train can ring the bell cord (the reach is about 37 m at cruise); the quarry is a service stop whenever the pier still needs footings, so a short dwell can happen with nothing to load.
  - **Agents and node_modules:** three agents symlinked node_modules; the rule is now in tools.md.
  - **Ring Island:** a strong swimmer can skip the glide (about 15 s against 2.5 s); accepted. Untested: the hook from the water, and a swimmer walking out at the last bent.

- **Model rule (#1364, owner):** the orchestrator, planner and designer run Fable (planner and designer at medium, owner 10 November); code review and hardest design run on Opus. `npm run models` has the table.
- **Pages deploys still hang:** twice more on 10 November (03:00 and 03:06 UTC). The server restarts first, so until the site deploy lands the smoke test fails on a build mismatch; cancel the hung run and the queued one goes. From 10 November 03:20 UTC the deploy step fails after three minutes instead of ten, so the workflow's own `recover` job retries; unproven until a hang meets it.
- **Production resets of `rail-v23-boogle` on the owner's word (peer session):** 02:04 UTC (1 player kicked, backup `rail-v23-boogle@20261110T020452261Z.json`) and 02:51 UTC (empty, backup `rail-v23-boogle@20261110T025116035Z.json`). Both predate the reset feature, so players landed in town.

- **Owner playtest notes, 10 November about 02:40 UTC (live build, desktop):**
  - P3: "due to proximity of e to open, i was able to open the mossy scarf chest from the ground instead of on the platform". The chest's open reach ignores height; it should need you on its platform (vertical limit or a reach test from the platform). Not started.
  - P3, with an iPad screenshot at the gorge: "the bridge is longer than it needs to be and it's narrow to walk around when i cross. it can be made nicer". The footbridge overshoots both banks; shorten it to the banks and give each end a proper landing with room to pass. Not started. (The same screenshot is the first real-device sight of the new water: shallows, foam lip and caustics render on iPad Safari.)
  - P3: "the water splash particles are extremely dark/gray" after the water rebuild (#1354). Fixed in #1367.
  - Stutter during the arrival fall through the clouds "until it jump in", again on a fresh reload. See Running.
  - The pet sits on the seated rider's head: wants the shoulder, or beside the rider on the deck. Train stools: "in the middle and be a low stool like the track layer", rider properly seated. Done (#1362).
  - Curio shelves "weirdly at angles and not spaced intentionally with everything else in the town". Owner picked layout A; see Running.

- **Ball throw:** extremely low priority (owner, 10 November); it comes back with the old island.
- **Outage, 10 November 01:18 to 01:40 UTC:** voice chat (#1334) made the server import `src/net/rtc-wire.ts`, which the image did not copy; the server crash-looped. Fixed by #1346, merged directly on the owner's word. Tests, two reviews and CI all ran from the full checkout. A review of any server change must now check new shared imports against `server/Dockerfile`.
- **Pages deploys hang in `actions/deploy-pages`** (four times on 9 and 10 November, twice in a row at 01:36 and 01:44 UTC). Cancel after five minutes and rerun; the site stays on the previous build meanwhile, which also makes the smoke test fail on a server identity mismatch. After the playtest: rerun `deploy.yml` on main.
- **Flaky server test:** "SIGKILL during checkpoint replacement restores a whole checkpoint with every unit conserved" failed once in CI on a branch with no server change (F2, #1340).
- **Bot queue:** a served look session held the slot for 47 minutes (the water agent). Sessions must open, capture and close.
- **Water:** the owner picked B, then asked for a from-scratch rebuild with no Ultra baggage, underwater cut to a flat tint, the baked sky removed if constants can replace it, the light shallows and shore foam kept, the look "somewhere in the range of Mario odyssey and Mario sunshine", and the seabed following the terrain. One agent (`ab3669d122eb5069c`) holds all of it; archive tag `archive/water-ultra-2026-11-09` first.

- **Bot queue:** 44 runs on one slot at 22:00 UTC on 9 November. The bot-queue job adds shared stills and rank order; until it lands, ask for one proof look per fix, no "before" capture where the code already shows the bug, and withdraw lower-rank looks when P1 proofs are waiting.
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
- Tidy: the last code pass was `ca3212d0` (render/audio, #1248, 9 November). Run the remaining code areas, then architecture, docs and memory.
- At 11:00 on 12 November: wind down, clear what Housekeeping lists, and hand over by updating this file.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage. HOTBOX is described under "Where the work stands".
