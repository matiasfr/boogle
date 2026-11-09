# Compounding infrastructure and towns supplied by a network

_Research report, 1 November 2026. Infrastructure that makes the next infrastructure easier to build; towns whose growth repays the connection; the player's work after routine logistics disappear. Live-source research across Death Stranding 1 and 2, Factorio, Satisfactory, Transport Tycoon Deluxe/OpenTTD, A-Train, Anno, Workers & Resources, Mini Metro, Dorfromantik, Islanders, Railroads Online, Dyson Sphere Program, Palworld, Against the Storm, Astroneer and Transport Fever 2. Recommendations for Boogle's rail-loop prototype, not new design decisions._

**Markers, following [sea-crossings.md](sea-crossings.md).** **[V]** means the source was fetched and its words or code support the claim; its provenance is stated. **[S]** means a secondary wiki, guide, search summary or reporter's paraphrase, even when fetched. **[I]** marks analysis and proposed Boogle numbers, not measured outcomes. Developer interviews and developer-written postmortems count as primary testimony; announcements establish what developers describe, not independent playtest results. No games were played or talk videos watched for this report.

**Decision baseline.** Read [AGENTS.md](../../AGENTS.md), [DESIGN.md](../../DESIGN.md), the [design record](../decisions.md), [research index](README.md), and the reports below first. The repository already contains entries dated **2026-11-02**; this report uses those supplied entries, especially “the rail builds the world,” visible towns, ride-only timetabled trains, and open questions **9–13**. The rail loop is an experiment. Eight eras at 1–3 evenings each remain recorded alongside the unresolved 2–8-hour alternative. This report does not choose between them, settle the role of hauling, or reverse “play is the material.”

| Earlier report                                                                                    | What it already owns                                                   | What this report adds                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Carrying and logistics play](carrying-and-logistics-play.md)                                     | The bundle, hauling feel, optional clumsiness, counting repeated trips | What replaces those trips and how a connection funds the next connection                 |
| [Progression models](progression-models.md)                                                       | Candidate reward structures and hybrid progression models              | A causal supply → town → construction-capability loop, with a rate budget                |
| [Rail as play](rail-as-play.md)                                                                   | Laying, rail vehicles and network interaction                          | Value beyond transport, automatic distribution and the danger of an empty frontier       |
| [Era progression](era-progression.md)                                                             | Making ages visually and audibly distinct                              | Changing construction operations and bounding the number of growth assets                |
| [Construction you can watch](construction-you-can-watch.md) and [sea crossings](sea-crossings.md) | Assembly spectacle and the crossing experience                         | What pays for assembly, how a new shore becomes buildable, and what supply changes there |

## Summary

1. The useful loop is **connect → inherit a service → build something previously awkward or impossible**. Higher throughput alone is weaker than a depot that lets you build at the frontier, a longer span, or a complete structure placed in one operation.
2. A-Train is the closest supply-to-town precedent; Astroneer is the closest embodied rail-as-building-support precedent. Death Stranding supplies the investment fantasy, but its material handling and asynchronous contribution differ from Boogle's automatic logistics and live co-op.
3. Automation is satisfying when it retires a solved task. It becomes an idle game when it also chooses the next destination, lays the next line and consumes the next upgrade for the player.
4. OpenTTD is an important counterexample: ordinary town growth rewards serviced stations, not a universal goods-volume meter. Transport Fever 2 explicitly couples supply and reachable destinations to growth. These are different models.
5. Town growth needs a legible cause, a changed place, and a useful consequence. A bigger population label is insufficient; so is a handsome building that changes nothing the player can do.
6. Reusing plots and modular additions contains the asset count, but every combination still needs silhouette, traversal, construction and camera checks.
7. Solo must supply the complete baseline. Friends add parallel discovery, choices and visible contributions; optional activities must not become the fastest compulsory material farm.
8. Test two consecutive feedback cycles before planning eight eras. The second connection should visibly benefit from the first while asking for a new spatial decision.

## Findings by source

### 1. Death Stranding 1 and 2: an investment changes the cost of future work

