> **Status: plan for the owner's and the designer's review (11 November 2026).** Nothing here is built. Ring Island
> build 2 as a systems-first greybox, `WORLD_NS` v31 (main took v28 for slice 5; v29 is the Quarry stone stop's and v30 is the riders step's). Its owner questions were answered on 12 November (UTC) ([below](#owner-questions)); steps
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

**State (all appended; any schema change is the v31 bump).**

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

- **v31**, one dated line in `src/world/namespace.ts`, no migration, made in R4 as a bump-only commit (as built: R1 to R3 were
  built on main's v28, whose slice 5 bump came first, and v29 is the stone stop's and v30 the riders step's; it still ships only with R5): the `Steel` and `SteelClock` components, two
  `Train` fields, two `Line` fields, one `Shed` field, `WORKS.total` 40, `TRAIN_EXTENT`, four ops.
- **It ships when R1 to R5 are reviewed, as one ship, and never while the owner is mid-session**: check play sessions
  in `npm run heartbeat` first and hold if he is playing (owner calls "Nothing waits on a world bump" and its one
  hold). The views (V1 to V3) follow with no bump. Between the two ships the kit rides out and steel rides home unseen
  off the train, which is harmless; a jump-in row puts him back at any beat in one click.
- **Mixed builds during the deploy.** Dev phase: no compatibility code. A room's id carries the namespace
  (`rail-v31-<name>`, `railway-namespace.ts`), so an open v28 or v29 tab stays in its own room until the update notice
  reloads it, and never sends a v31 op to an older world. A new client that reaches an older server asks for a `rail-v31-`
  room, which that server's `isRailwayRoom` does not accept as a railway room, so no v27-shaped save is written under
  a v31 name; the tab plays alone until the server is current. Every new op is refused cleanly by older rules (not in
  the allow-list).

## 4. Steps

Sizes: S under half a day, M about a day, L two. **HOTBOX** takes rules, server and tests (R steps); **the Mac** takes
views and looks (V steps) and can start V1 against the seeds as soon as R1 and R4 are on the rules branch. Each step
leaves `node dev/ship-check.ts` green; the full check, the bots and `test:net` are the two checkpoints'.

- [x] **R1. The steel works' rules (M, HOTBOX).** Create `src/sim/railway-sys-steel.ts`, `railway-check-steel.ts`,
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
      part). Tests: `test/railway-steel.test.ts` (refusals, lighting on either kind, the first cast, the check's
      refusals, a two-seed fuzz that re-asserts the bill can be completed every 500 ops). **The v28 bump moved here
      from R4** (orchestrator's ruling, 11 November): R1 is the first save-shape change (a new component kind and
      entity change every world hash), and the fixture rule (test/helpers/railway-golden.ts) regenerates only with a
      bump, so no step from R1 to R3 could pass its checks with the bump at R4. The branch still ships once, after R5,
      outside his sessions. Proof that R1 changed no existing behaviour: with `Steel`, `SteelClock`, `steelTick` and the
      steel counts taken out again in a scratch edit (jobClock left at order 6, the new op rows left in), all 148
      pinned tests (goldens, tick order, ops stream, M12 trace, schema) pass on the old fixtures. The tick-order move is
      inert: `steelTick` writes only `Steel` and `SteelClock`, which `jobClock` never reads, and does nothing before the
      works is lit. The fixtures are then regenerated in a commit of their own.
- [x] **R2. The train carries it (M, HOTBOX).** Edit `railway-sys-trains.ts` (`standing`, `arrive`, `wagonArrives`,
      `serviceOf`, `headExempt` while the works owes footings), `railway-components.ts` (`Train.steel`, `Shed.steel`),
      `railway-queries-line2.ts` (the kit's need for the works), `test/railway-trains.test.ts`. Checks: a kit loaded
      at the Village reaches `yardLogs` and `yardRails`; eight footings arrive in two wagon loads; steel racked at the
      island reaches `Shed.steel`; footings out and steel home never exceed `wagonCap`; no train stops at the island
      with nothing to do. Also confirm the forge still has 12 rails to give after Q7 (`npm run loop -- run`); if not,
      the bill's rails drop to what it has and the number is logged. **Independent sim review.**
      _As built (ring2/rules, 11 November), on rulings B and C:_ `Train.steel` and `Shed.steel` (appended; inside v28).
      The trains' side lives in `railway-sys-steel.ts` (`steelLoads`, `steelArrives`, `steelService`), called from
      `standing`, `arrive` and `serviceOf`; `trainTick` now declares `Steel` and `Shed` as writes. After the rivet any
      line 2 train standing at the Village loads `steelNeed` onto its kit car (logs made, `outLogs`; rails off the forge
      rack, `outRails`); at Ring Island (halt 5) the kit goes into the yard, capped at what the bill lacks (any more
      rides on), and the kit car takes up to `STEEL.trip` (6) off the rack; at the Village its steel goes into the bay.
      **Not built (ruling B):** footings to the works, `wagonArrives` and `headExempt` changes; the "eight footings in two
      loads" and `wagonCap` checks. **Not the cradle (ruling C):** steel rides any train's kit car; the check holds
      `Train.steel <= STEEL.trip`, line 2 only, and `poured === rack + aboard + Shed.steel`. `depot stock` and `shelf
      bounds` widen by `outLogs` and `outRails`. **Dropped from R1's check:** "the yard holds no more than was sent":
      a stretch kit's leftover logs (a frame filled from backs while its kit rode) would land in the yard and fail a
      room's load; the yard's bounds (the bill) still hold. "No train stops at the island with nothing to do": Ring
      Island is the line's end, where every train stands, so there is no extra stop to forbid; `steelService` asks for it
      only with an errand. Measured (test): the kit is in the yard 65 s after the rivet, all of it on one train (the
      forge rack holds 24, so 12 rails are there); the first steel is home 109 s after lighting; all 12 reach the bay.
      A load lost from the yard (taken and dropped) comes again on the next train. The ring-joined stage now holds
      that kit aboard (the first train after the rivet loads it): `test/railway-m11-review.test.ts`'s two ring-joined
      literal rows move from 3986 logs and 161 rails to 3994 and 169 (173 after three days' credit); fixtures
      regenerated in their own commit.
      _Independent review (11 November), fixed:_ **P2-1**, kit stranded aboard for good when the bill is fed from backs
      while it rides: kit the bill can no longer use now goes home at the train's next Village arrival (logs onto the
      depot, rails back onto the forge rack, both conserved), and `steelService` asks for Ring Island only with kit the
      bill lacks and for the Village with kit it can't use (the reviewer's `test/railway-steel-review.test.ts` passes).
      **P3-1**, `serviceOf` hands `steelService` its own row. **P3-2**, a `railway-bad-worlds.ts` entry per
      `checkSteel` throw (a `ring-joined` stage joins the corpus), and `railway-check-steel.ts` joins the message
      census. The dropped "yard <= sent" returns in the reviewer's weaker, proved form as `steel sent logs` and
      `steel sent rails` (depot, cart, aboard and yard within `depotProduced + outLogs`, and the shelf's rails within
      `shelfOut + outRails`), in the load check every fuzz op runs. No pinned fixture moved: no seed stage feeds a
      bill from backs. **P3-3**, noted: the rules commit precedes the bump commit on this branch; that order stands
      because the branch ships as one, after R5.
- [x] **R3. The install and the boiler's speed (L, HOTBOX).** Create `test/railway-install.test.ts`. Edit
      `railway-components.ts` (`Line.boiler`, `Line.fitted`, `Train.boiler`), `railway-train.ts` (`BOILER_SPEED`,
      `stopKin`'s fourth argument and its callers), `railway-trains.ts` (the leg planner, `cycleTicks` and the balanced
      hold read each train's boiler), `railway-lines.ts` (`TRAIN_EXTENT.aheadCm` 820), `railway-sys-works.ts` or the
      new steel file (`install`), `railway-systems.ts` (one `OPS` row), `test/railway-lines.test.ts`,
      `test/railway-train.test.ts`. Adds `rail.install`. Checks: refused with no steel in the bay, on line 1, on a
      stale revision; two installs on one tick install once; a train takes the boiler only while standing at the
      Village; `boiler === 0` legs bit-identical to v27; **a mixed fleet** (one train at 25 m/s behind two at 20) run
      for 20,000 ticks under random lever asks keeps `sepCm`, the end blocks and the 105 s wait bound; the Pier and
      island stops still clear with the 820 extent. **Independent sim review, P1: the mixed fleet.**
      _As built (ring2/rules, 12 November):_ `Train.boiler` (u8), `Line.boiler` (u8) and `Line.fitted` (int, -1),
      appended inside v28. `BOILER_SPEED = [200, 250]`, `boilerSpeed`, `boilerKin` and `stopKin(line, to, track,
      boiler = 0)` in `railway-train.ts`; the pose reads the row's `boiler` (an absent field reads 0), and on boiler 0 the
      kin is the line's own object, so v27's legs are bit for bit (a test over every line, halt, track and leg).
      `RailTrain.boiler` is optional (fixture rows). In `railway-trains.ts`: `trainPose` caps a replan's speed at the
      train's own cruise (it capped at the line's, which would have cut a 25 m/s train's `v0` to 20), `cycleTicks` and
      `headTicks` take the leaving train's boiler, `trainRowBroken` bounds `boiler` and `v0` by it. Braking distances
      read only rates, so `planLeg`, `trainServes` and `trainRequestable` are unchanged; the balanced hold reads poses
      only. `rail.install { line: 1, part: 1, revision }` is `install` in `railway-sys-steel.ts` (order 56); the table is
      refused only mid roll-out (`Shed.ready` set, no wagon coupled). `boilerAdopt` runs first in `standing` for any
      line 2 train at the Village. `checkSteel` gains `boiler bounds`, `boiler fit` (line 2 only, `fitted` exactly when
      fitted, steel in the bay) and `boiler aboard` (no train above its line's fit), each with a bad world.
      **Changed from the step:** `test/railway-train.test.ts` needed no edit (the bit-identical test is in the new
      file); `test/railway-lines.test.ts`'s drawn-extent check now holds `aheadCm` at 820 and at least the drawn
      engine with the longer frame (6.2 + 0.5 = 6.7 m: the drawn long engine is 1.5 m shorter than rail-map's 8.2 m;
      V2's to reconcile), and its and `test/railway-trains.test.ts`'s literal far signals and endMoved boundaries move
      2 m (Far Head 48180, Pier 52780, Railhead 80380 and 94380, island 112880). Measured: Village to Ring Island
      64.4 s at 20 m/s and 54.1 s at 25 (10.3 s saved, the ten-second rule by 0.3 s), home by the Pier 70.1 s and
      61.3 s (8.8 s); round trip 138.8 s and 118.2 s. After an install the three trains took it 0.1 s, 51.1 s and
      90.9 s later. Every middle halt at every stage clears both end blocks by at least 3.8 m with the 8.2 m extent
      (Far Head before the Pier is the tightest). **The mixed fleet** (three 20,000-tick runs on the real rules from a
      world with steel home and the install made, 5% lever and 3% rider asks a tick, restores; slower trains put back
      on the standard boiler at each Village stand so the mix lasts): one fast train, two fast, and one fast with the
      headway hold off. Every tick: no pose jump past its cruise, `trainSpacing` (sepCm, one train an end block);
      every 50 ticks the load check. Worst line 2 lever waits 87.8 s, 87.2 s and 85.6 s (bound 105 s); longest stand
      36.5 s. The runs never brought a fast train within 239 m of the one ahead (the balanced hold keeps them even), so
      a directed test lets a fast train go right behind a slow one with no headway hold: the block rule holds it at the
      halt behind (37 s on held legs, closest 157 m, the halt spacing), never under sepCm, never past. No fallback
      needed.
      _After rebase 3 (onto main's fares, v30; ruling in docs/agent-calls.md, Rail, 12 November):_ the hand-held mixed
      fleet measured 1,064 ticks on b011e7 (a fast train pulls away from a slow one, which then makes three lever stops),
      but it is not reachable in play, so it is now a safety test with its waits printed. The wait bound (worst 1,050,
      mean 525) is asserted on the fleets a room can have, 20,000 ticks each: **the real handover** (install through the
      accepted op) worst/mean 833/439 (b011e7), 938/433 (5eed25), 813/437 (0fa575), the same bit for bit at 75% and 0%
      hold; **all standard** 786/474 (b011e7, 75%) and 815/487 (0fa575, 0%). **All-longer breaches 1,050 on one seed;
      with the owner:** 1,100 at b011e7 with the hold on (an ask for the Quarry down while all three trains run out, at
      the tick the last took the fit; the nearest goes up to the island and makes three lever stops, Railhead, Pier and
      Far Head, on its way down), 726 at 0fa575 (0%), 991 or under on eight more seeds; a todo test until he answers.
      The hold never binds under these asks: the handover runs are identical at 75% and 0%, and so is main's all-standard
      line 2 before build 2 (from ring-joined, b011e7: 792/477 at both settings; the least gap between Village departures
      599 ticks against the hold's 347). With no asks the hold does bind (main: least gap 347 at 75%, 201 at 0%). So
      lever stops keep trains later than the hold, on main as on this branch; nothing here changed it.
- [x] **R4. Server, prediction, seeds (M, HOTBOX; the bump moved to R1).** Create `src/sim/railway-seed-steel.ts`,
      `server/test/railway-steel-host.test.ts`. Edit `src/world/railway-server.ts`, `railway-predict.ts`,
      `railway-jump.ts` (four rows, section 6), `src/sim/railway-seeds.ts`,
      `src/sim/railway-sys-away.ts` (the works' casts in the away credit, capped by the rack),
      `src/adapters/railway-intents.ts` (five intents), `test/railway-jump.test.ts`,
      `server/test/railway-away.test.ts` (one empty-room case). Checks: reach refusals from the wrong place; a
      malformed `rail.install` never throws; a prediction that the server refuses comes back as `onCorrected`;
      `npm run checkpoints -- steel-kit steel-lit steel-home boiler-long` builds all four from accepted ops only.
      No new shared file is imported by the server from outside `src/sim/` or `src/world/` (if one is, it joins
      `server/Dockerfile`, `dev/server-build.ts` and deploy-server.yml in the same step). **Independent review of the
      server hunk.**
      _As built (ring2/rules, 12 November):_ `railway-server.ts`: `rail.steelTake` (`railInt(e.kind, 1)`) at
      `RING_STEEL_YARD`, `rail.steel` at `RING_STEEL_WORKS`, `rail.install` (`e.line === LINE2`, `e.part === 1`,
      `railInt(e.revision, BOILER_MAX)`) at `SHED_TABLE`, all three on the allow-list; `server/src/host/railway-requests.ts`
      keeps `kind`, `line`, `part` and `revision`, and events carry `line` and `part`. `railway-predict.ts`: the yard take
      and the feed are predicted (the works' `lit` and `lastCast` held for the server, as the kiln's); `rail.install` is
      not predicted (as `rail.brace`), **so V3's moment plays on the accepted event, not on the press** (step V3 says
      "from the prediction"; the handover's "as rail.brace" wins: the brace is not predicted either). Three intents, not
      five (ruling B: no rack 3, site 4): `steelTake(kind)`, `feedSteel()`, `installBoiler(revision)`; marks "steel kit
      taken", "works fed", "boiler installed". The away credit casts while the room is empty, capped by the rack and the
      total (**the kiln is not in the away credit**, so this follows the forge's pattern, not the kiln's). Seeds in
      `src/sim/railway-seed-steel.ts` from accepted ops and ticks; jump rows land on the island halt's east platform
      (u 444, lat +4), 4 m off the table's centre facing the garage post, and the Village's line 2 platform; each
      landing passes the arrival's surface test (`jump-land-probe`), and the steel-kit jump was looked at
      (`.look/steel-kit-jump-still.png`: standing on the deck by the track, facing along it). Checkpoints: steel-kit
      61.3 s, steel-lit 0.7 s, steel-home 5.9 s, boiler-long 5.0 s. Tests: `server/test/railway-steel-host.test.ts`
      (reach, malformed fields, two presses install once), the away case in `server/test/railway-away.test.ts`, and in
      `test/railway-replicate.test.ts` the predicted take and feed (lit held back, install never predicted) and a take a
      friend beat you to coming back as `onCorrected`. **The bump:** a bump-only commit to v31 (namespace line, rail-schema's
      `worldNs`, `rail-v31-` in `test/railway-cart.test.ts`), then the golden regenerated in a fixtures-only commit:
      keyed against v28, all 39 existing stages unchanged, the four steel stages added, nothing else moved. **For the
      views (R3 review, P3):** nothing spends `Shed.steel` in build 2; `checkSteel`'s `boiler fit` refuses a fitted
      room with an empty bay, so the first feature that spends bay steel relaxes it. No new shared file outside
      `src/sim/` or `src/world/` reaches the server. **Independent review of the server hunk: not run here** (the
      coordinator's, with R4-R5's review).
- [x] **R5. The loop graph and the bot (M, HOTBOX).** Edit `dev/loop/graph.ts` (nodes `steelkit`, `steelworks`,
      `steelhome`, `install`, each with its bill, supply, cue and `requires: rivet`), `dev/look/bots/railway-ring.ts`
      or a new `railway-steel.ts`, `dev/look/evals/railway-steel-bot.ts`. Checks: `npm run loop -- node <id>` for the
      four and `npm run loop -- run` for one to four players (the route's rules changed); the bot segment below.
      _As built (ring2/rules, 12 November): the graph and the loop; **the bot is not built.**_ Nodes `steelkit`,
      `steelworks` (8 logs, 12 rails by the kit train to the yard; its edge on `steelkit` held by the world: any logs
      and rails feed it, but nobody carries a bill 1.2 km to the island), `steelhome` and `install`, each with a cue
      marked decided and not built (V1 to V3) and no stops. `npm run loop -- run`: 1 to 4 players finish, no softlock,
      no graph bug; rivet to install 4:06, 4:31, 4:34 and 4:40 straight-line (kit 1:05 to 1:39 after the rivet, the
      feed 5 to 6 s, steel home 1:38 later; the install's 1:16 is the straight-line walk home, which a rider doesn't
      make). An order probe whose held node finishes on its own (the train brings the steel home) before the press is
      now inconclusive instead of a graph bug. `dev/economy/ring-data.ts` corrected (finding 6: the boiler free, the
      siding 12 rails and 8 logs, the brace the counterweight's four footings; prototype rebuilt: 1p 5.79 h, 2p 5.28 h).
      **Blocked, for the coordinator:** a bot plays only through ordinary inputs (no direct op), and the yard take, the
      feed and the Install have no prompt until V1 (the island's interactables) and V3 (the garage's hold sends
      `rail.install`). Proposed: the steel bot, its eval and the "ring-joined to boiler-long" segment move to after V3,
      with Checkpoint A's bot proof at Checkpoint B.
      _As built, the bot (ring2/v3-garage, 12 November): `dev/look/bots/railway-steel.ts`, its eval
      `dev/look/evals/railway-steel-bot.ts`, stops `steel-lit`, `steel-home` and `boiler-long` in `dev/look/segments.ts`
      (beats "steel works lit", "steel home", "boiler installed", the graph's marks; the three nodes `steelworks`,
      `steelhome` and `install` take them as stops) and `--from ring-joined|steel-kit|steel-lit|steel-home`. Ordinary
      inputs only, prompts pressed by id: ride line 2 from the Village to the island in one ride (the Railhead is a
      pass-through once the ring is joined), `railway-steel-take-logs`, `-feed`, `-take-rails`, `-feed` until lit
      (20 takes and feeds), ask for the home train at the island's lever, ride home, stand 1.3 m west of the post and
      hold `railway-install` until `Line.boiler` is 1. Each phase reads the rows first, so it resumes from the steel
      seeds. **Proved in pieces, not whole:** `--from ring-joined` reaches "steel works lit" (twice, 12:10 to 12:26 of
      game); `--from steel-lit` passes to "boiler installed" (the steel came home by itself; the hold, `Line.boiler`
      1). **The whole segment is blocked on fix/carry-sticky-deck:** the homeward ride loses the rider at about z -370
      (line 2's s 757, past the bow's crest): `deckUnder` (`src/physics/platforms.ts`) lets a stationary
      `railway:T1:flatbed`, the track layer parked on the homeward lane, take the rider from the car (the car's terms were
      all in bounds; the flatbed is listed first and overlaps), so the train leaves without them. Not worked round in the
      bot. Also found and fixed on this branch (view only): the island's levers stood at u 466, 18 m from the platform
      centre the server judges a lever ask from (reach 12.6 m), so every ask was refused; they now stand at u 457
      (`halts-view.ts`; `.look/lever-u457b-still.png`: both levers on their platforms, clear of the shed, loader and
      stacks); `steel11` boarded from the lever. `rideToIsland` is now exported from `railway-ring.ts` (the ring bot's
      own ride, unchanged). Timing: the bot's 11.5 minutes (`steel-lit` run, "steel home" at 681 s) was the harness's wall
      clock from the bot's start (`Date.now`, boot and entry included); by the server's ticks the same wait is
      1,175 ticks (works lit at tick 11448, steel home at 12623), 117.5 s at 10 ticks a second, exactly the unit-level 109
      to 117 s. So the rules are on time and that room ran about 6 times slower than real time in wall seconds (a
      headless page's warp speeds the page, not the server). Read waits in server ticks.
      After the carry fix lands: rebase, one full `npm run playthrough -- --from ring-joined --to boiler-long --stall
      6000 --wall 2700`, then tick this.
- [ ] **Checkpoint A (rules).** Proofs, and only these: `npm run check`; `npm run loop -- run`; **the bot from
      `--rail-seed ring-joined` to the `boiler-long` state**, logging minutes per beat; `test:net`'s reconnect pair
      once with a carrier leaving mid-carry. Then ship v28 under the mid-session hold.
- [x] **V1. The works on the island (M, Mac).** Create `src/entities/ring-steel/{index,view}.ts`. Greybox boxes only:
      yard stacks drawn from `yardLogs`, `yardRails`, `yardFoot`; a bill sign over the works (the frame sign's
      have/need per material, `stock-sign.ts`'s pattern); the rack's steel blocks; a box jib for the loader between
      u 436.9 and 444.3; an open shed over the hammer with a doorway and a collider; the four interactables. Build 1's
      tarp stack stays as it is. Effects only from accepted edges. Proof: one look,
      `npm run look -- --rail-seed steel-kit` at the yard, phone and desktop width. **Visual review** per
      `npm run models`.
      _As built (ring2/v1-works, 12 November), on rulings B and E:_ one file, `src/entities/ring-steel/view.ts`
      (`createRingSteel`), mounted by `railway/works-live.ts` beside the Meet (**no `index.ts`**: the prompts send
      through the adapter that only the railway's view holds, as the Meet's and the folk's do). It reads `Steel`,
      `Aperture` and the local `Account` off `adapter.read.world()` at the head of every entry point and keeps nothing;
      drawn only while the island's near view is mounted. Static grey boxes (`drawWorksBoxes`, with colliders): the
      shed inside u 448 to 455, lat 6.5 to 14 (four posts, a roof at 6.9 m over the gantry, a 3.6 m door wall with a
      2.4 m doorway at u 452; the other three sides open), the loader (a mast and a post at lat 6.6, a beam from
      u 436.9 to 444.3 at 4.6 m, an arm over the platform), the rack's bed (u 438.6 to 442.6, lat 6.3) and two yard
      pallets (logs u 444.75, rails u 446.6, lat 8.3). From the rows (`createBoxBatch`): up to 8 logs and 12 rails on
      the pallets from `yardLogs` and `yardRails`, up to 6 orange steel blocks on the rack from `rack`. The bill sign
      (6.4 by 1.4 m, hung under the roof's front edge, facing the platform) stands from `joined`: "logs 0/8  rails
      0/12" over "Steel works", then "lit  steel n/12" from `lit` and `poured` (the server's; nothing predicts it).
      **Three interactables, not four** (ruling B, no footings): "Take logs" and "Take rails" at their stacks inside
      the yard's reach (blocked "Your back is full"), and "Feed the works" at the doorway until lit (blocked "Bring
      logs or rails", ruling E); none before the rivet. **Changed from the step:** no `yardFoot`; the sign is under
      the roof edge, not on the lintel (build 1's RINGWORKS board, u 445.4 to 450.6 at lat 5.0, hid it from the
      platform's south end at the first look); no effect or sound on any edge (greybox order), so `accepted` is
      empty; the yard and works points stay where R1 put them. Looks (desktop width; no phone shot, owner call "Fast
      ships"): `.look/v1-works-cold-still.png` (steel-kit) and `.look/v1-works-lit-still.png` (steel-lit). Not shown
      in a still: the three prompts (the jump-in lands 4.3 m from the yard point, outside its reach) and the stacks
      shrinking on a take; the prompts were pressed in a browser afterwards (V2's `railway-steel-prompts.ts`: take,
      feed, the blocked feed and the server lighting the works) and by R5's steel bot, by id. One of the folk stood beside the rack's bed in the steel-lit landing still (their posts were not moved). Not tested on a device.
- [x] **V2. Steel and the boiler on the train (S, Mac).** Edit `src/entities/railway/train-view.ts`, `cars.ts`,
      `engine-kit.ts`. Steel blocks on the cradle from `Train.steel`; the built, unwired `engine_*_long` meshes when
      `Train.boiler === 1`; `cars.ts`'s extent test follows `TRAIN_EXTENT`. No whistle variation, no smoke change.
      Proof: covered by V3's look.
      _As built (ring2/v2-train, 12 November), on ruling C:_ `train-view.ts` draws up to `STEEL.trip` orange blocks
      two abreast on a line 2 train's **kit car** (not the cradle) from its row's `steel`, in a batch of their own;
      aboard when the row says so, with no hop from the rack or into the bay. `engine-kit.ts` gains `engineLong(rope)`:
      the long body cut as the short one is (`splitBody` now takes either body) and drawn without its cab, the long
      boiler and its lashing in the rope's gold, and the chimney's cap read off the mesh. A train whose row wears
      boiler 1 hides the short body's rest and the short boiler and shows these; the cab's faces, doors, stool, rods
      and drivers stay the short engine's, so the cutaway and the doors work as before, and the steam leaves the long
      chimney (the puffs themselves are unchanged). **Not changed:** `cars.ts` (R3 already holds `aheadCm` at 820 in
      `test/railway-lines.test.ts`; the drawn long engine reaches 6.7 m ahead, inside the 8.2 m the rules reserve, so
      nothing needed reconciling and no rule moved); the engine's collider (the long frame's extra 0.5 m ahead and the
      longer barrel are drawn only). A leftover kit riding on would share the deck with the steel (not seen). Two
      looks, since no seed has both (by `boiler-long` all twelve steel are home): `.look/v2-steel-aboard-still.png`
      (steel-lit) and `.look/v2-long-boiler-still.png` (boiler-long), `dev/look/evals/railway-steel-train.ts`. V1's
      prompts were pressed in a browser first (`dev/look/evals/railway-steel-prompts.ts`: take, feed, the blocked
      feed, rails, and the server lighting the works on the last feed). Not tested on a device.
- [x] **V3. The bay and the real Install (M, Mac).** Edit `roundhouse-view.ts` (a box stack in the bay from
      `Shed.steel`; its position is set here and level-checked here), `garage-state.ts` (`roomFacts` gains
      `steelHome` and `longFitted`; the header's "nothing is sent" comment goes), `garage-data.ts` (the tile's
      standing from the facts; `BOILERS.long.speed` from `BOILER_SPEED`), `src/features/garage.ts` and
      `garage-view.ts` (the completed hold sends `rail.install`; the existing moment plays on the press from the
      prediction and the part lowers back on `onCorrected`; a tab not at the table plays the whistle and nothing
      else), `docs/game-design/` (the owning section). No dialog, no new moment. Proof: one look, two players,
      `--rail-seed steel-home`: one holds Install, both pages show the next line 2 train at the Village wearing the
      long boiler. **Visual review.**
      _As built (ring2/v3-garage, 12 November), on the coordinator's ruling, not the step:_ **a plain hold at the
      default table, not the garage.** The step could not work as written: the garage mounts only under `?home=b`
      at layout B's table (x 942.1, z 17.1; its post x 947.0, z 14.3), and `rail.install` is judged at
      `SHED_TABLE` (x 918, z 12, reach 6 m, from the position the action carries), 29.0 m from that post, so every
      hold there would be refused; the default layout has no garage. Ruling (orchestrator, Default, logged in
      agent-calls): the install is a plain hold at the default table until the Home flip. One new file,
      `src/entities/railway/boiler-install-view.ts` (`createBoilerInstall`), mounted by `works-live.ts`; it reads
      `Shed`, `Line`, `Aperture` and the trains' `wagon` off `adapter.read.world()` at the head of every entry
      point and keeps nothing. Drawn from the rivet (`Aperture.joined`), with no colliders: **the bay** is a grey
      pallet 5.7 m east and 1.8 m north of the table's centre, on the open ground between line 2's two roads (about
      3 m clear of the road to the Village platform, clear of the deck, the stall road and line 2's frame), with up
      to twelve orange blocks from `Shed.steel`; a post 5.2 m east (inside the 6 m reach) with a lamp (grey, orange
      once steel is home, green once fitted) and the hold's bar. **The prompt** `railway-install`, "Install the
      longer boiler": only while `Shed.steel > 0` and `Line.boiler` is 0, within 2.6 m of the post and 5.6 m of
      the table's centre; blocked with "The table's busy" mid roll-out (the rule's refusal); a hold of 1.2 s (the
      garage's Large hold), "Keep holding" while held, "Hold to install" for 1.5 s after a tap. There was no hold
      prompt to follow, so the press starts it and a wrap on the interact action's release ends it. The completed
      hold calls `installBoiler(line(w, LINE2).boiler)` and hides the prompt for up to 4 s for the answer. **Not
      predicted:** on the accepted `rail.install` every page plays the shared moment "longer boiler" (the existing
      banner, "Longer boiler installed" over "Line 2's trains take it at the Village", 4.5 s, and a playtest mark);
      the lamp and bar follow the rows, so a restore or late join gets them green with no banner. The banner is
      room-wide, as the other shared moments (not "near" only). No sound, camera or new effect.
      **Not built from the step:** nothing in `roundhouse-view.ts`, `garage-state.ts`, `garage-data.ts`,
      `garage.ts` or `garage-view.ts` (the garage stays a view-only Try it; its headers stay true; its tile still
      reads "Needs steel"); no whistle for an away tab; no two-player look. **The fourth car** (owner, 12 November:
      steel's free first car arrives with the install) is a rules matter not in R3 and is the step after build 2
      (call 29): open, not built. **The `steel-home` landing** moved: the old spot (4 m west, 2 m south) put the
      camera inside the stall's shell (`.look/v1-steel-home-jump-still.png`); now 5.2 m east, 1.7 m south, yaw
      1.255, facing the table (`.look/v3-steel-home-jump-still.png`). **Looks** (default layout, the game's
      camera, `dev/look/evals/railway-install.ts`): `.look/v3-install-prompt-still.png` (the prompt over the
      post, the orange lamp, five blocks on the pallet) and `.look/v3-install-after-still.png` (the banner, the
      lamp and bar green, no prompt). Rows after the server confirmed: `Line.boiler` 1, `Line.fitted` 12675; a
      tap installed nothing; a line 2 train (slot 1) wore boiler 1 standing at the Village 45.6 s after the install
      (the other two were not waited for). The hold's 1.2 s was not timed in real time (the look's clock is
      warped), and the touch button's release was not exercised: if it never reaches the action's release, a tap
      on touch completes the hold. `npm run level-check` passes; it does not know the pallet (no collider), whose
      clearance is the stills' and the arithmetic above. Not tested on a device.
      **Open, for the Home flip:** when Home flips to layout B, `SHED_TABLE` moves to layout B's table (a rules
      change with its own bump) and the garage's Install replaces this prompt, with its moment on the accepted event.
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
