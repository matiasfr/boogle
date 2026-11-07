> **Status: Sickle Isles chosen and greyboxed (2026-11-06); owner decisions after the greybox recorded below
> (2026-11-07).** The other four layouts stay proposals. No change to the economy model.

# Map prototypes

Five top-down layouts for the world after Ring Island, drawn in [map-prototypes.html](map-prototypes.html). They answer
the owner's 6 November note on the ring map: keep the hub, the shortcuts, the loops and the branch choice, but make it
irregular and surprising, "not level one, level two, level three, level four", and "not just an actual circle".

**Revision: the art-surface lens.** The owner, on the first version: "by having smaller islands or more varied types
of landmass, we can invest more in fleshing out the artwork and styling and aesthetic for a smaller area, as opposed to
a larger area where we may not be able to take as much care in how it looks." Every option now has art-surface numbers,
Sickle Coast is reworked as **Sickle Isles** (its crescent broken into small islands), Figure Eight's big islands
shrink, and Spine and Ribs and The Climb turn their big landmasses into backdrops with walkable pockets. This lens
weakens those two most.

## Owner decisions after the greybox (7 November)

The Sickle Isles greybox (`?greybox=sickle` on the dev server; [src/proto/greybox/](../../src/proto/greybox/README.md))
answered the layout's open questions in 3D at the real scale. The owner's calls, all now in the page's JSON, which the
greybox reads as its one source:

1. **Scale stays; the fog extends.** "I like the sense of scale. We should just extend the fog if we need to." The
   game's fog ran out at 1.5 km, so from Home only Bell Rock and the classic island showed. The outdoor fog is now the
   crossing's 3.6 km everywhere (`OUTDOOR_FOG_FAR`, held by the frozen sky). Performance before and after is in the
   greybox report; other options come back if it costs too much.
2. **The tweaks.** A chalk islet on each side of Canopy Town (six islets, one kit), so the wall reads as one, with
   Canopy's giant crowns rising over it and the line entering the town through a 70 m cleft; the Gorge split turned so
   its gap points at Ring Island's aperture; the sea cave moved to the sandstone face 65 m from the West landing, which
   you see from spawn; a 75 m crane, lit at the top; salt stacks, sheds and a wind pump for the Saltpan.
3. **The Original Island is the classic island**, The Boogler's, at the world origin in Sickle Bay ("it could be
   anywhere; I'll take your best suggestion"). Seen across the water from the first minute and reached last, like
   Breath of the Wild's castle. The far "Original Island" is gone; the final crossing is a lantern causeway from Bell
   Rock, lit from the Notch. Bell Rock and the bay shortcut moved 400 m north to clear it: the shortcut is 1.21 km
   (1.6 min) against 2.90 km (4.0 min) the long way, and Canopy Town drops from 5.2 to 2.9 minutes when it's first.
4. **Geology and shores.** Every island has a geology note, an elevation and a shallow shelf under the water (sand or
   rock), so the sea lightens toward the shore as it does at Home's cove: chalk islets 120 m on a wave-cut platform,
   basalt stacks 85 m with a boulder apron, a 12 m forest isle on sand, a 55 m sandstone cliff over a 3 m harbour apron,
   a granite skerry in the bay shallows, salt flats on a sand bar, a limestone arch on a reef.
5. **A proper port.** High Port has a real harbour: a breakwater that carries the line in from the Saltpan, quays and
   warehouses on the apron, a dock crane, moorings in the basin and a lit harbour mouth facing the mainland.
