# Tree tiers: every swing should mean something

> **Verdict:** Every ordinary tree choppable with the first axe; finite trees.
> **Top recommendations:** 1. Make every ordinary tree choppable with the first axe. 2. Keep trees finite; let the proper axe improve familiar work.
> **Status:** adopted. See [The shape of the game](../decisions.md#the-shape-of-the-game), [plan trees-any](../plans/trees-any.md).

_Research report, 3 November 2026. Evidence for the owner's after-round-4 tree decision: harvest eligibility, natural visual differences, contact feedback and Threefold Reach's efficiency ladder. Live web research, source inspection at `70b871cc`, an offline replay of tree placement and economy-model sensitivities. No game changes, reference-game play session or new Boogle playtest; not tested on a device._

**Evidence:** **[V]** inspected repository code, recorded decisions or fetched primary text; **[S]** community documentation, player reports or search extracts; **[H]** interpretation, proposed tuning or model assumptions. Individual complaints demonstrate a failure mode, not its prevalence. “Works” below means a supported mechanism and its likely design benefit, not proof that all players liked it. Exact proposed milliseconds and sounds are Boogle hypotheses, not measurements of another game.

## Recommendation first

**[H] Make every ordinary tree choppable with the first axe. Keep trees finite, the 8→16 carry rung and the advancing construction front; make the proper axe improve familiar work.** Remove the bands and the decorative/harvestable distinction for ordinary trees. Start with existing planting, bills and axe numbers. Do not increase bills to buy back the minutes lost by fixing an incoherent world. The little guys should relieve travel that still exists, and spare the player repeated harvesting; their usefulness must be measured again.

**Fallback:** if a tool-gated promise is important to the owner, use one visibly different, optional hardwood species with an honest elastic rebound and a later, known axe payoff. Keep every ordinary conifer choppable and keep the great tree available to the starter axe. This is a capability gate, with Grant's objection still unresolved; it is not a cheap way to preserve the old walking times.

Serves [DESIGN.md](../../DESIGN.md) **1. Toys before chores**, **4. Cooperation is automatic**, **7. Telegraph everything** and **11. Show, don't tell**. Recommendations are evidence for a decision, not implementation authority.

## Decision context and what is actually built

**[V, brief]** The owner wants any tree to be attemptable, with consistent behaviour for trees that look alike; tougher species or colours are a possibility. Grant dislikes bands as yellow paint and dislikes needing another axe merely to chop a tree, but values the long walk that makes the little guys feel helpful. These are compatible on responsiveness and visual honesty, but differ on whether a hard tool gate is desirable.

The requested **3 November “after round 4” tree note is not present in this checkout's [decision log](../decisions.md#the-shape-of-the-game)**. This report treats the supplied brief as the current owner context; it does not pretend that the older “After round 4” multiplayer bullet records the tree decision. The log's 2 November direction and [round-4 plan](../plans/round-4.md#the-jobs-numbers-hypotheses) establish the relevant ladder: manual work → better axe → pack → closer materials → trains. Materials and upgrades supersede the older global-era plan.

| Inspected owner                                                                 | Round 4 at this commit                                                                                                                           | Consequence                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`layout.ts`: `GROVES`, `OAK`, `GREAT_TREE`](../../src/proto/place/layout.ts)   | Four groves of 5/7/8/7 trees, one oak, one great tree: **28 ordinary + 1 special**                                                               | These are the only tree records that chopping knows. `OAK` is a location/name, not a different biological or harvest class.                          |
| [`land.ts`: `buildTrees()`](../../src/proto/place/land.ts)                      | Seeded decorative placement, at most 400 accepted spots from 2,600 attempts; actual replay gives **362**                                         | Three instanced meshes draw these trees. No per-tree harvest record or trunk collider is created here.                                               |
| [`chop.ts`: `parts`, `makeTree`, `contact`](../../src/proto/place/chop.ts)      | Harvestable crowns use the same two cone geometries and green colours as land trees, with different vertical offsets/trunks and an orange ribbon | They are not identical meshes, but they share their species language. The owner's perceived sameness has a concrete code basis.                      |
| [`verbs.ts`: tree targets](../../src/proto/place/verbs.ts)                      | Iterates `TREES` only, while `job.awake`; reach 3.2 m ordinary / 4.6 m great; full back blocks ordinary chopping                                 | A decorative tree cannot receive a chop through this path. Silence is missing participation, not an existing “too hard” result.                      |
| [`layout.ts`: `TUNE`, `AXE2`, `PACK`, `GREAT`](../../src/proto/place/layout.ts) | Starter **5 hits × 2 logs**, proper axe **3 × 5**, carry **8→16**, great tree **12 hits → 1 beam**                                               | Nominal yields are 10/15 logs, with room-dependent losses discussed below. The great tree already offers effort without an axe gate.                 |
| [`ladder.ts`](../../src/proto/place/ladder.ts)                                  | Multi-axe at machine wake; proper axe after the first path; pack after forge frame; depot after Q1                                               | Before wake there is no axe. “Any tree” should mean any ordinary tree once equipped; moving the tool to spawn would be a separate onboarding change. |

**[V]** The 362 accepted decorative trees comprise **340 on the original land and 22 on Far Head**, so the whole-place stock is not all available before opening the sea route. Tree placement replay found only **one decorative tree within 35 m horizontally of the forge frame**, at 34.44 m; the next four are 37.18, 40.75, 42.17 and 42.31 m away. The existing oak is 14 m away. These are planar distances, **not walkable route lengths**: slopes, gorge and collisions can make them misleading. Still, the village is not an evenly packed forest, so universal chopping does not necessarily mean an infinite source beside each frame.

## What the reference games actually teach

### Minecraft: separate faster work from permission to harvest

**[V]** Mojang's dated [axe article](https://www.minecraft.net/en-us/article/taking-inventory--axe) describes chopping wood by hand and faster axes; its [pickaxe article](https://www.minecraft.net/en-us/article/taking-inventory-pickaxe) describes the stone→iron→diamond mining progression. Thus Minecraft's ordinary wood is a strong precedent for universal access with better throughput. Its ore ladder is a different contract, not evidence that different-looking trees need equipment locks. These articles predate later tool additions and are not an exhaustive current tier list.

**[S]** The [pickaxe reference](https://minecraft.wiki/w/Pickaxe) distinguishes breaking from successfully receiving a block: an inadequate tool can destroy some blocks without a drop. Visible cracking therefore need not promise harvest. A [player thread about first diamonds](https://www.planetminecraft.com/forums/minecraft/discussion/feeling-mining-your-first-diamon-298711/?reply_sort=oldest) includes confusion after mining diamond with stone and receiving nothing. Conversely, a [2019 first-player account](https://www.reddit.com/r/Minecraft/comments/bvxsf9/) describes a dramatic response to receiving a faster pick after extensive bare-handed digging. Both are anecdotes.

**[H] Boogle:** borrow the familiar tree becoming easier. Reject destructive failure without useful output. Bark/ore appearance tells the player what material they found; it does not, by itself, teach the invisible equipment threshold.

### Valheim: readable species, explicit refusal, physical surprises

**[S]** The conventional early route distinguishes beech/fir/pine from birch/oak; bronze opens finewood trees that refuse the starter axe with a “Too hard” message. White birch bark and oak's bulk make identification possible without a band ([tree table](https://www.valheim.tools/guides/trees), [documented refusal](https://attackofthefanboy.com/guides/valheim-how-to-get-fine-wood/)). This is not a claim that bronze is the only current route: recent [Early Axes discussion](https://steamcommunity.com/app/892970/discussions/0/572674734038274558/?l=dutch) reports an earlier alternative. Falling logs can also break trees through collisions; players teach this as a [creative early finewood route](https://www.reddit.com/r/valheim/comments/1vtqzyi/advice_without_spoilers/).

**[H] What works:** recognising a species, remembering it, then returning equipped creates a concrete promise. The collision workaround makes the world feel physically connected. **What is documented as troublesome [S]:** a [player's account of watching a newcomer](https://www.reddit.com/r/valheim/comments/1wh2h1k/) describes felling a tree, splitting the log once, receiving no wood yet and incorrectly concluding that logs required later processing. It is a second-hand observation, not a usability study. The payoff was too far from the first successful action for that player. This is stronger evidence against delayed material feedback than against all species gates.

**[H] Boogle:** retain the great tree's memorable fall, but keep ordinary logs arriving during chopping. Do not import damaging falling trees, stamina, durability or compulsory log reprocessing. A species gate also needs a reason in Boogle's material progression; “Valheim does it” does not resolve Grant's dislike.

### Stardew Valley: obstacle shape is clearer than arbitrary eligibility

**[S]** [Large stumps](https://stardewvalleywiki.com/Large_Stump) require copper and yield two hardwood; [large logs and hardwood sources](https://stardewvalleywiki.com/Hardwood) distinguish steel-required logs from mahogany/mystic trees that any axe can chop. Ordinary tree speed improves across [axe upgrades](https://stardewvalleywiki.com/Axes). The large obstacle is recognisably different from the small stump left after an ordinary tree. Crucially, **hardwood is not uniformly an axe-tier resource**.

**[S] Response and reception:** players in a [tooltips discussion](https://www.reddit.com/r/StardewValley/comments/1r8a44d/) identify the insufficient-strength message as a clearer upgrade signal than several other tools' benefits. A [hardwood discussion](https://www.reddit.com/r/StardewValley/comments/1xgzlp0/) complains about acquiring large quantities and recalls repeated Secret Woods visits before planted hardwood sources. The wiki documents six daily stumps there, yielding 12 hardwood. The complaints concern repeated supply work as well as eligibility.

**[H] Boogle:** borrow recognisable obstacle forms and a meaningful later use. A giant beam tree can be special without making nearby ordinary wood unavailable. Daily resource appointments would turn regrowth into a chore in a game meant for drop-in friends.

### Breath of the Wild: material behaviour and multiple useful actions

**[S]** [Woodcutting](https://zeldawiki.wiki/wiki/Woodcutting) uses sharp weapons, with axes especially effective; a tree becomes a log and further attacks turn it into wood. Its quoted shipped dialogue has the Old Man demonstrate the work and advise on fall direction. [Player accounts](https://www.reddit.com/r/Breath_of_the_Wild/comments/1d980ub/) also document bombs as an alternative. This is a material/tool interaction, not a coloured tree-level ladder. A blunt hit need not cut; exact unsuccessful-hit audio was not verified here.

**[H] What works:** one object supports several intentions: fell it, use its log or collect firewood. A tool lying beside a demonstration makes the action legible. **Documented confusion [S]:** a [December 2023 player report](https://www.reddit.com/r/Breath_of_the_Wild/comments/18c1cvl/) says they spent a month thinking trees without immediate firewood were duds. An apparently successful fall did not explain the next step.

Nintendo's [GDC 2017 session](https://www.gdcvault.com/play/1024562/Change-and-Constant-Breaking-Conventions) is a relevant primary reference, but only its session description was fetched; no claim here relies on having watched its physics demonstrations. **[H] Boogle:** the great tree becoming the actual beam is a good fit. Ordinary trees should retain the simpler chop→magnet path.

### Terraria: almost the ideal distinction for Boogle's ordinary trees

**[S]** The [axe reference](https://terraria.wiki.gg/wiki/Axe_power) describes all tree types as damageable by axes, with axe power and tool speed changing chopping efficiency; power can also affect wood yield. [Pickaxe power](https://terraria.wiki.gg/wiki/Pickaxe_power) instead determines which tougher blocks can be mined. An underpowered pick does not eventually succeed by being swung longer. The latter page's full fetch was blocked; indexed text supports the threshold, not an exact audiovisual refusal recipe.

**[H] What works:** trees remain a dependable basic resource while the underground material ladder provides discovery gates. Better harvesting can affect both time and return. **[S] Confusion:** a [May 2026 discussion](https://www.reddit.com/r/Terraria/comments/1tp385l/) distinguishes pickaxe power from mining speed after a player found an apparent upgrade slower at block swapping. That is a caution about overloaded stats, not evidence against Terraria's tree rule.

**[H] Boogle:** keep one visible, immediately useful axe improvement; no percentage-power labels or separate player woodcutting level. The current proper axe already has a strong first-swing contrast.

### Satisfactory: clearing and collecting become one large action

**[S]** The [chainsaw reference](https://satisfactory.wiki.gg/wiki/Chainsaw) and its [fetched mechanics account](https://satisfactory.gamecore.wiki/en/items/chainsaw/) describe vegetation unavailable by hand, outlined valid targets, a roughly 5 m area cut and a single-target mode. Some large vegetation cannot be cut. Unavailable targets do not offer the normal valid-target action; this differs from an axe visibly bouncing off a tree. **[V]** Coffee Stain's [1.1 release notes, 10 June 2025](https://store.steampowered.com/news/posts/?appgroupname=Satisfactory&appids=526870&enddate=1752769155&feed=steam_community_announcements) explicitly added falling-tree animation and effects.

**[H] What works:** a new tool changes the scale of work and yields a major visible result. **[S] What players disliked:** a [2023 discussion](https://www.reddit.com/r/SatisfactoryGame/comments/18jymmg/) asks to preserve chosen trees while clearing neighbours; another participant regrets permanent deforestation. This predates current single-target mode. A separate [2024 report](https://www.reddit.com/r/SatisfactoryGame/comments/1da7hn6/) describes failed clearing, with replies distinguishing inventory and dedicated-server issues. It must not be misrepresented as intentional tier gating.

**[H] Boogle:** auto-aim one tree reliably; do not make the proper axe accidentally clear a whole landmark grove. Persistence, full bags and networking must not look like a “too hard” tree.

### Astroneer: the surface and the tool both communicate hardness

**[S]** The [terrain reference](https://astroneer.wiki.gg/wiki/Terrain) describes four hardness levels, increasing surface line patterns and changing tool reticles. The basic tool handles the first at full speed, the next slowly and cannot excavate the harder levels; drill mods extend that range. A harder layer remains rather than yielding after indefinite work. **[H]** This is a useful soft-to-hard progression: experience resistance before encountering a full capability boundary. Texture carries meaning beyond hue.

**[S] Limit:** a [2022 reticle question](https://www.reddit.com/r/Astroneer/comments/xxyi3c/) needed community explanation. A consistent visual code still has to be learned. **[V]** System Era's [Rails Update](https://blog.astroneer.space/p/rails-update/) describes autonomous transport plus oxygen and power along rails. Infrastructure's value comes from services across distance, not merely tougher material.

**[H] Boogle:** silhouette + bark + contact response is better than colour alone. The depot should be a visible service at the advancing frame, not a decorative indication that an upgrade has happened.

### Better supporting precedents: Fortnite, Hades II and Factorio

**[V]** Celia Hodent's [GDC 2017 Fortnite UX transcript](https://celiahodent.com/gamers-brain-part-3-ux-engagement-immersion-retention-gdc17-talk/) describes faster weak-point harvesting with rising pitch, and the need to compare old and new ability to feel competence. **[H]** This supports clear material arrival and audible progress, not a Boogle weak-point aiming test. A beautiful contact sound cannot rescue a false progress signal.

**[S]** Hades II's May 2024 first patch let players harvest a resource after unlocking its tool without selecting that one tool for the run ([patch reproduction](https://www.gamespot.com/articles/hades-2s-first-patch-adds-major-quality-of-life-improvement/1100-6523532/), [contemporary reception](https://www.pcgamer.com/games/roguelike/hades-2s-olympus-sized-first-patch-introduces-the-quality-of-life-fix-weve-been-begging-for/)). The [primary announcement](https://steamcommunity.com/games/1145350/announcements/detail/4175477072263852700) returned only an image shell, so the mechanics remain secondary evidence. **[H]** A one-time capability unlock is less objectionable when the player never has to equip the correct owned axe or walk home to swap it. Do not treat that historical patch as a current Hades II feature inventory.

**[V]** Wube's [Friday Facts #327](https://www.factorio.com/blog/post/fff-327) describes a tutorial redesign: fearing players would mistake the game for manual grind led to automation being pushed too early, disrupting the progression that made automation meaningful. **[H]** Grant's observation fits this tension. Let players understand and enjoy the work before replacing it; do not force an arbitrary amount of suffering as proof they deserve relief.

## A swing that promises something

**[H] The best default is a real bite, a small useful yield and durable progress.** “Cannot fell it with this one swing” should be common; “cannot ever fell it with this axe” should be exceptional. These need different responses. Never use an increasing notch, rising success pitch or accumulating debris to imply progress when another hundred hits would do nothing.

Keep the established **60 ms contact**, **240 ms minimum repeat interval** and **260 ms starting log flight** from `TUNE`. Do not add a mandatory charge, stamina bar, timing window or tool durability. Proposed distinctions:

| Contact                               | Picture and motion                                                                                                                 | Sound                                                                                                                | What is true                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Ordinary tree, more hits needed       | Blade bites at contact; 25–40 ms pose hold on axe/upper body only; trunk bends 2–4°, crown follows 60–100 ms later; notch advances | Dry woody attack, short low body, a little splinter noise; vary pitch ±3%, not a random octave                       | Logs arrive and progress persists. Next hit helps.                         |
| Distinct optional hardwood, wrong axe | Blade skates/rebounds; small bark flecks, much less trunk bend; one shallow scuff, never a deepening notch                         | Short hard woody tick, brief blade ring, restrained low trunk resonance; no payout melody or rising success sequence | Contact happened; felling progress did not. Stronger tool will bite later. |
| Same hardwood after upgrade           | Blade sticks briefly, real wedge opens, larger chips and material flight                                                           | Replace thin rebound with a deeper split, then normal collection sounds                                              | The remembered obstacle has changed in a useful way.                       |
| Full bag                              | Gesture toward the visibly full bundle, a small strap/wood rattle; tree does not spend progress or yield                           | Inventory-specific soft rustle, not the hardwood tick                                                                | The problem is capacity, not tree species.                                 |
| Great tree                            | Keep its long committed fall, crown movement, trunk landing and beam carry; build the notch before release                         | Low wooden groan and broad landing thud, separated from normal chips                                                 | Twelve real strokes culminate in the unique structural object.             |

The numbers above are test values, not psychoacoustic findings. Use existing procedural audio, particles and animation seams in [`chop.ts`](../../src/proto/place/chop.ts), [`pieces.ts`](../../src/proto/place/pieces.ts) and the [place sound contract](../game-design/place.md#sound); no new audio engine. No world-time freeze, movement lock or camera shake on a rejected swing. Repeated refusals should be quieter, not more rewarding than a successful chop. Readability must survive muted sound and a distant third-person camera.

For a true future gate, establish its payoff nearby: a small naturally fallen branch of the same species showing its pale dense interior, or a matching structural beam in an unfinished frame. Do not spawn infinite consolation logs from a tree that cannot be felled. A repeatable material payout would make the “locked” tree an infinite source. A one-off cosmetic bark fleck can acknowledge impact without pretending to be income. If two contacts still leave testers unsure, improve the silhouette and demonstration; a short contextual explanation is preferable to an indefinitely deceptive promise, but should be a last resort under “Show, don't tell.”

### Hardness without paint

Keep ordinary conifers slim, tapered, visibly barked and consistently choppable. For the fallback, author **one broad-canopied hardwood** with a forked, thick trunk, flared roots and deeply ridged bark; use a different natural bark value as a redundant cue. Test it in grayscale, at dusk and behind foliage. Species is a rule across the island, not a per-tree eligibility flag. Do not turn a green conifer blue while leaving every other cue unchanged.

The great tree needs its own silhouette: greater girth, a long straight beam-sized trunk and its isolated position overlooking T3. Keep its current **2.1 size / 12 strokes / one beam**, with no proper-axe requirement. The path earns that axe; gating the required beam with it would create a progression cycle. Fallback hardwoods must not replace the great tree or be the only accessible source for any pre-axe bill.

## Hunger for efficiency when nearby trees work

The useful variable is **repeated work that a visible upgrade actually removes**, not scarcity of clickable trees. A finite tree changes the next pickup route; an advancing frame increases the haul; a pack crosses a trip threshold; the cart removes chopping and a supply journey while retaining the last carry. A shorter opening can still be satisfying. The old time target is not a debt to repay with extra logs.

### Round 4 arithmetic and its limits

**[V]** [`model.ts`](../../dev/economy/model.ts) models trips and an effective single source distance per station. It does **not** simulate tree locations, depletion, approach paths, available yield per tree, discrete swings, capacity clipping or exact mixed-material routes. Its `round4` table still uses **4 logs per upgraded swing**, versus **5 in `AXE2`**. It also uses 18 m/s trains versus 20 in `TUNE`; great-beam hauling is a zero-distance placeholder. These prevent a source toggle from becoming a trustworthy elapsed-time prediction.

**[V/M]** [Place's measured round-4 run](../game-design/place.md#measured) records a walking bot at **5:57 first path, 11:29 forge, 23:00 Far Head, 26:37 trains, 29:32 pier/end**, including traversal work absent from parts of the model. These are historical bot observations, not a human sample. The model's **24.52 minutes to its end** must not be presented as that measured 29:32 run.

For one carrier, the model's station-work approximation is:

```text
loads = ceil(total pieces / carry)
work seconds = sum(piece harvest seconds)
             + loads × (1.2 + 2 × effective one-way metres / 5.6)
             + total pieces × 0.09
```

**[H, executed sensitivities]** Correct only upgraded log work to `0.38 / 5` in an in-memory clone. For two proximity experiments, cap `sourceM` for **T1/T2/T3/F1/F2/Q1 only** at 45 m or 20 m, leaving the later cart/rail route unchanged. This deliberately simplifies T2's stone and Q1's rail mixture as well; these are **sensitivity cases, not measured routes or strict bounds**. Other model mismatches remain visible rather than quietly repaired.

| Solo model milestone/work                                      | Original table | Five-log axe correction | Pre-depot sources capped at 45 m | Pre-depot sources capped at 20 m |
| -------------------------------------------------------------- | -------------: | ----------------------: | -------------------------------: | -------------------------------: |
| First path, cumulative min                                     |           6.38 |                    6.38 |                             5.78 |                             4.74 |
| Forge frame, cumulative min                                    |           8.29 |                    8.28 |                             6.79 |                             5.31 |
| Forge lit, cumulative min                                      |          10.70 |                   10.68 |                             7.71 |                             5.92 |
| “far head” model link end, min, including its walk home        |          22.13 |                   22.10 |                            17.88 |                            15.79 |
| Model end, min                                                 |          24.52 |                   24.50 |                            20.27 |                            18.19 |
| T3 work, seconds; still five ordinary loads plus separate beam |         133.27 |                  133.27 |                            97.56 |                            52.91 |
| F2 work, seconds; still two loads                              |         129.75 |                  129.14 |                            39.85 |                            22.00 |

The axe-model correction saves **1.368 seconds** overall; the source-distance experiments save **4.23 or 6.31 minutes** relative to that corrected baseline. One/two/four active carriers produce **24.50/17.50/14.39 min** baseline, **20.27/15.18/12.49** at the 45 m cap and **18.19/13.96/11.62** at 20 m. Ideal scheduling is not evidence of co-op fun, contention safety or actual supply availability.

### Compare the available levers

| Lever                     | Concrete round-4 effect                                                                                                                                                            | Recommendation                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bigger bills              | T1/T2/T3 already ask for **24/32/40 logs**, with 8 stone and one beam added later. At carry 8 that is **3/5/5 ordinary loads**, plus the beam.                                     | Hold fixed first. They already establish repeated work. Increasing bills also erases the upgrade's reward if done at the same moment.                                        |
| Smaller carry             | Cutting 8→4 makes the same first three frames **6/10/10 loads**, plus the beam.                                                                                                    | Reject. It increases interruptions and hides an eligibility fix inside a hauling penalty.                                                                                    |
| Existing pack, 8→16       | For F2's 32 logs: **4→2 loads**. With five-log axe accounting, work is **252.97→129.14 s at 170 m**, **74.40→39.85 s at 45 m**, **38.68→22.00 s at 20 m**.                         | Keep. It still saves trips nearby, but absolute relief falls from 124 s to 17–35 s. Measure whether that still feels like a rung.                                            |
| Lower tree yield          | Halving 10→5 logs/tree doubles nominal T3 tree-equivalents **4→8** while leaving its five carry loads intact.                                                                      | Reject as a compensating nerf. It buys more targeting and woodland destruction, not useful logistics.                                                                        |
| Higher yield / better axe | Current 2→5 logs/contact makes an empty 8-slot bag fill in **4→2 contacts**; full-tree stroke count is **5→3**.                                                                    | Keep the immediate contrast. Do not cancel it with stronger ordinary trees after the upgrade.                                                                                |
| Finite trees              | **28→390 ordinary trees** if every current decorative tree joins harvesting; nominal all-starter stock **280→3,900 logs**; all-proper stock **420→5,850**, before capacity losses. | Total wood becomes abundant. Local exhaustion and the advancing worksite, not whole-island shortage, must carry the pacing.                                                  |
| Fast regrowth             | A nearby tree becomes a recurring stationary source; waiting can replace walking.                                                                                                  | No timed regrowth in the first comparison. Later, visible saplings after an area milestone could restore scenery, but require their own shared-state and obstruction design. |
| Depot and onward freight  | Its rack already removes tree retargeting and brings logs to later frames; forge rails still get farther away.                                                                     | Keep the 24-log cart and short last carry. Compare against the **new nearest legal manual route**, not the old banded grove's 350 m route.                                   |

**[H] Why not compensate with bills?** Using the formula above, F2 at a 20 m source would need about **192 logs / 12 loads** to reach 132 seconds, near the old 129-second job. At 45 m, roughly **112 logs / 7 loads** reaches 139 seconds. That replaces two old long carries with seven or twelve short repetitive ones. Neither is the requested better world.

There is already **168 logs of manual demand before the depot**: 96 on the first path, 56 in the forge and 16 at Q1, plus stone/rails/beam. The 24/32/40 progression and 8-slot bag are substantial even with nearby sources. Do not force a full-tree fell for every bundle: a five-hit tree yields ten nominal logs, so the starter bag fills before it falls. Returning to an unfinished tree should be intelligible.

### Yield is not currently conserved per tree

**[V]** `contact()` increments strokes, then issues `min(logsPerStroke(), back.room())`; felling is based on strokes. With the proper axe and an empty 8-slot bag, contacts yield **5 then 3**, spending two strokes; after unloading, the last contact yields 5. That tree gives **13**, not the nominal 15. Concurrent swings and an upgrade halfway through a tree complicate the count further. The model amortises harvest and cannot see this.

**[H]** Before tuning yield, specify a finite per-tree remaining amount and preserve unclaimed output when capacity fills. Keep the current maximum 10/15 tool outcomes for the first comparison, but explicitly define the mid-tree upgrade rule (for example, the higher extraction ceiling becomes available, less what was already issued). Never destroy the unclaimed remainder on the final hit or duplicate it between players. A full-bag swing may acknowledge contact, but cannot spend resource progress. This is part of making the promise truthful, not a reason to add a bigger reward shower.

## Cost of making decorative land trees participate

**[V]** At the inspected layout the change is **29→391 tree records**, approximately 13.5× the interacting set. It is not 362 new individually drawn objects: both implementations already use instancing. Land currently has three batches; chopping has five including the ribbon and stump. A unified four-part ordinary-tree view without ribbons can reuse geometry/materials. Draw-call reduction is possible, but not established by counting source constructors alone; shadows and any species split still cost passes.

| Concern                 | Current behaviour / required work                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rendering and animation | `pose()` writes matrices and marks all part buffers dirty; `updateChop()` scans every tree, but poses only shaking/falling ones. Keep settled trees asleep, update changed instances, and bound simultaneous foliage particles. Existing `shedCrown()` emits about `70 × size` leaves per fell; mass cutting needs a budget.                                                         |
| Collision               | Decorative trees have no per-tree body. Direct reuse adds **362 standing bodies**, then up to **724 additional stump/fallen-trunk bodies** if all converted trees fall. These are counts, not predicted milliseconds. Falling currently uses an animation followed by static colliders, not a physically simulated log pile. Preserve that inexpensive choice initially.             |
| Terrain and paths       | Current exclusion masks protect paths/groves but were authored for scenery without trunk collision. Audit reachable trunk bases, slope placement, fallback spawn positions and fall footprints at doors, rails, bridges, rings and the great-beam route. A tree must not be harvestable only from inside its new collider.                                                           |
| Identity and saves      | Existing felled state and co-op chop messages refer to `TREES` indices. Inserting 362 entries ahead of the great tree would reinterpret old saves/messages. Keep existing IDs stable, append new catalog entries, and follow the [mixed-build contract](../agents/mixed-builds.md) if meanings or stored state change. Do not infer a durable ID from mutable render-instance order. |
| Partial work            | The `felled` slice saves fallen indices/yaws but not ordinary partial strokes; a reload can restore partly harvested trees as fresh. A finite-yield proposal needs explicit partial-progress/remainder persistence, not just an expanded felled list.                                                                                                                                |
| Co-op                   | [`coop.ts`](../../src/proto/place/coop.ts) sends stroke counts while `contact()` issues local material. Expanding the catalog does not establish conserved simultaneous harvest. Treat last-hit/last-yield arbitration and late joins as required implementation work, especially with a remainder. This report does not approve graduating the prototype's transport.               |
| Landscape               | Standing forest becomes persistent cleared space and solid deadwood. Preserve distant composition through natural planting, not invisible invulnerability. Do not immediately add auto-replant chores, destructive fall chains or automatic regrowth under buildings.                                                                                                                |
| Contact shading         | Decorative placement bakes contact blobs through `addBlob`; simply hiding crowns may leave an overly broad patch. Check and adapt the footprint to the remaining stump rather than assuming removing a mesh removes its baked shadow.                                                                                                                                                |

**[V, engine comparison]** [Unity's `TerrainData.treeInstances`](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityengine/terraindata/treeinstances) exposes tree instance records; [Unreal foliage](https://dev.epicgames.com/documentation/en-us/unreal-engine/foliage-mode-in-unreal-engine) explicitly separates batched static meshes from more expensive Actor foliage; [Godot `MultiMesh`](https://docs.godotengine.org/en/stable/classes/class_multimesh.html) batches many instances but culls them together. [Three.js `InstancedMesh`](https://threejs.org/docs/pages/InstancedMesh.html) similarly provides per-instance transforms and explicit buffer updates. **[H]** Follow that common separation: lightweight tree data and batched drawing, with collision/interaction handled separately. Boogle already has both halves; it lacks one consistent tree catalog. No engine documentation makes persistence or harvesting automatic, and no new general entity framework is needed for this experiment.

## Numbered recommendations for Boogle

1. **Make ordinary trees uniformly choppable, with no orange band.** Unify the placement records from [`land.ts`](../../src/proto/place/land.ts) with the tree view/contact path in [`chop.ts`](../../src/proto/place/chop.ts) and targets in [`verbs.ts`](../../src/proto/place/verbs.ts). Preserve their positions first. **Smallest proof:** approach one former scenery tree and one former banded tree with the starter axe; both give the same first-hit response and real wood. Rock bands are a separate decision.

2. **Keep the great tree an effort-and-scale landmark, not a tool lock.** Preserve [`GREAT.strokes = 12`, its beam and T3 bill](../../src/proto/place/layout.ts); distinguish its trunk and roots, remove its ribbon with the ordinary trees. **Smallest proof:** finish it before obtaining the proper axe, shoulder the beam and complete T3; the intended dependency chain remains possible.

3. **Make contact truthful in four states: bite, rebound, full bag and fall.** Use the response table above through existing [`chop.ts`](../../src/proto/place/chop.ts) presentation hooks and [place sound conventions](../game-design/place.md#sound). **Smallest proof:** a muted capture still distinguishes progress from refusal; listening then confirms wood hardness without an error buzzer. No deepening cut or rising reward sound for zero progress.

4. **Hold round-4 bills, axe rungs and carry capacity fixed for the first comparison.** Touch no `LINKS`, `FORGE_BILLS`, `AXE2` or `PACK` numbers in [`layout.ts`](../../src/proto/place/layout.ts) merely to preserve duration. Correct the stale axe assumption when updating [`model.ts`](../../dev/economy/model.ts). **Smallest proof:** record actual routes, contacts, loads and time-to-want-help before and after; compare the depot with the nearest newly legal source.

5. **Keep finite depletion; fix lost yield before balancing it.** Specify partial work and remaining output in [`chop.ts`](../../src/proto/place/chop.ts), its [`job.ts`](../../src/proto/place/job.ts) slice and [`coop.ts`](../../src/proto/place/coop.ts) seam. **Smallest proof:** an almost-full bag, mid-tree upgrade, reload and two simultaneous final swings neither delete nor duplicate wood. Regrowth is a later landscape/returning-player decision, not a source cooldown.

6. **Preserve batched drawing and price the new solids explicitly.** Consolidate the land/chop tree catalog; retain static outcomes and inspect 391 standing trees plus a heavily felled scene. Follow [engine comparison above](#cost-of-making-decorative-land-trees-participate), [sync](../agents/sync.md) and [mixed-builds](../agents/mixed-builds.md). **Smallest proof:** no stale canopy/contact shadow, blocked mandatory path, changed legacy tree identity or extra per-tree draw; measure actual frame and collider costs before claiming affordability.

7. **Use one unmistakable optional hardwood species only as the fallback.** Put its requirements and future use in [`layout.ts`](../../src/proto/place/layout.ts) and the owning [place design](../game-design/place.md), with the existing proper axe as the first possible unlock. Never reclassify same-looking ordinary trees or lock T3's great beam. **Smallest proof:** after one rejected attempt, the player can identify another of that species without its band, and returning with the proper axe delivers the expected bite. If it still feels like withheld permission, discard this fallback.

8. **Judge the ladder after the world is coherent.** Update [place's measured section](../game-design/place.md#measured) and [round-4 numbers](../plans/round-4.md#the-jobs-numbers-hypotheses) only from the new trace. **Smallest owner comparison:** “Every ordinary tree now works.” Gut question: **“Did you still want the little guys to take over, and did they help?”** If no, first improve the service's location or move it to the first real hauling bottleneck; do not silently inflate bills or undo universal ordinary chopping.

## Short build plan and decision consequences

**Recommended mechanism: universal ordinary chopping plus finite local depletion and frontier delivery.** Numeric starting changes are **28→390 ordinary targets, 0 new tool tiers, 0 bill increases, 0 regrowth timers**. Keep **5×2→3×5** axe behaviour, **8→16** carry, **12-hit/one-beam** great tree and **24-log** cart. Time change is unverified; the declared 45/20 m sensitivity cases indicate a possible **4.23/6.31-minute** reduction in the model, not a new target to enforce.

**Fallback mechanism: ordinary trees always work; one naturally distinct hardwood species opens with the proper axe.** For a bounded first test, convert **two of the 362 decorative trees** into that species near a later return route, away from mandatory bills; leave the other 360 ordinary. That means **388 harvestable ordinary trees before the proper axe, 390 harvestable non-great trees afterward**, plus the always-available great tree. Test **3 productive swings × 5 logs** after unlock and **zero yield/progress** on an under-tier attempt. Its locked early stock is only **20 nominal starter logs**, so it does not restore the old grove commute or justify larger bills. This is a promise experiment, not the default answer to scarcity.

1. **Inventory and data pass:** extract the seeded land positions into a numeric tree catalog, preserve existing indices or introduce a versioned identity, unify species rules, specify finite yield/partial saves and the upgrade transition. Read the triggered nested instructions before any implementation in shared folders; none exist under `src/proto/place`, `dev/economy` or `docs` in this checkout. This report edits only research files.
2. **One-grove interaction pass:** put a former scenery tree through the existing chop/fall path, add trunk/stump collision, remove tree ribbons, implement truthful capacity handling and inspect normal/last/full-bag contacts. Keep native instancing; audit placement and contact shadows before expanding to the full catalog. The optional hardwood stays a separate comparison.
3. **Whole-place and co-op pass:** exercise dense felling, old saves, a late join and simultaneous hits; verify the great-beam route and each ability/rail chokepoint. The implementation must resolve resource conservation under the repository's shared-state contracts, not claim the current local-award hook guarantees it. Record nearest reachable sources and actual per-station loads; update the economy assumptions and as-built place chapter.
4. **Evidence then owner:** use the existing look/playthrough workflow for stills, contact/fall motion and an activity trace; run the checks triggered by the eventual implementation. Listen to the procedural cues in play. Present one changed thing and the gut question above, then stop at the owner's playtest. No gameplay implementation, ship or deployment is part of this research task.

**Copy for owner review, not silently rewritten:** [`objective.ts`](../../src/proto/place/objective.ts) currently says “Chop a tree with an orange band.” It becomes false under either option. The rock line is outside this change. Existing Boogler/resident copy remains untouched; any conflicting character line should be listed when the builder finds it.

## Reproduction and verification

The model tables above were executed with Node 24. The following reproduces the original, corrected and proximity cases without changing the model file:

```sh
node --input-type=module <<'JS'
import { model, round4 } from './dev/economy/model.ts';
const corrected = structuredClone(round4);
for (const recipe of Object.values(corrected.recipes))
  for (const item of recipe)
    if (item.good === 'logs' && item.harvestS === 0.38 / 4)
      item.harvestS = 0.38 / 5;
const cases = [['original', round4], ['corrected', corrected]];
for (const cap of [45, 20]) {
  const table = structuredClone(corrected);
  for (const link of table.links)
    for (const station of link.stations)
      if (['T1', 'T2', 'T3', 'F1', 'F2', 'Q1'].includes(station.id))
        station.sourceM = Math.min(station.sourceM, cap);
  cases.push([`cap${cap}`, table]);
}
for (const [name, table] of cases)
  for (const players of [1, 2, 4]) {
    const result = model(table, players);
    console.log(name, players, result.minutes);
    if (players === 1)
      console.log(result.links.map(l => ({
        link: l.id, cumulative: l.cumulative,
        work: l.stations.map(s => [s.id, s.workS, s.minTrips])
      })));
  }
JS
```

The **362-tree count** replays the unchanged numeric portion of `land.ts:buildTrees`, from `mulberry32(31)` through its placement loop, using `GRID/GROVES/HEAD/SPIRE` and `terrain.ts`'s baked `heights`, `clearMask` and `gorgeD`; drawing and contact-blob emission are omitted. It uses Node's TypeScript type stripping, with an inert `Object3D` placeholder for the unused pose. The loop's 400 cap is therefore distinguished from its actual accepted count. Re-run after any terrain, exclusion-mask or placement change. The 35 m query is `hypot(tree.x - FORGE_FRAME.x, tree.z - FORGE_FRAME.z) < 35`, in place-local coordinates.

Primary texts fetched: Mojang's axe/pickaxe articles, Hodent's GDC transcript, Wube's tutorial retrospective, Coffee Stain's release notes, System Era's rails notes and engine API documentation. Wiki mechanics and player reception are labelled separately; Valheim Fandom, some wiki.gg pages and the Hades announcement body were blocked or incomplete. Indexed extracts are identified where used. No ROM assets, extracted Nintendo data or measured reference audio were used. No source establishes a universally “most satisfying” rejected swing; that remains a listening/playtest decision.

Documentation validation completed: Prettier formatted both changed Markdown files with the repository ignore overridden; all 34 local report links and 107 index links resolve to existing files; the diff was reviewed. `npm run check` passed lint, typecheck, all 292 unit tests, registry, level/asset checks and production build. Direct ESLint on the two Markdown paths reported that no matching configuration applies, not a Markdown lint pass. This is a local documentation commit with no push. Gameplay feel, performance, exact new completion times and multiplayer harvesting remain unverified.
