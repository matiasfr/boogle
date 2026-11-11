> **Status: plan, 10 November 2026. Nothing built.** Owner's call the same day: "Sitting in proto is bad, we need to fix
> and migrate." "ECS migration needs to happen now before more build outs." Railway first; chunk, cull and stream the
> world second; per-system divergence diagnosis as a plan only. No engine switch is authorized: Kaigen is under
> consideration only, and the replication component schema stays the portable layer. Every number below was measured
> on `origin/main` at `bd34b181b` (world v26) with the commands named beside it. No designer review has run: the plan
> changes no gameplay.
>
> **Amended 10 November for the owner's answers** (section 7;
> [decision](../decisions-process.md#d-2026-11-10-ecs-migration-answers)). Changed from what this plan recommended: the
> `Railway` read model is deleted entirely and its tests are rewritten against components (section 2, "The read model
> goes entirely"; new steps M3c, M8b, T1 to T7 and M12b). As recommended: build-outs resume at the gates, views stay
> objects that query, the re-export files go right after M3 with lint rules (new step M3b), Place's tools are deleted,
> retargeted or archived by group (M13), and seats stay Host kind. State of the steps (updated at M3c): M0, M0b, M1, M2,
> M3, M3b, M4, M5, M6 and M7 done; M3c built; M8 building beside it. The amendment's inventory was measured on
> `origin/main` at `05696f2f1` with `rg`, the patterns named beside each number.

# ECS migration, railway first: out of `src/proto`, onto components and queries

**Goal.** Finish what [ECS E](ecs-e.md) started for the railway, so that its rules, its derived facts and its views
each have one home outside `src/proto`, and the held build-outs (Ring Island v27, yards at halts, the train upgrade
screen) land on that shape instead of adding to the old one. It serves DESIGN.md's **The scene graph is a view**,
**Clear authority**, **Small and readable** and **Understandable at a glance**. It bends none.

**The finding that shapes the plan.** The owner's evidence is right, and the cause is not the one it suggests. The
railway's rules are already on the ECS: 22 components and 50 systems, on the server, in every client's mirror and in
prediction, saved as `world.snapshot()` (ecs-e step 3, world v17). Only six files use `defineComponent` or
`defineSystem` because all of that sits in two files. What is not on the ECS is everything between a component row
and the screen:

- Three derived shapes stand between a row and a view: the `Railway` read model (`railwayView`, `refreshRailway`,
  `copyRailway`), the job clocks recomputed by `rail.at(tick)`, and the adapter's frozen `buildState`. Views read the
  third one at 130 `adapter.inspect()` call sites in 26 files.
- Derived facts exist twice: once on the world for the systems (`activeStation`, `qActive`, `kitOwed`, `cartWants`,
  `gateDown`), once on `Railway` for views, validators and tests (`railActiveStation`, `line2Active`, `line2KitOwed`,
  `line2CartWants`, `line2GateDown`). The mirror's `advance()` is a second copy of the tick's laying arithmetic
  (`layLine1`, `layLine2`). Nothing but tests keeps each pair in step.
- The tick's order is code, not data. `railTick` calls six systems by hand, `createSchedule` has no user, and the
  declared orders have already drifted from the executed order: `rail.worksTick` declares order 5 and `rail.jobClock`
  order 4, and `railTick` runs the Works first.
- The views live in `src/entities/railway` (62 files, 16,414 lines) and build almost everything with Place's code: they
  import 44 files of `src/proto` directly (12,052 lines) and reach 70 (15,782 lines).
- `src/proto` is two different things: 84 files (19,951 lines) that the live game runs, and code only the old
  `?proto=place` game runs, of which Place alone is 41 files (11,761 lines).

So the work is: split the sim by domain and make its order data; move the live code out of `src/proto`; give views
one read path (component rows and queries); delete the old game. None of it needs a `WORLD_NS` bump.

**Research:** [ecs-evaluation](../research/ecs-evaluation.md) (E, adopted: used as is, including its closed feature
list); [performance](../research/performance.md) recs 1 and 3 (the adapter read per tick: found landed, step M1 pins
it; chunk and cull the committed track: step M9); [deterministic-sim-at-scale](../research/deterministic-sim-at-scale.md)
recs 1, 2 and 4 (section "Per-system divergence diagnosis"); [engine-architecture](../research/engine-architecture.md)
(review for drift: the twin implementations above are the drift it warns of);
[places-as-modules](../research/places-as-modules.md) (a `src/place/` domain for land shared by several entities:
used in M5); [shared-state-at-scale](../research/shared-state-at-scale.md) rec 3 (a mirror shaped like the rules
state: the plan departs from it, the mirror is read as components);
[godot-migration-scope](../research/godot-migration-scope.md) and
[unreal-alignment](../research/unreal-alignment.md) ("keep authored intent portable": the schema golden in M0). Engine
comparison, as [owner calls](../agents/owner-calls.md) asks: Unity DOTS keeps GameObjects as the presentation layer
over entity data, Unreal keeps Actors over replicated properties, Bevy systems query components and write transforms.
The target below is that split: data and rules in E, views as the object layer that queries it.

## 1. Where the railway is today

Sizes from `wc -l`; reach from an import walk (static and dynamic relative imports, whole `import type` statements
excluded) seeded with every file outside `src/proto` and `src/debug`.

| Piece | Owner today | Sync kind | Form today |
| --- | --- | --- | --- |
| Component schemas: 22 kinds, 16 replicated (`RAIL_REPLICATED`) | `src/sim/railway-world.ts` lines 1–275 | Server | **ECS components.** The wire, the save and the hash: the portable layer |
| Action rules: 32 ops, 35 `act` systems (receipt, the op, remember) | `src/sim/railway-systems.ts` (1,650 lines) | Server; the client predicts the `RAIL_PREDICTED` subset with the same systems | **ECS systems**, all in one file |
| Rule tick: `rail.lineTick`, `line2Tick`, `cartTick`, `trainTick`, `worksTick`, `jobClock` | `railway-systems.ts` 975–1348, `railTick` | Server | **ECS systems**; order hand-coded and mis-declared |
| Lifecycle: resume and away credit, session, supply pulse, absent carriers (9 systems) | `railway-systems.ts` 1349–1650 | Server | **ECS systems** |
| Domain maths: train kinematics and block signals, the cart's trip, laying schedules, the line catalog, layouts in cm | `railway-train.ts`, `railway-trains.ts`, `railway-cart.ts`, `railway-line-schedule.ts`, `railway-lines.ts`, `*-layout.ts` (5,987 lines with the rest of `src/sim/railway*`, 79% of `src/sim`) | Pure functions of rows and tick | Plain functions the systems call. Correct as it is |
| Derived facts on the world | Private helpers in `railway-systems.ts` 87–170 and inline | none | Twin of the next row |
| `Railway` read model and about 55 helpers that take it | `railway-world.ts` 278–563; `railway.ts`, `railway-line.ts`, `railway-line2.ts`, `railway-works.ts`, `railway-trains.ts` | Derived | Second representation, outside the ECS; 42 files name the type |
| Load check and invariants | `railway-world.ts` 565–730 and the `validateRail*` functions | Server | On the read model |
| Server install: checkpoint, load, replication feed | `src/world/railway-server.ts` (469), `replicate-world.ts`, `replicate-server.ts` | Server | ECS world; `api.railway` builds the read model lazily for counts, phase and resume |
| Server host: requests, reach and cadence checks, the supply pulse | `server/src/host/railway-requests.ts` (225), `world-host.ts` | Server | Transport, outside the ECS (correct) |
| Client mirror: packets into a world, then the read model; job clocks by `advance()` | `src/world/railway-replicate.ts` (186) | Server (mirror) | ECS world, then read model, with duplicated arithmetic |
| Prediction: a clone of the mirror's world, the same systems, thresholds held back | `src/world/railway-predict.ts` (253), `replicate-client.ts` | Server (predicted) | ECS systems on a clone; its state is typed `Railway`, tied to the world by a `WeakMap` |
| Client session: status, clocks, intents, settle and corrections | `src/adapters/railway.ts` 441–845 | Server (client side) | Adapter |
| The frozen read: `readState`, `buildState`, `inspect` | `src/adapters/railway.ts` 845–1126 | Derived | **Adapter read**, third representation |
| Journey marks | `src/adapters/railway-marks.ts` (107) | Local (playdata) | Adapter |
| Views: one `railway` entity, a closure per view | `src/entities/railway/**` (62 files, 16,414 lines) | Local, drawn from accepted state | GameEntity; reads `inspect()` |
| Track mesh, colliders, the track-layer machine, car bodies, `besideLine` | `src/proto/place/rail.ts` 1–1452 | Local | **Place code, live** |
| Place's own train (`Train`, `buildTrain`, `trainEta`, `callTrain`) | `rail.ts` 1453–1682 | Local, owned by a tab | **Place code, dead** in the live game |
| Track pieces and their instanced batches | `src/proto/place/pieces.ts` (254), `look-kit.ts` (573) | Local | Place code, live. One batch per piece kind per line, with one bounding sphere over the whole line |
| Stations, machine model and panels, track panels, train load, engine and car kits | `src/proto/place/{stations,machine-model,machine-panels,track-panels,train-load,engine-kit,car-kit}.ts`, `src/proto/wagon/{look,engine,cars}.ts` | Local | Place code, live |
| Seats on the machine and the trains | `src/proto/place/seat.ts` (394), `seat-claims.ts` (80) | **Host** (`placeSeatGrants`) and Owner presence (`placeSeatRequest`, `placeSeatPose`) | Place code, live: shared state sitting in a prototype folder |
| Land, layout in metres, terrain | `src/proto/place/{layout,land,terrain,tech-layout,home-station}.ts` | Local, static | Place code, live; shared with the town, finds, lookout and Ring Island entities |
| Carry help, the hook ring, the glider | `src/entities/railway/{line-cargo,boiler-view,footing-view,hook-shot,glide}.ts` | Owner (`railwayBeamHelp`, `railwayBoilerHelp`, `railwayFootHelp`, `railwayHook`, `railwayGlide`) | GameEntity |
| Saved pose, seen arrivals, cosmetic claims | `src/entities/railway/{arrival,ability-arrival}.ts`, `src/railway-profile.ts` | Personal (localStorage) | Unchanged by this plan |
| The old tab-owned railway: `run`, `lines`, `coop`, `job`, `chop`, `cargo`, `depot`, `forge`, `halts`, `tech`, `moves` and the rest | 41 files of `src/proto/place` (11,761 lines) | Local, tab authority | **Place code, unreachable from the live game**; only `?proto=place` and 148 tool, test and prototype files that name that entry |

Who reads Place's rail state: nobody in the live game. Production takes only builders from `rail.ts` (`buildTrack`,
`buildMachine`, `thud`, `makeCar`, `snapCar`, `drawCar`, `poseCarOnLine`, `besideLine`) in 11 view files. Place's train
and its `job`/`coop` state are read only by Place.

## 2. The target shape

### Components: the portable layer

`src/sim/railway-components.ts` holds the 22 `defineComponent` calls, `RAIL_COMPONENTS`, `RAIL_REPLICATED` and
`createRailwayWorld`, and nothing else. It is the replication schema, the save schema and the hash, as the 6 November
decision set ("the replication component schema is the single language-neutral source"). A build-out's component lives
beside its own systems (`Aperture` in `railway-ring.ts`, `HaltYard` in its file) and is appended to `RAIL_COMPONENTS`.

A committed golden, `test/fixtures/rail-schema.json`, lists every component's kind, key, `replicate` flag and fields
with types in order, with the `WORLD_NS` it was recorded under. `test/railway-schema.test.ts` fails when the schema
differs from the golden while `WORLD_NS` does not. That file is what an engine evaluation reads, and the test is the
mixed-build guard for every step below.

Field names, kinds, spawn order and entity ids do not change anywhere in this plan.

### Systems and their order

Flat files in `src/sim/` with the existing `railway-` prefix. A subfolder would need a lint change: the sim rule's
pattern `^\.\./(?!ecs/index\.ts$)` rejects every `../` import, including `../../ecs/index.ts`.

| File | Systems | Target size |
| --- | --- | --- |
| `railway-sys-core.ts` | `rail.receipt`, `rail.remember`, `rail.wake`, `rail.session`, `rail.jobClock` | ≤ 250 |
| `railway-sys-line1.ts` | `rail.chop`, `mine`, `deposit`, `drop`, `take`, `rackTake`, `axe`, `beamChop`, `beamTake`, `beamDrop`, `beamDeposit`, `jump`, `lineTick`, `beamRelease`, `beamStood`, `beamPutDown` | ≤ 500 |
| `railway-sys-line2.ts` | `rail.deposit2`, `forgeTake`, `depotTake`, `depotRailTake`, `pack`, `lever`, `seaSwitch`, `hook`, `glide`, `boilerTake`, `boilerDrop`, `boilerFit`, `line2Tick`, `cartTick`, `boilerStood`, `boilerPutDown` | ≤ 500 |
| `railway-sys-trains.ts` | `rail.call`, `rail.trainTick` with `trainIO`, `serviceOf`, the wagon | ≤ 300 |
| `railway-sys-works.ts` | `rail.breaker`, `strike`, `kiln`, `footTake`, `footSet`, `cradle`, `turn`, `worksTick`, `footRelease` | ≤ 300 |
| `railway-sys-away.ts` | `rail.resume` with `awayCredit`, `rail.supply` | ≤ 300 |
| `railway-systems.ts` (the index) | none: the `OPS` table, the tick schedule, `RAIL_SYSTEMS`, `railApply`, `railTick` and the named entry points, re-exported under today's names | ≤ 200 |

Order:

- **Act:** `railApply` stays as it is: `rail.receipt`, then the op's systems from `OPS` in listed order until one moves
  something, then `rail.remember`. The `OPS` table is the dispatch; an `act` system's `order` number is not used.
- **Tick:** `createSchedule` over the six tick systems, run as `TICK.run(w, 'tick', { tick, headPct })`. Executed order
  stays exactly today's: `rail.lineTick` 0, `rail.line2Tick` 1, `rail.cartTick` 2, `rail.trainTick` 3,
  `rail.worksTick` 4, `rail.jobClock` 5. The last two declarations are corrected to match what runs.
- **Lifecycle:** `resume`, `session`, `supply`, and the `beam`, `boiler` and `foot` phases stay entry points the server
  calls by name.
- `test/railway-census.test.ts`: every system in `RAIL_SYSTEMS` is in exactly one of `OPS`, the tick schedule or the
  named entry points; every component is written by at least one system; `createSchedule(RAIL_SYSTEMS)` does not throw
  (no two systems share a phase and order).

### Queries: one implementation of each derived fact

`src/sim/railway-queries.ts`: pure functions of `(world)` or `(world, tick)`. The systems import them, so do the
views, the server host and the validators. Timed values are queries too: `jobProgress(w, c, id, tick)` returns
`elapsed`, `used`, `allocation` and the second material's pair with the arithmetic the tick uses (`layProgress` in
`railway-line-schedule.ts`, called by `layLine1`, `layLine2` and the query), which replaces the mirror's `advance()`.
Queries never write: the client writes nothing to its mirror or to a prediction clone.

Row readers sit beside them in `src/sim/railway-rows.ts` (M3c): one per component kind (`rail(w)`, `forge(w)`, `job(w, k)`, `jobRun(w, k)`,
`train(w, slot)`, `account(w, pid)`, `piles(w)` and the rest of the 22). Each returns the stored row typed read-only,
with no copy and no merged shape. They are what a test, a seed builder and a view read where they read
`s.line2.forge.lit` today.

### Where views read from

```
server world ── replication ──▶ mirror world (confirmed) ── clone + railApply ──▶ predicted world
                                                view world = predicted, or confirmed when nothing is pending
views:  rows       read.world().get(Train, id), .each([Tree], …)      (read-only rows)
        facts      queries(read.world(), read.tick())
        intents    session.act.chop(id), …                            (unchanged semantics)
        effects    session.onAccepted / onCorrected / onRemap / onReset   (unchanged)
```

