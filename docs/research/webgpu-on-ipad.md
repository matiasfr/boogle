# WebGPU on iPad

_2026-11-01. Shipping a three.js `WebGPURenderer` game on iPad Safari, for the M4 iPad Pro that [boogle-2.md](../proposals/boogle-2.md) names as the lowest target: what Safari 26 and 27 support, the tile GPU, MSAA and pass store actions, 120 Hz, thermals, memory, Rapier's WASM, audio, home-screen mode and profiling. Sources are WebKit release posts and bugs, Apple's WWDC25 WebGPU session, the web3dsurvey feature database, three.js r187 source (read in `node_modules`) and issues, and secondary press for thermals. Nothing here was measured on an iPad; every number from a device is someone else's, and each recommendation ends with the smallest test that would confirm it. Builds on [stylized-rendering-on-a-budget.md](stylized-rendering-on-a-budget.md) (tile GPUs, blending, passes) without repeating it. The web search budget ran out before two questions were settled (whether Safari exposes WebGPU transient attachments, and the exact jetsam limit); both are marked as open._

## Summary

1. WebGPU shipped in Safari 26 (September 2025) on iPadOS; Safari 27 (iPadOS 27, September 2026) added WGSL `clip_distances` and fixed limits, multisample resolve and `onuncapturederror`. Chrome on iPad is the same WebKit engine, so there is one browser to target.
2. On iOS, reported devices expose `texture-compression-astc` and `timestamp-query` almost universally, `texture-compression-bc` on only ~59 %, and `subgroups` essentially never (0.45 %). Don't plan on subgroups; don't assume BC.
3. three.js's `KTX2Loader` transcodes ETC1S to **ETC2** and UASTC to **ASTC 4x4** on an iPad. Both are native, so the asset pipeline needs no iPad-specific encode.
4. three r187 asks the device for every optional feature but only **default limits** (`requiredLimits: {}`), so storage buffers stop at 128 MiB and buffers at 256 MiB unless Boogle asks for more.
5. **Boogle's MSAA scene target is stored to memory every frame.** `RenderTarget.storeMultisampledColorBuffer` defaults to `true`; setting it false on `scenePass` makes three discard the 4x samples and use a transient (memoryless) attachment where the browser allows it. At 2x DPR on an 11-inch M4 that is about 130 MB of colour writes a frame that need not happen.
6. Safari caps `requestAnimationFrame` at **60 Hz by default** even on ProMotion (a user-facing feature flag lifts it), and lower in Low Power Mode. `adaptive-res` reads a capped 30 Hz as "slow" and would drop resolution for nothing.
7. The M4 iPad Pro **throttles after about 9–15 minutes** of sustained game load (press tests of native games); short benchmarks hide it. Boogle evenings last hours, so judge frame time after a soak, not at launch.
8. iOS kills a tab with no warning when its process passes a memory limit that JavaScript can't read ("A problem repeatedly occurred"). Apple's own advice is f16 and compressed formats; three.js users report crashes from a handful of 2K–4K images.
9. Rapier ships a `-simd` build (needs Safari 16.4+) that third parties measure at 1.2–1.5x faster steps; threads would need COOP/COEP headers, and Rapier's JS builds don't use them anyway.
10. Profiling: Web Inspector (Timelines, JS, memory) works on an iPad over USB, but there is no WebGPU frame capture in Safari; Metal capture of WebGPU needs a self-built WebKit MiniBrowser on a Mac. three's `trackTimestamp` is the practical GPU timer on the device.

## Findings by source

### WebKit release posts: what Safari ships

The [Safari 26.0 post](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) announces WebGPU "shipping in Safari 26.0 for macOS, iOS, iPadOS, and visionOS", says it "supersedes WebGL" there, names three.js among the engines that "work great", and notes validation was streamlined toward native performance. It lists no limits or features. The same release makes every site added to the Home Screen open as a web app with zero installability requirements, and has WebAssembly start in a new in-place interpreter so large modules launch faster and use less memory before tiering up. [Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/) added WebGPU textures as depth-stencil and resolve attachments, Wasm resizable memory buffers, and fixed `<audio>` failing after reopening a Home Screen web app.

