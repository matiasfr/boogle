# Progression models for Boogle 2.0

*Research note, 30 October 2026. Question: if mini-games stop being the main source of era progress (eight eras, castaway to maglev, an archipelago joined by rail), what else can move the island forward? Builds on `docs/research/communal-progression.md` and `docs/proposals/hub-and-minigames.md` in the repo.*

**Markers.** **[V]** means the quote was checked this session on the linked page (an interview or a write-up of a talk). **[S]** means secondary: a wiki, a news paraphrase, or a page that could not be fetched. Treat [S] facts as likely, not certain.

**The short answer.** The safest engine for era progress is **world state that ordinary play produces anyway**: things delivered, places reached, conditions holding, tasks crossed off by anyone. Mini-games then become **one route among several** into each era's wants, never the only one. The cargo-and-train idea survives, but as *logistics*: trains carry whatever the island produces, and mini-games make only a fraction of it.

---

## 1. Exploration-gated reach

**Examples.** Zelda's hookshot and other gating items; Subnautica's depth limits per vehicle and upgrade [S]; A Short Hike's golden feathers (about 7 of 20-odd needed for the summit [S]); Sable's hoverbike. Adam Robinson-Yu: "In some cases, I'd just use collectables to draw players towards new areas of the map." [V] Shedworks' mantra for Sable: "if you can see it, you can go there and explore it", and a "'lemon shape,' because it had a beginning and end alongside a loose middle" [V].

