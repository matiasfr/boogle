# Fixed exposure follow-up — 5 November 2026

> **Verdict:** Fixed HDR exposure calibrated on rebased evidence.
> **Top recommendations:** 1. Use one fixed gain that keeps labels readable without washing out sand or sky.
> **Status:** adopted. See [fixed-exposure](fixed-exposure.md), [Look](../decisions.md#look).

This supersedes the measurements and starting calibration in [the initial report](fixed-exposure.md).
The branch was rebased onto **f0f9bcaa**, the requested readable-unlit merge. Shared `origin/main`
advanced to **19c4c94e** during testing; later-main compatibility is not verified. No push or ship.
Final runtime is **397dbc9c**; **ca93f9e4** only fixes the Dev-control verification script.

## Integration and starting values

`readable-unlit.ts` now divides scoped RGB by the single shared `surfaceExposure` uniform.
The old 10.92 multiplier is removed. A WeakSet makes repeated wrapping idempotent;
alpha is unchanged. Reward particle intensity uses the same authored surface gain once,
at spawn. Smoke and dust retain their existing intensity. Existing live particles retain
their spawn intensity until expiry when the owner moves Dev's gain control.

Start at **surface 0.16, underwater +0.81 EV**: fully submerged gain **0.28051**.
The existing signed-depth smoothstep spans 0–1.5 m. Compensation cancels only surface gain,
so underwater lift still applies. HDR targets, Neutral, lights, materials, sky and water optics
remain unchanged. This is a compromise for owner calibration, not an approved final look.

The final shader skips a lens-storage read away from water and skips the underwater
exponential when signed depth is nonpositive. The dry ramp is mathematically zero there.
These preserve underwater behavior and do not introduce passes or alter simulation.

## Visual question and verdict

Can one fixed gain preserve readable labels/rewards and useful indoor/underwater detail
without washing out sand or making the sun-facing sky too dark?

Opened all 15 fresh [before views](../../.look/evidence/1793873454068-85237/evidence.json),
the [corrected dry-sand before](../../.look/evidence/1793873812228-91215/evidence.json),
and all 15 [final after views](../../.look/evidence/1793875835063-9601/evidence.json):
town, station label, sign, shore, sand, sun-facing sky, underwater, waterline, shop,
museum, crystal, crystal pickup, crate, crate break and crate prize.
The images are in each manifest's sibling `views` directory. Crystal/crate captures use
the real game factories and interactions in an authored fixture, not played progression.

- Station cream lettering and outlines remain readable. Sign red is deeper than the old boost.
- Crystal blue facets, pale blue pickup particles, crate breakup, hat and confetti are visible.
  Dust remains subdued brown and town smoke remains gray.
- Town paths, shore caustics and underwater teal floor detail read clearly. Museum rings,
  facets and furniture remain visible. Waterline separates the two media clearly.
- **Shop remains darker than auto exposure**, despite improving over the initial 0.12 setting.
- **Sand remains brighter than auto exposure**; the final image retains color instead of white
  clipping. **Sun-facing sky remains darker**. One global gain cannot match all three scenes.
  These regressions remain for the owner; no compensating light/material changes were made.

The [gain bracket](../../.look/evidence/1793873875978-91876/evidence.json) covers 0.10,
0.12, 0.16 and 0.20, keeping submerged gain near 0.28. Opened all four sand/shop images,
station endpoints, and the 0.16 sky/underwater images. 0.20 makes sand too pale; 0.10/0.12
leave the shop too dim. 0.16/+0.81 EV is the best tested compromise, not an objective optimum.
Representative RGB pixels from fixed positions quantify the tradeoff, not image quality:

| Gain | Shop (700,250) | Sand (600,350) | Sky (1000,100) |
| --- | --- | --- | --- |
| 0.10 | 82/70/40 | 173/133/80 | 13/43/78 |
| 0.12 | 92/79/48 | 189/146/91 | 17/48/85 |
| 0.16 | 110/96/65 | 217/169/109 | 26/58/99 |
| 0.20 | 125/110/78 | 236/185/123 | 34/67/111 |
| Auto baseline | 140/125/90 | 138/103/54 | 34/67/111 |

Opened the final [crossing](../../.look/evidence/1793876247706-11093/evidence.json)
12-frame motion sheet, curves, and entry/exit sheets each containing 30 consecutive encoded
video frames extracted with ffmpeg. No obvious whole-frame flash: the medium darkens on
entry, then the depth lift increases. This moves a diagnostic camera through the real water;
it is not a player swimming test. Encoded frames can repeat or skip, so real-time feel and
smoothness still need a person. The curves describe camera/player motion, not gain telemetry.

Opened the [Dev panel](../../.look/evidence/1793876448772-12642/evidence.json): both
0.16 and +0.81 EV are displayed. Actual input events verified bindings, persistence, copy,
reset, inverse intensity and idempotent wrapping of a real board material. The first control
run failed because a page eval used a bare three.js import; the real board-factory rerun passed.

## Serial GPU comparison

Same town camera, 1180×820, DPR 1, MSAA 4, bloom off, Apple Metal WebGPU. Each visit has
two consecutive five-second hardware timestamp samples after settling, about 300 complete
spans each. Baseline restores the seven exposure/render integration files from f0f9bcaa;
all other gameplay and the camera fixture match. Those seven files are also unchanged at
19c4c94e. No browser runs or builds were concurrent within this job. Other Mac jobs, thermals
and GPU clocks were uncontrolled. Times are earliest-GPU-start to latest-GPU-end spans,
including gaps, not summed active pass time or presentation latency.

Final serial **A–B–B–A**, with A the rebased auto baseline and B the final fixed runtime:

| Visit / manifest | Mean ms (two samples) | p95 ms | Render contexts |
| --- | --- | --- | --- |
| [A1](../../.look/evidence/1793875772481-9284/evidence.json) | 6.219 / 6.055 | 7.337 / 7.141 | 7 |
| [B1](../../.look/evidence/1793875835063-9601/evidence.json) | 6.372 / 6.555 | 8.408 / 8.438 | 5 |
| [B2](../../.look/evidence/1793875971831-9923/evidence.json) | 7.438 / 7.196 | 7.846 / 7.733 | 5 |
| [A2](../../.look/evidence/1793876027576-10252/evidence.json) | 7.213 / 6.761 | 7.985 / 7.709 | 7 |

Mean of sample means: **6.56184 → 6.89032 ms, +0.32848 ms (+5.01%)**.
The paired excess is +0.3264 ms in forward order and +0.3305 ms in reverse order.
The positive difference survives both orders here. The earlier roughly +1.4 ms magnitude
is not stable, but this is still a measured regression, not a speedup. Both have 13 compute
dispatches in four compute passes; scene color remains `rgba16float`. Seven to five contexts
verifies removal of the two meter draws, not lower total GPU time.

Before guards, a separate ABBA averaged 6.356 → 7.060 ms; with only the dry storage guard,
another averaged 6.850 → 7.467 ms. Drift prevents attributing all improvement to the guards.
All 38 samples and raw-manifest references are consolidated in
[measurements.json](../../.look/evidence/1793875835063-9601/views/measurements.json).

Isolation evidence, with every temporary ablation removed before final captures:

- Existing [meter on/off/off/on control](../../.look/evidence/1793874698092-99964/evidence.json),
  same live output shader: 7.250 / 6.789 / 6.641 / 6.714 ms. Meter-off averaged 0.267 ms lower.
- Temporary [constant dry gain](../../.look/evidence/1793874864665-1473/evidence.json)
  averaged 5.270 ms; [restoring depth gain](../../.look/evidence/1793874931862-1892/evidence.json)
  averaged 5.623 ms. This implicates the extra full-frame depth/gain path, which render-context
  counts do not measure, but does not isolate its exact cost.
- Conditional dry storage/arithmetic reduced unnecessary work. **The residual cause remains
  unresolved**: ALU, storage/resource synchronization, submission gaps and shared GPU scheduling
  cannot be separated by these whole-span measurements. Exclusive GPU/per-pass profiling is
  needed before claiming a specific root cause or a performance win.

## Bot and checks

Read both reports and opened both end stills:
[baseline](../../.look/evidence/1793873587777-88407/evidence.json) and
[final fixed](../../.look/evidence/1793876112309-10652/evidence.json), both with
`playthrough --query 'proto=place&shot=play' --stall 120`.
Both lay Station 1/2, open gifts and then fail the no-new-beat limit while repeating harvest
routes: baseline ends at 337 game seconds, fixed at 347. Neither reports page/graphics errors.
Repeated harvest messages normalize to the same harness beat and do not reset its timer.
**The stall reproduces without fixed exposure; this patch did not introduce it.** Neither run
completes the full route. Later main contains axe-progression/bot changes (2236d075, 24b90222),
but those changes and a successful complete playthrough are not verified in this job.

- [world-inputs](../../.look/evidence/1793876560424-12925/evidence.json): passed.
- [smoke](../../.look/evidence/1793876634057-13123/evidence.json): passed.
- `npx prettier --write` on changed files and `npm run check`: passed (lint, types, all
  330 unit tests, registry, levels, assets and build). Log: `.look/followup-check.log`.

Bookkeeping: the exploratory 1793873313243-82826 run was named “main-before” but actually ran
the candidate after a blocked restore; it is excluded from baseline comparisons. Two failed
sand framings saw a structure/water; the H-based dry-shore retry above supplies the comparison.
Execution success was not treated as visual approval. Final browser evidence matches runtime
397dbc9c; later changes are the control verification script and documentation only.

**not tested on a device**. Owner calibration, real-time swimming feel, full played progression,
later-main compatibility and exclusive-GPU attribution remain unverified. Assessment: **partial**;
integration and calibration are implemented, but the measured GPU regression remains open.
