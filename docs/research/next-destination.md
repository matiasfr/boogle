# The next destination after Line 1

_Note added 6 November 2026: the owner moved the main-game target to roughly six hours, a rough target rather than a rule, with solo and groups of two or three close together ([decision log](../proposals/boogle-2.md#the-shape-of-the-game)). Read eight-hour figures below as the earlier target._

_Research report, 6 November 2026. Four candidates after the owner's roughly 30-minute demo: Line 1, T1–T3, the walk home, track layer and cove. Live primary-source research and repository inspection at `e7eea656`; recommendation and visual planning only. No gameplay changes, new playtest or implementation approval. Companion: [visual comparison](next-destination.html)._

**Recommend the east quarry, reworked as a split-rock works: open a haul route through a cracked wall, connect the works, and bring home concrete footings that make the first sea crossing possible. Then cross to the ring island; use a high gorge later, with the forest town as an alternative rather than another compulsory chapter.** This continues the existing map while testing something the first line cannot establish: whether reaching a second source makes the whole railway more useful.

**Evidence key:** **[R]** inspected repository or named local panel report; **[V]** live primary text read; **[H]** proposed design, estimate or inference. All candidate names, layouts, bills and durations are **[H]**. GDC evidence is the public abstract, not a watched talk. No reference game or Boogle build was played for this research. “Home” below means the new starter village; the **original island** is the separate eventual Boogler destination.

## Starting point and authority

**[R]** The owner's 6 November brief says the vertical slice feels good. Accept that as the premise for this consultation; do not make the stale 3 November [direction view](../direction.md) veto this research. It does not establish that all downstream prototype content has graduated, that every production proof is closed, or that a novice finishes in 30 minutes. The newest recorded [playtest](../playtests.md#2026-11-04-owner-solo-on-iphone-the-default-url) is an earlier iPhone solo session; it cannot substitute for today's statement. The [round-4 tracker](../plans/round-4-notes.md) retains unresolved co-op and ability-pacing observations.

The [production plan's 6 November proof](../plans/production-core.md#current-main-browser-proof-6-november-2026) reports solo/co-op T2/T3 and first-path evidence, with explicit limits. Its [promotion slices](../plans/production-core.md#reviewable-promotion-slices) still separate forge/depot work, schedules/town payoff and lifetime cleanup. This report proposes **controlled second-area development**, not a declaration that the full campaign infrastructure is finished. No requirement to finish an unrelated engine programme is added.

The [decision index](../proposals/boogle-2.md#current-decision-index), [shape of the game](../proposals/boogle-2.md#the-shape-of-the-game), [rail/world decisions](../proposals/boogle-2.md#trains-and-the-world), [owner calls](../agents/owner-calls.md#owners-standing-calls) and [DESIGN.md](../../DESIGN.md) constrain the options:

- Materials and abilities replace global eras and collectible quotas. New goods improve particular machines and places; old infrastructure stays useful.
- Path first, staged relief, trains when they matter. Connecting a source brings its goods closer automatically; players still make the meaningful final contribution to construction.
- Every required action works solo and survives a helper leaving. Optional mini-games never supply required materials or keys.
- The next goal and its payoff read in the world. Do not restore the removed objective marker, require a map UI, or rewrite The Boogler to explain it.
- Counted work has a visible physical form. A hammer is a candidate tool, not permission for terrain destruction, combat or survival upkeep.
- The long-term finish is the original island and The Boogler. A harbour or mountain cannot silently replace that ending.

### What the layout actually supplies

**[R]** Mapped `src/proto/place` before source reads. There is no nested `AGENTS.md` under `docs/` or `src/proto/`; no high-risk source folder was edited or reviewed. These are authored layout facts, not a new runtime survey:

| Owner / symbol                                                                          | Inspected fact                                                                                                                 | Consequence for the next destination                                                                                                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shore-layout.ts](../../src/proto/place/shore-layout.ts), `SHORE_LANDING`, `SHORE_PATH` | Arrival at local `(-199, 10)`; the cottage path joins town at `(-98, 9)`                                                       | Keep the cove and first arrival intact. The new departure starts from the remembered village.                                                                                                       |
| [layout.ts](../../src/proto/place/layout.ts), `ORIGIN`, `VILLAGE`, `PATHS`              | Local x is offset by 1,000 m in world space; north is −z. Village `(-100,14)`; a southern foot loop already reaches the quarry | The quarry can be scouted before its railway. No new island or boat is needed to test it.                                                                                                           |
| Same file, `LINKS`, `LINES`, `EAST`                                                     | Timber has T1–T3. Quarry camp is `(98,52)`; Q1–Q6 continue through the east table and Far Head to the pier                     | “Next after T3” and “next after the full Place pier” are different questions. Reuse the quarry corridor, but do not mistake the legacy Q sequence for an approved new-area design.                  |
| Same file, `GOODS`, `ROCK_WORK`, `ROCKS`                                                | Logs, rails, stone and beam already exist; T2 already asks for stone                                                           | Plain stone is not a new discovery. The quarry needs a construction product and a spatial verb, not differently coloured rocks.                                                                     |
| Same file, `FORGE`, `RACK`, `YARD`, `TURNTABLE`                                         | Forge `(-87,-3)`, rail rack `(-85.5,5.4)`, stone yard `(-62,20)`, turntable `(-82,12)`                                         | Put the first returned improvement beside the existing work: the player can see what the shipment changed. These coordinates are reference anchors, not checked free building plots.                |
| Same file, `HEAD`, `FAR`, east-line endpoint                                            | Far Head `(392,-170)`; pier approximately `(402,-372)`; distant island marker `(330,-1120)`                                    | The shard is already a promise. Its marker is about **751 m straight-line from the pier**, not a measured 1.2 km rail route. Do not stretch the current map silently to match a past crossing test. |

The [Place description](../game-design/place.md#the-place) also documents the ring, shard and telescope, and its longer prototype contains movement discoveries. **Do not assume a T3-only production player has the full prototype's hook, glide and double jump.** Quarry A requires none of them. B–D must audit actual entitlements before planning their teaching beats; earned moves are retained, missing ones need a separate introduction, never an unexplained seeded unlock.

### Required reading: reconciliation rather than revival

The report format follows [next-destinations](next-destinations.md) and [vast-world-scale](vast-world-scale.md): dated scope, evidence markers, inline sources, concrete numbered recommendations and smallest proofs.

| Requested input                                           | What was found and retained                                                                                                                                              | What does not carry forward                                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/research/destinations*.md`, research and panel      | No exact matches in this checkout or tracked history searched. Read [next-destinations.md](next-destinations.md), plus the three round-2 places reports identified below | Do not claim the missing filenames were read, or that the panel selected one unanimous route.                                                                                     |
| [progression-paths.md](../proposals/progression-paths.md) | Located under `docs/proposals/`: notice → reach → visibly restore                                                                                                        | Historical any-K-of-M era leads, water/crop loops and toy-based mandatory progress are superseded.                                                                                |
| [six-eras.md](../proposals/six-eras.md)                   | Also under proposals: one new construction job, supply from the reachable side, old routes retained                                                                      | Global eras, its early ability placement and port finale do not bind this design.                                                                                                 |
| [island-layout.md](../proposals/island-layout.md)         | Also under proposals: compare sightlines, actual approach and walking detour                                                                                             | Its classic island, 157 m Mine Isle and lighthouse-line recommendation are not the current Place map.                                                                             |
| [vast-world-scale.md](vast-world-scale.md)                | First ride versus repeat commute; arrival/readiness and return recovery require proof                                                                                    | Its old renderer/grid audit and 30–60 m/s ladder are not current implementation facts. The later owner crossing anchor is about 1 minute at 20 m/s, not a universal route length. |
| [era-progression.md](era-progression.md)                  | Silhouette, useful landmarks, additive heritage, one fresh action                                                                                                        | Whole-town swaps and era-wide sky/material changes contradict material-led progress.                                                                                              |
| [discovery-progression.md](discovery-progression.md)      | A shared permanent solution can leave personal discovery available                                                                                                       | Mandatory group chords, ball-produced progression, lead quotas and a journal system are not approved prerequisites.                                                               |

**Panel provenance [R]:** read `/Users/matiasfranco/Developer/boogle-daily/.look/codex/places-design/report.md`, `places-systems/report.md` and `places-creative/report.md` under the same parent. These are local handoffs, not tracked decisions; the portable reconciliation is also in [upgrade-economy.md](upgrade-economy.md#reconciliation-with-the-newer-route-and-places-panel). Design and systems prefer Glasshouse/fibre → Split Shell/cement → Exhibition/steel. Creative prefers Ringworks/steel → Glasshouse/fibre → Folded Coast/cement. They converge on multi-use components, permanent routes and smaller ability discoveries, but disagree on order and crystal-support scope. Keep those disagreements visible.

**Why this recommendation differs:** yesterday's next-destinations report begins after a completed starter/pier and recommends an overseas cement coast. Today's brief begins after **Line 1 and the walk home**. Move the first cement experiment into the already-reachable east quarry; reserve the first overseas expedition for a larger contrast. This is a proposed rescope, not a claim that Chalksound or the panel's itinerary was approved. If the owner means the full pier is already complete, skip the quarry extension and select **B**, with its near-bank support supply established first.

## Live findings that change the choice

### 1. Export the payoff; do not restart the first hour

**[V]** Wube's 2024 development retrospective reports that the early Space Age run was too long, repetitive and awkward at scale. The response included fewer recipe steps, more distinct planetary play, and allowing powerful planet-specific producers to be used elsewhere. That made expansion more rewarding. [Factorio FFF 417](https://factorio.com/blog/post/fff-417).

**[H] Boogle:** judge a destination by what improves on the railway already built. Cement buys useful footings and a loading ramp; steel buys a span and a train fitting. Do not force a fresh wood economy on each island or enlarge every later bill to erase the improvement. This argues for the quarry only if it exports a capability.

### 2. The view and arrival must be worth reaching

**[V]** Adam Robinson-Yu describes the summit respite, a changed perspective and a tiny world that still rewards taking the opposite route. [A Short Hike developer account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/). The [GDC 2020 abstract](https://www.gdcvault.com/play/1026613/) identifies a deliberately small initial project made within a four-month deadline; it gives no Boogle production-rate estimate.

**[H] Boogle:** the quarry gets a hollow cliff room and a train passing through its opening; the forest gets a shaded town under huge crowns; the mountain gets a view back over the built line. A material dispenser alone is not a place. Keep one arrival, one local loop and one remembered return before adding acreage.

### 3. Constrain the railway problem before building an editor

**[V]** Nintendo's Spirit Tracks team spent roughly a year exploring free track laying, then shifted to restoring a prescribed network because players struggled with where to build. They retained the pleasure of steadily expanding reach. [Iwata Asks: train design](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/Iwata-Asks-The-Legend-of-Zelda-Spirit-Tracks/3-Play-That-s-Only-Possible-on-a-Train/3-Play-That-s-Only-Possible-on-a-Train-226909.html).

**[H] Boogle:** author the quarry's freight throat and long foot loop. Let the player change access with one breach rather than choose arbitrary spline geometry. Later free track remains a separate owner direction; it is not a prerequisite for another enjoyable destination. Boogle's physical construction and ride-only trains differ from Zelda's driving challenges.

### 4. Convenience is an expedition reward

**[V]** Coffee Stain describes the artefact-researched Dimensional Depot reducing repeated storage travel, while Project Assembly visibly expands with each phase. [Satisfactory 1.0 account](https://coffeestain.com/news/satisfactory-1-0-launch/).

**[H] Boogle:** remove an inconvenience after the player has understood it. Show the quarry kit unloading into a useful home ramp and a frontier rack. Preserve the physical freight journey rather than borrowing globally accessible inventory. A shorter trip and a new place to build are different rewards; show both.

### 5. Borrow the co-op invitation, check the attendance contract

**[V]** House House's current FAQ says Big Walk requires at least two players, offers world variants for different group sizes, and expects the same group across sessions. [Official Big Walk FAQ](https://bigwalk.game/faq/).

**[H] Boogle:** seeing a friend above a route or helping move an oversized object is a useful social fantasy, but Boogle promises solo and drop-in play. Use a latched gate, a parked load and interchangeable jobs. A quarry helper can scout while another stocks; a player leaving cannot strand the only tool, reset the solution or require a second person at a switch.

### 6. Make the action readable at the actual camera

**[V]** HAL describes giving players quiet exploration space, forgiving apparent hits and landings, and coordinating level art with mechanics to clarify height and direction. Familiar object functions helped shape Kirby's setting-specific actions. [Kirby and the Forgotten Land developer interview](https://www.nintendo.com/au/news-and-articles/ask-the-developer-vol-4-kirby-and-the-forgotten-land/).

**[H] Boogle:** broad cracked slabs and a large freight opening communicate a hammer's purpose; thin targets and precision climbing do not. Keep the early quarry floor wide and safe. Do not borrow Kirby's fixed camera wholesale or make every quiet path another puzzle.

## Four candidates

All details below are **[H]**. The SVG maps are top-down relationship sketches, not surveyed terrain or validated collision. A solid route is rail; a dashed route is the first walk; a marked opening is the new action. The HTML toggle hides the completed route so the before/after can be compared.

### A. Split-rock Works — recommended next

**Fantasy:** walk into a bright, split limestone bowl where a tiny crew makes absurdly large bridge feet. The camp's work makes sense from the rim: rock face, works, outbound rack, railway and a view back to home. It is the existing east-table quarry given purpose, not a new island appended to it.

**New verb:** discover a broad-faced breaker in the accessible works; crack one authored brittle wall to open a haul cut. Try it first on a harmless side opening, then use it on the freight throat. The result stays open. No dynamic terrain, loose-fragment puzzle, tool durability or combat. If the strike is not fun without a reward, compare one rigid counterweighted gate and cut the breaker rather than invent a demolition tree.

**Rail and economy:** the first loop reaches the works on foot with existing movement. Existing timber, stone and forge rails fund the approach; the new product never funds its own access. Connecting the works enables **precast footing kits** made from its local limestone/cement process. Treat this as one player-handled manufactured good; limestone, dust and curing are scenery/process stages, not three inventory types. Ordinary stone remains useful. Kits support the next shoreline deck, a home loading ramp and, later, a larger receiving bay; the ramp and next deck are enough for the first proof.

**Home:** return via the familiar village station. Watch one kit become a walkable ramp beside the forge/stone yard; the next is staged for Far Head's approach. The home street remains recognizable. The export is not automatic world-wide improvement: a named installation visibly uses it.

**Co-op:** one person opens the upper cut while another fills the lower frame; then both see the first loaded train pass through. Either job can be done sequentially alone. A broad beam/support load can reuse existing optional help-carry once its production boundary supports it; no new shared rigidbody contraption is required.

**Scope:** one existing terrain pocket, one folded walk, one breach, one production assembly, two useful installations, roughly two meaningful construction contributions rather than six duplicated stations. Target **35–50 minutes** after the demo, only if the named actions earn it. Proof **3–5 focused person-days**; integrated area **8–14 total person-days**. Main risk: the “new” quarry still feels like T2 with a hammer. Cut repeated harvesting first.

### B. Ring Island — the first overseas payoff

**Fantasy:** the ring and shard that have been on the horizon become a place beneath your feet. A small working settlement occupies the ring's foot; an oversized steel apparatus has a missing freight aperture. Preserve the extraordinary geology rather than mining away the landmark.

**New verb:** brace and latch a large counterweighted aperture so cargo can pass. One forgiving handle and a recoverable brace are sufficient. This is a construction operation, not another avatar movement power. Existing hook/glide routes can provide optional upper views only where those abilities are actually earned.

**Rail and economy:** build outward from the supplied near shore, with a local moving supply point and few meaningful span jobs. Initial timber/rail/support supplies are all reachable before departure; A supplies footings in the recommended order. On the far side, connect a small steel works using local ore/salvage scenery, exporting **steel span kits and engine fittings**. Keep a finite demonstration reserve for the first local use; continuing output belongs to the connected source, not an exhaustible pickup cache. No fuel loop or new boat.

**Home:** the first steel return upgrades one known engine or freight deck visibly; a second assembly helps the next deep crossing. The quarry remains a source of feet, the timber camp a source of decking. Freight convenience must reduce repeated sea errands.

**Co-op:** shore supplier and advancing builder see each other's work; after arrival, one explores the service gallery while another parks the brace. The latch stays solved if anyone leaves. The first shared sit-down ride is a reunion, never a compulsory cinematic.

**Scope:** one small new shore, ring interior/yard, short gallery loop, one aperture mechanism, crossing kit and one home fitting. Target **50–75 minutes**, including construction and first crossing; not a one-minute ride stretched into an hour of deposits. Proof **5–8 days**; integrated **16–26 total days**. Risks: arriving before collision/assets are ready, weak repeat rides, and the ring promising a much larger mystery than the small area delivers. Its old 1.2 km / 20 m/s crossing benchmark is a comparison, not the geometry specification.

### C. High Gorge — make the railway climb

**Fantasy:** a small station inside the shoulder of a huge folded mountain; home is now visible below the bridges you built. The summit is a lookout, while the useful freight route follows a broad contour across the gorge.

**New verb:** install a counterweight and release a permanently usable cargo lift. The lift demonstration happens at reachable low ground; it later carries a heavy kit to the upper receiving terrace. Use existing movement on optional high ledges; the main job has a broad walking approach and no mandatory precision glide.

**Rail and economy:** connected steel and cement fund the first elevated approach. The upper works export **copper cable/hoist fittings**, enabling lifting at later sites and a home gantry. This avoids adding the older proposal's speculative growing-crystal supports. Do not introduce electrical-grid simulation, a new train type and a new avatar power together. Train speed on slopes is a future ride-design question, not “copper means faster.”

**Home:** a hoist shortens an awkward transfer at the familiar yard; the same kit enables a high loading terrace at the next harbour. The local old walking route stays, so the improvement is legible.

**Co-op:** lower-yard loading and upper-yard receiving are complementary; one person can ride between them. The lift has a reachable call control at each end, a safe dismount and a stable parked state. Nobody must stand on a pressure plate while a friend disconnects.

**Scope:** one folded landform, low and high yards, one lift, one contour rail, one gantry installation. Target **50–70 minutes**; proof **5–9 days**; integrated **18–30 total days**. Risks: camera occlusion, standing/carrying on a moving lift, grounding and rail grade. A taller version of the starter gorge is insufficient: the changed freight operation must justify it. Defer until steel spans are useful and the lift can be proven independently.

### D. Canopy Town — the strongest alternative

**Fantasy:** a sunlit glasshouse and wooden street among enormous living trees; trains pass beneath hanging baskets while a loom fills the loading bay. The huge trees are inhabited landmarks, not the next harvest tier.

**New verb:** reconfigure two rigid roof shutters to pass an oversized loom spindle, leaving the loading aisle open. Solve sequentially alone; optional paired carry makes the same job funny. Use already-earned hook/glide for canopy side routes; missing abilities need an explicit small discovery stop, not hidden assumptions.

**Rail and economy:** ground-level entry uses existing timber/rails. The low railway becomes a through route once the aisle is open. Connect **tough fibre**, exported as sling/strap kits: a larger carry sling, automatic unloading at one equipped crane and town awnings. Glider cloth is a later improvement only if glide exists. Avoid a second generic log commodity and cloth simulation; show rigid rolled bundles and simple unfurling.

**Home:** the familiar crane gains a strap that removes one manual transfer, and its awning visibly echoes the forest town. The improved sling helps cement/steel work elsewhere. Ordinary wood still supplies structure.

**Co-op:** someone adjusts a shutter while a friend guides the spindle; either can park it and swap jobs. Optional canopy exploration and ground freight keep people within sight without demanding voice chat. No timer, synchronized levers or mandatory mini-game.

**Scope:** one ground street, one interior aisle, two shutters, a spindle, fibre output and two fittings; no whole treetop city. Target **45–65 minutes**; proof **4–7 days**; integrated **14–22 total days**. Risks: foliage/camera clutter, skyline art cost and the crane benefit being too subtle. Choose this first only if the owner wants maximum contrast and accepts the larger kit cost; it can replace C in the campaign rather than extending it.

## Comparison and proposed route

**[H]** These are editorial judgments, not numerical quality scores. “Total days” includes the proof, layout, bounded art/motion, integration and targeted verification for one experienced contributor with agent support. It excludes owner wait time and uncompleted production-core work. No throughput study supports these ranges; confidence is low. Calendar time is not obtained by dividing them by agent count.

| Candidate     | Distinct action              | Useful export                 | Reuse                                                 | Principal uncertainty             | Proof / total person-days | Place in route                             |
| ------------- | ---------------------------- | ----------------------------- | ----------------------------------------------------- | --------------------------------- | ------------------------- | ------------------------------------------ |
| A Quarry      | Open a permanent haul cut    | Precast footings              | High: existing footpath, quarry, home yard            | Is the second source interesting? | 3–5 / 8–14                | **Next**                                   |
| B Ring Island | Brace a freight aperture     | Steel spans + engine fittings | Medium: promised landmark, pier direction             | First access and repeat crossing  | 5–8 / 16–26               | **After A**                                |
| C High Gorge  | Install and use a cargo lift | Copper hoist fittings         | Medium: known rock vocabulary; new vertical machinery | Lift/grade/camera proof           | 5–9 / 18–30               | Later, if vertical freight earns its cost  |
| D Canopy Town | Reconfigure a loading aisle  | Fibre slings + crane straps   | Lower: new inhabited forest kit                       | Scope and visible convenience     | 4–7 / 14–22               | Alternative to C; alternative first choice |

**Recommended order [H]:** accepted 30-minute demo → **A quarry and first export home** → **B first sea crossing and ring island** → **C high gorge** → inhabited port/cross-link → original island/Boogler. **D substitutes for C** if forest life and handling relief are more attractive than vertical machinery. It need not add a mandatory material: if selected, re-budget the later port around fibre/steel/cement and remove the copper-lift dependency. Do not silently require both routes.

The first two are the useful commitment horizon; C and the port are sequencing hypotheses. The ring island combines the earlier report's steel harbour function with its promised horizon destination, reducing the number of full areas; the shard can remain mysterious without demanding a crystal commodity. This explicitly favors the panel's simpler rigid construction over speculative crystal foundations. It is a research recommendation, not a revision to the design log.

**Pacing honesty:** the demo plus A is **65–80 minutes**, plus B **115–155 minutes**. Those are target envelopes, not measured sessions. They do not establish eight hours. An illustrative A budget is 6 minutes approach/reveal + 8 discovery/breach + 12 construction/first freight + 7 return/use + 7 breathing/exploration = **40 minutes**. If the good actions take 20, keep 20; optional wandering cannot disguise missing critical-path content. Time solo and two players separately; fixed costs should not grow with attendance.

### The first two useful shipments

**[H]** A source must repay the route before it becomes an ingredient in another invoice:

| Stage        | Already accessible input                     | Visible result                           | What becomes easier                              |
| ------------ | -------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Reach A      | Existing walking path; starter movement      | Quarry bowl and breaker demonstration    | Learn a new spatial action without a rail toll   |
| Connect A    | Existing logs, stone, forge rails            | Freight through the opened throat        | Cement kits now arrive near home                 |
| First return | One illustrative kit of 4 precast feet/slabs | A usable loading ramp beside the yard    | Walk/load across a previously awkward edge       |
| Next build   | Another kit plus existing timber/rails       | Supported near-shore departure deck      | Begin B without needing anything from B          |
| Connect B    | A's kits and the existing network            | Steel shipment through the ring aperture | Improve one known train and enable a longer span |

The **4-piece kit is a storyboard quantity**, not a balance decision. The piece count must agree with the eventual bill and visible stock. No cement waiting timer, mandatory furnace feeding or cure minigame. The returned kit travels visibly; it is not a global “cement unlocked” toast. Exact rates, storage limits and scarcity remain work for the owning production/economy plan.

## Prerequisites and smallest proof

**Disposition: bounded experiment recommended; this deliverable is research only.** The [game-direction skill](../../.claude/skills/game-direction/SKILL.md) does not approve the new gameplay. The owner can choose from this HTML first; the [brainstorm-before-building call](../agents/owner-calls.md#owners-standing-calls) applies to the unsettled breaker/export design. No new panel or agents were launched for this report.

| Before              | Dependency                                                     | Status in this research                                                | Smallest evidence needed                                                                                      |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A greybox           | First-path feel                                                | **Met as brief premise**; not independently played                     | Preserve the accepted demo rather than reopening its whole pacing                                             |
| A integrated export | Forge, material transfer and freight/town production ownership | **Partial/unknown downstream**; slices 4–5 remain separate in the plan | Owning production slice proves one source → train → home installation with solo, partner departure and rejoin |
| New breaker         | Enjoyable strike and readable permanent route change           | **Missing**                                                            | 60-second toy, then one 10–15-minute quarry loop; no reward used to rescue a dull strike                      |
| B                   | Supported near-bank supply, usable crossing and safe arrival   | **Missing for this destination**                                       | One full arrival/return with a friend at home, no inaccessible source needed, no absent landing collision     |
| C or D              | Confirmed movement availability; area-specific handling        | **Unknown/missing**                                                    | Inspect actual production entitlement, then test lift or spindle separately before dressing an area           |

**A proof, three steps only:**

1. Greybox a rim view, long foot loop, accessible breaker and freight throat on the east table. Keep the cove and T1–T3 unchanged. Compare a breach with a simple rigid gate only if the breaker fails its toy test.
2. Connect one source and send **two useful kits**: the first becomes the home ramp, the second supports the next departure. Seed only already-earned demo progress and record it; don't call this a whole-run playtest.
3. Observe solo, then two friends with one leaving mid-job. Record repeat carries, known travel, waiting and whether the player voluntarily uses the new route. Agent checks cover the route/cargo contract; the owner judges whether another place is enticing.

**What's new:** “The quarry sends home parts that change what we can build.” **One gut question:** “Did bringing that back make you want to set off again?” Stop at that owner handoff. A negative answer means revise/cut the export or local action before making a larger quarry. Passing checks or attractive SVGs cannot establish the answer.

## Numbered recommendations for Boogle

1. **Make the existing east quarry the next destination, with one new spatial action.** Serves **Toys before chores**. Touches `PATHS[1]`, `LINKS[1]` and `TOWN.camps[1]` in [layout.ts](../../src/proto/place/layout.ts), through the eventual [production slices](../plans/production-core.md#reviewable-promotion-slices), not a new parallel prototype authority. Proof: a short breach-and-return loop worth doing without its material reward.
2. **Export precast kits with two immediate uses.** Serves **Show, don't tell**. Touches the mapped forge/rack/yard anchors in [layout.ts](../../src/proto/place/layout.ts), [forge presentation](../../src/proto/place/forge.ts), and the [production presentation contract](../plans/production-core.md#presentation-ordering-and-lifetime). Prove a home ramp and the next departure deck; keep raw stone distinct from the new manufactured capability.
3. **Reach Ring Island second, combining the steel works with the existing horizon promise.** Serves **Telegraph everything**. Touches `FAR`, `HEAD`, `LINES.east` in [layout.ts](../../src/proto/place/layout.ts) and the [crossing research](vast-world-scale.md). Begin from near-bank supplies, measure the actual route, and test the return as well as the first arrival before expanding it.
4. **Use permanent solutions and independent useful jobs for co-op.** Serves **Cooperation is automatic, not negotiated** and **Designed for drop-in, drop-out**. Touches the existing [great-carry behavior](../../src/proto/place/great-carry.ts) as a mapped reuse candidate and [production-core's accepted-play requirements](../plans/production-core.md#personal-rewards-and-accepted-play). Verify solo completion, a helper departure and a late visitor using the already-open route; do not add simultaneous-switch gates.
5. **Treat high gorge and forest town as alternatives until the second area is measured.** Serves **Small and readable**. Touches [next-destinations](next-destinations.md) and the [upgrade-economy reconciliation](upgrade-economy.md#reconciliation-with-the-newer-route-and-places-panel). Compare C's lift/copper with D's shutter/fibre; choose one complete dependency path rather than collecting all four new material systems.
6. **Budget named experiences and actual entitlement, not repeated bills or re-awarded moves.** Serves **Toys before chores**. Touches the [round-4 abilities notes](../plans/round-4-notes.md), `LINKS` in [layout.ts](../../src/proto/place/layout.ts) and [prototype rules](../plans/find-the-fun.md#rules-for-every-prototype). Time A at 35–50 minutes as a hypothesis, audit the T3 player's moves, and shorten the area if its useful content is shorter.
7. **Keep the starter and original island distinct, and end on the latter.** Serves **Leave something for the next visitor**. Touches [the ending decision](../proposals/boogle-2.md#the-shape-of-the-game), [shore-layout.ts](../../src/proto/place/shore-layout.ts) and [ending research](ending-and-after.md). Every expedition improves the remembered starter; the port prepares the eventual Boogler arrival. Preserve his copy.
8. **Choose in the visual page, prove two shipments, then stop for the owner.** Serves **Show, don't tell** and the 6 November HTML-first call. Touches [this comparison](next-destination.html), [find-the-fun](../plans/find-the-fun.md#rules-for-every-prototype) and the [production stop conditions](../plans/production-core.md#what-can-keep-running-and-where-to-stop). No island factory, general track editor or full eight-hour production plan is needed to answer the first question.

## Verification and limits

Live evidence consists of seven primary pages: Wube, the A Short Hike developer article and GDC abstract, Nintendo's Spirit Tracks and Kirby interviews, Coffee Stain's release account and House House's FAQ. Their lessons support mechanisms and tradeoffs, not the proposed schedule or player response. The HTML is a self-contained publishing fragment with inline SVG, native disclosures and a CSS before/after toggle; it contains no external assets or executable scripts. Candidate maps deliberately omit metric scales. The source coordinate table is the quantitative evidence.

Required filenames were resolved as documented above; the exact destinations pair remains unavailable. The panel's local paths are provenance, not dependencies of the HTML. Current source supersedes historical memory and older report assumptions. No state architecture, renderer, gameplay, decision log or existing copy was changed. No game browser run is warranted for these documentation-only changes. Published Artifact rendering, real phone layout, device performance, production cost and human fun remain unverified. Not tested on a device.

Validation passed: Prettier on all three changed files (explicit ignore-path override because research is normally ignored), scoped lint, the `checks-for --base HEAD` selection's full `npm run check`, 46 relative file/heading links, four SVG XML parses, unique IDs and control/label references, matching light/dark token sets, fragment/viewport/gutter restrictions, external-asset absence and the 5 MB cap. The HTML is 35,799 bytes. These are static checks; they do not establish browser rendering or the proposal's fun.
