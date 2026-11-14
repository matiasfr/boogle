> **Status: X1 and X2 implemented (2026-11-13), committed locally; not shipped.** The owner approved the flip and one namespace bump. The later tree ruling below replaces the original replant method: preserve v35's planting inputs and order, then remove only covered trees. All 362 scenery trees survive, with no drops. Non-browser proof and the exact browser debt are recorded in [X1 evidence](../reviews/home-flip-x1.md). Browser proofs and independent review precede the orchestrator's ship; this worker does not push or ship.

# The Home flip: layout B becomes Home, then the Round's first build

## Goal

Make Home's one terminus station (layout B, [home-station](home-station.md)) the only Home, delete the old Home and the `?home=b` flag, then build the Round's first step and open the first sealed building on top of it ([town-layout](town-layout.md)). Serves "Understandable at a glance" and "Show, don't tell" (one station, one way through it), and the standing calls "Development is live" and "A well-designed town, not a view from spawn". It bends "Engine foundations first" (question 1).

**Research:** [home-station-layout](../research/home-station-layout.md) (adopted: one terminus, an island for both lines, the table on its own spur, arc length kept so no `s` moves past the joins). No departure. Not a port from Place: no fit check is owed.

## What is built, and what the flag switches (checked on `de19c85a3`)

[home-station](home-station.md) says "proposed"; its steps 1 to 3 are built and 4 to 12 are not. Built: the geometry as data (`src/place/home-station.ts`, 297 lines; `test/home-station.test.ts`, 9 tests), the 2D page, and a greybox drawn only under the flag. Not built: tools on anchors (step 5), the rules' move and the bump (step 6), and the three pieces step 3 cut to step 6 (the cart on `cartRoadAt`, the shunt on `shuntPath()`, `sites.ts` feet).

The flag is read in one place, `homeLayout()` (`src/place/home-station.ts:13`: `?home=b`, or `BOOGLE_HOME=b` in Node). What reads it:

| Where | What it switches |
| --- | --- |
| `src/place/layout.ts:26` `HOME_B`, 10 ternaries: 211, 266, 315, 391, 393, 533, 534, 536, 537, 541 | `TURNTABLE`; `LINES` (heads spliced, joins at s 60 and s 84); Q1's frame side; the two Village `HALTS` (one island); `CRANE`, `DOCK`, `RACK`, `YARD`, `SHELF` |
| `src/entities/railway/view.ts:106` | mounts `home-station-view.ts` (205 lines: hall, buffers, apron, island kerb, stubs, spur, stall roads, the leg, two ruin outlines) |
| `src/entities/railway/roundhouse-view.ts:66` (7 uses) | the stall's shape and place, the table's centre and yaws, the garage's row and ground |
| `src/entities/railway/garage-geo.ts:54` | row `b` of `GARAGE_GEO`; `installHere` is false there, so `works-live.ts:47` keeps the old grey post (`boiler-install-view.ts:120, 166`) |
| `src/entities/railway/halts-view.ts:102` | reads `Halt.island`, not the flag: one shared deck, canopy, one display |
| Tools: `dev/level/home-b.ts:4`, `home-passenger-bay.ts:18`, `home-station-page.ts:39, 230`, `rail-network.ts:323, 512, 568`, `rail-map.ts:1217, 1360` (text), `dev/look/evals/garage-open.ts:44`, `dev/device/cli.ts:4` (an example) | which layout a tool or page samples |
| Tests: `test/town-plan.test.ts:250`, `test/island-map-labels-b.test.ts:7`, `test/curio-layout.test.ts`, `test/garage-geo.test.ts` | both layouts pinned |

**Views differ; the sim does not.** The rules never read the flag: both lines' paths start at the old table (`src/sim/railway-lines.ts:208, 238`: 91800, 1200), the Village platforms are the old ones (`:218`, `:398`), and `SHED_TABLE`, `SHED_STALL`, `WORKS_SEAMS[0]`, `WORKS_BREAKER` (`railway-works-layout.ts:26-40`), `LINE2_FORGE`, Q1, Q2 and `LINE2_BOILER` (`railway-line2-layout.ts:13-185`), `CART_ROAD.forgeCm` 19600 (`railway-cart.ts:34`) and `TABLE_LAND` (`src/world/railway-jump.ts:49`) are the old Home's. So under the flag today the drawing and the prompts disagree: trains and the cart run the old track, the lever, install, rack and pedestal answer in the old places. Stop marks (`TRAIN_STOPS`), every station's `fromCm`/`toCm`, `WAGON_S` and spawn (`SPAWN` (−97, 14); the first-run landing `SHORE_LANDING`) are the same in both. Seeds are rebuilt from the sim on each run, so none is stale; bots read sim constants (no Home literal found in `dev/look/bots`). The loop graph is "today's Home" (Q1 carries 1×36 and 1×14 m; trains 1×179 m) and is re-run after the flip.

