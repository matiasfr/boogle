# Return spot, steps 1–3

Step 1 adds a real-reload eval, reattached by `--until`, with `{ before, after, distance }` in
`document.documentElement.dataset.railwayReturn`. It stages High Gorge's north platform, waits six seconds and
reloads without seeding storage. Baseline not reproduced: the broker rejected `--wall`; the supported retry queued
behind eight jobs and its client/server were cancelled before implementation. No before/after numbers or visual
verdict are claimed. The broker request is `.look/evidence/1794649804113-88631`.

Implementation notes and final checks are recorded below as each step completes. This batch does not implement
step 4's distance-resident restore/fallback chain or step 5's loading cover.

Step 2: pure bounded record parsing, capture retention, ordered candidates and catalogue halt landings; surface
queries and nearby rings; Local 30-minute next-load preference; v0/v1 room and namespace reset coverage. The surface
queries are methods on `createPosePolicy`, supplied ray queries by arrival's existing bindings: the prefab boundary
forbids new physics bindings and public exports in `pose.ts`. No allowance was added. The tunable has a persistent
Local dev binding; its load-time consumer comes with step 3. The existing physics regression still covers the old
read until step 3 removes it. Targeted tests: 20/20 passed (including removed deck and 1m/2m ceilings).

Plan/code differences: DESIGN.md 8 is now **Enjoyable alone and together**, retaining reliable reconnects; the old
title in the plan is stale. `JUMPS` lives in `src/world/railway-jump.ts` (read only). Simply widening the reset prefix
would parse `v1` as the room id; reset parsing now strips the version before checking both room and world.
