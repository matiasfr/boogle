# Creature AI and ecosystems for Boogle

Scope: lightweight creature AI and living ecosystems for a small co-op browser sandbox (boids, utility/needs AI, predator/prey, reactions to players/water/weather/time, taming), how to keep it cheap and deterministic where shared, and fit with Boogle. Several GDC Vault pages were in maintenance (redirected to gdconf.com/gdc-vault-maintenance) so some talks rest on reputable secondary coverage; flagged where relevant. Game AI Pro chapters were read in full from the free PDFs.

## Q1. Which movement models (boids, steering) suit schools, flocks and scuttlers, and what do they cost?

### Takeaway
Reynolds' boids (three local rules within a limited neighbourhood) and his 1999 steering behaviours (wander, flee, evade, arrival, containment) are still the cheapest believable motion for groups; the naive O(n²) neighbour search must be replaced by a spatial grid for more than a few hundred agents, and for individually watched critters context steering avoids the classic "behaviours cancel out" stall.

### Cited Findings
- Boids use three rules: separation (avoid crowding local flockmates), alignment (steer toward their average heading), cohesion (steer toward their average position). Model built 1986, published SIGGRAPH '87 "Flocks, Herds, and Schools: A Distributed Behavioral Model". — [Reynolds, Boids](https://www.red3d.com/cwr/boids/)
- Each boid reacts only to flockmates inside a neighbourhood defined by a distance and an angle from its heading; others are ignored. — [Reynolds, Boids](https://www.red3d.com/cwr/boids/)
- Early boids also had predictive obstacle avoidance and an optional low-priority goal-seeking behaviour to follow a scripted path. — [Reynolds, Boids](https://www.red3d.com/cwr/boids/)
- The straightforward algorithm is O(n²); a spatial data structure keeping boids sorted by location makes it nearly O(n). — [Reynolds, Boids](https://www.red3d.com/cwr/boids/)
- Reynolds' GDC 1999 paper lists seek, flee, pursuit, evasion, wander, arrival, obstacle avoidance, containment, flow field following, leader following and unaligned collision avoidance, organised in a three-layer hierarchy: action selection → steering → locomotion. — [Reynolds, Steering Behaviors for Autonomous Characters (GDC 1999)](https://www.red3d.com/cwr/steer/gdc99/)
- Wander keeps the previous steering direction and adds a small random displacement each frame, constrained to a sphere ahead of the character, giving smooth sustained turns rather than jitter. — [Reynolds GDC 1999](https://www.red3d.com/cwr/steer/gdc99/)
- Andrew Fray: blended steering vectors can cancel (chase + avoid averaging to near zero); fixes like weights, priorities or making chase obstacle-aware add tuning parameters and coupling. — [Fray, Context Steering, Game AI Pro 2 ch.18](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf)
- Context steering: each behaviour writes into a small array of heading "slots" — an interest map and a danger map — that are merged before choosing a heading; behaviours are small and stateless. Replacing steering behaviours with it on F1 2011 shrank the codebase by 4000 lines while improving avoidance. — [Fray, Game AI Pro 2 ch.18](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf)
- Fray says steering behaviours become a problem specifically "when the player can pick out and watch individual entities". — [Fray, Game AI Pro 2 ch.18](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf)
- three.js's official GPGPU birds example runs 1,024 birds (WIDTH = 32, one texel each) with positions/velocities in float textures; the velocity shader applies separation/alignment/cohesion by distance zones, flees a predator point within preyRadius 150 (and raises its speed limit), pulls toward the origin, clamps speed; it loops over every bird (all-pairs). Wing flap is driven by a phase stored in the position texture's w. — [three.js webgl_gpgpu_birds.html](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_birds.html)

### Inferences
- For Boogle-scale groups (tens to low hundreds of fish/gulls), CPU boids with a uniform grid keyed on Boogle's existing cell grid are enough; GPGPU is overkill and adds a float-texture dependency.
- Fish schools and gull flocks are classic boids; crabs and a Boogler-like creature are individually watched, so context steering (8–16 slots) is the better fit there.
- The "predator point" in the three.js example maps directly onto "the ball/the player is the predator" — scatter on approach.

### Gaps
- No Game AI Pro chapter specifically on flocking was found; Reynolds remains the primary source.

## Q2. How should a creature decide what to do? (utility/needs AI, schedules, control loops, modular relationships)

### Takeaway
Utility AI (normalised 0–1 considerations through response curves, multiplied, with inertia/cooldowns and priority buckets) is the standard for needs-driven critters; for many background critters, time-of-day schedules beat hidden needs because players can read them; Rain World shows that a few reusable modules plus a relationship table produce an ecosystem.

### Cited Findings
- Utility scores are normalised to 0–1 so they combine easily; response curves (linear, quadratic, logistic, piecewise linear) shape input→score. The Sims uses hand-tuned piecewise-linear curves, e.g. hunger ignored until a threshold then rising sharply. — [Graham, An Introduction to Utility Theory, Game AI Pro ch.9](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf)
- Always picking the top score can feel "very robotic"; alternatives are weighted random over the top N or within ~10% of the best. — [Graham, Game AI Pro ch.9](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf)
- Bucketing ("dual utility", Dill): higher-priority buckets are always considered first, e.g. a starving Sim does not score Fun actions. — [Graham, Game AI Pro ch.9](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf); [Dill, Dual-Utility Reasoning, Game AI Pro 2 ch.3](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf)
- Inertia: deciding every frame causes oscillation between similarly scored actions; fixes are a bonus for the current action, cooldowns, or only deciding when the current action finishes (The Sims Medieval decided only when the interaction queue was empty). — [Graham, Game AI Pro ch.9](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter09_An_Introduction_to_Utility_Theory.pdf)
- Mike Lewis (Infinite Axis Utility System): each consideration maps an input onto [0,1] via "bookends" (e.g. 0–100 m), through a response curve; consideration scores are multiplied. "Runtime" and "cooldown" considerations limit repetition and duration. — [Lewis, Choosing Effective Utility-Based Considerations, Game AI Pro 3 ch.13](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf)
- Dave Mark presented the "infinite axis" utility system at GDC 2013 ("Architecture Tricks: Managing Behaviors in Time, Space, and Depth") and with Mike Lewis at GDC 2015 for Guild Wars 2; sources differ on its debut date. — [GDC Vault listing](https://www.gdcvault.com/play/1018040/Architecture-Tricks-Managing-Behaviors); [Wikipedia, Utility system](https://en.wikipedia.org/wiki/Utility_system)
- Project Highrise (1000 NPCs at 60 FPS): planner replaced by daily routine scripts (time blocks + probabilistic one-shots). They removed hunger/tiredness models because internal state was "hidden information" that confused designer and player; "the utility of detailed NPC representation is inversely proportional to the number of NPCs". — [Zubek, 1000 NPCs at 60 FPS, Game AI Pro 3 ch.34](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- Background characters: looping idles and random walks look stale (NES/SNES-era); deep AI for background critters is usually a mistake; a schedule (input = time, output = "go here and run this animation") is cheap, data-driven and scalable; used on The Sims Medieval. — [Graham, Breathing Life into Your Background Characters, Game AI Pro ch.36](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter36_Breathing_Life_into_Your_Background_Characters.pdf)
- Michael Ramsey (World of Zoo): animals implemented with negative-feedback control loops (reference signal vs perceived signal → error → behaviour), so purposeful behaviour adapts when players rearrange the environment and "actively try to mess with them". — [Ramsey, A Control-Based Architecture for Animal Behavior, Game AI Pro ch.44](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter44_A_Control-Based_Architecture_for_Animal_Behavior.pdf)
- Rain World: each creature has a relationship table to other creatures, objects and places; behaviour comes from optional modules (PreyTracker, ThreatTracker, FriendTracker, ItemTracker, DenFinder, DiscomfortTracker); notable interactions are not scripted. A "room attractiveness" tool gives creatures preferred areas. — [Unity blog, Exploring procedural design in Rain World: The Watcher](https://unity.com/blog/exploring-procedural-design-rain-world)
- Rain World creatures are built around their own survival needs (food, returning home before night) rather than as obstacles; they have no fixed patrol routes; designers shaped behaviour mainly through level layout; too many restrictions would turn it into "a basic platformer". — [Game Developer, Crafting the complex, chaotic ecosystem of Rain World](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)
- Rain World creatures keep living off screen ("outside of your frame they're all still alive"). — [Game Developer](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)
- Rain World's creature animation is procedural: limbs are defined and the creature told how to use them, rather than an animation sheet (secondary, Steam community). — [Steam discussion](https://steamcommunity.com/app/312520/discussions/0/3761103414979115659); slugcat body = two spherical chunks at fixed distance, limbs/tail cosmetic — [Unity blog](https://unity.com/blog/exploring-procedural-design-rain-world)
- Slime Rancher (Popovich, GDC 2017): slimes are "driven by a series of wants and needs" creating "hundreds of tiny, emergent stories"; the system is simple. — [GDC Vault session listing (via search)](https://gdcvault.com/play/1024296/A-Thousand-Tiny-Tales-Emergent); [Game Developer coverage](https://www.gamedeveloper.com/design/the-unique-power-of-emergent-storytelling)
- Slime Rancher fan wiki (under construction, treat cautiously): hunger is hidden but shown via facial expression; eating lowers agitation; agitated slimes do negative behaviours more often. Reviews note slimes' built-in drive to stack and swarm food. — [Slime Rancher Wiki, Hunger](https://slimerancher.fandom.com/wiki/Hunger)
- Limbless slimes were partly a response to the team's limited animation skills. — [Game Developer, constraints video](https://gamedeveloper.com/design/video-how-i-slime-rancher-i-devs-used-constraints-to-aid-in-design)

### Inferences
- The Boogler's current brain (idle → pick random reachable target → walk → wait) is exactly the "random walk" that Graham calls stale; a small utility layer reading sky-clock time, ball distance, nearby players and water depth, with inertia, would give him readable moods.
- Needs must be visible (Slime Rancher's face; Highrise's lesson about hidden state) — any hunger/sleepiness should show on the creature.
- Rain World's module+relationship-table structure maps to a tiny data table per species in Boogle (fears: ball, player; likes: wet sand, mushrooms; den: burrow).

### Gaps
- Could not access GDC Vault (maintenance) for the Slime Rancher talk or Rain World talk recordings; specific rules of slime AI unconfirmed beyond the fan wiki.
- No reliable source found on Breath of the Wild animal/creature AI; the GDC 2017 "Change and Constant" panel covered the chemistry engine (elements change materials' state) — [GamesBeat](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/) — but not animals. One site making claims about BotW enemy awareness had no credible attribution and was discarded.

## Q3. Reacting to time of day, weather, water; predator/prey and population dynamics

### Takeaway
Spawn tables keyed to time, weather and habitat (Animal Crossing) are the cheapest way to make the world feel alive and give returning players something new; true Lotka–Volterra population dynamics oscillate and are fragile, so stabilisers (refuges, apex/shared predator, floors) are needed if used at all.

### Cited Findings
- Animal Crossing: New Horizons fish availability depends on time windows (e.g. 9 AM–4 PM, 9 PM–4 AM, 4 PM–9 AM), location habitats (pond, river, clifftop, river mouth, sea, pier), month, and weather (coelacanth appears only in rain); shadow size telegraphs the species class; some species gated behind total catches (e.g. 100 for coelacanth). — [Nookipedia, Fish (New Horizons)](https://nookipedia.com/wiki/Fish/New_Horizons)
- The Reef game uses Lotka–Volterra equations (prey birth rate, predator death rate, interaction rate, conversion rate) and shows how hard keeping both species alive is. — [The Reef on itch.io](https://jakemchugh1.itch.io/the-reef)
- Classical Lotka–Volterra yields closed orbits whose amplitude depends on starting conditions (no single stable cycle). — search summary citing McGill hyperbook; not directly fetched (treat as textbook fact).
- Refuges (prey/predators opting out of interaction) in extended LV models matched observed mite populations. — [Maastricht CRIS, Lotka–Volterra game with refuges](https://cris.maastrichtuniversity.nl/en/publications/joining-or-opting-out-of-a-lotka-volterra-game-between-predators-/)
- A shared predator can stabilise two competing species. — [Cheon e-lecture, Evolutionary Games and Ecosystems](https://www.mech.kochi-tech.ac.jp/cheon/ecogame/ecolo-game06a_e.html)
- Rain World food is scarce; eating heavily one day leaves less for the next — population as player-facing pressure. — [Game Developer](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)
- Rain World's balance depended heavily on randomness of placement; streamers' first experiences varied widely. — [Game Developer](https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)

### Inferences
- For a cosy co-op toy (DESIGN.md: only the world is the antagonist, toys before chores), boom-bust population collapse is a chore and a loss state. Prefer "habitat-driven spawn tables" (crabs at night/low tide on wet sand, fish wherever players dig a pond deep enough) over simulated food chains.
- A player-dug pond that attracts fish is a strong "leave something for the next visitor" hook: the habitat persists in the shared water/terrain state; creatures are derived from it.

### Gaps
- No primary game-design postmortem found on an ecosystem collapse in a co-op sandbox.

## Q4. Keeping it cheap: instancing, vertex-shader animation, AI LOD

### Takeaway
Draw each species as one InstancedMesh with motion in the vertex shader (sin waves along the body, per-instance phase); update AI at a lower rate or for fewer agents when far away; schedule-driven critters are nearly free.

### Cited Findings
- three.js InstancedMesh renders many objects sharing geometry/material with different transforms in one draw, via setMatrixAt/setColorAt + instanceMatrix.needsUpdate; call computeBoundingSphere() after moving instances or frustum culling may wrongly hide them. — [three.js docs, InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
- Godot's "animating thousands of fish": bones animate on the CPU so thousands are impractical; vertex animation in the shader instead uses four cosine components (side-to-side, pivot, a wave travelling down the body, twist), masked by body position so the head stays still, with per-instance random phase and speed (50–150%). Claims "thousands of animated objects, even on low end hardware". — [Godot docs, Animating thousands of fish](https://docs.godotengine.org/en/3.1/tutorials/3d/vertex_animation/animating_thousands_of_fish.html)
- three.js GPGPU birds flaps wings in the vertex shader from a phase value (sin(phase)·5 on two vertices). — [three.js webgl_gpgpu_birds](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_birds.html)
- AI LOD: programmers commonly use cheaper locomotion beyond ~10 m, lower update rates off-view, or delete far characters; Sunshine-Hill's LOD Trader treats LOD as a budgeted trade based on how likely a player is to notice. — [Sunshine-Hill, LOD Trader, Game AI Pro ch.14](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter14_Phenomenal_AI_Level-of-Detail_Control_with_the_LOD_Trader.pdf)
- Project Highrise hit 1000 NPCs at 60 FPS largely by choosing stereotyped routine scripts over planning/needs. — [Zubek, Game AI Pro 3 ch.34](http://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter34_1000_NPCs_at_60_FPS.pdf)
- Background AI must be cheap in memory, CPU and dev time and scale both ways as content is cut. — [Graham, Game AI Pro ch.36](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter36_Breathing_Life_into_Your_Background_Characters.pdf)

### Inferences
- In Boogle, one InstancedMesh per species (fish, gulls, crabs) adds ~3 draw calls total; recent commits ("Draw each mushroom's spots as one mesh", "Use a coarser sea mesh", "Trim small rendering costs") show the team is draw-call and cost sensitive, so instancing is mandatory.
- Ticking cosmetic critters only within ~30 m of the local camera, and at a reduced rate beyond, matches the LOD idea.

### Gaps
- No measured numbers for three.js InstancedMesh fish counts on mobile/iPad (Boogle supports Backbone on iPhone/iPad); would need `npm run look`/perf measurement in Boogle.

## Q5. Determinism and authority: host-simulated vs cosmetic local critters

### Takeaway
Floats are not reliably deterministic across machines, so any creature that changes shared state must live in the integer sim; everything else should be cosmetic-local or host-published in presence like the Boogler. A useful middle tier: spawn schedule as a pure function of tick+seed (shared), motion cosmetic (local).

### Cited Findings
- Cross-machine float determinism only holds with the same executable/compiler/architecture and careful settings; transcendental functions (sin/cos) diverged between AMD and Intel in Battlezone 2. — [Glenn Fiedler, Floating Point Determinism](https://gafferongames.com/post/floating_point_determinism/)
- Boogle DESIGN.md: shared things (water, terrain, crops, weather, tide) must be bit-identical (integers, fixed tick, seeded mulberry32, events as pure function of tick+seed); cosmetic effects may use floats and don't need to match. — Boogle `DESIGN.md` (local file)
- Boogle authority table: the Boogler is host-simulated and published in the host's presence. — Boogle `DESIGN.md`; `src/boogler/boogler.js` header: host publishes `g: { p:[x,z], r, w }`, others interpolate; he never changes terrain/water/crops so his brain may use floats but uses seeded RNG; solo tabs and clients without a host snapshot for 3 s (STALE_MS) walk him locally; kinematic physics body so the ball bounces off him; avoids the mushroom patch so he never looks like he's trampling the garden.
- Boogle world contract: sim ticks at 10/s (TICK_MS 100); `registerOp`/`registerState`/`onTick`/`onApplied`; edits applied in host sequence order; state needs serialize/load/hash. — Boogle `src/world/README.md`
- Recent Boogle commit "Ban native trig in the deterministic shared sim" — consistent with Fiedler's transcendental-function warning. — Boogle git log (local)
- Boogle's sky clock is a pure function of world.tick (DAY_MS 20 min, 8-day lunar cycle, DAYLIGHT 0.6). — Boogle `src/sim/sky-clock.js`

### Inferences
- Four tiers for Boogle critters: (1) cosmetic local (fish, gulls, fireflies); (2) shared seeded spawn schedule + local motion (crabs emerge from the same burrow at the same tick for everyone, so "look, a crab!" works); (3) host-simulated + presence (Boogler, a giant crab event, ≤ a handful); (4) integer sim state via registerState (only for things that change the world or persist, e.g. pet affinity counters, a creature that drops seeds).
- Pets could be owner-simulated and published in the owner's presence, mirroring "your player's movement → you".

### Gaps
- No public measurement of PeerJS presence bandwidth per extra entity in Boogle; needs `?netdebug=1` measurement.

## Q6. Taming and companion loops

### Takeaway
Successful taming loops are tiny: offer the right item, get probabilistic success with clear feedback, and the creature then follows you; it is personal ownership on a shared island, which fits Boogle's "communal world, personal rewards".

### Cited Findings
- Minecraft: wolves tamed with bones (each bone 1/3 chance), cats with raw cod/salmon, parrots with seeds, horses by repeated mounting; tamed wolves/cats/parrots follow unless told to sit; parrots ride the shoulder and mimic sounds. — [Minecraft Wiki, Taming](https://minecraft.wiki/w/Taming); [Minecraft Wiki, Wolf](https://minecraft.wiki/w/Wolf)
- Tamed wolves teleport to the owner beyond 12 blocks (16 if targeting something), but not while the owner is airborne/swimming/in a boat; tamed wolf gets a red collar. — [Minecraft Wiki, Wolf](https://minecraft.wiki/w/Wolf)
- Slime Rancher: feeding lowers agitation and keeps slimes from negative behaviour — feeding as the core care verb. — [Slime Rancher Wiki, Hunger](https://slimerancher.fandom.com/wiki/Hunger)
- Boogle DESIGN.md principle 6: anything earned (cosmetics, ball skins, hats) is personal; island and garden are communal. — Boogle `DESIGN.md`

### Inferences
- In Boogle the "food" should be an existing toy: a mushroom cap, a splash of water, or a bounce of the ball — so taming gives the ball more to do (principle 2).
- Teleport-to-owner (Minecraft) solves pets getting stuck on terrain a player dug.

### Gaps
- Could not find a primary design write-up on companion loops in co-op cosy games (e.g. A Short Hike, Ooblets) within budget.
