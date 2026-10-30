# Emergent / systemic mechanics on simulated environments (for Boogle)

Scope note: Boogle already has a 2.5D integer column water sim (0-255 units per cell, active-cell lists), host-stamped terrain edits, mushrooms in `src/sim/mushrooms.js`, a planned telegraphed tide, and DESIGN.md principles "Toys before chores", "Only the world is the antagonist", "Telegraph everything", "Slapstick over precision" and "Determinism from day one". The earlier research doc `docs/research/water-farming-multiplayer.md` already covers Townscaper/Animal Crossing/Timberborn-style farming and sync basics; these notes focus on systemic/emergent mechanics layered on top. Search budget was ~16 tool calls; several primary talks (GDC Vault videos) were gated, so some claims rest on reputable secondary write-ups, flagged where relevant.

## Which systemic interactions create the most emergent "stories" among friends? (with the mechanic catalog)

### Takeaway
The games that generate stories (Noita, BotW, From Dust, Dwarf Fortress, Powder Toy/Sandspiel) all use a small number of local, legible rules applied uniformly everywhere, with no special cases; stories come from players predicting an outcome with physical intuition and being surprised by a chain reaction. For a friends' sandbox, the best story generators are chain reactions that cross systems (fire to steam, water to mud to collapse, storm to lightning to fire) and that someone else can witness.

