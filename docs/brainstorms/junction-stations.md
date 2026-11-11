> **Status: answered (2026-11-10).** The owner took the design review's five recommended answers
> ([answers](#owner-questions-answered-10-november)); the body below was corrected to agree with the
> [design review](#design-review-designer-2026-11-10) first. Not built. Light brainstorm (one agent, three lenses:
> play designer, systems architect, creative director). Design only: nothing here changes code, map data or a
> `WORLD_NS`. The owner's seed and his answers are in the [decision log](../decisions.md#decided) (10 November);
> everything else specific below is this brief's proposal, not his pick.

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
can name from the train window, and one joke. Six junction stations in the whole map, met roughly one per area.
Serves **11, Show, don't tell** (the station explains the place: Ring Island's leans, the Gorge's sits in a canyon
under a bridge) and **7, Telegraph everything** (the station's silhouette is what you see coming). It bends nothing; its
cost is one walk-in building per junction, which the kit keeps affordable.

## Gut question

Stepping off at a junction, with its name board covered, would you know where you are, and where your next train goes
from?

## Best suggestions, ranked

1. **Three tiers, and a halt never gets a building** (systems, design). The generic halt stays exactly what it is; a
   place earns a station house when people live there, the line ends at the edge of the world, or it is a bigger
   station's second front; it earns a junction station by what it is (a place you change at, choose at, or that a town
   is built round), not by a count of lines. Why: the walk-in rule makes every building an interior, so the tiering is
   what keeps the six halts cheap and the six junction stations special.
2. **Ring Island's halt is the first one, designed in full** (design, creative). v27 builds it anyway, its religion
   hands it a voice (everything leans, eyes up), and its greybox already exists. Why: the proof lands where the next
   build is going, with no new area.
3. **Engine rotundas at two places only: Home's Roundhouse and a second at Port Quay** (design, systems). Home grows
   from 9.6 m to about 16 m as an upgrade; Port Quay's is built at 16 m. Every other junction gets no turntable: trains
   are push-pull and never turned, so a table elsewhere would be scenery. A line whose depot is elsewhere gets a
   one-road open engine shed there, with no table and no screen. Why: "accessible at select locations" means a few;
   Port Quay is where High Port's faster engine is built, and its Roundhouse can be end-game size from the start.
4. **The change of train is a walk you can see** (creative, design). Each line keeps its colour (the displays already
   draw line 1 gold, line 2 teal); a junction platform's edge stripe wears its line's colour; the route between
   platforms (crossing, stair, concourse) leads to a fingerpost at the other platform's lever end. And from the
   junction a line was built out of, its new stop is one train away. Why: the review's Bell Rock change came from a service drawn as two lines; one
   rule prevents it everywhere.
5. **A shared station kit, a bespoke front** (systems, creative). Platform, canopy, signage, buffers and end board,
   loaders, yard, stair, fingerpost and one walk-in house shell are kit; the silhouette, the works and what's inside are
   the place's. Why: one PR builds the kit, and each junction is then a greybox and a view, not a new system.

**Tensions.** The engine-garage brief said the screen "lives in one place only" because it bends 11; that line is the
brief's and its review's, not the owner's, whose seed says "select locations" and "others in the world". A second
screen at Port Quay bends 11 in two places. It is recommended, and not for distance: the cave line reaches Port Quay
from West landing in under 1.7 km, about two minutes. The reasons are that High Port's faster engine is built there
and that its Roundhouse can be 16 m from the start. Both Roundhouses then serve the same end-game engines: Port Quay's
is where the big engine first stands, and growing Home's is what brings it home (question 1). The decided "real trains
take a fit at their next Home stop" leaves out lines that never stand at Home (question 2). "Rotunda" in the owner's
notes is the engine house; a round station hall is this brief's extra reading (question 1).

## 1. Tiers

| Tier | What makes a place one | What it always has |
| --- | --- | --- |
| **Halt** | One line passes, or a single source ends it; one reason to stop | Today's halt: a platform per track (stone lengths, bright edge), a shelter and bench (or a canopy), the signal and request lever per platform, the island map display, a plank crossing if two platforms; buffers and an end board if it ends; a loader if it is a source; a yard ([station-deposit](station-deposit.md)). **No building** |
| **Station** | People live there, the line ends at the edge of the world, or it is a bigger station's second front | A halt, plus one kit **station house** (walk-in, one of the three contents), a name board and a fingerpost |
| **Junction station** | A place you change at (two lines, or a line and a lift), choose at, or that a town is built round | A station, plus a plan drawn for the place, a **bespoke station building** on the way between platforms, **one works**, line-coloured platform edges and fingerposts, a landmark that shows from the approach, and a one-road open engine shed where a line has its depot end |

**Halts** (through or terminal): Camp (line 1's terminus), Quarry, Far Head, Pier (homeward only), the Meet's halt,
Saltpan: six. **Stations:** West landing (Home's second front), Lantern Notch (the arch) and the Original Island (the
ending; its station is the ending's own brief): three. **Junction stations: six**, one new one per area from area 3 to
area 7, each built with its area and never ahead of it. Fifteen places in all. Met in this order, by the rail map's
stages:

| # | High Gorge first | Canopy Town first |
| --- | --- | --- |
| 1 | **Home** (minute one) | Home |
| 2 | **Ring Island** (v27, about 1.2 h) | Ring Island |
| 3 | **High Gorge** (stage 3, 1.8–3.0 h) | **Bell Rock** and **Canopy Town** (stage 3, one line) |
| 4 | **Bell Rock** (stage 4, the bay shortcut from West landing, 3.0–3.5 h) | The bay shortcut from West landing (stage 4); no new junction |
| 5 | **Canopy Town** (stage 5, 3.5–4.2 h) | High Gorge (stage 5) |
| 6 | **Port Quay** (stage 6, the cave line, 4.2–5.0 h) | Port Quay (stage 6) |

High Port is not a rail halt (the rulings): it is the top of Port Quay's crane. Home and West landing are 100–130 m
apart through the village (ruling 6), 18–23 s on foot; the owner asked for one unified Home (9 November), so West
landing is Home's second front at the Station tier, not a seventh junction, and the map draws the walk. Ring Island is
a junction station in both branch orders: Gorge first, only the ring passes through it and nobody changes trains
there, but it has the town, the works and the branch choice. The hours are the model's allowances, not measurements.

**The express and the interchange** (owner, 10 November: "It would be cool if from the larger stations, you could
call a train and board it to go to any station accessible on the network..." and "maybe an interchange is an upgrade
that allows you to go from any line to another by having crossovers at junctions?"). Both are designed in their own
brief, [express-train](express-train.md), not here. What this brief takes from them: a junction station is where the
express is called and where an interchange upgrade would be laid, so each station's plan below reserves room for an
express bay platform and for crossovers between its lines.

## 2. The six, and Home's second front, station by station

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
through; Canopy first, a bay platform with buffers on the west side starts the Island to Canopy line (that site is
open water today and needs fill). Building: **the station house leans** ("Only the Shard may be perfect"), by 12° or
more, with a light roof against the slate hill. It stands at the halt's **north-west corner**, at the foot of the west
platform's ramp (about u 464–476, 10–20 m west of the west track): the only land that touches the halt, which is a
fill in the sea, and the start of the path to the town. The way between platforms is round the north end, behind the
buffers while the line ends there and a plank crossing once it runs on, so the house bridges no track. Passengers go
north, under the shard; goods, the loader and the steel stay at the seaward end, where trains arrive. Inside, **the
Lookers' waiting room**: one bench facing a tall tilted window in the north-north-west wall, framed on the shard (it
is about 23° above the horizon from here, so a window, not a roof light; the house's lean is what points it there), a
looker on shift lying on the bench ("Shh. I'm on." / "Sit if you like. Eyes up, though."). If the bench can be sat on,
sitting tilts the view to the shard. Works: the Ringworks yard (build 2's steel works and drop hammer, the prophecy mural on its wall,
the steel under its tarp, the loader on the east side). No rotunda: the steel is cast here and the longer boiler rides
home on a flat car to be installed at Home (ring-island build 2), which is the one time a part visibly travels the line.
Only here: the branch choice read (the map display draws both branches, the fingerpost), the path up to the shard.
Silhouette: the shard over the cone, the leaning roof, the orange Way. Joke: the platform edge is painted **LOOK UP**
where any other railway would say mind the gap.

**High Gorge (the split).** At 3 m in the 90 m split: the ring's two through platforms and the north–south line's bay
platform, buffers against the falls-cave rock, the stair beside them; the town's bridge 82 m overhead. Building:
**the winding house** at the foot of the lift, walk-in, with the copper winch drum and the winder ("Up's one bell. Down's
two. Three means lunch."). Works: the lift (a copper cage, the Gorge's first copper, ruling 5) and the switchback stair.
The lift runs for one player alone, and the stair is always there.
Only here: the ride up the split, and the north–south line's depot end with a one-road open engine shed by its buffers
(question 2). Landmark from a train: the split end-on, the bridge across its top, a headframe wheel on the cliff edge
beside the bridge, and the copper cage moving up the face (the cable alone would not show). Whether the platforms sit
in shade all day at the bottom of the split is for a still. Joke: **a bench every
20 m up the 165 m stair**, each with a more exhausted little guy, each saying "Halfway."

**Bell Rock (two levels).** The bay line through on the skerry at 15 m; the north–south line at the water, a terminal
with buffers facing the sunken causeway until stage 8, then through (rail-map call 19). Canopy first, the Island to
Canopy line runs through on top and the bay shortcut ends there in a bay. Building: **a round stair tower** (the one
round hall in the brief, question 1; about 12 m across, since a 12 m rise at 30° is one turn of ramp at 4 m radius)
joining the two levels, its landings opening straight onto each level's lever end.
Inside: the stair winds round the tower's well, where the bell of Bell Rock hangs; it is **tiny**, a hand bell in a
very tall tower, and anyone passing can ring it. Works: the crystal-seed terraces round the pinnacle (picked by hand,
so no loader). Only here: changing levels between the two lines; the seeds. Silhouette: the pinnacle with the tower at
its foot; from the bay line, the causeway pointing at the Original Island. The one planned change on a first ride is
here: the last leg to the Original Island, down the tower past the bell. Joke: the bell, and its keeper ("It's the
bell." / "Of Bell Rock." / "You expected bigger.").

**Canopy Town.** The ring through and the bay line's loop terminus side by side (through to the Notch at stage 8); the
alignment still has to be drawn (the drafts kink 102–132° here). Building: **the station house is built round a living
trunk**; the trunk has a little door, and someone lives in it ("You're in my hall. It's also my tree."). Works: the
cloth loft, a long open rope walk where glider cloth and slings are made, with the fibre loader. Only here: fibre, and
the way out to the Notch ledge glide. Landmark from a train: the mother trees over the White Wall are the area's; the
station's own is the trunk coming up through its roof with a lit door high on it, under a gap in the crowns over the
platforms (a roof under the crowns alone would be hidden). Joke: the only platform canopy in the game that is **an actual canopy**, and a little guy who sweeps the leaves
off every train's roof while it stands.

**West landing (Home's second front; Station tier).** Two terminals side by side, the ring's Home end and the bay line's start, buffers at both against the
shore wall; spawn's shore; the trodden path and boards to the Village (ruling 6). Building: the kit station house as
**a boathouse** on the shore, with no bespoke concourse, facing the sea cave's cracked plug 65 m off. Inside: a little guy with an ear trumpet pressed to
the window toward the plug ("Still in there." / "Something knocked. Might've been me."), which keeps the day-one lock in
mind until the powered pick; he needs a second line for after the cave opens. Works: none of its own (the Roundhouse is a two-minute walk); a yard. Only here: the bay
shortcut and, from 4.2 h, the cave. Silhouette: the sandstone face with the plug. Joke: the ear trumpet.

**Port Quay.** A through halt on the 3 m harbour apron, buffers at the quay with the crane behind them for stages 6–7,
then through into the White Wall line. Buildings: **the harbourmaster's office** (inside, a harbourmaster who stamps
your hand once a session: "Anything to declare? No? Stamp.") and **the Quay Roundhouse**, the second engine house,
where High Port's faster engine is built and first installed. It is reached from West landing by the cave line in
under 1.7 km, about two minutes. Works: the 75 m crane (whether it lifts a whole car is the Port's brief)
and the Roundhouse. Only here: the crane to High Port and the second upgrade screen (question 1). Silhouette: the crane
lit at the top, seen from Home since minute one; the Roundhouse's fan of stalls at its foot. Joke: the stamp.

## 3. Rotundas

| Place | Turntable | Why |
| --- | --- | --- |
| **Home** | 9.6 m now, growing to about 16 m as an upgrade (engine-garage answer 3); the keep-clear sector 130°–250° to r 26 m south of layout B's table (rail-map) | The garage, the works copy, the first engine's home |
| **Port Quay** | Built at about 16 m from the start (it opens at stage 6, after the end-game engines are planned); keep r 30 m clear on the apron when its brief places it | High Port's faster engine is built there, at end-game scale; about two minutes from West landing by the cave line, so the reason is the engine, not the distance |
| Ring Island | None; Canopy first, a one-road open engine shed on the west bay | A source, not a fit point (build 2 installs the boiler at Home); the cone rises 21% beside the halt and the land is to be organic; no train turns there |
| High Gorge | None; a one-road open engine shed on the bay road | The 90 m split may not hold its own curve and two stations; the north–south line's depot end |
| Bell Rock | None | A 240 × 190 m skerry on two levels; its round building is the stair tower |
| Canopy Town | None | Its loop turns trains already; a rope walk is its works |
| West landing | None | Home's second front; a short walk from Home's Roundhouse |

The upgrade screen opens only at a Roundhouse table (never in Pause or on a key). Both screens show every line, since
purchases are per line and communal and the works copy wears the chosen line's fits. Each table carries its own works
copy. Fits still land on the real trains at a stop, by the little guys, at the buffers.

**The engine shed** (in place of a fitters' hut, which would be either a building needing a room or a prop): one road
under the Roundhouse's stall frame, open at the front as Home's stall is, with no door, no table and no screen. The
line's train stands in it for an install and is the thing to see there. It stands at the depot end of a line that
never reaches Home: High Gorge's bay road, and Ring Island's west bay if Canopy is first. You still buy at a
Roundhouse.

## 4. Kit and bespoke

**Kit** (one module, shared; today's `makeHalt` parts reused): platform deck, edge stripe (yellow at halts, the line's
colour at junctions), canopy, shelter and bench, signal and lever, island map display, buffers and end board, the
fingerpost, the plank crossing, a stair and ramp kit (no steeper than 30°, 1.6 m wide, as Ring Island ruling 2), the
loader gantry, the yard bay, the one-road engine shed, and **one station house shell** in three sizes with an interior
slot. **Bespoke per place:** the building's front and roof (the silhouette), the works, the interior's one thing, the
joke. The kit is extracted in two steps: first only what Ring Island uses (one shell size, buffers and end board, the
fingerpost, the edge colour), the rest when a second place asks for it.

**Budget, rough, mounted within about 500 m as Ring Island's near view is:**

| Tier | Draws | Triangles | Build (agent work) |
| --- | --- | --- | --- |
| Halt | about 6 (merged per colour, as today) | about 3k | kit only |
| Station | about 10 | about 8k | kit; one interior |
| Junction station | about 25 with its works | about 30k: the building up to 12k in one draw (the Home hall's budget), the works up to 8k, an interior a few draws | a greybox, then a view; the art pass after a yes |
| Port Quay | its own row, set by its brief (two buildings and a 75 m crane) | | a Roundhouse is counted apart, as Home's is |

**Never a sealed box:** the house shell's doorway has no closed leaf, is at least 1.6 m wide and 2.6 m clear, lit
inside so the room reads from outside; the room is at least about 5 × 5 m with 3.5 m clear, or its roof cuts away,
so the third-person camera fits; its floor is reachable from the platform without a jump; and each house
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
- **From the junction a line was built out of, its new stop is one train away; a change is only ever a shortcut, a
  return or the last leg to the ending** (question 4). The review's forced change at Bell Rock (Canopy first) is
  already fixed by running Ring Island → Bell Rock → Canopy as one line; the rule keeps it so for every later service.
  Gorge first, riding the north–south line to Canopy means changing at Bell Rock, up the tower, after you have already
  been to Canopy by the bay line. The named exception: from Home, the first ride to the Original Island is the bay line
  to Bell Rock, then down the tower to the north–south line. A friend who joins late at Home may change trains to reach
  the frontier; the halt boards cover that.

## 6. The first proof: Ring Island's halt

Design it fully first, because v27 builds the halt (R2 draws its platforms, the RINGWORKS board, the fingerpost, the map
table) and `?ring=greybox` can show it now with no sim. Home under layout B is already designed; its proof is the flip.

The greybox (`src/proto/greybox/ring.ts`, static colliders only) is built in three steps, because two answers are
open: buffers or a loop at the island ([rail-map](../plans/rail-map.md#owner-questions), question 2) and the island's
landform ([terrain-pass](../plans/terrain-pass.md)).

- **Now** (depends on neither): the leaning station house at the north-west corner, inside the landform proposal's
  25 m keep band, walk-in, with the Lookers' waiting room, its bench and the tilted window framed on the shard; the
  camera inside; the line-colour edges and LOOK UP painted on them; the fingerpost moved to the platforms' north end;
  the walk between the platforms round the north end; the draw and triangle count.
- **After buffers-or-loop:** the halt ending in buffers and an end board at u 483 with the crossover on the Way (as
  recommended), or the loop if the owner keeps it; which platform trains stand at and the chained lever; the loader and
  the steel works' footprint on the east side, where the loop's neck and deck stand today. The buffers end may be drawn
  as a variant (`?ring=greybox&end=buffers`) beside today's loop to help him answer.
- **After the landform:** the path out of the station to the town and the summit, anything more than 25 m from the
  track (the works' shelf, the dwellings), and the fill for the reserved bay site on the west side (Canopy first).

## Shape

- **Sync kind:** all **Local** view, static geometry and colliders. Residents use the existing per-player talk memory
  (Local). Fits landing at a depot end is the only piece that touches shared state, later, as the existing fit does.
- **Reuses:** `makeHalt`'s parts (`halts-view.ts`), `request-lever.ts`, `island-boards.ts` and `halt-map.ts`
  (`LINE_MARK` already colours lines), `home-pictogram.ts`'s `roadPlaque`, the greybox's builders, Ring Island's R2
  mount and unmount by distance, the level-check walk-in and continuity reports.
- **Smallest first build:** the Ring Island greybox's first step above, then the kit module beside `halts-view.ts` rather than inside
  it (627 lines already), then R2 draws the halt from the kit.
- **Risks:** interiors multiply draws (keep to the budget, mount by distance); a hotspot file (`halts-view.ts`); a
  second upgrade screen reads as a shop (it is a framed real place, as at Home); Canopy's alignment and the Gorge's
  split are undrawn, so their plans are provisional until their stills.

## Done means

Captured with `look` on `?ring=greybox` (`npm run look -- --query ring=greybox ...`; the builder sets the cameras from
the halt at about (1414, −820)):

1. **The approach:** from an inbound train position on the Way about 150 m out, the leaning roof (by colour and lean;
   the cone is behind it) and the shard read in one frame.
2. **The platform** (after buffers-or-loop): from the east platform's stop mark, LOOK UP on the edge, the buffers and board ahead, the station
   house's open door in view.
3. **Inside:** from the waiting room's doorway, the bench and the shard in the tilted window; walk in and out without a
   jump and without the camera clipping.
4. **The change:** a walk from the east platform's lever round the north end to the west platform's fingerpost,
   timed (under 15 s), with the fingerpost and its line colour visible from the start.
5. **Measured:** the junction's mounted draws and triangles against the budget above.

## Owner questions answered (10 November)

The design review's five questions replaced this brief's own. The owner read them with their recommendations and
answered, verbatim: "Ok this sounds good". **Orchestrator's reading:** all five recommended answers are taken. They
are in the [decision log](../decisions.md#decided) (10 November).

1. **How many engine houses, and where does the upgrade screen open?** Recommended: B. **Taken: B.**
   - A: two rotundas, Home's and Port Quay's, each with a table and the screen; nothing elsewhere.
   - B: A, plus a small one-road engine shed with no table and no screen where a line has its depot (High Gorge; Ring
     Island if Canopy is first), and Bell Rock's round stair tower as the one round hall.
   - C: a rotunda with a turntable at every big junction. Not recommended: trains are never turned, so five tables
     would be scenery, and Home's stops being special.
2. **Lines that never reach Home (the north–south line; Canopy first, the Island to Canopy line): where do their
   trains take an install?** Recommended: at that line's own engine shed, at its depot end; you still buy at a
   Roundhouse. **Taken.**
3. **Six designed stations or seven?** Recommended: six. West landing is Home's second front, a small boathouse station
   100 m from the hall, not a seventh big station. **Taken.**
4. **Should a first ride to a new place ever need a change of train?** Recommended: no, from the station its line was
   built out of. The one planned change on a first ride is the last leg to the Original Island, at Bell Rock.
   **Taken.**
5. **Ring Island's station house: build its greybox now?** Recommended: yes, at the halt's north-west corner where the
   path to the town starts, leaning, with the Lookers' waiting room. Its track end still waits for the buffers-or-loop
   answer ([rail-map](../plans/rail-map.md#owner-questions), question 2). **Taken.**

Still open after this: buffers or a loop at Ring Island, the island's landform, every draft line of copy in section 2,
and the other stations' concepts, which stay provisional until their areas are designed.

## Parked

- A signal box with a little guy pulling levers at the busiest junction (Bell Rock or Canopy), after a yes.
- A clock on each station house showing when the next train each way comes.
- Station names: drafts per place for the owner (Ringworks is R2's board).
- A map room at Port Quay as well as Home's hall.
- The Original Island's station, as part of the ending's brief.
- A footbridge kit, if a junction ever needs one over its tracks.
- Bunting, lamps and per-place sound at each junction, after a yes.

## Design review (designer, 2026-11-10)

**Verdict: the idea fits the seed and the day's rulings, and the tiering is the right way to pay for the walk-in rule.
Seven things in the brief should be corrected before the owner answers (listed at the end); none needs him. Ring
Island's station house can be greyboxed now, at a different spot from the one the brief gives; its track end and its
works side wait for his buffers-or-loop answer.**

**Read:** DESIGN.md; owner-calls; decisions (10 November: big junctions are designed stations, every building walked
into, Ring Island's land, the train garage, terminals and kinks; 9 November: Home gets one coherent station, signs in
the world, a well-designed town); direction.md; playtests 10 November (co-op, v24);
[rail-map](../plans/rail-map.md) and its design review; [world-blockout](../plans/world-blockout.md) (areas, lines,
telegraphing, the branch choice); [engine-garage](engine-garage.md) (where it lives, the scale audit, the keep-clear,
the owner's answers and round-2 notes); [ring-island](ring-island.md) (greybox findings and rulings 1–6);
[terrain-pass](../plans/terrain-pass.md) (Ring Island's landform proposal and its keep band);
`src/proto/greybox/ring.ts`. **Research:** [level-design](../research/level-design.md) (recs 3 and 5: three sizes of
shape, one weenie per area and a hub everyone returns to), [progression-flow-layout](../research/progression-flow-layout.md)
(three firm rules, five lenses), [route-contract](../research/route-contract.md),
[town-interiors](../research/town-interiors.md) (rec 1: each door gives a different reward; rec 2: indoor camera
clearance, **which the house shell's spec leaves out: finding 9**), [art-kit-pipeline](../research/art-kit-pipeline.md)
(prove a kit at a second place before growing it: **finding 10**), [world-detailing](../research/world-detailing.md)
(a reserved budget per area), [roundhouse-management](../research/roundhouse-management.md) (one small choice per line),
[train-riding](../research/train-riding.md) (rec 7: the ends of a ride are events, which is what a designed station
is), [home-station-layout](../research/home-station-layout.md) (Home, followed).

**Seen** (`npm run look -- --query ring=greybox`, desktop, not tested on a device; stills not committed):

- The approach, from the Way about 150 m out (`--cam 1410,16,-672 --look 1414,20,-850`): the ring and the shard fill
  the top half of the frame; the halt is a thin grey strip where the Way meets the shore, with the dark cone behind
  every part of it. Nothing at platform height breaks the skyline.
- The east platform, looking north (`--cam 1417,11.2,-805 --look 1404,16,-870`): the shard hangs straight over the
  platforms' far end, about 25° up, the summit path zig-zagging under it. The platform already points you at it.
- The halt from the west (`--cam 1380,22,-800 --look 1420,8,-840`): **the halt stands on a fill in the sea.** The west
  platform's outer face drops straight into the water for its southern three quarters; land meets the halt only at
  its north-west corner, where the ramp comes down to the beach and the path starts.

**Not seen:** the station house (it doesn't exist); anything of High Gorge, Bell Rock, Canopy Town, West landing or
Port Quay beyond blockout massing, so every sightline claim about those five is from map data and needs a still when
the place is built. **Not run:** `npm run loop -- run` and `npm run level-check` (the brief changes no rule, route or
map data, and places nothing in data to check); `node dev/playtest/cli.ts` (the 10 November entry was read instead).

### Flow: stepping off at Ring Island, leg by leg

Positions from `ring.ts` (u metres north from the pier head; the halt u 428–468 at about (1414, −820), deck 8.0 m,
platforms 0.9 m up; walk 5.6 m/s). Trains arrive from the south, over the sea.

| Leg | Distance | Walk | Note |
| --- | --- | --- | --- |
| Stop mark (east platform, about u 448) → the platforms' north end | 20 m | 4 s | The shard is dead ahead the whole way (still 2) |
| Across the two roads at the north end → the west platform's north end | 11 m | 2 s | Behind the buffers if the line ends there; a plank crossing if it runs on |
| West platform's north end → the foot of the ramp, where the path to the town and the summit starts | 10 m | 2 s | The only land that touches the halt (still 3) |
| The brief's site: stop mark → the halt's **south** end → back north to the ramp | 20 m + 40 m | 11 s | A detour to the seaward end, across the throat trains arrive through |
| Ramp foot → the summit lookout, by the greybox's path | about 305 m | about 55 s | The landform proposal re-routes this |
| East lever → the west fingerpost, by the north end (done-means 4) | about 40–50 m | 7–9 s | Inside the brief's 15 s |

The three firm rules hold for everything proposed: the next goal can be found (end boards, plaques and fingerposts
all point along a line); no gate loses its meaning (every piece is a view, a stair or a lift beside a stair, so no
travel edge supplies work, and nothing new is reached early); nobody is stranded (each lift has a stair, each change
has a walk, each platform a lever). One lens is broken at Ring Island as the brief sites it (one main line: the
house is off it), fixed by finding 1.

### Rulings on the seven items

1. **Tiers: yes. Six designed stations, not seven, and the tier is earned by what the place is, not by counting
   lines.** By the brief's own rule ("two or more lines meet, or a line meets a lift") Ring Island is not a junction
   when the Gorge is first: the ring runs through it and the north–south line starts at the Gorge. It still deserves
   the full design (a town, a works, the branch read), so the rule should be "a place you change at, choose at, or
   that a town is built round". **West landing is the one that is really a smaller thing**: 100–130 m (18–23 s) from
   Home's hall, no works, and the owner's 9 November call was "instead of 2 stations maybe it's one unified one". It
   becomes Home's second front at the Station tier: the kit house as a boathouse, the listener inside, no bespoke
   concourse. Six designed stations over six hours is one new one per area from area 3 to area 7 (Home exists), about
   one every 50 minutes, which is right. None is a halt. Each is built with its area, never ahead of it (finding 11).
2. **A second Roundhouse with the screen at Port Quay: yes, but for a different reason than the brief gives.** The
   "one place only" line is the garage brief's and its review's call 20, not the owner's; his seed says "accessible
   at select locations" and "maybe others in the world if those are the upgrade points", so a second is inside what
   he approved. But Port Quay is not "several minutes' ride from Home": the cave line reaches it from West landing in
   under 1.7 km, about two minutes (world-blockout's lines table). The real reasons are that High Port's faster engine
   comes from there and that it can be built at 16 m from the start. Lines that never reach Home: an install lands at
   the line's own depot end, as the brief says, **with no screen there** (finding 4 on what the hut is).
3. **Rotundas: the brief's answer is the cautious reading; offer the owner one step more.** In his own notes "rotunda"
   is the engine house (2 November: "maybe it's a rotunda"; 10 November: "a pass on the rotunda"). Three options are
   in owner question 1; recommended is B: two rotundas with tables and screens, a one-road open engine shed at each
   depot end, and Bell Rock's round tower as the one round hall.
4. **"A first trip never needs a change": yes, reworded.** As written it fails once: the first ride to the Original
   Island (the ending) from Home is the bay line to Bell Rock, down the tower, then the north–south line (finding 5).
5. **The concepts fit their places**, each has a walk-in room with a different reward (town-interiors rec 1: a view,
   a machine, a toy, a home, a listener, a stamp), and each has one joke. Two landmarks would not read from a train
   as described (the Gorge's cable, Canopy's roof under the crowns: finding 6), one building is in the wrong place
   (finding 1), and two jokes exist only as words (finding 7).
6. **Ring Island first: yes, in two steps** (finding 2). The house, its room, the edge paint, the fingerpost and the
   measurements don't depend on either open answer if the house stands at the north-west corner, inside the terrain
   proposal's 25 m keep band. The buffers, end board, crossover, loader and works footprint wait for rail-map
   question 2; the path, the town and the bay site wait for the landform.
7. **Kit and bespoke: the split is right; build the kit in two steps and give Port Quay its own budget** (finding 10).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Big junctions are designed stations, not the generic halt; each may have its own works | Decided | Owner, 10 November |
| 2 | Every building can be walked into and holds nothing, a character with a few lines, or something odd | Decided | Owner, 10 November |
| 3 | A track that ends has buffers and an end board | Decided | Owner, 10 November (terminals and kinks) |
| 4 | The upgrade screen opens only at a Roundhouse table, never in Pause or on a key; the table holds a works copy; an install lands on the real trains at a stop | Decided | Owner, 10 November (train garage, answer 1; verb Install, round-2 notes) |
| 5 | Home's Roundhouse grows from 9.6 m to about 16 m as an upgrade | Decided | Owner, 10 November (answer 3) |
| 6 | Purchases are per line and communal | Decided | Owner, 10 November (answer 5); DESIGN 6 |
| 7 | Home is layout B: one terminus, the hall behind the buffers, the table on its own spur | Decided | Owner, 9 November |
| 8 | Halt boards show the island map; signs in the world before hovering text | Decided | Owner, 9 November |
| 9 | Junctions are platforms you walk between; High Port is the crane's top, not a rail halt | Decided | World-blockout rulings and rail-map calls 4 and 6 (orchestrator; open in agent-calls) |
| 10 | Ring Island has no Roundhouse (the boiler rides home); the branch reads at the halt from the map display and a fingerpost | Decided | Ring-island rulings 3 and 4, build 2 (orchestrator) |
| 11 | Three tiers; a halt never gets a station building | New | Recommended. The tier is earned by what the place is (a change, a choice or a town), not by a count of lines (ruling 1) |
| 12 | Seven junction stations | New | **Six.** West landing is Home's second front at the Station tier; Ring Island keeps the full design in both branch orders (ruling 1) |
| 13 | Halts: Camp, Quarry, Far Head, Pier, the Meet's halt, Saltpan. Stations: Lantern Notch, the Original Island | Default | Agreed, plus West landing. The brief's "19 halts" doesn't match its own list (15 places) or the blockout's 21 stops; state one figure |
| 14 | A designed station is built with its area, never ahead; only Ring Island's is designed in full now | New, mine | Recommended (finding 11). Canopy's and the Gorge's plans stay provisional until their alignments are drawn |
| 15 | A second Roundhouse with the upgrade screen at Port Quay, built at about 16 m, r 30 m kept clear; nowhere else | New | Recommended, for the engine built there and the end-game scale, not for distance (finding 3). Owner question 1 |
| 16 | Both screens show every line; each table has its own works copy | Default | Agreed; follows from calls 4 and 6 |
| 17 | Lines that never stand at Home take an install at their own depot end (High Gorge's bay road; Ring Island's west bay, Canopy first) | New | Recommended. "The next Home stop" becomes "the next stop at the line's depot". Owner question 2 |
| 18 | A fitters' hut at each depot end | New | **Not as a hut.** A one-road open engine shed from the Roundhouse's stall kit: no door, no table, no screen; the line's train is the thing to see in it (finding 4) |
| 19 | No turntable anywhere but Home and Port Quay | New | Recommended. The 10 November session: the owner didn't know why to turn the table at Home; a table that turns nothing is one more thing to not understand |
| 20 | Bell Rock's round stair tower is the one round hall | New | Recommended. At 30° and 1.6 m wide a 12 m rise is 24 m of ramp, one turn at 4 m radius, so the tower is about 12 m across: a real rotunda, not a turret |
| 21 | A first trip to a new place never needs a change of train | New | Recommended, reworded: "from the junction a line was built out of, its new stop is one train away" (finding 5). Owner question 4 |
| 22 | Junction platform edges wear their line's colour; the way between platforms ends at a fingerpost in the other line's colour | Default | Agreed. Line 1's gold beside a halt's yellow reads as the same stripe, which is harmless; the two new lines need colours that are neither orange (the folk's steel) nor yellow, each paired with its painted emblem so colour is never the only cue |
| 23 | A change of train is a walk of under 15 s with the fingerpost in sight from the start | Default | Agreed; a tunable target. The Gorge's stair (30–40 s) is the lift's fallback, not a change |
| 24 | Home adds end boards, line colours and a towel on each ruin outline with a little guy beside it | Default | Agreed; telegraphs that the Roundhouse grows (DESIGN 7). Two draft lines |
| 25 | Ring Island: a leaning station house with the Lookers' waiting room; LOOK UP on the platform edge | New | Recommended, with the site and the window changed (finding 1) |
| 26 | Ring Island's house stands at the halt's south end, its concourse the way between the platforms | New | **Not there.** At the north-west corner, where the ramp meets the shore; the way between platforms is round the north end (finding 1) |
| 27 | The waiting room's bench faces "up at a skylight framed on the shard" | Default | The shard is about 23° above the horizon from the halt (130 m up, 308 m off), so it is a tall tilted window in the north-north-west wall, not a skylight; let the house's lean be what points it there |
| 28 | High Gorge: the winding house, a copper lift cage with a winder, the 165 m switchback stair with a bench every 20 m | New | Recommended. The lift must run for one player alone, and the stair is always there (firm rule 3). The landmark is not the cable (finding 6) |
| 29 | Bell Rock: the tower's well holds a tiny hand bell anyone can ring | New | Recommended. A toy nothing depends on (DESIGN 2); rung as a one-off message so friends hear it |
| 30 | Canopy Town: a station house round a living trunk with a resident; the rope walk; a little guy sweeping leaves off standing trains | New | Recommended, provisional (the alignment is undrawn). The sweeper is a new folk job: start simple, motion review. The brief's "its loop turns trains already" meets rail-map finding 10 (turned consists) unsolved |
| 31 | West landing: a boathouse house with a listener at the window toward the cave plug | New | Recommended, as a kit Station house. It needs a second state once the cave is open at 4.2 h, or the joke points at nothing |
| 32 | Port Quay: the harbourmaster stamps your hand each visit; the Quay Roundhouse; the 75 m crane | New | Recommended, provisional. The stamp is a sound and a puff unless a mark on Buddy is cheap. Two buildings, a Roundhouse and a crane don't fit the 25-draw row (finding 10) |
| 33 | Ring Island's halt is the first proof, in `?ring=greybox` | New | Recommended, in two steps (finding 2). Owner question 5 |
| 34 | Kit: deck, edge stripe, canopy, shelter, signal and lever, map display, buffers and end board, fingerpost, crossing, stair and ramp, loader gantry, yard bay, hut, a house shell in three sizes. Bespoke: front and roof, works, the interior's one thing, the joke | Default | Agreed as the split. Build only what Ring Island uses first (one shell size, buffers and board, fingerpost, edge colour); the rest when a second place asks (finding 10) |
| 35 | Budgets within 500 m: halt about 6 draws and 3k triangles; station about 10 and 8k; junction about 25 and 30k | Default | Agreed as starting figures ("geometry budgets follow prominence": defaults, not caps). Port Quay gets its own row; a Roundhouse is counted apart, as Home's is |
| 36 | The shell: a doorway with no leaf, at least 1.6 m wide and 2.6 m clear, lit inside, floor reached without a jump, content declared in data (`empty`, `character`, `odd`) with a check | Default | Agreed. Add a room size for the third-person camera (finding 9) |
| 37 | Stairs and ramps no steeper than 30°, 1.6 m wide | Default | Ring-island ruling 2 |
| 38 | The rail map draws a station symbol and a Tier column; halt boards mark a junction larger and show the way to the other platform | Default | Agreed |
| 39 | Lever plaques name the next big place that way | Default | Rail-map call 28, already logged |
| 40 | The draft lines in section 2 | Default | Drafts for the owner or a collaborator; list in finding 7 |

**Counts:** 10 Decided, 13 Default, 17 New.

### Findings, ranked

1. **Ring Island's station house is sited at the wrong end of the halt (change before the greybox).** The brief puts it
   "at the halt's south end by the plank crossing", with its concourse the way between the platforms. The south end is
   the seaward end: trains arrive through it, a crossing there is across the throat (and the crossover on the Way is
   just beyond), the fill drops into the sea on the west side (still 3), and under rail-map call 13 it is the cargo
   end, where the loader and the steel stand. Everyone who gets off walks north, toward the shard and the only land.
   **Put the house at the north-west corner**, at the foot of the west platform's ramp, about u 464–476 and 10–20 m
   west of the west track:
   - it is on the walk every visitor makes, 6 s from the stop mark, with the town path starting at its door;
   - it is on land, and inside the landform proposal's 25 m keep band, so its ground doesn't move with that answer;
   - the way between platforms is round the north end, behind the buffers if the line ends there and a plank
     crossing when it runs on, so the house never has to bridge two roads;
   - passengers go north and goods stay south, a split the halt keeps when the line runs through;
   - the reserved bay platform (Canopy first) keeps the west side south of it, though that site is open water today
     and needs fill.
   From the approach the house will not break the skyline (still 1: the cone is behind it), so the lean has to be
   plain (12° or more) and the roof a light colour against the slate hill. The shard is the big shape here already;
   the house is the medium one. The window is call 27.
2. **What can be greyboxed before the owner's two open answers, and what can't.** Split section 6:
   - **Step A, now** (depends on neither answer): the leaning house at the north-west corner with its doorway and
     room, the bench and the tilted window on the shard, the camera inside, the edge colours and LOOK UP, the
     fingerpost moved to the platforms' north end, the walk between platforms, done-means stills 1, 3 and 4, and the
     draw and triangle count.
   - **Step B, after rail-map question 2** (buffers or a loop): the buffers and end board at u 483, the crossover on
     the Way, which platform trains stand at and the chained lever, the loader and the works' footprint on the east
     side (the loop's neck and deck stand there today), done-means still 2. If it helps him answer, draw the buffers
     end as a variant (`?ring=greybox&end=buffers`) beside today's loop; a proto variant is cheap and reversible.
   - **After the landform** ([terrain-pass](../plans/terrain-pass.md)): the path from the station to the town and
     the summit, anything more than 25 m from the track (the works' shelf, the dwellings), and the bay site's fill.
3. **The case for Port Quay's Roundhouse rests on a wrong distance.** "Several minutes' ride from Home either way
   round the 8.7 km ring" ignores the cave line the place is reached by: West landing to Port Quay is under 1.7 km,
   about two minutes. The places furthest from the screen are the first branch's (Home to High Gorge is about 2.9 km,
   three minutes each way, from 1.8 h until the bay shortcut at 3.0–3.5 h). That is fine: about a dozen installs in
   six hours, each a reason to come home, is the hub working (level-design rec 5), and purchases are communal, so a
   friend at Home can do it. Keep Port Quay's Roundhouse for what it is: where the faster engine is built, at
   end-game scale. Say also how it sits with Home's growth, since both exist for the same engines in the last two
   hours: Port Quay's is where the big engine first stands, and growing Home's is what brings it home.
4. **A fitters' hut is either a building or it isn't.** Under the walk-in rule a hut you can stand in needs a room
   and a content; one you can't is a prop. Make it neither: a one-road open shed from the Roundhouse's stall frame,
   open at the front as Home's stall is, where the line's train stands for its install and the little guys work. It
   costs no interior, reuses a kit piece, gives the Gorge and (Canopy first) Ring Island an engine house without a
   table or a screen, and is the middle option for "maybe have a rotunda".
5. **The first-trip rule fails at the ending as worded.** Every stage's new stop is one train from the junction its
   line was built out of (checked against the rail map's stages in both orders), and the player arrives the first
   time by laying the track anyway. But from Home the first ride to the Original Island changes at Bell Rock, down
   the tower. That is acceptable, even good (the last ride passes the tiny bell), if the rule says what it means:
   **from the junction a line was built out of, its new stop is one train away; a change is only ever a shortcut, a
   return or the last leg to the ending.** A friend who joins late at Home may change trains to reach the frontier;
   the halt boards cover that.
6. **Two landmarks would not read from a train as described.** High Gorge: "the lift's cable a single vertical
   line" is a pixel at any distance; name a big shape instead (a headframe wheel on the cliff edge by the bridge,
   and the copper cage moving). The station is also at the bottom of a canyon 90 m wide and 85 m deep, so the
   platform may sit in shade all day: a still decides. Canopy Town: "the station roof under their crowns" is hidden
   by definition; the mother trees are the area's landmark, and the station needs one thing of its own that shows
   (the trunk coming through the roof with a lit door high on it, or a gap in the canopy over the platforms). Bell
   Rock (the pinnacle with a 12 m tower at its foot), Port Quay (the crane, seen from Home since minute one) and Ring
   Island (the shard) read.
7. **New copy for the owner or a collaborator** (all drafts, none The Boogler's; his copy is untouched and no line of
   his is suspect here). Home: "Reserved." / "For the big one." Ring Island: "Shh. I'm on." / "Sit if you like. Eyes
   up, though." and the painted LOOK UP. High Gorge: "Up's one bell. Down's two. Three means lunch." and "Halfway."
   Bell Rock: "It's the bell." / "Of Bell Rock." / "You expected bigger." Canopy Town: "You're in my hall. It's also
   my tree." West landing: "Still in there." / "Something knocked. Might've been me." Port Quay: "Anything to
   declare? No? Stamp." **Two jokes exist only as words**, LOOK UP and "Halfway."; the other five read without a
   line (towels on the outlines, a tiny bell in a tall tower, a door in a trunk, an ear trumpet, a stamp).
8. **Ring Island by line count is a Station, and that should change the rule, not the place.** See ruling 1. The
   encounter table should also say that, Gorge first, nobody changes trains at Ring Island at all; what it has
   instead is the choice.
9. **The house shell has a door size but no room size.** Third-person cameras fail in small rooms
   (town-interiors rec 2). Give the shell a smallest room (about 5 × 5 m with 3.5 m clear, or a roof that cuts away),
   and make "walk in and out without the camera clipping" part of done-means 3. Home's hall (13 × 6 m, 4.6 m roof,
   open front) is the reference that already works. If the bench can be sat on, sitting should tilt the view to the
   shard; that is the room's whole point.
10. **Fourteen kit parts in one PR is more kit than one station proves.** Art-kit-pipeline's test is the same parts
    working at a second place. Extract what Ring Island uses, then let High Gorge or the Home flip ask for the
    loader gantry, the yard bay, the shed and the other shell sizes. And Port Quay (two buildings, a Roundhouse, a
    75 m crane) cannot fit a 25-draw row; give it its own, with the Roundhouse counted apart.
11. **Order (game-direction check).** Nothing here jumps the queue: step A is a proto behind a flag; R2 draws the halt
    from it in v27; Home's additions ride the layout B flip; the other four are designed when their areas are. No
    station should be built ahead of its area because its concept exists.
12. **Small.** West landing's listener needs a line for after the cave opens. The harbourmaster's stamp on every
    visit will be heard a dozen times; once a session is enough. The encounter table's hours are the model's
    allowances, not measurements. "Trains are push-pull and never turned" holds only while rail-map call 13 does.

### Port from Place

Nothing new is ported. Reused as they stand, and each still earns its place: the halt's parts (`makeHalt`), the
request lever, the island boards and line marks, the road plaque, the little guys as residents and fitters (kept:
"some lo-fi is character"), and Home's hall, Sleeves, gifts shelf and works board (ruled in home-station's review).

### Before the owner answers

1. Move Ring Island's house to the north-west corner and make the skylight a tilted window (finding 1, call 27).
2. Split section 6 into what is greyboxed now and what waits (finding 2).
3. Correct Port Quay's distance and restate why it gets a Roundhouse (finding 3).
4. Replace the fitters' hut with the one-road open shed, or say it is a prop (finding 4).
5. Reword the first-trip rule and name the ending's change (finding 5).
6. Make it six: West landing at the Station tier; reword what earns a designed station (ruling 1, finding 8).
7. Name a landmark that shows for High Gorge and for Canopy Town (finding 6).

### Owner questions

These replace the brief's five; its question 5 is folded into 5 here.

1. **How many engine houses, and where does the upgrade screen open?** **Recommended: B.**
   - A: two rotundas, Home's and Port Quay's, each with a table and the screen; nothing elsewhere.
   - B: A, plus a small one-road engine shed with no table and no screen where a line has its depot (High Gorge;
     Ring Island if Canopy is first), and Bell Rock's round stair tower as the one round hall.
   - C: a rotunda with a turntable at every big junction. Not recommended: trains are never turned, so five tables
     would be scenery, and Home's stops being special.
2. **Lines that never reach Home: where do their trains take an install?** **Recommended: at that line's own engine
   shed, at its depot end; you still buy at a Roundhouse.**
3. **Six designed stations or seven?** **Recommended: six. West landing is Home's second front, a small boathouse
   station 100 m from the hall, not a seventh big station.**
4. **Should a first ride to a new place ever need a change of train?** **Recommended: no, from the station its line
   was built out of. The one planned change on a first ride is the last leg to the Original Island, at Bell Rock.**
5. **Ring Island's station house: build its greybox now?** **Recommended: yes, at the halt's north-west corner where
   the path to the town starts, leaning, with the Lookers' waiting room. Its track end still waits for your
   buffers-or-loop answer ([rail-map](../plans/rail-map.md#owner-questions), question 2).**
