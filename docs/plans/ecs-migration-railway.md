> **Status: plan, 10 November 2026. Nothing built.** Owner's call the same day: "Sitting in proto is bad, we need to fix
> and migrate." "ECS migration needs to happen now before more build outs." Railway first; chunk, cull and stream the
> world second; per-system divergence diagnosis as a plan only. No engine switch is authorized: Kaigen is under
> consideration only, and the replication component schema stays the portable layer. Every number below was measured
> on `origin/main` at `bd34b181b` (world v26) with the commands named beside it. No designer review has run: the plan
> changes no gameplay.

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

### What `src/adapters/railway.ts` becomes, and when it goes

- M1 pins its per-tick cache and stops evaluating the cache key 130 times a frame.
- M8 adds `read: { world(), tick(), tickNow(), pid, status() }` beside `inspect()`.
- M10 moves view groups from `inspect()` to `read`.
- M12 deletes `readState`, `buildState`, `inspection` and `inspect`, and splits what is left into
  `src/adapters/railway-session.ts` (connection, clocks, predictor, settle and corrections; ≤ 450 lines),
  `railway-intents.ts` (the intent types, wire validation and the `act` methods; ≤ 300) and `railway-effects.ts` (the
  accepted and corrected event shapes; ≤ 150). `src/adapters/railway.ts` is deleted in that step.
  `railway-marks.ts` stays.

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
| The `Railway` read model | rebuilt or patched on every packet, prediction and tick | never in a frame: the load check, the seed builders and tests only |

"defineSystem coverage" is counted on what changes shared state, and it is already complete. Making views E systems
is not part of "done" (open question 2).

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
  `lint-suppressions.json` does not grow. After M12, `railway-read-model.ts` may be imported only by
  `railway-check.ts`, `railway-live.ts` and tests (a `no-restricted-imports` pattern).
- **Server image:** `src/sim`, `src/world` and `src/ecs` are copied whole (`server/Dockerfile`, `dev/server-build.ts`,
  `deploy-server.yml`), so new files there need no listing. Queries stay in `src/sim/` for that reason;
  `test/server-image.test.ts` guards it.
- **Risk tiers used below.** **High:** touches `src/sim`, `src/world` or `server/`; ships through
  `npm run ship-queue -- <worktree> --wait --reviewed "<npm run review-stamp> …"` after an independent review. **Medium:**
  changes what the client draws or reads. **Low:** tests, tools, or renames with no behaviour.
- **Every step:** branches from `origin/main`, ships alone, leaves `npm run check` green, needs no `WORLD_NS` bump and
  runs no long playthrough. A step that finds it does need a bump stops and reports instead.

## 3. Steps

Three lanes share no files, so they run at the same time: **A** (sim) M0, M2, M3; **B** (moves) M4, M5, M6, M7; **C**
(adapter) M1. M8 joins A and C. M9 follows M6. M10 follows M6 and M8. Within a lane the order is fixed.

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
      regenerated, at the next `WORLD_NS` bump. Not done: a scripted stream for ops no stage runs (reviewer attack 1
      is open); Node 24 not run.
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
- [ ] **M2. Split `railway-world.ts`.** _High (sim), mechanical._
  - Create `src/sim/railway-components.ts` (lines 1–275 with `createRailwayWorld`),
    `src/sim/railway-read-model.ts` (`railwayView`, `fillRailway`, `refreshRailway`, `copyRailway` and their helpers)
    and `src/sim/railway-check.ts` (`railwayCheck`, `validateRailway`, `railwayInvariant`, `ARCHETYPES`).
    `railway-world.ts` becomes re-exports only, so its 34 importers do not change; M12 removes it.
  - Keep the order of `RAIL_COMPONENTS` and of the spawns in `createRailwayWorld` byte for byte: fresh ids and the
    late-join order follow from them.
  - **WORLD_NS:** none; the three M0 goldens are the proof. **Mixed builds:** no wire or save change.
  - **Verify:** `npm run check`; `npm --prefix server test`; `npm run test:net`; `git diff --stat` shows moves only.
  - **Reviewer attacks:** diff each moved block against its source for edits hidden in a move; import cycles between
    the three files; a component left importing from the barrel.
