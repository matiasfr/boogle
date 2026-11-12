> **Status: plan for the owner's and the designer's review (11 November 2026).** Nothing here is built. Ring Island
> build 2 as a systems-first greybox, `WORLD_NS` v28. Its owner questions were answered on 12 November (UTC) ([below](#owner-questions)); steps
> R1 to R5 do not wait for them. **Designer's review, 11 November: cleared to build;
> [its rulings](#design-review-designer-2026-11-11) A to F are what gets built where a step below differs** (no footings
> in the bill, steel on the kit car, the works prompt shown blocked).

# Ring Island build 2: steel comes home and the first install

**Owner direction, binding here (11 November):** "I think these character details we should hold on for now and build
out more of the world. ... now we're proving out the mechanisms of the game, then we need to build out all the systems,
and then once we have the full graybox, we start filling in details. these character quirks and details can come a lot
later in the process." So every step below is a mechanism on blockout geometry. No quirks, barks, idles, bespoke props
or polish. Where the island needs people or words to function it uses the folk and boards already on main and
placeholder labels, each marked as one.

## 1. The player outcome and the loop it closes

1. After the rivet, the train brings a kit (logs, rails, footings) to the island halt; you carry it about 12 m into the
   steel works and it lights.
2. The works casts steel onto its rack; the train's loader takes it and carries it Home on the footing wagon's cradle.
3. The first steel lands as a visible stack in the Roundhouse bay, and the garage's Longer boiler tile changes from
   "Needs steel" to Install.
4. Anyone holds Install for about a second at the table; each line 2 train takes the boiler at its next Home stop and
   runs 25 m/s instead of 20.
5. That is the first full turn of "a big area unlocks a component that upgrades several systems": reach, produce, bring
   home, install, and the ride you already take gets shorter.

**Goal.** Close that loop end to end in the rules, with greybox views. It serves DESIGN.md's core loop ("grown towns
give upgrades that extend your reach, so each connection makes the next one easier"), **6. Communal world** (one install
for the room), **7. Telegraph everything** (a bill sign over the works, steel on the cradle, the stack in the bay) and
**9. Leave something for the next visitor** (the works joins the away credit). It bends nothing.

**Read for this.** AGENTS.md's rows; `npm run map -- --kind docs`; DESIGN.md;
[campaign-outline](campaign-outline.md) sections 3 to 5 (draft; build 2 is its step 2);
[ring-island-build1](ring-island-build1.md) (R1b, R3, Level findings 7 and 15 to 20, "Not in this plan");
[ring-island](../brainstorms/ring-island.md) (Shape, "Build 2 (v28)", suggestion 7, Parked);
[engine-garage](../brainstorms/engine-garage.md) (sections 4 to 6, Shape, "The install moment");
[rail-map](rail-map.md) (the loaders table; the long train at u 435.3 to 456.2);
[world-blockout](world-blockout.md) (ruling 3, the double-back table); the Current rules of
[core loop](../decisions-core-loop.md#current-rules) and [rail](../decisions-rail.md#current-rules);
sync, room-safety, mixed-builds, lockstep, registries; owner-calls. Code: `src/sim/railway-components.ts`,
`railway-systems.ts`, `railway-sys-works.ts`, `railway-sys-ring.ts`, `railway-sys-trains.ts`, `railway-queries.ts`,
`railway-check-ring.ts`, `railway-lines.ts`, `railway-train.ts`, `railway-works-layout.ts`, `railway-ring-layout.ts`,
`railway-seed-ring.ts`, `src/world/railway-jump.ts`, `railway-namespace.ts`, `src/entities/railway/garage-state.ts`
and `garage-data.ts`, `src/entities/ring-island/view.ts` (the works yard), `dev/economy/ring-data.ts`. Pattern
followed: the kiln (`kiln`, `worksTick`, `wagonArrives`) and build 1's `Aperture`.

**Research.** [roundhouse-trains](../research/roundhouse-trains.md) rec 3 ("require a real trip saved before selling
capacity or speed"): used, the boiler is offered on line 2 only, where the decided ten-second rule holds.
[carrying-and-logistics-play](../research/carrying-and-logistics-play.md) rec 2 ("building what ends hauling is the
reward"): used, steel itself is never carried by hand. [route-contract](../research/route-contract.md) (travel edges
never supply work edges): used, a swimmer who reaches the works early finds nothing to feed it.
[upgrade-economy](../research/upgrade-economy.md) rec 2 (each upgrade repays a visible inconvenience): used, the
install shortens the ride just taken. Departs from the ring-island brief's "steel's carry kind": none in build 2.

**Port from Place.** Nothing is ported. No fit check is needed.

## 2. Decided, default, new

| # | Call | Kind | Source |
| --- | --- | --- | --- |
| 1 | Steel comes home as the longer boiler first: line 2, 20 to 25 m/s. The bigger cradle is the second pick | Decided | [Ring Island, 10 November](../decisions-rail.md#d-2026-11-10-ring-island-the-meet-the-shard) |
| 2 | The steel works follows the live kiln's model: a bill brought by train, `lit`, a rack, cast ticks | Decided | Same entry |
| 3 | Install is a hold of about a second, no dialog; players away keep their camera, hear the whistle and see the part go on at Home; "Try it" stays for parts you can't install; the longer boiler is free | Decided | [the train upgrade screen, 10 November](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade) |
| 4 | The table's engine is a works copy; real trains take a fit at their next Home stop; fits are per line | Decided | [the train garage, 10 November](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy) |
| 5 | Upgrade steel waits as a visible stack in the Roundhouse bay | Decided | [yards at halts, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts) |
| 6 | A speed part is offered only where it saves about ten seconds a trip | Decided | [the rail map, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map) |
| 7 | Every building can be walked into: the steel works has a door and a room | Decided | [10 November](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into) |
| 8 | Ring Island is a buffered end; no track runs past u 483 | Decided | [Ring Island, open calls](../decisions-rail.md#d-2026-11-10-open-calls-answered-ring-island) |
| 9 | The bill is the model's stand-in for the works siding: 8 logs, 12 rails, 8 footings (`dev/economy/ring-data.ts`, `SID-R`). `WORKS.total` 32 to 40; the kiln's one fill casts them | Default | Bills are stand-ins tuned on the model |
| 10 | The kit unloads at the island halt into a yard; each item is carried once, 12 m, into the works (the grind budget: at most twice, under 60 m) | Default; question 2 | The kiln's model plus Q7's "kit by train" |
| 11 | Steel has no hand carry: the works rack loads the train, the train unloads to the bay | Default | Research above |
| 12 | Steel rides home on the footing wagon's cradle (6 a trip, shared with footings going out). No new car | Default; question 3 | The standard boiler pulls three cars and all three exist |
| 13 | The works casts 12 steel in all, one every 80 ticks, rack cap 6 (the kiln's numbers). The first one home unlocks the install; the install spends none | Default | "counted material starts with the second steel pick" |
| 14 | The install's facts are per line and per train: `Line.boiler` (the room's fit) and `Train.boiler` (what that train wears) | Default | Decided call 4, in data |
| 15 | From v28 every signal and block is sized for the longer engine (`TRAIN_EXTENT.aheadCm` 620 to 820), whichever boiler a train wears | Default | rail-map's long train; one extent keeps the block rule simple |
| 16 | "Pulls one more car" is a readout only in build 2: no fourth car exists to buy | Default | The cradle and cars are later picks |
| 17 | The works is an open shed over the existing drop hammer, one empty room, on the works yard build 1 drew | Default | Greybox; decided call 7 |
| 18 | Interact labels are placeholders: "Take logs", "Take rails", "Take a footing", "Feed the works", and the garage's existing "Install". Not The Boogler's | Default | Owner direction |
| 19 | The works joins the away credit as the kiln does, capped by its rack | Default | DESIGN 9; campaign-outline section 4 |
| 20 | The train through the ring | **New** | Question 1 |

**Brainstorm new gameplay first** ([owner call](../agents/owner-calls.md)). Calls 1 to 8 are decided behaviour and
9 to 19 reuse built mechanisms (the kiln, the wagon, the footing carry, the garage's hold): no `/brainstorm` is needed
for steps R1 to V3. **The train through the ring is undesigned gameplay**: where the spur starts with buffers at
u 483, where it ends with no summit halt, what the ride is for, and what it does to the horizon seen from Home. It
needs a designer pass or `/brainstorm` before any rule is written (question 1).

## 3. Design: op, state and save shape

**Sync kinds.** The railway is Server kind (sync.md): no `src/world/rules/` file, no `Rules` entry, no `edits`
generator, no `env` fact. The sim is in `src/sim/` and follows lockstep.md (integers, `+ - * /`, no trig).

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The steel works (yard, bill, `lit`, rack) | Server | server | new component `Steel`, systems in new `src/sim/railway-sys-steel.ts` |
| Steel aboard a train, steel in the bay | Server | server | `Train.steel`, `Shed.steel` |
| The install and each train's boiler | Server | server | `Line.boiler`, `Line.fitted`, `Train.boiler`; op `rail.install` |
| The garage screen, the hold's ring, the works copy, "Try it" | Local | each tab | `src/features/garage.ts`, `garage-view.ts` (as today) |
| The install moment, the whistle, the boiler swapping on a train | Local, from accepted state | each tab | adapter edges, snapped on restore |
| Yard stacks, bill sign, rack, loader, the shed | Local | each tab | new `src/entities/ring-steel/` |

**State (all appended; any schema change is the v28 bump).**

```ts
// railway-components.ts
export const SteelClock = defineComponent('steelClock', { lastCast: 'int' }, { replicate: false });
export const Steel = defineComponent('steel', {
  yardLogs: 'int', yardRails: 'int', yardFoot: 'int', // off the train, waiting at the island yard
  logs: 'int', rails: 'int', foot: 'int',             // fed into the bill
  lit: 'int', rack: 'int', poured: 'int',
}, { requires: [SteelClock], defaults: { lit: -1 } });
// Train gains  steel: 'int', boiler: 'u8'      Shed gains  steel: 'int'
// Line  gains  boiler: 'u8', fitted: 'int' (default -1)
// spawned last in createRailwayWorld: w.spawn([Steel, {}], [SteelClock, {}])
```

```ts
// railway-ring-layout.ts
export const STEEL = { logs: 8, rails: 12, foot: 8, castTicks: 80, rackCap: 6, total: 12 } as const;
export const RING_STEEL_YARD = { ...ringAt(44060, 640), y: 890, reach: 400 };  // u 440.6, lat +6.4
export const RING_STEEL_WORKS = { ...ringAt(45200, 900), y: 890, reach: 450 }; // u 452, lat +9: the hammer
// railway-train.ts
export const BOILER_SPEED = [200, 250] as const; // cm a tick, by Train.boiler
```

**Ops (Server-kind railway actions, all additive; `OPS` table in `railway-systems.ts`).**

| Op | System | Accepted when | Does |
| --- | --- | --- | --- |
| `rail.steelTake { kind: 0 \| 1 }` | `steelTake` | `joined`, the yard holds that kind, the back has room | Yard logs (0) or rails (1) onto the back, up to its room |
| `rail.footTake { rack: 3 }` | `steelFootTake`, appended after `ringFootTake` | `Steel.yardFoot > 0`, an empty back | One footing onto the back |
| `rail.steel` | `steelFeed` | `joined`, `lit < 0`, the back holds logs or rails the bill lacks | Logs and rails off the back into the bill (the kiln's shape); returns the count |
| `rail.footSet { site: 4 }` | `steelFootSet`, appended after `ringFootSet` | A footing on the back, `Steel.foot < STEEL.foot` | Into the bill |
| `rail.install { line: 1, part: 1, revision }` | `install` | `Shed.steel >= 1`, `revision === Line.boiler` (0), the table free (`Shed.ready < 0` or the wagon coupled) | `Line.boiler = 1`, `Line.fitted = tick`. Spends nothing |

Whichever of `steelFeed` and `steelFootSet` fills the bill sets `lit = lastCast = tick`. A second `rail.install`
carries a stale revision and returns 0 (two presses at once install once, as `rail.turn`).

**Ticks.** `steelTick` (after `worksTick` in `RAIL_TICK`): once lit, one steel to the rack every `castTicks` while
`rack < rackCap` and `poured < total`. In `railway-sys-trains.ts`:

- `standing`, at the Village (halt 0): after Q7 and the rivet, the steel kit loads as Q6's and Q7's does (logs from
  the depot's production, rails from the forge rack, up to `LINE2_KIT`); a train with `Train.boiler < Line.boiler` sets
  `Train.boiler = Line.boiler` there, standing, so no leg in flight changes speed.
- `arrive`, at Ring Island (halt 5): logs and rails aboard go to `yardLogs` and `yardRails`; the wagon's footings to
  `yardFoot`; then the wagon's train loads `min(Steel.rack, wagonCap - foot - steel)` steel.
- `arrive`, at the Village: `Train.steel` goes to `Shed.steel`.
- `wagonArrives` at the Quarry: `footOwed` gains `steelOwed` once the ring owes none.
- `serviceOf`: the island halt while kit, footings or (for the wagon's train) racked steel wait.
- `stopKin(line, to, track, boiler = 0)` returns `BOILER_SPEED[boiler]` as the speed; `trainAlong`, `trainSpeed`,
  `trainArrives`, `planLeg` and every braking distance pass the row's `boiler`. With `boiler === 0` every v27 leg is
  bit-identical (a test).

**Invariants** (new `src/sim/railway-check-steel.ts`, run by `railwayCheck`): bounds on every field; nothing in the
yard, the bill or the rack before `joined`; `lit >= 0` exactly when the bill is full; steel conserved,
`poured === rack + aboard(steel) + Shed.steel`; `Train.foot + Train.steel <= wagonCap` and steel only on the wagon's
train; `Train.boiler <= Line.boiler`, both 0 on line 1; `Line.boiler === 1` only with `Shed.steel >= 1` and
`fitted >= 0`. Footing conservation (`footingTotal`) gains `yardFoot + foot`; the log and rail counts gain the yard
and the bill.

**Server and prediction.** `railway-server.ts`: reach checks for `rail.steelTake` and rack 3 at `RING_STEEL_YARD`,
`rail.steel` and site 4 at `RING_STEEL_WORKS`, `rail.install` at `SHED_TABLE`; the three new ops join the allow-list;
malformed fields refused (`railInt(e.kind, 1)`, `e.line === 1`, `e.part === 1`, `railInt(e.revision, 1)`).
`railway-predict.ts`: the four island ops as racks and sites are today; `rail.install` as `rail.brace` is.

**Controls.** No new action, pad slot, key, touch control or guide row. The island's four prompts are
`registerInteractable` targets shown only when usable. Install is the garage's existing hold on Interact.

**Save, bump and shipping.**

- **v28**, one dated line in `src/world/namespace.ts`, no migration: the `Steel` and `SteelClock` components, two
  `Train` fields, two `Line` fields, one `Shed` field, `WORKS.total` 40, `TRAIN_EXTENT`, four ops.
- **It ships when R1 to R5 are reviewed, as one ship, and never while the owner is mid-session**: check play sessions
  in `npm run heartbeat` first and hold if he is playing (owner calls "Nothing waits on a world bump" and its one
  hold). The views (V1 to V3) follow with no bump. Between the two ships the kit rides out and steel rides home unseen
  off the train, which is harmless; a jump-in row puts him back at any beat in one click.
- **Mixed builds during the deploy.** Dev phase: no compatibility code. A room's id carries the namespace
  (`rail-v28-<name>`, `railway-namespace.ts`), so an open v27 tab stays in its v27 room until the update notice reloads
  it, and never sends a v28 op to a v28 world. A new client that reaches a server still on v27 asks for a `rail-v28-`
  room, which that server's `isRailwayRoom` does not accept as a railway room, so no v27-shaped save is written under
  a v28 name; the tab plays alone until the server is current. Every new op is refused cleanly by v27 rules (not in
  the allow-list).

## 4. Steps

Sizes: S under half a day, M about a day, L two. **HOTBOX** takes rules, server and tests (R steps); **the Mac** takes
views and looks (V steps) and can start V1 against the seeds as soon as R1 and R4 are on the rules branch. Each step
leaves `node dev/ship-check.ts` green; the full check, the bots and `test:net` are the two checkpoints'.

- [ ] **R1. The steel works' rules (M, HOTBOX).** Create `src/sim/railway-sys-steel.ts`, `railway-check-steel.ts`,
      `test/railway-steel.test.ts`. Edit `railway-components.ts` (`Steel`, `SteelClock`, the spawn),
      `railway-ring-layout.ts` (`STEEL`, the two points), `railway-works-layout.ts` (`total: 40`), `railway-rows.ts`
      and `railway-queries.ts` (`steelId`, `steelOwed`), `railway-systems.ts` (four `OPS` rows, `steelTick`),
      `railway-check.ts`, `railway-check-works.ts` (`footingTotal`), `test/railway-schema.test.ts`,
      `test/railway-census.test.ts`. Adds `rail.steelTake`, `rail.steel`, rack 3, site 4 and the cast tick.
      Checks: each op's refusals (before `joined`, a full bill, a full back, a lit works); the bill lights on the last
      item whichever op brings it; a seeded `mulberry32` op fuzz holding every invariant.
      **Independent sim review.**
      _As built (ring2/rules, 11 November), on ruling B:_ `Steel` is `yardLogs, yardRails, logs, rails, lit, rack,
      poured, outLogs, outRails` (no `yardFoot`, `foot`); `STEEL` is `{ logs: 8, rails: 12, castTicks: 80, rackCap: 6,
      total: 12 }` (no `foot`). No rack 3, site 4, `steelOwed`, `WORKS.total` change or `footingTotal` change. **Added
      beyond the step:** `outLogs`/`outRails` (what the Village has loaded for the works, the depot's `DEPOT_OUT` and
      `shelfOut` for it): the kit's logs are made at the Village, so `railCounts().produced` counts `outLogs`, and the
      yard is bounded by them; R2's line-2 checks (`depot stock`, `shelf bounds`) widen by them. `steelNeed(w)`
      (railway-queries.ts) is the kit's need per finding 2: the bill less fed, yard and aboard (backs and piles not
      counted, so a train brings what is lost). `steelTick` runs at tick order 5 and `jobClock` moves to 6. Points
      (level flags 1 and 2): the yard at u 445.5, lat +8 (the open deck between the tarp and the shed), the works at the
      shed's doorway, u 452, lat +6.5; yard to works 6.7 m, not 12 (V1's look may move them). `dev/level/ring.ts`
      asserts both: on the deck, clear of the tarp, anvil and hammer posts. Ruling E's blocked prompt is V1's (no sim
      part). Tests: `test/railway-steel.test.ts` (refusals, lighting on either kind, casts to the cap, the check's seven
      refusals, a two-seed fuzz that re-asserts the bill can be completed every 500 ops). **The pinned fixtures moved
      and were not regenerated** (a new component kind and entity change every world hash): `railway-golden.json`
      (every stage), `railway-tick-order.json`, `railway-ops-golden.json`, `railway-m12-trace.json` and
      `rail-schema.json` (which fails without the bump). The step order put the bump in R4; regenerating needs the
      owner's word and belongs with the v28 bump.
- [ ] **R2. The train carries it (M, HOTBOX).** Edit `railway-sys-trains.ts` (`standing`, `arrive`, `wagonArrives`,
      `serviceOf`, `headExempt` while the works owes footings), `railway-components.ts` (`Train.steel`, `Shed.steel`),
      `railway-queries-line2.ts` (the kit's need for the works), `test/railway-trains.test.ts`. Checks: a kit loaded
      at the Village reaches `yardLogs` and `yardRails`; eight footings arrive in two wagon loads; steel racked at the
      island reaches `Shed.steel`; footings out and steel home never exceed `wagonCap`; no train stops at the island
      with nothing to do. Also confirm the forge still has 12 rails to give after Q7 (`npm run loop -- run`); if not,
      the bill's rails drop to what it has and the number is logged. **Independent sim review.**
- [ ] **R3. The install and the boiler's speed (L, HOTBOX).** Create `test/railway-install.test.ts`. Edit
      `railway-components.ts` (`Line.boiler`, `Line.fitted`, `Train.boiler`), `railway-train.ts` (`BOILER_SPEED`,
      `stopKin`'s fourth argument and its callers), `railway-trains.ts` (the leg planner, `cycleTicks` and the balanced
      hold read each train's boiler), `railway-lines.ts` (`TRAIN_EXTENT.aheadCm` 820), `railway-sys-works.ts` or the
      new steel file (`install`), `railway-systems.ts` (one `OPS` row), `test/railway-lines.test.ts`,
      `test/railway-train.test.ts`. Adds `rail.install`. Checks: refused with no steel in the bay, on line 1, on a
      stale revision; two installs on one tick install once; a train takes the boiler only while standing at the
      Village; `boiler === 0` legs bit-identical to v27; **a mixed fleet** (one train at 25 m/s behind two at 20) run
      for 20,000 ticks under random lever asks keeps `sepCm`, the end blocks and the 105 s wait bound; the Pier and
      island stops still clear with the 820 extent. **Independent sim review, P1: the mixed fleet.**
- [ ] **R4. Server, prediction, seeds, the bump (M, HOTBOX).** Create `src/sim/railway-seed-steel.ts`,
      `server/test/railway-steel-host.test.ts`. Edit `src/world/railway-server.ts`, `railway-predict.ts`,
      `namespace.ts` (v28), `railway-jump.ts` (four rows, section 6), `src/sim/railway-seeds.ts`,
      `src/sim/railway-sys-away.ts` (the works' casts in the away credit, capped by the rack),
      `src/adapters/railway-intents.ts` (five intents), `test/railway-jump.test.ts`,
      `server/test/railway-away.test.ts` (one empty-room case). Checks: reach refusals from the wrong place; a
      malformed `rail.install` never throws; a prediction that the server refuses comes back as `onCorrected`;
      `npm run checkpoints -- steel-kit steel-lit steel-home boiler-long` builds all four from accepted ops only.
      No new shared file is imported by the server from outside `src/sim/` or `src/world/` (if one is, it joins
      `server/Dockerfile`, `dev/server-build.ts` and deploy-server.yml in the same step). **Independent review of the
      server hunk.**
- [ ] **R5. The loop graph and the bot (M, HOTBOX).** Edit `dev/loop/graph.ts` (nodes `steelkit`, `steelworks`,
      `steelhome`, `install`, each with its bill, supply, cue and `requires: rivet`), `dev/look/bots/railway-ring.ts`
      or a new `railway-steel.ts`, `dev/look/evals/railway-steel-bot.ts`. Checks: `npm run loop -- node <id>` for the
      four and `npm run loop -- run` for one to four players (the route's rules changed); the bot segment below.
- [ ] **Checkpoint A (rules).** Proofs, and only these: `npm run check`; `npm run loop -- run`; **the bot from
      `--rail-seed ring-joined` to the `boiler-long` state**, logging minutes per beat; `test:net`'s reconnect pair
      once with a carrier leaving mid-carry. Then ship v28 under the mid-session hold.
- [ ] **V1. The works on the island (M, Mac).** Create `src/entities/ring-steel/{index,view}.ts`. Greybox boxes only:
      yard stacks drawn from `yardLogs`, `yardRails`, `yardFoot`; a bill sign over the works (the frame sign's
      have/need per material, `stock-sign.ts`'s pattern); the rack's steel blocks; a box jib for the loader between
      u 436.9 and 444.3; an open shed over the hammer with a doorway and a collider; the four interactables. Build 1's
      tarp stack stays as it is. Effects only from accepted edges. Proof: one look,
      `npm run look -- --rail-seed steel-kit` at the yard, phone and desktop width. **Visual review** per
      `npm run models`.
- [ ] **V2. Steel and the boiler on the train (S, Mac).** Edit `src/entities/railway/train-view.ts`, `cars.ts`,
      `engine-kit.ts`. Steel blocks on the cradle from `Train.steel`; the built, unwired `engine_*_long` meshes when
      `Train.boiler === 1`; `cars.ts`'s extent test follows `TRAIN_EXTENT`. No whistle variation, no smoke change.
      Proof: covered by V3's look.
- [ ] **V3. The bay and the real Install (M, Mac).** Edit `roundhouse-view.ts` (a box stack in the bay from
      `Shed.steel`; its position is set here and level-checked here), `garage-state.ts` (`roomFacts` gains
      `steelHome` and `longFitted`; the header's "nothing is sent" comment goes), `garage-data.ts` (the tile's
      standing from the facts; `BOILERS.long.speed` from `BOILER_SPEED`), `src/features/garage.ts` and
      `garage-view.ts` (the completed hold sends `rail.install`; the existing moment plays on the press from the
      prediction and the part lowers back on `onCorrected`; a tab not at the table plays the whistle and nothing
      else), `docs/game-design/` (the owning section). No dialog, no new moment. Proof: one look, two players,
      `--rail-seed steel-home`: one holds Install, both pages show the next line 2 train at the Village wearing the
      long boiler. **Visual review.**
- [ ] **Checkpoint B (views).** `npm run check`; `npm run perf` at the island halt and the Roundhouse, before and
      after, reported; the two looks above; one device run (`npm run device`) or the line "not tested on a device".
- [ ] **T. The train through the ring: a layout and a still, no rules (S, Mac; waits for question 1).** A planned
      spur in `dev/level/ring.ts`'s report (start, grade, length, the saddle's height) and one still of the lowered
      saddle from Home behind a flag. Nothing in `src/sim/`. It becomes its own plan if he asks for the ride now.

## 5. Level findings

`npm run level-check` on this branch's base (main at 7d51689d0): 12 reports, "ring (planned): ok", "place: ok",
"track continuity: ok (23 tracks, 10 joins)"; its final stage then stopped on a missing `rapier.js` in this worktree's
`node_modules`, an environment fault, not a finding. **The tool reads the built layout and cannot take planned
positions** (build 1 found the same), so the rows below are arithmetic on build 1's built geometry
(`src/entities/ring-island/view.ts`, `RING_HALT`), not tool output. R1 adds both points to `dev/level/ring.ts` so the
report asserts them.

| # | Planned | Found | Proposed |
| --- | --- | --- | --- |
| 1 | The yard point, u 440.6, lat +6.4, on the works yard's deck (8.9 m, level with the east platform) | The deck runs lat 5.3 to 16 from u 430 to 468. The tarp stack stands at lat 7.1 to 13.9, u 430.6 to 443.4, so the point is in a **1.8 m aisle** between the platform's edge and the stack. Rail-map's loader span (u 436.9 to 444.3) covers it | Accept for the greybox; V1 may shift the kit's stacks north of the tarp (u 444 to 448) if three players crowd it. One number |
| 2 | The works point, u 452, lat +9 | The anvil's collider is lat 9.8 to 12.2, u 450.8 to 453.2: the point is 0.8 m off its face, on open deck. Yard to works is 11.7 m, level, no track crossed | None |
| 3 | **Reached before the ability that should gate it** | Build 1's finding 7 stands: a swimmer walks up the shore onto the halt and this deck at any time. Both points are reachable before the rivet, with no glider, hook or breaker | **For the designer to rule.** Proposed: accept. Every op needs `joined`, the yard is empty until a train unloads, and the views draw no prompt before then. Nothing is taken or learned early |
| 4 | The shed over the hammer | Its walls must leave the works wall's mural (u 456 to 467.5, lat 15.2) and the plank route from the platform clear | V1 keeps the shed inside u 448 to 455, lat 6.5 to 14, door facing the platform |
| 5 | The long engine at each stop | Build 1's rows 17 and 18 already size the island for the 820 extent (18.3 m clear of the crossover). The Pier stop's comment gives 1.2 m clear of the parked track layer "with an engine half as long again" | R3's test asserts both |
| 6 | The steel stack in the Roundhouse bay | **Position deferred to V3**, which runs the level check on it before its look (it must not block the table, the stall road or the garage post) | V3 |

## 6. Jump-in seeds and rows

New `src/sim/railway-seed-steel.ts`, each stage built on the one before from accepted ops only, starting at
`ring-joined`; stage names stay under 15 characters so the room name keeps them whole.

| Stage | Row label (placeholder UI text) | Line under it | Lands | The beat he plays |
| --- | --- | --- | --- | --- |
| `steel-kit` | Steel kit landed | The kit is in the island yard; the works is cold | The island halt's east platform, facing the works | Carry the bill in, light the works |
| `steel-lit` | Steel works lit | The works is casting; steel is on its rack | The same | Watch the loader, ride home with the steel |
| `steel-home` | Steel at Home | The first steel is in the Roundhouse bay | At the table (`SHED_TABLE`), facing the garage post | Hold Install |
| `boiler-long` | Longer boiler | Line 2's trains wear the longer boiler | The Village platform | Ride to the island at 25 m/s |

Until V1 to V3 ship, `steel-kit` and `steel-lit` land on a deck with no works drawn; the rows are added in R4 and are
true to the rules from then.

## 7. Not in build 2, and where it is parked

| Left out | Parked in |
| --- | --- |
| The island folk's lines about steel, barks, idles, the rota's extra looker, hard hats for visitors, the rivet toss | [ring-island](../brainstorms/ring-island.md#parked) and its Copy drafts; the owner's direction of 11 November |
| The shard's one reaction, the prophecy mural's payoff, bells for trains | The same brief, suggestion 7 and Parked |
| The install moment's polish beyond what the garage's first build already plays; a shared-moment card for players away; a late joiner's card | [engine-garage](../brainstorms/engine-garage.md), "The install moment" |
| The bigger cradle, a fourth car, the consist strip, gantry loaders, source upgrades bought with Boogles | engine-garage section 6; [campaign-outline](campaign-outline.md) section 4 |
| Counted steel prices, the wallet, town growth from cargo | Production-core slice 5; campaign-outline section 4 |
| The station house's production build, the organic landform, the branch platforms | [terrain-pass](terrain-pass.md); junction-stations |
| Steel art: the works building, the furnace, the long boiler's dressing, sounds beyond the existing hammer and whistle | The detail pass after the full greybox |
| The train through the ring as rules | Question 1; step T is a layout and a still only |
| Build 1's leftovers (R5b, R6, the queued trains fix and two prompts) | [ring-island-build1](ring-island-build1.md); not re-planned here |

## 8. Risks

- **The mixed fleet (the risky new sim code).** For up to one round trip a 25 m/s train shares a track with 20 m/s
  trains, and the block rule, the headway hold and the balanced hold were all written for one speed. R3's long fuzz
  is the proof; if it fails, the fallback is one line (a train takes the boiler only when every line 2 train stands
  behind it in the cycle), logged in agent-calls. This is the independent reviewer's P1.
- **A moved signal.** The 820 extent moves every end signal 2 m. Build 1 sized the island for it; R3 re-asserts the
  Pier, Far Head and the Railhead at every `head`.
- **Room safety ("Don't").** No effect in a system: the whistle, the swap and the works' glow play from accepted
  edges, never on restore. A queued action is not success: logs, rails and a footing leave the back on prediction and
  return on `onCorrected`; the install moment can be undone the same way. No `Math.random`, wall clock or per-peer
  counter in the new systems. Verified-save guards untouched.
- **Hotspot files.** `railway-sys-trains.ts` (R2 and R3 both edit it: R3 starts after R2 is on the branch),
  `railway-components.ts`, `railway-jump.ts`, `dev/loop/graph.ts`, and on the Mac `train-view.ts`. `npm run inflight`
  (11 November): three unmerged docs-only branches, none touching these files.
- **Build 1 is not closed.** R5b (the bot over the gap) and R6 are open; R5 here extends that bot. If R5b is still
  open when R5 starts, R5 seeds from `ring-joined` and does not wait.
- **The forge's rails.** The bill asks 12 rails after the route's last laying job; R2 checks they exist.
- **Two ships, one bump.** Rules first means a day where the steel loop runs unseen. Accepted for speed; a rule change
  found by the views takes another bump, which is free outside his sessions.
- **Performance.** A few dozen boxes, one shed collider, no new lights, one cast tick: `npm run perf` at Checkpoint B
  reports the cost; it does not gate.
- **Pacing.** The bot's lower bound for the loop is about 5 to 8 minutes (two wagon trips, about a dozen carries of 12 m, 12
  casts at 8 s, one ride home). The model allows Ring Island 36 minutes with build 1's 8. Build 2 does not fill that,
  and by campaign-outline's decision 2 it should not try to with a bigger bill.

## Open questions

1. **When does the train go through the ring?**
   - **At the White Wall lap, as the late double-back; build 2 ships only a layout and a still for you to rule on
     (recommended).** The line ends at buffers at u 483 by your ruling, there is no summit halt, and
     [world-blockout](world-blockout.md)'s table already dates "the train threads the ring" at about 5.8 hours.
   - In build 2, as a 750 m spur at 4% from the island halt to a lowered saddle. A new laying job, a horizon change
     seen from Home, and a ride with no stop at its end: it needs a brainstorm first.
   - Never as track: the ring is threaded by the glider or on foot at the aperture lookout.
2. **Is the steel works fed by hand from a yard, or straight from the train?**
   - **By hand from a yard at the halt: about a dozen short carries of about 12 m (eight of them footings), then it lights (recommended).** It is the
     kiln's beat on a new island and gives one or two players something to do while the wagon makes its second trip.
   - Straight from the train by its loader, no carry: you ride out, watch it light and ride home. Fewer ops, but the
     island has no verb after the rivet.
3. **How does steel ride home?**
   - **On the footing wagon's empty cradle, six a trip (recommended).** No new car; it works with today's boiler.
   - On a free steel car at the unlock, as "a new resource's first car is free". Today's boiler pulls three cars and
     has three, so the car could only join after the install it is meant to feed, or the cap rises to four now.
   - On the kit car's deck with the logs and rails. No cradle sharing; the kit car carries a third kind.

**Contradictions found while planning** (for the orchestrator; none edited here):

1. Campaign-outline section 5 puts "the train through the ring" in build 2; its own area 8 row and cut 4, and
   world-blockout's double-back table, put it at the White Wall lap.
2. The Ring Island decision entry says build 1 is v26 and build 2 v27; they are v27 and v28.
3. "A new resource's first car is free" against a boiler that pulls three cars, all taken (question 3).
4. The ring-island brief lists "steel's carry kind" and a `rail.fit` step, and engine-garage's co-op section a
   "Fit it for everyone?" confirm; the decided verb is Install with no dialog, and this plan carries no steel by hand.
5. `dev/economy/ring-data.ts` still prices the steel boiler at 8 steel and 4 footings and has "first steel, by hand"
   for the brace; the boiler is decided free and the Meet uses footings.
6. "Upgrade steel ... spent by an install" (yards at halts) against the free first install: the stack is shown and
   not spent in build 2.
7. `garage-state.ts` and `garage-data.ts` say nothing there is sent or read by the simulation; V3 makes that false and
   rewrites both headers.

## Design review (designer, 2026-11-11)

**Verdict: cleared to build, on the rulings below.** Steps R1 to R5 and V1 to V3 keep their shape; rulings A to F
change what three of them build, and where a step and a ruling differ the ruling is what gets built. Nothing here waits
for the owner: two questions are his, and the build proceeds on the recommendation for each.

Read for this: DESIGN.md; owner-calls (the 11 November
[greybox order](../agents/owner-calls.md#mechanisms-systems-greybox-details), "Pick and log", "Brainstorm new gameplay
first", "Wary of: material grinds"); the Current rules of core loop and rail and the entries the table cites; the
newest playtests (9 and 10 November); `npm run loop` and `loop -- node bents`; build 1's review (finding 5);
`src/entities/ring-island/view.ts` (the works yard), `railway-works-layout.ts`, `railway-train.ts`,
`garage-data.ts`. Research: the plan's four citations hold; one more applies,
[upgrade-economy](../research/upgrade-economy.md) rec 2 ("repay a visible inconvenience"), against the size of the
payoff (finding 3).

**Not seen.** No stills. `npm run look` cannot start in this worktree (no install: `express` is not found) and the
main checkout is out of step with its lock (`@fontsource/figtree`, `@fontsource/lilita-one`), so the look tool refuses
there too; `level-check` stops on the missing `rapier.js`, as the planner found. These are tooling leftovers for the
orchestrator. Every placement below is arithmetic on the built geometry and is re-checked by V1's and V3's looks.

### Detail audit (the 11 November direction)

The plan carries no quirks, barks, idles or bespoke props, and section 7 parks the right things. Two strikes:

- Section 8's "the works' glow" is not built. A lit works reads from its sign and the steel on its rack.
- V3 plays the garage's existing moment as it is on main and adds nothing to it.

Step T (a layout and one still) is level blockout, not detail. It stays last and never gates v28.

### Calls

| # | Call | Kind | Source or ruling |
| --- | --- | --- | --- |
| 1–8 | As the plan's table | Decided | As cited there. Checked against each entry's words; none is contradicted |
| 21 | The kit lies in a yard at the island halt and is taken where it lies | Decided | [yards at halts](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts): "a yard at each halt: take it where it lies; trains later carry it" |
| 22 | Line 2 keeps three trains and the 105 s worst wait | Decided | [three trains](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now); R3's mixed-fleet test holds it |
| 9 | The bill | Default, amended | Ruling B: 8 logs and 12 rails, no footings. `WORKS.total` stays 32 |
| 10 | Fed by hand from the yard, each item once, about 12 m | Default | Ruling A. Proceeds |
| 11 | Steel is never carried by hand | Default | Agreed |
| 12 | How steel rides home | Default, changed | Ruling C: the kit car's empty deck on any line 2 train, 6 a trip. Not the cradle |
| 13 | 12 steel, one every 80 ticks, rack cap 6; the first one home unlocks; the install spends none | Default | Agreed; the stack is shown and not spent, which is what "free" means |
| 14, 15 | `Line.boiler` and `Train.boiler`; every block sized for the longer engine from v28 | Default | Agreed |
| 16 | "Pulls one more car" is a readout only | Default | Proceeds for build 2. It bends the open 10 November call "pulls 4 never ships with an empty place"; owner question 2 |
| 17 | An open shed over the hammer, one empty room | Default | Agreed; level flags 1 to 3 |
| 18 | Placeholder labels | Default | Agreed, with ruling E |
| 19 | The works joins the away credit, capped by its rack | Default | Agreed |
| 23 | Four jump-in rows and their placeholder labels | Default | Agreed |
| 24 | A swimmer reaches the yard and works before the rivet | Default | Accepted (the plan's level finding 3). Every op needs `joined`, the yard is empty and no prompt shows. A travel edge that supplies no work, as [route-contract](../research/route-contract.md) asks |
| 25 | "Feed the works" shows blocked, with its reason, to an empty or wrong back | Default | Ruling E |
| 26 | Pacing targets and what the bot logs | Default | Ruling F |
| 27 | Where the yard and the works point stand | Default | Level flags 1 and 2; set at V1's look |
| 20 | The train through the ring | **New** | Ruling D; owner question 1 |
| 28 | No footings in the steel bill | **New** | Ruling B |
| 29 | Steel's free first car arrives as the longer boiler's fourth car, in the step after build 2 | **New** | Owner question 2 |

Ten decided, sixteen default, three new.

### Rulings

**A. Hand-fed from a yard: proceed (Default, not the owner's).** A decided rule covers the yard (call 21), the carry is
12 m on one level deck with no track crossed, and it is build 1's rack-to-jib pattern (15 m). In the loop graph's
measure it is three to five carries of 12 m, under every hauling beat on the route. It is not "the longest grind"
(9 November: rails hauled on foot to the pier station) nor the footing carries of 10 November (100 m and more, one at a time).

**B. No footings in the steel bill (New; the build proceeds on it).** The plan's bill makes the works wait on two
different trains, and footings ride only the wagon's. That repeats build 1's worst leg, three times over:

- Build 1 measured about 70 s idle between wagon loads (finding 5) and R5b 199 s idle at the rack over 14 footings.
  Its logged remedy was already due at 60 s.
- Here, 8 footings at `wagonCap` 6 are two loads. The second load brings two footings (20 s of work) after a full lap
  of one particular train, about 2.5 to 3.5 minutes on the longer line (arithmetic from the 65 s run and the 105 s
  worst wait; not measured).
- The works lights after that train has left, so the first steel waits another lap for the same train.
- Footings are also the one-at-a-time carry the owner called "the most pain" (10 November).

So: the bill is 8 logs and 12 rails, which any line 2 train brings in one trip. `STEEL.foot`, `yardFoot`, rack 3,
site 4, `steelOwed` and the `WORKS.total` change are not built. R1 and R2 lose those parts and gain nothing. If the
owner wants cement in steel, it returns as 6 footings (one wagon load, `STEEL.foot <= WORKS.wagonCap` asserted), never
8.

**C. Steel rides home on the kit car's deck, on any line 2 train (Default; changes the planner's pick).** On the
cradle, steel leaves only on one train in three, and a player rides home with their steel one time in three. On the
kit car the next train takes it (55 s on average, 105 s at worst), and the player rides home on the train carrying it,
which is the beat's picture. The kit car runs home empty today. `Train.foot + Train.steel <= wagonCap` and "steel only
on the wagon's train" leave the invariants; `Train.steel <= 6` replaces them. It is a stand-in until steel has its own
car (question 2).

**D. The train through the ring is not in build 2 (New; the build proceeds on it).** The line ends at buffers at
u 483 by the owner's answer, the rail map ruled out the climb to Ring top, and there is no summit halt. The ride is
undesigned gameplay: it needs `/brainstorm` before any rule, as the plan says. The "build 2 threads the ring" clause is
the orchestrator's 10 November call, not an owner pick, and its own words are "a still first", which step T provides.
The date of the ride is the owner's (question 1).

**E. Prompts follow the kiln's fix (Default).** The plan shows the island's prompts "only when usable". That is the hole
the owner hit at the kiln ("Fill the kiln never showed", 10 November) and the boiler (9 November), and the logged fix
is to show the prompt blocked with its reason. "Feed the works" shows to an empty or wrong back, blocked with "Bring
logs or rails" (placeholder). The bill sign stands from `joined`, reading 0 of 8 and 0 of 12, so the empty yard has
something to read while the first train comes.

**F. Pacing (Default).** Targets for the beat, rivet to riding a 25 m/s train: **solo 6 to 9 minutes, two players 5 to 8.**
The waits are trains, so a second player saves little; the natural split is one feeding the works and one at Home by
the table. No wait outside a ride runs over 60 s with nothing to do (build 1's logged bound).

- What the plan's numbers implied: about 10 to 13 minutes solo, under 2 of them hands-on, with three waits of 2 to 3
  minutes in a row; the same for two players. Its own "5 to 8 minutes" counted the casts and carries, not the laps.
- With rulings B and C: the kit train (1 to 3 minutes after the rivet), three to five carries (under a minute), the next train
  (105 s at worst), a 65 s ride, the hold, and the next train at the Village.
- Checkpoint A's bot logs idle seconds per wait beside minutes per beat. If rivet to the first kit in the yard runs
  over 90 s, the kit loads at the Village from the leaf going down, not from the rivet (a logged remedy, not built
  first).
- Ring Island then plays at roughly 20 to 27 minutes against the model's 36. That is campaign-outline's open decision 2
  (measure in phase B; never a bigger bill), not a reason to restore the footings.

### Findings

1. **"Feed the works" hidden from an empty back (change before building).** Ruling E.
2. **Nothing may be lost from the bill (flow rule 3; check in R1 and R2).** Logs and rails taken from the yard are
   ordinary back cargo: a player can spend them elsewhere, drop them or leave. The kit's need must be the bill less
   what is fed, in the yard and aboard, so a train brings the shortfall. R1's fuzz asserts the bill can always be
   completed; `test:net`'s leaver case asserts the same.
3. **The loop closes in the rules; the felt change is small.** `trainLegTicks` gives Village to island 65.3 s at 20 m/s
   and 54.8 s at 25: 10.5 s saved non-stop, 9.1 s with a stop at the Pier. The decided ten-second rule holds by half a
   second (R3 asserts it on the real stops). What a player notices on the next ride is the longer engine on all three
   trains and the works copy, not the time; the train still has three cars. The step that makes it felt is the fourth
   car (question 2). Build 2 is right to ship without it.
4. **First sight is good on paper.** Every train stands at the east platform; the yard is on the same deck; the hammer's
   6.5 m gantry is the landmark 12 m along it, with the mural wall behind. The key is in sight of the lock, and the
   beat ends at the platform the train home leaves from. The rivet is 189 m (34 s) from the halt, and the Meet's shot
   ends at the halt.
5. **The install's cue is unproved.** The tile has read "Needs steel" with a ghost to try since the garage's first
   build, so the payoff is telegraphed at the table. Nothing yet tells a player on the island, or one stepping off at
   the Village, that the table is where steel goes. R5 gives the `install` node a cue; V3's look shows whether the bay
   stack is seen from the Village platform and whether the platform is seen from the table.
6. **`dev/economy/ring-data.ts` is stale** (a boiler priced at 8 steel and 4 footings; "first steel, by hand"). R5
   corrects it with the loop graph, or the model's minutes are wrong.

### The stretch as legs

| Leg | From, to | Distance | Time |
| --- | --- | --- | --- |
| 1 | The rivet to the island halt's east platform | 189 m along the deck | 34 s walk; the shot ends there |
| 2 | Wait for the kit train | | 1 to 3 min (the first train over the bridge) |
| 3 | Yard to works, three to five round trips | 12 m each way | 15 to 25 s walking |
| 4 | Lit to steel aboard | The same platform | 8 s cast, then the next train: 105 s at worst |
| 5 | Island to the Village | 1190 m | 65 s |
| 6 | Village platform to the table | Not measured here | V3 |
| 7 | Hold Install; the next train takes the boiler standing at the Village | | 1 s, then 105 s at worst |

Flow rules: the next goal can be found at legs 1 to 5 and is unproved at 6 (finding 5); no gate loses its meaning
(call 24); nobody is stranded once finding 2 holds. Co-op: a friend who arrives late finds the works lit or the boiler
on, with nothing to redo; the install is the room's.

### Level flags for the layout step

1. **The works point (u 452, lat +9) is inside the hammer's west post**, not on open deck: the gantry's posts stand at
   lat 9.1 and 12.9, half a metre square (`view.ts`, the hammer block). Move it clear, to the shed's doorway.
2. **The yard point is in a 1.8 m aisle** between the platform edge and the tarp. Drawn stacks would fill it. Prefer
   the open deck between the tarp's end (u 443.4) and the anvil (u 450.8); V1 confirms the loader's span reaches.
3. **The shed** must clear a 6.5 m gantry and leaves 1.2 m between its door wall and the platform edge. V1's look.
4. **The bay stack** and both Home sightlines (finding 5): V3.
5. **The Pier's 1.2 m clearance** with the 820 extent: R3's test.
6. Reach is unproved by any tool for every planned point. R1 adds them to `dev/level/ring.ts`; `npm run loop -- run`
   at R5 proves order and softlocks.

### The planner's contradictions

1. Threading: ruling D. The orchestrator reconciles campaign-outline section 5 and the 10 November entry's build 2
   clause once question 1 is answered.
2. The version numbers (v27, v28): clerical, the orchestrator's.
3. "First car free" against three cars: question 2.
4. `rail.fit`, "Fit it for everyone?" and "steel's carry kind" are superseded by the decided Install and by call 11.
   The plan is right; the briefs get a note, not this plan.
5. `ring-data.ts`: finding 6.
6. The stack shown and not spent: consistent with "free".
7. The garage headers: V3's, as planned.

### Suspect lines

None are The Boogler's. The garage tile's "It runs faster and pulls one more car." (on main) promises a car build 2
cannot couple; left as it is, for the owner with question 2.

### Owner questions

1. **When does the train go through the ring?** Recommended: at the White Wall lap, as the late double-back; build 2
   ships a layout and one still. The alternative is a 750 m spur now, after a brainstorm.
   **Answered (owner, 12 November UTC): the train goes through the ring later, at the White Wall lap (recommended).**
   Recorded in the [decisions](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered).
2. **When does steel's free first car arrive?** "A new resource's first car is free at its unlock" meets an engine that
   pulls three cars, all taken. Recommended: it arrives with the install, as the longer boiler's fourth car, in the
   step straight after build 2 (it changes train length and every platform check). Until then steel rides the kit car
   and the tile's "one more car" is a cap with nothing to couple.
   **Answered (owner, 12 November UTC): steel's free first car arrives with the install, as the longer boiler's fourth
   car (recommended).** Recorded in the [decisions](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered).
3. **Should the steel works take cement?** Recommended: no, logs and rails only (ruling B). If yes, 6 footings in one
   wagon load.
   **Answered (owner, 12 November UTC): the steel works takes logs and rails only, no cement (recommended).** Recorded
   in the [decisions](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered).
