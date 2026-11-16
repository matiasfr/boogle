# Grant C1: Detail hunting and disappearing models

> **Verdict:** fast-frame jitter made Detail hunt; changing the shadow light key rebuilt pipelines and hid receivers.
> **Top recommendations:** keep the 18.5 ms late-detection floor and switch shadow intensity without changing the light key.
> **Status:** adopted in #1864 (15 November 2026); the measurements below are historical, with contention limits stated.

Implemented on `codex/grant-c1-detail-stability`, based on `303e30a8a`; shipped in #1864.
Serves **Small and readable** and **Slapstick over precision**: stable drawing before extra detail.

Grant's session `mwh4pmui-mpbh7trk` reported p50 6.2 ms, p95 8 ms, 65 Detail marks and 67 resolution-change marks.
The queue's Corrections section is authoritative: 12 hitches, logged twice each, among 43 shadow-rung transitions;
21 sea-rung transitions did not hitch. No shadow hitch after 17:45. This is not 24 hitches or every switch hitching.

## Cause and fix

The governor treated an interval above 1.5 times its rolling 10th percentile as late, independently of the 18.5 ms
moving-average budget. With high-refresh jitter, a low percentile can make ordinary fast frames count as overload.
The window is 120 callbacks, only about 0.75 s at 160 Hz. A simulated 4.25/5.25/6.25/7.25/8.25 ms series gives a
4.25 ms cadence and a 6.375 ms late threshold: 40% of its perfectly fast intervals look late. Alternating 30 s of
that jitter and 30 s at 6.25 ms produced **21 quality changes in 180 s**, including repeatedly shedding both live
detail rungs. The raw play log has aggregates, not the governor's interval window: this reproduces the fault,
but does not establish Grant's exact refresh rate or raw timing distribution. His log counts roughly 145–160
callbacks/s in early five-second samples; the 120 Hz hypothesis is not confirmed.

Late detection now has an 18.5 ms floor, consistent with the existing overload budget. Calm recovery accepts
medians inside that budget too. The same simulated series produces **zero quality changes**. Genuine slower
frames still drop resolution and shed detail, and the existing 30 Hz browser-cap and recovery/backoff tests pass.

The shadow adapter changed `sun.castShadow`, changing the light key for every receiver. Chromium recreated
pipelines and skipped their draws while asynchronous compilation completed. Instead, keep `castShadow` true;
switch the existing shadow-intensity uniform and `shadow.autoUpdate`, with `needsUpdate` following the setting.
Off retains receiver sampling and the allocated map but removes shadow strength and ongoing shadow-map rendering.
It avoids a second pipeline variant and its load-time preparation cost. The frozen sky used to write intensity
and map updates every frame; those writes and its saved/restored shadow state are removed so the Graphics owner
keeps control. The ladder remains **resolution → sea detail → sun shadows → MSAA**; MSAA remains next-load only.

## Chromium measurements

Mac Apple M1 Max (32 GPU cores), Chromium harness using WebGPU/Metal, 2208×1281 at DPR 1, 4× scene MSAA,
fixed resolution, simpler sea, identical camera `(1028,49,-117)` toward `(1000,31,-144)`.
Waited for `shaderStats().allDone`, then two seconds; measured six alternating one-second shadow-off/on windows
before screenshots or recording. Instrumented the real scene render and backend pipeline creation, not extra draws.
These are render-submission CPU timings, not GPU execution or display presentation times.

| Measurement | Before | After |
| --- | --- | --- |
| New pipelines per shadow-off transition (three repeats) | 20, 20, 20 | 0, 0, 0 |
| New pipelines per shadow-on transition (three repeats) | 41, 41, 41 | 0, 0, 0 |
| Maximum scene-render CPU ms, off windows | 197.6, 204.5, 192.7 | 3.9, 3.4, 3.1 |
| Maximum scene-render CPU ms, on windows | 231.7, 223.2, 230.5 | 4.4, 3.9, 3.9 |
| Draw calls, off | starts at 74, settles at 173 | 173 on every sampled frame |
| Draw calls, on | starts at 57, settles at 251 | 251 on every sampled frame |

