> **Status: answered by the owner, 10 November; first build waits for v27 and Home's hall map.** Light brainstorm
> (2026-11-10; one agent, three lenses: play designer, systems architect, creative director). Design only: nothing here
> changes code, map data or a `WORLD_NS`. The body was corrected per the design review below on 10 November, and the
> owner's answers are filled in under [Open questions](#open-questions). Where his answer differs from the review (the
> express runs past a pulled lever), the body follows him.

# The express (express-train)

The owner's seed, 10 November 2026: "It would be cool if from the larger stations, you could call a train and board it
to go to any station accessible on the network. Not instant fast travel, but once you select, you board the passenger
only train from the rotunda and maybe there's a short wait (so friends can hop on) and then I departs for your
destination? what do you think of the feature"

His follow-up the same day, when told that lines don't physically connect today: "Yeah I feel maybe an interchange is
an upgrade that allows you to go from any line to another by having crossovers at junctions?"

**Read:** DESIGN.md; the decision log's "Trains and the world" (the train is far faster than walking, islands may be
vastly far apart, a crossing starts at about a minute, the stepping-stone chain, "the rail builds the world" with no
routing or quotas, "only hub stations are fast travel" of 1 November) and its 10 November entries (request stops,
double track, junction stations, longer trains, the garage answers); [generic-lines](../plans/generic-lines.md) §§2–8
and step 4's measured waits; [rail-map](../plans/rail-map.md) with its design review (the ring as one line, the
services table, the junctions paragraph, the continuity rules); [junction-stations](junction-stations.md);
[engine-garage](engine-garage.md) (per-line purchases, Install, the install moment's sizes);
[home-station](../plans/home-station.md) (layout B's real geometry); `src/sim/railway-lines.ts`,
`src/sim/railway-trains.ts` (`blockFree`, `trainServes`, `planLeg`, `trainStepLine`), `src/world/railway-server.ts`
(`rail.call`), `src/entities/railway/halts-view.ts` and `island-boards.ts`. `npm run inflight`: nothing unmerged this
week. Game-direction fit: the [direction](../direction.md) "Next" row is Ring Island; the first build below is small,
touches only the railway's rows, and waits for v27 and Home's hall map (its own bump, after v27's).

## Verdict: build a smaller version

**Build the express as "the next train is yours" first, then as a passenger set of the room's own later; build the
first version only after line 2 reaches Ring Island (v27) and Home's hall map exists; and build interchanges later, one
per junction, where a second line really meets the ring.** The seed's feeling (pick a place, board, a short wait so
friends hop on, then off you go, non-stop) is cheap to deliver with the trains that already run: the next service train
leaving a junction station takes your destination, waits for friends, and runs straight there; the train behind it picks
up the request stops it skips. A separate passenger-only train is the later shape, not the first (question 1): it
belongs to no line's slots, it needs a bay or spur at each junction station, and it is one more train for phones to
draw. Two corrections from the design review. Home is not without a siding: layout B's engine spur leaves line 2's road
at s 5.5 and runs over the 9.6 m table to the Roundhouse's open stall, the shunter already brings the footing wagon out
that way with one reversal at the buffer stub, and an engine and one coach are 8.5 m, so a passenger set can stand in
the Roundhouse and come out by the spur (section 7). And the overtaking worry is smaller than first written: with
request stops the train ahead is non-stop too, so a separate set is delayed about 11 s only when the leader is asked to
stop, exactly as the service-train shape is.

**Why not now.** On today's 0.7 km line the express saves 0 s against a request-stop train nobody flags, a 20 s wait is
half of a 41 s trip, the board it is called from does not exist, and with Home the only junction station nothing calls
an express home from the Pier. At v27 the trip is about 65 s with a junction station at each end (section 9).

Be honest about what it buys. Request stops already make service trains non-stop unless someone asks, so the express
saves only the stops others ask for (about 11 s each) and the uncertainty of the wait. On today's 0.7 km line 2 that is
0–22 s. Its real value is **the gathering** (one choice, everyone aboard, one departure), **the map as the menu**, and,
once interchanges exist, **no change of train**, which is what "any station on the network" needs. It fulfils the
1 November call "only hub stations are fast travel" without a jump, which the owner's "Not instant fast travel" now
rules out.

**The shape in six lines:**

1. An express is a line's next service train run non-stop to the stop you pick, wearing a headboard with its name.
2. You call it at a junction station's hall board, the live line map: reachable stops lit, the rest dim.
3. It stands at the platform for friends: 20 s on the board's flaps, a hand bell, then the whistle and away.
4. One express a line at a time; it never holds another train, and the train behind serves every stop it skips.
5. Before an interchange the board lights only this line; installing one at a junction lays real crossovers.
6. After that the express runs through onto the other line, with no change; service trains keep their own line.

## Pitch

At a junction station you walk up to the big board in the hall, the live line map. The stops your train can reach are
lit; you pick one (stick or tap on the map itself, no list), the board's split-flap header turns to **EXPRESS · PIER ·
20**, a little guy rings a hand bell, and the train at the platform gets a headboard with the destination on its nose.
Friends who hear the bell have 20 s to hop on; anyone aboard can pull the cord to go now. Then the whistle, and it
runs straight there, past every halt, its stop lamp dark. Serves **8, Enjoyable alone and together** (the wait is the
co-op beat; alone, it is a train that goes where you said) and **11, Show, don't tell** (the board is the map, the
headboard says where the train is going). It bends **"the rail builds the world: no routing or quotas"** only by one
choice of a place, never a timetable.

## Gut question

When the bell rings at Home, do your friends come running for the train, and does the ride there feel like a trip you
took together rather than a loading screen?

## Best suggestions, ranked

1. **The express is the next service train, not a new one** (systems, design). Whichever line train next stands at
   the junction, leaving the right way, takes the claim; it skips every request stop but yours, and `trainServes`
   hands the skipped ones to the train behind. Why: no overtaking problem, no siding, no third mesh, and every per-line
   upgrade (speed, cars) applies to it for free.
2. **The board is the map; the headboard is the ticket** (creative, design). The Home hall's live line map (decided
   9 November) is where you pick; reachable stops lit, others dim with the reason. The chosen train wears a destination
   headboard, as real specials did (the Flying Scotsman's), so anyone on the line sees what it is. Why: no menu, no
   text panel, and the read works from across the platform.
3. **The wait for friends never costs the network** (systems, design). 20 s from standing, on the board's flaps; cut
   short by a rider's cord (**Go now**) or the moment the line's next train would be held at the junction's signal;
   it can't start before the headway hold allows. Why: the co-op beat costs nobody else a second.
4. **Interchanges are the purchase; the express is free** (design). The express comes with the hall board; what you buy
   is an **Interchange** at a junction, laid in front of you by the track gang, which lights the other line's stops.
   Why: one clear thing to want per junction, and the per-line upgrades keep their meaning.
5. **Interchanges carry the express only, at first** (systems). Service trains keep their own line, so each line's
   waits, headways and purchases stay what they are; only the claimed train crosses. Why: through-running for every
   train is a routing system; one train at a time on a junction block is a bounded change.

**Tensions.** The orchestrator's "why call a special when trains run on request" is real: the saving in seconds is
small, and the brief says so; the feature stands on the gathering and the through-run. "No routing for players" holds
only if the choice stays a single place on a map. "Rotunda" in the seed: under layout B line trains never turn on the
table and the Roundhouse is the garage, so this brief first read it as the station hall. The design review found the
Roundhouse can hold a passenger set (section 7), so the call point stays the hall and the later set at Home comes from
the Roundhouse (question 1, and junction-stations question 3). Home is the one junction today, and it is the worst
place for an interchange (section 5), so the first build is the express on line 2 alone, after v27 (question 2).

## 1. What it is, against the lever

| | Pull the lever | Call the express |
| --- | --- | --- |
| Where | Any halt, per platform and way | A junction station's hall board |
| Which train | The next one that can brake for you | The next one to leave the junction your way |
| Where it stops | Wherever anyone asks | Only at your stop (and where a rider pulls the cord) |
| Waits for you | Its 5 s dwell | Up to 20 s, on the board, with a bell |
| Reaches | Its own line | Its line, and others joined by an installed interchange |

**Three shapes, compared:**

| Shape | Feels like | Costs | Verdict |
| --- | --- | --- | --- |
| A. The next service train run as your express | Your train, now | One claim on the line's row, one op, the board, a headboard | **Build first** |
| B. A dedicated passenger set standing at a bay | A named train you call out of its shed | A bay or siding at every junction, a third train on each line, a path that can't overtake, an idle set to draw | **Later:** the passenger set the room buys, with the first interchange (question 1); at Home it stands in the Roundhouse (section 7) |
| C. Both, by stage: A first, B later | | | **Chosen** (owner, 10 November, question 1) |

The cheapest version that delivers the feeling is A with no interchange: the board, the 20 s wait, the bell, the
headboard and the non-stop run on one line.

## 2. Where you call it, and how you pick

- **Where:** junction stations only (the junction-stations tier: Home now; Ring Island, High Gorge, Canopy Town, West
  landing, Bell Rock, Port Quay as they open). Stations and halts keep the lever. Why: "the larger stations" in his
  words, and it gives the junction tier a verb of its own.
- **What:** the hall's big live line map (the 1 November board's split-flap face over the island map), at the head of
  the island platform under layout B, about 10 m from the passenger car's stop mark. At junctions without a hall map
  yet, the same board in the station building's concourse.
