# Primary-source notes (fetched 2026-10-29)

Raw facts for the research reports. No design proposals here.

**How to read this file**

- **fetched**: the page itself was loaded with WebFetch on 2026-10-29. Quotes come from that page. WebFetch passes pages through a summarizer, so treat quotes as near-verbatim and check the wording against the URL before you print it.
- **secondary**: the page itself could not be loaded or was not tried. The fact comes from search-result snippets or press coverage. Cite it with care.
- **failed**: the fetch errored, or the page did not contain the fact. The reason is given.

## 1. Game feel and vehicles

### Steve Swink, *Game Feel* (secondary: the book itself was not fetched)

- Book: Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation*, Morgan Kaufmann/CRC Press.
- Definition: "realtime control of virtual objects in a simulated space, with interactions emphasised by polish."
  - Source: https://en.wikipedia.org/wiki/Game_feel (fetched). Wikipedia sources the wording to Pichlmair & Johansen (2020), not to the book directly.
  - Other sources spell it "real-time" and "emphasized".
- Liz England's review (fetched: https://lizengland.com/blog/review-game-feel-by-steve-swink/, 26 Aug 2015):
  - "a Venn diagram of real-time response, simulated space, and polish."
  - Real-time means a perceive-decide-act-respond cycle "of under 100 milliseconds."
  - "'Simulated space' specifically refers to a 2D or 3D world with movement and collision."
- Wikipedia also lists the book's six areas: input, response, context, polish, metaphor, rules.

### Jonasson & Purho, "Juice It or Lose It" (fetched)

- URL: https://gdcvault.com/play/1016487/Juice-It-or-Lose
- Event: GDC Europe 2012, Independent Games Summit. Speakers: Martin Jonasson and Petri Purho (Kloonigames).
- "Martin and Petri will demonstrate the neat little tricks you can apply to any game to make it more satisfying to play", by "cranking a boring old game up to eleven, live on stage."
- Secondary: an earlier showing at Nordic Game Jam in May 2012.

### Jan Willem Nijman, "The Art of Screenshake" (fetched, via press)

- URL: https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games
- Article: Alex Wawro, 2 Jan 2014.
- Event: Control Conference in Amsterdam (INDIGO Classes), November 2013. "Clocking in at almost 45 minutes".
- Format: a basic shooter receives "30 minor tweaks that each make the game a bit better". Examples given:
  - Screen shake "in the opposite direction of the player's gunfire."
  - "a 33% chance of enemies exploding harmlessly on death."
- The video itself was not fetched.

### Jared Cone, Rocket League physics talk (fetched: listing only)

