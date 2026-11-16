> **Status: approved (2026-11-15).** All five owner recommendations accepted; step 4 builds this trade instead of "which line first". Nothing built. [Decision](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers).

# A per-line garage trade: a quicker trip or a bigger load

**Seed.** The owner, 15 November, on garage-choices: "Only doubt is for question 5". "Which line first" is a thin
choice: every line ends up the same. Grant, 14 November ([first-line-decisions](first-line-decisions.md)): the game
"reads as running errands", "I've never been able to make a decision". Owner call: Grant's ideas are weighed on merit
([owner-calls](../agents/owner-calls.md#grants-ideas-are-weighed-on-merit)). The question: each line takes a quicker
trip (top speed) or a bigger load (more cars), or another trade that makes rooms differ.

**Measured** on main `0c774afab` with `npm run loop -- run` (1 player: route 3:14, of which the six stand-in areas
2:40) and a scratch script calling the sim's own `trainLegTicks`, `TRAIN.dwellTicks` (5 s), `WORKS.wagonCap` (6) and the
loop's `standInRoute` and `standInSeconds`. Main's boiler rows are 20 and 25 m/s; the ladder (14, 20, 25) is not on
main and changes none of the comparisons below.

## What the numbers say

**Footings are the route's felt cost, and they are trip-bound.** The loop's built rate is 20.9 s a footing against
3.35 s for any other unit (1p). In the stand-ins, footings are 78 of the 122 minutes of hauling; rides are 38
minutes more. The played bills are wagon round trips almost exactly:

| Bill | Footings | Played (1p) | Predicted at 6 a trip, 20 m/s | Quicker (25 m/s) | Bigger (9 a trip) | Bigger (12 a trip) |
| --- | --- | --- | --- | --- | --- | --- |
| The crossing (Pier, 708 m) | 12 | 3:15 | 195 s, 2 trips | 172 s | 195 s | 97 s |
| The bents (Railhead, 834 m) | 14 | 5:41 | 330 s, 3 trips | 289 s | 220 s | 220 s |
| The stand-ins' 224 | 224 | | 40 trips | each 12 to 19% shorter | 27 trips | 21 trips |

**The two pay off differently, and neither wins everywhere.**

- A quicker trip pays on every trip, a little: a round trip is 12 to 19% shorter at 25 m/s (line 2 to Ring Island 144
  to 123 s; the cave line 560 to 456 s). It is the only option that helps riders: about 8 of the route's 38 minutes of
  riding, and the mean wait on a platform, half a cycle (line 2 72 to 62 s; the cave line 280 to 228 s). More trips
  a minute also carry more riders, so more fares.
- A bigger load pays in lumps: a third fewer footing trips at 9 a trip, half at 12, but nothing where a bill does not
  cross a multiple (the crossing's 12 at 9 a trip still takes two trips). It does nothing for a rider.
- On the screen's own readout, "resources a minute", both raise the same number, and the bigger load raises it more
  (line 2: 2.5 a minute at 6 and 20 m/s; 2.9 at 25 m/s; 3.8 at 9 a trip). The rider's gain has no number there,
  only top speed. So the screen makes the load look better than it is for a line the room rides.

**"Which line first" by the same measure.** At stage 4 the incline (1.16 km) and the bay cut (1.23 km) each save about
10 s a run at 25 m/s; with one pool and no forced scarcity the second follows soon after the first
([garage-choices](../plans/garage-choices.md) review, finding 4), and the two lines are identical after. The order
moves about 10 s a trip on one line for the minutes between the two installs. It is honest, and it is the
thin choice the owner doubted.

## Pitch

From stage 4, each new line's boiler step is one of two rows: **the quick row** (25 m/s, cars unchanged) or **the
strong row** (20 m/s, one more car). Both cost the same steel, and once the step is paid either row can be swapped back
for free at the Roundhouse. A line the room rides becomes quick; a line that hauls becomes long. By the fourth hour two
rooms' networks look and sound different, and a room can say why. Serves DESIGN **6. Communal world** (the room's
railway, configured by anyone) and **11. Show, don't tell** (the extra car stands at the platform). Passes "no routing
or quotas": the trade sets how a train is built, never where it goes or what it must carry; loading stays automatic.

## Gut question

When your room fitted a line, did it feel like a choice about how you play that line, and did anyone go back and
change it later because the room's play had changed?

## Best suggestions

1. **Two rows of the decided boiler, not new parts** (systems). "A boiler sets top speed and how many cars" already
   carries the trade: the fast row and the strong row are two `BOILER` rows for the same step, priced from one table,
   so "no upgrade has two prices" holds. Step 4's `rail.bring`, `Line.boiler` per line and `rail.install { line, part,
   revision }` do the rest; one owned-rows mask per line makes the swap free.
2. **Make the trade "people or goods", and say it with the train** (design, creative). Quick is for riders (the ride,
   the wait, the fares); strong is for goods (fewer trips per bill). That is what the numbers show, it differs by line,
   and it changes as the frontier moves: the line you ride today hauls behind you tomorrow, which is the one reason to
   go back to the Roundhouse. The research's own test stands: if every room picks quick and never wants strong after
   seeing a full delivery, drop the trade and keep the car as an upgrade.
3. **Size the strong row by a whole car, balanced on the 2D page** (systems). A third more load is invisible on the
   bills (12 at 9 a trip is still two trips); a whole car (the line's own load again) is the research's "finishes on the
   first arrival". Step 0's page gains a tab: per line, both rows against the stand-in bills, tuned until neither wins
   on every line. The Works rack holds 6 (`WORKS.rackCap`); a 12 load needs the rack or the full-load stop to wait for
   it, or the strong row waits at the Works.
4. **The same trade the player learns in the hands** (design, from Grant). His "weight that slows you when over-loaded"
   is quick-or-big at a back's scale ([first-line-decisions](first-line-decisions.md) suggestion 2, overfill at a
   cost). If the room learns it with logs in the first ten minutes, the garage repeats a trade it already knows, on
   rails. This is also the honest limit: the garage trade arrives around hour two, so it does not answer Grant's first
   37 minutes; that brief does.
5. **The swap is a walk, not a price** (design, co-op). Free and unlimited, judged at the post with the line's copy on
   the table (`rail.bring`), taking effect at the line's next departure from its own depot end (decided: a line takes
   an install at its own shed). The walk home is enough friction that nobody flips per bill, and a friend who disagrees
   can change it back without cost; the research's fallback if that becomes a tug-of-war is to remove public switching
   before adding votes.
6. **Readouts stay the decided three** (creative). Two tiles on the line's Engine tab, side by side, each with top
   speed, cars it pulls (pips), and that line's resources a minute; no trip time. The tile you do not have reads
   "Swap" once the step is paid. The copy on the table wears the fitted row: a tall stack and quickened chuff for
   quick, a coupled car rolling out of the line's bay for strong, with a clank the room hears.

**Tensions.** (a) Rider gain has no readout, so the screen leans to strong; top speed stands in for it, and the 2D page
checks the balance off screen. (b) The strong row meets the full-load stop: a source waits for a whole trainload before
it gets a stop (12 November), so a longer train stops at sources less often but brings more. That is identity, not a
bug, but it slows a source's first delivery. (c) Free swaps invite an optimiser to flip per bill; recommended answer
2 bets the walk is enough.

## Shape

- **Sync:** server-authored, lockstep state, as garage-choices section 6: `Line.boiler` per line takes the fast or
  strong row; a per-line owned mask (`Line.rows`) so a swap has no price; the strong row's car count drives the line's
  consist. `rail.install { line, part, revision }` swaps; first accepted hold wins.
- **Reuses:** step 4's works copies, line chips and `rail.bring`; the `BOILER` rows table; `boilerAdopt` at each line's
  depot end; `perMinute` and `rowsFor` in `garage-data.ts` for the readouts.
- **Smallest first build:** the trade tab on step 0's 2D page (per line, both rows against the stand-in bills, the
  ten-second rule, footing trips), no code. Then the sim in step 4 instead of, not beside, the order choice.
- **Risks:** a car added or removed only at the depot end with nobody standing on it (riders keep their floor); the
  block rule's spacing with a longer consist (`TRAIN.sepCm`); a `WORLD_NS` bump; `garage-view.ts` is a hotspot.

## Done means

- `npm run look -- --rail-seed <stage-4 seed, built by step 4>` at the garage post: both rows on the incline's Engine
  tab, the decided readouts only, the unowned row with its bill or "Swap".
- The strong row's train standing at its far halt: one more car than the quick line's train, visible from the platform.
- Two players at the post (scenario in step 4): one swaps the bay line to quick; both see the copy change and the line's
  train change at its depot end on its next departure, not mid-run.
- The 2D page: for each stage-4-and-later line, the route minutes each row saves at 1p and 3p, with neither row ahead on
  every line.

## Open questions

1. **Does step 4 build the per-line trade instead of "which line first"?** Recommended: yes. Each new line from stage 4
   gets one step with two rows, quick or strong, and order stops being the choice. Or keep "which line first" as
   approved, and park the trade until cargo trains run. **Answer: yes.** Step 4 builds the per-line trade.
2. **Is a swap free and unlimited, at the Roundhouse with the line's copy on the table, taking effect at the line's next
   departure from its depot end?** Recommended: yes; if play shows rooms flipping per bill, limit it to one swap per
   line per stage. Or a swap costs steel, or the pick is final. **Answer: yes.** Swaps are free and unlimited at the
   Roundhouse, with the line's copy on the table; they take effect at its next depot departure. Limit a line to one
   swap per stage only if rooms flip it for every bill.
3. **Is the strong row one whole car (the line's load again), with both rows balanced on the 2D page so neither wins on
   every line?** Recommended: yes; a part-car is invisible on the bills. Or a fixed +50% load on every line.
   **Answer: yes.** Strong adds one whole car, balanced on the 2D page.
4. **Does line 2 get the trade too, at High Gorge (the big boiler or a second footing wagon)?** Recommended: no, not
   yet. With the bigger cradle fitted, and if High Gorge's 32 footings ride line 2's whole 3.21 km,
   they take 4 trips of 286 s (1,144 s); 30 m/s makes that 984 s and a second wagon 572 s, so strong wins by far
   and the choice is false there. Keep G-d an upgrade, and start the trade at stage 4. Or make G-d the first trade and tune it.
   **Answer: no.** Line 2 does not get the trade at High Gorge; it keeps the big boiler as an upgrade.
5. **Names for the two rows?** Drafts: "Quick boiler" and "Strong boiler" (the research's "Swift" and "Hauler" are its
   own). The words are yours. **Answer: yes.** The names are "Quick boiler" and "Strong boiler".

## Parked

- Seats or freight for a line's extra car (riders and Boogles against goods): makes rooms differ by taste, but hub
  towns give "nothing the route needs" (12 November), so freight would always win for a room chasing the route.
- An engine identity per line fixed at its opening, like a named engine: a look first, after a yes on the trade.
- Line-specific parts by geography (a banker for the incline, the plough and headlamp for the cave): kills sameness
  without a choice; each needs a rule the ten-second filter passes.
- A `/codex` previz of the two silhouettes on the table, after a yes.
