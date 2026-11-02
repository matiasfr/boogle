# Research: Big Walk and a home island that keeps unfolding

_Research report, 1 November 2026. Live web research and a read of Boogle at `dfa157b`. Covers the shape, pacing, traversal and production of a larger home island, with Big Walk as the lead reference. Builds on [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) and [level-design.md](level-design.md); their communication, ending, landmark and archipelago arguments are not repeated here. Recommendations are proposals for a greybox, not approved changes to the game._

**Verification:** **[V, primary]** means a fetched developer-authored source, official material or developer transcript; **[V, interview]** means direct developer testimony mediated by a publication; **[V, secondary]** means a fetched review or commercial guide; **[V, fan]** means a fetched community source, not independently confirmed in play. **[S]** means only a search excerpt or talk abstract was available. **[I]** marks synthesis, calculations and proposed Boogle targets. The games were not played for this report; no video is claimed as watched. Repository facts were checked in the files linked below.

**Working answer [I]:** test roughly **60,000 m² of dry land, 2.6× today's home**, folded around a ridge and inlet. Keep the familiar hub compact, add three connected walking loops, and put a short railway across the terrain those loops go around. Progress should make familiar places easier to reach and newly playable. Trees can make a place beautiful; they cannot supply the reasons to travel through it.

**Later owner decision (1 November, after this report was briefed):** home gets a full ground-up redesign, not an extension ("everything in the new island should be more intentionally designed"). Read "protect spawn, court and garden", "2.6× today's home" and any other reference to today's layout as sizes and relationships to test, not as things to keep. The Big Walk findings, the rail calculations and the path structure carry over.

## 1. The Boogle constraints that change the answer

| Verified baseline                                                                                                                                                                                                                                                                                      | Consequence for this research                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home has about **23,300 m² of dry land** after the larger version felt empty and its lighthouse remote. The terrain grid is **510 × 510 m**, with 409 × 409 samples and 1.25 m cells. [Island documentation](../game-design/island.md), [playtests](../playtests.md), [grid](../../src/world/grid.ts). | Measure dry land separately from the simulation square. More land fits inside the existing grid; increasing grid resolution is not the first step. The area is the documented estimate, not a new measurement. |
| Walking is **5.6 m/s**, sprinting **9.5 m/s**. [Controller](../../src/physics/physics.ts).                                                                                                                                                                                                             | Judge everyday trips against sprinting as well as walking. A view that lasts ten walking seconds passes in six sprinting seconds.                                                                              |
| Default wagon cruise is **3 m/s**, with 3 s acceleration and 6 s dwell; the fast prototype uses **6.5 m/s**, with 2 s acceleration. [Timetable](../../src/sim/wagon.ts), [wagon prototype](../../src/proto/wagon/index.ts).                                                                            | Neither cruise speed beats sprinting along a parallel path. Useful riding needs a shorter route, a worthwhile ascent, a speed change, or a combination. Waiting can erase the advantage.                       |
| The November 1 decision parks the layout lab, rejects the lighthouse-line and keeps level work greybox until activities and locales are clearer. Double jump and glide unlock later; driving remains conditional after the soapbox's next test. [Boogle 2 decisions](../proposals/boogle-2.md).        | This report proposes a new experiment. It does not reinstate the rejected line, approve the soapbox, or move advanced abilities into the starting kit.                                                         |
| Rails start in the wood age; trains are ride-only and timetabled; only hub stations offer fast travel. Home remains the smaller, denser part of an eventual archipelago. [Boogle 2](../proposals/boogle-2.md).                                                                                         | Home's line needs a local purpose before inter-island service exists. Avoid turning every scenic stop into a teleport or making home absorb the whole game's scale.                                            |

The main principles served are [DESIGN.md](../../DESIGN.md) **1, Toys before chores; 2, Physics toys first; 8, Designed for drop-in, drop-out; and 9, Leave something for the next visitor**. Traversal must also respect **3, Farming is never required**, and **10, Slapstick over precision**. Infrastructure should improve an already enjoyable place; building, farming or assembling a party must not become prerequisites for basic exploration.

## 2. Big Walk: authored geography that feels discovered

### 2.1 What House House actually says

**Start with a coherent landscape, then reshape it [V, primary].** In House House's August AMA, Jake Strasser describes starting with a lidar heightmap of Wilsons Promontory, sculpting and accentuating its landforms, and gathering reference on research trips. Native plants and granite belong to the same place. This is evidence for a researched geographic foundation followed by deliberate editing, not evidence that the finished exploration routes were generated automatically. [House House AMA, developer replies](https://www.reddit.com/r/gaming/comments/1vkoru0/were_house_house_we_made_untitled_goose_game_and/).

