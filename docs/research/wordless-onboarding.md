# Wordless onboarding: the first five minutes, and joining friends mid-session

*Research report, 1 November 2026. How games teach without text in their opening minutes (Super Mario Bros. 1-1, Nintendo's kishōtenketsu, Portal, Limbo and Inside, Celeste, Journey, Breath of the Wild, A Short Hike, Untitled Goose Game, Animal Crossing), how they pull a player toward a goal (Disney's "weenie", BotW's triangle rule), how multiplayer games bring in a late joiner and show shared progress (Journey, Deep Rock Galactic, Among Us, Animal Crossing visits, Fall Guys), and how a link-shared web game hooks someone in 30 seconds (Poki's developer guide, Roblox's creator docs, .io games, Bruno Simon's portfolio). Builds on [controls-guide-and-pause-menu.md](controls-guide-and-pause-menu.md) (the controls guide, pause view and first-run card) and does not repeat it. Serves DESIGN.md 7 (Telegraph everything) and 8 (Designed for drop-in). Recommendations only; nothing here is decided. Sources were checked with web search and page fetches; several talks (A Short Hike's GDC postmortem, Maddy Thorson's Celeste talk) were seen only through summaries, and the search budget ran out before A Short Hike and Animal Crossing's first day could be checked further. Each section says how solid its evidence is.*

## Summary

