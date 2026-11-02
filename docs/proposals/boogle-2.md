# Boogle 2.0: the design record

*Decision log, 1 November 2026. The owner's picks from the Boogle 2.0 design thread (rounds 1–8, 29 October to 1 November 2026), written down so another agent can pick it up. On design, this file is authoritative over [docs/research/0.1/SETTLED.md](../research/0.1/SETTLED.md), where the two disagree; `main`'s code is the architecture to build on. Nothing here is built unless [docs/game-design.md](../game-design.md) says so.*

## Where things are

| What | Where |
| --- | --- |
| The interactive concept page: map by era, deep dive, venue paintings, the current round of questions | Boogle 2.0 artifact, https://claude.ai/artifact/JvHs1aHAiGyvZ61PF6ZgoG (private to the owner) |
| Island layout lab: home and archipelago maps, layout options with pick buttons | https://claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT (private to the owner); options in [island-layout.md](island-layout.md) |
| Level design previz: real renderer captures, image generation matched to them, and the painted first round (home concepts, network layouts) | Boogle Island Previz artifact, https://claude.ai/artifact/UWXyVfLBbG9NMY5uBe1j1C (private to the owner); images and boards in `.look/previz/` (`home-redesign`, `network-ring-chain`, `network-branching`, `places-engine-look`, `islands-*`), the rough blockout in `.look/env-ref/` (both gitignored, in the main checkout on the owner's Mac) |
| Earlier concept pages | "Boogle Grows Up" https://claude.ai/artifact/9iQwPsUqWHxzy5TLENNZwK, "Boogle Crossroads" https://claude.ai/artifact/DMWtrTw6N8vBjKREKYwLcC |
| Painted concepts: 8 eras, the era-2 opening day, the mainland port, 13 venue close-ups | Branch `claude/concept-images`, `concepts/` (a scratch branch, never merged to `main`); prompts in `dev/concepts/` |
| Build spec for eras 1–2 | [vertical-slice.md](vertical-slice.md) |
| Story, gags and finales | [story-and-finale.md](story-and-finale.md), [fourth-melon.md](fourth-melon.md) |
| Progression without mini-games | [progression-paths.md](progression-paths.md) |
| Venues and the hub | [hub-and-minigames.md](hub-and-minigames.md) |
| Does the engine fit? | [docs/plans/boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md) |
| Build plan for "find the fun", one checkbox per PR | [docs/plans/find-the-fun.md](../plans/find-the-fun.md) |
| The game as built; playtest findings | [docs/game-design.md](../game-design.md); [docs/playtests.md](../playtests.md) |
| Research behind it | [docs/research/README.md](../research/README.md) (rail-as-play, progression-models, discovery-progression, system-cohesion, big-walk-and-communal-endings) |

## How the owner works

These are standing preferences from the thread.

- **Feel first.** "Game feel is tantamount." Every interactive thing gets a feel pass before it gets rewards.
- **Mechanics before narrative.** Find the fun in the core loop and its feel first (1 November). Story, characters and gags come later and are easy to fill in. Don't commit to them before the loop works.
- **Think ambitiously.** Early mocks were "too simplistic". The owner wants clear technological stratification between eras, a bigger island, and a city.
- **Likes:** vehicles, exploration, construction you can watch, goofiness, Palworld's take on materials.
- **Wary of:** material grinds.
- **Collaborators may write the narrative.** Don't lock story details in alone. Draft options for them to react to.
- **Decides through HTML pages with pick buttons.** The concept page ends with a round of questions and a copyable summary. Keep its localStorage key `boogle-2-v5`: changing it wipes the owner's picks.
- **Solo first** (1 November). Every prototype must work and be fun for one person playing alone; multiplayer builds on top.
- **Fast iteration over test coverage** (1 November). Agents run many tasks in parallel, see their own results and ship by themselves; tests only where lockstep needs them.
- **Research before deep facets** (1 November). A facet with real depth (level design, vehicle feel, construction, rendering, asset pipelines) starts with deep research into industry practice, written to `docs/research/`, before its options are drafted.
- **Painted concepts** come from `npm run concepts` (the `concept-art` skill). They run through Codex CLI on the owner's Mac, using a session started on that Mac. They're references, not game art.

