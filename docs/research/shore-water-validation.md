# Home shore with graduated water

> **Verdict:** Home shore with graduated water validated locally.
> **Top recommendations:** 1. Low along the shore. 2. High over the shallows. 3. Avatar at the wet edge.
> **Status:** reference. See [plan water-graduation](../plans/water-graduation.md).

3 November 2026. Local work on `codex/shore-water`; no push. DESIGN.md: **Show, don't tell**, **Small and readable**.
This follows the existing shore-slice and Ultra Water research; no external network was used.

The shore-slice branch was fast-forwarded into this checkout. Its rock dispatch had an unmatched `else` after
the water-contact integration; that startup syntax error is repaired. Both smooth materials and the deformed
rocks now register as receivers. The new path omits the slice's static wet tint, adds moving swash lace, restores
caustics on matching bed heights, and uses the demo's shallow 1.35 contrast taper. Clear-water absorption and
the saturated sand/grass palette remain unchanged. Rock contact bounds come from their transformed vertices.

The slice's exact triangle mesh replaces the original collider inside its rectangle. Four unchanged heightfields
surround it. A cached triangle sampler serves local ground queries and the home shore provider; original authored
heights, lockstep data and player dive code are untouched. The mode switch restores the original collision too.

## Bank slit diagnosis

At the same Place camera `(972,22,55) → (1000,0,20)`, the blue strip disappears when a capture-only diagnostic
culls water backfaces, leaving the bank geometry unchanged. It is the underwater colour branch on locally
folded, horizontally displaced ocean triangles, not a terrain hole or lack of sand subdivision. The repair uses
that branch only for a backface viewed upward; a downward view gets top-side optics even if local winding flips.
It leaves genuine underwater viewing available. Choppy geometry can still fold; this is an optical-side repair.
The fixed Place capture shows continuous green water beside the unchanged coarse bank.

## Contact audit

547 sampled positions, including the previous worst point `(32.5,25)`: no missing mesh/collider intersections.
Maximum mesh/query discrepancy 0.000000553 m; maximum mesh/collider discrepancy 0.000001916 m. The initial
audit accidentally included scenery colliders and reported ray origins inside props as a 10 cm discrepancy;
the corrected audit temporarily masks those props, restores their masks, and tests the terrain alone.
The raw shore provider uses that same mesh sampler. The retained filtered 1 m bake is approximate: maximum
near-waterline discrepancy 0.05963 m over 156 samples. No claim of submillimetre baked wave-field precision.
Rock colliders retain their old simple shapes; only the sand's reported 12 cm contact gap is fixed.

## Evidence and acceptance

Runtime evidence below tests clean commit `f8faab2f`, tree `9b1653c23371da41e6c5280b12032b28f0e3d38a`.
Subsequent changes only complete this report and the graduation plan. No source changed during a capture.
Three look/fix rounds: baseline/diagnosis, receiver/contact/optical repair, final matrix/validation.

Opened every board below, the Lagoon and Breakers originals, all six consecutive frames individually,
the motion curves, final contact/cost stills, underwater still, both smoke clients, and both bot end stills.
The bright net now continues onto the slice and submerged rocks; shallow sand stays legible and grass stays
saturated. Smooth and smooth-detail remove the coarse shore facets. Detail adds quieter sand texture, not a
new coastline. The home beach is steeper and its run-up much gentler than Breakers. The six native consecutive
30 fps frames show incremental caustic and wet-edge movement; they do not establish real-time smoothness.
The close avatar is supported by the sand, but ankle immersion is visually inconclusive: the very clear sheet
and steep bank do not give a convincing waterline around the feet. Its slow downslope drift is visible in
curves. No changes were made to swimming or dive behavior to stage this view.

Boards in viewing order (home camera matches across the first two panels; demo is the nearest reference,
not a geometrically matched scene; avatar staging moved slightly downslope in board 03):

1. [Low along the shore](../../.look/evidence/1793737127038-47270/01-low-board.png)
2. [High over the shallows](../../.look/evidence/1793737127038-47270/02-high-board.png)
3. [Avatar at the wet edge](../../.look/evidence/1793737127038-47270/03-ankle-board.png)
4. [Western wave view](../../.look/evidence/1793737127038-47270/04-wave-board.png)
5. [Six consecutive video frames](../../.look/evidence/1793737127038-47270/05-wave-consecutive.png)
6. [New water: off / smooth / smooth-detail, rocks off](../../.look/evidence/1793737127038-47270/06-matrix-rocks-off.png)
7. [New water: off / smooth / smooth-detail, rocks on](../../.look/evidence/1793737127038-47270/07-matrix-rocks-on.png)
8. [Bank slit: before / front-face diagnostic / repair](../../.look/evidence/1793737127038-47270/08-slit-board.png)

