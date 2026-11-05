# Upgrade economy: one material, many things worth improving

_Research report, 5 November 2026. Live primary-source research, repository inspection at `e941b9b0`, and fresh runs of the existing offline economy model. Proposal only: a finite material-based upgrade tree, eight-hour pacing budget, sinks, co-op access and simulation requirements. No gameplay, economy-model or owner-decision changes; no reference games played and no new Boogle playtest._

**Evidence:** **[V]** = inspected repository or fetched primary text; **[R]** = historical report or recorded playtest, not independently reproduced; **[P]** = proposed design, arithmetic or tunable target. Developer interviews establish intent and reported experience, not universal psychological laws. GDC evidence below is a slide deck or session abstract, not a watched talk. Numbers in the proposed tree are starting hypotheses, never measured reference-game pacing.

## Answer first

**[P] Build a shallow tree with a shared material spine and several useful branches at each stop.** Start with timber and existing stone/basic rails, then discover **steel fittings, cement, copper coils and crystal seeds** in four substantial areas. Each new component improves engines, track, bridges, stations, towns, carts, tools and the places where abilities work. Introduce the branches gradually; do not ask players to buy eight upgrades every time they arrive. Smaller places provide abilities, puzzles, shortcuts and discoveries using materials already known. Finish by using the accumulated railway to reach the old island and The Boogler, without a final exponential invoice.

The next upgrade should answer a complaint the player has begun to feel: too many trips, an awkward crossing, a distant supply rack, a cramped station or a journey worth making faster. Then it should visibly remove that complaint. **A material unlock reveals possibilities; installing something makes the improvement real.** The island never changes era, and old construction remains useful.

This serves **Toys before chores**, **Cooperation is automatic, not negotiated**, **Communal world, personal rewards**, **Telegraph everything**, **Designed for drop-in, drop-out** and **Show, don't tell** in [DESIGN](../../DESIGN.md). Disposition: **research now; bounded design proof after the existing production and owner-playtest gates**. This is not permission to expand the production-core conversion.

## Authority and the current baseline

