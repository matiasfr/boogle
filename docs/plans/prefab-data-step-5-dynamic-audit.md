# Dynamic-import and ownership re-audit

> **History for the counts; the model is current.** The 92-export table is superseded by [rebase 4](prefab-data-step-5-rebase-4.md) (query-only calls no longer count) and the [precise audit](prefab-data-step-5-precise-audit.md) (selected members: `enterIsland` 84 to 3). The value model, exemption proof, OwnedView discovery and Limits sections remain current. Current contract: [lint-boundaries](../agents/lint-boundaries.md); current counts: `dev/lint/prefab-debt.json`.

This supersedes the fourth review’s negative proof. That analysis dropped real constructors after failing to bind Promise.all results. No runtime source or collider/seat recipe was changed. The two reported consumer fixtures failed first in `.look/prefab-dynamic/red.log`.

## Before and after: complete construction list

The list changes from 42 to 92 exports. Counts below are importing files, not objects. All existing raw capability module bans, file budgets and frozen surfaces remain binding. OwnedView-producing factories are discovered from resolved ownership calls and return annotations, so a non-debt wrapper owning colliders cannot silently stay outside this audit.

| Provider export | Before | After | Reason for change |
| --- | ---: | ---: | --- |
| src/adapters/mushrooms.ts#bounceOffCaps | 1 | 1 | Unchanged. |
| src/adapters/mushrooms.ts#createStall | 1 | 1 | Unchanged. |
| src/adapters/mushrooms.ts#listenForSprouts | unrecorded | 1 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/adapters/mushrooms.ts#spotsAhead | unrecorded | 0 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/adapters/mushrooms.ts#sprout | unrecorded | 1 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/boogler/boogler.ts#createBoogler | 1 | 1 | Unchanged. |
| src/boogler/play.ts#booglerTalk | unrecorded | 0 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/boogler/play.ts#loadTalk | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/boogler/play.ts#talkTargets | unrecorded | 1 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/boogler/play.ts#updateBooglerPlay | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/debug/perf-poses.ts#putPlayer | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/finds/secrets-view.ts#createSecretsView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/finds/view.ts#createFindsView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/lookout/view.ts#createLookoutView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/player/state.ts#enterIsland | unrecorded | 84 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/entities/railway/arrival.ts#createRailwayArrival | 1 | 1 | Unchanged. |
| src/entities/railway/boiler-install-view.ts#createBoilerInstall | 1 | 1 | Unchanged. |
| src/entities/railway/car.ts#makeCar | 13 | 13 | Unchanged. |
| src/entities/railway/car.ts#poseCarOnLine | unrecorded | 13 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/cart-view.ts#createRailwayCart | 1 | 1 | Unchanged. |
| src/entities/railway/crates-view.ts#createStationBoxes | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/crossing-view.ts#createRailwayCrossing | 1 | 1 | Unchanged. |
| src/entities/railway/footing-view.ts#createRailwayFootings | 1 | 1 | Unchanged. |
| src/entities/railway/forge-finish.ts#createForgeFinish | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/garage-view.ts#createGarageView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/glide.ts#createRailwayGlide | 1 | 1 | Unchanged. |
| src/entities/railway/greeter.ts#createTownGreeter | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/halts-view.ts#createRailwayHalts | 1 | 1 | Unchanged. |
| src/entities/railway/home-station-view.ts#createHomeStation | 1 | 1 | Unchanged. |
| src/entities/railway/hook-shot.ts#createRailwayHook | 1 | 1 | Unchanged. |
| src/entities/railway/hook-view.ts#createRailwayHookView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/line-cargo.ts#createLineCargo | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/line2-view.ts#createRailwayLine2 | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/opening-view.ts#createRailwayOpening | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/path.ts#approachPlanks | unrecorded | 0 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/path.ts#createRailwayPath | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/railhead-view.ts#createRailwayRailhead | 1 | 1 | Unchanged. |
| src/entities/railway/reward.ts#createRailwayReward | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/reward.ts#rewardSeat | unrecorded | 0 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/ring-deck.ts#createRingDeck | 1 | 1 | Unchanged. |
| src/entities/railway/roundhouse-view.ts#createRailwayRoundhouse | 1 | 1 | Unchanged. |
| src/entities/railway/seat.ts#registerSeat | unrecorded | 9 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/entities/railway/seat.ts#sitDown | unrecorded | 7 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/entities/railway/seat.ts#withSeatTargets | unrecorded | 7 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/entities/railway/shelf-view.ts#createRailwayShelf | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/entities/railway/sources.ts#createRailwaySources | 1 | 1 | Unchanged. |
| src/entities/railway/stations.ts#buildStation | 2 | 2 | Unchanged. |
| src/entities/railway/tools.ts#createRailwayTools | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/track-machine.ts#buildMachine | 12 | 12 | Unchanged. |
| src/entities/railway/track.ts#buildTrack | 12 | 12 | Unchanged. |
| src/entities/railway/train-load.ts#solidTrainLoad | 1 | 1 | Unchanged. |
| src/entities/railway/train-view.ts#createRailwayTrains | 1 | 1 | Unchanged. |
| src/entities/railway/trophy-plinth.ts#createTrophyPlinth | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/railway/view.ts#createRailwayView | 1 | 1 | Unchanged. |
| src/entities/railway/works-box-view.ts#drawWorksBoxes | 4 | 4 | Unchanged. |
| src/entities/railway/works-view.ts#createRailwayWorks | 1 | 1 | Unchanged. |
| src/entities/ring-island/view.ts#createRingIslandView | 1 | 1 | Unchanged. |
| src/entities/ring-steel/view.ts#createRingSteel | 1 | 1 | Unchanged. |
| src/entities/route-greybox/boxes.ts#drawGreyBoxes | 1 | 1 | Unchanged. |
| src/entities/route-greybox/leg-view.ts#createLegView | 1 | 1 | Unchanged. |
| src/entities/route-greybox/massing-bell.ts#bellExtras | 1 | 1 | Unchanged. |
| src/entities/route-greybox/massing.ts#gorgeMassing | 1 | 1 | Unchanged. |
| src/entities/town/curio-shelf.ts#createCurioShelf | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/town/museum.ts#createMuseum | 1 | 1 | Unchanged. |
| src/entities/town/rooms.ts#createRooms | 1 | 1 | Unchanged. |
| src/entities/town/view.ts#createTownView | unrecorded | 1 | Opaque dynamic-use propagation; both capabilities counted until simplified. Allocation is also reachable. |
| src/entities/town/workshop.ts#makeWorkshop | 1 | 1 | Unchanged. |
| src/fall/letters.ts#blastLetters | 1 | 1 | Unchanged. |
| src/physics/flight.ts#dropPoint | unrecorded | 2 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/physics/flight.ts#flyPath | unrecorded | 1 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/place/cove-stop.ts#holdCoveStop | 1 | 1 | Unchanged. |
| src/place/cove-view.ts#buildCove | 1 | 1 | Unchanged. |
| src/place/folk.ts#addGreeter | unrecorded | 6 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/place/folk.ts#addLooker | unrecorded | 6 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/place/folk.ts#addResident | unrecorded | 7 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |
| src/place/look-kit.ts#kitBatch | unrecorded | 8 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/look-kit.ts#kitLogs | unrecorded | 6 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/look-kit.ts#lookTrack | unrecorded | 6 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/look-kit.ts#machineLook | unrecorded | 6 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/look-kit.ts#stationKit | unrecorded | 6 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/look-kit.ts#trainLook | unrecorded | 5 | Opaque dynamic-use propagation; both capabilities counted until simplified. No allocation-free proof. |
| src/place/opening-models.ts#craneModel | 1 | 1 | Unchanged. |
| src/place/opening-models.ts#rackModel | 1 | 1 | Unchanged. |
| src/place/sites.ts#buildSites | unrecorded | 6 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/place/sites.ts#hullBodies | 6 | 6 | Unchanged. |
| src/place/sites.ts#snapSite | unrecorded | 7 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/place/sites.ts#updateSites | unrecorded | 6 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/pois/caves/decor.ts#buildDecor | 1 | 1 | Unchanged. |
| src/proto/crossing/world.ts#buildWorld | unrecorded | 1 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/proto/greybox/build.ts#buildGreybox | unrecorded | 2 | Allocation reached through newly resolved aggregate bindings/private debt calls. |
| src/render/place-tree-view.ts#createTreeSolids | 1 | 1 | Unchanged. |
| src/render/place-tree-view.ts#createTreeView | unrecorded | 1 | Capability-module API reached through private debt call/aggregate binding; module capability rule applies. |

