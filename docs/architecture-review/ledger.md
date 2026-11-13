# Architecture review ledger

What the architecture reviewer ([skill](../../.claude/skills/architecture-review/SKILL.md),
[source](../research/engine-architecture.md)) has found and what became of it, so a rejected finding doesn't come back.
Entries are never deleted.

**Last reviewed:** `add1b4264` (2026-11-12; first run, window `305e0ce45..add1b4264`, the last 7 days).

- **Fingerprint:** check, path and symbol, never a line number.
- **Status:** `open`, `fixed`, `rejected`, `deferred` or `superseded`.
- **Rejected or deferred:** stays silent until its trigger is met or a person reopens it. A reopened finding states the old
  reason and what changed.

| Id | Date | Check | Fingerprint | Status | Reason | Revisit when | Decided by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AR-1 | 2026-11-01 | 4 | `src/player/hands.ts` `throwHeld` (plantFront went with the 2026-11-02 mushroom rework) | open | Spends the item when the edit is queued, so a rejected or dropped edit loses it. Low severity: the item is personal. Read from code, not reproduced. | | |
| AR-2 | 2026-11-01 | 8 | `src/net/ws-room.ts` `heartbeat` | open | `hb` runs on a main-thread timer and the server drops a client after 5 s of silence, so a tab hidden for 5 minutes may drop and rejoin each minute. Read from code, not reproduced; test by leaving a silent tab hidden for 6 minutes and watching the roster. | | |
| AR-3 | 2026-11-01 | docs | `docs/plans/architecture.md` target device | open | Still names a 2021 iPad and a mid-range Android phone with a 4 ms budget. The decision log replaced those with an M4 iPad Pro, and the 4 ms figure has no current owner. | | |
| AR-4 | 2026-11-12 | 10 | `dev/lint/policy.ts` `INPUT_ALLOW` entries `src/place/**` and `src/entities/railway/machine-model.ts` | fixed | The one-door input rule is off for 36 files (8,264 lines) and one more, where its selectors match two lines: `src/place/talk.ts` (a `pointerdown` propagation stop) and `src/place/look-kit.ts` (the string `'wheel'`, a batch name). A raw key, pointer or pad read added to any of them passes lint. M13f was to remove these exemptions and is ticked; its notes say `machine-model.ts` left the list, but it is still there. A lint gap: no second input door exists today. Survived the refute pass. **Fixed 2026-11-12:** both entries gone; `src/place/talk.ts` has its own entry (its one match stops taps on the talk panel reaching the canvas, as `boogler/dialogue.ts` does) and `look-kit.ts`'s batch name `'wheel'` takes a one-line `boogle-disable-next-line` with its reason. Lint passes with no other new matches; `test/lint-determinism.test.ts` checks it. | | |
| AR-5 | 2026-11-12 | docs | `docs/research/engine-architecture.md` "Already enforced" | open | Cites `eslint.config.js` ten times; the file is gone and the rules live in `dev/lint/policy.ts`. One line, not a finding: the refute pass killed the rest (the "No ECS" lines are covered by check 12's "the owner approved it" and the decision log). | | |
| AR-6 | 2026-11-12 | 9 | `src/ecs/index.ts` importers | fixed | No rule limits who imports the ECS facade. Today only `src/sim` (34 files), `src/world` (5) and `src/adapters` (5, types only) do, and views read through `ReadWorld`, so nothing fails. A rule would hold it with no cleanup ([engine-portability](../research/engine-portability.md), item 1). **Fixed 2026-11-12:** the facade ban in `dev/lint/policy.ts` (`ecsFacadeBan`, `ecsDynamicBan`) holds it: values from `src/sim` and `src/world` only, types also from `src/adapters`, `import()` included. Counts re-verified (44 files: 34, 5, 5; 15 import a value, none in `src/adapters`); `test/lint-determinism.test.ts` checks it. | A file outside `src/sim`, `src/world` and `src/adapters` imports `src/ecs/index.ts`, or a second domain starts defining components | |
