> **Status: proposed (2026-11-06).** Design only; no game code and no change to the economy model.

# Map prototypes

Five top-down layouts for the world after Ring Island, drawn in [map-prototypes.html](map-prototypes.html). They answer
the owner's 6 November note on the ring map: keep the hub, the shortcuts, the loops and the branch choice, but make it
irregular and surprising, "not level one, level two, level three, level four", and "not just an actual circle".

## What the page shows

- **Real scale.** Home (Threefold Reach), Split-rock Works, the pier and the Ring Island anchor `(330, -1120)` are where
  [world-map.html](world-map.html) puts them; everything after is proposed. The grid is 1 km. The first sea crossing is
  751 m as drawn, not the model's 1.2 km.
- **Rides.** Computed from the drawn lines with the economy model's settings: length at 20 m/s, plus 10 s to speed up
  and slow down and 8 s dwell per link, plus 20 s to board.
- **Stages.** A stepper plays the progression: which places and lines exist, what's visible but unreachable (dashed
  places, blue sightlines, red locks), and how a shortcut changes the ride table. A toggle swaps the order choice, and
  fog can be turned off to see the whole layout.
- **Hours.** Each stage's hour mark is the model's solo pacing moved to that layout's order. They are allowances, not
  measurements.

## The owner's constraints (6 November)

These came in while the page was being built and shaped all five options:

1. **Every area is integral.** No optional content: every place is visited in one playthrough, and small stops sit on
   the way rather than on detours. Secrets are on the main path.
2. **Mostly linear progression, not geography.** The unlock order is mostly linear, with one order choice where both
   sides are visited. Each layout has its choice at a different point.
3. **Double back.** Each layout has at least one gate you see early and open later with an ability, back through
   earlier places, with a shortcut making the return quick.
4. **Use the best design knowledge, not the brief to the letter.** Stepping Stones departs from the brief on purpose
   (below).

## Design grounding

