> **Status: building (reconciled 2026-11-15).** Steps 1a and 1b shipped together in v45, #1827 (`f1005f2ab`), and are present on main. Step 0 is superseded by the owner call below. Checkpoint A has historical proofs and outstanding quiet-machine timing; step 2 (previz) is dispatched separately by the orchestrator. Original planning measurements used `7c9d2fea5`.

# The Roundhouse as a rotunda: bigger, growing, a kit for the hubs

Planner, 14 November 2026.

**The owner's words (14 November 2026).** "I know we reviewed the roundhouse, but I still think it could look maybe bigger, more realistic, and feel more cool. Right now it feels a little cramped. The train barely fits on it, and it looks a little simple. And I'm not sure if I like that the houses for the cars are just individual little shacks, as opposed to like a full rotunda. But I'm curious what you think. Maybe that could be an upgrade later. In general, maybe it's something that we could reuse across the hubs." Earlier that day: "it looks a little bit messy with the rails and not as polished as I would like." Standing call: [The Roundhouse is a real rotunda](../agents/owner-calls.md#the-roundhouse-is-a-real-rotunda). Also binding: "Block out spacing first, details later", "Place for the look, not the cost; terrain may change", "Playtest before bespoke functionality", "Engine foundations first", "Save resets never block development", "Development is live".

## Goal

