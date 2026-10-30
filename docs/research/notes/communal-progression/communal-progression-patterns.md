# Communal, persistent progression for small friend groups (without grind or fine-control building)

Scope note: target is Boogle, a small friends-only browser physics game (one island, ball/creature/weather/water toys, host-authoritative, room-only identity). Facts below are cited; anything about input precision, async handling, implementation cost, or transfer to Boogle is my inference and sits under "Inferences". Several fetches of primary wikis failed (stardewvalleywiki.com 403, Stardew Fandom multiplayer page 402, lethal-company.fandom.com 402, seaofthieves.com FAQ 403), so some details come from search-result summaries of the cited URLs and are flagged as such.

## 1. Which mechanics make shared progress feel meaningful but light? (catalogue by game)

### Takeaway
The strongest light-but-meaningful pattern is "contribute ordinary stuff to a visible shared target, and the world physically changes overnight": Stardew's Community Center bundles repair specific places (bridge, greenhouse, minecarts, bus), Animal Crossing New Leaf's public works plot builds the next morning, ACNH's island rating gates a concert and a gift on reaching thresholds, Viva Piñata turns visitors from grey outlines to full colour when the garden suits them, and Dorfromantik pays quests out in more tiles plus permanent cosmetic changes. Time-boxed crew quotas (Lethal Company) are the high-pressure counterexample.

### Cited Findings

