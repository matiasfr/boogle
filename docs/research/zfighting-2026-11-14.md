# Classified z-fighting census, 14 November 2026

> Latest: after the current-main rebase port, the census is **a 176 / b 61 / c 541**, with 20 new findings and 162 stale baseline pair keys. See the rebase follow-up below for the main-side geometry changes and fresh evidence. The original tables/images below retain their historical provenance.

The original census below used the launch origin/main snapshot `fceb07f6115d854628bd14e3bb677b46866075b4`; no geometry fixes are made here. Run commit `7ac7996515f5fc884346d7d63c84d17cda2d1838`, source hash `337d6af47d881708d08dedba69f07435d1ea55701e52b08cf4d53105f54f2add`.

Grouped findings: **a likely visible 205; b same-appearance joints 61; c proved hidden 545**. Raw oriented rows: a 2974, b 172, c 2422. New since baseline: **0**. 6049 pieces, 520394 triangles, 8061 ms (not a performance benchmark).

The old 3,151-row list lacked appearance and omitted buried portions. This pass preserves authored/instance colours, vertex colours, texture/UV evidence and shadow flags. Hidden counts now include clipped buried portions, so raw totals are not the old count partitioned. Any exposed portion with differing or unresolved appearance keeps the whole grouped contact in a. Downward normals alone never imply hidden.

Orientations of an exact piece pair collapse first (maximum face area, not a double count). One anchor against repeated part instances groups next. Track assemblies additionally group repeated pairs of the same kit-part families as one recurring pattern; every member and coordinate remains in the JSON. Areas for such groups sum member pair areas; coordinates identify the largest representative contact, not the average of an entire line.

## New top twenty: class a only

Names below are representative pieces; count includes all oriented/hidden member rows within the group. The [committed JSON](zfighting-findings-2026-11-14.json) contains the complete class-a list and member coordinates. `npm run zfight -- --all` exposes b/c as well.

| Rank | Piece A                                   | Piece B                                   |  Area m² | Rows | World x, y, z              | Evidence for class a                                                  |
| ---- | ----------------------------------------- | ----------------------------------------- | -------: | ---: | -------------------------- | --------------------------------------------------------------------- |
| 1    | track/quarry/plank/633                    | track/quarry/rail/1228                    | 113.8994 | 1138 | 1401.112, 24.400, -242.550 | material, colour, vertex colour, shadow flags, procedural grain phase |
| 2    | track/quarry/rail/1965                    | track/quarry/sleeper/570                  |  14.0780 | 1535 | 1382.293, 24.400, -184.534 | material, colour, vertex colour, procedural grain phase               |
| 3    | track/timber/rail/650                     | track/timber/sleeper/216                  |   6.3110 |  678 | 948.558, 18.400, -15.375   | material, colour, vertex colour, procedural grain phase               |
| 4    | Home/station/batch-0/43                   | railway.halt-0-down-deck/part-5           |   6.0713 |   17 | 930.119, 18.330, 5.940     | material, colour, vertex colour, procedural board instance shading    |
| 5    | track/quarry/stringer/2042                | track/quarry/stringer/2054                |   3.9006 |  298 | 1189.521, 23.880, -42.410  | procedural grain phase                                                |
| 6    | gorge.massing.14/instance-0               | gorge.massing.26/instance-0               |   3.8414 |    2 | -93.790, 3.900, -1969.942  | colour                                                                |
| 7    | gorge.massing.16/instance-0               | gorge.massing.26/instance-0               |   3.0649 |    2 | -97.100, 3.900, -1972.111  | colour                                                                |
| 8    | bell.bay-bed-out/instance-0               | bell.upper-in-n/instance-0                |   2.9477 |    1 | -47.959, 14.000, -853.865  | colour                                                                |
| 9    | bell.bay-bed-in/instance-0                | bell.upper-out-n/instance-0               |   2.9477 |    1 | -51.315, 14.000, -854.169  | colour                                                                |
| 10   | gorge.massing.26/instance-0               | gorge.massing.74/instance-0               |   1.9921 |    2 | -92.917, 3.900, -1969.274  | colour                                                                |
| 11   | gorge.massing.18/instance-0               | gorge.massing.27/instance-0               |   1.9124 |    2 | -104.559, 3.900, -1976.871 | colour                                                                |
| 12   | Home/yard/rail/57                         | Home/yard/sleeper/73                      |   1.8496 |  210 | 950.387, 18.433, -2.418    | material, colour, vertex colour, procedural grain phase               |
| 13   | gorge.massing.16/instance-0               | gorge.massing.27/instance-0               |   1.7161 |    2 | -100.364, 3.900, -1974.211 | colour                                                                |
| 14   | gorge.massing.48/instance-0               | gorge.massing.51/instance-0               |   1.4993 |    1 | -78.357, 85.100, -2025.982 | colour                                                                |
| 15   | gorge.massing.18/instance-0               | gorge.massing.20/instance-0               |   1.1729 |    2 | -107.397, 3.900, -1980.966 | colour                                                                |
| 16   | src/place/tech-layout.ts:pad/jump-catch-6 | src/place/tech-layout.ts:pad/jump-return  |   1.1710 |    2 | 955.496, 22.569, -59.490   | unknown appearance                                                    |
| 17   | Home/station/batch-0/40                   | railway.halt-0-down-ramps-0-visual/Mesh-0 |   1.1250 |    4 | 919.110, 18.331, 9.947     | material, colour                                                      |
| 18   | gorge.massing.26/instance-0               | gorge.massing.73/instance-0               |   1.0720 |    2 | -101.417, 3.900, -1968.323 | colour                                                                |
| 19   | railway.halt-1-down-deck/part-1           | railway.halt-1-down-deck/part-4           |   0.9624 |    4 | 1006.638, 31.000, -144.850 | vertex colour, procedural board instance shading                      |
| 20   | railway.halt-1-down-deck/part-2           | railway.halt-1-down-deck/part-5           |   0.9624 |    4 | 1012.638, 31.000, -147.350 | vertex colour, procedural board instance shading                      |

