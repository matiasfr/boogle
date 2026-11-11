> **Status: plan, 11 November 2026. Nothing built.** The end of [the railway's ECS migration](ecs-migration-railway.md):
> what replaces `inspect()`, then the rest of M12, M12b and M13 as steps that each ship alone. Measured on
> `origin/main` at `907e35355` (world v27) with `grep -rE` and the script patterns named beside each number; field
> attribution is a regex estimate, file and call counts are exact. No designer review has run: nothing a player sees
> changes. **Which file an agent reads:** this one for every step below; the parent plan only for the sections a step
> names (M12's and M12b's entries, M13's tool lists).

# ECS migration, the tail: no `inspect()`, no read model, no Place

**Goal.** Finish the migration with nothing standing between a component row and its reader: the adapter's
`inspect()` and the `Railway` read model are deleted without a successor shape, `src/adapters/railway.ts` becomes
session, intents and effects, and `src/proto/place` is deleted. Serves DESIGN.md's **The scene graph is a view**,
**Clear authority** and **Small and readable**. It bends none.

**Research:** none new. It applies [ecs-evaluation](../research/ecs-evaluation.md) (E as adopted) and
[engine-architecture](../research/engine-architecture.md) (twin implementations drift: the reason a snapshot is
refused below), as the parent plan cites them.

## 1. Census: who still reads `inspect()` and the read model

**The chain.** `adapter.inspect()` (`src/adapters/railway.ts:1088`) builds `buildState(tick, railwayAt(world, tick))`,
the read model's last client-side use (`src/world/railway-replicate.ts:37`). It has two doors:
`railwayRead()` (the adapter's object) and `inspectRailway()` (`src/entities/railway/view.ts:616` spreads the
adapter's object under the view's own scene walk), both in `src/entities/railway/state.ts`.

**`src/` (outside the adapter and the railway entity): 6 files, 7 calls.** The orchestrator's note "the last
production readers are off `inspect()`" is true of the railway's views, not of these:

| File | Door | Reads | Kind |
| --- | --- | --- | --- |
| `src/entities/lookout/view.ts:204` | `railwayRead()` | `ring.head`, `ring.joined` (the buoys lifted at the railhead) | **live game, state** (v27's "`ring` still comes from the old read model") |
| `src/features/playtest-flag.ts:18` | `railwayRead()` | `carry`, `railsCarry`, `stoneCarry`, `foot` | **live game, state** |
| `src/proto/playdata/record.ts:388` | `inspectRailway()` | `ready`, `line2.trains`, `line2.stations[5].completion`, `line2.completed` | **live game, state** |
| `src/entities/town/view.ts:123,180` | `inspectRailway()` | `trees`, `machine`, `line2View.trains`, `reward` | live game, the view's own walk only |
| `src/debug/dev/inspect.ts:31`, `room.ts:25` | `inspectRailway()` | the whole object, dumped as JSON in the Dev menu | debug |

**`dev/`: 58 files, 181 calls** (`inspectRailway()`; `adapter.inspect()` in `ws-page.ts`; `T.railAdapter().state`
in `ws-railway.ts`). Files that read each group (a file counts once per group), then field reads:

| Area | Files | Calls | session (`ready`, `pid`, `pending`, `step`, `hash`…) | the view's own (`trees`, `reward`, `hookShot`, `line2View`…) | account | line 1 | line 2 | trains | works |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dev/look/bots/` | 7 | 58 | 5 files, 44 reads | 5, 120 | 2, 65 | 3, 60 | 4, 20 | 2, 8 | 2, 3 |
| `dev/look/evals/` | 46 | 111 | 32, 52 | 32, 96 | 5, 17 | 8, 17 | 14, 40 | 5, 13 | 3, 12 |
| `dev/look/lib.ts`, `dev/peer-test/ws-{page,railway}.ts`, `dev/scenarios/{hud-glance,world-inputs}.ts` | 5 | 12 | 4, 11 | 1, 2 | 2, 4 | 1, 1 | 0 | 0 | 0 |

- **28 of the 58 read only session and view fields** (every hook, seat, forge-walk, photo and ring-walk eval, `lib.ts`,
  the two peer-test files): they need no state read at all.
- **30 read state fields, about 260 reads**, of which `dev/look/bots/railway.ts` (2,123 lines) holds about 124 and
  `railway-works.ts` 24. No `dev/` file reads a movement tunable. (Corrected at M12c's review: `railway-leaf-act.ts`
  read `ring` through a cast that typecheck could not see; M12c moved it to `ringOpen(w)` and `aperture(w)`.)
- Two scenario files build their page code as strings (`hud-glance.ts:13`, `world-inputs.ts:99`): untyped, so
  typecheck does not see their reads (`carry`, `pending`, `ready`).

**`test/`: 16 files, 189 calls of `adapter.inspect()`; `server/test`: 0.** The last column is each file run alone
under `node --test` on Node 26 while the machine's load average was 45 to 110: relative weights, not timings.

| File | Lines | Calls | What it is | Alone, s (loaded machine) |
| --- | --- | --- | --- | --- |
| `railway-adapter.test.ts` | 976 | 89 | behaviour: prediction, settle, corrections, refill, reset | not timed |
| `railway-adapter-m1-review.test.ts` | 206 | 6 | the frozen read's frame memo (M1), two dispose cases | not timed |
| `railway-replicate.test.ts` | 765 | 11, and 22 `shownOf` (the model of a clone) | behaviour: mirror and predictor | not timed |
| `railway-read-session.test.ts` | 352 | 12 | differential: `read.x()` equals `inspect().x` | 7 |
| `railway-m10a-views.test.ts`, `-m10a-review` | 450, 480 | 7, 3 | differential: every converted read equals the field it replaced | 39, 38 |
| `railway-m10b-review.test.ts` | 544 | 16 | differential | 23 |
| `railway-m10c-views.test.ts`, `-m10c-review` | 647, 454 | 9, 8 | differential, plus the stale-memo cases | 106, 192 |
| `railway-m10d-review`, `-m10e-review`, `-m10f-review` | 513, 504, 411 | 8, 8, 6 | differential | 39, 96, 71 |
| `railway-m12.test.ts` | 428 | 1 | the M12 trace: one column is the whole `inspect()` | not timed |
| `railway-queries.test.ts` | 532 | 3 | M8's differential (M12b deletes it) | not timed |
| `railway-r4a-views.test.ts`, `-r4b-views` | 246, 261 | 1, 1 | Ring Island views; one oracle read each | not timed |

**The read model itself**, beyond `inspect()`:

| Reader | Files | How |
| --- | --- | --- |
| `src/world/railway-replicate.ts` | 1 | `railwayAt` (37 lines' worth), for `inspect()` alone |
| `src/world/railway-server.ts:351` | 1 | the lazy `railway` getter: 29 reads left, all in `test/railway-adapter.test.ts`, `railway-replicate.test.ts`, `railway-queries.test.ts`, and `dev/spikes/ecs/server-path.ts` |
| `src/adapters/railway.ts` | 1 | `buildState` and `worksOf` call the old facts on the model |
| `src/sim/town-facts.ts` | 1 | `townRead(s: Railway)`, `townReadOf` (twin: `townReadOfWorld` in `src/entities/town/town-read.ts`) |
| `test/helpers/railway-model.ts` (`railwayOf`) | imported by `railway-m11-review`, `railway-queries`, `railway-read-session`, `railway-replicate` | the differential tests' old side; 39 calls with the helpers below |
| `test/railway-live.ts`, `helpers/railway-{q2,trains,works}.ts` | imported by `railway-adapter.test.ts`, `railway-replicate.test.ts` | the live proxy and its seeds |
| `test/helpers/railway-check.ts`, `fixtures/railway-bad-worlds.ts`, `helpers/railway-m11.ts`, `helpers/railway-m10a-twins.ts` | 6 check tests, `railway-ring.test.ts`, 2 M11 tests, 4 M10/R4a tests | the old validators and frozen twins beside the world's |
| `test/railway-lint-review.test.ts`, `review-m3b.test.ts` | 2 | name the files as lint fixtures |
| `dev/spikes/ecs/{predict-cost,railway-diff,server-path}.ts` | 3 | answered spikes, outside the typecheck |
| `src/sim`: `railway-read-model.ts` (338), `railway-live.ts` (122), the `Railway` type, the old facts and validators in `railway{,-line,-line2,-works,-trains,-check}.ts` | 8 | the model |

## 2. The decision: nothing replaces `inspect()`

**Chosen: (b), readers query components directly, with two things kept that were never the read model.** No object
shaped like the state is built anywhere: not in the adapter, not in `src/debug`, not in a test helper.

1. **State is read as rows and queries, by everyone.** A test, a bot, an eval and a view import the same
   `src/sim/railway-rows.ts` and `railway-queries*.ts` and read the world: `adapter.read.world()` in a test,
   `railwayWorldRead()` (it exists today, in `state.ts`) in a page tool. The field map in section 3 is the whole
   translation.
2. **`inspectRailway()` stays as the view's inspection and loses the adapter's spread.** What is left is what no
   component holds: the scene walk (`owned`, `head`, `targetHead`, `machine`, `station`, `trees`, `reward`, `hookShot`,
   `glider`, `line2View`, `worksView`, `crossingView`, `pathOpen`) and the session's thirteen scalars (`pid`,
   `status`, `ready`, `pending`, `stalled`, `tick`, `connected`, `synced`, `step`, `hash`, `epoch`, `next`,
   `prediction`), flat, as today. Every entity has an `inspect()` of its own state
   (`src/entity/inspect.ts`); this is that, and it is why 28 of the 58 tool files need no edit.
3. **The Dev menu's dump shows rows as stored.** `src/debug/dev/inspect.ts` and `room.ts` print the view inspection
   and `rows: world.snapshot()`, the save's own shape, generic over `RAIL_COMPONENTS`. A new component appears in it
   with no code.

**Why not (a), a debug snapshot built from rows in `src/debug`.** It is the read model under another name, and the
honest test is what it would contain: the same seventy fields `buildState` has, the same derived values
(`line2.active`, `works.stage`, `counts`, `phase`), merged across components, rebuilt per call. A lint rule can keep
production from importing it; nothing keeps it true. It would be a second implementation of every fact the queries
already are, exercised only by tools, and every build-out would have to extend it or leave its bots blind: v27 did
exactly that (`ring` was added to `buildState` from the old model, and a live view, the lookout, then read it). The
owner's answer was "delete it entirely and rewrite the tests against components"; a snapshot that 58 tools and 16
tests keep reading is the thing renamed.

**Why not (c), queries for tests and a snapshot for bots.** Same objection for the bot half, and the saving is
smaller than it looks: with the view inspection kept, the tools' whole state surface is about 260 field reads in 30
files, typechecked, and half of them are in one bot.

**What makes the kept pieces different from the model.** `inspectRailway()` may contain only view-held and
session-held values, never a component field or a fact a query computes; the M12e lint rule and `state.ts`'s header
say so. `world.snapshot()` is not derived: it is the rows. Both are built per call, nothing is cached or frozen.

**What it costs.**

- **Tools:** 30 files, about 260 reads, in four batches (D1 to D4). Each read is a one-line change from the map.
- **Tests:** of the 189 calls, 89 in `railway-adapter.test.ts` and 11 (and 22 `shownOf`) in
  `railway-replicate.test.ts` are behaviour and are converted: the oracle becomes the server's world rows at the
  acked step, which most of those tests already hold. The other 87 calls sit in twelve differential tests whose
  subject is "equals `inspect()`". With `inspect()` gone that subject is gone (parent plan, call 28): each file is
  triaged, the differential cases are deleted and listed by name, and the behaviour cases inside them (a late
  joiner, a predicted press showing on the press, a refill, the stale-memo and held-world cases the reviews added)
  are kept and re-pointed at the server's rows. Estimate: about 4,350 of those 4,800 lines are deleted, about 450
  kept; about 1,950 lines converted in the two behaviour files.
- **The guard that replaces the differential proofs** is the one that outlives the migration: the M12 trace (every
  client's world hash, tick, session scalars and events per frame, 27 seeds), minus its `inspect()` column, and the
  two behaviour files.

**Rules every step keeps** (binding since M12): a published world is never written, so a reader takes
`read.world()` again at the head of every entry point, `accepted()` included, and a tool reads through a closure
(`const w = () => railwayWorldRead()!.world()`), never a world held across an `await`; no memo keyed on world and
tick; no `WORLD_NS` bump (no step below changes a component, an op, a packet or a save); no long playthrough.

## 3. Design

- **Sync kinds: none change.** The railway stays Server kind under `railway`; no op, wire shape, presence key, save,
  `rules/types.ts` entry, `edits` generator, invariant or `env` fact is added or changed. Authority is the server's;
  thresholds stay held back in prediction. **Controls:** none. **Cosmetic:** nothing new.
- **`adapter.read` gains `debug()`** (M12c): `{ connected, synced, step, hash (a getter), epoch, next, prediction }`,
  the session scalars `inspection()` held that the facade lacks. Tools and the view inspection read them; no view does.
- **The field map** (old `inspect()` field, then the read; `r = railwayWorldRead()!`, `w = r.world()`,
  `at = r.tick()`, `me = account(w, r.pid)`):

  | Old | New |
  | --- | --- |
  | `ready`, `pending`, `stalled`, `pid`, `status`, `tick` | `r.ready()`, `r.pending()`, `r.stalled()`, `r.pid`, `r.status()`, `r.tick()` |
  | `step`, `hash`, `connected`, `synced`, `epoch`, `next`, `prediction` | `r.debug().…` |
  | the 18 movement fields | `r.movement().…` |
  | `carry`, `stoneCarry`, `railsCarry`, `foot`, `available*` | `me?.carry ?? 0`, `.stone`, `.rails`, `.foot` |
  | `carryMax`, `freeCarry`, `accounts`, `piles` | `carryMax(w)`, `freeCarryIgnoringBig(w, r.pid)`, `accounts(w)`, `piles(w)` |
  | `phase`, `panelCount`, `panelStock`, `counts`, `activeStation` | `railPhase(w, at, at)` (the wake judged at `at` too), `railPanelCount(w, at)`, `railPanelStock(w, at)`, `railCounts(w, at)`, `railActiveStation(w)` |
  | `stations[k].…`, and the flat `stock`, `allocation`, `used`, `delivered`, `start`, `elapsed`, `completion` | `railJobs(w, at)[k]` (`{ id, job, run }`); the flat ones are the active station's; `completion` is the sum over `jobs(w)` |
  | `awake`, `axe`, `jump`, `stoneRack`, `rack`, `beam`, `hardwood`, `rocks`, `sources`, `work`, `growth` | `rail(w).…`, `beam(w)`, `hardwoods(w)`, `rocks(w)`, `trees(w)`, `treeGrowth(w, slot)` |
  | `line2.forge`, `.cart`, `.boiler`, `.lever`, `.sea`, `.hook`, `.pack`, `.depot`, `.depotRails`, `glide` | `forge(w)`, `cart(w)`, `boiler(w)`, `rail(w).…` |
  | `line2.active`, `.completed`, `.gateOpen`, `.seaOpen`, `.packReady`, `.trains`, `.kitOwed`, `.cartStatus`, `.served`, `.stations` | `line2Active(w)`, `line2Completed(w)`, `line2GateOpen(w)`, `line2SeaOpen(w)`, `line2PackReady(w)`, `line2Trains(w)`, `line2KitOwed(w)`, `line2CartStatus(w)`, `line2Served(w)`, `line2Jobs(w, at)` |
  | `trains`, `lines` | `trains(w)`, `lines(w)`; `railTrainsOf`, `trainStops`, `railServing` for derived |
  | `works.…`, `works.stage`, `works.pierNeed`, `shed` | `works(w)`, `worksStage(w)`, `pierNeed(w)`, `shed(w)` |
  | `ring.head`, `ring.set`, `ring.joined` | `ringOpen(w).head`, `aperture(w)` |
  | `falls` | no row holds it: restate on `trees(w)` (parent plan, T batches) |

  A reader that needs a fact with no query stops and asks; no batch adds to `src/sim`.
- **The conversion ratchet** (M12c): `inspectRailway()` takes its final, narrow type at once, and the old wide object
  moves to a temporary `inspectRailwayLegacy()`. `npm run typecheck` then names every state reader; those files are
  renamed to the legacy door by hand in that step and listed in `INSPECT_LEGACY_IMPORTERS` in `dev/lint/policy.ts`, a
  list that may only lose lines, as `READ_MODEL_IMPORTERS` does. A batch is done when its files are off the list
  and off the name.
- **After the split** (M12f): `src/adapters/railway-session.ts` (connection, clocks, predictor, settle, corrections,
  the `read` facade; ≤ 450 lines), `railway-intents.ts` (`RailwayIntent`, `intentOf`, `implied`, `holds`, the `TAKES`,
  `NOT_MATERIAL` and `NOT_WHILE_HAULING` sets, the `act` methods; ≤ 300), `railway-effects.ts` (`RailwayAccepted`,
  `RailwayCorrection`, `effectOf`, `accepted`, `sameTarget`; ≤ 150). `createRailwayAdapter` and `RailwayAdapter`
  keep their names, exported from `railway-session.ts`; `src/adapters/railway.ts` is deleted.
- **Lint and boundaries:** no new layer. `src/debug` keeps its rule (loaded by `import()` only). M12e adds one
  `no-restricted-syntax` rule: no export named `RailwayInspection`, `buildState`, `Railway`, `railwayView` or
  `validateRail…` under `src/`.

## 4. One home for each piece of logic

Owner, 11 November: the ownership note "should encourage good architecture calls, and code deduplication". So a step
that touches a copy removes it, and is not done while the copy remains. Each row is part of the step named.

| Logic | Copies today | The one home | Step |
| --- | --- | --- | --- |
| What a view reads to draw (trains, halts, line 2) | the views, and hand copies of their reads in `test/railway-m10a-views.test.ts` and `railway-m10c-views.test.ts`, with frozen adapter twins in `test/helpers/railway-m10a-twins.ts` | the view file for a plain row read; a query in `src/sim/railway-queries-*.ts` for anything with arithmetic, tested there once. No test restates a view's read | X3 deletes the copies and the twins file; a copied read that has arithmetic is reported to M12e, which moves it into the domain's query file |
| "Is the railway ready", the world, tick and pid in a page tool | 46 evals repeat the typed `import()` of `state.ts`; 9 files and `dev/look/lib.ts` each carry a wait-until-ready loop | `dev/look/rail-read.ts`: `rw()` (the world, read now), `railAt()`, `railPid()`, `railReady(ms)`, and the row readers and queries re-exported | M12c creates it (and proves with one eval that a relative import of it resolves in the page; if not, it is `src/debug/rail-read.ts`, loaded by `import()`); D1 to D4 use it in every file they touch; M13c in every file it retargets |
| The session's scalars | `inspection()`, the `read` facade and the view's spread | `adapter.read` (with `debug()`); the view inspection spreads it | M12c, M12e |
| Once-a-frame values in the adapter | three hand-written memos (`moves`, `frameTick`, `stalledNow`) and `inspect()`'s fourth | one `perFrame(read)` helper in the session, used by all three | M12e (it deletes the fourth; the trace holds the behaviour) |
| The 18 movement tunables | `RailwayMovement`, `railMovement`, and the field-by-field `sameMovement` | `railMovement` and a comparison over its keys | M12e |
| Waiting on a train at the forge; a back that is only a load | `waitsForTrain` and `waitsForTrainOn` in `forge-offer.ts`; restated `onlyALoad` in `test/railway-m10e-review.test.ts` | `waitsForTrainOn` (renamed `waitsForTrain`), `onlyALoadIn` in `back-down.ts` | X3 and X4 drop the tests' copies; M12e deletes the old function |
| The town's facts | `townRead(s: Railway)` and `townReadOf` in `src/sim/town-facts.ts`; `townReadOfWorld` in `src/entities/town/town-read.ts` | `townRead(w)` in `src/sim/town-facts.ts` | M12b-1 |
| The load check | the world checks in `railway-check*.ts` and the five `validateRail…` with `railwayInvariant`; `railway-live.ts` runs both | `railwayCheck(w)` and its four domain files; a build-out's check in its own file, called from it | M12b-1 (tests), M12b-2 (source) |
| The 33 facts | on `Railway` in `railway{,-line,-line2,-works,-trains}.ts` and on the world in the query files; `railRingOpen(s)` beside `ringOpen(w)` | `src/sim/railway-queries*.ts` | M12b-2 |
| Driving a world in a test; seeds | `railway-live.ts` (the proxy) and `railway-drive.ts`; `test/helpers/railway-{q2,trains,works}.ts` beside `src/sim/railway-seed-*.ts` | `railway-drive.ts` and the seed files, through `test/helpers/rail.ts` | X1, X2 (callers), M12b-1 (files) |
| A tool for each beat | a Place eval or bot and its `railway-*` twin | the `railway-*` eval, the railway bot's segment or the rail seed | M13a names each pair, M13b deletes Place's |
| The level check's line constants | copied from Place's layout into `dev/level/check.ts` | imported from `src/sim/railway-*-layout.ts` and `src/place/layout.ts`; the tool holds no layout number | M13d |
| The stations of each line | `LINE1_STATIONS` and `LINE2_STATIONS` in the sim's layouts, and `LINKS[n].stations` in `src/place/layout.ts` (the 11 November outage: v27 added Q7 to one only) | the sim's layout files; `src/place/layout.ts` derives its rows from them, in metres | M13g |

## 5. Steps

Sizes: **S** under half a session, **M** one session, **L** one long session, one implementer each. **Review:** "independent"
means a fresh reviewer and `npm run ship-queue -- <worktree> --wait --reviewed "<npm run review-stamp> …"`, required
for anything under `src/sim`, `src/net`, `src/world` or `server/`; "code review" is the normal `/code-review`. Every
step branches from `origin/main`, ships alone and leaves `npm run check` green.

| Step | What | Size | Tier, review | After | Parallel with |
| --- | --- | --- | --- | --- | --- |
| X1 to X4 | Tests off `inspect()` | M, M, L, M | Low, code review | now | each other, M12c, D, M13a to c |
| M12c | The ratchet: narrow `inspectRailway()`, the legacy door | S | Medium, code review | now | X, M13a, M13b |
| M12d | The four `src` readers; the Dev menu's rows | S | Medium, code review, looks | M12c | X, D |
| D1 to D4 | Tools off the legacy door | L, S, M, M | Low, code review | M12c | each other, X, M12d |
| D5 | The ready-wait loops onto `railReady()` | S | Low, code review | M12c | everything |
| M12e | Delete `inspect()` and `railwayAt` | S | **High, independent** | X, M12d, D | M13 |
| M12f | The adapter split | M | Medium by path, **independent asked for** | M12e | M12b-1, M13 |
| M12b-1 | The model's last readers | M | **High, independent** | M12e | M12f, M13 |
| M12b-2 | Delete the read model | S | **High, independent** | M12b-1, M12f | M13 |
| M13a | Tag `archive/place`; the twin table | S | docs | now | everything |
| M13b | Delete Place's tools that have a twin | S | Low | M13a | everything but M13c |
| M13c | Retarget the tools with no twin | M | Low | M13b, D3, D4 | M12e onward |
| M13d | The level check onto railway seeds | M | Low (tooling) | M13a | everything but M13c's `dev/economy` files |
| M13e | Delete `src/proto/place` and the entry | M | Medium, code review, **live boot** | M13b, c, d | M12b |
| M13f1 to f3 | Owners for the moved modules | S each | Medium, looks | M13e | each other |
| M13g | One list of stations | M | Medium, code review, **live boot** | M13e | M13f1, f3 |

### The tests (start now; no file under `src/` is edited)

Per batch: state comes from `adapter.read.world()` or the server's `host.rules.railway.world()`; the commit body
carries the census (`dev/migrate/test-census.ts`) before and after and, for a converted file, the kill table
(`dev/migrate/rail-mutants.ts`); every deleted test is listed by name with "differential on `inspect()`" or its
other reason. A file is done when `grep -c '\.inspect()' <file>` is 0 and it imports none of `test/railway-live.ts`,
`helpers/railway-{model,q2,trains,works,m10a-twins}.ts`. Checks: the batch's files under `node --test`, `npm run
typecheck`, `npm run lint`.

- [x] **X1. The adapter's tests.** _M._ `test/railway-adapter.test.ts` (976; converted: 89 `inspect()` reads, its
      reads of `api.railway`, its seeds from `railway-live.ts` and `helpers/railway-trains.ts` onto
      `test/helpers/rail.ts`), `test/railway-adapter-m1-review.test.ts` (206; the frame-memo cases are deleted, the
      two dispose cases move into the adapter file as `read.ready()` asserts, the file is deleted).
- [ ] **X2. The mirror's tests and the trace.** _M._ `test/railway-replicate.test.ts` (765: `shownOf` becomes rows
      of the clone; `api.railway` becomes `api.world()`), `test/railway-r4a-views.test.ts`,
      `test/railway-r4b-views.test.ts` (one read each), `test/railway-m12.test.ts` with
      `test/fixtures/railway-m12-trace.json`: drop the `inspect()` column and re-record in a commit that changes
      only those two files, on unchanged source, and show the other columns' hashes equal before and after.
- [ ] **X3. Triage a, b, c.** _L._ `test/railway-m10a-views.test.ts`, `railway-m10a-review.test.ts`,
      `railway-m10b-review.test.ts`, `railway-m10c-views.test.ts`, `railway-m10c-review.test.ts`,
      `test/helpers/railway-m10a-twins.ts` (deleted once X2's r4a edit is on main; otherwise left for M12e). Kept
      and re-pointed at the server's rows: the late joiner, the source checks ("neither view calls…": now a `grep`
      over every view for `.inspect()` on the adapter), `boiler-view`'s press closure, the `forgeTake` flight, the
      Q5 and crossing "goes active the frame the server's row does" cases, the hidden-trains case (rebase over
      `hotbox/trains-visible`, which keeps trains drawn with actions pending and unskips it).
- [ ] **X4. Triage d, e, f and the session.** _M._ `test/railway-m10d-review.test.ts`, `railway-m10e-review.test.ts`,
      `railway-m10f-review.test.ts`, `railway-read-session.test.ts`. Kept: a predicted press shows before the
      answer; a footing set down reads as a pile; `read.movement()` identity and rev; `read.tick()` one value a
      frame; `read.ready()` false at a full window. `treeGrowth` and `freeCarryIgnoringBig` are asserted against
      literals on seeded worlds, not the model.
- **Reviewer attacks (all four):** a kept case that now compares a row with itself; a behaviour case deleted as
  "differential" (read the deleted list against the test's name and body); a world held across an `apply`.

### `inspect()` out of the client

- [x] **M12c. The ratchet.** _S, Medium._ `src/adapters/railway.ts` (add `read.debug()`),
      `src/entities/railway/state.ts` (`RailwayViewInspection` is the session scalars and the view fields, no
      `RailwayInspection &`; add `inspectRailwayLegacy()` and `setRailwayLegacy()` with today's wide type),
      `view.ts` (`inspect()` spreads `{ pid, status: read.status(), ready: read.ready(), pending, stalled, tick,
      ...read.debug() }`; `inspectLegacy()` is today's body), `index.ts`, `dev/lint/policy.ts`
      (`INSPECT_LEGACY_IMPORTERS`), then the rename in every file typecheck flags (expected: the 30 of section 1,
      `src/proto/playdata/record.ts`, and by hand the page strings in `dev/scenarios/hud-glance.ts`).
      **As built:** also `dev/lint/safety.ts` (the list is enforced by its own rule, `boogle/inspect-legacy`, which
      matches the name as code and inside strings, so the string-built scenarios are held too) and the new
      `dev/look/rail-read.ts`, which also re-exports `inspectRailway` so a tool imports one module. A relative import
      of it resolves in the page (bots import `../bot.ts` the same way), so it stays under `dev/look`. The list landed
      at **35 files**: typecheck's 31, the strings in `hud-glance.ts` and `world-inputs.ts` (it reads `accounts`),
      `src/debug/dev/inspect.ts` and `room.ts` (the Dev menu's dump stays whole until M12d gives it rows), less
      `jump-in.ts` (converted here, the proving eval). Section 1 missed three state readers, now given batches below:
      `bots/coop-unlock.ts` and `bots/railway-reload.ts` (D2), `evals/railway-q6-forge.ts` (D4). The two peer-test
      files call `adapter.inspect()`, not the door, so they are not on the list; D4 still converts them.
      **After review:** the second door to the same object, `railwayRead()`, is held the same way
      (`RAILWAY_READ_IMPORTERS`, 4 files, `boogle/railway-read`) until M12d deletes it; both rules cover
      `src`, `dev`, `test`, `protos`, `scripts` and `.js`/`.mjs` (`server/` is outside the lint), ignore only
      `state.ts` in the entity, and do not see a name built at runtime. `LEGACY_DOOR_CEILINGS` holds each list's
      length (35 and 4); a batch lowers it when its files leave, and `test/review-m12c.test.ts` fails a list that
      grows or keeps a file that no longer names its door. `read.debug().prediction` is a copy; the view's
      inspection keeps `hash` a getter.
  - **Done:** typecheck green; the list in the commit body matches section 1's 30 or each difference is named.
  - **Checks:** `npm run check`; `npm run scenario -- hud-glance`; `npm run look -- --query from=q3-done --eval
    dev/look/evals/jump-in.ts --until window.__jumpDone` (a state reader on the legacy door) and one view-only eval
    (`railway-seats.ts`).
- [x] **M12d. The live readers and the dump.** _S, Medium. After M12c._ `src/entities/lookout/view.ts`
      (`ringOpen(w).head` and `aperture(w).joined` through `railwayWorldRead()`, read at the head of `readLifted`),
      `src/features/playtest-flag.ts` (`account(w, pid)`), `src/proto/playdata/record.ts` (`line2Trains`,
      `line2Completed`, `qjob(w, 5).completion`, `read.ready()`), `src/debug/dev/inspect.ts` and `room.ts` (the view
      inspection and `rows: world.snapshot()`); delete `railwayRead` and `setRailwayRead` from `state.ts` and
      `index.ts`. `record.ts`, `inspect.ts` and `room.ts` come off `INSPECT_LEGACY_IMPORTERS`; with `railwayRead` deleted,
      `RAILWAY_READ_IMPORTERS`, its rule (`boogle/railway-read`) and its ceiling go too (D4 has taken its two evals).
  - **Checks:** `npm run check`; looks at `--rail-seed gap-footed` (buoys lifted where the railhead stands) and
    `deck-laid`; the M flag pressed with a full back (the mark's `logs`); the Dev menu's Inspect opened.
  - **Reviewer attacks:** the lookout before the railway mounts and after it unmounts (null read: buoys afloat, as
    today); a journey mark firing twice across a refill.
- [ ] **D1. The route bot.** _L._ `dev/look/bots/railway.ts` alone (about 124 reads; its `read = () =>
      inspectRailway()!` closures become `rw()` closures). **Hold:** Ring Island R5 edits this file; check `npm run
      inflight` and land the day it is rebased. **Checks:** `npm run playthrough -- --to T2`, `--from q5-done --to
      trains`, `--players 2 --to t1-done`; the witness hashes in the two-player run still agree at every step.
- [ ] **D2. The other bots.** _S._ `dev/look/bots/railway-glide.ts`, `railway-held-jump.ts`, `railway-works.ts`,
      `coop-unlock.ts`, `railway-reload.ts` (the last two found by M12c's typecheck).
      **Checks:** each bot's own eval once (`railway-works-bot.ts`, the glide and held-jump looks).
- [x] **D3. Line 2's evals.** _M._ `dev/look/evals/`: `railway-b4-at`, `railway-b4-bot`, `railway-b5b8-at`,
      `railway-b5b8-bot`, `railway-boiler-fit`, `railway-forge-lights`, `railway-head-forge`, `railway-gated-fill`,
      `railway-glide-wake`, `railway-signal-hold`, `railway-trains-pass`, `gpu-portability` (`jump-in` was done in
      M12c).
- [x] **D4. The rest.** _M._ (**As built:** 12 evals, 2 scenarios and the 2 peer-test files; `INSPECT_LEGACY_IMPORTERS` 35 to 21. The peer-test probe is `session` (`read` scalars and `debug()`) plus `rows` (the checks' rows and queries), no inspection. `railway-finds` and `railway-town` still read `railwayRead()`: M12d.) `dev/look/evals/`: `railway-instant`, `railway-instant-act`, `railway-motion`,
      `railway-q6-wait`, `railway-q6-forge` (found by M12c), `railway-passenger-car`, `railway-passenger-car-two`, `railway-request-stop`,
      `railway-works-act`, `railway-works-at`, `railway-works-bot`, `ring-greybox`; `dev/scenarios/hud-glance.ts`,
      `world-inputs.ts`; `dev/peer-test/ws-railway.ts` and `ws-page.ts` (`T.railAdapter().state` and `state:
      adapter.inspect()` become the facade and `debug()`).
      `dev/look/evals/railway-finds.ts` and `railway-town.ts` read `railwayRead()?.ready`: they become `railReady()`
      and leave `RAILWAY_READ_IMPORTERS` (found by M12c's review).
- [ ] **D5. The ready-wait loops.** _S. After M12c; beside D1 to D4 (it touches only the loop lines)._ Each page
      tool's own "wait until the railway is ready" loop becomes `railReady(ms)` from `dev/look/rail-read.ts` (section
      4; M12c replaced `dev/look/lib.ts`'s). At M12c, on the narrow door: `jump-land-probe`, `railway-forge-finish`,
      `railway-glide-map`, `railway-roof-start`, `ring-house`, `ring-island-walk`; the loops in files a D batch
      converts go with that batch (`rg -n "inspectRailway(Legacy)?\(\)\?\.ready" dev` lists what is left).
      **Checks:** typecheck; two of the evals run once with their header commands.
  - **D3, D4 checks:** typecheck; each eval run once with the command in its header and its printed line compared
    with a run on main (same seed, same numbers); `npm run scenario -- hud-glance` and `world-inputs`; `npm run
    test:net` for the peer-test files. An eval whose header command no longer runs on main is listed, not fixed.
  - **Done (each D):** its files are off `INSPECT_LEGACY_IMPORTERS` and name `inspectRailwayLegacy` nowhere.
- [x] **M12e. Delete `inspect()`.** _S, High (`src/world`). After X1 to X4, M12d, D1 to D4._ (**As built:**
      `railwayAt` went to `test/helpers/railway-model.ts` as `railwayModelAt` (three differential tests still read
      the model; M12b-1 deletes them with it); the read counters went whole (`frames` had no reader). The export
      rule is `boogle/retired-railway-names` (its own rule, so the `src/sim` block's `no-restricted-syntax` does not
      replace it), with the read model's seven files exempt until M12b-2 deletes them. The latch is `read.whole()`,
      latched in `update()` too. Also: `dev/look/rail-read.ts`'s timed queries (`railJobs`, `line2Jobs`,
      `railCurrentJob`, `railPhase`, `railPanelCount`/`Stock`, `railCounts`, `line2Logs`, `line2Rails`) take the
      world alone and supply the tick, so a page tool cannot call the tick-less form that throws on a client's world;
      `railStation`, `line2Station` and `railBack` are the tools' one flat-job and back reader; `railwaySession` in
      `state.ts` is the session's scalars for the view inspection and the peer-test probe;
      `dev/look/bots/railway-checkpoint.ts` is the seeded routes' checkpoint. No query was added to `src/sim`: none
      of the wished-for ones had two callers. The Done grep's remaining hits are the guards that ban the names.)
      Delete from
      `src/adapters/railway.ts`: `readState`, `buildState`, `worksOf`, `samePile`, `inspection`, `inspect`, the
      frame memo's inspection half, `stats.reads`' inspect counters, `RailwayInspection`, and every import of an old
      fact or `Railway`; from `state.ts`, `view.ts`, `index.ts`: the legacy door; from
      `src/world/railway-replicate.ts`: `railwayAt` and its two imports; from `dev/lint/policy.ts`: the empty list,
      plus the export rule of section 3; `test/helpers/railway-m10a-twins.ts` if X3 left it. With it, section 4's
      rows for this step: one `perFrame` helper for the three memos, `sameMovement` over the keys, the old
      `waitsForTrain` deleted, and any view arithmetic X3 reported moved into its query file (that part is `src/sim`).
      In `src/sim/railway-queries.ts`, `job` and `qjob` (entity ids, which the rows' `job` and `qjob` shadow by name)
      become `jobId` and `qjobId`, like `trainId`, `lineId` and `cartId`, and `dev/look/rail-read.ts` drops its
      override line (M12c's review).
      Also (found at M12c): `src/entities/railway/trains-shown.ts` latches "the first whole state is in", a session
      value kept in a view; it becomes a facade value (`read.whole()`, true from the first whole state on, through
      refills and full windows), `train-view.ts` reads it and the latch file is deleted.
  - **Done:** `grep -rE "inspectRailwayLegacy|RailwayInspection|railwayAt|\.inspect\(\)\.(carry|line2|stations)" src
    dev test server` is empty; `src/adapters` and `src/entities` import nothing that takes a `Railway`.
  - **Checks:** `npm run check:full`; the M12 trace unchanged; `npm run loop -- run --json` hash equal to main
    (`ab52869e…`); `npm run counts` equal; one look at `--rail-seed trains-on` with a deposit showing on the press.
  - **Reviewer attacks:** `read.tick()`, `read.movement()` and `stalledNow` keep their once-a-frame behaviour now
    that the memo they shared with `inspect()` is gone; a tool or string that still calls the deleted name.
  - **Also (11 November):** `src/entities/railway/first-ready.ts` (`createFirstReady`, was `trains-shown.ts`), the latch
    of the first `read.ready()`, moves to a session read here (a `read.loaded()` or similar). It now has five users,
    not one: `train-view.ts`, `leaf-view.ts`, `railhead-view.ts`, `crossing-view.ts` and `cart-view.ts`, each of which
    hid, reset or un-decked on `!read.ready()` (also false with a full pending window or the link down).
- [x] **M12f. The adapter split.** _M, Medium by path; ask for the independent review (it moves the predictor's
      code). After M12e._ (**As built**, two commits: a pure `git mv` with every importer's path, then the cut.
      `railway-intents.ts` (323 lines) holds the intent type, `CARRY_MAX`, `intentOf`, `implied`, `holds`, the three
      op sets and `railwayActs(submit, view)`, the act methods as one object the session spreads into the adapter
      (`pileIn` went with `take`); `railway-effects.ts` (63) holds `RailwayAccepted`, `RailwayCorrection`, `effectOf`,
      `accepted`, `sameTarget`; `railway-session.ts` (668) keeps the rest, `railMovement` and `RailwayMovement`
      included. Importers take each name from its owning file; `railway-marks.ts` changed one type import (it took
      `RailwayIntent` from the old file, which made a type cycle with the session; now it takes it from intents).
      **The limits are not met**: section 3's ≤ 450 and ≤ 300 do not fit a mechanical cut, since `submit`, `settle`
      and the read facade are closures over the session's state. Shrinking the session is its own step, not a move:
      `railway-read.ts` for `railMovement`, `perFrame` and the facade over a narrow session handle, and `settle`
      over an explicit pending/shown state object; logged for the owner's call.) Section 3's three files; `git mv src/adapters/railway.ts
      src/adapters/railway-session.ts` first so the history follows, then cut the other two out; importers
      rewritten (`rg -l "adapters/railway.ts"`); `railway-marks.ts` unchanged; `docs/agents/sync.md`'s Server
      entry names the new files.
  - **Done:** `src/adapters/railway.ts` does not exist; the three files are within their limits; no behaviour moved
    (the diff is cuts and imports: the dedupes of section 4 landed in M12e, so this step stays mechanical).
  - **Checks:** `npm run check:full`; the M12 trace and `test/railway-adapter.test.ts` unchanged and green; `npm
    run load` on three rows (1, 2 and 4 players) with corrections and press-to-effect no worse than main in the same
    session; `npm run playthrough -- --players 2 --to t1-done`.
  - **Reviewer attacks:** module-level state that was one closure and is now shared between two adapters (two
    clients in one test process must not share a set or a counter); an effect played from the intents file.

### M12b: the read model

- [x] **M12b-1. The last readers.** _M, High (`src/world`, `src/sim`). After M12e; beside M12f (no shared file)._
      (**As built**, on `ecs/m12f`: `READ_MODEL_IMPORTERS` is empty, and nothing outside `src/sim` imports the read
      model, `railway-live.ts` or `Railway`. `townRead(w)` takes the world (`townReadOf`, `TownReadable` and
      `townReadOfWorld` are gone). The check corpus checks the world only. Its completeness test now reads the world
      check's own messages, not the old validators' source, so M12b-2 deletes the validators without touching it. With
      that change go the four UNREACHABLE entries that only the old validators threw, and `BY_CONSTRUCTION`. The golden
      shards and `railway-ring.test.ts` drop `modelVerdict`. `test/railway-m11-host.test.ts` and its helper are deleted
      (the plan named only the helper). The host's literals per stage (phase, panels, `line2()`, the resume cap, and
      the counts' score, total, rails and stone) are in `railway-m11-review.test.ts`, recorded on 9e7dfcbde while the
      model differential was still green; the three-day resume (yard credit, then the host's reads) is one literal test
      beside it. The phase walk is held to a literal list of runs. The late-join and refill
      probes are held to a fresh railway, then to the server's world. `jobProgress` now has its own test on both lines
      against the run rows the tick writes, in `railway-read-facade.test.ts`, next to the moved `read.world()` case. A
      +1 mutant in `jobProgress` fails it. The three spikes are gone. Review fixes: the completeness test also counts
      sites with repeats (the reviewer's test), so each line's job start/completion range site has its own bad world
      (`completion: 2`); `test/railway-check-ring.test.ts` (cherry-picked) holds `checkRing`'s five refusals. A
      surviving mutant, a late join's changes sent in reverse order, is logged, not tested: within one send each
      entity's change appears once and the mirror publishes only at the last chunk, so the order cannot change what
      is shown. `src/sim/railway-live.ts` has no importer now; `test/helpers/rail-no-audit.ts` still
      lists it for M12b-2.)
      `src/world/railway-server.ts` (delete the lazy `railway` getter, `view` and the `railwayView` import);
      `src/sim/town-facts.ts` (`townRead` takes a world: move `townReadOfWorld` in from
      `src/entities/town/town-read.ts`, delete `townReadOf`); `test/railway-check.test.ts`,
      `test/helpers/railway-check.ts`, `test/fixtures/railway-bad-worlds.ts` (drop the old validators' side; the
      world check and its 81 bad worlds stay); `test/helpers/railway-m11.ts` and `test/railway-m11-review.test.ts`
      (the model side goes; the host's `counts`, `phase`, `panels` are asserted against literals per stage, recorded
      from main in the commit); `test/railway-lint-review.test.ts`, `test/review-m3b.test.ts` (fixtures that name the
      deleted files); delete `test/railway-queries.test.ts` (keep its `jobProgress` and facade cases by moving them
      to `test/railway-read-facade.test.ts`), `test/railway-live.ts`, `test/helpers/railway-{model,q2,trains,works}.ts`,
      `dev/spikes/ecs/{railway-diff,predict-cost,server-path}.ts`.
  - **Hold:** PR #1553 (`claude/test-speed`) edits `railway-live.ts`, `railway-check.test.ts`,
    `helpers/railway-check.ts` and the stage tests; whichever lands second rebases (`npm run inflight`).
  - **Done:** `READ_MODEL_IMPORTERS` is empty; nothing outside `src/sim` imports `railway-read-model.ts`,
    `railway-live.ts` or a type named `Railway`.
  - **Checks:** `npm run check:full`; the M0 goldens unchanged with `GOLDEN` unset; `npm run loop -- run` equal to
    main; `rail-mutants` over the railway test set kills what it killed before X1.
  - **Reviewer attacks:** the server's resume cap and panel numbers on a room resumed after days
    (`test/railway-m11-host.test.ts`); a check condition that only the old side exercised.
- [x] **M12b-2. Delete it.** _S, High by path, deletions only. After M12b-1 and M12f._ (**As built**, on
      `ecs/m12b-1`'s fixed tip. Deleted: `railway-read-model.ts`, `railway-live.ts`, and `railway-line2.ts` whole (every
      export in it took the model). From `railway.ts`, `railway-line.ts`, `railway-works.ts` and `railway-trains.ts`:
      the `Railway` type, `RailPile`, `RailRing`, `RAILWAY_DURATION`, `railAccount`, `railCounts`, `railPhase` and the
      re-export block, the model's shape types, the old facts, `railTrainsOf(s)` and the four domain validators. From
      `railway-train.ts`: `railRingOpen`. From `railway-check.ts`: `validateRailway` and `railwayInvariant`.
      `railway-line.ts` now holds only `LINE_TIMING`, and `railway-works.ts` only the stage labels and seam bits; both
      stay where their importers are. Also deleted: `dev/migrate/railway-imports.ts`, M3b's one-off migration script,
      whose table named the deleted files. Lint: rule 5's ban, both lists, the `read-model` and `live` alternatives in
      `RAIL_DYNAMIC`, the leaf ban and the driver ban, and the retired-name rule's exemption are gone. The src/sim
      blocks now leave the seeds, the driver and `railway-check*.ts` free to load the check. The rg line over the
      eight names now finds only the two guards that ban them (`policy.ts`'s `RETIRED`, `review-m12c.test.ts`'s
      fixtures). `npm run unused` lists no export that only the deleted code used. `trainRowBroken` stays in
      `railway-trains.ts`, which the corpus test reads. The bad-worlds fixture's section headers name the domain check
      files. `test/railway-line-authority.test.ts`'s `railwayInvariant` alias is now `invariant`. `ecs-e.md` section 4,
      `src/world/README.md` and `ship-pipeline.md` were corrected; `sync.md` and `src/sim/AGENTS.md` named no model.)
      The parent plan's M12b
      entry as written: `src/sim/railway-read-model.ts`, `src/sim/railway-live.ts`, the `Railway` type and the old
      facts in `railway.ts`, `railway-line.ts`, `railway-line2.ts`, `railway-works.ts`, `railway-trains.ts`
      (`railRingOpen` included: `ringOpen(w)` is its world twin), the five validators and `railwayInvariant` in
      `railway-check.ts`, lint rule 5 and its list; `ecs-e.md` section 4, `sync.md` and `src/sim/AGENTS.md` updated.
  - **Done:** the parent plan's "done" table: the `rg -w` line over the eight names is empty; `npm run unused` shows
    no helper only the deleted code called.
  - **Checks:** `npm run check:full`; goldens and the loop hash unchanged; the server image test
    (`test/server-image.test.ts`).

### M13: Place

The parent plan's M13 entry holds the file lists by group (1 tag, 2 delete, 3 retarget, 4 level check) and
[place-retirement](place-retirement.md) job D1 the source edits (D1a flags, D1b pause, D1c Dev menu, D1e tools).
Its proof line "the full railway bot" is replaced by segments (owner: the long run on command only).

- [x] **M13a. The archive and the twin table.** _S, docs._ Tag the parent commit `archive/place`, push the tag,
      name it in `docs/game-design/place.md`. Write, in this file under this step, one row per file of group 2 with
      the live-game twin that covers it (a `railway-*` eval, a bot segment, a rail seed); a file with no twin moves
      to group 3. Re-run `grep -rlE "proto=place|proto/place|__place" dev test server protos` (116 files today, 148
      when the lists were written) and name every file in neither list.

  **The twin table (M13a, done 11 November).** `archive/place` is a local tag at `a6fc476fb` (origin/main when it was
  made); the push waits for the owner, so `docs/game-design/place.md` does not name it yet. Rule used: a twin is a
  live-game tool that makes the same assertions; an assertion about a mechanic only Place has is listed as removed,
  not counted as lost. A tool still imported or dispatched by a file that stays (`sheet.ts`, `playthrough.ts`,
  `coop-playthrough.ts`) is not deleted before that file is retargeted. **The plan's group 2 was written from names:
  2 of its 54 files have a full twin.** Totals: **deleted 2** (M13b). **52 stay:** 43 for M13c (5 wait on
  `sheet.ts`, 3 on the wing), 3 tests for M13e, and 6 that need nothing (4 live harness files, 2 live tests). Group 3's
  51 files are M13c's too. **Kept for M13d: 10** (group 4: 6, and 4 that lose their last Place path). Counts are
  today's (119 files match the grep).

  | Group 2 file | What it checks | Twin, or what is lost | Step |
  | --- | --- | --- | --- |
  | `evals/place-early-beam` | Station 1 rebounds, ordinary logs fit, Station 3 needs the beam, shoulder, walk, deliver | **Full:** `bots/railway.ts` T2 to T3 (lines 1317 to 1328 rebound sends nothing; 1362 logs alone do not feed T3; beam pickup, carried, laid), `npm run playthrough -- --to T3` | **M13b deletes** |
  | `evals/replay-bridge` | the completed bridge walked with no recovery; a timed-crossing banner | **Full:** `bots/railway.ts` 1494 to 1520 (`walkTrack` 191 to 30 and back, no recovery). The banner is Place-only (`job.ways.short`), removed | **M13b deletes** |
  | `evals/place-big-reload` | shouldered beam restored, Drop once, empty Drop no duplicate, cargo reachable | None: the live bot carries the beam but never drops or reloads it; `railway-reload` reloads the reward only | M13c (rail seed with the beam held, then Drop) |
  | `evals/place-cart-whistle` | Q5 cart: gap, waiting, loading, forge, recall, unloading, pair, leave | Partial: the bot sees the cart bring the load (`railway.ts` 325, 1612). Lost: recall, leave, pair, unloading | M13c |
  | `evals/place-contact`, `place-seats-workshop` | two-player contact probes; seat grants, migration reclaim, workshop Sit | Partial: `railway-seats`, `railway-passenger-car-two`. Lost: the idle ground probe, the reclaim (unit: `seat-claims.test`) | M13c |
  | `evals/place-coop`, `place-exploring`, `place-trees-coop` | two players: wake, deposit, follower's chest, skip to trains, harvest replay | Partial: the bot's two-player mode (`second`, Help carry) and `rail-coop.ts`. Lost: not found live: the follower opening a chest, the platform call, snapshot assertions | M13c |
  | `evals/place-great-carry` | solo, pair, drop, retry, gate, helper-leave, carrier-leave | Partial: bot 1380 to 1437 (solo, Help carry pair); `help-carry.test`. Lost: drop, retry, both leaves in a page | M13c |
  | `evals/place-split` | Q5 solo, walk, split: times, cart ride, jump off | Partial: bot 280 to 350 funds Q5 by depot trips. Lost: riding the cargo, the timed modes | M13c |
  | `evals/place-tech`, `place-tech-act` | glide, summit, climb, hook, jump, double jump, posts, hub, staged | Partial: `railway-glide-*`, `railway-hook-capture`, `railway-held-jump`. Lost: climb, posts, hub, the glide camera compare and transients | M13c |
  | `evals/double-jump`, `bots/double-jump` | gaps of the jump course by real input | Partial: `railway-held-jump` (the float bug only). Lost: the gap measure; `dev/economy/place-level.ts` and `bots/place.ts` import them | M13c, M13d |
  | `evals/place-trees` | checks, decorative, hardwood 1 and 2, rebound, bite, full, dense | Partial: bot 1735 and 1759 (hardwood rebounds, bites). Lost: decorative, full, dense; `axe-chop` imports it | M13c |
  | `evals/place-job`, `place-act` | 40 staged shots of Place; its action half | None. It is the staging fixture 12 kept files import (`color-defaults-motion`, `fixed-exposure-review`, `carry-tag`, `visual-pipeline`, three beats, `playthrough.ts`, `look-broker.ts`) | M13c |
  | `evals/place-corner`, `place-cues`, `placement-audit`, `tunables-chop`, `place-town-coop` | Station 3 corner states; walking-in sightlines; T3 placement; chop tunables; two in the shop | None found | M13c |
  | `evals/place-forge-reconcile`, `place-personal-saves` | soft co-op reconcile of Place's forge; Place's gift and prop saves | None: Place-only mechanics (lockstep has no reconcile). Live cover: `scenarios/reconnect-edit`. Owner's call: delete at M13e, not retarget | M13c |
  | `evals/place-partner-load` | a partner's worn load: logs, rails, stone, beam, boiler, pet | Partial: `railway-boiler-fit` (two players, the boiler). Lost: the other loads | M13c |
  | `evals/replay-idle-landing`, `bots/place-landing` | the failed co-op idle landing at a fixed pose | None; `bots/place.ts` and `place-contact` import the bot | M13c |
  | `evals/sheet-glide`, `sheet-hook`, `sheet-ride`, `sheet-opening`, `sheet-enter` | motion sheet moments from Place checkpoints | Twins exist (`railway-glide-first`, `railway-hook-capture`, `railway-passenger-car`) but `sheet.ts` lines 311 to 382 dispatch these five | M13c retargets `sheet.ts`, then deletes them |
  | `evals/track-layer`, `track-layer-action`, `track-panel-contract` | the machine's views, panel contract (the wing greybox's own looks) | None live; `track-wing` and the wing URL use them; `railway.ts`, `railway-seats`, `pack-frame`, `machine-clearance` name `track-layer` | M13c, after the wing's model step |
  | `evals/place-draws`, `place-kit-draws`, `replay-pause-bottom`, `replay-pause-talk`, `replay-phone-cost` | per-mesh draw attribution, matched poses, Pause and phone boot | Not Place tools (no Place module; `__place` count 0 or a live module); `bench` gives totals only. Keep as they are | none (M13c may rename) |
  | `bots/place.ts` | the Place route bot | The route twin is `bots/railway.ts`, but `coop-playthrough.ts:121`, `place-job`, `place-contact`, `replay-idle-landing` import it | M13c |
  | `checkpoints.ts`, `restore-pair.ts`, `coop-warp.ts`, `saves.ts` | rail-seed checkpoints, restore pair, warp, saves | **Not Place's:** `look.ts`, `playthrough.ts`, `sheet.ts`, `session.ts`, `shots.ts`, `segments.ts` and `before-after.ts` use them for the live game. Off the delete list | none |
  | `video/shots/place`, `round4`, `round4-pair` | clips of Place's beats (stage through `__place`, `place-job`, `place-tech`) | None: no live shot records those beats | M13c (retarget or owner deletes) |
  | `test/big-cargo`, `train-nudge`, `place-coop-snapshot` | Place's cargo, nudge, coop snapshot | Not touched (`test/` is held); they test `src/proto/place` modules | M13e |
  | `test/restore-pair`, `checkpoint-pair` | the live restore pair | Not Place's; stay with the harness | none |

  Group 3 and 4 rows (no twin, each retargets): the 10 evals, 8 railway evals, 9 beats and fixture, `playthrough`,
  `coop-playthrough`, `observe`, `sheet`, `segments`, `garage-showroom`, `bots/railway.ts`, `codex/see`,
  `audio/render`, `patch`, `scan/retained`, `scan/task-routes`, `scenarios/run`, `scenarios/reconnect-edit`,
  `playtest/beats`, `loop/graph`, `economy/model`, `protos/protos` and five tests: **M13c**. `level/check`,
  `replay`, `spatial`, `track-continuity`, `world-blockout`, `economy/place-level`, and `grounding-props`,
  `grounding-track`, `timber-track`, `machine-clearance`: **M13d**.

  **In neither list (28 files in the grep).** Place references that are real: `evals/track-wing` (the wing probe;
  M13c, with `track-layer`), `evals/terrain-cove` (sets `__placeAct`; M13c with the beat), `look/playtester.md`
  (`proto=place&fresh=1`; M13c), `dev/codex/README.md`, `dev/look/README.md` (name `place-coop`; they change with it).
  The other 23 name only the harness's `__placeDone` or `__placeAct` flag, not Place: `look/look.ts`, `bot.ts`,
  `rail-coop.ts`, `bots/railway-{glide,held-jump,hook-capture}.ts`, `evals/{pack-frame,railway-b4-bot,
  railway-b5b8-bot,railway-engine,railway-glide-first,railway-glide-map,railway-glide-wake,railway-home,
  railway-photo,railway-request-stop,railway-roof-start,railway-seats,railway-signal-hold,railway-trains-pass,
  railway-works-bot,shared-gate-shot}.ts` and the comments in `dev/lint/policy.ts`. Renaming the flag is a
  leftover (P3); the M13e grep `proto/place` does not meet it.
- [x] **M13b. Delete group 2.** _S, Low. After M13a._ The 39 evals, 3 bots, 7 harness and video files and 5 tests of
      group 2, and their `package.json`, `dev/checks-for.ts` and docs lines. **Checks:** `npm run check`; `npm run
      look -- --at list` still lists; `npm run unused`.
      **Done 11 November: the twin table leaves 2 files to delete** (`place-early-beam`, `replay-bridge`, 134 lines);
      the other 52 move to M13c, M13d and M13e as the table says. M13c also takes the 43 it names.
- [ ] **M13c. Retarget group 3.** _M, Low. After M13b, D3 and D4 (it edits `railway-b4-at`, `railway-b5b8-at`,
      `railway-bench`, `railway-passenger-car*`)._ The 18 evals, 9 beats and their fixture, the harness files, and
      the five tests of group 3 onto the production entry and `--rail-seed`. It may run as two agents split at
      `dev/look/` against everything else. **Checks:** typecheck; each retargeted eval and beat run once; `npm run
      scenario -- reconnect-edit`; `npm run playthrough -- --to wake`.
- [ ] **M13d. The level check.** _M, Low (tooling). After M13a._ Group 4: `dev/level/check.ts`'s `--place=place`
      progression and `replay.ts` onto railway seeds and `src/sim/railway-*-layout.ts`; `spatial.ts`,
      `track-continuity.ts`, `world-blockout.ts`, `dev/economy/place-level.ts`. **Done:** `npm run level-check`
      prints the same reports for the live world as on main (diff the output); each assertion removed as Place-only
      is listed in the commit body.
- [ ] **M13e. Delete Place.** _M, Medium. After M13b, c, d._ D1a, D1b, D1c as written; delete
      `src/proto/place/` (44 files), `src/features/proto-place.ts`, `src/debug/dev/place.ts` and its callers'
      branches, `place-owner.ts`, the 230-line remainder of `rail.ts`.
  - **It changes what loads at startup.** On 11 November v27 broke the boot because `createStationBoxes` read
    Place's `LINKS[1].stations`. Before shipping: `node dev/live-boot.ts` passes against the built game locally, and
    `grep -rn "proto/place" src` is empty (`src/place/layout.ts` stays: it is the live layout). After shipping: the
    live smoke runs the same boot check, and https://boogle.club/ is loaded in a browser (jump in, the island draws,
    the railway connects) before the site is called healthy. No unit test guards the boot (owner, 11 November:
    "Remove it, rely on the smoke"; [owner calls](../agents/owner-calls.md)).
  - **Checks:** `npm run check:full`; `npm run bench -- --poses spawn,town` census equal to main; `npm run
    playthrough -- --to T2`; `?proto=place` opens the production game; first-load gzip reported.
  - **Reviewer attacks:** a module whose import ran a side effect the live game relied on (a `scene.add`, a CSS
    import, a `registerAction`); `asset-manifest.ts`'s `proto` key and the playdata card id (both stay `place`).
- [ ] **M13f. Owners for the moved modules.** _S each, Medium (render). After M13e (Place's callers are gone);
      three agents, no shared file._ **f1:** `src/entities/railway/{car,track-machine,seat,stations,machine-model}.ts`
      (the machine keeps order 7 through the owner's `animate`); **f2:** `src/place/{land,pieces,look-kit,look,folk}.ts`;
      **f3:** `src/render/{boxes,crates,wagon-look}.ts` and the `?proto=net`, `wagon`, `crossing` callers. Each
      removes its files from the `dev/lint/policy.ts` exemptions. **Checks:** `npm run check`; the bench census
      equal at `spawn`, `town`, `forge`; `npm run level-check` equal; a look at `--rail-seed trains-on` with a seated
      rider (f1), the village (f2). Each is startup code: the live-boot rule of M13e applies.

- [ ] **M13g. One list of stations.** _M, Medium. After M13e (Place's readers are gone); not beside f2 (`src/place`)._
      `src/place/layout.ts`'s `LINKS[n].stations` is built from `LINE1_STATIONS` and `LINE2_STATIONS`
      (`src/sim/railway-line-layout.ts`, `railway-line2-layout.ts`) with only what is the land's own (a platform's
      offset, a sign) kept beside it by station id. Start by listing the 18 `LINKS[0]` and `LINKS[1]` readers under
      `src` and what each takes; a station the land cannot place (Q7 on the piled deck) carries that in its sim row,
      not in a list kept beside it.
  - **Done:** adding a station is one edit; no file under `src`, `dev` or `test` lists station ids a second time.
  - **Checks:** `npm run check` (the level check reads the layout: reports equal to main); `node dev/live-boot.ts`
    on a local build; the bench census equal at `spawn`, `town`, `forge`; a look at `--rail-seed deck-laid` (Q7's
    frame and box). Startup code: the live-boot rule of M13e applies after the ship.
  - **Reviewer attacks:** a station's position moving by a rounding of cm to m; a reader that indexed `stations` by
    position and now meets Q7.

## 6. The unit suite's time

The suite runs 540 to 570 s in CI against a 20-minute limit. The conversion must take time out, not add it.

- **X3 and X4 are the win.** The twelve differential files replay 11 to 27 seeds for 300 frames each with two lagged
  clients. The nine timed (the eight M10 files and the session test) took 611 s run one at a time on a machine at
  load 45 to 110, so the absolute number is not evidence; the weights are: `railway-m10c-review` 192,
  `-m10c-views` 106, `-m10e-review` 96, `-m10f-review` 71. Deleting their differential cases removes most of it. Each X batch reports its files' time before and after; none may rise.
- **X1 and X2** build fewer objects per read (no model per `inspect()`); expect level or lower.
- **M12b-1** deletes `test/railway-queries.test.ts` and the old side of the check corpus, which runs
  every bad world and all 34 stages through a second check (M8b measured the corpus at about 22 s of the suite).
- **Not this plan's:** PR #1553 (audit off outside CI, sampled fuzz, stage checks folded into the golden shards)
  and the four Ring Island fuzz tests over 55 s each. M12b-1 rebases over #1553 or the reverse.
- No step adds a test file. The kept behaviour cases stay in their files or move into an existing one.

## Level findings

Nothing is placed, moved or gated, so there is nothing to rule on and `npm run level-check` was not run on new
positions. It is a regression check here: M13d and M13f2 must leave its reports identical to main.

## Risks

1. **A tool breaks silently** (P2). Evals run on command, not in CI; a wrong translation shows only when someone
   next runs it. Guards: typecheck (every eval is typed against `state.ts`), the narrow type from M12c, one run per
   converted eval compared with main. The two string-built scenarios are converted by hand and run.
2. **Triage deletes a behaviour test** (P1 for the suite). Guards: the deleted list by name in each commit, the
   census, the kill table for converted files, and the M12 trace kept through M12f.
3. **M12f regresses prediction** (P1; "Input gets instant feedback"). Guards: a cut-and-import diff only, the trace,
   `npm run load` against main in one session, the independent review.
4. **M13e or M13g breaks the boot** (P1). `dev/live-boot.ts` on the built game before the ship; the live smoke and
   the live site loaded in a browser after it.
5. **In flight:** PR #1553 against M12b-1; Ring Island R5 against D1; the wing's model step, which lands before
   M13e. Each step runs `npm run inflight` first.
6. **Room-safety "Don't"s that apply:** effects stay in the accepted path through the split (M12f); a reader that
   holds a world across a packet reads the past (every X and D batch); nothing here changes apply, presence,
   transport or saves. **Mixed builds:** no wire change in any step. **Performance:** M12e removes work (no
   `buildState`); no meshes, lights or tick work are added, so `npm run perf` is not required; `npm run counts`
   before and after M12e and M13e.
7. **Hotspot files:** `dev/lint/policy.ts` (M12c, every D batch removes a line, M12e, M12b-2, M13f): one line per
   file in the list so removals merge cleanly; `src/entities/railway/state.ts` (M12c, M12d, M12e, in that order).

## Calls made here

The owner, 11 November: "this codebase is yours: what it's for and how it's built are your call, and you'll keep
building on it." So the architecture choices are made, not asked. For [agent-calls](../agent-calls.md), Architecture:

1. **Nothing replaces `inspect()`; every reader queries rows.** Why: one implementation of each fact is the point of
   the migration, and a tools-only snapshot is a second one that each build-out must extend (v27's `ring` did, and a
   live view then read it). It costs about two more agent sessions now than a snapshot would.
2. **`inspectRailway()` stays, as the view's and the session's own inspection only.** Why: it reports what no
   component holds, it is every entity's convention, and 28 of 58 tools then need no edit.
3. **The Dev menu prints `world.snapshot()`.** Why: rows as saved, no code per component. Its Inspect panel will
   read `job`, `qjob`, `account` rows where it showed a nested object.
4. **Conversion proofs are deleted with their oracle** (about 4,350 lines in twelve files), their behaviour cases
   kept on the server's rows. Why: parent call 28, and it is the largest cut on offer to the unit suite's time.
5. **A temporary legacy door with a closed, shrinking importer list** carries the tools across (M12c to M12e). Why:
   typecheck becomes the worklist and each batch has a greppable end.
6. **`createRailwayAdapter` keeps its name and lives in `railway-session.ts`.** Why: 40-odd importers change a path,
   not a name.
7. **M12f gets the independent review though its path does not require one.** Why: it moves the predictor.
8. **The boot is guarded by `dev/live-boot.ts` and the live site, not a unit test.** The owner's call ("Remove it,
   rely on the smoke"); `test/railway-station-seats.test.ts` was deleted on `ci/unit-speed`. M13e and M13g run
   the boot check on the built game before the ship and load the live site after it.
9. **M13 is seven steps, tools before source,** and its proof is bot segments, not the full bot.
10. **A step that touches a copy removes it** (section 4's table): the page tools get one reader module, the
    adapter one per-frame helper, and the station list one home in the sim's layouts (M13g, new scope that the
    outage paid for). Why: the owner's clarification, and each copy here has already drifted once or been
    guarded by a test instead of being removed.

## Open questions

None. The two this plan raised are settled (11 November):

1. **The double-track "wing" greybox at `?proto=place&layer=wing&machineView=lay`.** Owner: "Yes, build the model".
   The wing's model step lands before M13e, so M13e does not wait for a look at the greybox; it checks `npm run
   inflight` for that step and follows it.
2. **Trains hidden with 8 actions pending** (`train-view.ts:385`). Trains stay visible; being built now on
   `hotbox/trains-visible`, not after M12e. X3 rebases over it.