#### Stardew Valley: Community Center bundles (restoration arc)
- The Community Center has 6 rooms and 30 bundles. Rewards are world repairs/unlocks: Crafts Room repairs the bridge to the Quarry; Pantry repairs the Greenhouse; Fish Tank removes the glittering boulder; Boiler Room repairs the minecarts (fast travel); Bulletin Board gives +500 friendship with several townsfolk; Vault repairs the Bus, unlocking Calico Desert. — [Stardew Valley Fandom wiki: Bundles](https://stardewvalley.fandom.com/wiki/Bundles) (via search summary); [ExitLag: All 30 bundles & rewards](https://www.exitlag.com/blog/stardew-valley-bundles/)
- Boiler Room minecarts are placed at the Bus Stop, the Quarry, the Mines entrance, and in town, i.e. the reward is a set of new physical objects across the map. — [Stardew Valley Fandom wiki: Bundles](https://stardewvalley.fandom.com/wiki/Bundles) (via search summary)
- Vault bundles require only gold, and the Vault becomes available after 4 total bundles are completed (staggered room unlocking). — [Stardew Valley Fandom wiki: Bundles](https://stardewvalley.fandom.com/wiki/Bundles) (via search summary)
- Discrepancy: the Fandom wiki says the Boiler Room opens after at least 2 bundles are completed; other guides do not mention this prerequisite. — [Stardew Valley Fandom wiki: Bundles](https://stardewvalley.fandom.com/wiki/Bundles) vs [ExitLag](https://www.exitlag.com/blog/stardew-valley-bundles/) (not settled)
- Greenhouse reward lets you grow any crop year-round, i.e. a reward that changes the rules, not just a cosmetic. — [ExitLag](https://www.exitlag.com/blog/stardew-valley-bundles/) (via search summary)
- Barone's early design notes: Junimos (nature spirits who moved into the abandoned Community Center) return items to their place and add a star to a plaque when a broader goal completes; they leave when it is complete. The final game changed considerably from this draft. — [GoNintendo](https://gonintendo.com/contents/19373-stardew-valley-dev-shares-notebook-sketch-showcasing-the-community-center-s-origins); [Siliconera](https://www.siliconera.com/stardew-valley-community-center-concept-art-shared/)
- Barone pointed players to a subtle pulsing inventory icon that appears only on items needed for a currently unlocked bundle: the game tells you passively that something you already hold is useful. — [GamesRadar](https://gamesradar.com/stardew-valley-dev-shares-easily-missed-but-extremely-useful-community-center-tip)

#### Animal Crossing: New Leaf public works projects (shared donation plot)
- Projects are proposed mostly by villagers suggesting them; some unlock via conditions. After choosing a location, a plot appears with Lloid, who accepts donations; villagers each donate small amounts daily. Once the goal is met the project is built the next day, and Isabelle offers a completion ceremony. — [Nookipedia: Public works project](https://nookipedia.com/wiki/Public_works_project)
- Lloid stays at the site 24/7 until complete; funded projects are fully built the next day at 6 AM; cancelling forfeits donations. — [Animal Crossing New Leaf Wiki: Public Works Projects](https://acnewleaf.fandom.com/wiki/Public_Works_Projects) (via search summary)
- Scale and pacing caps: 104 projects total, 13 available by default; only one can be under construction at a time; max 30 built. Club LOL needs 6 villager signatures instead of Bells (a social, non-currency cost). — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- Unlocks are tied to play the player already does: station reconstruction after players visit the town 100 times; Fortune-Teller after 20 fortunes; museum renovation after 20 museum donations (at least one per category) and 14 days; café after 50 donations; topiaries if the town has no weeds on Weeding Day; town hall renovations and flower clock after "perfect town" status. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- In New Horizons, public works were replaced by placing furniture outdoors; some projects became furniture items. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- New Horizons bridges/inclines are planned with Tom Nook at upgraded Resident Services and paid by the player until the total is reached. — [Twinfinite guide](https://twinfinite.net/guides/animal-crossing-new-horizons-build-bridges/) (via search summary)

#### Animal Crossing: New Horizons island evaluation (ambient whole-island score)
- 1 to 5 stars from two scores, development and scenery; both must meet a star's threshold (1 star: dev 0-80, scenery 0-200; 5 stars: dev 665+, scenery 450+). Checked by talking to Isabelle after the 6th villager moves in. — [Nookipedia: Island evaluation](https://nookipedia.com/wiki/Island_evaluation)
- Development points: museum and Able Sisters 15 each; each bridge or incline 15; villagers 15 at 9, 30 at 10; weeds 30 at 100 or fewer (shrinks above 100); fences 0.2 each; placed items at least 1 each with bonuses for pricier/outdoor/wide items. Scenery: grown trees 1, bushes 0.5, flowers 1 grown/0.7 bud/0.5 seed, ripe produce 1, DIY furniture 0.25 (1 if 3+ wide). — [Nookipedia](https://nookipedia.com/wiki/Island_evaluation)
- Anti-spam/anti-overgrowth: more than six of the same item in a 64-square block reduces points; tree points above 220 block a perfect rating (Isabelle says the island is overgrown). — [Nookipedia](https://nookipedia.com/wiki/Island_evaluation)
- Unlocks: at 3 stars, K.K. Slider visits the next day for a plaza concert, then weekly even if the rating later drops; 3 stars also gates the terraforming permit. At 5 stars, Isabelle sends the Golden Watering Can recipe. Isabelle gives qualitative hints (more outdoor furniture, fences, trim foliage, more villagers/stores). — [Nookipedia](https://nookipedia.com/wiki/Island_evaluation)

#### Animal Crossing: New Horizons museum (collection that builds a building)
- Museum is not available at start: donate 5 creatures to Tom Nook, Blathers sets up a tent at a spot you choose the next day, donate 15 more and the museum opens two days later. Blathers gives a monologue for each newly donated bug, fish and fossil. — [Nookipedia: Museum](https://nookipedia.com/wiki/Museum)

#### Viva Piñata (2006, outside the 2012-2026 window but the clearest "world flourishes when tended" example; all details below via search summary)
- A species appears first as a black-and-white outline once visit conditions are met; meeting further requirements turns it into a full-colour resident that you can rename. Requirements depend on plants, other piñatas, or terrain proportions of the garden. — [TrueAchievements walkthrough (Trouble in Paradise)](https://www.trueachievements.com/game/Viva-Pinata-Trouble-In-Paradise/walkthrough/3); [Wikipedia: Viva Piñata](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game))
- Romance typically requires two conditions (usually eating something and having that species' house), then a maze minigame, then a stork delivers an egg. — [Wikipedia: Viva Piñata](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game)); [DJCube review](https://djcube.co.uk/rare-review-viva-pinata/)
- Players shape land with simple tools (shovel, watering can, ponds). — [Wikipedia](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game))

#### Dorfromantik (low-precision placement, quests pay out in more play)
- Quests appear as number bubbles over features (houses, trees, fields, tracks); "+" means at least that many connected, a bare number means exactly. Completing one grants 5 extra tiles; meeting criteria also earns permanent cosmetic world changes. (Fan source, unverified.) — [Dorfromantik quests & rewards (fan guide)](https://shapes.inc/fandom/dorfromantik/challenges)
- Developer framing: players "discover and unlock new tiles and complete quests to fill your world with life." — [GOG interview with Toukana](https://gog.com/news/binterview_toukana_interactive_tells_us_more_about_dorfromantikb)

#### Townscaper / Tiny Glade (no-fail, low-precision building)
- Stålberg called Townscaper a "toy" whose appeal is the satisfaction of watching a town rise from the sea as you click. — [Bloomberg](https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town)
- Tiny Glade's Steam store description reportedly says "No management, no combat, or wrong answers" (store page not fetched; via search summary). Pounce Light cites Townscaper as its main inspiration and does not want a roadmap. — [GamesRadar](https://www.gamesradar.com/games/city-builder/as-steams-cozy-new-city-builder-tiny-glade-celebrates-500-000-players-devs-explain-why-they-dont-really-want-to-have-a-roadmap); [PC Gamer on Townscaper-likes](https://pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint)

#### Valheim (boss-gated world progression)
- Bosses gate progress: Eikthyr's antlers are needed for the first pickaxe; The Elder must be killed to get the item that lets you collect iron. Iron Gate's Henrik Törnqvist said the game is more inspired by Zelda and Skyrim than survival games, wanting bosses that hand out new gear. — [PC Gamer](https://www.pcgamer.com/valheim-developer-says-zelda-and-skyrim-were-bigger-influences-than-survival-games)
- Progress is shared at the world level (the world advances as a group), and a member who misses a boss night falls behind. (Fan wiki.) — [Guild Order: Boss and biome progression](https://guildorder.com/es/games/valheim/wiki/boss-and-biome-progression)
- Players "latched onto it as a way to play a social game" when they couldn't meet friends in person. — [GamesBeat 1.0 interview](https://gamesbeat.com/valheim-finally-hits-1-0-after-five-years-in-early-access-interview/)

#### Sky: Children of the Light (shared currency as gift, daily caps, seasons)
- Candles are the main currency, exchanged with spirits and friends; players are encouraged to give candles to others to say thanks and build relationships. Friendship begins with gifting a candle the recipient accepts or declines. — [GameDaily](https://www.gamedaily.biz/?p=1403); [UChicago student essay](https://voices.uchicago.edu/202003sosc20224/2020/07/09/communication-and-relationships-in-sky-children-of-the-light) (player account)
- Chen (GDC interview): designing a non-toxic social space was central. — [PC Gamer](https://www.pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc). Secondary coverage of the same interview reports him saying "you have to earn your rights to apply your social power", favouring preventative over reactive anti-toxicity, and notes Sky has no public text chat. — [MassivelyOP](https://massivelyop.com/?p=264726) (secondary, unverified against the original)
- Daily cap: free players earn 5 seasonal candles a day (1 from lighting four candle clusters, 4 from daily quests); seasonal candles convert to regular candles when the season ends; seasonal spirits may return later as Traveling Spirits. — [PC Gamer seasonal candles guide](https://pcgamer.com/games/mmo/sky-children-of-the-light-seasonal-candles-locations); [Ginx](https://www.ginx.tv/en/how-to-get-seasonal-candles)

#### Palia (cozy MMO, group-gated gathering)
- GDC 2024 talk "It Takes a Village: Cultivating Social Coziness in Palia" (Eileen Shiue, Singularity 6) frames cozy and deeply social games as having "felt mutually exclusive" and covers building social coziness into the foundation. — [GDC Vault](https://gdcvault.com/play/1034381/It-Takes-a-Village-Cultivating)
- Some trees and ore deposits can only be harvested by several players together; when players team up for cooking, everyone gets a share of rewards. — [NME preview](https://www.nme.com/features/palia-is-shaping-up-to-be-the-cosiest-mmo-around-3474780); [Vocal.media (low-quality blog)](https://vocal.media/gamers/palia-communities-vs-guilds-finding-the-best-social-group-for-your-playstyle)
- Communities: persistent groups of up to 25 players with synchronous and asynchronous activities. (Low-quality blog.) — [Vocal.media](https://vocal.media/gamers/palia-communities-vs-guilds-finding-the-best-social-group-for-your-playstyle)

#### Lethal Company (shared crew quota, high pressure)
- Play is a series of increasing profit quotas, each with a three-day cycle; missing a quota ejects the crew into space and the run restarts. Furniture placed on the ship feeds a hidden "luck" value that can lower the quota. — [Wikipedia: Lethal Company](https://en.wikipedia.org/wiki/Lethal_Company)
- Critics note the escalating quota forces players to become less risk-averse to continue a save. — [Unwinnable](https://unwinnable.com/2024/02/16/lethal-company-and-the-ethos-of-the-bad-job/) (via search summary)
- Disputed: a Steam thread claims the next quota depends on how much you earned last time (punishing early success); other commenters call this wrong (mods/bugs). — [Steam discussion](https://steamcommunity.com/app/1966720/discussions/0/4038103682228231024) (contested, unresolved)
- A community mod ties deadline length to quota size (quota / 200 = days). — [Thunderstore: QuotaBasedDeadline](https://thunderstore.io/c/lethal-company/p/Hibyhii/QuotaBasedDeadline/)

#### Peak / "friendslop"
- Peak's lead accepts the "friendslop" label: "Why not make a game where the point is to hang out with your friends?" — [PC Gamer](https://pcgamer.com/games/adventure/peak-boss-doesnt-mind-us-calling-it-friendslop-why-not-make-a-game-where-the-point-is-to-hang-out-with-your-friends)

#### Deep Rock Galactic (seasons)
- Season 01 introduced a free battle-pass-like progression; Ghost Ship moved to seasons to theme updates coherently and later let players access older seasons so new players and veterans can play as they like. — [DRG Season 01 FAQ](https://www.deeprockgalactic.com/season01-faq); [GGRecon interview](https://ggrecon.com/articles/deep-rock-galactic-interview)

### Inferences
- **Restoration arc beats blank-slate building for "we built this together."** Stardew and ACNL both make the reward a specific, named, physical change at a specific place (bridge, minecarts, greenhouse, a building on a chosen plot). Boogle analogue: a broken island (collapsed pier, dry fountain, dark lighthouse, silted channel) where each shared goal repairs one landmark. Input precision: zero (you deposit/do things; the game builds). Complexity: low-medium; one host-owned integer progress record per landmark plus a cosmetic "repaired" model swap.
- **One shared donation target per site (Lloid pattern)** is the simplest communal mechanic: a visible thing in the world that accepts contributions from anyone, with a fixed total, and builds on the next "day". The "built next morning" delay turns completion into a reveal that the next arriving friend also sees. For Boogle, "next day" could be "next session start" or a fixed real-time delay computed by the host. Complexity: low.
- **Ambient score with thresholds (ACNH rating)** lets everyday play feed progress without any explicit task, and the over-cap penalties (same-item clustering, overgrowth) quietly push variety. The 3-star K.K. concert persisting "even if the rating drops" is a strong anti-loss rule: unlocks are sticky. Boogle analogue: an island "liveliness" score from creatures alive, plants grown, water features, landmarks lit; thresholds trigger a one-time event (a festival, a creature migration) that then recurs. Complexity: medium (must be computed deterministically on the host from shared state; integer weights as in ACNH map well to the repo's integer-sim rule).
- **Grey-to-colour residency (Viva Piñata)** is the best fit for Boogle's creature toys: creatures visit as silhouettes when conditions exist, become residents (coloured, nameable) when the island satisfies them. The requirements are environment states, not chores, so any friend's play advances them. Precision: low. Complexity: medium (condition checks over shared world state).
- **Pay rewards in more play/more world, not currency (Dorfromantik)**: quest completion gives more tiles and permanent cosmetic changes. For Boogle, rewards could be a new toy, a new creature species, a weather type, or a landmark state, rather than points.
- **No-fail placement (Townscaper/Tiny Glade)** shows how to give building agency at near-zero precision: the system resolves the shape around a coarse click. If Boogle wants any placement, a snap-to-slot model (a handful of predefined plots per landmark, choose one of N variants) gets most of the feeling with no fine control.
- **Boss/milestone gating (Valheim)** works for together-sessions but punishes absentees ("falls behind"). For Boogle, prefer milestones that the whole room shares and that never require a specific player's attendance.
- **Quota pressure (Lethal Company)** creates group drama but is the opposite of cozy; borrow only the "one crew-wide number, visible to all" display, not the escalation or failure reset. The hidden furniture-luck modifier is an interesting "decorating has a soft mechanical benefit" idea.
- **Sky's candle gifting** suggests contribution that is explicitly *to someone*: a toy or resource left for a named friend reads as care, not grind.

### Gaps
- No sourced detail found for: Deep Rock Galactic shared hub/space-rig upgrades (only seasons found), Sea of Thieves emissary/reputation (official FAQ 403), Webfishing, Wobbly Life, Raft, Don't Starve Together, Minecraft Realms, Pikmin, Slime Rancher co-op, Astroneer, Grounded, Enshrouded, Islanders, Unpacking-style collections. These should not be described from memory in the final report without verification.
- Exact Stardew bundle composition (e.g. how many items per bundle, "choose N of M" slots, remixed bundles) not confirmed; the primary wiki returned 403.
- New Horizons museum: total collectible counts and whether donations credit the donating resident were not on the fetched page portion.
- Lethal Company starting quota and growth formula not confirmed (Wikipedia gives no figures; Fandom 402; Steam thread contested).
- No primary design rationale found from Barone (bundles), Stålberg (no-fail placement), Zeekerss (quota), or Toukana (quest design); the Palia GDC talk content beyond its abstract was not accessible.

## 2. Design patterns: collections, unlocks that change the world, growth, landmarks, quotas, seasons, restoration, milestones

### Takeaway
The recurring patterns are: (a) collection boards whose completion changes a place (bundles, museum); (b) sticky threshold unlocks triggered by an ambient score (ACNH rating); (c) residency/flourishing driven by environment conditions (Viva Piñata); (d) one shared, visible target with a delayed reveal (ACNL plot); (e) staggered unlock chains so the board never shows everything at once (Stardew Vault after 4 bundles; ACNL 13 of 104 projects available at start; ACNH museum tent then building); (f) time-boxed seasons with a capped daily earn (Sky); (g) crew quotas (Lethal Company).

### Cited Findings
- Collections that become buildings: ACNH museum grows from 5 donations (tent) to 15 more (building). — [Nookipedia: Museum](https://nookipedia.com/wiki/Museum)
- Collections that repair the world: Stardew's six rooms each repair or unlock a location or rule (bridge, greenhouse, boulder, minecarts, bus). — [ExitLag](https://www.exitlag.com/blog/stardew-valley-bundles/)
- Staggered reveal: ACNL starts with 13 of 104 projects; more come from villager suggestions and milestones. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- Milestones from everyday counters: 100 visits, 20 fortunes, 20 or 50 museum donations, no weeds on Weeding Day. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- Ceremony on completion: Isabelle's ceremony for public works; K.K. Slider's concert at 3 stars. — [Nookipedia: Public works](https://nookipedia.com/wiki/Public_works_project); [Nookipedia: Island evaluation](https://nookipedia.com/wiki/Island_evaluation)
- Plaque/stars as a progress display: Barone's draft had Junimos add a star to a plaque per completed broader goal. — [GoNintendo](https://gonintendo.com/contents/19373-stardew-valley-dev-shares-notebook-sketch-showcasing-the-community-center-s-origins)
- Seasons with conversion: Sky seasonal candles convert to regular candles at season end, and seasonal spirits may return later. — [PC Gamer](https://pcgamer.com/games/mmo/sky-children-of-the-light-seasonal-candles-locations); [Ginx](https://www.ginx.tv/en/how-to-get-seasonal-candles)
- Seasons that do not expire permanently: DRG lets players access older seasons. — [GGRecon](https://ggrecon.com/articles/deep-rock-galactic-interview)
- Group-gated nodes: Palia trees/ore that need several players. — [NME](https://www.nme.com/features/palia-is-shaping-up-to-be-the-cosiest-mmo-around-3474780)

### Inferences
- **Landmarks that light up** are the natural Boogle form of the Junimo plaque: e.g. a ring of standing stones or a lighthouse whose lamps light one by one as goals complete, visible from anywhere on the island. Each lamp is one boolean in host state. Complexity: low.
- **Seasonal/rotating goals** should convert or return rather than vanish (Sky conversion, DRG older seasons), so friends who miss a season lose nothing permanent. For Boogle a "season" could rotate which creature migrates or which weather event is available, with past ones re-rotating later.
- **Group-gated actions** (Palia) suit physics toys: e.g. a boulder blocking the channel needs 3 players pushing, or the ball must be kicked through a gate while someone holds a lever. Use sparingly, with a solo fallback (slower/longer) so async players are never blocked.
- **Patterns ranked for Boogle by cost/fit (my judgment):** landmark lamps (low cost, high visibility) > shared donation plot with next-session reveal (low) > collection board of creatures/weather sightings (low-medium) > Viva Piñata residency (medium) > ambient island score with sticky thresholds (medium) > snap-slot placement (medium-high) > seasons (medium, needs content cadence).

### Gaps
- No sourced examples found for "communal trophies/shared achievements" boards in the named co-op games (e.g. a crew-wide trophy wall).
- No source on how Sea of Thieves or Raft handle shared crew/raft progression in detail.

## 3. How do they avoid grind?

### Takeaway
Sourced anti-grind levers: small, finite goal sets (30 bundles; 5+15 museum donations); goals drawn from things players already do (visits, fortunes, donations, weeding); payouts that are big and visible (a repaired bridge, a concert); explicit daily caps (Sky's 5 candles); anti-spam scoring (ACNH penalises repeating the same item or overgrowing); one-at-a-time construction (ACNL); and passive "you already have this" hints (Stardew's pulsing icon).

### Cited Findings
- Finite, countable goal set: 6 rooms, 30 bundles. — [ExitLag](https://www.exitlag.com/blog/stardew-valley-bundles/)
- Passive hinting so players do not hunt: pulsing icon only on items needed for a currently unlocked bundle. — [GamesRadar](https://gamesradar.com/stardew-valley-dev-shares-easily-missed-but-extremely-useful-community-center-tip)
- Progress from play you already do: ACNL milestones tied to visits, fortunes, donations, weeding. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- NPCs drip-feed contributions: villagers each donate small amounts daily to ACNL projects. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- Daily cap: Sky's 5 seasonal candles per day for free players. — [PC Gamer](https://pcgamer.com/games/mmo/sky-children-of-the-light-seasonal-candles-locations)
- Anti-repetition scoring: ACNH penalises more than six of the same item in a 64-square block and overgrowth above 220 tree points. — [Nookipedia](https://nookipedia.com/wiki/Island_evaluation)
- Pacing cap: ACNL allows only one project under construction at a time. — [Nookipedia](https://nookipedia.com/wiki/Public_works_project)
- Rewards that expand play rather than pay currency: Dorfromantik quests give 5 more tiles (fan source). — [Dorfromantik fan guide](https://shapes.inc/fandom/dorfromantik/challenges)
- Counterexample: Lethal Company's escalating quota pushes players into riskier play to keep a save going. — [Unwinnable](https://unwinnable.com/2024/02/16/lethal-company-and-the-ethos-of-the-bad-job/)

### Inferences
- **Keep each goal list to single digits per landmark** and the whole arc in the dozens (Stardew's 30 bundles is a full-game arc for a long farming game; Boogle sessions are shorter, so ~8-15 total goals across the island is probably right).
- **Make goals "witness" events, not "collect N" counts.** For a physics toy island, goals like "see a rainbow over the lake", "get the ball onto the lighthouse balcony", "have three creature species resident at once" are variety-first and come from play already happening. Precision: low, because they describe states, not inputs.
- **Let the world contribute on its own (villager drip):** e.g. creatures slowly bring shells to the donation plot, so a quiet day still moves the bar a little. Must be deterministic host-side (seeded RNG, integer increments) per Boogle's sim rules.
- **Real-time growth as a pacing cap** (plants growing between sessions) caps progress without a visible "come back tomorrow" wall. Host or snapshot server must stamp elapsed time; note Boogle forbids `Date.now()` inside the shared sim, so elapsed time would have to be an input the host stamps into an edit/tick count, not read inside sim code.

### Gaps
- No designer statement found explicitly on anti-grind intent for bundles, public works, or ACNH rating; the anti-grind reading is inferred from the mechanics.
- No Reddit/forum corpus was gathered on "satisfying vs grindy" co-op progression.

## 4. How do they handle absent players (asynchronous contribution)?

### Takeaway
Shared-world games with one host-owned state (ACNL plot, ACNH rating, Valheim world) make any player's contribution count for everyone, but sources show the failure mode clearly: Valheim players who miss a boss night fall behind. The most specific async design guidance found is the "handoff" proposal (change log, handoff board, "partner last seen here", and a 60-second gratitude test) and Lost Garden's point that asynchronous play depends more heavily on strong reciprocation loops.

### Cited Findings
- Valheim progress is world-level; a member who misses a boss night falls behind the group. (Fan wiki.) — [Guild Order](https://guildorder.com/es/games/valheim/wiki/boss-and-biome-progression)
- Most survival-craft co-op assumes simultaneous presence and is weak at "handoff play". Proposed async mechanics: a handoff board showing what the partner finished and what changed since your last session; shared blueprints, labelled caches, route/task markers; time-stamped world notes; an auto-generated change log; "partner last seen here" traces; networking limited to persistent world-state sync. Test: a player returning after 24 hours should feel grateful to their partner within 60 seconds; the risk is the async layer reading like patch notes. — [Idealist newsletter (Buttondown)](https://buttondown.com/idealist/archive/sandbox-saturday-long-distance-co-op-farmcraft/) (opinion/concept piece, not a shipped game)
- "Because proximity is weak, asynchronous games depend more heavily on strong reciprocation loops"; reciprocity loops are cost, benefit, feedback, choice; keep early interactions low-cost and non-zero-sum. — [Lost Garden: Game design patterns for building friendships](https://lostgarden.com/2017/01/27/game-design-patterns-for-building-friendships/)
- Anti-pattern: splitting friends by skill or progress breaks relationships. — [Lost Garden](https://lostgarden.com/2017/01/27/game-design-patterns-for-building-friendships/)
- Sticky unlocks: K.K. Slider keeps visiting weekly even if the ACNH rating later drops. — [Nookipedia](https://nookipedia.com/wiki/Island_evaluation)
- Seasonal currency converts rather than expires (Sky); old seasons stay accessible (DRG). — [PC Gamer](https://pcgamer.com/games/mmo/sky-children-of-the-light-seasonal-candles-locations); [GGRecon](https://ggrecon.com/articles/deep-rock-galactic-interview)
- Palia communities mix synchronous and asynchronous activities. (Low-quality blog.) — [Vocal.media](https://vocal.media/gamers/palia-communities-vs-guilds-finding-the-best-social-group-for-your-playstyle)

### Inferences
- **No per-player progress at all** is the cleanest rule for a room-only game: progress belongs to the island, so there is nothing to catch up on and nobody "falls behind" (avoids the Valheim problem and Lost Garden's split-by-progress anti-pattern). It also fits Boogle having no accounts.
- **Credit by name, cheaply:** store the room-local display name (or colour) of who completed each goal/lit each lamp; show it on the landmark plaque. Costs a few bytes per goal in host state; makes absent friends' work visible and creates the "grateful within 60 seconds" moment.
- **"While you were away" card on join:** a short list derived from the goal/landmark log since the player's last seen tick (stored client-side in localStorage keyed by room, since there are no accounts). Show it as world-space highlights (newly lit lamp glows, new resident creature waves) rather than a text log, to avoid the "patch notes" failure.
- **Leave-behind gifts (Sky-style reciprocity):** let a player leave a toy/creature/flower "for" another named player; it waits at spawn. Low cost, strong reciprocity loop for async play.
- **Delayed reveals reward the next arrival:** ACNL's "built next morning" means whoever logs in next sees the finished project. In Boogle, completing a goal could trigger construction that finishes at the next session start, so absent friends get the reveal too. Optionally replay the reveal for anyone who has not seen it yet (per-client seen flag).
- **Group-gated tasks need solo fallbacks** so a lone player at an odd hour is never blocked.
- **Implementation note (Boogle-specific):** persistence must survive the host leaving; the repo's `server/` snapshot server and `registerState` are the obvious home. Goals/landmark/credit state are small and integer, so they fit host snapshots and the deterministic-sim rules.

### Gaps
- No sourced information on how Stardew co-op handles an offline farmhand's shared bundle progress or cabin (Fandom multiplayer page returned 402).
- No sourced info on whether ACNH museum donations or rating credit individual residents.
- No shipped-game postmortem found that measures async co-op retention; the Idealist piece is a concept, not a product.

## 5. Designer postmortems, GDC talks, interviews on communal progression / cozy co-op / low-skill-floor goals

### Takeaway
Primary material is thin. The most useful sources found: the Palia GDC 2024 talk abstract (social coziness must be designed into the foundation), Lost Garden's friendship patterns (proximity, similarity, reciprocity, disclosure; small human-scale groups; asynchronous play needs strong reciprocity), Jenova Chen on preventative social design in Sky, Iron Gate on boss-gated adventure structure, and Peak's "the point is to hang out with your friends."

### Cited Findings
- Palia talk: cozy and deeply social have "felt mutually exclusive"; talk covers building social coziness into the foundation and lessons from Open Beta. — [GDC Vault](https://gdcvault.com/play/1034381/It-Takes-a-Village-Cultivating)
- Lost Garden: four friendship factors; shared goals and shared experiences create bonds; interdependence via complementary roles; small groups (Dunbar-style circles of ~5, 15, 50, 150); key metric is moving players from a first co-play session to a second. — [Lost Garden](https://lostgarden.com/2017/01/27/game-design-patterns-for-building-friendships/)
- Chen (Sky): non-toxic social space central to the design ([PC Gamer](https://www.pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc)); preventative design, earning social power, no public chat per secondary coverage ([MassivelyOP](https://massivelyop.com/?p=264726), unverified).
- Iron Gate (Valheim): boss-gated adventure inspired by Zelda/Skyrim. — [PC Gamer](https://www.pcgamer.com/valheim-developer-says-zelda-and-skyrim-were-bigger-influences-than-survival-games)
- Peak's lead embraces "friendslop": the point is hanging out with friends. — [PC Gamer](https://pcgamer.com/games/adventure/peak-boss-doesnt-mind-us-calling-it-friendslop-why-not-make-a-game-where-the-point-is-to-hang-out-with-your-friends)
- Stålberg calls Townscaper a toy whose point is the joy of creation. — [Bloomberg](https://www.bloomberg.com/news/articles/2020-07-24/the-video-game-where-you-build-an-empty-town)
- Tiny Glade: "no wrong answers" (Steam store text, via search summary); no roadmap by choice. — [GamesRadar](https://www.gamesradar.com/games/city-builder/as-steams-cozy-new-city-builder-tiny-glade-celebrates-500-000-players-devs-explain-why-they-dont-really-want-to-have-a-roadmap)
- DRG: seasons to theme updates; keep older seasons playable. — [GGRecon](https://ggrecon.com/articles/deep-rock-galactic-interview); [DRG Season 01 FAQ](https://www.deeprockgalactic.com/season01-faq)

### Inferences
- Lost Garden's ~5-person circle matches Boogle's audience exactly; the design target is repeat co-play among the same few people, so persistent island progress is itself the "proximity" mechanism that brings them back to one place.
- Peak, Townscaper and Tiny Glade together argue the low-skill floor matters more than depth for this audience: progression should frame and reward hanging out, not demand mastery.

### Gaps
- The Palia GDC talk body (beyond abstract) was not accessible.
- No GDC talk found specifically on asynchronous shared progression among friends; no postmortem found for Stardew's Community Center design rationale, ACNH's island rating design, or Lethal Company's quota.
- No sources gathered for Animal Crossing designer interviews (e.g. Aya Kyogoku / Katsuya Eguchi) on communal town building; worth a targeted follow-up if the report needs it.