## All 20 earlier removals

“Safe” means the analyzed debt-local call closure reaches neither createBody/seat registration nor an unresolved dynamic use. Query and ownership APIs remain free only while this proof holds. Unknown uses count as both capabilities; they are not a claim that a seat is visibly created.

| Earlier removal | Before | Now | Debt-local proof / reason |
| --- | --- | --- | --- |
| src/render/owned-view.ts#createOwnedView | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/player/camera-arm.ts#makeCameraArm | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/pose.ts#createPosePolicy | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/render/locomotion-surfaces.ts#stepSurfaceAt | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/guest/collision.ts#gatherSurfaces | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/guest/play.ts#startGuest | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/guest/play.ts#stopGuest | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/boogler/boogler.ts#booglerBodyStep | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/boogler/play.ts#checkStandingOnBoogler | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/boogler/play.ts#carryBooglerRider | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/entities/railway/car.ts#snapCar | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/debug/perf-poses.ts#putPlayer | Exempt | Counted | Opaque dynamic use is reachable; exemption cannot be justified, conservative until simplified. |
| src/place/sites.ts#housePlan | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/sites.ts#towerPlan | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/sites.ts#blockPlan | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/folk.ts#crewStart | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/folk.ts#updateFolk | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/place/look-kit.ts#installContact | Exempt | Exempt | No allocation endpoint or unresolved dynamic import in its debt-local call closure; ownership/query/movement only. |
| src/entities/finds/view.ts#createFindsView | Exempt | Counted | Collider/seat allocation is reachable; prior exemption was incorrect. |
| src/entities/lookout/view.ts#createLookoutView | Exempt | Counted | Collider/seat allocation is reachable; prior exemption was incorrect. |

