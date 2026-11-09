# Recovery rack model comparison

> **Verdict:** Owner preferred the reference-guided rack build.
> **Top recommendations:** 1. Keep build B, the reference-guided rack, under the id recovery-rack.
> **Status:** adopted.

Owner exception, 5 November 2026: work may start before the round-4 replay, assuming it goes well. Remain on this branch; no push, ship or game placement. Slice 2 owns stock and placement. This is static geometry and Local asset-stage metadata only, with no shared state, lockstep math, events or gameplay changes. DESIGN.md: **Show, don't tell**.

## Owner verdict — 5 November follow-up

**The owner prefers build B, the reference-guided rack.** Their condition is that **previz has to stay steered to the game's look**. This accepts B for this asset; it does not establish that an unconstrained generated turnaround is a better art direction or a trustworthy source of measurements.

Keep B's geometry unchanged under the plain ID `recovery-rack`: `assets/src/recovery-rack.py`, `assets/built/recovery-rack.glb`, its manifest entry and asset-stage descriptor. Remove A's recipe, built GLB, manifest entry and descriptor. The previous IDs are historical references, not aliases. The source/build comparison remains recoverable at `4ac6f3b7` (A's blind-build checkpoint is `659c1cfe`); the retained comparison, timings, repairs and evidence below describe those earlier states.

The rack remains **unplaced**. Slice 2 owns placement and stock behavior. No copy, gameplay, lighting or geometry changes accompany this selection. Rebuild/check the renamed asset and capture it through the restarted broker with the same Buddy/game-camera settings; earlier manifests are historical, not proof of the renamed catalogue entry.

The rename rebuild produced identical decoded inspection metrics (all named parts, topology and bounds) but different optimized deduplication: 1,104 unique triangles / 25,176 bytes versus B's 1,016 / 24,952. Keep the selected B recipe and GLB byte-for-byte under their new filenames, with the matching original source/output hashes; do not turn this follow-up into pipeline determinism work. The rebuild is retained in `.look/rack-selected-r0/`; the selected-byte reinspection is `.look/rack-selected-r1/`. The assembly remains 1,420 triangles either way. This preserves the exact owner-selected artifact while freshness checks still cover the renamed source.

## Locked text-only brief (before opening references)

Build A starts at 2026-11-05 17:59:30 UTC (approximate authoring start). No supplied image or board has been opened. A crooked outdoor timber rack with a crooked roof, holding three logs, slightly taller than Buddy, distinct from the cart delivery rack. One canonical recipe per ID under `assets/src`; no textures, worker, signs, tiny grain or gameplay behavior.

Measured source landmarks: Buddy's head centre is 1.36 m with 0.27 m vertical radius (`assets/src/buddy.py:107`), so the authored unadorned crown is 1.63 m. The delivery rack has 1.3 m posts, 1.6 m crossbars and 2.2 m longitudinal spacing (`src/proto/place/depot.ts:30` onward), without a roof. Inferred design choices for A: 1.55 m post span, 1.0 m depth, roughly 2 m roof height, three 0.38 m diameter × 1.18 m logs. These are choices, not image measurements.

Axes: metres; game +Y up, +Z front; Blender `(x,-z,y)`; Y-up glTF. Ground/base-centre assembly origin, named closed timber and log solids, intentional overlapping joints, no open-surface exceptions. No animation or sockets. Budget per variant: 2,500 triangles, four materials, 50 KiB compressed. Front/side/back/three-quarter inspection uses fixed 3.2 m framing centred at game `[0,1,0]`; stage views use matched camera/light/exposure and frozen Buddy pose.

## Procedure and departures

A must be built, inspected, staged and committed before opening any supplied reference image or `board.md`. B may then use the three specified images and board, resolving contradictions against the real Buddy/game scale. Keep A frozen after the reference is revealed. At most two diagnosed geometry repairs per model; retain failed evidence. Shared-machine wall time is process cost only, never performance evidence; timing/smoothness needs a quiet rerun.

The required `npm run inflight` was started before noticing it fetches remote refs, then interrupted. This conflicts with the task's local-network-only rule; no further remote commands are permitted. No push or ship was run. No Boogler copy has been edited; no suspect copy encountered in this geometry scope. No ROM data used.

## A: locked result before reference reveal

Authoring began around 17:59:30 UTC; first build/inspection was complete by 18:01:09; the contact repair was made around 18:01:50; checks and final close review finished around 18:04:30. Roughly five minutes end-to-end after the common reading/setup phase, including tool waits. Active modeling time was not separately instrumented; do not treat this as a controlled speed benchmark. One geometry repair: visibly floating log contacts → move lower centres from ±0.23 to ±0.18 m and upper centre from 0.98 to 0.95 m → seated triangular stack. No export/tool repair. No paid generation; token cost unavailable.

Final A: **17,816 bytes; 520 unique mesh triangles; 724 evaluated assembly triangles; 17 named solids; four materials; no textures**. Decoded bounds: 1.905 × 2.030 × 1.520 m (X/Y/Z), from Y −0.0022 to 2.0275 m. The tiny below-ground post bevel is covered by the foot, not a floating base. All parts are closed, positive-volume components; zero degenerates, invalid normals, boundary edges or non-manifold edges. Unique mesh counts exclude repeated deduplicated instances; evaluated counts include them.

Opened A r0 and r1 `sheet.png`: all front/side/back/three-quarter columns in clay/parts/wire/material rows. Opened initial and repaired game-distance stills and repaired studio close still. A reads as a roofed store at game distance; the pale triangle of three log ends remains clear. Up close, the boards, mild lean and back brace read cleanly, but the large empty upper bay makes it fairly generic. Side view shows log lengths; back brace crosses the rear log ends. This is not a proof that a player understands recovery stock.

- Initial retained inspection: `.look/rack-a-r0/` (includes recipe and manifest), [initial stage manifest](../../.look/evidence/1793901647781-74119/evidence.json).
- Repaired inspection: `.look/rack-a-r1/`, [game manifest](../../.look/evidence/1793901785502-76032/evidence.json), [close manifest](../../.look/evidence/1793901834666-77727/evidence.json).
- Game view: camera `[3.54,2.035,4.58]`, target `[1.1,0.9,0]`, FOV 62°, shipped sky, exposure .16. Derived from game default 5.2 m and pitch −.22 (`src/player/state.ts:30`), with a chosen three-quarter azimuth; frame-centre distance is about 5.31 m. Stage context, not actual town placement.
- Close: camera `[3.5,2.4,4.5]`, target `[.8,.95,0]`, FOV 40°, studio, exposure 1. Buddy is the stage's frozen Raw Idle reference at .4 s. Rack time 0, no playback or spin. Stage reports **48 game / 47 studio draws**, including floor, Buddy, helpers, shadows and output; these are not rack-only draws.
- `npm run check`: passed, 330 tests, lint/typecheck/registry/level/assets/build all completed. Broker captures: WebGPU, no graphics/page/console errors, unchanged tree during each run. No bot playthrough/scenario run: no gameplay or sync change. Real-time smoothness and device performance unverified.

Toolchain: Node 26.13.0 for build/check/client; Blender 5.2.1 LTS (`9e2066aef7ef`), three 0.187.0, glTF Transform 4.5.1, meshoptimizer 1.3.0. The pre-existing broker owns its own runtime/harness commit, recorded in each manifest. Recipe has no local helper imports; build/inspection/runtime dependencies remain the committed pipeline, lockfile, loader, stage and lighting code. Build source/output hashes are in `assets/built/manifest.json`; retained inspection settings include decoded transforms, inspector hash and built hash. Timing under shared load is not performance evidence.

## B: reference reveal and brief

A was committed as `659c1cfe` before opening any supplied image or board. Reference reveal: 18:05:27 UTC. Opened `shot-3.png` first (front/right/back), then `shot-1.png` and `shot-2.png`; read `board.md` from `/Users/matiasfranco/Developer/boogle-daily/.look/previz/recovery-rack/`. No other supplied image used.

Use the turnaround's offset gable and mirrored brace, shot 2's low bed, chunky sections and compact furniture character, and shot 1's roof-over-logs silhouette. The sheet is not a ruler: four posts only, no middle foot, six boards extruded from one roof profile, not the inconsistent seams in the generated side view. Do not import the generated Buddy, smoke, grain, rings, lighting or world placement. Keep actual Buddy and the same stage settings as A. The palette is interpreted as the board's explicitly linear art anchors, with no second sRGB conversion; this is also a palette change, not a geometry-only causal test.

Inferred B dimensions: peak 1.23 × actual unadorned Buddy crown (1.63 m) = 2.005 m; low/high roof edges 1.40/1.76 m; ridge X .40 m; roof X ±1.02 m, Z ±.68 m; 20 cm posts, 25 mm bevels, bed top .38 m, logs diameter .40 m and length .94 m. The generated hat-inclusive 1.5 m figure is rejected as a scale authority. Same 2,500-triangle/four-material/50-KiB ceilings; closed overlapping components, no intended motion. The comparison cannot isolate the turnaround alone from the two perspective references, board notes or second-build learning.

## Comparison result

**B is the better design in this comparison.** The long low slope and short high slope give it a recognizable crooked-roof silhouette at the matched game camera. Its bed, side rails and broad supported eaves feel more deliberately built up close. A already solves the basic roofed-store brief and shows three logs clearly; the reference did not rescue a failed model. B's log ends are still readable, though the front lip masks their lower edge. Neither communicates “recovered” rather than “stored” without the actual game context. Placement, pickup and stock behavior remain slice 2's work.

| Measure                                                          |          A: text only |   B: reference guided |
| ---------------------------------------------------------------- | --------------------: | --------------------: |
| Unique mesh triangles (optimized export)                         |                   520 |                 1,016 |
| Assembly triangles (exported nodes and evaluated reimport agree) |                   724 |                 1,420 |
| Compressed GLB bytes                                             |                17,816 |                24,952 |
| Named closed mesh parts                                          |                    17 |                    29 |
| Materials / textures / animation clips                           |             4 / 0 / 0 |             4 / 0 / 0 |
| Decoded X × Y × Z bounds, m                                      | 1.905 × 2.030 × 1.520 | 2.040 × 1.998 × 1.360 |
| Stage draws, game / studio                                       |               48 / 47 |               72 / 71 |
| Geometry repairs after first inspection                          |                     1 |                     1 |
| Approximate authoring-to-close-review elapsed                    |             5 minutes |             6 minutes |

B was drafted after the 18:05:27 reveal; first build/orthographic review finished around 18:08; the repair/reinspection around 18:09; matched game and close reviews by 18:11:49. Extra paired turntable QA followed, finishing about 18:13:30. A's commit gate was about 18:05. These are process intervals including reading, scripts, shared-machine waits and review, not isolated modeling labor or performance. Reference generation happened earlier and is excluded; the board reports five generation calls but no cost. No generation service was called here; token/service cost is not available. B was neither faster nor lower-repair in this small sequential trial.

B repair ledger: first sheet showed a visually thin, unsupported multi-board roof and decoded feet 7.46 mm above ground → add four named rafters and start the leaning posts at ground → supported eaves and grounded feet in r1. The r0 GLB/recipe/metrics remain in `.look/rack-b-r0/`; r1 is `.look/rack-b-r1/`. B has zero degenerate faces, invalid normals, boundary or non-manifold edges; each part is one positive-volume closed component. Its slanted feet extend 2.52 mm below ground; no open-surface exceptions. No export failures or harness failures, and no second repair. Front/back geometry comes from the same roof profile, so the generated sheet's inconsistent seams cannot propagate into different elevations.

The cost increase is **7,136 bytes (+40%), 696 assembly triangles (+96%) and 24 measured stage draws (+50% in the game view)**. The stock loader draws individual named meshes/material primitives and shadows; deduplicating a mesh reduces stored geometry, not its repeated draw count. No batching/performance claim is made. Both fit the comparison's geometry/byte ceilings; B's larger draw count is a tradeoff to retain for placement review, not permission to broaden this task into renderer work.

The evidence supports **using the generated reference set to sharpen silhouette and part choices**, not “turnarounds automatically produce better models.” All three views of shot 3 were used: front for offset ridge/eaves, right for depth intent, back for reversed brace/roof; shot 2 supplied the low bed, timber weight and scale relationship; shot 1 supplied the broad town-path read. The perspective shots and board conveyed much of the same information. Their effect cannot be separated from the sheet, changed palette, extra parts or experience gained from A. The sheet's useful constraint was explicit front/back correspondence; its extra posts, bands and dimensions needed rejection.

## Evidence, checks and limits

- B matched [game manifest](../../.look/evidence/1793902206780-86196/evidence.json) and [close manifest](../../.look/evidence/1793902238102-86518/evidence.json). Camera, target, FOV, light, exposure and Buddy pose match A exactly; the stage places Buddy at each rack's maximum X plus 1.1 m, so B's reference is 5 cm farther right. No independent auto-fit or lighting retune.
- Opened both revisions' complete Blender sheets (all four views in all four rows), A's initial/repaired game stills, A/B repaired close and game stills, and both 12-view runtime turntable sheets. Workbench material rows are not runtime shading evidence; the WebGPU stills are.
- Opened four consecutive encoded PNG frames extracted with ffmpeg at 3 s from each retained turntable video. [A turntable](../../.look/evidence/1793902309644-88817/evidence.json), [B turntable](../../.look/evidence/1793902354759-89634/evidence.json). Across the sampled revolution the rear brace properly passes in front of the rear log ends, while the front shows the ends unobstructed above the lip. The asymmetric B roof stays coherent from both sides; no disappearing faces observed. Buddy circles with the inspection stage; this is not gameplay animation.
- Turntable camera `[5,3,6]`, target `[0,.9,0]`, FOV 40°, studio/exposure 1, fixed Buddy pose, built-in stage spin. Image positions are shape evidence only. Generic `--curves` records the background game, **not rack motion**; its timing, frame numbers and speed are not used. Neither encoded video nor captures establish real-time smoothness. A quiet rerun is needed for performance/feel if later integration requires those claims.
- Final geometry/code passed `npm run check`: lint, typecheck, all 330 unit tests, registry, level coverage, eight fresh assets and production build. Log: `.look/rack-final-check.log`. No new tests/scenarios. No bot playthrough was run and no bot failure is claimed: geometry remains outside the playable world and there is no changed sync contract. All seven broker runs so far passed WebGPU/error checks with unchanged trees during each run; the final committed tree gets a final game-view capture for the launcher handoff.
- At the comparison checkpoint, both independent recipes and built outputs remained; neither imported the other. The owner-verdict follow-up above supersedes that retention state. No game source, placement, copy, state ownership, lockstep math, saves or networking changed. No applicable nested AGENTS.md exists under assets, character or docs (checked explicitly). No push or ship. Main was not a mutation target.
- The sole command-policy departure was the interrupted `inflight` fetch noted above. The ordinary sandbox blocked the first local Git commit attempt; the authorized retry committed normally, with no hook bypass. Prettier was run on changed supported files; Python recipes were passed with `--ignore-unknown` because this installation has no Python formatter. Pipeline freshness and Blender execution validate their builds.
- Source/output hashes live in the committed manifest; `.look/rack-dependencies.json` records full SHA-256 hashes for both recipes/GLBs, lockfile, builder, inspector, loader, stage, lighting and descriptors. These and retained Blender inspections/check log are copied beside broker artifacts for the launcher's handoff. Reference SHA-256 values were checked and match the board's three recorded hashes. Final capture manifests identify their exact commit/tree; earlier manifests intentionally retain A's pre-reference state and intermediate documentation states.

Original owner question: does B's off-centre roof feel like the intended recovery rack beside Buddy? **Answered: B is preferred**, with the previz condition recorded above. This does not approve placement or stock rules; **not tested on a device**.

The one still to look at: [B at the matched game camera beside Buddy](../../.look/evidence/1793902206780-86196/rack-b-r1-game-still.png).
