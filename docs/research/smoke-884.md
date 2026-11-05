# Smoke 884: bounded startup recovery

4 November 2026 incident; local verification continued on 5 November UTC. Issue remains open. No push or ship.

## Incident findings

These run facts come from the owner's supplied summaries, not downloaded logs. The final instruction restricted
network access to local servers, so GitHub logs/artifacts and deploy timestamps were not retrieved.

| Run | Confirmed from supplied evidence | Still unknown |
| --- | --- | --- |
| 41883882018, 18:07 UTC | Gameplay assertions passed; console reported a script-fetch HTTP 503. | Resource URL, whether this was sw.js, recovery, and deploy correlation. A service-worker registration failure is plausible, not established. |
| 41921849873, 22:03 UTC | Toss failed on all three attempts and the run timed out at 420 seconds; summary has no 503. | Reload/build change, server deployment, runner starvation, edit drops, and root cause. Absence in the summary does not exclude an HTTP error elsewhere. |
| 41923908461, 22:17 UTC | Alice received a Rapier WASM 503; startup logged undefined.World; toss failed. | Exact event ordering, whether Alice reloaded mid-test, causal link to the toss failure, and deploy correlation. |

**Confirmed in code:** Vite's preload helper returns undefined when its error event is cancelled. The previous
chunk-reload handler cancelled every early preload error, including WASM evaluation failures. Rapier's loader
could consequently receive undefined and access World. The WASM plugin also passed non-OK HTTP responses to
the compiler. These explain a real startup failure mechanism; they do not establish the entire chronology of
41923908461. No evidence justifies a deploy-specific smoke restart, so none was added.

## Change

The WASM helper now checks HTTP status and retries explicit 503 responses after 500 and 1500 ms, at most three
requests. Success adds no timer or extra fetch. Exhaustion reaches the existing lobby with a physics-download
message, HTTP status and disabled entry. SIMD HTTP exhaustion does not start another budget through plain Rapier;
the existing instantiation fallback remains. engine.ts stays the physics door.

Failed dynamic game imports still reject. Early network import failures can reload at most twice with the same
backoff, with a sessionStorage budget across documents. Evaluation errors do not reload. The bootstrap catches
game import failure even when main never evaluated. This cannot recover a missing bootstrap script itself.

The service worker uses the same retry for uncached assets and precache, retaining successful-response-only
cache writes. WASM response retries belong to the page to avoid multiplying budgets. Registration timing,
precache graph checks, plain-WASM exclusion and kill switches remain in place. No live worker/cache fault test
was performed; production precache build checks passed. Smoke's existing blanket 503 console filter was removed;
gift, ball and hash assertions are unchanged.

## Local evidence

All final fault cases used production assets, the existing broker's look action and loopback HTTP response
interception. Playwright route installation is not exposed by this broker. A fresh full-size iframe exercises
boot while its parent remains alive for capture health. SW is disabled in these fault cases. Assertions check
request counts, reload budget, walking after recovery, or disabled entry and failure copy after exhaustion.
Every intentional HTTP/boot error remains recorded: fault capture exit status is **1**, not a clean health pass.

| Case | Result and opened still | Manifest |
| --- | --- | --- |
| WASM once | 503 then 200 at +504 ms; zero reloads; island visible and walking assertion passed. `wasm-once-still.png` | [evidence](../../.look/evidence/1793844855005-24345/evidence.json) |
| WASM permanent | Three 503s at 0/502/2005 ms; zero reloads; readable physics HTTP 503 card, disabled entry. `wasm-always-still.png` | [evidence](../../.look/evidence/1793844883408-26120/evidence.json) |
| Chunk recovery | Failed preload and import; one reload; success at +685 ms; island visible and walking passed. `chunk-once-still.png` | [evidence](../../.look/evidence/1793844808056-23095/evidence.json) |
| Chunk permanent | Six failed requests across three documents; exactly two reloads; readable loading-failure card. `chunk-always-still.png` | [evidence](../../.look/evidence/1793844830050-23400/evidence.json) |
| Final smoke | All eight assertions passed, toss 434 ms, zero dropped held edits, matching world hashes, no graphics errors. Opened `smoke/Alice-still.png`: both players and beach ball visible. | [evidence](../../.look/evidence/1793845006626-28117/evidence.json) |

Smoke was run through `node .look/see-client.ts scenario smoke --production`, the broker equivalent of
`npm run check:gpu`, to obey the prohibition on launching Chromium directly. No full place bot was run.
Fault proof uses real walking input, not a complete playthrough; real-time smoothness and mobile remain unverified.

Early verification retained: [initial smoke](../../.look/evidence/1793844492403-19387/evidence.json),
[initial WASM recovery](../../.look/evidence/1793844595553-20445/evidence.json),
[initial WASM exhaustion](../../.look/evidence/1793844617886-20716/evidence.json). Their stills were also opened.
One chunk fixture initially targeted the bootstrap and failed before capture
([record](../../.look/evidence/1793844649763-21103/evidence.json)). The next fixture allowed Chromium's own
modulepreload retry and had an externally changing trusted harness; its still was opened but it is superseded
([record](../../.look/evidence/1793844743654-21908/evidence.json)). Final cases above have stable source/harness trees.

## Normal-load comparison and limits

One prime plus one coarse cold sample each, same production Place/new-water workload, 20-second measurement:
[before](../../.look/evidence/1793844233819-15389/evidence.json),
[after](../../.look/evidence/1793844920715-27138/evidence.json). Opened both `1-cold.png` stills: the same shore view
is rendered with live UI. No health errors; each cold sample fetched WASM exactly once with status 200.

| Coarse cold phase | Before | After |
| --- | --- | --- |
| Modules | 544 ms | 376 ms |
| WASM fetch duration | 303 ms | 318 ms |
| Physics ready | 3331 ms | 2909 ms |
| Buddy ready | 6376 ms | 10434 ms |
| First frame | 13532 ms | 21452 ms |

The retry path did not run on success. Total startup-time parity is **not established**: the later avatar and
shader work was slower, and both cold-start reports exited 2 with trueCold=false/measurable=false. Machine
exclusivity was not established. Do not interpret these samples as a proven regression or as unchanged latency.

## Reproduce

Final `npm run check` passed: lint, types, existing unit tests, registry, levels, asset validation and production build.
No unit tests or new scenarios were added. The final diff was reviewed and formatted with Prettier.

```sh
env BOOGLE_BOOT_FAULTS=1 node .look/see-client.ts look --production \
  --query 'classic=1&sw=0&notrack=1&retryProof=wasm-once' \
  --action dev/look/evals/boot-retry.ts --real --warm 0 --hud --name wasm-once \
  --question 'Does a transient physics download recover into play?'
```

Other retryProof values: wasm-always, chunk-once, chunk-always. Chunk-once fails both the modulepreload and
the import request, so it exercises our reload rather than just Chromium's own refetch. The proxy is opt-in,
loopback-only and absent from shipped game code. It retains `boot-faults.json` beside its disposable production build.

Departure: the repository-required `npm run inflight` was mistakenly run before checking its implementation;
it fetched remote Git refs despite the local-only network instruction. This was disclosed immediately. No
further external commands were used. Server-side interception substitutes for unavailable broker Playwright
routes; the GPU smoke command used the broker equivalent. No original CI failure is declared resolved.