## Every current OwnedView-producing factory

Inventory: resolved createOwnedView callers (including local callbacks), the ownership factory itself, and explicit OwnedView return annotations. The repository has eight files containing ownership creation. Both direct creation and the factories they call in debt files are analyzed, including private helpers; record-only instantiate remains an open door.

| Factory | Allocation reachable | Uncertain dynamic use | Result |
| --- | --- | --- | --- |
| src/entities/finds/view.ts#createFindsView | Yes | Yes | Counted construction export |
| src/entities/lookout/view.ts#createLookoutView | Yes | Yes | Counted construction export |
| src/entities/railway/view.ts#createRailwayView | Yes | Yes | Counted construction export |
| src/entities/ring-island-far/view.ts#createRingIslandFarView | No | No | Allocation-free ownership/visual factory; remains free |
| src/entities/route-greybox/index.ts:40 (local callback) | Yes | No | Non-exported construction callback; existing entry module lifecycle |
| src/entities/route-greybox/index.ts:52 (local callback) | Yes | No | Non-exported construction callback; existing entry module lifecycle |
| src/entities/town/view.ts#createTownView | Yes | Yes | Counted construction export |
| src/entities/town/workshop.ts#makeWorkshop | Yes | No | Counted construction export |
| src/render/owned-view.ts#createOwnedView | No | No | Allocation-free ownership/visual factory; remains free |

## Conservative files

