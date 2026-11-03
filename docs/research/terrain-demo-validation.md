# Dry demo terrain: pictures and GPU cost

3 November 2026. Local comparison on `codex/terrain-demo`; implementation commit `38943241`. No push or rollout.
DESIGN.md: **Small and readable** and **Show, don't tell**. Local presentation only.

## Recommendation

**Shores only, as a material layer after an art pass.** The dry sand and filtered detail are useful, and the measured home-beach increment is about **0.3 ms**. Do not replace all land with this palette: it erases paths and the court, turns the warm gorge grey, and makes the existing trees/props look less integrated. Keep authored inland colours and readable facets. This is an image judgement, not an owner playtest verdict or an approved rollout.

The patch keeps the actual mesh, collider data, cave masks, shadow slots and base normal treatment. Each owning terrain file has one flag-gated import statement; all implementation is in `src/proto/water/terrain-demo.ts`. It reuses `ground.ts`'s baked noise, sand-normal and optional rock-normal builders through `patchNode`, with the source dry biome formula. It deliberately does not take wetness, swash, caustics, absorption, custom lighting, source geometry or source rock placement. Those belong to the other water job. Defaults remain unchanged.

## Opened boards, in viewing order

All **eight boards were opened**, including both halves. Today is **left**, demo terrain **right**, composed with `ffmpeg hstack`; each half is 1210×702, FOV 50, same camera and avatar position. The first four use today's sky/tone; the next four use `sky=demo&tone=agx&tod=0.24`. Both sets hold time at .24. NPCs, particles and water are live, not pixel-registered controls. The town train is staged and parked identically.

| Order / view | Board and capture manifests | Observation |
| --- | --- | --- |
| 1. beach, today’s light | [board](../../.look/evidence/1793733077017-28126/beach-today-board.png) · [left](../../.look/evidence/1793733066380-27919/evidence.json) · [right](../../.look/evidence/1793733077017-28126/evidence.json) | Sand gains quieter mottling and a wider natural transition; the expanded beach loses the painted court and makes the vivid palms feel separate. |
| 2. hill, today’s light | [board](../../.look/evidence/1793733106634-28855/hill-today-board.png) · [left](../../.look/evidence/1793733097156-28617/evidence.json) · [right](../../.look/evidence/1793733106634-28855/evidence.json) | Broader olive variation adds depth behind the purple avatar; pale sand climbs too high and the bright faceted trees no longer share the ground palette. |
| 3. town, today’s light | [board](../../.look/evidence/1793733139574-29445/town-today-board.png) · [left](../../.look/evidence/1793733126780-29288/evidence.json) · [right](../../.look/evidence/1793733139574-29445/evidence.json) | Mottling gives the lawn more variation and the train stays legible; removing the dirt paths weakens the town layout beside the simple cone trees. |
| 4. gorge, today’s light | [board](../../.look/evidence/1793733176417-30006/gorge-today-board.png) · [left](../../.look/evidence/1793733166045-29805/evidence.json) · [right](../../.look/evidence/1793733176417-30006/evidence.json) | Pale banks separate clearly from blue water; grey cliff walls lose the warm toy-world colour and expose the unchanged sharp, repetitive facets. |
| 5. beach, demo sky / AgX | [board](../../.look/evidence/1793732906560-24306/beach-chosen-board.png) · [left](../../.look/evidence/1793733087091-28428/evidence.json) · [right](../../.look/evidence/1793732906560-24306/evidence.json) | Under demo sky/AgX the avatar remains clear against sand; the sand is subdued and the old water looks grey, so this is not the complete water-demo look. |
| 6. hill, demo sky / AgX | [board](../../.look/evidence/1793732977646-26108/hill-chosen-board.png) · [left](../../.look/evidence/1793733116411-29059/evidence.json) · [right](../../.look/evidence/1793732977646-26108/evidence.json) | The quieter hill fits the chosen light, with the same visible facets; olive ground and saturated foliage still need a shared palette. |
| 7. town, demo sky / AgX | [board](../../.look/evidence/1793732926444-25431/town-chosen-board.png) · [left](../../.look/evidence/1793733152666-29617/evidence.json) · [right](../../.look/evidence/1793732926444-25431/evidence.json) | The red engine and residents still read; the lawn is more varied but paths vanish, and material detail cannot improve the simple tree silhouettes. |
| 8. gorge, demo sky / AgX | [board](../../.look/evidence/1793733196865-30416/gorge-chosen-board.png) · [left](../../.look/evidence/1793733186491-30232/evidence.json) · [right](../../.look/evidence/1793733196865-30416/evidence.json) | Light sand frames the avatar and dark river; grey walls are less welcoming than the current warm gorge, and the bank edge remains visibly angular. |

