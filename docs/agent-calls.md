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
| 2026-11-17 | Default: propose 10 footings per future-line cargo car; Quick 25 m/s / 10, Strong 20 m/s / 20 with one whole extra identical cargo car | [Garage trade rebalance](brainstorms/garage-trade-rebalance.md#b-10--20-footings--recommended) | Designer (Codex) | Retains approved speeds and coach exemption; splits current model's line totals Quick/Quick/Strong at 1p and 3p. Quick leads are only 14.8/33.4 s; no claim of robust or live balance. Does not inherit line 2's cradle or approve source/rack work. | open |
| 2026-11-17 | Default: retain the 6-steel trade-price stand-in and page bill/length/travel allocations; model the 1p/3p party riding together, with only off-train handling divided by players and neutral handling 0 | [Garage trade rebalance](brainstorms/garage-trade-rebalance.md#what-was-refreshed) | Designer (Codex) | Keeps tuning comparisons on one explicit baseline; shows freight and travel separately. Future freight routes, demand and parallel travel remain unmeasured; halved travel or bills ×0.75 restore Strong's lead everywhere. | open |

## Rail, construction, levels and travel

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: the forge's rail rack takes the owner's fallback, road 2's south side, because the forge yard doesn't fit as the forge stands: square to the axis at axis (a −2.95, c 11.2), abeam the cart's forge stop and the forge's mouth, 1.15 m off road 2's sleepers and 1.83 m off the hall's eave | [forge-rack-move](plans/forge-rack-move.md) (calls 3, 4) | Planner (design review) | The mouth faces the station. There are 2.8 m between the forge's foundation and road 1, and 2.7 m between the forge and the pedestal. Behind the pedestal, rails would fly through the forge and the rack would sit inside the boiler's and breaker's pickup reach | open |
| 2026-11-17 | Default: the cart's forge stop stays at road 2's s 0, 3.6 m from the moved rack; the forge's pour flight to the rack takes 0.9 s with a 2.4 m apex (was 0.55 s, 1.1 m) | [forge-rack-move](plans/forge-rack-move.md) (calls 7, 8) | Planner (design review) | The cart's road reaches only road 2. Over the 16 m flight the rails must clear the cart and heads on the apron | open |
| 2026-11-17 | Default: the rack's board stands 2.3 m off the rack's east end, facing the pedestal; the cradle's gold motes spread along the rack's length | [forge-rack-move](plans/forge-rack-move.md) (calls 9, 10) | Planner (design review) | "2.3 m toward the pedestal" would put the board between the cart and the rack | open |
| 2026-11-17 | Default: a funded frame's shut look is a turned board or a shutter, readable without colour, motion or sound; line 1 frames and the forge between bills are proved first | [finished-deposits](brainstorms/finished-deposits.md#design-review-2026-11-17) | Orchestrator | The brief's first build; the owner chose the behaviour, not the form | open |
| 2026-11-17 | Default: the Round's kerb is 0.30 m wide and 0.08 m high on the green's side only, with no collider; the green is the terrain's own `#618f41` and the kerb the statue's stone `#a3a29c` | [home-flip D2](plans/home-flip.md); `src/prefab/builders/town-green-kerb.ts` | D2 builder; the heartbeat | Low enough to walk over without a collider, and no new colours | open |






## Rewards, co-op and town roles

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
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

## Architecture, tools and prototype lifecycle

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
