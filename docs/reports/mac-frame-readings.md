# Mac frame-time readings

Measured 27 November 2026 Pacific on Music Man, a MacBook Pro (MacBookPro18,4, Apple M1 Max with 32 GPU cores), macOS 27.2 (26B123). The game was at `b75143059`, Node 26.13.0. All runs used visible Playwright Chrome for Testing 156.0.8078.4, non-fallback Apple Metal WebGPU, a 960 × 600 viewport and render buffer, DPR 1, and 4× MSAA. The measured browser outer window was 962 × 680 on Roundhouse, Port and Camp. Canopy used the same viewport setting. The active display mode reported 120 Hz.

Each row is a separate 10-second `npm run perf -- --hardware` sample in the exclusive bot slot. The Mac was plugged in at 100% for every run. Spotlight indexing, WindowServer, Safari/WebKit and T3 Code were active before sampling. No owner apps were closed. The load column gives the Mac's one-minute load average at slot acquisition and sample end. Port and Camp met the nightly benchmark's quiet cutoff of 6 at both points; Canopy and Roundhouse crossed it during the run. All four reported zero graphics errors.

## Mac results

Timings are average / p95 in ms. Counts come from a completed draw before the timing window. GPU span is the earliest-to-latest timestamp across render and compute work. The render-only GPU column uses render-context timestamps. The CPU and GPU brackets can overlap.

| View and seed | Draw calls | Triangles | Completed frames | Callback interval | CPU frame | GPU render | GPU span | 120 Hz callback shortfall | Load |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Canopy Checkpoint C · `canopy-reached` | 169 | 466,726 | 1,200 | 8.34 / 9.73 | 7.49 / 9.85 | 0.57 / 1.29 | 4.96 / 6.91 | ~1 | 5.39 → 6.79 |
| Roundhouse at Home · `trade-fitted` | 667 | 1,730,908 | 811 | 12.36 / 17.56 | 11.87 / 13.56 | 1.46 / 1.92 | 10.70 / 11.71 | ~391 | 5.01 → 6.77 |
| Port Quay · `port-reached` | 308 | 559,175 | 1,031 | 9.71 / 17.01 | 9.26 / 11.22 | 0.72 / 1.70 | 6.73 / 9.00 | ~170 | 5.95 → 3.52 |
| Camp ridge first landing · fresh room | 433 | 1,252,042 | 852 | 8.34 / 9.78 | 7.27 / 8.66 | 1.83 / 4.19 | 8.15 / 10.79 | ~1 during observed intervals | 3.28 → 4.39 |

The shortfall is the net difference between the number of nominal 120 Hz slots in the measured callback intervals and the number of observed intervals. It is a cadence estimate. Maximum intervals were 16.04, 18.61, 18.50 and 15.36 ms in table order. Camp's 851 intervals cover 7.10 s of the 10.00 s wall-clock window. The full window finished about 348 frames short of 120 Hz, and the missing time cannot be attributed to frame drops from this trace. A repeat stalled before game entry. Physical display drops are unknown because the harness has no display presentation timestamps.

Port matched HOTBOX's body position and camera from `--view port`. The trailing 240-frame render CPU bracket averaged 4.53 ms (p95 5.03). The GPU scene pass averaged 0.38 ms and the shadow pass 0.42 ms. Camp used a fresh room at zero progress with `intro=1`. The harness waited for the player to stand dry on the Camp ridge before it took counts and timed the first standing view. The dry standing view was at (987.52, 30.45, −161.95).

## HOTBOX comparison

| View | HOTBOX draws / triangles | Callback avg / p95 (ms) | CPU avg / p95 (ms) | GPU avg / p95 (ms) |
| --- | ---: | ---: | ---: | ---: |
| [Canopy Checkpoint C](../plans/greybox-leg3.md) | 155 / 419,317 | 18.10 / 18.80 | 10.80 / 13.20 | 2.35 / 5.06 as reported |
| [Roundhouse checkpoint](garage-step4-checkpoint.md#4-perf-at-the-roundhouse-not-a-gate) | 568 / 1,441,205 | — | 20.50 / 36.70 | 4.26 / 6.26 render |
| [Port Quay profile](port-quay-frame-profile.md#method-and-baseline) | 191 / 461,737 ([Checkpoint D](greybox-leg4-checkpoint-d.md#port-quay-performance)) | 18.11 / 18.85 | 11.63 / 14.09 | 8.01 / 9.66 span |
| [Camp landing](../plans/start-landing.md#as-built) | — | — | — | — |

HOTBOX's Canopy and Roundhouse counts came from separate headless samples. The HOTBOX Roundhouse timing ended above its quiet threshold. HOTBOX's Port callback cadence was also measured in a blank tab. Camp has no matching HOTBOX timing in its plan. These samples compare different hardware, display cadence and builds.

**Keep the Port Quay culling pass on hold.** The Mac fell short of 120 Hz callback cadence, but its 18.50 ms maximum did not reproduce the documented missed-60-Hz pattern. HOTBOX's broad off-camera ablation saved 2.57–3.46 ms of render CPU and 0.82–1.16 ms of GPU scene time, clearing 0.2 ms. The eligible subset's ceiling on the Mac remains unmeasured. [Ceiling rule](../decisions-process.md#d-2026-11-18-decisions-page-process)

Raw logs and load verdicts are in `.look/mac-frame-readings/` on Music Man. An initial Canopy run raised two resource 404s, so the table uses the clean rerun with the harness's Chromium channel selected. The completed Canopy sample was retained after its cleanup hung.

not tested on a phone
