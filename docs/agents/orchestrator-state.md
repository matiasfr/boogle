# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../decisions.md#current-decision-index).

**Updated:** 10 November 2026, 03:12 UTC. The owner played the live build from about 02:40 UTC and sent notes (Leftovers). This orchestrator session winds down on his word ("run until tomorrow and then aim to wind down by noon. That way I can start a fresh thread every day"): no new agents from 09:00 local on 10 November, closed by noon; the next session starts from this file. For tonight he ranked voice below everything else and the ball throw as extremely low priority, to come back with the old island. World v23 is live. The owner's two playtests of the day are logged and ranked in [the tracker](../plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked); no session is live. The roadmap (now, next, later) is [direction.md](../direction.md), not this file. Public copy: https://boogle.club/development/ The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

## Links

- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [line 2 B5–B8](../plans/line2-b5-b8.md), [Split-rock Works and Roundhouse](../plans/split-rock-roundhouse.md)
- [Production core](../plans/production-core.md), [slice 3 plan](../research/slice3-plan-2.md), [room-owned time plan](../research/room-time-plan-2.md)
- [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Running

Claude only until 12 November (`npm run models`). Agents run in `.claude/worktrees/agent-*`, resumed in their existing worktrees after the 9 November restart (ship order where files overlap: glider B, F2, jump-ins); `npm run heartbeat` lists them with their queued bot runs. Ship with `npm run ship-queue -- <worktree> --wait`.

| Job | Status | Blocker or next step |
| --- | --- | --- |
| Intro fall stutter | building, P1 | Owner: stutter in the arrival fall through the clouds "until it jump in", again on a fresh reload. An implementer (`worktree-agent-a774850fb3eec8a6e`) is finding what compiles, bakes or uploads during the fall and moving it behind the loading screen; evidence must cover a second load. Client only |
| Curio layout A | building, P2 | Owner picked A from a plan view (https://claude.ai/artifact/UoTGbYydZAQeGLUCXenL5A): "Ok let's commit to A for now. no need for in game stills". Bay across the square on the station axis facing the shelf, boxes 3 × 3 in the bay's frame, plinth at the street edge, layout A's shelf squared to the street, a test keeping the pieces off the paths. Plan `docs/plans/curio-shelves-placement.md` (two commits on the local main checkout, not yet on origin; the builder carries them). Agent `a14eb81ef7121c1f2`. Ship when its checks pass; client only |
| Cargo crates get colliders | building, P2 | Owner: "the cargo should have colliderss so we dont clip through it". Agent `ac5fd338b8145b4b6`: crates ride with the car as part of its platform; stops and reports if it needs sim or wire changes; must show the railway bot still boards and unloads |
| Train seating | on main | Seated riders count as aboard (#1357), low stools down the middle and the pet on the deck beside you (#1362, owner: "yeah much better"), the cargo car has no seats (#1366; each train seats two) |
| Station maps | on main | Island map boards (#1348), low display at each halt and one shared on the Home island, map names placed without overlaps with a test (owner: "Looks great for the map!") |
| Sea rebuild (Odyssey look) | on main | #1354 and #1367: B is the only water, Ultra deleted (local tag `archive/water-ultra-2026-11-09`, not pushed), Odyssey-ish default on the owner's pick, fog and fill from constants, splashes read as white foam. The sky cube (about 16 MiB) is now only the visible sky and the PBR environment; replacing it (gradient plus cloud sprites, or a 256 cube) is the owner's call. Seen rendering on the owner's iPad; no frame times measured |
| Outage guard and the fast-ship pipeline | on main (#1351) | Boot check ran before two server deploys. Docs-only ships run only the docs job and merge in under a minute (seen on #1356) |
| Room reset starts over | on main (#1363), deployed 03:04 UTC | Peer session "Server progress restart". `npm run server -- reset <room>` gives the room a new world id and clients reload into the fall, forgetting that room's progress, wardrobe, reward claims and The Boogler's memory. Takes effect only for browsers that joined once on the new build |
| Room-wide voice chat | live, deprioritised | On main with the mute key (#1350). Not tested with a real mic. Proximity is the scoped fast follow |
| Home station (layout B) | building, P2 | Greybox behind `?home=b`; plan updated for "the hall as a space" (#1352); its three spatial suggestions wait for the owner. Step 6 rides v24 |
| The boiler is the first upgrade choice | steps 1 and 3 on main | Next: 5 and 6 (rope haul), 8 (staged fit, "Steam" card); 7 rides v24 |
| Playtest jump-ins | live | Follow-ups queued: stage prefix in `isJumpWorld`, evict the oldest jump claim at the cap, pre-check caps before the sweep |
| Starting-area folk | proposed | Brief on main; waiting on the owner's reaction to the cast and its five questions |
| Next | | See "Queued" by rank |

Landed since 23:05 UTC on 9 November: Pier halt stop and rack (#1311), Works signposting part 1 (#1312), the iPhone and performance work (#1314: resolution scaler, sky fallback, full-height canvas, stall marks), the jump disc removed and Throw hidden in the live game (the ball's throw is hidden too; owner asked whether to bring it back), the water research and plan, the Home greybox (#1321). Owner calls and decisions recorded: signs in the world before hovering text; words and beacons allowed sparingly; a live line map at the Home station; lower hall end walls. Seven hard rules were offered to the owner for loosening (no answer yet): no new Boogler dialogue in briefs, never freeze a friend, no rim light, no dive controls, toys never pay, knacks never power, no tree tiers.

Real-phone checks owed by the owner once he has an iPhone to hand: rotate and scroll the toolbars away (band at the bottom?), background Safari 30 s at Far Head (sky stays blue?), stand still 30 s at the pier after a heavy spot (sharpens again?), reload after a rough session (starts sharp?), first tap after load (hitch?).

Live or on main today, in order: the 24-rail cart (#1280), a reset starts players fresh (#1288), glider B and v23 (#1290), the double-jump charge ring (#1291), the lockstep fixes (#1299, #1304), the quarry and sea gate headstocks (#1300), the boiler flourish and reusable drag (#1301), the boiler prompt and plume (#1303), cutscenes that can't be cut off and the Far Head shot (#1305), and the tooling: heartbeat and review stamp (#1278), bot queue (#1295), nightly runner (#1296).

Done on the owner's word, 9 November: the nightly jobs were reinstalled from main in `~/Developer/boogle-daily-jobs` (five launch agents: perf 02:50, scenarios 03:30, atlas 05:07, patch-video 06:23, long 07:40 local) and the triage was posted on issue 916. Check the 10 November runs at the first heartbeat of the day.

## Merged 9 November

- Docs split: decisions.md + direction.md (#1232), research index with top blocks (#1235), Godot evaluation notes (#1246).
- Agents: designer agent with a level-design and flow pass grounded in research, lenses not rules (#1241–#1244, #1250); tidy skill (#1237); progression-flow research (#1249); Home flow audit (#1251, docs/reviews/home-flow.md).
- Game: hook scoring fix (#1234); glider brief and design review (#1238); glider piece A, off in production (#1247); render/audio tidy (#1248); town T1, Pip's house live (#1252); Split-rock J3 rules, WORLD_NS v22, live (#1253); wardrobe T4 (#1254); buoys and telescope F3 (#1256); Fine Prices shop T5 (#1257); ambience and M flag A1 (#1258); residents T2, town back under its draw budget (#1259); Split-rock J4, the Works live (#1261); museum T3 (#1262); station boxes and curio shelf C1 (#1263); Q6 bot trap fix (#1265); the stowaway C2 (#1266); personal crystals K1 (#1267); gold finds F1 (#1269, cut again by the owner the same day, #1270); Split-rock J5, the wagon, Pier halt and crossing (#1272).
- Tooling: X1, verification on the production game (#1239, #1245); orchestration pass (ship queue, heartbeat report, short bot runs ahead of long ones).

## How merging works

`npm run ship-queue -- <worktree> --wait`, in the background, one branch after another ([orchestrate skill](../../.claude/skills/orchestrate/SKILL.md), "Merge"). It finds Node 26 itself; the default shell's Node 24 fails the level check. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` and one old agent worktree symlink to the main checkout's node_modules; an `npm ci` in either empties it (seen twice on 9 November). Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

## Leftovers

- **Model rule (#1364, owner):** only the orchestrator runs Fable; code review, planner and hardest design run on Opus. `npm run models` has the table.
- **Pages deploys still hang:** twice more on 10 November (03:00 and 03:06 UTC). The server restarts first, so until the site deploy lands the smoke test fails on a build mismatch; cancel the hung run and the queued one goes. From 10 November 03:20 UTC the deploy step fails after three minutes instead of ten, so the workflow's own `recover` job retries; unproven until a hang meets it.
- **Not started, for a free agent (owner's P3s):** the mossy scarf chest opens from the ground; the gorge footbridge is too long and tight at its ends.

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

Owner notes from the 9 November session, ranked in [the tracker](../plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked) (owner call "Rank every note P1, P2 or P3"); pick by rank, and each needs a slot (the GPU queue is long). Running jobs by rank: P1 cinematics, the boiler prompt, a reset starts fresh; P2 the cart handle, Pier halt, quarry gate; P3 the double-jump ring.

- **P2, a cheaper water that fits the game, target Super Mario Sunshine** ([decision](../decisions.md#decided), 9 Nov: Sunshine's water, lighting and grading, "really efficient for mobile"; research agent started 23:10 UTC, `docs/research/water-sunshine.md`) (owner, 9 November: "taking another pass at our water system, we will re-evaluate and see if we can reference a version existing or make a new one that is a lot more inexpensive instead of ultra water, that also fits the style of the game better"). Research first (owner call "Research before deep facets"): what the current water costs per frame on the Mac and on a phone, by part; stylised water in the reference games and what each does cheaply; then two or three candidates behind a flag for him to compare. Starting points: `docs/game-design/water.md`, the archived experiments `archive/worktree/codex/water-fft` and `archive/worktree/codex/water-terrain`, and the 9 November data (GPU-bound dips at the pier and Far Head facing open sea; an iPhone freeze there), so measure this together with the P1 pier performance job.
- **P2, toon shading revisited, characters and environment** (owner, same message: "we will also revisit toon shading on characters and env"). Research and side-by-side boards first; earlier work to start from: `archive/worktree/codex/buddy-light-ramp`, `low-poly-post-looks`, `post-look-round2`, `post-look-sheets`, `material-pipeline`, and the visual pass's open stages 3 to 5 further down. One look decision with the water, since they share the lighting.
- **P2, classic throws in the railway room** (nightly triage): the HUD offers "Frisbee · Throw" but the railway room refuses `gift.toss`, `src.take` and `site.stock`, so the toss never lands, and the nightly `one-hand` and `interact` scenarios fail on it. The owner's 6 November order has island throwing waiting for replication R3, so the default is to hide the throw prompt there and drop those two toss checks until then; confirm with him.
- **Tidy: the decision index is at its size limit.** The prototype route's must-read is capped at 32,000 characters and the index pushed three agents over it on 9 November; trim the index before the next decision is routed.
- **Site deploys hang in `actions/deploy-pages`** (twice on 9 November, 6 and 11 minutes): `gh run cancel` the stuck run and the pending one proceeds. A smoke run that meets the server mid-restart fails with `WebSocket timed out: ["bye"]` (22:53 UTC); rerun it before treating it as real.
- **P1, the back half's order** (now in the boiler-first-choice plan, apart from the Works signposting): station 6 can be funded and laid by hand before the boiler is fitted, which is how the owner's "longest grind" happened, and the breaker is then cast onto a pedestal the boiler still stands on. Designer first: gate station 6 on trains, or make the boiler the only thing to do at that point; one item per pedestal. With the Works signposting below, which now also covers "Fill the kiln" never showing after the second strike.
- **P2, pier performance and the resolution scaler** (owner: "performance dips ... past the pier"): at the pier head p95 30–55 ms and the scale down to 1.2x on a Mac at 2712×2110, GPU-bound (about 200 draw calls, CPU 5–6 ms); the scale then took over four minutes to start recovering. Also a 464–483 ms hitch at each load and 286 ms boarding at Home (P3). Needs a quiet machine: start it when the bot queue is empty.
- **P2, a recovery loop in water**: nine falls and recoveries in 3.5 s at about (1000, 28) in session `mw9prlct` at 7:30.
- **P3, cosmetics fitting pass** (owner: low priority, later): the conductor hat sits a bit above the head; the paper hat floats about 10 cm (Home flow leftover).
- **P2, train stools** also covers his pet: it trails behind when he rides and should sit beside him on a stool.
- **P2, Boiler on a rope** (now part of the boiler-first-choice plan) ([decision](../decisions.md#decided), 9 Nov): hauled like the great log on the gold rope, a little faster. After the boiler pickup job lands (same view). Planner, then the designer for the pace, then build; touches the boiler's carry rule, so it needs an independent review.
- **P1, Split-rock Works signposting** (owner: "confused on what's supposed to occur with the breaker once I hit it next to rotunda"). The first strike only opens the stall; the next step is the second seam at the quarry halt, about 500 m away, and nothing points there, and the empty sockets don't say what fills them. Designer pass first. He is rechecking the slab's fall animation: add it if it reads wrong.
- **P2, Train engine visual pass** (owner: "it looks a bit lackluster"; also P3 z-fighting where the red body meets its dark base). Previz and a front/side/back sheet first (owner call "Previz before modelling"; Codex is out until 13 November, try anyway), then the model. Owner, 10 November: "whenever we do the pass on the train engine, send me a previz before we build it, we'll want to evluate for scale, detail, and upgradability". The previz goes to the owner and waits for his answer before any modelling; it shows the engine beside Buddy and a car for scale, the detail level, and how upgrades (the boiler choice, extra engines) would show on it.
- **P2, Station 5's wait** (owner: getting rails to Far Head was "the longest grind"; he took rails by hand six times). After the 24-rail cart is live, measure the wait at the rim and have the designer judge it and whether the rack's status reads; the expected 80–125 s may still be too long.
- **Train stools (owner, 9 November: "positioning is weird and sitting feels broken").** The two stools on each empty flat car (`src/entities/railway/train-view.ts`, `stool.position.set(car.spec.hx - 0.2, car.hy, z)`; seats from `src/proto/place/seat.ts`) stand at the car's edge, and in the owner's screenshot the player stands half inside one while seated. A pass on where they stand, which way a sitter faces, the sit pose and getting on and off a moving car; prove it with real-time video on a moving train, one and two players. Start when a GPU slot frees.
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

From 5–6 November; drop each when answered.

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
2. **First-path verdict** on slice 3.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
5. **Museum:** inspect the miniature, the crystal specimen, or both.
6. **Worktrees left after the 9 November cleanup** (30 archived as local `archive/worktree/<branch>` tags, 39 merged ones removed): three with uncommitted changes (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`) and four recent ones (`claude/godot-assumptions`, `claude/glider-b-plan`, `claude/idea-land-ack`, `claude/playtest-jump-in-plan`). Commit-and-archive, or keep?

- **Tidy:** last code pass `ca3212d0` (render/audio, #1248, 9 November). Next: the other areas since `1af61213`, then architecture, docs, memory.

## Next moves

- Keep about three agents running. Next: D1, then R1–R3. Every Place port gets its fit check before planning (owner-calls).
- Glider B's WORLD_NS v23 ships only while no owner session is live.
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- Tidy: run the remaining code areas, then architecture, docs and memory.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
