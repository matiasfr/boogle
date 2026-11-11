# Cold start: where the time to "Jump in" goes

> **Verdict:** On a slow link the load was a chain of round trips, then a wait for Rapier; on any link the shader warm-up builds every pipeline in the world, and only about 40 % are drawn in the first view. On the first true cold launch from a device (Safari 27 on an M5 Max, 18.8 s), pipeline creation is 81 % of the time.
> **Top recommendations:** 1. Compile the lobby and arrival view's pipelines first and the rest after "Jump in" (P1, spec in 5b; ~8–9 s of that 18.8 s). 2. Build the warm-up's few misses in the warm-up (P1: Safari stalls on them). 3. Keep the boot's lazy chunks preloaded and precached, and the warm-up not waiting for Rapier (done here).
> **Status:** open. Cheap wins on `perf/cold-start` (Slow 4G: 34.3 → 24.6 s locally; fonts self-hosted, owner's call). Recommendations 1 and 2 are built on `perf/lobby-first-warmup` (section 5c: Jump in enabled 0.7 s sooner fast, 4.5 s sooner on Slow 4G; Safari cold estimated 18.8 → ~13.5 s), not tested on a device.

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
Each run launches a **fresh headless Chromium** (empty HTTP cache, no service worker; before the fonts commit, Google
Fonts from the internet as on the live page) and waits for the `interactive` boot mark ("Jump in" enabled and the
loading screen gone). `--play`, `--fail`, `--stills` and `--no-modulepreload` are the checks of section 6b.

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
- **The cold number was unknown from this run.** The device page records `sw0` (a worker controlled the page) at boot,
  in src/boot/device-entry.ts, before src/boot/sw.ts can register the worker (it waits for "interactive" and the room),
  so the launch breakdown cannot be mislabelled warm by this page's own worker claiming it. `sw0` true means a worker
  from an earlier navigation of the same browsing session already existed: most likely the private tab (or another
  private tab of the same private session) had opened boogle.club before. To get a cold launch, open the link in a
  **new** private window, or use `?device=new&cold=1` (it clears the worker and Cache Storage and reloads once; the
  HTTP cache stays). **The Load table did mislabel it**, though: its "warm load" row read the controller when the load
  was sent, after our worker had claimed the page; run ckn9ca (section 3b) showed "warm load | true" on a launch the
  breakdown correctly called cold. Fixed on this branch: that row now reports the controller noted at boot.

## 3b. The first true cold launch from a device (ckn9ca: M5 Max MacBook Pro, Safari 27, build 353d7a6bc6d5)

18.8 s to `interactive`, 306 requests, 2.8 MB, 0 from the service worker. The network and the boot are done by
`buddy_ready` at **3.5 s** (Rapier at 2.9 s); then `frame_pipelines` +9,860 ms, `warmup_complete` +3,641 ms and
`first` +1,815 ms: **15.3 s, 81 % of the launch, is the shader warm-up and the first frame**. The warm-up reports
13.5 s for 226 programs / 153 pipelines, of which **WGSL generation is only 643 ms**: the rest is Safari creating
pipelines, about **84 ms each** on average ((13,501 − 643) / 153), essentially one after another. On this machine and
link the fonts and compression are worth well under a second (`entry` at 587 ms; the font stylesheet was already in;
the largest file, Rapier's WASM, took 240 ms).

The suite after the warm-up: every scene passes at 59.7–59.9 fps, but **spawn built 6 more programs** while settling
(longest frame 21 ms, so hidden) and **Far Head built 1 program in an 889 ms stall**, the hitch a player would see. Which
programs these are: section 5b.

Weighed against this run, per pipeline at ~0.1 s of the 15.3 s (pipelines differ in cost; shadow pipelines are
cheap, so these are upper bounds for the simple ones and lower bounds for the big ones):

| option | pipelines out of the pre-"Jump in" path | would save on ckn9ca |
| --- | --- | --- |
| Lobby first, the rest after "Jump in" (P1 below; 62 of 153 before Jump in) | ~91 | **~8–9 s** (18.8 → ~10 s) |
| Defer only the 61 never drawn in the first 12 s | 61 | ~5–6 s |
| Async creation everywhere (the 17 synchronous builds: mipmaps, PMREM, background, the first frame's four misses) | 0 (moves 17 off the critical frame) | ≤1.5 s, mostly in `first` (1.8 s); and it removes stalls like Far Head's |
| Fewer variants (per material census first) | each variant ~0.1 s | ~0.1 s per variant removed; unknown how many |
| Fonts (done) / Brotli (declined) | 0 | < 0.2 s / < 0.3 s here |

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
Brotli would mean moving hosting (estimated −1.5 to −2.5 s on Slow 4G, under 0.3 s on ckn9ca); **the owner declined it
on 10 November: "fonts fix, stay on gh pages these are good improvements for now."** Hosting stays on GitHub Pages, so
it is off the option list.
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
| **P1** | **Compile the lobby and arrival view first, the rest after "Jump in"**: precompile only what the camera sees at the spawn (plus Buddy and the arrival's path), unlock Jump in, then compile the rest in idle frames during the arrival (spec: section 5b) | −0.8 to −1 s (est.: 60 % of 1.45 s warm-up) | −4 to −6 s (est.) | medium | first-use stalls when an uncompiled object comes into view (the hitch b847532e fixed); needs a queue that finishes before the arrival lands, and the device suite to judge it; **Safari cold (ckn9ca): ~8–9 s of 18.8 s** (section 3b) |
| P2 | Bake the coast once (the waterReady bake is gone, done; still 0.42 s fast / 1.7 s slow in the first frame): bake after the last boot shore registers, before the warm-up frame, so the GPU compiles while nothing else waits on it, or register both shores before the sky is ready | −0.2 s more (est.) | −1 to −1.7 s (est.) | small–medium | none visible if the bake still precedes the first frame |
| **P1** (was P2) | Build the pipelines the warm-up misses (the first frame's two shadow, a standard and a sprite; `buddy_face`'s shadow, built synchronously 0.1 s after Jump in) in the warm-up | ~0 in Chromium | ~0 | small | none; on Safari each is a synchronous build in a frame (ckn9ca: +6 programs at spawn, an 889 ms stall on Far Head) |
| P2 | Self-host the two Google fonts (**done**, owner's call 10 November) | −0.19 s measured | ~0 measured (−0.1 to −0.7 s on real cellular: no second origin) | small | a moment of fallback font (section 6) |
| P2 | Start the splash art after the game's modules (**tried and reverted**: no gain at Jump in and the art showed about 6 s later; owner's call 10 November; low priority alone changed nothing, Chromium already loads it Low) | 0 | see section 6 | small | the art appears later on a slow link |
| P2 | Extract map-prototypes' JSON at build time instead of importing the whole HTML page | ~0 | ~−0.15 s (est.: ~30 KB) | small | none |
| P2 | Move Ring Island's view build and audio preparation after "Jump in" | −0.3 s | −0.6 s | small | Ring Island's pipelines compile later (it is 1.5 km away; the precompile-on-build stays) |
| P3 | Fewer pipeline variants (palette clones share programs already; shadow pass per caster layout; MSAA/target permutations) | ? | ? | medium–large | look changes; needs a census per material first |
| P3 | Split three.js by what the first frame needs (44 % of it runs) | ~0 | −0.5 to −1 s (est.) | large | three ships one prebuilt WebGPU bundle; tree-shaking is already what Rolldown can do |
| P3 | Cache WGSL generation across loads (IndexedDB, keyed by build and material) | −0.6 s | −2.5 s | large | stale shaders across deploys; three's private API |
| P3 | Preload Rapier's WASM from the HTML | 0 | ~0 after the warm-up fix (the link is saturated by JS until then) | small | competes with three.js for bandwidth |

## 5b. Next step for P1 (lobby first): a spec

**Which pipelines.** From the detail run (`npm run cold-launch -- --detail`, which records every pipeline's first bind
after the loading screen lifts, then Jump in, the arrival and Far Head):

- **Before "Jump in" (62):** what the lobby view binds: 31 `MeshStandardNodeMaterial`, 18 `ShadowMaterial` (the
  shadow pass of those casters), 4 `MeshStandardMaterial`, 4 `MeshBasicNodeMaterial`, 2 sprites, the background, the
  sea, and one internal pass. Plus Buddy's own (`M_Face`, `M_Main`) and their shadow variants, because a returning
  player joins straight from the lobby.
- **During the arrival (25 more by Jump in + 10 s):** 13 standard node materials, 3 shadow, the wood kit (`wood-x/y/z`,
  `warm_timber`), 2 basic; and `buddy_face`'s shadow, which today is built **synchronously** 0.1 s after Jump in (the
  only pipeline built after the warm-up in Chromium, at the spawn and on Far Head alike).
- **The rest (71 of 158):** 61 never bound in the first ~12 s (things off screen, the wood and bark kits elsewhere,
  mipmap and PMREM helpers, points), and 10 bound only by the warm-up's own frame before the loading screen lifted.

Pick them at run time, not from a list: compile pass 1 is `compileAsync` on the lobby camera's frustum (objects whose
bounding sphere it intersects, from the spawn's camera pose) plus Buddy, the avatar and their shadow variants, plus
everything the first frame draws outside the scene (background, sea, post). Then unlock "Jump in". Pass 2 is the rest,
one `compileAsync` per object group in idle frames, **nearest the spawn first** (the arrival's path, then the town,
then everything else), so what the player can reach soonest is ready soonest.

**Keeping a first-use hitch from showing.** A pipeline that is not ready when its object is first drawn is built
synchronously in that frame: the 889 ms stall on Far Head in ckn9ca. Three guards: (1) pass 2 starts in the lobby, not
after Jump in (the lobby lasts seconds while the player types a name); (2) an object pass 2 has not reached yet is
drawn only once its pipelines are ready (hold it invisible for those frames; three's `compileAsync` promise per object
says when); a distant object appearing a few frames late is hard to notice, a stall is not (owner's eye before it
ships: it changes what can be on screen in the first seconds); (3) the warm-up's
known misses (the first frame's four, `buddy_face`'s shadow) move into pass 1. **The test is the device report's
"settle (compile stalls)" column: 0 over 100 ms and +0 programs in every scene of the quick suite**, against ckn9ca's
spawn +6 and Far Head 1 stall of 889 ms (+1). Locally, `npm run cold-launch -- --detail` must show no pipeline built
after the warm-up, and `--metal-cold` gives the GPU-cold time.

**Measuring it on the owner's phone.** On the Mac: `npm run device -- new --label "iphone cold" --cold --wait`, open the
link on the phone in a **new** private tab, let the quick suite finish; repeat once (one run is not a claim). Then
`npm run device -- new --label "iphone warm"` and open it twice in the same tab for the warm launch. Compare with
`npm run device -- pull <code>`: `interactive`, the `frame_pipelines` and `warmup_complete` steps, programs /
pipelines before the first frame (expected ~62–70 of 153), and the stalls column. Do the same on the Mac's Safari
(ckn9ca's setup) for a less noisy number. Success: cold launch on ckn9ca's machine ~10 s (from 18.8 s), zero stalls
over 100 ms.

## 5c. Lobby first, built (`perf/lobby-first-warmup`, 10 November 2026)

The owner approved option 1 on 10 November ("Yes, build it"), knowing that things not yet compiled may stay hidden or
appear a moment late in the first seconds after Jump in. What the branch does (src/render/precompile.ts;
src/render/reference/frame.md has the contract):

- **Pass 1, behind the loading screen:** the preparations as before, then **the lobby's real frame**, now in the lobby's
  own camera pose (the camera entity sets it for that frame: before, the warm-up frame drew from wherever the camera
  was made, which main never noticed because it also compiled the whole scene), with Buddy and his name label in it
  (`warmUp(..., { frame: true })`), so `buddy_face`'s shadow pipeline builds there. Then the warm-ups that are not
  deferred (the item icons, Ring Island's view, the waits for lazy parts, audio). No `compileAsync(scene)` and no
  "every caster" shadow frame any more. Jump in enables when this ends.
- **From then on nothing in the game's scene builds a shader or a pipeline synchronously in a frame.** An object first
  drawn without its shader is held out of the frame and compiled with `compileAsync` (nearest the camera first, eight at
  a time, ahead of pass 2's queue); a pipeline three would create synchronously is created with
  `createRenderPipelineAsync`, and r187's draw path skips the object until it is ready (`Pipelines.isReady`). Shadow-pass
  shaders cannot be built outside a frame (three applies the caster's nodes to the shared shadow material only while
  drawing), so a frame generates them up to 8 ms and the rest cast their shadow a frame or more later. What the first
  frame holds (15 objects hidden until the first update: the haul pieces, the panel mechanism, a fork, a few labels) is
  built before the loading screen lifts (main.ts awaits it). Other scenes (PMREM, the item icons, the output pass) keep
  three's synchronous build, which their one-off renders need; mipmap pipelines are three's own and stay synchronous
  (built at boot, behind the loading screen).
- **Pass 2, from the moment the loading screen lifts:** the rest of the scene, nearest the camera as it is at each step
  (the lobby's view, then wherever the player has got to), twelve objects a `compileAsync`, in rings of 60, 150, 300,
  600 m and the rest; each ring's shadow casters are then unculled a batch a frame (the batch adapts to keep that
  frame's shader generation under ~6 ms). The held item models, the carry meshes and the knockdown stars build after the
  first ring. Boot marks `shaders-ring-0` … `shaders-ring-4` and `shaders-all` (with pipelines, programs and how many
  were built late) time it.
- **The device report:** the suite now waits for `shaders-all` (at most 60 s) before its scenes, so their "settle
  (compile stalls)" column measures what the warm-up missed, and the report has a "Pipelines built after the loading
  screen" block: when they were all built, how long Run waited, how many were built late, and how many were built late
  during the scenes (each a miss). **The test stays the spec's: 0 stalls over 100 ms and +0 programs in every scene.**
- **`npm run cold-launch`** gains `--jump` (click Jump in the moment it is enabled; frames over 100 ms once the loading
  screen has lifted, render pipelines built after it, sync and async, and when the last was ready), `--late-stills`
  (stills 0, 2, 5 and 10 s after that click), and, per long task in traced runs, the functions on its stack (file:line).

### Numbers (headless Chromium on the M1 Max, local build, `--jump`, 3 clean runs, medians [min–max] ms)

main is origin/main be8bf67d9, built and measured with the same harness. Its runs had a higher machine load (11–25)
than the branch's final runs (5.5–12.8), so part of the fast profile's difference is load (a second main run at load
18–26: fast `interactive` 4,533, slow 29,004).

| | fast main | fast branch | slow main | slow branch |
| --- | --- | --- | --- | --- |
| Jump in enabled (`enter-enabled`) | 3,508 [3,404–3,892] | **2,825** [2,754–2,921] | 25,538 [24,186–26,424] | **21,064** [21,054–21,427] |
| loading screen gone (`interactive`) | 4,174 [4,052–4,568] | **3,550** [3,468–3,641] | 28,625 [26,997–29,511] | **25,280** [25,155–25,611] |
| every render pipeline built (the last one ready) | 4,279 [4,177–4,712] | 4,922 [4,812–5,019] | 29,420 [27,675–30,336] | 40,943 [40,063–41,014] |
| frames over 100 ms after Jump in, loading screen gone | 0 | 0 | 2 [2–2] (133–183 ms) | 2 [2–2] (150–183 ms) |
| render pipelines built synchronously after Jump in | 1 (`buddy_face`'s shadow) | **0** | 1 | **0** |
| shaders generated inside a frame after the warm-up (> 20 ms) | not marked | 0 | not marked | 0 |
| pipelines / programs before the loading screen lifts | 151 / 224 | **96 / 158** | 149 / 220 | **94 / 154** |
| WGSL generation before it (ms) | 643 | 334 | 3,514 | 1,772 |
| synchronous `createRenderPipeline` calls in all | 18 | 13 | 20 | 13 |

- Pass 2 ends (`shaders-all`) at 4,999 [4,885–5,101] on fast, 1.4 s after the loading screen; on slow the first ring is
  done 6.9 s after it and everything ~16 s after (41.5 s; one of three runs finished inside the 16 s hold, the others
  later). It builds 64 more pipelines (160 in all); 16 were first needed by a frame (built late), and 145–147 objects
  were held a frame or more (the arrival's surroundings: the spawn is 900 m from where the lobby looks).
- **The two slow frames after Jump in are there on main too**: the join's first frames (audio start, the arrival's
  first render objects, Rapier), not shader or pipeline builds (none in those frames; traced run `lf-branch3t`). The
  fast profile has none.
- `--detail` (Jump in after 2 s, then Far Head): **no pipeline built after `shaders-all`**, at the arrival or on Far
  Head, where main built `buddy_face`'s shadow synchronously. `--play`: Rapier in before Jump in, the body lands and is
  still (y 18.45 at x 903, z 14), walking 1.5 s moves 8.3 m (fast) and 8.7 m (slow), a jump rises 0.62–0.86 m, 0
  errors on both profiles. `npm run scenario -- smoke`: all 8 checks pass. `npm run check` passes.
- Not changed here: on slow, ~18 s after the loading screen lifts, the adaptive governor sheds sea detail and sun
  shadows at its resolution floor (src/features/adaptive-res.ts) and every material's shader is generated again in one
  frame: a 1.3–1.6 s stall on main and on the branch alike (the 4x-throttled CPU reaches the floor; ckn9ca's 60 fps does
  not). The new `startup:frame-wgsl` marks name it (sea, wood kit, Sickle Isles horizon). Worth its own fix.

### What can be missing, and for how long (slow profile: Slow 4G + 4x CPU, Jump in clicked the moment it is enabled)

Framed stills, main on top and the branch below, at 0, 2, 5 and 10 s after the click took effect:
`.look/cold-launch/lf-compare/slow-late-main-top-branch-bottom.png` (and `fast-late-main-top-branch-bottom.png`;
singles in `.look/cold-launch/lf-final5/` and `lf-main-stills/`). The player lands at the spawn at once.

- **The spawn's market stall** (its shelf and roof; its pots show) **and the small wooden sign beside it**: missing for
  about 0.8 s after Jump in, there by 2 s. The rest of what is first seen at the spawn (145 objects in all) appears
  within ~3.3 s, nearest first; most of it is behind or beside the camera.
- **A caster's shadow** when it first enters the sun's shadow map: a frame or more late (8 ms of shadow shaders a frame).
- **Held items, the carry meshes (rails, stone, beam, boiler) and the knockdown stars**: compiled after the first ring
  (~7 s on slow); before that, the first time one appears it is held until compiled (under a second in these runs; the
  stars at the landing's flop were not seen missing in the stills, but a still is not proof).
- **Anything far** (the town past 150 m, the railway, other islands): built by ~16 s on slow; if seen sooner, held like
  the stall.
- Never missing: the avatar (Buddy and his shadow), the ground, the water and the sky, which are in pass 1, and the
  output. On the fast profile no still shows anything missing (the 0 s still is under the loading screen's fade).

### Safari (estimate, not measured)

ckn9ca spent ~84 ms per pipeline, built one after another. Pass 1 now builds 94–96 of 151 (Chromium's count; Safari
built 153), so ~57 fewer before Jump in: **~4.8 s**, plus about half of the 643 ms of WGSL: **18.8 → ~13.5 s**
(estimate; range 12.5–15 s, since pipelines differ in cost and Safari's first frame also builds the 15 first-frame
objects). Not the ~10 s the spec hoped for: pass 1 still holds the lobby frame's ~80 pipelines (18 of them shadow),
PMREM and the sky bakes, the 4 item-icon pipelines and Ring Island's 2. Moving the icons and Ring Island's view after
the loading screen is the next step (Ring Island's build is a 110 ms CPU task on fast, ~440 ms at 4x, so it needs
splitting first). On Safari, pass 2's ~64 pipelines at ~84 ms would take ~5.5 s after the loading screen. The stalls
ckn9ca saw (spawn +6 programs, Far Head's 889 ms) should be gone, since nothing in the scene builds a pipeline
synchronously any more and the suite starts after pass 2; that is the claim the device run tests. **Safari's own
misses were not reproduced**: Playwright's WebKit is not installed here (downloading it needs the owner's yes), and
safaridriver needs "Allow remote automation" in Safari's Developer settings (`npm run cold-start -- --safari-probe`
says so).

**To check on a device**, once this branch ships: in a **new** private window on the Mac's Safari (and on the iPhone),
`https://boogle.club/?device=new&cold=1`, then run the quick suite. The report's launch breakdown has `enter-enabled`,
`shaders-ring-*` and `shaders-all`, its "Pipelines built after the loading screen" block the late counts, and each
scene's settle column the stalls (pass: 0 over 100 ms and +0 programs everywhere).

## 6. Implemented on `perf/cold-start`, with numbers

Each its own commit; same machine, 3 clean runs per profile, medians [min–max]:

1. **Preload the boot's lazy chunks at once, and precache them** (vite.config.ts, src/boot/boot-chunks.ts, one line in
   src/main.ts). The build lists the chunks the game's dynamic imports reach, less `src/debug`, other prototypes and the
   plain-Rapier fallback (135 chunks), in a `boogle-boot-chunks` meta tag; when the game's modules are in, each gets a
   `<link rel=modulepreload>`, which fetches and compiles but runs nothing, so evaluation order is unchanged. The service
   worker's first-load list grows from 153 to 293 files with the same chunks and their CSS. **The list is wider than
   what boot uses:** 21 of the 135 (82 KB gzip) are not requested before `interactive` on main: Place's in-play modules
   (`chop`, `job`, `panel`, `coop`, `run`, `pair`, `moves`, `look-gtao`: 69 KB), the fall stage, guest play, GTAO,
   the graphics page, the home station's view and a few stubs. They are reachable from boot by dynamic import and
   needed once the player reaches Place, so precaching them is right; preloading them costs those 82 KB on the slow link
   before Jump in. Excluding Place's in-play modules from the meta tag (not from the precache) is a small follow-up.
   No chunk with `src/debug`, `dev/`, another prototype or plain Rapier is in the list (checked from the source maps).
   Slow: 34.3 s [34.1–35.5] →
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

Then, after the owner's answers (10 November), on the branch with the three above (3 clean runs each):

4. **Self-hosted fonts** (index.html, src/boot/splash.ts, vite.config.ts; `@fontsource/figtree` and
   `@fontsource/lilita-one` 5.3.0). The Google Fonts stylesheet is gone; the same Google files (latin and latin-ext,
   `font-display: swap`) come from our origin with the loading screen's CSS. **Licence:** both are SIL OFL 1.1, which
   allows bundling and serving them; the licence texts ship at `/fonts/Figtree-OFL.txt` and
   `/fonts/LilitaOne-OFL.txt` and THIRD_PARTY_NOTICES.md names them ("Lilita One" is a Reserved Font Name, which only
   binds modified versions; these files are unmodified). The worker precaches the 9 WOFF2 files (Lilita One's tiny
   latin-ext face is inlined in the CSS); the WOFF fallbacks are built but not precached. Fast: boot entry 193 → **39
   ms**, `interactive` 4,060 → **3,875 ms** [3,841–3,995]. Slow: the entry is gated by its own chunks (1,373 → 1,394 ms),
   so ~0 there; real cellular saves the second origin's DNS, TCP and TLS. **The font swap:** in every still from the
   first paint (`--stills`), on both builds and both profiles, the title is already drawn in Lilita One; the title's
   face finishes at ~4.3–4.8 s on Slow 4G either way, and the frames after it are identical between the builds (0.07 %
   of pixels; `.look/cold-launch/stills-before2/` against `.look/cold-launch/art-after/`). Headless Chromium never gave
   a capturable frame in the fallback font, so the "moment it changes" the owner accepted is not shown here; Safari
   may show it briefly.
5. **Reverted before shipping (orchestrator, 10 November: no gain at Jump in, art about 6 s later). What was tried: the splash art starts after the game's modules** (src/boot/splash.ts). `fetchPriority = 'low'` alone changed
   nothing in Chromium (an image already loads at Low; it still took 94 KB of the link from 1.4 to 6.1 s), so the art
   now starts at `graphics-start`. Slow: `graphics-start` 8,137 → **7,666 ms** (−0.47 s), but `interactive` 24.5 →
   25.2 s [24.5–26.5]: no gain there (the art now shares the link with Rapier's WASM, and the warm-up is the critical
   path), and **the art appears at ~12 s instead of ~6 s** on Slow 4G. Fast: no change. A separate commit, so it can be
   dropped; my recommendation is to drop it unless the owner prefers the earlier `graphics-start`.
6. **The device report's "warm load" row** (src/debug/device/diagnostics.ts, first-load.ts): it now reports the
   controller at the navigation's start, not after our worker has claimed the page (ckn9ca's mislabel, section 3).

Not kept: skipping the boot-chunk preload when a browser lacks `modulepreload`. Emulated (`--no-modulepreload`), Vite's
own preload fallback (`rel=preload as=script`) already downloads ~1 MB of JS twice on main too, and without the skip
the branch was faster (32.4 s against 36.1 s with it, 38.7 s on main). Every browser that runs WebGPU supports
modulepreload (Safari since 17; WebGPU needs 26), so it only concerned browsers that cannot run the game.

Tried and **not kept**: keeping an unchanged region's bake when another shore registers. Correct (a byte-for-byte check
passed) but no measurable change: the first-frame bake still redid the big Home and Place region (most likely the
last shore's rows push the packed texture past its 2,048-row cap, which coarsens every region; not verified). Not on
the branch.

The Metal-cold runs log two 404s per run (the full Chrome binary asks for `/favicon.ico`); the headless shell runs log
none.

`npm run check` passed on the branch.

## 6b. Checked before shipping

Production builds served locally, headless Chromium, both profiles, against main's build (`.look/cold-launch/`).

- **Water** (`--play`, fixed cameras through `?debugcam=1`): the spawn's shore, across the bay, the pier's water (Place's
  shore; the pier itself is not built in a fresh world), low over the shallows by the landing, and the arrival a few
  seconds after Jump in. main vs branch differ by ≤ 0.2 % of pixels on fast (moving NPCs and props); on slow by the
  random name and colour and the moment of the splash fade. The coast, the foam line and the depth tint are in every
  frame of both builds; no frame shows a missing or stale coast (`main-play/` and `tip/`, `*-play-view-*.png`).
- **Physics at Jump in** (`--play` clicks "Jump in" the moment it is enabled): Rapier is in before Jump in enables on
  both builds (fast 1.19 s vs 3.21 s; slow 20.4 s vs 21.8 s). The click itself can only land at `interactive` (the
  page runs no task in between: the first frames), then: the body lands and is still on the first sample (y 18.45),
  walking 1.5 s moves 8.3 m, a jump rises 0.63–0.79 m, 0 errors, same as main. Pick up and drop: the beach ball is on
  the classic island, out of reach of the default spawn, so they were checked by the smoke scenario instead (below).
  Main enables Jump in at 31.6 s on slow; the branch at 21.8 s.
- **A blocked Rapier** (`--fail`): a 404 on the WASM ends in "Boogle couldn't download its physics engine (HTTP 404).
  Please reload to try again." after 2.8 s, the same as main. An aborted request ends in "This device's graphics can't
  start WebGPU…" after 3.5 s, a misleading message, **also on main** (a `TypeError: Failed to fetch` takes the graphics
  path); not changed here, listed for a fix.
- **Precache and first visit**: the worker registers at `interactive` (the `register()` call is marked) and makes **0
  requests before Jump in is enabled**; its 312 precache fetches start then and end 0.4 s later (mostly the HTTP
  cache). Hashed names: a new build's list keeps a file only under the same content hash (two consecutive builds: 187
  names kept, 124 new, 106 dropped), the cache is per build (`boogle-<build>`) and activation deletes every other
  build's cache (src/boot/sw-worker.ts), so a stale chunk cannot be served for a changed one.
- **Without modulepreload** (`--no-modulepreload`, the browser's `relList.supports` patched to say no): boots with 0
  errors on both profiles, as main does.
- **Two tabs** (`npm run scenario -- smoke`, dev server with this branch's code): all 8 checks pass: the players see
  each other, a roster edit reaches the other tab, the thrown ball moves for the other player, and every state hashes
  the same at one tick.

## 7. What could not be measured

- **The lobby-first branch on any device or in Safari** (section 5c): the Safari number there is an estimate, and
  what Safari builds after the warm-up was not reproduced.
- **Any device, from here.** Two device runs from the owner inform sections 3 and 3b (hn4mei, ckn9ca); this branch
  has not run on one. Unknown: iOS's shader cache across visits, real cellular latency and bandwidth, a phone CPU (4x
  throttling of an M1 Max core is not a phone), and which programs Safari built after the warm-up in ckn9ca (+6 at
  spawn, +1 on Far Head): in Chromium the same poses build only `buddy_face`'s shadow.
- **A true cold launch on the phone** (see section 3).
- **The live site under throttling with these changes**: they are not deployed (not pushed).
- **Safari on the Mac**: the harness drives Chromium only.
- **Precise GPU time per pipeline**: the API time includes queueing in the GPU process.
- **Quiet-machine timing**: two other agents' runs and builds shared the Mac; the fast profile's run-to-run noise was
  about ±0.3 s.
