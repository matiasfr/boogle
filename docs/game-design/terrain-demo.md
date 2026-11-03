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
