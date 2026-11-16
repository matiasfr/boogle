> **Status: plan, not built (16 November 2026).** Replans what is left of [slice5-town-economy](slice5-town-economy.md)
> (its R4, R5, V1 to V4) against main `3720b4c3b`, `WORLD_NS` v52. The one file each build job reads. Not yet
> designer-reviewed. Owner, 16 November (relayed by the orchestrator, not yet in the backlog): the town economy goes to
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
holds at `trains-on`; not bisected (candidates: v34's train spacing, v52's train progression). See Q3.

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
resets the world anyway).

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
  three steps, so they share no file). Then the room is live for him to play (owner call "Development is live").
- [ ] **B1. Plots and the buy (M; R4).** Sync: Server kind in the railway's replicated world; the server has
  authority. Tier: **independent review**. Model: Codex gpt-6-astra high; review a fresh gpt-6-astra high (or opus
  high). Parallel with A1 to A3 (no shared file).
  - `src/sim/railway-trade-layout.ts`: plot rows gain `base` (300, 800, 3,000); `houseOrder: 2`, `buildTicks: 100`.
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
    flips then; buying plot 2 first prices plot 1 at 600; determinism; save round-trip.
  - Proof: `npm run checkpoints -- house-ready house-built` (both seeds from accepted ops through the host's save path).
- [ ] **K2. Checkpoint at B1's bump.** `npm run check:full`; `npm run scenario` for two players pressing one plot (one
  plot bought, spent once: the one new sync contract); `npm run loop -- run` with order and bills unmoved.
- [ ] **B2. The house goes up (M; V3).** After B1 and A2. Sync: Local view of `Plot`. Tier: normal + visual. Model:
  gpt-6-astra high. Parallel with C1.
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
   The buy order is town-layout's; flagged, not changed.

## Risks

Room safety: no effect in a system; views draw from row changes and treat `buy()` and `sack()` as queued; no
`Math.random`, wall clock or `Math.exp` (the sack reuses `railAwayCredit`'s ticks). Mixed builds: B1 and C1 each break
the save and the op list, so each bumps `WORLD_NS`, no compatibility code. Performance: at most 8 crates a yard, a car
and a pile, 24 riders, one column, instanced; K3 reports it. N1: the level check and the view read one filter.

## Strings for the owner

All new copy is a placeholder for The Boogler's voice: the board ("Plot 1", "300", "Timber 8 / 8", "Stone 0 / 16"), the
hold prompt ("Build" or "Buy", and "Needs 120 more"), the till ("322 Boogles"), the sack prompt ("Empty"), and
the jump-in rows ("Ready to build": "300 Boogles in the box; plot 1 is staked"; "House built": "Plot 1's house stands";
"Sack waiting": "Back after a night: the coin sack is on the counter"). Existing lines reachable for the first time
when `town` and `stone` turn true (`src/entities/town/town-lines.ts`, lines 54 to 55, 86 to 87, 136 to 137, 168 to
169), e.g. Pip's "New neighbours. All employed. I checked.": none edited.

## Owner questions

Nothing waits on these; each step builds on the recommendation.

1. **Should unbought plots go back to empty ground now, before you have walked the blocks?** Recommended: **yes (A2)**.
   The town only reads as growing if it starts small; the spacing stays on the plan sheet and as outlines on the
   ground. If you want to walk the blocks first, one constant brings them back.
2. **Is choosing between two staked plots enough of a decision for now?** With plots 1 and 2 staked you can buy the
   cheap one or save for the other (either way the second costs double). Recommended: **yes for this plan; the next
   plan puts one source upgrade (decided as a Boogle buy) on the same board**, so money has two uses: Grant's "no real
   decisions".
3. **The first house comes about 10 minutes after the trains wake on today's main (fares 34 a minute, down from 56).
   Keep 300?** Recommended: **keep 300** (prices are stand-ins); `railPricePct` changes it live, without a reset.
4. **A bought house is a closed grey shell until the details pass: nobody moves in yet. OK?** Recommended: **yes**
   (mechanisms, systems, greybox, then details); "every building can be walked into" stays decided for that pass.
