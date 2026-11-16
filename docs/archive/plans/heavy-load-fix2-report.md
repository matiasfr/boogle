# Heavy-load second repair — 15 November 2026

Branch `heavy-load-fix2`, based on `f83e49fa8`. Review `a1b0bdef9` was cherry-picked as
`0dfc13daa`. Local commits only; no push or ship. Node **26.13.0**, checkout-local dependencies.

## Repairs

1. **Invisible overflow cargo:** chose bounded loose storage with automatic recovery, preserving Drop on foot.
   A cargo kind can have **1,024 loose pieces**, the existing GPU batch capacity whose overflow the review
   reproduced. Before accepting a drop beyond that capacity, the sim returns the oldest whole piles of the
   same kind to the existing store: Home recovery rack for logs/stone, forge rack for rails, Works for footings.
   It preserves the pile being topped up. No material is destroyed. Recovery can happen before the ordinary
   abandonment timer, even if someone is nearby; this is the explicit overflow policy.
   The renderer and save validator share the capacity constant. Confirmed and temporary predicted pile ids
   retain creation order, so consecutive predictions recover the same piles as the server.
   The existing unshipped v48 development break documents the narrowed loose-cargo domain; no migration.

   The original browser assertion **“every accepted log remains visible after reload”** passes: 129 accepted
   eight-log drops leave **128 piles / 1,024 drawn logs**, plus **eight logs in the recovery rack**. Added
   assertions also check that loose plus recovered stock is still 1,032. The 2,048 one-log stress repro now
   expects 1,024 loose and 1,024 recovered, retaining all conservation, save/load and late-client comparisons.
   Its snapshot is 30,417 bytes; initial replication is 105,991 JSON characters in nine packets (largest 11,994).
   New pure-rule checks cover all three small cargo kinds, partial-pile top-ups, successive predictions and replay.

2. **Q2 rack crossing the track:** moved the rack from 10 m straight back to **6 m back / 8 m outward**.
   The horizontal haul remains exactly **10 m** (10.07 m sampling the ground). The full rack centre is
   **5.734 m** from the nearest point on the cart's curved connecting track; the repro requires 3.5 m,
   allowing for the loaded rack, cart width and bend clearance. The inspected full-stock still shows clear
   ground between the rack and the rail. Other track and terrain geometry is unchanged.

3. **Q5 shelf overlapping the log rack:** increased lateral separation from 1.5 m to **4 m**, leaving
   approximately **1.5 m between the footprints**. The shelf's haul is 10.77 m horizontally (10.82 m over
   ground); the log haul remains 10 m. Updated authoritative pickup reach to include the shelf's whole
   3.2 m interaction zone. The live repro selects `railway-depot-logs` and `railway-depot-rails` at their
   respective centres. The inspected still shows separate full stacks and readable, separated signs.

The owning game-design section and the existing haul-measurement tool describe the new placements and recovery.
No Boogler copy changed. No golden fixture was regenerated.

## Verification

| Check | Result |
| --- | --- |
| `npm run check:full` — lint, typecheck, unit, registry, level, assets, prefabs, build, server, network | **Passed, exit 0** |
| Unit suite, including all nine railway-golden shards, heavy-load and both earlier review suites | **2,253 passed**, zero failed; one existing TODO for the longer-boiler fleet wait bound |
| `review-heavy-load-arrival.test.ts` | **68 passed**: 966 arrival-offset fixtures, 65 real-rule delayed-funding/reload/late-join cases, and the 2,048-drop stress case |
| Earlier deliberate mixed-overfill route regression | **Passed:** High Gorge at 3,615 ticks; frame idle 1,129 / 560 / 363 / 363 |
| `npm --prefix server test` (inside full check) | **377 passed**, including the unchanged 8,596-record host trace |
| `npm run test:net` (inside full check) | **190/190 checks passed** |
| `npm run level-check` (inside full check) | **Passed, 15 reports**; existing report-only geometry diagnostics remain |
| `npm run loop -- run` | **Passed** |
| `node --import ./test/helpers/rail-no-audit.ts dev/look/review-heavy-load-piles.ts` | **Passed:** 1,024 / 1,024 loose logs drawn, eight recovered, no graphics errors |
| Q2 full-rack and Q5 placement repros | **Passed:** WebGPU, advancing frames, no page/console/graphics errors; both stills inspected |
| Earlier `review-heavy-load.ts` runtime regression | **Passed:** heavy movement gates, swimming ascent, hold Drop of all 24, restored jump/glide; still and motion sheet inspected |
| `npm run playthrough -- --players 2 --to T2 --warp-speed 3 --name heavy-fix2-coop` | **Passed:** both finish, mirrors agree at 227 sampled server steps; both end stills inspected; includes the opening-through-T1 route |
| `npm run scenario -- world-inputs` | **Passed:** browser/Node catalog parity and empty client shared-state registry |
| Scoped Prettier and `git diff --check` | **Passed** |

The unit and server runs used their standard local settings (rail audit off; existing configurable sweeps sampled).
The new arrival review explicitly runs every integer offset from -80 through +80.
The Q2 capture completed under machine load, so it establishes geometry, not timing. The 3x co-op run reported
peak page-clock deficits of 4.089 / 7.878 game seconds, although both finished and replicated-state comparisons
passed. Neither run establishes human feel, smooth real-time motion, device performance or a fresh independent review.

## Evidence

Paths below are relative to this checkout:

- **Q2 full rack:** `.look/heavy-fix2-q2-full-still.png`
- **Q5 shelf and log rack:** `.look/heavy-fix2-q5-separated-still.png`
- Capture health: `.look/heavy-fix2-q2-full-verdict.json`, `.look/heavy-fix2-q5-separated-verdict.json`
- Full checks: `.look/heavy-fix2-check-full.log`
- Overflow: `.look/heavy-fix2-piles.log`, `.look/review-pile-draw.json`
- Loop and ground-haul measurements: `.look/heavy-fix2-loop.log`, `.look/heavy-fix2-hauls.md`
- Earlier movement repro: `.look/heavy-fix2-movement.log`, `.look/heavy-fix2-movement-verdict.json`
- Co-op: `.look/playthrough/heavy-fix2-coop/report.txt`, `verdict.json`, `warp.json`, `end-still.png`, `p2-end-still.png`
- Catalog scenario: `.look/heavy-fix2-world-inputs.log`, `.look/scenarios/verdict.json`

Captures were made on `0dfc13daa` plus the implementation changes subsequently committed on this branch.
