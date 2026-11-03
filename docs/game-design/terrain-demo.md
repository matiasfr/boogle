# Dry demo terrain comparison

Local presentation experiment, 3 November 2026. Defaults are unchanged.
`?classic=1&terrain=demo` patches the real home ground; `?proto=place&terrain=demo`
patches Threefold Reach. `&sky=demo&tone=agx&tod=0.24` selects the owner's comparison light.

The existing material receives Ultra Water's dry sand/grass/stone palette, height/slope biome
transitions, filtered baked noise and the shared `ground.ts` sand-ripple normal builder through
`patchNode`. Existing mesh, colliders, cave masks, shadow slots and base normal treatment remain.
Authored vertex paint (including paths and the home court) is replaced in this deliberately literal
comparison. The source's kilometre-scale biome heights are not retuned for Boogle. There are no new
rock meshes, wetness, swash, caustics, water absorption or underwater lighting here.

Optional `terrainPart=today|biomes|no-noise|no-ripples|coarse|rock` comparisons reload the page:

- `today` restores the existing material; `biomes` and `no-ripples` show the same dry biome layer alone.
- `no-noise` replaces only the three biome noise samples with their means; ripple noise remains.
- `coarse` disables the finest shared sand/rock normal octave, retaining the first ripple octave.
- `rock` adds the source's 3D bump builder on steep existing terrain faces, without changing their shapes.

The full `demo` remains the default **only under `terrain=demo`**. No cheaper option was silently selected.
Source: [terrain-demo.ts](../../src/proto/water/terrain-demo.ts). Design principles: **Small and readable**
and **Show, don't tell**. Research: [Ultra Water](../research/ultra-water.md), recommendations 4 and 7.
Results and adoption recommendation: [comparison report](../research/terrain-demo-validation.md).

## Bounded shore geometry comparison

`?classic=1&shore=smooth` replaces only the southern home shore rectangle, x −42.5…42.5 m,
z 10…50 m. `shore=smooth-detail` adds filtered sand ripples, subtle grain/variation and static wet-sand
colour/roughness, keeping the saturated `#efd89d` sand and `#7cc650` / `#4e9a3d` grass.
`&shoreRocks=1` independently replaces this slice's scenery rocks with the demo's deformed,
cavity-coloured geometry in the original stone colours. No `proto=` page (including Round 4) enables it.
Defaults and `src/proto/place/` are unchanged. Use the same demo sky / AgX / .24 flags above.

The slice subdivides each 1.25 m source triangle three ways, yielding 0.417 m spacing, then uses a
2.5 m heightfield smoothing kernel and shallow low-frequency dunes/berms. Its 7.5 m boundary collar
returns positions, colours and face normals to the original triangles; it replaces their indices, rather
than drawing an overlapping overlay. Sand and grass both use smooth normals: the low grassy rise
reads as the same continuous landform, while unmodified inland cliffs retain their facets.

Two small suggestions are included: **soft grass–sand feather** and **tree-base contact pockets**
(displacement fades out within 0.65–2 m of trunks). Court and authored POI paint are protected.
All new state is Local; colliders, height queries, water shore data and prop colliders retain their original values.
The measured visual-ground mismatch reaches about 12 cm and is visible at the worst foot-contact point;
this is an art comparison, not a collision-ready replacement. Adoption needs matching local collision/surface
queries, or less displacement; larger shoreline reshaping would also need matching water shore data.

Source: `src/proto/shore/`. DESIGN.md: **Code first, images by approval**, **Small and readable**,
**Pick how each feature shares state**. Research: [stylized terrain](../research/stylized-terrain.md),
recommendations 6 and 9, and [Ultra Water](../research/ultra-water.md), recommendations 4 and 7.
Boards, contact measurements, costs and recommendation: [shore slice validation](../research/shore-slice-validation.md).
