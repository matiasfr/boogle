# Batch-2 decide answers applied — 16 November 2026

Applied only the 16 `group: "decide"` rows from the [RC ranking](agent-calls-ranking-rc-2026-11-16.json) and [small-topics ranking](agent-calls-ranking-small-2026-11-16.json). Started from `origin/main` at `2cc7aa60b`. Matched IDs against the exact original rows at baseline `4bde3a35f66a8ad5541e8d2b1c98321dc1caa63c`, then matched each uniquely to its current live row. Repeated the [batch-1 method](agent-call-answers-applied-2026-11-16.md): move the row word for word into its topic's archive section, change only its status cell and decision link, and record dated entries with Current rules links.

The owner's general answer was "If I didn't say something else, I took the recommendation". His RC-005 and RC-062 answers override their recommendations. His later RC-308 correction, after seeing grades from 2% to 8%, was "4% is ok then"; it confirms the 4% ruling grade as logged.

## Dispositions

16 rows moved: **13 confirmed, 3 changed, none reverted**. No selected row was missing or already archived. No other live rows were touched.

| Topic | Confirmed | Changed | Moved |
| --- | ---: | ---: | ---: |
| Rail, construction, levels and travel | 9 | 2 | 11 |
| Characters, cosmetics and story | 1 | 0 | 1 |
| Controls, HUD and arrival | 2 | 1 | 3 |
| Architecture, tools and prototype lifecycle | 1 | 0 | 1 |

- **Confirmed:** RC-001, RC-005, RC-022, RC-067, RC-186, RC-221, RC-308, RC-313, RC-314, CH-014, HU-005, HU-012, AT-005.
- **Changed:** RC-062, RC-233, HU-009.

RC-221 stays a later-hub buy and model input. RC-313 stays the frame the High Gorge panel starts from. CH-014 stays placeholders, with the words the owner's copy; no character words were written. AT-005 confirms the retirement condition without claiming the owner has fast-forwarded a room himself. Confirming a proposed or measured call does not claim it is built.

## Dated decision entries

- [Batch-2 rail decide calls confirmed](../decisions-rail.md#d-2026-11-16-batch2-rail-calls-confirmed): RC-001, RC-022, RC-067, RC-186, RC-221, RC-313 and RC-314, including the recommendation's scope for RC-221 and RC-313.
- [Carried and held objects may use a unified size](../decisions-rail.md#d-2026-11-16-carried-and-held-size): RC-005, owner's page words verbatim and the labelled orchestrator reading; the call stands as logged.
- [One train push-aside rule at halts](../decisions-rail.md#d-2026-11-16-push-aside-at-halts): RC-062, owner's words verbatim and the labelled orchestrator reading; every halt where a train meets players.
- [Interchange track is a hauled bill](../decisions-rail.md#d-2026-11-16-interchange-track-is-hauled): RC-233, replacing the 1.2 s hold with a bill hauled at the junction like any segment.
- [The 4% ruling grade stands](../decisions-rail.md#d-2026-11-16-four-percent-ruling-grade): RC-308, both owner messages verbatim, page note followed by "4% is ok then"; the 4% limit stands as logged.
- [Sleeves' lines stay placeholders](../decisions-characters.md#d-2026-11-16-sleeves-lines-stay-placeholders): CH-014, no copy written.
- [Batch-2 return and cinematic skip calls confirmed](../decisions-controls.md#d-2026-11-16-batch2-controls-confirmed): HU-005 and HU-012.
- [Place later acts with their opening shows](../decisions-controls.md#d-2026-11-16-later-acts-await-opening-shows): HU-009, progress-derived acts and Act 2 retained; Acts 3 and 4 placed when their opening shows are built.
- [The Jump in list's retirement condition stands](../decisions-process.md#d-2026-11-16-jump-in-retirement-condition): AT-005.

Each has its Current rules line. The archive rows link to these entries.

## Owning plan next step

[Ring Island crossing](../plans/ring-island-crossing.md#owner-answer-and-next-step-16-november-2026) already owns the train fender and the every-line-versus-island question. Added the owner's exact words, "Not sure this needs to be special cased", dated **16 November 2026**, and a next-step checkbox to generalise step 3 to every halt where a train meets players and reconcile the implementation scope and checkpoint coverage before building it. The amendment replaces the dated review's Ring Island-only scope. It does not extend the reading to all open track. No duplicate backlog row was added.

## Skipped and preservation

Batch-2 flags and bulk remain unanswered and untouched. No game code, character copy, checker or manifest was changed. The original Call, Where, By and Why this pick cells are byte-for-byte copies. Six original-status receipts are preserved in labelled fenced history blocks in the same archive topic where the immutable split manifest needs them (RC-233, RC-308, RC-313, RC-314, CH-014, HU-012); they are not additional moved calls.

Required gates: `timeout 1500 npm run decisions`, `timeout 1500 npm run check`, then `npm run ship-queue -- <worktree> --wait`. Gate and merge outcomes are reported after they run. Docs only; no game behavior was implemented and no device test applies.
