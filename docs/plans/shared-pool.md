> **Status: proposed (2026-11-18), planner. Step 1 is on main (#2254, 19 November 2026); step 2 and Checkpoint B are on main with Port Quay's Roundhouse (#2570, #2595, #2598, 27 November 2026); steps 3 and 4 are not built.** The planner read the code at `origin/main` `ead747afe`
> (world v61), ran `npm run loop` and `npm run loop -- node <id>` for `steelhome` and `install`, and `npm run
> inflight`. No browser run; nothing placed, so no level check. Three owner questions, each proceeding on its
> recommendation.

# Upgrades pay from one shared pool

The owner, 12 November 2026: "I feel like resources when one goes to upgrade, should essentially live in a "shared
pool" regardless of which hub they are stored at. essentially hub is pseudo connected across the world."
([entry](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool)). His pick on 18 November: "One pool
pays every upgrade; towns still only see goods from their neighbours"
([entry](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards)). That entry leaves one thing to this plan: how
the pool meets "taken where it lies".

## 0. The answer on one screen

- **Today the rule is already true.** Only two built spends draw on stored goods rather than a player's back: a
  garage install spends steel from Home's Roundhouse bay, the one steel store, and a house plot spends Boogles from
  the one strongbox. No other upgrade costs anything. Every bill that builds the route is fed by hand from a back.
  So nothing a player sees changes now, and no hauls are removed.
- **The rule, for every later build:** an upgrade checks its price against **every hub store of that kind, added
  together**, and takes it **from those stores where they lie**: first the store at the post where you pay, then the
  others in a fixed order. Nothing travels and nothing appears. The far stack shrinks where it stands.
- **How it meets "taken where it lies":** that rule is about hands. A back lifts goods only from the yard, rack or
  pile it stands at, and goods move between places only on backs and trains. Paying for an upgrade lifts nothing, so
  it isn't a take: the goods are used up where they lie. Put, take and every hand-fed bill stay exactly as decided on
  10 November. Alternatives (section 2): deliver the price by train first (a new mechanic), one number with no place
  (breaks "what's on screen is true"), or pay only from where you stand (against his words).
- **What counts as an upgrade** (question 1): anything bought or installed for the room at a post or board (garage
  installs, house plots, later source upgrades and cars). Bills that build the route (station frames, the forge, the
  kiln, the works, the stall, the pier, leg frames) aren't upgrades. They stay hand-fed: "you still haul for each track
  segment" (DESIGN, the core loop).
- **What is a store** (question 2): a hub's place where goods wait to be spent (Home's bay today). Not a maker's
  output rack (Ring Island's steel rack, the forge rail rack, the Works rack), a train's deck, a back, a pile, or a
  bill's fed stock. Goods join the pool when a train lands them.
- **Plots** (question 3): a hub town's plots are staked by that town's own deliveries, as built. Only the buy, in
  Boogles, is paid from the pool, and the strongbox is already one wallet.
- **Builds:** step 1 gives the pool one owner in the rules, with no state, op, wire or save change and no bump. Step 2
  goes in with garage step 5 (Port Quay's post spends Home's bay). Step 3 goes in with the first hub town beyond the
  Village. Step 4 is built only if question 2 is answered "yes".

## 1. What "an upgrade" is today: every spend, and where its goods lie

Read from `origin/main` `ead747afe`. "Back" means the actor's own `Account` row (`src/sim/railway-components.ts:262`).

| Spend (op) | What it costs | Paid from | Rule | Covered? |
| --- | --- | --- | --- | --- |
| Bigger cradle, big boiler (`rail.install` parts 4, 3) | 4 and 6 steel (`INSTALL_STEEL`, `src/sim/railway-works-layout.ts:10`) | Home's bay: `Shed.steel - Shed.spent` (`steelPool`, `railway-works-layout.ts:15`; `Shed`, `railway-components.ts:211`) | `install`, `src/sim/railway-sys-steel.ts:197`; checks the pool at `:208`, spends at `:219` | **Yes**: already one pool (garage step 3, v59) |
| 20 m/s upgrade, longer boiler (`rail.install` parts 1, 2) | nothing (`INSTALL_STEEL` 0) | (none) | same; part 2 needs steel landed (`h.steel < 1`, `:214`) | Yes, nothing to pay |
| House on a plot in the Round (`rail.buy`) | Boogles at the plot's price | the one strongbox, `Till.boogles` (`railway-components.ts:322`; `w.single(Till)`) | `buy`, `src/sim/railway-sys-trade.ts:190`; checks at `:200` | **Yes**: already one wallet (11 November, DESIGN 6) |
| A plot staked | nothing spent: a threshold | the town's own `Town.wood`, `Town.stone` (received, never spent; `railway-components.ts:301`) | `plotsStaked`, `src/sim/railway-queries-trade.ts:55` | **No**: what a town receives (question 3) |
| Pack frame, proper axe, hook, jump, glider, rail yoke (planned) | nothing | (none) | `rail.pack` `railway-sys-line2.ts:303`, `rail.axe` `railway-sys-line1.ts:253`, the route's `rail.grant` | Nothing to pay |
| Station frames T1 to T3, Q1 to Q7 (`rail.deposit`) | logs, stone, rails, the beam | the back | `deposit`, `railway-sys-line1.ts:146`; `deposit2`, `railway-sys-line2.ts:204` | **No**: route bill (question 1) |
| The forge's bills (24, then 56 logs) | logs | the back | `deposit2` (`rail.deposit` at the forge), `railway-sys-line2.ts:204`, `Forge.used` at `:222` | No: route bill |
| The kiln (16 logs, 16 stone) | logs, stone | the back | `kiln`, `railway-sys-works.ts:54` | No: route bill |
| The cradle (8 rails), stall, pier and Ring footings | rails, footings | the back | `cradle` `railway-sys-works.ts:133`, `footSet`, `ringFootSet` | No: route bill. The cradle's 8 rails build the footing wagon; the *bigger* cradle is the steel install above |
| The steel works' bill (8 logs, 12 rails) | logs, rails | the back | `steelFeed`, `railway-sys-steel.ts:82` | No: route bill |
| A greybox leg's frame (`rail.legStock`) | logs, rails | the back | `legStock`, `railway-sys-route.ts:34` | No: route bill |
| The away sack (`rail.sack`) | nothing: it pours Boogles into the box | (none) | `sack`, `railway-sys-trade.ts:178` | Not a spend |

**Where each resource lies today.** Logs and stone: the Village's recovery rack (`Rail.rack`, `Rail.stoneRack`,
`railway-components.ts:44`), piles (`Pile`, `:261`), backs, bills, train decks, and the Camp and Quarry crate yards
(`Yard`, `:291`, which a train empties into `Town`). Rails: the forge rail rack (`Forge.rack`, `:228`), the depot,
backs, decks, and Ring Island's yard (`Steel.yardRails`, `:168`). Footings: the Works and pier racks. Steel: Ring
Island's works rack (`Steel.rack`, cap 6, `STEEL` at `src/sim/railway-ring-layout.ts:271`), line 2's decks
(`Train.steel`), and Home's bay (`Shed`), which it reaches only by train (`steelArrives`, `railway-sys-steel.ts:140`,
adds to `Shed.steel` at `:144`). Steel is never hand-carried: `Account` has no steel field. Boogles: the one `Till`
and its away `sack`. The junction yard `LegYard` (`:357`, one row, `gorge`) exists but nothing feeds it. The halt
yards of the 10 November answer (station-deposit build 1) aren't built. `TRADE_TOWNS` is 1
(`src/sim/railway-trade-layout.ts:83`): the Village is the only town in the rules. Port Quay's Roundhouse isn't built
(garage step 5).

