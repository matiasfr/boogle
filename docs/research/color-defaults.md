# Owner colour defaults — rebased follow-up, 5 November 2026

**Rebased onto `origin/main` at `82f8381e` (includes `cb6bd7ef`). The daytime pick still matches. Evening remains usable in the inspected views, but lit sign paper and red lettering become markedly darker; that readability concern is not cleared.** The rebased long bot completed every expected beat, including the first-slab box. The research folder is now about **6.18 MB**, containing only reader-facing boards and small JSON. Large evidence was removed from this branch's rewritten history and preserved under `.look`. No push, ship or merge.

![Fresh native crops: main and defaults, day and evening](color-defaults/summary.png)

## Rebase and exact scope

Runtime commit `a2c28507` and capture helpers `0f365a63` sit on main `82f8381e`. The rebase kept both sides of the frozen-sky and decision-index conflicts. `frozen-sky.ts` retains main's `readFill`, `prepare`, prepared environment selection, fade lifecycle and loading-time `cubeSize` handling. Only the existing scene-light owner/defaults and multiplier application differ. `sky-core.ts`, `evening-transition.ts` and `water-render.ts` are byte-identical to this main. A separate read-only review found no integration issue. The current evening design paragraph now describes .12 and the chosen lights; historical .16 verification remains labelled historical.

The owner pick remains **surface .12; underwater +.81 EV; key 1.12; fill 3.2; grass pigment .35/albedo .7; selective colour; lit physical boards and shop price atlas**. The lighting gains apply after the prepared sky's fill/radiance selection, to both endpoints. No evening parameters or sky-size behaviour were retuned. Evening remains off by default, behind `?proto=place&evening=1`; `evening=preview` still starts in day. Default size remains 1024, and both prepared skies use the selected size. Fresh readbacks show one day bake on ordinary visits, no evening endpoint there, and one bake per 1024 endpoint with an idle evening selection on opted-in visits.

