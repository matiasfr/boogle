# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../decisions.md#current-decision-index).

**Updated:** 10 November 2026, about 16:45 UTC (08:45 local). World v25 is live (request stops, #1409). Nobody has played since 06:13 UTC. The 9–10 November orchestrator session closes by noon local on 10 November; the next session starts from this file. Owner call #1396: the orchestrator makes direction and design calls too, records them, and the owner can overrule. The roadmap is [direction.md](../direction.md). The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

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

Claude only until 12 November (`npm run models`). Ship with `npm run ship-queue -- <worktree> --wait`; branches touching src/sim, src/net, src/world or server/ need `--reviewed "<npm run review-stamp> <who, what they found>"`.

| Job | Status | Next step |
| --- | --- | --- |
| Double track, generic lines ([plan](../plans/generic-lines.md)) | steps 1–2 on main (#1416, #1422); step 3 on main (#1425): bents on the 4% bow, the ground banked along the up track, the bot's Far Head route | Step 4a/4b: the trains (sim and server, then client, bot, looks), shipped together as `WORLD_NS` v26. Step 4a must pass `RAIL_TRAINS[slot].line`, not the slot, in `replan`'s trainAlong/trainSpeed/trainArrives. Open owner question: one lever per platform side (call 19) or keep the two handles |
| Ring Island ([brief](../brainstorms/ring-island.md)) | greybox on main behind `?ring=greybox` (#1418, #1420), matching the greybox rulings | Build 1 is v27, after v26. Still owed: walk the last bent's ramp; re-shoot its stills (taken before the landing fix); check the raised leaf from Home and the telescope |
| Toon shading ([research](../research/toon-shading.md)) | B, rim off, is the default look on main (#1427); A, C and `?toon=a|b|c` removed; `?toon=off` for before/after | The owner may want the rim (one line: `rim` default in src/render/toon-tuning.ts). Check the shadow on/off stall on a quiet Mac and a phone (see Leftovers) |
| Passenger car | Four (knifeboard) on main (#1411), built as the default | The owner may still pick Six. The upgrade (roof, lamps) is built and off, with no rule yet. Not checked: four seated, a pet in motion |
| Glider cue (#1408) | on main | The owner rewords the banner draft ("The glider is awake" / "Up on Needle Bell's summit") |
| Shared moments (#1415) | on main | Gate and throat shots have no banner copy; the owner's to write if wanted. A two-device playtest confirms the second player sees each shot |

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
  - **Level check:** it measures reach from the line's centre every 2 m, so it misses jumps from the deck's edge (one jump onto p2 from s 94–97 already works). Its hook-walk standing places turn on once line 2 is laid over s 84–92, earlier than the game does (Q2, s 122).
  - **Up-track bed edge:** still 0.25–0.89 m in about 11 m of each line (trestle and ramp ends, the Village merge s 40–45, line 2 s 307).
  - **Bot detour:** the B8 bot's Far Head detour is probably unneeded now that the ground is banked.
  - **Toon B, shadow switching:** with toon on, two of three benches missed Home's timing sample right after the bench turned the sun's shadow off and on; a direct probe saw 3–21 s stalls in both modes (3 of 5 with toon, 1 of 4 with `?toon=off`), on a loaded Mac. Phones turn shadows off on the detail ladder, so bench it on a quiet Mac and a phone; `dev/look/toon-board.ts --modes off,on` gives before/after stills.
  - **Rooms:** a room whose disk never answers still refuses joins and holds a hosted-room slot. Shutdown skips a room that `offline()` is closing; the 8 s hard exit covers it.
  - **Smoke rooms:** `smoke-node-N` keep their names across `WORLD_NS` bumps, so an old save that won't load fails their close every week. Resetting them is an owner call.
  - **Pages deploy:** `actions/deploy-pages` timed out twice for f8576e65 (15:18 and about 15:40 UTC) and the site lagged the server. The smoke then fails on a build mismatch; wait for the site before treating it as real.
  - **v25 notes:** a rider beside the line near a passing train can ring the bell cord (the reach is about 37 m at cruise); the quarry is a service stop whenever the pier still needs footings, so a short dwell can happen with nothing to load.
  - **Agents and node_modules:** three agents symlinked node_modules; the rule is now in tools.md.
  - **Ring Island:** a strong swimmer can skip the glide (about 15 s against 2.5 s); accepted. Untested: the hook from the water, and a swimmer walking out at the last bent.

- **Model rule (#1364, owner):** only the orchestrator runs Fable; code review, planner and hardest design run on Opus. `npm run models` has the table.
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

Next up, in order: generic-lines step 4 (v26, two trains on line 2), then Ring Island build 1 (v27). Then owner notes from the 9 November session, ranked in [the tracker](../plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked) (owner call "Rank every note P1, P2 or P3"); pick by rank, and each needs a slot (the GPU queue is long). Running jobs by rank: P1 cinematics, the boiler prompt, a reset starts fresh; P2 the cart handle, Pier halt, quarry gate; P3 the double-jump ring.

- **P2, classic throws in the railway room** (nightly triage): the HUD offers "Frisbee · Throw" but the railway room refuses `gift.toss`, `src.take` and `site.stock`, so the toss never lands, and the nightly `one-hand` and `interact` scenarios fail on it. The owner's 6 November order has island throwing waiting for replication R3, so the default is to hide the throw prompt there and drop those two toss checks until then; confirm with him.
- **Tidy: the decision index is at its size limit.** The prototype route's must-read is capped at 32,000 characters and the index pushed three agents over it on 9 November; trim the index before the next decision is routed.
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

From 5–6 November; drop each when answered.

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
2. **First-path verdict** on slice 3.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
5. **Museum:** inspect the miniature, the crystal specimen, or both.
6. **Worktrees left after the 9 November cleanup** (30 archived as local `archive/worktree/<branch>` tags, 39 merged ones removed): three with uncommitted changes (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`) and four recent ones (`claude/godot-assumptions`, `claude/glider-b-plan`, `claude/idea-land-ack`, `claude/playtest-jump-in-plan`). Commit-and-archive, or keep?
7. **From 10 November:** one lever per platform side (call 19) or keep the two handles; passenger car Four (built) or Six; the glider banner wording; whether toon B gets its soft character rim (built off).

- **Tidy:** last code pass `ca3212d0` (render/audio, #1248, 9 November). Next: the other areas since `1af61213`, then architecture, docs, memory.

## Next moves

- Next session (from 11 November): generic-lines step 4 (4a sim and server, 4b client, bot, looks) as `WORLD_NS` v26, then Ring Island build 1 as v27. Neither bump ships while the owner is mid-session.
- Keep about three agents running. Then D1 and R1–R3. Every Place port gets its fit check before planning (owner-calls).
- Glider B's WORLD_NS v23 ships only while no owner session is live.
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- Tidy: run the remaining code areas, then architecture, docs and memory.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
