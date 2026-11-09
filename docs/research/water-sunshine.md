# Sunshine water: a sea that costs a tenth and looks like the game

> **Verdict:** Build Super Mario Sunshine's recipe (one plane, two scrolling textures, a sparkle band chosen by texture footprint), with no screen copies, behind `?water=`; keep Ultra as the control until the owner picks.
> **Top recommendations:** 1. Replace the ocean's look, not the water contract: keep `waterField`, plunges, underwater and ripples, swap the surface. 2. Drop both screen copies, the FFT and the caustics producer on the cheap candidates; depth only where foam needs it. 3. Fix the pier/Far Head per-pixel contact loop and the phone's pinned resolution in the measurement job's numbers before judging any candidate's cost.
> **Status:** open. Plan: [water-sunshine](../plans/water-sunshine.md); board: [water-sunshine.html](water-sunshine.html).

_9 November 2026. Research on `worktree-agent-a94029c73fc37a991`, based on `d07206a9`, three.js r187. Live web research and a read of the current water code; no game code changed and nothing was run on a GPU, browser or bot (measuring is the parallel performance job's work). Not tested on a device._

Evidence labels: **[P]** primary documentation or developer statement, fetched; **[R]** a reverse engineer's reconstruction or public reconstructed source, read directly (not Nintendo's renderer); **[S]** search excerpt only, page not read in full; **[L]** local code, read; **[D]** arithmetic from code constants; **[E]** estimate; **[I]** interpretation or proposal. Every cost in this report is **from code, not measured** unless it cites a measurement.

## The owner's words

On 9 November 2026, after the co-op session with a friend on an iPhone Air:

> "taking another pass at our water system, we will re-evaluate and see if we can reference a version existing or make a new one that is a lot more inexpensive instead of ultra water, that also fits the style of the game better. we will also revisit toon shading on characters and env"

> "for our water refactor/remake, visual target should be something like super Mario sunshine, I like the lighting/grading there too and should be really efficient for mobile without issue"

