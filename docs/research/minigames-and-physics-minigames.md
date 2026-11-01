# Research: mini-games and physics mini-games, and why they work

*Research report, 1 November 2026. What designers of Wii Sports, WarioWare, Mario Kart, Fall Guys, Gang Beasts, Party Animals, Human Fall Flat, Rocket League, Ultimate Chicken Horse, Overcooked, Golf With Your Friends, Getting Over It, Peak, Sea of Thieves, Tears of the Kingdom and Trackmania said about the core verb, learnability, physics comedy, round length, funny failure, spectating, and play inside a shared world. Input to the pending mini-games design pass ([boogle-2.md](../proposals/boogle-2.md), "Mini-games get their own design pass later"). Builds on [hub-and-minigames.md](hub-and-minigames.md) (Club Penguin, Toontown, Habbo, Splatoon, Animal Crossing, Jackbox, Fall Guys' one-sentence rule), which it does not repeat. Tags: **fetched** (the page was loaded this session and the point read from it), **search** (from a search engine's summary of a page that was not loaded; weaker), **unchecked** (well-known game facts with no source checked this round). The session's web-search budget ran out partway, so Jackbox's audience mode, Wobbly Life, Stumble Guys, Super Rubber Bandits, Animal Crossing tours, Club Penguin's individual games and Mario Odyssey's mini-games are unchecked or missing. Recommendations only; nothing here is a decision.*

## Summary: what matters most for Boogle

