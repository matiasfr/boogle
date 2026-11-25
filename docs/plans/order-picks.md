> **Status, 25 November 2026: plan, not built; every call in it is the owner's to rule on.** Planner, against main
> `d88237879` (world v67), which carries the decision this plan serves:
> [order picks, a trade that holds, felt inflation](../decisions-core-loop.md#d-2026-11-25-order-picks-sticky-trades-felt-inflation).
> Docs only: no code, tests or content changed. Garage step 4 as built (free swaps) stays live until he rules.
> [Design review](#design-review-2026-11-25) near the end; [owner questions](#owner-questions) last.

# Order picks: the first line's pick, the trade that holds, and the audit

## The answer on one screen

**Part A: the first line's order pick. Recommended: "the pack or the double jump first", taken at Station 1.**
After Station 1's bill, two stands by its frame hold the pack frame (logs 8 → 16) and the jump drum. Whoever holds
Take on one gives it to the room, and a little guy carries the other off to where it waits today: the pack to the
forge's first bill, the drum to the pillar after Station 3. One sentence a fresh player can say: _"We took the bigger
bag first because there were loads of logs"_, or _"we took the double jump first because we wanted to jump about."_
Neither order is a wrong answer, because **both are strictly ahead of today's route**, where the room has neither
until Station 3 and the forge. The pack first takes **5 fewer round trips (about 59 s of walking)** off Station 2,
Station 3 and the forge's first bill. The jump first saves **no haul time** (the crossing probe found no ground it
shortens) but puts movement in the room's hands **about 4.6 minutes sooner**. The two other candidates both lose: a
pick between the keener edge and the pack has a clear winner (59 s against 11 s), and a pick between the keener edge
and the jump puts a thin, unseen gain against a toy.

**Part B: the trade that holds. Recommended: a pick holds while its line is building, with one re-pick when the
building ends.** On today's route this is the only one of the three definitions that keeps Strong alive. Strong beats
Quick by **19.7 s** over leg 3 while it is built. Once it is laid, Quick is about **22 s a ride** faster. So a pick
that holds past the last lay makes Quick win everywhere after one ride. "Strong while we build, Quick once it's
built" becomes a commitment the room makes, instead of a setting it flips for every bill.

**Part C: the audit.** Of 22 upgrades the route grants through greybox legs 2 to 4, **13 are felt** (the same job,
bigger, within a couple of minutes), **3 are late**, **2 are thin**, **3 are keys, not power**, and 1 is unmeasured. The clearest cases:

- **The bigger cradle** arrives after the last footing bill on the built route, so it has no job left.
- **The pack** comes after **112 of the first line's 160 hand-hauled logs**. Part A's pick fixes this for the rooms that
  take it first.
- **The proper axe** quintuples a hit just as hand chopping ends (its next bill is 16 logs).

Boogles end mostly in **a loop beside the journey** (houses bring riders, riders bring fares). One buy in three, the
loader yard, touches the line.

**Five proposed changes, smallest first:** Q1's log line 16 → 32, so the axe and pack meet a bigger job at once; the
pick in Part A; the bigger cradle either dropped or given a footing bill to carry; the cave line offered the trade, so
Strong has a second leg to build; and a measurement of when rooms actually buy the loader yard.

**Six owner questions**, each answerable in one word, are [at the end](#owner-questions).

## Sources read

AGENTS.md; `npm run map -- --kind docs`; DESIGN.md; [context](../agents/context.md) and its design-work rules; the
[owner-calls index](../agents/owner-calls.md#index); the game-direction and design-review skills; Current rules of
[core loop](../decisions-core-loop.md#current-rules) and [rewards](../decisions-rewards.md#current-rules), and the
entries this plan names; [first-line-choice](../brainstorms/first-line-choice.md),
[first-line-decisions](../brainstorms/first-line-decisions.md),
[first-line-crossing-probe](../research/first-line-crossing-probe.md); [garage-choices](garage-choices.md) sections
0 and 2; [garage-step4](garage-step4.md); [the step 4 checkpoint](../reports/garage-step4-checkpoint.md);
[Checkpoint G](../reports/greybox-leg3-checkpoint-g.md); [campaign-outline](campaign-outline.md) sections 3 and
"Towns at the hubs"; [greybox-route](greybox-route.md) grants; [greybox-leg4](greybox-leg4.md)'s status; the last two
[playtests](../playtests.md#2026-11-14-grant-solo-his-granola-notes); [direction](../direction.md). Commands:
`npm run loop`, `npm run loop -- node T2|T3|forge`, `npm run loop -- run` (on `d88237879`).

**Measurement method.** Bills, capacities, yields and grants come from the code (cited by file and line). Distances
are `npm run loop`'s straight-line one-way metres from the nearest sources. Times are those distances at 5.6 m/s plus
0.3 s a press, the loop run's own constants (`dev/loop/run.ts:125`). "Calibrated" times are the loop run's clock with
human detours (`dev/loop/detour.json`). These are lower bounds and comparisons, not observed play. A scratch
calculation (not committed) turned the loop's distances into each pick's trips, hits and seconds. Its figures are
quoted where they are used.

---

## Part A: the first line's order pick

### What the first line grants today, in code

| Grant | Change | Where it comes | Code |
| --- | --- | --- | --- |
| Starter (multi-)axe | a hit gives **1**; a tree holds 10 | the wake | `src/sim/railway-layout.ts:18` (`RAILWAY_YIELD.first`), `:22` (`sourceYield`) |
| Keener edge | a hit gives **2** | Station 3 funded (32 logs and the beam in); no card, the multi-axe's flourish | `src/sim/railway-queries.ts:99-105` (`keenEdge`, `hitYield`); `src/entities/railway/ability-arrival.ts:21` |
| Double jump | second jump | the drum on pillar p1, reached once Station 3's gantry passes. **Held by the world only**: `rail.jump` has no rule gate | `src/sim/railway-sys-line1.ts:355`; `src/entities/railway/tools.ts:91-123` |
| Pack frame | logs **8 → 16** | the forge's first bill (24 of its 56 logs) | `src/sim/railway-layout.ts:9-16`; `src/sim/railway-sys-line2.ts:304`; `src/sim/railway-line2-layout.ts:12`, `:174` |
| Proper axe | **5** a hit from trees | the forge lit, on its pedestal | `src/sim/railway-layout.ts:18` |
| Rail yoke | rails **8 → 16** | Q1's bill in | `src/sim/railway-sys-line2.ts:310` |

The first line's bills (`src/sim/railway-line-layout.ts:25-27`, `src/sim/railway-line2-layout.ts:12, 42`): T1 24
logs; T2 32 logs + 8 stone; T3 32 logs + the beam; the forge 24 + 32 logs; Q1 16 logs + 6 rails. After Q1 the depot
cart brings logs to a rack by each frame, so **hand hauling from trees ends at Q1**. One solo player reaches T1 at
0:52, the jump at 5:31 and Q1 at 8:17, calibrated (`npm run loop -- run`). "The next ten minutes" below means T2
through Q1.

Separate capacities replaced the old carry-12 number ([17 November](../decisions-core-loop.md#d-2026-11-17-separate-capacities)
and [its answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers)). **The carry option in today's
terms is the pack: logs 8 → 16**, the same shared chest the forge makes today, not a new 12.

### What each early upgrade makes easier from T2 to the forge's first bill

Straight-line arithmetic on the loop's distances (T2 logs 20 m and stone 29 m, T3 45 m, forge 35 m, one way):

| Taken at T1 | Trips | Walking | Hits | Total at 0.3 s a hit | Saving on today |
| --- | ---: | ---: | ---: | ---: | ---: |
| Today (neither) | 14 | 165.7 s | 100 | 195.7 s | — |
| **Pack** (logs 16 from T2) | **9** | 106.8 s | 100 | 136.8 s | **58.9 s** (T2 14.3, T3 32.1, forge's first bill 12.5) |
| **Keener edge** (2 a hit from T2) | 14 | 165.7 s | **64** | 184.9 s | **10.8 s** (36 fewer hits: T2 20, T3 16); about 22 s at 0.6 s a hit |
| **Double jump** | 14 | 165.7 s | 100 | 195.7 s | **0 s** on bills: the probe found both stations' hauls on flat, direct ground ([verdict](../research/first-line-crossing-probe.md#verdict)) |

A 16-log back spans two 10-log trees, so the pack's real saving is a little under 59 s. The probe's concrete
itineraries showed the inter-tree legs are short ([bundles](../research/first-line-crossing-probe.md#concrete-bundles-rather-than-an-average-tree)).
Hit cadence for a human is **unmeasured**: the loop's 0.3 s is near the server's 0.24 s minimum (`RAILWAY_T1.swingMs`).

What the double jump does give early, from the probe's reach run
([early jump](../research/first-line-crossing-probe.md#early-jump-and-later-progression)): after T1 or T2 it reaches
the apron, the lookout and the alcove. It reaches no tech pad, p1, the hook or the summit. The lookout's optional
secret becomes reachable sooner. The quarry lever stays refused before Q3 by the rules.

### Three candidates

| | **A. Pack or double jump** (recommended) | **B. Keener edge or pack** | **C. Keener edge or double jump** |
| --- | --- | --- | --- |
| The two upgrades | the pack (logs 8 → 16) and the double jump | 2 a hit and logs 8 → 16 | 2 a hit and the double jump |
| Where and how the room picks | Two stands beside Station 1's frame, world (995.6, −141.9) ([T1](../../src/sim/railway-line-layout.ts)). Station 1's board shows both before its bill is in ([foreshadowing](../decisions-rewards.md#d-2026-11-17-forge-made-rewards)). When the bill is in, a little guy sets both out. A one-second hold of Take on one gives it to the room | the same stands; the edge's stand holds the multi-axe on a whetstone block | the same stands, the edge's whetstone and the jump's drum |
| When the other arrives | where it does today: the drum on the pillar after T3 (about 5:31), or the pack at the forge's first bill (about 6.5 to 7.5 min) | the edge at T3 funded; the pack at the forge | the edge at T3 funded; the drum after T3 (both Station 3's gifts) |
| Next ten minutes, pick 1 | **pack**: 5 fewer trips, about 59 s | **edge**: 36 fewer hits, about 11 s | **edge**: 36 fewer hits, about 11 s |
| Next ten minutes, pick 2 | **jump**: 0 s on bills; movement and the lookout, alcove and apron about 4.6 min sooner | **pack**: about 59 s | **jump**: as in A |
| One sentence | "bigger bag first" / "double jump first" | "fewer swings" / "fewer trips" | "chop faster" / "jump higher" |
| No wrong answer? | **Yes**: both orders beat today's route, the gains differ in kind (hauling against movement), and neither blocks or strands anyone | **No**: same kind of gain, and the pack wins by about 48 s | **Weak**: the edge has no card or words today, and 11 s spread over 72 hits is hard to notice |
| What a second player sees | both parts on the board, then on the stands. The pick's shared moment and card play for everyone online ([cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone)). Then the little guy carrying the other off. A late joiner gets the existing flourish (`ability-arrival.ts`) | the same | the same |

**What each breaks.** A pick changes a rule only in the rooms that take that order. The other order leaves the rule as
it is.

- **A**, jump first:
  - moves [loop orders](../decisions-core-loop.md#d-2026-11-09-loop-orders) ("the second jump comes after station 3: that order is the design") and [double jump stays after Station 3](../decisions-core-loop.md#d-2026-11-16-double-jump-stays-after-station-3). The live rule "a layout change that lets the pillar be reached earlier is a bug" still holds: no geometry changes, and the pillar is still reached only after T3. What changes is where the jump is given.
  - moves [the boiler fit is the first upgrade a player chooses](../decisions-core-loop.md#d-2026-11-09-the-boiler-fit-is-the-first): this pick becomes the first, in either order. The boiler fit stays the first install.
  - the drum on pillar p1 is already the room's. The pillar's lip and the walk home do not depend on it (`tools.ts:91`).
  - the early reach of the lookout, alcove and apron needs a real collider witness. The probe's checker is not a physics witness.

  A, pack first:
  - moves [forge-made rewards](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) ("a little guy builds the pack frame from the forge frame's last timber") and separate capacities answer 2 ("the pack chest raises logs 8 → 16 where it stands today"). Station 1's little guy builds it instead, and the forge's first bill then makes nothing new in that room.
  - the production bot, the seeds (`src/sim/railway-seed-route.ts:99, 268` expect the pack at `lit`) and the loop graph assume today's order.
- **B**: moves separate capacities answer 1 ("the yield doubles once Station 3 is funded"), or forge-made rewards and answer 2. It also moves the boiler-first call. No geometry.
- **C**: moves answer 1, or loop orders and the 16 November call. It also moves the boiler-first call. Forge-made rewards are untouched.

**Rejected outright:** "pack or proper axe at the forge's first bill" keeps every rule, but it falls after most hand
hauling and the pack wins it (about 25 s against 3 s). An early proper axe moves the forge's lit reward to the first
station.

**Recommendation: A.** It is the owner's earlier candidate restated for separate capacities. Its two orders differ in
kind, so a fresh player can explain either, and each is felt on the very next thing they do: the next haul, or the
next jump. It also fixes the pack's lateness ([Part C](#part-c-the-audit)) for rooms that take the pack. Its cost is
two rule moves, one per order. C is the alternative if the owner wants forge-made rewards left whole: it keeps the
pack where the forge makes it, and asks the edge to become visible.

**Fit (game-direction).** This serves DESIGN **8** (both orders work alone and together), **7** (the board shows both
before the bill) and **11** (the stand you emptied is the upgrade you have). It answers the direction row's "a fresh
player on the wake-to-pier stretch makes a choice they can explain". It is proceed-within-scope once the owner picks.
No prerequisite is missing: no geometry, asset, garage or town work is needed first.

---

## Part B: the trade that holds

### What is measured today

The step 4 checkpoint fits through accepted `rail.bring` and `rail.install` on `trade-ready`. Its figures are solo
means over eight start offsets, and each total runs to leg 3's third lay
([table](../reports/garage-step4-checkpoint.md)):

| Fitted at | Strong vs Standard | Strong vs Quick | Quick vs Standard |
| --- | ---: | ---: | ---: |
| `trade-ready` (bay line building leg 3) | +55.2 s | **+19.7 s** | +35.5 s |
| `trade-ready` → `bay-reached` (the window mostly gone) | +6.0 s | **−29.0 s** | +35.0 s |

Quick per ride on the bay line: 4.5 s until the bay cut's last lay, 10.5 s after, then about **22 s** with leg 3
([garage-step4](garage-step4.md#strongs-window-what-checkpoint-g-measured-and-three-options)). On `ns`, Strong carries
"Nothing to build", and Quick saves 9.8 s a ride. After leg 3, no trade line has a multi-section leg to build on the
built or planned route: the Notch leg is one section, and greybox leg 4 runs the cave line on standard trains only
([agent call, 24 November](../agent-calls.md#core-loop-pacing-and-progression)). The play "Strong while building,
Quick after" exists only because swaps are free and unlimited
([24 November](../decisions-rewards.md#d-2026-11-24-garage-step4-strong-window)).

### Three ways to define "a stage"

| | 1. **While the line builds, then one re-pick** (recommended) | 2. **One pick per line, for good** | 3. **A re-pick each time a new leg opens** |
| --- | --- | --- | --- |
| The rule | A fit holds until every built leg the line carries kit for is laid (bay: the bay cut and leg 3, which the kit-ahead rule loads as one run). Then the line has one free re-pick, which holds until the line builds again | The first fit is final | A fit holds until the line's next leg opens (bay: from `bay-mid` to the Canopy gate, then from the gate to the Notch, which is not built) |
| Bay line | Strong while building: +19.7 s over Quick across leg 3. Re-pick Quick once laid: about 22 s a ride after | Strong's +19.7 s once against about −22 s every ride, for good. **Quick wins after one ride** | Strong for leg 3 holds for the rest of the built route: +19.7 s, then about −22 s a ride. **Quick wins after one ride** |
| `ns` | Quick, every stage | Quick | Quick |
| Does one option win everywhere? | **No**: each stage has its own best (Strong while building, Quick after), and the room commits to it | **Yes, Quick**: the trade dies, and Strong is a trap for solo rooms | **Yes, Quick**, on today's route |
| What the room loses by a wrong first fit | Quick for leg 3: 19.7 s it cannot claw back. Strong past the build: nothing, since the re-pick comes then | the whole line's future | as 2, until the Notch |

**Recommendation: definition 1.** It keeps both rows worth fitting, and it turns the free flip into a commitment at
the moment the room has just felt the kit wait, at the West landing, 28 s from the post. It also matches the owner's
own 15 November condition, "limit to one swap per line per stage only if rooms flip for every bill". The honest
limit: each stage still has a best answer, so this is a well-timed commitment, not a balanced trade. Balance inside
a stage is the 2D page's job, which garage-choices already asks for ("neither wins on every line"). And the stage
rule only matters again once a trade line gets a second building leg (proposal C4).

### What changes

- **Rules** (`src/sim/railway-sys-steel.ts` `install`; `src/sim/railway-queries-route.ts`): for a line already on row
  4 or 5, an install of the other row is refused while the line is building and its hold is on. It is accepted once
  per building's end. A new per-line fact records the hold: either a column (for example the leg the fit was made
  in), or one derived from saved lay facts if they carry ticks. The builder checks `Line` and the leg rows. The first
  fit's 1 steel is unchanged. The re-pick is free.
- **The world version**: a new `Line` column, or a changed meaning of `rail.install`, takes one bump under
  [mixed-builds](../agents/mixed-builds.md) ("No bump waits"; ship outside his sessions).
- **The garage screen's words** (UI placeholders for the owner, none of The Boogler's copy):
  - the other tile's "Swap" becomes **"Held while the line builds"** during the hold, and **"Swap (once)"** after it.
  - the Install hold refuses with **"Held until the line is laid"**.
  - "Kit a trip" and "Nothing to build" stay.
  - Suspect: "Swap (once)" may read as a price. The owner words it.
- **Garage step 4 as built** keeps its free swaps until he rules.

---

## Part C: the audit

Times are a solo player's calibrated clock from `npm run loop -- run` on `d88237879`. "Next bill" means the next bill
of the same kind. **Felt**: the same job, bigger, soon. **Late**: the job it helps is over. **Thin**: the gain is too
small to notice. **Key**: it opens a place and adds no number.

| # | Upgrade (when) | What it changes | Last bill of that kind before | Next bill of that kind after, and how soon | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | Starter axe (wake, 0:00) | 1 a hit, 10 a tree (`railway-layout.ts:18, 22`) | none | T1, 24 logs: 24 hits, at once | **Felt** (it is the verb) |
| 2 | Keener edge (T3 funded, 5:22) | 1 → 2 a hit (`railway-queries.ts:99`) | T3, 32 logs at 1: 32 hits | forge, 56 logs: 28 hits instead of 56, at once | **Felt**, though unseen (no card or words) |
| 3 | Double jump (pillar, 5:31) | second jump | none: no bill needs it | none: reaches the lookout, alcove and apron (probe) | **Thin as power**; a toy, felt at once |
| 4 | Pack (forge's first bill, about 6:30 to 7:30) | logs 8 → 16 (`railway-sys-line2.ts:304`) | forge's first bill, 24 logs: 3 trips. **112 of the first line's 160 hand logs come before it** | forge's second bill, 32 logs: 2 trips instead of 4, at once; then Q1's 16 | **Late** (felt for 48 logs) |
| 5 | Proper axe (forge lit, 7:30) | 5 a hit from trees | forge's second bill: 16 hits at 2 | Q1, 16 logs: 4 hits instead of 8, 47 s later; then the cart takes over | **Thin** (about 1 s; the big chop jobs are over) |
| 6 | Depot cart (Q1 laid, 8:17) | 24 logs to a rack by the frame; rails from Q4 | Q1, 16 logs walked 41 m | Q2, 24 logs: 10 m from the rack instead of 26 m from trees, 4 min later | **Felt** |
| 7 | Rail yoke (Q1, 8:18) | rails 8 → 16 (`railway-sys-line2.ts:310`) | Q1, 6 rails: 1 trip | Q2, 12 rails at 44 m: 1 trip instead of 2; Q3, 12 at 110 m: about 39 s saved | **Felt** |
| 8 | Hook (Q2, 13:34) | pull to rings | none | the sea gate's far jamb, 4 min later | **Felt** (key and verb) |
| 9 | Glider (summit, 20:33) | glide | none | the gap at Ring Island, about 20 min later; glide home at once | **Felt** as movement |
| 10 | Trains (boiler fit, 21:21) | logs and rails by train | Q5, 24 + 24 from the cart | Q6, 32 + 32 at 3 m instead of 32 m and 496 m, 2 min later | **Felt** (the biggest) |
| 11 | Breaker (25:37) | stone 8 → 16; strikes the seams | T2, 8 stone (2:20) | kiln, 16 stone: 1 trip instead of 2 (about 9 s), 1 min later | **Felt**, small |
| 12 | Footing wagon (cradle, 28:26) | 6 footings a trip | stall, 2 footings by hand at 147 m | crossing, 12 footings at 9 m instead of 527 m, 4 min later | **Felt** |
| 13 | 20 m/s upgrade (table, 29:22) | Home engines 14 → 20 m/s ([garage-choices G-a](garage-choices.md#2-what-the-player-chooses-and-when)) | the 14 m/s rides | the crossing's one-minute ride (88.6 s at 14), at once | **Felt** |
| 14 | Loader yard (plot 2, Boogles) | arm loads footings onto every line 2 train (`railway-trade-layout.ts:47`) | the bents' 14 footings (39:46) | weights, 4 footings; then **no footing bill on the route** | **Late or unmeasured**: when rooms afford it depends on fares |
| 15 | Longer boiler and steel car (install, 44:39) | line 2 to 25 m/s, one car (`railway-train.ts:37-47`) | the 20 m/s rides | the stack legs' kit rides, at once | **Felt** (seconds a ride unmeasured) |
| 16 | Bigger cradle (steel home, 4 steel) | wagon 6 → 10 footings (`railway-works-layout.ts:8, 12`) | weights, 4 footings (40:32) | **none**: legs past Ring Island carry no footings | **Late** |
| 17 | Big boiler (High Gorge, line 2, 6 steel) | 30 m/s | line 2's 25 m/s rides | line 2's rides after the Gorge | **Unmeasured** |
| 18 | Quick on a trade line (1 steel) | 25 m/s | the line's 20 m/s rides | bay: +35.5 s over leg 3; ns: 9.8 s a ride | **Felt** |
| 19 | Strong on a trade line (1 steel) | one more car: two sections' kit | the 1-section trips | bay: +19.7 s over Quick across leg 3; ns: none | **Felt** on bay while building; **thin** on ns |
| 20 | Powered pick (Gorge, 57:14) | opens the incline barrier and later the cave plug (`railway-route.ts:317`) | none | the incline's barrier 19 s later | **Key** |
| 21 | Crystal seeds (Bell Rock, 1:02:27) | open the Canopy barrier | none | the Canopy gate, 9 min later | **Key** |
| 22 | Glider cloth (Canopy, 1:17:31) | opens the Notch barrier; glide speed not built | none | the Notch, not built | **Key**, dangling (its lock is not built) |

Count: felt 13 (rows 1, 2, 6 to 13, 15, 18, and 19 on the bay line) · late 3 (4, 14, 16) · thin 2 (3, 5; 19 is thin
on `ns`) · key 3 (20 to 22) · unmeasured 1 (17). Source upgrades (the faster loader arm,
hub towns' board offers) and the carry sling and hook reel are named in plans and `RAIL_GRANTS` but do nothing yet
([greybox-route](greybox-route.md), [campaign-outline](campaign-outline.md#2-what-each-town-receives-grows-into-and-gives)),
so they are not rows.

**Do Boogles end in the next haul, or in a loop beside the journey?** Mostly **in a loop beside the journey**. The
Village's three priced plots (`src/sim/railway-trade-layout.ts:44-49`) are a house (one rider a minute), the loader
yard (footings onto line 2 trains) and a house (one rider a minute). Two of the three buy riders, and riders buy fares,
which buy the next house. The loader yard is the one buy the line feels, and its footing job ends at the weights
(about 40 min in). Whether rooms reach it before then is unmeasured. Nothing else on the route takes Boogles (decided:
anything that rolls costs materials). So the line's power comes from materials and steel, and Boogles grow towns.

### Proposed changes, smallest first

1. **Q1's log line 16 → 32** (`src/sim/railway-line2-layout.ts:42`). With the axe's 5 a hit and the pack's 16, the
   first post-forge bill matches T3's 32 logs in 7 hits and 2 carries, against T3's 32 hits and 4. That is the
   inflation shown in one beat. Cost: one more 41 m round trip and 3 hits (about 16 s) and a rules change. A save
   mid-Q1 needs the builder's [mixed-builds](../agents/mixed-builds.md) read. Moves no recorded call; Q1's bill is a
   stand-in.
2. **Part A's pick**, which makes the pack felt across T2, T3 and the forge for rooms that take it first. Its costs are
   listed above.
3. **The bigger cradle: drop it, or give it a job.** Dropping it returns 4 steel to the pool, and garage G-c ("the
   first install that spends") passes to the big boiler or a trade fit. Giving it a job means a footing line on the
   stack legs' sections, which adds a bill. Moves [garage choices](../decisions-core-loop.md#d-2026-11-15-garage-choices)'s
   "the bigger cradle (decided, the second steel pick)". An owner question.
4. **Offer Quick or Strong on the cave line** when its garage step comes. This moves greybox leg 4's open agent call
   (standard trains only), and gives the Part B hold a second building leg. Cost: one garage step on leg 4's line.
5. **Measure the loader yard's buy time** in the loop run or the trade seed, against the bents and weights. If it lands
   after the weights, its arm should load something the later legs need. A finding before any change.

---

## Steps

Each step is one builder's. A step is built only after the owner's answer to its question. Steps A1 to A3 wait on
question 1, B1 and B2 on question 3, C1 on question 4, and C2 on question 5.

| Step | What | Files (likely) | Checks | What a look must show |
| --- | --- | --- | --- | --- |
| **[x] A1. The pick's rules** | After T1 is funded and neither part is taken: `rail.pack` and `rail.jump` are accepted at Station 1's stands, and the other stays where it is today. A pack taken there skips the forge's first-bill gate. `rail.jump` gains a position rule (the stand, or the pillar after T3) | `src/sim/railway-sys-line1.ts`, `railway-sys-line2.ts` (pack gate), `railway-line-layout.ts` (stand positions), `railway-queries.ts`; `src/world/railway-server.ts` (admission); `src/adapters/railway-intents.ts`; read [room-safety](../agents/room-safety.md), [mixed-builds](../agents/mixed-builds.md), [lockstep](../agents/lockstep.md) | `npm run check`; one focused unit test (one pick, both parts eventually, no double grant, racing peers); `npm run test:net`; `npm run loop -- run` in both orders; one world bump | — |
| **A2. The pick in the world** | Station 1's board shows both parts before the bill. A little guy sets out two stands. A one-second hold of Take. The shared moment for everyone online. The little guy carries the other part off. The drum on the pillar reads as the room's in jump-first rooms; the forge's first bill makes nothing new in pack-first rooms | `src/entities/railway/tools.ts`, the forge-rewards view, `ability-arrival.ts`, `src/content/prefabs/railway.ts` (compiled output); `docs/game-design/place.md` | `npm run check` | `look --rail-seed` after T1: the board before the bill, both stands framed with the frame, two peers (`--players 2 --real`) seeing one take, the card and the carry-off; a late join's flourish |
| **A3. Proofs for both orders** | Jump first: collider witnesses for the apron, lookout and alcove; no route bypass. Both orders through the bot | `dev/look/bots/railway.ts`, `src/sim/railway-seed-route.ts` (`:99, 268`), dev jump rows | `npm run level-check`; the bot route both ways | stills at the lookout and alcove reached early, and the lever refused |
| **B1. The hold's rules** (built) | Definition 1: the hold while the line builds, one re-pick after | `src/sim/railway-sys-steel.ts`, `railway-queries-route.ts`, `railway-components.ts` (`Line`), `railway-check-steel.ts` | `npm run check`; the step 4 unit tests plus one hold test; `npm run test:net`; rerun `dev/sim/leg3-trade.ts` and report the table; one world bump | — |
| **B2. The hold on the screen** (built) | The placeholder strings above; Install withheld with its reason. After the re-pick the other tile reads "Re-pick used". | `src/entities/railway/garage-{data,state,view}.ts`, `src/features/garage.ts` | `npm run check` | two peers at the post during a hold, both screens reading "held", then a re-pick after the leg's last lay |
| **[x] C1. Q1 at 32 logs** | One bill number | `src/sim/railway-line2-layout.ts:42`; `docs/game-design/place.md` | `npm run check`; `npm run loop -- run` (report Q1's time) | none needed beyond the frame's board reading 0/32 |
| **C2. The bigger cradle** (removed) | Per the answer: drop it from the offer, or add a footing line | `railway-works-layout.ts`, `garage-data.ts`, or the stack legs' catalog | `npm run check`; loop run | the Engine or Cargo tab without it, or the footing line's board |
| **C3. The loader's timing** | Measure the loader yard's buy time against the bents and weights | the loop run or `src/sim/railway-seed-trade.ts` (read only) | report only | — |

## Decided, proposed, default

| Call | Kind | Source |
| --- | --- | --- |
| One order pick on the first line; the room gets both; no fork, no new crossing; seconds are fine | **Decided** | [25 November](../decisions-core-loop.md#d-2026-11-25-order-picks-sticky-trades-felt-inflation) |
| The trade holds for a stage; free swaps stay live until he rules | **Decided** | the same |
| Upgrade choices are made in the world; shared progression moments play for everyone online | **Decided** | [9 November](../decisions-core-loop.md#d-2026-11-09-station-6-takes-nothing-by-hand); [17 November](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone) |
| Stations that grant upgrades show them on the board before the bill | **Decided** | [forge-made rewards](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) |
| The pick is the pack or the double jump, at Station 1 | **Proposed** (question 1) | this plan |
| The other part arrives where it does today | **Proposed** | [first-line choice, two stages](../decisions-core-loop.md#d-2026-11-16-first-line-choice-two-stages) took the same answer |
| The pick may move "jump after Station 3" and "boiler fit first chosen" in rooms that pick that way | **Proposed** (question 2) | the 25 November entry leaves both standing until he says |
| A stage is "while the line builds", with one re-pick | **Proposed** (question 3) | this plan |
| Q1's log line 32; the bigger cradle; the cave line's trade | **Proposed** (questions 4 to 6) | this plan |
| A one-second hold of Take; the first accepted hold picks for the room | **Default** | Install's hold ([10 November](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade)); see finding 2 |
| Two stands beside Station 1's frame; the whetstone block, drum and frame models are reused | **Default** | placement for the look in A2 |
| The forge's first bill makes nothing new in pack-first rooms | **Default** | cheapest; an owner may want a product there |
| The re-pick is free; the first fit stays 1 steel | **Default** | [step 4](garage-step4.md#the-rules) prices |
| The placeholder strings "Held while the line builds", "Swap (once)", "Held until the line is laid" | **Default** (UI placeholders) | for the owner's words |

## Owner questions

1. **The first-line pick: A (pack or jump)?** Recommended **A**. Alternative: **C** (keener edge or jump), which keeps
   the pack the forge's product. Answer: A / C.
2. **In rooms that pick that way, may the jump come before Station 3 and may this pick be the first chosen upgrade?**
   Recommended **yes**: no geometry moves, and the pillar is still reached only after T3. Alternative: **no**, which
   leaves only B (edge or pack), a pick with a clear winner. Answer: yes / no.
3. **A stage for the boiler trade: "while the line builds, then one re-pick"?** Recommended **yes** (definition 1).
   Alternative: **leg** (a re-pick each time a new leg opens), under which Quick wins everywhere on today's route.
   Answer: yes / leg.
4. **Q1's logs 16 → 32**, so the axe and pack meet a bigger job at once (about 16 s more)? Recommended **yes**.
   Alternative: **no**, and the axe stays thin. Answer: yes / no.
5. **The bigger cradle, whose footing job is over when steel comes home: drop it or give it a bill?** Recommended
   **drop** (4 steel back to the pool). Alternative: **bill** (a footing line on the stack legs). Answer: drop / bill.
6. **Offer Quick or Strong on the cave line when its garage step comes**, so the hold has a second building leg?
   Recommended **yes**. Alternative: **no**, which keeps leg 4's standard-only call, and Strong is a leg 3 tool.
   Answer: yes / no.

## Risks

- **Early jump reach.** The probe's checker is not a physics witness. The lookout, alcove and apron reached early need
  colliders proved (A3) before jump-first rooms ship. Props and trains as launch points are unverified.
- **Two orders to keep alive.** The bot, seeds, jump rows and loop graph assume one order. A3 must run both, or a
  regression hides in the order nobody plays.
- **Racing peers at the stands.** CL-084 dropped "first press wins a fork". Here nobody loses a part, but a friend
  can still feel overruled (finding 2).
- **The stage rule is invisible until it bites.** A room that never tries to swap mid-build never learns the rule
  exists. B2's look must show the held state in words and on the post.
- **Saves.** Both A1 and B1 bump the world. Ship outside the owner's sessions.
- **Numbers are straight-line arithmetic.** Human chop cadence and inter-tree walks are unmeasured. The 59 s and 11 s
  are comparisons, not observed play.

## Design review (2026-11-25)

Run by the plan's author with the reading above, against DESIGN.md, the owner calls, the core-loop and rewards
Current rules, direction and the two 14 November playtests. The plan was reread from the top before the calls were
listed.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | One order pick on the first line, both parts in the end | Decided | [25 November](../decisions-core-loop.md#d-2026-11-25-order-picks-sticky-trades-felt-inflation) |
| 2 | No fork, no new crossing terrain | Decided | [17 November](../decisions-core-loop.md#d-2026-11-17-first-line-no-fork), kept by 25 November |
| 3 | The pick is made in the world, its moment shown to all online | Decided | 9 and 17 November entries |
| 4 | The pack (logs 8 → 16) as the carry option | Decided (the meaning) | [separate capacities answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers) |
| 5 | A: pack or double jump at Station 1 | New | recommended; question 1 |
| 6 | The other part arrives where it does today | New | matches the 16 November brief's taken answer |
| 7 | The jump may come before T3 in jump-first rooms | New | question 2; moves loop orders and the 16 November revert |
| 8 | This pick becomes the first chosen upgrade | New | question 2; moves 9 November |
| 9 | Station 1's little guy builds the pack in pack-first rooms | New | moves forge-made rewards for those rooms |
| 10 | Two stands at Station 1, board foreshadows both | Default | foreshadowing rule |
| 11 | A one-second hold; the first accepted hold picks | Default | Install's hold |
| 12 | The forge's first bill makes nothing new in pack-first rooms | Default | cheapest |
| 13 | A stage = while the line builds, one re-pick | New | question 3 |
| 14 | The re-pick is free; the first fit stays 1 steel | Default | step 4 prices |
| 15 | Placeholder strings for the hold | Default | the owner words them |
| 16 | Q1's logs 16 → 32 | New | question 4 |
| 17 | Drop the bigger cradle | New | question 5; moves garage-choices G-c |
| 18 | The cave line gets the trade | New | question 6; moves greybox leg 4's agent call |
| 19 | Measure the loader yard's buy time first | Default | a measurement, no change |

**Count:** 4 decided, 9 new, 6 default. The new and default calls are listed here and not added to
[agent-calls](../agent-calls.md). They wait on the owner's ruling of this plan, and the brief keeps them in the plan.
The builder logs whatever ships on a default.

### Findings

1. **The double jump's "next ten minutes" is zero on the bills** (probe). A's "no wrong answer" therefore rests on
   both orders beating today, not on equal seconds. The plan says so, and the one-screen answer gives both numbers.
   No step changed.
2. **CL-084 dropped "first press wins a fork".** The pick is an order, not a fork: nobody loses a part. Still, call
   11 makes the first accepted hold decide for the room, so a partner can be overruled. A2's look must show both
   players the board before the bill, so the pick is visible ahead of the press. Kept as a default with this
   finding, not a new co-op vote mechanic, because a vote would hold progress on an absent friend (DESIGN 8).
3. **Level design.** The pick places two stands at Station 1 and changes what reaches what early in jump-first
   rooms. No stills were taken: this is a documentation task and the map's checks say no browser. So A2 owns the
   first-sight stills, and A3 owns the reach proof (the route contract: movement may skip distance, never the work).
   From the probe: no tech pad, hook or summit is reached early, and the lever stays refused. The rule "the next goal
   can be found" holds: the other part's carry-off shows where it will wait. Nobody is stranded: both orders end
   with both parts.
4. **Part B's recommended stage still has a best answer per stage.** Stated in the plan. Balancing inside a stage is
   the 2D page's work, and the cave line (question 6) is the only planned place where it matters again.
5. **Playtest fit.** Grant's "running errands with no real decisions" and the owner's "no note says a haul was too
   long" point the same way: the pick adds a decision without adding a bill. Proposal C1 adds about 16 s, flagged
   against the owner's wariness of grinds.
6. **First-island teaching** ([16 November](../decisions-core-loop.md#d-2026-11-16-first-island-teaches)): the pick
   teaches that upgrades are picks the room makes, which is a mechanic the later garage trade reuses. It fits the
   first island's teaching role.

### Owner questions

The six [above](#owner-questions), each with a recommendation.

**Suspect lines of The Boogler's:** none read, written or changed. **Placeholder UI strings for the owner:** "Held
while the line builds", "Swap (once)" (suspect: may read as a price), "Held until the line is laid".
