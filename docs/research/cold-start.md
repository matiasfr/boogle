# Cold start: where the time to "Jump in" goes

> **Verdict:** On a slow link the load was a chain of round trips, then a wait for Rapier; on any link the shader warm-up builds every pipeline in the world, and only about 40 % are drawn in the first view.
> **Top recommendations:** 1. Compile the lobby and arrival view's pipelines first and the rest after "Jump in" (P1). 2. Keep the boot's lazy chunks preloaded and precached (done here). 3. Start the warm-up without waiting for Rapier (done here).
> **Status:** open. Three cheap wins implemented on `perf/cold-start` (Slow 4G: 34.3 → 24.6 s locally); the rest are proposals. Not tested on a device.

10 November 2026, on main a5999692. DESIGN.md: **Small and readable: measure before optimizing.**

**None of this is a device measurement.** Every number below is headless Chromium on the owner's M1 Max (Metal),
served locally, while other agents' browsers and builds shared the machine (load average 8–15 for the main runs, 30–43
for the Metal-cold ones). The owner's device suite (`https://boogle.club/?device=new` in a private tab) is what confirms
any of it after it ships. Absolute times are noisy; the throttled profile's ratios, the counts and the bytes are the
evidence.

## 1. How it was measured, and how to re-run it

`npm run cold-launch` (dev/cold-launch.ts) builds production with source maps, serves it the way boogle.club does
(HTTP/2, gzip for everything but images and audio, `cache-control: max-age=600`, `application/wasm`: checked against
the live site with `curl -I --http2` on 10 November) from a local TLS server, and runs a local game server for the room.
Each run launches a **fresh headless Chromium** (empty HTTP cache, no service worker, Google Fonts from the internet as on
the live page) and waits for the `interactive` boot mark ("Jump in" enabled and the loading screen gone).

| profile | network | CPU |
| --- | --- | --- |
| fast | none (loopback) | 1x |
| slow | DevTools Slow 4G: 562.5 ms added per request, 1.44 Mbit/s down, 675 kbit/s up | 4x slower |

Per profile: three clean runs (marks only; their medians and ranges are the timing evidence), one traced run (a
DevTools performance trace for main-thread time by kind and long tasks, plus a 250 µs CPU profile mapped through the
source maps to the nearest game file on the stack), and optionally a coverage run (`--coverage`) and a detail run
(`--detail`: `?startup=1`, each pipeline's object, and which pipelines a render pass ever binds, through Jump in and
10 s of arrival). `--metal-cold` copies Chrome under its own bundle id (dev/cold-start/identity.ts) and clears its Metal
shader cache before every run: the GPU then compiles every pipeline, as on a device's first visit. Without it the Mac's
Metal cache is warm after the first run. Every run takes the machine-wide bot slot.

```sh
npm run cold-launch -- --label before --coverage --detail      # build, 3 + 1 runs per profile
npm run cold-launch -- --label after --runs 5 --profiles slow   # another build
npm run cold-launch -- --compare .look/cold-launch/before/summary.json .look/cold-launch/after/summary.json
npm run cold-launch -- --metal-cold --dist .look/cold-launch/before/dist --label metal   # reuse a build
```

Results go to `.look/cold-launch/<label>/` (`summary.json`, one JSON per run with marks, requests, pipelines, long tasks
and attribution).

## 2. The waterfall: what blocks "Jump in", in order

Before this branch (main a5999692), medians of three runs, ms since navigation [min–max]. The step is what the time
between the two marks is spent on, from the trace, the CPU profile and the request log.