**[S, fetched DS1 guide]** Auto-pavers occupy fixed locations; contributing metals, ceramics and chiral crystals completes road sections. This turns a donation into an investment in a lasting route rather than a payment for one journey ([Push Square, road guide](https://www.pushsquare.com/guides/death-stranding-how-to-build-roads)). The guide establishes the material interaction, not that the economy is grind-free.

**[V, Kojima interview]** Asked about DS2's expanded infrastructure, Kojima points to players still building highways years after DS1 and explains the addition of monorails. He also describes giving players more ways to approach travel. His account of Likes emphasizes appreciation between strangers ([PlayStation interview, 8 May 2025](https://blog.playstation.com/?p=404517)). This is evidence of the intended appeal, not a retention study.

**[S, fetched DS2 guide]** Restoring the mine introduces monorails; mines exchange chiral crystals for materials, while restored lines move cargo and can carry Sam and a vehicle. Track restoration itself requires materials ([Radio Times, monorail guide](https://www.radiotimes.com/technology/gaming/death-stranding-2-how-to-unlock-monorail-explained/)). This creates a materials → transport → easier materials-access loop, but still involves terminals and cargo handling. It does not establish fully automatic camp-to-town production.

**[I] Boogle lesson:** retain the durable landscape change and the feeling of making later work easier. Automate terminal handling. Put fresh embodied work beyond the completed route rather than requiring periodic servicing behind it. DS's asynchronous sharing supports visible gratitude; it does not validate simultaneous shared spending. Exact DS2 yields and contribution rules were not verified from a developer source.

### 2. Factorio: automate an operation, then increase the scale of the decision

**[V, developer implementation accounts]** Factorio's remote-view work lets players configure entities and ghosts, request robot-delivered items, and plan entities on not-yet-built supporting tiles. The stated need is that players cannot be everywhere once space platforms and planets exist ([Friday Facts 380](https://www.factorio.com/blog/post/fff-380)). Stronger blueprint placement resolves prerequisites and conflicts, including terrain and existing structures ([Friday Facts 383](https://www.factorio.com/blog/post/fff-383)). These are development accounts of the 2.0 systems, rather than measured novice-play outcomes.

**[I] Value beyond transport:** logistics becomes a construction workforce. The benefit is fewer repeated operations per design, not merely more ore per minute. Layout and system design remain unresolved after the robots arrive.

**[I] Boogle lesson:** remote management fits a character-led toy world less well. Borrow commissioning a complete small structure whose prerequisites assemble automatically; keep surveying, choosing and starting it in the world. Never copy destructive blueprint replacement onto another player's work. A larger construction unit is a more meaningful era reward than raising prices and throughput together.

### 3. Satisfactory: remove supply runs while preserving building and exploration

**[V, developer release explanation]** The 1.0 announcement describes the Dimensional Depot, researched through the MAM using exploration resources, as access to building materials without repeated returns to storage. It also describes Project Assembly becoming visibly more developed through its phases and additional construction decoration ([Coffee Stain, 1.0 launch](https://coffeestain.com/news/satisfactory-1-0-launch/)). It does not establish a Boogle-sized completion time or universal depot unlock tier.

**[I] What remains in the player's hands:** selecting a site, shaping structures, investigating the next place and deciding what the factory should become. The depot removes an interruption to that work.

**[I] Boogle lesson:** arriving at a supplied worksite should be enough to use its supply. Do not require a storage visit to withdraw those same pieces. If automation makes the prototype passive, first test whether the frontier offers an interesting build choice. Restoring fetch trips can conceal that missing activity. Boogle need not inherit the recipe depth or production waits.

### 4. Transport Tycoon Deluxe and OpenTTD: service is not consumption

**[V, original manual, mirrored copy]** The Transport Tycoon Deluxe manual describes linked industries, including wood processed into goods and ore into steel and then goods. It also describes station service ratings and reinvestment in transport infrastructure ([MicroProse manual, printed pp. 88–97](https://manualmachine.com/gamespc/pctransporttycoondeluxe/1118026-user-manual/)). The business creates more destinations and earning opportunities. This manual does not establish modern OpenTTD's exact town algorithm.

**[S, community documentation]** OpenTTD's town page says ordinary growth depends on up to five recently active stations; cargo can be picked up or delivered. Delivering more goods is not a general direct growth multiplier. Arctic and tropical towns have additional food/water conditions ([town documentation](https://wiki.openttd.org/en/Manual/Towns)).

**[V, versioned shipped source]** In OpenTTD **14.1**, `CountActiveStations` examines recent station activity, `GetNormalGrowthRate` clamps the station contribution at five, and `UpdateTownGrowth` handles climate-specific requirements. These support the distinction between service and universal material consumption ([tagged source](https://github.com/OpenTTD/OpenTTD/blob/14.1/src/town_cmd.cpp)). This is not a claim about every setting, GameScript or subsequent release.

**[I] Boogle lesson:** decide what a connection means. A permanent service unlock is readable and forgiving; continuous consumption invites shortage accounting. Delivered goods can make a new capability believable without importing climate gates or a puzzle about overlapping station catchments.

### 5. A-Train: delivery extends the area in which a town can exist

**[V, official A-Train Exp.+ manuals]** Development combines people flows, construction materials and electricity. Freight carries factory materials into depots; buildings use nearby deposited materials. The documented ranges are 400 m between station and depot and 600 m between depot and construction, with height restrictions ([development guide](https://www.artdink.com/manual/aexpplus/english/about02/about02.html); [materials guide](https://www.artdink.com/manual/aexpplus/english/mater01/mater01.html)). These numbers belong to this edition.

**[V, same development guide]** New transport needs a connection to existing people flows. Player subsidiaries can attract residents, after which other companies build. Stations, track and certain other infrastructure are exceptions to the ordinary material requirement: the bootstrap route can precede the town it supplies.

**[I] Value beyond transport:** a new construction envelope and activity at a formerly undevelopable place. That is closer to Boogle's direction than a global counter rising faster.

**[I] Boogle lesson:** a supplied town establishes the next construction foothold. Use an obvious station yard rather than detailed depot geometry. Do not require passengers, power, finance and materials simultaneously. A visible delivery and the building it enables are enough for the first test.

### 6. Transport Fever 2: supply and reachable destinations both grow towns

**[V, official game manual]** Towns add or enlarge buildings as they grow. Reachable passenger destinations and supplied commercial/industrial cargo contribute; traffic, emissions and overcrowding can penalize growth. The ordinary setup has two demanded cargo types per town, with settings that change demand ([town manual](https://wiki.transportfever2.com/doku.php?id=gamemanual:towns)). This developer-hosted manual documents intended rules, not source-code verification of every modifier.

**[I] Boogle lesson:** a connection can be valuable because of **where it connects**, as well as what it carries. A cross-link might make a distant town a convenient staging point after its first resource need is met. Borrow recognizable building growth and useful destinations. Drop shrinking towns and service penalties: they would turn the rear of the network into maintenance work.

### 7. Anno: modular growth contains costs, but combinations still need work

**[V, developer art/design account]** Anno 1800's High Life skyscrapers have up to three levels for Engineers and five for Investors. The team built modular additions, supported appearance variation and checked valid combinations; it discusses matching existing residences and controlling how parts fit. Height and neighboring towers also participate in Panorama ([Ubisoft Mainz, skyscraper devblog](https://anno-union.com/devblog-skyscrapers/)).

**[I]** Growth preserves a building's identity and location while making capacity visible. The source also exposes hidden production work: modular assets still need combination testing. “Procedural” does not mean art-free.

**[I] Boogle lesson:** retain a town's footprint and familiar buildings; add a workshop, roof, balcony, yard or civic landmark. Players should recognize the change on the ride home. Avoid Anno's growing recurring needs: Boogle's output should be a shared construction service. The mainland metropolis remains the separate single-build destination in the decision log.

### 8. Workers & Resources: solve the construction bootstrap first

**[V, developer report]** Developing realistic construction exposed the circular dependency of needing materials and workers to build the facilities that provide them. Foreign workers, imports and free starter facilities addressed it. The report also discusses customs traffic and local production/storage ([community report 59](https://www.sovietrepublic.net/post/report-for-the-community-59)). The shipped update describes realistic mode as an option where resources and vehicles physically enter the republic ([content update 11](https://www.sovietrepublic.net/post/content-update-10-1)).

**[I] Value beyond transport:** local supply shortens the whole construction chain. A depot or material plant helps every later site.

**[I] Boogle lesson:** a bridge to an island must not require the unreachable island's installation to finance its first span. Supply it from the established network, or provide another first approach. Copy the bootstrap insight, not customs queues, fuel, labor shifts or construction scheduling. Those are the deliberate substance of Workers & Resources and contrary to this light-management brief.

### 9. Astroneer: rail carries a building environment

**[V, developer release notes]** The Rails Update gives lines oxygen and power, autonomous trains, station loading/unloading and posts that chain into a line. Trains can be called from posts. Missions use rail to lead players through particular planets ([System Era, Rails Update](https://blog.astroneer.space/p/rails-update/)).

**[I] Why it fits:** extending rail extends support for an embodied explorer. Transport, material movement and the ability to operate farther from home arrive together; the character still works in the landscape.

**[I] Boogle lesson:** each supplied station can become a place from which construction proceeds. An expanding workshop service is enough; oxygen and power shortages add unwanted survival management. Retain the timetable instead of train summoning. The expanding service envelope is the transferable principle.

### 10. Railroads Online: route construction can remain embodied work

**[V, publisher description of the released game]** Industries occupy terrain players connect with track; players operate locomotives and transport freight, earning money for rolling stock. The publisher describes up to sixteen-player co-op and manual controls ([astragon, maps and gameplay](https://www.astragon.de/news/detail/neuer-trailer-praesentiert-verschiedene-spielwelten-von-railroads-online-pr)). This is a feature description, not proof that every crew size remains engaged.

**[I] Boogle lesson:** investigating terrain and deciding how the railway occupies it can survive cargo automation. Driving, braking, firing and loading cannot answer “what do my hands do?” here: Boogle's trains are ride-only. Remove that labor and the frontier needs deliberate activity. Multiplayer conversation alone is not a solo-first design solution.

### 11. Dyson Sphere Program: change the unit of ambition

**[V, developer store description]** The playable Early Access game combines a mobile mech, planetary/interstellar production, construction blueprints and a megastructure as the long-term project ([official Steam page](https://store.steampowered.com/app/1366540/Dyson_Sphere_Program/)). This establishes its advertised scale progression, not exact logistics-bot unlocks or rates. The consulted source identifies Early Access, not a completed 1.0 release.

**[I] Boogle lesson:** an era can change what counts as one construction action: a span, then a station kit, then a complete connection. Visible ambition grows while repeated hand placements shrink. Boogle can use this without planetary production mathematics. The metropolis can culminate the accumulated network rather than demand one last exponential material bill.

### 12. Palworld: workers leave the player free to roam

**[V, developer store description]** Pals work in construction, farming, factories, mining and power generation while players explore, ride creatures and enter dungeons. Feeding workers is part of that description ([official Steam page](https://store.steampowered.com/app/1623730/Palworld/)). It documents the intended division of work, not the reliability of every assignment or pathfinding case.

**[S, patch-note mirror]** The community wiki's 0.2.0.6 notes describe work-permission and assignment improvements ([patch mirror](https://palworld.wiki.gg/wiki/0.2.0.6)). This identifies management surfaces; it is insufficient evidence to pronounce the whole automation system tedious or broken.

**[I] Boogle lesson:** animate town work so supply feels socially productive, while keeping workers cosmetic. Food, beds, individual assignments and rescuing stuck workers would recreate chores behind the frontier. Their activity should celebrate an already-working service. Palworld fits the owner's material fantasy without granting permission to import survival needs.

### 13. Against the Storm: bounded projects and interchangeable solutions

**[V, developer design account]** Drafted buildings could leave players with incomplete production chains. Eremite explains how overlapping recipes make a production web with alternatives ([devlog 7](https://eremitegames.com/devlog-7-blueprint-drafting-system-and-more/)). This supports avoiding brittle dependencies, not making all materials identical.

**[V, developer-authored launch article]** A settlement is designed as a single-evening undertaking within larger progression; building offers and resources change the approach ([Eremite on Xbox Wire](https://news.xbox.com/en-us/2023/12/05/against-the-storm-roguelite-city-builder-pc-game-pass/)). A fetched [GDC 2024 abstract](https://gdcvault.com/play/1034422/-Against-the-Storm) confirms a postmortem exists; its video was not watched and supplies no further claims.

**[I] Boogle lesson:** let a session finish a project and let optional connections offer alternative paths to a capability. Do not copy settlement resets, hostility or deadlines. Permanent towns can have bounded chapters. If one specific resource camp is always the sole answer, exploration becomes a checklist.

### 14. Mini Metro, Dorfromantik and Islanders: small decisions leave large traces

**[V, developer sources]** Mini Metro adapts a network to a growing city and offers different pressure/creative modes ([press kit](https://dinopoloclub.com/press/mini-metro/)). Its small-team constraints included avoiding art-heavy production and hand-authored levels; the postmortem also describes substantial visual-design work despite the simple appearance ([developer-written postmortem](https://www.gamedeveloper.com/audio/postmortem-dinosaur-polo-club-s-i-mini-metro-i-/)). **[I]** City growth supplies new demands from outside the network; it is not evidence that delivered goods grow towns. Borrow comprehensible connections, not overload failure or assumed cheap polish.

**[V, developer interview]** Dorfromantik's designers discuss an appealing assembled landscape, small animations that give it life, and additional tiles, biomes and challenges ([Timo Falcke interview](https://www.gamedeveloper.com/business/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-/)). **[I]** Its town is mainly a composition, not a supply simulation. Boogle can borrow accumulated visual reward and local motion without a household economy behind every chimney.

**[V, developer interview]** Islanders' Friedemann Allmenröder describes removing a day cycle and directly awarding more buildings for points. He ties short production cycles to repeatedly cutting or combining features ([Game World Observer interview](https://gameworldobserver.com/2019/06/14/islanders)). **[I]** A Boogle town upgrade can directly provide the next construction capability. Population levels, reputation and research may all duplicate that event. Cut redundant systems before cutting the visible payoff.

## Applying the findings to the eight questions

### 1. What is a connection worth beyond transport?

**[I]** Give each major connection a primary consequence the player can point to. Distinguish these in the prototype:

| Value                      | Closest evidence above   | Boogle expression                           | Failure signal                              |
| -------------------------- | ------------------------ | ------------------------------------------- | ------------------------------------------- |
| Construction supply        | DS2, Workers & Resources | The previous camp fills the next worksite   | Repeated fetch trips remain                 |
| New building foothold      | A-Train, Astroneer       | A town supplies sites beyond the crossing   | Only a hidden global number increases       |
| New construction operation | Factorio, Satisfactory   | Commission a span or kit in one action      | Only a cost multiplier changes              |
| Useful destination         | Transport Fever 2        | A town becomes an expedition starting point | Every destination is an interchangeable tap |
| Remembered transformation  | Anno, Dorfromantik       | A familiar street gains a working place     | Nobody can say what changed or why          |
| Alternate solution         | Against the Storm        | Two approaches can solve the frontier       | Nominal choice conceals one checklist       |

A cross-link need not invent another resource. It can make an existing service convenient from a new direction, supporting the owner's chain-with-branches direction without quotas for every edge.

### 2. How does growth multiply without automating the game away?

**[I]** Separate supply rate, effort to commission a structure, and the set of structures now possible. A strong upgrade changes at least two: a workshop supplies the next yard and provides longer spans. Old hauling disappears; choosing the shore and span placement remains.

The basic wait is `supply time = site cost / delivered rate`. Triple both each era and the player gets the same wait with larger numbers. Increase rate while keeping every spatial choice identical and automation eventually removes the game. Make familiar work faster and introduce a new spatial relationship instead of preserving workload through prices.

**[V, local code]** Current [route costs](../../src/sim/route.ts) are 60, 180, 550, 1,600, 5,000, 15,000 and 45,000 units. [Helper freight](../../src/sim/sites.ts) supplies one unit per helper every 270 ticks; [bank.ts](../../src/sim/bank.ts) uses 100 ms ticks. One helper funding a 60-unit section therefore takes **27 minutes**, ignoring travel and construction. This is auxiliary-haul tuning, not a suitable inherited baseline for the proposed network economy.

**[I]** Try 10 units every 20 seconds into a 60-unit site: six arrivals and about two minutes, plus the existing [14-second laying run](../../src/sim/scripted-run.ts). These are internal prototype units, not player quotas. Observe whether scouting occupies the supply interval. Stop increasing rates once supply fits inside interesting exploration time.

### 3. What do embodied players do after routine logistics?

**[I]** Repeat an expedition with a changing problem:

1. **Read:** see the last delivery's town change and the capability it provides.
2. **Scout:** enter unsupplied terrain, inspect two approaches, find a useful destination.
3. **Shape:** position or select a route, span or kit in the world.
4. **Commit:** start the visible machine with the existing interact affordance.
5. **Use:** ride the line, explore from its endpoint, or return to the changed town.

Scout or shape must involve a meaningful choice. Fixed sites, compulsory links and an obvious next marker collapse into walking to a button. Pleasant toy feedback may sustain that briefly, but cannot alone establish an eight-hour infrastructure game.

This does not reinstate the cut wagon seat/show, driving, stoking or freight-catching. Frontier hauling remains open: compare no bootstrap hauling with **one optional bundle / at most 30 seconds** in `?proto=net&v=haul`. Require no repeated hauling behind the completed network. If the bundle only delays the good part, keep it as a toy elsewhere.

### 4. How do eras change construction itself?

**[I]** Possible capabilities to distribute across the recorded eras, not a replacement era plan:

| Construction family              | Limitation removed                           | New decision                         | Minimal test                             |
| -------------------------------- | -------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| Ground route / short span        | Supplies cannot reach the site               | Which side of an obstacle to follow  | Two corridors, one short gap             |
| Longer bridge / raised structure | Water or uneven ground interrupts rail       | Go around or cross                   | An 8 m span upgraded to 16 m             |
| Supplied station kit             | Every support structure is placed separately | Where to establish a foothold        | One four-part kit versus four placements |
| Elevated modular corridor        | Streets constrain ground rail                | How to connect through a built place | One elevated town crossing               |

Machines can still change appearance through wood, steam, steel and electricity. Each major chapter should also retire a restriction. Monorail and maglev should not both rely only on speed: one might change how rail fits through terrain, the other make the accumulated network practical at its new scale. Assigning those roles needs an owner decision and [find-the-fun step 7's distance test](../plans/find-the-fun.md#7-does-a-long-crossing-feel-vast).

### 5. How does town growth become a payoff, and what does its art cost?

**[I]** Stage **recognizable cargo → recognizable construction → usable service**. Timber could produce a workshop wing with its new span kit parked outside. Roofs changing at an invisible experience threshold break that chain. Each cargo need not have a deep simulation, but its first consequence should be intelligible.

Use three scales: a large shape seen from hub/train, a building change recognizable from the station, and two short activity loops seen on foot. A worker moving a beam and a door opening can express a service without residents needing jobs, beds or food. Preserve a familiar landmark and walkable space. Add a place to use, not only a backdrop.

**[I, scope arithmetic, not a production estimate]** Six plots × three stages × three independently authored towns means **54 plot-stage configurations** before animation, variants or era dressing; not necessarily 54 meshes. Eight bespoke era versions multiply the review burden further. Start with **six plots, three overall stages, one landmark, two activity loops and at most twelve mesh modules**. Reuse foundations and attachments; stagger additions so each registers. Measure actual labor after the first kit instead of claiming an artist-day estimate from these games.

The [hut blueprint](../../src/render/hut-blueprint.ts) already names pieces and stages appearance; the [asset-pipeline plan](../plans/asset-pipeline.md) provides the kit/clip workflow. This is a seam to investigate, not an existing town kit. Later towns can reuse modules with different grouping, elevation and one signature structure. Test the actual third-person camera: top-down Dorfromantik/Islanders economy does not guarantee usable street-level facades, backs, collision or silhouettes.

### 6. How do side activities help without becoming chores or gates?

**[I]** An optional activity becomes economically compulsory when skipping it makes the main loop tedious. A player doing **zero side activities** should reach every core town and construction capability at a satisfying pace.

Prefer visible traces and alternate useful discoveries: a bridge flag, town decoration, second approach or camp another player can connect. Keep personal rewards personal, following DESIGN. No ball income, required farming or mini-game keys.

If the owner resolves [open question 12](../decisions.md#open-questions-round-8-and-the-architecture-review) in favor of material bonuses, test a bounded **10–15% maximum reduction** in one project's supply time from non-repeatable discoveries. Repeated score performance must not become an uncapped income rate. This is a conditional alternative, not an approved reversal of “play is the material.” Substitution beats a gate: an optional discovery can offer another route to a benefit while baseline supply remains sufficient.

### 7. What changes between 2–8 hours and a longer game?

**[I]** A short game cannot spend its first evening teaching hauling it intends to retire. It needs an early visible feedback cycle and few construction families. Longer play needs more places, choices and kits; a steeper material curve mostly adds waiting.

| Working duration, not a decision | Consequential links to budget first | Cadence to test                                                                       | Additional play                                     |
| -------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 2 hours                          | 4–6                                 | Town response within 5 minutes; returned benefit within 10–15                         | Compact arc, detours, enjoying the completed line   |
| 4 hours                          | 6–9 across three acts               | About 15–25 minutes exploring/building/using each major link, with other play between | Different construction problems, two or three towns |
| 8 hours                          | 9–12                                | Keep the fast opening; lengthen expeditions, not supply waits                         | Branches, revisits, alternate connections           |
| Recorded 8–24 evenings           | Requires a separate content plan    | Cannot be established by multiplying the short prototype                              | Substantially more places and repeat-play design    |

These are content-budget hypotheses, not completion-time claims about the sources. The four-hour option leaves time for riding, exploring and messing about; nine copies of one build are not thereby proven fun. Against the Storm demonstrates bounded projects within longer progression; Islanders demonstrates cutting an extra pacing layer. Neither proves Boogle should reset towns or use score gates.

Play **two consecutive 20-minute project cycles**, with the second inheriting the first's service, before selecting full length. A twenty-minute toy can fail as soon as the repeating checklist becomes apparent.

### 8. How do a planner and an explorer cooperate?

**[V, developer store description]** Palworld advertises four-player online co-op and up to 32 players on a dedicated server alongside its automated base work ([official Steam page](https://store.steampowered.com/app/1623730/Palworld/)). **[I]** This permits the base/exploration split, but does not establish equal rewards or good catch-up. Compare the sources carefully: DS offers asynchronous contributions without a shared session; Railroads Online offers simultaneous manual railway jobs; Palworld lets workers continue routine tasks while humans pursue other activities. Boogle needs the latter division of attention with fewer maintenance requirements, plus persistent discoveries that make exploring useful to the builder.

**[I]** Neither role should require the other to stay online. An explorer marks an approach while a planner commissions a supplied site. Discoveries persist for everyone; first arrival does not consume a one-person key. Late joiners see the completed town, current construction and next lead without repeating prior collection.

Keep project costs fixed for **one to four players** initially. Friends contribute parallel attention and entertainment; raising the bill on arrival punishes joining. Test **two active worksites**, an automatic fair supply rule and visible deliveries to each. Players select projects, not freight routes or quotas. Avoid a shared wallet one player can repeatedly empty before another acts.

This is a design constraint, not a new networking architecture. Existing [world-rule contracts](../../src/world/rules/README.md) own persistent edits and snapshots; [wagon.ts](../../src/sim/wagon.ts) provides the timetable. Any implementation must credit delivery once in shared state and present crates locally, rather than award supply per observer or rendered lap. A timetable change must not duplicate supply. Use the existing application boundary; cargo physics must not become lockstep simulation.

Bound absence: fund **at most the next committed project's supply** initially, taking [capped freight](../../src/sim/bank.ts) as a precedent. Do not automatically choose and complete unseen frontier projects. Returning players inherit help without having the expedition chosen for them. This is a proposed progression cap, not a new offline simulation or a change to server ticking.

## Evidence limits and next checks

- Primary evidence is strongest for bootstrap dependencies (Workers & Resources), build-range support (A-Train/Astroneer), retiring construction operations (Factorio/Satisfactory) and modular growth production (Anno). None supplies Boogle's complete loop unchanged.
- DS2's detailed transactions remain secondary-guide evidence. Verify in a shipped build before adopting exact yields or claiming unattended production. Kojima's interview supports intention, not those rules.
- OpenTTD source was checked at **14.1**; scripts, settings and later versions may differ. A-Train distances belong to **Exp.+**. Do not turn edition-specific rules into series-wide claims.
- Store pages and releases document supported features, not crew engagement, boredom thresholds or automation reliability. Co-op recommendations are hypotheses fitted to DESIGN, not proof these games solved Boogle's problem.
- No verified art-hour budget was found for supply-driven growth. Anno documents modular complexity, Islanders scope reduction, and Mini Metro the work behind apparent simplicity. The proposed kit needs production measurement.
- The GDC abstract was read, not its talk. No unwatched video's interview claim, completion time or behavioral result is used.
- This report changes no gameplay or owner decision. [Find-the-fun step 6](../plans/find-the-fun.md#6-does-the-line-feed-the-town-the-rail-loop) remains unchecked; the inspected branch has no completed `?proto=net` implementation to evaluate.

## Numbered recommendations for Boogle

All starting values are **[I] prototype hypotheses**. These serve DESIGN's **Toys before chores**, **Cooperation is automatic, not negotiated**, **Telegraph everything** and **Designed for drop-in, drop-out**. Test the smallest experiment first; this is not an approved implementation backlog.

1. **Prove two compounding cycles before an era slice.** Start with one camp, one town and two successive worksites; aim for a returned construction benefit within **10–15 minutes**. Smallest prototype: the [planned `?proto=net`](../plans/find-the-fun.md#6-does-the-line-feed-the-town-the-rail-loop), then a second link using the first one's service. Pass when the player identifies both how the first helped and what new choice the second asks for. If the second is another wait, revise before adding places.

2. **Make a town's first reward a construction capability.** Test an **8 m → 16 m span** or a **four-part station kit placed in one operation**, beyond train speed alone. Smallest prototype: one obstacle with a before/after solution. Touches [find-the-fun step 6](../plans/find-the-fun.md#6-does-the-line-feed-the-town-the-rail-loop) and the [era direction](../decisions.md#the-shape-of-the-game). Pass when the upgrade changes where or how players build without a spreadsheet.

3. **Make delivery visibly cause a service to appear.** Start with arrival **within 20–30 seconds** and a small town change **within one minute** of service starting. Smallest prototype: one recognizable cargo, workshop addition and usable benefit, visible from hub and station. Use [hut-blueprint.ts](../../src/render/hut-blueprint.ts) and the [visible-town decision](../decisions.md#trains-and-the-world). Pass when players explain the cause without a growth panel. Established services should not decay.

4. **Retune auxiliary freight before making it the main economy.** Start at **60 units per site, 10 per 20-second arrival**, retaining the approved **14-second** laying run. Smallest prototype: change only the prototype rate and observe two cycles. [sites.ts](../../src/sim/sites.ts), [route.ts](../../src/sim/route.ts) and [scripted-run.ts](../../src/sim/scripted-run.ts) expose current assumptions. Pass when supply completes during useful exploration; reject costs that recreate the old wait. These rates are internal, not player quotas.

5. **Leave spatial decisions at the frontier and retire hauling behind it.** Offer **two plausible approaches**; compare no bootstrap hauling with **one bundle taking at most 30 seconds**. Smallest prototype: [net's planned haul variant](../plans/find-the-fun.md#6-does-the-line-feed-the-town-the-rail-loop), using [hands.ts](../../src/player/hands.ts). Pass when choosing and starting the route remains satisfying after fetch trips disappear. This tests [question 11](../decisions.md#open-questions-round-8-and-the-architecture-review), not a decision to remove hauling.

6. **Prove one reusable town kit before promising eight eras of growth.** Start with **six plots, three stages, one landmark, two activity loops and at most twelve mesh modules**. Smallest prototype: the same town from hub, train and street, following [asset-pipeline.md](../plans/asset-pipeline.md) and [hut-blueprint.ts](../../src/render/hut-blueprint.ts). Pass when each stage reads clearly, preserves usable space and adds less authoring work than the first. Keep the [mainland metropolis](../decisions.md) a separate single build.

7. **Group era upgrades around different construction operations.** Test **three families** first: ground route, longer/raised span and complete station kit. Smallest prototype: three versions of one constrained site, consulting the [recorded eras](../decisions.md#the-shape-of-the-game) and [era-progression.md](era-progression.md). Pass when players describe the difference with a verb or spatial possibility. This supplies evidence for assigning capabilities; it does not reduce the recorded era count.

8. **Make side activities genuinely skippable.** Compare a complete run with **zero side activities** against one with optional discoveries/decorations. Smallest prototype: both reach the same capability at a satisfying pace; extras leave visible traces. Touches [DESIGN's reward/farming principles](../../DESIGN.md) and [question 12](../decisions.md#open-questions-round-8-and-the-architecture-review). Only after an owner decision, test non-repeatable material help capped at **10–15%** of one supply interval. No mini-game gates or ball income.

9. **Choose duration from repeated play, then budget the world.** Begin with **two consecutive 20-minute cycles**; provisionally budget **6–9 meaningful links across three acts** for a four-hour option. Smallest prototype: first upgrade through next frontier, recording useful activity versus waiting. Touches [questions 9–10](../decisions.md#open-questions-round-8-and-the-architecture-review) and [find-the-fun.md](../plans/find-the-fun.md). Pass before choosing between 2–8 hours and longer eras; extra time must buy places and problems, not steeper costs.

10. **Let a planner and explorer progress independently.** Keep costs fixed for **one to four players** and begin with **two automatically supplied active sites**. Smallest prototype: solo, two players choosing different sites, then a third joining mid-delivery. Touches [world-rule application/snapshot contracts](../../src/world/rules/README.md) and [the timetable](../../src/sim/wagon.ts). Pass when both sites receive supply, nobody needs a teammate's presence, and extra observers/reconnects never duplicate deliveries.

11. **Let absence fund work without choosing the expedition.** Start with **one next committed project's supply** as the cap; leave new routes unchosen. Smallest prototype: advance the clock and return as a late joiner to one legible benefit and one interesting frontier. Use [bank.ts](../../src/sim/bank.ts) as the cap precedent and [DESIGN's drop-in principles](../../DESIGN.md). Pass when absence helps while leaving a consequential action to perform.

12. **Solve the unreachable shore without a circular resource dependency.** Test **three short outward-built spans**, funded entirely from the connected side, before a vast crossing. Smallest prototype: a greybox gap requiring no far-bank material, with the approved [laying run](../../src/sim/scripted-run.ts). Touches [question 13](../decisions.md#open-questions-round-8-and-the-architecture-review) and [find-the-fun step 7](../plans/find-the-fun.md#7-does-a-long-crossing-feel-vast). Pass when players understand how to reach the camp; a boat remains an alternative to compare.