The supplied reference `/Users/matiasfranco/Developer/boogle-codex/demo-shots/board.png` was also opened. Its convincing whole depends on water optics, smoother authored shapes and rock geometry, not just ground colour. Initial framing attempts hid the hill avatar behind a rock and put the gorge behind trees/the spire; the listed final boards correct those views. No terrain was moved to frame them.

## GPU cost

Owner's **M1 Max**, broker WebGPU, real-time captures, fixed DPR 1, full-size scene target, stored **4× MSAA**, chosen demo sky/AgX at .24, existing water. No `water=new`. Home is the beach camera; Place is the gorge-bank camera. These are representative views, not worst-case whole-game budgets.

Used the supplied water-cost `.look/water-ranges.ts`, copied locally and adapted only for terrain switches and **render-only frames when no compute work exists**. The metric is **latest observed GPU end minus earliest render/compute start in the same completed frame**, never summed timers. `timestampFix=1` retains the supplied capture-only r187 resume correction. Every comparison is A/B/A in one tab, three 3-second windows, with 2.5 seconds to settle after a material switch. 24 comparisons / 72 windows, about 180 frames each: **zero invalid ranges, missing samples or partial coverage**. Both total comparisons keep five native raster passes; no terrain draws or meshes are added. Whole-scene draws vary with live objects (118–142 in the changed total windows).

**Shared machine, not an exclusive benchmark.** Our captures were serialized. Spotlight reached 100% CPU, metadata stores 81%, and speech maintenance 70% in one snapshot; Claude/ChatGPT agents and desktop renderers were active. Another snapshot showed Spotlight 79%, WindowServer 24%, Claude renderer 24% and active Chromium helpers. Those helpers may include this broker; there is no proof of an idle GPU, clock telemetry or thermal control. No other process was stopped. ± below is **half the difference between surrounding baseline means**, not a confidence interval and not all noise. Small deltas, reversed signs and cross-run baseline shifts must not drive optimizations.

| View / canvas and scene pixels | Today (mean of A windows), ms | Demo, ms | Added GPU span, ms | Demo window p95, ms | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| Home beach / 1920×1200 | 2.63 | 2.95 | +0.33 ± 0.12 | 4.34 | [A/B/A](../../.look/evidence/1793733244091-30699/evidence.json) |
| Home beach / 1210×702 | 1.65 | 1.95 | +0.30 ± 0.003 | 2.55 | [A/B/A](../../.look/evidence/1793733274327-30827/evidence.json) |
| Place gorge / 1920×1200 | 5.09 | 5.70 | +0.61 ± 0.36 | 6.27 | [A/B/A](../../.look/evidence/1793733304629-31020/evidence.json) |
| Place gorge / 1210×702 | 3.31 | 3.28 | -0.03 ± 0.08 | 3.75 | [A/B/A](../../.look/evidence/1793733335781-31189/evidence.json) |

The small Place result is unresolved. The large Place result has substantial drift. These do **not** reproduce or replace the earlier **2.62 ±0.24 ms** flat-material diagnostic: that was the full water-demo scene with a radically simplified material, different coverage and different work. This measures the incremental dry patch against today's already-lit terrain.

### Where the work goes

Positive entries below mean the named component costs more; negative entries are apparent results, **not evidence that added shading makes rendering faster**. Each cell links its own A/B/A evidence. Rows overlap and **must not be summed**. “Biomes” includes their three baked noise samples and compares against today; other rows isolate one change against full demo.

