# Cold-start recorder: true-cold reproduction remains blocked

> **Verdict:** True-cold reproduction was blocked; replaced by the cold-start fix.
> **Top recommendations:** none; historical report, the reproduction stayed blocked.
> **Status:** superseded by [water-metal-cold](water-metal-cold.md).

Historical report. The current exclusive-browser implementation, validation limits and exact owner commands are in
[water-metal-cold.md](water-metal-cold.md). The shared-Metal and synchronous-threshold descriptions below describe
the earlier runner, not the current implementation; headed cold/warm validation remains pending.

2026-11-03. DESIGN.md: **Small and readable — measure before optimizing**. Local diagnostic state only.

**No true-cold headed sample was obtained. The owner's visible stall remains unresolved; no rendering fix or quality
change is justified.** The running trusted broker rejected `cold-start` with `Unknown operation`
([response](../../.look/see/1793757307115-99422.done.json)). It executes its launcher's tools, not this branch's new code.
Changing this worktree cannot upgrade that already-running process. No direct Chromium launch was attempted.
The new headed runner is **implemented but unrun**, including its disk-cache comparisons. Do not call it working.

The local production path and in-page recorder did run through the existing broker's `look` operation. The
[first UI verification manifest](../../.look/evidence/1793757352015-99569/evidence.json) records WebGPU, advancing
completed frames, and no page/console/graphics errors. Opened `startup-recorder-still.png` and
`startup-recorder-motion.png`: the expanded panel offers Copy/Save and selectable JSON over the visible landscape
and water. Clipboard access was denied; selectable-text fallback worked. The eval found 106 callback intervals,
346 shader/pipeline calls, 9 LoAF entries and a 5.566 s splash-removal proxy before stopping. These are headless
recorder checks, **not cold performance results**, and do not reproduce the owner's freeze. No gameplay bot was run.

| Requested measurement | Cold / warm samples | Spread / stall ownership |
| --- | ---: | --- |
| Headed local production, new sea | 0 / 0 | unavailable: old broker |
| Headed local production, old sea | 0 / 0 | unavailable: old broker |
| Deployed new and old sea | 0 / 0 | prohibited by this job's final localhost-only network instruction |
| Safari | 0 / 0 | installed Safari 27.0.1; safaridriver exited 1 before accepting a session, empty diagnostic output |

`npm run check` passed (lint, typecheck, 292 tests, registry, level, assets, production build). No new unit tests or
scenario: this is diagnostic tooling, under the test diet. `npm run inflight` was not run because it fetches GitHub;
the final instruction prohibits that network access. Process inspection with `ps` is denied in the worker, so other
rendering agents cannot be excluded. No `src/net`, `src/world`, `src/sim` or `server` files changed.

## What is cleared, and what is not

`--audit` prints the actual Playwright executable, OS version, process evidence (or unavailable) and Metal paths.
The installed executable is discovered from Playwright, never the owner's Chrome application/profile. Each cold
sample allocates a new, empty `mkdtemp` profile below the evidence directory. The browser is closed between every
cold/warm sample. Warm reuses that same profile and disk caches; both samples clear only test local/session storage
before the game starts, matching the join/audio path. Each pair has its own profile; pairs share one isolated local
server started for that invocation, never the owner's saved data.

| Layer | Method and evidence |
| --- | --- |
| HTTP cache | Explicit `--disk-cache-dir=<owned-profile>/http-cache`; new profile plus CDP `Network.clearBrowserCache` before cold navigation. Never disable caching or use Playwright routing. |
| Service workers and CacheStorage | New profile plus CDP `Storage.clearDataForOrigin(all)` for cold; registrations/cache names recorded after each sample. Warm preserves them. |
| Chromium GPU / Dawn / shader disk caches | New user-data directory excludes existing profile caches; inventory records actual cache file paths/sizes after browser close. Candidate names include `Default/GPUCache`, `DawnWebGPUCache`, `DawnGraphiteCache`, `ShaderCache`, `GrShaderCache`. Existence/placement must be verified in an actual headed run; the report does not invent those files. Entire test profile is deleted after its pair. |
| Browser process memory | Browser exits between both cold and warm samples. |
| macOS Metal | **NOT cleared.** Shared helper bundle identity is not isolated by `--user-data-dir`. No test-exclusive ownership proven. |
| OS-wide / system shader caches, filesystem page cache | **NOT cleared.** No system-wide cache or owner's profile is touched. |

Read-only inspection on this Mac found these real files, beneath
`/var/folders/6w/5trkw2_n4p3767hw00spjysr0000gn/C/` (`getconf DARWIN_USER_CACHE_DIR`):

- `com.google.chrome.for.testing.helper/com.apple.metal/32024/libraries.data` and `libraries.list`;
- `com.google.chrome.for.testing.helper/com.apple.metal/16777235_530/functions.data` and `functions.list`;
- `com.google.chrome.for.testing.helper/com.apple.metalfe/modules.timestamp`;
- the same relative Metal/metalfe files under `org.chromium.Chromium.helper/`.

