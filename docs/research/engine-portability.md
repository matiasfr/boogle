# Engine shape and ECS portability, after the railway migration

> **Verdict:** The railway's data layer is already engine-shaped and cheap to move; the rest of the game is not on it, and should not be moved before the playtest.
> **Top recommendations:** 1. Freeze who may import the ECS with one lint rule (no violations today). 2. Close the input rule's leftover exemption (ledger AR-4). 3. Leave storage, scheduler and library choice alone; move the nine classic lockstep states only with replication's R3.
> **Status:** open.

_2026-11-12. Answers the owner's 12 November interest: "more work that we could do to make our engine more like a real
game engine and make it easier if we ever need to migrate to another ECS engine". Code read at `add1b4264`. It builds on
[engine-architecture](engine-architecture.md), [ecs-evaluation](ecs-evaluation.md), [entity-architecture](entity-architecture.md),
[plan ecs-e](../plans/ecs-e.md) and [plan ecs-m12-m13](../plans/ecs-m12-m13.md) and doesn't repeat them. Every number is
from a command at that commit: line counts from `git ls-files … | xargs cat | wc -l`, call counts from regex over the
files named (receivers typed `World`), imports from `git grep`/import-statement parsing, facts from `npm run atlas`. No
code changed._

## Verdict

1. **The part that would have to move is small and fenced.** 44 files under `src/` import `src/ecs/index.ts`, all in
   `src/sim` (34), `src/world` (5) and `src/adapters` (5); only 15 import a value, the other 29 only types. Views never
   import it: they read rows through `ReadWorld` and the row/query modules.
2. **Most of the game is deliberately outside it.** The ECS and its railway code are about 13,300 of 120,111 `src/`
   lines (11 %). The object layer (`GameEntity`), the nine classic lockstep states, seats, the player and all rendering
   use other models, by decisions already recorded.
3. **Nothing here is urgent.** Two lint-sized jobs are worth doing now. The large one (classic states onto components)
   is already planned as replication R3 and collides with "playtest before bespoke functionality" (owner-calls, 12
   November). A library or storage swap buys nothing measurable.

## (a) Against what a small engine gives

