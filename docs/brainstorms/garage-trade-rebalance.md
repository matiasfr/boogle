# Garage trade rebalance

**Proposal, 17 November 2026; no game implementation.** Measured at `48e0f68f2` (main, world v59).
Recommend **Quick 25 m/s, one 10-footing cargo car; Strong 20 m/s, two identical 10-footing cargo cars** on
stage-4-and-later lines. Both cost the same **6 steel once** (carried-over price stand-in), with the approved
free unlimited swaps at the Roundhouse and adoption at the next depot departure. Line 2 keeps its Big boiler upgrade.
The [editable page](../world/garage-choices.html) carries these defaults.

The original 6/12 proxy makes Strong lead every line total. The proposed 10/20 proxy gives Quick the North–south
and Bay totals and Strong the Cave total, at both 1p and 3p. **This is a narrow model split, not established live
balance:** Quick's leads are only 14.8 and 33.4 seconds; smaller bills or fewer player journeys reverse them.
Strong still wins every large building bill. No claim about feel or fun follows.

## What was refreshed

| Figure | Re-measured against main | Consequence |
| --- | --- | --- |
| Boiler profiles / dwell | `railway-train.ts`: 14/20/25/**30** m/s; 14 accelerates at 2.5, other rows at 3.5 m/s²; braking 3.5; dwell 50 ticks (5 s) | Page's 30 m/s row is now built, not proposed. Quick/Strong still use 25/20 |
| Cradle / steel | `CRADLE_CAP=[6,10]`, `INSTALL_STEEL`: cradle 4, Big boiler 6; `steelPool` is landed minus spent; Works total 12, delivery 6; rack still 6 | 10 is a measured line-2 capacity, **only a proposed numerical reference for future-line cars**; no automatic inheritance |
| Riders / players | `TRADE.riderPlaces=8`, separate from 4 player seats | Both rows carry the same people. The [16 November coach allowance ruling](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) explicitly keeps Strong's extra car a **cargo** benefit; a second rider coach would change that decision |
| Page snapshot | Compared `standInRoute().nodes` and `WORLD_LINES` with the embedded objects | Bills, route lengths, stages and halts match; only unused line-2 crossover coordinates were stale (s 319640 → 319300 cm), now refreshed |
| Real-host loop, 1p / 3p | `npm run loop -- run --players N --json`: canonical **23375 / 20903 ticks**, calibrated 27021 / 23190; no softlock or graph bug; order probes refused premature actions | 38:57.5 / 34:50.3 elapsed on the sim clock (m:ss); command wall time is discarded |
| Footing beats, 1p / 3p | Crossing **1953 / 1653 ticks**; bents **3414 / 3408 ticks**. Loop rates 20.9 / 17.7 s per footing, other units 3.39 / 3.10 | Three people do not triple train throughput. These beats precede steel; the loop does **not** exercise a ten-footing cradle load or this trade |

Scratch measurements imported the sim's `trainLegTicks(distanceCm, 0, BOILER[row])`, not stopwatch timings.
Rest-to-rest tick checks (20/25/30): 193 m **154/149/149**; 1173 m **644/541/477**;
3213 m **1664/1357/1157**; incline 1155.79 m **636/534/471**; Bay cut 1227.48 m **671/563/495**;
full Cave 5329.62 m **2722/2204/1863**. The incline and Bay cut retain 10.2 / 10.8 s savings at 25 over 20.
These are designer diagnostics, never proposed garage trip-time readouts.

**Carried over, not measured journeys:** later bills (334 steel / 224 footings across all six areas), the page's equal
footing allocation between lines an area extends, cumulative line lengths as haul distances, two sequential
player travel legs per economy step, 10 seconds of dwell per round trip, zero off-train handling, and the one-effective-
service approximation. Steel's future 1/min trickle and area allowance minutes remain editable **stand-ins**;
they are not Ready-time evidence. Other bill materials are not simulated as freight here.

## Three candidate tunings

All retain **25/20 m/s**, one extra **whole identical cargo car**, the same steel price, four player seats and eight
NPC rider places. No speed change, third row, bill retuning or extra coach is proposed. Cargo payload is the tunable;
these are future-line payload proposals, not changes to line 2's decided 6→10 cradle.

Tables show **Quick / Strong elapsed minutes including assigned footings and player travel**, with winners.
Each value applies at **both 1p and 3p**: the party shares the same train and can ride together. Only off-train labour
would scale; its neutral default is zero. The sim loop's separate co-op rates above are not applied to train cycles.

### A: 8 / 16 footings

| Line | 1p Q / S min | 3p Q / S min | Winner |
| --- | --- | --- | --- |
| North–south | 13.34 / 13.59 | 13.34 / 13.59 | Quick |
| Bay | 35.39 / 35.95 | 35.39 / 35.95 | Quick |
| Cave / White Wall | 82.41 / 62.80 | 82.41 / 62.80 | Strong |

Same split as B, but Cave needs 9+7 Quick trips or 5+4 Strong trips. No measured advantage justifies those extra
cycles over B's 7+5 or 4+3. Keep as the lower-payload comparison.

### B: 10 / 20 footings — recommended

| Line | 1p Q / S min | 3p Q / S min | Winner |
| --- | --- | --- | --- |
| North–south | 13.34 / 13.59 | 13.34 / 13.59 | Quick, 14.8 s |
| Bay | 35.39 / 35.95 | 35.39 / 35.95 | Quick, 33.4 s |
| Cave / White Wall | 63.24 / 51.12 | 63.24 / 51.12 | Strong, 727.2 s |

Uses the now-built ten-footing payload as the reference, reduces the long line's repeat trips relative to A, and
preserves the approved speeds. Prefer it to inventing a slower Strong profile or promoting Quick into Big boiler's
30 m/s tier. Future-line loader/rack feasibility remains unproved, not inferred from the cradle's cap.

### C: 12 / 24 footings

| Line | 1p Q / S min | 3p Q / S min | Winner |
| --- | --- | --- | --- |
| North–south | 11.39 / 11.30 | 11.39 / 11.30 | Strong |
| Bay | 29.70 / 29.14 | 29.70 / 29.14 | Strong |
| Cave / White Wall | 61.17 / 48.68 | 61.17 / 48.68 | Strong |

Reject: the 22/24-footing bills fit one Strong load, restoring its lead everywhere. More payload does not
monotonically improve the choice; whole-trip thresholds matter.

## B against each bill and the rider legs

`L` is the carried-over cumulative haul length. Freight seconds = `ceil(bill / payload) × (2 × legSeconds + 10)`;
travel seconds = `legs × legSeconds`. The page's tick-rounded rest-to-rest profile matches the sim on these lengths.

| Bill / line | L m | Footings; trips Q/S | Freight Q/S s | Player legs; travel Q/S s | Total winner, 1p and 3p |
| --- | --- | --- | --- | --- | --- |
| Bell / North–south | 1155.79 | 22; 3/2 | 350.4 / 274.4 | 2; 106.8 / 127.2 | Strong, 55.6 s |
| Bell / Bay | 1227.48 | 22; 3/2 | 367.8 / 288.4 | 2; 112.6 / 134.2 | Strong, 57.8 s |
| Canopy / Bay | 2430.04 | 24; 3/2 | 656.4 / 529.2 | 4; 417.6 / 509.2 | Strong, 35.6 s |
| Port / Cave | 1250.17 | 66; 7/4 | 870.8 / 586.4 | 4; 228.8 / 273.2 | Strong, 240.0 s |
| White Wall / Cave | 5329.62 | 50; 5/3 | 2254.0 / 1663.2 | 2; 440.8 / 544.4 | Strong, 487.2 s |
| Ending / North–south | 1902.27 | 4; 1/1 | 176.6 / 211.8 | 2; 166.6 / 201.8 | Quick, 70.4 s |
| Ending / Bay | 3314.71 | 4; 1/1 | 289.6 / 353.0 | 2; 279.6 / 343.0 | Quick, 126.8 s |

Quick wins every travel leg. NPC riders also retain eight places in both rows: Quick reduces travel/cycle time;
Strong does not add rider capacity or fares by itself. No demand, boarding, queues, occupancy or fare result is
claimed. A late friend fits in the four player seats without a swap; people building while a friend rides are not
represented by adding their parallel work times together.

**Sensitivity:** remove all player travel and Strong wins every line's freight total. Halve the default travel legs:
Strong wins all three combined totals too. Multiply each assigned footing bill by 0.75, rounding up: Strong again
leads all three (5.6 / 34.0 / 728.6 s). At ×1.25 the Quick/Quick/Strong split survives. Do not alter the bills or
invent rider demand to protect the headline. B meets the page's current line-total criterion; it does not prove
a robust strategic choice across itineraries.

## Design review (2026-11-17)

Re-read this proposal before reviewing. **Disposition: bounded tuning proposal within the approved trade.**
Serves DESIGN **6. Communal world**, **8. Enjoyable alone and together**, **11. Show, don't tell**. Phase assessment:
choice/payoff work; step 3 is on main, step 4 remains unbuilt and starts when stage-4 lines are playable.
No prerequisite is invented from the owner's future playtest. This ports nothing from Place, moves no world space,
changes no reach and authors no character lines.
The first encounter remains stage 4's two named Engine tiles and the extra cargo car visible on Strong's train;
no new tutorial is specified. Either player count can choose and reverse the room's fit; public swap contention
and learning whether the loaded train explains that choice remain unmeasured.

| Call | Kind | Source / recommendation |
| --- | --- | --- |
| Two named rows at 25/20, Strong adds one whole car; equal steel; free unlimited swaps at next depot departure; no line-2 trade | Decided | [15 November garage trade answers](../decisions-core-loop.md#d-2026-11-15-garage-trade-answers) |
| Coach outside the boiler allowance; Strong's extra car is cargo, four player seats separate from eight riders | Decided | [16 November coach answer](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework) and main's `riderPlaces` |
| Garage readouts remain speed, cars, resources/min; no trip times | Decided | [10 November plain readouts](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain) |
| Future-line cargo payload 10 per whole car, 10/20 per row | Default | Recommend B, as a reversible numerical stand-in; log it, do not silently grant the line-2 cradle to these lines |
| Keep 6-steel trade price, existing bill/length/travel allocation and neutral handling; compare 1p/3p with party travel shared | Default | Carry over the page's model, label its limits; no empirical co-op journey is claimed |

**Calls: 3 Decided, 2 Default, 0 New.** Both defaults are logged in [agent-calls](../agent-calls.md#core-loop-pacing-and-progression).
Research checked: [roundhouse-management](../research/roundhouse-management.md) (one reversible choice per line),
[roundhouse-trains](../research/roundhouse-trains.md) (real trip saved, no wait-to-afford loop),
[upgrade-economy](../research/upgrade-economy.md) (repay an experienced inconvenience). B removes whole trips but the
weak margins remain a finding under the first recommendation. Latest recorded human evidence is 14 November's
owner and Grant sessions: garage appeal and errands/no decisions, not evidence for either row's later-line balance.

**Findings and changes:** (1) stale cradle/boiler/coach facts: corrected page parts and provenance;
(2) Strong dominance with 6/12: page defaults changed to B, with line totals and separate freight/travel figures;
(3) fragile reversal and equal 1p/3p estimates: exposed beside the result rather than calling this proven balance.
Original garage-choices review findings 2/4/5/9 remain respected: one pool, a real trade rather than purchase order,
no game trip-time readouts, room above 30 for the later engine. No plan steps beyond the allowed status line changed.

**Owner question (scope, not answered here):** should step 4 also own the future-line sources' ability to assemble
and deliver a full **20-footing** load? **Recommend: keep that source/loader work in the future-line freight brief,
and require that brief's loaded-departure tick evidence before claiming B's realised throughput.** Do not enlarge
today's six-place kiln/Ring racks or change full-load-stop rules as an incidental balance fix. The approved trade
already identifies this dependency; this proposal does not approve the additional source work.

**Unmeasured:** future consists' physical fit/spacing and actual freight itineraries, supply and full-load waits,
multi-train dispatch, player travel frequency/parallelism, other materials, NPC rider demand/fares, swap frequency,
audio, human choice and fun. Next numerical proof is a 10- and 20-unit loaded departure and arrival on a playable
stage-4 line, using host ticks, followed by recomputing this page with its real bills and stops. No work waits for a
session. Opened the updated file's HTML in the shared browser: seven comparison cards and all three totals matched
the arithmetic via DOM readback. A still could not be inspected: twice the preview reported “The browser is not
producing screenshot frames”; the HTML preview fallback reported “the browser could not be started”. Closed the
check tab. Visual layout remains unverified; **not tested on a device**.

**Owner copy list:** existing names retained; no new names or character lines. Historical plan strings “4 seats,
4 riders”, “cars 3 → 4”, and wagon “6 footings a trip, Quarry to Pier” are suspect after the coach/cradle changes;
the page's “10 footings” / “20 footings” are design placeholders, not new in-game copy. The Boogler's copy is untouched.
