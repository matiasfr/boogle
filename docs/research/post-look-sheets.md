# Post-look real-render comparison

4 November 2026. Render source `136da55e`; the later evidence commit changes documentation/images only. **My overall preference is C, then D; D+ gives the clearest toy outlines but exposes dry cliff triangulation in motion.** None is adopted as the normal look. A remains the production control.

[Overview](post-look-sheets/overview.png) · [Shore S](post-look-sheets/s.png) · [Underwater U](post-look-sheets/u.png) · [Waterline W](post-look-sheets/w.png) · [Town T](post-look-sheets/t.png) · [Buddy B](post-look-sheets/b.png) · [Far F](post-look-sheets/f.png) · [Ink strengths](post-look-sheets/strong-ink.png)

Every main sheet has A–H and the dark Toon reference in that order. PNGs are full-colour, lossless, 960×600 per main cell; originals are 1440×900 under `.look/evidence`. The overview retains A beside C, D and D+. [Evidence index](post-look-sheets/evidence-index.json) maps every cell to its native PNG, manifest, camera, gain and settings. No palette quantization or lossy intermediate was used.

## What I saw

| Column              | Judgment and worst failure                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A Current           | Rich water and already readable contact shadows. Worst: weak separation between small overlapping toy parts; existing dotted terrain seams and close caustic blockiness remain.      |
| B Clean colour      | Safe, restrained; white labels/foam stay neutral. Worst: the change is so small that it does not solve overlap readability on its own.                                               |
| C Airy toys         | Gentle far-layer separation without flattening the sea. Worst: very small benefit in close town/Buddy views; fog-disabled soft particles retain their existing treatment.            |
| D Drawn toys        | Better small overlaps with restrained tinted edges. Worst: .45/1 px is faint at these framing distances.                                                                             |
| E Luminous toys     | Water remains detailed at .025. Worst: little useful daytime glow beyond the already brilliant sea; costs the existing bloom chain.                                                  |
| F Contact trial     | **Gated, B shown.** Native T/B already show foot, rack, foundation and post contacts. No demonstrated deficit met the AO revisit gate; no AO implementation or AO timing is claimed. |
| G Graphic boundary  | Deliberate print-style boundary, not cel lighting. Worst: broad value grouping makes Buddy/ground less softly modelled.                                                              |
| H Painted boundary  | Labels and water remain protected. Worst: little visible benefit at .15/radius 2, especially at shore and distance.                                                                  |
| D+ Strong ink       | Best visible toy/rack separation while keeping water optical. Worst: dry cliff triangulation becomes conspicuous in motion, thin edges segment, and GPU cost is about 3 ms.          |
| Toon dark reference | Useful labelled style limit. Worst: black bank/cliff and background-store outlines read as geometry seams and clutter.                                                               |

Final visual order after motion review: **C > D > D+ > B > A > E > H > G > Toon**; F is unranked because its gate did not open. This ranks the captured appearance, not a performance-approved default.

The native S cells retain turquoise caustics, foam and refracted bed detail; no new dark shoreline slits were seen. U visibly bypasses the dry spatial layers and retains snow/bed detail. W preserves the translucent meniscus; Toon draws harsh **dry-bank** lines above it, not a line over the underwater bed. T keeps signs and cream/honey surfaces readable. B keeps eyes and rounded shoulders; darker ink increasingly outlines background clutter. F keeps the spire and rail route legible and fades distant ink.

## Method and honest mismatches

All layers are Local and lazy behind Dev Looks. Normal players retain Neutral/trim 1, the frozen `.24` procedural sky, current materials/water and 4× MSAA. Each view uses one numeric camera, one settled A gain, and the same recorded Buddy transform hierarchy. A was recaptured with that fixed gain and the same 3 s warm-up used by the candidates. The fixture uses the existing disposable `coop=0` place `skipTrains()` route, not a shared-room grant. Scene labels use the actual `makeLabel` sprite material in every view.

Water, foam, snow, residents, trains and construction/crane animation remain live. Reload timing/phase differs; these are matched-camera comparisons, not pixel-identical scene states. Exposure is fixed per view, not globally between views. The initial historical U/W position was inside current terrain, so U/W were moved to the validated S channel and reused numerically. Main B uses current yellow paint with its actual teal held object and carried rack; purple/hat and impact stars are separate labelled fixtures.

