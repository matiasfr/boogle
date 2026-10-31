# World-shaping without building, and anti-grind pacing for communal progression

Scope: low-precision ways players shape and grow a shared world (placing, planting, tending, attracting, restoring) and the pacing/motivation design that gives long-term progress without grind, for a small friends-only island that people drop in and out of. Boogle context used for the inferences (read from the repo, not the web): the shared sim is integer-only and seeded (`src/sim/rng.js`), and edits go through `registerOp`/`registerState` in `src/world/sync.js` with host snapshots. Existing growth systems are `src/sim/mushrooms.ts` (plant then water, `GROW_TICKS = 40`, plots `{i, j, g}`) and `src/sim/gifts.ts` (palms regrow fruit, `REGROW_TICKS = 2400`; shore items wash up, `LIFE = { shore: 12000, fruit: 6000 }`). The DESIGN.md principles that matter here are "Toys before chores", "Farming is never required", "Cooperation is automatic, not negotiated", "Communal world, personal rewards", "Designed for drop-in, drop-out" and "Leave something for the next visitor".

Source-quality note: some findings come from search-result snippets whose pages I did not fetch. They are marked "(snippet)". Findings from fetched pages are unmarked. Every snippet finding has the URL it came from.

## 1. Which low-precision mechanics let players shape a world without building it piece by piece?

### Takeaway
The proven pattern is a split between a coarse player gesture (one click, one tile, one seed, one condition met) and a system that does the detailed work: Townscaper's auto-forming blocks, Dorfromantik's tile matching, Viva Piñata's condition-gated visitors, Terra Nil's place-a-machine-and-the-land-recovers. Of these, the "attract by meeting conditions" and "restore by placing a catalyst" families map most cheaply onto a small integer, host-ticked sim. Townscaper-style auto-forming geometry is the costliest to build.

