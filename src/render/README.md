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
the unchanged look and the classic-home CI exception. `classic-sea.ts` is a private fallback factory for
home clients only; it exposes no material-patch API and allocates no legacy texture for Place.
Live tuning/Looks and shore helpers remain; the demo is in `archive/water`, with notices retained in public/.