| View | Position                | Target                  | FOV | Locked gain |
| ---- | ----------------------- | ----------------------- | --- | ----------- |
| S    | 950, 7, 186             | 968, 1.1, 170           | 62  | .1655162568 |
| U    | 950, -1, 186            | 968, -.5, 170           | 62  | .3012577400 |
| W    | 950, .116389901972, 186 | 968, .116389901972, 170 | 62  | .1923449664 |
| T    | 922, 32, 42             | 900, 20, 14             | 50  | .0923376249 |
| B    | 902.8, 19.8, 22.5       | 900, 18.9, 19           | 45  | .0950311296 |
| F    | 900, 44, 79             | 1008, 52.5, -10         | 62  | .1730494120 |

The W reference height is one recorded actual wave sample, not a flat substitute for the live surface. Its ±.15 m stills and vertical sweep retain the real water owner. Exact quaternions, near/far planes, effective scene sizes and contemporaneous water samples are in the index. Distance rails target the existing north rail centre `(1023.1380252838135,30.46,-149.5)` along normalized camera offset `(0,.6,-.8)`, at exact Euclidean distances 20/50/100 m. An initial camp-side ray was occluded and was recaptured from this clear side; those discarded diagnostic manifests remain under `.look`.

## Implementation and gates

Independent shade, static output dither, shared scene/ocean air haze, depth ink, existing bloom, print bands and small Kuwahara controls have real graph-off paths. A single optional RGBA8 MSAA coverage attachment classifies opaque surfaces, the actual ocean and protected overlays generically; no per-asset edits or parallel materials were required. Water/protected samples and a two-output-pixel guard are excluded from spatial kernels. Underwater uses the existing signed-depth owner to fade dry effects off.

Ink uses depth discontinuity plus a plane-rejection gate. The research's linear-z second difference produced false horizontal bands on flat distant ground in the first trial; the retained affine device-depth second difference, normalized by `1-depth`, removed them. Symmetric integer scene-texel support avoids fractional asymmetry. D is .45/1 output px. D+ requests .80/1.5 px and Toon .90/1.5 px with `#20252b`; at scale 1 these round up to **two scene texels**, explicitly labelled rather than claiming exact 1.5 px width. At .6 scale support is at least one scene texel and opacity attenuates with scene/output scale. No normal buffer or hull outlines were added.

The gate for per-asset mask work did not trigger. AO's separate revisit gate did not trigger either: F visibly says so. The existing open town gables, dotted terrain seams, and blocky close caustics are not attributed to these layers.

## Motion, cost and verification

[Town lateral](post-look-sheets/motion-t-lateral.png) · [Town yaw](post-look-sheets/motion-t-yaw.png) · [Shore lateral](post-look-sheets/motion-s-lateral.png) · [Shore yaw](post-look-sheets/motion-s-yaw.png) · [Spray](post-look-sheets/spray-motion.png). These are native-pixel consecutive crops, not sparse trajectory thumbnails. The index links **every decoded consecutive frame**, video, curves CSV and manifest for all 35 clips (11,171 decoded frames): 25 eight-second camera moves, three six-second waterline sweeps and seven spray trials. Full atlases include preamble/tail; video-frame numbers start at zero. Equal indices across clips are not phase matched. PNG extraction is lossless, but the broker's VP9 video source is compressed.

- **Line crawl:** A/C already have bank speckles (shore yaw f62–65; lateral f181–184) and rail pixel steps. D remains restrained. D+ has visibly stepping long dry-cliff crease endpoints in shore yaw f180–187; Toon is worse. Town rails f60–67 and roof diagonals f180–187 step without whole-line dropout in the inspected windows.
- **Popping:** A town yaw resident emerges behind the shelf at f64→65; G town lateral resident appears at f65. A lateral crane hook enters at f185–187. These are live occlusion/construction differences, not attributed to a look. No framewide candidate pop was observed in the reviewed atlases.
- **Mask flicker/waterline:** no broad class flashes or ink over refracted bed were observed. Vertical A/D+/Toon f18–25 and f148–155 cross the live medium boundary without an extra abrupt ink switch. A already has a thin diagonal optical rim/seam at f148–151; this remains a baseline concern, not proof of an ink leak. Lens-drop rings also exist in A.
- **Other moving layers:** H town lateral/shore yaw shows no obvious painterly boiling or dragging in f60–67/f180–187; its benefit is small. E shore yaw glints/caustics remain continuous, without a broad glow flash. G's existing bank speckles remain. These statements cover inspected frames, not all possible scenes.
- **Actual spray:** four pulses use the existing shared `splash()` pool, not substitute particles. Blue/cyan moving mask coverage is visible at f30–37, decays at f60–65 and returns at f66–67. A/D/D+/G/H/Toon retain soft grey droplets with no new black ring or dragging trail in those windows. A already looks muddy/low-contrast. This path is mostly over protected water, so exclusion halos across dry cliffs remain unverified.

