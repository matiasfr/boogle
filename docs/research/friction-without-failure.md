# Friction without failure: challenge for an eight-hour railway

_Research report, 5 November 2026. Challenge, tension and friction in a no-death, no-loss, drop-in co-op adventure. Studies A Short Hike, Death Stranding, Overcooked, PEAK, Super Mario Odyssey, Animal Crossing, Dredge, Townscaper and Valheim. Repository baseline: `68ee082d`. Research only: no gameplay changes, new playtest, campaign validation or implementation approval._

**Evidence labels:** **[R]** = repository decision, plan or recorded observation; **[V]** = fetched primary-source text; **[I]** = interpretation; **[H]** = Boogle proposal. Developer interviews hosted by publications remain primary testimony; publisher pages establish advertised mechanics, not enjoyment. GDC abstracts were read, not the talks. Reference games were not played for this report. Every proposed duration and acceptance threshold is a test setting, not a scientific optimum.

## Answer first

**Make players solve and then retire a burden.** The interesting question is whether they can find a satisfying way through, help a friend, or make the next journey better. They need not risk losing their railway to care about the answer. The permanent consequence of good play should be a more useful world; an unsuccessful attempt should leave an understandable, nearby next attempt.

No-fail does not mean every action succeeds immediately. A jump can miss, a bundle can need turning, a route can be inefficient and a switch can open the wrong passage. For this brief, **no loss means no destroyed cargo, deducted currency, lost upgrades or reversed construction**. Time and position still matter, but a lengthy recovery walk is punishment even when no inventory disappears. Cozy also requires permission to stop, wander or let a friend leave.