## Fixed — zfight-top20 implementation (partial)

**Spot 16 diagnosis corrected (14 November, `codex/zfight-spot16`):** not a live geometry defect. Commit
`e6f2961e1633857c1598989af0adf56312e5d2a2` deleted `src/proto/place/tech.ts`, including the loop drawing
`JUMP_RECOVERY.slabs` and its return ramp. Current `src/entities/railway/tools.ts:98–113` draws only the first
pillar/platform; `hook-view.ts:54` draws the hook ring pads. `path-surface.ts` paints terrain and has no pad builder.
The offline `timberDecks` pad catalogue had resurrected the retired prototype. `dev/level/tech-geometry.ts` now
executes bounded sections of those current builders, and `drawn-geometry.ts` uses their actual mesh buffers instead
of the legacy pad/column box recipes. Boundaries fail closed if the source moves; no recovery exclusion list.
The owner-requested `test/zfight-tech-source.test.ts` fails against the old collector and passes with this capture.
Census: **a/b/c 167/61/548 → 166/61/548**, raw **361/172/2444 → 360/172/2443**; only the catch-6 ↔ jump-return
group retired, no added groups. Pieces/faces **6,284/544,613 → 6,259/543,691**. Baseline unchanged; 22 new flags remain.
Opened matched `.look/zfight-spot16-before-still.png` and `-after-still.png`: starting pillar and canyon paths,
no recovery ribbon/ramp at the reported contact, same visible scene. Both captures pass WebGPU/frame/error health.
Six hashes from `node dev/ground/heights-hash.ts` are identical (retained in `.look/zfight-spot16/hashes-{before,after}.txt`).
No game source, depth bias, heights, collision, WORLD_NS, copy or ROM-data changes. No timing claim.
This corrects the earlier "rank 16 needs path-surface.ts" diagnosis below; it does not restore the retired course.
Full-route play and temporal flicker unverified. **Not tested on a device.** Nothing pushed or shipped.

Fresh starting census: **a 176 / b 61 / c 541**. After the geometry changes and rebase:
**a 159 / b 60 / c 538**, raw **345 / 127 / 1055**, new since baseline **14**.
The historical top-twenty ranks below identify the requested spots, rather than the new ranking.

