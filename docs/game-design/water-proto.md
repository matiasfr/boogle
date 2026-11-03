# 6.26b Prototype: Ultra Water demo scene (`?proto=water`)

Ultra Water's scene, rewritten in TypeScript and TSL inside Boogle's single WebGPU renderer. The default starts
from the demo's Lagoon view; `&v=pop` keeps our previous colour grade over the same scene. The gut question is
**Does this look like the demo, here?** Serves DESIGN.md **Toys before chores** and **Show, don't tell**.

The owner's 2 November feedback is recorded under Look in [boogle-2.md](../proposals/boogle-2.md). The supplied
1210×702 desktop demo shots take precedence over an inferred look. Research and architecture comparison:
[ultra-water.md](../research/ultra-water.md); numerical diagnosis, source audit and reproducible measurements:
[water-demo-diagnosis.md](../research/water-demo-diagnosis.md). Adapted code is attributed in
`public/THIRD_PARTY_NOTICES.md`, including Ultra Water, Epic's Hillaire atmosphere, three.js clouds/AgX and Hoskins hashes.

## What you see and do

- The unscaled source island sits at world `(2400,0)`: 2400 m terrain, 384 segments, its mountain ridges and the
  seabed down to −34 m. A 512² shore field covers 1800 m. One height function feeds terrain, collider and shore bake.
- The source's 90 shore rocks and hero rock use its positions, RNG sequence and orientation; the hero scale is
  `(9,6,7.5)`, placed at ground height minus 1.6 m. The old toy terrain/tree branch is removed rather than maintained.
- The camera opens on the source Lagoon shot (50° FOV); movement returns to normal player follow. Walk, wade and
  swim as usual. C / RB swims down; Space / A swims up. Rendering is Local; the existing Rapier player remains Owner.
- Four FFT cascades are the default. Source depth damping replaces long swell with shore waves near land, and
  troughs clamp above the bed at the displaced position. Shore wavelength is 30 m and amplitude .55 m.
- Actual opaque terrain and rock colour/depth are read **in-pass** using TSL `viewportSharedTexture` and
  `viewportDepthTexture`. Depth validation rejects refraction offsets into foreground objects; Beer–Lambert
  absorption colours the real bed. Actual obstacle depth drives contact foam. No synthesized bed remains.
- Wave-driven caustics refract the cubic-filtered 12 m FFT slope grid onto 1.5, 4 and 10 m depth planes. Additive
  area-ratio rasterization makes the bright sand net; it multiplies direct sunlight on both ground and rocks.
- Hillaire transmittance, multiple-scattering and sky-view LUTs plus clouds are baked into a mipmapped HDR cube
  when the sun changes. The cube feeds background, roughness-dependent water reflection, terrain ambient and fog.
- This **prototype's starting point** uses the source's metered exposure and AgX through `pipeline.outputNode`.
  **The game's standing Neutral choice is unchanged.** No edits to `src/render/scene.ts`, second renderer or
  second frame loop are needed. Bloom is omitted: the source's faint .05 bloom did not justify its 12 passes here.
- The source near/far planes are .5 / 80000 m. Terrain/water aerial fog uses 1/18000 m; source shadow bounds are
  ±900 m with a 4096 map. These settings apply only on this prototype page.
- Underwater treatment remains: Snell's window now transmits opaque objects, depth-dependent absorption,
  half-resolution light shafts, 6000 marine-snow sprites, a GPU near-plane waterline grid and wet-lens droplets.
  Shafts still use plain illumination rather than caustic or floater shadow modulation.

## Tuning and measurements

`ULTRA.waveScale = .25` is an **energy** multiplier, halving every source spectral amplitude without reshaping it.
The seeded field's deep-water significant height is **13.899 m before → 6.949 m after**; chopped RMS slope is
**.579 → .277**. This remains a large stylized swell, not a physical 9 m/s wind sea. The source itself measures
13.236 m with its PCG realization; its Gaussian/pair convention produces eight times the integrated directional
variance, and it adds a strong long-fetch swell. The wind-only JONSWAP integral is about 2.026 m Hs.

A .02 energy candidate gave 1.966 m Hs, but visibly erased the supplied demo's caustic net and fine-wave detail;
it also restored broad unresolved Cox–Munk roughness. The visual target won over that physical normalization.
The final source-shaped .25 setting is a measured art choice, not a claim that the source's spectrum is physically normalized.

In 601 samples over a minute, the sheltered Lagoon waterline's vertical range is **.058 → .044 m**; horizontal FFT
excursion is **.032 → .018 m**. Long-swell weight is exactly zero there. At .5/1/2/5 m Lagoon depths, full ranges
are **.327/.966/1.363/.882 m** after; exposed-coast ranges are larger. Full before/after tables and coordinates are
in the diagnosis. These are CPU mirrors of the rendered field, including half-float maps, LOD, horizontal inversion
and trough clamp; finite GPU triangulation and the 10 Hz sample interval limit their precision.

## Options

- `?proto=water`: demo scene and Lagoon opening; `&v=pop`: previous saturation/absorption/reflection grade.
- `&shot=lagoon|breakers|surf-rock|open-ocean`: source camera and sun presets, translated only by the island offset.
- `&waves=analytic`: earlier analytic wave diagnostic; it has no FFT caustics.
- `&n=128`, `&cascades=1..4`, `&band=0..3`: FFT cost diagnostics. Caustics require band 2.
- `&ocean=off`, `&grid=192`, `&groundFlat=1`, `&rockFlat=1`: visual/cost diagnostics.
- `raw` is no longer a distinct variant; toy terrain is not carried forward.

## Render budget and limits

- FFT: one compute pass containing 10 dispatches; no additional ocean simulation for caustics.
- Caustics: two 4× MSAA raster targets, three grid draws. Their mip chains add 17 internal reductions: **19 GPU
  passes / 20 draws** total. Renderer counters omit these internal mip draws.
- Exposure: two tiny raster passes/draws (32² meter and 1² adaptation), plus a 16-byte history copy; AgX shares
  the existing fullscreen output draw. No CPU readback and no new full-screen composite.
- Refraction: opaque HDR colour and depth snapshot copies interrupt/resume the current scene pass, without
  drawing the scene again. The original 4× MSAA colour/depth store settings are preserved.
- Sky changes: CPU atmosphere LUT quadrature (about 1 s measured at the first sun), six 1024² cube draws, cube mips
  and native environment PMREM. None of this rebakes every frame.
- The source terrain remains one draw and rocks one instanced draw. The former toy trees are gone.
- Underwater: the existing 64×36 lens compute, one half-resolution shaft draw and one snow draw activate near
  or below water; the existing output composite handles lens drops. Far above water they add no draws.
- Remaining omissions are planar terrain/rock reflections, water-surface shadow sampling and floater shadows.
  Source PCG versus our mulberry32 gives different wave phases; reduced spectrum energy intentionally gives
  calmer ocean relief and somewhat weaker Lagoon caustic contrast. Terrain noise remains the existing filtered
  periodic bake rather than evaluating all source noise per fragment.

Final camera tables, comparison boards, consecutive recording frames and validation are recorded in
[water-demo-validation.md](../research/water-demo-validation.md). Captured frames are not real-time viewing:
feel, frame pacing and iPad performance remain unverified.
