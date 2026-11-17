# Town economy K3 checkpoint

17 November 2026. Topic: town-k3-checkpoint. Measurements use fetched main
`102fdc6f2f1881ad3daded58c68c42c0ab6ac428`, on `codex/town-k3-checkpoint`.
Documentation and measurement only: no game code, numbers, rules, strings, layout, test assertions or fixtures changed.

**Result: measurements and Trade chapter recorded; the exact away-host sack proof remains unverified.**
No new host test was added, as instructed. K3's slice-closed box stays open rather than asserting that missing proof.
The designer retains the rooftop ruling; neither performance nor a playtest is a ship gate here.

## Plan as built

1. Fetch main, create the requested branch, install dependencies and read the build skill and triggered guidance.
2. Run level-check with B2's house hulls; read the compiled hulls and measure the drawn construction geometry.
3. Compare the two accepted seeds at the same Round camera with bounded hardware perf runs.
4. Inspect and run the existing away server tests once; stop short of adding the missing sack integration test.
5. Move and extend K2's economy section into Trade, retain its old anchor, update the index and record this checkpoint.
6. Format the scoped docs, review the diff, run ship-check, commit and rebase onto fetched main; no push or ship.

Revisions from the brief's assumptions: the drawn ridge is +6.76 m, not about +6.6 m; existing town rooms use a
different compiled roof-hull variant from the new plot houses. Current main also already gives the second offer
the loader benefit rather than another rider-rate increase. These are reported, not changed. The exact requested
host proof is absent, so this report does not claim the slice is closed.

## Rooftop chain

`timeout 180 npm run level-check` exited 0: 21 reports in 29,583 ms. Town houses: zero failures, nine solid boxes,
three blocked closed interiors. Supported roof tops were 23.200000286, 23.199999809 and 23.200001240 m world Y
(+5.2 m above the 18 m ground). The adapter measures the first three physical plots in order: plot3, plot2, plot1.

| Link, with plots 3 and 2 built | Horizontal edge gap (m) |
| --- | ---: |
| Bay crown to shelf crown | 0.30 |
| Shelf crown to plot3 roof | 1.02 |
| Plot3 roof to plot2 roof | 9.94 |
| Plot2 roof to Fine Prices' roof | 2.89 |
| Fine Prices' roof to balcony | 0.15 |

The 9.94 m link exceeds the plan's walking second-jump envelope (7.4-7.9 m) by 2.04-2.54 m and is 2.66 m inside
its sprinting 12.6 m envelope. All links are horizontally inside the sprint envelope. Thus the measured chain is
**not open to walking under that envelope; it is geometrically open to sprinting**. This is not an executed
controller route, a movement certificate, or a designer acceptance. Takeoff height, timing and landing clearance
remain unverified. No ruling or layout change was made.

Source: `dev/level/town-houses.ts`, called by level-check. Its crowns use `TOWN_PROPS`' crown footprints; house
rectangles include the 0.1 m wall overhang on each side. Its shop rectangle is `ROOM_PLOTS.shop`, not a newly
swept player/collider envelope. The house solids come from `town.plot-house-hull`. See
`src/place/town-plan.ts`, `src/content/prefabs/town-plot-house.ts` and `src/place/layout.ts`.
The full level run also reported 15 new likely-visible z-fighting pairs relative to its baseline (report-only,
not introduced or repaired here); general level-check success does not certify every rendered surface.

## Drawn roof versus support

Figures are metres above each building's ground. A read-only Node stdin probe imported `housePlan`, `partGeometry`,
`ROOM_PLOTS` and the compiled `definitions` through `dev/sim/hooks.ts`. It transformed every actual vertex of roof
pieces from `WALLS` through `ROOFED` by its `box.local` matrix, excluding chimney pieces. It compared the maximum
drawn Y with `collider.at[1] + collider.half[1]` of the actual compiled roof collider, not the generic plan's hull.
Raw local output: `.look/town-k3/roof-measurement.json`.

