# Smooth home shore: geometry, pictures and GPU cost

> **Verdict:** Smooth shore kept opt-in; take rock forms first.
> **Top recommendations:** 1. Low along the shore — avatar-height camera, green palette intact; the near rock is the clearest gain. 2. High over the shore — the court and rising grass remain readable; the bounded patch has no visible perimeter join. 3. Close at the feet — sand's triangular lighting is gone, but the deliberately worst offset exposes the contact limitation.
> **Status:** reference.

3 November 2026. Runtime source: `cb7433b5`, on `codex/shore-slice`. Local experiment; no push.
DESIGN.md: **Code first, images by approval**, **Small and readable**, **Pick how each feature shares state**.

## Recommendation

**Keep this opt-in; take the rock forms forward first.** Smooth sand is visibly less triangular close up, but
refining this already 1.25 m grid to 0.417 m is a subtle improvement from normal/high views. The deformed rocks
make the strongest silhouette change. Smooth-detail is deliberately restrained; its small colour/ripple change
is less persuasive than the rock geometry. Do not cover all land yet. This is an agent image judgement, not an
owner playtest verdict. Ask: **does this shore feel nicer to stand on?**

The experiment is one 85 × 40 m rectangle, x −42.5…42.5, z 10…50, on the actual southern home beach, with the
low grassy rise behind it. `classic=1&shore=smooth|smooth-detail`; `shoreRocks=1` is independent. Defaults stay
unchanged and no file in `src/proto/place/` changed. All new state is **Local**, with no wire/save/sim changes.

## Opened boards, in viewing order

Each board is an `ffmpeg hstack` of **today / smooth / smooth-detail / smooth-detail with rocks**, four
1210 × 702 captures plus labels. Same camera, FOV 50 and initial avatar pose per row. All use the owner's
`sky=demo&tone=agx&tod=0.24`. **Existing sea:** this checkout has no `water=new` implementation; a flag would
not enable one. NPCs, toys and particles remain live, so they are not pixel-registered controls.

1. [Low along the shore](../../.look/evidence/1793735317377-13872/low-board.png) — avatar-height camera, green palette intact; the near rock is the clearest gain.
2. [High over the shore](../../.look/evidence/1793735365739-14762/high-board.png) — the court and rising grass remain readable; the bounded patch has no visible perimeter join.
3. [Close at the feet](../../.look/evidence/1793735425488-15756/feet-board.png) — sand's triangular lighting is gone, but the deliberately worst offset exposes the contact limitation.

**All three final boards were opened**, as were the final high/feet individual stills and the numerical-audit
still. The supplied **Breakers** and **Surf rock** references were opened. Their convincing forms informed
smooth beach profiles and deformed rock silhouettes; their olive/khaki palette was not copied. Initial low,
ordinary-feet and worst-offset captures and the earlier three boards were also inspected. The final recapture
followed a batching correction so A/B/A restores the original rock batch, not a diagnostic extra draw.
The same cameras frame the changed terrain in the final set. Real-time motion/feel was not judged.

## What changed

The original triangles are removed from the drawn indices inside the rectangle, not covered by a second coplanar
mesh. Each is subdivided three ways, then shaped using a 2.5 m heightfield low-pass and shallow low-frequency
berms/dunes. A 7.5 m collar returns displacement, colour and normals to the original triangle planes. The exterior
edge is sampled on the exact original segments; numerical boundary displacement is zero at the audited samples.
This is actual new vertex height, not just flat-triangle subdivision or a normal-map change.

**Smooth normals on both sand and grass.** The grassy rise is part of the same soft landform; flat grass normals
would reintroduce small artificial facets at its edge. Unmodified inland terrain keeps its current treatment.
Palette endpoints remain today's `#efd89d` sand, `#c9ad78` wet sand, `#7cc650` / `#4e9a3d` grass. Court/POI paint
is preserved. Smooth-detail reuses `ground.ts`'s footprint-filtered sand normals and baked noise, with subtle
variation and a static damp-sand colour/roughness gradient. It adds no water work or render pass.

Two small form suggestions were tried: **soft grass–sand feather** (wider, irregular transition) and
**tree-base contact pockets** (shaping fades within 0.65–2 m of trunks, keeping their original grounding).
The independently switched three rocks reuse the demo's actual CPU-deformed, cavity-coloured geometry and the
original placement, rotation, scale and stone colours. Their original simple colliders remain unchanged.

## Contact measurement and limits

[Audit manifest](../../.look/evidence/1793735652282-18844/evidence.json), 0.25 m sample spacing across the rectangle:

- Against the original rendered triangle planes on dry land: **11.91 cm maximum**, **7.32 cm p95**, **3.14 cm RMS**.
- Against the unchanged bilinear ground lookup: **14.12 cm maximum**, **7.30 cm p95**, **3.17 cm RMS**.
- Worst triangle offset: `(32.5, 25)`, **−11.91 cm**. This is the feet-board location, not a hand-picked good contact.
- Ordinary low-view pose `(-18,34)`: **−3 mm** against the original triangle plane; the collider ray there hits
  1.3380 m versus the visual 1.3470 m, about **9 mm** apart.
