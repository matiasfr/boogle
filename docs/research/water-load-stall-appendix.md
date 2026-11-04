# Water startup measurement appendix

2026-11-03. Read the [assessment](water-load-stall.md) first: the owner symptom remains unresolved. All durations are real wall-clock milliseconds. Each run uses a new Chromium process/profile, then reloads at 90 seconds; its two traces are named cold/warm. Each trace contains every observed rAF interval, previous completed game frame CPU time/top section, long tasks, Long Animation Frames and script attribution, resource timings, named water spans and boot marks, native shader/pipeline calls and async completions. Later runs also contain per-frame GPU queue fences and heap samples.

The observer starts 24–143 ms after navigation; earlier frame callbacks are not observed (buffered long tasks and navigation timings remain). No actual scan-out timestamp is available. Named spans are inclusive and must not be summed when nested. Unattributed gaps remain explicitly unattributed; no shader ownership is invented. First-shadow timestamps are first shadow shader/pipeline creation, not proof of a visible shadow pixel. The early first-water callback also fired during precompile; only the later large runs guard it until boot:shaders. Use boot:first for readiness in every run.

## Capture setup and preservation

Place views at 0/30/60 s: (770,10,110) → (850,0,90); (965,6,120) → (1008,0,-10); (780,14,110) → (650,0,100). Classic uses the shore/overview/shore coordinates recorded in probe.ts. These are limited camera checks, not a traversal of every area or underwater state. Large captures override devicePixelRatio to 2 in the temporary early probe; the actual canvas dimensions are recorded. Normal adaptive behavior was separately restored before modules initialized; no game quality setting was lowered. The primary large place comparison uses identical fence instrumentation. Classic new predates fence instrumentation, so there is no matched classic GPU-cost comparison.

The broker runs used --real --warm 185 --action .look/load-stall/results.ts; the probe reloads automatically after the first 90 seconds and stores both traces in sessionStorage. Manifests record exact arguments and tested source trees. Temporary instrumentation, original-source backups and analysis helpers remain in .look/load-stall. The large fence/adaptive evidence directories contain probe.ts, results.ts and instrumentation.patch; the adaptive directory also has the extraction/summarization helpers. Every successful measurement directory contains cold-timeline.json, warm-timeline.json, cold-stalls.json, warm-stalls.json and stalls.md derived from its raw output.txt. The launcher copies these beside handoff.md/evidence.json. Machine manifests were not edited. Their source trees differ from the final documentation-only commit because the probes were removed.

## Stills actually opened

- [before-place-new-still.png](../../.look/evidence/1793754481814-94290/before-place-new-still.png): Exploratory player view, mostly land/HUD; not useful for a water verdict or paired-camera comparison.
- [baseline-place-new-still.png](../../.look/evidence/1793754732841-94580/baseline-place-new-still.png): Reflective wave surface, cloudy sky and bright shallow caustics in the foreground.
- [baseline-place-old-still.png](../../.look/evidence/1793754932837-94761/baseline-place-old-still.png): Same open-sea direction, flatter blue sea without the new surface/caustic detail.
- [baseline-classic-new-large-still.png](../../.look/evidence/1793755211253-95126/baseline-classic-new-large-still.png): Large place capture retains reflective waves and foreground caustics.
- [baseline-home-new-large-still.png](../../.look/evidence/1793755435957-95359/baseline-home-new-large-still.png): Classic view is mostly palms/land with only a water glimpse; weak shore coverage.
- [fence-place-new-large-still.png](../../.look/evidence/1793755661506-95547/fence-place-new-large-still.png): Reflective water and shallow caustics remain visible; no missing surface in this still.
- [fence-place-old-large-still.png](../../.look/evidence/1793755870949-95746/fence-place-old-large-still.png): Flatter old sea and original sky from the matching place view.
- [fence-home-old-large-still.png](../../.look/evidence/1793756072402-95938/fence-home-old-large-still.png): Mostly land/palms, matching classic framing; weak shore coverage.
- [adaptive-place-new-large-still.png](../../.look/evidence/1793756296379-96126/adaptive-place-new-large-still.png): New-wave surface and shallow caustics remain visible with adaptive behavior enabled.