Lint and registry print this exact list. Dynamic values escaping into opaque arguments, unknown projections/consumers, unconsumed imports, or analysis bounds force a construction result. Aggregate fields, await, Promise.all/allSettled, then callbacks and local assignment are resolved when their identity is known. Static proven constant data is not mistaken for a module or callable capability. Each location below is an unresolved runtime import site (or a propagated unresolved use in that file); simplify its bindings/consumer to remove the conservative classification. No files were silently excluded or edited to suppress it.

- src/boogler/play.ts: imports at lines 211.
- src/debug/perf-poses.ts: imports at lines 25.
- src/entities/finds/secrets-view.ts: imports at lines 46, 48, 50.
- src/entities/lookout/view.ts: imports at lines 41.
- src/entities/railway/arrival.ts: imports at lines 37, 38.
- src/entities/railway/cart-view.ts: imports at lines 53, 54, 56, 58.
- src/entities/railway/crates-view.ts: imports at lines 48, 50, 51, 52.
- src/entities/railway/crossing-view.ts: imports at lines 63, 64.
- src/entities/railway/forge-finish.ts: imports at lines 50.
- src/entities/railway/garage-view.ts: imports at lines 104, 105, 106.
- src/entities/railway/greeter.ts: imports at lines 50.
- src/entities/railway/halts-view.ts: imports at lines 62, 63, 64, 66.
- src/entities/railway/home-station-view.ts: imports at lines 26, 27.
- src/entities/railway/hook-shot.ts: imports at lines 44.
- src/entities/railway/hook-view.ts: imports at lines 23, 26.
- src/entities/railway/line-cargo.ts: imports at lines 33, 36.
- src/entities/railway/line2-view.ts: imports at lines 81, 82, 84, 85, 87, 88, 89, 90, 91, 93, 94, 508.
- src/entities/railway/opening-view.ts: imports at lines 30, 32, 35.
- src/entities/railway/path.ts: imports at lines 33, 34, 35.
- src/entities/railway/reward.ts: imports at lines 35, 36, 189, 190, 191.
- src/entities/railway/roundhouse-view.ts: imports at lines 71, 72.
- src/entities/railway/shelf-view.ts: imports at lines 30, 32, 34.
- src/entities/railway/sources.ts: imports at lines 68, 70, 71, 75.
- src/entities/railway/tools.ts: imports at lines 46, 47.
- src/entities/railway/train-view.ts: imports at lines 96, 97, 98, 100, 103, 104, 105, 107.
- src/entities/railway/trophy-plinth.ts: imports at lines 31.
- src/entities/railway/view.ts: imports at lines 47, 48, 49, 51, 52.
- src/entities/town/curio-shelf.ts: imports at lines 39, 41.
- src/entities/town/view.ts: imports at lines 60.
- src/features/dino.ts: imports at lines 42.
- src/features/pois.ts: imports at lines 11.
- src/place/look-kit.ts: propagated unresolved module use.

## Additional formerly exempt initializer

`src/entities/player/state.ts#enterIsland` is now counted: it calls `makePlayerBody`, which reaches engine allocation. Its once-guard/singleton role is insufficient under the requested allocation-free exemption test. Its 84 existing importers mostly acquire the whole player module in developer evals. Named imports of allocation-free state/query exports stay free. This is stricter than the earlier role-only singleton stop and is recorded explicitly rather than silently retaining an unsafe exemption.

## Limits

Allocation proof terminates at the engine/backend createBody APIs and registerSeat; native backend implementations and the record-only instantiate door are closed boundaries. The generic module value domain is bounded to eight aggregate levels and 24 monotone passes; bounds fail closed. The call closure covers private helpers in debt and ownership-factory files, without following arbitrary service/loader bodies throughout the whole repository. Existing accepted residuals remain count-preserving importer swaps, reflection and non-debt/non-ownership wrapper bodies. Compiled JSON and raw debt violation counts stay unchanged; Godot proof stays step 14.
