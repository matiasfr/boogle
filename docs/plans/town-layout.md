> **Status, 13 November: the Home flip is implemented locally through X2, not shipped.** The Round's data is built; moving the buildings and opening the gate cottage remain R2 of [home-flip](home-flip.md). The ECS migration is complete. The owner said on 12 November: "I think this stuff could be in conjunction with the first version of the updated town that we designed that we plan to implement. Make sure that we plan to implement that." The sealed buildings open together with the Round's first build ([owner calls](../agents/owner-calls.md)).

> **Status: layout chosen, reviewed (2026-11-10).** The owner picked **option 2, the Round**. The
> [design review](#design-review-designer-2026-11-10) ruled every call and its rulings are applied to the body below.
> **Note, 10 November (owner): the ring is built regular**; the review's designed irregularity (its call 2) is
> overruled, and the ring table below is the regular one. Step 1 (data and its test) is built; the Home flip is implemented and the ECS migration is done.
> Steps 2 to 5 and 7 remain the Round build; step 6 is the passenger trade's. The [2D page](../world/town-layout.html)
> still draws the three options as proposed; the Round's reviewed positions are in this plan.

# Home's town layout: a proper town, with a radial part

Plan and page only; no game code changed. Coordinates are Place-local metres (world x = local x + 1000), north is −z.
Bearings are degrees clockwise from north. A three.js `yaw` turns a building's door (local +z) to face bearing
`180° − yaw`. Player walks are timed at 5.6 m/s, little guys at 1.7 m/s (`folk.ts`).

## The owner's words

- 10 November, **the pick**, on the three options: "Ok sounds good, we can do the round, it's a lot more organic
  feeling than cross". The review read "organic" as a reason for small designed irregularities; **he overruled that
  later the same day** (10 November): "I meant more organic than a rectangle, I don't need the houses to be clumsily
  laid." The Round is built regular
  ([rail](../decisions-rail.md#d-2026-11-10-the-round-is-built-regular); review call 2 overruled).
- 10 November: "I also think we should queue a pass on the town layout so it's more like a proper town. Maybe there's
  like a radial part to it. We should just give this to a good model to plan."
- 10 November, on the Village's four cottages: "maybe only a couple buildings exist, so you get the satisfaction of
  building up." Recorded as **a leaning, not a decision**
  ([rail](../decisions-rail.md#d-2026-11-10-the-village-may-start-with-a)); this plan designs to it, as the
  coordinator asked. In the same reply: "Forge should finish when the player finishes building it btw, and it should
  have an interior." Decided ([rail](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player)); it
  replaces in part the same day's "the forge's roof and chimney are a later upgrade".
- 10 November: "the curio shelves could be positiioned much better in the town, they seem weirdly at angles and not
  spaced intentionally with everything else in the town" ([rail](../decisions-rail.md#d-2026-11-10-the-curio-shelf-and-the-finders)).
- 10 November: "any building should be able to be walked into, and either be empty, have some character with some
  amount of lines, or something odd or interesting to see"
  ([core loop](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into)); the opening order "The two
  cottages on the way in from the dock, then the other two, then a room behind the Ring Island works wall"
  ([look](../decisions-look.md#d-2026-11-10-open-calls-answered-terrain-and-sealed)).
- 10 November: "Boogles build the house itself; unbought plots stay empty ground"; "I like the idea that buying plots
  of land both helps a town economically but also introduced new characters and a building to discover. Maybe these are
  intentional upgrades instead of naturally happening from connecting a place. it's also a good opportunity for
  construction animation"; the wallet at "A ticket window on the station hall's north end wall"
  ([rewards](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources)).
- 9 November: "not everything has to be visible, it just has to be a well designed town spatially"
  ([owner calls](../agents/owner-calls.md), "A well-designed town, not a view from spawn"); Home is one station, layout
  B ([rail](../decisions-rail.md#d-2026-11-09-home-gets-one-coherent-station)); the passenger train's east bay
  ([page](../world/home-passenger-bay.html)).
- 2 November: "towns grow, and you can see them"; Home is "a busy town at most".

## Goal

Lay Home's town out as a town: a centre, streets with two sides, a loop to walk, a landmark at the end of each way, a
clear edge, and a start small enough that buying plots visibly builds it up. It serves **7. Telegraph everything** (the
staked plots and the next way out are in view from the centre) and **11. Show, don't tell** (the town's shape says
where the station, the dock and the work are). It bends "towns grow from what arrives" toward the owner's leaning that
buildings are bought; see open question 2.

**Research:** [growing-towns](../research/growing-towns.md) (author the street skeleton and the plots, not the infill;
a 6–8 m main street, 4 m lanes, a clear plaza of about 20 × 24 m, a 30–60 s loop; cap about 24 plots; used throughout,
with the plaza made round in option 2). [level-design](../research/level-design.md) (walk-seconds at 5.6 m/s; one tall
landmark per area and a hub everyone returns to, after Disneyland's hub and spokes; a fixed arrival at the edge with
the plaza a few seconds in, after Animal Crossing). [progression-flow-layout](../research/progression-flow-layout.md)
(the next goal can be found: the camp road leaves the centre in view). [world-scale](../research/world-scale.md)
(buildings are Buddy-sized; little-guy speeds). [town-interiors](../research/town-interiors.md) (interiors draw near
the camera only). [home-station-layout](../research/home-station-layout.md) and the [home-station plan](home-station.md)
(the station's axis). [vast-world-scale](../research/vast-world-scale.md): not used; it is about crossings. From my own
knowledge, named as references and not checked against sources: Tarrey Town in Breath of the Wild (a ring of houses
round a centre on a round rock, filled in as people move in), Clock Town in Majora's Mask (a tower in the middle,
districts off it), Windfall Island (a walk round a hill), and the American railway "T-town" (the main street runs
square from the depot).

## What I checked, and how

- Read `src/place/layout.ts`, `home-station.ts`, `terrain.ts`, `tree-catalog.ts`, `tech-layout.ts`, `shore-layout.ts`,
  `building-plans.ts`, `opening-plans.ts`, `folk.ts` and `src/entities/town/*`; dumped the real geometry (heights on
  the 2 m grid, both lines, the hall, island, table and stalls, every building, the trees, secrets and pads) with a
  scratch script, with and without `BOOGLE_HOME=b`.
- Took twelve stills with `npm run look -- --rail-seed q6-done` (today's Home and `?home=b`), under load averages 12
  to 21. Six are committed beside the page.
- Laid each option out in a scratch script that checks overlaps, street clearances, walks, what hides what, and the
  roof-to-roof gaps; it also wrote the page's drawings. The script is not committed; every position is in the tables
  below.
- Wrote each option's positions into `layout.ts` temporarily (the eight plots as buildings, the full town), ran
  `npm run level-check -- --place=place` with and without `BOOGLE_HOME=b`, compared the tree catalog with main's, and
  reverted. Results under Level findings.
- Not done: nothing was built or seen in the game; no perf run; `npm run loop -- node` was not run because no rail
  rule, bill or beat changes.

## Diagnosis: why it does not read as a town

Stills (10 November, seed `q6-done`): [from above, live](../world/town-layout/a-above.jpg);
[from above, `?home=b`](../world/town-layout/b-above.jpg); [top of the dock path](../world/town-layout/a-dock.jpg);
[the square, looking west](../world/town-layout/a-square-w.jpg);
[the street, looking north](../world/town-layout/a-street-n.jpg);
[arriving on line 2, `?home=b`](../world/town-layout/b-train.jpg).

1. **Seven buildings, seven angles.** The doors face 63°, 88°, 94°, 99°, 117°, 124° and 151°. The hall is at 70° and
   the forge at 0°. `layout.ts` says why: "placed for the views". Each was turned toward the old spawn, the lens the
   owner has since ruled out.
2. **No street has two sides and there is no centre.** Only 2 of 7 front doors are within 3.5 m of a path's edge (Fine
   Prices is 10.6 m off, a cottage 11.6 m). The "square" is a three-way path junction 4 m in front of the hall with no
   edge and nothing in it (the square still: a shelf, a house, a museum, each at its own angle, on grass).
3. **Nothing to walk round.** The paths are a Y (dock, camp, quarry). There is no loop in town.
4. **A ring nobody can see.** Five of the seven buildings already stand 19.2 to 20.4 m from (−120, 11), but Pip's
   house and a cottage stand inside that circle, no door faces it, and the dock path cuts through it.
5. **Bare ground, and a blind arrival.** The west lobe's flat top is about 130 × 200 m at 18 m; the buildings cover
   about 540 m² of it and no tree stands within 57 m of (−100, 14). From the top of the dock path the eye meets two
   cottages' side walls and the museum's flank; the hall shows about a sixth of its outline and the forge none; the
   feet bend north between the cottages and reach the square heading 131°, 61° off the station's axis, after 127 m
   (23 s).

## Design goals

| Goal | From |
| --- | --- |
| A town as a space: a centre, two-sided streets, a loop, an edge | "more like a proper town"; "a well designed town spatially" |
| A radial part | "Maybe there's like a radial part to it" |
| Two buildings on arrival; the rest bought and built in front of you | "maybe only a couple buildings exist, so you get the satisfaction of building up" |
| Everything square to the station's axis, its street, or the centre; nothing aimed at a view | "weirdly at angles and not spaced intentionally" |
| Every building has a door you can use; a plot is open ground with stakes | "any building should be able to be walked into"; "unbought plots stay empty ground" |
| The forge finishes when it is built, and you can go in | "Forge should finish when the player finishes building it btw, and it should have an interior" |
| Riders walk from doors to the ticket window and the platforms in view | the passenger-trade answers |
| Three players and a crowd of little guys fit; short loops; the next thing in sight | DESIGN 8; level-design recs 2 and 5 |

## What stands, and when

Written for all three options; it holds for the Round, with the design review's rulings applied (marked "review").

- **The station does not move:** hall, island, both roads, the table, stalls and the east bay are layout B's
  (`home-station.ts`). The station's axis (70°/250°) is the town's first direction.
- **The forge** keeps `FORGE` (−87, −3), 10 × 8 m, yaw 0: the rack, chest, frame, axe stand and oak are railway
  anchors. Its door moves from the south wall (`WORKSHOP_DOOR.x −2.9`, which in B opens about 3 m from the hall's
  north corner, beside road 1's buffers) to the middle of the **west wall**, 2.8 m wide, at (−92, −3) facing 270°, with its two
  steps on the camp road's verge 6 m from the road's centre; the furnace and the rail chute stay on the south wall.
  Roof, chimney cap and the walk-in workshop come when F2 completes, not at the crossing.
- **The ticket window** is inside the hall's north end, at about (−92.1, 5.6). Every rider's walk ends there, then
  goes through the hall to the island (29 m to the middle of the platform).
- **The finders' bay** moves beside the hall's south end on the hall's front line, facing the square as the shelf does:
  bay (−89.19, 21.80), yaw −1.2217 (faces 250°), 1 m from the hall's south wall; boxes in its own frame; the plinth
  5.3 m out at (−94.17, 23.61), 4.4 m from the quarry road's centre (inside its 4.5 m `NEAR`). Where it stands now
  (−106.76, 18.88), facing 70°, its back panel faces everyone coming up from the dock in all three options, which was
  the first finding of the [curio plan](curio-shelves-placement.md). In the Round the old spot is also 8.3 m from the
  centre, on the green itself. Review, call 9: the move proceeds.
- **On arrival:** the hall, Pip's house, one cottage (the "gate cottage", first building on the way in from the dock),
  the forge's frame, stake boards for Fine Prices and the museum, and the clock's stone footing at the centre (review,
  call 7). Two households, as the passenger-trade brief's towns arrive. Pip's house because the opening needs one door
  that opens and a resident who points at the job; a cottage because the little guys need a door to come from.
  Review, call 3: this proceeds; plot 4 (the cottage at 311°) is the one to stand from the start if the owner wants a
  second cottage, by changing its `when`.
- **Free, from the route:** the forge (built by hand, finished at F2); Fine Prices and the museum (they rise when T3
  is laid, as today); the clock on its footing when the trains run (review, call 7).
- **Bought, with Boogles:** eight plots. Three are cottages (`cottage` kit, 5.4 × 4.4 m) standing in for the three
  that no longer exist on arrival; five are houses (Pip's kit, 7.4 × 7.4 m, 3.7 m walls). The route stakes two at a
  time; plots 1 and 2 are staked from the first arrival, as stakes, string and a blank board on ground you can walk
  across; the board shows its price only once the room has been paid its first fare (review, call 6). The order is
  nearest the dock walk and the station first, so each new house is passed on a walk players already make.
- **Three moments** (drawn on the page): arrival as above; mid-game (trains running, about two hours): forge, Fine
  Prices, museum and clock standing, plots 1 to 3 built, 4 and 5 staked; full: twelve town buildings.
- **Kit rule from the Level findings:** a `cottage` (3.0 m walls on a 0.5 m slab) can be climbed with the second jump;
  a house (3.7 m walls on a 0.14 m slab) cannot. Cottage plots stay at least 11 m, roof edge to roof edge, from Fine
  Prices and its balcony. Review, call 11: the balcony stays a glider find, and step 0b probes the hops before the
  shop moves.
- **Alleys, not slots (review, call 2):** two buildings stand either 2.4 m or more apart, wall to wall, or not side by
  side at all. As first drawn the shop stood 1.46 m from plot 2.

## The Round (chosen): a ring road round a green

Owner, 10 November: "we can do the round, it's a lot more organic feeling than cross". Offered as option 2.

A green of about 14 m radius, centre G (−115.0, 20.07) on the hall's centreline, with a ring road about 6 m wide
(radius 14 to 20 m). The hall takes the ring's east side (its front is 23.4 m from G), and today's north–south path
is the ring's east tangent. Ways out: 70° through the hall to the trains, 250° to the dock (8 m wide, 18 m long),
about 40° to the camp, about 130° to the quarry. The clock stands at G.

**The ring is regular** (owner, later on 10 November, on the review's call 2: "I meant more organic than a rectangle, I
don't need the houses to be clumsily laid."; [rail](../decisions-rail.md#d-2026-11-10-the-round-is-built-regular)). The
review had read "organic" as small designed irregularities (bearings off the grid, setbacks of 21 to 24 m, faces turned
up to 7°, a hand-drawn green, a worn path, a `TOWN_IRREGULAR` tunable). All of that is **overruled and out of the data**:
the radial shape is the organic part. The ring's houses stand at even 30° steps from the station's bearing (70°, so
10°, 40°, …, 340°; the Roundhouse's stalls use the same grid), at one setback (front wall 22 m from G), each facing the
green squarely; the green's edge is a clean round of 14 m. The one exception is the museum, the largest building: it
stands one step further back (front 24 m), because at 22 m it stood 1.67 m from Pip's house and the review's 2.4 m
alley rule still binds. The review's other fixes stand (the alley rule, the bay, the footing, the interiors).

Derivation, for step 1: centre = G + (`front` + depth ÷ 2) × (sin `bearing`, −cos `bearing`); the face's bearing =
`bearing` + 180°; yaw = 180° − face = −`bearing`, in radians, wrapped to (−π, π].

| Building | Kit, w × d | Bearing | Front | Position | Faces | Yaw | When | Moves |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pip's house | house, 7.4 × 7.4 | 10° | 22 | (−110.54, −5.23) | 190° | −0.175 | arrival | 16.6 m |
| Gate cottage | cottage, 5.4 × 4.4 | 280° | 22 | (−138.84, 15.87) | 100° | 1.396 | arrival | 9.0 m (was (−135, 24)) |
| Museum | museum, 13 × 12 | 340° | 24 | (−125.27, −8.11) | 160° | 0.349 | T3 | 0.3 m, turns 36° |
| Fine Prices | shop, 10 × 8 | 190° | 22 | (−119.52, 45.68) | 10° | 2.967 | T3 | 15.1 m; balcony to (−119.20, 53.49) |
| 1 house | house | 220° | 22 | (−131.53, 39.76) | 40° | 2.443 | bought | |
| 2 house | house | 160° | 22 | (−106.22, 44.23) | 340° | −2.793 | bought | |
| 4 cottage | cottage | 310° | 22 | (−133.55, 4.52) | 130° | 0.873 | bought | |

Off the ring, each square to its own road (unchanged from the proposal; already staggered by a metre):

| Building | Kit | Road | Position | Faces | Yaw | When |
| --- | --- | --- | --- | --- | --- | --- |
| 3 house | house | quarry | (−90.50, 33.00) | 270° | −1.571 | bought |
| 5 cottage | cottage | quarry | (−91.50, 42.20) | 270° | −1.571 | bought |
| 6 house | house | quarry | (−90.50, 51.50) | 270° | −1.571 | bought |
| 7 cottage | cottage | camp | (−99.10, −22.80) | 218.7° | −0.675 | bought |
| 8 house | house | quarry, west side | (−108.30, 56.00) | 90° | 1.571 | bought |

Measured by step 1's test (10 November, layout B's `HALL`, wall to wall): the narrowest gaps are Pip's house to the
museum 2.67 m, plots 3 to 5 2.80 m, the hall to the forge 2.90 m (layout B's own), plots 5 to 6 2.90 m, the shop to
plot 1 and to plot 2 3.00 m each, plot 2 to plot 8 3.33 m and the museum to plot 4 3.67 m; nothing else is under 3.7
m. (The first drawing's shop stood 1.46 m from plot 2 and 2.22 m from plot 1; on the 30° grid it is 3.00 m from both.)
No ring building's corner is nearer G than 20.5 m, and each door is 2 m from the ring road's outer edge (the museum's
4 m). The balcony pad is at the shop's local (−1.67, −7.63), as today, which is (−119.20, 53.49): 149.5 m from the
summit against the 187 m glide budget, and 43.9 m from `VILLAGE`. The `yard` find, 4.5 m behind the gate cottage's back
wall, is at (−145.44, 14.71).

**The green and the road are plain.** The green is a circle of radius 14 m; the ring road is the 6 m between it and 20
m. The worn path across the green, which the review drew with the irregularity, is dropped from the data (it may come
back as paint if the owner asks). The outer edge has no kerb: the road fades into the verges at the doors.


- **Walks:** dock to the clock 97 m (17 s); dock to the hall's doorway 120 m (22 s); spawn to the clock 19 m (3 s);
  platform to the clock 50 m (9 s); east bay to the clock 71 m (13 s). Once round the ring road 107 m (19 s); round
  the ring and through the hall to the platform end and back is inside the 30 to 60 s loop the research asks for.
- **A rider** from the gate cottage: 48 m across the green to the ticket window, 29 m to the platform, about 45 s.
  Every house's riders cross the same green, so a crowd reads as a crowd, and the plot they would fill is beside them.
- **Seen first:** from the dock path, the gate cottage at 20 m, then the clock with the hall (42%) and the forge (50%)
  behind it on one line, and Pip's house to the left. From a train, the forge and hall, then plot 3 and the camp
  road's cottage. From the hall's front, 8 of 12 buildings are half or more in view, and every staked plot on the ring.
- **Grows:** the ring holds seven buildings and the hall, so plots 1, 2 and 4 close it and the rest line the quarry
  and camp roads, which are walked anyway. A later outer ring fits on the north and south sides only: the ground falls
  to the cove 37 m west of G, which gives the town its edge.
- **Weak:** Pip's house and Fine Prices move furthest; from the clock nine buildings are within the 34 m at which
  interiors draw (Risks); the roads' plots face three other ways (270°, 90°, 219°), each square to its own road.

The walks and view figures in this section were measured on the first drawing; the reviewed slots move nothing more
than 1.6 m, so they stand to the second, and the outlines-in-view counts have not been recomputed.

## Not chosen

- **Option 1, the Cross:** two straight streets (an 8 m Station Street on the hall's centreline, a 6 m cross street
  with the museum and Fine Prices at its ends), the clock at the crossing. No radial part; a street hides its own
  houses (3 of 12 in view from the hall's front). The owner on why not: the Round is "a lot more organic feeling than
  cross".
- **Option 3, the Fan:** a half-round forecourt at the hall's front with Dock Street and Museum Street radiating from
  it and a crescent lane joining them. It moved least, but its 265 m² forecourt was the only place to gather.

Their positions are in this file's history (commit 780384032) and drawn on the [2D page](../world/town-layout.html).

## Side by side

| | Today | 1 Cross | 2 Round | 3 Fan |
| --- | --- | --- | --- | --- |
| Radial part | none | none | the centre | the streets |
| Ways the buildings face | 7 of 7 differ | 160°/340°, 270° | toward G in 30° steps; roads' plots square to their road | square to each street |
| Doors within 3.5 m of a street | 2 of 7 | 12 of 12 | 12 of 12 | 10 of 12 |
| Open centre | none | 300 m² strip, 170 m² crossing | 615 m² green, 1,257 m² with the road | 265 m² |
| Loop | none | 63 m, 11 s | 107 m, 19 s | 89 m, 16 s |
| Dock to centre | 127 m, 23 s | 93 m, 17 s | 97 m, 17 s | 113 m, 20 s |
| Platform to centre | 29 m, 5 s | 54 m, 10 s | 50 m, 9 s | 33 m, 6 s |
| Far house to window, then platform | 59 + 29 m, 52 s | 60 + 29 m, 53 s | 48 + 29 m, 45 s | 54 + 29 m, 49 s |
| In clear view from the hall's front | 2 of 7 | 3 of 12 | 8 of 12 | 4 of 12 |
| Hall seen from the dock path | 17% | 42% | 42%, forge 50% | 42% |
| Standing buildings that move | | 4 (3, 4, 12, 17 m) | 4 (0.3, 9, 15, 17 m) | 3 (2, 9, 15 m) |
| Buildings within 34 m of the centre | 5 of 7 | 11 of 12 | 9 of 12 | 7 of 12 |
| Nearest climbable roof to Fine Prices' roof | 5.8 m | 11.4 m | 21.6 m | 15.7 m |
| Tree catalog against main | | identical | identical | identical |

"In clear view" and "seen" count how much of a building's outline has a straight line to the eye, with only buildings
blocking, on flat ground: no trees, roofs or heights.

## Why the Round

**Option 2, the Round, was recommended and chosen** (owner, 10 November). It is the only one with a middle: a place for three players and a crowd to be, a loop, and one
spot (the clock, or the hall's front) from which the built houses, the staked plots, the dock street and the camp road
are all in view. Filling a ring one house at a time is the clearest picture of building up, and the plan reads as a
shape from the ridge, the train and the museum's table, beside the Roundhouse's own circle. It costs two longer moves
and one draw-distance fix. The Cross is the fallback if the owner prefers plain streets. The Fan moves least and keeps
Fine Prices in place, but has nowhere to gather.

## How it grows, and how it repeats

- **Arrival against bought.** The route gives the station, the forge, Fine Prices, the museum and the clock; Boogles
  give every house after the first two. That keeps one thing that grows because a train came (the clock) beside the
  owner's leaning that buildings are intentional buys. If he takes the leaning whole, Fine Prices and the museum
  become plots 1 and 2 at their drawn positions and the eight become ten; nothing else in the layout changes.
- **The pattern for other towns** is the parts, not the shape: (1) the station on the town's edge with its hall facing
  in; (2) one centre whose shape the land suggests; (3) every way out ends at something (the sea, a landmark, the next
  job); (4) plots staked on the centre's edge first, then along the ways out; (5) an edge the land makes. Home is the
  only round one because it is the only town on a wide flat top. Proposals for the others, each needing its own brief:
  Ring Island's town as a crescent facing the shard, every door toward it; Canopy Town as platforms round a trunk, the
  ring stood on end; Port Quay as a one-sided quay street with the water as its other side and its own rotunda; High
  Gorge as a street across the bridge or a terrace on the lip. Bell Rock and West landing are stations, not towns.

## Design

- **Sync kinds.** Everything this pass places is **Local**, derived from constants and accepted railway state, as the
  town is today (`src/sim/town-facts.ts`): positions, streets, the green, stakes, the clock (shown when the `trains`
  fact holds), the forge's finish (shown when the forge is lit). No op, state key, presence field or message, and no
  `WORLD_NS` bump, through step 5.
- **Bought plots** are shared state and belong to the passenger trade: one small integer per plot (empty, building,
  built) in a railway component, an op to buy with a held Install, authority the server's, built by a construction
  animation that is Local. This plan supplies the plot catalog (id, position, yaw, kit, the order staked) and the
  stakes; it does not define the op, the wallet or the prices. That step takes a `WORLD_NS` bump when it lands as
  Server kind; the brief's `?proto=trade` is Host kind and takes none.
- **Controls.** None new. Buying is the trade plan's Install hold at the sign; doors use Interact as today.
- **What is cosmetic.** Streets and the green are paint on the terrain's path mask and a merged kerb mesh; they have no
  collider beyond the ground.

## Steps

Each step ships alone and leaves `npm run check` green. Tiers are from the paths touched; none touches `src/sim`,
`src/world`, `src/net` or `server/` until step 6. Steps 0b and 1 were added or expanded by the design review, which
also split step 4 and ordered step 7; its build-order ruling is in
[Where it sits against the ECS migration](#where-it-sits-against-the-ecs-migration).

- [x] **0. The owner picks**, and the designer rules on the Level findings. Done 10 November: the Round; the
  [design review](#design-review-designer-2026-11-10) below. The decision log and the calls table are recorded by
  the coordinator.
- [x] **0b. Probe the roof hops. Done 10 November; results in Level findings, item 8.** (a) works today (P2:
  ground, cottage 2's eave, Fine Prices' roof, the balcony box; step 2 removes the cottage); (b) does not; (c) works
  under the Round with the bay at its new spot, and a player on the hall's roof can get down (P3). The probe was a
  look eval kept out of the repo (no code change). The original brief: no code change. On main as it stands, at
  a seed just after T3 with the second jump held, with real input (a look eval, as `dev/look/evals/railway-finds.ts`
  fetches secrets): (a) today's cottage at (−123, 19) to Fine Prices' roof to the balcony box; (b) Fine Prices' own
  building site while its walkway stands (2 m up) to its roof and the balcony; (c) with `BOOGLE_HOME=b`, the finders'
  bay or the hall's 2.4 m south end wall to the hall's roof, and whether a player up there can get down. Write each
  result under Level findings. If (a) or (b) succeeds, the glider find can be taken with the second jump today: log
  it, and step 2 fixes (a) by removing that cottage; (b) is then a finding for the town's site walkway, not for this
  layout.
- [x] **1. The town as data, with its test. Done 10 November** (`src/place/town-plan.ts`, `test/town-plan.test.ts`, 11
  tests, `npm run check` green, nothing imports the module; built regular per the owner's correction: no
  `TOWN_IRREGULAR`, no `turn`, a clean green, no worn path; the museum's front is 24 m to clear Pip's house, narrowest
  gap 2.67 m; ring rows are `{ bearing, front }`). Low risk; nothing in the game imports it yet, so nothing
  a player sees changes. New `src/place/town-plan.ts` (no three.js; imports `HALL`, `AXIS`, `SHELF_B`, `axisPoint`
  and `toAxis` from `./home-station.ts`, which exports layout B's geometry whether or not the flag is on):
  - `TOWN_CENTRE = axisPoint(HALL.a − 26.44, HALL.c)`, which is G (−115.0, 20.07) today (risk P1: derived, never a
    literal). `TOWN_RING = { inner: 14, outer: 20 }`. `TOWN_GREEN`: a clean round, the
    ring's inner radius. No `TOWN_IRREGULAR` (the ring is regular, owner's correction below).
  - `TOWN_SLOTS`: twelve rows, ids `house` (Pip's, the existing `RoomId`), `gate`, `museum`, `shop`, `plot1` to
    `plot8`; each `{ id, kit: 'house' | 'cottage' | 'museum' | 'shop', w, d, when: 'arrival' | 'T3' | 'bought' }`
    with either `ring: { bearing, front }` (the seven ring rows) or `at: { x, z, yaw }` (the five road rows).
    `slotPoint(bearing, radius)` and `townBuilding(id)` return `{ x, z, yaw, w, d }` by the derivation in that
    section; `townLocal(building, x, z)` maps a point in a building's own frame.
  - `TOWN_PLOTS`: `plot1` to `plot8` in that order, with `stakedAtOnce: 2` (the two lowest-numbered unbought plots
    are staked; the passenger trade sets how far up the list the route allows).
  - `TOWN_STREETS`: the ring; the dock street (from G at 250°, radius 20 to 38 m, 8 m wide); the camp mouth (40°) and
    the quarry mouth (130°) on the ring road's centre, radius 17 m. (No worn path across the green: dropped with the irregularity.)
  - `TOWN_PROPS`: the clock and its 5 × 5 m footing at G; the finders' bay at
    `axisPoint(HALL.a − 2.77, HALL.c + 10.45)`, which is (−89.19, 21.80), yaw `SHELF_B.yaw`; the balcony pad at the
    shop's local (−1.67, −7.63); the `yard` find 4.5 m behind the gate cottage's back wall, (−145.44, 14.71) on the regular ring;
    the forge's west door at (−92, −3), 2.8 m wide.
  - New `test/town-plan.test.ts`: `AXIS.bearing` is 70 and G is within 0.05 m of (−115.0, 20.07) (so a change at the
    flip fails loudly); each derived position is within 0.02 m of its table row; every footprint is 2.4 m or more
    from every other building's, and 1 m or more from the hall, forge, stalls, bay and both lines' rails (the hall to
    the forge is layout B's own 2.90 m); no footprint's corner is inside 20.5 m of G or within a street's half
    width; every ring door is within 3.5 m of the ring road's outer edge (the museum 4.0 m: its forecourt); every
    pad is within 56 m of `VILLAGE`; every `cottage` roof is 11 m or more from the shop's roof and the balcony pad;
    the balcony pad is within 187 m of the summit (18, −6); every ring door faces G squarely;
    the tree catalog's length and first and last rows are unchanged.
  - Verify: the test; `npm run check`.
- [ ] **2. Move what stands. After the Home flip, M8, step 0b and step 7.** Normal review. `src/place/layout.ts`:
  `TOWN.start` becomes the one gate cottage; `ROOM_PLOTS` takes the three new rows; all read from `town-plan.ts`.
  `PATHS[0]` and `PATHS[1]` start at the ring (the camp and quarry mouths) and `SHORE_PATH`'s last five points become
  the dock street to the ring. `tech-layout.ts`: the `yard` secret moves with the gate cottage and the `balcony` pad
  and secret keep their place in the shop's frame. `folk.ts`: `WANDER` points onto the ring road and the green.
  `home-station.ts`: `FINDERS_B` beside the hall (review, call 9). `docs/game-design/place.md`. Verify:
  `npm run level-check`; step 1's test; looks from the top of the dock path, from the hall's front and from above at
  `--rail-seed q6-done`, and the first of them again at phone size; `dev/look/evals/railway-finds.ts` (the `yard`
  find on real ground, the balcony by glide); the bot's `forge-lit` segment (its Home waypoints cross the old
  square); `npm run loop -- run` for order.
- [ ] **3. The green, the ring road and the streets.** Normal review; render. `src/entities/town/streets.ts` (new):
  the path mask for the ring and the dock street, one merged kerb and green mesh, no shadow of its own. The green's
  edge is `TOWN_GREEN`'s outline, not a circle; the kerb is on the green's side only; the worn path is paint. Verify:
  a look from the hall's front and one from above; `npm run perf` on a quiet machine (one mesh, one material added).
- [x] **4a. The forge finishes when it is built. After M8; does not wait for the flip.** Normal review.
  `src/entities/railway/forge-finish.ts`: the show's trigger is the forge lit, not `works.crossing` (owner's decision
  of 10 November; nothing in it depends on the layout); `works-late-game.md` step 6 and `place.md` updated. Verify: a
  look at `--rail-seed q1-done` (roof on) and at `awake` (frame only); the Works bot from `works-arrive` no longer
  waits for a roof.
- [ ] **4b. The forge's west door. After the flip and M8.** Normal review. `src/entities/town/workshop.ts`:
  `WORKSHOP_DOOR` on the west wall, from `TOWN_PROPS`. Verify: a look at `--rail-seed q1-done` from the camp road
  (door open, steps on the verge); walk in.
- [ ] **5. Stakes, boards, the footing and the clock.** Normal review. `src/entities/town/plots.ts` (new): four
  stakes with a pennant each, a string and a board per staked plot from `TOWN_PLOTS`, one instanced mesh; the board
  is blank until the passenger trade gives it a price (review, call 6). The clock's footing at G from the first
  arrival; the clock from `opening-plans.ts`'s `clock` kit on it when `trains` holds, raised by the town's site
  animation. Verify: looks at `awake` and `trains-on`, each also at phone size from the top of the dock street (the
  stakes must read at 40 m).
- [ ] **6. Plots can be bought** (the passenger trade's step; High by path when Server kind). Reads `TOWN_PLOTS`; the
  build is the existing site animation (`place/sites.ts`) with a little-guy gang; a built plot is a room
  (`createRooms`) with a plain interior. Verify with that plan's checks, plus `npm run scenario` for two players
  seeing one plot built.
- [ ] **7. Interiors draw by the door. After M8; before or with step 2** (the Round puts the museum's, the shop's and
  Pip's interiors inside the present 34 m of where everyone stands). Normal review. `rooms.ts`: `ROOM_CAM.drawWithin` measured from the door, with
  a smaller radius (about 18 m) unless you are inside. Verify: `npm run bench` at the `town` pose and at the clock,
  before and after; a look walking into Pip's house.

## Where it sits against the ECS migration

The owner's standing priority holds this pass with every other build-out. M3 (rules), M6 and M7 (the railway's and the
town's files moved to `src/entities/`) are on main. **Views resume after M8** (the read facade); steps 2 to 5 and 7
read the railway through today's `inspect()`, which M10 moves, so they start after M8 and rebase cheaply (each is a
few files). Step 1 is data and a test and can go first. **Ruling (design review, 10 November):** steps 0b and 1
start now; step 4a waits for M8 only; steps 2, 3, 4b and 5 wait for both the flip and M8, with step 7 landing before
or with step 2; nothing here waits for a playtest or a world bump. Step 6 waits for the passenger trade's own gates. Two more
things come first: **the Home station flip** (home-station step 6), because every option is drawn on layout B and
the bay's new spot and the quarry road's plots are where layout A's stall and its road stand; and **M13** only if `src/proto/place/town.ts` is to be
deleted rather than kept in step with `TOWN.start` (it reads the same table; until then Place draws the same one
cottage).

## What it breaks or touches

- **Route and Home flow.** No bill, supply, cue or rail rule changes. The bold path to the camp still leaves from in
  front of the hall. The first walk in is 30 m shorter. Bot waypoints across the old square and to the shop, museum and
  house need rerunning (step 2).
- **Order.** The sealed-building order ("the two cottages on the way in from the dock, then the other two") has only
  one cottage left to open; the three others are walk-in from the day they are bought. The second jump still comes
  after station 3; see the roof finding.
- **Opening and shots.** The first visit is the fall into the cove, 100 m west; no shot frames the town. The Works'
  throat shot frames the Roundhouse, which does not move.
- **Saves.** Moving a building is **not** a `WORLD_NS` matter here: with each option applied, the tree catalog is
  identical to main's in both layouts (362 and 361 trees), and no railway anchor moves. Personal town memory and the
  wardrobe are keyed by room, not position. A player whose saved pose is inside a new footprint is moved out by the
  existing keep-out. Step 6 is the one bump.
- **Population.** The village sign counts 12 people at the start; with two households that number wants the owner's
  eye (not changed by this plan).

## Level findings

For the designer, with the plan (owner, 9 November). **Ruled on 10 November** (design review, finding 3): finding 3
is probed by step 0b before step 2; finding 7 closes for plots 1 and 2, because a plot is bought with fares and the
glider comes before the trains; findings 4 and 5 are checked on real ground in step 2. Figures below are the first
drawing's; the reviewed balcony is 152 m from the summit.

1. **`npm run level-check -- --place=place` passes with each option applied** (layout A: 0 problems; production
   grounding 5,282 placements, 0 problems). With `BOOGLE_HOME=b` it reports the same three problems as main does
   without this plan (a rack foot 5.7 cm off the ground; two platform ramps into sleepers), which are the Home
   station plan's.
2. **The check cannot see most of this plan.** It floods terrain at 2 m; it does not model props, room and roof
   collision, streets, the green, stakes, or sightlines. The roof and view numbers here are from my scratch script.
3. **Proven today by the step 0b probe (finding 8): the balcony secret (glider) is reachable with the second jump.**
   As suspected before the probe: A cottage's
   eave is 3.0 m over a 0.5 m slab (a double jump gains 3.0 m); its roof top is 4.5 m. Cottage 2's roof is 5.8 m
   from Fine Prices' roof (5.86 m), and the balcony pad (6.4 m) is 0.4 m behind the shop. No run confirms it; the
   check says "out of reach" from terrain alone. Every option removes that cottage; the nearest climbable roof to the
   shop becomes 11.4 m (Cross), 21.6 m (Round) or 15.7 m (Fan). Ask: a physics probe of the hop before step 2, and
   step 1's test keeps the gap.
4. **The balcony moves with the shop** in options 1 and 2: 134 m and 148 m from the summit against a 187 m glide
   budget (today 143 m). In reach, by the check's own budget.
5. **The `yard` secret** (a walk find behind a cottage at (−127.5, 25.5)) loses its cottage in every option. Step 2
   puts it behind the gate cottage; it is found before any ability either way.
6. **The double-jump course** (pads at z −37 and −53, 8.4 m up) runs along the town's north edge. The camp road's
   cottage plot in option 2 is 14.7 m from the nearest pad; nothing else is within 20 m. No plot goes north of z −30.
7. **Stakes and scaffolds are steps.** A building site's walkway is 2 m up and solid. Beside the shop that is a step
   toward its roof; the two slots beside Fine Prices take the house kit, whose site still wants the probe in finding 3.
8. **The roof hops, probed (step 0b, 10 November; real key events in `npm run look -- --rail-seed q1-done`, the second
   jump taken at the first pillar's device by pressing Interact; only staging was teleported, each stage starting
   where the last came to rest; reach, not timing, is the evidence, the machine was loaded).** Open ground: a jump and
   the air jump rise 2.9 m, up to 3.3 m best case (second press 300 to 400 ms after the first, run-up 0 to 300 ms).
   - **(a) Works today: P2.** On main, from the ground 6 m east of cottage 2 (−123, 19), a run-up and double jump
     comes to rest on the cottage's east eave, 3.0 m up; from that eave (−121, 19) one double jump, no run-up, lands
     on Fine Prices' roof (5.86 m up); from its back edge one double jump lands on the balcony box (6.4 m up, the
     pad). The glider's `balcony` find (the `aviator` gift) can be taken today with the second jump alone, after T3 and
     long before the glider. (The step from the eave to the cottage's own 4.5 m ridge did not land in 12 tries; the
     chain does not need it.) Rank P2: a cosmetic find out of its order, nothing gated; but the glide from the summit
     to the balcony is the return to Home that the find is for (call 12). **The Round changes it:** cottage 2 is
     removed (step 2) and step 1's test keeps every cottage 11 m or more from the shop's roof and the pad; the hop
     closes by data. The nearest other eave to the shop is far beyond the 5.8 m leap that worked.
   - **(b) Does not work: not a finding.** From Fine Prices' own building site's walkway (2.04 m up, solid from about
     2.5 s to 9.4 s of the site), six tries from three places on the plank, run-ups of 0 and 250 ms, rose 1.1 to 2.4 m
     and stayed on the plank. The roof needs 5.9 m: the walkway's 2.0 plus the best rise of 3.3 is 5.3 m. It holds for
     a house site (plots 1 and 2) by arithmetic only, not probed: its roof top is about 5.6 m against the same 5.3 m,
     and a plot is bought after the glider anyway (review, finding 3).
   - **(c) Works under the Round, with the bay where the plan puts it: P3.** `?home=b`; the finders' bay is not at its
     new spot yet, so the same collider (curio-shelf.ts: 5.5 m wide, 2.8 m high) was staged at (−89.19, 21.80) at
     the shelf's yaw. A double jump from the ground stands on its top (2.9 m); from there a double jump lands on the
     hall's roof (5.1 m up, the roof is 5.0), at the south eave then the ridge. From the hall's end walls (2.4 m) the
     roof is not reachable (the roof overhangs them; a jump from the wall top rose 0.55 m). **A player on the roof
     can get down:** walking off any of the four sides ended on the ground. Nobody is stranded. What it gives: a
     place to stand over the platforms and the green, no reward. Rank P3. What the Round changes: it moves the bay to
     that spot (call 9), which opens this; to close it, move the bay 3 m or more off the hall's south end or cap
     the roof's reach; recommended: leave it, a free perch is a small joy and harmless here.

## Risks

- **P1. The Home flip moves under this plan.** Everything is drawn on layout B; if B's hall, shelf or bay change at
  the flip, the centre (which sits on the hall's centreline) moves with them. Step 1's data derives the centre from
  `HALL`, not from literals.
- **P2. Interiors near the centre.** A room's interior draws within 34 m of its building (`ROOM_CAM.drawWithin`); the
  museum's alone is 23 draws. From the Round's clock nine buildings are inside that. Step 7 fixes it; until then the
  town pose could gain tens of draws on the phone, which drew about 950,000 triangles here on 10 November. Not
  measured.
- **P2. The roof hop** (Level finding 3) lets a glider secret go early if a cottage is placed carelessly.
- **P2. Hot files.** `layout.ts`, `tech-layout.ts` and `folk.ts` are read by the railway views, the level check, the
  bots and Place; step 2 lands in one PR and after the flip. `npm run inflight` showed one branch, on the passenger
  bay's page and the decision log; no overlap.
- **P3. Cost in geometry.** A cottage is 57 boxes and a house 79 (12 triangles each), all in the town's one instanced
  mesh: the full town adds about 6,800 triangles and no draw calls for shells, twice that with shadows. The green and
  streets are one mesh. Counted from the kit, not measured.
- **P3. Mixed builds.** Steps 1 to 5 are constants and views: an old client sees the old town until it reloads, which
  the owner accepts in development.
- From room-safety's "Don't": nothing here writes shared state from a view, or gates a route step on a Local effect.

## Calls

The planner's table, as proposed. The [design review](#design-review-designer-2026-11-10)'s table rules each of
these and the calls this one misses; where they differ, the review's stands.

| Call | Kind | Source or reason |
| --- | --- | --- |
| Home is one station, layout B; the ticket window in the hall's north end; the shelf in the hall's front | Decided | Owner, 9 and 10 November |
| The forge finishes when built, with an interior | Decided | Owner, 10 November ([rail](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player)) |
| Only a couple of buildings on arrival; the others are bought plots | Leaning, designed to | Owner, 10 November ([rail](../decisions-rail.md#d-2026-11-10-the-village-may-start-with-a)) |
| Furniture and buildings align to the station's axis, their street, or the centre; never to a view | Decided, extended | Owner, 9 November ("not a view from spawn"); the curio plan's rule, extended from furniture to buildings |
| The two on arrival are Pip's house and one gate cottage | New | The opening needs one open door and a home for the little guys. It differs from the trade brief's open call (two cottages stand, the two on the way in from the dock; Pip's house not counted): question 2 |
| Fine Prices and the museum still rise free at T3; the clock rises free when the trains run | Default / New | Keeps "towns grow from what arrives" for three things; question 2 and 4 |
| Eight bought plots at Home: three cottages, five houses; two staked at a time; the first two staked from the start | New | Trade brief's "two or three plots a stage"; DESIGN 7 |
| The forge's door on its west wall | New | The south door opens 3 m from the hall's north wall in layout B |
| The finders' bay beside the hall's south end, facing the square | New | Its back faces the dock arrival where it stands; "for now" in the 10 November entry |
| Cottage-kit plots stay 11 m or more from Fine Prices' roof and balcony | New | Level finding 3 |
| Place's cargo-built rows (`TOWN.wood`, `TOWN.stone`) are not ported; only the clock is kept | Default | No fit check has run on them (owner call "Port from Place only what still fits"); the bought plots replace them |
| Interiors draw by distance to the door | Default | The phone's draw budget |

## Open questions

All five are closed for building. Question 1 was answered by the owner on 10 November; 2 to 5 he did not answer, and
they proceed on the design review's rulings (owner call "Pick and log, don't ask"): 2 as recommended (call 3); 3 yes
(call 9); 4 free, with a footing from the start (call 7); 5 staked from the start, the price shown only after the
first fare (call 6). As asked:

1. **Which layout?** Recommended: option 2, the Round. **Answered: the Round.**
2. **What stands on arrival, and what is free?** Recommended: the hall, Pip's house and one cottage stand; Fine Prices
   and the museum rise free at T3 as today; three cottages and five houses are bought. Two other readings, both
   drawn without moving anything: the passenger-trade brief's open call, two cottages standing beside Pip's house
   (then plot 4, a cottage, stands from the start and seven are bought); or his leaning taken whole, with Fine Prices
   and the museum bought too.
3. **Move the finders' bay beside the hall's south end?** Recommended: yes; it supersedes the 10 November "share one
   axis, for now" spot when the new Home is the default.
4. **The clock: free when the trains run, or bought?** Recommended: free, on the centre.
5. **Are plots 1 and 2 staked from the first arrival, before any fare exists?** Recommended: yes, with price signs.

Also for him, not a question of layout: no designer fit check has run on Place's cargo-built town rows; this plan
drops them (Calls).

## Wording for the decision log and the calls table

Not edited by this job or by the design review (the coordinator records the pick). The planner's wording, with the
review's one change (the ring is "about 30° apart", not exact); the review's rows for the calls table are at the end
of its section:

- `docs/decisions-rail.md`, Decided and Current rules: "**2026-11-10, Home's town is laid out as the Round** (owner:
  'Ok sounds good, we can do the round, it's a lot more organic feeling than cross'). A green on the hall's
  centreline with a ring road; buildings stand on the ring about 30° apart facing the green; the hall, Pip's house and one cottage stand on arrival; Fine Prices and the museum rise
  with the first path; eight plots are bought. Plan: [town-layout](plans/town-layout.md)."
- If question 3 is yes, an italic note on the 10 November "the curio shelf and the finders' bay share one axis, for
  now" rules line: "_the bay's spot: beside the hall's south end, facing the square (town layout, 2026-11-NN)_".
- `docs/agent-calls.md`, rail table, one row per New and Default call above, for example: "| 2026-11-10 | New: on
  arrival Home's town is the hall, Pip's house and one gate cottage; three cottages and five houses are bought plots,
  two staked at a time, the first two from the start | [town-layout](plans/town-layout.md#calls) | planner (town
  layout) | Two households match the trade brief; DESIGN 7 | open |".

## What I could not confirm

- None of the options has been seen in the game; the stills are of today's town and `?home=b`.
- Every draw and triangle figure for the new town. (The roof hops are probed: Level findings, item 8.)
- Not probed: a house site's walkway (arithmetic only) and the real bay at its new spot (a stand-in collider was used).
- The stills were taken on a busy machine (load 12 to 21); they are for layout, not for performance.

## Design review (designer, 2026-11-10)

The owner picked the Round ("Ok sounds good, we can do the round, it's a lot more organic feeling than cross"). He
did not answer questions 2 to 5; none needs his word, so each proceeds on a logged recommendation (owner calls "Pick
and log, don't ask" and "Nothing waits for a playtest"). The rulings below are applied to the plan's body: the status
line, [What stands, and when](#what-stands-and-when), [The Round](#the-round-chosen-a-ring-road-round-a-green), the
steps and the build order. No code was written.

**Read and run:** the decision log's Current rules for rail, rewards, core loop and look; owner calls; the
passenger-trade brief's plot lines; research top blocks for growing-towns, level-design, route-contract and
progression-flow-layout; `home-station.ts`, `layout.ts`, `tech-layout.ts`, `folk.ts` and the `clock` kit; `npm run
loop` for the route's order; the planner's stills from the top of the dock path and from above with `?home=b`; and a
scratch measurement of the Round's footprints against layout B's `HALL` (gaps, radii, the balcony's glide).
**Not seen:** nothing of the Round exists in the game, so no still of it could be taken; phone readability and the
views from the dock street are judged from numbers until step 2's and step 5's looks. The playtest sessions (all on
Place, 10 November) were listed but hold no town-centre moment to compare, so the flow findings carry little weight.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Home's town is the Round: a green on the hall's centreline, a ring road, buildings facing the green | Decided | Owner, 10 November, the pick |
| 2 | **Overruled by the owner, 10 November ("I meant more organic than a rectangle, I don't need the houses to be clumsily laid."): the ring is regular, at even 30° steps and one setback (the museum one step back), and there is no `TOWN_IRREGULAR`; the 2.4 m alley rule stands.** As the review wrote it: the ring is not a compass drawing: bearings up to 2° off the 30° grid, setbacks 21 to 24 m, faces turned up to 7°, a hand-drawn green edge, a worn path, alleys of 2.4 m or more; one tunable, `TOWN_IRREGULAR`, scales it to zero | New | His reason for the pick is "organic"; growing-towns ("predictable mass, surprising detail"). The cap is small because he also said "weirdly at angles and not spaced intentionally": every door still faces the green. Proceeds on this recommendation |
| 3 | On arrival: the hall, Pip's house, one gate cottage, the forge's frame, stake boards for Fine Prices and the museum | New | His leaning "maybe only a couple buildings exist"; it replaces the trade brief's open call (two cottages besides Pip's house). A ring with five empty places is the stronger picture of building up. Cheap to change: plot 4's `when`. Proceeds |
| 4 | Fine Prices and the museum rise free when T3 is laid, as today | Default | "Towns grow from what arrives" stands (rail, 2 November); buildings as intentional buys is a leaning, and the plan keeps the way to take it whole (they become plots at their drawn places) |
| 5 | Boogles build the house itself; an unbought plot is empty ground you can walk across | Decided | Owner, 10 November ([rewards](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources)) |
| 6 | Eight bought plots (five houses, three cottages) in the order 1 to 8; the two lowest-numbered unbought plots are staked; plots 1 and 2 from the first arrival, with a blank board until the room's first fare | New | DESIGN 7 for the stakes. Changed from the plan's "with price signs": a price in a currency nobody can earn for about two hours tells and cannot be acted on (DESIGN 11); the trade's own first moment is "an empty platform and a staked plot". Prices and the route's ceiling stay the trade plan's. Proceeds |
| 7 | The clock rises free on the centre when the trains run; its stone footing stands there from the first arrival | New | Port check (owner call "Port from Place only what still fits"): keep, changed. It is the town's one tall landmark (level-design: big shapes to steer by; the kit is 5 m wide and about 26 m tall) and the one thing that still grows because a train came. The footing is added so the centre is not bare for the first two hours and the clock is telegraphed. Proceeds |
| 8 | Place's other cargo-built rows (`TOWN.wood`, `TOWN.stone`: halls, sheds, the stone street, the keep) are not ported | Default | Port check: cut. Bought plots now do their job, and "Home: a busy town at most" (2 November) |
| 9 | The finders' bay stands beside the hall's south end, on the hall's front line, facing the green | New | Forced by the pick: its "for now" spot is 8.3 m from G, on the green, back to the dock. The new spot keeps Place's pairing (what you have beside what you missed, one glance, 8.8 m from the shelf; port check: keep) and answers "not spaced intentionally". Proceeds; the coordinator adds the italic note to the 10 November "share one axis, for now" line |
| 10 | The forge finishes when it is lit, and has an interior | Decided | Owner, 10 November ([rail](../decisions-rail.md#d-2026-11-10-the-forge-finishes-when-the-player)); step 4a |
| 11 | The forge's door is on its west wall, on the camp road | New | In layout B the south door opens 3 m from the hall's north corner beside road 1's buffers. West puts the door on the first road every player walks, 15 m from the hall's front. Proceeds; step 4b waits for the flip |
| 12 | The balcony stays a glider find: no cottage roof within 11 m of the shop's roof or the pad, and the hops are probed before the shop moves | New | See finding 3. It is a cosmetic find, not a gate, so this is a lens and not a firm rule; the glide from the summit to a balcony in town is the return to Home that the find is for. Proceeds; step 0b |
| 13 | Cottage roofs may be climbed with the second jump (gate cottage, plots 4, 5 and 7) | Default | DESIGN 2. By the numbers nothing gated is in reach from one: plot 7's roof is 14.7 m from the jump course's pad and 0.9 m short of it |
| 14 | The `yard` find moves behind the gate cottage, on its seaward side, about 16 m north of the dock street's centre | Default | A small reward for looking left on the first walk in; found before any ability, as today |
| 15 | Pip's house at 12°, beside the camp road's mouth; the gate cottage (282°) and plot 1's stakes (221°) either side of the dock street | Default | First sight on the way in is one house and one staked plot, 16 m apart across an 8 m street; Pip's door is 20 m from the forge she points at |
| 16 | The ticket window in the hall's north end; the shelf in the hall's front; the passenger train's east bay; the station does not move | Decided | Owner, 9 and 10 November (rewards, rail) |
| 17 | Every building can be walked into; the gate cottage is the one sealed cottage left and opens first; a bought house is walk-in from the day it stands | New | The rule is decided (core loop, 10 November). This is a reading of the opening order "the two cottages on the way in from the dock, then the other two" (look, 10 November) now that three of the four are plots. Proceeds; the coordinator notes it on that line |
| 18 | Riders cross the green on the worn path at 1.7 m/s and go in by the hall's north bay; little guys have no colliders | Default | As `folk.ts` today. The queue at the window is the trade plan's; see finding 6 |
| 19 | Spawn stays in front of the hall, on the ring's east side, 19 m from the clock | Default | The meeting place for a friend who arrives late (flow lens 8) |
| 20 | The little guys wander the ring road and the green; the village sign still counts 12 | Default | The number wants the owner's eye with two households standing; not changed here |
| 21 | Sizes: a green of about 14 m radius, a ring road of about 6 m, a dock street 8 m wide and 18 m long | Default | growing-towns (a 6 to 8 m main street, a clear plaza of about 480 m²; the green is 615 m²) |
| 22 | A staked plot is four stakes with pennants, a string and a board, and must read at 40 m on a phone | Default | DESIGN 7; checked by step 5's phone-size look |
| 23 | Interiors draw by distance to the door (about 18 m), and that lands before or with the move | Default | Risk P2: from T3 the museum's, the shop's and Pip's interiors are all inside the present 34 m of the green |

Decided 4, Default 11, New 8. Not ruled, because it is scope for another brief: the pattern for other towns and a
later outer ring (How it grows, and how it repeats).

### The space, leg by leg

Positions from the reviewed table; walks at 5.6 m/s; the planner's figures where marked (plan).

| Leg | Metres | Seconds | What is in view at its end |
| --- | --- | --- | --- |
| Dock to the top of the dock path (−150.7, 33.1) | 59 (plan: 97 to the clock) | 11 | The gate cottage's back on the left, plot 1's stakes on the right, the green, the hall and the forge's frame on one line (plan: 42% and 50% of their outlines) |
| Down the dock street to the ring | 18 | 3 | The whole ring: Pip's house, the footing, the stake boards; behind you, the `yard` find |
| Across the green to the footing or clock | 20 | 4 | Every way out: 70° the hall, 40° the camp road, 130° the quarry road |
| The clock to the hall's way in | 23 | 4 | The shelf, the trains; to the left the forge's west door |
| The hall's front to the forge's west door | about 15 | 3 | The camp road, the bold path |
| Platform to the clock (plan) | 50 | 9 | |
| East bay to the clock (plan) | 71 | 13 | |
| Once round the ring road (plan) | 107 | 19 | |

The three firm rules. **The next goal can be found:** the first walk in ends facing the hall and the forge's frame
(today it reaches the square 61° off the station's axis), and the bold path leaves from the 40° mouth beside Pip's
door; this is a claim from outlines on flat ground until step 2's look and the bot's `forge-lit` segment prove it.
**A gate keeps its meaning:** no bill, pillar or route gate moves; the second jump still comes after station 3.
**Nobody is stranded:** plots are open ground; the one unknown is the hall's roof from the bay's new spot (step 0b, c).
Lenses: the town now has one main line (dock, green, hall, camp road), ends the arrival facing the next thing, and
has a place to meet; none is broken.

### Findings

1. **Overruled by the owner, 10 November (see call 2).** As the review wrote it, **changed before building (applied): a ring on an exact grid would read as a diagram, which is the opposite of
   why he picked it.** Seen from the ridge, the train and the museum's table, seven fronts at one radius and one
   angle step are a clock face. Call 2's slots and the hand-drawn green are in the body, with `TOWN_IRREGULAR` to
   compare.
2. **Changed before building (applied): the shop stood 1.46 m from plot 2 and 2.22 m from plot 1.** Too narrow to
   be an alley and too wide to be a terrace: a camera trap. The reviewed slots give 2.59 m and 3.67 m, and step 1's
   test holds 2.4 m.
3. **The roof hop: what the level check proves, and what must be probed before anything moves.** `npm run
   level-check` passing (planner: 0 problems with A; the same three as main with B) covers terrain reach only; it
   models no roof, prop, site walkway, street or sightline, so it says nothing about findings 3 and 7 of the Level
   findings. The route's order settles part of it (`npm run loop`): the second jump comes at T3, the glider after the
   hook, the trains after the glider, and a plot can only be bought with fares. So **a bought house's building site
   can never be an early way to the balcony**: everyone already holds the glider. Level finding 7 closes for plots 1
   and 2. What stays open is the stretch from T3 to the glider, on main today: the cottage 5.8 m from the shop's
   roof, and the shop's own site walkway, which stands when the second jump has just been earned. A secret's `after`
   is when its missed box turns up at the bay, not a lock, so a hop that works takes the gift. Step 0b probes both,
   and the hall's roof, before step 2. Nothing in steps 0b or 1 moves anything.
4. **To check when things move (step 2):** the `yard` find's new ground at about (−144.0, 13.1), 29.8 m from G where
   the ground starts to fall at 37 m; the balcony pad's ground at (−121.09, 54.77); that a saved pose inside a new
   footprint is moved out (the plan states it, nothing proves it); the bot's Home waypoints. These are reach claims
   without proof until then.
5. **The centre was bare until the trains run, about two hours in.** The clock's footing (call 7) is in the body.
6. **For the passenger trade, not this plan: the hall's way in is nearly 5 m wide and is where spawn, the shelf, the
   greeter and every rider's walk meet.** Riders should use the hall's north bay, beside the window (call 18).
7. **Research.** growing-towns' 30 to 60 s loop is met only by the ring plus the hall and platform (the ring alone
   is 19 s); acceptable, the green is the plaza it asks for. level-design's tall landmark is absent until the clock
   rises; the hall's roof and the forge's smoke carry it until then. Neither needs a change.
8. **Records out of step, for the coordinator:** the 2D page still offers three options at the first drawing's
   positions; the opening-order line (call 17); the earlier open row "the Village starts with two cottages" in the
   calls table, which call 3 replaces.
9. **No line of The Boogler's copy is added or changed.** The plot board's price and any words on it are the trade
   plan's.

### Owner questions

None blocks the build. For him to overrule when he sees it: one cottage or
two on arrival (call 3), the clock free (call 7), and the village sign's 12 (call 20).

### Rows for the calls table

Recorded in `docs/agent-calls.md` on 10 November, after the coordinator's entry for the pick landed: these rows
replace the planner's four, and two italic notes went on the rules lines (the bay, the opening order). Each row: date 2026-11-10, source
[town-layout](town-layout.md#design-review-designer-2026-11-10), by designer, status open. Rail table unless marked.

- (Overruled by the owner the same day and archived; see call 2.) New: the Round is built with small designed irregularities (bearings within 2° of a 30° grid, setbacks 21 to 24 m,
  faces within 7° of the centre, a hand-drawn green, alleys of 2.4 m or more), scaled by `TOWN_IRREGULAR`. Reason: the
  owner chose it as "more organic".
- New: on arrival Home's town is the hall, Pip's house and one gate cottage, with the forge's frame and stake boards
  for Fine Prices and the museum; it replaces the row "the Village starts with two cottages". Reason: "only a couple
  buildings"; plot 4 can stand from the start by one field.
- New (rewards table): eight bought plots at Home, five houses and three cottages, in a fixed order; the two
  lowest-numbered unbought plots are staked; plots 1 and 2 from the first arrival with a blank board until the first
  fare. Reason: DESIGN 7 and 11.
- New: the clock rises free on the centre when the trains run, on a stone footing that stands from the first arrival.
  Reason: port check, keep and change; the town's tall landmark.
- New: the finders' bay stands beside the hall's south end facing the green, at (−89.19, 21.80). Reason: its "for
  now" spot is on the green.
- New: the forge's door is on its west wall, on the camp road. Reason: layout B's hall corner.
- New: the balcony stays a glider find; no cottage roof within 11 m of the shop's roof or pad; the hops are probed
  before the shop moves. Reason: route contract, early reach of a find.
- New: the gate cottage is the one sealed cottage and opens first; bought houses are walk-in when built. Reason: a
  reading of the 10 November opening order.
- Default: Fine Prices and the museum still rise free at T3.
- Default: Place's `TOWN.wood` and `TOWN.stone` rows are cut (port check); only the clock is kept.
- Default: cottage roofs may be climbed with the second jump.
- Default: the `yard` find moves behind the gate cottage.
- Default: Pip's house beside the camp road's mouth; the gate cottage and plot 1 either side of the dock street.
- Default: riders use the worn path and the hall's north bay; spawn stays in front of the hall.
- Default: the village sign still counts 12 (for the owner's eye).
- Default: a green of about 14 m radius, a 6 m ring road, an 8 m dock street; staked plots carry pennants and read
  at 40 m on a phone.
- Default: interiors draw within about 18 m of the door, landing before or with the move.
