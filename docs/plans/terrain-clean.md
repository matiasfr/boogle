# Terrain clean: no cliff ledges, clean walkable ground, then custom meshes

_Plan, 14 November 2026. Part 1 approved, in progress; Parts 2 and 3 not started. Original survey measured on main at `b2157fb6b`; every still was taken under load
(1-minute load 16 to 34), so stills are evidence of shape and colour only, not of timing, shimmer or motion. Not tested
on a device._

> **Owner, 14 November 2026:** "I don't need to look at the terrain. I think your instincts are right. We don't need
> complex geometry for the unwalkable part. We should just do a pass on geometry and make sure it looks clean,
> especially for the part that can be walked. And then we should consider creating custom meshes to dress the world."
> Earlier the same day: "the trail could have basically more of a distinction between the path, and the geometry can
> be more intentional. For example, when you're going up the canyon path, it's the same texture and color as the sides
> of the valley wall, but it should be more clearly looking like a path."

This supersedes, in part, his 10 November answer "denser triangles only on unwalkable cells"
([terrain-pass](terrain-pass.md#owners-answers-10-november)). The rest of that entry stands: grass to the beach, rock
only on real cliffs, subtle layers, a cliff kit next.

## Goal

Home's ground is the collider's own 2 m triangles everywhere, with the rock look carried by the material; walkable
ground, paths first, is made to look clean and deliberate; and the owner gets a one-page proposal for custom meshes
that dress the world. It serves **Show, don't tell** (DESIGN 11: a path that reads as a path says where to go) and
**Small and readable** (about 1,000 lines of ledge, keep-list and cap code go). No principle is bent. No new mechanic.

**Research:** [stylized-terrain](../research/stylized-terrain.md) (used: "a finer height grid cannot provide those
forms"; its smooth heightfield plus a small authored cliff kit is Part 3), [terrain-texturing](../research/terrain-texturing.md)
(used: explicit grass, rock, sand and path families; "fix normal continuity before adding triangles"),
[terrain-art](../research/terrain-art.md) (used: structure before surface detail; a bounded kit where cliffs need
faces and broken silhouettes). Departs from none.

## Design

- **Sync kind: Local, all of it.** Drawn geometry, one material, one static heightfield built identically on every
  client from the same build. No ops, no state key, no wire shape, no `WORLD_NS` bump, no controls.
- **Authority:** `src/place/terrain.ts` stays the one source of heights (collider, `H`, `surfaceHeight`, shore bake,
  tree catalog, level-check, grounding audit). Part 1 and Part 2a never write it. Part 2b changes it on purpose and
  says so with level findings.
- **Cosmetic:** everything in Part 1 and 2a.
- **Architecture call (agents', logged here):** the pass graduates out of `src/proto/`. It is Home's default ground
  and `src/place/land.ts` imports it, so it is no longer a prototype. What is kept moves to `src/place/`; the wedge
  variants (`?terrain=wedge|a|b|ab`, `terrainSub`, `terrainMat`) are answered prototypes and are archived by tag
  (`archive/terrain-pass-wedge`) and removed, per "Prototypes are temporary". `?terrain=0` (the old `groundMaterial()`)
  stays for now as the one before/after switch; removing it with `groundMaterial()` is a P3 leftover.

## Part 1: remove the geometric cliff ledges

**Models:** steps 1 to 4, implementation of an approved plan: Codex `gpt-6.1-sol` medium. Proofs at the checkpoint,
runner: Codex `gpt-6.1-sol` medium. Visual review of the checkpoint stills: a fresh general-purpose subagent, fable
medium. No independent review is triggered (nothing under `src/sim`, `src/net`, `src/world`, `server/`).

**Goes with the ledges**

| What | Where | Why it existed |
| --- | --- | --- |
| 1 m cells: 3,619 cells, 12,480 new vertices, 1,995 moved grid vertices, +21,714 triangles | `src/proto/terrain-pass/island.ts` (`buildIslandSurface`, `steepCell`), `home.ts` (index and buffer rewrite) | the ledges |
| The keep list: 3,413 keeps, `GROUND_KEEPS`, `protectionAt`, `KEEP_MARGIN`, `KEEP_REACH` | `island.ts`, `placements.ts` (130 lines of catalog footprints) | to stop ledges moving ground under placed things |
| `GRADED` and its three `push` calls | `src/place/terrain.ts` lines 118 to 127, 171, 396 | a record only the keep list read |
| The contact cap: `CONTACT`, `capNearWalkable`, `?terrainCap=0` | `island.ts`, `home.ts` | to hold ledges near where a body stands |
| The cell-size split and its T-junctions (a 1 m midpoint held on a 2 m neighbour's straight edge) | `island.ts` `free()` | crack avoidance between 1 m and 2 m cells |
| The far ground's mixed cells: `NearGround`, the `near` parameter, the `wedgeDraws` skip | `src/place/far-ground.ts`, `land.ts` | far tiles had to draw or skip 1 m cells |
| Ledge maths: `ledge`, `ledgeOffset`, `drawnHeight`, `smoothHeight`, `TOLERANCE`, `KEEPS`, `protection`, `edgeFade`, `WEDGE`, `buildWedgeSurface`, `buildSteepSurface` | `surface.ts` | ledges and the wedge rounds |
| Wedge variants and their materials: `applyTerrainPass`, `bandsMaterial`, `coveLayersMaterial` | `index.ts`, `materials.ts` | rounds one and two |
| Tools and tests of the ledges | `dev/terrain-pass/{prove,drawn,contact,contact-shots,shots,setup}.ts`, `test/terrain-pass-island.test.ts` (9 tests) | proofs of a tolerance that no longer exists |

**Stays, unchanged in look**

- The material: `roundTwoMaterial(true)`: grass to a per-pixel beach line, rock only where the collider is unwalkable
  (or the broad slope is), beds, seams and the cove's rock tile. Beds and seams are per pixel from world height
  (`STRATA` 2.4 m), so they do not need the ledges.
- Its per-vertex inputs (`steep`, `foot`, `soil`, `gorge`, packed as one vec4), now computed only for the land's own
  vertices.
- The paths (`src/place/path-field.ts`, `path-surface.ts`), the cove's layers, the far ground's tiles.
- Every height: `terrain.ts`'s `heights`, the collider tiles, `H`.

**Expected change.** Ground triangles 263,550 to 241,836 (minus 21,714, the pre-pass count); vertices minus 12,480;
in a frame minus 4,154 to minus 12,324 at the bench poses (the 14 November table, reversed); draws and textures
unchanged; about 0.15 s less work at load (`buildMs` 157 today). Frame time: the post-merge look attributed about
0.5 ms of scene pass on the M1 Max to the ledges; expect to get about that back, to be confirmed by one bench run at
the checkpoint, reported, not gated. Visible change expected: almost none (owner stills `gorge-wall-capped.png` and
`gorge-wall-uncapped.png` are indistinguishable, and both already show mostly 2 m facets).

**How "nothing a player stands on moves" is proved.** After Part 1 the drawn ground is the collider's own triangles
by construction, so the proof is that heights did not change and that the drawn mesh is those heights:

1. **Heights hash.** New `dev/ground/heights-hash.ts` (about 15 lines): prints the sha256 of `heights` and of every
   `terrainCollisionTiles()` tile. Run on main before step 1 and after each step: identical.
2. **Level-check diff.** `npm run level-check` output before and after, compared with the `Source:` and timing lines
   removed: identical, including `production grounding: 5266 placements, 0 problems (5 cm tolerance)`,
   `timber against track: ... 0 problems` and `place: ok`. Baseline taken for this plan: exit 0, 13 reports.
3. **Census of static bodies against drawn ground**, in the running game, at the checkpoint:
   `npm run look -- --eval dev/ground/census.ts --query dev=1` (moved from `dev/terrain-pass/census.ts`). On 14
   November it found 805 static bodies, 607 with their base on the terrain, none more than 5 cm off. After Part 1 its
   `TERRAIN_CENSUS` line preserves the body report and adds unrounded footing and walkable-grid worst gaps, their
   locations and counts over 1 cm. Per the owner's follow-up, the worst after removal must be no larger than before;
   where the contact cap used to apply the drawn surface should equal the collider to float precision.
4. **Counts.** The page's ground triangle count is 241,836 and the `TERRAIN_PASS` console line is gone.

### Steps

- [x] **0. Independent drawn-ground proof (owner-authorized departure, 14 November).**
  `dev/ground/drawn.ts` reads the actual built render mesh's position and index buffers, transformed into world
  coordinates, plus both rendered cove kit meshes. It never imports or reconstructs the ledge recipe. The census
  requires `graphics=farGround:false` and asserts that the sampled full-resolution Home mesh is visible: distant
  simplified LOD is deliberately outside this contact proof. Collider heights come independently from the actual
  `terrainCollisionTiles()` heightfield arrays (including their closed boundary), composed with the cove kit's shared
  collider triangle query. `surfaceHeight` was trialled but uses an outside fallback at the grid's outermost edge.
  The tool samples terrain-grounded static shapes' projected footings and 1 m around them at 0.5 m spacing, plus a
  regular 0.5 m lattice over Home's walkable surface. No gap floor or rounding hides discrepancies; reports retain
  `bodies`, `shapes`, `grounded`, `misses` and `worst`, with `footing`, `grid`, triangle and vertex counts added.
  Baseline game source is exactly local `origin/main` `22b331dba` (`git diff origin/main -- src` empty): 805 bodies,
  2,018 shapes, 612 terrain-grounded; 97,399 footing samples, worst **0.000001787839970290861 m** at world
  (961.0125037718327, -219.1128101434796), none over 1 cm. Grid: 1,633,313 samples, worst
  **0.25000011920928955 m** at (899, -177), 41 over 1 cm. Ground: 263,550 triangles, 134,980 vertices.
  The grounded count differs from the old 607 because this reference includes the physical cove kit.
  Baseline census evidence: `.look/evidence/1794681188591-58295/evidence.json`; load 20.57 to 17.69.
  Four before stills (cameras 0, 2, 9, 5) opened; loads 14.28 to 27.81. Baseline cove render: 266 calls,
  178 shadow calls, 652,455 frame triangles (`.look/evidence/1794681305151-60481/evidence.json`).
  `node dev/ship-check.ts`: pass. Heights and five collision-tile hashes saved before any ground changes;
  baseline level-check passes with 5,266 placements, zero problems and 13 reports.
- [ ] **1. Move what stays to `src/place/`, no behaviour change.**
  - Create `src/place/ground-layers.ts` (pure, no three.js) with `colliderHeight`, `colliderNy`, `vertexNy`,
    `steepness`, `describeGround` and `STRATA`, moved verbatim from `src/proto/terrain-pass/surface.ts`.
  - Create `src/place/ground-material.ts` with `homeGroundMaterial()`: `roundTwoMaterial` from `materials.ts` with the
    `whole` branch only (no wedge fade, no `inside` mix). Rename the attribute `tpLayers` to `groundLayers`.
  - `dev/terrain-pass/path-ground.ts`, `paths-shots.ts`, `paths-setup.ts` and `census.ts` move to `dev/ground/` with
    their imports repointed; add `dev/ground/heights-hash.ts`.
  - Verify: `node dev/ship-check.ts`; heights hash equal to main.
- [ ] **2. The land draws its own grid.**
  - `src/place/land.ts`: replace `applyHomePass(geo, mainEnd, inCove)` with a local `addGroundLayers(geo)` that packs
    `steep, foot, soil, gorge` for every existing vertex (grid vertices from `describeGround(cellX(i), cellZ(j))`, the
    cove patch's vertices described where they stand, offshore rings `0, 1, 1, 0`, `gorge` as `home.ts` computes it
    today). The index is left as `buildMesh` made it. Remove `homePassOn`, `applyTerrainPass`, `wedgeDraws`; the pass
    is on when `LOOK.ground` and `?terrain` is not `0`. Call `addFarGround(mesh, NX, NZ, mainEnd, inCove, owner)`.
  - `src/place/far-ground.ts`: delete `NearGround`, the `near` parameter and the code that reads it (and anything in
    `far-ground-index.ts` only it used); `test/far-ground-index.test.ts` stays green.
  - Delete `src/proto/terrain-pass/` (tag the parent commit `archive/terrain-pass-wedge` first, local tag, pushed with
    the ship), `test/terrain-pass-island.test.ts`, and `dev/terrain-pass/`.
  - Verify: `node dev/ship-check.ts`; heights hash equal; `grep -r "terrain-pass\|terrainCap\|NearGround" src dev test`
    finds nothing.
- [ ] **3. Remove `GRADED` from `src/place/terrain.ts`** (the constant and three `push` lines; nothing else). Its own
  small commit, last, because four branches in flight touch this file. Verify: heights hash equal; `npm run level-check`
  diff empty.
- [ ] **4. Docs.** `docs/game-design/graphics.md`: rewrite the "Home's ground: the terrain pass" bullet (no 1 m cells,
  no tolerance sentence, flags reduced to `?terrain=0`). `docs/plans/terrain-pass.md`: status line points here.
  `docs/decisions-look.md`: a dated entry with the owner's words above, its Current rules line, and an italic note on
  the 10 November "density only where it's steep" line. `dev/decisions/topics.ts`: `'plans/terrain-clean.md': 'look'`.
  Verify: `npm run decisions`.

**Checkpoint A (end of Part 1), four proofs, run once:** the level-check diff; the census; one bench run
(`npm run bench -- --no-load --poses spawn,town,far,bay`, counts exact, times reported with the load they were taken
under); one proof look, `dev/ground/paths-shots.ts` cameras 0, 2, 9 and 5 beside the owner's stills in
`/Users/matiasfranco/Developer/boogle/.look/owner/terrain-pass-1114/`, opened by the visual reviewer, who names any
wall that reads worse without ledges. One ship for steps 1 to 4.

## Part 2: geometry clean-up, walkable ground first

**Models:** view-only steps, player-visible implementation: implementer agent, fable medium. Heights steps in
`src/place/terrain.ts` and `src/entities/ring-island/ground.ts`: the same row (look and layout work, not sim or
world), with the designer agent (fable medium) ruling on the level findings below before the build. Visual review of
each checkpoint: a fresh general-purpose subagent, fable medium. Proof runs: Codex `gpt-6.1-sol` medium.

### Survey (14 November, main `b2157fb6b`)

Tools run: `npm run level-check` (ok), `node dev/terrain-pass/path-ground.ts` (20 stretches where the tread is not
level across its width), `node dev/terrain-pass/prove.ts home`, a scratch crease count over the collider grid, a
12-camera shot list at Home and five `ringview` looks on Ring Island. Stills are in this plan's worktree and are lost
when it is removed: `H` is `/Users/matiasfranco/Developer/boogle-codex/plan-terrain-clean/.look/shots/terrain-clean-survey/group-0`,
`R` is `/Users/matiasfranco/Developer/boogle-codex/plan-terrain-clean/.look`, `O` is the owner folder above.

Numbers: 36,866 land cells, 33,351 walkable, 3,515 with an unwalkable face. Between adjacent walkable faces on path
treads (1,055 cells): 317 creases over 10 degrees, 160 over 20, 84 over 30. Off the paths: 5,577, 2,682 and 1,422.

| # | Rank | Where | What looks unclean | Still | Fix | Kind |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 | Canyon path and every gorge bench | The tread and the wall are still one hue family: tread about (200, 170, 125), wall about (215, 160, 95). The owner's note is half answered: risers and an edge exist, the colour gap does not. | `H/c0-v0.png`, `O/canyon-path.png` | 2a step 1 | view |
| 2 | P1 | Canyon path, wall side | From above the tread ends in a 2 m sawtooth wherever a wall facet starts, with green slivers of grass between tread and rock. The edge is the triangles', not the path's. | `H/c1-v0.png` | 2a step 2 | view |
| 3 | P1 | Quarry path in the gorge, (-71, 139) to (-49, 148) and (-19, 117) to (5, 155) | Steep facets cross the tread, grass tongues hang on the wall, the path is not there to walk on: level width 0.0 m of 3.8 m at (-60, 148), cross fall 2.87 m. | `H/c9-v0.png` | 2b step 6 | heights |
| 4 | P2 | Bold path benches (canyon climb, west descent, top of the climb) | Treads fold: level width 1.5 to 3.5 m of 6 m, cross fall up to 1.4 m; risers kink at each fold. | `H/c0-v0.png`, `O/tp-walk-canyon-motion.png` | 2b step 5 | heights |
| 5 | P2 | Canyon tread near world (951, -103) | The dotted line. It is there with `?terrain=0` too (`R/terrain-clean/dots0-crop.png` against `R/terrain-clean/c2-crop.png`), so it is not the ledges or their T-junctions. Most likely cause (read from the stills and the shader, not isolated): a thin steep facet at the tread's uphill crease is refused by the tread's facet test and painted grass, and seen edge-on it rasterises as dots. | the two crops | 2a step 2; gone for good with 2b step 5 | view, then heights |
| 6 | P2 | South shore by the gorge mouth | A hard vertical seam where beach sand meets the gorge's grey-green bank; blocky tan rock patches on the walkable coast slope (the broad-slope rule at 2 m). | `H/c7-v0.png` | 2a step 3 | view |
| 7 | P2 | Ring Island footbridge, abutment a | Ground stands through the deck's uphill edge for 3 m; the abutment shows as a slab. | `R/tc-ring-bridge-still.png` | 2b step 7 | heights (Ring) |
| 8 | P2 | Grass band between the canyon bench and the river | Single rock triangles poke through the grass; the grass and bank border is a 2 m zigzag. | `H/c1-v0.png` | 2a step 3 | view |
| 9 | P3 | Path climbs on open ground | Risers waver and kink at path bends. | `H/c6-v0.png` | leftover (bake the riser phase along a smoothed centre line) | view |
| 10 | P3 | Gorge rims at distance; Ring Island cutting rim | 2 m teeth along the rim. | `H/c11-v0.png`, `R/tc-ring-ramp-still.png` | Part 3 (rim pieces) | meshes |
| 11 | P3 | Gorge walls | Serrated lines along long sliver edges, with and without the pass (`R/shots/terrain-clean-dots/group-0/c1-v0.png`): edge-on slivers of the 2 m mesh, not T-junctions. The one-frame dark hairline was not reproduced in stills. | `R/terrain-clean/c1-crop.png` | recheck in checkpoint A's stills and, if a hairline is suspected, one real-time clip on a quiet machine; Part 3 covers the worst walls | view |
| 12 | P3 | The Round | Blocks and the green's slab sit level and clean from these angles; no pasted pad found. By numbers the Round's pad has 1.5 m of change within 4 m of its edge; the pads beside the gorge (timber camp, (13, -126), (27, -137), (32, -144)) have 8 to 26 m. A room's door block stands on a dark slab with a fringe at its foot. | `H/c4-v0.png`, `H/c5-v0.png` | none now; retaining walls in Part 3 for gorge-side pads | meshes |
| 13 | P3 | Shore path under the greybox ramp | Two greybox posts stand in the tread. | `H/c8-v0.png` | passed to the greybox route's owner; not terrain | placement |
| 14 | P3 | Ring Island | One slate colour, pleated cutting walls, the path a cream strip: blockout by design ("Mechanisms, then systems, then the full greybox, then details"). | `R/tc-ring-halt-still.png` | none now; surface as data when the island's landform step lands | view |
| 15 | P3 | Lawns | Faint 2 m diamonds in grass lighting (known since round one; weak at `H/c5`). | `H/c5-v0.png` | leftover (normals from the smooth surface, lighting only) | view |

Town paths on level ground (`H/c3-v0.png`, `H/c4-v0.png`) read clean: no finding.

### 2a. View-only fixes, in order (no height moves; heights hash stays equal)

- [ ] **1. The path is a different material from the rock (finding 1).** `src/place/path-surface.ts`: lift the
  pigments into one exported `PATH_PIGMENT` record and move the earth away from the rock's hue and value: a cooler,
  darker packed earth (start: edge `#6e5f50`, middle `#93836f`, cut `#4b3c30`, timber `#5f4630`; today `#8f6f4a`,
  `#a98a5f`, `#5e4833`, `#6f5236`). Keep the lighter middle, mottle and grit. Capture two candidates on the three
  canyon cameras (the start values, and a paler gravel `#8d8a80` to `#aaa598`) as one sheet; the visual reviewer picks
  the one that separates best from both rock and grass under Fresh, logged in `docs/agent-calls.md`. Verify: from the
  still, report the mean tread and mean wall colours; the tread is darker and greyer than the wall (target: at least
  30 of 255 apart in value, and visibly less orange); grass and tread still differ at `H/c3`'s framing.
- [ ] **2. The tread's edge is the path's, not the triangles' (findings 2 and 5).** `path-surface.ts`:
  - Replace the facet test `ground = smoothstep(0.5, 0.66, facetUp)` in `tread` with a bench test from the field's own
    height: `bench = (1 - smoothstep(0.6, 0.9, p.y - along)) * (1 - smoothstep(0.9, 1.2, along - p.y))`. A wall rising
    off the bench then cuts the tread on one continuous line about 0.6 m up its foot, and a small steep facet inside
    the tread no longer drops out.
  - Within 1.2 m outside the tread's edge, ground that fails the bench test is painted the cut's dark earth (`soil`),
    not whatever is underneath: the bank at a wall's foot reads as cut earth, never grass slivers.
  - Stones, verge and painted bank keep their rules, with `ground` replaced by `bench`.
  - Verify: `H/c1`'s camera from above shows one line on the wall side, no green between tread and rock; the dotted
    line at (951, -103) is gone at `c2`'s crop; `test/path-field.test.ts` green (the field is unchanged).
- [ ] **3. Shore and rock borders (findings 6 and 8).** `src/place/ground-material.ts`: (a) the gorge-floor mask
  takes a per-pixel wander and a wider blend so sand meets bank over 6 to 8 m, not on a 2 m vertex line; (b) the
  broad-slope rock rule (`broad`) applies only where the interpolated vertex `steep` input is above 0.05, that is on triangles that
  touch truly unwalkable rock, so lone tan patches on walkable coast slope and lone rock triangles in grass go. Verify: `H/c7` and
  `H/c1` cameras; the far camera (paths-shots 7) shows no new patches.

**Checkpoint B (end of 2a):** one proof look (canyon walking up, from above, across the valley, shore, town), opened
by the visual reviewer against the owner's sentence; heights hash equal; one ship. Update the paths bullet in
`docs/game-design/graphics.md`.

### 2b. Height changes, each its own step with its level findings

These move the collider, `H`, the tree catalog and level-check, under "Place for the look, not the cost; terrain may
change". Each runs `npm run level-check`, `node dev/ground/path-ground.ts` and the tests that import `terrain.ts`
(`round-grounding`, `town-plan`, `path-refuge`, `home-station`, `roundhouse-yard`, `coast-regions`, `works-shape`,
`railway-works-layout`, `far-head-show`) before it is called done, and rebases on the Round and rotunda branches,
which also edit `terrain.ts`.

- [ ] **5. Benches level across the whole tread (finding 4; closes 5).** Cause, measured: `strip()` levels vertices
  within `inner` of the centre line, but `inner` (3.6 m bold, 2.4 m plain) is barely wider than the tread (3 m,
  1.9 m), so a triangle with one corner on the bench and one 2 m further up the wall folds into the tread. Fix, in
  `terrain.ts` where `PATHS` and `SHORE_SAMPLES` are graded: `inner` = tread half width plus one cell diagonal
  (5.9 m bold, 4.8 m plain), `outer` = `inner` + 2.9 (8.8 m, 7.7 m). Trialled for this plan: see Level findings.
- [ ] **6. The quarry path's benches (finding 3).** Step 5 does not fix it: at (-60, 148) the cross fall stays
  2.87 m (something later regrades or skips those cells; the implementer finds which before changing anything, most
  likely a `skip` or a later pad). Then cut a 4 m bench on both gorge descents, with a 6 m level landing at the turn
  near (-10, 150), as [terrain-pass](terrain-pass.md#ground-that-needs-real-reshaping-proposals-for-a-later-ground-step-not-done-here)
  proposed. The shore path's ramp (-177, 27) to (-153, 33) is in the cove's fine patch and is unchanged by step 5: it
  goes with this step.
- [ ] **7. Ring Island footbridge, abutment a (finding 7).** `src/entities/ring-island/ground.ts`: cap the ground
  under the deck's footprint plus 0.5 m, for the first 4 m from abutment a, at the deck's underside less 0.1 m (the
  same kind of cap the loop deck already has), so nothing stands through the deck; the abutment beam then reads as a
  wall under the deck's end. Verify: `test/ring-island-ground.test.ts`, the ring report in `npm run level-check`
  (today: `abutment cut 0.045 m`, `ring (planned): ok`; the cut figure will rise by the cap's depth, and the report's
  0.1 m threshold in the summit-path test needs the designer's word), `ringview=bridge` and `ringview=deck` stills.

**Checkpoint C (end of 2b):** level-check, the census, `ring-island-walk` once, one proof look per step, one ship per
step or one for all three if they are ready together.

## Part 3: custom meshes to dress the world (proposal, not a commitment)

**Models if he says yes:** previz, Codex `gpt-6.1-sol` medium (only Codex paints); modelling and placement,
player-visible implementation: implementer agent, fable medium, following the asset-author skill; visual review, a
fresh subagent, fable medium.

**Why.** The heightfield cannot make a cliff face, a broken rim or an edge to a path: the data has no more shape
(findings 10, 11, 12). Research has said the same since 2 November. The material now does what a material can.

**The five pieces that would do the most**, one kit, one Blender recipe (`assets/src/terrain-kit.py`, one object per
piece, one shared material, as `place-kit.py` does):

| Piece | What it fixes | Size, rough triangles |
| --- | --- | --- |
| 1. Strata rock face, two widths, and a rim cap | cliff silhouettes: breaks the 2 m teeth at gorge rims and covers the worst sliver walls | 6 and 10 m wide, 400 to 900 |
| 2. Boulders, three sizes | cliff feet, path bends, pad corners; hides where facets meet badly | 0.8 to 3 m, 80 to 250 |
| 3. Path edging: a dry-stone retaining wall segment and a timber kerb with a real step riser | the uphill side of every bench and the gorge-side pads; real risers where the painted ones are today | 4 m, 150 to 300 |
| 4. Shoreline rocks, low and dark at the waterline | where beach meets cliff and at the gorge mouth | 1 to 4 m, 100 to 300 |
| 5. Bridge abutment cheek | Ring Island's footbridge and Home's two footbridges | 3 m, 100 |

**How they fit the prefab records** ([prefab-data](prefab-data.md)): each piece is one `definePrefab` in a new
`src/content/prefabs/terrain.ts` (`terrain.rock-face-6`, `terrain.boulder-m`, ...), with
`visual: { asset: 'terrain-kit', node: '<piece>' }`, a `batch` name so placements of one piece share one instanced
mesh, colliders in the record (`box` for walls, kerbs and cheeks, `sphere` or `trimesh` for boulders and faces: what
looks solid is solid), `scope: 'place'`, and a material name that reuses the ground's rock pigments so piece and
cliff are one rock. Placements are a `src/content/levels/home-dressing.ts` level file, generated along rim and path
lines by helpers and compiled to `content/built/levels/`. The asset-author steps apply as written: previz from a real
game screenshot, front, side and back sheets, a parametric recipe, `npm run assets -- terrain-kit`, built-GLB
inspection, staging against Buddy, at most two repairs. Each piece gets an asset viewer entry (owner, 11 November).

**Where first:** one wedge, the canyon climb, Place-local (-42, -88) to (-61, -121): about 40 m of path, both walls,
the river bank below. It is the owner's own example and has every case (rim, face, bench edge, bank).

**Cost, rough, to report not to gate:** one GLB under 500 KB; five to eight instanced draws; about 15,000 to 30,000
triangles on the wedge; colliders add static shapes near the path, so `npm run level-check` runs on the placements and
its findings go to the designer with the build plan (a kerb or boulder must not narrow the tread below 3 m or make a
new way up a wall). Authoring: one previz round, then about one piece a session.

**How the owner picks:** (1) a previz sheet of the canyon wedge from two directions, painted over real stills, two
styles (chunky Sunshine blocks; quieter Odyssey strata); (2) the chosen kit placed on the wedge in the live game, no
flag, with matched before and after stills and a walk clip. He judges the wedge, then says where next.

**Not in this proposal:** climbing, breakable rocks, anything a player uses. Pieces are scenery with colliders.

**Reference:** [small-magic-look](../research/small-magic-look.md) (owner's look reference, 14 November): what makes a code-drawn meadow's ground and vegetation read well, and three flagged experiments for a lawn wedge.

**Open questions for Part 3 (recommended answer first)**

1. Start the kit after Part 2a ships? **Yes**: the path and material are settled first, so the kit is judged against
   the final ground.
2. Which style? **Chunky Sunshine blocks**, picked from the previz sheet; it matches the strata beds already drawn.
3. First place? **The canyon climb wedge**, then the gorge rims seen from the village.
4. Real step risers (geometry with colliders) or keep painted ones? **Keep painted risers** on the heightfield and
   use the timber kerb only at edges: real steps change how the climb walks and belong to a feel pass.
5. Does Ring Island get pieces now? **No**: it is still blockout; only the abutment cheek, when its bridge is dressed.

## Level findings

`npm run level-check` on main `b2157fb6b`: exit 0, 13 reports; `place: ok`; `ring (planned): ok`; production
grounding 5,266 placements, 0 problems; service walkways 0 ledges over 0.3 m; "accepted stack: reached early" is the
one standing early reach.

**Part 1 and 2a place and move nothing**: no findings; the diff must be empty.

**Step 5, trialled** (the two `strip` calls changed locally to 5.9/8.8 and 4.8/7.7, level-check and the path survey
run, then reverted; the unit tests were not run on the trial):

1. level-check still exits 0; every progression assertion passes; `place: ok`.
2. Production grounding checks 5,251 placements, not 5,266: the tree catalog drops 12 trees (362 to 350) whose
   ground the wider benches clear; the other 3 were not identified and the implementer names them. 0 problems.
3. Timber against track counts 2,303 pieces, not 2,304: one rail, sleeper or plank is no longer counted. 0 problems,
   but the implementer names the piece.
4. **Second jump:** the walking flood gains 445 cells from a 3 m hop, not 422 (1.8k m², was 1.7k). 23 more cells of
   gorge wall or shore become reachable with the second jump. No secret, pad or gate changes state in the report
   ("the first device pillar: under it, or by it" and the rest read the same), and Far Head stays unreachable. The
   designer rules on whether 23 cells matter; recommended: accept.
5. Nothing becomes reachable before its ability: the "At the start" list is identical (balcony still needs the
   glider; stack still the one accepted early reach).
6. Paths: stretches where the tread is not level across fall from 20 to 9; the canyon climb's cross fall at
   (-56, -112) goes from 1.25 m to 0.14 m, the foot at (-61, -80) from 1.36 m to 0.12 m. Left: the quarry path
   (2.87 m at (-60, 148)), the shore ramp, the bend at (-80, -166) (0.66 m), and short stretches at path ends.

**Step 6 (quarry benches) and step 7 (Ring footbridge cap)** were not trialled: their positions are named above and
each must bring its own level-check diff to the designer before it is built. Expected for step 6: more trees cleared
on the gorge walls and a wider second-jump flood in the gorge; for step 7: the ring report's abutment cut rises above
its 0.1 m expectation.

## Risks

- **Room safety:** nothing from "Don't" applies; no apply, effect, presence, transport or save path is touched.
- **Hotspots:** `src/place/terrain.ts` is edited by `codex/running-side-fix`, `v45/running-side`, `v45/rotunda`,
  `codex/rotunda-checkpoint-a`, `codex/rotunda-1a` and `codex/round-blockout-b1`. Step 3 is three deleted lines and a
  constant; steps 5 and 6 change two call sites. `src/place/land.ts` is edited by Part 1 step 2 only.
- **A hidden reader of `GRADED` or the keep list** on a branch: grep in-flight branches before step 3.
- **Walls may read flatter without ledges** on a few faces the stills did not cover; the visual reviewer names them at
  checkpoint A and they become Part 3's first placements, not a reason to keep the ledges.
- **Step 5 widens every path's cut**, on level ground too: a pad or prop within 6 to 9 m of a path centre line now
  sits on re-graded ground. The grounding audit found 0 problems on the trial; the Round's and the rotunda's pads are
  graded after or beside paths and need rechecking on rebase.
- **Mixed builds:** none; clients on an old build draw the same collider. Steps 5 to 7 change colliders: development
  phase, no compatibility code. No `WORLD_NS` bump: heights are not saved state. A saved pose on a regraded bench
  restores through the existing ground snap.
- **Performance:** Part 1 removes triangles and load work; 2a adds a few ALU operations per ground pixel and no
  texture reads; Part 3's cost is in its section. Measured and reported at checkpoints, not gated
  ([owner call](../../docs/agents/owner-calls.md#performance-guides-not-gates)).

## Open questions

For the owner (recommended answer first):

1. **Level the benches by widening every path's graded strip (step 5)?** **Yes.** It costs 12 trees beside paths and
   lets the second jump reach 23 more cells of wall and shore; nothing is reachable earlier than its ability.
2. **Path colour:** cooler, darker packed earth, or pale gravel? **Packed earth**, chosen by the visual reviewer from
   a two-candidate sheet and logged; say so if you would rather pick.
3. **Custom meshes:** start the kit on the canyon wedge after the path and shore fixes ship? **Yes**, previz first.

Not for the owner (logged calls): the pass leaves `src/proto/`; the wedge variants are archived by tag;
`?terrain=0` stays one more round; findings 9, 11, 13, 14 and 15 stay written down as P3.

## Design review (designer, 2026-11-14)

Parts 2 and 3 only; Part 1 is being built and was not reviewed. Read: DESIGN.md, the look, rail and core-loop Current
rules, the owner calls named below, [level-design](../research/level-design.md),
[route-contract](../research/route-contract.md), [progression-flow-layout](../research/progression-flow-layout.md) and
the three terrain research docs the plan cites. Looked at: the survey stills `canyon-tread-hue.png`,
`tread-sawtooth-edge.png` and `quarry-path-no-tread.png`. Ran: `npm run level-check` on main (`22b331dba`): exit 0,
422 second-jump cells, as the plan says; and two read-only scripts over `tree-catalog.ts`, `terrain.ts` and
`tech-layout.ts` (the tree and pad tables below). **Not done:** the step 5 trial was not repeated (this review may not
edit game source), so the plan's trial numbers are the planner's, unverified here; no new stills were taken.

**Owner, 14 November 2026**, asked the plan's three questions with the recommendations: "I'll take your
recommendations above." Recorded in [decisions-look](../decisions-look.md#d-2026-11-14-terrain-clean-three-recommendations-accepted).
Bench levelling, packed earth and the kit's start are therefore decided. He accepted the recommendations, not the
details; those are ruled here. He also shared a look reference for terrain and vegetation that day
(https://patch.gg/games/blendi/small-magic/source); its research note (`docs/research/small-magic-look.md`, being
written separately, not reviewed here) is an input to Part 3's previz.

No route, gate, beat or travel edge is added or moved by these parts, so there is no leg table: the flow checks that
apply are rule 1 (the path as the thing that says where to go) and rule 2 (a gate keeps its meaning), both below.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Unwalkable ground needs no complex geometry; clean walkable ground first | Decided | [look, 14 November](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first) |
| 2 | The path must read as a path, not as the valley wall (steps 1 and 2) | Decided | the owner's words in that entry's plan quote; DESIGN 11 |
| 3 | Benches are levelled by widening each path's graded strip (step 5) | Decided | [look, 14 November answers](../decisions-look.md#d-2026-11-14-terrain-clean-three-recommendations-accepted), question 1 |
| 4 | The path is a cooler, darker packed earth, not pale gravel | Decided | same entry, question 2 |
| 5 | The kit starts on the canyon wedge once the path and shore fixes ship, previz first | Decided | same entry, question 3 |
| 6 | Rock only where the ground is truly unwalkable; lone rock patches on walkable slope go (step 3b) | Decided | [terrain pass, 10 November](../decisions-look.md#d-2026-11-10-terrain-pass-grass-to-the-beach): "rock only on real cliffs" |
| 7 | Heights may move for the look, with level findings | Decided | owner call "Place for the look, not the cost; terrain may change" |
| 8 | Nothing may be reached before its ability; the second jump stays after station 3 | Decided | [loop orders, 9 November](../decisions-core-loop.md#d-2026-11-09-loop-orders); the trial's "At the start" list is identical |
| 9 | Previz from a real still before modelling; our own recipe; an asset viewer entry per piece | Decided | owner calls "Previz before modelling", "Our own assets first", "Show new machines and models in the asset viewer" |
| 10 | Ring Island's summit path is the footbridge, so its abutment is worth cleaning (step 7) | Decided | [rail, 14 November](../decisions-rail.md#d-2026-11-14-summit-path-recommendations-accepted) |
| 11 | The kit's cost is reported, not gated | Decided | owner calls "No limits ahead of a measured problem", "Performance guides, it doesn't gate" |
| 12 | Every survey finding keeps its rank and stays written down | Decided | owner call "Rank every note" |
| 13 | The exact pigment: the plan's start values, with a grass-side number added | Default | finding 5 |
| 14 | The tread's edge comes from the path's own height; a 1.2 m band of cut earth at a wall's foot, never grass slivers | Default | agree: it is the "more intentional" edge he asked for; the painted tread keeps today's width (finding 4) |
| 15 | Sand meets the gorge bank over 6 to 8 m with a wander | Default | agree; a P2 look fix, cheap to retune |
| 16 | Strip widths: level to 5.9 m (bold) and 4.8 m (plain), fading by 8.8 m and 7.7 m | Default | agree for the level width; the cleared and painted widths are separate questions (findings 2 and 4) |
| 17 | Order: pigment, edge, shore borders; then benches, quarry benches, Ring cap | Default | agree, with one change: step 6's trial is run beside step 5's (finding 7) |
| 18 | Ring footbridge cap: deck footprint plus 0.5 m, first 4 m, 0.1 m under the deck | Default | agree. The 0.1 m expectation is kept where a player feels it: the step onto the deck at the walk-on line stays at or under 0.1 m. The cut under the deck may be as deep as the cap needs; report it as its own figure |
| 19 | Painted risers stay; the timber kerb is used only at edges | Default | agree: real steps change how the climb walks and belong to a feel pass ("Feel first") |
| 20 | No kit pieces on Ring Island now, except the abutment cheek when its bridge is dressed | Default | agree: it is still blockout ("Block out spacing first, details later") |
| 21 | How he picks: a two-style previz of the wedge from two directions, then the chosen kit live on the wedge with matched stills and a walk clip | Default | agree; add the Small Magic note as a third input to the sheet, and let him pick the style from the sheet (the plan's "chunky Sunshine blocks" is only the planner's lean) |
| 22 | Second place for the kit: the gorge rims seen from the village | Default | agree, his to redirect after the wedge |
| 23 | Findings 9, 11, 13, 14 and 15 stay P3 leftovers | Default | agree; 13 (greybox posts in the shore tread) is passed on, not dropped |
| 24 | Which trees step 5 removes, and that the starter tree catalog changes | New | finding 1 and 2: the loss is acceptable and none must be kept; name them, count the shore ones, say what happens to saves |
| 25 | The second jump reaches 23 more cells | New | finding 3: accept, on three stated checks |
| 26 | The quarry path gets a 4 m bench on both gorge descents and a 6 m landing at the turn (step 6) | New | go ahead: it is the one P1 where the walkable ground itself is missing. It reshapes walkable ground in the gorge, untrialled, so its level findings come back here before it is built |
| 27 | Kit pieces are solid scenery: no mechanic, and never a route | New | finding 6 |

12 decided, 11 default, 4 new.

### Findings

Ranked; 1 to 4 change the plan before Part 2b starts. 2a (steps 1 to 3) can start now with finding 5's number added.

1. **P1. Step 5 changes the starter tree catalog, and the plan does not say so.** The 12 trees leave `LAND_TREES`,
   which `test/railway.test.ts` pins tree by tree ("catalog exactly pins ... every starter source to centimetres") and
   which `tree-catalog.ts` guards in words ("Only the new station ground may remove an already planted tree"; "all 362
   survive"). The trial did not run the unit tests, and the plan's Risks say "No `WORLD_NS` bump: heights are not saved
   state". Heights are not, but the tree catalog is what harvest state hangs on. Before step 5 starts the plan must
   say: the catalog loses these ids on purpose; whether a saved room still loads (the test "a saved world loads all or
   nothing: archetypes, catalog, keys"); and whether that means a `WORLD_NS` bump. A bump is allowed and never a
   reason to shrink the step ("Save resets never block development or architecture"); an unstated one is the defect.
   The 13 November Home flip entry already expected "possibly a second [bump] when the town's paths move trees".
2. **P1. The trees, named. The loss is acceptable; none must be kept; all must be listed in the plan before the step
   ships (agreed with the planner and the owner's answer).** A read-only estimate from the catalog and the new radii
   (the implementer confirms it against the real run):
   - Leave the catalog (path strips, 12 or 13): ids 44, 319, 59, 313 (canyon path, trunks 7.3 to 8.6 m from the centre
     line); 97, 227 (quarry path near (-87, 78) and (-102, 71)); 69, 75, 241, 317, 323, 205 (quarry path at the gorge
     turn, (-8, 137) to (23, 166)).
   - **Not counted by the plan:** five more by the shore path, ids 55, 203, 291, 296, 348 near (-195, 3) to (-170, 32).
     The shore strip is graded after the catalog snapshot, so these stay in the catalog and are hidden locally
     (`shoreTreeCleared`): they vanish for the player all the same. The plan's "12" should read "12 from the catalog
     and about 5 hidden by the shore".
   - None is a hardwood, the oak or the great tree, and none stands in a grove. 12 of 362 is 3% of ordinary wood, and
     trees regrow; no bill is at risk.
   - Every trunk stands 2.9 m or more outside the tread's edge. They go because clearing rides on the same number as
     levelling, not because they block the walk. Trees beside a path are the medium shapes that frame it
     ([level-design](../research/level-design.md), three sizes of shape). **Recommendation, not a condition:** where it
     is small work, keep the ones whose ground barely moves (59, 313, 317, 323, 296: the new strip touches them at
     under 0.2) and let the rest go. One check is a condition: a before and after still of the quarry turn near
     (-5, 150), which loses up to six trees in one place and gets step 6's landing on top. If it reads bald, two trees
     are kept or replanted on the landing's outer edge.
   - The 3 unidentified placements and the 1 timber piece: agreed, named before the step ships. If the timber piece is
     a rail, sleeper or plank on a line a player rides or walks, that is a level finding and comes back here.
3. **P1. The 23 cells: accept, on three checks, because the wider strips now reach three gated things.** Within the
   new fade distance of a path's centre line stand the lookout secret's pad (2.6 m, inside today's strip already), the
   alcove secret's pad at (-40, -80.5), a hook secret (6.9 m from the canyon path: outside today's 6.5 m, inside the
   new 8.8 m), and gate 1's lever and apron pad at (97, 42) and (99, 44) (6.6 and 7.3 m from the quarry path: outside
   today's 4.8 m, inside the new 7.7 m). The trial reports their assertions still pass, which is the proof that
   matters ([route-contract](../research/route-contract.md): movement may skip distance, never the work). The
   implementer's run must also show: (a) the 23 cells' positions, none adjoining those three pads, the device pillars
   or the jump course; (b) the ground height under and beside the alcove and the apron before and after, with the
   height still to climb, so a pass by centimetres is seen; (c) the lines "apron is out of reach: gate 1's ledge needs
   two jumps", "lookout is out of reach" and the "At the start" list unchanged. If the margin at the alcove or the
   apron shrinks, the strip skips those cells (the `skip` hook) instead of the gate losing its meaning. More wall and
   shore to hop up with the second jump is otherwise welcome: that is what the jump is for.
4. **P2. `inner` does three jobs.** In `strip()` the same number levels the ground, clears trees and paints
   `pathMask` (`smoothstep(inner + 1, inner - 0.5, d)`). The call here is only that the bench is level across the
   tread. The path a player sees must stay 6 m and 3.8 m wide: on the Round's lawns and the commons a path that grew
   to 12 m would stop being a line to follow (flow rule 1). The step states that the painted width is unchanged and
   shows the town framing (`H/c3`) before and after.
5. **P2. The pigment needs a grass-side number, not only a rock-side one.** From the stills the wall is a warm orange
   tan and the tread a pale warm tan: the two differ mostly in lightness, which is why the canyon reads as one
   surface. Packed earth fixes that side (the start middle `#93836f` is about 30 of 255 darker than the wall and far
   less orange). But the same value sits within about 10 of the lawn's lightness, where today's pale tread stands out
   strongly, and the bold path is "the way you're sent first" from spawn. Ruling: the start values stand as candidate
   one. Add to step 1's check: at the town framing the tread's middle is at least 15 of 255 lighter than the grass
   beside it, or its pale stones and verge carry the line; and the riser bands stay visibly darker than the tread. If
   the lawn check fails, lighten the middle toward `#a09080` before touching the hue. Pale gravel stays on the sheet
   only as the comparison; it is not picked.
6. **P2. Part 3's first wedge starts at a secret.** The wedge runs from (-42, -88); the alcove (hook, "after glide")
   is at (-40, -80.5) with its stand point at (-41, -84), the bell secret at (-36, -78) and the first device pad at
   (-46, -69). Boulders of 0.8 to 3 m and rock faces with colliders are steps: one jump is 1.7 m and two are 3.0 m.
   Rules for the kit, all cheap to state now:
   - No piece is a new way up: `npm run level-check` runs on the placements, and no piece's top stands within two
     jumps below a pad, secret, rim or wall top that is gated today.
   - No piece within 6 m of the alcove, the bell or a device pad on the first wedge.
   - The tread keeps its full width (the plan's 3 m floor is right).
   - The river side of a bench stays open: no kerb or wall whose collider stops a fall. Falling off the climb into the
     river is a joke the game wants (DESIGN 10), and a friend can follow you down.
   - Dress by purpose ("Gameplay shapes the environment"): retaining wall and rock face on the uphill side say "not
     this way"; the kerb marks the tread's edge; nothing is placed where it reads as an invitation to climb.
   - Art only stands: no climbing, breaking or use, as the plan says. A piece that later gains a use goes through
     `/brainstorm` first.
7. **P2. Order.** The three P1s are the right first targets: two are the owner's own sentence about the canyon path,
   and the third is the one path that is not there to walk on. Two view-only P1s first is right, since they are safe
   and judged against his words. But step 6 is P1 and sits last and untrialled, behind a P2 (step 5), and both clear
   trees at the same gorge turn. Run step 6's trial beside step 5's so the turn's trees, the gorge's second-jump flood
   and one possible `WORLD_NS` bump are decided once, not twice. Step 7 is independent and can ship whenever it is
   ready.
8. **P3. Step 3b and the rock tell.** Rock means "you can't walk here". Removing lone rock from walkable slope serves
   that. The check to add: no unwalkable face loses its rock, from the far camera and the shore camera.
9. **P3. Co-op and solo.** Nothing here differs by player count. Wider level benches help two walking abreast on the
   climb; no finding.

### Suspect lines

None: these parts carry no character copy.

### Owner questions

The plan's three are answered. What is left, recommended answer first:

1. **The river side of the canyon climb stays open when the kit goes in, so you can still fall off?** **Yes**: kerbs
   and walls go on the uphill side and at the tread's edge as low marks, never as a rail.
2. **Rebuild the quarry path's benches in the gorge now (step 6), though it reshapes walkable ground there?** **Yes**:
   it is the only path with no level tread at all; its level findings are reviewed before it is built.
3. **The kit's style:** picked by you from the previz sheet, with the Small Magic reference beside the two styles?
   **Yes**; the planner's lean is chunky Sunshine blocks.