| step | fast | slow (Slow 4G + 4x CPU) | what it waits on |
| --- | --- | --- | --- |
| HTML parsed (`html`) | 22 | 614 | one round trip |
| boot entry ran (`entry`, `files-start`) | 199 | 1,364 | the boot chunks (15 KB) and the **Google Fonts stylesheet**, which blocks the entry script (it ends at 200 / 1,325 ms) |
| game modules in (`graphics-start`) | 333 | 8,182 [8,170–8,191] | **1.0 MB over 138 requests**, bandwidth-bound (~150 KB/s of 180): three.js 301 KB, game chunk 178 KB, splash art 94 KB, `map-prototypes` 37 KB, … |
| world built (`modules`→`props`) | 613 | 9,315 | module evaluation 0.4 / 1.7 s; terrain, props, first coast bake (CPU) |
| Buddy, sky, Place land (`buddy-ready`) | 2,260 | 12,963 | the Buddy chunk; atmosphere bake 0.28 / 1.2 s; Place terrain 0.24 / 1.0 s; land, cove textures, wood; a second coast bake 0.25 / 1.1 s; Buddy's own precompile |
| Rapier (`rapier`) | 1,355 | **19,059** | its 1.13 MB gzip WASM, fetched only after the game's JS ran (starts 11.0 s on slow) |
| frame pipelines built (`frame-pipelines`) | 2,881 | **28,060** | slow: **22 rounds of lazy chunks, one after another** (121 chunks, 193 KB, the last at 26.5 s), then the warm-up frame's ~110 async pipelines; fast: the pipelines |
| warm-ups done, Jump in enabled (`warmup-complete`) | 3,725 | 31,726 | the rest of the scene's pipelines, item icons, Ring Island's view (1.5 km away), audio prepare (0.18 / 0.2 s) |
| first frame, loading screen gone (`interactive`) | **4,339** [4,320–4,422] | **34,296** [34,083–35,539] | a third coast bake in the first frame (0.42 / 1.8 s), four pipelines the warm-up missed, GPU catch-up |

The owner's numbers (7.7 s and 27.7 s against the live site) are the same shape; the local fast profile has no internet
latency, and the local slow one starts the game server's room and fonts at the same throttle.

**With a cold Metal cache** (every pipeline compiled by the GPU, `--metal-cold`, two runs each, load 30–43):
fast **13.6–13.8 s** instead of 4.3 s, slow 37.5 s. On the Mac the GPU's pipeline compiles are worth about 9 s of a
first visit. See section 3 for the device's warm launch, where the same phase dominates.

### After this branch

| step | fast before → after | slow before → after |
| --- | --- | --- |
| `buddy-ready` | 2,260 → 2,300 | 12,963 → 12,725 |
| `rapier` | 1,355 → 1,374 | 19,059 → 20,400 (shares the link with the preloaded chunks) |
| `frame-pipelines` | 2,881 → 2,888 | 28,060 → **19,062** |
| `warmup-complete` | 3,725 → 3,701 | 31,726 → 22,043 |
| `interactive` | 4,339 → 4,324 (noise) | 34,296 → **24,612** [24,588–25,110] (−28 %) |
| requests / KB to interactive | 286 / 2,543 → 307 / 2,644 | 287 / 2,543 → 308 / 2,644 |

(The first two commits; with the third, fast `interactive` is 4,105 [4,065–4,132] and slow 24,566.)

## 3. What the owner's iPhone run says (hn4mei, warm launch, Safari 27)

The run's first navigation was served by a service worker (156 of 303 requests), so it is a **warm** launch: 8.9 s.
From its marks: `buddy_ready` 3,967 → `frame_pipelines` 6,886 (+2.9 s) → `warmup_complete` 8,203 (+1.3 s) → `first`
8,887 (+0.7 s); shader warm-up 4,236 ms for 230 programs / 155 pipelines, WGSL generation only 829 ms.

- **`buddy_ready` → `frame_pipelines` (2.9 s)** is the warm-up's preparations, then the warm-up frame. The preparations
  wait for the railway, town and Place views, whose lazy chunks were **not precached** (the worker precached only the
  page's and game's static imports), so on that warm launch about 147 requests still went to the network, in the same
  ~22 serial rounds as above: at a phone's 50–100 ms round trip that alone is 1–2 s. Then WGSL generation for the scene
  (most of the 829 ms) and the GPU's pipeline builds. This branch preloads those chunks and adds them to the precache,
  so a warm launch serves them from the worker with no round trips.
