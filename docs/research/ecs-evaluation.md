# ECS libraries versus a stricter GameEntity

> **Verdict:** Build E: in-house ECS-shaped tables with id-ordered systems on the fixed clock.
> **Top recommendations:** 1. Choose Option B, and record it in the decision log as answering the 6 November "evaluate", with this report linked. 2. Build defineTable and run the smallest proof: port the railway state onto it. 3. Land the fixed clock (simTick every N physics steps) before the shared slices, so new tables are born on it.
> **Status:** adopted. See [plan ecs-e](../plans/ecs-e.md), [Process](../decisions.md#process).

## Follow-up spike, 6 November (later): the best entity system for 3,000 entities

_7 November: E is built and timed as option E of this spike; see [ecs-e](../plans/ecs-e.md), "Step 2"._

_The owner questioned the first criteria: "I really want to make sure that we set up our entity system as best possible." So the per-process world limit no longer disqualifies anything (1–2 rooms per server, or dedicated hosting), the target is up to 3,000 live entities, and the judgement is on the long-term fit, not micro-benchmarks. The owner then asked whether bitECS itself had been tried, since "the main thing that's useful seems to be conformance to a sort of ECS system in case we ever need to migrate later". Spike code: [`dev/spikes/ecs/`](../../dev/spikes/ecs/) (its own `package.json`; not wired into the game). Measured on the M1 Max in headless Chromium 156 and Node 26, three Chromium runs per option, with the machine heavily loaded (load average 14–39). Chromium coarsens timers to 0.1 ms, so per-tick numbers are averages over 600 ticks. Not tested on a device. Tags as below._

### Result

**Build E: in-house tables shaped and named as an ECS. Entities are stamped ids, components are declared data-only tables, and systems are functions over queries that run in id order, on the fixed clock. Keep the schema-driven hash and snapshot (binary, as in C). bitECS (D) is the right library if the owner wants an off-the-shelf one; koota isn't.** [M]

- **bitECS works behind a wrapper, and it's fast.** D runs the slice on bitECS 0.4.0 (npm `latest`; no newer stable release). A 115-line wrapper stamps ids, keeps each kind's entities in id order and does hash, snapshot and load. bitECS's own query order still differed between peers with different histories, as did its snapshot bytes. Through the wrapper, all four options produced the *same hash sequence* in Node and Chromium, for an undisturbed peer, a peer with extra local churn, and a late joiner. D's tick was the fastest at normal churn. [H, measured]
- **But lockstep code can't use bitECS's queries, so little of the ECS shape survives in the part that matters.** D's rules walk the wrapper's id-ordered lists and index typed arrays by eid, exactly as C indexes columns. D also adds rules: components must be made per world (two peers in one process otherwise share arrays), an eid is reused at the next spawn after `removeEntity` (read before remove), and there's no change detection (the wrapper keeps change lists). [H]
- **Migration conformance comes from the shape, not the library.** Every engine below is C#, C++ or Rust, so no TypeScript ECS code ports as code. What ports is the decomposition: which components exist, which systems read and write them, their order, and how structural changes are deferred. E gives that decomposition with deterministic iteration built into its queries. D gives it only for code that doesn't need determinism. [M]
- **Readability still decides between in-house shapes.** In A, a rule reads `t.work += 3`. In D, C and B it reads `T.work[e] = …`, with eid or row-index hazards. E keeps typed row access per component (`each([Tree, Age], (id, tree, age) => …)`). [M; E not built]

| At 3,000 live entities (Chromium, latest runs) | A: in-house rows | B: koota 0.6.6 + wrapper | C: in-house SoA | **D: bitECS 0.4.0 + wrapper** |
|---|---|---|---|---|
| Sim tick, ~39 spawns+despawns/tick | 67–68 µs (31–33 in the first runs) | 247–258 µs | 56–57 µs | **42–45 µs** |
| Sim tick, ~170/tick (5× churn) | 249–259 µs | 1,230–1,313 µs | **140–145 µs** | 153–158 µs |
| View update per tick | **11–12 µs** | 98–101 µs | 17–18 µs | 13–16 µs |
| State hash | 0.32–0.34 ms | 0.25–0.33 ms | **0.18 ms** | 0.19 ms |
| Snapshot: time / size | 0.58 ms / 195 KB JSON | 0.61 ms / 195 KB JSON | **0.03 ms / 95 KB binary** | 0.49–0.52 ms / 195 KB JSON |
| Late join: load + rebuild view | 1.5–1.6 ms | 6.9–7.1 ms | **0.8 ms** | 2.5–2.6 ms |
| Same hash and order across histories | Yes | Yes (native: **no**) | Yes | Yes (native: **no**) |
| Slice / core lines (non-blank, non-comment) | **126 / 114** | ~185 / 98 + library | 150 / 128 | ~170 / 115 + library |

All are under 1.5 ms per 10 Hz tick, so all fit a frame. Node gave the same ranking within about ±30%. A's tick doubled between the first runs and these, on a busier machine. Treat 30–70 µs as one band. [H, measured]

### Migration conformance: what a port would rewrite

| Concept | Unity DOTS | Unreal Mass | Bevy | Flecs | A | B koota | C | D bitECS | **E** |
|---|---|---|---|---|---|---|---|---|---|
| Entity | `Entity` (index+version) | `FMassEntityHandle` | `Entity` | `ecs_entity_t` | Row id per kind | Packed number | Row id per kind | Recycled eid; stamped id beside it | Stamped id |
| Component | `IComponentData` struct | Fragment struct | `#[derive(Component)]` | Component | **A whole kind's row** | Trait | A kind's columns | SoA arrays | **Data-only table per component** |
| System | `ISystem.OnUpdate` | Processor | Fn with `Query` | System + query | Function over one table | Fn; lockstep via wrapper | Function over columns | Fn; lockstep via wrapper | **Fn over `each([A, B])`** |
| Iteration order | Chunk order | Chunk order | Archetype order | Table order | Id order | Wrapper only | Id order | Wrapper only | **Id order, built in** |
| Structural changes | `EntityCommandBuffer` | Deferred commands | `Commands` | Deferred | Immediate | Immediate | Immediate | Immediate | **Deferred to end of system** |
| Change detection | Change-version filters | (Observers) | `Changed<T>` | Observers | `touched()` | `Changed()` | `touched()` | Wrapper lists | **`touched()`, per component** |
| Fixed clock | `FixedStepSimulationSystemGroup` | Processing phases | `FixedUpdate` | Pipeline phases | `simTick` | — | `simTick` | — | **`simTick` phase table** |

**What a port rewrites.** From A: the kind tables must be split into components, and every rule changes shape. From B or D: the lockstep systems, since none uses the library's queries, plus all storage access. From E: syntax and storage only; components, systems, order and deferral map one-to-one. None of the engines guarantees lockstep iteration order either (the first report showed Unity swap-removes chunks), so any port keeps E's id-ordered walk as its own layer. [M, from each engine's docs; port effort is an estimate, L]

**Does E get D's migration benefit?** For lockstep state, yes, and more, because D's lockstep code isn't ECS-shaped. For a *JavaScript* move to another JS ECS, D would be nearer in syntax, but the wrapper still has to be rewritten. What D adds that E doesn't is a maintained third party and SoA speed. E can store columns internally (C's storage) whenever a table needs it. [L]

### Re-scored, with the world limit dropped

| Criterion | D bitECS 0.4 | B koota 0.6.6 | miniplex 2.0 / Becsy 0.16 | A / C in-house | **E** |
|---|---|---|---|---|---|
| Lockstep determinism | Wrapper; native order history-dependent [H] | Same [H] | Wrapper needed (not rebuilt) | Built in [H] | Built in |
| Snapshot / hash / load | Wrapper (its serializers aren't canonical) [H] | Wrapper [H] | None | Schema-driven [H] | Schema-driven, binary |
| Change detection | None; wrapper lists [H] | Native, costly [H] | Manual / native | `touched()` | `touched()` per component |
| Relations | Yes | Yes | No / refs | Ids as fields | Ids as fields |
| Agents, many editors | Eid and per-world hazards [H] | 3 extra rules [H] | Familiar / heaviest | Familiar / index hazards | ECS vocabulary, typed rows |
| Tooling | None | None in 0.6.6 [H] | None | `inspect()` | `inspect()` per component |
| Maintenance, licence | Slow; MPL-2.0 | Active, pre-1.0 | Stale / small team | Ours | Ours |

### E in brief (not built)

`defineComponent('tree', { work: 'u8', … })` declares a data-only table keyed by entity id. `spawn([Tree, {…}], [Age, {…}])` stamps an id from lockstep state. `each([Tree, Age], fn)` walks matching ids in ascending order, by intersecting sorted id lists. `defineSystem('fell', { reads, writes, phase: 'simTick', order }, fn)` names its access, as Bevy, Becsy and Unity do. `despawn` and `add`/`remove` are queued to the end of the system. Hash, binary snapshot and load are generated from the component schemas. The view stays a GameEntity kind that drains each component's changes, so GameEntity remains the object layer (Unity's GameObject, Unreal's Actor) and E is the Mass/DOTS-shaped data layer under it. Estimated core: about 250–350 lines plus tests, built by reshaping A [L]. The risk is joins: a query over two components costs more than A's single-table walk. Measure that in the first slice.

### Detail

**What was built.** Place's felled trees, rocks and log piles became three kinds of lockstep state, with the real fields (`work`, `issued`, `ceiling`, `fell`, rock `strokes`, pile `n`). A chop pays logs into the cell's pile, a fifth strike breaks a rock into a stone pile, a take drains a pile. One system walks every entity on a fixed 10 Hz tick. The view keeps one `InstancedMesh` per kind. The op stream for tick *t* is seeded by *t*. Peer A runs 600 ticks. Peer B adds 50 local-only spawns and despawns per tick in the same container. Peer C loads B's snapshot at tick 300. All three compare hash and order at tick 600. Run with `npm install` then `node bench-node.ts` or `node bench-browser.ts`, from `dev/spikes/ecs`. [H]

**Why not koota.** Its strengths are queries, change detection and relations, and lockstep uses none of them. Its change tracking makes the tick 4–8× slower than the others'. [H]

**What would change the answer.**
- The owner prefers a maintained library over our own core, even at the cost of the wrapper rules: take D, and enforce "no `query()` under `src/sim`" with lint. [M]
- Tens of thousands of local, non-lockstep entities (crowds, ecosystems): bitECS for that layer, beside E. [L]
- E's joins proving slow at 3,000, in the first slice's profile: keep A's kind tables, with ECS naming. [L]
- A real plan to port to Bevy or Flecs: write systems in their declare-access style from day one (E already does). [L]

**Unverified:** E itself (designed, not built or timed); device timings; whether a missed `touched()` can be caught by lint or a rebuild test; the engine mappings are from documentation, not from ports; Becsy and miniplex weren't rebuilt.

## First evaluation, 6 November

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