| Component, ms of GPU span | Home 1920×1200 | Home 1210×702 | Place 1920×1200 | Place 1210×702 |
| --- | ---: | ---: | ---: | ---: |
| Biomes + baked noise | [+0.70 ± 0.45](../../.look/evidence/1793733366680-31366/evidence.json) | [-0.03 ± 0.02](../../.look/evidence/1793733518922-45536/evidence.json) | [≈0.00 ± 0.15](../../.look/evidence/1793733673726-51945/evidence.json) | [-0.02 ± 0.03](../../.look/evidence/1793733879339-62701/evidence.json) |
| Three biome noise samples | [+0.23 ± 0.13](../../.look/evidence/1793733397281-33228/evidence.json) | [+0.05 ± 0.10](../../.look/evidence/1793733549479-47247/evidence.json) | [+0.08 ± 0.45](../../.look/evidence/1793733706129-53205/evidence.json) | [-0.11 ± 0.10](../../.look/evidence/1793733911699-63620/evidence.json) |
| Sand ripples, including footprint fades | [+0.18 ± 0.03](../../.look/evidence/1793733427506-33691/evidence.json) | [+0.11 ± 0.20](../../.look/evidence/1793733580027-49136/evidence.json) | [+0.37 ± 0.12](../../.look/evidence/1793733751941-55507/evidence.json) | [-0.31 ± 0.14](../../.look/evidence/1793733944972-64296/evidence.json) |
| Fine ripple octave | [-0.37 ± 0.24](../../.look/evidence/1793733458035-35003/evidence.json) | [-0.04 ± 0.08](../../.look/evidence/1793733610265-49768/evidence.json) | [+0.51 ± 0.48](../../.look/evidence/1793733797416-59545/evidence.json) | [+0.01 ± 0.001](../../.look/evidence/1793733978081-65057/evidence.json) |
| Optional rock bump on existing steep faces | [-0.17 ± 0.70](../../.look/evidence/1793733488631-40645/evidence.json) | [+0.08 ± 0.10](../../.look/evidence/1793733640381-50479/evidence.json) | [-0.04 ± 0.02](../../.look/evidence/1793733843778-61968/evidence.json) | [+0.35 ± 0.002](../../.look/evidence/1793734009454-65882/evidence.json) |

The useful resolved large-view ripple deltas are about **0.18 ms at home** and **0.37 ms in the gorge**. Small-view removal gives inconsistent signs, so it is not a portable saving. The fine-only toggle has no convincing adoption case; even the quiet small-gorge result is only about 0.01 ms. The optional rock bump adds about 0.35 ms in the small-gorge pair, but other views/runs do not reproduce a consistent increment. It stays optional. The demo's separate banded rock material/meshes are **not ported**, so their full cost is not claimed here.

**Swash: absent**, hence no swash texture samples or new pass in this patch. **Distance fades:** the shared sand builder skips the fine band at a 0.09 m/pixel XZ footprint and all ripple samples at 0.5 m/pixel. Fine amplitude fades across .03–.09, coarse across .15–.5. Their gates and arithmetic are included in the ripple row; fade arithmetic has **not been timed independently**. There is no unfaded fork or speculative optimization. No detail was trimmed from the full opt-in demo. Visibly different diagnostic options remain behind `terrainPart=`.

### Per-pixel texture sample budget

Logical texture-sampling operations **per shaded terrain fragment**, from the shared node builders, excluding unchanged shadow/environment sampling. Hardware filtering can fetch several texels per operation; 4× MSAA storage is not four executions of each sample.

| Variant | Fine footprint (<.09 m/pixel) | Middle footprint (.09–.5) | Far footprint (≥.5) |
| --- | ---: | ---: | ---: |
| Today's ground-owned noise | 0 | 0 | 0 |
| Full dry demo | 11 = 3 biome + 5 broad ripple + 3 fine ripple | 8 | 3 |
| Biomes / no-ripples | 3 | 3 | 3 |
| No biome noise (ripple noise retained) | 8 | 5 | 0 |
| Coarse | 8 | 8 | 3 |
| Optional rock bump | 14 | 11 | 6 |