- URL: https://www.gdcvault.com/play/1024972/
- Title: "It IS Rocket Science! The Physics of 'Rocket League' Detailed". Speaker: Jared Cone (Psyonix). GDC 2018, Programming track.
- Listing: "'Rocket League' owes a large part of its success to how fun it is to play for people of all ages."
- Secondary (rocketleague.com): session on 21 Mar 2018, Cone listed as Lead Gameplay Engineer.
- The talk content (video on GDC's YouTube channel) was **not** fetched. No technical numbers are recorded here.

### Raycast vehicles

- "Tips for raycast vehicles" (Space Dust Racing): **failed**. No primary post was found.
  - Forum posts (Unreal forums, secondary) describe the "Space Dust physics tutorial": one downward ray per corner, with upward force scaled by compression.
  - The common fix in those posts: add a velocity-based damper term, or the body never settles.
- Toyful Games, "Making Custom Car Physics in Unity (for Very Very Valet)": https://www.youtube.com/watch?v=CdPYlj5uZeI (secondary: the video was not fetched).
  - Summaries describe one rigidbody, with a per-tire raycast computing suspension, traction (steering) and acceleration forces.
- cannon-es `RaycastVehicle` (fetched: https://pmndrs.github.io/cannon-es/docs/classes/RaycastVehicle.html):
  - Constructor: `{ chassisBody, indexRightAxis, indexForwardAxis, indexUpAxis }`.
  - Methods: `addWheel(options)`, `addToWorld(world)`, `applyEngineForce(value, wheelIndex)`, `setBrake(brake, wheelIndex)`, `setSteeringValue(value, wheelIndex)`, `updateWheelTransform(wheelIndex)` ("call this before rendering wheels"), `getWheelTransformWorld`, `removeFromWorld`.
- cannon-es `WheelInfo` defaults (fetched: https://raw.githubusercontent.com/pmndrs/cannon-es/master/src/objects/WheelInfo.ts):

  | Option | Default |
  | --- | --- |
  | `suspensionRestLength` | 1 |
  | `suspensionMaxLength` | 2 |
  | `radius` | 1 |
  | `suspensionStiffness` | 100 |
  | `dampingCompression` | 10 |
  | `dampingRelaxation` | 10 |
  | `frictionSlip` | 10.5 |
  | `forwardAcceleration` | 1 |
  | `sideAcceleration` | 1 |
  | `rollInfluence` | 0.01 |
  | `maxSuspensionForce` | `Number.MAX_VALUE` |
  | `maxSuspensionTravel` | 1 |
  | `isFrontWheel` | true |
  | `useCustomSlidingRotationalSpeed` | false |
  | `customSlidingRotationalSpeed` | -0.1 |

  - The constructor resets these to fixed values, so passing them does nothing: `steering`, `rotation`, `deltaRotation`, `suspensionForce`, `suspensionLength`, `slipInfo`, `skidInfo`.
  - Boogle pins cannon-es 0.20.0 (`package.json`). These defaults were read from `master`.

## 2. Exploration, level design, social multiplayer

### Breath of the Wild, CEDEC 2017 (fetched: a translation summary, not the talk)

- URL: https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399 ("Matt Walker's translation of CEDEC 2017 talks by Nintendo", from 4Gamer and Game Watch).
- Speakers (secondary: Kotaku, Game Developer): Hidemaro Fujibayashi and Makoto Yonezu, "Field Level Design in The Legend of Zelda: Breath of the Wild".
- "Triangle Rule": triangles let players choose between going over and going around, and they hide what lies behind. That hiding is what makes surprise possible.
- Three sizes of triangle:
  - Large: "landmarks that serve as visual markers."
  - Medium: "serve to obstruct the player's view."
  - Small: set the pacing of play.
- Rectangles hide things fully, while triangles reveal them gradually.
- "Gravity": "placing structures of varying visibility/importance in different places", which pulls players sidetracked between them ("infinite play").
- Problem it solved: "Players felt they were being guided". Playtest heatmaps showed play concentrated on a few paths, and after the change the second heatmap was "more well distributed".
- Towers: at first the team assumed they could "spread the towers throughout the map". In the final game, structures hide the towers (example chain: "hill -> bridge structure -> tower").

### Smith & Worch, "What Happened Here? Environmental Storytelling" (fetched)

- URL: https://gdcvault.com/play/1012647/What-Happened-Here-Environmental
- Event: GDC 2010. Speakers: Harvey Smith (Arkane Studios) and Matthias Worch (LucasArts on the GDC listing; secondary sources say Visceral Games).
- The overview, paraphrased by the fetch tool:
  - The environment works as a storytelling device that asks players to interpret clues rather than receive exposition.
  - Tools: props, scripted events, texturing, lighting, composition.
  - The talk extends this to systemic reactions to player actions.
- Harvey Smith's blog post, 14 Mar 2010 (fetched: https://www.witchboy.net/?p=621): "Matthias Worch and I gave a talk on Environmental Storytelling, a subject we both love". Slides and notes are at http://www.witchboy.net/articles/what-happened-here/ (that page was not opened).

### Sky: Children of the Light (fetched: listings only)

- John Hughes (thatgamecompany), "Designing Social Play for 'Sky: Children of the Light'", GDC Summer 2020: https://gdcvault.com/play/1026818/Designing-Social-Play-for-Sky
  - Listing: "The definition of "social" gameplay can be elusive and counterintuitive."
- Jenova Chen, GDC 2024 Free-to-Play Summit, "Designing to Reduce Toxicity in Online Games": https://gdcvault.com/play/1034512/ (secondary: listing via search).
  - Topics: consent-based communication, large-scale events, non-predatory transactions.
  - PC Gamer coverage: "Nobody is born toxic". Sky's message system was inspired by Dark Souls.
- Chen, "Can We Experience Compassion through Play?": https://www.gdcvault.com/play/1028065/ (not opened).
- The talk videos are behind GDC Vault login and were **not** viewed.

### Death Stranding (fetched)

- URL: https://www.gameinformer.com/interview/2019/09/16/hideo-kojima-answers-our-questions-about-death-stranding (Joe Juba, 16 Sep 2019).
- Quotes from Kojima:
  - "Giving 'likes' is giving unconditional love."
  - "I didn't want to give any negative in this game; it was a positive intent where I started this idea."
  - "if [your objects] have few likes, they might disappear."
  - "you can't see other people's faces, but you can see the tracks and traces."
  - "In this direct communication era, I wanted to create an indirect communication using the technology of today."
- The phrase "Social Strand System" does **not** appear in this interview.
- Secondary: GamesRadar reports Kojima calling it a new genre, "strand games". That page fetched truncated (**failed**).

### Kind Words (fetched)

- URL: https://www.inverse.com/gaming/kind-words-2-ziba-scott-interview (Robin Bea, 27 Dec 2023).
- Quotes from Ziba Scott:
  - On likes and counts: "I put none of that into the original _Kind Words_, so you're just free to talk to people."
  - "So much of my development time is spent on the moderation systems, both automated tools and manual decisions."
  - On Kind Words 2: "You can only exchange three couplets between each other and then the conversation is done", in "an asynchronous chat system where you can walk through town and start little text messages with everybody."
- Secondary (Wikipedia, via search): Popcannibal is Ziba Scott and Luigi Guatieri. The game launched in July 2019 as a Humble Original and on Steam in September 2019.

### Animal Crossing: New Horizons flower breeding (secondary; primary datamine **failed**)

- The joeyparrish.github.io/acnh-flowers guide was fetched, but the portion read (first 100k characters) contains no odds.
- Community guides cite the datamine:
  - Base chance 5% per day.
  - Visitor-watering bonus by number of visitors: 1 → 20%, 2 → 30%, 3 → 45%, 4 → 60%, 5+ → 75%. Only the first 10 visitors each day count.
  - Rain or owner watering adds about 5%.
  - After 3 days without offspring, the chance rises 5% per day.
- Sources disagree on whether the visitor bonus stacks on the base. One guide's "about 80% total" is an interpretation.
- Sources: https://aiterusawato.github.io/satogu/acnh/flowers/advanced.html and the Bell Tree Forums "ACNH Guide On Hybrids" thread (not fetched).

## 3. Progression, lore and tech trees

### Outer Wilds

- Wikipedia (fetched: https://en.wikipedia.org/wiki/Outer_Wilds):
  - "learning new things is the only feedback the player gets."
  - Development "began ... in 2012 as director Alex Beachum's master's thesis."
  - Mobius Digital was "founded in 2013 by his classmate Loan Verneau" and Masi Oka.
  - 22-minute loop.
  - PC and Xbox One release on 28 May 2019.
  - "estimated as having sold over 2 million copies by August 2021."
- MCV/DEVELOP (fetched: https://mcvuk.com/business-news/we-didnt-think-it-would-have-tremendously-broad-appeal-mobius-digital-on-the-multi-bafta-award-winning-outer-wilds, Chris Wallace, 3 Apr 2020), quoting Beachum:
  - "We wanted to make sure that players are exploring because they're curious about the world, and not for any other reason."
  - "you're finding clues that teach you about things to go investigate, but we don't put a giant waypoint on your map."
  - The Mobius staffer quoted in this piece is Logan Ver Hoef (tech artist), not Loan Verneau.
- GameSkinny interview (**failed**, 403). The snippet reads: the first pillar is "curiosity-driven exploration", meaning "the sole purpose of exploration in Outer Wilds is to seek answers to questions you have about the world."
- Axios, 27 Sep 2021 (**failed**, 403). The snippet quotes Beachum: "We want this to be a game about you exploring because you want to answer questions."

### A Short Hike (fetched)

- Game Developer, "Road to the IGF" (https://www.gamedeveloper.com/disciplines/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-, Joel Couture, 21 Feb 2020). Quotes from Adam Robinson-Yu:
  - "I wanted to make each region of the island feel unique."
  - "I tried to create interesting landmarks that would pique people's curiosity."
  - "In some cases, I'd just use collectables to draw players towards new areas of the map."
  - "I only gave myself four months to finish the tiny project."
  - "When I was initially planning A Short Hike, I tried to keep the scope really small."
- PlayStation Blog (https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/, 5 Aug 2021):
  - "I tried to design the game as a tiny open world."
  - "I wanted to encourage exploring the road less travelled, and have your curiosity be rewarded."
- Golden feathers: neither primary source discusses them. Wikipedia (secondary) says they raise stamina for climbing, sprinting and midair jumps, and that enough of them are needed to reach the summit.

### Tunic (fetched)

- URL: https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals (Joel Couture, 14 Feb 2023). Quotes from Andrew Shouldice:
  - "A key part of feeling like a world isn't made for you is feeling like it was made for someone else."
  - On the NES manuals he read as a child: "it was clear that they weren't meant for me."
  - "The hope was that filling the world with unreadable text would help convey this same feeling."
  - "A full-screen tutorial popup feels deeply invasive and can ruin any sense of wonder"
  - "getting to study a mysterious page feels like mystery-solving."
  - "Essential techniques? Those got a full page"

### Soren Johnson on tech trees (fetched)

- URL: https://www.designer-notes.com/?p=1703, "Old World Designer Notes #4: The Technology Deck" (18 Aug 2021).
- Quotes:
  - "one of the trade-offs that the traditional tech tree made in the name of clarity was determinism."
  - "it was very easy to remember the exact order of the ten techs which led to Gunpowder."
  - "each tech would be represented by a card".
  - Skipped techs return only when the deck cycles, "guaranteeing difficult decisions."
  - "there is no longer a golden path through the tech tree".
- Old World's system: draw four tech cards, pick one, discard the rest.
- This post is about Old World. No Civ IV-specific Johnson post was fetched.

### Valheim

- Game Developer (fetched: https://gamedeveloper.com/business/valheim-has-sold-10-million-copies-in-just-over-a-year, Chris Kerr, 25 Apr 2022): "Valheim has sold 10 million copies in just over a year".
- Secondary:
  - 12 million copies, disclosed by Embracer in September 2023.
  - 3 million copies in under a week after the February 2021 Early Access launch.
- PC Gamer roadmap (**failed**: truncated page). Secondary snippet: Henrik Törnqvist said each biome gets its own boss.
- No primary source on progression design was found.

### Deep Rock Galactic (fetched)

- URL: https://gamerant.com/deep-rock-galactic-interview-season-1-co-op-design-battle-pass-progression/ (Jason Rochlin, 18 Dec 2021). Quotes from game director Mikkel Martin Pedersen:
  - "If you're missing one class, you always feel like you're missing out on some mechanics."
  - On the Performance Pass: "The fact we aren't monetizing ours I think makes it clear we're doing it for fun."
  - "...you can just jump in, play with strangers, and have a great experience."
- No primary quote on promotions or overclocks was found.

### Pikmin treasures (fetched: fan wiki)

- URL: https://www.pikminwiki.com/Treasure
- Pikmin 2:
  - "In total, there are 201 treasures to collect." Total value is 26,985 Pokos (US).
  - The Treasure Hoard shows value and weight, Olimar's notes and the ship's sales pitch.
  - Items are "given ridiculous names and descriptions by the clueless Captain Olimar."
- Pikmin 4: "Treasures are the main type of collectible item". The Treasure Catalog lets you "read notes from Schnauz, Olimar, and Louie."
- Secondary (Pikipedia "Corpulent Nut"): its English note is ten words long, and the Japanese original is longer.

## 4. Friendslop: sales and design

### PEAK (Aggro Crab and Landfall)

- Inverse (fetched: https://www.inverse.com/gaming/peak-steam-landcrab-friendslop-update-interview-nick-kaman-pc, Robin Bea, 27 Jun 2025). Quotes from Nick Kaman:
  - "But we wear the term as a badge of honor."
  - "I think _Peak_ proves that the 'friendslop' genre actually has a lot of room for innovation."
- Inverse's own figures: 2 million copies in nine days, and "made for under $200,000" (citing Game Developer).
- Secondary:
  - Jam origin: 3 Aggro Crab and 4 Landfall developers spent a month in Seoul in early 2025, and the game shipped about four months after inception, in June 2025.
  - Kaman: "My prescription is: don't spend three years" (PC Gamer, via Game File).
  - Kaman on the design: the main tension is "just a terrain to climb up, and the uniquely damageable stamina bar".
  - GamesRadar headline: 11 million copies on Steam. That page fetched truncated (**failed**).

### Lethal Company (fetched)

- URL: https://en.wikipedia.org/wiki/Lethal_Company
- Early Access launch: 23 Oct 2023, by solo developer Zeekerss.
- Players "can communicate with each other through the in-game proximity chat".
- About "100,000 concurrent players in November 2023."
- Sales: Push To Talk's estimate is "more than 10 million copies as of January 2024." This is a third-party estimate; Zeekerss has not disclosed sales.

### R.E.P.O. (fetched)

- URL: https://www.gamepressure.com/newsroom/lets-just-fail-quickly-how-a-game-meant-to-flop-became-a-steam-hi/z07dad (Olga Racinowska, 24 Apr 2025).
- Walter Tischkewitz (semiwork): "We did it anyway. Let's just fail quickly this time."
- Concept history: horror cleaning game, then moving company, then tax collecting, then multiplayer.
- The article dates the Early Access launch to "February 2024". That is wrong: Steam shows 26 Feb 2025.
- Price $9.99. About 27k players in the first days, and about 100k daily peak two months later.
- No unit sales are given.
- Secondary:
  - Early Access launch on 26 Feb 2025.
  - All-time peak of about 270k concurrent on 23 Mar 2025 (SteamCharts, via search).
  - Unit estimates are third-party only.

## Tally

- Pages fetched successfully: 33, counting the world-model pages since removed from this file.
- Failed (403, truncated, or no relevant content): 7. These were GameSkinny (Outer Wilds), Axios (Outer Wilds), PC Gamer (Valheim roadmap), GamesRadar (PEAK 11M), GamesRadar (strand games), and two ACNH flower guide pages.
- Primary source not found (covered by secondary only):
  - Space Dust Racing raycast tips
  - Rocket League talk content
  - Nijman talk video
  - Swink book text
  - ACNH datamine
  - Sky talk contents
  - Smith/Worch slides PDF
