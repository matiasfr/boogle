# Where Port Quay's frame goes

**Recommendation:** Keep Ring Island moving. Confirm Chromium's callback and presentation cadence on another setup
before assigning a Port Quay optimization pass. The blank-tab control reproduces the callback interval, and the scene
ablations below price optional headroom separately.

## Method and baseline

HOTBOX, Windows, Node 26.13.0, NVIDIA RTX 3080 (Chromium WebGPU reports non-fallback NVIDIA Ampere), display mode
60 Hz. Main at `a613408dd`, `port-reached` seed, body settled at `[140.5, 4.3, 931.1]` with the quay mounted,
camera `[300, 100, 780]` looking at `[45, 28, 980]`. Fixed 960 × 600, DPR 1, 4× MSAA.
`npm run perf -- --view port --hardware --seconds 10 --verdict .look/port-profile/baseline-verdict.json`
ran with a wall timeout in the exclusive bot slot. Load was 2.92 → 1.80 busy logical CPUs out of 20, `shared: false`,
`underLoad: false`, and the harness reported zero graphics errors.

| Metric (ms) | Average | p95 | Max | Samples |
| --- | ---: | ---: | ---: | ---: |
| Completed-frame callback interval | 18.11 | 18.85 | 19.17 | 552 |
| Main-thread game frame | 11.63 | 14.09 | 18.30 | 553 |
| Full GPU span | 8.01 | 9.66 | 11.93 | 552 |

