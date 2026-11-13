# Prefab enforcement: main rebase and ordinary-feature audit

Base: `721fcffcabc98b43f24567d758ceb5dfa3d07254`; branch `codex/prefab-data-step-5-4`. No game-source edits in this correction.

| Metric | Before | After |
| --- | ---: | ---: |
| Distinct raw debt files | 113 | 110 |
| Raw violations | 318 | 310 |
| Computed construction exports | 92 | 64 |
| Conservative files | 32 | 31 |
| Formatted debt JSON lines | 998 | 954 |

Removed collider entries: `src/features/hut-build.ts` (2), `src/features/track-machine.ts` (3), `src/proto/wagon/index.ts` (3), all deleted upstream. No surviving raw file budget changed, no raw file was added, and seat entries are unchanged. All metadata provider/forward identities were regenerated from the rebased tree. Other deleted upstream files had no raw debt entries.

## Ten largest construction importer counts

Counts include forwarding and whole-namespace acquisitions, not just actual calls. None of these ten is a routine feature lifecycle/state-reading API. New record-authored placed content uses OwnedView + `src/prefab/instantiate.ts`; ordinary state reads use named imports or the state leaf.

| Export | Importing files | Ordinary new feature needs it? | Existing source consumers |
| --- | ---: | --- | --- |
| `src/entities/player/state.ts#enterIsland` | 83 | No: lobby/bootstrap allocation, not ordinary feature state access. | `src/debug/device/scene.ts`, `src/debug/perf-poses.ts`, `src/player/hud.ts`, `src/player/player.ts` |
| `src/entities/railway/car.ts#makeCar` | 13 | No: direct body/seat/content construction. | `src/entities/railway/cart-view.ts`, `src/entities/railway/crates-view.ts`, `src/entities/railway/line2-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/railway/path.ts`, `src/entities/railway/rail-kit.ts`, `src/entities/railway/reward.ts`, `src/entities/railway/track-machine.ts`, `src/entities/railway/train-view.ts`, `src/entities/railway/view.ts` |
| `src/entities/railway/track-machine.ts#buildMachine` | 12 | No: direct body/seat/content construction. | `src/entities/railway/cart-view.ts`, `src/entities/railway/crates-view.ts`, `src/entities/railway/line2-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/railway/path.ts`, `src/entities/railway/rail-kit.ts`, `src/entities/railway/reward.ts`, `src/entities/railway/train-view.ts`, `src/entities/railway/view.ts` |
| `src/entities/railway/track.ts#buildTrack` | 12 | No: direct body/seat/content construction. | `src/entities/railway/cart-view.ts`, `src/entities/railway/crates-view.ts`, `src/entities/railway/line2-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/railway/path.ts`, `src/entities/railway/rail-kit.ts`, `src/entities/railway/reward.ts`, `src/entities/railway/train-view.ts`, `src/entities/railway/view.ts` |
| `src/entities/railway/seat.ts#registerSeat` | 9 | No: direct body/seat/content construction. | `src/entities/railway/track-machine.ts`, `src/entities/railway/view.ts`, `src/prefab/instantiate.ts` |
| `src/place/sites.ts#snapSite` | 7 | No: existing site materialization/activation internals. | `src/entities/lookout/view.ts`, `src/entities/railway/arrival.ts`, `src/entities/railway/home-station-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/town/curio-shelf.ts`, `src/entities/town/rooms.ts`, `src/entities/town/view.ts` |
| `src/place/sites.ts#hullBodies` | 6 | No: existing site materialization/activation internals. | `src/entities/lookout/view.ts`, `src/entities/railway/arrival.ts`, `src/entities/railway/home-station-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/town/curio-shelf.ts`, `src/entities/town/view.ts` |
| `src/place/sites.ts#buildSites` | 6 | No: existing site materialization/activation internals. | `src/entities/lookout/view.ts`, `src/entities/railway/arrival.ts`, `src/entities/railway/home-station-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/town/curio-shelf.ts`, `src/entities/town/view.ts` |
| `src/place/sites.ts#updateSites` | 6 | No: existing site materialization/activation internals. | `src/entities/lookout/view.ts`, `src/entities/railway/arrival.ts`, `src/entities/railway/home-station-view.ts`, `src/entities/railway/opening-view.ts`, `src/entities/town/curio-shelf.ts`, `src/entities/town/view.ts` |
| `src/entities/railway/works-box-view.ts#drawWorksBoxes` | 4 | No: direct body/seat/content construction. | `src/entities/railway/home-station-view.ts`, `src/entities/railway/roundhouse-view.ts`, `src/entities/railway/works-view.ts`, `src/entities/ring-steel/view.ts` |

`enterIsland` is exported by `src/entities/player/state.ts:72`, calls `makePlayerBody` at line 81, and is re-exported by `src/player/player.ts:4`. Its UI caller is lobby `joinFromLobby` (`src/player/hud.ts:141`), not a feature API. No feature calls it. Most of its 83 acquisitions are tooling dynamic imports of the whole player barrel. New tooling that only reads state can import `src/player/state.ts`; ordinary features can import named `me`/`cam` or `onEntered` freely (as the HUD fixture proves). A new whole-player namespace acquisition intentionally still consumes the construction budget.

## Construction audit changes

