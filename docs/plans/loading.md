# Loading: an architecture that stays fast as content multiplies

_2026-11-01. Serves DESIGN.md 8, "Designed for drop-in" (a friend's link opens to the island in about a second, the
hundredth visit as fast as the first), and "Small and readable" (one manifest, one worker, one timeline; no loader
framework). Builds on [asset-pipeline.md](asset-pipeline.md), [perf-baseline-2026-11-02.md](perf-baseline-2026-11-02.md),
[boogle-2-architecture-fit.md](boogle-2-architecture-fit.md) and
[../research/webgpu-on-ipad.md](../research/webgpu-on-ipad.md)._

## Summary

Today a cold load in Chrome on an M1 Max reaches "Jump in" in **~0.93 s** on localhost and **~1.55 s** with 60 ms of
round-trip latency; a warm reload in **~0.6 s**. The **shader warm-up is the largest single phase everywhere**
(~0.33-0.42 s, 71 shader programs, 41 pipelines), and about **30 % of it is three.js generating WGSL in JavaScript**
(~100-120 ms); the rest is the GPU compiling pipelines. On a real connection, **downloads and round trips** come next:
45 requests in import waterfalls, and on a warm reload every one of them is revalidated once GitHub Pages' 10-minute
cache has lapsed. The service worker built here removes that: **warm reload 1.18 s -> 0.68 s at 60 ms latency (-42 %)**.

What grows with content is downloads (models, textures, audio, more code), shader programs and their compile time, and
the work done before the first frame. The architecture, in six lines:

1. **Boot timeline** (`src/boot/timeline.ts`): every phase marked; one line per load; `?prof=1`, `window.boogle.boot`.
2. **Service worker** (`src/boot/sw-worker.ts`): hashed files cache-first, one cache per build, precache of the first
   load, the two newest builds kept, kill switch; the page and `version.json` always from the network.
3. **Content manifest** (`src/render/asset-manifest.ts`): every authored file registered by id with a priority
   (`first` / `soon` / `later`) and a place (`proto`, `area`, `era`); `soon` files prefetched after the first frame.
4. **Shaders**: a budget of programs per milestone, warm what is in view first and the rest in idle time; no WGSL cache
   until generation passes ~250 ms.
5. **Budgets**: first frame and interactive per milestone, checked by `dev/look/boot-time.ts` and kept in this doc.
6. **Islands stream by the same rules**: an island is an area in the manifest; near is `first`, next is `soon`, far is
   an impostor plus `later`.

## 1. Measurements

### Method

