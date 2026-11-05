# Frozen shot lists

4 November 2026. Implements the owner's agreed repeated-capture design. State is **Local harness state**;
no lockstep, room, player feature, normal shader graph or startup import changes.

1. Keep the existing trusted broker. `see-client.ts shots` is a frontend queue that submits one existing
   `look --action` operation per reload group. An older running broker works unchanged. Locally the same action
   uses `session.ts`'s persistent page, clock and saved-beat restore. No second browser driver.
2. Save small TS/JSON lists in `dev/look/beats/`. A beat names a checkpoint (`at`, optional `saves`) or an
   explicitly authored `setup`, then cameras and variants. Checkpoints take the existing look restore path;
   authored fixtures are not played progression. Player-relative cameras resolve once and retain exact world
   coordinates in each output manifest. Settings use existing Dev Looks names, generic graphics adapter IDs
   and live binding IDs, so later post layers need no capture-specific naming scheme.
3. Group route/query, viewport, MSAA and resolution changes. MSAA uses the existing `graphicsMsaa` boot override;
   never change a live attachment's sample count. Resolution is actually **live** in this build, but gets a
   separate resource warm-up group and board because its pixel dimensions differ. Any other adapter reporting
   `reload` fails explicitly with its name/value until it has a boot mapping; never substitute stale output.
4. Warm every camera/variant combination through the real output pipeline before collecting evidence. Pause
   the existing warp clock and drain the pending native callback. Residents, trains, clouds, Buddy animation,
   spray, particle compute, water FFT and shader time receive no game updates. Disable the meter through its
   graphics owner, in addition to the Looks exposure lock. Rendering increments only the three node-frame
   cache identity: otherwise a repeated pipeline call can reuse an old scene texture. Assert a real scene
   draw, renderer submission, constant page/shader/game clocks, and zero compute dispatches.
5. Copy the canvas in the submitting task, before yielding to GPU completion: the compositor can discard the
   WebGPU drawing buffer on yield. Save lossless PNGs, exact requested/effective settings, dimensions, camera,
   render IDs and wall timings. Compare every cell with its camera's first cell using changed RGBA pixels,
   mean absolute channel difference and maximum channel difference. These are diagnostics, not quality scores.
6. Render every cell again, then another setting and back. Any pixel difference fails the queue. This covers
   the observed settled scene, not all possible temporal effects. Server/socket traffic and late asset promises
   remain live; use an isolated settled beat. Temporal accumulation needs its own freeze adapter before it can
   pass. Repeated captures fail on visible drift rather than claiming universal freeze support.
7. Compose one native-pixel column per camera in the same page with `sheet-render.ts`; large wrapped labels,
   PNG throughout. Individual cells remain available. The broker manifest remains authoritative for build,
   logs and health; extracted files and the queue manifest are copied beside it for the launcher's handoff.
   Failed runs retain the log, completed images and failed status. Frozen frames establish no motion, GPU
   cost, load-stall or feel evidence; this limit is printed on every board and manifest.

## Engine comparison and access limit

The requested primary-source check of Unreal Movie Render Queue and Unity Recorder was **not performed**:
this job explicitly permits network access only to its local server, and no local copy of those manuals was
available. The following is a design comparison to verify against their manuals, not a newly sourced claim:
MRQ's reusable jobs/settings and warm-up separation are useful models; Unity Recorder's frame-indexed capture
and fixed-step recording are useful models. Adopt reusable queue data and explicit clock ownership. Reject
temporal supersampling and frame advancement between matched settings: these stills must share one simulation
frame. Boogle reuses its small harness instead of adding an engine-style asset database or editor UI.

`npm run inflight` was also not run because its implementation always fetches origin. The supplied concurrent
branches were kept untouched; cached local refs confirmed their presence. No network was used for research.

## Measurement

`node .look/see-client.ts shots dev/look/beats/dev-looks.ts --name comparison --baseline` captures the complete
matrix once, then repeats the identical list with one old look lifecycle per cell. The baseline includes the
same freeze/readback probes, so it measures lifecycle savings, not an exact replay of old screenshot code.
Queue manifests retain every wall time; per-cell manifests distinguish capture time from warm-up and include
boards/probe overhead in total. This Mac shares its GPU with the owner's other Codex graphics jobs; do not
interpret these throughput numbers as GPU cost. Normal player inputs under `src/`, entry HTML, assets, package
lock and Vite configuration are unchanged; ordinary builds cannot reach the new dev-only serialized actions.