| Requested ranks | Source and change | Result |
| --- | --- | --- |
| 1, 2, 3, 12 | `src/place/look-kit.ts`: omit the rail's redundant horizontal bottom cap at bake time (vertices within 1 mm of the minimum y); no rail translation, head-height or collider change | Rail/plank and rail/sleeper patterns absent from class a |
| 4, 17; Home owner report | `src/entities/railway/home-station-view.ts`: inset side kerbs 2 cm on either side (0.30 → 0.26 m); end kerb width −4 cm and depth 0.30 → 0.26 m | Both kerb/platform and kerb/ramp groups absent |
| 5 | `src/entities/railway/track.ts`: shorten drawn stringers 6.6 → 6.3 m (15 cm per end), at unchanged 6.5 m bent spacing | Quarry stringer pattern absent |
| 8, 9 | `src/content/levels/leg2.ts`, generated `content/built/levels/bell.json`: move only the two upper north platforms' drawn undersides up 1 cm; preserve original collider boxes separately and keep tops fixed | Both underside groups absent; collider golden unchanged |
| 19, 20; Forge owner report | Already absent on the starting main; no changes here | Remain absent |

**Still unresolved:** Gorge ranks **6, 7, 10, 11, 13, 14, 15, 18** need actual polygon trimming/union of overlapping slab faces while preserving their walkable tops and collision coverage. No vertical ground nudge was applied. Rank **16** (jump recovery catch/return) needs the drawn pad geometry in reserved `src/place/path-surface.ts`; left for that file's owner. Neither `ground-material.ts` nor `terrain.ts` was edited. This is a partial implementation, not a completed top-twenty repair.

No polygonOffset/depth bias, WORLD_NS, Boogler-copy or ROM-data changes. An attempted 3 cm rail lift was rejected by the wheel-grounding test and fully removed in favour of cap removal. Bell visual golden changes are limited to two thickness/centre matrices; the collider golden remains byte-identical. The baseline was not reset: its historical stale entries and newly retired contacts remain visible for selective maintenance.

Visual evidence: two bounded capture attempts expired in the shared GPU queue/load gate without usable images. A subsequent existing `npm run look` capture with the documented load gate disabled succeeded on WebGPU, with no page/console/GPU errors. Opened `.look/zfight-top20-final-still.png`: continuous dark rails remain seated on pale trestle planks with no obvious striped patch at this angle. This is one after still, **not the requested five before/after pairs**; temporal flicker and other repaired sites remain visually unverified. Capture timing under load proves no performance or feel claim. **Not tested on a device.** Nothing pushed or shipped.

## P2 corrections after independent review of e9db30f4e

The earlier rail-cap removal and 6.3 m centred-stringer repairs are superseded. The review correctly found that cap removal left the visible rail shell facing inward and that centred short beams had unsupported mid-span gaps.

- `src/place/look-kit.ts`: retain every rail triangle. Weld positions for connected-shell analysis, measure signed volume, and reverse indices and normals only on inward-wound shells. Hardware keeps its own orientation. Rail head heights, placement and all colliders stay unchanged. `test/rail-top.test.ts` ports the reviewer's scratch reproducer: it failed on the reviewed tip, passes after repair, and now also checks the downward hit is on the upward-facing 13.5 cm head rather than the foot.
- `src/entities/railway/track.ts`: draw stringers on the actual chord between adjacent bent positions, sampling each endpoint's lateral offset and elevation. Trim 6 cm at each end so the 12 cm joint sits over the metre-wide cap. A span is drawn only when the next bent exists. The panelled-line endpoint probe (`.look/zfight-p2/support.ts`) checked all 20 timber and 158 quarry beams against actual cap transforms: zero unsupported endpoints, including graded spans. No ground or collider changes.
- Fresh census: **a 167 / b 61 / c 548**, raw **361 / 172 / 2444**, new since baseline **22**. Against the invalid reviewed result 159/60/538, restoring the rail tops exposes eight smaller halt-crossing-board/rail groups; they were masked by the inward/open rail shell, not fixed by deleting it. The requested rail/plank, rail/sleeper and quarry-stringer patterns remain absent. The baseline was not reset. Gorge remains untouched in this follow-up.

