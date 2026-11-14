> **Status: proposed (2026-11-14).** Plan and design review only; nothing built. Numbers are from `src/sim` on
> `7e2fa099b`, computed with the sim's own `trainLegTicks` in a scratch script; laps and waits are *arithmetic* from
> those ride times (nonstop, 5 s dwell at each end), not a measured run. Step 0 measures them.

# Train progression: one slow train first, then more and faster through the garage

Designer, 14 November 2026.

**The owner's words (14 November 2026, after playing the live game on an iPad).** "It also feels like maybe at the
beginning we get a lot of trains all at once, and maybe it's a little too much. And also the trains move really fast
from the beginning. Maybe they should start off slower to give a more satisfying sense of progression later."

It is feedback with two "maybe"s, not a ruling, so nothing here is recorded in the decision log; the calls are in
[agent-calls](../agent-calls.md) for him to revisit.

## Goal

When the boiler is fitted, one engine wakes beside you and pulls away as a heavy new machine. The railway then gets
busier and faster in steps the player causes and can see, with the Roundhouse as the place the steps come from.
Serves DESIGN.md **7. Telegraph everything** (the next engine waits in sight), **11. Show, don't tell** (a faster
train says the Roundhouse works) and **6. Communal world** (every step is the room's). It bends none.

**Binding.** "Playtest before bespoke functionality" (he has now played; this is from that play, and the recommended
option adds no new mechanic); "Engine foundations first" (no new component or system, two rules on existing rows);
"Save resets never block development" (next free `WORLD_NS` is v45); "Development is live"; "Anything playtests
could tune is tunable".

**Research.** [roundhouse-trains](../research/roundhouse-trains.md) (used: "start with one train"; "an extra train
must open or improve an actual service"; "require a real trip saved before selling capacity or speed").
[upgrade-economy](../research/upgrade-economy.md) rec 2 (used: an upgrade repays an inconvenience the player has
begun to feel; a slow first train is that inconvenience, kept short).
[rail-as-play](../research/rail-as-play.md) and [incremental-game-maths](../research/incremental-game-maths.md) were
not re-read. Not a port from Place.

## 1. Today, in numbers

| Thing | Value | Source |
| --- | --- | --- |
| When trains start | the boiler fit at the old loco at Camp (`rail.boilerFit`); every train departs 6 s later (`TRAIN.wakeTicks` 60) | `railway-sys-line2.ts` |
| How many wake together | **4**: line 1's one, line 2's three (spread round its circuit from the Village and Far Head), on 193 m and 506 m of track | `RAIL_LINES[].trains` |
| Later | line 2 stays at 3 through the Pier, the Railhead and Ring Island; 6 from the first greybox section; 7 in the world | `fleet: [3, 6, 6, 6, 6]` |
| Top speed | **20 m/s** on both lines from the first second; 25 m/s on line 2 after the longer boiler | `speed: 200`, `BOILER_SPEED [200, 250]` |
| Acceleration and braking | 3.5 m/s²: 0 to 20 m/s in 5.7 s over 57 m | `TRAIN.accel` |
| Dwell | 5 s; trains stop only on request or at an end | `dwellTicks` 50 |
| Buddy | walk 5.6 m/s, sprint 9.5 m/s | `entities/player/state.ts` |
| The cart he has just watched | 9 m/s, 3 m/s² | `CART` |
| What changes speed today | only the longer boiler (steel, the last beat of the built route): 20 to 25 on line 2 | `rail.install` |

The train is 2.2 times the cart and 2.1 times a sprint the moment it exists, and the only speed step left is +25% at
the far end of the route. Rides and laps today (nonstop):

| Leg | Length | Ride | Lap | Walk / sprint the same length |
| --- | --- | --- | --- | --- |
| Line 1, Village to Camp | 193 m | 15.4 s | 41 s | 34 s / 20 s |
| Line 2, Village to Quarry | 156 m | 13.6 s | | 28 s / 16 s |
| Line 2, Village to Far Head | 506 m | 31.1 s | 72 s | 90 s / 53 s |
| Village to Pier | 708 m | 41.2 s | 92 s | 126 s / 75 s |
| Village to Ring Island | 1,172 m | 64.4 s | 139 s | 209 s / 123 s |
| Village to High Gorge | 3,212 m | 166.4 s | 343 s | 574 s / 338 s |

**The first minute.** Both lines share the Village platform. With three trains on a 72 s lap and one on a 41 s lap,
the Village sees a line 2 train about every 24 s and a line 1 train every 41 s: about four arrivals and four
departures in the first 60 s, on an island that had a 9 m/s cart a minute earlier.

**Why it reads as too much and too fast.** (1) The fit is one act on one engine, and the answer is four engines: three
of them the player did nothing for and cannot see wake. (2) Three trains on 506 m is more service than the line
needs (a 24 s headway on a 31 s ride), so trains read as traffic, not as *the* train. (3) Nothing is left to earn:
20 m/s is the speed the sea crossing was tuned for ("a crossing starts at about a minute: 1.2 km at 20 m/s", 2
November), spent on a 193 m hop. (4) The pull-away is brisk: full speed in the first 57 m, nearly a third of line 1.

Earlier notes: 2 November, on Place, "Lots of trains running: 'there was life happening'" (liked) and 20 m/s over
1.2 km "pretty well balanced"; 50 m/s "a little too fast", maybe for end-game trains. Neither is contradicted: the
busy railway and the 20 m/s crossing stay, as places you get to.

## 2. The ladder

Three speed rows and a train per line extension. Every trigger is a beat on today's route (`npm run loop`).

| Rung | Trigger (exists) | Trains (line 1 + line 2) | Top speed, pull-away, braking | What it should feel like | How the player notices |
| --- | --- | --- | --- | --- | --- |
| 0 | the boiler fit (`trains`) | 1 + 0 | **14 m/s**, 2.5, 3.5 m/s² | one heavy machine you woke; it is yours | the wake as built (rust, steam, whistle), on the one engine beside you; 5.6 s to reach 14 m/s |
| 1 | 33 s later: line 1's first train stands at the Village | 1 + 1 | the same | the railway answering | line 2's engine at the Village clears its rust and whistles back as you pull in, and leaves 6 s later; step across and ride it to Far Head with no wait |
| 2 | Q6 laid, the Pier opens (708 m) | 1 + 2 | the same | the line grew, so it got a second train | an engine rolls out at the Village with a whistle; the halt boards gain a row; the hall map a dot |
| 3 | the Roundhouse `table` beat (the table turns, the garage opens) | 1 + 2 | **20 m/s**, 3.5, 3.5 | the Roundhouse works, and you can feel it from a seat | each train, at its next Village stop, gets the platform beat already built for the longer boiler (puff, clank, squash, toot) and leaves visibly quicker; the garage's top speed row reads 20 |
| 4 | Q7 laid, the Railhead opens (834 m and growing) | 1 + 3 | the same | a working main line to sea | the third engine rolls out; today's service from here on |
| 5 | Ring Island joined | 1 + 3 | the same | as today | decided: three trains at Ring Island |
| 6 | steel home, the install (built) | 1 + 3 | **25 m/s** on line 2, fourth car | as built | the garage moment |
| 7 | first greybox section | 1 + 6 | the same | as built | trains join at the Village |
| later | a later boiler, cargo trains, the bays' brief | | up to 30 m/s only on legs it saves 10 s | | not in this plan |

**How slow is rung 0.** 14 m/s is 2.5 times walking, 1.5 times a sprint and 1.6 times the cart: clearly the fastest
thing on the island, and 30% under today. Rides at rung 0: line 1 in 18.6 s (walk 34 s, sprint 20 s); Village to
Quarry 16.0 s; Village to Far Head 41.0 s (walk 90 s, sprint 53 s); Village to Pier 55.4 s (walk 126 s). The ride
beats walking by about half on every leg; on line 1's 193 m it only just beats a sprint, which is true today too
once the wait is counted. 12 m/s was rejected (line 1 in 20.2 s loses to a sprint; Far Head 46.3 s); 16 m/s leaves
too small a step to 20. The steps are +43% (14 to 20) and +25% (20 to 25): the first is the one the player rides
most, so it is the larger.

**Why the table beat for 20 m/s.** It is the first time the Roundhouse does anything, it sits about a third of the
way from the fit to steel, and it lands before any track is laid over the sea, so the decided one-minute crossing is
never ridden at 14 m/s. It also gives the `table` beat, which has NO CUE and which the owner did not understand on
10 November ("why to turn the table"), a payoff he can feel.

**Why a train per extension.** It is the rule the greybox already uses (the fleet grows when a section is laid),
moved earlier. A new engine always answers something the player built, and "an extra train must open or improve an
actual service" holds: each arrives as the lap grows past what the trains there can serve.

**The Roundhouse's part.** Speed rows are boiler rows (`Line.boiler`, `Train.boiler`: "a boiler sets top speed and
how many cars", 10 November), so the garage's Engine page shows 14, then 20, then 25 with no new page. Engines that
have not joined stand in the Roundhouse's bays (under tarps in the ruin arc, then in the roofed bays) and roll out
from there: the rotunda review's "no bay without an occupant, starting with each line's fitted train", given a
reason to exist before stage 3. That part is view work that rides the rotunda plan (step 4 here).

## 3. Three options

| | (a) Tuning only | (b) A speed row per engine part, a train per beat (recommended) | (c) The player chooses at the garage |
| --- | --- | --- | --- |
| What | line 2 starts with 2 trains, not 3; both lines start at 16 m/s; the longer boiler still gives 25 | the ladder above | engines and parts are stock; at the garage you choose which line gets the next train or the next speed part |
| Felt result | calmer start; but one speed step, at the very end, and the whole sea crossing is built at 16 m/s (78.8 s to the island against the decided minute) | three speeds and five arrivals, each caused by a beat | the most ownership; a real decision solo and a real conversation in co-op |
| Sim state | none | none new: `Line.boiler` gets a third value and applies to line 1 too; fleet rows already stand in `TRAIN_PHASE.SHED` | new: owned stock, per-line assignment, costs |
| Rules | constants | `BOILER` rows carry speed, pull-away and braking; a story fit at the table; the fleet keyed on open stops as well as legs; line 2's first departure 33 s after the fit | assignment and purchase rules; what an unassigned engine does; a floor so no line has none |
| Wire | none | `rail.install`'s part for the longer boiler becomes 2 (same shape) | new ops; a garage page |
| Bump | v45 (legs in flight change) | v45, one bump for both sim steps if shipped together | v45 or later, plus a brainstorm |
| Cost | half a day | two small sim steps, one view step, one measurement | a brief, a brainstorm, a plan; weeks |
| Risk | fixes "too much", barely fixes "progression later" | waits in the lone-train phase (section 4) | bespoke; needs the rotunda's "what is a bay for" answered first |

**Recommendation: (b).** It is the smallest option that answers both sentences, it adds no state, and every number
in it is one row of a table. (c) is the right *next* thing if he likes (b): it is the brief the rotunda's stage 3 is
waiting for, and it is held until he has ridden the ladder ("Brainstorm new gameplay first").

## 4. Knock-on effects

**Waits at a lever** (worst is about one headway, more when the train serves asks on the way: each stop costs about
10 s at rung 0; mean is about half the worst). The target is the spacing plan's table C (mean at most 52.5 s, 1%
over 105 s, none over 115.8 s); the owner's looser greybox rate is a worst of 135 s settled.

| Phase | Lasts (10 November co-op session) | Trains, lap | Worst wait, mean | Today |
| --- | --- | --- | --- | --- |
| Line 1, rungs 0 to 2 | | 1, 47 s | 47 s, 24 s | 41 s, 21 s |
| Line 2, fit to Q6 laid (506 m) | about 3 min | 1, 92 s | **92 to 112 s**, 46 to 56 s | about 24 to 36 s |
| Line 2, Pier, before the table (708 m) | about 10 to 15 min | 2, 121 s | 61 to 81 s, 30 to 40 s | about 31 to 43 s |
| Line 2, Pier, after the table | until Q7 | 2, 92 s | 46 to 66 s | about 31 to 43 s |
| Q7 onward | | 3 | as today | as today |

The lone train on line 2 is the one place this plan is worse than the target: inside the owner's looser rate, over
table C's worst if both Quarry platforms ask. It lasts about two laps. **Mitigations, in order:** (1) the handoff:
line 2's engine wakes as line 1's first train reaches the Village, so the first ride to Far Head has no wait at all;
(2) line 2's train stands at the Village, kit aboard, so station 6's kit reaches Far Head about 80 s after the fit
(about 37 s today); (3) if step 0 measures a worst over 135 s, or fit to Q6 laid more than 90 s slower than today,
line 2 wakes with two (the second 30 s after the first), and rung 2's engine moves to Q7. A lone slow train never
serves a long line: by the time line 2 is 708 m it has two, and by 834 m three at 20 m/s.

**Rides.** Rung 0 adds 3 to 14 s a ride for about 15 to 20 minutes of play: perhaps ten rides, one to two minutes
in all, against a six-hour game. From the table on, every ride is today's.

**Freight and kits.** Arrivals a minute at Far Head fall from about 2.5 (three trains, 72 s) to 0.65 for the first
three minutes; at the Pier before the table from about 2.0 to 1.0, after it 1.3; from Q7 as today. The footing
wagon couples at the table beat, so every footing trip runs at 20 m/s as today, and the garage's "Footings a
minute" rows do not move. Station 6's bill arrives by train: step 0 measures fit to Q6 laid, since the kit car's
load a trip was not read for this plan. The village's crates ride the trains you ride ("A now, C later"), so town
deliveries slow in the same ratios until Q7; cargo trains of their own stay a later plan and would be a rung of
this ladder, not a seventh passenger train.

**Request stops.** Braking from 14 m/s at 3.5 m/s² takes 28 m (57 m today), so a late ask is served more often at
rung 0. The railhead's eased brake is unchanged.

**The bot.** `npm run loop -- run` (order and softlocks) is unaffected: no gate moves. The production bot's segments
from `trains` to `table` ride and wait on wall-clock timeouts: rides are up to 14 s longer and a wait up to about
80 s longer, so those `until` limits are checked in step 5, once, on the segment. Nothing from `crossing` on changes.

**Co-op.** Shared progression: every rung is the room's. Two players wanting different stops on one line are both
served by the one train in one lap (stop on request, each way); what they lose at rung 1 is frequency, not reach.
Two players splitting across the lines each have their own train. A friend who joins late sees rows only (no wake,
no roll-out), as the fit and the install do today. Solo is the tuned case: the handoff at the Village is timed for
one player riding the first train, and works unridden.

**Flow** (lenses from progression-flow-layout; walk at 5.6 m/s):

| Leg | Distance, time | Rule or lens |
| --- | --- | --- |
| Forge apron to Camp with the boiler | 172 m, 57 s solo at 3 m/s | unchanged |
| Camp to the Village on the first train | 193 m, 18.6 s ride | ends facing the next goal: line 2's engine wakes on the platform you arrive at (lens 7, better than today, where it has already left) |
| Village to Far Head | 506 m, 41 s ride | rule 1 holds: station 6's frame shows a train |
| Nobody stranded (rule 3) | | every phase has at least one train a line; a lone train still stops on request both ways |

No world placement moves in steps 1 to 3, so no stills were taken; step 4's bays are placed and looked at in the
rotunda plan.

## 5. Steps

Each ships by itself unless noted. Sim steps get the independent review (`REVIEW_PATHS`).

| # | Step | Tier (`npm run models`) | Proof |
| --- | --- | --- | --- |
| 0 | **Measure, no ship.** Bring `test/spacing/run.ts` from `origin/scratch/spacing-e0` and run line 2's stages at Far Head, the Pier and the Railhead with 1, 2 and 3 trains at 14 and 20 m/s, light and heavy asks; and time fit to Q6 laid on a host test with one train | runner | a sheet (mean, share over 105 s, worst) in this plan's Results; the fallback in section 4 is taken or not, in writing |
| 1 | **Speed rows.** `BOILER` becomes rows of speed, pull-away and braking: 140/2.5/3.5, 200/3.5/3.5, 250/3.5/3.5; both lines start on row 0; when the table has turned (an existing `Shed` fact; the builder names it) both lines' fit rises to row 1 and each train takes it standing at the Village; the longer boiler is part 2; garage rows read the table | high-risk implementation, then review | unit: ride times 18.6 s and 41.0 s at row 0, 15.4 s and 31.1 s at row 1; no leg changes speed in flight; `railway-install` test on part 2; golden regenerated; `WORLD_NS` v45 |
| 2 | **One at a time, a train per extension.** Line 2's first departure is 33 s after the fit; line 2's fleet is 1 at Far Head, 2 at the Pier, 3 from the Railhead, 6 on the greybox, joining at the Village as fleet rows do; line 1 stays 1. Ships with step 1 (one bump) | high-risk implementation, then review | `lineStages` test for each stage's count; the wagon's and kit car's train still exist at every stage; step 0's sheet rerun on the built rule |
| 3 | **Seen and heard.** Line 2's wake plays at its own time (the answering whistle); a joining engine whistles as it appears; the built platform beat plays for row 1; halt boards and the hall map show the trains in service | player-visible implementation, then a fresh visual review | one look at the Village 30 to 40 s after the fit; one at a Village stop after the table turns |
| 4 | **Engines wait in the bays.** Fleet rows in the shed stand in the Roundhouse's bays (tarped in the ruin arc) and roll out over the table instead of scaling in. Rides [roundhouse-rotunda](roundhouse-rotunda.md) step 1b onward; not before | with that plan | that plan's stills |
| 5 | **Checkpoint.** The bot's `trains` to `table` segment once; the three numbers as room tunables if a change can apply at a train's next Village stop, as a fit does | runner | the segment passes or its limits are raised with the measured rides |

## Design review (designer, 2026-11-14)

**Calls: 11 decided, 7 new, 6 default.**

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The train is far faster than walking | Decided | [2 November](../decisions-rail.md#d-2026-11-02-the-train-is-far-faster-than). Held at 14 m/s (2.5 times) on line 2; thin against a sprint on line 1's 193 m, as today |
| 2 | A crossing is about a minute: 1.2 km at 20 m/s | Decided | [2 November](../decisions-rail.md#d-2026-11-02-a-crossing-starts-at-about-a). Kept: 20 m/s lands before any sea track. Option (a) breaks it |
| 3 | A boiler sets top speed and cars | Decided | [10 November](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain) |
| 4 | The longer boiler: free, 25 m/s, the fourth car | Decided | [10](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade) and [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) entries; untouched |
| 5 | Three trains on line 2 at Ring Island | Decided | [10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now) |
| 6 | Trains stop on request | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-stop-on-request-at-the) |
| 7 | A speed part only where it saves about ten seconds | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map). Row 1 saves 14 s to the Pier, 3 s on line 1: see call 17 |
| 8 | Station 6's kit comes by train | Decided | [9 November](../decisions-core-loop.md#d-2026-11-09-station-6-takes-nothing-by-hand). Line 2 needs a train within a minute of the fit: call 13's 33 s |
| 9 | Cargo trains later; the trains you ride carry crates now | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered) |
| 10 | The looser wait rate for the greybox (135 s settled) | Decided | [12 November](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered). Used as the lone train's bound; table C is the target |
| 11 | Signs in the world before hovering text | Decided | owner calls, 9 November. A new train shows on the boards and the map; no banner or card |
| 12 | Rung 0 is 14 m/s, pull-away 2.5 m/s², braking 3.5, both lines | New | recommended; one row, tunable |
| 13 | Trains wake one at a time: line 1's at the fit, line 2's 33 s later as the first train reaches the Village | New | recommended |
| 14 | Line 2 gets a train per extension: 1, 2 at the Pier, 3 at the Railhead; line 1 stays at 1 | New | recommended; the greybox's rule, earlier |
| 15 | The table beat raises both lines to 20 m/s, by itself, taken at each train's next Village stop | New | recommended now; owner question 1 |
| 16 | A lone train on line 2 for about three minutes, worst wait 92 to 112 s; if step 0 measures over 135 s it wakes with two | New | recommended; the handoff removes the first wait |
| 17 | Row 1 applies to line 1 although it saves 3 s there | New | it is a story step, not a part offered; one line left at 14 m/s would read as broken |
| 18 | Engines not yet in service stand in the Roundhouse's bays and roll out from there | New | recommended, with the rotunda; touches "the Roundhouse holds the garage only" (10 November), which I read as about the upgrade screen against the hall's map, not about what stands in a bay |
| 19 | Rejected starting speeds: 12 (loses to a sprint on line 1) and 16 (too small a step) | Default | section 2 |
| 20 | No new garage tile: the Boiler tile's rows read 14 then 20; any word for row 1 is a placeholder | Default | the copy is the owner's; nothing of The Boogler's is touched |
| 21 | A joining engine: a whistle and the existing scale-in until the bays exist | Default | "shed trains, no shed" stands until step 4 |
| 22 | A late joiner sees rows only | Default | as the fit and the install |
| 23 | One bump, v45, for steps 1 and 2 together | Default | "Save resets never block development" |
| 24 | Option (c), the player choosing what to add, is held as the rotunda stage 3 brief | Default | "Brainstorm new gameplay first" |

