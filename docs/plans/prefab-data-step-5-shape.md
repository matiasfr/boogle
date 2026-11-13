# Prefab construction graph shape

The superseded 1db1a0b78 whole-program computation found **296 distinct construction exports**, 23,539 recorded importer edges and 25,635 formatted debt JSON lines. Provider counts below are the union of distinct importing files over that provider’s exports (not the sum per export).

| Provider | Distinct importers | Export count | Central/shared API? |
| --- | ---: | ---: | --- |
| src/physics/engine.ts | 461 | 24 | Yes: physics/lifecycle or shared player/ball state |
| src/physics/platforms.ts | 428 | 6 | Yes: physics/lifecycle or shared player/ball state |
| src/entity/entity.ts | 418 | 5 | Yes: physics/lifecycle or shared player/ball state |
| src/physics/physics.ts | 417 | 9 | Yes: physics/lifecycle or shared player/ball state |
| src/entities/ball/state.ts | 412 | 15 | Yes: physics/lifecycle or shared player/ball state |
| src/entities/player/state.ts | 373 | 13 | Yes: physics/lifecycle or shared player/ball state |
| src/entities/railway/line-cargo.ts | 349 | 1 | Content/view provider; transitive consumers were inflated |
| src/place/land.ts | 313 | 8 | Yes: physics/lifecycle or shared player/ball state |
| src/entities/railway/glide.ts | 294 | 2 | Content/view provider; transitive consumers were inflated |
| src/place/folk.ts | 294 | 13 | Content/view provider; transitive consumers were inflated |
| src/entities/railway/boiler-install-view.ts | 292 | 1 | Content/view provider; transitive consumers were inflated |
| src/entities/railway/cart-view.ts | 292 | 1 | Content/view provider; transitive consumers were inflated |
| src/entities/railway/crossing-view.ts | 292 | 1 | Content/view provider; transitive consumers were inflated |
| src/entities/railway/footing-view.ts | 292 | 1 | Content/view provider; transitive consumers were inflated |
| src/entities/railway/garage-view.ts | 292 | 1 | Content/view provider; transitive consumers were inflated |

Entity/entity.ts is the lifecycle facade, not an entity content index. Engine, physics, platforms and land are shared services; player and ball state expose state/control operations that non-content code legitimately uses. The old closure reached feature/entity loaders through callbacks and shared values even though loaders were not themselves listed debt providers. None should make an ordinary registration or read import a construction acquisition.

The replacement computes own-body calls in debt files, with one fixed point over debt only. Door implementations and non-debt loaders/registries are never traversed. The explicit non-constructor list has four entries: entity/entity.ts attaches finished entities and schedules callbacks; entities/player/state.ts owns singleton player controls/grounding/respawn; entities/ball/state.ts owns singleton ball state/ownership/play; physics/platforms.ts registers existing platforms and converts/carries coordinates. These are shared lifecycle/state operations, not placed-content factories. Factory results and callback containers do not forward constructor identities. Call aliases and forwarding barrels retain identity; count distinct importing files per export, retaining no importer paths in committed data.

The compact baseline has 62 construction exports and 156 total counted acquisitions, alongside unchanged 113 debt files/318 violations (111 collider files/302, 13 seat files/16). Debt JSON is 961 formatted lines. The four original audit fixtures reject new consumers/barrels. A new ordinary feature importing entity registration and instantiate passes. Count increases fail with the prefab door; count decreases require lowering the count. A fixture explicitly permits equal-count importer replacement. Reflection and helper/body indirection outside the narrow definition remain review concerns.
