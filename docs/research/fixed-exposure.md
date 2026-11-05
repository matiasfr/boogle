# Fixed HDR exposure — 5 November 2026

Implemented the owner's fixed-exposure decision in `d8bdd02b`, on `codex/fixed-exposure`; no push.
**Starting calibration, not final owner approval:** surface gain **0.12**, underwater **+1.22 EV**,
smoothstep over signed wave depth **0–1.5 m**, fully submerged gain **0.27954**.
HDR targets, Neutral, sky, lights, material values and water optics are retained.

## Reuse and integration

Research inspected locally: `codex/dark-unlit-exposure` at `40cf32c0`,
`docs/research/dark-unlit-exposure.md`; bounded implementation and findings from
`codex/color-vibrance-3` at `f25ee484`. Reused its signed-depth export and medium-centre equation.
At width zero, `clamp(gain, centre, centre)` is exactly `centre`; the meter dependency and its construction
are removed entirely, including both draws and history copy. No per-frame CPU/GPU exposure readback.
The research branch's light/pigment changes were not imported.

`src/render/exposure.ts` is the small shared Local owner. The separate **unlit-brightness** job should
divide selected readable materials' linear RGB by `surfaceExposure`, leaving alpha, occlusion and underwater
attenuation intact. This is fixed-reference compensation: the underwater lift remains intentional.
Do not hardcode 8.33, boost all Basic materials, or double-compensate existing boosts. The shared
`fixedExposureGain(depth)` also describes the exact medium-dependent output gain if a later policy needs it.
Classic-home reference gain is 1. Integration with the other job has **not** been tested.

Dev → Water → Post reuses `post.centre` and `post.underwaterEV`, numeric fields, sliders, reset,
persistence and copy. Looks reports gain/EV and submerged gain; its obsolete lock UI is removed.
The old lock command remains a no-op compatibility marker for captures, and cannot freeze water depth.
No new settings app, room state, gameplay, lights or material retuning.

## Opened evidence and observations

Question: does one authored gain preserve readable town, signs, shore, sand, interiors and underwater,
without a brightness flash at the waterline? The stills use the existing built-town fixture, 1180×820,
DPR 1, 4× MSAA, Current/Neutral, six real seconds of settling per camera. They are **authored fixtures**,
not played progression or pixel-identical animation freezes. The exact cameras and readbacks are retained
in each `views/views.json`. All nine before/after PNGs were opened, plus the museum retry, controls still,
crossing sheet/curves, consecutive-video sheets, and both bot end stills.

- [Before manifest](../../.look/evidence/1793870436959-9056/evidence.json), [views](../../.look/evidence/1793870436959-9056/views/views.json).
- [After manifest](../../.look/evidence/1793870773610-22412/evidence.json), [views](../../.look/evidence/1793870773610-22412/views/views.json).
- [Controls manifest](../../.look/evidence/1793870964646-29330/evidence.json): actual input events changed bindings to .18 / .8 EV, persisted and copied both, and reset to .12 / 1.22. Opened the visible panel with both numeric fields.
- [Waterline manifest](../../.look/evidence/1793871069487-33587/evidence.json): ordinary Place without Dev tuning, continuous diagnostic camera descent/ascent, 18 seconds, video and curves. Not a player-controlled swim.

| View | Observed result / remaining issue |
| --- | --- |
| Town | Brighter cream, path and Buddy; shapes and carried load remain distinct. |
| Sign / furnished doorway | Red ink and paper become darker. Legible close up, but readable-unlit compensation is still needed. |
| Shore | Teal shallows and caustics remain close to the baseline; wave phase differs. |
| Sand | Much brighter: the uniform test patch changes from RGB 138/101/45 to 212/163/95. This reproduces the research's bright-sand regression. This camera measures colour, not terrain detail. |
| Sun-facing sky | Darker blue: sample (1000,100) changes 34/67/111 → 17/48/85. Sun/cloud separation remains, but the darker-sky regression is unresolved. |
| Shop | Counter, hangers and boards remain separated, but the interior is substantially darker; wall sample (700,250) changes 140/125/90 → 92/79/48. |
| Museum | Final blue crystals, violet rings and model town remain visible. Initial before view clips the carried load; the isolated retry catches an unfinished shell. A clean matched furnished-museum baseline is **not established**. |
| Underwater | Floor caustics, water volume and surface remain readable with the offset; no broad whitening observed. |
| Waterline | Inspected the 12-frame sheet and 30 consecutive encoded frames each at video seconds 4–5 and 13–14, extracted with ffmpeg. The boundary moves through the frame without an obvious full-frame flash; shallow water is darker before the depth lift reaches full strength. |

The consecutive sheets are [entry](../../.look/evidence/1793871069487-33587/entry-consecutive.png)
and [exit](../../.look/evidence/1793871069487-33587/exit-consecutive.png).
Encoded frames may repeat or skip game frames; curves describe the stationary player and moving camera,
not exposure readbacks. Real-time smoothness, swimming feel, taste and final calibration need a person.
No attempt was made to hide the sand/sky/interior tradeoffs by changing lights or materials.

## GPU and checks

Two serial three-second samples at the same town camera; non-fallback Apple Metal-3, 1180×820, DPR 1,
4× MSAA, bloom off. GPU numbers are earliest-start/latest-end spans, not summed pass timers.
Other applications/jobs and thermal state were uncontrolled. No defensible speedup claim:

| | GPU mean ms (runs 1 / 2) | GPU p95 ms | Render contexts |
| --- | ---: | ---: | ---: |
| Before | 5.724 / 6.085 | 6.415 / 6.967 | 7 |
| Fixed | 7.120 / 7.469 | 9.203 / 9.009 | 5 |

Raw timestamp samples and target inventory: [before](../../.look/evidence/1793870436959-9056/views/gpu.json),
[after](../../.look/evidence/1793870773610-22412/views/gpu.json). Scene colour remains `rgba16float`.
The reduction by two contexts verifies stopped meter draws; the observed timing regression remains reported.

- `npx prettier --write` on changed files; final `npm run check` **passed** (lint, types, 326 unit tests, registry, levels, assets, build). Earlier runs exposed the decision-index reading budget (shortened) and one existing replay-test timeout under machine load; the serial rerun passed without changing tests.
- Broker [world-inputs](../../.look/evidence/1793871283243-39181/evidence.json) and [smoke](../../.look/evidence/1793871376813-40683/evidence.json) **passed**, no graphics errors.
- [Baseline bot](../../.look/evidence/1793870313738-6281/evidence.json) failed the 45-second no-new-beat limit before waking the machine.
- [Final bot](../../.look/evidence/1793871627680-49703/evidence.json) failed the 120-second no-new-beat limit at 316 game seconds: machine woken, chopping/delivery, T1/T2 laid and gifts opened; path/trains/interior visits and later beats never marked. Read its [report](../../.look/evidence/1793871627680-49703/run/report.txt) and opened its end still. No page/graphics errors. This is not a successful full playthrough.
- An explicit `dev=0` capture timed out because it removes the harness debug-camera flag. The fresh ordinary Place retry above passed. No harness or gameplay fix was added.

**not tested on a device**. No human calibration/feel approval, unlit-brightness integration, alternate-lighting
calibration or full played route is claimed. The launcher supplies final build fingerprints and copies the
evidence artifacts beside its handoff; earlier comparison captures precede documentation-only commits.

Process departure: the repo-required `npm run inflight` was invoked before its implementation was inspected;
it invokes origin fetch despite this task's local-network-only restriction. No push, ship or other external
network access was performed. All browser work used the provided broker.
