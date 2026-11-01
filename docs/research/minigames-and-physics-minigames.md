# Research: mini-games and physics mini-games, and why they work

> **Update, 1 November 2026 (gap-fill round).** Section 5.3's unchecked list is replaced by findings on Animal Crossing
> tours, Mario Odyssey's jump rope and volleyball, Wobbly Life, Super Rubber Bandits, Stumble Guys, Club Penguin,
> Jackbox's audience and Mario Party / Wii Party (5.3–5.10). Golf With Your Friends' and Trackmania's unchecked lines
> are now sourced (one correction: GWYF balls do *not* collide by default). New findings use **[V]** (page fetched and
> read, same as "fetched") and **[S]** (search summary only, same as "search"). What changed in the recommendations:
> rounds aim at about 60 s with tempo that speeds up instead of new rules (10); every game gets an easy mark and a hard
> mark beside your best, and no global leaderboard (12); a venue teaches itself with an idle demo (2); you start and
> restart by stepping on and off the prop (8, 11); players who are out or waiting get a small role (17); and shortlist
> item 2 becomes a solo court rally first. Summary points 3, 6, 7 and 8 are revised to match.

*Research report, 1 November 2026. What designers of Wii Sports, WarioWare, Mario Kart, Fall Guys, Gang Beasts, Party Animals, Human Fall Flat, Rocket League, Ultimate Chicken Horse, Overcooked, Golf With Your Friends, Getting Over It, Peak, Sea of Thieves, Tears of the Kingdom and Trackmania said about the core verb, learnability, physics comedy, round length, funny failure, spectating, and play inside a shared world. Input to the pending mini-games design pass ([boogle-2.md](../proposals/boogle-2.md), "Mini-games get their own design pass later"). Builds on [hub-and-minigames.md](hub-and-minigames.md) (Club Penguin, Toontown, Habbo, Splatoon, Animal Crossing, Jackbox, Fall Guys' one-sentence rule), which it does not repeat. Tags: **fetched** (the page was loaded this session and the point read from it), **search** (from a search engine's summary of a page that was not loaded; weaker), **unchecked** (well-known game facts with no source checked). The first round's search budget ran out before the closest shared-world examples; the gap-fill round above covers them. Recommendations only; nothing here is a decision.*

## Summary: what matters most for Boogle

