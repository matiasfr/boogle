> **Status: proposed (2026-11-13).** Next: the designer rules on the Level findings and the calls; the owner answers three questions; then F1.

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

1. **Trees off the sim's positions: true, and it is the flip's largest hidden change.** `src/place/tree-catalog.ts:35-57` skips a candidate on `catalogClearMask` before its later random draws, so B's cleared ground reorders the planting: 361 trees against 362, the last row differs (`test/town-plan.test.ts:252-254` pins both), while `RAILWAY_SOURCES` (`src/sim/railway-layout.ts:29`) holds A's. Fix, in X1: every candidate draws all its random numbers before any exclusion, so a later change to cleared ground only removes the trees it covers; then regenerate `RAILWAY_SOURCES` by the recipe `test/railway.test.ts:137` already checks. Rides the bump.
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

- [ ] **F1. Fix layout B behind the flag. View-only.** `src/place/home-station.ts`: `PROPS.rack`, new `PROPS.greeter`, a `HALL.goodsDoor { a0: -8.9, a1: -7.4 }`. `src/place/layout.ts`: `GREETER = HOME_B ? PROPS.greeter : SHORE_WORKER`; `src/entities/railway/greeter.ts:57` reads it. `home-station-view.ts`: the north wall in two boxes round the gap. `garage-geo.ts`: row `b` as problem 2. `dev/level/timber-track.ts`: no back ramp for an island. Tests: `home-station.test.ts` gains "the rack leaves 2 m on road 1's side and stays on the apron" and "the greeter is outside the shelf's reach"; `garage-geo.test.ts` runs its sweep, legs and landing tests on row `b` too, measured from `TABLE`. Verify: those tests; `BOOGLE_HOME=b npm run level-check -- --place=place` exits 0. Proof look (one, at the checkpoint): `--rail-seed q1-done --query home=b`, **the platform** framing (from the hall's doorway down the apron to the head ramp: the lane, the rack, the door).
- [ ] **F2. The cart, the shunt and the feet on B's roads, behind the flag. View-only.** The three pieces home-station cut to its step 6: `cart-view.ts` poses on `cartRoadAt` (scaled 206.32/196 until X1), `roundhouse-view.ts` builds `pathPts` from `shuntPath()`, `src/place/sites.ts` gets feet for the hall and stalls. Tools on anchors (home-station step 5): `dev/look/evals/garage-*.ts` and `railway-install.ts` read one `garageRow()` helper instead of `GARAGE_GEO.a`. Verify: `home-station.test.ts`; typecheck. No look of its own (X1's videos cover it). Touches `src/entities/railway/**`: after the fourth car merges.
- [ ] **X1. The flip. Sim and server (high-risk): independent review; bump; this plan's checkpoint.**
  - Rules: the constants above in `src/sim/railway-lines.ts`, `railway-works-layout.ts`, `railway-line2-layout.ts`, `railway-cart.ts`, `railway-layout.ts`; `WORKS.rollTicks` 110; `src/world/namespace.ts` bumps with a dated history line naming the station, the path heads and the tree table. `tree-catalog.ts` as problem 1.
  - Deletions: everything under "No `?home=` value remains"; `layout.ts`'s ten ternaries keep B's arm; `view.ts` mounts the station always; `roundhouse-view.ts` loses `homeB`; `cart-view.ts` loses the scale.
  - Tests that pin the old Home, and how each changes: `garage-geo.test.ts` (one row; "a hold at the post reaches the install"; landing equals `TABLE_LAND`); `town-plan.test.ts:250-254` (one tree count, no `homeLayout`); `island-map-labels-b.test.ts` deleted and `island-map-labels.test.ts` covers the island; `curio-layout.test.ts` (B only); `railway.test.ts:137` (new table); `railway-lines.test.ts`, `railway-train.test.ts`, `railway-works-layout.test.ts`, `works-shape.test.ts`, `railway-cart.test.ts` (`forgeCm` is `Math.round((196 − 54 + LEG.len + 26) × 100)`), `railway-jump.test.ts`, `greybox-works.test.ts` with `src/sickle/map-data.ts`; `test/fixtures/railway-golden.json` regenerated (a rule change, with the bump); `server/test/railway-line-host.test.ts` positions.
  - Tools: `dev/level/rail-network.ts`, `home-station-page.ts` (B only), `home-passenger-bay.ts`, `dev/scenarios/world-inputs.ts`, `dev/economy/ring-data.ts`.
  - Checkpoint proofs, once: `npm run check:full`; `npm run level-check`; `npm run loop -- run`; `npm run scenario -- world-inputs`; bot segments `playthrough --to forge-lit` (arrival, the hall, the forge), `--from q5-done --to trains` (the boiler to the new pedestal, trains wake) and `--from trains-on --to freight` (the first train stands at the island): together, a new player from arrival to the first train. Looks, no flag: **arrival** (spawn's own camera at `awake`), **the platform** (`trains-on`, a train at each edge), **the Roundhouse and garage** (`boiler-long`, `garage-open.ts`, from bearing 15°), **from the commons** (from G (−115, 20) at 70° toward the hall, `q1-done`); videos of the cart's reversal (`q4-arriving`) and the roll-out (`cradle-fitted`) in real time. Then load boogle.club after the ship (startup changed).
- [ ] **X2. What the flip leaves in words. Docs and tools.** `docs/game-design/place.md` (Home, the cart, the Roundhouse); `home-station.md` status "built to step 6" and `town-layout.md`'s status; `orchestrator-state.md` leftovers closed (trees, stand, tile, garage-geo); `rail-map.ts:1217, 1360` text; `dev/device/cli.ts:4`; `docs/world/home-layout.html` regenerated. May ride X1's ship.
- [ ] **R1. Interiors draw by the door. View-only.** town-layout step 7 as written (`src/entities/town/rooms.ts`: `ROOM_CAM.drawWithin` from the door, about 18 m). Verify: a look walking into Pip's house; `npm run bench` at `town`, reported.
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