## Decided

### The shape of the game

- **2026-11-02, the game runs closer to 8 hours, and starts with fewer eras** (owner, after the compounding research: "expand the game length more to an 8-hour, closer to an 8-hour experience"; "if we need to start with fewer eras, because we already have so much going on and so many assets, maybe we can just reduce those a little bit in quantity"). The eight eras below are the long list, no longer the plan; which ones remain is open question 14.
- **The island grows through eight technology eras.** It expands outward (reclaimed land) and new islands rise around it.
  1. **The wood age** (in the game; "castaway camp" is a name for its look only)
  2. Steam wagons
  3. Iron and coal
  4. Steel and harbour
  5. Diesel and concrete
  6. Electric
  7. Monorail city
  8. Maglev
- **Steam comes early and keeps getting better.** The industrial eras are grimy and smoky, but goofy. **2026-11-02, electric doesn't have to clear the air much** (owner: "I don't think we need to have the air clear with electric that much"); it was "the electric era clears the air".
- **The mainland port city** is visible from the start, reachable at the end, and you can walk around it.
- **2026-11-01, home grows; the metropolis doesn't** (owner: "the starting area should evolve over time and grow", and "closer to the end game, you get to reach more of an existing metropolis ... we wouldn't have to evolve it over time up close or anything. We would just build it as its more final state"). The mainland is one build in its final state, with no era versions up close; era work goes into home and the islands. How big home gets by the late eras, and what "monorail city" means there, is still open.
- **2026-11-01, islands aren't tied to mini-games** (owner: "I don't want to tie certain levels to different mini games. That was more just an aside thought"). Places are designed on their own terms, for variety.
- **Old lines upgrade with the eras**, and a heritage narrow-gauge loco keeps running.
- **Pace: fast.** Was about 1–3 evenings per era; the 8-hour target above replaces that, see Changed.
- **After the finale,** the archipelago stays open as a toy box.
- **The ending is open** (see [story-and-finale.md](story-and-finale.md), section 2).

### Trains and the world