- After settling near the worst pose, the player moved to `(32.7665,25.2101)`: original triangle 0.4532 m,
  visual surface 0.3418 m, i.e. **11.14 cm** more visible separation. The sphere's bottom is 0.5707 m;
  this includes its existing slope-support offset and is not a direct measure of sole height.
- A ray exactly on the worst grid vertex returned no hit; that is **not** proof of a missing collider. The
  character stands there and the adjacent sampled position/unchanged heightfield are reported separately.

The extra foot separation is noticeable. **Before adoption, use this local shaped surface for collision and
surface queries too, or reduce its displacement.** That requires a bounded collider replacement and consistent
query semantics; raising a visual avatar alone would hide the mismatch while toys and contacts still disagree.
No collider/ground-query/water-field change was made in this visual test. The shaping fades off at the waterline;
more substantial coastal changes would also require rebaking the water's shore field. Rock silhouette/collider
agreement and an iPad walk remain unverified. No gameplay flow was changed to disguise these limits.

## Cost

Logical mesh counts, before any shadow repetitions. Geometry is static and built once.

| Variant | Triangles in new geometry | Net added triangles | Added scene draws (plus shadow draws) | New mesh buffers |
| --- | ---: | ---: | ---: | ---: |
| smooth | 39,168 | 34,816 (replaces 4,352) | 1 (+1) | 2.382 MiB |
| smooth-detail | 39,168 | 34,816 | 1 (+1) | same mesh |
| rocks alone | 1,500 across 3 instances | 1,440 (replaces 60) | 1 (+1) | 12,300 B shared mesh + instance data |
| smooth-detail + rocks | 40,668 | 36,256 | 2 (+2) | 2.394 MiB |

The terrain has 43,520 vertices: duplication at original triangle boundaries carries the exact old face normal
for the transition collar. The demo rocks share one 252-vertex geometry. The retained A/B original vertex buffers
are not freed; replacement-index storage adds **72,624 B** for terrain and **33,648 B** for rocks. Total incremental
mesh/index arrays: **2.452 MiB** terrain, **2.495 MiB** combined, on CPU and approximately again in GPU buffers
when uploaded (driver alignment/overhead excluded). Shared baked detail textures add about **0.92 MiB GPU** when
used, separately from mesh memory. Startup generation/upload and peak JS heap were not benchmarked.

### Measured GPU span

Same method as [terrain-demo-validation](terrain-demo-validation.md): copied its existing timestamp observer,
adapted only the variant switches. **Latest GPU end minus earliest render/compute start in the same completed
frame**, never a sum of overlapping timers. Same-tab **A/B/A**, three 3-second windows, 2.5 seconds settling after
each switch, `prof=1&timestampFix=1`. The capture-only r187 timestamp-resume correction remains in the observer.
Baseline restores original terrain indices/material and original rock batches; no extra baseline rock draw.
All tests use the low avatar-height camera, DPR 1, full-size scene target, **4× MSAA**, and five native raster
passes. No compute work exists here. **18 windows / 3,242 frames; zero missing, partial or invalid ranges.**

| Canvas | Variant (total vs today) | Today ms | Variant ms | Added span ms | Variant p95 ms | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1210×702 | smooth | 0.774 | 0.837 | +0.063 ±0.095 | 1.433 | [A/B/A](../../.look/evidence/1793735454237-15913/evidence.json) |
| 1210×702 | smooth-detail | 1.056 | 1.068 | +0.013 ±0.173 | 1.864 | [A/B/A](../../.look/evidence/1793735486558-16073/evidence.json) |
| 1210×702 | detail + rocks | 1.214 | 1.586 | +0.372 ±0.084 | 2.053 | [A/B/A](../../.look/evidence/1793735517410-16440/evidence.json) |
| 1920×1200 | smooth | 1.995 | 2.311 | +0.316 ±0.148 | 3.173 | [A/B/A](../../.look/evidence/1793735548306-17343/evidence.json) |
| 1920×1200 | smooth-detail | 2.109 | 2.546 | +0.437 ±0.033 | 3.186 | [A/B/A](../../.look/evidence/1793735579573-17865/evidence.json) |
| 1920×1200 | detail + rocks | 1.947 | 2.415 | +0.468 ±0.086 | 2.709 | [A/B/A](../../.look/evidence/1793735611782-18302/evidence.json) |

± is half the difference between surrounding baseline means, **not a confidence interval**. These are shared-Mac
measurements, not an exclusive GPU benchmark; process inspection was denied by the sandbox, so GPU occupancy,
clocks and thermals are unknown. Small-view geometry/detail deltas are unresolved against drift. Do not subtract
rows from different captures to infer rock-only or detail-only cost; **rocks alone were not timed**. Whole-scene
live-object draws range 37–46; the stable large-view pairs show the expected +2 or +4 including shadows.

