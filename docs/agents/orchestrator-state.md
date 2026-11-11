# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision log](../decisions.md#decided).

**Updated:** 11 November 2026, afternoon PST, in the 11–12 November orchestrator session (started about 11:20, assumed 24 hours; hourly heartbeat; wind-down at 11:00 on 12 November). World v27 is live; main is green, and main's CI takes about 5.5 minutes. The scenarios weekly verdict passed on 11 November at 20:45 UTC. Everything dated below is 11 November, times PST, unless it says otherwise.

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

- #1590–#1593: the owner's answers and calls.
- #1595: the Windows test skip. #1596: trains stay visible with 8 actions pending. #1597: the replication tripwire at 2x the warn limits.
- #1598, batch A: the unit suite in four shards, the cheap local mode, Node 26, superseded main runs cancelled, the station-seats test deleted; R2d, the island terminus; the halt map at eight stops; X1; M12c; M13a and b; the toast fix.
- #1599, batch B: the leaf with several players, the labels "Knock out the pawl" and "Hang the weight", the first-ready latch.
- #1600: X2–X4 folded, with one `railRoom` harness.
- #1601, CI diet batch 1: closure-gated server, image and net jobs; the pre-deploy offline boot; one review list in `dev/review-stamp.ts` with per-file rules and one stamp; the red-main hold; the `ci-autofix` bisect; shared seed builds; the scratch-git helper; tests never see `GIT_*` variables.
- #1602: the leaf's pennant on its own pole.

**Built, not on main (branch, state):**

| Branch | State | Waits on |
| --- | --- | --- |
| `batch/1111-c` 9214d13a3 | M12d + D1–D5 + x234-tidy, reviewed. One P1 was fixed: tools must pass the tick to `railPhase`, `railCounts` and `railCurrentJob` on a client's world | HOTBOX's checkpoint: `test:net`, `hud-glance`, `world-inputs`, one bot segment, evals gated-fill, boiler-fit, works-at, jump-in, railway-instant, the reload bot, the lookout look, the Dev Inspect dump |
| `ecs/m12e` 76caf4d89, on top of C | Reviewed, ship | The same checkpoint (stacked) |
| `ecs/m12f` 9e7dfcbde, on top of M12e | Reviewed, ship; move-only. It misses the plan's line caps (`railway-session.ts` 668 against 450, `railway-intents.ts` 323 against 300): a follow-up cut (a `railway-read.ts` for `railMovement`, `perFrame` and the facade) after M12b-2 | The same checkpoint (stacked) |
| `ecs/m12b-1`, on top of M12f | Being built | Review |
| `feature/ring-r4d` 224e020c6 | The Meet: built, unseen; the look is asked of HOTBOX | A look |
| `feature/ring-r4e` 6bb93e9ec, on top of r4d | Island folk stand upright facing the shard (owner), the nod is dropped; the rivet toss and the whistle bark are not built; perf at the halt owed | r4d's look |
| `feature/acts-2` 65077efc1 | A retake found page B missing the Act 2 card when B walks during Far Head's shot (cause not found; the card now waits at most 9 s and traces `act waiting`). Act 1's crane reframed (unseen) | A second retake, asked |
| `video/patch-notes-1111` 210f62a2 | The `reel.ts` Windows file-URL fix | Ships in a batch |