**The reading this plan takes.** "When one goes to upgrade" means buying or installing something for the room at a
post or board. Route bills aren't upgrades: they're fed by hand at their frame, and pooling them would remove the
route's hauling (section 5). Steel's *later* route bills are the one exception the owner has already settled: they
draw the same pool, since steel is never carried ([15 November, answer 2](../decisions-core-loop.md#d-2026-11-15-garage-choices)).
His words don't say this outright, so it is question 1.

## 2. "Taken where it lies", and how it meets the pool

**What it covers today.** It is his answer to "A yard or a bank?" on 10 November: "A yard at each halt: take it where
it lies; trains later carry it to where their line needs it"
([entry](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts)). He chose it over the brief's option
(c), "one pool, put in and taken out at any station"
([station-deposit](../brainstorms/station-deposit.md), review finding 2). Other places it appears: Ring Island build
2's call 21, "The kit lies in a yard at the island halt and is taken where it lies"
([ring-island-build2](ring-island-build2.md)), and finished-deposits' "No automatic overflow or new global stock pool"
([finished-deposits](../brainstorms/finished-deposits.md)). In code it is the shape of every take:
`rail.steelTake` lifts Ring Island's kit only at `RING_STEEL_YARD`'s 4 m reach (`railway-sys-steel.ts:59`;
`railway-ring-layout.ts:275`; reach at `src/world/railway-server.ts:311`), and `rail.rackTake`, `rail.take`,
`rail.forgeTake`, `rail.depotTake` and `rail.footTake` work the same way. Each moves goods from one store onto the
actor's back, judged from the actor's position. Every bill takes only from the actor's back. **So the rule is about
hands:** what a back lifts, it lifts where the goods are. Goods change place only on a back or a train.

**Where the two disagree.** Suppose a player at hub A buys an upgrade priced in a kind that lies only in hub B's
store. If "taken where it lies" means goods only ever leave a store with someone standing at it, the pool breaks
it: B's store loses goods and nobody is there. If it means what the code does (hands lift where goods lie), the two
don't touch: paying is not lifting.

**How they meet: four ways.**

| | A. Spent where it lies (**recommended**) | B. Delivered, then spent | C. One number, no place | D. Pay where you stand |
| --- | --- | --- | --- | --- |
| The rule | The price is checked against every hub store of the kind, added together, and taken from them where they lie: the paying post's store first, then the rest in a fixed order | The price is reserved from the far store; the part fits when a train brings it to the post | Each kind is one world number; every hub shows the same total | Only the store at the post counts |
| What visibly leaves | The paying post's stack first; only the shortfall from B's, which shrinks in place | B's stack, onto a train; the train unloads at A, then A's stack is spent | Nothing at any place: there is no place | A's stack only |
| His words | Fits "pseudo connected", and towns' goods stay where they arrived | Bends "pseudo connected" (you wait for a train) | Fits "shared pool" literally | Against "regardless of which hub" |
| Other decisions | Keeps 10 November (hands, yards, steel's visible stack) and DESIGN 11 (each stack is true) | Adds a reservation and a delivery errand: a new mechanic, outside the brief | Breaks "a visible stack in the Roundhouse bay" (10 November), "machines show their work physically" ([owner call](../agents/owner-calls.md#physical-work)) and "what's on screen is true" (DESIGN 11) | Keeps everything but the 12 November decision |
| Cost | One count and one ordered take | New state, a new train errand, waiting | A store rewrite, and views showing goods that aren't there | None |

**Recommendation: A.** Hands keep "taken where it lies". Paying uses goods up where they lie, so nothing teleports
and every stack keeps showing what is really there. The strongbox already works this way for Boogles: the
campaign's hub-town plots are bought "on the one wallet (no second strongbox)"
([campaign outline](campaign-outline.md#towns-at-the-hubs), section 2), so a buy at a far town's board will empty a
column that stands in Home's hall. Research agrees: "the idea of one pool everyone builds from fits; the invisible
cloud does not. Boogle's pool is the Home Yard, with bays you can see, and goods reach it on trains"
([upgrade-economy](../research/upgrade-economy.md), the 6 November addendum on shared stock).

## 3. The rule, for builders

1. **An upgrade** is a room-wide thing bought or installed at a post or board: a garage install, a house on a staked
   plot, and later a source upgrade or a car. A bill that builds the route is not one (question 1). A free upgrade
   has nothing to pay.
2. **A store** is a place at a hub where goods of a kind wait to be spent on upgrades. Today there are two: Home's
   Roundhouse bay for steel (`Shed`) and the strongbox for Boogles (`Till`). Not stores: a maker's output rack, a
   train's deck, a back, a pile, a bill's fed stock, a town's received counters, the away sack (question 2). Halt
   yards (station-deposit build 1) hold logs, stone and rails. No upgrade is priced in those kinds, so the yards join
   no pool now (see Later).
3. **The pool** of a kind is the sum of its stores. An upgrade is accepted only when the pool covers its price, its
   other gates pass, and the actor stands at a post where it is sold (each post's own reach check).
4. **The take**, all inside one accepted op: the price comes off the store at the paying post first, if there is
   one, then off the other stores in catalog order (Home first, then route order) until it is paid. Integers only, in
   a fixed order, inside the op. A refused op takes nothing.
5. **Hands are unchanged.** Put, take and every hand-fed bill act only on the store, pile or frame the actor stands
   at (10 November). Spending is never a way to move goods: no upgrade ever adds goods to a store.
6. **What a town receives is unchanged.** Freight unloads at a town from its neighbours (campaign outline, "Towns at
   the hubs", section 2). A plot is staked by that town's own deliveries; only its buy is paid, in Boogles, from the
   one strongbox (question 3).

**What the player sees.** Paying at the store's own post (Home's bay today): exactly as built. The bill shows "STEEL
n/4" from the pool and the blocks in bay 150° go as the install is accepted
(`src/entities/railway/boiler-install-view.ts:108`). Paying from afar (first possible at Port Quay, step 2): the
screen's bill counts the pool. When any of it lies elsewhere, the bill says where. Draft for the owner, not The
Boogler's: **"in Home's bay"** under the count. Install is held as now. At the receipt, Home's stack loses the price
where it stands, and a friend there sees the blocks go. Nothing appears at Port Quay, which holds no stack of its
own: a copied stack would show steel that isn't there (DESIGN 11). Two posts pressed at once: the install revision
and the pool check settle it as they do at one post. The second press, if the pool is now short, is refused and
spends nothing (`railway-sys-steel.ts:205` to `:208`). Solo: the pool is never smaller than any one store, so an
upgrade you could pay for at one store you can still pay for.

## 4. State and sync

| Piece | Kind | Where | Change |
| --- | --- | --- | --- |
| Steel landed and spent (`Shed.steel`, `Shed.spent`) | Server | `railway-components.ts:211` | None (steps 1 to 3) |
| The strongbox (`Till.boogles`, `spent`) | Server | `railway-components.ts:322` | None |
| A town's received goods (`Town.wood`, `stone`) | Server | `railway-components.ts:301` | None; read per town |
| The pool's count, the ordered take | Server rule, pure | step 1: `src/sim/railway-queries-works.ts` (count), `railway-sys-steel.ts` (take) | New function names; same arithmetic |
| The screen's pool count and its "in Home's bay" line | Local, from replicated rows | `src/entities/railway/garage-state.ts`, `garage-data.ts` | Step 1 (count), step 2 (line) |
| Each store's stack | Local, from its own row | `boiler-install-view.ts` | None: a stack draws its own store, never the pool |

- **Ops and wire:** no new op, field or message. `rail.install` and `rail.buy` keep their shapes and meanings. Step
  2 adds a second reach point for `rail.install` (`railway-server.ts:316`); it is the same op. No saved field, no
  catalog change and no `WORLD_NS` bump in steps 1 to 3 (v61 stays). Step 2's Port Quay station and step 3's hub-town
  rows each bring their own bump in their own plans. Step 4 adds a saved field and bumps (dated history line in
  `src/world/namespace.ts`).
- **Prediction:** `rail.install` and `rail.buy` are not predicted (`src/world/railway-predict.ts:1` to `:3`; neither
  is in `RAIL_PREDICTED`, `:55`). The screen waits for the receipt, and a far stack falls when its row replicates.
  Effects follow the replicated row, never `apply` (room-safety).
- **Mixed build** (web live minutes before the server; dev phase, no fences): step 1 changes no meaning, so nothing
  differs. Step 2: a new client offers Install at Port Quay while the old server reaches only `SHED_TABLE`. The
  install is refused, nothing is spent and the screen shows the refusal. Once the server is live it is accepted. A
  queued install is never treated as done.
- **Lockstep:** step 1 touches `src/sim` (already in `LOCKSTEP_FILES`). The count is an integer sum and the take is
  integer subtraction, in a fixed order. No floats, trig, random or wall time. Replay fixtures must not move in steps
  1 to 3. Step 4 regenerates `server/test/fixtures/world-host-trace.jsonl.gz` with `HOST_TRACE_RECORD=1`, naming the
  changed inputs, as garage step 3 did.
- **Who owns ticks and saves:** unchanged. The server's rule tick and checkpoints, `Shed` and `Till` as saved today.

## 5. Pacing

- **Under the recommendation, nothing changes now.** `npm run loop -- node install` and `node steelhome`: no bill
  and no carries ("grind 0 / 0 / 0 / 0"). Steel is never carried, the install prices stay 6 and 4 against
  `STEEL.total` 12 (`railway-ring-layout.ts:271`), and Boogles keep one box. No hauls are removed, and no gate or bill
  gets cheaper.
- **If question 1 went the other way** (route bills from the pool), every hand haul on the route would go. Today's
  loop puts the forge at 245 carry-metres at 1 player, Q3 at 223, the stall at 294 and T3 at 180 (`npm run loop`,
  "Grind per beat"). Each would become a press at the frame wherever the logs lay. That is the trivially-cheap case
  the reading avoids.
- **If question 2 is answered "yes"** (step 4), a steel install could happen as soon as it is cast at Ring Island,
  without waiting for the ride home. That moves the bigger cradle earlier by up to one line 2 trip from Ring Island
  to the Village plus the wait for a train. **Unmeasured.** Measuring job: a scratch over the `steel-home` seed path
  (`src/sim/railway-seed-steel.ts`) counting ticks from the fourth cast to the first steel landing in `Shed`, at 1
  and 3 players. The longer boiler's and the rotunda's gates read landed steel, so they don't move.

## 6. Steps

Each step leaves `node dev/ship-check.ts` green. The checkpoints carry the suites.

- [x] **1. The pool has one owner in the rules** (sim refactor; no state, op, wire, save or bump).
  - `src/sim/railway-queries-works.ts`: `upgradePool(w)` returns Home's bay landed less spent (the `steelPool`
    formula, read from the world). `src/sim/railway-sys-steel.ts`: `install` checks `upgradePool(w)` and spends
    through one `spendUpgrade(w, n)` that writes `Shed.spent`. Draw order needs no code while there is one store.
    The second store's step adds it, as section 3, item 4 says.
  - `src/entities/railway/garage-state.ts:24`: the screen's `steel` reads `upgradePool`. The bay stack
    (`boiler-install-view.ts:108`) keeps reading its own store's `steelPool(sh)`. Name the difference in a comment:
    screens count the pool, a stack shows what lies there.
  - Docs: the garage section of `docs/game-design/place.md` (the owner of the install) gains the section 3 rule in
    two sentences, linking this plan.
  - Done: every install's check and spend go through the two functions, the views read as above, and behaviour is
    unchanged.
  - Checks: `node --test test/railway-install.test.ts` (its "paid installs spend only the shared pool" case passes
    unchanged). `server/test/railway-steel-host.test.ts`'s "paid host: cradle and big boiler cross r:edit, share the
    pool" and "paid host: short pool and early big boiler refuse" cases pass unchanged: they send `rail.install` as
    real `r:edit`s. The host trace fixture must not move. Not a rule change, so no new host test.
  - Bots and seeds: none walks a changed prompt. `dev/look/bots/railway.ts`, `coop-unlock.ts` and
    `src/sim/railway-seed-route.ts` never install. `railway-seed-steel.ts`'s `boiler-long` installs part 2, which is
    free. Seed goldens don't move.
  - Look: `npm run look -- --real --rail-seed steel-home --hud --eval dev/look/evals/railway-install.ts` opened on
    the Bigger cradle. One still of the bill reading as before.
- [ ] **Checkpoint A** (after step 1): `npm run check:full`, `npm --prefix server test`. `npm run test:net` is not
  needed: `server/src` and the seeds are unchanged.
- [x] **2. Port Quay's post pays from the same pool** (on main: #2570, #2595, 27 November 2026) (server and view; built inside
  [garage step 5](garage-choices.md#7-steps), with Port Quay's station, which owns that bump).
  - `src/world/railway-server.ts:316`: `rail.install` is judged at `SHED_TABLE` or Port Quay's table point (the
    station plan's constant). The rule is unchanged: it already spends the pool.
  - `src/entities/railway/garage-data.ts`: when the paying post's site holds none of the pool, the bill's need line
    adds where it lies. Draft **"in Home's bay"**, marked for the owner.
  - Test: in `server/test/railway-steel-host.test.ts`, add "pool host: an install at Port Quay's post spends Home's
    bay through r:edit; refused when short and from neither post". Use a real `r:edit` from Port Quay's spot with
    steel only in Home's bay: accepted, `Shed.spent` up by the price, the replicated `Shed` row seen by a second
    session. Then short: refused, nothing spent. Then 30 m from both posts: refused.
  - Bots: none (Port Quay is past every bot's route today). Seeds: the station plan's.
  - Look: two tabs. Tab A holds Install for the cradle at Port Quay's post. Tab B is at Home's bay 150°, with stills
    before and after the receipt: 4 fewer blocks.
- [x] **Checkpoint B** (with garage step 5's): `npm run check:full`, `npm --prefix server test`, `npm run test:net`
  (`server/src` changed). Read the two-tab stills.
  **27 November 2026.** The shared [Port Quay checkpoint](port-quay-roundhouse.md#steps) records 2,481 unit
  passes, 415/415 in audited server CI, 410/410 on the standalone network retry, 29 passing level reports,
  the four loop runs, and the arrival stills. The real Port Quay `r:edit` host test passed. The opened two-tab
  stills show the Quick boiler installed at Quay, the steel at Home dropping from 12 to 11, and Home staying on
  Line 2 when Quay brings Bay line. The widened buffer beam is clean in both retakes, with 92/92 targeted tests
  passing after the fix. Real-time feel, audio and device behaviour not claimed; not tested on a device.
- [ ] **3. A hub town's plots: staked by its own deliveries, bought from the one box** (built inside the first hub
  town's build, greybox-route's stand-in towns or slice 5's R4 generalised, which owns `TRADE_TOWNS > 1` and its
  bump).
  - No rule change expected: `plotsStaked(w, town)` already reads that town's row (`railway-queries-trade.ts:55`), and
    `buy` already spends the one `Till` (`railway-sys-trade.ts:200`). The step is the proof, and a doc line in
    `docs/game-design/trade.md`.
  - Test: in `server/test/railway-buy-host.test.ts`, add "buy host: a hub town's plot buys from the one strongbox at
    its own board; its stakes read only its own deliveries". A real `r:edit` at town 1's board: accepted, `Till`
    down by the price. Then the Village's deliveries raised alone: town 1's next plot stays unstaked.
  - Look: town 1's board and Home's counter column, before and after.
- [ ] **4. Only if question 2 is answered "yes": Ring Island's cast steel joins the pool** (sim, saved field, world
  bump).
  - `railway-components.ts`: `Steel` gains `spent: 'int'`. `spendUpgrade` takes from Home's bay first (the paying
    post's store), then `Steel.rack`, adding to `Steel.spent`. `upgradePool` adds `Steel.rack`.
    `src/sim/railway-check-steel.ts`: steel conserved as poured = rack + aboard + bay landed + `Steel.spent`.
    `steelService` keeps calling at a rack that still has steel. Part 2's "steel home" gate (`:214`) and the
    rotunda's stage keep reading landed steel.
  - `src/world/namespace.ts`: `WORLD_NS` bump with a dated history line.
  - Test: in `server/test/railway-steel-host.test.ts`, add "pool host: with Home's bay empty the cradle installs from
    Ring Island's rack through r:edit; the rack falls, conserved, after restart". Regenerate the host trace fixture
    with `HOST_TRACE_RECORD=1`.
  - View: Ring Island's rack loses its bars at the receipt (its existing rack view, which draws the row).
  - Look: two tabs, the install at Home and a still of Ring Island's rack before and after.
  - Checkpoint C: `npm run check:full`, `npm --prefix server test`, `npm run test:net` (seeds' steel rows change),
    and `npm run loop -- run`.

**Order:** step 1 any time (no hotspot clash: `npm run inflight` shows only `claude/forge-rack-move`, whose files
don't include any step 1 file). Step 2 with garage step 5, step 3 with the first hub town, step 4 on his answer.

## 7. Level findings

Nothing placed. No position, gate or reveal changes. `npm run level-check` was not run.

## 8. Risks

- **Two counts that look alike.** Step 1's whole point is that a screen counts the pool while a stack draws its own
  store. A later builder who points a stack at `upgradePool` would show steel at Port Quay that isn't there. The
  comment and the place.md line guard this.
- **A protected essential bill.** When steel's later route bills exist, an install could spend steel a route bill
  needs. The 15 November answer, "garage prices small against the route's bills, no scarcity forced", covers it.
  The route steel bill's plan checks its stand-in numbers against both installs (10 steel of 12 today). Research:
  Stardew's lesson, "a protected next essential bill" ([upgrade-economy](../research/upgrade-economy.md), addendum).
- **A far stack that falls with nobody near.** True on screen, but unexplained to a friend standing there. No cue
  is added now (no far case exists until step 2). See Later.
- **Room safety:** no new effect in `apply`. A queued install isn't done. Step 4's new field must be validated on
  load like every `Steel` field. No new server import: `src/sim` is already copied whole (`server/Dockerfile:14`).
- **Performance:** none. One integer sum per install press, no meshes or tick work.

## 9. Open questions for the owner

1. **Is a bill that builds the route an "upgrade"?** Recommended: **no.** An upgrade is bought or installed for the
   room at a post or board: garage installs, houses, later source upgrades and cars. Station frames, the forge, the
   kiln, the works and leg frames stay fed by hand at the frame. Pooling them would remove the route's hauling:
   about 245 carry-metres for the forge alone at 1 player. Steel's later route bills already draw the pool (your 15
   November answer).
2. **Does steel cast at Ring Island count before a train brings it home?** Recommended: **no.** Goods join the pool
   when a train lands them in a hub's store (Home's bay). The steel trains keep their job, and your 10 November "a
   visible stack in the Roundhouse bay, spent by an install" holds. "Yes" is step 4: installs come up to one ride
   earlier (unmeasured), with a world reset.
3. **Is a hub town's plot staked by its own deliveries, or by everything delivered anywhere?** Recommended: **its
   own**, as built. "Towns still only see goods from their neighbours", and the stakes are what the town sees. Only
   the buy, in Boogles, comes from the one strongbox.

## Later

- A small cue at a far store when an upgrade paid from afar takes from it (a puff and a soft clank as the blocks
  go), with step 2 if the two-tab look shows the drop reads as unexplained.
- When an upgrade is first priced in logs, stone or rails: list its stores (hub halt yards from station-deposit
  build 1, the Village yard) under section 3's rule, and ask whether every yard counts or only hub ones.
- Whether the away sack's Boogles should count toward a buy before it is emptied (today the buy reads the box only).

## Design review (2026-11-18)

Run by the planner on its own plan, in the same context. Read: DESIGN.md, the owner-calls index, the rewards
topic's Current rules and both entries in full, the 10 November yards entry, the 15 November garage answers,
`docs/direction.md` (the open item at line 102 is this plan), the playtest log's newest entries (no evidence on
pools), the design-work rules, and the research index's economy section
([upgrade-economy](../research/upgrade-economy.md), addendum). Not a port from Place.

### Calls: 4 decided, 4 new, 7 default

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | One pool pays every upgrade, whichever hub's store holds it; a town's received goods stay neighbours only | Decided | [18 November](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards), [12 November](../decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool) |
| 2 | Steel's later route bills draw the same pool | Decided | [15 November, answer 2](../decisions-core-loop.md#d-2026-11-15-garage-choices) |
| 3 | Boogles are one strongbox; hub-town buys use it | Decided | [11 November](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered); DESIGN 6 |
| 4 | Free upgrades (20 m/s, longer boiler, pack, axe, rail yoke) have nothing to pay | Decided | [15 November](../decisions-core-loop.md#d-2026-11-15-garage-choices); [18 November](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards) |
| 5 | Route bills are not upgrades; they stay hand-fed from the back at the frame | New | Recommended (question 1): DESIGN's core loop, "you still haul for each track segment" |
| 6 | "Taken where it lies" governs hands; an upgrade's spend is not a take and uses goods up where they lie (way A) | New | Recommended, section 2; research addendum on shared stock |
| 7 | Only a hub's store is in the pool; a maker's rack, a deck, a back, a pile or fed stock is not; Ring Island's rack waits for the train | New | Recommended (question 2): 10 November "a visible stack in the Roundhouse bay" |
| 8 | A hub town's plots stake on its own deliveries, never the pool | New | Recommended (question 3): 18 November "towns still only see goods from their neighbours" |
| 9 | The take order: the paying post's store first, then catalog order (Home, then route order) | Default | The payer sees their own stack fall first (DESIGN 7) |
| 10 | A far store shrinks in place at the receipt with its existing stack view; no new cue for now | Default | No far case exists before step 2; a cue is in Later |
| 11 | The screen counts the pool and says where it lies when not at the post (draft "in Home's bay") | Default | DESIGN 7 and 11; draft copy, not The Boogler's |
| 12 | A post with no store shows no copied stack, only the count | Default | DESIGN 11, "what's on screen is true" |
| 13 | Two posts pressed together: revision and pool check; a short second press is refused, nothing spent | Default | As built at one post (`railway-sys-steel.ts:205` to `:208`) |
| 14 | The away sack is not in the pool; a buy reads the box | Default | As built; the sack is emptied with one press beside the box |
| 15 | Halt yards (station-deposit build 1) stay put and take only and join no pool until an upgrade is priced in their kinds | Default | No such upgrade in code or any approved plan |

### Findings

1. **The rule changes nothing visible today** (confirmed in code, section 1). A plan that built a store catalog,
   draw-order code and copy for one store would be speculative ("Small and readable"). **Changed step 1:** two named
   functions and the screen-versus-stack split only. The draw order is written as the rule (section 3, item 4) and
   coded by the first step that adds a second store.
2. **Where the player first meets it: Port Quay.** There, the payer stands 1 km or more from the steel. Without a
   line saying where it lies, "STEEL 6/4" at a post with no blocks reads as untrue (DESIGN 11). **Changed step 2:**
   the "in Home's bay" draft line and the two-tab look.
3. **Research:** the upgrade-economy addendum backs way A ("one pool everyone builds from fits; the invisible cloud
   does not") and question 2's "no" ("goods reach it on trains"). Its Stardew note, "a protected next essential
   bill", becomes a risk for steel's later route bills (section 8), not a step: no such bill exists.
4. **Co-op:** players split between two Roundhouses share one pool through two screens, as garage-choices already
   says. The friend who sees the far stack drop without knowing why is the one gap. It goes in Later, tied to step
   2's look, not built blind.
5. **Solo:** the pool only adds stores, so it can never make an upgrade unaffordable that a single store could pay
   for. No softlock and no new gate. Reach is unchanged except step 2's second post.
6. **Level:** nothing placed or gated; no flow finding.

### Owner questions

The three in section 9, each proceeding on its recommendation.
