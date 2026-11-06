# GLB delivery: compression works; tighten service worker caching

_2026-11-05. Initial production audit, following owner-approved recommendation 3 of `codex/threejs-tips-audit`, commit `40ed8921` (read with `git show`). Live GET inspection of boogle.club and one cold/repeat browser pair; source and deployed build both `736e6066a78c633b6e2a6f20110e6e07533794db`. **[V]** = observed response, inspected source or local reproduction; **[D]** = recommendation/inference; **[U]** = not verified. No production writes, gameplay changes, push or deployment._

**The deployed GLBs already receive gzip, valid MIME types, validators and effective repeat-load caching.** Seven emitted GLBs total **168,952 bytes over HTTP after compression versus 674,520 decoded bytes**, a **75.0% body-byte reduction**. A CDN or codec change is not supported by this evidence. The smallest useful fixes are in the existing service worker: exclude the unversioned asset-stage HTML, retain used lazy assets across build-cache purges, and attach background writes to the fetch event's lifetime.

## Approved fix follow-up

The owner approved recommendations 2 and 3 after the audit. This branch was rebased onto fetched `origin/main`
`4ca4e870`, then implemented both in `sw-policy.ts`/`sw-worker.ts`. The original production measurements below remain
historical; they are not evidence of this unpushed implementation being deployed.

- HTML paths and every navigation bypass the worker; cached HTML/XHTML fallbacks under asset URLs are ignored,
  and new HTML responses are not stored. Registration timing, Meshopt, gzip, hashed URLs and hosting are unchanged.
- Current-cache hits return without rewriting. Older hits are copied forward, with both promotion and network
  writes protected by `event.waitUntil()`. Storage errors remain nonfatal and the deleted-cache guard remains.
- The owner-requested regression tests execute the bundled worker and policy. They cover stale HTML/navigation,
  a delayed write that outlives response delivery, old-cache removal, no rewriting of current hits, storage failure
  and deletion, and a previously cached HTML fallback. The focused run passed 9 tests; `npm run check` passed all
  357 tests plus lint, typecheck, registry, level/asset checks and production build.

Final verification (5 November, local; no production writes):

| Check                       | Result                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run check`             | Passed; 357 tests, lint/typecheck, registry, level/asset checks and build                                   |
| `node dev/look/sw-check.ts` | 12/12 passed across A → B → C → off; then unsupported-SW context                                            |
| A repeat / B repeat         | 0 unchanged game-asset requests reached the server; 167 asset responses via SW                              |
| B page / stale HTML         | B-specific hashed fixture executed; seeded old `/assets/index.html` bypassed                                |
| Promotion / offline         | 33,508-byte model copied into B with 0 network requests; exact bytes read offline after A purge             |
| Full bot                    | Finished 29 game minutes in 4 min 49 s; 84 checkpoints; no expected-action failures or page/graphics errors |

Evidence: [browser assertions](../../.look/sw-check/report.json), [B screenshot](../../.look/sw-check/build-b.png),
[bot report](../../.look/playthrough/glb-delivery-sw/report.txt),
[bot still](../../.look/playthrough/glb-delivery-sw/end-still.png). These local artifacts are gitignored.
Inspected B's rendered island and enabled Jump in lobby with the splash removed, and the bot's rendered final
Buddy/platform view. The full bot command was `npm run playthrough -- --full --name glb-delivery-sw`; it uses the
local development server (SW disabled), so the separate production browser check establishes SW behavior.
The bot's generic report lists crystal/co-op marks as absent; neither was an expected-action failure in this solo run.
No remaining check failures. Safari/iPad and production rollout remain unverified; no real-time feel claim.

The final worker/checker edits were followed by a fresh `npm run check` and production browser run. The first
browser captures still showed the splash, so the checker now waits for both `interactive` and splash removal.
These fixes do not remove GitHub Pages' HTTP freshness window or make navigation work offline; offline reuse
applies to hashed asset fetches. Hosting/compression and registration timing remain unchanged.

## Original numbered recommendations [D]

1. **Keep the existing Meshopt + HTTP gzip path and hashed URLs.** Owner: asset build and [vite.config.ts](../../vite.config.ts), with the current Pages host providing HTTP compression. All seven deployed GLBs and all three WASM files were compressed; `model/gltf-binary` and `application/wasm` were correct. Preserve [asset-loader.ts](../../src/render/asset-loader.ts), the SIMD-only precache assertions and the [deployment retention step](../../.github/workflows/deploy.yml). Do not add a compression plugin merely because Vite prints gzip estimates: [`build.reportCompressedSize`](https://vite.dev/config/build-options#build-reportcompressedsize) reports sizes; it does not configure production HTTP responses. No owner call needed to retain the working setup.
2. **Exclude HTML and navigations from the immutable asset cache.** Owner: [sw-policy.ts](../../src/boot/sw-policy.ts) and the fetch listener in [sw-worker.ts](../../src/boot/sw-worker.ts). The current predicate accepts `/assets/index.html`; that exact deployed URL returns unversioned HTML with status 200. The normal `/assets/` route is excluded, but the explicit index path can be cached indefinitely and read from an older build. Reject HTML paths and navigation requests before CacheStorage lookup. This is the smallest correctness fix; no hosting or owner policy change is needed. Verify the explicit index path bypasses caching, the directory route still bypasses it, and hashed GLB/JS/WASM requests still reuse the cache. A stale page across real deployments was not reproduced.
3. **Fix lazy-hit promotion and cache-write lifetime together, in the existing worker.** Owner: [sw-worker.ts](../../src/boot/sw-worker.ts), `respond()` and its fetch listener; [loading plan, follow-up (3)](../plans/loading.md#a-service-worker-built). When a hit exists only in an older Boogle cache, clone it into the current cache without refetching. Keep both promotion and network-response `cache.put()` alive using `FetchEvent.waitUntil()`, catching storage failures and preserving the kill-switch/existing-cache guard. Do not delay returning the cached response or recreate deleted caches. This is a small client/build change, not hosting work. The older-hit loss is reproduced below; interrupted background writes are a source-level risk, not an observed failure. Validate with the existing [SW lifecycle harness](../../dev/look/sw-check.ts): lazy asset in A, use in B, activate C, then request again without network; exercise a failed write and kill switch. No new cache framework or blanket GLB precache.
4. **Update the loading evidence and its byte budgets at the next loading change.** Owner: [loading.md](../plans/loading.md), [asset-manifest.ts](../../src/render/asset-manifest.ts), [boot-time.ts](../../dev/look/boot-time.ts). Label local gzip estimates, actual encoded response bodies, decoded files and browser transfer counters separately. Keep page and worker network observations: `workerStart > 0 && transferSize === 0` proves interception, not CacheStorage reuse. The current plan's 600 KB gzip WASM budget predates the deployed **1,159,793-byte** SIMD response. Its registration inventory also omits Buddy/hero clips. Record those as outdated baselines, not a new approved budget. A changed performance target needs an owner call; correcting factual documentation does not.
5. **Treat longer HTTP freshness as optional hosting work, with an owner decision before changing hosts or DNS.** Every inspected response uses `Cache-Control: max-age=600`, including content-hashed assets. The ideal hosting policy would give genuinely hashed assets a long lifetime such as `public, max-age=31536000, immutable`, while HTML, `version.json`, `sw.js` and `assets-kept.json` remain revalidated/current. This primarily helps missing/disabled/evicted service workers and late first revisits; the measured immediate repeat already avoided asset body transfers. Owner: hosting/deployment, not Vite's development/preview headers. Retain [keep-old-assets.ts](../../scripts/keep-old-assets.ts) and the two-build cache policy. Do not migrate hosting or introduce a CDN just to obtain Brotli or this header; costs, rollback, origin policy and old-asset retention need a separate owner-approved task.

## What was measured [V]

Discovery began with [`https://boogle.club/`](https://boogle.club/) at **23:17 UTC**, its emitted script/preload URLs, [`assets-kept.json`](https://boogle.club/assets-kept.json) and [`sw.js`](https://boogle.club/sw.js). The index and worker name the same full commit above; a closing [`version.json`](https://boogle.club/version.json) GET also matched. Measurements are a dated snapshot, not a statement about later deployments.

