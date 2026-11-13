# Prefab data: every thing in the world as one record

_Plan, 13 November 2026. Not approved, not started. Counts are from commands at `f464b11d2` (`grep -rcE` over `src/**/*.ts`, `find`, and Node imports of the data modules); "Not read" is at the end. Option 2 of the owner's 13 November question ([owner-calls, "Engine foundations first"](../agents/owner-calls.md)); option 1 (all state server-owned) is `plan/server-owned-state` and is not covered here._

## Goal

**Execution, 13 November:** owner approved steps 1-3 only, on the three open questions' recommendations: approved debt at step 5, committed JSON at runtime, one later Godot export. The original plan status above is historical.

Each thing placed in the world (a chair, a platform, a sign post, a tree) is one typed record: its visual, colliders, attachment points, interactions, components and lifetime. The world's static content is placement files that name records. Both compile to versioned JSON that a headless tool, the level check or an engine importer can read. It serves **Understandable at a glance** and the owner's first criterion for the foundation, enforceability ("having all our models adhere to a system"), and keeps a later move to Unity, Unreal or Godot mechanical. It bends **Small and readable** ("no build step of ours"): see open question 2.

**Research:** [engine-long-term](../research/engine-long-term.md): uses target 5 ("Prefabs compile typed authoring into portable data: stable keys, component initializers, relationships, asset references and collider recipes"), "Scene/prefab data: yes, for gameplay composition" and stage H's proofs (collider and placement goldens, native visual checks, no reset); departs by pulling stage H's prefab half ahead of its scopes and scheduler half. [engine-portability](../research/engine-portability.md): departs from its row 6 ("a scene file format ... not worth it"), which the second study and the owner's 13 November call supersede. [level-design-tools](../research/level-design-tools.md) ("one inspectable description per place", partly adopted): index line only.

## 1. Inventory: how things are defined today

| What | Count | Where |
| --- | --- | --- |
| Source | 720 files, 120,159 lines in `src/` | |
| Entity kinds | 85 `defineKind(` in 68 files (83 outside `src/proto`; 22 in `src/entities`, 29 in `src/features`); 87 `spawn(` in 67 files | `src/entity/entity.ts` |
| Code-built meshes | 320 `new Mesh(`/`InstancedMesh(` in 101 files outside proto; 185 `BoxGeometry(` in 64; 60 `merged(` part lists in 23; 157 node-material constructors in 78 | views |
| GLB assets | 12 in `assets/built/` (built from `assets/src/*.py` Blender recipes, hashed in `assets/built/manifest.json`); 11 `.glb?url` imports in 8 files; 5 `loadAsset(` in 4; only 2 `registerAsset(` ids (`buddy`, `hero-clips`, `src/features/buddy.ts:16-17`) | `src/render/asset-loader.ts`, `asset-manifest.ts` |
| Static colliders | 130 calls of `addStatic`/`addStatics`/`staticBody`/`createBody`/`slab` in 48 files outside proto and `src/physics` | `src/place/land.ts:274-320` |
| Seats | 3 `registerSeat({` call sites (workshop, track machine, train benches) | `src/entities/railway/seat.ts:80` |
| Interactions, actions, signs | 15 `registerInteractable(` in 13 files; 18 `registerAction(` in 12; 11 `signBoard(` in 10 | `src/player/hands.ts`, `controls.ts`, `src/render/sign-board.ts` |
| Already data, objects | `src/blueprints/` (227 lines): 3 blueprints (palm, broadleaf, rock: footprint and collider recipe, no visual), seeded `scatterProps()`; `LAND_TREES` 362 placements (`src/place/tree-catalog.ts`); `gorgeMassing()` 73 `GreyBox` records, 53 solid, 2 collider-only (`src/entities/route-greybox/massing.ts:66`) | |
| Already data, catalogs | `RAIL_LINES` 5 with 2/10/3/4/5 halts, `RAIL_HALTS` 24, `RAIL_TRAINS` 6 (`src/sim/railway-lines.ts:205,559`); `WORLD_LINES` 5; `RAIL_ROUTE_POINTS` 55, `RAIL_LEGS` 8, `RAIL_GATES` 6, `RAIL_PLACES` 5 (`src/sim/railway-route.ts`); `src/place/layout.ts` (641 lines, about 60 exported tables: `HALTS` 5, `UP_HALTS` 2, `GROVES` 4, `ROCKS` 3 ...); `GIFTS` 3 | sim, place |
| Level tools | 24 files in `dev/level/`; `npm run level-check` runs today: 12 reports (all track continuity, none about props) in 9.4 s | |

