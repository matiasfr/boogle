# R2b: production coach, eight riders, and the Gorge crossover

16 November 2026. Branch **t3/rider-coach-blockout**. World **v57** (own small bump commit
`8c5fc856e`); Gorge crossover data is its own commit **72354f8d9**, sharing v57.
Rebased on main **a32bc4362** (#1981–#1985). No push or ship. No subagents. No R1c, R3 or R4.

**Implementation and verification complete apart from the separately owned Pier R2b.1 dependency and the explicit evidence limits below.**
R2b.1's existing −2.60 m full-tail/crossing clearance remains a named failing row against its unchanged
0.60 m minimum and future 0.80 m pin. The builder did not edit the Pier crossing or ramp. Rebase and rerun
level-check when R2b.1 lands. Do not merge this branch while that row fails.
The [second-stop report](rider-coach-r2b-second-stop.md) preserves the original failures and controls.

## What changed

Every train on a rider route (`lineRoute(line) >= 0`) has a dedicated coach immediately behind the players'
car. Cached `consistOf` layouts own role/offset selection. The timber line and garage works copy have no coach.
The 2.90 × 1.60 × 2.05 m blockout has timber body and iron underframe, five posts and four window openings per
side, two merged meshes and one solid envelope collider. Riders sit one per opening, filling alternating
sides; no V1 standing riders remain in the players' car. Players can stand on the roof, not enter the body.

`TRADE.riderPlaces` is the capacity source: eight. The allowance rule excludes the coach; boiler readouts
include it and read 4 / 4 / 5. Home's stop is 21.65 m; Ring's is 1193.40 m (u 451.40). Cargo world positions
at those stops remain unchanged. The maximum rear extent is 16.10 m, steel-car centre 14.50 m behind the
players' car. `RIDER_SPAN` now includes that centre for server-side requests. Signals, end blocks and
spacing use the actual extent; `WAGON_S` remains 10.85 m. Loader/kit/footing/deck, preview, depot/board/till
readers follow roles or catalog marks. The rail map's loader descriptions now do too. Ring's physical
construction origin remains separate from its service mark through `legStartS`.

The economy model and pages, rail map, Home layout and halt prefab catalog were regenerated. Owning
[trains, Home and town economy sections](../game-design/place.md) describe the built behavior.

## R2b.2: High Gorge

The map row owns `turnbacks.ring.end = 319300` catalog cm; generation moves the full 22 m crossover to
**line 2 s 3192.00–3214.00**. The stop remains **3230.40**. The end block and signal follow (signal
3183.80 m); the flag-only world blockout's crossover X follows the generated row. No production Gorge
scenery or player-reachable structure moves.

The long train's reserved tail stands **0.30 m** past the crossover, minimum **0.30**, pin **0.30 ±0.01**.
The shorter steel train clears **4.00 m**, same minimum, pin **4.00 ±0.01**. The last car changes **0 m /
0 radians** when the standing train turns. The corrected platforms are **3210.40–3250.40**. Every other
Gorge row passes. The full-line queue sweep measures **0.940971 m** homeward at **s 84.90**, minimum **0.50**,
pin **0.94 ±0.01**; outward **3.881682 m** at s 196.40, pin **3.88 ±0.01**. The additional finer Home-curve
sweep finds **0.929561 m** at s 85.00 (0.25 m samples), also above the same minimum.

## Every measured margin and pin

[All 61 tail/nose audit rows and 35 passenger-platform poses](rider-coach-r2b/finish/margins.md), with the
[full coach/Home numeric report and per-row design sources](rider-coach-r2b/finish/level-check.json).
The audit rows enforce the plan's minima and ±0.01 pins; report-only reservation rows remain explicitly
report-only. The passenger rows check longitudinal containment **and** lateral stopping side. Terminal
homeward poses, every moving railhead, the retained Joint and Gorge are included. Timber-only consists
are covered by production consist tests and the line-1 Home/Camp level checks.

Home's production pins replace R1b's planned symmetric engine envelope with the asymmetric long engine
and actual axle pose: engine/island **0.579440 → 0.607466 m**, engine/lever **1.134159 → 1.160978 m**.
No design minimum changed. The thinnest retained margins are tail/spur **0.050000 m**, players' far deck
end **0.453286 m**, standing set/island **0.550049 m**. Approved-camera comparisons still match the
approved footprint, with real windowed coach geometry. [Exact Home pin deltas](rider-coach-r2b/resumed/home-pin-deltas.json).

## Stack control and rider service

The same accepted `rail.call`, halt **8**, direction **−1**, on v56 stops slot 4 at tick **18347** on lateral
**−4 m**, origin 0. Players' car nearest edge **−2.90 m**, only deck inner edge **+1.80 m**: **4.70 m** across
the outward track. [v56 control](rider-coach-r2b/resumed/v56-control.json). The coach inherits a **5.00 m** gap.
Named known gaps: **Stack head 1 homeward (retained), Stack head 2 homeward (retained), Stack head 3 / Stack
halt homeward (retained)**. Heads 1/2 apply only while still served. Outward and current terminal service
use the original/east track. This pre-existing omission is non-failing under the orchestrator's ruling.

Line 2's rider route is **Home ↔ current far end** (`a: 0, b: 'end'`): Far Head before Q6, then Pier,
the current Ring Railhead, Ring Island, current Stack head, and finally High Gorge as the line extends.
Retained intermediate stops, including those three missing-west-platform stops, neither board nor alight
riders. Seated riders remain on the train; they do not pop across the tracks at retained heads.

Players have a ground-level route: the solid formation spans lateral **−6.30..+2.30**, overlapping the east
deck's footprint by 0.50 m. They can descend 0.90 m to that railbed, cross it and jump to/from the 0.70 m
players' deck. This is a source/geometry assessment; a controller-driven board/alight witness was **not run**.
There is no direct platform alongside the homeward car. Proposed west decks: centre **−8.05 m**, length
**25 m**, with checked ramps and furniture, **not built here**. Recorded separately as plan Level finding 12.


### Fare vector: why both 0.9 changes happen

Fare remains **9 Boogles**: Home–Pier distance changes **711.75 → 708.35 m**, so `2 + floor(metres / 100)`
stays 9. The shorter round trip changes arrival phase within the fixed ten-minute sample. One extra rider
arriving inside that window adds **9 / 10 = 0.9 per minute**; it is not a fare-band increase.

| In-memory control | Fare vector |
| --- | --- |
| v56 values | `[36, 54, 72, 72]` |
| Cap alone | `[36, 54, 72, 72]` |
| Home stop alone | `[36.9, 54, 72, 72]` |
| Ring stop alone | `[36, 54, 72, 72]` |
| Tail alone | `[36, 54, 72, 72]` |
| Stops + tail, old cap | `[36.9, 54, 72, 72]` |
| All production values | `[36.9, 54, 72.9, 72.9]` |

The first increase is Home's phase shift. The third needs that phase shift **and** eight places: the crowded
four-house run boards a six-rider burst without the old cap splitting it, moving one further rider's arrival
inside the sample. Both are intended consequences of the approved stop/cap rules; no extra fare change was
made. The fourth entry adds the **yard, not another rider house**: plot 2 is the yard, so those three plots
contain only two rider houses. Eight places have no additional riders to carry there. The test now says this.

The new cap-sensitive test puts **nine waiting**, boards **eight**, leaves **one**, then lands **72 Boogles**
on that trip. It saves/reloads a copy and compares hashes every tick through arrival, also checking the
rider ledger. It passes at cap eight and fails at cap four with **`36 !== 72`**.
[Fare/test pass](rider-coach-r2b/resumed/trade-current.log),
[old-cap expected failure in full](rider-coach-r2b/resumed/crowded-v56.log),
[arrival/boarding trace](rider-coach-r2b/resumed/fare-events.log).
Economy prototype and trade pages were regenerated from data.


## Re-pins and causal controls

[Complete changed-stage sets](rider-coach-r2b/finish/causal-stages.json), [v56 control](rider-coach-r2b/finish/golden-baseline.json),
[production result](rider-coach-r2b/finish/golden-current.json). All 53 stages plus their 1,200-tick continuations
reproduce the v56 golden exactly when cap, Home, Ring, tail and Gorge are independently restored in memory.
**Unexplained changes: zero.** The independent controls are not additive stage sets: interactions can matter.

- **Cap alone:** `house-built` (continuation), `yard-ready`, `yard-built`, `yard-wagon`, `yard-deck`.
- **Home alone:** all 53. Even `awake` contains the **initial dormant train's moved Home from/dest**.
- **Ring alone:** `ring-joined` (continuation), `steel-kit`, `steel-lit`, `steel-home`, `boiler-long`,
  `gorge-open`, `gorge-mid`, `gorge-reached`.
- **Tail alone:** `q6-finishing`, `q6-done`, `works-arrive`, `works-open`, `works-stocked`, `works-lit`,
  `stall-done`, `cradle-fitted`, `wagon-on`, `yard-wagon`, `crossing-finishing`, `crossing-done`, `deck-laid`,
  `yard-deck`, `gap-footed`, `leaf-raised`, `ring-joined`, `steel-kit`, `steel-lit`, `steel-home`,
  `boiler-long`, `gorge-open`, `gorge-mid`, `gorge-reached` (seed and/or continuation; JSON gives exact values).
- **Gorge alone**, and production versus pre-Gorge: only `gorge-reached`. Tick remains 17694; stage/continuation
  hashes change 1120194485/3369652245 → **3835184565/500074245**.

Other pins and causes:

| Re-pin | Cause |
| --- | --- |
| `railway-golden`, ops, M12, tick-order, tick-order-heads | Rider cap, moved Home/Ring marks, tail-dependent holds; controls above |
| `prefab-halts`, halt requests | Moved Home/Ring marks and extent-derived end blocks; then Gorge end block/catalog only |
| Host trace (8,600 rows) | v57 namespace, dormant Home `from/dest` 1825→2165, derived hashes/checksums and snapshot bytes; **no other field** |
| Home geometric pins | Actual asymmetric engine and axle poses, as above |
| Fare vector | Sampling phase plus cap, explained above; fare band unchanged |
| Pier/pre-Pier/Railhead cycles 1208/920/1050→1204/914/1046 ticks | Home trip shortened 3.40 m |
| Pier 75% headway 453→451; settled gaps [604,604]/[554,654]→[602,602]/[551,653] | Home-only control changes integer balancing phase; tail-only unchanged. Mean remains half-cycle; safety headway assertion retained |
| BUILD2 yard benchmark 651→650 | Home-only travel phase; bills and work unchanged |
| Economy prototype summary hash | Generated from the changed rider-cap data |
| Prefab chair test | Finds chair by prefab key; coach prefabs make the old placement index stale |
| Ring world-line assertion | Compare physical construction origin via `legStartS`, not shifted service mark |
| Server request boundary 2110→2450 cm | Maximum car centre moved 1110→1450 cm; unchanged 1000 cm reach |

The [host trace classification](rider-coach-r2b/resumed/host-trace-deltas.json) remains valid after the Gorge
and reach repairs: the trace test passes unchanged. The [Gorge recording run](rider-coach-r2b/finish/gorge-golden-record.log)
passes 14 tests. No timing, fare, clearance or snapshot discrepancy was accepted without its cause.

## Count-read stills and approved Home cameras

[Image gallery](rider-coach-r2b/resumed/gallery.html). All **18 delivered PNGs** were opened personally.
The six original approved Home stills were also opened for comparison. Home geometry/framing matches that
approved footprint; the actual coach has windows in place of the staged solid box. The square and coach
cameras retain the approved pillar occlusion; they are comparison views, not counting views.

The count matrix uses the **real production train**, frozen at Home, with **Local-only rider visibility
staged to 8/3/0**. It does not forge authoritative state or prove boarding. Health files retain the actual
rule row and the camera coordinates. Four distinct near-side riders fit four openings on each side in the
full views; **eight are countable across the two side views** at game zoom and close, not all eight in one
view. Three fill **2 + 1** across the sides; the far-side pair is not reliably visible in the island game
view. Empty is visibly empty from both sides. The close views expose the intended empty windows clearly.

| Count | Outer game | Outer close | Island game | Island close |
| --- | --- | --- | --- | --- |
| 8 | [PNG](rider-coach-r2b/resumed/counts/8/c0-v0.png) | [PNG](rider-coach-r2b/resumed/counts/8/c1-v0.png) | [PNG](rider-coach-r2b/resumed/counts/8/c2-v0.png) | [PNG](rider-coach-r2b/resumed/counts/8/c3-v0.png) |
| 3 | [PNG](rider-coach-r2b/resumed/counts/3/c0-v0.png) | [PNG](rider-coach-r2b/resumed/counts/3/c1-v0.png) | [PNG](rider-coach-r2b/resumed/counts/3/c2-v0.png) | [PNG](rider-coach-r2b/resumed/counts/3/c3-v0.png) |
| 0 | [PNG](rider-coach-r2b/resumed/counts/0/c0-v0.png) | [PNG](rider-coach-r2b/resumed/counts/0/c1-v0.png) | [PNG](rider-coach-r2b/resumed/counts/0/c2-v0.png) | [PNG](rider-coach-r2b/resumed/counts/0/c3-v0.png) |

Home approved cameras: [square](rider-coach-r2b/resumed/home/c0-v0.png), [island](rider-coach-r2b/resumed/home/c1-v0.png), [table](rider-coach-r2b/resumed/home/c2-v0.png), [top](rider-coach-r2b/resumed/home/c3-v0.png), [players](rider-coach-r2b/resumed/home/c4-v0.png), [coach](rider-coach-r2b/resumed/home/c5-v0.png).

Capture health: WebGPU, positive completed-frame counts, no page/console/graphics errors in final captures.
Initial count attempts rendered empty because frozen-camera captures had not recullled folk; those were
rejected. Final capture explicitly refreshes cosmetic culling after each camera change, with zero rule-time
advance. These are stills, **not a performance or motion certificate**. Logs of failed harness attempts are
retained alongside the successful capture logs.

## Real-time recordings and visual findings

All clips use accepted server seed/state, then normal 1× server and client clocks for the recording.
`dev/look/rider-coach-proof.ts` is the reproducible harness. MP4 copies preserve the original recording's
frame timing and dimensions (1200×800, no speed-up); originals remain under `.look/rider-coach-r2b/finish`.
The count matrix above stages cosmetic visibility; these recordings do not.

| Clip / stills | What it shows |
| --- | --- |
| [Home boarding](rider-coach-r2b/finish/home/home-realtime.mp4), [sheet](rider-coach-r2b/finish/home/home-motion.png) | Two aboard on arrival; three while standing, then three depart. The new near-side rider appears in a separate opening; no walk across open ground. |
| [Pier boarding](rider-coach-r2b/finish/pier/pier-realtime.mp4), [standing](rider-coach-r2b/finish/pier/pier-standing-still.png), [departing](rider-coach-r2b/finish/pier/pier-departing-still.png) | Three arrive, four while standing; the purple near-side rider fills the second opening. The clearer opposite-side camera avoids the first attempt's canopy post. |
| [Home curve departure](rider-coach-r2b/finish/curve/curve-realtime.mp4), [sheet](rider-coach-r2b/finish/curve/curve-motion.png) | Actual long boiler, players, coach, kit, wagon and steel car arrive, stand and leave around Home's curve. Wide composition; not a rider-count view. |
| [Gorge north platform](rider-coach-r2b/finish/gorge/gorge-realtime.mp4), [standing](rider-coach-r2b/finish/gorge/gorge-standing-still.png), [departing](rider-coach-r2b/finish/gorge/gorge-departing-still.png) | Fixed camera toward Home; actual long wagon train arrives and backs out. The engine partly occludes the rear cars, so the wide clip complements this requested view. |
| [Gorge wide turn](rider-coach-r2b/finish/gorge-wide/gorge-realtime.mp4), [sheet](rider-coach-r2b/finish/gorge-wide/gorge-motion.png) | All six car bodies remain straight while standing and turning; they cross to the homeward track only after departing. |
| [Ring Island standing](rider-coach-r2b/finish/ring/ring-standing-still.png), [departing](rider-coach-r2b/finish/ring/ring-departing-still.png) | Opposite the loader canopy: the full six-car train, with both passenger cars alongside the platform and freight in its retained loading positions. |
| [Two-train queue](rider-coach-r2b/finish/queue/queue-still.png), [two-frame sheet](rider-coach-r2b/finish/queue/queue-motion.png), [staging data](rider-coach-r2b/finish/queue/staging.json) | Two complete six-car production body sets at s 84.90 / 57.50 on the homeward track, visibly separate at the tight bend. The foreground pair is staged; other live trains are background. |
| [Garage Cars tile](rider-coach-r2b/finish/garage/rider-coach-garage-still.png) | Real garage interaction, “4 seats, 8 riders”; engine and players' car in the works copy, no coach. |

Home proof: arrival tick 4570, count 2→3 at 4577, departure 4620. Pier: arrival 5173,
count 3→4 at 5178, departure 5222. The count does not change during the recorded RUN phases. These are
aggregate riders, not identity-preserving NPC journeys; the existing count-driven draw remains unchanged.
Gorge uses `boiler-long` followed by accepted leg construction to the Gorge, since the canonical
`gorge-reached` checkpoint does not itself have the longest boiler/wagon combination. Proof JSON records
boiler 2 and wagon true. Every final capture has advancing WebGPU frames and no graphics/page/console error.

Queue staging copies the production car roots **and** the wagon/steel bodies from their shared draw batches;
poses come from the production helper, not hand placement. Couplings are omitted. It changes no shared row or
physics body and is geometric evidence, not a traffic/prediction scenario. Earlier root-only captures omitted
those two batch-rendered bodies and were rejected; the retained capture includes both.

Inspection: opened the stills and motion sheets, and decoded the boarding/departure intervals from the
real-time recordings. Two browser video snapshot attempts failed with **“Preview automation snapshot timed
out after 15000ms.”** Playback was started at 1×, but its snapshots were unavailable. Consequently this
report certifies the visible frames and stand-only count transitions, **not display smoothness**. Initial
obscured/incorrect-camera attempts were rejected and retained in `.look`, not offered as proof.

## Roof reach

[Every halt and operating pose: 48 rows](rider-coach-r2b/finish/roof/results.md),
[raw collision measurements](rider-coach-r2b/finish/roof/reach.json),
[probe](rider-coach-r2b/finish/roof/roof-eval.txt).
The coach roof is **2.05 m** above rail, **1.35 m above the players' deck**, and **1.15–1.35 m above halt
decks**. The production held jump plus air jump rises **2.9966 m** in the numerical envelope, so it is
reachable. Existing standable boiler and cab tops are **2.50 and 3.295 m**, respectively. The solid
coach envelope prevents entry; no interior passage or door walk is built.

The live collision-top scan found **zero newly reachable walkable patches in all 48 poses**, including
both running sides, all eight Ring railheads, retained Stack gaps and terminal homeward variants. It
compares old train positions with the new coach, not just roof heights. The Ring gap/braking-carry and
roof-bypass level checks include the production coach roof and pass unchanged.

Limits: 1 m surface grid over 48×48 m per halt, walkable components connected within 0.60 m rise and a
sprint/double-jump envelope. This is a sampled geometric reach check, not a swept-body/controller witness,
not proof about sub-metre landing spots, and not a new route playtest. No new route was found; no roof
height or level threshold was altered to obtain that result.

## Review findings

| Review point | Finding |
| --- | --- |
| Prediction against server with the new extent | Shared integer `TRAIN_EXTENT`, route/end-block and train math; client replicas and server use the same catalog. Offset, retained-block, train, replica, host-trace and request-boundary tests pass. `RIDER_SPAN` repaired to 1450 cm. The staged queue is geometric evidence, not a new movement-prediction scenario. |
| Save, reload, restart and late join at eight | Crowded fare test boards eight of nine, saves/reloads, compares each tick through payment. Real durable-host restart and late-join replica preserve all rider counts plus waiting/boarded/alighted ledger; validation rejects over-cap and inconsistent ledgers. Explicit v56 Home standing pose is refused. |
| Every extent/stop/role reader | Audited production/test/dev readers; rear extent, server reach, end blocks, headways, shunt and role-based loaders updated. R4b reads actual extent; greybox rides read catalog Home; Ring construction keeps `legStartS`. Historical v56 controls and synthetic route tests intentionally retain old numbers, labeled as such. |
| Garage works copy | Route-free consist excludes coach; inspected live Cars tile and copy. Boiler counts are data, allowance rule unchanged. |
| Lockstep | Only integer catalog/rule values changed; no floating view geometry imported into simulation. Deterministic controls, ops, tick-order, save/load, host and two-player mirror checks pass. |
| Goldens | Every changed stage/continuation classified by cap, Home, Ring, tail or Gorge control. Zero unexplained stages; host trace has no unrelated field changes. |
| New car view allocation/lifecycle | Layouts/bounds/seat offsets cached once. Coach meshes/materials constructed at view creation, disposed through the prefab owner; teardown clears rider bindings. Per-frame posing reuses vectors/quaternions, has no new `map`, `filter`, array/object construction or geometry/material allocation. Existing unrelated train-view allocations remain. |

## Checks and remaining dependency

| Check | Result |
| --- | --- |
| `npm run loop -- run` | PASS through Gorge. Order and bills unchanged; route totals 3:15 / 2:58 / 2:54 / 2:57 for 1–4 players. [Log](rider-coach-r2b/finish/loop.log). |
| `npm run checkpoints` (all 53 named stages) | PASS, every seed builds through host save path. [Log](rider-coach-r2b/finish/checkpoints.log). |
| Two-player T2, warp 3 | PASS: both end T2 at tick 2183; hashes agree at 235 server steps. Under load, max clock deficits 5.185/4.516 s; not timing/feel evidence. [Report](rider-coach-r2b/finish/t2/report.txt), [both-player verdict](rider-coach-r2b/finish/t2/verdict.json). |
| `world-inputs`, `town-buy` | PASS both scenarios; no graphics errors. [Log](rider-coach-r2b/finish/scenarios.log). Buyer/partner stills and reload sheet opened. |
| `npm --prefix server test` | PASS **408/408**. [Log](rider-coach-r2b/finish/server-final.log). |
| Full unit portion of `npm run check` | PASS **2311**, skipped 65, todo 1, failed 0 (2377 tests). [Log](rider-coach-r2b/finish/check-final.log). |
| Explicit old-save shape/cap bounds | PASS 3/3 after adding the immediate v56 standing-shape regression. [Log](rider-coach-r2b/finish/load-shape-fixed.log). |
| `npm run level-check` | Only the named pending Pier failures below; no stale generated page, no other minimum failure. |
| Typecheck / lint / prefab build | PASS; lint zero problems. |
| `git diff --check` | Source/doc edits clean; raw test transcripts retain their original trailing spaces and final blank lines. [Full whitespace diagnostics](rider-coach-r2b/finish/raw-log-whitespace.log). |
| `node dev/ship-check.ts` | PASS: registry, 70 lint files, typecheck, prefab check, 212 affected test files; 1872 tests passed, 65 skipped, one todo, zero failed. [Log](rider-coach-r2b/finish/ship-check-fixed.log). |
| `npm run build` | PASS. [Log](rider-coach-r2b/finish/build.log). |
| `npm run perf` and v56 control | PASS WebGPU/no errors. Entry counts 398 draws and 649812 triangles both; geometry 830→823, programs 201→207, shadow-call sample 86→184. Separate moving startup frames and shared-machine load make shadow/timing differences non-comparable; this is not a coach-visible cost or performance-regression claim. [Current](rider-coach-r2b/finish/perf.log), [v56](rider-coach-r2b/finish/perf-baseline.log). |

Full pending failures (not waived):

```text
FAIL  crossing clears the full stopped train by -2.6 m
Pier full tail/west crossing: -2.6000000000000227 m < 0.6 m (R2b.1 pending: Pier west foot crossing must move 3.40 m toward Home)
Pier full tail/west crossing: -2.6000000000000227 m, pin 0.8 ± 0.01 m (R2b.1 pending: Pier west foot crossing must move 3.40 m toward Home)
Pier 12.40 m tail/west crossing: 1.1000000000000227 m, pin 4.5 ± 0.01 m (R2b.1 pending: Pier west foot crossing must move 3.40 m toward Home)
```

`npm run check` therefore stops at level-check; its build was run separately. Earlier assertion failures,
full expected/actual output and stack traces are preserved **unabridged** in
[earlier-failures.log](rider-coach-r2b/finish/earlier-failures.log): stale stop/cycle/headway/catalog/geometry
pins, economy page signatures, old server reach, an overly broad restart assertion including intentionally
reset ephemeral account/outcome rows, the first roof harness parse error, and queue capture harness errors. Each was corrected with the
cause recorded above; no failing threshold was loosened. The initial ship-check's two failures were:
`stale: run node dev/economy/build-prototype.ts` and `run node dev/economy/build-trade-page.ts`; the pages
were regenerated after the final source-comment edits.

R2b.1 remains separately owned and unmerged at the recorded base: move the Pier crossing 3.40 m toward
Home, preserving the 0.60 m minimum and yielding **0.80 m** clearance, then rebase this branch and rerun
level-check and the final gate. R2b.3's acceptance checkbox remains open for that dependency. Independent
review is not claimed. No R1c, R3, R4, west Stack platforms, boarding walk or final art was built.

Placeholder string: **“The knifeboard car seats ${playerSeats} players; the riders' coach behind it seats
${TRADE.riderPlaces}.”** Existing Cars title/labels still interpolate data; boiler readouts change numbers
only. The Boogler's copy is untouched; no suspect line found.
