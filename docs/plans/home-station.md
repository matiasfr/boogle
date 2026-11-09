> **Status: proposed (2026-11-09).** Next: the designer rules on the Level findings and open questions, then build.

# Home station: one terminus, layout B

Plan for one job. Coordinates are Place-local metres unless marked "cm" (world centimetres: x = (local x + 1000) × 100,
z = local z × 100). North is −z. Bearings are degrees clockwise from north. `s` is metres along a line from its start.

## The owner's decisions (9 November 2026)

- Direction, with a screenshot of Home: "visual pass on home here should be done so the town is coherent, the rails feel
  more realistic, instead of 2 stations maybe it's one unified one, where the rails also make sense with the rotunda and
  is to scale. we can adjust placement as needed" ([decision](../decisions.md#decided), "Home gets one coherent station").
- After the options page: "I think I agree with recommended B. I think I agree with keeping the turntable, as you say. I
  go with your recommendation on question 3. And I agree with your recommendation on option 4 as well." So: layout B (a
  terminus with one concourse; the forge is the goods side); keep the 9.6 m turntable; one open stall and two ruin
  outlines; line trains never turn on the table.
- On the scale page: "With the scales here, I want you to take into account that maybe we want to make the train engine
  a little bit bigger."
- On how much bigger: "It'd be really cool if you could even see a little guy in the conductor seat. So it should be
  scaled up enough for that."

This plan does not resize the engine or model the driver (that is the queued engine visual pass). It derives the size
and makes the layout fit it ("The engine's size", below).

## Goal

Rebuild Home as one terminus station: both lines end at buffer stops beside one island platform and one concourse that
faces the town, and the turntable moves onto its own engine spur with radial stalls. It serves **11. Show, don't tell**
(the station is where the town and both lines visibly meet) and **7. Telegraph everything** (a train arriving is seen
from the square). It bends nothing; one cost is listed under open questions (footings walk further).

