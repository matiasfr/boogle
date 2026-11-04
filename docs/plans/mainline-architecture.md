# Mainline conversion: architecture findings

3 November 2026. Preparation for the later conversion, **not an implementation plan or approval to start it**.
Reviewed round 4 at `de69c653` and the accompanying simplification in `src/proto/place/` and `dev/look/bots/`.
The owner played round 4 on 3 November; see [playtests](../playtests.md). The separate default-round4 job owns bare-URL routing;
this pass leaves `src/proto/flags.ts` alone.

Serves DESIGN.md's **Small and readable**, **Clear authority**, **The scene graph is a view**, and
**Leave something for the next visitor**. Preserve the accepted run while moving its ownership and lifetime.
These seven findings are conversion work, not reasons to redesign the prototype during its playtest.

## 1. Persistent railway state still belongs to tabs

**Evidence:** [job.ts](../../src/proto/place/job.ts), `COOP`, `sharedSlice`, `save` and `restore`, stores the railway
and personal slices together in room-keyed localStorage. [coop.ts](../../src/proto/place/coop.ts), `authorityPeer`,
`snapshot`, `reconcile` and `tick`, elects a visible tab, sends whole shared snapshots once a second and corrects
followers. [index.ts](../../src/proto/place/index.ts) waits for the real world to become ready, but then advances
this separate railway through `updateRun` and `updateCargo`. The room server does not own this prototype state.

**Later:** put conserved construction quantities, unlocks and persistent progression into server-stamped rules;
keep cosmetics/personal rewards personal and decorative effects Local. Write the join, disconnect, empty-room
and restart contract before translating the tab protocol. Decide which schedules advance with world ticks.
Keep Rapier physics Owner; moving something to shared state is not permission to make physics Lockstep.
Do not retain the current authority-election protocol as a second production sync system. Engine comparison A applies.

## 2. A visible piece landing can still complete gameplay

**Evidence:** [run.ts](../../src/proto/place/run.ts), `unload`, decrements the back before its flight;
`landAtStation` changes stock and score and can start feeding. [pieces.ts](../../src/proto/place/pieces.ts),
`updatePieces`, calls `land` on elapsed render time; `clearTrips` discards flights.
[coop.ts](../../src/proto/place/coop.ts), `applyFull`, clears trips and incoming counts before reconstructing state.
Its pending/refund protocol protects specific co-op cases, but presentation still participates in advancement.
This simplification only shares the flight recipe in `stations.ts:flyToStock`; it does not change that contract.

**Later:** make accepted edits own material consumption and progression; trigger arcs, sounds and shakes from
accepted results, and reconstruct snapshots without replaying rewards. Preserve responsive local anticipation.
Specify in-flight reservations and terminal acceptance/rejection before deleting prototype refund code.
Acceptance should cover a last-piece race, snapshot during flight and sender departure, with conservation tests
in the new Lockstep rules. Engine comparison A applies.

## 3. Promotion must preserve phase order and give objects a lifetime

**Evidence:** [index.ts](../../src/proto/place/index.ts) runs most of the place from one update hook, in explicit
sequence (`updateRun`, cargo, forge, pieces, moments, gifts, folk, chop, town, tech). It also installs camera and
haul overrides. [moves.ts](../../src/proto/place/moves.ts) brackets the player controller at fixed-step orders
22 and 42 and picks a hook ring at update order 11. [rooms.ts](../../src/proto/place/rooms.ts), `makeRoom`,
creates scene groups and bodies; [town-life.ts](../../src/proto/place/town-life.ts) appends a camera constraint.
Those module lifetimes currently match the page, which is reasonable for the prototype.

**Later:** migrate complete objects into the existing entity lifecycle, keeping the order before splitting them
further. Give colliders, meshes, listeners and constraints an explicit owner and teardown; keep shared services
as services. Record which phase reads each producer's result, especially player movement and platform carry.
Do not create another frame loop, scene graph or ECS. Engine comparison B applies.

## 4. General geometry currently imports the gift system

**Evidence:** [gifts.ts](../../src/proto/place/gifts.ts), `Part`, `unit` and `merged`, owns the primitive batching
utility along with gift catalogs, meshes, presence handlers, save registration and reveal logic.
[rooms.ts](../../src/proto/place/rooms.ts) imports `merged` and derives its `Part` type from that function.
Thus importing a room-building utility also loads gift-system work.

**Later:** move the reusable primitive description/builder into a presentation-only leaf module, then let both
gifts and rooms depend on it. Keep catalog text, ownership, reveal and networking in their respective owners.
This is a concrete dependency inversion, not a request for a universal asset framework. The current pass leaves
it intact because changing import-time startup order belongs with the lifecycle conversion in finding 3.

## 5. Saved and received slices need an explicit production schema

**Evidence:** [job.ts](../../src/proto/place/job.ts), `Slice`, uses `unknown` setters; `fill` accepts matching
primitive types recursively, without field-specific bounds. `restore` applies slices sequentially inside a
catch. [coop.ts](../../src/proto/place/coop.ts), `validSnap`, checks generation and line stock, while later code
also reads job, run, trains, heaps and depot fields. [run.ts](../../src/proto/place/run.ts), `putMachine`,
adds separate checks for its slice. Validation is distributed rather than one complete snapshot contract.

