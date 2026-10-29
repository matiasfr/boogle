# Research: multiplayer fun, voxel water and farming for Boogle

*Research report, October 2026. Kept as the background behind [DESIGN.md](../../DESIGN.md) and [PLAN.md](../../PLAN.md).*

> **Note on what has changed since this was written.** The report assumed Boogle ran only inside a claude.ai artifact, using its peer-to-peer presence channel and artifact storage. We have since moved to **PeerJS with a host peer and our own small server** (see PLAN.md, "Key decision"). The design findings and the deterministic-sim advice still apply. The parts about artifact storage, the claude.ai `room` channel and iframe threading limits (in "Constraints you're working within") no longer apply. The host peer now plays the role the report gives to an "elected snapshot writer".

The best direction for Boogle is a **"tide-and-garden" loop**: a shared, persistent garden that lives on cheap, deterministic water (a low-resolution heightfield/column water sim, not a full 3D voxel fluid). Players dig channels, build sand dams and water plants together, and the beach ball stays the main toy because it floats, splashes, irrigates and knocks things over. Build it so peers only sync *edits* (dig/place/plant/harvest events) and a shared tick clock. Never sync fluid state. Keep the garden as a small snapshot in shared storage so the next visitor finds what the last one left.

## TL;DR

- **Make water the glue between the ball and the farm.** Water should be something you *shape* (dig channels, pile sand dams) and *play in* (the ball floats and splashes). Crops grow from moisture near water, like Minecraft's 4-block hydration radius or Timberborn's irrigation range. A recurring tide or drought gives the shared garden a reason for people to cooperate.
- **Design for 1–6 drop-in strangers and asynchronous persistence.** Borrow Animal Crossing's "visitors make your garden grow faster" bonus, Death Stranding's "your structures help the next player" and Townscaper's goal-free toy feel. Stick to light competition that doesn't need full lobbies.
- **Technically:** use a deterministic 2.5D heightfield water sim (virtual pipes or a simple column cellular automaton) that every client runs locally from the same seed. Sync only edit events plus a tick counter, rebuild from a stored snapshot, and let one peer write the persisted garden snapshot.

## 1. What makes small drop-in shared-world games fun

- **Toys before goals.** Oskar Stålberg calls Townscaper "more of a toy" with "no goal, no real gameplay". He warns that "When you keep score, you play to the score" and credits its success to being "radically casual", with a clear "division of labor between the user and the algorithm". Boogle's beach ball is already a toy like this. Water and farming should add more toys, not chores.
- **Physical comedy scales down to tiny lobbies.** Gang Beasts' studio Boneloaf deliberately builds "loose, physics-driven movement to maximize unpredictable, humorous interactions between players and the environment". Floating balls, splash waves and dams collapsing under someone's feet create the same kind of slapstick.
- **Other people should make your world better, measurably.** In Animal Crossing: New Horizons, community-tested figures put the chance of a flower reproducing at 5% when only you (or rain) water it, rising through 25%, 35%, 50% and 65% to 80% with five visitors watering. Flowers visibly sparkle differently with each extra visitor. That is cooperation without coordination overhead.
- **Leave infrastructure for strangers.** Death Stranding's Social Strand System lets structures players build (bridges, postboxes, generators) appear in other players' worlds, with "Likes" as thanks. GameSpot's review: "You never see other players in the flesh, but their impact is all around you." A garden that persists across sessions is the same pattern.
- **Constraint creates collaboration at scale.** r/place's single rule (place a tile, then wait five minutes) produced emergent collaboration *and* "creative destruction". Litherland and Mørch's 2021 study in *Computers in Human Behavior* concludes that "collaboration and creative destruction were emergent phenomena on r/place". A per-player water-bucket or seed cooldown can do the same for the garden.
- **Design out griefing and protect the vibe.** Jenova Chen built Sky: Children of the Light around "dual consent" and argues "Players should be motivated to spend time with one another because it feels good, not because they have to." He told GDC that 40% of Sky's season passes and 22% of event sales are gifts between players. For Boogle, that means no destructive actions on other players' crops that the owner can't undo, and dramatic water events come from the *environment*, not from players.
- **Shared vs. separate economies are contentious.** Stardew Valley's 1.4 update added a choice between shared and separate money. Community threads show shared wallets breed resentment ("I just don't like using money that I didn't earn"). In a game with drop-in visitors, keep the *garden* communal and keep rewards (cosmetics, ball skins, seeds) personal.