**Research:** [home-station-layout](../research/home-station-layout.md) (option B, the measured list of what is off,
recommendations 1 to 5, all followed; its join distances and stall bearings are changed below, with reasons).
[level-design](../research/level-design.md) (walk-seconds; something to notice every few seconds).
[world-scale](../research/world-scale.md) (proportions against Buddy, not real sizes).
[progression-flow-layout](../research/progression-flow-layout.md) and the [Home flow audit](../reviews/home-flow.md)
(the next goal can be found; station 5's wait). Departure from the research: it said B "moves no lockstep `s` value";
that holds for trains and stations, but the cart's road grows 10.64 m (below).

## What I checked, and how

- Read the layout code (`src/proto/place/layout.ts`, `terrain.ts`, `tech-layout.ts`, `shore-layout.ts`), the railway
  rules (`src/sim/railway-*.ts`), the views (`src/entities/railway/*-view.ts`) and the engine recipe
  (`assets/src/boiler-cart.py`).
- Laid the track out with a throwaway Dubins search (straight and fixed-radius arcs) against the game's own `LINES`,
  sampling the game's terrain `H`. The segment table below is the record; the script is not committed.
- Applied the two new line heads, the table, the halts and the yard props to `layout.ts` temporarily, ran
  `npm run level-check -- --place=place`, and reverted. Findings are under Level findings.
- Not done: no browser, GPU or bot run. The concourse, stalls, spur and cart leg are not objects the level check knows;
  they were checked only against building footprints and terrain height by the script.

## Design

### Sync kinds

Nothing new is shared. The railway is **Server** kind (`src/world/railway-server.ts`); this plan changes constants its
rules read, removes one op and one field, and adds no op, state, message or presence field. Everything drawn (track,
platform, concourse, table, stalls, the cart's and shunter's poses) is **Local**, derived from accepted state as today.
Authority is unchanged: the server validates every action against the pinned anchors. No controls change: no action id,
pad slot, key, touch target or guide row.

### The real geometry

The research page joined today's track at s 82 and s 86. Measured on the game's terrain, those points are on the
trestles (ground 1.3 m and 0.7 m under rails at 23.8 m and 20.0 m), and line 2's s 86 is the first point of the hook
walkway. Keeping both train stops at their `s` (14 and 17) fixes how far along the track each platform is, and no
layout with both joins before the gorge exists at any radius from 15 to 22 m. This plan joins as early as a constant
18 m radius allows:

| | Line 1 (road 1, north) | Line 2 (road 2, south) |
| --- | --- | --- |
| s = 0 | (−82.506, 4.203) | (−82.663, 12.348), 0.7 m from today's table centre |
| Straight, bearing 70° | to s 22 | to s 25 |
| Then | left R 18 for 18.490 m (58.856°), straight 15.391 m, right R 18 for 4.119 m (13.112°) | right R 18 for 20.421 m (65.003°), straight 22.774 m, left R 18 for 15.804 m (50.306°) |
| Meets today's line | s 60, (−46.10, −35.77), same heading | s 84, (−9.79, 29.29), same heading |
| Unchanged past the join | T3's frame, the trestle, the jump device, the lookout pillar | the hook walkway (starts s 86), the pillar at s 92, everything after |
| Furthest from today's track | 7.8 m at s 0 and s 30 | 34.3 m at s 36 |
| Tightest curve | 18 m (today 66 m here; 16 m at s 139 stays the line's tightest) | 18 m (today 15 m at s 32 to 34, which is removed) |

Axis: bearing 70°, unit d = (0.9397, −0.3420); its right-hand normal n = (0.3420, 0.9397). The roads are parallel,
7.6 m apart (a 4.3 m island plus 1.65 m to each track centre, the edge distance today's halts use).

- **Train stops** stay at `TRAIN_STOPS` s 14 and s 17. They stand side by side: (−69.35, −0.59) and (−66.69, 6.53),
  0.07 m apart along the axis. Trains cover s 8.7 to 19.2 (line 1) and 8.0 to 22.2 (line 2 with the footing wagon).
- **Buffer stops** abeam at road 1 s −5.53 (−87.71, 6.10) and road 2 s −2.60 (−85.11, 13.24). Road 1's stub runs 2.9 m
  from the forge's south wall: it is the forge's goods dock.
- **Island**, centred between the roads. Ground-level apron from the buffers for 3.3 m (the forge rack stands here),
  head ramp 5 m, deck 18 m at rail + 0.72 m (today's deck height, level with the flat cars), end ramp 4 m. Deck spans
  line 1 s 2.8 to 20.8 and line 2 s 5.7 to 23.7. No ramp off the back (it would cross a track).
- **Concourse**, 13 × 6 m (the page had 13 × 7), centre (−90.16, 11.03), long side across the axis, 1.0 m behind the
  buffers. Corners (−95.21, 5.95), (−89.57, 3.90), (−85.12, 16.12), (−90.76, 18.17). An open hall on posts with end
  walls: the square sees through it to the buffers and trains. The curio shelf moves inside, on the north end wall at
  (−91.70, 6.80) facing into the hall. The south end wall at (−88.62, 15.26) is reserved for the works board.
- **Engine spur.** Leaves road 2 at s 5.5 (−77.49, 10.47) to the right, R 15 through 60° (15.71 m) to bearing 130°, then
  1.5 m straight to the rim. **Table** centre (−57.90, 17.12), r 4.8 (9.6 m), 24.6 m from today's (the page said about
  21 m; the larger spur radius moved it). Ground 18.0 m, flat.
- **Stalls**, radial at bearings 160°, 190° and 220°; the middle (190°) open, the other two ruin outlines. Doors 8.5 m
  from the centre (so 4.4 m frames 30° apart do not overlap, and the footing sockets get a 3.7 m apron), 9 m deep, door
  3.6 m clear and 4.0 m high (today's frame). Open stall: door (−59.37, 25.49), back (−60.94, 34.35). Outline backs
  (−51.91, 33.56) and (−69.15, 30.53). The page had 130°, 160°, 190° with the spur arriving at 160°, which puts the open
  stall straight through from the spur, so "Turn the table" would change nothing you can see. Here the table swings 60°.
- **The cart's leg** (the page's "crossover"). Leaves line 1 at s 54 heading inbound, left R 15 for 3.7 m (14°),
  straight 14.5 m, right R 15 for 20.4 m (78°), and meets road 2 at s 26, just past the island. 38.64 m.
- **Moved yard props** (Place-local, drawn only): `RACK` (−84.90, 9.12), `CRANE` (−72.4, −3.1), `DOCK` (−76.15, −1.73),
  `YARD` (−46, 22), `SHELF` as above. Today's rack, pedestal and crane all stand on or within 1.7 m of road 1.
- **Frames.** Q1's frame flips to the south side of road 2 (`side: 1`; the north side is the island): (−74.93, 17.51).
  Q2's frame follows the line to (−40.52, −1.51). The other frames do not move.

**One trap.** `LINES.north` and `LINES.east` use `TURNTABLE` as their first spline point. Moving `TURNTABLE` reshapes
both whole lines (line 1 came out 3 m longer in my first run, and the jump device moved). The lines' origin must become
its own constant, `LINE_ORIGIN = { x: -82, z: 12 }`, before the table moves.

### Constants that change

All are Server-kind rule constants. "Shape" means the saved or wire shape changes.

| Constant (file) | Old | New | Shape |
| --- | --- | --- | --- |
| `CART_ROAD.forgeCm` (`src/sim/railway-cart.ts`) | 19600 | 20664 | saved cart rows hold road distances: yes |
| `rail.cartCall`, `Cart.recall`, `CART_CALL`, `CART.forgeTicks` (`railway-cart.ts`, `railway-systems.ts`, `railway-world.ts`, `railway-line2.ts`, `src/world/railway-server.ts`, `railway-predict.ts`, `src/adapters/railway.ts`) | present | removed | yes: an op and a field go |
| `LINE_HALTS[0]` Village (`src/sim/railway-train.ts`) | x 92819, z −434 | x 93007, z 367 (y 1902, reach 1260 unchanged) | no |
| `LINE_HALTS[2]` Village, line 2 | x 92779, z 2617 | x 93013, z 365 | no |
| `LINE2_STATIONS` Q1 x, z (`src/sim/railway-line2-layout.ts`) | 92719, 1059 | 92507, 1751 | no |
| `LINE2_STATIONS` Q2 x, z | 94948, 3056 | 95948, −151 | no |
| `LINE2_FORGE.rackX`, `rackZ` | 91450, 540 | 91510, 912 | no |
| `LINE2_BOILER` x, z, y | 91900, 540, 1815 | 92200, −105, 1800 | no (the `Boiler` row's defaults in `railway-world.ts` follow it) |
| `WORKS_BREAKER` (`src/sim/railway-works-layout.ts`) | 91900, 540, 1815 | 92200, −105, 1800 (it stays on the pedestal: the designer ruled out a separate stand in boiler-first) | no |
| `SHED_TABLE` | 91800, 1200, y 1830 | 94210, 1712, y 1830 | no |
| `SHED_STALL` | 90950, 2050, y 1800 | 94011, 2845, y 1800 | no |
| `WORKS_SEAMS[0]` (stall) | 91240, 1760, y 1830 | 94063, 2549, y 1830 | no |
| `WORKS.rollTicks` | 60 | 110 | no (a wagon mid-roll would mistime) |
| `railBoilerSoloSpeed`, `railBoilerHelpSpeed` (`src/sim/tune.ts`; boiler-first step 7) | absent | appended | yes: the tune state's key count |

Unchanged, and checked: `TRAIN_STOPS`, `LINE1_STATIONS`, every `fromCm`/`toCm`, `WAGON_S` (960), `PIER_STOP_CM`,
`CART_ROAD.behindCm` and `rackCm`'s form, `LINE2_FORGE.turnTicks`, `LINE1_JUMP_DEVICE`, `LINE2_HOOK`, `LINE2_BOILER_AREA`
(it contains the new pedestal and the haul route), `RECOVERY_RACK`, `LINE2_PACK`, `LINE1_AXE_STAND`.

Q1, Q2 and the halts are the values Place's own `frameBesideLine` and halt maths give on the new lines; the level
check's "authority anchor" assertions compare them, so pin what they print if a centimetre differs.

### The one bump: v24

A `WORLD_NS` bump is needed: `CART_ROAD.forgeCm` invalidates saved cart rows, and a saved boiler, breaker or return spot
could sit inside the new station. Everything that needs a reset rides this one, in step 6:

1. this plan's constants (the table above);
2. the removal of `rail.cartCall` and `Cart.recall` (the handle was cut on 9 November; its rule was waiting for a bump
   and did not make v23);
3. step 7 of [boiler-first-choice](boiler-first-choice.md) (the two boiler pace tunables);
4. the Pier halt fix, if its review finds it must move `PIER_STOP_CM`.

It ships only when `npm run heartbeat` shows no live owner session.

### The cart

Today the cart's road is one line of centimetres: line 1 from the camp down to the table (19600), then out along
line 2. `cart-view.ts` maps a distance d to line 1 at `F − d` or line 2 at `d − F`.

In B it runs down line 1 to s 54, takes the leg into road 2, and stops at road 2's s 0, beside the forge rack on the
island's apron (3.9 m away). That is the forge stop. It then sets off the other way, out along line 2. So:

- **Rules:** no new phase. `cartStep` and `CART_PHASE` are untouched apart from losing `recall`. The reversal is the
  existing stop at `FORGE`: `OUT` ends there, `RUN` starts there. Only `forgeCm` grows, by the leg's detour:
  (196 − 54) + 38.64 + 26 = 206.64 m. Past it, a distance still maps to line 2 at `d − F`, so every rack stop
  (`rackCm`) is where it was along line 2.
- **View:** `cart-view.ts` gets a three-part road: line 1 at `196 − d` for d ≤ 142; the leg for 142 < d ≤ 180.64; road 2
  at `206.64 − d` up to F; then line 2 at `d − F`. The cart keeps its heading through the reversal (it runs backwards;
  no 180° snap).
- **A rider** comes in facing forward, swings left at the throat with the station opening ahead, rolls up platform 2 to
  the buffers, pauses (0 s with nothing to load, 3 s with rails, longer if the forge owes rails), then rides out
  backwards past the platform and round the long right-hand curve.
- **Timing:** each pass through the throat is 10.64 m longer, about 1.2 s at 9 m/s, so a round trip is about 2.4 s
  longer. Station 5's wait does not change in any way a player would notice (the Home flow audit puts it at 80 to
  125 s after the 24-rail cart).
- **Why not stop on road 1, by the forge:** the cart would then need a connection from road 1 out to line 2, which can
  only land past s 40, and Q2's rack stop is at s 29. It would stop on the connection, 17 m from Q2's rack.
- **Simpler alternative that keeps the fiction, rejected:** a goods chord straight from line 1 to line 2 that bypasses
  the station. No reversal, but the forge stop would be 40 m from the forge and the cart would never visit the station.

The cart passes through a train standing at platform 2. It does that today on both lines; see open question 6.

### The shunter, the wagon and the table's hold

The rules are already abstract: `shed.table` is road 0 (stall) or 1 (line 2), `rail.turn` flips it on the revision the
actor saw, and the table holds while `ready ≥ 0` and the wagon is not coupled. None of that changes. `SHED_ROAD` keeps
its two roads; road 1 now means "the spur".

The view's shunt path (`roundhouse-view.ts`, `pathPts`) becomes: the open stall, its door, the table, the spur up to
road 2 at s 5.5, on to the buffer stub (the shunter leads, so both clear the points; the stub is 8.1 m for a 7.6 m
pair), then back out along road 2 to `WAGON_S` (s 9.6), the tail of the standing train (s 11.7). One reversal on the
stub. The path is about 47 m against today's 26 m, so `WORKS.rollTicks` goes from 60 to 110 to keep about 4.3 m/s. A
train held for the wagon waits at most 11 s instead of 6.

On road 2, in order and never overlapping: buffer −2.6, cart −1.35 to 1.35, spur points 5.5, wagon 8.0 to 11.2, train
11.7 to 22.2, leg 26.

The track layer needs nothing: it waits at line 1 s 19 after T3 (now inside platform 1) and cuts to line 2 s 7 when the
forge has turned it (`turnTicks`), exactly as today. It is never drawn crossing.

### Where a player stands

- **Arriving from the shore.** The path ends at the square (−98, 9), 3.7 m from the concourse's open front; spawn
  (−97, 14) is 4.5 m from it and Sleeves the greeter (−95, 12) 1.9 m. First sight: through the hall, the two buffer
  stops and the island running away between two tracks, the forge's wall to the left, the turntable beyond on the
  right. Today the same spot looks at a bare disc.
- **Forge rack to the frontier.** Rack on the island's apron (−84.90, 9.12). To Q1's frame 13 m (today 13.7 m). To
  Q2's cart stop at s 29: 30 m, up the head ramp, along the island and down the end ramp (today 36 m, across open
  ground). The island is the road to the frontier.
- **Pedestal to the old train.** The pedestal (the boiler, later the breaker) stands on the forge side of road 1 at
  (−78.0, −1.05), 3.4 m from the track and 4.0 m from the forge's east wall. The haul to the old train is 172 m in a
  straight line up line 1's bed (today 179 m).
- **Footings to the stall.** You step off line 2's train on the island near (−66.7, 6.5). The stall's sockets are across
  road 2: 19 m if you hop off the platform edge and cross the track, 36 m by the end ramp. Today 11 m.
- **Pedestal (the breaker) to the stall seam:** 32 m (today 14 m).

### The engine's size

From the code today:

| | Length | Width | Height |
| --- | --- | --- | --- |
| Engine (`LOCO` spec, `src/proto/wagon/look.ts`; shell `train_shell`, `assets/src/boiler-cart.py`) | 3.0 m spec, 3.3 m overall (cab roof to buffer beam) | 1.6 m (cab 1.5, roof 1.72) | cab roof 2.05 m, chimney 2.07 m |
| Flat car (`TRAILER`) | 3.2 m | 2.2 m | deck 0.70 m |
| Footing wagon (`WAGON_CAR`, `train-view.ts`) | 3.2 m | 2.2 m | deck 0.50 m |
| Train | 10.5 m (14.2 m with the wagon), cars 3.7 m apart | | |
| Cab | 1.0 m long | 1.5 m | solid red box to 1.41 m; four posts; opening 0.54 m high, 0.63 m long at the side, 1.03 m wide at the back; roof underside 1.95 m |
| Little guy (`src/proto/place/folk.ts`) | 0.55 m deep at the hat | body 0.46 m, hat 0.58 m | 0.99 m standing; seated he squashes to 0.9: head 0.39 to 0.84 m above his seat, hat top 0.89 m |

Smallest scale for a seated little guy with his head and hat in the side window: the opening must hold chin to hat top
(0.50 m) plus 0.03 m over the sill and 0.10 m of headroom, 0.63 m, against 0.54 m today: **1.17×**. The hat's width
(0.58 m plus 0.06 m each side against 0.63 m) needs 1.11×. Recommended: **1.25×**, so he is not wedged in:

| | Today | 1.17× | 1.25× (recommended) | 1.5× (what the layout is sized for) |
| --- | --- | --- | --- | --- |
| Engine length (spec / overall) | 3.0 / 3.3 | 3.5 / 3.9 | 3.75 / 4.1 | 4.5 / 5.0 |
| Width (body / roof) | 1.6 / 1.72 | 1.87 / 2.0 | 2.0 / 2.15 | 2.4 / 2.58 |
| Height (roof / chimney) | 2.05 / 2.07 | 2.40 / 2.42 | 2.56 / 2.59 | 3.08 / 3.11 |
| Window opening (high × long) | 0.54 × 0.63 | 0.63 × 0.74 | 0.675 × 0.79 | 0.81 × 0.95 |
| Turntable 9.6 m ÷ engine | 3.2 | 2.74 | 2.56 | 2.13 |

At 1.25× his seat top is 1.44 m up, 0.56 m above a cab floor hollowed to the chassis top. From the trailing camera he
shows through the back opening (1.29 m wide, sill 1.76 m). The cab is solid today, so any size needs it hollowed.
Without scaling at all, raising only the cab roof 0.12 m would also fit him; the owner asked for the engine scaled.

**Do the cars have to grow?** No. At 1.25× the engine is 2.0 m wide against 2.2 m cars; today it is narrower than its
own train (1.6 against 2.2), which is part of why it reads small. Both cases are sized for:

- **Engine only, up to 1.5×.** Needs the engine moved 0.4 m further from the first car (3.7 m to 4.1 m, in the views'
  car tables), because the gap behind the cab is 0.6 m today. The train's front moves 0.8 m at 1.25× and 1.9 m at 1.5×.
- **Whole train, up to 1.25×.** Cars 2.75 × 4.0 m, 4.63 m apart, train 13.1 m (17.75 m with the wagon). The limit is
  1.36×: car sides reach the platform edges (1.65 m from the track centre) at 1.5×.

What the new station allows, sized for those two cases:

| Clearance | Chosen | Why |
| --- | --- | --- |
| Track centres | 7.6 m | 4.3 m island + 2 × 1.65 m; engine at 1.5× is 1.29 m half-width, cars at 1.25× 1.375 m |
| Platform deck | 18 m, plus ramps | whole train at 1.25× spans line 2 s 5.75 to 23.5 |
| Straight past each stop | 8 m | the front at 1.25× whole train is 6.5 m past the stop |
| Buffers | road 2 s −2.6, road 1 s −5.53 | the rear at 1.25× reaches s 5.75, clear of the points at 5.5 and the cart |
| Concourse face | 1.0 m behind the buffers | nothing overhangs the tracks |
| Canopy underside | at least 4.6 m above the rail | a player standing on the engine's boiler top at 1.5× is 4.2 m up |
| Curves | lines 18 m, leg and spur 15 m | no tighter than what the lines already have (15 to 16 m) |
| Stall door | 3.6 m clear, 4.0 m high, 9 m deep | engine at 1.5× is 2.58 m at the roof and 3.1 m tall |
| Table | 9.6 m | 2.13× the engine at 1.5× |

**Where a bigger engine does not fit today, on either line** (for the engine visual pass):

1. **The gap behind the cab:** 0.6 m. At 1.25× it is 0.1 m at the roof unless the engine moves 0.4 m forward.
2. **Gauge:** the wheels sit on rails ±0.5 m. The shell scales; the wheelsets stay on the gauge.
3. **The Pier halt:** the front stands at s 735.2 and the parked track layer already overlaps it (the fix in flight).
   The fix should leave 2 m more than today's train needs.
4. **The quarry and sea gates:** jambs 6.4 m apart with nothing overhead, so they fit any size. The quarry gate's new
   headstock (in flight) must stay 4.6 m above the rail or beside the track.
5. **The cab** is solid and `LOCO` is shared with the classic wagon prototype and is the rideable collider's size.

Everything else fits up to 1.5× engine-only: the trestles (a 3.6 m open deck, nothing overhead), the old halts (roofs
start 1.95 m from the track centre), Far Head (the front is 5.8 m inside its platform), the quarry halt (6.8 m short of
the gate), the camp (8.8 m of line beyond), today's stall frame and the table.

### Art

This is also the visual pass the owner asked for. Greybox first; nothing in the layout steps waits on art.

| Piece | Previz and sheets first? | Budget by prominence |
| --- | --- | --- |
| Concourse hall | yes: previz from a real screenshot at the square, then front, side and back sheets with close-ups of posts, brackets and the clock or name board | hero: you spawn beside it. Up to 12k triangles, one draw |
| Platform canopy | yes, on the same sheet as the hall (they are one building) | hero, seen from trains for minutes: up to 8k |
| Buffer stops (2) | yes, one sheet | small prop seen close: 600 each, instanced |
| Open stall and two ruin outlines | yes: one sheet, three states (sealed slab, built frame, outline) | mid: 6k for the stall, 800 per outline |
| Turntable pit, rim and bridge | storyboard and parts sheet, not a beauty render (owner call "Machines show their work physically"): the bridge has a hut at one end so its heading reads | mid: 4k |
| Island deck, edge stones, ramps, bench, signal, board, lamps | no: today's halt parts (`halts-view.ts`) | reuse |
| Track, points, crossing timbers | no: `rail.ts` pieces; points are two extra rail pairs and a lever | reuse |
| Town paths, apron flagstones | no: `PATHS` and the path mask | terrain only |
| Crane, dock, yard | no: existing props, moved | reuse |

Codex is out until 13 November, so previz may wait; steps 1 to 6 do not.

## Steps

Smallest first. Each leaves `npm run check` green. No step runs the long playthrough (owner call "Tight tests per
change; the full loop once a day").

- [ ] **1. The geometry as data, with its tests.** No behaviour change.
  - New `src/proto/place/home-station.ts` (Local, no three.js): `HOME_B` with the axis, `LINE_ORIGIN`, both heads as the
    segment table above, the leg, the spur, the table, the three stalls, the island (apron, ramps, deck), the concourse,
    the buffers and the moved props. Exports `headPoints(line)` (1 m samples from s 0 to the join, marching the
    segments), `legPoints()`, `spurPoints()`, `shuntPath()`, `cartRoadAt(d)`.
  - New `test/home-station.test.ts`:
    - each head has join + 1 samples 1 m apart, ends within 0.03 m and 0.5° of today's line at s 60 and s 84;
    - both train stops are on the straight and within 0.2 m of abeam;
    - on road 2 the buffer, cart, points, wagon, train and leg intervals are in order and disjoint, for today's train
      and for a whole train at 1.25×; no train stop overlaps a buffer or a parked machine;
    - every stop's cars lie beside the deck, 1.65 m from its edge, and within `reach` of the halt's centre;
    - the stalls' centrelines pass through the table's centre, 30° apart, and their frames do not overlap;
    - no track centre is within 2.8 m of a building footprint (`FORGE`, `TOWN`, `ROOM_PLOTS`);
    - the cart's road is continuous and `cartRoadAt(F)` is road 2's s 0.
  - Verify: the new test; `npm run check`.
- [ ] **2. The 2D page shows the real geometry.** Docs only.
  - `docs/world/home-layout.html`: replace option B's data block with step 1's output (a small script,
    `dev/level/home-station-page.ts`, prints it); stalls at 160°, 190°, 220°; the leg where the crossover was drawn; the
    moved props; a row for the engine at 1.25×. Republish the artifact at its URL.
  - `docs/research/home-station-layout.md`: status to "adopted, with the plan's changes".
  - Verify: open the page; its clearance list shows no "warn" for B.
- [ ] **3. Draw the layout in 3D behind `?home=b`.** Look only; default off; the rules still use today's anchors, so
  prompts at Home are in the old places in this view.
  - `src/proto/place/home-station.ts`: `homeLayout()` is true for `?home=b` or the environment variable
    `BOOGLE_HOME=b` (for Node tools).
  - `src/proto/place/layout.ts`: `LINE_ORIGIN` replaces `TURNTABLE` as both lines' first point (always). When
    `homeLayout()`: splice `headPoints` into `LINES.north` and `LINES.east`; `TURNTABLE`, `YARD`, `RACK`, `CRANE`, `DOCK`,
    `SHELF` take B's values; Q1's `side` is 1; the two Village `HALTS` become `{ s0: 3, s1: 21, lat: 3.8 }` and
    `{ s0: 6, s1: 24, lat: -3.8 }` with a new `island: true`.
  - `src/entities/railway/halts-view.ts`: an `island` halt builds one shared deck (4.3 m wide), the head and end
    ramps only, and no roof (the canopy comes in step 8). Standing on it calls both lines' trains.
  - `src/entities/railway/works-shape.ts`, `roundhouse-view.ts`: under the flag, stall boxes on the 190° radial, two
    outline slabs, the table at B's centre with yaws 190° and 130°, rails on the spur and stall roads, `pathPts` from
    `shuntPath()`.
  - `src/entities/railway/cart-view.ts`: under the flag, pose from `cartRoadAt(d × 206.64 / 196)` on the way in (the
    rules still say 196), so the reversal can be seen.
  - Greybox boxes for the concourse, buffers and points (one merged mesh, static colliders for posts and buffers).
  - `src/proto/place/sites.ts`: feet for the concourse and stalls, so little guys walk round them.
  - Verify: `BOOGLE_HOME=b npm run level-check -- --place=place` (expect the findings below fixed);
    `npm run look -- --rail-seed awake --query 'home=b' --cam … --look …` from the square, from the island and from
    above; `--rail-seed trains-on --query 'home=b' --video` of a train arriving and leaving; `--rail-seed q4-arriving
    --query 'home=b' --video` of the cart's reversal; `--rail-seed cradle-fitted --query 'home=b' --video` of the
    roll-out. `npm run perf` (new meshes).
- [ ] **4. The owner sees it.** Send the full link `https://boogle.club/?home=b` and the three stills. Designer rules on
  the Level findings and questions 1 to 7. Adjust step 1's numbers if he moves anything, and rerun steps 1 to 3's checks.
- [ ] **5. Make tools follow the anchors.** No behaviour change.
  - `dev/look/bots/railway.ts`, `railway-works.ts`, `dev/look/evals/railway-home.ts`, `railway-halts.ts`,
    `railway-gated-fill.ts`, `railway-works-at.ts`: every Home waypoint that is a literal becomes a value read from the
    sim constant it stands for (`LINE2_FORGE`, `LINE2_BOILER`, `WORKS_BREAKER`, `SHED_TABLE`, `SHED_STALL`,
    `WORKS_SEAMS[0]`, `LINE_HALTS`, Q1 and Q2), with offsets.
  - Verify: `npm run playthrough -- --to forge-lit`; `npm run look -- --rail-seed q1-done --eval
    dev/look/evals/railway-home.ts`. Coordinate with the hot-file split of `railway.ts` and `rail-seed.ts`.
- [ ] **6. The flip, with the one bump (v24). Independent review (`src/sim`, `src/world`).**
  - `src/proto/place/home-station.ts`, `layout.ts`: B is the layout; delete `homeLayout()`, the flag and today's
    branches.
  - The constants table above, in `src/sim/railway-train.ts`, `railway-line2-layout.ts`, `railway-works-layout.ts`,
    `railway-cart.ts`, and the boiler row's defaults in `railway-world.ts`.
  - Remove `rail.cartCall`: the system and its `OPS` entry (`railway-systems.ts`), `recall` from the `Cart` schema
    (`railway-world.ts`), from `RailCart`, `CART_IDLE` and the validation in `railway-line2.ts`, `CART_CALL` and
    `CART.forgeTicks` (`railway-cart.ts`), the op in `railway-server.ts`, `railway-predict.ts` and
    `src/adapters/railway.ts` (`callCart`, the `holds` case), and its generator and tests.
  - Boiler-first step 7 as written in that plan (`src/sim/tune.ts`, `src/tunables/catalog.ts`).
  - `src/entities/railway/cart-view.ts`: the three-part road, unscaled. `roundhouse-view.ts`: the flag's branch
    becomes the only one.
  - `src/world/namespace.ts`: `WORLD_NS = 'v24'`, with a history line naming all four items.
  - Tests: `test/railway-works-layout.test.ts` (the table equals `HOME_B.table`; "the wagon waits between the points and
    the train"), `test/works-shape.test.ts`, `test/railway-cart.test.ts` (`forgeCm` equals
    `Math.round((196 − 54 + legLength + 26) × 100)`; the cycle time), `test/railway-train.test.ts`,
    `test/greybox-works.test.ts` with `src/sickle/map-data.ts` and the `common.works` and line-2 block of
    `docs/world/map-prototypes.html` (they hold a copy of line 2's shape and the Works anchors),
    `test/railway-placement.test.ts`, `dev/scenarios/world-inputs.ts`, `dev/economy/ring-data.ts`.
  - `docs/game-design/place.md` (Home, the cart, the Roundhouse), `docs/agents/orchestrator-state.md`.
  - Verify: `npm run check:full`; `npm run level-check`; `npm run checkpoints` and
    `npm run checkpoints -- q1-done q4-arriving q5-carry works-arrive stall-done cradle-fitted wagon-on`; segments `playthrough --to Q1`,
    `--from q5-done --to trains`, `--players 2 --to T2 --warp-speed 3`, the Works bot from `works-arrive`
    (`dev/look/evals/railway-works-bot.ts`); `npm run scenario -- world-inputs`; the three videos of step 3 without the
    flag, in real time, read frame by frame for the reversal and the wagon's set-back. Ship only with no live owner
    session.
  - Bot beats redone here: `forge-lit`, `Q1`, `Q2` (rack, frames), `trains` (pedestal, haul start), the Works bot's
    breaker, strike, footings and turn. Beats past Q2 on line 2 and all of T1 to T3 are untouched. Seeds are rebuilt
    from the sim on every run, so none is stale; the jump-in rows that land by a Home anchor need their landing probe
    rerun.
- [ ] **7. Previz and reference sheets** (parallel with 1 to 6): the Art table's first five rows, from stills taken in
  step 3. Owner picks.
- [ ] **8. The concourse and canopy** (look only): the model replaces step 3's boxes; the shelf inside; a blank wall
  for the works board. Verify: stills from the square and a train; `npm run perf`.
- [ ] **9. Buffer stops, platform dressing, points levers** (look only).
- [ ] **10. The stall, the outlines and the table's pit and bridge** (look only; motion review of the turn and the
  roll-out in the asset stage first).
- [ ] **11. Town paths meet the station** (look only): `PATHS`' hub and the path mask run to the concourse front; an
  apron of flagstones under the hall and the rack; a boarded crossing over road 2 at the island's end toward the stall.

## Level findings

`npm run level-check -- --place=place` with the new line heads, the moved table and yard props, Q1's frame flipped and
the two Village halts as plain 22 m decks. For the designer:

1. **Passed:** machine clearance, 61,660 poses of the track layer on the new line 1 against buildings, frames and props,
   0 problems. Every progression assertion still holds: all frames and racks, the forge rack, "stop at 17", the jump
   course, the hook, the glider, the secrets. Nothing became reachable before its ability; the rail grades are
   unchanged (26.5% and 22.5%, both past the joins).
2. **Fails until built as planned:** each Village halt's back ramp passes 35 to 38 cm into the other road's sleepers.
   The island has no back ramp (step 3).
3. **Fails:** the forge rack at (−84.90, 9.12) has one foot 5.7 cm off the ground, where line 2's bed meets the commons.
   The apron slab in step 11 fixes it; until then nudge the rack up to 0.6 m toward the island's centre.
4. **The trestle's first metres move.** Line 2 joins at s 84; the land ends near s 77. At s 76 the new track is 2.3 m
   north of today's, at s 80 0.6 m. The west end of line 2's trestle is rebuilt by the game from the new line; the hook
   walkway (from s 86) and pillar do not move. If the designer wants the trestle untouched, R 16 with joins at s 56 and
   s 80 keeps it within 0.5 m, with tighter curves and 20° more turning on each line.
5. **Line 1 joins on its approach bank** (s 60, rail 0.4 m over the ground). The natural ground under the new track is
   0.6 to 1.1 m low from s 32 to s 52; the terrain's rail-bed pass must raise it. Check `production grounding` in step 3.
6. **The square is shallow:** 3.7 m from the path's end to the hall, 4.5 m from spawn, 1.9 m from the greeter. The hall
   is open so it reads as a forecourt, not a wall. The bold path north passes 2.8 m from its north-west corner.
7. **Things under the new station that must move** (all in the plan): the curio shelf (inside the hall), the forge
   rack, the pedestal and the crane (on road 1), the stone yard (under the table), today's stall ruin.
8. **Tight spots that pass:** road 1's stub is 2.9 m from the forge's wall (1.7 m of walkway past the sleepers); the
   hall's corner 2.9 m from the forge; the recovery rack 5.0 m from the hall.
9. **Footings walk further:** 19 m with a hop off the platform edge, 36 m by the ramp (today 11 m).
10. **Not checked by the tool:** the hall, stalls, table, spur and leg are not objects it knows. The script found no
    building within 6 m of any of them and flat ground (18.0 to 18.2 m) under all.

## Risks

- **Room safety:** no effects move into `apply`; the removed op must go from the server's op list, the adapter's
  `holds` and the predictor together, or a stale client call is rejected noisily. Nothing here reads a mesh for state.
- **Mixed builds:** dev phase, so no compatibility code; the bump is the break. An old tab after v24 sees a new room.
- **Hot files:** `layout.ts`, `railway-systems.ts`, `src/adapters/railway.ts`, `rail-seed.ts`, `bots/railway.ts`,
  `place.md`. Step 6 touches all of them; keep it one short-lived branch.
- **`npm run inflight`** (run 9 November, after rebasing): one branch, `ship/matias-franco-e0f9d96`, editing
  `docs/plans/boiler-first-choice.md`, `docs/agent-calls.md` and the state file. No code overlap.
- **Performance:** the hall, canopy, stalls and points add meshes at the busiest spot in town; `npm run perf` in steps
  3, 8 and 10. Town was only just brought back under its draw budget.
- **The preview flag draws a view the rules do not match.** It is for looking, never for playing; step 6 deletes it.
- **Place retirement (D1)** moves or deletes `src/proto/place`. `home-station.ts` and `layout.ts` go wherever the
  layout goes; D1 should land after step 6 or carry the flag.

### Work in flight and queued, and the order

| Work | Effect | Order |
| --- | --- | --- |
| [Boiler first](boiler-first-choice.md) (P1) | Its pedestal at (919.0, 5.4) is on road 1; it moves to the forge side of road 1 in step 6, with the breaker on it (the proposed stand at (919.0, 2.0) was ruled out on 9 November; if it ever returns, site it 3.4 m along road 1 at (−74.83, −2.21)). Its step 7 rides v24 | Build its stages now on today's layout; do not wait. Step 6 re-pins the pedestal |
| Cut "Call cart to forge", part 2 | Rides v24 | In step 6 |
| Pier halt fix (P2) | If it moves `PIER_STOP_CM`, it rides v24; leave 2 m for a bigger engine | Before step 6 |
| Quarry gate's top (P2) | Headstock 4.6 m above the rail | Independent |
| Train stools (P2) | Car decks stay level with the island's deck | Independent |
| Train engine visual pass (P2) | Takes "The engine's size" as its limits | After the owner answers question 8 |
| Playtest jump-ins | Rows landing at "the usual spawn" are unaffected; rows landing by a Home anchor rerun their probe after step 6 | Before or after; rerun then |
| Split-rock Works signposting (P1) | The stall seam moves 30 m east; the pedestal-to-seam walk grows from 14 m to 32 m. Its designer pass should use the new places | Design now with these numbers; build after step 6 |
| Upgrade-choices works board | Sited on the hall's south end wall, beside platform 2's buffers | After step 8 |
| Hot-file split | Step 5 edits the same bot files | Split first, or do step 5 inside it |

## Open questions

Recommendations first. Under "Pick and log, don't ask", the orchestrator may take them and log them in
[agent-calls](../agent-calls.md); 1, 8 and 9 are the owner's.

1. **(Owner) Stalls at 160°, 190°, 220° instead of 130°, 160°, 190°?** Recommended: **yes**. Same fan, turned 30°, so
   the table visibly swings 60° between the spur and the open stall. With the page's bearings the open stall is
   straight through and the turn shows nothing.
2. **(Designer) Join line 2 at s 84 with R 18, moving the trestle's first metres up to 2.3 m?** Recommended: **yes**;
   the fallback is R 16 and joins at s 56 and s 80.
3. **(Designer) The cart stops at platform 2's buffers, not on the forge side.** Recommended: **yes**, with the forge
   rack on the island's apron between the buffers, 3.9 m from the cart and 8 m from the forge's wall. "The forge is the
   goods side" then holds for line 1 (dock, crane, pedestal) and the rack sits between the two.
4. **(Designer) Footings: 19 m with a hop, or 36 m by the ramp.** Recommended: **accept it**, and add the boarded
   crossing in step 11. The alternative is a side platform south of road 2, which stops being an island.
5. **(Designer) Standing anywhere on the island calls both trains.** Recommended: **yes**; splitting a 4.3 m island
   down the middle is fiddly.
6. **(Designer) The cart drives through a train standing at platform 2** (as it does today on both lines).
   Recommended: **leave it**; the cart stops serving after Q6. The fix would be a rule that holds one for the other.
7. **(Designer) The hall is 13 × 6 m and open-fronted, 3.7 m from the path's end.** Recommended: **yes**. Spawn and its
   facing stay as they are.
8. **(Owner and designer) The engine's size.** Recommended: **1.25×, engine only** (3.75 m long, 2.0 m wide, 2.56 m to
   the roof), with the cab hollowed and a seat 0.56 m above its floor. 1.17× is the smallest that shows the driver's
   head and hat with headroom. The largest the layout takes with no lockstep distance changed is **1.5× engine only**
   (4.5 m) everywhere but the Pier halt, which waits on its fix, or **1.25× for the whole train**. The cars need not
   grow.
9. **(Owner) When does v24 ship?** Recommended: **as soon as step 6 is reviewed and no session is live**; it replays the
   opening for everyone.
10. **(Designer) `WORKS.rollTicks` 60 to 110** (a held train waits up to 11 s for the wagon). Recommended: **yes**.
