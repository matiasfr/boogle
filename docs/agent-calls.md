# Calls made without the owner

Owner, 9 November 2026: "In general I'm OK with the model picking defaults or recommendations without my input, as long
as it's logged so we can revisit them." Agents may pick a default or take their own recommendation and keep building;
every such call is logged here, newest first, so the owner can revisit it. A call the owner confirms or changes moves to
[decisions.md](decisions.md) and its row here is marked.

Ask the owner first only for direction or unapproved scope, anything irreversible or outward-facing, and a `WORLD_NS`
bump while they're mid-session ([owner calls](agents/owner-calls.md)).

**Status:** `open` (not yet seen by the owner), `confirmed`, `changed` (link the decision), `reverted`.

Split by topic on 10 November 2026 (see [decisions.md](decisions.md#recording-a-decision)): this file keeps only the calls still open for the owner, one table per topic of the decision log. A new call goes at the top of its topic's table. Once he confirms or changes a call, its row moves, word for word, to that topic's section of the [archive](decisions-archive.md).

## Core loop, pacing and progression

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: the proper axe stays 5 a hit on trees and hardwoods; rocks stay at the edge's 2 | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 13 | Planner (design review) | The existing rule, now the third yield rung (1, 2, 5); cheap to retune | open |
| 2026-11-17 | Default: Station 3 takes 32 logs (was 40) and the beam; Stations 1 and 2 and the forge keep their bills (24; 32 + 8 stone; 56) | [separate-capacities](plans/separate-capacities.md#station-3s-bill), call 14; owner: "3 but maybe reduce logs from 40" ([answers](decisions-core-loop.md#d-2026-11-17-separate-capacities-answers)) | Planner (design review) | At 1 a hit, 32 is 4 trips instead of 5 and about 70 s against today's 83 s (40 at 2 a hit), so Grant's Station 3 friction (G6) eases even before the edge; 24 would equal Station 1 and make the longest stretch the smallest log bill | open |
| 2026-11-17 | Default: Drop and loose piles stay as plain actions; the heavy-load drop-slot reservations go; the 128-pile ceiling stays and refuses a new pile without spending | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 15 | Planner (design review) | Nobody can be over capacity, so nothing needs reserving; Drop empties a back for big things and hands cargo to friends | open |
| 2026-11-17 | Default: a tree's notch and a rock's crack track pieces taken, so the last hit at any yield finishes them | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 16 | Planner (design review) | At 1 a hit the old +3 a stroke would show a finished notch halfway through the tree | open |
| 2026-11-17 | Default: propose 10 footings per future-line cargo car; Quick 25 m/s / 10, Strong 20 m/s / 20 with one whole extra identical cargo car | [Garage trade rebalance](brainstorms/garage-trade-rebalance.md#b-10--20-footings--recommended) | Designer (Codex) | Retains approved speeds and coach exemption; splits current model's line totals Quick/Quick/Strong at 1p and 3p. Quick leads are only 14.8/33.4 s; no claim of robust or live balance. Does not inherit line 2's cradle or approve source/rack work. | open |
| 2026-11-17 | Default: retain the 6-steel trade-price stand-in and page bill/length/travel allocations; model the 1p/3p party riding together, with only off-train handling divided by players and neutral handling 0 | [Garage trade rebalance](brainstorms/garage-trade-rebalance.md#what-was-refreshed) | Designer (Codex) | Keeps tuning comparisons on one explicit baseline; shows freight and travel separately. Future freight routes, demand and parallel travel remain unmeasured; halved travel or bills ×0.75 restore Strong's lead everywhere. | open |

## Rail, construction, levels and travel

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: a funded frame's shut look is a two-leaf X-braced plank gate in darker wood (`#6e4a28`) across the walk-up board, swinging shut in 0.45 s with a slight overshoot, no sound; reload, late join and reduced motion see it shut | [finished-deposits](brainstorms/finished-deposits.md); `src/entities/railway/stations.ts` | Deposits builder (Opus) | The X carries the read without colour, motion or sound; the latch knock stays parked | open |
| 2026-11-17 | Default: line 1's bill stays up showing its full count while the frame feeds; line 2 keeps hiding its bill once funded | [finished-deposits](brainstorms/finished-deposits.md); `src/entities/railway/stations.ts` | Deposits builder (Opus) | Its full count agrees with the shut gate; smaller change | open |
| 2026-11-17 | Default: Q4/Q5 full behind the lever or switch shut only once the player has no pending actions; their bill still says to pull it | [finished-deposits](brainstorms/finished-deposits.md); `src/entities/railway/stations.ts` | Deposits builder (Opus) | Never shut on an unconfirmed world; may lag a moment | open |
| 2026-11-17 | Default: Q6 before trains is left open with no bill, refusing by its rack sign | [finished-deposits](brainstorms/finished-deposits.md); `src/entities/railway/stations.ts` | Deposits builder (Opus) | Already explained by the rack sign; out of this step | open |
| 2026-11-18 | Default: the railhead moves as a wheeled, self-winching traveller: bogies with turning wheels, chocks, a winch and haul line to a bollard at each span end, amber lamps, a bell, guys to the jib mast, the jib folding for the move, a gold flare as it seats; boxes in the existing batches, no new texture, model or string | [railhead-traveller](plans/railhead-traveller.md#design-review-2026-11-18) | Railhead step 5 builder | Reads as a job being done with no words; cheap and cuttable | open |
| 2026-11-18 | Default: cue timeline on haulPhase: bell, lamps, chocks up, jib fold and line taut at told; chuff and dust at the eased start, a chuff every 0.8 s; chocks down with a thump at each end, flare and jib out at the stop; bell again when settled | [railhead-traveller](plans/railhead-traveller.md#design-review-2026-11-18) | Railhead step 5 builder | Telegraphs a full second before anything moves, with existing machine sounds | open |
| 2026-11-18 | Default: reduced motion keeps every sound, the chocks, fold, wheels and line, and drops the lamps' blink (steady) and the bell's swing; a tab that first sees a haul more than 0.2 s past a cue skips it | [railhead-traveller](plans/railhead-traveller.md#design-review-2026-11-18) | Railhead step 5 builder | The plan's rules; the wheels and line are the move itself | open |
| 2026-11-18 | Default: the traveller's lamp posts, bell post and winch have no colliders, kept at most 0.3 m and at the platform's edges | [railhead-traveller](plans/railhead-traveller.md#design-review-2026-11-18) | Railhead step 5 builder | Same as the jib mast and rack today; colliders would be car shapes, a later physics step | open |
| 2026-11-17 | Default: the forge's rail rack takes the owner's fallback, road 2's south side, because the forge yard doesn't fit as the forge stands: square to the axis at axis (a −2.95, c 11.2), abeam the cart's forge stop and the forge's mouth, 1.15 m off road 2's sleepers and 1.83 m off the hall's eave | [forge-rack-move](plans/forge-rack-move.md) (calls 3, 4) | Planner (design review) | The mouth faces the station. There are 2.8 m between the forge's foundation and road 1, and 2.7 m between the forge and the pedestal. Behind the pedestal, rails would fly through the forge and the rack would sit inside the boiler's and breaker's pickup reach | open |
| 2026-11-17 | Default: the cart's forge stop stays at road 2's s 0, 3.6 m from the moved rack; the forge's pour flight to the rack takes 0.9 s with a 2.4 m apex (was 0.55 s, 1.1 m) | [forge-rack-move](plans/forge-rack-move.md) (calls 7, 8) | Planner (design review) | The cart's road reaches only road 2. Over the 16 m flight the rails must clear the cart and heads on the apron | open |
| 2026-11-17 | Default: the rack's board stands 2.3 m off the rack's east end, facing the pedestal; the cradle's gold motes spread along the rack's length | [forge-rack-move](plans/forge-rack-move.md) (calls 9, 10) | Planner (design review) | "2.3 m toward the pedestal" would put the board between the cart and the rack | open |
| 2026-11-17 | Default: a funded frame's shut look is a turned board or a shutter, readable without colour, motion or sound; line 1 frames and the forge between bills are proved first | [finished-deposits](brainstorms/finished-deposits.md#design-review-2026-11-17) | Orchestrator | The brief's first build; the owner chose the behaviour, not the form | open |
| 2026-11-17 | Default: measure the intentional under-deck cut separately; keep the 0.10 m walk-on limit and the 0.20 m cut guard on exposed trail. Recommend a short solid approach at the original path elevation, not a higher step allowance. | [Terrain clean-up, Part 2b step 7](plans/terrain-clean.md); `src/entities/ring-island/view.ts` | Ring footbridge builder, design review | At a the fixed deck is 14.932 m, the cap is at most 14.532 m, and the existing concrete is only 14.632 m. The approach strip is not solid. The off-deck survey includes a itself, where the required cut is at least 0.280 m. A landing would keep the visible route walkable; it needs scope beyond the ground cap. | open |
| 2026-11-17 | Default: the Round's kerb is 0.30 m wide and 0.08 m high on the green's side only, with no collider; the green is the terrain's own `#618f41` and the kerb the statue's stone `#a3a29c` | [home-flip D2](plans/home-flip.md); `src/prefab/builders/town-green-kerb.ts` | D2 builder; the heartbeat | Low enough to walk over without a collider, and no new colours | open |






## Rewards, co-op and town roles

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Default: the pack's pickup moves to (922, -17.6), 5.6 m south of the forge frame, where the player faces after the 24th log | [forge-made-rewards plan](plans/forge-made-rewards.md), as built | Forge builder (Opus) | Nowhere inside the old reach was both visible and clear of the forge wall; position only, no bump; independently reviewed | open |
| 2026-11-18 | Default: the pack's stand is a chest-high shelf with amber-capped back posts and a coral glimmer (about 0.4); the pack is scaled 2.4 | [forge-made-rewards plan](plans/forge-made-rewards.md), as built | Forge builder (Opus) | The owner's "not obvious": it must read from the unload spot | open |
| 2026-11-18 | Default: the pack is built by the nearest of the frame's log haulers (or a stroller), finishing itself with nobody within 30 m; the walk counts as arrived after 10 s, the errand stops at 16 s | [forge-made-rewards plan](plans/forge-made-rewards.md), as built | Forge builder (Opus) | A strolling villager was often too far away | open |
| 2026-11-18 | Default: the axe is scaled 2.2, leans 1.4 m out from the pedestal's centre beside a waiting part, and cools yellow, orange, red, dark, steel; the cut's camera sits low on the plinth's south-east, the axe side-on with its edge toward hardwood 232 | [forge-made-rewards plan](plans/forge-made-rewards.md), as built | Forge builder (Opus) | Read on the plinth and in the cut; orange alone washed out on near-white steel | open |
| 2026-11-18 | Default: the forge board puts its title on top and the reward marks side by side below, each about twice the title's height | [forge-made-rewards plan](plans/forge-made-rewards.md), as built | Forge builder (Opus) | Legible at the reading distance and at phone width | open |
| 2026-11-17 | Default: the forge boards' glyphs: an ink outline is a promise, filled inside gold dashes is ready and unclaimed; the board stays up after lighting until both rewards are claimed | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), calls 6–7 | Planner | See the plan's design review | open |
| 2026-11-17 | Default: the pack shows as the real frame (bare, then strapped, scale 1.5) on a timber block, built by a strolling villager while the scaffold pair keep hammering; 1.4 s hammering, 6 s a leg, 12 s cap, self-assembly after 1.5 s with no villager | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), calls 8–10 | Planner | See the plan's design review | open |
| 2026-11-17 | Default: a wooden knock for the pack; a hammer ring and about 12 sparks for the axe; the lit whistle carries 900 m; no plume, repeat calls or crane for the axe | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), calls 11, 19, 20 | Planner | See the plan's design review | open |
| 2026-11-17 | Default: the pedestal stands from the forge's lighting; the old axe stand and its clearing are removed; the axe stands upright, edge toward hardwood 232, scale 1.4 | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), calls 12, 14, 21 | Planner | See the plan's design review | open |
| 2026-11-17 | Default: the axe cut is 2.5 s, cut in and out, skippable after 0.8 s, home facing the pedestal (`AXE_VIEW`) | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), call 17 | Planner | See the plan's design review | open |
| 2026-11-17 | New: the lit forge's roof beams wait for the axe cut, at most 5 s | [forge-made-rewards plan](plans/forge-made-rewards.md#design-review-2026-11-17), call 18 | Planner | See the plan's design review | open |
| 2026-11-17 | Default: the forge's pack and axe show as the actual items, not crates, with a wooden knock (pack done) and a hammer ring (axe lands); the board's clue is a pack silhouette kept with an unclaimed mark after the board flips to 32 | [forge-made-rewards](brainstorms/forge-made-rewards.md#design-review-2026-11-17) | Orchestrator | The brief's suggestions; the owner chose the maker, the foreshadowing and the pedestal, not these forms | open |
| 2026-11-17 | New: the axe's cut plays only for players near the forge on the live edge, folded into the lit forge's roof show; the pedestal holds an unclaimed axe and a later cast waits for it (or a side rack), the planner's pick | [forge-made-rewards](brainstorms/forge-made-rewards.md#design-review-2026-11-17) | Orchestrator | One show per edge; far players already get the forge call's whistle; the pedestal is shared with the boiler and breaker | open |
| 2026-11-17 | Default: the sack keeps its coins when a rate is lowered | [Town economy C1](plans/town-economy-visible.md); `railway-sys-away.ts`, `railway-check-trade.ts` | Orchestrator; C1 builder | Apply the 15-minute cap only to new away accrual; never clamp earned coins. Save checks have no tunable context, so validate integer balances and the pour ledger. Fixed-rate tests assert the cap. C1 tooling copy remains owner placeholders: “Sack waiting”; “Back after a night: the coin sack is on the counter”. | open |

## Characters, cosmetics and story

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Graphics, water, sky and devices

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: culling and LOD changes in the world-streaming steps ship only with matched stills at the green, Far Head and the Ring Island halt showing no difference | [world-streaming](plans/world-streaming.md#design-review-2026-11-17), call 1 | Planner | Same method as the far ground's 11 November switch (research section 10); keeps the look unchanged while frames get cheaper | open |
| 2026-11-17 | Default: the townsfolk stop updating past 300 m from the village and wake at 250 m; their meshes hide only when out of view or under a pixel | [world-streaming](plans/world-streaming.md#design-review-2026-11-17), call 2 | Planner | A tunable; nothing a player can see freezes or vanishes | open |
| 2026-11-17 | Default: a far view put to sleep resumes from the current shared state and never replays an effect it missed | [world-streaming](plans/world-streaming.md#design-review-2026-11-17), call 3 | Planner | Effects follow receipts; a stale replay on approach would read as a bug | open |
| 2026-11-17 | Default: residency and LOD distances scale with the camera's field of view, so the lookout telescope at 2x sees far places at full detail | [world-streaming](plans/world-streaming.md#design-review-2026-11-17), call 4 | Planner | The telescope was a best moment of the 3 November playtest; zooming must not show coarse or frozen places | open |

## Audio

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Controls, HUD and arrival

C5 ruling, 15 November: **counts everywhere; squares gone** — an [owner call](agents/owner-calls.md#counts-everywhere), not an open agent decision.

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: the carried tag is one row of squares per kind (logs, stone, rails), as long as that kind's capacity, in groups of 4, filled in the kind's colour and empty at about 30% of it; no numbers, fraction, total or icons; a row shows only while carried or for the hold after it is refused or grows | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 17 | Planner (design review) | Answers Grant's G14 (mixed counts and squares, "11 out of 12"): a full row is full, nothing to count | open |
| 2026-11-17 | Default: a full row takes a cream outline and shakes on a refused pickup (reduced motion: an outline flash); no "Full" word | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 18 | Planner (design review) | Squares only; a 16-square row plus a word would not fit the tag | open |
| 2026-11-17 | Default: each square pops (about 200 ms, transform only) as its piece lands; none under reduced motion | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 19 | Planner (design review) | The 4 November slot design the owner liked; the physical feel he asked back for | open |
| 2026-11-17 | Default: Pause shows the same rows with no counts (the tag's accessible label keeps them); beam, boiler and footing show their name only | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 20 | Planner (design review) | No surface mixes counts and squares for what you carry; icons are what the owner found in the way | open |
| 2026-11-17 | Default (draft UI copy): refusals read "Logs full", "Stone full", "Rails full" ("Hands full" stays); the keener edge arrives as the multi-axe flourish for every player, with no card or new words | [separate-capacities](plans/separate-capacities.md#design-review-2026-11-17), call 21 | Planner (design review) | "Your back is full" is wrong when only one kind is; words sparingly. Not The Boogler's copy | open |

## Architecture, tools and prototype lifecycle

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
