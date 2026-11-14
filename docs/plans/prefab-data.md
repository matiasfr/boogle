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
- **Artifact.** `{ "format": "boogle-prefabs", "version": 1, "units": "metres", "axes": "x east, y up, z south, right-handed", "rotation": "yaw, pitch, roll in radians, order YXZ", "prefabs": {...} }`; levels the same with `"format": "boogle-level"`. Numbers retain their full JSON precision; keys are sorted, so a diff is the change. Review-4 superseded the original 1e-4 rounding because it could turn accepted orthogonal rotations and compensating scales into shear. The game imports the JSON, not the TypeScript records, and validates `format`, `version` and every reference at load: unknown version or reference throws at boot (fails closed).
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
- [x] **4. One greybox platform.** Record `greybox.box` (`src/content/prefabs/greybox.ts`), builder `src/prefab/builders/greybox-box.ts` (the instanced mesh from `boxes.ts:64-75`), level `src/content/levels/gorge.ts` holding the north platform's five spans with ids; `drawGreyBoxes` takes placements for those and `GreyBox` for the rest. Proof: collider golden of all 53 solids equal before and after; `stack-at` still; `describe()` still reports 73 boxes and 53 solids. As built below corrects these pre-leg-2 counts.
- [ ] **Checkpoint A** (the proving slice): `npm run check`, the two stills side by side, `npm run level-check` still 12 reports, `npm run perf` at the Gorge (draw calls and bodies unchanged). The designer and owner rule on the open questions here.
- [x] **5. Enforcement on.** The three lint rules with their seeded lists, the generated `test/prefab-records.test.ts`, the registry ratchet for the lists, `docs/agents/plugins.md` ("New things in the world are prefab records") and the new-feature skill. Proof: a fixture file with a stray `addStatic` fails lint; `npm run registry` fails when a list grows. As built: generated record coverage already landed in step 3; this step adds passing/failing lint fixtures and the file-identity ratchet (below).
- [x] **6. High Gorge massing.** All 73 boxes become placements in `src/content/levels/gorge.ts` (the frame helpers move there from `massing.ts`); `massing.ts` keeps only exported constants others import. Proof: goldens equal, `stack-at` and `stack-draws` stills. Deletes `GreyBox`'s collider loop (`boxes.ts:76-82`) and `gorgeMassing()`; removes `route-greybox/boxes.ts` from the collider list. As built below corrects the count to 86.
- [x] **7. Leg 2 and later legs** (after `greybox/leg2-massing` merges): `Piece`, `Pad` and `Post` become placements of `greybox.box`, `greybox.pad`, `greybox.sign-post` (a `label` attachment; placeholder text stays where it is authored); `dev/level/route-leg2.ts` reads `content/built/levels/*.json`. Proof: goldens, that branch's level report unchanged, one still per area. Deletes the three record types and `leg2-draw.ts`'s collider code. New legs are authored as level files from here.
- [ ] **Checkpoint B:** `npm run check`, perf at Bell Rock, a bot walk of leg 1.
- [x] **8. The other seats (medium risk).** `railway.machine-chair` (`track-machine.ts:119`) and `railway.car-bench` (`train-view.ts:184-201`, `car-kit.ts:19`) with `parent` set to the moving platform. Seat ids are on the wire through presence: a golden asserts every id string is byte-identical, so no bump. Coordinate with `plan/server-owned-state`, which moves seat authority: whichever lands second rebases. Deletes the last `registerSeat` outside the runtime. As built: ids now key Server-kind rows at v41; all 31 ids and moving-seat pose goldens remain byte-identical. Seat debt shrank 13 files/20 units to 11/15. [Report, checks and inspected images](prefab-data-step-8-report.md); local main lacked step 7, and stale broker smoke required the current worktree npm scenario fallback. Not pushed or shipped; not tested on a device.
- [ ] **9. Town rooms and furnishing.** `workshop-kit.ts` solids, `rooms.ts`, `curio-shelf.ts`, `shop.ts`, `museum.ts`: each furnishing piece a record whose builder returns its parts, so parts and solids stop being parallel lists. Signs and interactions join the lint rule. Proof: goldens, one still per room. Removes `workshop.ts` from `ENTITY_SERVICES` if nothing else holds it there.
- [ ] **10. Halts and stations (high-risk: reads sim catalogs).** Records for the platform kit (deck, shelter, bench, canopy post, mast, ramp, lever); placements generated by the compiler from `RAIL_HALTS` and `place/layout.ts`, which do not change. No bump. A bump is needed only if a catalog's values or order change, which this step forbids; `test/railway-golden-*.test.ts` unchanged is the proof, plus collider goldens and `npm run loop -- run`.
- [ ] **11. Trees and scattered props (high-risk: tree ids are sim references).** `Blueprint` folds into `PrefabDef` (the `trunk` collider recipe carries over); `LAND_TREES` and `scatterProps()` become placement sources (the scatter stays a seeded generator named in the level). Order and ids unchanged, so no bump; re-keying a tree would need one. Proof: `hut-blueprint` and level tests, collider golden, railway goldens. Deletes `src/blueprints/blueprint.ts`'s types.
- [ ] **12. GLB things.** Every built model gets a `registerAsset` id; records for the engine, passenger car, track machine and carts name `visual.asset`; their animation code stays. Proof: asset check, one still each.
- [ ] **13. The rest:** `src/pois/` (lighthouse, windmills, caves: the 4 files that hold the `use-an-entity` suppressions), Ring Island, the mushroom stall (deletes `dev/level/level.ts:16`'s copy), the lookout, secrets. One area a sitting.
- [ ] **14. Portability proof (if open question 3 is yes):** `dev/prefab/bake.ts` and `dev/prefab/export-godot.ts` write the chair and the Gorge level as `.glb` and `.tscn`. Proof: Godot's headless import lists the nodes and collision shapes with matching counts.

## Level findings

### Step 7 as built: leg 2 and later legs

Bell Rock and the West landing load compiled placements; the Gorge retains all 86 placement values and ids while
its incline authoring joins `src/content/levels/leg2.ts`. New static legs use level files. The runtime gains exact
trimesh recipes (both Bell outline prisms retained), four-slot pad batches and label references to unchanged copy.
The distinct overhead sign has its own prefab variant. The level checker reads compiled geometry, marks and
placement references; the complete old report and all collider/placement/count goldens remain byte-identical.

Old-code proof was committed first at `a935137ed`; final implementation is `30ccf502`. Bell/West retain 75/28
visible boxes, 23/8 bodies, 6/1 signs and one massing batch each. Opened before/final stills show unchanged layouts;
total draws stay 304/674, with 12/6 added by named route meshes. Collider debt shrinks 105 files/502 units to
104/500; seat debt stays 13/20. All required static checks pass (137 prefab tests, 1,801 full-check passes and one
existing TODO, 351 ship-check assertions, 13 level reports). Review stamp `3545df41e4f6` marks ten golden/test files;
no independent review, push or ship is claimed. Not tested on a device.

[Full proof, schema extensions, sign texts, manifests and limits](prefab-data-step-7.md). Checkpoint B remains separate.

**Step 7 independent review correction (v41):** the review's missing/moved `bell.rock` mutation reproduced a false
pass before edits. The checker now resolves actual placed colliders and their complete supported world transforms,
including box dimensions/offsets/rotations in West and Gorge and placed pad scales. Six rim mutations fail with a
rim finding; the unmodified report and twelve golden fixtures remain byte-identical. Rebased onto seat step 2 on
`codex/prefab-data-step-7-2`. Final checks pass (147 prefab tests, 1,807 full-check passes and one existing TODO,
362 ship-check assertions, thirteen level reports); stamp `3cd906ad5e43` needs re-review. Fresh Bell and West PNGs
were opened. [Mutation, source and browser proof](prefab-data-step-7-review.md). No push or ship; not tested on a device.

### Step 6 as built: all High Gorge massing

Baseline commit `db0eb0b8` executed the old draw boundary and recaptured the existing collider and placement
goldens with no byte changes; it added the old-code count golden: **86 authored boxes, 84 visible, 55 bodies,
one massing batch**. Step 6 replaces all 86 entries with compiled placements, retaining the five north-platform
ids and original insertion order. `massing.ts` retains only the shared exported coordinates/constants; its
private box/frame authoring moved to the Gorge level. `gorgeMassing()` and the GreyBox collider/mesh construction
loops are deleted. Bell/West descriptors adapt to records at the existing draw boundary until step 7, without
changing their layout sources. No Home, seat, sim/world/net/server or namespace file changes.

Visible solid and decorative records share the same builder/batch; two explicit collider-only placements use no
draw slots. The runtime preserves explicitly authored identity rotations, keeping collider bytes exact.
The pure Gorge coordinate module and leg-2 layout module join the explicit content-helper whitelist; no debt
entry grows. Both converted collider-debt entries disappear (2 and 18 units), along with the `drawGreyBoxes`
construction importer count. Combined collider/seat debt: **120 file entries / 542 units / 64 construction exports /
83 importer counts → 118 / 522 / 63 / 82**; recorded public names drop 371 → 361. Collider debt alone is
107 files / 522 units → 105 / 502; seat debt stays 13 / 20. Distinct files across both lists are 109 → 107.
Door budgets are unchanged.

The plan's 73 boxes/53 solids and 12 level reports were stale; current counts are 86/55 and 13 reports.
Leg 2 has already landed, so its Gorge incline boxes are included while step 7's other areas/tools remain deferred.
The pure authoring helper is named `levelBox`: lint reserves `slab` as a construction call even for a local data
helper. No new suppression or constructor exemption was added. All old Gorge and workshop goldens remain
byte-identical without regeneration after conversion. Final check and broker verdicts belong to this job's
handoff/evidence; timing under shared load is not performance evidence. Not tested on a device.

`npm run check` passed (1,797 tests passing, one existing TODO), all 133 prefab tests passed, and explicit
ship-check against `origin/main HEAD` passed 329 assertions. Registry passed; level-check retained 13 reports.
Review stamp `4e2d96ad98df` flags the count fixture and golden-test assertion changes for the caller's review;
no independent review, push or ship is claimed.

The Gorge-reached, real-time `stack-at` + `stack-draws` captures before (`db0eb0b8`) and after (`9866903d`)
were both opened: stair silhouette, concourse/platform junctions and town pad appear unchanged. Both report
84 visible boxes / 55 bodies, 12 named route meshes, **1,036 total draws / 1,028 without route meshes / 8 added**
and 21,560 added triangles at the same camera. Massing alone remains one batch. Manifests:
`.look/evidence/1794602977655-97763/evidence.json` and `.look/evidence/1794603979321-9671/evidence.json`.
An earlier warped capture failed because the trusted launcher requires two players for `--clock-url`; it
produced no visual proof. Successful captures used `--real`. No full playthrough, device test or motion verdict.

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

### Step 4 as built: north platform

The five curved north-platform spans are now `greybox.box` placements with stable `gorge.platform-n.0` through `.4` ids, compiled into `content/built/levels/gorge.json`. The old north-span construction is deleted; its posts, the south platform and all leg 2 massing stay legacy. `drawGreyBoxes` accepts the mixed records and preserves their insertion order. The runtime owns batched instance transforms, static bodies, enable/disable and disposal; the registered builder preserves the old unit cube, stone material, colour and shadow flags. Legacy and prefab boxes share the same one instanced mesh. The identity-owner/no-collider-rotation path retains authored TRS without decomposition roundoff, after the existing full-world physical validation.

Baseline commit `df0fb9eb` captured all old Gorge collider recipes (including the two hidden stack colliders) and drawn instance matrices/colours before production edits. `test/fixtures/prefab-gorge-{colliders,placements}.json` remain byte-identical without regeneration after conversion; the workshop goldens also remain unchanged. The plan's counts were stale after leg 2 landed: the live description and baseline have **84 visible boxes, 55 solids** (86 boxes including two hidden), and level-check now has **13 reports**, all passing. `dev/level/route-leg2.ts` is unchanged; its artifact migration belongs to step 7. This is a Local scenery refactor: no design, copy, state, namespace or Home changes.

The Gorge-reached broker look using `stack-at.ts` was opened: the light-grey deck is continuous over its posts and meets the concourse without a visible gap; WebGPU reported no graphics errors and `describe()` reported 84/55. The initial manifest is `.look/evidence/1794577000841-76108/evidence.json`; final-tree evidence is recorded in the task handoff. This single still is not a before/after pixel comparison, a movement playtest or performance evidence. No full playthrough, device test, push or ship. `npm run inflight` was omitted because it fetches and this task forbids external networking.

### Step 5 as built: enforcement

The three named rules are enabled in `dev/lint/policy.ts` and enforced by `safety.ts`: collider calls use prefab
records, seat registration uses `instantiate.ts`, and content imports only explicitly listed data/pure helpers
with no browser/DOM globals. Imported aliases and member calls are checked; comment suppressions cannot open
another door. Procedural meshes remain code in prefab builders: the plan never specified a blanket `Mesh` ban.
Signs and interactions still belong to step 9.

`dev/lint/prefab-debt.json` records **54 collider files and 2 seat files**, each with the owner's dated step-5
baseline reason. This includes prototypes and current dynamic-body callers because the specified constructor
ban covers them too. The plan's 48/3 inventory was stale; the chair seat is already migrated. Registry checks
file identities, so even an equal-size substitution fails, and rejects stale exemptions. For a local base that
predates this list it verifies each bootstrap exemption against an actual matching call in that base; once the
base has the list, additions fail outright. Dated reasons are mandatory but never authorize growth. The
fixtures exercise both bootstrap and post-baseline growth, removal, substitution and missing reasons.

`test/prefab-records.test.ts` was already generated coverage from step 3 and remains in place, alongside the
unchanged chair/Gorge goldens and committed artifacts. Plug-in docs and the new-feature skill now route new
placed content through `prefab:new`, data and the owning view's `instantiate`. This tooling-only step changes
no runtime source, game design, Home station, sim/world/net/server, wire shape or `WORLD_NS`.

Checkpoint A remains unticked: this task authorizes step 5, not a claim of its missing performance/owner verdict.
The Godot portability proof remains step 14, after checkpoint B. `npm run inflight` is omitted because it fetches
and this task permits network only to the local broker. No browser run or images are needed for lint enforcement.
Final check results and the source fingerprint are recorded in this task's local handoff/evidence.

### Step 5 independent review corrections

The five accepted findings from the independent review were reproduced first: all five named regression tests
failed before production edits (`.look/prefab-step-5-review/red.log`). Creation API imports are now rejected
outside the named runtime door and debt files, including renamed exports, namespace access, dynamic imports
and require; local aliases cannot hide the original import. Legacy solid helper entry points (`drawWorksBoxes`,
`drawGreyBoxes`, `plank`, `buildLand`, `staticSpheresBody`) follow the same rule. The prefab directory is no longer
a blanket collider exemption: only `instantiate.ts` is. Pure named helpers and type-only imports remain usable.

The debt schema is now `{ count, reason }` per file. Both lint and registry reject excess violations and demand
that fewer violations lower the recorded count; registry additionally rejects per-file budget growth and file
substitution. The expanded rules find **68 collider files / 209 violations** and **3 seat files / 4 violations**
(imports and calls, not runtime object counts). Fourteen additional collider baseline files are existing imports
or helper consumers newly covered by the corrected rule, plus one existing dynamic seat-module importer,
verified against the local base; no runtime code was
added. The baseline transition derives counts from that base's source for the old reason-only schema too; once
the base contains counts, it never accepts file or count growth. Dates remain mandatory.

Content browser-global checks now use lexical scope resolution, so a local `origin`, a shadowed `document` or
a local `globalThis` is valid data code, while unresolved DOM access still fails. Inline `TSImportType` nodes
are covered by the same content import whitelist. Scope analysis runs only on content files; the two creation
rules share their import/call traversal to keep whole-repo lint near the review's four-second median.

These corrections change no runtime source, Home station file, compiled artifact, golden, namespace or game
behavior. No browser run, PNG or bot result is claimed; the fresh static checks, timing samples and final stamp
belong to `.look/prefab-step-5-review/`, superseding this task's earlier static evidence.

## 6. What can start today, and what waits

**Step 5h orchestrator reset:** [the precise-guard audit](prefab-data-step-5-precise-audit.md) supersedes the
rejected `eea9e0a42` reference-taint design. Branch step-5-6 starts from `e09762b0` and rebases onto current main.
Keep the 64-export construction model, private-helper proofs and async value flow; add only distinct capability
import-specifier/namespace-member counts, including named-door budgets. Resolved dynamic reads acquire selected
members, so the look eval reading me does not acquire enterIsland. All eight ordinary fixture groups pass with
unchanged debt; the round-six import addition fails before storage/aliasing. The accepted residuals are listed
once in lint-boundaries.md. Step 5 stays checked; compiled JSON stays committed; Godot remains step 14.

**Step 5g main rebase and ordinary-feature audit:** [the complete audit](prefab-data-step-5-rebase-4.md)
supersedes 5f's totals: rebased onto `721fcffca`, removed three deleted raw-debt files (eight violations),
and corrected generic callback/query false positives. Raw debt is 110 files / 310 violations; construction
exports 64, conservative files 31, formatted debt 954 lines. Actual `setShapes` and injected Shape → Body
factories remain counted. Both the original record-door feature and new HUD-only feature pass without debt
changes. `enterIsland` allocates the lobby player; named player state reads remain free. Step 5 remains checked;
Godot stays in step 14. Depth-one missing-main-debt bootstrap and fresh checks are recorded with the audit.

**Step 5f dynamic-value correction (supersedes the 5e negative ownership audit):** both reported new-consumer
fixtures failed first. Promise.all import destructuring hid lookout's `land.addStatic` and finds' call to the
collider-building secrets view. The general value model now binds await/aggregates, object/array patterns, then
callbacks, local assignments and forwarded values. Private debt helper calls participate in the fixed point.
Exemption candidates receive an unpruned allocation/unknown-use proof, and unsafe ones are automatically counted.
OwnedView-producing factories are discovered even outside raw-capability debt files. Actual owner-only/record-door
factories remain free. The [complete before/after and all-20/ownership audit](prefab-data-step-5-dynamic-audit.md)
records 42 → 92 construction exports, 32 conservative files printed by lint/registry, and the stricter treatment
of the allocating singleton enterIsland. Metadata remains compact (998 formatted lines); raw file/count budgets,
capability import bans, public surfaces, shallow-clone behavior and committed prefab JSON are unchanged.

**Step 5e fourth-review correction (supersedes the shallow-bootstrap and namespace gaps below):** five of six
reproduction tests failed before production edits (the local namespace-import/export control already passed):
namespace forwarding, new forwarding surface, the full OwnedView + instantiate feature, and a depth-one clone
with no merge base. Namespace re-exports retain
constructor identity; schema 5 records compact forwarding surfaces so new re-exports fail even if counts stay flat.
OwnedView is an open lifecycle door. The [62-export audit](prefab-data-step-5-lifecycle-audit.md) removes 20
ownership/query/movement false positives, leaving 42 counted exports and three forwarding bindings. Registry
compares the base debt file directly; missing/older schemas run internal consistency only. A depth-one fixture
checks all three base-schema states. Rebased onto `1af69645b` on `codex/prefab-data-step-5-3`; no runtime source edits.

**Step 5d compact count correction (supersedes the 5c transitive edge ratchet):** the whole-program graph
found 296 exports and 23,539 edges, including shared entity lifecycle, player/ball state and platform services.
That reference/callback closure made routine imports unnecessarily expensive and produced 25,635 JSON lines.
The owner chose a targeted debt-only direct-call fixed point with importer counts, not importer identities.
The four audit probes still fail; ordinary feature registration plus the prefab door passes. The explicit non-constructor list stops at entity lifecycle, singleton player/ball state and platform carry
services; the lint contract justifies each entry. Factory-result and callback-container references no longer
forward callable provenance.
The old edge analyzer/list is removed; schema 4 stores 62 constructor counts inside the existing debt JSON
(961 formatted lines). Capability import bans, frozen surfaces, per-file budgets and content globals stay intact.
Importer swaps and reflection intentionally pass. [Shape, central modules and measurements](prefab-data-step-5-shape.md).

**Step 5c consumer-edge correction (supersedes the approved-API escape hatch below):** the audit's four typed
`makeCar`/`buildMachine` and new/existing-barrel probes were ported first; all four failed before enforcement
edits (`.look/prefab-step-5-edges/red.log`). `dev/lint/prefab-edges.ts` computes a conservative may-reach graph over
lexical bindings, helper/alias/closure references, assigned values, namespace dependency bags and statically
resolved calls. Capability-module functions seed construction reachability; opaque callback/dependency parameters
fail closed. This includes exposed construction-capable values, not just functions which build immediately.
Every construction-capable export of a door/debt provider is computed, not hand-listed. The record-only
`instantiate.ts` public API is the explicit exception so new record-authored content remains possible.

The version-3 `legacy` records freeze each computed API's kinds and real importing files, following renamed,
namespace, dynamic and star/wrapper chains. Forwarding files count as importers too, including tools/tests and
barrels outside `src`; source imports of ignored/unanalyzed project code fail closed. A new barrel or consumer
fails with the prefab door; removed consumers must be deleted. Lint and registry compare the computed set with
the recorded set, and registry rejects new APIs/kinds/edges relative to its base. A fixture changes an existing
pure export into a constructor to prove that public-name freezing alone cannot bless it silently.

The cache fingerprints project code, providers, lockfile, tsconfig and analyzer/visitor code, and writes atomically.
Source-file additions/removals invalidate it. The graph deliberately over-approximates unknown callbacks and
dependency values: its API/edge counts are architectural reachability, not actual body/seat/object counts. It
covers all 50 audit paths and seven injected constructors; that audit list is validation evidence, not production
configuration. Existing approved consumers can reuse an acquired API; arbitrary global/reflected/generated-code
effects remain outside a sandbox guarantee. Rebased on local `origin/main` at `c279b824c` (including Home flip
`9c9b4cd67`) on `codex/prefab-data-step-5-2`. The regenerated baseline has 111 collider files/302 violations,
13 seat files/16 violations, 296 computed exports and 23,539 importer edges. The boiler install view drops its
`POST` export; 107 computed export records change consumer sets (202 edges added, 161 removed) through inherited
Home/railway/tree changes. Every changed entry is listed in [the rebase delta](prefab-data-step-5-rebase.md).
The Home hall treads reuse an existing helper, so their added collider instances do not increase syntactic
violation counts. Final checks are recorded in this follow-up's handoff under `.look/prefab-step-5-edges/`.

**Step 5 structural re-review correction (supersedes its syntax-based boundary notes):** the four new findings
were ported first as five failing fixtures (including both physics and seat laundering). All failed at
`12c3db6fc` before production edits; `.look/prefab-step-5-structural/red.log` preserves the result. Runtime imports
now refer to resolved capability modules, not selected symbol names. A shared native Oxc resolver covers actual
files, extensionless/index paths, tsconfig aliases, query suffixes and symlinks; device/inode identity also closes
case-insensitive and hard-link aliases (the Mac case regression failed before this fix). Native Rapier package
modules are capabilities too. The previous general import rules
had only textual matchers, so there was no real resolver to reuse; the already-locked resolver is promoted to a
direct development dependency without downloading packages. Unknown runtime loaders fail closed, and only
imports/exports that actually erase are exempt (verified against Node's type stripper).

The chosen no-laundering contract freezes runtime export names on every named door and debt file, prohibits
capability re-exports and unbounded star exports, and ratchets public names in registry as well as source lint.
Thus a new physics/prefab wrapper or barrel fails at its first capability import; a trusted file cannot add a
renamed binding or exported wrapper to its recorded public surface. Existing declared API bodies remain trusted
code, not a sandbox against arbitrary global side effects, generated code or malicious edits to approved APIs.
The version-2 debt baseline records **111 collider files / 302 violations** and **13 seat files / 16 violations**,
plus fixed door public names; these counts include all module edges, even imports of non-factory names. The
schema transition derives the new counts and public names from the branch/base common ancestor's existing
source (main independently renamed an old export while this job ran). Opaque `import.meta` loaders, including
Vite globs, also fail closed unless already counted; only `env`/`url` data access is exempt. Future file,
count and export additions fail; fewer violations/exports must lower the record.

Content checks use lexical scope references rather than access syntax: unresolved `globalThis`, `window` and
`self` are rejected at their source, so destructuring and computed access cannot hide a DOM read. Ambient
declarations, type-only bindings and erased imports are not runtime shadows; genuine local bindings still work.
The fixture table covers both reviews, wrappers, barrels, namespace computation, symlinks, aliases, type erasure,
and browser-global binding cases. Runtime source, Home station, artifacts, goldens and namespace are unchanged.
Fresh checks, lint timing and the final stamp live in `.look/prefab-step-5-structural/`; prior evidence is stale.

**Step 3 review-4 serialization correction:** the reviewer’s quarter-turn regression was ported first and failed (`.look/prefab-review-4/red.log`). Choice **(a)**: emit lossless JSON numbers for rotations and all other numeric record/transform fields. This removes serialization roundoff independently of the scale ratio and preserves fractional compensation too; increasing only angle precision would leave that second failure. The sorted-key and array-order rules remain. Both goldens and the committed chair artifacts are byte-identical; no golden or content regeneration was needed.

The 11-row round-trip property table covers seven accepted sources (quarter, eighth and arbitrary yaws under suitable nonuniform parents, cancelling collider rotation, fractional scale compensation, the actual authored chair, and a large supported scale ratio) through compile → parse → validate → instantiate. Two genuinely sheared sources and two scale-ratio boundary cases reject at source, build and runtime load with the same message. A failing boundary probe also showed direct Euler math and runtime quaternion/TRS math differed by amplified ulps: the pure headless basis now follows three.js's exact YXZ quaternion/TRS operation order. No shear predicate or tolerance was relaxed. All 55 prefab tests pass. Instantiation code and the current chair JSON are unchanged, so no new browser run is represented by this correction; the final static checks and stamp are recorded in its handoff. Steps 4 and 5, forbidden source paths, push and ship remain untouched.

**Step 3 review-3 corrections (supersedes the rotated/uniform box restriction below):** the reviewer report at `.look/codex/review-prefab-fix-3/report.md` was read and its four inline regressions ported into the existing world-transform table. All four failed before production edits (`.look/prefab-review-3/red.log`). The one physical rule in `validateColliderWorldTransforms` now rejects every nonorthogonal or non-positive-determinant collider world basis, regardless of whether `c.rot` is present. Orthogonal boxes may have unequal axis lengths; spheres still require uniform scale and trunks equal radial lengths. The checked full collider bases are returned to runtime for body dimensions and orientation, so accepted boxes are built in exactly the frame that was validated.

World points and seat facing now use the actual full-precision composed world matrix; no intermediate rounding or owner/placement decomposition is used for them. Both goldens pass byte-identically without any final rounding or regeneration. Fresh roots take their visibility from the initial `enabled=false` state. The table now has 19 rows (11 allowed, 8 rejected), including separate build/runtime shear regressions, the `10000 × 0.0001` precision witness, disabled visibility, and a collider rotation that cancels frame shear (checked body dimensions, orientation and seat facing). The previous regression cases remain; all 43 prefab tests pass. Final ship-check, registry, review-stamp and the targeted chair look are recorded in the follow-up evidence/handoff. No data, forbidden source, push or ship change.

**Step 3 final world-transform correction:** the compensating owner `[0.5,1,1]` / placement `[2,1,1]` case was reproduced as a failing runtime test before editing production code. `validatePlacement` now checks structure only; runtime no longer validates a placement as an isolated physical level. The sole physical rule is `validateColliderWorldTransforms`: it composes the supplied owner/parent and placement bases with each collider's rotation, checks the resulting world basis using the shared relative tolerance, and rejects unsupported rotated nonuniform world transforms. Level/build validation supplies complete parent chains; runtime supplies its actual composed world matrix before creating a root, visual, seat or body. The normalized basis check also distinguishes uniform scale from equal-length sheared axes.

The table in `test/prefab-workshop.test.ts` covers 14 build/runtime pairs: unrotated nonuniform scale, uniform scale at every level, compensating scales, nonuniform world scale, rotation only on placement/parent/collider, negative and zero placement scales, the previous roundoff case, negative and zero owner scales, explicitly zero collider rotation, and inherited nonuniform owner scale. Eight cases are allowed and six rejected; the nonuniform-world rejection messages agree exactly. The prior regression tests remain. All 38 prefab tests and the unchanged, unregenerated workshop goldens pass; ship-check reports 246 passing assertions. No authored chair data or forbidden source path changed. No push or ship.

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

### Step 7 Linux portability correction

The arm64 byte proof did not establish cross-platform equality of native-derived runtime values. The Linux CI
failure was two one-ULP Bell quaternion differences. The owner chose authored-only artifacts: JSON now stores
frame/bounds/span/path operands and resolves native math on load through the same validated loader used by the
checker. Authored numbers remain lossless; no quantization. All runtime prefab goldens use tight numeric tolerance
with exact structure, strings, flags, order, counts and topology. A significant-digit artifact tripwire and native-math
perturbation freshness test prevent recurrence. This supersedes earlier runtime byte-equality claims.
See [diagnosis, construction proof, checks and opened stills](prefab-data-step-7-portability.md).

### Step 7 rebase with step 8

Rebased onto main's moving-seat records and Boogler step 5. Retained both moving-parent seat fields and step 7's
compound label/batch support; regenerated the conflicted JSON from both record sets. Step 8 now stores authored
seat headings in degrees and resolves radians through the validated prefab loader. Both main seat fixtures remain
byte-identical (31 ids); runtime poses use tight numeric tolerance. Debt only shrinks. See
[merge, conversion, checks and newly opened seat/leg images](prefab-data-step-7-rebase4.md).


### Step 9 partial as built: workshop kit and shop

The owner-requested partial boundary is complete: nine workshop-kit and seventeen shop records own furnishing
parts, solids, sign references and named shop interactions. Old-code goldens were committed first at `063cea718`;
they remain unchanged. Runtime values use the shared tight tolerance; committed artifacts hold authored operands.
The original merged draws, copy, stock/target order and E actions remain. `rooms.ts` gains only the readiness
lifecycle hook: its shell conversion, the curio shelf and museum remain, so step 9 stays unchecked.
Collider debt drops 500 → 498 units; seat debt stays 15. New sign/interaction baselines are verified against old
source and ratchet their raw API budgets, public exports and existing consumer identities. Neither converted kit
nor shop had a direct debt entry to remove; workshop's remaining guard/shell work still holds its service exemption.
Normal and one-ULP-perturbed prefab suites pass; additive native perturbation keeps compiled artifact bytes fresh.
[Full strings inventory, old-code proof, checks, review stamp, opened before/after images and preserved probe failures](prefab-data-step-9-report.md).
No push or ship; not tested on a device.

### Step 9 follow-up as built: curio shelf and finders' bay

The complete curio shelf and bay now use 25 records: both frames with bodies/footprints, each of 22 gifts with its
slot operands, and the shared dust skirt. The old-code golden was committed first and stays unchanged; copy stays
in its authoring files. The same merged meshes, E behavior, obtainable/unobtainable gift handling and crystal/find
pegs remain. Collider debt drops 498 to 496 units, with no list growth. The room shells in `rooms.ts` and the museum
remain untouched, so step 9 stays unchecked. [Copy inventory, golden proof, checks, stamp, opened before/after stills,
finds/wardrobe probes and limits](prefab-data-step-9b-report.md). No push or ship; not tested on a device.