[Waterline A](../../.look/post-motion-review/vertical-W-A/native-crops/strip.png) / [D+](../../.look/post-motion-review/vertical-W-strong/native-crops/strip.png) / [Toon](../../.look/post-motion-review/vertical-W-toon/native-crops/strip.png) retain consecutive crossing details. The research's up-to-three-iteration limit was respected: the retained second structural ink version removes the first trial's false planar bands. Residual line crawl is disclosed and stays behind opt-in. No live presentation smoothness or owner playtest is claimed.

### Warmed GPU cost

Existing `measureGraphics('postLooks')`, **on/off/off/on**, 2 s warm-up before each 3 s window; selected recipe restored on both on legs, original output/fog/attachment path on off legs. T camera/gain, 1440×900 scene/output, DPR 1, 4× MSAA. Forty complete windows supplied 7,202 fresh GPU spans, with no missing/stale/partial timestamps. No other task render overlapped measurement. Browser reports Apple / metal-3, non-fallback; exact device is not exposed. **Contention is unknown for every column.** This is a same-machine observation, not an iPad budget verdict.

| Column | On / off mean ms | Increment ms                   | On p50 / p95 ms | Off p50 / p95 ms | Max same-state drift ms |
| ------ | ---------------- | ------------------------------ | --------------- | ---------------- | ----------------------- |
| A      | 9.794 / 9.669    | +.125 (control noise)          | 9.945 / 10.842  | 9.786 / 10.557   | .107                    |
| B      | 9.927 / 9.915    | +.012                          | 9.929 / 10.758  | 9.928 / 11.220   | .962                    |
| C      | 10.045 / 10.056  | −.011                          | 10.145 / 11.099 | 10.217 / 11.592  | .900                    |
| D      | 11.583 / 9.670   | +1.913                         | 11.519 / 13.635 | 9.819 / 11.684   | 1.158                   |
| E      | 10.303 / 8.728   | +1.575                         | 10.628 / 12.622 | 8.528 / 11.147   | 2.080                   |
| F      | 9.564 / 9.425    | +.140 (B only; AO unavailable) | 9.787 / 10.677  | 9.733 / 10.916   | .464                    |
| G      | 11.035 / 9.422   | +1.612                         | 10.937 / 12.707 | 9.771 / 10.873   | .690                    |
| H      | 10.226 / 9.121   | +1.104                         | 10.021 / 12.754 | 9.618 / 10.584   | 1.100                   |
| Toon   | 13.069 / 9.731   | +3.338                         | 13.141 / 17.625 | 9.731 / 10.366   | .292                    |
| D+     | 12.963 / 9.910   | +3.054                         | 12.973 / 17.432 | 9.879 / 10.657   | .288                    |

P50/p95 pool raw whole-frame GPU-span samples per state (span includes GPU gaps, not presentation latency). Means/deltas come from the measurement owner. B/C/F changes are below drift: no resolved saving or overhead. E's owner flagged drift; H's drift nearly equals its delta. D/G exceed 1 ms in both adjacent pairs; D+/Toon clearly exceed it. No robust ≤.5/1 ms acceptance is established. Display-callback intervals average 16.666 ms, per-window p95 16.7–16.8 ms; the owner does not retain a pooled callback median/p95, so none is invented.

Observed render contexts are 7 for control/ink/bands, 19 for E, 8 for H. Compute work varies between 12–13 dispatches / 3–4 passes in the timed fixture, including controls. Scene is RGBA16F plus depth24plus, stored 4× MSAA; coverage is resolved/stored-4× RGBA8 and disconnects off. H adds a full-resolution RGBA16F materialization, released on structural rebuild; E reuses existing bloom targets. Draw/copy/clear/mipmap totals are outside this observer's scope. Cold compilation/reload stall timing, total residency and iPad/Safari performance remain unmeasured; warm-up is not evidence about cold stalls.

### Additional sheets and verification

[Scale .6 S](post-look-sheets/scale-06-s.png) / [U](post-look-sheets/scale-06-u.png) / [W](post-look-sheets/scale-06-w.png) / [T](post-look-sheets/scale-06-t.png) / [B](post-look-sheets/scale-06-b.png) / [F](post-look-sheets/scale-06-f.png): actual scene 864×540 with 1440×900 output. Water remains rich; roofs, rails and small text become coarse. Toon/D+ become weaker and less continuous, not excessively wide. Native .6 comparisons confirm raster differences; .6 motion is unverified.

