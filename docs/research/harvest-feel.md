# Simple harvesting with great game feel

_Research report, 2 November 2026. Hands-on harvesting for Boogle: one forgiving action, convincing contact, a short finish, automatic magnet collection, and tools that retire work. Live-source research and repository inspection; recommendations, not approved design or implemented behavior._

**Brief.** The owner's target is “hands-on work. Essentially, really great game feel, but very simple harvest mechanics.” Serve [DESIGN.md](../../DESIGN.md) principles **1, toys before chores; 4, automatic cooperation; 6, communal world, personal rewards; 8, drop-in; and 10, slapstick over precision**. No stamina, durability, hazards, timed challenges, respawn countdowns or compulsory precision. Milliseconds below describe animation and input response, not another resource or timer the player manages.

**Verification, following [sea-crossings.md](sea-crossings.md).** **[V]** means fetched primary text or inspected repository code supports the claim. **[S]** means a secondary account, community wiki or search extract; fetching a wiki does not turn it into developer testimony. **[I]** means interpretation or proposed Boogle values. No reference game was played, video frame-counted or audio waveform measured for this report. Exact Boogle milliseconds, metres, pitches and hit counts are starting hypotheses, never disguised measurements of Fortnite or another shipped game. Publication dates identify the reference version where relevant.

## Decision baseline and scope

