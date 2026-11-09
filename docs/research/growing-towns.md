# Growing towns

_Research report, 2 November 2026. Towns that visibly grow from what the railway delivers: staging, procedural assembly, cargo causality, six-era identity, streets, shared history, kilometre-distance rendering and deterministic state. Reads the current audit picks in [decisions.md](../decisions.md), [DESIGN.md](../../DESIGN.md), [net.md](../game-design/net.md) and the [asset pipeline](../plans/asset-pipeline.md). Builds on [compounding-infrastructure.md](compounding-infrastructure.md), [construction-you-can-watch.md](construction-you-can-watch.md) and [era-progression.md](era-progression.md): those own the economic loop, construction rhythm and era language; this report owns the town assembled by them. Research and proposals, not implemented features or new owner decisions._

**Verification.** **[V]** means the source was fetched and the relevant words checked; for interviews, it identifies the developer's own account, not independent proof of the game's internals. **[S]** means a secondary explanation, search excerpt or inaccessible original; do not promote it to a verified implementation fact. **[I]** means a Boogle inference, proposed number or experiment. Repository observations are marked **[V, code]**. Developer interviews and official documentation provide most evidence below. No game was played, talk video watched, prototype run or iPad benchmark performed for this report; Apple's talk transcript was read. The distinctions follow [sea-crossings.md](sea-crossings.md).

## What this needs to prove

The owner's favourite part is “the trains substantively growing the town with the cargo.” That needs a visible causal chain: **a particular train brings a recognisable good; that good changes a particular place; the changed place stays and is worth visiting.** A larger population number, generic upgrade flash or new coat of paint cannot carry that promise alone.

The latest [decision log](../decisions.md) takes precedence over the earlier reports' eight-era proposals:

- Six eras: wood; steam; iron and harbour; diesel and concrete; electric; future. Key connections end eras. Goods overlap rather than becoming one new currency per era.
- Home becomes **a busy town at most**. Several towns grow; the mainland metropolis already exists. Reaching it does not turn every settlement into one.
- Players choose the order of preset connections, visit camps before connecting them, and still haul for each segment. There is no routing or quota-management job.
- Progress does not decay. While nobody is there, the network banks one project, then waits. Returning players must have something left to do.
- The next place prototype is Threefold Reach, `?proto=place`: a hub, gorge and two destinations; different cargo changes different parts of town. Rewards are excluded from its first pass. This checkout has no `src/proto/place/` implementation yet.

**[V, code]** [The existing net prototype](../../src/proto/net/index.ts) is a useful local demonstration, not a shared town system: it stores stage/wood/stone in localStorage, advances at six wood and six stone, and counts arrivals when its local crate animation lands. [Its town view](../../src/proto/net/town.ts) ripples at 13 m/s and delays the landmark by 1.1 s. [Its stages](../../src/proto/net/stages.ts) retain huts but reach a 48 m keep and a taller mast. Keep the clarity of its payoff; re-evaluate those heights against the newer busy-town cap. [Its box renderer](../../src/proto/net/boxes.ts) shares a box geometry in an `InstancedMesh`, disables frustum culling and uploads changed matrices; it is not a finished town renderer.

## Findings from games and their developers

### Townscaper and Bad North: constrain the big shape before decorating it

