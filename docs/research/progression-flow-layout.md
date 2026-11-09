# Progression flow through space: layout that follows the order of play

> **Verdict:** Three flow rules are near-universal (the next goal can be found, a gate keeps its meaning, nobody is stranded); the rest are lenses that good games break on purpose.
> **Top recommendations:** 1. Hold plans to the three near-universal rules only, and use the five others as lenses with their named exceptions; the designer agent's flow checklist is stricter than the evidence. 2. Keep the railway as Home's progression spine: the track head is the next goal, each finished line points at the next one, and each one shortens a trip players already know. 3. Check the two beat ends where the next goal is 500–600 m behind you (Far Head after Q5, the pier after Q6), and give the forge a call that reaches them if a still shows it doesn't already.
> **Status:** reference.

*Research report, 9 November 2026. The owner, 9 November: "I also care about layout that makes sense for the flow of the game." This report asks how shipped games lay out a world so the layout follows the order it's played in. It covers ability and key gates (Metroid, Hollow Knight, Zelda, Outer Wilds), the critical path against optional space (Mario Odyssey, A Short Hike), loops and shortcuts (Dark Souls, Resident Evil), signposting without UI (Half-Life 2, Journey), construction as the spine (Death Stranding, Factorio, Mini Metro, Animal Crossing) and co-op flow (It Takes Two, Journey, Deep Rock Galactic, Valheim), plus the methods designers use to check flow. It builds on [level-design.md](level-design.md) (walk-seconds, gravity, weenies, sightline reveals), [route-contract.md](route-contract.md) (travel and work edges), [ability-upgrades.md](ability-upgrades.md) (return trips, co-op fairness), [wordless-onboarding.md](wordless-onboarding.md) (lures, late joiners) and [discovery-progression.md](discovery-progression.md) (knowledge as a key), without repeating them. Research only: no game code or decision changes.*

**Markers.**
- **[V]**: the page was fetched and the words match.
- **[S]**: seen only in a search summary, a recap, a mirror or a wiki; check before quoting.
- **[G]**: how a shipped game behaves, from play or guides, not checked against its developers.

Boogle facts come from the map data in [map-prototypes.html](../world/map-prototypes.html) (read by [src/sickle/map-data.ts](../../src/sickle/map-data.ts)), the as-built [place.md](../game-design/place.md) and the plans linked inline. Distances are straight lines between map points in Place-local metres, timed at the 5.6 m/s walk, unless marked "along the line".

## 1. Ability- and key-gated layout

### Zelda: the item chain, and what it costs

