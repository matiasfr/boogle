> **Status: proposed (2026-11-10).** Light brainstorm (one agent, three lenses: play designer, systems architect,
> creative director). Design only: nothing here changes code, map data or a `WORLD_NS`. The owner's seed is recorded
> in the [decision log](../decisions.md#decided) (10 November); everything specific below is this brief's proposal,
> not his pick.

# Junction stations (junction-stations)

The owner's seed, 10 November 2026, after glancing at the whole-network [rail map](../world/rail-map.html): "I like
the idea that big junctions are like real stations, instead of generic stations they are thought out, maybe have a
rotunda etc"

It has to fit the same day's rulings: every building can be walked into, "either be empty, have some character with
some amount of lines, or something odd or interesting to see"; the train upgrade screen lives at the Roundhouse and is
"accessible at select locations", with "a pass on the rotunda so they are appropriately scaled for the new engines as
well, and maybe others in the world if those are the upgrade points" ([engine-garage](engine-garage.md)); trains may
overhang platforms with the passenger cars aligned, and sources get cargo loaders; a track that ends has buffers and
"we should plan our station intentionally" ([rail-map](../plans/rail-map.md)); yards at halts
([station-deposit](station-deposit.md)); Ring Island's land "more detailed and organic ... especially if people live
there"; Home is layout B, one coherent terminus ([home-station](../plans/home-station.md)).

**Read:** the rail map plan, its design review and the map's halts table; [world-blockout](../plans/world-blockout.md)
(areas, lines, telegraphing, the branch choice, rulings 1–11); DESIGN.md; direction.md; the decision index's 9–10
November entries; [ring-island](ring-island.md) and [build 1](../plans/ring-island-build1.md) R2; engine-garage (where
it lives, the scale audit, the keep-clear, answers); station-deposit's calls; home-station (hall as a space, art
budgets); `src/entities/railway/halts-view.ts` (`makeHalt`: deck lengths, the yellow edge, a shelter and bench or the
island canopy, the signal mast and lever, the map display) and `roundhouse-view.ts`. `npm run inflight`: one ship
branch touches `docs/agent-calls.md` and `generic-lines.md`, nothing this brief edits. Game-direction fit: design work
the [direction](../direction.md) "Next" row (Ring Island) needs before R2 draws the island halt; it orders nothing ahead
of v26 or v27.

## Pitch

