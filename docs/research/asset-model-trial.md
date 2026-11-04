# Two-asset headless authoring trial

2026-11-04. Owner review, 4 November, of the live cap on Buddy and roller: "Looks good!" These assets remain catalogue-only; nothing is placed in the world.

Implemented recommendations 1–3 and the inspection/smallest-proof sections of `/Users/matiasfranco/Developer/boogle-codex/agent-model-pipelines/docs/research/agent-model-pipelines.md` (the supplied research worktree, not main). Existing builder, Blender 5.2.1 at `/Applications/Blender.app`, original Boogle geometry, no paid generation, installation, MCP or open Blender session. State is Local to `/character/`; no world placement, gameplay, Buddy source or mechanics changed.

## Owner comparison

- [Roller comparison](asset-model-trial/roller-comparison.png): fixed clay side cameras show the requested length change; stage views retain the initial floor-occlusion failure and its correction.
- [Cap comparison](asset-model-trial/cap-comparison.png): initial and shorter drum, with identical clay camera and identical worn Walk pose, camera and light.
- Roller local stage query: `/character/?asset=feeder-roller&t=0&reference=1&bounds=0&cam=3,2,5&target=0.7,0.7,0&light=studio`.
- Cap local stage query: `/character/?asset=buddy&hat=conductor&mode=played&clip=Walk_Loop&pose=carrying&t=0.4&reference=1&bounds=0&cam=3,2,5&target=0.7,0.9,0&light=studio`. Standalone: `/character/?asset=conductor-cap&t=0`.

My judgement: the roller is appropriately small and mechanically plain, but its dark steel finish is the weakest aspect. The cap reads as a compact drum and peak while leaving Buddy's face and rounded lower head clear. Reducing the height helps. The badge is the weakest detail: legible close up, mostly a tiny gold mark at game distance. The brass band survives that distance better. Neither judgement substitutes for the owner's taste.

## Measured export and roundtrip

Canonical recipes: `assets/src/feeder-roller.py` and `assets/src/conductor-cap.py`; final built assets and source/output hashes are in `assets/built/manifest.json`. `npm run assets -- feeder-roller conductor-cap` used the existing builder. For inspection, Meshopt was decoded with the installed glTF Transform NodeIO, quantized accessors dequantized, and the result imported into an empty headless Blender scene. Geometry was evaluated **after** import, in world coordinates including decode transforms. No smoothing or mesh repair was applied to evidence geometry.

| Variant | Exported / reimport evaluated triangles | Vertices after reimport | Materials / mesh parts | Built bytes | Bounds X × Y × Z, metres |
| --- | ---: | ---: | --- | ---: | --- |
| Roller initial | 76 / 76 | 52 | 1 / 1 | 2,448 | 0.142673 × 0.150022 × 0.860000 |
| Roller length × 1.2 | 76 / 76 | 68 | 1 / 1 | 2,504 | 0.142610 × 0.150043 × 1.032000 |
| Cap initial | 560 / 560 | 912 | 3 / 5 | 11,680 | 0.546000 × 0.222751 × 0.612014 |
| Cap height repair | 560 / 560 | 912 | 3 / 5 | 11,680 | 0.546000 × 0.197726 × 0.612014 |

All variants: zero degenerate triangles at area < 1e-12 m², zero invalid/nonfinite corner normals; measured normal lengths are approximately 0.99999985–1.00000018. Export budgets are comfortably below 1,000 / 1,500 triangles and 1 MiB. No textures or UV-dependent surface details. Evaluated counts include all parts, not only visible faces. The roller has one steel material; the cap separates painted drum, painted peak and brass trim. Runtime uses owned paintedToy clones and a steel clone deliberately tinted `#d9a93a`, preserving cached presets. Blender material factors mirror those surface values; Workbench sheets are geometry/material-colour inspection, while WebGPU stage captures establish the actual shaded appearance.

Per-part measurements and topology are retained in [the evidence directory](asset-model-trial/). After welding split normal vertices for topology inspection only, roller, peak, badge and both brass bands are closed with zero non-manifold edges and positive signed volume. The cap drum intentionally has 24 boundary edges at its open underside to receive the head; no other non-manifold edges. Separate named material parts are intentional, not stray islands. Local volume values in topology JSON are in decoded mesh-local coordinates, not cubic metres; bounds above apply world transforms.

### Pivots and attachment dimensions

