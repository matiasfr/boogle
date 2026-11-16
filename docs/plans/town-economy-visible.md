> **Status: plan, not built (16 November 2026).** Replans what is left of [slice5-town-economy](slice5-town-economy.md)
> (its R4, R5, V1 to V4) against main `3720b4c3b`, `WORLD_NS` v52. The one file each build job reads.
> Designer-reviewed 16 November ([review](#design-review-designer-2026-11-16)); its changes are in the steps, marked
> "(review)". "Plot 1, 2, 3" below mean the first, second and third priced plot: slots `plot3`, `plot2`, `plot1` (N9).
> Owner, 16 November (relayed by the orchestrator, not yet in the backlog): the town economy goes to
> the top of the backlog, because "towns grow from what arrives, and grown towns give upgrades" is not playable.

## Summary

- **Today:** trains already carry timber home, riders already pay fares into the strongbox and plots are already staked, all on the server; nothing draws any of it.
- **After step 1 (A1 to A3, run together):** crates stack at the Camp and the Quarry and ride home; in the Round plot 1 is staked about 45 s after the trains wake and plot 2 about 5 minutes later, each with stakes, a pile of what arrived and a board; little guys wait on the island and ride; Boogles rise in a coin column at a ticket window in the hall.
- **After the buy (B1, B2):** hold Interact at a staked plot's board with enough in the box and a house goes up there in 10 s; riders and fares rise; the other plot now costs twice its price; Pip, Button, Moss and the street notice say their "new neighbours" lines for the first time.
- **After the sack (C1, C2):** come back after a night away and a coin sack of up to 15 minutes' fares sits on the till's counter; one press empties it into the box.
- **Throughout:** nothing on the route gets a Boogle price, so a room that ignores the town still finishes.

## What main has (checked 16 November)

| Piece | On main | Where |
| --- | --- | --- |
| R1 yards, freight; R2 away credit, staking | Yes, v28, #1641 | `railway-sys-trade.ts` (`yardTick`, `yardsAway`), `plotsStakedOf` and `plotsStaked` in `railway-queries-trade.ts` |
| R2b the full-load stone stop | Yes, v29, #1650 | `freightStop`; no stop while footings are owed |
| R3 riders, fares, the till | Yes, v30, #1652 | `tradeTick`, `Till` (with `spent`, `sack`, `poured` already declared), `railPricePct` already in `src/sim/tune.ts` |
| Seeds and jump-ins | `freight-running` ("Timber home"), `fares-running` ("Fares paid") | `railway-seed-trade.ts`, `src/world/railway-jump.ts` |
| R4 `Plot`, `rail.buy`; R5 the pour, `rail.sack` | No | `dearestOnOffer()` is 0; `townHas` keeps `town` and `stone` false |
| Any view of the trade | No | no file in `src/entities`, `src/render`, `src/features`, `src/place`, `src/ui` reads `Yard`, `Town`, `Till`, `Train.freight` or `Train.riders` |
| Home | Layout B only (v36, #1729); the Round's blockout B1 to B3 (B3 in #1800) | eight solid plot blocks with door marks; B4's evidence and ruling are on main (#1804 to #1806), his walk is owed |

**Measured on main (headless, from `trains-on`, nothing asked).** Plot 1 staked at +44 s, plot 2 at +4.7 min, 100
Boogles at +4.3 min, 300 at +9.6 min; after 20 minutes 686 Boogles (34 a minute; R3 measured 53.5 to 56 at v30), both
crowds near the cap (24 and 22), nothing lost, no stone (the stop waits for the pier's footings, as ruled). From
`q6-done` 65 a minute, from `crossing-done` 77 (fare 9). R3's gate 6, "at least 40 a minute at every stage", no longer
holds at `trains-on`; not bisected (candidates: v34's train spacing, v52's train progression). See Q2.
**(review)** Fares are seat-bound: with the crowds at their cap before any house, a third building adds 1% at
`trains-on` and nothing at `q6-done`. The review's numbers are in its finding 2.

## Goal

Make the economy that already runs visible where it happens, then let the room spend it. Serves the core loop ("towns
grow from what arrives"), **6. Communal world** (one box, anyone spends), **7. Telegraph everything** (stakes and the
next plot's need are in the town) and **11. Show, don't tell** (money is a column, the offer is stakes on the ground).
**Research:** as the slice 5 plan ([economy-principles-audit](../research/economy-principles-audit.md),
[growing-towns](../research/growing-towns.md) rec 1: each cargo tied to a part of the town, used for N2; 8 to 10 s for
an ordinary addition, matches `buildTicks`). No departure.

## Calls

**Decided** (cite, do not re-open):

| # | Call | Source |
| --- | --- | --- |
| D1 | Boogles come from fares only; one shared strongbox; materials and Boogles never convert | [rewards](../decisions-rewards.md#current-rules), 10 and 11 November |
| D2 | Houses are bought on staked plots; unbought plots stay empty ground; the first house is 300; each next house in a town costs twice the last; prices are stand-ins | same, 10 and 11 November |
| D3 | Deliveries stake the plots; freight is carried by trains, never by hand | same, 12 November |
| D4 | The wallet is a ticket window on the hall's north end wall; the box holds the larger of 20 minutes of income or 1.5 times the dearest thing on offer; the sack holds 15 minutes | same, 10 November |
| D5 | Nothing runs while the room is empty; the next join finds one capped coin sack | same, 10 November |
| D6 | Counts everywhere: boards show numbers in the depot boards' icon-and-count style | [owner-calls](../agents/owner-calls.md#counts-everywhere), 15 November |
| D7 | Mechanisms, then systems, then the full greybox, then details: no interiors, residents, barks or bespoke props here | [owner-calls](../agents/owner-calls.md#mechanisms-systems-greybox-details) |
| D8 | Hub towns grow like the Village: plot slots and prices stay per town | [rewards](../decisions-rewards.md#current-rules), 12 November; [campaign-outline](campaign-outline.md#towns-at-the-hubs) section 4 |

**Default** (existing rulings applied; built unless the owner says otherwise): F1 Server kind for `Plot` and both ops,
neither in `RAIL_PREDICTED` (slice 5, Default). F2 Buy is Interact held 1 s at the board; the sack is one press
(slice 5 review, row 2). F3 A bought house counts 100 ticks (10 s) after the buy (review, row 3). F4 Only plots 1 to 3
are priced: base 300, 800, 3,000, times 2 for each house already in the town (review, row 8). F5 `town` turns true with
the first built house, `stone` with plot 3 built; the residents' lines fire as written (review, row 7). F6 A built
house is the house kit's closed shell with colliders, no interior (review, finding 3). F7 The house goes up with the
existing site show (`src/place/sites.ts`). F8 Riders are drawn as the existing little guys, at most 12 waiting at each
end. F9 The coin column's height is `boogles / boxCap` with a mark at the cap; no HUD figure, no pulse (money.md's
warning). F10 The stone stop stays paused while footings are owed (12 November ruling).

**New** (made here, for the designer): N1 Unbought plots go back to empty ground in A2: the eight blocks leave the drawn
blockout, a ground outline and the door mat stay; a bought plot gets its house (Q1; replaces the 14 November agent call
"blocks stand until sign-off"). N2 The Village's freight is drawn at the plots: each priced plot's pile is its share of
the deliveries (plot 1 the first 8 timber, plot 2 the next 16, plot 3 the next 16 timber and 16 stone); a full pile is
staked; the lowest unstaked priced plot shows its growing pile and a have/need board (replaces "a delivered stack at
each Village platform": one island since layout B). N3 Crates leave the car on the unload tick with no flight
(greybox); a plot's pile clears as its house goes up, so the house is made of what arrived (the next plan's hand work
raises crates at the plot: R2b ruling, item 4). N4 The till stands inside the hall against the north end wall's back
bay, clear of the goods door. N5 Boards stand 1.2 m out from the door line, 2.2 m to the door's side (level finding
1). N6 Freight crates ride in the flat car's solid crate deck, as kit crates do. N7 `boxCap`'s "dearest thing on offer"
is the dearest staked, unbought plot at its current price. N8 The hub-town rename of `Town.wood` and `Town.stone` to
per-row goods counters waits for the plan that adds the second town (section 4 asked for it at this bump; that plan
resets the world anyway). **(review)** N9 The buy order starts by the hall: `TOWN_PLOTS.order` begins `plot3`,
`plot2`, `plot1` (level finding 8). N10 Riders 1 a minute a building (`ridersPerMin`), so a house pays. N11 The room's
`railPricePct` is 50 from B1's ship: 150, 400, 1,500 (the data keeps D2's 300). N12 A staked plot whose price the box
holds shows the house's gold ghost.

## Steps

Each step leaves `node dev/ship-check.ts` green. Views read the mirror through the adapter's read facade (as
`src/entities/town/town-read.ts` does) and are Cosmetic and Local: no state, no effect in a system, nothing a system
reads. **Tier** is `npm run review-stamp`'s rule: a file under `src/sim`, `src/net`, `src/world`, `src/ecs` or
`server/src`, or a test that asserts them, needs an independent review; anything else is the orchestrator's normal
read. Player-visible steps also get the main session's visual review of their proof. **Model** rows are `npm run
models`'.

- [ ] **A1. Freight you can see (S).** Sync: Cosmetic/Local over `Yard`, `Train.freight`. Tier: normal + visual.
  Model: Codex gpt-6-astra high (player-visible). Parallel with A2, A3 and B1.
  - `src/entities/railway/freight-view.ts` (new): an instanced crate stack per `TRADE.yards` row, `Yard.stock` crates
    (2 × 2 × 2 at 8), timber brown, stone grey, and a count board (`src/render/sign-board.ts`, as `stock-sign.ts`).
    Camp: Place-local (9.64, −143.10), 3 m beyond line 1's Camp stand from the track. Quarry: (66.59, 29.74), beside
    line 2's homeward platform. Mounted in `src/entities/railway/view.ts`.
  - `src/entities/railway/train-view.ts`: the crate deck on `model.cars[2]` also shows `Train.freight` crates in its
    goods' tint (N6), through the same `solidTrainLoad`; on unload they go with the row change (N3).
  - Proof: `npm run look -- --rail-seed freight-running`: a still at the Camp stack and one of a line 1 train in.
- [ ] **A2. Stakes and piles in the Round (M).** Sync: Cosmetic/Local over `Town.wood`, `Town.stone`, `plotsStaked`.
  Tier: normal + visual. Model: gpt-6-astra high. Parallel with A1, A3 and B1.
  - `src/entities/town/plots.ts` (new; town-layout step 5's file, D4 of [home-flip](home-flip.md)): per priced plot
    (`TOWN_PLOTS.order[k]`, `TRADE.plots[0][k]`): when staked, four stakes 0.3 m outside the footprint's corners, a
    string, and a board on a post at the plot's local (2.2, d/2 + 1.2); the pile (N2) at local (−2.4, d/2 + 1.2), at
    most 8 crates drawn, its count on the board ("Timber 8 / 8"); the lowest unstaked priced plot gets its board and
    pile without stakes. Positions from `townBuilding`/`townLocal` only. Mounted in `src/entities/town/view.ts`.
  - N1: `src/place/town-blockout.ts` (`standBlockout` leaves out an unbought plot's block and its `blockoutFeet`; the
    outline and mat stay), `src/entities/town/blockout.ts`, `dev/level/drawn-geometry.ts` (so the level check and the
    view agree), `test/town-plan.test.ts` ("every slot is drawn once": an unbought plot is an outline). One constant,
    `PLOT_BLOCKS` in `src/place/town-blockout.ts`, restores the blocks if Q1 says so.
  - N9 (review): `src/place/town-plan.ts` `TOWN_PLOTS.order` = `plot3`, `plot2`, `plot1`, then 4 to 8; tests and the
    plan sheet (`dev/level/town-plan-sheet.ts`) follow. The first pile then grows 36 m from the island, in its view.
  - Proof: `npm run look -- --rail-seed freight-running`: from the hall's front toward plot 1's stakes, and at 375 × 812
    from the top of the dock street (the stakes must read at 40 m).
- [ ] **A3. Riders and the till (M).** Sync: Cosmetic/Local over `Town.wait0`, `wait1`, `Train.riders`, `Till`. Tier:
  normal + visual. Model: gpt-6-astra high. Parallel with A1, A2 and B1.
  - `src/place/home-station.ts`: `TILL = { ...axisPoint(-11.4, ISLAND_C - 5.95), yaw: HALL.yaw }`: Place-local
    (−93.95, 6.08), against the inside of the north end wall in the back bay (N4).
  - `src/entities/railway/till-view.ts` (new): a 1.0 × 0.8 × 1.0 m counter, a coin column (F9), a cap mark, a board
    with the figure; mounted in `src/entities/railway/home-station-view.ts`.
  - `src/entities/railway/riders-view.ts` (new): `wait0` little guys on the island's line 2 edge, `wait1` on
    `routeFar`'s platform, 12 drawn at most, a count board past 12; mounted in `src/entities/railway/halts-view.ts`.
    `src/place/folk.ts`: a `waiting` role, and `setRiders(line, on)` becomes a count per train from `Train.riders`
    (seats 4).
  - Proof: `npm run look -- --rail-seed fares-running`: a still at the till and one on the island as a train boards.
- [ ] **K1. Checkpoint: the economy seen.** After A1 to A3. The main session opens the six stills; one real-time clip of
  a train unloading at the island; `docs/game-design/place.md` gains the town economy's views (one doc edit for all
  three steps, so they share no file). Live as every ship is; (review) the owner is pointed at the economy at B2, the
  first moment with a choice, not here, where money builds with nothing to spend it on.
- [ ] **B1. Plots and the buy (M; R4).** Sync: Server kind in the railway's replicated world; the server has
  authority. Tier: **independent review**. Model: Codex gpt-6-astra high; review a fresh gpt-6-astra high (or opus
  high). Parallel with A1 to A3 (no shared file).
  - `src/sim/railway-trade-layout.ts`: plot rows gain `base` (300, 800, 3,000); `houseOrder: 2`, `buildTicks: 100`;
    `ridersPerMin` 2 to 1 (N10, review). The room's `railPricePct` is set to 50 when B1 ships (N11, review).
    `railway-components.ts`: `Plot` keyed `slot` (= town × 16 + k; D8), fields `at` (tick bought, −1) and `paid`,
    spawned per priced plot. `railway-rows.ts`: `plot`.
  - `railway-queries-trade.ts`: `plotSlot(town, k)`, `plotBought`, `plotBuilt(w, slot, tick)`, `housesOf(w, town,
    tick)`, `plotPrice(w, town, k, pricePct)` (base × 2^houses bought, × pct / 100, floored), `townBuildings(w, town,
    tick)` (start + built), `dearestOnOffer(w, pct)` (N7); `plotsStaked` passes the bought set; `tillRate`/`boxCap`
    take the tick. `railway-sys-trade.ts`: `buy`; `railway-systems.ts`: `'rail.buy': [buy]`.
  - Op `rail.buy { id }`: accepted when the plot is staked, unbought and `boogles ≥ price`; then `boogles −= price`,
    `spent += price`, `at = tick`, `paid = price`. Not predicted; refusals return `rejected` on the receipt.
    `src/world/railway-server.ts`: the op name and a validator (`id` one of the priced slots), `railPricePct` from
    `railTune`. `src/adapters/railway-intents.ts`: `buy(slot)` and its parse.
  - `railway-check-trade.ts`: `boogles = landed + poured − spent`; `spent = Σ paid`; a bought plot's thresholds are
    met; `at ≤ tick`. `src/sim/town-facts.ts`: `townRead(w, tick)` gains `houses`; `townHas` answers F5 (the "until
    slice 5" comments and the "town and stone stay false" test go); `src/entities/town/town-read.ts` passes the tick.
  - `dev/economy/trade-data.ts` reads `base` and `houseOrder` from `TRADE`. Seeds (`railway-seed-trade.ts`,
    `railway-seeds.ts`): `house-ready` (`fares-running` until `boogles ≥` plot 1's price) and `house-built` (an accepted
    `rail.buy` plus `buildTicks`); `src/world/railway-jump.ts` rows "Ready to build" (at plot 1's board) and "House
    built" (on the green facing plot 1), each `land` checked in a still at B2.
  - `WORLD_NS` **v54, or the next free number** (another job holds v53): a dated line in `src/world/namespace.ts`,
    rail-schema regenerated, fixtures re-recorded; rebase onto main right before the bump.
  - Tests (`test/railway-trade.test.ts`, `test/town-facts.test.ts`): refused unstaked, short or bought; a replayed
    request spends once; two buys in one tick spend once; `tillRate` rises at `at + buildTicks`, not before; `town`
    flips then; buying plot 2 first prices plot 1 at 600; determinism; save round-trip; (review) the payoff guard: from
    `q6-done`, three buildings land at least 1.3 times what two do in 20 minutes (measured 53.3 against 35.3).
  - Proof: `npm run checkpoints -- house-ready house-built` (both seeds from accepted ops through the host's save path).
- [ ] **K2. Checkpoint at B1's bump.** `npm run check:full`; `npm run scenario` for two players pressing one plot (one
  plot bought, spent once: the one new sync contract); `npm run loop -- run` with order and bills unmoved.
- [ ] **B2. The house goes up (M; V3).** After B1 and A2. Sync: Local view of `Plot`. Tier: normal + visual. Model:
  gpt-6-astra high. Parallel with C1.
  - (review) What a plot gives is on its board as an icon and count (riders +1 a minute; D6). N12: while the box holds
    a staked plot's price, the house's gold ghost (the kiln's and cradle's cue) stands on it, seen from the island.
  - `src/entities/town/plots.ts`: the board shows the price and the box's Boogles; Interact held 1 s (F2), `blocked`
    with the shortfall; calls `buy(slot)` and changes nothing until the `Plot` row does. The hold: reuse the garage
    install's hold if it is a helper by then, else write it here (owner call "Fold copies into one helper").
  - On `at ≥ 0`: the pile clears (N3) and the house goes up with `housePlan`/`addSite`/`startSite`, paced to finish at
    `at + buildTicks`; `snapSite` on load once built; built: the closed shell with colliders (`hullBodies`), door mark.
    `src/entities/town/view.ts` mounts it.
  - Proof: `npm run look -- --rail-seed house-ready`: hold at plot 1's board and record the house going up, once, in
    real time.
- [ ] **C1. The sack (S; R5).** After B1 (it shares B1's files). Sync: Server kind. Tier: **independent review**.
  Model: gpt-6-astra high; review as B1. Parallel with B2.
  - `src/sim/railway-sys-away.ts` (`tillAway(w, ticks)` beside `yardsAway`: `sack += floor(tillRate × ticks / 600)`, at
    most `sackCap`; the box earns nothing away), `railway-queries-trade.ts` (`sackCap(w, tick, pct)` = 15 × `tillRate`),
    `railway-sys-trade.ts` (`sack`), `railway-systems.ts` (`'rail.sack': [sack]`), `railway-check-trade.ts`
    (`sack ≤ sackCap`), `src/world/railway-server.ts`, `src/adapters/railway-intents.ts` (`sack()`),
    `railway-seed-trade.ts` (`sack-waiting`: `house-built` resumed after 8 hours), `src/world/railway-jump.ts` ("Sack
    waiting", at the till), `test/railway-trade.test.ts`.
  - Op `rail.sack`: accepted when `sack > 0`; `boogles += sack`, `poured += sack`, `sack = 0` (it may pass the box's
    mark once). No new field: `Till.sack` and `poured` exist.
  - `WORLD_NS`: the next free number after B1's (a new op), unless C1 ships with B1 under one bump.
  - Tests: 8 hours away fills the sack to `sackCap` and the box not at all; a second resume adds nothing; an empty
    sack's op is refused; the money check after a pour past the mark.
  - Proof: `npm run checkpoints -- sack-waiting`.
- [ ] **C2. The sack on the counter (S; V4).** After C1 and A3. Sync: Local. Tier: normal + visual. Model:
  gpt-6-astra high. `src/entities/railway/till-view.ts`: a sack on the counter while `Till.sack > 0`, its count on the
  board; one Interact press calls `sack()`; the column rises on the row change. Proof: `npm run look -- --rail-seed
  sack-waiting`: press, the column rises.
- [ ] **K3. Checkpoint: the slice closed.** `npm run level-check` with B2's houses solid (finding 7); `npm run perf` at
  the Round on `house-built` against `trains-on`, reported, not a gate; a "Trade" chapter in `docs/game-design/` with
  its index line; the away host test once (a hosted room emptied, rejoined after a faked 8 hours); "not tested on a
  device" or a device run.

**Order and lanes.** Start A1, A2, A3 and B1 together (no file is shared; the docs edit is K1's); ship each as it
passes. B2 waits for B1 and A2; C1 waits for B1; B2 and C1 run together; C2 waits for C1 and A3. Hotspots:
`train-view.ts` (A1), `halts-view.ts` and `folk.ts` (A3), `railway-server.ts`, `namespace.ts` (B1, C1): rebase first.
**(review) Priority when agents are short:** A2 and B1 (the buy's critical path), then A3 (the payoff's crowd and
column), B2, then A1; C1 and C2 serve the return visit, not the choice, and take an agent only when the next plan's
plot-2 upgrade cannot. **Next plan (review):** the second priced plot's house also brings the Works' faster footing
loader (the model's `loader.works`), so the board offers fares now or the footing loader sooner; planned now, docs only.

## Level findings

Run on main `3720b4c3b`: `npm run level-check -- --place=place` exits 0, 0 problems (22 s). It sees the eight blocks
(through `standBlockout`) but excludes "place props, room/station collision", so the till, stakes, piles, crates and
riders were probed separately (ground `H`, slope, clearance to the rails, the streets and the blocks):

1. **Ring plots 1 and 2:** a board 2.0 m out from the door line (town-layout's figure) stands at r 20.0 from G, on the
   ring road's outer edge; at 1.2 m out it stands at r 20.8 on the 2 m verge, and 2.2 m to the side it is off the mat
   (N5).
2. **Plot 3's** door faces the quarry road's bend: its board is 4.0 m from the road's centre line, its pile 3.4 m (1.0 m
   clear of the 2.4 m half width).
3. **Stakes 0.3 m out** keep the alleys at 2.5 m (plots 3 and 5, 2.80 m) and 3.0 m (plots 2 and 8, 3.33 m); at 0.4 m the
   first is exactly the 2.4 m rule.
4. **Every plot spot** is on 18.00 m ground, flat.
5. **The till:** ground 18.00 under the 18.34 floor, 11.6 m from line 2's nearest rail sample, 4.05 m from the greeter,
   clear of the goods door. A 1.0 m counter puts the 2.4 m end wall's top in one jump and the hall's roof in a second:
   a perch the bay already reaches (B4 ruling, finding 2). Default: fine.
6. **The yards:** the Camp stack's ground is 30.12 m (4.2°, 0.9 m under the deck); the Quarry's 24.19 m (3.3°). The
   probe does not see the props already there: A1's still checks. Crates and riders have no collider, so reach does not
   change.
7. **For the designer: the rooftop route to the balcony.** With N1 the B4 ruling's chain closes (the balcony is a glider
   find again). Once plots 3 and 2 are built it may reopen: bay crown, shelf crown (0.30 m), plot 3's roof (1.19 m),
   plot 2's roof (10.17 m: over a walking second jump of 7.4 to 7.9 m, under a sprinting 12.6 m), Fine Prices' roof
   (3.00 m), the balcony. Plot 1 is 3.00 m from Fine Prices too, but nothing climbable stands within 12.6 m (the gate
   cottage is 16.47 m). Recommended: accept, as B4's question 1 did; K3 measures it.
8. **Telegraph:** plot 1, staked first, is about 50 m from the hall (plot 2 37 m, plot 3 22 m), seen across the green.
   The buy order is town-layout's; flagged, not changed. **(review) Changed by N9:** slot `plot3` is staked first.

## Risks

Room safety: no effect in a system; views draw from row changes and treat `buy()` and `sack()` as queued; no
`Math.random`, wall clock or `Math.exp` (the sack reuses `railAwayCredit`'s ticks). Mixed builds: B1 and C1 each break
the save and the op list, so each bumps `WORLD_NS`, no compatibility code. Performance: at most 8 crates a yard, a car
and a pile, 24 riders, one column, instanced; K3 reports it. N1: the level check and the view read one filter.

## Strings for the owner

All new copy is a placeholder for The Boogler's voice: the board ("Plot 1", "300", "Timber 8 / 8", "Stone 0 / 16";
(review) "Riders +1 a minute"), the hold prompt ("Build" or "Buy", and "Needs 120 more"), the till ("322 Boogles"), the sack prompt ("Empty"), and
the jump-in rows ("Ready to build": "300 Boogles in the box; plot 1 is staked"; "House built": "Plot 1's house stands";
"Sack waiting": "Back after a night: the coin sack is on the counter"). Existing lines reachable for the first time
when `town` and `stone` turn true (`src/entities/town/town-lines.ts`, lines 54 to 55, 86 to 87, 136 to 137, 168 to
169), e.g. Pip's "New neighbours. All employed. I checked.": none edited.

## Owner questions

The review's five replace the planner's four (its 4, the grey shell, is D7 and F6). Nothing waits on them; each step
builds on the recommendation.

1. **Unbought plots go back to empty ground now, before your walk of the blocks?** Recommended: **yes** (A2, N1); one
   constant brings the blocks back for the walk.
2. **Riders 1 a minute a building and the room's prices halved, so a house lifts fares by about half and the first
   (150) comes about 3 minutes after the pier, about 36 minutes in?** Recommended: **yes**. At 300: about 41 minutes.
3. **Next plan: the second priced plot's house also brings the Works' faster footing loader, so the buy is fares now
   or footings sooner?** Recommended: **yes**.
4. **The first plot staked is the one by the hall (slot `plot3`), seen from the island; the dock street's is third?**
   Recommended: **yes**.
5. **Once two houses stand, a rooftop run may reach the balcony find without the glider. Accept, as for the blocks?**
   Recommended: **yes**.

## Design review (designer, 2026-11-16)

**Build with changes, now in the steps.** Read: DESIGN 6, 7, 11; owner-calls; rewards and rail Current rules (10 to 14
November entries opened); the 16 November focus entry; Grant's and the 9 and 10 November playtests; slice 5's reviews;
town-layout's Round; home-flip's B4 ruling; `npm run loop`; the model's source rows (`dev/economy/trade-data.ts`).
Measured: 20-minute headless runs from three seeds, building count and `ridersPerMin` varied (script not committed);
two stills on `freight-running` (island toward the town; hall front toward slot `plot1`). Not seen: the views this plan
adds (unbuilt); a device.

| Calls | Kind | Ruling |
| --- | --- | --- |
| D1 to D8 | Decided | Consistent. D2's 300 stays the data's stand-in; N11 halves it in the room only |
| F1 to F10 | Default | Keep. F6 answers the planner's question 4 (D7: no residents in this pass) |
| N1 to N8 | New | Build as planned. N1: a staked plot reads as for sale only on open ground; `PLOT_BLOCKS` restores the blocks for his walk (Q1) |
| N9 buy order from slot `plot3`; N12 gold ghost and the give line | New; Default | Finding 3 (Q4) |
| N10 `ridersPerMin` 1; N11 `railPricePct` 50 | New | Finding 2 (Q2) |
| Plot 2's house also brings the Works' footing loader, next plan | New | Finding 1 (Q3) |
| A rooftop run to the balcony over bought houses | New | Accept; finding 4 (Q5) |

1. **Q1: the buy was neither a payoff nor a choice.** Fares are seat-bound (crowds 24 and 22 at the cap before any
   house): a third building lands 34.6 a minute against 34.3 at `trains-on`, 68.4 against 68.4 at `q6-done`. And two
   plots giving the same thing are one right answer; the doubling even makes the dearer first cheaper in total (800 +
   600 against 300 + 1,600): a sum, not a decision a player could explain (Grant's "no real decisions"). **Smallest
   change:** the second priced plot's house also brings one source upgrade, the Works' faster footing loader (the
   model's `loader.works`; Boogles upgrade sources, the loader arm named, 10 November; a grown town gives its sources'
   upgrades, 12 November). Footings (stall 2, crossing 12, bents 14, weights 4) are the work right after the pier,
   where both playtesters stopped, so the board asks "fares now, or the loader sooner?" and the doubling prices the
   first pick. **Next plan, not B1:** it needs a rule, a number and a view at the Works, and B1 is already a reviewed
   bump; `rail.buy { id }` stays generic so it adds an effect to a plot row. **Order:** the decision's critical path is
   A2 and B1, then B2; A3 shows the payoff; A1 and the sack are off it (priority, in Order and lanes).
2. **Q2: the first payoff.** `trains-on` is idle: the seed lays Q6 1.7 minutes later (Grant: trains 30:36, pier 32:33)
   and from `q6-done` fares are 68.4 a minute, so today's 300 lands about 7 minutes after the trains (about 38 minutes
   in) but buys nothing measurable. With N10, fares a minute for two, three, four buildings: `trains-on` 25.6, 33.6,
   34.3; `q6-done` 35.3, 53.3, 68.4; `crossing-done` 23.1, 41.1, 59.1: a house lifts fares by a third to three
   quarters and riders outgrow the seats after a house or two (slice 5's review, row 4). At 300 the first house then
   comes about 9 minutes after the trains (41 minutes in); with N11 (150) 3.2 minutes after `q6-done`, about 36
   minutes in, as a player comes back from the pier. The second (800 after doubling, at 53 a minute) about 15 later.
3. **Q3: sightlines.** A1: the first timber shows on line 1's flat car at the island about 44 s after the wake, where
   the player stands; the yard stacks only to riders. Missing: where it goes. N3 drops it unflown and the pile grows at
   slot `plot1`, 71 m away past the hall's south end; the island still picks no plot out there. N9: slot `plot3` is
   36 m from the island and 22 m from the hall, its block beside the open hall in that still. A2: stakes and string
   are small shapes; the pile is the medium one, so the 40 m proof must show the pile. From the hall's front slot
   `plot1` is small at about 40 m between Fine Prices and the statue. A3: the till is 24 m from the island and 17 m
   from the breaker, the next beat. B2: nothing changed at a distance when the box reached a price (the board reads at
   about 10 m); N12's gold ghost is the route's own "this can be done". C2: seen in the hall; not checked from spawn.
4. **Q4: the rooftop run.** His 14 November acceptance covers the blocks only. Houses follow the trains and the glider
   is on offer from Q5, before them, so "before the glider" needs an optional find left 20 minutes or more; the balcony
   is a personal cosmetic, not a gate (DESIGN 2, 10). With N9 it can open at the second house. Accept; K3 measures.
5. **Q5: what starts now.** A1, A2, A3 and B1 now; B2 after B1 and A2; C1 after B1; C2 after C1 and A3; the next
   plan's planning now. Nothing waits for the owner: no step changes direction or scope past the 16 November focus,
   N11 is a live tunable and N1 one constant.