The strongest evidence is already in Boogle: [round 3](../playtests.md#2026-11-02-round-3-two-players-protoplacecoop1fresh1) relieved friction before players wanted the train; [round 4](../playtests.md#2026-11-03-round-4-two-players-the-default-url) produced gratitude for relief twice, but also tedious rail commutes. More friction everywhere would repeat that mistake. **Vary the problem, preserve the solution, and give the solution enough useful play before the next upgrade.**

Serves [DESIGN](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic, not negotiated**, **Telegraph everything**, **Designed for drop-in, drop-out**, **Leave something for the next visitor**, **Slapstick over precision**, and **Show, don't tell**.

## Scope and continuity

The [research map](research-map.md) was checked first. House-format references are [comedy in games](comedy-in-games.md) and [incremental game maths](incremental-game-maths.md). This report adds a recovery contract, a pressure comparison across the nine games, a current friction audit and one controlled prototype. It does not replace their comedy survey, economy equations or upgrade catalogues.

| Related report                                                                                          | Build on                                                                                                               | Boundary or correction                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Comedy in games](comedy-in-games.md)                                                                   | Clear intent, surprising outcomes, cheap recovery, room for friends to supply jokes                                    | Ceremonies, soapbox work and rewriting Boogler reactions are not the next approved work. This report preserves his copy.                                       |
| [Incremental game maths](incremental-game-maths.md) and [next-load motivation](next-load-motivation.md) | Compare the same job before/after relief; count trips and useful remaining work                                        | Neither larger invoices nor an early universal automation deadline follows from the evidence. Old forecasts are not today's measured campaign.                 |
| [Upgrade economy](upgrade-economy.md)                                                                   | A material improves several systems; distinguish flat gains, chore removal, abilities, services, routes and expression | Its destination sequence and numerical catalogue remain proposals. Do not convert a 480-minute allowance into required grind.                                  |
| [Next destinations](next-destinations.md)                                                               | Different spatial problems, locally demonstrated materials, worthwhile returns                                         | The newer [progression brainstorm](../brainstorms/progression.md) proposes a different three-area route. This report does not settle that choice.              |
| [Sea crossings](sea-crossings.md)                                                                       | A visible destination, useful return route and construction reaching out over water                                    | Its 20–45-second suggestion predates the owner's roughly one-minute initial crossing. Do not revive storm tides, maintenance or compulsory onboard mini-games. |

**Authority [R].** The [progression brief](../brainstorms/progression.md) records the owner's material direction: big areas unlock components used across systems; small stops carry puzzles, abilities and discovery. Its Glasshouse/Split Shell/Exhibition selection, ability relocation and first fibre build are still proposed. The [decision log](../decisions.md#the-shape-of-the-game) settles roughly eight hours, path before train and staged efficiency. Its 5 November entries reject the hook swing, retain the targeted zip-line pull, and make the first evening cosmetic; night remains a stretch goal. The research map is older than those entries.

**Current gate [R].** [Direction](../direction.md) is a dated derived view: its statement that nothing has been played since readiness is superseded by the 4 November solo iPhone entry. That entry explicitly is not the two-player replay. [Round-4 notes](../plans/round-4-notes.md) distinguish shipped, branch-only and still-unplayed work, sometimes within checked rows. This report uses those qualifications rather than treating checkmarks as acceptance. Later early-work exceptions do not authorize a new gameplay direction. Follow [owner calls](../agents/owner-calls.md): new unsettled gameplay goes through brainstorm before building; stop at the relevant owner playtest. Research is independently authorized here.

Only documentation is changed. No nested `AGENTS.md` exists under these documentation paths; no high-risk source folder or lockstep math was reviewed. Implementation touchpoints below cite owning plans and as-built descriptions, not an unperformed source audit.

## What kind of tension survives without loss?

**[V]** Ryan, Rigby and Przybylski's [2006 study](https://www.rochester.edu/warner/lida/wp-content/uploads/2022/11/02bfe513dd59366750000000.pdf) reports associations between autonomy, competence and enjoyment across its first three studies; its multiplayer survey also identifies relatedness. This supports looking beyond punishment as motivation. It does not establish that removing death creates engagement, nor prescribe an eight-hour pacing curve.

**[I/H]** Use three questions when authoring a burden: **What can I decide? What can I learn? Whose situation can I improve?** If all three answers are empty, extending the burden probably creates waiting rather than challenge.

| Pressure                 | Engaging version for Boogle [H]                                                                  | Failure mode to avoid                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Physical comedy          | Visible awkward object; easy inputs; a friend makes handling smoother; an amusing local recovery | Randomly stealing control, cargo spills, collision bugs, or requiring two people                            |
| Logistics                | Choose task order, a useful route or where to help; see real stock and the eventual machine      | Quotas, routing administration, a mandatory dispatcher, depleted sources or identical rack runs             |
| Optional mastery         | Broad main route; shorter or expressive route rewards practice                                   | A precise stunt required for common materials or the next shared ability                                    |
| Timed opportunity        | A recurring flourish or faster optional line with an always-available ordinary route             | Missed-window idle time, exclusive rewards, a disappearing chance or a public slow-player score             |
| Efficiency hunger        | Recognize an inconvenience, see its remedy, then benefit repeatedly                              | Making controls bad first, increasing bills immediately, or introducing an upgrade at the ending            |
| Weather and sea          | Changing atmosphere and destination reveal; safe travel remains dependable                       | Night deadlines, storms destroying progress, obscured navigation, slippery inputs or compulsory ship chores |
| Curiosity and expression | A visible unreachable place, responsive construction, a friend's lasting addition                | Requiring completionism to fill time or disguising empty geography with collectibles                        |

**[H] Pressure should move, not accumulate.** After freight removes the old commute, the new question might be how to open a destination's mechanism. Do not retain the commute, add a timing test, and introduce weather simultaneously. That creates multiple demands on the same attention and makes a slow friend the apparent problem.

## Findings from the nine games

### 1. A Short Hike: a clear destination with freedom on the approach

**[V]** Robinson-Yu's [official description](https://ashorthike.com/) presents a summit, marked trails, backcountry exploration and encounters along the way. His [itch page](https://adamgryu.itch.io/a-short-hike) explicitly supports choosing one's own pace and taking time with other hikers. The [GDC postmortem abstract](https://www.gdcvault.com/play/1026613/) describes building a small open world within four months and setting expectations before play. These sources support bounded exploration; the abstract alone does not verify a particular golden-feather tuning curve.

**[I]** A known destination gives detours meaning without demanding urgency. Curiosity can create a momentary gap between what the player sees and what they know how to reach. Movement makes that investigation pleasurable.

**[H] Boogle transfer:** make a small stop legible from the railway and give it a generous route plus an optional expressive approach. The reward is understanding or using a move, then seeing a familiar place differently. Do not stretch a compact climb into a long resource requirement. A short game establishes a useful local pattern, not evidence that the same pattern alone fills eight hours.

### 2. Death Stranding: the journey contains the decisions

**[V]** In the [official Kojima Productions AMA](https://www.reddit.com/r/DeathStranding/comments/ic0ij3/ama_with_kojima_productions_akio_sakamoto_chief/), Akio Sakamoto describes play along the route, with terrain and placed structures affecting path choice. Hiroaki Yoshiike also explains that a proposed heat/stamina region was dropped because it would compound other obstacles too much. Kojima's [Game Informer interview](https://gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding) connects limited carrying, route selection and visible traces of others' help.

**[I]** Walking becomes play when terrain changes a decision, not simply when distance increases. Infrastructure is satisfying because it changes a journey the player understands. The rejected heat region is a useful warning against stacking every available pressure.

**[H] Boogle transfer:** a first awkward delivery can expose a blocked passage or a useful loading position; a permanent fitting removes that specific obstacle. Borrow route understanding and appreciation for help, not balancing inputs, damaged cargo, hostile weather or maintenance. A long fixed corridor with nothing to choose does not inherit Death Stranding's depth merely by carrying a visible bundle.

### 3. Overcooked: dependencies create cooperation; deadlines create liability

**[V]** Phil Duncan's [developer interview](https://www.gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-) describes designing for interdependence rather than letting one skilled player carry everyone. The team restricted excessive ingredient combinations because too many ways to make an order wrong were frustrating. Levels were built backward from the desired experience; score thresholds differed by player count and had to be revisited after movement/chopping changes.

**[I]** The useful mechanism is a visible chain of simple actions with several helpful positions. The timer makes prioritization urgent, but also makes another player's mistakes expensive. Removing the timer without changing the dependencies can still leave a compulsory role nobody wants.

**[H] Boogle transfer:** let one player open a delivery path while another brings a fitting, with either able to do both sequentially. Work can overlap without a chat negotiation. Gates latch and buffers retain deliveries. Do not copy stars, order expiry, fires, repeated resets or attendance-scaled bills. A friend leaving should reduce speed, never make the job impossible or invalidate work.

### 4. PEAK: visible vulnerability makes help meaningful

**[V]** The [developer/publisher game description](https://store.steampowered.com/app/3527290/PEAK/) names helping friends up ledges, ropes and climbing spikes; injuries reduce stamina and the mountain has lethal obstacles. It is explicitly not a no-fail precedent. In the [developer AMA](https://www.reddit.com/r/PeakGame/comments/1m5s7ei/we_are_some_of_the_devs_behind_peak_ama/), Nick Kaman describes preferring more freely randomized rock placement over prevalidated climbable segments; Landfall's Will describes weather/shelter interactions. These are their production choices, not a safe route-generation recipe for Boogle.

**[I]** An observable problem gives friends a reason to notice one another. A helping action is most satisfying when its effect is visible on the recipient, not just added to a team counter. PEAK's setbacks and uncertainty contribute to that intensity; removing them requires a substitute.

**[H] Boogle transfer:** use a slower but fully viable solo beam carry and an immediately legible assist, or a friend opening a permanent shortcut. Keep the shared laugh and recognizable help; replace elimination and downward injury spirals with nearby dry recovery. Do not copy unchecked route generation, hunger or abandonment pressure into the persistent railway.

### 5. Super Mario Odyssey: support the main journey and leave room above it

**[V]** [Nintendo's game page](https://www.nintendo.com/au/games/nintendo-switch/super-mario-odyssey/) separates assistance for newcomers from collecting every hidden item and setting minigame records. Assist Mode allows quick recovery near a fall and health recovery while stationary. The same page describes Koopa Freerunning, increasingly demanding jump-rope play and post-completion Balloon World. Odyssey still has health loss; it is a spectrum of challenge, not a literal no-loss game.

**[I]** The player can care about execution while the campaign remains approachable. A known space gains another use when the objective changes from reaching it to moving through it well.

**[H] Boogle transfer:** let the existing hook pull, jump and glider combine on an optional return route above the ordinary path, with dry recovery below. Reward a view, expression or a clearly optional personal best. Keep shared ability access on the main progression, not behind an expert friend's performance. Do not restore the rejected hook swing or the removed long-way-round banner as a shortcut to mastery design.

### 6. Animal Crossing: attachment and self-selected projects sustain attention

**[V]** The [Nintendo developer interview transcribed from its News Channel](https://www.nintendo-insider.com/animal-crossing-new-horizons-interview-multiplayer-turnip-prices-tom-nook-and-more/) has Kyogoku describe growing a deserted island into a village and Nogami describe emotional investment through small visits. Nogami emphasizes that Nook waits without charging loan interest, and describes optimizing his own orchard layout. The [New Leaf GDC abstract](https://www.gdcvault.com/play/1032224/How-to-Turn-a-New) identifies communication among players as a longstanding purpose.

**[I]** An obligation can be a chosen project rather than a deadline. Efficiency can be self-authored, and a persistent place can connect people who do not share a session.

**[H] Boogle transfer:** a town addition should remain visible and usable for the late friend; choosing the next useful fitting gives the group a modest project. Preserve arrival without catch-up chores. Do not import real-calendar gates, daily attendance incentives, turnip speculation or a long collection checklist to manufacture campaign length. Animal Crossing's long-term attachment does not demonstrate eight consecutive hours of authored Boogle content.

### 7. Dredge: remove upkeep; separate basic success from active mastery

**[V]** In Black Salt's [postmortem interview](https://www.gamedeveloper.com/design/trawling-in-the-deep-how-black-salt-games-made-spooky-fishing-rpg-i-dredge-i-), fuel was rejected: cheap manual refuelling felt empty, forgetting felt bad, and automatic refuelling only mattered when it forced a slow return. Time became the resource. Fishing progresses without timing inputs; skill can accelerate or hinder it, with accessibility options reducing penalties. The team wanted unlocked abilities useful in multiple regions. [Update 2's official announcement](https://www.team17.com/news/dredge-update-2) adds Passive Mode to avoid major threats while retaining fishing and exploration; it does not establish that all damage disappears.

**[I]** Its most useful no-fail lesson is successful baseline activity with optional improvement. Horror is separable from some of that loop. Removing fuel also demonstrates that a technically harmless slowdown can still feel punitive.

**[H] Boogle transfer:** keep ordinary delivery dependable; optional good positioning or route knowledge can improve it. Never make manual stoking, repairs or refuelling the train's admission price. Dredge's solo action-driven clock does not directly translate to friends acting asynchronously; don't propose a shared daylight deadline from this precedent.

### 8. Townscaper: responsive creation can supply the interest itself

**[V]** [Raw Fury's description](https://rawfury.com/games/townscaper/) explicitly presents a building toy without goals, grind or failure. Placement configurations become houses, arches, stairs, bridges and yards; the tools are available immediately.

**[I]** The attraction is the difference between a small input and an intelligible, pleasing outcome. A player can investigate what a combination makes, then develop a personal intention. This is evidence against assuming every engaging action needs pressure, not evidence for removing Boogle's railway progression.

**[H] Boogle transfer:** loading the last piece should produce a readable physical transformation that players can inspect and use. Keep quiet expression and construction appreciation between harder beats. Use the owner's [machines-show-their-work call](../agents/owner-calls.md#owners-standing-calls); do not substitute instant magical building appearance or add unrestricted free building before the current loop is proven. Watching a result once is not enough content for repeated hauling forever.

### 9. Valheim: preparation can reward rather than threaten

**[V]** In [Henrik Törnqvist's interview](https://www.pcgamer.com/valheim-developer-says-zelda-and-skyrim-were-bigger-influences-than-survival-games/), the developer describes Zelda-like equipment progression and a decision that food should improve performance rather than kill an unfed player. He argues that simulation should support play rather than exist for its own sake. These are primary design statements within the interview; they do not make Valheim as a whole safe or loss-free.

**[I]** The useful distinction is a bonus for preparation versus a recurring penalty for neglect. Even a nominal bonus becomes compulsory if ordinary progress is intolerable without it.

**[H] Boogle transfer:** let a permanent material upgrade increase reach, carrying or service quality, with a viable baseline beforehand. Borrow the expedition's promise of a new capability and a satisfying return home. Do not add a food bar, corpse run, raids, fuel or structure decay. “Hunger for efficiency” should mean wanting a better tool, not literally maintaining a hunger meter. Temporary buffs would also need to earn their maintenance burden before becoming a system.

## Boogle's current friction audit

These are documented observations and hypotheses, not a new runtime verdict. The [as-built Place chapter](../game-design/place.md) and [round-4 tracker](../plans/round-4-notes.md) provide current context; the source playtests remain dated.

| Evidence [R]                                                                                        | Diagnosis [I]                                                                           | Consequence to test [H]                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Round 3: deliveries felt alike; the small burden vanished when trains arrived                       | Too little problem development before broad relief                                      | Preserve a useful walkable shortcut and one distinct next problem; don't merely postpone the same train with a bigger bill                     |
| Round 4: eight minutes of log walking preceded grateful reactions to workers                        | Burden and remedy were understood in that sitting                                       | Keep the causal contrast; eight minutes is an observation from two informed players, not a minimum chore duration                              |
| Line 2 stations 4/5 required 150–250 m returns to the rack and were called tedious                  | Solved transport repeated without new choices or relief                                 | Check the worker rail-delivery change on the replay; don't assume its shipped status establishes improvement                                   |
| Trains arrived after 31 minutes and had only 3 min 19 s before the end                              | Payoff lacks a useful lifespan                                                          | Give the train an identifiable downstream job; evaluate timing separately from the already-proposed second-train cues                          |
| Hook → glider was 49 seconds; double jump challenge requested                                       | Capabilities arrive faster than their use can become meaningful                         | The shipped construction interlude is a candidate fix, still to be judged; small stops should add practice or combinations before another verb |
| Co-op chopping was liked; the great beam's help was initially invisible/unclear                     | Meaningful help exists, but its presentation and mechanics cannot be assumed            | Reuse [beam-weight](../plans/beam-weight.md)'s existing experiment and qualified evidence, not a duplicate carry system                        |
| Grant asked why to set up another train; objective marker carried the stretch                       | Missing desire/understanding, not insufficient punishment                               | Test the [cart-first brief](../brainstorms/cart-first.md)'s visible stone/street purpose with costs unchanged                                  |
| Launches, invisible partner cargo, repeated rider ejection, soft-locks and recovery loops           | Broken trust and accidental punishment                                                  | Treat these as defects; never count them as comic friction. Tracker fixes still need the relevant human/device evidence                        |
| Solo 4 November: forge, town reveal, NPCs and museum loved; pier at 41:27 including background time | Construction and discovery already carry attention; elapsed time is not all active work | Preserve these beats when adjusting transport; don't label every quiet visit idle time                                                         |

The [tracker](../plans/round-4-notes.md#shipped-overnight-4-november-to-be-played) reports only **2–4 seconds** benefit from splitting tasks at station 5 after worker changes. That is enough to justify checking whether help is perceptible, not enough to call cooperation solved. Meanwhile, moving every tree closer could erase the need for worker supply. The current replay must distinguish removal of arbitrary walking from removal of a useful problem.

## An eight-hour shape that does not require eight hours of resistance

**[H]** Use the proposed three-large-area structure only as an accounting example, not a route decision. This table allocates **480 minutes** of prospective activity, including discovery, travel, play and quiet use. None of these minutes has been validated. A skilled group may finish sooner; never scale bills upward to preserve the total.

| Allowance                                    | Named activity to author                                                                      | What creates interest                                           | What stays solved                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Starter, 60 min                              | Discover the line, open the footpath, earn staged handling/supply relief, use the train       | Learn what work becomes easier and why a second service matters | Early paths and supply remain useful              |
| Large area A, 90 min                         | Reach a distinctive place; solve its approach; demonstrate one material locally and export it | Route understanding and first useful transformation             | Its material removes a familiar chore permanently |
| Small stop, 20 min                           | Learn or combine a movement ability, with optional harder route                               | Competence and curiosity                                        | Recovery is local; shared access persists         |
| Large area B, 90 min                         | A different spatial problem and a material with several uses                                  | Selecting a fitting and overlapping helpful tasks               | Earlier harvesting/commuting is not restarted     |
| Small stop, 20 min                           | A compact discovery/puzzle using the current kit                                              | Change of pace; no obligation to master a time trial            | Main route remains approachable                   |
| Large area C, 90 min                         | A larger service or machinery puzzle using understood parts                                   | Combining knowledge, not increasing input precision             | No repeated re-solving of the same mechanism      |
| Useful returns, 50 min                       | Exported fittings improve familiar routes/towns; revisit a hinted path                        | See and exploit what the railway now does                       | No full-network mandatory collection lap          |
| Original-island approach and closure, 60 min | Use the completed network, reach the existing ending direction, enjoy the result              | Anticipation, arrival, expression and social space              | Friends can leave and revisit without maintenance |

Each large area needs a different dominant question. The [progression brief](../brainstorms/progression.md) suggests traversal, vertical routes and rearranging machinery; it already warns that three linked-gate puzzles would become ritual. Keep that distinction. Within an area, alternate **notice → attempt → understand → improve → enjoy the improvement**. A quiet crossing or interior visit is legitimate play; an empty rack requiring passive attendance is not automatically equivalent.

The [upgrade-economy report](upgrade-economy.md#costs-supply-and-the-eight-hour-rhythm) identifies hundreds of still-unauthored minutes even in a numerically complete forecast. Before accepting this table, observe a complete later area with optional detours omitted, then with curious players. Record named activity, repeated unchanged trips, forced waits, local retry time and post-upgrade useful actions separately. Optional mastery and social conversation may enrich the run but cannot be guaranteed filler in the main-game estimate.

## Numbered recommendations for Boogle

1. **Give every challenge a nearby, loss-free recovery.** Touches [round-4 bug/recovery notes](../plans/round-4-notes.md), [double-jump challenge](../plans/double-jump-challenge.md) and [production-core supply accounting](../plans/production-core.md). A missed move should lead to a dry retry shelf or an ordinary return path; misplaced critical cargo must remain available through the approved counted recovery policy. Start by probing ten deliberate misses/drops, including a helper leaving. Proposed local retry target: at most 10 seconds for the compact test, without repeating completed work or duplicating stock. A splashing accident is only comic if the player promptly wants another attempt.

2. **Replace repeated commuting with a permanent spatial solution.** Touches [round-4 gate-puzzle request](../plans/round-4-notes.md#trains-and-cart) and the [progression brief](../brainstorms/progression.md). Prototype one readable, reversible two-gate mechanism whose completed solution latches a shortcut. Compare it with the same ordinary delivery route and bill. Success means players understand the route change and enjoy using it; a longer completion time is not the goal. This is the first new friction experiment, after the applicable replay/production prerequisites and design approval.

3. **Make helping obvious and optional.** Touches [beam-weight](../plans/beam-weight.md), [round-4 carrying notes](../plans/round-4-notes.md#co-op-and-carrying) and [progression](../brainstorms/progression.md#done-means). Keep each main task solo-completable; allow carrying and opening a path to overlap, then let either player finish after departure. Prefer different helpful actions over both players repeating the same input. Existing beam work is evidence to review, not permission to add another co-carry implementation. First proof: a late friend finds useful work without assigned roles and both can describe what the other changed.

4. **Show the need, then let the upgrade repay it.** Touches [cart-first](../brainstorms/cart-first.md), [upgrade economy](upgrade-economy.md#hunger-supply-and-payback-checks) and [round-4 trains](../plans/round-4-notes.md#trains-and-cart). Preserve the train-cue A/B with unchanged costs before testing earlier unlocks separately. Measure the same meaningful delivery before/after and leave at least two useful downstream uses in the test. Do not increase the next bill immediately to cancel the benefit. A short demo should let a player point to the work the new machine now does, including while the player explores elsewhere.

5. **Put mastery above an approachable main route.** Touches [double-jump challenge](../plans/double-jump-challenge.md), [round-4 abilities](../plans/round-4-notes.md#abilities-and-movement) and [progression's ability-placement question](../brainstorms/progression.md#tensions). Author one optional movement combination with broad landings and a dry return; retain the accepted hook pull. Keep required ability acquisition separate from expert execution and from cosmetic side activities. First proof: one player enjoys practising while their friend continues useful work, with neither blocking the other. Ability relocation remains an owner choice.

6. **Treat timing as an invitation, not a deadline.** Touches [round-4 train-timer notes](../plans/round-4-notes.md#trains-and-cart) and [cart-first delivery continuity](../brainstorms/cart-first.md#shape). Defer a new timed system until the untimed loop works. If tried later, use a recurring optional shortcut or departure flourish with an always-open ordinary route, no exclusive stock and no attendance requirement. Compare against the untimed version; reject it if players wait at the window, blame a slow friend or feel compelled to abandon exploration. Do not revive snatch, stoke or grind as onboard duties.

7. **Use weather for atmosphere before making it a mechanic.** Touches [first evening](../brainstorms/first-evening.md), [sea-crossings](sea-crossings.md) and the [current Look decisions](../decisions.md#look). Keep the first evening cosmetic and routes/signs readable; retain the owner's roughly one-minute first-crossing starting point and inspect repeat rides. No storm damage, tide blockade, nightly resource gate or forced wind handling follows from this research. Functional weather needs a separate direction call and prototype demonstrating value beyond prettier water. Start with a readable destination reveal and dependable seated travel.

8. **Budget eight hours in new decisions and lasting results.** Touches [progression](../brainstorms/progression.md#done-means), [upgrade economy](upgrade-economy.md#costs-supply-and-the-eight-hour-rhythm) and [round-4 replay notes](../plans/round-4-notes.md). Annotate one later area's proposed beats with the choice, skill, help or expression each supports, and the burden its material retires. Time the direct route before claiming a campaign duration. Reject padding through bills, compulsory mastery, calendar waits or maintenance. Evaluate one complete material-to-two-fittings cycle before scaling content across the archipelago.

## Prototype first: one delivery, one gate, one lasting shortcut

**Disposition: bounded experiment proposed; prerequisite first.** This report builds nothing. The [progression brief](../brainstorms/progression.md#shape) already places its first build after production core and replay. Reuse that first gate/material proof rather than starting a competing island project. The current owner/Grant replay remains unverified here; durable production behavior must be checked at implementation time. Follow the new-gameplay brainstorm requirement before implementing the mechanism.

**Owner-facing question:** Did working out the passage make the next delivery feel better?

**What's new:** One switch changes two gates; your completed solution leaves a useful shortcut open.

**[H] Agent setup, initially 5–8 minutes per variant:** use one existing class of carried fitting, a readable receiver, a short ordinary path and a gate chamber on dry ground. A single operator can set the gates, move the object, and latch the route. Nothing closes on a player or consumes cargo on a wrong setting. Both switch effects are visible from the control; wrong settings are reversible. No new ability, weather, fuel, score, random drops, art dependency or two-person-required action.

The first switch setting opens **source → staging bay** and closes **staging bay → receiver**; the second reverses them. A broad foot passage lets a solo carrier set down the fitting safely, return to the switch, then retrieve it from the bay. A friend can operate the switch while the carrier moves. Occupied gateways refuse closure visibly. Accepting the first delivery latches both gates open. This makes the initial task a readable sequence rather than a single button that merely grants a shortcut; the ordinary outside route stays usable with the fitting throughout.

- **A, control:** the direct passage stays unavailable; make the delivery using the ordinary path.
- **B, spatial solution:** the gate puzzle can permanently open the direct passage; the ordinary path remains available throughout.

Keep starting stock, required deliveries, movement, source distance and final reward identical. The manipulated variable is access to a solvable permanent shortcut. Do not also change train timing or grant extra cosmetic rewards. After the first delivery, include two already-required uses of the route so improvement is experienced rather than announced. Counterbalance variant order across fresh pairs when possible; familiar owner feedback is valuable but does not establish blind readability.

**Observe:** first understandable action, wrong-setting recovery, voluntary switch experimentation, extra unchanged trips, whether friends split jobs naturally, and whether anyone waits for the other. Record visible machine/route changes alongside task times. For the later material extension, keep the progression brief's two useful fittings and local-versus-home demonstration comparison as a separate experiment, not an extra variable in this one.

**Agent checks before the owner:** solo completion without the shortcut; solo puzzle completion; helper departure at each stage; late arrival after the latch; misplaced fitting recovery; reload after opening; safe dry returns; conserved cargo. Reuse existing checks under [tests guidance](../agents/tests.md), adding only triggered shared-state contract coverage when implementation exists. Inspect stills and motion before presenting it. Bots establish reachability and state behavior, not comedy, perceived effort or fun.

**Keep if:** players can explain what changed, use the shortcut voluntarily, recover from errors locally and find helpful work without compulsory roles. **Revise or stop if:** both simply operate the switch once without thinking, one waits while the other has all the agency, the repeated delivery remains a chore, or the interesting part is only the reward. If the experiment fails, do not raise costs or add a countdown to force it to matter. Return to the existing material/fitting demonstration or optional movement play, and stop for the owner's verdict.

## Evidence limits and verification

Live primary text was fetched for all nine games through developer testimony or official game descriptions. A Short Hike and Animal Crossing GDC pages supplied abstracts only. Nintendo Insider reproduces Nintendo's News Channel interview; its original on-device publication was not independently opened. The A Short Hike Canadian Game Devs interview returned 404, and the TIME Odyssey interview repeatedly timed out; neither is used as substantive evidence. The official Nintendo Australia page supplied the Odyssey mechanics instead. Primary-source descriptions and design intentions do not prove transfer to Boogle.

This is a documentation audit of the pinned checkout, not a runtime, device or source-code review. No eight-hour build exists in the evidence inspected here. Timing, recovery targets, laughter, solo/co-op balance and the proposed gate's fun remain unverified. No Boogler lines were edited or identified as needing edits. No push or deployment is part of this task.

Verification: Node 26.13.0; Prettier on both changed files with `--ignore-path /dev/null` because the repository normally ignores Markdown; targeted lint reports zero problems; all 34 unique local file/anchor links resolve; 16 unique external source URLs are cited; the proposed activity allowances sum to 480 minutes. No game tests or browser run were needed for this documentation-only change.
