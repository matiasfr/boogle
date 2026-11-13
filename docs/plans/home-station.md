> **Status: built to step 6 (2026-11-13), not shipped.** F1/F2 and X1/X2 of [home-flip](home-flip.md) implement the station, tools and the sole Home with v36. The owner approved the flip; save resets never hold development. The older implementation notes below are historical where the flip supersedes them. Browser proof and independent review are owed as listed in [X1 evidence](../reviews/home-flip-x1.md); later station dressing remains unbuilt.

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
  walls: the square sees through it to the buffers and trains. The curio shelf moves inside, to the hall's front south
  of the way in, behind the front posts at (−91.45, 13.31) facing the square (owner, 9 November: "move shelf off north
  wall"). The south end wall at (−88.62, 15.26) is reserved for the works board.
- **Engine spur.** Leaves road 2 at s 5.5 (−77.49, 10.47) to the right, R 15 through 60° (15.71 m) to bearing 130°, then
  1.5 m straight to the rim. **Table** centre (−57.90, 17.12), r 4.8 (9.6 m), 24.6 m from today's (the page said about
  21 m; the larger spur radius moved it). Ground 18.0 m, flat.
- **Stalls**, radial at bearings 160°, 190° and 220°; the middle (190°) open, the other two ruin outlines. Doors 8.5 m
  from the centre (so 4.4 m frames 30° apart do not overlap, and the footing sockets get a 3.7 m apron), 9 m deep, door
  3.6 m clear and 4.0 m high (today's frame). Open stall: door (−59.37, 25.49), back (−60.94, 34.35). Outline backs
  (−51.91, 33.56) and (−69.15, 30.53). The page had 130°, 160°, 190° with the spur arriving at 160°, which puts the open
  stall straight through from the spur, so "Turn the table" would change nothing you can see. Here the table swings 60°.
- **The cart's leg** (the page's "crossover"). Leaves line 1 at s 54 heading inbound, left R 15 for 3.33 m (12.7°),
  straight 15.41 m, right R 15 for 19.57 m (74.8°), and meets road 2 at s 26, just past the island. 38.32 m (solved
  exactly in step 1; the first estimate was 38.64 m).
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
| `CART_ROAD.forgeCm` (`src/sim/railway-cart.ts`) | 19600 | 20632 | saved cart rows hold road distances: yes |
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

The owner retired the session hold on 13 November: save resets never block development; a ship holds only on his explicit word.

### The cart

Today the cart's road is one line of centimetres: line 1 from the camp down to the table (19600), then out along
line 2. `cart-view.ts` maps a distance d to line 1 at `F − d` or line 2 at `d − F`.

In B it runs down line 1 to s 54, takes the leg into road 2, and stops at road 2's s 0, beside the forge rack on the
island's apron (3.9 m away). That is the forge stop. It then sets off the other way, out along line 2. So:

- **Rules:** no new phase. `cartStep` and `CART_PHASE` are untouched apart from losing `recall`. The reversal is the
  existing stop at `FORGE`: `OUT` ends there, `RUN` starts there. Only `forgeCm` grows, by the leg's detour:
  (196 − 54) + 38.32 + 26 = 206.32 m. Past it, a distance still maps to line 2 at `d − F`, so every rack stop
  (`rackCm`) is where it was along line 2.
