# ECS libraries versus a stricter GameEntity

_6 November 2026. Answers the owner's 6 November call "Entity model, evaluate" (recorded in commit `77d8f7b9`, on `ship/matias-franco-77d8f7b`; not on `main` when this was written). Source audit at `2e289307`. Library facts come from npm, each repo's source and docs, fetched today. Timings come from a scratch Node 24 micro-benchmark on an M1 Max: one run of seven repeats, with other agents loading the machine. No browser, device or Boogle-runtime measurement was taken. Tags: [H] checked in source or measured, [M] a documented claim or one measurement, [L] estimate or inference._

## Result

**The stricter in-house GameEntity wins. Take three ideas from ECS, not a library.** [M]

- **Place's graduation is already running, in a shape that works.** Production-core moves Place's railway into plain typed state in `src/sim/` (1,971 lines), lockstep rules in `src/world/rules/railway.ts`, an adapter, and an entity view in `src/entities/railway/` (2,869 lines). That split is the Unreal Mass / Unity DOTS idea (data plus stateless processors) applied to the part that needs it. An ECS library would swap the container under that work. It would not remove any step. [H]
- **No library solves the hard part.** None gives canonical iteration order, server-stamped ids, a hash that is identical on every machine, or validated snapshot loading. bitECS, miniplex and Unity's own chunks all fill a removed slot by moving the last element into it. So after churn, iteration order depends on history, and a late joiner who loads a snapshot iterates in a different order from a peer that has been running a long time. Lockstep code has to sort by a stable id whichever option is chosen. [H]
- **Koota, the most actively maintained candidate, caps a process at 16 worlds.** The server keeps up to 20 rooms loaded (`MAX_HOSTED_ROOMS`). One world per room fails at room 17; I reproduced the error. [H]
- **Speed doesn't separate the options at our scale.** Plain arrays cost 4–51 µs per tick for 300–3,000 entities; bitECS costs 3–13 µs. Koota (31–335 µs) and Becsy (56–800 µs) cost more, as I used them. [M]
- **What to take from ECS:** components declared as typed schemas, so serialization, hashing and inspection come for free; typed queries over kinds in a fixed order; and the fixed-clock phase table. Option B below.

Revisit a library only if simulated entity logic shows up in `?prof=1`, or if one system walks more than about 10,000 entities per tick. bitECS is then the candidate. [L]

## Comparison

| | bitECS 0.4.0 | miniplex 2.0.0 | koota 0.6.6 | Becsy 0.16.1 | ECSY 0.4.3 | **B: stricter GameEntity** |
|---|---|---|---|---|---|---|
| Maintenance | Release Dec 2025; repo pushed Aug 2026; 1.5k stars | Last release Jul 2023; repo pushed Apr 2026 | pmndrs; canaries published today; 51 open issues | Releases Mar 2025 and Oct 2026; small team | **Archived** (repo read-only since Apr 2025) | Ours |
| API style | Bare functions; components are any arrays (SoA or AoS) | Entities are plain objects; archetype queries; no systems or scheduler | Traits, `world.spawn`, `updateEach`, relations, React bindings | Class systems that declare read/write access; scheduler; `maxEntities` fixed when the world is created | Class systems | Kinds with methods (Unity shape), plus typed state, declared tables and typed queries |
| TypeScript fit | Good; component typing is loose | Best: an entity is a typed object | Good; trait inference | Verbose schemas; decorators optional | JS-first | Native |
| Measured µs/tick, 300 / 3,000 entities, 5 spawn + 5 despawn per tick [M] | 7.3 / 13.3 | 9.4 / 55.8 | 43.4 / 334.7 | 63.1 / 779.9 | not run | 4.4 / 38.8 |
| three.js | None; store refs in AoS arrays | Any field can hold an `Object3D` | `trait(() => new Mesh())`; React-first | `Type.object` | Had a three.js add-on | `mesh` and `bodies` on the entity, as today |
| Snapshot / serialization | **Yes**: SoA, AoS, observer and full-snapshot binary serializers; default buffer 100 MB | None; you bring your own ids | None documented | None documented | None | A declared table gives serialize, load and hash by float bits |
| Lockstep fit | Ids are recycled immediately unless you opt into versioning; iteration follows swap-remove order | Object identity; README says to manage your own ids for networking; iterates in reverse with shuffle-pop | Ids pack world, generation and index; **16-world limit** | `orderBy` exists; handles are invalid after a system finishes unless you `hold()` them | n/a | Integer ids stamped by the server; iteration sorted by id or spawn order |
| Bundle, min / gzip (esbuild) [H] | 12.8 / 4.7 KB (22.8 / 7.8 with serialization) | 16.1 / 3.9 KB | 36.5 / 11.0 KB | 103.9 / 25.4 KB (perf build 80.8 / 20.2) | n/a | ~0 new |
| Licence | MPL-2.0 (changes to its own files must be published) | MIT | ISC | MIT | MIT | — |
| Node / server | Yes | Yes | Yes, but 16 worlds per process | Yes; multithreading docs read "TBW" | — | Yes (`headless.ts` pattern) |