### Cited Findings
- Noita: "every pixel follows simple local rules"; Purho says that "when you combine them together you get surprising and unexpected results." Liquids try down, then left/right, swapping by density; gases are inverted liquids. — [80.lv interview with Petri Purho](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- Noita fire: burning pixels pick a random direction and try to ignite a neighbour; oil spreads fire, water stops it, fire on water makes steam; wood burns for a set time then disappears; big explosions convert "good candidate" static material (stone) into falling sand-like material; destroyed rigid-body pixels cause the body to be recomputed and possibly split. — [80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- Noita's GDC 2019 talk "Exploring the Tech and Design of Noita" (Independent Games Summit) covers scaling falling sand to big worlds, destructible rigid bodies and tuning emergent gameplay (recording linked from community at youtube.com/watch?v=prXuyMCgbTc). — [GDC Vault](https://gdcvault.com/play/1025695/Exploring-the-Tech-and-Design); [Game Developer write-up](https://gamedeveloper.com/design/video-understanding-the-remarkable-tech-and-design-of-i-noita-i-)
- BotW "chemistry engine" (GDC 2017, "Change and Constant: Breaking Conventions with The Legend of Zelda: Breath of the Wild", Fujibayashi/Dohta/Takizawa): the world is split into *elements* (fire, water, ice, wind, electricity) and *materials* (trees, rocks, characters, weapons); the chemistry engine governs state changes, physics governs motion. Three rules: elements change materials' state; elements change each other's state; materials don't change each other directly. (Exact wording varies between secondary summaries.) — [GamesBeat](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/); [Thumbsticks GDC 17 report](https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies); [fan breakdown](https://saschb2b.github.io/game-mechanics/games/zelda-botw/chemistry-engine)
- From Dust (Eric Chahi, Ubisoft): the Galileo simulator (GDC Europe 2010, "Creating a High-Performance Simulation: A Dynamic Natural World to Play With", Chahi and Ronan Bel) simulated flowing water, lava, erosion, sedimentation and vegetation in real time; SIMD and fully multithreaded. — [GDC Vault session](https://gdcvault.com/play/1013667/Creating-a-High-Performance-Simulation); [Engadget](https://www.engadget.com/2010-08-17-how-project-dusts-world-building-world-was-built.html)
- Chahi: the team avoided special-case code and relied on a few simple rules; "A simulation is cool, but it must be enjoyable to the player"; before direct interaction the sim "was like something in the background." — [Game Developer, "The Core of From Dust"](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-); [Game Developer GDC Europe report](https://gamedeveloper.com/design/gdc-europe-eric-chahi-talks-convergence-of-technology-and-design-in-i-project-dust-i-)
- Dwarf Fortress: no preset storyline; system interactions generate the "stories" (e.g., the Boatmurdered succession game, where each player ran one in-game year, discussed in a GDC 2010 narrative review). — [IF50 overview](https://if50.substack.com/p/2006-dwarf-fortress); [GDC 2010 slides](https://media.gdcvault.com/gdc2010/GNR/Andy%20Kim_2010.pdf)
- Tarn Adams' test for adding a simulation: he wants to see a little narrative form after playing through it himself. — [PC Gamer](https://www.pcgamer.com/gaming-industry/game-development/dwarf-fortress-creator-says-we-have-a-natural-lean-towards-human-made-stories-but-but-were-all-going-to-be-very-sorely-tested-in-the-coming-years-by-ai/)
- Sandspiel (browser falling sand, Rust/wasm + WebGL): low-fidelity pixels invite imagination; players predict outcomes with physical intuition, project stories on particles, and build scenarios like volcanic islands; >70,000 creations uploaded, strong remix culture; most players treat it as a paint program. — [Max Bittker, "Making Sandspiel"](https://maxbittker.com/making-sandspiel)
- Townscaper: by Stålberg's own description more toy than game, no explicit objectives; buildings assembled with wave function collapse. — [Game Developer, "How Townscaper Works"](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making); [MCV/Develop](https://www.mcvuk.com/business-news/when-we-made-townscaper/)
- Teardown syncs destruction in multiplayer by determinism, not voxel data ("it's simply too much data"); the server sends destruction commands that clients apply "in exactly the same way and order on all machines"; physics uses state sync. — [80.lv, Teardown multiplayer tech](https://80.lv/articles/teardown-developer-breaks-down-multiplayer-and-voxel-destruction-tech)

### Inferences

#### Mechanic catalog (14 mechanics)
Effort tags: **[night]** = prototype in one evening on Boogle's existing grid; **[weekend]** = a few sessions; **[ambitious]** = flagged as truly ambitious. "Sync" always assumes Boogle's existing model: per-cell integer layers updated in fixed scan order at a fixed tick, randomness from `mulberry32` seeded by (worldSeed, tick, cellIndex), player actions as host-stamped edits, snapshot+hash for late join (the Teardown model above).

1. **Cell chemistry layer (BotW-style element table)** [night]
   - What: add a per-cell byte `state` (dry/wet/burning/frozen/charged/salty) to terrain cells and objects. A tiny element-by-material table decides transitions.
   - Precedent: BotW chemistry engine (elements vs materials, three rules); Noita fire/oil/water/steam.
   - Fun loop: "what happens if I...". Throw a burning ball into dry grass, douse it with a splash, freeze the pond and skate the ball across.
   - Implementation: lookup table `next[state][stimulus]` applied per active cell; stimuli come from neighbours (4-neighbour) and water depth.
   - Determinism/sync: pure integer table, fixed order, no new message types except "ignite"/"freeze" edits from tools. Cheap. Keep the BotW rule "materials don't change materials directly" to bound chain reactions.

2. **Grass + fire spread with regrowth** [night]
   - What: grass cells on the hill can catch fire and spread; burnt cells regrow over time. Water and wet soil stop fire.
   - Precedent: Noita (random-direction ignition, timed burn); From Dust (fire doesn't spread indefinitely without a source; unstressed areas accumulate trees and become more fire resistant — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)); Minecraft random ticks drive fire spread and crop growth ([Minecraft Wiki, Tick](https://minecraft-archive.fandom.com/wiki/Tick)).
   - Fun: digging a firebreak channel, racing to flood a burning patch, a "who started it" story. Fits "Only the world is the antagonist" if fire never destroys crops or player builds, only wild grass.
   - Implementation: Minecraft-style random ticks: each tick pick K cells per chunk via seeded RNG; burning cells have a fuel counter (integer) decremented each tick.
   - Sync: seeded random-tick selection keyed by tick makes it identical on every client; ignition is a host-stamped edit.

3. **Sand slumping / angle of repose (falling-sand lite)** [night]
   - What: piled sand that is too steep slides to lower neighbours; wet sand holds steeper slopes than dry sand; walls slowly sag when wet by the tide.
   - Precedent: falling-sand family (Powder Toy, Noita, Sandspiel; sand falls down then diagonally — [Making Sandspiel](https://maxbittker.com/making-sandspiel)); From Dust erosion.
   - Fun: sandcastles that collapse slapstick-style, wet-sand engineering ("Slapstick over precision").
   - Implementation: 2.5D column rule: if height difference to a neighbour > threshold(wetness), move 1 unit of sand; fixed scan order with alternating direction per tick to avoid bias. Conserves sand.
   - Sync: integer, conserved, runs in the same active-cell list as water.

4. **Mud and erosion: water carries sand** [weekend]
   - What: fast-flowing water picks up sand (sediment) and drops it where flow slows; the tide erodes walls and builds deltas; a stream carves its own bed.
   - Precedent: From Dust (water/lava/erosion/sedimentation); early From Dust water carved unrealistically deep narrow rivers, fixed by inventing "mud" with dirt's solidity and water's viscosity ([Engadget](https://www.engadget.com/2010-08-17-how-project-dusts-world-building-world-was-built.html)).
   - Fun: landscapes change between visits ("Leave something for the next visitor"); the tide is a sculptor, not just a threat.
   - Implementation: per-cell integer `sediment`; capacity = f(outflow units); pick up/drop 1 unit per tick with clamping. Tune against canyon artifacts (From Dust lesson).
   - Sync: same as water; needs conservation tests (water+sediment+sand totals).

5. **Salt vs fresh water (contamination as threat)** [night]
   - What: tide water is salty; salt in soil stunts crops/mushrooms; fresh spring water flushes salt over time. Walls keep salt out.
   - Precedent: Timberborn badwater/badtides (normal sources release toxic badwater during badtides; badwater can kill everything near the riverbank) — [Timberborn wiki](https://timberborn.wiki.gg/wiki/Drought); [Checkpoint review](https://checkpointgaming.net/reviews/2026/03/timberborn-review-woodchip-off-the-ol-block/).
   - Fun: gives sand walls and channels a purpose beyond flood blocking; cooperative "flush the garden" after a tide.
   - Implementation: second integer channel `salt` per water cell, advected with flow proportionally (integer division with remainder carry in fixed order).
   - Sync: deterministic as long as remainders are handled in a fixed order.

6. **Wet/dry seasons and droughts (scheduled, telegraphed)** [night]
   - What: the spring weakens on a predictable schedule; ponds evaporate slowly; players store water in dug reservoirs.
   - Precedent: Timberborn droughts: sources weaken then stop; lead designer Bartlomiej Dawidow called removing water "the best worst thing" they could do — [Mechanistry press](https://mechanistry.com/press/how-to-starve-a-post-apocalyptic-beaver-colony-steam-game-festival); [Timberborn wiki](https://timberborn.wiki.gg/wiki/Drought).
   - Fun: anticipation and preparation; reservoirs are durable shared builds.
   - Implementation: spring output = f(tick, seed); evaporation as a seeded random tick removing 1 unit from shallow cells.
   - Sync: pure function of tick, zero network cost.

7. **Mycelium network (fungi connecting mushrooms)** [weekend]
   - What: planted mushrooms extend an underground mycelium through wet soil; connected mushrooms share water, glow, and bounce harder together; new mushrooms sprout along strong threads.
   - Precedent: no direct game source found (see Gaps); Noita has grass/moss growth but devs say players rarely notice it ([80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)). Technique is reaction-diffusion / growth CA.
   - Fun: emergent shared goal without quests: the island's network visibly grows when several friends tend different mushrooms ("Cooperation is automatic").
   - Implementation: integer `hypha` strength per soil cell; spread to a wet neighbour with probability from seeded RNG when strength > threshold; decay when dry. Render as glowing veins in the sand shader (cosmetic layer reads, never writes).
   - Sync: deterministic CA over the existing garden region; mushrooms already flow through `src/world/sync.js`.

8. **Ecological succession / pioneer greening** [weekend]
   - What: bare sand -> beach grass (stabilises sand, slows slumping) -> shrubs -> palms, each stage requiring moisture and low salt; vegetation feeds back on terrain (roots resist erosion, plants hold water).
   - Precedent: Terra Nil's "reverse city builder" progression: water system first, then purify soil, then pioneer greenery ([Science Friday](https://www.sciencefriday.com/articles/terra-nil-video-game-climate-change/); [PC Gamer](https://www.pcgamer.com/au/restore-a-desolate-ecosystem-in-reverse-city-builder-terra-nil)); From Dust vegetation spreading and recolonising after tides/lava.
   - Fun: goals emerge from the land ("make the hill green") without quests; persistent visible progress.
   - Implementation: per-cell `veg` stage byte with random-tick promotion gated by neighbours and moisture; growth from elapsed ticks for offline catch-up (already planned in PLAN.md).
   - Sync: deterministic; offline catch-up must be computed as a closed form or a bounded fast-forward to stay identical.

9. **Storms, lightning and conductive water** [night for basic; weekend with chemistry]
   - What: a telegraphed storm rolls in; rain fills ponds and wets sand; lightning strikes the tallest point or a metal/charged object; struck water "charges" connected cells briefly.
   - Precedent: BotW: rain makes climbing slippery, puts out fires, raises electric effects; metal gear attracts lightning; director Fujibayashi rejected letting players control weather because not controlling it is more fun ([GoNintendo/Game Informer](https://gonintendo.com/stories/302341-nintendo-considered-letting-players-control-the-weather-in-zelda); [Zelda Wiki](https://zelda.fandom.com/wiki/Thunderstorm)).
   - Fun: dramatic shared moments; players build lightning rods (sand towers) or hide; strike sets grass alight (chains into #2).
   - Implementation: storm schedule f(tick, seed); strike target = argmax height in a seeded region; charge as a flood-fill limited to N cells per tick.
   - Sync: pure function of tick + shared state.

10. **Wind field: drift, seed dispersal, sand dunes** [night coarse; weekend full]
   - What: a coarse wind vector field (e.g., 8x8 over the island) that pushes the ball, blows seeds/spores to new cells, and slowly drifts dry sand into dunes.
   - Precedent: Sandspiel couples a GPU Navier-Stokes wind sim (adapted from Pavel Dobryakov's WebGL fluid) with CPU particles ([Making Sandspiel](https://maxbittker.com/making-sandspiel)); From Dust's slow-moving desert layer shifted water around ([Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)).
   - Fun: makes the ball (the star) more interesting; windy days change play.
   - Implementation: for the shared sim use a coarse integer wind from tick+seed (no fluid solve). Ball push is owner-authoritative physics, so it can use floats.
   - Sync: a GPU fluid solver would not be bit-identical across devices; keep any GPU wind cosmetic only.

11. **Day/night + moon-phase tide with bioluminescence** [night]
   - What: tide height and timing follow a moon cycle; night shows glowing mushrooms/plankton where water moves; some mushrooms only grow at night.
   - Precedent: From Dust: a tide cycle covers land at high tide; plants regrow when water recedes and the tribe crosses at low tide; tsunamis were scheduled events players could anticipate ([Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)).
   - Fun: rhythm and anticipation; a reason to visit at different times.
   - Implementation: tide level = integer table lookup on (tick mod period); glow is cosmetic.
   - Sync: zero cost.

12. **Volcano / lava that makes new land** [ambitious]
   - What: an occasional, telegraphed eruption sends lava downhill; lava + water -> steam + rock; cooled lava adds permanent new terrain; burns vegetation which later regrows richer.
   - Precedent: From Dust volcanic cycles that players learn to anticipate ([Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)); Galileo sim of lava ([GDC Vault](https://gdcvault.com/play/1013667/Creating-a-High-Performance-Simulation)).
   - Fun: huge shared spectacle; reshapes the island between visits.
   - Implementation: a second viscous fluid on the same column grid (slower flow rate, cooling counter), chemistry with water.
   - Risk: conflicts with "Only the world is the antagonist" only if it destroys player builds; restrict to an unbuildable slope or protect crops. Adds terrain types to the snapshot.

13. **Creature populations (crabs, birds, Booglers) with simple ecology** [ambitious]
   - What: small agents that eat seeds, hide in wet sand, flee storms, and multiply when food is plentiful; predator-prey balance among a few species.
   - Precedent: Dwarf Fortress-style emergent animal stories ("a very rude dog that comes in and bites someone" — [PC Gamer](https://www.pcgamer.com/gaming-industry/game-development/dwarf-fortress-creator-says-we-have-a-natural-lean-towards-human-made-stories-but-but-were-all-going-to-be-very-sorely-tested-in-the-coming-years-by-ai/)).
   - Fun: characters friends can name and talk about.
   - Implementation: host-authoritative agents published in presence (like the Boogler today) rather than deterministic lockstep agents; population counts can be an integer CA per region.
   - Risk: agent AI + pathfinding cost; From Dust warns villager unpredictability frustrates players.

14. **Water machines: wheels, sluices, pressure plates (redstone-lite)** [ambitious]
   - What: placeable sluice gates and water wheels; a wheel spins when flow passes; it can drive a fountain, a ball launcher or open a gate, letting friends build Rube Goldberg contraptions.
   - Precedent: Minecraft redstone (no source fetched; see Gaps); Timberborn power wheels driven by water ([Quarter to Three forum note](https://forum.quartertothree.com/t/timberborn-lumberpunk-beaver-city-builder/153455?page=3) via search summary, player opinion).
   - Fun: creative engineering that launches the ball.
   - Implementation: read outflow units from the water sim at the wheel cell (integer), signal propagation as a fixed-order graph update.
   - Sync: deterministic; placement is an edit. Ambitious mainly in UX and design, not tech.

#### Which create the most stories
- Ranked for Boogle (inference): chemistry chain reactions (#1, #2, #9) > terrain that changes on its own (#3, #4, #12) > growth that persists between visits (#7, #8) > scheduled threats (#5, #6, #11). The first category produces "you had to be there" moments; the second and third produce "look what happened while you were gone" moments, which matches DESIGN.md principle 9.
- The Teardown precedent strongly validates Boogle's "sync edits, not state" model for every mechanic above: only player commands travel; the world sim runs identically everywhere.

### Gaps
- GDC Vault recordings (Noita, BotW, From Dust) were gated; details come from interviews and press reports rather than slides.
- No primary source found for Minecraft redstone design, Valheim, Tiny Glade, or Sky: Children of the Light systemic mechanics within the search budget.
- No game precedent found for a mycelium/fungal-network mechanic; #7 is a design proposal grounded in generic CA technique.

## Ecology/growth systems: how do they create goals without explicit quests?

### Takeaway
Ecology systems create goals by giving the land visible states that players want to push toward (green, wet, unsalted, connected) and by having the world push back on a predictable cycle (tide, fire, drought), so players invent their own objectives. The precedents tie growth to a chain of prerequisites (water, then soil, then plants) that naturally sequences play.

### Cited Findings
- Terra Nil progression starts with the water system, then purifies soil, then cultivates pioneer greenery; players finally recycle their tech and leave no human presence. — [PC Gamer](https://www.pcgamer.com/au/restore-a-desolate-ecosystem-in-reverse-city-builder-terra-nil); [Science Friday interview with Sam Alfred](https://www.sciencefriday.com/articles/terra-nil-video-game-climate-change/)
- Critic Adrian Hon felt Terra Nil was more hardcore terraforming than true ecosystem restoration; resources for building are earned by restoration activities. — [Adrian Hon](https://adrianhon.substack.com/p/terra-nil)
- From Dust: plants grow, get destroyed by eruptions, grow again; unstressed areas accumulate trees and become more fire resistant; plants regrow after high tide recedes. — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- Minecraft: every game tick, `randomTickSpeed` (default 3) random blocks per chunk section receive a block tick, which drives crop growth, sapling growth and fire spread; median gap between block ticks is about 47 s (Java) / 142 s (Bedrock). — [Minecraft Wiki, Tick](https://minecraft-archive.fandom.com/wiki/Tick)
- Noita includes grass, moss, freezing water, melting snow and decomposing corpses, but players rarely notice them, so the team didn't invest heavily. — [80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- Timberborn turned water scarcity into the core goal: stockpile food, build dams and canals before rivers dry up. — [Mechanistry press](https://mechanistry.com/press/how-to-starve-a-post-apocalyptic-beaver-colony-steam-game-festival)

### Inferences
- Slow ecology is invisible unless it is (a) visually loud and (b) tied to something players touch. Noita's lesson implies Boogle's growth should show up in the sand shader and on things the ball interacts with (mushroom bounce strength, palms dropping coconuts), not as subtle background.
- A Minecraft-style random tick using `mulberry32(seed, tick)` to pick cells is the cheapest deterministic way to run sparse growth over the whole island at near-zero CPU and zero network cost.
- Prerequisite chains (Terra Nil) map directly onto Boogle: fresh water -> unsalted wet soil -> grass -> mushrooms/mycelium -> palms. Each link is a reason to dig a channel, which keeps water as "the glue" (DESIGN.md core loop).
- Disturbance-and-recovery cycles (From Dust) are what make ecology feel alive; a garden that only grows becomes static. Tide and fire as resets that never touch player crops satisfy principle 5.

### Gaps
- No quantitative player-retention data found for ecology-driven goals.
- No primary source on Valheim/Tiny Glade growth systems.

## Elemental chemistry: minimal rule tables for maximal emergence

### Takeaway
BotW shows that about five elements, a handful of material classes, and three meta-rules are enough; Noita shows that "try down, then sideways, swap by density" plus a few reactions (fire+oil spreads, fire+water = steam) yields enormous variety. The key constraint for fun is restricting who can change whom, so chains stay readable.

### Cited Findings
- BotW elements: fire, water, ice, wind, electricity; materials: trees, rocks, characters, weapons; rules: element->material, element->element, never material->material. — [GamesBeat](https://gamesbeat.com/the-legend-of-zelda-breath-of-the-wild-makes-chemistry-just-as-important-as-physics/)
- BotW examples: rain extinguishes exposed fire and boosts electric effects; metal attracts lightning; burning grass makes updrafts (fan analysis). — [Zelda Wiki weather](https://zelda.fandom.com/wiki/Weather); [fan breakdown](https://saschb2b.github.io/game-mechanics/games/zelda-botw/)
- Noita reactions: oil flammable, water not; fire + water -> steam; wood burns for a set time. — [80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- Sandspiel stores each cell in 32 bits: species byte, two 8-bit registers (e.g., fire heat, petal colour) and an 8-bit clock to avoid double updates; species update functions only touch relative neighbours via get/set; Sandspiel Studio later let players define rules with Scratch-like blocks. — [Making Sandspiel](https://maxbittker.com/making-sandspiel); [Wikipedia, Falling-sand game](https://en.wikipedia.org/wiki/Falling-sand_game)
- Earlier Bittker prototype: water absorbed by dirt forms mud. — [Making Sandspiel](https://maxbittker.com/making-sandspiel)

### Inferences
- Proposed minimal Boogle table (inference, not sourced): stimuli {water, fire, cold, spark, salt}, cell materials {sand, wet sand, grass, mushroom, rock, ice}. Rules: water + sand -> wet sand; fire + grass -> burning -> ash -> (random tick) grass; fire + water -> steam (water units removed, cosmetic puff); cold + shallow water -> ice (walkable, ball slides); spark + water -> charged for N ticks (spreads through connected water); salt + mushroom -> wilt (never kills player-planted crops outright, just pauses growth). About 8-10 entries, fits a 2D array.
- Sandspiel's 4-byte cell layout is directly usable: Boogle already has terrain height and water bytes; adding `material` and `state/timer` bytes gives a 4-byte cell that can upload as an RGBA texture for rendering.
- The Sandspiel "clock" bit is how to make a single-pass fixed-order scan deterministic and bias-free; alternating scan direction per tick is a common complement (inference).

### Gaps
- Could not access the BotW slides to confirm the exact element/material count or the full interaction table.

## Weather, day/night and tide as gameplay, not ambience

### Takeaway
Weather becomes gameplay when it changes the verbs (climbing, fire, electricity, flow) and when it is predictable enough to plan around but not controllable. From Dust and Timberborn turn cycles (tide, eruption, drought) into the main source of tension; BotW makes rain and storms rewrite the rules of existing systems.

### Cited Findings
- BotW: rain makes climbing slippery, extinguishes fire, raises electric effects; thunderstorms make metal gear spark and get struck; Fujibayashi: not controlling weather is more fun, Link is against nature. — [Zelda Wiki](https://zelda.fandom.com/wiki/Thunderstorm); [GoNintendo](https://gonintendo.com/stories/302341-nintendo-considered-letting-players-control-the-weather-in-zelda)
- Fan criticism: rain's climbing penalty is too punishing for such a central mechanic. — [Zelda Dungeon debate](https://www.zeldadungeon.net/?p=187778)
- From Dust: tide cycles, repeating volcanic cycles players learn to anticipate, tsunamis as scheduled events with some uncertainty; Chahi: "It would be very frustrating if the player can't anticipate what the plan is." — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- Timberborn: drought sources weaken then stop; only tanks and reservoirs supply water; badtides turn sources toxic. — [Timberborn wiki](https://timberborn.wiki.gg/wiki/Drought)

### Inferences
- For Boogle, every weather event should modify an existing system rather than add a new one: rain adds water units and wetness (helps crops, sags walls); wind pushes the ball; storms bring lightning that interacts with chemistry; cold nights freeze shallow ponds into a ball-skating rink. This keeps "Toys before chores": weather creates new toys rather than punishments.
- Predictable-but-uncontrollable matches DESIGN.md principle 7 (telegraph 30-60 s ahead). Make every event a pure function of (tick, seed) so clients can render the warning before the host says anything.
- BotW rain criticism suggests avoiding hard verb penalties (e.g., no "can't dig in rain"); prefer changing outcomes (dug holes fill with water).

### Gaps
- No primary dev source found on Sky: Children of the Light or Valheim weather design.

## Pitfalls: performance, sync cost, chaos making things unfun

### Takeaway
The recurring failures are: whole-grid updates that don't scale (solved by chunked dirty rects/active lists), non-determinism leaking in and causing desyncs (solved by integer rules, fixed order, per-tick hashes), late-join replay cost (solved by snapshots), and chaotic or invisible results (solved by tuning toward predictability and visibility).

### Cited Findings
- Noita: 64x64 chunks each with a dirty rect; bottom-up updates; checkerboard four-pass multithreading so no two threads touch the same pixels; profile early. — [80.lv](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation/)
- From Dust chose to compute the whole world every frame so frame rate stays constant regardless of activity (opposite trade-off to Noita), with SIMD and SPU multithreading at 30 fps. — [Engadget](https://www.engadget.com/2010-08-17-how-project-dusts-world-building-world-was-built.html); [GDC Vault](https://gdcvault.com/play/1013667/Creating-a-High-Performance-Simulation)
- From Dust tuning was empirical: designers ran scenarios, watched for unwanted repeating patterns, and adjusted; water initially carved unrealistically deep narrow rivers; co-op/competitive modes were deferred because interaction design was hard. — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-); [Engadget](https://www.engadget.com/2010-08-17-how-project-dusts-world-building-world-was-built.html)
- Factorio uses deterministic lockstep; any divergence causes a desync and a map re-download; desync reports compare server/client state; a per-tick heuristic CRC is a fast but incomplete determinism check; small errors can accumulate unseen. — [FFF #188](https://factorio.com/blog/post/fff-188); [FFF #76](https://factorio.com/blog/post/fff-76); [FFF #55](https://factorio.com/blog/post/fff-55)
- Teardown: joining clients replay a size-limited command buffer; join-in-progress is disabled after many changes because "it would take forever to join." — [80.lv](https://80.lv/articles/teardown-developer-breaks-down-multiplayer-and-voxel-destruction-tech)
- Dwarf Fortress simplified pressure (water fills one z-level below source) to save CPU; the model has "several unexpected quirks." — [DF Wiki, Pressure](https://dwarffortresswiki.org/index.php/Pressure)
- Sandspiel author regrets spending wasm performance headroom on a 300x300 canvas, leaving slower devices below 60 fps; o3 vs size optimisation gave a large speedup. — [Making Sandspiel](https://maxbittker.com/making-sandspiel)
- Minecraft blog-level sources note very high randomTickSpeed causes lag and uncontrolled fire spread (low-reliability guides). — [Minecraft Wiki, Tick](https://minecraft-archive.fandom.com/wiki/Tick) (mechanic); blog claims not independently verified.

### Inferences
- Boogle's existing approach (host-stamped edits + snapshot with hash) is the Teardown/Factorio hybrid; each new layer (material, state, sediment, salt, hypha, veg) must be included in the snapshot and the hash, or late joiners and desync recovery break.
- Prefer Noita-style active lists over From Dust's whole-grid compute: browser and phone (Backbone on iPhone) budgets are far smaller, and Sandspiel's experience shows phones struggle with modest grids.
- Spreading processes (fire, mycelium, charge) need hard caps per tick (max cells changed) and decay so a single action can't flood the active list. This also limits "chaos making things unfun".
- Integer-division remainders in advection (salt, sediment) are a likely desync source; carry remainders in a fixed order and unit-test "same inputs, same hash" (AGENTS.md test guidance).
- Chaos: From Dust and BotW both argue for anticipation. Give every spreading system a visible precursor (smoke before fire, dark cloud before strike, foam before salt) and a counter-verb within reach (splash, dig, pile).
- Any GPU-computed sim (e.g., Sandspiel's WebGL wind) is not bit-reproducible across devices; keep such effects strictly cosmetic.

### Gaps
- No measured numbers for JS (non-wasm) column-CA throughput on mobile Safari; would need a benchmark in Boogle itself.
- No source on PeerJS-specific bandwidth for edit streams under heavy spreading-event load (edits stay small since spreading is simulated, not sent).
