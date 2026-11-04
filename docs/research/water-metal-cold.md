# Cold-start freeze: reproduced and fixed on the M1 Max

2026-11-03. DESIGN.md: **Small and readable — measure before optimizing**.

**A cold Metal cache froze the place page for 4.5–4.8 s as the loading screen lifted (2 of 3 full runs). With first-frame pipelines built behind loading and a 16 s deadline, it no longer does in two coarse cold runs.** Local production, new sea, M1 Max, Chrome for Testing, headed, exclusive Metal cache cleared.

| Runs | World appears, cold | Longest gap around the reveal, cold | Same, warm |
| --- | ---: | ---: | ---: |
| Before: 3 pairs, 90 s | 14.7–17.8 s | 509–4,791 ms | 284–308 ms |
| Warm-up fix, 8 s deadline: 2 pairs, 30 s | 14.0–14.7 s | 500–1,683 ms, 9–16 pipelines pending | 400–467 ms |
| Warm-up fix, 16 s deadline: 2 pairs, 35 s | 13.0–14.4 s | 318–400 ms, none pending | 300–341 ms |

Still there: the audio unlock on join (about 300 ms) and one ShadowMaterial pipeline built on join. Limits: small coarse samples; the tool still reports `trueCold: false` and `measurable: false`; the home island was not measured, because the fixed view needs `proto=place`; iPhone and Safari were not tested, and #35069 cannot be checked on this Mac. Old sea was not rerun after the fix. Tool notes follow.

## Verified here

- `--prepare-only` copied Playwright Chrome for Testing under this worktree's
  `.look/cold-start-sandbox/browser-D5sISK/Google Chrome for Testing.app`. All nine app/helper plists and signed
  identifiers use `club.boogle.coldstart.dee9d56920544fa18f38d64ca4b8dab5` or its helper suffixes.
  Ad-hoc signing and deep/strict signature verification passed. The Playwright source bundle was only read.
- Fake-cache exercises rejected shared identities and symlink parents/descendants, deleted only the two exclusive
  Metal leaves, and preserved shared-cache and unrelated-cache sentinels. No real Metal cache was cleared.
- Five invalid CLI cases were rejected. Node-only exercises verified immediate camera assignment and interval-union
  arithmetic (20 ms union versus 25 ms summed overlapping async latency). These do not verify browser execution.
- [Sandbox evidence](../../.look/evidence/1793758730147-7290/sandbox-evidence.json) is supplemental evidence produced
  by local exercises, copied beside the broker artifacts for handoff; it is not a browser benchmark.
- Both production broker captures passed WebGPU, advancing completed frames and zero page/console/graphics errors:
  [new-sea manifest](../../.look/evidence/1793758632900-6948/evidence.json),
  [old-sea manifest](../../.look/evidence/1793758730147-7290/evidence.json).
  Opened `cold-shore-new-still.png` and `cold-shore-old-still.png`. Both show substantial foreground sea and the same
  shoreline; new sea has turquoise surface detail/caustics, old sea is plain blue. Motion sheets were not opened.
  No gameplay bot ran, so there are no bot results. Real-time motion, physical occlusion and devices remain unverified.

Visual question: does the fixed benchmark shore camera show substantial water for both seas? Yes in these two
stills. The broker uses its launcher's tool, so these establish only the pose and generated production HTML health.
They do not establish the new runner's early camera installation or 90-second persistence. No source changed during
either capture; the second includes the runner's cleanup refinement. Later changes are documentation only.

The previous sample's two 404s were **both `/favicon.ico`**, at 12905.2 and 13259.8 ms in the historical
`water-metal-cold/.look/evidence/1793758113245-4190/1-cold-timeline.json` resource entries. They were not fonts.
The site has PNG icons but no favicon.ico/link: a real ancillary asset omission. Within this no-game-fixes task,
generated local production HTML now links `/icon-192.png`. Deployed runs retain and classify only an exact
same-origin `/favicon.ico` 404 as ancillary; every other failed request/error remains unhealthy. Network logs retain
URLs/statuses and console locations. Font links are still removed only from generated local HTML.

## What the runner does

