# Why make the next trip?

_Research report, 2 November 2026. Motivation after carrying already feels like building: repeated trips, changing routes and tools, useful automation, anticipation, surprises and visible consequences. Live-source research across fifteen game references, applied to the second-round `?proto=place` playtest. Recommendations are hypotheses for small comparisons, not owner decisions or an implementation plan._

**Evidence markers.** **[V]** means the linked repository file, primary page or developer statement was fetched and read. An interview verifies what its speaker says, not a causal effect on all players. **[S]** means secondary evidence or a search excerpt; the Satisfactory onboarding wiki could not be opened and is labelled accordingly. **[I]** means interpretation, arithmetic or a proposed Boogle experiment. Commercial games were not played for this report; no videos were watched. The incremental-game GDC source is the slide deck, not an observed talk. No new Boogle timing run was made.

## Summary

**[I] The next load needs a consequence the player wants, and the previous load should have improved the conditions of doing it.** Good chopping and physical construction establish the verbs. They do not establish why another fixed invoice is worth paying. The strongest candidate for Boogle is a railway that progressively takes over the long supply journey while leaving the satisfying final carry and construction to the player.

Try **frontier supply first**, on line two, holding costs and carrying capacity fixed. Compare it with today's home fetch. Separately, test whether line one's third station simply repeats too much work after its most impressive bridge has already happened. Do not combine freight, bigger bags, extra loot and cheaper stations in one trial: a better result would reveal little about which problem was solved.

**[I] Working hypotheses:** H1, freight makes prior construction useful; H2, station three overextends an already-understood action; H3, the next consequence is insufficiently legible; H4, a capacity upgrade needs to remove an actual journey; H5, a built shortcut can renew the route; H6, cargo needs a meaningful destination choice; H7, discoveries can make a familiar journey worth inspecting; H8, home works better as a commissioning visit than a recurring collection counter. The numbered recommendations below specify the smallest tests and what would count against each.

## What this playtest establishes

**[V] Two problems, with a successful foundation.** In the latest [playtest entry](../playtests.md), “the stations, second round,” Matias liked chopping, logs accumulating in a frame, the physical track layer and riding it, the forge, and line two's sense of the network paying off. Carrying felt like building. Station three and the last line's carrying dragged; rails from home felt like an errand despite the physical bundle feeling good. The first-line celebration barely registered, town growth had to be sought out, and numbers carried little meaning. The distant island generated interest. The entry explicitly leaves the contradictory answer about continuing unresolved; this is not evidence of either abandonment or reliable retention.

**[V] Binding direction.** [DESIGN.md](../../DESIGN.md) supplies Toys before chores, Telegraph everything, automatic cooperation, optional side activities, and a communal world. The [2 November decision log](../proposals/boogle-2.md) keeps hauling for each segment while the network brings materials closer. It keeps a compact, steady bundle, physical construction, ride-only trains and later movement unlocks. No hazards, decay or compulsory train minigames are needed. A small prompt can guide; the owner disliked the heavy sign. Narrative and opening-day gates remain parked. These constraints rule out repairing repetition with spills, punishment, mandatory side quests or a friend requirement.

### The current costs and seams

