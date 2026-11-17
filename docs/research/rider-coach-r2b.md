# R2b: production coach, eight riders, and the Gorge crossover

**Review follow-up:** [wheel capacity, restored tests, held Home signals and controller proofs](rider-coach-r2b-review-fixes.md)
records the subsequent rebase onto `d0ca285b1`. The acceptance history below records the earlier reviewed build.

16 November 2026. Branch **t3/rider-coach-blockout**. World **v57** (own small bump commit
`be3935d49`); Gorge crossover data is its own commit **c3ebcef7c**, sharing v57.
Rebased on main **2c29e37a3** (#1981–#1986, including R2b.1). No push or ship. No subagents. No R1c, R3 or R4.

**R2b.2 and R2b.3 are built locally for independent review.** The separately owned Pier crossing is now on
main and integrated: the production six-car tail clears the planks by **0.80 m**, against **0.60 m** minimum
and **0.80 ±0.01 m** pin. The full level check passes with zero failures. No pending Pier failure remains.
The [second-stop report](rider-coach-r2b-second-stop.md) preserves the original failures and controls.

## Final rebase and Pier acceptance

R2b.1's planned coach row now measures `consistBounds(consistOf({line: 1, wagon: true, steel: true}))`.
The real tail is **16.10 m**, so its **0.80 m** pin is unchanged. The shared-reservation row changes its pin
**4.20 → 0.80 m** because the reservation now includes the coach. Every other R2b.1 minimum and pin is kept:
planks **707.2–709.6 m**, ramp **9.4 m** station interval, **9.369222 m** horizontal run, **0.67 m** rise,
**9.393147 m** slope length, **4.090301°** (maximum **15°**); Q7 frame/feeder **1.310301 m** and every personal
box at least **1.476609 m**, minimum **0.60 m**. The 512-state rack/shelf exclusion still passes.
[All Pier rows, sources and pins](rider-coach-r2b/finish/margins.md#pier-r2b1-rows-with-the-production-consist).

Rebase conflicts were in generated halt/rail-map data and the plan's as-built notes. Regeneration combines
main's crossing/ramp with the reviewed coach Home/Ring/end-block values. Against reviewed `54a995c7a`, the
prefab golden has **79 numeric leaf changes**, all Pier ramp/plank transforms or walking-path coordinates;
[exact changed paths](rider-coach-r2b/final/prefab-deltas.json). **No simulation stage golden changed in this
resume.** All 53 seeds and 1,200-tick continuations pass their reviewed pins. The initial dormant Home position
remains the previously explained cause, not a new rebase delta. #1984's split runner, 480 s per-file deadline
and drift reporting are retained unchanged; none of this branch's tested files draws a drift warning.

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
`dev/look/rider-coach-proof.ts` is the reproducible harness. Clips are **local-only**; committed evidence is the inspected stills and motion sheets. Originals remain
under `.look/rider-coach-r2b/finish/{home,pier,curve,gorge,gorge-first}/*-realtime.webm`. Compressed copies
are retained under `.look/rider-coach-r2b/local-clips/` (1200×800, original frame timing, no speed-up).
Exact local paths: `finish/home/home-realtime.webm`, `finish/pier/pier-realtime.webm` (refreshed after rebase),
`finish/curve/curve-realtime.webm`, `finish/gorge/gorge-realtime.webm`, and
`finish/gorge-first/gorge-realtime.webm` (wide); all prefixed `.look/rider-coach-r2b/`.
The count matrix above stages cosmetic visibility; these recordings do not. The Pier capture is refreshed
after R2b.1; the other recordings and count/Home stills retain their reviewed `54a995c7a` capture provenance.
The rebase changes no train geometry, rider seating, Home camera or Gorge crossover pose.

| Clip / stills | What it shows |
| --- | --- |
| Home boarding (clip local-only), [sheet](rider-coach-r2b/finish/home/home-motion.png) | Two aboard on arrival; three while standing, then three depart. The new near-side rider appears in a separate opening; no walk across open ground. |
| Pier boarding (clip local-only), [sheet](rider-coach-r2b/finish/pier/pier-motion.png), [standing](rider-coach-r2b/finish/pier/pier-standing-still.png), [departing](rider-coach-r2b/finish/pier/pier-departing-still.png) | Three arrive, four while standing; the purple near-side rider fills the second opening. The clearer opposite-side camera avoids the first attempt's canopy post. |
| Home curve departure (clip local-only), [sheet](rider-coach-r2b/finish/curve/curve-motion.png) | Actual long boiler, players, coach, kit, wagon and steel car arrive, stand and leave around Home's curve. Wide composition; not a rider-count view. |
| Gorge north platform (clip local-only), [sheet](rider-coach-r2b/finish/gorge/gorge-motion.png), [standing](rider-coach-r2b/finish/gorge/gorge-standing-still.png), [departing](rider-coach-r2b/finish/gorge/gorge-departing-still.png) | Fixed camera toward Home; actual long wagon train arrives and backs out. The engine partly occludes the rear cars, so the wide clip complements this requested view. |
| Gorge wide turn (clip local-only), [sheet](rider-coach-r2b/finish/gorge-wide/gorge-motion.png) | All six car bodies remain straight while standing and turning; they cross to the homeward track only after departing. |
| [Ring Island standing](rider-coach-r2b/finish/ring/ring-standing-still.png), [departing](rider-coach-r2b/finish/ring/ring-departing-still.png) | Opposite the loader canopy: the full six-car train, with both passenger cars alongside the platform and freight in its retained loading positions. |
| [Two-train queue](rider-coach-r2b/finish/queue/queue-still.png), [two-frame sheet](rider-coach-r2b/finish/queue/queue-motion.png), [staging data](rider-coach-r2b/finish/queue/staging.json) | Two complete six-car production body sets at s 84.90 / 57.50 on the homeward track, visibly separate at the tight bend. The foreground pair is staged; other live trains are background. |
| [Garage Cars tile](rider-coach-r2b/finish/garage/rider-coach-garage-still.png) | Real garage interaction, “4 seats, 8 riders”; engine and players' car in the works copy, no coach. |

Home proof: first observed arrival tick 4570, count 2→3 at 4577, departure 4620. Refreshed Pier proof:
first observed standing tick 5172, count 3→4 at 5177, departure 5222. These are polling observations, not new simulation pins. The count does not change during the recorded RUN phases. These are
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

### Controller witness after the Pier rebase

Reproducer: `node --import ./dev/sim/hooks.ts dev/look/rider-coach-roof.ts`. Accepted `boiler-long` save plus
accepted `rail.jump`, actual six-car train observed standing at Home; only the disposable server child is
paused. The client runs the production player controller and Rapier at fixed 60 Hz. Initial takeoff positions
are staged; every climb/exit uses held movement and jump inputs, with no mid-jump teleport, velocity patch or
contact grant. These are **stepped controller sheets**, not additional real-time clips.

| Start / action | Controller result | Evidence |
| --- | --- | --- |
| Platform edge, feet 19.0199 m | Lands and remains on `railway:train2-2`, feet **20.3495 m**, target roof 20.3500 | [Start](rider-coach-r2b/final/roof-controller/platform-start-still.png), [sheet](rider-coach-r2b/final/roof-controller/platform-climb-filmstrip.png), [landing](rider-coach-r2b/final/roof-controller/platform-roof-still.png) |
| Players' bench/rail location | Decorative bench/rail has no collider; settles to real deck at **18.9992 m**, then lands on roof at **20.3495 m** | [Start](rider-coach-r2b/final/roof-controller/bench-start-still.png), [sheet](rider-coach-r2b/final/roof-controller/bench-climb-filmstrip.png), [landing](rider-coach-r2b/final/roof-controller/bench-roof-still.png) |
| Kit load, feet **19.8191 m** | Lands and remains on roof at **20.3495 m** | [Start](rider-coach-r2b/final/roof-controller/load-start-still.png), [sheet](rider-coach-r2b/final/roof-controller/load-climb-filmstrip.png), [landing](rider-coach-r2b/final/roof-controller/load-roof-still.png) |
| Coach roof → visible Home canopy (top **23.9200 m**) | Returns to the ordinary platform, feet **19.0199 m**; no new landing/route | [Sheet](rider-coach-r2b/final/roof-controller/roof-to-canopy-filmstrip.png) |
| Existing cab roof (**21.5945 m**, 3.295 above rail) → same canopy | Also returns to the platform; the visible canopy has no walkable roof collider | [Start](rider-coach-r2b/final/roof-controller/cab-control-start-still.png), [sheet](rider-coach-r2b/final/roof-controller/cab-to-canopy-filmstrip.png) |

All twelve new PNGs opened; actual roof contacts agree with the pictures. [Full controller trace and health](rider-coach-r2b/final/roof-controller/results.json): WebGPU, advancing frames, no errors.
The platform approach's second press occurs after contact with the roof and can relaunch the player; its high
peak is **not** a single free-flight jump-height measurement. No newly reachable route was found. The three
controller starts and canopy comparison are at Home; the every-halt result above remains the explicitly
limited 48-pose geometry scan, not an unperformed controller run at every halt.

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

## Checks on the rebased tree

Unless labeled earlier evidence, these results are refreshed after main's Pier integration. T2, world-inputs,
town-buy and the earlier visual/performance proofs retain their reviewed pre-rebase provenance; the rebase
changes no shared rule, train pose, rider view, or player controller. The Pier boarding capture and controller
roof evidence are refreshed on the rebased tree.

| Check | Result |
| --- | --- |
| `npm run loop -- run` | PASS through Gorge. Order and bills unchanged; route totals 3:15 / 2:58 / 2:54 / 2:57 for 1–4 players. [Log](rider-coach-r2b/final/loop.log). |
| `npm run checkpoints` (all 53 named stages) | PASS: 28 defaults plus 25 additional stages, all **53 canonical stages** through the host save path. [Default log](rider-coach-r2b/final/checkpoints.log), [additional log](rider-coach-r2b/final/checkpoints-additional.log), [coverage](rider-coach-r2b/final/checkpoint-coverage.json). |
| Two-player T2, warp 3 (earlier reviewed evidence) | PASS: both end T2 at tick 2183; hashes agree at 235 server steps. Under load, max clock deficits 5.185/4.516 s; not timing/feel evidence. [Report](rider-coach-r2b/finish/t2/report.txt), [both-player verdict](rider-coach-r2b/finish/t2/verdict.json). |
| `world-inputs`, `town-buy` (earlier reviewed evidence) | PASS both scenarios; no graphics errors. [Log](rider-coach-r2b/finish/scenarios.log). Buyer/partner stills and reload sheet opened. |
| `npm run test:net` | PASS **208/208**, including reload/restart and stop-request mirrors. [Log](rider-coach-r2b/final/net.log). |
| Golden shards | PASS **118/118**; all 53 stages and 1,200-tick continuations keep reviewed pins. [Log](rider-coach-r2b/final/goldens.log). |
| Controller roof probe | PASS three roof landings, two canopy exit comparisons, no new route found; stepped evidence and scope above. |
| `npm --prefix server test` | PASS **408/408**. [Log](rider-coach-r2b/final/server.log). |
| Full unit portion of `npm run check` | PASS **2312**, skipped 65, todo 1, failed 0 (2378 tests). No drift warnings. The combined command then failed registry on the missing eval header; registry passes after repair. [Full command log](rider-coach-r2b/final/check.log), [fixed registry](rider-coach-r2b/final/registry.log). |
| Explicit old-save shape/cap bounds | PASS 3/3 after adding the immediate v56 standing-shape regression. [Log](rider-coach-r2b/finish/load-shape-fixed.log). |
| `npm run level-check` | PASS in full: zero failures, zero stale generated pages; 61 audit rows, 35 platform poses, production Pier and Home rows. [Numeric report](rider-coach-r2b/finish/level-check.json). |
| Typecheck / lint / prefab build / assets | PASS; lint zero problems. [Types](rider-coach-r2b/final/types.log), [lint](rider-coach-r2b/final/lint.log), [prefabs](rider-coach-r2b/final/prefabs.log), [assets](rider-coach-r2b/final/assets.log). |
| `git diff --check` | Source/doc edits clean; raw test transcripts retain their original trailing spaces and final blank lines. [Full whitespace diagnostics](rider-coach-r2b/finish/raw-log-whitespace.log). |
| `node dev/ship-check.ts` | PASS: registry, 73 lint files, typecheck, prefab check, 212 affected test files; **1872** tests passed, 65 skipped, one todo, **zero failed**. [Log](rider-coach-r2b/final/ship-check.log). |
| `npm run build` | PASS. [Log](rider-coach-r2b/final/build.log). |
| `npm run perf` and v56 control (earlier reviewed evidence) | PASS WebGPU/no errors. Entry counts 398 draws and 649812 triangles both; geometry 830→823, programs 201→207, shadow-call sample 86→184. Separate moving startup frames and shared-machine load make shadow/timing differences non-comparable; this is not a coach-visible cost or performance-regression claim. [Current](rider-coach-r2b/finish/perf.log), [v56](rider-coach-r2b/finish/perf-baseline.log). |

There are **no pending R2b.1 failures**. Earlier product/assertion failures and their full expected/actual
output remain in [earlier-failures.log](rider-coach-r2b/finish/earlier-failures.log) and the second-stop report;
those are historical, not current failures. This resume's initial probe failures are preserved in full in
[harness-failures.log](rider-coach-r2b/final/harness-failures.log): missing accepted air-jump unlock,
querying before nearby collisions mounted, and attempting clock speed zero (unsupported, so the train
had left Home). The final harness accepts the unlock and waits for a real Home arrival, then pauses only
its disposable server child while stepping the client's controller/physics. Four initial probe TypeScript
errors were repaired by using the harness's `WarpHandle` type. No gameplay rule or threshold changed. The full unit run passed before registry rejected the new eval's
missing command header; the header was added and registry rerun. A checkpoint-list extraction mistakenly
passed three comment fragments as stage names; those three unknown-name failures and the corrected clean
run are retained, rather than being treated as game failures.

Independent review is not claimed. No R1c, R3, R4, west Stack platforms, boarding walk or final art was built.
Raw videos are local-only; the portable evidence is about **50 MiB**, including 50 inspected PNGs. All report-linked stills, sheets and small logs are tracked under
`docs/research/rider-coach-r2b/`. The count and approved-camera tables above list every requested still;
the real-time evidence table lists every requested motion sheet and its visibility limits.

Placeholder string: **“The knifeboard car seats ${playerSeats} players; the riders' coach behind it seats
${TRADE.riderPlaces}.”** Existing Cars title/labels still interpolate data; boiler readouts change numbers
only. The Boogler's copy is untouched; no suspect line found.
