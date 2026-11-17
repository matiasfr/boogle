# Weekly agent-calls review, 17 November 2026

**Snapshot:** main `5fa88131`; every live topic table in [agent-calls](../agent-calls.md) inspected.
**Open calls: 1.** Decide: 0; flags: 1; bulk: 0. None is older than a week.
This is the designer's ranking under the [weekly-review decision](../decisions-process.md#d-2026-11-17-weekly-agent-calls-review), not an owner ruling or publication. The orchestrator republishes the review page; this task does not.

## Decide

None. No new direction, scope or irreversible choice is needed for this call.

## Flags

| Call | Recommendation |
| --- | --- |
| 2026-11-17: Default: the sack keeps its coins when a rate is lowered ([Rewards, co-op and town roles](../agent-calls.md#rewards-co-op-and-town-roles)) | Confirm: keep earned coins, apply the current 15-minute cap only to new accrual, and accept that an already-earned sack can temporarily exceed a lowered cap; never silently burn the room's reward. |

**Why flagged:** it changes how the shared reward behaves after tuning, rather than being invisible implementation bookkeeping.
The [current reward rules](../decisions-rewards.md#current-rules) require one capped sack on return, emptied for everyone; this default preserves earned value rather than retroactively confiscating it.
The implementation supports the recommendation: [away accrual](../../src/sim/railway-sys-away.ts) only grows the saved sack when the capped result exceeds it; [save validation](../../src/sim/railway-check-trade.ts) checks integer balances and the pour ledger without applying a tunable cap.
The C1 tooling-copy placeholders remain owner-owned and unchanged. This ranking leaves the live call open.

## Bulk

None.
