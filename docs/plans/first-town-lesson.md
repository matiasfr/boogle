> **Status: plan, nothing built.** Planner, 16 November, against origin/main `73ee4ecdd`, `WORLD_NS` v54. Builds the
> owner's [answers](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers) to the designer's
> [review](town-choice.md#designer-review-16-november-the-first-town-as-a-lesson) of [town-choice](town-choice.md).
> Follows [town-economy-visible](town-economy-visible.md) (its K1, C1, C2 and K3 stay open there and are not changed
> here). "Plot 1, 2, 3" are the first, second and third priced plots: `TRADE.plots[0][0..2]`, slots `plot3`, `plot2`,
> `plot1` (that plan's N9). `npm run inflight`: nothing in flight touches these files.

# The first town as a lesson: the loader yard, rider places, plot 3's price

## Goal

The first island teaches that a house brings riders and a works building helps the line, and the town's third
building is in reach. Serves the core loop ("grown towns give upgrades that extend your reach"), **7. Telegraph
everything** (the folded arm at the Works from the start) and **11. Show, don't tell** (two board icons, no sentence).
Bends nothing. **Research:** [upgrade-economy](../research/upgrade-economy.md) (an upgrade repays a wait already
felt: the jib), [economy-principles-audit](../research/economy-principles-audit.md) (one box); no departure.

## What changes, in one line each

1. **Plot 2 is the loader yard:** no riders; once built, with the footing wagon coupled, an arm at the Works loads
   footings onto every line 2 train going out, up to 6 a train. Both plots stay offered in the usual order.
2. **Rider places are their own number:** `TRADE.seats` 4 becomes `TRADE.riderPlaces` 8, on the passenger car that
   every line 2 train already pulls; the four player seats (the knifeboard, transient seat rows) are untouched.
3. **Plot 3's base 3,000 → 800:** after two buys it costs 800 × 2 × 2 × 50% = **1,600** at the room's prices.

## Design

| State | Sync kind | Authority and API |
| --- | --- | --- |
| `TRADE.riderPlaces`, plot rows' `base`, `riders`, `gives`; `WORKS.loaderCap` | data | `src/sim` layout files, read by server rules and views alike |
| `Train.riders` up to 8, `Train.foot` on any line 2 train | Server | existing replicated `Train` columns; rule ticks in `railway-sys-trains.ts` / `-trade.ts`, owned by the host's tick |
| The loader being on | Server, derived | `loaderOn(w, tick)`: no field; from `Plot.at`, data and `wagonSlot` |
| `town` fact (the residents' lines) | Local, derived | `townHas` in `src/sim/town-facts.ts`, from the mirror |
| Boards, ghost, jib, arm, deck footings, riders in the car | Local | views over the adapter's read facade; no state, nothing a system reads |

No new op, component, field, projection or predicted action. `rail.buy { id }` (B1) and its 3.2 m board reach (B2)
are unchanged and stay unpredicted. Saves: no new key; a reload restores everything from rows. Prediction: the
predicted `rail.footSet` site 2 already counts footings on every line 2 train (`aboard(w, 'foot')`), so a client's
clone agrees with the server once non-wagon trains carry them; no other predicted op reads the changed rules.

### The loader yard's rules (L1), against town-choice section 4

- **Data.** `TradePlot` gains `riders: number` and `gives?: 'loader'`. Rows: plot 1 `{ riders: 1 }`, plot 2
  `{ riders: 0, gives: 'loader' }`, plot 3 `{ riders: 1 }`. `WORKS.loaderCap: 6` (stand-in).
- **Riders.** `townBuildings` = `startBuildings` + the `riders` of the town's built plots (was: + built count).
  `tillRate`, `tradeTick`, `boxCap` follow unchanged. The doubling still counts every bought plot, the yard
  included (town-choice call 7, kept).
- **On.** `loaderOn(w, tick)` (`railway-queries-trade.ts`): a plot with `gives === 'loader'` is `plotBuilt` **and the
  footing wagon is coupled** (`wagonSlot(w) >= 0`). **Changed from section 4:** the wagon condition. Without it a yard
  bought before the Works is lit would carry the pier's twelve before the stall, cradle and wagon beats, moving the
  route order; with it every measured row (all from `wagon-on`) still holds. Owner question 1.
- **Carriers.** `footCarrier(w, r, tick)`: `r.wagon`, or `loaderOn` and `r` is on line 2 and either already carries
  footings or carries nothing else (`logs + rails + steel + freight === 0`). Capacity `footCap(r)`: `wagonCap` for the
  wagon, `loaderCap` otherwise.
- **Load** (`wagonArrives` becomes `footingsArrive`, `railway-sys-trains.ts`, one apply on arrival as today): at the
  quarry (stop 1) a carrier loads `min(footCap − foot, Works.rack, footOwed(w, aboard(w, 'foot')))`. The owed count now
  takes **every** line 2 train's footings (today `footOwed(w, row.foot)`, right only while one train carries them).
  **Changed from section 4:** a non-wagon carrier loads only going out (`trainDir > 0`, its service stop's way), so a
  homeward train standing for stone never swaps its stone for footings; the wagon is unchanged (either way).
- **Unload** as the wagon's, for any carrier: at the Pier (stop 3) before Q7 everything onto `pierRack`; at the
  Railhead (stop 4) up to the railhead rack's room, the rest rides on.
- **Stops.** `serviceOf`'s three wagon clauses read `footCarrier` / `footCap` and `footOwed(w, aboard(w, 'foot'))`.
  Trains step in slot order, so two carriers at the quarry in one tick load deterministically (the lower slot first).
  Headway exemption stays the wagon's only (call 8, kept). `holdOff` is unchanged (it already holds off while owed).
- **One deck, one cargo.** A non-wagon train with `foot > 0` takes no stone (`freightLoads`), no Q-job kit (the
  Village load in `standing`), no steel (`steelLoads`) and no leg kit (`legKitLoad`): one guard,
  `deckHeld(r) = !r.wagon && r.foot > 0`. The wagon's train still takes any kit, so a kit is never stranded by
  footings riding on.
- **Already owed or aboard when the yard completes:** nothing moves. The wagon keeps its load; from `at + buildTicks`
  (with the wagon coupled) the next line 2 train arriving at the quarry going out with an empty deck loads. Loads are
  capped by the owed count, so no footing is ever aboard past what the pier or the ring needs, and none waits aboard
  across the pier-to-Q7 gap (`ringOwed` is 0 until Q7 is laid, as for the wagon).
- **Refusals.** None new: the loader is a tick rule; `rail.buy` keeps its refusals (unstaked, bought, short, far).
- **Invariants.** `checkTrade(w, tick)`: a non-wagon train with `foot > 0` is on line 2, `loaderOn`, `foot ≤
  loaderCap`, and carries nothing else; riders ≤ `riderPlaces`. `checkWorks`: the `(r.foot > 0 && !r.wagon)` clause
  moves to `checkTrade` (it needs the tick); footing conservation is unchanged (`wagonFoot` already sums every train).
- **The suspect line's fix (no copy).** `townHas(r, 'town')` is true only when a built plot has `riders > 0`, so
  Pip's "New neighbours. All employed. I checked." and the three others (`town-lines.ts` 54, 86, 136, 168) never fire
  for the yard; a room that buys the yard first hears them at its first house. `stone` is unchanged (plot 3 built).
- **Save, replay, mixed builds.** No shape change; rail-schema should not move (verify). `WORLD_NS` **v55** (or the
  next free), dated: "plot 2 is the loader yard (no riders); with it built and the wagon coupled every line 2 train
  loads footings at the quarry going out; rooms that bought plot 2 as a house start fresh". The bump is for the saved
  meaning of a bought plot 2; no compatibility code. Replay fixtures re-pinned naming those two inputs.

## Steps

Each leaves `node dev/ship-check.ts` green. **Tier** is `npm run review-stamp`'s rule (`src/sim`, `src/world`,
tests asserting them: independent review). Who builds, from `npm run models`. Player-visible steps also get the main
session's visual review of their stills.

- [ ] **S1. Rider places and plot 3's price (S).** Sync: Server (rules and data). Tier: **independent review**.
  Builds: Codex gpt-6.1-sol medium; review a fresh gpt-6-astra (medium as a first pass). Parallel with V1.
  - `src/sim/railway-trade-layout.ts`: `seats: 4` → `riderPlaces: 8` with a comment (riders' places on the
    passenger car, not the player seats; decision 16 November); plot 3 `base: 800`.
    `railway-queries-trade.ts`: `trainSeats()` → `riderPlaces()` (header comment too); `railway-sys-trade.ts`
    `ridersBoard`; `railway-check-trade.ts`. `dev/economy/trade-data.ts`: the `seats.perCar` row becomes
    `riders.perCar`, "Rider places a train", 8. `test/railway-trade.test.ts`: the `TRADE.seats` uses.
  - Tests: a train boards 8 and not a 9th; `checkTrade` refuses 9; after plots 1 and 2 are bought plot 3 is priced
    1,600 at 50%; from `q6-done` three added houses land at least 88 a minute (probe 90.9; 72 at 4 places).
  - No `WORLD_NS` bump: no op, state shape or catalog entry changes and every saved row stays valid under the new
    numbers (a live room's bought plot 3 keeps its `paid`). Replay fixtures re-pinned only if they move, naming the
    rider cap. **Done means** the tests pass and `npm run loop -- run` shows order and bills unmoved.
- [ ] **V1. Riders in their own places (S).** Sync: Local. Tier: normal + visual. Builds: gpt-6-astra high. Parallel
  with S1, no shared file; ship with or right after it.
  - `src/place/folk.ts`: `RIDERS` = `TRADE.riderPlaces`; rider `k` stands (not sits) at one of eight places on car 1's
    deck **clear of the bench's four seats and the walk-on aisle** (today riders sit at the bench's seat offsets, on
    the players' seats). `src/entities/railway/train-view.ts`: the clamp `Math.min(4, …)` → `TRADE.riderPlaces`.
  - Garage Cars tile (`src/entities/railway/garage-data.ts`): "Four seats" becomes **"Four seats, eight riders"**
    (placeholder), desc "The knifeboard passenger car: four seats for players, places for eight riders." (placeholder;
    today "four riders and four pets"), the stats row Seats 4 plus a **Riders 8** row. `docs/plans/garage-choices.md`'s
    tile table follows.
  - **Proof:** `npm run look -- --rail-seed fares-running`: a still of a line 2 train boarding with 8 riders aboard
    and one with a player sat on the bench beside them (no figure in a seat, none through the bench); the Cars tab
    still. **Done means** those stills opened, figures clear of seats, cost of 4 more figures a train reported.
- [ ] **L1. The loader yard's rules (M).** After S1 (shares `railway-trade-layout.ts`, `railway-check-trade.ts`).
  Sync: Server. Tier: **independent review**. Builds: Codex gpt-6-astra high; review a fresh gpt-6-astra high (or opus
  high). Rules as in Design. Files: `src/sim/railway-trade-layout.ts`, `railway-works-layout.ts` (`loaderCap`),
  `railway-queries-trade.ts` (`loaderOn`, `footCarrier`, `footCap`, `deckHeld`, `townBuildings`),
  `railway-sys-trains.ts`, `railway-sys-trade.ts` (`freightLoads`), `railway-sys-steel.ts`,
  `railway-sys-route-kit.ts`, `railway-check-trade.ts`, `railway-check-works.ts`, `railway-queries-works.ts`
  (comments), `src/sim/town-facts.ts`, `src/world/namespace.ts`, fixtures.
  - **Seeds** (`railway-seed-trade.ts`, `railway-seeds.ts`, all from accepted ops): `yard-ready` (`house-built`
    advanced until plot 2 is staked and the box holds its 800; the ghost's still), `yard-built` (an accepted
    `rail.buy { id: 1 }` plus `buildTicks`); `railwayAtWorks` and `railwayAtRing` take a base seed, so `yard-wagon` is
    `wagon-on` and `yard-deck` is `deck-laid` on `yard-built`.
  - **Jump row** (`src/world/railway-jump.ts`): `yard-wagon`, label **"Loader yard"**, line "The loader yard stands;
    footings ride every line 2 train" (placeholders), `menu: false` as the house rows; landing at the quarry halt
    facing `WORKS_RACK` (a new constant, checked in V2's still).
  - **Tests** (`test/railway-trade.test.ts`, `test/railway-works.test.ts`, `test/town-facts.test.ts`): plot 2 adds no
    riders, plot 1 and 3 one each; `loaderOn` false before `at + buildTicks` and before the wagon couples; from
    `yard-wagon` the pier's twelve are racked in at most 135 s (instant carrying; 155 today) and from `yard-deck` the
    ring's eighteen in at most 200 s (303 today); conservation every tick; a train with stone takes no footings going
    home and one with footings takes no stone, kit, steel or leg kit; the wagon's train still takes a kit with a
    non-wagon train full of footings; two carriers at the quarry in one tick; the owed count over two trains never
    overshoots (no footing aboard past 12 for the pier); save round-trip mid-load; determinism; `town` stays false
    with only the yard built, true at the first house.
  - **Proof:** `npm run checkpoints -- yard-ready yard-built yard-wagon yard-deck`; `npm run loop -- run` with order
    and bills unmoved. **Done means** tests, checkpoints and loop pass, fixtures re-pinned with the named inputs.
- [ ] **L2. The loop graph and the model (S).** After L1. Sync: none (tools). Tier: normal. Builds: gpt-6.1-sol
  medium. Parallel with V2. `dev/loop/graph.ts`: the crossing, bents and weights supplies read "wagon, or every line 2
  train once the loader yard stands"; `dev/economy/trade-data.ts`: plot rows' `riders` and `gives`, `loader.works`
  becomes plot 2 (offered when staked, price from `TRADE`), plot 3's 800; `docs/world/trade-economy.html`
  regenerated. **Done means** `npm run loop -- run` unmoved and `npm run economy` shows plot 2 as the yard.
- [ ] **V2. The yard, the arm, footings on decks (M).** After L1. Sync: Local. Tier: normal + visual. Builds:
  gpt-6-astra high. Parallel with L2.
  - `src/entities/town/plots.ts`: an offered plot with `gives: 'loader'` paints the **footing icon** (the Works rack
    board's) and **"Every train"** where plot 1 paints the rider and "+1 rider / minute"; price and box as now. Its gold
    ghost: the house shell with a jib on its quarry-road side, hook over a footing on its step; built: the same closed
    shell and hulls (B2's) plus the jib and two footings on the step, view only, inside the footprint.
  - `src/entities/railway/works-view.ts`: the **arm** beside `WORKS_RACK` on its track side, drawn from the start of
    the Works view, folded and grey; once `loaderOn` it takes its colour and swings a footing onto a standing train on
    each row edge where a non-wagon line 2 train's `foot` rises at stop 1. No collider.
  - `src/entities/railway/train-view.ts`: footings on car 2's deck for any line 2 train from `Train.foot`
    (`footingParts`, the wagon's footing mesh); the footing flights (`footFlights`) generalised from the wagon to any
    carrier: rack to that train's deck at the quarry, deck to the pier or railhead rack.
  - **Proof:** `look --rail-seed yard-ready`: from the hall's front (both boards, the yard's ghost), from the island
    (its ghost seen or reported hidden); `--rail-seed yard-built` from the quarry road; `--rail-seed works-open` (the
    folded arm); `--rail-seed yard-wagon`: the arm loading a second train, once in real time, and a non-wagon train
    arriving at the Pier with footings; the jump row's landing. **Done means** those stills and the clip opened by
    the main session, and `npm run level-check` unchanged (no solid added).
- [ ] **A. Passenger cars sized for riders: the art job (M; previz S).** Independent of the rules; after V1, whose
  places it replaces. Sync: Local. Tier: normal + visual. Previz: Codex gpt-6.1-sol medium (only Codex paints); build:
  gpt-6-astra high with the asset-author skill on `src/entities/railway/car-kit.ts`. **Brief:** the owner's words,
  "designed passenger cars and trains that are size appropriate". Design line 2's passenger car at the little guys'
  scale so eight riders read as passengers of this car (their own places, not the player bench), beside the four
  player seats, which keep their bench, Sit and colliders. The car comes with every passenger train; nothing is bought
  on the first island. Fit the existing car kit, the rock frame and the train's length; consider whether the train
  around it needs resizing. An optional count ("Riders <n> / 8", placeholder) only if the design wants one. The owner
  sees the previz before the build. Not designed in this plan.
- [ ] **R. Runner: the loader's times on the built branch (S).** After L1 (and V2 if built). Builds: gpt-6.1-sol
  medium; changes no game code. Rerun town-choice 2b's harness from `yard-wagon` and `yard-deck`, instant, solo (4.4 s
  a set) and trio (1.5 s): today's historical figures, pier 182 → 155 s and ring 339 → 203 s solo, were measured on
  `a71077c4b` and never rerun. **Done means** the three rows per site recorded under this step with the commit; a
  solo saving under 10 s at the pier or 60 s at the ring goes to the designer, untuned.
- [ ] **K. Checkpoint.** `npm run check:full`; `npm run loop -- run`; `npm run scenario -- town-buy` (the buy contract
  is unchanged, so no new scenario); `docs/game-design/place.md`'s town section gains rider places, plot 3's price and
  the yard (one edit, after V2); the backlog row updated.

**Order and bumps.** S1 and V1 first, in parallel, shipped as a pair (or S1 alone first): no bump, and the third
house pays as soon as plot 3 is affordable. Then L1, the **one** bump (v55). Then V2 and L2 in parallel, then R and K.
A runs whenever an agent is free, after V1. If town-economy-visible's C1 (the sack, a new op) is built on the same
branch as L1, they share v55; otherwise each takes the next free number. S1, V1, L2, V2, A, R and K never bump.
Hotspots: `railway-sys-trains.ts`, `train-view.ts`, `namespace.ts`: rebase first.

## Level findings

`npm run level-check -- --place=place` on `73ee4ecdd`: exit 0, 12 reports; town houses 0 failures, 9 solids, roofs
23.2 m (as town-choice found on `a71077c4b`). Nothing is placed outside existing footprints: plot 2 keeps the house
slot, shell and hulls, so the rooftop chain (town-economy-visible finding 7, accepted) is unchanged; the jib and step
footings are view only; the arm has no collider and stands on the rack's track side, so reach does not change; riders
in the car have no collider. V2 reruns the check.

## Risks

- **Room safety.** No effect in a system: the arm, flights and deck footings draw from `Train.foot` row edges; views
  treat `buy()` as queued. No `Math.random`, wall clock or trig in the rules; integers only.
- **Order.** The loader moves no beat (owner question 1); `npm run loop -- run` proves order and bills each rule step.
- **One deck, one cargo** may delay a leg or steel kit while every non-wagon train rides on with footings; the wagon's
  train always takes it, so nothing strands (an L1 test).
- **Mixed builds.** One bump, no compatibility code; an old tab may draw 4 riders or misprice plot 3 until it reloads
  (accepted in development).
- **G-c, the bigger cradle,** is worth less once every train carries footings: garage-choices re-checks its value
  when it is built (town-choice's note, kept).
- **Performance.** Four more rider figures a train (V1), one arm, at most 6 footings on two more decks; reported in
  K3's `npm run perf`, not a gate.

## Strings for the owner (placeholders; none of The Boogler's copy touched)

New: "Every train" (plot 2's board, with the footing icon); the jump row "Loader yard" and its line "The loader yard
stands; footings ride every line 2 train"; the Cars tile "Four seats, eight riders", its desc "The knifeboard
passenger car: four seats for players, places for eight riders." and its stats row "Riders"; optionally the art job's
"Riders <n> / 8". **Suspect existing lines:** the residents' "new neighbours" lines (`town-lines.ts` 54, 86, 136,
168) firing on the yard, which houses no one: L1's non-copy fix keeps them for houses only; the words are his.

## Owner questions (each step builds on the recommendation; nothing waits)

1. **The loader runs only once the footing wagon is coupled, so a yard bought early never carries the pier's
   footings before the stall, cradle and wagon?** Recommended: **yes**. Or from the yard's completion, which can move
   the Works' order for a room that buys it before the kiln.
2. **Until the art job, riders stand on the passenger car's deck around the bench (eight places, none in a player
   seat)?** Recommended: **yes**, as the honest stand-in. Or keep riders sitting in the four seats until the car is
   designed, drawing at most 4 of the 8 aboard.
3. **Start the passenger-car previz now, alongside S1, rather than after the yard?** Recommended: **yes**: it changes
   no rule and the owner sees it before any build.
