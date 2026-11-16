> **Status: S1 + V1 reworked together on `t3/first-town-rider-places`: four countable rider places now;
> eight await coach A. Pending independent review; remaining steps unbuilt here.
> S1 keeps v54: four rider places now, eight with the dedicated coach. L1 takes the next free namespace after v54.
> Designer-reviewed 16 November: build with changes (folded into S1, V1, L1, V2, A and
> the order; the three owner questions are agent defaults, none asked).** Planner, 16 November, against origin/main `73ee4ecdd`, `WORLD_NS` v54. Builds the
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
2. **Rider places are their own number:** `TRADE.seats` 4 becomes `TRADE.riderPlaces` 4, on the passenger car that
   every line 2 train already pulls; the four player seats (the knifeboard, transient seat rows) are untouched.
   Eight rider places arrive with the [dedicated coach](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework),
   not this stand-in (orchestrator, 16 November: what is on screen must be true).
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
- **Save, replay, mixed builds.** No shape change; rail-schema should not move (verify). `WORLD_NS` **the next free
  number after v54**, dated: "plot 2 is the loader yard (no riders); with it built and the wagon coupled every line 2 train
  loads footings at the quarry going out; rooms that bought plot 2 as a house start fresh". The bump is for the saved
  meaning of a bought plot 2; no compatibility code. Replay fixtures re-pinned naming those two inputs.

## Steps

Each leaves `node dev/ship-check.ts` green. **Tier** is `npm run review-stamp`'s rule (`src/sim`, `src/world`,
tests asserting them: independent review). Who builds, from `npm run models`. Player-visible steps also get the main
session's visual review of their stills.

- [x] **S1. Rider places and plot 3's price (S).** Sync: Server (rules and data). Tier: **independent review**.
  Builds: Codex gpt-6.1-sol medium; review a fresh gpt-6-astra (medium as a first pass). Parallel with V1.
  - `src/sim/railway-trade-layout.ts`: `seats: 4` → `riderPlaces: 4` with a comment (riders' places on the
    passenger car, not the player seats; decision 16 November); plot 3 `base: 800`.
    `railway-queries-trade.ts`: `trainSeats()` → `riderPlaces()` (header comment too); `railway-sys-trade.ts`
    `ridersBoard`; `railway-check-trade.ts`. `dev/economy/trade-data.ts`: the `seats.perCar` row becomes
    `riders.perCar`, "Rider places a train", 4. `test/railway-trade.test.ts`: the `TRADE.seats` uses.
  - Tests: `places + 1` wait, exactly `TRADE.riderPlaces` board, one waits, and a full train boards nobody;
    `checkTrade` refuses `places + 1`; after plots 1 and 2 are bought plot 3 is priced
    1,600 at 50%; from `q6-done` two through five buildings land exactly 36, 54, 72 and 72 a minute at four places.
  - **As built: no world bump.** S1 keeps v54 and the four-place cap. Main's golden fixture, namespace,
    cart namespace assertion and host trace are restored unchanged; all golden stages and the host trace pass.
    Historical payments and above-cap balances remain valid. L1 needs the next free number after v54.
    **Done means** the tests pass and `npm run loop -- run` shows order and bills unmoved.