Placed instances alive at run time were not counted (it needs a browser: `window.boogle.inspect()`); the instance counts above are the data tables'.

**One thing, declared in several places** (the five examples):

1. **Workshop chair.** Visual `src/entities/town/workshop.ts:65-67` (mesh from `src/entities/railway/seat.ts:354`); collider two hand-typed boxes at `workshop.ts:68-69`; seat `workshop.ts:70-76`; lifetime split between `update()` (`workshop.ts:133-147`, bodies made when the forge is ready) and `dispose()` (`workshop.ts:111-124`); the file is exempt from the entity rule (`dev/lint/policy.ts:207`).
2. **Workshop furnishing.** Visual parts and their `solid(...)` boxes are parallel hand-kept lists in `src/entities/town/workshop-kit.ts:65,79,86,98,112,139,147`; the bodies are built in `workshop.ts:64,134-143`.
3. **A railway halt.** Rule row `src/sim/railway-lines.ts:559` (`RAIL_HALTS`); position `src/place/layout.ts:390-396` (`HALTS`); deck mesh `src/entities/railway/halts-view.ts:374`; colliders `halts-view.ts:309-328` (posts, bench, canopy, mast, ramps as literals); lever `halts-view.ts:461` and `request-lever.ts`.
4. **A train bench.** Model `assets/built/passenger-car.glb`; seat anchors `src/entities/railway/car-kit.ts:19` (`BENCH`); seat registration `src/entities/railway/train-view.ts:184-201`; rider offsets `seat.ts:362-369`.
5. **The mushroom stall.** Position `src/adapters/mushrooms.ts:56`, body `mushrooms.ts:104`, meshes `mushrooms.ts:145-156`; the level check retypes the position because the module "draws: not loadable here" (`dev/level/level.ts:16`).

The pattern to copy already exists: `GreyBox` (`src/entities/route-greybox/boxes.ts:8-22`) is one record that yields mesh and collider, and branch `greybox/leg2-massing`'s `leg2-layout.ts` (`Piece` with `id`, `Pad`, `Post`, pure data read by both the view and `dev/level/route-leg2.ts`) is a placement file in all but name.

## 2. Design: the target record

**Sync kind:** everything here is **Local** (static scenery and view wiring, built identically on every client from the same build; no ops, no state key, no wire shape). Seats keep today's authority (host field `placeSeatGrants`, presence `placeSeatRequest`/`placeSeatPose`) and ids, unchanged. No controls: no action id, pad slot, key, touch or guide row.

**Files.** `src/prefab/types.ts` (types, `definePrefab`, `defineLevel`), `src/prefab/names.ts` (the name registries), `src/prefab/validate.ts` (pure; used by the compiler, the tests and the loader), `src/prefab/instantiate.ts` (the only code that turns a record into meshes, bodies and seats), `src/prefab/builders/<name>.ts` (procedural visuals). Records: `src/content/prefabs/<area>.ts`, `src/content/levels/<place>.ts` (no three.js, no DOM, no closures in the exported value). Artifacts, committed: `content/built/prefabs.json`, `content/built/levels/<place>.json`. Tools: `dev/prefab/build.ts` (`npm run prefabs`, `-- --check`), `dev/prefab/new.ts` (`npm run prefab:new -- <area>.<name>`).