[Safari 27 beta (WWDC26)](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/) adds WGSL `clip_distances`, WebAssembly JSPI, and fixes that matter here: restored `maxStorageBuffersInFragmentStage` and related limits (they had regressed), multisampled resolve targets, `GPUDevice.onuncapturederror` (it did nothing before), and a Wasm SIMD register bug. A [secondary write-up](https://app.cinevva.com/news/2026-09-17-safari-27-model-element-webgpu-clip-planes) points out that, before `clip_distances`, Safari apps faked clip planes with fragment `discard`, which on a tile GPU defeats hidden-surface removal. Safari 27 shipped with iPadOS 27 on 14 September 2026. An M4 iPad Pro on current software is on 27; one held back on 26.x lacks these fixes.

### web3dsurvey: features iPads actually report

[web3dsurvey](https://web3dsurvey.com/webgpu) collects adapter reports from real visitors. On the iOS platform: [`timestamp-query`](https://web3dsurvey.com/webgpu/features/timestamp-query) 100 %, [`texture-compression-bc`](https://web3dsurvey.com/webgpu/features/texture-compression-bc) 58.6 % (88 % on macOS), [`texture-compression-astc`](https://web3dsurvey.com/webgpu/features/texture-compression-astc) 100 %, and [`subgroups`](https://web3dsurvey.com/webgpu/features/subgroups) 0.45 % (63 % on macOS). iOS [`maxBufferSize`](https://web3dsurvey.com/webgpu/limits/maxBufferSize) is at least 1 GiB on about 80 % of reports and 256 MiB on all; [`maxStorageBufferBindingSize`](https://web3dsurvey.com/webgpu/limits/maxStorageBufferBindingSize) is similar. These are self-reported and mix iPhones with iPads, so they say what Safari can expose, not what an M4 exposes; the runtime `adapter.features` and `adapter.limits` are the truth. Safari's timestamp queries may be coarsened for privacy (unverified); treat their resolution as unknown until tested.

### Apple, WWDC25 "Unlock GPU computing with WebGPU"

The [session](https://developer.apple.com/videos/play/wwdc2025/236/) is Apple's only WebGPU performance guidance. In my words:

- **Memory is the first constraint on iOS.** Store data as `f16` or compressed formats "to avoid getting your program terminated due to memory pressure"; even storing f16 and unpacking to f32 in the shader helps. `shader-f16` must be requested.
- **Render bundles** map to Metal indirect command buffers and validate once at creation instead of every frame.
- **One command buffer per frame.** Command-buffer boundaries force a sync between tile memory and unified memory; split only when data must be written back.
- **As few passes as possible.** Passes don't sync memory but "consume substantial memory bandwidth" by target size; Apple points back to its tile-based deferred rendering guidance.
- **Bind groups are Metal buffers.** Each bind group creates an `MTLBuffer`; pack small uniforms into one buffer with dynamic offsets.
- **Updating index and indirect buffers is expensive**, because they are revalidated before reuse.

The session demos three.js WebGPU jellyfish running "so smoothly in Safari". It says nothing about MSAA or load/store actions.

### Metal and Dawn on memoryless MSAA

Apple's [storage-mode guidance](https://developer.apple.com/documentation/metal/choosing-a-resource-storage-mode-for-apple-gpus.md) describes memoryless textures that live only in tile memory for one pass. WebGPU's newer `TRANSIENT_ATTACHMENT` usage exists to reach them: Dawn (Chrome) maps it to `MTLStorageModeMemoryless` on Apple GPUs (per two [Chromium](https://issues.chromium.org/issues/501629978) security reports about its validation). I couldn't confirm whether WebKit exposes `GPUTextureUsage.TRANSIENT_ATTACHMENT`; that is a one-line check on the device. Independent of it, `storeOp: 'discard'` on a multisampled attachment lets the driver resolve without writing the samples back.

### three.js r187 source (Boogle's version)

Read in `node_modules/three`, not from docs:

- `WebGPUBackend` requests **all** adapter features but passes `requiredLimits: {}` unless the app sets `requiredLimits`, so the device gets WebGPU's default limits (128 MiB storage binding, 256 MiB buffer, 8 storage buffers per stage) even on an adapter that offers more.
- `RenderTarget.storeMultisampledColorBuffer`, `storeMultisampledDepthBuffer` and `storeMultisampledStencilBuffer` default to `true`. When false, the backend clears instead of loading and uses `storeOp: 'discard'`, and `WebGPUTextureUtils` gives the MSAA texture `RENDER_ATTACHMENT | TRANSIENT_ATTACHMENT` usage if the browser defines that flag. `PassNode` takes `samples` from the renderer, so Boogle's `scenePass` is 4x MSAA with stored samples today (`scene.ts` sets `antialias: true` and touches none of these flags).
- `KTX2Loader.detectSupport(renderer)` reads `renderer.hasFeature('texture-compression-astc' | 'etc2' | 'bc' ...)`. Its priority table sends ETC1S to ETC2 first (BC7 third) and UASTC to ASTC 4x4 first. On an iPad without BC, ETC1S lands on ETC2 and UASTC on ASTC; with BC, nothing changes, since ETC2 and ASTC still rank higher.
- `trackTimestamp: true` on the renderer plus `renderer.resolveTimestampsAsync()` gives per-pass GPU times when `timestamp-query` is present.

### three.js issues and forum: Safari-specific failures

- [#35069](https://github.com/mrdoob/three.js/issues/35069) (r186.1, iPhone 15 Plus, iOS 27): `WebGPURenderer` throws "Texture already initialized" for the **shadow map depth texture** in about half of page loads, during a `compileAsync()` after the first frames. Never on macOS. Closed as a likely WebKit WeakMap bug ("Browser Issue"); the reporter's workaround skips re-creating an initialized texture. Boogle has both ingredients: shadow maps and `precompile.ts`, which compiles lazily built objects after the first frames.
- [three.js forum, "A problem repeatedly occurred"](https://discourse.threejs.org/t/safari-a-problem-repeatedly-occurred/85343): a small three.js site crashed an iPhone 15 Plus tab while an iPhone 8 was fine; shrinking images fixed it, and a reply reports Safari crashing on single 2K–4K images. Anecdotal, but consistent with WebKit's own bug below.
- [#30344](https://github.com/mrdoob/three.js/issues/30344): compute particles running at 20–60 fps by view angle on an iPhone 12 Pro Max (r172, old).

### WebKit bugs: frame rate and memory

- [Bug 173434, "Support for 120Hz requestAnimationFrame"](https://bugs.webkit.org/show_bug.cgi?id=173434) is still open (last touched May 2026). WebKit restricts page updates to 60 Hz for power and because pages broke at other rates; iframes get 30 Hz; Low Power Mode changes the rate too. The "Prefer Page Rendering Updates near 60fps" feature flag, on by default, is what holds it; with it off, commenters report 120 Hz rAF on M4 iPad Pros. Press guides ([MacRumors](https://www.macrumors.com/how-to/enable-smoother-120hz-browsing-in-safari/)) say an OS update can turn it back on and that Home Screen web apps follow the system default. So: 60 Hz is what players get; 120 Hz only for someone who flipped a developer flag.
- [Bug 227636](https://bugs.webkit.org/show_bug.cgi?id=227636): a WebKit engineer reproduced an iOS jetsam (system kill) at over 1.5 GB, said iOS won't let a web process hold that much, and that **no Web API reports the limit or the memory-pressure signal**. iPhone and iPad limits differ. The M4 iPad Pro has 8 or 16 GB of RAM; the per-tab ceiling isn't published, so treat ~1.5 GB of combined JS, Wasm and GPU memory as the danger zone until measured.

### Thermals

The best available comparison is [Notebookcheck's report](https://www.notebookcheck.net/iPad-Pro-M5-AAA-gaming-test-shows-Death-Stranding-running-at-1080p-high-settings-without-any-upscaling-or-thermal-throttling.1145228.0.html) of a YouTube test: in a one-hour Resident Evil 4 run the **M4 iPad Pro began throttling at nine minutes**, its thermal state going from "Nominal" to "Serious", and in Death Stranding at about fifteen; the M5 ended 15–20 fps ahead. A 2024 [3DMark Wild Life Extreme stress test](https://x.com/VadimYuryev/status/1790752872336150790) showed no throttling at about 12 W. Both are native games at far higher load than Boogle; the lesson is that sustained load and first-minute load differ, and the web has no thermal-state API to tell which one you're in.

### WebAssembly: SIMD, threads, Rapier

Safari has had COOP/COEP and `SharedArrayBuffer` (so Wasm threads) since [15.2](https://webkit.org/blog/12140/new-webkit-features-in-safari-15-2/) and fixed-width Wasm SIMD since 16.4; relaxed SIMD is the gap ([LiteRT issue](https://github.com/google-ai-edge/LiteRT/issues/10903)). Rapier publishes [`@dimforge/rapier3d-simd`](https://www.npmjs.com/package/@dimforge/rapier3d-simd) beside the plain build (also at 0.19.3, Boogle's version), "with more limited browser support (requires support for simd128)", which every WebGPU Safari has. Third-party ports measured about a third less step time and 1.16–1.48x mean-tick speedups ([one](https://github.com/vladf1/sloppy-tanks/pull/22), [two](https://github.com/ashbellett/3d-world/pull/8)), on desktop. Rapier's JS bindings are single-threaded, so cross-origin isolation buys Boogle nothing today, while `COEP: require-corp` would make every cross-origin resource opt in.

### Audio, fullscreen and Home Screen mode

- iOS plays Web Audio in the "ambient" session, which the ring/silent switch mutes; `navigator.audioSession.type = 'playback'` (Safari 16.4/17) makes it audible ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/audio-session)). `src/render/audio.ts` already does this, inside the first-gesture unlock, and resumes the `'interrupted'` state iOS uses after calls.
- [firt.dev's iOS PWA notes](https://firt.dev/notes/pwa-ios/): manifest `display: fullscreen` isn't supported and falls back to `standalone`; `black-translucent` is still the only way to draw under the status bar (Boogle's `index.html` sets it); the element Fullscreen API works on iPad only (Boogle's pause view uses it); manifest `orientation` is ignored; Screen Wake Lock works in Safari since 16.4 and in Home Screen apps only since 18.4; the Battery Status API doesn't exist. Home Screen apps keep storage separate from Safari's, so a player's local identity in Safari won't follow them into the installed app.

### Profiling an iPad from a Mac

- **Web Inspector** over USB (Settings → Apps → Safari → Advanced → Web Inspector, then the Mac's Develop menu) gives Timelines (JavaScript, rendering frames, CPU, memory), heap snapshots and per-Worker attribution since 26.0. Its Graphics tab records canvas calls; I found nothing saying it captures WebGPU.
- **Metal frame capture of WebGPU** has no Safari path. PlayCanvas documents building WebKit's MiniBrowser with Metal capture on and triggering captures with `notifyutil`, then replaying in Xcode ([PlayCanvas](https://developer.playcanvas.com/user-manual/optimization/gpu-profiling/); [gist](https://gist.github.com/slimbuck/ec4500afaec6b2c5368c22a37153826d)). That is a Mac, not the iPad, but the same Apple GPU family. Attaching Xcode to Chrome's GPU process works and is fragile ([toji.dev](https://toji.dev/webgpu-profiling/xcode.html)).
- **On device**, the GPU timers are WebGPU timestamp queries through three's `trackTimestamp`, and frame pacing comes from rAF deltas. Instruments' Metal System Trace against a USB iPad may see Safari's GPU process; untested.

## What this means for Boogle

Recommendations only; each needs an owner's yes and an on-device check before it becomes work. "On the iPad" means the M4 iPad Pro, Safari, the live site or a LAN dev server, `?prof=1`.

1. **Log the iPad's real adapter once.** Print `adapter.info`, `[...adapter.features]` and `adapter.limits` (and `'TRANSIENT_ATTACHMENT' in GPUTextureUsage`) behind a debug flag, and paste the output into `src/render/README.md`. Everything below that depends on BC, timestamps, f16 or transient attachments rests on it. *Smallest test:* open `?gpuinfo=1` on the iPad and read the Web Inspector console.

2. **Stop storing the 4x MSAA scene target.** Set `storeMultisampledColorBuffer = false` (and the depth and stencil equivalents if no post effect reads multisampled depth) on `scenePass`'s render target, so samples resolve in tile memory and are discarded. Estimated saving at 2x DPR, 11-inch M4 (2420 × 1668, RGBA16F): ~130 MB of colour and ~65 MB of depth writes per frame, roughly 11 GB/s at 60 Hz, against the M4's ~120 GB/s. Watch for anything that reloads the multisampled target mid-frame (three's layered or resumed passes). *Smallest test:* `?prof=1` GPU time (item 6) or adaptive-res's settled ratio before and after on the iPad, plus `npm run look` stills unchanged on the Mac.

3. **Make adaptive-res aware of the refresh cap.** Its thresholds (18.5 ms down, 14 ms up) assume 60 Hz. In Low Power Mode Safari runs rAF slower, and a steady 33 ms frame would walk the ratio to 0.6x for no gain; at 120 Hz (flag off) it never reacts below 60 fps. Measure the median rAF interval over the warm-up and set thresholds relative to it, and don't step down when the GPU time (item 6) is well under the interval. *Smallest test:* turn on Low Power Mode on the iPad, play two minutes, and check whether the pixel ratio dropped (`renderer.getPixelRatio()` in Web Inspector).

4. **Budget for 60 Hz, not 120.** Players get 60 Hz unless they flip a Safari developer flag. Nothing should depend on 120 Hz feel; physics already runs at a fixed step with up to four substeps. *Smallest test:* log the median `dt` over 10 s on the iPad with default Safari settings; expect 16.7 ms.

5. **Judge iPad frame time after a 20-minute soak.** The M4 throttles after about 9–15 minutes of sustained load in native games. A quality tier picked in the first minute (PLAN.md, "Graphics quality tiers") may not hold an hour in. *Smallest test:* leave the island running on the iPad (charging and on battery) for 20 minutes with `?prof=1` and note frame time and adaptive-res ratio at minutes 1, 10 and 20.

6. **Turn on three's GPU timestamps behind `?prof=1`.** `trackTimestamp: true` plus `resolveTimestampsAsync('render')` adds GPU milliseconds per frame to the overlay, the only GPU timer available on the iPad; check whether Safari's resolution is fine enough to be useful. *Smallest test:* toggle shadows off on the iPad and see whether the reported GPU time moves.

7. **Ask for the adapter's limits when compute needs them.** three requests default limits, so a compute particle buffer or a big storage buffer will fail validation above 128 MiB even where the iPad allows more. Pass `requiredLimits` built from `adapter.limits` (clamped) when the first large storage buffer lands, not before. *Smallest test:* `renderer.backend.device.limits.maxStorageBufferBindingSize` in the console; expect 134217728 today.

8. **Watch for the shadow-depth "Texture already initialized" error.** three.js #35069 hits exactly Boogle's pattern (shadow maps plus `compileAsync` after the first frames) on iOS 27. *Smallest test:* reload the iPad ten times and check the console and the `gfx errors` telemetry; if it appears, reduce it to a repro for bugs.webkit.org and carry the reporter's guard locally.

9. **Write the asset pipeline's KTX2 defaults with the iPad in mind.** ETC1S textures transcode to ETC2 and UASTC to ASTC 4x4 on the iPad with three's stock `KTX2Loader`, so one `.ktx2` per texture serves it and Chrome. Prefer ETC1S for colour (smaller downloads, ETC2 on device) and UASTC only for normal maps or where banding shows; cap texture size at 2K, since three.js users report iOS tab kills from a few 4K images. *Smallest test:* load one ETC1S and one UASTC texture on the iPad and log `texture.format` after load.

10. **Measure memory before the world grows.** No API reports the iOS limit. Web Inspector's Memory timeline on the iPad is the only meter; record a baseline (island, night, a full haul) and keep a watch for growth. Apple's advice (f16 and compressed formats for storage) applies to compute particles and the haul data. *Smallest test:* Web Inspector Memory timeline over a 10-minute session on the iPad; note the peak.

11. **Try Rapier's SIMD build.** Swap `@dimforge/rapier3d` for `@dimforge/rapier3d-simd` at the same version behind the physics facade (`src/physics/backend-rapier.ts` is the only importer). No headers needed; every WebGPU Safari has simd128. Don't add COOP/COEP for threads: Rapier's JS build doesn't use them. *Smallest test:* `?prof=1` `main: physics` time on the iPad during a crate pile-up, plain build vs SIMD.

12. **Profile on a Mac MiniBrowser when the iPad shows a GPU problem.** For a frame-level look at passes and load/store actions, use PlayCanvas's WebKit MiniBrowser Metal-capture recipe on an Apple Silicon Mac (same GPU family) rather than hunting for an iPad capture path. *Smallest test:* one capture of the island, confirming the scene pass's MSAA store action before and after item 2.

13. **Keep what already works.** `audio.ts` sets the `playback` audio session and resumes `'interrupted'`; `index.html` has `black-translucent`; the pause view uses element fullscreen, which works on iPad. Missing: a Screen Wake Lock while playing, so the iPad doesn't dim during a long haul with no touches. *Smallest test:* play from the Home Screen icon for longer than the auto-lock interval with no input and see whether the screen dims.
