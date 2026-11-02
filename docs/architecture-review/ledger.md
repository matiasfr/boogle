# Architecture review ledger

What the architecture reviewer ([skill](../../.claude/skills/architecture-review/SKILL.md),
[source](../research/engine-architecture.md)) has found and what became of it, so a rejected finding doesn't come back.
Entries are never deleted.

**Last reviewed:** none yet.

- **Fingerprint:** check, path and symbol, never a line number.
- **Status:** `open`, `fixed`, `rejected`, `deferred` or `superseded`.
- **Rejected or deferred:** stays silent until its trigger is met or a person reopens it. A reopened finding states the old
  reason and what changed.

| Id | Date | Check | Fingerprint | Status | Reason | Revisit when | Decided by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR-1 | 2026-11-01 | 4 | `src/player/hands.ts` `throwHeld`, `src/adapters/mushroom-garden.ts` `plantFront` | open | Spends the item when the edit is queued, so a rejected or dropped edit loses it. Low severity: the item is personal. Read from code, not reproduced. | | |
| AR-2 | 2026-11-01 | 8 | `src/net/ws-room.ts` `heartbeat` | open | `hb` runs on a main-thread timer and the server drops a client after 5 s of silence, so a tab hidden for 5 minutes may drop and rejoin each minute. Read from code, not reproduced; test by leaving a silent tab hidden for 6 minutes and watching the roster. | | |
| AR-3 | 2026-11-01 | docs | `docs/plans/architecture.md` target device | open | Still names a 2021 iPad and a mid-range Android phone with a 4 ms budget. The decision log replaced those with an M4 iPad Pro, and the 4 ms figure has no current owner. | | |