Others checked: `@thi.ng/ecs` is maintained (Apache-2.0, part of a large umbrella of packages) but has a small user base. `objecs` is new (2026, v0.2). geotic, ape-ecs, wolf-ecs, piecs, sim-ecs, harmony-ecs and Javelin have had no release since 2022–2023. None is worth considering ahead of bitECS or miniplex. [H for release dates]

**How the benchmark worked:** position plus velocity integration in each library's documented idiom. Koota used `updateEach`. Becsy also ran its perf build and gave the same numbers. Koota's direct store access, and Becsy used another way, may be faster; neither was tried. Script: `scratchpad/ecsbench/bench.mjs` (not committed). [M]

## 1. The candidates

- **bitECS** ([repo](https://github.com/NateTheGreatt/bitECS), [Intro](https://github.com/NateTheGreatt/bitECS/blob/main/docs/Intro.md), [Serialization](https://github.com/NateTheGreatt/bitECS/blob/main/docs/Serialization.md)). The leanest and fastest option, with real serializers. Used by Mozilla Hubs and Third Room. Several parts work against lockstep: `removeEntity` recycles ids at once; `SparseSet.remove` swaps the last element into the removed slot ([source](https://github.com/NateTheGreatt/bitECS/blob/main/src/core/utils/SparseSet.ts)); removals are deferred until the next query. Its binary snapshot preserves the world's internal dense order. I infer, without having tested it, that the bytes are not identical across peers with different histories. So `registerState`'s hash would still need its own canonical walk. [H for the source, L for the inference]
- **miniplex** ([repo](https://github.com/hmans/miniplex)). The most readable ECS for TypeScript, because an entity is a plain typed object. It has no scheduler "by design", so it would sit inside our loop. No releases in three years. Removal is shuffle-pop ([Bucket.ts](https://github.com/hmans/miniplex/blob/main/packages/bucket/src/Bucket.ts)). Value queries need a manual `reindex`. [H]
- **koota** ([repo](https://github.com/pmndrs/koota)). Actively developed by the react-three-fiber group, and it ships an agent skill. It is React-first state management, and there is no serialization in its README. The world limit is in source: `WORLD_ID_BITS = 4` ([pack-entity.ts](https://github.com/pmndrs/koota/blob/main/packages/core/src/entity/utils/pack-entity.ts)), and the 17th `createWorld` throws ([world-index.ts](https://github.com/pmndrs/koota/blob/main/packages/core/src/world/utils/world-index.ts)). [H]
- **Becsy** ([docs](https://lastolivegames.github.io/becsy)). The closest to Unity DOTS: access entitlements, a scheduler, query `orderBy`. Its multithreading page is still "TBW". It is also the heaviest option: 25 KB gzip, `maxEntities` fixed at creation, and handle rules agents would have to learn ([entities](https://github.com/lastolivegames/becsy/blob/main/docs/guide/architecture/entities.md)). [H]
- **ECSY** ([repo](https://github.com/ecsyjs/ecsy)). Archived. Excluded. [H]

## 2. Option B: a stricter GameEntity

Keep `spawn`, `despawn`, `defineKind` and the order table. They already match Unity's GameObject and MonoBehaviour, Unreal's Actor and Component, and Godot's node callbacks ([entity-components research](entity-components.md#what-the-engines-actually-offer)). Add these:

1. **Declared state tables for lockstep.** `defineTable<Row>({ key, id: 'int', fields: { x: 'f64', count: 'u32', … }, validate })` returns `rows` sorted by id, plus `serialize`, `load` and `hash` (floats hashed by their bits, `NaN` and `-0` rejected). It also registers through `registerState` and appears in `inspect()`. This is the ECS benefit worth having: a schema, so the three functions can't drift apart. Today `hashRailway` is `JSON.stringify` over a hand-written serializer ([railway.ts:412](../../src/sim/railway.ts)). [M]
2. **One fixed clock.** Physics stays at 60 Hz. Entity `fixedPre` and `fixedPost` stay on it, and a new `simTick` phase runs rules every N steps, replacing the 10 Hz timer. This is Unity's `FixedUpdate`, Godot's `_physics_process`, and Fiedler's [fixed timestep](https://gafferongames.com/post/fix_your_timestep/). [M]
3. **Typed queries.** `each<T>(kind)` walks live entities in spawn order and allocates nothing (the existing walker). Lockstep code queries tables, never entities. [M]
4. **State and view enforced by lint.** A kind's `state.ts` holds plain JSON-safe data with no three.js. `view.ts` exposes `syncFrom(state)` and must rebuild after a snapshot. A Node test loads each kind's `headless.ts` with no DOM. Part of this exists already (`test/entity-state-node.test.ts`). [H]
5. **Owner and Host as declared fields on a kind**, built on today's `addPresenceField` and `createOwnerSync`, so a kind lists its network fields in one place. [M]

**Cost:** about 400–700 lines of core plus unit tests, and two or three agent-days [L]. No dependency, and no second model next to GameEntity.
**What it doesn't give:** cache-friendly SoA layout, automatic system scheduling, relations. None is needed at hundreds to low thousands of entities. [M]

## 3. How each option meets our needs

| Need | ECS library | Option B |
|---|---|---|
| Lockstep state that hashes and snapshots identically | Must add canonical sorting, server ids, validation and float-bit hashing on top. bitECS's serializer helps with transport only | `defineTable` does it once, in the sim, with no three.js |
| Owner/Host presence | No library networks state; `createOwnerSync` stays, wrapped in a component | Unchanged helpers, declared on the kind |
| Server simulation in Node, no three.js | All run in Node. Koota's world cap blocks one world per room | `headless.ts` already loads in `dev/sim`. Server physics loads the same headless kinds. Rapier needs bodies added in the same order ([Rapier determinism](https://rapier.rs/docs/user_guides/javascript/determinism)), which spawn-order walks keep |
| Views rebuilt from state | Possible, by convention | `syncFrom(state)` plus a snapshot-rebuild test |
| Plug-in features | Systems become global functions, so ordering across features needs a scheduler (Becsy) or our table anyway | `features/` glob, `defineKind` orders, `npm run registry` |
| Agent readability, many editors | A new vocabulary, and agents must learn ids, handles and deferred removal. Components shared across systems invite edits that act at a distance | One file per kind, literal orders, lint boundaries. What agents edit today stays the same |

## 4. Conforming to tested engines

- **Unity:** GameObjects and MonoBehaviours are the default gameplay layer. DOTS is an opt-in package for large counts, and it bakes from GameObjects. Its chunks also swap-back on removal: "the last entity of the chunk is moved to fill the gap" ([archetypes](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/concepts-archetypes.html)). Even DOTS does not give canonical order. [H]
- **Unreal:** Actors and Components are the gameplay layer. Mass is a separate framework of fragments and stateless processors for data-oriented work ([Mass overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-entity-in-unreal-engine)). [H]
- **Godot:** nodes and scenes only, with separate process and physics-process clocks. [H]
- **Overwatch** shipped an ECS to "curtail complexity" in gameplay and netcode ([Ford, GDC 2017](https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and)). It is the strongest case for an ECS. It was a custom engine with a team behind it, and the payoff was reported to come late ([engine research](engine-architecture.md#dont-flag)). [M]

**Where Option B departs from these engines, and why:** Boogle has no separate data-oriented entity layer. The lockstep sim already plays that role, holding plain records in `src/sim/` with rules as processors. A Mass-style layer at hundreds of entities would add a model without the need that justifies Mass. That makes Option B the conservative, engine-shaped choice: the Actor/GameObject layer for objects, and a Mass-like data layer only where determinism demands it. [M]

## 5. Migrating Place under Option B

Place today has 93 files and 25,259 lines. It contains 1 `defineKind`, 17 `onFrame`, 4 `onPreStep`, 84 `scene.add`, 12 presence fields, 1 host field, 14 shared and 10 personal save slices, and a throwaway oldest-tab authority in `coop.ts`. [H]

Order of work:

1. **Core first, with no Place change:** `defineTable`, the `simTick` phase and the lint rules. Then port the railway's serialize, hash and load onto a table, and prove that hashes and snapshots match the current tests. (~1 slice)
2. **Shared slices, one domain at a time,** following production-core's rule that a room never runs both owners for one material. Felled trees and rocks, then forge, depot, cargo/trains, tech gates, town numbers. Each slice gets a sim table, rule ops, an adapter, and an entity whose view rebuilds from state. This also retires `coop.ts`'s JSON-per-second authority. (~8–10 slices)
3. **Personal slices** (gifts, crystals, your back) become personal saves with Owner presence fields declared on their kinds. (~2–3 slices)
4. **Frame code:** the 17 `onFrame` and 4 `onPreStep` hooks become kinds, and the 84 `scene.add` calls move into owning entities' views. Layout and terrain stay as data plus a build function. (~3–4 slices)
5. **Delete `src/proto/place`** once nothing imports it; archive tag per owner-calls.

**Size:** about 15–20 merge-sized slices. Most of Place's lines (layout, models, look, copy) move without changing. The risky code is the roughly 5–6k lines of state and authority in `job.ts`, `coop.ts`, `run.ts`, `chop.ts`, `cargo.ts` and `tech.ts`. [L]

**Keeping it playable throughout:** each slice lands on `main` with the existing solo and co-op route bots (`npm run checks-for`, look evidence) and a `test:net` hash test for the new table. The default URL keeps running Place until each material switches over. Bump `WORLD_NS` instead of migrating saves. The same plan under a library would add a sixth step: re-hosting `GameEntity` and the walker, or running both models side by side. [L]

## 6. Recommendations

1. **Choose Option B, and record it** in the decision log as answering the 6 November "evaluate", with this report linked.
2. **Build `defineTable` and run the smallest proof:** port the railway state onto it, then port **Place's felled trees and rocks** (`chop.ts` shared slice) to a lockstep table, plus one `place-tree` view kind. Measure four things: lines before and after; whether snapshot → load → hash matches across two peers in `test:net`; late-join rebuild in a two-tab route bot; and per-kind cost in `?prof=1`, with less than 0.05 ms a frame as the bar.
3. **Land the fixed clock** (`simTick` every N physics steps) before the shared slices, so new tables are born on it.
4. **Add lint:** no `scene.add` or `three` imports in `state.ts`; lockstep tables only through `defineTable`.
5. **Migrate Place in the order of section 5**, one domain per slice, with no long-lived branch.
6. **Re-evaluate bitECS** if step 2's profile or a future system (crowds, particles in the sim) needs more than about 10k entities per tick. Don't adopt koota for the server while its 16-world limit stands.

**Risks:** Option B is our own design, which is what the owner wants less of. It is mitigated by mirroring the engine shapes above and by keeping the core small. `defineTable` could grow into a framework, so cap it to schema, sort, serialize and hash. Server physics and the fixed clock may reveal ordering needs this design hasn't met. [M]

**Unverified:** whether bitECS snapshot bytes differ across histories (inferred from source); Koota's and Becsy's best-case speed; any browser or device timing; all size estimates; whether `defineTable` covers the railway's packed line codes without special cases. Not tested on a device.

## Sources

npm registry metadata (`npm view`, 6 November 2026); GitHub API repo status; library sources linked above; [bitECS Intro](https://github.com/NateTheGreatt/bitECS/blob/main/docs/Intro.md) and [Serialization](https://github.com/NateTheGreatt/bitECS/blob/main/docs/Serialization.md); [miniplex README](https://github.com/hmans/miniplex); [koota README](https://github.com/pmndrs/koota); [Becsy world](https://github.com/lastolivegames/becsy/blob/main/docs/guide/architecture/world.md), [queries](https://github.com/lastolivegames/becsy/blob/main/docs/guide/architecture/queries.md), [deploying](https://github.com/lastolivegames/becsy/blob/main/docs/guide/deploying.md); [Unity Entities archetypes](https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/concepts-archetypes.html); [Unreal Mass](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-entity-in-unreal-engine); [Rapier determinism](https://rapier.rs/docs/user_guides/javascript/determinism); [Ford, GDC 2017](https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and); [Fiedler](https://gafferongames.com/post/fix_your_timestep/). Repo context: [entity-architecture plan](../plans/entity-architecture.md), [entity-components](entity-components.md), [engine-architecture](engine-architecture.md), [production-core](../plans/production-core.md).