Opened final WebGPU stills on source commit `6ac4f966b`: `.look/zfight-p2-rail-final-still.png` (solid rail heads cover the planks from above), `.look/zfight-p2-curve-final-still.png` (continuous spans over the reported curve's caps), and `.look/zfight-p2-grade-final-still.png` (graded spans terminate over caps). All three waited for the splash to disappear and passed capture health with no page/console/GPU errors. The first preliminary rail capture showed the splash and is rejected as visual proof; queued preliminary underside captures were stopped/replaced. These stills do not establish temporal flicker or real-time smoothness. `node dev/ship-check.ts origin/main HEAD` passed: registry, six lint files, typecheck, 60 affected test files, **529/529 tests**. Final gates are rerun after committing this note and rebasing. No polygon offset, depth bias, copy, WORLD_NS or reserved ground-file changes. **Not tested on a device.** Nothing pushed or shipped.

## The two owner reports

Both remain **class a**. Home is the kerb against the platform foundation beside the spur; Forge is the upper door step against its slab. Their current ranks and representative coordinates are:

| Rank | Piece A                  | Piece B                         | Area m² | Rows | World x, y, z          | Evidence for class a                                               |
| ---- | ------------------------ | ------------------------------- | ------: | ---: | ---------------------- | ------------------------------------------------------------------ |
| 4    | Home/station/batch-0/43  | railway.halt-0-down-deck/part-5 |  6.0713 |   17 | 930.119, 18.330, 5.940 | material, colour, vertex colour, procedural board instance shading |
| 28   | forge/door-step-1/Mesh-0 | forge/shell-0                   |  0.8400 |    1 | 910.100, 18.500, 1.650 | material, colour, procedural board instance shading                |

## New visual review of the top ten

All captures use the existing broker and in-game scan tint. Each clears the tint after 1.2 seconds for middle motion-sheet comparison frames, then rescans at 1.8 seconds so the final full-size still has tints. These are still-image observations: none proves temporal flicker. Free-camera underside views do not establish that the normal player camera can reach that view. Missing or ambiguous evidence remains in a.

| Rank | Manifest under .look/evidence | Inspected observation                                                                                                                                                                                                                                                                                   |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 1794692586472-21067           | Tint identifies the rail/plank crossing on the trestle. Cleared frames show continuous dark rails on pale decking; no obvious damaged seam at this angle. Suspect only; no flicker established.                                                                                                         |
| 2    | 1794692801245-23721           | Tint identifies rails against sleepers at the quarry turnout. Cleared frames show the expected steel/wood boundary without an obvious striped patch. Suspect only; no flicker established.                                                                                                              |
| 3    | 1794692869281-25919           | Tint identifies rail/sleeper contacts on the Home-side turnout. Cleared comparison is partly covered by a passing train; no obvious striped patch in the exposed portion. Suspect only.                                                                                                                 |
| 4    | 1794692894773-27022           | Nearest-member banner identifies Home instance 43 against platform instance 5 at (930.12, 18.33, 5.94), class a, with both tinted. Cleared comparison shows the platform edge above foreground rails, without definite new striping at this low angle. Pair identification is verified; flicker is not. |
| 5    | 1794693320819-39840           | Nearest-member banner identifies the stringer pair at (1189.52, 23.88, -42.41), matching the static coordinate. Cleared beam looks continuous without an obvious striped seam. Suspect only; procedural grain and ordinary camera access remain uncertain.                                              |
| 6    | 1794693364007-40424           | Tint shows the overlapping gorge slabs as a grouped neighbourhood. Cleared frames show a broad, faint grey colour boundary where the slabs meet. Visible seam for owner review; stills do not establish flicker.                                                                                        |
| 7    | 1794693406920-41636           | Nearest-member banner identifies gorge instances 16/26 at (-97.10, 3.90, -1972.11), within the grouped slab neighbourhood. Cleared frames show angled grey colour boundaries. Visible seam for owner review; no flicker established.                                                                    |
| 8    | 1794693475014-42468           | Tint identifies the Bell underside pair at the recorded coordinate. Cleared frames show adjoining dark/light underside patches, without clear fine striping at this representative. Player-camera accessibility and flicker remain unverified.                                                          |
| 9    | 1794693500038-43864           | Tint identifies the Bell underside pair at the recorded coordinate. Cleared 1.43/1.72-second sheet frames show a small horizontally striped dark patch at the overlap. A real rendering-defect suspect in this free-camera view; stills cannot prove temporal flicker or a reachable player camera.     |
| 10   | 1794693522811-44221           | Nearest-member banner identifies the contact at (-92.92, 3.90, -1969.27); runtime instance numbering differs from the source placement index. Tints show the grouped slab neighbourhood. Cleared frames show a faint polygonal colour seam across the floor; no flicker established.                    |

The loaded rail asset has a negative signed volume on its main shell (bottom triangles face upward), while plank/sleeper shells have positive volume. Rail/deck contacts also have different steel/wood appearance, so they cannot honestly be labelled harmless same-material joints. They are grouped recurring suspects, not thousands of default lines. Procedural grain phases, unknown legacy shader/material details and uncertain camera accessibility remain class a.

## Baseline, limits and validation

The committed `dev/level/zfight-baseline.json` contains only class-a member pairs. New member pairs inside an existing pattern count as new findings; grouping cannot silently absorb new debt. Fixing a contact leaves a stale baseline pair to remove. Level-check remains report-only; `--strict` fails on new findings only. [Rules, commands and baseline workflow](../agents/test-details/zfighting.md).

Completed opening, forge and house/shop/museum shells and furnishing records; actual workshop steps/guards; halt-kit builders in their owning frames; greybox and town placements; opening props; real baked track kit (main lines and Home yard), Home station boxes; level-check walkway/pad boxes; default Home terrain mesh near pieces.

- Moving actors, vehicles, animated/reveal poses, non-track GLB internals, museum animated exhibits, text/sign textures, particles and transparent effects.
- Temporary scaffold poles, shadow-only proxies and alternative stage props are not exterior completed geometry.
- Distant islands/Works and unconverted legacy decoration are not yet in the offline adapter; use the live scan there.
- Service walkways, footbridges and tech pads use level-check timberDecks oriented-box adapters, not their detailed decoration.

Known limits: geometry-only legacy adapters lack some appearance details and remain conservative a; arbitrary TSL colour/deformation and procedural grain are not proven equal. Only closed convex connected solids and drawn terrain prove occlusion. No general player-camera visibility oracle exists. No ROM data added; not tested on a device.

### What is actionable, and what remains uncertain

Of the 205 class-a groups, **82 have no measured material/colour/vertex/texture/shadow-field difference**; unresolved procedural or legacy appearance keeps them conservative a. Eight class-a findings are recurring track patterns. These counts are not claims of 205 visible defects. Rail/plank/sleeper representatives (1–3) and the stringer representative (5) did **not** show an obvious damaged seam in the inspected cleared views. They remain suspects rather than confirmed defects or proven harmless joints.

The new player-visible evidence to review is the faint gorge floor colour seams (6, 7, 10). Bell rank 9 has a small striped underside patch, but ordinary player-camera accessibility has not been established. Rank 8 shows a dark/light underside boundary. The two supplied PNGs were reopened: Home has a striped base edge and Forge a patterned step/slab overlap. Those original observations support keeping both static findings actionable; no geometry was fixed here.

**Home diagnosis is now verified:** the final nearest-member banner names `BoxGeometry/…/instance-43/part-2` against `box plan/…/instance-5/part-2`, class a, at `(930.12, 18.33, 5.94)`, and tints both. Its local group area is 3.8256 m² inside the 5 m neighbourhood, versus the offline group's 6.0713 m² across the complete assembly. The cleared view has foreground rails and does not establish new striping or flicker at this low angle. The stringer banner now selects the static y=23.88 contact too. Group area is labelled separately from nearest-member coordinates.

Earlier Home attempts were retained honestly: `1794690850021-81615` had a wagon in front; `1794691842868-474` used the opening state and lacked the built deck; `1794691933185-4035` showed neighbouring representatives rather than the base pair. This exposed a diagnosis bug: grouped findings used their largest member as the live representative. The final view picks the nearest actionable member, retaining grouped counts and all member tints. These earlier results are superseded by final manifest `1794692894773-27022`. No further visual iteration follows this final pass.

### Executed validation and evidence provenance

The pre-review top-ten tested code is `7ac7996515f5fc884346d7d63c84d17cda2d1838` (source hash in the header). All ten final site manifests and the final T1 manifest have this clean before/after commit and `changedDuringRun: false`; the final commit after them records evidence/docs only. The [visual index](zfighting-2026-11-14-visual.json) records every manifest, still, comparison sheet and inspected observation. Every final top-ten still and comparison sheet, both supplied PNGs, and T1's end still were opened. Earlier passes were also inspected; the table uses the final nearest-member build. Rank 3 passed under load; no capture is treated as a timing, performance or feel benchmark.

- `timeout 300 node dev/ship-check.ts`: pass (registry, 14 lint files, typecheck, 25 affected test files).
- `timeout 120 npm run registry`: pass.
- `timeout 180 npm run level-check`: pass, 14 reports; a/b/c 205/61/545, new since baseline 0. Existing planned-route warnings remain report-only.
- `timeout 600 npm run check`: pass, 2,068 tests: 2,067 passed, 0 failed, 1 existing TODO; build passed.
- Pure detector/classifier tests: 12 passed. Classification covers material, colour, crossing vertex/UV gradients, shadow flags, unknowns, open enclosures, grouping and baseline retirement/new members. No UI unit tests or new scenario harness.
- `npm run zfight -- --strict`: exit 0 on the committed baseline; stale member pairs 0. A new member in an existing group still marks that finding new.
- `node .look/see-client.ts playthrough --to t1-done`: pass, all expected beats, no errors. Manifest `1794692587567-21105`; report and end still opened. Two stationary waits (rail build and wake), no walking-into-object or water failures. This is T1 coverage, not full-route or feel proof.
- Ten final ranked looks: execution/health pass, no page/console/GPU errors. Visual limitations are recorded above; a passing capture does not confirm visual quality.

Two tooling attempts failed before useful proof: `1794690013846-62593` rejected an inline eval export (fixed by separate-line exports); `1794690919751-82228` (`look --at list`) was rejected by the launcher's single-player clock-url constraint. Final looks use `--real`. There were no final bot failures. Full-route play, temporal flicker, real-time feel and device behaviour remain unverified. **Not tested on a device.** No ROM data added. Nothing pushed or shipped.

## Independent-review P2 follow-up, 14 November 2026

Both reproductions were fixed in `19d1093f47849af0892bb57b8ea700b0bfcda1c3`, tooling only:

- The live collector, offline built-object collector and crosshair picker share `isOpaqueMaterial`: visible, non-transparent, opacity 1, colour and depth writes enabled. Shadow-only proxies cannot enter the candidate face list or closed-solid occlusion proof, and cannot intercept the crosshair.
- `materialSurface` now lives beside the pure face-appearance comparison, with a structural material input. It captures `emissiveIntensity` and marks `emissiveNode`/`normalNode` graphs unresolved. Red emission at intensity 0 versus 2 and unresolved normal/emission graphs therefore remain class a. These shading slots do not change the existing geometry/opacity uncertainty rule for occluders.

Five new pure regressions were run against the extracted **old behavior before fixing it**: all five failed (`.look/zfight-review-red.log`). The invisible enclosing box changed a to c; the shared hit predicate selected the proxy; emission intensity and each shader slot produced b. After the fixes, all five pass and the complete focused detector suite is **17/17 passing** (`.look/zfight-review-green.log`). Tests import no three.js or DOM. A visible opaque enclosing-box control still correctly produces c.

`npm run zfight` was rerun: **a 205, b 61, c 545; raw a 2,974/b 172/c 2,422; new since baseline 0**, still 6,049 pieces and 520,394 triangles. Home/Forge remain a at ranks 4/28. Counts and ranked contacts did not move, so the baseline was not rewritten: SHA256 `c70d2abc4366b9a1f896acb6d003e92ed0b8137063b05c40ecae31b1e09e9fbe` is unchanged. No geometry/material tuning or ROM data was added.

Fresh broker proof uses the committed fix with clean matching before/after identities and `changedDuringRun: false`:

- Look manifest **`1794694651694-81887`** (`.look/evidence/.../evidence.json`): native three.js material checks passed, and a temporary invisible 4 m enclosure around Home left the actual crosshair, 9,856 collected faces and complete classification snapshot identical. The test enclosure was removed/disposed after the probe. The Home banner still identifies instance 43 against platform instance 5 at `(930.12, 18.33, 5.94)`. Both the new `zfight-p2-review-still.png` and `zfight-p2-review-motion.png` were opened: IDs/tints are readable and no enclosure appears. Capture health passed with WebGPU and no page/console/GPU errors. This verifies collection/selection and metadata, not temporal flicker or a rendered emissive/normal look.
- T1 manifest **`1794694652748-81895`**: `playthrough --to t1-done` passed, all expected beats and no errors. The report and new end still were opened. The end still shows the completed T1 state without a diagnosis overlay; no bot failures. Two stationary build/wake waits were reported, with no walking-into-object or water failures.

The changed-code ship-check passed (registry, 15 lint files, typecheck, 26 affected test files, 253 tests). Requested ship-check/registry and routed static validation are rerun after the documentation edits, with current logs under `.look/zfight-review-*.log`; the final handoff reports those outcomes. Earlier ten-site evidence remains historical; it is not claimed as a rerun of these proxy/material fixes. Not tested on a device; full-route play and temporal flicker remain unverified. Nothing pushed or shipped.

## Current-main rebase port, 14 November 2026

Collector compatibility is restored in `a629414e7`, on `codex/zfight-detector-2`. No game source, geometry, detector core, tolerance, classification or baseline policy changed:

- `drawn-geometry.ts` imports `describeGround` from `src/place/ground-layers.ts` and executes the current `land.buildMesh`/`addGroundLayers` functions to capture their real buffers. The removed terrain-pass modules are no longer imported. Ground layer packing does not rewrite positions. The `ground-material.ts` shader door remains stubbed at the existing headless capture boundary; `dev/ground/drawn.ts` likewise samples actual mesh buffers in-game rather than deriving shapes.
- The current catalogue also requires its existing `town.boogler-statue` builder registration. The Home adapters require the current rotunda `bayFrame`/`ROTUNDA_KIT` bindings and train-visibility query. These missing capture dependencies were repaired rather than skipping their geometry. The existing policy of collecting all built static pieces before progression visibility is retained.

### Why the census moved

The executable scan now reports **a 176, b 61, c 541** (previous snapshot 205/61/545), raw **a 3,071 / b 172 / c 2,576**, with **6,298 pieces / 545,229 faces** (previously 6,049/520,394). `new since baseline` is **20 findings** and there are **162 stale member-pair keys**. The baseline remains byte-for-byte unchanged (`c70d2abc4366b9a1f896acb6d003e92ed0b8137063b05c40ecae31b1e09e9fbe`): an import compatibility fix is not permission to accept the rebased contact changes.

Comparing the 205 committed historical class-a group ids with the current report gives **44 removed ids and 15 added ids**: `205 - 44 + 15 = 176`. Removed ids break down as 15 halt, 1 forge, 11 Home-yard and 17 Home-station groups. Of the 15 added ids, **13 have a historical centroid within 2 mm**: eleven yard sleepers were reindexed by the extra stall roads, one Home-station box was reindexed, and one halt group changed its grouping key. This matches unchanged locations; it does not prove every member of those groups is unchanged. Two added groups have new centroids:

| Current pair                           | World x, y, z           |
| -------------------------------------- | ----------------------- |
| railway.halt-5-up-deck/part-0 ↔ part-1 | 1395.89, 24.52, -352.66 |
| railway.halt-5-up-deck/part-2 ↔ part-3 | 1395.40, 24.52, -363.64 |

The remaining removed groups correspond to main-side changes: 14 halt seam groups, the forge upper-step contact, and 16 old Home-outline groups. In particular, `f66b5b50e` insets halt stripes; `275cba0a4` removes the forge step's overlapping top; `75ceb460e` replaces the three old stall outlines with the rotunda and a road per bay. Those are existing game changes on the rebased base, not changes made by this port. More yard members and changed current layouts also explain why raw face/contact totals can rise while grouped findings fall. The 20 new flags include changed members in existing patterns as well as newly keyed groups; they are retained for owner review, not silently baselined. The original top-twenty list is historical, not the current ranking; use `npm run zfight` for the current list.

### Fresh evidence and checks

The code's missing-module errors are gone. The requested `node dev/ship-check.ts origin/main HEAD` reaches typecheck and reports only the explicitly allowed unrelated errors: `src/place/meadow-field.ts` imports removed `upLat`, and `test/meadow-on.test.ts` reads that removed export. Neither file was edited or suppressed. Registry passes. The 17 focused detector regressions pass. Final census, requested gates and routed `npm run check` are rerun after this note; final results are in the handoff and `.look/zfight-port-*.log`.

Fresh browser runs use `meadow=0` solely to avoid loading that unrelated broken module. Their before/after code is the clean port commit, with no edits during the runs:

- Home look manifest `1794696035783-21372`: WebGPU/health pass, no page/console/GPU errors. Opened `zfight-rebase-port-still.png` and `zfight-rebase-port-motion.png`. The platform/ground is visible and nearby track-pair tints and ids are readable; the old kerb/base pair is not the displayed pair in this completed-stage view, consistent with main taking the kerb away when trains arrive. This is a diagnostic sanity view, not a new verdict on all 176 findings or temporal flicker.
- T1 manifest `1794696036906-21434`: all expected beats, no bot errors, no walking-into-object or water failures. Report and `run/end-still.png` opened; the end still shows the completed T1 state. Two stationary build/wake waits are reported. This passed with `meadow=0`, not the default meadow.

The default meadow, full route, real-time feel and temporal flicker are unverified. Not tested on a device. No ROM data added. Nothing pushed or shipped.
