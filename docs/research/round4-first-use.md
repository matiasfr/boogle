# Round 4 first-use pipelines — 3 November 2026

The first worn rails and opened glider did create synchronous render pipelines after loading. The carried meshes
were detached until the avatar's update, and the canopy stayed detached until first opened; whole-scene compilation
could not reach them. The glider also needed a separate double-sided shadow pipeline. This is a credible hitch
source, **not proof that it caused all of the recorded Safari/iPhone stalls** (677/411 ms after rails, 513/406 ms
after gaining the glider). Those playtest records do not include pipeline traces.

The fix registers the carry geometry/material variants with the existing loading warm-up. The canopy and worn
gear briefly join the existing asynchronous loading frame, including its real shadow pass, and are removed in
`finally` before any await. The place import now completes before that frame so its registrations cannot miss it.
The existing 16-second loading escape stays unchanged. No gameplay state, extra animation loop or quality change.

## Broker measurements

Local WebGPU Chrome capture, `proto=place&coop=0&water=old&startup=1`, real-time warm-up, unchanged fixed camera
on the avatar. The action changes carried rails from zero to four, then enables the glider and opens its canopy,
then repeats rails; each interval is 1.5 seconds. This exercises actual first-use render paths without simulating
the pickup journey. Startup recorder marks identify pipeline owner, cache key and target. No exclusive Metal
cache reset or original device was available in this run; these are warm-cache diagnostics, not cold benchmarks.

| Measurement | Before | After |
| --- | ---: | ---: |
| First rails: synchronous render-pipeline calls | 1 | 0 |
| First glider: synchronous render-pipeline calls | 2 (cloth and shadow) | 0 |
| Repeat rails: render-pipeline calls | 0 | 0 |
| Largest callback interval in first-use windows | 16.8 ms | 16.8 ms |
| Navigation to `boot:interactive` | 2.094 s | 2.294 s |

The framed pair added 200 ms of loading wall time; another unchanged baseline loaded in 2.424 s. This small
sample does not establish a loading regression or a statistically unchanged loading time. No extension to the
deadline was needed. The original 400–677 ms stalls were not reproduced, so no real-device before/after reduction
can be reported. GPU sharing with unrelated jobs cannot be excluded.

- [Framed baseline](../../.look/evidence/1793773617167-40030/evidence.json): first rails and glider pipelines recorded.
- [Intermediate warm-up](../../.look/evidence/1793773770437-46741/evidence.json): direct materials warmed, but one
  glider shadow pipeline remained; this prompted the real-frame fix.
- [Final warm-up](../../.look/evidence/1793773840318-49449/evidence.json): zero pipeline calls in all three windows.
- [Additional baseline](../../.look/evidence/1793773589609-37401/evidence.json): 2.424 s boot; camera was outside
  the player view, so its glider main-pipeline result is excluded.

All three framed captures passed WebGPU, advancing completed game frames and no page/console/graphics errors.
Opened `hitch-before-framed-still.png`, `hitch-after-compile-still.png`, and `hitch-after-frame-still.png`. The visual
question was whether first-use rails, canopy and shadow still render correctly. Each shows the upright dark rails,
teal/cream canopy and coherent cloth shadow. Real-time feel and Safari/iPhone behavior remain unverified.
An earlier baseline was rejected because the launcher's checkout changed during capture; worker source was unchanged.

DESIGN.md: **Small and readable — measure before optimizing**.