The place-kit reference is a 10-sided cylinder of radius 0.075 m and Z-axis length 0.86 m, bevel 0.008 m, with its axle midpoint at `(0,0,0)`. The trial reproduces those measurements. Its faceted X width is about 0.14266 m, not a mistaken 0.15 m bounding box. Quantization changes radial bounds by less than 0.04 mm between lengths. The final roller retains its zero axle pivot and radius; `feeder-roller.json` changes only `lengthScale: 1 → 1.2` for the requested revision. End planes move from Z ±0.430 to ±0.516 m. The original feeder bed has an inner span of 0.85 m (rails at ±0.46, each 0.07 thick), so the original drum overlaps each side by 5 mm. **The longer variant would require widening that receiver by 0.172 m** to preserve this engagement; it is not a drop-in fit in the unchanged feeder. No receiver or world assembly was changed.

The builder prunes the roller's non-mesh endpoint empties. They are authoring aids, not surviving runtime sockets. The measured end planes and zero axle pivot survive; do not claim the GLB contains named attachment metadata. Quantization adds non-unit mesh-node scales; those decode transforms must be retained.

Cap vertices use game axes relative to Buddy's existing Head rest origin `(0,1.12,0)`. The stage positions a fresh cap instance at that rest origin and uses `Head.attach` to preserve its rest transform before retargeted animation. Each visible mesh is named `wear_head_conductor_…`; the holder is `wear_head_conductor`. It is rigid bone parenting, not new skin weights, bones or clips. Buddy's head reference is centre Y=1.36, radii `(0.29,0.27,0.27)`. The final drum rim is Y=1.48 and top Y=1.655 in rest-world metres, nominal 25 mm crown clearance. Width 0.546 m is below the head's 0.58 m widest diameter. The open rim seats around the upper head; visual clearance was checked on the actual Buddy, not just this ellipsoid approximation. No visible face/crown penetration or detachment appeared in inspected views. This is not an exhaustive triangle-intersection proof for every possible pose.

## Bounded loop and retained failures

Both started as named primitive parts: roller drum; cap drum, peak, lower brass band, crown trim and badge. Front, side, back and three-quarter clay views were reviewed alongside part colours, actual exported wire edges and material-colour views. No texture/detail pass followed; the same simple blockout geometry was the initial result. Fixed orthographic scales were 1.45 m for both roller lengths and 0.85 m for both cap heights, with registered centres, not per-version auto-fit.

| Asset | Initial result and diagnosed cause | Targeted repair / required revision | Elapsed authoring-to-visual-review |
| --- | --- | --- | --- |
| Roller | Geometry passed; stage floor bisected an axle-centred part. | Stage holder lifted 0.075 m, without changing asset pivot. Required length revision is one sidecar parameter, 0.860 → 1.032 m. No cosmetic geometry repair. | 6 min 59.5 s |
| Cap | Functional rigid fit, but a 200 mm drum looked slightly top-heavy. | One geometry repair: lower `TOP` by 0.025 m, producing a 175 mm drum. No second geometry repair. | 7 min 29.0 s |

Timing begins at first recipe file creation, 21:30:09.433 UTC, and ends at each inspected turntable capture (21:37:08.940 / 21:37:38.465 UTC). These overlapping wall-clock windows include shared integration, checks and captures; initial reading, final report/commit packaging and final commit-matching confirmation are separate overhead. They are not cost per accepted asset: neither asset is accepted. No paid-service cost; token cost was not separately measured.

Initial built GLBs are committed as `asset-model-trial/roller-initial.glb` and `cap-initial.glb`. Final GLBs are in `assets/built/`. All 64 fixed-view PNGs, complete initial recipe/parameter snapshots, decoded interchange files, final uncompressed recipe exports, inspection scripts and check logs are retained under `.look/trial/`, copied as supplemental trial evidence beside a final broker manifest for launcher handoff. Initial stage stills and motion sheets are retained, including the half-buried roller and taller cap. Nothing was overwritten to conceal a failed view.

Technical failures: sandboxed Blender crashed before the recipe ran; the same headless builder succeeded with sandbox access. The first inspection script needed an explicit world after empty-scene import; its failed command created metrics but no render. `npm run inflight` failed opening FETCH_HEAD; no retry or network fetch was made. These are execution/setup failures, not extra art iterations.

## Stage and validation evidence

The existing broker only opens the game entry. The documented `--eval` mechanism mounted the real same-origin `/character/` page in a full-screen iframe; it did not create another browser or alter production code. The eval independently requires the stage's WebGPU flag and advancing stage frames. Broker health/curves still describe the underlying game. Consequently its zero player speed/height curves **do not measure cap movement** and cannot establish cap smoothness. Stage camera/light/pose are in the encoded `stage=` query in each manifest; the outer game's printed hill camera is not the screenshot camera.

Inspected broker evidence:

- [Initial roller](../../.look/evidence/1793827918689-72215/evidence.json), [final matched roller](../../.look/evidence/1793828047139-73429/evidence.json), [roller shipped-light turntable](../../.look/evidence/1793828209185-74902/evidence.json).
- [Initial cap](../../.look/evidence/1793827957949-72473/evidence.json), [matched shorter cap](../../.look/evidence/1793828108464-73786/evidence.json), [walk/carry/jump](../../.look/evidence/1793828065426-73595/evidence.json), [game distance](../../.look/evidence/1793828135206-74165/evidence.json), [cap turntable](../../.look/evidence/1793828239507-76024/evidence.json).

Opened both four-view/four-mode sheets for each asset, each matched stage still, game-distance cap still, both full turntable sheets, the 12-frame walk/carry/jump sheet, and two sheets of 12 **consecutive encoded video frames** (frames 72–83 carry, 132–143 jump). The cap remained seated from front, side and back; its drum/band read beside plain Buddy. Walk uses `Walk_Loop`, carry uses that clip plus the real `carrying` body pose, and jump uses `Jump_Start` movement/body layers. The stage does not simulate jump travel or render a carried cargo load; those are not claimed. The approximately 9 m game-distance views use camera `(5,3,8)`, shipped light and fixed exposure 0.16. Matched closer comparisons use camera `(3,2,5)`, studio light and exposure 1.

`npm run check` passed: zero lint problems, typecheck, 295 unit tests, registry, level checks, six fresh assets/catalogue coverage and production build. Final validation uses the already installed Node 26.13.0 (early commands used the shell's Node 24). No new tests, harness, framework, skill or command scaffold. No pacing or sync change, so no gameplay bot/scenario was needed or run; no bot failures are claimed. All broker captures passed WebGPU/frame/error checks. Real-time motion feel and smoothness, mobile/device performance, world placement, cargo clearance and owner approval remain unverified. The final response/launcher handoff links additional clean-commit confirmation captures; earlier manifests preserve their exact prior tree.

## What helped, and what a future skill should contain

The useful pieces were measured existing geometry, one explicit revision parameter, named parts, immutable failed versions, registered silhouette cameras, decoding the **built** GLB before measuring it, and putting the cap on the real Head bone early. Clay exposed proportion; wireframe exposed the intentionally open skirt and simple triangulation; the Buddy comparison exposed visual weight that triangle counts could not judge. The floor and socket-pruning issues would have been missed by inspecting the raw recipe alone.

`sourceHash()` in `dev/assets/manifest.ts` hashes only the top-level source and same-stem JSON. It misses imported repo helpers, shared builder/export logic, material-preset changes and tool versions. Neither new Python recipe imports a repo helper, and the roller parameter is in its hashed sidecar; this trial does **not** fix the broader dependency-hashing gap. The runtime preset mapping is also outside the asset source hash. Use source/build hashes plus the broker tree and tool versions when interpreting this evidence.

A future asset-author skill should contain a measured brief with reference vs inferred dimensions; metre/axis, pivot and bone contracts; one canonical recipe with hashed dependency disclosure; named-part blockout; fixed silhouette/clay/part/wire/final views; built-GLB decode/reimport metrics and explicit open-surface exceptions; a stage/bone attachment example with owned material clones; matched camera/light/pose and consecutive motion-frame instructions; retry/cause/time ledger; preserved failures and one owner question. It should explain prune/quantization effects and distinguish body-preview motion from gameplay and real-time feel. No automatic art acceptance, paid job, or new framework is warranted by this proof.

The 4 November follow-up makes motion review a standing requirement, documented in the [look skill](../../.claude/skills/look/SKILL.md#asset-motion-review) and [asset stage](../game-design/asset-stage.md#agent-motion-review). Use `node dev/look/asset-motion.ts` to package stage-owned per-render measurements and consecutive/cycle sheets with the existing broker's real-time video. The original trial's background-game curves remain invalid evidence for cap motion; retain them as historical failures, not a baseline. Compare attachment transforms and posed-body clearance, clip/root steps and seams, or rate/pivot stability, reporting outlier frame numbers rather than a score. Compare against accepted Buddy Walk_Loop. Preserve failures and recapture targeted repairs before the owner's final check. The feeder roller has no production spin in the current game: a labelled diagnostic axle probe is distinct from an actual gameplay-rate review. Rendered-frame continuity and video cadence still do not prove monitor presentation smoothness.

The [motion follow-up report](asset-motion-review.md) records the opened frames, measured inner-peak penetration and one cap repair, preserved failed GLB, roller axle review, control, jump clips and production airborne pose. The earlier still-based clearance claim above was incomplete: live posed-mesh diagnostics found the peak's inner edge buried by 4.04 mm, now repaired to 5.93 mm sampled clearance.

Do these belong beside Buddy, and does the cap stay readable in motion?