1. The games that teach best without words put the lesson where the player can't miss it and fail safely: 1-1's first Goomba, its mushroom that is hard to dodge, its pits with floors.
2. One idea, four beats: introduce it safely, develop it, twist it, then let the player show mastery (Hayashida's kishōtenketsu). Boogle's haul loop already has this shape.
3. Players read the world literally. Portal's force field confused testers until it became glass; Goose Game keeps a dead lawnmower around to show what won't work. A locked or grey thing has to say why it's shut.
4. Lures beat arrows. A tall landmark seen from the start (Journey's mountain, Disney's castle, BotW's towers) gives a goal with no text. Chains of them, each revealing the next, lead a player through an open space.
5. Attention needs a nudge: Portal stops players with a sound and particles, and puts exits on moving pistons because testers rarely looked up. Contextual prompts at first contact, timed hints only for players who are stuck (Roblox).
6. On the web the clock starts at the click: players tend to leave when loading passes about 10 s, and first-timers should skip title screens (Poki). The 30-second hook is a physics toy within reach of the spawn point (Bruno Simon placed the car beside a title you can knock over).
7. Late joiners arrive near the action without stopping anyone. Animal Crossing's unskippable arrival scene, which freezes everyone, is the counter-example; Deep Rock Galactic drops late joiners in a personal pod.
8. Journey keeps strangers together with one wordless call and a glow at the screen edge pointing to an off-screen companion. Boogle's honk and ping are the same tools.
9. Shared progress reads best as the world itself plus one shared gauge. Examples are Among Us's task bar and Journey's scarf. Boogle's laid track, ring fill and plaques are most of the way there.
10. Valve's method is the one to copy: watch a newcomer silently, change the room, test again. Boogle's 'solo first' playtests can add a five-minute first-visit protocol with three timings.

## 1. Teaching by level design

### Super Mario Bros. World 1-1 (Miyamoto and Tezuka, 2015 Eurogamer video; secondary coverage)

- **The first enemy was picked so you survive the first seconds.** The team considered a Koopa Troopa as the first enemy. Miyamoto worried that players killed five seconds in would quit; a Goomba stays on the ground and is easy to jump over or onto ([Creative Bloq](https://www.creativebloq.com/3d/video-game-design/why-super-mario-bros-is-still-a-fantastic-lesson-in-game-design), [Wikipedia: World 1-1](https://en.wikipedia.org/wiki/World_1-1)).
- **The good thing is hard to avoid.** The first mushroom rolls right, drops, bounces off a pipe and comes back toward Mario, so most players touch it and learn that mushrooms help ([Wikipedia](https://en.wikipedia.org/wiki/World_1-1)). Coins from the first blocks were meant to make players happy enough to keep hitting blocks.
- **Safe failure.** Some early pits have floors, so falling in costs nothing, and pits of growing width nudge players to discover running ([Wikipedia](https://en.wikipedia.org/wiki/World_1-1), [Nintendo Insider](https://www.nintendo-insider.com/shigeru-miyamoto-shares-the-design-process-behind-world-1-1-in-super-mario-bros/)). Pipes of varying heights teach that a longer press jumps higher.
- **1-1 was built last.** Tezuka said they made 2-1 and 2-2 first and came back to 1-1 ([MyNintendoNews](https://mynintendonews.com/2015/09/07/miyamoto-and-takashi-tezuka-talk-about-the-creation-of-super-mario-bros-world-1-1/)). The opening teaches a game that already exists.

### Kishōtenketsu (Koichi Hayashida, Super Mario 3D Land; Game Developer)

Hayashida describes each level as built around one core idea in four beats, borrowed from the four-panel comic form: learn the mechanic, use it in a harder situation, a twist that makes you see it differently ("something crazy happens"), then a conclusion where you show mastery ([Game Developer](https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design), [Nintendo Life](https://www.nintendolife.com/news/2012/04/super_mario_3d_land_director_shares_level_design_inspirations)). He says he only became strict about one idea per level with 3D Land. The structure is for a level, not a whole game, and analysts note that not every level uses all four beats ([The Color and Shape of Play](https://thecolorandshapeofplay.substack.com/p/when-a-single-idea-is-enough-to-sustain)).

### Portal (Valve; developer commentary and the GDC 2008 postmortem)

The in-game developer commentary ([Portal Wiki transcript](https://theportalwiki.com/wiki/Portal_developer_commentary)) is the most detailed primary record found for this report, and almost every node is a playtest fix:

- **Show why you can't leave.** The first room had a shimmering force field; testers didn't understand why they couldn't walk out and got frustrated, so it became glass. That change set the art direction of the clean test chambers ([Destructoid](https://www.destructoid.com/gdc-08-portal-devs-talk-narrative-development-rat-men/), [Game Developer](https://www.gamedeveloper.com/pc/best-of-gdc-the-secrets-of-i-portal-i-s-huge-success)).
- **Let players see the trick work on themselves.** Testers grasped portals faster when they glimpsed themselves through one, so the first portal is placed to make that likely; the start room is visually distinct so players know they haven't left it.
- **Force a look at the new thing.** Testers rushed past the portal gun, so a pause, a particle burst and a loud noise point at it. Testers rarely look up, so exits sit on moving pistons; later a ladder draws the eye upward.
- **One tool at a time, then combine.** Robin Walker calls the game a long training exercise; puzzles are gated so aimless wandering hits a dead end, which evens out the learning curve. Cluttered rooms distracted testers, so the art was simplified.
- **Watch, don't ask.** Kim Swift called playtesting the most important thing they did, and told developers to sit and watch rather than read reports; at the end testers were asked to tell the story back ([Game Developer](https://www.gamedeveloper.com/pc/best-of-gdc-the-secrets-of-i-portal-i-s-huge-success)).

### Limbo and Inside (Playdead)

- **Limbo** has no tutorial text by rule: a stick and two buttons (jump, grab). Jeppe Carlsen called it a learning-by-dying game, harsh with puzzles and gentle with the player: death costs almost nothing. The right solution must be easy to execute, because players who fail a correct idea a few times drop it and rarely return. When testers fixated on a bear trap instead of a spider, the trap moved to another screen ([Game Developer, GDC Europe 2010](https://www.gamedeveloper.com/game-platforms/gdc-europe-i-limbo-i-s-carlsen-on-making-players-your-worst-enemy-and-your-best-friend)).
- **Inside**'s menu has no prompts: pressing any button drops you in, and that button turns out to be jump, which the first obstacle (a fallen tree) asks for. A bird flying off a fridge draws the eye to the thing you will drag and climb. Lessons return later under more pressure (hide, then hide while chased) ([Game Developer analysis](https://www.gamedeveloper.com/design/inside---teaching-through-level-design); a writer's analysis, not Playdead's).

### Celeste (Maddy Thorson, GDC 2018; summary only)

The talk's listed takeaways: teach movement through how the room is built, make difficulty from combining known parts rather than surprises, guide attention within the screen, and keep failure cheap and informative with fast retries ([GameDesign.gg summary](https://gamedesign.gg/watch/designing-celeste/)). The full talk was not reviewed.

## 2. Lures: telegraphing the goal

### Disney's "weenie" (Scott Rogers, GDC 2009; Game Developer series)

Walt Disney named the tall landmark that pulls visitors forward, Sleeping Beauty Castle at the end of Main Street, after the hot dog you lure a dog with. At the hub in front of it, more weenies open up and visitors choose. Rogers taught himself level design from it ([Boing Boing on the talk](https://boingboing.net/2009/03/27/gamedesign-lessons-f.html/amp)). A Game Developer analysis shows Super Mario Odyssey chaining weenies: each is visible early, reached in order of distance, with rewards that grow; smaller side weenies lead to small rewards, so the main line stays the most attractive. At a hub, several weenies point at areas without giving away exact spots ([Game Developer](https://www.gamedeveloper.com/design/what-mario-learned-from-mickey-mouse---part-3-decision-making-and-weenies)).

### Breath of the Wild (GDC 2017 and CEDEC 2017)

- **Triangle rule** (CEDEC 2017, translated by Matt Walker): triangular landforms let the player choose over or around and hide what's behind, so the view reveals things gradually; rectangles hide completely. It is used at three scales: landmarks, sightline blockers, local pacing. Structures are ranked by visibility so important ones read first, and "gravity" between many of them pulls players back and forth. Spreading towers evenly with events between them first made the game feel linear; after the change, heat maps showed paths spread much more evenly ([translation gist](https://gist.github.com/idbrii/e39fe96279aa1670319bfa521d907399)).
- **Multiplicative play** (GDC 2017): situations with physics and chemistry rules instead of puzzles with one answer ([Engadget](https://www.engadget.com/2017-03-12-breath-of-the-wild-gdc-talk.html)). The Great Plateau is widely described as a fenced miniature of the whole game ([Wikipedia](https://en.wikipedia.org/wiki/Great_Plateau)); no developer source on its design was found.

### Journey (thatgamecompany)

The mountain is visible from a dune at the very start and is the destination of the whole game; the route is split into linear sections beneath it ([Wikipedia](https://en.wikipedia.org/wiki/Journey_(2012_video_game))). There are no words except the title and credits.

### A Short Hike (Adam Robinson-Yu; partly unverified)

A small island whose peak is the goal. Robinson-Yu credits BotW's small "Where's Waldo" moments (Korok seeds) as micro-puzzles that keep travel interesting, and says he kept scope very small ([Yahoo/Edge](https://tech.yahoo.com/gaming/articles/short-hike-dev-says-wheres-134223887.html), [Game Developer, Road to the IGF](https://www.gamedeveloper.com/business/road-to-the-igf-adam-robinson-yu-s-i-a-short-hike-i-)). His GDC 2020 postmortem, "Crafting a Tiny Open World", is listed as covering player guidance ([GDC Vault](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A)), but its content was not checked.

## 3. Toys that explain themselves

### Untitled Goose Game (House House)

- The structure is a small physical space and a list of goals, after Tony Hawk; the list pushes players toward bigger interactions, and messing about is fun on its own ([Shacknews](https://www.shacknews.com/article/107642/untitled-goose-game-interview-house-house-dev-nico-disseldorp-talks-being-a-jerk)).
- **Calibrate expectations.** The game relies on players believing their silly ideas might work, so the team filled in edge cases where something "should" work, and kept a red lawn mower nothing can be done with, as a signal that some things won't ([Game Developer Q&A](https://www.gamedeveloper.com/design/behind-the-honk-an-i-untitled-goose-game-i-q-a)).
- The opening teaches honk, grab and crouch before the title appears, then the first to-do item (get into the garden) is solved with things right by the gate (walkthroughs, [GamesRadar](https://www.gamesradar.com/untitled-goose-game-walkthrough-puzzle-guide)).

### Bruno Simon's portfolio (2019, three.js + cannon.js)

- He chose a car because it is easier to steer than a first-person view, and because physics is underused on the web ([Pastel interview](https://usepastel.com/blog/how-a-design-portfolio-got-the-attention-of-400-000-visitors)).
- **The first thing you touch proves the world is physical.** In his case study he says the car starts beside the "BRUNO SIMON" letters so that bumping them shows everything can be moved. The most-asked question after launch was how to jump: Shift seemed obvious to him and wasn't to non-gamers ([Medium case study](https://medium.com/@bruno_simon/bruno-simon-portfolio-case-study-960402cc259b), seen as search excerpts; the page refused a direct fetch). It drew over 400,000 visits.

### Fall Guys (Mediatonic; secondary)

Each round should be explainable in three words so anyone can pick it up (a team pillar, per [Creative Review](https://www.creativereview.co.uk/behind-the-scenes-fall-guys-game/), seen as a search excerpt). Levels lean into how imprecise the characters are, and the target mix is roughly 80% skill, 20% chaos ([GamesBeat](https://gamesbeat.com/fall-guys-ultimate-knockout-how-mediatonic-crafted-a-cute-battle-royale/)). Readability is part of why it spreads by streams.

## 4. The first minutes in a web game

### Poki developer guide (primary)

- Players tend to leave if loading takes more than about 10 s; keep the first download small and load the rest progressively ([requirements](https://developers.poki.com/guide/requirements-quality)).
- Measured case: Stickman Hook at 40 MB had a median load of 29.5 s and 50% of visitors started playing; at 6 MB, 3.7 s and 72% ([Poki blog](https://poki.com/blog/what-makes-high-quality-browser-game), via search excerpt).
- For first-time players skip splash screens, title screens and level selects; explain with images, animation and gestures, since walls of text intimidate and English-only text excludes many; reveal actions over the first levels; watch recordings of the opening minutes and iterate ([easy access guide](https://developers.poki.com/guide/easy-access)). Its own "start of gameplay" event fires on the first input, not on load.

### Roblox creator docs (primary)

Make sure new players have fun within five minutes and avoid long tutorials. Teach a feature the first time a player touches it, and use visual elements (a glowing trail in the world, a spotlight with the rest dimmed, a persistent marker until a step is done). Timed hints appear only for players who seem stuck. End the first loop on a joyful moment, and measure first-session retention minute by minute ([onboarding techniques](https://create.roblox.com/docs/production/game-design/onboarding-techniques), [engagement](https://create.roblox.com/docs/production/analytics/engagement)).

### .io games (secondary only)

Agar.io (2015) and its followers share instant play in a tab, no sign-up and no menus longer than a match. Only game-portal summaries were found ([Dinogame](https://dinogame.gg/blog/what-is-an-io-game/)); no designer interview.

## 5. Joining friends mid-session

### Journey: strangers without words

Another player appears in the same section, optional and unable to hinder you. There is no chat, no voice and no name until the credits ([Wikipedia](https://en.wikipedia.org/wiki/Journey_(2012_video_game))). Chen turned communication into a single call whose size and rhythm carry mood, so people "might know you are mad" without hearing curses; Robin Hunicke recalls testers forming opinions of others from movement and calls alone ([Game Developer](https://www.gamedeveloper.com/design/how-i-journey-i-eliminated-online-toxicity-with-a-simple-ping)). The call is also the progress tool: singing recharges cloth that opens the way. A companion out of sight shows as a white glow at the screen edge (fan wiki, [Journey ShoutWiki](https://journey.shoutwiki.com/wiki/Companions)).

### Deep Rock Galactic: a late joiner arrives as an event (wiki)

A player who joins mid-mission rides down alone in a personal drop pod; earlier builds teleported them in. Joining is closed in some phases, such as after extraction is called ([DRG wiki](https://deeprockgalactic.wiki.gg/wiki/Personal_Drop_Pod), [Mission](https://deeprockgalactic.wiki.gg/wiki/Mission)). Monster Hunter World's community co-op mod places a late joiner beside the leader or another member ([Nexus Mods](https://www.nexusmods.com/monsterhunterworld/mods/8805)).

### Animal Crossing: New Horizons: the counter-example

Arrivals happen at the airport, and every arrival and departure plays an unskippable cutscene for everyone on the island, closing their menus. With an open gate this happened "every two minutes or so", and items could not be placed while visitors were present ([Kotaku](https://kotaku.com/nintendo-has-made-animal-crossing-visits-as-annoying-as-1842886629), [Vice](https://vice.com/en/article/4ag84j/animal-crossing-has-an-unskippable-cutscene-that-is-making-me-hate-my-visitors)). Nogami describes the game as something to play little by little each day ([Nintendo Everything](https://nintendoeverything.com/animal-crossing-new-horizons-devs-on-the-decision-to-start-on-an-island-new-features-multiplayer-more/)). How its first day is paced (the tent, the first tasks) was not verified.

### Among Us: one shared bar (community sources)

Crewmates share a single task bar that fills as anyone finishes a task; hosts can set it to update only at meetings, or never, because players read it as evidence ([TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/AmongUs)). New players can walk the map alone in Freeplay ([Wikipedia](https://en.wikipedia.org/wiki/Among_Us)). No Innersloth source on onboarding was found.

### Big Walk (already in [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md))

Short-range voice and tools to find each other again (flares, megaphones, pointers): reconnecting is itself play.

## What this means for Boogle

Boogle today: a link opens a lobby (name, colour, "Jump in"); you land at (14, 26) beside the court, where the ball waits; the first-run card lists the controls for up to 15 s; palms carry log bundles (E: Take logs); the open work site takes logs in its rings; a full Track ring offers "Start the machine", a 50 s scripted run that is the same for everyone, late joiners included ([haul.md](../game-design/haul.md), [first-run.md](../game-design/first-run.md), [island.md](../game-design/island.md)). The first playtest called the island "still sort of empty" ([playtests.md](../playtests.md)).

1. **Measure the link-to-first-input time on the M4 iPad and a desktop before changing anything.** Poki's 10 s and its 50% vs 72% case make load time the first filter. Log, per first visit, the seconds from navigation to first frame, to first input, to first ball touch, to first log taken and to first pour, as Local timings in the existing telemetry batch.
   *Smallest prototype:* `?proto=firstvisit` writes those five timings to the console and the telemetry report; one run per device.

2. **Try putting the player on the island first and asking for name and colour later.** Poki says first-timers should skip title screens; Inside's menu is dismissed by the jump button. A random colour and a placeholder name could do until the player opens the pause view's Room page or someone joins. This touches the roster (`who.set`) and should be weighed against how names show on plaques.
   *Smallest prototype:* `?proto=nolobby` skips the lobby with a random colour and "Guest"; compare time to first input with the lobby.

3. **Make the first 10 seconds a 1-1: a toy that is hard to avoid.** Bruno Simon put the car beside letters you will bump; 1-1's mushroom rolls toward you. Spawn facing the court with the ball rolling gently toward the spawn point, so the first touch is an accident that shows the world is physical. Keep the first danger-free: nothing at spawn should punish.
   *Smallest prototype:* `?proto=arrival` sets spawn yaw toward the court and gives the ball a small push toward spawn on first entry (Local, first visit only); record time to first ball touch.

4. **Give the haul loop a kishōtenketsu shape on the ground.** Introduce: a log bundle on the direct line from spawn to the open site, so the first one is met, not searched for. Develop: the walk to the ring with logs on your back, and the pour. Twist: the machine run, where the logs become track and something moves. Conclude: the wagon rides what you built. The loop already has the beats; the recommendation is layout, so the first bundle and the open site are on one sightline from spawn.
   *Smallest prototype:* a layout in [island-layout.md](../proposals/island-layout.md)'s lab (`?layout=`) that moves one palm onto the spawn-to-site line; time to first pour, solo, versus the as-built layout.

5. **Give the open work site a weenie, and chain the next one behind it.** A newcomer needs to see from spawn where the shared effort is (DESIGN.md 7). Something tall and moving at the open site (a flag, a crane jib, smoke while the machine runs) works the way Journey's mountain and Disney's castle do; the lighthouse can be the next weenie the line points at. Use BotW's triangle rule to reveal the second only once the first is reached. Rank visibility: the open site should read before decoration does.
   *Smallest prototype:* a greybox mast with a pennant at the open site, moved to the next site when a section is laid; check it is visible from spawn in the layout lab, then ask a newcomer "where would you go?" after 10 s.

6. **Make closed things say why they are closed, and make inert things look inert.** Portal's force field became glass; Goose Game's lawnmower calibrates. The grey "later" sites, palms whose bundle is empty and props that do nothing should read at a glance: a tarp and rope over a later site's sign rather than grey; an empty bundle that is visibly just bindings. On iPad there is no hover, so this has to be in the model, not a tooltip.
   *Smallest prototype:* swap the "later" sites' grey for a covered sign and the empty bundle for loose rope; watch whether a newcomer walks to a closed site.

7. **Point the eye at new things with sound and motion, not text.** Portal stops testers with a noise and particles and puts exits where eyes go. The haul loop has three moments that deserve a cue: a bundle in reach (a small rustle or leaf drop when you come within a few metres), a ring that will take what you carry (a pulse when you approach with logs), and "Start the machine" becoming possible (a bell or whistle from the site that can be heard from spawn). The existing interact prompt stays the verb; these are the lure.
   *Smallest prototype:* add the third cue only (a site bell when the Track ring fills) and note whether players who weren't at the site come to it.

8. **Keep the first-run card to what the world can't teach.** Roblox teaches at first contact and Poki reveals actions gradually. Move and look can't be taught by the world; Take logs, pour and Start the machine already are taught by the prompt at first contact. The card could shrink to move, camera and jump, and the hands rows could appear as prompts only. (The card exists; this is a trim, not a rebuild.) Bruno Simon's jump question says the jump button deserves to be in the shrunk card on every device.
   *Smallest prototype:* a `?proto=` variant of the card with only the Getting around and Camera groups; compare time to first log.

9. **Offer a timed nudge only to someone who seems stuck.** Roblox's timed hints and Journey's edge glow suggest a wordless pointer after, say, 60 s with no ball touch, log or pour: The Boogler wandering over and hopping toward the nearest bundle, or a short ping-style marker on the open site. Nothing for players who are already doing things.
   *Smallest prototype:* a Local timer that shows one ping marker on the open site after 60 s idle in a first visit; count how often it fires in playtests.

10. **A late joiner should arrive where people are, as a small event that stops nobody.** Animal Crossing shows what to avoid; Deep Rock Galactic and the MHW mod show the joiner going to the group. Options to test: spawn near the most recent cluster of players instead of the fixed spawn, or keep the fixed spawn and show friends with Journey's edge glow (the Boogler pointer's fade from 35 to 60 m is prior art). Mark the arrival for others with something light, such as a honk-style puff where they land and a roster pill, never a cutscene or a modal. Joining during a machine run is already handled (the run is the same for everyone); make it audible from spawn so the joiner is drawn there.
   *Smallest prototype:* `?proto=join-near` spawns a joiner within 6 m of the nearest player who is on land, plus edge glows for friends off screen; two tabs, measure seconds until the joiner is next to someone.

11. **Show shared progress as world state first, then one board.** Among Us has one bar; Journey has the scarf. Boogle already shows laid track, sleepers piling in the ring and plaques. What a joiner can't see from spawn is how far along the line is. The decided departures board (stations as fast travel) could double as the at-a-glance progress board: a wordless line diagram with laid sections filled in, the open site's ring fill and the machine's state. Placing one at spawn answers "what are we doing?" in one look, without a HUD meter.
   *Smallest prototype:* a greybox board beside spawn that draws the route from `sites` state (laid, open with fill, later); ask a joiner to say what the group is building.

12. **Add a first-visit playtest protocol to the solo-first playtests.** Valve watched silently and asked testers to tell the story back. For Boogle: a person who has never played opens a link on an iPad, nobody speaks for five minutes, then they answer "what does this island want from you?" Record the timings from recommendation 1. A playtest kit in the style of `?proto=haul`'s panel could show the timings afterwards.
   *Smallest prototype:* a checklist in `docs/playtest-kits/` and the `?proto=firstvisit` timings; one stranger per change to the arrival.

### What wasn't checked

A Short Hike's GDC talk, the Celeste talk and Animal Crossing's first-day structure were seen only through summaries or not at all; Fall Guys' "three words" pillar and Bruno Simon's case study quotes come from search excerpts of pages that refused a direct fetch; the Among Us task-bar details and the Deep Rock Galactic join flow come from community wikis. None of the recommendations has been tried in a browser.