- **`warmup_complete` → `first` (0.7 s)** is the first real frame: in Chromium a coast re-bake (0.42 s of 0.64 s on the
  fast profile, 1.8 s at 4x CPU), plus four pipelines the warm-up missed (two shadow, one standard, one sprite), built
  synchronously in that frame, plus waiting for the GPU.
- **Is Safari's `createRenderPipelineAsync` used?** three r187's WebGPU backend calls it for every pipeline built by
  `compileAsync` and the warm-up frame (141 of 158 in Chromium), and `createRenderPipeline` (sync) for mipmaps, PMREM,
  the background and anything first drawn in a normal frame (17). Safari implements the async call; whether WebKit
  compiles those in parallel is not visible from here. In Chromium the 110 async calls of the warm-up frame are issued
  within 0.7 s and complete one after another (each about 20 ms later than the one before on a warm Metal cache): the
  GPU process builds them essentially serially.
- **The cold number is still unknown.** The device page records `sw0` (a worker controlled the page) at boot, in
  src/boot/device-entry.ts, before src/boot/sw.ts can register the worker (it waits for "interactive" and the room), so a
  first visit cannot be mislabelled warm by this page's own worker claiming it. `sw0` true means a worker from an
  earlier navigation of the same browsing session already existed: most likely the private tab (or another private
  tab of the same private session) had opened boogle.club before. Nothing to fix in the record; to get a cold launch,
  open the link in a **new** private window, or use `?device=new&cold=1` (it clears the worker and Cache Storage and
  reloads once; the HTTP cache stays).

## 4. Answers

**Which pipelines does the first frame need?** The detail run binds a pass encoder's `setPipeline` and records the first
bind of each pipeline after the loading screen lifts. Of **158 render pipelines created before the first frame**, **62
are bound in the lobby view**, 87 by 10 s after Jump in (the arrival), and **61 are never bound in those first ~12 s**
(27 standard and 19 basic node materials of things off screen, Buddy's three (the lobby does not draw the avatar),
mipmap and PMREM helpers, sprites, points, wood and bark kits). One more pipeline (a shadow material) is built
synchronously 0.1 s after Jump in. So roughly 60 % of the warm-up builds things not yet on screen.

**Serial or parallel?** The warm-up's stages are awaited one after another (src/render/precompile.ts): the preparations
in turn, then the warm-up frame together with `compileAsync(scene)`, then each `warmUp` in turn, because three keeps one
compile state per renderer. WGSL generation is synchronous JS on the main thread (594 ms fast, 2.8 s slow, 829 ms on the
phone). Native pipeline creation is async and off the main thread, but completes serially in Chromium's GPU process.

**Is the warm-up cacheable?** The GPU's half is: Chromium keeps compiled pipelines in its GPU disk cache, and the Mac's
Metal cache keeps the shaders, which is why the first run on a fresh Metal namespace takes 13.7 s and the next 4.3 s.
Whether Safari on iOS keeps compiled pipelines across loads is unknown; the phone's 4.2 s warm-up on a warm launch
suggests it does not keep much. The JS half (WGSL generation) is recomputed on every load: three has no cache for
node-builder output.

**Unused JS before the first frame (coverage).** 54 % of the 3.1 MB of JS loaded before `interactive` runs, the same on
both profiles: three.js 44 % of 1.1 MB, the game chunk 52 % of 474 KB, Rapier's glue 36 %. One whole file is data:
`map-prototypes` (170 KB, 38 KB gzip) is docs/world/map-prototypes.html imported raw by the sickle backdrop for the
JSON block inside it.

**Is the WASM streamed and compiled in parallel?** Streamed, yes: the server sends `application/wasm`, vite-plugin-wasm
uses `instantiateStreaming`, and the trace shows `StartStreamingCompilation` and ~530 ms of off-thread tier-up. In
parallel with the JS, no: the fetch starts when the game's modules evaluate src/physics/engine.ts and its 50 KB glue
chunk arrives (11.0 s on slow, after the 1 MB of JS), and it took 8 s at the shared bandwidth. Rapier gated the warm-up
by 6 s on slow (it is in long before on fast and on the phone).