- [x] **V1. Riders in their own places (S).** Sync: Local. Tier: normal + visual. Builds: gpt-6-astra high. Parallel
  with S1, no shared file, but it reads S1's `TRADE.riderPlaces`: build on S1's branch; ship with it.
  - `src/place/folk.ts`: `RIDERS` = `TRADE.riderPlaces`; rider `k` stands (not sits) at one of four places on car 1's
    deck **clear of the bench's four seats and the walk-on aisle** (today riders sit at the bench's seat offsets, on
    the players' seats). `src/entities/railway/train-view.ts`: the clamp `Math.min(4, …)` → `TRADE.riderPlaces`.
    _Designer: "clear" also means clear of a seated player's legs (they face out to about ±0.8 m) and of each seat's
    stowaway perch. Stand them at the deck's two ends and outer corners, facing out over the side as the seated ones
    do, on the car's rock (they take its pitch and shudder); riders may crowd one another (a full car reads as full and
    is the stand-in the art job fixes), never a player, a seat or a pet. Places are a local table, no collider._
  - Garage Cars tile (`src/entities/railway/garage-data.ts`): "Four seats" becomes **"4 seats, 4 riders"**
    (placeholder, both numbers read from data), desc "The knifeboard passenger car: 4 seats for players, places for 4 riders." (placeholder;
    today "four riders and four pets"), the stats row Seats 4 plus a **Riders 4** row. `docs/plans/garage-choices.md`'s
    tile table follows.
  - **Proof:** `npm run look -- --rail-seed fares-running`: a still of a line 2 train boarding with 4 riders aboard
    and one with a player sat on the bench beside them (no figure in a seat, none through the bench), plus one with a
    pet on the bench and one of a player walking the deck's length (report any figure walked through); the Cars tab
    still. A dressing-only fill up to 4 is fine for the still; say the count shown. **Done means** those stills opened, figures clear of seats, 1/2/4 counts read distinctly and all four places clear the car, seated players and pets.
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
    with only the yard built, true at the first house. S1's fares test moves to plots 1 and 3 (two added houses).
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
    the Works view, folded and grey; _designer:_ **once the yard is built** (`plotBuilt`, not `loaderOn`) it takes its
    colour and stays folded, so the buy shows at the Works at once; it swings a footing onto a standing train on each
    row edge where a non-wagon line 2 train's `foot` rises at stop 1, which needs the wagon coupled and footings owed.
    Coloured and folded is "yours, nothing to carry yet" (before the wagon, and between the pier and Q7). No collider.
  - `src/entities/railway/train-view.ts`: footings on car 2's deck for any line 2 train from `Train.foot`
    (`footingParts`, the wagon's footing mesh); the footing flights (`footFlights`) generalised from the wagon to any
    carrier: rack to that train's deck at the quarry, deck to the pier or railhead rack.
  - **Proof:** a still of the coloured, folded arm on `yard-built` (built before the wagon: the Works chain's
    stall bill showing); `look --rail-seed yard-ready`: from the hall's front (both boards, the yard's ghost), from the island
    (its ghost seen or reported hidden); `--rail-seed yard-built` from the quarry road; `--rail-seed works-open` (the
    folded arm); `--rail-seed yard-wagon`: the arm loading a second train, once in real time, and a non-wagon train
    arriving at the Pier with footings; the jump row's landing. **Done means** those stills and the clip opened by
    the main session, and `npm run level-check` unchanged (no solid added).
