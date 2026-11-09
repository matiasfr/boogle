# Train ride feel: riding at Buddy's size, and how far the train goes

> **Verdict:** 20 m/s and 1 to 1.2 km links are right; add near-field motion beside the track.
> **Top recommendations:** 1. The train is a ride-on miniature for Buddy, and that is the right toy scale. 2. Speed is sold close up, and the Sickle Isles' links have nothing close up. 3. A minute is a journey when the far shore grows, something passes every 10–20 s, and you can move; it is a wait.
> **Status:** partly adopted. See [Trains and the world](../decisions.md#trains-and-the-world).

*Research report, 7 November 2026. The owner, on the world-scale study: "I really care about it more in terms of how
does the train distance traveled feel and how does riding the train itself feel for the character model size." Numbers
come from the code at `b643242b` and from captures of the Sickle Isles greybox; references from web sources and the
earlier reports ([train-riding](train-riding.md), [sea-crossings](sea-crossings.md), [vehicle-feel](vehicle-feel.md),
[traversal-at-speed](traversal-at-speed.md), [world-scale](world-scale.md)), which this one does not repeat. A dev-only
prototype was added behind the greybox's flag (`&gbrider`); the live game is unchanged.*

**Markers.** **[V]** fetched and the point matches. **[S]** search summary, wiki or forum only. **[C]** computed or
measured here. **BH** is Buddy's body height, 1.59 m. **Flow** is ground speed divided by the eye's height over the
surface going past (eye heights per second): the "global optical flow rate" of self-motion research, one of the two
cues people use to judge their own speed. The other, **edge rate**, is how many marks (sleepers, poles) pass per
second; in Larish and Flach's study it carried the larger share ([Larish & Flach 1990][larish] [S]).

## TL;DR

**20 m/s and 1–1.2 km links are right. What is missing is the near field: today nothing close to the rider moves
past, so a 20 m/s ride reads as a slow drift over the sea.** Keep the numbers, put things beside the track.

1. **The train is a ride-on miniature for Buddy, and that is the right toy scale.** The loco's boiler is 1.75 m, 1.1 BH;
   a flatbed is 2.2 × 3.2 m and the whole train 11 m, seven Buddies. Riders tower over it like guests on a 15-inch
   park railway, which runs at 9 m/s ([RH&DR][rhdr] [V]). At 20 m/s it is an express toy: fast for its size, which is
   the fun.
2. **Speed is sold close up, and the Sickle Isles' links have nothing close up.** At 20 m/s, sleepers 1.2 m apart pass
   17 times a second and a pole every 25 m passes 0.8 times a second [C]. Over the sea from a 10–15 m trestle, flow is
   1.2–1.7 eye heights a second, *less than Buddy's own jog* (4.2) [C]. The greybox lines are plain 5 m slabs with
   trestle blocks only where they are over 2 m tall, and nearly straight: most links turn less than 5° end to end [C].
   The crossing prototype, with markers, pillars, rock stacks close by and an S-curve, reads as a journey at the same
   speed; the greybox's bay shortcut barely changes for 25 s at a time (captures).
3. **A minute is a journey when the far shore grows, something passes every 10–20 s, and you can move; it is a wait
   when the view is static.** Wind Waker's sea square (61 s), BotW's gallop between stables (2–3 min) and a themed
   coaster (3.5 min) sit between one and four minutes. Of the crossing's 64 s the owner said "Default was pretty well
   balanced"; keep 60–80 s for a typical link and under 2 min for the long Wall lines.
4. **Recommendations, by impact:** near-track furniture on every line (sleepers, rails, a pole every 20–30 m); keep
   the track low over the sea and close to rock; one gentle bend per sea link to swing a landmark into view; review
   the greybox rides seated as Buddy with the play camera (prototype in this branch); a running sound (clack per rail
   joint, wind); then the speed ladder 20 → 25 → 30 → 40 m/s with acceleration rising alongside.
5. **No terrain-scale change.** Three cheap greybox JSON edits: a bend point on the straight sea links, track heights
   kept near the sea where a span doesn't need clearance, and the White Wall south line kept at the chalk's foot.

## 1. What we have

### The train and the rider

| Thing | Metres | BH | Source |
| --- | --- | --- | --- |
| Loco (Place) | 1.6 wide × 3.0 long, boiler top 1.75 | 1.1 tall | `src/proto/wagon/look.ts` `LOCO` |
| Flatbed | 2.2 × 3.2, deck 0.7 up | deck at 0.44 | `TRAILER` |
| Train | loco and two flatbeds, 3.7 m apart, about 11 m | 7 long | `src/proto/place/rail.ts` `CARS` |
| Gauge, sleepers | 1.0, 2.3 × 0.42 every 1.2 m | — | world-scale |
| Buddy standing on a flatbed | eyes 2.0 over the rails | — | 0.7 + 1.33 [C] |
| Play camera | 2.5 up and 5.6 behind Buddy, 62° | — | world-scale |
| Cruise, acceleration, dwell | 20 m/s, 3.5 m/s², 5 s | 12.5 BH/s | `TUNE` in `place/layout.ts` |

- **Where Buddy rides.** The passenger flatbed has two seats on its deck, facing out sideways
  (`registerSeat`, `train-*`); Interact sits you in one simple pose. Otherwise you stand or walk on the decks, and the
  loco's boiler is a jump up (owner, 2 and 5 November: sit for the pose and to feel safe, with no side-on camera).
- **The camera** is the ordinary play camera: same arm, no change while riding. Buddy's sprint FOV widening ignores the
  deck's speed on purpose ("a train's speed isn't you sprinting", `src/player/buddy/camera.ts`). The crossing
  prototype widened the view up to 5° at 50 m/s.
- **What moves.** Each car body shudders (about ±1° of roll and ±3.5 cm sideways, `rail.ts`), smoke puffs scale with
  distance, and the departure has a whistle. There is no running sound: no clack, no chuff, no wind.

### The greybox rides

The review rides (`src/proto/greybox/index.ts`) move only a camera: 6 m over the track, looking 90 m ahead, at a
constant 20 m/s. No carriage, no rider. The lines are 5 m wide slabs in their stage colour, with 1.6 m trestle blocks
every 30 m where the deck is more than 2 m over the ground or sea.

| Link | Length | At 20 m/s | Turns end to end | Deck over the sea |
| --- | --- | --- | --- | --- |
| Bay shortcut (Home – Bell Rock) | 1,210 m | 61 s | 3° | 4 → 14 m |
| Bell Rock – Canopy | 1,187 m | 59 s | 7° | 12–14 m |
| Bay trestle (Ring – Bell) | 1,406 m | 70 s | 1° | 67 → 14 m |
| First sea crossing (pier – Ring) | 752 m | 38 s | 2° | 3 → 67 m |
| Sea cave, saltpan – quay (into High Port) | 688 + 505 m | 34 + 25 s | 16°, 12° | 3–5 m |
| White Wall south / north | 1,740 / 1,968 m | 87 / 98 s | 41° / 14° | 12–120 / 3–120 m, up onto the islets' tops |
| Lantern causeway (final) | 736 m | 37 s | 2° | 3 → 14 m |

Times are at cruise; acceleration and braking add 5.7 s, and a stop and boarding about 25 s more [C]. Heights are the
deck's range along the line, read from the running greybox (`__greybox.lineHeights()`); between its points a line is
one straight span, so a link from a 4 m landing to a 14 m one is a long gentle ramp over open water [C].

## 2. The ride itself at Buddy's size

### How big the train reads

Next to Buddy the loco is chest-high-plus and a flatbed is a big tray: a **ride-on miniature**, the scale of a park
railway where adults sit on the cars and look over the engine. That is the right toy read: big enough that two or three
Buddies fit on a deck with crates, small enough that you see over it and the world dwarfs it. The 15-inch Romney, Hythe
and Dymchurch line runs its miniatures at 20 mph (9 m/s) ([Wikipedia][rhdr] [V]); a real metre-gauge scenic line like
the Glacier Express averages 36–42 km/h (10–12 m/s) ([operator][glacier] [S]). Boogle's 20 m/s is twice either, which
is what makes it an *express* toy, not a heritage plod. Keep it.

### What sells speed, and what we have of each

| Cue | What the research says | At 20 m/s in Boogle | Today |
| --- | --- | --- | --- |
| **Edge rate**: marks passing | The stronger cue of the two ([Larish & Flach][larish] [S]); racing games add trees and grass by the road for it ([racing FOV study][racing] [S]) | Sleepers every 1.2 m: 17/s. A pole every 25 m: 0.8/s. Trestle bents every 30 m: 0.7/s | Place's track has sleepers; the greybox has none, and trestle blocks only on high spans |
| **Flow**: speed over eye height | Lower eye, faster feel; the same paper found camera altitude matters in racing views ([racing FOV study][racing] [S]) | Over the rails: 20 / 2.0 = 10 per s seated or standing [C]. Over the sea from a 12 m trestle: 20 / 14 = 1.4 [C]. Jogging Buddy: 4.2 | Most sea spans sit 4–14 m over the water; the Ring Island spans climb to 67 m, where flow falls to 0.3 per s |
| **Near objects passing** | Things off to the side move fastest; more of them in view is more speed ([Hargreaves][hargreaves] [V]) | A cliff 20 m away sweeps past at 57°/s; one 200 m away at 6°/s [C] | Most links are open sea; the sea cave and the breakwater into High Port are the exceptions |
| **FOV with speed** | A few degrees, eased, capped; distance lag hurts more than FOV helps ([vehicle-feel](vehicle-feel.md#practitioner-chase-cameras-secondary)) | +2–3° at 20 m/s | Off on purpose on trains |
| **Sound** | Pitch-banded rumble plus wind; clacks per rail joint ([vehicle-feel](vehicle-feel.md#4-speed-feel-and-sound)) | Joints 12 m apart: a clack pair 1.7 times a second [C] | None while running |
| **Sway and shake** | Roll and dip on the car mesh only; never roll the camera; rotational shake at most ([Eiserloh, via vehicle-feel](vehicle-feel.md#juicing-your-cameras-with-math-verified); [train-riding](train-riding.md#24-comfort-the-horizon)) | Car shudder exists | Right as it is; nothing on the camera |
| **The far shore growing** | The lure; Jak and Daxter and Sea of Thieves keep it on screen ([sea-crossings](sea-crossings.md#summary)) | A 120 m Wall from 1.2 km is 5.7° tall; from 300 m, 22° [C] | Good on straight links, but straight links never change *what* is ahead |

**Captures** (real time, 20 m/s; list at the end).

- **The greybox's own ride camera** (6 m over the deck, no train). On the bay shortcut the only moving things are the
  sea's waves; between 7 s and 14 s, 140 m of travel, the frame barely changes. The red slab ahead is a flat wedge
  with nothing on it. It reads as a slow glide, not a 72 km/h train.
- **The line into High Port** reads fastest of the three: the sea cave's wall sweeps past at the start, the track is
  3–5 m over the water, the saltpan's cones pass close, and the breakwater runs alongside into the harbour. Near things
  are what sells it.
- **The White Wall south line** is great for its first 25 s, low beside the chalk faces, and then climbs onto the
  islets' tops: about 40 s over a bare flat top with nothing near the track.
- **The crossing prototype** (`?proto=crossing`, follow camera, Buddy on a real flatbed): red markers and planks pass
  steadily, pillars and rock stacks go by within metres, the S-curve swings the island across the view, and the island
  grows from a speck to the whole frame in 40 s. This one feels like a journey. It has all the cues the greybox lines
  lack except sound.

### What is missing

1. **The near field.** Plain slabs over open sea at 6–15 m give almost no edge rate and little flow, so the camera
   reads slow even at 20 m/s. Place's real track has sleepers, which is half of it; the other half is something at
   the side at regular intervals (poles, posts, trestle bents, railings) and rock close by now and then.
2. **A rider in the review rides.** The 6 m drone camera hides how big the train is and puts the eye three times
   higher than the play camera, which cuts flow by about three. The prototype below fixes that for review.
3. **Sound.** The train runs silent between whistles.
4. **Bends.** Straight links keep the destination dead ahead from the platform to the buffers: good as a lure, but the
   view only grows, it never turns.

## 3. Distance and time: journey or wait?

| Reference | A "leg" | How long | What fills it | Source |
| --- | --- | --- | --- | --- |
| Wind Waker | one sea square | 61 s; Swift Sail (HD) "almost two times faster" | the next island on the horizon, wind, the odd event; critics fault the long empty crossings | [ZeldaSpeedRuns][zsr] [V], [Zelda Universe][wwhd] [V] |
| BotW / TotK | gallop between stables | horses gallop 14–19 m/s, canter 10–14 [S]; stables are a few km apart, so 2–3 min | landmarks you steer toward, the next tower, enemies; fast travel from towers and shrines | [Zelda Dungeon][botw-horse] [S] |
| A Short Hike | crossing the island by glide or boat | under a minute or two | music that rises with the boat's speed; the island is dense, the whole game 1.5–3 h | [sea-crossings](sea-crossings.md#5-a-short-hike-one-boat-late-for-fun) |
| Spirit Tracks | a run between stations | minutes | whistle, signs, cargo, enemies; still called "painfully slow" | [train-riding](train-riding.md#1-the-legend-of-zelda-spirit-tracks-2009) |
| Tracks – The Train Set Game | a lap of your own layout | as long as you built it | a cab view from a small wooden figure, looking at what you built | [Digitally Downloaded][tracks] [S] |
| Train Valley, Mini Motorways | — | — | you watch from above and manage; no riding, so no ride feel to borrow | [reviews][trainvalley] [S] |
| Pokémon | the train into a region | a cutscene | the train stops for Wooloo on the line: a gag that opens the Wild Area | [train-riding](train-riding.md#10-arriving-by-train-animal-crossing-and-pokémon) |
| Sunset Overdrive | rail grinding | seconds | speed you make; not a ride (the owner cut grinding) | [traversal-at-speed](traversal-at-speed.md) |
| Big Thunder Mountain (coaster) | one ride | 3.5 min for 850 m | a scene every few seconds | [WDW Magic][btm] [S] |
| Disneyland Railroad | station to station | about 20 min a 1.9 km loop, four stops: 4–5 min a leg | dioramas and the park itself | [Wikipedia][dlrr] [S] |
| Hogwarts Express (Universal) | one way | about 4 min | a show at the window | [train-riding](train-riding.md#22-theme-parks-dark-rides-the-omnimover-disneylands-railroad-the-hogwarts-express) |
| Glacier Express | the whole line | 8 h at 36–42 km/h | the Alps; the "slowest express" sells looking | [operator][glacier] [S] |

**What they agree on.**

- **A minute is the unit.** Wind Waker's square, the crossing prototype's 64 s and our 60–80 s links all sit there;
  theme parks hold attention for 3–5 minutes, but only by packing a scene every few seconds.
- **Long is fine if the view changes; empty is the failure.** Wind Waker's critics and Spirit Tracks' reviews complain
  about *empty* time, not distance. The [sea-crossings](sea-crossings.md#summary) rule stands: something every 10–15 s,
  the far shore in view, and never take control away.
- **The faster vehicle comes later, over ground you already know.** Aonuma held the fast sail back so players felt the
  sea first ([Zelda Universe][wwhd] [V]); Dredge's engines shrink a known map. That fits the roundhouse ladder.
- **Fast travel arrives when the trip has stopped being interesting**, after the player has done it several times. In
  Boogle that is the roundhouse's job (express trains, then maybe warps), and boogle-2 keeps maps and fast travel
  deferred.

**What keeps a long ride interesting in Boogle, within what the owner has already decided.**

- **Things to look at that the track brings close**: the Wall's chalk faces within 450 m, the sea cave, the breakwater,
  basalt stacks, a lighthouse. This is layout, not a scripted show (the wagon's lineside show was cut, 2 November).
- **The route bending to reveal**: one gentle bend so the next island's landmark swings from the side into the front.
- **Moving around the train**: walking the decks, climbing the boiler, sitting. Already there.
- **Jumping off**: the crossing's skim across the sea is the slapstick end; keep it forgiving.
- **Co-op**: riding together is the cheapest content: two seats, honks, crates you hauled. Already in the plan.
- **Fast travel later**: express trains from the roundhouse first; nothing that skips the ride before it's been ridden.

## 4. Speed and length

**Cruise.** Keep **20 m/s** for the first train. The owner judged it on the crossing ("Default was pretty well
balanced") and called 50 m/s a novelty for the end game.

**The ladder: 20 → 25 → 30 → 40 m/s, with acceleration rising alongside (3.5 → 4.5 → 5.5 → 7 m/s²)** [C]. Each step
cuts a typical link by roughly a fifth, enough to notice on a route you know (Wind Waker's single step was 2×). Keep
40 as the top: 50 felt "a little too fast" over 1.2 km. Two traps:

- **Without faster acceleration the upgrades shrink.** A 1.2 km link takes 66 / 55 / 49 / 41 s at 20 / 25 / 30 / 40 m/s
  with 3.5 m/s² throughout; scaling acceleration with speed gives 66 / 54 / 46 / 36 s [C].
- **Fixed overhead hides speed.** With 25 s of boarding and dwell, door to door goes 91 → 61 s for twice the cruise, a
  third saved, not half. Pair a speed step with a boarding step (calling the train, a shorter dwell), as
  [traversal-at-speed](traversal-at-speed.md#6-paths-abilities-and-trains-should-save-different-kinds-of-effort) asks.

**Lengths and durations.**

| | Length | At 20 m/s, cruise only | Target |
| --- | --- | --- | --- |
| Short hop (Home – camp, quay – port) | 170–500 m | 9–25 s | Fine: a hop, not a journey |
| Typical sea link | 1.0–1.2 km | 50–60 s (+6 s accelerating) | 60–80 s door to door, one bend, the far shore in view |
| Long scenic line (the White Wall) | 1.7–2.0 km | 87–98 s | Up to about 2 min, only if close to rock the whole way |
| Anything longer | — | — | Split with a stop or a view, or save it for the 30–40 m/s eras |

**Sickle Isles: what should change.** The terrain scale stays as settled. Two greybox JSON edits, no new land:

1. **A bend point on the straight sea links** (bay shortcut, bay trestle, first crossing, Bell – Canopy, the
   causeway): 15–30° total, sited so the destination's landmark (Bell Rock's pinnacle, Canopy's mother trees, the
   lantern) swings across the front in the last third.
2. **Track heights near the sea where nothing needs clearing**, about 3–6 m over the water, rising only where a span
   must clear something (the Gorge bridge, the cliff lift). Low track doubles or triples the flow for free [C].

3. **The White Wall south line along the chalk's foot, not over the islets' tops.** Its first 25 s, low beside the
   faces, is the best stretch in the greybox; the 40 s across the tops is the worst. If the line must cross a top,
   give it a cutting or the top some trees.

The sea cave and breakwater approach into High Port is the model: low, close to rock and wall, and turning.

## 5. The prototype: `&gbrider`

Dev-only, inside the greybox (which only loads on the dev server), and changing nothing without the flag:
`src/proto/greybox/rider.ts`, wired into the greybox's ride in `index.ts`. Add `&gbrider=1` to a greybox URL and pick a
ride from the panel, for example
http://localhost:5173/?greybox=sickle&room=greybox-sickle&gbrider=1 then *Ride*, *Home to Bell Rock by the bay shortcut*, x1.

- **The train**: a loco and two flatbeds at Place's sizes, drawn along the route at the ride's speed.
- **The rider**: your own Buddy, seated on the first flatbed in the game's seated pose, facing forward. Your body stays
  where it was; only the drawing moves.
- **The camera**: the play camera's height and distance (2.5 m up, 5.6 m behind), its heading lagging the train's by
  0.6 s so a bend shows the train from the side, no roll, no shake, and 3° wider at 20 m/s.
- **The furniture**: sleepers every 1.2 m, two rails, and a 5 m pole with a crossarm every 25 m beside every greybox
  line. `&gbrider=bare` keeps the train and camera without them, for an A/B.
- Numbers in one table, `RIDER_FEEL`. `__greybox.lineHeights()` reports each line's deck heights.

**What it showed.**

- **Scale.** Seated on the flatbed, Buddy's head is level with the loco's roof; the train reads as his toy, the sea and
  the Wall as the world. That is the read we want.
- **Speed.** The poles alone change the bay shortcut: one passes every 1.25 s and the eye tracks them. Sleepers and
  rails ahead of the loco give the track texture, but from behind the train most of the track near you is under the
  train, so the side poles matter more than the sleepers in this view.
- **The camera's lag** on bends (Wall line, 30 s) shows the train from three-quarters: a free, nice moment.
- **What stays dull is still dull**: the middle 25 s of the bay shortcut (open sea, Bell Rock slowly growing) and the
  Wall line's 40 s across the islets' tops. Furniture helps, but it can't replace something near and something turning.
- **Limits.** The camera has no collision (in the sea cave it sits inside the rock for a moment), the train starts
  at speed, there is no sound, and the end of a ride is abrupt. It is for review, not a feel target.

## 6. Recommendations, ranked by impact on feel

| # | Change | Why | Cost |
| --- | --- | --- | --- |
| 1 | **Near-track furniture on every line**: sleepers and rails everywhere, and something at the side every 20–30 m (pole, post, trestle bent, railing) | Edge rate is the strongest speed cue, and the sea links have none | Low: instanced boxes in the greybox (done here behind the flag); the dressing pass's lineside kit later |
| 2 | **Keep the track low and close**: 3–6 m over the sea where nothing needs clearing; run within 10–50 m of cliffs, stacks and islets where the route allows | Flow doubles to triples; near rock sweeps past | Low: line heights and points in the greybox JSON |
| 3 | **One gentle bend per sea link** that swings a landmark into view in the last third | Turns "watch it grow" into a reveal; the cut lineside show isn't needed for this | Low: one point per line in the JSON |
| 4 | **Review the greybox rides seated as Buddy with the play camera** (`&gbrider=1`) | The 6 m drone hides the train's size and halves the speed you feel | Done here, dev-only |
| 5 | **A running sound**: a clack pair per rail joint (about 1.7 a second at 20 m/s), a chuff tied to speed, wind rising with speed | Sound sells speed and is the cheapest feel in a long ride | Medium: an audio-design pass on `machine-sfx`; Local |
| 6 | **The speed ladder 20 → 25 → 30 → 40 m/s** with acceleration 3.5 → 7 m/s², each step paired with less waiting | Each step noticeable on a known route; no novelty speed | Medium: roundhouse tuning; lockstep train code |
| 7 | **+2–3° FOV on the train at cruise**, eased in over a second or two | Small extra speed read; the crossing did 5° at 50 m/s | Tiny, but the camera rule "no FOV on trains" would change: owner's call, try in the prototype first |
| 8 | **Keep the camera steady**: no roll, no shake; sway stays on the car mesh | Comfort over a minute-plus ride ([train-riding](train-riding.md#24-comfort-the-horizon)) | None: it is already so |

## 7. Questions for the owner

1. **Should the Sickle Isles lines run low, bend once, and keep to the Wall's foot?** *Recommended: yes*: track 3–6 m
   over the sea except where a span has to clear something, one 15–30° bend per sea link toward its landmark, and the
   White Wall south line beside the chalk rather than over the tops, all as greybox JSON edits with no terrain change.
   The alternative keeps today's straight lines, which read as a slow glide.
2. **Should the review rides default to riding as Buddy (`&gbrider=1`)?** *Recommended: yes*, with the old drone
   camera kept as `&gbrider=0` for overviews. The alternative keeps the 6 m camera, which undersells speed and hides
   the train.
3. **Speed ladder 20 → 25 → 30 → 40 m/s, acceleration rising with it, with a small FOV widening on trains?**
   *Recommended: the ladder yes; the FOV only after you've tried it in the prototype.* The alternative is fewer,
   bigger steps (20 → 40), which feel bigger once but leave the roundhouse less to give.

## Captures

Real-time recordings at 20 m/s (x1), 960 × 600 on WebGPU, no page or console errors, on a GPU shared with other
agents' captures; each sheet below is ten evenly spaced frames from one recording, and each was opened and inspected.
The recordings themselves (`.look/rf-*-realtime.webm`) are not committed.

1. [Bay shortcut, the greybox's 6 m ride camera](train-ride-feel/bay-x1b.jpg)
2. [Bay shortcut, seated as Buddy with poles and sleepers (`&gbrider=1`)](train-ride-feel/rider-bay.jpg)
3. [Bay shortcut, seated, without the furniture (`&gbrider=bare`), first 30 s](train-ride-feel/rider-bay-bare.jpg)
4. [Into High Port through the sea cave, ride camera](train-ride-feel/port-x1.jpg)
5. [Into High Port, seated](train-ride-feel/rider-port.jpg)
6. [White Wall south, ride camera](train-ride-feel/wall-x1.jpg)
7. [White Wall south, seated](train-ride-feel/rider-wall.jpg)
8. [The crossing prototype, Buddy on a flatbed, follow camera, 40 s](train-ride-feel/crossing-follow.jpg)

The greybox rides end abruptly: the ride camera runs on into the next station's geometry for its last second.

Not verified: how the rides feel in the owner's hands with the real Place train at Sickle Isles distances (the greybox
draws a stand-in train and moves the camera, not a body); sound, which none of these have; iPad cost of the furniture;
and the reference figures marked [S].

## Sources

- [Larish & Flach 1990, "Sources of optical information useful for perception of speed of rectilinear self-motion"][larish] [S]
- [Geometric FOV, motion blur and camera altitude in 3D racing games (2017)][racing] [S]
- [Shawn Hargreaves, "Speed is a matter of perspective"][hargreaves] [V]
- [Romney, Hythe and Dymchurch Railway][rhdr] [V]; [Glacier Express][glacier] [S]
- [ZeldaSpeedRuns, Wind Waker movement][zsr] [V]; [Zelda Universe, Aonuma on the Swift Sail][wwhd] [V]
- [Zelda Dungeon, BotW horses][botw-horse] [S]
- [Digitally Downloaded, Tracks preview][tracks] [S]; [Train Valley review][trainvalley] [S]
- [WDW Magic, Big Thunder Mountain][btm] [S]; [Disneyland Railroad][dlrr] [S]

[larish]: https://corescholar.libraries.wright.edu/psychology/367
[racing]: https://rd.springer.com/chapter/10.1007/978-3-319-55834-9_14
[hargreaves]: https://www.shawnhargreaves.com/blog/speed-is-a-matter-of-perspective.html
[rhdr]: https://en.wikipedia.org/wiki/Romney,_Hythe_and_Dymchurch_Railway
[glacier]: https://glacierexpress.ch/en/about-the-glacier-express
[zsr]: https://www.zeldaspeedruns.com/tww/general-knowledge/movement-mechanics
[wwhd]: https://zeldauniverse.net/2013/09/17/aonuma-wwhds-sailing-almost-twice-as-fast-removing-wws-gamecube-island-replacing-the-tingle-tuner-and-more/
[botw-horse]: https://www.zeldadungeon.net/wiki/Horse_(Breath_of_the_Wild)
[tracks]: https://www.digitallydownloaded.net/2017/10/preview-tracks-train-set-game-pc.html
[trainvalley]: https://www.thesixthaxis.com/?p=253942
[btm]: https://www.wdwmagic.com/attractions/big-thunder-mountain-railroad.htm
[dlrr]: https://en.wikipedia.org/wiki/Disneyland_Railroad