The 10.02-second sample completed 553 frames. [Checkpoint D](greybox-leg4-checkpoint-d.md#port-quay-performance)
measured 18.07 / 11.47 / 7.96 ms in those same three rows. [World-streaming Checkpoint B](../plans/world-streaming.md)
measured GPU spans of 15.37 / 12.94 / 16.78 ms at desktop spawn, far and head, with different views and settings.

## Cadence and the GPU gap

The [harness](../../dev/look/perf.ts) uses [prof-overlay](../../src/debug/prof-overlay.ts). The interval is the
difference between animation callback timestamps for completed game draws. Display scan-out timestamps are unavailable.
CPU is elapsed main-thread time from the game's `beginFrame` through its final render submission, excluding subsequent
browser work and asynchronous GPU execution. GPU span uses the earliest and latest fresh GPU timestamps for all
expected render/compute contexts in each frame. One frame lacked a full span. The GPU and CPU clocks have no common
origin in this capture. Adding their means gives 19.65 ms, so treating both as successive blocks of the 18.11 ms callback
period gives the wrong model.

The same-clock GPU timestamps show 5.84 ms on average between the last timed compute ending and the first render
starting. Between consecutive frames the last timed GPU work ended 10.10 ms before the next frame's first timed work.
Those intervals include gaps in the measured work and can include uninstrumented work. Timed passes averaged
0.642 ms scene, 0.399 ms shadow map, 0.091 ms canvas and 0.049 ms compute. The shadow and scene pass costs therefore
have much less GPU work to remove than the 8.01 ms span suggests. The 19.17 ms maximum interval rules out a simple
mixture of 16.7 ms callbacks and 33.3 ms skipped-refresh callbacks in this sample.

The profiler starts timestamp resolution asynchronously after the game frame, using one pending resolve per pool.
The game loop submits work synchronously and has no await on GPU completion. An async readback can still affect
submission or scheduling by adding work. The baseline alone cannot place CPU and GPU on the same timeline.

The same headed Chromium page, after navigating to a blank document, had a median callback interval of 18.10 ms
(p95 18.70 ms, 240 intervals). Port Quay's median callback interval with the profiler panel hidden was 18.23 ms.
With WebGPU timestamp collection disabled, it was 18.27 ms. Independent page rAF and completed-frame intervals
matched in these windows. The game follows the browser's roughly 18.2 ms cadence on this host, despite the 60 Hz mode
reported by Windows. Timestamp readback and skipped game draws do not explain the steady offset from 16.67 ms.
This diagnostic passed in an exclusive slot at 1.78 → 3.57 busy logical CPUs.

A separate two-second Chromium trace had 110 compositor `ExternalBeginFrameSource::OnBeginFrame` events with a
median spacing of 18.19 ms (p95 18.83 ms), while the events advertised a nominal 16,666 µs interval. Windows
`WaitForVSyncImpl` recorded `has output: false` and `WaitForVSync Sleep` repeated every 18.21 ms (median).
This points to Chromium's sleep-based Windows vsync fallback driving the regular callback interval in this session.
It also explains why the test can average about 55 callbacks/s without regularly skipping every second 60 Hz callback.
The trace does not measure scan-out or determine why Chromium could not use a display output for vsync.

## CPU per system

The perf table uses section marks over the latest 240 frames. The render bracket includes traversal, matrix propagation,
render lists, command encoding and submission. Its components overlap the sampling profiler rows below.

| Rank | Section | Average ms | p95 ms |
| --- | --- | ---: | ---: |
| 1 | Render CPU bracket | 4.592 | 5.910 |
| 2 | Physics | 3.875 | 6.090 |
| 3 | Railway update | 2.094 | 2.800 |
| 4 | Prompt late update | 0.350 | 0.445 |
| 5 | Town update | 0.103 | 0.905 |
| 6 | Particles | 0.091 | 0.120 |
| 7 | Frozen-matrix audit (dev only) | 0.059 | 0.010 |
| 8 | Player view update | 0.041 | 0.055 |
| 9 | Camera update | 0.033 | 0.045 |
| 10 | Cove stop fixed pre-update | 0.031 | 0.040 |


Chrome's separate 5-second sampling run covered 272 completed frames. Inclusive sampled time per frame was 1.16 ms
in three's `updateMatrixWorld` (counting recursive stacks once), 1.67 ms in `renderShadow` and 0.08 ms in
`submit`. The 4.59 ms marked render bracket is the baseline submission-path budget. These sampled functions are
overlapping estimates from a run with profiler overhead and should not be added to the table.

The census's ten hottest entity `update` kinds, also trailing 240-frame averages, were railway 2.384, town 0.113,
player-view 0.055, camera 0.043, finds 0.028, Boogler 0.023, held 0.012, ambience 0.006, splash 0.006 and Ring Island
0.006 ms. The railway hook includes both the adapter and its views.



## Draw census

The [world census](../../dev/look/evals/world-census.ts) counted backend draw deltas in one completed frame. The
follow-up used the same group keys (object name and owner path) and classified shadow draws by the `ShadowMap` render
target. The frame had 141 draws and 444,337 triangles. The earlier perf snapshot had 191 draws and 461,737 triangles,
with 112 draws disappearing when the sun shadow pass was toggled across separate frames. The separate samples
can differ as trains move. The census below is the frame used to choose the visibility ablations.

| Group (owner path) | Main draws | Main tris | Shadow draws | Shadow tris |
| --- | ---: | ---: | ---: | ---: |
| Mesh (Scene/Group) | 25 | 40,724 | 11 | 29,196 |
| Mesh (Scene/Group/Group) | 12 | 64,312 | 12 | 64,312 |
| Box plan (Scene/Group) | 12 | 6,468 | 12 | 6,468 |
| Mesh (Scene/Group/box plan) | 4 | 96 | 4 | 96 |
| Mesh (Scene/Group/Group/Group) | 4 | 38 | 3 | 36 |
| Mesh (Scene/finds/secrets) | 3 | 6,196 | 3 | 6,196 |
| Place kit wheel (Scene/Group) | 2 | 86,016 | 0 | 0 |
| Route greybox deck (Scene/Group) | 1 | 71,076 | 0 | 0 |
| Route greybox things (Scene/Group) | 1 | 1,284 | 0 | 0 |
| Route greybox massing (Scene/Group) | 1 | 756 | 0 | 0 |
| Route greybox sign (Scene/Group) | 1 | 40 | 0 | 0 |
| Route greybox sign (Scene/Group/Group) | 1 | 40 | 0 | 0 |
| Sickle Isles horizon (Scene) | 1 | 2,986 | 0 | 0 |
| Mesh (Scene) | 1 | 18,528 | 0 | 0 |
| Other groups | 16 | 21,525 | 11 | 17,948 |
| **Total** | **85** | **320,085** | **56** | **124,252** |

The Sickle Isles horizon is distant scenery, already merged into one mesh. The route deck submits 5,923 boxes
in one draw, mixing the quay with distant approaches and other legs. Merging that batch further cannot remove its draw.
The census tests each instance's bounding sphere against the camera. Among meshes with frustum culling disabled,
63 had every instance outside the camera and still submitted 64 main draws and 214,392 triangles. They include one
43,008-triangle wheel batch. In the shadow pass, 45 such meshes submitted 46 shadow draws and 116,696 triangles. A caster outside
the main camera can still contribute a visible shadow, so the shadow ablation measures a ceiling only.


## Candidate work and measured ceilings

The second exclusive diagnostic passed at 2.55 → 3.03 busy logical CPUs. It used two eight-second controls around
the ablations. Controls varied from 16.12 to 19.00 ms of frame CPU and from 11.13 to 12.43 ms of GPU span. The
median callback interval stayed at 18.27–18.33 ms, with missed callbacks inflating the slower control's mean
and p95 to 19.73 and 36.47 ms. Ablation medians stayed within about 0.08 ms of both controls. Changes in moving trains
and CPU/GPU cost across the controls make these headroom estimates, with no demonstrated 0.2 ms steady-cadence gain.

| Candidate | Ceiling or full-removal proxy (ms/frame) | Clears 0.2 ms? |
| --- | --- | --- |
| Simplify far-only faces or split the route batches into cullable chunks | Removing the horizon plus all route deck, things and massing put the scene pass 0.51–0.84 ms below the two controls. That also removed near geometry. Hiding far ground tiles alone changed the scene pass by 0.002 ms against the first control and left the sampled draw count unchanged. | Whole route-and-horizon proxy clears on GPU. Far-only share unresolved. Skip far-ground work at this pose. |
| Cull entire off-camera batches | Hiding the off-camera census set removed 2.57–3.46 ms from the render CPU bracket and 0.82–1.16 ms from the GPU scene pass. This includes any shadows those batches cast. | Yes for headroom. Recheck single targets with the same train pose and preserve visible shadows. |
| Reduce shadow casters | The entire shadow pass cost about 0.40 ms of direct GPU work. Disabling the sun shadow pass saved 1.85 ms of game CPU in the first paired reading. Dropping 46 off-camera shadow draws in the follow-up saved 1.23–2.12 ms in the render CPU bracket versus the controls. Direct shadow GPU time stayed near 0.39 ms. | Yes on CPU for the full caster set tested. Specific caster savings need a matched subset. |
| Sleep off-screen update kinds | Town, finds, Boogler and Ring Island together cost 0.170 ms even if eliminated entirely. The full railway hook gives a 2.384 ms CPU ceiling, but its adapter and near views still need to run. | No for the four small kinds. The off-screen railway subset is unresolved. |
| Reduce static matrix traversal | 1.16 ms inclusive CPU for removing every sampled `updateMatrixWorld` stack. Only the static subset is eligible. | Broad ceiling clears. Static-only savings are unverified. |

If a second setup holds 16.7 ms at the same pose, keep the 18 ms HOTBOX result as a harness caveat. If it drops
frames with a real 60 Hz cadence, bisect off-camera batches first, with the train and sun held constant. Confirm
callback median, p95, max and compositor presentation, then price any proposed subset before briefing it.

Raw verdicts, timing JSON, group and parent detail, CPU samples and the Chromium trace are in `.look/port-profile/`
in the measurement worktree. Cross-platform timing, visible-shadow effects and physical display timestamps remain
unverified. not tested on a device
