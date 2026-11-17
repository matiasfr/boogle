# R2b stopped at the served-halt fit proof

16 November 2026. Branch `t3/rider-coach-blockout`, based on `945c69554` (#1983, including #1981/#1982).
**Incomplete, not ready to merge.** Work stopped under the implementation brief's explicit fit rule.
No push or ship; no subagents. R1c, R3 and R4 were not built.

## Blocking measurement and smallest alternative

The fit study says Stack halt's passenger cars are beside its platform. The production layout has only an
east platform, while an accepted homeward request stops on the west track. The coach is across the outward
track from the deck. Longitudinal containment alone had hidden this problem.

- Reproduction: `node --import ./test/helpers/rail-no-audit.ts dev/level/rider-coach-stop.ts`.
- Isolated `gorge-reached` world, accepted `rail.call`, halt 8, direction −1. At tick 18311, train slot 4 is
  stopped there with `track: 1`, `origin: 0`, two riders. `railwayCheck` passes for that state.
- Stop s **2710.30 m**. Track lateral **−4.00 m**, coach half-width **0.80 m**, near side **−3.20 m**.
  The only deck's inner edge is **+1.80 m**: **5.00 m lateral separation**, with the outward track between.
  This is a stop-coordinate lateral measurement, not a nearest-mesh-distance or boarding-trajectory test.
- [Accepted request and stopped row](rider-coach-r2b/stack-homeward.json), [diagnostic diagram](rider-coach-r2b/blocked-fit.html),
  [reproduction](../../dev/level/rider-coach-stop.ts),
  [platform construction](../../src/entities/route-greybox/leg-view.ts),
  [both-direction stop catalogue](../../src/sim/railway-lines.ts).
- Stack heads 1/2 have the same one-sided platform while retained after extension; those two calls were not
  separately replayed. Head 3 alone reproduces the blocking contradiction. The platform omission predates
  this diff; no separate v56 control was run.

Smallest alternative to assess: add a west platform at Stack halt, and at heads 1/2 while they remain served
homeward, analogous to the other paired platforms (candidate centre lateral −8.05 m, same 25 m length).
That needs approach/ramp, lever, furniture and route checks. It is **proposed, not implemented or approved**.
Moving the stop along the track or changing coach length cannot fix the missing side. Neither stop was moved
beyond the approved +3.40 m, and no clearance threshold was loosened.

## Partial implementation preserved

- Cached `consistOf` adds the rider role immediately behind players on `lineRoute(line) >= 0`; timber has none.
  Garage fitting copies use a route-free layout. Role-based kit, footing and steel targets follow the new offsets.
- Coach envelope 2.90 × 1.60 × 2.05 m, timber and iron blockout, five posts per side, four window openings,
  bench blocks, two merged body/frame meshes and the generic train's solid envelope collider.
- Eight anchors alternate sides at 0.60 m pitch; riders use the coach's seated pose, removing player-car standing
  anchors. **Boarding walks are unfinished**: the existing count-driven seated rider visibility still switches
  immediately. The brief's claim that a door walk already existed did not match this path.
- `TRADE.riderPlaces = 8`, boiler readouts 4/4/5, data-driven Cars counts. Home stop 21.65, Ring stop +3.40,
  tail 16.10 and spacing capacity six. `WAGON_S` stays 10.85.
- Added `legStartS` so Ring's shifted service stop does not also shift the physical construction origin or
  break the first rack's unloading-halt recognition.
- Home's planned layout now derives from the production consist and asymmetric long-engine chord pose.
  Existing pins are preserved and currently fail; no unexplained re-pinning was done.
- Draft `dev/level/rider-coach.ts` records provisional end-face margins and the sampled queue, including
  missing west-platform failures. It is **not integrated into level-check**, and does not certify all halts.

World **v57** is its own small commit, `c9781e298`. Its reasons name the cap, tail and both stop moves.
**No replay golden, host trace or economy page was regenerated.** Thus there is no completed claim about which
stages alone moved. The early check found stale stage/trace expectations throughout, including stages affected
by the initial dormant train's moved Home position. These require causal controls before re-pinning.

The q6 fare probe produced `[36.9, 54, 72.9, 72.9]` against the old `[36, 54, 72, 72]`. The plan's expected
third-added-house uplift needs reconciliation: one of that test's plots is now the timber yard and adds no
riders. No economy threshold or expectation was changed to conceal that difference.

## Geometry evidence and limits

[Provisional halt rows and queue](rider-coach-r2b/fit.json) give both passenger cars' rear/front margins and
whole-train margins. These are longitudinal projections, **not a pass for every served halt**. Ring end-face
projection still needs checking against the actual authored segments; timber-line Village/Camp were not
re-measured. Intermediate heads are relevant only while served. The provisional margins are:

| Halt / direction | Player rear / front (m) | Coach rear / front (m) |
| --- | ---: | ---: |
| Village, line 2 | 14.3467 / 0.4533 | 10.9467 / 4.1533 |
| Quarry | 6.2975 / 10.2728 | 3.0165 / 14.0715 |
| Far Head | 9.3984 / 9.3984 | 5.9942 / 13.0941 |
| Pier terminal | 5.8993 / 12.8993 | 2.4989 / 16.5989 |
| Quarry, up | 18.8097 / -1.6194 | 15.5067 / 2.0204 |
| Far Head, up | 9.4024 / 9.3944 | 5.9986 / 13.0897 |
| Pier, up | 5.9018 / 12.8969 | 2.5014 / 16.5964 |
| Railhead 1 | 13.4008 / 8.3981 | 9.9996 / 12.0999 |
| Railhead 2 | 13.3981 / 8.4071 | 9.9973 / 12.1084 |
| Railhead 3 | 13.3908 / 8.4069 | 9.9996 / 12.0985 |
| Railhead 4 | 13.4048 / 8.3844 | 10.0039 / 12.0859 |
| Railhead 5 | 13.3982 / 8.4068 | 9.9972 / 12.1084 |
| Railhead 6 | 13.3909 / 8.3981 | 9.9897 / 12.0999 |
| Railhead 7 | 13.4028 / 8.4023 | 10.0072 / 12.0985 |
| Railhead 8 | 13.4008 / 8.3971 | 9.9996 / 12.0987 |
| Joint homeward | 13.4090 / 8.3884 | 10.0077 / 12.0901 |
| Ring Island outward | 21.8011 / 15.1295 | 18.4004 / 18.8311 |
| Stack head 1 outward | 13.3721 / 8.3756 | 9.9797 / 12.0771 |
| Stack head 2 outward | 13.3967 / 8.3998 | 10.0012 / 12.0985 |
| Stack head 3 outward | 13.3962 / 8.3974 | 9.9973 / 12.0973 |
| High Gorge outward | 28.3200 / 8.4398 | 24.9674 / 12.1313 |
| Ring Island homeward | 21.7970 / 14.7422 | 18.4024 / 18.4374 |
| Stack head 1 homeward | 13.4399 / 8.4289 | 10.0474 / 12.1305 |
| Stack head 2 homeward | 13.3702 / 8.3833 | 9.9743 / 12.0824 |
| Stack head 3 homeward | 13.4048 / 8.4007 | 10.0059 / 12.1005 |
| High Gorge homeward | 28.1836 / 8.2447 | 24.8299 / 11.9372 |

[Home production measurements and every pin failure](rider-coach-r2b/home.json): no design minimum failed.
Tail clears the spur by **0.0500 m**, player deck far end **0.453286 m**, coach deck ends **10.946714 / 4.153286 m**.
Engine/island **0.607466 m** (minimum 0.55); engine/lever **1.160978 m** (minimum 1.00).
R1b's engine pins were **0.579440 / 1.134159 m**. The draft now uses the real asymmetric engine envelope and
its production axle pose, rather than shifting the chord sampling centre to symmetrise the long nose.
All 258 pin failures remain recorded, unresolved; passing minima do not make the Home row pass.

The sampled two-longest-train queue has minimum body separation **0.929561 m**, leading s **85.00 m**,
trailing 27.40 m behind, 0.25 m sample spacing, against 0.50 m minimum. This is a geometry calculation,
**not a staged running-game queue** or continuous collision proof.

## Visuals and roof reach

Only an initial close near-side count capture was made, before stopping. These local ignored `.look/` artifacts remain in this checkout; the capture predates the final geometry merge and is not final-head visual certification:

- [Still](../../.look/rider-coach-r2b/count-eight-near-close-still.png): actual coach, visually staged eight
  seated folk over an authoritative count of three. Opened personally. The player avatar and a hall post
  obstruct the count. **Rejected as proof; eight cannot be reliably counted.**
- [Motion contact sheet](../../.look/rider-coach-r2b/count-eight-near-close-motion.png): opened personally;
  same inadequate framing. [Capture log](../../.look/rider-coach-r2b/count-first.log) confirms WebGPU,
  completed frames at 60/s in its one-second sample, no page/console/graphics errors. This is not a perf result.
- No delivered clips. No completed both-side/game-zoom/close 8/3/0 matrix, approved-camera Home comparison,
  Pier/Ring/Works capture, real boarding clip or Home departure clip.

**Roof reach is unverified at every halt.** Envelope top is 2.05 m and the generic collider is solid, but no
held-jump/air-jump route check was completed. The brief's baseline also needs correcting before that comparison:
the current engine geometry exports boiler top 2.50 m and cab roof 3.295 m, whereas 1.75 is the legacy `LOCO`
constant. This observation alone does not prove roof reach safe or the current standable surfaces.

## Independent-review points

| Point | Finding at stop |
| --- | --- |
| Prediction versus server, new extent | Not certified. Both consume changed catalogue data; required multiplayer comparison unfinished. |
| Rider conservation and validity, save/reload/restart/late join | Not certified at cap eight. Isolated stopped world passes `railwayCheck`; lifecycle scenarios and host traces unfinished. |
| All extent/stop/role readers | Partial audit only. Kit targets follow roles; Ring construction/service distinction repaired. Many old layout fixtures and Home pins still fail. |
| Garage copy | Source uses route-free consist and excludes coach; live garage proof unfinished. |
| Lockstep | Shared cap/extent are catalogue values, no new random draw or floating rule arithmetic added. Replay/golden gate red; determinism not certified. |
| Goldens / surviving v56 expectations | Not updated. Old expectations knowingly remain; no claim that v56-shaped assumptions have all been removed. |
| New view allocations | Layouts, seats and merged geometry built once; frame pose uses existing scratch vectors/quaternions. No new per-frame mesh/array creation found by source inspection; allocation/perf measurement unfinished. |

## Checks and remaining work

- Setup: fetch/rebase onto origin/main passed; local `npm ci` under Node 26.13.0 passed. No dependency symlink.
  `npm run inflight` found no overlapping unmerged work.
- Registry routing map initially failed for missing dependency, then after install an invalid `sim` kind;
  `feature-fix` routing succeeded. Initial prefab attempts rejected a floating derived dimension and then
  unbatched greybox instances; the registered builder corrected those and `npm run prefabs` passed.
- Intermediate TypeScript check passed; `npm run checks-for` ran and printed the additional required gates.
- Initial `node dev/ship-check.ts`: **exit 1**, 1,910 tests, 1,625 pass, 219 fail, 65 skip, one todo.
  [Full unabridged output, including every assertion failure](rider-coach-r2b/early-ship-check.txt).
  Failures include stale consist/count/offset expectations, Home pins, missing builder in test stub registries,
  economy pages/vector, seed/trace goldens, route-origin expectations and timing/headway fixtures.
- Accepted Stack-stop reproduction passed, with `railwayCheck` passing and the measured failed adjacency above.
- Final `node dev/ship-check.ts`: **exit 1**. Registry, changed-file lint (zero problems), TypeScript and prefab freshness passed. **1,930 tests: 1,645 pass, 219 fail, 65 skip, one todo**, 79.49 seconds in the test runner. [Full unabridged final output, every failure quoted](rider-coach-r2b/final-ship-check.txt). No failure was suppressed. `git diff --check` passed. This was the last validation command; report/log bookkeeping and the requested local commit followed.

Not completed because of the fit stop: green level-check; integration of all-halt/queue diagnostics; final pins;
eight-board-one-waits regression; economy regeneration; goldens and causal stage accounting; loop run and moved
stage checkpoints; two-player T2; world-inputs; town-buy; server tests; perf; roof reach; boarding walks; complete
visual/clip matrix; final game-design trains/Home/town-riders documentation and garage/progression readout docs.
R2b remains unchecked with a stopped-work note. No owner playtest or independent review is claimed.

Only new player-facing placeholder, from the binding design review:
**“The knifeboard car seats 4 players; the riders' coach behind it seats 8.”** Counts are interpolated from data.
No other Boogler wording was edited; no additional suspect copy identified.