**Next, in order:** ship batch C, then M12e, then M12f, after the checkpoint (load https://boogle.club/ after each); review M12b-1; M12b-2; M13c–g (M13c's rule is the owner's of 11 November: [native dev tools, not Place-only ones](../decisions-process.md#d-2026-11-11-native-dev-tools-not-place-only-ones)); R4d and R4e after their looks; R5 (the bot and the loop graph); CI diet Batch 2 (the orchestrator's call; the owner declined Batch 3 for now).

**Not started:** the wing GLB with an asset-viewer entry (it must land before M13e); publish the 2D trade prototype (`docs/world/economy-prototype.html`) as an artifact (the owner said yes); check and land what applies of the five `archive/review/*` tags; pre-loading the wagon during Q7 (P2).

**Rules learned on 11 November** (the lessons; the orchestrator keeps them):

1. Never run `ship-queue` through `| tail`: it hides the exit code and the error. Log to a file.
2. A test that spawns git under the pre-push hook inherits `GIT_DIR`. A new test set `core.bare=true` and a fake user in the real `.git/config` and broke every worktree for a minute; fixed in #1601 (`test/helpers/scratch-git.ts`; `testEnv()` strips `GIT_*`). If every worktree says "this operation must be run in a work tree", check `git config core.bare`.
3. The orchestrator force-pushed `feature/acts` once after a rebase, against the rule. A rebased branch is pushed under a new name instead.
4. Agents that each run the full unit suite count toward the Mac's limit of about three. Briefs ask for typecheck, lint and the touched tests only. Browser proofs can go to HOTBOX, but it crashes tabs with three looks at once: two at most.
5. The default shell is Node 24: export Node 26 on `PATH` (`$HOME/.nvm/versions/node/v26.13.0/bin`).
6. Stacked unshipped branches (C, M12e, M12f, M12b-1) all wait on one checkpoint: run the checkpoint on the nearer idle machine instead of queueing it.
7. Reviewers found a real defect in two of four reviews today (batch C's tick-less queries; the CI diet's review-classifier holes). Keep them.
8. After a ship that changes what loads at startup, load https://boogle.club/ before calling the site healthy. The 04:55–07:10 outage: v27 added Q7 to the sim's stations but not to Place's `LINKS`, `createStationBoxes` threw at startup, and every gate passed. `dev/live-boot.ts` is now the guard, in the live smoke and in `deploy.yml` before Pages deploys.
9. During a GitHub Actions outage, run the CI jobs locally and merge by pull request ([owner call](owner-calls.md)); batch A (#1598) went this way, with the server image boot skipped for want of Docker.

**Peers.** HOTBOX is the owner's Windows desktop; its peer session is "Orchestrator coordination for development", address `bridge:session_013GeHMBXhojhecCo8EUn8eh`. It shares the build load ([owner call](owner-calls.md)). D3D12 looks run there with `LOOK_CHANNEL=msedge`. `gh` is installed there as a portable copy and logged in as the owner (11 November). Messages to it are not confirmed read, but it answers. ffmpeg is installed there.

**Housekeeping.** Done: the v25 scaffold worktree agent-a2c535d562153dc90 was deleted on the owner's word (its commits were on main). Open: PR #1553 is superseded by #1598 (the same local-cheap unit mode landed there) and conflicts with main; the owner asked for it to be explained, not yet to close it. At wind-down, clear the merged agent worktrees and branches from today: batch-1111-a and b, x234-tests, win-test-skips, trains-visible, replication-tripwire, the docs worktrees and the `review-*` worktrees. `review-m12c` has a symlinked `node_modules`: delete it, don't reuse it.

**Still waiting on the owner** (nothing blocks): the remote runner's five questions ([plan](../plans/remote-runner.md); the one-time ssh setup is "Later"); the halt map at phone size, his look (below); a brief of the world's locations with options for the story and characters (prepared 11 November; [his call](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)). His to overrule when seen: one cottage on arrival, the clock free with a stone footing, blank stake boards until the first fare, the village sign's 12; the Pier's platform and rack east from Q6; the forge's show length. Eight server symlink tests fail on HOTBOX until he turns on Developer Mode there.

**Leftovers from 11 November, by rank:**

- P2: the zero-size canvas boots with "The graphics stopped" on first load in a hidden or just-opened pane (a reload is fine).
- P2: the notify lane sits over Drop at 568x320, and Toss is off-screen in landscape.
- P2: a red pre-deploy boot skips `recover` and opens no issue.
- P2: `backOf` in `dev/peer-test/ws-railway.ts` and `mark()` in `dev/look/bots/railway.ts` still own shapes.
- P2: R4d: the breaker does not swing at the rivet; the crossing shot plays only for a standing rider.
- P2: no multi-player lagged random-press coverage of the Works and ability reads (accepted).
- P3: the halt map at phone size (names small, the hold badge reads as the Pier's, the glider icon crowds "Quarry", the blink unverified): the owner's look.
- P3: `toeShove` has no sideways bound.
- P3: save-cleanup puts a `:` in the trash folder name on Windows (`save-cleanup.ts:128`).
- P3: `rewardBusy` is separate from `momentBusy`.
- P3: lint skips `server/`.
- P3: the level-check continuity report still lists the deleted `ring-loop`.
- P3: Q7 `started` is untested at the seeds (a `q7Started(w)` query would fix it).
- P3: the adapter exposes `tickNow` twice.
- P3: even out the unit shards by measured file times; a cross-file seed cache.
- P3: the pennant is untested beside a real train and from Home's shore.
- Unverified on GitHub: closure gating on a real PR, the automerge `--touches` step, the bisect.

## Merged 10 November

- Late game: client steps (#1403), v25 request stops, faster footings and the turntable rule (#1409, reviewed; it fixed kit and wagon starvation and the bell-cord reach), the held-jump float fix (#1404), the glider cue (#1408), shared gate cutscenes (#1415), Firefox sea and audio (#1414, not checked in a real Firefox: headless Firefox won't run on this Mac), the passenger car (#1411).
- World: the whole-map blockout (#1406, `?blockout=world`), its rulings with a 4% ruling grade (#1407), the double-track decision, the generic-lines plan (#1412), steps 1 and 2 (#1416, #1422), the Ring Island brief and greybox (#1418, #1420) and its rulings.
- Server and tooling: the stuck-room fix (#1424, live smoke passed at 5a4d24c3), a hard `--wall` on every look (#1410), the smoke's 5-minute wait for the server deploy (#1421), toon candidates (#1423), then B as the default look (#1427), and the rule "never symlink node_modules; run npm ci" in tools.md.

## Merged 9 November

- Docs split: decisions.md + direction.md (#1232), research index with top blocks (#1235), Godot evaluation notes (#1246).
- Agents: designer agent with a level-design and flow pass grounded in research, lenses not rules (#1241–#1244, #1250); tidy skill (#1237); progression-flow research (#1249); Home flow audit (#1251, docs/reviews/home-flow.md).
- Game: hook scoring fix (#1234); glider brief and design review (#1238); glider piece A, off in production (#1247); render/audio tidy (#1248); town T1, Pip's house live (#1252); Split-rock J3 rules, WORLD_NS v22, live (#1253); wardrobe T4 (#1254); buoys and telescope F3 (#1256); Fine Prices shop T5 (#1257); ambience and M flag A1 (#1258); residents T2, town back under its draw budget (#1259); Split-rock J4, the Works live (#1261); museum T3 (#1262); station boxes and curio shelf C1 (#1263); Q6 bot trap fix (#1265); the stowaway C2 (#1266); personal crystals K1 (#1267); gold finds F1 (#1269, cut again by the owner the same day, #1270); Split-rock J5, the wagon, Pier halt and crossing (#1272).
- Tooling: X1, verification on the production game (#1239, #1245); orchestration pass (ship queue, heartbeat report, short bot runs ahead of long ones).

## How merging works

`npm run ship-queue -- <worktree> --wait`, in the background, one branch after another ([orchestrate skill](../../.claude/skills/orchestrate/SKILL.md), "Merge"). It finds Node 26 itself; the default shell's Node 24 fails the level check. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` and one old agent worktree symlink to the main checkout's node_modules; an `npm ci` in either empties it (seen twice on 9 November). Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

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
  - **Unmerged worktrees at close:** `worktree-agent-a987ce7963499823e` was already on main as #1351 and is removed (reviewed 10 November). `.claude/worktrees/agent-a2c535d562153dc90` (detached; commits on main as #1416; its untracked v25 differential scaffold was not used by 4a: remove it). `agent-a1d6d918bda1cb328` (`review/step4a-scratch`): remove once 4b has cherry-picked its tests. The rest are in open question 6.
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
- **For the D1 brief**, still on Place after X1: `sheet.ts` (Place saves and beats), `saves.ts`, `restore-pair.ts`, `coop-playthrough.ts`, `coop-warp.ts`'s `__place` read, railway-halts `skipTrains`, `dev/codex/see.ts`, `dev/audio/render.ts`, the video shots, and the level, economy and scan tools. The production co-op runner has no reload or rejoin. `--from` knows only `q5-done` and `trains-on`. Short runs print "Never marked" noise from the Place playdata card. The cold-start shore camera is unverified on production. Two peers hold 3x warp, not 5x (one sample each).

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

- The order is in "Where the work stands". Run the batch C checkpoint on the nearer idle machine, then ship C, M12e and M12f, loading https://boogle.club/ after each.
- Keep about three agents running; no more than two browser looks at once on HOTBOX.
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- Tidy: the last code pass was `ca3212d0` (render/audio, #1248, 9 November). Run the remaining code areas, then architecture, docs and memory.
- At 11:00 on 12 November: wind down, clear the worktrees and branches listed under Housekeeping, and hand over by updating this file.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage. HOTBOX is described under "Where the work stands".