28 exports were removed, none added. This correction counts actual allocation/shape-replacement/seat-registration endpoints and unresolved dynamic use rather than every capability-module query. Opaque/callable arguments conservatively taint the supplying caller, not every invocation of the generic callback receiver. This removes false positives without exempting allocating OwnedView factories.

| Removed export | Reason |
| --- | --- |
| `src/adapters/mushrooms.ts#bounceOffCaps` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/adapters/mushrooms.ts#spotsAhead` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/boogler/play.ts#talkTargets` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/boiler-install-view.ts#createBoilerInstall` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/car.ts#poseCarOnLine` | Positions an existing car; numerical callback is not a construction capability. |
| `src/entities/railway/footing-view.ts#createRailwayFootings` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/glide.ts#createRailwayGlide` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/path.ts#approachPlanks` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/reward.ts#rewardSeat` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/railway/seat.ts#sitDown` | Existing-seat interaction/target enumeration, no registration; raw seat-module import restriction still applies. |
| `src/entities/railway/seat.ts#withSeatTargets` | Existing-seat interaction/target enumeration, no registration; raw seat-module import restriction still applies. |
| `src/entities/route-greybox/massing.ts#gorgeMassing` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/entities/town/museum.ts#createMuseum` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/physics/flight.ts#dropPoint` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/physics/flight.ts#flyPath` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/place/cove-stop.ts#holdCoveStop` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |
| `src/place/folk.ts#addResident` | Visual NPC helper; terrain queries allocate no body. |
| `src/place/folk.ts#addGreeter` | Visual NPC helper; terrain queries allocate no body. |
| `src/place/folk.ts#addLooker` | Visual NPC helper; terrain queries allocate no body. |
| `src/place/look-kit.ts#kitBatch` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/look-kit.ts#kitLogs` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/look-kit.ts#lookTrack` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/look-kit.ts#stationKit` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/look-kit.ts#machineLook` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/look-kit.ts#trainLook` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/opening-models.ts#craneModel` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/place/opening-models.ts#rackModel` | Pure visual geometry; generic callback/data arguments no longer taint the receiving helper. |
| `src/render/place-tree-view.ts#createTreeView` | No reachable allocation, shape replacement, seat registration or unresolved dynamic use in the debt-local proof; query/attachment calls alone no longer imply construction. |

`src/render/place-tree-view.ts#createTreeSolids` stays counted: its typed Shape → Body callback constructs trunk/stump bodies. `src/entities/railway/train-load.ts#solidTrainLoad` stays counted: `setShapes` replaces actual collision shapes. Added permanent regressions cover both endpoints and generic callback contamination. The module-level capability ban, frozen public surfaces, raw count ratchets and content-global checks are unchanged.

## Passing feature fixtures and limits

The existing full OwnedView + instantiate + defineKind + onStart fixture passes without metadata edits. The new `test/fixtures/prefab-hud-feature.txt` imports engine lifecycle (`loop.ts`), entity APIs, named player state/events and interaction state; its physics `Body` import is type-only and verified to erase. It creates DOM only and passes with unchanged debt bytes. Runtime physics/seat imports still fail in explicit negative fixtures. The HUD fixture is lint input, not a newly installed runtime HUD.

The user’s ambiguous “engine” wording is interpreted as lifecycle APIs plus erased physics types: permitting runtime physics-module queries would contradict the explicitly retained whole-module ban. Pure `poseCarOnLine`, `kitBatch` and `addResident` named imports have an additional passing fixture.

Conservative paths remain reported by lint/registry (31 files below). Reflection, count-preserving importer swaps and arbitrary wrappers outside analyzed debt/ownership files remain accepted residuals. Dynamic unknowns within the analyzed domain still fail closed. A missing base debt file means depth-one CI performs bootstrap/internal consistency, not a historical shrink comparison.

- `src/boogler/play.ts`
- `src/debug/perf-poses.ts`
- `src/entities/finds/secrets-view.ts`
- `src/entities/lookout/view.ts`
- `src/entities/railway/arrival.ts`
- `src/entities/railway/cart-view.ts`
- `src/entities/railway/crates-view.ts`
- `src/entities/railway/crossing-view.ts`
- `src/entities/railway/forge-finish.ts`
- `src/entities/railway/garage-view.ts`
- `src/entities/railway/greeter.ts`
- `src/entities/railway/halts-view.ts`
- `src/entities/railway/home-station-view.ts`
- `src/entities/railway/hook-shot.ts`
- `src/entities/railway/hook-view.ts`
- `src/entities/railway/line-cargo.ts`
- `src/entities/railway/line2-view.ts`
- `src/entities/railway/opening-view.ts`
- `src/entities/railway/path.ts`
- `src/entities/railway/reward.ts`
- `src/entities/railway/roundhouse-view.ts`
- `src/entities/railway/shelf-view.ts`
- `src/entities/railway/sources.ts`
- `src/entities/railway/tools.ts`
- `src/entities/railway/train-view.ts`
- `src/entities/railway/trophy-plinth.ts`
- `src/entities/railway/view.ts`
- `src/entities/town/curio-shelf.ts`
- `src/entities/town/view.ts`
- `src/features/dino.ts`
- `src/features/pois.ts`

Final logs, actual depth-one clone proof, timing, stamp and inspected startup images: `.look/prefab-rebase-4/` and the broker manifest linked by its evidence.json. Static checks do not establish gameplay feel or motion.
