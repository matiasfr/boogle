# Return spot, steps 1–3

Step 1 adds a real-reload eval, reattached by `--until`, with `{ before, after, distance }` in
`document.documentElement.dataset.railwayReturn`. It stages High Gorge's north platform, waits six seconds and
reloads without seeding storage. Baseline not reproduced: the broker rejected `--wall`; the supported retry queued
behind eight jobs and its client/server were cancelled before implementation. No before/after numbers or visual
verdict are claimed. The broker request is `.look/evidence/1794649804113-88631`.

Implementation notes and final checks are recorded below as each step completes. This batch does not implement
step 4's distance-resident restore/fallback chain or step 5's loading cover.
