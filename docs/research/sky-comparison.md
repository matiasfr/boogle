# Frozen demo sky comparison, 3 November 2026

Serves DESIGN.md **Show, don't tell** and **Small and readable**. Local only. Owner decision:
[Look](../decisions.md#look). This is a viewing experiment, not the final sky integration.

## Sources and decisions

No external networking is permitted for this task. This builds on the existing [Ultra Water research](ultra-water.md),
especially its atmosphere inventory, standard-engine comparison and recommendation 7 (shared resources and
invalidation), and the [tone comparison](tone-comparison.md). Source: `src/proto/water/sky.ts` and `atmosphere.ts`,
ported from Ultra Water 30ea65e. The owner's original-demo board was opened before implementation.

1. Reuse the demo's 256×64 transmittance, 32×32 multiple scattering and 192×108 sky-view CPU LUTs, then six
   1024² HDR cube faces with the original cloud shader. Keep the cube fixed. This uses the existing Three.js
   scene environment/fog hooks, consistent with the environment-lighting separation described in the existing
   Unity/Unreal/Godot research; it adds no general engine system or second game renderer.
2. Derive the frozen sun from the game's existing day arc so toon/demo captures have identical directions.
   Default `tod=0.24`, approximately 51 degrees above the horizon. Compare `0.56` and `0.605` deliberately.
3. Use that cube for background, environment and directional fog. Sample its coarsest upper/lower mip once into
   hemisphere fill because Lambert materials cannot receive a physical environment. One additional 2×1 draw
   and readback at initialization; no per-frame readback. The standard PBR environment also builds its PMREM.
4. Keep the existing shadow coverage and camera-relative sun target. Hide dome, billboards and low-poly clouds.
   Place internals and `src/render/scene.ts` are untouched. Water's existing update has one flag guard so it does
   not rebake a conflicting sun each frame.
5. Match tone exposure using the same shared HDR meter, 20 seconds of warm-up and the existing middle-grey
   trims (Neutral 1, demo AgX 0.771116). No per-panel artistic exposure correction or ffmpeg colour processing.
   Meter adaptation compensates for the physically brighter demo illumination; identical HDR input gets the
   same metering under either curve. These are metered-Neutral comparisons, not unflagged exposure-1 screenshots.

## Reproduction

Use the existing broker, never launch Chromium directly:

```sh
BOOGLE_QUERY='classic=1&sky=demo&tone=agx&tod=0.24&skyShot=home' node dev/codex/see.ts --eval dev/look/evals/sky.ts --name home-demo-agx --warm 20 --frames 2 --seconds 1 --question 'Does this sky suit the purple toy avatar?'
```

Shots: `home`, `wide` use `classic=1`; `town`, `gorge` use `proto=place --room proto-place`;
`crossing` uses `proto=crossing --room proto-crossing`; `beach` uses `proto=water --room proto-water`.
Each board is toon Neutral / toon AgX across the top, demo Neutral / demo AgX across the bottom.
For toon, omit `sky=demo`. Cameras and staged state live in `dev/look/evals/sky.ts`.
The beach's toon sky is a capture-only override; the water's custom reflection/fog shaders continue to sample
the demo cube, so this is not a complete toon-water integration. On every other page the sea is still the old sea.

The first timing probe failed because Three.js requires timestamp IDs ending in `:f<frame>`; the corrected probe
preserves those IDs. Timing covers the six actual first-bake cube face draws, individually tagged, excluding CPU
LUTs, uploads, mip generation, PMREM and the ambient readback. Never treat it as total sky startup time.
Screenshots and manifests are under `.look/evidence/`; final boards and assessment under `.look/sky-comparison/`.