The deployment inventory had **378 paths: 281 from the latest manifest timestamp and 97 retained older files**. The latest cohort contained 238 JS, 30 CSS, 7 GLB, 3 WASM, 1 HTML, 1 PNG and 1 JPG. There were **no emitted audio or KTX2 files** in this cohort. The three WASM files are SIMD Rapier, its plain fallback and the Basis transcoder. Only SIMD was requested during the natural page load.

There are three different manifests here:

- `assets-kept.json` is the deployed file inventory generated by [keep-old-assets.ts](../../scripts/keep-old-assets.ts); its timestamps distinguish current and retained files. It is not Vite's optional `.vite/manifest.json`.
- [src/render/asset-manifest.ts](../../src/render/asset-manifest.ts) is the runtime priority/placement registry, emitted here as `/assets/asset-manifest-BMZefMBq.js`. It does not publish a JSON inventory. `first` means the feature loads it; `soon` is fetched serially in idle time; `later` is on demand. `here()` currently supplies only `proto`, and prefetch is one-shot. Registrations found are Buddy, hero clips and the scaffold prototype; other model loaders use emitted URLs directly.
- [assets/built/manifest.json](../../assets/built/manifest.json) contains authoring/build facts. A checked-in built file is not proof of deployment: eight GLBs exist locally, but only seven occur in the current emitted inventory. This audit requested real emitted URLs, not guessed `/assets/built/*.glb` URLs.

### Response headers and body bytes

Sequential curl GETs used `--compressed` (this curl advertises gzip/deflate), without cache-busting query strings. `size_download` is the compressed HTTP **body** count; the saved decoded file supplies the decoded count. These omit HTTP headers, TLS and transport framing. Browser Chromium also negotiated gzip for the measured compressed assets; no Brotli response was observed. **Decoded GLB bytes still contain Meshopt-compressed buffers**, not expanded mesh/GPU memory. All seven GLBs declare `EXT_meshopt_compression`, six also declare `KHR_mesh_quantization`, and all contain zero images.

Every row returned **200**, `Server: GitHub.com`, **`Cache-Control: max-age=600`**, and `Access-Control-Allow-Origin: *`. Gzip responses also had `Vary: Accept-Encoding`. The common cache-control value applies to each exact URL below. ETags are response validators, not assumed content hashes. Image identity encoding is appropriate for these already compressed images.

| Exact URL (origin `https://boogle.club`) | Content-Encoding | ETag                  | Wire body bytes | Decoded bytes |
| ---------------------------------------- | ---------------- | --------------------- | --------------: | ------------: |
| `/assets/boiler-cart-UKzgcGA5.glb`       | gzip             | `W/"6aed0e49-82e4"`   |          14,546 |        33,508 |
| `/assets/buddy-lsaLg1Va.glb`             | gzip             | `W/"6aed0e49-103a8"`  |          43,041 |        66,472 |
| `/assets/conductor-cap-BprIvuIb.glb`     | gzip             | `W/"6aed0e49-2d80"`   |           3,978 |        11,648 |
| `/assets/hero-clips-DORcqj0y.glb`        | gzip             | `W/"6aed0e49-715b8"`  |          70,738 |       464,312 |
| `/assets/place-kit-DhcTTOfq.glb`         | gzip             | `W/"6aed0e49-fd20"`   |          26,884 |        64,800 |
| `/assets/recovery-rack-B7FJV3HO.glb`     | gzip             | `W/"6aed0e49-6178"`   |           6,913 |        24,952 |
| `/assets/scaffold-kit-CCTdHmgm.glb`      | gzip             | `W/"6aed0e49-227c"`   |           2,852 |         8,828 |
| `/assets/basis_transcoder-VXdx5NbI.wasm` | gzip             | `W/"6aed0e49-80be5"`  |         244,643 |       527,333 |
| `/assets/rapier_wasm3d_bg-C6GCbKVJ.wasm` | gzip             | `W/"6aed0e49-2f0777"` |       1,181,330 |     3,082,103 |
| `/assets/rapier_wasm3d_bg-Z_KLso_L.wasm` | gzip             | `W/"6aed0e49-323c44"` |       1,159,793 |     3,292,228 |
| `/`                                      | gzip             | `W/"6aed0e49-e35"`    |           1,285 |         3,637 |
| `/assets-kept.json`                      | gzip             | `W/"6aed0e49-35a8"`   |           4,514 |        13,736 |
| `/assets/asset-manifest-BMZefMBq.js`     | gzip             | `W/"6aed0e49-35b"`    |             500 |           859 |
| `/assets/island-4QamSkAI.png`            | identity         | `"6aed0e49-642b"`     |          25,643 |        25,643 |
| `/assets/main-7gWwgCbV.js`               | gzip             | `W/"6aed0e49-28397"`  |          65,720 |       164,759 |
| `/assets/main-BVRc3fF5.js`               | gzip             | `W/"6aed0e49-14c1"`   |           2,611 |         5,313 |
| `/assets/main-DdE11vie.css`              | gzip             | `W/"6aed0e49-79a9"`   |           7,281 |        31,145 |
| `/assets/rapier-CEhy7Qfl.js`             | gzip             | `W/"6aed0e49-4806f"`  |          52,231 |       295,023 |
| `/assets/rapier-CmvLCMA4.js`             | gzip             | `W/"6aed0e49-4806f"`  |          52,229 |       295,023 |
| `/assets/splash-art-CUf4wrPt.jpg`        | identity         | `"6aed0e49-178fc"`    |          96,508 |        96,508 |
| `/assets/three-D3sF5Gob.js`              | gzip             | `W/"6aed0e49-113f9b"` |         310,002 |     1,130,395 |
| `/sw.js`                                 | gzip             | `W/"6aed0e49-149e"`   |           2,461 |         5,278 |

