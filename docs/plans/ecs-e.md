# Plan: E, the in-house ECS-shaped store

> **Status: plan, 7 November 2026.** Owner call of 6 November, confirmed 7 November: "Build ECS-shaped E now, one
> domain at a time, starting with the railway's components" ([decision log](../decisions.md#process),
> "entity model: build E"; [ecs-evaluation](../research/ecs-evaluation.md), "E in brief"). Code read at `bb084e75`.
> The owner asked for a critical, adversarial plan: the aim is not our own engine but a data layer whose shape a real
> ECS (Bevy, Flecs, Unity DOTS) takes over by rewriting syntax and storage, not design.

## Result

- **One facade, `src/ecs/index.ts`:** `defineComponent`, `createWorld`, `defineSystem`, `runSystem`/`runPhase`. A
  world holds data-only component tables keyed by stamped integer entity ids. Queries walk ascending id order.
  Structural changes inside a system are queued to its end. Hash, snapshot, load and clone are generated from the
  component schemas.
- **The component schema is the replication schema.** A component *is* a `Schema` (`kind`, `fields`, `names`), so
  `RAIL_SCHEMAS` becomes the railway's replicated components and replication's field types move into `src/ecs/`.
  There is one table of fields per component, read by the codec, the client mirror, the save, the hash and the
  engine-mapping table below. That table is the migration asset.
- **The railway moves first, whole** (trees, hardwoods, rocks, piles, accounts, the three line-one jobs, Q1-Q3, the
  beam, the forge, the global row, the request history). Its rules become systems that declare what they read and
  write. Its hand-written save encodings, JSON hash and the server's projections go. The client keeps reading
  today's `Railway` shape, now a *derived read model* rebuilt from the world, so the adapter and views do not change.
- **The core was capped at 650 non-blank lines in step 2 and is 708 after step 3** (450 planned; see step 3's
  notes: the growth is flagged for the owner, not re-capped), with a closed feature list (below). Anything past it is a reason to
  adopt a library, not to grow E.

## 1. Where it lives, and why

`src/ecs/`: pure TypeScript with no imports from the rest of `src/`, in `LOCKSTEP_FILES` (no `Math.random`, wall
clock or native trig: it hashes). `src/sim/` may import it (one lint exception, `../ecs/index.ts` only). Not
`src/sim/ecs/`, because E will also hold Owner-kind domains (section 6) that are not rule code, and not
`src/world/`, because the rules in `src/sim/` must be able to use it. Components and systems are declared only in
headless directories (`src/sim/`, `src/world/`), which already ban three.js, the DOM and physics.

## 2. API

```ts
import { defineComponent, createWorld, defineSystem, runSystem, runPhase } from '../ecs/index.ts';

// Field types are replication's: bool u8 u16 u32 i32 int q16 f32 f64 str. Rows are typed from them.
const Tree = defineComponent('tree', { slot: 'u16', left: 'int', work: 'int', yaw: 'f64', fell: 'bool' }, {
  key: 'slot',          // a unique index: world.lookup(Tree, 12) -> id
  replicate: true,      // a server state's wire component (default true; false = this side only)
  requires: [TreeRun],  // archetype completeness: checked at spawn and load (Bevy's required components)
});

const w = createWorld([Tree, TreeRun, Pile]);
const id = w.spawn([Tree, { slot: 0, left: 10 }], [TreeRun, {}]); // omitted fields take the type's zero
w.get(Tree, id);           // Readonly<Row> | undefined
w.mut(Tree, id)!.left -= 2; // the writable row; marks (tree, id) changed
w.each([Tree, TreeRun], (id, tree, run) => { /* ascending id; rows read-only */ });
w.ids(Tree); w.count(Pile); w.single(Rail); w.lookup(Account, 'alice');
w.despawn(id); w.add(id, Pile, {...}); w.remove(id, Pile);

const chop = defineSystem('rail.chop', { reads: [Rail], writes: [Tree, Account], phase: 'act', order: 10 },
  (w, e: ChopAction) => { ... return n; });
runSystem(w, chop, action);        // one system now (an action as it arrives)
runPhase(w, 'tick', tick);         // every system of a phase, by (order, name)

w.changes();   // drains [component, id][] marked since the last drain (mut, spawn, add, remove, despawn)
w.hash();      // FNV-1a over components by name, ids ascending, fields in schema order, floats by their bits
w.snapshot();  // JSON-safe columns: { v, next, c: { tree: [[ids], [slot...], [left...], ...] } }
w.load(json, check?); // validates everything into a fresh store, runs check(world), then swaps: all or nothing
w.clone();     // the predictor's scratch copy
```

