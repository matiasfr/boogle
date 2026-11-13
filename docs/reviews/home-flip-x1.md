# Home flip X1 and X2 — implementation and proof

13 November 2026. Implemented locally on `codex/home-flip-x1`; not pushed or shipped. Baseline: v35 at `505f62f402777e7a498a936a7b0a1b743404f326`. The owner approved the flip and one namespace bump. This branch uses v36, with its dated history entry; the server-state job must coordinate the number when the second branch lands. Save resets do not block either job.

Layout B is now the sole Home: both rules' heads and anchors, the island, table and stall, garage install, cart road and 110-tick shunt agree. Removed the selector, alternate branches, old install post and `dev/level/home-b.ts`. The stack-head lever job's code was left alone. The Boogler's copy and Sleeves's lines are unchanged; **“Request stop: to <end>” remains suspect placeholder copy for the owner**.

Executable deletion check (zero matches, exit 1 is grep's no-match result):

```sh
git grep -n -E 'homeLayout|BOOGLE_HOME|HOME_B|STALL_TODAY|GARAGE_GEO\.[ab]|home-b\.ts|\?home=|\bTODAY\b' -- src dev test server
```

Historical plan/research records still quote the retired selector and the old design. They are not executable paths.

## Tree table: no replant, no drops

`src/place/tree-planting-mask.ts` freezes v35's clear-mask threshold and low-ground exclusion over 105,961 cells, plus the exact Float32 planted heights. Planting keeps v35's candidate order and conditional random draws. IDs are assigned before testing the new station clearance. Hardwood selection also precedes that filter. Tree views use the stable ID rather than an array offset.

The before/after comparison is exact for **all 362 scenery trees**, including ID, x/y/z, size, hardwood flag and array order. Both tables hash to `2d08b2bf68b0c38808e91472706f33f123eab0d56ff058d5365b2baac50d8ca1`. Regenerating `RAILWAY_SOURCES` with its existing recipe gives the same **388 rows**; no edit to that pinned table was needed.

**Dropped trees: none.** No v35 trunk intersects the station clearance mask. Both hardwoods north of the forge retain their IDs and centimetre positions: 209 `(89882, -4677)` and 232 `(92123, -4518)`.

Every wood source within 60 m of either the old or new Q1/Q2 anchors is preserved. The membership of a radius changes when its centre moves; the trees themselves do not:

| Centre | Within 60 m, stable source IDs |
| --- | --- |
| Old Q1 | 27, 164, 217, 232, 297, 329 |
| New Q1 | 27, 42, 88, 120, 164, 217, 244, 329 |
| Old Q2 | 27, 42, 88, 97, 112, 120, 164, 184, 217, 244, 295, 329 |
| New Q2 | 27, 116, 164, 175, 217, 220, 232, 297, 312 |

Evidence: `.look/evidence/home-flip-node/tree-comparison.json`, `trees-v35.json`, `railway-sources-regenerated.json` and `tree-proof.ts`. This proves the catalog; terrain seating and the rendered scene still need the assigned browser proof.

## Corrections needed to preserve the assertions

- The merge-base run under `BOOGLE_HOME=b` passed 34/35 tests. `garage-geo`'s steel-car test mixed the old stand with B's track and expected the old 0.03 m overlap (observed +3.590 m). The one-layout test now uses the actual stand and finite distance to the standing car's rectangular footprint, including its ends. It retains the 0.15 m leg clearance and requires positive barrel clearance. The deck sweep, landing and track clearances remain asserted.
- The plan's two approximate Village platform centres missed the actual shared midpoint by 22–28 cm. Both rules' platforms now use `(92985, 375, 1902)` cm, retaining the existing 5 cm view/rule tolerance. Stop marks are unchanged.
- The planned pedestal failed the existing 3.5 m rail-clearance assertion. It moves 12 cm north to local `(-78, -1.17)`; the dock moves 8 cm east to `(-76.07, -1.73)` to retain their existing 2 m separation. The breaker and boiler follow the pedestal. These are measured departures from the plan, not relaxed tests.
- The initial-track recovery clearing expands to the new stubs' bounds plus the same 8 m margin. Growth permission for every existing source is unchanged, both before and after line 1 completion.
- The greybox cart now follows the actual cart road; its boiler walk includes the 8.1465 m apron connector between the separated heads. Its existing ±2 m path-length assertion remains. The map generator refreshes only Home's anchors and heads, preserving the authored tails and other map options.

## Pinned fixtures and generated pages

Each fixture was regenerated through its owning file's record switch, after the intentional v36 rules change. No route-gate limit was changed.

| File | Command | What moved and why |
| --- | --- | --- |
| `railway-golden.json` | `GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'` | 46/47 stage rows change; awake stays identical. New boiler/anchor rows change hashes; the longer cart trip changes later seed clocks, usually +36 ticks. 103 tests pass. |
| `railway-ops-golden.json` | `GOLDEN=1 node --test test/railway-ops.test.ts` | Axe, boiler, call and foot scenarios change; opening stays identical. Accepted positions and cart timing now use Home's rules. |
| `rail-schema.json` | `GOLDEN=1 node --test test/railway-schema.test.ts` | Recorded namespace v33 → v36; all 33 component schemas are unchanged. Ops/schema run: 8 tests pass. |
| `railway-tick-order.json`, `railway-tick-order-heads.json` | `TICK_ORDER=1 TICK_ORDER_HEADS=1 node --test test/railway-tick-order.test.ts` | All 9 stage and 12 growing-head hash series change. Only clocks/hashes change: every system sequence and per-tick schedule is identical. 23 tests pass. |
| `railway-m12-trace.json` | `M12_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-m12.test.ts` | 76/82 client traces change with the new state/timing; fresh and awake for all three clients stay identical. 32 tests pass. |
| `coast-regions.test.ts`'s two digests | `PRINT_COAST_BASELINE=1 node --test --test-name-pattern='two shores' test/coast-regions.test.ts` | The terrain inputs change the texture/sample bytes. Dimensions, transforms, lattice bounds, separate-region and water-margin assertions remain; no coast/shader code changes. |
| `RAILWAY_SOURCES` | Existing `railway.test.ts` regeneration recipe, also recorded by `tree-proof.ts` | No row changes: the frozen planting preserves all 388 sources. |

Regenerated pages through their generators:

```sh
node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts
node --import ./dev/sim/hooks.ts dev/level/rail-map.ts
node --import ./dev/sim/hooks.ts dev/level/home-passenger-bay.ts
node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts
node dev/economy/build-prototype.ts
```

These write `docs/world/home-layout.html`, `rail-map.html`, `home-passenger-bay.html`, `world-blockout.html`, `map-prototypes.html`, `economy-prototype.html` and the derived `src/sim/railway-world-lines.ts`. `dev/economy/ring-data.ts` contains no obsolete Home anchor to replace.

## Route gates against v35

Both runs used `RAIL_AUDIT=1 FUZZ_STRIDE=1 ROUTE_GATES=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-route-rules.test.ts`: **44/44 pass**. Limits are unchanged. Every wait, duration and count matches v35 exactly. In the table, each cell is **v35 = v36**, worst (mean) ticks.

| Seed | 0 laid | 1 | 2 | 3 | 4 | Settled; over 1,050 |
| --- | --- | --- | --- | --- | --- | --- |
| c0ffee | 734 (329) | 607 (234) | 982 (343) | 887 (320) | 1062 (405) | 1160 (443); 6/303 |
| 777 | 749 (320) | 596 (227) | 868 (282) | 839 (321) | 877 (390) | 1319 (459); 18/298 |
| 5eed | 697 (351) | 662 (198) | 875 (263) | 1034 (373) | 974 (392) | 1157 (426); 5/312 |
| badd | 726 (352) | 623 (225) | 812 (306) | 766 (360) | 982 (406) | 1138 (419); 4/324 |

No settled wait exceeds 1,350 ticks. The 20,000-tick growth sweeps' worst line-2 waits are likewise unchanged: 138.2, 143.1, 118.7 and 122.9 seconds. Only absolute diagnostic clocks (joins, ask/serve timestamps and lay tick) advance 36 ticks, inherited from the longer pre-train cart trip. Subtracting 36 from those clock labels makes all 53 diagnostic lines identical; `route-comparison.json` records both versions. The schedule is expressed in distance along the rail and the stop distances did not move. The new 9.5 m turnout therefore changes geometry, not waits.

## Non-browser results

- `npx prettier --write` on changed files; `npm run check`: exits 0; 1,697 passes, zero failures, one existing TODO; typecheck, lint and production build pass.
- `npm run level-check`: **0 problems**, 5,278 placements, 61,660 machine poses, 563 timber decks, 13 reports. Line 1's stub radius is 9.5 m; the existing s182 turnout is 11.1 m. Motion through either remains unseen.
- Audited six-hold tests: **8/8 pass**. Audited server suite: **211/211 pass**, including all four hold-host late-join/restart/repeated-ask/release tests.
- `npm run checkpoints`: **25 seed stages** pass the host save path.
- `npm run loop -- run`: exits 0; route orders complete in the model. This is not a playthrough.
- `node dev/ship-check.ts`: exits 0, 1,207 passes, zero failures, one existing TODO across 119 affected test files; registry, 52 lint files and typecheck pass. `npm run registry`: exits 0 (22 presence keys, 16 message types, 16 ops, 9 states); debt unchanged. Final review stamp below.

The existing `railway-install` TODO still reports the all-longer fleet at seed `b011e7`: 1,146 ticks against the 1,050 target. Its TODO and limit are unchanged; it is not a new pass. The separately requested route gates and hold tests pass without exemptions.

Local logs and comparisons are collected in `.look/evidence/home-flip-node/manifest.json`. It is a non-browser evidence manifest, not a broker verdict. No image was opened, no browser/bot was run, and no device was tested by this worker. No browser failure is being represented as a pass.

## Browser proof owed to the assigned agent

Use the broker against the final branch; no Home query flag. The following combines the plan's X1 list with **both** designer rulings. No still or video from F1/F2 proves the flipped rules.

| Seed / setup | Exact frame and question |
| --- | --- |
| `awake`, arrival | Spawn's own eye-height camera; Sleeves whole in frame, shelf and open bay readable, Sleeves clear of the bay. Repeat at phone size. |
| `q1-done`, hall's back bay | Lane with a player, rack identifiable, goods door with the forge through it. The head ramp is absent at this seed; use the train-stage frames below to show it. |
| `trains-on`, platform | A train at each edge; deck-to-car-floor gap; both levers and plaques under their own masts and clear of boarding. A second frame with a player midway must offer no prompt or one. |
| `trains-on`, crossing from train | Eye height where a player gets off line 2's footing wagon, facing the stall: boards or their access ramp in frame and stall readable as the goal. Then from the head ramp's foot: step onto boards and line to stall door, standing train tail and cart forge stop in frame. If unseen from the wagon, the ruling calls for a second cue at the stall, not moving boards. |
| Rack lane, two players | Two players passing beside the rack; far posts against the cart on road 2. Accepted lane is 1.97 m; if it squeezes, rotate the rack, do not move it farther toward the cart. |
| `boiler-long`, `dev/look/evals/garage-open.ts` | Bearing 15°, table turned: stand, jib and crew outside the 4.8 m sweep; jump-in landing free. |
| `q1-done`, commons | From G `(-115, 20)`, bearing 70° toward the hall. |
| `q4-arriving`, real-time reversal video | Rack in frame; cart reverses at forge without turning; 0.36 m far-post gap, no clipping. |
| `cradle-fitted`, real-time roll-out video | 110 ticks; hold table, spur, cusp and boards in frame. Show 120° deck turn, pair backing down shunter first, rest at cusp, then push out. Direction change reads intentionally; wagon ends at line 2's coupling place. |
| `trains-on`, real-time turnout observation | From island end ramp as line 1 leaves: no car corner over next rail or ramp foot, no snap worse than the s182 turnout. This is additional to the two named videos. |

Also owed: the plan's bot segments to `forge-lit`, from `q5-done` to `trains`, and from `trains-on` to `freight`; `checks-for` adds two peers through `T2` at warp 3, opening through `t1-done`, and trusted `world-inputs`. The broker's trusted launcher must include/review the added Home anchor parity assertions before claiming they ran. Run broker `net` for the shared-world change and the plan's once-reported perf capture. Read bot reports even on failure; inspect PNGs and motion frames/curves without claiming real-time feel from those alone.

The orchestrator owns `archive/home-a`, independent review on the final stamp, namespace reconciliation with the other job, and the production startup check after any eventual ship. This worker does not push or ship. X2 updates the owning game-design section, plan statuses and named stale leftovers; R1–R3 remain unbuilt.

## Review stamp

`npm run review-stamp -- . --no-fetch` reports:

```text
review stamp f274a5cbcc6a (28 files since origin/main).
```

It marks the following files **review** (none are read-only classifications):

- `src/sim/railway-cart.ts`
- `src/sim/railway-line2-layout.ts`
- `src/sim/railway-lines.ts`
- `src/sim/railway-supply.ts`
- `src/sim/railway-works-layout.ts`
- `src/sim/railway-world-lines.ts`
- `src/world/namespace.ts`
- `src/world/railway-jump.ts`
- `test/coast-regions.test.ts`
- `test/curio-layout.test.ts`
- `test/fixtures/rail-schema.json`
- `test/fixtures/railway-golden.json`
- `test/fixtures/railway-m12-trace.json`
- `test/fixtures/railway-ops-golden.json`
- `test/fixtures/railway-tick-order-heads.json`
- `test/fixtures/railway-tick-order.json`
- `test/garage-geo.test.ts`
- `test/greybox-works.test.ts`
- `test/helpers/island-labels.ts`
- `test/home-station.test.ts`
- `test/island-map-labels-b.test.ts`
- `test/island-map-labels.test.ts`
- `test/railway-cart.test.ts`
- `test/railway-jump.test.ts`
- `test/railway-lines.test.ts`
- `test/railway-works-layout.test.ts`
- `test/railway.test.ts`
- `test/town-plan.test.ts`

A read-only internal diff review found no concrete bugs. This is not the independent committed-branch review required before ship. The stamp above is a fingerprint, not an approval.