- `node dev/look/boot-time.ts`: builds the game (`vite build`) against a local game server, serves `dist/` with
  `vite preview` on a new port per cold run (a new origin: empty HTTP cache, no service worker), opens it, then reloads
  twice (warm). Each page sends its timeline to the script with `?boottrace=<port>` (a `sendBeacon` to 127.0.0.1, only
  from a page served by this machine). Prints medians per phase and every page's line. Options: `--safari`,
  `--runs`, `--warm`, `--sw 0` (no service worker), `--latency <ms> --mbps <n>` (Chrome's network emulation).
- Chrome: Playwright's Chromium 1.64 on Metal (headless), the harness's own flags (`dev/look/lib.ts`).
- Safari: the real Safari on this Mac, opened with `open -a Safari`.
- Machine: MacBook Pro, M1 Max. Production build (`vite build`), the normal game (no `?proto=`), a fresh room.
- 3 cold loads and 6 warm reloads per row; medians. Run-to-run spread was within ±30 ms on every phase.
- `vite preview` sends no `max-age`, so a warm reload without the service worker revalidates every file (304s). That is
  GitHub Pages after its 10-minute `max-age` has lapsed, the usual case for a friend coming back later in the day.

### Phases (ms since navigation start)

`html` the HTML parsed (domInteractive) · `entry` the boot module ran · `modules` every eager game module evaluated ·
`rapier` physics WASM in · `gpu` WebGPU device · `terrain`, `props` meshes built · `shaders` the warm-up done ·
`first` one frame drawn · `interactive` "Jump in" enabled, loading screen gone · `room` joined a room (races the GPU).

### Chrome, localhost

| Load | html | entry | modules | terrain | props | room | rapier | gpu | shaders | first | interactive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cold | 12 | 194 | 360 | 393 | 425 | 457 | 486 | 505 | 897 | 931 | **932** |
| Warm, service worker | 19 | 20 | 124 | 154 | 184 | 209 | 242 | 225 | 570 | 598 | **599** |
| Warm, HTTP cache only (`--sw 0`) | 20 | 21 | 124 | 154 | 185 | 200 | 236 | 218 | 564 | 593 | **594** |

Shader warm-up: **71 programs, 41 pipelines, 383-423 ms cold, 320-348 ms warm; WGSL generation 98-127 ms of it;
shader-module creation 1-2 ms.** First load: 45 requests, 2.3 MB on the wire, 3.5 MB decoded; 481 KB gzip of JS,
591 KB of WASM (Rapier SIMD), 11 KB of CSS, 98 KB of splash art.

On localhost a revalidation costs nothing, so the service worker changes nothing here, as expected.

### Chrome, 60 ms latency, 50 Mbit/s (`--latency 60`)

| Load | html | entry | modules | gpu | rapier | room | shaders | first | interactive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cold | 72 | 269 | 780 | 893 | 1222 | 915 | 1503 | 1535 | **1536** |
| Warm, service worker | 88 | 89 | 200 | 295 | 311 | 368 | 653 | 679 | **680** |
| Warm, HTTP cache only | 86 | 145 | 645 | 721 | 814 | 776 | 1152 | 1177 | **1178** |

The cold load is a download waterfall: `entry` -> `modules` is 510 ms (the main chunk's imports, three.js) and Rapier's
591 KB of WASM lands 330 ms after the GPU is ready, so **Rapier gates the warm-up on a real connection**. Warm without
the worker, 45 sequential-ish revalidations cost ~0.5 s; with it, the warm reload is within 80 ms of localhost.

### Safari 27.0.1 on this Mac

The screen was locked for the whole session, so Safari's page was hidden: it ran the boot up to the GPU and then
stopped (a hidden page draws no frames and compiles nothing; the 8 s warm-up timeout then fired with 0 programs). The
phases before that are real:

| Load (cold) | html | entry | modules | terrain | props | gpu | room | rapier | shaders, first, interactive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Run 1 | - | 48 | 271 | 317 | 360 | 376 | 380 | 460 | not measured (hidden) |
| Run 2 | 127 | 141 | 361 | 402 | 444 | 461 | 468 | 532 | not measured (hidden) |

Safari evaluates the modules about as fast as Chrome (271-361 vs 360 ms) and gets its WebGPU device sooner relative to
them; its WASM arrives later (Rapier 460-532 ms vs 486 ms). **To finish the table:** unlock the Mac and run
`node dev/look/boot-time.ts --safari` (it opens tabs in Safari; give Terminal permission to script Safari when asked
so it can reload and close them, or close them by hand). Watch the `wgsl` and `shaders` numbers: WebKit compiles
pipelines differently (Metal, no shared blob cache), so the GPU part of the warm-up is the open question there.

### What dominates

- **Chrome, warm or on localhost:** the shader warm-up, ~55-60 % of the time to interactive. WGSL generation in JS is
  ~30 % of the warm-up (~100-120 ms), GPU pipeline compilation the rest (async, off the main thread, in parallel).
  Module evaluation (~100 ms) and building terrain and props (~60 ms) are next.
- **Chrome, cold on a real connection:** downloads. Three waterfalls (the boot chunk, then `main.ts` and its imports,
  then Rapier's chunk and WASM) and Rapier's 591 KB.
- **Warm on a real connection without the worker:** round trips to revalidate (~0.5 s at 60 ms).
- **Safari:** measured up to the GPU only (above); same shape so far.

## 2. The architecture

### a. Service worker (built)

`src/boot/sw-worker.ts`, built to `dist/sw.js` by `vite.config.js` ('boogle-sw', bundled with esbuild, which Vite
already depends on). Registered by `src/boot/sw.ts` once the game is interactive and in a room, so its precache never
competes with the boot.

- **What it caches:** only files under `assets/`, which all carry a content hash (`src/boot/sw-policy.ts`,
  `cacheable`). A hashed URL never changes meaning, so cache-first is always correct for it. JS, CSS, WASM (Rapier, the
  KTX2 transcoder), models, textures and audio all live there.
- **What it never touches:** the page, `version.json`, `sw.js`, icons, the web manifest, the game server, fonts. So
  `src/features/updates.ts` keeps seeing the network: its check of `version.json` (`cache: 'no-store'`) and its reload
  behave as before.
- **One cache per build:** `boogle-<build>`. On install it precaches the first-load files (the page's static imports,
  `main.ts` and Rapier's chunks and their CSS and assets, computed from the bundle; content files are left to the
  manifest), copying unchanged files from the previous build's cache instead of downloading them. `skipWaiting` and
  `clients.claim`: safe because the worker is generic (a tab on the old build asks for old hashed URLs, found in the
  old cache or on the network).
- **Versioned purge:** on activate it deletes every build's cache except this one and the one before it
  (`KEEP_BUILDS = 2`), so a tab left open on the previous build can still load its lazy chunks after the deploy.
- **Deploy flow:** a new deploy changes `sw.js` (the build id and the file list are inlined), the browser notices on
  the next navigation (`updateViaCache: 'none'`), the new worker precaches only what changed, and the reload that
  `updates.ts` triggers already finds most files cached.
- **Home Screen app:** same origin and scope (`BASE_URL`), so the app and Safari tabs share the worker. Navigations are
  not intercepted, so a launch with no network shows Safari's offline page as today (the game needs the server anyway).
- **Kill switch:** build with `BOOGLE_SW=off`: that `sw.js` deletes every `boogle-` cache and unregisters itself, and
  the page unregisters instead of registering. `?sw=0` does the same in one browser, for one load. Deleting caches waits
  for the page to finish loading, and the worker never writes into a cache that was deleted (it would come back).
- **Checked:** `node dev/look/sw-check.ts` builds four times (a, b, c, and the kill switch) and serves them one after
  another on one origin. All pass: second visit, 0 requests reach the server (every hashed file from the worker);
  deploy b, 10 of 44 files fetched, the rest from cache, page shows b; reload on b, 0 requests; deploy c keeps b and c
  and drops a; the kill-switch build leaves no registration and no cache.

**Follow-ups, not built:** (1) 10 of 44 files change in a deploy that only changes the build id, because the id is
inlined into a module and the change ripples up the import chain through the hashed file names. Moving `BUILD` to a
leaf module read at runtime (or `version.json`) would make a one-line change cost one file. (2) Navigation requests
could be revalidated by the worker (`cache: 'no-cache'`) so a reload after a deploy never gets Pages' 10-minute stale
HTML; `updates.ts`'s loop guard covers that today.

### b. Content manifest (built)

`src/render/asset-manifest.ts`, eager and small (no three.js). A feature registers each authored file it may load:

```ts
import rigUrl from '../../assets/built/hero-rig.glb?url';
const RIG = registerAsset({ id: 'hero-rig', url: rigUrl, kind: 'model', priority: 'first', when: { proto: 'assets' } });
// later, lazily: const { loadAssetById } = await import('../render/assets.ts'); await loadAssetById(RIG);
```

- **Priorities.** `first`: the first frame needs it where it applies; its feature loads it at start. `soon`: wanted
  within a minute (the next area, a held item); `prefetchAssets()` fetches these after the first frame, one at a time
  in idle callbacks at low fetch priority, into the HTTP cache and the worker's cache, so the later `loadAssetById` is
  a cache hit. `later`: on demand only.
- **Places.** `when: { proto, area, era }` narrows where a file applies. `proto` works today (`?proto=`); `area` and
  `era` are matched once the world has them (below).
- **Why this scales:** content is never in the first-load graph just because a module imports its URL (today the two
  prototype models are in the bundle graph of the normal game; the worker leaves them out of its precache by
  extension). Adding the hundredth model changes nothing for a player who is not near it.
- **Registered today:** `scaffold-kit`, `hero-rig`, `hero-outfit-castaway` (all `first` under `?proto=assets`).
  Not yet: the groove prototype's stems (`src/proto/groove/stems.ts`, loaded by its own glob) and the KTX2 transcoder
  (three's `KTX2Loader` resolves it itself; the worker caches it on first use, which is enough).
- **Next:** a check in `npm run assets -- --check` that every `assets/built/` file is registered once, and sizes from
  `assets/built/manifest.json` in the timeline so a `first` file's bytes count against the budget.

### c. Shaders

Facts: three r187 keeps pipelines in memory only (`Pipelines.js`), WebGPU has no persistent pipeline cache API, and
three generates WGSL from node materials in JS at runtime. Chrome keeps a disk cache of compiled shaders per profile;
Safari's behaviour is the open question above.

1. **A program budget.** Programs, not meshes, cost compile time: 71 programs today (82 in the 2 Nov baseline's
   counting, which includes lazy parts). Budget: **≤ 90 programs before the first frame**, reported in the timeline
   line (`shaders 71p 41pl`). A new material variant (a new TSL node graph, a new `patchNode`, a new
   shadow/fog/skinning combination) is the thing to watch; reuse a material and change uniforms instead.
2. **What's in view first.** `precompile(null)` today compiles the whole scene plus the warm-ups. As the world grows:
   compile the spawn area's objects (the `first` area) behind the loading screen, then everything else with
   `precompile(object)` from an idle callback after the first frame, in priority order, the way lazy parts already do.
   `compileAsync` yields to the main thread on its own; one call at a time (the existing queue).
3. **Caching WGSL in IndexedDB: not now.** Generation is ~100-120 ms in Chrome, a third of the warm-up but a tenth of
   a cold load, and a cache would have to rebuild three's whole `NodeBuilderState` (bindings, uniform layouts,
   attributes), not just the WGSL text, through private API that changes every release. Revisit if `wgsl=` in the
   timeline passes ~250 ms (about 150 programs at today's cost) or if Safari's numbers show generation is much slower
   there. The cheaper lever first is fewer programs.

### d. Budgets

Per milestone, Chrome on the M1 Max, production build, `node dev/look/boot-time.ts` medians:

| Milestone | Today | Budget (localhost) | Budget (`--latency 60`) |
| --- | --- | --- | --- |
| First frame, cold | 931 ms | ≤ 1100 ms | ≤ 1800 ms |
| Interactive, warm (worker) | 599 ms | ≤ 700 ms | ≤ 800 ms |
| Shader programs before first frame | 71 | ≤ 90 | |
| WGSL generation | 98-127 ms | ≤ 250 ms | |
| First-load JS / WASM (gzip) | 481 / 591 KB | ≤ 550 / 600 KB | |

Run it before and after anything that adds eager modules, materials or first-load files, as with `npm run perf`, and
update this table when a milestone lands. CI can't run it (no GPU on the runner, and two builds take a minute), so the
check lives with `npm run perf` and `check:gpu`; a follow-up is a `--budget` flag that exits non-zero when a median
is over, for `npm run ship` on a Mac.

### e. Multi-island streaming

From [boogle-2-architecture-fit.md](boogle-2-architecture-fit.md) ("A world bigger than one island"): terrain per island
as data, far islands as impostors (`THREE.LOD`), load and unload by distance, water near the player. In this design:

- **An island is an area** in the manifest. Its heightfield, collider data, models, textures and ambient audio are
  registered with `when: { area: 'mine-isle' }` (and `era` where the era changes its look).
- **Distance sets the priority at runtime:** the island you're on is `first`, the next one along the sea crossing is
  `soon` (prefetched when you set off), the rest are `later`. A small `setPlace({ area, era })` on the manifest
  re-runs the prefetch list when the player's area changes.
- **Impostors are always loaded:** each island's far mesh or impostor is tiny and `first` everywhere, so the horizon is
  never empty while the island itself streams in.
- **Shaders by area too:** an island's distinct materials are warmed with `precompile(islandRoot)` when it is
  prefetched, before you arrive.
- **Lockstep data is never streamed lazily:** rules, ops and states stay eager (AGENTS.md, "Lazy parts"); only the
  island's render and decoration data stream. Collider data that the sim reads loads with the island's snapshot, not
  by distance.
- **The worker keeps it all:** island files are hashed like everything else, so a returning player re-downloads only
  islands that changed.

## 3. Built in this change

- `src/boot/timeline.ts`: `bootMark`, `bootSpan`, `bootLine`, `bootDone`; marks in `src/main.ts`; WGSL and
  shader-module timing in `src/render/precompile.ts` (wrapping three's private `_createNodeBuilder` and
  `createProgram`; reads 0 if they move). `?prof=1` shows the phases and logs the line; `window.boogle.boot.line()`.
- `src/boot/sw-worker.ts`, `src/boot/sw-policy.ts`, `src/boot/sw.ts`, the 'boogle-sw' plugin in `vite.config.js`.
- `src/render/asset-manifest.ts`, `loadAssetById` in `src/render/assets.ts`, today's three models registered.
- `dev/look/boot-time.ts`, `dev/look/sw-check.ts`, `test/loading.test.ts`.
- No change to what is drawn or when: the same modules load in the same order (one new 1 KB chunk, the manifest), and
  the worker registers only after the game is interactive.
