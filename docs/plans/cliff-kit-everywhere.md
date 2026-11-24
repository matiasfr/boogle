# Cliff kit everywhere: census and plan

_Plan, 24 November 2026, on main `5677ad643`. Census and plan only: no game code changed. Stills were taken on a
shared machine (other worktrees' captures in the same queue), so they are evidence of shape and colour only, not of
timing, shimmer or motion. Not tested on a device._

> **Owner, 24 November 2026** ([d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff)):
> "do we have queued up to basically apply the same art treatment to all of the walls in the environment, are all the
> cliffs, not just one specific part? For example, now it feels inconsistent that we have these walls and then
> different ones near the shore. Um, they should feel like they're from the same sort of stylistic palate. Uh, or the
> same world at least."

## Goal

Every cliff and rock wall a player can see reads as the Chunky Sunshine kit's rock
([d-2026-11-24-canyon-kit-chunky-sunshine](../decisions-look.md#d-2026-11-24-canyon-kit-chunky-sunshine)): one
palette, one world. The [14 November rules](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first)
stand: the walkable ground stays simple, the kit is scenery with colliders, and no piece is ever a new way up. Area by
area, the shore first, each with matched before and after stills.

## Census

**Tools** (dev only, no game code):

- `node dev/ground/cliff-census.ts` groups every 2 m vertex of Home's heightfield that the ground material paints as
  rock (`src/place/ground-material.ts`: `steep` past its border, or the broad slope's `soil` under 0.57, without the
  per-pixel wander) into connected walls, with extent, height, how near the paths, the shore climb, the rails and the
  sea come, and the length of toe (rock above lower open ground: where faces stand) and rim (where caps go), all and
  within 80 m of a path, shore climb or rail, or at the sea. `--json` for the walls; `.look/cliff-census.json`.
- `node dev/ground/cliff-census.ts --anchors` trials a 6 m face every 8 m along each wall's seen toe, turned to face
  downhill, against the canyon kit's own rules (`kitPieceProblems`, which `npm run level-check` runs on the built kit)
  and 6 m of clearance from every rail's centre line. `.look/cliff-anchors.json` holds every trial position.
- `npm run look -- --action dev/look/evals/cliff-counts.ts` reads draws and triangles at the census cameras below.

**Home's heightfield** (Place-local metres; world x is Place x + 1000). Eleven walls of 100 m² or more, 15,884 m² in
all. Triangles are the heightfield's own, two a 2 m cell, already drawn in the land's one draw; nothing here adds a
draw today.

| # | Wall | Place-local box (x, z) | y (m) | Nearest path / shore climb / rail / sea (m) | Toe, all / seen (m) | Rim, all / seen (m) | Rock tris | Seen from |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Gorge north and the canyon climb (the kit's wedge is in it) | -102..58, -246..-40 | 1.2..39.1 | 4 / 148 / 1 / 2 | 490 / 422 | 800 / 758 | 2,738 | camp path, the north line's trestle, the canyon climb |
| 1 | Far Head | 314..460, -246..-100 | -4.2..24.2 | 295 / 483 / 1 / 0 | 412 / 412 | 358 / 336 | 2,198 | Far Head's line and halt, the sea |
| 2 | Gorge east wall | -20..82, -202..152 | 1.3..25.5 | 3 / 134 / 0 / 4 | 270 / 270 | 554 / 554 | 1,276 | the lines along the gorge, the river, Needle Bell |
| 3 | Gorge west wall (village side) | -92..-4, -96..138 | 1.3..19.2 | 4 / 106 / 1 / 6 | 230 / 230 | 332 / 332 | 740 | village edge, the lines, the summit |
| 4 | Gorge mouth, east side | -26..6, 138..176 | 1.3..23.8 | 4 / 158 / 109 / 6 | 74 / 74 | 76 / 76 | 202 | the sea, the south paths |
| 5 | North ridge | -78..-6, -188..-174 | 23.7..46.7 | 4 / 209 / 34 / 25 | 84 / 84 | 86 / 86 | 200 | camp path's shoulder |
| 6 | Gorge, rim lookout side | -116..-64, -150..-92 | -2.2..17.9 | 4 / 137 / 33 / 0 | 92 / 92 | 78 / 78 | 192 | camp path past the rim lookout ([still](cliff-kit-everywhere/gorge-rim-lookout.jpg)) |
| 7 | South sea cliff | 40..96, 178..186 | 5.8..13.6 | 27 / 230 / 139 / 7 | 62 / 62 | 58 / 58 | 142 | the sea, the south coast |
| 8 | Gorge mouth, west side | -56..-40, 144..176 | -2.2..19.1 | 6 / 150 / 118 / 2 | 42 / 42 | 40 / 40 | 88 | the sea ([still](cliff-kit-everywhere/gorge-mouth-from-sea.jpg)) |
| 9 | Shore climb | -188..-172, -16..16 | 4..16 | 64 / 8 / 89 / 19 | 36 / 36 | 38 / 38 | 86 | the landing, the shore climb, the sea ([still](cliff-kit-everywhere/shore-climb.jpg)) |
| 10 | East rail cutting | 186..198, -52..-30 | 6.7..24.2 | 126 / 327 / 0 / 7 | 30 / 30 | 30 / 30 | 80 | line 2 |

**Authored rock** (an inventory of the code, read-only):

| Thing | Where | Built as | Rock colour from | Colliders | Status | Seen from |
| --- | --- | --- | --- | --- | --- | --- |
| West cove face and its three boulders (**the shore**) | `src/place/cove.ts` `cliff()`, `COVE_ROCKS`; Place x -216..-154, z 30..80 | sculpted mesh, 1,594 + 348 triangles, one draw (`cove-view.ts`) | the cove's own recipe (`cove-material.ts` `applyCoveLayers`: raw sandstone pigments `rockR/G/B` 0.58/0.19/0.045, broad bands) | trimesh | final | the landing, the shore climb, the sea ([still](cliff-kit-everywhere/shore-cove-face.jpg)) |
| Home ground round the landing | `cove-ground.ts`: world x 735..885, z -20..110 | the heightfield (wall 9 and the shore's slopes) | **also** `applyCoveLayers`, not `rockLayers` | heightfield | final | as above |
| Shore boulder | `land.ts` (`SHORE_HOP`, Place -165, 39) | 7-sided cylinder | `spireRock` (`#c6a274` with the look on) | cylinder | final | the shore climb |
| Needle Bell | `land.ts` `buildSpire`, Place (8, -10), 105 m | five leaning drums | `spireRock` (`#8c8478`, `#a2978a`; pale in the stills) | a cylinder a drum | final landmark | everywhere on Home ([still](cliff-kit-everywhere/needle-bell-spire.jpg)) |
| Ring Island's stack cut and rim rocks | `src/entities/ring-island/ground.ts` (`STACK_CUT`, ring row 1,210 to 1,580 m), `content/levels/ring-island.ts` (19 rim rocks) | its own heightfield, 3:1 cut walls; dodecahedron stones | `ROCK #7d7a78` by slope (`ring-island/view.ts`); stones `#c4beb0` | heightfield; boxes | final | the ring line; not captured (below) |
| Bell Rock and the greybox legs (leg 2 gorge, leg 3) | `content/levels/leg2.ts`, `leg3.ts`, `content/prefabs/bell-rock.ts`, `entities/route-greybox/` | grey trimesh prisms and boxes | greybox grey | trimesh | **greybox** | the legs' lines ([still](cliff-kit-everywhere/bell-rock-greybox.jpg)) |
| Sickle horizon (islands, chalk cliffs) | `src/entities/sickle-backdrop/view.ts` | flat tops, battered walls | `CLIFF #9c988f`, chalk `#c9c5bb` | none | final backdrop | the horizon |
| Far hills (four cones) | `land.ts` `buildFar` | cones | `#4a4d5c`, `#3b3e4c` | none | stand-ins, hidden once Ring Island's ground is up | the north-east horizon ([still](cliff-kit-everywhere/summit-overview.jpg)) |
| Small boulders, works rocks, town rock plots, caves | `blueprints/props.ts`, `sim/railway-*-layout.ts`, `layout.ts`, `pois/caves/` | props | various | various | final | near paths; boulders, not walls (out of scope; see question 4) |

**What the stills show** ([contact sheet](cliff-kit-everywhere/contact-sheet.jpg); stills one a wall, from where
players see it, all under [cliff-kit-everywhere/](cliff-kit-everywhere/)):

1. **Three rock looks, not one.** The kit's blocks are tan sandstone with deep bevels
   ([reference](cliff-kit-everywhere/canyon-kit-reference.jpg)). The heightfield's gorge walls are the same pigment
   (`rockLayers`) but drawn as 2 m vertical facets, a comb of teeth, right beside the kit on the rim path. The shore is
   a different recipe altogether: smooth, rounded, redder orange with broad soft bands, painted by the cove's material
   both on the sculpted cove face and on Home's own ground round the landing. That is the owner's "different ones near
   the shore".
2. **Far Head** is a smooth banded mesa from the sea: the right colour family, none of the kit's blocks.
3. **The gorge mouth from the sea** shows teeth on the wall faces and grassy slopes painted rock in patches.
4. **Needle Bell** reads pale grey-white, a landmark, not sandstone.
5. **Bell Rock and the greybox legs** are grey boxes, by design until their legs leave greybox
   ([blockout first](../agents/owner-calls.md#blockout-first)).

**Not seen:** Ring Island's stack cut. Its ground only stands once the ring is joined, and the seeded capture
(`--rail-seed ring-joined`) waited behind other worktrees' long runs in the shared queue and was stopped; the
pier-head still shows the far-hill cones that stand in for it. The plan treats Ring Island from its code and asks for a
still before its step.

**Draws and triangles today** at each census camera (`dev/look/evals/cliff-counts.ts`, colour and shadow passes
together; counts only):

| Camera (world cam → look) | Draws | Triangles |
| --- | --- | --- |
| Shore, from the landing (796, 10, 0 → 806, 3, 52) | 152 | 538,111 |
| Shore climb, from the sea (770, 8, -4 → 822, 8, 14) | 364 | 759,697 |
| Canyon climb, up from the bridge (962, 7, -80 → 942, 14, -114) | 196 | 568,125 |
| Gorge, from the rim path (868, 22, -120 → 940, 6, -100) | 362 | 685,057 |
| Gorge mouth, from the sea (975, 8, 232 → 965, 8, 150) | 413 | 752,542 |
| Far Head, from the sea (1500, 14, -80 → 1395, 10, -185) | 318 | 779,767 |
| Summit, over the island (870, 72, 65 → 1080, 0, -500) | 345 | 737,730 |

The canyon kit is in every one of these frames' scene at its full 26 instances and 6,688 triangles a pass (one batch a
piece for the whole island: an instanced mesh culls as one). One capture, on 24 November under load 18 to 15 shared
with another worktree's run: the counts are exact for those frames; nothing here is a timing.

## How the canyon generator generalizes

`dev/prefab/canyon-kit.ts` places pieces by hand-picked stations along two straight legs of one path. It becomes one
generator over the census, `dev/prefab/cliff-kit.ts`, writing one level a area (`content/built/levels/cliff-kit-<area>.json`)
so each area mounts, culls and ships on its own:

1. **Walls from the census.** `cliff-census.ts` exports its walls (vertices, toe and rim cells); the generator reads
   them, not a copy, so a terrain change is a stale artifact (`npm run prefabs -- --check`) as today.
2. **Runs, not stations.** Each area's seen toe is traced into polylines (toe cells in order, simplified to 1 m) and
   faces are laid end to end along them (10 m, 6 m, a gap), sunk 0.5 m, turned to face downhill, as the canyon's are.
   Rim runs take caps with gaps; toes at the sea take bank rock; boulders go at face feet where the verge is wide.
3. **Per-area rules**, one record each: which runs are dressed (seen toe within a stated distance of a tread or rail,
   or at the sea), face widths and spacing, boulder density, flush faces where something behind must stay in view (the
   alcove rule, [d-2026-11-24-canyon-faces-flush](../decisions-look.md#d-2026-11-24-canyon-faces-flush)), and the
   area's gated places.
4. **The tread and gate audit for every area.** `kitPieceProblems` moves to the generator and grows: every collider
   stays 0.4 m outside every tread (`pathAt`, which already includes the shore climb); 6 m from every gated place,
   built from `tech-layout.ts` `PADS`, `SECRETS`, `DEVICES` and `PILLARS` and the sites, not a hand list; outside every
   rail's loading gauge (the trial found 8 of 260 anchors within 6 m of a rail: walls 1, 3 and 10); and **no new way
   up**: a flood of walkable ground with the kit's solids added reaches no cell the flood without them doesn't, checked
   in `npm run level-check` (today Place's flood does not read prop solids, so this is new audit code under `dev/level/`).
   Generation fails on the first broken piece, as the canyon's does.
5. **One mount wait.** Every area's view mounts its pieces through the shared lift-or-wait helper
   (`src/place/clearance.ts` `createLiftOrWait`, landing with `claude/solid-clearance-helper`, bound in
   `src/prefab/instantiate.ts`): no area keeps its own clearance code. A piece that holds a player when its area mounts
   waits, undrawn and not solid, with its set until they are clear (build skill step 9).
6. **The canyon becomes one area** of the generator, its placements unchanged (a byte-for-byte check of
   `canyon-kit.json` against the generator's canyon output is the first step's proof).

**Batches.** Today the canyon's 26 pieces are seven instance batches, one a piece (+14 draws with the shadow pass). One
batch a piece for the whole island would keep draws flat but submit every instance's triangles from everywhere (an
instanced mesh culls as one). One batch a piece **a area** costs up to 14 draws for each area in view but nothing for
an area behind you. The plan takes batches a area, and merges small neighbouring areas (the gorge mouth's two sides;
the north ridge with the gorge north) into one.

## Kit pieces to add

Recipe additions to `assets/src/terrain-kit.py`, one previz round first (owner call
[previz](../agents/owner-calls.md#previz)) from the shore's stills, each in the asset viewer
([asset-viewer](../agents/owner-calls.md#asset-viewer)):

| Piece | For | Size, triangles (rough) |
| --- | --- | --- |
| Sea-cliff face, 6 and 10 m, with a wave-cut foot (a darker undercut band, no overhang solid) | the shore, the gorge mouth, the south sea cliff, Far Head | as the faces, 600 to 900 |
| Low face, 3 m tall | the shore climb's 4 to 16 m walls and short rims where a 14.4 m face would stand above the ground | 300 to 400 |
| Shore rocks, low and dark at the waterline, three sizes | the cove's foot, the landing's rocks, Far Head's foot (terrain-clean's proposed piece 4) | 100 to 300 |
| Corner piece (outside corner, 90 degrees) | rounded headlands (the cove's nose, Far Head) where straight faces leave gaps | 600 |

The cove's three boulders become kit shore rocks inside the cove face's trimesh footprint. The shore boulder
(`SHORE_HOP`, a 0.75 m rock a player can hop onto beside the shore climb) stays where it is with its collider; only its
colour moves to `rockLayers` (design review, finding 2).

## Colour work

One rock recipe for every wall: `rockLayers` (`ground-material.ts`), already shared by the heightfield and the kit.

- **The shore.** `applyCoveLayers` paints its rock from the raw sandstone pigments with its own bands; it takes
  `rockLayers`' `layered` and bed coordinate for its rock term instead (keeping its sand, turf, wet and relief terms),
  on both the cove face and Home's ground round the landing (`cove-ground.ts`). Matched stills from the landing and the
  sea before and after; the cove's tunables (`src/tunables/terrain.ts`) keep their names.
- **Needle Bell** is not changed without the owner (question 3).
- **Ring Island** maps its slope rock (`ROCK #7d7a78`) to `rockLayers` at its step.
- **The Sickle horizon** stays as it is (question 2).

## Steps, area by area

Each step: generate, `npm run prefabs -- --check`, `npm run level-check` (the audit above, all areas), matched
before and after stills from the census cameras plus a walk clip on the area's path, the counts eval, a design-review
note in this plan, then ship on the owner's word. No step waits on a playtest.

0. **Generator and audit.** `dev/prefab/cliff-kit.ts` over the census; the canyon as its first area, byte-for-byte; the
   grown audit (gated places from the layout, rails, the no-new-way-up flood); per-area batches; the shared
   lift-or-wait helper. No new pieces, nothing new in the world. Needs `claude/solid-clearance-helper` merged.
1. **The shore** (owner named it): colour work on the cove and the landing's ground; previz and recipe for the sea-cliff
   face, low face and shore rocks; dress the cove face's foot and nose, the shore climb's walls (wall 9) and the
   landing's rocks. Gated places: the landing, the shore hop, the dock and its sign; the shore climb's 25 to 35 s walk
   to the village ([shore-arrival](../research/shore-arrival.md)) keeps its tread. The shore hop keeps its collider. A
   low face's top beside the climb is above a jump's reach from the tread or sloped, and the no-new-way-up flood runs
   with the low faces in; the stills include the climb from the landing at player height (design review, finding 1).
2. **The gorge from the rim path** (wall 6 and the rest of wall 0 seen from the camp path): the teeth beside the kit
   in the [gorge still](cliff-kit-everywhere/gorge-rim-lookout.jpg).
3. **The gorge's long walls** (walls 2 and 3) seen from the lines and the village; faces where the toe is within 40 m of
   a tread or rail, caps on the rims seen from the village; the rail gauge rule matters here.
4. **The gorge mouth and the south sea cliff** (walls 4, 7, 8): sea-cliff faces and shore rocks, seen from the sea.
5. **The north ridge and the east rail cutting** (walls 5, 10).
6. **Far Head** (wall 1): sea-cliff faces and corners round the head, seen from its line and the sea; its halt's gated
   places.
7. **Ring Island**: colour first, then its stack cut's walls (3:1, along the ring line) and rim rocks as kit pieces,
   after a seeded still from the ring line.
8. **The greybox legs** (Bell Rock, leg 2's gorge, leg 3): when each leaves greybox, its rock is authored as kit pieces
   from the start, not as prisms to dress later.

## Budget

Kit density on the canyon: 26 pieces, 6,688 triangles a pass, along about 58 m of seen toe, so about 115 triangles and
0.45 pieces a metre of dressed toe. Dressing every metre of seen toe on Home (about 1,700 m) would add about 200,000 triangles a pass;
the plan dresses less (only toe near a tread, rail or the sea, the rest by colour and rim caps). Budget a area, colour
and shadow passes together, at its census camera:

| Area (step) | Dressed toe, about | Pieces, about | Triangles added (both passes) | Draws added |
| --- | --- | --- | --- | --- |
| Shore (1) | 90 m | 40 | 21,000 | 14 to 20 (new pieces) |
| Gorge from the rim path (2) | 120 m | 55 | 28,000 | 0 to 14 (shares the canyon's area if merged) |
| Gorge's long walls (3) | 250 m | 110 | 58,000 | 14 |
| Gorge mouth and south sea cliff (4) | 180 m | 80 | 41,000 | 14 |
| North ridge and east cutting (5) | 110 m | 50 | 25,000 | 14 |
| Far Head (6) | 300 m | 135 | 69,000 | 14 to 20 |

**Ceiling** (a guide, not a gate: [performance guides, not gates](../agents/owner-calls.md#performance-guides-not-gates);
the target is [a stable 60 fps](../agents/owner-calls.md#frame-time-60)): at any census camera, at most +30 draws and
+70,000 triangles over today; from the summit, which sees most areas, at most +60 draws and +150,000. **Frame time:**
on the quiet Mac (M1 Max), the median frame at each census camera stays under 16.7 ms and the worst frames do not
regress by more than 1 ms against main. **How it is measured:** the census cameras are added to `dev/look/lib.ts`
`VIEWS`; `npm run perf -- --hardware --view <area> --seconds 10 --verdict <file>` runs on main and on the step's
branch, three times each, alternating, on the Mac with no other look, bot or build running (the verdict stamps the
load at start and end; a run with load over 2 is discarded and rerun). Counts from the counts eval explain a result,
they are not the result. Over the ceiling, the step mitigates before shipping (fewer boulders, caps off the far rims,
the shadow pass off for pieces past 150 m, or merged batches), or the owner is told the cost and decides.

## Level findings

`npm run level-check` on main, 24 November (23 reports, 46.5 s): **canyon kit: 26 pieces, 0 problems**; production
grounding 5,244 placements, 0 problems; machine clearance 0 problems; the failures it prints are planned and later
track (Ring Island's v27 loop, bay and cave centres), unrelated to rock.

`cliff-census.ts --anchors` (trial 6 m faces every 8 m along each seen toe, the kit's rules plus 6 m from rails):

| Wall | Tried | Clean | Problems |
| --- | --- | --- | --- |
| 0 Gorge north and the canyon climb | 58 | 57 | 1 within 0.4 m of a tread |
| 1 Far Head | 52 | 49 | 3 within 6 m of a rail |
| 2 Gorge east wall | 38 | 38 | none |
| 3 Gorge west wall | 30 | 27 | 3 within 6 m of a rail |
| 4 Gorge mouth, east | 8 | 8 | none |
| 5 North ridge | 9 | 9 | none |
| 6 Gorge, rim lookout side | 9 | 9 | none |
| 7 South sea cliff | 8 | 8 | none |
| 8 Gorge mouth, west | 4 | 4 | none |
| 9 Shore climb | 5 | 5 | none |
| 10 East rail cutting | 3 | 1 | 2 within 6 m of a rail |

What this does not prove: the gated places tested are the canyon's own four (the alcove, its stand point, the bell, the
first device pad), so no other area's gates were checked; the rail test is centre-line distance, not the loading
gauge; no trial checks a new way up. Those three are step 0's audit, and every area's step runs it.

## Risks

- **Triangles from the summit.** Areas batched separately still all stand in the summit's view. Mitigation: the
  ceiling above, shadows off past 150 m, rim caps only on far rims.
- **The shore's material swap changes the first thing a new player sees.** Matched stills from the landing and the sea
  before and after; the owner judges the shore before step 2.
- **A piece blocking a sightline** (the alcove case). Flush faces wherever the per-area record names something behind.
- **Rails beside rock** (walls 1, 3, 10). The gauge rule in the audit; trains must not clip a face.
- **The clearance helper** is not on main yet; step 0 waits on it rather than copying the canyon's own wait.

## Open questions (recommended answer first)

1. **Does the shore's cove face stay sculpted with the kit's colour and a dressed foot, or is it replaced by kit faces?**
   Keep the sculpted face, recolour it with `rockLayers` and dress its foot and nose with sea-cliff faces and shore
   rocks: it is walkable at its south end and its collider is tuned to the landing.
2. **Does the Sickle horizon take the kit's colour?** No, not now: it is a distant backdrop with no colliders; revisit
   when it is next touched.
3. **Is Needle Bell a cliff for this pass?** No: it is the island's landmark, read from everywhere, and its pale stone
   sets it apart on purpose; leave it unless the owner wants it sandstone.
4. **Small boulders, works rocks and caves?** Out of scope: they are props, not walls; any that sit at a dressed wall's
   foot are swapped for kit boulders in that area's step.
5. **How far from a path is a wall dressed with faces rather than colour and caps alone?** 40 m from a tread or rail,
   or at the sea: farther walls take colour and rim caps only, which keeps the summit's view inside its ceiling.

## Design review (2026-11-24)

Run by the plan's author in the same context (design-review skill). Read for it: DESIGN.md, owner calls (Look and art,
Level and world building, Performance and devices), the look topic's Current rules and the four entries the brief
names, terrain-clean Part 3 and its design review, direction's phase, and the research index's terrain entries
([shore-arrival](../research/shore-arrival.md): cove to village in 25 to 35 s;
[stylized-terrain](../research/stylized-terrain.md): smooth heightfield plus a small authored cliff kit;
[terrain-art](../research/terrain-art.md): coastal structure before surface detail, two-direction previz). The plan
agrees with all three. Looked at: the ten stills above, from the landing, the sea, the rim path, the climb and the
summit; not seen: Ring Island's stack cut (its seeded capture was stopped, above).

### Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Every cliff and rock wall, the shore's included, takes the kit's treatment | Decided | [d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff) |
| Census first, then area by area with matched stills | Decided | same entry, orchestrator's reading |
| The shore first | Decided | the owner named the shore in the same entry; the brief orders it first |
| Pieces are scenery with colliders; walkable ground stays simple; never a new way up | Decided | [d-2026-11-14-terrain-simple-geometry-cleanup-first](../decisions-look.md#d-2026-11-14-terrain-simple-geometry-cleanup-first), [d-2026-11-24-chunky-every-cliff](../decisions-look.md#d-2026-11-24-chunky-every-cliff) |
| Chunky Sunshine style for every new piece | Decided | [d-2026-11-24-canyon-kit-chunky-sunshine](../decisions-look.md#d-2026-11-24-canyon-kit-chunky-sunshine) |
| Faces sit flush wherever something behind them must stay in view | Default | generalizes [d-2026-11-24-canyon-faces-flush](../decisions-look.md#d-2026-11-24-canyon-faces-flush), which ruled one place |
| The greybox legs get kit rock only when they leave greybox | Decided | [blockout first](../agents/owner-calls.md#blockout-first) |
| One rock recipe: the shore's cove material takes `rockLayers` for its rock | Default | the decision asks for one palette; the method is ours, cheap to tune, judged by matched stills |
| The cove face stays sculpted, recoloured, its foot dressed (question 1) | Default | keeps its walkable south end and tuned collider |
| Needle Bell left as it is (question 3) | New | recommend leave: a landmark set apart on purpose; asked because "every rock wall" could include it |
| The Sickle horizon left as it is (question 2) | Default | distant backdrop with no colliders |
| Faces only within 40 m of a tread or rail or at the sea; farther walls take colour and rim caps (question 5) | New | narrows "every cliff" for far walls; recommend it, since from 40 m on the teeth read as texture and the summit view stays in budget |
| Tread 0.4 m clear, gated places 6 m, rails' gauge, no-new-way-up flood, in every area | Default | carries terrain-clean's finding 6 rules to every area and adds the rails and the flood |
| New pieces: sea-cliff faces, low face, shore rocks, corner | Default | terrain-clean's proposed piece 4 plus what the shore and Far Head need; previz first |
| Ring Island after Home; colour first, stack cut later | Default | terrain-clean question 5 held it while blockout; it is now final, so it gets its own step |
| Budget ceilings and the quiet-Mac frame-time method | Default | [performance guides, not gates](../agents/owner-calls.md#performance-guides-not-gates), [frame-time-60](../agents/owner-calls.md#frame-time-60), [geometry follows prominence](../agents/owner-calls.md#geometry) |
| Props (boulders, works rocks, caves) out of scope (question 4) | Default | they are props, not walls |

Seventeen calls: 6 Decided, 9 Default, 2 New.

### Findings

1. **First sight is the shore** (flow rule 1, [gameplay shapes the environment](../agents/owner-calls.md#gameplay-shapes)).
   The shore climb is the first path a new player takes. Dressing its walls with faces says "not this way" on both
   sides, which is right, but the low face beside the climb must not read as a step: its top is either above a
   jump's reach from the tread or sloped. Step 1 now says the no-new-way-up flood runs with the low faces in, and its
   stills include the climb from the landing at player height.
2. **The shore hop is a play object.** `SHORE_HOP` is a 0.75 m rock a player can hop onto beside the climb, with a
   graded pad under it (`terrain.ts`). The draft swapped it for a kit boulder; that could change its height and reach.
   Changed: it keeps its collider and place, and only its colour moves to `rockLayers` (Kit pieces to add).
3. **"Every cliff" versus the budget.** Dressing every seen metre would add about 200,000 triangles a pass from the
   summit. The plan's 40 m rule is a real narrowing of the owner's words for far walls, so it is a New call with
   question 5, not a silent default.
4. **Sightlines kept** (flow rule 2). The flush rule generalizes the alcove case; each area's record names what must
   stay in view (the canyon's alcove, Far Head's halt, the dock's sign at the shore).
5. **Co-op and solo.** Nothing changes for either: no piece is used, held or shared. The lift-or-wait helper covers a
   friend who is standing where an area mounts (build skill step 9); a late joiner sees the same static pieces.
6. **Reach proof.** The trial anchors prove only the tread and the canyon's four gates; reach (the flood) and the other
   areas' gates are unproven until step 0. Recorded under Level findings.

### Suspect lines

None: the plan changes no copy.

### Owner questions

The five under [Open questions](#open-questions-recommended-answer-first), each with its recommended answer first.