- [ ] **M3. Split the systems; make the tick a schedule.** _High (sim; the order becomes data)._
  - Create the six `railway-sys-*.ts` files and `src/sim/railway-queries.ts` (the private helpers of
    `railway-systems.ts` 87–170 and the inline facts, exported: `activeStation`, `ready`, `held`, `boilerHeld`,
    `qActive`, `gateDown`, `depotNeed`, `cartWants`, `cartServing`, `pierOwed`, `kitOwed`, `wagonSlot`, the singleton id
    getters). `railway-systems.ts` keeps the `OPS` table, exports `RAIL_SYSTEMS`, and re-exports `railApply`,
    `railTick`, `railSettle`, `railOutcome`, `railResume`, `railSession`, `railSupplyPulse`, the beam, boiler and foot
    entry points and `railLine2Active`, so its 8 importers do not change.
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
- [ ] **M8. The read facade and the timed queries.** _High (`src/sim`, `src/world`). After M1 and M3._
  - `src/sim/railway-line-schedule.ts`: `layProgress(spec, schedule, elapsed)`; `layLine1` and `layLine2` call it.
    `src/sim/railway-queries.ts`: `jobProgress(w, c, id, tick)` on the same function.
  - Four new query files, one per domain, so M10's groups never share one: `railway-queries-trains.ts`,
    `railway-queries-line1.ts`, `railway-queries-line2.ts`, `railway-queries-works.ts`. Each starts with the world
    version of that domain's `Railway`-shaped helpers that have no world twin yet (`line2Served`, `line2CartStatus`,
    `line2Logs`, `line2Rails`, `worksStage`, `pierNeed`, `footingTotal`, `railPanelCount`, `railCounts`, `railPhase`,
    the train reads).
  - `src/world/railway-predict.ts`: export `worldOf(s: Railway): World | undefined` (today's private `worlds` map).
  - `src/adapters/railway.ts`: add `read = { world: () => worldOf(view())!, tick, tickNow, pid, status: () => status }`.
    `src/entities/railway/state.ts`: `railwayWorldRead()` beside `railwayRead()`. `read.world()` is always the world
    behind the read model the views see now, so it inherits today's consistency rule: a read model is linked to a
    world only once that world is whole, and a refill is built aside and swapped in at its last chunk.
  - `test/railway-queries.test.ts`: on seeded action streams with ticks, every query equals its `Railway` twin on
    `railwayView(w)`, and `jobProgress` equals `rail.at(tick)` for every job at every tick, on the confirmed mirror and
    on a predicted clone with a held-back threshold.
  - **WORLD_NS:** none. **Mixed builds:** no wire change.
  - **Verify:** the differential test; the M0 goldens unchanged; `npm run loop -- run` equal to base.
  - **Reviewer attacks:** `jobProgress` on a job funded in a prediction (the mirror's `ahead` and `end` against the
    clone's rows); a completed job whose `end` is still −1 in the clone; the view world changing identity between two
    reads in one frame; `read.world()` before the first whole state, after a `reset()` and during a refill (it must
    never return a half-filled world).

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
- [ ] **M6. The railway's own modules to `src/entities/railway/`; split `rail.ts`.** _Medium._
  - `rail.ts` as in section 2. Also `stations`, `seat`, `seat-claims`, `track-panels`, `machine-model`,
    `machine-panels`, `train-load`, `chop-motion`, `engine-kit`, `car-kit` from Place and `wagon/{engine,cars}.ts`.
  - Hooks and adds to convert: `rail.ts:845` (`addBody`), `:852`, `:1424`; `seat.ts:283` and `:289`;
    `stations.ts:179`, `:209`, `:225`, `:236`, `:247`, `:274`. `seat.ts` keeps `placeSeatRequest`, `placeSeatPose` and
    `placeSeatGrants` by name, and its getters still return `null` when off.
  - `dev/level/{replay,timber-track,grounding-track,grounding-props,machine-clearance}.ts` read `rail.ts` as source
    text by markers (`'const P:'`, the `// --- track:` rule line, `'  const u ='`, `'  const solids: Solid[]'`). Point
    them at `line-geometry.ts` (import it: it has no three.js) and at `track.ts`, keeping the markers `track.ts` needs.
  - After this step `rg "proto/" src/entities/railway` shows only `proto/flags.ts` and `proto/mark.ts`.
  - **Verify:** `npm run check`; `npm run level-check` output identical to base (track continuity, grounding, machine
    clearance); the bench census identical; `npm run scenario -- smoke`; looks at `--rail-seed trains-on` (a train with
    a seated rider) and mid-lay on line 2.
  - **Reviewer attacks:** two players claiming one seat (the Host grant still arbitrates); the machine's frame order
    (it was `onFrame` order 7; the owner's `animate` must keep it); a collider added twice or never for a car.
- [ ] **M7. The town's modules to `src/entities/town/`.** _Low to medium._
  - `rooms`, `house`, `shop`, `museum`, `residents`, `town-lines`, `workshop`; split `place.css` into
    `src/entities/railway/railway.css` and `src/entities/town/town.css` (place-retirement R3).
  - `town-lines.ts` moves verbatim: the diff must be a pure rename. List any line that looks wrong for the owner; edit
    none.
  - **Verify:** `npm run check`; the bench at `town`; a look inside the museum and the shop.
  - **Reviewer attacks:** `git diff -M --stat` shows 100% similarity for `town-lines.ts`; a CSS rule dropped in the
    split.
- [ ] **M9. Chunk and cull the committed track.** _Medium (render). After M6. `src/entities/railway/track.ts`,
      `src/place/look-kit.ts`, `src/place/pieces.ts`._
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

### The conversion tail (runs beside the build-outs)

- [ ] **M10. Views read rows and queries, one group at a time.** _Medium each (High with a new query). After M6 and
      M8. Groups share no file, so they run in parallel; each ships alone._
  - Per group: replace each `adapter.inspect()` field with a row read or a query; move any derived arithmetic found in
    the view into that group's own query file (a: `railway-queries-trains.ts`, b: `-line1.ts`, c: `-line2.ts`,
    d: `-works.ts`; e and f add none, and ask for one through the owning group) with a test. A group that adds a query
    edits `src/sim` and ships as High. Adapter fields nobody reads any more are deleted in M12, not here.
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
- [ ] **M11. The server reads the world.** _High (`src/world`, `server/`)._
  - `src/world/railway-server.ts`: `counts`, `phase`, the panel numbers and `railMaxDuration` come from queries; the
    lazy `railway` getter goes. `dev/loop/run.ts` and `dev/loop/host.ts` read through the same API.
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
    (section 2). `railway-read-model.ts` stays for `railway-check.ts`, `railway-live.ts` and tests, behind the lint
    pattern; the `Railway`-shaped helper names tests use become wrappers in `railway-live.ts` that call the query on
    the live view's world. `railway-world.ts` (the barrel) is deleted and its 34 importers rewritten by script.
  - **Verify:** `test/railway-replicate.test.ts` and `test/railway-adapter.test.ts` (rewritten onto worlds: predicted
    state equals the server's after the last ack for 2 to 6 simulated clients); `npm run test:net`; `npm run load`, all
    rows and `crowd`, with corrections and press-to-effect no worse than base on the same machine and session;
    looks of a deposit, a contested last log between two pages, and a reconnect mid-carry.
  - **Reviewer attacks:** thresholds shown early (a bill that reads complete before the server says so); effects
    played twice (once predicted, once confirmed); a correction with no recipient; a late joiner mid-chunk, a refill
    and a `reset()` each reading a half-filled or empty world; memory held by retained clones.
- [ ] **M13. Delete Place.** _Medium to high (tools). After M7; independent of M8–M12._
  - [place-retirement](place-retirement.md) job D1 as written (D1a flags, D1b pause, D1c the Dev menu, D1e tools),
    plus the 230-line remainder of `rail.ts` and `place-owner.ts`. Tag the parent `archive/place` first. It needs the
    D1 brief on what still drives Place (orchestrator-state, Leftovers): 148 files name the entry, 53 of them look
    evals and 9 beats.
  - Also from M5 (deferred, same reason): `land.ts` `addStatic` takes the owner, and its `scene.add`/`addBody`, `pieces.ts`,
    `look-kit.ts`, `look.ts` and `folk.ts` adds and hooks go to an owner; `look-kit` takes `boilerShown: () => boolean` from its
    caller; then `src/place/**` leaves the three `dev/lint/policy.ts` exemptions.
  - Also from M4 (deferred; a move step changes no behaviour): give `render/boxes.ts` (`makeSet`), `render/crates.ts` (the
    `ground` heap mesh, `hopTo`) and `render/wagon-look.ts` (`animate`) a required owner, remove their `scene.add` and
    `else onFrame` fallbacks and the three `use-an-entity` directives, and give the `?proto=net`, `wagon`, `crossing`
    callers an owner. The `no-restricted-imports` directives on `boxes`, `carry-models` and `wagon-look` go when M5 and
    M6 have moved `layout`, `era/blocks` types and `wagon/cars`.
  - **Done:** `src/proto/place/` does not exist; `rg "proto/place" src dev test server protos` is empty.

## 4. What waits on what

| Held build-out | Its rules may resume after | Its views may resume after | Why |
| --- | --- | --- | --- |
| Ring Island v27 ([plan](ring-island-build1.md), amended on `plan/ring-island-buffers`) | **M3** (M8 preferred, below) | **M6 and M8** | R3 adds `Aperture`, four op systems and wagon logic to the files M2 and M3 split. Rebasing new rules over a file split is the expensive direction; the split itself rebases over nothing. R4's views edit `train-view`, `halts-view`, `crossing-view` and `view`, all of which M6's script rewrites |
| Yards at halts ([brief](../brainstorms/station-deposit.md), build 1) | **M3** (and the owner's five answers) | **M6 and M8** | A `HaltYard` component, put and take ops and a change to `rail.supply`: same files as above |
| Train upgrade screen, install build 1 ([brief](../brainstorms/engine-garage.md)) | no rules | **M6** (M8 preferred) | No op, wire or save. New files plus `roundhouse-view.ts`, `engine-kit.ts` and `cars.ts`, which M6 moves |

- **Is any cheaper to build first? No, with one near-exception.** The garage screen touches no sim file and could
  start today; going first would cost one rebase over M6's generated import lines and one more file in M10. It is
  waiting on its install-moment spec anyway, so the recommendation is to start it when that spec lands, whichever side
  of M6 that falls.
- **Ring Island is cheaper after M8, not only after M3.** Written after M8, `Aperture`'s invariants go on the world
  (`validateRailRing(w)`, called from `railwayCheck`) and its views read rows, so it adds nothing to `railwayView`,
  `refreshRailway`, `copyRailway` or `buildState`, all of which M12 deletes. Written before, it adds a field to each.
- **What the amended Ring Island plan should change:** `railway-ring.ts` exports its component and systems; `OPS` and
  `RAIL_COMPONENTS` gain one line each in the index files; its tick work is its own system with the next free tick
  order, not edits inside `trainIO`, where that can be done without changing the wagon's rules.
- **The tail does not hold build-outs.** M10 to M13 run beside them with one agent. A build-out's new view is born on
  `read` and queries; a build-out that edits an old view does not convert it.
- Lane A is three steps and lane B four, each one agent session of mechanical work with a review, and M8 is one more,
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
15. The `Railway` read model survives for the load check, seed builders and tests only. Why: about 11,000 lines of
    railway tests read it; rewriting them buys nothing a player or a port would notice.
16. Build-outs resume at two gates (rules after M3, views after M6 and M8), and a new component's invariants are
    written on the world.
17. "defineSystem coverage" is counted on shared-state writes. Derived logic moves to queries; views are not systems.
18. The tick order becomes a `createSchedule`; `rail.worksTick` and `rail.jobClock` are re-declared 4 and 5 to match
    the order that runs today.
19. A committed schema golden, and a test that fails a schema change without a `WORLD_NS` change.
20. `rail.ts` splits into four files in `src/entities/railway/`; Place's own train stays behind until M13.
21. Seats stay Host kind through this plan.
22. Per-component digests are computed outside E, so the core does not grow.

## Level findings

The plan places nothing in the world, moves nothing and gates nothing, so there is nothing to rule on. `npm run
level-check` was not run for new positions. It matters as a regression check: M5, M6 and M9 must leave its reports
(track continuity, grounding, machine clearance) identical to base, and M6 changes how five of its tools read the
track's source.

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
   and press-to-effect against base in the same session; two-page looks of a contested take.

**P2**

4. **Lane B collides with work in flight.** M5 moves `land.ts` while the terrain pass and the Ring Island landform edit
   it; M6 rewrites the imports of every railway view, `train-view.ts` and `roundhouse-view.ts` included, while fixes to
   them may be open. Run `npm run inflight` before each move and land it the day it is rebased.
5. **The level tools read `rail.ts` as text.** A split that moves a marker breaks `npm run level-check`, which is in
   `npm run check`, so it is caught; the risk is a tool that keeps passing while reading the wrong fragment. M6's
   reviewer compares the reports with base.
6. **`boogle/use-an-entity` on moved files.** About 40 `scene.add`, `onFrame` and `addBody` fallbacks must become
   owner calls with the same frame order. `lint-suppressions.json` may not grow and no `APPROVED_DEBT` entry may be
   added.
7. **Chunked batches cost draw calls.** With the whole line in view there are more batches than today. M9 reports the
   count at `far` and tunes the chunk length; the grain seed must not change with the instance index.
8. **The entry chunk grows.** Turning `import()` into static imports in the moved files would pull the track and the
   machine into the bundle before "Jump in". Call 13 keeps them dynamic.
9. **Room-safety "Don't"s that apply:** effects stay in the adapter's accepted path, never in a system or a query
   (M10, M12); a moved presence getter still returns `null` when off (M6); no wall clock or `Math.random` in the new
   sim files (lint); new shared files only under the three directories the server image copies whole.

**P3**

10. **The read model stays as a second shape for tests.** A field added to a component and forgotten in
    `railwayView` shows only in tests and the load check after M12, which is where it should fail.
11. **Two re-export files exist for a while** (`railway-world.ts`, `railway-systems.ts`). The first goes in M12; the
    second is the index by design.
12. **E's per-call cost** (2 to 3 times a plain object, single microseconds) now also falls on view reads. The M1 and
    M10 perf rows will show whether it matters; ecs-e's absolute triggers (0.05 ms of E work in a frame) still decide.
13. **Docs go stale:** `docs/game-design/place.md` file pointers, `ecs-e.md` section 4, `sync.md`'s Server entry
    (which names `src/adapters/railway.ts`) and the atlas stories are updated in the step that moves what they name.

## Open questions

No designer fit check has run for this plan, and its steps need none: nothing is ported from Place into the design.
Code the live game already runs moves folders, and code it does not run is deleted. If any of the 41 unreached Place
modules should come back, that is a port and gets the check first.

1. **Do the build-outs resume at the two gates, or only when the whole migration is done?** Recommended: at the gates
   (rules after M3, views after M6 and M8), with the conversion tail running beside them. Holding everything to M12
   would stall Ring Island behind 26 view rewrites that do not touch it.
2. **Should views become E systems too, or stay the object layer that queries E?** Recommended: stay the object layer.
   It is what Unity, Unreal and Bevy do with presentation, and it keeps three.js out of E. View systems would mean
   lifting the headless-only lint rule and growing E past its closed list, which by ecs-e's own rule is the moment to
   ask "adopt a library?" instead.
3. **Keep the `Railway` read model for the load check, seeds and tests?** Recommended: yes. Revisit when a port is
   real; the schema golden and the queries are what a port needs.
4. **M13: delete the tools that only drive `?proto=place`, or retarget each?** Recommended: delete those with a
   production twin (most of the 53 evals and 9 beats), retarget only `level-check`'s place progression onto railway
   seeds, and tag `archive/place` first.
5. **Seats as a Server component (`rail.sit`, `rail.stand`, one `WORLD_NS` bump)?** Recommended: not in this plan. Do
   it with the passenger and train work, where who sits where starts to matter to rules; until then the Host field
   moves with `seat.ts` unchanged.