## 2. Precedents where water drives farming or play

| Game | Mechanic | What Boogle should borrow |
|---|---|---|
| **Minecraft** | Farmland is hydrated if water is within 4 blocks horizontally (a 9×9 area) at the same level or one above. Water flows 7 blocks on flat ground. Two adjacent source blocks create new sources ("infinite water"). | A readable, discrete hydration radius players can *see* (dark soil). Short flow distances so channels need care. A "spring" rule players can discover. |
| **Timberborn** | Droughts stop all water sources. Badtides turn sources toxic. Irrigation radius shrinks with elevation gain. Dams, floodgates and levees store water. Update 6 "Wonders of Water" (October 2024) moved to a 3D water simulation. | A weather cycle that makes *stored* water valuable, a reason to build dams *before* the drought, and contaminated "salt tide" water that crops must be walled off from. |
| **From Dust** | Pick up and drop balls of sand, water and lava. Water flows downhill and erodes sand but not rock. Vegetation grows near water and slows erosion. Tsunami and eruption cycles that the player can anticipate. Eric Chahi likened it to "a sandcastle game". | The *sandcastle-vs-tide* fantasy, a perfect fit for a beach. Erosion of sand dams, plants stabilizing soil, telegraphed natural events. |
| **Noita** | Falling-sand cellular automaton in 64×64 chunks with dirty rectangles; only changed cells update. Multithreaded in a checkerboard of chunks. | Sleep settled regions (dirty rectangles / active-cell lists). The single biggest performance win. |
| **Sandspiel** | Browser falling-sand toy (Rust → WASM) with elements like sand, water, seed, plant, fungus and lava; seeds grow into plants when watered. Shareable creations gallery. | Plants that grow *from* the simulation itself. Sharing snapshots as a social feature. |
| **Factorio** | Deterministic lockstep: sends only player inputs rather than networking the state. A desynced client re-downloads the map. | Sync inputs, not fluid. Add a checksum and resync from a snapshot when clients disagree. |

## 3. Ranked idea list

Fun potential (★ out of 5) and difficulty are design judgments, not playtest data.

