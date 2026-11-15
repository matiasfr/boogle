# Roundhouse painted previz — 15 November 2026

Drafts for the owner's look judgment, not approved. Documentation images only; no game source changed.

| View | Painting | Today's game reference |
| --- | --- | --- |
| Stage 0, spur | [Painting](stage-0-spur.png) | [works-open](source-spur.png) |
| Stage 1, garage | [Painting](stage-1-garage.png) | [wagon-on, actual garage camera](source-garage.png) |
| Stage 3, above (held) | [Painting](stage-3-above.png) | [steel-home, five built bays](source-above.png) |
| Named parts and section | [Reference sheet](reference-sheet.png) | Same spur and overhead references |

All four generated images and all three retained source stills were opened. The supplied screenshots were geometry/composition and palette references, not generic style examples. Exact prompts: [prompts.json](prompts.json). Built-in image_gen; model selection unavailable, returned model and cost undisclosed. One generation per deliverable. No approval inferred.

## Scale targets and departures

The prompts use section (b): r8 table, 16 × 3.2 bridge, 0.9 pit and girders, r14 doors, r25 backs, 11 depth, 20° bays, 4.86/8.68 front/back chords, 3.6 × 4.6 clear doors, 1.26 total piers, 6.2/4.8 walls, r17–19 monitor raised 0.9, r21 jacks. The dimension labels are targets; generated perspective artwork is not a measured construction drawing.

- **Stage 0:** keeps the spur composition and open ruin arc, but the tarp leaves the locomotive cab exposed. Some piers are drawn shorter than the walked blockout's 3.2 m minimum. The bridge is not aligned with the approach track. The pit reads deeper and its kerb thicker than the 0.9 m / 0.15 m targets. Radial spacing and exact five-bay 100° arc are not metrically preserved.
- **Stage 1:** three doors, three jacks and continuous roof, using today's actual 15° camera rather than the plan's interim 85° or proposed 30°. The front looks nearly straight rather than visibly sweeping through 60°. The roof, door arches and thin piers are painterly interpretations; 1.26 m combined pier width and 6.2/4.8 wall heights cannot be certified. Pit/kerb depth is exaggerated visually; the near bridge end is cropped, so its 16 m length and end clearances cannot be judged here. It omits the jib and crew beyond the framing, as the source does.
- **Stage 3:** seven doors and seven jacks form one building; adds two bays to the five-bay source. The copy occupies roughly four fifths of the visible deck, rather than the prescribed 56% (9/16, 3.5 m spare each end). The pit remains visually close to a disc: ring rail, pivot and depth are not exposed clearly. Building arc, chords and roof details are approximate, not a faithful 140° survey. Neighbor tracks and plots are painted, not clearance proof.
- **Reference sheet:** names the parts in (a), including bay inspection pit, bridge pivot and ring rail. Top bay numbering duplicates 4 and omits 3. Front/back elevations are flattened and not consistently at one scale; side height leader placement is ambiguous. The top plan inherits the oversized copy. It assigns 0.9 m depth to the bay inspection pit although the plan only fixes that number for the turntable pit. Read the dimension table as the targets, not proof that its drawing meets them. The pose sequence is schematic, not native animation or asset-stage execution.

Today's garage row also has a 12.2 m jib arm, versus the plan's 11 m. No numbers in the plan or game were changed by this work.

## Capture provenance and limits

Source checkout: `bff2e620325e7860926687684cb05d4bcbdcb8cd`, clean tree `861adfe666245c287b5fd7953dd5edb4a1ba49d3`. Node 26.13.0. Dependencies installed with npm ci (initial install used Node 24; captures used 26).

Look commands (prefix `npm run look --`):

```text
--rail-seed works-open --cam 930,21,7 --look 944.555,20,28 --frames 2 --seconds 1 --name rotunda-stage0-spur
--rail-seed steel-home --cam 944.55,85,5 --look 944.55,18,29 --frames 2 --seconds 1 --name rotunda-above
--rail-seed wagon-on --action .look/garage-camera-action.ts --frames 2 --seconds 1 --name rotunda-stage1-actual
```

Each command included its framing question. Garage scratch action copies `dev/look/evals/garage-open.ts`, then calls `window.__debugCam?.clear()` and waits 1500 ms so the actual camera owns the view. Initial stall-done failed to open; two subsequent captures held the debug camera on the island and were rejected after inspection. Only the final garage image was used. One queued retry was cancelled; a loaded diagnostic retry used the documented `BOOGLE_BOT_MAX_LOAD=0` option. The final garage capture started at load 17.19 and ended at 18.11.

Retained capture verdicts: [spur](source-spur-verdict.json), [garage](source-garage-verdict.json), [above](source-above-verdict.json). All three passed WebGPU, completed-frame and console checks. These are still references, not timing, motion, feel or clearance evidence. Stage 3 does not exist in the captured game; its two extra bays are illustration only.

**Outstanding part of the original step 2:** the bridge turn and roll-out in the asset stage were not executed. This task restricts work to Codex images, so the sheet supplies labelled pose diagrams only. The plan keeps this proof explicitly unchecked; the four requested image deliverables are complete.