| Building | Actual roof hull top | Drawn ridge top | Maximum surface above avatar support |
| --- | ---: | ---: | ---: |
| New plot3 / plot2 house recipe | +5.20 | +6.76 | 1.56 |
| Existing hall/house | +5.60 | +6.76 | 1.16 |
| Existing Fine Prices/shop | +5.86 | +7.06 | 1.20 |
| Existing museum | +7.08 | +8.36 | 1.28 |

These are geometric foot/support-plane penetration maxima at the ridge, not a measured avatar pose or a claim of
constant sinking along the whole slope. The new houses' roof support half-depth is 2.59 m; existing house/shop/museum
half-depths are 3.90/4.20/6.20 m. The existing rooms share the drawn housePlan recipe, but their resolved roof hull
adds 0.4 m over `high + 0.6 * rise`. The new house uses +5.2 m directly. Its drawn ridge timber is base-standing
at `high + 0.3 + rise` and is 0.26 m tall: +6.76 m. Using the generic `housePlan.hulls` for the existing rooms
would overstate their penetration by 0.4 m. No roof or collision code was changed.

Sources: `src/place/building-plans.ts`, `src/render/box-plan.ts`, `src/content/prefabs/town-plot-house.ts`,
`src/content/prefabs/rooms.ts`, `src/prefab/resolve-prefab.ts`, `src/entities/town/rooms.ts`.

## Round performance - provisional, reported only

Both runs used `npm run perf -- --hardware --render --seconds 5 --view home-green --size 1200x800`, with
`--query from=trains-on` or `--query from=house-built`, and their own `--json` and `--verdict` paths. Each run was
bounded by `timeout 240`. The `from` links created accepted private jump rooms; saved routes confirm the respective
seed-prefixed rooms. Same fixed camera: (885, 34, 48), looking at (885, 18, 20), FOV 55; 1200 x 800, DPR 1, MSAA 4.
Full Playwright Chromium 156 on Windows, WebGPU, NVIDIA Ampere, non-fallback adapter; no graphics errors.

| Seed | Draws | Shadow draws (difference) | Triangles | CPU avg / p95 ms | GPU span avg / p95 ms | Completed-frame interval avg / p95 ms |
| --- | ---: | ---: | ---: | --- | --- | --- |
| trains-on | 396 | 233 | 786,069 | 11.170 / 14.310 | 11.869 / 15.036 | 18.190 / 18.800 |
| house-built | 360 | 193 | 807,759 | 10.420 / 13.355 | 11.399 / 15.453 | 18.117 / 18.735 |

Triangles increased by 21,690; sampled draws decreased by 36 (shadow difference decreased by 40). These are exact
counts of the sampled frames, not an isolated cost attributable only to a house: the seeds contain different train,
crowd, shadow and progression states. GPU render-timer averages were 4.015 and 3.995 ms; GPU span includes gaps and
is not the sum of pass timers. CPU excludes GPU execution. Completed-frame intervals are an animation-callback
presentation proxy, not display scan-out latency. Samples: 275 and 277 completed frames respectively.

**Timing is provisional, not evidence of an improvement/regression.** Windows CPU readings before the two runs
were 1% and 1%; a later reading was 4%. Both harness verdicts reported load 0 to 0, no queued contention and no
shared bot slot. Windows' zero load-average values do not prove an idle machine or exclusive GPU use. T3 Code,
Claude, ChatGPT, NVIDIA/container and cloudflared processes were running. Only one perf run of mine ran at a time;
no concurrent look or bot of mine ran during either sample. No two-player look was run.

Local evidence: `.look/town-k3/trains-on-perf.json`, `trains-on-perf.log`, `trains-on-verdict.json` and the
corresponding `house-built-*` files in that directory. Both capture-health verdicts passed. These are not device results.

## Away host proof

First inspected `server/test/railway-away.test.ts` and searched `server/test/` for sack assertions. No server test
asserts the till's sack after an emptied room and a fake eight-hour rejoin. The file's real
`createRailwayWorldHost` tests fake eight hours for the forge/depot and crate yards, not the sack; its WebSocket
service test empties a room past the grace and rejoins, but does not fake eight hours or inspect Till.