| Part | Boogle today (evidence) | |
| --- | --- | --- |
| World, entity, component | `src/ecs/` (3 files, 708 non-blank lines, at its cap in `test/ecs-budget.test.ts`). 33 components and 226 fields in `src/sim/railway-components.ts`: 194 `int`, 13 `u8`, 12 `bool`, 6 `str`, 1 `f64`. Entities are stamped ascending integers | **Fine** for the railway. **Gap:** one domain only |
| Object layer | `src/entity/entity.ts` (`defineKind`, `spawn`, `despawn`): 85 `defineKind` calls in 68 files | **Fine**: Unity's GameObject beside DOTS, as ecs-evaluation chose. Both layers say `spawn`/`despawn`, for different things |
| Scheduling, system order | `createSchedule` sorts by (order, name) and refuses a shared order (`src/ecs/world.ts:137-150`). 65 `defineSystem` calls: 10 in phase `tick`, 55 run by name through `world.run(sys, input)` and return a value (`src/sim/railway-systems.ts:121-135`). Frame side: `src/loop.ts` phases, 138 hooks (atlas), ties broken by import order | **Fine.** Two schedulers (sim tick, frame) is normal: Unity and Bevy also separate fixed and frame groups |
| Queries | `world.each` over up to four components, ascending id. Used 28 times; the sim mostly reads by key: 299 `get`, 39 `single`, 37 `lookup` | **Fine.** Note the usage is keyed lookup, not iteration |
| Events | None in the ECS. `world.changes(c)` is drained once, for replication (`src/world/replicate-world.ts:31`). Client effects come from adapter callbacks: 10 `onApplied(`, 8 `onCorrected(`, 3 `onSnapshot(` call sites in `src/` | **Mild gap**: no event type; not needed until a second domain wants one |
| Resources, singletons | Singleton entities read with `world.single(c)` (13 named in `src/sim/railway-rows.ts`'s header) | **Fine**: Flecs singletons, Bevy `Resource` |
| Scene and asset lifecycle | An entity owns its mesh and bodies from `spawn` to `despawn`; `precompile(` 14 call sites; `src/render/assets.ts` 56 lines. The world is built in code; `src/blueprints/` (227 lines) is the only objects-as-data | **Gap**, deferred on purpose (chunks and streaming wait for the slice) |
| Save, serialisation | Snapshot, hash, load and clone come from the component schemas; load is all-or-nothing with a domain check (`src/ecs/world.ts:487-545`, `src/world/railway-server.ts:347-356`). Clean breaks by `WORLD_NS` (`v32`); atomic rename in `server/src/store.ts:100` | **Fine.** No per-component migration, by the dev-phase rule |
| Input | Action registry in `src/player/controls.ts` (553 lines), 18 `registerAction(` call sites, lint rule `boogle/input-through-actions` | **Fine**, with one hole (AR-4) |
| Render bridge | Components cannot hold a three.js object (declared only in `src/sim`, `src/world`: `dev/lint/policy.ts:135-138`). Views are entities that read rows each frame: 41 `src/entities` files import the row/query modules, 16 name `ReadWorld` | **Fine** |
| Tooling, inspection | `world.inspect()` returns counts only and has no caller outside tests; `src/entity/inspect.ts` (`window.boogle.inspect()`), registry, atlas, `?prof=1` | **Gap, small**: no generic "rows of entity N" view, though the schemas make one cheap |
| Plug-in lifecycle | Eager globs in `src/main.ts:39,41` (features, entity indexes), `onStart`; hooks have no unregister | **Fine** at one island; engine-architecture's watch list owns the trigger |

## (b) What sits outside the ECS

| Area | Size | Model it uses |
| --- | --- | --- |
| On the ECS: `src/ecs`, `src/sim/railway*.ts`, `src/world/replicate*.ts` and `railway-*.ts` | 720 + 10,463 (57 files) + 2,076 lines | Components and systems, Server sync kind |
| Railway views, `src/entities/railway/` | 95 files, 25,562 lines | `GameEntity` objects reading rows |
| Other entities, `src/entities/` less the railway | 60 files, 10,531 lines | `GameEntity` |
| Classic lockstep: `src/world/rules/` and non-railway `src/sim/` | 12 files, 949 lines; 21 files, 1,588 lines | 9 `registerState` calls with hand-written serialize, hash and load |
| Seats: `src/entities/railway/seat.ts`, `seat-claims.ts` | 396 + 80 lines | Host field `placeSeatGrants`, presence `placeSeatRequest` and `placeSeatPose`, two `onFrame` hooks; on `ENTITY_SERVICES` (`dev/lint/policy.ts:192`) |
| Workshop: `src/entities/town/workshop.ts` | 184 lines | Old wiring, on `ENTITY_SERVICES` (`policy.ts:193`) |
| `src/features/` | 66 files, 7,311 lines | Plug-ins; 40 of the 138 frame hooks |
| `src/player/` | 45 files, 4,872 lines | Module state (`me`, `cam`), the input layer |
| `src/place/` | 36 files, 8,264 lines | The village kit moved out of the prototype; plain modules |
| `src/proto/` | 40 files, 8,150 lines (greybox 2,923, net 1,594, crossing 909, wagon 758, terrain-pass 728, playdata 646) | Prototypes behind flags; `src/proto/place` is gone |
| `src/pois/` | 12 files, 2,260 lines | Pre-entity; the only `lint-suppressions.json` entries (20 `use-an-entity` in 4 files) |
| three.js objects read as state | `.userData` 107 times in 31 files (30 outside proto) | Cosmetic. The widest is `avatar.userData.seatedAt`, written in `seat.ts:204,292` and read in `entities/wardrobe/view.ts:256` and `player/buddy/rig.ts:105`; typed at `src/player/avatars.ts:35` |

Also still on the old calls: 46 `onFrame(` in 30 files (9 in proto) and 44 `scene.add(` in 23 files; the entity ratchet
already stops new ones.

## (c) Portability

**Who imports the API.** `git grep -lE "from '[^']*ecs/index\.ts'"`: 74 code files. `src/`: 44 (the 34 `src/sim/railway-*`
and `town-facts.ts`, 5 in `src/world`, 5 `src/adapters/railway-*`); `test/`: 26; `dev/`: 3; `server/test`: 1. No file
reaches past the facade (`ecsBan`, `policy.ts:131-134`; grep finds none).

**How wide.** Imported names, by files in `src/`: `World` 41 (type), `defineSystem` 11, `AnyComponent` 4, `createWorld`
2, `defineComponent` 2, `RowOf` 2, and `createSchedule`, `System`, `MAX_STR`, `validValue`, `FieldType`, `FieldValue` 1
each. Call sites in those 44 files: `get` 299, `mut` 199, `single` 39, `lookup` 37, `each` 28, `spawn` 26, `run` 15,
`count` 9, `ids` 8, `nextId` 3, `despawn` 3, `has` 2, `hash` 2, and `snapshot`, `clone`, `reserve`, `changes` 1 each:
about 675. Of `World`'s 21 methods, `add`, `remove` and `inspect` have no caller outside tests, so no entity changes
its component set after spawn.

**What is non-standard, and against what.** Library behaviour is taken from ecs-evaluation's 6 November reading and
spike, not re-fetched.

| Trait of E | bitECS | miniplex | Becsy | Bevy / Flecs |
| --- | --- | --- | --- | --- |
| Ascending-id iteration, built in (lockstep needs it) | Swap-remove order: needs the wrapper | Shuffle-pop: wrapper | `orderBy` exists | Archetype/table order: keep an id-ordered walk as our own layer |
| A row is a plain mutable object; `get` returns the live row, `mut` marks it changed | SoA arrays indexed by eid: every `get`/`mut` site changes unless the facade hides it | Same shape | Handles valid only inside a system | `&T` / `&mut T`: maps directly |
| Sparse per-component tables, no archetypes; component set fixed at spawn, `requires` checked | Compatible | Compatible | Compatible | Compatible; `requires` is Bevy's required components |
| Declared reads and writes, checked at run | None | None | Same idea | Same idea |
| 55 of 65 systems take an input and return a result, run by name | No systems at all | No systems | Systems take no input | Bevy one-shot systems with `In<T>`; Flecs has no equivalent. **The largest shape gap** |
| `lookup` by key field (37 calls), `single` (39) | Hand-built map | Hand-built | Hand-built | Flecs names and singletons; a Bevy resource map |
| Stamped ids, `reserve(id)`, negative temporary ids for prediction (`src/world/railway-predict.ts:218`) | Recycled eids: keep our id beside | Own ids anyway | Own ids | Generational ids: keep our id as a component |
| Canonical hash, snapshot, load, copy-on-write clone from the schema | Not canonical | None | None | None: stays ours in every case |
| Integer sim: 194 of 226 fields `int`; one `f64` (`tree.yaw`, sent by the client and stored, never computed); 6 `str` | Strings need a side table | Fine | Fine | Fine |

**Cost today.** Swapping the store under the same `World` interface (bitECS, or column storage of our own) touches the
3 files of `src/ecs` and none of the 74 importers, because every use goes through 18 methods of one interface. Changing
the API's shape (to a library's native calls) touches the 44 `src/` files (8,178 lines) and about 675 call sites, plus
26 tests. A port to Bevy or Flecs rewrites the 57 railway sim files (10,463 lines) in another language whatever we do
now; what carries over is the component table, the system list with its declared access and order, and the tests'
hashes. The 95 view files move with the renderer, not with the ECS.

