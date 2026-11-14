# Classified z-fighting census, 14 November 2026

Geometry remains the launch origin/main snapshot `fceb07f6115d854628bd14e3bb677b46866075b4`; no geometry fixes are made here. Run commit `e4e497f870bae59c774ca4d61a5ba749ad0ed366`, source hash `c8a5f060ef58946dd01f2bf0c3d6b70c6b6ec35233e4b71b8f65bc3c3e227b75`.

Grouped findings: **a likely visible 205; b same-appearance joints 61; c proved hidden 545**. Raw oriented rows: a 2974, b 172, c 2422. New since baseline: **0**. 6049 pieces, 520394 triangles, 23786 ms (not a performance benchmark).

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

All captures use the existing broker and in-game scan tint. Each also clears the tint after 1.2 seconds, allowing late motion-sheet frames to show the underlying seam/colours. These are still-image observations: none proves temporal flicker. Free-camera underside views do not establish that the normal player camera can reach that view. Missing or ambiguous evidence remains in a.

| Rank | Manifest under .look/evidence | Inspected observation |
| ---- | ----------------------------- | --------------------- |

The loaded rail asset has a negative signed volume on its main shell (bottom triangles face upward), while plank/sleeper shells have positive volume. Rail/deck contacts also have different steel/wood appearance, so they cannot honestly be labelled harmless same-material joints. They are grouped recurring suspects, not thousands of default lines. Procedural grain phases, unknown legacy shader/material details and uncertain camera accessibility remain class a.

## Baseline, limits and validation

The committed `dev/level/zfight-baseline.json` contains only class-a member pairs. New member pairs inside an existing pattern count as new findings; grouping cannot silently absorb new debt. Fixing a contact leaves a stale baseline pair to remove. Level-check remains report-only; `--strict` fails on new findings only. [Rules, commands and baseline workflow](../agents/test-details/zfighting.md).

Completed opening, forge and house/shop/museum shells and furnishing records; actual workshop steps/guards; halt-kit builders in their owning frames; greybox and town placements; opening props; real baked track kit (main lines and Home yard), Home station boxes; level-check walkway/pad boxes; default Home terrain mesh near pieces.

- Moving actors, vehicles, animated/reveal poses, non-track GLB internals, museum animated exhibits, text/sign textures, particles and transparent effects.
- Temporary scaffold poles, shadow-only proxies and alternative stage props are not exterior completed geometry.
- Distant islands/Works and unconverted legacy decoration are not yet in the offline adapter; use the live scan there.
- Service walkways, footbridges and tech pads use level-check timberDecks oriented-box adapters, not their detailed decoration.

Known limits: geometry-only legacy adapters lack some appearance details and remain conservative a; arbitrary TSL colour/deformation and procedural grain are not proven equal. Only closed convex connected solids and drawn terrain prove occlusion. No general player-camera visibility oracle exists. No ROM data added; not tested on a device.
