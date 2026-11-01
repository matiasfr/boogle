# Stylized rendering on a mobile-friendly budget (browser/indie games, for Boogle)

## What does iPhone/iPad hardware reward and punish (the cost model)?

### Takeaway
Apple GPUs are tile-based deferred renderers: opaque geometry is nearly free to overdraw because hidden fragments are rejected before shading, while alpha blending, `discard`/alpha-test, and extra render passes (load/store of full-screen targets) are where the cost lives. Draw calls cost CPU (WebGL driver) time; fill rate and bandwidth cost GPU time.

### Cited Findings
- TBDR GPUs process all of a render pass's geometry per tile and "discard any occluded (or concealed) primitives" before fragment shading; tile memory has bandwidth and latency "many times" better than device memory — [Apple: Tailor your apps for Apple GPUs and TBDR](https://developer.apple.com/tutorials/data/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering.md)
- "Opaque fragments allow HSR to eliminate the most work"; alpha-tested (discard) foliage is a "feedback" fragment, blended effects are "translucent"; recommended order is opaque, then feedback, then translucent; alpha blending and alpha testing make fragments non-opaque and cost HSR efficiency — [Apple WWDC20 "Optimize Metal apps and games with GPU counters"/Apple GPU session 10632](https://developer.apple.com/videos/play/wwdc2020/10632)
- Load and store actions "consume the majority of your app's system bandwidth"; a depth pre-pass for performance is unnecessary on Apple GPUs — [Apple WWDC20 10632](https://developer.apple.com/videos/play/wwdc2020/10632)
- Apple GPUs are optimized for 16-bit types; half precision raises occupancy and uses faster ALU — [Apple WWDC20 10632](https://developer.apple.com/videos/play/wwdc2020/10632)
- Apple's MSAA tracks per-pixel edges and only blends per-sample when needed (MSAA is efficient on TBDR) — [Apple TBDR article](https://developer.apple.com/tutorials/data/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering.md)
- Three.js postprocessing on iPhone: adding passes such as LUT and SMAA produced black streaks on iPhone/MacBook but not on a Snapdragon 888 Android — [three.js forum #55245](https://discourse.threejs.org/t/streaks-appear-after-postprocessing-is-enabled-on-apple-devices-iphone-macbook/55245.md)
- The pmndrs `postprocessing` library merges effects into fewer passes and uses MSAA rather than a post-AA pass; one commenter believes it is fast enough on mobile (anecdotal) — [three.js forum #17604](https://discourse.threejs.org/t/dodecahedron-ballpit/17604)
- A vendor blog estimates 5–10 ms per full-screen effect on mid-tier mobile (unverified marketing figure) — [svilenkovic.com](https://svilenkovic.com/3d/three-js-postprocessing)
- `MeshStandardMaterial` is "somewhat more computationally expensive" than Lambert/Phong; it shades per fragment — [three.js docs MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html)

### Inferences
- For Boogle, every look should be done "in-material" in the existing forward pass rather than as post-processing; a full-screen pass at DPR 2 on an iPad means re-reading/writing millions of pixels per frame.
- Transparent water over most of the screen is the biggest non-opaque surface in Boogle; any new layered transparency (god-ray cones, fog cards, grass cards) adds to that.
- Prefer opaque geometric grass/foliage over alpha-tested cards on iOS.

### Gaps
- No rigorous public benchmark of per-pass cost in three.js on specific iPhone/iPad models. Measure with `npm run perf` (counts) and on-device timing.

## Water and shorelines: foam, depth tint, caustics

### Takeaway
Stylized water across the references is a depth-to-color ramp plus a foam mask derived from water depth, plus cheap animated patterns; the robust web variant uses vertical depth (water height minus ground height) rather than the camera depth buffer. Boogle already does exactly this via a heightmap texture, so the gains are in art direction (banding, animated shore lines, caustics), not new passes.

### Cited Findings
- The common three.js approach compares water depth with the scene depth texture and smoothsteps the difference into foam over a depth color ramp — [three.js forum: unlit water with foam](https://discourse.threejs.org/t/unlit-water-shader-with-foam/11641); [MasterAllArts stylized water lesson](https://masterallarts.pages.dev/learn/threejs-from-zero/s12-06-stylized-water-foam/)
- Camera-depth foam breaks as the camera moves; a commenter suggests the inverse terrain heightmap for shorelines — [three.js forum: unlit water with foam](https://discourse.threejs.org/t/unlit-water-shader-with-foam/11641)
- Elysium (vanilla three.js stylized world): depth-based water had banding on some Android devices; foam vanished at grazing angles; suggested fix is vertical depth for foam and vertical depth plus Fresnel for color — [Elysium thread](https://discourse.threejs.org/t/elysium-the-most-beautiful-stylized-world-on-the-web/55541)
- Toon water tutorial (PlayCanvas with three.js port) draws foam lines from the depth buffer where objects meet the surface — [Tutsplus toon water part 1](https://code.tutsplus.com/creating-toon-water-for-the-web-part-1--cms-30447t)
- A Wind Waker–style water shader builds foam procedurally from ~100 circles per tile, called twice per fragment, plus 6-octave fBm (~24 hash evaluations) — heavy fragment cost; vertex waves are cheap but need a ~100×100 subdivided plane — [godotshaders: Wind Waker water](https://godotshaders.com/shader/wind-waker-water-no-textures-needed/)
- Cheap caustics: sample a black-and-white caustics texture twice at different scales, scroll over time, multiply with ground albedo — [godotshaders: cheap caustics](https://godotshaders.com/shader/chaep-caustics-unshade/); UE4 version costs 49 instructions and 1 texture sample, fading by depth — [Medium: Cheap water caustics in UE4](https://medium.com/hri-tech/cheap-water-caustics-in-ue4-ee1d3ac0cae1); Voronoi-based patterns are the common source — [lesterbanks / Polyfjord](https://lesterbanks.com/2021/09/an-easy-way-to-fake-caustics-in-blender/)

### Codebase findings (Boogle)
- Sea: one 1300 m plane, 100×100 segments, transparent `ShaderMaterial`; depth = water y minus ground decoded from a 16-bit heightmap `DataTexture`; two-stage depth color ramp, sine normals, specular, Fresnel to sky tint, shoreline foam band `1 - smoothstep(0, 0.6, depth)` with a sine ripple, 8 splash rings, linear fog, alpha 0.5→0.97 by depth — `src/render/water-render.ts`
- Sim water (streams/ponds): separate mesh on the sim grid, per-vertex depth+flow attribute, flow streaks, edge foam, shares uniforms with the sea — `src/render/water-surface.js`
- No depth texture or postprocessing anywhere in `src/` (grep for EffectComposer/RenderPass found none).

### Inferences
- Boogle already has the "vertical depth" approach the Elysium thread recommends, without a depth pre-pass; adding toon banding (posterize the depth ramp into 3–4 bands), a second moving shore line (foam line that advances/retreats with a tide phase), and caustics on shallow sand are all ALU-only additions to an existing draw.
- Caustics can live in the water fragment shader for shallow depth (tint the water where depth < ~1.5 m) instead of the terrain shader — zero new draws; or in the terrain via `onBeforeCompile` sampling the same height texture plus sea level.
- Wind Waker's literal procedural-circle foam is too heavy per pixel for full-screen sea on iPad; a small tiled foam texture (or a cheap Voronoi in a 64–128 px texture) gets the look for one sample.

### Gaps
- No primary Nintendo source on Wind Waker's water implementation was found.

## Foliage and grass wind

### Takeaway
Wind is a cheap vertex-shader sine plus noise; the cost on mobile is vertex throughput and (for cards) overdraw/alpha-test. Chunked/tiled instancing with coarse culling beats per-instance culling. BotW-style toon grass uses plain-colored geometric blades.

### Cited Findings
- keaukraine (WebGL vegetation): instanced grass with per-instance transforms in a float texture; 4×4 tiled culling with padded tiles; low-end Android bottlenecked by vertex shaders, so the app lowers density and disables wind there; per-instance CPU culling took ~10 ms plus ~20 ms of `texSubImage2D`, tiled culling ~1 ms; ants 68 instances in 2 draw calls — [keaukraine, Efficient WebGL vegetation rendering](https://dev.to/keaukraine/efficient-webgl-vegetation-rendering-4g2g)
- Draw order: large near objects first to exploit z-buffer, then ground objects, then sky — [keaukraine](https://dev.to/keaukraine/efficient-webgl-vegetation-rendering-4g2g)
- Forum: a ~20-triangle blade across millions of instances is over budget; two-triangle textured quads scale to a few million; sort instances front to back to reduce overdraw — [three.js forum: Optimizing 3M instanced grass](https://discourse.threejs.org/t/performance-optimizing-3m-instanced-grass-in-three-js/81286)
- Codrops "fluffiest grass": sine wind plus scrolling noise texture; lighting and shadows were among the costliest parts, limited to one directional light (from search snippet; page returned 403) — [Codrops](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/)
- Billboards are cheap but look flat up close and can't sway like blades; geometry blades give the "inside a field" feeling; BotW uses geometry blades, practical because of its cartoon style with plainly colored blades — [hexaquo grass series part 1](https://hexaquo.at/pages/grass-rendering-series-part-1-theory/)
- BotW grass appearance is often attributed to subsurface-like lighting with low-poly blades (forum speculation) — [Unreal forum: BotW grass style](https://forums.unrealengine.com/t/botw-grass-style/437647)
- Elysium has wind-swayed foliage and player-reactive grass, with graphics presets (Extreme = fluffiest grass) — [Elysium thread](https://discourse.threejs.org/t/elysium-the-most-beautiful-stylized-world-on-the-web/55541)

### Codebase findings (Boogle)
- Terrain is vertex-colored with grass above ~1.35 m (`src/adapters/terrain.ts` `paintVertex`); palms are merged into a single props mesh, fronds are 4-sided cones, `MeshStandardMaterial` flat shaded, cast/receive shadow — `src/render/props.ts`.

### Inferences
- Palm-frond sway can be added to the existing merged props mesh with a per-vertex sway-weight attribute and `onBeforeCompile` — zero new draw calls (also affects the shadow pass if the depth material is patched too, or leave shadows static).
- Grass tufts: one `InstancedMesh` per terrain chunk (or a single InstancedMesh with coarse chunk culling), opaque 3–5-triangle tufts colored from the terrain palette, wind in vertex shader, density halved on `isTouch`; hide tufts where `editDelta` has dug/piled sand. Purely cosmetic so `Math.random` is fine, but seeding from the terrain RNG keeps all clients looking alike.

### Gaps
- No device-specific grass benchmark on iPhone/iPad was found.

## Fog and god rays on a budget

### Takeaway
Fog is the single most cited readability tool in stylized games (Sable), and it is free in-material. God rays in cheap form are additive/translucent cone or card meshes with gradient falloff and scrolling noise; screen-space god-ray passes are the expensive version.

### Cited Findings
- Sable: distant fog is "really, really key" for mid-to-long-distance readability, customized per biome, and is the framework for the day-night cycle; lighting, fog and lines restore depth lost to flat shading — [Game Developer, GDC 2022 Sable](https://gamedeveloper.com/gdc2022/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability)
- Cheap god rays: cone mesh, additive blend, 1D gradient alpha, scrolling noise for dust, Fresnel fade — [godotshaders: Fake Godrays](https://godotshaders.com/shader/fake-godrays-godot-4-2/); vendor claims the transparent-cone approach is cheap enough for mobile/VR — [FakeLight on itch.io](https://realanthonycolmenero.itch.io/fakelight); transparent mesh shaped to the shaft as the cheap alternative to "true" god rays — [Unity discussions](https://discussions.unity.com/t/volumetric-lighting-for-moving-lights-with-unity-pro-for-webplayer/17173)
- three.js ships a screen-space `GodRaysShader` (radial blur post-process) — [three.js docs GodRaysShader](https://threejs.org/docs/pages/module-GodRaysShader.html)
- BotW is described (community analysis) as having full volumetric lighting, Rayleigh/Mie scattering and fog inscatter — [ResetEra BotW technical analysis](https://www.resetera.com/threads/zelda-breath-of-the-wild-the-technical-analysis.8197)

### Codebase findings
- Linear `THREE.Fog` 110–520 m; the water shaders reimplement fog with shared `uFog` uniforms; day/night drives fog color (`src/render/scene.ts`, `src/render/sky.ts`).

### Inferences
- Height fog / sun-direction-tinted fog (fog color shifts toward the sun glow color when looking toward the sun) is an in-shader change; three.js built-in fog chunk can be overridden globally via `ShaderChunk.fog_fragment` replacement so all materials pick it up — no new draws.
- Golden-hour light shafts: a handful of additive cones near the horizon sun or under the palm canopy; keep them small on screen (blended fill), fade by time of day. Skip screen-space god-ray post on iOS.

### Gaps
- No primary source on BotW's actual god-ray implementation.

## Fake GI and ambient occlusion

### Takeaway
High-end indie (Tiny Glade) uses real-time GI with ReSTIR-style techniques on desktop Vulkan — not transferable to a mobile browser. The budget path is baked/vertex AO, hemisphere ambient with ground bounce color, and contact/blob shadows.

### Cited Findings
- Tiny Glade built its own Vulkan renderer to "control pretty much the whole pipeline", needed compute shaders, and did GPU procedural generation — [80.lv Tiny Glade interview](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games)
- A post by Tiny Glade's rendering engineer describes raising shadow-casting light limit from 32 to 32k at similar cost, using half-resolution ReSTIR with 8 random reservoir samples per full-res pixel (attribution to Stachowiak not fully verified by the search tool) — [Bluesky h3r2tic](https://bsky.atproto.gaycatgirl.sex/@h3r2tic.bsky.social/3lclorzdibv2a)
- Stachowiak's kajiya renderer combines ReSTIR first bounce with a sparse voxel irradiance cache — [lousodrome overview of kajiya GI](https://lousodrome.net/blog/light/2022/06/)
- A Townscaper-like city builder (Björn Ottosson) experiments with SSAO/GT-VBAO and distant light sampling — [80.lv](https://cdn.80.lv/articles/screen-space-ambient-occlusion-test-for-upcoming-cozy-city-builder)
- AO approximates exposure to ambient light, is non-directional, often a post effect — [Wikipedia: Ambient occlusion](https://en.wikipedia.org/wiki/Ambient_occlusion)

### Codebase findings
- Terrain already bakes shading into vertex colors: hollows darken by Laplacian, crests brighten, steep edited faces darken — `src/adapters/terrain.ts`; scene lighting is a `HemisphereLight` (sky blue / sand ground) plus one shadow-casting directional light; shadows are skipped at night (recent commit).

### Inferences
- Extend vertex-baked AO: a heightfield horizon/occlusion term computed on CPU when cells refresh (already done per-edit region), plus AO darkening at the base of palms/rocks; blob shadows (one instanced quad set) for ball/players at night when the shadow pass is off.
- The hemisphere light is already a cheap "GI": tint its ground color by what's below (wet sand vs grass) is not per-object; better to keep and tune per time of day.

### Gaps
- No primary source on Townscaper's own AO/lighting technique was found.

## Skies and day/night color grading

### Takeaway
Stylized day/night is usually palette-driven: a sky gradient lerped by sun height with a separate horizon glow, and a per-time-of-day grade. On mobile the grade is best applied as uniforms inside each material rather than a LUT post-process.

### Cited Findings
- Lerp day and night gradients by the sun's vertical position, with sunset color only near the horizon when the sun is low; cloud colors can look wrong (bright white) at night if not driven by the cycle — [search summary of shader tutorial and UE forum](https://forums.unrealengine.com/t/ue4-skysphere-blueprint-color-curve-assets/316885)
- One UE developer used 15 time-of-day LUTs plus blend LUTs between adjacent pairs — [UE forum: Advanced daylight system with colour grading](https://forums.unrealengine.com/t/advanced-daylight-system-with-colour-grading/28489)
- A Short Hike: low-res render scaled up without AA, flat cohesive shading, soft outlines; post-processing for color grading per community reports — [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/); [itch.io comment](https://itch.io/post/2065934)
- Sable uses fog as the framework for day-night tone and added moonlight shadows so players cast shadows as often as possible — [Game Developer](https://gamedeveloper.com/gdc2022/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability)

### Codebase findings
- `src/render/sky.ts` already has day/set/night palettes for sky top/horizon, glow, water tint, sun/moon light colors, hemisphere colors and cloud emissive; sky is a gradient sphere with sun disk/halo; sun/moon are face-billboards; clouds are merged icosahedron puffs (`src/render/props.ts`).

### Inferences
- Boogle already has the palette-driven cycle; the cheap upgrades are: stars (one Points draw, faded at night), a tighter horizon band, cloud underside tint, and a global "grade" uniform (lift/tint/saturation) injected into all materials' output via a `ShaderChunk` patch — a LUT pass equivalent without the render target.
- Sable's moonlit shadows argue for keeping a (cheaper, lower-res) shadow at night rather than none — trade-off with the recent perf commit.

### Gaps
- No primary source on BotW/Wind Waker sky grading.

## Outlines and overall stylization

### Takeaway
Outlines come in two budgets: inverted hull (re-draw back faces expanded along normals: +1 draw per outlined mesh, no extra pass) and post-process edge detection (depth/normal Sobel: full-screen pass). For a merged-mesh scene, inverted hull costs just a few draws.

### Cited Findings
- three.js `OutlineEffect` (WebGL) re-renders outlined objects; WebGPU equivalent is `ToonOutlinePassNode`/`toonOutlinePass(scene, camera)` which only outlines `MeshToonMaterial`/`MeshToonNodeMaterial` objects — [three.js OutlineEffect docs](https://threejs.org/docs/pages/OutlineEffect.html); [three.js ToonOutlinePassNode docs](https://threejs.org/docs/pages/ToonOutlinePassNode.html)
- `MeshToonMaterial` needs a `gradientMap` with `NearestFilter` for hard bands — [three.js MeshToonMaterial docs](https://threejs.org/docs/pages/MeshToonMaterial.html)
- Sable: outlines add depth; outlines fade with distance to hide pop-in; texture outlines catch same-colored edges (community recollection of GDC talk) — [Game Developer](https://gamedeveloper.com/gdc2022/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability); [Reddit r/howdidtheycodeit](https://redlib.hbubli.cc/r/howdidtheycodeit/comments/17k126c/how_did_they_make_the_outline_shader_in_sable)
- A Short Hike: soft outline so objects stand out at low resolution — [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)
- Messenger (abeto, 2025): cel-shaded three.js/WebGL browser game running on desktop and mobile — [80.lv](https://80.lv/articles/deliver-mail-on-tiny-colorful-planet-in-this-relaxing-web-game); [techenclave](https://techenclave.com/t/a-cool-little-browser-game-messenger/429835)
- Elysium: vanilla three.js + GLSL; stylized water, sky, clouds, stars, gradient fog, wind foliage, "godrays"; graphics presets — [Elysium thread](https://discourse.threejs.org/t/elysium-the-most-beautiful-stylized-world-on-the-web/55541)

### Inferences
- Boogle's props (palms, rocks) are one merged mesh, so an inverted-hull outline on props = 1 extra draw (and none in shadow pass); ball, avatars, mushrooms (instanced) add a few more. Outline width should be in screen space / scaled with distance and faded with fog, per Sable.
- Toon ramps: replacing `MeshStandardMaterial` (no env map, flat shading) with `MeshToonMaterial` or `MeshLambertMaterial` is both a style change and a per-fragment saving.
- WebGPU/TSL: three 0.186 ships WebGPURenderer with WebGL2 fallback, but Boogle's custom `ShaderMaterial`s (water, sky) would need TSL ports; not worth it for these looks.

### Gaps
- Could not access Sable's GDC talk or A Short Hike GDC talk directly. No primary Townscaper rendering source found.
