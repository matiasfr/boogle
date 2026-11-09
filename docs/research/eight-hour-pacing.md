# Eight-hour pacing across six eras

> **Verdict:** About eight active hours, first useful connection in 10 to 15 minutes; target is now about six.
> **Top recommendations:** 1. Aim for eight active room-hours, including modest exploring and the ending, excluding scheduling, long breaks. 2. Separate the clocks. 3. Budget twelve required links, six key connections, thirty-six hauled segments, eight camps.
> **Status:** partly adopted. See [The shape of the game](../decisions.md#the-shape-of-the-game).

_Note added 6 November 2026: the owner moved the main-game target to roughly six hours, a rough target rather than a rule, with solo and groups of two or three close together ([decision log](../decisions.md#the-shape-of-the-game)). Read eight-hour figures below as the earlier target._

_Research report, 2 November 2026. Pacing a finite co-op adventure through six eras: first payoff, novelty, places and work, solo versus group speed, evenings, absence and finishing. Live-source research on Big Walk, Grow Home, A Short Hike, Astroneer, Satisfactory, Dyson Sphere Program, Death Stranding, Ratchet & Clank, Super Mario Odyssey, It Takes Two, Tchia, LEGO games, Cozy Grove and Slime Rancher. Applies to the [2 November audit picks](../decisions.md#the-audit-picks-2-november) and [find-the-fun plan](../plans/find-the-fun.md). Recommendations and falsifiable budgets, not new owner decisions or claims about a built campaign._

**Markers, following [sea-crossings.md](sea-crossings.md).** **[V]** means the linked primary page, developer statement, document or repository code was fetched/read and supports the claim. A verified developer estimate is still an estimate. **[S]** means a guide, review, forum, search summary or otherwise unverified primary attribution; fetching a review does not turn its timing into population telemetry. **[I]** means our inference, arithmetic or proposed Boogle target. No commercial game was played or video footage watched for this report; walkthrough numbers are uploader chapter labels, not observed novice play. Achievement percentages are the pages returned on this research date, potentially cached, not a longitudinal cohort.

This report adds a **time and content budget** to [compounding-infrastructure.md](compounding-infrastructure.md), [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md), [friend-group-return.md](friend-group-return.md), [progression-feel-exploration.md](progression-feel-exploration.md) and [finding-the-fun.md](finding-the-fun.md). Those cover infrastructure's value, endings, return motivation, progression and prototype practice. Their older eight-era, multi-evening-per-era and attendance-gate suggestions are not carried forward.

## Summary

1. **[I] Aim for eight active room-hours**, including modest exploring and the ending, excluding scheduling, long breaks, completionism and the later toy box. Start with a two-person reference run; permit faster groups and a somewhat longer solo run.
2. **[V/I] Separate the clocks.** Slime Rancher's developer describes a roughly two-minute core loop; Odyssey's reported short-session goal is twenty minutes; major locations can last much longer. A new view, a completed link and a new control are different events.
3. **[I] Budget twelve required links, six key connections, thirty-six hauled segments, eight camps, three growing towns and one static port.** Six eras should not mean six copies of the same escalating invoice or six entirely new control schemes.
4. **[I] Use an uneven curve:** 45, 75, 90, 100, 90 and 60 minutes of era play, then a 20-minute optional wind-down. Put the first useful connection around minute 12 and steam around minute 45.
5. **[I] Treat hours three to five as the repetition risk.** Revisit a changed place with a new movement ability around 3:30, then solve a different geographical problem. The exact slump hour is a hypothesis, not a published law.
6. **[V/I] Completion rates do not count friend groups.** Public achievements and developer statements show that endings are missed, but cannot establish which friends stopped together, why, or after how many evenings. Measure those directly in Boogle.
7. **[I] Six 90-minute appointments can contain eight hours of play** if each loses ten minutes to joining and catching up. Let people stop inside eras and miss an evening without a personal grind to rejoin.
8. **[I] End on the ring closure, then let people linger.** Leave completionist links and toy play outside the finish condition. First validate opening, middle and final slices; only then spend eight hours testing the whole curve.

## What the repository actually establishes

**[V] Binding direction.** [DESIGN.md](../../DESIGN.md) says toys before chores, optional side activities, automatic cooperation, solo progress and persistent shared changes. The [audit picks](../decisions.md#the-audit-picks-2-november) select wood; steam; iron and harbour; diesel and concrete; electric; future. A key connection ends each era. Preset links allow order choices; the final Home–port link closes a ring. Each segment still needs hauling, while the network brings stock closer. Camps can supply multiple goods. There are no hazards or decay; offline production banks one project and waits for players. Opening days, the mayor's gating role, som and knacks remain parked. Double jump and glide come later; their placement below is proposed.

**[V] The loop is still being proved.** The proposal records that train deliveries visibly growing the town worked for the owner, while two haul rounds gave no clear answer. The next agreed test is Threefold Reach: a hub, gorge, two destinations, walking to a camp before connecting it, a roughly 12 m/s wood train and no rewards in the first round. `?proto=place` is a proposed test, not an implementation found in this checkout. See [the decision log](../decisions.md#trains-and-the-world) and [find-the-fun.md](../plans/find-the-fun.md). An eight-hour spreadsheet cannot rescue that unresolved first loop.

**[V] The old cost ladder is not an implemented six-era campaign.** [src/sim/route.ts](../../src/sim/route.ts) defines seven costs, `60, 180, 550, 1600, 5000, 15000, 45000`, but its three route sections all use age zero. [The depot prototype](../../src/proto/net/depot.ts) supplies three eight-log crates per interaction: 24 logs, a whole section. Its local heaps and [four prototype stages](../../src/proto/net/stages.ts) do not validate campaign persistence, six-era pacing or a shipping economy. Keep the distinction when replacing the ladder.

## Findings by source

### 1. Short adventures: connections, detours and a legible destination

**Grow Home — [V].** Designer Andrew Willans describes a 2,000-metre destination, growth through connections to energy rocks, and a change from repetitive climbing toward riding the growing shoot. Islands provide horizontal exploration between ascents; a daisy parachute and leaf glider alter traversal. A pollen collection/spending economy was removed because it imposed work on the pleasure of growing. These are unusually close precedents for replacing bills with connections and terrain. They do not establish a universal unlock interval. [Willans's design deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-the-plant-growing-mechanics-of-ubisoft-s-i-grow-home-i-).

**[S] Duration boundary:** Destructoid estimates **three to four hours**, with longer collectible hunting. That puts Grow Home near the lower edge of the requested range, rather than proving an eight-hour structure. [Review](https://www.destructoid.com/reviews/review-grow-home/). **[I] Transfer:** a new way of using the route can carry an act; adding a zero to the same harvest cannot supply that change.

**A Short Hike — [V].** Adam Robinson-Yu describes shaping a small open world around curiosity, landmarks and worthwhile wandering; small activities interrupt the climb without replacing its goal. The mountain makes progress intelligible even when players choose different routes. [Developer account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/). **[S]** Players in the game's itch community report roughly **one to two hours** and one-sitting finishes; those are anecdotes, not a median. [Length discussion](https://itch.io/t/647766/how-long-is-the-game). **[I] Transfer:** use this as a compactness and stopping-point precedent, not a four-to-twelve-hour comparator. Let the port explain the whole journey while the nearest camp explains the next ten minutes.

**Big Walk — [V].** House House/Panic's launch release gives **10–15 hours to the first ending**. The official FAQ describes **2–12 players**, a **2-, 3- or 4+-player world configuration** chosen per session, and recommends choosing the minimum attendance expected during that session. It explicitly expects the same group over multiple sessions; the host keeps the save and everyone disconnects when that host stops. It is not solo-compatible. [Launch release](https://www.gamedeveloper.com/press-release/it-s-time-for-a-big-walk-out-now-on-pc-mac-ps5-and-nintendo-switch-2), [official FAQ](https://bigwalk.game/faq/). **[I] Transfer:** borrow sustained shared discovery, but Boogle's solo-first rule rules out attendance-sized locks. Ten to fifteen hours is an upper comparison, not evidence that eight hours needs a similar number of puzzles. No verified first-tool timestamp or same-crew completion rate was found.

### 2. Factory openings: many capabilities before a distant ending

**Astroneer — [V].** The mission update explicitly guides exploration and discovery with rewards including bytes, schematics and items. The later _Awakening_ story chain requires **Composite Perfection, Final Entry and Training Complete**; it must not be confused with the original gateway progression or assumed to be an eight-hour campaign. [Mission update](https://blog.astroneer.space/p/the-mission-compass-and-power-update-patch-notes/), [Awakening update](https://blog.astroneer.space/p/awakening/). **[I] Transfer:** a useful unlock can both resolve today's limitation and expose tomorrow's place. Borrow that sequence, not a research tree's full size. These sources give neither median time to a shuttle nor minutes between missions.

**Satisfactory — [S, community documentation].** The onboarding has **six HUB upgrades**, followed by tiers with choices of milestones. The early sequence introduces portable extraction, smelting, construction, belts and more sustained extraction/power. This is a succession of changes in what the player can assemble, not merely six more expensive receipts. The wiki's **2–6 minute freighter cooldowns are cooldowns**, not measured milestone-completion times. [Tutorial](https://satisfactory.wiki.gg/wiki/Tutorial), [tiers](https://satisfactory.wiki.gg/wiki/Tiers). **[V]** Coffee Stain's 1.0 account describes the Dimensional Depot reducing storage trips and Project Assembly visibly developing. [Developer release](https://coffeestain.com/news/satisfactory-1-0-launch/). **[I] Transfer:** give Boogle's growing town a clear capability change while keeping every segment embodied. Do not import factory production waits to manufacture eight hours.

**Dyson Sphere Program — [S].** A contemporary first-hour guide targets **blue science within about an hour**, through initial extraction, power, processing and automation. This is a guide author's achievable route, not a novice population measurement, and predates later updates. [February 2021 guide](https://entertainment-focus.com/2021/02/25/dyson-sphere-program-guide-1-what-you-should-be-doing-in-your-first-hour/). **[V]** Steam separately records establishing an interstellar logistics line as an achievement, evidence that expansion has a distinct transport milestone, not a timestamp for reaching it. [Shipped achievement definitions](https://steamcommunity.com/stats/1366540/achievements/). **[I] Transfer:** let an early network visibly run by itself before asking for a bigger connection. Study these games' first hours; neither source establishes that their complete campaigns fit four to twelve hours.

### 3. Places and tools: how often something really changes

**Death Stranding's opening — [V].** Kojima Productions identifies Episode 2 as the Eastern Region, **Order 6** as the postbox introduction and **Order 14** as the first mandatory end-to-end delivery. A depleted trike encountered there becomes useful with a generator; ladders, anchors and previously connected rest stops change route planning. [Developer's Eastern Region guide](https://www.kojimaproductions.jp/en/DSTips). **[I] Transfer:** the earlier journey teaches why infrastructure matters; the return should demonstrate that benefit. Mission numbers are not minutes. No sufficiently grounded novice time to the first powered bike was found, so this report does not prescribe several hours of slow hauling before Boogle becomes enjoyable. Boogle also excludes this precedent's damage, danger and maintenance.

**Ratchet & Clank: Rift Apart — [V/S].** Insomniac's preview describes planets and traversal capabilities such as rifts and movement tools. [Developer blog](https://blog.playstation.com/2021/05/18/welcome-to-zurkon-jr-s-almost-launch-party-for-ratchet-clank-rift-apart/). Push Square lists **nine planets** and estimates **10 hours** for the main path, **12** with more exploration and **15** for completionism; planets can be revisited. [Planet guide](https://www.pushsquare.com/guides/ratchet-and-clank-rift-apart-how-many-planets-are-there), [duration guide](https://www.pushsquare.com/guides/ratchet-and-clank-rift-apart-how-long-does-it-take-to-beat). **[I]** `600 / 9 ≈ 67 minutes` is a content-budget ratio, not measured dwell time on each planet. It supports roughly hour-sized destinations with internal variation, not a mandatory new biome every quarter-hour.

**Super Mario Odyssey — [S].** A report of Koizumi's AMA says a **twenty-minute session** should yield accomplishment without requiring a whole kingdom. The relevant answer was not recoverable in the fetched AMA, so the attribution stays secondary. [AMA report](https://www.player.one/super-mario-odyssey-e3-2017-reddit-ama-producer-94265). A search-returned chapter list for Encrypted Duck's full run labels Cascade **10:20**, Sand **20:48**, Metro **2:43:11**, Snow **3:36:55**, Bowser's **5:46:41**, Moon **6:51:40** and credits **7:24:24**. The hosting page was inconsistently retrievable; treat these as provisional uploader metadata. [Walkthrough listing](https://steamcommunity.com/sharedfiles/filedetails/?id=2727153374).

**[I] Arithmetic on that one run:** Cascade occupies **10:28**, Metro **53:44**, and Bowser's **64:59** between listed transitions. The variation is the useful observation; seven-and-a-half hours is not the game's median. Temporary captures can change an encounter while the underlying movement vocabulary persists. Boogle can likewise change the geometry and purpose of a connection without adding a permanent button every time. Do not make six eras six equal eighty-minute boxes.

**It Takes Two — [V].** Josef Fares estimated **14–15 hours** and **25 minigames** before release. That is outside the main comparison range; use it as an upper bound on authored variety. He describes mechanics specific to different situations in the Xbox interview, not a rule that a new tool must arrive every fixed number of minutes. [Direct interview](https://gamingbolt.com/it-takes-two-interview-with-josef-fares-you-have-never-played-anything-like-it), [Xbox transcript](https://news.xbox.com/en-us/podcast/735-josef-fares-it-takes-two/).

**[S] A first-chapter walkthrough's metadata** marks the vacuum boss at **28:34**, The Depths at **31:20**, two minigames at **39:46** and **42:07**, and the toolbox boss at **50:44**. These are elapsed times in one uploaded run, not timings watched here or averages for beginners. They at least distinguish a substantial first payoff inside half an hour from further changes within the same first hour. [TrophyGamers-attributed walkthrough mirror and chapter list](https://rutube.ru/video/250406059a62eba13279765a008790f4/). **[I] Transfer:** sequence introduction, experiment, payoff and release within a place. Twenty-five bespoke minigames are not a feasible Boogle requirement, and optional toys cannot become gates.

**Tchia — [V/S].** The developer's opening-hours guide covers a slingshot, ukulele, soul jumping, trinkets/pearls and a camera. Soul jumping gives different uses for creatures and objects within one central capability; this is not evidence of five successive permanent-verb unlocks. [Developer guide](https://blog.playstation.com/2023/03/20/five-tchia-features-to-become-the-ultimate-adventurer/). GameSpot estimates **10–12 hours** with casual exploration versus **15–20** for everything, warning that complete collection can become tedious. [Duration guide](https://www.gamespot.com/articles/how-long-is-tchia/1100-6512044/). **[I] Transfer:** separate the main destination from exhaustive sightseeing, and let familiar controls acquire new uses in new terrain. Do not price the ending around the completionist route.

### 4. LEGO, Cozy Grove and Slime Rancher: stopping and repetition

**LEGO games — [V].** The shipped _LEGO Star Wars: The Complete Saga_ manual specifies **six episodes × six levels = 36 levels**. After the opening level, episodes can progress in parallel. Story completion opens Free Play for abilities and secrets; a second player can leave while the first continues, with one shared save total. [Manual, printed pages 9–11](https://cdn.akamai.steamstatic.com/steam/apps/32440/manuals/EN.pdf?t=1455204418). **[S, firsthand review]** For a shorter modern co-op comparison, GamesRadar's _LEGO Voyagers_ reviewer and partner finished in **roughly four to five hours over two sessions**, playing locally. That is one observed pair's report, not an average or evidence about online groups. [Review](https://www.gamesradar.com/games/puzzle/lego-voyagers-review/). **[I] Transfer:** retain small self-contained accomplishments and a clear post-story invitation. Do not interpret 36 LEGO levels as 36 Boogle links: at eight hours that would allow only **13⅓ minutes per link**, including everything else. Thirty-six smaller construction segments is a different budget.

**Cozy Grove — [V].** Its storefront explicitly distinguishes **30–60 minutes of new quests each day** from fishing, crafting and decorating after those quests, within a **40+ hour campaign across months**. [Developer storefront](https://store.steampowered.com/app/1458100/Cozy_Grove/). **[I] Transfer:** a satisfying session can finish its main task and leave room to linger. Reject the real-world daily content gate for Boogle: an eight-hour adventure should remain finishable on the friends' schedule. Daily content allowance, actual session length and total completion time are three different measures.

**Slime Rancher — [V, direct developer statements in a stream write-up].** Nick Popovich describes a roughly **two-minute core loop** and says the team first made vacuuming, corralling and sorting feel good, testing that foundation as a small whole game. His “90 percent” description is a design heuristic, not instrumented time-use data. [Developer stream account](https://www.gamedeveloper.com/design/-i-slime-rancher-i-dev-shares-tips-for-making-the-most-of-the-prototyping-stage). **[I] Transfer:** recurring verbs are compatible with novelty; the objects, arrangements and consequences change around them. If carrying one load is dull, a novel town every hour cannot repair the intervening minutes. No verified first-upgrade median was found. The GDC slide PDFs were discovered but exceeded the fetch limit; no unexamined slide claims are used here.

## What can be said about friends actually finishing

### Completion evidence and its limits

| Evidence returned on 2 November 2026                                                                                                        |                                                                       Number | What it establishes; what it does not                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------- |
| **[V]** [Grow Home Steam achievements](https://steamcommunity.com/stats/323320/achievements/)                                               |  First night **58.4%**; mission complete **34.7%**; all star seeds **13.8%** | Distinct early, ending and completionist achievements; not that 65.3% quit from boredom.                                        |
| **[V]** [A Short Hike Steam achievements](https://steamcommunity.com/stats/1055540/achievements/)                                           |           Summit **66.0%**; “The End” nap **54.6%**; every feather **15.8%** | Even the definition of “finished” changes the number; optional cleanup is a smaller audience.                                   |
| **[V]** [It Takes Two Steam achievements](https://steamcommunity.com/stats/1426210/achievements/)                                           |                                                      “It Took Two” **30.9%** | An endpoint achievement for this platform population; not a rate for intact friend pairs, all platforms or Friend's Pass users. |
| **[V]** [Fares interview about A Way Out](https://www.theringer.com/2021/04/22/video-games/josef-fares-it-takes-two-interview-co-op-gaming) |                                           Developer reports **51%** finished | A first-party claim without a disclosed cohort/date/platform breakdown; **not It Takes Two's completion rate**.                 |
| **[V]** [Astroneer Steam achievements](https://steamcommunity.com/stats/361420/achievements/)                                               | Join or host multiplayer **54.2%**; over four hours in multiplayer **45.4%** | Some sustained multiplayer exposure; not four uninterrupted hours, the same crew, or a story finish.                            |

**[I] No causal league table.** Ownership/launch eligibility, achievement introduction dates, versions, subscriptions, offline play and guest handling differ. These percentages cannot prove that short games finish better, that novelty causes retention, or that Boogle should target 51%. Do not divide multiplayer accounts by two to invent a count of finished pairs. No reliable public dataset found here follows the same friend groups across these games with attendance, reasons for stopping and nights to completion.

**[V] A useful dropout anecdote:** in the [Xbox interview transcript](https://news.xbox.com/en-us/podcast/735-josef-fares-it-takes-two/), the hosts say they enjoyed _A Way Out_ but did not finish after the prison section because other life and games intervened. They initially mistook how much remained. This is evidence that enjoyment alone does not settle scheduling or communicate remaining scope, not an estimate of how common that is.

**[V] Catch-up precedents are concrete.** [EA's It Takes Two FAQ](https://www.ea.com/games/it-takes-two/it-takes-two/faq) describes checkpoint/chapter access when joining a friend's saved session and carrying Friend's Pass progress forward. LEGO's shared profile lets one player leave without stopping progress. Big Walk explicitly lets a session choose a lower minimum player count. **[I] Boogle's version should grant access to the shared era and its necessary movement capabilities, show what changed and let the returning player contribute at the current frontier.** They need not repeat personal unlock work. Preserve persistent authorship; do not turn another player's absence into a veto on progress.

### Evenings are arithmetic, not observed retention

**[I] Assumption:** 480 minutes of play, plus **10 minutes per appointment** for joining, recapping and choosing a next destination. No source above measures that overhead; replace it with playtest observations.

| Scheduled evening | Useful play | Calculation       | Evenings to finish |
| ----------------- | ----------: | ----------------- | -----------------: |
| 60 minutes        |  50 minutes | `ceil(480 / 50)`  |             **10** |
| 90 minutes        |  80 minutes | `ceil(480 / 80)`  |              **6** |
| 120 minutes       | 110 minutes | `ceil(480 / 110)` |              **5** |

With no overhead, those become **8, 6 and 4**. Thus “four two-hour nights” uses every minute of every appointment. Six 90-minute nights is a more forgiving starting brief; it is not a forced cadence or six era-sized sessions. At 80-minute play intervals, stops fall around **1:20, 2:40, 4:00, 5:20, 6:40 and 8:00**, often inside an era. Provide a stable stopping point every **20–30 minutes**, using saved segment progress and an intelligible next destination, not an extra ceremony.

If a friend misses night three, the next evening should need roughly **three minutes to orient**, not eighty minutes to grind back to parity. That is a test target. Others may continue; no minimum attendance or elapsed-calendar lock. The one-project offline bank can make the next start welcoming, but it must not silently finish a chain of key connections. Do not add rested-work currencies from the older return report to solve an access problem.

## Deriving Boogle's curve

### Four clocks, with room to breathe

**[I] These are provisional targets, not empirical universal intervals:**

| Rhythm                   | Starting target                                                          | What counts                                                        | What does not require new content                                       |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Embodied loop            | A satisfying action/result within **1–3 minutes**                        | A load moves, a piece extends, a train visibly takes goods         | Repeating a good action in a different arrangement                      |
| Local discovery          | Something worth noticing around every **10–15 minutes** of directed play | A view opens, goods change a town, a camp changes the route choice | Seeing a familiar bridge from below or an old place from a faster train |
| Project / stopping point | A stable accomplishment every **20–30 minutes**                          | A few segments, a supplied frontier, a discovered alternative      | Partial link progress; an era need not end                              |
| Major progression        | First useful link **10–15 minutes**; era keys **45–100 minutes** apart   | A new reach or a consequential connection                          | A new permanent verb is not required at each key                        |

Ten-minute discovery over eight hours suggests roughly 48 opportunities to notice something, **not 48 new locations or assets**. Events overlap: arrival can also reveal a camp and demonstrate a new train. Allow quiet stretches after a payoff. A constant maximal-intensity graph would erase the contrast that makes a long crossing or bustling town feel large. The owner's maximal-reward direction remains open; reward density can sit on this structure after the bare loop works, rather than becoming the timer that keeps it moving.

**[V/I] A useful research method:** _PaceMaker_ represents routes as a graph and lets designers annotate pacing categories; its reported expert evaluation concerns the tool's usefulness, not proof of an optimal curve. [Geheeb, Dyrda and Geheeb, CoG paper](https://arxiv.org/abs/2408.15001). Borrow a simple route ledger: minutes spent discovering, deciding, moving, hauling, waiting and enjoying results. Label actual branches, not just an ideal linear route. No editor or new engine architecture is needed for this experiment.

### Replacing the tripling cost curve

**[I, arithmetic on verified code]** Using only the first six entries of [AGES](../../src/sim/route.ts), total cost is **22,390**; the sixth is **250 times** the first and consumes **67.0%** of the total. The last two consume **89.3%**. With constant throughput, an eight-hour budget would spend about **5 hours 22 minutes on the sixth bill alone**. If throughput triples too, the elapsed bill can remain flat, but that does not create a new place or problem. This is a diagnosis of the table, not the existing three-section route's actual duration.

Replace an era-wide material multiplier with a small authored list of connections. Each has a destination, useful consequence, alternate order and terrain problem. Price its actual few segments; do not attach a global multiplier to the era label. Keep hauling for every segment, with nearby supply shortening old travel. A bigger span can use larger-looking pieces without increasing the number of identical hand movements in proportion to its metres.

| Era                 | New problem with familiar actions                                      | Visible capability/payoff                                                  | Avoid                                                    |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| Wood                | Walk out to two nearby destinations and choose the first useful camp   | First delivery changes Home; a ride shows the built route                  | A tutorial hour before the first working train           |
| Steam               | Extend from a supplied frontier toward the first sea crossing          | Steam and a nearer depot make the earlier distance feel smaller            | Re-fetching every load from Home                         |
| Iron and harbour    | Choose which shore approach supplies a second growing town             | Harbour reach, a different silhouette and the first view back over the sea | A new ore that merely renames the same bill              |
| Diesel and concrete | Connect across a gorge/height change and through a familiar district   | Larger structures; glide reveals another angle on known work               | Another untouched island with exactly the same route     |
| Electric            | Join previously separate branches into a useful through-route          | Bullet train, wires and a visibly shorter trip across the old world        | Track maintenance or routing quotas                      |
| Future              | Finish the approach and close Home–port using established capabilities | The long-visible destination becomes reachable; the whole ring runs        | A final material spike or new mandatory control tutorial |

These are level briefs, not added hazards, route-management systems or exact authored maps. The first far island still requires building the rail over water. The glider must not bypass that prerequisite; use local terrain and the distances already required by the world brief, not invisible attendance or skill gates. Trains remain ride-only. Hub-only fast travel remains intact.

### The middle and the ending

**[I] Predicted slump: hours 3–5**, when players may have seen several harvest–haul–connect repetitions but the port remains distant. Diagnose it by behaviour: automatic runs with no decisions, requests for the next unlock to hurry up, optional sightseeing no longer taken, or friends asking how much is left. A quiet conversation during an enjoyable ride is not itself a slump.

At **3:30**, propose glide and an immediate use overlooking an already-built route. Follow with a different connection problem and a visible Home change. Keep one 15–20 minute stretch that lets people enjoy competence before teaching another complication. If the middle still feels repetitive, remove a redundant project or change its geography; do not hide it behind more upgrades or enlarge the bill. Test a seeded middle slice against a slice with identical geography before commissioning its art.

The ending needs a shorter runway: enter the future era around **6:40**, reach the final key around **7:40**, and leave **up to twenty minutes** for an optional inaugural ride, looking back and choosing to stop. The connection itself ends the era; the ride is not another gate. State that the ring is complete immediately. Allow later visitors to ride it and encounter the aftermath without reopening a material requirement or needing the original roster. The specific story, ceremony and jokes remain parked with the owner. The toy box can continue indefinitely, outside the campaign's eight-hour estimate.

## Proposed counts and hour-by-hour plan

**Everything in this section is [I].** This is an intentionally small authoring budget for testing, not a commitment to build all six eras. Counts describe one main route; alternatives can change order without demanding that every optional branch be completed.

| Unit                  |                  Eight-hour budget | Counting rule                                                                                                                                           |
| --------------------- | ---------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required links        |                             **12** | Two consequential links per era: one enabling link and one era-ending key; includes the final Home–port closure                                         |
| Optional cross-links  |                        **Up to 3** | Outside the required twelve and the 480-minute reference path; never a completion gate                                                                  |
| Construction segments |                    **36 required** | Start with three per link / six per era; each still hauled; length and appearance can differ                                                            |
| Major regions         |                              **6** | Home, four island regions and the static port; revisits mean a region is not always introduced at an era boundary                                       |
| Settlements           |                              **4** | Three growing towns, including Home, plus the already-built port                                                                                        |
| Growing-town changes  |                              **6** | Home three times, town B twice, town D once; not six complete skins for every town                                                                      |
| Resource camps        |                              **8** | Allocated by era **2, 1, 2, 1, 2, 0**; several goods can come from one camp                                                                             |
| Named places          |                             **18** | Six regional anchors, eight camps, four optional overlooks/toy spots; towns occupy anchors and are not counted twice                                    |
| Core action families  | **4 + 2 later movement abilities** | Harvest, haul, lay/commission, ride; later double jump and glide. Ordinary walking/jumping and optional toys are not six additional progression systems |

Three segments per link is a starting authoring simplification, not a promise that every connection has identical length. First and last links should feel different even with the same count. Four optional spots are invitations on the route; their discovery may fit casual exploration, but completing activities there is never budgeted as required work.

**Topology check:** named places are not necessarily separate rail endpoints. Fourteen distinct anchors/camps would need thirteen edges just to connect, and fourteen to include a ring. To fit twelve links, at least two pairs must share a station/service catchment, or some camps must sit along a link rather than require separate projects. Walk between nearby places from that shared stop. If the greybox cannot make this readable, rebudget the links explicitly; do not hide extra required projects in the count.

| Active room time | Era and intended feel                                              | New completed links / cumulative | New camps / cumulative | Places, town progress and abilities                                                                                                                |
| ---------------- | ------------------------------------------------------------------ | -------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0:00–1:00**    | Wood to **0:45**, then steam; understand, try, see the consequence | **2 / 2**, around 0:12 and 0:45  | **2 / 2**              | Home and nearby camps; first Home change with delivered goods. Propose double jump at 0:45, with a nearby use; see the port from the opening area. |
| **1:00–2:00**    | Steam; venture out with confidence                                 | **2 / 4**, around 1:20 and 2:00  | **1 / 3**              | Reach island A by newly built rail; depot reduces the known walk; Home's second change. Steam key at 2:00.                                         |
| **2:00–3:00**    | Iron and harbour; choose a shore approach                          | **1 / 5**, around 2:35           | **1 / 4**              | Island B and the second growing town; discover its first supply option. Establish a view back to Home.                                             |
| **3:00–4:00**    | Iron key at **3:30**, then diesel; change perspective              | **1 / 6**, around 3:30           | **1 / 5**              | Second camp for town B; first town B change; propose glide at 3:30 and use it over familiar terrain. Enjoy the new reach before another lesson.    |
| **4:00–5:00**    | Diesel and concrete; build through a place with history            | **1 / 7**, around 4:05           | **1 / 6**              | Island C/gorge, plus a revisit of Home for its third change; alternate route choice changes the approach, not the material multiplier.             |
| **5:00–6:00**    | Diesel key at **5:10**, then electric; connect the pieces          | **2 / 9**, around 5:10 and 5:50  | **1 / 7**              | Island D and third growing town; first town D change; overhead wires and bullet train make an old journey feel new.                                |
| **6:00–7:00**    | Electric key at **6:40**, then future; see the finish              | **1 / 10**, around 6:40          | **1 / 8**              | Last camp, town B's second change, through-route demonstrated. Make the remaining two links legible; no new permanent verb.                        |
| **7:00–8:00**    | Future key at **7:40**, then optional wind-down                    | **2 / 12**, around 7:10 and 7:40 | **0 / 8**              | Port approach and Home–port closure. Clear completion, optional ring ride and lingering through 8:00; toy box thereafter.                          |

The six keys fall at **0:45, 2:00, 3:30, 5:10, 6:40 and 7:40**. Era durations are **45 / 75 / 90 / 100 / 90 / 60 minutes**; adding the 20-minute wind-down gives **480**. These are targets for a reference route, not clocks that fire unlocks. Connection completion still causes progression. If a crew finishes early, let it finish.

## A small pure-function model, checkable by hand

**[I] Purpose:** expose what must be true for the budget to work. This is a paper model, not runtime pacing code, production balancing or a proposal to slow efficient players down.

For era `e` and `n` active contributors, with `n` from one to six and all minute inputs nonnegative:

```text
effectiveWorkers(n) = min(3, 1 + 0.5 * (n - 1))
uncoveredWait(e)    = max(0, supplyLeadMinutes(e) - usefulOverlapMinutes(e))
minutes(e, n)      = fixedMinutes(e) + soloWorkMinutes(e) / effectiveWorkers(n)
                     + uncoveredWait(e)
campaignMinutes(n) = sum(minutes(e, n))
```

`fixedMinutes` is shared critical-path activity: discovering, deciding, traversing and experiencing consequences. It is **not enforced waiting**. `soloWorkMinutes` is the portion of harvesting/hauling/placement that friends can divide. The efficiency formula assumes imperfect parallel work and diminishing returns; it is not measured, and it is not a player-count cost multiplier. Six spectators are not six contributors. Sequential route prerequisites can make actual efficiency lower. The baseline sets uncovered waiting to zero by overlapping supply with useful exploration, not by double-counting that exploration.

| Era                         | Fixed minutes `F` | Solo divisible work `W` |   Solo `F + W` | Pair `F + W/1.5` | Four `F + W/2.5` |  Six `F + W/3` |
| --------------------------- | ----------------: | ----------------------: | -------------: | ---------------: | ---------------: | -------------: |
| Wood                        |                35 |                      15 |             50 |           **45** |               41 |             40 |
| Steam                       |                65 |                      15 |             80 |           **75** |               71 |             70 |
| Iron and harbour            |                70 |                      30 |            100 |           **90** |               82 |             80 |
| Diesel and concrete         |                80 |                      30 |            110 |          **100** |               92 |             90 |
| Electric                    |                80 |                      15 |             95 |           **90** |               86 |             85 |
| Future + optional wind-down |                70 |                      15 |             85 |           **80** |               76 |             75 |
| **Total**                   |           **400** |                 **120** | **520 (8:40)** |   **480 (8:00)** |   **448 (7:28)** | **440 (7:20)** |

The last fixed cell includes **20 minutes after the final connection**. Remove those minutes for time-to-key: the pair's finish is **460 minutes**. For a hand check, diesel with two contributors is `80 + 30 / 1.5 = 100`. The six-era sum is `400 + 120 / 1.5 = 480`. Solo work per six-segment era is **2.5, 2.5, 5, 5, 2.5, 2.5 minutes per segment**. These include the full divisible task, not a five-minute animation or hold-to-build timer. Later supply must visibly shorten the work again.

Make the large fixed assumption inspectable too:

| Fixed activity budget            |   Wood |  Steam |   Iron | Diesel | Electric | Future |   Total |
| -------------------------------- | -----: | -----: | -----: | -----: | -------: | -----: | ------: |
| Discover places / explore nearby |     15 |     25 |     30 |     30 |       30 |     20 | **150** |
| Orient / choose an approach      |      5 |     10 |     10 |     15 |       15 |     10 |  **65** |
| Shared traversal / rides         |     10 |     15 |     15 |     20 |       20 |     10 |  **90** |
| Experience results / casual play |      5 |     15 |     15 |     15 |       15 |     10 |  **75** |
| Optional wind-down               |      0 |      0 |      0 |      0 |        0 |     20 |  **20** |
| **Total**                        | **35** | **65** | **70** | **80** |   **80** | **70** | **400** |

These categories are mutually exclusive elapsed time on the route, not a sum of each player's activity. Never count a conversation, ride and supply overlap three times. The **400 minutes of interesting shared activity is the hardest assumption**, and eighteen named places may not sustain it. Friends can parallelize scouting, skip detours or decide quickly. If a group removes a quarter of `F`, the pair's model becomes **380 minutes (6:20)**. Accept a shorter good game or add a genuinely different place/problem after testing; do not fill those hundred minutes with materials.

Other sensitivity checks:

| Change to baseline                              | Hand calculation  | Pair result / implication                                                 |
| ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| Five uncovered supply-wait minutes in every era | `480 + 6 * 5`     | **510 minutes**; thirty minutes of delay is not thirty minutes of content |
| No useful work parallelism                      | `400 + 120 / 1`   | **520 minutes**; check narrow work fronts before assuming friends help    |
| Perfect four-way work division                  | `400 + 120 / 4`   | **430 minutes**; still not a two-hour campaign if fixed activity is real  |
| Double only the divisible work                  | `400 + 240 / 1.5` | **560 minutes**; more hauling adds 80 minutes without a new place         |
| Skip the postlude                               | `480 - 20`        | **460 minutes**; finishing does not depend on choosing to linger          |

At [crossing prototype defaults](../../src/proto/crossing/tuning.ts), `1200 m / 20 m/s = 60 s` of ideal cruise, before acceleration and stops; the wood-place brief instead proposes about 12 m/s. Ninety travel minutes cannot be justified by a handful of cinematic one-minute crossings. Record walking, platform waits, boarding and repeated journeys separately. A train missed repeatedly is uncovered waiting, not discovery. Preserve the owner's accepted long-crossing direction while testing the repeated journey as well as its first reveal.

## Numbered recommendations and the smallest test for each

All recommendations below are **[I]**, serve **Toys before chores**, **Cooperation is automatic**, **Side activities are never required** and the solo/persistence principles in [DESIGN.md](../../DESIGN.md), and remain proposals until accepted.

1. **Prove a useful connection and visible town payoff within 10–15 minutes.** Apply to Threefold Reach in [decisions.md](../decisions.md#trains-and-the-world) and [find-the-fun.md](../plans/find-the-fun.md), using the existing [net town](../../src/proto/net/town.ts) as evidence of the consequence. **Smallest test:** one fresh solo player, one camp, one short link and one town change, without extra rewards; time the first self-directed connection and ask them to point to what it enabled. If the action is dull, stop here rather than authoring era two.

2. **Use twelve required links and thirty-six segments as the first content ceiling.** Apply to the preset-link/ring decision in [decisions.md](../decisions.md#the-audit-picks-2-november); cap camps at eight and settlements at three growing towns plus the port. **Smallest test:** lay out twelve cards with destination, consequence and alternative order; remove any whose only distinction is a bigger bill. Then greybox one pair of competing approaches before expanding the map.

3. **Replace the tripling era bill with bounded work on different geographical problems.** Apply to the eventual successor to [AGES](../../src/sim/route.ts), informed by [depot.ts](../../src/proto/net/depot.ts); do not silently retune the legacy testbed as if it were the campaign. **Smallest test:** compare two three-segment routes with equal load counts but different approach/height/supply geometry; see whether the second creates a new choice while every segment still gets hauled.

4. **Separate frequent discoveries from rare permanent verbs.** Apply to the later double-jump/glide decisions in [decisions.md](../decisions.md) and the movement description in [player.md](../game-design/player.md). Start with four core action families and propose movement unlocks at 0:45 and 3:30. **Smallest test:** a twenty-minute route using one familiar action, one new view and one immediate use of an unlock; check that a player notices novelty without needing another control explanation.

5. **Break the predicted middle slump with a changed familiar place around 3:30.** Apply to the home redesign and town-growth brief in [decisions.md](../decisions.md#trains-and-the-world), not a new resource ladder. **Smallest test:** seed the same player into two twenty-minute middle slices, one repeating the approach and one using glide plus a changed town view; compare repeated travel and whether they can describe a different problem. Alternate order with the next tester.

6. **Keep costs fixed across attendance and measure what friends can actually divide.** Apply to [the net/depot prototype](../../src/proto/net/depot.ts) and the [solo-first plan](../plans/find-the-fun.md); treat the pure function above as a falsifiable forecast. **Smallest test:** run the same short route solo and with two active contributors, recording task and elapsed minutes; add four and six only after the first comparison works. Do not normalize times by raising the group's bill.

7. **Budget repeated travel and waiting independently from exploration.** Apply to [crossing tuning](../../src/proto/crossing/tuning.ts), [net timetable](../../src/proto/net/timetable.ts) and the wood-train place brief. **Smallest test:** ride a route out and back three times, deliberately missing one departure; log walking, platform waiting and ride time, and check whether the second and third journeys still earn their length.

8. **Support 20–30 minute stopping points inside eras and six ordinary friend evenings.** Apply to the key-connection and eight-hour decisions in [decisions.md](../decisions.md), without imposing session timers. **Smallest test:** stop partway through a link, reload the same world and resume next day; verify saved work, a clear next destination and no repeated setup burden. Use the six-night arithmetic as a planning aid, not a lock.

9. **Let a missing friend return to shared capabilities in about three minutes.** Apply to [DESIGN.md](../../DESIGN.md)'s drop-in/persistence rules and the [one-project offline bank decision](../decisions.md#the-audit-picks-2-november). **Smallest test:** one player misses a key connection; on return they can identify the change, reach the crew and help without re-earning movement access. Separately leave the world overnight and confirm it banks only the allowed project, not another completed era.

10. **End at the final Home–port connection and leave the next twenty minutes optional.** Apply to the finite-game, static-metropolis and ring decisions in [decisions.md](../decisions.md); story specifics remain parked. **Smallest test:** seed the last two links, complete them with an optional branch unfinished and one friend absent; verify the ending is clear, the world remains playable, and the late friend can experience the finished route without rebuilding it.

11. **Validate first, middle and final slices before commissioning an eight-hour campaign.** Apply to [find-the-fun.md](../plans/find-the-fun.md), reusing [prototype counters](../../src/proto/count.ts) and [trace recording](../../src/proto/trace/record.ts) where useful. **Smallest test:** after those slices pass solo, run one real pair through six scheduled evenings, allowing a missed evening, and record active time, keys reached, attendance, return-to-frontier time and voluntary stopping reasons in [playtests.md](../playtests.md). Report that crew's outcome without calling it a completion rate; follow with more crews before making a retention claim. Short seeded tests cannot establish the full eight-hour rhythm.
