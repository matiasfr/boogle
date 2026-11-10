# Terrain pass: geometry fidelity and texturing (scope and prototype)

> **Status:** look experiment behind `?terrain=a|b|ab`, off by default, on its branch. Not shipped. Not tested on a device.
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
3. **Ring Island's ground**, once R2b's `ground.ts` exists: make `surface.ts` take a grid descriptor instead of Place's globals, and give the island its parameters as data (pigments, rock threshold, strata strength). The cones have no unwalkable faces, so the look comes from bands, a beach and strata on the steeper flanks, not ledges; draw the 361² grid only within the mounted near-view radius.
4. **Cliff kit (C)** for the gorge rims and Ring Island's works face, as its own plan, because it adds solids and needs level-check reach points.

### Questions for the owner (recommendation first)

1. **Which way should the coast read?** (a) Mostly grass down to a beach, with sandstone only on real cliffs (gorge, a few headlands) — recommended, it follows your 3 November call; (b) Sunshine sandstone on every steep slope, as B shows; (c) Today's sandy skirt.
2. **Spend triangles on a denser drawn grid?** (a) Only on unwalkable cells (about +22 k triangles island-wide at 1 m, +111 k at 0.5 m) — recommended; (b) the whole land at 1 m (about +232 k); (c) none, shading only.
3. **Strata strength.** (a) Subtle beds as in B's cliff-foot still — recommended; (b) bold, Sunshine-strong bands; (c) none.
4. **After the material pass, start a cliff kit for the gorge rims?** (a) Yes, as a separate plan with its own colliders — recommended; (b) not yet.

## Limits

Stills are frozen frames, captured on a loaded machine; they say nothing about motion, shimmer or frame cost. The wedge is one area of one island. B's look is the cove's tuned parameters, not retuned for the gorge. Not tested on a device.
