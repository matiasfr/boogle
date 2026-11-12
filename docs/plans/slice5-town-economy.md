> **Status: plan, not built (2026-11-11).** Production-core slice 5, "economy and town growth on the server", systems
> first. Rules and server steps R1 to R5, then greybox views V1 to V4. Two `WORLD_NS` bumps. Designer-reviewed 11
> November: **build with changes**, already made in the steps ([review](#design-review-designer-2026-11-11)). Its two owner
> questions were answered on 12 November (UTC); one design item is open ([below](#open-design-item-trains-stop-at-every-resource-source)).

# Slice 5: train cargo grows the Village, then Boogles and one plot buy

## Goal

Trains start carrying timber and stone home, and what they bring decides how big the Village may get. Riders pay
fares into one shared strongbox, and the room spends it to build a house on a staked plot. Leave for the night and
one capped coin sack waits. It serves DESIGN.md's core loop ("Towns grow from what arrives"), **6. Communal world,
personal things** (one wallet, nothing sold to one player) and **11. Show, don't tell** (the money is a column of
coins at a window, the offer is stakes on the ground).

**Order (binding; owner call ["Mechanisms, then systems, then the full greybox, then
details"](../agents/owner-calls.md#mechanisms-systems-greybox-details), 11 November).** This plan is the systems and
their greybox, on blockout geometry with the existing folk and placeholder labels. It has no character quirks, barks,
idle animations, bespoke props or polish steps.

**Research:** [economy-principles-audit](../research/economy-principles-audit.md) (one wallet, the paused world, the
away credit; used as adopted). [growing-towns](../research/growing-towns.md), rec 1 (each cargo tied to a part of the
town; used for Q1's default). [incremental-game-maths](../research/incremental-game-maths.md) (short cost ramps; the
house order of 2 is the owner's, 11 November). The [passenger-trade brief](../brainstorms/passenger-trade.md), section
8, is the source of the rider integers; this plan departs from it in one place (one destination per route, so no
count-and-sum pairs yet).

## The player outcome

After the trains wake, line 1's train comes back from the Camp with timber and line 2's trains come back from the
Quarry with stone. The first trainload of timber stakes the Village's first plot. Little guys wait at the Village and
at Far Head, ride, and each pays 7 Boogles on stepping off; the coins stack at a ticket window anyone can see. At 300
Boogles anyone holds Interact at the plot's board and a house goes up; it sends more riders. Come back the next day:
the yards are full and a coin sack is on the counter, emptied with one press. Nothing on the route gains a Boogle
price, so a room that ignores all of it still finishes.

## Decided, default, new

**Decided (owner; [rewards rules](../decisions-rewards.md#current-rules), [owner-calls](../agents/owner-calls.md)).**

- Boogles come from fares only; materials and Boogles never convert. One shared strongbox, no personal money.
- A fare is 2 to board plus 1 per 100 m ("the fare formula stays as it is"). All prices are stand-ins.
- The box holds the larger of 20 minutes of income or 1.5 times the dearest thing on offer. Fares past it do not land.
- The away sack holds 15 minutes of income; nothing runs while the room is empty; the credit is
  H × (1 − e^(−away/H)), H = 2 h.
- Houses are bought on staked plots; unbought plots are empty ground. The first buy is a 300-Boogle house at the
  Village's first plot. Each next house in a town costs twice the last (`house.order`).
- The Village arrives with two buildings; each building sends 2 riders a minute each way.
- Model and 2D page first: done 11 November (`dev/economy/trade-*.ts`,
  [economy-prototype.html](../world/economy-prototype.html)).
- No old builds, no save migrations: a shape change is a `WORLD_NS` bump, held only while the owner is mid-session.

**Default (existing rules applied; built unless the owner says otherwise).**

- **Sync kind: Server**, inside the railway's replicated world. New rows are E components in
  `src/sim/railway-components.ts`; new rules are systems in `RAIL_TICK` and the `OPS` table. The server has
  authority; clients read the mirror. `rail.buy` and `rail.sack` are **not** in `RAIL_PREDICTED` (a spend from a
  shared box waits for acceptance, as the boiler does).
- **Cosmetic and Local:** every view below, the house's build show, the coin column. None is read by the sim.
- **Riders run only Village to Far Head on line 2** (the brief's step 1). One destination per route, so a train's
  riders are one integer and the fare is a constant per route: 2 + floor(507 m / 100 m) = 7.
- **Income for the box and the sack is the demand rate** (buildings × 2 riders × 2 ways × fare: 56 a minute at the
  start, +28 a house), not the seat-capped rate. It is a pure integer query and the difference only makes the box a
  little roomier.
- **No random swing in riders.** The model's 20% jitter is not ported; the sim has no new randomness.
- **The first house costs 300** as he decided, not the model's 450 (300 × 1.5 while seats cost materials). See Q2.
- **Controls:** none new. Buying is Interact held for one second at the plot's board (the garage's Install hold);
  the sack is one Interact press. No pad slot, key or guide row is added.
- **Where the window stands:** a greybox till at the north end of the Village's line 2 platform until Home's layout
  B is the default; then `home-station.ts` moves it to the hall's north end wall (decided 10 November). One constant.

**New (calls made here, for the orchestrator to log in `docs/agent-calls.md`).**

1. **Cargo stakes plots.** With the Round chosen, the Village has no free cargo-built rows any more, so cargo's job is
   the decided sentence "hauling still sets how big a town can get": plot k is on offer once the Village has received
   its timber and stone thresholds. This replaces town-layout's "plots 1 and 2 are staked from the first arrival" and
   Place's `TOWN.wood` and `TOWN.stone` rows, which are not rebuilt. See Q1.
2. **Yards are producers.** The Camp's timber yard and the Quarry's stone yard make one crate every N ticks up to a
   cap while trains run, as the depot cart mints logs today. Freight is its own integer; it never becomes logs, stone
   or rails a player can carry or a bill can take.
3. **The town facts.** `town` is true when the first bought house stands; `stone` when the first plot that needed
   stone (plot 3) stands. The residents' existing `town` and `stone` lines then fire as written; no copy is edited.
4. **Only the Village's first three plots have prices** (300, 1,600, 12,000: the brief's 300, 800, 3,000 times
   2^(n−1)). Plots 4 to 8 stay unstaked until a later plan prices them.
5. **The numbers have one home.** `src/sim/railway-trade-layout.ts` holds every number the game uses;
   `dev/economy/trade-data.ts` takes those rows' values from it (dev may import `src/sim`, never the reverse).

## Design

### State (all in `src/sim/railway-components.ts`, replicated unless noted)

| Component | Key | Fields | Step |
| --- | --- | --- | --- |
| `Yard` | `slot` (0 Camp timber, 1 Quarry stone) | `stock`, `made` | R1 |
| `YardClock` | with `Yard`, `replicate: false` | `last` (tick of the last crate, as `ForgeClock`) | R1 |
| `Train` (existing) | `slot` | adds `freight` (R1), `riders` (R3) | R1, R3 |
| `Town` | `slot` (0 the Village) | `wood`, `stone` delivered (R1); `acc`, `wait0`, `wait1`, `boarded`, `alighted` (R3) | R1, R3 |
| `Till` | singleton | `boogles`, `landed`, `lost`, `spent`, `sack`, `poured` | R3, R5 |
| `Plot` | `slot` (town × 16 + k) | `at` (the tick it was bought, −1 not yet) | R4 |

Everything is an integer. Staked and built are **queries, not state**: a plot is staked from the town's deliveries
and built `TRADE.buildTicks` after `at`, so a late joiner and a reload agree with no extra write.

### Numbers (`src/sim/railway-trade-layout.ts`, new; `TRADE`, all stand-ins)

- `yards`: Camp `{ line: 0, stop: 1, everyTicks: 150, cap: 8 }`, Quarry `{ line: 1, stop: 1, everyTicks: 300, cap: 8 }`;
  `freightCap: 8` a train; `loadStop: 4`; yards seeded full. Timber unloads at line 1's Village halt, stone at line 2's.
- `routes: [{ town: 0, line: 1, a: 0, b: 2 }]` (the Village and Far Head); `ridersPerMin: 2`, `startBuildings: 2`,
  `crowdStop: 4`, `crowdCap: 24`, `seats: 4`; `fare: { board: 2, per100m: 1 }`.
- `plots[0]`: `[{ base: 300, wood: 8, stone: 0 }, { base: 800, wood: 24, stone: 0 }, { base: 3000, wood: 40, stone: 16 }]`;
  `houseOrder: 2`, `buildTicks: 100`, `stakedAtOnce: 2`.
- `box: { incomeMin: 20, dearestNum: 3, dearestDen: 2 }`, `sackMin: 15`.
- Three room tunables beside `railTrainHeadPct` (`src/sim/tune.ts`, `src/tunables/catalog.ts`): `railFarePct`,
  `railRiderPct`, `railPricePct`, each 100 by default, passed to the tick and to `railApply` as `headPct` and
  `timing` are. The table's shapes are otherwise constants.

### Queries (`src/sim/railway-queries-trade.ts`, new; the one home for trade arithmetic)

`fareOf(route)`, `townBuildings(w, town, tick)`, `plotsStaked(w, town)`, `plotBuilt(w, slot, tick)`,
`plotPrice(town, k, pricePct)`, `tillRate(w, tick)` (Boogles a minute), `boxCap(w, tick)`, `sackCap(w, tick)`,
`trainSeats(w, slot)` (4 today; the garage's install later changes it here, nowhere else).

### Ops and validation

| Op | Fields | Accepts when | Does |
| --- | --- | --- | --- |
| `rail.buy` | `id` (plot slot) | the plot is staked, not bought, and `boogles ≥ price` | `boogles −= price`, `spent += price`, `Plot.at = tick` |
| `rail.sack` | none | `Till.sack > 0` | `boogles += sack`, `poured += sack`, `sack = 0` (it may heap past the mark once) |

`src/world/railway-server.ts` adds both names to its op list and a validator each (`id` a `railInt` under the plot
count; no other field). No new action field, message type or presence key. Refusals come back through the existing
receipt as `rejected`.

### Invariants (`src/sim/railway-check-trade.ts`, new, called from `railwayCheck`)

- Each yard: `made = stock + freight aboard its line's trains + the town's delivered count`; `stock ≤ cap`.
- Riders: `boarded = riders aboard + alighted`; `wait0`, `wait1 ≤ crowdCap`; a train's `riders ≤ trainSeats`.
- Money: `boogles = landed + poured − spent`; `landed + lost = alighted × fare`; `sack ≤ sackCap`; every field ≥ 0.
- Plots: a bought plot was staked; `spent` equals the sum of the bought plots' prices.

## Steps

Each step leaves `node dev/ship-check.ts` green and proves itself with that only. Unit tests are written for the
lockstep code alone (R steps; `test/railway-trade.test.ts`, one file, well under a second). Bots, looks, `test:net`
and the full check are the two checkpoints' ([Checkpoints](#checkpoints)); the proof named on each step is what its
checkpoint runs for it.

### Rules and server

- [ ] **R1. Yards and train freight (M). Independent review: yes (`src/sim`).**
  - Files: `src/sim/railway-trade-layout.ts`, `railway-queries-trade.ts`, `railway-sys-trade.ts`,
    `railway-check-trade.ts`, `railway-seed-trade.ts` (all new); `railway-components.ts`, `railway-sys-trains.ts`,
    `railway-systems.ts`, `railway-check.ts`, `railway-seeds.ts`, `railway-rows.ts`; `test/railway-trade.test.ts`
    (new), `test/railway-census.test.ts`.
  - Rules, **as built** (orchestrator, 11 November: freight never adds a stop): `rail.yardTick` (tick order 2.5, as
    the schedule refuses a shared order) adds a crate every `everyTicks` up to `cap` while `Rail.trains ≥ 0`. A train
    unloads on `arrive` at its Village halt and loads `min(freightCap − freight, stock)` each tick it stands at its
    yard heading home. R1 has no `loadStop` and no service stop, and no asleep rule in the check (conservation covers
    it). Measured, 20 minutes with nothing asked from five stages: timber 79 to 85, stone 8 once (the train parked at
    the Quarry at the wake), then none; plot 3 needs 16, which R2b's stone stop brings (owner, 12 November).
  - Ops: none. State: `Yard`, `YardClock`, `Town.wood`, `Town.stone`, `Train.freight`. Save shape: three new
    components and one new `Train` field in the railway snapshot.
  - `WORLD_NS`: bumped with R2 (bump A).
  - Tests: two worlds driven alike stay equal row for row; the yard invariant holds every tick across 20 minutes of
    ticks from `trains-on`; a yard never passes its cap; freight adds no stop, an ask loads; the first line 1
    arrival home delivers 8; snapshot save and load round-trips; the kit and wagon tests still pass untouched.
  - Seed: `freight-running` (`trains-on` advanced until `Town.wood ≥ 8`).
  - Proof: `npm run checkpoints -- freight-running`; `playthrough --from trains-on --to freight` (a new stop in
    `dev/look/segments.ts`: the bot waits at the Village until the mirror's `Town.wood ≥ 8`); one look at the Village
    platforms on `--rail-seed freight-running` (trains still call and stop as before).
- [ ] **R2. Yards join the away credit; plots are staked (S). Independent review: yes.**
  - Files: `src/sim/railway-sys-away.ts`, `railway-queries-trade.ts`, `test/railway-trade.test.ts`,
    `src/world/namespace.ts`, `docs/game-design/place.md` (the paused-world paragraph gains the two yards).
  - Rules: `awayCredit` gives each yard `floor(ticks / everyTicks)` crates, never past its cap, when the trains are
    awake; `made` grows with it and `YardClock.last` moves to `tick`. Trains do not run while away, so nothing is
    delivered. `plotsStaked(w, town)`: the lowest unbought plots whose `wood` and `stone` thresholds are met, at most
    `stakedAtOnce`. No server change: `world-host.ts` already passes `railAwayCredit(away)` as `yard`.
  - Ops: none. State and save shape: unchanged from R1.
  - `WORLD_NS`: **bump A**, with R1, one dated history line. Ships when ready; `npm run heartbeat` first, and it waits
    only while the owner is mid-session.
  - Tests: 10 minutes, 8 hours and 3 days away each leave both yards at or under the cap and the yard invariant true;
    a second resume at the same marker adds nothing; `plotsStaked` at 0, 8, 24 and 40 timber with and without stone.
  - Proof: the empty-room proof for this area, once: a hosted room on `freight-running`, emptied past the pause
    grace, rejoined after a faked 8 hours (the existing away host test's clock); one look at the Camp yard.
- [ ] **R3. Riders, fares and the strongbox (L). Independent review: yes.**
  - Files: `railway-components.ts`, `railway-sys-trade.ts`, `railway-sys-trains.ts`, `railway-queries-trade.ts`,
    `railway-check-trade.ts`, `railway-systems.ts`, `railway-seed-trade.ts`, `src/sim/tune.ts`,
    `src/tunables/catalog.ts`, `src/world/railway-server.ts` (the three tunables into the tick),
    `dev/economy/trade-data.ts` (call 5), `test/railway-trade.test.ts`.
  - Rules: `tradeTick` (`rail.tradeTick`, order 4, after `trainTick`; ties run by name): for each open route, `acc += buildings ×
    ridersPerMin × riderPct / 100`; each whole 600 moves one rider onto `wait0` and one onto `wait1`, up to
    `crowdCap` (the rest give up). In `arrive` at a route halt: riders aboard step off, `alighted += n`, and
    `n × fare` lands up to `boxCap` (`landed`), the rest counted in `lost`; then `min(trainSeats − riders, waiting)`
    board, `boarded += n`. In `serviceOf`: a route halt is a stop while the train has riders for it or
    `waiting ≥ crowdStop` (decided: four or more; Far Head needs this once the Pier makes it a middle halt).
  - Ops: none. State: `Town.acc`, `wait0`, `wait1`, `boarded`, `alighted`; `Train.riders`; `Till`. Save shape: one
    new component, six new fields; the room tune state gains three keys.
  - `WORLD_NS`: bumped with R4 and R5 (bump B).
  - Tests: the rider and money invariants every tick for 30 minutes from `freight-running`; income settles within one
    fare a minute of `min(56, seat-capped)`; a full box lands nothing and counts `lost`; `railFarePct` 200 doubles
    `landed`; determinism and round-trip as R1.
  - Seed: `fares-running` (`freight-running` advanced until `boogles ≥ 100`).
  - Proof: `playthrough --from freight-running --to fare` (the bot waits for `Till.landed > 0`); one look at the
    Village's line 2 platform.
- [ ] **R4. Plots and the buy (M). Independent review: yes (`src/sim`, `src/world`, the op list).**
  - Files: `railway-components.ts`, `railway-sys-trade.ts`, `railway-systems.ts` (`'rail.buy': [buy]`),
    `railway-queries-trade.ts`, `railway-check-trade.ts`, `src/sim/town-facts.ts`, `test/town-facts.test.ts`,
    `src/world/railway-server.ts`, `src/adapters/railway-intents.ts` (`buy(plot)`), `railway-seed-trade.ts`,
    `test/railway-trade.test.ts`.
  - Rules: the `buy` system as the ops table says; `townBuildings` counts `startBuildings` plus built plots, so the
    rider rate and `tillRate` rise `buildTicks` after the buy on every peer. `townRead` gains `houses` (built plots)
    and `townHas` answers `town` and `stone` from it (call 3); the "until slice 5" comments and the test
    `'town and stone stay false'` are replaced.
  - Ops: `rail.buy`. State: `Plot`. Save shape: one new component.
  - Tests: refused when unstaked, short of Boogles or already bought; the same request replayed returns its receipt
    and spends once; two players' buys in one tick spend once; the plot and money invariants; `town` flips
    `buildTicks` after the buy, not before.
  - Seeds: `house-ready` (`boogles ≥ 300`, plot 1 staked) and `house-built` (plot 1 bought and built).
  - Proof: `playthrough --from house-ready --to buy` (until V3 the bot sends the intent directly; from V3 it holds
    Interact at the board); one look at the plot on `--rail-seed house-built`.
- [ ] **R5. The till joins the away credit; the sack (S). Independent review: yes.**
  - Files: `railway-sys-away.ts`, `railway-sys-trade.ts`, `railway-systems.ts` (`'rail.sack': [sack]`),
    `railway-check-trade.ts`, `src/world/railway-server.ts`, `src/adapters/railway-intents.ts` (`sack()`),
    `src/world/namespace.ts`, `test/railway-trade.test.ts`, `docs/game-design/place.md`.
  - Rules: `awayCredit` adds `floor(tillRate × ticks / 600)` to `Till.sack`, never past `sackCap`, when a route is
    open. The box itself earns nothing while away. `sack` pours as the ops table says.
  - Ops: `rail.sack`. State: `Till.sack`, `Till.poured` (declared in R3, written here). Save shape: unchanged.
  - `WORLD_NS`: **bump B**, with R3 and R4, on the same terms as bump A.
  - Tests: 8 hours away fills the sack to exactly `sackCap` and the box not at all; a second resume adds nothing;
    `rail.sack` on an empty sack is a noop; the money invariant after a pour past the mark.
  - Seed: `sack-waiting` (`house-built` resumed after 8 hours).
  - Proof: the empty-room proof again on `house-built` (one run covers the yards and the sack);
    `playthrough --from sack-waiting --to sack`; one look at the till.

### Greybox views

Views read the mirror's rows and the queries above; they hold no rule and no arithmetic of their own. Boxes,
capsules and boards only, instanced; no motion beyond what exists (trains, the site show). No unit tests (test
diet). Independent review: no (`src/entities` only); the normal review and one look each.

- [ ] **V1. Freight and stakes (M).** After R1 and R2 are on main.
  - Files: `src/entities/railway/freight-view.ts` (new: a crate stack at each yard sized by `Yard.stock`, crates on
    the train from `Train.freight` through `train-load.ts`, a delivered stack at each Village platform),
    `src/entities/town/plots.ts` (new; town-layout step 5's file, its stakes part only: four stakes, a string and a
    board per staked plot from `TOWN_PLOTS` and `plotsStaked`), `src/entities/town/view.ts`,
    `docs/game-design/place.md`.
  - Proof: the R1 bot segment again, now watched; one look from the top of the dock path on
    `--rail-seed freight-running`, and the same at phone size (the stakes must read at 40 m).
- [ ] **V2. Riders and the till (M).** After R3.
  - Files: `src/entities/railway/riders-view.ts` (new: one instanced capsule per waiting rider on the platform, up
    to 12 drawn; the halt's board shows the count), `src/entities/railway/till-view.ts` (new: a box, a coin column
    whose height is `boogles / boxCap`, a mark at the cap, a board with the figure), `src/place/home-station.ts`
    (the `TILL` position), `src/entities/railway/view.ts`.
  - Proof: the R3 bot segment; one look at the till with riders waiting on `--rail-seed fares-running`.
- [ ] **V3. The buy and the house (M).** After R4 and V1.
  - Files: `src/entities/town/plots.ts` (the board shows the price and have/need; a `registerInteractable` target
    "Buy", held one second, `blocked` with the shortfall when short; calls `buy(plot)`; nothing is spent or shown
    until the `Plot` row changes), `src/entities/town/view.ts` (a bought plot builds with the existing
    site show from `src/place/sites.ts` and snaps on load; built, it is the house kit's closed shell with a collider.
    No interior and no room: that is the details phase's).
  - The hold: if the Mac's install op is on main first, use its hold helper; if not, the hold lives in `plots.ts`
    and the second to land folds the two ("Fold copies into one helper").
  - Proof: the R4 bot segment with the real hold; one look at the built house on `--rail-seed house-built`.
- [ ] **V4. The sack (S).** After R5 and V2.
  - Files: `src/entities/railway/till-view.ts` (a sack on the counter while `Till.sack > 0`; Interact "Empty" calls
    `sack()`).
  - Proof: the R5 bot segment; one look on `--rail-seed sack-waiting`.

### Checkpoints

- **C1, at bump A (R1, R2):** `npm run check`; `npm run check:full` (server tests and `test:net`); the two-peer
  route through T2 and `world-inputs` (the `src/sim` rule in bot-segments); `npm run checkpoints` for the routed
  stages and `freight-running`; `npm run loop -- run` (the route's order and bills must not move); the worst wait at
  each line 2 halt, before and after, under the 1,050-tick bound (C2 reports it again); the R1 and R2 proofs.
- **C2, at bump B (R3 to R5):** the same gates; the four new seeds; the R3, R4 and R5 proofs; `npm run scenario`
  for two players seeing one plot bought (the one new sync contract: a spend both press for, bought once).
- **C3, after V4:** the four view looks; `npm run perf` at the Village on `house-built` against `trains-on`
  (reported, not a gate); a "Trade" chapter in `docs/game-design/` with its index line; a device run at the Village.
  No atlas story (owner call "One nightly load": the atlas runs only when he asks).

## Jump-in stages, one per beat

Each is a `SEED_STAGES` id built from accepted ops and ticks only (`src/sim/railway-seed-trade.ts`) and a `JUMPS`
row in `src/world/railway-jump.ts`; the labels go to the designer and each `land` is checked in a still.

| Beat | Stage | The owner lands | What to try |
| --- | --- | --- | --- |
| Cargo comes home (R1, R2, V1) | `freight-running` | on the Village's line 1 platform | watch a train unload; find the stakes |
| Fares (R3, V2) | `fares-running` | at the till | watch riders board and the column rise |
| The buy (R4, V3) | `house-ready` | at plot 1's board, 300 in the box | hold to buy; watch it go up |
| The town after it (R4, V3) | `house-built` | on the green | more riders, plot 2's price, a crowd left behind |
| Coming back (R5, V4) | `sack-waiting` | at the till | empty the sack; see the full yards |

## Mixed builds and old saves

Old saves are **reset, not migrated**, twice (bumps A and B): `WORLD_NS` moves, the durable world starts fresh, and
the old world is left unread under its old name. No compatibility code, version fence or mixed-build test is
written. An out-of-date tab may misbehave until its update notice reloads it; that is accepted. Personal stores keyed
by the room id are pruned by `world-reset.ts` as on every bump. If the Mac's build 2 bump is ready the same day, the
two share one number. The guards that stay: the server validates both new ops and never crashes on a malformed one,
and a schema change without a bump is a bug.

## What money.md still stands for

[money.md](../brainstorms/money.md) was proposed on 5 November as a comic score. The Boogles decisions replaced its
core. **Still standing:** clothes are free and personal, and Fine Prices' "$0" joke stays (decided 10 November: "The
shop stays free"); money in dialogue stays a joke and no line is edited; no money gate on building, movement or
rewards (no route step has a Boogle price); its late-arrival proof ("loading a total must not replay earnings"),
which this plan keeps by drawing effects from row changes and snapping on load; its warning that a repeated earnings
flash teaches saving for nothing, which is why the money here is a column in the world and no HUD pulse. **Replaced:**
"the shared total must never become a wallet" (one shared wallet, 6 November); the name Bucks and "Railway value"
(Boogles, 10 November); `job.score.money` as the shared field and "no new shared fields or ops"; the A and B
variants; the B banknote (the coin carries The Boogler's face). **Still parked, and not here:** the receipt gag, The
Boogler's charging gag, real cosmetic spending.

## Level findings

- The plan places three plots and one till. The plots are `src/place/town-plan.ts`'s `plot1` to `plot3`, already
  ruled on in [town-layout](town-layout.md#level-findings) (finding 7 closes for plots 1 and 2; a house's 3.7 m walls
  cannot be climbed with the second jump). Nothing here is a secret or an ability gate.
- `npm run level-check -- --place=place` on this branch reports what main does (run 11 November); the check cannot
  see plots, stakes or the till (town-layout finding 2).
- Not checked on real ground: today's Village still has its four cottages at the old spots. By my arithmetic plots 1
  to 3 stand 16 m or more from each of them and from the shop, but V1 looks from above before it ships, and V2 runs
  the level check with the till's box added.

## Risks

- **Room safety.** No effect in a system: the build show and the column are drawn from row changes. The views treat
  `buy()` and `sack()` as queued, not done. No `Math.random`, wall clock or `Math.exp` (the till's credit reuses
  `railAwayCredit`'s ticks).
- **Hotspots shared with the Mac's build 2** (`railway-components.ts`, `railway-systems.ts`, `railway-sys-trains.ts`,
  `railway-server.ts`, `namespace.ts`): both append; rebase before each bump. `npm run inflight` on 11 November
  shows no pushed branch on these files.
- **Trains.** A new service stop at the Quarry and at Far Head changes line 2's timing; the kit and footing wagon
  tests and `npm run loop -- run` must hold at C1 and C2.
- **Server image.** `src/sim` is copied whole; `test/server-image.test.ts` confirms it at C1.
- **Performance.** Tick work is two yards, one town and three trains. Views are instanced; `npm run perf` is reported
  at C3.
- **The room tune state** gains three keys, which changes its hash; it rides bump B.
- **Town-layout.** V1 builds part of its step 5 and V3 its step 6; its steps 2 and 3 (moving what stands, the
  streets) are untouched, so the bought house stands beside today's four cottages until that plan moves them.

## Not in this plan

- The whole-route stand-ins (`loop/whole-route-standins`) and Ring Island build 2 (`plan/ring-island-build2`: the
  steel works, the install op for the longer boiler, the train through the ring). Referenced only.
- Seats, second cars, the Six fit-out and any install: they are hauled for and belong to the garage's path.
- Source upgrades, station fit-outs, town buildings, plots 4 to 8, any town but the Village, and riders with more
  than one destination (the row grows the brief's count-and-sum pairs then, on its own bump).
- The coin tray and coins in the hand, the paper tape of purchases, The Boogler's coin, a HUD figure, sounds.
- Who moves in: no resident, no lines, no furniture. Little-guy gangs, trunks, lamps and any animation of riders.
- Moving the Village to the Round, the green, the streets, the clock (town-layout steps 2, 3 and 5's rest).
- Production-core slices 6 and 7 (object lifetimes, Place's retirement): M13's work, not touched here.
- Save migration. It is the campaign outline's decision 5, due at the start of the Alpha phase.

## Open questions for the owner

Ruled by the review below. Old question 2 (300 or 450) is **decided**: "300 Boogles at the Village's first plot" (11
November). Old question 3 (leave the crowd) is **settled by its default**. Two are his; the build proceeds on each.

1. **What should train cargo do at the Village now?** Recommended: **deliveries stake the plots** (timber stakes
   plots 1 and 2; plot 3 also needs stone). The alternative is the route staking plots by milestone, as his 11
   November answer worded it ("plots the route stakes"), with cargo doing nothing you can see at Home. Answer: ___
   **Answered (owner, 12 November UTC): deliveries stake the plots (recommended).** Recorded in the [decisions](../decisions-rewards.md#d-2026-11-12-town-economy-answered).
2. **Should growing the town be something you do, not something you wait for?** Recommended: **yes, as the next
   plan, not this one.** Here cargo and fares arrive by themselves. If the route measures short (campaign outline,
   decision 2), raising a bought house by hand from the crates the trains brought is the play to add. Answer: ___
   **Answered (owner, 12 November UTC): yes, as the next plan (recommended).** Recorded in the [decisions](../decisions-rewards.md#d-2026-11-12-town-economy-answered).
3. **How does stone get from the Quarry to the Village?** Recommended: line 2 stops at the Quarry for freight only when
   `loadStop` (4) crates wait. **Answered (owner, 12 November UTC): not the recommended option; his pick: "Trains make
   a stone stop once the pier's footings are done".** His note: "I feel cago trains should be stopping at all resource
   sources to pick up cargo. player shouldnt have to be carrying that". Recorded in the [decisions](../decisions-rewards.md#d-2026-11-12-town-economy-answered). The build proceeds
   on the plan as written until the design item below is ruled.

### Open design item: trains stop at every resource source

Not redesigned here. The orchestrator's reading of his note: freight is carried by trains that stop at every resource
source; the player does not haul cargo by hand or have to call the train for it. The earlier rule in this plan, "freight
loads only where trains already stand" (the `loadStop` condition and the yard-halt load in `trainIO.arrive`), is
superseded for stone once the pier's footings are done. The wider principle, a stop at all sources, needs the
designer to rule on how it meets "freight adds no waiting on the main route" (finding 2 of the review below) before
this plan's rules, numbers or steps change.

## Design review (designer, 2026-11-11)

**Verdict: build with changes**, made above at the orchestrator's ask (the numbers, R1, V3, C1, C3). 8 decided, 6
default, 5 new; rows 2 to 9 are in [agent-calls](../agent-calls.md). **Not read:** `loop/whole-route-standins` is not
on origin, so pacing rests on the orchestrator's summary of it (about half of six hours, footings dominating). **No
stills:** nothing is placed beyond town-layout's ruled plots.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The plan's eight Decided lines (fares only, one box, the fare, the caps, the away sack, 300 and doubling, two starting buildings, model first) | Decided | Checked against [rewards rules](../decisions-rewards.md#current-rules) and [rail](../decisions-rail.md#current-rules) (`crowdStop` 4). One is not decided: 2 riders a minute a building is the brief's stand-in, a Default |
| 2 | The plan's Default lines: riders Village to Far Head only, demand-rate caps, no rider swing, the one-second hold and one press, the greybox till | Default | Keep all. The hold and the press are acts, not waits; the coin column is the count's physical form |
| 3 | A bought house counts after `buildTicks` | Default | **Changed: 100 ticks (10 s), was 600.** A minute before riders rise is a wait nobody can read |
| 4 | Riders outgrow the seats after the first house; a crowd is left (about 67 a minute, not 84) | Default | Keep: the crowd is the ask for seats, which the garage's path builds |
| 5 | Cargo stakes plots: 8 timber; 24; 40 and 16 stone; two staked at once | New | Build on it. It re-reads "plots the route stakes", so it is his to confirm (question 1) |
| 6 | Yards make a crate every 15 s (timber) and 30 s (stone), cap 8; freight is never carried | New | Build, **changed:** yards start full; a Quarry freight stop needs `loadStop` 4 crates |
| 7 | `town` and `stone` turn true from bought houses, firing the residents' existing lines | New | Build; no copy edited. The lines are reachable for the first time: list them for the owner |
| 8 | Only plots 1 to 3 are priced (300; 1,600; 12,000); 4 to 8 stay unstaked | New | Build; finding 4 |
| 9 | One home for the trade numbers, shared with the 2D model | New | Build; logged under Architecture |

**Findings.** Pacing first: the economy must add no waiting.

1. **A dead two minutes before the first stake (changed).** Empty yards filled at a crate per 15 s, so plot 1 waited
   on a later trip. The yards now start full and the first timber train home stakes it.
2. **Freight added a stop to every line 2 trip, for good (changed).** At a crate per 30 s the Quarry always "has
   stock", so every down train would dwell there, on the leg that dominates the route. It now stops only for
   `loadStop` crates, and a train there for footings loads anyway. C1 and C2 report the worst halt waits.
3. **Parked, not cut:** the house's room and walk-in wait for the details phase ("every building can be walked
   into" stays decided); C3's atlas story is struck.
4. **The waiting that remains is off the route.** Trains earn while you play: 300 Boogles is about 5.5 minutes of
   fares and 1,600 about 24 more, inside the Works' 36 minutes; no route step has a price; cargo's thresholds are met
   before the money is. Plot 3's 12,000 is about three hours on this one route: a standing goal no seed, bot or
   checkpoint waits for. So the slice cannot close the gap to six hours, and must not be asked to by raising prices.

## Design review (designer, 2026-11-11): freight stops (R2b)

Rules the [open design item](#open-design-item-trains-stop-at-every-resource-source) against the owner's answer of 12
November UTC ([entry](../decisions-rewards.md#d-2026-11-12-town-economy-answered)). **Verdict: build R2b as below.** 2
decided, 3 default, 2 new. **Read:** R1 and R2 as built on `origin/rail/slice5-r1-freight-b` (`railway-sys-trade.ts`,
`railway-trade-layout.ts`, `railway-queries-trade.ts`, `serviceOf` in `railway-sys-trains.ts`); they are not on main.
**Not run:** no sim, bot or `npm run loop` run was made for this ruling; every figure marked "by arithmetic" is from
the code's constants and is R2b's gate to measure. **No stills:** nothing is placed, moved or gated in the world; the
Quarry's down platform stands today.

**Where the 108 ticks come from (by arithmetic).** A stop costs the dwell (`TRAIN.dwellTicks` 50) plus braking from and
climbing back to 200 cm a tick at 3.5 (2 × (57.1 − 28.6) ≈ 57 ticks): about 107, the 108 measured. It is the price of
one stop, 10.8 s. Line 2's round trip with the Pier as its end is about 930 ticks, so a stop on every down trip is
+11.6% for good (finding 2 of the first review). The stone yard makes 8 crates, one trainload, every 2,400 ticks.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Freight is hauled by trains, never by hand, and the player never has to call a train for it | Decided | Owner, 12 November UTC. Confirms the "never carried" half of first-review row 6 |
| 2 | The Quarry's stone stop starts once the pier's footings are done; before that stone moves only as R1 built it | Decided | Owner's pick, same entry. "Done" is read as all twelve set: `Works.pierSet ≥ WORKS.pier` |
| 3 | "Stops at all resource sources" is met by a **full-load stop**: a yard at a line's end is served by every train that stands there (the Camp, as built); a yard at a middle halt gets a service stop only when a whole trainload waits. No scheduled stop on every train, no separate freight train | New | Build. One stop per trainload is the fewest stops that still hauls everything the yard makes; scheduled stops are finding 2 again (+11.6% a trip); a freight train is a fourth slot in `RAIL_TRAINS` (catalog order, the headway split and every pinned fixture move). Owner question 1 |
| 4 | A train on a build errand never makes the freight stop: the footing wagon's train, a train with a kit aboard, and any train while a kit is owed | New | Build. It is how "freight adds no waiting on the main route" survives the stop: the trains that carry the route's work keep their timings |
| 5 | The stop itself: line 2, heading home, at the Quarry's down platform; the normal 50-tick dwell; `loadStop` 8 (= `freightCap`), so the train must be empty and takes exactly 8 crates | Default | Tunables. 8, not the old 4: the same stone for half the stops. By arithmetic one stop about every 2,400 to 2,700 ticks, roughly one down train in eight, about 40 stone in 20 minutes |
| 6 | It applies whoever is aboard or waiting; the sim reads no player for it. A rider on that train sees the crates load and gets home 10.8 s later. The Quarry's lever and a rider's ask still load stone at any time, as R1 built | Default | Keep. The load is the show ("Show, don't tell"), and a player check would be a second rule for a 10.8 s stop once in about four minutes |
| 7 | The proof gate's limits (below) | Default | Numbers to change after C1 reports |

**The ruling, item by item.**

1. **The stop.** From the tick the pier's twelfth footing is set, a line 2 train heading home stops at the Quarry when
   the yard holds 8 crates, the train carries no freight, and it is on no build errand (call 4). It dwells 50 ticks and
   leaves with 8. The yard is already full by then, so the first free down train after the last footing loads, and the
   Village has its 16 stone (8 from the wake, 8 now) about one headway and a 14 s run later: plot 3's stone threshold
   is met in under a minute, hours before its 12,000 Boogles. **Headway:** one train in about eight is 108 ticks late
   once; line 2's balanced hold (cap 600) spreads them again at the ends. **Build legs:** every stage up to the
   twelfth footing cannot move (the rule is off); after it the wagon's and the kit's trains never stop for stone, so
   the only cost left is a work train caught in the block behind a loading train, at most 108 ticks a time.
2. **Cheapest on R1 and R2 as built: the full-load stop.** `freightLoads` already loads any train standing at its yard
   heading home, whatever it stopped for, and `freightArrives` already unloads. R2b is one clause in `serviceOf`, one
   constant and one query. No new state, op, component or save shape.
3. **The two rows.** The 11 November Default "line 2 stops at the Quarry for freight only when 4 or more crates wait"
   is **changed** in that half by his answer and calls 3 to 5 (its other halves stay open). The New row "freight is
   its own integer and never becomes logs, stone or rails a player carries" is **confirmed** in its never-carried half
   (its yard rates stay open stand-ins). The R1 branch's own row ("you call a down train at the Quarry to haul stone;
   that is the only way today") is contradicted outright: mark it `changed` when that branch lands; it is not on main.
4. **The next plan** (growing the town by hand, his answer 2) must keep the hand work at the plot: crates the trains
   brought are raised there; nobody carries them from a source.

**R2b. The stone stop (S). Independent review: yes (`src/sim`).** After R1 and R2; rides bump A if that has not
shipped, else bump B (a rule change, no shape change).

- Files: `src/sim/railway-trade-layout.ts` (`loadStop: 8`; the Quarry yard gains `after: 'pier'`),
  `railway-queries-trade.ts` (`freightStop(w, slot, r, k, dir)`: the train's line has a yard at middle halt `k`,
  `dir < 0`, the yard's `after` is met (`pierSet ≥ WORKS.pier`), `stock ≥ loadStop`,
  `freightCap − r.freight ≥ loadStop`, and not `r.wagon`, `r.logs + r.rails > 0` or `kitOwed(w, r)`),
  `railway-sys-trains.ts` (`serviceOf` ors it in, ahead of the line 2 early return so a later line's yard gets it
  from data alone), `test/railway-trade.test.ts`, this plan's R1 text and Numbers, `docs/game-design/place.md`.
- Tests (replace "freight never adds a stop"): no Quarry freight stop on any tick before the twelfth footing; after
  it, with nothing asked, each stop loads exactly 8 and none is made by a wagon, kit or kit-owed train; an up train
  never stops for freight; a lever ask still loads before and after; determinism and the yard invariant as R1.
- **Proof gate** (C1 runs it; measured against R1 as built):
  1. Every seed stage up to the pier's twelfth footing is tick for tick what it was: its pinned fixtures do not move.
  2. Each later stage (`deck-laid` to `ring-joined`) is at most 108 ticks later than before, leg by leg, and
     `ring-joined` at most 324 in all. `npm run loop -- run`: order and bills unmoved.
  3. The worst wait at each line 2 halt, before and after, stays under C1's 1,050-tick bound, and no worse than 108
     ticks above R1's figure.
  4. Stone: 20 minutes with nothing asked from the first post-footings stage delivers at least 32, timber still 79
     to 85.
  - If 2 or 3 fails: also refuse the stop while the wagon's train is the next train behind on the down track, and
    measure again. If it still fails, report to the designer; do not raise the limits.

**Findings.**

1. **Before the twelfth footing, stone still arrives only by an ask** (8 at the wake, then none). That is his pick,
   and it costs nothing: plot 3 is three hours of fares away. V1's stone stack at the Village will sit at 8 through
   the Works; the Quarry's yard standing full beside passing trains is the thing a player may read as broken. Not a
   blocker; watch for it in the first owner session.
2. **The principle is now data, not a Quarry special case.** A later source (the steel works' yard, a second town's)
   is a `TRADE.yards` row: at an end it loads free, at a middle halt it gets the full-load stop. Its `after` gate is
   that plan's call.

**Owner question (one).**

1. **Is a stop only when a full trainload waits what you meant by "stopping at all resource sources"?** Recommended:
   **yes.** Every source is served with nobody asking, and a train stops about once in four minutes instead of every
   trip. The alternative, every down train stopping at the Quarry, costs 10.8 s on each trip for the rest of the
   game. Until he answers, R2b builds the full-load stop; switching is `loadStop` 8 to 1. Answer: ___