### Cited Findings
**Townscaper (Oskar Stålberg): one-click, the algorithm does the rest**
- Townscaper started as a technical challenge about procedural colourful buildings, not as a game idea. Stålberg couldn't find gameplay for it, so he made Bad North first. [Game Developer, "How Townscaper works"](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) (snippet)
- It uses wave function collapse over a set of hand-designed pieces to work out how they connect into coherent structures. Some pieces, such as chimneys and roof types, are chosen at random for variety. [Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) (snippet)
- Stålberg calls the game "radically casual". The player places or removes pieces and picks colours, and the software handles everything else. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- On leaving out goals and score: "When you can win, you play to win. When you keep score, you play to the score." He says scoring makes players stop watching the world they're building, and he wanted "the visuals and the joy of creation to be the whole point." [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- He notes that most "Townscaper-likes" add "more UI options, more tools and gestures", and he is unsure how hyper-casual players will take that. He also says the game's simplicity is what let him build it alone without the scope running away. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- Players took the low-precision tool a long way: elaborate builds, 3D-printed models, and a fan-made first-person browser viewer. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- Stålberg has said Townscaper is more a toy than a game. [Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) (snippet). It sold about 380,000 copies on Steam. [MCV/UK](https://www.mcvuk.com/business-news/when-we-made-townscaper/) (snippet)

**Tiny Glade (Pounce Light): the same idea, extended**
- The Steam description reads: "No management, combat, or goals". Co-developer Anastasia Opara calls it "a toy box for making dioramas", and it cites Townscaper as its main inspiration. [80.lv and search summary](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games) (snippet; I did not retrieve the interview body)

**Dorfromantik (Toukana Interactive): one tile at a time, quests give structure**
- The design aim was "a calm and creative tile placement game where players could relax". Minimalism was central from the start, partly out of necessity. There is no timer, and score depends only on how well tiles match. [Game Developer](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-); [80.lv](https://80.lv/articles/how-dorfromantik-expands-its-cozy-world-through-minimalist-design) (snippet)
- Tiles come from a shrinking random stack, and quests earn more tiles. Quests scale up and sometimes ask for an exact count: one tile might ask for "at least 36" connected houses, another for "exactly 13 houses and no more". [Game Developer](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-) (snippet)

**Islanders (Grizzly Games): placement scored by neighbours**
- A building scores by where it sits relative to other buildings and to natural features. Scoring refills the building inventory and unlocks new types, and the threshold rises with each unlock. Filling the gauge lets you move to a new island, though you can also stay. A student team at HTW Berlin made it in about seven months and kept it simple on purpose. [Wikipedia: Islanders](https://en.wikipedia.org/wiki/Islanders_(video_game)) (snippet)

**Viva Piñata (Rare): attract creatures by meeting conditions**
- A species first appears as a black-and-white "visitor" once its requirements are met. Requirements are usually counts of certain piñatas, plants or produce, or the terrain proportions of the garden. Meeting a second set of requirements makes it a full-colour resident. [Wikipedia: Viva Piñata](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game)) (snippet)
- Requirements start low, for example two Whirlms attract a Sparrowmint, and get harder as the garden grows. [HEXUS review](https://hexus.net/gaming/reviews/xbox-360/7384-viva-pinata-xbox-360/?page=2) (snippet)
- You can't see a species' requirements until you have sighted it, after which it roams the edges of the garden. [djcube review](https://djcube.co.uk/rare-review-viva-pinata/) (snippet)
- Some residency requirements involve eating other piñatas, so a visiting predator can eat residents. [Wikipedia](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game)) (snippet)

**Terra Nil (Free Lives): restoration as the goal**
- Players place pumps, turbines and other machines that restore the land and raise biodiversity. The end goal is to recycle all the tech into an airship and leave no trace. [Destructoid](https://www.destructoid.com/terra-nil-interview-release-date-trailer/); [Game World Observer](https://gameworldobserver.com/2022/09/30/terra-nil-free-lives-interview-reverse-city-builder-studio-ghibli) (snippet)
- Producer Ruan Rothmann says the team asked whether going the other way would be interesting, because turning a pristine planet into an industrial nightmare (as in Factorio) "felt a bit out of place". [Game World Observer](https://gameworldobserver.com/2022/09/30/terra-nil-free-lives-interview-reverse-city-builder-studio-ghibli) (snippet)

**Animal Crossing: New Horizons: terraform-lite and crafting for immediate change**
- Big changes such as a house upgrade or a new shop take a real day or two, so play happens in daily bursts. Crafting and terraforming break that pattern by letting players change rivers, cliffs and landscape right away, without waiting for opening hours. [Game Developer](https://www.gamedeveloper.com/design/why-nintendo-s-new-i-animal-crossing-i-features-allow-instant-change-in-the-real-time-game)
- Director Aya Kyogoku: "Because the Animal Crossing series is tied to the real-time clock, there are users who want to play late at night". Crafting gave them "a new way for them to play and to acquire". [Game Developer](https://www.gamedeveloper.com/design/why-nintendo-s-new-i-animal-crossing-i-features-allow-instant-change-in-the-real-time-game)
- Flowers: a planted seed blooms on the third day after planting. In New Horizons, flowers must be watered to hybridise, new flowers appear each morning, and flowers no longer wilt. The general rule is that two same-species flowers next to each other may produce a new flower in a free adjacent space the next morning. [Nookipedia: Flower](https://nookipedia.com/wiki/Flower)

**Eco (Strange Loop Games): collective world-shaping with consequences**
- Players build a civilisation on a simulated ecosystem. Pollution affects air, soil and water, overharvesting can wipe out species, and players vote on laws that the server enforces physically (for example, a cap on tree felling). [Game Developer, "Building a Global-Survival game"](https://www.gamedeveloper.com/design/building-a-global-survival-game) (snippet; developer-authored)

**Asynchronous traces: Death Stranding**
- Players never see each other's faces, but they see each other's "tracks and traces". Kojima compares this to how people communicated across distances before phones. [Game Developer](https://www.gamedeveloper.com/game-platforms/kojima-details-the-subtly-social-gameplay-of-i-death-stranding-i-)
- Likes have no in-game value and little gameplay effect. Kojima: "why don't I put in a system where it's really more positive than negative?" [Game Developer](https://www.gamedeveloper.com/game-platforms/kojima-details-the-subtly-social-gameplay-of-i-death-stranding-i-)
- There is no dislike. Objects with many likes stay in the world, while objects with few may disappear. Kojima reportedly overruled staff who wanted likes to give points. [Game Informer interview](https://www.gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding); [GameRevolution](https://www.gamerevolution.com/news/596839-kojima-death-stranding-likes-is-unconditional-love) (snippet)

**Grow: Song of the Evertree**
- A construction and management game (Prideful Sloth, 2021). Buildings are placed freely, and players craft "World Seeds" through alchemy to generate new worlds. [Time Extension](https://www.timeextension.com/games/switch-eshop/grow_song_of_the_evertree); [Indie Games Plus review](https://indiegamesplus.com/grow-song-of-the-evertree-review/) (snippet)

### Inferences
- **Typology with rough cost for Boogle's sim.** The state sizes assume the existing plot/item array style.
  - **Attract by conditions (Viva Piñata).** State per species is a 0/1/2 stage (absent, visitor, resident) plus maybe a home cell. Each N ticks, the host checks predicates over counts the sim already has: mushrooms grown, fruit on palms, wet cells, shore items. Cost is low. It is pure `src/sim` logic, tests easily for determinism, and is a natural fit for "Cooperation is automatic, not negotiated": nobody coordinates, everyone's play nudges the counts. Cosmetic critters (`critter-gulls.js`, `critter-fish.js`) could be the visual layer, gated by sim stage.
  - **Restore by placing a catalyst (Terra Nil).** A player drops one object (a seed, a stone, a spring) and an integer radius of "restored" cells grows outward each tick until it hits a cap. State is the catalyst list plus a per-cell restored bit or level. Cost is low to medium, and it reuses the heightfield cell grid.
  - **Plant and spread (Animal Crossing flowers).** Adjacent same-type plants have a seeded chance (`mulberry32`) to spawn a child in a free neighbour cell at each growth tick. Hybrids are a lookup table. Cost is low and an extension of `mushrooms.js`. The variety comes for free and is emergent, but cap the total so it can't overrun the island.
  - **Tile or blob placement scored by neighbours (Dorfromantik, Islanders).** One click puts down a typed thing, and the sim gives feedback through adjacency. Cost is low for the logic, but goals and scores conflict with Stålberg's warning and with "Toys before chores", so use adjacency to produce visible effects, not points.
  - **Auto-forming structures (Townscaper, Tiny Glade).** The player edit is a voxel or cell flag (tiny state), and geometry is derived on every client. The sim stays trivial, so it is deterministic-safe. The renderer is where the cost lies: WFC or marching-cubes-style tile sets are high effort. A cheap version is a cell-occupancy flag plus neighbour-mask mesh selection (16 or 256 cases).
  - **Asynchronous traces with positive-only reactions (Death Stranding).** A "left by X" marker plus an integer like-count. High-like traces persist and low-like ones fade on the existing `LIFE`-style timer. Cost is low and maps directly onto "Leave something for the next visitor". Keep likes worthless (no currency) per Kojima.
- **The split that matters.** Each of these needs the player's input to be coarse and few (one integer op) and the world's response to be rich and derived (cosmetic or deterministic expansion). That is also exactly the shape "Sync edits, not state" wants.
- **Terraform-lite already exists in Boogle** in the shovel and dig-channel work. Animal Crossing shows that an immediate-change tool like this pairs well with slow real-time growth: it gives off-hours or short sessions something to do.

### Gaps
- I didn't retrieve any primary source for Tiny Glade's reasoning on no goals beyond the store text and Opara's quote. The 80.lv interview body was not read.
- Viva Piñata: I found no Rare design postmortem, only reviews and wikis.
- Not researched within the tool budget, or nothing found: Spiritfarer (boat-building as base growth), Ooblets, Mineko's Night Market, Wilmot's Warehouse, Sky: Children of the Light's lighting and restoring of areas, and Alba's reserve-restoration mechanics beyond the summary in Q3.
- Dark Souls messages and bloodstains: I found no primary Miyazaki source on their design intent. The often-repeated anecdote about strangers pushing cars out of snow was not verified.
- Death Stranding: I found no source on exact persistence or decay rules for player structures beyond the like-based persistence claim.

## 2. How do games make the world grow in real time or between sessions, and what are the pitfalls of punishing absence?

### Takeaway
Real-time growth is powerful because players come back to find something changed, but the Animal Crossing series shows a clear arc. Older games punished absence (wilting, overgrown weeds, rafflesia). New Horizons removed wilting and made absence mostly cosmetic (cockroaches, weeds, villagers saying they missed you), and still drew "guilt trip" complaints. Grow while away, never decay while away. For Boogle there is a specific technical fork, because the sim only advances while someone hosts.

### Cited Findings
- New Horizons: "Flowers no longer wilt". In older games, a flower that wasn't watered had a daily chance to wilt at 6 AM unless it had rained, and watering revived it. [Nookipedia: Flower](https://nookipedia.com/wiki/Flower)
- Older Animal Crossing games "notoriously reprimanded absent players by sprouting unmanageable clusters of weeds". Long absences could also spawn a rafflesia that could only be cleared by pulling nearby weeds. A Kotaku writer found their New Horizons island mostly fine after two months away. [Kotaku](https://kotaku.com/what-happens-when-you-abandon-your-animal-crossing-new-1844574997) (snippet)
- New Horizons still marks absence: cockroaches in the house, weeds, and villagers who react with guilt. One player wrote that "Judy thought I was shunning her". [GamesRadar](https://www.gamesradar.com/i-didnt-play-animal-crossing-for-a-month-and-i-came-back-to-an-island-infested-with-gross-bugs); [Kotaku](https://kotaku.com/what-happens-when-you-abandon-your-animal-crossing-new-1844574997) (snippet)
- Nintendo later added fixes: the "Beautiful Island" ordinance gets villagers to help pull weeds, and Leif offers a paid weeding service. [GameSpot](https://gamespot.com/articles/animal-crossing-new-horizons-will-now-pull-your-weeds-for-you-for-a-price/1100-6497750/) (snippet)
- Nintendo's "your island misses you" re-engagement emails were described by players and press as a guilt trip. [TheGamer](https://www.thegamer.com/nintendo-animal-crossing-new-horizons-hiatus-guilt-trip-email/) (snippet)
- Animal Crossing's big changes take a real day or two, so play happens in daily bursts. Instant-change tools such as crafting and terraforming were added partly so off-hours players have something to do. [Game Developer](https://www.gamedeveloper.com/design/why-nintendo-s-new-i-animal-crossing-i-features-allow-instant-change-in-the-real-time-game)
- The New Horizons developers said they think playing without time travel is best in the long run. [GamesRadar](https://gamesradar.com/animal-crossing-new-horizons-developers-think-playing-without-time-travels-best-in-the-long-run) (snippet; I did not read the quote)
- Eco's cascading ecosystem, where one disruption can ripple across the planet and overharvesting can wipe out species permanently, shows the opposite pole: persistent consequences that can make the world worse. [Game Developer](https://www.gamedeveloper.com/design/building-a-global-survival-game) (snippet)

### Inferences
- **Boogle's implementation fork.** The world only ticks while a host is online, and `Date.now()` is banned in the shared sim. "Return to find changes" therefore has two options:
  - **(a) Session-time growth.** Things grow only while someone plays. This is deterministic and needs no work, but a solo visitor after a week finds nothing new.
  - **(b) Host catch-up op.** On load, the host computes elapsed integer ticks from the snapshot's wall-clock stamp, capped (for example at 1 to 3 in-game days), and submits a stamped `world.catchup(n)` op. The sim then runs a cheap closed-form advance: growth counters `g = min(g + n, GROW_TICKS)`, a capped number of spawn or spread rolls from the seeded RNG, and shore wash-ups up to `MAX_SHORE`. Wall-clock time enters only once, as an integer chosen by the host, so determinism holds.

  This is a design decision the team hasn't made. Option (b) is the one that gives drop-in players something new.
- **Rules for "while away" deltas.** Use only monotone, positive changes: things grow, bloom, arrive and wash up. Nothing wilts, dies, gets infested or leaves because nobody visited. Cap the catch-up so a month away looks like "a lot bloomed", not "jungle". Make negative-looking changes, if any, toys rather than chores: weeds you can bonk with the ball for a pop, not weeds you must clear. This fits "Farming is never required" and "Only the world is the antagonist" (weather, tide), and keeps the antagonist from being the friends' own absence.
- **Existing decay in `gifts.js`** (`LIFE.shore`, `LIFE.fruit`) is fine because it is ambient turnover of free gifts, not loss of player effort. The line to hold is: never expire things players made or planted.
- **The village-guilt pattern should be inverted.** NPCs and creatures react with delight when someone returns ("the herons came back while you were gone"), never with reproach.

### Gaps
- I didn't find exact New Horizons numbers for flower breeding chance or weed spawn rate (the Nookipedia page was read only through its first 100k characters).
- Stardew Valley's crop death at season change is a known absence and seasonal penalty, but I found no primary source on it, nor ConcernedApe's reasoning about it.
- I found no player research quantifying churn caused by absence penalties. The evidence here is anecdotal and press-based.

## 3. How do collections (bestiaries, catalogues, albums, museums) work as progression that rewards exploration over repetition?

### Takeaway
Collections turn "go somewhere new or notice something new" into progress, and a communal museum or log turns personal finds into shared, visible history. The strongest examples (Animal Crossing's museum, Alba's species app, A Short Hike's feathers) reward the first encounter, not repetition. Each entry is a one-time unlock, so there is nothing to grind.

### Cited Findings
- **Animal Crossing museum.** Blathers the owl runs a museum that accepts donations of fossils, fish, bugs and art. Fossil halls are laid out chronologically from early life to the most recent era. Commentators describe it as "a living catalogue of your island experiences". [Play the Past](https://www.playthepast.org/?p=6880); [Cultural Gutter](https://culturalgutter.com/2020/08/24/an-investigation-into-blathers/) (snippet)
- Real museum professionals, including Smithsonian Air and Space Museum staff, praised the New Horizons museum, and it was shortlisted among the best video game museums of 2020. [GoNintendo](https://gonintendo.com/archives/348792-museum-curators-share-their-thoughts-on-animal-crossing-new-horizons-museum); [Nintendo Life](https://www.nintendolife.com/news/2020/12/blathers_finally_gets_some_recognition_in_2020s_best_video_game_museums) (snippet)
- **Alba: A Wildlife Adventure (ustwo).** A clear photo lets the in-game app identify a species and show its common and scientific name, call and image. There are about 62 species, though sources say "62" and "more than 60". Other objectives include picking up litter, restoring birdhouses and feeders, and rescuing animals. The frame is saving a neglected nature reserve from a hotel development by collecting signatures. [Checkpoint Gaming](https://checkpointgaming.net/reviews/2020/12/alba-a-wildlife-adventure-review-heartwarming-photography/); [Engadget](https://www.engadget.com/alba-a-wildlife-adventure-steam-apple-arcade-ustwo-review-152045112.html) (snippet)
- **A Short Hike (Adam Robinson-Yu).** Golden feathers are the main progression. They are found or bought, and they raise stamina, give extra jumps and allow climbing. A sign says the peak can be reached with as few as seven, so exploring more makes the summit easier but isn't required. [Wikipedia: A Short Hike](https://en.wikipedia.org/wiki/A_Short_Hike) (snippet)
- In his GDC 2020 postmortem "Crafting A Tiny Open World", Robinson-Yu covered guiding players with curiosity-inducing landmarks and using natural barriers to pace progression. The game was built against a four-month deadline. [GDC Vault](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A); [Game Developer video](https://gamedeveloper.com/design/video-a-postmortem-look-at-the-making-of-i-a-short-hike-i-) (snippet; talk not accessed)
- **Viva Piñata's visitor stage as a de facto bestiary.** A species' requirements are hidden until it has been sighted. It then shows up as a black-and-white visitor and becomes a full-colour resident (see Q1). [Wikipedia](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game)); [djcube review](https://djcube.co.uk/rare-review-viva-pinata/) (snippet; neither source describes an in-game journal UI)

### Inferences
- **Boogle already has collectable content:** `gift-catalog.js` (shore finds and fruit kinds), critters (gulls, fish, fireflies), mushrooms, and weather and day-night states. A shared island log costs very little. Each entry is a bitset or array of first-found ticks plus an optional finder id, and a `log.discover(kind)` op is idempotent on the host. That is tiny state that snapshots trivially and is easy to test (no double-counting, round-trip).
- **Make entries time- or condition-specific** (fireflies only at night, a shell only after a storm, a fish only at high tide). Variety then comes from the existing deterministic weather, tide and sky clock rather than from repetition. This is the Animal Crossing seasonal-catalogue logic, applied to Boogle's own cycles.
- **Communal log, personal credit.** The island's log is shared, and each entry remembers who found it first. This is "Communal world, personal rewards" made concrete. Alba-style "photograph it to log it" could reuse a simple look-at-and-press interaction, with no precision aiming needed. Detection is local and cosmetic, and only the "discovered" edit is synced.
- **A Short Hike's "7 is enough, more is easier"** is a model for any communal unlock: set a low threshold to reach the thing, with extras making it nicer, never mandatory.

### Gaps
- I found no Eguchi or Kyogoku primary interview specifically on the museum or encyclopedia design.
- I found no quantitative player research on collection completion rates or motivation in cozy games.

## 4. Which pacing patterns give long-term progress without grind?

### Takeaway
Across these games the pattern is: no timer and no fail state; a natural "one meaningful thing per session" cadence from real-time gates; immediate low-stakes tools for whenever you happen to be online; unlocks driven by variety (new kinds of thing) rather than volume; low thresholds; and an endgame that becomes a toy. Stålberg's warning against score and ConcernedApe's "relaxed pace" both point away from numbers the player optimises.

### Cited Findings
- **No timer, no competition.** Dorfromantik has nothing counting down, no resource cost, and "no winners, losers". [Mundo Gamer](https://mundogamer.community/en/articles/dorfromantiks-masterful-minimalism-will-soothe-your-soul); [gagadget review](https://gagadget.com/en/123169-dorfromantik-review-a-blissful-minimalist-chill-out-game/) (snippet)
- **No score.** "When you keep score, you play to the score." Score makes players stop watching the world. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- **Relaxed reward pacing.** Eric Barone (ConcernedApe) contrasts Stardew Valley with "hyper-stimulating" games that can burn players out. Players often report feeling reinvigorated, though he acknowledges some fans call it a "chore simulator". [NPR, Jan 2025](https://www.npr.org/2025/01/24/g-s1-44510/the-legacy-and-future-of-the-farming-game-stardew-valley) (snippet)
- **Real-time gates plus instant tools.** Animal Crossing's day-or-two waits for big changes create daily-burst play, and crafting and terraforming exist for immediate expression. [Game Developer](https://www.gamedeveloper.com/design/why-nintendo-s-new-i-animal-crossing-i-features-allow-instant-change-in-the-real-time-game)
- **Unlocks that rise but give choice.** Islanders raises the score needed for each unlock and lets you stay on an island rather than move on. Unlocks are new building types, which is variety, not more of the same. [Wikipedia: Islanders](https://en.wikipedia.org/wiki/Islanders_(video_game)) (snippet)
- **Goal variety over volume.** Dorfromantik quests change in kind ("at least 36", "exactly 13 and no more") and reward continued play with more tiles. [Game Developer](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-) (snippet)
- **Scaling, non-repetitive requirements.** Viva Piñata starts with trivial attractor conditions and makes them harder over time, and each species is a different puzzle. [HEXUS](https://hexus.net/gaming/reviews/xbox-360/7384-viva-pinata-xbox-360/?page=2) (snippet)
- **Optional, generous thresholds.** In A Short Hike, seven feathers is enough for the summit and more just makes it easier. [Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike) (snippet)
- **Communal restoration in Stardew Valley.** The Community Center has six rooms of item "bundles" (foraging, crops, fish, mining and so on). Each completed room restores part of the building and unlocks something useful, for example the Boiler Room repairs the minecarts for fast travel. The Joja route is a mutually exclusive alternative. [xgamingserver guide](https://xgamingserver.com/blog/how-to-complete-every-community-center-bundle-in-stardew-valley/) (snippet; secondary guide)
- **Endgame as toy.** Townscaper and Tiny Glade have no goals at all, and Stålberg calls Townscaper more a toy than a game. [Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making); [80.lv](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games) (snippet)
- **Restoration with an end.** Terra Nil finishes by recycling everything and leaving, so the progression has a clean finish rather than an endless treadmill. [Destructoid](https://www.destructoid.com/terra-nil-interview-release-date-trailer/) (snippet)

### Inferences
Concrete patterns for Boogle, each small and integer-friendly:
- **Bundle-style communal restoration (Stardew Community Center).** A small number of "shrines", such as the lighthouse or the windmills in `src/pois/`, each want a handful of different things: a shell, a fruit, a grown mushroom, a firefly seen. Anyone can contribute any time, and finishing one changes the world visibly. State is a few bitmasks per site. This is the most direct fit for "communal progression without grind" because it asks for variety, not quantity. Keep counts at 1 to 3 per item kind.
- **Growth-tick gates instead of effort gates.** Progress waits on world time (`GROW_TICKS`, `REGROW_TICKS`) and on conditions (rain, tide, night), not on repeated actions. That caps how much a single session can achieve without punishing anyone, and naturally yields one meaningful change per session.
- **Diminishing returns by design.** Each catalogue entry, bundle slot or attractor stage counts once. Repeating an action yields toy feedback (a bounce, a splash, a honk) but no extra progress, so there is nothing to grind.
- **No score UI.** Show progress only as world state, with at most a diegetic hint such as a half-lit lighthouse or a silhouette in the log. This follows Stålberg and "Toys before chores".
- **Endgame toy.** Every finished milestone should leave behind a new toy: a bouncier mushroom, a new fountain to splash in, a creature that plays with the ball. Do not leave a bigger number. This serves "The ball stays the star".

### Gaps
- I couldn't confirm Sky: Children of the Light's daily candle and light caps (a known anti-binge, daily-cadence pattern) from a source.
- I couldn't confirm co-op mechanics for shared Community Center bundles. The only multiplayer source was a forum bug report about bundle progress not persisting after a disconnect ([Stardew forums](https://forums.stardewvalley.net/threads/community-center-bug.53730/)), which is a useful warning about persistence but not design evidence.
- I found no primary ConcernedApe source on season length or the reasoning behind daily energy and time limits.

## 5. How do games make progress legible and celebrated, and keep shared history?

### Takeaway
Progress is felt when the world itself visibly changes: a silhouette becomes a colourful resident, a museum hall fills up, the land turns green, a room is restored. Shared history works best as traces left by named friends (Death Stranding's structures and likes) and as a curated record (Animal Crossing's museum). I found little primary design writing on ceremonies or unveilings specifically.

### Cited Findings
- Viva Piñata shows a state change visually: a black-and-white visitor turns into a full-colour resident when its conditions are met. [Wikipedia](https://en.wikipedia.org/wiki/Viva_Pi%C3%B1ata_(video_game)) (snippet)
- Terra Nil makes visual transformation the reward: barren land becomes thriving biomes, and the game ends with an airship departing. [Destructoid](https://www.destructoid.com/terra-nil-interview-release-date-trailer/); [Science Friday](https://www.sciencefriday.com/articles/terra-nil-video-game-climate-change/) (snippet)
- In Stardew Valley, finishing a Community Center room restores that part of the building, with a world-level unlock such as the minecarts. Completing every room closes JojaMart. [xgamingserver guide](https://xgamingserver.com/blog/how-to-complete-every-community-center-bundle-in-stardew-valley/) (snippet)
- The Animal Crossing museum turns finds into a browsable, chronologically arranged, permanent shared record that real curators praised. [Play the Past](https://www.playthepast.org/?p=6880); [GoNintendo](https://gonintendo.com/archives/348792-museum-curators-share-their-thoughts-on-animal-crossing-new-horizons-museum) (snippet)
- Death Stranding gives asynchronous recognition: traces of other people, plus likes that are unconditional and reward-free. Kojima says seeing evidence of others in the same loneliness can be comforting, and compares it to sitting in a cinema. [Game Developer](https://www.gamedeveloper.com/game-platforms/kojima-details-the-subtly-social-gameplay-of-i-death-stranding-i-)
- Death Stranding's Director's Cut set out to expand the asynchronous "Social Strand System". [Shacknews](https://shacknews.com/article/125784/a-big-goal-of-death-stranding-directors-cut-was-improving-the-asynchronous-multiplayer) (snippet)
- Townscaper's community built its own celebration channels: shared screenshots, 3D prints and a fan-made walkable browser viewer. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)

### Inferences
- **"We did it" moment.** When a communal milestone completes, the host stamps it at a tick and every connected client plays a short deterministic-timed ceremony: the lighthouse turns on, fireworks are particles, a creature arrives. Clients who join later see a quieter version (a plaque, or a log entry with "while you were away"). The ceremony itself is cosmetic, and only `milestone.done(id, tick)` is shared state.
- **Plaques and timeline.** Each milestone or first discovery records `{tick, contributors bitmask or ids}`. A small in-world board or log page lists "Day 12 · the herons came back · Ana, Leo". This costs a few integers per entry and serves "Leave something for the next visitor" and drop-in/drop-out: someone who missed a session learns what happened.
- **Death Stranding-style likes on traces.** Signs, sandcastles or dug channels left by a friend could take a "nice" honk or bump. The integer count affects only persistence or glow, never currency.
- **Prefer visible change over UI.** A half-restored site should look half-restored: the lighthouse lamp glows dimly, windmill sails are missing. This is how Viva Piñata and Terra Nil communicate it, and it avoids a progress bar.

### Gaps
- I found no primary sources specifically on designing ceremonies or unveilings, such as Animal Crossing's Resident Services or KK Slider concert ceremony, or Sky's area-restoration moments.
- I found no research on in-game shared memory features (timelines, plaques) and their effect on friend-group retention.

## 6. What do player-motivation research and designer talks say about this design space?

### Takeaway
Self-Determination Theory research (Ryan, Rigby and Przybylski 2006) ties enjoyment and continued play to felt autonomy, competence and relatedness rather than to rewards. Quantic Foundry's 12-motivation model separates the Creativity, Social and Immersion clusters, which this design targets, from the Achievement and Mastery clusters that drive grind. Designer statements from Stålberg, Kojima, Barone and Kyogoku agree: remove scores, keep rewards unconditional, keep the pace relaxed, and give off-hours players instant options.

### Cited Findings
- Ryan, Rigby and Przybylski, "The Motivational Pull of Video Games: A Self-Determination Theory Approach" (*Motivation and Emotion*, 2006), reports four studies. Felt autonomy and competence in a game were associated with enjoyment, game preference and changes in well-being. In the online multiplayer study, autonomy, competence and relatedness each independently predicted enjoyment and future play. [University of Rochester PDF](https://www.rochester.edu/warner/lida/wp-content/uploads/2022/11/02bfe513dd59366750000000.pdf); [ScienceDaily summary](https://www.sciencedaily.com/releases/2006/12/061226134706.htm) (snippet; findings from abstract-level summaries)
- A review of SDT work at CHI and CHI PLAY found that "certain core concepts (e.g., relatedness) have received little to no attention". Secondary summaries note the original studies' sample limits. [Frontiers in Virtual Reality 2022](https://www.frontiersin.org/journals/virtual-reality/articles/10.3389/frvir.2022.847120/pdf) (snippet)
- Quantic Foundry's Gamer Motivation Model has 12 motivations in six pairs grouped by correlation. It was built by factor analysis of survey data (400,000+ gamers in an early talk, later 2M). The Creativity cluster describes players who experiment with game worlds and customise them with their own designs. The Social cluster pairs Competition with Community, and Immersion covers Fantasy and Story. [ironSource LevelUp](https://medium.com/ironsource-levelup/a-closer-look-into-the-12-gamer-motivations-8d156ff0151a); [GDC Vault: A Deep Dive into the 12 Motivations](https://gdcvault.com/play/1025742/contactUs) (snippet)
- Sources disagree on the higher-level grouping: some describe six domains, while earlier Quantic Foundry material describes three high-level groups. [ironSource LevelUp](https://medium.com/ironsource-levelup/what-motivates-gamers-ccbffe9180c0); [Quantic Foundry site](https://quanticfoundry.com/) (snippet)
- Kojima on likes: no value, a purely positive gesture, so the game is "more positive than negative". [Game Developer](https://www.gamedeveloper.com/game-platforms/kojima-details-the-subtly-social-gameplay-of-i-death-stranding-i-)
- Stålberg on score crowding out attention to the world. [PC Gamer via Yahoo Tech](https://tech.yahoo.com/general/articles/townscapers-developer-radically-casual-design-191518493.html)
- Barone on relaxed pacing versus hyper-stimulation and burnout. [NPR](https://www.npr.org/2025/01/24/g-s1-44510/the-legacy-and-future-of-the-farming-game-stardew-valley) (snippet)
- Eguchi said Animal Crossing grew out of his loneliness after moving from Chiba to Kyoto, and a wish to recreate closeness with family and friends. [Wikipedia: Katsuya Eguchi](https://en.wikipedia.org/wiki/Katsuya_Eguchi) (snippet)
- Jenova Chen: "At its core, Sky is a game about compassion and generosity." His GDC F2P Summit talk covers consent-based communication and non-predatory transactions. [Apple Developer: Behind the Design](https://developer.apple.com/news/?id=zm47it7t); [GDC Vault](https://gdcvault.com/play/1034512/Free-to-Play-Summit-Designing) (snippet)

### Inferences
- **The three SDT needs map onto the mechanic families above.** Autonomy means choosing what to plant, attract or restore, with no mandated order. Competence means visible, legible results from a coarse action (Townscaper's split). Relatedness means traces, shared logs, communal milestones and co-presence.
- **Grind is mostly Achievement-cluster motivation:** completion pursued through repetition. The research doesn't say to remove completion. It suggests making completion depend on discovery and variety (Q3, Q4) so that Creativity- and Community-motivated friends aren't pushed into repetition.
- **Relatedness is under-studied** (Frontiers review), so there is little hard evidence on friend-group asynchronous play specifically. Boogle's playtests ("Playtest constantly with 2–4 real people", `docs/playtests.md`) are the right instrument. Useful questions to log: what changed since you were last here, did you notice it, and who did it.

### Gaps
- I couldn't retrieve the official list of all 12 Quantic Foundry motivation names (the quanticfoundry.com pages returned 403). Confirmed from secondary sources: Fantasy, Story, Competition, Community, a Creativity cluster (customisation and design), the Action pair (destruction and excitement), and a later "Discovery" factor. Do not fill in the rest from memory.
- I found no Quantic Foundry analysis specific to cozy games.
- I didn't access the full text of Ryan, Rigby and Przybylski 2006, so effect sizes are not reported here.
- The Kyogoku and Eguchi interviews were read only through secondary articles. I didn't access full Iwata Asks or Launcher transcripts.
- I found no primary ConcernedApe GDC talk or postmortem on pacing.