Today every stop is the same halt: a stone deck, a shelter or canopy, a bench, a signal with its lever and the island
map display. That stays, cheaply, for the places a line merely passes. But where lines meet, the station is
**designed for its place**: a plan drawn on purpose (terminus, through, two levels, bay platforms), one walk-in station
building with something in it, the place's own works (a Roundhouse, a lift, a crane, a stair tower), a silhouette you
can name from the train window, and one joke. Seven junction stations in the whole map, met roughly one per area.
Serves **11, Show, don't tell** (the station explains the place: Ring Island's leans, the Gorge's sits in a canyon
under a bridge) and **7, Telegraph everything** (the station's silhouette is what you see coming). It bends nothing; its
cost is one walk-in building per junction, which the kit keeps affordable.

## Gut question

Stepping off at a junction, with its name board covered, would you know where you are, and where your next train goes
from?

## Best suggestions, ranked

1. **Three tiers, and a halt never gets a building** (systems, design). The generic halt stays exactly what it is; a
   place earns a station house only when people live there or the line ends at the edge of the world; it earns a
   junction station only when two lines, or a line and a lift, meet. Why: the walk-in rule makes every building an
   interior, so the tiering is what keeps the 19 halts cheap and the seven junctions special.
2. **Ring Island's halt is the first one, designed in full** (design, creative). v27 builds it anyway, its religion
   hands it a voice (everything leans, eyes up), and its greybox already exists. Why: the proof lands where the next
   build is going, with no new area.
3. **Engine rotundas at two places only: Home's Roundhouse and a second at Port Quay** (design, systems). Home grows
   from 9.6 m to about 16 m as an upgrade; Port Quay's is built at 16 m. Every other junction gets no turntable: trains
   are push-pull and never turned, so a table elsewhere would be scenery. Why: "accessible at select locations" means a
   few, and Port Quay is the far side of an 8.7 km ring, where High Port's faster engine comes from.
4. **The change of train is a walk you can see** (creative, design). Each line keeps its colour (the displays already
   draw line 1 gold, line 2 teal); a junction platform's edge stripe wears its line's colour; the route between
   platforms (crossing, stair, concourse) leads to a fingerpost at the other platform's lever end. And no first trip
   to a new place ever needs a change. Why: the review's Bell Rock change came from a service drawn as two lines; one
   rule prevents it everywhere.
5. **A shared station kit, a bespoke front** (systems, creative). Platform, canopy, signage, buffers and end board,
   loaders, yard, stair, fingerpost and one walk-in house shell are kit; the silhouette, the works and what's inside are
   the place's. Why: one PR builds the kit, and each junction is then a greybox and a view, not a new system.

**Tensions.** The engine-garage brief said the screen "lives in one place only" because it bends 11; a second screen at
Port Quay bends it in two places (I recommend it: Port Quay is several minutes' ride from Home either way round the
8.7 km ring; it is question 1). The decided "real trains take a fit at their next Home stop" leaves out lines that never stand at Home
(question 2). "Rotunda" may mean the engine house (his word in the garage notes) or a round station hall; I read both
(question 3).

## 1. Tiers

| Tier | What makes a place one | What it always has |
| --- | --- | --- |
| **Halt** | One line passes, or a single source ends it; one reason to stop | Today's halt: a platform per track (stone lengths, bright edge), a shelter and bench (or a canopy), the signal and request lever per platform, the island map display, a plank crossing if two platforms; buffers and an end board if it ends; a loader if it is a source; a yard ([station-deposit](station-deposit.md)). **No building** |
| **Station** | One line, but people live there or the line ends at the edge of the world | A halt, plus one kit **station house** (walk-in, one of the three contents), a name board and a fingerpost |
| **Junction station** | Two or more lines meet (walk-between), or a line meets a lift | A station, plus a plan drawn for the place, a **bespoke station building** whose concourse is the way between platforms, **one works**, line-coloured platform edges and fingerposts, a silhouette from the approach, and a fitters' hut where a line has its depot end |

**Halts** (through or terminal): Camp (line 1's terminus), Quarry, Far Head, Pier (homeward only), the Meet's halt,
Saltpan. **Stations:** Lantern Notch (the arch) and the Original Island (the ending; its station is the ending's own
brief). **Junction stations: seven.** Met in this order, by the rail map's stages:

| # | High Gorge first | Canopy Town first |
| --- | --- | --- |
| 1 | **Home** (minute one) | Home |
| 2 | **Ring Island** (v27, about 1.2 h) | Ring Island |
| 3 | **High Gorge** (stage 3, 1.8–3.0 h) | **Bell Rock** and **Canopy Town** (stage 3, one line) |
| 4 | **West landing** and **Bell Rock** (stage 4, the bay shortcut, 3.0–3.5 h) | West landing (stage 4) |
| 5 | **Canopy Town** (stage 5, 3.5–4.2 h) | High Gorge (stage 5) |
| 6 | **Port Quay** (stage 6, the cave line, 4.2–5.0 h) | Port Quay (stage 6) |

High Port is not a rail halt (the rulings): it is the top of Port Quay's crane. Home and West landing are 100–130 m
apart through the village (ruling 6); they are two stations with two fronts on one hub, and the map draws the walk.

## 2. The seven, station by station

New lines below are drafts for the owner; none are The Boogler's, and his copy is untouched.

**Home (the Village terminus, layout B).** Already designed: two roads to buffers beside one island platform, the
concourse hall 1 m behind the buffers, the forge as the goods side, the 9.6 m table on its own engine spur with one open
stall and two ruin outlines ([home-station](../plans/home-station.md)). Buildings: the hall (open front; inside, Sleeves
by the doorway, the gifts shelf, the works board in the quiet south bay, the line map overhead) and the Roundhouse's open
stall (the works copy on the table: the garage). Works: the Roundhouse, growing to about 16 m as an upgrade. Only here:
the train upgrade screen, the works board, the hall's line map that grows into the logistics readout (engine-garage
answer 4). Silhouette from an inbound train: the island canopy running away between two tracks, the forge chimney, the
Needle Bell behind. This brief adds only the end boards (step 9), the line colours on the island's two edges, and the
joke: **a towel on each ruin outline**, with a little guy beside each ("Reserved." / "For the big one."), which
telegraphs that the Roundhouse grows.

**Ring Island halt (the first proof; section 6).** Terminus while it is the end: both tracks 15 m past the 40 m
platforms to buffers and an end board at u 483 facing the way the line will go on, a crossover on the Way, trains at
the east (works) platform, the west lever chained and plaqued with the branch (rail-map call 14). Later the ring runs
through; Canopy first, a bay platform with buffers on the west side starts the Island to Canopy line. Building: **the
station house leans** ("Only the Shard may be perfect"), standing at the halt's south end by the plank crossing, its
concourse the way from the east platform to the west and, later, the bay. Inside, **the Lookers' waiting room**: one
bench facing up at a skylight framed on the shard, a looker on shift lying on it ("Shh. I'm on." / "Sit if you like.
Eyes up, though."). Works: the Ringworks yard (build 2's steel works and drop hammer, the prophecy mural on its wall,
the steel under its tarp, the loader on the east side). No rotunda: the steel is cast here and the longer boiler rides
home on a flat car to be installed at Home (ring-island build 2), which is the one time a part visibly travels the line.
Only here: the branch choice read (the map display draws both branches, the fingerpost), the path up to the shard.
Silhouette: the shard over the cone, the leaning roof, the orange Way. Joke: the platform edge is painted **LOOK UP**
where any other railway would say mind the gap.

**High Gorge (the split).** At 3 m in the 90 m split: the ring's two through platforms and the north–south line's bay
platform, buffers against the falls-cave rock, the stair beside them; the town's bridge 82 m overhead. Building:
**the winding house** at the foot of the lift, walk-in, with the copper winch drum and the winder ("Up's one bell. Down's
two. Three means lunch."). Works: the lift (a copper cage, the Gorge's first copper, ruling 5) and the switchback stair.
Only here: the ride up the split, and the north–south line's depot end with a fitters' hut by its buffers (question 2).
Silhouette: the split end-on, the bridge across its top, the lift's cable a single vertical line. Joke: **a bench every
20 m up the 165 m stair**, each with a more exhausted little guy, each saying "Halfway."

**Bell Rock (two levels).** The bay line through on the skerry at 15 m; the north–south line at the water, a terminal
with buffers facing the sunken causeway until stage 8, then through (rail-map call 19). Canopy first, the Island to
Canopy line runs through on top and the bay shortcut ends there in a bay. Building: **a round stair tower** (the one
round hall in the brief, question 3) joining the two levels, its landings opening straight onto each level's lever end.
Inside: the stair winds round the tower's well, where the bell of Bell Rock hangs; it is **tiny**, a hand bell in a
very tall tower, and anyone passing can ring it. Works: the crystal-seed terraces round the pinnacle (picked by hand,
so no loader). Only here: changing levels between the two lines; the seeds. Silhouette: the pinnacle with the tower at
its foot; from the bay line, the causeway pointing at the Original Island. Joke: the bell, and its keeper ("It's the
bell." / "Of Bell Rock." / "You expected bigger.").

**Canopy Town.** The ring through and the bay line's loop terminus side by side (through to the Notch at stage 8); the
alignment still has to be drawn (the drafts kink 102–132° here). Building: **the station house is built round a living
trunk**; the trunk has a little door, and someone lives in it ("You're in my hall. It's also my tree."). Works: the
cloth loft, a long open rope walk where glider cloth and slings are made, with the fibre loader. Only here: fibre, and
the way out to the Notch ledge glide. Silhouette: the mother trees over the White Wall, the station roof under their
crowns. Joke: the only platform canopy in the game that is **an actual canopy**, and a little guy who sweeps the leaves
off every train's roof while it stands.

**West landing.** Two terminals side by side, the ring's Home end and the bay line's start, buffers at both against the
shore wall; spawn's shore; the trodden path and boards to the Village (ruling 6). Building: **a boathouse station
house** on the shore, facing the sea cave's cracked plug 65 m off. Inside: a little guy with an ear trumpet pressed to
the window toward the plug ("Still in there." / "Something knocked. Might've been me."), which keeps the day-one lock in
mind until the powered pick. Works: none of its own (the Roundhouse is a two-minute walk); a yard. Only here: the bay
shortcut and, from 4.2 h, the cave. Silhouette: the sandstone face with the plug. Joke: the ear trumpet.

**Port Quay.** A through halt on the 3 m harbour apron, buffers at the quay with the crane behind them for stages 6–7,
then through into the White Wall line. Buildings: **the harbourmaster's office** (inside, a harbourmaster who stamps
your hand on every visit: "Anything to declare? No? Stamp.") and **the Quay Roundhouse**, the second engine house,
where High Port's faster engine is installed. Works: the 75 m crane (whether it lifts a whole car is the Port's brief)
and the Roundhouse. Only here: the crane to High Port and the second upgrade screen (question 1). Silhouette: the crane
lit at the top, seen from Home since minute one; the Roundhouse's fan of stalls at its foot. Joke: the stamp.

## 3. Rotundas

| Place | Turntable | Why |
| --- | --- | --- |
| **Home** | 9.6 m now, growing to about 16 m as an upgrade (engine-garage answer 3); the keep-clear sector 130°–250° to r 26 m south of layout B's table (rail-map) | The garage, the works copy, the first engine's home |
| **Port Quay** | Built at about 16 m from the start (it opens at stage 6, after the end-game engines are planned); keep r 30 m clear on the apron when its brief places it | High Port's faster engine is the upgrade point there; half-way round the ring |
| Ring Island | None | A source, not a fit point (build 2 installs the boiler at Home); the cone rises 21% beside the halt and the land is to be organic; no train turns there |
| High Gorge | None; a fitters' hut on the bay road | The 90 m split may not hold its own curve and two stations; the north–south line's depot end |
| Bell Rock | None | A 240 × 190 m skerry on two levels; its round building is the stair tower |
| Canopy Town | None | Its loop turns trains already; a rope walk is its works |
| West landing | None | Two minutes' walk from Home's Roundhouse |

The upgrade screen opens only at a Roundhouse table (never in Pause or on a key). Both screens show every line, since
purchases are per line and communal and the works copy wears the chosen line's fits. Each table carries its own works
copy. Fits still land on the real trains at a stop, by the little guys, at the buffers.

## 4. Kit and bespoke

**Kit** (one module, shared; today's `makeHalt` parts reused): platform deck, edge stripe (yellow at halts, the line's
colour at junctions), canopy, shelter and bench, signal and lever, island map display, buffers and end board, the
fingerpost, the plank crossing, a stair and ramp kit (no steeper than 30°, 1.6 m wide, as Ring Island ruling 2), the
loader gantry, the yard bay, a fitters' hut, and **one station house shell** in three sizes with an interior slot.
**Bespoke per place:** the building's front and roof (the silhouette), the works, the interior's one thing, the joke.

**Budget, rough, mounted within about 500 m as Ring Island's near view is:**

| Tier | Draws | Triangles | Build (agent work) |
| --- | --- | --- | --- |
| Halt | about 6 (merged per colour, as today) | about 3k | kit only |
| Station | about 10 | about 8k | kit; one interior |
| Junction station | about 25 with its works | about 30k: the building up to 12k in one draw (the Home hall's budget), the works up to 8k, an interior a few draws | a greybox, then a view; the art pass after a yes |

**Never a sealed box:** the house shell's doorway has no closed leaf, is at least 1.6 m wide and 2.6 m clear, lit
inside so the room reads from outside; its floor is reachable from the platform without a jump; and each house
declares its content (`empty`, `character` or `odd`) in its data, so a check fails a building with no content and an
empty one must still be furnished as a room (a bench, a window). Sheds and machines too small to stand in are not
buildings (the orchestrator's reading of the walk-in rule).

## 5. Reading a junction, and changing trains

- **On the rail map** a junction station is a station symbol drawn over its platforms with its name, distinct from a
  halt's tick and a terminal's buffers; the halts table gets a Tier column.
- **On the halt boards** (the island map display) a junction is a larger mark where the lines' colours meet; at a
  junction the display marks the other line's platform and the way to it.
- **Changing trains:** each platform's lever plaque names the next big place that way (call 28); the route between
  platforms is the station building's concourse, a plank crossing or a stair, and it ends at a fingerpost at the other
  platform's lever end, painted in that line's colour. Bell Rock's tower lands on each level at the connecting
  platform's lever.
- **No first trip needs a change** (question 4). The review's forced change at Bell Rock (Canopy first) is already
  fixed by running Ring Island → Bell Rock → Canopy as one line; the rule keeps it so for every later service. Changes
  are for shortcuts and returns only: Gorge first, riding the north–south line to Canopy means changing at Bell Rock,
  up the tower, after you have already been to Canopy by the bay line.

## 6. The first proof: Ring Island's halt

Design it fully first, because v27 builds the halt (R2 draws its platforms, the RINGWORKS board, the fingerpost, the map
table) and `?ring=greybox` can show it now with no sim. Home under layout B is already designed; its proof is the flip.

**The greybox shows** (in `src/proto/greybox/ring.ts`, static colliders only): the halt ending in buffers and an end
board at u 483 with the crossover on the Way (as recommended; the loop drawn only if the owner keeps it); the leaning
station house at the south end, walk-in, with the Lookers' waiting room and its skylight framed on the shard; the
concourse as the way from the east platform to the west; the reserved bay site on the west side (Canopy first); the
line-colour edges and LOOK UP painted on them; the fingerpost at the west platform's lever end; the loader and the
steel works' footprint on the east side; the path out of the station to the town and the summit.

## Shape

- **Sync kind:** all **Local** view, static geometry and colliders. Residents use the existing per-player talk memory
  (Local). Fits landing at a depot end is the only piece that touches shared state, later, as the existing fit does.
- **Reuses:** `makeHalt`'s parts (`halts-view.ts`), `request-lever.ts`, `island-boards.ts` and `halt-map.ts`
  (`LINE_MARK` already colours lines), `home-pictogram.ts`'s `roadPlaque`, the greybox's builders, Ring Island's R2
  mount and unmount by distance, the level-check walk-in and continuity reports.
- **Smallest first build:** the Ring Island greybox above, then the kit module beside `halts-view.ts` rather than inside
  it (627 lines already), then R2 draws the halt from the kit.
- **Risks:** interiors multiply draws (keep to the budget, mount by distance); a hotspot file (`halts-view.ts`); a
  second upgrade screen reads as a shop (it is a framed real place, as at Home); Canopy's alignment and the Gorge's
  split are undrawn, so their plans are provisional until their stills.

## Done means

Captured with `look` on `?ring=greybox` (`npm run look -- --query ring=greybox ...`; the builder sets the cameras from
the halt at about (1414, −820)):

1. **The approach:** from an inbound train position on the Way about 150 m out, the leaning roof, the end board and the
   shard read in one frame.
2. **The platform:** from the east platform's stop mark, LOOK UP on the edge, the buffers and board ahead, the station
   house's open door in view.
3. **Inside:** from the waiting room's doorway, the bench and the shard in the skylight; walk in and out without a jump.
4. **The change:** a walk from the east platform's lever through the concourse to the west platform's fingerpost,
   timed (under 15 s), with the fingerpost and its line colour visible from the start.
5. **Measured:** the junction's mounted draws and triangles against the budget above.

## Open questions

1. **Where can the train upgrade screen be opened?** Recommended: at two Roundhouses only, Home's and a second at Port
   Quay (stage 6), each showing every line; nowhere else.
   Answer: ___
2. **Lines that never stand at Home (the north–south line; Canopy first, the Island to Canopy line): where do their
   trains take a fit?** Recommended: at the line's depot end, a fitters' hut by its buffers (High Gorge's bay; Ring
   Island's west bay), so "the next Home stop" reads "the next stop at its line's depot".
   Answer: ___
3. **"Rotunda": the engine house, or a round station hall too?** Recommended: both. Two engine rotundas (Home, Port
   Quay), and Bell Rock's stair tower as the one round hall.
   Answer: ___
4. **Should a first trip to a new place ever need a change of train?** Recommended: never; changes are for shortcuts
   and returns.
   Answer: ___
5. **Which station is designed fully first?** Recommended: Ring Island's halt, greyboxed now in `?ring=greybox`, so
   v27's R2 draws it from the design.
   Answer: ___

## Parked

- A signal box with a little guy pulling levers at the busiest junction (Bell Rock or Canopy), after a yes.
- A clock on each station house showing when the next train each way comes.
- Station names: drafts per place for the owner (Ringworks is R2's board).
- A map room at Port Quay as well as Home's hall.
- The Original Island's station, as part of the ending's brief.
- A footbridge kit, if a junction ever needs one over its tracks.
- Bunting, lamps and per-place sound at each junction, after a yes.