**The ~300 requests.** 287 to `interactive`. boogle.club (GitHub Pages behind Fastly) serves them over **HTTP/2**,
multiplexed; **gzip only** (it never answers `br`, even when asked); `cache-control: max-age=600` on everything,
hashed files included (no `immutable`: after ten minutes a returning visitor without the worker revalidates each file).
The HTML preloads Buddy's two models and modulepreloads the boot chunks; nothing in the HTML starts the game chunk or
three.js, which begin when the boot entry has run, and the entry waits for the Google Fonts stylesheet.

**What the service worker does to a first visit.** Nothing before "Jump in": it registers once the game is interactive
and in a room, then precaches the first-load list (most of it from the HTTP cache). Before this branch that list held
only the static imports, so a returning visit still fetched ~130 lazy chunks and the content GLBs over the network, in
the serial chain.

**What the loading screen waits for that could come after "Jump in".** Ring Island's view (built 1.5 km away), item
icons, audio preparation (0.2 s), and about 60 % of the pipelines (section 4, first answer). Buddy too: the lobby does
not draw the avatar, but a returning player joins straight from the lobby, which is why it waits.

## 5. Ranked options

Savings are on the critical path to `interactive`. "Measured" means a before/after with `npm run cold-launch`.

| # | option | fast | slow | effort | risk / what it could break |
| --- | --- | --- | --- | --- | --- |
| **P1** | **Preload the boot's lazy chunks at once, and precache them** (done) | −0.3 s (noise) | **−6.6 s measured** | small | +21 requests, +101 KB fetched that boot did not need; a chunk wrongly excluded falls back to today's chain |
| **P1** | **Start the shader warm-up without waiting for Rapier** (done) | 0 | **−3.1 s measured** | small | something in the warm-up reading physics (nothing found); a Rapier failure still fails at once |
| **P1** | **Compile the lobby and arrival view first, the rest after "Jump in"**: precompile only what the camera sees at the spawn (plus Buddy and the arrival's path), unlock Jump in, then compile the rest in idle frames during the arrival | −0.8 to −1 s (est.: 60 % of 1.45 s warm-up) | −4 to −6 s (est.) | medium | first-use stalls when an uncompiled object comes into view (the hitch b847532e fixed); needs a queue that finishes before the arrival lands, and the device suite to judge the phone; **cold Metal / phone first visit: up to ~5 s** (60 % of 9 s) |
| P2 | Bake the coast once (the waterReady bake is gone, done; still 0.42 s fast / 1.7 s slow in the first frame): bake after the last boot shore registers, before the warm-up frame, so the GPU compiles while nothing else waits on it, or register both shores before the sky is ready | −0.2 s more (est.) | −1 to −1.7 s (est.) | small–medium | none visible if the bake still precedes the first frame |
| P2 | Build the four pipelines the first frame misses (two shadow, a standard, a sprite) in the warm-up | ~0 in Chromium | ~0 | small | none; matters on Safari, where a synchronous build stalls the frame |
| P2 | Self-host the two Google fonts, or load their stylesheet without blocking the entry | −0.0 s | −0.1 to −0.7 s (real cellular: a new origin's DNS, TCP and TLS) | small | a moment of fallback font on the loading screen if not self-hosted (owner's eye) |
| P2 | Load the splash art at low priority or smaller (94 KB inside the 1 MB critical window) | 0 | ~−0.5 s | small | the loading art appears later on a slow link (owner call) |
| P2 | Extract map-prototypes' JSON at build time instead of importing the whole HTML page | ~0 | ~−0.15 s (est.: ~30 KB) | small | none |
| P2 | Move Ring Island's view build and audio preparation after "Jump in" | −0.3 s | −0.6 s | small | Ring Island's pipelines compile later (it is 1.5 km away; the precompile-on-build stays) |
| P3 | Brotli: move hosting off GitHub Pages (Cloudflare Pages, Netlify) | ~0 | −1.5 to −2.5 s (est.: JS ~15–20 % and WASM ~20 % smaller than gzip) | medium (owner call: hosting) | deploy pipeline, cache headers (`immutable` for hashed files comes with it) |
| P3 | Fewer pipeline variants (palette clones share programs already; shadow pass per caster layout; MSAA/target permutations) | ? | ? | medium–large | look changes; needs a census per material first |
| P3 | Split three.js by what the first frame needs (44 % of it runs) | ~0 | −0.5 to −1 s (est.) | large | three ships one prebuilt WebGPU bundle; tree-shaking is already what Rolldown can do |
| P3 | Cache WGSL generation across loads (IndexedDB, keyed by build and material) | −0.6 s | −2.5 s | large | stale shaders across deploys; three's private API |
| P3 | Preload Rapier's WASM from the HTML | 0 | ~0 after the warm-up fix (the link is saturated by JS until then) | small | competes with three.js for bandwidth |

## 6. Implemented on `perf/cold-start`, with numbers

Each its own commit; same machine, 3 clean runs per profile, medians [min–max]:

1. **Preload the boot's lazy chunks at once, and precache them** (vite.config.ts, src/boot/boot-chunks.ts, one line in
   src/main.ts). The build lists the chunks the game's dynamic imports reach, less `src/debug`, other prototypes and the
   plain-Rapier fallback (134 chunks), in a `boogle-boot-chunks` meta tag; when the game's modules are in, each gets a
   `<link rel=modulepreload>`, which fetches and compiles but runs nothing, so evaluation order is unchanged. The service
   worker's first-load list grows from 153 to 291 files with the same chunks and their CSS. Slow: 34.3 s [34.1–35.5] →
   **27.7 s** [27.4–27.7]; the lazy rounds went from 22 to 9 (the rest are the content GLBs each view loads in turn).
   Fast: 4.34 → 4.05 s (within noise). Cost: +21 requests, +101 KB.