## Extrapolation and terrain LOD

From the current home heightfield, cell-average dry land covers **23,439 m²**. A simple coastal-height-band proxy
(−1 to 2.6 m) covers **9,844 m²**; this includes low inland patches and is not a surveyed coastline.
At the tested density, **11.52 triangles/m²**, uniformly covering that shore proxy would take **113,400 triangles**
(about **100,800 added**), and all dry land **270,018 triangles** (about **240,016 added**). Approximate mesh storage
with this intentionally duplicated collar format is **6.90 MiB** / **16.42 MiB**, excluding retained originals,
cut indices, rocks and textures. These are geometry extrapolations, not extrapolated GPU timings. Full 510 m square
including empty sea would be about **3.0 million triangles**; do not tessellate that empty area.

This isolated slice needs no LOD system. The one home island's 270k triangles are not inherently excessive,
but **use distance/projected-error LOD before extending fine geometry across multiple shores/islands**: fine near
feet, existing spacing in the middle distance, coarse silhouettes far away. Keep boundary stitching and stable
near collision explicit. Boogle currently supplies no automatic terrain LOD/stitching service.

- **Unity:** connected heightmap terrain tiles coordinate tessellation/LOD and border normals; pixel-error-style
  detail control avoids carrying near resolution to the horizon. [Existing engine research](stylized-terrain.md#what-unity-unreal-and-godot-actually-provide).
- **Unreal:** Landscape components/sections use heightmap-derived LOD with shared border vertices.
  [Existing engine research](stylized-terrain.md#what-unity-unreal-and-godot-actually-provide).
- **Godot:** terrain projects generally use an add-on or their own chunk/clipmap scheme; core mesh LOD and
  visibility ranges supply tools, rather than automatically stitching this Boogle heightfield.
  [Existing mesh-LOD research](art-kit-pipeline.md), [visibility-range research](places-as-modules.md).

Engine comparison uses existing local research and general practice, **not a fresh online documentation check**;
this task restricted networking to localhost. Design basis: stylized-terrain recommendations 6/9 and Ultra Water
4/7. No external source, image generation or new dependency was fetched.

## Verification and reproduction

- `npx prettier --write` ran on all changed files (the repo excludes Markdown). `npm run check` passed:
  lint, TypeScript, **292 unit tests**, registry, five level checks, assets and production build.
- [Full Place bot](../../.look/evidence/1793735695136-19181/evidence.json): **all expected beats completed**,
  33 game minutes in 2m08s; zero errors, 78 checkpoints. The entire report was read and the end still opened.
  Solo `did something together` was never marked; multiplayer was not exercised. Reported navigation stalls:
  4m58s standing and 5s pushing, in warped game time. This is not a first-time-player pacing verdict.
- [world-inputs](../../.look/evidence/1793735648238-18723/evidence.json) passed against the trusted fixture:
  grid, state/op order and gifts layout remain unchanged. No new unit tests or scenarios were added.
- Every final capture reports WebGPU, advancing frames and no page/graphics errors. The initial `look --at list`
  had no checkpoints yet; the initial playthrough command's unsupported `--name` was rejected **before a bot
  started**. The corrected full run passed. No expected bot beat failed.
- The boundary was inspected in the high/low views; the feet view deliberately exposes the remaining contact
  mismatch. M4 iPad Pro, thermals, exclusive-GPU timing, live motion/feel and new-water integration are unverified.
- `inflight` fetches GitHub, so local branch refs were inspected under the task's localhost-only restriction.
  No push, ship, merge, CI or deployment was attempted.

Each board's fourth-panel evidence directory includes `board-captures.json`, pointing to all four matching
capture manifests. The [cost bundle](../../.look/evidence/1793735611782-18302/evidence.json) also contains the
raw `shore-costs.json`, copied timestamp observer, pose/audit scripts, board composer and complete check log.
The launcher copies these beside its `handoff.md` and `evidence.json`. Runtime evidence was captured on
`cb7433b5`; the following report commit changes documentation only.

Reproduce via the existing broker, for example:

```sh
node .look/see-client.ts look --query 'classic=1&shore=smooth-detail&shoreRocks=1&sky=demo&tone=agx&tod=0.24&shoreShot=low' --eval .look/shore-pose.ts --real --warm 2 --frames 2 --seconds 1 --size 1210x702 --name shore-low
```

For cost, add `&prof=1&timestampFix=1&shoreCost=smooth|smooth-detail|rocks` and
`--action .look/shore-ranges.ts`. `rocks` means the combined detail-plus-rocks comparison, not rock-only.
The source flags `shoreRocks=1` and `shore=` remain independent in normal use.
