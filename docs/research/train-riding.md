# Train riding

*Research report, 1 November 2026. What makes riding a train, or any ride-only moving platform, interesting and memorable beyond being carried: what you can do on board, views and reveals, speed, departures and arrivals, riding with friends, riding with your cargo, catching and leaving a moving train, and camera comfort. Sources: The Legend of Zelda: Spirit Tracks, Paper Mario: The Thousand-Year Door, A Hat in Time, Red Dead Redemption 2, Uncharted 2, Half-Life and Half-Life 2, BioShock Infinite, Final Fantasy VII and XV, Honkai: Star Rail, Metro Exodus, Assassin's Creed Syndicate, Pokémon, Animal Crossing, Sea of Thieves, Sky: Children of the Light, It Takes Two, Overcooked, Unrailed, Derail Valley, Train Sim World, Tears of the Kingdom, Mario Kart and Super Mario 3D World, Astro Bot, Fortnite, Roblox (Dead Rails, Stepford County Railway, a dusty trip), Subsurface Circular, Death Stranding, SnowRunner, Ghibli's and anime's trains, dark rides, Disneyland's railroad, Universal's Hogwarts Express, Japanese departure melodies and a motion-sickness study. Asked for after the owner rode the platform-carry and wagon prototypes: moving with the platform is "passably decent", and he wants to "one up this" so riding feels more interesting. Builds on [vehicle-feel.md](vehicle-feel.md) (speed, the remote rider, the on-train checklist, sway, boarding, jumping off), [rail-as-play.md](rail-as-play.md) (the handcar, switching, the ball thrown into a passing wagon) and [sea-crossings.md](sea-crossings.md) (something every 10–15 s, the far shore in view, music on the span) without repeating them. Recommendations only; no design decisions.*

**Markers.** **[V]**: fetched and read at the source. **[S]**: seen only in a search summary, a wiki, a guide, a review or a forum. **[D]**: derived for Boogle; no source states it. Boogle numbers come from the code: the wagon cruises at 3 m/s (6.5 m/s in `&v=fast`), takes 3 s to reach speed, dwells 6 s at each stop and runs out and back over the laid sections, push-pull ([src/sim/wagon.ts](../../src/sim/wagon.ts)); a flatbed's deck is 2.2 × 3.2 m and 0.7 m up, the loco's boiler top 1.75 m, three cars 3.7 m apart ([src/proto/wagon/look.ts](../../src/proto/wagon/look.ts), [src/proto/wagon/index.ts](../../src/proto/wagon/index.ts)); a rider is sent in the car's frame (presence `riding`, [src/physics/platforms.ts](../../src/physics/platforms.ts)); walking is 5.6 m/s, sprinting 9.5.

## Summary

1. **Being carried is the floor, not the fun.** The rides people remember give you something to look at, something to do, someone to be with, and a moment at each end (Hogwarts Express, Spirit Tracks, the Excess Express, Sea of Thieves).
2. **A ride is a stage.** Theme parks treat the vehicle as the thing that points riders at the show (dark rides, the Haunted Mansion's turning cars, Disneyland's flatcars turned to face the Grand Canyon diorama), and Universal found guests saw the Hogwarts Express as an attraction, not transport.
3. **Boogle's train can be choreographed like a dark ride.** Its place is a pure function of the tick, so lineside beats that fire as it passes are seen at the same moment by every rider and onlooker, at no network cost. Few open-world games can do this so cheaply.
4. **One verb on board carries a lot.** Spirit Tracks' whistle cord clears animals off the line; Sea of Thieves' shanties let anyone lead and others join in tune; Sky's benches turn sitting together into talking.
5. **Sitting is a feature.** Seats that face the view, a camera that settles, and permission to do nothing (Train Sim World's window seat, FFXV's auto drive, RDR2's cinematic travel camera, Spirited Away's quiet window) make a ride restful rather than dead.
6. **Dead time is the main complaint.** Spirit Tracks' train is called charming but painfully slow, and Half-Life's tram is faulted for having little to do and no skip. A ride must be leavable at any moment and easy to catch again.
7. **The ends of a ride are events.** Japanese departure melodies (about 7 s, often one per station, meant to calm), the Hogwarts Express's greeters at each end, Subsurface Circular's stops that punctuate a conversation.
8. **Catching and leaving a moving train is the action fantasy** (RDR2, Assassin's Creed Syndicate, Fortnite, Uncharted 2, Paper Mario's one roof fight). Keep it forgiving; Super Mario 3D World's train that leaves you behind is the counter-example.
9. **Cargo is better as a co-passenger** (Spirit Tracks' freight cars, Kiki asleep in the hay, Derail Valley's object creeping off the shelf, Unrailed's and Dead Rails' wagons). For Boogle the payoff is riding in with your crates and watching them become the building.
10. **Comfort: keep an earth-fixed horizon** (the only cue that reduced visually induced sickness in a 2020 headset study), never roll the camera, and filter the deck's bumps out of a seated view.

## Findings by source

### 1. The Legend of Zelda: Spirit Tracks (2009)

