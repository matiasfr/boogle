# Rail economics: what does the next load buy?

_Research report, 2 November 2026. Live primary-source research and an executable, dependency-free TypeScript model of Boogle's rail work, supply, travel and novelty. Repository inspected at `5f8b9009`. Fits the existing scripted prototype measurements; does not report a new human playtest, multiplayer measurement or reference-game play session. Everything about future costs, durations, rewards, supply and enjoyment is a hypothesis._

**Evidence labels:** **[M]** is a recorded measurement in [place.md](../game-design/place.md#measured); **[V]** is inspected code, a recorded owner decision or a fetched primary source; **[H]** is interpretation, fitted arithmetic or a proposed experiment. A developer's explanation establishes their design intent, not a universal player-response law. GDC slides were read; no talk or gameplay video was watched. Decimal output makes runs comparable, not forecasts precise.

## Answer first

**[H] Retire the long supply journey, keep a short physical contribution, and make each connection visibly change what the network does.** Start with 24/24/12 logs on line one; keep line two's 12/16/12-piece recipes, grant capacity 16 at the forge, and bring both ingredients to racks 24–36 m from the work. Test those changes separately before combining them. The combined chapter forecasts **8.48 minutes solo**, including 110 seconds of additional orientation and looking at consequences; its actual station work drops from **163 to 101 seconds**. It still exposes a **14.6-second frontier-supply wait** to test, not conceal.

**[H] Eight hours is presently a content hypothesis, not an economy result.** Twelve links and thirty-six stations with generous costs produce only about **100 minutes without the proposed discovery/choice content**, even retaining 67 minutes of walking/riding budgets. The roughly eight-hour table needs **397 minutes of unbuilt content** and contains a **29.3-minute gap between named new experiences**. It is a scope warning. Do not fill that gap with more logs, forced exploration, train waits or loot menus.

Serves [DESIGN.md](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic**, **Telegraph everything**, **Designed for drop-in, drop-out**, and **The rail builds the world**. No principle changes or game-code changes. This research does not approve [rail-slice.md](../plans/rail-slice.md) or finish a [find-the-fun](../plans/find-the-fun.md) playtest checkbox.

## The evidence to fit

**[V]** [Place's `TUNE` and `LINKS`](../../src/proto/place/layout.ts) specify capacity 12, four logs per stroke, three strokes per tree, 0.24 s swing cooldown, 0.09 s unloading per piece, 5 m/s laying and 12 m/s trains. Line one has three 24-log stations; line two has 8 logs + 4 rails, 8 + 8, and 4 + 8. [Player movement](../../src/entities/player/state.ts) walks at 5.6 m/s. Importing the geometry table in Node gives line lengths 221/182 m and construction spans 75/54/32 and 35/80/59 m. No renderer was needed to inspect these values.

**[M]** The historical scripted solo run reports station work of 22, 19, 42, 10, 34 and 36 seconds; line one opens at 200 s, forge/turntable at 280 s, line two at 398 s, and first stone at 437 s. These support the brief's roughly 20–40 s work and seven-minute run, with exceptions visible rather than rounded away. They are not novice medians or the owner's elapsed time.

**[V]** The latest [station playtest](../playtests.md#2026-11-02-the-stations-protoplace-second-round) liked chopping, the frame, the layer and the forge. Station three and the final carrying dragged; fetching rails at home felt like an errand. The first celebration barely registered and town growth needed searching out. The contradictory continuation answer remains unresolved. Fast completion did not prevent repetition.

**[V]** The [2 November decision log](../proposals/boogle-2.md) requires a hand carry for every segment, network supply that reduces later work, six eras, a final Home–port connection and only one banked project while absent. Open question 19 records the liked crystal direction: **one mined seed grows down from a collar into a pillar**, not enough crystals to fill its visible volume; later seeds can come through the network. Generous rewards are a direction, not an approved reward catalogue.

### How the existing reports constrain this one

- [Rail slice, Pacing](../plans/rail-slice.md#pacing-measure-the-repeated-job-not-a-two-hour-script) explicitly rejects stretching the prototype to fill a two-hour script. Its current draft begins rewards with cosmetics, not the useful random traits proposed elsewhere.
- [Next-load motivation](next-load-motivation.md) identifies frontier supply, station-three cost and carry thresholds as separate experiments. This model puts numbers on each; it does not treat their combination as causal evidence.
- [Shared construction](shared-construction.md) keeps fixed bills and distinguishes active helpers from connected headcount. Today's `place` is Local: seeing another avatar does not establish shared inventory or co-op throughput.
- [Eight-hour pacing](eight-hour-pacing.md) proposes 12 links/36 stations and 400 fixed minutes plus 120 divisible work minutes. Its per-station work assumptions (2.5–5 minutes) are far above today's measured seconds. Its claim that `place` is unbuilt is stale in this checkout.
- [Six eras](../proposals/six-eras.md) proposes 45/60/90/100/95/90 minutes for a solo-led world, whereas the earlier pacing report uses a pair and a different curve plus optional postlude. Neither is measured. The table below uses the newer six-era shape, explicitly identifies the reference player count and excludes a post-finish requirement.
- [Maximal rewards](maximal-rewards.md) proposes 30–40 finds/hour with substantially more station completions than a 36-station campaign. Changing the number of gifts per deed is cheaper than silently multiplying the construction jobs.

## What the reference games retire, and what replaces it

These are mechanisms and progression conditions, **not claims about typical minutes-to-automation**. None of the checked primary sources establishes a universal number of repeats before boredom, an eight-hour Boogle curve, or a friend-count multiplier.

### Factorio: understand a task before replacing it

**[V]** Wube's [Friday Facts #327](https://www.factorio.com/blog/post/fff-327) describes a tutorial failure: players could mistake the game for manual grind, but forcing assemblers within five minutes broke its progression. The intended order goes from manual extraction through automated extraction, transport and production/science. Each upgrade replaces something already understood. This is a developer retrospective, not a five-minute prescription.

**[H] Boogle:** the first two timber frames can teach harvest → carry → build; the forge visit teaches a transformation. Subsequent trips should exercise the resulting service. Retire the old source commute before multiplying recipes. The new player job is reaching and supplying an unconnected frontier, not operating the known factory forever. Compare before/after travel saved, not only production numbers.

### Satisfactory: automation must reach the builder

**[V]** Coffee Stain's [shipped-game description](https://store.steampowered.com/app/526870/Satisfactory/) explicitly frames belts and automated trucks/trains as reducing manual labour. Its [1.0 launch account](https://coffeestain.com/news/satisfactory-1-0-launch/) describes the researchable Dimensional Depot as remote access to materials, reducing trips during construction; Project Assembly also develops visibly through phases. These establish two distinct rewards: a useful service and a visible consequence. They do not establish an opening-hour unlock time.

**[H] Boogle:** having a large rail pile at Home does not solve collection from Home. A supplied rack on completed track gives the same benefit while retaining material provenance and the final carry. No global inventory or factory-ratio management is required. Measure production, delivery and the remaining walk separately: moving the bottleneck from harvesting to waiting is not relief.

### Astroneer: one connection can provide several services

**[V]** System Era's [Rails Update](https://blog.astroneer.space/p/rails-update/) describes autonomous trains, station loading/unloading and rail lines carrying oxygen and power. Its accompanying logistics missions are placed in the midgame, with a named prior mission condition. The transport replaces a repeated logistics role while exploration expands at its edge; it is not a documented minute-based unlock schedule.

**[H] Boogle:** each connection should enlarge the set of goods available at the frontier, the reach of the next construction kit, or a town's capabilities. Later networks can deliver manufactured spans and crystal seeds; players still supply each segment. Do not import oxygen, power maintenance or dispatch duties. The meaningful growth variable is **useful work the railway performs without supervision**, not an ever-growing personal load quota.

### Dorfromantik: repetition can stay when the decision changes

**[V]** Toukana's [game description](https://store.steampowered.com/app/1455840/Dorfromantik/) describes placing and rotating tiles in a growing landscape, completing local requests to replenish tiles, and discovering objects that unlock further tiles/biomes/quests. The placement verb persists. The surrounding spatial problem changes because of earlier placements; there is no promise that the player stops placing tiles by hand.

**[H] Boogle:** do not automate the part people enjoy merely because it repeats. A familiar carry can be fresh when its result creates a shortcut, completes a truss over a lived-in street or opens a chosen shore. Three differently coloured invoices do not create three decisions. A repeated assembly animation counts as feedback; a newly usable route counts as something new. The model deliberately does not credit every animation or cosmetic roll as novelty.

### Death Stranding: the route improvement is the reward

**[V]** Kojima Productions' [Eastern Region guide](https://www.kojimaproductions.jp/en/DSTips) introduces postboxes through Order 6 and a long cross-region delivery through Order 14; it describes connected infrastructure, paths formed by travellers, route aids and restoring the trike with a generator. Infrastructure and vehicles change later traversal, though rough terrain still matters. Mission numbers establish sequence, not elapsed hours. The guide does not provide an auto-paver cost curve or a reliable online-contribution percentage; neither is assumed here.

**[H] Boogle:** retain the auto-paver's authored destination and visible material contribution, already named in [place.md](../game-design/place.md). Let the railway take over the solved distance. Boogle has no cargo damage, hazards or balancing burden, so its remaining interest must come from enjoyable handling, changing geography and consequences. A long empty walk has less to do here; it needs stronger justification than resemblance to a porter game.

### Stardew Valley: finite accomplishments remove future chores

**[V]** ConcernedApe's [1.1 changelog](https://www.stardewvalley.net/stardew-valley-v1-1-changelog/) places magical construction after the Community Center/JojaMart arc and describes Junimo Huts harvesting nearby crops into storage, permanent destination obelisks and the Return Scepter. These are concrete late-progression conveniences; the source does not say when a typical player obtains them. Even automated harvest leaves collection at the hut.

**[H] Boogle:** an unlock should permanently subtract an understood obligation. Commission the forge once; ordinary rail supply should then follow the crew. A capacity increase should remove a real return trip. Do not borrow daily upkeep or late-game waiting to justify delaying relief in a much shorter adventure. Shared conveniences should benefit a late friend immediately, without repeating a personal material grind.

### Incremental games: change the slope, not just the numeral

**[V]** Anthony Pecorella's [GDC Europe 2016 slides](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf) distinguish automatic production, choices affecting growth and games whose scope unfolds; multiplier milestones supply local victories. His [Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i) exposes the cost/production equations and explains why exponential prices eventually outgrow ordinary production, with multipliers temporarily changing the relation. These are design/mathematical accounts, not controlled retention studies.

**[H] Boogle:** evaluate `next demand / usable supply rate` and `ceil(demand / capacity)`. A 33% larger bundle can save no trip; a much smaller increase at the right threshold saves an entire return. Adopt visible gains—nearby supply, more metres built per compact kit, a faster familiar ride—without cancelling them through proportional cost growth. The railway persists; no prestige reset, lottery-only material, escalating final bill or required offline wait is part of this model.

## The working model

Run [dev/economy/model.ts](../../dev/economy/model.ts) with Node 24, without installing a modelling library:

```sh
node dev/economy/model.ts
node dev/economy/model.ts prototype
node dev/economy/model.ts chapter --carry=12 --distance=2
node dev/economy/model.ts eras --content=0
node dev/economy/model.ts sensitivity
node dev/economy/model.ts all --json
```

Each command reports **one through four active players**. Exported `model(table, players, options)` accepts the typed `Table`: links, stations, named recipes, capacities, walk/train/lay speeds and network supply. The three editable input tables live beside the function. `--carry` overrides all links; `--distance` scales only the repeated pickup route; `--supply` scales production; `--train` scales train speeds; `--content` scales proposed content time; `--coordination` adds a fractional penalty per extra active carrier. Unknown switches and invalid numeric inputs fail. `--json` is for reproducible analysis, not a game save format.

### Units, equations and ordering

**[H]** Quantities are integer **carried pieces/kits**, distances metres, speeds m/s and internal times seconds. Manufactured kits are already processed outputs, not raw-material equivalents: sixteen future modules can build more railway than sixteen wood pieces. The model does not claim one log equals one rendered sleeper. Future conversion recipes and source costs would require a separate conservation design before implementation.

For a recipe with `Q` pieces, capacity `C`, one-way pickup distance `d`, walk speed `v`, pickup overhead `p`, and unload time `u` per piece:

```text
minimum trips        = ceil(Q / C)
one load time        = sum(harvest seconds for its pieces) + p + loadSize*u + 2*d/v
station work         = longest carrier schedule
station construction = spanMetres / laySpeed + setupSeconds
```

The scheduler tries the minimum loads and additional partial-load splits up to one load per player, balances integer load sizes, and assigns the next load to the earliest free carrier. It chooses the fastest of those schedules, not a general route optimization. Output `minimum / scheduled / waves` means capacity lower bound / total team trips / most trips by one carrier. Friends can choose to split a kit, so scheduled trips may increase while elapsed time falls. Each carrier must still walk the route; four friends carrying three pieces each do not quarter a thirty-second walk. Costs never scale with attendance.

**[H]** All carriers begin and end at the work frame; each trip includes an empty outbound and loaded return. Two sources near one another are represented by one effective collection route. Harvesting uses amortized seconds per piece; whole-stroke overproduction, source depletion and walking between trees are not simulated. The 1.2 s pickup overhead is assumed. The work components on the longest carrier's schedule are elapsed-time attribution; `labourS` separately counts all carriers' task seconds before an optional interference penalty. Neither is an empirical activity diary.

Network supply is a **single reserved station kit**, including all its supplied ingredients. Let `N` be supplied pieces, `r` finished-kit production rate, `B` freight capacity, `L` already completed rail length and `vT` train speed:

```text
batches       = ceil(N / B)
production    = max(0, N/r - priorProductionLead)
freight       = (2*batches - 1) * L/vT + batches*dwell
uncoveredWait = max(0, production + freight - currentApproachAndDiscovery)
```

Production can overlap the previous lay; **travel cannot use that unfinished track**. Travel begins once the preceding station is complete. One train returns for additional batches, but need not return after the last. Production precedes transport (conservative: no streaming). Supply may run during the listed approach/discovery beats; those minutes are charged once. The complete kit is available before human work starts; partial shipments cannot start the first load early. No indefinite stock accumulation, far-bank resource required to reach that bank, automatic human deposit or unattended chain of completed projects.

**[H] Limits:** no acceleration/braking, missed departures, congestion, synchronized deposits, source contention, parallel scouting, early boarding or simultaneous laying/hauling. Timetable phase can make real delivery worse; streaming can make it better. `leadS` must describe real prior time, not free credit. Future supplied mixed recipes use a pooled rate; a slow individual ingredient is not modelled. Prototype forge/stone delays are fitted fixed beats, so changing `--supply` does not retune them. This is offline arithmetic, makes no engine/network architecture choice, and imports neither three.js nor the game's simulation.

### What “without something new” means

**[H]** Explicit `newThing` markers identify a first capability, place or visible consequence. A repeated marker does not reset the clock. The model takes the longest interval from start, between markers and through the final tail; it does not equate a shower of cosmetics with a changed job. The rough campaign's `content` blocks contain **no invented internal markers**. Builders must name and place real discoveries before claiming the long gaps are solved. A train service marked new is still a hypothesis that the player notices it.

Diagnostic flags are deliberately provisional: **work >40 s**, **work <8 s**, **more than two minimum loads**, **uncovered supply wait >10 s**, and **no named new experience for >10 min**. They are prompts to inspect, not fun scores. Today's final 36-second carry dragged without crossing the long-work threshold. Likewise, an eight-second satisfying final contribution may be fine. Flags never override the owner or prescribe raising bills.

## Calibration: match the measured prototype before forecasting

**[H] Fitted, not validated.** With observed recipes, carry, walk speed and unload values, solve one effective distance per station to match its recorded work. There are six unknown distances and six work observations: an exact match is expected, not independent predictive evidence. Contact/flight, targeting and path geometry are folded into distance, not separately identified. Replace these with actual paths and action traces in the next test.

| Station | Recipe           | Trips solo | Fitted one-way m [H] | Work measured / fitted s | Lay measured / fitted s |
| ------- | ---------------- | ---------: | -------------------: | -----------------------: | ----------------------: |
| T1      | 24 logs          |          2 |               22.400 |                  22 / 22 |                 15 / 15 |
| T2      | 24 logs          |          2 |               18.200 |                  19 / 19 |                 11 / 11 |
| T3      | 24 logs          |          2 |               50.400 |                  42 / 42 |               6.5 / 6.5 |
| Q1      | 8 logs + 4 rails |          1 |               21.616 |                  10 / 10 |                   7 / 7 |
| Q2      | 8 logs + 8 rails |          2 |               42.224 |                  34 / 34 |                 17 / 17 |
| Q3      | 4 logs + 8 rails |          1 |               94.416 |                  36 / 36 |                 13 / 13 |

The span lengths divided by 5 m/s need **0/0.2/0.1/0/1/1.2 s** setup residuals to match the recorded lay times. An additional **6.5 s** wake/orientation residual closes the first-line total: `78 + 6.5 + 83 + 32.5 = 200`. The next 80 seconds are modelled as 30 walking, 39 riding and 11 residual wait/transition. Line two adds 1 s orientation, 80 work and 37 build to reach 398. The last 39 seconds close the first-stone checkpoint at **437 s**. The model's “wait” category includes these unclassified residuals; it does **not** establish 50 measured seconds of player idleness.

All six work residuals and the final-time residual are zero to floating-point tolerance; both line-open checkpoints also match. The inferred train travel distance is `39*12 = 468 m`, a cruise-equivalent fit to the out-and-back observation, not a new survey.

**[H] Per-link / cumulative minutes** include the following forge or first-cargo beat, not only rail opening:

| Link                 |    1 player |   2 players |   3 players |   4 players |
| -------------------- | ----------: | ----------: | ----------: | ----------: |
| Timber + forge       | 4.67 / 4.67 | 3.98 / 3.98 | 3.95 / 3.95 | 3.93 / 3.93 |
| Quarry + first stone | 2.62 / 7.28 | 2.32 / 6.29 | 2.31 / 6.25 | 2.30 / 6.23 |

Solo minimum loads are **2/2/2; 1/2/1**. Under ideal partial-load cooperation, the team schedules two, three or four loads at each station for the corresponding party size, each worker doing one wave. It is an optimistic coordination assumption, not the current pickup UI or tested multiplayer behavior. Biggest benefit is solo→pair; extra friends mostly shave handling time. The last station remains **35.19 s even with four**, because one carrier already makes just one long trip.

Longest inferred gap: **2.32 min solo**, after the first mixed kit through quarry cargo; **2.01 min with four**. That is short, yet the recorded experience dragged. **Time and novelty labels alone cannot establish motivation.**

## One tuned chapter-one table

**[H] This is the opening two-link chapter, not a promise to stretch the wood era to 45 minutes.** Retain the actual spans and 5/12 m/s layer/train speeds. Keep one early forge homecoming. Do not change all variables in the first diagnostic playtest.

| Station | Proposed recipe  | Capacity | Solo loads | Pickup distance m | Work s | Supply wait s | New consequence to show                 |
| ------- | ---------------- | -------: | ---------: | ----------------: | -----: | ------------: | --------------------------------------- |
| T1      | 24 logs          |       12 |          2 |              22.4 |  22.00 |             0 | First physical track                    |
| T2      | 24 logs          |       12 |          2 |              18.2 |  19.00 |             0 | Walkable trestle                        |
| T3      | 12 logs          |       12 |          1 |              50.4 |  21.00 |             0 | Timber train starts supplying Home      |
| Q1      | 8 logs + 4 rails |       16 |          1 |                24 |  10.85 |             0 | First manufactured kit                  |
| Q2      | 8 logs + 8 rails |       16 |          1 |                30 |  13.35 |          8.92 | Previous rail supplies the next frame   |
| Q3      | 4 logs + 8 rails |       16 |          1 |                36 |  15.14 |         14.58 | Quarry service and a visible town build |

Line-two kit supply assumes **2 finished carried units/s**, **16 per vehicle**, **5 s dwell/handling**, and **0/35/115 m** of completed rail to successive racks. This is a proposed aggregate finished-goods rate, **not** `pileEvery`, `railEvery`, `deckCrates` or a conversion of a crate into one log. Preparation overlaps only the previous 7/17-second lay; the 115 m run cannot happen until that track exists. The **14.58-second Q3 wait remains flagged**: the network helps, but we have not proved that standing for freight is enjoyable. Increasing production alone cannot erase its 9.58-second travel plus 5-second handling floor. A staged rack/service design needs its own small comparison.

Add **30 s orientation**, **60 s freely observing timber become forge rails**, and **20 s commissioning/understanding frontier supply**. These are assumed human activity, not timers, claim screens or compulsory ceremonies. The existing 11/39-second fitted transition beats remain. With no voluntary content dwell (`--content=0`), the chapter takes **7.31 minutes solo**; it never waits to enforce the target duration.

| Link                 | 1 player min / cumulative |   2 players |   3 players |   4 players |
| -------------------- | ------------------------: | ----------: | ----------: | ----------: |
| Timber + forge       |               5.82 / 5.82 | 5.46 / 5.46 | 5.44 / 5.44 | 5.42 / 5.42 |
| Quarry + first stone |               2.66 / 8.48 | 2.63 / 8.09 | 2.63 / 8.06 | 2.62 / 8.04 |

Solo minimum loads fall **10→8**. Total station work falls **163→101.34 s**; repeated carrying falls from **2.28→1.32 minutes**. The longer overall chapter comes from explicitly allocated orientation/consequences and supply, not added materials. Its longest labelled novelty gap is **1.80 min**, before discovering the camp. That remains a hypothesis about what is noticed.

### Activity shares: what the stopwatch is paying for

**[H] Solo elapsed-time attribution**, not measured player attention; columns may round to 99.9/100.1%.

| Activity                            | Fitted prototype % | Tuned chapter % | Six-era budget % |
| ----------------------------------- | -----------------: | --------------: | ---------------: |
| Harvest contact time                |                1.0 |             0.7 |             <0.1 |
| Pickup/unload handling              |                5.1 |             3.7 |              0.4 |
| Repeated empty/loaded carrying      |               31.3 |            15.6 |              2.0 |
| Other walking                       |               24.7 |            21.2 |              9.5 |
| Riding                              |                8.9 |             7.7 |              4.3 |
| Physical construction               |               15.9 |            13.7 |              1.8 |
| Supply/transition waits             |               11.4 |            14.4 |                0 |
| Orientation                         |                1.7 |             7.4 |                0 |
| Proposed discovery/choice/aftermath |                  0 |            15.7 |             82.0 |

The tiny harvest fraction is an amortized cooldown calculation: it is **not evidence that chopping lacks emotional importance**. The player's favourite moments can occupy little elapsed time. Conversely, the campaign's enormous content column is not an earned claim about its richness.

## A rough six-era table near eight hours

**[H] Two required links and three stations per link**, 12/36 overall, following the earlier content ceiling. IDs are work-package placeholders, not a verified topology of Two-Bay Weave: colocated camp catchments and exactly which edges close the ring still need a map. Extra cross-links are optional and excluded. The future pair means port approach followed by the final Home–port closure. No sea-crossing recipe needs goods obtainable only beyond that crossing.

The following is a **solo-led, unhurried budget** roughly matching the newer six-era proposal; the two-person result happens to be 481 minutes. It is not the earlier report's 120-minute divisible-work model. A focused crew may skip the content estimates; the game must let it. First useful wood link lands around 12.8 minutes. Completion ends at the final connection; the listed last ride is optional and can be skipped (90 seconds here), as can any later toy-box lingering.

| Era             | Kit per station; manual retirement                             | Carry | Source m | Supply units/s; batch | Train / layer m/s | Rail m/link | Content / walk / ride min per era |
| --------------- | -------------------------------------------------------------- | ----: | -------: | --------------------- | ----------------- | ----------: | --------------------------------- |
| Wood            | 24/24/12 logs; then 12/16/12 supplied mixed pieces             | 12→16 |       30 | 1; 24                 | 12 / 5            |         180 | 30 / 8 / 2                        |
| Steam           | 7 bracing + 8 rails + 1 crystal seed; mine only the first seed |    16 |       36 | 1; 24                 | 20 / 25           |       1,200 | 48 / 8 / 4                        |
| Iron/harbour    | 8 girder kits + 8 rails + 7 collars + 1 supplied seed          |    16 |       30 | 2; 24                 | 20 / 30           |       1,200 | 74 / 8 / 5                        |
| Diesel/concrete | 8 slab kits + 8 rail modules, all supplied                     |    16 |       36 | 3; 24                 | 30 / 30           |       1,200 | 85 / 8 / 4                        |
| Electric        | 8 reels + 8 rail modules + 8 mast kits, all supplied           |    16 |       30 | 4; 24                 | 40 / 30           |       1,200 | 80 / 8 / 3                        |
| Future          | 7 span kits + 8 rail modules + 1 supplied seed                 |    16 |       36 | 4; 24                 | 50 / 30           |       1,200 | 80 / 6 / 3                        |

All later supply uses 5 s handling and 0/400/800 m of completed track to its three workfront racks; one current kit may accumulate during the approach/content interval. Every seed grows one pillar: at most three seeds per three-span link, not hundreds of crystals. The first seed's one-second harvest is a placeholder for a generous action, not a mining measurement; finding it belongs to the steam discovery budget. After that first seed, the connected network delivers them. Prefabricated bundles and longer spans increase **metres of useful railway per carry**, with no speed-mashing upgrade. The construction speeds of 25/30 m/s keep 400 m spans around 14–17 seconds but require a visual test; they are not approved animation speeds.

**[H] Choice of train speed:** use 20 m/s for the first sea journey to test the newer accepted roughly-minute crossing, rather than treating the proposal's 16 m/s steam value as binding. At 1.2 km, ideal cruises are 60/60/40/30/24 s from steam onward, plus boarding, acceleration and stops not simulated. The larger ride budgets include revisits; those distances must earn their length in actual layout.

**[H] Content to author, not waiting to add:** wood should make Home's new service and reachable gorge legible; steam must contain the first seed discovery, growing pillar and far-shore settlement; iron must make connected branches visibly useful together; diesel needs a town that can be explored below and above the new line; electric should change traversal through known places; future must turn the distant port into walkable streets and close the ring. These descriptions do not yet justify 30–85 minutes each. Inside each era, replace placeholder minutes with timed, named routes/reveals and freely chosen interactions. Optional toys remain optional, never progression gates.

### Model output: per-link / cumulative minutes, 1–4 players

| Link              |       1 player |      2 players |      3 players |      4 players |
| ----------------- | -------------: | -------------: | -------------: | -------------: |
| wood-1            |  12.79 / 12.79 |  12.32 / 12.32 |  12.30 / 12.30 |  12.28 / 12.28 |
| wood-2            |  30.31 / 43.10 |  30.28 / 42.60 |  30.27 / 42.56 |  30.26 / 42.54 |
| steam-1           |  31.64 / 74.74 |  31.61 / 74.20 |  31.60 / 74.16 |  31.59 / 74.13 |
| steam-2           | 31.62 / 106.36 | 31.59 / 105.79 | 31.58 / 105.74 | 31.57 / 105.70 |
| iron-harbour-1    | 45.52 / 151.88 | 44.87 / 150.66 | 44.85 / 150.59 | 44.84 / 150.54 |
| iron-harbour-2    | 45.52 / 197.40 | 44.87 / 195.52 | 44.85 / 195.43 | 44.84 / 195.38 |
| diesel-concrete-1 | 49.99 / 247.39 | 49.96 / 245.48 | 49.95 / 245.38 | 49.94 / 245.32 |
| diesel-concrete-2 | 49.99 / 297.38 | 49.96 / 295.43 | 49.95 / 295.33 | 49.94 / 295.26 |
| electric-1        | 47.52 / 344.90 | 46.87 / 342.30 | 46.85 / 342.18 | 46.84 / 342.10 |
| electric-2        | 47.52 / 392.41 | 46.87 / 389.17 | 46.85 / 389.02 | 46.84 / 388.93 |
| future-1          | 45.99 / 438.40 | 45.96 / 435.12 | 45.95 / 434.97 | 45.94 / 434.87 |
| future-2          | 45.99 / 484.40 | 45.96 / 481.08 | 45.95 / 480.92 | 45.94 / 480.81 |

Era totals solo are **43.10 / 63.26 / 91.04 / 99.98 / 95.04 / 91.98 minutes**, around the proposal's intended shape. Solo trip patterns are wood **2/2/1, 1/1/1**; steam **1/1/1 twice**; iron **2/2/2 twice**; diesel **1/1/1 twice**; electric **2/2/2 twice**; future **1/1/1 twice**. That is **50 loads** across the campaign. Pair/three/four-player schedules use two/three/four partial loads per station with one wave, absent interference. No recipe is increased to occupy everyone.

**[H] Failure exposed:** **397/484.4 = 82%** of the solo budget is unspecified content. The named-event gap reaches **29.33 minutes in diesel**, and four players barely change it (**29.29**). Even completely removing the content leaves **99.97 minutes solo / 96.38 with four**, including newly exposed supply waits. Thus eight hours is conditional on several hours of authored play we do not yet have. Reducing the content assumptions by 25% yields **385.15 minutes solo / 381.56 with four**. Accept that shorter campaign if the content does not earn its time; the economic model gives no basis for making carriers fill the missing hundred minutes.

### Reward abundance has a different denominator

**[H]** For inspection, the model counts **one personal cosmetic find per station plus three at each first link-cargo payoff**, using the deed shape of [maximal rewards](maximal-rewards.md), not its full catalogue or odds. These grant no speed, inventory or material advantage in the forecast. The opening produces 12 finds in 8.48 minutes (**84.9/hour** during that brief burst); the full route produces 72 in 484.4 minutes (**8.9/hour**). A generous opening does not establish a generous campaign.

At 30–40 finds/hour, eight hours needs roughly **240–320 finds**. Thirty-six station deeds plus twelve link deeds are only 48 payout opportunities: around **five to seven finds per opportunity on average**, with greater milestones weighted higher. Start by testing a complete three- or six-item manifest, automatic keeping and one readable useful world consequence. Do not create 200 extra stations or mandatory collect/compare actions. Larger manifests alone do not shorten the long no-novelty gap. For this slice, personal contents remain cosmetic; the guaranteed 16-piece harness and network services are deterministic shared progression, not lucky rolls.

## Sensitivity and warning points

**[H] One-variable chapter comparisons**, from `sensitivity`; multiplayer values assume the same declared content time and active participation.

| Change                                         | Solo min | Pair min | Four min | Meaning                                                           |
| ---------------------------------------------- | -------: | -------: | -------: | ----------------------------------------------------------------- |
| Proposed defaults                              |     8.48 |     8.09 |     8.04 | Reference, not a measured target                                  |
| Capacity 8 throughout                          |     9.68 |     8.40 |     8.04 | More trips, friends can absorb some waves                         |
| Capacity 12 throughout                         |     8.68 |     8.09 |     8.04 | Q2 alone needs another solo load                                  |
| Capacity 24 throughout                         |     8.20 |     8.09 |     8.04 | Two early trips disappear; only 17 s saved overall                |
| Half pickup distance                           |     7.82 |     7.56 |     7.50 | Directly removes repeated travel                                  |
| Double pickup distance                         |     9.80 |     9.17 |     9.12 | Costs a solo player 79 s; friends still walk                      |
| Half production rate                           |     8.61 |     8.23 |     8.17 | Some lost production was covered by prior activity                |
| One-tenth production rate                      |    11.13 |    10.74 |    10.69 | Turns freight relief into a queue                                 |
| Double train speed                             |     8.05 |     7.66 |     7.61 | Saves 26 s solo; does not remove walking or handling              |
| 25% interference per additional active carrier |     8.48 |     8.22 |     8.22 | Scheduler chooses fewer carriers if crowding outweighs tiny gains |

**Capacity has cliffs.** On unchanged prototype costs, capacities **8/12/16/24** need **15/10/9/6 minimum solo loads**. A 12→15 increase still leaves the sixteen-piece kit at two trips; 12→16 saves that trip, not any 24-log station. On the tuned chapter, the same capacities need **14/9/8/6**. Never round recipe/capacity division down.

**Distance often dominates.** With one carrier and `k` loads, `dWork/dd = 2*k/5.6` s/m. For two loads, another 10 m one-way costs **7.14 s**; for one load, **3.57 s**. Faster chopping scarcely offsets this at a 0.24-second stroke cooldown. Across the fitted prototype, halving pickup distances saves **68.32 seconds**; doubling them adds **136.64**. These derivatives apply to the effective route, not straight-line map displacement.

**Friends do not erase travel.** Baseline 1→2 saves about **59 s**; 2→4 saves about **4 s**. In the tuned chapter, 1→2 saves **23 s**, then 2→4 saves **3 s**. The repeated home errand's final single load barely benefits from sharing; a near rack helps more. The model permits ideal partial loads and unlimited access; [shared-construction.md](shared-construction.md) explains why the real shared station needs testing. A connected spectator is not a worker, and these are not guarantees of occupied roles.

**Grind risks:** T3's longest work follows the most impressive trestle; Q3 repeats a known commute; slow supply replaces travel with waiting; iron/electric return to two solo loads without proving their extra kits are interesting; the diesel content gap is almost half an hour. **Trivially short risks:** half-distance + capacity 24 reduces some existing ten-second work below the model's eight-second flag; small partial loads can make extra friends perform token gestures. Let them ride or explore rather than taxing the group. A one-crystal action is intentionally brief—the discovery, placement and grown support carry its significance.

**Campaign sensitivity is dominated by content assumptions.** At the proposed long discovery intervals, even 10% production rate has no uncovered supply wait; the next kit has ample preparation time. That is not proof that the production rate is safe on a focused route. `eras --content=0` reveals the queues. Raw-material farming, missed trains and earlier/later arrival would further change them. Measure these before choosing a production rate.

## Numbered recommendations and the smallest playtest for each

All recommendations are **[H]**. Run isolated comparisons before combining the tuned table. Give the owner only the stated new thing and gut question; the builder records trips, activity times, supply readiness and actual visible consequences, checks edge cases and watches the action through the existing [look workflow](../../.claude/skills/look/SKILL.md). No new unit tests or browser scenarios for these feel comparisons; a later shared-state contract follows the repository's separate testing rules.

1. **Cut only T3 from 24 to 12 logs first.** Touches [`LINKS` in layout.ts](../../src/proto/place/layout.ts), as proposed by [next-load motivation](next-load-motivation.md). Forecast: 42→21 s, one fewer trip; do not alter its route or add gifts. **Smallest test:** seed the approach immediately after building T2, compare the current and single-load finish once each, reverse order with the next tester. New: “One last bundle closes the line home.” Gut: **“Was that last carry worth it?”** Reject a time-only fix if one load still drags or feels unearned.

2. **Bring both logs and rails to the frontier, with a visible supply handover.** Touches [`finishStretch()`/pickup flow](../../src/proto/place/index.ts), [`forge.ts`](../../src/proto/place/forge.ts) and [rail-slice supply/service](../plans/rail-slice.md#authority-and-the-production-seam). **Smallest test:** Q2/Q3 at unchanged costs and capacity 12, home rack versus one delivered kit at the completed rail end; no general routing system. New: “The line brings the next kit to you.” Gut: **“Did the railway make you want to build the next bit?”** Record actual wait plus carry; include an agent-run late train and partial kit. A 14.6 s queue is the flagged starting risk, not successful automation.

3. **Grant capacity at an actual trip threshold, independently of freight.** Touches `TUNE.carry`, [`back.room()`](../../src/proto/place/chop.ts) and the forge handoff in [place/index.ts](../../src/proto/place/index.ts). **Smallest test:** the existing 16-piece Q2 kit at capacity 12 versus 16, same home source and recipe. New: “The forge equips you for a whole kit.” Gut: **“Did that upgrade feel useful on the next trip?”** Count the saved return and preserve it; do not increase the bill or make the harness random.

4. **Keep bills fixed and test one, two and four active helpers on the same route.** Touches the [shared-station proposal](shared-construction.md) and [rail-slice authority](../plans/rail-slice.md#authority-and-the-production-seam); `place` itself cannot establish this. **Smallest test:** one 24-log frame and one 12-piece frame, solo then a pair, then four only after shared state works; let a helper leave. New: “Everyone's load builds the same track.” Gut: **“Did your friend make the job better?”** Check effective participation, partial pickups and queues; do not interpret a faster counter as proof of better co-op.

5. **Make one crystal discovery retire crystal farming for subsequent pillars.** Touches [boogle-2 open question 19](../proposals/boogle-2.md) and the first crossing in [rail-slice](../plans/rail-slice.md). **Smallest test:** one nearby seed, carry, collar placement and visible growth; a second support receives a seed by freight and still needs the player's carry. New: “Your first crystal becomes a pillar; the railway brings the next.” Gut: **“Did the second pillar feel like your network had grown stronger?”** No seed multiplication by pillar height and no unreachable far-shore ingredient.

6. **Separate reward abundance from material cost and functional novelty.** Touches [rail-slice's cosmetic reward pass](../plans/rail-slice.md#town-life-gifts-and-the-possible-roundhouse) and [maximal-rewards](maximal-rewards.md). **Smallest test:** one identical cargo/town payoff with one versus three or six automatically kept cosmetic finds; same material work, no luck-dependent tool. New: “Your delivery brings a generous personal parcel.” Gut: **“Did that arrival make you want to keep going?”** Observe whether the town's change is understood; expand the manifest rather than the bill if the reward cadence is too sparse.

7. **Keep the opening short, and make every extra campaign minute earn its place.** Touches [rail-slice Pacing](../plans/rail-slice.md#pacing-measure-the-repeated-job-not-a-two-hour-script), [six-eras.md](../proposals/six-eras.md) and this model's `eraRows`. **Smallest test:** one 12–15-minute opening with the first service; then a seeded 15-minute diesel segment with one new elevated route and a town change, no extra resource quota. New: “The route you build changes how you explore the town.” Gut: **“Did you want to see what was next?”** Replace a portion of the 397-minute placeholder with observed activity; shorten the eight-hour estimate if it cannot be justified. A later full campaign run is still needed to validate eight hours.

8. **Replace fitted distances with one real activity trace before treating forecasts as tuning.** Touches [place's measured section](../game-design/place.md#measured), [playtests.md](../playtests.md) and [`model.ts`](../../dev/economy/model.ts). **Smallest test:** one ordinary solo replay of both lines, timestamping source departures, pickup/chop, deposits, layer start/end, waits and first useful cargo; record empty/loaded trips and actual path length. New: “The same route, with its timing recorded.” Gut: **“Where did you first want something to change?”** Use this as out-of-sample evidence, report the largest prediction error, and rerun the model before changing a game constant.

## Reproduction and verification

The model was run for every table and 1–4 players, plus all printed capacity, distance, production, train, content and coordination sensitivities. Ad hoc arithmetic checks verified the six fitted work observations, 200/398/437-second checkpoints, elapsed activity reconciliation, valid trip bounds, capacity/distance direction, invalid numeric inputs and a two-batch delivery calculation. No new gameplay tests were added. Prettier passed on all three changed files (explicitly overriding the repository's Markdown ignore); the model passed ESLint. `npm run check` passed: lint, TypeScript, 292 unit tests, registry, level checks, asset validation and production build. Local source links were checked for missing paths. No push or deployment is part of this research.