Visual question: is the new sea present with reflections and shallow-water detail in the framed coast views? The place stills establish those visible features; the classic stills do not establish a detailed shore verdict. No before/after visual change, real-time feel or motion verdict is claimed. Motion sheets/videos were not inspected; no gameplay bot was run, so there are no bot pass/failure claims.

## Every observed interval above 50 ms


### Exploratory, mismatched camera poses; excluded from comparisons — 1793754481814-94290

[Manifest](../../.look/evidence/1793754481814-94290/evidence.json) · [Raw log](../../.look/evidence/1793754481814-94290/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1998.0 | 1683.2 | water-setup (435.7 ms); shore-eikonal (991.2 ms); /src/main.ts:module (1676.5 ms)
2364.7 | 300.0 | sky-bake (312.9 ms)
2681.3 | 283.2 | /src/proto/place/index.ts:module (262.2 ms)
3947.9 | 1266.6 | shore-eikonal (1218.8 ms)
5064.5 | 66.5 | spray-sites (76.5 ms)
5331.3 | 166.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (176.3 ms); sea lateUpdate (largest game section 92.8 ms; frame CPU 176.2 ms)
5414.5 | 83.2 | /node_modules/.vite/deps/chunk-U54O626F.js:update (176.3 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (79.2 ms); sea lateUpdate (largest game section 34.9 ms; frame CPU 77.9 ms)
5797.9 | 250.0 | /src/render/audio.ts:unlock (197.1 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (45.9 ms); proto/place/ambience.ts (largest game section 29.9 ms; frame CPU 45.9 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1709.4 | 1583.4 | water-setup (422.0 ms); shore-eikonal (994.6 ms); /src/main.ts:module (1592.7 ms)
2042.6 | 283.3 | sky-bake (291.2 ms)
2409.3 | 250.0 | /src/proto/place/index.ts:module (230.5 ms)
2476.0 | 66.7 | /src/proto/place/index.ts:module (230.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:done (45.1 ms)
4575.9 | 1233.3 | shore-eikonal (1193.6 ms); spray-sites (1257.5 ms)
4875.9 | 200.1 | /node_modules/.vite/deps/chunk-U54O626F.js:update (208.5 ms); sea lateUpdate (largest game section 125.1 ms; frame CPU 207.6 ms)

### Place, new, 960×600 — 1793754732841-94580

[Manifest](../../.look/evidence/1793754732841-94580/evidence.json) · [Raw log](../../.look/evidence/1793754732841-94580/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1940.5 | 1616.6 | water-setup (426.9 ms); shore-eikonal (979.1 ms); /src/main.ts:module (1633.1 ms)
2307.2 | 300.1 | sky-bake (306.4 ms)
2590.5 | 250.0 | /src/proto/place/index.ts:module (254.1 ms)
3840.4 | 1233.3 | shore-eikonal (1203.6 ms)
4340.5 | 50.1 | Unattributed callback gap; see raw trace, not evidence of a shader stall
4940.4 | 66.7 | spray-sites (77.2 ms)
5190.4 | 166.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (170.8 ms); sea lateUpdate (largest game section 92.9 ms; frame CPU 170.8 ms)
5257.0 | 66.6 | /node_modules/.vite/deps/chunk-U54O626F.js:update (170.8 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (69.0 ms); sea lateUpdate (largest game section 32.9 ms; frame CPU 67.6 ms)
5673.7 | 233.3 | /src/render/audio.ts:unlock (190.2 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (44.0 ms); proto/place/ambience.ts (largest game section 28.1 ms; frame CPU 44.0 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1705.4 | 1583.3 | water-setup (421.0 ms); shore-eikonal (991.7 ms); /src/main.ts:module (1587.4 ms)
2038.7 | 283.3 | sky-bake (296.8 ms)
2405.4 | 250.0 | /src/proto/place/index.ts:module (229.8 ms)
2472.1 | 66.7 | /src/proto/place/index.ts:module (229.8 ms); /node_modules/.vite/deps/chunk-U54O626F.js:done (44.7 ms)
4605.3 | 1250.0 | spray-sites (1264.3 ms); shore-eikonal (1198.9 ms)
4888.6 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (204.9 ms); sea lateUpdate (largest game section 122.9 ms; frame CPU 204.0 ms)

### Place, old, 960×600 — 1793754932837-94761

[Manifest](../../.look/evidence/1793754932837-94761/evidence.json) · [Raw log](../../.look/evidence/1793754932837-94761/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
490.8 | 183.3 | /src/main.ts:module (199.2 ms)
857.4 | 250.0 | /src/proto/place/index.ts:module (247.0 ms)
1457.4 | 133.3 | /node_modules/.vite/deps/chunk-U54O626F.js:update (141.4 ms); main: render (CPU) (largest game section 132.7 ms; frame CPU 141.2 ms)
1524.1 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (141.4 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (56.8 ms); proto/place/index.ts (largest game section 19.3 ms; frame CPU 51.3 ms)
1907.4 | 233.4 | /src/render/audio.ts:unlock (183.9 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (46.8 ms); proto/place/ambience.ts (largest game section 32.4 ms; frame CPU 46.7 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
250.7 | 133.3 | /src/main.ts:module (149.7 ms)
584.0 | 233.3 | asset:/assets/built/hero-clips.glb (282.9 ms); asset:/assets/built/buddy.glb (284.8 ms); /src/proto/place/index.ts:module (216.6 ms)
1134.0 | 150.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (154.9 ms); main: render (CPU) (largest game section 138.7 ms; frame CPU 150.4 ms)
1217.3 | 83.3 | /node_modules/.vite/deps/chunk-U54O626F.js:update (154.9 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (84.2 ms); main: render (CPU) (largest game section 76.9 ms; frame CPU 84.1 ms)

### Place, new, 2880×1800 — 1793755661506-95547

[Manifest](../../.look/evidence/1793755661506-95547/evidence.json) · [Raw log](../../.look/evidence/1793755661506-95547/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1940.7 | 1649.9 | water-setup (432.0 ms); shore-eikonal (992.2 ms); shore-solve:home (887.9 ms); shore-pack:home (103.3 ms); /src/main.ts:module (1650.3 ms)
2290.7 | 300.0 | sky-bake (308.8 ms)
2674.0 | 300.0 | /src/proto/place/index.ts:module (258.5 ms)
5173.9 | 1283.2 | spray-sites (1299.8 ms); shore-eikonal (1229.9 ms); shore-pack:home (105.1 ms); shore-solve:place (957.8 ms); shore-pack:place (165.8 ms)
5473.9 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (206.2 ms); sea lateUpdate (largest game section 128.3 ms; frame CPU 206.1 ms)
5540.6 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (206.2 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (70.2 ms); sea lateUpdate (largest game section 34.0 ms; frame CPU 69.0 ms)
6007.2 | 233.3 | /src/render/audio.ts:unlock (196.8 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (44.4 ms); proto/place/ambience.ts (largest game section 28.5 ms; frame CPU 44.4 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1751.6 | 1566.7 | water-setup (419.7 ms); shore-eikonal (985.2 ms); shore-solve:home (885.2 ms); shore-pack:home (99.3 ms); /src/main.ts:module (1581.0 ms)
2101.5 | 283.2 | sky-bake (295.6 ms)
2434.9 | 250.1 | /src/proto/place/index.ts:module (231.1 ms)
2534.9 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:done (44.5 ms)
4651.5 | 1250.0 | spray-sites (1271.2 ms); shore-eikonal (1205.8 ms); shore-pack:home (102.7 ms); shore-solve:place (938.2 ms); shore-pack:place (163.7 ms)
4968.1 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (208.5 ms); sea lateUpdate (largest game section 124.6 ms; frame CPU 207.7 ms)
5034.8 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (208.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (54.8 ms); sea lateUpdate (largest game section 33.6 ms; frame CPU 54.8 ms)

### Place, old, 2880×1800 — 1793755870949-95746

[Manifest](../../.look/evidence/1793755870949-95746/evidence.json) · [Raw log](../../.look/evidence/1793755870949-95746/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
474.0 | 183.4 | /src/main.ts:module (194.6 ms)
840.7 | 266.7 | asset:/assets/built/hero-clips.glb (327.4 ms); asset:/assets/built/buddy.glb (330.6 ms); /src/proto/place/index.ts:module (246.4 ms)
1440.6 | 150.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (145.5 ms); main: render (CPU) (largest game section 137.0 ms; frame CPU 145.4 ms)
1507.2 | 66.6 | /node_modules/.vite/deps/chunk-U54O626F.js:update (145.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (55.8 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (50.3 ms); main: render (CPU) (largest game section 18.3 ms; frame CPU 49.8 ms)
1557.3 | 50.1 | /node_modules/.vite/deps/chunk-U54O626F.js:update (50.3 ms); main: render (CPU) (largest game section 47.3 ms; frame CPU 50.2 ms)
2057.2 | 250.0 | /src/render/audio.ts:unlock (188.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (48.1 ms); proto/place/ambience.ts (largest game section 34.1 ms; frame CPU 48.1 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
250.4 | 133.4 | /src/main.ts:module (151.3 ms)
583.7 | 233.4 | asset:/assets/built/hero-clips.glb (285.1 ms); asset:/assets/built/buddy.glb (286.9 ms); /src/proto/place/index.ts:module (217.6 ms)
1133.7 | 166.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (169.3 ms); main: render (CPU) (largest game section 152.4 ms; frame CPU 163.2 ms)
1200.3 | 66.6 | /node_modules/.vite/deps/chunk-U54O626F.js:update (169.3 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (68.3 ms); main: render (CPU) (largest game section 60.1 ms; frame CPU 68.2 ms)

### Place + classic flag, new, 2880×1800 — 1793755211253-95126

[Manifest](../../.look/evidence/1793755211253-95126/evidence.json) · [Raw log](../../.look/evidence/1793755211253-95126/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1940.7 | 1633.3 | water-setup (431.1 ms); shore-eikonal (984.4 ms); shore-solve:home (881.0 ms); shore-pack:home (102.5 ms); /src/main.ts:module (1642.2 ms)
2307.3 | 299.9 | sky-bake (304.1 ms)
2640.7 | 283.4 | /src/proto/place/index.ts:module (257.0 ms)
2740.6 | 66.6 | asset:/assets/built/hero-clips.glb (108.5 ms); asset:/assets/built/buddy.glb (111.7 ms); /node_modules/.vite/deps/chunk-U54O626F.js:done (48.6 ms)
4957.2 | 1266.6 | spray-sites (1275.3 ms); shore-eikonal (1207.1 ms); shore-pack:home (104.8 ms); shore-solve:place (936.2 ms); shore-pack:place (165.0 ms)
5240.5 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (211.2 ms); sea lateUpdate (largest game section 131.3 ms; frame CPU 211.1 ms)
5323.9 | 83.4 | /node_modules/.vite/deps/chunk-U54O626F.js:update (211.2 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (74.1 ms); sea lateUpdate (largest game section 37.4 ms; frame CPU 72.9 ms)
5773.9 | 233.4 | /src/render/audio.ts:unlock (194.0 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (43.1 ms); proto/place/ambience.ts (largest game section 27.3 ms; frame CPU 43.0 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1795.3 | 1583.3 | water-setup (421.5 ms); shore-eikonal (993.4 ms); shore-solve:home (893.8 ms); shore-pack:home (99.0 ms); /src/main.ts:module (1595.4 ms)
2128.6 | 283.2 | sky-bake (296.6 ms)
2312.0 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:done (47.7 ms); /src/proto/place/index.ts:module (233.2 ms)
2545.3 | 233.3 | /src/proto/place/index.ts:module (233.2 ms)
4678.5 | 1249.9 | spray-sites (1261.6 ms); shore-eikonal (1196.2 ms); shore-pack:home (101.4 ms); shore-solve:place (929.4 ms); shore-pack:place (164.7 ms)
4961.9 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (210.5 ms); sea lateUpdate (largest game section 125.9 ms; frame CPU 209.7 ms)
5028.6 | 66.7 | /node_modules/.vite/deps/chunk-U54O626F.js:update (210.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (57.7 ms); sea lateUpdate (largest game section 39.8 ms; frame CPU 57.4 ms)

### Classic island, new, 2880×1800 — 1793755435957-95359

[Manifest](../../.look/evidence/1793755435957-95359/evidence.json) · [Raw log](../../.look/evidence/1793755435957-95359/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1940.6 | 1633.3 | water-setup (432.6 ms); shore-eikonal (992.2 ms); shore-solve:home (888.4 ms); shore-pack:home (102.8 ms); /src/main.ts:module (1649.4 ms)
2307.3 | 316.7 | sky-bake (308.6 ms)
2973.9 | 83.3 | spray-sites (82.3 ms)
3190.6 | 133.4 | /node_modules/.vite/deps/chunk-U54O626F.js:update (138.4 ms); sea lateUpdate (largest game section 86.2 ms; frame CPU 138.4 ms)
3257.2 | 66.6 | /node_modules/.vite/deps/chunk-U54O626F.js:update (138.4 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (58.0 ms); sea lateUpdate (largest game section 41.2 ms; frame CPU 58.0 ms)
3790.5 | 200.0 | /src/render/audio.ts:unlock (186.4 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1778.4 | 1583.3 | water-setup (421.0 ms); shore-eikonal (997.9 ms); shore-solve:home (897.0 ms); shore-pack:home (100.1 ms); /src/main.ts:module (1598.2 ms)
2111.7 | 283.4 | sky-bake (298.0 ms)
2278.3 | 66.6 | /node_modules/.vite/deps/chunk-U54O626F.js:done (42.3 ms)
2745.0 | 66.7 | spray-sites (76.9 ms)
2961.6 | 116.6 | /node_modules/.vite/deps/chunk-U54O626F.js:update (128.5 ms); sea lateUpdate (largest game section 80.7 ms; frame CPU 128.5 ms)
3011.7 | 50.1 | /node_modules/.vite/deps/chunk-U54O626F.js:update (128.5 ms); sea lateUpdate (largest game section 32.4 ms; frame CPU 40.9 ms)

### Classic island, old, 2880×1800 — 1793756072402-95938

[Manifest](../../.look/evidence/1793756072402-95938/evidence.json) · [Raw log](../../.look/evidence/1793756072402-95938/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
490.7 | 183.3 | /src/main.ts:module (195.6 ms)
1774.0 | 183.3 | /src/render/audio.ts:unlock (188.9 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
243.2 | 133.3 | /src/main.ts:module (153.8 ms)

### Place, new, adaptive, 2880×1800 — 1793756296379-96126

[Manifest](../../.look/evidence/1793756296379-96126/evidence.json) · [Raw log](../../.look/evidence/1793756296379-96126/output.txt)

#### Cold

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1924.0 | 1616.6 | water-setup (427.4 ms); shore-eikonal (983.0 ms); shore-solve:home (879.7 ms); shore-pack:home (102.2 ms); /src/main.ts:module (1632.4 ms)
2257.3 | 283.3 | sky-bake (304.9 ms)
2690.6 | 283.3 | /node_modules/.vite/deps/chunk-U54O626F.js:done (45.5 ms); /src/proto/place/index.ts:module (251.7 ms)
4907.2 | 1283.3 | spray-sites (1287.3 ms); shore-eikonal (1216.5 ms); shore-pack:home (102.4 ms); shore-solve:place (948.0 ms); shore-pack:place (165.0 ms)
5190.5 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (209.1 ms); sea lateUpdate (largest game section 127.0 ms; frame CPU 209.1 ms)
5273.8 | 83.3 | /node_modules/.vite/deps/chunk-U54O626F.js:update (209.1 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (76.4 ms); sea lateUpdate (largest game section 39.7 ms; frame CPU 75.1 ms)
5723.8 | 233.3 | /src/render/audio.ts:unlock (187.5 ms); /node_modules/.vite/deps/chunk-U54O626F.js:update (42.9 ms); proto/place/ambience.ts (largest game section 27.1 ms; frame CPU 42.8 ms)

#### Warm

End ms | Interval ms | Owner / overlapping work
---: | ---: | ---
1785.0 | 1566.6 | water-setup (420.9 ms); shore-eikonal (993.9 ms); shore-solve:home (893.0 ms); shore-pack:home (100.1 ms); /src/main.ts:module (1593.4 ms)
2135.0 | 283.4 | sky-bake (298.6 ms)
2501.7 | 250.0 | /src/proto/place/index.ts:module (234.3 ms)
4718.2 | 1266.6 | shore-eikonal (1218.8 ms); spray-sites (1283.5 ms); shore-pack:home (104.5 ms); shore-solve:place (948.7 ms); shore-pack:place (164.7 ms)
5034.9 | 200.0 | /node_modules/.vite/deps/chunk-U54O626F.js:update (206.1 ms); sea lateUpdate (largest game section 125.6 ms; frame CPU 205.3 ms)