| # | Idea | What it is | Fun | Difficulty |
|---|---|---|---|---|
| 1 | **Sandcastle vs. Tide (co-op)** | Every few minutes a telegraphed tide rises across the beach. Players pile sand to shield the garden. The ball can be thrown to knock down a weak wall and release a flood into a dry bed. | ★★★★★ | Medium |
| 2 | **Irrigation channels → hydration glow** | Dig trenches from a freshwater spring to seed plots. Soil within N cells of water darkens and crops grow only when hydrated. A shared engineering puzzle. | ★★★★ | Medium |
| 3 | **Persistent communal garden** | Plots persist. Anyone can water anyone's plants, and each *distinct* visitor who waters a plant today adds a growth bonus. Show "watered by 3 friends" sparkles. | ★★★★★ | Easy–Medium |
| 4 | **Buoyant ball + splash** | The ball floats and slows in water. Ball impacts on water spawn splashes that *wet adjacent soil*, so a good throw waters the garden. | ★★★★ | Easy |
| 5 | **Water polo / pond keepy-uppy** | Light competition in a dug pond with sand-gate goals, or a co-op keepy-uppy streak counter that persists as a high score. | ★★★★ | Easy (on top of #4) |
| 6 | **Drought/rain weather cycle** | Rain refills ponds, drought evaporates puddles. Players who dammed a reservoir keep the garden alive. | ★★★★ | Medium |
| 7 | **Salt tide** | An occasional salty tide kills crops it touches unless walled off. Turns walls into meaningful co-op defense. | ★★★ | Medium |
| 8 | **Ball-powered water wheel / pump** | Throwing the ball into a bucket wheel lifts water uphill to a terrace. | ★★★ | Medium–Hard |
| 9 | **Harvest-and-launch** | Ripe melons and coconuts become throwable physics props. Toss them into a market cart for an island-wide score, or at each other. | ★★★★ | Easy |
| 10 | **Seed-cooldown "r/place garden"** | Each visitor can plant one seed every few minutes anywhere. The island becomes a slow collective flower mosaic. | ★★★ | Easy |
| 11 | **Mud and erosion** | Wet sand becomes mud (slippery, slows players); flowing water erodes unplanted sand; plants anchor it. | ★★★ | Hard |
| 12 | **Full 3D voxel fluid** | True 3D cellular-automaton water with overhangs. | ★★ for this game | Hard |

**Suggested first prototype:** ideas #4, #2 and #3 on a **64×64 heightfield**, with terrain as a height per cell and water as a depth per cell, updated by a simple deterministic column-flow rule at 10–20 ticks per second. Give players exactly three verbs (dig, pile, plant) plus the existing ball, one spring, a handful of plots, and hydration as a radius check. If people spontaneously dig a channel together and cheer when the water reaches the seedlings, the core works. *Then* add the tide (#1).

## 4. Technical feasibility

### Constraints you're working within (claude.ai era, mostly superseded)
- Artifact storage is text-only with a 20 MB limit per artifact, split into personal and shared pools. Unofficial sources describe per-key limits, rate limiting and last-write-wins with no compare-and-set or push.
- No official documentation of the claude.ai runtime "room" presence API was found.
- A third-party test found claude.ai artifact frames aren't cross-origin isolated, so no SharedArrayBuffer or WASM threads; Web Workers do work. WebGPU availability is undocumented, so feature-detect `navigator.gpu`.

These constraints don't apply to the PeerJS + self-hosted version, except that GPU and threading support still varies by browser.

### Recommended sync model: deterministic sim, synced edits, one snapshot writer
1. **Fixed tick clock.** Everyone agrees what tick it is. Weather and tide events are a pure function of tick + seed, so everyone sees the same tide at the same time.
2. **Edits as events.** Broadcast `{tick, cellX, cellY, op, playerId}` for dig, pile, plant, harvest and bucket. Clients apply edits at `tick + delay` (e.g. +4 ticks, ~200 ms). This is Factorio-style input sync.
3. **Integer-only fluid.** Water as integer units (0–255 per cell), a fixed update order and no floats, so all clients produce bit-identical results. Floating-point drift between browsers is the classic lockstep desync cause.
4. **Checksums + resync.** Every N ticks, compare a hash of the grid. On mismatch, adopt the authoritative snapshot (now: the host's).
5. **Ball stays owner-authoritative.** Its *effects* on the grid (splash wetting, wall knock-down) are emitted by the owner as ordinary edit events.
6. **Persistence.** One writer (now: the host) saves the garden snapshot, debounced (every 30–60 s and on `pagehide`). A 64×64 grid with height, water, soil moisture and crop stage is about 16 KB raw. Include `{tick, writerId}` and have joiners load the newest.
7. **Offline growth.** Store each crop's `plantedAt` rather than per-tick state. On load, compute growth from elapsed real time × hydration fraction, so the garden grew while you were away without anyone simulating it.

### Performance
- **Prefer 2.5D heightfield water to 3D voxels.** The virtual-pipes shallow-water model (Mei et al., "Fast Hydraulic Erosion Simulation and Visualization on GPU") connects each cell to its four neighbors through virtual pipes and handles erosion and sediment. A beach island has almost no overhangs, so 3D voxels buy little gameplay for a large cost.
- **CPU path (default):** one Web Worker running the integer column CA over 64×64 to 128×128 cells with an active-cell list (Noita's dirty-rectangle idea). Settled water sleeps. Post a `Uint8Array` of water depths to the main thread each tick and render with a displaced plane plus a shader.
- **GPU path (optional):** WebGL2 fragment-shader ping-pong between textures, as VoxelWorld does. GPU float results can differ across devices, so use the GPU for *cosmetic* water (waves, splashes) and keep the gameplay grid on the CPU.
- **Two-layer water:** gameplay water (coarse, deterministic, synced) plus visual water (fine, local, any method). Players can't tell, and sync stays trivial.

## Recommendations

1. Build the prototype above first. It tests the main hypothesis: shaping water together around a ball is fun. Skip a 3D voxel fluid for v1.
2. Make cooperation automatic, not negotiated: visitor-watering bonus, communal garden, environmental antagonists, no player-vs-player crop destruction.
3. Keep one light-competitive mode on the ball (water polo or keepy-uppy streak). Farming should never be mandatory to have fun.
4. Telegraph every water event 30–60 s ahead with a visible horizon wave or clouds.
5. Engineer for determinism from day one: integer water, fixed iteration order, seeded weather, periodic hashes.
6. Verify platform assumptions early (WebGPU, worker performance, storage write behavior).

## Caveats

- The Animal Crossing percentages are community data-mined/tested values reported by guide sites, not Nintendo documentation.
- Fun and difficulty ratings are design judgments, not playtest data. Validate with 2–4 real players quickly.

## Sources

- [PC Gamer: Townscaper's developer on "radically casual" design](https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/)
- [Gang Beasts wiki: Boneloaf](https://gangbeasts.fandom.com/wiki/Boneloaf)
- [ACNH flower breeding guide (mtmmo)](https://www.mtmmo.com/news/2219--acnh-flower-breeding-layouts--hybrid-cloning-guide-2026)
- [GameSpot: Animal Crossing hybrid flowers guide](https://www.gamespot.com/articles/animal-crossing-new-horizons-hybrid-flowers-guide-how-to-breed-flowers/1100-6475346/)
- [Digital Trends: crossbreeding flowers in Animal Crossing](https://www.digitaltrends.com/gaming/how-to-crossbreed-flowers-in-animal-crossing-new-horizons/)
- [Bell Tree Forums: have your friends water your flowers](https://www.belltreeforums.com/threads/want-more-hybrids-have-your-friends-water-your-flowers.517292/)
- [Minecraft Wiki: Farmland](https://minecraft.wiki/w/Farmland)
- [Minecraft 101: water handling](http://www.minecraft101.net/t/water-handling.html)
- [Timberborn wiki: Weather](https://timberborn.wiki.gg/wiki/Weather)
- [Timberborn wiki: Irrigation](https://timberborn.wiki.gg/wiki/Irrigation)
- [Wikipedia: Timberborn](https://en.wikipedia.org/wiki/Timberborn)
- [Timberborn drought survival guide](https://timberborn.org/articles/drought-survival-guide)
- [Surviving droughts and badtides in Timberborn](https://eatcreatesleep.net/how-to-survive-droughts-and-badtides-in-timberborn/)
- [Game Developer: The core of From Dust](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)
- [Wikipedia: From Dust](https://en.wikipedia.org/wiki/From_Dust)
- [Giant Bomb: From Dust](https://www.giantbomb.com/from-dust/3030-31722/)
- [GameSpot: From Dust first impressions](https://www.gamespot.com/articles/from-dust-first-impressions/1100-6273905/)
- [80.lv: Noita, a game based on falling-sand simulation](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation)
- [Notes on the GDC talk "Exploring the tech and design of Noita"](https://braindump.jethro.dev/posts/gdc_vault_exploring_the_tech_and_design_of_noita/)
- [Factorio wiki: Desynchronization](https://wiki.factorio.com/Desynchronization)
- [Factorio Friday Facts #188](https://factorio.com/blog/post/fff-188)
- [Factorio forums: multiplayer networking](https://forums.factorio.com/viewtopic.php?t=53851)
- [Claude Help Center: What are artifacts](https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them)
- [MDN: Navigator.gpu](https://developer.mozilla.org/docs/Web/API/Navigator/gpu)
- [Mei et al.: Fast Hydraulic Erosion Simulation and Visualization on GPU (PDF)](http://www-evasion.imag.fr/Publications/2007/MDH07/FastErosion_PG07.pdf)
- [Frozen Fractal: hydraulic erosion](https://frozenfractal.com/blog/2025/6/6/around-the-world-23-hydraulic-erosion/)
- [VoxelWorld (GitHub)](https://github.com/danielfvm/VoxelWorld)
- [webgpu-water (GitHub)](https://github.com/jeantimex/webgpu-water)