6. **A greater civilization on the horizon.** A backdrop mainland to the west and south-west: coastal hills to a 220 m
   ridge and a city with towers, a lighthouse and a smoke plume, never reached in the main game. It is seen from the far
   side of the Wall (High Port, Canopy Town, the Notch's telescope, the Gorge rim, the wall-top line), 1.6 to 2.6 km
   away, and not from Home, Ring Island or the bay: 3.3 km and more from Home, under 3% contrast in the fog, and mostly
   behind the Wall and High Port. Cargo boats and a passenger steamer come and go between High Port's harbour mouth and
   the city (ambient routes, cosmetic). Later it could carry the story frame parked in [ideas](../ideas.md) (the
   players secretly doing The Boogler's work) and the visitors idea: boats bringing little-guy visitors, maybe new
   residents or helpers.

## What the page shows

- **Real scale.** Home (Threefold Reach), Split-rock Works, the pier and the Ring Island anchor `(330, -1120)` are where
  [world-map.html](world-map.html) puts them; everything after is proposed. The grid is 1 km. The first sea crossing is
  751 m as drawn.
- **Rides.** Computed from the drawn lines with the economy model's settings: length at 20 m/s, plus 10 s to speed up
  and slow down and 8 s dwell per link, plus 20 s to board.
- **Stages.** A stepper plays the progression: which places and lines exist, what's visible but unreachable (dashed
  places, blue sightlines, red locks), and how a shortcut changes the ride table. A toggle swaps the order choice, and
  fog can be turned off to see the whole layout.
- **Art surface.** Computed from the same data (method below), in a table and in each option's pitch card. Backdrop
  land is hatched on the map.
- **Hours.** Each stage's hour mark is the model's solo pacing moved to that layout's order. They are allowances, not
  measurements.

## The owner's constraints (6 November)

1. **Every area is integral.** No optional content: every place is visited in one playthrough, and small stops sit on
   the way rather than on detours. Secrets are on the main path.
2. **Mostly linear progression, not geography.** The unlock order is mostly linear, with one order choice where both
   sides are visited. Each layout has its choice at a different point.
3. **Double back.** Each layout has at least one gate you see early and open later with an ability, back through
   earlier places, with a shortcut making the return quick.
4. **Use the best design knowledge, not the brief to the letter.** Stepping Stones departs from the brief on purpose.
5. **Small, dense and well dressed over big** (the revision). Spend the art on less land, with sea between.

## The art-surface lens

### How it's measured

- **Walkable land** is the area of land a player can reach on foot, new land only (Ring Island onwards). Home as drawn
  is about 0.25 km², so "× Home" says how many Home islands of dressing each layout asks for. **Backdrop land** is seen
  from the line but not walked: ridges and slopes that need a good silhouette and coarse dressing, not detail.
- **Track** is split by what's under it, sampled every 10 m: **on land** (seen up close from the train and on foot,
  dressed with sleepers, cuttings, fences and stations), **over sea** (one repeated trestle kit over water) and **in
  tunnel** (an interior).
- **Biomes** are the distinct kinds of walkable land to author (a forest island, chalk islets, a harbour). **Set
  pieces** are the gates and secrets, each a hand-built moment.
- **Sea in view** samples the ground within 1 km of every station: the share that is water. Sea and sky are cheap,
  readable and already look good: the renderer has its water ([water-render.ts](../../src/render/water-render.ts)) and
  sky ([sky.ts](../../src/render/sky.ts)). Land has to be dressed.
- **Most land near one station** is the largest land area within 1 km of any station: a rough stand-in for what must be
  resident at once.

### The numbers

| Layout          | Walkable land      | Backdrop | Walkable pieces | Track on land / over sea / tunnel | Biomes | Set pieces | Sea in view | Most land near one station |
| --------------- | ------------------ | -------- | --------------- | --------------------------------- | ------ | ---------- | ----------- | -------------------------- |
| Sickle Isles    | 1.4 km² (5.6× Home) | —        | 14              | 6.0 / 6.3 / 0.7 km                | 8      | 6          | 89%         | 0.53 km²                   |
| Figure Eight    | 1.5 km² (6.3×)     | —        | 8               | 3.8 / 6.9 / 0.9 km                | 8      | 5          | 89%         | 0.44 km²                   |
| Spine and Ribs  | 1.5 km² (6.1×)     | 8.4 km²  | 8               | 6.8 / 3.2 / 3.5 km                | 8      | 5          | 52%         | 2.98 km²                   |
| The Climb       | 1.3 km² (5.2×)     | 5.3 km²  | 7               | 13.3 / 2.1 / 2.6 km               | 7      | 5          | 52%         | 3.14 km²                   |
| Stepping Stones | 1.6 km² (6.4×)     | —        | 11              | 4.9 / 7.3 / 0.0 km                | 10     | 5          | 88%         | 0.68 km²                   |