These can belong to other agents' test browsers, so none is deleted. The tool deliberately reports
`trueCold: false` and exits 2 even if a browser-cache timing difference appears. A future test-exclusive browser
bundle/cache namespace would need its own verified writes and cold/warm comparison before changing that result.
Changing `HOME`, guessing a Metal environment variable, or deleting shared caches would not establish isolation.

## Run outside the sandbox

From this worktree, with other rendering jobs stopped by their owners, run the following separately. `--direct`
is for an owner/trusted terminal only. These commands use three 90-second cold/warm pairs per variant. They are
provided for execution, **not reported as executed**. Local production builds use an isolated output directory and
existing game server, remove external font links from that generated HTML only, and restrict browser DNS to localhost.
The local build therefore uses fallback fonts; deployed font/network behavior is a separate variable.

```sh
npm run cold-start -- --audit
npm run cold-start -- --direct --runs 3 --mode paired --video-probe --query 'proto=place&water=new'
npm run cold-start -- --direct --runs 3 --mode paired --video-probe --query 'proto=place&water=old'
# Only in a session permitting external network:
npm run cold-start -- --direct --url 'https://boogle.club/?proto=place&water=new' --runs 3 --mode paired --video-probe
npm run cold-start -- --direct --url 'https://boogle.club/?proto=place&water=old' --runs 3 --mode paired --video-probe
npm run cold-start -- --safari-probe
```

Once these tools have been promoted to the **trusted launching checkout** and its broker restarted, omit `--direct`
for local production runs. The broker continues to own URL/output/data directories; it cannot target the deployed
site. `node dev/codex/see.ts look --production ...` also lets the existing look operation inspect the worker's
production build. No arbitrary worker host code is added to the trusted broker's execution surface.

`--mode cold` records fresh profiles only; `--mode warm` primes each fresh profile with a recorded cold baseline,
then records the warm relaunch (same as paired). Without 3+ paired samples there is no cache proof. The default is
paired. The optional video probe adds capture overhead; compare both seas with identical settings, then repeat
without it if it appears material. `--seconds` accepts 10..90; keep 90 for the reported minute-long issue.

Evidence per sample: full timeline JSON, every interval >50 ms with overlapping LoAF script attribution and pipeline
candidates, GPU/CDP info, completed-frame health sample, screenshot, SW/cache inventory, disk-cache inventory.
`report.json` records source fingerprints, min/median/max and all individual synchronous pipeline totals/deltas.
A measurable cache effect requires identical pipeline signatures, healthy samples, at least 3 pairs, every cold-minus-
warm synchronous pipeline delta >5 ms and median delta >10% of the cold median. Otherwise that check **fails**.
This is a conservative smoke criterion, not statistical compiler profiling. Async pipeline elapsed times include
JS scheduling and are recorded separately, never counted as isolated compile time. A timing difference alone does
not prove the Metal layer was cleared. Any hidden page, missing GPU hooks/visibility proxy, backend mismatch,
stopped game frames or console/page error is reported as unhealthy.

rAF records callback delivery. Optional `requestVideoFrameCallback` records presentation of a captured canvas video,
**not physical screen scan-out**, and adds workload. `boot:first` is the existing completed-GPU-frame mark;
`firstVisibleWaterProxy` is splash removal after that mark, not pixel recognition. Inspect the screenshot to confirm
water is in frame. Every post-proxy interval >50 ms remains in the report. LoAF names CPU scripts where available;
pipeline overlap is a candidate, not causal attribution. GPU/OS/display gaps remain explicitly unattributed.

Safari probe uses a dedicated WebDriver automation session, never AppleScript or an owner's existing window;
it never invokes `--enable`, changes preferences, navigates, or clears Safari caches. Even if available,
safaridriver exposes no test-exclusive Metal/disk-cache location here. A Safari cold benchmark remains unsupported.

## iPad URL and export

After this branch is deployed (it has **not** been shipped), open:

`https://boogle.club/?proto=place&water=new&startup=1&startupVideo=1`

Let the first 90 seconds play, then expand **Startup timeline** at bottom left and **Copy timeline** or **Save timeline**.
If clipboard permission fails, select/copy the displayed JSON. Change `water=new` to `water=old` for comparison.
Omit `startupVideo=1` for a lower-overhead callback-only diagnostic. This records an actual device visit; it cannot
clear Safari/iPad driver caches and does not label that visit cold. Device testing remains unverified.

The recorder reuses existing boot performance marks and exposes the same JSON schema to the harness and owner.
It intentionally exports a file/text, rather than squeeze raw per-frame arrays into the bounded playtest event
upload schema or modify the forbidden server code. Existing prototype playtest uploads continue normally unless
`notrack=1` is supplied. When `startup` is absent, only the URL flag check runs: no recorder download, hooks, observer,
DOM or capture stream. The opt-in dynamic import precedes `main.ts`, so it sees startup pipeline creation.
