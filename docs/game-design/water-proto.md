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
  a sun lane that breaks into glitter, wind slicks and foam.
- **The surf** follows the shelf: fronts slow, bunch and bend round the island and the rock, break in peeling sections, and
  leave lace behind. Each crest churns a skirt of foam at the rock and throws spray up its face.
- **The land** (their terrain, `src/proto/water/ground.ts`): sand, seabed, grass and rock by height and slope, sand ripples,
  banded rocks with a tide line. Each wave runs up the beach, drains back and leaves a darker band that dries in seconds; rocks
  shelter a dry wedge behind them.
- **Splashes** ripple through the game's own splash slots and throw a crown of droplets.
- **Below water:** the camera can cross the surface. Hold **C / RB** to swim down at a target 2.5 m/s; release to
  float up, or use the existing Space / A swim-up action. This prototype's dive cancels buoyancy only while held and keeps
  Rapier collisions. The player remains Owner state; the rendering is Local.
- **Looking up:** Ultra Water's roughness-blurred Snell's window squeezes the sky into the refracted direction, with a
  transmitted sun lobe. Outside the critical angle, the underside reflects the deep-water in-scatter colour. Objects above
  water through the window are omitted until an opaque colour read exists.
- **Crossing the lens:** a 64×36 GPU near-plane grid queries the displaced FFT/analytic and shore waves (four iterations
  undo horizontal displacement). Its interpolated depth splits the screen per pixel, with a two-pixel meniscus. It uses
  the wave-height query rather than the source's surface alpha tags; the finest mesh triangles can disagree at the edge.
- **The volume:** scene depth controls Beer–Lambert extinction toward the same in-scatter colour as the underside.
  Half-resolution sun shafts integrate 24 jittered single-scattering steps over 40 m, then upsample with depth agreement.
  Illumination is plain: no caustics or floater shadows exist here. This is a light-facing haze, without their shadow stripes.
- **Marine snow:** the source's 6000 seeded, drifting discs wrap in a 24 m box around the camera. One instanced sprite
  field writes depth so the volume fogs each speck by its distance; it is not a new particle pool.
- **After surfacing:** refracting lens drops and two sliding trails dry individually over five seconds. The GPU wave query
  detects the crossing, so wave motion can wet the lens even with a stationary camera.

## Options

- `&v=raw`: the demo's own water numbers, no grade.
- `&terrain=toy`: today's faceted island instead of their terrain; `&groundFlat=1`, `&rockFlat=1` facet theirs.
- `&waves=fft`: the FFT ocean instead of analytic waves. `&n=128|256`, `&cascades=1..4`, `&band=0..3`.
- `&ocean=off`, `&grid=192`: for measuring cost.

## Stages

1. Surface, slope moments, foam and shore field, over a few analytic waves and frozen slope tiles. **Built.**
2. FFT as native compute, in `fft.ts`: all cascades in one compute pass and one queue submission. **Built, opt-in.**
3. Underwater treatment. **Built in the prototype:** reads `scenePass` colour/depth and extends `pipeline.outputNode` before
   its existing Neutral tone mapping and sRGB output. Stored 4× MSAA attachments and `src/render/scene.ts` are unchanged.
   Opaque colour refraction and depth contact on the top surface remain separate work.

## Underwater cost and limits

- Near/below water: one 64×36 compute pass/dispatch for lens depth and wetness, one half-resolution render pass/draw for
  shafts, and one snow draw in the existing scene pass. The composite and droplets share the existing output draw.
  The double-sided ocean uses `forceSinglePass`, so it still draws once.
- Dry and away from water: zero added passes, dispatches or draws; the output checks one uniform branch. The CPU uses a
  conservative +4 m envelope to activate the GPU query, and keeps it alive for five seconds after leaving that envelope
  so surfacing droplets finish drying. During that dry-out tail only the lens compute remains; shafts and snow stop.
- Below −4 m the lens is wholly submerged and skips its per-pixel wave queries; its single camera query still updates
  wetness. The full-submersion in-scatter uses the source's 10 m lens-depth proxy. No CPU readback decides the waterline.
  Scene depth already belongs to the existing MSAA scene pass.
- This ports UnderwaterPass.js, MarineSnow.js, OceanSurface.js's underside and PostFX.js's droplets at reference revision
  `30ea65e`; source coefficients remain in `UNDER` and the existing `ULTRA`/`LOOK` colour knobs. Research and engine
  comparison: [ultra-water.md](../research/ultra-water.md), recommendations 1–2 and its source audit, with the owner's
  later decision to import the complete below-water treatment superseding the original selective recommendation.

## Builder check (2 November 2026)

Three visual rounds, using the local GPU broker with `proto=water&tod=0.15`: the final captures had WebGPU, advancing
completed frames and no page/console/graphics errors. Inspected the PNGs and consecutive frames extracted from the
recording; this does not establish real-time feel or smoothness, and no iPad was available.

- Best sun view: camera `2590,-3,-65`, look `2589.1335,8.8393,-55.8305`; `.look/underwater-r3-sun-still.png`.
- Bed view: camera `2565,-3,-48`, look `2553,-1,-41`; `.look/underwater-r2-bed-still.png`. The rock and nearby bed remain
  readable in the volume, with snow flecks and bright underside patches.
- Straddle at `2565,0,-48`, look `2553,2,-41`; `.look/underwater-r2-transition-motion.png` shows the wave split, then
  surfacing droplets, then a dry lens. The near-plane grid can disagree with the surface triangles at the moving edge.
- The registered C action took the player from −0.4 m to −5.61 m, with vertical speed −2.497 m/s, in 2.2 seconds.
  The normal camera reached −3 m; releasing C restored buoyancy. Touch has no dedicated dive button yet; RB is registered
  but a physical gamepad was not tested. The existing camera floor and player buoyancy still govern the follow and rise.
- Runtime counts changed by one render call and two draws below/near water (shaft quad and snow), plus the one lens
  compute dispatch. Dry/away disables them. The captured scene target reported four samples and both MSAA store flags true.
- `npm run check`: 292/292 unit tests, registry OK, five levels checked, four fresh assets, production build passed.
  `npm run sim -- replay`: 1103 frames, no difference. These guard integration; they do not grade underwater appearance.
  Final source comparison restored waterAt's fourth inversion iteration and the fully submerged 10 m proxy after the
  third visual round; those two constant corrections were checked statically, without a fourth capture round.

## Numbers

[tuning.ts](../../src/proto/water/tuning.ts): `ULTRA` is the demo's values, `GRADE` is ours over them.
