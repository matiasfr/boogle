# Research: incremental progression, game feel and vehicles, social exploration

*Research report, 29 October 2026. What designers of incremental/idle games, vehicle and traversal games and small social or co-op exploration games have said about their own work, plus numbers read from shipped code (Cookie Clicker, Universal Paperclips, cannon-es). Builds on [_primary-source-notes.md](_primary-source-notes.md), fetched the same day. This round fetched 22 new sources and pulled 69 claims from them. The 25 strongest went through a three-vote adversarial check, where two refutations kill a claim: 23 survived and 2 were refuted (listed at the end). The proposals built on this report are in [docs/proposals/](../proposals/README.md).*

*Related reports on `main` from the same day cover nearby ground with other sources: [communal-progression.md](communal-progression.md) (landmark restoration, catch-up growth, the honk chord, New Leaf, Viva Piñata, Townscaper) and [ambitious-mechanics.md](ambitious-mechanics.md) (the storm tide, From Dust, Timberborn, the two-pusher crate). This report doesn't repeat them; the proposals combine all three.*

**How to read the tags**

- **verified**: fetched this round and confirmed 3-0 by the adversarial check.
- **fetched**: the page was loaded (this round, or in the primary-source notes) but its claim was not put through the three-vote check. Quotes are near-verbatim: WebFetch passes pages through a summarizer, so check the wording against the URL before you print it.
- **secondary**: comes from a fan wiki, press relaying an interview, or a search snippet.
- *For Boogle* lines are interpretation, not sourced claims.

---

## 1. Incremental and idle games

### 1.1 The seesaw: exponential costs, linear production (verified)

Anthony Pecorella (Kongregate), "The Math of Idle Games, Part I". The Kongregate URL now returns 404, so cite the [Game Developer mirror](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i).

- "At the most basic level, idle games are a seesaw between production rates and costs. ... This is typically accomplished by having costs grow exponentially while production grows at a linear or polynomial rate."
- Formulas: `cost_next = cost_base × rate_growth^owned` and `production_total = (production_base × owned) × multipliers`. His example is AdVenture Capitalist's Lemonade Stand: base cost about 4, 1.67/s, growth rate 1.07.
- Milestone multipliers (fetched): "when you own 25 and 50 Lemonade Stands, the rate gets a (stacking) x2 multiplier ... the multipliers bump you back up whenever it gets close". Purchases spike right around the 25 and 50 milestones.
- Prestige (fetched): "A reset of most elements of the game ... each prestige allows the player to get farther through the cost curve before falling behind."
- "As you progress through the game, different generators take priority and have the biggest impact on income." (fetched)

### 1.2 Cookie Clicker in code (verified, plus secondary)

