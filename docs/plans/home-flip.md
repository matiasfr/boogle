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
- [ ] **R1. Interiors draw by the door. View-only.** town-layout step 7 as written (`src/entities/town/rooms.ts`: `ROOM_CAM.drawWithin` from the door, about 18 m). Verify: a look walking into Pip's house; `npm run bench` at `town`, reported.
- **R2 and R3 are replaced by the blockout steps B1 to B4 and the detail steps D1 to D5 (planner, 14 November; owner: "I think it'll be easier to block out the spacing first and then fill in the details of the constructions later.").** What they build, the terrain, the level findings, the calls and the questions are in [The Round, blockout first](#the-round-blockout-first-14-november). Where the design review below says R2 or R3, read B1 to B3 and D1 to D2. Every B step is `src/place`, `src/content` and `src/entities/town` only: no `src/sim`, `src/world`, `src/net` or `server/` file, no `WORLD_NS` bump. Each has one proof look at `--rail-seed q6-done` and one plan-sheet check (`npm run town-plan-sheet`); the full check, the bot and the probes are B4's.
- [x] **B1. The ground, the streets and the one cottage. View and collision data (`src/place`); normal review. Builds: Codex, gpt-6.1-sol medium.**
  - `src/place/town-plan.ts`: add `TOWN_GROUND = { r: 38, soft: 8 }` and the street lines as data: `TOWN_STREETS.camp.head = slotPoint(40, 17)` (−104.07, 7.05), `TOWN_STREETS.quarry.head = [slotPoint(130, 17), (−97.85, 38), (−97.85, 58)]`, `TOWN_STREETS.dock.line = [slotPoint(250, 38), slotPoint(250, 20)]` ((−150.71, 33.07) to (−133.79, 26.91)).
  - `src/place/layout.ts`: `TOWN.start` is the one gate cottage, `cottage(g.x, g.z, g.yaw, true)` with `g = townBuilding('gate')`; `PATHS[0].pts[0]` becomes the camp head (the next point stays (−98, −6)); `PATHS[1].pts[0]` is replaced by the three quarry head points, then (−100, 62) as today, and **`bridgeAt` becomes 8** (two points are added before the bridge).
  - `src/place/shore-layout.ts`: the six points after (−165, 32, 14) become the dock street's two.
  - `src/place/tech-layout.ts`: the `yard` secret at `TOWN_PROPS.yard` (−145.44, 14.71), `from` (−136, 22).
  - `src/place/terrain.ts`, in `bake()`: after the village pad, `pad(TOWN_CENTRE.x, TOWN_CENTRE.z, VILLAGE.y, TOWN_GROUND.r, TOWN_GROUND.soft)`; the plots loop also pads every `TOWN_SLOTS` row (same radius rule); after the `PATHS` strips, paint the ring road into `pathMask` (cells 14 to 20 m from G, 1 m soft edges, heights untouched) and lay the dock street with `strip(samplePath(dock), 4, 6, true, undefined, false)` (8 m wide, level at 18, `clearMask` untouched).
  - `src/place/folk.ts`: `WANDER` moves onto the ring road and the green (`slotPoint(b, 17)` at 45° steps, and G ± 6 m).
  - `test/town-plan.test.ts`, new cases: "the ground under the Round is level" (within 0.05 m of 18 at every footprint corner and 3 m apron, on the ring road, and on the dock street to r 36; the hall's apron, bearings 60° to 100° beyond r 18, may rise 0.25 m); "the tree table is main's" (`LAND_TREES.length` 362, no trunk within 46 m of G); "no footprint corner is within 2.4 m of a road's centre line" (both path heads and the dock street); "the quarry path's bridge still spans the river" (`pts[bridgeAt]` is (−36.5, 112.4)).
  - Verify: that test, `test/railway.test.ts` (the tree pin: if it fails, shrink the pad, do not bump), `test/curio-layout.test.ts`; `npm run level-check -- --place=place` exits 0. **Look:** from the top of the dock street (−150.7, 33.1) at eye height toward 70°: the street, the gate cottage on the left, the ring, the hall. **Sheet:** the gate cottage, the `yard` find, both path heads, the dock street and the ring read "as built = plan"; no ground cell inside r 38 is off 18 m except the bowl and the hall's apron.
  - **Independent review correction, 14 November.** The earlier B1 proof missed terrain penetrating the occupied house/shop and laundry/fences left at the removed yard. B1 now travels with B2: the rooms leave the bowl and each receives a level pad and a shallow door threshold below its 0.14 m slab (the shared `ROOM_FLOOR`). These thresholds add a third explicit exception to the 18 m ground rule, alongside the bowl and hall apron. The yard find, laundry and both solid fences share `YARD_DRESSING.anchor`. Main's amended bay/shelf pair stays put. [Current repairs, measurements and evidence](../reviews/round-blockout-b1-b2.md); the earlier B1 report is superseded. B4's walk, reach probes, full route and device proof remain separate.
- [ ] **B2. Rooms and the balcony move, as they are. View-only data; normal review. Builds: Codex, gpt-6.1-sol medium.**
  - `src/place/layout.ts`: `ROOM_PLOTS.house`, `.shop` and `.museum` become `{ ...townBuilding(id), high }` (3.7, 3.9, 5 kept). The real shells, interiors, residents and plot boards go with them (they are in each room's own frame).
  - `src/place/tech-layout.ts`: the `balcony` pad and secret at `TOWN_PROPS.balcony` (−119.20, 53.49), top 24.4 kept.
  - **Bay move already built on main, #1778 (14 November). Do not move it again.** `FINDERS_B` is at (−87.86, 21.31), 1.42 m behind the original plan along the hall's axis; the shelf stands beside it at (−85.74, 27.14), both facing 250°. `TOWN_PROPS.bay/shelf` read these frames and expose their drawn-crown footprints. The boxes followed the bay; the plinth stays at (−94.17, 23.61), through `PLINTH_OUT = 6.72`. See [town-layout's amendment](town-layout.md#what-stands-and-when).
  - Tests: retain `test/curio-layout.test.ts` and the drawn-crown assertions in `test/town-plan.test.ts` (shelf to plot 3 at least 1.1 m); add "what stands is where the plan puts it" for the three moved rooms and balcony. B1 already fixed `test/prefab-furnishing.test.ts` to import the evaluated `ROOM_PLOTS` table honestly. Gate cottage and bay/shelf are already at their plan poses.
  - **Review regressions:** `test/round-grounding.test.ts` covers the complete footprint of every room against the rendered heightfield, actual floor-to-door ground within 5 cm, and executes the real yard dressing block to pin its ground query, laundry and two solid fences to the find. Room furnishing world transforms are regenerated for the moved frames; fixture topology and every character line remain unchanged. No sim, server, catalogue or namespace change is needed.
  - `docs/game-design/place.md` (the town's section) for B1 and B2 together.
  - Verify: those tests; `npm run level-check -- --place=place` exits 0 with "the balcony: 147 m away, budget 187 m". **Look:** from above G, about 70 m up, north at the top. **Sheet:** Pip's house, Fine Prices, the museum, the balcony pad and the bay read "as built = plan"; every wall-to-wall gap under 4 m is printed and none is under 2.4 m.
- [ ] **B3. The blocks: eight plots, their door sides, the clock's footing. Player-visible; normal review. Builds: implementer agent, fable medium.**
  - `src/place/layout.ts` (the one layout helper content may import): `TOWN_BLOCKS`, generated from `TOWN_PLOTS.order` through `townBuilding`: `{ id, x, z, yaw, w, d, high }`, `high` the kit's eave above the ground, read from the kits (house: 0.14 m slab + 3.7 m wall = 3.84; cottage: the eave the 0b probe stood on, 3.0); `TOWN_FOOTING = { ...TOWN_PROPS.clock, w: 5, d: 5, high: 0.3 }`.
  - `src/content/levels/town-blockout.ts` (new, written by hand; `prefab:new` would add a record): `defineLevel({ place: 'town-blockout', placements })`, generated from `TOWN_BLOCKS`. Per plot: `town.block.<id>`, prefab `greybox.box` (the shared unit box with its collider), `pos [toWorld(x), 18 + high / 2, z]`, `rot [yaw, 0, 0]`, `scale [w, high, d]`, colour `#9c9ea1`; `town.block.<id>.door`, prefab `greybox.decoration` (no collider), 1.2 × 2.0 × 0.12 m on the door face (local z = d / 2 + 0.06, y 1.0), colour `#e4e5e6`; `town.block.<id>.mat`, `greybox.decoration`, 1.6 × 0.06 × 1.2 m on the ground outside the door (so the door side reads from above). `town.footing`: `greybox.box`, 5 × 0.3 × 5 m at G. 25 placements, **no new record**. `npm run prefabs` writes `content/built/levels/town-blockout.json`.
  - `src/entities/town/blockout.ts` (new): `createTownBlockout(owner)` loads the artifact (`loadLevelArtifact(level, definitions)`) and instantiates the placements in one batch, as `src/entities/route-greybox/boxes.ts` `drawGreyBoxes` does for `massing-west.ts`; mounted from `src/entities/town/view.ts` in every town state (the blocks read no fact).
  - `test/town-plan.test.ts`: "every slot is drawn once" (each `TOWN_SLOTS` id is exactly one of a `ROOM_PLOTS` key, the `TOWN.start` cottage or a `TOWN_BLOCKS` row); "the built level is the plan" (eight solid boxes whose pose and scale equal `townBuilding(id)` within 0.01, each door mark on its door face). `test/prefab-portability.test.ts`: the budget comment's new counts.
  - Verify: those tests; `node dev/ship-check.ts`. **Look:** from the hall's front (−94, 13) at eye height toward 250°: the green, the footing, the ring of blocks with their door marks. **Sheet:** eight block rows with a door tick each; the footing at G.
- [ ] **B4. Checkpoint: the blockout walked and measured. Runner: Codex, gpt-6.1-sol medium; visual review by a fresh subagent, fable medium.** Once: `npm run check:full`; `npm run level-check`; `npm run town-plan-sheet` with the sheet committed under `docs/world/`; the bot's `playthrough --to forge-lit` (its Home waypoints cross the old square); `dev/look/evals/railway-finds.ts` (the `yard` find on real ground, the balcony by glide); one probe eval kept out of the repo, as step 0b was (the second jump onto plot 1's house block; plot 4's cottage block to the museum's roof; the bay to the hall's roof and down); `npm run perf` at the `town` pose, reported. Looks: from above; the top of the dock street at phone size; a real-time video once round the ring road (107 m, 19 s). Then the designer rules on the level findings, and the owner walks it live. A spacing change after that is an edit to a `town-plan.ts` row and a re-run of the sheet.
- [ ] **D1. The gate cottage opens. View-only.** `RoomId` gains `gate`; a cottage-kit room through `createRooms` with a plain greybox interior and a door that opens (design review call 12). Look: its open door from the dock street, also at phone size. Builds: implementer agent, fable medium.
- [ ] **D2. The green and the kerb. View-only; render.** town-layout step 3 as written (`src/entities/town/streets.ts`): one merged kerb and green mesh over B1's paint. Look: from the hall's front; `npm run perf`, reported.
- [ ] **D3. The forge's west door.** town-layout step 4b as written.
- [ ] **D4. Stakes, boards, the footing and the clock.** town-layout step 5 as written. The eight plot rows leave `TOWN_BLOCKS` here, once the owner has signed off the spacing (question 1), and the footing's block gives way to the stone one.
- [ ] **D5. A bought house.** town-layout step 6, the passenger trade's; held by "Playtest before bespoke functionality" and "Engine foundations first".

## The Round, blockout first (14 November)

Planner, 14 November 2026. Replaces R2 and R3. Plan only: the positions were applied to a scratch copy of `src/place`, measured and checked, and reverted.

**The owner's words (14 November 2026).** "At what stage are we implementing the new town layout? It should be helpful to be able to plan from the top down, right?" "I wouldn't draw the radius by cost. It should just be well placed, and we should be able to modify terrain even if needed to achieve our vision." "I think it'll be easier to block out the spacing first and then fill in the details of the constructions later." Standing calls: [Block out spacing first, details later](../agents/owner-calls.md) and "Place for the look, not the cost; terrain may change".

**Goal.** Stand the whole Round in the live game as plain blocks at true size and position, on ground shaped for it, so the spacing is judged by walking it and from a top-down sheet before any construction is detailed. Serves "Understandable at a glance" and **7. Telegraph everything**; it bends the decided "unbought plots stay empty ground" for the length of the blockout (question 1).

**Research:** as [town-layout](town-layout.md) cites (growing-towns: street widths, the plaza, the 30 to 60 s loop; level-design: walk-seconds, a hub). No departure. No doc in `docs/research/` covers blockout practice. Not a port from Place. `npm run loop -- node` was not run: no bill, supply, cue or rail rule changes.

### What the blockout builds

| Thing | In the blockout | Step |
| --- | --- | --- |
| The hall, the island, the Roundhouse | As they are; they do not move | |
| The forge | As it is at (−87, −3); its west door is D3 | |
| Pip's house | The real room, moved 16.6 m to (−110.54, −5.23), facing 190° | B2 |
| Fine Prices | The real room and its balcony, moved 15.1 m to (−119.52, 45.68); a stake board there before T3, as today | B2 |
| The museum | The real room, moved 0.3 m and turned 36°, at (−125.27, −8.11); a stake board before T3 | B2 |
| The gate cottage | The real cottage, moved 9.0 m to (−138.84, 15.87), still sealed; it opens in D1 | B1 |
| The other three cottages | Removed | B1 |
| Plots 1, 2, 3, 6, 8 (houses) | Blocks, 7.4 × 7.4 × 3.84 m, a pale door panel and a mat on the door side | B3 |
| Plots 4, 5, 7 (cottages) | Blocks, 5.4 × 4.4 × 3.0 m, the same marks | B3 |
| The clock | A footing block, 5 × 5 × 0.3 m, at G; no clock | B3 |
| The green | Grass inside 14 m of G: the unpainted middle of the ring | B1 |
| The ring road | Path paint on the ground, 14 to 20 m from G | B1 |
| The dock street | Path paint, 8 m wide, levelled at 18 m from r 38 to r 20 | B1 |
| The camp and quarry roads | Today's paths, their heads moved to the ring's mouths at 40° and 130° | B1 |
| The finders' bay and curio shelf | Already built on main (#1778): bay (−87.86, 21.31), shelf (−85.74, 27.14), facing 250°; drawn crowns are the footprint authority | Built before B1 |

Block heights are the kits' eaves, so what can be climbed is what the real building will allow. Roads and the green are paint on the terrain's path mask: no mesh, no collider, no record.

**Records.** Placed content comes from records, and the shared catalogue is at 188 of 200 records and 334,626 of 350,000 bytes (`test/prefab-portability.test.ts`). The blocks need **no new record**: one shared definition, `greybox.box` (and `greybox.decoration` for the marks), with 25 generated placements in one new level, about 3 kB. `codex/prefab-data-step-10b` stands at 347,058 bytes, so whichever lands second meets the byte ceiling (Risks).

### Terrain

Measured on the 2 m grid at the planned positions, on main:

- **The Round already fits.** Every footprint and its 3 m apron is at 18.00 m, except plot 1's back apron (17.73) and plot 8's (17.98). The green is 18.00; the ring road 18.00 to 18.10.
- **The west and south-west rim is low.** Between 20 and 36 m from G the ground is 17.50 to 18.25, lowest at bearing 224°, r 36. Past r 37 it falls to the cove: 15.7 m at 262°, r 44; along the dock street 17.3 m at r 40 and 14.5 m at r 50.
- **The hall's apron rises.** On bearing 70° the ground is 18.07 at r 22 and 18.21 at r 26 (the hall's floor is 18.34). Once the quarry path no longer starts in front of the hall, the ring road's east edge at 90° reads 18.22. A slope, not a lip.

Reshaping, in B1: one level pad at G (r 38, 8 m soft edge, 18 m), a pad under each road plot, and the dock street 8 m wide and level to r 36. With them every footprint and apron is 18.00, the fronts 17.85 to 18.22, and the street's top is flat. That is all the Round needs. A bolder move (a terrace or steps where the ground falls west of r 37, a raised or sunken green) is the owner's to ask for (question 2).

**No `WORLD_NS` bump.** Place's ground is client data: no file under `src/sim`, `src/world` or `server/` reads `src/place/terrain.ts`, and the server's baked land (`home-land.json`, `boogler-land.json`) is the home island. The sim's one tie to this ground is the tree table (`RAILWAY_SOURCES`, pinned by `test/railway.test.ts`), and with the pad at r 38 it is identical: all 362 trees, none within 49 m of G. A pad of r 40 with a 10 m edge removes tree 169 at (−158.45, −2.85), which would break the pin and need v45. If the owner wants ground that covers a tree, that step regenerates the table, bumps to v45 (the next free) with a dated history line, is built by gpt-6-astra high with an independent review, and ships when ready.

### What moves with gameplay attached

**B1 reconciliation after #1778 (14 November).** The bay and shelf are already built at their amended Round poses; B2 moves neither. This replaces the earlier bay-position estimates in the dated trial findings and design review below. B1 leaves `FINDERS_B`, `SHELF_B` and their drawn-crown footprint data unchanged. Minimum horizontal clearances, from the actual crown edges (ring outer edge r20, dock street's 8 m edge, bowl bank edge r14):

| Crown | Ring road | Dock street | Plot 3 | Bowl edge | Ground under centre/corners |
| --- | --- | --- | --- | --- | --- |
| Bay | 5.622 m | 41.128 m | 5.011 m | 11.622 m | 18.000–18.210 m; its hall end sits in the existing rise |
| Shelf | 8.070 m | 42.561 m | 1.149 m | 14.070 m | 18.000 m |

The shelf-to-plot-3 assertion retains its 1.1 m minimum. The hall/rail apron reaches inward to about r17, not only beyond r18 as estimated; B1 retains its 0.22 m rise and tests that measured exception. The later shore grading preserves the r38 pad, rather than cutting four west-edge cells back down. The sheet now shows both crowns in the built and planned layers, baked height/paint cells, trees and the `yard` find; only the still-unmoved rooms have movement arrows.

**Future rotunda: no B1 ground conflict.** [roundhouse-rotunda](roundhouse-rotunda.md#design) proposes a 25 m outer-radius arc at (−55.445, 19.178), bearings 120°–260°. Its nearest point is 35.111 m from G: 21.111 m clear of the bowl and 15.111 m clear of the ring. The planned 7.5 m gap from its back wall to plot 3 is unchanged. B1's level pad is compatible with the future 18 m arc pad; the proposed arc still spans ground about 17.848–18.652 m and needs its own grading and pit. No rotunda geometry, terrain or rules are built by B1.

| Thing | How it survives |
| --- | --- |
| The `yard` find | Moves behind the gate cottage to (−145.44, 14.71), 30.5 m from G, ground 18.00. Found before any ability, as today. B1; `railway-finds.ts` at B4 |
| The balcony pad and its find | Stay in the shop's frame: (−119.20, 53.49), top 24.4. The level check: 147 m from the summit, budget 187 m; out of reach without the glider by terrain. B2 |
| The roof hop to the balcony (0b, a) | Closes in B1: the cottage it starts from is removed, and the shop moves 21 m from the nearest cottage in B2 |
| The hall's roof from the bay (0b, c) | Bay already moved on main (#1778); B4 re-probes the paired bay/shelf at the 1.42 m setback: a perch, a way down on every side |
| The double-jump course | Untouched. Its nearest pad, j7 at (−94.5, −36.8), 8.4 m up, is 14.8 m from plot 7's block; nothing stands north of z −30 |
| Spawn | Unchanged: (−97, 14), yaw −0.62, in front of the hall, 19.0 m from G on the ring road's outer edge. The bold camp path now starts 9.9 m away at the 40° mouth; the ring road's paint runs under spawn to it |
| The first-run landing and the walk in | `SHORE_LANDING` unchanged; the shore path ends as the dock street at the ring instead of bending between cottages |
| The finders' bay, its boxes and plinth | Already moved on main (#1778) through `bayPoint`; the setback bay keeps the plinth's old Round position with `PLINTH_OUT = 6.72`. B2 leaves all of them in place |
| Trees | All 362 kept, same ids (above) |
| Little guys | One door (the gate cottage); they wander the ring road and the green. B1 |
| A saved pose inside a new footprint | Refused by the pose policy: `ROOM_PLOTS` for rooms, the collider sweep for blocks and the cottage; the player returns at spawn |
| The bot | Reads `PATHS`; its Home waypoints are re-run at B4 |

### The plan sheet

`npm run town-plan-sheet` (`dev/level/town-plan-sheet.ts`, branch `codex/town-plan-sheet`) is the proof for spacing. For that, it must show:

1. **Two layers from source:** the plan (`town-plan.ts`: slots, ring, green, streets, props) and what is built (`ROOM_PLOTS`, `TOWN.start`, `TOWN_BLOCKS`, `PATHS`, `SHORE_PATH`, `FINDERS_B`, the `yard` and balcony secrets, spawn, the hall, the forge). Any built outline more than 0.05 m or 0.5° off its plan row is listed, and `--check` exits 1 on it.
2. **Every footprint to scale** with a tick on its door side, its id, kit and state (room, cottage, block, stake board).
3. **Spacing as numbers:** each wall-to-wall gap under 4 m; each door's distance to its road's edge; street widths; the radii 14, 20 and 22 m and the 30° grid.
4. **The ground:** every 2 m cell inside r 46 that is off 18 m by more than 0.05 m, tinted with its height; the pad's edge; the trees.
5. **Gameplay marks:** spawn and its yaw, the `yard` find, the balcony pad, the bay with its boxes and plinth, the jump course's pads, the shelf, Sleeves.
6. A scale bar, north, the source commit and a stamp.

### Details replace blocks, one building at a time

After B4 and the owner's walk, each construction is its own commit: its row leaves `TOWN_BLOCKS` in the commit that mounts the real thing at the same `townBuilding(id)` pose. The test "every slot is drawn once" keeps a slot from being drawn twice or not at all; the sheet shows each slot's state; the proof is one look from that building's door side. Order: D1 to D5 in Steps.

### Level findings (blockout)

`npm run level-check -- --place=place`, run on cc5e3dcfa with B1 and B2 applied (rooms, gate cottage, three cottages removed, both finds, both path heads, the dock street, the pad and plot pads):

1. **Exits 0, 0 problems.** Against main: production grounding 5,278 to 5,275 placements; timber against track 563 to 399 decks (the three cottages); the balcony 143 to 147 m from the summit (budget 187 m); village to the machine the long way 431 to 430 m; the commons mark 17.4 to 17.5 m. Every progression line is the same: nothing is reached earlier by terrain.
2. **The quarry road as planned clips plot 2.** A straight line from the 130° mouth to (−100, 62) passes 0.48 m from plot 2's east corner (today's path passes it at 2.2 m, inside the 2.4 m half width). B1 threads the road down the 7.3 m gap between plot 2's corner and the fronts of plots 3 and 6, at x −97.85: 3.65 m each side. New (designer).
3. **`bridgeAt` is an index.** Adding two points to the quarry path's head without moving `bridgeAt` from 6 to 8 puts the footbridge on the wrong segment, and the level check still exits 0. B1 pins it with a test.
4. **Road clearances** (nearest footprint corner to a centre line): camp road, the forge 6.08 m, Pip's house 6.39, plot 7 6.48, the hall 7.58; dock street, plot 1 7.80, the gate cottage 8.66.
5. **Not seen by the tool** (it floods terrain and knows no blocks, roofs, props or paint), by arithmetic:
   - A house block's top is 3.84 m; the second jump's best rise is 3.3 m. It cannot be mounted from the ground, with 0.54 m to spare.
   - **Plots 1 and 2 now stand from arrival, 3.0 m from Fine Prices.** The 10 November review closed this because a plot was bought after the glider. During the shop's own site (a 2.04 m walkway for about 7 s at T3) a second jump reaches 5.3 m, over the block's 3.84; from the block's top 7.1 m, over the shop's roof at 5.86 and on to the balcony. A narrow window, once a world: P3. B4 probes it.
   - Plot 4's cottage block (3.0 m) is 3.67 m from the museum (5 m walls): the museum's roof is probably a perch with the second jump. No reward there.
   - Plot 7's cottage block is 14.8 m from the jump course: no reach.
6. **Reachable before the ability that should gate it:** nothing new by terrain; the balcony by finding 5's window, unproven.

### Risks (blockout)

- **Room safety:** nothing writes shared state; no op, state key or wire shape. Views read constants.
- **Hotspots:** `src/place/layout.ts`, `terrain.ts` and `tech-layout.ts` are read by the railway views, the level tools, the bots and the pages; B1 and B2 are one short branch each, in order. `npm run inflight` (14 November) names no branch on those files (its file lists are cut short, so check again before B1). In flight beside this: R1 on `src/entities/town/rooms.ts` (B3 edits `view.ts` and adds a file, not `rooms.ts`), `codex/town-plan-sheet`, `codex/prefab-data-step-10b`.
- **The catalogue's byte ceiling.** 15.4 kB are free on main and 2.9 kB after step 10b; the blockout level is about 3 kB. The ceiling is a test constant; raising it is the orchestrator's ruling, not a reason to drop blocks.
- **Mixed builds:** two tabs on different builds stand on different ground and see different buildings until they reload. Accepted in development; no compatibility code.
- **Between B1 and B2** Pip's house stands on the green and Fine Prices on the ring road's inner edge (about 3 m of road stays clear). The bay and shelf already stand together beside the hall (#1778), outside the bowl and ring. A day's oddity on the live game; nothing is blocked.
- **Performance:** three cottages fewer (164 boxes), 25 instanced boxes more in one batch, no light; `npm run perf` once at B4, reported.

### Calls for the designer (blockout)

| Call | Kind |
| --- | --- |
| Block out spacing first; the blockout ships live | Decided (owner, 14 November) |
| Terrain may be reshaped for the layout | Decided (owner, 14 November) |
| Blocks stand on the eight unbought plots during the blockout | New (question 1) |
| Block height is the kit's eave; a pale door panel and a ground mat mark the door side | Default |
| The pad at G is r 38 with an 8 m edge: the largest that keeps every tree | Default |
| The dock street is 8 m wide to r 38, then the shore path's own width down the climb | Default |
| The hall's apron keeps its 0.1 to 0.2 m rise onto the ring road | Default |
| The quarry road runs at x −97.85 between plot 2 and plots 3, 5 and 6 | New (finding 2) |
| The bold camp path starts at the 40° mouth, 9.9 m from spawn, joined by the ring road's paint | New |
| The plinth's rule becomes "beside the ring road" (1.1 m), not "near the quarry road" | Default |
| House blocks beside Fine Prices from arrival (finding 5): leave, raise them, or hold plots 1 and 2 as stakes | New |
| Fine Prices and the museum stay stake boards before T3, not blocks | Default |
| The gate cottage stays sealed until D1 | New (question 3) |

### Open questions for the owner (blockout)

1. **Do blocks stand on the eight unbought plots, live, until you sign off the spacing?** The decided rule is that an unbought plot is empty ground. Recommended: **yes**, so the whole town's spacing can be walked now; after your sign-off they become stakes (D4).
2. **Is a level town enough for the blockout, or do you want a bolder ground move now?** The Round already sits on flat ground; B1 only fills dips of up to 0.5 m and widens the top of the dock street. Recommended: **level for now**; walk it, then say where the ground should rise or step (the west rim, where it falls to the cove, is the natural place).
3. **Can the gate cottage wait one step to open?** On 12 November the sealed buildings were to open with the Round's first build. Recommended: **yes**: its place should be signed off first, and D1 is the first detail step.

### Design review (designer, 2026-11-14)

**Read and run:** this section and steps B1 to B4 and D1 to D5; the owner's three sentences; owner calls "Block out spacing first, details later", "Place for the look, not the cost; terrain may change", "Small rulings are the orchestrator's" and "Playtest before bespoke functionality"; [town-layout](town-layout.md)'s Round and its 10 November review; the rail and rewards Current rules for the town (the Round, built regular; unbought plots stay empty ground; the gate cottage opens empty); the top-down sheet (`.look/owner/town-plan-sheet.png`, source e08abacf7); the top blocks of growing-towns and level-design. One measurement of my own: the ground's height on this branch (main's ground) sampled from G every 20° out to 70 m.

**Not seen:** nothing of the Round stands in the game, so no still from the player's eye could be taken; everything below is read from the sheet, the plan's numbers and the height samples. The playtest CLI was not run: the 10 and 13 November reviews found no town-centre moment in its sessions. No Place port is involved, so no fit check is owed. No line of The Boogler's copy is touched.

#### Calls

| # | Call | Kind | Ruling |
| --- | --- | --- | --- |
| 1 | Block out spacing first; the blockout ships live | Decided | Owner, 14 November |
| 2 | Terrain may be reshaped for the layout | Decided | Owner, 14 November |
| 3 | Blocks stand on the eight unbought plots until the spacing is signed off | New | **Yes.** The owner's call asks for the layout "as plain blocks at true size and position"; spacing cannot be walked on empty ground. It bends "unbought plots stay empty ground" (rewards, 10 November) for a stated time only: the rows leave `TOWN_BLOCKS` at D4. The blocks must keep reading as stand-ins (one flat grey, no roof), which the plan does. His to overrule (question 1) |
| 4 | Block height is the kit's eave; a pale door panel and a ground mat on the door side | Default | Accept. True heights are what make the climbing findings honest |
| 5 | The pad at G is r 38 with an 8 m edge | Default | Accept. It is the largest that keeps the tree pin, so no bump |
| 6 | The dock street is 8 m wide to r 38 | Default | Accept (10 November review, call 21) |
| 7 | The hall's apron keeps its 0.1 to 0.2 m rise | Default | Accept. The hall standing a little above the green is right (finding 4) |
| 8 | The quarry road runs at x −97.85, 3.65 m clear of plot 2's corner and of the fronts of plots 3 and 6 | New | **Accept.** A 4.8 m road in a 7.3 m gap between 3.84 m walls is the town's one two-sided street, which the 10 November diagnosis asked for. The verge at the pinch is 1.25 m a side; if two players and riders squeeze there on the walk, move plots 3, 5 and 6 east by a metre, not the road |
| 9 | The bold camp path starts at the 40° mouth, 9.9 m from spawn (5 m today), joined by the ring road's paint | New | **Accept.** The first goal does not depend on it: the forge's frame is 20 m from spawn in plain sight and Sleeves stands beside it. One condition, in B4 (finding 2) |
| 10 | The plinth's rule becomes "beside the ring road" | Default | Accept |
| 11 | House blocks on plots 1 and 2 stand 3.0 m from Fine Prices from arrival; a second jump from the shop's site walkway may reach the balcony | New | **Leave them.** Do not raise them (a false height defeats call 4) and do not hold them as stakes (they frame the dock street and the shop, the first spacing a player meets). The window is about 7 s once a world, the balcony is a cosmetic find and not a gate (10 November, call 12), and the blocks go at D4; a bought house there always comes after the glider. B4 probes it; if the hop lands it is logged and stays until D4 |
| 12 | Fine Prices and the museum stay stake boards before T3 | Default | Accept. In a fresh room the ring has two holes at 190° and 340° while later plots are blocks; the shared room and the `q6-done` looks are past T3, so the walk is not affected |
| 13 | The gate cottage stays sealed until D1 | New | **Yes, with one change of order: D1 follows B3 and runs beside B4; it does not wait for the owner's walk.** The room is drawn in the cottage's own frame from `townBuilding('gate')`, so a later spacing edit moves it with its row. That keeps "sealed buildings open with the first version of the updated town" (owner, 12 November). A small ruling, not a question |
| 14 | The `yard` find behind the gate cottage at (−145.44, 14.71) | Default | Accept (10 November, call 14). Ground there is 18.0 to 18.1 and the fall starts past r 38. From the top of the dock street it lies 19 m to the left in the open, since the cottage's back faces the walk in: a find for looking left, as intended |
| 15 | The hall's roof is a perch from the moved bay | Default | Leave it, as ruled on 10 November. It is also the best place in the game to judge the Round from. B4's probe must show a way down on each side |
| 16 | The green is a shallow bowl, 0.8 m down at the middle, the ring road and every footprint staying at 18 m | New | **My recommendation, added to B1 as one tunable** (finding 4, question 2) |

Decided 2, Default 7, New 6.

#### The spacing, as a player would feel it

At 5.6 m/s walking and 9.5 m/s sprinting:

| Leg | Metres | Walk | Sprint |
| --- | --- | --- | --- |
| Across the green, edge to edge | 28 | 5 s | 3 s |
| Door to door across the Round (Pip's house to Fine Prices) | 44 | 8 s | 5 s |
| Spawn to the gate cottage's door | 40 | 7 s | 4 s |
| Hall front to the footing at G | 23 | 4 s | 2.5 s |
| Once round the ring road | 107 | 19 s | 11 s |
| Shore landing to the gate cottage's door (straight) | 63 | 11 s | 7 s |

- **44 m is right, and it is also the floor.** Eight seconds door to door sits inside level-design's "something to do every 10 to 20 s", and three players, a crowd of riders and a 26 m clock need the room. It is not a free number: on the decided 30° grid a 7.4 m house beside the 10 m shop needs fronts at about 21 m or more to keep the 2.4 m alley, so a smaller Round means fewer buildings on the ring. Do not tune the radius in the blockout.
- **It will feel open, not enclosed.** Walls of 3 to 3.84 m across 44 m are about 1 to 11; a square usually stops feeling like a room past 1 to 6 (a common town-planning rule of thumb, not from `docs/research`). The clock carries the middle later; until then the footing is 0.3 m high. This is the main reason for finding 4.
- **Arrival from the hall reads as a town with the blocks on, and that is not the arrival the game will have.** From the hall's front the whole ring shows: seven fronts and the footing within 45 m. The decided arrival is Pip's house, one cottage, two boards and two staked plots. The blockout answers "is the full town well spaced"; it cannot answer "does an almost empty Round read as the start of a town" unless B4 also looks at it empty (finding 1).
- **Crowded: the south-east quarter, a little.** Fine Prices, plots 2, 8, 3, 5 and 6 stand in about 35 by 30 m with five gaps of 2.8 to 3.3 m. It passes the 2.4 m alley rule and it is where the street is, so it stays; walk the alleys between plots 3, 5 and 6 with the camera before anything is detailed. If they pinch, close 3, 5 and 6 into one terrace or open them to 4 m: either is a row edit.
- **Stranded: plot 7.** One cottage 46 m from G, 13 m past the forge's north wall, with nothing opposite. Plots 5, 6 and 8 are not stranded: they are the street. Leave plot 7 where it is for the walk (the forge's rack, chest and oak hold the ground between); if it reads as an outlier, my lean is the west side of the camp road north of Pip's house, so it backs the ring instead of trailing off. Not changed now.

#### Findings

1. **B4 must look at the Round both ways.** Add two stills with the eight blocks hidden by the look's own eval (no player-facing flag): from spawn's camera and from the top of the dock street, at phone size too. They show the arrival state the decided rules describe. Without them the owner signs off spacing on a picture no new player will see.
2. **The bold path now starts off to the side of spawn (flow rule 1, the next goal can be found).** B4's arrival still from spawn's own camera must have the forge's frame or the 40° mouth in frame, and the bot's `forge-lit` segment must show no new idle at Home. If either fails, the fix is a short tangent of path paint from spawn to (−98, −6), today's line, not moving the mouth.
3. **Reach claims still without proof, all B4's:** the second jump onto plot 1's block from the walkway; plot 4's block to the museum's roof (no reward there, accept if it lands); a way down from the hall's roof; a saved pose inside a block returning at spawn. None blocks B1.
4. **Level wastes the permission; block out one move now: the green as a shallow bowl.** Sampled today, the town's ground is 18.0 m flat to within 0.2 m for 50 m in every direction except the west (15.8 m at 260°, r 44, then 7.7 m at r 70 down to the cove). A ring painted on a table reads as a ring only from above, which is the sheet's view and not the player's. Dropping the green to 17.2 m at the middle (level inside about r 10, a bank of about 1 in 4 out to r 14) makes the Round a shape in the ground: every door stands on a rim looking in, the hall at 18.34 m stands highest, riders crossing are seen from every side, and the walk up from the cove crests and looks down across it. It costs one more `pad` call inside r 14, moves no tree, footprint, road or spawn, and B1's level test already leaves the green out. Recommended as `TOWN_GROUND.green = { drop: 0.8, flat: 10 }` with `drop: 0` as level, so the owner walks both. Two things follow in B3: the footing's block sits on the ground at G, not at a fixed 18 m, and `WANDER`'s points on the green take the ground's height. This rests on height numbers and the sheet, not on a still. The west rim (steps or a terrace where the dock street meets the fall) is the second candidate and can wait for the walk.
5. **No route-contract finding.** No bill, gate or ability moves; the level check's progression lines are main's. Co-op: spawn on the ring's east side stays the meeting place.

#### Changes to make before building

- **B1:** add the green's dip as a tunable (finding 4). Not blocking if the planner or owner declines: `drop: 0` is the plan as written.
- **B3:** the footing reads the ground's height.
- **B4:** the two stills with blocks hidden (finding 1); the arrival still and the bot's idle (finding 2).
- **Order:** D1 follows B3 (call 13).

#### Owner questions

1. **Blocks on the eight unbought plots, live, until you sign off the spacing?** Recommended: **yes**; they become stakes and empty ground again at D4. The build proceeds on yes.
2. **A level town, or the green as a shallow bowl in the blockout?** Recommended: **the bowl, 0.8 m, built as a tunable** so you can walk it and set it to zero. It is the one ground move that makes the Round readable from the ground, and it undoes in one number.

The plan's question 3 (the gate cottage) is ruled above and need not be asked.

## Level findings

Run today on `de19c85a3`, `npm run level-check -- --place=place`:

1. **Old Home:** 0 problems (production grounding 5,277 placements; timber against track 569 decks).
2. **Layout B as built** (`BOOGLE_HOME=b`): exits 1 with 3 problems: the rack's foot 5.7 cm off the ground at (913.85, 7.92); "Village/ramp-back passes 26.4 cm into quarry/sleeper/11" and "Village, line 2/ramp-back passes 40.1 cm into timber/sleeper/27".
3. **Layout B with the rack at its planned place** (−84.53, 10.05): production grounding 0 problems. The two ramp findings remain and are the tool's (problem 8): the island builds no back ramp.
4. **Progression is identical in both layouts:** every "ok" and gate line of the place states matches; nothing became reachable before its ability; machine clearance 61,660 poses, 0 problems.
5. **Reported, not failed, for the designer:** line 1's stub turnout at s 36 tightens from an 18.0 m to a 9.5 m radius (line 2's eases from 10.7 to 18.0); four new "straight into an 18 to 23 m curve, no easing" notes at s 45 to 70 on the new heads. The platform edge stands 1.45 m from the rail (0.55 and 0.75 m today).
6. **Not seen by the tool** (it floods terrain at 2 m and knows no props): the hall, the goods door, the garage's pieces, Sleeves. Checked by arithmetic here and by F1's tests.
7. **The Round's positions were not re-run today;** town-layout's findings of 10 November stand (the roof hop to the balcony closes when cottage 2 goes; the hall roof becomes a free perch from the moved bay, ruled "leave it"; the `yard` find is reachable before any ability either way). **Re-run on 14 November with the Round applied:** [Level findings (blockout)](#level-findings-blockout).
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

The blockout's three questions (14 November) are under [The Round, blockout first](#open-questions-for-the-owner-blockout).

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