Views stay `GameEntity` closures, the object layer over E's data, as ecs-e section 5 set and lint enforces
(`defineComponent` and `defineSystem` only in `src/sim/` and `src/world/`). What changes is that a view holds no
derived logic of its own shape: it reads rows and calls queries.

**Decided by the owner, 10 November:** "Views stay objects that read components through queries". His note beside the
answer: "why should it not become a system?" The orchestrator is answering him; the answer stands unless he changes it.
The plan's reasoning, kept: it is what Unity, Unreal and Bevy do with presentation (GameObjects over entity data,
Actors over replicated properties, systems that write transforms from queried components), and it keeps three.js out
of E. View systems would mean lifting the headless-only lint rule and growing E past its closed feature list, which by
ecs-e's own rule is the moment to ask "adopt a library?" instead. What a system would add for a view is a declared
`reads` list and a scheduled order; the first is what a query import already shows, and the second is the owner's
`animate` order today.

### What `src/adapters/railway.ts` becomes, and when it goes

- M1 pins its per-tick cache and stops evaluating the cache key 130 times a frame.
- M8 adds `read: { world(), tick(), tickNow(), pid, status() }` beside `inspect()`.
- M10 moves view groups from `inspect()` to `read`.
- M12 deletes `readState`, `buildState`, `inspection` and `inspect`, and splits what is left into
  `src/adapters/railway-session.ts` (connection, clocks, predictor, settle and corrections; ≤ 450 lines),
  `railway-intents.ts` (the intent types, wire validation and the `act` methods; ≤ 300) and `railway-effects.ts` (the
  accepted and corrected event shapes; ≤ 150). `src/adapters/railway.ts` is deleted in that step.
  `railway-marks.ts` stays and takes a world instead of a `Railway`.

### The read model goes entirely (owner, 10 November)

Owner: "Delete it entirely and rewrite the tests against components". This overrules the plan's call to keep `Railway`
for the load check, the seed builders and the tests (call 15). After M12b no code builds, reads or names the read
model: not a frame, not a test, not a tool.

**What reads it today** (`origin/main` at `05696f2f1`):

| Reader | Size | How it reads | Replaced by | Step |
| --- | --- | --- | --- | --- |
| The model: `railwayView`, `fillRailway`, `refreshRailway`, `copyRailway` | `railway-read-model.ts`, 334 lines; the `Railway` type in `railway.ts`, imported by 21 files | builds it from rows | nothing: rows and queries are read directly | M12b deletes |
| 33 domain facts that take a `Railway` (16 `line2…`, 13 `rail…`, `footingTotal`, `pierNeed`, `trainStops`, `worksStage`) | exported from `railway.ts`, `railway-line.ts`, `railway-line2.ts`, `railway-works.ts`, `railway-trains.ts`; named 314 times in 15 files of `test/`, 34 times in 4 of `server/test`, 45 in the adapter, 13 in `src/world`, 25 in 4 tool files | called on the model | the same fact as a query on the world, one per domain file | M8 adds, M12b deletes the old |
| The load check: `validateRailway`, `validateRailLine`, `validateRailLine2`, `validateRailWorks`, `validateRailTrains`, `railwayInvariant` | 452 lines, about 90 `throw` sites; `railwayCheck` itself (archetypes, counts) is already on the world | `validateRailway(railwayView(w))` at every load | the same conditions on rows and queries | M8b |
| Seed builders | `railway-seeds.ts`, `-seed-route.ts`, `-seed-works.ts` (544 lines), `server/src/seeds/build.ts` (42) | the live proxy | a world and the row readers | M3c |
| The live proxy: `live`, `edit`, `worldOf`, `invariant`, `restore`, `hash` | `src/sim/railway-live.ts`, 113 lines; imported by 23 test-side files, the 3 seed files, the seed build and 1 tool | a `Proxy` that rebuilds the model after each rule | `src/sim/railway-drive.ts`: the same driver on a `World`, no proxy | M3c adds, M12b deletes the old |
| Tests | **48 files, 10,513 lines**: 36 in `test/` (7,139), 12 in `server/test` (3,374). About 530 field reads off the model; 141 reads of the host's `rules.railway.railway` getter (116 in 12 server test files, 25 in the adapter and mirror tests) | proxy, getter, the 33 facts, `inspect().state` | rows, row readers and queries on a world | M3c, T1 to T7, M10f, M11, M12 |
| Tools | `dev/loop/run.ts` (1,016), `dev/peer-test/ws-railway.ts` (1,008) and `ws-page.ts` (499); the spikes `dev/spikes/ecs/{railway-diff,predict-cost,server-path}.ts` | the getter, the proxy, the facts | the server API's `world()` and queries; the spikes are deleted | M11, M12b |
| The server | `src/world/railway-server.ts` (469): the lazy `railway` getter, read at 5 sites (the resume cap, counts, phase, panel numbers) | builds the model after each change | queries on its world | M11 |
| The predictor | `src/world/railway-predict.ts` (253): `railwayOf`, `cloneRailway`, `railPredict`, the `WeakMap` from model to world | its state is typed `Railway` | the cloned world | M12 |
| The mirror | `src/world/railway-replicate.ts` (186): `refreshRailway` on each packet, `advance()` for the job clocks | patches the model | a published world; `jobProgress` | M12 |
| The adapter | `src/adapters/railway.ts` (1,313): `buildState` over the model; `railway-marks.ts` (107) | third shape | `read` and queries | M10, M12 |

Counted with `rg -lU "import[^;]*\bRailway\b[^;]*from '[^']*railway\.ts'"` (type importers), `rg -cw` over the 33
names (calls, with imports and definitions), `rg -l "railway-live"` and `rg -c "railway\.railway\b"`. The earlier
"about 11,000 lines of tests" was right to within 5%.

**What the tests are rewritten against.** A world (`createRailway()` from `railway-drive.ts`, audit on), the rules by
name (`apply(w, pid, action, tick)` is `railApply` then `railSettle`), rows through the row readers, facts through the
per-domain queries. `edit(s, fn)` becomes `fn(w)`. A server test reads `host.rules.railway.world()`, which exists
today. Nothing in a converted test names `Railway`, `live` or a `validateRail…` function.

**What protects each slice.**

1. The M0 goldens hash worlds, not the model, so they stay valid through all of it. M3c converts the seed builders and
   must leave every stage hash and every ops hash unchanged without regenerating a fixture: that is the proof the
   seeds still build the same worlds.
2. M8's differential test holds every query equal to its `Railway` twin on seeded streams while both exist.
3. M8b's check corpus holds the world checks equal to the old validators: every golden stage accepted, and one bad
   world per `throw` site rejected with the same message by both.
4. Each test batch carries two tables in its commit body, before and after, made by committed scripts (M3c): the
   **census** (tests and `assert` calls per file: equal, or each difference named) and the **kill table** (which tests
   fail under each of about twelve one-line rule mutations: identical). A conversion that weakens a test shows in
   one of them.
5. The old path is deleted last (M12b), with the differential test and the check corpus's old side, once nothing
   else reads it.