- Orteil's live [`main.js`](https://orteil.dashnet.org/cookieclicker/main.js) has `Game.priceIncrease=1.15` and `price = basePrice*Math.pow(1.15, amount-free)`, then `Math.ceil` and discounts. [Wikipedia](https://en.wikipedia.org/wiki/Cookie_Clicker): "each asset costing 15% more than the last-purchased asset of the same type." (verified)
- Prestige (secondary: Wikipedia and the [fan wiki](https://cookieclicker.wiki.gg/wiki/Prestige)): "+1% per level" of permanent production. All-time cookies for level *n* grow with *n*³ (10¹² · *n*³).
- Golden cookies (secondary): "small cookies that appear in random locations and fade away after several seconds". They are an active-play reward laid over passive production.
- Orteil "described his works as 'non-games'" (secondary, Wikipedia). Critics call the progression an "illusion of progress, without any substantial advancement" (Destructoid, via Wikipedia). Ian Bogost called the game "the logical conclusion of Cow Clicker".

*For Boogle:* use 1.07 to 1.15 as tuning anchors. The lockstep sim bans `Math.pow` and `**`, so precompute an integer cost table, or step it with integer maths (`c = Math.floor((c * 115 + 99) / 100)`).

### 1.3 Frank Lantz, Universal Paperclips (verified and fetched)

[GamesBeat, October 2017](https://gamesbeat.com/this-clicker-game-lets-you-take-over-the-world-with-paper-clips/), quoting Lantz by email:

- (verified) "I love the way [incremental games] make abstract mathematical relationships feel palpable, concrete ... The human brain isn't really designed to intuitively understand things like exponential growth ... to hold them in your hands and feel the weight of them."
- (fetched) "I didn't think of these plot points as twists, I just thought about it as a story ... What would a great storyteller do?"
- (fetched) The theme is "what it's like to be a disembodied intelligence that is ruthlessly pursuing an arbitrary goal", which he thought "would be a perfect theme for a clicker game".
- (fetched) He describes it as a game "with lots of complex overlapping systems, only smaller and more focused."
- **Refuted (1-2):** the claim that Lantz fixed the story arc *before* the systems. He did say "Once I had a basic idea for the overall arc of the game it was just a matter of getting from A to B to C". Two of three verifiers judged that this doesn't show the arc came first. Don't cite it as a design order.

[Aaron Reed, *50 Years of Text Games*](https://if50.substack.com/p/2017-universal-paperclips) (secondary, a historian):

- (verified) "the biggest limiter to growth is the amount of computational resources you have access to, limited by human trust." The [game code](https://www.decisionproblem.com/paperclips/main.js) confirms it: `if (trust<=processors+memory ...)` blocks buying more compute. [`projects.js`](https://www.decisionproblem.com/paperclips/projects.js) lists creativity-funded projects that give +1 Trust each. This holds for phase 1 only; later phases reset trust.
- (verified) The 2013 browser incrementals worked by "Introducing new currencies, systems, or rules at key milestones" so players always had something new to strategize about.
- (fetched) The story is "an implicit story, told in numbers and tiny arcing pixels". Lantz: "there's no external reason you would want to make this number go up... except that it's fun to make this number go up."

*For Boogle:* gate tiers with a social quantity, the way Paperclips gates with trust, not with a resource count. "How many different people have helped" fits principle 4.

### 1.4 Candy Box: surprise, and features that do nothing (verified)

aniwey, in an IM interview with [PC Gamer, May 2013](https://www.pcgamer.com/candy-box-1/) (secondary outlet, primary quotes):

- "I think it's just like a RPG, but the features come to the player in a different way."
- "It's because it's surprising ... this surprise aspect is what I'm trying to achieve in this game!"
- Throwing candies on the floor: "Nah, it doesn't do anything. (one of the two useless features of the game !)"
- (fetched) The opening: "It starts with a candy counter that increases every second... Once you have ten you gain the option to throw them on the floor... Shortly a trader shows up and offers you a sword in exchange for candies."

### 1.5 A Dark Room: phases first, the world zooms out (verified)

Michael Townsend in [VidaExtra](https://www.vidaextra.com/entrevistas/la-unica-forma-de-luchar-contra-los-clones-es-crear-algo-mejor-entrevistamos-a-los-creadores-de-a-dark-room) (Spanish; quotes translated) and in his own section of the [iOS design-process draft](https://s3.us-east-2.amazonaws.com/amirrajan-public/design-process.pdf) (an unpolished commentary script):

- He decided to make the game "five minutes after playing Candy Box": "I loved how Aniwey kept the player wondering what would come next."
- "I knew which phases I wanted to include but not the narrative that would go with them ... As it went along, everything fell into place."
- His original plan had two more phases: a tactical war game, and space exploration "jumping from world to world looking for the remains of the fleet" (fetched).
- The "Chinese Box" structure: "As the player opens up new mechanics, the scope of the game 'zooms out' to reveal more and more of the world. The slow pacing is extremely important here, as it allows the player time to build up their own model of the world in their minds between reveals. Each reveal is intended to shake the player's preconceived notions".
- Idle without stalling: "one of the fundamentals of idle games is the ability to leave them alone and still progress. I wanted there to always be something new on the screen when the player tabbed back." In an early draft the fire went out while you were away and the game "would grind to a halt". In the final game, "Builder will take over from there. A distracted player will return to find the forest unlocked, and a bunch of narrative in their feed."
- Pulling players off the optimal path: "New resource types and buildings appear just as you're reaching the required resources for the next hut ... I wanted ADR to be entirely playable as an idle game, with only the barest of interaction, but also to reward the more active players with quicker progress."
- (fetched) "The Dusty Path turned the whole game on its head; changing from a numbers game into an exploration game." It was meant to echo Candy Box's wooden sword. Playtests showed players didn't understand that enemies get stronger with distance, so "warnings were added when the player explored beyond their means".
- (fetched) Amir Rajan on the iOS port: what finally held playtesters through the slow start was "a 15 second reveal, and when you gathered wood, a message fades in... 'hope she's okay, have to keep the fire going'." Cutting the opening to 5 seconds lost the Builder's importance.

### 1.6 Pitfalls: timer gates and pay-to-skip (verified, plus fetched)

From the [Game Developer report](https://www.gamedeveloper.com/game-platforms/gdc-online-ian-bogost-s-troubling-experiences-with-i-cow-clicker-i-) of Ian Bogost's GDC Online talk (secondary), with [Wikipedia](https://en.wikipedia.org/wiki/Cow_Clicker) and [NECSUS](https://necsus-ejms.org/cows-clicks-ciphers-and-satire/):

- (verified) "Cow Clicker was born as a simple game where you get a cow you can click on once every six hours." Friends' clicks counted toward yours, and "Mooney" bought your way past the wait.
- (fetched) "There's something strange about social games in that you don't have to play them... you can buy out ... so that you don't have to bother to play the game that you're choosing to play."
- (fetched) At its peak the satire had "50,000 cow clickers", and Bogost said: "I worry about Cow Clicker players".
- (fetched) On listening to players: "it felt like I had been listening to them too much and not pushing them hard enough".
- **Refuted (1-2):** that Bogost named "manufactured dread" as *the main* retention mechanism. The article does quote him saying "Most of this is accomplished through manufacturing dread". Verifiers judged that the claim overstated it. Quote the line in context, not as his thesis.

### 1.7 Hades: no wasted time, a game that notices (verified, plus fetched)

[Game Developer](https://gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death), relaying a Rock Paper Shotgun interview with Greg Kasavin (secondary relay):

- (verified) "It was an explicit goal of our early development, to take the pain out of dying and having to restart ... You have to be compelled to explore further and feel the time you spent wasn't a waste of your time."
- (fetched) "Reactivity has always been a goal of our narrative design, to have those moments where you feel the game is paying attention." Events trigger on run state, for example "while Zagreus' health is below a certain threshold", and "the development team can weight certain events".
- (fetched) "Those moments in games are so good, so we try to create as many as possible in the hope players can experience them."

---

## 2. Persistent, communal progression

### 2.1 Stardew Valley's Community Center (verified)

ConcernedApe, [dev update 19](https://stardewvalley.net/dev-update-19/) (August 2014, before release):

- "The main story-line in Stardew Valley centers around an old, overgrown community center ... My aim is to create an overarching narrative/goal that will give players a stronger sense of purpose".
- "Each bundle consists of a selection of items and corresponds to a unique aspect of the game. ... They are designed not to be 'grindy', but rather to encourage players to explore the various facets of Stardew Valley."
- On completing an area: "that area will be restored and a permanent, positive change will happen in the valley."
- (fetched) It stays optional: "there's still tons of goals and things to do that don't involve the community center."
- (fetched) A 2014 idea that changed before release: if the center wasn't restored within 2 years, "Joja Co. demolishes it". He said "ultimately I will base any final decisions on whatever is the most fun."

### 2.2 Already in the notes (fetched or secondary; see [_primary-source-notes.md](_primary-source-notes.md))

- **Animal Crossing: New Horizons** flower breeding (secondary, datamine via guides): a 5% base chance, rising with the number of *different* visitors who water, from 20% for 1 up to 75% for 5+. This is the precedent for DESIGN.md principle 4.
- **Death Stranding** (fetched, Kojima): "Giving 'likes' is giving unconditional love." "if [your objects] have few likes, they might disappear." "you can't see other people's faces, but you can see the tracks and traces."
- **Kind Words** (fetched, Ziba Scott): no likes or counts in the original, "so you're just free to talk to people". Most of his development time goes on moderation. In Kind Words 2, "You can only exchange three couplets".
- **Old World** (fetched, Soren Johnson): "there is no longer a golden path through the tech tree". Each turn you draw four tech cards and keep one, and skipped techs return only when the deck cycles.
- **Pikmin** (fetched, fan wiki): 201 treasures in Pikmin 2, "given ridiculous names and descriptions by the clueless Captain Olimar".
- **Deep Rock Galactic** (fetched, Pedersen): "you can just jump in, play with strangers, and have a great experience." On the unmonetized pass: "we're doing it for fun."
- **Valheim** (fetched): 10 million copies in just over a year. No primary source on its progression design was found.

---

## 3. Game feel and vehicles

### 3.1 Definitions and juice (fetched, from the notes)

- Swink, via [Liz England's review](https://lizengland.com/blog/review-game-feel-by-steve-swink/): "a Venn diagram of real-time response, simulated space, and polish". The real-time loop runs "under 100 milliseconds".
- Jonasson & Purho, "Juice It or Lose It" (GDC Europe 2012), and Nijman, "The Art of Screenshake" (2013): many small tweaks layered onto a plain game. See the notes for details.

### 3.2 Lonely Mountains: Downhill: fake the stability (verified)

Daniel Helbig and Jan Bubenik (Megagon) in an [80.lv interview](https://80.lv/articles/level-game-production-lonely-mountains-downhill) (March 2020):

- "Bike physics is surprisingly hard!" They started with "a bike with two-wheel colliders - which was tipping over all the time".
- "Simulating inertia, drag, gravity, the friction of the ground, etc. lead to a solid and stable, however, not really believable movement". So they "faked the lateral balancing of the bike and the suspension of the wheels", using raycasts and helper rigid bodies for collision. The goal was handling that is not necessarily physically correct but feels real.
- (fetched) "good controls are key", with the complexity kept off the input side.
- The scenic route: "We always design one main route for each trail - the scenic route. It leads the player through all checkpoints and along with all the important landmarks and vantage points".
- Shortcuts come in three tiers. Official ones are "clearly visible (often indicated through small muddy paths)". Semi-official ones are hidden but "deliberately designed by us". Unofficial ones were "not actually intended": "We didn't even know a lot of them before release."
- (fetched) The camera aims at "an imaginary future position of the rider". Placed triggers adjust it to foreshadow later sections, hint at missed shortcuts or hide shortcuts. They called the camera "the biggest challenge level design-wise".

### 3.3 Mario Kart Wii: an integer drift-charge (verified; secondary source)

From the [MKW TAS wiki](https://wiki.mkwtas.com/wiki/Miniturbo), which is community reverse engineering of a fixed 2008 game. These numbers hold for MKWii only.

- Charge is an integer. It goes up "by 5 each frame" when the stick is held hard into the drift (+3 to +7 of 7) and by 2 a frame otherwise.
- The boost "can be released from the frame after the charge is strictly greater than 270". That takes 55 to 136 frames at about 60 fps, or roughly 0.9 to 2.3 s.
- Release adds "20% to maximum IV", the speed cap, for 15 to 48 frames depending on the miniturbo stat. The kart-only super miniturbo charges past 300 and lasts three times as long.
- (fetched) The telegraph: blue sparks mean a boost is ready and orange a super. "Small blue and orange sparks appear when the charge values reach 150 and 180, respectively, but they are purely cosmetic."
- (fetched) "Miniturbos can only be performed on manual transmission; they are disabled for automatic drift."

### 3.4 Tears of the Kingdom: systems that make fun happen (fetched)

[Digital Trends' report](https://digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics) on Nintendo's GDC 2024 session (secondary; not put through the three-vote check):

- Takuhiro Dohta: "Rather than create something fun, create a system that makes fun things happen."
- "Everything, without exception, being physics-driven is necessary to make multiplicative gameplay a reality." Objects that weren't physics-driven clashed with Ultrahand and "caused daily problems".
- "A wheel is no longer a wheel. It's a wheel, connected to a motor, with its own shaft and suspension."
- Mass and inertia are "calculated automatically based on their material, size, and shape". Readability still won over physics: a wooden board "needed to be much larger in order for players to see it, which meant it was much heavier."
- Takahiro Takayama expected that "Development is going to be chaos." The Portable Pot "used a joint at the base of the pot to rotate it once you set the object down, ensuring it was always flat". Players then reused that joint to build vehicles the team never planned.

### 3.5 Arcade raycast-vehicle heuristics (fetched; practitioner blog)

From [Vehicle System documentation, "Arcade physics"](https://sites.google.com/view/vehicle-system-documentation/general/arcade-physics):

- "A center of mass just slightly above wheel height provides a stable but responsive feel." A center of mass below the wheels reduces flipping, but the vehicle can lean the wrong way in turns.
- Drifting: "reduce lateral friction in the wheel config to allow more sliding during turns".
- Lower mass feels nimbler, but "Going too low will effect traction and make your vehicle slide".
- A speed-to-steering curve sets how much steering is available at speed.

### 3.6 cannon-es RaycastVehicle: what the numbers mean (fetched source code)

Read from [`RaycastVehicle.ts`](https://raw.githubusercontent.com/pmndrs/cannon-es/master/src/objects/RaycastVehicle.ts) and the [raycast vehicle example](https://raw.githubusercontent.com/pmndrs/cannon-es/master/examples/raycast_vehicle.html) on `master`. Boogle pins 0.20.0, so check that version before relying on details. The `WheelInfo` defaults are in the notes.

- The spring is scaled by chassis mass: `force = suspensionStiffness * length_diff * clippedInvContactDotSuspension`, then `force -= susp_damping * projected_rel_vel`, then `suspensionForce = force * chassisMass`, clamped at 0. So stiffness and damping act as accelerations per metre and per m/s, and changing the chassis mass doesn't change how far the car sags.
- `dampingCompression` applies while the spring is compressing and `dampingRelaxation` while it extends.
- `maxSuspensionForce` clamps the force when it is turned into an impulse in `updateVehicle`.
- Grip: `maximp = suspensionForce * timeStep * frictionSlip`. So `frictionSlip` works like a tyre friction coefficient, and a wheel that carries less load grips less.
- `rollInfluence` scales the height at which side forces act. Near 0 means hard to roll.
- The example car: chassis mass 150, box half-extents (2, 0.5, 1), wheel radius 0.5, `suspensionStiffness` 30, `suspensionRestLength` 0.3, `frictionSlip` 1.4, `dampingRelaxation` 2.3, `dampingCompression` 4.4, `maxSuspensionForce` 100000, `rollInfluence` 0.01, `maxSuspensionTravel` 0.3, `customSlidingRotationalSpeed` -30 (enabled), engine force 1000, brake 1000000, steering 0.5.

*For Boogle* (derived, not sourced): `GRAVITY` is 18 (`src/constants.ts`). With four wheels the static sag is g / (4k): at k = 30 that is 0.15 m, half of a 0.3 m rest length. See [vehicles.md](../proposals/vehicles.md) for starting values.

### 3.7 Not verified this round

- **Rocket League:** only the [GDC listing](https://www.gdcvault.com/play/1024972/) (in the notes). A third-party summary says Psyonix added Bullet for gameplay physics alongside Unreal's. No tuning numbers were found.
- **Very Very Valet, Snowrunner, Wobbly Life, Jusant, Trackmania:** nothing verified.
- **Sable** (fetched, [MCV/DEVELOP, 17 Feb 2022](https://mcvuk.com/business-news/when-we-made-how-shedworks-went-from-a-north-london-shed-to-the-stunning-dunes-of-sable/), Gregorios Kythreotis):
  - "we got a hoverbike from the asset store for like, €5 or something."
  - "the core idea of seeing something in the distance and journeying out to it".
  - "You can finish the game now, or you could not."

---

## 4. Exploration in small social games

### 4.1 Journey: no lobby, no names, the other player is the point (fetched)

- [PlayStation Blog, 11 Jan 2011](https://blog.playstation.com/2011/01/11/jenova-chen-explains-journey-social-relevance-and-artistic-inspirations/), Jenova Chen:
  - Without a lobby, "other players have to be able to connect at any time, not just the beginning of the game", and "a player has to be able to finish the game by himself [if] he can't find someone."
  - "I don't think your grandma is going to know what a [multiplayer] 'lobby' means."
  - "We wanted something very primal, which forced us to make innovations."
- [MCV/DEVELOP, 8 Feb 2013](https://mcvuk.com/development-news/jenova-chen-reveals-secrets-of-journey-design/), Chen at DICE:
  - "The more I played this game, the more I encountered other players, the more I realized I was lonely".
  - "I want the interaction to be about exchange of emotions or feelings, rather than exchange of blows".
  - "If I'm in a room online with another player, and I have a gun, what am I going to do?"
  - "All of a sudden, the other player becomes the focus".
  - "Our first goal is there is no lobby".
  - "most peoples names are very aggressive."

### 4.2 Already in the notes (fetched unless marked)

- **Breath of the Wild** (CEDEC 2017, translated summary): the triangle rule (large landmarks, medium view-blockers, small pacing shapes), "gravity" between points of interest, and heatmaps that went from a few paths to "more well distributed". Towers sit hidden behind chains of structures.
- **A Short Hike**:
  - "I tried to create interesting landmarks that would pique people's curiosity."
  - "In some cases, I'd just use collectables to draw players towards new areas of the map."
  - "I tried to design the game as a tiny open world."
  - "I only gave myself four months".
- **Outer Wilds** (Beachum): "We wanted to make sure that players are exploring because they're curious about the world, and not for any other reason." "learning new things is the only feedback the player gets" (Wikipedia).
- **Tunic** (Shouldice):
  - "A key part of feeling like a world isn't made for you is feeling like it was made for someone else."
  - "A full-screen tutorial popup feels deeply invasive and can ruin any sense of wonder".
  - "getting to study a mysterious page feels like mystery-solving."
- **Smith & Worch**, "What Happened Here?" (GDC 2010): the environment as clues to interpret rather than exposition.
- **Sky** (GDC listings only): "The definition of 'social' gameplay can be elusive and counterintuitive." Chen's 2024 talk covered consent-based communication (secondary). No primary source on candles or winged light was found.
- **Friendslop**: PEAK's main tension is "just a terrain to climb up, and the uniquely damageable stamina bar" (secondary), and Kaman: "don't spend three years". Lethal Company uses proximity chat. R.E.P.O.: "Let's just fail quickly this time."

---

## 5. What the evidence supports, in one place

These come from the findings above. Mapping them onto Boogle is interpretation.

1. **Reveal, don't list.** Candy Box, A Dark Room and Paperclips hide what comes next and land new systems at milestones. Some of the reveals can be jokes that do nothing.
2. **Design the phases, then let the lore fall into place** (A Dark Room). Each phase zooms the world out.
3. **Never stall on an absent player.** There should always be something new when someone comes back (A Dark Room), and time spent should never feel wasted (Hades).
4. **Make the growth physical** (Lantz: "hold them in your hands"). Growth should be things on the island, not a number in the HUD.
5. **Gate with a social quantity** (Paperclips' trust; ACNH's different-visitor watering), not a pile of one resource.
6. **One communal project that touches every system** (Stardew bundles), finishing in a permanent change to the world, and optional.
7. **Avoid timers as gates, obligation and pay-to-skip** (Cow Clicker).
8. **Fake the stability, keep the input simple** for vehicles (Lonely Mountains). Telegraph the boost. Make the charge an integer and the reward short (MKWii).
9. **Build systems that combine** (TotK), but readability beats physical truth (the enlarged board).
10. **Lay out a scenic route plus three tiers of shortcuts** (Lonely Mountains), with landmarks you see from afar (A Short Hike, Sable, BotW's triangles).
11. **No lobby, no names in the way** (Journey). Anyone can join at any time and anyone can finish alone.
12. **Make the world feel made for someone else** (Tunic). Knowledge can be the unlock (Outer Wilds).

## 6. Gaps and open questions

- No verified designer claims on Melvor Idle, Egg Inc, Kittens Game, Antimatter Dimensions, NGU or Spaceplan.
- Offline-progress caps (how much should accrue during a long absence) have no primary source here.
- Knowledge-gated discovery (Outer Wilds, Tunic) is single-player. No designer testimony was found on how it survives co-op, where one player's discovery spoils it for the rest.
- There are no shipped tuning numbers for Rocket League, Very Very Valet or similar games. The cannon-es numbers are the example's, not tuned for feel.

## 7. Refuted claims (do not cite)

| Claim | Vote | Source |
| --- | --- | --- |
| Lantz fixed Universal Paperclips' narrative arc before its systems. | 1-2 | GamesBeat 2017 |
| Bogost names manufactured dread as the main retention mechanism of social and idle games. | 1-2 | Game Developer, GDC Online report |

## 8. Sources fetched this round

| URL | Kind | Used for |
| --- | --- | --- |
| https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i | primary (Pecorella) | 1.1 |
| https://orteil.dashnet.org/cookieclicker/main.js | code | 1.2 |
| https://en.wikipedia.org/wiki/Cookie_Clicker | secondary | 1.2 |
| https://cookieclicker.wiki.gg/wiki/Prestige | fan wiki | 1.2 |
| https://gamesbeat.com/this-clicker-game-lets-you-take-over-the-world-with-paper-clips/ | primary (Lantz) | 1.3 |
| https://if50.substack.com/p/2017-universal-paperclips | secondary (historian) | 1.3 |
| https://www.decisionproblem.com/paperclips/main.js, `projects.js` | code | 1.3 |
| https://www.pcgamer.com/candy-box-1/ | primary quotes (aniwey) | 1.4 |
| https://www.vidaextra.com/entrevistas/la-unica-forma-de-luchar-contra-los-clones-es-crear-algo-mejor-entrevistamos-a-los-creadores-de-a-dark-room | primary (Townsend, Spanish) | 1.5 |
| https://press.doublespeakgames.com/adr | primary (press kit) | 1.5 |
| https://s3.us-east-2.amazonaws.com/amirrajan-public/design-process.pdf | primary (draft) | 1.5 |
| https://www.gamedeveloper.com/game-platforms/gdc-online-ian-bogost-s-troubling-experiences-with-i-cow-clicker-i- | secondary | 1.6 |
| https://en.wikipedia.org/wiki/Cow_Clicker | secondary | 1.6 |
| https://necsus-ejms.org/cows-clicks-ciphers-and-satire/ | academic | 1.6 |
| https://gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death | secondary | 1.7 |
| https://stardewvalley.net/dev-update-19/ | primary (ConcernedApe) | 2.1 |
| https://80.lv/articles/level-game-production-lonely-mountains-downhill | primary (Megagon) | 3.2 |
| https://wiki.mkwtas.com/wiki/Miniturbo | community reverse engineering | 3.3 |
| https://digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics | secondary (GDC report) | 3.4 |
| https://sites.google.com/view/vehicle-system-documentation/general/arcade-physics | practitioner blog | 3.5 |
| https://raw.githubusercontent.com/pmndrs/cannon-es/master/src/objects/RaycastVehicle.ts | code | 3.6 |
| https://raw.githubusercontent.com/pmndrs/cannon-es/master/examples/raycast_vehicle.html | code | 3.6 |
| https://mcvuk.com/business-news/when-we-made-how-shedworks-went-from-a-north-london-shed-to-the-stunning-dunes-of-sable/ | primary (Kythreotis) | 3.7 |
| https://blog.playstation.com/2011/01/11/jenova-chen-explains-journey-social-relevance-and-artistic-inspirations/ | primary (Chen) | 4.1 |
| https://mcvuk.com/development-news/jenova-chen-reveals-secrets-of-journey-design/ | primary quotes (Chen at DICE) | 4.1 |

Sources that came back unreliable or empty this round: InformIT, igf.com/spaceplan, a CMU ETC PDF, the Irrlicht and gamedev.net forums, co-optimus, GameSpot (Grounded), Tom's Guide (Hades).
