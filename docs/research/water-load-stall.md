# New-water startup: measured costs, unresolved freeze

> **Verdict:** Reported freeze not reproduced; cause found in the cold-start work.
> **Top recommendations:** none; the reported freeze was not reproduced here.
> **Status:** superseded by [water-metal-cold](water-metal-cold.md).

2026-11-03. M1 Max, 32 GPU cores; source `e4cd214c`. DESIGN.md: **Small and readable — measure before optimizing**.

**The reported minute-long visible freeze was not reproduced, so its cause and fix remain unresolved.** The largest measured gaps are CPU shore/eikonal solves behind the existing opaque loading screen. The only post-opening >50 ms gap occurs on the initial join click with both seas; Long Animation Frames attribute most of it to WebAudio unlock, outside water. No gameplay patch or after-fix improvement is claimed.

## Cold / warm baselines

Each cell is **fresh browser profile / same-process reload**, each observed for 90 real seconds through the supplied broker, Apple Metal WebGPU (not software). The first exploratory run used mismatched cameras and is excluded here. These are **headless callback intervals, not display presentation times**. Largest interval/count include loading; “steady” starts after the last >50 ms interval, with the remaining recorded callbacks at p95 ≤16.8 ms. First frame is `boot:first`, after a submitted frame and GPU completion, before the splash lifts.

| Page / sea / drawing buffer | First GPU-finished frame (s) | Longest interval (ms) | Count >50 ms | Steady callbacks from (s) |
| --- | ---: | ---: | ---: | ---: |
| [Place, new, 960×600](../../.look/evidence/1793754732841-94580/evidence.json) | 5.28 / 4.96 | 1616.6 / 1583.3 | 9 / 6 | 5.67 / 4.96 |
| [Place, old, 960×600](../../.look/evidence/1793754932837-94761/evidence.json) | 1.58 / 1.25 | 250.0 / 233.3 | 5 / 4 | 1.91 / 1.25 |
| [Place, new, 2880×1800](../../.look/evidence/1793755661506-95547/evidence.json) | 5.57 / 5.05 | 1649.9 / 1566.7 | 7 / 7 | 6.01 / 5.05 |
| [Place, old, 2880×1800](../../.look/evidence/1793755870949-95746/evidence.json) | 1.57 / 1.24 | 266.7 / 233.4 | 6 / 4 | 2.06 / 1.24 |
| [Place + classic flag, new, 2880×1800](../../.look/evidence/1793755211253-95126/evidence.json) | 5.34 / 5.04 | 1633.3 / 1583.3 | 8 / 7 | 5.77 / 5.04 |
| [Classic island, new, 2880×1800](../../.look/evidence/1793755435957-95359/evidence.json) | 3.27 / 3.03 | 1633.3 / 1583.3 | 6 / 6 | 3.79 / 3.03 |
| [Classic island, old, 2880×1800](../../.look/evidence/1793756072402-95938/evidence.json) | 1.09 / 0.76 | 183.3 / 133.3 | 2 / 1 | 1.77 / 0.76 |
| [Place, new, adaptive, 2880×1800](../../.look/evidence/1793756296379-96126/evidence.json) | 5.29 / 5.11 | 1616.6 / 1566.6 | 7 / 5 | 5.72 / 5.11 |

Every row has one cold post-opening hitch (183–250 ms), zero warm post-opening >50 ms intervals, and zero >50 ms intervals after ten seconds. The warm returning player bypasses the initial join click, so that difference is **not evidence of a warm shader cache**. Detailed intervals, owners, methodology and all run IDs are in the [stall appendix](water-load-stall-appendix.md); raw frame/task/pipeline JSON is beside each linked manifest.

## What the timeline establishes

- **CPU water work:** each shore solve takes ~0.88–0.94 s; texture packing adds ~0.10–0.17 s. Registering place repacks home (~0.10 s), but does not solve home again. Water setup adds ~0.42 s; frozen sky bake ~0.30 s; initial FFT submission ~15 ms; first caustics CPU submission ~4–6 ms. Spray preparation itself is ~77 ms; its longer inclusive span sometimes contains a shore bake. All are before the world opens.
- **Other startup work:** the lazy place module evaluates for ~0.25–0.30 s. Model fetch/parse overlaps precompilation. Initial shadow/output/query pipeline work also occurs behind loading. The shader warm-up never reaches its eight-second escape deadline in these runs. Async pipeline latency includes delayed JS callbacks; it is not isolated compiler time.
- **Past startup:** no late native pipeline creation after ten seconds in the place traces, including view changes at 30/60 s. One frozen-sky bake; shore rebuilds only during startup registration. Heap drops continue without prolonged gaps (a GC proxy, not a GC profile). In the large fixed-DPR place runs, GPU queue completion after ten seconds is ≤23.0 ms new / ≤9.6 ms old, with no unresolved samples at the end. Those latencies include main-thread callback delivery.
- **Adaptive resolution:** a separate diagnostic removes the harness's forced `dpr=fixed` before game initialization. It confirms `FIXED_DPR=false`, DPR stays 2, and the buffer stays 2880×1800 after initial sizing on both visits. No settling was observed. Quality settings were not reduced.

## Limits and disposition

A fresh Chromium profile clears browser caches; **empty Metal/OS driver caches are not verified**. This broker exposes neither headed/CDP capture nor a driver-cache reset. Local Vite module loads differ from the deployed bundle/service-worker/cache path; the live site was not accessed under the local-only network restriction. Google Fonts links were temporarily omitted. Thermal queries report no recorded warning but supply no temperatures/clocks; other applications' GPU use was not controlled. **iPad and Safari: not tested on a device.** Scan-out, a truly cold driver, and the affected browser's production load remain unverified.

No evidence here supports adding another precompile, changing quality, or calling the timeout the culprit. The observed audio hitch also needs headed confirmation before changing audio startup. The necessary next step is an affected-browser reproduction with presentation/GPU tracing through an extended trusted broker. **Before/after fix numbers are unavailable because no supported fix was established.** Temporary probes and font changes were removed; game source is unchanged. No net/world/sim/server edits, new scenario or gameplay bot run.

Validation: the nine successful captures report WebGPU, advancing completed game frames and no page/console/graphics errors. One malformed `--size 1440,900` request failed argument validation before capture; corrected to `1440x900`. Opened stills and visual observations are listed in the appendix. `npm run check` passed: lint, typecheck, 292 unit tests, registry, level and asset checks, production build. `npx prettier --write` was run on the three changed Markdown files (the repository's ignore file excludes Markdown).