1. **Build the toy, then find the game inside it.** Gang Beasts' characters, Human Fall Flat's levels and Peak's whole game came out of messing with physics first; the rules came last. Boogle's ball, throw, bump, cart and Boogler are already the toys.
2. **One rule a newcomer reads in a glance.** WarioWare's only firm rule is instant readability; Fall Guys used a three-word rule. A Boogle mini-game should be explainable by the thing itself (a ring, a flag, a stack) with no text.
3. **Rounds are short and restart instantly.** Microgames run 4–8 s, Fall Guys rounds about 45 s to 2.5 min, Overcooked levels 4 min. For Boogle: 20–90 s rounds, restart in one press, from where you stand.
4. **Failure has to be the funniest part.** Ragdoll launches, topples and splashes (Gang Beasts, Party Animals, Fall Guys' "slapstick"). Losing costs seconds, never progress (Overcooked swapped lives for a timer).
5. **Fake the physics for control, keep it for comedy.** Rocket League fakes stability, separates handling from visuals and runs at 120 Hz; Fall Guys aims for about 80% skill and 20% chaos. The player's own verb is reliable; what it hits is loose.
6. **Fun to watch is half the design.** Miyamoto wanted onlookers laughing; Eguchi says Wii Sports watchers enjoy it as much as players. In an open world, spectators are just people standing nearby: games should read from 20 m away.
7. **Score against the world or your own best, and rubber-band anything head-to-head.** Ultimate Chicken Horse rebuilt scoring so the last-place player can always catch up; Trackmania and Getting Over It run on personal bests and ghosts.
8. **Inside a shared world, a mini-game is a place with a prop, not a mode.** Walk up, start, walk away; no lobby, no gate (DESIGN.md 8; Sea of Thieves' "tools, not rules"; TotK's physics-first shrines).
9. **Solo first, and group play adds without being needed.** Miyamoto's Super Mario Kart team tuned 1-player first and said two players would "automatically be fun"; that matches the owner's solo-first rule.
10. **Smallest first bets for Boogle:** court ball pips, a soapbox ghost, a topple stack at the palms, one ball-golf hole, and Boogler launch distance. All reuse what's built.

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

[Nintendo Life with Kailan Clark](https://www.nintendolife.com/news/2020/06/feature_golf_with_your_friends_dev_on_community_feedback_and_the_secrets_of_a_great_hole): holes get gradually harder but keep flowing, with one obvious challenge plus hidden shots; holes the team didn't enjoy were changed or cut. Everyone plays at once (up to 12) rather than in turns. (unchecked) Balls collide, and a stroke limit and per-hole timer stop anyone holding up the group.

### 4.3 Trackmania: tiny tracks, personal bests, ghosts (fetched)

[Wikipedia: Trackmania (2020)](https://en.wikipedia.org/wiki/Trackmania_(2020_video_game)): Weekly Shorts (from December 2024) release five short community maps every Sunday, leaderboards hidden during the week, in five styles (Wide, Slow, Puzzle, Fast, LOL). Track of the Day rotates daily. (unchecked) Restart is one key and instant; your best run plays as a ghost. A fixed short course plus a ghost is the cheapest replay pull there is, and needs nobody else online.

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

### 5.3 Unchecked this round

From general knowledge, no source loaded; treat as prompts for a later round, not evidence:

- **Wobbly Life:** an open physics town where jobs (delivery, pizza, taxi, mining) are short loops started at a board in the world, paying cosmetic money, all optional.
- **Stumble Guys:** Fall Guys' format shrunk for phones: fewer rounds, shorter matches.
- **Super Rubber Bandits:** physics heist brawler, short rounds, Gang Beasts-style grabbing.
- **Animal Crossing (New Leaf) tours:** island tours were short, rule-light mini-games (bug hunts, hide-and-seek) for up to four, entered from a desk and paid in medals for cosmetics.
- **Mario Odyssey:** jump rope and beach volleyball sit in the open kingdoms as walk-up challenges with a local best and a moon at a threshold; Koopa Freerunning races replay.
- **Club Penguin:** Sled Racing and Cart Surfer were entered at a prop in a room (a sled line, a cart); Find Four and Mancala tables seated two.
- **Jackbox:** the audience vote lets late arrivals take part without joining the round (the earlier report notes rooms lock mid-round).

---

## What this means for Boogle

Recommendations for the mini-games design pass. Each names the DESIGN.md principle it serves.

### Mechanics

1. **Every mini-game is an existing toy plus one prop.** A ring, a flag, a stack, a start banner. No new verb unless a game cannot exist without it (Gang Beasts, Mario Kart battle, Rocket League's shared physics across modes). Serves 2 (Physics toys first).
2. **Check every game against WarioWare's rule:** can someone who walks up understand it from the prop alone, in under 5 s, with no text? If it needs a sentence of HUD text, cut the rules down. Serves 7 (Telegraph everything).
3. **Make the player's own verb reliable and what it hits loose.** The throw, bump and cart should be consistent (Rocket League's "consistent, controllable"; fake stability); the stack, the target, the launched body should topple, spin and bounce unpredictably (Party Animals, Fall Guys' 80/20). Serves 10.
4. **Give the ball a designed hit.** Like Rocket League's extra impulse: on a bump or a cart hit, add a fixed, predictable launch on top of the solver's result, so ball games can be aimed. Today's bump (9.2 m/s up, 3.4 m/s forward, [ball.md](../game-design/ball.md)) is already close; a ball game should tune it, not add a second ball.
5. **Let stage events end rounds, not clocks, where possible** (Gang Beasts' failing lift; Overcooked's moving kitchens). A wave, a gust or The Boogler wandering through is a more Boogle-like end than a timer. Serves 5 (Only the world is the antagonist) and 7.
6. **Keep improvised solutions working.** When a playtester cheeses a game (throws the cart, bumps from a rooftop), make it work rather than walling it off (Human Fall Flat, TotK). Serves 1.

### Game feel numbers

7. **Feedback within 100 ms of every scoring event**: hit-stop of 40–80 ms, a squash, a sound and a particle burst, reusing `impact.ts`. (The 100 ms figure is common practice, not from these sources; the existing impact feature already does most of it.)
8. **Restart costs under 2 s and one press**, from wherever you are (Trackmania, Getting Over It's long fall as the deliberate exception). The soapbox's "Back to the top" is the model.
9. **Failure gets the biggest animation in the game.** A wipeout, a launch or a splash is the punchline (Gang Beasts, Fall Guys). Losing costs seconds only, never items or progress (Overcooked's lives-to-timer change). Serves 10.

### Round length and structure

10. **Target 20–90 s per attempt**: WarioWare's 4–8 s is too short for walking up, Overcooked's 4 min too long for drop-in. Fall Guys' 45 s–2.5 min is the right neighbourhood. A session is "a few attempts", never a fixed series.
11. **No lobby, no minimum count, no start button that needs others** (DESIGN.md 8). A game starts when one person steps into it; others join the next attempt or join mid-attempt where physics allows.

### Scoring

12. **Default to personal bests and ghosts** (Trackmania, Getting Over It's height). Stored per player in localStorage; never a shared ladder. Serves 6 (Communal world, personal rewards).
13. **Where players compete directly, keep last place in it**: Ultimate Chicken Horse's comeback bonus and "everyone finished, so nobody scores". Show pips or marks in the world, not a ranked list. Serves 4 (Cooperation is automatic).
14. **Prefer the island as the opponent** (Fall Guys' players versus the course, Overcooked's clock), consistent with [hub-and-minigames.md](../proposals/hub-and-minigames.md) §3.
15. **No mini-game output is required for anything** ([boogle-2.md](../proposals/boogle-2.md): mini-games never gate progress). If a game pays som or knacks, it is cosmetic and options-only (Sea of Thieves' "a cutlass is always a cutlass").

### Drop-in players and spectating

16. **Spectating is standing nearby.** Design each venue to read from 20 m and from the lighthouse: a big flag where you landed, pips on the sand, a ghost cart. Miyamoto's and Eguchi's onlookers are Boogle's passers-by.
17. **Late arrivals join the next attempt automatically by stepping in** (Toontown's trolley from the earlier report), and can interfere in fun ways meanwhile (bump the ball, stand in the cart's way), like Peak's ghosts who still help. Interference is toy-level, never griefing a saved result (DESIGN.md 5).
18. **Sync stays cheap.** Personal bests and ghosts are Local; a group score is Host; physics props are Owner. No mini-game needs Lockstep unless it changes the saved world.

### Solo versus group

19. **Each game passes solo first** (owner's rule; Miyamoto's 1-player-first argument). Solo reasons to play: a personal best, a ghost, a launch distance. Group adds: racing the ghost of a friend's run, comeback scoring, a pile-up.
20. **Group bonuses go to everyone** (Toontown, earlier report): a second player makes the game sillier, not harder for the first.

### Process

21. **Jam each game for a day as a toy, behind `?proto=`, before any score** (Peak's jam, Gang Beasts' jams, find-the-fun's flags). Rank candidates the way WarioWare Gold did: did testers like it, are the rules clear at a glance, does it still feel fresh on the fifth try. Cut what fails twice.

## Ranked shortlist for the island

Ranked by fit with what's built (ball, throw, bump, soapbox, The Boogler, mushrooms, the court, the lighthouse hill), solo appeal, readability at a distance and cost. Each has the smallest prototype that would answer "is it fun?".

| # | Concept | One line | Draws on | Smallest prototype |
| --- | --- | --- | --- | --- |
| 1 | **Soapbox ghost** | Race your own best run down the lighthouse path. | Trackmania, Mario Kart time trials | Record the best run's cart pose at 20 Hz into localStorage; replay it as a translucent cart on the next run. No new physics. |
| 2 | **Court ball pips** | Keep the ball off your half of the court; land it on theirs. Solo: against a wall or The Boogler. | Wii Sports, Rocket League, UCH comeback | Split the existing court (centre (12, 21), radius 8 m) by a painted line; when the ball rests on one half for 0.5 s, add a sand pip to the other side. Local count, no teams, first to 5. |
| 3 | **Topple stack** | Knock a stacked pyramid off a stump with whatever you throw. | Fairground coconut shy, Party Animals' varied outcomes, WarioWare length | Six dynamic crates on a stump near the palms; count what falls off; it resets itself 4 s after the last falls. Your best on fewest throws, Local. |
| 4 | **Boogler launch** | Ride The Boogler until he flings you; see how far you fly. | Gang Beasts, Fall Guys "slapstick", Getting Over It's visible distance | On a launch, plant a flag where you land and show the distance; your best in localStorage; a friend's flag stays for 60 s. Uses the existing ride. |
| 5 | **Ball golf, one hole** | Get the beach ball into a bucket in as few throws and bumps as possible. Everyone plays at once. | Golf With Your Friends, Wii Sports golf | One bucket with a trigger 40 m from the court; a throw-and-bump counter starts when you first touch the ball. Personal best Local. |
| 6 | **Mushroom hop line** | Chain bounces along a line of mushrooms to a flag without touching sand. | Roblox obbies (checkpoints), Fall Guys, Mario Odyssey | Five fixed mushrooms in a row and a flag; a timer starts on the first bounce and fails on sand contact; one-press reset to the first mushroom. |
| 7 | **Cart pile-up** | Several carts, one slope, a stack of crates at the bottom: make the biggest mess. | Gang Beasts' escalation, Mario Kart battle (not racing), Human Fall Flat | Put the topple stack (3) at the soapbox finish; count crates scattered per run. Solo works; friends' carts add chaos. |
| 8 | **Frisbee to the lighthouse** | Throw the frisbee from the deck and land it in a ring on the beach. | Wii Sports Resort, Getting Over It's height-as-stake | A ring 30 m from the tower's base; distance to the ring on landing; best Local. Uses the existing frisbee and deck. |

Not shortlisted: anything needing a new verb (shoving, grabbing other players, swimming races), anything Lockstep (sandcastle versus the tide needs digging, removed 30 October), and long co-op tasks like Overcooked's kitchens or Peak's climb (good games, but long and coordination-heavy for drop-in; DESIGN.md 4 and 8).

## Gaps

- **Jackbox's audience mode, Wobbly Life, Stumble Guys, Super Rubber Bandits, Animal Crossing tours, Club Penguin's mini-games and Mario Odyssey's walk-up games** were not checked (search budget). They are the closest precedents for mini-games inside a shared world and deserve a follow-up round.
- **No primary source on ideal round length for drop-in groups.** The 20–90 s range is inferred from WarioWare, Fall Guys and Overcooked.
- **No source measured whether spectating in-world (not a spectator mode) keeps people around.** Playtests will have to answer it.
- **Mario Party** returned no design interview; its minigame lessons are absent.

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

Would not load: GamesRadar's Fall Guys interview and GameSpot's Sea of Thieves piece (403/truncated), GamesBeat's Fall Guys piece (403). Their points above are tagged **search**.
