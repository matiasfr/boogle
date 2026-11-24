# Terrain clean: no cliff ledges, clean walkable ground, then custom meshes

> **Status, reconciled 16 November 2026 against main 3720b4c3b:** Part 1 and Checkpoint A are on main (#1821, #1839); Part 2a step 1 and wall-foot repairs (#1840), and Part 2b steps 5–6/seam repairs (#1846, #1882) are on main. Part 2a steps 2–3 trials were rejected (#1852). Part 2b step 7 is on main (#2092, 18 November) with its review fixes (abutment cut 0.692 m; exposed-trail cut 0.02 m; worst walk-on step 0.014 m; ring check passes). Next: Part 2a step 2, an accepted tread-edge treatment; Part 3 remains unverified/unbuilt.
_Plan, 14 November 2026. Part 1 implemented and checkpoint A recorded; Part 2a partially implemented, with its wall-foot regression repaired; Parts 2b and 3 not started. Original survey measured on main at `b2157fb6b`; every survey still was taken under load
(1-minute load 16 to 34), so stills are evidence of shape and colour only, not of timing, shimmer or motion. Not tested
on a device._

> **Owner, 14 November 2026:** "I don't need to look at the terrain. I think your instincts are right. We don't need
> complex geometry for the unwalkable part. We should just do a pass on geometry and make sure it looks clean,
> especially for the part that can be walked. And then we should consider creating custom meshes to dress the world."
> Earlier the same day: "the trail could have basically more of a distinction between the path, and the geometry can
> be more intentional. For example, when you're going up the canyon path, it's the same texture and color as the sides
> of the valley wall, but it should be more clearly looking like a path."

This supersedes, in part, his 10 November answer "denser triangles only on unwalkable cells"
([terrain-pass](../archive/plans/terrain-pass.md#owners-answers-10-november)). The rest of that entry stands: grass to the beach, rock
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
medium. No source under `src/sim`, `src/net`, `src/world` or `server/` changes. At the original Part 1 tip `75049e8be`,
the review-stamp tool nevertheless
classifies deletion of `test/terrain-pass-island.test.ts` as assertions removed: **`fb731dd370a5`**, one review file.
This corrects the original prediction that no review would trigger. The review gate remains for a future merge;
this job performs only the requested local commits and does not push, ship or bypass it.

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
  (961.0125037718327, -219.1128101434796), none over 1 cm. Corrected grid proof: 1,639,930 samples, worst
  **8.597842645619025e-06 m** at (802.5, 49.5), none over 1 cm. Ground: 263,550 triangles, 134,980 vertices.
  The grounded count differs from the old 607 because this reference includes the physical cove kit.
  Original baseline footing/count evidence: `.look/evidence/1794681188591-58295/evidence.json`; load 20.57 to 17.69.
  Its grid classification is superseded; corrected grid evidence is listed in the P2 correction below.
  Four before stills (cameras 0, 2, 9, 5) opened; loads 14.28 to 27.81. Baseline cove render: 266 calls,
  178 shadow calls, 652,455 frame triangles (`.look/evidence/1794681305151-60481/evidence.json`).
  `node dev/ship-check.ts`: pass. Heights and five collision-tile hashes saved before any ground changes;
  baseline level-check passes with 5,266 placements, zero problems and 13 reports. The original grid classification
  used central differences and was invalid; its grid figures are withdrawn and replaced by the face-normal rerun
  recorded below. The original height, placement, footing and triangle-count proofs are unaffected.
- [x] **1. Move what stays to `src/place/`, no behaviour change.**
  - Create `src/place/ground-layers.ts` (pure, no three.js) with `colliderHeight`, `colliderNy`, `vertexNy`,
    `steepness`, `describeGround` and `STRATA`, moved verbatim from `src/proto/terrain-pass/surface.ts`.
  - Create `src/place/ground-material.ts` with `homeGroundMaterial()`: `roundTwoMaterial` from `materials.ts` with the
    `whole` branch only (no wedge fade, no `inside` mix). Rename the attribute `tpLayers` to `groundLayers`.
  - `dev/terrain-pass/path-ground.ts`, `paths-shots.ts`, `paths-setup.ts` and `census.ts` move to `dev/ground/` with
    their imports repointed; add `dev/ground/heights-hash.ts`.
  - Verify: `node dev/ship-check.ts`; heights hash equal to main.
  - Completed: material and numeric helpers moved, tools repointed, all six hashes identical to the pinned
    `origin/main` baseline `22b331dba`. Local `origin/main` is advancing in other sessions; measurements keep this
    original baseline rather than silently changing the comparison target.
- [x] **2. The land draws its own grid.**
  - `src/place/land.ts`: replace `applyHomePass(geo, mainEnd, inCove)` with a local `addGroundLayers(geo)` that packs
    `steep, foot, soil, gorge` for every existing vertex (grid vertices from `describeGround(cellX(i), cellZ(j))`, the
    cove patch's vertices described where they stand, offshore rings `0, 1, 1, 0`, `gorge` as `home.ts` computes it
    today). The index is left as `buildMesh` made it. Remove `homePassOn`, `applyTerrainPass`, `wedgeDraws`; the pass
    is on when `LOOK.ground` and `?terrain` is not `0`. Call `addFarGround(mesh, NX, NZ, mainEnd, inCove, owner)`.
  - `src/place/far-ground.ts`: delete `NearGround`, the `near` parameter and the code that reads it (and anything in
    `far-ground-index.ts` only it used); `test/far-ground-index.test.ts` stays green.
  - Delete `src/proto/terrain-pass/` (tag the parent commit `archive/terrain-pass-wedge` first, local tag, pushed with
    the ship), `test/terrain-pass-island.test.ts`, and `dev/terrain-pass/`.
  - Verify: `node dev/ship-check.ts`; heights hash equal. The search for `terrain-pass`, `terrainCap` and
    `NearGround` under src, dev and test must find no runtime import, flag, call or test of the removed ledge code.
    Documentation/plan references and comments linking to plan history are allowed. Comments pointing to removed
    source files must be updated or deleted; the `GRADED` comment is removed in step 3.
  - **Owner-authorized departure:** the zero-match requirement above is for live code, not retained history.
    Step 2 passes ship-check, registry and the full check; hashes match and normalized level-check diff is empty.
    The local archive tag names `5baaad151`, immediately before deletion.
  - **Accepted visible difference:** the lower gorge wall has broader, more continuous green patches without
    the ledges (cameras 2 and 9). The implementing agent opened all four matched before/after views; the orchestrator
    also opened camera 9 before/after and agrees the wall reads the same. Warm rock bands and large facets remain.
- [x] **3. Remove `GRADED` from `src/place/terrain.ts`** (the constant and three `push` lines; nothing else). Its own
  small commit, last, because four branches in flight touch this file. Verify: heights hash equal; `npm run level-check`
  diff empty.
  - Exact deleted lines against baseline `22b331dba` (also the step-2 parent): 119–123 (comment and constant),
    124 (separating blank), 127 (`pad` push), 171 (`strip` push), 396 (`gradeSupport` push). No other terrain.ts
    edit, height calculation, collider or placement change. The in-flight branches' whole-word `GRADED` readers
    were only the old terrain record and retired ledge implementation/tests. Hashes and normalized level diff verified.
- [x] **4. Docs.** `docs/game-design/graphics.md`: rewrite the "Home's ground: the terrain pass" bullet (no 1 m cells,
  no tolerance sentence, flags reduced to `?terrain=0`). `docs/plans/terrain-pass.md`: status line points here.
  `docs/decisions-look.md`: a dated entry with the owner's words above, its Current rules line, and an italic note on
  the 10 November "density only where it's steep" line. `dev/decisions/topics.ts`: `'plans/terrain-clean.md': 'look'`.
  Verify: `npm run decisions`.
  - Completed: the graphics section describes the collider grid and retained material; the earlier plan is marked
    historical; the existing 14 November decision and 10 November supersession note are retained, with the owner's
    proof and accepted-appearance follow-up appended. The new topic route is registered.

**Checkpoint A (end of Part 1), four proofs:** the level-check diff; the census; matched brokered perf render counts
(draw calls, shadow calls and triangles at the same camera poses before/after); one proof look,
`dev/ground/paths-shots.ts` cameras 0, 2, 9 and 5 beside the owner's stills in
`/Users/matiasfranco/Developer/boogle/.look/owner/terrain-pass-1114/`, opened by the visual reviewer, who names any
wall that reads worse without ledges. **Owner-authorized departure:** brokered render counts replace the requested
bench because this broker has no bench operation; no frame timing is measured for this comparison, and no direct
Chromium bypass is allowed. The matched cove camera is (809, 3, 49), looking at (760, 0, 15), FOV 62, 960 × 600,
fixed DPR 1, MSAA 4. Baseline/after: 266/266 draws, 178/178 shadow draws, 652,455/649,905 frame triangles.
No push or ship in this job; the owner requested local commits only.

### Checkpoint A results, 14 November

- [x] All six hashes equal the original `origin/main` baseline `22b331dba`: raw heights plus five complete collision
  tiles. The normalized level-check diff is empty: 5,266 placements, zero grounding problems, 13 reports. No height,
  collider or placed object moved. Exact terrain.ts deletions are listed under step 3 for sibling branches.
- [x] Independent actual-render-buffer census repeated after steps 3 and 4: 805 static bodies, 612 terrain-grounded,
  97,399 footing samples and 1,639,930 correctly classified walkable-grid samples. Footing worst gap before/after:
  **0.000001787839970290861 / 7.860379014346108e-14 m**; grid worst:
  **8.597842645619025e-06 / 8.597842645619025e-06 m**. Counts over 1 cm: footings **0 / 0**, grid **0 / 0**.
  The after grid maximum is on the cove kit at world (802.5, 49.5), where Float32 rendered coordinates meet the
  original collider recipe. The footing maximum is numerical zero to float precision. Original footing/count manifest:
  `.look/evidence/1794682704266-91488/evidence.json`, load 20.35 to 20.96; its wall PNG was opened. Its grid
  classification is superseded by the corrected P2 rerun below.
- [x] Full ground: **263,550 to 241,836 triangles**, **134,980 to 122,500 vertices**: exactly **21,714 fewer
  triangles and 12,480 fewer vertices**. Matched cove render counts: **266 to 266 draws**, **178 to 178 shadow
  draws**, **652,455 to 649,905 frame triangles**. Camera pose, FOV, dimensions, DPR and MSAA match the baseline
  exactly. Fresh after manifest: `.look/evidence/1794682728925-92853/evidence.json`; baseline manifest:
  `.look/evidence/1794681305151-60481/evidence.json`. No frame timing was measured for this comparison.
- [x] Cameras 0, 2, 9 and 5 opened before/after and compared with the owner's stills. The walls still read as warm,
  banded rock with large facets; the accepted difference is broader green patches on the lower gorge wall. No new
  hole or major wall-silhouette break was observed. Existing jagged path borders remain Part 2 work. The
  orchestrator independently opened camera 9 and accepted the same reading. Capture loads were 14.28 to 28.46;
  these are still/colour observations, not motion or performance evidence.

Final-tip revalidation (four fresh stills, census, matched count run, production T1 bot segment and the required
static checks with a 600-second timeout) is recorded with exact manifests, logs and any failures in
`.look/terrain-clean/report.md`. No ROM data added. Not tested on a device. No push or ship.

Original game-code verification at `baeaa4897` (before the P2 tool correction): ship-check (63 affected test files), registry, level-check and full
`npm run check` all passed; 2,047 unit cases, 2,046 passes, zero failures and one existing todo. All six hashes match,
and the normalized level diff is empty. Four fresh checkpoint stills (cameras 0, 2, 9, 5) were opened, with capture
loads 6.08 to 8.75. The production T1 segment passed with every expected beat, no missed beat or timeout; its end
still was opened. This was an accelerated bot run, not real-time feel evidence. That final note changed only plan
text; renderer, physics and placements remain identical to that tested commit. The diagnostic tool is corrected
separately below. Original review stamp `fb731dd370a5` is
reported for the retired test deletion, not represented as an independent review having been completed.

### Verification-tool P2 correction, 14 November

Independent review found that central differences averaged different collider faces into a fictitious normal at
triangle boundaries, admitting unwalkable points and excluding genuinely walkable boundary samples. The prior
claim of a large gap on walkable ground is withdrawn: at world (899, -177), the actual incident normal Y values
are **0.4237982267933741** and **0.43468170591155497**, both unwalkable. The game change itself checked out.

The owner-requested regression first failed with the old classifier (`true` instead of `false`). The corrected
tool enumerates actual incident heightfield and cove triangles, including both sides of diagonals, edges, vertices
and tile joins. A point is walkable if any incident face at the physical top surface is walkable; a buried face
cannot qualify it. Five pure tool tests cover the reported point, preserved walkable boundaries, tile edges and
cove faces. No game source, height, collider, catalogue or placement changed for this fix.

Corrected reruns on `origin/main` **`fceb07f6115d`** and this branch both sample **1,639,930** walkable-grid points:
worst absolute gap **8.597842645619025e-06 m (0.008597842645619025 mm)** at world (802.5, 49.5), **zero** over
1 cm, before **and** after ledge removal. This is float-coordinate noise at the cove, not a walkable-ground defect.
The before ground source is unchanged from the original `22b331dba` baseline. The archive was served locally through
the existing broker with only the corrected diagnostics overlaid; in-browser SHA256 checks verified the served
terrain and land source. Archive-only Vite file access was set for the existing read-only package assets after an
initial resource-403 health failure; the successful rerun had no page or graphics errors.

Corrected before/after manifests: `.look/evidence/1794685011817-36305/evidence.json` and
`.look/evidence/1794685037164-37521/evidence.json`; loads **19.34 to 16.18** and **15.92 to 15.62**. Both new wall
PNGs were opened: warm banded rock remains, with the previously accepted broader green patches after removal.
Execution health and this visual observation are separate from the numerical proof. Superseded central-difference
grid outputs are invalidated in the local report; they must not be used as walkable-ground measurements.
The added regression test can change the branch's review stamp; the current output belongs in the final report.

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

- [x] **1. The path is a different material from the rock (finding 1).** `src/place/path-surface.ts`: lift the
  pigments into one exported `PATH_PIGMENT` record and move the earth away from the rock's hue and value: a cooler,
  darker packed earth (start: edge `#6e5f50`, middle `#93836f`, cut `#4b3c30`, timber `#5f4630`; today `#8f6f4a`,
  `#a98a5f`, `#5e4833`, `#6f5236`). Keep the lighter middle, mottle and grit. Capture two candidates on the three
  canyon cameras (the start values, and a paler gravel `#8d8a80` to `#aaa598`) as one sheet; the visual reviewer picks
  the one that separates best from both rock and grass under Fresh, logged in `docs/agent-calls.md`. Verify: from the
  still, report the mean tread and mean wall colours; the tread is darker and greyer than the wall (target: at least
  30 of 255 apart in value, and visibly less orange); grass and tread still differ at `H/c3`'s framing.
  - Completed in `codex/terrain-2a`: independent reviewer opened the matched three-camera sheet and chose the
    start packed-earth pigments; gravel reads chalky/near white under Fresh. Town remains clearly distinct from
    grass. Baseline and packed/gravel manifests: `.look/evidence/1794697324782-58718/evidence.json`,
    `.look/evidence/1794697846901-84067/evidence.json`, `.look/evidence/1794698045430-91537/evidence.json`.
    Opened baseline c0–c5 (paths cameras 0,1,2,3,7,10), packed c0–c3 and the three-row candidate sheet
    `.look/terrain-2a/packed-left-gravel-right.png`. Fixed c0 pixel rectangles (x,y,w,h): tread (330,690,270,80),
    lit wall (980,10,100,150); mean sRGB **(182,171,158)** / **(213,159,99)**. HSV value differs by **31/255**;
    R minus B is 24 versus 114. This is a region comparison, not a whole-material average under matched normals.
    Ship-check passed (56 affected test files); all six hashes match baseline `902217fc7`.
    Survey worktree H was removed, so the retained `paths-shots.ts` canyon/town/far/shore poses substitute for its
    unavailable camera definitions. Broker single-player warp was rejected; supported `--real` captured the same
    frozen shot action. One queued attempt timed out; retry passed. Shared load: no timing or motion conclusion.
    Independent review used the available model because Fable was unavailable. Not tested on a device.
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
  - [x] Implementation complete; visual acceptance is **partial**. The own-height bench removes the small green
    tread holes, but a dark dotted crease remains in the walking-up view. Do not claim finding 5 closed: Part 2b
    still owns the folded geometry. Final opened c0, c1 and c2: `.look/evidence/1794699138778-29298/evidence.json`,
    against packed-earth c0–c2 from step 1. The cliff stays tan above a restrained cut-earth foot; isolated cut
    pockets remain at mesh folds. No source height moved; six hashes match. Path-field tests and ship-check pass.
  - Visual repair departure: the literal exterior band painted whole dark cliff strips (opened c0/c1 from
    `.look/evidence/1794698304300-8309/evidence.json`; that run also failed an exact one-pixel/channel repeat).
    An unchanged retry passed health (`1794698886579-22035`). A height cap alone still drew black stripes and
    downhill patches (opened c0–c2 from `1794698933745-23570`); the third source iteration restricts paint to the
    uphill 0.6–1.2 m foot at half strength. No further autonomous tuning; residual dots are recorded, not hidden.
  - [x] **P2 wall-foot regression repair (`codex/terrain-2a-fix`, owner-authorized follow-up).** Supersedes the
    exterior cut-bank treatment above: remove that paint entirely. Keep the path-height bench and restore the
    original `smoothstep(0.5, 0.66, facetUp)` ground-facing mask for tread, stones and painted normals. The verge
    uses horizontal tread coverage, then the bench; rejected wall fragments no longer become a dark verge.
    Opened matched 1280×800 c0, c1, c2 and c5 from `.look/terrain-2a-fix/round2/shots/`, against retained baseline
    `1794697324782-58718` and reviewed branch `1794700012427-59122`: charcoal scallops and vertical grey wall-foot
    paint are gone; the warm sandstone meets a distinct grey-brown tread. Shore blend remains intact.
    Round 1 removed the scallops but retained grey paint on slanted facets, so it was rejected. Round 2 restores
    the established facet cutoff; both captures passed health and exact-repeat checks at the original viewport,
    without a screenshot timeout. All six heights/collision hashes match the original baseline. `terrain.ts` is
    untouched. Full static checks pass (2,155 passes, one existing TODO); final ship-check and T1 proof are recorded
    in `.look/terrain-2a-fix/`. No push or ship; no timing conclusion; not tested on a device.
  - [ ] **P3 dotted crease remains.** Visible beside the right wall in c0, with narrow green slivers at some folds;
    not closed by this wall-foot repair. The step-2 parent remains open, and Part 2b owns reshaping the tread.
- [ ] **3. Shore and rock borders (findings 6 and 8).** `src/place/ground-material.ts`: (a) the gorge-floor mask
  takes a per-pixel wander and a wider blend so sand meets bank over 6 to 8 m, not on a 2 m vertex line; (b) the
  broad-slope rock rule (`broad`) applies only where the interpolated vertex `steep` input is above 0.05, that is on triangles that
  touch truly unwalkable rock, so lone tan patches on walkable coast slope and lone rock triangles in grass go. Verify: `H/c7` and
  `H/c1` cameras; the far camera (paths-shots 7) shows no new patches.
  - [x] Shore blend implemented and opened: `.look/evidence/1794699791806-48979/evidence.json`, c0–c5, against
    step 2's matched views. Sand meets bank more softly; original cliff/coast rock is preserved. Distance thresholds
    are 14.5–21.5 m, with bounded 0.6 m per-pixel wander. **Small source-scope departure:** `land.ts` passes raw
    `gorgeD` through the existing fourth attribute component (outside sentinel 1e6); the former saturated 4 m mask
    cannot express a 7 m blend. No new attribute, texture, height or collider. Six hashes remain equal.
  - [ ] Broad-rule cleanup remains unfinished after three inspected source iterations. Literal `steep > 0.05`
    gating made vertical cliff strips green (`1794699239260-34226`, c0–c5 opened), because this vertex field records
    the flattest adjacent face. A true rendered-face guard restored cliffs but introduced speckled boundaries
    (`1794699414365-41449`, c0–c5 opened); softening it made large angular coast slabs at far LOD
    (`1794699702563-48370`, c0–c5 opened). Both author and independent reviewer rejected these. The original rock
    rule is restored; no claim that coastal tan patches or grass/rock zigzags are removed. Stop at the look's
    iteration limit; a consistent true-face input across full-resolution and far terrain needs a later plan repair.

Part 2a local result: step 1 complete; step 2 implemented with its wall-foot regression repaired but visual acceptance
still partial (dotted crease and green slivers remain); step 3 shore complete,
rock-border cleanup unfinished. Checkpoint B is **not complete** and no ship is authorized in this job. The Boogler's
copy is unchanged; no suspect line encountered. No ROM data added. Not tested on a device.

### 15 November follow-up: view-only trials, rejected

Implementation worktree `t3/503a4393`, starting at `bff2e6203`. Steps 2 and 3 remain **open**.
The shore blend and owner-selected packed-earth pigments already exist and are retained.
No steps 5 or 6, height, collider, tree or placement changes were made.

- Removing the facet cutoff and adding bounded exterior cut-earth paint reproduced grey wall paint and dark
  scallops (opened paths cameras 0, 1, 7 and 10 in `.look/shots/terrain-2a-round1-retry/group-0/`). Rejected.
- A smooth-normal facing mask and a stricter smooth-normal exception to the `steep` gate remove the coastal tan
  patches but make vertical canyon strips green; green tread fringes and some wall paint remain. Opened paths
  cameras 0, 1, 2, 7 and 10 in `.look/shots/terrain-2a-round2/group-0/`. Rejected.
- The latter implementation was kept briefly under `?terrainEdges=trial`, then removed from the branch by the orchestrator (no dead flag on main); it is archived at local tag `archive/worktree/t3/terrain-path-shore-borders-trial`. Next attempt: a Fable implementer (the models row for player-visible work) once that usage is back. Default uses the original facet cutoff and
  broad rock rule. Final capture `.look/shots/terrain-2a-final/manifest.json`: group 0 default, group 1 rejected
  trial, all 11 original plan cameras at 1280 × 800. Opened final c0/c1/c7 in both groups; default retains the dotted
  crease and coastal patches, trial retains the regressions above. Before: `.look/shots/terrain-2a-before/`.
  Capture health and exact-repeat probes pass. First queued attempt timed out and was invalidated by formatting;
  it contains no usable after evidence. No motion or performance claim; not tested on a device.
- `node dev/ground/heights-hash.ts` before and after prints six identical hashes. Raw heights:
  `9ad1083c863f22a182bcc92a306c9001a954b3118b3209f2b853925fe9fc3e9d`.
  All five complete tile hashes and source identities are in `.look/terrain-2a-proof/`.
  `terrain.ts` and `layout.ts` also have an empty diff against `origin/main` at proof time (`5f49c65bd`).
- Full static check and T1 pass on the first candidate. Final scoped lint/typecheck pass; final committed ship-check
  is run separately. T1 is not proof of either rejected candidate's visual quality. No push or ship.

**Checkpoint B (end of 2a):** one proof look (canyon walking up, from above, across the valley, shore, town), opened
by the visual reviewer against the owner's sentence; heights hash equal; one ship. Update the paths bullet in
`docs/game-design/graphics.md`.

### 2b. Height changes, each its own step with its level findings

These move the collider, `H`, the tree catalog and level-check, under "Place for the look, not the cost; terrain may
change". Each runs `npm run level-check`, `node dev/ground/path-ground.ts` and the tests that import `terrain.ts`
(`round-grounding`, `town-plan`, `path-refuge`, `home-station`, `roundhouse-yard`, `coast-regions`, `works-shape`,
`railway-works-layout`, `far-head-show`) before it is called done, and rebases on the Round and rotunda branches,
which also edit `terrain.ts`.

- [x] **5. Benches level across the whole tread (finding 4; closes 5).** Cause, measured: `strip()` levels vertices
  within `inner` of the centre line, but `inner` (3.6 m bold, 2.4 m plain) is barely wider than the tread (3 m,
  1.9 m), so a triangle with one corner on the bench and one 2 m further up the wall folds into the tread. Fix, in
  `terrain.ts` where `PATHS` and `SHORE_SAMPLES` are graded: `inner` = tread half width plus one cell diagonal
  (5.9 m bold, 4.8 m plain), `outer` = `inner` + 2.9 (8.8 m, 7.7 m). Trialled for this plan: see Level findings.
- [x] **6. The quarry path's benches (finding 3).** Step 5 does not fix it: at (-60, 148) the cross fall stays
  2.87 m (something later regrades or skips those cells; the implementer finds which before changing anything, most
  likely a `skip` or a later pad). Then cut a 4 m bench on both gorge descents, with a 6 m level landing at the turn
  near (-10, 150), as [terrain-pass](../archive/plans/terrain-pass.md#ground-that-needs-real-reshaping-proposals-for-a-later-ground-step-not-done-here)
  proposed. The shore path's ramp (-177, 27) to (-153, 33) is in the cove's fine patch and is unchanged by step 5: it
  goes with this step.
  **Cause confirmed before step 6:** `gradeSupport(BANK_CART...)` runs after the path strips. Its 3 m soft
  skirt raises the downhill vertex at (-60, 150) from 9.905 m to 13.770 m, towards the cart's 18.6 m pad.
  That vertex lies in the tread triangle sampled at (-60, 148). This is the later cart pad, not a path skip or
  the cove fine patch. The repair retains the cart's wheel bearings with a narrower support fade after restoring the descent.
- [x] **7. Ring Island footbridge, abutment a (finding 7).** `src/entities/ring-island/ground.ts`: cap the ground
  under the deck's footprint plus 0.5 m, for the first 4 m from abutment a, at the deck's underside less 0.1 m (the
  same kind of cap the loop deck already has), so nothing stands through the deck; the abutment beam then reads as a
  wall under the deck's end. Verify: `test/ring-island-ground.test.ts`, the ring report in `npm run level-check`
  (today: `abutment cut 0.045 m`, `ring (planned): ok`; the cut figure will rise by the cap's depth, and the report's
  0.1 m threshold in the summit-path test needs the designer's word), `ringview=bridge` and `ringview=deck` stills.
  **Built on `codex/ring-footbridge-cap`, review fixes 18 November:** the cap and the landing are one exact patch of
  the grid's triangles (`ground.ts`, a trimesh in place of those cells; heightfield tiles round it). The cap stays in
  the deck's footprint plus 0.5 m for its first 4 m. The landing (17 November call) is the ground itself over the path's
  last 4 m and 2.6 m: it starts 1 cm over the trail across its width and twists to the deck's level top at a (14.932
  m), cut into the uphill side by up to 0.128 m under it and drawn as path. Worst step underfoot from 7 m before a to
  1 m past it, at 0 and ±1.2/±1.3 m: 0.014 m. The landing's grade along the path, at every offset: at most 0.165 (in
  any direction 0.253 at its downhill start corner, the trail's own cross-fall included). Mount clearance lifts a player
  clear of the slope as well as the solids. The tapered cylinder bound uses the larger radius. Level-check: path 330.1 m,
  span 28.0 m, grade 6.4 %, clearance 9.5 m, abutment cut 0.692 m (the cap and the landing's cut), off-bridge cut 0.02 m,
  `ring (planned): ok`. Walk look by real input, lanes 0 and ±1.2 m: all three reach 1 m past b with no stall; the
  parapets hold the outer lanes at ±0.93 m on the deck. Re-review fixes: the uphill lip wall runs whole to the deck's
  end, and the drawn trail meets the landing with no crack. Downhill near a the landing stands up to 0.36 m over the
  hillside (logged for the owner by the re-review). Stills: `docs/world/ring-footbridge-cap/walk-*.png`. Not tested on a
  device.

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

**Previz.** The [canyon mesh kit sheet](terrain-clean/previz/canyon-mesh-kit-previz.jpg) compares **Chunky Sunshine
blocks** and **Quieter Odyssey strata** from the same two Boogle cameras. The source stills show
[the view up the climb](terrain-clean/previz/up-the-climb.png) and
[the view back down](terrain-clean/previz/back-down-the-climb.png). An original meadow swatch illustrates the
Small Magic look note beside the paintovers. The sheet shows design intent for the owner's style pick.

**Step (2), built 24 November (branch `claude/canyon-kit-chunky`), for the owner to judge.** The Chunky Sunshine kit
(seven pieces: faces 6 and 10 m, a rim cap, boulders 0.9, 1.6 and 2.6 m, bank rock; one 43 KB GLB) stands on the
wedge in the live game, no flag: six faces on the climb's east wall and round its top bend, ten boulders at their foot,
six caps on the plateau's lip, four low rocks at the waterline. Matched stills from the previz's two cameras, before
and after: [up the climb](terrain-clean/kit/up-the-climb-before.jpg) /
[after](terrain-clean/kit/up-the-climb-after.jpg), [back down](terrain-clean/kit/back-down-the-climb-before.jpg) /
[after](terrain-clean/kit/back-down-the-climb-after.jpg); [walk up the climb](terrain-clean/kit/walk-up-the-climb-frames.jpg)
(frames of the clip); [the face in the asset viewer](terrain-clean/kit/asset-viewer-face.jpg) and
[the recipe's sheet](terrain-clean/kit/recipe-sheet.jpg). Cost at both cameras: +14 draws (seven batches, colour and
shadow passes) and +13,376 triangles (6,688 a pass); up the climb 167 to 181 draws, 554,325 to 567,701 triangles; back
down 291 to 305 and 746,761 to 760,137. Departures from the proposal: the placements are generated by
`dev/prefab/canyon-kit.ts` (content may import only portable data) into `content/built/levels/canyon-kit.json`; a
piece whose solids hold a player when the kit arrives waits until they are clear rather than moving them (a view moves
no bodies outside the prefab door); kerbs and shoreline pieces beyond the bank rock are not built. Open: the faces
stand proud of the wall and, from the top of the climb looking back, hide most of the alcove's bracket.

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

**Step 5 implementation (2026-11-15, based on `e3d64e3ea`):**

- The specified shoulders are graded separately from paint: bold 5.9/8.8 m, plain 4.8/7.7 m. Every paint-mask
  cell remains identical. The village green and the alcove/jump-course footprints plus a cell of margin retain
  their old grading, preserving the reviewed gate heights. Alcove's nine under/beside samples are identical;
  apron/lookout approach changes only lower ground, never shorten the climb.
- Production grounding: 5,251 placements, zero problems. Twelve ordinary trees are cleared, IDs
  `44,59,69,75,97,205,227,241,313,317,319,323` (362 to 350 land trees; 391 to 379 harvest sources).
  Visible trees are 331 to 319: the shore already hid its nearby trees on the starting build, so there are no
  additional shore-only removals in this step. The other three placements are the net change in terrain-following track support: panel mode has five fewer
  sleepers and three more planks; continuous mode has three fewer sleepers and two more planks. Rail counts
  and quarry track counts are unchanged. Around local (-30, -90), lowering the bank switches the standard
  track builder from bed sleepers to a deck; its different spacing also moves later supports along the same line.
  The timber audit uses continuous mode: 405 decks, 2,303 track pieces, zero problems; its one-piece reduction
  is that same net sleeper/plank change, not a missing rail.
- Second-jump flood: 422 to 443 incremental cells (149 newly classified, 128 no longer classified; the net is 21,
  not a list of 21 new cells). Named progression assertions are unchanged and pass; Far Head remains gated.
  Diagnostics and exact cell coordinates: `.look/terrain-benches/step5-flood-delta.json`.
- Path survey: 20 to 9 narrow stretches; canyon (-56, -112) 1.25 to 0.14 m cross fall and foot (-61, -80)
  1.36 to 0.12 m. Quarry stays 2.87 m, shore stays 0.55 m: these are step 6, not claimed fixed here.
- Intended pins: coast texture/sampling digests; prefab trees (cleared sources and terrain-following bodies);
  prefab halts (terrain-following ramp transforms only); sim harvest-source tuples and resource totals (120
  fewer initial logs); railway seed/ops/M12/tick-order hash fixtures for that catalog change, initially v49 (v50 after the heavy-load rebase below).
  Keyed fixture comparison confirms seed ticks, operation labels/results, M12 frame counts and tick-system
  sequences are unchanged; only state hashes change. Generated world blockout changes Line 1's bank classification at 112–116 m; rail geometry is unchanged.
- Walker proof: `.look/shots/terrain-benches-before-retry/group-0/c0-v0.png` versus
  `.look/shots/terrain-benches-step5-final/group-0/c0-v0.png`, both opened. The canyon tread is now continuous,
  with the rock wall set back behind a grass shoulder; the old right-edge folded slivers are gone. Quarry `c2`
  and `c3` show a wider descent but the cart bulge/turn remain. Shore `c4` retains its kinks. The extra overhead
  `c5` is partly obscured by trees and does not prove the landing. Capture health/repeat probes pass.
  These are frozen desktop stills, not motion, owner playtest or device evidence.
- Required checks: level-check passes (16 current reports, zero grounding/timber problems), path survey exits 0,
  all 81 tests in the nine named files pass. `npm run check` passes (2,189 unit passes, zero failures, one
  existing TODO, plus lint/typecheck/registry/level/assets/prefabs/build). T1 passes; the `world-inputs` scenario passes. The extra two-peer
  T2 route times out after waking (300 s wall limit, both pages around 250 s game time, clock drift; no graphics
  errors). Its final still and report are in `.look/playthrough/terrain-benches-step5-t2/`; this is not a multiplayer
  route pass. The one-player T1 proof is `.look/playthrough/terrain-benches-step5-t1/`.

**Step 6 implementation (2026-11-15, on step 5 `b6d5e8950`):**

- `path-benches.ts` derives local height profiles from the existing centre lines. Both descents have 4 m clear
  benches (4.9/7.8 m grading), eased slopes and flat turn/bridge run-ins. The (-10, 150) turn has a verified
  6 × 6 m landing at y=8; the bridge's endpoints and span stay fixed. Terrain and paint use the same profiles.
  The original catalog capture remains before these local cuts: all 350 land-tree records and 379 harvest slots
  remain identical to step 5, with no further namespace change.
- The cart's former 3 m fade caused the 2.87 m cross fall; restoring only the bench initially left one wheel
  floating. The finished repair keeps a full cell of bearing around its original footprint and narrows the fade
  to 0.5 m. All wheels remain at 18.6 m. The shore marker's bearing gets the same narrow fade at the hop's 14 m
  datum (its terrain-following foot was 14.544 m). Both pass the actual footprint grounding audit.
- The shore ramp's sharp height-profile corners and support skirt were retained by the protected fine-grid
  corridor. Its new level bends/eased slopes are baked into the coarse grid and inherited by the fine grid.
  The survey now queries `surfaceHeight`, including that fine patch, instead of only the coarse triangles.
- Level-check: 16 reports, zero failures; production grounding 5,250 placements, zero problems; 405 timber decks
  and 2,303 track pieces, zero problems. The one fewer placement is ordinary tree 79 at local (6.19, 165.56),
  hidden by the new turn shoulder; its harvest slot remains. Visible trees are 319 to 318. All nine recorded
  samples around each of the alcove, apron and lookout are identical to step 5.
- Second-jump flood: 443 to 438 incremental cells, 16 newly classified and 21 no longer classified; all named
  progression assertions pass. Exact coordinates: `.look/terrain-benches/step6-flood-delta.json`.
- Path survey: 9 to 6 flagged stretches, with no quarry or shore stretch remaining. Cross fall at (-60, 148)
  is 0.006 m instead of 2.87 m; the shore bend at (-177, 28) is exactly level. A quarter-metre surface sweep
  holds both quarry descents within 0.12 m of their centres across 4 m, and the shore within 0.15 m across 6 m;
  the maximum measured shore deviation is 0.135 m. These are tolerance-level benches, not exact planes everywhere.
- All 81 required terrain tests plus six path-field/bench tests pass. The three new surface tests fail against
  the committed step-5 terrain and pass against step 6 (ignored counterfactual evidence in
  `.look/terrain-benches/step6-regression-before.txt`). The landing test checks the whole square every 0.25 m.
- Intended repins in this step: coast texture `791e0c8d3fc35d1c3a31e170abff17163a57eae1f0bb5ff365643da185e49af9`
  and sample `5cbfd247698940588870c4e88f7bb821e058b58cde62829aa7beffe61d6cf454`; prefab-tree terrain-following
  source/root poses, the local cleared flag for tree 79, and 1,740 to 1,735 body records. Classic scatter and
  planted tree records are exact; no sim hash, halt fixture or generated railway data is repinned in step 6.

- Final stills: `.look/shots/terrain-benches-step6-final/group-0/c0-v0.png` through `c6-v0.png`, all opened.
  Matched step-6 before views are `terrain-benches-step5-final/group-0/c2-v0.png` (west descent), `c3-v0.png`
  (east descent/turn) and `c4-v0.png` (shore). The after views use the same indices and cameras. West now has a
  broad continuous tread instead of a cart-skirt intrusion; the east turn and descent read continuously to the
  bridge; the shore is more even, although some painted risers still look slightly wavy. The top-down `c6` shows
  the clear landing. Rim trees still frame the walker view and `c5`; no replacement trees were needed. `c5`
  alone is partly obstructed and is not landing proof. Final capture health and exact-repeat probes pass, with
  no source changes during capture. The earlier `terrain-benches-step6/` set was invalidated by a documentation
  edit during capture and is not the final evidence. No motion, owner-playtest or device claim.
- `npm run check` passes: 2,192 unit passes, zero failures, one existing TODO, plus lint/typecheck/registry/
  level/assets/prefabs/build. `node dev/ground/path-ground.ts` exits 0.
- Final T1 route passes at `.look/playthrough/terrain-benches-step6-t1/` (end still opened). It ran under load,
  so it proves route completion, not timing or feel. The earlier two-player T2 timeout remains an explicit
  unverified checkpoint; no additional multiplayer pass is claimed.

**Historical pre-implementation expectation:** step 6 was expected to clear more trees and expand the gorge's
second-jump flood; its measured findings above supersede that estimate. Step 7 remains untouched: its proposed
cap would increase the ring report's abutment-cut figure beyond the existing 0.1 m expectation.

### Heavy-load rebase (2026-11-15)

Rebased the reviewed terrain branch onto `54b8b4f128be76cfcdc39dbd1a84ac14b003b00a` (#1876).
Heavy-load's complete v49 history and rules remain; terrain has a separate dated **v50** entry. Main's line-2
24-piece pack/late-join/deposit assertions remain verbatim, with only the terrain catalog's initial-log total
reapplied (3,910 to 3,790 in six assertions). No new terrain shape or Step 7 change.

Regenerated all five railway fixtures using their own writers, never merged JSON:

```sh
GOLDEN=1 M12_RECORD=1 TICK_ORDER=1 TICK_ORDER_HEADS=1 node --import ./test/helpers/rail-no-audit.ts \
  --test --test-concurrency=1 test/railway-golden-*.test.ts test/railway-ops.test.ts \
  test/railway-m12.test.ts test/railway-tick-order.test.ts
```

Comparison is against fetched main, not the pre-heavy-load terrain branch:

| Fixture | Regenerated difference | Cause |
| --- | --- | --- |
| `railway-golden.json` | 47 stage hashes and 47 post-1,200-tick hashes; namespace v49 to v50. All seed ticks unchanged. | Catalog-only state change plus namespace metadata; no heavy-load interaction in these routes. |
| `railway-ops-golden.json` | All 277 hashes; every operation label/result unchanged. | Catalog only. Main's heavy-load acceptance results are retained. |
| `railway-tick-order.json` (`railway-tick-order.json` and `TICK_ORDER=1` were retired in the test cleanup of 18 November 2026; only the heads fixture is recorded now) | 2,700 per-tick hashes. | Catalog only; tick counts, systems and their order unchanged. |
| `railway-tick-order-heads.json` | 14,400 hashes. | Catalog only; headway cases, timing and system sequences unchanged. |
| `railway-m12-trace.json` | All 82 final hashes and 1,244 checkpoint marks; entry order, frame counts and mark lengths unchanged. | Catalog state/IDs and randomized source selection; a real behavioral interaction with heavy-load in `q3-done`, detailed below. |
| `server/test/fixtures/world-host-trace.jsonl.gz` | 205 checkpoints and 5,667 serialized-byte counters; all 8,596 record kinds/order, command inputs/results and replication packets unchanged. | Catalog rows/entity IDs and v50 checkpoint namespace/hash/checksum only; no heavy-load interaction in this trace. |

The M12 import-hook audit changes no production file or committed assertion. Restoring only main's full catalog
under the combined heavy-load/v50 code reproduces **every main M12 entry exactly**. Thus namespace alone has no
M12 effect and the catalog explains the entire new trace. Event comparison after excluding world hashes, next-ID
shifts, source/pile IDs and remap IDs finds nonidentity differences only in `q3-done/a,b,c`: a different random
chop target changes pickup acceptance and carried amounts. Under heavy-load, player a gets an additional forge
take of 2 (17 carried), leaving player c a later forge take of 2 instead of 4. This is not just rehashed IDs.
Two comfort-only controls also reproduce the pre-heavy-load main and the old terrain fixture exactly, confirming
that both independently approved changes, rather than a new rule edit, explain the combined behavior.

The additional server suite exposed its old host-trace golden (395 passes, that one failure). Regenerated with
`HOST_TRACE_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test server/test/world-host-trace.test.ts`,
then reran without recording. A control restoring only main's catalog and v49 reproduces main's complete
uncompressed host trace exactly. Across all 205 new checkpoints, surviving tree values and all non-tree component
values are identical after removing entity-ID columns; the next entity ID is lower by exactly 12. The same twelve
source IDs listed in step 5 are removed. This was a necessary stale fixture beyond the textual rebase conflicts.

Evidence: `.look/terrain-rebase/` contains the original fixtures, full keyed diffs, all four diagnostic recordings,
`m12-event-audit.json`, and check logs. Requested checks pass: 16 level reports (5,250 grounded placements and
2,303 track pieces, zero problems); path-ground exits 0 with the same six unrelated flagged stretches; all 81
named terrain tests plus six bench/path-field tests; 188 railway fixture/cart/line-2 tests; and `npm run check`
(2,226 passes, 65 existing local-mode skips, one TODO, zero failures, plus the remaining check stages).
After the host-trace regeneration, the complete server suite also passes **396/396**, with no skips or failures.
Scoped lint reports zero problems.

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
  phase, no compatibility code. Heights alone are not saved state, but step 5 also clears 12 harvest sources: its pinned sim catalog
  changes, so `WORLD_NS` advances from heavy-load v49 to terrain v50. A saved pose on a regraded bench otherwise restores through
  the existing ground snap. No compatibility adapter is added.
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
