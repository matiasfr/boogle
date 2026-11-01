# Level design for island and open maps

*Research report, 1 November 2026. How shipped games lay out open maps, islands and archipelagos (Breath of the Wild and Tears of the Kingdom, Death Stranding 1 and 2, Wind Waker, A Short Hike, Outer Wilds, Mario Odyssey, Animal Crossing, Fortnite, Palworld, Valheim, Townscaper, rail sims, Disneyland), turned into recommendations for the layout lab ([boogle-2.md](../proposals/boogle-2.md), open question 6). Builds on [discovery-progression.md](discovery-progression.md), [rail-as-play.md](rail-as-play.md) and [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) without repeating them. Recommendations only; no design decisions.*

**Markers.** **[V]**: the page was fetched and the words match. **[S]**: seen only in a search summary, a recap or a wiki; check before quoting. Boogle numbers come from the code: walk 5.6 m/s, sprint 9.5 m/s ([src/physics/physics.ts](../../src/physics/physics.ts)), fog fully opaque at 520 m ([src/constants.ts](../../src/constants.ts)), POI positions from [docs/game-design/island.md](../game-design/island.md).

## The rules most applicable to Boogle

1. **Size the map from movement speed and a place you know** (BotW sized Hyrule by overlaying Kyoto and timing Link's walk). Plan Boogle's map in walk-seconds at 5.6 m/s, not metres.
2. **Something to notice every few seconds, something to do every 10–20 s of walking on home;** later islands may stretch to the "40-second" open-world heuristic only once a vehicle covers them.
3. **Three sizes of shape** (BotW's triangle rule): big landmarks to steer by, medium shapes that block the view, small ones that set the pace. A reveal is a chain: hill, then structure, then landmark.
4. **Gravity, not a path:** several POIs of different pull visible at once, so players wander between them; BotW's heat maps spread out only after this.
5. **One weenie per area** (Disney): a tall, unique landmark with long sightlines that every path points at, plus a hub everyone returns to.
6. **Distant things look smaller than you expect** (Aonuma on TotK's sky islands): the next island and the mainland need exaggerated silhouettes to read from spawn.
7. **The sea is connective tissue and a loading boundary** (Wind Waker), and the travel speed is tuned with the island spacing; seeing an island's silhouette is the lure.
8. **Change only lands on a place players already know** (Outer Wilds' failed meteor prototype): home must be learned before each era rewrites it.
9. **Infrastructure players build is the map's progress** (Death Stranding): roads and bridges that stay, visibly, for everyone. Its critics warn that arriving at already-built structures deflates; show the before.
10. **Vehicles change scale** (A Short Hike: "difficult to design interesting levels when the player can just fly anywhere"): keep home walk-scaled, and space later islands for the wagon.

## 1. Breath of the Wild and Tears of the Kingdom

**Scale from a real place [V].** Director Hidemaro Fujibayashi sized Hyrule by laying a map of his hometown over it: "I took a map of Kyoto and overlaid it on the game world", asking "It takes this much time to get from point A to point B, so how does that translate to the game?" ([Nintendo Insider](https://www.nintendo-insider.com/the-legend-of-zelda-breath-of-the-wild-map-was-inspired-by-kyoto/)). Secondary reports add that the team first prototyped on a Twilight Princess map and filled the rest with Kyoto's terrain **[S]** ([GamesRadar](https://www.gamesradar.com/breath-of-the-wild-map-started-life-as-a-scale-version-of-kyoto)).
- **Lesson:** distances are designed as travel times at the avatar's speed against a place the designer can picture.

**Field level design, CEDEC 2017 (Fujibayashi and Makoto Yonezu), from a translated summary [V for the summary]** ([gist](https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399); already partly in [_primary-source-notes.md](_primary-source-notes.md)).
- **Triangle rule:** triangles let players choose to go over or around and hide what is behind, which makes surprise possible.
- **Three scales:** the largest are "landmarks that serve as visual markers", medium ones obstruct the view, and "the smallest triangles serve the tempo".
- **Rectangles** hide completely; triangles reveal gradually. Korok seeds sit in the odd-looking variants.
- **Reveal chains:** a structure hides the tower behind it, in the chain "hill -> bridge structure -> tower".
- **What failed first:** the plan to "spread the towers throughout the map, and place game events in between" made players feel "guided" and the game "too linear".
- **Gravity:** structures of "varying visibility/importance in different places" pull players in different directions and let them get sidetracked; the second heat map was "more well distributed".

**Tears of the Kingdom's sky [V].** Fujibayashi: the team "added one sky island after another", and the designers "said we'd made the skies messy by adding too many islands". Aonuma: "I was surprised to see just how small they were when looking up at them from the ground" ([Nintendo, Ask the Developer vol. 9 part 3](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-3/)).
- **Lessons:** islands in view must be few and read as distinct shapes, and anything seen from far away must be drawn bigger than its true scale.

**The "40-second rule" [S].** Widely repeated as one interesting thing every 40 s of travel, attributed to a level designer's analysis of BotW rather than to Nintendo, with a companion rule of at least three POIs of different kinds on any horizon ([Medium, Bakharev](https://medium.com/@alexander.bakharev_16063/so-you-want-to-build-an-mmo-8-18-world-design-level-architecture-c07798d17f1c); [ResetEra thread](https://www.resetera.com/threads/40-second-rule-of-open-world-games.142132/)). The thread's pushback is useful: a fixed interval kills rhythm, and clusters contrasted with quiet stretches work better. Treat it as a heuristic for horse-and-glider scale worlds.

## 2. Death Stranding 1 and 2

- **Terrain is the challenge; routes are puzzles [V, critic].** Josh Bycer: the player works out "the best and safest route to your destinations"; mountains are impractical by vehicle "without existing infrastructure"; placed objects "once placed remain in the world" ([Game Developer](https://www.gamedeveloper.com/design/a-design-discussion-on-death-stranding)).
- **Shared building changes the map, with a cost [V, critic].** Bycer values "seeing everyone's contribution change the map", but finding others' structures already there "robs the game of that personal feeling" of conquering the land. Game Informer's opinion piece makes the same complaint **[S]** ([Game Informer](https://gameinformer.com/opinion/2021/09/24/death-stranding-is-best-played-offline)).
- **Roads are communal [S].** Road segments take donated materials from many players, and finished roads show on other players' maps once their area is connected (fan guides, e.g. [Screen Rant](https://screenrant.com/death-stranding-multiplayer-social-strand-system-online-build/)).
- **Death Stranding 2: choice of route as the design goal [V].** Lead level designer Hiroaki Yoshiike: "Players can choose which route they want to take, and we ensured all three approaches were viable throughout the game", including "navigating rougher terrains and taking the road less travelled" ([GamingBolt](https://gamingbolt.com/death-stranding-2-on-the-beach-has-a-range-of-approaches-to-every-situation-per-level-design-lead)). Storms and floods vary routes further **[S]**.
- **Kojima on the first game [S]:** older games had "valleys where you can't go. But in this game, you can go anywhere" ([Game Informer](https://gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding)).
- **For Boogle:** the rail and later causeways are Boogle's roads. The map's progress should be the infrastructure itself, and a returning player should see what changed (principle 9). The owner already ruled out heavy carrying ([boogle-2.md](../proposals/boogle-2.md), Decided), so take the infrastructure lesson, not the terrain-struggle one.

## 3. Wind Waker: the sea as connective tissue

All **[V]** from a translated developer interview ([Good Blood](https://goodblood.games/wind-waker-interview)).
- **The sea came first:** Haruhana, "The first project was to set up the sea as a field".
- **No loading was the constraint that sized everything:** Aonuma, "First and foremost was to be able to go forever without a connection"; a smaller sea would have left no time "to read the data of the island you're about to visit", and "the speed of the ship was balanced for that as well".
- **The lure is the silhouette:** the interviewer describes "seeing the faint silhouette of an island in the distance"; Aonuma: "It piques your curiosity".
- **Let people detour:** Haruhana, "The more he says 'Go over there,' the harder it will feel to take a detour."
- **Not from Nintendo:** the 7×7 grid with one island per square is a fan analysis **[S]** ([Zelda Dungeon](https://www.zeldadungeon.net/the-legend-of-zelda-the-wind-waker-an-ocean-of-missed-potential/)); critics fault the sea for long empty crossings.
- **For Boogle:** the sea matches the archipelago's loading boundaries (architecture-fit, "A world bigger than one island"), and the crossing speed and the gap between islands should be tuned together. Long empty crossings are the known failure.

## 4. A Short Hike: one compact island

- **Landmarks and lures [V].** Adam Robinson-Yu: "I tried to create interesting landmarks that would pique people's curiosity"; "In some cases, I'd just use collectables to draw players towards new areas of the map"; dig spots are often "only implied by the scenery". He balanced content along the "main paths" he expected, and "I wanted getting lost to be part of the gameplay" ([Game Developer, Road to the IGF](https://www.gamedeveloper.com/business/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-)).
- **Size [V]:** "creating a vast island was the easier part"; in hindsight he "would have liked to make some spaces a little larger" (same source).
- **Traversal sets the level design [V]:** on a sequel, it's "difficult to design interesting levels when the player can just fly anywhere" ([Game Pilgrim](https://gamepilgrim.com/2020/02/26/developer-interview-adam-robinson-yu/)).
- **No invisible walls [S].** He avoided invisible barriers and forced cutscenes, even at the start ([PlayStation Blog](https://blog.playstation.com/2021/11/13/the-award-winning-a-short-hike-hits-ps4-november-16/)); playtesters swam to nearby islands and round the back of the mountain ([Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)). The GDC postmortem covers natural barriers that gate progression and the peak visible as the goal **[S]** ([GDC Vault](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A)).
- **For Boogle:** one tall goal visible from anywhere on home, natural barriers instead of walls, and expect players to swim for the next island the moment they see it.

## 5. Outer Wilds: compact worlds that run on their own clock

**[V]** ([Game Developer](https://www.gamedeveloper.com/design/live-die-repeat-how-i-outer-wilds-i-piques-curiosity-in-an-ambivalent-solar-system)).
- Alex Beachum: "Everything is on its own clock and things are changing and happening whether you're there or not."
- **A failed prototype:** an object from space crashed into the home village like a meteor, and it fell flat because players didn't yet know the village.
- The solar system is compact, favouring depth over breadth (article's framing).
- **For Boogle:** timetabled trains and the tide are this clock. An era change rewrites home, so the first era must make home familiar before anything changes.

## 6. Mario Odyssey: density per kingdom

- **[S]** Kenta Motokura described "sandbox spaces" with a high density of gameplay in a small area, chosen to hold the team's many prototypes; setting follows mechanics (a slippery idea becomes an icy kingdom); the many-kingdoms idea came from Super Mario Bros. 3, and the miniature-garden (hakoniwa) idea is cited ([Nintendo Everything](https://nintendoeverything.com/super-mario-odyssey-director-and-producer-talk-going-deeper-into-mario-and-peachs-relationship-deciding-on-environments-more/); [My Nintendo News, GQ](https://mynintendonews.com/2017/10/25/nintendos-kenta-motokura-yoshiaki-koizumi-discussed-super-mario-odyssey-with-gq/)).
- **[V]** Motokura contrasted the two series: "I think of Zelda as this really big world where you see something far off", while Mario is about "the thing that's right in front of you and how you interact with that"; "There are certain topographical hints near areas where you're going to be looking" ([TIME](https://time.com/4816417/super-mario-odyssey-interview-e3/)).
- **For Boogle:** home is a Mario kingdom (dense, touchable, everything near), and later islands and the mainland are Zelda-like (seen far off). Each new island can be built around one mechanic, as Odyssey kingdoms are.

## 7. Animal Crossing: New Horizons

- **Size [S]:** the island is 7 × 6 acres of 16 × 16 tiles, the series' largest town map ([Nookipedia](https://nookipedia.com/wiki/Acre)). Every map is the same size; the airport-to-plaza relation is fixed, and players reshape cliffs and rivers by terraforming.
- **Why an island [S]:** Aya Kyogoku: earlier games moved you into an existing town; a deserted island is a blank canvas for DIY ([Nintendo Everything](https://nintendoeverything.com/animal-crossing-new-horizons-devs-on-the-decision-to-start-on-an-island-new-features-multiplayer-more/)).
- **Arrival and hub [S]:** visitors land at the airport on the island's edge, and the plaza is the central meeting point; planners advise keeping the plaza close to the airport for visiting ([island-planning guides](https://gamecalcs.pages.dev/acnh/island-planner)).
- **For Boogle:** a fixed arrival point at the edge, a plaza hub a few seconds in, and an island that the players reshape over time. Animal Crossing's hub-and-visiting lessons are already in [hub-and-minigames.md](hub-and-minigames.md).

## 8. Disneyland: weenies and hubs

- **Weenies [V].** Each themed area is organised around a "large highly visible landmark with long sightlines" that draws visitors toward it; visitors should "feel as though you know where you are in space"; Main Street's upper floors shrink (3/4, 5/8, 1/2 scale) so it reads as "a toy" ([The Level Design Book](https://book.leveldesignbook.com/studies/irl/disneyland)).
- **Hub and spokes [S].** The castle draws guests to a central hub, and gateways lead to each land; landmarks you can never reach still orient you ([Theory of Theme Parks](http://theoryofthemeparks.blogspot.com/2015/08/wayfinding-in-themed-design-weenie.html)).
- **Scott Rogers, GDC 2009 [S]:** "Everything I learned about level design I learned from Disneyland" turned weenies into level-design practice: landmarks that pull, altitude changes for drama, making players double back to learn something ([Boing Boing notes](https://boingboing.net/2009/03/27/gamedesign-lessons-f.html); [Kotaku](https://kotaku.com/how-disneyland-helps-make-better-video-games-5972911)).
- **Not from these sources (common knowledge, check before quoting):** the Disneyland Railroad circles the park on the perimeter berm with stations at the entrance and in the lands. A ring railway that frames the park and doubles as a tour is the closest real precedent for Boogle's timetabled line.

## 9. Fortnite: readability and growing a live map

- **Density rebalanced by adding POIs [S].** Lead level designer David Spalinski: the eastern side's spacing "offered a good pacing for loot, traversal, and combat engagement frequency", so new POIs were added west of the river; the map was split into four biomes for identity ([Fortnite Dev Deep Dive](https://www.fortnite.com/news/dev-deep-dive-map-update?lang=en-US), 403 on fetch).
- **Creative guidance [S]:** three to five quickly recognisable points of engagement in an outdoor area, open areas not overfilled, landmarks identifiable from a distance ([Epic docs](https://www.epicgames.com/fortnite/en-US/creative/docs/level-design-best-practices-in-fortnite-creative), 403 on fetch).
- **For Boogle:** a map grows by filling sparse areas and adding distinct zones, each with its own look; a group needs landmarks they can name out loud ("meet at the lighthouse").

## 10. Palworld, Valheim, Sea of Thieves: archipelagos that grow

- **Palworld [S]:** launched at about 16 km², described by CEO Takuro Mizobe as smaller than Tears of the Kingdom; it grew by adding islands, first Sakurajima and then one "about six times" larger ([TechRaptor](https://techraptor.net/gaming/news/palworld-devs-qa); [Pure Xbox](https://www.purexbox.com/news/2024/11/palworlds-next-new-island-will-be-six-times-bigger-than-its-previous-map-expansion)). This is the live-game version of the owner's plan: home stays, new islands rise, each several times larger.
- **Valheim [S]:** a seeded archipelago of biomes, each with a boss; the ocean separates land and is "mainly a vehicle for exploration", and better boats open farther coasts ([sailing guide](https://valheimgame.wiki/guides/sailing/); [GamesRadar](https://www.gamesradar.com/valheim-biomes/)). Seeds that put everything near spawn are reported as too easy ([PC Gamer](https://www.pcgamer.com/this-ridiculous-valheim-seed-places-every-boss-a-short-jog-from-the-starting-point/)): distance is part of the pacing.
- **Sea of Thieves [S]:** about 74 islands in large, small and fort categories, with regions of distinct look; large islands carry riddle maps because they have enough unique landmarks ([map guide](https://warshipsgames.com/sea-of-thieves-map-guide/)). No Rare source on spacing was found.

## 11. Townscaper, Tiny Glade: growth you watch

- **[S]** Oskar Stålberg calls Townscaper's design "radically casual": simple controls and a clear split where the player picks and the algorithm builds; he describes it as more toy than game ([PC Gamer](https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/); [Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)). Tiny Glade advertises "no management, combat, or wrong answers" (PC Gamer).
- **For level design:** construction you watch needs a spot to watch from. Each work site wants a viewing place (a slope, the court, a platform) with the site in the middle of the frame. Rail-as-play already covers the building verbs.

## 12. Rail layout lessons from Satisfactory and Factorio

Mostly community advice **[S]** ([Satisfactory guide](https://supercraft.host/article/satisfactory-train-logistics/); [Factorio forums](https://forums.factorio.com/viewtopic.php?t=24916)); Wube's grid lesson is already in [rail-as-play.md](rail-as-play.md).
- Put stations on a siding off the main line, so passing trains don't run through the platform.
- Build the spine first and extend it; outposts hang off it at a distance.
- Standardise train length so every platform fits every train.
- **For Boogle:** one spine that later eras extend toward the new islands, stations as the places people gather, and no junction puzzles: the timetable is a pure function of tick, so the layout can be simple.

## 13. General rules that recur

- **Walk time is the unit.** BotW (Kyoto timing), Wind Waker (ship speed against island spacing) and Fortnite (traversal pacing) all design in time, not distance.
- **Landmark hierarchy.** A global landmark seen from everywhere; one per region; small local ones that set the pace (BotW's three triangle sizes, Disney's weenie per land).
- **Hub and spokes for groups.** A central place everyone returns to (Disney's hub, Animal Crossing's plaza), with spokes to everything.
- **Sightline reveals.** Hide the next thing behind a medium shape and reveal it on a crest (BotW's chains, A Short Hike's peak).
- **Empty space.** Acceptable while the next lure is in view; clusters with quiet stretches between beat an even spread (ResetEra pushback, BotW gravity).
- **Spawn for drop-in.** No source here deals with it directly. What carries over: arrive at the edge of the hub (Animal Crossing's airport), with the main landmark and the current goal in the first view (principle 7). Big Walk's tools for regrouping are in [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md).
- **Vehicles change scale.** Each faster mode stretches the comfortable gap between POIs (A Short Hike's flying, Wind Waker's ship, Valheim's boats).

## What this means for Boogle's home island (eras 1–2) and the archipelago

Today's home, measured from spawn (14, 26) at walk speed: court 5 m, stall 13 m, garden 27 m (5 s), lighthouse 84 m (15 s), windmill farm 99 m (18 s), the south cave mouth 118 m (21 s). The cluster round spawn is dense; then there is a 15–20 s walk with nothing in between, the "empty" the 29 October playtest felt.

1. **Plan in walk-seconds at 5.6 m/s.** Treat 10 s as about 55 m and 20 s as about 110 m. The lab's map tool could draw walk-time rings from spawn and from each POI rather than a metre grid.
2. **Home spacing target: 8–15 s walk (about 45–85 m) between neighbouring POIs, and nothing on home more than about 25 s (140 m) from spawn.** That matches the island's own "10 to 15 s sprint" note and sits well under the 40 s heuristic, which suits horse-scale worlds, not a dense home.
3. **Something small every 3–5 s of walking (15–30 m):** a palm with logs, a rock to throw, a sign, a crate. These are BotW's small triangles. The lighthouse path is the place to start, since it is the longest empty walk.
4. **Five to seven POIs on home in eras 1–2,** in three to four clusters, three to five of them visible from any open spot (Fortnite's three to five points of engagement; the three-on-the-horizon heuristic). More than that and home stops being learnable (TotK's "messy" skies).
5. **One landmark hierarchy, three tiers.**
   - Global: the mainland port's skyline, seen from every shore.
   - Home's weenie: the lighthouse, the tallest thing on home, visible from spawn and lit at night.
   - Local: one shape per POI that names it (the windmills' sails, the cave signpost, the work site's crane or scaffold).
6. **What is visible from spawn, in the first view without turning:** the court (hub), the first work site and its sign, the lighthouse (goal), and across the water the mainland port. Turning round should show the next island's silhouette. Spawn faces the court, with the sea behind or to one side.
7. **Make the court the hub.** Spawn on its edge (as now), work site 1 and the station within about 10 s of it, every path back to it. It's where friends regroup and where opening day can be watched.
8. **The rail line should frame the court, not cross it.** Run it along one side of the court, 20–40 m away, so trains pass through the view from the hub and riders see the court. The first station sits within 10 s of spawn. The line then heads to the lighthouse and stays in view for most of its length, so each laid section is visible from home (principle 9). Disneyland's perimeter railway is the precedent: the train is a tour of everything.
9. **Point the line at the next island.** The last section of each era should end on a shore facing the next island, so the line's direction is the telegraph and the next era's bridge or causeway continues it. Death Stranding's lesson: the road is the progress.
10. **Place the next island where the reveal is earned.** It should be visible from spawn as a silhouette, but its detail is revealed by climbing the lighthouse or cresting a hill (BotW's hill, structure, tower chain). Put it 150–300 m off home's far shore: closer and home feels like one blob, farther and it starts to fade into the fog (opaque at 520 m).
11. **Draw distant things bigger than life.** The mainland port and the next island need tall, simple silhouettes (cranes, a chimney, a smoke plume, a light at night) scaled up for distance, after Aonuma's surprise at the sky islands. Test in `/look` stills from spawn.
12. **Hide with medium shapes, don't wall off.** Ridges, the massif and rock outcrops hide the caves and the far side of home; let players swim for the next island (A Short Hike's players did), and gate with water and distance, not invisible walls. A swim that is too long to finish, with a visible turn-back cue, is the gentle limit.
13. **Give every work site a place to watch from.** A slope, a deck or the court edge, with the site in the middle of the frame and its sign readable from there. Construction you watch needs an audience spot.
14. **Let home be learned before it changes.** Keep era 1's layout stable for a session or two; each era should change places players already know (Outer Wilds' meteor). Keep a trace of the before (a stump, an old plank path beside the new rail) so a returning player sees what changed.
15. **Later islands: size them for the vehicle that reaches them.** If the steam wagon runs at about 3–4× walk speed, a later island can be 3–5× home's spacing (POIs 150–300 m apart) and still feel dense from the wagon, while stations keep a walk-scaled cluster round them. Each new island is built around one mechanic and one look, like an Odyssey kingdom or a Valheim biome.
16. **Grow the archipelago Palworld-style.** Home stays; each era adds an island several times larger, joined by a physical link. Fill sparse parts before adding more (Fortnite's west-of-the-river fix). Only one or two unreached islands should be in view at a time.
17. **Drop-in spawn.** Spawn a late joiner at the hub, never at a remote island, unless a station board sends them on. Their first view should show where friends are and what the current goal is (principle 7).
18. **Check with heat maps.** BotW only saw its "guided" problem in heat maps. Logging where solo playtesters walk (positions every few seconds) on the playtest builds would show whether gravity spreads them or the rail line funnels them.

## Gaps

- No primary source on Sea of Thieves', Valheim's or Palworld's island spacing; their facts above are from guides and wikis.
- The A Short Hike GDC postmortem and Scott Rogers' GDC talk were seen only as outlines and recaps; the videos would confirm details.
- Epic's two Fortnite pages refused the fetch (403); their content comes from search summaries.
- No source covers spawn placement for drop-in co-op directly; recommendation 17 is inferred.
- The spacing numbers in the recommendations are derived from Boogle's movement speed and the heuristics above, not from any one source; the layout lab and a playtest should tune them.

## Sources

- Nintendo Insider, BotW map and Kyoto: https://www.nintendo-insider.com/the-legend-of-zelda-breath-of-the-wild-map-was-inspired-by-kyoto/
- GamesRadar, Kyoto scale: https://www.gamesradar.com/breath-of-the-wild-map-started-life-as-a-scale-version-of-kyoto
- CEDEC 2017 translation (Matt Walker): https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399
- Nintendo, Ask the Developer vol. 9 part 3 (TotK): https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-3/
- Bakharev, MMO world design (40-second and diversity rules): https://medium.com/@alexander.bakharev_16063/so-you-want-to-build-an-mmo-8-18-world-design-level-architecture-c07798d17f1c
- ResetEra, 40-second rule thread: https://www.resetera.com/threads/40-second-rule-of-open-world-games.142132/
- Game Developer, Death Stranding design discussion: https://www.gamedeveloper.com/design/a-design-discussion-on-death-stranding
- Game Informer, Death Stranding offline opinion: https://gameinformer.com/opinion/2021/09/24/death-stranding-is-best-played-offline
- Game Informer, Kojima interview: https://gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding
- GamingBolt, Death Stranding 2 level design lead: https://gamingbolt.com/death-stranding-2-on-the-beach-has-a-range-of-approaches-to-every-situation-per-level-design-lead
- Screen Rant, Death Stranding multiplayer: https://screenrant.com/death-stranding-multiplayer-social-strand-system-online-build/
- Good Blood, Wind Waker interview: https://goodblood.games/wind-waker-interview
- Zelda Dungeon, Wind Waker's ocean: https://www.zeldadungeon.net/the-legend-of-zelda-the-wind-waker-an-ocean-of-missed-potential/
- Game Developer, Road to the IGF, A Short Hike: https://www.gamedeveloper.com/business/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-
- Game Pilgrim, Adam Robinson-Yu interview: https://gamepilgrim.com/2020/02/26/developer-interview-adam-robinson-yu/
- PlayStation Blog, A Short Hike: https://blog.playstation.com/2021/11/13/the-award-winning-a-short-hike-hits-ps4-november-16/
- GDC Vault, A Short Hike postmortem: https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A
- Wikipedia, A Short Hike: https://en.wikipedia.org/wiki/A_Short_Hike
- Game Developer, Outer Wilds: https://www.gamedeveloper.com/design/live-die-repeat-how-i-outer-wilds-i-piques-curiosity-in-an-ambivalent-solar-system
- TIME, Mario Odyssey E3 interview: https://time.com/4816417/super-mario-odyssey-interview-e3/
- Nintendo Everything, Mario Odyssey environments: https://nintendoeverything.com/super-mario-odyssey-director-and-producer-talk-going-deeper-into-mario-and-peachs-relationship-deciding-on-environments-more/
- My Nintendo News, Motokura and Koizumi with GQ: https://mynintendonews.com/2017/10/25/nintendos-kenta-motokura-yoshiaki-koizumi-discussed-super-mario-odyssey-with-gq/
- Nookipedia, acres: https://nookipedia.com/wiki/Acre
- Nintendo Everything, New Horizons devs on the island: https://nintendoeverything.com/animal-crossing-new-horizons-devs-on-the-decision-to-start-on-an-island-new-features-multiplayer-more/
- ACNH island planner: https://gamecalcs.pages.dev/acnh/island-planner
- The Level Design Book, Disneyland: https://book.leveldesignbook.com/studies/irl/disneyland
- Theory of Theme Parks, the weenie: http://theoryofthemeparks.blogspot.com/2015/08/wayfinding-in-themed-design-weenie.html
- Boing Boing, Scott Rogers' Disneyland talk: https://boingboing.net/2009/03/27/gamedesign-lessons-f.html
- Kotaku, Disneyland and video games: https://kotaku.com/how-disneyland-helps-make-better-video-games-5972911
- Fortnite Dev Deep Dive, map update: https://www.fortnite.com/news/dev-deep-dive-map-update?lang=en-US
- Epic, Fortnite Creative level design: https://www.epicgames.com/fortnite/en-US/creative/docs/level-design-best-practices-in-fortnite-creative
- TechRaptor, Palworld Q&A: https://techraptor.net/gaming/news/palworld-devs-qa
- Pure Xbox, Palworld's new island: https://www.purexbox.com/news/2024/11/palworlds-next-new-island-will-be-six-times-bigger-than-its-previous-map-expansion
- Valheim sailing guide: https://valheimgame.wiki/guides/sailing/
- GamesRadar, Valheim biomes: https://www.gamesradar.com/valheim-biomes/
- PC Gamer, Valheim seed: https://www.pcgamer.com/this-ridiculous-valheim-seed-places-every-boss-a-short-jog-from-the-starting-point/
- Sea of Thieves map guide: https://warshipsgames.com/sea-of-thieves-map-guide/
- PC Gamer, Townscaper "radically casual": https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/
- Game Developer, how Townscaper works: https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making
- Satisfactory train logistics guide: https://supercraft.host/article/satisfactory-train-logistics/
- Factorio forums, train layouts: https://forums.factorio.com/viewtopic.php?t=24916
