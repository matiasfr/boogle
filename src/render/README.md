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

## Toon lighting

[`toon.ts`](toon.ts) wraps `MeshStandardNodeMaterial`'s lighting model from `scene.ts` before anything compiles, so
every Standard material gets a soft sun step, a flattened sky fill and a cool shade side (owner, 10 November: style B,
no rim). Water, sky, unlit ink, particles and Physical/Lambert keep their own shading. Knobs: `toon.*` tunables
([`toon-tuning.ts`](toon-tuning.ts)), literals off the tuning route (mind the Firefox rule in [tsl](reference/tsl.md)).
`?toon=off` skips the patch for before/after looks.

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
`readableIntensity()` at spawn, with no double compensation.
Reward celebrations (box sparkles, confetti, the opening dust ring, the reveal's sparkle) come from
`reward-particles.ts`, which folds `readableIntensity()` in itself: a reward emitter takes no intensity argument. These counts are not device timing evidence.

## Water ownership

`water-render.ts` owns the one sea every route uses ([water design](../../docs/game-design/water.md#the-sea-10-november-2026)):
the surface (`water/surface.ts`, one blended draw and one opaque-depth copy), the coast texture (`water/coast.ts`),
the swell and the CPU water field (`water/swell.ts`, `water/field.ts`), the caustic tile and seabed receivers
(`water/caustics.ts`, `water/receivers.ts`), the flat underwater fog (`water/underwater.ts`) and the once-baked
late-morning sky. Water has no compute pass and no setting. Neutral stays the output.
[Water design](../../docs/game-design/water.md) records the fixed-exposure calibration. `exposure.ts` owns the Local
surface gain, 0.12. The existing frozen-sky scene lights use key gain 1.12 and fill gain 3.2. `water/post.ts` uses
the width-zero form of the bounded colour-research output; no exposure meter targets, draws or history copy are
constructed. Dev Water/Post binds `post.centre` through the existing reset/persist/copy path.

Physical Place boards and the shop price atlas use rough lit materials, their same sRGB canvas textures and
received shadows, with no emissive floor or gain compensation. Camera-facing labels and rewards keep their policy.
`readable-unlit.ts` divides scoped unlit ink's **linear RGB** by `surfaceExposure` from `exposure.ts`, preserving
alpha and underwater fog. Scoped reward emitters fold the inverse of the same CPU setting into RGB
once at spawn; living particles retain their spawn intensity until expiry. Smoke/dust keep intensity one.
The material helper ignores repeat calls on the same owned material. `readableGlow` is its lit counterpart: it divides
only a display-range emission (`emissiveNode`, default `materialEmissive`) by the same gain, for glows rather than
shaded-face fills. A new unlit or glowing material authored at display range opts into one of the two; the scoped
list is in [place.md](../../docs/game-design/place.md#readable-ink-and-rewards). No independent reference multiplier
remains. Do not sample the framebuffer, boost all unlit materials, or apply both compensation paths to one surface.

The classic island's cheaper sea (`classic-sea.ts`) was removed when it joined the one world (6 November). Ultra
Water was removed on 10 November (local tag `archive/water-ultra-2026-11-09`). Live tuning/Looks and the shore
registry remain; the demo is in `archive/water`, with notices retained in public/.

The water ceiling is requested each frame but only reapplied when its clamped value changes. Adaptive DPR
and Dev resolution changes still apply through their existing setters. This skips redundant renderer/pass
resolution work without changing either the resolution policy or water update cadence.
