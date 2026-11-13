> **Status: plan for the designer's and the owner's review (12 November 2026).** Nothing is built. The planner ran one
> trial in this worktree (the planned extent and stop mark applied, uncommitted, then reverted): its figures are marked
> *trial*; everything else is read from main at `e9a7e752` or is *arithmetic*. The next Ring Island step after the
> garage's install moment. One rules change with its own bump (v33); no new op, no new field.

# The fourth car: steel's car, behind the longer boiler

## 1. Goal

When line 2's longer boiler is installed, each line 2 train that takes it at the Village also gains steel's own car at
its tail, and the steel still to come home rides on it. "Cars it pulls 3 to 4" and "It runs faster and pulls one more
car." (The Boogler's line, kept) stop being a readout with nothing to couple.

Serves DESIGN.md **11. Show, don't tell** (the train is visibly longer; what is on screen is true), **6. Communal
world** (one install, every train of the line) and **7. Telegraph everything**. It bends one open designer row ("pulls
4 never ships with an empty place"): [owner question 1](#10-owner-questions).

**Read.** `npm run map -- --kind lockstep-system` has no `plan` kind (nearest). DESIGN.md; the Current rules of
[rail](../decisions-rail.md#current-rules) and [core loop](../decisions-core-loop.md#current-rules) and the entries
cited in section 2; [ring-island-build2](ring-island-build2.md) (calls 12, 15, 16, 29; R3 and V2 as built; owner
question 2); [garage-install-moment](garage-install-moment.md) (level finding 2, review finding 6, ruling R2);
[engine-garage](../brainstorms/engine-garage.md) section 6 and review finding 3; [greybox-route](greybox-route.md)
(gates 5, 8 to 15, calls 58, 65, 97, 105); [train-spacing](train-spacing.md);
[orchestrator-state](../agents/orchestrator-state.md) (call 109, rules 13, 14, 19, 23, 25); lockstep, room-safety,
mixed-builds, sync, tests, owner-calls. Code: section 4's table. Pattern followed: the footing wagon's car
(`train-view.ts:113-123`, `:291-302`, `:415-424`) for the view, and build 2's R3 (`TRAIN_EXTENT.aheadCm` 620 to 820,
one extent for every train) for the rule.

**Loop.** `npm run loop -- node steelhome`: no bill, no carries; its cue names "steel on the kit car's deck" (V2
rewrites it). `node install`: no bill, requires `steelhome`. No beat's bill, supply or requirement changes; R2 runs
`npm run loop -- run` because it changes a rail rule.

**Research.** [upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade repays a visible inconvenience) and
[carrying-and-logistics-play](../research/carrying-and-logistics-play.md) rec 2 (steel is never hand-carried): used, as
build 2 used them. Their top blocks were not re-read; the plan adds no claim from research.

**Port from Place.** Nothing is ported. **In flight.** `npm run inflight` (12 November): four `ship/*` branches, 73 to
77 hours old, none touching a file below.

## 2. Calls: decided, default, new

| # | Call | Kind | Source |
| --- | --- | --- | --- |
| 1 | Steel's free first car is the longer boiler's fourth car and arrives with the install | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) |
| 2 | A new resource's first car is free at its unlock; the screen shows it owned | Decided | [the train garage](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy), answer 2 |
| 3 | Real trains take a fit at their next Home stop: the car couples at the Village, with the boiler | Decided | Same entry, answer 1 |
| 4 | A boiler sets top speed and how many cars the engine pulls | Decided | [the upgrade screen](../decisions-core-loop.md#d-2026-11-10-the-train-upgrade-screen-install-plain) |
| 5 | Trains may be longer than platforms; the passenger car stands on the deck at every halt, both ways | Decided | [10 November](../decisions-rail.md#d-2026-11-10-trains-may-be-longer-than-platforms) |
| 6 | Four seats, on the passenger car; a cargo car has none | Decided | [older calls](../decisions-rail.md#d-2026-11-10-open-calls-answered-older-calls) |
| 7 | Players away keep their camera and see the part go onto their train at Home | Decided | [the upgrade screen's calls](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade) |
| 8 | Wait limits: 1,350 on a fixed stage, 1,600 while the line grows; 1,400 settled is the designer's reading | Decided (reading) | [12 November](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered); greybox call 105 |
| 9 | The car is not stored: a train has it exactly when `Train.boiler >= 1`. No field, no op | Default | Decided call 1 ("with the install") in data |
| 10 | It is the last car: 7.4 m behind the pose on a train with no footing wagon, 11.1 m behind on the wagon's train | Default; question 1 | The wagon's loaders at the Quarry and the Pier stay where they are |
| 11 | One extent for every train on every line: 8.2 m ahead, 12.7 m behind (`behindCm` 900 to 1270) | Default | Build 2's call 15, the same reasoning |
| 12 | `TRAIN.sepCm` stays 2740: the least nose-to-tail gap falls from 10.2 m to 6.5 m | Default | Raising it by 3.7 m lengthens every hold; waits are over the owner's limit already |
| 13 | Line 2's Village stop mark moves from 17.0 m to 18.25 m | Default; [level finding 1](#7-level-findings) | The only mark that clears the table today and layout B's road 2 at the flip |
| 14 | No other stop mark, platform or signal position moves; line 1 keeps its stop and its three cars | Default | Level findings 2 to 8 |
| 15 | Steel rides the steel car on a fitted train and the kit car on an unfitted one; 6 a trip either way | Default | `STEEL.trip` and the rack's cap are both 6 |
| 16 | A flat deck you can stand on, no seats; a rider's ask from it is in reach (`RIDER_SPAN` 740 to 1110) | Default | Every car is a deck today |
| 17 | The coupling is one more beat inside the platform beat: the car is there after the puff, with a second clank at the tail. No shunt, no crew | Default | Garage review finding 6; road 2 holding the car waits for the Home flip |
| 18 | The garage's Cargo row gains a "Steel car" tile, shown free once the line is fitted. Placeholder strings | Default | Decided call 2 |
| 19 | Three trains of line 2 (four of five on the leg) pull three cars after the install; only the wagon's train pulls four | **New** | Question 1 |
| 20 | Once the twelve steel are home the steel car runs empty until something spends or casts steel | **New** | Question 2 |
| 21 | `kitTrains` stays "the running trains less one" although steel no longer needs an empty kit car | **New**, not taken | Greybox calls 58 and 65; changing it re-opens gates 13 and 14 |

Eight decided, ten default, three new. No `/brainstorm` is needed: 9 to 18 reuse built mechanisms. 19 to 21 are for
the designer.

**Not answered here:** "lengthen halts and gates past 6 m or articulate short cars" is the end-game engine's open
question. Cars stay 3.2 m at a 3.7 m pitch; nothing here goes through a gate it does not go through today.

## 3. What the player sees

| When | What |
| --- | --- |
| Install made (built) | The garage moment; "Cars it pulls" lands on 4 |
| Each line 2 train's next Village stand (0.1 to 91 s after) | The platform beat as built (puff, clank, squash, toot). New: under the same puff the steel car is on the tail, with a clank there 0.3 s after the engine's |
| The fitted train leaves | Longer by one car. Steel aboard is on the steel car, two abreast, as it was on the kit car; the kit car's deck is clear for kit |
| At Ring Island | The rack's steel is aboard when the row says so (no hop, as built) |
| At the Village | Steel into the bay's stack (built) |
| A late join or restore | Rows only: a train wearing the long boiler has the car; no beat |
| The garage, Cargo | "Steel car", free, once fitted; before that it reads as a later part |
| After the twelfth steel is home | The car rides empty (question 2) |

## 4. Design

**Sync kinds.** The railway is Server kind (sync.md): no `src/world/rules/` entry, no `edits` generator, no `env` fact.

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| Whether a train has the car | Server, derived | server | `Train.boiler >= 1` (as replicated today) |
| Train length in the block rule; the Village stop | Server, catalog constants | server | `TRAIN_EXTENT`, `RAIL_LINES[1].halts[0].s` |
| A rider's reach from the car | Server reach check | server | `RIDER_SPAN` |
| The car, its collider, steel on it, the coupling beat, the tile | Local, from accepted rows | each tab | `train-view.ts`, `garage-data.ts` |

**Controls.** None: no action, pad slot, key, touch target or guide row.

**Save and wire.** No component field, op, message or snapshot shape changes. **`WORLD_NS` v32 to v33, no migration:**
a saved train standing at the Village has `from` 1700 and the load check wants `st[0]` (`railway-trains.ts:546`), and
both moved constants move the pinned fixtures (rule 14). Fixtures regenerated: `test/fixtures/railway-golden.json`
(every stage: an idle line 2 row holds the stop), `railway-ops-golden.json`, `railway-m12-trace.json`,
`railway-tick-order.json` and `-heads.json` if they move, and the rail map (`dev/level/rail-map.ts`). Mixed builds: dev
phase, no fence; a v32 tab is in another namespace.

### Where train length is assumed, and what changes

| Where | Today | Change |
| --- | --- | --- |
| `src/entities/railway/cars.ts:17-18` `TRAIN_CARS`, `TRAIN_OFFSETS` | engine, two flatbeds, the wagon at 0, −3.7, −7.4 | **Unchanged** (six files read "the last entry is the wagon"). Add `STEEL_CAR: CarSpec = TRAILER`'s size and `steelCarOffset(wagon: boolean)`: −7.4 or −11.1; `TRAIN_TAIL_M = 11.1 + 1.6` |
| `src/sim/railway-lines.ts:109` `TRAIN_EXTENT` | 820 ahead, 900 behind | `behindCm` 1270. `aheadCm` stays 820 (the drawn long engine reaches 6.7 m; the 1.5 m is rail-map's reserve, not this step's) |
| `railway-lines.ts:114-118` `railEnd` | a low end's signal is `edgeCm + behindCm` | Follows: line 1's Village signal 6500 to 6870, line 2's 6300 to 6670. Far-end signals read `aheadCm`: unchanged (48180, 52780, 80380 to 94380, 112880, the heads', 318720) |
| `railway-trains.ts:99-104` `endBlocks`, `within` | a train is in the Village block until its tail is past the turnout | Follows. With the stop moved the same 3.7 m less 1.25, a leaving train clears the block 2.45 m later; an arriving one waits 3.7 m further out |
| `railway-trains.ts:140-161` `blockFree`; `railway-train.ts:25-27` `sepCm` | 2740 pose to pose | Unchanged; the comment's "10.2 m" becomes 6.5 m |
| `railway-trains.ts:463-475` `endMoved` | reads `aheadCm` | Unchanged |
| `railway-lines.ts:459` block signals | 10 m past each head's stop | Unchanged; a train held there has its tail 2.7 m short of the head's stop, on the single track, and no other train is within 27.4 m |
| `railway-lines.ts:396` line 2's Village stop | 1700 | **1825** |
| `src/place/layout.ts:379` the view's copy of line 2's stops | `[17, ...]` | `[18.25, ...]` (`test/greybox-works.test.ts:89` "rides" pins the two together) |
| `src/sim/railway-works-layout.ts:42` `WAGON_S` | 960: where the wagon waits to couple, stop − 7.4 m | 1085 (else the wagon jumps 1.25 m as it couples). `roundhouse-view.ts:183-186` follows it |
| `src/world/railway-server.ts:140-156` `RIDER_SPAN` | 740 | 1110 |
| Line 1's stops, every other halt's `s`, every platform | | Unchanged (level findings) |
| The ends' turning | push-pull: the engine stays at the +s end, one mark serves both ways (`circuitCm`) | Unchanged. The tail leads going home; no rule reads which end leads |
| Seats | four, on car 1 at the pose | Unchanged |
| The kit car, the wagon | −3.7, −7.4 | Unchanged |
| `train-view.ts:113-123`, `:291-302`, `:415-424`, `:494-518` | three cars a train, one shared wagon car, steel drawn on `cars[2]` | V1 |
| `garage-data.ts:196-197`, `:253` `BOILERS.pulls` | 3 and 4 | Unchanged; V2 adds the tile |
| `dev/level/ring.ts:141-148`, `:277`, `:327-352` | standable tops; "today's train" and "the long train" (12.7 m, already checked) | V2 adds the steel car's deck to the tops; the two train rows become one |
| `dev/look/garage-showroom.ts:235-236` | already draws a second wagon at −11.1 | Unchanged |

**Mixed fleets.** For up to about 91 s after an install, and for longer on the leg (two fleet rows wait in the shed
and take the fit only when they first stand at the Village), some line 2 trains have the car and some do not. The
rules do not care: one extent, one `sepCm`, one stop mark for every train, as build 2 did for the two engines, so no
rule reads which train is longer. The views read each row. Line 1 is never fitted. A fleet held mixed by hand stays
build 2's safety test, printed and not bounded.

**Invariants.** None added. `checkSteel`'s `steel aboard` (0 to `STEEL.trip`, line 2 only) and `boiler aboard` already
bound everything the car is derived from.

## 5. Waits and the leg's gates

The stop mark and the extent change two things a wait can feel: line 2 is 1.25 m shorter each way, and the Village
block is held about 2.45 m of travel longer. Far ends, block signals and `sepCm` do not move. *Arithmetic:* under two
ticks a turn at the Village.

*Trial* (this worktree: `behindCm` 1270, the stop at 1825, `WAGON_S` and the view's stop to match, nothing else; main
and the trial both run here with `ROUTE_GATES=1`, on the test's own four seeds):

| Gate | Limit | Main | Trial |
| --- | --- | --- | --- |
| Gate 8, fixed stages 0 to 4, worst | 1,350 | 1,166 | 1,166 |
| Gate 9, settled, worst by seed (`c0ffee`, `777`, `5eed`, `badd`) | 1,400 | 1,261, 1,340, 1,397, 1,367 | 1,261, 1,340, 1,397, 1,367 |
| Gate 9, settled, waits over 1,050 | printed | 24 of 244, 19 of 237, 22 of 247, 20 of 244 | 24 of 244, 19 of 237, 22 of 247, 20 of 244 |
| Whole-leg fuzz, worst | 1,600 | 1,421 | 1,417 |
| Gate 14, rivet to Gorge; idle a frame | 3,700; 1,200, 600 | 3,575; 1,130, 563, 357, 321 | 3,574; 1,129, 559, 362, 320 |
| Gate 15, steel kit in the yard; first steel home | build 2's +651; +1,050 | +651; +1,824 | +651; +1,823 |
| Build 2's fleets (`railway-install.test.ts`), standard and handover | 1,050 worst, 525 mean | not re-run | worst 843, mean at most 491 |
| Build 2's all-longer fleet, seed `b011e7` | todo, with the owner | 1,152 (the test's note) | 1,146 |

Every fuzz in `test/railway-trains.test.ts` and `test/railway-route-rules.test.ts` passed in the trial; the only
failures were literals, pinned fixtures and one sampled tick in `railway-trade.test.ts` (R1 and R2 list them). **This proves nothing past the test's seeds** (rules
19 and 25): gate 9 sits 3 ticks under its limit on `5eed`, as on main.

**The gates R2's reviewer and the checkpoint re-run, and their limits:**

- `test/railway-trains.test.ts`: the stage fuzzes and the fixture fuzzes at `WAIT_BOUND` 1,050; "the wagon's twelve
  footings reach the pier" with **every footing's delivery tick printed before and after** (rule 13).
- `test/railway-install.test.ts`: standard and handover fleets at 1,050 worst and 525 mean; all-longer stays a todo;
  the mixed fleet printed.
- `test/railway-route-rules.test.ts` with `ROUTE_GATES=1`: gate 5 (1,158 in the Quarry yard, the 2,805 opening), 8
  (1,350), 9 (1,400), 10 (1.2 times non-stop), the whole-leg fuzz (1,600), 12 (1,050), 13, 14 (3,700; 1,200 and 600),
  15 (build 2's own tick; +1,050), call 88 (1,158).
- **48 seeds** on the harness of `scratch/spacing-leg1-e0`, rebased onto the branch and never merged: settled worst
  and share over 1,050 at heavy and light asks against main's sheet (1,553 and 1,535; 7.2% and 3.0%), whole leg against
  1,548, all under the 1,600 cap (call 109). **The rule for this step: no figure worse than main's on the same seeds by
  more than 10 ticks or 0.3 points.** If one is, the step stops and the sheet goes to the designer; `sepCm` and the
  fleet are not touched to buy it back.

## 6. Steps

Rules steps: an opus implementer each, then one independent reviewer for R1 and R2 together before either reaches main
(a review that drives a real server once: rule 23). Views: a fable implementer each. Every step leaves
`node dev/ship-check.ts` green; nothing else is run in a step.

- [x] **R1. The extent and the reach (rules).** Edit `src/entities/railway/cars.ts` (add `STEEL_CAR`,
      `steelCarOffset(wagon)`, `TRAIN_TAIL_M`; leave the two tables), `src/sim/railway-lines.ts:109` (`behindCm` 1270;
      the comment names the steel car), `src/sim/railway-train.ts:25-27` (the comment: 6.5 m),
      `src/world/railway-server.ts:140-145` (`RIDER_SPAN` 1110), `src/world/namespace.ts` (**v33**, one line for the
      whole plan: the extent, the stop, no shape change, no migration). Tests edited, no new file:
      `test/railway-lines.test.ts:169-198` (`behindCm` equals `TRAIN_TAIL_M * 100`; line 2's Village signal 6670),
      `test/railway-trains.test.ts:178-187`, `:469`, `:508` (6300 to 6670) and its two headway-hold cases,
      `test/railway-ring-layout.test.ts:153` and `dev/level/ring.ts:277` (`LONG` is now the extent),
      `test/railway-r4b-views.test.ts:136` (the rear is `-TRAIN_TAIL_M`), `test/railway-placement.test.ts:118-124`
      (reads the constant; re-read its two distances). Regenerate the pinned fixtures (`GOLDEN=1 node --test
      --test-concurrency=1 'test/railway-golden-*.test.ts'`, `GOLDEN=1 node --test test/railway-ops.test.ts`, the M12
      trace and the tick-order files by their own headers). Verify: `test/railway-install.test.ts` "every middle halt
      stands clear of both end blocks, and every signal of its own" passes unedited (line 2's Village signal less the
      tail is exactly the turnout's edge, 5400).
      *As built (12 November):* `TRAIN_TAIL_M` is derived (`STEEL_CAR.hz - steelCarOffset(true)`), the lines test pins
      `behindCm` to it and to 1270; line 2's Village signal 6670 (line 1's 6870, unpinned). Plus the review's High
      Gorge assert (`test/railway-route-rules.test.ts`, the first catalog case: the tail less the crossover's far end is
      exactly 30 cm) and `test/railway-cart.test.ts`'s room id (`rail-v33-`). `dev/level/ring.ts`'s `LONG` is
      `TRAIN_EXTENT` (V2 merges the two rows). Every pinned fixture moved (golden, ops golden, rail schema, M12 trace,
      tick order and its heads); the rail map did not (`--check` clean). Build 2's all-longer todo reads 1,152 after R1
      alone, as on v32.
- [ ] **R2. Line 2's Village stop mark (rules).** Edit `src/sim/railway-lines.ts:396` (1825),
      `src/place/layout.ts:379` (18.25), `src/sim/railway-works-layout.ts:42` (`WAGON_S` 1085). Tests edited:
      `test/railway-lines.test.ts` (the three "v25/v27 stops" cases and "the pier opens with Q6"),
      `test/railway-trains.test.ts:157-187` (the cycle and headway literals, re-derived and stated in the title; the
      block's `from` 1825), `test/railway-works-layout.test.ts:150-153` (11.7 becomes the plain train's tail, 12.95),
      `test/greybox-works.test.ts:89` "rides", `test/railway-trade.test.ts:1214` (one arrival coincides with riders
      stepping off at tick 6512 in the trial: move the sampled tick, do not loosen the assert),
      `test/home-station.test.ts:78-93` and `:132-151` for layout B as [level finding 1](#7-level-findings) rules
      (line 2's stop 18.25; the four-car span from `steelCarOffset(true)`; road 2's train may overhang the island's
      deck at both ends, its passenger car may not; rear past `SPUR.s`, front on the straight). Regenerate the fixtures
      again and the rail map (`node --import ./dev/sim/hooks.ts dev/level/rail-map.ts`). Verify: `npm run level-check`
      (the trial: 0 new problems, "stop at 18.25" reachable); `npm run loop -- run` (1 to 4 players finish); the
      section 5 gates in short mode; the reviewer runs them with `ROUTE_GATES=1` and reports the table.
- [ ] **R3. The server path (rules, tests only).** Edit `server/test/railway-steel-host.test.ts`, no new file. (a) Its
      install case (`:212`, a real `r:edit`) runs the host on until a line 2 train stands at the Village and asserts
      the replicated row wears boiler 1 and that a joiner's snapshot has it: the one fact the car is drawn from. (b) A
      rider's `rail.call` with `train` set, sent as a real `r:edit` from the steel car's deck on the wagon's train
      (11.1 m behind the pose, standing): accepted; from 22 m behind: refused. **No new op exists in this plan;** these
      are the two server paths it leans on. Also the P2 leftover in the same file only if it is one line (the guard
      test's baseline); otherwise leave it.
- [ ] **V1. The car on the train (view; fable).** Edit `src/entities/railway/train-view.ts`, `car-kit.ts` or
      `src/render/wagon-look.ts` for the look. One steel car a line 2 slot (five), built as the wagon's car is
      (`rail.makeCar(STEEL_CAR, ...)`, `platform.id = railway:train${slot}-steel`, `shared`, `speedLimit` 30), a
      flatbed with low stakes and an orange stripe (greybox). Shown when the row's `boiler >= 1`, posed at
      `along + steelCarOffset(row.wagon)`, parked at y −60 otherwise and for a shed row; in `carsOf`; cleaned up with
      the owner. `drawSteel` puts the blocks on it when shown, else on `cars[2]`. The coupling: in the platform beat's
      clock add `couple: 0.7`; the car is hidden until `BEAT.swap` on a live fit and snapped on a restore, a late join
      and reduced motion; the existing clank sound once more at `couple`, from the car. No new sound, particle or
      registry row. **Proof look:** `--rail-seed boiler-long`, the game's camera at the Village platform, a fitted
      wagon train standing (tail off the table's deck, the car clear of the stand's legs) and a plain fitted train
      leaving; one still each, and one of steel riding the steel car from `steel-lit` after an install.
- [ ] **V2. The garage, the graph and the level sheet (view; fable).** Edit `src/entities/railway/garage-data.ts` (a
      `steelcar` tile in `cargo`: `later` until `Line.boiler >= 1`, then `free`; placeholder name "Steel car",
      description "Came with the longer boiler. 6 steel a trip.", pill "Free with steel": **not The Boogler's, listed
      for the owner**), `dev/loop/graph.ts:922-940` (`steelhome`'s cue: the steel car once fitted),
      `dev/level/ring.ts:141-148` (the steel car's deck among the standable tops), `docs/game-design/` (the owning
      railway section: train length, the car, the moved mark). The tile on the old Boiler path is untouched. **Proof
      look:** the garage on Cargo before and after an install (two stills).
- [ ] **Checkpoint C1 (the bump).** Once, for the branch: the full unit suite and `ROUTE_GATES=1`; section 5's 48-seed
      sheet with the footing delivery ticks; `test:net`; the steel bot (`dev/look/bots/railway-steel.ts`) through the
      install to a fitted train leaving; one two-player look of the coupling from the platform and from a rider's
      seat; `npm run perf` at the Village with all five trains fitted; load boogle.club after the ship. Not shipped
      mid-session (AGENTS.md).

## 7. Level findings

`npm run level-check` cannot take planned positions (a P3 leftover), so it was run on the trial: **0 new problems**;
"stop at 18.25" reachable; Ring Island's row reads "8.2 m ahead, 12.7 m behind standing at u 448: u 435.3 to 456.2,
18.3 m clear of the crossover, beside the platforms". It does not measure a train against the table, a deck's ends or
the Gorge. The rest is *arithmetic*, for the wagon's train (tail 12.7 m behind the pose; a plain fitted train's tail
is 9.0 m, where the wagon's is today). Metres along line 2.

| # | Where | Found | Proposed |
| --- | --- | --- | --- |
| 1 | **Home, the stop mark** | At 17.0 the tail is at 4.3, 0.5 m onto the table's deck (rim 4.8), inside the works copy's 4.4 m sweep. Two marks work. **18.25:** tail 5.55, 0.75 m off the rim, 1.15 m outside the sweep; passenger car 16.65 to 19.85 on the deck (6 to 28); nose 24.95. The steel car then stands at 5.55 to 8.75, beside the stand's legs (5.8 and 7.3 m along; ruling R2 placed them for a car here: the nearer is about 0.2 m from the car's side) and the jib's mast (8.0 m along, 2.5 m out), where no car stands today. In layout B it is the only mark that fits without moving track: tail 0.05 m past the spur's points (5.5), nose 0.05 m short of the straight's end (25.0), 1.05 m short of the leg's points (26); the train overhangs the island's deck (5.70 to 23.70) by 0.15 m behind and 1.25 m ahead. **20.7** (engine-garage's figure): the tail stays at 8.0 as today, nothing new beside the garage; but in layout B the nose is 2.4 m past the straight and 1.4 m past the leg's points | **18.25**, and the designer confirms the 0.2 m at the stand's legs from V1's still. If that is too tight: 20.7 now, and the Home flip lengthens road 2's straight by 2.4 m |
| 2 | Quarry (stop 174) | Tail 161.3. Down deck 166 to 186: the steel car is wholly off it, 1.5 m short. Up deck 154 to 174.5: all on. Plank crossing at 145.6 to 148: 13.3 m clear | Accept (decided call 5). A rider on the steel car going home steps down to the ballast |
| 3 | Far Head (524) | Tail 511.3: the car's last 1.7 m off both decks (513 to 535) and 0.7 m over the end of the crossover (490 to 512), which no train takes once the pier is open | Accept |
| 4 | **Pier (726.5)** | Tail 713.8: the steel car is wholly off the deck (719 to 741), 2.0 m short, over the open trestle. Today the wagon's last 1.5 m is. Only homeward trains stop there | For the designer: accept, or V1 leaves the steel car's deck unstandable (no platform, collider kept). Not checked: where a player who steps off there lands |
| 5 | Railhead and each stack head | Stop 10 m short of the end, platform the last 25 m: tail 2.3 m inside the platform; the reserved nose 1.8 m short of the buffer; tail 7.3 m past the stub's merge | Accept |
| 6 | Ring Island (u 448) | Level-check's row above. The works (u 448 to 455) is ahead of the steel car (u 435.3 to 438.5, or 439.0 to 442.2 on a plain train) by 10 m: steel is aboard with no hop, so nothing reaches | Accept; the hop, when built, crosses 10 m of platform |
| 7 | **High Gorge (3,230.4)** | Platforms 3,210.4 to 3,250.4: all on. Crossover 3,195.4 to 3,217.4: the tail at 3,217.7 is **0.3 m clear** of it (today 4.0 m), on the same track | Accept; one train holds the end block, so nothing passes on the crossover |
| 8 | A live head's kit rack (8 m behind the stop) | On a plain fitted train the steel car (7.4 m behind) is abreast of it, not the kit car (3.7 m) | Accept; step 4b's kit hop reads the kit car's place, not the rack's |
| 9 | Reach of an ability | The car is a 0.7 m deck 3.7 m further back than any today: every "late jump off a train" row in `dev/level/ring.ts` gets shorter from it. V2 adds the row | None expected |

## 8. Risks

- **Room safety.** A constant feeding `apply` (the block rule) and a reach check change; no rule gains a branch.
  `trainRowBroken` rejects a v32 save's Village stand, which is why the bump is not optional. No presence, transport or
  save-shape change.
- **Hotspots.** `railway-lines.ts`, `railway-trains.test.ts` and the golden fixtures are touched by every rail step:
  R1 and R2 go in one batch, rebased last. The short turn's plan and leg 1 step 5 will read the same constants.
- **The bump** wipes rooms. v31 and v32 shipped on 12 November; a third in two days is the owner's to time (not
  mid-session).
- **Layout B** is behind `?home=b` but its test reads the catalog's stop: R2 edits `test/home-station.test.ts`, which
  must not be read as B being finished for four cars (the flip owns road 2's deck and the car's road).
- **6.5 m nose to tail** at the block floor is new to look at (a follower held at a signal behind a standing wagon
  train). Nothing collides; C1's look includes it if the bot meets it.
- **Performance.** Five more kinematic car bodies, platforms and meshes, and one box batch re-targeted; no light, no
  tick work. `npm run perf` at C1 and the cost reported; not a reason to cut the car.
- **Copy.** New strings are placeholders (V2). "It runs faster and pulls one more car." is kept and becomes true on
  the wagon's train; on the others see question 1.
- **Not proven by this plan:** anything on 48 seeds; a phone; the Pier step-off (finding 4).

## 9. Open questions for the designer

Calls 19 to 21, level findings 1, 4 and 7, and the section 5 rule ("no worse than main by more than 10 ticks or 0.3
points on the same 48 seeds").

## 10. Owner questions

1. **Which trains are four cars long?** The footing wagon is one car on one train, so after the install that train
   pulls four and the others three, each with the steel car last.
   - **Ship that; every train gets its own wagon when the consist build comes (recommended).** True to "pulls one
     more car" on every train, and nothing new to carry.
   - Give every line 2 train a footing wagon now: a second rules step (the wagon's rules assume one), and gates 5 and
     14 re-run.
2. **The steel car is empty after the twelfth steel comes home.** The works casts twelve in all and the install
   spends none.
   - **Ship it; the bigger cradle, the next steel pick, is what fills it again (recommended).**
   - Let the works keep casting to a capped stack in the bay now (a pacing change with no sink yet).
3. **Bump to v33 now?** A third wipe in two days; the change is small but cannot ship without it.
   - **Yes, at the next session boundary, batched with whatever else needs a bump (recommended).**
   - Hold the branch until leg 1 step 5 or the short turn bumps.

## Design review (designer, 2026-11-12)

**Cleared to build**, with the step changes at the end. Nothing waits for the owner.

**Read.** DESIGN.md; owner-calls; rail and core-loop Current rules and the entries cited below; the garage ruling
(R1, R2); engine-garage finding 3; orchestrator-state (call 109, rules 19 and 25);
[progression-flow-layout](../research/progression-flow-layout.md) (the three firm rules),
[route-contract](../research/route-contract.md), [upgrade-economy](../research/upgrade-economy.md) (an upgrade names
its site and effect). `npm run loop -- node steelhome` and `node install`; `rail.install`
(`src/sim/railway-sys-steel.ts:193`). **Measured** (a throwaway test on this branch, removed): the stand, barrel and
legs against line 2. **Looked at:** `--rail-seed steel-home` from line 2's platform end towards the stand, and
`--rail-seed boiler-long` at the Pier's landward end. **Not seen:** the car itself (not built), the 18.25 mark, a
train standing at either place, anything moving, the Gorge. **Playtest data:** `node dev/playtest/cli.ts` has no
session that reached steel; nothing to weigh.

### Calls

| # | Call | Kind | Source or ruling |
| --- | --- | --- | --- |
| 1 to 8 | As the plan's table | Decided | As cited there; all hold |
| 22 | Every train of a line runs the same cars, bought once | Decided | [the train garage](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy), answer 5. The steel car on every line 2 train obeys it; the wagon is the standing exception |
| 23 | The bump ships when the branch is ready, after a `npm run heartbeat` check for a live session. Not batched, not held | Decided | owner-calls, "Nothing waits on a world bump" (10 November: "ships when it is ready, not batched for a later bump"). The plan's question 3 and its "batched" answer are withdrawn |
| 9 to 12, 14 | Derived from `boiler >= 1`; last car; one extent 8.2 and 12.7 m; `sepCm` kept | Default | Ship |
| 13 | Line 2's Village stop at 18.25 m | Default | **18.25, confirmed.** Finding 1 |
| 15 | Steel on the steel car when fitted, the kit car otherwise, 6 a trip | Default | Ship. See call 20: in play this is one trip at most |
| 16 | A standable deck, no seats, everywhere, the Pier included | Default | Ship. Finding 3 |
| 17 | The coupling is a second clank under the platform beat's puff; no shunt | Default | Ship. Finding 4 adds one case |
| 18 | The "Steel car" tile, free once fitted | Default | Ship; its pill reads "Owned" (decided call 2: "the screen shows it owned"). "Free with steel" reads as a price |
| 24 | The checkpoint bar: no 48-seed figure worse than the 12 November sheet by more than 10 ticks or 0.3 points, **and** every worst under 1,600 | Default | Finding 6 |
| 25 | High Gorge: the tail 0.3 m clear of the crossover is accepted and pinned by a test | Default | Finding 5 |
| 26 | A second part waiting on today's stand would graze the wagon train's steel car; whoever comes first, the Home flip or the next steel part's plan, re-places the stand | Default | Finding 2 |
| 19 | The wagon's train is one car longer than the others | **New** | **Ship it.** Every train visibly gains one car, so "pulls one more car" is true on each. "Cars it pulls 3 to 4" counts cars behind the engine: exact on the wagon's train, 2 to 3 on the others. The mixed look exists today (one train has the wagon) and ends with the consist build under call 22. A wagon for every train now is unapproved scope and re-opens gates 5 and 14 |
| 20 | The steel car runs empty once steel is home | **New** | **Ship it; a visible job is not this plan's.** Finding 7 |
| 21 | `kitTrains` stays "running trains less one" | **New** | **Keep.** It re-opens gates 13 and 14 while waits are over the owner's limit; the short turn's plan takes it |

Ten decided, fourteen default, three new.

### Findings

1. **The stop mark: 18.25.** Measured as built: the stand's legs stand at s 5.84 and 7.26 along line 2, inner faces
   1.28 and 1.72 m from its centre; a car's side is at 1.10 m. So the nearer leg is 0.18 m from the steel car (the
   plan's "about 0.2" is right), the mast about 1.1 m, the crew 1.2 and 2.0 m. 20.7 m breaks layout B's road 2 and
   buys nothing but that 0.18 m. One thing changes for a player: the track inside s 8.0 was the open way from line
   2's platform end to the table, and a standing wagon train now covers s 5.55 to 8.75. The way across is a hop over
   a 0.7 m deck or the 0.75 m behind the tail. Accepted: the car is a deck, and only one train in five does it.
   `test/garage-geo.test.ts`'s note "the tails stop at s 8.0" becomes false and R2 rewrites it.
2. **Ruling R1's "the barrel and the fourth car never meet" holds for this build only.** Today the one part leaves
   the stand at the install that creates the car. With a part waiting for a second install, the barrel's side would
   be 1.07 m from line 2's centre at s 5.55: 0.03 m inside the wagon train's steel car at its rear corner, widening
   to 0.64 m clear at the car's front. No collider, so a visual graze on one train. Call 26; R2 pins the number.
3. **The Pier is decked, not open.** The still shows the trestle planked across both tracks at s 713 to 719, Q7's
   piled deck beside it and the halt's ramp coming down onto the planks. A player stepping off the steel car should
   land on planks, 2 m from the ramp. Not proven: that the planks carry a collider there. V1 proves it with one
   walk-off each side. The car stays standable everywhere (every car is a deck; rule 3, nobody stranded, is met by
   the planks or, failing that, the swim). Unstandable is the fallback only if a player ends up stuck.
4. **Missed: a player standing where the car appears.** After an install the room is at the table, beside s 5 to 12
   of line 2, and the car's collider arrives from y −60 under a puff. V1 shows one case: a player standing on the
   track at the tail when a fit lands ends on the deck or beside it, never inside and never launched.
5. **High Gorge, 0.3 m.** Accepted (one train holds the end block). It is the tightest figure in the plan and
   nothing asserts it: R1 adds the assert so a later stop or extent change re-measures it.
6. **The checkpoint bar is right, with two conditions.** This step is not a spacing fix and must not be asked to
   repair leg 1; it must not spend what is left under the cap either. So: compared against the fixed 12 November
   sheet (1,553, 1,535, 1,548; 7.2% and 3.0%), never a later main, so steps cannot each take ten ticks; and every
   worst under 1,600 (call 109, the owner's to keep or reverse). The footing delivery ticks are printed (rule 13).
7. **The steel car carries steel for one trip at most.** `rail.install` needs one steel in the bay, the works casts
   twelve in all at six a trip, so after the first trip home a room can install and at most the second trip rides
   the new car; a room that installs late sees it carry none. Its job in this build is to be the car the boiler
   pulls, which is what engine-garage finding 3 asked for ("a number is not a payoff"). Casting on with no sink is a
   pacing change and not this plan's. The next steel pick (the bigger cradle) must give the car its load; logged so
   that plan starts from it. Section 3's row and the game-design entry should say "one trip at most", not imply a
   standing job.
8. **Reach.** Finding 9's "none expected" is unproven until V2's row in `dev/level/ring.ts` runs: V2 reports it (no
   new ledge or secret from the tail deck) before C1. `npm run loop -- run` in R2 covers order and softlocks.

**Copy.** "It runs faster and pulls one more car." is kept and comes off the suspect list. Placeholders for the
owner's list: "Steel car", "Came with the longer boiler. 6 steel a trip.", the pill (call 18).

### What the build takes

- **R1.** As planned, plus the High Gorge assert (finding 5).
- **R2.** 18.25 as planned, plus `test/garage-geo.test.ts`: the legs clear the steel car's side by 0.15 m or more
  over s 5.55 to 8.75, the barrel's −0.03 m pinned as the known figure for a second part, the stale note rewritten.
- **R3.** As planned.
- **V1.** As planned, plus: the Pier walk-off, both sides (finding 3); the player at the tail when a fit lands
  (finding 4); the top-down still that shows the 0.18 m at the leg.
- **V2.** As planned, plus: the pill "Owned"; the ring row's result reported; "one trip at most" in the game-design
  entry.
- **C1.** The bar of call 24. The bump ships when ready after the heartbeat check (call 23).

### Owner questions

None blocks. The plan's three are answered: 1 and 2 are logged calls (19, 20), 3 is his standing call (23).

1. **The steel car is empty for the rest of today's game after one trip. Fine until the next steel pick?**
   Recommended: yes; the bigger cradle's plan gives it its load.

## Design ruling on the 48-seed sheet (designer, 2026-11-12)

Ruled on the orchestrator's reported sheet for `car4/rules` (bba431ac4) against main at 789efad45; I did not re-run
it. Reported: leg 1, 14 rows, every mean, p95 and share inside the bar and every worst under 1,600; main's five
stages, 9 of 10 rows inside against main today; footing delivery ticks identical; line 1 unmoved. Two rows break on
the worst alone: light stage 2, 1,213 to 1,270 (seed 1021, an ask cut off by the run's end), and light ring-joined,
856 to 918 (seed 1002, served).

1. **The bar measured the wrong thing for worsts, and is replaced.** A worst of 48 seeds is one wait, and moving a
   stop mark 1.25 m shifts every meeting by a few ticks, so one ask landing either side of a train moves it by a
   headway's worth with nothing getting slower. Two single waits moving 57 and 62 ticks, with mean, p95 and share
   still, are that and not a miss. **The bar as it stands:**
   - **Mean, p95 and the share over 1,050,** each row, on 48 seeds: no worse than the reference by more than 10 ticks
     or 0.3 points.
   - **Worsts are held to the caps in force and nothing else:** 1,350 on main's five fixed stages, 1,600 on every leg
     1 row at both rates (call 109), until the spacing step lands and its own row takes over (light settled 1,350,
     heavy settled 1,500, growing 1,600).
   - **A worst that moves by more than 50 ticks** on a row is re-run on a second seed block. The row passes if that
     block's mean, p95 and share hold and its worst is under the cap. If the worst rises by more than 50 on the same
     row in both blocks it is a pattern, and the sheet comes to the designer.
   - **A wait cut off by the run's end is not a figure.** It is extended until served, on both sides, and the count
     of cut-off asks is printed. 1,270 for seed 1021 is a floor, not the wait.
2. **Main's five stages are re-baselined to main at 789efad45: yes.** A step is judged against the code it lands on;
   the 12 November sheet (eb2d30c0b) predates build 2 and leg 1 step 3, and holding the car to it charges it for
   their cost. "Fixed" was there to stop each step taking ten ticks unseen; that job moves to a ledger: each rail
   ship records its 48-seed sheet and sha in orchestrator-state, and the caps catch the sum. Leg 1's rows are
   unchanged (main today reproduces them).
3. **Main's drift is inside what the owner accepted, and he is told it as a fact, not asked.** Ring-joined's heavy
   worst went 1,120 to 1,322 with means down 25 to 65: fewer long waits on average, one longer tail, under the 1,350
   he picked ("up to about 2 minutes 15") by 28 ticks. It is rule 25 again: the gate's four seeds read 1,166. One
   line in the next report: "on 48 seeds at the heaviest asks, main's built stages now wait 2 min 12 at worst, 3 s
   inside your limit; the average is better". Attributed to build 2 and leg 1 step 3 by the sheets' dates, not
   bisected; no bisect is asked for.
4. **Cleared to ship once the views are reviewed,** on: the rules review (ship, no P1 or P2); identical footing
   ticks; line 1 unmoved; every mean, p95 and share inside the bar on all 24 rows against main at 789efad45; every
   worst under its cap. **One condition, already running:** seed 1021's ask extended until served comes in under
   1,600, and the second block (1030 to 105f) holds mean, p95 and share on the two rows. If the extended wait is
   over 1,600 the step stops and the sheet comes back. The views' review does not wait for it.