2. **Start the shader warm-up without waiting for Rapier** (src/main.ts). Slow: 27.7 s → **24.6 s** [24.6–25.1]. Fast:
   no change possible (Rapier is in before the warm-up starts); measured 4.05 → 4.32 s, within noise under load.
3. **Water: no coast bake at waterReady** (src/render/water-render.ts). The bake made when the sky was ready was always
   redone in the first frame, because Place's and Ring Island's shores register later. Fast: 4.32 → **4.11 s**
   [4.07–4.13]; coast.ts main-thread time 784 → 546 ms in the traced run. Slow: 24.6 → 24.6 s (coast.ts time unchanged
   at 4x CPU, so something still bakes in between there; not traced further).

All three together, from main: fast 4.34 → **4.11 s** (−5 %, at the edge of the noise); slow 34.3 → **24.6 s**
(−28 %). With a cold Metal cache (`--metal-cold`, two runs each, the first two commits only): fast 13.6–13.8 → 13.0 s,
slow 37.2–37.5 → **29.5–29.7 s** (−7.6 s); there the GPU's compiles are the bulk of what remains (Buddy ready at 6.5 s,
first frame at 13.0 s on the fast profile), which is why the P1 proposal in section 5 matters most for a phone's first
visit.

Tried and **not kept**: keeping an unchanged region's bake when another shore registers. Correct (a byte-for-byte check
passed) but no measurable change: the first-frame bake still redid the big Home and Place region (most likely the
last shore's rows push the packed texture past its 2,048-row cap, which coarsens every region; not verified). Not on
the branch.

The Metal-cold runs log two 404s per run (the full Chrome binary asks for `/favicon.ico`); the headless shell runs log
none.

`npm run check` passed on the branch.

## 7. What could not be measured

- **Any device.** Safari's pipeline compile speed and whether it overlaps async pipeline builds, iOS's shader cache
  across visits, real cellular latency and bandwidth, a phone CPU (4x throttling of an M1 Max core is not a phone).
- **A true cold launch on the phone** (see section 3).
- **The live site under throttling with these changes**: they are not deployed (not pushed).
- **Safari on the Mac**: the harness drives Chromium only.
- **Precise GPU time per pipeline**: the API time includes queueing in the GPU process.
- **Quiet-machine timing**: two other agents' runs and builds shared the Mac; the fast profile's run-to-run noise was
  about ±0.3 s.