**Natural-looking does not mean uncomposed [V, interview].** ABC describes a loose 1:20 recreation, with Strasser placing rocks over six years. Kalonica Quigley made roughly 80–100 native plants; placement followed Victoria's Ecological Vegetation Classes. The environmental divisions include salt marsh, wet eucalyptus and dry eucalyptus, rather than unrelated fantasy biomes. Stuart Gillespie-Cook says paths should make players feel like “the first person who's ever walked along there,” guided without conspicuous hiking trails. [ABC, 18 August 2026](https://www.abc.net.au/news/2026-08-18/the-big-walk-video-game-untitled-goose-game/107045696).

**For Boogle [I]:** borrow relationships: exposed rocks on a windy ridge, sheltered trees in a hollow, a clearing where people can gather, and a convincing passage between them. Copying vegetation density or scattering rocks over enlarged terrain would miss the work that makes those relationships legible. A path can be a gap between boulders or a sequence of flat shelves; it need not be a painted road. Give it enough continuity that discovery feels intentional after the fact.

### 2.2 How the route unfolds, according to hands-on coverage

**[V, secondary]** GameSpot's review describes an initial group of four puzzles in a contained landscape of woods, hills and beach, followed by access to virtually the whole island. It describes mountain switchbacks, distant structures drawing attention, mountaintops used to choose the next destination, conspicuous coloured constructions against the landscape, and shortcuts easy to miss. Its account supports a small introduction followed by open selection and repeated changes of viewpoint; it does not establish exact path lengths or a universal switchback formula. The review also reports puzzle adjustments for different group sizes, which is not evidence that the island itself changes size. [GameSpot, Mark Delaney](https://www.gamespot.com/reviews/big-walk-is-one-of-the-best-co-op-games-ever/).

**Spatial interpretation [I]:** a switchback has three jobs. It makes a climb traversable; it turns the camera toward different parts of the island; and it lets a previously distant place reappear from a new height. The rewarding fold is a route that eventually reveals its relation to a place already visited. A zigzag with no new view, interaction or return connection merely adds distance.

Use an alternating sequence: **close passage → partial glimpse → local choice → open overlook → descent into a different room**. The far destination can disappear behind a shoulder of land while a nearer clue takes over. At the overlook, show where the player came from and at least one reachable next place. This is an application of the evidence, not a documented House House recipe.

### 2.3 Gates and transport change the same ground

The detailed unlock sequences below come from guides, with lower confidence than the developer material. Their useful contribution is the different kinds of connection they describe; exact tower orders, coordinates and transit timings are not needed for Boogle's design.

| Reported Big Walk example                                                                               | Evidence and limit                                                                                                                                                                                                                                             | Spatial lesson [I]                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A drawbridge opens the wider route; the cliff path beyond reaches a shortcut back to the starting area. | [AllThingsHow map guide](https://allthings.how/big-walk-how-to-get-the-map/) **[V, secondary guide]**. The guide also describes a later map-room unlock. This exact return route was not independently played.                                                 | A gate should lead into a loop. Discovering that the expedition ends beside home makes the island understandable without making the outward trip feel small. |
| The map room provides a model and a portable map after the Red Tower sequence.                          | Same guide **[V, secondary]**.                                                                                                                                                                                                                                 | A navigation reward changes what players understand, even when their movement speed and reachable terrain stay the same.                                     |
| Green Tower activates a chairlift; Yellow Tower opens connecting tunnels.                               | [Big Walk Tips transport guide](https://bigwalktips.com/fast-travel) **[V, fan]**; [Dexerto](https://www.dexerto.com/wikis/big-walk/how-to-unlock-the-train/) independently mentions the chairlift as a quicker approach to the Blue Tower **[V, secondary]**. | A lift removes ascent; a tunnel removes a surface detour. Both make old destinations newly convenient without erasing the paths first used to find them.     |
| Blue Tower's key starts the trains, which circle the island slowly.                                     | [Dexerto train guide](https://www.dexerto.com/wikis/big-walk/how-to-unlock-the-train/) **[V, secondary]**, corroborated in broad form by the fan guide.                                                                                                        | A sightseeing ride and an efficient commute are different benefits. Boogle needs to test both rather than assuming the existence of rails supplies either.   |

There is no strong evidence here that Big Walk's main progression is a sequence of permanent avatar movement upgrades like a double jump and glider. The sourced examples primarily unlock **connections, transport and navigation**. Translate that distinction into Boogle's plan: some eras improve the route network; others change what a player can do on its edges.

### 2.4 Group pacing, pleasure and friction

**[V, primary]** The official press kit frames Big Walk as a hand-crafted open-world adventure for **2–12 players** with time for unhurried exploration. That range establishes its social scale, not a suitable trail width or density for Boogle. [House House press kit](https://bigwalk.game/presskit/).

**[V, fan anecdote]** In the developer AMA, a player describes five people waiting at a station for two lost friends for three to five minutes, enjoying the pause and group photos. This is one person's report, not a measured average or a pacing target. [AMA discussion](https://www.reddit.com/r/gaming/comments/1vkoru0/were_house_house_we_made_untitled_goose_game_and/). **[S, secondary]** Steam Deck HQ's review excerpt instead criticises slow regrouping and travel, terrain snags and uneven activity density; the full page timed out during retrieval. It is a useful counter-signal, with reduced evidential weight. [Steam Deck HQ review](https://steamdeckhq.com/game-reviews/steam-deck/big-walk/).

**For Boogle [I]:** accommodate separation without requiring it. Let a group split around a rock formation, see each other across a hollow, and rejoin at a clearing. Put side discoveries on short loops so a curious player does not routinely make everyone reverse course. A station should provide room to play while waiting, but a playful platform does not excuse an unusable timetable. Boogle must remain pleasant solo, unlike Big Walk's minimum-two-player premise.

No developer source found here publishes Big Walk's traversable area, encounter spacing, trail widths or a measured optimum group separation. Claims that its map is a particular number of square kilometres should not become Boogle's sizing evidence.

## 3. Other games: different ways to make familiar ground unfold

These comparisons concentrate on connectivity and repeated traversal, extending the earlier level-design report rather than repeating its landmark rules. Each application is **[I]**.

### A Short Hike: climbing builds potential; gliding spends it

**[V, primary]** Adam Robinson-Yu describes shaping exploration even for players heading opposite the obvious destination, and the summit as a pause that offers a changed view of the world. [Developer article, PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/). **[V, secondary]** Golden feathers extend climbing and aerial capability; gliding is available early, rather than being the final reward. [Nintendo World Report review](https://www.nintendoworldreport.com/review/54668/a-short-hike-switch-review).

**Application:** design the ascent and descent together. A high stop is valuable when it starts a glide, a downhill toy run or a drop into a previously glimpsed cove. The same footprint supports a slow outward investigation and a fast, expressive return. Boogle's later glider can reinterpret shelves that players first reached on foot; it should not be needed to enjoy the initial loop.

### Lil Gator Game: the return to the centre has a purpose

**[V, primary]** The official store description connects climbing and gliding with distinct groups in the mountains, forest and Creaklands, and recruiting friends to the central playground. [Official Steam listing](https://store.steampowered.com/app/1586800/Lil_Gator_Game/). The _In the Dark_ expansion places a new cave adventure below the island and introduces additional movement toys; that is DLC, not evidence that the original game continually generates new terrain. [Playtonic release article](https://www.playtonicgames.com/news/lil-gator-game-in-the-dark-out-now/).

**Application:** an excursion should feed a place players recognise. A new plaything, visible building contribution or changed gathering place gives the homeward shortcut meaning. A lower cave layer can make known ground feel deeper, but Boogle should first earn its surface area before adding another environment to populate.

### Tunic: a short connection can be a large discovery

**[V, primary transcript]** Andrew Shouldice explains how the fixed isometric view hides paths, including a sewer entrance; players' surprise survives even though the designer already knows the route. [Xbox Wire developer interview](https://news.xbox.com/en-us/podcast/shredders-and-tunic/).

**Application:** a route can be physically short but mentally distant until its entrance is understood. Reveal the back of a familiar wall from the far side, then let a ladder or gate collapse the detour. Boogle has a movable camera: do not depend on Tunic's precise screen occlusion. Use actual terrain, vegetation and elevation, and make the opening readable when approached from the revealing direction. Conceal destinations, not arbitrary collision gaps.

### Link's Awakening: equipment rewrites remembered boundaries

**[V, primary]** Nintendo's description explicitly connects equipment to further exploration: Roc's Feather crosses pits, the Hookshot reaches across gaps, bombs break obstacles and Pegasus Boots change movement. It also describes the raft's rapids route. [Nintendo's Link's Awakening page](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/The-Legend-of-Zelda-Link-s-Awakening-1514327.html).

**Application:** a compact island gains depth when players recognise an old obstacle as newly passable. Put a clear, specific promise in the early view: the opposite bank, an upper shelf or an opening on the far side. Later access should expose a connection or activity, not merely another pickup behind a symbol. Import the readable relationships, without importing combat gates or making Boogle's basic exploration depend on chores.

### Super Mario Odyssey: local movement makes local terrain matter

**[V, primary]** Nintendo's capture guide describes the Wooded Kingdom's stretching Uproot, high-launch gliding with Glydon, and other creatures that reveal or cross otherwise awkward terrain. [Nintendo capture guide](https://www.nintendo.com/en-gb/News/2017/November/10-awesome-things-to-Capture-in-Super-Mario-Odyssey-1314655.html).

**Application:** not every new traversal experience requires a global ability. A place-bound lift, bounce toy or ride can make one vertical pocket special. Layer a ground route, a middle shelf and an upper return over the same area; let each expose the others. Design the surface around what is enjoyable to do there, then give that activity an environmental identity.

### Sable: openness works when its travel mode and scope agree

**[V, interview]** Shedworks describes an early prototype built around a vehicle and a distant landmark, then a largely stable climbing/gliding/driving kit. Independent locations made scope cuts possible. The designers committed to a minimum climbing capability; adding sprint late altered how players read an early jump. They also warn against compensating for uncertainty by making the world bigger. [Game Developer interview](https://www.gamedeveloper.com/design/using-a-lemon-shaped-structure-to-create-the-sanguine-open-world-of-i-sable-i-).

**Application:** broad, quiet approaches can contrast with dense ruins, but only when crossing them feels good. Sable is a useful contrast to compact home, not a density benchmark. Freeze Boogle's movement assumptions for each greybox comparison. If the future vehicle is still unproven, it cannot justify empty land today. Make outer pockets removable without breaking the core loop.

### Outer Wilds: obscurity is not automatically curiosity

**[V, primary]** Mobius describes replacing ambiguous forks with clearer destinations and guidance. Small planetary horizons and caves sometimes hid too much, producing arbitrary wandering. Brittle Hollow's changing routes needed intentional connections and tests as parts disappeared. [Mobius, The Intentionality of Wandering](https://www.mobiusdigitalgames.com/news/the-intentionality-of-wandering).

**Application:** occlusion needs a promise. Before a path turns out of sight, show an opening, a piece of the destination or another reason to follow it. Let learning the place reveal more efficient routes. A dense maze of equally plausible gaps is not the same as a compact world rich in discoveries. Boogle's gates should simplify the return once the outward mystery is understood.

### Animal Crossing: New Horizons: access first, convenience later, authorship last

**[V, secondary on an official site]** Nintendo hosts a GameWith guide explaining the vaulting pole, bridges and ladder, including placing a bridge where crossings are frequent. It is an official-hosted practical guide, not a developer postmortem. [Nintendo/GameWith island guide](https://www.nintendo.com/jp/ichikara/acbaa/02_en.html). **[V, fan]** Nookipedia documents the later Island Designer permits for changing cliffs and waterways. [Island Designer](https://nookipedia.com/wiki/Island_Designer).

**Application:** distinguish unlocking a bank or plateau from removing the friction of reaching it. A ladder gives access; an incline or bridge makes repeated trips straightforward; terrain editing changes the connections themselves. Boogle can use the first two without restoring the player terraforming removed in [DESIGN.md](../../DESIGN.md). Shared fixed infrastructure also avoids making a late joiner personally unlock every route again.

### Journey: compression and release can be a movement reward

**[V, primary, mirrored]** Art director Matt Nava's anniversary thread describes carefully adjusted ramps and gullies for sand surfing and the canyon's architectural framing. [Developer thread mirror](https://threadreaderapp.com/thread/1503152781795889152.html). This is an art-development recollection, not a measured route specification.

**Application:** a close approach followed by a broad downhill view can feel expansive on little land. Make the camera's reveal coincide with a change in movement, not just the arrival of a decorative object. Journey's directed journey is not a reusable home layout; put that sequence on a loop so Boogle players can choose to repeat it.

### Death Stranding: infrastructure changes effort and reliability

**[V, primary]** Kojima Productions' guide describes choosing routes and using ladders, ropes and ziplines; a longer gentle path can beat a short difficult one. [Official beginner guide](https://kojimaproductions.jp/index.php/en/death-stranding-directors-cut-beginners-guide). **[V, interview]** Kojima discusses crests revealing the continuing route and equipment opening options. His description of worn paths is about repeated traffic, not the separate highway-building system. [Famitsu interview in English](https://www.famitsu.com/news/201911/02185866.html). **[S, secondary]** TIME's review describes rebuilding highways; its retrieved excerpt supports the broad example, not detailed engineering rules. [TIME review](https://time.com/5716354/death-stranding-review/).

**Application:** a road can make a route dependable for vehicles and cargo as well as faster. For Boogle, the relevant payoff is seeing a troublesome crossing become a useful shared connection. Keep the old path as an enjoyable alternative. Do not manufacture utility by making ordinary walking exhausting or burdensome.

## 4. Effective size: what each traversal unlock changes

**[I]** Treat the island as places connected by routes. Area is only one measure. An unlock can increase **reachable area**, reduce **travel time**, lower **effort**, or change **what the player understands**. These can move in opposite directions: a glider makes the world faster to cross while adding more interesting routes to consider.

| Unlock                         | Change to known ground                                                    | Layout condition that makes it worthwhile                                                     | Risk to test                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Ladder or rope                 | Connects vertically adjacent places; a one-way drop gains a return.       | The upper landing is already visible; the shortcut meets a familiar path.                     | Narrow interaction funnels separate friends; a mandatory precision climb conflicts with Boogle's feel. |
| Bridge or raised walkway       | Replaces a shoreline detour and supports toys or loads crossing together. | Opposite banks contain recurring destinations, with an enjoyable longer path still available. | A bridge across an irrelevant stream adds spectacle but no useful connection.                          |
| Opened gate or tunnel          | Collapses a long route around a ridge without changing movement speed.    | Entrance and exit both face legible destinations; players recognise the connection.           | Featureless dark corridors trade one dull journey for another.                                         |
| Double jump                    | Reopens shelves and forgiving gaps close to existing paths.               | Safe landing pockets offer short optional loops.                                              | Every route becomes a precision platforming test, or the upgrade bypasses all intended folds.          |
| Glider                         | Adds directed downhill connections from high places.                      | High launch points have visible, broad landing zones; ascent remains worthwhile.              | An overpowered glide flattens the island into one universal shortcut.                                  |
| Boat                           | Turns water from a boundary into a route between coves.                   | Several beaches have reasons to disembark; boarding overhead is lower than the saved walk.    | A boat trip around a tiny point loses to swimming or running.                                          |
| Railway or lift                | Offers a predictable, shared ride across a gap or up a slope.             | Stations are close to recurring activity, with useful frequency and a distinct view.          | Waiting and the walk to the platform consume the saving.                                               |
| Vehicle and road               | Makes longer ground trips comfortable and carrying playful.               | Curves, clearances and grades suit proven handling; a road removes a real obstacle.           | The unproven vehicle becomes an excuse to expand prematurely.                                          |
| Map, vista or learned shortcut | Changes route choice without changing physical capability.                | A new view explains the relation between places already visited.                              | Directions reveal everything before there is anything to discover.                                     |

**A concrete glider check [I].** The [movement prototype](../../src/proto/moves/index.ts) targets a 4 m/s gliding descent. From 35 m up, a steady descent would last about 8.75 s: about **49 m horizontally at walking speed, 83 m at sprint speed**. These are estimates assuming constant horizontal speed; the initial jump, easing, collisions and landing elevation change the actual envelope. Measure it in the greybox. A 35–45 m ridge can support several short glide connections without implying flight across the whole island.

## 5. A railway that earns a ride on one island

### 5.1 Concrete rail precedents

| Example                          | Sourced observation                                                                                                                                                                                                                                                                                                                                                                                   | Boogle application [I]                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Big Walk**                     | The guides above distinguish useful cross-terrain transport from a slow scenic train. **[V, secondary/fan]**                                                                                                                                                                                                                                                                                          | Give the home line both a functional leg and scenery that reads from a moving carriage. Do not use a scenic precedent as proof of commuter utility.                                                          |
| **Zelda: Spirit Tracks**         | Developers discuss incremental restoration of tracks and the clear routes, switches and timing situations that trains create. [Nintendo, Iwata Asks](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/3-Play-That-s-Only-Possible-on-a-Train/3-Play-That-s-Only-Possible-on-a-Train-226909.html) **[V, primary]**. | An unfinished branch visibly promises a destination; completing it changes the network. Borrow legibility, not driving or train combat: Boogle's trains are ride-only.                                       |
| **Minecraft minecarts**          | Official documentation distinguishes easy downhill motion from the need for propulsion uphill, including powered rails. [Minecraft, Taking Inventory: Minecart](https://www.minecraft.net/en-us/article/taking-inventory--minecart) **[V, primary]**.                                                                                                                                                 | The most valuable station may be at the top of the fun downhill. A ride can restore the height spent on a glide or toy run.                                                                                  |
| **Uncharted 2's train sequence** | Richard Lemarchand's GDC postmortem slides list contrasting valley, lake, tunnel, cliff and bridge portions in the train sequence's planning. [GDC 2010 slides](https://media.gdcvault.com/gdc10/slides/Lemarchand_Richard_Uncharted2_Postmortem_PLEASE-TURN-ON-COMMENTS-LAYER.pdf) **[V, primary slides; talk not watched]**.                                                                        | Compose a changing view: near rock, a brief enclosure, then an open crossing and distant reveal. Borrow the sequence of spaces without adding combat or making a home commute cinematic and uninterruptible. |

### 5.2 Put the railway across the walking problem

**[I]** A suitable first leg is **hub meadow → gorge crossing → ridge saddle/top of a descent**. The footpath climbs around the shoulder and visits two worthwhile pockets. The railway takes a much shorter chord, through a cutting or tunnel and over a bridge. The upper station serves a toy clearing, a view of later islands and the beginning of a forgiving descent. Later, a coastal branch can connect the cove and harbour when those destinations have activities.

This layout supplies three reasons to ride: avoid a repeated climb, cross the island efficiently, and see the valley from an otherwise unavailable angle. A perimeter railway alongside a flat path supplies mostly the third. A line ending at an isolated lighthouse supplies little recurring traffic unless the lighthouse itself has a repeatable activity; that was not demonstrated by the rejected layout.

Place the hub platform roughly **30 m or less from the gathering place** as a starting test. Group the final approach and exit within the journey budget. Separate **construction sections** from **passenger stops**: the current [wagon timetable](../../src/sim/wagon.ts) stops at every section boundary, so a longer route assembled from short sections would accumulate dwell and acceleration delays. Useful future service needs explicit station spacing, not a station at every piece of track.

### 5.3 Include the wait in every comparison

**[I, calculation]** For one journey:

```text
foot time = foot-route length / walking or sprint speed
rail time = access + expected wait + rail length / cruise speed
            + acceleration/braking overhead + intermediate-stop delays
```

For an evenly spaced service with headway `H`, a passenger arriving at a random time waits `H/2` on average and up to approximately `H`. Direction matters. Uneven departures require their actual gaps; do not apply `H/2` to a nominal average frequency. Boarding and destination dwell matter according to when a passenger can actually enter and leave.

**Hypothetical greybox, not today's route:** a 520 m winding foot route and a 180 m direct rail link; 6 s combined platform access/exit; no intermediate stop. This foot detour must contain enjoyable exploration, not artificial obstructions.

| Option                                   | Door-to-door time                                                 | What it establishes                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Walk, 5.6 m/s                            | **92.9 s**                                                        | Baseline at the normal controller speed.                                                          |
| Sprint, 9.5 m/s                          | **54.7 s**                                                        | The real competition for a familiar trip.                                                         |
| Rail at 3 m/s, 3 s acceleration overhead | **69 s before any wait**                                          | Today's default speed cannot beat sprint here even with immediate departure.                      |
| Rail at 6.5 m/s, 2 s overhead            | **35.7 s before wait; 47.7 s with a hypothetical 12 s mean wait** | A modest gain depends on service frequency. The frequency is not supplied by the current shuttle. |
| Rail at proposed 12 m/s, 3 s overhead    | **24 s before wait; 36 s with a 12 s mean wait**                  | About 34% faster than sprint if that headway is achievable. A 24 s maximum wait gives 48 s total. |

The existing [`runTicks`](../../src/sim/wagon.ts) adds one acceleration duration above distance/cruise for a sufficiently long rest-to-rest leg; acceleration and braking together produce that overhead, not twice it.

**Frequency is an engineering constraint, not a free number.** A single 180 m shuttle at 12 m/s, with 3 s overhead each way and 6 s dwell at each end, cycles in approximately `2 × (15 + 3 + 6) = 48 s`. Counting the wait until departure gives 24 s mean waiting and roughly **48 s average / 72 s worst-case total**, weaker than the hypothetical service above. Boarding during terminal dwell does not remove the remaining time before departure; validate the totals against the actual boarding and disembarking rules. A roughly 24 s departure headway would need a second scheduled vehicle with a safe passing arrangement or another service topology; it is not achieved merely by setting cruise to 12.

Start by comparing **3, 6.5 and 12 m/s** and the service each can actually sustain. The 12 m/s case is an experiment, not approved tuning: reaching it in 3 s means 4 m/s² acceleration, which also needs a comfort check; gentler acceleration increases the journey budget. Seek a recurring leg that beats sprint by roughly **20–35% on average including access and waiting**, while making missed departures tolerable. These are proposed acceptance targets, not published industry thresholds. If the ride fails, shorten the line, improve frequency or choose a better crossing before enlarging the island again. Keep walking pleasant.

### 5.4 The terrain and railway implementations need to agree

The [wagon prototype](../../src/proto/wagon/index.ts) currently derives track and bogie height from `groundHeight`; the [route data](../../src/sim/route.ts) supplies horizontal endpoints. A bridge above a ravine or a tunnel below the surface therefore needs an explicit rail elevation profile and matching collision treatment. Moving the horizontal route does not create either.

Likewise, Boogle's heightfield cannot represent two ground surfaces at the same horizontal position. A real tunnel needs separate geometry/colliders and the terrain-hole approach described in [src/island/README.md](../../src/island/README.md). Begin with an open cutting if that tests the route advantage more cheaply. The greybox must demonstrate the required topology before buying the more expensive enclosure.

## 6. How much bigger, and how to fill it without placing everything

### 6.1 Area does not tell us how long the walk feels

**[I, calculation]** For a comparable shape, doubling area multiplies linear distances by √2, not two. The table uses the diameter of an equivalent circle, `2√(area/π)`, solely to make scale comparable. These are ideal flat crossings, not measured routes across Boogle's irregular coast.

| Dry land  | Today's area | Equivalent diameter | Walk crossing, 5.6 m/s | Sprint crossing, 9.5 m/s |
| --------- | ------------ | ------------------- | ---------------------- | ------------------------ |
| 23,300 m² | 1×           | 172 m               | 31 s                   | 18 s                     |
| 46,600 m² | 2×           | 244 m               | 43 s                   | 26 s                     |
| 69,900 m² | 3×           | 298 m               | 53 s                   | 31 s                     |
| 93,200 m² | 4×           | 344 m               | 62 s                   | 36 s                     |

A 60,000 m² flat disc could still feel small at sprint speed and empty between objects. A similarly sized folded coast can produce a 400–600 m expedition, multiple changes of scene and a short return. The useful measures are **time to the next meaningful choice, time to rejoin, repeated-trip cost, and routes made newly possible**. There is no defensible universal area limit independent of those measures.

### 6.2 A starting shape and density budget

**All dimensions here are [I], greybox hypotheses.** Aim at **60,000 m²**, within an approximate **360 × 280 m bounding footprint**, leaving substantial water and concavities inside that rectangle. Use three attached lobes around a sheltered inlet, separated visually by a **35–45 m ridge** and wooded shoulders. Preserve the familiar hub as the low, open room. A ridge spine gives orientation while paths fold around it; avoid a single broad plateau visible in one glance.

The [current shape](../../src/island/shape.ts) already composes land from lobes and a massif. Preserve `HOME_KEEP` and separately protect the actual spawn, court and garden footprints: a 22 m disc around the origin alone is not a sufficient description of all those occupied spaces. [Spawn constants](../../src/constants.ts), [island contract](../../src/island/README.md).

| Greybox measure                                      | Starting target                                                     | Why test it                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Familiar starter loop                                | **180–240 m**, about **32–43 s walking** without stops              | A short orientation circuit that remains useful after expansion.                                                                                       |
| Two additional loops                                 | **200–350 m each**, partly sharing the spine                        | Choices with reconnection rather than a tree of dead ends.                                                                                             |
| Deliberately winding outer expedition                | **400–600 m**, about **71–107 s walking**                           | Room for a sequence of discoveries; this is an excursion, not every hub chore.                                                                         |
| Return after a shortcut opens                        | **150–250 m**, about **27–45 s walking**                            | A perceptible change to repeated travel.                                                                                                               |
| Active-route decisions, discoveries or changed views | Typically **45–85 m**, about **8–15 s walking**                     | Investigate long stretches with nothing to notice or do; do not distribute identical rewards on a timer.                                               |
| Deliberate quiet release                             | Sometimes **20–30 s**, with a compelling view or enjoyable movement | Density needs contrast. Quiet is acceptable when it is the experience, not missing content.                                                            |
| Main shared paths / gathering pockets                | Initially **4–6 m clear / 12–20 m across**                          | Test passing, camera clearance, toys and regrouping with 1, then 2–6 players; stress the technical room cap of 8. These are not Big Walk measurements. |
| Authored anchors                                     | **8–10 across four landscape neighbourhoods**                       | Each supplies an activity, route decision or meaningful return; foliage does not count as an anchor.                                                   |

Some anchors should reuse existing play: the hub ball space, a landing/play clearing, an overlook, a cove, a useful crossing and station destinations. Exact activities remain subject to [Boogle 2's level-work decision](../proposals/boogle-2.md); do not fill a quota with new systems. An anchor's approach, activity and departure can supply several beats without requiring a separate prop every 50 m.

This intentionally proposes a larger outer reach than recommendation 2 of [level-design.md](level-design.md) and the earlier [layout proposal](../proposals/island-layout.md), which favour very short hub distances. Preserve that convenience for the starter activities; test longer **optional excursions**. The owner has asked to reconsider size, but neither the old layout nor this new target is automatically approved.

### 6.3 Author the important relationships; generate the supporting detail

**[V, primary]** Guerrilla's GDC material describes rule-based procedural placement in _Horizon Zero Dawn_, with artist-defined graphs supplying environmental detail. It demonstrates that artists can author placement logic rather than every instance; it does not prove that procedural scatter supplies satisfying exploration. [Guerrilla, GPU-Based Procedural Placement](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn).

**Boogle production recipe [I]:**

1. **Author land and connections first.** Sculpt the ridge, inlet, shoulders, crossings and landing zones with [shape functions](../../src/island/shape.ts) and [stamps](../../src/island/stamps.ts). Mark loops and gates in a topological sketch before adding dressing. Preserve the hub's real footprints.
2. **Author a small set of views.** At each bend and clearing, choose foreground occlusion, a middle-distance activity and a recognisable background. Check from player height and train height in both directions. Keep explicit clear corridors for those views.
3. **Use four related habitat zones.** For example: open shore meadow, sheltered wooded hollow, exposed rocky ridge and damp cove. Change canopy, rock shape, ground palette and openness together, with blended borders. These are proposed Boogle palettes, not a claim to reproduce Australian ecology.
4. **Scatter in clusters with exclusions.** Extend existing slope/elevation/spacing rules with habitat masks and distance from path, platform, landing zone and view corridor. Use a few large silhouettes, clustered medium forms and cheap small detail. Give clearings negative density; do not scatter uniformly and clear them by hand afterwards.
5. **Keep placement stable.** Give zones or layers independent stable seeds so adding detail in one does not reshuffle another. Pure cosmetic variation may be Local; solid obstacles and harvestable sources must agree with the authoritative layout. Decoration must not silently create new resources or different collisions on different clients.
6. **Bound costs and inspect composition.** [props.ts](../../src/render/props.ts) already has seeded scattering, keepouts and merged geometry/collider bodies split into 64 m tiles. Extend that approach before inventing a new generation framework. Start with a similar budget of interactive objects and increase cheap scenery selectively; measure draw, shadow and collider costs before/after expansion on the target device. The grid staying the same size does not make extra vegetation free.

This preserves the lesson of Big Walk's authored naturalism while fitting Boogle's production constraints. Hand-author the places and the relations that make them worth finding; let rules provide coherent texture between them.

## 7. Proposed era unlocks that reopen home

**[I]** The eight era names and later movement unlocks come from [boogle-2.md](../proposals/boogle-2.md); **the allocations below are new proposals**. Do not add eight mandatory traversal systems. Reuse connections and improve service, leaving the old foot loops and heritage line enjoyable.

| Era                        | Candidate change at home                                                                                              | What familiar ground becomes newly useful                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **1. Wood**                | Walking and the starting jump; light rails; simple shared ladder/rope or footbridge shortcuts discovered along loops. | The outer loop reconnects to the hub; a one-way drop gains a way back. Basic exploration is already available without building. |
| **2. Steam wagons**        | Useful uphill/cross-gorge passenger service; trial **double jump** as the first later movement unlock.                | The ridge becomes a repeatable toy launch point; small shelves beside known paths become forgiving optional routes.             |
| **3. Iron and coal**       | Open a cross-ridge tunnel; trial the **glider** after the ridge is familiar.                                          | Long surface approaches become short connections; upper stations connect to lower clearings through the air.                    |
| **4. Steel and harbour**   | Boat access and a harbour bridge/causeway where their destinations justify them.                                      | Known coves become alternative arrivals and departures, and the inlet can be crossed without following its whole shore.         |
| **5. Diesel and concrete** | A reliable road connection; a vehicle only if the approved driving experiment succeeds.                               | Existing bends and slopes support a new kind of trip. If driving fails, the improved route still serves walking and freight.    |
| **6. Electric**            | Improve frequency and upgrade an existing ascent connection; consider a lift only if rail leaves a real gap.          | The old upper region becomes an easy meeting place; no new land or avatar verb is required.                                     |
| **7. Monorail city**       | An elevated connection and public upper walkways around already developed home.                                       | Players see familiar streets and shoreline from a new layer, with stairs or lifts back to old routes.                           |
| **8. Maglev**              | Express connection to the wider network and mainland, retaining local/heritage service.                               | Home becomes a useful interchange and a place to revisit; the express should not replace the short local downhill loop.         |

Make access shared and obvious to a visitor arriving late. Proposed movement abilities should become available to every player in an eligible world, rather than leaving newcomers unable to follow friends; this allocation is a design proposal, not an existing reward rule. Gate neither basic movement nor regions behind farming, and avoid compulsory simultaneous switches. New branches should have a safe foot alternative where possible; optional shortcuts can be the visible benefit of discovery or construction. That keeps the proposal within principles 3, 4 and 8.

## 8. What to prototype, and what remains unknown

**First greybox [I]: one ridge loop plus one useful rail chord.** Begin with the roughly 46,600 m² variant; make the same authored loop structure testable around 60,000–69,900 m² by expanding selected outer pockets, not uniformly scaling every path and prop. Hold the controller, activities and ride settings constant when comparing land variants. Defer 93,200 m² until the smaller versions prove crowded or too quickly exhausted.

Include the hub, one winding climb, a broad top clearing, a cove/downhill return, one shortcut opened from the far side, and a direct rail crossing. Reuse toys as provisional reasons to stop. Test both directions and the later movement kit. A successful loop should be worth repeating with every reward disabled.

The existing [`?layout=` loader](../../src/island/layout.ts) moves POIs and horizontal route endpoints only; it omits caves and applies only the existing `ROUTE.length` sections. It does **not** load arbitrary landforms, additional stations or rail heights. A landform/rail greybox therefore requires a scoped extension or separate prototype, registered in [protos/protos.ts](../../protos/protos.ts), consistent with [find-the-fun.md](../plans/find-the-fun.md). Preserve the separation between local layout experiments and the pinned [home-land data](../../src/world/home-land.json) used by [walk-layout.ts](../../src/features/walk-layout.ts). Do not reorder shipped section identities or alter shared world data merely to preview a route.

Record observed answers, solo first:

- **Unfolding:** after the first bend, can the player name a reason to continue? At the top, do they recognise home and choose a next route without an instruction?
- **Density:** where do they run with nothing to notice or do? Does deleting an empty pocket improve the trip? Mark actual elapsed time rather than assuming every target interval was met.
- **Return:** do they notice and use the opened shortcut? Does the glider offer several understandable landings without skipping everything?
- **Rail utility:** time the identical origin-to-destination trip walking, sprinting and riding, including a missed departure. Measure repeated trips and both directions, not only a perfectly timed first ride.
- **Group fit:** with 2–6 players, can people pass, see companions on nearby folds and regroup without repeated full backtracking? Check 8 for physical crowding, separately from the normal design target.
- **Ride pleasure:** is the view interesting from the actual carriage, and is the upper stop a place someone wants to leave the train? Look at stills and a motion sheet before the next implementation ships.

**Evidence gaps:** there is no published Big Walk distance/density prescription in the sources found; transport specifics rely partly on guides; no universal “interesting thing every N seconds” rule is established. Boogle's target area, widths, loop lengths, glide envelope and service times remain hypotheses until measured. No browser playtest, terrain modification or rendering was performed for this research-only change.

## 9. Recommendations for Boogle

1. **Target about 60,000 m² of dry land, testing 46,600–69,900 m² before 93,200 m².** Keep the 510 m grid and compact starter activities; grow optional outer excursions. Serves principles 1 and 8. Touches [island shape](../../src/island/shape.ts), [island documentation](../game-design/island.md) and the scope in [Boogle 2](../proposals/boogle-2.md).
2. **Fold three attached lobes around an inlet and a 35–45 m ridge.** Protect spawn, court and garden; use wooded shoulders and rock openings to reveal connected places in stages. Serves principles 2 and 8. Touches [shape](../../src/island/shape.ts), [stamps](../../src/island/stamps.ts) and the [island contract](../../src/island/README.md).
3. **Build a short starter loop, two outer loops and a shared ridge spine, with shortcuts back to home.** Prefer recognisable reconnections and safe one-way drops over long dead ends; keep ordinary hub errands short. Serves principles 1 and 8. Reconsiders the outer-distance target in [level-design.md](level-design.md) and feeds [the parked layout proposal](../proposals/island-layout.md).
4. **Give paths room for friends and alternate discoveries with quiet views.** Trial 4–6 m clear paths, 12–20 m gathering pockets and 8–15 walking seconds between active-route beats; adjust from solo and group observation. Serves principles 4, 8 and 10. Touches [prop exclusions](../../src/render/props.ts), [stamps](../../src/island/stamps.ts) and [playtests](../playtests.md).
5. **Put the first rail leg across a gorge or ridge cutting to the top of a fun descent.** Serve repeatable activity at both ends; add a tunnel or viaduct only when the route earns it, with an explicit rail height profile. Serves principles 1 and 2. Touches [route data](../../src/sim/route.ts), [wagon rendering](../../src/proto/wagon/index.ts) and [the rail decisions](../proposals/boogle-2.md).
6. **Make one recurring rail trip beat sprinting after access and waiting are counted.** Compare 3, 6.5 and 12 m/s; test a roughly 20–25 s headway only with a feasible service, and separate passenger stops from construction joints. Serves principles 1 and 8. Touches [`runTicks` and the timetable](../../src/sim/wagon.ts); preserves ride-only trains and hub-only fast travel in [Boogle 2](../proposals/boogle-2.md).
7. **Compose the ride as changing spaces and make the upper stop a launch point.** Use a near rock face, brief enclosure, open crossing and vista; a glide or downhill toy loop should make the uphill return worth repeating. Serves principles 1, 2 and 10. Touches [wagon](../../src/proto/wagon/index.ts), [moves](../../src/proto/moves/index.ts) and [island stamps](../../src/island/stamps.ts).
8. **Reopen home through shared routes and later abilities, following the proposed era table.** Trial double jump in steam, glide and a ridge shortcut in iron/coal, cove access in the harbour era, then better service and upper routes; keep driving conditional and farming optional. Serves principles 3, 4, 8 and 9. Proposed additions to [Boogle 2's eight eras](../proposals/boogle-2.md), using [moves](../../src/proto/moves/index.ts) and [route](../../src/sim/route.ts) as starting points.
9. **Author 8–10 meaningful anchors and four related habitat zones; generate the supporting scenery.** Protect paths, views, landing areas and resource identities with stable placement rules, then profile extra vegetation and colliders. Serves principles 1, 2 and 8. Touches [props](../../src/render/props.ts), [shape](../../src/island/shape.ts) and [pinned home-land data](../../src/world/home-land.json).
10. **Greybox one complete foot loop, one opened return shortcut and one useful rail chord before enlarging the rest.** Compare land variants with the same activities, time real trips, inspect the ride and repeat with later moves before committing a layout. Serves principles 1 and 8. Requires a scoped extension beyond [today's layout loader](../../src/island/layout.ts), with an entry in [protos](../../protos/protos.ts) and results in [playtests](../playtests.md); level work remains greybox under [Boogle 2](../proposals/boogle-2.md).
