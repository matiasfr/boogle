# Sea crossings

*Research report, 1 November 2026. Crossing water as play and as progression, and how games hide the loading of the next place behind a crossing: Wind Waker, Sea of Thieves, Dredge, Raft, A Short Hike's boat, Breath of the Wild and Tears of the Kingdom, Death Stranding 2, Islanders, Animal Crossing's bridges and Dodo flights, Factorio and Satisfactory rail bridges, Tiny Glade, Mini Metro and Mini Motorways, Cities: Skylines II, train ferries, God of War's boat, Spider-Man's streaming, Jak and Daxter. For the archipelago decided on 1 November ([boogle-2.md](../proposals/boogle-2.md), "Trains and the world") and the rough archipelago in [island-layout.md](../proposals/island-layout.md). Builds on [level-design.md](level-design.md) (recs 7, 9, 10, 11, 15, 16), [rail-as-play.md](rail-as-play.md) (era pieces, the handcar) and [construction-you-can-watch.md](construction-you-can-watch.md) without repeating them. Recommendations only; no design decisions.*

**Markers.** **[V]**: the page was fetched and the words match. **[S]**: seen only in a search summary, a wiki, a guide, a forum or a reviewer's paraphrase; check before quoting. Boogle numbers come from the code: walk 5.6 m/s, sprint 9.5 m/s ([src/physics/physics.ts](../../src/physics/physics.ts)); the wagon cruises at 3 m/s by default, 6.5 m/s in `&v=fast` ([src/sim/wagon.ts](../../src/sim/wagon.ts), [src/proto/wagon/index.ts](../../src/proto/wagon/index.ts)); fog from 110 m, opaque at 520 m ([src/constants.ts](../../src/constants.ts)). Island distances are the placeholders in island-layout.md (Mine Isle 157 m off home's east shore, Gary's Yard 145 m beyond it).

## Summary

1. A crossing's length is a time, tuned with the vehicle's speed and the time the next place needs to load: Wind Waker slowed its ship until the GameCube could keep up, and Spider-Man sized its tiles so each is ready 1.33 s before you reach it.
2. The lure is the destination in view the whole way. Jak and Daxter keeps a low-detail vista on screen and swaps in the real place where the path hides it; Sea of Thieves' tension comes from a sail on the horizon.
3. Empty water is the known failure (Wind Waker's critics, Dredge's early slow cutter). Crossings that work fill the time with something: God of War's stitched boat stories, A Short Hike's boat music that rises with speed, Dredge's clock and fog.
4. The player never loses control on a good crossing (God of War: board and leave at any moment, no camera cut). Loading screens appear only for jumps, never for travel.
5. Built crossings read as progress when you see them from far off and use them every day (Death Stranding 2's roads and monorails; one writer's zip line turned hours into four minutes).
6. Scarce crossings are a design lever: Mini Metro's limited bridges and tunnels force choices, and Dinosaur Polo Club softened tunnels from a hard cap to a slowdown when the limit felt like a wall.
7. Bridges grow out of the build verb rather than a separate tool: Tiny Glade turns a path over water into a bridge and added bridges only because players kept asking; Factorio's rail planner places ramps and supports for you.
8. Supports carry the look of a crossing: Factorio's red ramps and spaced supports, Satisfactory's foundations-then-pillars habit, Cities: Skylines II's showpiece and lift bridges.
9. Arrival on a new island is the payoff beat: Animal Crossing's bridges appear overnight after a funding goal, Islanders hands you a whole new island at a score threshold, Raft's islands are pit stops that feed the home you carry.
10. For Boogle: 20–45 s crossings at the vehicle's pace, the far island on screen throughout, spans built outward from the shore so the line itself extends, and three detail tiers for each island (silhouette always, terrain from the bridgehead, colliders and props before mid-span).

## Findings by source

### 1. Wind Waker: speed, loading and earning the fast sail