- **Earned by:** getting a tool or vehicle that opens new ground.
- **Asks of players:** curiosity and travel. In the A Short Hike version, finding more makes the goal easier, but you don't need all of it.
- **Drop-in friends:** if reach is personal (Zelda), friends split (Valheim's problem, cited in the earlier research). If reach belongs to the *island* (the bridge exists, the steam wagon is parked at the station), a newcomer gets everything at once.
- **Single-activity risk:** low, *if* the gate opens through several routes.
- **Principles:** strong on "leave something" (a new bridge is a visible trace). DESIGN.md principle 3 forbids locking movement or areas behind *farming*, so the gate has to be the era, never a crop count.
- **Sync:** vehicles are Owner (the same as the ball); "this islet is reachable" is one bit of Lockstep state.
- **Boogle fit:** each era *is* a reach upgrade (raft, steam wagon, harbour ferry, monorail). This is the natural **reward** for an era, not its **engine**.

## 2. Collection and museum

**Examples.** Animal Crossing's museum, a tent after 5 donations and a building after 15 more [S, Nookipedia]; Pikmin 2's treasure hoard, which pays off a 10,000-Poko debt [S]; Viva Piñata, where creatures that don't treat your garden as home appear "in monochrome form" until it meets their needs [V].

- **Earned by:** donating a first-of-its-kind find; the building grows as the collection grows.
- **Asks of players:** noticing things. Very low precision.
- **Drop-in friends:** excellent. A donation is permanent, credited by name, and visible to the next visitor.
- **Single-activity risk:** none, because finds come from everywhere: the shore, the caves, fruit knocked down by the ball, mini-game trophies.
- **Principles:** fits "communal world, personal rewards" (communal shelves, personal credit) and "leave something".
- **Sync:** a Lockstep bitset plus each find's first tick and finder's name, the same shape as the earlier research's `log.discover`.
- **Boogle fit:** good as an *era meter*. The museum or station hall gains a room per era. It overlaps with the separate discovery research, so keep it to physical objects.

## 3. Logistics and automation networks

**Examples.** Factorio. Michal Kovařík: "the game is about figuring out how to automate it" and "it feels really nice to just sit down and look at it." [V] Mini Metro: Peter Curry, "graphic design is game design" [S, Giant Bomb returned 403]. Dorfromantik: Timo Falcke on its quests, "designed none of them to be too punishing for someone just building for aesthetics" [V]. Also Railroads Online (co-op track laying and train running, the closest analogue to Boogle's railway [S]), Satisfactory, Transport Tycoon and Islanders.

- **Earned by:** throughput. A network that moves enough of the right things unlocks the next tier.
- **Asks of players:** planning and some maintenance. Factorio-depth logistics is precision play.
- **Drop-in friends:** mixed. A running network works while you're away, which is good, but newcomers can't read a dense factory. Mini Metro and Dorfromantik stay readable because they are minimal.
- **Single-activity risk:** high if laying track is the only verb. Low if the *network carries* goods that other play produces.
- **Principles:** "toys before chores" holds only if trains are fun to watch and ride with no goal: the ball on a flatcar, slapstick level crossings. Throughput targets lean toward chores.
- **Sync:** the most Boogle-friendly model of all. A train on fixed rails is **Lockstep without state**: its position is a pure function of tick and timetable (integer arc length; `+ - * /` and `sqrt` only), exactly like the tide. Laying track is a Lockstep op. Riders are Owner avatars that stand on the computed pose. Physics never touches the train.

## 4. Sandbox to-do lists

**Examples.** Untitled Goose Game: "Everything from pulling up a carrot to honking at someone feels like 'success' when your goal is just to bother people." [V] Hitman: Christian Elverdam, "The purpose of the game is finding that mastery, learning where everyone and everything goes in the level." [V] Wobbly Life gives you jobs (delivery, taxi, fishing) that pay for houses and outfits [S].

- **Earned by:** crossing off authored tasks in a sandbox that would be fun anyway.
- **Asks of players:** playful problem solving. Each task is a prompt to mess about.
- **Drop-in friends:** good, if the list is communal and *any* N of M items will do.
- **Single-activity risk:** low by design. Each task is a different activity, and only a subset is needed.
- **Principles:** the Goose list works because the tasks *are* the slapstick ("slapstick over precision"). The risk is Sky's finding from Jenova Chen's team, quoted below: a crisp checklist pulls friends apart.
- **Sync:** a Lockstep bitmask of crossed-off tasks with the names of who crossed them off. Detection is a host-stamped op, the same pattern the earlier research proposed for the honk chord.

## 5. Communal restoration bundles

**Examples.** Stardew's Community Center: 6 rooms and about 30 bundles, each room repairing a bridge, minecarts, a greenhouse or the bus [S, wiki]. A Barone sketch note about the Junimos reads "They leave after its complete." [S, news reprint] Animal Crossing: New Leaf's public works: one project at a time, chip-in donations, and the result appears the next morning [S, Nookipedia].

- **Earned by:** delivering *varied* items to a named place, which then changes for good.
- **Asks of players:** gathering a little of everything. The variety is what does the work.
- **Drop-in friends:** very good. Deliveries are additive and permanent, and the reveal can be delayed so absent friends see it.
- **Single-activity risk:** low if each bundle mixes sources (one fruit, one shell, one mushroom, one "three friends rang the bell").
- **Principles:** this is the shape the earlier research already recommended. It maps one to one onto **construction projects per era** (a station, a bridge, a coal staithe).
- **Sync:** a Lockstep want-bitmask per project. Tiny.

## 6. Environmental and simulation milestones

**Examples.** Terra Nil: "An arboretum can make a forest, which can house trees, and those can house beehives. One begets another." It ends with "deconstructing all your artificial architecture to leave only a slice of nature behind." [V, Destructoid] From Dust: Éric Chahi called it "like playing 'sandcastle' on the beach, except you have more material to use, like lava" [V], and "The player just controls the obstacles on the terrain." [V] Timberborn's droughts and Frostpunk's hope and discontent meters both gate on the state of a colony [S].

- **Earned by:** the world crossing thresholds: enough wet soil, a connected lagoon, N residents, a lit beacon.
- **Asks of players:** shaping the world, not repeating inputs. Coarse gestures, rich response.
- **Drop-in friends:** strong, because the state persists and conditions can be met by many small contributions. A drawback: thresholds that nobody can see feel random.
- **Single-activity risk:** low if conditions span sand, water, garden and creatures.
- **Principles:** the closest fit to Boogle's own core ("water is the glue"). Principle 7 ("Telegraph everything") requires *visible* thresholds: silhouettes, half-lit lamps.
- **Sync:** conditions are pure reads of Lockstep state (water grid, mushrooms), checked in a tick. That costs nothing extra, but the checks must use integer math.

## 7. Crafting by combination

**Examples.** Tears of the Kingdom: Takuhiro Dohta, "Rather than create something fun, create a system that makes fun things happen" [V, Digital Trends on the GDC 2024 talk]. Takahiro Takayama on first seeing Ultrahand and Fuse: "Development is going to be chaos." [V] Doodle God unlocks elements by combining pairs [S].

- **Earned by:** *inventing*. The first time anyone combines a wheel and a crate, the island learns "cart".
- **Asks of players:** experimentation. TotK-style building is open-ended and slapstick; Doodle God is a guessing game.
- **Drop-in friends:** a communal recipe book works ("Leo invented the steam wagon"), but once a recipe is known the surprise is spent.
- **Single-activity risk:** medium. Everything rests on combining being fun.
- **Principles:** strongly "toys before chores" and "slapstick". The ball fused onto a cart is a gift to principle 2.
- **Sync:** the hardest fit. Joints between bodies owned by different clients rubber-band (flagged in the earlier research). Keep a contraption Owner by whoever built it, and the recipe book as a Lockstep bitset.

## 8. Cartography and mapping

**Examples.** Tunic: "getting to study a mysterious page feels like mystery-solving", and players are "more likely to internalize and 'own' their discoveries" [V, Game Developer]. Outer Wilds' ship log splits the mystery into "curiosity webs" so it can be solved in any order [S, podcast notes]. Elden Ring reveals map fragments at steles [S].

- **Earned by:** going places, then recording them.
- **Asks of players:** wandering, which every visitor does anyway.
- **Drop-in friends:** a shared island chart that fills in where *anyone* walked is one of the best "what happened while I was away" displays.
- **Single-activity risk:** none.
- **Principles:** pairs with model 1: charting an islet is the trigger, and the next era bridges to it.
- **Sync:** a coarse explored-chunks bitset in Lockstep, fed by position ops each client throttles. The other agent covers discovery, so this note stops here.

## 9. Season and event rotations

**Examples.** Deep Rock Galactic reopened old seasons so "those who have been playing for years will be able to play how they want without the risk of missing out on anything." [V, GGRecon] Sky runs seasonal events, and its team warned: "The more compelling the goal in front of players, the more likely they were to completely ignore each other." [V, Game Developer] Fortnite changes its map at the end of each chapter in a one-time live event [S].

- **Earned by:** being there during a window, plus a seasonal track.
- **Asks of players:** showing up at the right time, which is the scarce resource for 3–5 friends.
- **Drop-in friends:** poor if anything can be missed. Fine if seasons come back, as DRG's do.
- **Single-activity risk:** each season's featured activity carries it.
- **Principles:** time-limited items can make play feel obligatory. The hub proposal already prefers parties, where being there earns the item.
- **Sync:** the calendar is Lockstep without state (a function of date and seed, chosen once by the host); party props are Host.
- **Boogle fit:** use this for era *transitions*, not era progress. Once an era's wants are met, the change happens at the next gathering as a ceremony.

---

## Comparison

| Model | Progress comes from | Precision | Async friends | Single-activity risk | Best principle fit | Sync cost |
|---|---|---|---|---|---|---|
| 1 Reach | tools and vehicles | low–med | good if communal | low | leave something | Owner vehicles + 1 bit |
| 2 Museum | first finds | none | excellent | none | communal / personal | Lockstep bitset |
| 3 Logistics | throughput | med–high | mixed | high if it's the only verb | ball (on trains) | **Lockstep, stateless trains** |
| 4 To-do list | authored tasks | low | good with N of M | low | slapstick | Lockstep bitmask, host-detected |
| 5 Bundles | varied deliveries | none | very good | low | cooperation automatic | Lockstep bitmask |
| 6 Milestones | world thresholds | none | strong | low | toys before chores | free reads of the sim |
| 7 Combination | inventions | low | ok, spent once known | medium | toys, slapstick | Owner contraptions (hard joints) |
| 8 Cartography | places reached | none | excellent | none | leave something | Lockstep chunk bitset |
| 9 Seasons | attendance | none | poor unless seasons return | high | drop-in (if lenient) | stateless calendar |

---

## Progression recipes for Boogle

Shared rule for all four: an era needs **any K of M** wants (about 6 of 9), and **at most one third** of the wants can be met by a mini-game. Mini-games pay **personal** rewards (hats, som) plus an occasional *bonus* good, so skipping them only slows things a little.

### A. "The line goes out": bundles + logistics + reach

**Evening.** Two friends knock fruit off palms with the ball and toss it into the beach freight wagon, someone tips a crate of flotsam in, and a third drops a cave crystal. The steam train runs on its timetable to the bridgehead, where the project board (a half-built trestle) lights one pip per *kind* of good. Someone plays court ball and wins a coal sack, which is a bonus good, not a required one.
**Era advance.** When the trestle's wants are met, it completes at the next session start. The next islet opens with a new vehicle, and the line extends.
**Riskiest assumption:** loading wagons feels like play, not haulage. **Prototype:** one hand-cart on a fixed track from the court to the lighthouse, plus one bin wanting three different items, behind `?proto=freight`. Do friends feed it unprompted, and do they throw things in?

### B. "The island notices": milestones + museum

**Evening.** Nobody follows a list. People dig, flood a lagoon, grow mushrooms and drop finds at the station hall. A silhouette engine stands in the yard. Each condition it needs ("deep water connected to the sea", "12 grown caps", "the lighthouse lit", "10 different finds displayed") colours in part of it.
**Era advance.** When all its parts are coloured, the engine arrives at dusk with a whistle the whole island hears. That is the Viva Piñata visitor-to-resident move, applied to technology.
**Riskiest assumption:** players read and care about conditions they can't see as tasks. **Prototype:** one condition-gated resident (the gull flock appears when connected deep water exceeds N cells), with a silhouette telegraph and no HUD. Ask afterwards: "Why did the gulls come?"

### C. "The era noticeboard": to-do list + seasonal ceremony

**Evening.** A board at the station shows nine slapstick tasks for the era: "bonk the Boogler off the pier with the ball", "get three friends onto the minecart at once", "float the ball through the cave pond", "finish a regatta". Anyone crosses one off, and their name goes on it. The mini-game items are one or two of the nine.
**Era advance.** Six crossed off triggers a **ceremony at the next time 3+ friends are online together** (or after 48 h, for small groups): the board burns away and the new era rolls in on the next train. Rotating old boards come back as parties.
**Riskiest assumption:** the list doesn't do what Sky's team saw clear goals do and make friends ignore each other. **Prototype:** a static noticeboard of 8 tasks for one evening, crossed off by hand through a host op, with no reward. Watch whether people chase tasks alone or call friends over.

### D. "Tinkerers' island": combination + cartography

**Evening.** Someone shoves a barrel onto a crate with wheels and the island logs "Mia invented the cart". Each era's inventions are combinations of junk the island already has. Another friend rafts out and charts the islet, which reveals where the next era's material lies (iron at the north islet).
**Era advance.** An era turns over when its two or three signature inventions have been made *and* the islet with their material has been charted.
**Riskiest assumption:** combining is a toy in Boogle's networked physics, and the surprise survives a shared recipe book. **Prototype:** a Local-only sandbox with three combinations (crate+wheels, crate+ball, barrel+sail), so no sync is needed. Is it fun for five minutes with no recipe book?

**Recommendation.** **A** with **B**'s silhouette telegraph is the best match for the railway fantasy and Boogle's tech, because stateless Lockstep trains cost almost nothing. **C** is the cheapest to prototype and could run as early as this week. Test the A and C prototypes in the same evening.

---

## Sources

| # | Source | Used for | Status |
|---|---|---|---|
| 1 | [Game Developer: Road to the IGF, A Short Hike](https://www.gamedeveloper.com/disciplines/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-) | collectables draw players | V |
| 2 | [Wikipedia: A Short Hike](https://en.wikipedia.org/wiki/A_Short_Hike) | feather counts | S |
| 3 | [Game Developer: Sable's lemon-shaped structure](https://www.gamedeveloper.com/design/using-a-lemon-shaped-structure-to-create-the-sanguine-open-world-of-i-sable-i-) | "if you can see it…", lemon shape | V |
| 4 | [Wikipedia: Subnautica](https://en.wikipedia.org/wiki/Subnautica) | depth gating | S |
| 5 | [Nookipedia: Museum](https://nookipedia.com/wiki/Museum), [Public works project](https://nookipedia.com/wiki/Public_works_project) | museum tiers, public works | S |
| 6 | [Wikipedia: Pikmin 2](https://en.wikipedia.org/wiki/Pikmin_2) | treasure debt | S |
| 7 | [Game Developer: Viva Piñata, buzzlegums and fudgehogs](https://www.gamedeveloper.com/design/rare-s-i-viva-pinata-i-giving-the-world-buzzlegums-and-fudgehogs) | monochrome visitors | V |
| 8 | [Software Engineering Daily: Factorio transcript](https://softwareengineeringdaily.com/wp-content/uploads/2024/10/SED1762-Factorio.txt) | Kovařík quotes | V |
| 9 | [Giant Bomb: Peter Curry interview](https://giantbomb.com/users/3929/articles/interview-peter-curry-co-creator-of-mini-metro) | "graphic design is game design" | S (403) |
| 10 | [Game Developer: Dorfromantik](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-) | non-punishing quests | V |
| 11 | [Game Developer: Road to the IGF, Untitled Goose Game](https://www.gamedeveloper.com/game-platforms/road-to-the-igf-house-house-s-i-untitled-goose-game-i-) | "success… bother people" | V |
| 12 | [GamesBeat: Hitman is a living sandbox](https://gamesbeat.com/hitman-is-a-living-sandbox-not-an-episodic-game/) | Elverdam on mastery | V |
| 13 | [Stardew Valley wiki: Bundles](https://stardewvalleywiki.com/Bundles); [GoNintendo: Community Center sketch](https://gonintendo.com/contents/19373-stardew-valley-dev-shares-notebook-sketch-showcasing-the-community-center-s-origins) | bundle structure, Barone note | S |
| 14 | [Destructoid: Terra Nil interview](https://www.destructoid.com/terra-nil-interview-release-date-trailer/) | "one begets another", ending | V |
| 15 | [Engadget: Chahi on sandcastles](https://www.engadget.com/2010/06/30/chahi-project-dust-is-like-building-sandcastles-with-more-lava/); [Game Developer: The Core of From Dust](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-) | Chahi quotes | V |
| 16 | [Wikipedia: Frostpunk](https://en.wikipedia.org/wiki/Frostpunk), [Timberborn](https://en.wikipedia.org/wiki/Timberborn) | state-gated colonies | S |
| 17 | [Digital Trends: TotK physics at GDC 2024](https://www.digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics/) | Dohta, Takayama | V (reported talk) |
| 18 | [Wikipedia: Doodle God](https://en.wikipedia.org/wiki/Doodle_God) | combination unlocks | S |
| 19 | [Game Developer: Tunic and NES manuals](https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals) | Shouldice quotes | V |
| 20 | [The Fourth Curtain: Alex Beachum episode](https://ppacc.player.fm/series/the-fourth-curtain/outer-wilds-alex-beachums-cool-weird-emotional-prototypes) | "curiosity webs" | S (show notes) |
| 21 | [GGRecon: Deep Rock Galactic interview](https://ggrecon.com/articles/deep-rock-galactic-interview) | old seasons | V |
| 22 | [Game Developer: Emotion and social play in Sky](https://gamedeveloper.com/design/using-emotion-to-drive-social-play-in-i-sky-children-of-the-light-i-) | goals make players ignore each other | V |
| 23 | Wobbly Life, Railroads Online, Satisfactory, Islanders, Transport Tycoon, Fortnite, Elden Ring: Steam pages and wikis | mechanics only, no quotes | S |