- [ ] **A. Passenger cars sized for riders: the art job (M; previz S).** Independent of the rules; after V1, whose
  places it replaces. Sync: Local. Tier: normal + visual. Previz: Codex gpt-6.1-sol medium (only Codex paints); build:
  gpt-6-astra high with the asset-author skill on `src/entities/railway/car-kit.ts`. **Brief:** the owner's words,
  "designed passenger cars and trains that are size appropriate". Design line 2's passenger car at the little guys'
  scale in a dedicated coach: [coach A and the rework decision](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework)
  supersedes fitting eight on this car. Today's four player seats keep their bench, Sit and colliders. The car comes with every passenger train; nothing is bought
  on the first island. Fit the existing car kit, the rock frame and the train's length; consider whether the train
  around it needs resizing. The owner sees the previz before the build. Not designed in this plan. _Designer, added
  to the brief:_ anchor on a real still of a line 2 train at a halt with V1's standing riders, a seated Buddy and a pet
  ([previz](../agents/owner-calls.md#previz): the game's camera and materials, chunky shapes, no rescaled characters);
  the sizes that bind (little guy about 0.95 m; deck 0.7 m, flatbed 2.2 × 3.2 m, the fit's 2.55 m overhang limit; halt
  deck 0.72 m high, its edge 1.65 m from the track; the halts' length against a longer car or train); the
  [passenger-car previz](passenger-car-previz.md)'s history (he picked Four, the knifeboard, on 10 November: keep it);
  two candidates (riders' places on the passenger car itself; a car with a rider deck or compartment and the train
  lengthened to fit) as the 10 November previz offered two; plan and halt views like that previz's; front, side and
  back sheets of the pick. No rider counter: the figures are the count
  ([machines show their work](../agents/owner-calls.md#physical-work)). Start the previz now, beside S1.
  - Previz decision page: [Rider cars](../world/rider-cars.html) — two candidates and recommended bay; no build or approval claimed.
  - Look previz: [three period rider coaches](../world/rider-coach.html), with scaled elevations, minimum lengths and recommendation (16 November; dedicated car, earlier layout candidates superseded).
  - Fit gate: [rider-car fit research](../research/rider-car-fit.md) — 2.90 m coach after the player car; Home link rework and Ring stop shift required before art.
- [ ] **R. Runner: the loader's times on the built branch (S).** After L1 (and V2 if built). Builds: gpt-6.1-sol
  medium; changes no game code. Rerun town-choice 2b's harness from `yard-wagon` and `yard-deck`, instant, solo (4.4 s
  a set) and trio (1.5 s): today's historical figures, pier 182 → 155 s and ring 339 → 203 s solo, were measured on
  `a71077c4b` and never rerun. **Done means** the three rows per site recorded under this step with the commit; a
  solo saving under 10 s at the pier or 60 s at the ring goes to the designer, untuned.
- [ ] **K. Checkpoint.** `npm run check:full`; `npm run loop -- run`; `npm run scenario -- town-buy` (the buy contract
  is unchanged, so no new scenario); `docs/game-design/place.md`'s town section gains rider places, plot 3's price and
  the yard (one edit, after V2); the backlog row updated.

**Order and bumps.** S1 and V1 first, built and shipped as a pair, retaining v54 and four rider places.
Plot 3 costs 1,600; its extra demand is capacity-limited until the coach. L1 takes the next free number after v54.
Then V2 and L2 in parallel, then R and K.
_Designer: V2 is built on L1's branch and the two ship together (each reviewed at its own tier): L1 alone puts
footings on trains with no deck footings, flights or arm drawn, so the pier rack fills from nothing on the live game.
S1 and V1 ship as one pair. The four-place rework leaves main's goldens unchanged; do not re-pin them._
A runs whenever an agent is free, after V1. If town-economy-visible's C1 (the sack, a new op) is built on the same
branch as L1, they share L1's next free namespace; otherwise each takes the next free number.
V1, L2, V2, R and K never bump on their own. The dedicated coach owns its later eight-place rule change
and any resulting bump; the original local-only A brief does not waive that requirement.
Hotspots: `railway-sys-trains.ts`, `train-view.ts`, `namespace.ts`: rebase first.

## S1 + V1 as built (16 November 2026, four-place rework)

`TRADE.riderPlaces` is **4** throughout boarding, validation, the view and the offline economy model, separate
from the unchanged four player seats. Eight arrive with the
[dedicated rider coach A](../decisions-rail.md#d-2026-11-16-rider-coach-a-and-rework), after its halt rework.
Today's car must show everyone it carries. Plot 3's base is 800, priced at 1,600 after two purchases at 50%.
From `q6-done`, two/three/four/five buildings land exactly **36/54/72/72 fares per minute** after a five-minute
warm-up and over a ten-minute measurement. The third house does not lift landed fares past the four-place cap.
The full three-plot purchase bill is 2,550. Above-cap Boogles and historical paid prices remain valid; clients
publish mirrors and predict on clones without `checkTrade`.

S1 keeps **v54**. Main's golden fixture, namespace, cart assertion and host trace are restored byte-for-byte;
all 49 golden stages (including the 29 later stages) and the complete host trace pass unchanged. L1 must take
the next free number after v54. No golden or trace re-pin in this rework.
The offline model still drops Six until the dedicated rider-car design gives a fit-out meaning; added rider
cars remain a later hub's garage pick (owner, 16 November). Both economy pages are regenerated from the model.

V1's four-place geometry and count-readability evidence is recorded in the
[four-place rework report](../reports/first-town-four-place-rework.md). Places in fill order are
(−0.78, −1.20, −60°), (+0.78, +1.20, +120°),
(−0.77, −1.02, −120°), (+0.77, +1.02, +60°), in local x/z/yaw. The first two alternate ends; the next two add
a second distinct round hat at each end. The standing pose stays upright on the
car's full rock quaternion and runs after its rendered transform. No counter, collider, rule workaround or
rescaled character. The garage reads its player-seat count from the car-bench prefab and its rider count from
`TRADE.riderPlaces`: "4 seats, 4 riders", the corresponding numeric description and "Riders" are placeholders.

Earlier eight-place reports and rejected-layout stills are historical, superseded by this rework. No L1, L2,
V2, A or R implementation here. Real-time smoothness and device performance are not claimed.

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
- **Mixed builds.** S1 keeps v54; L1 takes the next free number. No compatibility code; an old tab may misprice plot 3 until it reloads
  (accepted in development).
- **G-c, the bigger cradle,** is worth less once every train carries footings: garage-choices re-checks its value
  when it is built (town-choice's note, kept).
- **Performance.** V1 keeps four figures a train; later one arm and at most 6 footings on two more decks; reported in
  K3's `npm run perf`, not a gate.

## Strings for the owner (placeholders; none of The Boogler's copy touched)

New: "Every train" (plot 2's board, with the footing icon); the jump row "Loader yard" and its line "The loader yard
stands; footings ride every line 2 train"; the Cars tile "4 seats, 4 riders", its desc "The knifeboard
passenger car: 4 seats for players, places for 4 riders." and its stats row "Riders". (The art job's
optional "Riders <n> / 8" is dropped by the design review.) **Suspect existing lines:** the residents' "new neighbours" lines (`town-lines.ts` 54, 86, 136,
168) firing on the yard, which houses no one: L1's non-copy fix keeps them for houses only; the words are his.

## Original owner questions (superseded where noted)

_Designer, 16 November: none of the three is the owner's; each is logged as an agent default (see the review). They
stay below as historical context. Question 2 is superseded: four places now; eight with coach A._

1. **The loader runs only once the footing wagon is coupled, so a yard bought early never carries the pier's
   footings before the stall, cradle and wagon?** Recommended: **yes**. Or from the yard's completion, which can move
   the Works' order for a room that buys it before the kiln.
2. **Until the art job, riders stand on the passenger car's deck around the bench (eight places, none in a player
   seat)?** Recommended: **yes**, as the honest stand-in. Or keep riders sitting in the four seats until the car is
   designed, drawing at most 4 of the 8 aboard.
3. **Start the passenger-car previz now, alongside S1, rather than after the yard?** Recommended: **yes**: it changes
   no rule and the owner sees it before any build.

## Design review (designer, 16 November)

**Verdict: build with changes.** The plan builds the owner's [answers](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers)
faithfully; the changes are small and are folded into S1, V1, L1, V2, A and the order (marked _Designer_). Read:
DESIGN core loop, 7 and 11; owner-calls (previz, machines show their work, no old builds, seed goldens, no bump waits,
design calls); the rewards and rail Current rules; [town-choice](town-choice.md) sections 2 to 5 and its review;
[mixed-builds](../agents/mixed-builds.md), [room-safety](../agents/room-safety.md); `npm run loop`; the code each call
rests on (`railway-sys-trains.ts` `wagonArrives`/`serviceOf`, `railway-sys-trade.ts` `freightLoads`/`ridersArrive`,
`railway-queries-trade.ts` `freightStop`/`boxCap`, `railway-check-trade.ts`, `folk.ts` riders, the `car-bench`
prefab); [upgrade-economy](../research/upgrade-economy.md). No still taken: nothing new is placed; V1/V2's stills prove it.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Plot 2 is the loader yard, no riders; its arm loads every line 2 train; no choice asked | Decided | [answers](../decisions-rewards.md#d-2026-11-16-first-town-lesson-answers) (1) |
| 2 | 8 rider places on the car each train already pulls, beside the four player seats; none bought here | Decided | answers (2); [rider seats](../decisions-rail.md#d-2026-11-16-rider-seats-are-not-player-seats) |
| 3 | Plot 3's base 800 (1,600 at the room's prices), ×2 a building kept | Decided | answers (3); 11 November doubling |
| 4 | Loader cap 6; the doubling counts the yard; board icon and "Every train"; grey folded arm from the start | Decided | answers (the review's "Keep": town-choice 2b, call 7, C3); strings stay placeholders |
| 5 | Stone and every economy stop wait while footings are owed | Decided | 12 November ruling (`freightStop`) |
| 6 | (a) The loader runs only with the footing wagon coupled | Default | Required by "a gate keeps its meaning": without it a yard bought before the cradle carries the pier's twelve and the cradle, table and wagon stop gating the crossing. Not an owner question |
| 7 | (b) Non-wagon carriers load going out only; a train with footings takes no stone, kit, steel or leg kit | Default | Keep: see finding 1 |
| 8 | Nothing aboard moves when the yard completes; headway exemption stays the wagon's | Default | Unchanged rules |
| 9 | The residents' "new neighbours" lines fire only for a plot with riders (trigger, not words) | Default | The yard houses no one; the words stay his |
| 10 | Riders stand on the deck until the art job (planner's question 2) | Default | The honest stand-in: sitting in player seats is what the owner called out. Placement rules added to V1 |
| 11 | The arm takes its colour when the yard is built, folded until a train loads (designer) | Default | Finding 1 |
| 12 | L1 ships with V2; S1 with V1 (designer) | Default | Machines show their work: no invisible loader on the live game |
| 13 | Start the passenger-car previz now (planner's question 3) | Default | [Try things early](../agents/owner-calls.md#try-early); it changes no rule |
| 14 | Jump row "Loader yard", its line, menu off; the Cars tile "4 seats, 4 riders", desc and Riders row | Default | Placeholder strings for the owner |
| 15 | No rider counter on the car (drops the optional "Riders <n> / 8") | Default | The figures are the count |
| 16 | Seeds `yard-ready`, `yard-built`, `yard-wagon`, `yard-deck` | Default | Tools, from accepted ops |

No New calls: nothing bends a DESIGN principle or the six-hour, one-to-three-player target.
**Finding 1, the two changed rules (keep both; one view fix).** (a) is right and is the only order-safe reading of
"every line 2 train". Who meets it: the yard lands about 19 minutes after `q6-done` in the usual order, and the
owner's own pace had the wagon about 19 minutes after trains (town-choice 2b), so a solo first-timer buys the yard
within a few minutes of the wagon, on either side; a fast trio buys it after the pier, with nothing owed until Q7. In
both cases the plan as written shows a built yard (jib, footings on its step) and **no change at the Works**: the arm
stays grey and folded, the same as before the buy. That is a teaching fault, a paid building with no visible
difference where it acts. Smallest honest fix (folded into V2): the arm takes its colour when the yard is built and
stays folded; it swings when a train loads. Coloured and still reads "yours, nothing to carry yet"; every visible bill
before the wagon already points at the stall, cradle and wagon, so the player is not sent looking for a missing
step. An arm that unfolds over a full rack and loads nothing would read as broken, so it stays folded. Payoff holds: solo, the pier's loads ride two trains from the wagon's first trip (−26 s, and footings visibly
on the passenger train's deck); trio, the ring's eighteen (−118 to −136 s) follow Q7 within minutes.
(b) does not starve plot 3 or the line: footings load only while owed, and while they are owed the 12 November ruling
already adds no stone stop on line 2, so plot 3's sixteen stone (which move only after the pier's twelfth) are not
delayed outside that window; between the pier and Q7 nothing is owed and decks are free; once the ring's footings
are in, none are aboard (the owed count includes what is aboard). Kits: Q7's opens after the pier, and its kit
loads at the Village on a train that has unloaded its footings at the Pier; leg kits during the ring wait at most for
the wagon's train, which always takes them (L1's test). Steel opens after the rivet, after every footing.

> **Later orchestrator ruling (16 November):** the eight-place assumptions in findings 2–5 and the old
> placeholder copy below are superseded. Four are carried and drawn now, with no bump; eight await coach A.

**Finding 2, S1's "no bump" (for the code reviewer).** As a designer I find no player-facing reason to bump: a box
above the new cap keeps its Boogles (`ridersArrive` lands `min(fares, max(0, cap − boogles))`: it stops filling,
never takes away), `checkTrade` has no `boogles ≤ cap` and no `paid` against price, so a bought plot 3 keeps its 6,000;
an unbought staked plot 3 simply reprices; saved riders ≤ 4 are valid under 8; an old tab drawing 4 is accepted (no
old builds). **Confirm:** (i) no other code clamps `Till.boogles` to `boxCap` (the sack, C1, is not built: when it is,
it must not either); (ii) `test/fixtures/railway-golden.json` (pinned to v54, 1,200 ticks after each stage) does not
move; if any stage boards a fifth rider it is a rule change and needs a bump by the seed-goldens call (folded into S1);
(iii) nothing on the client runs `checkTrade` against a mirror whose cap differs; (iv) the predicted `rail.footSet`
clone agrees once non-wagon trains carry footings (L1, as the plan claims); (v) whether L1's next namespace after v54 is needed at all is
the code reviewer's per mixed-builds; from the player's side a room whose plot 2 was a house could keep its shell as
the yard, but a reset is cheap ([resets never block](../agents/owner-calls.md#save-resets-never-block-development-or-architecture)).

**Finding 3, V1: standing reads as riding if it moves with the car.** At 0.95 m on a 0.7 m deck a little guy standing
at the rail on a rocking car reads as a passenger; still figures in the middle read as cargo. The plan's "clear of
the seats and the aisle" missed two things on the deck today: a seated player's legs (facing out to about ±0.8 m) and
each seat's stowaway perch. Folded into V1: the ends and outer corners, facing out, on the car's rock, crowding each
other but never a player, seat or pet, plus stills with a pet aboard and a player walking the deck. Eight will look
packed on a 2.2 × 3.2 m deck; that is honest (the car is not yet their size) and the art job's reason. The tile
"4 seats, 4 riders" is plain and right; placeholder. V1 reads S1's rename, so it builds on S1's branch.

**Finding 4, the art brief.** The owner's words are there; it lacked the previz rule's anchors. Added to A: a real
still with V1's riders, a seated Buddy and a pet; the binding sizes; the knifeboard he picked on 10 November kept;
two candidates (places on this car, or a rider deck with the train lengthened) since "trains that are size
appropriate" may mean length; sheets for the pick; no counter; the look rules' materials, camera and chunky shapes.

**Finding 5, order.** S1 + V1, then L1 + V2 (one ship, finding 1's reason applies to L1 alone too: footings would
arrive at the Pier on trains that show none), then L2, R and K; A beside them. This is the order in which each lesson
pays where the player can see it: the third house first (fares, standing riders), then the yard (the arm, decks).
C1 should **not** be held to share L1's namespace: it is a different lesson (8, the sack) and nothing waits on a bump; share only
if it is already on L1's branch. Lesson order is the logged 16 November one; no change.

**Suspect lines (his, unchanged):** the residents' "new neighbours" lines (`town-lines.ts` 54, 86, 136, 168) on the
yard: L1's trigger fix keeps them for houses. **New strings, placeholders:** "Every train"; "Loader yard" and "The
loader yard stands; footings ride every line 2 train"; "4 seats, 4 riders", "The knifeboard passenger car:
four seats for players, places for eight riders.", "Riders".

**Owner questions: none.** The planner's three are agents' calls: 1 is required by the route contract (call 6), 2 is
the stand-in the owner's own complaint implies (call 10), 3 is try-early (call 13). He sees the art previz when it
exists, as with the 10 November car; nothing waits for it. **Logged** in [agent-calls](../agent-calls.md) (rewards
and rail, open): calls 6, 7, 10, 11, 12, 13 and 15.

### Rider count-readability pass (16 November)

The orchestrator rejected the crowded V1 view: eight riders read as two. A wider `RIDER_PLACES` trial improved
the hat separation but touched the entry posts/knobs and did not establish four distinct people per group.
The trial was rejected and reverted; no further layout iteration or rule change. V1 is reopened, not claimed
done. See the [count-readability evidence and limits](../reports/first-town-rider-count-readability.md).
The dedicated rider coach remains the proper eight-rider art solution. The subsequent four-place rework above
supersedes this rejected trial.