- **[V, already in level-design.md]** The no-loading sea came first, and the ship's speed was balanced against the time to read the next island's data ([Good Blood interview](https://goodblood.games/wind-waker-interview)).
- **[S, reporter's paraphrase of Aonuma]** The GameCube held the ocean only in chunks, so the boat could not outrun what was in memory; the HD release could hold the whole sea, which made the Swift Sail possible. Aonuma held the faster sail back so players would first feel the sea's size ([Kotaku](https://kotaku.com/heres-why-sailing-took-so-damn-long-in-legend-of-zelda-513171965); [Zelda Universe](https://zeldauniverse.net/2019/01/29/princess-zeldas-study-why-the-sail-in-wind-waker-wasnt-always-swift/)).
- **Lesson:** loading sets a floor on crossing time; faster travel can be an upgrade earned later, once the distance has been felt.

### 2. Sea of Thieves: the horizon and the crew

- **[V]** Rare calls it a believable pirate fantasy, not a realistic sailing game. Ship jobs (anchor, sails, repairs) are walk-up stations with no assigned roles, and Craig Duncan describes the tension of seeing another crew's sail on the horizon ([Game Developer](https://www.gamedeveloper.com/design/how-emotional-psychology-and-the-goonies-inspired-i-sea-of-thieves-i-)).
- **[S]** Mike Chapman: the wheel's view is partly blocked by a sail so the helmsman needs a lookout, and the map sits below deck ([Golden Sands interview](https://medium.com/golden-sands-blogpost/interview-mike-chapman-1875fc7faac5)); island and outpost counts were tuned for a ship encounter every 15–30 minutes ([Windows Central](https://www.windowscentral.com/the-sea-of-thieves-vision-interview), fetch returned no article body).
- **[S]** Rare's engine technical director, on the forums: islands switch to high detail at the same distance on every platform, and far islands always show a lower-detail version ([forum thread](https://www.seaofthieves.com/community/forums/topic/51971/draw-distance-island-details), 403 on fetch). Players estimate long crossings at 10–15 minutes at full sail ([forum](https://www.seaofthieves.com/community/forums/topic/57827/sail-speed)).
- **Lesson:** a crossing is fun with friends when the vehicle has stations to stand at and something to watch for; far islands are cheap stand-ins that swap at a fixed distance.

### 3. Dredge: the clock, the fog and the slow first boat

- **[V]** Bastiaens of Black Salt: day and night are "open versus closed"; fog is the closed half, and their fog is centred on the player, not the camera ([Game Developer](https://www.gamedeveloper.com/production/leveraging-the-unseen-to-turn-players-worst-fears-against-them-in-dredge)).
- **[S]** Sailing advances the clock, so a long trip risks the night; the prototype's day was much faster and was slowed to give time to explore. The team says it doesn't want to punish players who aren't brave enough to go out at night ([Game Developer, "Trawling in the deep"](https://www.gamedeveloper.com/design/trawling-in-the-deep-how-black-salt-games-made-spooky-fishing-rpg-i-dredge-i-); [Koru Cottage](https://koru-cottage.com/dredge-developer-interview/)).
- **[S]** The map was planned on a whiteboard, island by island, with quests sending players back and forth ([Boiling Steam](https://boilingsteam.com/interview-with-dredge-developers-at-the-tgs2023/)). Engines are the main upgrade (guides list about 10.5 knots for the first outboard, 15.8 for an improved one); by the end, regions are minutes apart ([Game Rant](https://gamerant.com/dredge-best-boat-upgrades/)). There is no general fast travel.
- **Lesson:** a crossing gets meaning from a clock and a view that closes in; a faster boat is the progression, and it shrinks a map players already know.

### 4. Raft: the vehicle is the home

- **[V]** Redbeet: the raft stays the player's "base and home"; the hand-made islands and underwater sites are "pit stops". Moving the raft caused jittery collisions with islands, and moving many colliders every frame cost performance, fixed by keeping colliders active only when the player is close ([Game Developer Q&A](https://www.gamedeveloper.com/design/q-a-how-steam-hit-i-raft-i-stands-out-in-the-crowded-survival-genre)).
- **Lesson:** a moving deck against static land is where physics breaks first; activate an island's colliders only near the player.

### 5. A Short Hike: one boat, late, for fun

- **[V]** The boat came in a free update, a "totally adequate 2003 aluminium motorboat" rented for the afternoon ([itch.io devlog](https://adamgryu.itch.io/a-short-hike/devlog/169706/version-18-the-boating-update-is-out-now-on-pc-and-nintendo-switch)).
- **[S]** It opens the Orange Islands off the north-west coast, can't sink, only slows briefly on a hit, and its theme rises and falls with the boat's speed; a race asks for a lap under 2 minutes ([fandom wiki](https://ashorthike.fandom.com/wiki/Boat); [Switchblade Gaming](https://www.switchbladegaming.com/cozy-games/a-short-hike-guide/)). Playtesters swam to nearby islands before any boat existed ([Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)).
- **Lesson:** a water vehicle with no failure and music that follows the throttle makes crossing a toy; players will try to swim the gap first.

### 6. Breath of the Wild and Tears of the Kingdom: rafts you push and bridges you make

- **[S]** BotW's rafts have no oars: you fan the sail with a Korok Leaf, and a charged swing gives a longer gust ([Zelda Wiki](https://zelda.fandom.com/wiki/Korok_Leaf)). TotK's Ultrahand grew from prototypes built out of BotW's parts; the developers describe the pleasure of parts clicking into place ([Zelda Dungeon](https://www.zeldadungeon.net/tears-of-the-kingdom-developers-describe-what-was-done-to-make-ultrahand-ability-more-zelda-like/); [miketendo64](https://miketendo64.com/2023/05/11/zelda-devs-links-abilities/)). Players cross gaps with log bridges and rafts they glue together.
- **Lesson:** a crude crossing you push or assemble yourself is play before it is infrastructure.

### 7. Death Stranding 2: infrastructure as the map's progress

- **[V]** Game Informer's preview: players "build entire monorail systems to transport materials from mines", alongside bridges and roads for a community of players ([Game Informer](https://gameinformer.com/preview/2025/05/08/building-a-stronger-connection)).
- **[V, player essay]** Auto-pavers and track layers stand at fixed sites and take materials; a finished highway is visible from far off, "a physical representation of my progress"; Likes from other contributors feel warm; a zip-line network cut a long route to about four minutes ([314bit](https://314bit.substack.com/p/my-favorite-part-of-death-stranding)).
- **[S]** Bridges need a set amount of metal by length and cross rivers and gaps ([GameRant](https://gamerant.com/death-stranding-2-how-to-build-a-bridge/)). No developer interview on the system was found.
- **Lesson:** builders are placed by the designer (the machine is already there), players feed them, and the payoff is seeing the line from far away and riding it every day.

### 8. Islanders: the next island as the score's reward

- **[S]** Reaching a score threshold unlocks a new, empty island; thresholds rise each time ([Islanders wiki](https://islanders.fandom.com/wiki/Scoring)). Allmenröder's "preserve simplicity" is in [rail-as-play.md](rail-as-play.md).
- **Lesson:** a new island is a clean slate and a clear reward; Boogle's version keeps the old island and joins it physically.

### 9. Animal Crossing: bridges overnight, flights as loading

- **[S]** The first log bridge is a kit you place, built by the next morning; later bridges are funded through Lloid at the site and appear the morning after the goal is met ([Nookipedia](https://nookipedia.com/wiki/Bridge); [Game8](https://game8.co/games/Animal-Crossing-New-Horizons/archives/284596)).
- **[S]** Visiting is a Dodo Airlines flight; each arrival shows a cutscene that interrupts everyone on the island while the game syncs, which players complain about ([GamesRadar](https://www.gamesradar.com/i-love-animal-crossing-new-horizons-multiplayer-but-something-has-got-to-be-done-about-those-loading-screens/), fetch truncated; [GamesBeat](https://gamesbeat.com/animal-crossing-new-horizons-online-guide-how-visiting-islands-works/)).
- **Lesson:** an offscreen build with a next-day reveal is cheap and works; a join or travel that halts everyone else is the thing to avoid in a drop-in game.

### 10. Factorio and Satisfactory: rail over water

- **[V]** Factorio's elevated rails (FFF #378): tunnels were dropped partly because tunnels "over" water don't feel right; the rail ramp is 16 tiles long, heavy and red-painted so it reads as train family; supports stand at intervals; ramps and supports can stand in water, and islands serve as crossing points; the planner snaps across levels ([FFF #378](https://factorio.com/blog/post/fff-378)).
- **[S]** The wiki: ramps and supports are the only things buildable in Nauvis' oceans, and the planner places needed ramps and supports automatically; removing a support removes the rails that depended on it ([Factorio wiki](https://wiki.factorio.com/Rail_ramp)).
- **[S]** Satisfactory players lay foundations, lay track on them, then swap foundations for evenly spaced pillars; deep water makes pillars hard to place ([Steam discussion](https://steamcommunity.com/app/526870/discussions/0/3802778829228266292/)). No Coffee Stain source was found.
- **Lesson:** a water crossing is span plus supports; the tool should place the supports, and their rhythm and colour are most of the look.

### 11. Tiny Glade: bridges because players wanted them

- **[V]** Anastasia Opara: bridges "were not planned at all in the beginning", but so many players wanted them that the team built a system for raising buildings, which then needed supports ([80.lv](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games)).
- **[S]** Drawing a path over a stream turns it into a bridge ([PC Gamer](https://www.pcgamer.com/games/city-builder/tiny-glade-wont-stop-delighting-me-with-new-discoveries/)).
- **Lesson:** the bridge is the same verb continued over water, with the system choosing the shape.

### 12. Mini Metro and Mini Motorways: scarce crossings

- **[V]** Mini Metro alpha 7: tunnels stopped being limited and instead slow trains, because the team wanted them "a hindrance" but not a hard limit ([Dinosaur Polo Club](https://dinopoloclub.com/2014/03/12/mini-metro-alpha7/)).
- **[S]** In the release, bridges and tunnels come in limited numbers from weekly upgrades; a missed one can strand a station across the river ([Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game))). Robert Curry: early Mini Motorways prototypes had boats on rivers raising bridges, cut later ([Twinfinite](https://twinfinite.net/pc/mini-motorways-interview-dinosaur-polo-club-talks-aesthetics-traffic-their-name/), 403 on fetch).
- **Lesson:** water makes a crossing a choice; when the limit feels like a wall, a cost (slower) beats a cap.

### 13. Cities: Skylines II: bridges as showpieces and as a clock

- **[V]** Bridges & Ports adds 20 bridges, half movable; when a ship comes, traffic stops, the bridge opens and closes, which takes longer than a light cycle; lift bridges suit rail because they need less counterweight ([dev diary #1](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/bridges-and-ports-dev-diary-bridges)). Ferries link a port area to the rest of the city ([dev diary #2](https://www.paradoxinteractive.com/games/cities-skylines-ii/news/bridges-and-ports-dev-diary-ports)).
- **Lesson:** a bridge is a landmark, and a scheduled opening is a small event people stop to watch.

### 14. Train ferries

- No game was found that treats a train ferry as a designed crossing; Transport Fever 2 and OpenTTD have ferries only through mods or as separate boats **[S]** ([Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=2668431037); [OpenTTD discussion](https://steamcommunity.com/app/1536610/discussions/0/601898665208999405/)).
- **Common knowledge, check before quoting:** real train ferries shunted wagons onto rails in the ship's deck and ran across straits before bridges or tunnels existed (Denmark's Great Belt and Puttgarden–Rødby, the Strait of Messina). It is the historical step between "no link" and "bridge", which fits an era ladder.

### 15. God of War: the boat as the place for story

- **[V]** The boat had to feel responsive with weight; the player keeps control and can board or leave at any time; Mimir's stories are many short clips stitched into one tale; docking picks among 10 animations by how far the boat must turn ([PlayStation Blog dev diary](https://blog.playstation.com/2018/08/23/god-of-war-development-diary-building-a-better-boat/)).
- **[S]** More than 750 lines of boat dialogue; leaving mid-story plays a short outro and resumes it next time ([DualShockers](https://www.dualshockers.com/god-of-war-boat-750-lines-dialogue/)). The whole game is one unbroken camera shot with no loading screens ([Wikipedia](https://en.wikipedia.org/wiki/God_of_War_(2018_video_game))).
- **Lesson:** a crossing is where low-stakes content plays (talk, music, gags) and it can be interrupted cleanly.

### 16. Spider-Man, Jak and Daxter, and loading tunnels

- **[V, attendee's notes on Elan Ruskin's GDC 2019 talk]** Manhattan streams in 128 m tiles, nine at a time; at top speed a tile must be ready in 1.33 s; big mips and ground detail wait until the player slows and nears the ground; a single low-res version of every building is always drawn, plus always-loaded far versions of silhouette props (water towers, AC units) at 13 MB for the whole city; airlocks and long cutscenes to hide loads were too elaborate and used only a couple of times ([Tyler Young's notes](https://tylerayoung.wordpress.com/2019/04/01/marvels-spider-man-a-technical-postmortem/); [GDC Vault](https://www.gdcvault.com/play/1026496/-Marvel-s-Spider-Man)).
- **[S]** Jak and Daxter: levels were laid out so they could move in and out of memory without stalls or popping ([Game Developer postmortem](https://www.gamedeveloper.com/design/postmortem-naughty-dog-s-i-jak-and-daxter-the-precursor-legacy-i-)); you see the next place far off as a low-detail vista, and the path hides it while the full version swaps in ([GamesRadar](https://www.gamesradar.com/jak-and-daxter-the-precursor-legacy-anniversary-making-of/), fetch truncated).
- **[S]** Loading tunnels in general: crawls, vents, lifts and corridors that restrict the view while the next area streams ([TV Tropes, Dynamic Loading](https://tvtropes.org/pmwiki/pmwiki.php/Main/DynamicLoading)).
- **Lesson:** stream by distance and speed, keep a cheap version of everything always drawn, keep silhouette items always loaded, and swap detail where the view is blocked or the player slows.

## General rules that recur

- **Time, not distance.** Crossing time is set by vehicle speed and load time together (Wind Waker, Spider-Man).
- **The far shore stays in view.** The destination is the lure; a cheap stand-in carries it until arrival (Jak, Sea of Thieves, Spider-Man's always-on low-res city).
- **Fill the crossing.** Story, music, a clock, other sails (God of War, A Short Hike, Dredge, Sea of Thieves). An empty minute is the complaint.
- **Never take control away, never stop the others** (God of War's boat; Animal Crossing's arrival cutscene as the counter-example).
- **The tool places the supports** (Factorio's planner, Tiny Glade's path-to-bridge); the player picks the line.
- **Arrival is a beat** (Animal Crossing's morning reveal, Islanders' new island, Death Stranding's road seen from afar).
- **Speed is the progression** (Wind Waker's Swift Sail, Dredge's engines): a later, faster vehicle shrinks a crossing players already know.

## What this means for Boogle

At today's numbers, Mine Isle's 157 m trestle takes 28 s on foot, 17 s sprinting, about 55 s on the wagon at its default 3 m/s, and about 26 s in `&v=fast`. An island 150–300 m off shore sits inside the 520 m fog.

1. **Crossing length: 20–45 s at the pace of whatever crosses it.** Under 20 s the island feels like part of home; over 45 s with nothing new is Wind Waker's empty sea. At the default wagon pace the first trestle is already 55 s, so either the wagon cruises faster on the open span or the span gets a mid-point stop. *Prototype:* a greybox 157 m trestle off home's east shore in a `proto-` room; ride it at 3, 4.5 and 6.5 m/s and walk it, timing when the ride starts to feel long.
2. **Something every 10–15 s of a crossing.** A pier with a signal box, a rock islet with one palm, a buoy bell, a fishing boat on a timetable, a ship that passes under (CS2's lift bridge as a scheduled event). Factorio uses islands as crossing points; Boogle can too. *Prototype:* add one islet and one timetabled boat (a pure function of the tick, like the trains) to the greybox trestle; compare the felt length with and without.
3. **What's visible: the far island in view for the whole crossing, home behind you.** The island grows from silhouette (level-design rec 11) to detail as you cross; the crossing faces it head-on so the bridge points at it. Turning round should show home's lighthouse, so the crossing is also the first time you see home from outside. *Prototype:* `/look` stills every 25 m along the greybox trestle, looking forward and back.
4. **Build the crossing outward from the shore, span by span, with the same verb as track.** Laying track off the end of the line over water makes a trestle piece (Tiny Glade's path-to-bridge); supports drop in on their own at a fixed rhythm (Factorio's planner). The ghost of the full crossing stands from the start (construction-you-can-watch), so everyone sees how far it is. *Prototype:* in `?proto=build`, a ghost of a 10-span trestle and a run that drops pile, cap, deck for one span per fill; check that the span count reads from the shore.
5. **A crude crossing before the real one.** Players will swim for an island they can see (A Short Hike). A raft you push or pole, or a log causeway at low tide, lets a solo player reach the next island's shallows before its era, as a peek, not a shortcut (BotW's leaf-and-raft). *Prototype:* a pushable log raft (Owner, one presence field) and the turn-back swim cue from level-design rec 12; does anyone try to reach Mine Isle with it?
6. **Reveal: the first train across is the opening.** The finished bridge is dull until something crosses it. The wagon's first run over the new span, with the island's detail fully in, is the era's payoff; Animal Crossing's offscreen overnight build is the cheaper fallback when a build is too long to watch. *Prototype:* the era greybox swap (find-the-fun step 4) with the trestle's last span landing and the wagon leaving at once; watch whether a solo player rides it unprompted.
7. **Bridges are landmarks you see from home.** A lit trestle or a red steel truss is the medium shape between home's lighthouse and the far island; each era's crossing gets one colour and one support rhythm (Factorio's red ramp, CS2's showpieces). *Prototype:* a still from spawn with the greybox trestle painted one strong colour, checked against the lighthouse for which reads first.
8. **Three detail tiers per island, set by distance.** Always: an impostor or low-poly silhouette plus its tall props (cranes, a chimney, a light), as Spider-Man keeps every building's low version and its water towers. From the bridgehead or within about 300 m: the terrain mesh and textures. Before the player reaches mid-span: heightfield collider, props, water field and the island's rules state. Detail that matters only up close (small props, big mips) waits until the player slows on the far shore. *Prototype:* load Mine Isle's greybox heightfield as a second Rapier heightfield on a timer and log, on the M4 iPad, how long mesh, collider and texture each take; that sets the minimum crossing time.
9. **Hide the swap where the view is blocked, never with a screen.** Swap tiers while a headland, the bridge's truss, a tunnel portal at the far end or the fog band hides the change (Jak's obscured path). The 55 s ride is long enough to load anything; the risk is the visible pop, not the wait. *Prototype:* swap the island from impostor to full mesh at a fixed point on the greybox ride, with and without a truss portal in front, and look at a motion sheet for the pop.
10. **Fill crossings with low-stakes content that can stop at any moment.** The wagon's music can open up on the span (A Short Hike's boat theme), The Boogler's lines later can live here, stitched and interruptible (God of War), and the honk chord works across water. Never a cutscene that takes control. *Prototype:* a music layer that fades in when the wagon is over water and out on land; ask whether the crossing felt shorter.
11. **No stop for anyone else.** A friend crossing, arriving or loading an island never pauses or interrupts others (Animal Crossing's arrival screen is the warning). Each client loads islands near itself; a far friend is a marker until you get close (shared-state-at-scale's interest management). *Prototype:* two tabs, one crossing to the greybox island while the other stays on home; the home tab's frame time and rules ticks should not change.
12. **Faster crossings as later progression.** Each era's vehicle shrinks the old crossings (Wind Waker's Swift Sail, Dredge's engines); the trestle that took 55 s in era 3 takes 15 s by maglev, which makes the archipelago feel smaller and the progress felt. Keep each island's load budget below what the fastest vehicle allows. *Prototype:* a table in the layout lab of every crossing's seconds per era vehicle, flagging any under the measured load time from rec 8.
13. **Scarcity as a lever, used gently.** One new crossing per era keeps each a payoff (Mini Metro's limited bridges); if a limit feels like a wall, make it a cost (slower trains on a temporary trestle, as Mini Metro's tunnels became) rather than a cap. *Prototype:* none needed until the archipelago has two crossings; note it in the layout lab's research checks.
14. **The train ferry as a historical step.** Before a strait is bridged, a ferry that carries the wagon across on a timetable is a different crossing to look at and a natural era stage (rail first, then the bridge). *Prototype:* a flat barge that docks at the end of the line on a timetable and carries the wagon 150 m, all a function of the tick; ride it once and compare it to the trestle.

## Gaps

- No developer source on Sea of Thieves' island spacing or travel time; the numbers are player estimates.
- No Kojima Productions interview on Death Stranding 2's monorails or bridges; findings are a preview and a player essay.
- The Spider-Man numbers come from one attendee's notes; the GDC Vault video would confirm them.
- The Jak and Daxter vista swap and Animal Crossing's arrival cutscene come from articles the fetch truncated.
- No game treats a train ferry as a designed crossing; rec 14 rests on real-world rail history.
- The 20–45 s range in rec 1 is derived from the sources and Boogle's speeds, not from any one source; the greybox ride should tune it.
- Browser-specific load times for a second island (fetch, decode, Rapier heightfield build on an M4 iPad) were not measured; rec 8's prototype is that measurement.

## Sources

- Good Blood, Wind Waker interview: https://goodblood.games/wind-waker-interview
- Kotaku, why sailing took so long: https://kotaku.com/heres-why-sailing-took-so-damn-long-in-legend-of-zelda-513171965
- Zelda Universe, the Swift Sail: https://zeldauniverse.net/2019/01/29/princess-zeldas-study-why-the-sail-in-wind-waker-wasnt-always-swift/
- Game Developer, Sea of Thieves and The Goonies: https://www.gamedeveloper.com/design/how-emotional-psychology-and-the-goonies-inspired-i-sea-of-thieves-i-
- Golden Sands, Mike Chapman interview: https://medium.com/golden-sands-blogpost/interview-mike-chapman-1875fc7faac5
- Windows Central, Sea of Thieves vision: https://www.windowscentral.com/the-sea-of-thieves-vision-interview
- Sea of Thieves forum, draw distance and island detail: https://www.seaofthieves.com/community/forums/topic/51971/draw-distance-island-details
- Sea of Thieves forum, sail speed: https://www.seaofthieves.com/community/forums/topic/57827/sail-speed
- Game Developer, Dredge and fog: https://www.gamedeveloper.com/production/leveraging-the-unseen-to-turn-players-worst-fears-against-them-in-dredge
- Game Developer, how Black Salt made Dredge: https://www.gamedeveloper.com/design/trawling-in-the-deep-how-black-salt-games-made-spooky-fishing-rpg-i-dredge-i-
- Koru Cottage, Dredge interview: https://koru-cottage.com/dredge-developer-interview/
- Boiling Steam, Dredge at TGS 2023: https://boilingsteam.com/interview-with-dredge-developers-at-the-tgs2023/
- Game Rant, Dredge boat upgrades: https://gamerant.com/dredge-best-boat-upgrades/
- Game Developer, Raft Q&A: https://www.gamedeveloper.com/design/q-a-how-steam-hit-i-raft-i-stands-out-in-the-crowded-survival-genre
- itch.io, A Short Hike boating update: https://adamgryu.itch.io/a-short-hike/devlog/169706/version-18-the-boating-update-is-out-now-on-pc-and-nintendo-switch
- A Short Hike wiki, boat: https://ashorthike.fandom.com/wiki/Boat
- Switchblade Gaming, A Short Hike guide: https://www.switchbladegaming.com/cozy-games/a-short-hike-guide/
- Wikipedia, A Short Hike: https://en.wikipedia.org/wiki/A_Short_Hike
- Zelda Wiki, Korok Leaf: https://zelda.fandom.com/wiki/Korok_Leaf
- Zelda Dungeon, Ultrahand: https://www.zeldadungeon.net/tears-of-the-kingdom-developers-describe-what-was-done-to-make-ultrahand-ability-more-zelda-like/
- miketendo64, Link's new abilities: https://miketendo64.com/2023/05/11/zelda-devs-links-abilities/
- Game Informer, Death Stranding 2 preview: https://gameinformer.com/preview/2025/05/08/building-a-stronger-connection
- 314bit, building infrastructure in Death Stranding 2: https://314bit.substack.com/p/my-favorite-part-of-death-stranding
- GameRant, Death Stranding 2 bridges: https://gamerant.com/death-stranding-2-how-to-build-a-bridge/
- Islanders wiki, scoring: https://islanders.fandom.com/wiki/Scoring
- Nookipedia, bridge: https://nookipedia.com/wiki/Bridge
- Game8, New Horizons bridges: https://game8.co/games/Animal-Crossing-New-Horizons/archives/284596
- GamesRadar, New Horizons loading screens: https://www.gamesradar.com/i-love-animal-crossing-new-horizons-multiplayer-but-something-has-got-to-be-done-about-those-loading-screens/
- GamesBeat, New Horizons visiting: https://gamesbeat.com/animal-crossing-new-horizons-online-guide-how-visiting-islands-works/
- Factorio, Friday Facts #378: https://factorio.com/blog/post/fff-378
- Factorio wiki, rail ramp: https://wiki.factorio.com/Rail_ramp
- Steam, Satisfactory rail supports: https://steamcommunity.com/app/526870/discussions/0/3802778829228266292/
- 80.lv, Tiny Glade developers: https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games
- PC Gamer, Tiny Glade discoveries: https://www.pcgamer.com/games/city-builder/tiny-glade-wont-stop-delighting-me-with-new-discoveries/
- Dinosaur Polo Club, Mini Metro alpha 7: https://dinopoloclub.com/2014/03/12/mini-metro-alpha7/
- Wikipedia, Mini Metro: https://en.wikipedia.org/wiki/Mini_Metro_(video_game)
- Twinfinite, Mini Motorways interview: https://twinfinite.net/pc/mini-motorways-interview-dinosaur-polo-club-talks-aesthetics-traffic-their-name/
- Paradox, Bridges & Ports dev diary #1: https://www.paradoxinteractive.com/games/cities-skylines-ii/news/bridges-and-ports-dev-diary-bridges
- Paradox, Bridges & Ports dev diary #2: https://www.paradoxinteractive.com/games/cities-skylines-ii/news/bridges-and-ports-dev-diary-ports
- Steam Workshop, Transport Fever 2 ferries: https://steamcommunity.com/sharedfiles/filedetails/?id=2668431037
- Steam, OpenTTD ferry transfers: https://steamcommunity.com/app/1536610/discussions/0/601898665208999405/
- PlayStation Blog, God of War boat dev diary: https://blog.playstation.com/2018/08/23/god-of-war-development-diary-building-a-better-boat/
- DualShockers, God of War boat dialogue: https://www.dualshockers.com/god-of-war-boat-750-lines-dialogue/
- Wikipedia, God of War (2018): https://en.wikipedia.org/wiki/God_of_War_(2018_video_game)
- Tyler Young, notes on the Spider-Man technical postmortem: https://tylerayoung.wordpress.com/2019/04/01/marvels-spider-man-a-technical-postmortem/
- GDC Vault, Spider-Man technical postmortem: https://www.gdcvault.com/play/1026496/-Marvel-s-Spider-Man
- Game Developer, Jak and Daxter postmortem: https://www.gamedeveloper.com/design/postmortem-naughty-dog-s-i-jak-and-daxter-the-precursor-legacy-i-
- GamesRadar, making of Jak and Daxter: https://www.gamesradar.com/jak-and-daxter-the-precursor-legacy-anniversary-making-of/
- TV Tropes, Dynamic Loading: https://tvtropes.org/pmwiki/pmwiki.php/Main/DynamicLoading
