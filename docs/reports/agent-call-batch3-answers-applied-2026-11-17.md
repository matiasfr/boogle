# Batch-3 answers applied — 17 November 2026

Applied the owner’s supplied [review-page](https://claude.ai/artifact/FdpKhie87Fxsg5wrVufu3n) answers: "the others I accept all", with the build-errand note below. Started from fresh `origin/main` at `2c29e37a37c3a695c97c6319af251028a89608f1`. Repeated the batch-1 and batch-2 method: preserve every non-status cell, move each row to its own archive topic, link statuses to dated decisions with Current rules lines. No game code or The Boogler’s copy changed.

## Moves by status and topic

32 rows moved: **26 confirmed, 1 changed, 5 reverted**; zero left open. Core: 4 confirmed, 1 changed, 2 reverted. Rail: 12 confirmed, 3 reverted. Rewards: 10 confirmed (including three already answered). No selected row skipped.

## Entries written

- [batch-3 calls confirmed as logged](../decisions-core-loop.md#d-2026-11-17-batch3-confirmed)
- [heavy-load tuning with bounded local drop recovery](../decisions-core-loop.md#d-2026-11-17-heavy-load-pile-rule-as-shipped)
- [retire the Glide-glyph first-fall teach](../decisions-core-loop.md#d-2026-11-17-retire-4)
- [retire the production-bot route call](../decisions-core-loop.md#d-2026-11-17-retire-5)
- [batch-3 calls confirmed as logged](../decisions-rail.md#d-2026-11-17-batch3-confirmed)
- [retire the 28.4 m Home track extension](../decisions-rail.md#d-2026-11-17-retire-6)
- [retire the interim deck-standing riders](../decisions-rail.md#d-2026-11-17-retire-13)
- [retire the completed passenger-car previz call](../decisions-rail.md#d-2026-11-17-retire-14)
- [batch-3 calls confirmed as logged](../decisions-rewards.md#d-2026-11-17-batch3-confirmed)
- [confirm the build-errand freight-stop rule](../decisions-rewards.md#d-2026-11-17-build-errand-freight-stop)
- [the first line has no fork](../decisions-core-loop.md#d-2026-11-17-first-line-no-fork)
- [review agent calls weekly](../decisions-process.md#d-2026-11-17-weekly-agent-calls-review)

Three already-answered rows link to the existing first-town lesson entry; the rider-places archival note also links the later dedicated-coach change. No duplicate decisions were added for those rows. Retirement reasons are beside the rows and in their entries. The heavy-load correction records the still-bounded 128-pile recovery system, not an unshipped removal. The final plan is now under `docs/archive/plans/heavy-load-final.md`.

## Build-errand rule finding

Recommendation: **keep**. Static main-code inspection, not a headless measurement. `freightStop` (`src/sim/railway-queries-trade.ts:75`) explicitly rejects the wagon, unloadable kit and kit-owed cases; these checks are behavior, not merely commentary. Removing them permits an otherwise eligible returning train to make the Quarry’s freight stop when its yard holds eight crates and its freight capacity is empty. A wagon after its footing work ends is a concrete counterfactual: `footingsOwed` is false then, but `r.wagon` still prevents the stop. The wagon stays coupled by the now-confirmed call.

The timber yard is stop 1 at line 1’s end, so it never adds a freight stop (`src/sim/railway-trade-layout.ts:36`, the endpoint guard in `freightStop`). Line 2’s Quarry yard is also stop 1, enabled after the pier, but becomes an intermediate halt as the line opens. Kit-carrying and kit-owed line 2 trains can satisfy the remaining freight conditions there: freight space is separate from logs/rails, and the yard-stock test does not inspect kit cargo. While footings are owed the separate `footingsOwed` guard already blocks them, but after that window it does not. `kitOwed` (`src/sim/railway-queries.ts:355`) checks active Q-job or leg demand; it does not itself prevent a freight stop without this guard. A waiting leg kit is already exempted by `legKitWaiting` in the current rule. Thus some cases overlap other guards, but the rule as a whole is not redundant today. This is a source-level counterfactual, not a claim that every live train currently meets the stock and timing conditions.

Existing regression evidence: [railway-trade.test.ts](../../test/railway-trade.test.ts) starts with an eligible Quarry stop, then asserts that adding a wagon or logs/rails changes it to false (lines 500–503). The following test (line 511) covers kit owed. These are existing tests, not newly written measurements; their fixture edits are query probes rather than a live-route observation.

Owner’s note, exactly: "This is fine, but unsure if we need that rule". Confirmation is retained; no game code changed.

## Preservation and verification

Every original non-status cell is preserved word for word. Original-status receipts are retained where the unchanged split manifest requires them. Neither checker nor manifest changed. The state file drops the two answered questions and links their answers; D2 records no fork and no stage 2. The weekly review is recorded in process decisions and the tidy docs pass.

Passed on Node 26.13.0: `npm run decisions` (892/892 historical lines and 679/679 quotations), scoped formatting/lint, and `npm run check` (zero unit failures; registry, level, assets and production build passed). Exact comparison verified all 32 non-status row copies; six original-status receipts preserve the split manifest. Shipping uses `npm run ship`; PR and remote check state are reported after it returns. Docs only; no device test applies.
