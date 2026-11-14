# Prefab step 5: rebase debt delta

> **History (kept as evidence).** Superseded by steps 5d to 5h. This records the 5c edge-list ratchet (importer paths per export, a whole-program closure), which 5d removed. Still true: counts are lint violations, not runtime collider instances. Current contract: [lint-boundaries](../agents/lint-boundaries.md); current counts: `dev/lint/prefab-debt.json`.

Rebased onto local `origin/main` at `c279b824cf80fa26b21312fe5fa023d1a31824d8` (includes Home flip `9c9b4cd67`). No fetch. Comparison is the pre-rebase edge baseline against the regenerated rebased source. No runtime source was edited by this follow-up.

Counts are lint violations (module acquisitions and legacy direct calls), not runtime collider instances. The new Home hall treads reuse the existing local helper and therefore do not increase this count. Removed Home files were consumers, not direct capability debt providers.

## colliders

- `src/entities/railway/boiler-install-view.ts`: `{"count":1,"exports":["PALLET","POST","createBoilerInstall"],"reason":"2026-11-13: Owner-approved structural module boundary baseline; existing imports/calls and public names."}` → `{"count":1,"exports":["PALLET","createBoilerInstall"],"reason":"2026-11-13: Owner-approved structural module boundary baseline; existing imports/calls and public names."}`. Inherited public surface change from origin/main.

## seats

No entries changed.

## doors

No entries changed.

## Computed legacy exports and consumers

Each entry below changed because the resolved import/reference graph changed in inherited main source: deleted Home variants, consolidated Home imports, new railway command/tuning consumers, and the tree catalog/planting split. Constructor sets and importer sets are recomputed mechanically; no edge was manually approved.

### src/entities/ball/state.ts#ball

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/ball/state.ts#throwBall

Removed consumers: `src/entities/railway/boiler-install-view.ts`.

### src/entities/player/state.ts#backToSpawn

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/player/state.ts#releaseJump

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/boiler-install-view.ts#createBoilerInstall

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/car.ts#drawCar

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/car.ts#makeCar

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/car.ts#poseCarOnLine

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/car.ts#snapCar

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/cart-view.ts#createRailwayCart

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/crossing-view.ts#createRailwayCrossing

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/footing-view.ts#createRailwayFootings

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/garage-view.ts#createGarageView

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/glide.ts#createRailwayGlide

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/glide.ts#railwayGlideOpen

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/hook-shot.ts#createRailwayHook

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/line-cargo.ts#createLineCargo

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/line2-view.ts#createRailwayLine2

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/railhead-view.ts#createRailwayRailhead

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/reward.ts#createRailwayReward

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/reward.ts#rewardSeat

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/roundhouse-view.ts#createRailwayRoundhouse

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#lowStoolMesh

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#registerSeat

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#seatHeld

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#seatMesh

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#seatState

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#seated

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#sitDown

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/seat.ts#withSeatTargets

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/shelf-view.ts#createRailwayShelf

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/sources.ts#createRailwaySources

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/stations.ts#buildStation

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/track-machine.ts#buildMachine

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/track-machine.ts#thud

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/track.ts#buildTrack

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/train-load.ts#solidTrainLoad

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/train-view.ts#createRailwayTrains

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/railway/works-box-view.ts#createBoxBatch

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/works-box-view.ts#footingFrame

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/works-box-view.ts#footingParts

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entities/railway/works-view.ts#createRailwayWorks

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/ring-steel/view.ts#createRingSteel

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/route-greybox/leg-view.ts#createLegView

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entities/town/workshop.ts#makeWorkshop

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/entity/entity.ts#despawn

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/entity/entity.ts#spawn

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/loop.ts#onStart

Removed consumers: `src/entities/railway/boiler-install-view.ts`.

### src/physics/engine.ts#createBody

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#forEachStatic

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#getMask

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#physicsTime

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#rayHit

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#raycastClosest

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#setShapes

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#stepAlpha

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/physics/engine.ts#teleport

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/physics/flight.ts#dropPoint

Removed consumers: `src/entities/railway/boiler-install-view.ts`.

### src/physics/flight.ts#flyPath

Removed consumers: `src/entities/railway/boiler-install-view.ts`.

### src/physics/physics.ts#ballMat

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/physics.ts#groundProbe

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/physics.ts#makePlayerBody

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/physics/platforms.ts#carry

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#addGreeter

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#addLooker

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#addResident

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#boltAt

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#bolting

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#crewEnd

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#crewSend

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#crewStart

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#crewState

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#folk

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#mountFolk

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#setCommuters

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/folk.ts#updateFolk

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#H

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#PATH_SAMPLES

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#addStatic

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#addStatics

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#buildLand

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#plank

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#slab

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/land.ts#staticBody

Added consumers: `server/test/helpers/rail-tune.ts`, `server/test/rail-tune-recording.test.ts`, `server/test/rail-tune.test.ts`, `src/debug/dev/tunables.ts`.

Removed consumers: `src/entities/railway/boiler-install-view.ts`, `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#installContact

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#kitBatch

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#kitLogs

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#lookTrack

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#machineLook

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#stationKit

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/look-kit.ts#trainLook

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/pose.ts#createPosePolicy

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#addFoot

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#addSite

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#blockPlan

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#buildSites

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#housePlan

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#hullBodies

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#liftPiece

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#showPiece

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#snapSite

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#startSite

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#towerPlan

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/place/sites.ts#updateSites

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/render/owned-view.ts#createOwnedView

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/render/place-tree-view.ts#createAxes

Removed consumers: `test/island-map-labels-b.test.ts`.

### src/render/splash.ts#splash

Removed consumers: `src/entities/railway/boiler-install-view.ts`.

## Totals

1 budget/surface entries changed; 0 constructor kind/set changes; 107 constructor importer records changed; 202 importer edges added and 161 removed.