After: off is intensity 0/update false; on is intensity 1/update true; `castShadow` stays true throughout.
The effective shadow setting survives subsequent sky updates. Off removes **78 draw calls** without the transient
receiver-draw loss. Before, the first shadow-off frame submitted 71,500 triangles versus a settled 537,030;
the first shadow-on frame submitted 64,188 versus a settled 626,738. This is direct evidence of skipped geometry.

Contention: the bot queue serialized these browser runs, but unrelated CPU jobs were active. The baseline load
average was 7.88→8.78; the corrected run was 23.35→21.28. Treat the CPU numbers as observations on this Mac,
not a quiet-machine budget or Grant-device sign-off. Zero pipeline builds and stable draw counts are separate
observations from those timing limitations. Grant's historical 259–327 ms hitches are not these local measurements.

An intermediate run showed zero new pipelines but still 251 draws with shadows requested off: the frozen sky
was undoing the uniform switch. That run is preserved as `c1-after`; only `c1-final` above measures the corrected owner.

Raw local evidence (gitignored): `.look/c1-before.log`, `.look/c1-before-data.json`, `.look/c1-before-verdict.json`,
`.look/c1-final.log`, `.look/c1-final-data.json`, `.look/c1-final-verdict.json`. The manifests record base commit and
dirty-file count; the baseline production sources were unmodified and final production changes are this branch's diff.

Reproduce the numerical probe:

```sh
npm run look -- --real --query dev=1 --size 2208x1281 --warm 0 \
  --eval dev/look/evals/detail-switch.ts --cam 1028,49,-117 --look 1000,31,-144 --name detail-switch
```

For a separate five-second visual capture, add
`--action dev/look/evals/detail-switch-action.ts --seconds 5 --frames 20 --video`.
The action moves the player into view so the real player's shadow frustum covers the timber camp, then switches
off/on/off/on at one-second intervals. This separate action's captures are not used for the timing table.

## Checks

The new simulated-frame regressions are:

- `does not hunt or shed detail on fast high-refresh frames with interval jitter` (fails before: 21 changes; passes after).
- `still sheds when high-refresh intervals exceed the 60 Hz frame budget` (passes, preserving real overload response).

`node --test test/resolution-governor.test.ts`: all 10 pass.
`node dev/ship-check.ts HEAD`: registry passes, 7 scoped lint files have zero problems, TypeScript passes,
562 cases across 65 selected test files pass (111 s on this loaded machine). Log: `.look/c1-checks.log`.
`git diff --check`: passes.

Chromium `c1-before`, `c1-final` and `c1-switch` capture-health checks pass: WebGPU, advancing completed game
frames, no page/console/graphics errors. The separate `c1-switch` action capture records five seconds of real-time
video and 20 timestamped stills. Inspected the final still and all 20 sheet samples (0.000–6.480 s; screenshot
overhead stretches the five-second requested interval). Trees, track, train, chimney and hut stay present as
shadows disappear around 1.048–1.376 s, return at 2.064 s, disappear at 3.096 s, and return at 4.108 s.
This is sampled visibility evidence; real-time playback and display presentation smoothness are unverified.

- [Inspected final still](../../.look/c1-switch-still.png)
- [Inspected motion sheet, reduced for viewing](../../.look/c1-switch-motion-review.png)
- [Original motion sheet](../../.look/c1-switch-motion.png)
- Recording: `.look/c1-switch-realtime.webm`; manifest: `.look/c1-switch-verdict.json`.

Not tested on Grant's Dia/Chromium 157 machine or an iPad/phone. The fix retains shadow-map memory and receiver
sampling when off; the measured saving is the removed shadow pass, without switching pipeline variants.
