## Cost and checks

- `npm run perf -- --render` prints draw calls, shadow calls, triangles, geometries and shader stages (vertex and
  fragment counted apart, so the number is not comparable with the old "programs"). Run it before and after
  anything that adds meshes, lights, passes or per-frame GPU work. Reports also include canvas/internal pixels,
  device and renderer DPR, scene MSAA, backend render-context/compute-dispatch counts, observed offscreen targets
  (GPU allocation dimensions, formats and samples), prototype/variant/look flags, URL route and camera pose.
  Target inventory covers targets used during observation, not total GPU residency; pass counts exclude internal
  copy/clear/mipmap passes and XR layer splits. `npm run counts` keeps its existing nightly fields and adds these
  details under `measurement` (still no timings).
- `npm run perf -- --hardware --view overview --seconds 5` opens a visible browser without forcing software
  rendering and samples real animation frames. `--query 'look=all'` selects flags; `--url` uses a
  running dev server, and `--json file` saves the report. Views come from `dev/look/lib.ts`; without `--view` or
  `--json`, it measures the current player camera. `--json` still defaults to the fixed overview/sun. Check the
  reported adapter (unavailable on some browsers) and keep the GPU to yourself; a headed browser alone does not
  prove hardware acceleration. Never use headless software timings as a device budget.
- `npm run look` and the scenarios run WebGPU: SwiftShader over Vulkan on Linux and CI (a few fps with two tabs, so
  PR CI runs only the single-tab or light scenarios), Metal on a Mac. `npm run check:gpu` (smoke on the GPU) runs in
  `npm run ship` on a Mac, and `smoke.yml` runs smoke against the live site after every deploy. The harness
  passes `?dpr=fixed`, which keeps [adaptive-res](../../features/adaptive-res.ts) off so images stay comparable, and a
  scenario fails if a player's renderer isn't WebGPU. Every run
  prints the backend and any `THREE.` console errors (`gfx errors`); a "Material ... is not compatible" error means
  a material slipped through as WebGL-only.
- `?prof=1` (any build, live site included) overlays main-thread CPU sections, GPU **render** and **compute**
  timestamps separately, and presented-frame intervals. The latter are animation callback intervals for completed
  game frames, a presentation proxy: actual display/scan-out timestamps are unavailable. CPU is game-frame
  submission/work, not GPU execution; adding GPU render and compute does not give end-to-end latency.
  **Measure 5 seconds** captures a bounded real-frame sample on the owner's iPad; **Copy** copies JSON, including
  start/end view and settings, with a selectable fallback if clipboard access fails. Missing timestamps show
  **unavailable**, never zero. Render, compute and combined GPU timings are earliest-start to latest-end
  **spans**, including intervening gaps, never sums of pass timers. Frame-tagged results are deduplicated;
  non-advancing raw timestamp ranges are stale and excluded. Reports include sample IDs, missing frames,
  stale frames and partial context coverage. Keep the tab visible (hiding invalidates a captured sample).
  Timestamp tracking and the observer add debug overhead only behind the flag; no extra `renderFrame()` calls
  are made. The CPU table remains at `window.boogle.prof.table()`. Adapter features/limits are logged once;
  `?gpuinfo=1` displays them without Web Inspector ([gpu-info.ts](../../debug/gpu-info.ts)).
  `npm run perf` prints CPU sections, and `npm run hitches` names the slowest section of each hitch frame.
  `npm run hitches -- --allocs` adds JS heap allocated per frame and the functions that allocate most.
- Dev's **Graphics → Measure on/off** uses this profiler through `debug/dev/performance.ts`: prepare both
  variants, require advancing completed frames during warm-up, then on/off/off/on samples at fixed resolution
  and Display cadence. Route/camera/pixels/unrelated settings must match, and prior overrides restore in
  `finally`. Reload-only switches require separate matched pages. Preserve the contention label; repeat
  measurements do not prove exclusive GPU use. [Mac observations and limits](../../../docs/research/graphics-switch-costs.md).
- `npm run hitches` flies a tour (views, caves, lighthouse, sunset and night, particles, a held throw, swapping what you hold) and
  lists every frame over 33 ms with what changed in it (programs, geometries, textures); use it after touching
  materials or anything lazily built.
- `window.boogle.gfx` (`gfx()` in `scene.ts`) is `'webgpu'` once `rendererReady` resolves, null before; telemetry
  reports it with each connection.
- Headless frame rates mean nothing. Judge frame time on a real iPhone, iPad and a mid-range Android.

### Portable device validation

In development, `?gpuProfile=portable` supplies the one renderer with a device that disables optional features
(including float32 filtering/blending, compressed textures, f16 and subgroups). Core semantics remain enabled
where advertised. It requests baseline limits: 8 storage buffers/stage, 8 vertex buffers, 32 colour-attachment
bytes/sample. `dev/look/evals/gpu-portability.ts` logs effective limits/features; requests are minimum requirements,
not arbitrary upper caps (requesting 4 storage buffers on this Chromium device still returned 8).
Pair it with `dev=1&graphics=msaa:false` to exercise the touch scene sample count. Normal visits are unchanged.
This does not emulate Safari's compiler, attachment implementation or iPad limits, which have not been captured.

Use the existing broker look operation and accepted railway seeds; [commands and findings](../../../docs/research/safari-render-gap.md).
Compilation exceptions in both precompile paths are console errors, so a look cannot accept a partially compiled
scene. The existing initialized-texture guard still warns once for its handled #35069 case.