1. **Build the toy, then find the game inside it.** Gang Beasts' characters, Human Fall Flat's levels and Peak's whole game came out of messing with physics first; the rules came last. Boogle's ball, throw, bump, cart and Boogler are already the toys.
2. **One rule a newcomer reads in a glance.** WarioWare's only firm rule is instant readability; Fall Guys used a three-word rule. A Boogle mini-game should be explainable by the thing itself (a ring, a flag, a stack) with no text.
3. **Rounds are short, speed up, and restart instantly.** Microgames run 4–8 s, Stumble Guys rounds about 1 min, Fall Guys 45 s to 2.5 min, Overcooked 4 min. For Boogle: about 60 s (20–90 s), where the tempo rises instead of new rules arriving (Odyssey's rope spins faster every 5 jumps), and you restart by stepping off the prop and back on.
4. **Failure has to be the funniest part.** Ragdoll launches, topples and splashes (Gang Beasts, Party Animals, Fall Guys' "slapstick"). Losing costs seconds, never progress (Overcooked swapped lives for a timer).
5. **Fake the physics for control, keep it for comedy.** Rocket League fakes stability, separates handling from visuals and runs at 120 Hz; Fall Guys aims for about 80% skill and 20% chaos. The player's own verb is reliable; what it hits is loose.
6. **Fun to watch is half the design, and nobody just waits.** Miyamoto wanted onlookers laughing; Eguchi says Wii Sports watchers enjoy it as much as players. In an open world, spectators are people standing nearby: games should read from 20 m away, and someone who is out or waiting gets a small role (Rubber Bandits' knocked-out bandits become cops, Odyssey's second player is only Cappy, Jackbox's overflow becomes the audience).
7. **Score against the world or your own best, with two marks to aim at, and rubber-band anything head-to-head.** Odyssey's walk-up games pay out at an easy count and a hard one (30 and 100 jumps), Animal Crossing tours at bronze, silver and gold; Ultimate Chicken Horse rebuilt scoring so last place can catch up; Trackmania and Getting Over It run on personal bests and ghosts. Odyssey's global jump-rope board filled with glitched 99,999s and had to be reset: keep scores personal.
8. **Inside a shared world, a mini-game is a place with a prop, not a mode.** Walk onto it to start, walk off to stop; no lobby, no menu, no gate (DESIGN.md 8; Odyssey's volleyball starts when you step onto the empty half of the court; Sea of Thieves' "tools, not rules"; TotK's shrines). Animal Crossing put its stranger tours on a separate island so nothing done there could touch your town: in Boogle, mini-games stay Local and never write the saved world.
9. **Solo first, and group play adds without being needed.** Miyamoto's Super Mario Kart team tuned 1-player first and said two players would "automatically be fun"; that matches the owner's solo-first rule.
10. **Smallest first bets for Boogle:** a solo court rally (Odyssey's volleyball), a soapbox ghost, a topple stack at the palms, one ball-golf hole, and Boogler launch distance. All reuse what's built.

---

## 1. Learnability and the core verb

### 1.1 Wii Sports: the motion you already know (fetched)

[Iwata Asks: Wii Sports, "Fun to Watch as Well as Play"](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Sports/4-Fun-to-Watch-as-Well-as-Play/4-Fun-to-Watch-as-Well-as-Play-217921.html) and ["Serving an Imaginary Ball"](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Sports/3-Serving-an-Imaginary-Ball-/3-Serving-an-Imaginary-Ball--217876.html):

- The verb is a motion people already own (a swing, a bowl). Testers mimed tossing up a tennis ball even though the toss did nothing; Eguchi took that as a sign the mapping felt real. Someone who plays the real sport can beat a gamer.
- Depth comes from analogue variety in one verb: wrist angle and swing speed change every shot, so no two shots are the same (Ota on tennis; Shimamura on golf showing small wobbles).
- Bowling is "easy to start, hard to master": strikes come quickly, but nobody hit a perfect game in testing. The team also let you bowl backwards or into the next lane, a toy-first allowance.
- Watching is part of the design: Eguchi says the onlookers enjoy it as much as the player, and people queued for their turn.
- (search) In the [Wii Sports Resort interview](https://iwataasks.nintendo.com/interviews/wii/wiisportsresort/0/5/) the team simplified bowling further to swing-with-B-held.

### 1.2 WarioWare: readable in an instant (fetched)

- Goro Abe, [Nintendo World Report E3 interview](http://www.nintendoworldreport.com/interview/11588/warioware-smooth-moves-e3-interview): the team's only firm design rule is that you instantly see what's happening; otherwise each microgame should have "a different taste".
- Abe on WarioWare Gold ([Kotaku](https://kotaku.com/the-unusual-effort-that-went-into-creating-warioware-go-1829840289)): the team ranked microgames by how much staff liked them, how easy the rules were to understand, and whether they still felt fresh.
- (search) Microgames last about 4 s (short) to 8 s (long), per Abe in the [D.I.Y. Iwata Asks](https://iwataasks.nintendo.com/interviews/ds/diy/0/2/); speed-ups raise the tempo rather than adding rules.

### 1.3 Fall Guys: three words, 80/20 (search, plus fetched)

- (search) Joe Walsh, via [GamesRadar](https://www.gamesradar.com/fall-guys-interview/): an internal three-word rule (if a level can't be explained in three words, it's too complex) and a target of about 80% skill with a 20% sprinkle of chaos. (The page itself would not load; the earlier report has Walsh's "within a sentence" from another source.)
- (fetched) Anthony Pepper, [Way Too Many Games](https://waytoomany.games/2020/08/18/interview-with-anthony-pepper-senior-designer-behind-fall-guys/): rounds come from Takeshi's Castle, Wipeout, skipping ropes and playground chases; simple rules, challenge from timing and escalation (Jump Club's spokes get faster and faster). Control questions ("can a Fall Guy grab?") were design questions, and one mechanic is reused across rounds.
- (search) Round lengths from the [Fall Guys Db](https://www.playfallguys.com/fall_guys_db/) fan wiki (it claims telemetry, unsourced): shortest Door Dash about 45 s average, longest Hex-A-Gone about 2 min 18 s. An episode was planned as 4–5 rounds.

### 1.4 Mario Kart's battle mode: a toy that isn't the main game (fetched)

[Super Mario Kart developer interview (1992), Shmuplations](https://shmuplations.com/supermariokart/):

- Miyamoto wanted it because it "has nothing to do with racing", a second toy from the same verbs.
- The first arena was an open field; after five minutes you got dizzy, so they added walls. Arena shape is the design.
- Items add luck so the leader can't relax; Miyamoto says the fun is knowing something *might* happen.
- The goal was players *and onlookers* laughing. The team tuned 1-player first and reasoned that 2 players would then be fun too.

## 2. Physics comedy and funny failure

### 2.1 Gang Beasts: the character grew out of the physics (fetched)

- Michael Brown, [MCV](https://mcvuk.com/business-news/when-we-first-started-we-didnt-really-know-what-we-were-doing-how-gang-beasts-became-an-international-success/): no animator, so physics instead of hand animation. The characters have an invisible ball for legs and no feet (feet caught on things). The game was rebuilt three times.
- The test was "if you can punch someone in the face, you've got a game". A 5-minute round timer existed only for technical reasons, and the team disliked it; they planned stage escalations instead (a lift that fails and falls, a truck veering into a billboard), so the stage ends the round.
- Readable characters and instant-to-understand play made it streamable: an early stream reached about 40,000 viewers.
- [bit-tech (2014)](https://bit-tech.net/reviews/gaming/pc/interview-gang-beasts/1/): the physics came out of game jams; taunts let a "beaten" player come back; hazards were prototyped as things that help a player win; a crowd formed round the expo demo.

### 2.2 Party Animals: every hit has its own outcome (fetched)

[Goomba Stomp interview](https://goombastomp.com/party-animals-interview/): influences were Human Fall Flat, Gang Beasts, Stick Fight and Smash. A punch's effect depends on both players' positions, speed, stamina and where it lands, so the unexpected happens, and that's where the laughs are. The arena you land in keeps rounds fresh.

### 2.3 Human Fall Flat: playtesters broke the puzzles, and that became the game (fetched)

[TheGamer interview with Tomas Sakalauskas](https://www.thegamer.com/human-fall-flat-interview-tomas-sakalauskas/):

- It started as independent control of each arm. His son, playtesting, parkoured and wandered instead of solving puzzles, which showed the comedy was the appeal.
- A serious-sounding narrator and orchestral score set up the contrast so the slapstick lands harder.
- Anything a player might try was either made to work as expected or made unattractive; levels gained hidden colliders and chains to support improvised solutions.
- (search) Levels grew bigger and "less watertight" with each playtest, and solutions found in playtests were kept ([PS4Blog](https://www.ps4blog.net/2017/04/ps4blog-net-interview-tomas-sakalauskas-on-human-fall-flat/)).

### 2.4 Getting Over It and QWOP: failure with stakes (fetched)

[Game Developer, "The aesthetics of frustration"](https://www.gamedeveloper.com/design/designer-interview-the-aesthetics-of-frustration-in-i-getting-over-it-i-):

- Foddy wanted the stakes to come from your own accumulated effort, since games are otherwise fake. One continuous mountain means a fall loses something you had, unlike a restart.
- He choked near the top himself by tensing up; the game makes you fail moves you've mastered elsewhere.
- A streamer fell from near the summit to the start, sat silent for about 15 s, then started again. Watching that is the show.
- **For Boogle:** this is the opposite of slapstick (DESIGN.md 10 prefers funny over precise). The lesson to take is narrow: a visible height or distance you can lose is a strong hook for one optional, self-chosen skill toy, never for a shared or required one.

### 2.5 Overcooked: swap lives for a clock (fetched)

[Develop post-mortem, MCV](https://mcvuk.com/development-news/the-develop-post-mortem-overcooked/) and [Road to the IGF, Game Developer](https://www.gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i-):

- The first version used lives (a ruined dish cost one); players got bogged down. A timer created the panic they wanted. (search) Each level is about 4 minutes ([Cane and Rinse](https://caneandrinse.com/ghost-town-games/)).
- Too many tasks for the players and overlapping timers make it unravel; kitchens move mid-level so nobody settles into a routine.
- They designed levels backwards from the experience (separate the players, make a pinch point) and kept levels compact so the camera never pulled far back.
- Recipes needed a visual language instead of text; the task set stayed small so newcomers could join.
- Too few restrictions made it unintuitive; too many cut attachment. They knew they had it when friends kept playing without being bribed with pizza.

## 3. Game feel numbers and faking physics

### 3.1 Rocket League: consistent, controllable, faked where it counts (fetched)

Jared Cone, [GDC 2018 slides](https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf) ([Vault](https://www.gdcvault.com/play/1024972/It-IS-Rocket-Science-The)):

- Goals: fast, responsive vehicles; consistent, controllable physics. Bullet at a fixed 120 Hz (8.33 ms) with discrete collision.
- Friction is a curve of sideways speed over total speed, times a curve of ground slope: hand-tuned, not simulated.
- Workarounds for flipping: lower friction, limit steer angles, a "stay upright" constraint, forces applied at centre-of-mass height.
- Physics presets separate collision boxes and wheel positions from the art: many vehicles, few presets; +2 cm of wheel position changed handling. Summary slide: start simple, fake realism with visuals, separate setup from visuals.
- Corey Davis ([MCV](https://mcvuk.com/development-news/it-is-rocket-league-science-psyonix-on-the-tech-behind-its-car-football-smash-hit/)): impacts were slowed from the first game to favour team play; basketball mode kept the same physics so instincts carry over between modes.
- (search, unofficial) A fan analysis ([smish.dev](https://www.smish.dev/rocket_league/ball_simulation_3/)) reports an extra, predictable impulse on car-to-ball hits on top of the engine's.
- Boogle's soapbox already follows this (a frictionless sphere with grip added by hand, [soapbox.md](../game-design/soapbox.md)); the ball does not yet have a "designed hit".

### 3.2 Tears of the Kingdom: everything physical, so many answers (search)

[Game Developer on the GDC 2024 talk](https://www.gamedeveloper.com/programming/how-nintendo-did-the-impossible-with-tears-of-the-kingdom-s-physics-system): non-physics objects kept breaking, so Nintendo made every object physics-driven; shrines then had several solutions, some the developers found by accident. It extends BotW's "multiplicative gameplay" (GDC 2017). The audio team built what Fujibayashi called a physics engine for sound ([Game Developer](https://www.gamedeveloper.com/audio/tears-of-the-kingdom-s-sound-designers-unintentionally-made-a-physics-engine-for-sound-)). Shrines are short, self-contained rooms reached from the open world and never gate it.

## 4. Scoring, rounds and replay pull

### 4.1 Ultimate Chicken Horse: keep last place in it (fetched)

[Clever Endeavour, "Don't Fear (Game Design) Change!"](https://www.cleverendeavourgames.com/blog/2015/11/5/dont-fear-game-design-change): under the old scoring the leader won as long as they kept finishing, and the last-place player wanted the game to end. Four months before release they added points for finishing first, for a trap that kills someone, and a comeback bonus for a long-losing player who finally finishes (compared to Mario Kart's lightning bolt). Results became more fun to watch. (search) If everyone finishes, the level is "too easy" and nobody scores; a later update made that rule a setting ([Clever Endeavour dev blog](https://www.cleverendeavourgames.com/blog/category/Dev+Blog)). Players build the level against each other, so the course is the social object.

### 4.2 Golf With Your Friends: simultaneous turns (fetched)

[Nintendo Life with Kailan Clark](https://www.nintendolife.com/news/2020/06/feature_golf_with_your_friends_dev_on_community_feedback_and_the_secrets_of_a_great_hole): holes get gradually harder but keep flowing, with one obvious challenge plus hidden shots; holes the team didn't enjoy were changed or cut. Everyone plays at once (up to 12) rather than in turns. [S] Reviews ([Xbox Tavern](https://www.xboxtavern.com/golf-with-your-friends-review/), [PlayLab](https://www.tuni.fi/playlab/par-for-the-course-golf-with-your-friends-review/)) give default limits of about 2 minutes or 12 strokes per hole, so nobody holds the group up; both sliders can go to unlimited. Ball-to-ball collisions are **off** unless the lobby turns them on (the first round guessed the opposite): simultaneous play stays fair by default, and the chaos is opt-in.

### 4.3 Trackmania: tiny tracks, personal bests, ghosts (fetched)

[Wikipedia: Trackmania (2020)](https://en.wikipedia.org/wiki/Trackmania_(2020_video_game)): Weekly Shorts (from December 2024) release five short community maps every Sunday, leaderboards hidden during the week, in five styles (Wide, Slow, Puzzle, Fast, LOL). Track of the Day rotates daily. [S] Player guides and Ubisoft replies on [devtrackers.gg](https://devtrackers.gg/trackmania/p/4aae1d0f-can-t-get-personal-best-to-show) give the default keys: Backspace respawns at the last checkpoint, Delete gives up and restarts the run, G shows or hides your personal-best ghost (local play; not in multiplayer). A fixed short course plus a ghost is the cheapest replay pull there is, and needs nobody else online.

### 4.4 Roblox obbies and Fortnite Creative: what the platforms reward (search)

- Obbies ([Roblox wiki](https://roblox.fandom.com/wiki/Obby) and practitioner guides, weak evidence): a checkpoint per stage, difficulty as a staircase with plateaus, a winners' area at the end. Guides claim new players quit after 3–4 deaths on one early stage. Tower of Hell, the most-visited obby, has no checkpoints and is a timed race up a random tower.
- Fortnite's most-played islands ([fortnite.gg](https://fortnite.gg/creative?type=uefn) and trackers, approximate): tycoons draw the broadest casual crowd, box fights and zone wars the competitive one (they are practice for the main game's verbs); deathruns trail. Neither is evidence of what's fun with five friends; both show that short repeatable runs and visible accumulation pull hard.

## 5. Mini-games inside a shared world

### 5.1 Sea of Thieves: tools, not rules (fetched and search)

- (search) Shelley Preston: the team follows "tools, not rules" ([GameSpot](https://www.gamespot.com/articles/sea-of-thieves-tools-not-rules-design-keeps-it-unique-four-years-later/1100-6506144/), page would not load).
- (fetched) [Digital Trends](https://www.digitaltrends.com/gaming/sea-of-thieves-return-to-form-for-rare-studi/): players bend and break the rules, such as using a cursed chest to sink other ships; storm clouds over forts are "a catalyst for stories"; mechanics that work as expected (bailing water over the side) need no tutorial; progression is cosmetic because a cutlass is always a cutlass.

### 5.2 Peak: friction that needs a friend, and ghosts who still help (fetched)

- [Game Developer, "lessons in friendslop"](https://www.gamedeveloper.com/business/peak-co-developer-aggro-crab-shares-lessons-in-friendslop): social-first but playable alone. Small frictions need a friend (you can't unpack your own backpack). One player can read the guidebook and must relay it. Dead players become ghosts who keep talking and can see the whole situation, so failure doesn't remove you from the fun. A shared daily map gave everyone the same mountain to compare.
- [Game Developer, sales piece](https://www.gamedeveloper.com/production/how-co-op-climbing-hit-peak-achieved-2-million-sales-for-less-than-200-000-): built in a month-long jam where "the game jam IS the game"; core play was done by month's end, the rest was UX and polish. [80.lv](https://80.lv/articles/climbing-sim-peak-was-meant-to-be-friendslop-game-from-the-start): the genre relies on players to supply the comedy.
- (search) Stamina is the central system (climb freely, afflictions eat the bar), and the terrain is not hand-designed: in Kaman's words they "throw rocks at the wall" ([PC Gamer](https://www.pcgamer.com/games/adventure/peaks-success-helped-aggro-crab-commit-to-co-op-says-studio-head-we-thought-we-were-a-character-action-studio/)).

### 5.3 Mario Odyssey: walk onto the court, the tempo does the rest

No developer interview on these games turned up (Motokura's interviews cover prototyping kingdoms, not the mini-games); the facts are the games themselves, from the Super Mario Wiki.

- [V] [Jump-Rope Challenge](https://www.mariowiki.com/Jump-Rope_Challenge): two townsfolk turn a rope in a park in New Donk City. You jump in; each clear counts one. The rope speeds up every 5 jumps until 50, then holds (later versions vary it past 110). Touching the rope or leaving its area is a "MISS" and ends the attempt; step back and they start turning again. Moons at 30 and 100 jumps; a crowd cheers every 100.
- [V] [Beach Volleyball](https://www.mariowiki.com/Beach_Volleyball_(Super_Mario_Odyssey)): stepping onto the empty half of a beach court starts it, with an overhead camera. A coach serves; every return counts; the ball speeds up every two hits until 50. A ball that lands gets a short save window, then the attempt ends. Restart by walking off the court and back on. Moons at 15 and 100. In two-player mode the second player controls only Cappy, who can return or spike the ball: a helper role with one verb.
- [S] Both games post to a [Rankings Board](https://www.mariowiki.com/Rankings_Board) monitor beside them. The jump-rope world ranking filled with glitched 99,999 scores and a patch reset it ([Nintendo Everything](https://nintendoeverything.com/super-mario-odyssey-glitch-letting-players-wreak-havoc-on-jump-rope-mini-game-leaderboards/)); a reviewer at 41 jumps sat at 419,826th ([Kotaku](https://kotaku.com/i-m-okay-with-419-826th-place-in-mario-odyssey-s-jump-r-1827802614)).
- **For Boogle:** this is the closest match to "a place with a prop" in a shared open world. One verb the player already has (jump, hit), no new rule ever added, difficulty from tempo alone, two thresholds (one most people reach, one few do), start and restart by stepping on and off. The global board shows what a public ranking does to a casual game: the top is cheaters, and a normal player's rank means nothing.

### 5.4 Animal Crossing: New Leaf tours: a separate island, so strangers can't hurt you

- [V] [Iwata Asks: New Leaf, "Visiting Homes and Towns Wirelessly"](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Animal-Crossing-New-Leaf/Animal-Crossing-New-Leaf/4-Visiting-Homes-and-Towns-Wirelessly/4-Visiting-Homes-and-Towns-Wirelessly-738771.html): Kyogoku says Kapp'n ferries you to a separate island where tours work like mini-games, with random matching to strangers, with friends, or alone. Because it isn't your town, nothing that happens there can damage it; the aim was for people to communicate "safely and securely", and to give someone with no friends playing a way in.
- [V] [Nookipedia, Tour](https://nookipedia.com/wiki/Tour) (fan wiki, detailed): 64 tours in 12 kinds, nearly all the town's own verbs with one rule added (catch bugs, fish, dig fossils, find a hidden villager, pop balloons, match items). Time limits 3–8 minutes. Bronze, silver or gold pays medals, spent at the island's souvenir shop. Each day offers a random four per difficulty; two- and three-star tours unlock at 50 and 120 medals. The tour hands you the tools it needs; what's in your pockets is sold, so nothing from home leaks in.
- **For Boogle:** tours are the existing verbs plus one rule, which is what recommendation 1 asks. The separate island is the same move as keeping minis Local: a mini-game can't touch anyone's saved world. A small rotating set ("today's four") is a cheap freshness lever for later. The 3–8 minute length suits a trip you chose to take, not a walk-up prop.

### 5.5 Wobbly Life: freedom with some parameters

- [V] Thomas Dunn, [MCV/DEVELOP](https://mcvuk.com/business-news/thomas-dunn-on-making-wobbly-life-listening-to-the-community-and-leaving-room-for-players-to-make-their-own-fun/): the aim is to "allow room for the players to create their own gameplay and fun"; the hard part is giving lots of freedom with some parameters so there is still a loop. Jobs, missions and vehicles are those parameters; cash buys clothes, vehicles and houses. The roadmap comes from Discord suggestions.
- [V] [Tech4Gamers interview](https://tech4gamers.com/wobbly-life-interview/): Dunn liked Human Fall Flat's physics, says he never played Gang Beasts, and wanted a character players could pretend was them; networking makes crossplay hard.
- [S] A fan wiki lists 33 repeatable jobs (deliver something, fetch something, or combine items to fill orders) as the main way to earn money.
- **For Boogle:** the most-played physics open world for kids leans on jobs, which are chores. That sits against DESIGN.md 1 (Toys before chores) and is a reminder of what pulls when nothing else does; the lesson to take is Dunn's, not the job board: a few parameters around free play.

### 5.6 Super Rubber Bandits: the out player gets a new job

- [V] Bo Strandby and Noel Toivio, [Xbox Wire](https://news.xbox.com/en-us/2021/11/30/rubber-bandits-coming-to-xbox-december-2nd/): it began as a QWOP-like controller (arms and legs moved separately), became a physics brawler, and the heist theme came last from the art lead. Players eliminated from a round come back as cops hunting the remaining bandits, which kept them playing and made the theme stronger. Levels avoid tight spaces where swings hit walls; a "breath of fresh air" level sits in each theme so players don't tire.
- [V] Ole Teglbjærg, [GameDaily](https://www.gamedaily.biz/rubber-bandits-studio-flashbulb-games-on-organic-development-and-influencer-based-feedback/): small Steam "prologues" served as public prototypes; streamers couldn't work out how to throw, so the throw was redesigned; the network layer came from Trailmakers' synced physics.
- **For Boogle:** two lessons. A player who is out should get a different verb, not a wait (Peak's ghosts, 5.2, say the same). And watch first-timers find the verb: if they can't throw, the throw is wrong, not the player.

### 5.7 Stumble Guys: about a minute a round (secondary only)

- [V] [GameAnalytics](https://www.gameanalytics.com/blog/how-stumble-guys-hit-225m-downloads) (analysis, no developer quotes): rounds of roughly a minute, three rounds, 32 players halved each round; one thumb moves and the other jumps, with no tutorial; eliminated players can keep watching; everyone gets some reward even on a loss. Designed for interrupted play on a phone.
- [V] [mobilegamer.biz](https://mobilegamer.biz/stumble-guys-creator-kitka-takes-aim-at-fortnite-with-new-casual-battle-royale/) on Kitka's next game: fewer on-screen buttons, one weapon at a time, matches under 5–6 minutes.
- **For Boogle:** Fall Guys shrunk for touch landed on about 60 s rounds and two thumbs. The owner tests at iPad size; that argues for the low end of the 20–90 s range and for games whose verb is one button.

### 5.8 Club Penguin: simple enough for a seven-year-old

- [V] Lance Priebe, [Card-Jitsu](https://rocketsnail.com/games/card-jitsu/): the concept was one line (snow beats water, water beats fire, fire beats snow), aimed to be learnable by a seven-year-old yet deep enough to return to. Belts from white to black made progress visible; beating Sensei unlocked a mask and a hidden room. The Dojo had sat empty and locked for about three years first; his lesson is that an empty room and a locked door can be the best design, and that delaying an idea can help it.
- [V] [RocketSnail history](https://rocketsnail.com/blog/2011/02/21/experimenting-with-penguins/): the first artist hire also programmed the mini-games; snowball throwing was in the chat world before any game; parties began as a server load test (free hats to bring everyone online at once).
- [S] Fan sources: several mini-games were RocketSnail's older Flash games re-skinned (Ballistic Biscuit became Hydro Hopper; Puffle Roundup follows Meeblings); Sled Racing seats 2–4; Cart Surfer scores tricks; coins from mini-games buy igloo furniture.
- **For Boogle:** a rule that fits in one line, visible rank as a cosmetic, and mini-games built from games the team already had. The locked-Dojo story is a hint for later: a venue can sit visible and unexplained before it opens.

### 5.9 Jackbox: the overflow becomes the audience

- [V] [Jackbox blog, "How audience play-along differs"](https://www.jackboxgames.com/blog/how-audience-play-along-differs-in-each-jackbox-game): the audience is where "overflow friends" beyond the 8 seats go; mostly they vote on players' answers, sometimes they answer trivia, get their own score, give an "audience bonus", or eliminate a player. Staff recommend rotating new players in so everyone gets a turn.
- [V] Evan Jacover (CTO), [PAX Aus interview](https://novastreamnetwork.com/games/pax-aus-interview-jackbox-party/): the core is bringing people together physically; audience mode is an evolution of that, for hundreds or thousands at PAX and on streams. [S] Drawful 2's post (2016) puts the audience at up to 10,000 and credits streamer feedback.
- **For Boogle:** onlookers count when their one action changes the round a little (a vote, a bonus) without deciding it. In a physics world the audience's action is already there (bump the ball, stand in the way); the design job is to make it count a little and never ruin a run.

### 5.10 Mario Party and Wii Party: show, don't explain

- [V] Shuichiro Nishiya and Jumpei Horita, [Nintendo Life on Mario Party 10](https://www.nintendolife.com/news/2015/03/interview_nintendo_and_nd_cube_on_bowser_amiibo_and_the_pure_luck_of_the_dice_in_mario_party_10): ideas come from all staff, sometimes a single line or a drawing, and from everyday life; planners merge them. Text was cut: before a minigame you watch a short movie of the rules. Balance was the hardest part; catch-up tools (items from players who are out, extra dice for the trailing side) keep the result open to the end.
- [V] [Iwata Asks: Wii Party, "What's a Party?"](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii-Party/Iwata-Asks-Wii-Party/3-What-s-a-Party-/3-What-s-a-Party-224451.html): parties are about a good time together, not board games. Testers' biggest complaint was slow start-up (overviews, countdowns: "Hurry up and let me play!"). A tester who didn't want to replay a minigame got it reworked or cut. Time Bomb was too safe until a time limit and a visible wobble graph were added.
- **For Boogle:** teach by showing the game playing itself, not by text; cut every second before the verb; "would you replay it?" is the cut line, which find-the-fun's gut question already asks.

---

## What this means for Boogle

Recommendations for the mini-games design pass. Each names the DESIGN.md principle it serves.

### Mechanics

1. **Every mini-game is an existing toy plus one prop.** A ring, a flag, a stack, a start banner. No new verb unless a game cannot exist without it (Gang Beasts, Mario Kart battle, Rocket League's shared physics across modes). Serves 2 (Physics toys first).
2. **Check every game against WarioWare's rule:** can someone who walks up understand it from the prop alone, in under 5 s, with no text? If it needs a sentence of HUD text, cut the rules down. When nobody is playing, the venue can demo itself (a ghost ball knocking the stack, a ghost hop along the mushrooms), Mario Party's short rules movie done in the world. Serves 7 (Telegraph everything).
3. **Make the player's own verb reliable and what it hits loose.** The throw, bump and cart should be consistent (Rocket League's "consistent, controllable"; fake stability); the stack, the target, the launched body should topple, spin and bounce unpredictably (Party Animals, Fall Guys' 80/20). Serves 10.
4. **Give the ball a designed hit.** Like Rocket League's extra impulse: on a bump or a cart hit, add a fixed, predictable launch on top of the solver's result, so ball games can be aimed. Today's bump (9.2 m/s up, 3.4 m/s forward, [ball.md](../game-design/ball.md)) is already close; a ball game should tune it, not add a second ball.
5. **Let stage events end rounds, not clocks, where possible** (Gang Beasts' failing lift; Overcooked's moving kitchens). A wave, a gust or The Boogler wandering through is a more Boogle-like end than a timer. Serves 5 (Only the world is the antagonist) and 7.
6. **Keep improvised solutions working.** When a playtester cheeses a game (throws the cart, bumps from a rooftop), make it work rather than walling it off (Human Fall Flat, TotK). Serves 1.

### Game feel numbers

7. **Feedback within 100 ms of every scoring event**: hit-stop of 40–80 ms, a squash, a sound and a particle burst, reusing `impact.ts`. (The 100 ms figure is common practice, not from these sources; the existing impact feature already does most of it.)
8. **Restart costs under 2 s and one press**, from wherever you are (Trackmania, Getting Over It's long fall as the deliberate exception). The soapbox's "Back to the top" is the model; Odyssey's step-off-and-back-on needs no button at all. No countdowns or overviews before the verb (Wii Party's testers: "Hurry up and let me play!").
9. **Failure gets the biggest animation in the game.** A wipeout, a launch or a splash is the punchline (Gang Beasts, Fall Guys). Losing costs seconds only, never items or progress (Overcooked's lives-to-timer change). Serves 10.

### Round length and structure

10. **Target about 60 s per attempt (20–90 s)**: WarioWare's 4–8 s is too short for walking up, Overcooked's 4 min and Animal Crossing's 3–8 minute tours too long for drop-in. Stumble Guys settled on about a minute for touch; Fall Guys' 45 s–2.5 min is the neighbourhood. Difficulty rises by tempo, never by new rules: Odyssey speeds the rope every 5 jumps and the volleyball every 2 hits, both capped at 50 (Fall Guys' Jump Club does the same). A session is "a few attempts", never a fixed series.
11. **No lobby, no minimum count, no start button that needs others** (DESIGN.md 8). A game starts when one person steps onto it (Odyssey's volleyball court) and ends when they step off; others join the next attempt or join mid-attempt where physics allows.

### Scoring

12. **Default to personal bests and ghosts, plus two fixed marks** (Trackmania, Getting Over It's height). Each game has an easy mark most people reach in a few tries and a hard one few do (Odyssey's 30 and 100 jumps, 15 and 100 returns; Animal Crossing's bronze to gold), shown at the prop. Stored per player in localStorage; never a shared ladder: Odyssey's global jump-rope board filled with glitched maximums and had to be wiped. Serves 6 (Communal world, personal rewards).
13. **Where players compete directly, keep last place in it**: Ultimate Chicken Horse's comeback bonus and "everyone finished, so nobody scores". Show pips or marks in the world, not a ranked list. Serves 4 (Cooperation is automatic).
14. **Prefer the island as the opponent** (Fall Guys' players versus the course, Overcooked's clock), consistent with [hub-and-minigames.md](../proposals/hub-and-minigames.md) §3.
15. **No mini-game output is required for anything** ([boogle-2.md](../proposals/boogle-2.md): mini-games never gate progress). If a game pays som or knacks, it is cosmetic and options-only (Sea of Thieves' "a cutlass is always a cutlass").

### Drop-in players and spectating

16. **Spectating is standing nearby.** Design each venue to read from 20 m and from the lighthouse: a big flag where you landed, pips on the sand, a ghost cart. Miyamoto's and Eguchi's onlookers are Boogle's passers-by.
17. **Late arrivals join the next attempt automatically by stepping in** (Toontown's trolley from the earlier report), and can interfere in fun ways meanwhile (bump the ball, stand in the cart's way), like Peak's ghosts who still help. Where a game has a clear "out", the out player gets a new small verb rather than a wait (Rubber Bandits' eliminated bandits return as cops; Odyssey's second player is only Cappy; Jackbox's overflow votes). Interference is toy-level and counts a little, never griefing a saved result (DESIGN.md 5).
18. **Sync stays cheap.** Personal bests and ghosts are Local; a group score is Host; physics props are Owner. No mini-game needs Lockstep unless it changes the saved world.

### Solo versus group

19. **Each game passes solo first** (owner's rule; Miyamoto's 1-player-first argument). Solo reasons to play: a personal best, a ghost, a launch distance. Group adds: racing the ghost of a friend's run, comeback scoring, a pile-up.
20. **Group bonuses go to everyone** (Toontown, earlier report): a second player makes the game sillier, not harder for the first.

### Process

21. **Jam each game for a day as a toy, behind `?proto=`, before any score** (Peak's jam, Gang Beasts' jams, find-the-fun's flags). Rank candidates the way WarioWare Gold did: did testers like it, are the rules clear at a glance, does it still feel fresh on the fifth try. Cut what fails twice, and what a tester doesn't want to replay (Wii Party). Watch a first-timer find the verb: if they can't, change the verb (Rubber Bandits' throw).

## Ranked shortlist for the island

Ranked by fit with what's built (ball, throw, bump, soapbox, The Boogler, mushrooms, the court, the lighthouse hill), solo appeal, readability at a distance and cost. Each has the smallest prototype that would answer "is it fun?".

| # | Concept | One line | Draws on | Smallest prototype |
| --- | --- | --- | --- | --- |
| 1 | **Soapbox ghost** | Race your own best run down the lighthouse path. | Trackmania, Mario Kart time trials | Record the best run's cart pose at 20 Hz into localStorage; replay it as a translucent cart on the next run. No new physics. |
| 2 | **Court rally, then pips** | Solo first: keep the ball going against a server on the court; it speeds up as you go. With friends: keep it off your half. | Odyssey's beach volleyball, Wii Sports, Rocket League, UCH comeback | Step onto the court (centre (12, 21), radius 8 m) to start; a server (The Boogler or a post) lobs the ball over the net, every return counts, the lob speeds up every 2 returns to a cap, a ball on the sand ends it; marks at 15 and 50, best in localStorage. Pips (ball resting 0.5 s on a half adds a pip to the other side, first to 5) come after the solo version passes. |
| 3 | **Topple stack** | Knock a stacked pyramid off a stump with whatever you throw. | Fairground coconut shy, Party Animals' varied outcomes, WarioWare length | Six dynamic crates on a stump near the palms; count what falls off; it resets itself 4 s after the last falls. Your best on fewest throws, Local. |
| 4 | **Boogler launch** | Ride The Boogler until he flings you; see how far you fly. | Gang Beasts, Fall Guys "slapstick", Getting Over It's visible distance | On a launch, plant a flag where you land and show the distance; your best in localStorage; a friend's flag stays for 60 s. Uses the existing ride. |
| 5 | **Ball golf, one hole** | Get the beach ball into a bucket in as few throws and bumps as possible. Everyone plays at once. | Golf With Your Friends, Wii Sports golf | One bucket with a trigger 40 m from the court; a throw-and-bump counter starts when you first touch the ball. Personal best Local. |
| 6 | **Mushroom hop line** | Chain bounces along a line of mushrooms to a flag without touching sand. | Roblox obbies (checkpoints), Fall Guys, Mario Odyssey | Five fixed mushrooms in a row and a flag; a timer starts on the first bounce and fails on sand contact; one-press reset to the first mushroom. |
| 7 | **Cart pile-up** | Several carts, one slope, a stack of crates at the bottom: make the biggest mess. | Gang Beasts' escalation, Mario Kart battle (not racing), Human Fall Flat | Put the topple stack (3) at the soapbox finish; count crates scattered per run. Solo works; friends' carts add chaos. |
| 8 | **Frisbee to the lighthouse** | Throw the frisbee from the deck and land it in a ring on the beach. | Wii Sports Resort, Getting Over It's height-as-stake | A ring 30 m from the tower's base; distance to the ring on landing; best Local. Uses the existing frisbee and deck. |

Not shortlisted: anything needing a new verb (shoving, grabbing other players, swimming races), anything Lockstep (sandcastle versus the tide needs digging, removed 30 October), and long co-op tasks like Overcooked's kitchens or Peak's climb (good games, but long and coordination-heavy for drop-in; DESIGN.md 4 and 8).

## Gaps

- **No developer source for Mario Odyssey's mini-games, Stumble Guys or Club Penguin's arcade games** (Sled Racing, Cart Surfer, Puffle Roundup). Odyssey's facts are the games as documented on the Super Mario Wiki; Stumble Guys' are an analytics firm's write-up; Club Penguin's beyond Card-Jitsu are fan sources (the Club Penguin fandom wiki refused to load, so how Sled Racing seats players is unverified).
- **Wobbly Life's job entry** (a board, an NPC or a marker) is unverified: the fan wiki refused to load and Dunn's interviews don't describe it.
- **Jackbox never states why audience mode exists** beyond "bringing people together" and overflow seats; nothing measures whether the audience stays.
- **Mario Party:** only Mario Party 10 and Wii Party interviews were found; nothing from the Hudson era or on minigame length or skill tuning.
- **No primary source on ideal round length for drop-in groups.** The about-60 s target is inferred from WarioWare, Stumble Guys, Fall Guys and Overcooked.
- **No source measured whether spectating in-world (not a spectator mode) keeps people around.** Playtests will have to answer it.

## Sources fetched this session

| URL | Kind |
| --- | --- |
| https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Sports/4-Fun-to-Watch-as-Well-as-Play/4-Fun-to-Watch-as-Well-as-Play-217921.html | primary (Nintendo developers) |
| https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii/Iwata-Asks-Wii-Sports/3-Serving-an-Imaginary-Ball-/3-Serving-an-Imaginary-Ball--217876.html | primary |
| http://www.nintendoworldreport.com/interview/11588/warioware-smooth-moves-e3-interview | primary (Abe) |
| https://kotaku.com/the-unusual-effort-that-went-into-creating-warioware-go-1829840289 | primary quotes (Abe) |
| https://shmuplations.com/supermariokart/ | primary (translated 1992 interview) |
| https://waytoomany.games/2020/08/18/interview-with-anthony-pepper-senior-designer-behind-fall-guys/ | primary (Pepper) |
| https://mcvuk.com/business-news/when-we-first-started-we-didnt-really-know-what-we-were-doing-how-gang-beasts-became-an-international-success/ | primary quotes (Brown) |
| https://bit-tech.net/reviews/gaming/pc/interview-gang-beasts/1/ | primary (Brown) |
| https://goombastomp.com/party-animals-interview/ | primary (Recreate Games) |
| https://www.thegamer.com/human-fall-flat-interview-tomas-sakalauskas/ | primary (Sakalauskas) |
| https://www.gamedeveloper.com/design/designer-interview-the-aesthetics-of-frustration-in-i-getting-over-it-i- | primary (Foddy) |
| https://mcvuk.com/development-news/the-develop-post-mortem-overcooked/ | primary (Duncan) |
| https://www.gamedeveloper.com/design/road-to-the-igf-ghost-town-games-i-overcooked-i- | primary (Duncan) |
| https://media.gdcvault.com/gdc2018/presentations/Cone_Jared_It_Is_Rocket.pdf | primary (GDC slides) |
| https://mcvuk.com/development-news/it-is-rocket-league-science-psyonix-on-the-tech-behind-its-car-football-smash-hit/ | primary quotes (Davis) |
| https://www.cleverendeavourgames.com/blog/2015/11/5/dont-fear-game-design-change | primary (developer blog) |
| https://www.nintendolife.com/news/2020/06/feature_golf_with_your_friends_dev_on_community_feedback_and_the_secrets_of_a_great_hole | primary quotes (Clark) |
| https://www.gamedeveloper.com/business/peak-co-developer-aggro-crab-shares-lessons-in-friendslop | secondary (talk report) |
| https://www.gamedeveloper.com/production/how-co-op-climbing-hit-peak-achieved-2-million-sales-for-less-than-200-000- | secondary (talk report) |
| https://80.lv/articles/climbing-sim-peak-was-meant-to-be-friendslop-game-from-the-start | secondary |
| https://www.digitaltrends.com/gaming/sea-of-thieves-return-to-form-for-rare-studi/ | primary quotes (Rare) |
| https://en.wikipedia.org/wiki/Trackmania_(2020_video_game) | secondary |
| *Gap-fill round:* | |
| https://www.mariowiki.com/Jump-Rope_Challenge | secondary (fan wiki, game facts) |
| https://www.mariowiki.com/Beach_Volleyball_(Super_Mario_Odyssey) | secondary (fan wiki, game facts) |
| https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Animal-Crossing-New-Leaf/Animal-Crossing-New-Leaf/4-Visiting-Homes-and-Towns-Wirelessly/4-Visiting-Homes-and-Towns-Wirelessly-738771.html | primary (Kyogoku, Iwata) |
| https://nookipedia.com/wiki/Tour | secondary (fan wiki, game facts) |
| https://www.nintendo.com/en-gb/News/2016/November/What-s-hot-in-the-free-Animal-Crossing-New-Leaf-update-Hear-it-straight-from-the-developers-in-our-interview--1152239.html | primary (Eguchi, Nogami; little on mini-games) |
| https://mcvuk.com/business-news/thomas-dunn-on-making-wobbly-life-listening-to-the-community-and-leaving-room-for-players-to-make-their-own-fun/ | primary quotes (Dunn) |
| https://tech4gamers.com/wobbly-life-interview/ | primary (Dunn) |
| https://news.xbox.com/en-us/2021/11/30/rubber-bandits-coming-to-xbox-december-2nd/ | primary (Strandby, Toivio) |
| https://www.gamedaily.biz/rubber-bandits-studio-flashbulb-games-on-organic-development-and-influencer-based-feedback/ | primary quotes (Teglbjærg) |
| https://www.gameanalytics.com/blog/how-stumble-guys-hit-225m-downloads | secondary (analysis) |
| https://mobilegamer.biz/stumble-guys-creator-kitka-takes-aim-at-fortnite-with-new-casual-battle-royale/ | primary quotes (Kitka, on its next game) |
| https://rocketsnail.com/games/card-jitsu/ | primary (Priebe) |
| https://rocketsnail.com/blog/2011/02/21/experimenting-with-penguins/ | primary (Priebe) |
| https://rocketsnail.com/games/club-penguin/ | primary (Priebe) |
| https://www.jackboxgames.com/blog/how-audience-play-along-differs-in-each-jackbox-game | primary (developer blog) |
| https://novastreamnetwork.com/games/pax-aus-interview-jackbox-party/ | primary quotes (Jacover) |
| https://www.nintendolife.com/news/2015/03/interview_nintendo_and_nd_cube_on_bowser_amiibo_and_the_pure_luck_of_the_dice_in_mario_party_10 | primary (Nishiya, Horita) |
| https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-Wii-Party/Iwata-Asks-Wii-Party/3-What-s-a-Party-/3-What-s-a-Party-224451.html | primary (NDcube, Iwata) |

Would not load: GamesRadar's Fall Guys interview and GameSpot's Sea of Thieves piece (403/truncated), GamesBeat's Fall Guys piece (403). Their points above are tagged **search**. Gap-fill round: the Club Penguin and Wobbly Life fandom wikis (HTTP 402), Windows Central's Wobbly Life interview (body truncated) and iwataasks.nintendo.com (certificate error; the nintendo.com mirror was used).