- **Picking:** walk up and interact; the camera eases to the board (the map display's own framing); stick or arrows
  step a ring between lit stops along the drawn lines (pad), a tap on a stop picks it (touch); interact again to
  call. Dim stops can be ringed and show why ("Needs an interchange at Canopy Town"), but not called. Back or walking
  off cancels. No list.
- **Who:** anyone. One express a line at a time: while one is called or running, that line's stops on every junction
  board show it ("Express to Pier, leaving") and can't be called again.
- **Two ends, one hub** (design review finding 4): Home's hall and West landing are the ring's two ends, 100–130 m
  apart (18–23 s on foot), so their two boards are one hub. Called at the hall, an express to Saltpan would run about
  8 km east when it is one stop from West landing; Canopy Town is 4.9 km by the ring and 2.4 km by the bay line. So a
  stop nearer from the other end is shown "from West landing" on the board, with the walk drawn; and at a through
  junction the express leaves the shorter way round.

## 3. The wait for friends

- **Length:** 20 s from the train standing at the platform (its 5 s dwell inside it); the board counts down on its
  flaps. If no train of that line is standing, the claim attaches to the next one inbound and the board shows its
  arrival first ("Next train 0:34", then the 20).
- **What everyone sees and hears:** at the station, the board's header flips to the destination, a little guy on the
  platform rings a hand bell three times, the headboard drops onto the engine's nose with a clank, and the last 5 s
  tick on the flaps; at 0 the guard blows a whistle and the engine answers with its own. On every halt's map display
  the express's marker wears a gold ring and, at its destination's display, the header clacks "Express from Home".
- **Far-away friends:** no nudge and no toast. They can't make 20 s from afar, and the halt displays already show the
  express coming; principle 11 over a notification. (Parked: a faint bell for anyone within about 150 m.)
- **Leaving early:** anyone aboard pulls the cord, now **Go now**, once the line's headway hold allows; the board flips
  to 0. When everyone in the room is aboard the cord glows (a client read of presence, Local).
- **Holding longer:** not offered. A second call while waiting does nothing; the wait already ends early whenever
  another train of the line would otherwise be held at the junction's signal, so a "hold" button would be a way to
  stall the line.
- **Nobody boards:** it goes anyway, empty, as an express, and reverts at its stop. Harmless to others (the train
  behind serves the skipped stops) and it avoids the server reading presence inside the sim's rules.

## 4. The ride

**Non-stop on connected track.** The express runs on its line's own track and its block signals; it stops for nothing
but your stop, a rider's cord (which ends the express there: the train reverts to service) and a red signal. It never
makes cargo service stops: a train that owes one (the footing wagon's train while the pier owes footings, the kit's)
is never claimed, and the claim takes the next train.

**"Any station accessible on the network"** means: every stop on the express's own line, plus every stop on any line
joined to it through installed interchanges (transitively). Before any interchange, that is one line; the board's dim
stops say where an interchange would join them. Through-running across a walk-between junction with a "change held
for you" is parked: the owner's follow-up chose crossovers.

**If line 2 becomes one ring line** (rail-map owner question 1, recommended), most of the map is one line: from Home an
express reaches every ring stop with no interchange, so interchanges matter only where another line meets the ring
(section 5).

**Ride times** (non-stop from a stand, at 3.5 m/s² as `trainLegTicks`; a service train's ride is the same plus about
11 s for each stop someone has asked for):

| Trip | 20 m/s | 25 m/s |
| --- | --- | --- |
| Home → Quarry (157 m) | 14 s | 13 s |
| Home → Far Head (507 m) | 31 s | 28 s |
| Home → Pier (710 m, today's longest) | 41 s | 36 s |
| Home → Ring Island (about 1.2 km, v27) | 65 s | 54 s |
| Half the ring (about 4.35 km) | 3.7 min | 3.0 min |
| The whole ring, Home → West landing (about 8.7 km) | 7.3 min | 5.9 min |

**On board:** today's passenger car (Four seats; riders sit forward), looking out; the cord stays the stop request, and
before departure it is Go now. Nothing new to do: the ride is the look out of the window, which the owner has liked
since the crossing test.

**Arrival:** the train runs into the destination platform with the headboard on, gives two short whistles, stands
for its dwell, and the headboard lifts off (a little guy takes it, tucks it under his arm, and walks off); the train is
an ordinary service train again, leaving the way it would have.

## 5. Interchanges

**What it is:** an upgrade bought for one junction station that lays real track: a pair of crossovers or connecting
curves between the lines that meet there, with their signals. After it, an express can run from one line onto the
other with no change of train. **Before it, the junction is walk-between** (generic-lines §6, the ruling stands as the
default); the interchange is the one thing that changes it, at that junction only.

**Where it fits.** The continuity rules: turnouts at 7° or less (a 4 m shift over at least 50 m), 60 m minimum radius
on running line (40 m only on loops at reduced speed), at least 20 m of easing, joins within 5 cm and 2°, no grade over
4 %. Shifting between roads `d` apart at 7° needs about `d / tan 7°` = 8.1 × `d` of parallel track, plus its easing.

| Junction | Lines that meet | Fits? | Why |
| --- | --- | --- | --- |
| **Home** (layout B) | Line 1 and line 2 (the ring's start) | **No, not worth it** | The two roads are parallel and 7.6 m apart for only about 22 m (s 0–22 and 0–25) before they turn apart on 18 m curves; a 7° crossover needs about 62 m. The planned **cart's leg** (line 1 s 54 to road 2 s 26) is a real link, but at R 15 m, under the 40 m loop minimum. And line 1 is 193 m long: Camp is closer on foot than through a reversal |
| **Ring Island** | The ring; Canopy first, also the Island to Canopy line from a west bay | **Canopy first only; likely** | A turnout from the ring's west track into the bay's throat, facing the way to the trestle, if the bay road runs parallel 65 m or more beyond the 40 m platforms; measured when R2 draws the bay. Gorge first, one line: nothing to join |
| **High Gorge** | The ring through; the north–south line's bay | **Doubtful** | The 90 m split may not hold its own curve and two stations (junction-stations); a link into a bay facing the falls-cave rock means a reversal in the bay. Keep walk-between unless the split is widened in its brief |
| **Canopy Town** | The ring and the bay line, both through, side by side | **Best fit** | Two parallel through roads are the textbook case: a crossover each way on the straight approach, if each side has 65 m or more parallel. The alignment isn't drawn yet (the drafts kink 102–132°): draw it with that room |
| **West landing** | The ring's Home end and the bay line's start, two terminals side by side | **Yes, if drawn for it** | Like Home, but with room: draw the two approaches parallel for 65 m or more before the buffers; a train from the bay line reverses in the terminal and leaves on the ring. Also the one interchange that lets an express cross from the bay line onto the whole ring |
| **Bell Rock** | The bay line on the skerry at 15 m; the north–south line at the water | **No: the exception** | A crossover can't join two levels; a 15 m climb at 4 % is 375 m of ramp plus vertical curves on a 240 × 190 m skerry. It stays walk-between, by the stair tower and its tiny bell |
| **Port Quay** | The ring only (the cave half and the White Wall line join it as one line at stage 7) | **Nothing to join** | Closing the ring is laying the line, not an interchange |

So, with the ring as one line, there are two line pairs to join: **the ring and the bay line** (Canopy Town or West
landing: either does it) and **the ring and the north–south line** (High Gorge only, since Bell Rock is two levels).
Canopy Town, West landing and Ring Island alone would be two links for the first pair and none for the second, and the
Original Island, the ending, would stay dim for ever. So (design review ruling 4; owner, 10 November, question 4): **a
connecting train held for you across the platform is the base at every junction, so every open stop is lit from the
first junction and the line to the ending is always reachable; the interchange is the upgrade that removes the walk;
and High Gorge, Canopy Town and West landing are drawn for one.** Line 1 is the named exception: Camp is a 35 s walk.
Home never gets one. "Bell Rock never" is true only of its two-level pair: Canopy first, its top level carries both the
Island to Canopy line and the bay line's bay. That is a rule to draw by now: at High Gorge, Canopy Town and West
landing, leave 65 m of parallel approach (High Gorge's 90 m split has to be widened in its brief for it).

Where the six-line shape, section 4, section 8 and "Before and after" below still say a stop is dim until an
interchange joins it, read "reached by the held change, with a walk across the platform". The held change's own rules
(how long the connecting train waits, what the board shows) are not designed yet.

**What it does to the sim (express only).** Service trains keep their line: their slots, headways, waits and
purchases are unchanged. The claimed train is the only one that crosses:

- **A junction block**, generalising today's end blocks: from each line's turnout to the far end of the connecting
  curve, both lines; at most one train in it, of either line, with a signal on each approach. A service train of the
  other line waiting at that signal is held only while the express is in the block (a few seconds).
- **A guest on the other line:** the express joins line B's spacing (the block rule and `trainServes` see it) from the
  tick it enters the junction block until it stands at your stop; then it runs back, non-stop and out of service, to
  its own line by the same interchange. Today a train's line is derived from its slot and `LINE_SLOTS` is a constant,
  so this needs a stored `line` (or `guest`) on the train row and spacing that reads it: **the largest sim change
  since generic lines, a `WORLD_NS` bump and an independent review.** It is built with the first interchange, not
  before.
- **The headway** on line B ignores the guest (it is never held for headway there and doesn't count towards `trains`),
  so line B's own trains keep their spread.

**Bought and shown.** At the junction itself, on the station building's board: a dim "Interchange" panel on the hall map
showing the curve dashed between the lines, priced, with **Install**. The upgrade screen at a Roundhouse lists
interchanges too, under Upgrades, as a network row, for planning, but the install is done at the junction, because you
should watch it happen there. **Cost:** steel and rails, from the shared wallet (points and crossings are steel
castings, which gives Ring Island's steel a second use); prices are the economy model's, not this brief's. **Not free
with the junction:** a junction station's reward is the station; the interchange is the purchase it offers.

**The install moment** (the engine-garage sizes: an interchange is **Large**, and longer, because it is track). Hold
Install (1.2 s). The track gang walks out from the station house with the laying machine; it lays the connecting curve
panel by panel with the track layer's own drop and clunk (about 14 s, as laying a section already runs); two little
guys bolt in the points, one falls over; the signal arms rise on both approaches; the points throw, clack-clack; then
the board in the hall flips the other line's stops from dim to lit, one by one along the line, each with a flap. The
first express afterwards runs through with a headboard that says both lines' colours. Everyone in the room gets the
shared moment as other big installs do.

**Before and after, for the player:** before, the hall map lights this line's stops; the other line's stops are drawn
dim, and ringing one shows "Needs an interchange at Canopy Town" (drafted), with the place ringed on the map. After,
they light up, and the dashed curve on the map is solid.

## 6. Rules that keep the network honest

- **A path through the signals:** the express is a train of its line with a different `reasons` set (its riders' cord
  asks, and the claimed stop; no lever asks, no service stops). It plans legs with `planLeg` and is held by `blockFree`
  like any train, so it can't deadlock in ways a service train can't. It can still be held behind a train that stops on
  request ahead of it; with two trains on line 2 the one ahead left at least about 35 s earlier and loses about 11 s a
  stop, so on today's line it never catches up.
- **Not starving service trains:** `trainServes` skips the claimed train, so every lever ask on its track goes to the
  train behind; at worst one ask waits one extra headway (about 46 s on line 2) once per express. The friends' wait
  ends early when another train of the line would be held at the junction's end-block signal, so the express never
  holds anyone.
- **Not starving cargo:** a train owing a service stop is never claimed; cargo loaders still load at a source the
  express stops at (your stop).
- **One express per line**, and with interchanges one per junction block at a time; no cool-down beyond that.
- **Cost:** none to ride (communal, principle 6). Interchanges are the cost.
- **Upgrades:** the express is the line's train, so its speed and cars are the line's. Long trains and stop marks: it
  stands at your stop exactly as a service train does, passenger car at the platform.
- **Griefing:** calling an empty express costs the line at most one headway at the stops it skips, once per run, and the
  line can't have two. Acceptable; a repeat caller gets nothing more.

## 7. Where it comes from physically

**Shape A, the first build:** from the platform it is already at: the train standing (or next standing) at the
junction's platform for that line. Layout B suits it: both lines end at buffers beside one island and the hall, and the
board stands at its head. The Roundhouse (Home now, Port Quay later) stays the garage: line trains never turn on the
table, and shape A uses neither the spur nor the stall.

**Shape B, the later passenger set:** it is kept at a bay at each big station. At Home that is the seed's "from the
rotunda" as he said it (design review finding 1): layout B's engine spur leaves line 2's road at s 5.5 and runs over
the 9.6 m table to the open stall, the way the shunter already brings the footing wagon out, with one reversal at the
buffer stub. An engine and one coach are 8.5 m, so the set stands in the Roundhouse about 6 s from the hall, friends
board it there off the running line, and it comes out by the spur when the end block is free. The cost is real: the
table carries the works copy, there is one open stall, and the decided "the Roundhouse holds the garage only" (9 and
10 November) would need the owner's change.

**Owner, 10 November: "No: the Roundhouse stays the upgrade screen only; find it a bay elsewhere".** The passenger set
does not stand in the Roundhouse and does not come out by the engine spur. Home's bay for the passenger set is now an
open design item ([decision](../decisions-rail.md#d-2026-11-10-the-passenger-set-does-not-stand)); the Roundhouse
readings above, in question 1 and in the design review's finding 1 are history.

### Home's bay for the passenger set (options, 10 November)

Drawn to scale on layout B, one tab per option: [home-passenger-bay.html](../world/home-passenger-bay.html). Numbers
are measured from `src/place/home-station.ts`, `src/place/layout.ts` and the terrain at a5999692c; walks are at
5.6 m/s from the hall's back doorway and from the Roundhouse's open stall door. Design only: nothing is built.

| | A · East bay | B · The cart's track | C · No bay at Home |
| --- | --- | --- | --- |
| Where it stands | A straight bay past the island's end, buffers 10 m beyond the end ramp; joins line 2's outbound track at s 54 | On the cart's 38 m link (line 1 s 54 to road 2 s 26), 17 to 25.5 m along it, on its 15 m curve | At West landing |
| New track | 26 m, straight, one buffer stop | 0 m | 0 m at Home |
| New platform | Yes, about 12 m | No: it rolls 23 m into platform 2 to load | No |
| New curves or points | None: the existing joining curve (18 m, up to 16.7°) becomes the points | None | None |
| Engine and one coach (8.5 m) | Fits, 0.3 m off the buffers | Fits, 3.6 m from line 1 | n/a |
| Longest set | 12.7 m (longer-boiler engine, two coaches), 3.0 m between track centres at its nose | 12.7 m, 4.0 m from line 2 | Whatever West landing is drawn for |
| Hall to its door | 40 m, 7 s | 21 m, 4 s | 122–131 m, 22–23 s (straight line) |
| Roundhouse to its door | 31 m, 6 s across the track (35 m round the island's end) | 20 m, 4 s across the track (37 m round) | about 150 m, 27 s |
| Seen from the hall | Yes: 43 m, dead ahead down the island, side-on | Yes: 44 m, then it rolls in beside you | No |
| Running lines | Leaves straight onto the outbound track; never on a platform road or the single track | Holds platform 2 and the single track about 35 s (estimate) | Unchanged |
| Full 20 s wait | Always | Often cut to 10–15 s with three trains (estimate, not simulated) | As the first stage |
| Holds a service train | No | No: the wait ends early instead | No |
| Displaces | The cart's link (crosses it) and Q2's old frame (2.5 m from the bay's centre line); nothing of the square, shelf, wagon's roll-out or the Roundhouse's kept ground (23 m from the table) | Nothing | Nothing |
| `WORLD_NS` bump of its own | No | No | No |

Ruled out, with the measurements, on the page: a bay beside the hall south of road 2 (the engine spur crosses it at
s 16, and it sits on the ground kept to relay the spur), north of road 1 (the forge's goods side), a through chord
across the gap (about 7 m of clear standing room for an 8.5 m set), and the designed-station rule of a 40 m bay road
with a 65 m parallel throat (Home's roads are parallel for 22 and 25 m). Also measured: the stub behind the spur's
points is 8.1 m, so the 8.5 m set could not have reversed there.

**Recommended: A, the east bay.** It is the only place at Home where the set can stand with its doors open for the
full 20 s without sitting on a running line, in plain view down the island from the hall, and it touches nothing kept
for the Roundhouse. B is the fallback if the cart's link has to stay.

Not confirmed: whether the cart's link stays as track after the cart retires; what becomes of Q2's frame; that
outbound trains are posed on the left-hand track from s 54; every time marked as an estimate; West landing's layout.

Answer: \_\_\_

## 8. When the player gets it

- **The express:** once line 2 reaches Ring Island (v27) and Home's hall map exists (layout B's big board), with no
  purchase; it is what a junction station's board does. Its first use teaches "the map is the menu" and "a train can be
  yours". A small first beat: the first time any player rings a stop, the bell little guy says one line (drafted) and
  rings the bell himself.
- **Interchanges:** offered at a junction once two lines both run there (Canopy Town or West landing first, by branch
  order; Ring Island first when Canopy is first). The first teaches that "dim" on the board means "buy the connection
  here", and pays off at once with a through run.

## 9. The smallest first build (after v27: line 2, Home ↔ Ring Island)

**Trigger:** not on today's line. It is built after line 2 reaches Ring Island (v27 is live) and Home's hall map exists
(layout B's big board, home-station's step 12). Owner, 10 November: "When v27 is live (the line reaches Ring Island)
and Home's hall map exists". The board's map face can be built now (it is decided work and Local); the claim and its
bump follow v27.

**What it is:** the express on line 2 between Home and Ring Island, shape A, no interchange, called from the hall
board. It shares v27's longer line, its train count and Ring Island's board, but not its bump (design review ruling 7:
"Nothing waits on a world bump", and two independent reviews of two small changes beat one of both). Nothing in v27
needs to change for it.

**Sync kind:** Server, as the railway (v14 on): the server's rules accept the call and own the claim; the sim's step is
pure in whole cm and ticks. Local: the board's picking, the headboard, the bell, the flaps, the camera ease.

- **State:** the `Line` row gains `xTrain` (claimed slot, −1 none), `xStop` (the claimed stop) and `xGo` (the tick the
  wait ends, −1 until it stands). The board, displays and headboard read them through `railwayView.lines`.
- **Op:** `rail.express { line, stop }` from the board (height and reach, `actor.cadence`), refused for a stop not
  open, the junction's own stop, a line with an express already, or a bad id; `rail.call`'s rider form with a new
  `go: 1` field is **Go now** (aboard that train, only while it stands claimed).
- **Sim** (`railway-trains.ts`): claim attaches to the next train standing at Home leaving outbound that `headExempt`
  doesn't name; `trainReasons` for the claimed slot drops lever asks and service stops; `trainServes` skips it; the
  standing branch holds it to `max(headway hold, xGo)` unless Go now or the inbound train reaches the end signal;
  standing at `xStop` clears the claim.
- **Wire and saves:** a reshaped persisted row and a new op, so **a `WORLD_NS` bump** (its own, after v27's), and,
  as shared state, **an independent review** before merge. No change to line 1 or to `RAIL_TRAINS`.

**Focused tests** (no long playthrough):

1. A claim attaches to the standing outbound train; it leaves at the later of the hold and `xGo`, or at Go now.
2. During an express, a lever ask at Quarry its way is served by the other train (`trainServes`), and the express runs
   through with its stop lamp dark.
3. The express stands at its stop and the claim clears; the next run is an ordinary service.
4. The friends' wait ends when the inbound train reaches Home's end signal; no train is ever held there by it.
5. Random asks plus random claims over 5 seeds × 40,000 ticks: `trainSpacing` holds; the worst wait per (halt,
   direction) rises by no more than one headway over v26's measured 70–95 s.
6. The server refuses `rail.express` off the board, for a closed or junction stop, a second claim, and Go now from
   off the train; malformed input never throws.

## Shape

- **Sync kind:** Server state (the claim on the line row, interchanges later as a junction row), Local view.
- **Reuses:** `planLeg`, `blockFree`, `trainServes`, `trainStepLine`'s holds, `endBlocks` (the pattern for junction
  blocks), `rail.call`'s rider form, `island-boards.ts`'s map faces and markers, the split-flap face, the request lever's
  prompt pattern, the track layer's panel laying and `shared-moment.ts` for the install.
- **Smallest first build:** section 9.
- **Risks:** it trivialises nothing on a 0.7 km line, but can feel pointless there, which is why the first build waits
  for v27 (the gut question answers it); halts stay relevant because only junctions call; a friend left behind gets the
  next train in about 46 s; griefing is bounded by one per line; shape A gives phones no extra train to draw. The
  interchange's guest-train sim is the real cost, and it waits for a junction that needs it.

## Done means

Captured with `look` (`npm run look -- --query home=b --rail-seed trains-on`, plus an eval that sends
`rail.express { line: 1, stop: 3 }`):

1. **The call:** from the board, the map with line 2's stops lit and line 1's Camp lit on its own line, the Pier ringed,
   the header flipped to EXPRESS · PIER · 20.
2. **The wait:** from the platform, the headboard on the engine's nose, the bell little guy, the flaps at 5.
3. **The run:** a still at Quarry as the express passes, stop lamp dark, a lever ask pulled; a second still about 46 s
   later of the other train stopping there.
4. **Measured:** the claim's departure tick against `max(hold, xGo)`; the Quarry ask's wait; no train held at Home's
   end signal across the run.
5. **Arrival:** the express standing at the Pier with the headboard lifted off.

## Draft strings (for the owner; none are The Boogler's)

- Board header: "Where to?" · "EXPRESS · {stop} · {s}" · "Next train {m:ss}" · "Express to {stop}, leaving"
- Dim stop: "Needs an interchange at {place}"
- Cord: "Go now" (before departure), today's stop request after
- Bell little guy, first ring: "Ding ding! That's you, that is." · after: "Express! Express! Mostly express!"
- Driver on arrival: "{stop}! Everybody off who's getting off."
- Headboard taker: "I'll mind that."
- Interchange panel: "Interchange" · "Install" · "Installed"

## Open questions

The design review's five owner questions, with the brief's own question on the wait kept as the sixth. Answered by
the owner on 10 November; his words are quoted as given.

1. **Is the express the ordinary train with a headboard, or a passenger train of your own that stands ready?**
   - **Shape A:** the line's next service train, run to the stop you pick, with a headboard. One claim on the line's
     row, one op, the board; no extra train to draw.
   - **Shape B:** a passenger-only set the room buys, kept at a bay at each big station; at Home it stands in the
     Roundhouse and comes out by the engine spur (the spur leaves line 2's road at s 5.5 and runs over the 9.6 m table
     to the open stall; an engine and one coach are 8.5 m). It is also the train that crosses interchanges and that
     the little guys ride for trade.
   - **Staged:** A first, B later, as the purchase that comes with the first interchange.

   Recommended: both, by stage. First the next service train, with a headboard. Later a passenger set the room buys,
   kept at a bay at each big station (at Home it can come out of the Roundhouse, as you said), which is also the train
   that crosses interchanges and that the little guys ride for trade.
   Answer: "Both, by stage: the service train with a headboard first; later a passenger set the room buys, kept ready
   at each big station"
2. **Build it now on the 0.7 km line, or when the line reaches Ring Island?** Recommended: when v27 is live and
   Home's hall map exists. Today it saves nothing and can't bring you home.
   Answer: "When v27 is live (the line reaches Ring Island) and Home's hall map exists"
3. **Should an express pass a friend who has pulled a lever?** Recommended: no. It stops for them (11 s) and skips
   only cargo and little-guy calls.
   Answer: "It runs past; the next train serves them" (against the recommendation: the brief's original rule stands)
4. **"Any station on the network": only where an interchange fits, or everywhere?** Recommended: everywhere from the
   first junction, by a connecting train held for you across the platform; an interchange is the upgrade that removes
   the walk, drawn in at High Gorge, Canopy Town and West landing.
   Answer: "Every open stop is reachable from the first junction, by a connecting train held across the platform; an
   interchange is the upgrade that removes the walk (High Gorge, Canopy Town, West landing)"
5. **Does this replace the 1 November jump for good, so nothing in the game travels instantly, an invited friend
   included?** Recommended: yes.
   Answer: "Yes: hubs and the board stay, the jump becomes a ride"
6. **The wait for friends** (the brief's own question; the review ruled yes and did not ask it again). Recommended:
   20 s from standing, with the bell and the flaps; anyone aboard can Go now; no hold-longer; it ends early rather
   than ever holding another train; an empty express still runs.
   Answer: "20 s with a bell; anyone aboard can go now"

## Parked

- Its own livery and whistle for the passenger set (shape B, question 1), as an end-game look.
- A faint bell for players within about 150 m of the station when an express is called.
- Interchanges for service trains (through services across lines), if a line ever needs them.
- Home to West landing as a real link through the village, closing the ring into a loop.
- A ticket the conductor stamps (a look; the Port Quay harbourmaster's joke already stamps hands).

## Design review (designer, 2026-11-10)

**Verdict: the brief's rules are sound and its honesty about the seconds is right, but three things change before the
owner answers, and the first build should wait for a trigger, not ship on today's line.** (1) Question 1 presents a
service train with a headboard as what the owner asked for; his words are "the passenger only train from the rotunda",
and the same day he spoke of passenger trains "if purchased". He should be shown both shapes. (2) The express running
dark past a pulled lever rebuilds the complaint request stops were made to fix. (3) "Three interchanges" joins only
two of the three line pairs, and leaves the line to the ending unreachable.

**Read:** DESIGN.md; owner-calls (pick and log, nothing waits on a world bump, signs in the world, visualize in 2D
first, port only what fits); decisions (1 November: hub stations are fast travel, the stepping-stone chain; 2 November:
the roundhouse "maybe it's a rotunda", junctions unlock and you still haul, an invite lands you in the hub; 9 November:
the live line map "No fast travel or picker", layout B; 10 November: request stops, double track, designed junction
stations, the garage answers, the express entry itself); direction.md; playtests 9 and 10 November;
[generic-lines](../plans/generic-lines.md) §4–8; [rail-map](../plans/rail-map.md) and its review;
[junction-stations](junction-stations.md) as on main (its owner answers, "six designed stations", were reported to me
but are not on main, so I could not read which station went); [home-station](../plans/home-station.md).
**Research:** [traversal-at-speed](../research/traversal-at-speed.md) rec 10 (judge trains door to door; aim for a
30% saving where a ride is sold as the upgrade: **the brief does not meet it and says so**);
[rail-network-depth](../research/rail-network-depth.md) (the railway runs itself, no priorities, a waiting passenger
is never trapped by another service: **the skip rule is a priority, finding 2**);
[train-riding](../research/train-riding.md) recs 1, 6 and 7 (being carried is the floor, a ride is easy to catch
again, its ends are events: the bell and the headboard follow it);
[vast-world-scale](../research/vast-world-scale.md) rec 3 (20–30 s headways);
[progression-flow-layout](../research/progression-flow-layout.md) and
[route-contract](../research/route-contract.md) (below).

**Seen** (`npm run look -- --query home=b --rail-seed trains-on`, desktop, not tested on a device): the hall from the
square (`--cam 898,20,13 --look 918,20,10`): an open post hall, the curio shelf across its front, trains visible
through it, **no line map**; the hall's back from the island (`--cam 930,21,9 --look 910,20,11`): the buffers and a
bare back span where the map is planned; the Roundhouse from the platform (`--cam 920,23,8 --look 941,19,27`): the
table and the open stall about 25 m away in plain view, the spur curving off line 2's road beside the standing train.
**Not seen:** the board itself (it does not exist; layout B is behind `?home=b` and the map is home-station's step
12), any other junction (blockout massing only), the pick on a pad or a phone. `npm run loop -- run` not run: the
brief changes no route or gate. Reach is stated, not proven: the op refuses a stop that is not open (test 6), which
is what keeps rule 2.

### Flow: one express trip from Home, leg by leg

| Leg | Distance | Time | Note |
| --- | --- | --- | --- |
| Hall board → passenger car's stop mark | about 10 m | 2 s | The board would stand on the hall's back span, facing the island |
| The wait | | 0–20 s | Solo: sit and pull Go now |
| Home → Pier, non-stop | 710 m | 41 s | A request-stop train with nobody asking: the same 41 s |
| Home → Ring Island (v27) | about 1.2 km | 65 s | The first trip with a junction station at both ends |
| Hall → West landing on foot | 100–130 m | 18–23 s | The ring's other end; finding 4 |
| Hall board → Roundhouse stall door | about 33 m | 6 s | Finding 1 |

The three firm rules hold: the next goal can be found (a dim stop names where its link is); no gate loses meaning
(the express reaches only open stops; it skips distance, never work); nobody is stranded (every destination has a
lever home, a missed express is followed by the next train, the claim clears on arrival). Lens 8, a place to meet:
the bell at the hall is the best thing in the brief. Lens 6, the world shortens behind you: interchanges do this late.

### Rulings on the seven items

1. **Service train or a train of its own: both, by stage, and ask him.** A honours "pick, wait for friends, go"; it
   does not honour "the passenger only train from the rotunda". Options, honestly:
   - **A, the next service train with a headboard.** Feels like the ordinary train with a sign on it. Cost: one claim
     on the line row, one op, the board. No extra train to draw.
   - **B, a passenger set of the room's own, standing ready.** Feels like our train: a coach set with its doors open
     at a bay, a place to gather that holds nobody up, a thing the room bought. Cost: a train that belongs to no
     line's slots (the same stored `line` on the row that section 5's guest needs, so B and interchanges are one sim
     change), a bay or spur per junction station, one more train on screen. The brief's case against B is weaker than
     written: with request stops a service train ahead is non-stop too, so B is delayed 11 s only when the leader is
     asked to stop, exactly as A is; and **Home is not without a siding** (finding 1).
   - **Recommended: A for the first build, B as the purchase that comes with the first interchange**, and the
     passenger-trade idea's little guys ride B when players don't. B is also the right train to cross an interchange:
     section 5 takes a service train off its line and runs it back empty, which on a two-train line doubles the wait
     behind it for minutes. Junction stations reserve a bay now (finding 6).
2. **Not on today's line. Trigger: line 2 reaches Ring Island (v27) and Home's hall map is live.** Today it saves 0 s
   against a request-stop train nobody flags, a 20 s wait is half of a 41 s trip, the board it is called from does
   not exist, and with Home the only junction station it is one-way: nothing calls an express home from the Pier. At
   v27 the trip is 65 s with a junction station at each end. Build the board's map face now (it is decided work and
   Local); the claim and its bump follow v27.
3. **The wait and Go now: yes. One per line: yes. Never holding a train: yes. Skipping a pulled lever: no.** See
   finding 2. With that change the cost to other players is nil and test 5's bound is "unchanged".
4. **Three of six is not enough as drawn.** Under the one-ring proposal the pairs are ring and bay line (Canopy Town
   or West landing: either does it), and ring and north–south line (High Gorge only, since Bell Rock is two levels).
   The brief's three are two links for the first pair and none for the second, so the Original Island, the ending,
   stays dim for ever. Recommended: the parked "change held for you" becomes the base everywhere, so every open stop
   is lit from the first junction; the interchange is the upgrade that removes the walk; and High Gorge, Canopy Town
   and West landing are drawn for one (finding 3). Line 1 is the named exception: Camp is a 35 s walk.
5. **The hall board as the map and the call point: yes.** It is the decided live line map gaining a pick, a real
   object, no list. It needs its 2D page first (owner call "Visualize in 2D HTML first"). "Rotunda" as the hall is a
   guess the stills argue against: ask (question 1).
6. **The 1 November ruling is real and this replaces its mechanism.** It reads: "only hub stations are fast travel:
   fast travel is a jump between locations; other stops are reached by riding. Hubs get the big departures board."
   Kept: hubs only, the big board. Changed by "Not instant fast travel": the jump becomes a ride. Also touched and
   not named by the brief: 9 November's line map was approved with "No fast travel or picker" (the board gains a
   picker), and 2 November's invited friend who lands in the hub and reaches friends "via fast travel" (now a ride of
   up to several minutes round the ring: fine, and the best co-op case for the feature). When the owner answers, the
   log needs a dated Changed line for all three.
7. **First build: the express on line 2, Home ↔ Ring Island, after v27, on its own bump.** It shares v27's longer
   line, its train count and the Ring Island halt's board, but not its bump: "Nothing waits on a world bump", and two
   independent reviews of two small changes beat one of both. Nothing in v27 needs to change for it.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A ride, never a jump | Decided | Owner, 10 November: "Not instant fast travel" |
| 2 | Called from the larger stations | Decided | Owner's seed; 10 November, designed junction stations |
| 3 | There is a short wait so friends can hop on | Decided | Owner's seed |
| 4 | Any station reachable on the network can be picked | Decided | Owner's seed |
| 5 | An interchange is an upgrade: crossovers at a junction | Decided | Owner's follow-up ("maybe") |
| 6 | Free to ride; an interchange is the room's | Decided | DESIGN 6 |
| 7 | Request stops and the cord are reused | Decided | 10 November, stop on request |
| 8 | The board is a real object in the hall, split-flap over the live map | Decided | 9 November line map; "Signs in the world" |
| 9 | Walk-between is a junction's default | Decided | generic-lines §6, blockout ruling 6 |
| 10 | The passenger car stands at the platform | Decided | 10 November, longer trains |
| 11 | The Roundhouse holds the garage only; line trains never use the table | Decided | 9 and 10 November. A set kept there (ruling 1) would need him to change it |
| 12 | The express is the next service train, not a passenger set | New | Staged: A first, B with the first interchange. Owner question 1 |
| 13 | "Rotunda" read as the station hall | New | Call at the hall; where the train comes from is question 1 |
| 14 | The express passes pulled levers; the train behind serves them; the worst wait rises a headway | New | **Change:** it stops for a lit lever. Finding 2 |
| 15 | One express a line at a time | New | Yes |
| 16 | The wait never holds another train and ends early | New | Yes; the flaps must show the true time left, not jump |
| 17 | An empty express still runs | New | Yes, but the caller can cancel at the board during the wait (finding 5) |
| 18 | Anyone aboard can Go now, on the cord | New | Yes; guard the cord for the first seconds after leaving (finding 5) |
| 19 | A cord pull on the way ends the express there | New | Yes: slapstick among friends, and nobody is trapped aboard |
| 20 | Only junction stations call; halts keep the lever | New | Yes; it is why the build waits for a second junction station |
| 21 | A train owing a cargo stop is never claimed | New | Yes |
| 22 | The express comes free with the hall board | New | Yes |
| 23 | The board gains a pick on the map itself, camera eased to it, no list | New | Yes; replaces 9 November's "no picker". 2D page first |
| 24 | Far-away friends get no notice | New | Yes for now; the halt displays show it |
| 25 | Interchanges bought per junction, at the junction, for steel and rails | New | Yes. Say which is wallet and which is material; the owner's currency is "Boogles" |
| 26 | The track gang lays it on a 1.2 s hold | New | Yes as an upgrade. It bends 2 November's "you still haul each track segment"; say so |
| 27 | Interchanges carry the express only | New | Yes, and the train that crosses is the set of ruling 1, not a service train |
| 28 | The guest runs back empty and out of service | New | Only for a dedicated set; it must wait a dwell and announce it, or riders are carried home |
| 29 | Home and Bell Rock never; three junctions fit | New | **Change:** High Gorge, Canopy Town, West landing; a held change everywhere else. Finding 3 |
| 30 | Reach is transitive through interchanges; no held change | New | **Change:** the held change is the base. Question 4 |
| 31 | The interchange install plays as a shared moment for everyone | New | Follow engine-garage call I10 instead: no camera taken; far players hear it and see their board flip |
| 32 | It replaces the 1 November jump | New | Yes. Ruling 6, question 5 |
| 33 | First build now, on line 2 to the Pier | New | **Change:** after v27. Ruling 2 |
| 34 | 20 s wait, the 5 s dwell inside it | Default | Tunable; alone, Go now is the short cut |
| 35 | Three bell rings, the headboard's clank, the last 5 s ticking, guard's whistle then the engine's; two short whistles on arrival; the headboard carried off | Default | |
| 36 | A gold ring on the express's marker; "Express from Home" at the destination | Default | |
| 37 | The board at the head of the island, about 10 m from the stop mark | Default | On the hall's back span, as step 12 |
| 38 | Pad steps a ring along the lines; touch taps a stop; walking off cancels | Default | |
| 39 | A dim stop can be ringed and says why | Default | Never dim for ever (call 29) |
| 40 | The cord glows when everyone is aboard | Default | |
| 41 | No cool-down beyond one a line | Default | |
| 42 | Interchange install is Large: about 14 s of laying, points bolted, one little guy falls over, stops flip lit one by one | Default | |
| 43 | The Roundhouse screen lists interchanges for planning | Default | |
| 44 | Draw junction approaches with 65 m parallel | Default | Add a 40 m bay road (finding 6) |
| 45 | The draft strings | Default | None are The Boogler's; no suspect lines |

### Findings, ranked

1. **Home has a siding, and it is the rotunda (change the brief before he answers).** Layout B's engine spur leaves
   line 2's road at s 5.5 and runs over the 9.6 m table to the open stall; the shunter already brings the footing
   wagon out that way with one reversal at the buffer stub. An engine and one coach are 8.5 m. So "you board the
   passenger only train from the rotunda" can be drawn at Home as he said it: the set stands in the Roundhouse 6 s
   from the hall, friends board it there off the running line, and it comes out when the end block is free. The cost
   is real (the table carries the works copy, there is one open stall, and call 11 would need his change), but the
   verdict's "Home's layout B has none" is wrong and the brief's reading of "rotunda" hides the choice.
2. **A train running dark past a pulled lever is the 10 November complaint, built on purpose.** "A train didn't stop
   for him at a station"; request stops replaced call legs because "the train missed me". Line 2's worst wait already
   measures 70–95 s against a bound of about a minute; one more headway makes it about two minutes, for a player who
   is probably carrying a footing. In a room of one to three, a lit lever is a friend, and stopping costs the riders
   11 s. Recommended: the express stops for a lit lever its way; it skips cargo stops and, when passenger-trade gives
   trains town calls for little guys, those. `trainServes` is then untouched and the griefing bullet goes.

   Owner, 10 November: 'It runs past; the next train serves them.' The brief's original rule stands.
3. **The interchange list misses the junction that matters.** See ruling 4. Also: Canopy first, Bell Rock's top level
   carries both the Island to Canopy line and the bay line's bay, so "Bell Rock never" is only true of the two-level
   pair.
4. **The ring has two ends at one hub, and the board must send you the short way.** Home's hall and West landing are
   100–130 m apart. Called at the hall, an express to Saltpan would run about 8 km east when it is one stop from West
   landing; Canopy Town is 4.9 km by the ring and 2.4 km by the bay line. The brief has no rule for which way or
   which platform. Recommended: the two boards are one hub; a stop nearer by the other end is shown "from West
   landing" with the walk drawn, and at a through junction the express leaves the shorter way round.
5. **Solo and slips.** Calling, then missing the train, sends an empty express off and locks the line's board for
   the trip: let the caller cancel at the board. Go now and the stop request share the cord, so a pull a moment after
   the whistle asks for Quarry and ends the express: ignore cord asks until the train has cleared the platform.
6. **Reserve the room now.** Each designed junction station's plan should keep one 40 m bay road with a 65 m parallel
   throat, whether or not B is built; it costs nothing on paper and the Gorge's 90 m split is the place it will not
   fit later.
7. **Money and work.** "Steel and rails, from the shared wallet" mixes materials with coin; and an interchange is
   track, which the 2 November decision keeps hands-on. As an upgrade it is fine; the brief should say it bends that.

### Port from Place

- The 1 November departures board (`?proto=board`): its split-flap face and live map, **keep** (decided 9 November);
  its `v=ride` pick, **keep, changed** (a claim on a real train); its `v=hop` jump, **cut** (owner, 10 November).
- The track layer's panel laying and the folk crew for the install: **keep**.

### Before the owner answers

Rewrite question 1 to offer A, B and the staged answer, with the Roundhouse fact; change call 14; replace the
"three interchanges" paragraph with ruling 4; add the two-ends rule; move the first build behind the v27 trigger.

Applied to the body on 10 November, except call 14: the owner kept the original rule (finding 2).

### Owner questions

1. **Is the express the ordinary train with a headboard, or a passenger train of your own that stands ready?**
   Recommended: both, by stage. First the next service train, with a headboard. Later a passenger set the room buys,
   kept at a bay at each big station (at Home it can come out of the Roundhouse, as you said), which is also the
   train that crosses interchanges and that the little guys ride for trade.
2. **Build it now on the 0.7 km line, or when the line reaches Ring Island?** Recommended: when v27 is live and
   Home's hall map exists. Today it saves nothing and can't bring you home.
3. **Should an express pass a friend who has pulled a lever?** Recommended: no. It stops for them (11 s) and skips
   only cargo and little-guy calls.
4. **"Any station on the network": only where an interchange fits, or everywhere?** Recommended: everywhere from the
   first junction, by a connecting train held for you across the platform; an interchange is the upgrade that removes
   the walk, drawn in at High Gorge, Canopy Town and West landing.
5. **Does this replace the 1 November jump for good, so nothing in the game travels instantly, an invited friend
   included?** Recommended: yes.