- **[V]** The [current-decision index](../proposals/boogle-2.md#current-decision-index) routes this question to the Design Table and after-round-3 decisions. Materials replace eras; building, exploration and incremental growth matter equally; the efficiency ladder is tool → carry → closer supply → faster travel. The opening path precedes trains. The latest 5 November call keeps the hook a pull to its target; this proposal does not restore swinging.
- **[V]** The owner's brief for this report adds the explicit requirement that **each big area's resource serves several systems**, with resource-free smaller areas between. The exact materials, area count, recipes and budgets below are proposals, not already accepted decisions.
- **[V]** [Owner calls](../agents/owner-calls.md#owners-standing-calls) require physically legible machines and programmatically tunable playtest values. Visible piles, fitted parts, moving feeders and loaded wagons must correspond to counted work. A menu purchase followed by a sparkle is insufficient.
- **[V]** [Production core](../plans/production-core.md#reviewable-promotion-slices) owns the migration and its proofs. Preserve accepted construction, per-player material balances, personal cosmetic claims and already-funded offline completion. Its introductory slice-1 record is not proof that later playable slices have shipped. No new economy is smuggled into the conversion.
- **[V]** [Money](../brainstorms/money.md) is **proposed**: shared comic railway value, free personal clothes and no spendable shared wallet. This report needs material sinks, not a monetary sink. It does not approve the proposed label, pulse, receipt or Boogler dialogue changes.
- **[R]** The [4 November iPhone playtest](../playtests.md#2026-11-04-owner-solo-on-iphone-the-default-url) records a finished run, a great-trunk soft-lock and affection for the forge, town and museum. Its 41:27 session clock includes background time. The [tracker](../plans/round-4-notes.md#solo-play-4-november-owner-on-iphone-not-yet-triaged) separates implementation from owner approval. It is not a novice economy benchmark or the missing co-op replay.

### What earlier research contributes, and what is historical

| Existing report                                             | Retain                                                                                                      | Do not inherit as current authority                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Rail economy model](rail-economy-model.md)                 | Integer load thresholds, separate supply/travel waits, explicit content debt and sensitivity analysis       | Six-era campaign, capacity-12 prototype and fitted distances as today's rules                        |
| [Compounding infrastructure](compounding-infrastructure.md) | A connection returns a service; avoid circular bootstrap dependencies; towns repay supply with capabilities | Earlier no-haul alternatives, era changes, broad offline supply and unresolved duration alternatives |
| [Next-load motivation](next-load-motivation.md)             | Anticipate a concrete consequence; retire solved commutes; compare supply and capacity separately           | Its dated station bills, Local-only description and proposed objective text as the current build     |

**[V] Fresh arithmetic, not fresh player evidence.** [model.ts](../../dev/economy/model.ts) still exports `prototype`, `chapter`, `eras`, `round4` and `round4Cart`. Its `prototype` deliberately fits a historical 437-second trace. Its `round4` has capacity 8 then 16 and later trains; it is also a historical scenario, not an import of today's gameplay constants.

| Existing scenario  | Solo minutes | Two players | Four players | What this establishes                                                     |
| ------------------ | -----------: | ----------: | -----------: | ------------------------------------------------------------------------- |
| `prototype`        |         7.28 |        6.29 |         6.23 | Historical fit reproduces                                                 |
| `round4`           |        24.50 |       17.50 |        14.39 | Idealized carrier scheduling under this table                             |
| `round4-cart`      |        24.27 |       18.88 |        16.86 | Conservative cold-start freight can erase relief, especially with friends |
| `eras`             |       484.40 |      481.08 |       480.81 | Includes **397 minutes of unspecified content**                           |
| `eras --content=0` |        99.97 |       96.65 |        96.38 | Removing content also exposes previously hidden supply waits              |

The era table's longest named novelty gap is **29.33 minutes solo**. Its near-eight-hour result is not validation of eight hours of play. The cart comparison does not prove the real cart is worse: its comment explicitly charges shipments before carrying and omits stock already prepared and streaming overlap. These are precisely the limitations a new model must remove.

## Findings from the reference games

### Satisfactory: separate big milestones from conveniences that protect building time

**[V]** Coffee Stain's [1.0 launch account](https://coffeestain.com/news/satisfactory-1-0-launch/) describes Project Assembly growing visibly through phases, Tier 9 equipment, and a separate MAM-researched Dimensional Depot using Mercer Spheres and SAM to make stored materials accessible remotely. Progress can therefore mean a larger objective, a new production capability, or removal of a supply commute. It is not all one numerical upgrade track. This source establishes those systems, not exact early milestone recipes or typical completion hours.

**[P] Boogle:** give the railway both a destination and a convenience dividend. A component should unlock a bridge kit **and** a more useful supply service. Keep the recognizable trip from freight rack to work frame; let freight retire the solved long-distance leg. Project Assembly is also a useful warning: a huge terminal demand can occupy a factory, but Boogle's ending should demonstrate the network rather than test how long friends tolerate feeding it.

### Factorio: physical discovery prevents an abstract research tree from outrunning comprehension

**[V]** Wube's [tutorial retrospective, FFF #327](https://www.factorio.com/blog/post/fff-327), explains why forcing assemblers too early broke the sequence from manual mining through automated mining, transport and production. Each replacement becomes understandable through prior use. [FFF #376](https://www.factorio.com/blog/post/fff-376) describes discovery/crafting triggers replacing temporary research scaffolding on new planets; it also explains why researching far ahead of actual oil access could overwhelm players. The same essay warns that an unpleasant optimal strategy cannot be excused merely by calling it optional.

**[P] Boogle:** reveal steel's branches after handling steel and seeing it worked. Let an initial fitting immediately demonstrate one benefit; avoid a second research-point currency between discovery and use. Keep the chain broad but shallow: one raw input, one recognizable component, several installations. Do not import infinite science, quality rerolls or hundreds of interchangeable intermediate recipes. Boogle has neither Factorio's automated scale nor its intended duration to absorb them.

### Dredge: use upgrades to change the next expedition, and abilities across the whole map

**[V]** Black Salt's [official game description](https://www.blacksaltgames.com/) separates selling catches, researching equipment, improving the boat and finding abilities through quests. Equipment expands reachable fishing opportunities and destinations. In the [developer postmortem interview](https://www.gamedeveloper.com/design/trawling-in-the-deep-how-black-salt-games-made-spooky-fishing-rpg-i-dredge-i-), Joel Mason says abilities should remain useful across zones; dynamite reopens routes and secrets throughout the map. The team rejected fuel because cheap manual refuelling was empty interaction and automatic refuelling mattered mainly when it punished forgetting. Maximum upgraded speed also influenced island spacing.

**[P] Boogle:** every major improvement needs an immediate outing where it matters and an older place it improves. Small islands can grant enduring traversal abilities without adding a commodity. Avoid fuel, tool durability and maintenance as sinks. Source limitation: no complete primary research-part cost table was verified here, so Dredge's individual prices and research rates are not used as numeric precedent.

### Ratchet & Clank: one upgrade material can feed many expressive branches

**[V]** PlayStation's [Rift Apart guide](https://www.playstation.com/en-us/games/ratchet-and-clank-rift-apart/) identifies raritanium as a resource for unique upgrades across weapons, alongside distinct movement capabilities such as Phantom Dash and hoverboots. Its [Challenge Mode guide](https://www.playstation.com/en-ie/editorial/what-to-do-after-youve-finished-ratchet-and-clank-rift-apart/) documents retained upgrades, expanded weapon levels/slots and a bolt multiplier for a subsequent run. This is publisher documentation; it does not establish an optimum upgrade cadence or the entire base-game grid.

**[P] Boogle:** a steel fitting should suggest several exciting uses, with different visible outcomes, instead of being a disguised ticket for one next station. Preview the actual part at its destination. Borrow the anticipation of transforming a familiar tool; keep new base abilities separate from small material improvements. A short main game needs time to enjoy its best equipment before the ending, not a mandatory replay to make the tree satisfying.

### Sid Meier's Railroads!: station services and engines offer different kinds of leverage

**[V]** The [original publisher manual, printed pp. 50–51](https://cdn.akamai.steamstatic.com/steam/apps/7600/manuals/manual_en.pdf?t=1447351027#page=1) distinguishes depot, station and terminal. Added services improve passenger/mail revenue and handling; an Exchange Siding gives 25% faster loading/unloading and 50% faster car switching. It also describes different engine suitability for fast light loads versus heavy freight, and cargo-driven city/industry growth. Patents temporarily grant advantages before becoming public. These are rules for this edition, not recommendations for Boogle's rates.

**[P] Boogle:** an engine, rack and loading crane should solve different bottlenecks. Adding a faster engine should not be the answer when freight waits at a tiny platform. Keep station upgrades physically readable. Exclude competitive patents, monopoly ownership and declining neglected towns: friends are improving the same railway, and a returning player should find gains preserved.

### Transport Fever 2: material reuse gives a network reasons to connect several destinations

**[V]** Urban Games' [industry manual](https://www.wiki.transportfever2.com/doku.php?id=gamemanual:industriescargos) places steel in both goods and machine chains, planks in machines and tools, and construction materials at towns. Its [town manual](https://www.wiki.transportfever2.com/doku.php?id=gamemanual:towns) distinguishes cargo supply from reachable destinations as growth factors. Its [operating tips](https://www.wiki.transportfever2.com/gamemanual/tipstricks.html) warn that full output storage stops production and describe industry upgrades/downgrades under sustained production conditions.

**[P] Boogle:** build genuine demand for an old material into several later useful objects. Let an additional town connection matter even without a unique resource. Use bounded storage as a harmless reason for machines to pause; surplus need not be destroyed or assigned an infinite sink. Do not copy service decay, catchment accounting or a sustained-delivery quota for every town stage.

### Mini Metro: scarce improvements matter because the bottleneck can be seen

**[V]** Dinosaur Polo Club's [shipped-game description](https://store.steampowered.com/app/287980/Mini_Metro/) describes a growing set of stations, increasing demand and new assets each game week. Players redistribute finite resources as the network changes; Normal eventually fails, while other modes change the pressure. The [developer-written postmortem](https://www.gamedeveloper.com/audio/postmortem-dinosaur-polo-club-s-i-mini-metro-i-) reports balance and visual redesign taking much longer than the small prototype suggested.

**[P] Boogle:** present an upgrade choice alongside the real crane, wagon or span it affects. A finite component allocation can make order interesting without a giant menu. Borrow legible congestion as information—a pile waiting for the cart—not eventual failure or demand that always rises to cancel the improvement. Do not assume a simple-looking economy will be cheap to balance.

### Islanders: remove currencies and pacing layers that duplicate the desired action

**[V]** GrizzlyGames co-founder Friedemann Allmenröder's [design interview](https://gameworldobserver.com/2019/06/14/islanders) describes cutting an intermediate day cycle: points directly awarded more buildings instead of permission to reach another day. Combining and removing systems was a deliberate production and accessibility strategy.

**[P] Boogle:** material discovery → visible installation → useful service is enough. A parallel research level, town XP bar and spendable cash requirement would obscure the same event three times. Placement and visible growth can carry a reward without maintaining a population simulation. Boogle's persistent world should retain its towns; it does not need Islanders' fresh-island reset structure.

### Timberborn: a new material can improve infrastructure, industry and delight together

**[V]** Mechanistry's [January 2021 development notes](https://store.steampowered.com/news/posts/?appids=1062090&enddate=1612197194&feed=steam_community_announcements) introduce finite metal from ruins and use it across platforms, a printing press, carousel and monument, explicitly flagging scarcity for balance monitoring. This is a historical design iteration, not a statement of today's recipes. The [2026 automation notes](https://store.steampowered.com/news/posts/?appids=1062090&enddate=1772811684&feed=steam_community_announcements) reuse gears, planks and metal across sensors, relays and other devices.

**[P] Boogle:** this is the clearest material-to-many-systems pattern. Steel should touch a bridge, a cart, a workshop and a delightful civic object, with usefulness and pleasure in the same tier. Keep the readable physical processes; omit hunger, drought, labour assignment and power upkeep. The finite-metal example reinforces the need to prove that optional building and absent players cannot consume the only route forward.

### Zelda: durable verbs make a small place valuable without another ore

**[V]** Nintendo's [Tears of the Kingdom ability guide](https://play.nintendo.com/news-tips/tips-tricks/tears-of-the-kingdom-tips-tricks/) places permanent abilities in the opening shrines and describes several uses for each: Ultrahand builds different vehicles and structures; Fuse changes durability, damage or effects; Ascend and Recall create many traversal solutions. The guide establishes reusable abilities and combinations, not a full material-economy or battery-cost analysis.

**[P] Boogle:** give the smaller areas a new way of acting or a new application of an existing ability. Base hook/glider/other main-route powers are guaranteed discoveries, never a rare-material roll or repeat purchase. Material upgrades can extend their opportunities through new anchors, launch structures and shortcuts. Keep few mandatory ability gates; optional rooms can combine verbs without denying friends access to the railway.

### Death Stranding: infrastructure pays back in the journey itself

**[V]** Kojima Productions' [Eastern Region guide](https://www.kojimaproductions.jp/en/DSTips) describes route planning, equipment, online structures after network connection, paths formed through travel and restoring the trike using a generator. These are successive ways to change traversal. This guide does not provide a verified auto-paver bill or online contribution percentage.

**[P] Boogle:** show a bad first route and then let a bridge, station or train make that same place easier. Count saved travel, not only output rate. Share the benefit with later visitors. The retained final carry must still feel like building; cargo balance, damage and threatening journeys are not required to justify it here.

### Animal Crossing: everyday materials become personal intentions, but shared worlds can lock people out

**[V]** In [Kyogoku and Nogami's interview](https://www.theverge.com/2020/3/20/21188006/animal-crossing-new-horizons-design-interview-aya-kyogoku-hisashi-nogami), Nook Miles encourage discovering activities and give ordinary catches another value; crafting and customization strengthen relationships with the place and other players. The [GDC 2014 session abstract](https://gdcvault.com/play/1032224/How-to-Turn-a-New) frames Animal Crossing around communication. Nintendo's [support documentation](https://www.nintendo.com/en-gb/Support/Purchases-Subscriptions/Games/Can-I-Change-Which-Island-Resident-is-the-Resident-Representative-Animal-Crossing-New-Horizons--1956294.html) also states that only the first resident can complete some milestone tasks and that this role cannot be reassigned.

**[P] Boogle:** useful town additions and personal decoration give surplus a purpose. Avoid resident-representative privileges entirely. Nobody owns the right to commission the next essential installation; nobody needs the first player online. Do not turn discoveries into daily obligations or use real-time waits to fill an eight-hour game.

### Co-op precedents and their limits

**[V]** Obsidian's [Grounded description](https://grounded.obsidian.net/game) explicitly permits continuing a shared world while its original host is absent, with progress saved. That supports continuity as a product promise; it does not by itself prove equal personal rewards. Death Stranding's shared structures demonstrate benefit without simultaneous contribution, while Animal Crossing supplies the contrary example of first-player privilege.

**[P] Boogle:** fairness has three separate requirements: anyone can continue construction, everyone can use shared capabilities, and each person can still claim their personal rewards. Merely sharing a save solves only the first. No consulted source establishes the correct catch-up policy for Boogle; the contract below follows DESIGN and the production-core plan. Sea of Thieves sources were searched, but the detailed guide failed to load; no exact equal-payout or absent-player rule is inferred from it.

### Pacing mathematics: keep the gain instead of pricing it away

**[V]** Anthony Pecorella's [GDC Europe 2016 slides, Quest for Progress, pp. 23–27](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf) contrast exponential costs with linear production and multiplier milestones; they also discuss whether optimal purchasing is meant to be interesting. This is design mathematics, not retention evidence.

**[P] Boogle:** use bounded, authored bills rather than `baseCost * growth^tier`. If supply doubles and every bill doubles immediately, the player bought a larger numeral. Let old work become cheaper in time. Spend the released attention on new places and choices. There is no prestige reset, inflation treadmill or terminal grind in the proposal.

## Proposed tree and dependencies

**Everything from here through the recommendations is [P] unless marked otherwise. All quantities, speeds, durations, distances, capacities and area timings are tunable.** Area names describe functions, not approved world names.

The campaign spine is a sequence of access proofs, not a global level:

```text
Existing timber/stone opening → usable walking path → forge + closer supply → first useful train
  → steel coast: steel fittings
  → limestone terraces: cement
  → copper uplands: copper coils
  → crystal basin: crystal seeds
  → final connection using known materials → old island / The Boogler

Between large places: ability discovery → practice → construction or exploration using it
Each connected source: engine | track | bridge | station | town | cart | tool | ability-support branches
```

The opening remains the accepted loop while its production conversion finishes. Timber, stone and existing basic rails are the starting vocabulary, not three new campaign regions. The four later resources are chosen to give clearly different jobs: **strength, foundations, powered handling, extraordinary reach**. Cement follows steel here because supports and elevated streets can create a second construction problem; swap their area order if the actual terrain makes the opposite sequence more compelling. That is an owner design choice before content production, not something a price curve settles.

### Dependency rules

1. **Reach the first sample using old capabilities.** The approach to a steel source cannot require its steel bridge. Build access with earlier kits or provide a walkable approach; put the new-material demonstration beyond the source.
2. **Discover → establish source works → connect → install.** Discovery reveals recipes to everyone. Source works use only earlier materials; connection supplies later demand automatically. The first sample and demonstration are guaranteed, accounted stock rather than random loot.
3. **Each installation requires its own previous functional stage, not every branch of the previous tier.** Copper engine requires a working engine and its copper kit, not a fully decorated cement town. Bridges require the relevant supports; cosmetic town work never gates them.
4. **At most one new component plus two familiar ingredients in an ordinary recipe.** A recipe includes its supports, rather than requiring a second six-step crafting tree. The final commemorative kit is the one four-component exception.
5. **No exclusive permanent specializations.** Choose order, then buy the other benefit later. Optional installations have a conservative recovery path; installed core track is never dismantled as part of catch-up.
6. **Keep ability entitlement separate.** A puzzle on the main route can teach a guaranteed ability. Optional puzzles and co-op mini-games cannot become resource or completion gates. Material-funded ability branches below improve infrastructure for that verb; they do not sell access to it again.

### Component-to-system matrix

The matrix is the **full candidate vocabulary**, not a promise to implement forty independent mechanics. Several rows share an installation: a workshop can improve tool provision and material handling together. Before building, select the branches that produce distinct observed benefits and merge redundant ones. Each later tier should ship at least three meaningful cross-system uses; retain the other rows as explicit candidates rather than busywork prerequisites.

| System    | Timber and existing stone/basic rails: establish the loop                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Engine    | Timber-built workshop and loading deck make the later first engine useful; no train reward at T1                        |
| Track     | Short fixed stretches turn a route into something walkable; progress remains solid underfoot                            |
| Bridges   | Timber trestles and stone feet remove a real gorge detour                                                               |
| Stations  | A visible frame becomes a rack: materials now have a nearby home                                                        |
| Towns     | Workshop interior opens and visibly makes the next useful component                                                     |
| Carts     | Compact load platform carries more than a back; cart-first remains a separate proposed ordering                         |
| Tools     | Preserve the accepted axe/pack sequence, including proper axe at Station 3; fewer strokes and actual trips              |
| Abilities | Wooden practice platforms and landing decks make found movement abilities useful; no material charge for the base power |

| System    | Steel fittings: strength and capacity                                                               | Cement: support and working space                                                           |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Engine    | Reinforced couplings permit a 24→32-unit freight load; visibly longer useful train                  | Roundhouse service foundation and loading apron cut a 6→4 s service stop; no cement fuel    |
| Track     | Prefabricated rail assemblies cover 1.5× the metres per final carry                                 | Viaduct deck kits cross uneven ground without following every contour                       |
| Bridges   | Trusses permit an indicative 12→24 m clear span                                                     | Permanent piers permit 24→48 m between suitable landing points; retain old trestles         |
| Stations  | Crane lifts a whole 16-unit kit instead of several small grabs                                      | Two physical loading bays prevent passenger activity from blocking freight handling         |
| Towns     | Workshop annex turns familiar stock into fittings and longer kits                                   | Raised civic terrace opens a useful through-route, interior and construction yard           |
| Carts     | Reinforced bed raises 24→32 units; larger loads are visible                                         | Prepared loading ramps remove a long cart approach and shorten the final carry              |
| Tools     | A better head reduces the same ordinary harvest from three strokes to two; preserve answer-on-swing | A fixed cutting/assembly bench handles bulk shaping; hand tools stay useful at the frontier |
| Abilities | Steel hook anchors open optional return routes for an already-found hook                            | High takeoff/landing plinths make an already-found glider useful across a known gap         |

| System    | Copper coils: faster handling and responsive services                                   | Crystal seeds: compact components with large consequences                                     |
| --------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Engine    | A motor assist raises an indicative 20→28 m/s cruise; compare the same familiar journey | A fitted core permits 28→36 m/s on suitable routes; old engines remain valid                  |
| Track     | Powered kit feed removes repeated loading stops, visibly draining its magazine          | A compact extension kit bridges the last otherwise awkward reach; no replacing the whole line |
| Bridges   | Lift-span machinery opens a route through existing geometry                             | One seed in a collar grows one support; never mine a pillar's volume                          |
| Stations  | Powered crane replenishes the active rack while people work                             | A seed-supported elevated platform gives direct access to a previously separated route        |
| Towns     | Workshop lift opens the upper floor and makes its new service visible                   | Observatory/hangout addition reveals and supports the final old-island approach               |
| Carts     | Powered loading raises dispatch throughput without extra interactions                   | Compact crystal-supported bed raises 32→48 units without a towering stack                     |
| Tools     | A powered workshop attachment prepares supplied kits; fewer manual preparation steps    | A seed-assisted splitter opens exceptional optional rock or timber in one readable action     |
| Abilities | Powered anchor reels or launch structures enable new routes with existing verbs         | A permanent updraft/launch landmark extends a known glide route; no consumable flight charges |

Ability-support structures are explicit additional design candidates, not current abilities. Do not alter hook/glider physics to make them economical without a separate feel comparison. Likewise, the engine numbers are comparison profiles, not a replacement for current train tuning. Only accelerate a route if its length, boarding and scenery support it.

### What creates hunger, and what pays it off

| Unlock                       | Before: promise and bounded friction                                             | After: first use within 2–5 minutes                                                  | What would refute the hypothesis                                  |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Better opening tool/carry    | See the remaining frame and feel the size of the current bundle                  | Same tree needs fewer strokes; same bill loses a return trip                         | Capacity rises but trips do not fall                              |
| First supplied station/train | Reach a useful walking shortcut first; then see a journey whose distance matters | Familiar freight arrives at the new endpoint; ride the journey you previously walked | A timetable wait consumes all saved travel                        |
| Steel                        | A cart fills before a known job is supplied; a wider gap is visible              | One chosen capacity/strength improvement and one dramatic truss                      | Bills rise enough to preserve the same repetitions                |
| Cement                       | The route bends around broken ground and stairs separate the platform from town  | A pier/terrace creates a straighter, usable connection                               | Only roof colour or population count changes                      |
| Copper                       | A small rack waits for handling while a service sits nearby                      | See the crane refill during other useful work; use the workshop lift                 | It introduces power switches or charging chores                   |
| Crystal                      | The distant old-island route needs a support the current kit cannot make         | Plant one guaranteed seed, watch its support grow, use the resulting route           | Repeated crystal mining becomes the final gate                    |
| Final connection             | The old island has been seen; several past services visibly feed the approach    | A short contribution closes the journey and leads to The Boogler                     | Another technology or long bill appears after the promised ending |

Do not manufacture hunger by disabling an earned convenience. Stage one visible limitation, allow a short experience of it, then give relief before it becomes obedience. If players do not want the upgrade, check the desired destination and the before/after difference before increasing cost.

## Costs, supply and the eight-hour budget

### Units and an auditable starting catalogue

Use **W** for an ordinary log, **S** for one steel fitting, **C** for one cement sack, **U** for one copper coil and **X** for one crystal seed. These are physical counted objects, not exchange rates. Basic rails and opening stone keep their existing identities. For the first offline experiment, each new source has one raw type and a **1 raw → 1 component** recipe, with no by-products; record both accounts. That deliberately simple yield is a tuning assumption, not material science. A delivered component is charged once; it is not charged again when its animation lands.

The following reusable bill template prices **each later material tier M**, with `previous` meaning W/S/C/U respectively. Amounts cover one installation per system per tier. Extra optional copies use the same bounded bill, never an escalating multiplier.

| Installation              | Bill                          | Role                                                |
| ------------------------- | ----------------------------- | --------------------------------------------------- |
| Engine                    | 8 M + 4 W                     | Optional convenience                                |
| Track kit                 | 12 M + 8 W                    | Main-route construction package                     |
| Bridge                    | 12 M + 4 previous             | Main-route capability                               |
| Station                   | 8 M + 4 W                     | Source/frontier service                             |
| Town service              | 12 M + 8 W                    | First useful service; decorative additions separate |
| Cart                      | 8 M + 4 previous              | Optional convenience                                |
| Tool/workshop attachment  | 4 M + 4 W                     | Optional efficiency                                 |
| Ability-support structure | 8 M + 4 previous              | Optional route; base ability free                   |
| **All eight branches**    | **72 M + 28 W + 12 previous** | **44 M core; 28 M optional**                        |

Source works cost **8 previous + 8 W**, with no unit of their own future output. Steel therefore bootstraps with 16 W. The other works use 8 S, 8 C and 8 U respectively, plus timber. The final connection's capstone kit costs **12 X + 4 S + 4 C + 4 U**, separate from the four tiers' track/bridge packages. Keep the final contribution short; the majority can arrive through the known services.

**Full-tree ledger:** four tier templates, four source works and the capstone consume **164 W + 96 S + 96 C + 96 U + 84 X**, in addition to the accepted opening. This includes previous-material inputs and bootstrap bills; it excludes optional duplicate decorations. With all optional branches skipped, the same catalogue consumes **124 W + 60 S + 60 C + 60 U + 56 X**. These are arithmetic envelopes, not a requirement to hand-harvest each unit. A camp supplies its familiar material automatically once connected; final hand delivery remains.

The catalogue is intentionally flat enough to expose weak upgrades. If every player chooses the cart first because other branches do nothing useful, that is a design finding, not a reason to hide the choice. Essential source/route work cannot be starved by optional orders: reserve its next kit physically, and let extras draw from surplus. Uninstalled optional kits can be returned for their full contents; installed optional kits can be relocated or dismantled into their original components in this proposal, with no refund duplication. Core route progress stays permanent.

### Hour-by-hour target, not a timetable enforced by the game

Reference: **one first-time, purposefully exploring player**, with a small number of optional installations. Target roughly **7–9 hours**, centred on eight; friends can finish sooner. The full-tree allocation below is an upper shopping envelope, not mandatory spend or output earned automatically each hour. New-resource discoveries are targeted at roughly **1:00, 2:30, 4:00 and 5:30**. Resource areas last roughly 60–90 minutes; hours crossing an area boundary deliberately include two components.

| Elapsed hour | Progression and visible payoff                                                                | Tier-component installation budget                                                                                       | Repeated handling/hauling target | Other authored activity budget                                                    |
| ------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------- |
| 0–1          | Existing opening: walking path, axe/pack, forge, freight and a useful train in accepted order | Preserve opening bills; historical `round4` sums to 280 logs + 8 stone + 102 rails, plus its separately represented beam | 12–18 min                        | 42–48 min: learning, path use, machine work, town and first departure             |
| 1–2          | Steel discovery, first choice and truss; use old railway to supply it                         | 48 S                                                                                                                     | 8–12 min                         | 48–52 min: source approach, installation, small-place puzzle, new route           |
| 2–3          | Enjoy remaining steel choices; discover cement near 2:30                                      | 24 S + 24 C                                                                                                              | 8–12 min                         | 48–52 min: hook practice, a construction job, changed-route return                |
| 3–4          | Cement terrace and town interior; close that area's session                                   | 48 C                                                                                                                     | 6–10 min                         | 50–54 min: vertical route, discovery, service use and departure                   |
| 4–5          | Copper changes handling and access to upper town                                              | 48 U                                                                                                                     | 6–10 min                         | 50–54 min: machinery puzzle, supplied build, ability practice                     |
| 5–6          | Use copper; discover crystal near 5:30                                                        | 24 U + 24 X                                                                                                              | 5–9 min                          | 51–55 min: final new-resource expedition and first grown support                  |
| 6–7          | Crystal applications and the last substantial approach                                        | 48 X                                                                                                                     | 5–9 min                          | 51–55 min: use late upgrades, return through changed places                       |
| 7–8          | Network-fed final connection, old island and The Boogler                                      | Capstone: 12 X + 4 S + 4 C + 4 U                                                                                         | 3–6 min                          | 54–57 min: final route, arrival and ending; optional hangout continues afterwards |

The installation column sums to 72 of each new tier plus the capstone. **Add the template's timber/previous-material inputs and source works from the ledger above**; they are already covered by the handling budget, not extra hours. The opening row's numbers are verified **model inputs**, not a proposal to restore older axe/rail/beam behavior or a current source audit.

The other-activity column is a **content obligation of roughly 394–427 minutes**, including travel, construction spectacle and exploration. It is not evidence that this content exists. Name and time each actual route, puzzle, service and reveal before claiming that budget is filled; run a direct route with zero optional detours. If the authored activity lasts three hours, accept a shorter forecast and identify missing experiences. Raising bills cannot supply those experiences. Never require a player to wait until the clock reaches an unlock hour.

### Supply and upgrade payback targets

- First demonstration: **4–8 guaranteed new components**, counted within the source's budget. Useful branch after **2–5 minutes** of discovery/connection work; no random critical drop.
- Routine post-connection output: start comparisons at **4/6/8/8 components per minute** for S/C/U/X while active and demand exists. These are delivered-rate targets to verify, not free production assumed at every destination. A full 72-unit tier needs 18/12/9/9 minutes of production at those rates, generally overlapping authored play.
- New-material stock reserve: **one next essential kit**. After that, supply the oldest funded optional request. Do not reserve the entire remaining campaign or let one optional infinite order hold the railway.
- Final carry: usually **one or two loads** per installation; a rack approximately **15–30 m** from the frame after supply relief. Keep initial manual work separate from this later target. Flag an uninterrupted **>90 s** repeated fetch chore for inspection; do not turn that flag into a minimum quota.
- Uncovered wait: inspect **>10 s at a rack** or **>60 s/hour** spent with no useful action; optional sightseeing must not be used to conceal a supply stall.
- Capability cadence: a meaningful use, choice or place change about every **10–15 minutes**, and an area closure every **60–90 minutes**. These are content-review prompts, not timers or proof of engagement. Cosmetics do not reset the capability clock.
- Optional efficiency upgrade: aim for **5–15 minutes of remaining useful work to repay it**. An expensive final-hour tool with no work left has no economic purpose; grant it earlier or make it an optional toy.

**A load breakpoint:** for a 24-piece job, capacity 16 means two trips; capacity 24 means one. At a 30 m one-way rack, 5.6 m/s walking, 1.2 s pickup overhead and 0.09 s unload per piece (historical model assumptions), work falls from **25.99 s to 14.07 s**, saving **11.91 s** before harvest/build. Raising capacity 16→20 saves no trip. If acquiring the upgrade costs 60 s of marginal work, it repays after about **six comparable jobs**; two jobs remaining would not justify it through efficiency alone. Do not then raise the bill to 48 just to restore two trips.

**A throughput breakpoint:** delivered rate is approximately `min(source rate, processing rate, vehicle capacity / round-trip time, station handling rate)`. Increasing cruise speed has little value if the crane is the bottleneck. Include acceleration, dwell and the actual route in the full simulation; this bound is a diagnostic, not an exact timetable model.

## Sinks without grind or lockout

The primary sinks are **finite permanent construction and upgrades**. Old inputs stay relevant through the shallow mixed recipes; connected production handles familiar bulk. New material should feel scarce enough to choose an order, not scarce enough to require searching an exhausted island for one missed spawn.

Optional sinks: branch connections, scenic platforms, town additions, spare rolling-stock variants and shared display structures. Let each have a recognizable fixed bill. Personal clothes and boxes remain personal rewards; the comic score buys nothing. Do not require optional construction to maintain normal throughput or reach the ending.

Safety for abundance is **bounded stock and automatic pause**, not obligatory waste. A full rack stops new production; existing counted material remains. There is no requirement to consume every unit forever. At the end, a quiet, finished railway is a success. Further construction can remain optional without an inflation spiral, prestige or recurring repair bill.

No-lockout requires more than generous totals. For each material, prove that **reachable uncommitted supply + recoverable communal stock + guaranteed future production covers the next essential recipe**, after accounting for raw inputs and processing prerequisites. Check the case where departed players keep their personal raw cargo, as the production plan requires. Unique communal samples, seeds assigned to essential supports and the boiler need recoverable claims, not permanent ownership by the first carrier. Dropped stock transfers to a safe rack; it is not silently deleted or duplicated. Slow counted tree regrowth follows the latest owner call; this report does not invent a stone or metal renewal policy for production code.

For the future campaign, propose renewable connected sources for each new commodity, with a finite visible working batch and counted replenishment while players are active. The initial reachable reserve must cover bootstrap and the next essential kit without waiting for replenishment. **This new-source policy needs an explicit design decision before implementation.** Test hoarding, all-optional-first purchases, a missed sample and a player leaving with a full pack. If a source can be exhausted into a dead end, stop and revise the supply policy; do not silently confiscate personal materials.

Offline work stays bounded to already-funded jobs. No new harvesting, repeat income or chain of unseen frontier unlocks while the room is empty. Returning should reveal something finished and still leave the next expedition to the players.

## Co-op sharing contract

Reuse [production core's authority and personal-reward contracts](../plans/production-core.md#state-and-authority); do not design a second progression service here.

| Situation                                       | Proposed outcome                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A discovers a resource while B builds elsewhere | Shared recipe knowledge and source fact; both can use it. Each has an unconsumed personal discovery/reveal opportunity             |
| A installs a better tool or capacity service    | All present and future players can use the world capability; no per-person material fee for required power                         |
| Friends choose different optional improvements  | Both can fund visible fixed-bill sites. Essential reserve remains protected; supply order is automatic and legible                 |
| Two players deliver the last unit               | One accepted transfer/completion; surplus remains owned by its carrier; no last-hit bonus                                          |
| A joins hours late                              | Immediate current traversal/building access and their own eligible milestone rewards; no XP debt or old construction grind         |
| A missed the original ability puzzle            | Ability usable now; optional replay/practice remains available without resetting the world or charging materials                   |
| An explorer contributes no logs                 | Same shared capabilities and personal milestone eligibility. Discovery and companionship are not measured by a hauling leaderboard |
| Several friends leave                           | Bills do not change. One player can continue every required job; no carried-key dependency on an absent friend                     |
| Everyone leaves                                 | Funded work can finish; no new route choices or production chain advances automatically                                            |
| A joins after the ending                        | Old island remains reachable, meeting/celebration can be experienced personally, and unclaimed rewards remain recoverable          |

Materials are shared **through contribution and world services**, not a spendable common money wallet. Raw personal cargo remains in its approved per-player account; deposits become a specific project's stock. Cosmetics stay personal. Within the room, shared power does not mean another player can spend or equip someone's personal reward. Cross-world power imports, cloud cosmetic accounts and cross-device recovery remain outside this proposal.

A small crew should save labour, but **do not divide eight hours by headcount**. Discovery, travel and first-use sequences do not parallelize perfectly. Model 1–4 active workers first because the existing simulator supports them; add 5–6 before asserting the DESIGN target. Include idle friends, split roles and departures. Extra players may choose to ride or explore; do not add compulsory jobs merely to keep every avatar occupied.

## What `dev/economy/model.ts` needs to simulate

**[V] Current limits:** `Link.era` is a label; `links.map` and nested `stations.map` impose one sequence. `Ingredient.supplied` selects a single pooled kit rate. The model has no persistent per-good stock, processing recipes, purchase decisions, resource depletion, returning players or competing sinks. It balances loads among identical carriers, then sums work, waits and construction. `newThing` measures intervals between supplied labels, not whether an upgrade was noticed. `finds++` per station and `finds += 3` per link are assumed cosmetic counts, not personal entitlements.

Extend this **offline design tool**, retaining historical fixtures. Do not import rendering or reimplement production lockstep. The following is a data/simulation proposal, not new gameplay code:

| Existing seam                     | Needed extension                                                                                                 | Question it answers                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Table`, `Link.era`, linear links | Stable area/component/upgrade IDs; prerequisite graph; required vs optional branches; terminal old-island node   | Can every main-route node be reached without optional activity or its own output?       |
| Flat `recipes`, `Ingredient`      | Integer raw inputs, outputs, processing duration, stock capacity and component provenance                        | Are supply and spending conserved across manufacturing?                                 |
| `Station.supply`                  | Per-source stocks and jobs, freight routes, finite vehicle/rack capacity, arrival events and demand reservations | Is the next kit actually there, rather than hidden behind a long content lead?          |
| Fixed `Link.carry`/speed          | Installed upgrade effects with dependencies, effective tune profile and route-specific speed constraints         | Does this purchase remove a trip or merely change a number?                             |
| Identical-carrier scheduler       | Player availability timeline and roles; paths; exploration concurrent with production; shared machine contention | Do friends help, and can the final remaining player finish?                             |
| Fixed station order               | Purchase policies: route-first, tool-first, cart-first, town-first and all-optional-first                        | Is there a dominant choice, a trap purchase or a starvation path?                       |
| `Beat.content`                    | Named authored encounters, first-use opportunities and direct-route/curious-player durations                     | How much of eight hours is actual authored play, and what disappears with zero detours? |
| Aggregate `finds`                 | Shared completions separate from each player's eligible/unclaimed cosmetic and discovery beats                   | What does a late joiner still get to experience?                                        |
| Simple elapsed clock              | Funded-work-only offline completion and player return/rejoin events                                              | Can absence duplicate stock, skip a frontier or remove access?                          |
| Scalar sensitivity flags          | Per-upgrade marginal cost, saved labour, payback before ending, starvation/softlock and novelty-gap reports      | Which values or content need a human comparison next?                                   |

Use an **event schedule** for concurrent jobs rather than subtracting a generic exploration allowance from every shipment. Record resource arrival, reservation, production completion, boarding, dispatch, first use and player leave/return. The model may remain deterministic for reproduction without claiming to be a multiplayer correctness test. Its future data should align with the production catalogue once that owner exists; a second hand-copied set of current recipes would drift again.

Simulation invariants and outputs:

- Ledger per material: initial/raw production minus recipe inputs plus recipe outputs equals remaining source, loose, carried, rack, reserved and installed/used stock. Raw-to-component conversion is explicit; cosmetic copies never add material.
- A bootstrap check finds missing sources, circular prerequisites and inaccessible critical ingredients. A completed optional sink cannot make the main route unreachable.
- Report **hands-on labour**, **elapsed time**, **empty travel**, **loaded travel**, **uncovered wait**, **first useful upgrade time**, **time enjoying each upgrade before ending**, and **longest interval without an authored new experience** separately.
- Compare purchases against the same route with that purchase omitted. Savings include opportunity cost and changed bottlenecks; an upgrade that helps only optional play can still be worthwhile, but label that value.
- Sweep costs ±25%, source/handling rates 0.5–2×, actual load breakpoints, route lengths 0.75–1.5×, 0/25/50% nonparticipating time, zero optional play and missing/late freight. These are scenario ranges, not probability distributions or confidence intervals.
- Run solo, 1→2→1, four split roles, a late player at hours 3 and 7, all-optional-first, full-pack departure, funded/unfunded absence and final-island arrival. Report deadlocks as failures, never fill them with fictional income.

**Tunability:** cite [tunables](tunables.md), especially its separation of defaults, effective values and safe application boundaries. Give quantities units, bounds and an owner: recipe costs/yields/capacities as integers; movement and timing profiles separately; area targets and content labels as design data. Record the complete input profile and source revision with every report. Shared runtime rules must agree across the room; new data does not authorize a local client to alter public-room costs. Conservation, exactly-once acceptance and no-lockout are invariants, not knobs.

## Numbered recommendations for Boogle

1. **Adopt the material spine as the candidate design, with broad uses and few prerequisites.** Future campaign work follows [production core's promotion slices](../plans/production-core.md#reviewable-promotion-slices); the proposal touches `Table`/`Link` in [model.ts](../../dev/economy/model.ts). First paper proof: steel feeds a bridge, cart and workshop, with two sensible purchase orders and no circular recipe. Do not implement the whole matrix on faith.

2. **Make each upgrade repay a visible inconvenience and preserve the saving.** Touches `round4`/`round4Cart`, [next-load motivation](next-load-motivation.md) and production-core slices 4–5. First comparison: identical bill and route, capacity alone versus frontier supply alone. Accept when the player notices the improvement and wants the next use; faster elapsed time alone is insufficient.

3. **Give smaller areas durable abilities and discoveries without new resources.** Touches the [ability decision](../proposals/boogle-2.md#the-shape-of-the-game), [find-the-fun exploration](../plans/find-the-fun.md#8-having-found-a-place-on-foot-do-you-want-to-connect-it) and future `Beat` records. First proof: one ability, a construction job before the next ability, and two earlier places it improves. Optional co-op puzzles remain optional.

4. **Budget eight hours as authored activity, with finite flat bills and early use of late upgrades.** Touches `eraRows`, `recipes` and `newThing` in [model.ts](../../dev/economy/model.ts), plus [rail economy research](rail-economy-model.md). Replace one placeholder hour with named beats, then run it with zero optional detours. Reject extra hauling as a remedy for missing content.

5. **Use permanent installations and optional builds as sinks; keep money comic.** Touches the proposed [money brief](../brainstorms/money.md) and production-core's [material transaction contract](../plans/production-core.md#transaction-contract-every-unit-has-one-home). First proof: full racks pause safely, optional purchases preserve an essential kit, and old resources arrive without renewed source errands. No fuel, repair, daily tax or required surplus disposal.

6. **Share world capabilities automatically and preserve each person's reward opportunity.** Touches production-core's [personal rewards](../plans/production-core.md#personal-rewards-and-accepted-play) and [shared construction research](shared-construction.md). First proof: one builder, one explorer, an absent carrier and a late newcomer all reach the next area; each gets their own eligible reward without contribution thresholds, duplicate stock or replayed historical earnings.

7. **Extend the offline model to purchases, conserved stock and concurrent delivery before balancing a campaign.** Touches `Table`, `Ingredient`, `Station.supply`, `Options` and `model()` in [model.ts](../../dev/economy/model.ts). First output: the steel subtree under four purchase orders, solo and 1→2→1, including starvation and marginal-payback reports. Keep the historical fit as a regression, not proof of current tuning.

8. **Make the parameters inspectable, then prove two consecutive material cycles with the owner.** Touches [tunables](tunables.md), the [round-4 tracker](../plans/round-4-notes.md) and production-core's existing gates. After authorization and technical prerequisites, show one resource improving three systems and its successor making use of those gains. Agent checks cover supply, leaving and recovery; the owner answers: **“Did finding this material make you want to improve your railway?”** Stop at that verdict before multiplying areas.

## Evidence limits and verification

Primary text was checked for all twelve requested games, using developer interviews/posts, publisher manuals/guides and official descriptions. Coverage is strongest for Factorio's sequencing, Dredge's reusable abilities and rejected fuel loop, Railroads!' station benefits, Transport Fever's production chains, Timberborn's multi-use materials and Animal Crossing's first-player restriction. Exact Dredge research prices, complete Ratchet upgrade grids, Zelda's battery economy and commercial-game completion curves were not independently established; none supplies this report's numbers.

No talk video was watched, no retention claim tested, and no proposed eight-hour route simulated or played. The model extension is unimplemented. Source access failures for Sea of Thieves' detailed guide and Grounded's Home Stretch announcement were not treated as verified rules; Grounded's fetched official game description supplies the narrower continuity claim.

Repository checks: read the research index and the three requested economy reports, production-core, money, owner decisions, relevant agent guidance, current playtest/notes and the entire mapped offline model. No nested `AGENTS.md` exists under `docs/` or `dev/economy/`; no high-risk source folder was edited or reviewed. `npm run inflight` succeeded after retrying its Git fetch with the required filesystem permission. Older branches also touch the research index; this change adds only its own entry and preserves theirs.

Reproduce the verified baseline with the repository's Node 26 runtime:

```sh
node dev/economy/model.ts prototype
node dev/economy/model.ts round4 --json
node dev/economy/model.ts round4-cart --json
node dev/economy/model.ts eras --json
node dev/economy/model.ts eras --content=0 --json
```

Verification passed on Node 26.13.0: Prettier on both changed files (with `--ignore-path /dev/null` because the repository normally ignores research Markdown), targeted lint, all 27 local file/anchor links, independently summed full/core recipe ledgers, the five baseline model runs above, `git diff --check`, and `npm run check` (lint, typecheck, unit tests, registry, level, asset checks and build). No game code changed, no push or deployment is part of this task, and no device or human-feel validation is claimed.