```ts
export type PrefabDef = {
  key: `${string}.${string}`;            // stable, never reused; retired keys stay listed in names.ts
  visual: { asset: AssetId; node?: string } | { builder: BuilderName; params: JsonObject; batch?: string } | { none: true };
  colliders: readonly ColliderDef[];     // { shape: 'box'|'sphere'|'capsule'|'trunk', at: Vec3, half|r|..., rot?: Vec3, group?: 'scenery'|'room' }, prefab-local metres
  attach?: Record<string, Attach>;       // { kind: 'seat', at, yaw, exit, forward?, perch? } | { kind: 'label', at, facing, w, h } | { kind: 'point', at }
  interactions?: readonly { action: InteractionName; at?: string; gate?: GateName }[];
  components?: Partial<ComponentInits>;  // initial values, keyed by component name (see "Where it touches the ECS")
  scope: 'owner' | 'place' | 'room';     // who ends it: the instantiating owner, a resident place, or the page
  material?: MaterialName;               // a name from the material library or `tsl:<name>`; never a material object
};
export type Placement = { id: string; prefab: PrefabKey; pos: Vec3; rot?: Vec3; scale?: Vec3; params?: JsonObject; parent?: string };
export type LevelDef = { place: string; placements: readonly Placement[] };
```

- **Names, not code.** `BuilderName`, `InteractionName`, `GateName`, `MaterialName`, `AssetId` are keys of interfaces in `names.ts` that a builder or handler extends by declaration merging when it registers (`registerBuilder('seat.chair', fn)`), so a typo is a type error and the compiler rejects an unregistered name. A gate (the chair's "forge is ready") is a name in the record; the owner passes its function to `instantiate(key, transform, { owner, gates: { open: ready } })`, which throws if a named gate is missing.
- **Authoring is TypeScript, output is flat data.** A level file may use frames, loops and helpers (as `massing.ts` and `leg2-layout.ts` do); the compiler evaluates it and writes numbers. Placements derived from a sim catalog (halts) are generated by the compiler from that catalog, which stays the authority.
- **Artifact.** `{ "format": "boogle-prefabs", "version": 1, "units": "metres", "axes": "x east, y up, z south, right-handed", "rotation": "yaw, pitch, roll in radians, order YXZ", "prefabs": {...} }`; levels the same with `"format": "boogle-level"`. Numbers rounded to 1e-4; keys sorted, so a diff is the change. The game imports the JSON, not the TypeScript records, and validates `format`, `version` and every reference at load: unknown version or reference throws at boot (fails closed).
- **What stays code, and how a record names it:** TSL materials (`material: 'tsl:furnace-glow'`), procedural mesh generators (`visual.builder` plus JSON `params`), instancing and merging (`visual.batch`: instances with the same batch name share one mesh), animation, cameras, cutaways and anything state-driven (the view that owns the instance). State-driven things (a leg's standing platforms, `leg-view.ts:243`) are placements made by code at run time, still through `instantiate`.
- **Runtime.** `instantiate` returns `{ root, bodies, seats, attach(name), setEnabled(on), dispose() }`, registers everything with the caller's `OwnedView` (`src/render/owned-view.ts`), builds colliders with `staticBody` (`land.ts:274`) and seats with `registerSeat`. `src/blueprints/blueprint.ts`'s `Blueprint` and `Placement` fold into these types in step 11.

**Worked example, the workshop chair** (numbers from `workshop.ts:65-76`, made chair-local; `seatHeight` is 0.55 + `PLAYER_R` 0.45):

```ts
definePrefab({
  key: 'town.workshop-chair',
  visual: { builder: 'seat.chair', params: {} },
  colliders: [
    { shape: 'box', at: [0, 0.275, 0], half: [0.4, 0.275, 0.325] },   // the seat
    { shape: 'box', at: [0, 0.95, -0.3], half: [0.4, 0.4, 0.06] },    // the back
  ],
  attach: { seat: { kind: 'seat', at: [0, 1.0, 0.25], yaw: 0, exit: [0, 0.46, 1.1] } },
  interactions: [{ action: 'seat.sit', at: 'seat', gate: 'open' }],
  scope: 'owner',
});
// in the workshop's level: { id: 'forge-workshop', prefab: 'town.workshop-chair', pos: [2.7, 0, 0.3], parent: 'forge-workshop-room' }
```

**Worked example, a greybox platform** (the first 8 m of High Gorge's north platform, `massing.ts:78`, values from `gorgeMassing()[0]`):

```ts
definePrefab({
  key: 'greybox.box',
  visual: { builder: 'greybox.box', params: { tone: 'grey' }, batch: 'route-greybox:massing' },
  colliders: [{ shape: 'box', at: [0, 0, 0], half: [0.5, 0.5, 0.5] }],   // a unit cube; the placement's scale sizes it
  scope: 'place',
});
// content/built/levels/gorge.json:
// { "id": "gorge.platform-n.0", "prefab": "greybox.box", "pos": [-71.302, 3.65, -1970.059], "rot": [-2.258, 0, 0], "scale": [4.5, 0.5, 8.102], "params": { "tone": "light" } }
```

**Where it touches the ECS.** Only `components` and the body of `instantiate`. Today no object-layer component exists (E's 33 components, engine-portability's count, are the railway's, declared in `src/sim`), so `ComponentInits` starts empty and v1 records leave it out. Whatever is chosen (E, Becsy, bitECS), `ComponentInits` becomes that library's schema names and `instantiate` spawns its entity instead of a `GameEntity`; records, placements, artifacts, goldens and importers do not change.

## 3. Enforcement: one door

1. **Scaffold.** `npm run prefab:new -- <area>.<name>` writes the record stub, a builder stub if asked and the placement line, then runs the compiler. `docs/agents/plugins.md` and `.claude/skills/new-feature/SKILL.md` point at it as the way to add a thing.
2. **Lint** (`dev/lint/policy.ts`, `dev/lint/safety.ts`), each with a shrink-only file list seeded from today's call sites and ratcheted by `npm run registry` like `lint-suppressions.json` (open question 1):
   - `boogle/colliders-from-records`: `addStatic`, `addStatics`, `staticBody`, `createBody`, `slab` only in `src/prefab/`, `src/physics/` and `src/place/land.ts` (48 files listed today).
   - `boogle/seats-from-records`: `registerSeat` only in `src/prefab/instantiate.ts` (3 files listed today).
   - `boogle/records-are-data`: `src/content/**` imports only `src/prefab/types.ts`, `names.ts`, `constants.ts`, `math-pure.ts` and pure layout helpers; no `three`, no DOM globals.
   - From step 9: `signBoard(` and `registerInteractable(` join the same rule (10 and 13 files).
3. **Build check** (`npm run prefabs -- --check`, added to `dev/check.ts` beside `assets -- --check` and to `dev/ship-check.ts` when `src/content/`, `src/prefab/` or `content/built/` change): the committed artifact equals a fresh compile; every placement's `prefab` resolves; every `asset` is in `assets/built/manifest.json` and every `node` is in its node list (the manifest gains `nodes`); every builder, interaction, gate and material name is registered; ids unique per level; no retired key reused; every value is JSON (a function, `NaN`, `undefined` or a class instance fails).
4. **Tests generated from the records** (`test/prefab-records.test.ts`, no per-record code): a collider golden (every placement's world shapes, `test/fixtures/prefab-colliders.json`, regenerated only with `GOLDEN=1`) and a placement golden; invariants for every record: no degenerate collider, a seat's `exit` outside its own colliders and over a floor, a label facing a non-zero direction, a collider-only record has `visual: none`. A new record is covered the moment it exists.
5. **Level check reads the artifacts** (`dev/level/source.ts`): no position is retyped in a tool.

**What a weaker model cannot do wrong:** leave a collider or seat behind on teardown (the owner disposes what `instantiate` made); add a seat with no exit; typo an asset, node or action name; move a mesh and forget its collider (one transform); put a closure or a three.js object in content; add a thing with no test; change a collider without the golden's diff showing it in review; reuse a key.

## 4. Engine mapping

| Record field | Unity | Unreal | Godot |
| --- | --- | --- | --- |
| `PrefabDef` | A prefab asset | A Blueprint actor class (or one generic actor built from a data-table row) | A `PackedScene` (`.tscn`) |
| `visual.asset` (GLB) | Model import (glTFast), `MeshRenderer` | Interchange glTF import, `StaticMeshComponent` | glTF import, `MeshInstance3D` |
| `colliders` | `BoxCollider`/`SphereCollider`/`CapsuleCollider` | Box, sphere and capsule collision components | `StaticBody3D` with `CollisionShape3D` |
| `attach` | Child empty transforms | Scene components or sockets | `Marker3D` children |
| `interactions`, `components` | A `MonoBehaviour` per name with serialized fields | Actor components with properties | A script per name with exported variables |
| `scope` | Scene or parent ownership | Level or owning actor | Scene-tree parent |
| `LevelDef`, `Placement` | A scene of prefab instances with overrides | A level's actors with per-instance properties | A scene that instances `PackedScene`s with overrides |

**An importer** is one editor script per engine (C# editor script, Unreal editor Python, Godot `EditorScript`): read the two JSON formats; convert axes and units (Godot none; Unity flip z; Unreal to centimetres, z up, left-handed); for each record create the asset with its mesh reference, colliders and markers and attach the named component stubs; for each level instantiate by key with transform and `params` as overrides. **What does not map:** procedural builders, TSL materials, batches and gates' functions. **Fallback:** `dev/prefab/bake.ts` runs each builder headless and writes a GLB (three's `GLTFExporter`), so a builder becomes an ordinary model with vertex colours; a `tsl:` material arrives as a named placeholder and the importer prints the list to be rewritten as that engine's shader. Behaviour (interaction handlers, sim rules) is rewritten in any engine; the records tell the port what to rewrite and where it attaches. Engine facts are from general knowledge, not re-fetched (see "Not read").

## 5. Steps

Each is one sitting and leaves `node dev/ship-check.ts` green. No step changes `src/sim`, `src/world`, `src/net`, an op, a wire shape or a save: **no `WORLD_NS` bump is planned** (`v33` stays). Steps marked high-risk say what would force one.

- [x] **1. Types and validator.** Create `src/prefab/types.ts`, `names.ts`, `validate.ts`; `test/prefab-validate.test.ts` with cases: unknown builder, unknown asset, duplicate id, retired key reused, non-JSON value, degenerate collider, seat without exit, unknown version. As built: 11 passing tests also cover unknown nodes, cyclic parents and JSON serialization loss. Deletes nothing.
- [x] **2. Compiler and artifact.** Create `dev/prefab/build.ts`, scripts `prefabs` and `prefab:new` (`dev/prefab/new.ts`), empty `content/built/prefabs.json`; add `--check` to `dev/check.ts` and `dev/ship-check.ts`; add `nodes` to `assets/built/manifest.json` in `dev/assets/build.ts`. As built: canonical sorted keys and 1e-4 numbers, validation before and after rounding, duplicate/stale artifact rejection, scaffolded data and placement, node lists checked against committed GLB bytes. The check-mode test rejects a hand edit without rewriting it.
- [x] **3. `instantiate` and the workshop chair.** First capture the golden from today's code: a test that builds `solidSpecs` and the seat from `makeWorkshop` and writes their world values. Then create `src/prefab/instantiate.ts`, `src/prefab/builders/seat-chair.ts` (wrapping `seatMesh()`), the record in `src/content/prefabs/town.ts`; replace `workshop.ts:65-76` with one `instantiate` call. Proof: the golden is byte-equal after; the orchestrator reports three chair before/after stills with zero differing pixels and identical sit/stand on main and this branch using the chair-focused eval committed as `865e03502`. Deletes the chair's two hand-typed boxes and its `registerSeat` call. Review corrections below supersede the initial visual hold.
- [ ] **4. One greybox platform.** Record `greybox.box` (`src/content/prefabs/greybox.ts`), builder `src/prefab/builders/greybox-box.ts` (the instanced mesh from `boxes.ts:64-75`), level `src/content/levels/gorge.ts` holding the north platform's five spans with ids; `drawGreyBoxes` takes placements for those and `GreyBox` for the rest. Proof: collider golden of all 53 solids equal before and after; `stack-at` still; `describe()` still reports 73 boxes and 53 solids.
- [ ] **Checkpoint A** (the proving slice): `npm run check`, the two stills side by side, `npm run level-check` still 12 reports, `npm run perf` at the Gorge (draw calls and bodies unchanged). The designer and owner rule on the open questions here.
- [ ] **5. Enforcement on.** The three lint rules with their seeded lists, the generated `test/prefab-records.test.ts`, the registry ratchet for the lists, `docs/agents/plugins.md` ("New things in the world are prefab records") and the new-feature skill. Proof: a fixture file with a stray `addStatic` fails lint; `npm run registry` fails when a list grows.
- [ ] **6. High Gorge massing.** All 73 boxes become placements in `src/content/levels/gorge.ts` (the frame helpers move there from `massing.ts`); `massing.ts` keeps only exported constants others import. Proof: goldens equal, `stack-at` and `stack-draws` stills. Deletes `GreyBox`'s collider loop (`boxes.ts:76-82`) and `gorgeMassing()`; removes `route-greybox/boxes.ts` from the collider list.
- [ ] **7. Leg 2 and later legs** (after `greybox/leg2-massing` merges): `Piece`, `Pad` and `Post` become placements of `greybox.box`, `greybox.pad`, `greybox.sign-post` (a `label` attachment; placeholder text stays where it is authored); `dev/level/route-leg2.ts` reads `content/built/levels/*.json`. Proof: goldens, that branch's level report unchanged, one still per area. Deletes the three record types and `leg2-draw.ts`'s collider code. New legs are authored as level files from here.
- [ ] **Checkpoint B:** `npm run check`, perf at Bell Rock, a bot walk of leg 1.
- [ ] **8. The other seats (medium risk).** `railway.machine-chair` (`track-machine.ts:119`) and `railway.car-bench` (`train-view.ts:184-201`, `car-kit.ts:19`) with `parent` set to the moving platform. Seat ids are on the wire through presence: a golden asserts every id string is byte-identical, so no bump. Coordinate with `plan/server-owned-state`, which moves seat authority: whichever lands second rebases. Deletes the last `registerSeat` outside the runtime.
- [ ] **9. Town rooms and furnishing.** `workshop-kit.ts` solids, `rooms.ts`, `curio-shelf.ts`, `shop.ts`, `museum.ts`: each furnishing piece a record whose builder returns its parts, so parts and solids stop being parallel lists. Signs and interactions join the lint rule. Proof: goldens, one still per room. Removes `workshop.ts` from `ENTITY_SERVICES` if nothing else holds it there.
- [ ] **10. Halts and stations (high-risk: reads sim catalogs).** Records for the platform kit (deck, shelter, bench, canopy post, mast, ramp, lever); placements generated by the compiler from `RAIL_HALTS` and `place/layout.ts`, which do not change. No bump. A bump is needed only if a catalog's values or order change, which this step forbids; `test/railway-golden-*.test.ts` unchanged is the proof, plus collider goldens and `npm run loop -- run`.
- [ ] **11. Trees and scattered props (high-risk: tree ids are sim references).** `Blueprint` folds into `PrefabDef` (the `trunk` collider recipe carries over); `LAND_TREES` and `scatterProps()` become placement sources (the scatter stays a seeded generator named in the level). Order and ids unchanged, so no bump; re-keying a tree would need one. Proof: `hut-blueprint` and level tests, collider golden, railway goldens. Deletes `src/blueprints/blueprint.ts`'s types.
- [ ] **12. GLB things.** Every built model gets a `registerAsset` id; records for the engine, passenger car, track machine and carts name `visual.asset`; their animation code stays. Proof: asset check, one still each.
- [ ] **13. The rest:** `src/pois/` (lighthouse, windmills, caves: the 4 files that hold the `use-an-entity` suppressions), Ring Island, the mushroom stall (deletes `dev/level/level.ts:16`'s copy), the lookout, secrets. One area a sitting.
- [ ] **14. Portability proof (if open question 3 is yes):** `dev/prefab/bake.ts` and `dev/prefab/export-godot.ts` write the chair and the Gorge level as `.glb` and `.tscn`. Proof: Godot's headless import lists the nodes and collision shapes with matching counts.

## Level findings

### Step 3 baseline (before conversion)

`test/prefab-workshop.test.ts` executes today's `makeWorkshop` and furnishing with recording service dependencies and the actual forge plan. Committed collider and placement bytes include the wire-visible `forge-workshop` seat id, the world sit/exit poses and the chair's local/world placement. Only `GOLDEN=1` regenerates them. The original chair code is still intact in this baseline commit.

### Step 3 as built; visual proof held

Implemented `instantiate`, the registered `seat.chair` builder, `town.workshop-chair` and the compiled `workshop` level in the room owner's floor frame. The workshop owns the instance with `OwnedView`, toggles its two bodies with readiness, and keeps the original body insertion order and seat registration lifetime. Both baseline goldens remain byte-identical without regeneration. `test/prefab-records.test.ts` validates every compiled record and level, geometry, seat clearance and the current room floor authority. Runtime implementations for assets, batches, named materials and capsule bodies deliberately fail closed until their authored conversion steps; component initializers remain empty.

`npm run check` passed (1,681 passing tests, one existing fleet-wait TODO, no failures; 12 unchanged level reports), as did `node dev/ship-check.ts`, prefab freshness and registry. No source under sim/world/net/server or railway/ring-island/route-greybox changed relative to this job's starting commit `60be20237`. No namespace bump, push, ship, copy edit or device test.

The broker's single-player clock option was incompatible with the trusted launcher; `--real` returned healthy WebGPU captures within ten minutes each. Opened `.look/evidence/1794562229858-61733/prefab-chair-before-real-still.png` and `.look/evidence/1794562620463-72059/prefab-chair-after-real-still.png`: doorway, floor, chimney and furnace guard look unchanged, but the yellow player's pose and red NPC's position differ. The guard obscures the chair's corner. This is not a demonstrated static-geometry regression, but the owner's literal **stop if a still differs** condition fired: no further implementation or visual acceptance. Step 3 stays unticked pending that proof.

The already-running `railway-seats` evaluation was stopped under that condition, within its ten-minute limit. Its verdict is **killed**, not passed; sit/stand proof is owed. Broker manifests: `.look/evidence/1794562229858-61733/evidence.json` (before), `.look/evidence/1794562620463-72059/evidence.json` (after), `.look/evidence/1794562781062-79085/evidence.json` (seat run). They fingerprint the tested source before these as-built prose notes. Not tested on a device; real-time feel remains unverified. Steps 4 and 5 were not started.

Nothing new is placed and nothing moves. `npm run level-check` at `f464b11d2`: 12 reports, all planned or never-drawn track continuity, none on reachability. Each conversion step must leave that list unchanged; the collider goldens are the stricter proof.

### Step 3 follow-up: independent review corrections

The orchestrator supplied the successful browser comparison above and requested five reproduced Astra review fixes. Six regression cases were added first to the existing prefab test files; all six failed before production edits and passed afterward (`.look/prefab-review-fixes/red.log` and `green.log`). Instantiation now refuses a dead owner before allocation and prepares collider recipes while detached, before calling the visual builder or attaching to the owner. The validator and runtime both reject unsupported capsules. Any unequal scale axes reject a rotated collider. JSON arrays are inspected through own property descriptors: holes, non-index properties and accessors fail without executing getters. Asset membership requires `Object.hasOwn`; builder/action/gate/material membership already uses value arrays and is covered by inherited-name rejection probes.

The normal chair's record, mesh builder, placement, seat id and poses are unchanged; the workshop goldens are still byte-equal without regeneration. Initialization ordering changed to validate before attachment, so the existing `workshop-chair.ts` sit/stand eval is the targeted browser refresh; its execution and image verdict belong in the broker evidence and final handoff. The six regression cases, all prefab tests, ship-check, registry and review-stamp are the follow-up checks. No steps 4 or 5, rebase, push, ship or device test.

## 6. What can start today, and what waits

**Step 3 re-review corrections:** exact decomposed-scale equality introduced a false rejection for a unit-scale placement rotated `[0, 0.7, 0]` with collider rotation `[0.3, 0, 0]`. The validator and runtime now share `validateColliderScale` with a named `1e-9` relative tolerance for matrix roundoff. Level/build validation composes authored parent rotations and scales with pure numeric YXZ bases and applies the same collider restrictions, so unsupported nonuniform scales fail compilation too; `[2,1,1]` still fails. Runtime gates must be own function properties, and JSON arrays must have the native array prototype (subclasses fail before serialization). Four new regression tests failed before these edits and passed afterward; the prior six regressions remain in place. No authored chair data, mesh, pose, seat id or browser-visible behavior changed; both goldens remain byte-identical. No new browser proof is required for this correction, and the earlier inspected chair evidence is not being represented as a fresh run. Steps 4 and 5 remain untouched.

- **Today, whatever the ECS choice:** steps 1 to 7 and 9, 12, 13. They touch only views, tools and data.
- **Better after the choice or after option 1:** step 8 (seat authority is option 1's); any use of `components`; turning `scope` into real mount and unload scopes (stage H's other half, which belongs with the scheduler); making a placement spawn a library entity. Steps 10 and 11 can run before the choice but are the ones to review hardest.

## Risks

- **Room safety:** no apply, effect, presence, transport or save change. Step 8's seat ids are the one wire-visible string; the id golden guards it.
- **Mixed builds:** none while placements stay view-only; two builds with different placements already differ today when a view's literals change. Dev phase: no compatibility code.
- **Hotspots:** `dev/lint/policy.ts`, `dev/check.ts`, `dev/ship-check.ts` (a few lines each); `src/main.ts` not touched.
- **In flight** (`npm run inflight`, local branches): `greybox/leg2-massing` and `plan/greybox-leg2-massing` edit `src/entities/route-greybox/index.ts` (step 7 waits for them; steps 4 and 6 rebase if they land first); `ship/matias-franco-599b51e` edits `src/entities/ring-island/view.ts` (step 13); `plan/server-owned-state` covers seats (step 8).
- **Performance:** no new meshes, lights or tick work; one JSON parse and validation at boot (size reported at checkpoint A). Batches must keep today's draw counts: `npm run perf` at checkpoints A and B, cost reported, not a gate.
- **Copy:** The Boogler's lines are not moved into records; a label names where its text lives. Greybox labels are placeholders and not his.
- **Drift to a second system:** if conversion stalls, two ways to add a thing exist. The shrink-only lists make the remainder visible and stop it growing.
- **`GLTFExporter` headless** may need shims in Node; step 14 finds out and is optional.

## Open questions

1. **Record today's call sites as approved debt?** Recommended: yes. The lint rules need the existing 48 collider files and 3 seat files listed so they can be on from step 5 for everything new; registries.md says only the owner approves additions to such lists (`APPROVED_DEBT` in `dev/registry/debt.ts`). The lists only shrink.
2. **The game loads compiled JSON, committed to the repo.** Recommended: yes. It bends "no build step of ours" (**Small and readable**) the way `npm run assets` already does, and it is what proves a record holds no code. The alternative, importing the TypeScript records directly and compiling only for tools, is simpler but lets a closure slip in unseen.
3. **Prove portability with one real export now?** Recommended: yes, Godot, once, after checkpoint B (step 14); not kept in CI. It is the cheapest test that the format is what an engine wants.

No designer call: nothing a player sees or does changes. No Place port is involved.

## Not read

`src/entities/ring-island/view.ts`, `halts-view.ts`, `leg-view.ts`, `train-view.ts`, `track-machine.ts` and `seat.ts` were grepped for declarations, not read through; `src/place/layout.ts` and the sim catalogs were loaded for counts only; `src/entity/walker.ts`, `inspect.ts`, `src/render/assets.ts`, `dev/level/*` beyond `level.ts`'s head, `dev/assets/build.ts`, the asset-author skill, `docs/agents/rendering.md`, `typescript.md`, `sync.md`, `room-safety.md`, `mixed-builds.md`, `docs/plans/asset-pipeline.md`, `entity-components.md` and `level-design-tools.md` were not read. `npm run loop` was not run (no rail beat changes). Unity, Unreal and Godot facts were not re-fetched from their docs. `registerAsset` coverage of the 12 GLBs and the manifest's lack of node names are from grep and the file's head.