**Findings.**

1. **The lone train is the risk, and it is arithmetic so far.** Step 0 runs before step 2 is briefed. Nothing in
   section 4's wait table is from a run.
2. **Station 6 must not get slower to finish than the owner notices.** It was 3 min 3 s from fit to pier on 10
   November with three trains. If the kit takes more than one trainload, a lone 92 s lap adds a lap a load; step 0
   times it, and the fallback is two trains at the wake.
3. **The table beat needs the payoff to be legible.** The platform beat was built for a boiler swap. For row 1 there
   is no new part to see, so the change has to be heard and felt: the chuff rate and the pull-away. If a look shows
   nothing reads, row 1 gets one visible mark on the engine (a clean band, a lamp) in step 3; that is a detail and
   stays small ("Mechanisms, then systems, then the full greybox, then details").
4. **Two things answer the same beat.** At the table beat the footing wagon rolls out and couples. Row 1's first
   platform beat should not play over the roll-out: the wagon's train takes row 1 at its next Village stop after
   coupling.
5. **Not seen.** No stills: steps 1 to 3 place nothing. The first look that matters is the Village platform 30 to
   40 s after the fit, with line 1's train standing and line 2's waking.

**Suspect or placeholder lines** (none rewritten): the fitter's card "Steam" / "Trains run both lines." (built, off)
would be untrue for 33 s; the Boiler tile's "The first install. It woke the trains." stands.

## Owner questions

1. **Should the step to 20 m/s happen by itself when the table turns, or be the first thing you install at the
   garage?** Recommended: by itself now. It ships without waiting for the garage moment's remaining steps; once
   those are built it can become a free first install (a hold at the post), which would teach the garage an hour
   before steel. That is a change of one rule.
2. **Is 7 trains still the right busy end, with only the ramp changed?** Recommended: yes. You liked "life
   happening" on 2 November; the ladder reaches today's count at the Railhead and today's six on the greybox.
3. **If the ladder feels right, is "choose what to add at the garage" the next design to brief?** Recommended: yes,
   as what a Roundhouse bay is for (the rotunda's open question 2), after you have ridden this one.
