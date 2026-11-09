> **Status: proposed (2026-11-09).**

# Home's live route: a level-design flow audit

**Verdict.**
1. Home mostly flows well. Line 1 builds you home, line 2 runs outward in unlock order, and every ability is used where you get it.
2. Two beat ends lose the thread. At the rim you stand still for about 3½ minutes waiting for the cart. At Far Head, nothing you can see calls you back 540 m to the boiler.
3. The other gaps are small or are tooling. The bot's route isn't the order a player takes, so its long-run times overstate three legs.

*Designer audit, 9 November 2026, of the production game (boogle.club, no `?proto`) at `93fc92de`. The owner, 9 November:
"I also care about layout that makes sense for the flow of the game." This audit is held mainly to the three
near-universal rules in [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) (the next
goal can be found, a gate keeps its meaning, nobody is stranded). Its other five rules, and the rules in
[level-design](../research/level-design.md#the-rules-most-applicable-to-boogle),
[wordless-onboarding](../research/wordless-onboarding.md), [route-contract](../research/route-contract.md) and
[ability-upgrades](../research/ability-upgrades.md), are used as lenses. A deviation only becomes a finding where a
player would lose the thread, and this audit says so where a deviation works.*

**Evidence.**
- **Positions:** from `src/proto/place/layout.ts`, `tech-layout.ts` and `shore-layout.ts` (the production railway's
  layout, still housed there), `src/sim/railway-cart.ts` and the `common.works` block of `docs/world/map-prototypes.html`
  that `src/sickle/map-data.ts` reads. They're given in local metres; world x = local x + 1000.
- **Times:** from the last `playthrough --long` (`x1-long`, build `dev-mw907k56`: 118 game-minutes in 12 min 44 s).
  The page clock races about 9–10× ahead of the server, so a walk or chop is timed by the page clock and a server-driven
  wait (laying, the cart, trains) by server ticks at 10 a second. The seconds below are a **perfect player's floor**
  built that way: about 26 minutes from the dock to the pier, about 7 of them spent waiting on deliveries. There are no
  first-timer times per beat since 8 November.
- **Owner sessions:** 4, 6, 7 and 8 November in [playtests](../playtests.md).
- **Stills:** eye-level views (`npm run look -- --rail-seed <stage> --cam … --look …`) in [home-flow/](home-flow/).
  Line-1 stills use the `awake` seed, since there is no seed between the wake and Q1.

## Legs

| # | Beat to beat | Leg | ≈ s (floor) | What pulls you on | Works? |
| --- | --- | --- | --- | --- | --- |
| 1 | Dock (−199, 10) → village edge | 127 m on the shore path | 23 | The path climbs between cottages; Sleeves the greeter; the half-built forge with little guys hammering | Yes. From the waterline the bank hides the town ([01](home-flow/01-cove.jpg)), and the path itself is the pull |
| 2 | Village → camp machine, wake | 431 m on the bold path | 78–100 (bot 115 with the wake) | Sleeves: "Follow the path up to the machine." The blue rock arch on the hill is the visible lure ([02](home-flow/02-village-to-camp.jpg)) | Yes. The machine itself isn't in view from town, but the arch and the path carry you there, and the walk is the "moment of discovery" (place.md) |
| 3 | Wake → T1 funded | Grove about 20 m off | 20 | The multi-axe card; trees beside the frame | Yes |
| 4 | T1 laid → T2 funded | T2 frame 34 m on, rocks 30 m | 11 lay + 63 | T2's frame stands in view along the new track ([03](home-flow/03-t1-to-t2.jpg)) | Yes |
| 5 | T2 → T3 funded (logs and great beam) | 33 m; great tree 53 m back; groves further | 11 lay + 165 | The gold rope on the tree matching the frame's empty saddles | Yes. Log trips grow from 13 to 19 s as near trees run out, as designed |
| 6 | T3 laid → village | 86 m, ridden or walked | 22 + the show | The line is built back toward home: the payoff is the walk home | Yes |
| 7 | Village → forge lit | Forge at the town threshold | about 117 for 56 logs | The forge frame you passed on arrival | Yes: change lands on a place you know. The optional double jump sits at pillar p1, 60 m back up the T3 deck |
| 8 | Forge → proper axe → hardwoods | 35 m | 21 | The chest beside the frame; the hardwoods it opens are in view | Yes: first use in sight |
| 9 | Q1 | 12 m from the forge | 48 + 10 lay | The frame by the turntable | Yes |
| 10 | Q2 | 35 m; rails from the forge | 35 cart wait + 32 + 17 lay | The first cart arrives at the rack | Yes. The first wait is short and it teaches the cart |
| 11 | Q2 deck → hook → Needle Bell summit | The walkway off the deck at s ≈ 92 | 20 + 12 climb | The rings and slabs hang over the frame as Q2 finishes ([07](home-flow/07-q2-to-hook.jpg)) | Yes, the best beat on Home: the device is taken in sight of t0 and its demo pulls you up |
| 12 | Summit → Q3 funded | Down, then 120 m; rails from the forge | about 50 cart wait + 20 lay | The cart's logs; rails are still yours to fetch | Yes. The cart's wait overlaps your rails walk, so it's barely felt |
| 13 | Q3 laid → quarry lever | 15 m | 16 | The lever on the apron beside the parked machine; from the lever, Q4's frame and the gate slab stand side by side ([09](home-flow/09-lever.jpg)) | Yes |
| 14 | Lever → Q4 funded | Frame beside the lever; cart cycle 101 s | about 100 | The cart's next load to the rack | Yes for a player, who met the pack at the forge. The bot walks 190 m home for the pack and rides the cart back (finding 4) |
| 15 | Q4 laid → sea switch | Summit, 161 m from the rim | 17 lay | Needle Bell and the dark posts running to it from the sea gate ([10](home-flow/10-rim-to-summit.jpg)) | Yes since 8 November: a player pulls it on the first climb (leg 11). The bot climbs twice |
| 16 | **Waiting at the rim for Q5's stock** | Rack 469 m down the cart road | **about 216 standing** | The cart, out of sight for most of its run | **No** (finding 1) |
| 17 | Q5 laid → Far Head | 260 m of trestle | 33 lay + 55 | Lamps and rockets along the trestle | Yes |
| 18 | **Far Head → boiler at the forge apron (−81, 5)** | 536 m back along line 2 | about 100 on foot | Nothing visible from Far Head ([11](home-flow/11-farhead-to-boiler.jpg)) | **Unclear** (finding 2) |
| 19 | Boiler → old train at the camp | About 190 m up line 1 | 42 | The rusted train that's stood behind the machine since the wake | Yes: a known place changes |
| 20 | Trains → Q6 → pier | Train from the village; 194 m of pier | 88 to stock, 28 lay | Platforms, the train, the kit on it | Yes: a vehicle stretches the gap, and the pier points at Ring Island |
| 21 | Pier → breaker at the forge (planned) | About 600 m behind you | — | Not yet built | See finding 3 |

## Findings

### 1. Three and a half minutes standing at the rim for Q5

The worst dead time on the route, and the best evidenced. Once Q4 is laid, Q5 needs 24 logs and 24 rails, and solo
they only come by the cart. Its cycle to Q5's rack is 124.6 s (`cartCycleTicks(4)`), and it holds 16 rails, so Q5 takes
two full runs. The bot stood at (165, −28) from the sea switch to Q5 funded: 216 s of server time (33.7 game-minutes in
the warped log), 14% of its whole route in one spot. Compare Q2's wait of 35 s and Q3's of about 50 s, which overlap a
rails walk and are barely felt.

- **Research:** progression-flow-layout lens 6 allows a slow stretch "you want to feel, once", but this isn't a stretch,
  it's standing. Level-design §13 accepts empty space "while the next lure is in view", and gravity (rule 4) wants a
  second pull to wander to. No source covers how long a construction game can make you wait at a site (see Research
  gaps).
- **Stills:** [10](home-flow/10-rim-to-summit.jpg) shows the view from the Q5 frame: Needle Bell and its posts, with no
  cart in sight. [14](home-flow/14-q5-to-cleft.jpg) looks south from the parked machine. There's a stand of ordinary
  conifers right at the rim, so a player can chop Q5's 24 logs on the spot (two trees with the proper axe; the bot
  waits for the cart's logs instead). **Rails are the real bottleneck:** they come only from the forge, 16 a cart. Behind
  the trees the grey Split-rock Works blockout just shows, but the cleft itself doesn't read from here.
- **Co-op:** already fine. place.md: "station 5 gets a second rail shipment unless a partner brings the balance". One
  carries rails by hand while the cart brings logs.
- **Fix, tunable (Default):** let one shipment cover Q5's rails: the cart's `rails` 16 → 24 (or Q5's rail bill 24 → 16).
  That saves one cycle, about two minutes, since with logs chopped on the spot the first shipment then funds Q5. It's a
  fill you've already watched being made, so nothing is lost.
- **Fix, placement (New):** frame Split-rock's walk-in cleft at (160, 120), open since Q3 and about 136 m (24 s) from
  the Q5 rack, so the wait has a side pull. The [Split-rock plan](../plans/split-rock-roundhouse.md) already calls the
  cleft "the early scout's route"; this only asks that it can be seen from the rim.

### 2. Far Head: nothing calls you back to the boiler

After Q5 the next goal is the boiler on the forge apron, 536 m and about 100 s behind you. The long walk is deliberate
(place.md: "the walk is meant to be felt"), and progression-flow-layout lens 6 says a long return made once, before trains
cut it, works. The question is rule 1, whether the next goal can be found. From Far Head's frame, looking home, the
still shows the trestle, a tree line and the hook slabs. There's no forge, chimney, plume or boiler to read
([11](home-flow/11-farhead-to-boiler.jpg)). The way home itself is findable, because Needle Bell stands over Home and is
the landmark you steer by from the sea end of line 2 ([15](home-flow/15-pier-to-forge.jpg), from the pier). What's
missing is the reason to go: the boiler's pedestal is at least 480 m away, behind the town, and nothing shows that the
forge has made something. place.md already says "the distant relationship between pickup and receiver is still weak".
The bot can't show this, since it's scripted, and the owner hasn't played B5–B8 yet, so this is a sightline finding,
not an observed stall.

- **Research:** progression-flow-layout rule 1 and its Far Head check; wordless-onboarding 7 (sound and motion over
  text); level-design rules 6 and 11 (draw distant things bigger).
- **Fix, placement and tunable (Default):** a Local steam plume over the boiler's pedestal while it waits, tall and pale
  enough to read at 540 m against the tree line, and a forge whistle on the tick it's cast, heard on Far Head. Both follow
  shared state, so they need no new op. The cart ride home (place.md: "or ride the cart") then becomes the obvious way
  back, and the town's `head` growth (place-retirement T1/T6: population +6) lands on that same walk home as its
  payoff.
- **With the glider (proposed):** the glider brief makes Q5 finish with two pulls, the summit's teal shaft and the
  boiler. Both lie west, and Needle Bell is on the way home along line 2. If the first flight's landing faces the forge
  apron, the two pulls become one trip: climb, fly home, shoulder the boiler (New, placement).

### 3. The pier: the breaker will be 600 m behind you too

[Split-rock](../plans/split-rock-roundhouse.md) has the forge cast the breaker after Q6, so the pier, which ends facing
Ring Island, also ends with the next goal at the forge, about 600 m away. Trains make the return a ride (lens 6 ✓), but
the call has to reach the pier (rule 1). The forge rhythm ("it made something, go home") happens three times on Home
(rails, the boiler, the breaker). progression-flow-layout calls this a learnable Firelink rhythm as long as each return
finds a visible change. The still from the pier's end ([15](home-flow/15-pier-to-forge.jpg)) is one of the best views
on Home: the trestle, Far Head and Needle Bell over the island. But the forge is a speck, its chimney at most a few red
pixels, and nothing there says something is waiting.

- **Fix, plan job (Default):** Split-rock's breaker uses finding 2's plume and whistle, at the forge, so the rhythm reads
  the same each time. That's one line for that plan's breaker job.

### 4. The bot's route isn't the player's

The production bot opens the pack chest after the quarry lever (walking 190 m home), calls the cart at the forge and
rides it back out to Q4. It also climbs Needle Bell a second time for the sea switch. A player meets the pack at the
forge, about 25 minutes earlier, and since 8 November the first pull on the first climb opens the sea gate. So the long
run's times for legs 14 and 15 overstate a player's by about 2 minutes, and nothing proves the order players will
actually take: the switch pulled at leg 11, Q1–Q3 carried with 16 on the back. This is tooling, not a player-facing
break.

- **Research:** route-contract (prove the travel edges); progression-flow-layout, "The bot's order isn't the player's".
- **Fix, plan job (Default):** the bot's default order opens the pack at the forge as soon as it's offered and pulls
  the switch on the first summit visit. A flag keeps the current order for the cart-ride and second-climb checks.

## What I couldn't see

- **The sea gate from the summit.** The summit still ([13](home-flow/13-summit-to-sea-gate.jpg)) aims down past the
  summit deck's edge, which fills the lower frame. The sea, a stack and a ring post show, but not the rim or the gate's
  slab. Whether a player at the top sees what the switch opens is still unchecked. Since the first pull works and the
  posts light up toward the gate, this probably doesn't matter.
- **The camp machine from the village.** It isn't visible ([02](home-flow/02-village-to-camp.jpg)). The arch and the
  greeter carry this leg, and there's no owner report of being lost there.
- **What stands beside Q6 at Far Head.** A frame stacked with logs stands in the Far Head still. It may be left-over
  depot stock from the seed rather than something a player sees. If it is the Q6 rack showing stock before trains, it
  reads as the next job while Q6 actually waits on trains (rule 2: a shut thing says why it's shut). Worth one live look.
- **Nothing from a phone,** and no co-op stills.

## What's working

- **Line 1 is built toward home.** You walk out once (100 s), and every station after that brings you nearer the
  village. T3's stretch is the walk home, 191 m against 431. This is lens 6 done well, the Dark Souls shortcut.
- **Each next frame is in view from the last** on line 1 ([03](home-flow/03-t1-to-t2.jpg)), and on line 2 the track
  head is the goal.
- **Line 2 runs outward in unlock order:** forge, Q1, Q2, Needle Bell, Q3, the lever, the rim, Far Head, the pier. The
  quarry lever stands beside Q4's slab, and the sea switch is tied to its gate by the dark posts
  ([10](home-flow/10-rim-to-summit.jpg)).
- **Every grant is used in sight of where you get it:** the multi-axe at the first trees, the proper axe beside the
  hardwoods, the hook under its rings with a demo pull, the double jump on its course
  (ability-upgrades, "Teach at small stops").
- **The village is the hub.** A player's route keeps coming back to it: the arrival, the forge and Q1–Q2, rails runs for Q3, and the boiler. That suits the town port
  ([place-retirement](../plans/place-retirement.md)), whose growth will land where players keep returning.
- **Trips shorten as you build:** the path home, then the cart, then trains at 20 m/s.
- **Gates keep their meaning.** The quarry lever does nothing before Q3 (the bot proves it with an early double jump),
  and the sea switch now opens early, which fixed the 8 November "Pull pressed 18 times" confusion without letting
  movement skip any work.

## Stills

All are `npm run look -- --rail-seed <seed> --cam <x,y,z> --look <x,y,z>` in world metres, at about eye height.

| Still | Seed | Camera → look |
| --- | --- | --- |
| [01](home-flow/01-cove.jpg) dock toward town | `awake` | 802,6,10 → 900,20,6 |
| [02](home-flow/02-village-to-camp.jpg) village toward the camp | `awake` | 902,19.7,9 → 986,32,−150 |
| [03](home-flow/03-t1-to-t2.jpg) T1 toward T2 | `awake` | 994,31.8,−149 → 970,31,−100 |
| [07](home-flow/07-q2-to-hook.jpg) Q2's end toward the hook | `q3-stocked` | 1027,26,33 → 1008,30,8 |
| [09](home-flow/09-lever.jpg) the lever, looking home | `q3-done` | 1097,27.9,42 → 912,20,0 |
| [10](home-flow/10-rim-to-summit.jpg) the Q5 frame toward the summit | `q4-done` | 1172,25.7,−23 → 1015,100,−6 |
| [11](home-flow/11-farhead-to-boiler.jpg) Far Head toward the forge | `q5-done` | 1379,25.7,−180 → 919,20,5 |
| [13](home-flow/13-summit-to-sea-gate.jpg) the summit toward the sea gate | `hook-earned` | 1015,104,−6 → 1180,24,−30 |
| [14](home-flow/14-q5-to-cleft.jpg) the rim toward Split-rock's cleft | `q4-done` | 1176,25.7,−28 → 1160,22,120 |
| [15](home-flow/15-pier-to-forge.jpg) the pier's end toward the forge | `q6-done` | 1402,26.5,−362 → 912,22,0 |

The forge-to-Needle-Bell and pier-to-Ring-Island stills were dropped when the shared look queue backed up behind
long playthroughs.

## Research gaps

- **Waiting at a site.** No source in the research index says how long a construction game can leave you standing while
  a delivery comes. Finding 1 rests on the bot's idle time and on the owner's lens ("dead time"), not on a cited rule.
- **First-timer times.** Every number here is a perfect bot's floor. There are no human per-beat times on the live
  route since 8 November.
- **Line of sight.** Nothing checks it from a beat end to the next goal. These stills are hand-aimed, and two were
  blocked by a frame or a deck edge.
- **Co-op spacing** on this route is inferred, not measured: the co-op bot's follower only watches line 2 from the
  village.
