# Novel verbs and progression/goal-structure mechanics for Boogle

Scope note: Boogle is a three.js + cannon-es + PeerJS sandbox island with a deterministic, host-authoritative shared sim (integer water per cell, terrain edits, mushrooms, weather, tide; seeded `mulberry32`). Its DESIGN.md principles that most constrain this catalog: "Toys before chores", "The ball stays the star", "Farming is never required", "Cooperation is automatic, not negotiated", "Only the world is the antagonist", "Communal world, personal rewards", "Telegraph everything", "Leave something for the next visitor", "Slapstick over precision", and "Determinism from day one" / "Sync edits, not state". (Read from the repo's DESIGN.md; not an external source.) All implementation sketches and ambition ratings below are my inferences, not sourced facts.

Ambition scale used throughout: **S** = a weekend-sized feature file; **M** = a few feature files plus a sim op; **L** = touches the sim core / net model; **XL (truly ambitious)** = new subsystem, real risk to determinism or performance.

---

## 1. Novel core verbs that reshape play (time, scale, terraforming, paint, sound, photography, building, possession)

### Takeaway
The strongest precedents share one trait: a single physical verb whose consequences multiply through an existing simulation (Splatoon's swim-in-your-own-ink, TotK's "everything has mass", From Dust's direct terrain sculpting). For Boogle, verbs that feed the water/terrain sim (ink-like soil states, scooping/carrying water, growing the ball, sound that the garden responds to) fit far better than verbs that need a separate rule set (true time rewind of the shared world, Superliminal perspective rescaling).

### Cited Findings
**Terraforming (From Dust)**
- From Dust's player directly manipulates terrain, water and lava to guide and protect a tribe; direct terrain interaction replaced an earlier design where the player only sent villagers to locations, which Chahi says made the game more responsive ("react fast") — [Game Developer, "The Core of From Dust"](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- Chahi: the sim rules are very simple and converge so emergent patterns appear; the team avoids special-case code and tunes empirically ("It's like rendering in a way") — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- From Dust ties environments together with cycles: tides expose and cover land, eruptions destroy and regrow plants, fire burns and regenerates; undisturbed areas grow more fire-resistant as trees accumulate; planned tsunamis/volcanoes create anticipation — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- The team originally had a landscape-only sandbox editor; players found the editor fun but the gameplay less so, so they brought the editor's interaction into the game — [SPOnG interview](https://spong.com/feature/10110351/Interview-From-Dust-Eric-Chahi) (via search summary); the game began as a strategy game and its flexible tech changed direction — [Game Developer](https://gamedeveloper.com/game-platforms/chahi-god-game-i-from-dust-i-s-tech-determined-game-s-direction)
- Deep Rock Galactic's environments are described by co-founder Mikkel Martin Pedersen as 100% destructible and procedurally generated; the procedural world was the team's biggest technical obstacle — [Unreal Engine spotlight](https://www.unrealengine.com/spotlights/how-ghost-ship-games-found-success-with-deep-rock-galactic?lang=de); no official write-up says whether it is voxel meshing or CSG (only disputed Reddit speculation) — [r/howdidtheycodeit thread](https://redlib.hbubli.cc/r/howdidtheycodeit/comments/1e69166/how_did_they_code_the_pathfinding_implementation)

**Paint/ink that changes physics (Splatoon)**
- Splatoon started as a prototype of tofu-shaped cubes shooting ink on a flat map; the breakthrough was a two-state ability: out in the open you attack, submerged in your ink you can't attack but move faster and recover; recognizing that as "swimming" led to squids — [Alphr on Nogami's GDC 2018 talk](https://www.alphr.com/games/1008886/splatoon-success-nintendo-gdc-talk/); [Nintendo Wire](https://nintendowire.com/news/2018/03/21/splatoon-prototype-shown-off-gdc/)
- The characters were rabbits first; Nogami described a "disconnect between gameplay and appearance" until squids — [My Nintendo News](https://mynintendonews.com/2018/03/21/nintendo-explains-that-splatoon-was-almost-a-game-about-rabbits/); one report says ~70 design proposals in six months — [Nintendo Everything](https://nintendoeverything.com/nintendo-shows-off-original-splatoon-prototypes/)
- (De Blob was in scope but I found no primary design source in this session.)

**Building with physics (Tears of the Kingdom Ultrahand/Fuse)**
- GDC 2024 "Tunes of the Kingdom: Evolving Physics and Sounds" (Dohta, Takayama, Osada) — [GDC Vault](https://www.gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving)
- Takayama: clashes between non-physics objects and Ultrahand "caused daily problems" and "the world fell apart"; the fix was making nearly everything physics-driven (all objects have mass); e.g. gates rebuilt as wood + motor + chain — [Digital Trends](https://digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics); [GamesRadar](https://gamesradar.com/games/the-legend-of-zelda/zelda-dev-says-the-true-menace-of-tears-of-the-kingdom-wasnt-ganondorf-but-the-programming-that-would-have-let-players-destroy-the-world)
- Goal stated as "multiplicative gameplay": physics yields solutions designers didn't script — [Digital Trends](https://digitaltrends.com/computing/how-nintendo-designed-tears-of-the-kingdom-physics)

**Scale and perspective (Katamari, Superliminal)**
- Takahashi: zooming in and out (close detail vs overall view) is "a main mechanic" of his games, learned from an art-school sculpture-drawing exam — [GamesRadar (Wattam interview)](https://gamesradar.com/wattam-director-keita-takahashi-gives-us-life-advice-and-an-ending-explanation)
- Katamari's wonder grows as the katamari becomes larger and more formidable (L. E. Hall, Boss Fight Books) — [Scribd excerpt](https://www.scribd.com/document/615423283/Katamari-Damacy-L-E-Hall)
- Superliminal: a held object keeps its screen size; on drop it is rescaled in proportion to the change in distance to the farthest point in front of the player; implementing the scaling in Unity was "straight-forward" per Shih; shadows use constant ray projection and sound effects scale with size (programmer Phil Fortier) — [NoobFeed](https://www.noobfeed.com/news/how-superliminals-perspective-tech-works); [Wikipedia](https://en.wikipedia.org/wiki/Superliminal)

**Time rewind / echoes (Braid)**
- GDC 2010 "The Implementation of Rewind in Braid": rewind had to reproduce the scene exactly and hold 30–60 minutes of play in about 40 MB on consoles, because higher-level mechanics were built on top of it — [GDC Vault abstract](https://gdcvault.com/play/1012210/The-Implementation-of-Rewind-in)
- Hobbyist reconstructions: naive per-frame snapshots run out of memory as levels grow; fix with fixed-size ring buffers and coarser tiers for older history — [Game Developer, Braid-style rewind](https://www.gamedeveloper.com/programming/braid-style-rewind-system-03); [ModDB "implementing time rewind and tearing it out"](https://www.moddb.com/news/implementing-time-rewind-and-tearing-it-out)

**Sound/music as a verb (Sky)**
- Sky's instruments came later, emerging from experiments in how players communicate (audio director Vincent Diamante); players gather around performances — [Pocket Tactics](https://www.pockettactics.com/sky-children-of-the-light/music)
- Jenova Chen: music is "the most efficient medium to communicate your emotions"; Sky has no voice/text chat, relying on hand-holding, gifts, emotes — [TheGamer interview](https://www.thegamer.com/jenova-chen-interview-aurora-concert-sky-children-of-the-light/); [Game Informer preview](https://www.gameinformer.com/index.php/preview/2019/06/14/following-in-the-footsteps-of-journey-and-flower)

**Photography (Umurangi Generation)**
- The camera system came from Tali Faulkner teaching a cousin a DSLR and noticing it resembled a game tutorial; objectives (bounties like photographing specific graffiti or N birds) were added afterward to give the core mechanic a loop — [Vice/Waypoint](https://www.vice.com/en/article/umurangi-generation-invokes-the-real-life-experience-of-taking-photos-waypoint-radio); [Wikipedia](https://en.wikipedia.org/wiki/Umurangi_Generation)
- Lenses (telephoto, fisheye) unlock over time; a critic found that unlocks made them want to take "hundreds more photos", and the 10-minute bonus timer pushed more shooting — [Unwinnable](https://unwinnable.com/?p=84919)

### Inferences

#### Mechanic catalog, part A (verbs)

**A1. Soil states as "ink" (wet / salted / fertile / slick) — Splatoon + From Dust.** *Ambition: M.*
- What: Terrain cells carry a small integer state besides height. Water already wets sand; add *slick* (wet clay the ball and players slide on), *salted* (tide residue, kills growth until rain rinses it), *fertile* (mushroom spores). Players "paint" by where they route water, splash the ball, or scatter spores.
- Loop: route water -> soil changes colour and physics -> you skate/slide/grow on it -> the tide salts it -> you rinse it. Splatoon's lesson is the two-state movement: give players a faster mode on their own painted surface (e.g. belly-slide on wet sand).
- Why compelling: makes the existing sim legible and gives a new movement verb without a new resource. Serves "Toys before chores" and "Slapstick over precision".
- Web sketch: one `Uint8Array` state layer in `src/sim/` alongside height/water, updated in the fixed tick (integer rules); render as a splat texture (DataTexture updated from dirty rects) blended in the terrain shader; physics friction looked up per contact cell (cosmetic-safe if movement is client-authoritative).

**A2. Scoop, carry and pour water/sand — From Dust's "spirit".** *Ambition: S–M.*
- What: Pick up a bounded integer volume of water or sand at a cell and drop it elsewhere (with a charged throw that splatters). Tool upgrades (bucket -> barrel -> cloud) are personal rewards.
- Loop: drought -> carry water to a dry patch / build an emergency dune before the tide.
- Why: Chahi's finding that direct, fast interaction beat indirect commands; conserves water (testable). Serves "Toys before chores".
- Web sketch: two ops (`scoop`, `pour`) via `registerOp`; host validates volume conservation; carried amount shown as a translucent blob on the player (cosmetic). Unit test: total water conserved across scoop/pour.

**A3. Katamari ball: the ball accretes.** *Ambition: M.*
- What: Rolling the beach ball through wet sand, seaweed, shells or spores makes it pick things up, grow and get heavier; a splash or hard hit sheds them (dropping seeds/sand where it bursts).
- Loop: roll -> grow -> launch the giant ball into the sea to make a huge splash/wave, or burst it over a dry field to sow it.
- Why: keeps "The ball stays the star" while giving it a progression arc within a session; Takahashi's scale wonder.
- Web sketch: ball owner-authoritative; accreted items are instanced meshes parented to the ball (cosmetic), with a synced integer "mass class" that changes cannon-es radius/mass in steps; shedding emits a host-validated `scatter` edit so the sim stays edit-driven. Keep size steps coarse to avoid physics instability.

**A4. Perspective pick-up (Superliminal) for driftwood/rocks.** *Ambition: L (and partly XL).*
- What: Hold a found object, look at the horizon, drop it to make it huge (a log becomes a bridge or breakwater).
- Why: big surprise moments, but it introduces arbitrary-scale rigid bodies that must be identical for all players.
- Web sketch: raycast to farthest hit, scale = d_new/d_old, quantized to integer scale steps and broadcast as an edit; occupancy rasterized into the terrain/water grid so water respects it. Flag: forced perspective is a single-camera illusion and reads oddly from other players' views; likely a poor multiplayer fit.

**A5. Driftwood building, Ultrahand-lite.** *Ambition: XL (truly ambitious).*
- What: Glue 2–6 washed-up planks/logs into rafts, dams and ramps; structures float and break under waves.
- Why: TotK's "multiplicative gameplay", and rafts on a flowing sea with a ball are naturally slapstick.
- Risk: TotK needed everything to be physics-driven to stop the world "falling apart". In Boogle the authoritative water sim is a grid while cannon-es bodies are float physics, so structures that block water need a deterministic occupancy representation, and float rigid bodies cannot feed back into shared state. Sketch: built structures are host-owned bodies (like the ball's authority rule), with a quantized occupancy footprint written to the grid as an edit only when they come to rest.

**A6. Sound verb: chime shells / whistle the garden responds to (Sky).** *Ambition: S.*
- What: A small pentatonic instrument (shell, conch); mushrooms bloom, glow or release spores in response to nearby notes or chords; two or more players playing together triggers a bigger response.
- Why: Chen's "music is the most efficient medium for emotion", no chat needed; directly serves "Cooperation is automatic" (more players = bigger bloom).
- Web sketch: WebAudio oscillators + envelope (no samples needed); the note itself is cosmetic, but a "chord event" (set of distinct players who played within N ticks near a cell) is a host-stamped edit feeding a deterministic growth bonus. Gamepad: map notes to face buttons via `registerAction`.

**A7. Camera and field journal (Umurangi).** *Ambition: S–M.*
- What: A photo mode that "registers" subjects (rare mushroom variant, the Boogler mid-somersault, a king-tide wave, a ball hit at max size). Bounties come from a seeded daily list; lenses are personal unlocks.
- Why: Umurangi added objectives on top of an already-fun camera, which is exactly "Toys before chores". It rewards noticing the sim.
- Web sketch: on shutter, run frustum + occlusion tests against tagged entities, score by screen size/centering; save a thumbnail via `renderer.domElement.toBlob` to IndexedDB (personal). Nothing touches shared state.

**A8. Tide echoes, not rewind.** *Ambition: M for echoes, XL for real shared rewind.*
- What: (a) Personal ghosts: replay where other players walked and threw the ball yesterday as faint "echoes", as a "Leave something for the next visitor" signal. (b) A "tide clock" that lets anyone *preview* the next 60 s of tide/water flow (run the deterministic sim ahead locally, cosmetic only), a Braid-flavoured verb that fits "Telegraph everything".
- Why: Boogle's determinism already gives it Braid's key property (exact replay from snapshot + edit log). True rewind of the shared world conflicts with multiplayer (whose timeline wins?), so avoid it.
- Web sketch: (a) record player positions at ~2 Hz into a ring buffer, upload with the snapshot; (b) clone the sim state into a worker or an idle-frame budget and step N ticks with no edits, then draw the predicted water as a ghost overlay.

**Possession/shapeshifting** (not researched in depth this session): a sketch would be "become a crab / gull / the ball for a minute" as a movement-only cosmetic mode; ambition M. No sources gathered.

### Gaps
- No primary sources found for De Blob, Pokémon Snap, Wilmot's Warehouse or possession games (Messiah, Ghost Trick); these were not cited.
- The Braid rewind talk and TotK GDC talk contents are paywalled; only abstracts and press coverage were available.
- Deep Rock Galactic terrain implementation remains unconfirmed (voxel vs CSG).

---

## 2. Discovery and knowledge-based progression (Outer Wilds, Tunic, Animal Well, The Witness)

### Takeaway
Knowledge progression works when the world itself performs dramatic, observable phenomena (Outer Wilds' cyclones), every detour teaches something, and some secrets are deliberately too large for one person (Animal Well layer 3). Boogle's deterministic, seeded tide/weather is a ready-made "clockwork" world, so secrets tied to tide phase or weather are cheap and fit the drop-in, multi-visitor model.

### Cited Findings
- Outer Wilds talks: GDC 2021 IGS "Sparking Curiosity-Driven Exploration Through Narrative in Outer Wilds" (Kelsey Beachum) — [GDC Vault](https://gdcvault.com/play/1027008/Independent-Games-Summit-Sparking-Curiosity); GDC 2020 "The 4D Level Design of Outer Wilds" (Alex Beachum) on pacing narrative inside a physics sim that changes over time — [GDC news](https://gdconf.com/news/see-4d-level-design-outer-wilds-deconstructed-gdc-2020)
- With no scores or combat mastery, the draw is the quest for knowledge; almost every location teaches something: "Players don't always get the knowledge they're looking for, but it's always valuable and steers them in the right direction." — [Game Developer](https://gamedeveloper.com/business/explaining-the-value-of-show-don-t-tell-storytelling-in-i-outer-wilds-i-)
- Physical events teach better than exposition: text is "not going to be as interesting as getting sucked into a cyclone"; physical processes "grab players' attention, leading them to investigate further"; text is scattered non-linearly — [Game Developer](https://gamedeveloper.com/business/explaining-the-value-of-show-don-t-tell-storytelling-in-i-outer-wilds-i-)
- Tunic: unreadable in-world language makes a world "not meant for you"; players collect pages of an in-game manual with tips, maps, secrets; inspired by hidden-but-available abilities like Super Metroid's wall jump — [80.lv](https://80.lv/articles/tunic-s-developer-on-creating-the-in-game-manual-full-of-mysteries); [Game Developer](https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals)
- Shouldice planned puzzle structure with dependency graphs, as he did for point-and-click adventures as a kid; aim: "the excitement of not knowing" — [Rock Paper Shotgun mirror](https://wwwrockpapershotgos.pages.dev/posts/how-tunic-was-born-from-a-lifelong-obsession-with-zelda-secrets-and-hidden-object-games)
- Animal Well has three layers: an accessible puzzle platformer, optional secrets, and broader mysteries not meant to be solved by one person; in one community puzzle each player has a unique tile and ~50 Discord players assembled them, unlocking a rabbit; Basso wants people to "collaborate and share notes" — [Nintendo Life](https://nintendolife.com/features/i-avoided-almost-all-the-existing-tropes-peeling-back-the-layers-of-animal-well); [Time Extension](https://www.timeextension.com/features/best-of-2024-the-making-of-animal-well-2024s-most-unique-metroidvania); [Thinky Games](https://thinkygames.com/features/interview-how-animal-well-is-using-secrets-and-mysteries-to-be-a-different-kind-of-metroidvania/)
- A fan-described "layer four" is not officially acknowledged — [Kotaku](https://kotaku.com/animal-well-guide-tips-layers-explained-1851532515/5)
- The Witness aimed to simulate an epiphany; Blow avoids red herrings and says hard puzzles should be hard because the player can't yet see the possibilities — [Gamereactor](https://www.gamereactor.eu/shared-epiphany-jonathan-blow-reflects-on-the-witness); [Game Developer](https://gamedeveloper.com/design/-i-the-witness-i-modeling-epiphany)

### Inferences

#### Mechanic catalog, part B (discovery)

**B1. Tide-clock secrets (Outer Wilds' clockwork).** *Ambition: M.*
- What: Because tide/weather are a pure function of tick + seed, schedule rare, *visible* phenomena: a spring low tide that exposes a sandbar cave once per real day, a storm that uncovers buried "relics" where waves erode, a whirlpool at a specific tide phase that pulls the ball to a hidden cove.
- Loop: see something strange -> wonder -> return at the right time -> find a manual page or a seed type.
- Why: matches Beachum's "physical events beat text" and "Telegraph everything"; rewards "Leave something for the next visitor" when one visitor's discovery (a dug-up relic) persists.
- Web sketch: `events.js` in `src/sim/` returning event windows from (tick, roomSeed); relic locations hashed from the seed; a dug relic is a host-stamped edit and persisted in the snapshot.

**B2. Torn manual pages / sand glyphs (Tunic).** *Ambition: S–M.*
- What: Pages of a "Boogle field guide" are found buried, in bottles washing ashore, or carried by the Boogler. They hint at verbs the game never tutorializes (e.g. "pour water on a sleeping mushroom at night"). Some text is in an island glyph script.
- Why: knowledge-as-progression with zero gating of movement or ball (DESIGN "Farming is never required"). Hidden-but-available verbs follow the wall-jump example.
- Web sketch: pages are personal (localStorage/IndexedDB plus the account-less player id), drawn as a DOM overlay; page *spawn* is deterministic per room so friends can tell each other where they are. Use a dependency graph (as Shouldice did) to order hints.

**B3. Witness-style environmental figures.** *Ambition: M.*
- What: Shapes that only resolve from one spot or at one moment: rocks whose shadow forms a glyph at a given sun angle, mushroom rings that spell a pattern seen from the top of a dune, a channel shape that, if dug, the tide fills to "complete" a picture and unlock something.
- Why: an epiphany grounded in the real world the player is already manipulating; no red herrings.
- Web sketch: seed-placed props; check condition in sim (e.g. integer water pattern matches a mask) so the unlock is deterministic; the sun-angle variant is cosmetic and only reveals a hint.

**B4. Shared, split secrets (Animal Well layer 3).** *Ambition: M.*
- What: Each visitor gets a personal fragment (a shell with a symbol, a note sequence for the chime) derived from hash(playerId, roomSeed). Only several different visitors' fragments combined open a room-wide secret (a grotto, a giant mushroom, a ball skin for each contributor).
- Why: direct fit for "Cooperation is automatic" and DESIGN's "bonuses for different people"; supports async drop-in (fragments accumulate across sessions).
- Web sketch: host stores the set of distinct contributor ids per secret in the persisted snapshot; validation is a set-size check. Rewards are personal cosmetics ("Communal world, personal rewards").

### Gaps
- No access to full Outer Wilds GDC 2020 talk content (time loop mechanics); details of how the 22-minute loop supports knowledge gating were not sourced here.
- No sourced data on how knowledge progression holds up in drop-in multiplayer specifically (Outer Wilds, Tunic, Witness are single-player); Animal Well's community puzzle is the closest multiplayer precedent.

---

## 3. Soft goals in sandboxes: collections, seasons, community goals, cozy loops, creature taming

### Takeaway
Soft goals that tie to the real clock (Animal Crossing), to a "homey" space (Slime Rancher), and to a shared progress bar fed by normal play (Helldivers 2 Major Orders) give purpose without becoming chores. The known failure mode is coordination: shared goals work when focused and simple, and fail when they split attention.

### Cited Findings
- Animal Crossing uses the console clock so time passes while not playing; seasons change flora and catchable creatures; holiday-style events follow real holidays — [Wikipedia](https://en.wikipedia.org/wiki/Animal_Crossing); the N64 original shipped a battery-backed clock in the cartridge, and four planned seasonal islands became one village that changes with the year (Eguchi) — [Wikipedia](https://en.wikipedia.org/wiki/Animal_Crossing)
- New Horizons' director Aya Kyogoku: because the series is tied to real time, some play late at night or early morning, which led to crafting as an option; developers think playing without time travel is best long-term — [GamesRadar](https://www.gamesradar.com/animal-crossing-new-horizons-developers-think-playing-without-time-travels-best-in-the-long-run)
- Slime Rancher: constraints drove design ("I can't animate for a damn... so we used limbless slimes"), GDC 2017 postmortem by Nick Popovich — [Game Developer](https://gamedeveloper.com/design/video-how-i-slime-rancher-i-devs-used-constraints-to-aid-in-design); a "homey" space keeps players returning like comfort food — [Game Developer](https://gamedeveloper.com/design/-i-slime-rancher-i-dev-give-players-a-place-to-feel-cozy-and-they-ll-keep-coming-back); cap concurrent instances of the same SFX — [Game Developer](https://gamedeveloper.com/audio/using-sound-design-to-give-i-slime-rancher-i-charm-without-getting-too-gooey)
- Helldivers 2 Major Orders: timed, community-wide objectives; no opt-in, normal play counts; hand-authored by Arrowhead to steer the narrative; success rewards every participant, failure gives nothing — [GamesRadar](https://gamesradar.com/helldivers-2-major-orders); [Helldivers wiki](https://helldivers.wiki.gg/wiki/Major_orders)
- Critique: the community excels at simple, focused goals but is "historically bad at coordinating when there are multiple targets"; time-critical planets get ignored by 200,000+ players — [PC Gamer](https://pcgamer.com/games/third-person-shooter/arrowheads-latest-major-order-is-exploiting-the-helldiver-2-communitys-greatest-weakness-communication)
- Umurangi's lesson again: objectives were layered on a mechanic that was already satisfying — [Wikipedia](https://en.wikipedia.org/wiki/Umurangi_Generation)

### Inferences

#### Mechanic catalog, part C (soft goals)

**C1. Seasonal and real-time variants + collection log (Animal Crossing).** *Ambition: S.*
- What: Mushroom species, shells, flotsam and the Boogler's outfits vary by real season, time of day and weather; a personal "island log" tracks what you have seen/caught/photographed (ties to A7).
- Why: gives returning visitors something new ("Leave something for the next visitor") without timers. Weather and tide are already deterministic functions of tick.
- Web sketch: season = f(UTC date) passed into the sim as a deterministic input at tick 0 of a day (never `Date.now()` inside the tick); species tables in `src/sim/`. Collection log is personal storage.

**C2. Island orders: one focused shared goal at a time (Helldivers).** *Ambition: S–M.*
- What: A single, visible, room-wide goal derived from the seed and current conditions, e.g. "Raise the north dune to height 12 before the king tide in 3 days", "Grow 30 glowcaps before the solstice", "Keep the lagoon fresh for 24 hours of play". Normal play contributes; success gives each distinct contributor a personal cosmetic.
- Why: PC Gamer's critique says keep exactly one target; DESIGN's "Telegraph everything" (show the target in-world, e.g. a flag on the dune) and "different people helping" (reward scales with distinct contributors, not grind).
- Web sketch: order generator in `src/sim/` (pure function of seed + day); progress is computed from sim state (dune height) rather than counters where possible, so it cannot desync; contributor set stored in the snapshot.

**C3. Booglets: creatures that live in your garden (Slime Rancher + companions).** *Ambition: L.*
- What: Small creatures that spawn from mushrooms, eat specific crops, follow the ball, ride waves, and leave something (spores, glow) where they sleep. Keep "Only the world is the antagonist": they never eat other players' crops, only wild ones or ones offered.
- Why: "homey" attachment and a reason to return; creatures make the ball more interesting (they chase it, satisfying "ball stays the star").
- Web sketch: host-authoritative like the Boogler; positions on a coarse integer grid in the sim (movement decided by seeded RNG + local water/food), rendered with interpolation and an `InstancedMesh`; cap population per cell area.

**C4. Cozy session rhythm (A Short Hike / Abiotic Factor — not sourced).** I gathered no sources on these two games this session; the sketch would be small optional "errands" from the Boogler. Ambition S.

### Gaps
- No sources on A Short Hike, Abiotic Factor, or community-event design in cozy games (e.g. Animal Crossing's fishing tourneys) were gathered.
- No data on whether shared goals sustain small groups (1–6 players) as opposed to Helldivers-scale communities; the coordination critique comes from a very different scale.

---

## 4. Procedural surprises: roaming world events, procedural creatures, secrets seeded per room

### Takeaway
From Dust and Outer Wilds both show that scheduled, telegraphed world events (tsunamis, volcanoes, cyclones) give a sandbox both threat and wonder. In Boogle every such event can be a pure function of (tick, roomSeed), which makes them cheap to sync, and per-room seeds give each island its own secrets.

### Cited Findings
- From Dust's planned tsunamis and volcanoes "create uncertainty and let players anticipate threats"; cycles (tide, eruption, fire) destroy and regenerate — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- Outer Wilds' level design controls the pacing of information within a physics sim that changes the world over time — [GDC news](https://gdconf.com/news/see-4d-level-design-outer-wilds-deconstructed-gdc-2020)
- Animal Well hides things that "may not be found for a very long time" (Basso) — [Time Extension](https://www.timeextension.com/features/best-of-2024-the-making-of-animal-well-2024s-most-unique-metroidvania)
- Deep Rock Galactic pairs fully destructible terrain with procedural generation — [Unreal Engine spotlight](https://www.unrealengine.com/spotlights/how-ghost-ship-games-found-success-with-deep-rock-galactic?lang=de)

### Inferences

#### Mechanic catalog, part D (procedural surprises)

**D1. Roaming world events.** *Ambition: M per event.*
- Examples: a whale that surfaces offshore and sprays a rain shower; a king tide with a visible swell 60 s ahead; a meteor shower that seeds glowing mushrooms where shards land; a sandstorm that reshapes dunes (deterministic erosion pass); a message-in-a-bottle drift that washes up a manual page (B2).
- Why: From Dust's anticipation; "Only the world is the antagonist"; gives drop-in players an instant shared focus.
- Web sketch: event scheduler in `src/sim/events.js` (pure function, unit-testable for determinism: same seed -> same schedule hash); each event's shared effect is a sequence of sim ops applied at fixed ticks; visuals and audio cosmetic in `src/features/`.

**D2. Per-room seeded secrets.** *Ambition: S.*
- What: roomSeed decides relic sites, which manual pages appear, glyph puzzles, the rare species set, and an "island personality" (e.g. a volcanic islet vs. a reef). Two rooms are never quite the same, which encourages sharing room links.
- Web sketch: derive sub-seeds with an integer hash per subsystem so adding a subsystem doesn't shift existing ones.

**D3. Procedural creatures (Booglets variants).** *Ambition: M–L.*
- What: seeded genome (palette, ear shape, gait, call pitch) from integer hash; breeding by feeding two different mushroom types. Rare variants go into the collection log.
- Web sketch: genome bits drive shader uniforms on one instanced base mesh (per-instance attributes for colour/scale) and WebAudio call pitch.

### Gaps
- No sourced postmortems on roaming events specifically in small-group co-op sandboxes (e.g. Valheim raids, Don't Starve Together seasons) were gathered.

---

## 5. Toolkit-style tricks for rapid web prototyping (instancing, shader effects, WebAudio procedural audio)

### Takeaway
I did not gather external sources on web-specific techniques in this session; the notes below are engineering inferences grounded in the cited games' approaches (Superliminal scaling sound with size, Slime Rancher capping SFX instances) and in Boogle's existing stack (its recent commits already instance mushroom spots and coarsen the sea mesh).

### Cited Findings
- Superliminal scales sound effects with object size and keeps shadows consistent by constant ray projection — [NoobFeed](https://www.noobfeed.com/news/how-superliminals-perspective-tech-works)
- Slime Rancher caps simultaneous instances of the same sound effect — [Game Developer](https://gamedeveloper.com/audio/using-sound-design-to-give-i-slime-rancher-i-charm-without-getting-too-gooey)
- Chahi tunes simulation parameters empirically by running situations and watching patterns ("like rendering") — [Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- Popovich: build the one core "fun" part quickly and test with friends and newcomers — [Game Developer](https://gamedeveloper.com/business/-i-slime-rancher-s-i-lead-developer-tells-us-about-his-early-access-success) (via search summary)

### Inferences
- **Instancing for collectibles and creatures:** one `InstancedMesh` per prop type (shells, relics, Booglets) with per-instance colour/scale attributes; this is how D3 genomes stay cheap.
- **Soil-state splat texture:** a `DataTexture` mirroring the sim's state layer (A1), updated only for dirty rectangles each tick; the terrain shader blends wet/salt/fertile/slick looks. Same texture can drive a cheap "ink spread" animation (cosmetic lerp) so painting feels juicy even though the sim is integer.
- **Ghost previews (A8b, B1):** run the pure sim forward in a Web Worker on a copy of the state; draw predicted water as a translucent overlay. Determinism means the preview is exact unless someone edits.
- **WebAudio procedural sound:** oscillators + gain envelopes for the chime (A6), pitch-scaled by object size (Superliminal) and capped per sound type (Slime Rancher); creature calls from genome-driven pitch.
- **Photo mode:** render to a small `WebGLRenderTarget`, read pixels for scoring (brightness/centering) and save a JPEG blob locally.
- **Fit check against Boogle principles:** A1, A2, A3, A6, B1, B4, C1, C2, D1, D2 fit cleanly; A7 and B2 are fully personal and risk-free; C3/D3 are L-sized but on-brand; A4, A5 and true shared rewind (A8 option) are the truly ambitious/risky ones because float rigid bodies or timeline control conflict with the deterministic, edit-synced sim.

### Gaps
- No external sources gathered on three.js instancing/shader techniques, WebAudio procedural synthesis, or web game postmortems; these points should be validated against three.js/WebAudio docs or Boogle's own `look` scenarios.
