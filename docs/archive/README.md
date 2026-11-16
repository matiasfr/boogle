# Documentation archive

Historical plans, concepts and dated reports live here. Current committed work is in [backlog](../backlog.md), the phase view in [direction](../direction.md), and binding calls in the [decision log](../decisions.md). Nothing here authorizes new work.

## Reapply the moves

From the repo root, with Node 26 and local dependencies installed:

```sh
npm run docs-archive -- docs/archive/2026-11-16.txt
```

The checked-in list contains original paths. The dependency-free tool preflights tracked sources/destinations, uses `git mv`, rewrites Markdown/image/reference/HTML links and quoted repository path data, and repairs outgoing links using each file's original directory. It preserves anchors and reports missing local targets and remaining bare literals. An existing archive destination with no source is a repeat, not an overwrite. Inspect the report before committing; a bare source-code comment or displayed link label is not automatically a broken link.

On fresh main, first apply the design-rule relocation in this branch (context, root/route wording, registry paths, link-hash normalization and search authority), stage the new archive index/list so the tool can scan them, then run the same list. Later landing docs can be scanned again: repeated moves are skipped while newly introduced inbound links are repaired. A file recreated at both locations stops the run for review. No files are deleted or content bodies rewritten beyond links.

## What was archived, 16 November 2026

Reviewed against origin/main `5b3c680b160317c10caa7ea22c16bccc5ff6ee58`. Evidence commits below were verified as ancestors of that main. Rebased onto refreshed origin/main `9eb6ee3bb2cb4a776536b921439b80de119012af`; the protection sweep and prose-only boundaries were checked again. The later step-8 report additions were preserved, and reapplying the mover repaired five newly landed links in three files. A second refresh also preserved the newly landed town-economy-visible plan; it is protected by the backlog and stays live. Counts below use this refreshed main. Completed build plans were cross-checked with their implementation history and owning code; status lines and ticks alone were not used. Reports are dated evidence records, not certificates that their parent checkpoints passed. Their limits, unbuilt pieces and owner-copy candidates stay verbatim; parent plans with open work stay outside the archive.