- **Dark Souls: interconnection and the shortcut home.** Firelink is where routes start, and the reward for the long way
  round is a lift or door that drops you back there ([Mark Brown, Boss Keys, "The World Design of Dark Souls",
  transcript](https://amara.org/subtitles/4zZSGmv4Qxsz/en/1/download/The%20World%20Design%20of%20Dark%20Souls%20%20Boss%20Keys.en.txt),
  via search summary, already cited in [upgrade-economy](../research/upgrade-economy.md#addendum-6-november-ring-and-hub-worlds-and-shared-stock)).
  Every layout builds its shortcut after the place has been reached the long way, so the saving is felt against a
  remembered ride.
- **Metroidvania gating: locks near keys, quick returns.** Metroid Dread keeps most locks close to their keys and gives
  a teleporter where one is far ([Boss Keys, "Why You Didn't Get Lost in Metroid Dread", transcript](https://amara.org/subtitles/Aci4iDbgsAtY/en/1/download/Why%20You%20Didnt%20Get%20Lost%20in%20Metroid%20Dread.en.txt),
  via search summary). Each double-back here is one gate, seen early, with a shortcut or tunnel that makes the return a
  short ride, so it reads as a payoff rather than a chore.
- **Hollow Knight: getting lost and finding your way.** Team Cherry describe keeping discovery alive while still giving
  a useful map as their biggest design challenge, and the map changed a lot during development ([Game Developer](https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-);
  [PC Gamer](https://www.pcgamer.com/how-to-design-a-great-metroidvania-map), via search summary). Mark Brown notes
  that Silksong's main path is as simple as a one-line metro map while the world around it is dense
  ([GMTK](https://gmtk.substack.com/p/the-world-design-of-hollow-knight), via search summary). That is the shape the
  owner asked for: linear unlocks in a non-linear place, which is what Spine and Ribs tests most directly.
- **Breath of the Wild: the triangle rule and landmarks.** Nintendo's field designers used triangular forms, hills and
  mountains, so the player chooses over or around, and so things appear from behind them as surprises (CEDEC 2017,
  Fujibayashi and Yonezu; [Game Developer summary](https://www.gamedeveloper.com/design/5-design-lessons-learned-from-i-the-legend-of-zelda-breath-of-the-wild-i-);
  [Matt Walker's translation](https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399); [GMTK](https://gmtk.substack.com/p/how-nintendo-solved-zeldas-open-world),
  via search summary). The White Wall, the ridges and Mount Brae are those triangles at railway scale.
- **A Short Hike: one visible goal in a compact world.** Hawk Peak is visible from the start and the world wraps around
  it ([developer account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/);
  [GDC postmortem](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A)). The Climb uses the peak;
  Stepping Stones uses the compactness.
- **Outer Wilds: knowledge as a key.** The team wanted players to collect knowledge rather than abilities
  ([Game Developer](https://www.gamedeveloper.com/design/live-die-repeat-how-i-outer-wilds-i-piques-curiosity-in-an-ambivalent-solar-system)).
  Stepping Stones' beacon shows the safe line through a shoal: once you know it, the line can follow it.
- **A Link Between Worlds: order choice needs places built around their own tool.** Each option's two sides are
  reachable with what you already have and give a different ability pair ([Iwata Asks](https://iwataasks.nintendo.com/interviews/3ds/a-link-between-worlds/0/5)).
- **Hub and spoke versus open.** A strict hub (every trip through Home) makes regrouping easy for drop-in co-op but can
  make the world feel like a menu; an open web feels like a place but can scatter friends. The five options sit at
  different points on that line: Figure Eight is the most hub-bound, Spine and Ribs the least.

## The options

All five keep the material order up to Ring Island (footings, then steel) and the branch pair from the brief: High
Gorge gives copper, the powered pick and a longer hook reel; Canopy Town gives fibre, the carrying sling and glider
cloth. Numbers are from the page, first pick / second pick where they differ.

| Layout          | Places (stops) | New rail | Loops at the end | Order choice    | Double-backs | Mean ride at the end | To the ending |
| --------------- | -------------- | -------- | ---------------- | --------------- | ------------ | -------------------- | ------------- |
| Sickle Coast    | 11 (4)         | 13.2 km  | 3 / 4            | Stage 3, 3.5 h  | 1            | 2.4 min              | 4.7 min       |
| Figure Eight    | 10 (3)         | 11.6 km  | 3                | Stage 5, 5.3 h  | 2            | 2.5 min              | 4.0 min       |
| Spine and Ribs  | 9 (2)          | 13.5 km  | 2                | Stage 4, 3.9 h  | 1            | 4.4 min              | 8.4 min       |
| The Climb       | 10 (3)         | 18.1 km  | 3                | Stage 3, 3.5 h  | 1            | 4.9 min              | 9.5 min       |
| Stepping Stones | 12 (5)         | 12.3 km  | 3                | Stage 3, 3.4 h  | 1            | 2.7 min              | 5.6 min       |

For scale, the model's ring has the second branch 6.85 km from Home before any shortcut, and the brief's first spoke
cuts that branch's ride from about 3.2 to 1.6 minutes.

### 1. Sickle Coast: a lopsided ring with a long cliff arc

**Feel:** "The long, scenic way round under a wall of cliffs, then a shortcut that drops you home in a minute."
**References:** Dark Souls (the lift back to Firelink), Breath of the Wild (a landmark on the skyline from day one; a
cliff wall that asks over or around).

**Pitch.** West of Home a crescent of high land curls round a shallow bay; its inner face is the White Wall, a 120 m
cliff. Home sits off-centre on the east side, so one side of the ring is short sea hops and the other is a long cliff
arc. From Ring Island you pick High Gorge (a ledge cut into the Wall's north face) or Canopy Town (a bay trestle by Bell
Rock). The bay shortcut from Home to Bell Rock comes next, which halves Canopy Town's ride (5.2 to 2.6 minutes when
it's first). High Port's crane is on the south-west skyline from day one, but you reach it after both branches by
doubling back: the powered pick opens a sea cave under Home's own south cliffs, the line runs past the Saltpan to the
Port Quay, and the crane lifts it up the cliff. The White Wall line then closes the ring over the gorge mouth on
crystal collars, and a tunnel through the Wall at Lantern Notch leads to the Original Island.

- **Co-op pacing, strengths.** The shortest rides of the five (mean 2.4 minutes). Home stays the hub: the bay shortcut
  and the sea cave both start there, so friends regroup in town. A loop closes at 4.4 hours (the Gorge incline or the
  bay shortcut), then the big lap at 7.3. The double-back passes through Home itself, so a late friend sees the change.
- **Risks.** It still reads as a ring once complete; the asymmetry is in the terrain and the order, not the topology.
  The White Wall line is the longest single build (3.9 km in two halves) and arrives late. The Port after both branches
  makes its bill the most complex in the game.
- **Economy model fit.** Order becomes Ring, first branch, shortcut, second branch, Port (double-back), ring closure,
  ending. The Port moves from between the branches to after them, so its refit takes four kinds (steel, footings,
  copper, fibre). The stops change to Bell Rock, Saltpan Halt, Port Quay and Lantern Notch, all on the main route.

### 2. Figure Eight: two loops that cross at Home

**Feel:** "Home is the crossroads: every trip passes back through town, and town gets busier as both loops fill."
**References:** Hollow Knight (a central place every route runs back through), Dark Souls (Firelink at the junction).

**Pitch.** Home sits in the waist between two seas. The small north loop (Ring Island, the Gorge isle, Copperstair,
back to the pier) has no choice and closes early, at 4.4 hours. You then double back home: the powered pick breaks the
cove cliff you've seen from town since day one. Now the order choice: go round the bigger south loop west to Canopy
Town first or east to High Port first. A tunnel under the Needle Bell joins the loops so trains run the eight. The
ending is a second double-back: the final crossing leaves the north loop from a ledge on Copperstair you passed at
stage 4, reached with glider cloth.

- **Co-op pacing, strengths.** The strongest hub: every journey passes Home, which suits drop-in play and the Home
  Yard. The first loop closes early, so trains circulate from 4.4 hours. Two double-backs, both through town.
- **Risks.** The most "level one, level two" of the five: two loops in sequence. The choice comes late (5.3 hours) and
  is between Canopy and the Port rather than between the two branches. The deep water that keeps the loops apart has to
  read clearly, or players will ask why the line can't go straight.
- **Economy model fit.** High Gorge is fixed as the first branch (copper is never a choice), and the choice becomes
  Canopy Town or High Port, so `BRANCHES` changes meaning. A new step closes the north loop (an earlier circulating
  train). The Port must accept copper alone when it comes before Canopy. The waist tunnel is a spoke between two
  non-Home places.

### 3. Spine and Ribs: a long valley line with ribs that tunnel back

**Feel:** "A straight shot into the unknown, then the delight of a tunnel that spits you out somewhere you've been."
**References:** Hollow Knight: Silksong (a main path like a one-line metro map), Metroid Dread (a lock you see long
before its key), Dark Souls (the door that joins two places you thought were apart).

**Pitch.** Beyond Ring Island is the Uplands, a mainland coast on the northern horizon. A causeway reaches Landfall and
the line runs straight up the Long Valley to Fork Halt, where you see both passes and High Port's lights behind a
rockfall. Pick the east pass to High Gorge or the west pass to Canopy Town; each goes round its ridge the long way.
Once a rib is connected, a tunnel under its ridge comes out at Landfall: a loop closes and the rib is about 1 km nearer
home. The rockfall needs the hook reel and glider cloth together, so the double-back to the Fork comes after both
ribs, and the order choice can never strand it.

- **Co-op pacing, strengths.** The clearest Metroidvania structure, and the tunnel reveal is the most surprising moment
  in any of the five. The combination lock means order never matters for the gate.
- **Risks.** Long rides (mean 4.4 minutes, 8.4 to the ending): the 3.2 km final strait and the 1.1 km valley add up.
  Home stops being the hub after Ring Island; Landfall takes over, which weakens the Home Yard and the owner's "hub in
  the middle". The mainland is the largest single landmass to build.
- **Economy model fit.** A new step for the spine (causeway and valley, no new material) before the branch. Each
  branch's spoke becomes its own tunnel step, replacing the single `spoke1`. There's no ring closure; loops come from
  the tunnels. The Port follows both branches. Travel time rises well above the model's 1.7 hours.

### 4. The Climb: a ring that climbs a mountain

**Feel:** "Always going up: the summit you saw from the pier gets closer each lap, and gliding down is the reward."
**References:** A Short Hike (a peak in view from the first minute that the world wraps around), Breath of the Wild
(over or around a mountain; gliding down from a height).

**Pitch.** North-west of Ring Island stands Mount Brae, 610 m, with a lantern on its summit that you see from Home
every day. From Brae Foot, go east up the switchbacks to High Gorge (300 m) or west round to Canopy Town (160 m). Each
branch gets a straight drop line down to Brae Foot (1.2 km against 1.9 km of switchbacks on the east side). The two halves meet at Windgap (380 m), which
closes the first lap. Then you double back to Brae Foot: the hook reel reaches an anchor on the cliff above the station
that you've seen since stage 3, and Windgap's crystal seeds line the Spiral, a tunnel that corkscrews up inside the
mountain to High Port on the crater lake. The ending is the Long Descent from the summit to the sea.

- **Co-op pacing, strengths.** The strongest single landmark and the clearest sense of progress: height. Drop lines
  and the summit glide make coming down feel like a reward. Elevation gives each place a distinct view back.
- **Risks.** The most rail (18.1 km) and the longest rides (mean 4.9 minutes, 9.5 to the ending). Switchbacks, a spiral
  tunnel and a crater are the most expensive terrain to author and stream. Everything after Ring Island is one
  mountain, so the places share a palette unless they're dressed hard against it.
- **Economy model fit.** Adds Windgap (the lap closure) before the Port, and the Port after both branches. Climbing
  would need a slope speed or a heavier-train penalty the model doesn't have. Drop lines could be downhill-only, which
  breaks the model's symmetric distances.

### 5. Stepping Stones: a compact archipelago web (departs from the brief)

**Feel:** "A sea of islands you can see from each other; a loop closes every hour or so, so most evenings end on a
finished circuit."
**References:** Outer Wilds (places in view of each other; a knowledge gate), A Short Hike (a small, dense world),
Breath of the Wild (something on every horizon).

**Pitch.** Islands scattered round Home, all visible from its shores. Trestles hop the shallows and avoid the deep
trenches, which shape the routes. Pick the Stacks (High Gorge, east via Ring Island) or Canopy Town (west via Kelp
Halt); whichever you take first closes its own small triangle back to Home straight away, and the other side follows.
Then you double back to your own quarry: from Split-rock's rim you glide out to light the Long Bar beacon you've seen
since stage 1, and its light shows the safe line through the shoal to High Port. The Trench span closes a third loop,
and the Reef Steps lead to the Original Island.

**Why depart from the brief.** The brief's ring closes once, at about 6.9 hours, after the fourth main place. A sitting
is 1.5 hours ([ring-data.ts](../../dev/economy/ring-data.ts) `sessionHours`), so a group playing evenings meets that
payoff once. Here three small loops close at about 4.2, 5.3 and 7.0 hours, so most sittings after Ring Island end on a
closed circuit and a train that starts circulating. It also keeps every place within 2.3 km of Home as the crow flies, which cuts the
dead time the model attributes to travel. The cost is the big lap moment and the single strong silhouette of a ring.

- **Co-op pacing, strengths.** Frequent closure, short rides (mean 2.7 minutes), Home as the hub of three triangles,
  and the most small stops (five) for crystal seeds and practice. Friends can see where the others are.
- **Risks.** Island-hopping can repeat itself: Wind Waker's later sea travel is the warning already cited in
  [next-destinations](../research/next-destinations.md). Each island has to be strongly distinct. No ring to complete
  means no single celebratory lap; the Trench span has to carry that moment.
- **Economy model fit.** Three loop closures instead of `ring.close`, each adding a circulating train or a frequency
  boost. The Port is reached from Split-rock, not round the ring. Distances shrink across the board. The crystal stops
  become Kelp Halt, Bell Terraces, Tern Rock and the Reef Steps.

## What the economy model would need for any of them

[ring-data.ts](../../dev/economy/ring-data.ts) is owned by another agent; nothing here changes it. To run any of these
layouts it would need:

1. **Distances from a graph, not a ring.** Today each `Place` carries `angle` and four fixed distances (`kmBefore`,
   `kmSpoke1`, `kmClosed`, `kmOwnSpoke`), and `kmFrom` in [ring-sim.ts](../../dev/economy/ring-sim.ts) takes the
   minimum of three states. Every option here has shortcuts, tunnels and loops arriving at different steps. An edge list
   (from, to, km, the route step that builds it) with a shortest path per step would cover all five; the page's
   `rides()` function is that calculation, and the drawn lengths can be copied from it.
2. **Real coordinates for the fixed places.** The entry crossing is 751 m on the map, not `R = 1.2`.
3. **A route order per layout.** Every option except Figure Eight puts High Port after both branches, so its refit
   takes four kinds of material, not three. Spine and Ribs and The Climb add a step before the branch choice (the
   valley, Brae Foot); Figure Eight adds an early north-loop closure; Stepping Stones replaces `ring.close` with three
   loop closures.
4. **No optional rows.** The owner's answer makes every place integral, so `ownSpoke: 'optional'` and the optional small
   stops (Sail Tower, Lantern Observatory) go; each layout's stops are on the main route and supply crystal seeds.
5. **Loops instead of one ring.** The model counts the ring closure as a third train. With several loops, count
   circulating trains per closed loop.

## Recommendation

**Greybox Sickle Coast first.** It keeps the owner's hub with shortcuts through it, makes the ring lopsided in a way the
terrain explains, has the best "see it early, reach it late" landmark (the Port's crane), routes the double-back
through Home so everyone sees it, and has the shortest rides. Take one idea from Stepping Stones: make sure a loop
closes in the first sitting after Ring Island (Sickle already does, at 4.4 hours). Keep Stepping Stones as the fallback
if playtests find rides long or sittings ending without a payoff. The Climb is the most memorable but the most expensive
to build and ride; its summit could return later as a single landmark.

The smallest test is still the crossing prototype the brief parks: ride the 751 m crossing and a 2 km cliff ledge at 20
m/s and ask whether a 2.5-minute ride feels like a journey or a wait.

## Open questions

1. **Which layout goes to a greybox?** Recommended: **Sickle Coast**, with Stepping Stones as the fallback. The others
   stay on the page for reference. Answer: \_\_\_
2. **Does High Port come after both branches?** Four of the five layouts do this, so the Port recombines everything and
   becomes the payoff of a double-back. The brief puts it between the branches. Recommended: **yes, after both**.
   Answer: \_\_\_
3. **Do the model's distances follow the drawn map?** Recommended: **yes**: the 751 m first crossing and the chosen
   layout's line lengths replace the 1.2 km ring, so pacing and the map agree. Answer: \_\_\_

## Limits

All positions after Ring Island, all footprints, terrain and line routes are proposals. Hours are the model's solo
pacing moved to each order, not new modelling; rides are plan-distance estimates without curves, gradients or
timetables. Sources marked "via search summary" were found by live web search on 6 November and not read in full. No
reference game or Boogle build was played. Not tested on a device.
