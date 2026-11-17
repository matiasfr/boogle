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
| 2026-11-17 | Default: the Round's kerb is 0.30 m wide and 0.08 m high on the green's side only, with no collider; the green is the terrain's own `#618f41` and the kerb the statue's stone `#a3a29c` | [home-flip D2](plans/home-flip.md); `src/prefab/builders/town-green-kerb.ts` | D2 builder; the heartbeat | Low enough to walk over without a collider, and no new colours | open |






## Rewards, co-op and town roles

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Default: the sack keeps its coins when a rate is lowered | [Town economy C1](plans/town-economy-visible.md); `railway-sys-away.ts`, `railway-check-trade.ts` | Orchestrator; C1 builder | Apply the 15-minute cap only to new away accrual; never clamp earned coins. Save checks have no tunable context, so validate integer balances and the pour ledger. Fixed-rate tests assert the cap. C1 tooling copy remains owner placeholders: “Sack waiting”; “Back after a night: the coin sack is on the counter”. | open |

## Characters, cosmetics and story

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

## Graphics, water, sky and devices

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |

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
