# Terrain pass: geometry fidelity and texturing (scope and prototype)

> **Status:** look experiment behind `?terrain=1` (round two; `a`, `b` and `ab` stay for comparison), off without the parameter. Round one shipped behind the flag (#1453); round two is on its branch. Not tested on a device. Owner, 10 November: fix round two's problems on the wedge, then apply it to all of Home after a quiet-machine performance run; start Ring Island's first landform step (below).
> **Owner's ask (10 November 2026):** "Should we do a pass on terrain geometry if we're filling things out? I think we should have more terrain fidelity so things look better, and do texturing pass, both on the existing island, and also on ring island now that we're building it out."

Binding calls this works inside: [smooth, textured terrain](../decisions.md#look) (5 November: Odyssey-style smooth forms, rock by slope, Sunshine strata as a tunable height band), [terrain follows gameplay](../decisions.md#look) (5 November), "the ground keeps its current soft edges" (4 November), islands sit close to the sea with cliffs the exception (3 November), the Fresh palette, baseline Standard shading again (10 November, toon B removed), no rim light, the M1 Max as the average target and the M4 iPad Pro as the floor, and "what looks solid is solid". Research it builds on: [stylized-terrain](../research/stylized-terrain.md), [terrain-texturing](../research/terrain-texturing.md), [terrain-art](../research/terrain-art.md), the [terrain pilot](terrain-pilot.md) and [look-pass](look-pass.md).

**Hard constraint, kept:** gameplay heights do not move. The collider (`terrainCollisionTiles`), `H` and `surfaceHeight`, the shore provider and coast bake (`src/proto/place/water.ts`), the tree catalog, level-check and the grounding audit all keep reading `terrain.ts`'s 2 m grid, which the prototype never writes. No sim, net, world, server or `WORLD_NS` change.

## What the terrain is today (Place, which holds Home)

| | Number | Source |
| --- | --- | --- |
| Grid | 2 m cells, 391 × 271 vertices (780 × 540 m), heights baked once from `ground()` plus pads, rail beds, paths, cove | `src/proto/place/terrain.ts` |
| Drawn triangles | **241,836** in one mesh: 208,988 grid + 26,400 offshore apron rings + 6,448 for the cove's 1 m patch (counted in the running game) | `land.ts` `buildMesh` |
| Draws | **1** (the ground; `frustumCulled = false`, receives shadows, casts none). The cove's kit is 2 more | `land.ts`, `cove-view.ts` |
| Land cells by slope | 38,705 land cells: 25,490 flat (ny > 0.95), 3,038 gentle, 6,487 walkable-steep (0.55–0.8), **3,690 unwalkable** (ny < 0.55) | `.look` stats script, this branch |
| Materials | 1: `groundMaterial()` (look.ts: vertex-colour grass/sand/path, per-pixel facet rock with sine strata) plus the cove's textured layers masked to the cove region | `look.ts`, `cove-ground.ts`, `cove-material.ts` |
| Textures | the cove's three 512² RGBA tiles, **4.0 MiB** with mips (already resident) and an 11 KB slope texture | `cove-textures.ts` |
| Collider | Rapier heightfields on the same anti-diagonal triangles (the cove patch at 1 m) | `terrainCollisionTiles` |
| Normals | `computeVertexNormals` over 2 m triangles; grass smooth, rock flattened per pixel | `land.ts`, `look.ts` |
| Frame cost at Home | Last recorded: 5 Nov perf pass, production solo **town 209 draws / 65 shadow draws / 1.09 M triangles, CPU 4.7 ms** (contended, no GPU time); 4 Nov graphics-switch report, town GPU span **7–11 ms** at 1440×900 on the M1 Max (contended, wide spread). No quiet GPU baseline exists | [perf-pass-2026-11-05](../research/perf-pass-2026-11-05.md), [graphics-switch-costs](../research/graphics-switch-costs.md) |

Ring Island's ground is not built yet. R2b plans a 2 m, 361² heightfield (130,321 vertices, about 259,000 triangles if drawn at grid density) from `ringHeight` (`src/proto/greybox/ring-cones.ts`): the max of four straight cones. Every cone is walkable (steepest 150 m over 130 m, ny 0.66), so it has **no cliffs at all** today; its creases are where cones meet. Another agent owns `src/entities/ring-island/`; nothing here touches it.

## What reads as low fidelity, and why

From today's stills (sheets below):

1. **Cliffs are two cells wide.** The gorge drops about 17 m over a 3 m wall, so each wall is one or two 2 m cells: long vertical slivers that shade as a few big gradients, with a sawtooth "teeth" pattern along rims at distance. This is the biggest gap to the paintings, and a denser grid of the same height function cannot fix it: there is no more shape in the data.
2. **Uniform colour on slopes.** The whole coast band (6,487 walkable-steep cells) is one sandy tan from the rim to the water, so the island reads as a beige skirt from across the sea, not grass, rock and beach.
3. **Path edges show the grid.** Paths are a 2 m vertex-colour blend: soft, but with a regular sawtooth at the edges in the middle distance.
4. **The waterline is a polyline of 2 m segments**, and nothing marks it except the water's own foam.
5. **Grass lighting has faint 2 m diamonds** from per-vertex normals over the triangulation (minor at play distance).
6. Tiling is not a problem today: outside the cove nothing tiles.

## Candidate directions

| | A. Geometry: denser drawn mesh, crisp creases, strata ledges + procedural bands | B. Texturing: the cove's textured layers over today's mesh | C. Authored cliff kit (not prototyped) |
| --- | --- | --- | --- |
| What | The same grid drawn at 0.5 m (or 1 m): walkable ground follows the collider within 5 cm, with normals from a smooth (Catmull-Rom) surface; unwalkable rock gets height-keyed strata ledges (2.4 m period) within 0.25 m of the face; colour from position and normal in TSL: rock by the collider's steepness with beds keyed to the same ledges, darker foot, dry lip at the rim, beach and wet band only by the sea, worn paths with an irregular edge. No texture reads | `applyCoveLayers` (three 512² tiles, triplanar rock, Sunshine strata, height-blended turf/sand, wet sand) as it already ships in the cove, over 2 m geometry | Code-built or Blender rock pieces (4–8 m planes, ledges, grass caps) placed along rims, trimmed into the heightfield, own colliders per "what looks solid is solid" |
| Triangles | wedge 7,884 → 126,144 at 0.5 m (16×) or 31,536 at 1 m (4×). Whole island land (38,705 cells) at 1 m: about +232 k; at 0.5 m: about +1.16 M; only the 3,690 unwalkable cells: +22 k at 1 m, +111 k at 0.5 m | +0 | 2–8 k per 30 m of gorge (research budget) |
| Draws | +1 per batch (the wedge is its own mesh) | +0 island-wide (it is the existing material); +1 here | +1–4 per batch |
| Texture bytes | 0 | **0 new**: the cove's tiles are already resident (4.0 MiB) | 0 if it shares B's material |
| GPU memory | wedge at 0.5 m 5.6 MiB of buffers, at 1 m 1.4 MiB | 0 | small |
| Shader cost (iPad) | ~30 ALU ops, no samples, on terrain pixels only | ~9 texture samples per terrain pixel (3 triplanar rock, 3 data, turf, detail, macro); already paid on cove pixels today, would be paid on all ground | as B |
| Risks | sub-pixel ledges shimmer at distance (no far LOD by default); ledges only appear on the 3,690 truly steep cells, so most of the island looks the same; vertex-attribute masks still show a soft 2 m rhythm | turns every slope with ny < 0.8 into sandstone, including the walkable coast band, which contradicts "cliffs are the exception"; the cove's lighter, yellower turf makes a seam unless it goes island-wide; detail cannot hide 2 m silhouettes | authoring time; collider work (new solids), so it is not look-only and needs level-check reach points |
| Ring Island as data | a `drawnGround(grid, masks)` built from any grid (`gridBedAt`-style descriptor), not Place globals; tolerances and ledge period as numbers | per-island pigment set and slope threshold as tunables in `COVE_PARAMETERS`-style data | a kit catalogue plus a rim curve per island |

Edge treatments, for every option: shore — a beach-and-wet band keyed to the sea's height and to distance from the coast (not every low inland floor; the gorge floor is excluded), with the existing foam lip doing the rest. Paths and track beds — the cut stays in the collider grid; the drawn ground adds wear and an irregular painted edge (A) or the cove's path pigment (B); a real notch or retaining edge is kit work (C). Land against the far LOD — today there is no far LOD by default (`farGround` is Dev-only), so the risk is shimmer, not popping.

## The prototype

`?terrain=a|b|ab` on Place (and the production game, which is Place's world). One wedge, Place-local x −104..4, z 50..196 (world x 896..1004): the village's south slope, the path's switchback down into the gorge's stem, the south footbridge, both gorge walls and the south coast. Default off returns before touching anything, so the ground is exactly today's.

- `src/proto/terrain-pass/surface.ts`: pure numbers (no three.js). `drawnHeight` = collider triangle + bounded offset; `buildWedgeSurface(sub, fine)`.
- `src/proto/terrain-pass/materials.ts`: `bandsMaterial` (A, no textures) and `coveLayersMaterial` (B). Both start from `groundMaterial()` and fade to it over the wedge's last 10 m.
- `src/proto/terrain-pass/index.ts`: removes the wedge's cells from the main ground's index and adds the wedge mesh. `&terrainSub=1|2|4` and `&terrainMat=base|bands|cove` isolate geometry from shading.
- One wiring hunk in `src/proto/place/land.ts` (an import and one call after `addFarGround`). Dev tools: `dev/terrain-pass/{prove,shots,setup}.ts`.
- To remove: delete the two folders and the hunk.

### Tolerance, proved

`node dev/terrain-pass/prove.ts 1 2 4` checks every drawn vertex against the collider. A drawn triangle always lies inside one collider triangle (same anti-diagonal split, `sub` divides the cell), so the offset is linear across it and the vertex maxima bound every drawn point. A vertex on a rim is bounded by its flattest neighbouring collider face.

| Drawn cell | Vertices | Triangles | Walkable max (vertical) | Steep max (along the face normal) | Protected max | Build |
| --- | --- | --- | --- | --- | --- | --- |
| 1 m | 16,023 | 31,536 | 0.050 m | 0.250 m | 0.00001 m | 79 ms |
| 0.5 m | 63,581 | 126,144 | 0.050 m | 0.250 m | 0.00003 m | 262 ms |

Protected ground (paths, pads, graded beds, and a disc around each of the 41 trees and rocks in or beside the wedge) is exact; the worst offset under any tree or rock footprint is 0. Feet on walkable ground are within 5 cm of the drawn surface; nobody stands on steep rock, where a 25 cm difference shows only if you press against a wall. For context, today's trees already stand up to **1.27 m** off the collider under their trunks (they take the nearest grid vertex's height), far beyond anything this adds.

### Stills (same framings, desktop 1280×800 and phone 844×390)

Sheets (each: Today, A, B, A+B), in this worktree:

- Wide from the village: `/Users/matiasfranco/Developer/boogle/.claude/worktrees/agent-a7e695d9d8613659e/.look/terrain-pass/sheets/wide-desktop.png`, `…/wide-phone.png`
- Cliff foot with Buddy: `…/sheets/cliff-desktop.png`, `…/cliff-phone.png`
- Shore edge: `…/sheets/shore-desktop.png`, `…/shore-phone.png`
- Far, across the water: `…/sheets/far-desktop.png`, `…/far-phone.png`

Raw cells and the shot manifest: `.look/shots/terrain-pass-2/`. Frozen stills only: no evidence of motion, shimmer in motion or GPU cost.

What I saw:

- **Wide.** Today: grey cliffs with sawtooth rims, the path's edge a regular zigzag. A: the path reads hand-cut (irregular edge, worn middle) and its ramp into the gorge is clearer; the cliffs barely change at this distance. B: the gorge walls read as warm Sunshine sandstone with beds, the strongest change in the set; but the cove's lighter lime turf makes a visible seam where the wedge ends. A+B: B's cliffs with A's path.
- **Cliff foot.** Today: the wall is a handful of long slivers. A: finer facets and small ledges at the foot, a darker foot, beds that follow the ledges; but one rust bed is a broad 2.4 m stripe that looks painted on, and the wall's big silhouette is unchanged (the data has no more shape). B: sandstone beds give scale and warmth, yet the 2 m slivers still show through. A+B is the best of the four up close. Buddy's feet sit on the ground in all four.
- **Shore.** This framing shows the real issue: the coast here is a 15 m walkable slope, not a cliff. A paints a narrow beach at the waterline, but its sand blobs come out near-white and glowing on the low shelves (too bright a pigment) and the gorge mouth gets a dark foot band. B paints the whole coast slope as orange sandstone, which makes every coast a cliff (against the 3 November call) with a yellow beach strip at the water.
- **Far.** No seam against a far LOD (there is none by default). A's beach line reads well from the sea as a thin bright edge. B's wedge shows as an orange rectangle with hard vertical edges in the coast: a wedge-only material is obvious from afar, though it matches the cove's orange to the left, so island-wide it would be coherent.
- **Phone.** Same reads at 844×390; A's foot ledges are too small to read there, B's beds still read.

### Costs measured

| Variant | Ground triangles drawn (exact, counted in the page) | Draws | New textures | Notes |
| --- | --- | --- | --- | --- |
| Today | 241,836 | 1 | 0 (87 textures) | |
| A (0.5 m) | 233,952 + 126,144 = 360,096 (+49%) | 2 | 0 (87) | |
| A (1 m) | 233,952 + 31,536 = 265,488 (+10%) | 2 | 0 (87) | |
| B | 233,952 + 7,884 = 241,836 (+0) | 2 | 0 (87): shares the cove's tiles | the +1 draw goes away island-wide |
| A+B (0.5 m) | 360,096 | 2 | 0 (87) | |

Frame time: **not measured.** `npm run heartbeat` showed other agents' looks running, and the 1-minute load stayed at 12–20 throughout. Frame draw-call totals from a look eval read zero in this harness, so the draw column is by construction (one extra mesh, no shadow cast). Not tested on a device.

## Recommendation and rollout

**Recommendation: B's material island-wide, retuned for this island, with A's edge work folded in; spend geometry only where the data has shape (cliff kits, C), not on a denser grid everywhere.** A denser drawn mesh of the same grid buys little away from the 3,690 steep cells (the information isn't there) and costs triangles everywhere; the texture layer is already paid for and does the most for the least. Concretely:

1. **The wedge, round 2** (this branch). One material: B's layers with (a) rock only below ny ≈ 0.55 (unwalkable) so the walkable coast band stays turf and beach, (b) the turf pigment matched to today's grass so there is no seam, (c) A's sea-only beach and wet band (darker, not glowing), A's path wear and rim lip; and A's 1 m ledges on unwalkable cells only. Touches only `src/proto/terrain-pass/`. Stills again at the same framings, then a real-time clip passing the cliff at 12 m/s for shimmer.
2. **The whole of Place.** Fold the material into `groundMaterial()` and drop the cove's region mask (one material, no extra draw); rebuild only steep cells at 1 m inside the main mesh, or as one extra batch. Touches `look.ts`, `cove-ground.ts`, `land.ts`'s mesh build, `docs/game-design/graphics.md`. Needs a quiet-machine `npm run daily -- perf` before and after at town, T1 and the cove, and an owner look. Collider, `H`, shore bake and catalog unchanged.
3. **Ring Island's ground**: a landform first (heights), then this material on it as data. See [Ring Island: a landform people could live on](#ring-island-a-landform-people-could-live-on).
4. **Cliff kit (C)** for the gorge rims, as its own plan (owner: yes; nothing written for it yet), because it adds solids and needs level-check reach points.

### Questions for the owner (recommendation first; answered below)

1. **Which way should the coast read?** (a) Mostly grass down to a beach, with sandstone only on real cliffs (gorge, a few headlands) — recommended, it follows your 3 November call; (b) Sunshine sandstone on every steep slope, as B shows; (c) Today's sandy skirt.
2. **Spend triangles on a denser drawn grid?** (a) Only on unwalkable cells (about +22 k triangles island-wide at 1 m, +111 k at 0.5 m) — recommended; (b) the whole land at 1 m (about +232 k); (c) none, shading only.
3. **Strata strength.** (a) Subtle beds as in B's cliff-foot still — recommended; (b) bold, Sunshine-strong bands; (c) none.
4. **After the material pass, start a cliff kit for the gorge rims?** (a) Yes, as a separate plan with its own colliders — recommended; (b) not yet.

## Owner's answers (10 November)

To all four questions above: "Yes, recommended." So:

1. The coast reads mostly as grass down to a beach; sandstone only on real (unwalkable) cliffs.
2. Denser drawn triangles only on unwalkable cells.
3. Rock layers stay subtle.
4. A cliff kit for the gorge rims, as a separate plan (not written yet).

Later the same day, on Ring Island: "For the ring island, the terrain should be more detailed and organic most likely, especially if people live there." Logged in the [decision log](../decisions.md#look).

**Round two and the island, answered later on 10 November** (decisions page, "question: answer"), each as recommended:

- Terrain round two (see it at boogle.club/?terrain=1): "Fix those on the wedge, then apply to all of Home after a quiet-machine performance run". Read as: fix the problems the round-two stills below name (the green coast patch seen from the sea, the faint strata beds) on the wedge, then do step 2 below once `npm run daily -- perf` has been run on a quiet machine before and after.
- Start the island's first landform step now?: "Yes, start it" (see [the smallest first step](#the-smallest-first-step)).
- Opening sealed buildings: "The two cottages on the way in from the dock, then the other two, then a room behind the Ring Island works wall" (the order for "every building can be walked into"; not part of the terrain work).

## Round two (`?terrain=1`)

One variant on the same wedge, built on those answers. Files: `surface.ts` (`buildSteepSurface`), `materials.ts` (`roundTwoMaterial`), `index.ts` (`1`, or a bare `?terrain`, picks it; `a`, `b`, `ab` stay).

- **Geometry.** Walkable cells keep today's 2 m triangles exactly (no smoothing offset at all). The 395 unwalkable cells in the wedge are drawn at 1 m with the strata ledges. Crack-free without fans: a 1 m vertex moves only when every cell it touches is a 1 m cell, so a midpoint on an edge shared with a 2 m cell, or on the wedge's border, stays on that edge's line. Grass normals come from the smooth surface (lighting only); rock keeps its facets.
- **Colour.** Walkable ground uses today's vertex colours and look.ts's exact lawn recipe, but without its per-pixel facet rock, which is what painted the whole walkable coast slope tan. Rock only where the collider is unwalkable, or where the broad 3 m slope is (so a few walkable cells inside a cliff face don't sprout grass blotches): the cove's triplanar rock tile (shared, already resident) on a pigment halfway between the cove's sandstone and today's tan, beds keyed to the 1 m ledges at about a third of the cove's contrast, no rust bed. A's irregular path edge and worn middle in today's path pigment. Sand 68–80% of today's brightness and darker again in a wet band at the sea, which fixes A's glowing patches. A dry lip at the rim only. It fades to today's material over the wedge's last 24 m.

**Heights, re-proved** (`node dev/terrain-pass/prove.ts`): round two has 5,535 vertices and 10,254 triangles; walkable max offset **0** (3,390 vertices), unwalkable max **0.25 m** along the face normal (528 vertices), protected (paths, pads, trees, rocks; 1,617 vertices) **0**. Variant `a` is unchanged (0.05 m / 0.25 m / 0.00003 m).

**Stills.** Sheet (desktop 1280×800, today against round two: cliff foot, wide from the village, shore, far from the water): `/Users/matiasfranco/Developer/boogle/.claude/worktrees/agent-a7e695d9d8613659e/.look/terrain-pass/sheets/round2.png`. Wide at phone width (844×390): `…/sheets/round2-wide-phone.png`. Cells: `.look/shots/terrain-r2b/`. What I saw:

- **Cliff foot:** a warm sandstone wall with 1 m facets and small ledges in place of today's long slivers; the beds are faint (subtle, as asked; possibly too faint to notice). The painted rust stripe is gone. Buddy's feet sit on the floor.
- **Wide:** the gorge walls read as warm rock against the grass; the path's edge is irregular instead of a zigzag; no grass seam at the wedge's near edges. Where the gorge wall leaves the wedge (left) it fades from warm to today's grey over the 24 m blend: visible as a gradual change, not a line.
- **Shore:** the walkable coast slope is grass down to the water, as asked, with sandstone only on the gorge mouth's real cliff. The glow is gone; a pale, damp-looking strip remains along the lowest sand.
- **Far:** no orange rectangle. What remains is a **green patch**: inside the wedge the coast slope is grass, outside it is still today's tan, so from the sea the wedge reads as a green stretch of coast between tan ones. That is the coverage change itself, not a seam, and it goes away only when step 2 applies the same rule to all of Place.
- **Phone, wide:** same reads as desktop.

**Costs.** Ground triangles, exact, counted in the page: today 241,836; round two 233,952 + 10,254 = **244,206 (+2,370, +1%)**. Draws: +1 (the wedge's own mesh, no shadow cast), by construction. New textures: **0** (88 before and after; the rock tile is the cove's). Shader: three texture samples (the triplanar rock tile) on wedge pixels, against the cove's nine. Frame time **not measured**: the 1-minute load was 12–13 at the time. Not tested on a device.

### What step 2 (all of Place) needs

Not started. To apply round two to the whole island:

1. **Material.** Fold `roundTwoMaterial`'s rules into `groundMaterial()` (look.ts) so there is one ground material and no extra draw; retire the per-pixel facet-rock rule; keep the cove's region (its kit and fine patch keep `applyCoveLayers`) and check the join at the cove's edge.
2. **Geometry.** Build the 1 m ledges for the 3,690 unwalkable cells inside `land.ts`'s mesh (about +22 k triangles island-wide), with the same "move only when every touching cell is 1 m" rule; `far-ground.ts` (Dev `farGround`) has to learn the mixed cells or skip them.
3. **Proof of heights:** `prove.ts` generalised from the wedge to the island (it already reads only the collider's grid and protection masks); `npm run level-check` and the grounding audit unchanged by construction.
4. **Performance:** a quiet-machine `npm run daily -- perf` (1-minute load under about 6, bot queue empty) before and after, at town, T1 and the cove, desktop and phone tier. Watch triangles (+~22 k), shader cost of three extra samples on every ground pixel, and draws (should be +0).
5. **Looks:** the same four framings plus the cove, the village from spawn and a real-time clip passing the gorge at 12 m/s for shimmer on the ledges; update `docs/game-design/graphics.md`; one proof still in the ship. Not a `WORLD_NS` change.

## Round three (14 November): paths first, then the wedge, then all of Home

1. **Owner, 14 November:** "One thing I want to call out of many of the things that we could improve, is that the trail could have basically more of a distinction between the path, and the geometry can be more intentional. For example, when you're going up the canyon path, it's the same texture and color as the sides of the valley wall, but it should be more clearly looking like a path, I think."

Also binding from the same day: [Place for the look, not the cost; terrain may change](../agents/owner-calls.md). For this job the hard constraint above stays (drawn mesh and material only); ground that would need real reshaping is listed below as proposals, not done.

### Step 1: paths

- [x] Before stills, the canyon path (the bold path's climb up the gorge's east wall, Place-local (−41.5, −88) to (−61, −147)): walking up, looking back down, from across the valley.
- [x] Diagnosis.
- [x] Every trail drawn as a path, all of Home, no flag.

**Why the canyon path and the valley wall looked the same.** The path was in `PATHS` and its mask was not lost: three things added up.

1. **The same pigment.** The path was the vertex colour `#e0b271` × 0.85 through the `sand` palette; the rock was `#a98558`..`#d0a872` through `stone`. Under Fresh that is path (188, 163, 119) against rock (158, 139, 108)..(195, 176, 140): the path's colour sits inside the rock's range, same hue.
2. **The same texture: none.** Both were flat colour; the only difference was that rock is flat-shaded per facet.
3. **No edge.** The mask was a 2 m vertex blend that reached half-way up the cut walls (0.5 at 4 m from the centre line, where the wall is already 3 to 10 m up), and the per-pixel facet-rock rule overrode it wherever a facet was steeper than ny 0.82: 17 to 38% of the painted width on the gorge stretches. So the tread ended wherever a facet happened to turn, in a 2 m sawtooth, with nothing marking it.

The collider is not the problem on the bold path: it already has a level bench about 6 m wide cut into the wall there.

**What paths are now** (`src/place/path-field.ts`, `src/place/path-surface.ts`; one call in `land.ts` after every other ground layer, one in the wedge):

- A distance field of the paths (`PATHS` and the shore path, footbridge spans left out) baked once into one RGBA16F texture, 1 m texels over the land's grid (781 × 541, 3.4 MB, no mips): distance to the tread's edge, the stretch's grade, the path's own height. Bilinear filtering of a distance field gives an edge far finer than the 2 m cells; the feather is one pixel wide (`fwidth`), so it holds from across the sea.
- The tread is 6 m wide on bold paths and 3.8 m on the others, inside the level strip the terrain grades (7.2 m and 4.8 m), with a hand-cut wander of about ±0.3 m. It wins over slope rock within its width wherever a facet is ground (ny > 0.66); a wall cut beside it stays rock.
- Brown compacted earth, lighter down the middle, mottled, fine grit up close. A dark cut edge with a painted bank (the normal leans in over the last 0.4 m, so one side catches the sun and the other is shaded), a darker verge out to about a metre (grass, or the foot of a cut wall), small stones along the edge, and timber risers square across the tread on climbs steeper than 1 in 8, one per 0.6 m of the path's own height.
- The 2 m vertex blend no longer paints the path; it tints the grass beside it dry.
- **Drawn against collider: 0.** No vertex moves; the bank and risers are shading. A real inset of a few centimetres would show only through its normals, which is what the painted bank gives, and the 2 m mesh cannot carry a sub-metre lip.

### Ground that needs real reshaping (proposals for a later ground step; not done here)

From `node dev/terrain-pass/path-ground.ts` (the collider across each tread every 2 m; Place-local metres, add 1000 to x for world):

| Where | What the ground does | Proposal |
| --- | --- | --- |
| Quarry path, west descent, (−71, 139) to (−49, 148), y 12.9 to 7.5 | 34 m with almost no level tread (0 m of 3.8 m at (−60, 148), 2.9 m cross fall) between walls 4 to 7 m high | Cut a 4 m bench: widen the graded strip from 2.4 m to 3.6 m half width here and move the centre line 1 m off the wall |
| Quarry path, east climb, (−19, 117) to (5, 155), y 1.7 to 11 | Level tread 0.5 to 1.5 m of 3.8 m, a 7 to 9 m wall on one side, a drop on the other | The same 4 m bench; a landing (6 m, level) at the turn near (−10, 150) |
| Bold path, west descent, (−101, −118) to (−57, −78), y 17 to 1.7 | Level width 1.5 to 3.5 m of 6 m, cross fall up to 1.4 m at the foot (−61, −80) | Level the tread across its width; a landing where it turns at (−82, −95) |
| Bold path, the canyon climb, (−42, −88) to (−61, −121), y 1.7 to 12 | Level 2.5 to 3 m of 6 m on the lower third, 1.25 m cross fall at (−56, −112) | Level across; keep the 6 m bench |
| Bold path, the top of the climb, (−61, −145) to (−76, −167), y 18.5 to 22.7 | Level 1 to 2 m, cross fall up to 1.4 m as it leaves the wall | Level across, ease the bend at (−80, −166) |
| Shore path, (−177, 27) to (−159, 32), y 9 to 15.6 | Level 0.5 m of 6 m: the climb from the landing is a tilted ramp | A levelled tread with a real cut bank uphill (0.3 to 0.5 m) |
| Every gorge bench | The wall beside the tread is one or two 2 m cells of sliver triangles | The cliff kit (plan step 4): retaining edges and rock faces with their own colliders |

Each is a heights change: collider, `H`, level-check and the tree catalog move with it, so it is its own step.

## Ring Island: a landform people could live on

Proposal only, not built. Owner: "For the ring island, the terrain should be more detailed and organic most likely, especially if people live there."

**Today** (#1452, `src/entities/ring-island/ground.ts`): a 2 m grid (376 × 361) that is the max of four straight cones (`RING_CONES`), carried to the sea bed, graded to a 7.4 m fill under the island halt and capped at 6.5 m under the loop deck and its neck. 85,758 land cells, of which 46,252 are nearly flat and **one** is unwalkable; about 200,000 triangles drawn, vertex-coloured by which cone stands highest, sand under 2.6 m. The path to the summit lookout is a list of fixed world points whose beams follow `islandH`; the lookout sits on the main cone's top (about 66 m). It reads as what it is: four smooth cones with no place to put a house.

### What is heights and what is surface

| Change | Heights or surface | What it moves |
| --- | --- | --- |
| Shelves and terraces, a cove, ridges and gullies, a softened summit, a real beach shelf | **Heights** (`ground.ts`'s `graded`) | The heightfield collider and `islandH` (recovery, saved pose); the path's beams and the lookout (they follow `islandH`, so they move with it, but the path's fixed waypoints may then cross a gully or a terrace riser); `test/ring-island-ground.test.ts` (it pins the ground to the cones within 5 cm off the fills); `level-check`'s ring report (`dev/level/ring.ts`: clearances under decks, swimming access, the loop's west arc); the coast bake region (re-bakes at load); the far view (`buildFar`'s cones would no longer match the near view at the 500/650 m hand-over) |
| Grass, sand, rock colour by slope and height; beach and wet band; worn paths; strata | **Surface** (a material, as round two) | Nothing physical |
| Trees, hedges, walls, gardens, houses on shelves | **Placed objects** | Solids where they look solid; each needs a ground height from `islandH` |

**Fixed by the layout, must not move** (`src/sim/railway-ring-layout.ts`): the track and formation, the gap (hinge, leaf, toe), the brace platform and its steps, the halt and its platforms, the loop and its neck, the ramps (`RING_RAMPS`), the bents (`RING_PATH`), the recovery points (`RING_RECOVERY`), the jib and railhead kit. In ground terms: the halt fill, the loop grade and every clearance under a deck stay exactly as `ground.ts` grades them today, and nothing rises within a keep band around the track.

### The proposal

A landform written as data on top of the cones, still in `ground.ts`, inside a **keep band** (no change within 25 m of the track, the halt fill, the loop and neck, the ramps and the recovery points; blended back to today's graded height over 15 m beyond it):

1. **A real beach shelf** on the south and west shores: a gentle 1-in-12 apron from the waterline to about 2.5 m, then the cone resumes. Where people arrive and boats would land.
2. **Two shelves (terraces) for dwellings** on the main cone's west and north flanks, at about 14 m and 26 m: each 20–30 m deep, flat to 1 in 30, with a 2–3 m riser that steepens to unwalkable for a short stretch so a low wall or rock outcrop can sit on it. A third, wider shelf east of the halt at the works yard's level (the yard's deck is already at the platform's height) so the works sit on ground instead of on a deck over a slope.
3. **One cove** on the north-west shore, about 60 m across, between the west cone and the main cone: the shoreline pulled in, a small beach at its head. A place for a fisher's hut or a jetty later.
4. **Ridges and gullies** on the cone flanks outside the shelves: two or three low ridges (1–3 m) running downslope, with gullies between that carry the eye and a footpath; deterministic sums of a few sines and distance-to-line terms, like Place's `ground()`, no noise library.
5. **A softened summit**: the main cone's top rounded into a 20 m plateau at about 62 m for the lookout, so it stands on ground rather than on a point; the north cone (146 m) keeps its peak as the island's landmark.

**Before / after, in words.** Before, from the halt: four smooth green cones under a ring, a sand band at the waterline and a path drawn straight up a featureless slope to a lookout on a point. After, from the same spot: a pale beach curving away west to a small cove; behind it the hill steps up in two grassy shelves edged with short rock risers, a few houses and garden walls on them; a gully with a footpath zig-zagging between them; the works yard on its own flat east of the halt; the lookout on a small round top, the tall north peak behind it. Same island, same track, same halt: it now looks like somewhere people chose to live.

### The smallest first step

**Owner, 10 November: "Yes, start it".** **Heights, outside the keep band, in one place: the beach shelf and the lower dwelling shelf on the west flank, plus round two's surface rules.** It touches nothing the layout fixes (the keep band covers the track, halt, loop, neck, ramps and recovery points). Cost: the same 376 × 361 grid and about the same 200 k triangles (a few thousand more land cells where the beach widens), one material (round two's, as data: pigments and thresholds), 0 new textures, build time well under a second. What it needs alongside: `test/ring-island-ground.test.ts` changed from "the cones within 5 cm off the fills" to "the cones within 5 cm inside the keep band, and 50 cm under every planned deck" (the second half stays as is); the far view drawn from the same heights (a decimated mesh of the grid instead of `buildFar`'s cones) so the 500/650 m hand-over doesn't pop; `npm run level-check` (ring report) and the `ring-island-walk` eval rerun; the path's waypoints rechecked against the new shelf.

### What to settle before R3a–R6

It is cheaper to change the island's heights now, before the v27 rules and bot depend on them:

1. **The island's landform heights** (the keep band, the shelves, the cove, the summit plateau), because the bot's walk, the recovery search and the level report all read `islandH`.
2. **The summit path's line**: its waypoints are fixed world points today; route it along a gully and across the shelves before the bot learns it.
3. **Where dwellings and the works yard stand** (which shelf, at what height), before any folk, jobs or prompts are placed on the island.
4. **The far view's source**: cones or the real grid, decided once, so the near/far hand-over matches.
5. **The ring report's thresholds** for the new ground (ground under decks, swimming access to the halt, the loop's west arc), so v27's checks are written against the final shape.


## Limits

Stills are frozen frames, captured on a loaded machine; they say nothing about motion, shimmer or frame cost. The wedge is one area of one island. B's look is the cove's tuned parameters, not retuned for the gorge. Not tested on a device.
