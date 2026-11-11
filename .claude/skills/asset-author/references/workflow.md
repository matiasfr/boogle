# Brief and retained evidence

Brief (write before modelling):

- Purpose / silhouette question / reference views and landmarks.
- Measured dimensions in metres, each with source; inferred dimensions separately.
- Named parts, expected closed solids and intentional open surfaces; triangle/material/byte targets (guides to report against, not caps that cut the asset; [owner call](../../../../docs/agents/owner-calls.md#performance-guides-not-gates)).
- Game axes (+Y up, +Z forward), origin/pivot/axle, receiver dimensions; bone name and rest transform for attachments.
- Revision parameter, materials, intended motion (or explicit none), forbidden details.

Canonical parameter example: `assets/src/feeder-roller.py` reads `feeder-roller.json`'s `lengthScale`; `LENGTH = 0.86 * spec['lengthScale']`, `RADIUS = 0.075`. Change 1 to 1.2 to move game-Z end planes ±0.430 → ±0.516 m while keeping the axle midpoint zero. The receiver must widen by 0.172 m; never call this a drop-in fit. Copy the pattern, not the asset identity. Name meshes and keep revision parameters in the hashed recipe/sidecar; inventory any imported dependencies separately.

Inspection (fixed across variants, never independently auto-fit):

```sh
node dev/assets/inspect.ts assets/built/feeder-roller.glb .look/roller-r0 1.45 0,0,0
node dev/assets/inspect.ts assets/built/conductor-cap.glb .look/cap-r0 0.85 0,0.44,0
```

The directory retains the exact built input, decoded interchange, settings/hash/node transforms, Blender log, `metrics.json` and a `sheet.png` and 16 PNGs: clay/parts/wire/material × front/side/back/three. Metrics use evaluated imported world geometry in game axes. Topology alone welds a disposable copy at 1e-7 m; rendered geometry is untouched. Non-manifold counts include boundary edges; an open cap underside needs an explicit exception. Multiple named parts need not be one connected solid. This helper targets untextured triangle props/rigid attachments, not skinned evaluation or KTX2 material fidelity. Read the metrics even if rendering failed. Final materials must be inspected in the WebGPU stage.

Stage links (keep exact query and reference pose with evidence):

- Roller: `/character/?asset=feeder-roller&t=0&reference=1&bounds=0&cam=3,2,5&target=0.7,0.7,0&light=studio&exposure=1`.
- Worn cap: `/character/?asset=buddy&hat=conductor&mode=played&clip=Walk_Loop&pose=carrying&t=0.4&reference=1&bounds=0&cam=3,2,5&target=0.7,0.9,0&light=studio&exposure=1`.
- Game distance: keep selection, use `cam=5,3,8`, `light=shipped`, `exposure=0.16`. Confirm the stage's actual selected settings; do not assume an unknown query value was accepted.

For broker capture use `node .look/see-client.ts look --eval dev/look/evals/asset-stage.ts --query '<URLSearchParams encoding of stage=<stage query>>' --name <revision> --question '<visual question>'`. The eval mounts the real same-origin stage and checks its backend/frames. The broker owns URL/output. For motion:

```sh
node dev/look/asset-motion.ts --broker --asset conductor-cap --clip Walk_Loop --mode played --pose carrying --name cap-carry
node dev/look/asset-motion.ts --broker --asset buddy --clip Walk_Loop --mode raw --name buddy-control
```

Retained evidence record: immutable revision directory; recipe/sidecar/dependencies; source/build hashes and Git tree; Node/Blender versions; brief; exported vs reimport metrics and exceptions; camera/ortho centre/light/exposure/pose; opened image names and observations; motion frame numbers/outliers; broker manifests; cause → targeted change → result; elapsed time, token cost if known and service cost. Never invent missing cost data. One owner question with stage links; distinguish technical checks from taste, device performance, cargo clearance and real-time feel.

A requested dry brief uses the same builder without registration: create `.look/<trial>/src/<id>.py` and its sidecar, then `npm run assets -- --scratch .look/<trial> <id>`. Inspect `.look/<trial>/built/<id>.glb` with the helper, keeping output in a new revision directory. Stop after blockout/inspection when requested; commit no scratch asset. This is the only source-location exception: production recipes live in `assets/src/`. Scratch skips catalogue membership, not optimization.
