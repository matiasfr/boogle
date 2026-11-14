# Classified z-fighting census, 14 November 2026

Geometry remains the launch origin/main snapshot `fceb07f6115d854628bd14e3bb677b46866075b4`; no geometry fixes are made here. Run commit `7ac7996515f5fc884346d7d63c84d17cda2d1838`, source hash `337d6af47d881708d08dedba69f07435d1ea55701e52b08cf4d53105f54f2add`.

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

The final tested code is `7ac7996515f5fc884346d7d63c84d17cda2d1838` (source hash in the header). All ten final site manifests and the final T1 manifest have this clean before/after commit and `changedDuringRun: false`; the final commit after them records evidence/docs only. The [visual index](zfighting-2026-11-14-visual.json) records every manifest, still, comparison sheet and inspected observation. Every final top-ten still and comparison sheet, both supplied PNGs, and T1's end still were opened. Earlier passes were also inspected; the table uses the final nearest-member build. Rank 3 passed under load; no capture is treated as a timing, performance or feel benchmark.

- `timeout 300 node dev/ship-check.ts`: pass (registry, 14 lint files, typecheck, 25 affected test files).
- `timeout 120 npm run registry`: pass.
- `timeout 180 npm run level-check`: pass, 14 reports; a/b/c 205/61/545, new since baseline 0. Existing planned-route warnings remain report-only.
- `timeout 600 npm run check`: pass, 2,068 tests: 2,067 passed, 0 failed, 1 existing TODO; build passed.
- Pure detector/classifier tests: 12 passed. Classification covers material, colour, crossing vertex/UV gradients, shadow flags, unknowns, open enclosures, grouping and baseline retirement/new members. No UI unit tests or new scenario harness.
- `npm run zfight -- --strict`: exit 0 on the committed baseline; stale member pairs 0. A new member in an existing group still marks that finding new.
- `node .look/see-client.ts playthrough --to t1-done`: pass, all expected beats, no errors. Manifest `1794692587567-21105`; report and end still opened. Two stationary waits (rail build and wake), no walking-into-object or water failures. This is T1 coverage, not full-route or feel proof.
- Ten final ranked looks: execution/health pass, no page/console/GPU errors. Visual limitations are recorded above; a passing capture does not confirm visual quality.

Two tooling attempts failed before useful proof: `1794690013846-62593` rejected an inline eval export (fixed by separate-line exports); `1794690919751-82228` (`look --at list`) was rejected by the launcher's single-player clock-url constraint. Final looks use `--real`. There were no final bot failures. Full-route play, temporal flicker, real-time feel and device behaviour remain unverified. **Not tested on a device.** No ROM data added. Nothing pushed or shipped.