- **View:** `cart-view.ts` gets a three-part road: line 1 at `196 − d` for d ≤ 142; the leg for 142 < d ≤ 180.32; road 2
  at `206.32 − d` up to F; then line 2 at `d − F`. The cart keeps its heading through the reversal (it runs backwards;
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

### Hall as a space

Owner, 9 November: "not everything has to be visible, it just has to be a well designed town spatially". The hall read
as a plan of ways and places, as built in step 3 (2.4 m end walls, the shelf in the front's south half):

- **Moving through.** Town, square, hall and island make one line along the station's axis: the village (−100, 14) and
  the house, shop and museum plots lie off the hall's open front, and the square is 3.7 m from it. The way in is the
  front's north half, 4.95 m from the north wall's inside face to the shelf's end, and it runs straight on through the
  back bays to the island's apron, 1 m past the hall, and the head ramp 3.3 m beyond. The shelf frames that doorway: on
  your right as you enter, gifts toward the square, used from the ground in front of it, off the walking line.
- **The south half** behind the shelf is a quiet bay 4.5 m deep. Its back opens onto road 2's buffer end, which leads
  nowhere, so it suits reading: the works board belongs on the south wall's back 4.3 m (a −11.0 to −6.7), reached by
  the shelf's 1.4 m side way at the front corner.
- **The line map** goes back to 6 m, centred on the island (c 0.8 to 6.8; step 12): it hangs over the way out to the
  platform, which everyone walks under. The 5 m cut only kept its south end in view from one spot in the square.
- **Scale.** 13 × 6 m under a 4.6 m roof holds four small players and a 7.3 m shelf: the shelf fills just over half the
  front, the doorway the rest, and the 2.4 m walls read as low walls under a big roof, not rooms. Nothing is cramped
  inside. Two front posts stand 5 cm in front of the shelf's face, by its hat and pet slots: step 8's model should
  space the front posts to the shelf's bays. Outside, the forecourt is tight (finding 6): spawn is 4.9 m from the
  shelf's face and Sleeves 2.3 m, in front of its north end.
- **How the parts relate.** Passengers: hall, apron, ramp, deck, straight on. Town: its plots all lie off the hall's open
  front, across the square. Goods: road 1 is the forge's dock (pedestal, dock and crane on its north side, the forge
  about 9 m from its buffers), and the hall's north end is a bare low wall toward that yard. The weak link is the rack:
  the forge's rails stack centred on the passengers' apron (a −3.9, c 3.8), across the walking line between the hall
  and the ramp.

Changes I would make, ranked (not built):

1. **The rack off the walking line.** Shift it about 1 m toward road 2, the cart's side (the cart stops beside it at
   road 2's s 0), so a clear lane runs from the doorway along road 1's platform edge to the ramp. Passengers walk
   straight; the goods stay where the cart and the island's carry to the frontier start. It moves `PROPS.rack` and
   `LINE2_FORGE.rackX`/`rackZ` in the v24 table, so it belongs before step 6; check the stack's footprint on the
   4.3 m apron.
2. **Sleeves to the doorway's north side.** At (−95, 12) he stands in front of the shelf's north end, inside its 4.4 m
   reach: two things answer in one spot at the mouth of the way in. About 2.5 m north he greets people into the open
   half and still points up the bold path north.
3. **A goods door in the north end wall.** A 1.5 m gap in the wall's back half, so the hall's goods side meets the
   forge yard; today the way there goes out the back over road 1's buffer end or 3 m round the front corner. The
   smallest of the three.

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

- [x] **1. The geometry as data, with its tests.** No behaviour change.
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
- [x] **2. The 2D page shows the real geometry.** Docs only.
  - `docs/world/home-layout.html`: replace option B's data block with step 1's output (a small script,
    `dev/level/home-station-page.ts`, prints it); stalls at 160°, 190°, 220°; the leg where the crossover was drawn; the
    moved props; a row for the engine at 1.25×. Republish the artifact at its URL.
  - `docs/research/home-station-layout.md`: status to "adopted, with the plan's changes".
  - Verify: open the page; its clearance list shows no "warn" for B.
- [x] **3. Draw the layout in 3D behind `?home=b`.** Look only; default off; the rules still use today's anchors, so
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
  - `src/entities/railway/cart-view.ts`: under the flag, pose from `cartRoadAt(d × 206.32 / 196)` on the way in (the
    rules still say 196), so the reversal can be seen.
  - Greybox boxes for the concourse, buffers and points (one merged mesh, static colliders for posts and buffers).
  - `src/proto/place/sites.ts`: feet for the concourse and stalls, so little guys walk round them.
  - Verify: `BOOGLE_HOME=b npm run level-check -- --place=place` (expect the findings below fixed);
    `npm run look -- --rail-seed awake --query 'home=b' --cam … --look …` from the square, from the island and from
    above; `--rail-seed trains-on --query 'home=b' --video` of a train arriving and leaving; `--rail-seed q4-arriving
    --query 'home=b' --video` of the cart's reversal; `--rail-seed cradle-fitted --query 'home=b' --video` of the
    roll-out. `npm run perf` (new meshes).
  - Built 9 November as the review's smallest version, with a greybox canopy on the island (it drops in with the deck)
    and a destination picture on each edge's mast. Cut to step 6: the cart's pose on `cartRoadAt`, the shunt on
    `shuntPath()`, `sites.ts` feet and the three videos. The leg measures 38.32 m (not 38.64), so `forgeCm` is 20632.
  - **Decided 9 November (owner): "Lower end walls".** The hall's end walls stop at 2.4 m with a coping, the roof
    stays at 4.6 m on posts (corner posts added), and spawn keeps facing 14°. The curio shelf stood against the north
    wall's inside face; the stills showed it, at about 3.5 m, the tallest thing in the hall's north half.
  - **Decided 9 November (owner): "move shelf off north wall".** `SHELF_B` stands in the hall's front, south of the way
    in: just behind the front posts (5 cm clear), facing the square, a 1.4 m side way between it and the south wall,
    which keeps 0.15 m for the works board. It is off the back span (the line map), and the way in from the square to
    the trains (the hall's north half, 4.95 m wide) stays open. Entering from the square it stands on your right, gifts
    facing you. Full height is kept (the finds board beside it was cut with the gold finds, 9 November). The finders'
    bay (F2) moved on 10 November (owner, "for now"): it faces the shelf across the square on the shelf's centreline,
    16.3 m out at (−106.76, 18.88) ([curio placement](curio-shelves-placement.md)).
  - **Not pursued: the view from spawn as a measure** (owner, 9 November: "im not sure why we're evaluating the view
    from spawn as the right metric. not everything has to be visible, it just has to be a well designed town
    spatially"). The open call on a 1.1 m north wall or a higher spawn camera is closed; the 2.4 m walls and the
    shelf's place stand as built. The hall is judged as a space ("Hall as a space", below).
- [x] **4. Owner approval superseded by the Home flip approval (13 November). Historical request:** Send the full link `https://boogle.club/?home=b` and the three stills. Designer rules on
  the Level findings and questions 1 to 7. Adjust step 1's numbers if he moves anything, and rerun steps 1 to 3's checks.
- [x] **5. Make tools follow the anchors.** No behaviour change.
  - `dev/look/bots/railway.ts`, `railway-works.ts`, `dev/look/evals/railway-home.ts`, `railway-halts.ts`,
    `railway-gated-fill.ts`, `railway-works-at.ts`: every Home waypoint that is a literal becomes a value read from the
    sim constant it stands for (`LINE2_FORGE`, `LINE2_BOILER`, `WORKS_BREAKER`, `SHED_TABLE`, `SHED_STALL`,
    `WORKS_SEAMS[0]`, `LINE_HALTS`, Q1 and Q2), with offsets.
  - Verify: `npm run playthrough -- --to forge-lit`; `npm run look -- --rail-seed q1-done --eval
    dev/look/evals/railway-home.ts`. Coordinate with the hot-file split of `railway.ts` and `rail-seed.ts`.
- [x] **6. The flip, built as home-flip X1 with v36. Independent review and browser proofs owed before ship. Historical implementation list:**
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
- [ ] **12. The live line map in the hall** (look only; owner's decision of 9 November, `docs/decisions.md`, "A live
  line map stands at the Home station"). Port the line map of the archived departures board (`?proto=board`, in
  26270adb) as the one big board: both lines, laid track solid and the rest dashed, this station ringed, trains at
  their live positions. No fast travel or picker.
  - **Where:** across the hall's back, the island side, hung under the roof from the back post at c 0.55 to c 5.55
    (about 5 m wide by 1.8 m, its bottom at 2.4 m), facing the square. Everyone walking from the square to the trains
    faces it, the square sees it straight through the open front, and it takes neither end wall: the north one stays
    low for the forge, the south one is the works board's (call 29). 5 m, not 6: from the square the moved curio shelf
    hides the back span south of c 5.55.
  - **Same map as the halts** (owner, 9 November: "Island map"): the hall board draws the halts' island map larger,
    with no ring (`drawMapBase(..., here: null)` from `src/render/island-map.ts`, fitted with `fitMap` facing the
    board from the square), and the trains as the same instanced quads (`src/entities/railway/island-boards.ts`'s
    markers, one per line). At 5 × 1.8 m it wants a wider cell, about 1024 × 368, in its own canvas; it hangs from the
    roof on two rods between the back posts. If the island side sees its back, that face gets its own cell fitted for
    a viewer on the island (as the halt boards' back faces are), otherwise the back stays blank.
  - Verify: stills from the square and from spawn; a short video of a train moving on it; `npm run perf`.
  - **Where:** across the hall's back, the island side, hung under the roof over the way out to the island, centred on
    it (c 0.8 to 6.8: about 6 m wide by 1.8 m, its bottom at 2.4 m), facing the square. Everyone walking from the
    square to the trains walks toward it and under it, and it takes neither end wall: the north one stays low, open to
    the forge yard, the south one is the works board's (call 29). Back to 6 m ("Hall as a space"): the 5 m cut only
    kept its south end in view from one spot in the square.
  - Verify: stills from the square and from under the roof; a short video of a train moving on it; `npm run perf`.

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

## Design review (designer, 2026-11-09)

Read: DESIGN.md; owner-calls; decisions (Decided, top three entries; Rail, construction, levels and travel); the two
2026-11-09 entries in playtests and their ranked rows in round-4-notes; research home-station-layout (whole),
level-design, route-contract, progression-flow-layout (lenses and "Home, beat by beat"), world-scale (top blocks); the
Home flow audit (`docs/reviews/home-flow.md`); boiler-first-choice (rulings, Stage A); upgrade-choices (finding 4); the
works-signposting brief that landed beside this plan. Code read where a call depends on today's behaviour:
`layout.ts` (`PATHS`, `SPAWN`, `TOWN`, `ROOM_PLOTS`, `FORGE`, `STUB`), `shore-layout.ts`, `railway-cart.ts`,
`railway-line2.ts` (`line2CartStatus`), `railway-train.ts`, `railway-systems.ts` (`rail.call`),
`halts-view.ts` (`wanted`, `fixedPre`), `train-view.ts`, `cart-view.ts`, `line2-view.ts` (the machine's crossing, the
pour). Data: `npm run playtest -- mw9srqnz` (the co-op session). Geometry below is computed from this plan's own
coordinates.

**Not seen.** No stills. A still from the shore approach (`--rail-seed awake --cam 890,19.8,3 --look 912,19,9`) sat
behind about twelve queued look jobs and was stopped at 5 minutes, and `?home=b` does not exist yet, so nothing of B
can be seen before step 3. Every sightline here is computed from coordinates and footprints, not looked at; heights
(hall, end walls, canopy) are not in the plan, so occlusion claims assume walls taller than eye height. Step 3's stills
are where these get checked (listed under "Smallest version", below).

### Rulings on the designer's questions

2. **Join line 2 at s 84 with R 18: yes.** The trestle is generated from the line, its hook walkway (s 86) and pillar
   do not move, and R 16 would put tighter curves and 20° more turning at the throat, where trains are watched most.
   Check the trestle's dry-support rule (every 3 m) on the moved first metres in step 3's level check.
3. **The cart stops at platform 2's buffers: yes.** Rack to cart 3.9 m, Q2's rack stop stays at s 29, and the cart
   visits the station. Keep the forge's pour flight (mouth to rack, `line2-view.ts`); it now crosses road 1's stub, 8.1 m
   instead of about 4.4 m, so it is the thing that ties the rack to the forge (finding 9).
4. **Footings: accept.** The figure is closer to 29 m than 19 m in practice (finding 5), about 13 s at carry pace
   against 5 s today, four times, once per world, inside the deliberate "four home by hand" before. That is within lens
   6's exception. Keep the step-11 crossing; site it off the points (finding 5).
5. **The island calls both trains: yes, as a default.** Splitting a 4.3 m deck is fiddly and the cost is small: in
   co-op, walking onto the island to board one line also calls the other line home (`rail.call` overwrites a pending
   call) and re-holds a train already standing (it restarts `depart`). Revisit only if a session shows a friend's train
   stolen.
6. **The cart through a standing train: leave it**, for a stronger reason than the plan gives. In normal play they never
   meet: line 2's train is not drawn until trains run (`train-view.ts`, `secondVisible`), and from then the cart is
   `off` because the stretch it would serve is train-fed (`line2CartStatus`), resting at the camp. The same reasoning
   makes the shunt's stub move safe (finding 8).
7. **Hall 13 × 6 m, open-fronted, 3.7 m from the path's end: yes**, with one amendment: spawn's facing is not "as it
   is" for free. From spawn (−97, 14), facing 14°, the hall's north end wall stands at bearings 12.5° to 36°, 8.2 to
   12.6 m away, across the forge (13° to 49°, 14 to 26 m). You look through the open front at the end wall's inside (the
   shelf, which is good) and lose most of the forge behind it. Keep end walls below eye height above the shelf (about
   2.4 m, open above to the roof) or turn spawn to about 40° so the forge and the hall's front share the frame. Decide
   from step 3's spawn still. Spawn is where a returning player starts; a newcomer lands on the shore (below).
   **Decided 9 November (owner): "Lower end walls"**: 2.4 m, the roof on posts, spawn still facing 14°. Then, as the
   shelf stood in the line, **"move shelf off north wall"** (9 November): it stands in the hall's front, south of the
   way in (step 3).
10. **`WORKS.rollTicks` 60 to 110: yes.** 11 s once per world, while the wagon visibly comes out; same 4.3 m/s.

### My view on the owner's questions

1. **Stalls at 160°, 190°, 220°: yes.** "Turn the table" has to be seen to do something ("Machines show their work
   physically"); a 60° swing does, and the two outlines flank the open stall symmetrically. Its cost: the stall leaves
   spawn's view (finding 7).
8. **Engine 1.25×, engine only: yes, as the floor.** It is the smallest size with the driver's head and hat clear, and
   every clearance here takes up to 1.5×. In the engine pass, put 1.25× beside about 1.4× (2.2 m wide, as wide as its
   cars, which is part of why today's reads small) in one still and let him pick from that. The cars need not grow.
9. **v24: as soon as step 6 is independently reviewed and the heartbeat shows no live owner session.** Don't hold it
   for art (steps 7 to 11) or for the Pier fix (it rides only if already merged). Before step 6, add the machine's
   `turnTicks` (finding 2) so nothing in this layout needs a v25.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Layout B: a terminus, one island, one concourse facing the town, the forge as goods side | Decided | [decisions](../decisions.md#decided), "Home gets one coherent station", 9 November |
| 2 | Keep the 9.6 m table | Decided | Same entry |
| 3 | One open stall and two ruin outlines | Decided | Same entry |
| 4 | Line trains never turn on the table | Decided | Same entry |
| 5 | The engine grows enough to show a seated little guy | Decided | Same entry, the owner's scale notes; the factor is call 30 |
| 6 | `rail.cartCall` and `Cart.recall` go with the next reset | Decided | [playtests](../playtests.md), 9 November desktop session, "cut the cart handle" |
| 7 | A `WORLD_NS` bump never ships mid-session | Decided | [owner calls](../agents/owner-calls.md), "Nothing waits for a playtest" |
| 8 | Previz and sheets for the hall, canopy, buffers, stalls; a storyboard and parts sheet, not a beauty render, for the table | Decided | Owner calls "Previz before modelling", "Machines show their work physically" |
| 9 | Joins at s 60 and s 84 on R 18; the trestle's first metres move up to 2.3 m | Default | Ruling 2 |
| 10 | Train stops stay at s 14 and s 17, abeam | Default | Research recommendation 2 (keep `s`) |
| 11 | Island 4.3 m; deck 18 m at rail + 0.72; head ramp 5 m, end ramp 4 m, no back ramp; 3.3 m ground apron | Default | Research recommendation 5 |
| 12 | Track centres 7.6 m; canopy at least 4.6 m above the rail; curves 18 m (lines) and 15 m (leg, spur) | Default | Plan's clearance table |
| 13 | Hall 13 × 6 m, open front, end walls, 3.7 m from the path's end | Default | Ruling 7, with the spawn amendment (call 37) |
| 14 | Curio shelf inside, in the hall's front south of the way in, facing the square | Decided | Owner, 9 November: "move shelf off north wall" |
| 15 | Spur R 15 through 60°; table at (−57.90, 17.12), 24.6 m from today's | Default | Plan |
| 16 | Stall doors 8.5 m out, 9 m deep, 3.6 m clear by 4.0 m high | Default | Research ratios |
| 17 | The cart's forge stop is road 2 s 0 at the buffers | Default | Ruling 3 |
| 18 | `CART_ROAD.forgeCm` 19600 to 20632 (about 2.4 s more per round trip) | Default | Plan; not felt at station 5 (home-flow finding 1) |
| 19 | The cart keeps its heading through the reversal, so it rides out to the racks backwards | Default | Recommend a double-ended look (finding 11) |
| 20 | The cart may pass through a standing line-2 train | Default | Ruling 6 |
| 21 | Forge rack on the apron at (−84.90, 9.12), 8.1 m from the forge across road 1's stub | Default | Ruling 3, finding 9 |
| 22 | Pedestal (boiler, then breaker) at (−78.0, −1.05); crane, dock and stone yard moved | Default | The breaker-on-pedestal ruling is already logged (boiler-first, ruling 2) |
| 23 | Q1's frame on the south side of road 2; Q2's frame moves to (−40.52, −1.51) | Default | Plan; the hook beat keeps its frame-to-rings distance (46 m against 50 m) |
| 24 | Standing anywhere on the island calls both lines | Default | Ruling 5 |
| 25 | `WORKS.rollTicks` 60 to 110 | Default | Ruling 10 |
| 26 | The shunt reverses on road 2's buffer stub | Default | Finding 8 |
| 27 | Footings walk 19 to 36 m against 11 m | Default | Ruling 4 |
| 28 | Pedestal to stall seam 32 m (14 today); forge rack to stall 32 m (15 today) for the cradle's 8 rails | Default | Once each per world; finding 7 |
| 29 | The works board on the hall's south end wall | New | Recommend the wall's inside face, so the hall is where the room's record lives and it is seen from the square through the front; the shelf leaves it 0.15 m. Overlaps the logged upgrade-choices call |
| 30 | Engine 1.25×, engine only | New | Owner's question 8; my view above |
| 31 | Stalls at 160°, 190°, 220° instead of the approved 130°, 160°, 190° | New | Owner's question 1; my view above |
| 32 | v24 carries this, the cart-call removal, the boiler pace tunables and the Pier fix if ready | Default | Owner's question 9 (timing); one bump |
| 33 | `?home=b` is look-only, with prompts in the old places | Default | Plan; never for playing |
| 34 | Art budgets by prominence (hall 12k, canopy 8k, stall 6k, outlines 800, buffers 600) | Default | Owner call "Geometry budgets follow prominence" |
| 35 | **Missing:** which parts stand from the start. Recommend the hall, buffers, apron and island kerb from the start; the island deck and canopy drop in with trains, as halts do today | New | Finding 1 |
| 36 | **Missing:** how the track layer crosses from road 1 to road 2 at the forge's lighting. Recommend it drives the leg in the view, with `LINE2_FORGE.turnTicks` set to the drive in v24 | New | Finding 2 |
| 37 | The hall's end walls stop at 2.4 m; spawn keeps facing 14°. The view from spawn is not a measure | Decided | Owner, 9 November: "Lower end walls"; "not everything has to be visible, it just has to be a well designed town spatially" |
| 38 | **Missing:** which road goes where. One destination pictogram per platform edge on the halt boards (the camp's machine for road 1; the quarry, Far Head and pier for road 2) | Default | Finding 4 |
| 39 | Town paths to the hall's front, flagstone apron, a boarded crossing toward the stall (step 11) | Default | Finding 5 for the crossing's site |

Totals: 8 Decided, 26 Default, 5 New.

### Findings

**Before building (they change the plan):**

1. **The island isn't there for the first half hour.** Halts are drawn only once trains run (`halts-view.ts`,
   `wanted`), and the plan routes the island through that code. So a newcomer's first sight from the shore isn't "the
   island running away between two tracks": it's the hall, two buffer stops, road 1's 30 m village stub
   (`STUB.village`) and road 2's 7 m stub (`STUB.east`) with the spur's points. The rails walk to Q2 "up the head ramp,
   along the island" crosses open ground until the boiler is fitted (it is still 30 m, so nothing is lost). Say in
   step 3 which parts stand from the start. Recommended (call 35): the hall, buffers, apron and a kerb outline of the
   island from the start (a station waiting for its trains is lens 4's tease, and it echoes the stall's ruin outlines),
   with the deck and canopy dropping in when trains run, as the halts do today, so the boiler fit still pays off at
   Home. Step 3's stills need both `awake` and `trains-on`.
2. **The track layer jumps 16.7 m of bare ground.** Today it waits at line 1 s 19 and appears on line 2 s 7 once the
   forge is lit, 2.6 s later (`turnTicks`), beside a table that plausibly turned it. In B the two roads are parallel and
   unconnected at the station, so the cut is a big machine popping sideways across the island's site, in front of the
   forge, at a moment players are watching. That's the "rails that make sense" the owner asked for, failing at the
   station's own front. The only route is out road 1 to s 54, the leg, then back down road 2 to s 7, about 93 m.
   Recommended (call 36): draw that drive, whistle at the start, and set `LINE2_FORGE.turnTicks` to its length in v24.
   It's one Server constant, and Q1's deposits already wait on it. Decide before step 6; showing it in step 3 is
   optional.
3. **The newcomer's arrival works, but say why.** The shore path runs east along z = 3 and then turns to 131° for its
   last 9 m. From (−110, 3) the forge is at bearing 75° and the hall's north end at 92° to 101°, so the forge and the
   gap down road 1 read to the left of the hall. On the last leg the hall's open front fills the view straight ahead
   (90° to 140°). The bold path north starts 2.8 m from the hall's corner, and Sleeves (1.9 m from the front) still
   points up it. The risk is the strongest shape at the path's end pulling a first-timer into the station: before T3,
   road 1 leads to a stub that ends at s 30 and doesn't go to the camp. Today's stubs already do this and the friend
   still woke the machine at 2:20, so it's a lens-1 check for the step-3 still, not a change. The north end's outside
   face is the one wall seen from the whole z = 3 approach: put the station's name board or clock there, not on the
   south wall. Spawn is ruling 7.
4. **One island, two lines: which train is mine?** Today the halts are 30 m apart on different lines, so the place
   tells you the line. On one deck it doesn't. Give each platform edge its destination on the existing halt board as a
   pictogram, with no new copy (call 38). Real stations number their platforms for this reason.

**Fine to build as planned; fix in the named step:**

5. **The footing hop is blocked while the train stands.** You step off line 2's train onto the island, and that
   entry calls the halt, which restarts the standing train's dwell (`rail.call`), so road 2 is blocked for about 5 s
   more. The practical route is 6 m along the deck past the train's nose (s 22.2), down, and across road 2 at s 24,
   about 29 m. The step-11 crossing belongs there, between the nose and the leg's points at s 26 (1.5 m of room past
   the deck's end). Keep it off the points. The straight route from there to the stall door crosses the table: if
   step 10 sinks it into a pit, keep the rim a step, not a drop, or the carry route bends round it.
6. **The end ramp lands 3.9 m from the cart's leg** (track centres), and the walk from the island to Q2's frame
   crosses the leg. Add crossing timbers there in step 9, and check in step 3's cart video that the cart doesn't shove
   a walker.
7. **The Roundhouse leaves the home view, and the Works brief leans on today's distances.** Today the stall ruin is
   7 m from spawn. In B it is 42 m from the square, behind the hall, and first seen from Q1's frame (17.5 m) and the
   island. That's enough of a tease for a beat that comes after the pier. But the works-signposting brief beside this
   plan counts on "the cracked stall slab 14 m away" from the pedestal, "the forge rack 15 m away" from the stall and
   the sockets being "in view at Home since the first hour". In B those are 32 m, 32 m, and from Q1 and the island only,
   with the canopy and a standing train between the pedestal and the slab. That brief's stills should be taken in B
   (the plan's ordering row already says to design with these numbers).
8. **The shunt's stub move overlaps the cart's forge stop** (stub −2.6 to 5.5, cart −1.35 to 1.35). It is safe because
   the cart is off and at the camp by the Works (ruling 6). Step 1's "disjoint" test should say so, or assert it
   against the cart's phase, so a later rule change that wakes the cart fails the test.
9. **Take rails was already the weak pickup.** In the co-op session the owner pressed with nothing in reach eight times
   2 to 10 m from "Take rails" (`mw9srqnz`, 7:06 to 14:57), and the 8 November session had the rack invisible on the
   iPad. B moves the rack further from the forge and puts a track between them. Keep the pour flight visibly crossing
   the stub, face the rack's sign to the square, and take a still in step 3 at the reach edge.
10. **The level check.** Its two expected failures are fine. Each halt's back ramp only exists because the test used
    plain decks. For the rack's floating foot, build the apron slab in step 3's greybox rather than nudging the rack;
    the rack sits on it either way. What the tool didn't cover, and step 3 should: the hall, canopy, stalls, table,
    spur and leg as colliders in the reach flood (the canopy is a new roof at 4.6 m or more: confirm it reaches nothing
    early); the machine on the leg (finding 2; its 61,660 poses were line 1 only); the footing carry route over road 2,
    the spur and the table; and any line of sight. A reach claim for those is unproven until then.
11. **The cart now rides out to the racks backwards.** That's the leg a player rides, forge to rack. Today it rides
    that way forwards and only runs backwards coming home. If the cart's model has an obvious front, give it a lamp at
    each end so it reads as double-ended (P3, look only).

### Flow: Home's changed stretch, beat by beat

Walk 5.6 m/s; boiler haul 3.0 m/s solo and 5.4 m/s helped; footing carry 2.2 m/s solo. Straight-line metres from this
plan's coordinates; no bot route exists for B yet.

| Beat to beat | B | Today | Seconds (B) | What pulls you on | Lens notes |
| --- | --- | --- | --- | --- | --- |
| Shore path's last leg to the square | 9 m | 9 m | 2 | The hall's open front | 1 ✓; the bold path north 2.8 m off the hall's corner (finding 3) |
| T3 laid, machine home | Parks at road 1 s 19 | The same | — | The line home | 6 ✓ |
| Forge lit, machine to line 2 | About 93 m drive (recommended) | A cut by the table | About 12 | The whistle; the machine coming round to Q1 | Finding 2 |
| Forge rack to Q1's frame | 13 m | 13.7 m | 2.3 | The frame by the spur | 7 ✓ |
| Forge rack to Q2's cart stop | 30 m | 36 m | 5.4 | Q2's frame and rack | 6 ✓ |
| Far Head to the pedestal | About 536 m | The same | About 96 | Forge plume and whistle | Unchanged (home-flow finding 2, built) |
| Pedestal to the old train (haul) | 172 m | 179 m | 57 solo, 32 helped | The empty saddle | Once per world |
| Pier to pedestal to stall seam | 32 m from the pedestal | 14 m | 5.7 | The cracked slab | Finding 7 |
| Quarry halt to stall, four footings | 19 to 29 m each from the island | 11 m | 9 to 13 each | Gold ghosts in the sockets (works brief) | Lens 6 exception: the deliberate before |
| Forge rack to stall, cradle rails | 32 m | 15 m | 5.7 | The wagon's empty cradle | Once |

Near-universal rules: **1** holds wherever there is a still or a pull to point to; the open checks are the step-3 stills
(findings 3 and 7). **2** holds: nothing new moves faster, the trains still carry people and not work, and the canopy
is the only new height (finding 10). **3** holds: every gate is solo, the island has ramps at both ends and steps off
its sides, and no key can be lost. Lenses: **8** improves the most. Both lines now leave from one deck beside the hall,
so a group splits there and meets there again, with a late friend spawning 4.5 m away. **5** improves: one front door.
No flow finding rests on bot or session evidence for B, because there is none. The session data only bears on finding 9.

### Smallest version to the owner, and what waits for him

To reach `?home=b` soonest, do steps 1 and 3 only. Step 2 (the 2D page) runs alongside, and nothing waits on it.
**Cut from step 3 for the first look:** the cart's scaled pose, the shunt path, `sites.ts` feet and the roll-out video.
Those are needed by step 6, not by his look. **Keep:** the two heads, the island in both states (finding 1), greybox
boxes for the hall, buffers, apron and stalls, the table at B's centre, the moved props, the apron slab, `perf`. Stills
for him and for this review: the shore path from (−110, 3); spawn; the square into the hall; the island looking out
along both roads; the pedestal toward the stall; Q1's frame toward the stall. Each in `awake` and `trains-on`.

**Waits for him:** question 1 (stall bearings) before step 6 pins `SHED_TABLE`, `SHED_STALL` and the seam; question 8
in the engine pass, not this plan; question 9 only for timing. Everything else proceeds on the calls above.

**Suspect lines.** None: the plan has no Boogler copy.

### Owner questions

1. **Stalls at 160°, 190°, 220° (instead of your 130°, 160°, 190°)?** Recommended: **yes**. The table visibly turns 60°
   from the spur to the open stall. At your bearings, "Turn the table" would move nothing you can see.
2. **How big is the engine?** Recommended: **at least 1.25×, engine only**, chosen in the engine pass from one still of
   1.25× beside about 1.4× (as wide as its cars). Either fits the new station.
3. **When does the reset (v24) ship?** Recommended: **as soon as step 6 is reviewed and you're not mid-session**. It
   carries everything that needs a reset (this, the cart handle's rule, the boiler haul's pace, the machine's crossing)
   so there is no second one.