- **Entity ids** are stamped from the world's counter (`next`, saved and loaded), never reused, so an id cannot point
  at a different entity later (bitECS's recycled-id hazard). Catalog entities (the 97 felled trees, rocks, stations)
  are spawned at creation in catalog order and carry their catalog index in a `slot` key; external keys (a player's
  pid) are a `key` too. A predicted spawn gets a negative temporary id from `w.reserve(id)`.
- **Order** is ascending id everywhere: `each`, `ids`, hash and snapshot. `each` walks the smallest table's sorted ids
  and probes the others. No history-dependent order exists to leak (the spike's finding for bitECS and koota).
- **Deferred structure:** inside a running system, `spawn` returns its id at once but the entity appears at the end
  of the system; `despawn`, `add` and `remove` apply there too, in call order. Field writes through `mut` are
  immediate. This is Bevy's `Commands`, Unity's `EntityCommandBuffer` and Flecs's deferred mode. Outside systems
  (creation, load, the client mirror's ingress) changes are immediate.
- **Declared access is enforced.** In a system, `get`/`each`/`ids`/`count`/`lookup`/`single` on a component not in
  `reads` or `writes` throws, as does `mut`/`spawn`/`add`/`remove` on one not in `writes`. A set lookup per call. The
  declarations are therefore true, which is what makes them worth porting (Becsy's entitlements, Unity's
  `[ReadOnly]`, Bevy's `Query<&T>` vs `Query<&mut T>`).
- **Change detection** is push: `mut`, `spawn`, `add`, `remove` and `despawn` mark `(component, id)`. Replication
  drains `changes()` each step, which replaces the railway's hand-written "what did this action touch" lists and its
  projections. The evaluation's unverified risk, "a missed `touched()`", is closed by an **audit mode** (on in unit
  tests): each system run compares a hash of every row before and after and throws when a row changed without being
  marked (a write through a read-only row cast away).

### Closed feature list (the cap)

In: components with typed fields and defaults, `key`, `replicate`, `track`, `requires`; stamped ids and `reserve`;
`get`, `mut`, `has`, `each` over up to four components (optionally writable), `ids`, `count`, `single`, `lookup`;
deferred structure; systems with declared access, phases and orders; `changes`; hash, snapshot, load, clone
(copy-on-write); audit mode; `inspect()` (counts for the dev tools). `track`, writable `each` and copy-on-write clones
were added in steps 2 and 3, each for a measured cost (below).

Out, deliberately: relations, observers/hooks, `Without`/`Changed` filters, archetype storage, parallel scheduling,
events, resources (a singleton is an entity with `single`), queries by value, and any three.js type. Each is a
library's job; needing one is a switch trigger (section 8).

## 3. Mapping to engines

| E | Bevy 0.17 | Flecs 4 | Unity DOTS (Entities 1.3) | Godot 4 |
|---|---|---|---|---|
| `defineComponent('tree', {left:'int'})` | `#[derive(Component)] struct Tree { left: i32 }` | `ECS_COMPONENT` / `world.component<Tree>()` | `struct Tree : IComponentData { int left; }` | A `Resource` or a struct in a GDExtension; no native ECS (godot-flecs or godot-bevy bindings) |
| stamped `id` | `Entity` (index + generation) | `ecs_entity_t` | `Entity` (index + version) | `RID` from a server, or the extension's entity |
| `key: 'slot'` | a `HashMap<u16, Entity>` resource kept by a system | a named/indexed lookup or `ecs_lookup` | a `NativeParallelHashMap` built by a system | a `Dictionary` beside the store |
| `requires` | `#[require(TreeRun)]` | `With` trait / prefab | `IBaker` adds both / an archetype | node scene with both |
| `w.each([A, B], fn)` | `Query<(&A, &B)>` | `world.each<A, B>()` | `SystemAPI.Query<RefRO<A>, RefRO<B>>()` | a loop over packed arrays in `_physics_process` |
| `w.mut(A, id)` | `Query<&mut A>` / `Mut<A>` (sets `Changed<A>`) | `ecs_ensure` + `ecs_modified` | `RefRW<A>` / `SystemAPI.GetComponentRW` (bumps the change version) | direct write |
| deferred `spawn`/`despawn` | `Commands` (applied at the system's end or the next sync point) | deferred mode (`ecs_defer_begin`) | `EntityCommandBuffer` | `call_deferred` / `queue_free` |
| `defineSystem(name, {reads, writes, phase, order})` | `app.add_systems(FixedUpdate, chop.after(wake))`, access from the signature | `world.system<...>().kind(phase)` | `ISystem.OnUpdate` in a `SystemGroup` with `[UpdateAfter]` | `_physics_process` with process priority |
| phase `'tick'` on the 10 Hz rule clock | `FixedUpdate` with `Time<Fixed>` | a custom pipeline phase with a rate | `FixedStepSimulationSystemGroup` | `_physics_process` (physics ticks per second) |
| `changes()` → replication | `Changed<T>` / `RemovedComponents<T>`, or replicon's change ticks | observers on `OnSet`/`OnRemove` | change versions (`DidChange`), Netcode ghost snapshots | `MultiplayerSynchronizer` properties |
| `hash`/`snapshot`/`load` from schema | `bevy_reflect` serialization / replicon | `ecs_world_to_json` / `ecs_world_from_json` | `SerializeUtility` / subscenes; ghost serializers | `ResourceSaver`, or a custom serializer |
| ascending id order | archetype order: sort by `Entity` or a stable key yourself | table order: same | chunk order: same (chunks swap-remove) | array order |

**What a port keeps and what it rewrites.** It keeps every component name and field table, every system's name and
declared access, phase and order, and the deferred-structure points. It rewrites the syntax and the storage. It
keeps E's id-ordered walk as its own layer, because none of those engines iterates in a history-independent order
(Unity swap-removes chunks; Bevy and Flecs move rows between archetype tables). [M; from each engine's documentation,
no port tried]

## 4. The railway on E (step 3)

| Component | Fields | Key | Wire | Today |
|---|---|---|---|---|
| `tree` | slot, left, work, yaw (f64), fell, age, big | slot | yes | `sources`, `work`, `falls`, `supply.ages`, `line.upgrades` (5 parallel arrays) |
| `hardwood` | slot, left, work | slot | yes | `line.hardwood`, `line.hardwoodWork` |
| `rock` | slot, left, work, age | slot | yes | `line.rocks`, `rockWork`, `rockAge` |
| `pile` | x, y, z, n, kind, age | (the id is the pile id) | yes | `piles[]`, `nextPile` |
| `account` | pid, carry, stone, rails, epoch, request | pid | yes | `accounts[]` |
| `job` + `jobRun` | slot, stock, delivered, stoneStock, stoneDelivered, start, ahead, end, completion, timing x7 / allocation, used, stoneAllocation, stoneUsed, elapsed, lastTick | slot | job only | T1 on the root, T2-T3 in `line.jobs` |
| `qjob` + `qjobRun` | slot, stock, railStock, delivered, railDelivered, start, ahead, end, completion, timing x7 / allocation, railAllocation, used, railUsed, elapsed, lastTick | slot | qjob only | `line2.jobs` |
| `beam` | state, work, holder, epoch, revision, x, y, z, age | single | yes | `line.beam` |
| `forge` + `forgeClock` | used, lit, rack, poured / lastPour | single | forge only | `line2.forge` |
| `rail` + `railClock` | awake, axe, jump, stoneRack, stoneProduced, rack, produced, depot, depotProduced, lever, hook, out0-2 / depotLast, resumeMarker, supplyMarker | single | rail only | the root, `line`, `line2`, `supply` scalars |
| `outcome` | pid, epoch, request, status, accepted | | no | `outcomes[]` (64, oldest dropped) |

- **Replicated components are exactly today's wire kinds,** with three changes: catalog kinds and accounts are keyed
  by entity id and carry their `slot`/`pid` (sent once, at spawn); `rail.nextPile` goes (the id counter is not a
  component); `tree.yaw` is `f64` (what the save always kept). A job's `ahead` and `end` are written by the tick
  system when they change, so a running job still costs no packets (R1a's "thirty steps of laying, zero bytes").
- **Systems** (one per action op, as `railLineApply`/`railLine2Apply` branch today, in the same order: line one's
  first, then line two's when line one moved nothing): `rail.receipt` (the outcome check), the op, `rail.remember`;
  `rail.lineTick` then `rail.line2Tick` then `rail.jobClock` on the rule tick; `rail.supply` (the minute pulse),
  `rail.resume`, `rail.session`, the beam's release, stood and put-down. Each names its reads and writes.
- **No read model (since M12b-2).** Readers query the world: rows (`src/sim/railway-rows.ts`) and queries
  (`railway-queries*.ts`); the load check is `railwayCheck(world)` and its domain files. The client mirror writes
  replication packets into a world and publishes a clone of it once whole; prediction clones that world and runs the
  same systems. (The `Railway` read model this step first planned, `railwayView(world)`, was built in M2 and deleted in
  M12b-2: docs/plans/ecs-migration-railway.md, M12b; docs/plans/ecs-m12-m13.md.)
- **Save:** `world.snapshot()` replaces `serializeRailway`, `railway-line-code.ts`'s packing and line two's base-36
  rows; `world.hash()` replaces `JSON.stringify` + FNV. **`WORLD_NS` v17** (world reset; no migration; v16 was the great beam pass).
- **Deleted:** the legacy T1-only and playable-without-line states (no production room uses them; "No old builds in
  development"), `railProjections`/`railTouch*`, the hand encodings and their bounds tests (replaced by schema-load
  tests).
- **Bar:** `npm run check`, server tests, `test:net`, `npm run load` (all rows and `crowd`) and the solo playthrough
  pass; the load numbers are no worse than R1b's table (press to effect, others' view, kbit/s, server ms per step).

## 5. What stays out

Views and every three.js object (meshes, instanced batches, materials) stay in `GameEntity` kinds: the object layer
(Unity's GameObject, Unreal's Actor) over E's data layer. Input, audio, camera, UI and DOM stay where they are. The
`Railway` read model stays a plain derived object for presentation. Physics bodies stay in Rapier; a body's
*replicated pose* may become a component in an Owner-domain slice, the body itself never.

## 6. Migration order

1. **Railway** (this plan, step 3).
2. **The remaining Server domains,** as replication R3 moves them off lockstep, one per slice, each with `WORLD_NS`:
   `piles`, `sources`, `stacks`, `gifts`, `sites`, `bank`, `opening`, then `roster` and `tune` (read by the railway's
   systems; until they move, systems receive them as inputs, not components). Each loses its hand serializer and
   its projection.
3. **Owner domains** (presence fields: the boogler's pose, the ball's owner-sync state, held items): a component per
   presence key with `replicate: false` on the server; the 20 Hz sampler reads components instead of getters. Only
   once two Server domains have moved, so the facade has been tested by more than one domain.
4. **Not migrated:** Local cosmetics (particles, previews, crowds). If they ever need tens of thousands of entities,
   bitECS is the candidate for that layer, beside E (the evaluation's trigger).

## 7. Lint

- `src/ecs/**` imports nothing from `src/` and joins `LOCKSTEP_FILES`.
- Outside `src/ecs/`, only `src/ecs/index.ts` is importable (the store's internals are not part of the API).
- `src/sim/` may import `../ecs/index.ts` (the one exception to "sim imports nothing from src/").
- `defineComponent` and `defineSystem` calls only in `src/sim/` and `src/world/`, which ban three.js, the DOM and
  physics: no three imports in components or systems.
- State only through the facade: the world's tables are closed over, not exported; rows from `get`/`each` are typed
  read-only, and the audit mode catches a cast.

## 8. Risks, adversarial notes, and what would make us switch

**Where E is worse than bitECS (0.4) or koota (0.6):**
- **Speed.** E stores rows as objects in a `Map` per component: a `Map` probe per component per entity in a join.
  bitECS's SoA typed arrays were 42-45 µs a tick against in-house rows' 67 µs in the spike; E's joins cost more than
  A's single-table walk. At the railway's ~520 entities nobody can feel this; at 3,000 the benchmark decides.
- **Maintenance.** bitECS and koota have users and bug reports; E has us. Every bug in deferred structure or change
  detection is ours to find.
- **Features.** koota has relations, change queries and React bindings; bitECS has serializers and observers. E has
  none of these on purpose.
- **Familiarity.** An agent who knows Bevy knows E's words but not its edge cases (`mut` marks, `get` doesn't).
- **What E does better, and why it was chosen:** history-independent order and stamped ids built in (both libraries
  need a wrapper, and their lockstep code skipped their queries); generated hash, snapshot and load; enforced access
  declarations; the replication schema as the component schema; typed rows (`tree.left -= n`) rather than
  `Tree.left[eid]`.

**Other risks:**
- **Readability.** A rule that read `s.sources[k] -= n` now reads `w.mut(Tree, id)!.left -= n` after a lookup. More
  words per line; fewer parallel arrays to keep in step. The test is whether a reviewer can follow `rail.chop`.
- **The facade growing into a framework.** Mitigated by the cap: 650 non-blank lines in `src/ecs/` (its built size) and the closed
  list above, checked in review. The first request for a filter, relation or observer goes to the owner as "adopt a
  library?", not into E.
- **Two representations of the railway** (the world and the read model). The read model is derived by one function
  and never written; a test rebuilds it from a snapshot and compares.
- **Prediction cost.** Cloning a world per rebuild instead of `structuredClone` of an object: measured in step 2.
- **Wire changes** (ids for catalog kinds): a clean break with `WORLD_NS`; old tabs may misbehave (accepted).

**What would make us switch to a library (bitECS first):**
- The 3,000-entity benchmark shows E's tick more than 2x the spike's in-house rows (A) or 3x bitECS, or a profile of a
  real domain shows E above 0.05 ms a frame.
- A domain needs relations, observers or value queries that the cap rules out.
- The owner prefers a maintained library to our core, accepting the wrapper rules (no library query in lockstep or
  server rules; a lint rule enforces it).
- A real port to Bevy or Flecs is planned: then E's job is done once every domain is on it, and the port starts.

## Step 2: what landed and what it measured (7 November, M1 Max, Node 24.11)

- **Core:** `src/ecs/schema.ts` (components, field types, the hash fold), `src/ecs/world.ts` (the world, systems,
  schedule), `src/ecs/index.ts` (the facade). Replication's field types and `Schema` now come from it
  (`defineReplicated` is `defineComponent`); `src/world/replicate-world.ts` turns a world's replicated components into
  projections and drains its changes into the replicator. Lint: section 7, in `dev/lint/policy.ts`.
- **Tests** (`test/ecs.test.ts`): stamped ascending ids never reused; joins in id order; spawns, despawns and adds
  invisible until the system ends, field writes immediate, no structural change while iterating outside a system;
  undeclared reads and writes and nested runs refused; the audit catching a write through a read-only row and a
  changed key; per-component change drains; schedule order and taken orders; hash, snapshot, load and clone
  round-trips with a late joiner continuing the same history to the same hash; nine malformed snapshots refused
  with the live state untouched; spawn checks (unknown fields, missing required components, taken keys, values off
  schema in audit mode, reserved ids).
- **Three things changed from section 2 on contact with the benchmark:** change tracking is per component and
  opt-in (`track`, default: replicated components), because a system that advances every row each tick would
  otherwise record every row; per-tick bookkeeping therefore goes in its own untracked component (Bevy's
  `Changed<T>` has the same consequence). `each(cs, fn, writes)` hands writable rows of the listed components and
  marks them as visited, for systems that change most rows (Bevy's `Query<&mut T>`). Removal leaves a hole that the
  next walk closes in one pass, instead of two array splices per removal.
- **Size: 650 non-blank lines (601 of code), not the 450 planned** (the evaluation estimated 250-350). About 60 are
  the `World` interface, which TypeScript needs to type the store. The cap is now the measured size, and the feature
  list is unchanged: growth past it is the switch question, not a patch.

**The spike, option E added** (`dev/spikes/ecs/e.ts`; `node bench-node.ts`, `node --expose-gc
--max-semi-space-size=512 alloc-node.ts` in `dev/spikes/ecs`). Medians of 5 x 600 ticks, machine load 5-8:

| At 3,000 live entities | A in-house rows | C in-house SoA | D bitECS + wrapper | **E** |
|---|---|---|---|---|
| Sim tick, ~39 spawns+despawns/tick | 58-61 µs | 56-57 µs | 45-48 µs | **130 µs** |
| Sim tick, ~170/tick (5x churn) | 215-223 µs | 150 µs | 161-166 µs | **300 µs** |
| View update per tick | 13-14 µs | 19 µs | 17-18 µs | **21 µs** |
| State hash | 0.41 ms | 0.21 ms | 0.23 ms | **0.43 ms** |
| Snapshot: time / size | 1.2 ms / 195 KB | 0.02 ms / 95 KB | 1.2 ms / 195 KB | **1.3 ms / 195 KB** |
| Late join: load + rebuild view | 1.8-3.1 ms | 1.0 ms | 3.1-4.2 ms | **3.5 ms** |
| Allocated per tick, normal / 5x churn | 23 / 128 KB | 35 / 145 KB | 59 / 246 KB | **53 / 231 KB** |
| Same hash and order across histories | yes | yes | yes (native: no) | **yes** |

At 300 entities E's tick is 10-14 µs (A 3 µs). E's remaining cost is the join (a `Map` probe per entity per extra
component) and the per-op system run. [H, measured; one machine, other agents' work running]

**Today's replicated path against E at 3,000 entities** (`test/ecs-budget.test.ts`, `ECS_BUDGET=1` prints it): the
same action stream through today's shape (plain rows, a hand projection, actions naming what they touched,
`structuredClone` for the predictor) and through E (a component, an action system, `world.changes()` feeding the
replicator, `world.clone()`); both leave six mirrors with identical rows.

| Per server step, 6 clients | Actions + commit + flush, 5 / 25 changes | Allocated per step, 5 / 25 | Predictor clone | Rebuild, 8 pending |
|---|---|---|---|---|
| Today | 0.092 / 0.221 ms | 175 / 348 KB | 1.5 ms | 1.5 ms |
| **E** | **0.090 / 0.237 ms** | **220 / 407 KB** | **0.18 ms** | **0.16 ms** |

**Adversarial reading.** E is the slowest in-house option at the slice's tick: 2.2x A at normal churn (1.4x at 5x)
and 2.8x bitECS. That crosses the first switch trigger in section 8 as written ("more than 2x A"), while staying
under "3x bitECS". In absolute terms it is 0.13 ms of a 100 ms rule tick at 3,000 entities, and on the path the server
actually runs (replication), E ties today's step and its clone is 8x faster than `structuredClone`. The decision log's
own criterion is "a library only if profiling at 3,000 entities asks for it", and nothing here does. **Recommendation:
keep E, and replace the relative trigger with absolute ones:** a rule tick over 1 ms at 3,000 entities, a server step
over 0.5 ms from E's own work, or any E work in a frame over 0.05 ms. If one is hit, the first lever is SoA columns
inside E (C's storage; the API hides storage), then bitECS. **Accepted by the owner, 7 November, with the 708-line core.**

## Step 3: the railway on E, what landed and what it measured (7 November, M1 Max)

- **State:** `src/sim/railway-world.ts` declares the components of section 4 and spawns a fresh railway in catalog
  order; `src/sim/railway-systems.ts` holds the rules as 29 systems (one per action op, the receipt and remember
  around them, the three tick systems, resume, session, supply, and the beam's three absent-carrier paths), each
  naming what it reads and writes. `Railway` is a read model: `railwayView` builds it, `refreshRailway` patches it
  from the change marks, and the load check (`railwayCheck`) validates archetypes, catalog counts and then every
  domain invariant the hand loader had, on the read model.
- **Server:** `install` holds a world; the save is `world.snapshot()`, the hash `world.hash()`, the load
  `world.load(json, railwayCheck)`; replication reads the replicated components through `worldProjections` and is
  fed by `touchChanges` after every action, tick and pulse. The host reads the beam, piles and markers through narrow
  getters; `api.railway` is the read model, rebuilt after a change.
- **Client:** the mirror writes each packet into a world (`reserve` keeps the server's ids) and patches its read
  model from what changed; prediction clones that world copy-on-write and runs the same systems; thresholds are held
  back exactly as before. The adapter and the views are unchanged.
- **Deleted:** `serializeRailway`/`loadRailway`/`hashRailway`, `src/sim/railway-line-code.ts`, line two's and the
  supply's hand encodings, `railProjections` and the touch lists, and the T1-only and playable-without-line states
  (tests only). **`WORLD_NS` v17.**
- **Same rules, checked:** `dev/spikes/ecs/railway-diff.ts` runs the pre-move rules (a copy of `src/sim` from before
  the move) and the systems on the same random action streams (three players, every op, ticks, supply pulses with
  random intervals, resumes, sessions, the beam's absent paths) and compares the read model with the old state after
  every step: **200 seeds, 300,600 comparisons, all equal**, every seed reaching Q3 and the lever; 60 more after the
  copy-on-write change, 90,180 comparisons, equal.
- **Tests:** the rule tests written against `Railway` run through `test/railway-live.ts`, a read-only live view of
  an audited world whose writes go through the systems (a write to the view throws); encoding tests became snapshot
  load tests on the world (malformed columns, archetypes, keys, conservation). `npm run check` 465 pass; server 86
  pass; `test:net` 111/111.
- **Rebased onto the great beam pass** (`origin/main`, 7 November): `railBeamChoppable` and the new
  `railAxeAvailable` are read helpers on the read model; the `rail.axe` system waits on the lit forge, the beam systems
  no longer need the proper axe or the 40th log, and `validateRailLine` carries the new save invariants (the axe
  before the forge, beam work before T3, a beam laid before the logs) that `railway-line-code.ts` held. The co-op
  shared-unlock test passes on E. The differential check above predates the pass (its pre-move copy has the old
  beam rules); the pass's own tests run on E.
- **Rebased onto the away credit** (`origin/main` added it while this ran): its yard credit is now part of the
  `rail.resume` system (`awayCredit`), the host's paused-room path reads markers through the API, and its tests run
  on the world (`test/helpers/railway-q2.ts`, `server/test/railway-away.test.ts`).
- **The solo playthrough finishes** (after the rebase onto the great beam pass, the per-checkout Vite cache and the
  bot's `LAYING_MS`): 47 game minutes in 3 min 24 s, "everything it expected came", no errors. T1 laid at 5:58, T2
  10:28, T3 19:05, the forge lit 23:02, Q1 26:49, Q2 39:51, the hook 40:09, Q3 46:22 and the quarry gate 46:39.
  Earlier attempts stopped at T3 on the bot's old 300 s laying wait, or at the harness lobby (which `origin/main` hit
  too).
- **Rebased onto the great beam pass** (`origin/main`, 7 November): `railBeamChoppable` and the new
  `railAxeAvailable` are read helpers on the read model; the `rail.axe` system waits on the lit forge, the beam systems
  no longer need the proper axe or the 40th log, and `validateRailLine` carries the new save invariants (the axe
  before the forge, beam work before T3, a beam laid before the logs) that `railway-line-code.ts` held. The co-op
  shared-unlock test passes on E. The differential check above predates the pass (its pre-move copy has the old
  beam rules); the pass's own tests run on E.
- **Rebased onto the away credit** (`origin/main` added it while this ran): its yard credit is now part of the
  `rail.resume` system (`awayCredit`), the host's paused-room path reads markers through the API, and its tests run
  on the world (`test/helpers/railway-q2.ts`, `server/test/railway-away.test.ts`).
- **The solo playthrough is not verified to the end.** Two runs that got past the harness lobby woke the machine, laid
  T1 and T2, carried and deposited the great beam and funded T3, then stopped at the bot's "T3 laid once" wait: the
  harness's server ran about 0.65 rule ticks per game second, so T3's 217 ticks need ~330 game seconds against the
  bot's 300 s default. That is the same rate `origin/main` shows (T1 laid +3:12 on E, +3:16 in another agent's run
  of a current tree), and that agent's branch raises the bot's laying waits to 600 s and finishes T3 at +5:31.
  Four retries with that wait applied locally (not committed) and three runs of `origin/main` itself timed out at the
  harness lobby, which other agents' runs were hitting too. **Rerun the playthrough once the bot's laying wait lands
  and the harness is quiet.**

| Rules, per call (Node, the diff run, no audit) | Before (plain object) | E |
|---|---|---|
| An action | 1.7 µs | 4.4 µs (with the job clock settle) |
| A rule tick | 2.2 µs | 4.8 µs |

The "before" column excludes the projections and touch lists the old path also ran per action; E's includes its
change marks.

**Load** (`npm run load`, 15 s a row, headless pages over the real server; the same machine and session as the
baseline column, other agents' work running):

| Measure (18 rows, normal and 5x; crowd separately) | R1b (`origin/main`, this session) | **E** |
|---|---|---|
| Actor press to effect, p50 / p95 / max | 0.1-0.6 / 0.6-1.7 / 1.0-5.3 ms | **0.2-0.6 / 0.5-1.7 / 1.2-6.2 ms** |
| Others see it, p50 at 0 / 100 / 200 ms | 11-13 / 115-118 / 214-216 ms | **11-13 / 113-116 / 213-217 ms** |
| Downlink per client at 6 players, normal / 5x | 14.9-15 / 59.7-68.2 kbit/s | **14.5-14.6 / 59-66.5 kbit/s** |
| Server ms per step, mean of the rows, normal / 5x | 0.197 / 0.248 | **0.225 / 0.292** |
| Host ms per action message, mean of the rows, normal / 5x | 0.122 / 0.097 | **0.187 / 0.123** |
| Corrections, normal and 5x | 0 | **0** |
| Crowd corrections per player-minute, 2 / 4 / 6 players | 8-10 / 16-17 / 28-30 (R1b's own table: 8-10 / 14-16 / 32-39) | **8-10 / 16-17 / 33-35** |
| Late join | 31.4-32.5 KB | **35.7-36.9 KB** |
| Checkpoint | 7.8-8.5 KB | **10.1-10.8 KB** |
| Conserved, every mirror agreeing (a late joiner included) | all rows | **all rows** |

Press to effect is the same at p50; at normal churn E's p95 rows read 1.1-1.7 ms against 0.8-1.7 (every row under
the one-frame bar). The server rows read 14-18% higher on E, and the host's action time 30-50% higher. Both runs shared the machine with
other agents' browser jobs (load 6-8) and ran one after the other, not interleaved. The same comparison in one Node
process, both trees' own railway installs on one action stream (`dev/spikes/ecs/server-path.ts`, three rounds), reads
the other way: an action 5.7-7.2 µs on E against 10.1-17.9 µs before (the old path rebuilt pile maps and touch
lists), a step with its commit and flush to two mirrors 78-83 µs against 78-94 µs. Crowding one pile at 6 players
corrected 33-35 per player-minute on E against 28-30 on `origin/main` in this session and 32-39 in R1b's own table:
these are simultaneous presses on a shared beat, which vary from run to run. A rerun of the in-process comparison after the
last rebase, against that day's `origin/main` (machine still busy, load 6-7): an action 9.3-11.5 µs on E against
13.9-22.3 µs, a step 90-99 µs against 94-112 µs. So E is not shown worse, but the
bar "no worse than R1b" is met only within this noise: **a quiet-machine rerun of `npm run load` against
`origin/main` is the check to make before trusting the server columns.**

- **Saves and late join grew** with the explicit schema: a checkpoint is ~10.1-10.8 KB (R1b ~8 KB), a late join
  35.7-36.9 KB (R1b 31-32 KB; catalog kinds now carry `slot`, accounts `pid`). The worst-case recovery document
  (`test/railway-line-bounds.test.ts`, every field at its widest) is 104-114 KB of the 128 KB bound; the packed
  encodings were smaller. A binary snapshot is the lever if it ever matters.
- **Prediction:** a press clones the mirror's world copy-on-write (8 µs) and replays; a chop with its read-model
  patch costs ~60 µs in Node (before: `structuredClone` ~43 µs plus the rule).

**Adversarial notes on step 3.**
- The read model is a second representation. It is derived (one builder, one patcher) and never written back, and
  the replication test compares the mirror's world row for row with the server's, but a field added to a component
  and forgotten in `railwayView` or `refreshRailway` would show stale on the client. A test that patches and rebuilds
  and compares the two is the guard (`railway-replicate.test.ts` agrees whole read models every few actions).
- Copy-on-write clones grew the core to **708 non-blank lines**, past the 650 set in step 2. They were added for a
  measured cost: a press cloned the whole mirror world (~75 µs) where R1b's `structuredClone` took ~43 µs; now the
  clone is ~8 µs and a predicted chop ~60 µs. The plan's own rule says growth past the cap is the owner's call, so it
  is flagged rather than re-capped.
- The live test view is a shim: tests that read `Railway` keep running, but they no longer exercise the read model's
  exact object identity (a held pile reference now follows its index). New tests should use the world directly.
- Rules on E are 2-3x slower per call than on the plain object (still single microseconds). The move removed more
  than it added (production code +1,688 / -2,057 lines, mostly the hand encodings and projections), but each rule
  reads longer: declared access, lookups by key and `mut` cost words. Readability is the owner's call; `rail.chop`
  in `src/sim/railway-systems.ts` is the example to read.

## 9. Steps

1. This plan (one commit).
2. `src/ecs/` with tests: id order, deferred structure, declared access, audit, hash/snapshot/load/clone
   round-trips, malformed loads. Replication's field types and `Schema` come from `src/ecs/`. Benchmark: E added to
   the spike (`dev/spikes/ecs/`) against A, C (and B, D with their deps) at 300 and 3,000 entities, normal and 5x
   churn, plus allocations per tick; and the real railway path before and after (server action and tick, replication
   commit, client clone and predicted rebuild). One commit.
3. The railway on E, as section 4. Commit; rebase onto `origin/main` often; if a rebase conflict grows large, stop
   after step 2 and report.

Unverified: every engine mapping comes from documentation, not from a port; E's speed until step 2 measures it; not
tested on a device.