| Original path (link opens the archive) | One-line reason | Evidence on main or superseding decision |
| --- | --- | --- |
| [docs/plans/0.1-groundwork.md](plans/0.1-groundwork.md) | The classic haul/pile/site state was explicitly retired rather than ported. | [`32bd6a38a`](https://github.com/matiasfr/boogle/commit/32bd6a38a), [`75852d2a9`](https://github.com/matiasfr/boogle/commit/75852d2a9), [replacement](../decisions-process.md#d-2026-11-13-server-owned-state-answered) |
| [docs/plans/ability-pacing.md](plans/ability-pacing.md) | The previous ability order is replaced by the approved fly-first order. | [`97a1b62f0`](https://github.com/matiasfr/boogle/commit/97a1b62f0), [replacement](../decisions-core-loop.md#d-2026-11-15-fly-first) |
| [docs/plans/asset-catalogue.md](plans/asset-catalogue.md) | Catalogue and preview coverage are implemented. | [`36baf480f`](https://github.com/matiasfr/boogle/commit/36baf480f) |
| [docs/plans/asset-stage.md](plans/asset-stage.md) | The isolated catalogue, animation controls and Buddy preview are implemented. | [`11a29029b`](https://github.com/matiasfr/boogle/commit/11a29029b), [`917291fea`](https://github.com/matiasfr/boogle/commit/917291fea) |
| [docs/plans/atlas.md](plans/atlas.md) | The extractor, CLI, views, history deployment and upkeep landed. | [`a34408651`](https://github.com/matiasfr/boogle/commit/a34408651), [`fd2e25960`](https://github.com/matiasfr/boogle/commit/fd2e25960), [`baa2e464f`](https://github.com/matiasfr/boogle/commit/baa2e464f), [`43dd3b82b`](https://github.com/matiasfr/boogle/commit/43dd3b82b), [`189cdc201`](https://github.com/matiasfr/boogle/commit/189cdc201), [`a75862b67`](https://github.com/matiasfr/boogle/commit/a75862b67), [`83f8f0da1`](https://github.com/matiasfr/boogle/commit/83f8f0da1), [`edccc5df2`](https://github.com/matiasfr/boogle/commit/edccc5df2), [`f6f96eacb`](https://github.com/matiasfr/boogle/commit/f6f96eacb), [`f28ed674e`](https://github.com/matiasfr/boogle/commit/f28ed674e) |
| [docs/plans/call-feedback.md](plans/call-feedback.md) | The flag, local transcript digest and call-first workflow landed. | [`fd2e28aa2`](https://github.com/matiasfr/boogle/commit/fd2e28aa2), [`37fc059a5`](https://github.com/matiasfr/boogle/commit/37fc059a5) |
| [docs/plans/compact-dev-dock.md](plans/compact-dev-dock.md) | Tabs, compact destinations and searchable/pinned Water controls landed. | [`34adb6c00`](https://github.com/matiasfr/boogle/commit/34adb6c00) |
| [docs/plans/controls-feedback.md](plans/controls-feedback.md) | Contextual chopping, Ping and local/shared reward presentation landed. | [`a37bace31`](https://github.com/matiasfr/boogle/commit/a37bace31), [`4dab7d491`](https://github.com/matiasfr/boogle/commit/4dab7d491) |
| [docs/plans/dev-menu.md](plans/dev-menu.md) | All eight opt-in Dev tools and their lifecycle landed. | [`dfc8d8b6e`](https://github.com/matiasfr/boogle/commit/dfc8d8b6e) |
| [docs/plans/done/cleanup-dig-water-junk.md](plans/done/cleanup-dig-water-junk.md) | Completed removal record; all three removal commits are on main. | [`4071f5b00`](https://github.com/matiasfr/boogle/commit/4071f5b00), [`c42a6987e`](https://github.com/matiasfr/boogle/commit/c42a6987e), [`b6f1a19`](https://github.com/matiasfr/boogle/commit/b6f1a19) |
| [docs/plans/done/webgpu-migration.md](plans/done/webgpu-migration.md) | Completed renderer migration; the fallback was subsequently removed. | [`5d2315634`](https://github.com/matiasfr/boogle/commit/5d2315634) |
| [docs/plans/ecs-e.md](plans/ecs-e.md) | All three steps landed: E core, benchmark and railway conversion. | [`34ac2fc31`](https://github.com/matiasfr/boogle/commit/34ac2fc31), [`3690cec10`](https://github.com/matiasfr/boogle/commit/3690cec10), [`62081ddaf`](https://github.com/matiasfr/boogle/commit/62081ddaf) |
| [docs/plans/ecs-m12-m13.md](plans/ecs-m12-m13.md) | The tail migration, read-model removal, tool rebuilds and Place deletion landed. | [`c115a5f94`](https://github.com/matiasfr/boogle/commit/c115a5f94), [`11e3a96d2`](https://github.com/matiasfr/boogle/commit/11e3a96d2), [`ea56dd54d`](https://github.com/matiasfr/boogle/commit/ea56dd54d), [`e6f2961e1`](https://github.com/matiasfr/boogle/commit/e6f2961e1), [`67911ec39`](https://github.com/matiasfr/boogle/commit/67911ec39), [`c9c458a97`](https://github.com/matiasfr/boogle/commit/c9c458a97), [`0d005c6b1`](https://github.com/matiasfr/boogle/commit/0d005c6b1), [`afba24f43`](https://github.com/matiasfr/boogle/commit/afba24f43) |
| [docs/plans/ecs-migration-railway.md](plans/ecs-migration-railway.md) | The staged ECS migration finished; its stale parent ticks are overtaken by the shipped tail. | [`11e3a96d2`](https://github.com/matiasfr/boogle/commit/11e3a96d2), [`e6f2961e1`](https://github.com/matiasfr/boogle/commit/e6f2961e1), [`c9c458a97`](https://github.com/matiasfr/boogle/commit/c9c458a97), [`afba24f43`](https://github.com/matiasfr/boogle/commit/afba24f43) |
| [docs/plans/entity-components.md](plans/entity-components.md) | Both bounded name-label conversions landed; no wider component migration was authorized. | [`9614d7a6f`](https://github.com/matiasfr/boogle/commit/9614d7a6f), [`84b504887`](https://github.com/matiasfr/boogle/commit/84b504887) |
| [docs/plans/find-the-fun.md](plans/find-the-fun.md) | The 1 November prototype build order is replaced by the live-game roadmap; active rules move to context. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../decisions-process.md#d-2026-11-09-nothing-waits-for-a-playtest) |
| [docs/plans/first-five-minutes.md](plans/first-five-minutes.md) | The opening changes and visual repairs landed. | [`6710b517b`](https://github.com/matiasfr/boogle/commit/6710b517b), [`fe4e34d9c`](https://github.com/matiasfr/boogle/commit/fe4e34d9c), [`b93d9dbff`](https://github.com/matiasfr/boogle/commit/b93d9dbff) |
| [docs/plans/footings-signalling.md](plans/footings-signalling.md) | All five approved option-A cues landed; option B and the resident line were not selected. | [`670ed6c25`](https://github.com/matiasfr/boogle/commit/670ed6c25), [`68628db87`](https://github.com/matiasfr/boogle/commit/68628db87), [`c045bd50e`](https://github.com/matiasfr/boogle/commit/c045bd50e), [`e3374cc96`](https://github.com/matiasfr/boogle/commit/e3374cc96) |
| [docs/plans/grant-c2-depots.md](plans/grant-c2-depots.md) | The cart unload timing repair and existing-board evidence landed. | [`333dd88d1`](https://github.com/matiasfr/boogle/commit/333dd88d1) |
| [docs/plans/grant-c5-evidence.md](plans/grant-c5-evidence.md) | Numeric carry/resource counts landed; this is the implementation evidence. | [`1102530bc`](https://github.com/matiasfr/boogle/commit/1102530bc) |
| [docs/plans/grant-c7-evidence.md](plans/grant-c7-evidence.md) | Interact hooks, Jump glider controls and the camera repair landed. | [`fc7f08018`](https://github.com/matiasfr/boogle/commit/fc7f08018) |
| [docs/plans/graphics-switches.md](plans/graphics-switches.md) | The owned cost-switch registry landed; Ultra-only rows were later removed. | [`0b364fde5`](https://github.com/matiasfr/boogle/commit/0b364fde5), [`63a09db54`](https://github.com/matiasfr/boogle/commit/63a09db54) |
| [docs/plans/greybox-leg2-massing.md](plans/greybox-leg2-massing.md) | All six layout/massing steps landed; playable leg-2 rules remain in greybox-route. | [`079cb4754`](https://github.com/matiasfr/boogle/commit/079cb4754), [`2399b1904`](https://github.com/matiasfr/boogle/commit/2399b1904), [`4db064ed8`](https://github.com/matiasfr/boogle/commit/4db064ed8), [`71e41cd42`](https://github.com/matiasfr/boogle/commit/71e41cd42), [`793dbb826`](https://github.com/matiasfr/boogle/commit/793dbb826), [`c53311a23`](https://github.com/matiasfr/boogle/commit/c53311a23), [`6bf51b92a`](https://github.com/matiasfr/boogle/commit/6bf51b92a) |
| [docs/plans/heavy-load-526db96dd-review.md](plans/heavy-load-526db96dd-review.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`fa81b5b30`](https://github.com/matiasfr/boogle/commit/fa81b5b30) |
| [docs/plans/heavy-load-a7aa22d03-review.md](plans/heavy-load-a7aa22d03-review.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`6d47eb9d6`](https://github.com/matiasfr/boogle/commit/6d47eb9d6) |
| [docs/plans/heavy-load-a91bd8663-review.md](plans/heavy-load-a91bd8663-review.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`f559d487e`](https://github.com/matiasfr/boogle/commit/f559d487e) |
| [docs/plans/heavy-load-f83e49fa8-review.md](plans/heavy-load-f83e49fa8-review.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`576cae55b`](https://github.com/matiasfr/boogle/commit/576cae55b) |
| [docs/plans/heavy-load-final.md](plans/heavy-load-final.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`954030480`](https://github.com/matiasfr/boogle/commit/954030480) |
| [docs/plans/heavy-load-fix2-report.md](plans/heavy-load-fix2-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`0d034317b`](https://github.com/matiasfr/boogle/commit/0d034317b) |
| [docs/plans/heavy-load-fix3.md](plans/heavy-load-fix3.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`c78597043`](https://github.com/matiasfr/boogle/commit/c78597043) |
| [docs/plans/heavy-load.md](plans/heavy-load.md) | Optional loads, pacing/drop repairs and final integration landed. | [`89dd6c76d`](https://github.com/matiasfr/boogle/commit/89dd6c76d), [`e9125afc6`](https://github.com/matiasfr/boogle/commit/e9125afc6), [`954030480`](https://github.com/matiasfr/boogle/commit/954030480) |
| [docs/plans/island-low.md](plans/island-low.md) | The owner explicitly removed the low-island comparison. | [replacement](../decisions-process.md#d-2026-11-06-classic-island-and-the-boogler-s) |
| [docs/plans/look-compare.md](plans/look-compare.md) | The comparison presets, exposure/controls and completed review landed. | [`673909d33`](https://github.com/matiasfr/boogle/commit/673909d33), [`58e315001`](https://github.com/matiasfr/boogle/commit/58e315001), [`6a9bb86ee`](https://github.com/matiasfr/boogle/commit/6a9bb86ee) |
| [docs/plans/no-objective.md](plans/no-objective.md) | The objective presentation removal and guidance audit landed. | [`3975a5ad6`](https://github.com/matiasfr/boogle/commit/3975a5ad6), [`2f10cfcb7`](https://github.com/matiasfr/boogle/commit/2f10cfcb7) |
| [docs/plans/persistent-dev-dock.md](plans/persistent-dev-dock.md) | The persistent dock and final behavior verification landed. | [`0b60ffb6c`](https://github.com/matiasfr/boogle/commit/0b60ffb6c), [`b6ccd0e95`](https://github.com/matiasfr/boogle/commit/b6ccd0e95) |
| [docs/plans/place-top-room.md](plans/place-top-room.md) | The top-level room switch and no-progress-import follow-up landed. | [`e643bd0b2`](https://github.com/matiasfr/boogle/commit/e643bd0b2), [`d1ea22987`](https://github.com/matiasfr/boogle/commit/d1ea22987) |
| [docs/plans/playtest-jump-in.md](plans/playtest-jump-in.md) | The seed catalog and entry flow landed; the owner later replaced separate jump-in rooms. | [`3b7a2749c`](https://github.com/matiasfr/boogle/commit/3b7a2749c), [replacement](../agents/owner-calls.md#how-the-owner-works) |
| [docs/plans/prefab-budget-relax-report.md](plans/prefab-budget-relax-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`eb47aedee`](https://github.com/matiasfr/boogle/commit/eb47aedee) |
| [docs/plans/prefab-consolidation-report.md](plans/prefab-consolidation-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`b2f9846df`](https://github.com/matiasfr/boogle/commit/b2f9846df) |
| [docs/plans/prefab-data-step-10-2-report.md](plans/prefab-data-step-10-2-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`d7eada9a3`](https://github.com/matiasfr/boogle/commit/d7eada9a3) |
| [docs/plans/prefab-data-step-10-3-report.md](plans/prefab-data-step-10-3-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`af290b643`](https://github.com/matiasfr/boogle/commit/af290b643) |
| [docs/plans/prefab-data-step-10-report.md](plans/prefab-data-step-10-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`07c5505d3`](https://github.com/matiasfr/boogle/commit/07c5505d3) |
| [docs/plans/prefab-data-step-10b-report.md](plans/prefab-data-step-10b-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`903842f51`](https://github.com/matiasfr/boogle/commit/903842f51) |
| [docs/plans/prefab-data-step-11.md](plans/prefab-data-step-11.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`34793fc83`](https://github.com/matiasfr/boogle/commit/34793fc83) |
| [docs/plans/prefab-data-step-5-dynamic-audit.md](plans/prefab-data-step-5-dynamic-audit.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-5-lifecycle-audit.md](plans/prefab-data-step-5-lifecycle-audit.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-5-precise-audit.md](plans/prefab-data-step-5-precise-audit.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-5-rebase-4.md](plans/prefab-data-step-5-rebase-4.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-5-rebase.md](plans/prefab-data-step-5-rebase.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-5-shape.md](plans/prefab-data-step-5-shape.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cc67958d0`](https://github.com/matiasfr/boogle/commit/cc67958d0) |
| [docs/plans/prefab-data-step-7-portability.md](plans/prefab-data-step-7-portability.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`1ea830056`](https://github.com/matiasfr/boogle/commit/1ea830056) |
| [docs/plans/prefab-data-step-7-rebase4.md](plans/prefab-data-step-7-rebase4.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`3517f40b4`](https://github.com/matiasfr/boogle/commit/3517f40b4) |
| [docs/plans/prefab-data-step-7-review.md](plans/prefab-data-step-7-review.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`3af4d026f`](https://github.com/matiasfr/boogle/commit/3af4d026f) |
| [docs/plans/prefab-data-step-7.md](plans/prefab-data-step-7.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`3af4d026f`](https://github.com/matiasfr/boogle/commit/3af4d026f) |
| [docs/plans/prefab-data-step-8-report.md](plans/prefab-data-step-8-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`1e0546850`](https://github.com/matiasfr/boogle/commit/1e0546850) |
| [docs/plans/prefab-data-step-9-report.md](plans/prefab-data-step-9-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`67926bb5c`](https://github.com/matiasfr/boogle/commit/67926bb5c) |
| [docs/plans/prefab-data-step-9b-report.md](plans/prefab-data-step-9b-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`213029f33`](https://github.com/matiasfr/boogle/commit/213029f33) |
| [docs/plans/prefab-data-step-9c-report.md](plans/prefab-data-step-9c-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`88361b748`](https://github.com/matiasfr/boogle/commit/88361b748) |
| [docs/plans/prefab-data-step-9d-report.md](plans/prefab-data-step-9d-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`0975c2a49`](https://github.com/matiasfr/boogle/commit/0975c2a49) |
| [docs/plans/prefab-data-step-9e-report.md](plans/prefab-data-step-9e-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`99f9e4fd1`](https://github.com/matiasfr/boogle/commit/99f9e4fd1) |
| [docs/plans/prefab-data-step-9f-report.md](plans/prefab-data-step-9f-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`99f9e4fd1`](https://github.com/matiasfr/boogle/commit/99f9e4fd1) |
| [docs/plans/rail-slice.md](plans/rail-slice.md) | The never-approved historical eras 1–2 draft is replaced by production-core and the roadmap. | [replacement](../direction.md#where-things-are) |
| [docs/plans/resume-return-steps-1-3-report.md](plans/resume-return-steps-1-3-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`c0d7f8dfb`](https://github.com/matiasfr/boogle/commit/c0d7f8dfb) |
| [docs/plans/resume-return-steps-4-6-report.md](plans/resume-return-steps-4-6-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`2e04674a3`](https://github.com/matiasfr/boogle/commit/2e04674a3) |
| [docs/plans/roundhouse-rotunda-1a-2-report.md](plans/roundhouse-rotunda-1a-2-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`15cd4eb2a`](https://github.com/matiasfr/boogle/commit/15cd4eb2a) |
| [docs/plans/roundhouse-rotunda-1a-report.md](plans/roundhouse-rotunda-1a-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`081866841`](https://github.com/matiasfr/boogle/commit/081866841) |
| [docs/plans/running-side-fix-report.md](plans/running-side-fix-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`f146c31f9`](https://github.com/matiasfr/boogle/commit/f146c31f9) |
| [docs/plans/running-side-round2-report.md](plans/running-side-round2-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`f1064c843`](https://github.com/matiasfr/boogle/commit/f1064c843) |
| [docs/plans/running-side-step3-report.md](plans/running-side-step3-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`6afb5cea3`](https://github.com/matiasfr/boogle/commit/6afb5cea3) |
| [docs/plans/running-side-step6-report.md](plans/running-side-step6-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`dd4da7844`](https://github.com/matiasfr/boogle/commit/dd4da7844) |
| [docs/plans/server-owned-players-step1-report.md](plans/server-owned-players-step1-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`b02cde0b4`](https://github.com/matiasfr/boogle/commit/b02cde0b4) |
| [docs/plans/server-owned-players-step2-report.md](plans/server-owned-players-step2-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`a6472409b`](https://github.com/matiasfr/boogle/commit/a6472409b) |
| [docs/plans/server-owned-players-step3-report.md](plans/server-owned-players-step3-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`65bcce08f`](https://github.com/matiasfr/boogle/commit/65bcce08f) |
| [docs/plans/server-owned-players-step5-report.md](plans/server-owned-players-step5-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`1a4e3cf86`](https://github.com/matiasfr/boogle/commit/1a4e3cf86) |
| [docs/plans/server-owned-players-step6-report.md](plans/server-owned-players-step6-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`d0882e50c`](https://github.com/matiasfr/boogle/commit/d0882e50c) |
| [docs/plans/server-owned-players-step7-report.md](plans/server-owned-players-step7-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`006a0a48a`](https://github.com/matiasfr/boogle/commit/006a0a48a) |
| [docs/plans/server-owned-players-step8-report.md](plans/server-owned-players-step8-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`e1b9d1b82`](https://github.com/matiasfr/boogle/commit/e1b9d1b82) |
| [docs/plans/server-owned-state-step5-report.md](plans/server-owned-state-step5-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`1cabdf5f4`](https://github.com/matiasfr/boogle/commit/1cabdf5f4) |
| [docs/plans/server-owned-state-step9-report.md](plans/server-owned-state-step9-report.md) | Dated implementation/audit record on main; retained limits and any parent-plan obligations are unchanged. | [`cd972db49`](https://github.com/matiasfr/boogle/commit/cd972db49) |
| [docs/plans/terrain-pass.md](plans/terrain-pass.md) | Historical ledge/wedge rounds explicitly superseded by terrain-clean Part 1. | [`42342d0dd`](https://github.com/matiasfr/boogle/commit/42342d0dd), [replacement](../plans/terrain-clean.md#part-1-remove-the-geometric-cliff-ledges) |
| [docs/plans/trees-any.md](plans/trees-any.md) | Finite trees, shared cart integration and verification landed before Place retirement. | [`dd0738189`](https://github.com/matiasfr/boogle/commit/dd0738189), [`7bd157b32`](https://github.com/matiasfr/boogle/commit/7bd157b32) |
| [docs/plans/water-graduation.md](plans/water-graduation.md) | The old FFT/Ultra graduation is superseded by the selected Sunshine B sea. | [`63a09db54`](https://github.com/matiasfr/boogle/commit/63a09db54), [replacement](../game-design/water.md#the-sea-10-november-2026) |
| [docs/plans/water-sunshine.md](plans/water-sunshine.md) | The selected B water is default and Ultra/A were removed, closing the comparison. | [`27bf296a0`](https://github.com/matiasfr/boogle/commit/27bf296a0), [`63a09db54`](https://github.com/matiasfr/boogle/commit/63a09db54) |
| [docs/plans/water-tuning-panel.md](plans/water-tuning-panel.md) | The production panel, bounded controls, documentation and proof landed. | [`2ae4a66eb`](https://github.com/matiasfr/boogle/commit/2ae4a66eb) |
| [docs/plans/world-version-and-save-reset.md](plans/world-version-and-save-reset.md) | Pause label, local reset and protected boot cleanup landed. | [`5ae7739b6`](https://github.com/matiasfr/boogle/commit/5ae7739b6), [`4990cf37d`](https://github.com/matiasfr/boogle/commit/4990cf37d), [`b1ee3c1c5`](https://github.com/matiasfr/boogle/commit/b1ee3c1c5) |
| [docs/proposals/boogle-2.md](proposals/boogle-2.md) | The former design record was split into decisions, direction and owner calls; this is only the old pointer. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../direction.md#now-next-later) |
| [docs/proposals/boogler-tech-tree.md](proposals/boogler-tech-tree.md) | The unbuilt book/stall/Boat Fund concept is historical; the rail direction replaced its progression. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table) |
| [docs/proposals/design-audit.md](proposals/design-audit.md) | The owner answered the audit; its adopted rulings live in the decision log. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table) |
| [docs/proposals/directions.md](proposals/directions.md) | The unbuilt eight-direction menu is historical; direction.md now owns the roadmap. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table) |
| [docs/proposals/methodology.md](proposals/methodology.md) | Pre-production working-method proposals are overtaken by the agent contracts and current owner calls. | [`3bd4617ad`](https://github.com/matiasfr/boogle/commit/3bd4617ad), [replacement](../direction.md#now-next-later) |
| [docs/proposals/six-eras.md](proposals/six-eras.md) | An unapproved hypothesis menu, never an implementation plan; the accepted campaign outline owns the route. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../direction.md#now-next-later) |
| [docs/proposals/vehicles.md](proposals/vehicles.md) | Unbuilt cannon-es vehicle concept numbers are historical; Rapier and the rail direction supersede this sheet. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table) |
| [docs/proposals/vertical-slice.md](proposals/vertical-slice.md) | The never-built eras 1–2 spec is explicitly historical in direction.md, replaced by production-core. | [`9c6521e57`](https://github.com/matiasfr/boogle/commit/9c6521e57), [replacement](../direction.md#where-things-are) |

## Kept, unsure

These are retained, not implicitly cancelled or certified complete. Each question needs a main-code/proof reconciliation or an explicit supersession before a future move.

| Path | Question before archiving |
| --- | --- |
| [docs/plans/ability-order.md](../plans/ability-order.md) | Did the final candidate-A visual/independent-review checkpoint close after candidate A landed, including the recorded mount/gate sightline limits? |
| [docs/plans/beam-weight.md](../plans/beam-weight.md) | Which remaining implementation or final-proof requirements are on main, and which were explicitly superseded? |
| [docs/plans/beautiful-corner.md](../plans/beautiful-corner.md) | Which still-open final-fit, terrain and look steps were explicitly superseded, rather than merely postponed? |
| [docs/plans/boiler-first-choice.md](../plans/boiler-first-choice.md) | Does the nine-step checkpoint have complete source and proof coverage after the later Works-flow change? |
| [docs/plans/cart-then-trains.md](../plans/cart-then-trains.md) | Did the owner accept or explicitly drop the still-unanswered cart-first experiment? |
| [docs/plans/ci-diet.md](../plans/ci-diet.md) | Which remaining implementation or final-proof requirements are on main, and which were explicitly superseded? |
| [docs/plans/coop-route-verification.md](../plans/coop-route-verification.md) | Are the recorded standing/jump carry losses and full co-op-route obligations closed on main? |
| [docs/plans/curio-shelves-placement.md](../plans/curio-shelves-placement.md) | Are the two placement moves and the final shelf/collision proofs on main? |
| [docs/plans/decomp-characters.md](../plans/decomp-characters.md) | Was the conditional second-character work explicitly cancelled? It is still described as unbuilt in direction. |
| [docs/plans/done/rapier.md](../plans/done/rapier.md) | Which remaining implementation or final-proof requirements are on main, and which were explicitly superseded? |
| [docs/plans/double-jump-challenge.md](../plans/double-jump-challenge.md) | Did the post-demonstration course verification close? The plan records a wait for the demonstration. |
| [docs/plans/engine-previz.md](../plans/engine-previz.md) | Which upgrade/cab follow-ups are finished versus owned by the live garage plan? |
| [docs/plans/entity-architecture.md](../plans/entity-architecture.md) | Is every open Part 5 lifecycle/LOD item superseded by E, rather than merely the storage model? |
| [docs/plans/forge-call-handoff.md](../plans/forge-call-handoff.md) | Did the reach omission and step-4 findings close, with final checkpoint proof? |
| [docs/plans/fourth-car.md](../plans/fourth-car.md) | Are V3 and the full fourth-car review/ride checkpoints complete, beyond the shipped V2 tile? |
| [docs/plans/game-loop.md](../plans/game-loop.md) | Was the allocation-free hot-path experiment ever completed or explicitly abandoned? |
| [docs/plans/gap-readability.md](../plans/gap-readability.md) | What closes the unbuilt steps beyond 1, 3 and 7? |
| [docs/plans/garage-install-moment.md](../plans/garage-install-moment.md) | Are G1–G5 proofs reconciled as requested by the 16 November audit? |
| [docs/plans/generic-lines.md](../plans/generic-lines.md) | Are every catalog, lever, signal and late-join step and the final checkpoint accounted for on main? |
| [docs/plans/glider-b-home-flow.md](../plans/glider-b-home-flow.md) | Did the final route/arrival proof close, including later fly-first supersession? |
| [docs/plans/home-station.md](../plans/home-station.md) | Have all step-6 proof/departure notes been reconciled with Home flip and the live town plan? |
| [docs/plans/hook-shot.md](../plans/hook-shot.md) | Does the full shared hook/climb proof close, or is any original step still owed after fly first? |
| [docs/plans/level-pacing-1114.md](../plans/level-pacing-1114.md) | Are A3/A4 and the final verification complete, beyond A1 and the moved great tree? |
| [docs/plans/line2-b4.md](../plans/line2-b4.md) | Which of the unticked A/B/C build and proof steps are all on main, and which were superseded by fly first? |
| [docs/plans/line2-b5-b8.md](../plans/line2-b5-b8.md) | Can every unticked A/B/C/D requirement be reconciled with the shipped train/boiler changes? |
| [docs/plans/line2-part2-greybox.md](../plans/line2-part2-greybox.md) | Were A1–A3 layout/timing/still requirements completed as well as the playable B steps? |
| [docs/plans/little-guys-rails.md](../plans/little-guys-rails.md) | Are the original solo/co-op timing gates complete or explicitly superseded by production cart rules? |
| [docs/plans/loading.md](../plans/loading.md) | Was the design-only multi-island streaming part implemented or explicitly superseded? Only the measured first cut is documented as built. |
| [docs/plans/look-pass.md](../plans/look-pass.md) | Which of the remaining art/device/look steps were completed or explicitly superseded? |
| [docs/plans/mainline-architecture.md](../plans/mainline-architecture.md) | Is the full graduation/lifetime plan completed, including production-core slice 6? |
| [docs/plans/net-roadmap.md](../plans/net-roadmap.md) | The accounts checkpoint and future room-storage SQLite step remain open; which is still owed? |
| [docs/plans/open-world.md](../plans/open-world.md) | Were worker/streaming/compute-particle steps completed or explicitly superseded? |
| [docs/plans/passenger-car-previz.md](../plans/passenger-car-previz.md) | Is the chosen Four build fully closed while the unchosen Six is explicitly out of scope? |
| [docs/plans/perf-baseline-2026-11-02.md](../plans/perf-baseline-2026-11-02.md) | Is this baseline still used for an active performance comparison, or can it be marked historical? |
| [docs/plans/place-retirement.md](../plans/place-retirement.md) | Can all unticked town-growth/cosmetic/crystal steps be reconciled with production-core, despite Place deletion? |
| [docs/plans/rail-map.md](../plans/rail-map.md) | Were remaining curve/standing-rider and station-layout proof questions closed? |
| [docs/plans/refocus-cleanup.md](../plans/refocus-cleanup.md) | Were every clean-break/save/ball step and its proof completed, or superseded by the classic retirement? |
| [docs/plans/replay-readiness.md](../plans/replay-readiness.md) | Did the recorded Start fresh and co-op/blind-run limitations get a later closing proof? |
| [docs/plans/replication.md](../plans/replication.md) | Were all R1–R4 requirements and final correction/late-join checkpoints closed after the ECS migration? |
| [docs/plans/resume-where-you-were.md](../plans/resume-where-you-were.md) | Does Checkpoint R have the complete required reload/two-tab/first-run proof after the follow-ups? |
| [docs/plans/review-inbox.md](../plans/review-inbox.md) | Were the final transport-hardening clean-head checks and external evidence handoff completed? |
| [docs/plans/ring-island-build1.md](../plans/ring-island-build1.md) | Were R6 documentation and the still-missing 3D map-display proof completed? |
| [docs/plans/ring-island-crossing.md](../plans/ring-island-crossing.md) | Are the fender and both checkpoints complete, beyond the crossing-layout steps? |
| [docs/plans/round-4-playtest.md](../plans/round-4-playtest.md) | Has the historical owner playtest kit been superseded in full, including the unfinished co-op questions? |
| [docs/plans/round-4-whole-run.md](../plans/round-4-whole-run.md) | Did the full two-player route and blind-first-visit proof gaps get closed? |
| [docs/plans/round-4.md](../plans/round-4.md) | Was the still-open movement/glide/interiors research task finished or explicitly superseded? |
| [docs/plans/round4-first-run.md](../plans/round4-first-run.md) | Was the final shared restart proof completed after the same-room correction? |
| [docs/plans/roundhouse-rotunda.md](../plans/roundhouse-rotunda.md) | Does the plan still own checkpoint timing/proof reconciliation beyond steps 1–5 and the garage-choice handoff? |
| [docs/plans/server-host.md](../plans/server-host.md) | Which remaining implementation or final-proof requirements are on main, and which were explicitly superseded? |
| [docs/plans/server-owned-players-step4-report.md](../plans/server-owned-players-step4-report.md) | The report explicitly says step 4 is incomplete as written; was that design departure accepted? |
| [docs/plans/server-owned-players.md](../plans/server-owned-players.md) | The 10 Hz/continuous-leg conversion and named checkpoints remain incomplete; were they explicitly replaced? |
| [docs/plans/server-owned-state.md](../plans/server-owned-state.md) | Were Checkpoints A/B and cleanup closure completed after the explicit Retire choice? |
| [docs/plans/short-turn.md](../plans/short-turn.md) | Is only the short-turn mechanism parked, while the Ring Island hold and remaining checkpoint still need reconciliation? |
| [docs/plans/slice2-supply-merge-note.md](../plans/slice2-supply-merge-note.md) | Does this merge handoff still identify any unresolved supply/trace proof? |
| [docs/plans/split-rock-roundhouse.md](../plans/split-rock-roundhouse.md) | Are all J-step and shared-carry/ride proofs closed after the later forge and rotunda changes? |
| [docs/plans/terrain-pilot.md](../plans/terrain-pilot.md) | Are every round-seven geometry and final-traversal proof closed, rather than only the implemented geometry? |
| [docs/plans/track-layer-machine.md](../plans/track-layer-machine.md) | Are all shell/art/ride steps closed, including their explicit exception and evidence gates? |
| [docs/plans/train-progression.md](../plans/train-progression.md) | Step 4 bay rollout and step 5 checkpoint closure remain unverified; does garage-choices formally replace both? |
| [docs/plans/train-spacing.md](../plans/train-spacing.md) | Is the unbuilt headway research and every candidate/gate step superseded, beyond the shipped six-train/hold rule? |
| [docs/plans/two-player.md](../plans/two-player.md) | Was the remaining solo timing gate closed after the recorded co-op result? |
| [docs/plans/works-flow-step1.md](../plans/works-flow-step1.md) | Does the step-1 handoff still own final source/trace proof reconciliation? |
| [docs/plans/works-flow.md](../plans/works-flow.md) | Did the combined checkpoint close after the two approved steps shipped and step 3 was dropped? |
| [docs/plans/works-late-game.md](../plans/works-late-game.md) | Were steps 4–6 and every checkpoint completed or explicitly replaced by newer Works plans? |
| [docs/plans/works-signposting-2.md](../plans/works-signposting-2.md) | Are the phone halt-display still, hall marks and remaining B stills complete? |
| [docs/plans/world-blockout.md](../plans/world-blockout.md) | Has the owner reviewed phase 1, and are all phase-2/default/live-route follow-ups explicitly complete? |
| [docs/plans/world-cues.md](../plans/world-cues.md) | Have the great-tree approach and hidden forge-rack gaps and final proof closed? |

## Kept by binding references

The following plans are protected by the backlog, required map reading, AGENTS or skills/agents (plus the three explicit never-archive paths). A protected link is not evidence that its plan is unfinished. The authorized find-the-fun relocation is the sole exception. The rotunda reference assets stay with its protected README.

- [docs/plans/accounts.md](../plans/accounts.md)
- [docs/plans/architecture.md](../plans/architecture.md)
- [docs/plans/asset-motion-review.md](../plans/asset-motion-review.md)
- [docs/plans/asset-pipeline.md](../plans/asset-pipeline.md)
- [docs/plans/boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md)
- [docs/plans/campaign-outline.md](../plans/campaign-outline.md)
- [docs/plans/garage-choices.md](../plans/garage-choices.md)
- [docs/plans/grant-1114-queue.md](../plans/grant-1114-queue.md)
- [docs/plans/greybox-route.md](../plans/greybox-route.md)
- [docs/plans/home-flip.md](../plans/home-flip.md)
- [docs/plans/prefab-data.md](../plans/prefab-data.md)
- [docs/plans/production-core.md](../plans/production-core.md)
- [docs/plans/railhead-traveller.md](../plans/railhead-traveller.md)
- [docs/plans/remote-device-tests.md](../plans/remote-device-tests.md)
- [docs/plans/remote-runner.md](../plans/remote-runner.md)
- [docs/plans/ring-island-build2.md](../plans/ring-island-build2.md)
- [docs/plans/ring-summit-path.md](../plans/ring-summit-path.md)
- [docs/plans/room-fast-forward.md](../plans/room-fast-forward.md)
- [docs/plans/round-4-notes.md](../plans/round-4-notes.md)
- [docs/plans/roundhouse-rotunda/README.md](../plans/roundhouse-rotunda/README.md)
- [docs/plans/running-side.md](../plans/running-side.md)
- [docs/plans/slice5-town-economy.md](../plans/slice5-town-economy.md)
- [docs/plans/start-area.md](../plans/start-area.md)
- [docs/plans/terrain-clean.md](../plans/terrain-clean.md)
- [docs/plans/town-economy-visible.md](../plans/town-economy-visible.md)
- [docs/plans/town-layout.md](../plans/town-layout.md)
- [docs/plans/turnouts.md](../plans/turnouts.md)

Proposals kept: README; story-and-finale and fourth-melon by instruction; island-layout, progression-paths and hub-and-minigames because direction’s Where things are table still presents them as in use. visual-target is a measured, built look-lab spike rather than a never-built concept: kept pending an explicit supersession decision. Historical vertical-slice is explicitly labelled historical in that table; its links are repaired.

## find-the-fun rule reconciliation

Three complete bullets are copied word for word into [context's design-work rules](../agents/context.md#design-work-rules): **Solo and co-op alongside each other**, **Evidence before a playtest**, and **No twice → change it or cut it**. The last evaluates a proposed experience in its progression context; it does not create a delivery gate. The verification/tests contracts own the current checkpoint timing.

The following old rules are retained in the archived plan as history, not made binding by the design route:

| Old rule | Later call and disposition |
| --- | --- |
| **Mechanics only**: no mayor/props/hats/story/art/multi-island work until playtests say fun | [7 November](../decisions-process.md#d-2026-11-07-retire-toys-before-chores-and-automatic) retires the independent-toy test; [9 November](../decisions-process.md#d-2026-11-09-nothing-waits-for-a-playtest) removes playtest gates. The approved live route includes authored places and progression. |
| **Behind a flag**: each step under `?proto=`, with its own room for lockstep numbers | The [6 November core call](../decisions-process.md#d-2026-11-06-conform-to-tested-engine-architecture), [10 November migration](../decisions-process.md#d-2026-11-10-priority-call-migrate-the-game-out), and owner calls **Development is live** and **One live game** (13 November) replace prototype delivery. The owner reiterated main-game work on 15 November, per this job's brief. |
| **On the protos page**: cards, Copy entries and a gut question | Card/Copy requirements belong to the retired prototype workflow; the same plan records the 4 November removal of note/Copy fields. Keep the current owner preference for one concise playtest question in owner-calls, rather than restoring cards. |
| **Into the verb in seconds**: `src/proto/session.ts`, variant spawns and copied counters | Prototype-page plumbing is historical; M13 removed Place (`e6f2961e1`). The live game's entry and same-room testing are governed by production-core and room-fast-forward. Quick access to a proof remains useful, but is not a new permanent prototype requirement. |
| **A trace of every sitting**: browser-local prototype traces and card heat maps | [6 November prototype answers](../decisions-process.md#d-2026-11-06-first-prototype-answers) drop the trace map; current playdata is uploaded for agent analysis. Do not restore browser-only/card telemetry. |
| **Options, not one guess**: every uncertain prototype carries 2–3 `&v=` variants | Comparing uncertain alternatives remains useful advice. The mandatory variant/card delivery mechanism is not carried into the live-game rules; an experiment needs its own explicit brief. |
| **From finding-the-fun**: card retirement/one-variable variants, straight-to-verb entry, iPad-size live gate, no feel/art before “yes” | Partly useful research advice, partly replaced lifecycle and playtest/art gates. The [9 November no-gate call](../decisions-process.md#d-2026-11-09-nothing-waits-for-a-playtest) and [checkpoint test diet](../agents/owner-calls.md#how-the-owner-works) govern; no whole-bullet import. Feel, device evidence and owner acceptance remain separate claims. |

The prototype route still names the explicit flagged-experiment toolchain; it is not the route for normal main-game work. Its old Place/default-entry and playtest-stop wording is corrected alongside the required-read pointer. DESIGN.md's linked target is relocated only; its owner-authored prose is untouched.

## Path consumers checked

- **Map/registry:** `dev/scan/task-routes.ts` now requires context's short rules, not the archived plan. `dev/scan/docs.ts` points historical hits to direction, labels archive paths historical and excludes the archive from default `map --docs` search. Registry continues validating route sections and character budgets.
- **Decision guard:** the original `dev/decisions/manifest.json` is unchanged. `unanchored` canonicalizes only Markdown destinations `archive/plans/` and `archive/proposals/` back to their old destinations for no-loss hashes; prose and quotations remain guarded. Decision anchor checks still follow the actual repaired links.
- **Development dashboard:** `dev/development/vite-plugin.ts` reads only backlog and orchestrator-state; their link destinations are scanned by the mover. `backlog.ts` converts repo-relative Markdown destinations into GitHub main URLs. There is no plans/proposals glob.
- **Atlas:** `dev/atlas/extract.ts` globs only src/server source. `cli.ts` reads `atlas/stories/`, not plans or proposals. Bare historical schema mentions of the atlas plan are reported, not mistaken for a runtime input.
- **Decision split generator:** `dev/decisions/topics.ts` keeps its `plans/...` Where-column classification keys: they classify old pre-split input, not files to read. If the historical split is ever regenerated, run this archive list again after generation, before committing. Its linked output must pass decisions as usual.
- **Other tools:** level-sheet/world-blockout/rail-map generators refer to town-layout, home-flip, world-blockout and rail-map, all retained. `dev/loop/graph.ts` points at ring-island-build1, glider-b-home-flow and works-flow, all retained. No generator/test discovered a filesystem glob over plans/proposals. Existing change-class tests use synthetic plan paths, not a plan inventory.
- **Repository scan:** tracked Markdown, HTML and textual generator sources are scanned for links; binary assets are not decoded or moved unless listed. Bare path mentions in source comments remain historical references and appear in the tool's report. No game runtime source changes are needed.

## Counts and validation

Counts refer to Markdown files, including report/index files, before link rewriting. All 11 non-Markdown plan assets remain in place. Unicode characters are counted from the original main files; the UTF-8 byte count is also shown.

| Source directory | Moved / original Markdown files | Stayed | Original characters moved | UTF-8 bytes moved |
| --- | --- | --- | --- | --- |
| docs/plans | 85 / 178 | 93 | 1,570,450 | 1,572,480 |
| docs/proposals | 8 / 15 | 7 | 543,718 | 544,710 |
| Total | 93 / 193 | 100 | 2,114,168 | 2,117,190 |

66 retained plans are in **Kept, unsure**; the other 27 retained plan files are protected. Source Markdown originally held 5,371,274 plan characters and 606,290 proposal characters. No file is deleted; 93 renames preserve the original document bodies except link destinations.

The isolated full-main replay rewrote 1,940 destinations in 202 files. A second run moved zero files and rewrote zero links; tracked content was byte-identical. A separate audit checked all 1,612 parsed destinations in the 93 moved documents: each still resolves to the original target (or its listed archive destination), with the same query/anchor, and no newly missing local target. All 214 local index file/section links resolve. The smaller fixture separately exercises nested-directory references, anchors, angle links, image paths, siblings left behind, reference definitions and HTML/path data.

Required gates: `npm run registry`, `npm run decisions`, `npm run map -- --kind docs`, `npm run map -- --kind prototype`, and `node dev/ship-check.ts`. The prototype route remains within its unchanged 30,000-character budget. The scoped ship gate also runs lint/typecheck and 23 affected test files (221 tests). `checks-for` suggests game/browser checks from names in historical plan paths; there is no game runtime change, so the owner's explicit documentation/tooling gate is used.

## Unrewritable links and remaining references

**No move-induced unresolved link destination was found.** The mover reports **707 pre-existing missing local-target records** in the moved documents (715 occurrences in the independent audit): 677 are ignored `.look` evidence records absent from this fresh worktree; 30 cite retired source files from the 2 November design audit. Those citations retain their original target and line anchor after relocation; no replacement source or evidence is invented. Their full list, plus 734 remaining literal mentions after fixing active skill instructions, is retained locally in `.look/docs-archive/link-report.txt`; the tool can reproduce a move report on a fresh main. This is not a claim that the historical archive has zero pre-existing missing evidence/source links.

The 30 retired-source references all occur in [design-audit](proposals/design-audit.md), across 29 paths (log-sources has two line ranges): `src/boogler/friendship.ts`, `src/features/ball-rest.ts`, `src/features/bump.ts`, `src/features/day-night.ts`, `src/features/first-run.ts`, `src/features/gifts.ts`, `src/features/helper-bank.ts`, `src/features/hotbar.ts`, `src/features/hut-build.ts`, `src/features/log-sources.ts`, `src/features/mushroom-garden.ts`, `src/features/piles.ts`, `src/features/proto-assets.ts`, `src/features/proto-bar.ts`, `src/features/proto-board.ts`, `src/features/proto-era.ts`, `src/features/proto-haul.ts`, `src/features/proto-hero-rig.ts`, `src/features/proto-hero.ts`, `src/features/proto-lay.ts`, `src/features/proto-minis.ts`, `src/features/proto-moves.ts`, `src/features/proto-net.ts`, `src/features/proto-soapbox.ts`, `src/features/proto-wagon.ts`, `src/features/track-machine.ts`, `src/features/work-sites.ts`, `src/physics/ball.ts`, `src/sim/gifts.ts`. Read that audit at its cited historical commit if the old code is needed.

Remaining bare literals are deliberately reported rather than guessed: original-path link labels in this index, source comments identifying old plans, code examples, and historical references (including the decision record saying where boogle-2 was moved from). Required design reads and active skill questions now point to context/current work instead. No non-link bytes changed in owner-calls, backlog, direction, orchestrator-state or DESIGN; the original decision manifest still checks 892/892 lines and 679/679 quotations.
