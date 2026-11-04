# Metal cold-start follow-up: blocked before implementation

2026-11-03. DESIGN.md: **Small and readable — measure before optimizing**.

**`trueCold` remains false. No isolated browser identity was implemented or verified.**
The owner required stopping on blockers. The broker accepted a headed baseline, but its first
sample had two console resource-404 errors. The inspected still shows the place world and no sea.
After inspecting that failure, I stopped only the test browser (PID 4604, verified against this
run's exact owned profile). The warm sample was interrupted; its browser-closed error is deliberate.
No game code, browser bundle, Metal cache, owner's profile or shared cache was changed.

There is also an execution boundary: this broker launches
`/Users/matiasfranco/Developer/boogle-codex/water-cold-start/dev/cold-start.ts`, not this worker's tool.
An isolated-launcher implementation here would require promotion to the trusted launching checkout
and a restarted broker before it could be tested through that broker. Changing another checkout or
making the broker execute arbitrary worker code is outside this job's scope.

## Evidence and limits

[Broker manifest](../../.look/evidence/1793758113245-4190/evidence.json),
[report](../../.look/evidence/1793758113245-4190/report.json),
[complete stall attribution](../../.look/evidence/1793758113245-4190/1-cold-summary.json).
Source and harness trees stayed unchanged during the run. The launcher copies these artifacts into its handoff.

Requested: three 90-second cold/warm pairs for each sea, plus Metal-versus-browser-cache-only proof.
Completed: one 90-second browser-cache-only new-sea cold sample; zero completed pairs, zero old-sea
samples, zero isolated Metal samples. Cold synchronous pipeline total: 0.30 ms. Warm spread and
Metal contribution are unavailable. Neither timing nor cache-clearing success is claimed.

Visual question: is the world visible, with the sea in frame? Opened only
[`1-cold.png`](../../.look/evidence/1793758113245-4190/1-cold.png): terrain, characters and hat stalls
are visible; sea is absent. The page reported `hidden: false`; physical window visibility remains
unverified because computer access to Chrome for Testing was denied. Host audit recorded no other
matching rendering job at launch, but concurrent rendering throughout the sample cannot be excluded.
No gameplay bot was run. No real-time motion judgement was made.

All callback intervals over 50 ms follow. Times are milliseconds from navigation; attribution is
overlapping evidence, not a claim that a named script owns the entire interval. Unknown GPU/OS/display
time stays unknown. The visibility proxy occurred at 12468.4 ms, not a pixel-confirmed first sea frame.

| Interval end | Duration | Relation to visibility | Attribution evidence / unknown owner |
| ---: | ---: | --- | --- |
| 1801.6 | 1658.3 | Before | main-B7rCfapN.js evaluation, 1664.7 ms |
| 2093.3 | 267.9 | Before | index-Cj9bGi4C.js evaluation, 242.1 ms |
| 2443.3 | 316.9 | Before | Timer 8.8 ms; pipeline call 0.1 ms; remainder unknown |
| 2685.0 | 233.4 | Before | Repeated index-CVpWZ-gP.js timers; entire-gap owner unknown |
| 3959.9 | 1249.9 | Before | Async pipelines overlap (1282.4/1277.1 ms elapsed); cause unknown |
| 5018.3 | 50.5 | Before | Pipeline overlap rounded to 0 ms; unknown |
| 10051.6 | 66.7 | Before | Unknown |
| 10843.2 | 749.9 | Before | Unnamed frame callbacks and pipeline overlap; cause unknown |
| 12884.9 | 2041.7 | Straddles | Unnamed callbacks; compute call rounded to 0 ms; cause unknown |
| 13218.4 | 299.8 | After | audio-DxF_gMus.js pointerdown 255.5 ms; frame callback 44.6 ms |
| 13426.6 | 191.3 | After | Unnamed frame callback 10.2 ms; remainder unknown |

Two intervals lie wholly after the visibility proxy. This unhealthy Mac M1 Max Chrome/ANGLE Metal
sample identifies an audio-work candidate; it cannot reproduce or rule out the owner's iPhone 17 Pro
Safari stall, establish Safari compiler behavior, or measure Metal cold-start contribution.

## Outside-sandbox command

To reproduce the existing baseline directly, with other rendering jobs stopped by their owners:

```sh
cd /Users/matiasfranco/Developer/boogle-codex/water-metal-cold
npm run cold-start -- --direct --runs 3 --mode paired --seconds 90 --video-probe --query 'proto=place&water=new'
```

This command still uses shared Metal identity and will keep `trueCold: false`; it is not a workaround
that proves isolated clearing. Implementation and broker promotion remain necessary. Deployed-site
testing is untouched. `inflight` was skipped because it fetches GitHub, prohibited by this job.

Validation: `npx prettier --write docs/research/water-metal-cold.md` and `npm run check` passed
(lint, typecheck, unit tests, registry, level, assets and production build). Only this report changed.
The benchmark manifest records the preceding source tree; the final commit adds documentation only.
