> **Status: proposed (2026-11-10).** Next: the owner picks a layout on the [2D page](../world/town-layout.html); the
> designer rules on the Level findings; the build waits for the Home station flip and the ECS migration's M8.

# Home's town layout: a proper town, with a radial part

Plan and page only; no game code changed. Coordinates are Place-local metres (world x = local x + 1000), north is −z.
Bearings are degrees clockwise from north. A three.js `yaw` turns a building's door (local +z) to face bearing
`180° − yaw`. Player walks are timed at 5.6 m/s, little guys at 1.7 m/s (`folk.ts`).

## The owner's words

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

## The same in all three options

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
  the first finding of the [curio plan](curio-shelves-placement.md). Open question 3.
- **On arrival:** the hall, Pip's house, one cottage (the "gate cottage", first building on the way in from the dock),
  the forge's frame, and stake boards for Fine Prices and the museum. Two households, as the passenger-trade brief's
  towns arrive. Pip's house because the opening needs one door that opens and a resident who points at the job; a
  cottage because the little guys need a door to come from.
- **Free, from the route:** the forge (built by hand, finished at F2); Fine Prices and the museum (they rise when T3
  is laid, as today); the clock on the centre when the trains run (new; open question 4).
- **Bought, with Boogles:** eight plots. Three are cottages (`cottage` kit, 5.4 × 4.4 m) standing in for the three
  that no longer exist on arrival; five are houses (Pip's kit, 7.4 × 7.4 m, 3.7 m walls). The route stakes two at a
  time; plots 1 and 2 are staked from the first arrival (open question 5). The order is nearest the dock walk and the
  station first, so each new house is passed on a walk players already make.
- **Three moments** (drawn on the page): arrival as above; mid-game (trains running, about two hours): forge, Fine
  Prices, museum and clock standing, plots 1 to 3 built, 4 and 5 staked; full: twelve town buildings.
- **Kit rule from the Level findings:** a `cottage` (3.0 m walls on a 0.5 m slab) can be climbed with the second jump;
  a house (3.7 m walls on a 0.14 m slab) cannot. Cottage plots stay at least 11 m, roof edge to roof edge, from Fine
  Prices and its balcony.

## Option 1: the Cross (two straight streets; no radial part)

Station Street runs on the hall's centreline (axis c 3.8, the island's centreline) from the top of the dock path to
the square, 8 m wide. A 6 m cross street at axis a −40 has the museum at its north end and Fine Prices at its south.
The clock stands at the crossing (−118.8, 21.5) in a 13 m paved square. Back lanes behind the houses make blocks.

| Building | Position | Faces | Yaw | When | Moves |
| --- | --- | --- | --- | --- | --- |
| Pip's house | (−112.24, 8.75) | 160° | 0.349 | arrival | 2.9 m |
| Gate cottage | (−143.68, 21.79) | 160° | 0.349 | arrival | 17.4 m (was (−139, 5)) |
| Museum | (−128.99, −6.55) | 160° | 0.349 | T3 | 4.2 m |
| Fine Prices | (−111.47, 41.56) | 340° | −2.793 | T3 | 11.5 m; balcony to (−107.3, 48.2) |
| 1 house | (−107.30, 27.59) | 340° | −2.793 | bought | |
| 2 house | (−129.35, 14.97) | 160° | 0.349 | bought | |
| 3 house | (−122.71, 33.20) | 340° | −2.793 | bought | |
| 4 cottage | (−138.07, 37.20) | 340° | −2.793 | bought | |
| 5 house | (−90.50, 33.00) | 270° | −1.571 | bought | |
| 6 cottage | (−136.73, 19.26) | 160° | 0.349 | bought | |
| 7 cottage | (−131.12, 34.67) | 340° | −2.793 | bought | |
| 8 house | (−90.50, 43.00) | 270° | −1.571 | bought | |

- **Walks:** dock to the Cross 93 m (17 s); dock to the hall's doorway 121 m (22 s); spawn to the Cross 23 m (4 s);
  platform to the Cross 54 m (10 s); east bay to the Cross 75 m (13 s). Loop round the north-east block 63 m (11 s).
