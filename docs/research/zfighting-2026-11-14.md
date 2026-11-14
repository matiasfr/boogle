# Z-fighting census, 14 November 2026

Geometry source: local origin/main `fceb07f6115d854628bd14e3bb677b46866075b4`. Tool run at commit `fceb07f6115d854628bd14e3bb677b46866075b4`, source hash `2258cde9f49b1d1e4bdcffae8f3091bdba7bf5cea06311f5f7e66159a46519f5`. All geometry-producing game files match that base; tooling never fixes the two reported placements.

3151 candidate oriented face-pair rows across 6049 pieces and 520394 triangles. This run took 10135 ms (not a performance benchmark). Both reported contacts were found; the supplied screenshot references 1.png and 2.png were opened.

The [full ranked JSON](zfighting-findings-2026-11-14.json) lists every other candidate with world coordinates, normal, exposed area and separation. Opposite sides of a pair are separate rows. No candidates are allowlisted. The ten largest are below; coordinates are supplied for owner review, not visually approved.

| Rank | Piece A                     | Piece B                     | Area m² | Separation mm | World x, y, z              |
| ---- | --------------------------- | --------------------------- | ------: | ------------: | -------------------------- |
| 1    | bell.bay-bed-in/instance-0  | bell.bay-bed-out/instance-0 | 54.9045 |        0.0000 | -50.010, 14.000, -849.885  |
| 2    | bell.bay-bed-in/instance-0  | bell.bay-bed-out/instance-0 | 54.9045 |        0.0000 | -50.010, 14.900, -849.885  |
| 3    | gorge.massing.14/instance-0 | gorge.massing.74/instance-0 | 25.1714 |        0.0000 | -91.521, 3.900, -1970.305  |
| 4    | gorge.massing.14/instance-0 | gorge.massing.74/instance-0 | 24.8389 |        0.0000 | -91.500, 3.400, -1970.264  |
| 5    | gorge.massing.20/instance-0 | gorge.massing.27/instance-0 | 12.3985 |        0.0000 | -110.778, 3.900, -1978.969 |
| 6    | gorge.massing.20/instance-0 | gorge.massing.27/instance-0 | 12.0386 |        0.0000 | -110.759, 3.400, -1979.001 |
| 7    | bell.upper-in-s/instance-0  | bell.upper-out-s/instance-0 |  6.7591 |        0.0000 | -50.634, 15.900, -842.989  |
| 8    | bell.upper-in-s/instance-0  | bell.upper-out-s/instance-0 |  6.7591 |        0.0000 | -50.634, 14.000, -842.989  |
| 9    | gorge.massing.14/instance-0 | gorge.massing.26/instance-0 |  3.8414 |        0.0000 | -93.790, 3.400, -1969.942  |
| 10   | gorge.massing.14/instance-0 | gorge.massing.26/instance-0 |  3.8414 |        0.0000 | -93.790, 3.900, -1969.942  |

## Reported regressions

Home: the old station kerb against the platform foundation, next to the engine spur. Forge: the upper stone door step against the workshop slab. These are geometry-confirmed correspondences to the supplied stills, not fixes.

| Rank | Piece A                  | Piece B                         | Area m² | Separation mm | World x, y, z          |
| ---- | ------------------------ | ------------------------------- | ------: | ------------: | ---------------------- |
| 41   | forge/door-step-1/Mesh-0 | forge/shell-0                   |  0.8400 |        0.0000 | 910.100, 18.500, 1.650 |
| 42   | Home/station/batch-0/43  | railway.halt-0-down-deck/part-5 |  0.8376 |        0.0096 | 930.119, 18.330, 5.940 |

## False positives and coverage

Treat every row as a diagnostic candidate. Many track-kit contacts are intended construction joints: matching material/UVs can make them harmless. Downward-facing greybox/track overlaps can be exposed into an inaccessible void, so local exterior exposure overstates player-visible defects. Non-convex or open geometry can leave occluded contacts in the output. The two supplied screenshots establish visible defects; the remaining rows are not individually visually adjudicated.

Rows involving main track: 2569. Downward normals (y < -0.9): 239. These sets overlap; neither is an automatically safe baseline.

Tolerances: 2 mm, normal dot 0.999999, area 0.005 m². The tolerance covers transformed-buffer noise without treating ordinary centimetre offsets as coincident. See [how to run, place pieces, and adopt a baseline](../agents/test-details/zfighting.md).

Completed opening, forge and house/shop/museum shells and furnishing records; actual workshop steps/guards; halt-kit builders in their owning frames; greybox and town placements; opening props; real baked track kit (main lines and Home yard), Home station boxes; level-check walkway/pad boxes; default Home terrain mesh near pieces.

- Moving actors, vehicles, animated/reveal poses, non-track GLB internals, museum animated exhibits, text/sign textures, particles and transparent effects.
- Temporary scaffold poles, shadow-only proxies and alternative stage props are not exterior completed geometry.
- Distant islands/Works and unconverted legacy decoration are not yet in the offline adapter; use the live scan there.
- Service walkways, footbridges and tech pads use level-check timberDecks oriented-box adapters, not their detailed decoration.

## Validation

Runtime code at `2ce7f74b2`: five pure detector tests pass; `node dev/ship-check.ts`, `npm run registry`,
`npm run level-check` and `timeout 600 npm run check` pass. The full suite reports 2,060 passes, zero failures
and one existing TODO. `--strict` returns 1 for the reported candidates; the default scan and level-check return 0.

Both supplied stills, the Home diagnosis still/motion sheet, and the T1 bot end still were opened. The Home scan
names/tints the same platform-base/kerb contact at approximately `(930.12, 18.33, 5.94)`, with 0.838 m² overlap;
the banner and ids are readable. The T1 short route passes every expected beat with no errors, ending with the
conductor hat awarded. It does not test the later route. An initial capture failed at the broker's unsupported
solo clock/warp flag; its `--real` rerun passes. Both successful manifests record clean, unchanged worker trees:
`1794686847905-85681` (look), `1794686898446-88877` (T1 bot), under `.look/evidence/`.

The remaining candidates have not been individually visually judged; real-time smoothness is unverified.
No ROM data was added. Not tested on a device.