This reverses part of the 2–4 November line ("start from Ultra Water and tune it, keeping its features"; [Look](../decisions.md#look)) and the 3 November [sunshine-rendering](sunshine-rendering.md) advice not to port `_umi`. It does not reverse the 3 November call to keep the underwater look, surface swimming and automatic high-fall plunges, which every candidate here keeps.

## Why now

Both 9 November entries in [playtests](../playtests.md) and the [round-4 tracker](../plans/round-4-notes.md):

- **The owner's Mac** (Safari 27, 2712×2110 canvas): p95 frame time 30–55 ms for about a minute at the pier head (x 1400, z −360) on both visits, worst 112 ms, while 17–18 ms elsewhere; the resolution scale fell from 2× to 1.2× and stayed there four minutes. CPU was 5–6 ms and draw calls about 200, so the cost was on the GPU, with open sea filling the view and about 440 spray particles a second.
- **The friend's iPhone Air** (Safari 27 iOS): already at its lowest resolution scale, a 27 s freeze at Far Head, a reload, then a black sky, dark shading and a band where the canvas stopped. Draw calls rise from about 200 to about 600 near Far Head on both devices.

Both places face open sea. Another agent is diagnosing the freeze and measuring draw calls and render targets; nothing here duplicates its fixes. The section [What the measurement job should confirm](#what-the-measurement-job-should-confirm) lists the numbers that must agree.

## Super Mario Sunshine's water and light, feature by feature

What the owner is responding to, as named features. "Cost" is the GameCube's, then what the same thing costs in Boogle's renderer.

| # | Feature | How it is made | Cost then / for Boogle |
| --- | --- | --- | --- |
| 1 | **One broad body of colour.** Cyan to deep blue, almost no surface detail, reading as warm holiday water | Delfino Plaza's sea is a flat plane with one material, `_umi`; noclip's isolated demo draws it on a single quad. The colour is mostly the texture blended over what is underneath **[R]** ([St. Pierre](https://blog.mecheye.net/2018/03/deconstructing-the-water-effect-in-super-mario-sunshine/), [noclip `SunshineWater.ts`](https://github.com/magcius/noclip.website/blob/main/src/InteractiveExamples/SunshineWater.ts)) | One draw, a handful of vertices / one draw, ALU only |
| 2 | **Two layers drifting through each other.** A slow, shimmering moiré, like the surface bubbling | The same 64×64 wave texture is sampled twice with different scrolling (one layer scrolls along one axis only), the second added at double strength so overlaps bloom into highlights. The scroll is a keyframed texture-matrix animation (`sea.btk`), not a shader clock; noclip's demo plays it five times faster to show it. Two TEV stages combine them with the vertex alpha **[R]** | Two texture reads per pixel / two reads |
| 3 | **The sparkle band.** A bright ring of glitter at middle distance that moves with the camera, clear water at your feet and calm water far off | The "mip trick": the texture's mip levels are authored differently. The largest level is empty, the second (32×32) medium, the third (16×16) brightest. The GPU's mip choice depends on how much texture one pixel covers, so the brightest level lands at a band of distance and viewing angle. An alpha test then drops a middle range of brightness, leaving only bright texels in the band and the "cling-film" look outside it **[R]**. St. Pierre's own interpretation is that the band stands in for reflected sky at a grazing angle of about 20°; on Sirena Beach it is tinted yellow for sunset **[R, author's belief]** | Free (the hardware already picks mips) / free; but the trick depends on resolution: Dolphin's high-resolution modes break it, and St. Pierre restores it with a mip bias from the 640×528 target **[R]** |
| 4 | **Clear water near you.** You see the floor in the shallows | The empty top mip plus blending dark texels into the background makes the water transparent close up **[R]** | Blending / blending; no screen copy needed |
| 5 | **Bigger waves only around Mario** | A small procedurally generated mesh follows the player with a rougher texture (`wave.bti`) and its own material, over the static sea **[R, St. Pierre in the article's comments]** | A small mesh / a small near patch instead of a 190k-vertex grid |
| 6 | **Heat shimmer and refraction near shore** | A second model, `seaindirect`, draws after the opaque scene is resolved into a screen texture, using GX indirect texturing to wobble the lookup **[R]** ([noclip `sms_scenes.ts`](https://github.com/magcius/noclip.website/blob/main/src/j3d/sms_scenes.ts)). The decompilation's `TScreenTexture` allocates that screen texture at **half width, half height, RGB565** **[R, via [sunshine-rendering](sunshine-rendering.md)]**. `TShimmer` is the same idea for heat haze | One quarter-size, 16-bit copy / Boogle today copies the full-size HDR colour and the depth every frame |
| 7 | **No real reflection** | The band (3) fakes the sky; the decompiled `MapMirror` is a 256×256 mirror-camera scaffold, not evidence the sea mirrors the town **[R]** | Nothing / Boogle samples a 1024 sky cube three times a pixel |
| 8 | **Hot sun, glare without bloom** | `TSunModel` probes 17 depth points for visibility; separate lens-glow and lens-flare objects ease in and out **[R, via [sunshine-look](sunshine-look.md)]** | A few sprites / the existing sun billboard; bloom stays off |
| 9 | **Lighting** | GX hardware lighting is per vertex: one diffuse light, an ambient colour per object group and a separate specular light, set from the stage's light objects; vertex colours carry authored shading into TEV **[R]** (`LightConfig` in noclip, `LightUtil` in the decompilation). Shadows are circles and shadow volumes, not shadow maps **[R]** | Cheap / a ramp or wrap term in TSL; see the toon question in the plan |
| 10 | **The grade** | No tone mapper: saturated authored textures, TEV scale and clamp for overbright, GX range fog to a stage colour, a textured sky model **[R/I]** | None / Neutral plus authored colour; a grade is a separate, small change |

What the owner likes, read as a list: **saturated blue water with a broken bright band, hot white highlights, soft shadowless ambient, warm solid forms against it, haze into a pale horizon.** Of these, only 1–5 are the water; 8–10 are lighting and grade, which the plan's open questions take up separately.

## The same family elsewhere

Where no developer breakdown exists I say so; the readings are of the shipped look **[I]**.

| Game | What it does cheaply | Its limit | Evidence |
| --- | --- | --- | --- |
| **The Wind Waker** | One huge untessellated plane for the open sea; a tessellated wave plane fades in outside safe waters, centred under the boat; the wave texture scrolls with the boat's heading and speed. Foam is a static graphic shape that deforms within limits, probably UVs warped by scrolling noise | Flat colour and graphic foam; the original has no reflection; dark uniform blue next to Sunshine's gradients | [Simon Schreibt's travel guide](https://simonschreibt.de/gat/zelda-wind-waker-hyrule-travel-guide/) **[P/R]**; foam guess on [Polycount](https://polycount.com/discussion/180024/animated-ocean-texture-maya) **[S]** |
| **A Short Hike** | Water colour by depth, posterized into visible bands | Bands need a depth source; the outlines and pixel scale are a different style | [Ameye's stylized water notes](https://ameye.dev/notes/stylized-water-shader) cite it as the posterization example **[P, third party]**; developer on cohesive simplification, via [sunshine-look](sunshine-look.md) |
| **Sable** | Flat shading with depth carried by layered lighting, fog and distance-fading outlines | The look is the outlines; water is not where its budget goes | [Game Developer on the GDC 2022 talk](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability), [GDC Vault](https://gdcvault.com/play/1027721/The-Art-of-Sable-Imperfection) **[S]** |
| **Tunic** | Clean low-poly water with soft shore bands under a strong tilt-shift style | No breakdown of the water found | **[I]** |
| **Alba** | Built "with big considerations for the mobile platform": gradients and decals instead of tiling textures, no normal maps, baked light, LODs, four terrain splats. A simple lapping-wave ocean shader is attributed to its artist | The water breakdown itself is only a social-media thread | [ustwo's environment art](https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/) **[P]**; [80.lv](https://80.lv/articles/a-low-cost-solution-for-stylized-oceans-in-games) **[S]** |
| **Mario Odyssey, Seaside Kingdom** | Warm cliffs over a soda-blue sea; seeing underwater is the reward | No rendering breakdown found | via [sunshine-look](sunshine-look.md) **[P/I]** |
| **RiME** | Simple textures with UV distortion, geometry plus normal manipulation for stylised water | Talk slides, not read | [Unreal Fest Europe 2018](https://www.unrealengine.com/events/unreal-fest-europe-2018/stylized-vfx-in-rime) **[P, abstract]** |

**The common stylised recipes** ([Ameye](https://ameye.dev/notes/stylized-water-shader) is the clearest single write-up **[P]**): colour from water depth (needs the depth texture), refraction by distorting screen UVs (needs the opaque colour texture and depth), surface foam from scrolled and distorted texture with a cutoff (texture only), intersection foam from a depth difference (depth texture), vertex Gerstner waves (needs vertices), and an optional planar reflection camera. Godot's community "Y2K / 6th gen" water, explicitly after Morrowind and Sunshine, is just one scrolling normal map on a smooth metallic surface with fixed alpha ([godotshaders](https://godotshaders.com/shader/y2k-6th-gen-water/), GPL-3) **[P]**: it shows how little reads as that era. Ned Makes Games demonstrates authored mip chains and the Nintendo trick in Unity ([notes](https://nedmakesgames.github.io/blog/mipmaps), videos not watched) **[S]**.

### What the engines ship, and where Sunshine departs

- **Unity URP** ships no water; it offers an **Opaque Texture** (a GrabPass-like copy before transparents, for refraction and heat haze) and a **Depth Texture**. Unity's own mobile/XR guidance says both cause extra copies and GMEM loads and should be off unless needed; enabling the depth texture splits the merged native pass and adds a final blit, "potentially high cost" on low-end mobile; without StoreAndResolve, the opaque texture makes URP ignore MSAA; copying depth after transparents saves bandwidth when transparents need no depth ([URP asset](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@14.0/manual/universalrp-asset.html), [Universal Renderer](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@16.0/manual/urp-universal-renderer.html), [untethered XR](https://docs.unity3d.com/6000.1/Documentation/Manual/xr-untethered-device-optimization.html), [Unity 6.3 on-tile post](https://discussions.unity.com/t/performant-and-energy-efficient-rendering-with-render-graph-and-on-tile-post-processing-for-untethered-xr-in-unity-6-3/1703007)) **[P, from search excerpts of these pages]**. Unity's mobile sample water ([Boat Attack](https://github.com/Unity-Technologies/BoatAttack)) uses Gerstner waves and a planar reflection pass **[S]**. **HDRP's water system** is an FFT with three simulation bands, desktop/console only ([quality and performance](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-quality-and-performance-decisions.html)) **[S]**: that is the Ultra Water class.
- **Unreal** ships the Water plugin with Gerstner waves only and the **Single Layer Water** shading model (absorption, scattering, refraction, SSR in one custom pass); on mobile and low-end desktop it falls back to a plain translucent material without volume integration or SSR, and can downsample scene colour and depth for refraction ([Single Layer Water](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine), [Water Waves](https://dev.epicgames.com/documentation/unreal-engine/simulating-waves-using-the-water-waves-asset-in-unreal-engine)) **[P]**.
- **Godot** ships no water; spatial shaders read `hint_depth_texture` and `hint_screen_texture`, the screen copy taken after opaques and before transparents ([screen-reading shaders](https://godot.readthedocs.io/en/4.2/tutorials/shaders/screen-reading_shaders.html)) **[P]**.

**Where Sunshine departs:** all three engines' default water reads the depth and usually the colour of the opaque scene. Sunshine's main sea reads neither: it gets depth from nothing (colour is authored), transparency from blending, sparkle from mip selection and reflection from a painted band. Its only screen read is a quarter-size 16-bit copy for the shimmer model. Boogle's current water is the full engine recipe and then some (a four-cascade FFT, caustics, refraction with retreat taps). That is the gap the owner is pointing at.

## Mobile limits that matter here

1. **Tile-based GPUs pay for every pass split.** Apple GPUs shade in on-chip tile memory and write each tile out once at the end of a pass; load and store actions move attachments in and out, and memoryless/transient attachments avoid memory entirely ([Apple: TBDR](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering), [WWDC20 10632](https://developer.apple.com/videos/play/wwdc2020/10632/)) **[P]**. In three r187, `copyFramebufferToTexture` **ends the current render pass, copies, and begins it again with `loadOp: load`** (`WebGPUBackend.js`, read locally) **[L]**. Each of the water's two viewport reads is therefore a store-and-reload of the whole scene target.
2. **Blending defeats hidden-surface removal.** On Apple GPUs an opaque surface drawn over the seabed stops the seabed from being shaded at all; a blended one does not **[P/I]**. The seabed under Boogle's sea carries the receiver patch (shore fields, swash, caustics), so it is not free.
3. **MSAA with transparency and copies.** Desktop keeps 4× scene MSAA with stored samples (touch devices have none, owner call of 4 November; discarding samples blanked iPad Safari 27) **[L]**. A pass split stores and reloads all four samples.
4. **Full-resolution float targets.** The scene target is linear HDR RGBA16F. At the owner's Mac resolution a full-size RGBA16F copy is 46 MB; at the phone's 0.55 MP, 4.4 MB **[D]**.
5. **Big branchy shaders.** Dynamic loops and many live values lower occupancy; a loop whose length is a uniform (Boogle's contact loop) runs for every pixel inside its distance **[I]**.
6. **WebGPU on iOS Safari.** WebGPU is on by default from Safari 26. The spec's baseline limits (8192 2D texture size, 256 MB buffers, 16 sampled textures per stage) are what to design against ([MDN `GPUSupportedLimits`](https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits), [web3dsurvey iOS](https://web3dsurvey.com/webgpu/limits/maxSampledTexturesPerShaderStage/platform/iOS)) **[P]**; Boogle's `?gpuProfile=portable` already requests them, but the iPhone's actual limits have not been captured **[L]**. Float32 filtering and blending are optional features; the water uses half floats, which is right.
7. **Tab memory, not device memory.** iOS kills a Safari tab at a per-process limit and reloads it; WebKit charges the GPU process's memory for a tab to that tab ([WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782); a WebGPU command-encoder growth report, [WebKit 303203](https://bugs.webkit.org/show_bug.cgi?id=303203)) **[S]**. Every megabyte the water keeps resident counts. This is context for the freeze, not a diagnosis of it.

## Boogle's water today, by part

From [`water-render.ts`](../../src/render/water-render.ts) and [`src/render/water/`](../../src/render/water/) at `d07206a9`. **From code, not measured.** Resolutions: the owner's Mac is 2712×2110 at DPR 2, **5.72 MP** (2.06 MP after his drop to 1.2×); the nightly bench is 2560×1600, 4.10 MP; the iPhone Air in landscape is 912×420 points, DPR capped at 2 and the touch water ceiling of 0.6, so **1094×504, 0.55 MP** **[D]**.

| Part | What runs | Targets and buffers (Mac / phone) | Samples | Draws, passes |
| --- | --- | --- | --- | --- |
| **Surface mesh** ([surface.ts](../../src/render/water/surface.ts)) | Camera-centred polar grid: 384 spokes × 504 rings = **193,537 vertices, about 386k triangles**; the phone's sea rung halves spokes (about 51k vertices) **[D]** | Index and vertex buffers, about 8 MB | **~10–20 fetches per vertex**: shore atlas (1, plus 4 loads for exact bed), surf, three FFT displacement cascades, travel time near shore, a second bed lookup for the clamp; region search over 8 providers per lookup | 1 draw, transparent, premultiplied, double-sided |
| **Surface pixel, above water** | Four FFT slope cascades with variance, two breaking-shore trains, 8 ripple slots, Kaplanyan AA, refraction with three retreat taps, Beer–Lambert body, sub-surface scatter, surf turbidity, GGX sun, **Poisson glitter** (two footprint levels, two draws each, up to 14 loop steps), up to three foam layers, fog to sky | Reads the two copies below | **23–27 fetches on open sea, up to ~35 at the shore** (11 FFT, 1–5 shore, 6 depth, 2 colour, 3 sky cube, 0–7 foam) **[D]**; plus the contact loop | — |
| **Contact loop** ([contacts.ts](../../src/render/water/contacts.ts)) | Every water pixel within **180 m** loops over **every** registered contact (up to 512), with no spatial culling. Rail trestles register **four legs every 6.5 m** where the bed is ≥1.2 m below the rail ([rail.ts](../../src/proto/place/rail.ts)), so Far Head's 260 m trestle alone can register up to ~160, with the pier, crossings and rocks on top **[D]** | 8 KB uniform array | N buffer reads and N lengths per pixel | — |
| **Opaque colour copy** | `viewportTexture`, HDR RGBA16F at scene size | **46 MB / 4.4 MB** | 2 per pixel | **1 pass split** |
| **Opaque depth copy** | `viewportDepthTexture` | **23 MB / 2.2 MB** (more if the 4× samples are copied; not checked) | 6 per pixel | **1 pass split** |
| **FFT** ([fft.ts](../../src/render/water/fft.ts)) | **10 compute dispatches a frame** (rows, columns, 8 mip levels) over four 256² cascades | ≈ **23 MB**: two displacement arrays and moments with mips (≈ 8.4 MB), two ping-pong buffers (≈ 11 MB), H0 (4 MB) **[D]** | — | 10 dispatches |
| **Caustics producer** ([caustics.ts](../../src/render/water/caustics.ts)) | Every frame: two render passes into **4×-MSAA** 512² R16F and 256² RG16F targets, three refracted grids (about 56k triangles, four bilinear taps per vertex), then mip generation (three's per-level passes, not in `perf` pass counts) | ≈ 4 MB | 2 caustic taps per receiver pixel | 2 passes, 3 draws, plus mip passes |
| **Receivers** ([receivers.ts](../../src/render/water/receivers.ts)) | Terrain, rocks and supports near water: wetness, swash, absorption, caustics within 24 m | — | shore fields + 2 caustic taps per receiver pixel | in their own draws |
| **Shore atlas** ([shore-providers.ts](../../src/render/water/shore-providers.ts)) | 8 layers of 672² bed, distance, travel time and surf | **72 MB** (the code's own `textureBytes`) **[D]**; CPU eikonal solve about 0.9 s per shore at load (measured 3 November, [water-load-stall](water-load-stall.md)) | — | — |
| **Queries** ([queries.ts](../../src/render/water/queries.ts)) | One compute dispatch a frame for player, ball, camera and floaters, each inverting the horizontal displacement four times; async readback | small | — | 1 dispatch |
| **Underwater** ([underwater.ts](../../src/render/water/underwater.ts), [snow.ts](../../src/render/water/snow.ts)) | 64×36 lens compute every frame; half-resolution shaft target updated only near water; composite inside the existing output pass; 6,000 snow sprites only when submerged | small | — | 1 dispatch; shafts only near |
| **Spray** ([spray.ts](../../src/render/water/spray.ts)) | Shared particle pool, ≤96 births a frame, 420 a second; about 440 a second at the pier head in the playdata | pool's 195 KB | — | in the pool's one draw |
| **Foam texture** | 512² RGBA8, baked on the CPU at load | 1.4 MB | — | — |
| **Sky cube** (shared with sky, fog, PBR) | 1024² RGBA16F cube, full mips, baked once | **67 MB** (the code's `cubeTexelBytes`) plus three's PMREM of `scene.environment`, not accounted **[D]** | 3 per water pixel | — |

**The scene target around it:** desktop 4× MSAA RGBA16F with depth is about 48 bytes a pixel, **275 MB at 5.72 MP**; the phone, without MSAA, about 12 bytes a pixel, 6.6 MB **[D]**. Each pass split stores and reloads that, so the two copies move roughly **1.1 GB a frame on the owner's Mac** before compression, about 3 ms at 350 GB/s, and about 27 MB on the phone **[D/E]**.

**Water-owned GPU memory:** about **170 MB** before the copies (atlas 72, FFT 23, caustics 4, foam 1.4, plus the 67 MB cube it shares), plus 6.6 MB of copies on the phone **[D]**.

**Two things in the code that line up with where the trouble was:**

1. **The contact loop** is per pixel, scales with the number of trestle legs within reach, and both incidents were where the sea is full of legs: the pier head and Far Head at the end of its 260 m trestle **[D/I]**. It is the first thing the measurement job should time (hide the contacts, same pose).
2. **On touch devices the resolution cannot fall.** Scene pixels are `MAX_DPR × min(adaptive ratio, water ceiling)`; with the touch ceiling at 0.6 and the adaptive floor at 0.6, the phone's scene is at its lowest from the first frame, and "dropped to the lowest resolution scale" changed only the output canvas ([quality.ts](../../src/render/quality.ts)) **[D]**. On phones, relief can only come from cheaper shading.

**Existing measurements to anchor estimates** (all M1 Max, contended, whole frame, not water alone): shore camera 6.3–7.0 ms at 1210×702 and 10.9–21 ms at 2880×1800 ([bloom verification](../game-design/water.md#bloom-verification-3-november-2026)); far pose 11.8–14.4 ms at 2560×1600, and the phone ladder's "simpler sea" saving 0.4–0.8 ms for three quarters of the sea's triangles ([performance §7](performance.md)); shore 9.6–11.3 ms at 1440×900 with caustics, spray, snow and shafts each within noise ([graphics-switch-costs](graphics-switch-costs.md)). The shore pair implies **1.1–3.3 ms of pixel-proportional work per megapixel** for that view; that is the scale the water's per-pixel cost lives on **[D]**. No measurement isolates the water.

## What gameplay needs from the water, and what can go

**Keep (every candidate):**

- **The `waterField` contract** ([water-field.ts](../../src/physics/water-field.ts)): `height`, `verticalVelocity`, `bedHeight`, `body`, `normal` for the player's swimming and plunge, the ball, the camera's underwater check, gifts, mushrooms, fish and gulls. Swimming is surface swimming; fast falls carry you under and buoyancy brings you up (owner, 3 November). The fall-in recovery reads the same samples, and its own "back in the water" bug (nine recoveries at about (1000, 28)) is queued separately: keep the contract so that fix is unaffected.
- **The underwater look**: tint and exposure offset, surfacing droplets, marine snow when the camera dips under (owner, 3 November). Underwater depends on `Ocean.heightAt` and the camera depth from the lens kernel, so a new surface must keep that interface.
- **Splash ripples** (`seaRipples`, eight slots): cheap analytic rings, and Sunshine has them too.
- **The shore**: the arrival cove, wet sand and a readable waterline; the terrain pass waits on the water (owner, 4 November).
- **The pier and the trestle crossing**: legs need a contact that reads (a foam ring), the deck reads over water, and trains cross at 20 m/s, so sparkle must not crawl at speed ([sunshine-look](sunshine-look.md) on temporal aliasing).
- **The sea gate and buoys**: the gate is geometry; the buoys bob on their own CPU sine at 0.7 ± 0.25 m ([props.ts](../../src/proto/place/props.ts)), so the water's mean level must stay at sea level and its swell small.
- **Things that float**: no boats today; the ball, gifts and mushrooms take height and normal from `waterField`.
- **The telescope view** ([telescope.ts](../../src/proto/place/telescope.ts)): 48° divided by zoom, looking across the sea; a footprint-driven sparkle band stays coherent when zoomed, a fixed-distance one would not.

**Can go on the cheap candidates:** the FFT and its readback queries (a CPU swell function answers `waterField` with no latency); breaking-shore wave trains and the eikonal travel-time solve (about 0.9 s of load per shore); Poisson glitter; GGX and Kaplanyan AA; refraction and both screen copies; surf turbidity; the caustics producer (a scrolling caustic texture on the seabed instead); the per-pixel contact loop (a baked ring texture instead); most of the 72 MB atlas (only the bed is needed); breaker-driven spray (keep splashes and impact spray).

## Numbered recommendations

1. **Swap the surface, keep the contract.** Build the new waters as alternative `Ocean` implementations behind `?water=`, sharing `waterField`, underwater, ripples, receivers and spray seams. Ultra stays the default and the control until the owner picks ([plan](../plans/water-sunshine.md)).
2. **Use Sunshine's recipe on one plane with no screen read** for the first candidate: two scrolling samples of our own small wave texture, colour from the bed, blending for clear shallows, an analytic sky band for reflection, a sun lane, haze to the horizon. About 5 fetches a pixel, no pass split.
3. **Make the mip trick resolution-proof.** Choose the band from the computed texture footprint (`log2` of world metres per pixel × texels per metre), the same value the GPU uses, rather than relying on authored mip levels alone: it then survives DPR, the 0.6 water ceiling, the telescope's zoom and the summit's height. Keep an authored mip chain (`DataTexture.mipmaps`, supported by r187's WebGPU texture upload) as an A/B variant.
4. **Get depth only where foam needs it.** The second candidate adds one depth copy (one pass split, no colour copy) for intersection foam on legs, rocks, swimmers and buoys and a soft waterline. If refraction shimmer is wanted later, copy colour at half size, as Sunshine did.
5. **Replace the contact loop with a baked ring texture** in the new waters, and ask the measurement job to time the current loop at the pier head and Far Head.
6. **Light the water with the frozen sky's sun and fill**, not fixed display colours, so the fixed 0.12 gain, Neutral and the evening look keep working; author the ramp against the Fresh sand and grass.
7. **Judge on the four places and the phone**: seeded stills and real-time clips at the cove shore, the pier head, Far Head and the summit, `npm run perf` at those poses, and a two-minute phone check.
8. **Sequence the look work**: water first, then one lighting-and-grade board (sky ramp, sun colour, ambient, a gentle tone choice), then toon shading on the environment before characters. The plan's open questions carry the recommended answers.

## What the measurement job should confirm

These numbers come from code; the measurement job's should agree, and where they differ theirs win:

- Render passes per frame at the pier head, with and without the sea (expected: two extra splits from the water's colour and depth reads, two caustic passes, plus mip passes).
- Offscreen targets and sizes: the colour copy (RGBA16F, scene size), the depth copy, the two 4× caustic targets (512² R16F, 256² RG16F), the shaft target (half size) and the 1024 sky cube.
- Compute dispatches: 10 FFT, 1 query, 1 lens.
- The number of registered water contacts at the pier head and Far Head (`waterContacts()` in [contacts.ts](../../src/render/water/contacts.ts)), and the GPU time with the contact count forced to zero at the same pose.
- Scene pixels on the iPhone Air before and after the scaler drops (expected unchanged at about 0.55 MP).
- **Missing and essential:** the GPU time with the sea hidden at the four poses on the Mac and on a phone. Without it, every candidate saving in the plan is a ratio of an unknown; it is the one number the comparison cannot do without.

## Sources

Super Mario Sunshine:

- Jasper St. Pierre, [Deconstructing the water effect in Super Mario Sunshine](https://blog.mecheye.net/2018/03/deconstructing-the-water-effect-in-super-mario-sunshine/) (2018), including his comment on the near-player wave mesh **[R]**.
- noclip.website: [`src/InteractiveExamples/SunshineWater.ts`](https://github.com/magcius/noclip.website/blob/main/src/InteractiveExamples/SunshineWater.ts) (the `_umi` material on a quad, TEV stages, `sea.btk`, the nomip/noalpha/noblend variants) and [`src/j3d/sms_scenes.ts`](https://github.com/magcius/noclip.website/blob/main/src/j3d/sms_scenes.ts) (sky, main and indirect passes; `seaindirect` bound to the resolved opaque scene; `LightConfig`) **[R]**, read through the GitHub API this session.
- PCPer's [summary of the same article](https://pcper.com/2018/03/the-graphics-technology-of-super-mario-sunshine/) **[S]**.
- The decompilation's `ScreenUtil`, `Shimmer`, `MapMirror`, `sunmodel`, `lensglow`, `lensflare`, `LightUtil` and `ShadowUtil`, as cited with pinned links in [sunshine-rendering](sunshine-rendering.md) and [sunshine-look](sunshine-look.md) **[R, not re-read]**.

The family and the engines:

- Simon Schreibt, [Zelda Wind Waker: Hyrule travel guide](https://simonschreibt.de/gat/zelda-wind-waker-hyrule-travel-guide/); [Polycount thread](https://polycount.com/discussion/180024/animated-ocean-texture-maya) **[S]**.
- Alexander Ameye, [Stylized water shader](https://ameye.dev/notes/stylized-water-shader).
- [How Shedworks refined the art of Sable](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability); [The Art of Sable](https://gdcvault.com/play/1027721/The-Art-of-Sable-Imperfection) **[S]**.
- ustwo games, [The environment art of Alba](https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/); 80.lv, [A low-cost solution for stylized oceans](https://80.lv/articles/a-low-cost-solution-for-stylized-oceans-in-games) **[S]**.
- Unreal Fest Europe 2018, [Stylized VFX in RiME](https://www.unrealengine.com/events/unreal-fest-europe-2018/stylized-vfx-in-rime) (abstract).
- [Y2k/6th Gen Water](https://godotshaders.com/shader/y2k-6th-gen-water/) for Godot; Ned Makes Games, [Texture mipmaps](https://nedmakesgames.github.io/blog/mipmaps) **[S]**.
- Unity: [URP asset](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@14.0/manual/universalrp-asset.html), [Universal Renderer](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@16.0/manual/urp-universal-renderer.html), [untethered XR optimization](https://docs.unity3d.com/6000.1/Documentation/Manual/xr-untethered-device-optimization.html), [on-tile post in 6.3](https://discussions.unity.com/t/performant-and-energy-efficient-rendering-with-render-graph-and-on-tile-post-processing-for-untethered-xr-in-unity-6-3/1703007), [HDRP water quality and performance](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/water-quality-and-performance-decisions.html), [Boat Attack](https://github.com/Unity-Technologies/BoatAttack) **[S, search excerpts]**.
- Unreal: [Single Layer Water](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine), [Water Waves](https://dev.epicgames.com/documentation/unreal-engine/simulating-waves-using-the-water-waves-asset-in-unreal-engine).
- Godot: [Screen-reading shaders](https://godot.readthedocs.io/en/4.2/tutorials/shaders/screen-reading_shaders.html).

Mobile and WebGPU:

- Apple, [Tailor your apps for Apple GPUs and tile-based deferred rendering](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering); [WWDC20: Optimize Metal performance for Apple silicon Macs](https://developer.apple.com/videos/play/wwdc2020/10632/).
- MDN, [GPUSupportedLimits](https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits); [web3dsurvey, iOS limits](https://web3dsurvey.com/webgpu/limits/maxSampledTexturesPerShaderStage/platform/iOS).
- WebKit bugs [300782](https://bugs.webkit.org/show_bug.cgi?id=300782) and [303203](https://bugs.webkit.org/show_bug.cgi?id=303203) **[S]**.

Local: three r187 `src/renderers/webgpu/WebGPUBackend.js` (`copyFramebufferToTexture`) and `utils/WebGPUTextureUtils.js` (authored `mipmaps` upload), read in the main checkout's `node_modules`.