**The server and saves: a `WORLD_NS` bump is needed** (v33, or the next free number if the fourth car takes it). The server reads the path for a train's place (`src/world/railway-server.ts:154`, `railLinePoint`) and judges every reach against the anchors above; saved cart rows hold road distances (`forgeCm` becomes 20632), a saved boiler, breaker or wagon mid-roll would sit inside the new station, and the tree table changes (problem 1). No op, component or field is added or removed (`rail.cartCall` already went in an earlier bump).

## Known problems, verified

1. **Trees off the sim's positions: fixed in X1.** The preview baked the new cleared ground before planting, changing the RNG stream (361 trees against 362). The designer rejected drawing all numbers before exclusion: that would replant the island. X1 freezes v35's clear-mask threshold, low-ground exclusion and planted heights, keeps every draw and exclusion in its original order, assigns IDs before station clearance, and then removes only covered trees. The comparison finds **zero covered trees**: all 362 scenery trees and the regenerated starter-source table are unchanged. See [X1 evidence](../reviews/home-flip-x1.md).
2. **Layout B's stand inside the sweep: true.** Row `b`'s stand lies along the rim at r 3.9; its ends are 4.2 m out, inside `DECK_R` 4.8. Fix, in F1: row `b` takes row `a`'s radial arrangement at bearing 85°: `stand {85, 6.5}` radial (4.93 to 8.08 m), `jib {85, 8.4}`, `mast 4.4`, `arm 10.6`, `park 67`, `crew [{88, 9.4}, {81, 8.7}]`; `post {60, 5.6}` and `camBearing 15` stay. Bearing 85° keeps the barrel 1.5 m off the jump-in landing (108°, 5.5 m), 60° from the nearest stall and 11.7 m inside line 2's curve.
3. **The garage tile "Needs steel" after an install: already fixed.** Garage G1 (12 November) made the tile read the rows (`garage-data.ts:88-89`, `garage-state.ts:20-21`), and its as-built note looked at `boiler-long` under the flag. The leftover line in orchestrator-state is stale; X2 removes it.
4. **`test/garage-geo.test.ts` breaks by design: true.** Its first test asserts B's post does not reach the install. X1 rewrites it for the one row (below).
5. **The rack on the walking line: true.** `PROPS.rack` (−84.9, 9.12) is on the apron's centre (axis a −3.9, c 3.8). Fix, in F1: (−84.53, 10.05) (c 4.8), leaving a lane about 2.2 m wide along road 1's edge. The level check's one grounding problem goes with it (Level findings).
6. **Sleeves inside the shelf's reach: true.** He stands at `SHORE_WORKER` (−95, 12), in front of the shelf's north end. Fix, in F1: `PROPS.greeter` (−95.86, 9.65), 2.5 m north, 5.7 m from the shelf's centre (reach 4.4 m). His lines are untouched.
7. **No goods door: true** (`home-station-view.ts:91-95` builds both end walls whole). Fix, in F1: a 1.5 m gap in the north wall's back half (axis a −8.9 to −7.4), behind road 1's buffer, toward the forge.
8. **The level tool draws back ramps the island does not have** (`dev/level/timber-track.ts:319`): two false "passes into sleepers" findings. Fix, in F1: skip `ramp-back` for an `island` halt.

## Design

- **Sync kinds.** The railway rules are Server kind; the flip changes their constants only and the server stays the authority for every reach, stop and train place. Everything drawn (station, stalls, garage pieces, town, rooms) is Local view over accepted rows. No lockstep state, no new op, state key, `env` fact, generator, invariant or control.
- **The flip's constants** are home-station's table ("Constants that change"), less the rows already done (`rail.cartCall`, the boiler pace tunables), plus: both lines' path heads in `RAIL_LINES` (line 1's points s 0 to 50 and line 2's s 0 to 80 become `roadAt(road, s)` in cm; 10 m spacing kept, so every `s` holds), the rack at (91547, 1005) instead of the table's (91510, 912), `TABLE_LAND` (it follows `SHED_TABLE`; checked against row `b`), and `RAILWAY_SOURCES`.
- **No `?home=` value remains.** `homeLayout()`, `BOOGLE_HOME`, `HOME_B`, `TODAY`, `STALL_TODAY`, `GARAGE_GEO.a`, the grey install post (`opts.post`) and `dev/level/home-b.ts` are deleted. The last commit holding the old Home is tagged `archive/home-a` by the orchestrator.
- **So prefab-data converts cleanly** (its plan is not on any branch yet, so this is a guess at its shape): every placed thing is one typed row in a data module with no three.js (`home-station.ts` `PROPS`, `GARAGE`, `town-plan.ts` `TOWN_SLOTS`, `TOWN_PROPS`): `{ id, kind, x, z, yaw, y? }` or an axis or polar form with one resolver. Views take rows and never hold a position literal; a sim anchor and its view row are tied by a test, not by copying.