Replace Home's 9.6 m disc and three separate stall sheds with a 16 m turntable in a pit and one curved building of wedge bays round it, laid out from one parameterised kit so it grows bay by bay and stands again at other hubs. Serves **11. Show, don't tell** (the railway's growth is a building that grows), **7. Telegraph everything** (a foundation arc promises the building) and "towns grow from what arrives" in the core loop. It bends no principle; what it reopens in the decision log is listed under [Decision log](#decision-log).

**Research:** [roundhouse-trains](../research/roundhouse-trains.md) (used: a free early shed, steel as its later expansion; a physical turntable). [roundhouse-management](../research/roundhouse-management.md) (used: one small choice per line; no new management added here). [art-kit-pipeline](../research/art-kit-pipeline.md) (used: a small kit of parts with an assembly recipe, structural family separate from the place recipe; it is "open", so the kit shape here is this plan's proposal). [home-station-layout](../research/home-station-layout.md) (kept: the table on its own spur, no line `s` moves). Departs from the [engine-garage](../brainstorms/engine-garage.md#a-the-ground-the-grown-roundhouse-needs-keep-it-clear) keep-clear in two numbers (below). No doc in `docs/research/` covers real roundhouse practice; section (a) is from general knowledge, not a fetched source. Not a port from Place.

**The rail route as it stands** (`npm run loop -- node`): `slab` (strike the cracked slab, cue the slab), `stall` (2 footings, 2 × 150 m, NO CUE), `cradle` (8 rails, 1 × 31 m, NO CUE), `table` (NO CUE), `steelhome`, `install` (cue: the lever post by the table). This plan moves the stall and the table, so `stall` and `cradle` distances change by a few metres; step 1a verifies with `npm run loop -- run`. The three NO CUE beats get a cue for free from the foundation arc and the doors (designer call 1).

## (a) What a real roundhouse is, in a few lines

- **Plan:** stall tracks are radial to the turntable's centre; the table is the only switch, so no points on the stall side. Real bays are 7° to 10° each (36 to 50 to a full circle), 4 to 5 m between track centres at the doors.
- **Table:** a girder bridge on a centre pivot, its ends riding a ring rail in a pit 1 to 1.5 m deep with a kerb. Sized to the longest engine and tender it turns, with little spare: an engine fills 80 to 95% of the bridge.
- **Building:** one continuous curved wall and roof. Tall paired doors per bay with glazed lights, masonry piers between them, a back wall of big windows, a clerestory (monitor) band along the roof, one smoke jack per bay, an inspection pit between the rails. An apron of open ground between the pit and the doors where the roads fan out.
- **What reads as real:** the dark drop of the pit with the bridge across it; rails converging on one point; the same door repeated along a curve; the roofline as one sweep; the row of smoke jacks.
- **At Boogle's chunky scale:** fewer, fatter bays (20°, not 8°), 1.26 m piers, deep door reveals, oversized jacks, a 0.9 m pit you can hop into and out of. Three 20° bays are a curved shed; the ring starts to read at five.

## (b) Numbers for Boogle

**Measured lengths** (`src/entities/railway/engine.ts`, `cars.ts`; over-buffer figures from the engine-garage scale audit):

| Thing | Decks | Over buffers |
| --- | --- | --- |
| Engine A | 4.0 m (`ENGINE.hz` 2.0) | 4.68 m |
| Engine A, longer boiler (`ENGINE_LONG_AHEAD` 0.5) | 4.5 m | 5.18 m |
| The works copy: engine and first car (`TRAIN_OFFSETS[0]` 4.2, `TRAILER.hz` 1.6) | 7.8 m; 8.3 m with the longer boiler | about 8.5 m; 9.0 m |
| Engine and two cars (what a Cars install would show) | 12.0 m | about 12.7 m |
| Largest current era, with tender | | 8.4 m |
| End game (undecided) | | 10.7 to 14.0 m |

**Why it looks cramped today.** The copy with the longer boiler is 9.0 m on a 9.6 m disc: 0.3 m spare each end. Its corners reach 4.63 m; the disc is a 24-sided cylinder whose flats are at 4.76 m. That 0.13 m is the buffer beam over the edge in `late-table-close.png`.

**The table: 16 m** (radius 8). The works copy takes 56% of the bridge with 3.5 m each end; engine and two cars 79%; a 14 m end-game engine 88%. A 14 m table gives 64%, 91% and no fit. On a bridge across a pit, a short train reads as a train on a bridge, not "a toy on a plate" (the scale audit's worry about a bare disc). Question 1.

**The kit's numbers** (one bay model for every hub):

| | Value | Why |
| --- | --- | --- |
| Table radius | 8.0 m; pit wall 8.15; kerb to 8.6, 0.15 m high | above |
| Pit | 0.9 m deep (floor y 17.1); ring rail at r 7.4 | the plain jump is 1.6 m: out anywhere |
| Bridge | 16.0 × 3.2 m deck at rail height (y 18.35), a 0.9 m girder each side | |
| Bay angle | 20° (18 to a full circle) | chunky doors |
| Door ring (inner radius) | 14.0 m; door chord 4.86 m: 3.6 m clear, 4.6 m high, 1.26 m piers | today's door is 3.6 × 4.0; 4.6 m clears the tallest end-game stack (4.1 m) |
| Apron | r 8.6 to 14.0 | road centres are 2.8 m apart at the kerb, so 2 m sleepers do not overlap |
| Depth | 11.0 m; outer radius 25.0 m; back chord 8.68 m; 75 m² a bay | the 9.0 m works copy stands inside (road to r 23.5) |
| Heights | door wall 6.2 m, back wall 4.8 m, clerestory band r 17 to 19 raised 0.9 m, one jack per bay at r 21 | |

Departures from the 10 November keep-clear (a 16 m table, doors at 12 m, 16 m stalls, a fan to 30 m over 145° to 235°): doors at 14 m, not 12 (20° bays need the chord); depth 11 m, not 16 (a 16 m stall is for an engine nobody has picked; the back wall can move out later without touching the door ring: designer call 6). The arc is wider than the old fan: 120° to 260°.

**Home's footprint.** The table's centre moves 3.20 m along the spur's own line (bearing 130°) to Place-local (−55.445, 19.178), so the spur's end (−61.574, 14.036) stays where it is. Bays are centred on 190° (today's open stall), 20° apart.

| Against | Measured | Verdict |
| --- | --- | --- |
| Road 2 (line 2 at the island) | 15.7 m from the centre at 339°: 7.7 m rim to rail centre | clear (the keep-clear asked 5 m) |
| Road 1; the cart's leg | 23.3 m; 15.9 m | clear |
| The hall | nearest corner 29.8 m at 276° | clear of 7 bays; a bay past 260° stands 3.5 m off it |
| Road 2's buffer stub | 11.4 m from the west end wall (260°, r 25) | clear; a bay past 260° stands 3.3 m off it |
| Line 2 east of the table (s 54 to 68) | 12.2 m from the east end wall (120°, r 25) | clear; a bay past 120° has its corner 4.3 m off the rail centre |
| The Round (`town-plan.ts`) | plot 3 at 37.7 m, 248°: 7.5 m behind bay 250°'s back wall; plots 5 and 6 over 12 m; the ring road 39 m | clear |
| The passenger set's east bay | on line 2's up track, north of the table, outside the arc | re-run `dev/level/home-passenger-bay.ts` in step 1b for its `table` distance |
| Trees (`LAND_TREES`) | none within 33 m; the nearest is id 217 at 33.8 m, 73° | no tree moves, so the sim's tree table is untouched |
| The stone yard (`PROPS.yard`) | 9.9 m at 107°: on the apron | moves in step 1b |
| Ground | 18.00 inside r 14; 17.85 to 18.65 across the bays (r 14 to 25, 120° to 260°) | **reshape:** one level pad at 18.00 over the arc to r 27 with a 4 m soft edge, and the pit (step 3) |

**Home's ceiling is seven bays (140°).** An eighth on the east puts a corner 4.3 m from line 2; one on the west stands 3.3 m off road 2's stub and 3.5 m off the hall. A half ring at Home means moving line 2's curve or the hall; a hub laid out for it can have one. Question 4.

## (c) The growth ladder

Stages 0 to 2 read state that exists today, so they are view work. Stage 3 is a new mechanic and is held.

| Stage | Bays built (arc, outer width) | When | What you see | Status |
| --- | --- | --- | --- | --- |
| 0 | none; pit and bridge; foundations for five bays (140° to 240°) | first arrival | weathered bridge in its pit; a ruin arc: floor slabs, pier stubs, rails in the grass; bay 190° is the cracked slab and the tarped shunter and wagon | exists as one stall and two outlines; widened |
| 1 | 3: 170°, 190°, 210° (60°, 25.0 m) | `shed.stall` reaches 2 (the `stall` beat) | the two footings raise bay 190°'s door piers as today, then the three-bay shell stands; bay 190° is the working stall (cradle, shunt) | free with the story (question 3) |
| 2 | 5: adds 150°, 230° (100°, 38.3 m) | the first steel lands at Home (`shed.steel` ≥ 1, the `steelhome` beat) | two bays framed in steel; foundations appear for 130° and 250° | free with the story; "steel as the shed's expansion" (research) |
| 3 | 7: adds 130°, 250° (140°, 47.0 m) | bought from the shared wallet, a row on the garage screen | Home's full rotunda | **held**: new sim state and a new purchase ("Playtest before bespoke functionality", "Engine foundations first"); needs its own brief |

The table is 16 m from stage 0; it does not grow. What a bay unlocks: nothing in this plan. A built bay is a place to stand something; what stands in bays 170° and 210° onward is designer call 2 (new). Decided and kept: the Roundhouse holds the garage only; the bought passenger set does not stand in it.

## (d) The kit, for reuse across hubs

**One definition, `src/place/rotunda.ts`** (pure; no three.js; read by views, tools and tests):

```ts
export type RotundaKit = { rim: number; doorR: number; depth: number; bayDeg: number; door: { clear: number; high: number }; pit: number };
export const ROTUNDA_KIT: RotundaKit = { rim: 0.6, doorR: 14, depth: 11, bayDeg: 20, door: { clear: 3.6, high: 4.6 }, pit: 0.9 };
/** One hub's rotunda: bearings in degrees clockwise from north. `order` is bays from `mid`, in build order. */
export type RotundaSite = { id: string; centre: XZ; y: number; tableR: number; approach: number; mid: number; order: readonly number[]; stages: readonly number[] };
export function bayFrame(site: RotundaSite, bay: number): { bearing: number; u: XZ; yaw: number; rim: XZ; door: XZ; back: XZ; centre: XZ; corners: [XZ, XZ, XZ, XZ] };
export function rotundaBays(site: RotundaSite, stage: number): number[]; // the bays built at a stage
export function rotundaFootprint(site: RotundaSite, bays: number): XZ[]; // pit circle and arc polygon, for the checks
```

Home is one row in `src/place/home-station.ts`: `ROTUNDA_HOME = { id: 'home', centre: TABLE, y: 18, tableR: 8, approach: 310, mid: 190, order: [0, -1, 1, -2, 2, -3, 3], stages: [0, 3, 5, 7] }`. Bay count, arc start and table size are the site's; door ring, depth and bay angle are the kit's, so one bay model fits every hub. Port Quay's rotunda (decided, 10 November) is a second row when its station is planned; the one-road engine sheds at depot ends are rectangular and are not this kit.

**Records and placements.** Placed content comes from prefab records. `dev/prefab/rotunda.ts` (pattern: `dev/prefab/halts.ts`) generates one level per site, `content/built/levels/rotunda-<id>.json`, from `ROTUNDA_KIT` and the site row: one placement per bay and one for the table. Colliders live on the record, bay-local, not on each placement. The owning view enables a bay's shell or its ruin by stage (`setEnabled`).

| | Records | Bytes (estimate) |
| --- | --- | --- |
| Blockout (step 1b) | 2: `roundhouse.bay-block`, `roundhouse.table-block` | about 2.5 kB with Home's 8 placements |
| Finished | 4: `roundhouse.table`, `roundhouse.bay`, `roundhouse.bay-ruin`, `roundhouse.end-wall` (the block records are deleted) | about 5 kB with Home; about 1.5 kB per further hub, no new record |

**Catalogue ceiling proposal superseded (14 November).** The original 200-record / 350,000-byte ceilings and this plan’s proposed 380,000-byte replacement are superseded by [No limits ahead of a measured problem](../agents/owner-calls.md#no-limits-ahead-of-a-measured-problem). Report catalogue growth and fail on real defects; add a ceiling only for a measured performance problem. Step 0 requires no ceiling increase and is no longer a prerequisite for this plan.

## (e) What changes in the sim

Table size is not sim data: it is `TABLE.r` (`home-station.ts`), `R = 4.8` (`roundhouse-view.ts:119`) and `DECK_R` (`garage-geo.ts`). The sim holds three points and one duration, in `src/sim/railway-works-layout.ts`, and one landing in `src/world/railway-jump.ts`:

| Constant | Now (cm) | New (cm) | Rule |
| --- | --- | --- | --- |
| `SHED_TABLE` | (94210, 1712), y 1830, reach 600 | (94455, 1918), y 1830, reach 1000 | the table's centre; a player at the post stands outside the kerb (r 9.4) |
| `SHED_STALL` | (94011, 2845), reach 500: r 11.5 at 190° | (94160, 3592), reach 500: r 17 at 190° | 3 m inside bay 190°'s door, as today |
| `WORKS_SEAMS[0]` (stall) | (94063, 2549), reach 400: the door, r 8.5 | (94212, 3297), reach 400: the door, r 14 | the cracked slab is in bay 190°'s doorway |
| `WORKS.rollTicks` | 110 | 140 | the shunt's path grows 49.9 m to 60.6 m at the same pace; the deck still turns 120° (190° to 310°), in 5 s instead of 3.6 s |
| `TABLE_LAND` | `near(SHED_TABLE, 5.2, 1.7, …)` | 9.2 m off on the same side | the jump-in lands outside the kerb (8.6 m) and inside the prompt's 9.6 m |

Nothing else: no component, op, wire shape or save shape changes. `shuntPath`, `stallFrame`, `garageRow`, the seeds (`railway-seed-works.ts`) and `src/sickle/map-data.ts` follow the constants. The keep-clear becomes data (`rotundaFootprint`) checked by a test, replacing the prose in the engine-garage brief.

**`WORLD_NS` v45** (the next free; whichever of this and the turnouts work ships first takes it): saved rooms hold footings dropped at the old stall and players beside the old table, and a mixed build would judge reach at different points. One dated history line; no migration; not shipped while the owner is mid-session.

## Design

| State | Kind | API |
| --- | --- | --- |
| The pit, bridge, bays, ruins, roads | Local (static scenery, the same on every client) | prefab records and generated placements; `instantiate` |
| The stage shown | Local, derived from Server rows | `rotundaStage(w: ReadWorld): 0 \| 1 \| 2` in new `src/entities/railway/rotunda-stage.ts`, from `shed(w).stall` and `shed(w).steel` |
| The bridge's yaw, the shunt's pose | Local, from `shed.ready` and the mover clock, as today | `roundhouse-view.ts` |
| Reach points and `rollTicks` | Server rules constants | section (e) |
| Stage 3 (held) | Server: a `bays` field on `Shed` and one op | not designed here |

Authority is unchanged: the server judges `rail.strike`, `rail.drop`, `rail.turn` and `rail.install` at the moved points. Cosmetic: everything drawn. Controls: none added (no action id, pad slot, key, touch or guide row). No lockstep state exists since v40.

## (g) The garage at each step

What the garage needs from the table (garage-install-moment, G2 to G5): `garageRow()` gives the centre and ground; `installHere(post)` holds; the works copy rests along the bridge, solid, at a pose that never turns under a player; the jib's arm reaches the engine's seat; the stand clears the deck's sweep; one camera row (`camBearing`); a bystander's own camera sees the drop and the turn.

| Step | What keeps it working |
| --- | --- |
| 1a | `garageRow()` reads `TABLE`, so it follows. `DECK_R` 8. `GARAGE_GEO` re-laid outside the kerb: post (60°, r 9.4), stand (85°, r 10.3) with `STAND_LEGS.at` [9.9, 11.4], jib (85°, r 12.2), arm 11.0 with the copy at rest nose toward 130° (it then reaches the seat as today's 10.6 does), crew behind the jib, `camBearing` 85 kept. `test/garage-geo.test.ts` keeps its rules (legs outside the deck, `installHere`, the landing clear) on the new numbers |
| 1b | The open side (260° through north to 120°) holds the spur, the post, the stand, the jib and the camera; no block stands there. Door lintels are 4.6 m, over the copy on its way through bay 190° |
| 3 | The copy stands on the bridge rails; the moment's "one full turn of the table" is the bridge turning. The bridge's collider is static at its rest pose and re-added after a turn once this tab's player is clear (the copy's own rule in `garage-view.ts:375`). The jump-in landing is outside the kerb |
| 4 | The doors become the backdrop. `camBearing` moves to about 30° so the engine stands against bays 190° to 230° (stills at 30°, 45° and 85°; designer call 3). Re-check G3's finding that the barrel passes the camera in the lift |
| 5 | A stage change waits for a shared moment to end; stage 2 is tied to steel landing, not to the install, so the two never play together |

Road 2 holding the fourth car beside the copy (finding 2 of that plan) is easier: the bridge has room for the engine and two cars (12.7 m of 16).

## Where this meets the work in flight

- **Turnouts** (`docs/turnouts-plan`; `docs/plans/turnouts.md` is not written yet): it owns the spur's points on road 2 (s 5.5) and the spur up to its end. This plan owns everything from the spur's end outward: the table, the stall roads, the building. The meeting point is the spur's end pose, (−61.574, 14.036) at bearing 130°. If turnouts re-lays the spur, the centre follows `spurEnd` and the three pinned points are regenerated; whichever ships second does that inside its own bump. There are no points on the stall side.
- **Track tidy** (view only): it owns how `track()` in `home-station-view.ts` draws rail and sleepers. This plan adds stall-road calls and removes the ruin-outline block (lines 196 to 250); it does not restyle track. Land the tidy first or rebase onto it.
- **The Round's blockout** (`codex/round-blockout-b1`): shares `home-station.ts`, the town plan sheet and the catalogue's last bytes. No footprint conflict (table above).

## Steps

Tier is the review tier of `npm run review-stamp`. Model rows are from `npm run models` (withCodex).

- [x] **0. Room in the catalogue — superseded, no implementation required.** The owner call "No limits ahead of a measured problem" supersedes both the old ceiling and the proposed increase. Do not raise the byte ceiling; this step no longer gates the rotunda.
- [x] **1a. The kit as data, and the sim's points.** Create `src/place/rotunda.ts` and `test/rotunda.test.ts` (door chord 4.86, back chord 8.68, bays 190° ± 20°k, `rotundaBays` per stage, footprint clear of every track in `LINKS`, the leg and both stubs by 3.5 m, of every `TOWN_SLOTS` footprint by 4 m). Edit `src/place/home-station.ts`: `TABLE.r` 8, `ROTUNDA_HOME`; keep `STALLS` and `stallFrame` with their shapes, valued from the kit (`bearings` [170, 190, 210], `door` 14, `depth` 11, `width` 4.86), so the six `dev/level` tools still run. Edit `src/sim/railway-works-layout.ts` and `src/world/railway-jump.ts` per section (e); `src/world/namespace.ts` to v45 with its history line. Fold `R` into `home.TABLE.r` in `roundhouse-view.ts`; `garage-geo.ts` per section (g); `ROLL.turn` to [0.34, 0.70] and `BACK_TICKS` 130. Update `test/home-station.test.ts`, `test/railway-works-layout.test.ts`, `test/garage-geo.test.ts`. Tier: review (`src/sim`, `src/world`). Check: those tests, `node dev/ship-check.ts`, `npm run loop -- run`. Model: high-risk implementation, Codex gpt-6-astra high, then the independent review row.
  - **Shipped in v45, #1827 (`f1005f2ab`).** Verified on main: the reusable kit and tests, 8 m table radius, kit-derived stalls, pinned Works/jump points, garage geometry, `ROLL.turn` [0.34, 0.70] and `BACK_TICKS` 130. No new WORLD_NS bump is needed. The four owning test files pass (34 tests) on this checkout.
- [x] **1b. The blockout, in the live game.** Create `src/content/prefabs/roundhouse.ts` (the two block records; builder `roundhouse.bay-block` in `src/prefab/builders/roundhouse-block.ts`: two pier blocks and a lintel leaving the 3.6 × 4.6 m door open, one radial side wall, a back wall, a roof slab from 6.2 m down to 4.8 m; `roundhouse.table-block`: a dark 16 m disc flush with the ground, the kerb ring, a 16 × 3.2 m deck strip, and a painted 14 m ring for comparison), `dev/prefab/rotunda.ts`, `content/built/levels/rotunda-home.json`. In `home-station-view.ts` replace the two ruin outlines with a stall road per bay (`track()`, kerb to r 23.5); in `roundhouse-view.ts` mount the level, show bays by `rotundaStage`, and keep bay 190°'s slab, sockets, tarp, cradle and shunt on `stallShape(bayFrame(…))`. In `src/place/terrain.ts` add the level pad (after the tree snapshot at line 283). Move `PROPS.yard` east of the arc's end, 3.5 m or more from any rail. Draw the rotunda on `dev/level/town-plan-sheet.ts` and add a level-check row from `rotundaFootprint`. Update the Roundhouse section of `docs/game-design/place.md`. Tier: none (view, content, tools). Proof look: one top-down still over the table with `--rail-seed steel-home` (the review's `late-topdown-table-stalls.png` framing). Check: `node dev/ship-check.ts`, `npm run level-check`, `npm run town-plan-sheet`. Model: player-visible implementation, implementer agent fable medium; visual review by a fresh subagent, fable medium.
  - **Built 14 November on `codex/rotunda-1a-2`; shipped with 1a in #1827 (v45). Departures:**
    - **Six block records, not two** (`roundhouse.bay-block`, `bay-ruin-block`, `bay-door-block`, `end-wall-block`, `bay-outline-block`, `table-block`; one builder file). Colliders live on the record, so each state the design review asked for (finding 1: standing ruins, a shut door on an empty bay, painted bays 110° and 270°) is its own record. The level is 3.6 kB.
    - **End walls instead of one side wall per bay.** A wall stands on an arc edge only where a built bay meets an unbuilt one, so bays are open to each other inside (one building) and every stage is closed at both ends.
    - **The deck strip is the view's, not the table record's**, since it turns: the old 1.5 m plank is now the 16 × 3.2 m deck, 0.4 m deep, from the disc to the rails' feet. It is solid at rest and not while turning (section (g) puts this in step 3; without it a player walks through the bridge). The handle moved from the disc's rim to the bridge's end.
    - **The kerb is drawn only** (no collider), per the design review's call 2. The disc is flush with the yard: standing height on the table drops 0.3 m to the yard's; the deck is at rail height as before.
    - **Placements carry no pose.** A placement stores which piece it is and its bay offset (`turn`); `rotundaPose` stands it from the site row at mount, because the prefab compiler refuses derived numbers. `rotundaPieces`, `rotundaShows` and `rotundaPose` are in `src/place/rotunda.ts`.
    - **Stage 1 waits for the door piers.** The old nine-piece stall frame is now three (two piers and the lintel, the kit's sizes, on the footings); when they have risen the three shells appear at once. A rise for the shells is step 5.
    - **`stallShape` takes the bay's frame and the pier's place**: the sockets stand where bay 190°'s door piers go (2.1 m either side, on the door wall), the cracked slab 0.8 m behind them (15 m out, a metre inside the door ring), the rubble inside the door. `STALL_BOXES` (the old stall's ruin frame) is deleted.
    - **Stall roads are in `home-yard.ts`**, where main moved them: one for each of the seven bays from arrival, to r 23.5 (the working bay's to its back wall, as before). Bays 130° and 250° so have rails before their ruins appear at stage 2.
    - **Ruin piers are 3.2 m to full height, not 2.5 m up**, over a 3.1 m solid that two jumps (2.9 m) cannot top.
    - **`PROPS.yard` moved north** to (−57.3, 8.8), 350° and 10.5 m from the table's centre (design review, finding 3: not east). Nothing is drawn at the yard today; it is a marker on the layout page and a keep-out. Its old terrain pad stays where it was graded, as a literal in `terrain.ts`, because it is laid before the tree snapshot: no tree id or terrain digest changes.
    - **The level pad was already there** (1a brought it forward); 1b adds none.
    - **A dark window band on each back wall** from the start (design review, finding 2 made it conditional on a look from the green).
    - **Proofs taken:** the top-down still and one from the spur at eye height on `steel-home`, plus bay 190° at `works-open` and `stall-done` and the back from the south. **Still owed from finding 2:** eye-height stills from the green's centre, the hall's front and the footing carry's approach at each stage.
    - **Roof reach, estimated not walked:** the eave is 5.1 m at the back and 6.5 m at the doors; one jump is 1.6 m and two about 2.9 m, and nothing nearby stands higher than the 3.1 m ruin piers, which two jumps do not top. The glider is not measured.
- [ ] **Checkpoint A (the v45 bump; 1a and 1b ship together).** Proofs, once: the works bot segment (`dev/look/bots/railway-works.ts`: strike, two footings, cradle, turn, the wagon couples); `dev/look/evals/garage-open.ts` and `garage-two.ts` on `steel-home` (the install from the post, and a bystander's view); `test:net`; `npm run perf` reported. Then the owner walks it and rules on questions 1, 2 and 4. A changed diameter is one number in `ROTUNDA_HOME` and a second bump.
  - **Fresh reconciliation/proofs, 15 November:** worker base `bff2e620325e7860926687684cb05d4bcbdcb8cd`, tree `861adfe666245c287b5fd7953dd5edb4a1ba49d3`; `origin/main` observed at `98ca1af8247c42f143988ed540cbcc480d02ec15`. #1827 is an ancestor of both. The 1a owning source files match the observed main. Only this plan changed during capture; no game source, namespace, tree or scatter edits. Local harness used because this worktree has no broker client. Node 26.13.0. Stop here before step 2; previz belongs to the orchestrator's separate dispatch.
    - [x] Works: `look --real --rail-seed works-arrive --query 'shot=play&railFrom=works&railStop=wagon coupled' --eval dev/look/evals/railway-works-bot.ts --until window.__placeDone --wall 900`. Passed without recovery: two footings at 292.5 s, cradle at 304.5 s, turn at 308.4 s, coupled at 322.3 s. Load 10.86 → 64.56; these are route diagnostics, not pacing evidence. [Opened still](../../.look/rotunda-current/rotunda-current-works-still.png); bot overlay obscures the distant train, so accepted checkpoints establish coupling.
    - [x] `garage-open.ts` with `garage-act.ts`, `--real --rail-seed steel-home --query garage=moment --seconds 12 --frames 12`: installed the longer boiler. [Opened still](../../.look/rotunda-current/rotunda-current-install-moment-still.png) shows Installed/Replaced; opened motion sheet shows the lift and turn. Load 16.25 → 11.32. Initial `rotunda-current-install` run only selected the part; it is not counted as install proof.
    - [x] `garage-two.ts`, `--players 2 --real --rail-seed steel-home --until window.__twoDone --action dev/look/evals/garage-act.ts --query garage=enter --seconds 12 --frames 24`: both peers saw the install, `Line.boiler=1`, installer returned idle. Bystander position (956.47,18.45,20.64), camera (961.64,20.53,20.72) and held=false unchanged. [Opened bystander still](../../.look/rotunda-current/rotunda-current-two-still.png), [installer still](../../.look/rotunda-current/p2-rotunda-current-two-still.png) and motion sheet show the boiler and full table turn. Load 10.93 → 9.21.
    - [x] Warmed frame sample executed: `--real --curves --rail-seed steel-home --cam 952,27,4 --look 943,19.5,26 --action dev/look/evals/railway-works-at.ts --query 'worksat=table&worksperf=1&prof=1' --warm 20 --seconds 1 --frames 2`. `hardwareTiming(5)` completed 300 frames. [Opened diagnostic still](../../.look/rotunda-current/rotunda-current-frame-still.png) shows the five-bay table beneath the profiler; its separate live 240-frame window reads CPU avg/p95 7.61/8.30 ms, GPU span 7.71/8.22 ms (239 eligible, one missing). Do not confuse that live window with the action's 300-frame sample. Load 8.51 → 7.52 exceeds quiet policy 6.
    - [ ] Quiet-machine frame timing, smoothness and device performance remain unverified. All captures passed WebGPU/completed-frame/error health; stills and sparse sheets do not establish real-time smoothness. Not tested on a device.
    - [x] `npm run perf -- --view summit`: completed, WebGPU Metal-3, 960×600 DPR 1 MSAA 4; 415 calls, 226 separate-frame shadow-call difference, 996,237 triangles, 1,251 geometries, 226 programs. CPU frame avg/p95/max 8.999/7.350/314.805 ms is diagnostic only. Zero client sim ticks: server simulation cost remains unmeasured.
    - [x] `npm run test:net`: exit 0, 190/190 checks, including restart/reconnect, takeover, mirrored conservation, jump/replace/restore, request stops and the leaf. This resolves the earlier runner’s net omission.
    - [x] Validation: 34/34 owning tests; `npm run loop -- run` exit 0 (solo canonical 37:56 straight-line / 44:31 calibrated); `npm run check` exit 0 (2,166 cases, 2,165 passed, zero failures, one existing TODO; level/assets/build passed). Logs: `.look/rotunda-check.log`, `.look/rotunda-loop.log`. Capture verdicts and exact commands are beside the stills in `.look/rotunda-current/`.
  - Runner results, 14 November: [Checkpoint A review](../reviews/rotunda-checkpoint-a.md). Initial base `89569327e`; follow-up rebased onto main `902217fc7` (#1833), tested worker `b5fdd9dc5`. No game source changed by this runner; no push or ship. The owner walk is feedback, not a hold (design review finding 6).
  - [x] Works bot through two footings, cradle, turn and wagon coupling: rebased rerun passed, `stall=2`, `cradleRails=8`, `table=1`, slot 1 `wagon=true`. Old Quarry failure was stale bot selection (Sit won Interact), repaired upstream. Recorded 321.9 s is under load and not timing evidence.
  - [x] `garage-open.ts` on `steel-home`: longer boiler installed; still and motion sheet inspected.
  - [x] `garage-two.ts` on `steel-home`: bystander camera preserved, install observed; both stills and motion sheet inspected. Additional own-camera post view inspected.
  - [x] `test:net`: skipped by the 14 November runner; fresh 15 November run above passed 190/190.
  - [x] Perf render counts reported with view and load: rebased summit, 415 calls, 93 shadow-call difference, 996,237 triangles. No timing or performance approval implied.
  - [x] Complete perf invocation: restarted harness passed; old `stateHashes` API error is gone. Its sim section samples 0 client ticks, so server simulation cost remains unmeasured.
  - [x] Frame sample executed and reported: warmed five-bay table, 301 frames / 5.0094 s; CPU average 8.931 ms, GPU span average 8.620 ms. Load 28.57 → 38.90; these are loaded diagnostics, not performance evidence.
  - [ ] Quiet-machine Checkpoint A frame timing: still owed; the loaded sample cannot establish a frame-budget pass or smoothness.
  - [x] `npm run loop -- run`: exit 0; solo canonical model 37:51 straight-line / 44:13 calibrated.
  - [x] `npm run level-check`: exit 0, 14 reports.
  - [x] `npm run town-plan-sheet`: exit 0; generated PNG opened.
  - [x] Finding 2 captures: green centre, hall front and footing carry approach at arrival, three and five bays; all stills opened. Occlusion recorded; clear relocated views beyond the plots inspected. This does not approve green/hall visibility or prove roofline comparison.
  - [x] P2 drop during a turn: no sampled pop at turn end; after walking clear, a second landing rested 0.340 m higher on the restored deck. Still, motion sheet, curves and consecutive video frames inspected; real-time smoothness unverified.
- [x] **2. Previz and a reference sheet (image deliverables).** Three painted views at the walked size: stage 0 from the spur, stage 1 from the garage camera, stage 3 from above with the copy on the bridge; one sheet naming the parts in section (a) at Boogle's proportions; the bridge's turn and the roll-out in the asset stage. Output under `.look/previz/roundhouse-rotunda/`, the owner picks. Tier: none. Model: images and previz, Codex gpt-6.1-sol medium.
  - Made 15 November: [stage 0 from the spur](roundhouse-rotunda/stage-0-spur.png), [stage 1 from today’s garage camera](roundhouse-rotunda/stage-1-garage.png), [held stage 3 from above](roundhouse-rotunda/stage-3-above.png), and [named-parts reference sheet](roundhouse-rotunda/reference-sheet.png). All opened; [capture provenance, prompts and numeric departures](roundhouse-rotunda/README.md). Retained under docs/plans at the owner’s request. Drafts only; the owner judges the look, no approval claimed.
  - [ ] Original step 2 motion proof: bridge turn and roll-out in the asset stage. The image-only task supplies schematic poses on the sheet, not executed motion.
- [ ] **3. The pit and the bridge.** `src/place/terrain.ts`: lower the ground to 17.1 inside r 6, sloping to the wall. Record `roundhouse.table` with builder `src/prefab/builders/roundhouse-table.ts`: pit wall and kerb (a ring of box colliders), floor, ring rail, pivot; the bridge is the view's (it turns): girders, deck, rails, handrail posts, in `roundhouse-view.ts`, collider per section (g). Tier: none. Proof look: a motion sheet of the roll-out's turn. Check: `node dev/ship-check.ts`, `npm run level-check` (out of the pit by the plain jump, carrying a footing too). Model: implementer agent fable medium; visual review.
- [ ] **4. The building, bay by bay.** Record `roundhouse.bay` with builder `src/prefab/builders/roundhouse-bay.ts` (piers, paired doors, back wall and windows, roof, clerestory, jack; instanced by `batch`), `roundhouse.bay-ruin`, `roundhouse.end-wall`. One commit per bay, each swapping that bay's placement from the block record: bay 190° first (the footings raise its piers; `BUILD_S` and the tarp as today), then 170° and 210°, then the ruin arc, then 150° and 230° in steel. Delete the block records in the last. `camBearing` per section (g). Tier: none. Proof look: one still from that bay's door side per commit. Check: `node dev/ship-check.ts`. Model: implementer agent fable medium; visual review.
- [ ] **5. Stages change in front of you.** In `roundhouse-view.ts`: on the accepted edge to stage 1 or 2 the new bays rise (dust, `clank`, the existing build timing), restored states snap. `test/rotunda-stage.test.ts`: stage by `shed.stall` and `shed.steel`. Tier: none. Proof look: a motion sheet of stage 1 rising. Model: implementer agent fable medium; visual review.
- [ ] **Checkpoint B (the plan's end).** The works bot segment again, `garage-open` at the new camera, `npm run perf` reported, stills of stages 0 to 2 for the owner.
- [ ] **6. Held: stage 3 bought, and the second hub.** A designer brief first (the price, the row on the garage screen, what bays hold); built after the owner has played and on the chosen engine foundation. Port Quay is one `RotundaSite` row in that station's plan.

## Level findings

`npm run level-check` on `7c9d2fea5`: passes, 13 reports, none at the Roundhouse. It has no rule that reads the table, the spur or the stalls (`dev/level/check.ts`, `track-continuity.ts`), so the planned positions were measured by script against the data it reads (`home-station.ts`, `layout.ts` `LINKS`, `town-plan.ts`, `terrain.ts` `H`, `tree-catalog.ts`), not applied and run through it. Step 1b adds the row.

1. **Nothing is gated or hidden here.** No secret, find or ability gate is placed; the nearest find, `yard`, is the Round's, behind the gate cottage.
2. **Clearances:** the table in section (b). Tightest: the west end wall 11.4 m from road 2's stub; plot 3 7.5 m behind bay 250°.
3. **The pit** is 0.9 m against a 1.6 m plain jump: no trap, including with a footing on your back (the plain jump works while carrying). Whether it wants a rail is designer call 4.
4. **The roof** (4.8 m at the back, 6.2 m at the doors) is not reachable by the plain jump. Whether the second jump from the engine's cab roof (3.3 m) or the glider reaches it is unknown until the blocks stand; step 1b reports it per ability and the designer rules (call 5).
5. **The walk from the island to the stall** (the board crossing, then west of the table) now passes the kerb and crosses the dead roads of bays 210° to 250°; no track a vehicle runs on. The carry for `stall` grows by about 6 m.
6. **Ground:** one pad and one pit, no tree moved.

## Risks

- **Room safety:** no effect in apply, no new presence field, no new server import. The moved points are read by the server (`railway-server.ts:282` to `298`); a client and server on different builds disagree on reach, which is what the bump is for.
- **Mixed builds:** dev phase, no compatibility code; v45 with a dated history line.
- **Hotspots:** `roundhouse-view.ts` (944 lines; split the bridge and the stage wiring into their own files if it passes 1,000), `home-station-view.ts`, `home-station.ts`, `garage-view.ts`.
- **A turning bridge and players:** never a moving collider; static at rest, as the copy is.
- **Performance:** seven bays, instanced; the added draws and triangles are not measured yet. `npm run perf` at both checkpoints, reported, not a gate.
- **The loop graph** reads the moved points: `npm run loop -- run` in 1a.

## Decision log

Drafted, not recorded: the owner asked for an opinion, so it is recorded when he rules on the questions (`npm run decisions` passes on this branch with the log untouched).

**Draft entry, top of "Decided" in `docs/decisions-rail.md`:**

`- <a id="d-2026-11-14-the-roundhouse-is-a-rotunda"></a>**2026-11-14, the Roundhouse is a rotunda that grows, from one kit for the hubs** (owner: "I still think it could look maybe bigger, more realistic, and feel more cool. Right now it feels a little cramped. The train barely fits on it, and it looks a little simple. And I'm not sure if I like that the houses for the cars are just individual little shacks, as opposed to like a full rotunda. … Maybe that could be an upgrade later. In general, maybe it's something that we could reuse across the hubs."). Home's Roundhouse is a 16 m turntable in a pit with one curved building of 20° bays round it, doors 14 m from the centre; it stands as a foundation arc at arrival, three bays when the stall is raised, five when steel comes home and seven as a bought upgrade; the same kit builds the other hubs' rotundas. Plan: [roundhouse-rotunda](plans/roundhouse-rotunda.md).`

**Draft rules line:** `- 2026-11-14 · The Roundhouse is a rotunda: a 16 m table in a pit, 20° bays in one curved building, growing 3, 5, 7 at Home, one kit for the hubs ([entry](#d-2026-11-14-the-roundhouse-is-a-rotunda))`

**What it supersedes, each in part (the entry stays; an italic note goes on its rules line):**

| Entry | Part replaced | Part that stands |
| --- | --- | --- |
| `decisions-rail.md#d-2026-11-06-split-rock-works-next-then-ring` | "the smallest Roundhouse first" as the Roundhouse's form | the order of areas; the approved briefs |
| `decisions-rail.md#d-2026-11-09-home-gets-one-coherent-station` | "the 9.6 m turntable stays; one open stall with two ruin outlines, not a full three-stall shed" | layout B, the table on its own spur, line trains never turn on it |
| `decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy` | answer 3's "The Roundhouse stays 9.6 m now" and "planned with the end-game engine" | "growing … is itself an upgrade" (now the bays, not the table); answers 1, 2, 4, 5 |
| `decisions-core-loop.md#d-2026-11-09-station-6-takes-nothing-by-hand` | "Home's stalls stand at 160°, 190° and 220°" | the rest |

Agent calls it closes (rows move to the archive when he rules): the 10 November keep-clear default (`agent-calls.md`, engine-garage call 10) and the rail-map default that plans it on layout B.

## Calls for the designer

1. Stage 1 at the stall beat and stage 2 at the first steel: right triggers? Do the ruin arc and the doors stand in for the missing cues on `stall`, `cradle` and `table`?
2. What stands in a built bay beyond the shunter and wagon. Proposal (new): nothing until stage 3's brief; candidates are one line's engine and first car per bay.
3. The garage camera's bearing (30°, 45° or 85°) and the jib's 11 m arm, from stills.
4. The pit: open with a kerb (proposed), or railed.
5. The roof as a perch, once step 1b says what reaches it.
6. Bay depth 11 m, with the back wall free to move for an end-game engine.
7. `rollTicks` 140 and a 5 s turn; doors always open, or open only for an occupied bay.

## Open questions (owner)

1. **Table diameter.** 16 m (recommended: room for the engine and two cars, and for any end-game engine, in one move) or 14 m (a fuller-looking bridge today; a 14 m engine would not fit). The blockout paints the 14 m ring on the 16 m table so both are seen at once.
2. **Bays at arrival and by upgrade.** A foundation arc at arrival, then 3, 5 and 7 (recommended). Or start at five, since three 20° bays read as a curved shed more than a ring.
3. **Free or bought.** The first three bays free with the stall beat and five free with steel (recommended); only the last two bought, later. Or every stage after the first bought, which waits for the held purchase work.
4. **Home stops at seven bays (140°).** Accept it (recommended) and let a later hub have the half ring, or move line 2's curve east of the table to make room for nine.

Also open, not the owner's: step 0's catalogue room (orchestrator); `docs/plans/turnouts.md` is unwritten, so its meeting point above is this plan's proposal; `npm run inflight` lists no pushed branch on these files, but local branches `codex/round-blockout-b1` and `docs/turnouts-plan` touch them.

## Design review (designer, 2026-11-14)

Read for this: the owner's 14 November call and the standing calls the plan names; DESIGN.md (the core loop, principles 6, 7, 8, 11); the Current rules of core loop and rail and the four entries under [Decision log](#decision-log) in full; [garage-install-moment](garage-install-moment.md) (section 2, G2 as built, the R1 to R4 ruling); [roundhouse-trains](../research/roundhouse-trains.md) and [roundhouse-management](../research/roundhouse-management.md) top blocks (used as the plan uses them; nothing ignored); [progression-flow-layout](../research/progression-flow-layout.md) and [route-contract](../research/route-contract.md) as the lenses below; `npm run loop -- node stall|cradle|table|steelhome|install`; `home-station.ts`, `town-plan.ts`, `railway-works-layout.ts`, `garage-geo.ts`. Stills read: `.look/roundhouse-review-1114/late-table-close.png`, `late-topdown-table-stalls.png`, `rh-garage-fitted-still.png` and `.look/owner/town-plan-sheet.png`. **Not seen:** anything at the new size. Nothing of this plan exists to photograph, so every judgement of scale and sightline below is from the plan's numbers against today's stills, and the blockout is where they are tested. I took no new stills and ran no reach check; the plan's clearances are the planner's measurements, not re-measured. Not a port from Place. Fit and order: the owner asked for this on 14 November, stage 3 stays held, nothing else changes order.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The table is 16 m, in a pit | New | **16 m.** Replaces "stays 9.6 m now" (10 November) under the 14 November call. Reasons under Scale |
| 2 | The pit is 0.9 m, open, with a 0.15 m kerb (designer call 4) | Default | **Open.** A rail blocks the hop in and out, the jump-in landing and the garage camera; 0.9 m against a 1.6 m jump strands nobody, and falling in is a toy. If the kerb snags a walk in `level-check`, make it flush |
| 3 | 20° bays, doors 14 m out, 3.6 × 4.6 m doors, 1.26 m piers | Default | Keep. Chunky reads better than real 8° bays at this camera |
| 4 | Bays 11 m deep, the back wall free to move (designer call 6) | Default | Keep 11 m. It is the size of the one thing a bay could hold today (engine and first car, 9.0 m) |
| 5 | Door wall 6.2 m, back wall 4.8 m, clerestory, one jack a bay | Default | Keep for the blockout; the hall is 4.6 m, so judge it from the green (finding 2). First cut if it looms: door wall to 5.6 m |
| 6 | The centre moves 3.2 m; bays stand at 190° ± 20°k (were 160°, 190°, 220°) | Default | Keep. The 9 November bearings were sized to three sheds |
| 7 | Home stops at seven bays; no track or building moves | New | **Seven at Home; the half ring is Port Quay's.** Under The full rotunda |
| 8 | Arrival: a ruin arc of five foundations | New | **Five, but standing:** each unbuilt bay keeps its two door piers at broken heights (2.5 m to full), not only slabs in the grass. Finding 1 |
| 9 | Three bays stand when the stall is raised (`shed.stall` 2) | New | **Keep three.** Replaces "one open stall with two ruin outlines, not a full three-stall shed" (9 November) under the 14 November call. Not five: under The ladder |
| 10 | Five bays when the first steel lands at Home | New | **Keep.** [roundhouse-trains](../research/roundhouse-trains.md) rec 1 (steel as the shed's expansion) |
| 11 | Stages 1 and 2 are free with the story | New | **Free.** Both read state the player already earned by hauling; a price here would be a second bill for the same work |
| 12 | Stage 3 (bays six and seven) is held | Decided | "Playtest before bespoke functionality", "Engine foundations first" |
| 13 | How a later bay is got: bought as a row on the garage screen | New | **Not bought as a bay.** A bay arrives with the thing that stands in it. Under What a bay holds. Held with stage 3 |
| 14 | What stands in built bays beyond bay 190° (designer call 2) | New | **Nothing in this plan, behind closed doors.** Candidates and their order under What a bay holds |
| 15 | The Roundhouse holds the garage only; the passenger set does not stand in it | Decided | [10 November](../decisions-rail.md#d-2026-11-10-the-passenger-set-does-not-stand); the shunter, wagon and steel stack stand |
| 16 | Doors: always open, or open only for an occupied bay (designer call 7) | Default | **Closed on an empty bay, open where something stands or is being worked on.** The repeated door along the curve is the thing that reads as a roundhouse, and a row of dark empty bays advertises that nothing is in them |
| 17 | `rollTicks` 140: the roll-out's deck turns 120° in 5 s (was 3.6 s) (designer call 7) | Default | Keep. 24° a second; the bridge's end moves at 3.4 m/s, slower than a walk, which is what makes it look heavy |
| 18 | Turn the table only when ready | Decided | [10 November](../decisions-rail.md#d-2026-11-10-turn-the-table-only-when-ready); unchanged |
| 19 | The install's show-off full turn on a 16 m bridge | Default | **The plan does not say. Start at 3.0 s for the full turn** (today 2.2 s). Finding 5 |
| 20 | The table's reach 6 m to 10 m, the post at 9.4 m, the jump-in landing at 9.2 m | Default | Keep; they follow the kerb |
| 21 | The garage round the bigger table: post 60°, stand and jib 85°, arm 11.0 m, crew behind the jib (designer call 3) | Default | Keep for the blockout, with the still in finding 4 |
| 22 | The garage camera: 85° kept until the building stands, then about 30° (designer call 3) | Default | Keep 85° through step 3. Rule at step 4 from the three stills; my prior is 30°, the engine against the doors |
| 23 | The roof (designer call 5) | Default | **Walkable, nothing gated or hidden up there in this plan.** With nothing gated, any ability may reach it (route contract). If only the glider reaches it, add no route; if nothing does, leave it. It is the natural place to watch an install from, so report reach from step 1b as planned |
| 24 | The ruin arc and the doors stand in for the missing cues on `stall`, `cradle` and `table` (designer call 1) | Default | **`stall` only, and only with standing piers** (finding 1). Doors do not say "fit eight rails" or "turn the table"; those two stay NO CUE in the loop graph |
| 25 | A stage rises in front of you (dust, `clank`, today's build timing); restored states snap; a rise waits for a shared moment to end | Default | Keep |
| 26 | The stone yard moves east of the arc's end | Default | **Not there.** Finding 3 |
| 27 | The footing carry grows about 6 m and passes the kerb | Default | Fine: 1 s at a walk |
| 28 | One level pad at 18.00 under the arc, and the pit | Decided | "Place for the look, not the cost; terrain may change" |
| 29 | Two rotundas, Home's and Port Quay's, from one kit | Decided | [10 November](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not), the 14 November call |
| 30 | How the second rotunda differs | New | Under A second hub |

Five decided, sixteen default, nine new.

### What we think

**Scale: 16 m, and the table is not what makes it big.** The door ring is set by the bay angle (20° needs 14 m for a 4.86 m door chord), so a 14 m table saves no ground: the building stands in the same place and the apron grows a metre. What 14 m changes is the fit, and it brings back the complaint: the engine and two cars a Cars install shows are 12.7 m, 91% of a 14 m bridge, and the 14 m end-game engine does not fit. On 16 m today's works copy fills 56%, which is loose for a real table but right for one whose main job is a stage. The size risk is the building. One bay is 75 m², the hall is 78 m² (13 × 6 m, 4.6 m high); five bays are nearly five halls, and seven are 47 m across against the Round's 40 m ring road. I think that is right: the Roundhouse is where the railway lives and the hall is where you wait, and the town sees the 4.8 m back wall, about the hall's own height, with jacks over it as a thing to steer by from the green 60 m (11 s) away. It is right only if the back does not read as a 47 m blank wall from the Round; finding 2.

**The full rotunda: seven at Home, the half ring at Port Quay.** I read "a full rotunda, as opposed to individual little shacks" as one building, not a closed circle. At 20° a full circle is 18 bays, and the decision log gives Home two things to put in them. What makes it read as a ring from Buddy's eye is standing on the apron with the doors curving round both sides of you, and 140° does that; from above, five reads and three does not, as the planner says. The plan overstates the ceiling a little: by its own 3.5 m rule an eighth bay on the east clears line 2 (4.3 m), and a ninth on the west misses by 0.2 m against road 2's dead stub and leaves a 3.5 m alley to the hall's corner. So nine at Home costs a metre off a buffer stub, not line 2's curve; its real cost is a crowded station (a wall 4.3 m from a running line and the hall boxed in) and two more bays with nothing to hold. Moving line 2's curve to do it properly means new arc lengths for line 2 at Home, the passenger set's east bay re-measured, the turnouts plan's meeting point moved and a second bump, for a building whose bays are empty. Recommendation: no track moves; the kit's `order` is not capped at ±3 so the data allows it; the blockout paints the outlines of bays 110° and 270° on the ground so the owner sees what nine would take when he walks it; Port Quay is laid out round a half ring from its first sheet. Owner question 1.

**The ladder.** Arriving to a ruin is a promise only if it is seen. Today's ruin outlines are knee-high (in `late-topdown-table-stalls.png` they read from above and barely from the ground), and slabs and rails in the grass 14 to 25 m from the pit will be flat lines at eye height. Standing door piers make the curve at arrival, and they make bay 190° the odd one out: its two piers are missing, there are two sockets, and the neighbours show what goes in them. That is the `stall` cue the loop graph lacks. With the arc drawn in piers from the start, three roofed bays at the stall beat is enough (the curve is already there; the roof and doors fill it in), and five is kept for steel so the second stage is a visible change, not a repaint. Starting at five would spend the steel beat's reward on two footings. Both triggers are beats the player works for (two 150 m carries; the whole Ring Island run to steel), so they feel earned; the one to watch is the size of the answer to two footings, three bays at once, which I think is the good kind of generous.

**What a bay holds.** This is the weak point, and it is why the plan's "seven as a bought upgrade" should change shape. A bay bought for its own sake is a bigger empty building. More bays is something the player wants when each new one stands for a thing they got: the bay rises with it, and its doors open. In order of fit with what is decided: (a) view only, no new mechanic: each line's train as fitted, engine and first car, one bay a line, read from the per-line fits that exist ("cars are bought per line"); (b) view only: replaced parts on show (the old boiler on blocks after the longer one goes on); (c) **new mechanic:** the bay as the place you pick which line the garage is working on; (d) **new mechanic:** owned engines or cars in stock to choose from. This plan builds none of them. The rule to carry into stage 3's brief: no bay is added without its occupant.

**The garage moment.** The bigger table helps what the camera sees (a bridge over a dark pit, the doors behind) and hurts what the hands feel. Today the post is 5.6 m from the centre and Buddy stands beside the engine. With a pit, everything fixed stands outside the kerb: the post is 9.4 m from the centre, about 7 m of pit from the engine's side, and the part crosses 11 m on the jib. In the garage view the camera hides that; a friend watching on their own camera sees a small engine across a hole. Finding 4. The 5 s roll-out turn helps. The show-off turn is unaddressed; finding 5.

**A second hub.** The kit should fix what makes the two the same family (bay, door, pit, bridge) and Port Quay's row should differ in five things: the arc (a half ring, nine or more, laid out for it); its state at arrival (standing and working, since you arrive by train at a going concern; Home is the one you restore); the way in (Home's table is beside the line on a spur; Port Quay's can be met head-on, the train passing the open side); what the bays hold (the lines that never reach Home); and its stone and trim, from the place. None of that changes step 1. One note for 1a: keep stage triggers out of the kit and on the site row, as `stages` already is, since Port Quay's will not be Home's.

### Findings

Changes wanted before step 1 are marked **(change)**.

1. **(change, step 1b) Block out the ruin, not only the built bays.** The blockout has a bay block and a table block, and shows bays by stage, so an unbuilt bay is bare ground and the two states the owner most needs to judge (arrival, and three bays) cannot be walked. Add the piers-only state to the bay block (two pier blocks at stub height, no lintel, wall or roof), shown for every bay in the arc that is not built; a plain slab in the door of a built, empty bay (call 16); painted outlines for bays 110° and 270°. Flow rule 1 (the next goal can be found): `stall` is NO CUE today.
2. **(change, step 1b proofs) Look from where players stand, at each stage.** One top-down still on `steel-home` proves the footprint and nothing about scale. Add player-eye stills on the arrival, stall-raised and `steel-home` seeds from: the spur's end; the green's centre and the hall's front (does the back wall read as a blank wall; does the roofline top the hall); and the footing carry's approach. If the back wall is blank from the green, the block gets its window openings now, since that is spacing, not detail.
   _Owner, 14 November 2026: "It does not matter if the rotunda cannot be seen from the green or the hull front." He means the hall front: no town-to-rotunda sightline is required, and the detail steps carry no sightline note ([decision](../decisions-rail.md#d-2026-11-14-rotunda-needs-no-town-sightline)); the town-sightline requirement in finding 2 is withdrawn._
3. **(change, step 1b) Keep the east side clear; do not put the yard there.** The footings come from the rack by hand, and the rack bears about 102° from the new centre, 148 m out: the carrier's first sight of the Roundhouse and their lane to bay 190° is the gap between line 2 and the arc's east end. The plan already stands the post at 60° and the stand and jib at 85°, and then moves the yard "east of the arc's end". Keep 95° to 125° outside the kerb free of props; the yard goes anywhere else that is 3.5 m from rail and still near the island's crossing. Lens (one main line), raised because this is the stretch's only carry.
4. **(change, Checkpoint A) Judge the install from Buddy's eye, not only the garage camera.** Add a still from the post at the player's own camera and one from a bystander on the kerb, beside today's. If the engine is small across the pit, the first thing to try is the post and stand near the bridge's 130° end, on its axis, where the copy's nose is about 5 m away instead of 9; that sector is free until bay 130° is built. Principle 8, and the bystander's view the 12 November review asked for.
5. **(change, step 1a) Give the show-off turn a duration.** Today the copy turns a full circle in 2.2 s on a 9.6 m disc. The same on a 16 m bridge puts its ends at about 23 m/s, which undoes "more realistic". Start at 3.0 s inside the same locked moment (skip from `c+800` stands), and time it on `garage-open`. A half turn is not the answer: it leaves the copy reversed for the next install's jib reach.
6. **(change, Checkpoint A wording) Nothing waits for the owner's walk.** "Then the owner walks it and rules on questions 1, 2 and 4" reads as a stop. Steps 2 to 5 proceed on the recommendations here ("Nothing waits for a playtest"); the diameter is one number. And section (e)'s "not shipped while the owner is mid-session" is retired (13 November, "Save resets never block development or architecture").
7. **A stage change and the install.** Steel landing raises bays 150° and 230° seconds before the player is sent to the lever post. Let the rise finish or snap when the garage opens; it should not play behind the garage camera's first frame.
8. **Co-op and solo.** Nothing here needs a second player and nothing strands one: the pit is the only drop and the plain jump clears it carrying. A friend who arrives late sees the standing state, as planned. The roof and the kerb are where a second player watches from; the apron (r 8.6 to 14, 5.4 m wide) holds three players and a jib.
9. **Reach claims without proof**, all deferred by the plan to a named step, which is acceptable: out of the pit carrying a footing (step 3, `level-check`); the roof per ability (step 1b); the works bot segment and `npm run loop -- run` after the points move (1a, Checkpoint A).

### The plan's owner questions, answered

1. **Table diameter:** 16 m. Built on it; the painted 14 m ring stays in the blockout for him to see.
2. **Bays at arrival and by upgrade:** an arc of five standing ruins at arrival, three roofed at the stall, five at steel. Not five at first build.
3. **Free or bought:** the first two stages free. Later bays are not bought as bays; each arrives with what stands in it (held).
4. **Seven at Home:** accept seven, move no track, make the half ring Port Quay's; show nine painted on the ground at the blockout.

### Owner questions

1. **Is Home's Roundhouse seven bays (140°) with the half ring saved for Port Quay, or do you want nine or more at Home?** Recommended: seven at Home. Nine fits with a metre off road 2's stub but boxes in the hall and stands 4.3 m from line 2; more than nine means moving line 2's curve. The blockout paints the two extra bays so you can see it standing there.
2. **What is a bay for?** Recommended: a bay never stands for itself; each new one arrives with something you got (first, each line's train as you fitted it). This decides what "the Roundhouse grows as an upgrade" means and is the brief stage 3 waits for. Nothing is built on it now.