Conditional GETs with the observed `If-None-Match` values for **Buddy and SIMD Rapier returned 304 with no body**. Validators work; long-lived `immutable` freshness is absent. That absence is a policy opportunity, not a cache failure. [HTTP caching semantics](https://httpwg.org/specs/rfc9111.html#field.cache-control) distinguish freshness from revalidation.

### Cold and repeat browser waterfall

One fresh, isolated Playwright Chromium **156.0.8078.4** context on this Mac, headless WebGPU/Metal launch flags, 960×600, no network throttling. URL **`https://boogle.club/`**, no prototype override. No HTTP routing/interception that disables the browser cache. WebSockets were closed locally before connecting; non-GET/HEAD fetch/XHR and beacons were blocked. All recorded HTTP methods were GET; no room was joined or mutated. Fonts were allowed as normal GETs. Five attempted game-server sockets were blocked locally. This is delivery inspection, not a playtest or a production load test.

The cold observation ran until the service worker controlled the page, then another 2.5 seconds. The same page was reloaded with HTTP cache and CacheStorage intact and observed for another 7 seconds after `load`. Page and service-worker CDP Network events were captured separately, alongside Resource Timing and cache keys. The worker is intentionally registered after `bootDone` and `bootInteractive`; because the audit did not join a room, the diagnostic 20-second timeout governed registration. Its first observed install fetch began at **20,546 ms**, after interactive at **16,474 ms**. The first repeat became interactive at **6,212 ms**. Those CPU/GPU-dependent times are **single observations with uncontrolled machine contention**, not a measured network speedup or a new loading budget.

| Observation                                                | Cold visit | Immediate repeat |
| ---------------------------------------------------------- | ---------: | ---------------: |
| Page CDP request records, including document/fonts/version |        170 |              170 |
| `/assets/` page request records                            |        165 |              165 |
| Completed `/assets/` responses with CDP size accounting    |        164 |              164 |
| Page CDP transferred bytes, all completed responses        |  2,348,582 |              548 |
| Of those, `/assets/` transferred bytes                     |  2,314,140 |                0 |
| Worker-originated fetch records                            |        119 |               46 |
| Worker-originated transferred bytes                        |          0 |                0 |
| Completed page responses directly from CacheStorage        |          0 |              118 |
| Completed page responses forwarded by SW to HTTP cache     |          0 |               46 |
| Entries in current build CacheStorage after observation    |        119 |              165 |
| GLBs in CacheStorage after observation                     |          0 |                4 |

CDP `loadingFinished.encodedDataLength` is the browser's transferred-byte counter, **not** the curl body-only count or an on-the-wire packet capture; see the [Network protocol](https://chromedevtools.github.io/devtools-protocol/tot/Network/). The repeat's 548 bytes belonged to HTML/version, not assets. The separate clock-worker script target lacks a completed page-CDP size event: Resource Timing says CacheStorage/zero transfer on repeat but reports a negative duration, so its wire count and interval are **unverified** and excluded from CDP totals. Do not turn the totals into a claim of complete socket-level byte accounting.

The 119 install fetches were **HTTP disk-cache hits**, so installing the worker did not redownload that bundle. The emitted `first` list contains 119 paths including SIMD WASM and no GLBs, plain Rapier WASM or Basis WASM. On the first repeat, 46 lazy/non-precache files, including the four naturally used GLBs, went through the worker to the still-fresh HTTP cache and were then written into CacheStorage. “From service worker” is not necessarily “from CacheStorage”: [Resource Timing](https://www.w3.org/TR/resource-timing/) explicitly warns that forwarded worker resources do not expose the whole network story.

Selected waterfall below: start → completion in milliseconds after each navigation's CDP document request; `C` = CacheStorage, `H` = SW-forwarded HTTP cache. Cache completion includes browser delivery/scheduling, not merely disk-read time. The full per-request waterfall is in the appendix.

| Emitted path                             | Cold interval | Repeat interval | Repeat source |
| ---------------------------------------- | ------------: | --------------: | ------------- |
| `/`                                      |       0 → 183 |          0 → 40 | N             |
| `/assets/buddy-lsaLg1Va.glb`             |     186 → 355 |        46 → 149 | H             |
| `/assets/hero-clips-DORcqj0y.glb`        |     186 → 347 |        47 → 235 | H             |
| `/assets/main-BVRc3fF5.js`               |     186 → 348 |         47 → 93 | C             |
| `/assets/main-7gWwgCbV.js`               |     360 → 480 |       148 → 229 | C             |
| `/assets/three-D3sF5Gob.js`              |     362 → 659 |       149 → 235 | C             |
| `/assets/splash-art-CUf4wrPt.jpg`        |     365 → 681 |       153 → 237 | C             |
| `/assets/rapier_wasm3d_bg-Z_KLso_L.wasm` |   2565 → 3033 |     2205 → 2808 | C             |
| `/assets/boiler-cart-UKzgcGA5.glb`       |   2674 → 2804 |     2344 → 2433 | H             |
| `/assets/place-kit-DhcTTOfq.glb`         |   3337 → 3430 |     3229 → 3234 | H             |

The preload GLBs finish well before their later model-use marks, so a new preload is not the first fix. The largest body is **SIMD WASM (1.160 MB)**, followed by **three core (310 KB)**; the four GLBs naturally requested total **155,209 encoded body bytes**. The splash JPEG is **96,508 bytes**, uncompressed at the HTTP layer. Rapier's request begins later than the eager JS downloads; that initiation ordering is observed, but changing loader/initialization order would be a separate measured task. No evidence here justifies replacing Meshopt or preloading every model.

### All-model repeat probe

After the natural repeat, seven sequential GETs used the exact current-manifest GLB URLs, then the same seven were fetched again. This is a bounded read-only probe, separate from the natural load. Four models were already cached; conductor cap, recovery rack and scaffold kit required their first browser network downloads (**13,743 body bytes**, **14,383 CDP transferred bytes**). The next pass returned **7/7 from CacheStorage, no worker network fetches and zero CDP transferred bytes**. Thus model caching works after a controlled fetch; it does not depend on adding models to the eager precache list.

## What is right, and what is missing

### Already right [V]

- **Compression at both layers.** Meshopt's [own gltfpack documentation](https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md#readme) recommends general-purpose compression on top of its codec; production actually supplies it. `Content-Encoding: gzip` is transport compression, while GLB extensions describe mesh/animation encoding. They solve different parts of delivery.
- **Correct MIME types and fallback separation.** All WASM GETs use `application/wasm`; [vite.config.ts](../../vite.config.ts) requires game/SIMD closure in `first` and rejects eager plain WASM. The observed first load fetched only the SIMD binary. Neither the plain fallback nor the texture transcoder burdens this load.
- **Stable content addressing and deploy overlap.** Build ID lives in HTML/version/worker config rather than every chunk. [deploy.yml](../../.github/workflows/deploy.yml) uploads static `dist`; [keep-old-assets.ts](../../scripts/keep-old-assets.ts) retains recently removed assets for 30 minutes. The observed inventory contains retained files. Historical cross-deploy recovery remains separate from this same-build measurement.
- **Caching is optional and narrowly scoped.** [sw-policy.ts](../../src/boot/sw-policy.ts) handles same-scope GETs under `assets/`; other resources use ordinary network/HTTP cache behavior. Install/lookup/write errors are caught, two build caches are retained, `ignoreVary` is restricted by the immutable-URL assumption, and build/query kill switches exist. The root page is not served cache-first; the explicit asset-stage index is an exception described below. [sw.ts](../../src/boot/sw.ts) uses `updateViaCache: 'none'` and postpones registration until the loading screen has finished.

### Small correctness gap: an unversioned HTML page passes the cache predicate [V]

The inventory's HTML entry is `index.html`, meaning `/assets/index.html`. A direct GET at **23:25:43 UTC** returned **200**, `Content-Type: text/html; charset=utf-8`, `Content-Encoding: gzip`, `Cache-Control: max-age=600`, ETag `W/"6aed0e49-212"`, **336 compressed body bytes / 530 decoded bytes**. The page's build meta matches the audited commit.

`cacheable('GET', 'https://boogle.club/assets/index.html', 'https://boogle.club/')` evaluates to **true**; the directory URL `/assets/` evaluates to **false**. The worker checks only the path prefix and trailing slash, not a hash, extension or navigation mode. Its network-success branch accepts basic 200 responses, so the explicit index is eligible for cache-first retention. The assumption that every path under `assets/` is immutable is false in this multi-page build. This is a verified policy mismatch and stale-page risk; no stale production navigation is claimed. Keep the existing Vite entry layout and fix the predicate/listener in recommendation 2 rather than renaming the whole asset directory.

### Small client gap: old lazy hits do not survive the next purge [V]

`respond()` immediately returns any `caches.match(req, MATCH)` hit; only a network miss gets written to the current cache. Install copies unchanged **precache** files, but GLBs and other lazy files are not in that list. This is exactly the loading plan's existing unchecked follow-up (3).

A **network-free Node VM reproduction using the fetched production `sw.js`** seeded `boogle-old` with the exact conductor-cap URL, created the current build cache, and dispatched a fetch. It returned the old bytes with **0 fetches**, but the current cache still lacked the model. Activating a simulated next-build worker kept current/next and deleted old; the unchanged model was then absent from every cache. This proves the retention gap in the deployed algorithm. It is not a live three-deployment browser test, and a later HTTP-cache hit could still avoid an actual download.

The network-miss write chain is also neither awaited by `respond()` nor passed to `e.waitUntil()`. A worker may terminate when no event remains; [`waitUntil()`](https://www.w3.org/TR/service-workers/#event-waituntil) extends that lifetime. The observed writes succeeded, so this is **[D] a reliability hardening opportunity**, not a claim of lost writes in this browser. Address both paths with one small cache-write helper in recommendation 3.

### Hosting policy and first-revisit limits [V/D]

The ten-minute HTTP lifetime works for an immediate revisit. Models fetched before first worker activation are absent from CacheStorage after that first visit, so a first revisit after HTTP expiry may need validation before they enter the worker cache. ETags prevent an unchanged body download when validation succeeds, but do not eliminate the round trip. This audit did not wait ten minutes or simulate cache eviction. The existing after-interactive/need-based loading policy should stay; moving registration earlier or precaching all models risks competing with startup.

The production owner is GitHub Pages, as both response headers and [deployment workflow](../../.github/workflows/deploy.yml) show. A Vite `server.headers` or `preview.headers` edit would affect local servers, not these responses. A `.gz`/`.br` file alone is not a hosting configuration. Header policy belongs at the serving layer; determine that layer's supported controls before proposing a migration. The current host already compresses the relevant types, so there is no urgent hosting defect to fix.

### Engine comparison and fit [V/D]

[Unity's Web deployment guide](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/building-distribution/deploying) distinguishes build compression from matching server `Content-Encoding`, and requires `application/wasm` for streaming. [Godot's web export guide](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html#serving-the-files) recommends HTTP compression and explicitly lists GitHub Pages as providing gzip. Boogle meets the transport part of both precedents without adding a JavaScript decompression fallback.

[Unreal cooking/chunking](https://dev.epicgames.com/documentation/en-us/unreal-engine/cooking-content-and-creating-chunks-in-unreal-engine) groups assets into independently distributed packages. Boogle already has much smaller independently hashed web files plus first/soon/later selection; introducing package archives would add invalidation and scheduling machinery without a measured need. Borrow selective delivery and explicit ownership, not another content system. Browser HTTP cache, CacheStorage and GPU residency remain different budgets; this report establishes only delivery/cache behavior.

## Reproduction, limits and validation

For a current snapshot, GET the index, `assets-kept.json` and `sw.js`; record the HTML/worker build IDs before choosing URLs. Use `curl --compressed --dump-header <headers> --output <decoded-file> --write-out '%{size_download}' <exact-url>`; compare that count to the decoded file length. Revalidate selected URLs using `If-None-Match`. Never substitute source filenames or local gzip estimates. A new browser pair needs empty browser storage on the first visit, preserved storage on repeat, normal cache enabled, GET/HEAD-only traffic and blocked game-server sockets. Capture page **and worker** network events, cache keys, build IDs, navigation-relative timing and body/transfer definitions; separate synthetic model fetches from the natural page waterfall.

Raw scratch capture: `/tmp/boogle-delivery-audit/` (`headers.json`, `browser.json`, `conditional.json`, `sw-probe.json` and the probe scripts). The durable header inventory and complete page-request waterfall are reproduced in this report; scratch files are not repository dependencies. Private socket query parameters are deliberately not reproduced. The first two browser launch attempts failed before navigation (sandbox launch, then CDP auto-attach setup); the recorded cold/repeat pair is the subsequent successful run. No other browser sessions were closed.

**Unverified:** slow/mobile networks, Safari/iPad (not tested on a device), ten-minute expiry, browser storage eviction/private mode, live multi-deploy recovery, offline navigation, clock-worker target wire bytes, packet-level traffic and any performance improvement from the proposed fix. Brotli absence here is not proof it is unavailable everywhere. Source guards are inspected, not a fresh browser kill-switch/storage-failure test. No frame-rate or visual-quality claim; no codec, renderer, game copy, DNS or hosting changes.

Validation: documentation-only diff; targeted Prettier with the repository's Markdown ignore overridden, targeted lint, local-link/table arithmetic checks and diff review. No new tests or full game build are needed for a research-only commit. Serves **Designed for drop-in, drop-out** and **Small and readable**. Commit only, no push.

## Appendix: complete page-request waterfall

All request paths below resolve against `https://boogle.club/` unless a full URL is shown. Rows retain the cold request order; both visits requested the same set. Columns show start → finish in ms and CDP transferred bytes. `N` = network, `C` = CacheStorage, `H` = service-worker-forwarded HTTP cache, `D` = direct browser cache, `?` = incomplete dedicated-worker observation. Every completed response was exposed as status 200 to the page; this is not a claim that HTTP validation never occurred. Page transfer rows exclude the separately counted worker fetches (all zero bytes during this pair). `—` is unknown, not zero.

<details>
<summary>Expand all 170 page-request records for each navigation</summary>

| URL / path                                                                                             |     Cold ms | Cold bytes |   Repeat ms | Repeat bytes | Repeat source |
| ------------------------------------------------------------------------------------------------------ | ----------: | ---------: | ----------: | -----------: | ------------- |
| `/`                                                                                                    |     0 → 183 |      1,690 |      0 → 40 |          152 | N             |
| `/assets/buddy-lsaLg1Va.glb`                                                                           |   186 → 355 |     43,219 |    46 → 149 |            0 | H             |
| `/assets/hero-clips-DORcqj0y.glb`                                                                      |   186 → 347 |     70,931 |    47 → 235 |            0 | H             |
| `https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700;800&family=Lilita+One&display=swap` |   186 → 355 |        972 |     47 → 63 |            0 | D             |
| `/assets/main-BVRc3fF5.js`                                                                             |   186 → 348 |      2,754 |     47 → 93 |            0 | C             |
| `/assets/modulepreload-polyfill-P2Xu9kJm.js`                                                           |   186 → 302 |        559 |     47 → 93 |            0 | C             |
| `/assets/build-id-CwpeGEVZ.js`                                                                         |   186 → 355 |        291 |     47 → 93 |            0 | C             |
| `/assets/mark-CFpsfdYW.js`                                                                             |   186 → 347 |        446 |     47 → 93 |            0 | C             |
| `/assets/startup-frames-BgQ4dH79.js`                                                                   |   186 → 321 |        836 |     47 → 93 |            0 | C             |
| `/assets/timeline-D8T3xdMo.js`                                                                         |   186 → 348 |      2,166 |     47 → 93 |            0 | C             |
| `/assets/splash-art-D6cO98ar.js`                                                                       |   186 → 310 |        192 |     47 → 93 |            0 | C             |
| `/assets/splash-CPdtpEbO.js`                                                                           |   187 → 348 |      1,458 |     47 → 93 |            0 | C             |
| `/assets/asset-fetch-B0Xa2m8r.js`                                                                      |   187 → 348 |        808 |     47 → 93 |            0 | C             |
| `/assets/failure-DtfPSVnS.js`                                                                          |   187 → 348 |      1,052 |     47 → 93 |            0 | C             |
| `/assets/preload-helper-BLdHbfdN.js`                                                                   |   187 → 302 |        940 |     47 → 93 |            0 | C             |
| `/assets/splash-BASOTgLM.css`                                                                          |   187 → 358 |      1,236 |     47 → 93 |            0 | C             |
| `/assets/failure-D7qwfluR.css`                                                                         |   187 → 318 |        563 |     47 → 93 |            0 | C             |
| `/assets/main-7gWwgCbV.js`                                                                             |   360 → 480 |     65,928 |   148 → 229 |            0 | C             |
| `/assets/quality-BA8r_hrx.js`                                                                          |   360 → 477 |      1,259 |   148 → 235 |            0 | C             |
| `/assets/graphics-settings-fln9oFMc.js`                                                                |   361 → 476 |      1,909 |   148 → 235 |            0 | C             |
| `/assets/dev-preferences-RQDMBnU5.js`                                                                  |   361 → 585 |        818 |   148 → 235 |            0 | C             |
| `/assets/loop-CdtFo5y3.js`                                                                             |   361 → 566 |        966 |   148 → 235 |            0 | C             |
| `/assets/constants-C-DXbsiV.js`                                                                        |   361 → 661 |        511 |   148 → 235 |            0 | C             |
| `/assets/game-world-b0kK6NbW.js`                                                                       |   361 → 472 |      8,672 |   148 → 235 |            0 | C             |
| `/assets/rolldown-runtime-DK3Fl9T5.js`                                                                 |   361 → 511 |        517 |   148 → 235 |            0 | C             |
| `/assets/sync-BirtLt2u.js`                                                                             |   361 → 480 |      6,575 |   148 → 235 |            0 | C             |
| `/assets/hash-uampG0A6.js`                                                                             |   361 → 605 |        330 |   148 → 235 |            0 | C             |
| `/assets/gift-catalog-CzMiAm1s.js`                                                                     |   361 → 466 |        506 |   148 → 235 |            0 | C             |
| `/assets/stacks-MaHoUgOq.js`                                                                           |   361 → 494 |        800 |   148 → 235 |            0 | C             |
| `/assets/route--bZhGS1G.js`                                                                            |   361 → 612 |        374 |   148 → 235 |            0 | C             |
| `/assets/net-D1G8Qg7C.js`                                                                              |   361 → 466 |      8,232 |   149 → 235 |            0 | C             |
| `/assets/async-CkIh8y1D.js`                                                                            |   361 → 662 |        456 |   149 → 235 |            0 | C             |
| `/assets/flags-C4OqJW28.js`                                                                            |   362 → 530 |        813 |   149 → 235 |            0 | C             |
| `/assets/rng-BsERB_me.js`                                                                              |   362 → 585 |        300 |   149 → 235 |            0 | C             |
| `/assets/lights-j8PzGq8q.js`                                                                           |   362 → 572 |      3,277 |   149 → 235 |            0 | C             |
| `/assets/three-D3sF5Gob.js`                                                                            |   362 → 659 |    310,337 |   149 → 235 |            0 | C             |
| `/assets/math-pure-IZwqsMQ0.js`                                                                        |   362 → 660 |        518 |   149 → 235 |            0 | C             |
| `/assets/scene-Bw91m9Il.js`                                                                            |   362 → 660 |      2,894 |   149 → 235 |            0 | C             |
| `/assets/engine-BbCAk2G3.js`                                                                           |   362 → 583 |      5,296 |   149 → 235 |            0 | C             |
| `/assets/heights-Cqngfv8a.js`                                                                          |   362 → 613 |      5,199 |   149 → 235 |            0 | C             |
| `/assets/shape-1AWVNk2W.js`                                                                            |   362 → 626 |      1,032 |   149 → 235 |            0 | C             |
| `/assets/state-2JzWVe2I.js`                                                                            |   362 → 483 |        672 |   149 → 235 |            0 | C             |
| `/assets/physics-DlYxaVFc.js`                                                                          |   362 → 571 |        873 |   149 → 235 |            0 | C             |
| `/assets/water-field-DMXhEWuz.js`                                                                      |   362 → 659 |        751 |   149 → 235 |            0 | C             |
| `/assets/entity-D-v0pm4-.js`                                                                           |   362 → 572 |      1,623 |   149 → 235 |            0 | C             |
| `/assets/receivers-ETOqO8RV.js`                                                                        |   362 → 571 |     11,090 |   149 → 235 |            0 | C             |
| `/assets/draw-count-Y1mLZyjo.js`                                                                       |   362 → 489 |        637 |   149 → 235 |            0 | C             |
| `/assets/tsl-D-jo48O5.js`                                                                              |   362 → 570 |        418 |   149 → 235 |            0 | C             |
| `/assets/flags-D6qFUD8X.js`                                                                            |   362 → 523 |        357 |   149 → 235 |            0 | C             |
| `/assets/material-patch-DNxNRBZq.js`                                                                   |   362 → 543 |        444 |   149 → 235 |            0 | C             |
| `/assets/live-BhhGB3TG.js`                                                                             |   362 → 663 |        703 |   149 → 235 |            0 | C             |
| `/assets/sky-cp1IiQ2G.js`                                                                              |   362 → 706 |      3,958 |   149 → 235 |            0 | C             |
| `/assets/props-U_5otwA6.js`                                                                            |   362 → 478 |      1,882 |   150 → 235 |            0 | C             |
| `/assets/props-RvQgCBow.js`                                                                            |   362 → 511 |      1,552 |   150 → 235 |            0 | C             |
| `/assets/state-B_f2fF5V.js`                                                                            |   362 → 605 |        802 |   150 → 235 |            0 | C             |
| `/assets/contacts-C9IKZhkH.js`                                                                         |   362 → 625 |        866 |   150 → 235 |            0 | C             |
| `/assets/shore-options-QKCYyFFk.js`                                                                    |   362 → 614 |        416 |   150 → 235 |            0 | C             |
| `/assets/prop-models-xUR-P6Qy.js`                                                                      |   362 → 665 |      1,256 |   150 → 235 |            0 | C             |
| `/assets/sky-clock-DNsFR1In.js`                                                                        |   362 → 661 |        645 |   150 → 235 |            0 | C             |
| `/assets/terrain-DWWIsd0R.js`                                                                          |   362 → 673 |      2,616 |   150 → 235 |            0 | C             |
| `/assets/player-Dh0RdOpa.js`                                                                           |   362 → 592 |        218 |   150 → 235 |            0 | C             |
| `/assets/state-D0ilqSmw.js`                                                                            |   363 → 605 |      3,195 |   150 → 235 |            0 | C             |
| `/assets/input-state-FlGSmVzQ.js`                                                                      |   363 → 495 |        380 |   150 → 235 |            0 | C             |
| `/assets/arrival-D0p7aBCk.js`                                                                          |   363 → 549 |      3,360 |   150 → 235 |            0 | C             |
| `/assets/dev-input-Bm_0XelH.js`                                                                        |   363 → 536 |        247 |   150 → 235 |            0 | C             |
| `/assets/input-DJ1_3qG2.js`                                                                            |   363 → 586 |      2,846 |   150 → 236 |            0 | C             |
| `/assets/dom-BxPGxLV_.js`                                                                              |   363 → 513 |        365 |   150 → 236 |            0 | C             |
| `/assets/hands-B9NMmZFV.js`                                                                            |   363 → 566 |     11,725 |   150 → 236 |            0 | C             |
| `/assets/item-models-CwXfwA7V.js`                                                                      |   363 → 586 |        790 |   150 → 236 |            0 | C             |
| `/assets/shared-time-BCT5kUJ6.js`                                                                      |   363 → 706 |        353 |   150 → 236 |            0 | C             |
| `/assets/water-render-BH4DkNlq.js`                                                                     |   363 → 735 |     26,439 |   150 → 236 |            0 | C             |
| `/assets/particles-BmEijiYT.js`                                                                        |   363 → 479 |      1,506 |   150 → 236 |            0 | C             |
| `/assets/precompile-CCEGgvx_.js`                                                                       |   363 → 606 |      1,898 |   150 → 236 |            0 | C             |
| `/assets/sky-core-VwVcvLpv.js`                                                                         |   363 → 585 |      4,081 |   151 → 236 |            0 | C             |
| `/assets/tone-DvgfjJbM.js`                                                                             |   363 → 592 |      1,618 |   151 → 236 |            0 | C             |
| `/assets/exposure-D5nSRFSF.js`                                                                         |   363 → 524 |        613 |   151 → 236 |            0 | C             |
| `/assets/BufferGeometryUtils-DtYF8YTw.js`                                                              |   363 → 665 |      2,076 |   151 → 236 |            0 | C             |
| `/assets/controls-D8awPepA.js`                                                                         |   363 → 570 |      2,272 |   151 → 236 |            0 | C             |
| `/assets/input-BfYuxhlA.css`                                                                           |   363 → 578 |        462 |   151 → 236 |            0 | C             |
| `/assets/modal-CMx_Buvk.js`                                                                            |   363 → 584 |        690 |   151 → 236 |            0 | C             |
| `/assets/glyphs-DK4HV9YQ.js`                                                                           |   363 → 536 |      1,507 |   151 → 236 |            0 | C             |
| `/assets/glyphs-Ci6DPHcm.css`                                                                          |   364 → 510 |        803 |   151 → 236 |            0 | C             |
| `/assets/arrival-8TkywHQb.css`                                                                         |   364 → 529 |        586 |   151 → 236 |            0 | C             |
| `/assets/npc-voice-DFIpNWuL.js`                                                                        |   364 → 591 |      2,494 |   151 → 236 |            0 | C             |
| `/assets/audio-BKYK7FuU.js`                                                                            |   364 → 664 |        995 |   151 → 236 |            0 | C             |
| `/assets/noise-CPE7lStG.js`                                                                            |   364 → 565 |        587 |   151 → 236 |            0 | C             |
| `/assets/memory-DNddKdeN.js`                                                                           |   364 → 489 |      1,277 |   151 → 236 |            0 | C             |
| `/assets/state-zHF10PGb.js`                                                                            |   364 → 512 |      4,480 |   151 → 236 |            0 | C             |
| `/assets/asset-manifest-BMZefMBq.js`                                                                   |   364 → 565 |        861 |   151 → 236 |            0 | C             |
| `/assets/avatars-Bx-7SGJJ.js`                                                                          |   364 → 585 |      1,666 |   151 → 236 |            0 | C             |
| `/assets/readable-unlit-1CxODUMP.js`                                                                   |   364 → 583 |        389 |   151 → 236 |            0 | C             |
| `/assets/hero-clips-CB2Ql2y8.js`                                                                       |   364 → 592 |        457 |   151 → 236 |            0 | C             |
| `/assets/arrival-DLxuVlos.js`                                                                          |   364 → 480 |        241 |   152 → 236 |            0 | C             |
| `/assets/motion-CrGdKhrX.js`                                                                           |   364 → 592 |        619 |   152 → 236 |            0 | C             |
| `/assets/feel-tuning-CVo11eCf.js`                                                                      |   364 → 664 |        919 |   152 → 236 |            0 | C             |
| `/assets/haul-stack-KJTT0nky.js`                                                                       |   364 → 523 |      4,242 |   152 → 236 |            0 | C             |
| `/assets/ui-sound-CGl6Ti-3.js`                                                                         |   364 → 536 |      1,345 |   152 → 236 |            0 | C             |
| `/assets/clink-De0MEVHj.js`                                                                            |   364 → 584 |        914 |   152 → 236 |            0 | C             |
| `/assets/ui-sound-CbSmJVW8.css`                                                                        |   364 → 664 |        737 |   152 → 236 |            0 | C             |
| `/assets/haul-pieces-CC0dQRsw.js`                                                                      |   364 → 707 |        846 |   152 → 236 |            0 | C             |
| `/assets/haul-bundle-CwdhJD6d.js`                                                                      |   364 → 716 |      1,502 |   152 → 237 |            0 | C             |
| `/assets/haul-feel-DdGJ_YrO.js`                                                                        |   364 → 680 |        236 |   152 → 237 |            0 | C             |
| `/assets/pause-pages-Bujypfh2.js`                                                                      |   364 → 584 |        711 |   152 → 237 |            0 | C             |
| `/assets/haul-stack-e7ISxKYz.css`                                                                      |   364 → 558 |      1,227 |   152 → 237 |            0 | C             |
| `/assets/notify-VNJgDyuA.js`                                                                           |   365 → 661 |      1,013 |   152 → 237 |            0 | C             |
| `/assets/notify-BhBMGXJX.css`                                                                          |   365 → 663 |      1,000 |   152 → 237 |            0 | C             |
| `/assets/hut-blueprint-mBScM55y.js`                                                                    |   365 → 662 |        936 |   152 → 237 |            0 | C             |
| `/assets/materials-CntzYYmu.js`                                                                        |   365 → 566 |        975 |   152 → 237 |            0 | C             |
| `/assets/haul-variant-BzAoQgDx.js`                                                                     |   365 → 665 |        599 |   152 → 237 |            0 | C             |
| `/assets/model-D5mVCqLI.js`                                                                            |   365 → 662 |        967 |   152 → 237 |            0 | C             |
| `/assets/motion-DCv308K5.js`                                                                           |   365 → 598 |        555 |   152 → 237 |            0 | C             |
| `/assets/builds-DE6lygJb.js`                                                                           |   365 → 667 |        425 |   152 → 237 |            0 | C             |
| `/assets/report-format-tFUh6CyN.js`                                                                    |   365 → 572 |        585 |   152 → 237 |            0 | C             |
| `/assets/machine-sfx-DTQLj-Z3.js`                                                                      |   365 → 638 |      1,309 |   152 → 237 |            0 | C             |
| `/assets/camera-arm-Cwv6gC2N.js`                                                                       |   365 → 711 |        773 |   152 → 237 |            0 | C             |
| `/assets/view-CJhZ96Nn.js`                                                                             |   365 → 627 |        400 |   152 → 237 |            0 | C             |
| `/assets/inspect-D2yF_A9M.js`                                                                          |   365 → 664 |        794 |   152 → 237 |            0 | C             |
| `/assets/main-DdE11vie.css`                                                                            |   365 → 722 |      7,651 |   152 → 237 |            0 | C             |
| `/assets/splash-art-CUf4wrPt.jpg`                                                                      |   365 → 681 |     96,704 |   153 → 237 |            0 | C             |
| `https://fonts.gstatic.com/s/lilitaone/v17/i7dPIFZ9Zz-WBtRtedDbYEF8RXi4EwQ.woff2`                      |   371 → 493 |     10,794 |   153 → 177 |            0 | D             |
| `https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DaRvzig.woff2`                             |   371 → 483 |     20,726 |   153 → 178 |            0 | D             |
| `/assets/rapier-CmvLCMA4.js`                                                                           |   754 → 892 |     52,416 |   296 → 302 |            0 | C             |
| `/assets/__vite-plugin-wasm-helper-DWhWxIjF.js`                                                        |   754 → 855 |        615 |   296 → 304 |            0 | C             |
| `/assets/record-DFF_pTw7.js`                                                                           |   859 → 954 |      4,674 |   388 → 396 |            0 | H             |
| `/assets/card-DdhUKQB3.js`                                                                             |   863 → 961 |        330 |   389 → 396 |            0 | H             |
| `/assets/store-DxDdpI1s.js`                                                                            |   863 → 969 |      7,681 |   389 → 397 |            0 | H             |
| `/assets/events-DpbczI2O.js`                                                                           |   863 → 994 |        450 |   389 → 404 |            0 | H             |
| `/assets/place-BrPTDfVh.js`                                                                            |  863 → 1021 |     20,137 |   389 → 405 |            0 | H             |
| `/assets/chop-QZHA-7DC.js`                                                                             |  863 → 1066 |     22,809 |   389 → 406 |            0 | H             |
| `/assets/common-Nh6rT-P2.js`                                                                           |   863 → 995 |      2,380 |   390 → 412 |            0 | H             |
| `/assets/flat-sOdz0oQ-.js`                                                                             |  863 → 1037 |        483 |   390 → 429 |            0 | H             |
| `/assets/look-BiAMREUZ.js`                                                                             |   863 → 992 |      2,990 |   390 → 435 |            0 | H             |
| `/assets/layout-oOTP-ED7.js`                                                                           |   863 → 982 |      3,443 |   390 → 435 |            0 | H             |
| `/assets/chop-timing-BaIBhfWh.js`                                                                      |   863 → 995 |        342 |   390 → 435 |            0 | H             |
| `/assets/terrain-CN_1GlvR.js`                                                                          |  863 → 1017 |      2,999 |   390 → 435 |            0 | H             |
| `/assets/tech-layout-D1pHVgTL.js`                                                                      |   864 → 993 |      3,158 |   390 → 435 |            0 | H             |
| `/assets/town-fx-TDoxsNQn.js`                                                                          |   864 → 961 |      1,462 |   390 → 440 |            0 | H             |
| `/assets/box-plan-CURsKY-C.js`                                                                         |   864 → 981 |      1,037 |   390 → 442 |            0 | H             |
| `/assets/axe-models-BUOFvhs3.js`                                                                       |   864 → 993 |      4,119 |   390 → 442 |            0 | H             |
| `/assets/meshopt_decoder.module-CrG7M9Wm.js`                                                           |   864 → 973 |     20,794 |   391 → 461 |            0 | H             |
| `/assets/part-geometry-BXB3OxZr.js`                                                                    |  864 → 1021 |        850 |   391 → 443 |            0 | H             |
| `/assets/look-Dkz2aR2V.js`                                                                             |  864 → 1017 |      1,890 |   391 → 444 |            0 | H             |
| `/assets/building-plans-DKPHc9Yg.js`                                                                   |  864 → 1061 |      2,178 |   391 → 444 |            0 | H             |
| `/assets/chop-motion-DK9PdFRz.js`                                                                      |   864 → 972 |      1,927 |   391 → 445 |            0 | H             |
| `/assets/sky-AMVIoal7.js`                                                                              |   864 → 998 |        738 |   391 → 446 |            0 | H             |
| `/assets/crates-DC-l2F3D.js`                                                                           |  864 → 1078 |      2,143 |   391 → 446 |            0 | H             |
| `/assets/count-U2czpTT0.js`                                                                            |   864 → 972 |        568 |   392 → 446 |            0 | H             |
| `/assets/panel-vKnNlVOj.js`                                                                            |   864 → 982 |     23,554 |   392 → 446 |            0 | H             |
| `/assets/coop-CAViG3U4.js`                                                                             |   864 → 995 |     43,971 |   392 → 461 |            0 | H             |
| `/assets/seat-DuKns3dZ.js`                                                                             |  864 → 1037 |      2,309 |   392 → 450 |            0 | H             |
| `/assets/run-CCF2dYvl.js`                                                                              |  864 → 1017 |     13,628 |   392 → 453 |            0 | H             |
| `/assets/pair-C2cWcWLr.js`                                                                             |  864 → 1003 |      3,345 |   392 → 459 |            0 | H             |
| `/assets/moves-D6w12hhK.js`                                                                            |  864 → 1079 |      3,481 |   392 → 459 |            0 | H             |
| `/assets/place-Cxd4d_hc.css`                                                                           |  864 → 1066 |      1,932 |   392 → 461 |            0 | H             |
| `/assets/session-CT7iZxjH.js`                                                                          |  864 → 1047 |      1,544 |   393 → 461 |            0 | H             |
| `/assets/talk-sPgM5G_z.js`                                                                             | 1437 → 1539 |     12,472 | 1021 → 1024 |            0 | H             |
| `/assets/camera-BDT_EZZ0.js`                                                                           | 1437 → 1539 |        745 | 1021 → 1026 |            0 | H             |
| `/assets/body-Ad2yAi83.js`                                                                             | 1437 → 1543 |        212 | 1021 → 1028 |            0 | H             |
| `/assets/body-BMe59hqv.js`                                                                             | 1437 → 1550 |        783 | 1021 → 1029 |            0 | H             |
| `/assets/assets-CXnUFVP5.js`                                                                           | 1438 → 1551 |        767 | 1022 → 1029 |            0 | H             |
| `/assets/asset-loader-Z5GW4PUg.js`                                                                     | 1438 → 1550 |     25,361 | 1022 → 1029 |            0 | H             |
| `/assets/retarget-vnO1pjAm.js`                                                                         | 1438 → 1542 |      4,683 | 1022 → 1029 |            0 | H             |
| `/assets/caves-DoSw1Lgs.js`                                                                            | 2528 → 2638 |     12,753 | 2169 → 2213 |            0 | H             |
| `/version.json`                                                                                        | 2528 → 2631 |        260 | 2170 → 2237 |          396 | N             |
| `/assets/clock-worker-DlVjzWKR.js`                                                                     |           — |          — |           — |            — | ?             |
| `/assets/rapier_wasm3d_bg-Z_KLso_L.wasm`                                                               | 2565 → 3033 |  1,160,597 | 2205 → 2808 |            0 | C             |
| `/assets/boiler-cart-UKzgcGA5.glb`                                                                     | 2674 → 2804 |     14,752 | 2344 → 2433 |            0 | H             |
| `/assets/record-BzWqQ4Ux.js`                                                                           | 3015 → 3109 |      1,360 | 2791 → 2813 |            0 | H             |
| `/assets/assets-ghYfL3Ea.js`                                                                           | 3045 → 3138 |        244 | 2805 → 2813 |            0 | H             |
| `/assets/place-kit-DhcTTOfq.glb`                                                                       | 3337 → 3430 |     27,042 | 3229 → 3234 |            0 | H             |

</details>
