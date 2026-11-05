# Rendering

Boogle draws with three.js's `WebGPURenderer` (`three/webgpu`) and writes every custom shader in TSL (`three/tsl`).
**WebGPU only** (since 2026-10-31): Chrome and Edge, Safari 26 on iOS, iPadOS and macOS, Firefox on Windows and Apple
Silicon. There is no WebGL 2 fallback (`scene.ts` turns three's off), so a browser without WebGPU gets a note in the
lobby instead of the island. In return any feature may use compute shaders, storage buffers, storage textures and
indirect draws directly, with no second path and no `isWebGPUBackend` check. CI runs WebGPU too (SwiftShader over
Vulkan). How the migration went: [docs/plans/done/webgpu-migration.md](../../docs/plans/done/webgpu-migration.md).

## The frame

Read [frame](reference/frame.md) when changing frame order or the render pipeline.

## Colour

Read [colour](reference/colour.md) when changing color conversion.

## Materials

Read [materials](reference/materials.md) when changing materials.

## TSL pitfalls (each cost us time)

Read [tsl](reference/tsl.md) when changing TSL shaders.

## Cost and checks

Read [cost](reference/cost.md) when changing render cost or choosing GPU checks.

## Where this is going

Read [direction](reference/direction.md) when changing render architecture.

## Water ownership

`water-render.ts` owns the production Place/crossing sea, its FFT, shore atlas, queries, underwater HDR and
once-baked late-morning sky. Neutral stays the output. [Water design](../../docs/game-design/water.md) records
the fixed-exposure calibration and the classic-home CI exception. `exposure.ts` owns the Local surface gain
and signed-depth underwater adjustment: 0.12, +1.22 EV through 0–1.5 m. `water/post.ts` uses the width-zero
form of the bounded colour-research output; no exposure meter targets, draws or history copy are constructed.
HDR scene targets, Neutral and the water/sky shader values remain. Dev Water/Post binds `post.centre` and
`post.underwaterEV` through the existing reset/persist/copy path.

The separate readable-unlit job should divide selected surfaces' **linear RGB** by `surfaceExposure` from
`exposure.ts`, preserving alpha and underwater attenuation. This is fixed-reference compensation: the explicit
underwater lift remains intentional. Do not hardcode 8.33, sample the framebuffer, boost all unlit materials,
or compensate an already-boosted material twice. `fixedExposureGain(depth)` exposes the exact medium-dependent
gain if a future material policy explicitly needs it. Classic-home reference gain remains 1.

`classic-sea.ts` is a private fallback factory for
home clients only; it exposes no material-patch API and allocates no legacy texture for Place.
Live tuning/Looks and shore helpers remain; the demo is in `archive/water`, with notices retained in public/.

The water ceiling is requested each frame but only reapplied when its clamped value changes. Adaptive DPR
and Dev resolution changes still apply through their existing setters. This skips redundant renderer/pass
resolution work without changing either the resolution policy or water update cadence.