Physical boards retain the same sRGB canvases, rough Standard node material, received shadows, and no emissive floor or inverse-gain patch. Camera-facing station labels and rewards retain single compensation. Classic home, water optics, gameplay, saves, wire semantics and Boogler copy remain unchanged. `colourCase`, research-only TIMBER CAMP/QUARRY fixtures and retired fork signs were not imported. Dev Post/Light fill still display and reset to the new defaults. [Owner brief/status](../brainstorms/color-vibrance.md), [dated decision](../proposals/boogle-2.md#look), [water design](../game-design/water.md#prepared-evening-preview-5-november-2026).

## Fresh evening comparison

Visual question: **does the approved .12/light/board package remain readable with main's prepared evening, and does anything become too dark or bright?** Baseline is clean, unmodified main `82f8381e`; candidate is the final rebased runtime. Both use the documented evening URL, 800×500 DPR 1 and identical cameras. The cloud-horizon camera comes from main's `dev/look/beats/sky-size.ts`, used by `sky-evening.ts`; town, Buddy and indoor sign probes extend that coverage using this job's established cameras. Sky looks toward the actual evening sun. The same Buddy location is used in day and evening; the lower evening sun changes which body faces are shaded.

Opened both source PNGs and the completed board for each of these six views:

| Board | Observed result |
| --- | --- |
| [Town](color-defaults/evening-town.png) | Paths, residents and building forms remain distinct. Walls brighten; evening stays warm and substantially darker than day. |
| [Buddy with load](color-defaults/evening-shade.png) | Body outline, face and logs remain distinguishable. Fill helps the body/load; pose and passing residents differ. |
| [Pip's furnished doorway/sign](color-defaults/evening-doorway.png) | The room brightens, but OPEN TO OFFERS turns dark red on brown-grey paper. Readable close up, much less immediate. This established close camera crops the upper PIP line; the town view supplies the whole facade. |
| [JOBS indoors](color-defaults/evening-jobs.png) | Black JOBS remains clear. Red “none yet” is muddy and weaker against the darker paper. This is the clearest readability cost. |
| [Horizon sea](color-defaults/evening-horizon.png) | Teal water and the gold reflection remain visible. The reflection is still bright; no new washed-out land was apparent. Wave phase differs. |
| [Sun/sky](color-defaults/evening-sky.png) | Warm clouds and sunset remain; blue sky darkens modestly. No newly excessive brightness was apparent. |

**Assessment:** the island/character views remain readable, but the lit signs become too dim for an unqualified distance/phone-readability clearance. Their red ink is a specific concern, not a general darkening failure of the island. No evening retuning was made. The flag remains off by default.

Fixed masks, mean linear-sRGB luminance plus .05, diagnostic ratios only (not accessibility certification):

| Evening region | Main paper RGB | Defaults paper RGB | Main red-letter contrast | Defaults red-letter contrast |
| --- | --- | --- | ---: | ---: |
| Doorway OPEN TO OFFERS | 240,228,200 | 126,113,98 | 4.28 | 2.73 |
| JOBS red subline | 240,228,200 | 126,113,98 | 4.19 | 2.71 |

Paper display luma falls from 228.53 to 114.68 in both sampled regions. Fixed main masks select red pixels with R > 1.8G, R > 2B and R > 30; doorway uses 3,870 pixels, JOBS 918. [Measurements, boxes and sky readbacks](color-defaults/measurements.json). This comparison includes the approved light/material changes together, not an isolated exposure experiment.

## Daytime pick after rebase

Opened the fresh [town](color-defaults/town.png), [shaded Buddy/load](color-defaults/shade.png), [JOBS](color-defaults/jobs.png), [horizon](color-defaults/horizon.png) and opening summary boards. Same cameras and pixel boxes as `43032714:docs/research/color-vibrance-5/measurements.json` (`roundlit12`). Buildings and shaded Buddy retain the selected lift, grass stays deeper green and JOBS retains the chosen grey paper.

| Mean display luma, 0–255 | Current main | Rebased defaults | Round-five pick | Defaults minus pick |
| --- | ---: | ---: | ---: | ---: |
| Town cream | 168.188 | 196.583 | 196.583 | 0 |
| Town grass | 149.391 | 134.245 | 134.245 | 0 |
| Summary Buddy torso | 109.940 | 133.223 | 133.792 | −0.569 |
| Summary carried load | 102.755 | 111.983 | 112.264 | −0.282 |
| JOBS paper | 228.530 | 163.214 | 163.214 | 0 |
| Horizon sea | 81.866 | 67.463 | 67.471 | −0.008 |

Town and JOBS static regions match exactly. The named movements are the animated Buddy/load and wave-phase horizon samples; all are small and visually consistent with the pick. The summary uses native crops from these same fresh scenes, not a separate render. No value was adjusted to force a match.

All 20 new scene cells passed immediate and switch-back zero-drift probes within their individual frozen captures. Between builds, actor/wave phases differ. Every effective readback on main is .16/key 1/fill 1; every candidate readback is .12/key 1.12/fill 3.2. Underwater offset remains +.81. [24 assembled scene/summary cells](color-defaults/native-pixels.json) retain exact source pixels after lossless PNG compression. Full scenes use one cell per row; the summary has three native crops per row. This is a phone-readable evidence layout, not a mobile-device test.

## Rebased long bot and checks

`node .look/see-client.ts playthrough --long --query 'proto=place&shot=play'` ran once on the rebased branch, serially after the captures. **Passed all expected beats**, 29 game minutes in 7m07s reported wall time (report labels achieved rate 4×), 83 checkpoints, no errors or water falls. The complete [report](../../.look/evidence/1793905241889-34309/run/report.txt), [bot log](../../.look/evidence/1793905241889-34309/run/bot.log), [observer stream](../../.look/evidence/1793905241889-34309/run/session.jsonl) and [manifest](../../.look/evidence/1793905241889-34309/evidence.json) remain under `.look`. The full report was read and [end still](../../.look/evidence/1793905241889-34309/run/end-still.png) opened.

Around the questioned first-slab beat: “Take it” succeeded at (998,23) at 735.3 s; the first hook fired at 738.0 s; “Open the crate” succeeded at (1008,8) at **739.6 s**, awarding the bucket and `firstpull`; a return hook followed at 742.6 s. **The historical miss did not reproduce.** Earlier clean `32a72f8b` and pre-rebase branch bots also passed, but they are historical comparisons, not current-main verification. The original miss's cause remains unknown.

Uptime at this run's start: **41.96/31.04/28.00**; end: **34.80/31.68/29.26**, on 10 cores. The report recorded 27 still periods totalling 7m40s and two obstruction periods totalling 3s. Expected waits and host load confound these counters; no stall regression or speed improvement is established. No quiet rerun occurred. “Found a crystal” and “did something together” were not marked: this remains solo-route coverage, not co-op coverage.

- Final **Node 26.13.0 `npm run check`**: lint, typecheck, 330 unit tests, registry, level checks, asset check and production build passed. [Final log](../../.look/color-defaults/followup-final-check.txt). Prettier ran on changed files. The first follow-up check/client commands inherited Node 24 from the shell; the final full check explicitly uses the repository's installed Node 26.
- Fresh **world-inputs: 7 assertions passed**, no graphics errors. [Manifest](../../.look/evidence/1793905235422-34039/evidence.json). The broker harness's world fixture and home-land SHA-256 values match this worktree's files; the current build supplied the browser state.
- Fresh **Dev control checks passed**: .12/+ .81 reset, key 1.12/fill 3.2 display/reset, readable helper idempotence and reward inverse gain. [Manifest](../../.look/evidence/1793905205890-33401/evidence.json).
- Every completed new broker run has status 0 and `changedDuringRun: false`. [Evidence index](color-defaults/evidence-index.json) and [uptime records](color-defaults/loads.json). Candidate manifests show committed runtime/helper source at `0f365a63`, with only untracked report artifacts making the tree dirty; no source changed during a run. Capture execution success is distinct from the visual reservations above.

## Retained concern and historical evidence

**Remote-player names remain dimmer and unfixed.** The earlier [unlit diagnostic](color-defaults/unlit.png), reopened here, stages the actual station-label sprite and `avatars.makeLabel` material. The station's readable compensation held; ordinary player names used an existing uncompensated SpriteMaterial and lost roughly 18% display luma at .12. That material was not changed in this follow-up. The image is explicitly pre-rebase evidence; it is not a fresh multiplayer/device test. The new controls run confirms the retained compensation policy, not exhaustive text legibility. No Boogler copy was edited and no suspect copy line was identified.

The original 54 MB evidence package is preserved at [`.look/evidence/color-defaults-initial`](../../.look/evidence/color-defaults-initial). Its cells, raw frames, video, GPU samples and full bot runs are **outside Git**. Original broker folders/checkpoints also remain. Earlier wide coverage was opened in the first pass, but is stale for this rebased tree unless refreshed above. Useful historical boards: [furnished doorway](../../.look/evidence/color-defaults-initial/doorway.png), [FINE PRICES](../../.look/evidence/color-defaults-initial/fineprices.png), [tags](../../.look/evidence/color-defaults-initial/tags.png), [sand](../../.look/evidence/color-defaults-initial/sand.png), [sky](../../.look/evidence/color-defaults-initial/sky.png), [shop](../../.look/evidence/color-defaults-initial/shop.png), [museum](../../.look/evidence/color-defaults-initial/museum.png), [underwater](../../.look/evidence/color-defaults-initial/underwater.png), [waterline](../../.look/evidence/color-defaults-initial/waterline.png), [crossing](../../.look/evidence/color-defaults-initial/crossing.png), [classic](../../.look/evidence/color-defaults-initial/classic.png).

The earlier [doorway walk video/frames/curves](../../.look/evidence/color-defaults-initial/motion) and [consecutive-frame sheet](../../.look/evidence/color-defaults-initial/walk-2.png) showed camera discontinuities, including 683→684 and 748→749. They have not been rerun after rebase; smoothness and cause remain unverified. Earlier loaded GPU render means (main 7.572 ms, defaults 6.661 ms) were never a valid speedup claim and are now also stale. No new GPU timing claim is made.

## Repository weight and remaining limits

The branch's own commits were rebuilt on `82f8381e`; the former 54 MB evidence commit is not an ancestor. The tracked research directory now contains **12 PNG boards and four small JSON files, approximately 6.18 MB total**, with no cells, raw frame folders, videos or bot runs in any new branch commit. Compression is lossless; no evidence pixels were downscaled. Older objects may remain locally in reflogs for recovery, but are not part of the branch history. Full capture streams and source PNGs remain under `.look/evidence` and `.look/color-defaults/followup`. No force-push was needed or performed.

Unverified: evening sign distance/phone readability; remote-name readability acceptance; original bot-miss cause; quiet-machine stalls/GPU cost; real-time feel/audio; mobile; multiplayer; the fade and alternate 256/512 sky sizes were preserved by code review, not freshly exercised. No owner playtest or evening retuning follows this report. No external network use; no push, ship or merge.

**Does the island now feel as sunny and inviting as the sea?**
