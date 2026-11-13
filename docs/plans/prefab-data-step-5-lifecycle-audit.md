# Fourth-review construction audit

**Superseded negative proof:** see [the fifth-review re-audit](prefab-data-step-5-dynamic-audit.md). Promise.all bindings hid real constructors; the two view removals below were incorrect and are restored.

All 62 recorded construction exports at `d9b8d8573` were checked against their capability calls. The required OwnedView factory owns/attaches already-created bodies and schedules disposal; it must be freely importable with instantiate. The explicit module stop list now includes `src/render/owned-view.ts`, in addition to the four previously justified shared services. The prefab runtime remains an explicit open door. No raw capability import exemption or file budget was added.

The following 20 entries were removed from importer counting; their original provider public surfaces and capability-import/violation budgets still bind. Export-specific stops leave real construction factories in the same file counted.

| Removed export | Why |
| --- | --- |
| render/owned-view#createOwnedView | Ownership/disposal lifecycle for finished meshes and bodies; required documented prefab path. |
| player/camera-arm#makeCameraArm | Camera obstruction solver; only sweep queries. |
| place/pose#createPosePolicy | Preview pose/query policy; only sweep queries. |
| render/locomotion-surfaces#stepSurfaceAt | Reads existing static surfaces. |
| guest/collision#gatherSurfaces | Copies existing surfaces into guest collision data. |
| guest/play#startGuest | Switches the existing singleton player body into guest mode. |
| guest/play#stopGuest | Restores that body and disposes its guest view. |
| boogler/boogler#booglerBodyStep | Moves the existing Boogler body; createBoogler stays counted. |
| boogler/play#checkStandingOnBoogler | Reads existing contacts and time. |
| boogler/play#carryBooglerRider | Moves an existing rider. |
| entities/railway/car#snapCar | Teleports an existing car; makeCar stays counted. |
| debug/perf-poses#putPlayer | Debug pose of the existing player. |
| place/sites#housePlan | Returns plan data at a queried height; hullBodies stays counted. |
| place/sites#towerPlan | Returns plan data at a queried height. |
| place/sites#blockPlan | Returns plan data at a queried height. |
| place/folk#crewStart | Selects existing villagers and queries terrain height. |
| place/folk#updateFolk | Updates existing villagers over terrain queries. |
| place/look-kit#installContact | Owned contact-shadow animation over terrain queries; no collider. |
| entities/finds/view#createFindsView | Falls out of the fixed point when OwnedView ceases to be a constructor; remains a valid prefab-owning lifecycle view. |
| entities/lookout/view#createLookoutView | Falls out for the same ownership-only dependency; no direct collider/seat creation call. |

The remaining 42 entries retain direct construction-capability calls or direct calls to other counted construction exports. This targeted analysis still deliberately does not follow arbitrary private/non-debt wrapper bodies; count-preserving importer replacement and reflection remain accepted residuals. The audit removes false positives without broadening any raw capability door.

Namespace forwarding now retains identity across `export * as ns`, a namespace import followed by `export { ns }`, aliases and nested namespace barrels. Three existing forwarding bindings are recorded as compact provider identities under `forwards`, rather than importer paths. Any added construction re-export binding/provider identity fails, even when the barrel already imported that provider and its importer count is unchanged. Removed forwarding bindings require pruning.

Registry reads `origin/main`'s debt file directly. A current-schema base enforces all shrink-only comparisons. A missing/older schema runs internal consistency and reason/count/surface checks only; no common ancestor or network fetch is required. The depth-one local-clone fixture checks missing, older and current schemas with no merge base, including a current-schema growth rejection.

Rebased onto local `origin/main` at `1af69645b` on `codex/prefab-data-step-5-3`. No conflicts, manual Home changes, simulation/network/server source changes, WORLD_NS changes, pushes or ships. The inherited server-state changes are upstream only.