Panels are 1210×702 plus labels, assembled with ffmpeg hstack. The
[source index](../../.look/evidence/1793737127038-47270/board-sources.json) maps every panel to its original and
manifest. [Wave manifest](../../.look/evidence/1793737127038-47270/evidence.json),
[avatar manifest](../../.look/evidence/1793737847931-52758/evidence.json),
[contact audit](../../.look/evidence/1793737128549-47361/evidence.json),
[underwater view](../../.look/evidence/1793737354695-49069/evidence.json).
Capture poses, contact audit, timing observer and check output are copied beside the boards.

## GPU span cost

[Timing manifest](../../.look/evidence/1793737156901-47601/evidence.json) and
[raw spans](../../.look/evidence/1793737156901-47601/gpu-spans.json).
A/B/A in one browser: original geometry/rocks → smooth-detail/shaped rocks → original, all with new water.
180 frames per segment, fixed low camera, world/output 1210×702, DPR 1, scale 1, stored 4× MSAA,
2048² updating shadow map. One late-morning sky bake at tod=0.24; metered AgX. This is a local shared-GPU
sample, not isolated device acceptance or a total old-water/new-water cost comparison.

| Segment | Mean span | p95 span |
| --- | ---: | ---: |
| Original A | 6.943 ms | 8.664 ms |
| Slice + rocks B | 6.871 ms | 8.894 ms |
| Original A repeat | 6.593 ms | 8.438 ms |

Span means earliest compute/render start to latest end, not the misleading sum of overlapping timestamps.
The capture observer includes the existing r187 resumed-pass timestamp correction. Increment against the
surrounding A mean is +0.103 ms; half the A drift is 0.175 ms, larger than the increment (not a confidence
interval). No resolved cost regression from this sample. All 540 frames valid, no missing/partial ranges;
27 native raster passes, 17 mip bundle executions, one color and one depth copy per frame. Direct draws
109–112 original versus 116 shaped, excluding draws inside bundles. No sampled frame interval over 33 ms.
Do not substitute the on-screen render-sum profiler number for this span measurement.

## Checks and remaining limits

- `npx prettier --write` ran on changed files; `npm run check` passed (292 tests, lint/types/registries/levels/assets/build).
- `npm run sim -- replay` passed 1103 frames within the existing 0.01 tolerance; fixtures unchanged.
- Trusted [world-inputs and smoke scenarios](../../.look/evidence/1793737218192-48787/evidence.json) passed,
  including two-client item/ball ownership and matching hashes. These are not a two-player shore-feel test.
- [Full Place bot](../../.look/evidence/1793737457747-49410/evidence.json) passed all expected solo beats:
  33 game minutes, 3m41s wall time, 78 checkpoints; full report and end still read. Zero errors/water falls;
  4m59s idle and 5s pushing. `did something together` remains unmarked. Checkpoint list verified separately.
- The [first bot](../../.look/evidence/1793737217009-48784/evidence.json) failed after an overly short
  `--stall 180` cutoff before train beats. Default stall allowance passed without a code change.
- Early failures: merged unmatched `else`, a TSL helper needing an Fn scope, and a capture-only bare import
  were corrected. One intermediate Place startup reported a particle GPUComputePipeline error; an unchanged
  retry and subsequent final runs were clean. No claim that intermittent driver/startup faults are eliminated.
- All-view folding/refraction, visibly convincing ankle immersion, strong breaker run-up, real-time feel,
  sustained/mobile/Retina GPU performance, rock collider fidelity and the owner's playtest remain unverified.
  The filtered bed bake retains the measured ~6 cm local approximation. The sand's prior 12 cm mesh/collider
  mismatch is fixed; the water mesh can still fold. No default switch or shipping acceptance is claimed.

Owner URL form, when this branch is served on the usual local port:
[http://localhost:5173/?classic=1&water=new&shore=smooth-detail&shoreRocks=1](http://localhost:5173/?classic=1&water=new&shore=smooth-detail&shoreRocks=1).
The broker used temporary per-run localhost ports and closed them; this is not a deployed URL.

Suspect existing copy, preserved for the owner: the bot still saw “C Swim down” and “Space Jump, or swim up”
while the separate dive-removal job is pending. This task does not edit those lines.
Visual acceptance here is an agent's still/frame inspection, not the owner's playtest or real-time feel verdict.