## Steps

Each is one sitting, leaves `node dev/ship-check.ts` green and main playable. Run `npm run inflight` first: the fourth car (`ship/…9be8e91`, 39 files) is in flight on `src/entities/railway/**`.

- [x] **F1. Fix layout B behind the flag. View-only.** `src/place/home-station.ts`: `PROPS.rack`, new `PROPS.greeter`, a `HALL.goodsDoor { a0: -8.9, a1: -7.4 }`. `src/place/layout.ts`: `GREETER = HOME_B ? PROPS.greeter : SHORE_WORKER`; `src/entities/railway/greeter.ts:57` reads it. `home-station-view.ts`: the north wall in two boxes round the gap. `garage-geo.ts`: row `b` as problem 2. `dev/level/timber-track.ts`: no back ramp for an island. Tests: `home-station.test.ts` gains "the rack leaves 2 m on road 1's side and stays on the apron" and "the greeter is outside the shelf's reach"; `garage-geo.test.ts` runs its sweep, legs and landing tests on row `b` too, measured from `TABLE`. Verify: those tests; `BOOGLE_HOME=b npm run level-check -- --place=place` exits 0. Proof look (one, at the checkpoint): `--rail-seed q1-done --query home=b`, **the platform** framing (from the hall's doorway down the apron to the head ramp: the lane, the rack, the door).
  - **Built 13 November, as the designer ruled.** The rack at (−84.53, 10.05); Sleeves at `PROPS.greeter` (−95.86, 9.65) through `layout.GREETER`; `HALL.goodsDoor`; row `b` radial at 85°; the level tool draws the island as one 4.3 m deck with its own ramps and canopy and no back ramp. `level-check`: 0 problems in both layouts. Three things the plan had wrong, measured: (1) the rack is not turned to the station's axis, so its posts span c 3.12 to 6.49: the lane is **1.97 m** from road 1's sleeper ends to the nearest post (1.47 m of it on the apron), not 2.2 m, and the far posts stand 0.36 m off the cart's side on road 2; the designer's further 0.2 m would leave 0.16 m there, so it was not taken (the still shows one player with room either side). (2) The island's two lever knobs stood **2.7 m** apart, not 3.7 m (each was 0.5 m inside its mast), so a spot did offer both prompts; each lever now stands out on its own edge under its mast (`ISLAND_LEVER`, 3.70 m apart, 0.10 m over twice the 1.8 m reach), pinned by a test. (3) Sleeves's new spot is 1.9 m in front of the hall's second front post, between the two open north bays: beside a bay, in front of a post. The island's lever prompts read "Request stop: to <end>" (placeholder wording, a suspect line for the owner). The head ramp is not in the platform still: the island's deck and ramps drop in with the trains, and `q1-done` has none.
- [x] **F2. The cart, the shunt and the feet on B's roads, behind the flag. View-only.** The three pieces home-station cut to its step 6: `cart-view.ts` poses on `cartRoadAt` (scaled 206.32/196 until X1), `roundhouse-view.ts` builds `pathPts` from `shuntPath()`, `src/place/sites.ts` gets feet for the hall and stalls. Tools on anchors (home-station step 5): `dev/look/evals/garage-*.ts` and `railway-install.ts` read one `garageRow()` helper instead of `GARAGE_GEO.a`. Verify: `home-station.test.ts`; typecheck. No look of its own (X1's videos cover it). Touches `src/entities/railway/**`: after the fourth car merges.
  - **Built 13 November.** `cart-view.ts` poses on `cartRoadAt(cartRoadFrom(d, 196))` with the rail's height from `cartRoadY`; the cart reverses at the forge stop without turning. `roundhouse-view.ts` runs the shunt on `shuntPath()` as two tracks (`shuntB`): the deck turns 120° so the pair backs down the spur with the shunter leading, rests at the cusp, and the shunter pushes the wagon out along road 2; `rollTicks` is still 60, so it runs at about twice the planned pace until X1. Feet for the hall and the three stalls. `garageRow()` (`garage-geo.ts`) is the one place the view and the six looks read the garage's table. **The crossing is not at the island's far end:** since v33 the engine's nose stands at s 24.45 (24.95 with the longer boiler) and the leg's points are at s 26, which leaves 1.05 m. `CROSSING` is on the buffer stub at s 2.0 to 3.6, beside the head ramp's lower half: 1.95 m behind the steel car's tail, 1.9 m short of the spur's points, 0.65 m clear of the cart at its forge stop; from it the 23 m walk to the open stall passes west of the table and crosses only the ruined 220° stall's dead road. Boards only, no collider. **Not seen moving:** the cart's reversal and the roll-out on B's track (X1's two videos).