Each invocation creates a new random `club.boogle.coldstart.<uuid>` identity, copies the installed Playwright app into
its output directory, edits every app/helper `CFBundleIdentifier`, ad-hoc signs and verifies the copy, and launches
its executable via `executablePath`. It retains the copy and identity manifest for inspection.

One unmeasured 90-second priming visit precedes three measured cold/warm pairs. Every cold visit gets a fresh profile
and clears only `<DARWIN_USER_CACHE_DIR>/<exact unique id>[.*]/com.apple.metal` and `com.apple.metalfe`.
Deletion validates the unique id, direct parent and every descendant, rejecting symlinks before removing anything.
It never clears shared Chrome/Chromium, owner-browser, OS-wide or filesystem caches. Warm relaunches preserve the
pair's profile and exclusive Metal caches. Completed pairs delete only their own temporary profile; execution
failures retain their profiles for inspection. The last exclusive Metal files remain after the invocation.

`clear-N.json` records paths and removed-file inventory. After every sample, including launch/close failures,
`N-kind-metal.json` and console output report new/changed exclusive files with paths, sizes and mtimes.
`identity.json`, disk-cache inventories and browser arguments expose what was used. File size/mtime changes are
write evidence, not a trace of every filesystem operation; no shared-cache write attribution is claimed.

`trueCold` requires exclusive priming and cold writes, actual nonempty clears for all requested pairs, unchanged
source, no run failure, and at least three healthy matched-pipeline pairs. The measured metric is the **union of
async pipeline elapsed intervals**, avoiding double-counting overlap. Every cold-minus-warm delta must exceed 5 ms,
and their median must exceed 10% of the cold median. The old synchronous total was only 0.30 ms and is now diagnostic
only. Async elapsed includes queueing and JS scheduling, not isolated compiler time. Browser caches also differ,
so this smoke criterion cannot quantify Metal's individual contribution or establish statistical significance.
Failure keeps `trueCold: false` and exits 2; execution failures exit 1.

Every sample uses `proto=place`, `debugcam=1`, fixed DPR and the same fixed shore pose:
camera `(770,10,110)` looking at `(850,0,90)`. An init-script accessor sets the existing camera API as soon as the game
installs it; health rejects installation after `boot:first`. The game hook holds that pose each frame. Captures at
join-ready, 30 s, 60 s and end make framing reviewable. Capture overhead applies equally to both seas. Visibility and
focus are sampled each second; CDP window bounds/state are recorded at start/end, plus actual browser launch flags.
These signals cannot establish physical window occlusion: that remains explicitly unknown, even with `hidden:false`.
The video probe is canvas presentation evidence, not monitor scan-out.

## Exact owner commands, outside the sandbox

Run separately from **this worktree**, with other rendering jobs stopped by their owners. Each command records
three 90-second cold/warm pairs plus the priming visit (seven visits, about 10.5 minutes plus build/launch overhead).
Deployed commands require a terminal/session permitting external network; none was used in this job. No promotion
to another checkout or broker modification is needed with `--direct`.

```sh
cd /Users/matiasfranco/Developer/boogle-codex/water-metal-tool
npm run cold-start -- --direct --runs 3 --mode paired --seconds 90 --video-probe --query 'proto=place&water=new'
npm run cold-start -- --direct --runs 3 --mode paired --seconds 90 --video-probe --query 'proto=place&water=old'
npm run cold-start -- --direct --url 'https://boogle.club/?proto=place&water=new' --runs 3 --mode paired --seconds 90 --video-probe
npm run cold-start -- --direct --url 'https://boogle.club/?proto=place&water=old' --runs 3 --mode paired --seconds 90 --video-probe
```

Read each printed `report.json`, clear/write inventories and all checkpoint PNGs before accepting its result.
Actual exclusive cache placement, measurable cold/warm differences, the complete runner lifecycle, deployed behavior
and Safari/iPhone reproduction remain unverified. Do not describe this tool as working until these commands run.

Validation: targeted Prettier and ESLint passed. `npm run check` passed (lint, typecheck, unit tests, registry,
level checks, assets and production build).
`inflight` was skipped because it fetches GitHub, prohibited by this task. No new unit tests or scenarios were added.
