# Loader times — 16 November 2026

Measured rules after rebasing onto `a81773b75` (main, includes #1975, v55).
Revision after independent review of `57c2bbafe`; tools/docs only.
Rerun: `node --import ./test/helpers/rail-no-audit.ts dev/loader-times.ts` (Node 26).
The preload omits the read-only mutation audit; rules are unchanged.

## Accepted-ops route seeds

Both sides are now built entirely through accepted ops: **wagon-on / deck-laid**
never buy the yard; **yard-wagon / yard-deck** do. No plot deletion or refund.
Snapshot cloning preserves those states; it does not edit them.

All four base seeds naturally have a lit kiln, a full Works rack (6), an empty pier
rack and empty railhead rack. The common Works builder lights the kiln by delivering
logs and mined stone, waits for casting, then builds the stall/cradle and couples the
wagon. The ring builder completes the pier, delivers Q7's kit and waits for Q7's lay.
Assertions and printed starting states make these conditions inspectable.

| Start | Tick | Kiln lit at | Pier set | Wagon phase at start |
| --- | ---: | ---: | ---: | --- |
| wagon-on | 4788 | 4118 | 0 | departing Home |
| yard-wagon | 22166 | 21238 | 0 | standing at Home |
| deck-laid | 7913 | 4118 | 12 | standing at Home |
| yard-deck | 24391 | 21238 | 12 | moving homeward |

**Train phases are not identical.** The old deck-laid seed waits for a full rack
and wagon at Home; yard-deck stops at accepted Q7 completion because that old
alignment need not recur with the yard. No phase, kiln timer or cargo was overwritten
to equalise them. These are route-seed comparisons, not an isolated causal estimate
of buying the yard. Casting has the same lit/full state but its timer age can differ.

Seconds to **set** 12 pier footings or 14 bent + 4 counterweight footings.
Headless accepted take/set/brace ops, instant reach. First available set is immediate;
subsequent sets are at least 0 / 4.4 / 1.5 seconds apart for instant / solo / trio.
Trio remains an assumed aggregate pace, not three walking bots. Both sides use
the same 0/10/20-second advance before starting the clock and the same carry intervals.
Cargo may move during that advance. Ranges are phase sensitivity, not independent
random worlds or confidence intervals.

| Site / pace | Historical wagon → loader | Previous 57c2bbafe (counterfactual) | Accepted-ops wagon → loader | Change from previous, wagon / loader |
| --- | --- | --- | --- | --- |
| Pier, instant | 155 → 129 | 160.8 → 113.0 | 155.8 → 113.0 | −5.0 / 0 |
| Pier, solo | 182 → 155 | 182.3 → 134.5 | 177.3 → 134.5 | −5.0 / 0 |
| Pier, trio | 164 → 138 | 167.8 → 120.0 | 162.8 → 120.0 | −5.0 / 0 |
| Ring, instant | 303 → 185 | 388.5 → 189.1 | 304.1 → 189.1 | −84.4 / 0 |
| Ring, solo | 339 → 203 | 418.6 → 197.6 | 334.3 → 197.6 | −84.3 / 0 |
| Ring, trio | 315 → 193 | 398.3 → 191.9 | 313.9 → 191.9 | −84.4 / 0 |

| Site / pace | Three-start range, wagon | Three-start range, loader |
| --- | --- | --- |
| Pier, instant | 135.8–155.8 | 93.0–113.0 |
| Pier, solo | 157.3–177.3 | 114.5–134.5 |
| Pier, trio | 142.8–162.8 | 100.0–120.0 |
| Ring, instant | 284.1–304.1 | 169.1–189.1 |
| Ring, solo | 314.3–334.3 | 177.6–197.6 |
| Ring, trio | 293.9–313.9 | 171.9–191.9 |

Historical figures still do not reproduce exactly; none was used as a tuning target.
The previous table was synthetic: its no-yard side deleted and refunded a yard after
yard-assisted progression. It is retained above only as the review comparison.
The script also checks yard-ready (20859) and yard-built (20959).

## Synthetic empty-rack quarry stop

Separate synthetic output rows (`synthetic-empty-rack`): direct writes to a clone
of yard-wagon empty the Works rack, disable casting and, for the no-owed side,
mark the pier complete. These bypass accepted progression and conservation. They
are needed here to hold an empty rack with continuously owed footings for 30 minutes;
normal gameplay keeps casting and delivering. Compare pier owed
against pier marked complete. No carrying. Ten-minute warmup, twenty-minute fare
window; home-arrival intervals per line 2 train. This is a synthetic persistent-owed
state. No-owed also enables the shipped stone stop; that is included in the cost.

| State | Round trip, seconds | Gross fares/min before box cap | Landed fares/min |
| --- | --- | --- | --- |
| Owed, empty rack | 103.2 (21 intervals) | 53.55 | 13.25 |
| Not owed | 92.4–103.2 | 54.00 | 54.00 |

The empty quarry stop adds **10.8 s** versus a no-stone-stop cycle; stone service
sometimes costs the same 10.8 s in the no-owed run. Gross fare difference is 0.45/min
in this finite window. Landed fare difference is dominated by the box cap (owed
blocks stone and later staking); it is not a clean throughput estimate.

## Model limits

Graph bills, edges and order are unchanged; supply text now includes the yard carriers.
Village prices read TRADE at the shipped 50% factor: 150 / 800 / 1600; yard is a works
building with zero riders, completed after build time, and counts in price doubling.
Four rider places remain. The separate two-step loader.works purchase is removed.
The loader capacity contract is six, coupled wagon required, outbound and owed only.

The campaign is still minute arithmetic, not train simulation: Village staking uses
route-stage approximations (plot 3 at ring.connect), purchases remain sequential,
and it does not model exact timber/stone deliveries or train cargo conflicts.
The yard has no invented global labour reduction; its actual time benefit is the
headless measurement above. Other source reductions, later towns, future cars,
fit-outs, express capacity, route spine, cycle formula and random rider jitter remain
design stand-ins. No walking, reach, human coordination, browser or device claim.

## Revision checks

Timing script: passed, including natural full-rack/lit-kiln and yard-purchase assertions.
Economy + loop tests: 58 passed. `npm run loop -- run`: passed, orders and bills unchanged.
Both generated-page freshness checks: passed after regeneration.
Full lint: zero problems. Types: passed. `node dev/ship-check.ts`: passed,
209 tests across 25 affected files, registry and scoped lint/type checks.