**Where the wipe is used** (owner: "we can do a full wipe at any time in development"; "Nothing waits on a world
bump"). No step in this amendment needs a `WORLD_NS` bump as measured. Three places take one instead of writing
code around a shape, each after `npm run heartbeat` shows no session:

- M3c deletes `test/railway-snapshot.test.ts` and its v26 fixture now, not at the next bump: it is a save guard and a
  reader of the model's check.
- M8b: where an invariant can only be stated through a value the model derived and no row holds, the field is added
  to the component and the world is bumped in that step. No derivation code is kept for a check.
- M12: if publishing whole worlds to views is simpler with a changed component split (a `*Run` or `*Clock` row folded
  into its parent, or the reverse), M12 takes the bump. No mirror code is written to preserve today's split.

A step that takes a bump says so in its commit body and regenerates the M0 fixtures in a commit of its own, reviewed
as a rule change.

### What leaves `src/proto/place/rail.ts`

Everything the live game uses, in M6, to `src/entities/railway/`:

| New file | From `rail.ts` | Lines |
| --- | --- | --- |
| `line-geometry.ts` (no three.js) | `P`, `lateral`, `besideLine` (1–88) | about 30 |
| `track.ts` | `Track`, `buildTrack` (89–810) | about 720 |
| `car.ts` | `Car`, `makeCar`, `snapCar`, `drawCar`, `poseCarOnLine` (811–961) | about 150 |
| `track-machine.ts` | `Machine`, `buildMachine`, `thud` (962–1452) | about 490 |

Place's own train (1453–1682, 230 lines) stays in `src/proto/place/rail.ts`, importing the moved files, until M13
deletes it with the rest of Place.

### What "done" means for the railway

| Measure | Today | Done |
| --- | --- | --- |
| `src/proto` files `src/entities/railway` imports directly | 44 (12,052 lines) | 2 (`flags.ts`, `mark.ts`, 115 lines: the two static doors lint allows; they leave with the last prototypes) |
| `src/proto` files the live game reaches | 84 (19,951 lines) | 15 (3,362 lines) after M7, none of them the railway's: the greybox, playdata, the terrain pass, `card.ts` and the two doors |
| `src/proto/place/rail.ts` | 1,682 lines | 230 after M6, 0 after M13 |
| `src/proto/place` | 102 files, 27,251 lines | 42 files (the 41 unreached today and `job.ts`) and that 230-line remainder after M7; the directory is gone after M13 |
| Largest railway sim file | 1,650 lines | ≤ 500 |
| Files that declare the railway's components or systems | 2 | 8, plus one per build-out domain |
| Systems | 50 in one file; tick order by hand, two orders mis-declared | The same 50 in six files; the tick run by `createSchedule`; the census test |
| Shared-state writes outside a system | 0 (E's audit mode) | 0 |
| Derived facts implemented on both `World` and `Railway` | at least 5 pairs, plus the laying arithmetic | 0 |
| Shapes between a component row and a view | 3 | 0 |
| `adapter.inspect()` call sites | 130 in 26 files | 0 |
| `src/adapters/railway.ts` | 1,276 lines | deleted; session, intents and effects ≤ 900 lines together |
| The `Railway` read model | 334 lines, rebuilt or patched on every packet, prediction and tick; its type imported by 21 files | **deleted**: `railway-read-model.ts`, `railway-live.ts` and the `Railway` type do not exist |
| Facts and checks that take a `Railway` | 33 facts, 5 validators and `railwayInvariant` | 0; the load check is on the world |
| Test lines that read the model | 10,513 in 48 files | 0; the same tests on rows and queries, census and kill table unchanged |
| Re-export files in `src/sim` | 1 after M2, 2 after M3 | 0 after M3b |
| Lines under `src`, `server`, `test` and `dev` that name `railwayView`, `refreshRailway`, `copyRailway`, `fillRailway`, `railwayOf`, `cloneRailway`, `validateRailway` or `railwayInvariant` (`rg -w`) | 130 in 24 files | 0 |

"defineSystem coverage" is counted on what changes shared state, and it is already complete. Making views E systems
is not part of "done" (owner, 10 November; call 17).

## Design

- **Sync kinds: none change.** The railway stays Server kind under the state key `railway`
  ([sync](../agents/sync.md)); the server alone applies actions and ticks; clients mirror and predict. No lockstep op,
  no `src/world/rules/` entry, no `rules/types.ts` change, no `edits` generators, no `env` fact. Op names, the request
  and packet shapes, presence keys and saves are unchanged. The server keeps validating every message.
- **Authority:** unchanged. Thresholds (a bill completing, the forge lighting, the kiln, the cradle, the crossing) stay
  the server's and stay held back in prediction.
- **Cosmetic:** track pieces, the machine, car bodies, flights, chunk bounds and draw order. Never read by a rule.
- **Seats** keep their Host field and presence keys by name when `seat.ts` moves (wire unchanged).
- **Controls:** none added, moved or renamed. No pad slot is claimed.
- **Lint:** `src/sim/` files stay flat (above). `src/place/` joins the presentation layer in `dev/lint/policy.ts` beside
  `src/island/`. Moved files fall under `boogle/use-an-entity`: an owner parameter is required and
  `lint-suppressions.json` does not grow. M3b adds the boundaries the three-way split makes enforceable (view code
  cannot import the check module or a system file; the components file is a leaf; queries do not import systems; the
  read model's importers are a list that can only shrink until M12b deletes it).
- **Server image:** `src/sim`, `src/world` and `src/ecs` are copied whole (`server/Dockerfile`, `dev/server-build.ts`,
  `deploy-server.yml`), so new files there need no listing. Queries stay in `src/sim/` for that reason;
  `test/server-image.test.ts` guards it.
- **Risk tiers used below.** **High:** touches `src/sim`, `src/world` or `server/`; ships through
  `npm run ship-queue -- <worktree> --wait --reviewed "<npm run review-stamp> …"` after an independent review. **Medium:**
  changes what the client draws or reads. **Low:** tests, tools, or renames with no behaviour.
- **Every step:** branches from `origin/main`, ships alone, leaves `npm run check` green, needs no `WORLD_NS` bump and
  runs no long playthrough. A step that finds it does need a bump stops and reports instead.

## 3. Steps

Three lanes share no files, so they run at the same time: **A** (sim) M0, M2, M3, M3b, then M3c beside M8; **B**
(moves) M4, M5, M6, M7; **C** (adapter) M1. M8 joins A and C after M3b and shares no file with M3c; M8b follows both. M9 follows M6. M10 follows M6 and M8. The test batches T1
to T7 follow M3c and M8 and share no file with each other or with M10. Within a lane the order is fixed.

| Step | What | Tier | After | State |
| --- | --- | --- | --- | --- |
| M0, M0b | Guards: stage and ops goldens, schema golden | Low | | done |
| M1 | Pin the adapter's per-tick read | Medium | | done |
| M2 | Split `railway-world.ts` | High | M0 | done |
| M3 | Split the systems; the tick is a schedule | High | M2 | done. **Gate: build-out rules** |
| M3b | Remove both re-export files; lint the split (new) | High, mechanical | M3, the same day | done, but `rail-kit.ts` (owner's call) |
| M3c | A world driver; seeds and guards on the world (new) | High | M3b | done |
| M4, M5 | Render primitives; land and the village kit | Low to medium | | done |
| M6 | The railway's modules out of Place; split `rail.ts` | Medium | M5 | done. **Gate: build-out views, with M8** |
| M7 | The town's modules | Low to medium | M6 | done |
| M8 | The read facade; every fact as a query (grown) | High | M1, M3b; beside M3c | done (#1524). **Gate open: build-out views** |
| M8b | The load check on the world (new) | High | M8, M3c | |
| M9 | Chunk and cull the track | Medium | M6 | |
| M10 a to f | Views read rows and queries | Medium each | M6, M8 | six groups in parallel |
| T1 to T7 | Tests rewritten on rows and queries (new) | Low each | M3c, M8 | seven batches in parallel |
| M11 | The server and its tools read the world | High | M8, T5 to T7 | |
| M12 | The predictor and the mirror on worlds; the adapter split | High | M10, M11 | |
| M12b | Delete the read model (new) | High, deletions | M8b, T1 to T7, M12 | |
| M13 | Delete Place | Medium to high | M7 | independent of M8 to M12b |

### Lane A: the sim

- [x] **M0. Guards before anything moves.** _Low. New files only._ **Built 10 November, branch `ecs/m0-guards`.** Three
      test files and three fixtures, nothing under `src/` or `server/` touched. Each guard was shown to fail on a
      throwaway change and reverted: a reordered `Hardwood` field and a dropped `Hardwood` key trip the schema test
      (message says bump `WORLD_NS`); `TRAIN.dwellTicks` 50 to 51 trips the 13 stages from `trains-on` on in the golden
      (the 22 earlier stages stay green, which is also the run-to-run stability check); swapping the `Beam` and `Forge`
      spawns trips the golden at every stage and the snapshot's fresh-build hash. Found: the schema golden also
      records `track`, `requires` and non-zero `defaults` (a changed default alters fresh worlds); the golden test
      costs about 2.5 minutes of `npm run check` wall time (stage building is about 90% of it; tick on the raw world,
      not the live read-model proxy, which doubled it); the snapshot fixture is a v26 shape and is retired, not
      regenerated, at the next `WORLD_NS` bump. Follow-up (`ecs/m0b-ops`): the stage golden is now 9 shard files
      (`test/railway-golden-<n>.test.ts` over `test/helpers/railway-golden.ts`) with the tick pass on an unaudited copy
      (same hashes, about 250 times faster); `test/railway-ops.test.ts` runs the ops and entry points no stage runs
      (take, rackTake, axe, beamDrop, call, jump, reject, resume, supply pulse, beam release/stood/put-down, boiler
      stood/put-down, foot release, session past epoch 1), world hash after every step, in
      `test/fixtures/railway-ops-golden.json`. The snapshot test is deleted, not re-recorded, at the next bump (owner,
      10 November). Node 24 not run.
  - `test/railway-golden.test.ts` and `test/fixtures/railway-golden.json`: for every `SeedStage` in
    `src/sim/railway-seeds.ts`, build the stage (at module scope, as `test/railway-trains.test.ts` does, outside the
    5 s test timeout) and record `world.hash()` at the stage and after 1,200 further `railTick`s. `GOLDEN=1`
    regenerates. The failure message says a refactor step must never regenerate.
  - `test/railway-schema.test.ts` and `test/fixtures/rail-schema.json` (section 2).
  - `test/railway-snapshot.test.ts` and `test/fixtures/railway-v26-snapshot.json`: a `world.snapshot()` of the
    `q6-done` stage recorded on this commit loads through `railwayCheck` and hashes the same. This is a saved room's
    shape.
  - **WORLD_NS:** none. **Mixed builds:** nothing shipped changes.
  - **Verify:** `npm run check`; break one field name locally and see the schema test fail.
  - **Reviewer attacks:** do the stages cover every op and tick system (list ops no stage runs and add a scripted
    stream for them); is the golden stable across two runs and across Node 24 and 26; does the schema test also catch a
    reordered field and a changed `key`.
- [x] **M2. Split `railway-world.ts`.** _High (sim), mechanical._ **Built 10 November, branch `ecs/m2-world-split`.**
      Moves only: `railway-components.ts` (264 lines) is old lines 32–275 under a new header, `railway-read-model.ts`
      (334) is 278–562, `railway-check.ts` (215) is 565–730, each body byte-identical to its source range (`cmp`
      against `sed -n` of the old file); `railway-world.ts` (730 to 34) re-exports the same 34 names by explicit list.
      The edits around the moved blocks: `TIMING` is exported, because the read model's `jobOf`/`qjobOf` read its
      keys (the barrel does not re-export it), with a one-line doc comment added above it, and the two section-divider
      comments (`the read model`, `the load check`) were dropped; the commit's "moves, no edits" overstated it. Lines 1–275 also hold `RAIL_STATUS`, `DEPOT_OUT` and the depot-output
      assertion, so they went to the components file with the rest (section 2's "nothing else" is not quite true of
      it). Import graph: check → read model → components, check → components; no file imports the barrel back, no
      new knot. The importer count is 38 today, not 34; none changed. The three M0 goldens passed untouched,
      `npm run loop -- run` matched base byte for byte except its wall-time line, the server tests passed with every
      railway world audited (a local, uncommitted default flip), and `npm run test:net` passed 131/131.
  - Create `src/sim/railway-components.ts` (lines 1–275 with `createRailwayWorld`),
    `src/sim/railway-read-model.ts` (`railwayView`, `fillRailway`, `refreshRailway`, `copyRailway` and their helpers)
    and `src/sim/railway-check.ts` (`railwayCheck`, `validateRailway`, `railwayInvariant`, `ARCHETYPES`).
    `railway-world.ts` becomes re-exports only, so its 34 importers do not change; M3b removes it (was M12; owner,
    10 November).
  - Keep the order of `RAIL_COMPONENTS` and of the spawns in `createRailwayWorld` byte for byte: fresh ids and the
    late-join order follow from them.
  - **WORLD_NS:** none; the three M0 goldens are the proof. **Mixed builds:** no wire or save change.
  - **Verify:** `npm run check`; `npm --prefix server test`; `npm run test:net`; `git diff --stat` shows moves only.
  - **Reviewer attacks:** diff each moved block against its source for edits hidden in a move; import cycles between
    the three files; a component left importing from the barrel.
- [x] **M3. Split the systems; make the tick a schedule.** _High (sim; the order becomes data)._ **Built 10 November,
      branch `ecs/m3-systems-split`.** `railway-systems.ts` 1,650 lines to 163 (the `OPS` table, `railApply`,
      `railOutcome`, the tick schedule, `RAIL_TICK`, `RAIL_ENTRIES`, `RAIL_OPS`, `RAIL_SYSTEMS`, re-exports);
      `railway-queries.ts` 149, `railway-sys-core.ts` 91, `-line1` 388, `-line2` 496, `-trains` 171, `-works` 197,
      `-away` 235. Each block was cut from the old file by line range and checked against it (whitespace and `export `
      ignored); the only lines that differ are the tick systems' inputs (`tick: number` to `{ tick }: Tick`) and the
      two orders (`rail.worksTick` 5 to 4, `rail.jobClock` 4 to 5), plus Prettier re-wrapping two one-line systems
      that `export ` pushed past 120 columns. `reads`/`writes` are unchanged everywhere. Import graph: queries →
      components; every `sys-*` → components, queries (and `import type` from core); away → line1 (`layLine1`) and
      line2 (`layLine2`, `boilerPedestal`, the cart's three transfers); the index → all of them; no cycle. Queries also
      took the shared non-writing helpers the plan does not list (`carried`, `free`, `roomFor`, `FOOT`, `qCompleted`,
      `stopsOf`, `aboard`, `trainOwed`, `timingOf`, `scheduleOf`); `credit`, `pileKind`, `pileCap`, `balanceOf` and
      `beamNeeded` stay with line one, their only user. `jobClock` keeps no input (`defineSystem<Tick | undefined>`),
      since `railSettle` and `railResume` still run it alone. No two act systems shared an order, so none was
      renumbered. New guards: `test/railway-tick-order.test.ts` (recorded on the hand-coded tick before the split:
      300 ticks on seven stages, every tick's system names in order and the hash after it; a throwaway swap of
      `rail.worksTick` behind `rail.jobClock` fails all seven) and `test/railway-census.test.ts`;
      `test/helpers/rail-audit.ts` audits every railway world for a whole run by a preload (see its header), so the
      server tests with audit on are repeatable without editing rule code. Results: the nine golden shards, the ops
      stream, the schema and snapshot goldens passed untouched; `npm run check` green (930 tests); `npm run loop --
      run` equal to base but for its wall-time line; `npm --prefix server test` 150/150 plain and audited;
      `npm run test:net` 131/131 plain and audited.
  - Create the six `railway-sys-*.ts` files and `src/sim/railway-queries.ts` (the private helpers of
    `railway-systems.ts` 87–170 and the inline facts, exported: `activeStation`, `ready`, `held`, `boilerHeld`,
    `qActive`, `gateDown`, `depotNeed`, `cartWants`, `cartServing`, `pierOwed`, `kitOwed`, `wagonSlot`, the singleton id
    getters). `railway-systems.ts` keeps the `OPS` table, exports `RAIL_SYSTEMS`, and re-exports `railApply`,
    `railTick`, `railSettle`, `railOutcome`, `railResume`, `railSession`, `railSupplyPulse`, the beam, boiler and foot
    entry points and `railLine2Active`, so its importers (10 today, not 8) do not change in this step. M3b removes
    these re-exports the same day.
  - The six tick systems take one input, `{ tick: number; headPct: number }`. `railTick` becomes
    `TICK.run(w, 'tick', { tick, headPct })` with `TICK = createSchedule([...])`. Set `rail.worksTick` to order 4 and
    `rail.jobClock` to order 5, which is the order `railTick` runs today.
  - Add `test/railway-census.test.ts` (section 2). If two `act` systems share an order, renumber them here: `act`
    orders are not used for dispatch.
  - **WORLD_NS:** none: no component, field, op or result changes. **Mixed builds:** safe; an old tab predicts with the
    same rules.
  - **Verify (lockstep-style determinism, since order is touched):** the M0 goldens unchanged;
    `npm run loop -- run > after.txt` equal byte for byte to the same command on the base commit (14 s, the whole route
    through the real rules, four orders); `npm --prefix server test`; `npm run test:net`; `test/ecs.test.ts`;
    `npm run load` on one row, corrections 0 as on base.
  - **Proof segment:** none in a browser; the loop run is the segment.
  - **Reviewer attacks:** run the tick in the old hand order and the schedule on the same streams and compare hashes
    every tick; a system's `reads` or `writes` narrowed or widened in the move (audit mode throws on an undeclared
    access: run the server tests with audit on); a helper that read through a stale row after a `mut` in the old
    file and now reads a fresh one; `rail.jobClock` and `rail.worksTick` really touching disjoint components.
- [x] **M3b. Remove both re-export files; lint the split.** _High by path (`src/sim`, `src/world`, `server/`),
      mechanical: import lines only. Right after M3, the same day._ Owner, 10 November: "Remove them right after M3,
      with a lint rule". **Built on branch `ecs/m3b-drop-reexports`, except `rail-kit.ts` (below).**
      `node dev/migrate/railway-imports.ts` rewrote 39 files (named imports split per defining file, `type` kept;
      `import * as sys` in `railway-live.ts` and `dev/spikes/ecs/railway-diff.ts` became one namespace per file,
      `sysCore`, `sysAway`, `sysLine1`, `sysWorks`; three `await import()` in `dev/peer-test/ws-railway.ts`), is
      idempotent, and `--check` reports nothing left. `railway-world.ts` is deleted and `railway-systems.ts` holds no
      `export … from`. The five rules are in `dev/lint/policy.ts`, each shown failing on a throwaway import; a sixth
      the list missed: `no-restricted-imports` does not see `import()`, and the views load most code that way, so a
      `no-restricted-syntax` selector bans an `import()` of a check, read-model or system file outside `src/sim` and
      `src/world`. Rule 5 holds for `src` (the three `src/world` files, `railway-check`, `railway-live`) and for
      `test`/`dev` (four files listed); `server/` is outside lint, so its tests are not covered (none imports the read
      model). The census test now finds systems by importing every `railway-sys-*.ts` file, and records two re-export
      blocks, not one: `railway-seeds.ts` has `export * from './railway-seed-route.ts'`, not on this step's list.
      `dev/loop/graph.ts` cites the file that holds each rule. `test/railway-tick-order.test.ts` also runs three
      headway holds (0, 40, 100) over 1,200 ticks, recorded on main before this step. **Not done: `rail-kit.ts`.**
      Loading `line-geometry`, `track`, `car` and `track-machine` directly splits the one `rail-kit` chunk into
      several (a one-view trial added a `car.js` chunk beside `rail-kit.js`), against this step's rule that the
      chunk list stays the same or shrinks; and three views (`view.ts`, `line2-view.ts`, `panel-view.ts`) use members
      of three files through one `rail` object, so their bodies would change. Left for the owner's call. Results:
      every railway guard passed with its body and fixture unchanged (their import lines moved with the file);
      `npm run check` green (969 tests); `npm run loop -- run` equal to base but for its wall-time line; server tests
      150/150 and `npm run test:net` 131/131, plain and audited; `npm run counts -- --build-only` and the built chunk
      list (names and gzip sizes) identical to a fresh build of the base commit; every `src/sim/railway-*.ts` loads
      alone in Node; `rg railway-world src server test dev protos` finds only the migration script's table.
  - `dev/migrate/railway-imports.ts` (new, committed): a table from each exported name to the file that defines it
    (the 34 names `railway-world.ts` re-exports; every name `railway-systems.ts` re-exports from a `railway-sys-*.ts`
    file or from `railway-queries.ts`). It rewrites static imports, `import type`, `import()` and
    `'/src/sim/…' as string` paths under `src`, `server`, `test`, `dev` and `protos`; splits one import into one per
    defining file; keeps each `type` modifier; is idempotent; `--check` lists what is left and exits 1. The commit
    body records the command. A build-out branch that started before M3b reruns it after its rebase.
  - Delete `src/sim/railway-world.ts` (38 importers today: 20 in `test/`, 9 in `server/test`, 3 in `src/world`, 2 in
    `src/sim`, 1 in `server/src`, 3 in tools). In `src/sim/railway-systems.ts` delete every re-export (10 importers:
    2 in `src/world`, 1 in `src/sim`, 4 tests, 3 tools); it keeps what it defines: `OPS`, the tick schedule,
    `RAIL_SYSTEMS`, `railApply`, `railTick`. Left alone: the 11 line 1 helper names `railway.ts` re-exports from
    `railway-line.ts`; every one of them is deleted in M12b.
  - Also on this step's removal list (owner, 11 November: temporary re-export files go): `src/entities/railway/rail-kit.ts`,
    added in M6 to keep the views' `import()` loaders to one path change. Each loader imports `line-geometry`, `track`, `car` and
    `track-machine` directly, and the file is deleted. (It touches no `src/sim` file, so the lint rules here do not apply.)
  - `dev/lint/policy.ts`, `no-restricted-imports` patterns, each message naming this plan:
    1. **The check module** (`railway-check.ts`, and `railway-check-*.ts` from M8b) is imported only by
       `src/sim/railway-seed*.ts`, `src/sim/railway-drive.ts`, `src/sim/railway-live.ts`, `src/world/railway-server.ts`,
       `server/**`, `test/**` and `dev/**`. So `src/entities`, `src/adapters`, `src/render`, `src/features`,
       `src/player`, `src/place` and `src/debug` cannot import it.
    2. **System files** (`railway-sys-*.ts`, `railway-systems.ts`) are imported only from `src/sim`, `src/world`,
       `server`, `test` and `dev`. A view sends an intent; it never runs a rule. True today: no file outside those
       imports `railway-systems.ts`.
    3. **The components file is a leaf**: `railway-components.ts` imports no `railway-sys-*`, `railway-systems`,
       `railway-queries*`, `railway-check*` or `railway-read-model` file.
    4. **Queries do not import systems**: no `railway-queries*.ts` file imports a `railway-sys-*.ts` file or
       `railway-systems.ts`.
    5. **The read model's importers are a closed list**: `railway-read-model.ts` is imported only by
       `railway-check.ts`, `railway-live.ts`, `src/world/railway-predict.ts`, `railway-replicate.ts`,
       `railway-server.ts`, and the test and tool files that name it today, written out file by file. The list may
       only lose lines; M12b deletes the rule with the file.
  - `test/railway-census.test.ts` gains: no `src/sim/railway-*.ts` file holds an `export … from` line, except the one
    block in `railway.ts` recorded in the test.
  - **WORLD_NS:** none. **Mixed builds:** no wire or save change.
  - **Verify:** `node dev/migrate/railway-imports.ts --check` reports nothing left; the M0 goldens unchanged;
    `npm run loop -- run` equal byte for byte to base; `npm --prefix server test`; `npm run test:net`;
    `npm run build` with the same chunk names and first-load gzip as base; each of the five lint rules shown to fail
    on a throwaway import and reverted (the five messages go in the commit body).
  - **Review:** independent, with a fresh `review-stamp`, through `ship-queue`. **Reviewer attacks:** an
    `import type` turned into a value import (the server image and the entry chunk grow); module evaluation order
    changing once the barrel is gone (a cycle that the barrel hid now reads a `const` before it is set: run
    `npm run lint` for cycles and load each `src/sim/railway-*.ts` file alone in Node); a path the script missed in a
    string (`rg "railway-world" src server test dev protos docs/agents` is empty apart from this plan's history); a
    sixth boundary the split allows that this list missed.
  - **Review leftovers** (branch `review/m3b`, `1f837d44b`). The three lint findings were fixed in M3c (the
    `import()` ban missed a template-literal path and a `'/src/…' as string` path; `src/net` could import a system
    file; `src/sim/railway-check*.ts` had no read-model ban). Left, because `dev/migrate/railway-imports.ts` is a
    one-off: its `--check` reports nothing left over a side-effect import (`import '…/railway-world.ts'`) or a
    double-quoted import of the deleted file, or over a namespace member `railway-systems.ts` no longer exports
    (`sys.railSession`); its namespace rewrite also edits a string literal (`'sys.railResume'`) and another object's
    property (`other.sys.railSession`); a comment inside an import's braces crashes it. A build-out branch that
    reruns it checks those forms by hand (`rg "railway-world|sys\.rail" <its files>`).
- [x] **M3c. A world driver; the seeds and the guards on the world.** _High (`src/sim`, `server/src/seeds`). After
      M3b. It is the first step of the read model's deletion and needs none of M8._ **Built 11 November, branch
      `ecs/m3c-world-driver`; not shipped.** `railway-drive.ts` (59 lines) has `need`, `createRailway`, `apply`,
      `invariant`, `restore`, `hash` and one more, `check(w)`: the load check on the world as it stands, which the
      seeds run per tick where they checked `line2Rails` and `footingTotal` on the model (no world twin of either
      exists before M8; the whole check holds both). `invariant` is `check`, then the round trip: until M8b
      `railwayCheck` itself runs `validateRailway` on the model, so it is the old proxy's check or more, never less.
      `railway-rows.ts` (103) has the 22 readers and the slot lists (`trees`, `rocks`, `trains`, `accounts`, `piles`
      and the rest); a missing slot throws. A seed is `Seed = { w: World; t: number }` (the world alone has no tick).
      The legacy helpers keep their names and shape: a fixture is `liveOf(seed.w)` and its tick, and their
      `act`/`advance`/`logs`/`rails`/`chopTo`/`advanceWorks` run the world seed's step and refresh the view, so no
      unconverted test changed but two plumbing lines: `test/railway-tick-order.test.ts` and one site in
      `server/test/railway-line-host.test.ts` called `buildSeedWorld` and read `worldOf(seed.s)`; both read `seed.w`
      now. `test/helpers/rail.ts` also re-exports the rules' entry points by name (`railTick`, `railSession`, …); its
      `job`/`qjob` are the rows, which shadow the queries' id getters of the same name. Lint gaps from M3b's review
      closed in the same branch (M3b's leftovers). Results: every stage hash, every ops hash and the tick-order
      fixture unchanged with `GOLDEN` unset; unit 969/969, server 150/150, `test:net` 131/131, each plain and with the
      `rail-audit` preload; `npm run loop -- run` equal to base but its wall time; game chunk names and sizes
      identical to base (the dev atlas page lists source files and grew by the two new ones); `look --rail-seed
      q6-done` loads, and the jump-in to `q6-done` reaches a room with all six line-two stretches laid. The jump-in
      eval's landing check fails by 1.4 m in z, the same on a rerun; the `q6-done` seed save is identical to base's but
      its wall-clock `epochMs`, so that is not this step's (a base look could not be run beside it). Kill table on the
      goldens alone: 10 of 18 mutations killed, one or more in every rule file; the other 8 reach edges no stage runs
      and are for the batches' tests. Not run: `npm run checkpoints`, Node 24, a device.
  - `src/sim/railway-drive.ts` (new, at most 80 lines): `need`; `createRailway(): World` (audit on);
    `apply(w, pid, action, tick, timing?)` (`railApply`, then `railSettle`); `invariant(w): string | null`
    (`railwayCheck` on a JSON snapshot loaded into a fresh world, the message or `null`); `restore(w): World` (the
    same round trip, hash asserted). No `Proxy`, no `Railway`.
  - `src/sim/railway-rows.ts` (new): the row readers (section 2), one per component kind. Its own file, so this step
    and M8 (which edits `railway-queries.ts`) share none and run at the same time.
  - `railway-seeds.ts`, `railway-seed-route.ts`, `railway-seed-works.ts` (544 lines) and `server/src/seeds/build.ts`
    take and return a `World`; `act`, `advance`, `logs` and `rails` take a world.
  - `src/sim/railway-live.ts` stays where it is for the unconverted tests and gains `liveOf(w: World): Live`.
    `test/helpers/railway-{q2,trains,works}.ts` keep their names and return `liveOf(seed())`, so no unconverted test
    changes here. `test/helpers/rail.ts` (new) re-exports the driver, the world seeds, the row readers and the queries
    for converted tests.
  - Guards onto the world: `test/helpers/railway-golden.ts` (92 lines) and its 9 shards, `test/railway-ops.test.ts`
    (216). Delete `test/railway-snapshot.test.ts` (38) and `test/fixtures/railway-v26-snapshot.json` (owner: save
    guards are not a priority).
  - Two committed scripts for the batches: `dev/migrate/test-census.ts <files>` (tests and `assert` calls per file)
    and `dev/migrate/rail-mutants.ts <files>` (applies each of about twelve named one-line rule mutations in turn,
    among them `TRAIN.dwellTicks` 50 to 51, a bill one log short, the forge lighting one log early, a carry cap raised
    by one, a block signal ignored, the kiln's count off by one, the away credit's cap removed; runs the given test
    files; restores the tree; prints the failing test names per mutation). Neither runs in `npm run check`.
  - **WORLD_NS:** none. **Mixed builds:** nothing shipped changes; the seed builder writes the same saves.
  - **Verify:** every stage hash in `test/fixtures/railway-golden.json` and every hash in
    `railway-ops-golden.json` unchanged, with `GOLDEN` unset; `npm --prefix server test`; one seeded room loaded by
    `npm run look -- --rail-seed q6-done`; `rail-mutants` kills every mutation with the goldens alone, or the
    mutation list is extended until each rule file has one.
  - **Reviewer attacks:** a seed step that used to read a value through the proxy after a rule and now holds a stale
    row across an `apply` (rows are replaced, not patched); `invariant` weaker than the one it replaces (the old one
    also ran `railwayInvariant` on the model: until M8b the driver calls it too); a mutation the script fails to
    restore after a crash (it must work on a copy or restore in a `finally`).

### Lane C: the adapter read

- [x] **M1. Pin the per-tick read and make it once a frame.** _Medium. `src/adapters/railway.ts`,
      `test/railway-adapter.test.ts`._
  - Performance rec 1 has landed: `readState()` returns the same frozen object while the view object, the estimated
    tick, the mirror's applied count and the movement tunables are unchanged, `inspect()` does the same over the
    session fields, and `hash` is a lazy getter. No test asserts it, and the key is still evaluated on every call:
    `movement()` builds an 18-field object from 18 `tune.get` calls and `sameMovement` compares them, at each of 130
    call sites.
  - Add tests: two `inspect()` calls with no packet, action or tick between them return the identical object; a
    packet, a predicted action, a tick, a tunable change, a reset and a refill each return a new one.
  - Add a frame memo: `update(nowMs)` already runs once a frame at the head of the railway entity, so it bumps a
    counter; `inspect()` returns the frame's object without evaluating the key when the counter and the predictor's
    pending count are unchanged. Outside the loop (tests, tools) the counter never moves and the key path runs as today.
  - **WORLD_NS:** none. **Mixed builds:** client only.
  - **Verify:** the new tests; `npm run perf` before and after at `--rail-seed trains-on`, reporting the railway
    entity's update row (expect a drop; record the number either way); a look at `--rail-seed trains-on` showing a
    deposit's count change on the press.
  - **Reviewer attacks:** a read that survives a prediction made inside the same frame (press, then read: the press
    must show); a read that survives a reconnect or a `refill()`; callers that hold the object across frames.
  - **Built (10 November):** four tests in `test/railway-adapter.test.ts` (identity and one key per frame; the no-loop
    key path; packet/action/tick/tunable/reset/refill each give a new read; a held read never changes). The frame memo
    sits in `inspect()`: after `update()` moved `frame`, a call returns the last object while the view object, the
    mirror's applied count, the pending count and the status/connected/synced/epoch/next fields are unchanged, so it
    skips the tick, the 18 tunables, `rail.step()`, `available()` and `stalled`. Consequence, by design: a tunable edit
    or the clock shows from the next frame, not inside the frame it changed in. New debug counts on
    `inspect().prediction.reads` (frames, inspects, readStates, keyEvals, stateBuilds, inspectionBuilds).
  - **Measured (counts, `look --rail-seed trains-on`, 301 frames, not a device):** reads per frame 137.5 both ways;
    key evaluations per frame **137.5 before, 1.0 after**; state builds and inspection builds 0.03 per frame
    both ways (9 vs 8 in 5 s). `npm run perf` was not run: counts, not timing under load, are the evidence.
- [x] **M8. The read facade, the timed queries and every fact as a query.** _High (`src/sim`, `src/world`). After M1
      and M3b, beside M3c. It may ship as the facade first and then one commit per domain file._
  - `src/sim/railway-line-schedule.ts`: `layProgress(spec, schedule, elapsed)`; `layLine1` and `layLine2` call it.
    `src/sim/railway-queries.ts`: `jobProgress(w, c, id, tick)` on the same function.
  - Four new query files, one per domain, so M10's groups never share one: `railway-queries-trains.ts`,
    `railway-queries-line1.ts`, `railway-queries-line2.ts`, `railway-queries-works.ts`. Each starts with the world
    version of that domain's `Railway`-shaped helpers that have no world twin yet (`line2Served`, `line2CartStatus`,
    `line2Logs`, `line2Rails`, `worksStage`, `pierNeed`, `footingTotal`, `railPanelCount`, `railCounts`, `railPhase`,
    the train reads).
  - **Grown by the owner's answer:** the four files and `railway-queries.ts` together hold a world version of all 33
    facts that take a `Railway` today (section 2's table), not only the ones a view reads, because the tests and the
    load check need the rest (`railCarryMax`, `railAxeAvailable`, `railBeamChoppable`, `railMaxDuration`,
    `line2PackReady` and the like). Same names, a `World` first argument, exported from the domain's query file. The
    old ones stay untouched until M12b.
  - `src/world/railway-predict.ts`: export `worldOf(s: Railway): World | undefined` (today's private `worlds` map).
  - `src/adapters/railway.ts`: add `read = { world: () => worldOf(view())!, tick, tickNow, pid, status: () => status }`.
    `src/entities/railway/state.ts`: `railwayWorldRead()` beside `railwayRead()`. `read.world()` is always the world
    behind the read model the views see now, so it inherits today's consistency rule: a read model is linked to a
    world only once that world is whole, and a refill is built aside and swapped in at its last chunk.
  - `test/railway-queries.test.ts`: on seeded action streams with ticks, every query equals its `Railway` twin on
    `railwayView(w)` (all 33, listed in the test so a missing one fails), and `jobProgress` equals `rail.at(tick)` for
    every job at every tick, on the confirmed mirror and on a predicted clone with a held-back threshold. The test is
    temporary: M12b deletes it with its old side.
  - **WORLD_NS:** none. **Mixed builds:** no wire change.
  - **Verify:** the differential test; the M0 goldens unchanged; `npm run loop -- run` equal to base.
  - **Reviewer attacks:** `jobProgress` on a job funded in a prediction (the mirror's `ahead` and `end` against the
    clone's rows); a completed job whose `end` is still −1 in the clone; the view world changing identity between two
    reads in one frame; `read.world()` before the first whole state, after a `reset()` and during a refill (it must
    never return a half-filled world).
  - **Built (10 November, branch `ecs/m8-read-facade`, two commits, not shipped):** `adapter.read = { world, tick,
    tickNow, pid, status }` with `world: () => worldOf(view()) ?? worldOf(confirmed)!`; `worldOf` exported from
    `railway-predict.ts`; `railwayWorldRead()` and its setter in `state.ts`, set and cleared by the railway entry. No
    view reads it yet (M10). `layProgress` in `railway-line-schedule.ts`; `jobProgress` in `railway-queries.ts` reads
    only the Job/QJob row (`start`, `ahead`, `end`, `completion`, timing), with a one-entry schedule cache per station
    as the mirror's clocks had. All 33 facts and `railTrainsOf` have world twins under the same names: the job reads
    (`railJobs`, `line2Jobs`, `railCurrentJob`), `railActiveStation`, `railAccount` and `railCarryMax` in
    `railway-queries.ts`, the rest in the four domain files (`railCounts` in `-line2.ts`, beside the line-2 logs and
    rails it sums). A fact that reads a timed field takes an optional `at`: absent, the run rows the tick advances
    (server, seeds, tests); given, `jobProgress` at that tick (a mirror or clone, whose run rows never move). A job
    read is `{ id, job, run }`, the rows themselves, not a merged shape. Where a system's world twin differs from
    the read model's helper (`cartWants` counts train cargo, `gateDown` skips Q3's completion, `kitOwed` is a boolean),
    the read model's arithmetic is the one ported, so the views keep what they show.
  - **Not done here, by the lane rule:** `layLine1` and `layLine2` (`railway-sys-line1.ts`, `railway-sys-line2.ts`,
    M3c's lane) still hold their own copy of the laying arithmetic; each can call `layProgress` in a one-line change,
    which the stage and ops goldens would then guard. **Done in M8b**, goldens unchanged.
  - **Reviewer attacks, answered:** a prediction never writes `ahead` or `end` (`rail.jobClock` runs only on the
    server, `railSettle` after an applied action) and holds funding back, so a clone's Job rows carry the mirror's
    clock fields as copied; a clone can only complete a job the mirror already completed, with its `end`. Two reads
    in a frame return the same world unless a press or a packet changed the view between them, as `inspect()` does
    today. Before the first whole state `world()` is the fresh railway world the confirmed read model was born
    linked to; through a refill it is the frozen view's world (the staged state is built aside); `reset()` is called
    by nothing in the adapter, and after one the confirmed model stays linked to its last whole world until the next
    whole state relinks it (its piles and accounts are cleared on the model, not on that world).
  - **Found, kept as it is:** `line2CartStatus` (both twins) throws when the cart has cargo aboard, no stretch is
    served and the cart is at or bound for home (`LINE2_STATIONS[-1]`). The differential test compares the throw.
    For the owner or a later step; not changed here.
  - **Verified:** `test/railway-queries.test.ts` (4 tests, about 1 s): the name list (33 plus `railTrainsOf`); a
    seeded 2,400-action stream and a laid-out Q1 with 32,076 fact checks on the server's rows, the server's clock, the
    confirmed mirror at the tick and 297 predicted clones (1 line-one and 3 Q1 bills held back), `jobProgress` per
    job against `at(tick)`; 300 random-row worlds; the facade (whole before a packet, the clone while pending, the
    same world twice, kept through a refill). Four one-line mutations (three in `jobProgress`, one in `line2CartWants`) each
    fail it. Unit tests 973/973 plain and with the audit preload; `npm --prefix server test` 150/150 both ways;
    `npm run test:net` 131/131 both ways; typecheck, lint, registry clean; `npm run loop -- run` identical to base
    but wall time; `npm run counts` 238 draws, 67 shadow draws, 209 programs before and after; the `trains-on` engine
    still identical but the chimney puff. Frame cost not measured (machine load 9 to 26): no view calls the facade
    or a query yet, so a frame does what it did after M1.
- [x] **M8b. The load check on the world.** _High (`src/sim`; what a save must satisfy to load). After M8 and
      M3c._ **Built 11 November, branch `ecs/m8b-load-check`; not shipped.**
  - `src/sim/railway-check.ts` keeps `railwayCheck(w)` (archetypes, counts, row limits) and calls four new flat
    files instead of `validateRailway(railwayView(w))`: `railway-check-line1.ts`, `railway-check-line2.ts`,
    `railway-check-trains.ts`, `railway-check-works.ts`, with the account, pile, outcome and catalog conditions of
    `validateRailway` in `railway-check.ts` itself. Each holds its old validator's conditions (452 lines, about 90
    `throw` sites) restated on row readers and queries, with the same message strings.
  - `test/fixtures/railway-bad-worlds.ts`: one entry per `throw` site, `{ message, break: (w) => void }`, built on a
    golden stage. `test/railway-check.test.ts`: every golden stage passes the world check; every bad world is refused
    with its message. While the old validators exist the test also runs `validateRailway(railwayView(w))` on the same
    worlds and requires the same verdict and message. A `throw` site no world edit can reach (an archetype or count
    check refuses first) is listed in the fixture with that reason.
  - Production switches in this step: the server's load, the seed build and the driver's `invariant` run the world
    check only. The old validators stay, unused by production, until M12b.
  - A build-out's component adds its check as its own function in its own file, called from `railwayCheck`
    (call 16), and one entry per `throw` to the bad-worlds fixture.
  - **WORLD_NS:** none expected. If a condition needs a value no row holds, add the field and bump here (section 2,
    "Where the wipe is used").
  - **Verify:** the check test; the M0 goldens unchanged; `npm --prefix server test`; the load check's time on the
    `q6-done` stage before and after (expected lower: no model is built).
  - **Reviewer attacks:** a row reader returning `undefined` where the model threw "missing", so a condition passes
    on nothing; a condition dropped in the restating (count the `throw` sites: old and new must match, or the
    difference is named); two faults in one world reporting a different message than before (accepted, and noted);
    the client: confirm nothing in `src/world/railway-replicate.ts` or the adapter relied on the old check.
  - **Built (11 November, branch `ecs/m8b-load-check`):** `railwayCheck` keeps its archetypes, counts and row limits,
    then `checkRailway` in `railway-check.ts` (validateRailway's catalog, fall, account, pile, tick, clock, outcome,
    supply, encoding, forge-bound and timing conditions on the rows) and the four flat files `railway-check-line1.ts`,
    `-line2.ts`, `-trains.ts`, `-works.ts`, each its validator's conditions on the row readers and the world queries in
    the same order with the same messages, then the log conservation on the world's `railCounts`. All three production
    callers go through `railwayCheck`, so they switched together: the server's load, the seed build and the driver's
    `check`/`invariant`. The old validators and `railwayInvariant` stay, unused by production, until M12b;
    `railway-live.ts` still runs both. No field was added and no `WORLD_NS` bump: every condition has a row or a query.
    The corpus: `test/fixtures/railway-bad-worlds.ts` holds 81 bad worlds (one edit each to `awake`, `q2-arriving` or
    `crossing-done`) for the 86 throw sites; 4 are unreachable from a world (the read model's playable state and
    timing, always there; the train and Works rows, which the count check refuses first) and 1 is dominated (the second
    'unlit cast'), each listed with its reason; two sub-conditions true by construction are dropped and named
    (`work.length === sources.length`, `depotOut.length === 6`). `test/railway-check.test.ts` requires each bad world
    refused with its message by the world check and by `validateRailway` on the world's read model, counts the old
    sites in their source, and holds the rail and footing conservation in the check the seeds run (M3c's review);
    `test/railway-check-stages-0..3.test.ts` accept all 34 golden stages by both checks. Dropping either conservation
    check or any of three other conditions fails it. The load check's time on `q6-done` as the server loads it (plain
    world, median of 7 × 500): 245.8 µs on main, 244.0 µs here; `awake` 212.0 to 223.0 µs: not lower as expected (the
    archetype walk dominates; the queries' repeated lookups cost what building the model did). Saves: no save is
    refused that main accepts, nor the reverse (same conditions, same order). The client relied on nothing: no file in
    `src/world` but the server install, and nothing in the adapter, calls the check.
  - **Folded in:** M8's leftover (`layLine1`, `layLine2` call `layProgress`); M8's review P3s (a mirror `reset()` keeps
    `read.world()` whole; a timed fact on a client's world without `at` throws, the client's worlds being marked;
    `read.world()` is `ReadWorld`, its writers typed `never`); M3c's review P3s (the seeds and drivers banned as value
    imports from views and `src/world`, the `import()` ban through casts, the census skipping skipped tests,
    `rail-mutants` without `GOLDEN`). Tests: `test/railway-read-facade.test.ts`, `test/railway-lint-review.test.ts`.
  - **Verified:** every stage, ops and tick-order golden unchanged with `GOLDEN` unset; unit tests 1116/1116 plain and
    with the `rail-audit` preload (997 before the corpus); `npm --prefix server test` 150/150 both ways; `npm run
    test:net` 131/131 both ways; typecheck, lint, registry, level-check and assets clean; `npm run loop -- run`
    identical to main but its wall time; the build's 415 asset names identical to main's. The corpus adds about 22 s
    to `test:unit`'s wall time (110 s to 132 s on 10 cores): the stage files rebuild every seed stage. Not run: a
    device, `npm run checkpoints`, Node 24.

### Lane B: out of `src/proto`

Each move step: `git mv`; rewrite imports with a script recorded in the commit body, covering `'../../proto/x.ts'`,
`'/src/proto/x.ts' as string` (the look evals) and path strings in `dev/level/`; make the owner parameter required and
remove `else scene.add` and `else onFrame` fallbacks; `npm run lint -- --prune-suppressions`. Imports that are
`import()` today stay `import()` at the same call sites, so the entry chunk does not grow; turning them static is a
later change with a bundle report. Place's remaining callers get one owner from a new `src/proto/place/place-owner.ts`
(a `createOwnedView()` whose root Place adds to the scene), so `?proto=place` keeps running until M13.

- [x] **M4. Render primitives to `src/render/`.** _Low to medium (renames; the frame hook in `fanfare`)._
  - `src/proto/flat.ts`, `src/proto/net/{boxes,box-plan,crates}.ts`, `src/proto/wagon/look.ts`,
    `src/proto/place/{part-geometry,prop-kit,gear-models,axe-models,carry-models,axe-sparkle}.ts`;
    `src/proto/minis/common.ts` becomes `src/render/fanfare.ts`; Place's `head-clearance.ts` merges into
    `src/render/head-clearance.ts` (place-retirement R1).
  - Frame hooks and scene adds to convert: `minis/common.ts:63`, `wagon/look.ts:235`, `net/boxes.ts:63`,
    `net/crates.ts:33` and `:178`.
  - **Done 10 November (branch `ecs/m4-render-moves`):** moved with `git mv` to `src/render/`: `flat`, `boxes`, `box-plan`, `crates`,
    `wagon-look` (was `wagon/look`), `part-geometry`, `prop-kit`, `gear-models`, `axe-models`, `carry-models`, `axe-sparkle`,
    `fanfare` (was `minis/common`); Place's `head-clearance.ts` was only a re-export, deleted, its importers point at the render file.
    `fanfare`'s frame hook was the big world label (`label`, used only by Place's halts, depot and pair): it moved to
    `src/proto/place/label.ts`, so `fanfare` is sounds only. The module-level `scene.add` in `boxes` and `crates` and the
    owner-less `onFrame` fallback in `wagon-look` are unchanged, each with a `use-an-entity` directive; the owner conversion
    is deliberately not done in M4 (a move step changes no behaviour; its callers are all prototypes) and is listed under M13. `boxes`, `carry-models` and `wagon-look` still import
    `proto/era/blocks`, `proto/place/layout` and `proto/wagon/cars` (directives; they go when M5 and M6 move those).
    `src/proto`: 148 files and 36,118 lines to 136 and 34,459; `src/render`: 92 and 11,605 to 104 and 13,275. Build: 350 chunks both sides; `common` is now
    `fanfare`, two of the four `look` chunks are `wagon-look`; first-load gzip identical (837 KB js, 14 css, 92 other); `main`
    484,204 to 483,814 bytes. Looks before and after (trains passing, a boiler haul, every `fanfare`, `boxes`, `crates`,
    `wagon-look`, `carry-models` and kit module called in-page): same pictures, no console errors. `bench` census not run.
  - **Verify:** `npm run check`; `npm run bench -- --poses spawn,town` with the scene census (meshes, draws,
    triangles) identical to base; one look at `--rail-seed trains-on`.
  - **Reviewer attacks:** a module-level `scene.add` that used to run on import and now never runs; the remaining
    prototypes (`?proto=net`, `wagon`, `greybox`) still load.
- [x] **M5. Land, layout and the shared village kit to `src/place/`.** _Medium._
  - `layout`, `land`, `terrain`, `shore-layout`, `tech-layout`, `home-station`, `spatial-station`, `support`,
    `chop-timing`, `tree-catalog`, `tree-sources`, `pose`, `cove`, `cove-ground`, `cove-material`, `cove-sand`,
    `cove-stop`, `cove-textures`, `cove-tuning`, `cove-view`, `far-ground`, `water`, `look`, `look-kit`, `pieces`,
    `sites`, `signs`, `folk`, `chatter`, `talk`, `building-plans`, `opening-plans`, `opening-models`, `opening-stops`
    (place-retirement R2). Its D1d comes forward: `look-kit` takes `boilerShown: () => boolean` from its caller, so
    `job.ts` stays behind in Place and the live game stops reaching it.
  - `land.ts`'s `addStatic` takes the owner. Hooks and adds to convert: `land.ts` (10 `scene.add`, 2 `addBody`),
    `pieces.ts:102`, `:109`, `:234`, `look-kit.ts:230`, `:346`, `:363`, `:417`, `:554`, `:572`, `look.ts:332`,
    `folk.ts:58`. `dev/lint/policy.ts` gains `src/place/**`; `src/README.md` gains a `place/` line.
  - **Done 11 November (branch `ecs/m5-place-moves`):** the 34 files moved with `git mv`; `dev/lint/policy.ts` gives
    `src/place/**` the three exemptions `src/proto/**` has (static proto imports, input reads, the entity ratchet), so no
    file content changed beyond import paths; `src/README.md` gains its `place/` line. The `render/carry-models`
    directive is gone. **Not done, and listed under M13 with M4's:** `addStatic` taking the owner, the `scene.add`, `addBody` and
    `onFrame` conversions named above, and D1d (`look-kit` still imports Place's `job.ts` for `job.boiler` and `job.rung.trains`
    at two lines; the callers are `rail.ts` and the live `line2-view`, `view` and `cart-view` loaders). `proto/place` imports from
    `src/place` remain: `look-kit` (`job`, `wagon/engine`, `engine-kit`), `folk` (`machine-model`), `land` (`terrain-pass`).
    `src/proto`: 136 files and 34,459 lines to 102 and 26,482; `src/place`: 34 files, 7,977 lines. Build: 350 chunks, same
    names, first-load gzip identical (837 KB js, 14 css, 92 other); `level-check` output identical.
  - **Hold:** check `npm run inflight` for the terrain pass and the Ring Island landform, which edit `land.ts`, and
    land this the day it is rebased.
  - **Verify:** `npm run check` (level-check reads the layout); the bench census identical at `spawn`, `town`, `forge`
    and `far`; `npm run level-check` output identical to base; a look at the village and one at `--rail-seed q6-done`.
  - **Reviewer attacks:** colliders (`addStatic` bodies) present and counted the same; `import.meta.glob` or URL
    imports that resolved relative to the old folder; `place.css` still loaded by its users.
- [x] **M6. The railway's own modules to `src/entities/railway/`; split `rail.ts`.** _Medium._
  - `rail.ts` as in section 2. Also `stations`, `seat`, `seat-claims`, `track-panels`, `machine-model`,
    `machine-panels`, `train-load`, `chop-motion`, `engine-kit`, `car-kit` from Place and `wagon/{engine,cars}.ts`.
  - Hooks and adds to convert: `rail.ts:845` (`addBody`), `:852`, `:1424`; `seat.ts:283` and `:289`;
    `stations.ts:179`, `:209`, `:225`, `:236`, `:247`, `:274`. `seat.ts` keeps `placeSeatRequest`, `placeSeatPose` and
    `placeSeatGrants` by name, and its getters still return `null` when off.
  - `dev/level/{replay,timber-track,grounding-track,grounding-props,machine-clearance}.ts` read `rail.ts` as source
    text by markers (`'const P:'`, the `// --- track:` rule line, `'  const u ='`, `'  const solids: Solid[]'`). Point
    them at `line-geometry.ts` (import it: it has no three.js) and at `track.ts`, keeping the markers `track.ts` needs.
  - After this step `rg "proto/" src/entities/railway` shows only `proto/flags.ts` and `proto/mark.ts`.
  - **Done 11 November (branch `ecs/m6-railway-moves`):** the ten Place modules and `wagon/{engine,cars}` moved with `git mv`.
    `rail.ts` (at `3d4e15e77`) was cut by line range: 68-78 to `line-geometry.ts`, 80-772 to `track.ts`, 774-957 to `car.ts`,
    959-1443 to `track-machine.ts`; each byte-identical but for `export` on `P`, `lateral` (shared) and `BOTTOM`. Place's train
    (1445 to the end) stays in `src/proto/place/rail.ts`. The plan's line numbers (1-88, 89-810 ...) were 20-odd lines off.
    `rail-kit.ts` re-exports the four so the views' `import()` loaders changed path only (retire it when M10 imports the files
    directly). Hooks, adds and the key read were not converted (listed under M13): `dev/lint/policy.ts` exempts `car`, `seat`,
    `stations`, `track-machine` and `machine-model`. `dev/level` readers point at `line-geometry.ts` and `track.ts`;
    `replay.ts` keeps reading historical refs at the old paths (M5's rename of those reads had broken `level-check --replay`).
    D1d done as its own commit: `kitCars` and `trainLook` take `boilerShown`; nothing live reaches `job.ts`.
    `rg "proto/" src/entities/railway` still shows `place/place.css` (`arrival.ts`) and `place/workshop.ts` (`forge-finish.ts`): M7's.
  - **Verify:** `npm run check`; `npm run level-check` output identical to base (track continuity, grounding, machine
    clearance); the bench census identical; `npm run scenario -- smoke`; looks at `--rail-seed trains-on` (a train with
    a seated rider) and mid-lay on line 2.
  - **Reviewer attacks:** two players claiming one seat (the Host grant still arbitrates); the machine's frame order
    (it was `onFrame` order 7; the owner's `animate` must keep it); a collider added twice or never for a car.
- [x] **M7. The town's modules to `src/entities/town/`.** _Low to medium._
  - `rooms`, `house`, `shop`, `museum`, `residents`, `town-lines`, `workshop`; split `place.css` into
    `src/entities/railway/railway.css` and `src/entities/town/town.css` (place-retirement R3).
  - `town-lines.ts` moves verbatim: the diff must be a pure rename. List any line that looks wrong for the owner; edit
    none.
  - **Done 11 November (branch `ecs/m7-town-moves`):** `rooms`, `house`, `museum`, `residents`, `shop`, `town-lines`, `workshop`
    moved with `git mv`. `town-lines`, `rooms`, `house` and `museum` are byte-identical (`git diff -M` 100%); `residents`,
    `shop` and `workshop` differ only in 1 to 2 import lines. `place.css` became `src/entities/railway/railway.css` (231 lines)
    and `src/entities/town/town.css` (108 lines: the `.place-talk*` and `.place-bark` rules, old lines 136-243), sorted lines equal
    to the old file. Both load where `place.css` did (`arrival.ts`, and Place's `index.ts`), not from the town view: the
    shore greeter in the railway view uses `.place-talk` before the town loads. `workshop` (`forge-finish.ts`) and the stylesheet
    (`arrival.ts`) were the two railway leftovers; `rg "proto/" src/entities/railway` now shows only `flags.ts` and `mark.ts`.
    `src/entities/town/workshop.ts` joins the entity-ratchet exemptions (its add is unchanged).
  - **Verify:** `npm run check`; the bench at `town`; a look inside the museum and the shop.
  - **Reviewer attacks:** `git diff -M --stat` shows 100% similarity for `town-lines.ts`; a CSS rule dropped in the
    split.
- [x] **M9. Chunk and cull the committed track.** _Medium (render). After M6. `src/entities/railway/track.ts`,
      `src/place/look-kit.ts`, `src/place/pieces.ts`._ **Built 10 November, branch `ecs/m9-track-chunks`** (details after the checklist).
  - Today `lookTrack` makes one `InstancedMesh` per piece kind per line and turns `frustumCulled` on, but the batch's
    bounding sphere spans the line, so it is drawn whenever any of the line is in view; sleepers and rails already cast
    no shadow.
  - Split each kind's batch into chunks of 50 m along `u` (performance rec 3): `chunkOf(u) = floor(u / 50)`, one
    `InstancedMesh` per kind and chunk, sized from the piece table, with its own bounding sphere recomputed when a
    piece lands in it. Keep each piece's material role and its grain seed (today the instance index: pass the piece's
    global index as an instance attribute so the grain does not change). Legs, braces, caps and stringers cast shadows
    only in chunks within `TRACK_SHADOW_M` of the camera (a tunable, default 120).
  - **WORLD_NS:** none; cosmetic. **Mixed builds:** client only.
  - **Verify:** `npm run bench -- --poses spawn,town,forge,far` and `--rail-seed q6-done --poses pier,head`, before and
    after: triangles and shadow casters down, draw calls reported (accept at most +30 at `far`, where the whole line
    shows); `npm run perf` at `--rail-seed trains-on`; looks along the trestle at Far Head, at the machine mid-lay
    (pieces falling into a chunk that was empty), and one pixel comparison of a sleeper's grain before and after.
  - **Reviewer attacks:** a piece on a chunk boundary drawn twice or not at all; a chunk culled while a tall leg in it
    is on screen; pop when a chunk's shadows switch; the laying animation crossing a boundary.
  - **Built (10 November); the 50 m of the step above was changed to 200 m / 400 m, see below.** `track-chunks.ts` (pure:
    `chunkOf(u, kind)`, `chunkRuns`, `growBounds`, `castsShadow`; `TRACK_SHADOW_M` 120 with 20 m of hysteresis) and
    `lookTrack` in `look-kit.ts`, which gets each piece's chunk from `track.ts`. A chunk is a run of consecutive same-kind
    pieces in one stretch of u (so a piece is in exactly one); its bounds are the union of what has landed in it (falling
    pieces included, +0.3 m), it is hidden until something has, and the kit's arrival cannot re-bound it. The grain seed
    is kept by `userData.grainBase` (the run's first index in its kind) read through one shared object-update uniform in
    `paint()`, so no material gained a variant: after-visit counts are 242 programs / 164 to 165 pipelines on base and
    branch alike. The warm-up frame (`warmDraw`) draws every chunk casting so no shadow pipeline waits for the camera.
    Planks keep their shadow (not on the list). The level tools bind `chunkOf` by name (two lines each in
    `dev/level/{machine-clearance,grounding-track}.ts`).
  - **Why not 50 m.** Every chunk is a draw and from Far Head the whole line shows. Uniform 50 m gave 713 to 833 calls
    there (+17%) for 7% fewer triangles; most of the triangle saving anywhere comes from not drawing unlaid pieces
    (the base drew each as a zero-size instance), not from the chunk length. Per kind, the rail (228 triangles), the
    sleeper (44) and its plate (104) are the heavy kinds; posts, planks, caps, stringers and braces are 44 triangles each
    and 64 of the 164 chunks at 50 m. Merging kinds into one batch per chunk is not possible (each kind has its own
    material and geometry), so the lever is the span per kind: **heavy kinds 200 m, light kinds 400 m**
    (`TRACK_CHUNK_M`, `TRACK_LIGHT_CHUNK_M`). Head and pier, bench at the Q6 seed (heavy, light):

    | Spans | Head calls | Head triangles | Head shadow-pass triangles | Pier calls | Pier triangles |
    | --- | --- | --- | --- | --- | --- |
    | base | 713 | 1,393,154 | 138,396 | 181 | 948,763 |
    | 50, 50 | 833 | 1,296,086 | 95,716 | 185 | 667,271 |
    | 100, 100 | 787 | 1,319,162 | 102,580 | 182 | 668,855 |
    | 150, 150 | 758 | 1,324,002 | 107,420 | 181 | 704,411 |
    | 50, 400 | 803 | 1,334,982 | 118,904 | 180 | 705,947 |
    | 100, 400 | 769 | 1,351,194 | 118,904 | 180 | 705,947 |
    | 150, 400 | 748 (+4.9%) | 1,351,194 | 118,904 | 181 | 727,379 |
    | **200, 400 (kept)** | **741 (+3.9%)** | **1,351,194** | **118,904** | **181** | **727,379** |
    | 400, 400 | 729 | 1,373,662 | 118,904 | 181 | 760,211 |

  - **Numbers at the kept setting** (bench, 1280x800 DPR 2, same poses, calls and triangles exact; times under a load of
    10 to 20 are not evidence and are left out). Base to branch, calls / triangles / shadow-pass triangles / shadow
    casters: spawn 325 to 324 / 946,571 to 584,571 / 106,432 to 91,132 / 468 to 460; town 292 to 295 / 1,101,996 to
    794,748 / 101,396 to 87,536 / 466 to 458; forge 233 to 229 / 1,109,956 to 798,548 / 101,396 to 87,536 / 466 to 458;
    far 312 to 296 / 1,353,070 to 888,466 / 102,052 to 88,192 / 466 to 458; pier 181 to 181 / 948,763 to 727,379 /
    124,074 to 104,582 / 609 to 610; head 713 to 741 / 1,393,154 to 1,351,194 / 138,396 to 118,904 / 609 to 611. No pose
    rises more than 3.9% in calls. Looks (close on the trestle, across the bay, a walk across the 200 m and 400 m
    boundaries) are pixel-identical to base on the track (what differs is the water's caustic lines). The laying was
    watched live at the 50 m setting (`--eval` over the production route to T2): each chunk turns visible on its first
    piece and its sphere grows as the machine lays through it, then the next chunk starts at the boundary. Not tested on
    a device.

### The conversion tail (runs beside the build-outs)

- [ ] **M10. Views read rows and queries, one group at a time.** _Medium each (High with a new query). After M6 and
      M8. Groups share no file, so they run in parallel; each ships alone._
  - Per group: replace each `adapter.inspect()` field with a row read or a query; move any derived arithmetic found in
    the view into that group's own query file (a: `railway-queries-trains.ts`, b: `-line1.ts`, c: `-line2.ts`,
    d: `-works.ts`; e and f add none, and ask for one through the owning group) with a test. A group that adds a query
    edits `src/sim` and ships as High. Adapter fields nobody reads any more are deleted in M12, not here.
  - A view's unit test builds a world with the M3c driver and seeds and passes it as `read.world()`; no group adds a
    `Railway`-shaped or `inspect()`-shaped literal. Group f also changes `townRead(s: Railway)` in
    `src/sim/town-facts.ts` to `townRead(w)` and converts `test/town-facts.test.ts` (111 lines).
  - **a. Trains and halts:** `train-view`, `halts-view`, `halt-map`, `request-lever`, `up-platforms`, `stock-sign`
    (and `railServing`, `railTrainAsked`, `railTrainHeld`, `railOpenEnd` from the adapter become queries).
    **b. Line 1:** `view`, `sources`, `panel-view`, `path`, `reward`, `crates-view`, `great-tree-view`, `line-cargo`,
    `beam-drag`, `supply-view`. **c. Line 2:** `line2-view`, `shelf-view`, `cart-view`, `boiler-view`, `forge-call`,
    `forge-finish`, `forge-offer`, `far-head-view`, `pier-view`. **d. Works:** `works-view`, `works-live`,
    `works-box-view`, `breaker-view`, `footing-view`, `crossing-view`, `crossing-show`, `roundhouse-view`,
    `home-station-view`, `trophy-plinth`. **e. Abilities and arrival:** `tools`, `hook-shot`, `hook-view`, `glide`,
    `glide-view`, `glide-device-view`, `sea-gate-view`, `ability-arrival`, `arrival`, `back-down`, `help-carry`.
    **f. Outside readers:** `src/entities/{town,wardrobe,finds,ring-island}`, `src/render/water-render.ts`,
    `src/render/water/frozen-sky.ts`, `src/sim/town-facts.ts`, `src/debug/dev/inspect.ts`.
  - **Verify (each group):** its unit tests; `inspectRailway()` output equal to base on two seeds (the view's own
    `inspect` is the oracle: dump it with `--eval` before and after); one look at the group's seed (`trains-on`,
    a fresh room mid-chop, `q5-done`, `crossing-done`, the hook device).
  - **Reviewer attacks:** a predicted press that no longer shows on the press (owner call "Input gets instant
    feedback"); a view holding a row across a packet (rows are replaced, not patched); a count that read
    `availableCarry` and now ignores pending actions.
  - **Readers added for the groups (11 November, branch `ecs/m10-facade-readers`; asked for by b and e, for c, d and
    f too).** Use these instead of the `inspect()` fields of the same meaning; each equals that field at the same
    moment (`test/railway-read-session.test.ts`, a differential over a lagged random stream):
    - `adapter.read.ready(): boolean` for `inspect().ready` (an action can be sent now). Not `read.status() ===
      'ready'`, which stays 'ready' while the pending window is full.
    - `adapter.read.pending(): number` for `inspect().pending`; `adapter.read.stalled(): op | null` for
      `inspect().stalled`.
    - `adapter.read.movement(): Readonly<RailwayMovement>` for the 18 movement tunables `inspect()` spreads
      (`jumpImpulse`, `jumpTurn`, `jumpSteer`, `jumpApexSpeed`, the beam, boiler and footing speeds, the glide fields
      `stepGlide` reads): one frozen object, re-read only when the tune state's `rev` moves. Views never import
      `world/game-world`.
    - `adapter.read.tick()` now holds one value per frame, `inspect().tick`'s (it was live): pass it as `at` and read
      `read.world()` in the same frame, and an edge such as waking to idle is seen once. `read.tickNow()` stays live,
      for movers.
    - `treeGrowth(w, slot)` in `railway-queries-line1.ts` for `inspect().growth[k]`.
    - `freeCarryIgnoringBig(w, pid)` in `railway-queries-line1.ts` for `inspect().freeCarry`: carryMax less what the
      back holds, not 0 while a beam, the boiler or a footing is held (unlike `free`; "Your back is full" needs it).
      Both are in M8's name list in `test/railway-queries.test.ts`.
    - In the loop the read's tick, movement and stall cue are now taken once a frame, at the first read, also on a
      rebuild later in the frame (a press, a packet): before, such a rebuild took them live. `REGROW_MINUTES` moved
      to `railway-supply.ts` (exported) so the query names it.
- [ ] **T1 to T7. The tests, rewritten on rows and queries.** _Low each (tests only). After M3c and M8. Seven
      batches, one agent each, in parallel: no two batches, and no batch and M10 group, edit the same file._
  - Per batch: state is a `World` from `test/helpers/rail.ts`; `s.a.b` reads become row readers; the 33 facts become
    their queries; `edit(s, fn)` becomes `fn(w)`; `invariant`, `restore` and `hash` come from the driver; a server
    test reads `host.rules.railway.world()` instead of `rules.railway.railway`. No batch edits a file under `src/`,
    the legacy helpers (`test/railway-live.ts`, `test/helpers/railway-{q2,trains,works}.ts`) or another batch's files.
    A batch that needs a reader or a query that does not exist stops and asks for it through M8's owner.
  - Per batch, in the commit body: the census before and after (`dev/migrate/test-census.ts`) and the kill table
    before and after (`dev/migrate/rail-mutants.ts`) for its files. Test and `assert` counts equal and the kill tables
    identical, or each difference named with its reason. An assertion on a model-only shape (the flattened station 1
    fields, `falls`) is restated on the rows it was derived from, not dropped.

  | Batch | Files | Lines |
  | --- | --- | --- |
  | T1 line 1 and core (done) | `test/railway.test.ts` (168), `railway-line.test.ts` (203), `railway-line-authority.test.ts` (517), `railway-placement.test.ts` (131), `railway-supply.test.ts` (236) | 1,255 |
  | T2 line 2 (done, branch ecs/t2-tests-line2) | `test/railway-line2.test.ts` (656), `railway-cart.test.ts` (205), `railway-boiler.test.ts` (302), `review-v25.test.ts` (88) | 1,251 |
  | T3 trains (done) | `test/railway-train.test.ts` (582), `railway-trains.test.ts` (556), `review-v26.test.ts` (226) | 1,364 |
  | T4 works (done) | `test/railway-works.test.ts` (562), `railway-set-down.test.ts` (94) | 656 |
  | T5 server, the lines (done) | `server/test/railway-line-host.test.ts` (806), `railway-host.test.ts` (474) | 1,280 |
  | T6 server, works and away | `server/test/railway-works-host.test.ts` (370), `railway-away.test.ts` (304) | 674 |
  | T7 server, supply and the rest | `server/test/railway-supply-durability.test.ts` (258), `railway-supply-order.test.ts` (76), `fixtures/railway-supply-fixture.ts` (114), `railway-tuning-budget.test.ts` (179), `railway-actor-checks.test.ts` (152), `railway-crash.test.ts` (108), `railway-shared-unlock.test.ts` (167), `jump.test.ts` (366) | 1,420 |

  The other 2,613 lines convert with the step that changes what they test: the guards in M3c (382, of which 38 are
  deleted), `test/town-facts.test.ts` in M10 f (111), `test/loop-graph.test.ts` in M11 (77), the adapter, mirror and
  marks tests in M12 (2,032), and the 11 lines of legacy helpers are deleted in M12b. Total 10,513.
  - **Verify (each batch):** its files pass; `npm run check`; the two tables.
  - **Reviewer attacks:** an assertion that compared two reads of the same live proxy and now compares one row with
    itself; a row held across an `apply` (stale: rows are replaced); a test that passed through the proxy's
    read-only guard and now writes a row without `mut` (audit mode throws: keep audit on in every converted test); a
    `deepEqual` against a whole model object silently narrowed to two fields.
- [ ] **M11. The server and its tools read the world.** _High (`src/world`, `server/`). After M8 and T5 to T7 (they
      are the getter's last test readers)._
  - `src/world/railway-server.ts`: `counts`, `phase`, the panel numbers and `railMaxDuration` come from queries; the
    lazy `railway` getter goes. `dev/loop/run.ts` and `dev/loop/host.ts` read through the same API.
  - Tools off the model in the same step: `dev/loop/run.ts` (1,016 lines; 7 calls of the old facts),
    `dev/peer-test/ws-railway.ts` (1,008; the proxy and 6 getter reads) and `ws-page.ts` (499), and
    `test/loop-graph.test.ts` (77), which casts a literal to `Railway`.
  - **Verify:** `npm --prefix server test`; `npm run test:net`; `npm run loop -- run` equal to base; `npm run load` on
    three rows with server ms a step no worse than base.
  - **Reviewer attacks:** reach and cadence checks unchanged for every op (replay `server/test/railway-actor-checks`
    with widened inputs); the away credit's cap (`railMaxDuration`) on a room resumed after days.
- [ ] **M12. Delete the client's read chain.** _High (`src/world`, the predictor). After M10 and M11._
  - `createPredictor<World, Act>`: the predicted state is the cloned world itself; `railwayOf`, `cloneRailway`, the
    `WeakMap`, `rail.at`, `advance()` and the mirror's `Railway` go. The consistency rule the read model carried
    becomes explicit in `createRailwayMirror`: packets write an ingest world, and `confirmed()` is a copy-on-write
    clone published only when `mirror.whole()` and a packet has fully applied; views and the predictor read
    `confirmed()`, and the adapter's `frozen` holds a published world. `src/adapters/railway.ts` is split and deleted
    (section 2). Nothing of the read model survives this step in `src/world` or `src/adapters`: M12b then deletes
    the files. (The barrel `railway-world.ts` went in M3b.)
  - Tests rewritten here, 2,032 lines, with the census and kill table as in the batches:
    `test/railway-adapter.test.ts` (971), `test/railway-adapter-m1-review.test.ts` (205),
    `test/railway-replicate.test.ts` (729), `test/railway-marks.test.ts` (127). A test whose subject this step
    deletes (the frozen read's identity and its per-frame memo from M1, `buildState`'s shape) is deleted and listed
    by name in the commit body; a test of behaviour (prediction, settle, corrections, refill, reset, late join) is
    converted, never dropped.
  - **Verify:** `test/railway-replicate.test.ts` and `test/railway-adapter.test.ts` (rewritten onto worlds: predicted
    state equals the server's after the last ack for 2 to 6 simulated clients); `npm run test:net`; `npm run load`, all
    rows and `crowd`, with corrections and press-to-effect no worse than base on the same machine and session;
    looks of a deposit, a contested last log between two pages, and a reconnect mid-carry.
  - **Reviewer attacks:** thresholds shown early (a bill that reads complete before the server says so); effects
    played twice (once predicted, once confirmed); a correction with no recipient; a late joiner mid-chunk, a refill
    and a `reset()` each reading a half-filled or empty world; memory held by retained clones.
- [ ] **M12b. Delete the read model.** _High by path (`src/sim`), deletions only. After M8b, T1 to T7, M10, M11 and
      M12._
  - Delete `src/sim/railway-read-model.ts`, `src/sim/railway-live.ts`, `test/railway-live.ts`,
    `test/helpers/railway-{q2,trains,works}.ts`, the `Railway` type and `railAccount`, `railCounts`, `railPhase` and
    the re-export block in `railway.ts`, the other 30 facts and the five validators in `railway-line.ts`,
    `railway-line2.ts`, `railway-works.ts`, `railway-trains.ts` and `railway-check.ts`, `railwayInvariant`, the old
    side of `test/railway-check.test.ts`, `test/railway-queries.test.ts`, and the spikes
    `dev/spikes/ecs/{railway-diff,predict-cost,server-path}.ts` (answered; they compare against the model).
  - Lint: M3b's rule 5 goes with the file. In its place a `no-restricted-syntax` rule refuses an export named
    `Railway`, `railwayView` or `validateRail…` under `src/sim` and `src/world`, so the shape does not grow back
    under a build-out.
  - Row-shaped types the rules and views still use (`RailTrain`, `RailCart`, `RailAccount`, `RailPile` and the like)
    stay: they are component rows, not the model.
  - **WORLD_NS:** none. **Mixed builds:** nothing a client or a save sees.
  - **Verify (the numbers in section 2's "done" table):** the `rg` line there is empty; no file imports a type
    named `Railway`; `npm run check`; the M0 goldens unchanged; `npm run loop -- run` equal to base;
    `rail-mutants` over the whole railway test set kills what it killed before T1.
  - **Reviewer attacks:** a domain file left with a dead import or a helper only the deleted code called
    (`npm run scan`); a doc that still describes the model as current (`ecs-e.md` section 4, `sync.md`,
    `src/sim/AGENTS.md`).
- [ ] **M13. Delete Place.** _Medium to high (tools). After M7; independent of M8–M12._
  - [place-retirement](place-retirement.md) job D1 as written (D1a flags, D1b pause, D1c the Dev menu, D1e tools),
    plus the 230-line remainder of `rail.ts` and `place-owner.ts`. Tag the parent `archive/place` first. It needs the
    D1 brief on what still drives Place (orchestrator-state, Leftovers): 148 files name the entry, 53 of them look
    evals and 9 beats.
  - **Owner, 10 November:** "Delete the ones with a live-game twin, retarget the level check, and tag an archive of
    Place first". The tools by group, from `rg -l "proto=place|proto/place|__place"` over `dev`, `test`, `server` and
    `protos` at `05696f2f1` and [place-retirement](place-retirement.md)'s list. The M13 brief names each deleted
    file's twin before it goes; a file found to have none moves to group 3.
    1. **First:** tag the parent commit `archive/place` and push the tag; name it in the commit body and in
       `docs/game-design/place.md`.
    2. **Delete (a live-game twin exists: a `railway-*` eval, the railway bot, a rail seed).**
       Evals in `dev/look/evals/`: `place-act`, `place-big-reload`, `place-cart-whistle`, `place-contact`,
       `place-coop`, `place-corner`, `place-cues`, `place-draws`, `place-early-beam`, `place-exploring`,
       `place-forge-reconcile`, `place-great-carry`, `place-job`, `place-kit-draws`, `place-partner-load`,
       `place-personal-saves`, `place-seats-workshop`, `place-split`, `place-tech`, `place-tech-act`,
       `place-town-coop`, `place-trees`, `place-trees-coop`, `placement-audit`, `replay-bridge`,
       `replay-idle-landing`, `replay-pause-bottom`, `replay-pause-talk`, `replay-phone-cost`, `sheet-enter`,
       `sheet-glide`, `sheet-hook`, `sheet-opening`, `sheet-ride`, `double-jump`, `track-layer`,
       `track-layer-action`, `track-panel-contract`, `tunables-chop` (39 files).
       Bots: `dev/look/bots/place.ts`, `place-landing.ts`, `double-jump.ts`.
       Harness: `dev/look/checkpoints.ts`, `restore-pair.ts`, `coop-warp.ts`, `saves.ts`;
       `dev/video/shots/place.ts`, `round4.ts`, `round4-pair.ts`.
       Tests: `test/big-cargo.test.ts`, `train-nudge.test.ts`, `place-coop-snapshot.test.ts`, `restore-pair.test.ts`,
       `checkpoint-pair.test.ts`.
    3. **Retarget onto the live game (no twin; the subject is not Place).**
       Evals that only pass the old entry: `axe-chop`, `carry-tag`, `color-defaults-capture`, `color-defaults-unlit`,
       `draw-overflow`, `fixed-exposure-controls`, `fixed-exposure-review`, `gpu-reload`, `sky`, `tone`; and the
       railway evals that still name it: `railway-b4-at`, `railway-b5b8-at`, `railway-bench`, `railway-clips`,
       `railway-halts` (its `__place.skipTrains()` becomes `--rail-seed trains-on`), `railway-job`,
       `railway-passenger-car`, `railway-passenger-car-two`.
       Beats: `dev/look/beats/{chair-comparison,cloud-warmth,colour-textures,dev-looks,lighting-wedge,material-palettes,terrain-cove,unlit,visual-pipeline}.ts`
       and `dev/look/fixtures/chair-comparison.ts`.
       Harness and others: `dev/look/playthrough.ts`, `coop-playthrough.ts`, `observe.ts`, `sheet.ts`, `segments.ts`,
       `garage-showroom.ts`, `bots/railway.ts`; `dev/codex/see.ts`, `dev/audio/render.ts`, `dev/patch.ts`,
       `dev/scan/retained.ts`, `dev/scan/task-routes.ts`, `dev/scenarios/run.ts`, `dev/scenarios/reconnect-edit.ts`,
       `dev/playtest/beats.ts`, `dev/loop/graph.ts`, `dev/economy/model.ts`; `protos/protos.ts` (the card keeps the
       id `place`, call 12).
       Tests: `test/invite-flags.test.ts` (the new `pageQuery`), `loop-graph.test.ts`, `railway-line.test.ts`,
       `railway-works-layout.test.ts`, `seat-claims.test.ts` (import paths and comments).
    4. **Retarget the level check.** `dev/level/check.ts` (its `--place=place` progression, from line 406, with constants
       copied from Place's layout) and `dev/level/replay.ts` are rewritten onto railway seeds and
       `src/sim/railway-*-layout.ts`; `dev/level/spatial.ts`, `track-continuity.ts`, `world-blockout.ts` and
       `dev/economy/place-level.ts` follow; `grounding-props.ts`, `grounding-track.ts`, `timber-track.ts` and
       `machine-clearance.ts` were pointed at `track.ts` by M6 and lose their last Place path here. `npm run
       level-check` keeps every assertion that is about the live world; an assertion about a Place-only state is
       listed in the commit body and removed.
  - Also from M6 (deferred, same reason): the `addBody` and `scene.add` adds and `onFrame` hooks in `car.ts`, `track-machine.ts`
    (order 7: keep it through the owner's `animate`), `seat.ts` and `stations.ts`, and `machine-model.ts`'s key read; then those
    files leave the `ENTITY_SERVICES` and `INPUT_ALLOW` lists in `dev/lint/policy.ts`.
  - Also from M5 (deferred, same reason): `land.ts` `addStatic` takes the owner, and its `scene.add`/`addBody`, `pieces.ts`,
    `look-kit.ts`, `look.ts` and `folk.ts` adds and hooks go to an owner (`look-kit`'s `boilerShown` is done, in M6's second
    commit); then `src/place/**` leaves the three `dev/lint/policy.ts` exemptions.
  - Also from M4 (deferred; a move step changes no behaviour): give `render/boxes.ts` (`makeSet`), `render/crates.ts` (the
    `ground` heap mesh, `hopTo`) and `render/wagon-look.ts` (`animate`) a required owner, remove their `scene.add` and
    `else onFrame` fallbacks and the three `use-an-entity` directives, and give the `?proto=net`, `wagon`, `crossing`
    callers an owner. The `no-restricted-imports` directives on `boxes`, `carry-models` and `wagon-look` go when M5 and
    M6 have moved `layout`, `era/blocks` types and `wagon/cars`.
  - **Done:** `src/proto/place/` does not exist; `rg "proto/place" src dev test server protos` is empty.

## 4. What waits on what

**Decided by the owner, 10 November:** "Resume at the gates: rules work after M3, view work after M6 and M8". The
held builds do not wait for the whole migration.

| Held build-out | Its rules may resume after | Its views may resume after | Why |
| --- | --- | --- | --- |
| Ring Island v27 ([plan](ring-island-build1.md), amended on `plan/ring-island-buffers`) | **M3** (M8 preferred, below) | **M6 and M8** | R3 adds `Aperture`, four op systems and wagon logic to the files M2 and M3 split. Rebasing new rules over a file split is the expensive direction; the split itself rebases over nothing. R4's views edit `train-view`, `halts-view`, `crossing-view` and `view`, all of which M6's script rewrites |
| Yards at halts ([brief](../brainstorms/station-deposit.md), build 1) | **M3** (and the owner's five answers) | **M6 and M8** | A `HaltYard` component, put and take ops and a change to `rail.supply`: same files as above |
| Train upgrade screen, install build 1 ([brief](../brainstorms/engine-garage.md)) | no rules | **M6** (M8 preferred) | No op, wire or save. New files plus `roundhouse-view.ts`, `engine-kit.ts` and `cars.ts`, which M6 moves |

- **Is any cheaper to build first? No, with one near-exception.** The garage screen touches no sim file and could
  start today; going first would cost one rebase over M6's generated import lines and one more file in M10. It is
  waiting on its install-moment spec anyway, so the recommendation is to start it when that spec lands, whichever side
  of M6 that falls.
- **Do the gates still hold with the read model deleted? Yes: neither gate moves.** Checked against each change:
  - _The rules gate stays at M3._ A rule written after M3 needs nothing from the model: its component is appended to
    `RAIL_COMPONENTS`, its check is its own function on the world called from `railwayCheck` (which takes a world
    today), and its tests call the systems on a world and read rows with `w.get`. It must not add a field to
    `railwayView`, `refreshRailway` or `copyRailway`, a `Railway`-shaped helper, or a test on the live proxy: each
    would be new work for T1 to T7 and M12b. M3b's lint rule 5 refuses the import.
  - _M3b and M3c follow M3 by a session each and do not hold it._ A build-out that starts between M3 and M3b reruns
    `dev/migrate/railway-imports.ts` after its rebase (generated lines only). One that starts before M3c writes its
    tests with `railApply` and `w.get` directly; the driver and the row readers are conveniences, and its tests are
    then already in the converted form.
  - _The views gate stays at M6 and M8._ M8 still waits only on M1 and M3 (and M3b's import lines); the new M3c runs
    beside it, not before it. M8 is larger than it was (all 33 facts, not about a dozen), so the gate arrives later
    in hours, not in steps. If that matters on the day, M8 ships as the facade first: `read.world()`
    and the timed queries are all a new view needs, and the gate is that first commit.
  - _A new view is born on `read` and queries_, as before, so it adds nothing to `buildState`.
- **Ring Island is cheaper after M8, not only after M3,** for its views alone now: written after M8 they read rows,
  so nothing is added to `buildState`, which M12 deletes. Its rules no longer gain from waiting.
- **What the amended Ring Island plan should change:** `railway-ring.ts` exports its component and systems; `OPS` and
  `RAIL_COMPONENTS` gain one line each in the index files; its tick work is its own system with the next free tick
  order, not edits inside `trainIO`, where that can be done without changing the wagon's rules.
- **The tail does not hold build-outs.** M8b, M10, T1 to T7 and M11 to M13 run beside them. A build-out's new view is
  born on `read` and queries; a build-out that edits an old view does not convert it; a build-out that edits an
  unconverted test file tells that file's batch, and the batch rebases over it.
- **What the tail waits on, in order:** M3 → M3b → (M3c and M8 at once) → (M8b, M10 a to f, T1 to T7 at once) → M11 (after T5 to
  T7) → M12 (after M10 and M11) → M12b (after M8b, every T batch and M12). M9 and M13 hang off lane B alone.
- Lane A is five steps and lane B four, each one agent session of mechanical work with a review, and M8 is one more,
  so both gates can be reached while the v27 plan's amendment and re-review are still in progress.

## 5. After the railway: the rest of `src/proto`

After M7, `src/proto` holds about 86 files and 20,100 lines, of which the live game reaches 15 files (3,362 lines).

**Place's old game (42 files, 11,887 lines, plus `rail.ts`'s 230).** M13. It is the largest single cut and removes
`?proto=place`, the second railway and the tab-authority protocol in `coop.ts` (1,277 lines). Its cost is in tools,
not in the game.

**Greybox (11 files, 2,698 lines; 7 live, 1,867).** `build.ts` (1,020) and `ring.ts` (690) are the world blockout and
Ring Island's greybox, loaded by `src/entities/ring-island`, `ring-greybox` and `world-blockout`. `ring.ts` graduates
into `src/entities/ring-island/` with Ring Island's R2 and R4; the blockout stays a tool behind its flag and moves to
`src/debug/` when nothing in the game loads it.

**Playdata (2 files, 643 lines, live).** `record.ts` is the playtest recorder, a service and not a prototype: it moves
to `src/features/playdata/` with `mark.ts`, keeping the card id `place`.

**Terrain pass (3 files, 728 lines, live, off by default).** It waits on the owner's verdict on terrain round two:
adopted, it folds into `src/place/land.ts`; rejected, it is archived.

**Net, wagon, crossing, minis, era, trace (29 files, 4,812 lines today; 22 files and 3,723 lines once M4 and M6 have
moved the live ones).** What is left are answered prototypes. Each gets the prototype-lifecycle treatment: tag `archive/<name>`, remove, set `archived` on
its card.

**The doors (`flags.ts`, `mark.ts`, `card.ts`, `count.ts`, `session.ts`, 208 lines with `flat.ts`).** Last:
`productionRailway` becomes the only game, so `flags.ts` shrinks to the prototype switch, and the lint exception for
static imports from `src/proto` goes.

**Then the ECS order outside `src/proto`,** as ecs-e section 6 set it: the nine lockstep domains (`piles`, `sources`,
`stacks`, `gifts`, `sites`, `bank`, `opening`, `roster`, `tune`; 949 lines of rules and about 900 of sim) move to
Server kind and onto E one per slice, each with a `WORLD_NS` bump, as replication R3; then Owner domains as components
with `replicate: false`. Each follows the railway's pattern: a components file, a systems file, queries, a golden.

**World streaming, the call's second priority, continues after M9:** the Place ground is one 242,000-triangle mesh
with `frustumCulled = false` (`land.ts`; performance G2), and `terrainCollisionTiles()` already cuts its colliders
into tiles, so render tiles follow the same grid once the terrain pass settles; then distance sleep for place-bound
views (performance rec 4) and place residency ([places-as-modules](../research/places-as-modules.md)).

## 6. Per-system divergence diagnosis

**Landed for lockstep states, not for the railway.**

- Lockstep: `w:hash` carries `hs = { stateKey: hash }`; `checkHash` in `src/world/sync.ts` compares per state, sets
  `subsystems`, logs `[world] desync at tick N in: <keys>` and calls the `desyncFns` with `{ tick, keys }` before the
  resync replaces the evidence. That is rec 1 of
  [deterministic-sim-at-scale](../research/deterministic-sim-at-scale.md) at the grain of a state key.
  `test/world-replay.test.ts` covers part of rec 2.
- The railway is Server kind and is not in those hashes (`if (!s.server)`). Its mirror compares one hash over every
  component (`hashComponents` in `src/world/replicate-client.ts`) and reports `onDiverged('refused' | 'hash')` with no
  component named, then refills. A prediction that disagrees with the server reports the action and a reason
  (`onCorrected`), not the system or the rows. `world.hash()` in E is one number.

**Plan only, sized against this plan's 22 components and 50 systems (plus the build-outs').** Three pieces, each
additive and each after M3:

1. **Per-component digests on the wire.** A whole-state packet gains an optional `hk: { [kind]: uint32 }` beside `h`,
   computed per replicated kind from the same rows. On a mismatch the mirror logs
   `[rail] diverged at step N in: train, line`, counts it per kind in its stats (shown under `?netdebug=1`), and in dev
   keeps both sides' differing rows before the refill (rec 4). 16 kinds, 4 bytes each, on whole-state packets only.
   Additive: an old client ignores `hk`. No `WORLD_NS`. Computed outside E from the mirror's rows and the server's
   projection, so E's 708-line core does not grow.
2. **Corrections name their system.** When a predicted action settles differently, attribute it through
   `OPS[e.op]` to the system that answered, and list which of that system's declared `writes` differ between the
   predicted and the confirmed world. `stats.corrections` becomes a table keyed by system name. This is where the
   declared access pays for itself: the candidate components are known without a diff of everything.
3. **A sync test that names the system (rec 2).** `test/railway-synctest.test.ts`: run a seeded stream; every k ticks
   `snapshot()`, `load()` into a fresh world, and continue both; hashes must agree. On a mismatch, rerun that tick one
   system at a time (the schedule from M3 makes the list data) and compare per-component digests after each: the
   failure reads `rail.trainTick wrote train differently after a load`. It catches state left out of the schema and
   order-dependent loads, which a refill hides in production.

Size: one agent session each. The reviewer for 1 attacks malformed `hk` (not an object, a huge key count, a
non-integer), since it is wire input.

## 7. Calls

**Decided** (binding, with source):

1. Migrate out of `src/proto` and onto the ECS, railway first, before more build-outs. Chunk, cull and stream second.
   Owner, 10 November 2026.
2. No engine switch. Kaigen is under consideration only. The replication component schema is the portable layer.
   Owner, 10 November; decision log 2026-11-06 "entity model: build E" and 2026-11-07 ("migration remains evaluation").
3. E is the store, behind `src/ecs/index.ts`, with its closed feature list and 708-line core; a library only on a
   measured trigger. [ecs-e](ecs-e.md), accepted 7 November.
4. Views and three.js objects stay `GameEntity` kinds over E's data. ecs-e section 5; lint `ecsDeclare`.
5. The railway is Server kind; no lockstep op on it. [sync](../agents/sync.md).
6. No compatibility code; a shape break bumps `WORLD_NS`, never mid-session; nothing waits on a bump or a playtest.
   Owner calls, 5, 9 and 10 November.
7. `src/proto/place` is deleted, with the homes for moved modules. Owner, 9 November ("Then delete proto place");
   [place-retirement](place-retirement.md).
8. Focused tests per change; the long run on command only. Owner, 10 November.
9. The Boogler's copy and the town's lines are never edited. AGENTS.md.

**Decided by the owner on this plan's questions, 10 November 2026**
([decision](../decisions-process.md#d-2026-11-10-ecs-migration-answers); the numbers are the calls below that each
answer rules on):

- **15, overruled.** Keep the old railway "read model" for tests and tools only?: "Delete it entirely and rewrite the
  tests against components". Section 2, "The read model goes entirely".
- **16, decided as recommended.** Do the held builds resume part-way through the migration, or only when it is all
  done?: "Resume at the gates: rules work after M3, view work after M6 and M8".
- **17, decided as recommended.** Should the code that draws things become ECS systems too?: "Views stay objects that
  read components through queries". His note: "why should it not become a system?" The orchestrator is answering
  him; the answer stands unless he changes it.
- **21, decided as recommended.** Make train seats server-owned now?: "Not in this migration; do it with the
  passenger and train work".
- **23, decided as recommended.** The temporary re-export files: remove them early or at the end?: "Remove them right
  after M3, with a lint rule". Step M3b.
- **24, decided as recommended.** What happens to the tools that only drive the old Place game?: "Delete the ones
  with a live-game twin, retarget the level check, and tag an archive of Place first". Step M13.
- On the same page, for the express and not this plan: the bought passenger train at Home, does it stand in the
  Roundhouse?: "No: the Roundhouse stays the upgrade screen only; find it a bay elsewhere"
  ([Rail](../decisions-rail.md#d-2026-11-10-the-passenger-set-does-not-stand)). Changed from the recommendation.
- Binding from the same day ([owner calls](../agents/owner-calls.md)): "Don't priotiize save guards. we can do a full
  wipe at any time in development" and "Nothing should wait on a world bump".

**Default** (existing practice applied here):

10. Sim files stay flat with the `railway-` prefix. Source: the sim lint pattern in `dev/lint/policy.ts`.
11. Seat presence and host keys keep their `place…` names when `seat.ts` moves. Source:
    [sync](../agents/sync.md), "existing short keys stay as they are".
12. The playdata card id stays `place`. Source: place-retirement D1a.
13. Imports that are `import()` today stay `import()` through the moves. Source:
    [perf baseline](perf-baseline-2026-11-02.md), the entry chunk.

**New** (this plan's; wording for agent-calls rows is in the report):

14. The moves (place-retirement R1 to R3) run before D1, railway first; Place keeps running on a small owner shim
    until M13. Why: the live code leaves `src/proto` now without waiting for 148 tool files to be retargeted.
15. ~~The `Railway` read model survives for the load check, seed builders and tests only.~~ **Overruled by the
    owner, 10 November** ("Delete it entirely and rewrite the tests against components"). The model, its helpers,
    its validators and the live proxy are deleted; 10,513 lines of tests are rewritten on rows and queries.
16. Build-outs resume at two gates (rules after M3, views after M6 and M8), and a new component's invariants are
    written on the world. **Decided by the owner, 10 November.**
17. "defineSystem coverage" is counted on shared-state writes. Derived logic moves to queries; views are not systems.
    **Decided by the owner, 10 November**, with his question recorded above.
18. The tick order becomes a `createSchedule`; `rail.worksTick` and `rail.jobClock` are re-declared 4 and 5 to match
    the order that runs today.
19. A committed schema golden, and a test that fails a schema change without a `WORLD_NS` change.
20. `rail.ts` splits into four files in `src/entities/railway/`; Place's own train stays behind until M13.
21. Seats stay Host kind through this plan. **Decided by the owner, 10 November.**
22. Per-component digests are computed outside E, so the core does not grow.
23. The re-export files go right after M3, by a committed script, with lint rules (M3b). **Decided by the owner, 10
    November.**
24. Place's tools: delete those with a live-game twin, retarget the level check, tag `archive/place` first (M13).
    **Decided by the owner, 10 November.**

**New with the amendment** (the planner's, logged in [agent-calls](../agent-calls.md) under Architecture):

25. Tests are rewritten in seven batches by file, each proved by a census and a kill table from committed scripts.
    Why: a conversion that drops or weakens an assertion is otherwise invisible in a green run.
26. The world driver and the seeds move first (M3c), before any query work, so a build-out's tests are born in the
    converted form.
27. The load check moves to the world with one bad world per `throw` site, checked against the old validators while
    both exist (M8b).
28. A test whose subject is deleted (the frozen read's identity, `buildState`'s shape) is deleted and listed by
    name; a test of behaviour is always converted.
29. Row-shaped types (`RailTrain`, `RailAccount` and the like) stay: the owner's answer is read as deleting the
    derived model, not the rows' types.
30. The answered spikes under `dev/spikes/ecs` that compare against the model are deleted in M12b.

## Level findings

The plan places nothing in the world, moves nothing and gates nothing, so there is nothing to rule on. `npm run
level-check` was not run for new positions. It matters as a regression check: M5, M6 and M9 must leave its reports
(track continuity, grounding, machine clearance) identical to base, and M6 changes how five of its tools read the
track's source.

The amendment places nothing either. The passenger set's bay at Home (open question 1) is the express's to place:
the level check runs on the designer's proposed bays before the owner picks, not here. M13 rewrites the level
check's Place progression onto railway seeds; its reports on the live world must not change.

## 8. Risks

**P1**

1. **A rule changes silently in M2 or M3.** A moved block edited by accident, a narrowed `reads`, or the schedule
   running in a different order than `railTick` did. Server and predicting clients would still agree with each other,
   so nothing would flag it in play. Guards: the M0 goldens, the loop run compared byte for byte, the server tests with
   audit on, an independent review with a fresh `review-stamp`.
2. **A saved room stops loading.** Any change to a component's kind, field order, key or spawn order makes
   `world.load` refuse production saves; the room then reports `storage` and players lose the world without a
   `WORLD_NS` bump having been chosen. Guards: the schema golden and the v26 snapshot fixture in M0; M2 keeps the
   lists byte for byte. Never ship M2 or M3 while the owner is mid-session (`npm run heartbeat`).
   **Owner, 10 November: "Don't priotiize save guards. we can do a full wipe at any time in development."** So this
   is P3, not P1: where a step is simpler with a changed shape, bump `WORLD_NS` and wipe; the v26 snapshot fixture is
   deleted at the next bump, not re-recorded; the schema golden stays, since a schema change with no bump is a
   mixed-build bug.
3. **Prediction or consistency regresses in M12.** A threshold shown early, an effect played twice, corrections
   rising when the predictor's state changes type, or a view reading a world mid-fill: today the read model is also
   the consistency boundary (it is relinked only to a whole world), and M12 has to rebuild that rule on worlds. This is the owner's acceptance test for netcode ("Input gets instant feedback").
   Guards: M8's differential test lands the queries while the old path still exists; `npm run load` with corrections
   and press-to-effect against base in the same session; two-page looks of a contested take. With the read model
   deleted there is no old path to fall back to after M12b: M12 ships and is watched for a day of `npm run load`
   rows before M12b deletes the files.
4. **The test rewrite weakens the suite without anyone seeing it** (new with the owner's answer). 10,513 lines are
    converted by agents; a dropped assertion, a comparison of a row with itself, or a `deepEqual` narrowed to two
    fields still passes. These tests are the only thing that says the rules are right, and the M0 goldens only say
    they did not change. Guards: the census and the kill table per batch, before and after, in the commit body;
    audit mode on in every converted test; batches by file, so one review reads one domain; the differential test
    and the old validators kept until M12b.
5. **The load check on the world accepts a save the old one refused** (new). A restated condition that reads
    nothing passes. A refused save is cheap now (wipe); a wrongly accepted one can put a room into a state no rule
    expects. Guards: one bad world per `throw` site, refused with the same message by both checks while both exist;
    the `throw` count old against new.

**P2**

6. **Lane B collides with work in flight.** M5 moves `land.ts` while the terrain pass and the Ring Island landform edit
   it; M6 rewrites the imports of every railway view, `train-view.ts` and `roundhouse-view.ts` included, while fixes to
   them may be open. Run `npm run inflight` before each move and land it the day it is rebased.
7. **The level tools read `rail.ts` as text.** A split that moves a marker breaks `npm run level-check`, which is in
   `npm run check`, so it is caught; the risk is a tool that keeps passing while reading the wrong fragment. M6's
   reviewer compares the reports with base.
8. **`boogle/use-an-entity` on moved files.** About 40 `scene.add`, `onFrame` and `addBody` fallbacks must become
   owner calls with the same frame order. `lint-suppressions.json` may not grow and no `APPROVED_DEBT` entry may be
   added.
9. **Chunked batches cost draw calls.** With the whole line in view there are more batches than today. M9 reports the
   count at `far` and tunes the chunk length; the grain seed must not change with the instance index.
10. **The entry chunk grows.** Turning `import()` into static imports in the moved files would pull the track and
    the machine into the bundle before "Jump in". Call 13 keeps them dynamic.
11. **Parallel batches collide** (new). Thirteen pieces of work can be open at once after M8 (six view groups, seven
    test batches) beside the build-outs. They share no file by construction; the collisions left are a build-out
    editing an unconverted test, and a batch needing a query that M8 did not add. The first rebases; the second
    stops and asks, and never adds to `src/sim` from a test batch.
12. **M3b's script misses a string path.** Look evals and level tools name sim files in strings. `--check` and the
    `rg` in M3b's review cover it; `npm run check` runs the level check.
13. **M13 deletes a tool that had no twin.** The groups above come from file names and the retirement plan's list,
    not from reading each eval. The M13 brief names the twin per deleted file; `archive/place` keeps every one
    restorable.
14. **Room-safety "Don't"s that apply:** effects stay in the adapter's accepted path, never in a system or a query
   (M10, M12); a moved presence getter still returns `null` when off (M6); no wall clock or `Math.random` in the new
   sim files (lint); new shared files only under the three directories the server image copies whole.

**P3**

15. **The read model lives on through the tail** (was: it stays for tests). From M3c to M12b two ways to read a
    world exist in tests, and a build-out could add to the old one. M3b's closed importer list and the gate rule in
    section 4 refuse it; M12b's lint rule keeps it from growing back.
16. **Two re-export files exist for a day** (`railway-world.ts`, and the re-exports M3 leaves in
    `railway-systems.ts`). M3b removes both; `railway-systems.ts` stays as the index of what it defines.
17. **E's per-call cost** (2 to 3 times a plain object, single microseconds) now also falls on view reads. The M1 and
    M10 perf rows will show whether it matters; ecs-e's absolute triggers (0.05 ms of E work in a frame) still decide.
18. **Docs go stale:** `docs/game-design/place.md` file pointers, `ecs-e.md` section 4, `sync.md`'s Server entry
    (which names `src/adapters/railway.ts`) and the atlas stories are updated in the step that moves what they name.

## Open questions

No designer fit check has run for this plan, and its steps need none: nothing is ported from Place into the design.
Code the live game already runs moves folders, and code it does not run is deleted. If any of the 41 unreached Place
modules should come back, that is a port and gets the check first.

The five questions this plan asked were answered by the owner on 10 November (section 7). What the answers leave
open:

1. **Where does the passenger set stand at Home?** Owner: "the Roundhouse stays the upgrade screen only; find it a
   bay elsewhere". Not this plan's to place: it is a design item for the express's shape B
   ([express-train](../brainstorms/express-train.md), section 7), which comes with the first interchange.
   Recommended: the designer draws two or three measured bays on layout B as a 2D page (a bay road beside line 2's
   buffers on the 40 m bay road the junction plans already keep clear, the goods side by the forge, a stub off the
   engine spur short of the table), and he picks; nothing is built until then.
2. **Does "the Roundhouse stays the upgrade screen only" also move what already stands there?** The yard shunter and
   its footing wagon come out of the Roundhouse (8 November), and upgrade steel waits "as a visible stack in the
   Roundhouse bay" (10 November). Recommended reading: no. He was asked about the passenger set, and both of those
   serve the upgrade screen or the Works; the earlier entries stand.
3. **His question on views, "why should it not become a system?", is being answered by the orchestrator.** If he
   changes the answer, M10 is re-planned: each view becomes a `present`-phase system with declared `reads`, E gains a
   client-only phase and the lint rule that keeps three.js out of headless code needs an exception per view file.
   Recommended: keep the answer; revisit only if the divergence work in section 6 shows views reading state they do
   not declare.
4. **Should the kill table become a standing check after the migration?** `rail-mutants` is built for the test
   rewrite and costs minutes per run. Recommended: keep the script, run it on command and in the weekly tidy pass,
   and keep it out of `npm run check` ("a lighter test load", 1 November).
