# Loader times — 16 November 2026

Measured rules at `f0c3ce775` (#1975, v55). Tools/docs only.
Rerun: `node --import ./test/helpers/rail-no-audit.ts dev/loader-times.ts` (Node 26).
Uses the local test preload to omit the read-only mutation audit; rules are unchanged.

Seconds to **set** all 12 pier footings or 14 bent + 4 counterweight footings.
Headless accepted take/set/brace ops, instant reach; solo 4.4 s and trio 1.5 s
between sets. Trio remains an assumed aggregate pace, not three walking bots.
First column is the exact seed start; brackets give min–max of three phase starts
advanced 0/10/20 seconds before starting the clock. Cargo may move during that advance:
these are phase sensitivity measurements, not independent random worlds or confidence intervals.

| Site / pace | Historical wagon → loader | v55 wagon → loader | Three-start range, wagon / loader |
| --- | --- | --- | --- |
| Pier, instant | 155 → 129 | 160.8 → 113.0 | 140.8–160.8 / 93.0–113.0 |
| Pier, solo | 182 → 155 | 182.3 → 134.5 | 162.3–182.3 / 114.5–134.5 |
| Pier, trio | 164 → 138 | 167.8 → 120.0 | 147.8–167.8 / 100.0–120.0 |
| Ring, instant | 303 → 185 | 388.5 → 189.1 | 368.5–388.5 / 169.1–189.1 |
| Ring, solo | 339 → 203 | 418.6 → 197.6 | 398.6–418.6 / 177.6–197.6 |
| Ring, trio | 315 → 193 | 398.3 → 191.9 | 378.3–398.3 / 171.9–191.9 |

Historical figures do not reproduce. Do not use them as current measurements.
The script validates yard-ready (tick 20859) and yard-built (20959), then clones
yard-wagon / yard-deck. The paired no-yard counterfactual removes plot 2 and refunds
its payment, preserving the same train phase and every other row. It does not replay
an independently played no-yard campaign. In particular yard-deck's alignment differs
from historical deck-laid (L1's as-built notes explain why). No tuning to match history.

## Empty-rack quarry stop

Controlled clone of yard-wagon, empty Works rack, casting disabled; compare pier owed
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

## Checks

Economy + loop tests: 58 passed. `npm run loop -- run`: passed, all orders and bills.
`npm run economy`: passed. Both generated-page freshness checks: passed.
Full lint: zero problems; types: passed. `node dev/ship-check.ts`: passed,
209 tests across 25 affected files, registry and scoped lint/type checks.