- **2026-11-01, laying a section runs quick** (about 14 s; full run-through: "Yes it's wonderful. Quick feels pretty good"). Fix the jump at the end of the laying animation.
- **2026-11-01, construction you can watch is how things get built** ("I absolutely love this kind of animation"). The piece-by-piece build leaves the prototype for the game.
- **2026-11-01, today's island and line aren't the target** (owner, run-through: the current island "is not in line with the overall vision"; the line should be meaningful, and the map follows the activities and locales). The layout lab's three options on today's island are parked and lighthouse-line is out; the redesign is the next entry.
- **2026-11-01, the home island is a ground-up redesign, not an extension** (owner: "Everything in the new island should be more intentionally designed"). It's probably bigger than today's ~23,300 m², with Big Walk's environment as the lead reference ("always feels like there's something you're finding"). Design for walking plus the rail, with folds, reveals, traversal unlocks and land reserved for later eras. Don't brief today's layout as the base.
- **2026-11-01, the rail network is a stepping-stone chain toward the mainland, but not a pure corridor** (owner: "Maybe there's shortcuts or more rails that appear in different places"). One clear frontier direction, with cross-links, branches and loops growing behind it; a ring's interior is never empty sea. Still open: which links appear when, and whether the chain closes into a ring. The owner also liked the ring line, except that "it was very sparse in the middle": whether the chain closes into a ring with a full middle is still open.
- **2026-11-01, environment previz leads with the real renderer** (painted maps made it "hard to get a real feel"): the look lab's `high` preset and blockouts at the game's camera, with image generation only using those captures as style references. The owner wants more variety and eventually a bigger city on the shore, and islands aren't tied to mini-games.
- **2026-11-01, the wagon is transportation** (owner, second run-through: "I think it's fine just as a transportation"). The fast pace is fine. Snatch, stoke and grind are cut ("I don't care for" them). Was "riding must be more than standing on a moving platform", see Changed.
- **2026-11-02, the wagon's show and bench are cut** (owner: "I think we don't need to keep the wagons show or bench variants. I didn't really even notice the bench one. Maybe that could be cool, but I don't know."). No trackside scenes and no seat on the wagon; the seat with its side-on camera is parked in [ideas.md](../ideas.md).
- **2026-11-02, the rail builds the world: the working direction, being prototyped** (owner: "we could use Rail to connect sort of like resource installations, which would automatically carry resources onto the Rail network ... depositing it into the cities ... which allows them to grow"; "the user task is just building more rails and connecting them and upgrading the trains and the rail network"). The idea, after Death Stranding's auto-pavers and monorails: building infrastructure makes it easier to build more. Connecting an installation puts its goods on the line with no routing or quotas, towns grow from what arrives, and grown towns give upgrades that extend your reach. This takes over from manual resource management. Its details stay open until a prototype says it's fun ([find-the-fun.md](../plans/find-the-fun.md), step 6).
- **2026-11-02, leaning: junctions unlock the network, and you still haul each track segment** (owner, after `?proto=net`: "I like the idea that at least there's a lot of work happening from the rail network, but maybe it's more that those junctions unlock certain parts of the network, but you still need to haul for the different, like, track segments. I still think Death Stranding had some interesting work there"; verdict "not really sure still"). A lean, not a decision. It narrows "takes over from manual resource management" above: the rail does the bulk work and opens up the network, while laying track stays hands-on. To be tested next.
- **2026-11-02, towns grow, and you can see them** (owner: "making the town visible, as it's going to be a big payoff"; "other towns grow as well that we come across"). Home's town can be seen from the hub and the line, and other towns you reach grow too. The mainland metropolis still doesn't.
- **2026-11-02, the train is far faster than walking, and islands may be vastly far apart** (owner: "the train actually goes quite fast compared to walking ... the distances between islands are actually pretty vast. I do get that feeling in Death Stranding sometimes, and it was a cool payoff"). A direction to test, with no numbers yet ([find-the-fun.md](../plans/find-the-fun.md), step 7). Earlier scale notes (the next island about 200 m offshore, 20–45 s crossings) are starting points only. It has to live with "a ring's interior is never empty sea" above.
- **2026-11-02, a crossing starts at about a minute: 1.2 km at 20 m/s** (owner, `?proto=crossing`: "Default was pretty well balanced"). 4 km at 50 m/s was "definitely something cool" but "more like a novelty that would wear off and get annoying later in the game". 50 m/s over the same 1.2 km "felt a little too fast", and "maybe that makes more sense for the end game trains". So far apart, but not 4 km by default; the top speed belongs to the last eras.
- **2026-11-02, you can sit on the train** (owner: "be able to press X or square and have a sitting pose. That way I'm just not worried about falling off, even though it doesn't actually happen. It just feels more relaxing"). Interact sits you down on the deck. This brings back the seat from the cut bench variant, for the sake of the pose and of feeling safe; a side-on camera isn't part of it. Build it with the real train and the player's final animations.
- **2026-11-02, the venue plan is dropped** (owner: "Let's drop the venue plan"). The home previz maps are organised around six venues with benches and scoreboards. Keep their land; what stands on it comes from the rail loop (camps, towns, the frontier). Mini-games get their places in their own pass.
- **2026-11-02, working layout picks: Threefold Reach for home, Two-Bay Weave for the network** (owner, on the director's recommendations: "I like your recommendations"). Both from `.look/previz/` (`home-redesign`, `network-ring-chain`). They're working picks until a greybox backs them up, not final: the distance test above may rescale them. The town reserved on Threefold Reach's far east plateau has to move or be seen from the hub. Still open: whether the chain closes into a ring (the director recommends a last link straight from Home to the port you've seen since the start), and how big home gets.

