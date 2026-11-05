# Recovery rack model comparison

Owner exception, 5 November 2026: work may start before the round-4 replay, assuming it goes well. Remain on this branch; no push, ship or game placement. Slice 2 owns stock and placement. This is static geometry and Local asset-stage metadata only, with no shared state, lockstep math, events or gameplay changes. DESIGN.md: **Show, don't tell**.

## Locked text-only brief (before opening references)

Build A starts at 2026-11-05 18:00 UTC (approximate authoring start). No supplied image or board has been opened. A crooked outdoor timber rack with a crooked roof, holding three logs, slightly taller than Buddy, distinct from the cart delivery rack. One canonical recipe per ID under `assets/src`; no textures, worker, signs, tiny grain or gameplay behavior.

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