- [x] **X1. The flip implemented. Sim and server (high-risk): independent review and browser proofs still owed before ship; this plan's checkpoint.**
  - Rules: the constants above in `src/sim/railway-lines.ts`, `railway-works-layout.ts`, `railway-line2-layout.ts`, `railway-cart.ts`, `railway-layout.ts`; `WORKS.rollTicks` 110; `src/world/namespace.ts` bumps with a dated history line naming the station, the path heads and the tree table. `tree-catalog.ts` as problem 1.
  - Deletions: everything under "No `?home=` value remains"; `layout.ts`'s ten ternaries keep B's arm; `view.ts` mounts the station always; `roundhouse-view.ts` loses `homeB`; `cart-view.ts` loses the scale.
  - Tests that pin the old Home, and how each changes: `garage-geo.test.ts` (one row; "a hold at the post reaches the install"; landing equals `TABLE_LAND`); `town-plan.test.ts:250-254` (one tree count, no `homeLayout`); `island-map-labels-b.test.ts` deleted and `island-map-labels.test.ts` covers the island; `curio-layout.test.ts` (B only); `railway.test.ts:137` (new table); `railway-lines.test.ts`, `railway-train.test.ts`, `railway-works-layout.test.ts`, `works-shape.test.ts`, `railway-cart.test.ts` (`forgeCm` is `Math.round((196 − 54 + LEG.len + 26) × 100)`), `railway-jump.test.ts`, `greybox-works.test.ts` with `src/sickle/map-data.ts`; `test/fixtures/railway-golden.json` regenerated (a rule change, with the bump); `server/test/railway-line-host.test.ts` positions.
  - Tools: `dev/level/rail-network.ts`, `home-station-page.ts` (B only), `home-passenger-bay.ts`, `dev/scenarios/world-inputs.ts`, `dev/economy/ring-data.ts`.
  - Checkpoint proofs, once: `npm run check:full`; `npm run level-check`; `npm run loop -- run`; `npm run scenario -- world-inputs`; bot segments `playthrough --to forge-lit` (arrival, the hall, the forge), `--from q5-done --to trains` (the boiler to the new pedestal, trains wake) and `--from trains-on --to freight` (the first train stands at the island): together, a new player from arrival to the first train. Looks, no flag: **arrival** (spawn's own camera at `awake`), **the platform** (`trains-on`, a train at each edge), **the Roundhouse and garage** (`boiler-long`, `garage-open.ts`, from bearing 15°), **from the commons** (from G (−115, 20) at 70° toward the hall, `q1-done`); videos of the cart's reversal (`q4-arriving`) and the roll-out (`cradle-fitted`) in real time. Then load boogle.club after the ship (startup changed).
- [x] **X2. What the flip leaves in words. Docs and tools.** `docs/game-design/place.md` (Home, the cart, the Roundhouse); `home-station.md` status "built to step 6" and `town-layout.md`'s status; `orchestrator-state.md` leftovers closed (trees, stand, tile, garage-geo); `rail-map.ts:1217, 1360` text; `dev/device/cli.ts:4`; `docs/world/home-layout.html` regenerated. May ride X1's ship.
- [x] **R1. Interiors draw by the door. View-only.** town-layout step 7 as written (`src/entities/town/rooms.ts`: `ROOM_CAM.drawWithin` from the door, about 18 m). Verify: a look walking into Pip's house; `npm run bench` at `town`, reported. **Built 14 November:** `cull` measures the camera to the door's threshold. The radius is 48 m for every room, not the plan's 18 m: the owner ruled one radius chosen for the look, not by cost ([decision](../decisions-rail.md#d-2026-11-14-interiors-draw-by-one-radius)), and 48 m covers door to door across the green. A drawn interior stays until 49 m. The toggle is the room's `near` group, so record instances stay enabled and their solids stay (a record's `setEnabled` also removes its bodies, so it is not the draw toggle). No stand-in for the museum's blue: past 48 m its doorway is too small to read ([place](../game-design/place.md), "Interiors draw by the door").
- [ ] **R2. Move what stands, and open the gate cottage. View-only unless the tree pin moves.** town-layout step 2 as written (`TOWN.start` is the one gate cottage at (−138.84, 15.87); `ROOM_PLOTS` from `town-plan.ts`; `PATHS` and `SHORE_PATH` to the ring; `FINDERS_B` beside the hall; the `yard` find at (−145.44, 14.71)). The first sealed building: `RoomId` gains `gate`, a cottage-kit room through `createRooms` with a plain greybox interior and a door that opens. If `PATHS` changes the tree table (`railway.test.ts:137` fails), the table and a bump ride this step and it becomes sim-class with a review. Verify: `town-plan.test.ts`; `npm run level-check`; looks **from the commons** and **arrival** (the top of the dock street, also at phone size) at `q6-done`; `dev/look/evals/railway-finds.ts`; segment `--to forge-lit`; `npm run loop -- run`.
- [ ] **R3. The green, the ring road and the streets. View-only.** town-layout step 3 as written (`src/entities/town/streets.ts`). Verify: one look from the hall's front, one from above; `npm run perf`, reported. Steps 4b and 5 of town-layout follow in its own order.

## Level findings

Run today on `de19c85a3`, `npm run level-check -- --place=place`:

1. **Old Home:** 0 problems (production grounding 5,277 placements; timber against track 569 decks).
2. **Layout B as built** (`BOOGLE_HOME=b`): exits 1 with 3 problems: the rack's foot 5.7 cm off the ground at (913.85, 7.92); "Village/ramp-back passes 26.4 cm into quarry/sleeper/11" and "Village, line 2/ramp-back passes 40.1 cm into timber/sleeper/27".
3. **Layout B with the rack at its planned place** (−84.53, 10.05): production grounding 0 problems. The two ramp findings remain and are the tool's (problem 8): the island builds no back ramp.
4. **Progression is identical in both layouts:** every "ok" and gate line of the place states matches; nothing became reachable before its ability; machine clearance 61,660 poses, 0 problems.
5. **Reported, not failed, for the designer:** line 1's stub turnout at s 36 tightens from an 18.0 m to a 9.5 m radius (line 2's eases from 10.7 to 18.0); four new "straight into an 18 to 23 m curve, no easing" notes at s 45 to 70 on the new heads. The platform edge stands 1.45 m from the rail (0.55 and 0.75 m today).
6. **Not seen by the tool** (it floods terrain at 2 m and knows no props): the hall, the goods door, the garage's pieces, Sleeves. Checked by arithmetic here and by F1's tests.
7. **The Round's positions were not re-run today;** town-layout's findings of 10 November stand (the roof hop to the balcony closes when cottage 2 goes; the hall roof becomes a free perch from the moved bay, ruled "leave it"; the `yard` find is reachable before any ability either way). R2 re-runs the check.
8. **Carried from home-station:** footings walk 19 m with a hop or 36 m by the ramp (11 m today); the pedestal-to-stall-seam walk is 32 m (14 m today).

## Risks

- **Room safety:** no change to apply, accepted effects, presence, transport or save shape; reaches are still judged by the server against the new anchors. A saved room on the old anchors is the reason for the bump; no compatibility code.
- **Hotspots and collisions:** `src/sim/railway-lines.ts` and `railway-train.ts` (the train rules), `src/entities/railway/**` (the fourth car), `layout.ts`, `place.md`. F2 and X1 start after the fourth car lands; X1 is one short-lived branch and nothing else touches the rules files while it is open. Nothing here touches `src/entities/ring-island/**` or `route-greybox/**`.
- **Between F1 and X1 the flag still shows a view the rules do not match;** that is today's state, and X1 ends it.
- **Performance:** the station's greybox is drawn for everyone after X1; `npm run perf` once at the checkpoint, reported, not a gate.
- **No look was taken for this plan** (the bot queue was busy); every problem above was verified in code or by the level check.

## Calls for the designer

| Call | Kind |
| --- | --- |
| Layout B: one terminus, one island, the 9.6 m table on its spur, one open stall and two outlines; low end walls; the shelf's place | Decided (owner, 9 November) |
| The Round, regular; sealed buildings open with its first build; the gate cottage is the one sealed cottage and opens first | Decided (owner, 10 and 12 November; review call 17) |
| Unfinished work is not hidden: the greybox station is Home for everyone | Decided (owner, 13 November) |
| The rack 1 m toward road 2; Sleeves 2.5 m north; the goods door | Default (the spatial review's three, as written) |
| The garage's stand radial at 85°, jib and crew behind it | Default |
| No `?home=` value; the old Home tagged, not kept | Default |
| Trees: stable planting, table regenerated; a few trees near Home move or go | Default |
| The gate cottage opens as an empty greybox room, no new resident or copy | New |
| On the island a player is in reach of both lines' halts (platform centres 6 cm apart): which train a lever ask calls | New |
| Line 1's 9.5 m stub turnout: accept, or ease it | New |
| The longer footing and pedestal walks (finding 8) | New |

## Open questions (owner)

1. **Does the flip go ahead under "Engine foundations first"?** Recommended: **yes.** It changes rule constants and one data table, adds no component, op or system, and so leaves nothing to migrate; you agreed to the flip today.
2. **Is one bump at X1, and possibly a second at R2 if the town's paths move trees, fine?** Recommended: **yes**, each ships when ready.
3. **The first sealed building opens empty (greybox walls, a door, nothing inside yet)?** Recommended: **yes**; residents and dressing wait for the details phase.

## Design review (designer, 2026-11-13)

**Read and run:** owner calls on origin/main (Development is live, Playtest before bespoke functionality, Engine foundations first, Save resets never block), "Home gets one coherent station" (rail, 9 November), home-station's review (its answers 4 and 5), town-layout's review of 10 November, the top blocks of home-station-layout, level-design and progression-flow-layout, `halts-view.ts`, `railway-server.ts` (`rail.call`), `tree-catalog.ts`, `npm run loop`, and `BOOGLE_HOME=b npm run level-check -- --place=place`. Five stills of layout B as built (`?home=b`, before F1): from the commons at G, from spawn, from the hall's back down the apron, from the island's end toward line 1's turnout, and from the island back to the hall.

**Seen:** the rack's posts stand in the middle of the apron between the two buffers (problem 5 is real). From spawn the shelf fills the hall and the way through is the open bay to its left. From G the finders' bay, on its "for now" spot, hides the hall (R2 moves it). Each island edge has its own lever under its own signal and plaque. Through the hall from the island the town reads well.

**Not judged:** no train was seen moving through the 9.5 m turnout; the garage's new stand, the goods door, Sleeves and the rack at their new places (none is built); the footing walk with a footing in hand; the Round; phone size. The playtest sessions (all on Place, 12 November) hold no Home-station moment, so the flow findings rest on the loop graph and arithmetic.

### Calls

| # | Call | Kind | Ruling |
| --- | --- | --- | --- |
| 1 | Layout B's shape, the table, one stall, low end walls, the shelf's place | Decided | Owner, 9 November (rail, "Home gets one coherent station") |
| 2 | The Round; the gate cottage is the first sealed building to open | Decided | Owner, 10 and 12 November; town-layout review call 17 |
| 3 | The greybox station is Home for everyone | Decided | Owner, 13 November ("Development is live") |
| 4 | A bump at X1, and a second at R2 if needed | Decided | "Save resets never block development or architecture" and "Nothing waits on a world bump". Question 2 need not be asked |
| 5 | The rack at (−84.53, 10.05) | Default | Accept. The 2.2 m lane is under the town's 2.4 m alley figure; if F1's still shows two players squeezing, move it a further 0.2 m |
| 6 | Sleeves at (−95.86, 9.65) | Default | Accept, with one condition: he stands beside the open north bay, not in it (finding 3) |
| 7 | A 1.5 m goods door in the north wall's back half | Default | Accept. A travel edge between two open grounds; it reaches nothing early |
| 8 | The garage stand radial at 85°, r 6.5 | Default | Accept. Proved by the sweep test on row `b`; seen at X1 |
| 9 | No `?home=` value; the old Home tagged | Default | Accept. It is what "Development is live" asks for |
| 10 | Stable tree planting, the table regenerated | Default | Accept the goal, **not the method as written** (finding 1) |
| 11 | The step from the deck to a car (the tool reports the edge 1.45 m from the rail, 0.55 and 0.75 m today) | Default | Accept on the numbers (edge to track centre is 1.65 m in both layouts). The figure is unexplained; X1's platform still must show the gap |
| 12 | The gate cottage opens as an empty greybox room | New | Yes: a door that opens, bare walls, no resident and no copy. An empty room is honest greybox and fits "Playtest before bespoke functionality". The owner's question 3 |
| 13 | Which train a lever ask calls on the island | New | **The lever's own line.** A player at a lever expects the train on the rail beside it, going where the plaque above it says. That is what is built: the knobs stand about 3.7 m apart and a prompt reaches 1.8 m, so no spot offers both. Never pick by the nearest platform centre. The server's shared reach is fine. Two additions (finding 4) |
| 14 | Line 1's turnout at 9.5 m | New | **Accept.** Line 1 already runs an 11.1 m turnout at s 182 and line 2 leaves Home on 10.7 m today; trains pass it within 20 m of a stand, so slowly. Ease only if X1's video fails the test in "What the stills must show" |
| 15 | The footing walk (19 to 36 m against 11 m) and the pedestal-to-seam walk (32 m against 14 m) | New | **Accept both**, as home-station's review did. About 13 s a footing at carry pace and 6 s to the seam, once a world, inside level-design's "something to do every 10 to 20 s". One condition (finding 2) |

Decided 4, Default 7, New 4.

### Findings

1. **Trees: the fix as written replants the whole island, not "a few trees near Home". Change this before X1.** Today a skipped candidate draws no further numbers (`tree-catalog.ts:42-55`), and one stream gives every candidate its place. Making every candidate draw all its numbers shifts the stream from the first skipped candidate on, so all 362 trees move once. That moves the wood beside Q1 and Q2, the two hardwoods north of the forge (picked by place) and anything a tree hides. Recommended: plant with today's draws and today's order against a frozen mask, then drop only the trees the station's ground covers. If the planner keeps the full replant, the plan must say so, and X1 adds a check of the wood within 60 m of Q1 and Q2 and a still of the hardwoods. This is read from the planting code; the new table was not generated.
2. **The stall's footings have no cue, and the flip puts a track between the train and the sockets** (flow rule 1, the next goal can be found). `npm run loop` lists the stall as "NO CUE (prompt-only)". Home-station's review accepted the walk with a boarded crossing over road 2 at the island's end; that crossing is in its step 11, which the flip does not build. Recommended: a greybox board crossing rides F2 (view only), sited off the points, so the short way is drawn on the ground.
3. **F1 moves the first character a player meets and takes no still of him.** Add an arrival still to F1 (below). Cheap, and it is the first sight of the game.
4. **The island's two levers read the same.** Both prompts say "Request stop", 3.7 m apart, and only the plaque tells them apart. Recommended (Default): on the island the prompt names its end, in the form middle halts already use ("Request stop: to …"); and a test holds the two knobs more than twice the prompt reach apart (the margin today is about 0.1 m). Not The Boogler's copy.
5. **Between F1 and X1 the flag's view and the rules disagree.** Accepted as today's state, but no still taken under the flag in that window proves a prompt's place.

No route-contract finding: the level check's progression lines match in both layouts and nothing is reached before its ability. Co-op: spawn stays in front of the hall as the meeting place (town-layout call 19).

### What the stills must show

- **F1** (`?home=b`, `q1-done`). The platform, from the hall's back bay: the lane beside the rack with a player in it, the head ramp at its end, the goods door with the forge through it. Arrival, from spawn at `awake` at eye height: Sleeves, the shelf and the open bay all readable, Sleeves clear of the bay.
- **F2.** None of its own; if the crossing rides it, one still from where line 2's train stops, showing the boards and the stall's sockets in one frame.
- **X1** (no flag). Arrival as above. The platform at `trains-on`: a train at each edge, the gap from deck to car floor, both levers and plaques. The turnout, in real time from the island's end ramp as a line 1 train leaves: no car corner over the next rail or the ramp's foot, and no snap between cars worse than at s 182. The Roundhouse from bearing 15° with the table turned: stand, jib and crew outside the deck's sweep, the jump-in landing free. From the commons at G toward the hall. The two videos as planned.
- **R2.** From the commons and from the top of the dock street, also at phone size: the gate cottage's open door reads as a way in; the finders' bay no longer hides the hall.

### Cleared to build

- **F1: now.** View only, behind the flag. Add the arrival still.
- **F2: now.** The fourth car landed on main (f464b11d2); merge main first. Add the crossing.
- **R1: now.** View only and independent of the flip.
- **X1: approved and implemented, 13 November.** The owner approved the flip and one bump; finding 1's frozen-planting method is built. X2 rides it. See the proof report for what is still owed before ship.
- **R2, R3: after X1.** R2's empty room proceeds on call 12 unless the owner answers question 3 otherwise.

### Owner questions (his to answer)

1. **The flip under "Engine foundations first".** Recommended: **yes.** It moves constants and one table, adds no component, op or system, so there is nothing to migrate; he agreed to the flip on 13 November. The one cost is a collision if the engine work is open on `src/sim/railway-lines.ts` at the same time.
2. **One bump at X1, perhaps a second at R2.** Recommended: **yes**; his standing calls already cover it.
3. **The first sealed building opens empty.** Recommended: **yes.**

### F1 and F2 as built: design ruling (designer, 2026-11-13)

On `home/flip-f1` at fe9366edd, view only, behind `?home=b`. Read: the builder's notes under F1 and F2, `CROSSING`, `ISLAND_LEVER` and `shuntPath` in `src/place/home-station.ts`, `roundhouse-view.ts` (the shunt has no collider), and five stills in `.look/` (taken at `q1-done` on 724e05d6b with uncommitted changes, before the two commits).

**Seen.**

- `f1-platform-still`: from the hall's back bay a player stands on the pale apron with clear ground either side; the north wall has a gap with the forge and a worker through it; the crane and both buffers read. I could not pick the rack out with certainty from the hall's posts and the buffer in this frame, so the 1.97 m lane rests on the builder's measurement and its test, not on this still.
- `f1-arrival-still`: Sleeves stands on the sand at the frame's lower left, in front of the wall and post; the open bay between the two posts is clear and shows through to the apron; the shelf fills the right. He is close to the frame's edge.
- `noflag-arrival-still`: the old Home, Sleeves in front of the shelf, no station. The default view is unchanged.
- `f2-crossing-tail-still`: the boards lie over road 2 with a player on them, at the buffer; beyond them open grass, the garage's stand, then the stall's grey frames and the table's deck. The stall reads as a place; its sockets do not read as sockets at 23 m.
- `f2-crossing-still`: from down road 2 toward the hall, the boards sit tight against the buffer and the hall's end.

**Not seen.** The island's deck, both ramps, the moved levers and their prompts, any train, the cart, the shunt (the deck drops in with the trains and `q1-done` has none). So no still shows the step from the head ramp onto the boards, or the boards from where a player gets off line 2's train. Phone size. Two players in the lane.

| # | Deviation | Ruling |
| --- | --- | --- |
| 1 | The crossing on the buffer stub (road 2, s 2.0 to 3.6) instead of the island's far end | **Accept the site.** The far end has 1.05 m between the engine's nose and the points; boards there would sit under a standing train. It meets the condition in the sense that matters (flow rule 1): it is behind the train's tail, off the points, and from it the stall is in plain sight across open ground. It does **not** shorten the walk: it marks the ramp way (about 36 m in home-station's count), and the 19 m hop off the deck's edge stays the short way. Both are accepted under call 15. One open risk: a player gets off facing the stall with the boards behind them, toward the hall; X1 must show that view. **The shunt over the boards: does not matter.** It is drawn only, has no collider, cannot push or trap, and runs once a build; a wagon passing through a player who stands there is a greybox look, not a rule. Do not add a collider to the boards or the shunt for it |
| 2 | The rack's lane is 1.97 m, not 2.2 m | **Accept.** One player has room; two pass in file; the lane is a side way and the goods door is the other. Do not take the further 0.2 m (0.16 m off the cart is worse). If X1 shows a squeeze, the change is to turn the rack to the station's axis, not to shift it |
| 3 | The island's levers moved to their own edges, 3.70 m apart | **Accept; 0.10 m is enough.** The rule is "no spot offers both prompts"; it is exact arithmetic on fixed points and a test pins it. They cannot go further without leaving the 4.3 m deck. If the prompt reach ever grows, the test fails and the answer is then "the nearer lever wins", not a wider deck |
| 4 | Sleeves 1.9 m in front of the second front post, between the two open north bays | **Meets the condition.** In front of a post is beside a bay, not in it, and the arrival still shows the bay clear |
| 5 | The shunt as two tracks (the deck turns 120°, the pair backs down the spur shunter first, rests at the cusp, the shunter pushes the wagon out), at about twice the planned pace until the flip | **Accept.** The order is a real shunt and reads as one on paper; the pace is wrong only behind the flag and X1's `rollTicks` 110 ends it. Unseen, so X1's video is its proof |

**F1 and F2 may ship now behind the flag.** Nothing waits. All five are Default (placements and one animation order, each one constant or one track to change). The prompt wording "Request stop: to <end>" is placeholder, not The Boogler's, and stays on the suspect list.

**X1 must show, because of these deviations** (added to "What the stills must show"):

1. **The crossing from the train.** At `trains-on`, from the deck where a player gets off line 2's footing wagon, at eye height, facing the stall: are the boards, or the ramp that leads to them, in frame, and does the stall read as the goal. Then one from the head ramp's foot: the step onto the boards and the line to the stall's door, with the standing train's tail and the cart's forge stop in frame. If the boards are out of sight from the wagon, the fix is a second cue at the stall (a mark at the sockets), not moving the boards.
2. **Both levers and plaques** in the platform still, each under its mast on its own edge, a train at each edge: the lever does not stand in the way of boarding. One frame with a player midway between them: no prompt, or one.
3. **The lane with two players** beside the rack, and the rack's far posts against the cart on road 2 (the cart's reversal video, `q4-arriving`, must have the rack in frame: 0.36 m, no clipping).
4. **The roll-out video** (`cradle-fitted`, real time, at 110 ticks) framed to hold the table, the spur, the cusp and the boards: the deck's 120° turn, the pair backing down shunter first, the rest at the cusp, the push out. It passes if the direction change reads as meant and the wagon ends where line 2's train takes it.
5. **Arrival** with Sleeves whole in frame from spawn's own camera, also at phone size (he is at the edge of F1's frame).