- **2026-11-01, an archipelago, not one big open map.** Islands vary in size (home small and dense, later islands several times larger, the mainland port the one big walkable place). Reaching a new island is an era's payoff, telegraphed by seeing it across the water. Connections are physical (reclaimed land, bridges, causeways you can walk and drive), so late game reads as one connected place. Why: the 29 October playtest found a big island empty; the sea gives natural loading boundaries (architecture-fit, "A world bigger than one island").

- **Trains are ride-only and timetabled.** Their position is a pure function of the world tick, so they cost nothing on the network. You don't drive them.
- **Crates visibly ride the trains** to construction sites.
- **Construction shows both scaffolding and pieces appearing.**
- **2026-11-01, stops start with the pole sign** ("the poles looked fine to start with"); the plaque is dropped.
- **2026-11-01, only hub stations are fast travel** (owner, after the board playtest): fast travel is a jump between locations; other stops are reached by riding. Hubs get the big departures board and more signage; smaller stops get a minimal sign. The train could be faster too. Was "stations are the fast-travel board", see Changed.
- **Rails from the start.** The wood age lays light rails; there's no plank road.
- **The rail spike comes first,** and its job is to prove that riding feels good.

### Progress and rewards

- **2026-11-01, resource management stays light, never survival-craft** (owner). The hotbar stays for now, though he isn't sure about it; it may shrink to the few things that need it.
- **2026-11-01, resources will be harvested, not picked up** (direction, not built): wood comes from chopping trees and the like; what falls to the ground is collected with the magnet, perhaps differently per resource.
- **2026-11-01, the back bundle stays the way to haul** ("Default is quite good"). The magnet he loved moves to pickups elsewhere, later, and pulls without a button.
- **2026-11-01, double jump and glide are unlocks, not starting moves** ("abilities that should be unlocked later in the game"), for platforming and a sense of expanded movement.

- **2026-11-01, carrying is a simple back bundle** (haul playtest, solo). Logs sit on the character's back in a compact bundle that fills out rather than towering; no sway, and so no jump spill (nothing would warn you of it). Don't over-index on Death Stranding's carrying. Replaces the wobbly stack, see Changed.

- **"Play is the material"** is the long-term direction (round 2): playing produces what builds the island.
  - **For the slice:** no prize piles; venues give personal rewards only (round 7).
  - **Open:** how play feeds progress is left to the mini-games pass (below).
- **Three things you earn, none of them a shared wallet:**
  - **shared progress**, the island's;
  - **som**, a personal coin, earned only and spent on looks;
  - **knacks**, personal skill per activity, which unlock options and never power.
- **No sponsor plaques.** Work-site plaques credit contributions, but nobody pays for naming rights.
- **Kept from SETTLED:**
  - every system is ignorable;
  - mini-games never gate progress;
  - nothing decays;
  - the beach ball never produces income.

### Characters and story

