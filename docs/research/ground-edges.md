# Ground edges: one comparison

4 November 2026. Owner-approved render-options suggestion 2 / question 2. **Current stays default; adoption waits for “terrain follows water”, with level design.** Code: `3bfe629a`, then crisp's zero-derivative guard `171410c3`. DESIGN.md: **Show, don't tell; Small and readable.** Local, explicit `dev=1&groundEdges=1`.

[Open the native-pixel board](ground-edges/board.png) · [Measurements and evidence index](ground-edges/measurements.json) · [Saved beat](../../dev/look/beats/ground-edges.ts)

**Narrow looks better at play distance; Crisp looks worse than Current overall.** Narrow separates path from lawn without looking cut out. Crisp exposes the grid's sawtooth bends. No added detail was needed. This reuses the actual paths, warm palette, smooth grass and faceted cliffs; no water, Buddy, outline, haze, tone, geometry or collision changes. The [earlier transplant](terrain-demo-validation.md) is not used. A Short Hike's strongest-channel splat selection is the reference from [existing research](bang-for-buck-aesthetics.md), not a fresh network investigation.

| Variant | Worst failure |
| --- | --- |
| Current | Broad yellow-green fringe looks airbrushed. |
| Narrow | Grid teeth remain at bends; intermediate tint changes when weights replace colour inference. |
| Crisp | Hard zigzags look cut out; diagonal pixel steps show during turns. |

## Measured diagnosis

At the town path's east edge, local `z=0`, the source mask's **0.913 m 10–90% width becomes 3.123 m after 2 m grid interpolation: 3.42× wider**. Its 50% crossing shifts 0.306 m through sampling. CPU evaluation of the ground-colour formula gives **3.252 m without procedural variation / 3.256 m with it**. This one section excludes lighting/tone; method and samples are in the measurements file.

Rendered static edge, row 330: **Current 144 px / Narrow 50 px / Crisp 2 px**. A resolution control gives Current **143 px at 640×400**, versus **87 native pixels at 384×240 = 145 px at equal display scale**. Reloaded controls differ slightly in colour; this compares widths, not registered pixels. Grid interpolation dominates this fringe, rather than resolution or broad variation.

Dev-only attributes carry explicit grass/path/shore weights and unblended colours. The fragment shader compares strongest channels with a ±0.4 weight overlap for Narrow; Crisp uses `0.75 × fwidth`, with a tiny nonzero floor. Existing mask contours stay in place. This sharpens colour blending, not coarse mask geometry.

## What was inspected

Opened all nine final cells, the board, Current/Narrow motion sheets, Narrow curves, and consecutive video frames **30–32 walking / 65–67 turning**, plus final Crisp 65–67. The **672×6682** board has one native-pixel column, large labels, and two-column motion crops. Frozen shots use the saved initial-town beat, a **5.2 m camera arm / 62° FOV**, town overview and shore. All immediate and switch-away/back repeats match exactly, with no compute updates. [Still manifest](../../.look/evidence/1793846341763-39934/evidence.json).

The static play-edge ROI changes **18,267/19,800 pixels**, mean RGB deltas **10.95 / 15.66** for Narrow/Crisp. These quantify differences, not quality.

The shore includes grass, warm bank and water, but **cliff shading masks most of the sand/grass transition**: this does not prove a sandy-beach treatment. Open-water and contact ROIs are pixel-identical. The broader water ROI has **178 one-value changes**. In a separate isolation capture, changing only ground below sea level reproduces **all 176 changed water pixels**, with zero extras: the observed changes follow submerged ground. [Isolation manifest](../../.look/evidence/1793846016336-38531/evidence.json).

Narrow shows no obvious sparkle in inspected frames; Crisp's angular steps persist through the turn. **Real-time shimmer, smoothness and feel remain unverified**; 30 fps encoded frames can repeat/drop rendered frames. Separate motion restores have different NPC positions. Inputs reach 5.6 m/s and remain grounded. [Current](../../.look/evidence/1793845515796-34080/evidence.json) · [Narrow](../../.look/evidence/1793845545654-34258/evidence.json) · [Final Crisp](../../.look/evidence/1793846381545-40346/evidence.json).

## Cost, default and checks

Verified **Apple M1 Max**, Metal, 4× scene MSAA. Existing profiler, warmed on/off/off/on, two repeats per view, 3 s windows, ≥2 s advancing-frame warm-ups. Complete GPU timestamp coverage; **shared-machine exclusivity unknown**. Narrow's graph is unchanged by the final crisp guard.

| View | Current / Narrow GPU span | Increment |
| --- | --- | --- |
| Overview 640×400, repeat 1 | 6.583 / 6.629 ms | +0.046 ms |
| Overview, repeat 2 | 6.618 / 6.246 ms | −0.372 ms; drift flagged |
| Play 1210×702, repeat 1 | 6.453 / 6.511 ms | +0.058 ms |
| Play, repeat 2 | 6.746 / 6.566 ms | −0.180 ms |

No reliable saving or sub-0.5 ms guarantee follows from these deltas. [Overview cost](../../.look/evidence/1793845626038-34688/evidence.json) · [Play cost](../../.look/evidence/1793845775441-36773/evidence.json). Mobile untested.

[Dev-off check](../../.look/evidence/1793846063828-38764/evidence.json): zero comparison requests, weight meshes or adapter, even with its query flag. Default expansion of `groundMaterial()` matches the original function source exactly; Off restores the original material object. The experiment chunk is absent from **114 first-load entries**; exact list/bytes are recorded. Bundle hashes are not claimed identical.

`npm run check` passes; no new tests/scenarios. The [bot](../../.look/evidence/1793845117250-29352/run/report.txt) stopped after Station 2 under `--stall 180`, seeking harvest trees; later expected beats were missed. The initial checkpoint is valid, but the full playthrough did not finish. Two initial staging mistakes and two failed isolation diagnostics are retained in the evidence index. **Workflow departure:** `npm run inflight` fetched remote refs before its implementation was inspected, contrary to the local-only network restriction. No push or ship.

Adoption needs smoother authored masks or finer source evaluation, route-width/junction review with level design, and gentler shores that expose sand transitions. Then repeat motion and quieter GPU measurements at target sizes. Stop here for the owner's choice.

**Does Narrow feel cleaner without making the paths look pasted on?**
