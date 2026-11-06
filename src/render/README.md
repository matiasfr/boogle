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

## Cosmetic particles

The shared particle pool defaults to its original soft round dot. `shape` also accepts `quad`,
`chip`, `star` (`glint` at the existing axe caller) and `dust`. Stars retain the brief attack;
chips use a tapered card whose projected thickness/face shade tumbles. Rotation is birth radians,
spin is radians/second. Dust samples our own 64-square procedural lobe mask (16 KiB, created once).
All shapes share one precompiled alpha-blended material and draw; there are no per-chip bodies or shadows.
`sizeCurve` / `alphaCurve` are three multipliers at normalized ages 0, 0.5 and 1, smoothly interpolated.
`colorCurve` supplies three linear-RGB colour keys; intensity multiplies all three once at spawn.
Existing grow/shrink/fade/default dots retain their meaning. A floor normally kills; optional `bounce`
gives one short rebound and clamps remaining life to 180 ms. It is a local plane, not a terrain collision query.

Budget: 720 fixed slots, 256 births per frame, oldest-slot replacement, excess births dropped.
One packed state buffer and three draw buffers use four update storage bindings; spawn uses two.
GPU buffers total 194,816 bytes; a nonempty queue uploads 45,056 bytes. Idle expiry skips compute/draw.
`particleCounts()` reports estimated occupancy, caps, admitted/dropped/replaced births, draws and upload bytes.
The update and scalar queue writer create no per-frame arrays; shared chip/dust recipes reuse birth records.
Reduced motion suppresses these contact decorations. Dust and timber keep intensity one; the axe still uses
`readableIntensity()` at spawn, with no double compensation. These counts are not device timing evidence.

## Water ownership

`water-render.ts` owns the one sea every route uses, its FFT, shore atlas, queries, underwater HDR and
once-baked late-morning sky. Neutral stays the output. [Water design](../../docs/game-design/water.md) records
the fixed-exposure calibration. `exposure.ts` owns the Local surface gain
and signed-depth underwater adjustment: 0.12, +0.81 EV through 0–1.5 m. The existing frozen-sky scene lights
use key gain 1.12 and fill gain 3.2; the sky bake and water optics retain their values. `water/post.ts` uses the width-zero
form of the bounded colour-research output; no exposure meter targets, draws or history copy are constructed.
HDR scene targets, Neutral and the water/sky shader values remain. Dev Water/Post binds `post.centre` and
`post.underwaterEV` through the existing reset/persist/copy path.

Physical Place boards and the shop price atlas use rough lit materials, their same sRGB canvas textures and
received shadows, with no emissive floor or gain compensation. Camera-facing labels and rewards keep their policy.
`readable-unlit.ts` divides scoped unlit ink's **linear RGB** by `surfaceExposure` from `exposure.ts`, preserving
alpha and underwater attenuation. Scoped reward emitters fold the inverse of the same CPU setting into RGB
once at spawn; living particles retain their spawn intensity until expiry. Smoke/dust keep intensity one.
The material helper ignores repeat calls on the same owned material. The explicit underwater lift remains
intentional. No independent reference multiplier remains. Do not sample the framebuffer, boost all unlit materials,
or apply both compensation paths to one surface. `fixedExposureGain(depth)` exposes the exact medium-dependent
gain if a future material policy explicitly needs it.

The classic island's cheaper sea (`classic-sea.ts`) was removed when it joined the one world (6 November). Live tuning/Looks and shore helpers remain; the demo is in `archive/water`, with notices retained in public/.

The water ceiling is requested each frame but only reapplied when its clamped value changes. Adaptive DPR
and Dev resolution changes still apply through their existing setters. This skips redundant renderer/pass
resolution work without changing either the resolution policy or water update cadence.