Ran it once, unchanged:

```text
UNIT_ONLY=server/test/railway-away.test.ts timeout 120 node dev/test-unit.ts server/test/railway-away.test.ts
```

**8 tests passed, 0 failed, 8.9 s.** This proves the existing host/grace/yard behavior, not the exact requested sack
integration. `UNIT_ONLY` confines this runner, which otherwise appends its default unit-file set even with a file
argument. The environment variable was cleared after the command.

Also ran existing C1 rule tests, unchanged, to separate what is proven:

```text
UNIT_ONLY=test/railway-trade.test.ts timeout 120 node dev/test-unit.ts --test-name-pattern=C1: test/railway-trade.test.ts
```

**7 tests passed, 0 failed, 5.0 s.** They prove the eight-hour rule/seed result (630-Boogle cap), no duplicate resume
credit, preserved strongbox, full pour, lower-rate preservation and validation. They directly call resume/rules;
they do not empty and rejoin a real room host. The sack-waiting seed also calls resume directly. Neither is a
substitute for the requested host proof. **Stopped at the new-host-test boundary: no new test, assertion or fixture
was written.** Closing that proof needs separately authorized host-test work.

## Documentation and owner items

K2 (#1932, `ae976003`) added the economy section to `docs/game-design/place.md` and its index line. This change moves
and extends that section as `docs/game-design/trade.md`, retains the old heading as a forwarding link and updates
`docs/game-design.md`. Freight, rider/coach details, strongbox, buying/building and sack presentation are preserved;
the current rules and loader exception are sourced to their owners. No duplicate chapter or new character line.
The plan gets a dated evidence note, not an unsupported slice-closed tick.

Owner copy review: the existing board/prompt strings listed in Trade, especially `Every train` versus `+1 rider / minute`,
`Price <n>`, `Box <n>`, `Hold to build`, `Hold <percent>%`, `Need <n> more Boogles`, `Waiting for town`, `Empty` and `Sack <count>`.
The chapter preserves the existing coach-description placeholder too. No copy was changed.
Designer: the sprint-envelope route and the measured ridge/support mismatch above; no acceptance implied.

## Opened, checks and remaining limits

Opened/read the build/look skills and triggered tools, Codex, tests, simulation, performance, GPU, bot-segment,
capture-health, verification, shipping and principle-index guidance; the plan's K3/level/roof findings; K2's commit;
the owning layout, compiled prefab, room and plot views; trade layout/queries/systems/seeds; both away test sources;
and both performance JSON/log/verdict sets. No new still, motion sheet, recording or curated image was opened or
added: this checkpoint's roof evidence is numeric and perf's visible browser is not a visual-quality proof.
Earlier K1/B2 captures were not reopened; their reports remain historical evidence only.

Setup: `git fetch origin` then `git checkout -b codex/town-k3-checkpoint origin/main`. Node 26.13.0; dependencies
were missing, so `timeout 180 npm ci` installed them (0 vulnerabilities). This runner's Git Bash launch initially
returned without executing; an explicit Bash shell request was rejected as an unrecognized export. Used PowerShell
with the same pinned Node PATH, `npm.cmd` (PowerShell blocks npm.ps1) and Git's GNU `timeout.exe` thereafter.
`npm run map -- --kind build` was attempted, but build is not a map kind; `--kind docs` was then read successfully.
`npm run inflight` reported only the separate orchestrator backlog/state lane; those files were not touched.

Final scoped formatting, diff review, rebase and `node dev/ship-check.ts origin/main HEAD` results are recorded below
after they run. No `npm run check`, push, ship or PR. Unverified: actual rooftop controller traversal/clearance,
avatar poses on the ridge, quiet-machine performance, real display presentation, the exact away-host sack path,
and real-time visual smoothness. **not tested on a device**.

Worktree: `C:/Users/matia/.t3/worktrees/boogle/t3-8df38280-10a596bc93c09bb5`.