**[V, developer testimony]** In [Tommy Thompson's interview with Oskar Stålberg](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making), Stålberg describes the desired balance as predictable large shapes with variation in smaller details. He also distinguishes Bad North's ability to restart a failed generation from Townscaper's need to accommodate continued player editing; Bad North needed navigability heuristics, and curated seeds were considered. **[S]** The article's detailed reconstruction of Townscaper's WFC, marching-cubes ancestry and tile library is Thompson's technical account, not source code inspected here.

**[V, algorithm source]** [Maxim Gumin's original WaveFunctionCollapse repository](https://github.com/mxgmn/WaveFunctionCollapse) describes selecting possibilities and propagating local pattern constraints, with contradictions possible. That is evidence for a constraint mechanism, not a guarantee of a connected street network, good composition or a town's evolution through time.

**[I]** Use Townscaper's **predictable mass, surprising detail** principle. Author the station, main street, plaza, landmark and growth envelopes. Let deterministic assembly choose compatible roof ends, corners and awnings inside them. A WFC solver is optional tooling for producing candidate dressing layouts; bake and review accepted results. Do not run a solver over the whole town after a delivery: a legal new solution could move a favourite corner, close a route or change unrelated houses. Bad North's navigation concern is the important counterexample to treating attractive adjacency as a complete generator.

Talks worth inspecting during a generator experiment: [Konsoll's Stålberg archive, including Developing the Bad North Look](https://konsoll.org/speaker/oskar-stalberg/), and the interview's links to _Organic Towns from Square Tiles_ and _The Story of Townscaper_. **[V]** The listings were checked; **[S]** their audiovisual contents were not. No claim here depends on having watched them.

### Tiny Glade: procedural polish has an authoring and review cost

**[V]** In [Pounce Light's developer interview](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games), Ana and Tomas describe pipelines of specialised generators that create, assemble, morph and deform geometry. They also describe repeated interaction revisions, including five or six approaches to some UX problems, and starting glades with themes and buildings to prompt ideas. This is carefully designed proceduralism, not free variety from a general solver.

**[I]** Boogle should buy a narrower result: a wall meets a corner, a roof fits a known span, a door keeps a clear approach. Agent-produced variants are cheap; someone checking hundreds of street views is not. Require approved combinations and a deterministic fallback for missing sockets. Do not make arbitrary deformable buildings, automatic bridges and believable resident navigation prerequisites for the first cargo payoff.

### Islanders and Dorfromantik: composition is more valuable than asset count

**[V]** [Islanders developer Friedemann Allmenröder](https://gameworldobserver.com/2019/06/14/islanders) describes stripping back systems, procedural worlds that also surprised their makers, and physical building blocks used to communicate composition. Its score-based progression is not evidence for freight-driven construction. **[I]** Borrow the clustered shapes, gaps and readable relationship to the island; test compositions with simple blocks before expanding the kit.

**[V]** In [Timo Falcke's Dorfromantik interview](https://www.gamedeveloper.com/business/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-), the team describes procedural tiles and a landscape informed by idealised rural paintings, with life details that preserve calm. **[I]** Its lesson is coherent neighbourhood patches and useful negative space. Boogle's town needs recognisable roof groups separated by streets, gardens and water. Dorfromantik's overhead tile composition does not establish that its lanes would be pleasant or traversable at character height; Boogle must review both scales.

### Anno and Cities: Skylines: separate the visual tier from simulation progress

**[V]** Ubisoft's [Skyscrapers developer blog, available in its Season 3 archive](https://www.anno-union.com/category/season-3-en/), describes stackable modules with variants, five investor levels and three engineer levels, restrictions on stacking larger modules above smaller ones, and the challenge of making combinations work. The designs retain the underlying population classes' visual rules. The individual blog URL timed out during rechecks; the official archive supplied the text.

**[I]** Borrow compatible modules and identity constraints. Reject unlimited upward growth for this brief. Most late-era change should be a better station, a busier market and small public works inside an established outline. Anno's explicit combination problem is a warning: modular production moves work from making assets to reviewing combinations.

**[V]** Colossal Order's [Cities: Skylines II zoning and signature-building diary](https://www.paradoxinteractive.com/games/cities-skylines-ii/features/zones-signature-buildings) separates zone types, architectural themes and signature buildings. Its five building levels do not require five appearances: visual changes occur at levels three and five. Themes also affect surroundings such as roadside props and markings.

**[I]** Give Boogle three major structural tiers per district and six lighter era presentations; do not demand six complete replacement towns. Design one signature landmark per settlement and coherent ground-level details. Keep the density cap explicit rather than letting a later era imply apartment towers. None of the population, rent or abandonment simulation is needed for this lesson.

### Transport Fever 2 and A-Train: cargo needs a visible destination

**[V]** The [Transport Fever 2 town manual](https://wiki.transportfever2.com/doku.php?id=gamemanual:towns) describes growth through new or larger buildings, transport access and cargo supply, with residential, commercial and industrial areas. Cargo destinations therefore have spatial meaning. It does not establish a one-box/one-building animation contract.

**[V]** Artdink's [A-Train Express+ development manual](https://www.artdink.com/manual/aexpplus/english/about02/about02.html) explicitly links development to people flows, materials and power, including factory materials transported to containers by freight. These are stronger precedents for the premise than a cosmetic city that grows just because time passes.

**[I]** Make the receiving yard expose the causal link that a broad city simulation can leave implicit: timber goes toward homes; stone toward the quay and civic ground; fittings toward workshops. A waiting foundation points at its material stack. Cargo advances a specific planned addition, with the train still present for the payoff. Do not copy demand percentages, land value or catchment bookkeeping into Boogle's HUD; the previous [infrastructure report](compounding-infrastructure.md) already addresses those economic comparisons.

### Banished and Timberborn: a building is a sequence plus usable points

**[V]** Shining Rock's [Banished modding documentation](https://shiningrocksoftware.com/game/mods/) specifies intermediate construction models, helper points for building, using and creating resources, and low-resolution walking surfaces. These are useful production contracts: an asset includes where actions happen, not just a finished mesh.

**[I]** Put delivery, entrance, construction and activity sockets in Boogle's kit metadata. A timber stack belongs at the workshop's actual working edge. The arrival path and final doorway must agree; the animation cannot end with a door buried in a wall.

**[V]** Mechanistry's [Timberborn Update 6 announcement](https://store.steampowered.com/news/posts/?appids=1062090&enddate=1720701633&feed=steam_community_announcements) gives wonders five visible construction stages and describes advanced structures as much larger and more expensive than ordinary buildings. It also adds overhangs and increased vertical construction freedom.

**[I]** Reserve the longest multi-stage assembly for Boogle's one landmark. Regular changes should be short and readable. Vertical stacking is an expressive option, not the default measure of success: a finished Boogle town should have more usable edges and activity without becoming a Timberborn megastructure. Detailed construction timing belongs to [construction-you-can-watch.md](construction-you-can-watch.md).

### Kingdom Two Crowns: permanence creates attachment

**[V]** In [Thomas van den Berg and Gordon van Dyke's interview](https://www.gamedeveloper.com/design/-i-kingdom-two-crowns-i-and-the-practical-intersection-of-pixel-art-and-roguelike-design), the developers describe players' attachment to their kingdoms and the satisfaction of more permanent building as influences on Two Crowns. Van den Berg also discusses the panoramic quality of movement through its world.

**[I]** Preserve recognisable early structures along the route the train repeatedly passes. The original station shelter can become the old platform beside the new one; the first cottages can remain beside the square. A returning player should recognise a place and identify its additions. Boogle's no-decay principle excludes Kingdom's threats and loss mechanics; the transferable lesson is attachment through retained work and repeated views.

### Animal Crossing and Dragon Quest Builders: leave room for people

**[V]** Nintendo's [Animal Crossing: New Horizons update announcement](https://www.nintendo.com/us/whatsnew/animal-crossing-new-horizons-expands-into-new-waters-with-a-free-update-and-paid-expansion-on-nov-5/) describes group stretching in the plaza and donations that bring shops to Harv's island. **[I]** A plaza is valuable because people can repeatedly do things together there. Keep Boogle's square open through every era; more progress should improve its edges and opportunities, not consume its floor with the biggest building. This is a proposal, not a claim about Animal Crossing's town-generation algorithm.

**[V]** Nintendo's [Dragon Quest Builders 2 description](https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/DRAGON-QUEST-BUILDERS-2-1514364.html) describes villagers helping with blueprints when supplied and using furnished rooms. In [Square Enix's interview with producer Takuma Shiraishi and architect Kaito Hidaka](https://www.jp.square-enix.com/column/detail/29/) (Japanese; paraphrased here), room size, luxuriousness and atmosphere matter to residents' preferences.

**[I]** Completion should create an activity, not just a facade: a bench people use, a platform to wait on, a market stall that opens. Start with fixed Local activity points and a few cosmetic residents. Do not promise a household needs simulation, interiors for every house or workers whose pathfinding controls the railway. Helpers remain undecided in the owner's log.

### Minecraft villages: identity lives in the kit and its terrain relationship

**[V]** Mojang's [Village & Pillage release notes](https://www.minecraft.net/en-us/article/village---pillage-out-java-) describe village styles adapted to biome climate and resources, plus the jigsaw generation system and structure data. This supports assembling themed structures. It does **not** show villages autonomously constructing new houses from delivered goods.

**[I]** Take the distinction between a shared village grammar and local materials: the same Boogle recipe can produce a low harbour shed, a stepped quarry workshop or a timber arcade. Bind major differences to the site and its history, not a new random palette every era. Changing seed must not reshuffle an established town.

## A town people can read, then walk through

### Design three scales of evidence

**[I]** Review every addition at three distances, with the same state and without UI:

| View                             | What must read                                             | What should carry it                                                                        |
| -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1.2–1.5 km, from the line or hub | Which town; whether a major district has appeared          | Terrain silhouette, three roof masses, broad landmark, open gaps                            |
| 150–350 m, approaching by train  | Which part grew and what goods it uses                     | New quay edge, workshop gantry, roof cluster, station canopy; delivery yard visible         |
| 5–40 m, on foot                  | What arrived, what is building, where to go and what to do | Stock stacks, named sockets, open doors/awnings, clear paving, residents at activity points |

A roof becoming slightly shinier is a close-view improvement. Do not pretend it is a kilometre-distance milestone. At a 62° vertical field of view and 900-pixel drawing-buffer height, projected height is approximately `900 × objectHeight / (2 × distance × tan(31°))`. At 1.2 km, a 24 m landmark is about **15 pixels** tall, an 8 m house about **5**, and a 140 m-wide town about **87** pixels across when its width faces the camera; at 1.5 km those become roughly 12, 4 and 70. These are geometric estimates, before fog, terrain occlusion and antialiasing, not measured screenshots. Lower dynamic resolution shrinks them further.

Start with a 120–160 m town envelope, ordinary roofs at 6–12 m and one landmark no higher than 24–30 m, at least 10–14 m wide in its important silhouette. Preserve two substantial gaps between roof masses. A wider clock hall or crane frame will survive better than a needle spire. Site it against sky or contrasting hillside from the actual hub and rail windows. A horizon proxy cannot make a town visible through a ridge: the eastern plateau/sightline concern in [decisions.md](../decisions.md) is a level-design problem first.

### Author the skeleton; assemble the infill

**[I]** Each town gets a small manifest: immutable station origin, street graph, plaza polygon, landmark envelope, reserved growth plots and three inspection cameras. Each plot names allowed footprints, approach clearance, material family, construction sockets and ordered additions. Runtime assembly selects among approved small variants using stable `(townSeed, plotId, partId)` inputs. Appending a plot never consumes a global random stream that reshuffles older plots.

| Approach                                       | What it saves                    | What still needs review                                                    | Fit here                                            |
| ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Whole authored town per era                    | Runtime complexity               | Every swap, sightline, street and continuity break; repeated geometry work | Useful reference compositions, too much replacement |
| Unrestricted procedural town/WFC               | Manual placement                 | Seed failures, connectivity, combinations, every growth transition         | Poor first investment                               |
| Authored street/plot plan plus constrained kit | Layout stability; reusable parts | Approved sockets, sparse/full district extremes, new transitions           | Recommended                                         |

Three towns × six era presentations × three cameras already means **54 review frames**, before transition and cargo-order cases. That is a review-cost estimate, not an instruction to generate 54 new assets. Add the timber-only, stone-only and fully supplied extremes of each district at its first approval; avoid promising that checking the fully built town covers sparse states. Generate a contact sheet in the existing asset workflow, reject bad combinations once, and freeze the approved manifest. New assets do not justify new arbitrary combinations automatically.

### Keep identity across six eras

**[I]** Give each settlement four invariants: terrain relationship, street outline, roof rhythm and landmark family. Suggested briefs, subject to the Threefold Reach layout:

| Town character                | Invariants                                                                | Cargo changes                                                             | Walking character                                |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| Home, a sociable station town | Open square; broad low roof groups; clock hall; original shelter retained | Homes gather around the square, then market and platform edges fill       | Station → square → overlook → old platform loop  |
| Quarry terrace town           | Stepped stone ground; retaining walls; squat hoist silhouette             | Stone makes public terraces; fittings extend a workshop court             | Ramps and short stairs return to one main street |
| Harbour town                  | Long horizontal quay; narrow gables; crane frame; water left visible      | Timber adds sheds; stone lengthens quay edge; fittings add working gantry | Waterfront promenade with a short inland return  |

These are proposal names and compositions, not additional approved islands. They share construction logic, ordinary modules and materials. They differ in silhouette, adjacency and terrain before colour is added. The mainland remains the fixed metropolitan contrast.

| Era                 | Cargo-built presentation to try                                        | What remains recognisable                             |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Wood                | Timber frames, low pitched roofs, small unloading deck                 | Four founding cottages, station location, open square |
| Steam               | Workshop lean-tos, water equipment, platform shelter                   | Old roofline still visible beside additions           |
| Iron and harbour    | Crane frame, trusses, quay equipment                                   | Landmark's base and the same waterfront/street gaps   |
| Diesel and concrete | Paved yard, retaining edges, low station annex                         | No demolition of the old station; no housing towers   |
| Electric            | Catenary at the railway, slim platform canopies, tidy service cabinets | Same town silhouette with a legible new railway edge  |
| Future              | One coherent terminal attachment and refined public furniture          | Busy town capped; heritage structures still in use    |

These are **eligible additions**, not an automatic town-wide reskin when an era flips. The key connection unlocks a kit family; deliveries build the additions. The future train is not assumed to be a monorail. Electricity is not a promise that a previously polluted world suddenly clears. Both would overstate current decisions.

### Walkable means useful streets, not compulsory interiors

**[I]** Start with a 6–8 m main street, lanes at least 4 m wide and a roughly 20 × 24 m clear plaza. These are blockout hypotheses to test with the actual avatar, camera and carrying tools. Reserve entrance and turning clearances in the manifest; check the complete route in every sparse and full state. Keep the cargo yard within about 15 m of the first payoff and visible from the arriving train.

Offer a 30–60 s loop from station through square to an overlook and back, with three reasons to stop: see the next build and its stock; meet friends or The Boogler where applicable; use an existing optional toy or sit/watch from a useful edge. Add an occupied stall or workshop activity only after the view has proved worthwhile. Do not introduce a mayor, required shop economy, new rewards or room-management chores into the first place test. Preserve The Boogler's existing copy.

Keep physical routes stable during assembly. In the first prototype all future building footprints already have a low plinth or fenced envelope; public paving and the walking loop exist from the start. Construction adds visuals inside those envelopes, so a late-loaded roof cannot trap a player. A later delivery that opens a genuinely new walkable deck needs shared completion timing and safe collider activation; that is additional state design, not something Local animation may decide.

## Make each kind of cargo leave a different mark

**[I]** Goods should describe geography rather than just progress bars:

| Good family     | Permanent place it improves            | Close evidence                                   | Distant evidence                                            |
| --------------- | -------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Timber          | Homes and their shared porches         | Planks enter a frame; old cottage stays          | A new low roof group                                        |
| Stone           | Quay, square edges, civic terraces     | Blocks fill a footing; a useful edge opens       | Wider stepped base and civic mass                           |
| Metal/fittings  | Workshop quarter and freight equipment | Crate of fittings becomes joints, hoist or truss | A broad gantry/workshop outline                             |
| Food/provisions | Market and gathering places            | Stall stock, open awnings, seated residents      | A concentrated canopy group, mostly an approach-view payoff |
| Service parts   | Station attachments in later eras      | Platform equipment and shelter assembly          | Longer station profile, later catenary/canopy               |

Only timber and stone are required for the first prototype. The other families are placeholders for a later approved cargo catalogue, not a request to add five resources now. Food unlocks a lasting public amenity; it does not introduce hunger, expiry or town regression. Early goods continue to matter beside later ones.

Construction should tell the same story at every distance. Try a roughly **8–10 s ordinary addition**: unloading/stock acknowledgement in the first second; scaffold/frame during the next two; wall and roof assembly through the middle; usable-looking finish at the end. Reuse the phase vocabulary and piece rhythm from [construction-you-can-watch.md](construction-you-can-watch.md) and [hut-blueprint.ts](../../src/render/hut-blueprint.ts). This report adds the spatial rule: the sequence travels **yard → receiving plot**, changing one or two plots at a time. Do not sink the whole old town before replacing it.

Near the player, show a few travelling pieces and the scaffold. At medium distance, show the same plot's coarse frame-to-roof change. At far distance, update its silhouette once enough mass exists to read; omit subpixel flying pieces. The animation is Local and may be skipped by a late joiner. The permanent result cannot depend on watching it. Ordinary trains after a district reaches its cap can unload and animate existing life; they must not quietly restart infinite structural growth.

### Shared work leaves evidence without assigning the town to its fastest player

**[I]** Retain the first manual track section, early station shelter and founding cottages as physical history. The completed square can carry a small shared project record naming everyone who helped, with equal marks grouped together rather than an ordered list. No largest-contributor statues or leaderboards. A later personal cosmetic could occupy a designated harmless socket, but it is outside the rewards-free prototype.

Delivery totals alone cannot identify contributors or reconstruct arrival order. If attribution is wanted, record a bounded contribution set alongside the relevant project/network record, reusing the identity conventions in [roster.ts](../../src/world/rules/roster.ts). Distinguish people who built the supply link from an automatic train's nonexistent “deliverer.” Do not invent attribution from whoever happened to be online when it arrived. On returning, one newly completed piece plus its retained stock/shape is enough evidence of activity; a historical animation replay is optional, not authoritative.

## Deterministic town state; Local presentation

**[I]** The compact contract is:

`townShape = deriveTown(fixedLayoutVersion, townSeed, acceptedDeliveryCountsByGood, unlockedEra)`

For fixed layout, seed and era, the **same integer counts produce the same plots, modules and structural tiers**, regardless of delivery order, frame rate, client hardware or whether anyone watched. A single global stage integer loses the timber-versus-stone distinction. Save the small shared inputs; derive settled geometry. Keep contributions separately if implemented. Do not save three.js objects, per-piece animation progress or thousands of roof transforms.

There are four implementation traps:

1. **Counting a cosmetic arrival.** The `land` callback in [proto/net/index.ts](../../src/proto/net/index.ts) is acceptable for its Local proof only. Production delivery must come from validated shared railway/timetable state, with a trip/consignment identity or equivalent deterministic cursor preventing duplicate credit. An empty train visual, reconnect or replay must not mint materials. Inspect the future rail contract before choosing an op; do not let every observer submit an arrival.
2. **Spending one delivery several times.** Give each ordered addition a disjoint reservation slice of its good's cumulative count. Housing thresholds 6, 18 and 36 mean incremental costs 6, 12 and 18, not three independent purchases paid from the same first six planks. For mixed recipes, preassign slices of each good to fixed project IDs; completion requires all slices. Do not allocate by first-arrival timing if order-independent town shape is the promise. The initial one-good district branches avoid that complexity.
3. **Confusing era with volume.** Cargo cannot infer that the owner-selected key connection is complete. Read the shared era/link unlock as another input. Existing structures remain; eligible reserved additions appear as their counts are met. Fixed layout/version and seed are configuration, not an excuse for a per-peer choice.
4. **Letting absence fill the entire town.** Enforce the owner's one-project absence allowance at the supply/admission boundary, before growth counts advance. Cargo beyond that allowance remains upstream or in explicitly accounted stock. Separate stock from accepted construction counts if needed; do not derive unlimited town growth from lifetime shipments, then merely hide the extra buildings until somebody logs in. The absence allowance is real shared state and is not recoverable from a count alone.

Promotion would follow the [rules recipe](../../src/world/rules/README.md): proposed `src/sim/towns.ts` for pure derivation and meaningful determinism/conservation tests; proposed `src/world/rules/towns.ts` for saved counts, validated deliveries and versioned state; one appended rule registration; proposed `src/features/towns.ts` as a small adapter. These paths do not exist yet. Integrate with the rail owner rather than creating a second timetable. Match [net.md](../game-design/net.md), [the sync contract](../../src/world/README.md) and [entity lifecycle plan](../plans/entity-architecture.md): a town or quarter can own view lifetime, not one entity per roof tile.

`apply` updates state only. The adapter's `onApplied`/`onAfterTick` observes a derived revision and presents live deltas; `onSnapshot` constructs the current settled town directly. A late join must not replay old collider changes, spend inventory again or spawn minutes of historical construction. Check the existing [sites rule](../../src/world/rules/sites.ts) for result ownership and credit only accepted edits. Local dust, bounce, scaffold wobble, cosmetic resident schedules and audio may vary. Anything that changes a walkable route or gameplay interaction reads the shared structural result.

Test the contract, not the picture: reordered admissible deliveries give the same structure; duplicate consignments do not increase counts; counts and reservation costs conserve cargo; sparse/large inputs validate; snapshot/load reproduces the same derived structure; era changes preserve older plots; absence admits at most its allowance. Once this becomes a real shared system, a targeted multi-peer scenario should verify live and late-join agreement. This research task adds none. A generator/catalogue change can change the meaning of old counts: use the state's version/migration or a documented `WORLD_NS` break under [AGENTS.md](../../AGENTS.md), never silently reinterpret saves.

## Rendering a town from the platform and beyond a kilometre

### First fix the visibility contract

**[V, code]** [constants.ts](../../src/constants.ts) sets ordinary fog to 110–520 m. [sky.ts](../../src/render/sky.ts) reapplies it every frame. [scene.ts](../../src/render/scene.ts) starts with camera near/far 0.1/1500 m, a local directional-shadow box and one HDR render pipeline. Raising `camera.far` alone will not reveal a town hidden by opaque fog. The [crossing sky adapter](../../src/proto/crossing/sky.ts) already overrides both camera range and outdoor fog; [its tuning](../../src/proto/crossing/tuning.ts) uses 3600 m fog-far for the 1.2 km crossing.

**[I]** The place prototype needs a coherent outdoor distance policy, borrowing that seam rather than fighting the sky loop from multiple features. Start by retaining a readable far-town contrast at 1.5 km and a camera far plane around 3–4 km for the test. Match terrain, water and town atmospheric treatment; do not make only the town ignore fog. Check the desired horizon in day, dusk and actual approach angles before increasing geometry detail. Avoid a separate camera or render pipeline merely for the town. Do not widen the shadow camera to a kilometre: far proxies need no real-time shadows.

### Use the engines' hierarchy, with much less machinery

**[V]** [Unity's LODGroup](https://docs.unity3d.com/6000.0/Documentation/Manual/class-LODGroup.html) chooses levels by relative screen size and can render both during a crossfade. [Unreal's World Partition HLOD](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine) provides proxy representations for unloaded cells, with instancing, merging and simplified meshes. [Godot's visibility ranges](https://docs.godotengine.org/en/stable/tutorials/3d/visibility_ranges.html) support replacing groups of nearby detail with a coarser representation, with hysteresis/fading options.

**[I]** Boogle needs the same distinction between _detail not loaded_ and _place no longer visible_, but only a few town manifests and proxy meshes, not a general World Partition system. Keep every relevant town's tiny structural summary and far proxy resident. Load close geometry/props separately. Build the proxy from the same plot result as the near view so unusual cargo mixes do not show a false fully developed skyline. Proxy swaps must preserve roof heights, landmark position and major gaps.

### Batch by repeated geometry, material and space

**[V]** [three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) shares geometry/material across instances; updates need the appropriate flags and bounds maintenance. [BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html) accepts different geometries with common material requirements and supports per-object culling. But in the installed **three.js r187**, the [WebGPU backend](https://raw.githubusercontent.com/mrdoob/three.js/r187/src/renderers/webgpu/WebGPUBackend.js) loops over a batched mesh's merged draw ranges and issues draw commands for them. This was also checked in the local installed source. **A BatchedMesh is not evidence of one WebGPU draw call.**

**[I]** Use `InstancedMesh` for repeated modules; merge settled unique pieces by material within spatial chunks when that reduces actual draws. Keep compatible node materials and instance colours. A glTF clone sharing resources, as in [the asset pipeline](../plans/asset-pipeline.md), is not automatically an instanced draw. Group by roughly 32–48 m quarters initially; avoid one giant town bound that keeps every detail visible, and avoid one draw per tiny prop. Recompute bounds on structural changes; do not carry `frustumCulled = false` forward from the box proof. Freeze settled instance data and rebuild only dirty quarters, rather than uploading every building matrix every frame.

Use three representations, with distances only as starting points. Screen size and camera framing ultimately decide the change; use about 10–15% hysteresis so riding past a threshold does not chatter. [three.js LOD](https://threejs.org/docs/pages/LOD.html) offers distance levels and hysteresis; it does not itself stream assets, remove physics or create a town proxy.

| Representation | Starting distance                  | Incremental main-pass draws per town | Visible triangles per town | Dynamic shadow draws | Contents                                                                |
| -------------- | ---------------------------------- | -----------------------------------: | -------------------------: | -------------------: | ----------------------------------------------------------------------- |
| Near           | 0–120 m                            |                                  ≤24 |                   ≤120,000 | ≤8, near player only | Buildings, readable sockets, a few props/residents, active construction |
| Middle         | 120–450 m                          |                                   ≤8 |                    ≤20,000 |                    0 | Grouped roofs/walls, large equipment, coarse construction               |
| Horizon        | 450–2000 m, kept longer if visible |                                   ≤2 |                     ≤2,000 |                    0 | Opaque roof masses, civic base and landmark; no windows/props/NPCs      |

**[I, unmeasured budgets]** These are proposed **town-only** ceilings, not M4 capability claims or whole-game budgets. One near town and two distant towns would add at most 28 main-pass draws under this allocation; a transition may temporarily add the middle tier's eight. Shadows and any extra passes count separately. Include construction and residents within the near allocation, or report the overage. Prefer a clean, well-aligned swap first; use a short TSL transition only if the pop is visible, and measure its double rendering/overdraw cost.

Keep ordinary town surfaces opaque, vertex-coloured or on a shared small atlas, with baked/contact shading where useful. Do not put a point light in every window or a transparent layer over every wall. Begin with no more than eight Local cosmetic residents and one active construction presentation with at most 64 moving pieces near the viewer. These are reviewable limits, not claims that an M4 cannot draw more. Distant activity can be a single crane movement or grouped canopy movement when it occupies enough pixels.

**[V, code]** [dev/assets/build.ts](../../dev/assets/build.ts) defaults to 1 MiB per asset, 12 MiB total and a 1024 texture limit; per-asset sidecars can override individual settings. Those are existing pipeline budgets across its assets, not allowances for each town. Share the kit and materials across towns, load near-only pieces lazily, and keep tiny code-built horizon masses eager. Use the pipeline's compressed outputs; check decoded memory as well as transfer size. Dispose/reuse superseded chunk buffers rather than accumulating every historical tier.

### What must actually be measured on the M4 iPad Pro

**[V]** Apple's [WWDC21 “Optimize high-end games for Apple GPUs” transcript](https://developer.apple.com/videos/play/wwdc2021/10148/) recommends choosing metrics and targets, finding the real bottleneck, making limited changes and measuring again. Its native Metal examples do not provide a portable Safari triangle or draw-call limit. The existing [webgpu-on-ipad.md](webgpu-on-ipad.md) covers browser/device constraints; this report does not replace it.

**[I]** Start with a 60 Hz/16.7 ms frame target, and provisionally allow the town at most 2 ms additional GPU time and 0.5 ms main-thread update time in a representative baseline comparison. These allocations may be wrong; record them as hypotheses until device captures exist. GPU and CPU overlap, so do not add their timings to claim frame rate. At minimum record drawing-buffer size, DPR/adaptive resolution, browser/OS, town state, camera and thermal duration. An M4 label without these is not a repeatable test.

Run the same seed and camera route with/without towns: platform at 30 m, approach at 300 m, hub/line views at 1.2 and 1.5 km, then the approach at 50 m/s. Include three visible towns, eight players and a construction event; inspect both day and dusk. After a roughly 15-minute session, report frame-time percentiles, stalls on first construction/LOD transition, renderer counts, memory where available, and graphics errors. Use `npm run counts` for counts and `npm run perf` for an isolated-machine comparison; a Mac run is not an iPad result. Use the existing `look` harness for inspected stills and real-time motion, then verify actual Safari on the target iPad.

Preload distance should depend on speed and measured load time: `speed × p95(load time) + safety margin`. At 50 m/s and an assumed two-second load, that is at least 100 m plus margin. This is an example, not a measured load time. Near geometry, interactions and colliders must be ready before arrival, while the horizon proxy has been visible throughout. The full map need not keep all near geometry or Rapier bodies alive merely to show a distant town.

## Starting stage table and kit

### District tiers, not a single serial town level

**[I]** Use the following cumulative thresholds for the first **expanded** town experiment. Each column advances independently. Rows are useful reference profiles for art review, not a requirement to finish timber before stone or every district before the era can advance. A mostly stone town is a valid state. Units mean accepted cargo units; train capacity/headway must be tuned separately, not inferred from this table.

| Structural tier             | Timber → homes                                  | Stone → civic ground                                 | Fittings → works               | Provisions → market         | Service parts → station     | Plot count if all columns reach this tier |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------- | ------------------------------ | --------------------------- | --------------------------- | ----------------------------------------: |
| 0: founding place           | 0: four cottages                                | 0: reserved civic plots and clear square             | 0: reserved yard               | 0: clear market edge        | 0: one station shelter      |                                         5 |
| 1: first distinct additions | 6: two more cottages                            | 6: one quay/pump court                               | 6: one freight shed            | 2: one stall                | 6: one platform shelter     |                                        11 |
| 2: neighbourhoods           | 18: two more cottages, eight total              | 18: two further civic plots                          | 18: two further workshop plots | 6: second stall             | 18: one station service bay |                                        19 |
| 3: busy town cap            | 36: porches/upper rooms, still eight footprints | 36: final civic plot/landmark completion, four total | 36: fourth workshop plot       | 12: third and fourth stalls | 36: fourth station plot     |                                        24 |

The cap is **24 occupied structure plots**: eight homes, four civic, four workshops, four market stalls, four station structures. A “plot” includes a small stall or shelter; it does not imply 24 large houses. Public streets and the square stay empty of buildings. Tier-three housing improves its existing footprint. Ordinary buildings remain mostly one or two storeys; only the one landmark approaches the height envelope. Late eras change attachments and activity more than bulk. Future recipes may need more than one good, but the first test should prove material-specific shape with independent branches.

These thresholds total 36 timber, 36 stone, 36 fittings, 12 provisions and 36 service parts at full structural cap. They are not an eight-hour progression balance and must not become a reason to add grinding. Tune the rate of automatic supply and the number of meaningful additions after seeing the rail journey. If the town tops out early, give later goods useful station/public-space improvements within the cap; do not secretly raise it.

### Kit list: prove twelve pieces before producing a catalogue

**[I]** The smallest visual proof uses **six plot envelopes, two goods and four reviewed configurations**: founding place, timber-only, stone-only and both. Begin with three cottages and one station, reserving one plot for a new home and one for the civic/quay addition. Try both connection orders. This is a reduced subset of the expanded table, not all 24 plots built at miniature scale.

| First kit                                          |  Count | Contract                                                                              |
| -------------------------------------------------- | -----: | ------------------------------------------------------------------------------------- |
| Foundation/plinth, wall bay, wall corner, door bay |      4 | Common grid/sockets; door clearance; simple stable collider envelope                  |
| Roof span and roof end                             |      2 | Shared pitch/eaves; no arbitrary intersections                                        |
| Scaffold bay and material stack                    |      2 | Build sockets and phases; stack appearance identifies wood/stone                      |
| Quay/terrace segment                               |      1 | Fits reserved civic edge; walking surface pre-exists in the first proof               |
| Station/market canopy                              |      1 | Broad readable silhouette; supports leave the path clear                              |
| Landmark base and cap                              |      2 | Distinct wide silhouette visible from the chosen distant camera                       |
| **Total**                                          | **12** | Code-built geometry first; colour/transform variants do not require new source meshes |

Then add only what the approved composition needs: six era attachment sets (one coherent set per era, not six versions of every wall); three town manifests and landmark silhouettes using shared parts where possible; street straight/corner/ramp ground pieces; a small shared bench/crate/sign family; coarse middle/horizon geometry; simple collision volumes; activity points. Resident characters are a shared character system, not part of the architecture kit. Do not count a merged proxy as a free additional high-detail town.

Every module needs a stable ID, dimensions, pivot, socket names, allowed neighbours/variants, material slots, construction phase, LOD/proxy role and collider/clearance metadata. Keep mesh names stable for the [asset pipeline](../plans/asset-pipeline.md) and phase data compatible with [hut-blueprint.ts](../../src/render/hut-blueprint.ts). Images may dress a proved kit only through the existing human selection process; code-first blockouts need no new image-generation workflow.

## Numbered recommendations, with the smallest prototype for each

1. **Make each cargo improve a named district.** Serve “The rail builds the world” and “Telegraph everything”: timber grows homes, stone grows civic ground, later goods get other places. Touches [the next place test](../decisions.md), [find-the-fun steps 6–7](../plans/find-the-fun.md) and the reference [net stages](../../src/proto/net/stages.ts). **Smallest prototype:** two branch connections, six receiving units each, one house and one quay addition; try both connection orders without a HUD explanation. Pass when the player can point to which train caused which change.
2. **Author the street skeleton and constrain procedural infill.** Keep Townscaper's large-shape predictability; use seeds for small approved variants, not a rerolled town. Touches [the asset pipeline](../plans/asset-pipeline.md) and proposed place/town manifests. **Smallest prototype:** one station–square–overlook plan, six plots and the twelve-piece kit; inspect timber-only, stone-only and combined states at street and train height. Reject any blocked route or unrelated reshuffle.
3. **Keep structural growth, era unlocks and town identity separate.** Use independent district tiers, six attachment families and immutable heritage structures; cap the expanded town at 24 plots and one 24–30 m landmark. Touches [boogle-2's six-era/busy-town decisions](../decisions.md) and [net's existing large landmarks](../../src/proto/net/stages.ts). **Smallest prototype:** show one street at wood, electric and future, with the same founding cottage and station; verify it remains the same small town without labels.
4. **Give towns different silhouettes before different colours.** Home's square, a quarry terrace and a harbour frontage should share kit parts while retaining terrain, roof rhythm and landmark identities. Touches [the place layout brief](../decisions.md) and [asset assembly](../plans/asset-pipeline.md). **Smallest prototype:** three untextured town blockouts from one kit, viewed from the rail and from above; identify each in monochrome before producing more art.
5. **Carry the delivery from yard to plot in one short construction sequence.** Keep the existing phase vocabulary, preserve old buildings and localise change to one or two additions. Touches [town.ts](../../src/proto/net/town.ts), [hut-blueprint.ts](../../src/render/hut-blueprint.ts) and [construction research](construction-you-can-watch.md). **Smallest prototype:** one timber train, visible stack and roughly 8–10 s house assembly; inspect the arrival in real time at 20 m and 250 m, then join after it completes. No camera takeover or historical replay is needed.
6. **Protect a useful walking loop and an open plaza.** Growth should add places to stop while preserving clear routes and camera space; optional activities remain optional. Touches [the place prototype brief](../decisions.md), [hands.ts](../../src/player/hands.ts) and the [entity plan](../plans/entity-architecture.md). **Smallest prototype:** walk station → square → overlook → station in every growth state, carrying a tool with the normal camera; one bench/viewing edge and an existing toy establish whether the town invites a visit.
7. **Keep physical history and equal contribution traces.** Retain early huts/platforms and record shared participation without rankings or invented automatic-train ownership. Touches [roster.ts](../../src/world/rules/roster.ts), [sites.ts](../../src/world/rules/sites.ts) and the [owner's rewards-free first pass](../decisions.md). **Smallest prototype:** retain the first shelter in the final blockout; after the place test, mock one project plaque for three equal contributors without adding a reward economy.
8. **Derive the town from validated integer delivery counts.** Keep permanent structure Lockstep and presentation Local; enforce reservation accounting, deduplication, era eligibility and the one-project absence allowance before deriving it. Touches [the rules recipe](../../src/world/rules/README.md), [net.md](../game-design/net.md) and proposed `src/sim/towns.ts`/`src/world/rules/towns.ts`. **Smallest prototype:** a pure six-plot derivation exercised with reordered deliveries, duplicate trips and snapshot/load; then two peers plus a late join see the same settled result. Do this before promoting Local net counters.
9. **Keep a faithful town silhouette visible beyond one kilometre.** Fix the sightline, sky fog policy and camera range together; retain small proxies even while near detail is unloaded. Touches [sky.ts](../../src/render/sky.ts), [scene.ts](../../src/render/scene.ts), [crossing sky](../../src/proto/crossing/sky.ts) and the [eastern-plateau decision](../decisions.md). **Smallest prototype:** one landmark about 24 m tall and 10–14 m wide, plus three roof masses at 1.2 and 1.5 km, in day/dusk views and a real-time ride. Verify identity and a major growth change without a marker.
10. **Budget actual WebGPU commands and spatial batches.** Start at 24/8/2 town draws for near/middle/horizon, with shadows separate; instance repeats, merge settled unique parts and update dirty quarters only. Touches [boxes.ts](../../src/proto/net/boxes.ts), [render contract](../../src/render/README.md), [asset budgets](../../dev/assets/build.ts) and three.js r187's backend. **Smallest prototype:** six plots in one material family, compare raw meshes, instances and merged quarters with `npm run counts`; verify culling and that BatchedMesh is not hiding multiple commands behind one scene object.
11. **Make the M4 iPad and review time decide the final budget.** The proposed triangles, draws, 2 ms GPU delta and 0.5 ms CPU delta are hypotheses; review sparse states as well as the final town. Touches [webgpu-on-ipad.md](webgpu-on-ipad.md), [the asset pipeline](../plans/asset-pipeline.md) and existing `look`/`perf`/`counts` harnesses. **Smallest prototype:** one near town plus two proxies, a 50 m/s approach and an active build, compared to baseline on the actual iPad after a 15-minute session; log resolution, stalls and errors before expanding the catalogue.
12. **Prove the two-cargo town in the existing place experiment first.** Reuse the next approved test instead of starting an independent city-builder, WFC framework or six-era asset project. Touches [find-the-fun.md](../plans/find-the-fun.md), [decisions.md](../decisions.md) and, when implemented, [protos/protos.ts](../../protos/protos.ts). **Smallest prototype:** recommendations 1, 2, 5 and a reduced 9 in one playable loop: visit two camps, choose a connection, ride its goods home, watch a recognisable addition, walk through the result. The gut question is whether you want to connect the other camp to see what it does to this town.