- **A rider** from the gate cottage: 60 m down Station Street to the ticket window, 29 m to the platform, about 53 s.
- **Seen first:** from the dock path, the gate cottage 12 m ahead, then the hall closing the street (42% of its
  outline) with a train on each side of the island behind it; the forge barely (8%). From a train, the forge and hall,
  then plots 5 and 8 beside the quarry road. From the hall's front, 3 of 12 buildings are half or more in view: a
  street hides its own houses.
- **Grows:** the street fills from the square outward; a ninth and later plot would extend the cross street.
- **Weak:** no radial part; the only open space is a 26 × 11 m strip at the hall and the crossing.

## Option 2: the Round (a ring road round a green; recommended)

A round green of radius 14 m, centre G (−115.0, 20.07) on the hall's centreline, with a 6 m ring road (radius 14 to
20 m). Building fronts stand at radius 22 m, 30° apart, measured from the station's bearing: the Roundhouse's stalls
use the same 30°. The hall takes the ring's east side (its front is 23.5 m from G), and today's north–south path is
the ring's east tangent. Ways out: 70° through the hall to the trains, 250° to the dock (8 m wide, 18 m long), about
40° to the camp, about 130° to the quarry. The clock stands at G.

| Building | Slot | Position | Faces | Yaw | When | Moves |
| --- | --- | --- | --- | --- | --- | --- |
| Pip's house | 10° | (−110.54, −5.24) | 190° | −0.175 | arrival | 16.6 m |
| Gate cottage | 280° | (−138.83, 15.87) | 100° | 1.396 | arrival | 9.0 m (was (−135, 24)) |
| Museum | 340°, front at 24 m | (−125.26, −8.12) | 160° | 0.349 | T3 | 0.3 m, turns 36° |
| Fine Prices | 192° | (−120.41, 45.50) | 12° | 2.932 | T3 | 15.2 m; balcony to (−120.4, 53.3) |
| 1 house | 220° | (−131.52, 39.76) | 40° | 2.443 | bought | |
| 2 house | 166° | (−108.78, 45.01) | 346° | −2.897 | bought | |
| 3 house | quarry road | (−90.50, 33.00) | 270° | −1.571 | bought | |
| 4 cottage | 310° | (−133.54, 4.51) | 130° | 0.873 | bought | |
| 5 cottage | quarry road | (−91.50, 42.20) | 270° | −1.571 | bought | |
| 6 house | quarry road | (−90.50, 51.50) | 270° | −1.571 | bought | |
| 7 cottage | camp road | (−99.10, −22.80) | 218.7° | −0.675 | bought | |
| 8 house | quarry road | (−108.30, 56.00) | 90° | 1.571 | bought | |

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

## Option 3: the Fan (streets radiating from the station)

A half-round forecourt of radius 13 m at the hall's front centre O (−92.98, 12.06). Dock Street (250°, 6 m) runs from
it to the top of the dock path; Museum Street (295°, 6 m) ends at the museum; today's camp and quarry paths are the
fan's outer edges. A 3 m crescent lane at radius 37.5 m joins Museum Street to Dock Street. The clock stands where
Dock Street meets the forecourt, (−105.2, 16.5).

| Building | Position | Faces | Yaw | When | Moves |
| --- | --- | --- | --- | --- | --- |
| Pip's house | (−115.95, 10.90) | 160° | 0.349 | arrival | 2.0 m |
| Gate cottage | (−138.37, 20.39) | 160° | 0.349 | arrival | 15.4 m (was (−139, 5)) |
| Museum | (−134.22, −7.17) | 115° | 1.134 | T3 | 9.3 m |
| Fine Prices | (−116.00, 31.00) | 50.6° | 2.259 | T3 | turns 12°; balcony to (−120.8, 37.1) |
| 1 house | (−123.85, 13.50) | 160° | 0.349 | bought | |
| 2 house | (−133.53, 36.61) | 340° | −2.793 | bought | |
| 3 house | (−90.50, 33.00) | 270° | −1.571 | bought | |
| 4 cottage | (−111.48, −5.06) | 205° | −0.436 | bought | |
| 5 house | (−119.00, −10.23) | 205° | −0.436 | bought | |
| 6 cottage | (−139.94, 10.01) | 92.5° | 1.527 | bought | |
| 7 house | (−90.50, 43.00) | 270° | −1.571 | bought | |
| 8 cottage | (−106.60, 57.00) | 90° | 1.571 | bought | |

