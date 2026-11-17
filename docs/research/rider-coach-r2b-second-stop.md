# R2b: second stop — Gorge crossover and Pier foot crossing

> **Status:** superseded (reconciled 17 November 2026). **Verdict:** This was an incomplete, blocked intermediate build.
> **Recommendation:** Use [R2b](rider-coach-r2b.md) and its [review fixes](rider-coach-r2b-review-fixes.md), subsequently shipped in #1992; do not revive this stopped build.

16 November 2026. Branch `t3/rider-coach-blockout`, resumed from `e875dee20`; fetch/rebase onto
`origin/main` (`945c69554`, including #1981–#1983) succeeded. **Incomplete; do not merge.**
No push, ship, subagents, R1c, R3 or R4. World **v57** remains its own commit `c9781e298`.

## New blocking measurement

High Gorge's existing fourth-car regression requires the full train's reserved tail to stand **0.30 m beyond
its crossover**. The coach violates it. No pin or minimum was changed to accept this.

| Measurement (metres along line 2) | v56 control | Production coach |
| --- | ---: | ---: |
| Stop | 3230.40 | 3230.40 |
| Crossover | 3195.40–3217.40 | 3195.40–3217.40 |
| Tail reach | 12.70 | 16.10 |
| Reserved tail | 3217.70 | 3214.30 |
| Reserved clearance, minimum +0.30 | +0.30 | **−3.10** |
| Rear body vs end plane, outward | +0.2959 | **−3.1010** |
| Rear body vs end plane, homeward | +0.2923 | **−3.1749** |
| Rear buffers vs end plane, homeward | +0.0923 | **−3.3744** |

The reserved minimum and the drawn-body end-plane projection are different measurements. Both show that the
new tail stands across the crossover; this is independent of the positive passenger-platform margins.
The diagnostic observes an actual accepted terminal arrival (slot 4, tick 17943; v56 tick 17979), then
**independently poses the longest allowed production consist** at that stop using the view's axle/chord and
buffer-spacing functions. The arriving slot itself is a shorter train; this is not a live WS-train screenshot.
Production measurements (local-only: `rider-coach-r2b/resumed/gorge-production.json`),
v56 measurements (local-only: `rider-coach-r2b/resumed/gorge-v56.json`),
[reproduction](../../dev/level/rider-coach-gorge.ts),
[v56 source-loader control](../../dev/level/rider-coach-v56.ts).

Smallest alternative to assess: move the entire 22 m crossover **3.40 m toward Home**, to s **3192.00–3214.00**,
leaving the stop, platform and coach dimensions fixed. This restores the *reserved* +0.30 m; it does not certify
the real body, running path, signals, structures or approach. **Proposed, not built.** R2b stopped under
the owner's explicit margin rule. `dev/level/rider-coach.ts` now integrates this failure into level-check.

### A second failure in the completed level-check: Pier west foot crossing

The existing row requires **0.60 m** between the stopped full train's tail and the crossing's far edge.
Stop **s 726.50**, crossing **s 710.60–713.00** (centre 711.80, width 2.40) are unchanged. The old 12.70 m
extent puts the tail at **713.80**, clearance **+0.80 m**; R2b's 16.10 m puts it at **710.40**, clearance
**−2.60 m**, **3.20 m below the minimum**. The 2.40 m crossing lies within the full train's rear span.
This is the existing level row's along-track measurement, not a new live collision witness.

Full failure: **`FAIL  crossing clears the full stopped train by -2.6 m`**.
Unabridged level-check (local-only: `rider-coach-r2b/resumed/level-check.log`),
[existing test](../../dev/level/ring.ts), [crossing geometry](../../src/place/layout.ts).
Permitting cargo-car overhang beyond the passenger deck does not waive this foot-crossing minimum.
Smallest geometric alternative: move the crossing **at least 3.20 m toward Home**, reconnecting the ramp
approach; **3.40 m restores the former 0.80 m**. Do not move the Pier stop toward its parked layer.
This alternative needs ground, ramp, furniture and real-body checks. **Proposed only; not built.**

## Stack control and rider service

The same accepted `rail.call`, halt **8**, direction **−1**, on v56 stops slot 4 at tick **18347** on lateral
**−4 m**, origin 0. Players' car nearest edge **−2.90 m**, only deck inner edge **+1.80 m**: **4.70 m** across
the outward track. v56 control (local-only: `rider-coach-r2b/resumed/v56-control.json`). The coach inherits a **5.00 m** gap.
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

## Work preserved and re-pins

- Cached production consists carry a rider role directly behind players on `lineRoute(line) >= 0`. Timber
  has none. The garage works copy uses a route-free consist. Coach: **2.90 × 1.60 × 2.05 m**, timber and iron,
  five posts/four windows per side, two merged body/frame meshes, solid envelope collider. Eight seats fill
  alternating sides; V1 standing places are removed from the players' car.
- `TRADE.riderPlaces = 8`, boiler readouts **4/4/5**, Cars counts remain data-driven. Home **21.65 m**, Ring
  **+3.40 m**, rear extent **16.10 m**, spacing buffer capacity six vehicles. `WAGON_S` remains **10.85 m**.
  `legStartS` distinguishes Ring's moved service mark from the unchanged construction origin.
- Home pins now use the real asymmetric long engine and production axle poses, replacing the planned
  symmetric envelope. Engine/island **0.579440 → 0.607466 m**; engine/lever **1.134159 → 1.160978 m**.
  No minima changed. Tail/spur **0.050000**, players' far deck end **0.453286**; the standing set's minimum
  island clearance **0.550049** also holds. All changed pins and their reason are in
  home-pin-deltas.json (local-only: `rider-coach-r2b/resumed/home-pin-deltas.json`). The Home level row passes.
- The integrated coach row now tests lateral track adjacency and longitudinal containment, naming the three
  known platform gaps. It fails High Gorge's tail/crossover minimum. Terminal variants and timber-only halt
  coverage were not finished before this second stop.
- Existing role/count/layout tests were updated; cached-layout and production-clearance tests pass in the
  focused runs. Other stale stop, cycle, headway and catalogue expectations remain red; not all readers are fixed.

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
Fare/test pass (local-only: `rider-coach-r2b/resumed/trade-current.log`),
old-cap expected failure in full (local-only: `rider-coach-r2b/resumed/crowded-v56.log`),
arrival/boarding trace (local-only: `rider-coach-r2b/resumed/fare-events.log`).
Economy prototype and trade pages were regenerated from data.

### Golden causes

All **53** stage hashes and their 1,200-tick continuations match the old v56 fixture exactly when cap,
Home/Ring marks and extent are restored in memory. No stage differs for another rule change.
Controls, exact changed-stage lists (local-only: `rider-coach-r2b/causal-stages.json`),
old-value result (local-only: `rider-coach-r2b/resumed/golden-baseline.json`),
production result (local-only: `rider-coach-r2b/resumed/golden-current.json`),
[control loader](../../dev/level/rider-coach-control.ts).

- **Cap alone:** `yard-ready`, `yard-built`, `yard-wagon`, `yard-deck`; `house-built` changes only its continuation.
- **Home alone:** all 53 stage/continuation hashes. Even `awake` contains the initially dormant train's moved
  `from`/`dest`. Tick changes start at `fares-running`; the complete list is in the JSON.
- **Ring alone:** `steel-kit`, `steel-lit`, `steel-home`, `boiler-long`, `gorge-open`, `gorge-mid`, `gorge-reached`;
  `ring-joined` changes only its continuation.
- **Tail alone:** the listed Works/yard/bridge/steel/Gorge stages and Q6/Works continuations change through block
  holds. The JSON separates seed tick, stage hash and continuation changes; it is the exhaustive list.

Re-pinned `railway-golden`, operations, M12, tick-order and tick-order-heads fixtures, plus prefab halt/request
fixtures. Restored-v56 operations/tick-order/M12/host tests: **62 pass**. Current recording run: **63 pass**.
The host trace still has **8,600 rows**. Its only changes are v57 namespace, dormant train `from`/`dest`
1825→2165, derived hashes/checksums and encoded snapshot byte counts; **zero other fields changed**.
Host trace delta classification (local-only: `rider-coach-r2b/resumed/host-trace-deltas.json`).
The final selected unit run verifies the re-pinned rule goldens; the full gate and remaining source-reader repairs stay red.

## Re-measured halt margins

Metres, rear/front whole-body margins; lateral column is nearest body-to-platform gap (player/coach).
The lateral check also verifies that the car is on the platform's stopping side. These are the completed
rows, not a claim of complete terminal-state coverage. Quarry homeward retains its explicitly allowed
old **−1.62 m** player overhang. Missing west stops are named above, not falsely marked beside the east deck.
Full numeric output (local-only: `rider-coach-r2b/resumed/fit.json`).

| Halt | Players R/F | Coach R/F | Lateral P/R |
| --- | ---: | ---: | ---: |
| Village, line 2 | 14.3467 / 0.4533 | 10.9467 / 4.1533 | 0.5501 / 0.8501 |
| Quarry | 6.2975 / 10.2728 | 3.0165 / 14.0715 | 0.5937 / 1.2713 |
| Far Head | 9.3984 / 9.3984 | 5.9942 / 13.0941 | 0.5497 / 0.8590 |
| Pier terminal | 5.8993 / 12.8993 | 2.4989 / 16.5989 | 0.5502 / 0.8527 |
| Quarry, up | 18.8097 / -1.6194 | 15.5067 / 2.0204 | 0.8127 / 0.9258 |
| Far Head, up | 9.4024 / 9.3944 | 5.9986 / 13.0897 | 0.5956 / 0.8696 |
| Pier, up | 5.9018 / 12.8969 | 2.5014 / 16.5964 | 0.5979 / 0.8932 |
| Railhead 1 terminal | 13.4008 / 8.3981 | 9.9996 / 12.0999 | 0.6996 / 0.9989 |
| Railhead 2 terminal | 13.3981 / 8.4071 | 9.9973 / 12.1084 | 0.6988 / 0.9996 |
| Railhead 3 terminal | 13.3908 / 8.4069 | 9.9996 / 12.0985 | 0.6996 / 0.9996 |
| Railhead 4 terminal | 13.4048 / 8.3844 | 10.0039 / 12.0859 | 0.6996 / 0.9996 |
| Railhead 5 terminal | 13.3982 / 8.4068 | 9.9972 / 12.1084 | 0.6996 / 0.9996 |
| Railhead 6 terminal | 13.3909 / 8.3981 | 9.9897 / 12.0999 | 0.6996 / 0.9989 |
| Railhead 7 terminal | 13.4028 / 8.4023 | 10.0072 / 12.0985 | 0.6992 / 0.9996 |
| Railhead 8 terminal | 13.4008 / 8.3971 | 9.9996 / 12.0987 | 0.6996 / 0.9996 |
| Joint homeward | 13.4090 / 8.3884 | 10.0077 / 12.0901 | 0.6996 / 0.9996 |
| Ring Island outward | 21.7950 / 15.0044 | 18.3940 / 18.7056 | 0.7026 / 0.9967 |
| Stack head 1 outward | 13.3721 / 8.3756 | 9.9797 / 12.0771 | 0.6976 / 0.9989 |
| Stack head 2 outward | 13.3967 / 8.3998 | 10.0012 / 12.0985 | 0.7018 / 0.9996 |
| Stack head 3 outward | 13.3962 / 8.3974 | 9.9973 / 12.0973 | 0.6996 / 0.9998 |
| High Gorge outward | 28.3200 / 8.4398 | 24.9674 / 12.1313 | 0.7041 / 0.9969 |
| Ring Island homeward | 21.7998 / 15.0002 | 18.4048 / 18.6952 | 0.6952 / 1.0017 |
| High Gorge homeward | 28.3200 / 8.4398 | 24.9664 / 12.1323 | 0.7041 / 0.9969 |

Home's dedicated row supplies its margins above. Queue calculation: two longest consists, spacing **27.40 m**,
minimum body gap **0.929561 m** at leading s **85.00**, sampled every **0.25 m**, minimum **0.50 m**.
A staged running-game queue is **not done**. Home measurements (local-only: `rider-coach-r2b/resumed/home.json`).

## Inspected stills; clips and roof unfinished

Image gallery (local-only: `rider-coach-r2b/resumed/gallery.html`). All **18 delivered PNGs** were opened personally.
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
| 8 | PNG (local-only: `rider-coach-r2b/resumed/counts/8/c0-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/8/c1-v0.jpg) | PNG (local-only: `rider-coach-r2b/resumed/counts/8/c2-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/8/c3-v0.jpg) |
| 3 | PNG (local-only: `rider-coach-r2b/resumed/counts/3/c0-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/3/c1-v0.jpg) | PNG (local-only: `rider-coach-r2b/resumed/counts/3/c2-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/3/c3-v0.jpg) |
| 0 | PNG (local-only: `rider-coach-r2b/resumed/counts/0/c0-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/0/c1-v0.jpg) | PNG (local-only: `rider-coach-r2b/resumed/counts/0/c2-v0.png`) | [PNG](rider-coach-r2b/resumed/counts/0/c3-v0.jpg) |

Home approved cameras: [square](rider-coach-r2b/resumed/home/c0-v0.jpg), [island](rider-coach-r2b/resumed/home/c1-v0.jpg), [table](rider-coach-r2b/resumed/home/c2-v0.jpg), [top](rider-coach-r2b/resumed/home/c3-v0.jpg), players (local-only: `rider-coach-r2b/resumed/home/c4-v0.png`), coach (local-only: `rider-coach-r2b/resumed/home/c5-v0.png`).

Capture health: WebGPU, positive completed-frame counts, no page/console/graphics errors in final captures.
Initial count attempts rendered empty because frozen-camera captures had not recullled folk; those were
rejected. Final capture explicitly refreshes cosmetic culling after each camera change, with zero rule-time
advance. These are stills, **not a performance or motion certificate**. Logs of failed harness attempts are
retained alongside the successful capture logs.

**No real-time clips delivered.** Home/Pier boarding and Home curve departure remain undone. R2b retains
count-driven visibility; no walk is built under the revised brief, but stand-only visual transitions still
need their real-time proof. The fold-down step and walk remain R3.

**Roof reach remains unmeasured at every halt.** The solid coach envelope ends at 2.05 m; source collider
construction forbids entering it. No jump/controller route proof is claimed. The old 1.75 m boiler constant
is not sufficient as baseline: current engine exports include a 2.50 m boiler top and 3.295 m cab roof;
the actual standable surfaces must be checked before claiming whether the coach opens a route.

## Independent-review findings at the stop

| Review point | Finding / limit |
| --- | --- |
| Prediction against server with new extent | Shared catalogue path is retained. Required T2/world-input comparison not run; not certified. |
| Riders across save/reload/restart/late join | New eight-rider trip conserves riders and stays hash-identical to a saved/reloaded copy. Restart/late-join at cap eight and the full server suite are not done. |
| Every extent, stop and role reader | Partial. Live kit/footing/steel targets use roles; Ring service/construction origin separated. High Gorge crossover and Pier foot crossing are real missed constraints. Remaining dev/prototype and old timing/stop fixtures need audit. |
| Garage works copy | Source selects route-free consist, excluding coach. Dedicated live garage proof not done. |
| Lockstep | No new rule randomness or floating-point math. All old stage hashes restored by causal controls; replay baselines pass. Full gate remains red. |
| Goldens and v56-shaped expectations | Re-pinned only after controls above. Old stop/cycle/headway expectations still survive outside those fixture files and fail openly. |
| New-car per-frame allocations | Layout/seat arrays and merged geometry created once; source inspection finds no new per-frame mesh/array allocation. Cached-layout test passes; allocation/perf measurement not done. |

## Checks and unfinished work

- Setup fetch/rebase: pass, unchanged `origin/main` base; Node **26.13.0**, real local dependencies.
- v56 accepted Stack-call control: pass; existing player-side gap confirmed, `railwayCheck` passes.
- Causal seed controls: **53/53 exact baseline matches**; per-knob files retained.
- Baseline operations/tick-order/M12/host trace: **62 pass, 0 fail**;
  full output (local-only: `rider-coach-r2b/resumed/trace-baseline.log`).
- Current trace/prefab recording: **63 pass, 0 fail**;
  full output (local-only: `rider-coach-r2b/resumed/record-traces.log`).
- Focused boarding/crowded-fare/payoff tests: **3 pass, 0 fail**.
- Old-cap crowded-fare negative control: **expected fail `36 !== 72`**, full failure linked above.
- Focused layout/cache/garage/Home tests: **22 pass, 1 fail** (old fitted Cars count); expectation corrected
  afterwards, final gate below is authoritative. Unabridged output (local-only: `rider-coach-r2b/resumed/layout-unit.log`).
- Focused geometry/route/trains tests: **133 pass, 13 fail**. One is the real Gorge minimum; others are old
  stop, signal, cycle and physical-origin/service-mark expectations. None suppressed.
  Every failure in full (local-only: `rider-coach-r2b/resumed/geometry-tests.log`).
- `npm run level-check`: **exit 1**, 19 reports; Home row passes, coach row fails:
  **`High Gorge: tail/crossover -3.1 m, minimum 0.3 m`**. The Ring/Pier report also fails
  **`FAIL  crossing clears the full stopped train by -2.6 m`** (minimum 0.60 m).
  Full output (local-only: `rider-coach-r2b/resumed/level-check.log`).
- An exploratory Gorge probe requiring an arriving wagon/long-boiler slot timed out after 5,000 ticks in
  both worlds. Both failures in full (local-only: `rider-coach-r2b/resumed/gorge-longest-slot-attempt.txt`).
  The delivered probe therefore explicitly separates the accepted shorter train's terminal coordinate
  from the longest-consist geometric measurement; it does not claim that live WS arrival was observed.
- Final count captures and Home approved-camera captures: pass as stills, all opened, limits above.
- Formatting/lint initial run: five unused imports after fixture changes; removed. Full initial diagnostic
  retained in format-lint.log (local-only: `rider-coach-r2b/resumed/format-lint.log`).
- Earlier stop's full failing ship-check outputs remain early (local-only: `rider-coach-r2b/early-ship-check.txt`) and
  first-stop final (local-only: `rider-coach-r2b/final-ship-check.txt`). They are historical, not this head's result.

Final validation command: **`node dev/ship-check.ts` — exit 1**. Registry, changed-file lint (zero problems),
TypeScript and prefab freshness pass. **1,931 tests: 1,843 pass, 22 fail, 65 skipped, one todo**; test runtime
80.29 seconds. Re-pinned rule-golden tests pass; outstanding failures include the real Gorge minimum,
old stop/cycle/headway fixtures, rail-map freshness, sim re-export census and a prefab seat fixture.
Complete output, all 22 failures quoted unabridged (local-only: `rider-coach-r2b/resumed/final-ship-check.log`).
No failures were suppressed. Report/evidence bookkeeping and the requested local commit follow this last
validation command; no further implementation changes follow it.

Stopped/uncompleted: remaining terminal/timber halt rows; controller boarding at Stack; queued-train live
staging; every roof reach; three requested real-time clips; loop run; moved-stage visual checkpoints;
T2; world-inputs; town-buy; full server tests; perf; final reader audit; owning game-design updates;
independent review; green final gate. R2b remains **unchecked**, with the second-stop as-built-progress note.
No playtest, review, successful ship or completed R2b is claimed.

Only new player-facing placeholder (design review): **“The knifeboard car seats 4 players; the riders' coach
behind it seats 8.”** Counts come from data. The Boogler's other copy is preserved; no other suspect line found.