- **2026-11-01, nail the bare hero base before outfits.** Clothes are separate swappable parts (`wear_<slot>_<item>`; slots head, body, hands, feet) and only need to prove the slots work until the base is right. On 2 November the owner chose a separate-head figure, proportioned closer to Ratchet or a Bricktron than lanky, and leans towards no mouth.
- **2026-11-02, the controls and motion are right on the mannequin; only the animation polish and the look remain.** The owner "really, really" likes how `?proto=hero` controls: today's direct controller (the modern-Mario one's inertia felt less in control), the closer camera, and hand-made clips (Quaternius's CC0 library) on a humanoid skeleton. Code-built figures and agent-authored run cycles didn't satisfy, and the quick test figures on these clips (cute, ears, stout, bib) didn't land either. Next: previz of properly modelled characters that can play these clips.
- **2026-11-01, the hero starts as a bare base** (owner): settle the base body's shape and proportions first; outfits are swappable parts (head, body, hands, feet) built on it.
- **2026-11-02, the Buddy is the one player figure:** the owner had the Tracklayer, the cute, ears, stout and bib looks, the robot, the code-animated hero and its model, and the modern-Mario controller (`?ctl=odyssey`) removed; the Buddy is now `?proto=hero`'s default, the plain mannequin stays behind `&body=mannequin` for comparison, and git history has the rest. The Tracklayer entries below are history.
- **2026-11-02, the Buddy's look, from the owner's review in the viewer:** no rim light. In idle it looks straight ahead, not down, so check the gaze whenever the head, face or clips change. Shoulders stay soft and round, not sharp. Hats read as a railway conductor's rather than a police officer's: a straight stiff drum and brass trim, not a flared navy crown.
- **2026-11-02, the player's direction is the Buddy** (`assets/src/buddy.py`, `?proto=hero&body=buddy`, `/character/`): a simple, smooth, slightly plump figure on the mannequin's clips, in the player's colour, with bead eyes and blush and no mouth, hair or clothes yet. The owner is "liking this a lot". Stock character kits were too complex, and full Meshy models fuse hair and clothes into one mesh. The Tracklayer below stays one fixed design, with no customization; whether it's still the player or a separate character is open.
- **2026-11-02, the player is the Tracklayer** (previz name "the Plumber's Cousin": `.look/previz/hero-options-3`, shot 2; renamed by the owner, with a railway cap and not red by default; replaces the open Bib Buddies/split question). A sculpted, skinned humanoid, about 3.5 heads tall, in the spirit of modern Mario as our own character: a big head, simple dark eyes and no mouth, railway engineer's cap, overalls over a tee, big gloves, chunky boots. It plays the hand-made clips on a humanoid skeleton. The owner chose it because it should scale best to customizable outfits and feel like a good character to be. The player's colour on the cap and overalls is the working assumption; not yet confirmed. Not built yet.
- **The Boogler is the mayor** (from era 2). His personal friendship ladder stays separate from the economy.
- **Opening days end each era:**
  - any player can start one (round 7);
  - everyone sees the same scripted ceremony;
  - physics props do the comedy.
- **Art:** a painted concept per era, then a building kit and a vehicle kit per era.

### Sound (listening-pack audit, 2026-11-01)

- **2026-11-01, the wave stays as it is until the owner has played it** (he first marked its sound "cut", then said he may have misread it; undecided).
- **2026-11-01, the synthesized groove loop is cut** (all five takes). The shared clock, mixer and stems loader can stay for the owner's own music later; no placeholder music plays.
- **2026-11-01, cut sounds** (silence them, keep the mechanics): wagon whistle and clacks, freight thumps, stoke roar and chuffs, all grind sounds, all soapbox sounds, opening-day call/bell/swap. Better sounds come later, from references.
- **2026-11-01, keep:** prompt pop, deny, haul count run (right direction), honk, all mini-game sounds (knock, pop ladder, fanfare, sad trombone, mushroom boing), the hut build, the board whoosh, the track machine.
- **2026-11-01, NPC voices:** Animal Crossing-style babble, a new sound as the text streams in, starting with The Boogler. A formant synth, not a recorded syllable bank, to keep it light ([research](../research/npc-babble-voices.md), `?proto=babble`).
- **2026-11-01, tweak, with references:** hotbar tick (single tone or none; Fortnite), the "it worked" thunk, plaque flap, ping and ball boing (more subtle), double-jump whoop (more subtle; Fortnite), pickup thock and the magnet burst (Ratchet & Clank bolts: a deep dive), the haul count (towards Ratchet & Clank), the wood-age ambience (less white noise, more chill; go deeper).
- **2026-11-01, honks form chords on their own:** a honk isn't always the same note; players' honks should land as a chord together.

### Look

- **2026-11-02, the look to aim for is the crossing previz, shots 2, 3 and 5, especially 2** (owner: "Especially 2, because it reminds me of Mario Sunshine and how beautiful it is"). Images and how each effect would be built: `.look/previz/crossing-beauty/` (gitignored, in the main checkout on the owner's Mac). Shot 2 is the everyday look; shots 3 (golden hour) and 5 (dusk arrival) are moods it passes through. These are paintings, so they set a target, not a promise: the real renderer has to prove it, on an M4 iPad Pro.
- **2026-11-02, the world has to get a lot more beautiful** (owner, after the crossing: "we'll need to mess around with the rendering settings and just try and make the world a lot more beautiful in the future"). A direction for later, not a pick; "okay for now" below still holds until then.
- **2026-11-01, the current look is okay for now** ("pretty good … we may want to iterate a little more"). No more look work until there's a reason.
- **2026-11-01, title and loading art is a generated, rendered image with a small animated accent,** not a screen of flat vector or CSS art (owner, on the low-poly SVG scenes: "I really dont like this aesthetic"; "the whole screen doesn't have to animate"). Show candidates placed in the real screen before building scenes in code.
- **2026-11-01, the graphics target is the look lab's "high" preset** (he liked it best), to be compared with the toybox look from the owner's character session; the lab's own toybox preset is "just ok".
- **2026-11-01, the UI that answers leaves the prototype for the game** ("a massive improvement").

- **2026-11-01, night stays light, moonlit** (owner: "night mode feels too dark, it should feel light still maybe moonlit"). A cool, bright moonlight you can play by, not darkness. **The sun and moon lose their faces** (owner: "they can be a bit more real").

### Controls

- **2026-11-01, Interact moves to X / Square** (the west face button; owner, iPad playtest with a controller: "I want to use X/Square and it prompts me B for a lot of things"). B becomes back/cancel. Dialogue with The Boogler gets a controller pass designed to scale to every NPC.

- **2026-11-01, no petting The Boogler** (owner: "not in the nature of the Boogler"). The △ pat added in the controller pass is rolled back. Talk hints: ✕ Next while text plays, ✕ Answer only when there are choices, ○ Leave; □ does nothing in a talk.

- **2026-11-01, no contribution-tier labels on the player** (owner: the "Porter" tag under his character "shouldn't be the case"). Tiers stay as data; nothing shows them until rewards are designed.
- **2026-11-01, first visit and returning visit are different** (owner): the name-and-colour card shows on a player's first visit only; a returning player goes straight in, with their identity kept and editable from the pause view, and a light welcome back that shows what changed. Built for persistent progress and more UI later.

### Process

- **2026-11-02, entities have methods** (owner). `update()` and friends on the entity, Unity's shape, over the research's timing rows per kind ([entity-architecture.md](../research/entity-architecture.md)). A second slot in a phase means a second kind. The entity loop gets a few unit tests, an exception to the test diet.
- **2026-11-02, no automatic rollback yet** (owner: "we're not a live service yet"). Live smoke opens an issue and a person or agent fixes forward. Revisit before public playtests.
- **2026-11-01, migrate to game entities now, ahead of the slice** (owner: "I think we're in trouble here if we don't make this organizational change now"; "we're basically building a headless engine for agentic coding"; no level editor, because levels are made agentically). Strict compiler flags are on. Gameplay objects, the camera and UI move to a `GameEntity` shape with a shared lifecycle, and simulation, presentation and infrastructure get lint-enforced boundaries: [entity-architecture.md](../plans/entity-architecture.md). Engine services stay as systems on `onFrame`, as in Unity, Unreal and Godot. Prototypes get the flag fixes and become entities only when promoted. Overrides "no foundation work before the slice" in [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md); still no ECS.

- **2026-11-01, start the asset pipeline now** (owner), ahead of the first authored model: glTF with meshopt or Draco geometry and KTX2 (Basis Universal) textures, ready for Blender (and Blender MCP) to feed it, including animated construction (scaffolding, pieces). Code stays the default where code is quicker or better; the split is written in [asset-pipeline.md](../plans/asset-pipeline.md). Was "when the first authored model lands" (architecture-fit, phase 5), see Changed.

- **2026-11-01, don't over-index on the iPad** (owner). Desktop and iPad both matter; the iPad is one target among others, not the design constraint. Keep it working well, but don't make iPad-specific compromises unless something is clearly too heavy everywhere.
- **2026-11-01, the lowest target device is an M4 iPad Pro** (owner: "likely"). Replaces the 2021 iPad and mid-range Android phone in [architecture.md](../plans/architecture.md)'s assumptions. The visual quality target is set by a code-only graphics spike measured against it (find-the-fun.md, "Depth tracks").

- **2026-11-01, one playtest path, verdicts sent to the server** (owner: "I don't think I need to press and sort of reload the game every time I want to try something"; "yes" to sending verdicts). `boogle.club/?play` puts every prototype that can share the island on one island, with the world-changing ones as chapters; variants switch live where they're Local, and the prototype bar plays the Start-here list with Next and Prev. A verdict and its one-line note go to the game server's report log (kind `playtest`) as well as staying in the browser; the director reads them with `npm run verdicts` and logs them in playtests.md, so the owner never pastes. Copy all stays as a fallback.
- **2026-11-01, playtests are solo-first.** Each find-the-fun question must be answerable by one person; multiplayer comes after. (Replaces "playtest with 2–4 people", see Changed.)
- **2026-11-01, a lighter test load.** `npm run ship` no longer runs smoke on the Mac by default (`-- --gpu` opts in); smoke runs against the live site after each deploy and nightly. New tests only for lockstep code; features and feel get looked at, not tested. `perf` only for heavy rendering changes.
- **2026-11-01, level previz looks like what we'd build** (owner: "it's hard to get a real feel with that visual style"; "use something that's closer to what we might eventually build"). Use real renderer captures, or image generation matched to them, not painted maps.
- **2026-11-01, agents check their own work.** Implementers (Opus, medium effort) look at their own `/look` stills, gut-check, iterate up to three rounds and ship themselves (AGENTS.md, "See it before you ship").
- **2026-11-01, build prototypes in parallel, playtest in order.** Prototypes are built side by side; their questions are still answered in order, and a "no" on hauling still reshapes what follows.

- **2026-11-01, the RC-car soapbox stays** ("pretty fun"; was "one more try, then cut"). Races with these carts are an idea for later (ideas.md). Not being able to drive on at the bottom of the hill felt like a possible miss, so the next version lets you keep driving.
- **2026-11-01, mini-games:** topple is retired ("not particularly engaging"); hop leads (platforming as a mini-game); golf stays wanted (he and his friends love mini golf) but needs a real design in the mini-games pass.
- **2026-11-01, the era question waits for depth** ("the world should look beautiful at each age … not enough depth to tell meaningfully"). It's asked again once eras 1–2 have real level design.
- **Next deliverable:** the vertical slice for eras 1–2, built on the 0.1 haul loop.
- **Mini-games get their own design pass later.** Court ball and the other venues wait for it.

## Changed

- **2026-11-02:** "eight eras at 1–3 evenings each" became "closer to 8 hours, starting with fewer eras": the owner wants to limit how many assets the game needs.
- **2026-11-01:** "riding must be more than standing on a moving platform" became "the wagon is transportation": after trying the research's variants, the owner doesn't want extra verbs on the ride.
- **2026-11-01:** "stations are the fast-travel board" became "only hub stations are fast travel", after the board playtest: every stop being a jump would make riding pointless.
- **2026-11-01:** the synthesized groove loop was cut after the listening pack.
- **2026-11-01:** "Playtest constantly with 2–4 real people" (DESIGN.md, How we work) became "solo first": the owner wants each prototype to work for one person before building out.
- **2026-11-01:** the haul stack's sway and jump spill (0.1 groundwork) were cut after the first solo haul playtest: the owner wants a plain back bundle.
- **2026-11-01:** the asset pipeline moved from "when the first authored model lands" to now, so Blender work can start as soon as a look is picked.
- **2026-11-01:** implementers moved from Sonnet to Opus at medium effort.

## Parked by the owner

- **The fourth melon:** the reveal, and whether to keep melons at all ([fourth-melon.md](fourth-melon.md)). Waiting on collaborators.
- **The ending.**
- **All narrative detail** until the core loop is fun.

## Open questions (round 8 and the architecture review)

1. Keep the short bell countdown before opening day (about 10 s)? Research recommends a ~45 s gathering call (smoke column, a bell that carries; ends early once everyone online is at the platform; solo goes straight to the bell) followed by the 10 s bell ([shared-moments-and-events.md](../research/shared-moments-and-events.md), rec 1). Being tried in the era prototype's round 2.
2. When does the mini-games design pass happen?
3. Apply the proposed re-ordering of [architecture.md](../plans/architecture.md) from [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md)?
4. ~~Who runs the baseline on a 2021 iPad and a mid-range Android phone?~~ Now the M4 iPad Pro (Decided, 1 November). Do phones stay supported at a lower quality, or drop?
5. Should [net-roadmap.md](../plans/net-roadmap.md) get a note that Boogle 2.0 replaces its creature-and-survival framing?
6. ~~Island layout~~ started 1 November as the layout lab ([island-layout.md](island-layout.md), once it exists).
7. A character look track alongside the prototypes (concept art, then Blender modelling and rigging of the player and The Boogler), kept off the game until a look is picked? (Proposed 1 November; see find-the-fun.md, "Depth tracks".)

8. ~~Wagon show and bench: cut, or keep?~~ Cut (Decided, 2 November); the wagon is plain transportation.
9. ~~Next deliverable~~ Prototype the rail loop first (2 November; find-the-fun.md, steps 6 and 7). The eras 1–2 slice and the home redesign get planned together once it answers, and the slice is built after the entity plan's steps 10–12 ([entity-architecture.md](../plans/entity-architecture.md)).
10. ~~Game length~~ Closer to 8 hours, with fewer eras (Decided, 2 November).
11. What happens to hauling once the rail delivers? The back bundle got a yes, and after `?proto=net` the owner leans towards still hauling for each track segment (Decided, 2 November). Open: how the network makes that hauling easier, for example a depot near the railhead.
12. Does "play is the material" still hold? In the rail loop the network produces material and play earns personal rewards, which would also settle how mini-games feed progress. Adopting it reverses round 2.
13. How do you first reach a far island? "Walk it before the rail does" works on land, but a vast sea needs the line itself to get there first, or a boat.
14. Which eras remain? Working list of six, not final: wood, steam, iron and harbour, diesel and concrete (owner: "I did really like the aesthetic there", "I'm not sure"), electric as bullet trains with pantographs and overhead wires, and a last age of "future train, bullet train", which "doesn't have to be actually an exact monorail".

## Next: find the fun (agreed direction, 1 November)

Prototype mechanics only, in this order. Build order and PRs: [find-the-fun.md](../plans/find-the-fun.md). Each step goes behind a `?proto=` flag, gets a `/look` motion sheet, and asks one playtest question. If the answer is no twice, change it or cut it instead of adding rewards.

1. **Is hauling fun as a toy?**
   - This is already built, so it needs a playtest before any code.
   - Ask: does carrying a wobbly stack feel good with no goal? Does a rail section feel like effort or a chore?
   - Tune the sway, the spill, the pour speed and the 60-log cost.
   - If hauling is a chore, test a different core loop before building trains on it.
2. **Is riding fun?** This is the rail spike.
   - Its first task is platform carry for the player on a kinematic wagon.
   - Ask: does anyone ride twice for no reason?
3. **Does what you built feel like yours?**
   - The wagon runs only on laid sections, so every section extends the ride.
   - Ask: is the 50 s laying run satisfying or dead time?
4. **Does the island change enough at an era's end?**
   - A greybox swap: blocks change and the wagon starts running. No ceremony.
5. **Is driving a vehicle fun?** The soapbox cart.

The mayor, era props, hats, gags, the ceremony and painted art all wait until these pass.