- **Walks:** dock to the forecourt 113 m (20 s); dock to the hall's doorway 120 m (22 s); spawn to the forecourt 3 m;
  platform to the forecourt 33 m (6 s); east bay 55 m (10 s). Loop by Museum Street, the crescent and Dock Street
  89 m (16 s).
- **A rider** from the gate cottage: 54 m down Dock Street to the ticket window, 29 m to the platform, about 49 s.
- **Seen first:** from the dock path, the gate cottage, then the hall at the end of the street (42%); the forge is
  hidden. From the hall's front, 4 of 12 buildings are half or more in view.
- **Grows:** along the two streets and the crescent; wedge blocks widen with distance, so later plots fit, in odd
  shapes.
- **Weak:** the forecourt (265 m²) is the only place to gather and already holds the way in, the shelf, spawn and the
  greeter; Pip's house and plot 1 stand 0.9 m apart; ten of twelve doors are on a street.

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

## Recommendation

**Option 2, the Round.** It is the only one with a middle: a place for three players and a crowd to be, a loop, and one
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
`src/world`, `src/net` or `server/` until step 6. Written for option 2; the other options change the numbers, not the
steps.

- [ ] **0. The owner picks**, and the designer rules on the Level findings. Record the pick and the answers in the
  decision log.
- [ ] **1. The town as data, with its test.** Low risk. New `src/place/town-plan.ts` (no three.js): `TOWN_CENTRE`,
  the green and ring radii, `TOWN_SLOTS` (the tables above as `{ id, x, z, yaw, kit, when }`), `TOWN_PLOTS` (the eight,
  in staked order), `TOWN_STREETS`, and `slotPoint(bearing, depth)`. New `test/town-plan.test.ts`: every footprint
  1 m or more from every other, from the hall, forge, stalls, bay and both lines' rails; no footprint within a street's
  half width; every door within 3.5 m of a street edge; every pad within 56 m of `VILLAGE`; every `cottage` roof 11 m
  or more from the shop's roof and the balcony pad; the tree catalog's length and first and last rows unchanged.
  Verify: the test; `npm run check`.