**Later:** export the production state/op shapes next to their owners; validate the entire incoming state before
mutating live state. Use the existing rules' version/migration and namespace contracts. Preserve personal versus
shared separation. A clean development namespace break is allowed; avoid a one-off localStorage migration.
Do not generalize `fill` into the server's save loader. This follows Boogle's existing persistence contract,
not a proposal to replace it with another engine's serializer.

## 6. Debug mutation and inspection are coupled to startup

**Evidence:** [index.ts](../../src/proto/place/index.ts) imports and calls `buildPanel` unconditionally;
[panel.ts](../../src/proto/place/panel.ts), `buildPanel`, exposes mutable state and skips on `window.__place`.
[dev/look/bots/place.ts](../../dev/look/bots/place.ts) reads that handle as `any`, even for its normal playthrough.
The hidden panel and the bot's required interface are currently the same module.

**Later:** give observation a typed inspect surface and put deliberate state mutation/skips behind a lazy debug
entry. Keep the full-run bot using real input; preserve its beats and checkpoint setup through the conversion.
Do not simply remove the handle or hide missing beats. This is a Boogle tooling boundary, not a new gameplay API.

## 7. Becoming the default URL is separate from retiring prototype dependencies

**Evidence:** [index.ts](../../src/proto/place/index.ts) imports sea and sky from `proto/crossing`, cargo from
`proto/net`, sounds from `proto/minis`, and overrides `haulHooks`. [chop.ts](../../src/proto/place/chop.ts) writes
`backSeam` from `features/haul-stack`. [town-life.ts](../../src/proto/place/town-life.ts) eagerly imports all three
interiors, while [rooms.ts](../../src/proto/place/rooms.ts) hides nearby detail using visibility.
Hiding detail does not unload its modules, stop their registration or establish resource ownership.

**Later:** inventory these dependencies and promote only the production pieces, leaving still-used experiments
available until explicitly retired. Remove replaced seams and prototype copies when their consumers move; update
the prototype card, as-built docs and atlas with the conversion. Start with explicit place ownership and measured
loading needs, not speculative streaming. Engine comparison C applies. Bare-URL routing is not touched here.

## Engine comparisons used for these calls

These are based on primary-source notes already in the repository, not a fresh network review. Network use for
this task was restricted to the local test server. Source versions and their limitations remain those recorded in
[shared-construction.md](../research/shared-construction.md),
[entity architecture sources](../research/notes/entity-architecture/sources.md), and
[places-as-modules.md](../research/places-as-modules.md). Refresh the relevant docs when designing the conversion.

| Call | Unity | Unreal | Godot | Boogle's deliberate difference |
| --- | --- | --- | --- | --- |
| A: authority and presentation | [NGO client anticipation](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/client-anticipation.html) separates anticipated visuals from authoritative values. | [Property replication](https://dev.epicgames.com/documentation/en-us/unreal-engine/property-replication-in-unreal-engine?application_version=5.2) sends server-owned state; intermediate values need not all arrive. | [High-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html) distinguishes authority and any-peer RPCs; [MultiplayerSynchronizer](https://docs.godotengine.org/en/stable/classes/class_multiplayersynchronizer.html) synchronizes authority-owned properties. | Persistent construction uses deterministic server-stamped edits and hash-verified snapshots. Accepted results drive effects; Owner physics remains separate. No wholesale adoption of property replication or prediction. |
| B: lifecycle and phase order | [Execution order](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/managing-update-order/execution-order) separates lifecycle, fixed updates and frame updates; arbitrary instance order is not guaranteed. | [Actor ticking](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine) uses physics-relative groups and explicit prerequisites. | [Node](https://docs.godotengine.org/en/stable/classes/class_node.html) provides entry/readiness, process priorities and deferred freeing. | Use the existing entity walker and its ordered phases. Migrate today's ordering explicitly, without adopting a scene-tree or component framework. |
| C: content lifetime | [Additive scenes](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.LoadSceneMode.Additive.html) retain existing scenes; [unloading](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/SceneManagement.SceneManager.UnloadSceneAsync.html) destroys scene objects separately from asset unloading. | [World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine) loads runtime cells around sources and distinguishes loading from activation. | [Manual scene management](https://docs.godotengine.org/en/stable/tutorials/scripting/change_scenes_manually.html) distinguishes hiding, detaching and freeing; [background loading](https://docs.godotengine.org/en/stable/tutorials/io/background_loading.html) separates request, readiness and retrieval. | Plain modules/factories and owned entities in one world. Visibility is not lifetime; dynamic import is not a work scheduler. No automatic spatial grid is justified by this review. |

## Copy retained and scope of the simplification

The Boogler's files, `town-lines.ts` and every gift `line` remain unchanged. No unreachable protected line was
established in this pass, so there is no deletion list. The baseline actually painted all three nonempty gift
lines: “Yours. It suits you.”, “Knitted by someone in the village, probably.” and “It was in the crate. It seems
to like you.” Absence from one bot run would not establish unreachability.

The simplification folds nearest-item searches, house/shop plank floors and local/remote station flight recipes.
It removes unused `packShape`, `axeShape`, `isChestWaiting`/`CHESTS`, `requestTrain`, `onTrainOf`, `headStopAt`,
`villageAt`, `DEPOT`, `STEM`/`stem` and the bot's redundant platform wrapper. `ambienceState` stays: its comment
documents the manual listening-check API despite having no static caller. No architecture finding above is implemented.