## (d) Work, ranked

| # | Work | Size | Risk to lockstep | Unlocks | Lint can hold it | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Freeze the ECS's importers.** `src/ecs/index.ts` values only from `src/sim` and `src/world`; types also from `src/adapters`, tests, tools; views take `ReadWorld` | S | None | The 44-file blast radius stays 44; a view can never write the mirror | Yes, 0 violations today (ledger AR-6) | **Now** |
| 2 | **Close the input exemption** (ledger AR-4): drop `src/place/**` and `machine-model.ts` from `INPUT_ALLOW`, give `talk.ts` its own entry | S | None | One input door, in 36 more files | Yes, it is the rule | **Now** |
| 3 | **A schema-driven row inspector** in the Dev menu and `npm run inspect`: components of an entity, entities of a component, from `world.components` | S to M | None (reads `ReadWorld`) | The inspection a real engine has; replaces ad hoc dumps | No | **Now, if a tool is wanted before the playtest**; otherwise with the next state bug |
| 4 | **Classic lockstep states onto components** (`gifts`, `stacks`, `piles`, `sites`, `sources`, `bank`, `roster`, `tune`, `opening`): replication's R3 | L | High: nine saved shapes, a `WORLD_NS` bump, every adapter | One data model, one hash and snapshot path; deletes nine hand-written serialize/hash pairs. Seats to the Server kind are separate and already placed "with the passenger and train work" (the migration plan's answer 21) | Yes, after: no hand-written `registerState` handlers | **Not now.** After the playtest, as R3 |
| 5 | **Name the two kinds of system** (scheduled; one-shot with input and result) in `defineSystem`'s types, and keep ecs-e's engine-mapping table current | S | Low (types and names) | A one-to-one map to Bevy one-shot systems or events | Partly: `test/railway-census.test.ts` | **Only if a migration is chosen** |
| 6 | Swap storage or adopt a library; merge the sim and frame schedulers; a scene file format; ECS events; moving views or the player into components | L each | High or none | Nothing measured: the spike put a 3,000-entity tick at 42 to 68 µs for every option | n/a | **Not worth it** |

## Not checked

- Library facts (bitECS, miniplex, Becsy, Bevy, Flecs) were not re-fetched; they are ecs-evaluation's, 6 November.
- No test, lint, typecheck, perf or browser run. Counts are regex counts: receivers not typed `World` in the same file
  are missed (`load` is counted separately: 1 call with `railwayCheck` in `src/`, plus `src/sim/railway-drive.ts`).
- The 57 railway sim files and `src/adapters/railway-effects.ts` were sampled, not read through; "Events" above rests
  on call-site counts.
- `server/src` (23 files, 4,117 lines) and `dev/` tools were not surveyed beyond their ECS imports.
- Whether item 1's rule needs a type-import allowance for `src/entities` (none imports the facade today).