- [ ] **2. Move what stands.** Normal review. `src/place/layout.ts`: `TOWN.start` becomes the one gate cottage;
  `ROOM_PLOTS` takes the three new rows; `PATHS[0]` and `PATHS[1]` start at the ring (bearing 40° and 130° on the
  ring road's centre) and `SHORE_PATH`'s last five points become the dock street to the ring. `tech-layout.ts`: the
  `yard` secret moves with the gate cottage (4.5 m behind its back wall) and the `balcony` pad and secret keep their
  place in the shop's frame. `folk.ts`: `WANDER` points onto the ring road and the green. `home-station.ts`:
  `FINDERS_B` beside the hall if question 3 is yes. `docs/game-design/place.md`. Verify: `npm run level-check`;
  step 1's test; one look from the top of the dock path and one from above at `--rail-seed q6-done`;
  `dev/look/evals/railway-finds.ts`; the bot's `forge-lit` segment (its Home waypoints cross the old square).
- [ ] **3. The green, the ring road and the streets.** Normal review; render. `src/entities/town/streets.ts` (new):
  the path mask for the ring and the dock street, one merged kerb and green mesh, no shadow of its own. Verify: a
  look from the hall's front; `npm run perf` on a quiet machine (one mesh, one material added).
- [ ] **4. The forge finishes when it is built, with a west door.** Normal review. `src/entities/railway/forge-finish.ts`:
  the show's trigger is the forge lit, not `works.crossing`; `src/entities/town/workshop.ts`: `WORKSHOP_DOOR` on the
  west wall; `works-late-game.md` step 6 and `place.md` updated. Verify: a look at `--rail-seed q1-done` (roof on,
  door open) and at `awake` (frame only); the Works bot from `works-arrive` no longer waits for a roof.
- [ ] **5. Stakes, boards and the clock.** Normal review. `src/entities/town/plots.ts` (new): four stakes, a string
  and a sign per staked plot from `TOWN_PLOTS`, one instanced mesh; the clock from `opening-plans.ts`'s `clock` kit at
  the centre when `trains` holds, raised by the town's site animation. Verify: looks at `awake` and `trains-on`.
- [ ] **6. Plots can be bought** (the passenger trade's step; High by path when Server kind). Reads `TOWN_PLOTS`; the
  build is the existing site animation (`place/sites.ts`) with a little-guy gang; a built plot is a room
  (`createRooms`) with a plain interior. Verify with that plan's checks, plus `npm run scenario` for two players
  seeing one plot built.
- [ ] **7. Interiors draw by the door.** Normal review. `rooms.ts`: `ROOM_CAM.drawWithin` measured from the door, with
  a smaller radius (about 18 m) unless you are inside. Verify: `npm run bench` at the `town` pose and at the clock,
  before and after; a look walking into Pip's house.

## Where it sits against the ECS migration

The owner's standing priority holds this pass with every other build-out. M3 (rules), M6 and M7 (the railway's and the
town's files moved to `src/entities/`) are on main. **Views resume after M8** (the read facade); steps 2 to 5 and 7
read the railway through today's `inspect()`, which M10 moves, so they start after M8 and rebase cheaply (each is a
few files). Step 1 is data and a test and can go first. Step 6 waits for the passenger trade's own gates. Two more
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

For the designer, with the plan (owner, 9 November).

1. **`npm run level-check -- --place=place` passes with each option applied** (layout A: 0 problems; production
   grounding 5,282 placements, 0 problems). With `BOOGLE_HOME=b` it reports the same three problems as main does
   without this plan (a rack foot 5.7 cm off the ground; two platform ramps into sleepers), which are the Home
   station plan's.
2. **The check cannot see most of this plan.** It floods terrain at 2 m; it does not model props, room and roof
   collision, streets, the green, stakes, or sightlines. The roof and view numbers here are from my scratch script.
3. **Suspected today, not proven: the balcony secret (glider) may be reachable with the second jump.** A cottage's
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

1. **Which layout?** Recommended: option 2, the Round.
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

Not edited by this job. When he answers:

- `docs/decisions-rail.md`, Decided and Current rules: "**2026-11-NN, Home's town is laid out as [the Round]** (owner,
  on the town layout page: '…'). A round green on the hall's centreline with a ring road; buildings stand on the ring
  30° apart facing the green; the hall, Pip's house and one cottage stand on arrival; Fine Prices and the museum rise
  with the first path; eight plots are bought. Plan: [town-layout](plans/town-layout.md)."
- If question 3 is yes, an italic note on the 10 November "the curio shelf and the finders' bay share one axis, for
  now" rules line: "_the bay's spot: beside the hall's south end, facing the square (town layout, 2026-11-NN)_".
- `docs/agent-calls.md`, rail table, one row per New and Default call above, for example: "| 2026-11-10 | New: on
  arrival Home's town is the hall, Pip's house and one gate cottage; three cottages and five houses are bought plots,
  two staked at a time, the first two from the start | [town-layout](plans/town-layout.md#calls) | planner (town
  layout) | Two households match the trade brief; DESIGN 7 | open |".

## What I could not confirm

- None of the options has been seen in the game; the stills are of today's town and `?home=b`.
- The roof hop (Level finding 3) and every draw and triangle figure for the new town.
- Whether the hall's roof and end walls give another way up beside the bay's new spot.
- The stills were taken on a busy machine (load 12 to 21); they are for layout, not for performance.
