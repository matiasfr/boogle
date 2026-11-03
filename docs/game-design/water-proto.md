# 6.26b Prototype: Ultra Water in our renderer (`?proto=water`)

*Ultra Water's ocean rewritten in TypeScript and TSL inside Boogle's renderer, in stages, to find how much of it should
become the real sea. It starts from that water's own numbers and moves toward toon by changing parameters. Serves DESIGN.md 1
(Toys before chores). Research: [ultra-water.md](../research/ultra-water.md). Without the flag nothing loads:
`src/features/proto-water.ts` imports `src/proto/water/` only with it. Its own room, `proto-water`, and Local: no ops,
states, presence or messages. Adapted code's notices ship at `/THIRD_PARTY_NOTICES.md`.*

## What you see and do

- You start on a beach of a test island 2.4 km from home, facing a rock in the surf. Walk, wade and swim as usual; home is a
  smudge on the horizon.
- **The water** replaces the sea on this page: a camera-centred mesh to the horizon, a body colour from depth, sky reflection,
  a sun lane that breaks into glitter, and foam.
- **The surf** follows the shelf: fronts slow, bunch and bend round the island and the rock, break in peeling sections, and
  leave lace behind. Each crest churns a skirt of foam at the rock.
- **The wet sand:** each wave runs up the beach, drains back and leaves a darker band that dries in seconds.
- **Splashes** ripple through the game's own splash slots.
- **Spray** follows the actual shore-wave phase: real breakers shed individual droplets and crests hitting the surf rock
  throw water up its seaward face. Each fresh splash slot also launches a small outward crown, without replacing its ring.
  This serves DESIGN.md 11 (Show, don't tell). `spray.ts` adapts Ultra Water's `Spray.js` through the shared particle emitter;
  no extra pool, mesh, renderer or network state.
- `&v=raw` plays the demo's own water numbers with no grade.
- **Terrain:** `&terrain=ultra` (default) uses Ultra Water's height/slope/noise biomes, rippled sand, tidal stone and
  rock-sheltered swash. `&terrain=toy` restores the previous faceted, vertex-coloured island and simple rocks. Both use
  the same heightfield, rock positions, trees and sphere colliders. Water grade (`&v=raw`) is independent.
- Ultra ground and rocks shade smoothly by default. `&groundFlat=1` and `&rockFlat=1` independently keep geometric facets
  under the same material detail, for comparison with Boogle's faceted world.

## Stages

1. Surface, slope moments, foam and shore field, over a few analytic waves and frozen slope tiles. **Built.**
2. FFT as native TSL compute, replacing the frozen tiles. Not built.
3. Reading the opaque scene for refraction and depth contact, and the underwater treatment. Not built; changes the frame graph.

The terrain now absorbs sunlight along its refracted path and sky light along vertical depth. This is receiver albedo
attenuation, **not** stage 3 or a change to the direct-light direction/shadow lookup. The reference changes those inside its
light loop; normalNode cannot do that faithfully without also bending specular/sky lighting. A node lighting-model hook
and a shadow query at the refracted surface-entry point are still needed. Caustics and floater shadows are outside this port.

## Numbers

[tuning.ts](../../src/proto/water/tuning.ts): `ULTRA` is the demo's values, `GRADE` is ours over them. `&ocean=off` and
`&grid=192` are for measuring cost.

### Spray

The CPU reads bilinear, clamp-to-edge copies of the shore textures' **half-float values**, including travel time and surf
shelter. Its first-train amplitude, peeling/breaking gate, `hash12`, `vnoise`, `shoreNoisePhase` and `shoreGroup` mirror
`surface.ts` / `shore-nodes.ts`. Noise uses world coordinates and float32 intermediate arithmetic; the phase is
`omega * (tau + t) + noisePhase`, using the surface's own time uniform. This also follows `&v=raw`'s wave settings.

Source launch speeds, gravity (9.81), drag (breakers 1.7, rock 1.6, crowns 1.2), lifetimes, amplitude gates and the 350 m
distance cutoff are retained. Small separate dots replace the source's expanding, noise-masked droplet-cloud quads:
the shared emitter cannot reproduce its forward-scattering lighting, soft depth intersection, fade-in or exact analytic
ballistic integration. No growing smooth puffs. Boogle's impact slots lack `uImpactSize`, so crowns use the same 0.5 m
radius as this port's ripple shader.

Bounds: 768 fixed breaker emission points and 128 points on the surf rock; at most **180 emits in any rolling second**
and **48 per frame**, including up to 32 droplets per fresh impact. Camera distance and near-lens fades suppress invisible
work, stale crests are discarded after a pause, and the emitter reuses its descriptor and bookkeeping arrays each frame.
The shared `emit()` implementation still performs its own queue writes. All of this is Local and cosmetic.

The rock path includes the source's beach-swash arrival branch (`Rf = 2.1 * R`, 0.6 reach), but the configured `ROCK` is
offshore. Other shore rocks are private to `island.ts`; wiring those to spray needs an exported placement list there, outside
this task's file scope. That branch and the rendered spray still need the director's visual check.

Director view: `/?proto=water&dpr=fixed`, camera `(2571.58, 7, -53.15)` looking at `(2553.58, 2, -41.15)` for 12 seconds;
compare `&v=raw`. Crest arrivals should produce separate upward droplets falling seawards, while small unbroken open-water
crests remain quiet. Entering the water creates a brief outward crown over the existing ripple rings.

CPU verification: the actual TSL helper bodies evaluated with float32 scalar/vector operations matched the JS `hash12`,
`vnoise`, phase noise and group on 10,000 world-coordinate/time inputs (zero measured error). This is expression parity,
not a GPU readback or visual check. A 60-second CPU exercise with the real shore bake emitted 5,768 droplets, peaked at
180 in a rolling second and 33 in one frame, consumed a fresh impact once (32 crown droplets), and emitted zero with a
distant camera. A synthetic shallow-rock field exercised the swash branch with both raw and graded wave settings.
## Terrain port and reuse

Serves **Small and readable** and **11. Show, don't tell**: wetness, run-up and stone faces explain the water contact visually.
The source is Ultra Water `30ea65e`, `src/scene/terrain.js`, `terrainGeometry.js` and `src/water/OceanSurface.js`'s
`SWASH_ROCKS`. The read-only reference was inspected, never installed, built or run. Research recommendations
[4 and 7](../research/ultra-water.md#recommended-path-and-smallest-prototypes) inform footprint filtering and shared bakes;
the owner's 2 November direction supersedes that report's earlier selective-feature recommendation.

`ground.ts` owns reusable node builders and CPU geometry/rock-map bakes. It imports no test island, scene, lighting service,
physics or frame loop. Callers supply world position, geometric world normal, time, sun direction, absorption and a swash
callback. `rockGeometry(fbm)` accepts a signed CPU noise helper; `height.ts` exports its existing source-derived helper.
`island.ts` supplies the test scene and optional flat shading. All new appearance is Local, with no network state.

The source's linear colours, biome thresholds, sandLine `2.4 + 1.6*n3 + 0.8*n1`, wet-pore darkening, 0.004 m film sheen,
0.2 film roughness, two ripple wavenumbers (3.9 and 21), rock strata/tide/salt, bump weights and absorption path weights
(0.6 sun, 0.4 sky) are retained. Underwater absorption follows this prototype's selected `LOOK` water coefficients.
The source's high-altitude rock blend remains available even though the toy hill doesn't reach its 38–52 m band.

Efficiency changes and deliberate differences:

- One shared 256² RGBA16F tile bakes 32² cells of the source's cubic value noise and its analytic x/y derivatives. A 64³ R8
  volume bakes 16³ cells of its 3D noise. Periodic lattice boundaries make them tileable; interpolation and quantization
  approximate the source, so these are not identical random fields. No external image or dependency is loaded.
- The 2D tile has filtered mips for albedo/bubbles. Ripple samples use explicit LOD 0 only inside the source's footprint
  branches: long ripples fade from 0.15–0.5 m/pixel, short from 0.03–0.09. Baked gradients replace finite differences at
  0.01 m, keeping the warped phase's gradient. The volume uses trilinear filtering at LOD 0; its fine bump octave fades at
  0.03–0.12 m/pixel. Distant rock-colour stability still needs inspection (the volume has no mip chain).
- Source rock deformation, bedding, cracks and baked cavity colours are retained at detail 4 (500 triangles/instance).
  Fifteen existing rocks now share one instanced draw instead of fifteen draws. The source's 90-rock/satellite scatter is
  omitted to keep the comparison layout fixed; sphere colliders and the existing hero obstacle bake are unchanged.
- The terrain grid retains today's 2 m spacing and -9 m deep-bed cull. The reference's -34 m cull belongs to its longer
  visibility range; changing the mesh and collider would confound this material comparison.
- Rock maps store the two nearest influences by distance/radius. In the lee, run-up is reduced by up to 90%; at the
  seaward face the source's 1.1 surge multiplier drains over phase 0.25–0.45 and churns edge foam. The hero rock is excluded
  from this small-rock map, as in the source, because it already changes the shore field. The map uses the actual world
  offset and returns no influence outside its extent. Index/data reads are nearest and explicit LOD, including empty cells.
- Colour and roughness share one swash result. Its three slow hash-based 2D noise evaluations remain to match the water's
  phase and sets exactly. All implicit samples and screen derivatives are outside divergent branches; reversed source
  smoothsteps are expressed as ascending smoothstep followed by oneMinus.

### Pixel work (this port's instruction counts, not timings)

Counts are texture instructions, not underlying bilinear/trilinear taps. They exclude the engine's lighting/shadow/BRDF
lookups. Rock shading replaces the sand shader; do not add the rock row to albedo/ripples. Swash is counted separately and
shared by colour/roughness. WGSL generation confirms one shared evaluation; GPU validation/performance remains pending.

| Item | Texture reads/pixel | Runtime hash-noise evaluations/pixel | Kept or simplified | Real-game recommendation |
| --- | --- | --- | --- | --- |
| 1. Albedo, wet band, film, bubbles | 5 (3 biome + 2 lace), plus swash | 0 | Source colours, height/slope masks, thresholds and drying; baked tile and distant lace average | Take with changes: tune the palette at the game's camera |
| 2. Sand ripples | 0 / 5 / 8 at far / long-only / both bands | 0 | Warped wave/wind bands; analytic baked slopes replace 16 source noise evaluations at full detail | Take with changes: choose detail tiers after device measurement |
| 3. Rock material including wet/bubbles and bump | 7 (4 volume + 3 plane), plus swash | 0 | Strata, tide, salt, cavity tint and screen-derivative bump; true volume instead of eight corner hashes per noise | Take with changes: inspect distant stability and volume filtering |
| 4. Geometry and instances | 0 | 0 | Source CPU deformation/cavities; existing scatter and simple colliders | Take |
| 5. Underwater receiver absorption | 0 | 0 | Refracted sun path and vertical sky path; direct-light refraction/shadows deferred | Take with changes: finish the lighting hook and water reconstruction together |
| 6. Swash and rock shelter/surge | 3 shore reads, plus 1 index + 0–2 records near shore | 0 off shore, 3 near shore (12 hash calls) | Source two-rock ranking, lee wedge, surge and foam; no scan over all rocks per pixel | Take with changes: tile/cull the index field for real islands |

Maximum terrain material work: **19 texture reads + 3 value-noise evaluations**; rock: **13 + 3**, before engine lighting.
The noise textures total about **939 KiB** including the 2D mip chain (683 KiB plane, 256 KiB volume). The 512² RG32F rock
index map is **2 MiB**, plus 16 bytes per rock record. Bakes happen once, with no compute dispatch, render pass or frame loop
added. These counts are a cost inventory, not evidence of a frame-time improvement.

### Surface and attribution integration required outside this task's file boundary

`SEABED_HEX` remains a `THREE.Color`; ultra exports linear `(0.74, 0.685, 0.53)`, the reference bed's approximate mean
before its 0.6 wet darkening. Toy retains `#f2e2b4`. **A constant cannot exactly represent the new patterned, absorbed bed.**
The director's `surface.ts` integration should replace `color(SEABED_HEX).mul(0.6)` with `seabedAlbedo(n1, n3).mul(0.6)`
at the reconstructed bed-hit world xz (`n1 = groundNoise().filtered(xz*0.08)`, `n3 = ...filtered(xz*0.013)`), then multiply
by `bedTransmission(bedHit, sunDirection, absorption)` before the water's view-path extinction. Use the actual bed height
for the light path; do not apply view-path extinction twice. This matches the sandy bed below -0.8 m. For shallow transition
colours and steep rocky bed, use `groundNodes`' full `colorNode` at the bed-hit position and geometric bed normal instead;
ultimately reading the lit opaque scene is needed to match its lighting and the submerged rocks too. Those helpers take
the same linear inputs as the terrain.
Any such samples inside a divergent water branch need an explicit LOD or derivatives captured in uniform flow. The existing
constant reconstruction is an approximation until that companion change; no surface code was edited here.

The shared `public/THIRD_PARTY_NOTICES.md` is outside this task's allowed files. Add this to its Ultra Water **Adapted in**
line when integrating: **`ground.ts` from `src/scene/terrain.js`; `swashNodes`' rock shelter/surge from
`src/water/OceanSurface.js` (`SWASH_ROCKS`)**. Existing notices already cover `height.ts`'s CPU noise and terrain source.

### Director's visual check

Compare `/?proto=water&terrain=ultra` and `/?proto=water&terrain=toy` with identical time, sun and camera. Start with the
named **water-surf** camera: position `[2572, 3.2, -52]`, target `[2530, 0, -34]`. Inspect sand ripples, wet colour and
film/bubble transitions during a full run-up/backwash cycle; pan inland for the sand/grass/slope blend. For the rock material,
look closely at the hero with a low oblique view. For the dry lee wedge/seaward surge, use position `[2520, 3, -80]`, target
`[2510.85, 0.45, -74.70]`: a 1.89 m shore rock with ground at +0.19 m (the hero's shore-field response is separate).
Add `&ocean=off` to see absorption on the bed unobscured. Compare `&groundFlat=1&rockFlat=1`
for facet integration. No running-game image, smoothness judgement, GPU compilation or timing is claimed by this task.

Offline validation: Prettier and changed-file ESLint pass; TypeScript passes. `npm run check` passed 292 unit tests,
registry, five level checks and assets, then Vite's default config loader hit `EPERM` writing `.vite-temp` through the shared
`node_modules` link. `npm run build -- --configLoader native` passed without that shared-cache write. All four ground/rock,
smooth/flat node graphs generated WGSL offline; the generated code was inspected for derivative placement and sample counts.