- **[V]** In Iwata Asks, Aonuma traces the train to a picture book about children laying a railway. For about a year of a two-year project, players laid their own track; it was dropped because players didn't know where to lay it and the story needed places that were closed at times. The tracks were recast as erased ones that Link restores bit by bit. Testers found the fixed routes easy to understand; Aonuma argued that a set destination still leaves freedom in how the network grows, and Iwata that complete freedom leaves you not knowing what to do ([part 3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/3-Play-That-s-Only-Possible-on-a-Train/3-Play-That-s-Only-Possible-on-a-Train-226909.html); [PixlBit summary](https://pixlb.it/news/672/iwata_asks_spirit_tracks_parts_three_and_four)).
- **[V]** The play the train made possible: on single-line track you can't dodge an oncoming train, so you read the map, back up, switch at a fork and wait for it to pass. Aonuma: "Play like that wouldn't be possible without a train."
- **[V]** The train has four parts you customise (engine, cannon, passenger cars, freight cars), swapped for treasures that differ per player, and several whistles with their own sounds, some not train-like at all ([part 4](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/4-Customising-the-Train/4-Customising-the-Train-226974.html)). Some staff argued a train didn't fit Zelda; the team kept it ([part 5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/5-When-You-Hear-That-Zelda-Sound-/5-When-You-Hear-That-Zelda-Sound--227029.html)).
- **[S]** On the rails: the whistle is a rope you pull down on the touch screen, and it scares animals and some monsters off the track. Lineside signs ask you to whistle, slow down, or stop inside a stop zone; passengers get upset if you ignore them or overshoot their station. Freight cars carry cargo between stations, and some enemies try to steal it ([Zelda Wiki: Train Whistle](https://zeldawiki.wiki/wiki/Train_Whistle), [Whistle Sign](https://zeldawiki.wiki/wiki/Whistle_Sign), [Rule Three of the Rails](https://zeldawiki.wiki/wiki/Rule_Three_of_the_Rails), [Cargo](https://zeldawiki.wiki/wiki/Cargo)).
- **[S]** Reviews split: charming but painfully slow (GamesBeat), the train sections listed as a con in an 8/10 review (Gamereactor), slowest of all when reversing (Zelda Dungeon) ([GamesBeat](https://gamesbeat.com/suffer-for-fun/), [RPGFan](https://www.rpgfan.com/review/the-legend-of-zelda-spirit-tracks/), [Zelda Dungeon](https://www.zeldadungeon.net/?p=1653)).
- **Lesson:** one tactile verb (the cord) and readable lineside cues make a ride feel played. Time is the cost: a ride you must sit through gets called a chore.

### 2. Paper Mario: The Thousand-Year Door, the Excess Express (2004)

- **[S]** Chapter 6 is a three-day trip, and the train is a level: a locomotive, three passenger cars with eight numbered cabins, a dining car with a shop, and a baggage car. Each cabin holds a passenger with a small theft or favour (a ring, stolen stew, a missing blanket), so the trip is a run of errands among neighbours ([Super Mario Wiki](https://www.mariowiki.com/Excess_Express)).
- **[S]** A mid-trip stop at Riverside Station: you leave the train to lower a drawbridge so it can go on, and enemies sneak aboard while you're away.
- **[S]** The roof opens exactly once, for the fight on top of the train the next morning.
- **[S]** Afterwards the ticket stays: the train is a ride you can take again, with random passengers, and you can sleep through the trip.
- **[V]** A preview of A Hat in Time's train level names this chapter as its model ([Hardcore Gamer](https://hardcoregamer.com/previews/a-hat-in-times-owl-express-makes-for-a-terrific-level/271678/)).
- **Lesson:** a train is at its best as a small neighbourhood with small needs; the roof is saved for one special beat; after the story the ride stays, as something to just take.

### 3. A Hat in Time: Murder on the Owl Express and Train Rush (2017)

- **[S]** The Owl Express is bigger inside than out (side rooms, floors, a surveillance room wider than the train); its mystery act is stealth and evidence-hunting more than riding ([wiki](https://ahatintime.wiki.gg/wiki/The_Owl_Express), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/AHatInTime)).
- **[S]** Train Rush: two minutes to get from the caboose to the switch at the front before a bomb goes off, with watches that add time, lava and acid cars, and a stretch outside as parts of the train fly off ([wiki](https://ahatintime.wiki.gg/wiki/Train_Rush)).
- **Lesson:** "get to the front of the train" is a strong shape. For Boogle the safe version is untimed and goofy (principle 10).

### 4. Red Dead Redemption 2 (2018)

- **[S]** Rob Nelson's stated aim: you can leap onto a train at full speed, climb into the cars, take a bag and slip off unseen ([Wccftech](https://wccftech.com/rockstar-talks-about-rdr2-evolved-npcs/)).
- **[S]** Players call their horse to gallop beside the train while they move car to car; robberies stopped in a tunnel or on a bridge draw no lawmen ([Kotaku](https://kotaku.com/my-nice-guy-approach-to-a-red-dead-redemption-2-train-r-1830713734), [GTAForums](https://gtaforums.com/topic/920854-let%E2%80%99s-talk-about-how-to-actually-rob-a-train-with-no-bounty/)).
- **[S]** Passenger tickets are bought from the station's clerk and skip to the destination; climbing aboard instead lets you sit through the ride. The cinematic camera is the game's relaxed travel view on horseback; I couldn't confirm it on trains ([Twinfinite](https://twinfinite.net/2018/10/red-dead-redemption-2-ride-train/), [RDR2.org forum](https://www.rdr2.org/forums/topic/1357-cant-legally-ride-trains-and-stagecoaches-in-real-time)).
- **Lesson:** one train serves two fantasies: the action of boarding it moving and the rest of riding it. A skip respects the player who only wants to arrive (Boogle's board, `&v=hop`, already is one).

### 5. Uncharted 2: Among Thieves (2009)

Already in vehicle-feel §7: the train really moved, broke physics and aim, and gave Naughty Dog the mantra that what works on the train works everywhere.

- **[V]** The train ran on a big loop; cutscenes masked the area transitions; the fight runs across moving cars against mercenaries and a missile-firing helicopter ([80.lv](https://80.lv/articles/the-secrets-of-the-train-level-in-uncharted-2)).
- **[S]** The game opens on the wreck: Drake wakes in a train car hanging off a Himalayan cliff and climbs out while it shifts ([Uncharted Wiki](https://uncharted.fandom.com/wiki/The_Trainwreck), [GamingBible](https://www.gamingbible.com/news/platform/playstation/uncharted-2-opening-scene-hailed-one-gamings-greatest-573374-20240307)).
- **Lesson:** a train is memorable when its outside is a place: roofs, gaps, sides.

### 6. Half-Life (1998) and Half-Life 2 (2004)

- **[S]** Marc Laidlaw: the tram began when a programmer built a new track-following train entity and asked for it to be shown off. A door couldn't be parented to the moving tram, so the player starts inside it ([PC Gamer](https://www.pcgamer.com/half-life-is-20-why-everything-you-liked-about-valves-classic-was-a-secret-train/), [Combine OverWiki](https://combineoverwiki.net/wiki/Black_Mesa_Transit_System)).
- **[S]** The ride crosses six maps that load at thresholds, with no loading screen; you keep control throughout (look round, move inside the car) while the facility and its exposition go by ([Medium](https://medium.com/@gameswithoutthepolitics/the-greatest-video-game-levels-of-all-time-half-life-black-mesa-inbound-20c170fb6629), [Run Think Shoot Live](https://www.runthinkshootlive.com/posts/half-life-black-mesa-inbound/)).
- **[S]** Criticism: little to do and no skip; Valve changed its approach for Half-Life 2, which opens on a train arriving at City 17 ([Combine OverWiki](https://combineoverwiki.net/wiki/Train_to_City_17)).
- **Lesson:** a ride can onboard and build a world at once if control is never taken; the window must be busy and the ride leavable or short.

### 7. BioShock Infinite's Sky-Lines (2013)

- **[V]** Levine pitched them as roller coasters stacked on roller coasters that you jump between while being shot at; crossing lines let you change direction, evade, or drop on enemies; they widen your options rather than dictate them ([Kotaku](https://kotaku.com/bioshock-infinites-sky-line-combat-explained-by-ken-lev-5645527)).
- **[S]** The system grew out of the question of how freight moves round a floating city; Levine stressed it is not a people mover ([GameSkinny](https://www.gameskinny.com/culture/game-veteran-ken-levine-discusses-his-inspirations-for-bioshock-infinite/), [GamerFront](https://gamerfront.net/2011/06/bioshock-infinite-ken-levine-speaks-about-skylines-in-developer-diary/9659)).
- **Lesson:** rails stop being transport when you can leave them anywhere; freight lines that people ride are a natural origin, as Boogle's crate wagons are.

### 8. Final Fantasy VII and XV

- **[S]** Final Fantasy VII opens with Cloud on a train pulling into a station under the city. In the remake's train ride, an ID scan raises an alarm and sends you car to car ahead of a timer (no game over), then off the train ([Kotaku](https://kotaku.com/1841693218), [GameWith](https://gamewith.net/ff7/article/show/17707), [walkthrough](https://cavediverchris.github.io/Final-Fantasy-7-Walkthrough/walkthrough/chapter-04-sector-5-reactor.html)).
- **[S]** Final Fantasy XV is a road movie: Tabata called the car an extra party member; in auto mode Ignis drives while the party talks and you take in the view, and you can pull over any time ([Siliconera](https://www.siliconera.com/final-fantasy-xv-details-on-how-youll-get-to-cruise-on-the-regalia/), [Final Fantasy Wiki](https://finalfantasy.fandom.com/wiki/Regalia_(Final_Fantasy_XV))). Its late train chapter is where critics say the journey was taken away: you can't leave the path on a train ([VideoGamer](https://www.videogamer.com/news/why-final-fantasy-xvs-closing-stages-are-a-linear-experience), [AV Club](https://www.avclub.com/pt-2-after-a-strong-start-final-fantasy-xv-begins-to-1798189908)).
- **Lesson:** handing the driving to someone else frees you to look and talk; the ride sours when it becomes a corridor you can't leave.

### 9. Trains as homes: Honkai: Star Rail, Metro Exodus, Assassin's Creed Syndicate

- **[S]** Honkai: Star Rail's Astral Express is the home base: a parlor car where the conductor, Pom-Pom, wanders (never in the same place twice), small quests about the train itself (its lights), your own room to customise, a party car added in an update. The developers name the Express's journey as what best represents the game ([Game8](https://game8.co/games/Honkai-Star-Rail/archives/413280), [Game Rant](https://gamerant.com/honkai-star-rail-astral-express-minecraft-build/), [MMORPG.com](https://www.mmorpg.com/interviews/honkai-star-rail-interview-hoyoverse-on-villain-design-combat-pacing-and-what-defines-star-rails-soul-2000137912)).
- **[S]** Metro Exodus' Aurora starts as an engine and gains cars and crew; you come back to the train to talk with the people who joined; Prokhorov said it keeps changing along the journey ([Game Informer](https://gameinformer.com/feature/2019/01/25/metro-exodus-cover-story-leaving-the-rails), [GamingBolt](https://gamingbolt.com/metro-exodus-15-things-you-need-to-know-before-you-buy-it)).
- **[S]** Assassin's Creed Syndicate's hideout is a train always moving through London, with upgrades and side missions; a producer describes climbing on top, unhooking wagons and riding it across the city as fast travel ([Ubisoft retrospective](https://www.ubisoft.com/en-us/game/assassins-creed/news/4PF3Ly5nME4dDau8EB9qXF/celebrating-the-10th-anniversary-of-assassins-creed-syndicate), [GamesRadar](https://www.gamesradar.com/uk/assassins-creed-syndicates-producer-talks-twins-thames-and-trains/)).
- **Lesson:** a train becomes a place when it accumulates: new cars, new people, your things.

### 10. Arriving by train: Animal Crossing and Pokémon

- **[S]** Animal Crossing opens on a train where Rover chats with you and, through the chat, sets your name, look and town; New Leaf repeats it. One reviewer's strongest memory of the game is that first ride ([Nookipedia](https://nookipedia.com/wiki/Train), [Netto's Game Room](https://www.nettosgameroom.com/2012/08/animal-crossing-gcn-classic-review.html), [Ludo guide](https://www.ludo.guide/guide/animal-crossing-new-leaf/getting-started/welcome-to-your-town/on-the-train)).
- **[S]** Pokémon Sword and Shield: the train to Motostoke stops early because a flock of Wooloo is on the line, which opens the Wild Area; the line clears later in the story ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Meetup_Spot), [GamesRadar](https://www.gamesradar.com/pokemon-sword-and-shield-guide-walkthrough/4)).
- **Lesson:** a train ride is the classic threshold into a world, and an animal on the line is a gag that also gates gently.

### 11. Sea of Thieves: the ship as a social space

Already covered: walk-up ship jobs with no roles ([sea-crossings.md](sea-crossings.md) §2) and proximity voice ([proximity-voice.md](proximity-voice.md) §1.5).

- **[S]** Instruments: whoever starts a shanty plays the melody, and anyone who joins plays a simpler backing part, so a crew sounds good together without skill; grog puts you out of tune, and playing underwater sounds muffled ([wiki](https://seaofthieves.wiki.gg/wiki/Instruments), [Gfinity](https://www.gfinityesports.com/article/sea-of-thieves-instruments-shanties)).
- **Lesson:** a crew riding together needs idle verbs that sound good together. Boogle's honks already form chords; riding is where they meet.

### 12. Sky: Children of the Light

- **[S]** Jenova Chen describes social benches where players sit together and exchange text chat; players can hold hands, hug and high-five; becoming friends needs both to agree; players should spend time together because it feels good, not to unlock something ([PC Gamer](https://www.pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc/), [TheGamer](https://www.thegamer.com/sky-children-of-the-light-interview-jenova-chen-online-gamers-friendly/)).
- **Lesson:** sitting down next to someone is a social act; a bench is a social mechanic.

### 13. It Takes Two and Overcooked: co-op on moving things

- **[S]** In It Takes Two's Rose's Room, a toy train runs on a track you wait beside and hop onto; one player boards as the conductor, the other as a rider ([Twinfinite](https://twinfinite.net/guides/it-takes-two-on-rails-experience-trophy-achievement/)).
- **[S]** One Overcooked level splits the kitchen across two catering trucks that drift apart and line up again; players fling ingredients across the road. Phil Duncan added moving hazards to keep players re-planning; the challenge is talking to each other, not the inputs ([Slant](https://www.slantmagazine.com/games/overcooked/), [Game Developer](https://gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-)).
- **Lesson:** two moving decks that separate and meet again make cooperation without rules.

### 14. Unrailed and Dead Rails: the train as the problem

- **[S]** Unrailed: the train never stops and you lay track ahead of it; the team shares one tool of each kind; each level is faster ([Co-Optimus](https://www.co-optimus.com/interview/2510/page/1/unrailed-2-back-on-track-developer-interview.html), [GamerMatters](https://gamermatters.com/unrailed-is-a-co-op-multiplayer-game-about-building-railroad-tracks-for-a-moving-train/)).
- **[S]** Dead Rails (Roblox, 2025): the train is a moving base you fuel, fortify and defend across a long journey, and night is dangerous ([games.gg](https://games.gg/news/dead-rails-roblox-zombie-game/), [Max Power Gaming](https://www.maxpowergaming.co/post/how-dead-rails-became-hottest-roblox-game)).
- **Lesson:** a train you look after is a co-op game of its own; Boogle's `&v=stoke` is that idea. A ride-only train needs its interest from elsewhere.

### 15. Derail Valley and Train Sim World: being in a real train

- **[V]** In Derail Valley you can set something on a shelf in the cab and watch the engine's vibration walk it slowly off onto the floor; the preview's point is standing in a full-size cab and working it by hand ([Gaming Nexus](https://www.gamingnexus.com/Article/5891/Derail-Valley/)).
- **[S]** You can walk in and out of any locomotive ([Steam](https://store.steampowered.com/app/588030/Derail_Valley/)); Train Sim World players cite Derail Valley's lean control when asking for their own.
- **[S]** In Train Sim World you can board a passenger train on foot, sit, and look out of the window for a few minutes; players keep asking for a head-out-of-the-window view and window hanging on steam stock ([GamingTrend](https://gamingtrend.com/feature/reviews/riding-the-rails-train-sim-world-review), [Dovetail forum: Passenger View](https://forums.dovetailgames.com/goto/post?id=48727), [window hanging](https://forums.dovetailgames.com/posts/493130/)).
- **Lesson:** small physical tells sell a ride, and leaning out is the most-wanted passenger verb.

### 16. Nintendo's rails and trains: Tears of the Kingdom, Mario Kart, Super Mario 3D World, Astro Bot

- **[S]** Tears of the Kingdom: minecarts on sky-island rails; broken rails are crossed by building (fans, wings, hooks), with no single answer ([Prima Games](https://primagames.com/tips/how-to-cross-broken-rails-on-great-sky-island-in-tears-of-the-kingdom)).
- **[S]** Mario Kart 64's Kalimari Desert: trains are obstacles at level crossings with bells sampled from real Japanese crossings (Mario Kart 7 swapped in American bells); a later version adds a ramp over the second crossing. Mario Kart World lets you grind along train tracks ([Super Mario Wiki](https://www.mariowiki.com/Kalimari_Desert), [Train (obstacle)](https://www.mariowiki.com/Train_(obstacle)), [Kotaku](https://kotaku.com/mario-kart-world-rail-wall-charge-jump-ride-switch-2-1851784648)).
- **[S]** Super Mario 3D World's Bullet Bill Express and Bowser Express: each car has its own hazard, the camera moves with the train, and missing it leaves you behind for a lost life ([The Bowser Express](https://www.mariowiki.com/The_Bowser_Express), [Coin Express](https://mariowiki.com/Coin_Express)).
- **[S]** Astro Bot: Doucet is proudest of physics and haptics working together, and of the contrast between surfaces (grass, then metal); the team deliberately holds back from rumbling all the time ([One More Game](https://onemoregame.ph/2024/09/astro-bot-director-nicolas-doucet-interview/), [VGC](https://www.videogameschronicle.com/features/astro-bot-how-team-asobi-has-turned-playroom-into-a-galaxy-sized-sequel/)).
- **Lesson:** a crossing with a bell is a cheap, rich moment; changes in what's underfoot are felt more than seen.

### 17. Fortnite's trains and Lazy Links

- **[S]** Chapter 5's freight train looped almost the whole island in about 9 minutes, with Reckless Railways as its station; you could board anywhere, hide inside or fight from the roof, and capture it by beating its guards for the vault car's loot. Chapter 6's open cars have no doors, so you mantle between them ([GameSpot](https://gamespot.com/articles/fortnite-map-changes-in-chapter-5-season-1-trains-bosses-and-more/1100-6519643/), [Dexerto](https://dexerto.com/fortnite/fortnite-chapter-5-season-1-train-explained-how-to-heist-locations-more-2414315), [Fortnite Wiki](https://fortnite.fandom.com/wiki/Train)).
- **[S]** Lazy Links, the Season 5 golf course, brought the All-Terrain Kart, a souped-up golf cart, rather than a train ([Game Informer](https://www.gameinformer.com/news/2018/07/12/fortnite-season-5-is-here-and-it-brought-golf-carts)).
- **Lesson:** a train that loops the whole map and can be boarded anywhere is a moving landmark and a free ride for whoever is near it.

### 18. Roblox: Stepford County Railway, a dusty trip, cart rides

- **[S]** Stepford County Railway runs timetabled passenger services with driver, guard, dispatcher and signaller roles, and players who just ride ([Roblox Wiki](https://roblox.fandom.com/wiki/Stepford_County_Railway)).
- **[S]** a dusty trip (2024) is a road trip across a desert for up to 25 per server; its variants peaked near 58,000 concurrent players ([RoWatcher](https://rowatcher.com/games/5650396773/a-dusty-trip-car)).
- **[S]** Cart-ride games are a long-lived Roblox genre; I found no reliable source on why ([RoWatcher](https://rowatcher.com/games/4858350084/cart-ride/dying)).
- **Lesson:** young players will play at being on the train; the guard's whistle and flag are a role people take for fun.

### 19. Subsurface Circular (2017)

- **[V]** Mike Bithell's GDC 2018 level design workshop talk was about robots talking on a train: using a level designer's toolbox to make a two-hour commuter chat feel good, and where that failed ([Game Developer](https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a)).
- **[S]** The whole game is one carriage; passengers get on and off at stops, and announcements of the next stop punctuate the story ([Wikipedia](https://en.wikipedia.org/wiki/Subsurface_Circular), [Haywire](https://haywiremag.com/columns/mixed-media-tunnel-vision/)).
- **Lesson:** stops are a rhythm, and who gets on and off is content.

### 20. Death Stranding and SnowRunner: rides as journeys

- **[V]** Death Stranding: near a destination the ambient score gives way to a chosen song, the camera slowly pulls out until Sam is small in the landscape, and most of the HUD fades, all without taking control ([Escapist](https://www.escapistmagazine.com/death-stranding-music-most-effective-low-roar-kojima/)).
- **[S]** SnowRunner: reviewers call it slow but satisfying; its designers put small tasks in every new area; in co-op a friend winches you out ([GamingBolt](https://gamingbolt.com/?p=440443), [Top Gear](https://www.topgear.com/car-news/gaming/gaming-review-snowrunner-slow-satisfying), [Third Coast Review](https://thirdcoastreview.com/2020/05/04/game-review-snowrunner)).
- **Lesson:** a journey's high point is a planned moment at a place: a song, a camera that steps back, a quiet screen.

### 21. Ghibli and anime trains

- **[S]** Spirited Away's sea railway: Miyazaki told a Paris press conference it mattered that the window showed no mountains or forest, only sea; critics read the scene as the film's breathing room ([Rail Target](https://www.railtarget.cz/passenger/reallife-spirited-away-a-japanese-train-ride-resonates-with-miyazakis-iconic-sea-railway-6143.html), [Screen Rant](https://screenrant.com/spirited-away-train-scene-miyazaki-opus-op-ed/)). To Roger Ebert he called the gap between claps *ma*, and said action with no breathing space is just busyness ([RogerEbert.com](https://www.rogerebert.com/interviews/hayao-miyazaki-interview)).
- **[S]** Kiki's Delivery Service: Kiki and Jiji shelter overnight in a freight car's hay and wake to the train running along the coast, then fly over the port town ([Wikipedia](https://en.wikipedia.org/wiki/Kiki%27s_Delivery_Service)).
- **[S]** The Wind Rises: on a train, the wind takes Jiro's hat; Naoko catches it and nearly goes over the side ([Ghibli Wiki](https://ghibli.fandom.com/wiki/Naoko_Satomi)).
- **[S]** Writers trace Hideaki Anno's trains to the early-cinema "phantom ride" and read Shinkai's as connection and separation ([Animation Studies](https://blog.animationstudies.org/hideaki-annos-train-sets/), [Weedy, FORUM](https://journals.ed.ac.uk/forum/article/download/2906/3952)).
- **Lesson:** stillness, wind and a stowaway's view are as much a train's feel as speed.

### 22. Theme parks: dark rides, the Omnimover, Disneyland's railroad, the Hogwarts Express

- **[V]** Dark-ride designers: the story defines the experience and the ride system delivers it; rides that lead with the vehicle end up technically impressive but emotionally weaker; the building decides how well you control sightlines, sound and light; rides now pack more visual moments into the same length; start by asking who the rider is in the story ([Blooloop](https://blooloop.com/how-to-design-dark-ride/)).
- **[S]** A typical dark ride moves at about 1 m/s and lasts 3–6 minutes ([Preston & Barbieri](https://www.prestonbarbieri.com/rides-bumper-cars/family-rides/dark-ride/), [Deep Arrival](https://deeparrival.com/theme-parks/dark-ride-indoors/)).
- **[S]** The Haunted Mansion's cars turn at set moments to point riders at the show; a breakdown once left one facing the wall instead of a window ([AllEars](https://allearsnet.com/tp/mk/haunted-mansion.htm), [BlogMickey](https://blogmickey.com/2020/03/details-on-haunted-mansion-ride-breakdown-at-magic-kingdom/)).
- **[S]** Disneyland Railroad: the Grand Canyon diorama (1958) fills a tunnel on the line, and the flatcars were turned to face it; dinosaurs from the 1964 World's Fair joined it in 1966 ([Disney Wiki](https://disney.fandom.com/wiki/Disneyland_Railroad), [MiceChat](https://www.micechat.com/255661-disneyland-revealed-primeval-world/), [V] for Walt Disney's love of trains and miniature dioramas).
- **[S]** Universal's Hogwarts Express: compartments with a projection screen for a window and shadows of characters passing in the corridor; a different show in each direction, about 4 minutes each; 676 m at 12.2 km/h (3.4 m/s, close to the wagon's 3 m/s); greeters at both ends; a guest survey found people saw it as an attraction rather than transport, so each train went from two coaches to three ([Wikipedia](https://en.wikipedia.org/wiki/Hogwarts_Express_(Universal_Orlando_Resort))).
- **Lesson:** the vehicle points the rider at the show; each direction gets its own show; at about 3 m/s people treat a train as the attraction when something happens every few seconds.

### 23. Japanese departure melodies

- **[S]** JR East began replacing harsh departure bells with short melodies in 1989; railways aim at about 7 s, a typical dwell; many stations or lines have their own tune; departure tunes are meant to calm, arrival tunes to rouse; worry that tunes make people rush led JR East to trial onboard speakers instead ([Wikipedia](https://en.wikipedia.org/wiki/Train_melody), [Japan Times](https://japantimes.co.jp/life/2019/06/15/lifestyle/departure-melodies-celebrating-jingles-contribution-rail-experience-japan), [JRPass](https://www.jrpass.com/blog/japan-train-station-music-what-hassha-merodii-is-and-why-every-station-has-its-own)).
- **Lesson:** a departure can be a short signature tune per station that says "doors closing" without stress.

### 24. Comfort: the horizon

- **[V]** Hemmerich, Keshavarz and Hecht (2020): in a simulated flight in a headset, only an earth-fixed horizon line reduced visually induced motion sickness; a line fixed to the head and a fixation cross did not. The effect was modest and sickness was low overall ([Frontiers in Virtual Reality](https://www.frontiersin.org/articles/10.3389/frvir.2020.582095/full)).
- **[S]** Duh, Parker and Furness (2004): a background that moves with the real world (matching the inner ear) reduced sickness in a driving simulator ([PolyU](https://research.polyu.edu.hk/en/publications/an-independent-visual-background-reduced-simulator-sickness-in-a-/)).
- **Lesson:** keep a level, world-fixed horizon in view while riding and never roll the camera (vehicle-feel already rules out translational shake).

## What recurs

- **The vehicle serves the show.** Dark rides, Disneyland's turned flatcars, the Hogwarts windows, Half-Life's working facility: riders remember what the ride pointed them at.
- **One tactile verb on board.** A whistle cord (Spirit Tracks), an instrument (Sea of Thieves), a bench (Sky), a bag to snatch (Red Dead's robberies at their simplest).
- **Places on the train, each with a mood.** Seats facing out (Disneyland, Train Sim World), the roof saved for a big beat (Paper Mario, Uncharted, Fortnite), the front as the goal (Train Rush), the gaps between cars (Fortnite's mantling), the freight car (Kiki).
- **Ends are events.** Tunes, greeters, announcements, stops that change who's aboard.
- **Leavable at any moment.** Every complaint (Spirit Tracks, Half-Life, FFXV's train chapter) is about being stuck; every fantasy (RDR2, Syndicate, Fortnite) is about getting on and off where you like.
- **Trains accumulate.** Cars, crew, rooms, decorations (Metro Exodus, Honkai: Star Rail, Syndicate, Spirit Tracks' parts).
- **Quiet stretches are designed, not left over** (Spirited Away's window, Death Stranding's silence before the song).

## What this means for Boogle

The platform carry works: that's the floor. What the sources add is everything around it. Boogle's timetabled train has one advantage most of these games lack: `wagonAt` is a pure function of the tick, so the whole line can be choreographed like a dark ride, and every rider, every onlooker and every remote friend sees the same beat at the same moment, with no messages. Unless a recommendation says otherwise, it is Local, or an Owner presence key, and needs no new lockstep op. All controls reuse Interact (X / Square), Use, Jump and Honk; none needs a new key.

### Top five

1. **Lineside beats that fire as the train passes** (dark rides, the Hogwarts windows, Disneyland's diorama, Half-Life's working facility, Subsurface Circular's stops; sea-crossings rec 2 sets the 10–15 s rhythm for crossings).
   - Each beat has an anchor on the route and starts when `wagonAt` puts the loco 25 m away (about 8 s at 3 m/s), so riders see it coming; it lasts 4–8 s; one every 10–20 s of ride.
   - A beat reacts to the train: gulls lift off as it nears, a crane holds its swing until the loco is under it, grass bends in its wash, a figure at a crossing waves.
   - Sync: the trigger reads `wagonAt`, so it is lockstep without state; the visuals are Local. Watchers on the ground get the show too, so the train is part of everyone's island, not only the riders'.
   - **Smallest prototype:** `?room=proto-wagon&proto=wagon&v=show`, three greybox beats on today's route: a crane arm swings a plank over the line near the build site (outbound only); twenty white boxes lift off the beach as the loco nears (both ways); a block figure at a path crossing waves and loses its hat (return only, so the way back isn't a rerun, as on the Hogwarts Express). Live through `onVariant`; count beats seen while on board and rides that carry on past a stop.
   - **Gut question:** did you stay on to see what came next?
2. **Seats that face the view, and a passenger camera** (Disneyland's flatcars, Train Sim World's window seat, FFXV's auto drive, RDR2's travel camera, Sky's benches).
   - One bench per flatbed facing out (back to back, so one side faces the sea each way). Interact sits you (`registerInteractable`, verb "Sit"); Jump or Interact stands you up.
   - Seated camera [D]: closer and lower (about 4.5 m), aimed 60–80° off the direction of travel towards the bench's side, horizon in the upper third, no roll, the deck's bumps low-passed out (rec 13). The look stick pans ±70° and eases back after 2 s idle.
   - Sync: Owner, a new presence key `seat` (car and seat index) beside `riding`; a missing key means standing. Additive, so mixed builds are safe.
   - **Smallest prototype:** `&v=bench` on the wagon card. Count seconds seated per ride and rides taken seated.
   - **Gut question:** did you sit down and just watch the island go by?
3. **A verb as you pass: snatch the bag, toss it in the hopper** (Spirit Tracks' one verb, Overcooked's flinging across moving trucks, rail-as-play's ball into a passing wagon; real railways' mail-bag exchange at speed is the model [D]; vehicle-feel §2's hold-not-time lesson from Mario Kart).
   - A bag hangs from a lineside arm at deck-edge height; further on, a hopper with a 2 m mouth stands by the line.
   - Hold Interact as you come up to the arm (the prompt shows 3 s out) and your arm stays out; pass within 1.2 m and you snatch it, otherwise you whiff and spin. At 3 m/s the window is about 0.8 s and holding makes timing irrelevant. Throw the bag (Use) into the hopper: a puff and a thunk, nothing earned (principle 1).
   - The ball works too: it rides decks and can go in the hopper (check that throws keep the deck's velocity, vehicle-feel rec 11).
   - Sync: Local; counts only.
   - **Smallest prototype:** `&v=snatch` with one arm and one hopper on the route. Count grabs, whiffs and bags in.
   - **Gut question:** did you go round again to try it once more?
4. **Departures and arrivals as small ceremonies** (Japanese departure melodies, the Hogwarts greeters, Subsurface Circular's stops, Paper Mario's ticket; vehicle-feel rec 13 already asks for a 2.5 s whistle and a bell at 4 s).
   - Departure: the 6 s dwell gets a 6–7 s signature cue per station; the board's flaps count down; drop-chains across the flatbed ends close 1 s before the off and drop at the next stop, so the moment reads at a glance; anyone on the platform can ring the station bell (Interact) to wave it off, though it leaves on time either way.
   - Arrival: the station's nameboard slides past at eye height, a two-note arrival cue, the chains drop.
   - Sound: the old whistle and clacks were cut in the audit, so the prototype is visual (pips, chains, boards) or uses kept sounds (the board whoosh, the prompt pop); a per-station tune built from the honk voices would let riders' honks join it as a chord. The owner picks the sound from references.
   - Sync: Local, timed off `wagonAt`; the bell is a message like a honk.
   - **Smallest prototype:** `&v=ritual`.
   - **Gut question:** did a departure ever make you run for it?
5. **Ride in with your cargo** (Spirit Tracks' freight cars, Kiki in the hay, Derail Valley's shelf, Metro Exodus' growing train; construction-you-can-watch's contribution traces; rail-as-play's "prosperity" made visible).
   - Crates on the last flatbed carry the colour of whoever hauled them; they are seats too; they shift a few centimetres and creak at corners, visually only. Riders can never knock them off: they're communal progress (principle 5).
   - At the build site the train pulls in, a crane or ramp swings the crates off while you're still aboard, and the hut's next piece lands with the build's piece rhythm.
   - Later eras: a new car per era (Metro Exodus), so the train itself shows progress.
   - Sync: Local over existing state (who hauled; whether a piece is due).
   - **Smallest prototype:** `&v=cargo` in the wagon room: coloured crates and a Local unload swing at the build-site stop that plays the next piece's animation (cosmetic in a proto room).
   - **Gut question:** did you ride along to watch your logs arrive?

### More recommendations

6. **Catch it between stations** (RDR2, Syndicate, Fortnite; Super Mario 3D World's leave-behind as the counter-example; vehicle-feel rec 13 on steps). Running boards along each flatbed and grab handles at the car ends; a jump passing within 1.2 m of a handle at up to 7 m/s relative speed snaps your hands to it and swings you onto the board in 0.25 s. Sprinting (9.5 m/s) catches even `&v=fast` (6.5). A miss is a pratfall, and the board's next-departure line says when it's back. Sync: Local controller; the grab pose rides `riding`. **Prototype:** `&v=grab` at the fast pace; count catches and misses. **Gut question:** did you chase it down on purpose?
7. **The whistle cord and the thing on the line** (Spirit Tracks' cord and animals, Pokémon's Wooloo, Sea of Thieves' lead and backing, the honk chord). A cord at the loco any rider can pull (Interact); several riders' pulls stack into a chord. Once per trip a critter, picked by a seed from the trip number so every tab sees the same one, sits on the rails ahead; a whistle sends it hopping off; ignored, it rides the front buffer to the next station looking pleased. The train never stops for it (it's a pure function). Until a referenced whistle exists, a steam plume and the honk voice stand in. Sync: the pull is a rate-limited message; the critter is Local from the seed. **Prototype:** `&v=whistle`. **Gut question:** did you pull it more than you needed to?
8. **A reason to walk the train: the front, the gaps, leaning out** (Paper Mario's one roof beat, Uncharted's outside, Train Rush's run to the front, Fortnite's mantling, Train Sim World's most-asked-for view). A ladder up the loco to the boiler top (1.75 m) and a standing spot on the front buffer beam; gaps between cars are 0.5 m hops over the couplings. At a deck's side rail, pushing outwards leans you out: the body tips and the camera shifts 0.5 m out over the side. Later, a hat that blows off at speed (The Wind Rises). **Prototype:** `&v=front` with ladder, buffer-beam spot and lean. **Gut question:** did you walk to the front to see where you were going?
9. **Reveal bends** (the Haunted Mansion's turning cars, Death Stranding's song and pull-out, Half-Life's facility, [level-design.md](level-design.md) on sightlines, sea-crossings rec 3). Lay one bend so the loco swings round to face the lighthouse (later, the next island). On that span a seated rider's camera eases 15° towards the landmark and steps back 2 m, and the HUD fades; nobody standing is moved. The span is also where the owner's own music can come in later: boogle-2.md keeps the stems loader for it. **Prototype:** one tagged span on `ROUTE`, compared with and without in one sitting. **Gut question:** did the bend make you look up?
10. **A different show each way, and a quiet stretch** (the Hogwarts Express's two shows, Miyazaki's *ma*, the dead-time complaints). The line runs out and back, so beats are outbound-only, return-only, or change per trip from the cycle count (deterministic). Keep one 15–20 s stretch with nothing on purpose (open sea or dunes) and check the trace for where people jump off; if they leave there, shorten it. **Prototype:** part of rec 1's `&v=show`, plus a `protoMark` at each jump-off so the trace shows them. **Gut question:** as rec 1.
11. **A level crossing** (Kalimari Desert's bells; Fortnite's island-loop train as a moving landmark). Where a walking path crosses the line, two barrier arms drop and a bell rings 5 s before the loco arrives (`wagonAt`) and lift after the last car; walkers and riders pass 3 m apart and can honk at each other. Local. **Prototype:** one crossing on the path from spawn to the first station. **Gut question:** did you stop to watch it go by?
12. **A cabin car for friends** (Sky's benches, Sea of Thieves' shanties, Metro Exodus' crew, Honkai's parlor car, Subsurface Circular's passengers; [proximity-voice.md](proximity-voice.md)'s short range). A van at the back with two facing benches and a stove: sitting face to face puts friends in voice range and their honks land as a chord. Solo first: a greybox passenger (later The Boogler) boards at one station and leaves at another, on a seed from the trip number. Sync: `seat` presence; the passenger is Local. **Prototype:** the van and one passenger. **Gut question:** did the train feel like a place rather than a lift?
13. **Comfort rules for the rider camera** (Hemmerich 2020, Duh 2004, Eiserloh in vehicle-feel). No roll, ever; while riding, keep the horizon on screen (limit pitch when seated); low-pass the deck's bumps (cut-off near 2 Hz) out of the camera while you stand still or sit; yaw follows the deck through bends (`carry.spin`) by default; no FOV change on the train. **Prototype:** a bar toggle, "camera turns with the train" or "keeps its heading", plus the filter, compared in one sitting. **Gut question:** after three rides, any queasiness either way?
14. **A speed profile per span** (dark rides slow down for scenes, BioShock's coaster thrill, Spirit Tracks' slow-down signs; vehicle-feel rec 9 on overall pace). Each section carries a cruise speed: slow (2 m/s) through stations and the reveal bend, quick (6–7 m/s) on a straight or a trestle. This changes the timetable, so it is lockstep code (`src/sim/wagon.ts` and its test), owner-gated: its own small PR. **Prototype:** `slow` and `quick` tags on two spans in a proto room. **Gut question:** did the quick stretch make you grin?
15. **Arrive by train on a first visit, later** (Animal Crossing's Rover, Half-Life, Half-Life 2, Final Fantasy VII, Pokémon). A first-time player rides in on the wagon to home's station while the name-and-colour card is filled in on a bench; returning players go straight in (boogle-2.md: first and returning visits differ). Waits until riding is fun. **Prototype:** none yet.

### Try first

Recs 1, 2 and 3, as three variants of the wagon card (`show`, `bench`, `snatch`), compared against `calm` in one sitting on the `?play` island. They are the smallest (Local, plus one additive presence key for the bench; no lockstep, so they switch live through `onVariant`), each works solo, and each tests a different layer of riding: something to watch, somewhere to be, something to do. If one gets a yes, rec 4 (stations as ceremonies) and rec 5 (cargo) are the next pair, since they tie the ride to the stations and to the haul-build loop.

## Gaps

- No developer source on Spirit Tracks' passengers and lineside signs; those come from wikis. Iwata Asks covers why the train, not how riding it was tuned.
- No Rare talk on what crews do while sailing, beyond instruments.
- I found no train in Super Mario Odyssey or Astro Bot; the Mario findings come from Super Mario 3D World and Mario Kart instead.
- Uncharted 2's on-train beats beyond the GDC report come from articles about a debug-menu video, not from Naughty Dog.
- Valve's own words on the tram come second-hand through Laidlaw; I couldn't fetch PC Gamer's full article.
- RDR2's cinematic camera on trains is unconfirmed.
- No reliable source explains why Roblox cart-ride games last; the Roblox findings are trackers and wikis.
- Fortnite's Lazy Links had golf carts, not a train.
- The Disneyland flatcars facing the diorama and the Hogwarts Express's guest survey come from wikis.
- The mail-bag exchange in rec 3 is a real railway practice; no game source uses it.
- The camera numbers in recs 2, 9 and 13 are starting guesses, not from any source.

## Sources

Fetched and read **[V]**:

- Iwata Asks, Spirit Tracks, [part 3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/3-Play-That-s-Only-Possible-on-a-Train/3-Play-That-s-Only-Possible-on-a-Train-226909.html), [part 4](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/4-Customising-the-Train/4-Customising-the-Train-226974.html), [part 5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/5-When-You-Hear-That-Zelda-Sound-/5-When-You-Hear-That-Zelda-Sound--227029.html); [PixlBit summary](https://pixlb.it/news/672/iwata_asks_spirit_tracks_parts_three_and_four)
- Hardcore Gamer, [A Hat in Time's Owl Express](https://hardcoregamer.com/previews/a-hat-in-times-owl-express-makes-for-a-terrific-level/271678/)
- 80.lv, [The secrets of the train level in Uncharted 2](https://80.lv/articles/the-secrets-of-the-train-level-in-uncharted-2)
- Kotaku, [BioShock Infinite's Sky-Line combat explained by Ken Levine](https://kotaku.com/bioshock-infinites-sky-line-combat-explained-by-ken-lev-5645527)
- Gaming Nexus, [Derail Valley preview](https://www.gamingnexus.com/Article/5891/Derail-Valley/)
- Game Developer, [GDC 2018 Level Design Workshop roundtable](https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a) (Mike Bithell's talk)
- The Escapist, [Death Stranding's use of music](https://www.escapistmagazine.com/death-stranding-music-most-effective-low-roar-kojima/)
- Blooloop, [How to design a dark ride](https://blooloop.com/how-to-design-dark-ride/)
- MiceChat, [Disneyland's Primeval World](https://www.micechat.com/255661-disneyland-revealed-primeval-world/)
- Hemmerich, Keshavarz and Hecht, [Visually Induced Motion Sickness on the Horizon](https://www.frontiersin.org/articles/10.3389/frvir.2020.582095/full), Frontiers in Virtual Reality, 2020

Secondary **[S]** (wikis, guides, reviews, forums, search summaries): every other link above.