- **The chain [V].** A Link Between Worlds' director Hiromasa Shikata describes the series' formula: "In Zelda games, you go into a dungeon, get a new item, and use that item to find the next new dungeon." He names its cost: "It's not a few people that get stuck somewhere". ALBW let players rent items so its last seven dungeons open in any order. Iwata: "even if you get stuck, you can rent an item and go to conquer a different dungeon" ([Iwata Asks, ALBW part 6](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-A-Link-Between-Worlds/The-Legend-of-Zelda-A-Link-Between-Worlds/6-Rethinking-the-Unquestioned-/6-Rethinking-the-Unquestioned--832156.html)). It reused A Link to the Past's overworld and redesigned the dungeons **[S]**.
- **A dungeon you rewire [V].** In Ocarina's Water Temple you raise and lower the water to reach new rooms. Iwata called it "a bone caught in your throat for 13 years". Aonuma: "The worst thing was thinking about how many people may have given up there." The 3DS fix was mostly friction: boots that come off "in a flash" and the map on the second screen ([Iwata Asks, OoT 3D](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-4-Development-Staff/3-I-ve-Got-to-Fix-the-Water-Temple-/3-I-ve-Got-to-Fix-the-Water-Temple--235888.html)). One global switch that changes every room is the hardest layout to hold in your head.
- **A Link to the Past [G].** The Dark World is the Light World's map, transformed. Every route is learned once and remembered twice, and the mirror is the shortcut back.
- **Breath of the Wild's Great Plateau.**
  - It was built first, as a test of the whole concept. Fujibayashi: "The Great Plateau ended up being a culmination of what we wanted to include in the game" (IGN, via [Nintendo Everything](https://nintendoeverything.com/zelda-breath-of-the-wild-devs-on-starting-out-with-10-people-showing-miyamoto-the-2d-prototype-great-plateau-made-first-more/)) **[V, reprint]**.
  - Cliffs fence it until the paraglider is earned, and the paraglider opens the whole map **[G]**. The teaching pattern is in [movement-abilities.md](movement-abilities.md#5-teach-on-a-little-great-plateau).
- **Tears of the Kingdom's layers.** The sky islands are in [level-design.md](level-design.md#1-breath-of-the-wild-and-tears-of-the-kingdom). New here: the Depths mirror the surface's terrain, so high places above are low places below (Famitsu, via [Zelda Dungeon](https://www.zeldadungeon.net/the-legend-of-zelda-tears-of-the-kingdom-developers-say-the-depths-were-made-in-a-surprisingly-short-period-of-time/)) **[V, a translated paraphrase]**. The map you know becomes a guide to the one you don't.

### Metroid

- **Already covered.** [route-contract.md](route-contract.md#2-what-the-primary-sources-contribute) covers Dread's encouraged sequence breaks. [ability-upgrades.md](ability-upgrades.md#metroid-quantitative-growth-can-eventually-change-the-movement-rule) covers Super Metroid's upgrade kinds.
- **Locks near keys [S].** Mark Brown's "Why You Didn't Get Lost in Metroid Dread" ([transcript](https://amara.org/subtitles/Aci4iDbgsAtY/en/1/download/Why%20You%20Didnt%20Get%20Lost%20in%20Metroid%20Dread.en.txt), refused the fetch; via search excerpts) makes three points:
  - Dread cuts how many locks each key opens and puts the important lock near its key.
  - It gives a teleporter when the lock is far.
  - One-way passages stop you going too far the wrong way.
- **Breaks and softlocks [V].** Former principal designer Jacobo Luengo says some sequence breaks were intended, while "others arise as a result of the effort of thousands of players". On softlocks: "all you can do is try to minimize it as much as possible by covering all the cases you can think of" ([Shinesparkers](https://shinesparkers.net/interviews/jacobo-luengo/)).

### Hollow Knight

- **Already covered.** Team Cherry ordered the abilities with the map and later relaxed hard gates ([ability-upgrades.md](ability-upgrades.md#hollow-knight-the-ability-order-and-the-map-must-be-designed-together)).
- **The world came first [V].** Ari Gibson: "all of it's built around this sense of discovery". William Pellen calls the process "mainly intuition" ([Game Developer, 2017](https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-)).
- **Lost by design [G].** You can buy an area's map only after finding the cartographer inside it, so each area starts with getting a little lost. Stag stations are bought shortcuts home.

### Outer Wilds: knowledge gates, deliberate wandering

- **Already covered.** Knowledge as the key is in [discovery-progression.md](discovery-progression.md#1-how-games-make-discovery-the-progression).
- **Choosing to wander [V].** In a 2016 interview on Mobius Digital's own blog, Alex Beachum says: "We want to remove aimless wandering from the design". The team gives "enough information that you make conscious choices": "So we decided to telegraph where paths lead", while "trying to avoid explicit signs as much as possible" ([Mobius Digital](https://www.mobiusdigitalgames.com/blog/the-intentionality-of-wandering)).
- **Lesson:** the most open game of the set still telegraphs where its paths go. Its wandering is meant to be chosen.

### Placing the tease, the gate and the key

| Piece | What shipped games do | Examples |
| --- | --- | --- |
| Tease | The lock is passed on the way to something else, long before it opens | Out-of-reach Metroid ledges **[G]**; A Short Hike's peak ([level-design](level-design.md#4-a-short-hike-one-compact-island)); Boogle's split rock, passed from Q3 on |
| Key | The key's first use is in sight of where you get it; its second use is the lock you remembered | Zelda dungeon items **[G]**; [movement-abilities §5](movement-abilities.md#5-teach-on-a-little-great-plateau) |
| Return | Short: the lock is near the key, or a shortcut, teleporter or train opens with it | Dread **[S]**; Dark Souls (section 3) |
| Failure | One lock everyone must find, in one order, with nothing else to do meanwhile | The Water Temple; ALBW's stuck players **[V]** |

## 2. Critical path versus optional space

- **The Level Design Book [V].** It defines the critical path as "the main intended player path / procedure to complete the level and progress". Its advice:
  - "For single player levels, draw or mark the critical path", numbering the major beats.
  - Check whether the experience goals still hold if every side area is cut.
  - Critical-path-first design can feel artificial. GoldenEye drew the path after the space, quoting Martin Hollis: "Their job was simply to produce an interesting space" ([critical path](https://book.leveldesignbook.com/process/layout/criticalpath)).
  - "Golden path" is the industry's other name for the critical path, sometimes meaning the designers' preferred route rather than the shortest one **[S]**.
- **Super Mario Odyssey [V].**
  - Koizumi: "Any time you enter a stage you see a main title that gives you like the main critical path objective". Motokura says the kingdoms are "designed in such a way to entice people to look in certain areas" (Game Informer, via [Nintendo Everything](https://nintendoeverything.com/super-mario-odyssey-devs-on-captain-toad-changes-in-kingdoms-elements-for-mario-64-players-newcomer-help-more/)).
  - A [Game Developer analysis](https://www.gamedeveloper.com/design/what-mario-learned-from-mickey-mouse---part-3-decision-making-and-weenies) shows the reward split. In Tostarena the main line's weenies lead one to the next and carry the bigger rewards (outfits, the boss, a multi-moon), while off-path weenies lead to moons and coins. Its staging rule: "weenies must be visible at the correct place and time".
  - A kingdom opens on a count of moons from any source **[G]**. With many keys for one lock, the main line can't be missed.
- **A Short Hike [V].** Adam Robinson-Yu put mini-games "on the off-paths" to "break up the hiking". He had "to design around the player going the exact opposite of the obvious route", and wanted curiosity "rewarded" ([PlayStation Blog, 2021](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)).
- **Boogle's call.** The owner's [6 November constraints](../world/map-prototypes.md#the-owners-constraints-6-november) make the main line almost everything:
  - every area is visited and small stops sit on the way;
  - secrets are on the main path;
  - the order is mostly linear, with one order choice.

  So Boogle's optional space sits beside the main line. That is Odyssey's density, not a sprawl of detours.

## 3. Loops and shortcuts

- **Dark Souls.**
  - From the Design Works interview (fan translation): Miyazaki says "Firelink Shrine serves as the hub for the game", and Satake: "It was made to connect with areas in every direction". Miyazaki: "It's a small area but it connects to many different places" ([Fextralife](https://darksouls.wiki.fextralife.com/Dark+Souls+1+-+Design+Works+Interview)) **[V, translation]**.
  - Lifts and gates opened from the far side drop you back near the hub. After the Lordvessel, warping between bonfires replaces much of that **[G]**.
  - Mark Brown's "World Design of Dark Souls" ([transcript](https://amara.org/subtitles/4zZSGmv4Qxsz/en/1/download/The%20World%20Design%20of%20Dark%20Souls%20%20Boss%20Keys.en.txt), refused the fetch) argues that warping weakens the later half's interconnection **[S]**.
- **Resident Evil's mansion [V, critic].** Josh Bycer: the layout was "explicitly design[ed] to have short cuts and multiple ways to get around". A shortcut has a price: it leaves bodies that may come back as Crimson Heads ([Game Developer, 2018](https://www.gamedeveloper.com/design/multi-tiered-horror-design-with-resident-evil-remastered)). The map keeps the rooms and doors you've seen, so the loop is remembered for you **[G]**.
- **Gone Home [V].** Its critical path "frequently doubles back on itself", in a hub-and-spoke house. The designers: "It wouldn't feel like an investigation (nor a mansion) if every clue led to a new area" ([Level Design Book, circulation](https://book.leveldesignbook.com/process/layout/flow/circulation)). Doubling back through a known place is the experience.
- **Halo 3's jungle [V, mirror].** Microsoft's researchers plotted about 30 testers' positions half an hour in and found them scattered. Randy Pagulayan: "People were lost." The designers added ledges you jump down, so the way back closed and the next positions clustered where intended (Clive Thompson, Wired, August 2007, [read on a mirror](https://wirednews.pages.dev/2007/08/ff-halo-2)). A one-way drop is a flow tool when the way on continues.
- **Big Walk.** The drawbridge loop that ends beside home is in [big-walk-level-design.md](big-walk-level-design.md).

### How a world gets shorter

- **The shared shape:** the first trip is long and is how you learn the way; later trips are cut. Dark Souls does it with shortcuts and then warps **[G]**, Dread with teleporters **[S]**, Ocarina with warp songs **[G]** and Death Stranding with roads (section 5).
- **Boogle's evidence.**
  - Round 3 (2 November): "seeing a path between two areas open up which was previously tedious was satisfying". The same players called the trains "Too soon": "i would have liked just having a path to an area" ([playtests](../playtests.md#2026-11-02-round-3-two-players-protoplacecoop1fresh1)).
  - The shortening only pays if the long version was felt first.

## 4. Signposting the next goal without UI

- **The Level Design Book's wayfinding spectrum [V]** ([wayfinding](https://book.leveldesignbook.com/process/blockout/wayfinding)) runs from subtle to direct:
  - subtle: following animals and motes, sound, unusual detail;
  - coarse: composition and sightlines, lighting and colour, ground lines such as planks and tracks;
  - situational: breadcrumbs, scripted sequences, cutscenes;
  - direct: barriers and always-on UI.
- **Examples it uses [V].**
  - Half-Life 2's composition guideline: "Players don’t look upwards unless something draws their eye". Friendly characters and a flock of birds draw the eye to the Citadel.
  - Zelda's short cutscenes show the door you just unlocked. That is camera framing at the end of a beat.
- **Against signposting [V].** Too much makes a place feel like Disneyland, and "if a true sense of wilderness is desired, then the design may require a sort of anti-wayfinding". Wind Waker's Haruhana makes the same point in [level-design.md](level-design.md#3-wind-waker-the-sea-as-connective-tissue).
- **Half-Life 2: Episode Two [S].** The commentary (seen through search excerpts; the transcript site returned errors) describes the superportal: shown as a threat in the opening vista, it later becomes the landmark for the route to White Forest. Antlion grubs give light in the dark tunnels. Both are breadcrumbs the world already justifies ([Combine OverWiki](https://combineoverwiki.net/wiki/Developer_commentary/Half-Life_2:_Episode_Two)).
- **Journey [V].** The mountain on the horizon is in [wordless-onboarding.md](wordless-onboarding.md#2-lures-telegraphing-the-goal). New here, from Adventure Gamers' report of Jenova Chen's GDC 2013 talk ([page 2](https://adventuregamers.com/article/designing_journey?cp=2)):
  - The team made the mountain climb "more of an active struggle": longer, dangerous and with the light dimmed.
  - The summit then opens into a free, open area.
  - The Level Design Book notes that Journey's intensity graph measured emotional stake, not difficulty ([pacing](https://book.leveldesignbook.com/process/preproduction/pacing)) **[V]**.
- **Boogle's evidence.**
  - Players read signs as orders: the owner found the fork boards ("QUARRY, LATER") heavy-handed ([signposts](../brainstorms/signposts.md)), and both 3 November players found the blue ability shafts heavy.
  - They liked "the telescope as a peek at what you can't reach yet" ([playtests](../playtests.md#2026-11-03-round-4-two-players-the-default-url)).
  - In an earlier round a player "didn't know what to do, didn't see the path, didn't notice the survey stake" ([2 November](../playtests.md#2026-11-02-the-real-place-protoplace)).
  - The track head is Boogle's built-in leading line: the parked machine and its frame stand where the next work is.

## 5. Building or infrastructure as the progression spine

- **Death Stranding.** That roads persist and are shared is in [level-design.md](level-design.md#2-death-stranding-1-and-2).
  - Critic Jordan Pearson: "What makes the game easier and empowers players is their collective work on infrastructure that serves them all" ([Vice, 2019](https://vice.com/en/article/death-stranding-is-a-collective-power-fantasy-about-infrastructure-and-aid)) **[V]**.
  - PC Gamer reports that paved roads cut a cross-map trip from about an hour to minutes ([PC Gamer](https://pcgamer.com/death-stranding-relaxed-me-so-hard-i-became-a-road-building-madman)) **[S]**.
- **Factorio [V].**
  - "The starting area contains only iron, copper, coal and stone, in very predictable amounts", and "Uranium and oil are explicitly excluded from the starting area" ([FFF #258](https://www.factorio.com/blog/post/fff-258)).
  - The layout's job is distance: what you need next lies beyond what your current transport comfortably reaches. That reading is an inference. Wube's rail lessons are in [rail-as-play.md](rail-as-play.md).
- **Satisfactory [S].** The map is hand-made, its biomes are graded by difficulty, and caves with resource nodes were shaped to allow trains (a developer Q&A, as recapped; [wiki](https://satisfactory.wiki.gg/wiki/World)).
- **Mini Metro [V].** "you take on the task of designing the subway layout for a rapidly expanding city"; "More stations are opening, and commuters are appearing faster" ([Dinosaur Polo Club](https://dinopoloclub.itch.io/minimetro)). The map's growth sets the pace, and the player's lines are the only path.
- **Animal Crossing: New Horizons [S].**
  - At first, rivers and cliffs keep you to part of the island.
  - The vaulting pole and ladder, both personal tools, open it.
  - Bridges and inclines you place, one a day, then replace them with permanent routes of your choosing ([Inverse guide](https://www.inverse.com/gaming/animal-crossing-new-horizons-bridge-incline-guide-ramp-vaulting-pole-ladder-price-list)).
- **Townscaper and Tiny Glade.** Growth you watch, with no reach to extend ([level-design.md](level-design.md#11-townscaper-tiny-glade-growth-you-watch)).
- **Synthesis.** In these games the critical path is what the player builds. The designer places needs (ore, towns, stations, the far shore) at distances that ask for the next kind of connection. Boogle's railway already works this way: each stretch's bill is the gate, the laid track is the new route, and trains are the shortcut.

## 6. Co-op flow

- **It Takes Two [V].** Josef Fares on why triggers and cutscenes are hard with two players: "You're not in control. The other player could be on the total other side" ([The Ringer, 2021](https://www.theringer.com/2021/4/22/22396763/josef-fares-it-takes-two-interview-co-op-gaming)). A fallen player comes back beside their partner **[G]**.
- **Journey [V].** It rewards closeness instead of enforcing it.
  - When companions stand near each other, each one's flight recharges. Chen: "When you have the choice to leave, the co-op is more real and sincere" (Adventure Gamers on GDC 2013, [page 1](https://adventuregamers.com/article/designing_journey) and [page 2](https://adventuregamers.com/article/designing_journey?cp=2)).
  - Chris Bell: "only through communication can they find each other" ([Game Developer, GDC 2012](https://www.gamedeveloper.com/audio/gdc-2012-how-i-journey-i-was-designed-to-facilitate-friendship)).
- **Deep Rock Galactic.**
  - Caves come together "like pearls on a string: one room at a time, connected by narrow, winding tunnels". Each room's shape "funnel[s]" the team toward the next exit ([Ghost Ship, 2024](https://devtrackers.gg/deep-rock-galactic/p/8cd5ca9c-below-decks-at-ghost-ship-cave-generation-in-deep-rock-galactic)) **[V]**.
  - At extraction, the mule "will leave behind a glowing trail of green evacuation markers" to the drop pod ([wiki](https://deeprockgalactic.wiki.gg/wiki/M.U.L.E.)) **[S]**.
  - The late joiner's drop pod is in [wordless-onboarding.md](wordless-onboarding.md#5-joining-friends-mid-session).
- **Valheim [S].** Portals carry people but not ore or metal, so ships and carts still carry the freight ([TechRaptor guide](https://techraptor.net/gaming/guides/how-portals-work-in-valheim)). The head of Iron Gate refused to lift the restriction (paraphrased from a tweet by [Gamepressure](https://www.gamepressure.com/newsroom/valheim-devs-said-no-to-metal-teleportation/z02f3e)). It is the [route contract](route-contract.md)'s split between travel and work, in a shipped co-op game.
- **Already covered.** Fairness for late joiners and split attendance is in [ability-upgrades.md](ability-upgrades.md#co-op-fairness-and-arriving-late). Regrouping tools are in [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md).
- **What this adds is space.** Beat ends are where a group regroups, and the trains move people without doing the work.

## 7. Methods level designers use to check flow

| Method | What it catches | Source | What Boogle's tools already do | Gap |
| --- | --- | --- | --- | --- |
| Beat sheet and intensity graph | Order, rhythm, missing rest | [Level Design Book, pacing](https://book.leveldesignbook.com/process/preproduction/pacing) **[V]**: Valve plotted explore, combat, choreo and puzzle beats against time, with "occasional downtime as a contrast and palette cleanser" | `RAIL_STOPS` in [segments.ts](../../dev/look/segments.ts) is the beat list. `npm run playthrough` prints time per beat, a floor for a first-timer's time ([bot segments](../agents/test-details/bot-segments.md)). The [map page](../world/map-prototypes.md#what-the-page-shows)'s stage stepper shows what is seen, reachable and locked at each stage | No leg table with distance, mode and "what pulls you"; the Home table below is a first one |
| Critical-path drawing and walk | Dead ends, stalls, legs that only work with extra moves | [Level Design Book, critical path](https://book.leveldesignbook.com/process/layout/criticalpath) **[V]** | The [production bot](../../dev/look/bots/railway.ts) walks the whole route with real inputs from a fresh room. `noJump` guards prove the hook walk, the Needle Bell climb and the quarry ramp need no air jump; trestles are checked for dry support every 3 m; drop returns pass without recovery. `--players 2` runs two peers | The bot already knows the way |
| Reachability by state (gate leaks) | What a move or an open gate reaches early | [Go-Explore](https://arxiv.org/abs/2209.00570) **[V]**: reachability bugs in large maps; [Rebellion, GDC 2021](https://gdcvault.com/play/1027537/AI-Summit-Automated-Game-Testing) **[V]**: a planner that plays "entire games from start to finish" | `npm run level-check -- --place=place` ([place-level.ts](../../dev/economy/place-level.ts)) floods the walkable ground for each job state. It asserts what each ability must and must not reach (the balcony needs the glider, the summit the hook), checks glide budgets from the summit and prints walks in metres and seconds | It reads Place's terrain, which production Home shares; it doesn't cover the Sickle greybox islands or know about props |
| Sightline stills at beat ends | Whether the next goal is in view | Level Design Book composition **[V]** | `npm run look -- --rail-seed <stage> --cam x,y,z --look x,y,z` and `look --at <beat>` stills | Judged by eye; nothing checks line of sight from a beat end to the next goal |
| First-timer playtest and heat maps | Where real players get lost, wait or split | BotW's heat maps ([level-design](level-design.md#1-breath-of-the-wild-and-tears-of-the-kingdom)); Halo 3 above; [Level Design Book, playtesting](https://book.leveldesignbook.com/process/blockout/playtesting) **[V]**: "Watching their behavior is more important than their feedback" | `npm run playtest` draws each session's heat map. Its "Together" section reports distance between players and time apart ([summary.ts](../../dev/playtest/summary.ts)) | The [8 November](../playtests.md#2026-11-08-solo-to-far-head-ipad) live build marked no railway beats, so data couldn't show progress per beat; whether that's still so is unchecked |

## What this means for Boogle

### The rules, as lenses

Three rules are near-universal: a plan that breaks one has a bug. The other five are taste. Each says when breaking it works and names a game that breaks it well, so read them as questions to ask of a plan, not a checklist to pass.

**Near-universal**

1. **The next goal can be found.**
   - It needn't be in view, but a player who wants to move on can find it without help, from where the last beat ended.
   - Halo 3's testers "were lost", Ocarina's players gave up at the Water Temple, and ALBW let stuck players go elsewhere (sections 1 and 3).
   - *A little lost works* in a small, safe space where wandering finds something: A Short Hike, Hollow Knight's unmapped areas, Outer Wilds' chosen wandering. Lost while wanting to progress, with nothing to go on, never works.
2. **A gate keeps its meaning.**
   - Stronger moves may skip distance (Dread's intended breaks, Hollow Knight's relaxed gates), but never the work or the explanation behind the gate ([route-contract](route-contract.md)).
   - A shut thing says why it's shut ([wordless-onboarding](wordless-onboarding.md)).
   - *Breaking it works* for travel only: speedruns and early scouting are welcome.
3. **Nobody is stranded.**
   - Every one-way has a way on. Every required gate works solo, no key can be lost, and no switch needs two people at once.
   - Sources: Luengo on softlocks; ability-upgrades' co-op table; route-contract's return edges.
   - A one-way drop is fine, even useful, when the way forward continues (Halo 3's jungle ledges).

**Taste**

4. **Tease the lock, use the key in sight, keep the return short.**
   - See the gate before you can open it, first use the key where you get it, and come back by a short way (Zelda's items, Dread's locks near keys).
   - *Breaking it works* in three ways:
     - A long return made once, as the "before" that a later build cuts (Dark Souls' long way round before the lift).
     - A return an hour later to a place you remembered, which is its own reward (Hollow Knight; [ability-upgrades](ability-upgrades.md#make-backtracking-a-return-trip-not-an-errand-list)).
     - A surprise nobody teased, once per area, if it lands on a place players know (Outer Wilds' meteor test, [level-design](level-design.md#5-outer-wilds-compact-worlds-that-run-on-their-own-clock)).
5. **One main line you could draw as a metro map, with side things beside it.**
   - The critical path reads as a line outward from home. Optional things sit on its shoulder with smaller rewards (Odyssey's weenie chain; the owner's "small stops on the way").
   - *Breaking it works* in three ways:
     - Doubling back through a known place that has changed (Gone Home; Firelink).
     - Several pulls at once at a hub (BotW's gravity; Odyssey's Seaside Kingdom, whose four seals open in any order **[G]**).
     - One order choice (ALBW; the Sickle Isles branch).
6. **The world gets shorter behind you.**
   - Each thing you build shortens a trip you know: a shortcut to the hub, a road, a train (Dark Souls, Death Stranding, Mini Metro).
   - *Breaking it works* for a slow stretch you want to feel, once: Journey's mountain made longer and darker, the great beam's slow carry, quiet stretches as "a palette cleanser" (Level Design Book).
   - Only repeated trips need relief, and relief that comes too soon removes the want (round 3's "Too soon").
7. **End a beat facing the next.**
   - Where one beat ends, something pulls toward the next: a light, a sound, a character, the track head, a framed view (Half-Life 2's birds and landmarks; Zelda's door cutscene).
   - *Breaking it works* in two ways:
     - A beat that ends on a view to rest in (Journey's summit; level-design's watch spots).
     - A beat that ends with two pulls and a choice.
   - Less is usually more: Boogle's playtesters read boards and shafts as orders, and the Level Design Book warns about Disneyland.
8. **In co-op, somewhere to meet at every beat end.**
   - Beat ends are places two or three people can gather: a frame, a halt, the forge.
   - Jobs can split while every gate stays solo-safe ([puzzle-order](../brainstorms/puzzle-order.md): one stocks while the other climbs).
   - Trains move people but not the work (Valheim's portals).
   - *Breaking it works* when each person has a job and the meeting place is in sight (Deep Rock's drop pod and the mule's trail). It Takes Two shows the cost when you can't know where the other player is.

### Home, beat by beat

Read from `common` in the map data, [place.md](../game-design/place.md) and the plans. "Pull" is what the plans and as-built notes say draws you on; no stills were taken for this report.

| Beat | Where (local m) | Leg from the previous beat | What pulls you on | Lens notes |
| --- | --- | --- | --- | --- |
| Arrival | Dock (−199, 10) | — | The path inland; Sleeves the greeter at the town entrance; Ring Island's shard on the northern horizon | 1 ✓ (the greeter came from the 8 November playtest) |
| T1–T3 (line 1) | Laid from the camp (−13, −142) back to the village stub | Village to camp ≈ 180 m (32 s) on foot | The old train and the parked machine at the camp; the track head moving toward home | 6 ✓: the line is built back toward home, so its payoff is the walk home, the Dark Souls shortcut |
| Forge, pack chest, proper axe | Forge (−88, −12) | On the finished track, home | The forge in the village; the chest appears at its first 24 logs | 5: a hub, like Firelink |
| Q1, Q2 | (−73, 11), (−51, 31) | 5 s and 10 s from the forge | The frame beside the track head | 7 ✓; dense, which suits Home |
| Hook, Needle Bell, sea switch | Rings from the start; summit (11.8, −6) at 102 m | Q2 to Needle Bell ≈ 72 m (13 s) | Home's tallest shape; eight rings visible from the start | 4 ✓: first use in sight. The [puzzle-order](../brainstorms/puzzle-order.md) fix (the first pull opens the sea gate) repaired a 4 failure: the switch was pulled 18 times for nothing on 8 November |
| Q3, quarry ramp, lever | Q3 (28, 27); lever (97, 42) | Forge to Q3 ≈ 122 m (22 s); Q3 to lever ≈ 71 m (13 s) | The quarry; the split rock | 4: the split rock is teased from here for Split-rock |
| Q4 to the rim; the cart | Rim (172, −23) | Q4 frame to rim ≈ 107 m (19 s) | A survey stake with a teal flag; the sea gate | 6 ✓: the cart relieves the hand-hauling that was "tedious" on 3 November |
| Q5 to Far Head | Far Head (379, −180) | 260 m of trestle (46 s) | The trestle itself; lamps and rockets | 7 ✓ |
| Boiler, old train, trains | Forge apron (−81, 5) to camp (−13, −142) | 546 m back along line 2 (≈ 98 s, or ride the cart), then carry it up line 1 | The boiler on its pedestal; the old train's empty saddle | 6, broken on purpose: the longest go-back on Home, made once, then trains cut it. 1: is the forge's call findable from Far Head? Unchecked |
| Q6 to the pier | Pier (402, −372) | Village to Far Head by train ≈ 67 s by the map page's ride model; Far Head to pier ≈ 194 m | The kit arrives by train; the pier points at Ring Island | 6 ✓; 7 ✓: the line's end faces the next island |
| Split-rock (planned, [split-rock-roundhouse](../plans/split-rock-roundhouse.md#what-the-player-sees-in-order-telegraphs)) | Breaker at the forge; stall slab (−88, 18); throat (119, 82) | Pier to forge ≈ 600 m (a 35 s walk to the Far Head halt, then a ride); quarry halt to throat ≈ 56 m (10 s) | The stall ruin, the seam since Q3, the pier's empty sockets | 4 ✓ throughout. 6: "four footings home by hand, about 8 minutes", then the wagon. 1: the breaker is 600 m behind you |
| Glider (proposed, [glider brief](../brainstorms/glider-placement.md)) | Needle Bell summit | Far Head to Needle Bell ≈ 406 m, then the hook climb | The dark device on the first climb; a faint locator on Q5 | 4 ✓; 7: two pulls on Q5's completion (boiler and glider) is a choice, which is fine; the first flight is the view |

**What reads well.**
- Line 2 runs outward in unlock order: forge, Q1 at 5 s, Q2 at 10 s, Needle Bell, Q3 at 22 s, the quarry, the rim, Far Head, the pier. Progress reads as moving east from home.
- The pier points north at Ring Island, which has stood on the horizon since the first minute.
- Teases come long before their use: Needle Bell's rings, the split rock, the stall ruin, the pier's sockets. On the Sickle Isles map the sea cave in the cove's sandstone face is seen from the West landing on day one and opened at stage 6, with the bay shortcut for the return.
- Each build shortens a trip players know: the line home, the cart, then trains.

**Where to look.**
- **Far Head after Q5, and the pier after Q6.** Both times the next goal (the boiler, then the breaker) waits at the forge, 500–600 m behind you and probably out of sight. Lens 6 says the long trip back is a fine "before" when it happens once. Lens 1 still asks whether the call reaches you:
  - Take a still from each beat end toward the forge.
  - If nothing shows, the smallest fix is something the world already justifies and that reads at that range: a plume from the forge's chimney, a whistle, or the next cart or train carrying the news.
- **The forge rhythm.** "The forge made something; go home" happens three times: rails, the boiler, the breaker. That is a learnable Firelink rhythm (lens 5's exception) as long as each return finds a visible change.
- **Two visits to Needle Bell** (hook, then the switch, 161 m from the rim). This is fine now that the first pull opens the sea gate. A player who skipped the summit goes back once, a 29 s walk plus the climb.
- **The bot's order isn't the player's.** The production bot opens the pack chest after the quarry gate, 193 m from the lever. A player meets it at the forge much earlier.
- **Moving the double jump (job E)** to Split-rock's ankle rings, below a balcony players have walked under since Q3, follows lens 4.

### Gaps

- **Unverified game facts.** Many points are **[S]** or **[G]**. Mark Brown's transcripts and Combine OverWiki refused or failed the fetch. The PC Gamer pages (Hollow Knight, Death Stranding) were truncated.
- **No stills.** The "pull" column comes from plans and as-built notes; no beat-end view was captured for this report.
- **Co-op flow is inferred.** No source covers it for two or three players in an open construction world; section 6 and lens 8 are inferred from linear games.
- **No first-timer times.** Bot times are floors. There are no first-timer times per railway beat since 8 November.
- **Tool gaps.**
  - Nothing checks line of sight from a beat end to the next goal.
  - Nothing checks that every place and gate in the map data is `seen` before it is reached (`reach`, or `open` for gates), though the fields exist.
  - level-check doesn't cover the Sickle greybox islands.
- **The designer agent's checklist.** Its "Flow first" checks ([designer.md](../../.claude/agents/designer.md)) are worded as musts. This report suggests holding only lenses 1–3 that way. Rewording it is a separate call.

## Sources

- Nintendo, Iwata Asks, A Link Between Worlds part 6: https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-A-Link-Between-Worlds/The-Legend-of-Zelda-A-Link-Between-Worlds/6-Rethinking-the-Unquestioned-/6-Rethinking-the-Unquestioned--832156.html
- Nintendo, Iwata Asks, Ocarina of Time 3D, the Water Temple: https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-4-Development-Staff/3-I-ve-Got-to-Fix-the-Water-Temple-/3-I-ve-Got-to-Fix-the-Water-Temple--235888.html
- Nintendo Everything, Great Plateau made first (IGN): https://nintendoeverything.com/zelda-breath-of-the-wild-devs-on-starting-out-with-10-people-showing-miyamoto-the-2d-prototype-great-plateau-made-first-more/
- Zelda Dungeon, the Depths (Famitsu): https://www.zeldadungeon.net/the-legend-of-zelda-tears-of-the-kingdom-developers-say-the-depths-were-made-in-a-surprisingly-short-period-of-time/
- Mark Brown, Why You Didn't Get Lost in Metroid Dread (transcript): https://amara.org/subtitles/Aci4iDbgsAtY/en/1/download/Why%20You%20Didnt%20Get%20Lost%20in%20Metroid%20Dread.en.txt
- Shinesparkers, Jacobo Luengo interview: https://shinesparkers.net/interviews/jacobo-luengo/
- Game Developer, Hollow Knight's map: https://www.gamedeveloper.com/design/how-the-i-hollow-knight-i-devs-mapped-out-their-metroidvania-
- Mobius Digital, The intentionality of wandering: https://www.mobiusdigitalgames.com/blog/the-intentionality-of-wandering
- The Level Design Book, critical path: https://book.leveldesignbook.com/process/layout/criticalpath
- The Level Design Book, circulation: https://book.leveldesignbook.com/process/layout/flow/circulation
- The Level Design Book, pacing: https://book.leveldesignbook.com/process/preproduction/pacing
- The Level Design Book, wayfinding: https://book.leveldesignbook.com/process/blockout/wayfinding
- The Level Design Book, playtesting: https://book.leveldesignbook.com/process/blockout/playtesting
- Nintendo Everything, Mario Odyssey (Game Informer): https://nintendoeverything.com/super-mario-odyssey-devs-on-captain-toad-changes-in-kingdoms-elements-for-mario-64-players-newcomer-help-more/
- Game Developer, What Mario learned from Mickey Mouse, part 3: https://www.gamedeveloper.com/design/what-mario-learned-from-mickey-mouse---part-3-decision-making-and-weenies
- PlayStation Blog, Crafting a tiny open world (A Short Hike): https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/
- Fextralife, Dark Souls Design Works interview: https://darksouls.wiki.fextralife.com/Dark+Souls+1+-+Design+Works+Interview
- Mark Brown, The World Design of Dark Souls (transcript): https://amara.org/subtitles/4zZSGmv4Qxsz/en/1/download/The%20World%20Design%20of%20Dark%20Souls%20%20Boss%20Keys.en.txt
- Game Developer, Multi-tiered horror design with Resident Evil Remastered: https://www.gamedeveloper.com/design/multi-tiered-horror-design-with-resident-evil-remastered
- Wired (Clive Thompson, 2007), Halo 3 user research, mirror: https://wirednews.pages.dev/2007/08/ff-halo-2
- Combine OverWiki, Half-Life 2: Episode Two commentary: https://combineoverwiki.net/wiki/Developer_commentary/Half-Life_2:_Episode_Two
- Adventure Gamers, GDC 2013: Designing Journey: https://adventuregamers.com/article/designing_journey and https://adventuregamers.com/article/designing_journey?cp=2
- Game Developer, GDC 2012: how Journey was designed to facilitate friendship: https://www.gamedeveloper.com/audio/gdc-2012-how-i-journey-i-was-designed-to-facilitate-friendship
- Vice, Death Stranding is a collective power fantasy: https://vice.com/en/article/death-stranding-is-a-collective-power-fantasy-about-infrastructure-and-aid
- PC Gamer, Death Stranding road building: https://pcgamer.com/death-stranding-relaxed-me-so-hard-i-became-a-road-building-madman
- Factorio Friday Facts #258: https://www.factorio.com/blog/post/fff-258
- Satisfactory wiki, World: https://satisfactory.wiki.gg/wiki/World
- Dinosaur Polo Club, Mini Metro: https://dinopoloclub.itch.io/minimetro
- Inverse, Animal Crossing bridges and inclines: https://www.inverse.com/gaming/animal-crossing-new-horizons-bridge-incline-guide-ramp-vaulting-pole-ladder-price-list
- The Ringer, Josef Fares interview: https://www.theringer.com/2021/4/22/22396763/josef-fares-it-takes-two-interview-co-op-gaming
- Ghost Ship Games, cave generation in Deep Rock Galactic: https://devtrackers.gg/deep-rock-galactic/p/8cd5ca9c-below-decks-at-ghost-ship-cave-generation-in-deep-rock-galactic
- Deep Rock Galactic wiki, M.U.L.E.: https://deeprockgalactic.wiki.gg/wiki/M.U.L.E.
- TechRaptor, Valheim portals: https://techraptor.net/gaming/guides/how-portals-work-in-valheim
- Gamepressure, Valheim devs said no to metal teleportation: https://www.gamepressure.com/newsroom/valheim-devs-said-no-to-metal-teleportation/z02f3e
- arXiv, Go-Explore for automated reachability testing: https://arxiv.org/abs/2209.00570
- GDC Vault, Rebellion, Automated Game Testing (2021): https://gdcvault.com/play/1027537/AI-Summit-Automated-Game-Testing