**[V] Read from [place's built-game description](../game-design/place.md), [layout.ts](../../src/proto/place/layout.ts), [chop.ts](../../src/proto/place/chop.ts) and [index.ts](../../src/proto/place/index.ts):**

| Work              | Current requirement | Minimum full-capacity loads at 12 pieces | What changes on completion                 |
| ----------------- | ------------------- | ---------------------------------------: | ------------------------------------------ |
| Line 1, station 1 | 24 logs             |                                        2 | Track to the rim                           |
| Line 1, station 2 | 24 logs             |                                        2 | A walkable trestle across the gorge        |
| Line 1, station 3 | 24 logs             |                                        2 | Connection home; timber freight can start  |
| Line 2, station 1 | 8 logs + 4 rails    |                                        1 | First outward stretch                      |
| Line 2, station 2 | 8 logs + 8 rails    |                                        2 | Further track across the gorge             |
| Line 2, station 3 | 4 logs + 8 rails    |                                        1 | Quarry connection; stone freight can start |

**[V/I] These are carrying-capacity lower bounds, not measured trips.** Logs, rails and incoming pickups share `back.room()`. `takeRails()` and `takeTimber()` also restrict pickup to the active station's outstanding requirement. A larger bag alone cannot preload several future stations. Line one's machine starts with rails; the recurring home-rail problem belongs to line two. Raising capacity from 12 to 16 changes line two from four minimum loads to three, but all three 24-log stations on line one still need two loads. Capacity 24 crosses that second breakpoint. These totals exclude walking empty, waiting, harvesting and imperfect loads.

**[V] Earlier scripted measurements in the game-design file** record line one's station work as 22, 19 and 42 seconds, followed by laying sequences of 15, 11 and 6.5 seconds respectively. They are historical scripted runs, not this researcher's timings or novice medians. **[I] Nevertheless, they identify a plausible mismatch: station three asks for the longest work after the biggest visual reveal, then delivers the shortest laying sequence.** Its real payoff is the connection and freight service; if those are missed, the immediate bargain looks worse.

**[V] Automation is partial already.** `make()` produces camp crates only after a whole line opens. `arrive()` loads them at the camp and unloads at home; `feedCrane()` builds the forge, then fills the timber heap. Rails accumulate at the forge rack. The train does not supply an unfinished line's frontier. `rail.ts`'s `buildTrain()` and `trainAt()` assume a complete line and fixed stops; partial-line freight is new work, not a flag to enable. The entire place prototype is **Local**, saved per room under `boogle-place-v2`; it has not established a shared multiplayer economy.

### How this extends the existing research

**[V/I]** [Carrying and logistics play](carrying-and-logistics-play.md) supplies the distinction between enjoyable handling and dead travel. [Compounding infrastructure](compounding-infrastructure.md) supplies the idea that one connection should help build the next. This report tests that proposition at the next load, retaining the newer decision that every segment is hauled. [Maximal rewards](maximal-rewards.md) proposes generous finds and Gift Freight: useful objects can amplify a successful loop, but this playtest needs to distinguish that from compensation for an unchanged errand. Its rates and reward budgets are hypotheses, not accepted tuning.

**[V/I]** [Eight-hour pacing](eight-hour-pacing.md) separates short actions from projects and eras; it must not become a reason to stretch this seven-minute-scale prototype. Its statement that `place` is unbuilt is overtaken by the code and latest playtest. [Progression, feel and exploration](progression-feel-exploration.md) contributes capability changes and unfolding systems; [discovery progression](discovery-progression.md) contributes curiosity and knowledge. Older social gates, mini-game requirements and no-haul alternatives in those reports do not supersede today's decisions. The [find-the-fun plan](../plans/find-the-fun.md) has already tested physical stations and the second line; this research does not complete another gameplay checkbox.

## Findings by game

### Death Stranding: the route is a thing you improve

**[V]** Kojima Productions' [porter tips](https://www.kojimaproductions.jp/en/DSTips) describe early postboxes for equipment, ladders and anchors for difficult ground, online infrastructure after connecting an area, paths forming through repeated travel, and restoring a bike with a generator. These are distinct changes to preparation, access and traversal, rather than just higher payment for an identical walk.

**[I] Mechanism:** the first trip discovers the problem; later trips exercise a solution and make the player's intervention visible. Even before a road eliminates the walk, choosing a route can remain the activity. The next trip becomes attractive when a useful new aid can finally be tried.

**Boogle transfer, hypothesis:** make the completed trestle or freight service materially improve the very next construction run. Preserve the satisfying material delivery into a frame. Carry balance, damage and traversal danger supply much of Death Stranding's tension, but they conflict with Boogle's decisions; copying its burden without its route decisions would miss the mechanism. The station's resemblance to an auto-paver is not sufficient by itself.

### Satisfactory: stop being the belt, then stop commuting for parts

**[S]** The community-maintained [onboarding page](https://satisfactory.wiki.gg/wiki/Onboarding), available here only through search excerpts, lists Portable Miner at HUB upgrade 1, Constructor at 3, belts at 4 and Miner Mk.1 at 5. This supports the early sequence from handling individual materials toward connected production; it does not provide typical completion times.

**[V]** Coffee Stain's [1.0 announcement](https://coffeestain.com/news/satisfactory-1-0-launch/) describes the Dimensional Depot as access to stored items from anywhere, explicitly reducing travel back to base, and describes Project Assembly visibly expanding through its phases. The depot is a later research capability, not evidence that the opening has no logistics.

**[I] Mechanism:** early purchases replace a specific manual subtask with something the player made. Later convenience protects time spent designing and exploring. Boogle's equivalent need not be a global inventory: a frontier rack can preserve place and visible provenance. Automating supply while leaving a walk back to collect every output only moves the bottleneck. Do not import factory ratios or fuel maintenance to justify a service whose purpose is relief.

### Factorio's early hours: learn the work just enough to value its replacement

**[V]** In [Friday Facts #327](https://www.factorio.com/blog/post/fff-327), Wube describes the tutorial problem of players encountering grind before understanding automation. Putting assemblers into the first five minutes also broke the progression. The intended sequence moves from manual mining to automated mining, logistics and production/science, with each advance improving work the player already understands.

**[I] Mechanism:** automation is an intelligible before/after reward. Knowing the manual operation makes its replacement valuable; prolonged obedience is not required. The next job changes from moving each item to arranging a productive relationship.

**Boogle transfer, hypothesis:** the first home visit can teach that timber made a forge and the forge makes rails. By the next extension, freight should take over the known home-to-frontier leg. Keep the frame delivery, placement, machine ride and new destination. Factorio's description is not a universal “three repetitions” rule or a reason to require a fixed number of chores before relief.

### Dorfromantik: repeat the verb, change the placement problem

**[V]** Toukana's [shipped-game description](https://store.steampowered.com/app/1455840/Dorfromantik/) describes placing landscape tiles, fulfilling requests to replenish the tile supply, and unlocking new tiles and biomes. In a [direct developer interview](https://www.gamedeveloper.com/business/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-), Timo Falcke describes the appeal of placement, contextual quests and small animated life within a calm landscape.

**[I] Mechanism:** the same gesture has a new spatial context because earlier placements have changed the board. Finishing one local shape both makes a pleasing whole and supplies the next opportunity. Small requests are readable in the thing being built.

**Boogle transfer, hypothesis:** a load could finish one of two visible useful constructions, making the order personal. Merely changing a station's resource ratio gives another recipe, not Dorfromantik's spatial decision. Its limited tile supply and failure condition are unnecessary here. It also demonstrates that not every repeat needs a new tool: a changing, legible problem can be enough.

### A Short Hike: the errand sits inside a journey you chose

**[V]** Adam Robinson-Yu's [development account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) describes a compact open world arranged around curiosity, detours and the summit's change of perspective. The [official game page](https://www.playstation.com/en-us/games/a-short-hike/) identifies golden feathers as help reaching greater heights and encourages choosing paths and helping encountered characters.

**[I] Mechanism:** an attractive destination gives direction without requiring a prescribed itinerary. Exploration yields capability, and capability makes familiar terrain feel different. A return can become a swift, playful descent rather than a reversed climb.

**Boogle transfer, hypothesis:** show something worth reaching beyond the immediate frame, then let built routes and later movement upgrades change the approach. The far-island response is evidence for curiosity, but the unreachable island cannot justify every intervening delivery indefinitely. A nearby reachable discovery is a smaller test than implementing the island or moving the planned glide unlock into the opening.

### Dave the Diver: preparation has a near-term occasion

**[V]** In a [direct interview](https://www.gamedeveloper.com/design/dave-the-diver), Jaeho Hwang describes replacing an unsatisfying simultaneous restaurant/gathering arrangement with separate diving and restaurant phases. Ingredient requests and VIP encounters introduce new elements inside that loop; the underwater environment varies. The next outing can prepare for a specific service rather than merely enlarge a wallet.

**[V]** His [2026 expansion interview](https://automaton-media.com/en/interviews/dave-the-divers-in-the-jungle-expansion-is-basically-dave-the-diver-1-7-says-director-even-players-who-usually-skip-dlc-should-give-it-a/) is useful counterevidence to “add more novelty.” Hwang describes repetition emerging on replays, routes that accidentally delivered either no encounters or many simultaneous missions, and deliberate control over how often minigames appear. The expansion is a separate iteration, not evidence that all those features existed in the base game's opening.

**[I] Boogle transfer:** give today's cargo a concrete near-term use and show that use. Avoid stacking requests, inserting a compulsory minigame or inventing a calendar deadline. A train bringing one conspicuous useful thing is a better bounded test than a new quest system. Surprise needs room around it.

### Stardew Valley: errands can permanently subtract future work

**[V]** ConcernedApe's [2014 bundle design note](https://www.stardewvalley.net/dev-update-19/) describes encouraging varied activities and permanent changes to the valley. It is prerelease design evidence, not a reliable specification of every shipped rule. In the shipped [1.1 changelog](https://www.stardewvalley.net/stardew-valley-v1-1-changelog/), Junimo Huts harvest nearby crops into a collection point, obelisks provide permanent travel conveniences, and the Return Scepter returns the player to the farm.

**[I] Mechanism:** satisfying a particular request can reduce the future burden of the broader routine. A finite collection also provides several possible near-term targets; it does not have to be one repeated commodity total.

**Boogle transfer, hypothesis:** a home visit should commission a lasting service or visibly finish a chosen object. The payoff must survive the visit. These Stardew conveniences include later progression; they are examples of reward shape, not an opening-hour timetable to copy. Boogle should not inherit season expiry, upkeep or daily obligations to make returns compulsory.

### Animal Crossing: make familiar actions serve personal intentions

**[V]** In [Aya Kyogoku and Hisashi Nogami's interview](https://www.theverge.com/2020/3/20/21188006/animal-crossing-new-horizons-design-interview-aya-kyogoku-hisashi-nogami), Nook Miles are described as helping players discover activities and giving ordinary catches value beyond selling the most expensive specimen. Customization also has a social audience.

**[I] Mechanism:** a familiar outing can advance a self-chosen place or collection, with something to show another person. That is different from a generic resource counter. For Boogle, the question is whether the player can name the thing this load will change. A little visible project choice is worth testing before a broad checklist. Real-world daily schedules, debt and repeated NPC confirmation are not necessary ingredients, and would turn this bounded construction experiment into a different game.

### Astroneer: a railway can replace a logistics role

**[V]** System Era's [Rails Update](https://blog.astroneer.space/p/rails-update/) describes autonomous trains, stations that load and unload cargo, rail connections carrying power and oxygen, and calling a train from a rail post. Infrastructure brings several services into the same route.

**[I] Mechanism:** construction changes what the network can do independently, while new terrain continues to create work at its edge. Watching a known transport job happen without supervision is itself legible progress.

**Boogle transfer, hypothesis:** serve the expanding construction frontier, rather than automate only camp-to-home delivery. This is stronger than increasing the quantity piled at home. Preserve Boogle's timetable and ride-only trains; Astroneer's survival support and summon behavior are references to compare, not decisions to import. A new route controller would be premature before a Local two-stop supply test demonstrates value.

### Pikmin: delegation creates room for the next intention

**[V]** Nintendo's [Pikmin 4 developer interview, chapter 1](https://www.nintendo.com/au/news-and-articles/ask-the-developer-vol-10-pikmin-4-chapter-1/), describes managing creatures across jobs and the pleasure of improving efficiency. [Chapter 2](https://www.nintendo.com/au/news-and-articles/ask-the-developer-vol-10-pikmin-4-chapter-2/) discusses Dandori, accessibility and removing the overall adventure's time limit; that does not mean every time constraint disappeared.

**[I] Mechanism:** once a hauling job has been assigned, attention can go to reconnaissance or another task. The player remains responsible for choosing what happens without personally escorting each item. Repetition can become better coordination rather than faster button pressing.

**Boogle transfer, hypothesis:** show freight already working while the player explores or handles the final bundle. Co-op must add opportunities for parallel play, not be the cure for an unpleasant solo route. Do not add an NPC workforce-management layer just to reproduce delegation; the existing railway is already the candidate worker.

### Mini Motorways: watch a constructed relationship work

**[V]** Dinosaur Polo Club's [Endless & Expert update](https://dinopoloclub.com/2022/11/03/play-mini-motorways-your-way-with-our-new-endless-expert-mode-update/) explicitly offers an Endless mode without game-ending time pressure and adds a way to inspect the city during weekly upgrade selection. Its [support page](https://dinopoloclub.com/support/mini-motorways/) describes Endless progression through efficiency milestones. These are mode-specific claims, not a description of the standard mode's pressure.

**[I] Mechanism:** moving traffic shows whether a connection matters; an upgrade is easier to choose when the actual problem remains visible. The third intervention can improve a network the player now understands rather than start another disconnected assignment.

**Boogle transfer, hypothesis:** let the next cargo choice face its two physical destinations, and let freight make the result obvious. Avoid an abstract menu that hides the world while asking the player to choose capacity or speed. Demand escalation and congestion failure are unnecessary to make visible service satisfying.

### Ratchet & Clank: keep collection expressive, then reduce exhaustive searching

**[V]** Insomniac's contribution to PlayStation's [DualSense developer article](https://blog.playstation.com/2021/05/13/devs-reveal-their-upcoming-dualsense-wireless-controller-implementations/) describes small bolt-collection impulses accompanied by sound. PlayStation's [Rift Apart guide](https://www.playstation.com/en-nz/editorial/what-to-do-after-youve-finished-ratchet-and-clank-rift-apart/) describes stronger weapon variants in Challenge Mode and the Map-O-Matic side-quest reward, which reveals collectibles, with a stated exception for CraiggerBears.

**[I] Mechanism:** immediate sensory collection, useful accumulated capability and reduced search labor are separate layers. A tiny pickup can feel good without being the reason for an entire journey; a major reward can remove a task that has become exhaustive.

**Boogle transfer, hypothesis:** keep automatic, satisfying pickup and give the player a useful consequence to anticipate. Do not ask bolt-like sounds and flying numbers to establish a missing destination. A guaranteed useful find on a changed route can test reward motivation without a rarity economy. Challenge Mode is a later replay structure, not evidence for Boogle's first ten minutes.

### Zelda: Tears of the Kingdom: erase a leg by changing how space works

**[V]** Nintendo's [ability guide](https://play.nintendo.com/news-tips/tips-tricks/tears-of-the-kingdom-tips-tricks/) describes Ultrahand building bridges, boats and vehicles, Ascend passing through ceilings and hillsides to make shortcuts, and Recall recovering a departed raft or riding a falling object's reversed path.

**[I] Mechanism:** the player can solve the travel problem instead of becoming more efficient at enduring its prescribed route. The return need not resemble the outward trip. A reusable solution also becomes a physical reminder of ingenuity.

**Boogle transfer, hypothesis:** one clearly built ramp or side bridge could make the third run a use of earlier construction. This can coexist with freight: one shortens the player's path, the other moves supplies. An arbitrary teleport would save time but would not test the same ownership of a route. Do not expand this test into freeform vehicle construction or a new movement ability before the route itself proves useful.

### Slime Rancher: automate the domestic loop so the next outing can be exploratory

**[V]** Monomi Park's [drone release notes](https://store.steampowered.com/news/posts/?appids=433340&enddate=1533157348) describe assigning a target, source and destination to automate ranch tasks such as feeding and selling plorts. Drones are restricted to ranch expansions, with two per expansion, and need water to keep working. Automation is therefore scoped and maintained, not universal unattended play. Nick Popovich's [GDC session abstract](https://www.gdcvault.com/play/1024296/A-Thousand-Tiny-Tales-Emergent) emphasizes emergent stories from a lively environment; only the abstract was read.

**[I] Mechanism:** removing established home servicing makes space for another exploratory outing, while a lively home still makes returning attractive. Automation need not remove the destination's character.

**Boogle transfer, hypothesis:** let home continue to process freight without an escort and make its result visible when the player happens to return. Watering drones is a reminder that automation can introduce replacement chores; Boogle need not inherit those. A railway that needs repeated dispatch confirmation would fail the intended relief in much the same way.

### Incremental games: a milestone changes the slope, not just the total

**[V]** Anthony Pecorella's GDC Europe 2016 [Quest for Progress slide deck](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf) distinguishes idle production from the player's choices about growth, describes unfolding games, and illustrates milestone multipliers as local victories within escalating costs. It also discusses meaningful purchase alternatives rather than an always-obvious best buy. These are design models, not empirical retention laws.

**[I] Mechanism:** the player anticipates crossing a threshold that changes the rate or type of work. The system visibly works on their behalf between decisions. If every capacity increase is immediately cancelled by proportional costs, the improvement is mostly numerical.

**Boogle transfer, hypothesis:** translate a multiplier into one fewer return journey, a new reachable place or a service that persists. For the present station costs, 12→16 and 12→24 have different consequences; “carry more” is too vague. Preserve a finite project and permission to stop. Infinite escalation, reset prestige and offline obligation would answer a different brief.

## What makes the third repeat better than the first?

**[I] The useful unit is the change between trips, not a fixed repeat count.** A third trip can be welcome without every column changing. Conversely, a new biome texture does little if the player is still making the same empty return for the same uninteresting purpose.

| Change the player can notice             | Reason to begin again                 | Failure that looks similar                         |
| ---------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| A route they improved                    | “I get to use my bridge now.”         | The new bridge is longer or barely more convenient |
| A new tool or meaningful load size       | “This time I can do it in one.”       | Capacity rises but the invoice rises with it       |
| A shorter or eliminated return           | “I can stay out here.”                | A train wait replaces the saved walk               |
| A real cargo/destination choice          | “I want that built first.”            | Two materials are mandatory in one fixed recipe    |
| A discovery on altered terrain           | “I can reach what I spotted.”         | Required loot appears randomly on a cleared path   |
| A visible consequence                    | “That final load starts the service.” | Confetti covers another identical invoice          |
| A self-running job                       | “The railway handles that now.”       | Dispatch, fuel or collection clicks take its place |
| An unfinished but understandable project | “One more load completes this shape.” | Only a counter explains what changed               |

**[I] Anticipation and evidence need to meet.** Before departure, the player should know a concrete consequence, or have a specific curiosity. During travel, they can see a route improvement or enjoy an optional distraction. At delivery, materials visibly complete something. Immediately afterwards, the new capability should be usable. The next destination can then appear. Fireworks alone occupy only one of those moments.

### How games remove or absorb an errand

**[I] These are distinct interventions, with different tests:**

- **Remove the return:** a shortcut, return tool or supplied frontier ends the solved leg. Test time and intent at the next departure.
- **Delegate execution:** assign the job once; the system keeps doing it while the player chooses another activity. Test whether supervision or collection sneaks back in.
- **Fold it into a wanted journey:** collect along the path to somewhere already attractive, or carry something useful home after exploring. The marginal detour matters more than the whole journey's length.
- **Bundle work:** carry one coherent construction kit. Test actual journeys saved, not only capacity on the HUD.
- **Give the return a new purpose:** commission the forge, choose a useful project, see its material transformation. An extra confirmation at home is not a new purpose.
- **Keep the journey as play:** optional discoveries, new movement or a changed route can justify travel. Test whether the player chooses it when the errand is absent; if not, its entertainment value may be overstated.

Merely hiding the resource counter, renaming a fetch as a quest or scattering coins over the same path leaves the underlying obligation intact. Generous rewards remain plausible, particularly given [maximal-rewards.md](maximal-rewards.md), but should earn their own comparison rather than obscure the source of improvement.

### When should the system take over?

**[I] Hypothesis: delegate after the player understands the transformation and has demonstrated the route, before the next identical journey stops presenting a decision.** Evidence of that boundary is behavioral: they can predict the result, no longer inspect the route, and describe the next leg only as going back for more. It is not a prescribed minute or a universal two-trip allowance.

For `place`, preserve **harvest/contact → compact carry → frame fills → machine constructs** where those actions are still pleasurable. Retire **long empty return → fixed-source pickup → same long outbound route** when the railway can do it. The new job should concern an unconnected edge or a chosen improvement. Let the player see the handover: the same recognizable materials arrive over the track they built, then remain ready without supervision. In a later shared implementation, joining friends should inherit the service without repeating a personal unlock; solo costs should already feel good.

**[I] Reward test:** the player should notice relief and immediately exercise freedom it created. If freight removes all activity and leaves waiting for production, it has automated the wrong portion or arrived before another intention exists. If freight arrives but the player still travels home to click “collect,” it has not finished the job. If distance saved is consumed by waiting for the timetable, inspect supply readiness before concluding that delivery is the wrong idea.

## Comparing rail mechanisms in this prototype

**[I] These are alternatives to test, not a request to implement five systems.**

| Mechanism                        | What makes another trip attractive                                                | Smallest honest `place` comparison                                                           | Main risk                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Fetch each load from home        | A meaningful new home event, source recognition, a useful trip in both directions | Existing baseline; observe first forge visit separately from later visits                    | Repeated collection remains an errand after the forge is understood                 |
| Freight to the end of laid track | The last extension reduces the next supply journey                                | One active-station kit supplied from the forge and timber heap; compare line-two station 2/3 | Delivering only rails leaves the timber fetch; waits can also erase the benefit     |
| Choose the cargo's use           | Personal intention: shortcut now or onward connection now                         | One optional nearby construction frame alongside the required frame, both visibly useful     | Fake choice if both are compulsory or one is universally superior                   |
| Carry a bigger load              | A guaranteed saved return, visibly earned                                         | 16-piece capacity after the forge, with station costs unchanged                              | Only one minimum line-two load disappears; line-one station three is unaffected     |
| Use a shortcut you built         | Mastery and ownership of the route; time saved every subsequent use               | One optional ramp from an existing grove onto the new trestle                                | The existing trestle was pleasant but not a highlight; another route may add little |

**[V/I] Practical distinction:** `objective()` already explains counts and source locations. `takeRails()` and `takeTimber()` already know the active recipe. More instructions alone cannot give them a choice of purpose. `finishStretch()` advances stations; that is the natural experiment boundary for changing supply location, unveiling a route or showing what completion enables. [stations.ts](../../src/proto/place/stations.ts) already represents requirements as physical frames, and [pieces.ts](../../src/proto/place/pieces.ts) provides construction animation. These support small authored comparisons without a new production economy.

## How to compare without asking the owner to diagnose the design

**[I] Keep the owner's card to the one new thing and one gut question in each recommendation.** Builders gather the supporting evidence themselves. Use the existing start/skip controls in `index.ts` to reproduce the relevant state, but let the owner experience enough of the before-state to recognize an earned improvement. An isolated station loaded from a developer shortcut cannot establish the feeling of having built its supply chain.

For each variant, record the station, loaded and empty journey counts, time walking/waiting/handling, and whether the promised world change was visible from the player's actual position. Observe whether the player starts another load, explores, rides or simply waits after completion. These are diagnostic notes, not a motivation score. Faster completion alone is not success. A single owner's reaction can choose the next prototype, not prove general retention; use a fresh player or alternate presentation order if novelty and familiarity could explain the result.

Keep costs, movement speed, pickup feel and reward content constant unless they are the variable under test. Builder checks include reload, partial supply, missed trains, mixed logs/rails, completion while away and minimum safe shuttle travel. A visible/feel implementation still needs the existing [`look` workflow](../../.claude/skills/look/SKILL.md) and its artifacts; this research does not claim to have run it. The Local prototype cannot establish co-op scheduling, shared spending or late-join behavior. Those need a separate sync design if a mechanism graduates.

## Numbered recommendations

### 1. Bring routine rail supply to the frontier — try this first

**Hypothesis H1 [I]:** the missing reward is that the railway takes over the solved supply leg. **Principles:** Toys before chores; Telegraph everything. **Smallest change:** after the first line-two stretch, deliver one kit for its next station to a rack beside the last completed track: rails from the existing forge balance and logs from the existing timber heap. Keep the 12-piece cap, recipes and final hand carry unchanged; the 16-piece second station still takes two short loads. Move both ingredients because delivering rails alone would leave a compulsory home visit for timber. The variable is supply location. Use one scripted Local freight arrival with a small cargo trolley; no new production recipe, dispatch menu or general routing system. Keep home pickup available against the same stock so returning is possible, with no duplicated materials.

**Touches:** `finishStretch()`, `takeRails()`, `takeTimber()` and `objective()` in [index.ts](../../src/proto/place/index.ts), rail accounting in [forge.ts](../../src/proto/place/forge.ts), and the cargo/track presentation in [rail.ts](../../src/proto/place/rail.ts). The full-line train cannot simply run on unlaid track. Bound the trolley to completed track, move its endpoint only when stopped, and handle short stretches without borrowing the full train's braking assumptions. Relocated stock without a delivery is an acceptable first cost-only mock, explicitly labelled as such; it does not yet test the pleasure of seeing the network supply it.

**What's new:** “Your new track brings the next construction kit out to you.” **Gut question:** “Did you want to keep building once the materials came to you?” **Why first:** it tests the newer design decision directly, addresses the named home errand and produces a lasting change in work without inflating rewards. It also distinguishes where supplies arrive from how many fit on the player's back.

**Falsification:** the player understands the service, demonstrably makes fewer long trips without added waiting, yet the next load still feels like the same obligation; or the short final carry loses the sense of building. That would weaken frontier supply as the sufficient motivation. Try H3/H6 next rather than adding more throughput. Missing timber, a stock-accounting error or a long trolley wait would invalidate the comparison rather than disprove H1.

### 2. Cut line one's third station to one load as a diagnostic

**Hypothesis H2 [I]:** station three repeats an understood task beyond its useful duration. **Principle:** Toys before chores. **Smallest change:** change only line one's third requirement from 24 to 12 logs in [layout.ts](../../src/proto/place/layout.ts); retain its route, machine sequence and final connection. This is a temporary cost comparison, not a progression upgrade and not a decision to halve every station.

**What's new:** “The last load closes the line home.” **Gut question:** “Did closing the line feel worth that last carry?” **Falsification:** one load still drags, despite the player understanding the connection's consequence. Then duration alone is insufficient. If it feels abruptly unearned, restore the cost and try an earned route or capacity improvement. This test is separate from H1 because line one has no home-rail fetch to automate.

### 3. Promise a concrete capability before asking for its load

**Hypothesis H3 [I]:** a visible, desired consequence motivates more than counts. **Principle:** Telegraph everything. **Smallest change:** at the approach to line-one station three, frame the already-existing waiting timber train and unfinished forge, and use the existing small objective to explain that this connection starts timber deliveries to the forge. At line two, frame the quarry's outgoing stone and the town structure it will actually build. Keep material counts secondary; promise only a result implemented in the variant.

**Touches:** `objective()` and completion/arrival events in [index.ts](../../src/proto/place/index.ts), [forge.ts](../../src/proto/place/forge.ts) and [town.ts](../../src/proto/place/town.ts). Start with the line-one view and one prompt; do not commission a new town system to test the explanation. **What's new:** “You can see what the next connection will start.” **Gut question:** “Was that something you wanted this load to make happen?” **Falsification:** the player can name the consequence beforehand but still has no desire to carry. That separates weak desire from poor explanation; making the sign bigger would not address it.

### 4. Make the first capacity reward cross a real trip threshold

**Hypothesis H4 [I]:** a useful upgrade can turn another run into a demonstration of progress. **Principles:** Toys before chores; Telegraph everything. **Smallest change:** after the forge finishes, visibly fit an improved bundle carrier and raise capacity from 12 to 16 for line two, leaving all costs fixed. Its second station then fits one complete kit. Keep this separate from frontier freight. Change `TUNE.carry`'s use in [chop.ts](../../src/proto/place/chop.ts), the forge-completion handoff in [index.ts](../../src/proto/place/index.ts), and corresponding Local save/restore state; do not accidentally grant it on a fresh run.

**What's new:** “The forge equips you to carry a whole line-two station kit.” **Gut question:** “Did carrying the bigger kit make you keen to do the next station?” **Falsification:** the removed journey is noticed but the run remains an errand, or the larger bundle is unreadable. Raising capacity further without a new threshold is not an answer. This cannot solve line-one station three: its 24-log requirement needs a different test.

### 5. Let construction remove a bend from the next journey

**Hypothesis H5 [I]:** using one's own route improvement renews travel. **Principles:** Toys before chores; Leave something for the next visitor. **Smallest change:** completing the gorge trestle drops one short, solid access ramp from an existing timber grove onto the deck, giving the third-station run a clearly shorter approach. Show it assembling as part of that completion; no separate fee. Compare with the existing trestle route, which the owner liked but did not find exceptional.

**Touches:** grove/trestle positions in [layout.ts](../../src/proto/place/layout.ts), `finishStretch()` in [index.ts](../../src/proto/place/index.ts), solid construction in [rail.ts](../../src/proto/place/rail.ts) and [land.ts](../../src/proto/place/land.ts). Builder verifies reachability and actual travel saved. **What's new:** “The bridge you built opens a shorter timber route.” **Gut question:** “Did using your new shortcut make that next trip feel different?” **Falsification:** it is noticed and used but changes neither enjoyment nor willingness to continue. A subtle seconds-only saving is not evidence against the stronger, visibly changed-route hypothesis.

### 6. Test one genuine cargo choice beside the main route

**Hypothesis H6 [I]:** choosing a useful result gives the next load a personal purpose. **Principles:** Toys before chores; Side activities are never required. **Smallest change:** add one optional 12-log frame for a short viewing/return-path platform near the first grove, alongside the existing onward station. A bundle can go to either; the main line stays at its existing cost, and the optional platform never becomes a prerequisite. The platform must provide a clear view or real convenience, not just a renamed donation counter. This is a separate trial from the free ramp in H5.

**Touches:** a single authored frame using [stations.ts](../../src/proto/place/stations.ts), [pieces.ts](../../src/proto/place/pieces.ts), and target selection/delivery in [index.ts](../../src/proto/place/index.ts). Current acquisition and unloading assume the active station; builders must make that exception explicit. **What's new:** “You can use this load for the next track or a useful little side build.” **Gut question:** “Did you care which thing you built with that load?” **Falsification:** the alternative is ignored after being understood, or feels like extra tax. Do not respond with a larger cargo menu. Wood-versus-rails pickup order within the same compulsory recipe is not this test.

### 7. Put one guaranteed useful discovery on a changed route

**Hypothesis H7 [I]:** curiosity and an earned find can renew a familiar journey without making it longer. **Principles:** Toys before chores; Side activities are never required. **Smallest change:** the new trestle exposes a previously visible, reachable ledge with one permanent find: a small material cache useful to the remaining construction. Put it beside the natural crossing, visibly accessible from it, with automatic pickup. Use one authored find and its existing save pattern, not respawning breadcrumbs or random critical drops. Retain the distant island as a later curiosity without promising access in this short test.

**Touches:** `updateFinds()` and save/restore in [index.ts](../../src/proto/place/index.ts), ledge geometry in [land.ts](../../src/proto/place/land.ts), and the proposed earned-find direction in [maximal-rewards.md](maximal-rewards.md). **What's new:** “Your bridge puts a useful find within reach.” **Gut question:** “Did you want to see what your new route let you reach?” **Falsification:** only the discounted resource cost matters, or the player feels obliged to scour every return path. Compare once with the same material credit granted at the station to distinguish discovery from a cheaper invoice. Keep useful finds generous if they work; rarity is not the experimental variable.

### 8. Make the first homecoming a visible handover, then let home work unattended

**Hypothesis H8 [I]:** returning feels purposeful when it reveals a permanent service and what one's cargo became. **Principles:** Telegraph everything; Leave something for the next visitor. **Smallest change:** frame the existing crane, forge assembly and first rail output from the arrival platform; time a short sound/light response to the actual material transformation. Keep control, allow walking away, and ensure the result remains readable afterwards. Later cargo keeps building without a collection or claim interaction. Test this presentation before adding a new home upgrade or mandatory ceremony.

**Touches:** `arrive()`/`feedCrane()` in [index.ts](../../src/proto/place/index.ts), [forge.ts](../../src/proto/place/forge.ts) and platform sightlines in [rail.ts](../../src/proto/place/rail.ts). **What's new:** “You arrive in time to see your timber become a working forge.” **Gut question:** “Did coming home feel like getting something new?” **Falsification:** the transformation is seen and understood but the next return still lacks purpose. Then keep routine supplies at the frontier and reserve home visits for genuinely changed services or player-chosen projects. More fireworks cannot make repeated collection a new occasion.