The rock option adds three 3D samples (r2, coarse bump, fine bump). Its fine amplitude fades with distance but that sample is not distance-gated. Sand's mask can be zero on grass/steep faces **after** its samples: these are execution budgets, not only visible sand pixels. Average counts depend on screen coverage and were not GPU-counted. Baked noise storage is approximately **0.92 MiB** (256² RGBA16F with mip chain plus 64³ R8 volume), shared once across materials; startup bake cost was not benchmarked.

## Art work before adoption

1. Keep the court, dirt paths and POI paint as explicit authored masks, then layer natural colour/detail underneath. A terrain shader must not erase route information.
2. Retune beach height/width for Boogle's small hills; the source's biome thresholds belong to a much larger landscape. Match green, sand and warm rock under the chosen AgX light, including trees and prop contacts.
3. Keep deliberate facets, but author better bank transitions and less repetitive cliff silhouettes. Detail on a triangular cliff cannot supply the source's rock shapes. Use the optional 3D bump selectively where it improves a close view.
4. Compose the dry patch **before** wet-sand/caustic wrappers in water-grad-2 and recheck the combined material. The owner files retain the same material objects and masks, but two async patches replacing colour slots still need explicit ordering at integration. That other branch was neither merged nor tested here.

## Verification and limits

- `npx prettier --write` ran on changed files (repository configuration ignores Markdown); `npm run check` passed. No new feature unit tests or scenarios.
- Final runtime-source [full place bot](../../.look/evidence/1793734065934-67419/evidence.json): finished every expected beat, 33 game minutes in 2m20s, zero errors, 78 saved checkpoints. Solo “did something together” is not exercised. Read the [full report](../../.look/evidence/1793734065934-67419/run/report.txt); its [end still](../../.look/evidence/1793734065934-67419/run/end-still.png) was opened. Navigation reports some recoveries; this does not establish first-time-player pacing.
- [world-inputs and caves](../../.look/evidence/1793734221445-67418/evidence.json) passed: state/op/layout fixture, 11/11 cave route points with zero stuck points, collision-mask entry/exit, throws and pond flotation. Opened the [hub](../../.look/evidence/1793734221445-67418/caves/hub-still.png) and [pond](../../.look/evidence/1793734221445-67418/caves/pond-still.png): tunnels, lights and pool remain visible.
- All final board and measurement captures report WebGPU, advancing frames and no graphics errors. Earlier [bot invocation](../../.look/evidence/1793732666520-21971/evidence.json) omitted `shot=play` and stalled without starting the bot; corrected runs passed. Initial `--at list` correctly failed before any checkpoints existed.
- Unverified: M4 iPad Pro/device thermals, exclusive-GPU timing, real-time motion/feel, full new-water integration, independent distance-fade arithmetic cost, and the source's complete rock material. No push, CI, merge or deployment was attempted. `inflight` was not run because it fetches GitHub; local refs were inspected instead under the task's no-network constraint.
- Source visuals and timings identify the exact tested tree in each broker manifest. The later report commit changes documentation only; runtime source is `38943241`.

## Reproduction and sources

Use the existing broker, not another browser. The capture helper, pose script, orchestration scripts and raw summary JSON are copied beside this report's artifact version in `.look/evidence/1793733244091-30699/`. Example:

`node .look/see-client.ts look --query 'classic=1&terrain=demo&terrainShot=beach&sky=demo&tone=agx&tod=0.24&prof=1&timestampFix=1&terrainCost=demo' --eval .look/terrain-pose.ts --action .look/water-ranges.ts --real --size 1920x1200 --warm 2 --frames 2 --seconds 1 --name terrain-cost --question 'What does dry terrain add?'`

For Place use `proto=place&terrainShot=gorge`; omit profiler/action for pictures. The four poses are recorded in capture logs. `terrainCost=biomes|no-noise|no-ripples|coarse|rock` selects A/B/A diagnostics; `terrainPart=` selects a visible static alternative.

Source audit: local Ultra Water commit **30ea65e**, `src/scene/terrain.js`; Boogle `src/proto/water/ground.ts` and `island.ts`; [water-demo validation](water-demo-validation.md#gpu-cost-follow-up--3-november-2026); [Ultra Water research](ultra-water.md), recommendations 4 and 7. No external network research was performed, per the task. This reuses the existing material extension architecture rather than introducing an engine-level rendering design.