[Waterline −.15 m](post-look-sheets/waterline-minus.png) / [+.15 m](post-look-sheets/waterline-plus.png) / [ink across heights](post-look-sheets/waterline-ink.png) · [Buddy fixtures](post-look-sheets/buddy-diagnostics.png) · [coverage](post-look-sheets/coverage.png) · [isolated layers](post-look-sheets/ablations.png) · [diagnostic strengths](post-look-sheets/strength-diagnostics.png) · [20/50/100 m rails](post-look-sheets/thin-rails.png).

Purple Buddy and the cap remain distinct at native resolution; dark Toon outlines the hat/held-object boundary but also clutters the white inventory behind it. The separate flop fixture shows four real stars with their existing coloured outlines, without a new rectangular mask edge. Coverage shows opaque red, actual ocean green and label/snow/spray blue; this is raw scene coverage before lens/refraction composition. At W−.15 the dry outline fades away while lens-drop rings remain in A too; W and W+.15 restore dry-bank ink without outlining the bed. Isolated shade/haze changes are restrained, and stronger bloom still offers little daytime benefit; stronger bands visibly flatten Buddy. The corrected rail series keeps the same .10 m rail visible at 20/50/100 m. At 20 m the dark reference adds stepped tree/platform contours without erasing the rail; at 100 m the target rails approach the control appearance as ink fades. This is a still check, not a distant-rail motion verdict.

[Banding check](post-look-sheets/banding-check.png) compares native pixels with nearest-enlarged sheet crops. Broad cliff bands already exist in A; U gradients retain the same structure, and B dither adds fine texture. G deliberately groups Buddy values. The sheets use RGB/RGBA PNG, not an indexed palette. Downsampling loses fine edge detail, but no extra palette posterization was found.

Normal-page proof: both classic and place before/after graphs have no comparison MRT/bindings, one original scene colour output, the same observed targets and 7 render contexts. Classic snapshots both execute 14 compute dispatches / 5 compute passes. The place snapshot changes from 14/5 to 13/4: one fewer live compute dispatch/pass; executed work is therefore not claimed identical. The observer samples before the debug camera override, so graph camera telemetry is not a fixed-view image claim. Normal-path shader construction remains unchanged when lazy comparison code is absent. Production first-load membership is **111→111 logical owners, no additions/removals and no candidate module**. Hashes/bytes are not identical: total gzip is 1,836,688→1,836,921 bytes (+233). [Full proof](post-look-sheets/default-proof.json) includes raw normalized inventories, source fingerprints and manifests. Seven existing-runtime control assertions passed: explicit bloom/resolution overrides, uniform-only ink strength, unlock clearing gain, actual MRT removal off and correct composite restoration.

Final [full-place bot manifest](../../.look/evidence/1793835438542-15616/evidence.json) and [report](../../.look/evidence/1793835438542-15616/run/report.txt): **passed**, all expected beats, zero errors, 29 game minutes at 8×. “Found a crystal” and “did something together” were never marked; cooperative play is not established. The report records 10m34s standing and 2s pushing, not a claim that traversal is polished. Its end still shows the equipped Buddy on the final platform with the route built. The initial baseline bot's content passed but its manifest failed because a plan edit changed the tree during the run; the final repeat used clean, unchanged `136da55e` throughout.

Opened and inspected **all 28 committed PNG boards**, including all six main sheets, overview, ink-strength board, six .6 sheets, three waterline sheets, Buddy, coverage, ablations, strength diagnostics, rail distances, banding and five motion/spray boards. Native checks included all water views in A/D/H/Toon, D+ shore/Buddy/town, G/H town/Buddy, F A/C, native .6 controls/Toon, purple-cap/stars and the default classic/place captures. Agents reviewed all 35 complete consecutive-frame atlases and native crop strips; root reviewed the core A/C/D/D+ motion evidence, waterline sweeps and assembled motion boards. The index preserves exact provenance and all native files. Main still PNGs have no lossy stage.

`npx prettier --write` and `npm run check` passed (295 existing tests plus type, lint, registry, level, asset and build checks); [check log](../../.look/post-check-delivery.log). No new unit tests or scenarios; no copy edits, push or ship. The owner choice remains open. Unverified: real-time feel/presentation, .6 motion, alternate devices/Safari, cold stalls, exact live-state matching, and spray exclusion halos crossing dry terrain.

**Which makes the toys and distant world feel more inviting while the sea still feels rich?**