The [2 November audit picks](../decisions.md#the-audit-picks-2-november) retain six eras, materials from different camps at once, and hauling each track segment even when rail handles bulk transport. The same record says wood should come from chopping, fallen material should come to the magnet without a button, and the compact back bundle stays steady. The owner likes Palworld's materials and is wary of grind. Helpers remain undecided; this report does not recruit them, revive som/knacks, or turn every new era into one replacement material.

Read alongside, without replacing:

| Existing work                                                                             | Boundary of this report                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [Ratchet & Clank feel](ratchet-and-clank-feel.md) and [collect sounds](collect-sounds.md) | They own the scatter → magnet → arrival sequence and pickup sound recipe. This report supplies the contact and fracture that precede it.    |
| [Carrying and logistics](carrying-and-logistics-play.md)                                  | Keep its effort accounting and steady bundle; do not reopen sway, spills or handling puzzles.                                               |
| [Compounding infrastructure](compounding-infrastructure.md)                               | Apply its “upgrade removes work” test to tools. Keep the newer decision that track still needs hands-on hauling.                            |
| [0.1 resource loop](0.1/7-resource-loop.md)                                               | Historical prototype reasoning, not authority for one material per age, ball income or the former wobbly stack.                             |
| [Game-feel skill](../../.claude/skills/game-feel/SKILL.md)                                | Use a few coordinated feedback layers. Its generic global hit-stop examples are unsuitable for a live shared world.                         |
| [Haul as built](../game-design/haul.md), [find the fun](../plans/find-the-fun.md)         | Ground the smallest experiment in existing palms, source charges, tuning and the haul magnet. No plan boxes are completed by this research. |

## Summary

1. **The single beat that matters most is contact: the tool meets bark, the trunk gives, and the woody attack sounds on the same rendered frame.** More particles cannot repair a tool that visibly misses or a sound that arrives late.
2. Start with **three strokes, 600 ms apart, four logs per accepted stroke: twelve per tree**. A held button repeats exactly what taps do. The third stroke changes the tree's silhouette, not the player's eligibility for the reward.
3. Keep **progress on the object**, not in a timing minigame: a growing cut, three increasingly conclusive responses, no combo expiry. The magnet completes the already established reward language.
4. Budget the whole job. At today's 60-log section cost, this is **five trees and fifteen strokes**, rather than three times today's fifteen source takes. An upgrade should reduce those strokes, stops or trips.
5. Shared progress must not become winner-takes-all loot. Existing `src.take` can reserve each contributor's four logs immediately; unowned ground piles cannot guarantee that protection.
6. Most references maintain interest through changing purposes, space, tools or automation. They do **not** establish that a polished chop alone remains enjoyable for hours.

## Findings by source

### 1. Fortnite: communicate value, then make repeated contact pleasurable

**[V, developer's GDC transcript]** Celia Hodent describes faster harvesting on weak-point hits and a rewarding sound rising in tone. Players nevertheless reported grind: feedback made each hit appear to give less than it really did. A more visible weak-point marker did not solve its misunderstanding; introducing the ability after ordinary harvesting gave players a useful comparison. This is the **2017 Fortnite development context**, not a claim about today's Battle Royale onboarding or exact damage multipliers ([The Gamer's Brain, part 3](https://celiahodent.com/gamers-brain-part-3-ux-engagement-immersion-retention-gdc17-talk/)).

**[I]** Borrow the increasing certainty and audible progression. Boogle's no-precision requirement rules out chasing a moving weak-point reticle. Put the appealing notch under the tool automatically. Do not offer an “optional” accuracy bonus large enough that ordinary players feel inefficient without it. Show four real arriving logs rather than a single ambiguous puff.

### 2. Palworld: materials belong to an understandable production world

**[V, developer product description]** Pocketpair presents mining, construction, farming and factory work as jobs Pals can perform. Gathering therefore participates in a larger progression from personal work to supported production ([Palworld](https://store.steampowered.com/app/1623730/Palworld/)). This primary source supports the production relationship; it does not establish an optimal axe cadence, tool multiplier or absence of grind.

**[I]** The useful fit with the owner's preference is tangible raw materials feeding visibly different camp outputs. Retain a direct wood/stone gathering verb while the network reduces repeated supply work. Do not import survival upkeep, a large crafting tree or escalating material bills merely because they coexist with Palworld's appealing materials.

### 3. Minecraft: a better tool changes the duration of familiar work

**[V, Mojang article, 2020]** Mojang describes a wooden axe as twice as fast as bare hands on wood, stone twice as fast again, then iron roughly another 30% faster. The article also explains that some later differentiation is durability rather than speed ([Taking Inventory: Axe](https://www.minecraft.net/en-us/article/taking-inventory--axe)). These are the article's dated comparisons, not newly benchmarked timings across editions.

**[V, implementation documentation]** Bedrock's block-breaking documentation separates client prediction from server processing and describes reconciliation when a predicted break is rejected ([Mojang protocol guide](https://mojang.github.io/bedrock-protocol-docs/guides/block-breaking-overview/)).

**[I]** Familiar targets make upgrades legible. Boogle can use integer reductions in strokes, but durability is excluded. Minecraft's prediction is evidence that responsive presentation and authoritative outcomes are distinct problems, not a reason to add predicted inventory or rollback casually to Boogle.

### 4. Valheim and Sons of the Forest: the object actually gives way

**[S, community reference; search extract, full fetch blocked]** Valheim distinguishes the standing tree, fallen log and further chopped pieces; falling wood can cause damage. Species and equipment make a universal hit count inappropriate ([Valheim trees](https://valheim.fandom.com/wiki/Trees)). **[I]** Its useful contrast is a major silhouette change after the last hit. A second mandatory round of chopping a fallen log and dangerous tree dominoes are wrong for this brief.

**[S, interview transcript mirror; search extract, full fetch blocked]** An Endnight Q&A mirror describes using Houdini to generate many cut-wood shapes for Sons of the Forest ([interviews](https://sonsoftheforest.wiki.gg/wiki/Interviews)). **[V, direct interview]** Endnight's Anna Terekhova also warns that repeated content makes a large world feel copied, while an empty world hides its interesting content ([GamesRadar interview, 2023](https://www.gamesradar.com/how-endnight-games-levelled-up-sons-of-the-forests-island/)). The article's additional cut-wood pipeline description is the reporter's account, not a measured hit specification.

**[I]** A visible cut and a recognisable release are worth borrowing. Start with three authored cut states and a cosmetic fall; bespoke procedural wood cutting and simulated log collisions are much higher-cost answers to a smaller problem.

### 5. Astroneer: harvesting can feel like removing a substance

**[S, community wiki search extracts; tool page fetch blocked]** The terrain tool removes terrain, assembles collected resources into nuggets and attaches finished resources to storage or drops them when full. Wide and boost augments change the area and speed of work ([terrain tool](https://astroneer.wiki.gg/wiki/Deform_Tool), [Wide Mod](https://astroneer.fandom.com/wiki/Wide_Mod)).

**[I]** Use the sense of material visibly leaving its source and becoming a carried object. A later tool can remove a broad patch with one gesture rather than make the same narrow gesture marginally faster. Boogle need not adopt voxel terrain, oxygen, batteries or precision terrain painting.

### 6. Hades: a short interruption can be pleasant; tool administration need not be

**[V, Supergiant patch notes, January 2020]** The fishing updates include vibration, feedback when interaction is unavailable and repositioning hard-to-reach fishing points ([Long Winter patch notes](https://www.supergiantgames.com/blog/hades-long-winter-update-patch-notes/)). **[I]** This supports clear availability and tactile punctuation. Fishing's waiting and reaction challenge are not the template for Boogle's timer-free harvest.

**[S, fetched reproduction of Hades II's May 2024 patch]** Gathering changed so unlocking a tool allowed collecting its resource without carrying only that selected tool; prioritisation instead influenced appearance frequency. The direct Steam patch body did not load in this research session ([GameSpot's patch reproduction](https://www.gamespot.com/articles/hades-2s-first-patch-adds-major-quality-of-life-improvement/1100-6523532/)). **[I]** Automatically use the appropriate owned tool. Do not make a player return to camp because they selected an axe instead of a pick.

### 7. Stardew Valley and Animal Crossing: small hit counts have readable endings

**[S, fetched community table]** Stardew's ordinary full-grown tree takes **10/8/6/4/2 hits** across axe tiers; its remaining small stump takes **5/4/3/2/1**. Upgrades also open large obstacles ([Axes](https://stardewvalleywiki.com/Axes)). **[I]** The discrete reduction and new capability matter more here than importing its starting workload, energy or separate stump bill.

**[S, community references]** In Animal Crossing: New Horizons, chopping produces up to three wood pieces; the stronger axe fells a tree in three strikes, while flimsy/stone axes leave it standing. Shaking supplies a different, whole-canopy response ([Nookipedia axes](https://nookipedia.com/wiki/Axe), [tree reference](https://animalcrossing.fandom.com/wiki/Tree)). Nintendo's hosted beginner guide also describes wood/rock inputs to a first bridge, but it is written by **GameWith**, so it remains a secondary guide ([Growing your island](https://www.nintendo.com/jp/ichikara/acbaa/02_en.html)).

**[I]** Borrow the small, readable sequence and material falling at each action. Use canopy shake as secondary follow-through to a chop; the owner's chosen wood verb is chopping. Do not copy daily quotas, breakable tools, wasps, or rock-hit timing windows.

### 8. Deep Rock Galactic: removal, collection and communal purpose fit together

**[V, developer description]** Ghost Ship frames mining and exploration as cooperative work in destructible caves ([official game site](https://www.deeprockgalactic.com/)). **[S, wiki search extracts; full resource page blocked]** Its pickaxe can transfer mined vein material directly into the miner's inventory; deposited resources contribute to team outcomes ([Pickaxe](https://deeprockgalactic.wiki.gg/wiki/Pickaxe), [resources](https://deeprockgalactic.wiki.gg/wiki/Resources)).

**[I]** A miner's visible carrying capacity and a shared destination can coexist. Boogle should share the source's remaining work and the built railway, without creating a spendable communal wallet. Do not infer DRG's complete reward-allocation rules from these extracts or copy its hazards and resupply economy.

### 9. Terraria: let the game choose the small target and the appropriate tool

**[V, publisher patch notes]** Console/mobile updates explicitly support Auto Select as toggle or hold and improve Smart Cursor working with it ([505 Games, April 2022](https://support.505games.com/support/solutions/articles/150000146926-terraria-console-mobile-v1-4-3-patch-notes-2022-april-27-)). **[S, wiki search extract; full fetch blocked]** Smart Cursor and Auto Select respectively assist targeting and choosing the tool ([cursor modes](https://terraria.wiki.gg/wiki/Cursor_modes)).

**[I]** Choose an entire nearby source, then place the tool's contact on it. Aim assist should remove missed input, not create a second targeting mode that touch players must learn.

### 10. Dave the Diver: the larger loop carries the repetition

**[V, director interview]** Jaeho Hwang traces the harpoon to an enjoyable mechanic from Evil Factory. He describes separating catching and restaurant work after simultaneous tasks diluted attention, and adding new activities/goals to offset repetition. He also intentionally retained careful aiming ([Game Developer interview, 2023](https://www.gamedeveloper.com/design/dave-the-diver)).

**[I]** Borrow an attractive physical verb and a visible purpose for its output. Do not claim its longevity proves that one unchanged harvesting action suffices: the director says otherwise. Precision, oxygen pressure and deadlines are excluded here; Boogle already has exploration, building and riding to vary the work.

### 11. Pikmin and Ratchet & Clank: make modest quantities feel physically present

**[V, Nintendo developer interview]** Pikmin 4's developers describe carrying sounds varying with the group and conditions ([Ask the Developer, part 3](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/)). **[V, Insomniac testimony]** Rift Apart uses small haptic impulses for individual collected bolts ([PlayStation developer feature](https://blog.playstation.com/2021/05/13/devs-reveal-their-upcoming-dualsense-wireless-controller-implementations/)). Neither source publishes a harvesting frame table.

**[I]** Two friends chopping should sound and look like two contributions to the same object. Ratchet & Clank crates supply the useful comparison of a brief destructive gesture followed by a collectible shower; the existing [Ratchet report](ratchet-and-clank-feel.md) owns the evidence and pickup treatment. Do not add another currency, manual collection step or per-log confirmation button.

### 12. Lumberjack-style idle games: immediate progress can conceal escalating work

**[V, developer App Store description]** Appgamedo's Idle Lumberjack Game describes payment on every hit, axe upgrades/additional axes, then larger trees on successive maps ([listing](https://apps.apple.com/vc/app/idle-lumberjack-game/id6446647885)). **[V, publisher announcement]** My Little Universe ties chopping/mining to expanding terrain and tool strength/speed upgrades, with co-op support ([SayGames, 2023](https://say.games/news/my-little-universe-nintendo/)). These establish advertised loops, not measured input behavior or proof of long-term enjoyment.

**[I]** Borrow frequent visible changes and a destination for the material. Reject upgrades whose only result is permission to tackle proportionally larger health bars. Do not turn Boogle into passive proximity harvesting: one deliberate button preserves hands-on work, while holding removes repeated strain.

### 13. Game-feel research: amplification helps, but is not an economy

**[V, paper abstract]** Pichlmair and Johansen's survey groups game-feel work into physicality, amplification and support, drawing on more than 200 sources ([Designing Game Feel, 2020](https://arxiv.org/abs/2011.09201)). **[V, session abstract only]** Jonasson and Purho's GDC session demonstrates how layered presentation changes a simple game ([Juice It or Lose It](https://www.gdcvault.com/play/1016487/juice-it-or-lose)). Neither is a controlled demonstration that three-hit trees remain enjoyable for an hour.

**[V, GDC slides, pp. 10–18]** Squirrel Eiserloh recommends nonlinear shake amplitude, coherent noise, and rotational rather than positional shake for 3D ([Juicing Your Cameras](https://media.gdcvault.com/gdc2016/Presentations/Eiserloh_Squirrel_JuicingYourCameras.pdf)). **[I]** Start ordinary chops with no camera shake. The tree should supply most of the motion; optional, tiny rotational punctuation on felling is sufficient to test.

## Applying this to today's palms

### What the repository actually supplies

**[V, code inspection]** These are implementation facts, not proof that a new harvesting prototype has been played:

| Current behavior                                                                                                                                                                                      | Consequence for a smallest prototype                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`src/features/log-sources.ts`](../../src/features/log-sources.ts) registers “Take logs” within **2.2 m of an offset bundle**, not the trunk; it tracks pending takes.                                | Move the presentation/target to a trunk for the experiment. Reuse source IDs and accepted edits; do not just rename the bundle prompt and call it chopping. |
| [`src/sim/sources.ts`](../../src/sim/sources.ts) has **two charges × four logs**, wood-age sources only, and a seeded **200-tick/20 s** refill.                                                       | Charges can represent accepted strokes in a prototype. Timed replenishment is existing behavior that conflicts with this brief.                             |
| [`src/world/rules/sources.ts`](../../src/world/rules/sources.ts) applies `src.take`, spends one charge, adds what fits to the actor's stack, and drops overflow publicly.                             | Source depletion and counted yield already have a single authority. There is no tree-health, final-hit ownership or protected ground-loot system.           |
| [`src/world/rules/piles.ts`](../../src/world/rules/piles.ts) transfers public pile counts with `pile.take`; `pile.drop` spends the actor's existing stack.                                            | Calling `pile.drop` is not a way to mint additional harvest rewards. A public pile can be taken by another player.                                          |
| [`src/render/props.ts`](../../src/render/props.ts) builds palms approximately **4.4–6.6 m** tall and merges their geometry into tiles.                                                                | They are not individual scene objects ready to rotate. A test needs one separable proxy; production felling needs a deliberate mesh/collision change.       |
| [`src/sim/tune.ts`](../../src/sim/tune.ts) permits `full`, `yield`, `cost0` and `trickle`; [`rules/tune.ts`](../../src/world/rules/tune.ts) resets the loop when tuning changes, in proto rooms only. | Compare **3×4**, **2×6**, **1×12** in fresh isolated runs. Do not change tuning mid-harvest or reset someone's shared progress.                             |
| [`src/sim/materials.ts`](../../src/sim/materials.ts) still maps age to one material; stacks carry one kind.                                                                                           | Multiple goods per camp are an owner decision ahead of this code. A material-feel swatch must not pretend the multi-good economy is implemented.            |

### A single stroke, frame by frame

**[I] Starting animation target:** a **600 ms** stroke, with an ideal **150 ms input-to-contact** in a presentation-only toy. The following is a **contact-relative** score. At 60 Hz, 16.7 ms is one frame; use elapsed time so 30/120 Hz do not alter the cadence. The counts never depend on rendered frames.

| Time relative to contact | Pose and object                                                                                                                                            | Sound, particles and other feedback                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| −150 to −60 ms           | Short shoulder/tool anticipation, about **20°** of visible wind-up; feet and player movement stay under control.                                           | Quiet clothing/tool movement, if needed. Avoid a large noise before every small reward.                                                            |
| −60 to 0 ms              | Accelerate the last part of the tool arc into a selected point **0.8–1.0 m above ground**. Visual reach may correct by up to **0.25 m**; no root teleport. | A **40–60 ms** whoosh at roughly **−10 dB relative to the impact**.                                                                                |
| 0 ms                     | Tool edge touches the cut. The trunk/proxy bends **1–2°**, approximately **0.02–0.04 m at cut height**. Its base stays planted.                            | Start a dry **1–5 ms attack**, **80–140 ms wood body**, and **6 chips**, each **0.03–0.06 m**. These three cues belong to the same rendered frame. |
| 0 to 33 ms               | Hold the local striking pose for **33 ms**; use **50 ms** on the final fracture. Let the target yield visibly.                                             | Optional supported-device rumble **25 ms**, low strength. Camera amplitude **0** for ordinary hits.                                                |
| +33 to +220 ms           | Tool releases; the trunk returns with one small overshoot. Keep a persistent cut corresponding to accepted source progress.                                | Chips travel **0.2–0.6 m**, live **250–400 ms**; a dry debris tail lasts **120–250 ms**. No screen flash.                                          |
| +220 to +450 ms          | Recovery blends toward the next wind-up or locomotion. Movement/release cancels future strokes.                                                            | Allow space for the existing four-piece pickup sequence; do not play a separate large success sting on every hit.                                  |

The pause affects the **harvest pose**, not the lockstep clock, Rapier, locomotion, other players or the entire camera. Do not freeze the source for every observer because one player hit it. Remote observers see the reaction at their accepted edit and hear the spatial strike; camera/rumble belong only to the local contributor.

**The online timing constraint is real.** [`src/world/sync.ts`](../../src/world/sync.ts) uses **100 ms ticks**, stamps edits **three ticks ahead**, and aims clients **1.5 ticks behind** the host. That implies roughly **450 ms of scheduling offset before transport and tick-phase effects**, not a measured round-trip result. Its local/offline path is different. A source effect waiting for `onApplied` cannot honestly promise a 150 ms networked hit.

For the smallest connected experiment, acknowledge input immediately with tool readiness/wind-up, then align the decisive contact, source reaction and sound to `onApplied`; do not award, notch or fell on `submitEdit === true`. Do not stretch a 33 ms hit-stop into a network wait. Measure the actual press-to-contact delay alongside the presentation-only toy. If the confirmed version feels late, that is a separate prediction/interaction-architecture problem to solve before promotion, not a request for more particles or an unreviewed reduction of `DELAY`. A future speculative contact could be cosmetic and reversible, but it needs a rejection policy; it is not established by this report.

### The chain and the finish

**[I]** Start at **three accepted strokes**, separated nominally by **600 ms**: the first opens a cut, the second deepens it and leans the crown, the third breaks the silhouette. **Four logs are earned on every accepted stroke; twelve total, no last-hit jackpot.** Progress persists if someone stops or a friend supplies the next hit. No rhythm accuracy, reset window or accelerating mandatory combo.

Use a small pitched accent at **0, +2, +4 semitones** on those three contacts, keyed to the source's accepted progress, not the player's click streak. Keep the wood body approximately stable, initially favouring **180–300 Hz** resonance, so the tree does not turn into a xylophone. Vary the strike sample/timbre slightly; avoid identical consecutive samples. Final fracture may be **2 dB** louder than a normal hit, not an endlessly rising volume ladder. These are proposed source-impact values; pickup arrivals retain the separate recipe in [collect sounds](collect-sounds.md).

The final hit gets **50 ms** of local pose hold, a crack **20–50 ms after contact**, then a **650 ms** cosmetic topple: first **150 ms** slowly to about **15°**, next **500 ms** accelerating toward **70°**. Break/dissolve into a few large readable wood shapes before the crown sweeps through people. Start with a **2 m** visual fall envelope, using a shortened proxy rather than dropping today's entire six-metre palm across the path. An optional final-only camera accent starts at **0.2° rotation over 120 ms**, with zero translation; compare against no shake and respect reduced-motion settings. No damaging collider, falling-log obstacle, chain reaction or extra stump harvesting. For rock, substitute a **150–250 ms outward split** into two or three facets and a settling rubble puff; no hinged tree fall.

The third four-log group enters the existing scatter/magnet presentation. Let the outgoing pieces establish that something left the tree before they bend toward the back; use the already documented approximately **3 m magnet radius**, not another collect button. The first two groups can arrive while the next stroke starts. Ideal three-stroke contacts occur at **0.15, 0.75 and 1.35 s**, with the whole final flourish/arrival roughly **2.4–2.8 s** from first press; online scheduling adds delay. Do not hold the player still until the last cosmetic piece arrives.

The merged-palm constraint makes a **visible cut collar and one separately rendered test palm** a better first experiment than rebuilding every tree. A collar can test contact, but cannot prove a convincing full-tree fall. Production promotion must separate harvestable geometry and make standing-collision removal follow authoritative depletion on every client. Cosmetic debris stays noncolliding; physics never enters lockstep.

### One button, all devices, no precision

**[I]** Keyboard **E**, gamepad **X/Square (west face)** and the existing touch action button all mean **tap once, or hold to repeat**. The newer [owner control decision](../decisions.md) and [`src/player/input.ts`](../../src/player/input.ts) supersede older B-button text. Do not add a harvest key, tool hotbar requirement or touch reticle.

Acquire the whole trunk within **2.2 m**, using the existing nearest/facing-biased picker; [`src/sim/interact-pick.ts`](../../src/sim/interact-pick.ts) already gives facing up to a **0.6 m scoring advantage**. No small weak point or hard angular miss cone. Turn the visual body/tool toward the chosen trunk over about **100 ms** while leaving the camera alone. Keep the selected trunk while held, provided it remains within **2.5 m**; this modest hysteresis avoids flickering targets at the boundary. A **120 ms input buffer** may carry one early tap into the next stroke, but never queues a whole stack of future strikes.

Repeat at most once per **600 ms**, with at most one pending source take in the initial prototype. Tap spam has no speed advantage. Release, walking out of reach, a full/wrong-kind stack, source depletion, focus loss or disconnect ends the repeat. Require a fresh press to acquire the next tree: a held chop must not turn into throwing the bundle or opening nearby dialogue when the tree disappears. Already accepted edits still resolve; input release does not undo authority.

[`src/player/hands.ts`](../../src/player/hands.ts) currently has press/release paths but no general held-target harvesting contract. Keyboard E and touch call into hands directly; wrapping only the registered gamepad action will miss them. Put the small common press/hold/release behavior at that shared boundary, still discovering trunks with `registerInteractable`. Follow `wrapAction` where an action really is wrapped; never mutate another action by ID. Keep one generated control-guide entry and the existing touch hit area. Haptics are optional enhancement, never the only hit cue.

### Drop-in co-op: shared work, conserved yield, no final-hit race

**[I] Lowest-cost contract with existing ops:** one source has three shared charges; each accepted `src.take` reserves four logs directly in that contributor's authoritative stack. If A hits, B hits, A finishes, the total is **A:8 + B:4 = 12**. Both shortened the same task and both can feed the same railway. The last hit is worth four, just like the first. A nearby spectator receives no duplicated spendable logs; they still inherit the completed infrastructure.

Each client presents accepted hits from both players. Two coincident contacts may share a capped target recoil, but do not delete either contributor's sound/visual acknowledgment. Two requests for the last charge resolve in existing authoritative order: one spends it; the other earns nothing and exits its preparation cleanly. Do not play a second fracture or count speculative rewards. Joiners reconstruct the remaining cut from source charges, not a private hit counter. Reconnection loads current state without replaying old pickup showers.

For the first experiment, the falling logs are **reserved cosmetic pieces representing the four already committed logs**. They are not a public prize other magnets can intercept. This matches today's direct-to-stack accounting and tests the visible fall-to-magnet beat, but is **not yet literal persistent ground loot**. Label that limitation in the prototype.

Full-stack handling matters: only start a hit when the entire four-log yield fits, and show a blocked target when it does not. The current rule still allows public overflow, so this local guard is an experiment safeguard, **not a complete guarantee against overflow races or arbitrary clients**. Do not claim existing `pile.take` solves stealing. If promotion requires physical, persistent shared drops, it needs a small explicit rule change: conserve a fixed yield, reserve each contributor's earned share, and transfer only on an accepted pickup. Reservations must survive reconnect and never expire into someone else's loot on a timer. The exact saved ownership/transfer policy belongs in that separately reviewed rules change. Do not mint the same logs both through `src.take` and a new ground-pile award.

“Shared yield” here means **one conserved source divided by accepted contributions, shared construction benefit**, not equal duplicated payouts or a new communal wallet. An equal split would be a different rule with contributor/roster state and integer remainder handling; it is unnecessary to answer the first palm test.

### Distinct resources without distinct rulebooks

**[I]** Keep the targeting, input and accounting constant. Change tool pose, source deformation, debris shape and sound envelope. Two sources should be distinguishable with sound muted, and their impacts with the screen hidden.

| Material family                 | Contact / finish starting preset                                                                                                     | Smallest palm test                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Wood                            | **33 ms hold**, **1–2° spring**, fibrous chips and growing notch; slow-then-fast final lean.                                         | Actual wood source, cut collar, axe pose, four-log burst.                                                      |
| Stone                           | **40 ms hold**, only **0.01 m recoil**, **4–6 angular chips**; dry low knock and short grit; final faceted split.                    | Grey stone-shaped sleeve around the test source; same three source charges. Keep reward labelled as test logs. |
| Ore-bearing rock                | Same stone work; **2–3 bright flecks** and **180–250 ms ring** at fracture, exposed coloured interior.                               | Change sleeve interior/debris and impact sound, without inventing ore economy.                                 |
| Plants/fibre, if later selected | **0–16 ms hold**, soft rustle and **0.15 m upward tuft pop**; one pull is preferable to three axe chops.                             | A fibre presentation swatch only; no unapproved new crop system.                                               |
| Manufactured camp goods         | A solid latch/thunk or release sound, a compact batch visibly leaving the output point. No chopping sacks or mining electric charge. | Reuse the current bundle source as an output-rack comparison next to the harvest palm.                         |

Different goods can share a camp without each requiring a minigame. Source shape, colour, item silhouette and the carried bundle explain what was obtained. Tool choice is contextual. The current one-kind stack can remain the palm experiment's constraint; multi-good outputs require an explicit catalog/source-kind design before implementation, not a silent replacement of `materialOf(age)` in this polish task.

### Avoiding the hour-one chore

**[I]** Rhythm makes a repeated action comfortable; it does not excuse unnecessary repetitions. Separate **strokes, stops, travel and purpose**:

| Quantity                           | Today's default                                                           | Proposed first comparison                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Yield per source                   | 2 takes × 4 = **8**                                                       | 3 strokes × 4 = **12**                                                                                   |
| Work for one 60-log section        | **15 presses**, at least 8 sources                                        | **15 strokes**, 5 sources, optionally **5 holds**                                                        |
| Source spacing                     | Home palm placement has a **4.5 m minimum**, not a measured typical route | Select a short **five-palm route**, roughly **6–10 m** between useful sources                            |
| Travel between those sources       | Measure in the actual layout                                              | Roughly **1.1–1.8 s** at the documented **5.6 m/s walk**, before turns/acceleration                      |
| Initial section's harvesting share | Not measured here                                                         | Aim for **15–25 s** including movement among sources, separately from delivery, pouring and construction |

Walk speed is from [player as built](../game-design/player.md). Five ideal 2.4–2.8 s tree presentations plus four short transitions is roughly 16–21 s before network delay or path detours. This is a budget, not a measured performance claim. If actual harvesting exceeds **30 s per early section**, reduce necessary strokes/stops or increase useful yield before adding richer effects. Do not enlarge section costs to cancel that improvement.

Compare against **one satisfying hit for twelve logs**, not only against the weak current pickup. Three strokes have to earn their extra time. Record whether players voluntarily harvest another tree after a goal is met; then check the full gather → carry → build → ride loop. A three-minute toy session cannot establish hour-one retention. Follow a successful short test with **15 minutes**, then an approximately **one-hour session** containing actual progression, tracking repeated work per completed section rather than total loot collected. These are research-session lengths, not in-game timers.

Supply must not require waiting. Existing **20 s trickle** conflicts with the no-timers brief; setting its tunable to 6000 merely delays it and is not “off.” The first isolated no-timer prototype needs an explicit validated off path or removal of that tick behavior, while keeping the existing **section-completion refill**. That is a small lockstep change requiring conservation/validation tests and the repository's wire/version policy, not a Local cosmetic hack. The home generator targets **36 palms**; if all are placed, twelve logs each provide **432 logs before any refill**. Verify the actual source count in the test room; don't clear sources locally to manufacture more counted wood. Refill on a completed connection can be presented as a new harvestable shoot/material batch without resetting everyone's view mid-stroke. Longer-term rail supply reduces the need to strip decorative palms at all.

### Eras: the old job becomes visibly easier

**[I]** Keep old sources relevant so the next tool can demonstrate its change. These are experiments aligned with the six chosen era themes, not six new approved upgrade systems. Begin with wood and steam; do not build six tools before proving the first transition.

| Era                 | Candidate change in work                                | Initial comparison, preserving 12 logs per old tree                                                                                                                        |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wood                | A hand tool visibly bites and releases.                 | **3 × 4**, 600 ms cadence.                                                                                                                                                 |
| Steam               | A powered return stroke removes a whole repetition.     | **2 × 6**, still 600 ms; shorter job, more decisive second hit.                                                                                                            |
| Iron and harbour    | A clean heavy cut finishes familiar trees at once.      | **1 × 12**, with the same 150 ms ideal wind-up/contact target; no long charged attack.                                                                                     |
| Diesel and concrete | A broad cutter changes placement, not click speed.      | One held work gesture reaches **two sources within 3 m**, with their separate conserved yields. Requires source-layout and multi-target work beyond the first tuning test. |
| Electric            | A smooth powered action replaces discrete heavy swings. | **Three visible material pulses over 600 ms** as presentation of an accepted batch; no rhythm test, battery or heat bar.                                                   |
| Future              | Harvest a small group with a single readable gesture.   | At most **three selected sources within 5 m**, subject to capacity; compare against electric before adding an asset family.                                                |

The first three settings already fit room-level `full`/`yield` tuning for isolated comparisons. They are **not** per-player tool levels: era unlocks, multiple source kinds and wider harvest operations need explicit rules. Later multi-source proposals must preserve integer counts and avoid flooding the edit queue. Town/rail milestones should make the tool available to late joiners too. Never increase the old tree's hit count as the tool improves. The same reasoning from [compounding infrastructure](compounding-infrastructure.md) applies: if improved collection merely funds larger compulsory costs, the player has not escaped the solved work.

## Implementation boundaries and evidence limits

**[V, standard-engine comparison]** Unity exposes per-Animator [`speed`](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/animator/speed); Unreal's [`USkeletalMeshComponent.GlobalAnimRateScale`](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/USkeletalMeshComponent) scales animation on that component; Godot's [`AnimationPlayer.speed_scale`](https://docs.godotengine.org/en/4.2/classes/class_animationplayer.html#class-animationplayer-property-speed-scale) can pause that player's animation. These are mechanisms, not engine mandates to use hit-stop. **[I]** Boogle's equivalent should be a small presentation clock/pose hold on the harvest view, consistent with the [entity migration plan](../plans/entity-architecture.md), not global time dilation or a new framework.

Keep authority in existing source/stack/pile ops. Put reactions in adapter `onApplied`, recover canonical cut states on snapshot, and draw Local motion through the normal loop. Use the shared [`particles.emit`](../../src/render/particles.ts), the existing audio path, and TSL node materials if a cut mask is needed. The hero's approved animation direction should receive one suitable tool clip/upper-body treatment; this is not permission to redesign locomotion. No effects in rules, no trigonometry in lockstep, no count from a mesh collision, no new frame loop.

Some stronger claims remain unverified: exact hit-stop durations in the named games, centimetres of target recoil, contemporary Palworld tool yields, measured Fortnite hit cadence, and the original Sons of the Forest interview video's wording. Search extracts are marked as such. Sakurai's hit-stop video and the GDC session listing are discovery leads, not frame measurements. The research supports design mechanisms and trade-offs; only running Boogle can establish the right values or whether confirmation delay is acceptable.

This document changes research only. A future visual implementation follows `npm run look`, opens every output PNG/motion sheet, and updates [haul as built](../game-design/haul.md) and the appropriate [prototype entry](../../protos/protos.ts). Feel/UI changes get no new unit tests or scenarios under the test diet; actual lockstep changes get deterministic count/validation tests. A new sync contract, if necessary for reserved ground loot, earns its own scenario.

## Numbered recommendations, ordered by expected gain per cost

The ranking is **[I]**, not measured ROI. Each experiment uses today's palm/source loop; higher-cost promotion work is called out rather than hidden in a cosmetic prototype.

1. **Make contact agree across pose, tree and sound.** Start with **33 ms local pose hold, 1–2° target yield, six 3–6 cm chips, and zero ordinary camera shake**. Smallest prototype: one cut collar at an existing palm, triggered with the tool pose and woody attack on its accepted `src.take`; compare with effects individually disabled. Touches [`log-sources.ts`](../../src/features/log-sources.ts), the harvest presentation and shared particles/audio. **Highest gain, small cosmetic scope. This contact is the single most important beat.**
2. **Make tapping and holding the same forgiving action.** Use **E / X–Square / touch**, **600 ms repeat**, **2.2 m acquisition / 2.5 m retention**, and at most one buffered tap/pending take; release or depletion ends the action. Smallest prototype: hold on one palm, walk away, then stand beside a second interactable and verify there is no accidental throw or dialogue. Touches [`hands.ts`](../../src/player/hands.ts), [`input.ts`](../../src/player/input.ts) and the existing picker. **High gain, modest shared-input work.**
3. **Give the palm a three-beat progression with an honest yield.** Compare **3×4 logs**, **600 ms cadence**, persistent cut states and a **0/+2/+4-semitone accent** against **1×12**; no final-hit bonus or timed combo. Smallest prototype: two fresh proto-room runs using existing `full`/`yield` tuning, with four visible rewards per accepted stroke. Touches [`tune.ts`](../../src/sim/tune.ts), source presentation and [collect-sound handoff](collect-sounds.md). **High gain, small presentation/tuning scope.**
4. **Keep a section's harvesting within an explicit effort budget.** Start at **five trees / fifteen strokes for 60 logs**, choose sources **6–10 m apart**, target **15–25 s gathering**, and investigate anything above **30 s**. Smallest prototype: harvest one marked five-palm route and build today's section; count presses, stops and travel separately. Touches [haul tuning](../game-design/haul.md) and the later source-layout brief, not a new economy. **High gain, very low experimental cost.**
5. **Make the final stroke change the silhouette and hand off to the magnet.** Start with a **50 ms final pose hold**, **650 ms topple**, **2 m cosmetic fall envelope**, four final logs and the existing **3 m magnet**. Smallest prototype: one separately rendered palm proxy, no falling collider or stump task. Touches [`props.ts`](../../src/render/props.ts) and [`haul magnet`](../../src/proto/haul/magnet.ts). **Medium implementation cost; merged palm geometry prevents treating this as a free rotation.**
6. **Share the source's work while reserving each contribution.** Start with **twelve conserved logs**, four per accepted hit: **A/B/A gives 8/4**, and simultaneous last hits produce one finish. Smallest prototype: two players hit one palm with room in their stacks; both see all hits and each sees their reserved pieces magnet home. Touches [`sources` rules](../../src/world/rules/sources.ts), source adapters and snapshots. **Essential co-op gain; literal protected ground loot/overflow needs a separate rules change, not just this visual test.**
7. **Distinguish materials with a few presentation presets.** Start with wood's **33 ms spring**, stone's **40 ms/1 cm knock**, and ore's **180–250 ms ring**, keeping one targeting/control contract. Smallest prototype: swap a wood collar, stone sleeve and ore interior around the same palm-source fixture, retaining test-log accounting. Touches source view/audio; multi-good camps later touch [`materials.ts`](../../src/sim/materials.ts). **Moderate cost; no extra harvesting minigames.**
8. **Replace waiting-based replenishment with progress-based supply.** Disable the existing **20 s trickle** explicitly; retain section-completion replenishment and a finite starting stock of **36×12 = 432 logs**. Smallest prototype: an isolated no-trickle palm room completing two sections without waiting, with no Local reset minting resources. Touches [`sources.ts`](../../src/sim/sources.ts), source/tuning rules and their pure tests. **Small code change but shared-state review required; a large interval is not an off switch.**
9. **Let tools remove whole actions before adding breadth.** Compare the same twelve-log palm at **3×4 → 2×6 → 1×12**, then consider two-source breadth for later eras; keep construction costs unchanged in the comparison. Smallest prototype: three fresh room-level tuning runs on the same palm route, before making steam-era art. Touches existing tuning and the [six-era audit picks](../decisions.md); individual tools and area harvesting remain future rule work. **Largest long-term gain, highest integration cost; upgrades must retire work rather than inflate it.**