What changed from the first version:

| Layout                         | Before: land, sea in view, most land near one station | After                                               |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| Sickle Coast → Sickle Isles    | 4.7 km² walkable, 74%, 1.93 km²                       | 1.4 km² walkable, 90%, 0.49 km²                     |
| Figure Eight                   | 2.1 km², 86%, 0.72 km²                                | 1.5 km², 89%, 0.44 km²                              |
| Spine and Ribs                 | 8.7 km² walkable, 52%, 2.98 km²                       | 1.5 km² walkable + 8.4 backdrop, 52%, 2.98 km²      |
| The Climb                      | 5.6 km² walkable, 52%, 3.14 km²                       | 1.3 km² walkable + 5.3 backdrop, 52%, 3.14 km²      |
| Stepping Stones                | 1.6 km², 88%, 0.68 km²                                | Unchanged; biomes named                             |

The backdrop revision brings every layout's walkable land to roughly 1.3 to 1.6 km², about six Home islands. What it
can't change is the view: from the valley line or the mountain terraces, half the ground in sight is land, and the
backdrop is up close for minutes at a time. That's why this lens favours the island layouts.

### The owner calls behind it

- **Geometry budgets follow prominence.** Hero areas get more geometry, things placed by the hundred are instanced and
  lean, and "the real limit is what is resident at once on the Mac and on mobile, not the size of the whole catalogue",
  once loading can stream by area and distance ([owner calls](../agents/owner-calls.md#owners-standing-calls)). Small
  islands make the hero areas obvious, one per island, and the instanced pieces obvious too: the trestle kit, the chalk
  islet kit, trees.
- **Gameplay shapes the environment.** Decide what an area is for before dressing it. An island is a clear unit of
  purpose: this one is the forest town, that one the harbour. The sea between is the boundary that reads as "not this
  way" without an invisible wall, and a sea gap is also where a crossing, the railway's main verb, goes.
- **The download budget.** 25 MB first load, 100 MB in all streamed by priority, 4 MB per asset, 2048 px textures for
  hero surfaces only ([decision log, 6 November](../proposals/boogle-2.md); [asset pipeline](../plans/asset-pipeline.md)).
  Home and the first crossing are the first load; each later island is one streamed bundle, roughly what's left of the
  100 MB divided by the number of islands. Sea and sky cost almost nothing per island.
- **Streaming and draw distance.** With 300 m or more of sea between places, one island is resident at full detail and
  its neighbours are silhouettes: a low-detail mesh or impostor against the sky, which is also the "see it early, reach
  it late" view the progression wants. A mainland or a mountain has no such seam, so its whole visible face is resident
  from anywhere on it, which is what the last column measures.

### Small, dense, handcrafted worlds

- **A Short Hike** is a small island packed with things to find around one peak ([developer account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/);
  [GDC postmortem](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A)).
- **The Wind Waker** used the sea to invent many distinct islands, and Nintendo later shortened its sea travel for the
  HD release ([Iwata Asks](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-The-Wind-Waker-HD/The-Legend-of-Zelda-The-Wind-Waker-HD/3-The-First-Part-Is-Perfect-But-/3-The-First-Part-Is-Perfect-But--807230.html)).
  Lesson both ways: islands give identity, and repeated sea crossings need to stay short and improve.
- **Animal Crossing: New Horizons** makes one small island the whole world; the team chose a deserted island to give
  players a fresh start ([The Verge interview, 2020](https://www.theverge.com/2020/3/20/21188006/animal-crossing-new-horizons-design-interview-aya-kyogoku-hisashi-nogami),
  via search summary).
- **Islanders and Townscaper** are compact vignettes: a whole place you can see at once, with every piece placed with
  care ([Islanders interview](https://gameworldobserver.com/2019/06/14/islanders); [Townscaper interview](https://pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint)).
- **Super Mario Odyssey's kingdoms**: Motokura describes "a high density of gameplay elements in a relatively small
  amount of space" ([Game Informer](https://www.gameinformer.com/b/news/archive/2017/06/17/marios-developers-on-hat-capture-and-peachs-love-for-mario.aspx),
  via search summary). Each Boogle island is a small kingdom with its own idea.

## Design grounding (first version)

- **Dark Souls: interconnection and the shortcut home.** Firelink is where routes start, and the reward for the long way
  round is a lift or door that drops you back there ([Mark Brown, Boss Keys, "The World Design of Dark Souls",
  transcript](https://amara.org/subtitles/4zZSGmv4Qxsz/en/1/download/The%20World%20Design%20of%20Dark%20Souls%20%20Boss%20Keys.en.txt),
  via search summary, already cited in [upgrade-economy](../research/upgrade-economy.md#addendum-6-november-ring-and-hub-worlds-and-shared-stock)).
  Every layout builds its shortcut after the place has been reached the long way, so the saving is felt against a
  remembered ride.
- **Metroidvania gating: locks near keys, quick returns.** Metroid Dread keeps most locks close to their keys and gives
  a teleporter where one is far ([Boss Keys, "Why You Didn't Get Lost in Metroid Dread", transcript](https://amara.org/subtitles/Aci4iDbgsAtY/en/1/download/Why%20You%20Didnt%20Get%20Lost%20in%20Metroid%20Dread.en.txt),
  via search summary). Each double-back here is one gate, seen early, with a shortcut or tunnel that makes the return a
  short ride.
- **Hollow Knight: getting lost and finding your way.** Team Cherry describe keeping discovery alive while still giving
  a useful map as their biggest design challenge ([Game Developer](https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-);
  [PC Gamer](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map), via search summary). Mark Brown notes
  that Silksong's main path is as simple as a one-line metro map while the world around it is dense
  ([GMTK](https://gmtk.substack.com/p/the-world-design-of-hollow-knight), via search summary): linear unlocks in a
  non-linear place.
- **Breath of the Wild: the triangle rule and landmarks.** Triangular forms make the player choose over or around, and
  hide things to be discovered (CEDEC 2017; [Game Developer summary](https://www.gamedeveloper.com/design/5-design-lessons-learned-from-i-the-legend-of-zelda-breath-of-the-wild-i-);
  [Matt Walker's translation](https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399); [GMTK](https://gmtk.substack.com/p/how-nintendo-solved-zeldas-open-world),
  via search summary).
- **Outer Wilds: knowledge as a key** ([Game Developer](https://www.gamedeveloper.com/design/live-die-repeat-how-i-outer-wilds-i-piques-curiosity-in-an-ambivalent-solar-system)).
- **A Link Between Worlds: order choice needs places built around their own tool** ([Iwata Asks](https://iwataasks.nintendo.com/interviews/3ds/a-link-between-worlds/0/5)).
- **Hub and spoke versus open.** A strict hub makes regrouping easy for drop-in co-op but can feel like a menu; an open
  web feels like a place but can scatter friends. Figure Eight is the most hub-bound, Spine and Ribs the least.

## The options

All five keep the material order up to Ring Island (footings, then steel) and the branch pair from the brief: High
Gorge gives copper, the powered pick and a longer hook reel; Canopy Town gives fibre, the carrying sling and glider
cloth.

| Layout          | Places (stops) | New rail | Loops at the end | Order choice   | Double-backs | Mean ride at the end | To the ending |
| --------------- | -------------- | -------- | ---------------- | -------------- | ------------ | -------------------- | ------------- |
| Sickle Isles    | 11 (4)         | 13.0 km  | 3 / 4            | Stage 3, 3.5 h | 1            | 2.3 min              | 2.6 min       |
| Figure Eight    | 10 (3)         | 11.6 km  | 3                | Stage 5, 5.3 h | 2            | 2.5 min              | 4.0 min       |
| Spine and Ribs  | 9 (2)          | 13.5 km  | 2                | Stage 4, 3.9 h | 1            | 4.4 min              | 8.4 min       |
| The Climb       | 10 (3)         | 18.1 km  | 3                | Stage 3, 3.5 h | 1            | 4.9 min              | 9.5 min       |
| Stepping Stones | 12 (5)         | 12.3 km  | 3                | Stage 3, 3.4 h | 1            | 2.7 min              | 5.6 min       |

Loops are first pick / second pick where they differ. For scale, the model's ring had the second branch 6.85 km from
Home before any shortcut.

### 1. Sickle Isles (Sickle Coast, reworked): a lopsided chain of small islands round a bay

**Feel:** "The long way round, island to island under a broken wall of chalk cliffs, then a shortcut that drops you
home in a minute." **References:** Dark Souls (the lift back to Firelink), Breath of the Wild (a landmark on the
skyline from day one), The Wind Waker (every island its own silhouette), Super Mario Odyssey (a small, dense kingdom).

**Pitch** (revised 7 November). West of Home a lopsided chain of small islands curls round a shallow bay. Its spine is
the White Wall: six narrow chalk sea-cliff islets, 120 m tall, that read as one broken wall on the skyline, with Canopy
Town's giant crowns rising over it. Each place is its own island, small enough to dress densely: High Gorge is a sea
stack split in two, its gap pointing at Ring Island; Canopy Town is a forest island behind a cleft in the Wall; High
Port is a harbour under a cliff-top town; Lantern Notch is a sea arch facing the mainland on the far horizon. The
Boogler's island, the classic island, sits in the bay itself. From Ring Island you pick High Gorge (a long trestle out
to the stack) or Canopy Town (the bay trestle by Bell Rock). The bay shortcut from Home to Bell Rock comes next and
cuts Canopy Town's ride from 5.2 to 2.9 minutes when it's first. High Port's lit crane is on the skyline from day one,
but you reach it after both branches by doubling back: the powered pick opens the sea cave in the sandstone face by the
West landing, and the line runs past the Saltpan and along the breakwater into the harbour, where the crane lifts it up
the cliff. The White Wall line then hops along the chalk islets on short bridges to close the ring. Last, you light the
Notch's lantern and ride the lantern causeway from Bell Rock to The Boogler's island, which you have seen all game.

**Kept from Sickle Coast:** the lopsided bay, the cliff wall as a skyline landmark, the bay shortcut, the crane visible
from day one, the sea-cave double-back and the order. Mean ride 2.3 minutes; the ending is now 2.6 minutes from Home.
**Changed:** the 4.3 km² crescent is gone; the wall is a string of islets; the Gorge is a split stack; the Notch is a
sea arch instead of a tunnel through the wall; the ring-closing line hops between islands instead of running along a
cliff top.

- **Art surface.** 1.4 km² walkable, down from 4.7, in fourteen small pieces; 89% sea in view, up from 74%. The six
  chalk islets are one modular kit placed six times, so the White Wall is one set piece, not six. Half the new track is
  over water. The Original Island already exists, and the mainland is a far silhouette layer, so neither counts.
- **Co-op pacing, strengths.** The shortest rides of the five. Home stays the hub: the bay shortcut and the sea cave
  both start there, so friends regroup in town. A loop closes at 4.4 hours, the big lap at 7.3. The double-back passes
  through Home itself.
- **Risks.** Checked in the greybox (7 November): with four islets the wall read as two masses either side of Canopy,
  so it now has six. It still completes as a ring. The Port after both branches has the most complex bill.
- **Economy model fit.** Order becomes Ring, first branch, shortcut, second branch, Port (double-back), ring closure,
  ending. The Port's refit takes four kinds of material. Stops: Bell Rock, Saltpan Halt, Port Quay, Lantern Notch.

### 2. Figure Eight: two loops that cross at Home

**Feel:** "Home is the crossroads: every trip passes back through town, and town gets busier as both loops fill."
**References:** Hollow Knight (a central place every route runs back through), Dark Souls (Firelink at the junction).

**Pitch.** Home sits in the waist between two seas. The small north loop (Ring Island, the Gorge isle, Copperstair,
back to the pier) has no choice and closes at 4.4 hours. You double back home: the powered pick breaks the cove cliff
you've seen from town since day one. Then the order choice: round the south loop west to Canopy Town first or east to
High Port first. A tunnel under the Needle Bell joins the loops so trains run the eight. The ending is a second
double-back, to a ledge on Copperstair reached with glider cloth.

- **Art surface.** Already islands; the forest and port islands shrink by about a third (2.1 to 1.5 km² walkable).
  The least land-side track (3.8 km). Home is the place every trip passes, so the place that must look best already
  exists.
- **Co-op pacing, strengths.** The strongest hub, an early first loop, two double-backs through town.
- **Risks.** The most "level one, level two": two loops in sequence. The choice comes late (5.3 hours) and is between
  Canopy and the Port. The deep water that keeps the loops apart has to read clearly.
- **Economy model fit.** High Gorge is fixed as the first branch, and the choice becomes Canopy Town or High Port, so
  `BRANCHES` changes meaning. An early north-loop closure. The Port must accept copper alone when it comes first.

### 3. Spine and Ribs: a long valley line with ribs that tunnel back

**Feel:** "A straight shot into the unknown, then the delight of a tunnel that spits you out somewhere you've been."
**References:** Hollow Knight: Silksong (a one-line main path in a dense world), Metroid Dread (a lock you see long
before its key), Dark Souls (the door that joins two places you thought were apart).

**Pitch.** Beyond Ring Island is the Uplands. A causeway reaches Landfall and the line runs up the Long Valley to Fork
Halt, where you see both passes and High Port's lights behind a rockfall. Each rib goes round its ridge the long way;
once connected, a tunnel under the ridge comes out at Landfall, closing a loop. The rockfall needs the hook reel and
glider cloth together, so the double-back to the Fork comes after both ribs.

- **Art surface: weakened.** Revised so the Uplands is a backdrop with six walkable pockets (landfall, valley floor,
  fork, the two rib towns, the port). Walkable land is now in line with the islands (1.5 km²), but 8.4 km² of backdrop
  is in view the whole time, half the ground in sight is land, and the most land near one station is six times Sickle
  Isles'. A mainland has no seams to stream by.
- **Co-op pacing.** The clearest Metroidvania structure and the best surprise (the tunnels), but long rides (mean 4.4
  minutes, 8.4 to the ending) and Home stops being the hub.
- **Economy model fit.** A spine step before the branch; each branch's spoke becomes its tunnel; no ring closure; the
  Port after both. Travel time rises well above the model's.

### 4. The Climb: a ring that climbs a mountain

**Feel:** "Always going up: the summit you saw from the pier gets closer each lap, and gliding down is the reward."
**References:** A Short Hike (a peak in view from the first minute), Breath of the Wild (over or around; gliding down).

**Pitch.** Mount Brae, 610 m, stands north-west of Ring Island with a lantern on its summit. From Brae Foot go east up
the switchbacks to High Gorge or west round to Canopy Town, each with a straight drop line back down. The halves meet at
Windgap, closing the first lap. You double back to Brae Foot for the anchor on the cliff above the station and ride the
Spiral up inside the mountain to High Port on the crater lake, then take the Long Descent to the sea.

- **Art surface: weakened most.** Revised so only five terraces are walkable (1.3 km²), but the 5.3 km² mountain is the
  view from everywhere and so is a hero asset whether walked or not. 13.3 km of track runs on land, the most of the
  five: switchbacks and drop lines look at slopes up close. The whole mountain is resident from anywhere on it.
- **Co-op pacing.** The strongest landmark and sense of height, but the most rail (18.1 km) and the longest rides.
- **Economy model fit.** A Windgap step before the Port; the Port after both branches; climbing would need a slope
  penalty; drop lines could be downhill-only, which breaks symmetric distances.

### 5. Stepping Stones: a compact archipelago web (departs from the brief)

**Feel:** "A sea of islands you can see from each other; a loop closes every hour or so, so most evenings end on a
finished circuit." **References:** Outer Wilds (places in view of each other; a knowledge gate), A Short Hike (a small,
dense world), Animal Crossing and Townscaper (a whole island as one vignette).

**Pitch.** Islands scattered round Home, all visible from its shores. Pick the Stacks (High Gorge, east via Ring
Island) or Canopy Town (west via Kelp Halt); whichever you take first closes its own small triangle back to Home. The
other follows, then you double back to Split-rock: from its rim you glide out to light the Long Bar beacon, which shows
the safe line through the shoal to High Port. The Trench span closes a third loop; the Reef Steps lead to the Original
Island.

**Why depart from the brief.** The brief's ring closes once, at about 6.9 hours. A sitting is 1.5 hours
([ring-data.ts](../../dev/economy/ring-data.ts) `sessionHours`), so a group playing evenings meets that payoff once.
Here three small loops close at about 4.2, 5.3 and 7.0 hours, and every place is within 2.3 km of Home as the crow flies.

- **Art surface: strengthened.** Already the small-island case: no tunnel, 88% sea in view. The cost runs the other
  way: ten biomes, the most of the five, so each island needs one strong idea rather than full dressing.
- **Co-op pacing.** Frequent closure, short rides (mean 2.7 minutes), Home as the hub of three triangles.
- **Risks.** Island-hopping can repeat itself (the Wind Waker warning). No single celebratory lap.
- **Economy model fit.** Three loop closures instead of `ring.close`; the Port reached from Split-rock; crystal seeds from
  Kelp Halt, Bell Terraces and Tern Rock.

## What the economy model would need

[ring-data.ts](../../dev/economy/ring-data.ts) is owned by another agent; nothing here changes it. Since the first
version it takes its distances from a `LINKS` table, which is most of what these layouts need:

1. **Replace `LINKS` with the chosen layout's lines.** The page's line lengths are the numbers (the stepper's detail
   panel shows each one).
2. **Make `placeKm` a shortest path.** [ring-sim.ts](../../dev/economy/ring-sim.ts) still hard-codes the ring's shape in
   `placeKm` (entry, two ring segments each way, spokes) and three states in `kmFrom`. Every layout here has shortcuts,
   loops and double-backs arriving at different steps. A shortest path over the links each step has built covers all
   five; the page's `rides()` function is that calculation.
3. **A route order per layout.** Every option except Figure Eight puts High Port after both branches (four kinds of
   material in its refit). Spine and Ribs and The Climb add a step before the branch choice; Figure Eight adds an early
   loop; Stepping Stones replaces `ring.close` with three loop closures.
4. **Loops instead of one ring.** If the ring closure adds a train, count it per closed loop.

## Recommendation

**Greybox Sickle Isles first.** It keeps everything that made Sickle Coast interesting (the lopsided bay, the wall on
the skyline, the bay shortcut, the crane seen from day one, the sea-cave double-back) and now has the art surface of the
island layouts: 1.4 km² walkable, 90% sea in view, under half a square kilometre of land near any station, and the White
Wall built from one repeated kit. It still has the shortest rides. Stepping Stones is the fallback if playtests find the
single lap too late or the wall doesn't read; Spine and Ribs and The Climb are the ones this lens argues against, and
their best ideas (a tunnel that comes out somewhere familiar; a summit seen from everywhere) can live inside Sickle Isles
as single set pieces.

The smallest tests: greybox the four chalk islets and check from Home that they read as one wall; ride the 751 m
crossing and the 1.7 km stack line at 20 m/s and ask whether a 2.5-minute ride feels like a journey or a wait.

## Open questions

1. **Which layout goes to a greybox?** Recommended: **Sickle Isles**, with Stepping Stones as the fallback.
   Answer: **Sickle Isles** (owner, 6 November); greyboxed, with the decisions above (7 November).
2. **Does High Port come after both branches?** Four of the five layouts do this, so the Port recombines everything and
   is the payoff of a double-back. The brief puts it between the branches. Recommended: **yes, after both**.
   Answer: \_\_\_
3. **Is "one island resident at a time" the streaming rule for places after Ring Island?** Recommended: **yes**: at
   least 300 m of sea between walkable islands, each island one streamed bundle, neighbours as silhouettes, so the
   island count rather than the world's size sets the art and download cost. Answer: \_\_\_

## Limits

All positions after Ring Island, footprints, terrain and line routes are proposals. Art-surface numbers come from the
drawn shapes: areas use the raw outline, views sample a 50 m grid within 1 km of each station, and nothing accounts for
height, so a cliff and a beach count the same. Hours are the model's solo pacing moved to each order, not new modelling;
rides are plan-distance estimates without curves, gradients or timetables. Sources marked "via search summary" were
found by live web search on 6 November and not read in full. No reference game or Boogle build was played. Not tested
on a device.
