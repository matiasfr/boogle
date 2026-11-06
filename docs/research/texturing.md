# Texturing: procedural tiles first, Meshy only as a drafting source

_6 November 2026. Research only for the owner's question: should Boogle texture its surfaces procedurally, or generate reusable textures with Meshy? Source inspected at `224747fb` with installed three r187; live Meshy, Khronos, three.js and developer sources read today. Confidence tags: **[H]** read in source or measured here; **[M]** inferred from primary sources or partial evidence; **[L]** estimate, untested. No Meshy credits or paid API were used. Not tested on a device._

**Status (6 November):** the owner chose option C after the timber proof ([decision](../proposals/boogle-2.md#current-decision-index)). Wood is now the first shared family: [wood.ts](../../src/render/wood.ts), baked at load through [baked-tile.ts](../../src/render/baked-tile.ts), with seeded jittered knots and per-piece offsets. The proof's flag, KTX2 tiles and recipes were not merged.

## Recommendation

**Build a small shared library of about six to eight tileable surface families, authored as procedural recipes in code and baked to small tiles. Use runtime TSL only for cheap breakup and blending. Keep props, kit pieces and characters flat-coloured unless they read poorly. Use Meshy, if at all, as one more source of albedo drafts, not as the pipeline.** [M]

- **Meshy does not make the thing we need.** Its texturing endpoints (Retexture, Text to 3D Refine) paint a **specific model's UV layout**. They output base colour plus optional metallic/roughness/normal maps, but no seamless tile. ([Retexture API](https://docs.meshy.ai/en/api/retexture); [text-to-texture page](https://www.meshy.ai/features/text-to-texture)) A reusable tile from Meshy means using its text-to-image as a swatch generator, then doing our own tiling repair. The `/concept-art` Codex route already covers that at no credit cost. [H]
- **Procedural tiles already work in the game.** The cove bakes three 512² tiles from seeded code at load ([cove-textures.ts](../../src/proto/place/cove-textures.ts)), with triplanar rock and world-space turf ([cove-material.ts](../../src/proto/place/cove-material.ts)). Measured here, the bake took **96 ms** of CPU in Node. As KTX2 the two pigment tiles would download as **49 KB and 34 KB** at about 42–43 dB PSNR. [H]
- **The order is: wood family next, then a shared material library, then trim sheets when the building kits arrive.** [M]

| Option | Look / fit with flat style | Agent authoring speed | Runtime cost | Tiling / variation | Pipeline fit |
| --- | --- | --- | --- | --- | --- |
| **(a) Runtime TSL procedural** (noise, triplanar, masks) | Good for soft breakup, strata and grain. Character marks (tufts, brush strokes) are hard. [M] | Fastest: edit code and see the change live. Tunables come free. [H] | No download or memory. ALU per pixel grows with octaves × 3 for triplanar on full-screen terrain; unmeasured on mobile. [M] | No seams, infinite variation [H] | Native: node slots, `patchNode`, `material()` [H] |
| **(b) Procedural baked to tiles** (at load, or offline to KTX2) | Same recipes plus richer marks; the cove tiles prove it [H] | Fast: same code, then a bake [H] | At load: 96 ms CPU and 4 MiB RGBA8 resident for three tiles. Offline KTX2: ~35–250 KB download and ~0.33 MiB GPU each [H/M] | Seamless by construction if the recipe is periodic [H]. Repeats need macro breakup [H] | Load bake works today. KTX2 needs a bake step in `npm run assets` [M] |
| **(c) Meshy-generated** | PBR-realist by default. Needs a strong style prompt and cleanup to sit beside flat colour [M] | Minutes per task, then tiling repair and review by hand [M] | Like (b) once cleaned; its native 2K maps are 16× a 512² budget [H] | Not tileable: textures are baked to one model's UVs [H] | Paid-plan ownership. Not a tile source [H] |
| **(d) CC0 sets** (Poly Haven, ambientCG) | Photoreal; needs heavy stylizing [M] | Fast to fetch, slow to restyle [M] | Like (b) [M] | Usually seamless [M] | Fallback only per owner call. Record URL/author/licence/hash [H] |
| **(e) Trim sheets / atlases** | Strong for repeated edges, planks and panels; Insomniac used one for Sunset Overdrive [H] | Slow first sheet, then fast reuse. Needs UV discipline in Blender recipes [M] | One shared 512²–1024² sheet per kit; draws unchanged if the material is shared [M] | Bands repeat by design [H] | Fits Python → GLB → KTX2 already wired [H] |

## 1. What the game looks like today

**Almost everything is factor colour, vertex colour and lighting. There are no shipped image textures.** [H]

- **Materials.** [materials.ts](../../src/render/materials.ts) defines `timber`, `paintedToy`, `foliage`, `stone`, `steel` and `feedback` as flat colour plus roughness/metalness, with flat normals except steel. The [material-pipeline audit](material-pipeline.md) counted 124 Standard constructor sites and found **0 images in built GLBs**. [H]
- **Terrain.** `groundMaterial()` in [place/look.ts](../../src/proto/place/look.ts) shades grass from vertex colours with sine "breathe/dry/mottle" fields. Rock is a facet-slope mask with sine strata, smooth normals on grass and facets on rock. Only the cove region has real tiles. The shore uses baked 2D/3D value-noise textures ([shore/ground.ts](../../src/proto/shore/ground.ts)). [H]
- **Palettes.** `material.grass/sand/timber/stone/walls/roofs` multiply colour through uniforms in Dev/`tune=1` only ([material-palette.ts](../../src/render/material-palette.ts), [graphics.md](../game-design/graphics.md)). They stay dev-only knobs and can multiply a textured pigment just as well. [H]
- **Pipeline.** [asset-loader.ts](../../src/render/asset-loader.ts) already wires `KTX2Loader`. The [build](../plans/asset-pipeline.md) encodes ETC1S for colour and UASTC+Zstd for data. `ktx` v4.4.2 is installed on this Mac. [H]
- **Memory context.** Graphics notes record texture allocation estimates of about **217 MB** in town, mostly render targets. The whole texturing budget below is a few percent of that. [H]

**Where texturing adds most** [M]:

1. **Terrain rock and cliff faces**: the largest surfaces on screen. Sine strata read as regular bands ([terrain-texturing](terrain-texturing.md)).
2. **Wood**: logs, rails, sleepers, station frames. These are the game's main material, and flat brown loses "this is timber" at mid distance.
3. **Turf, sand and soil edges**: already covered by the terrain-texturing plan.
4. **Buildings** (plaster, shingles, planks) when the era kits come: trim sheets earn their keep there.
5. **Metal**: little. Roughness variation and edge wear, not images.
6. **Characters: none.** Buddy and the little guys are deliberate lo-fi ("Some lo-fi is character"). Tunic shipped on "no textures; extremely low poly". Shouldice later found it hard to show a ruined world that way, which supports adding texture only where a surface must say something ([Game Developer](https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals)). [H]

## 2. What the references say

- **A Short Hike**: Robinson-Yu aimed for a readable world "using as few pixels as possible", with flat cohesive shading and outlines rather than texture detail ([PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)). Stylized games often get their character from shading rules and low frequency, not texel count. [H]
- **Sea of Thieves**: Stevenson's GDC 2018 talk frames the look as "a few simple rules" applied across all visuals ([GDC Vault](https://gdcvault.com/play/1025015/Visual-Adventures-on-Sea-of); [80.lv](https://80.lv/articles/gdc18-visual-adventures-on-sea-of-thieves/)). Its texture details are members-only and were not verified. [M]
- **Genshin Impact**: miHoYo describes a PBR-based stylized pipeline with separate mobile and console paths ([Unite slides](https://www2.slideshare.net/UnityTechnologiesJapan/210617-unity-dojo20211mihoyozhenzhongyi); [GDC 2021](https://www.gdcvault.com/play/1027539)). That is the same shape as ours: stylized PBR, authored textures and a mobile tier. [M]
- **Breath of the Wild / Wind Waker / Odyssey**: studied in [terrain-texturing](terrain-texturing.md). Readable large planes, quiet detail at distance, painted repeats with macro tint. [M]
- **Trim sheets**: Olsen's GDC 2015 "Ultimate Trim" credits a standard trim layout with solving production speed, memory and performance for Sunset Overdrive's open world ([GDC Vault](https://gdcvault.com/play/1022323/The-Ultimate-Trim-Texturing-Techniques)). [H]

## 3. Options in detail

**(a) Runtime TSL.** r187 exports MaterialX noise (`mx_noise_*`, `mx_fractal_noise_*`, `mx_worley_noise_*`, `mx_cell_noise_float`), `hash` and `triplanarTexture(s)` (installed `MaterialXNodes.js`, `TriplanarTextures.js`). The official [`webgpu_tsl_wood`](https://threejs.org/examples/webgpu_tsl_wood.html) example's `WoodNodeMaterial` computes rings, warp and splotches from **object-space position**, with no UVs, and has ten genus and four finish presets. It is a ready reference for a restrained Boogle grain. Cost: each octave is a Perlin evaluation per pixel, at full screen on terrain and three times over under triplanar. So use runtime noise for low-frequency breakup and masks only. [H source / M cost]

**(b) Baked procedural tiles.** Same recipes, evaluated once. Three routes, in order of maturity:
1. **CPU at load** (cove today: `DataTexture`, mips, `NoColorSpace` pigment multipliers). Zero download, but costs main-thread time and uncompressed residency. [H]
2. **GPU at load**: `convertToTexture(node, 512, 512)` bakes a TSL node into a render target ([`webgpu_procedural_texture`](https://threejs.org/examples/webgpu_procedural_texture.html)). It is fast, keeps one recipe for the live and baked versions, and is still uncompressed. [H]
3. **Offline to KTX2**: the recipe runs in a build script and writes a master PNG plus KTX2. Smallest GPU footprint; adds a 527 KB transcoder (245 KB gzip), paid once, on the first KTX2 load. The [Khronos artist guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md) recommends ETC1S for flat or simple colour and UASTC for normals and packed data, power-of-two sizes, and seams on a 4-texel grid. [H]

**Measured on this Mac, cove recipe, 512², full mips** [H]:

| Tile | PNG | KTX2 | Round-trip quality |
| --- | ---: | ---: | --- |
| rock pigment | 212,748 B | **49,075 B** ETC1S (126,425 UASTC+zstd) | 41.6 dB PSNR, max error 7/255 |
| turf pigment | 97,137 B | **33,637 B** ETC1S | 43.0 dB, max 13/255 |
| data (micro-height/breakup) | 869,620 B | **245,979 B** UASTC+zstd | 34.6 dB, max 45/255 |

Uncompressed, the three tiles are 4.0 MiB resident with mips; that is the cove today. Transcoded to a 4×4-block format (BC7 on Mac, ASTC 4×4 on iOS) they would be about **0.33 MiB each**, around 1 MiB total. That figure is arithmetic: the actual target format chosen by WebGPU's `KTX2Loader` on each device was not checked. [M] The data tile's noisy content compresses poorly; keep data tiles to 256² or low-frequency channels. [M]

**(c) Meshy.** Retexture takes a model plus `text_style_prompt` or `image_style_url`. `enable_pbr` adds metallic/roughness/normal maps, `enable_original_uv` keeps our UVs, `remove_lighting` de-bakes light (meshy-6 only), and `texture_resolution` is 2k by default. It costs **10 credits** (15 at 8K). Text to image costs **3–9 credits**, image to image 3–12 ([pricing](https://docs.meshy.ai/en/api/pricing)). Plans: Free has 100 credits and no API, with outputs under **CC BY 4.0 with attribution**. Pro is $20 for 1,000 credits, and paid-plan users **own their output** ([pricing page](https://www.meshy.ai/pricing); [terms §3.2](https://www.meshy.ai/terms-of-use)). The terms also warn that outputs "may not qualify for IP protection" and are not guaranteed unique (§7.2). Assets posted to Meshy's public community become CC0 (§3.3). [H]

Fit: Meshy suits a **one-off hero prop**, where a unique painted texture on an existing mesh is the goal. That is the opposite of reuse. A reusable tile from Meshy means a swatch image plus the usual finishing: wrap repair, de-light, a 3×3 repeat test and a 512² downsample ([finishing workflow](terrain-texturing.md#authoring-painted-tiles-including-image-generation)). Codex images do the same on the existing subscription. [M]

**(d) CC0.** Poly Haven and ambientCG are seamless but photographic. Restyling them costs more than writing a recipe, so they are audition references or a height base. Record their provenance. [M]

**(e) Trim sheets.** A trim sheet is right for buildings and machines with repeated planks, panel seams and edges. Its cost is UV discipline in the Blender recipes, and it does not round silhouettes ([art-kit-pipeline](art-kit-pipeline.md#trim-sheets-and-gltf-delivery)). Wait for the first era building kit. [M]

## 4. Recommended hybrid

**Surface → approach** [M]:

| Surface family | Approach | Projection | Repeat |
| --- | --- | --- | --- |
| Turf, sand, soil | Baked procedural tile + TSL macro tint/vertex colour | World XZ | 2–4 m |
| Rock / sandstone (terrain, cliffs, boulders) | Baked tile + TSL strata/breakup | Triplanar (world on terrain, object on props) | 4–8 m |
| Timber (logs, sleepers, beams) | Runtime TSL grain first (WoodNodeMaterial-style, restrained); bake if costly | Object space along a grain axis (already reserved in material-pipeline) | 0.5–1 m ring scale |
| Plaster, shingles, planks (buildings) | One trim sheet + one tile per era kit | UV (Blender recipe) | Per sheet |
| Metal / steel | No texture; noise roughness mask and edge darkening | Object | n/a |
| Buddy, little guys, feedback | None | n/a | n/a |

**Library shape.** Extend, don't replace, the `material()` contract. A surface preset may name a **tile family** (pigment, plus a shared data tile), a **projection** (`worldXZ | triplanar | object | uv`) and a **repeat in metres**. The palette uniforms multiply the pigment as they do now. One cached material per family and tiles are shared, as the existing cache and shared-map rules already require. Keep terrain and water graphs special, as the rendering contract says. [M]

**Texel density** [L]: about **128 texels/m** near the camera (a 512² tile over 4 m) for terrain; 64–128 texels/m for props; 256² is enough for most prop families at the follow camera. No runtime map above 1024²; Meshy's 2K default is downscaled.

**Budget** [L]: at most **8 tile families × 512²** plus 4 data tiles at 256², all KTX2. That is about **3–4 MiB GPU** and **under 1 MB download**, plus the one-time 245 KB transcoder. Mobile uses the same tiles with one mip dropped. Any runtime noise layer stays at 2 octaves or fewer, and full-screen surfaces get no runtime triplanar fBm.

**How agents author and review** [M]:
1. Write a seeded, periodic recipe in a TS module that both the load-time bake and a build-time bake can import. One recipe, no drift.
2. The review sheet has four parts: the tile, a 3×3 repeat, the mip chain at 1/4 and 1/16, and an `?view=unlit` swatch. The owner judges contact sheets only for the specific beat ("contact sheets are for specific beats").
3. Matched in-game stills: fixed camera, sky, exposure and Buddy for scale, using the existing look shot lists. Compare an untextured control, the candidate and a strength wedge. Check motion for crawl.
4. Record download bytes, GPU residency, shader/pipeline count and the frame on the M1 Max at fixed resolution. Note "not tested on a device".
5. Any generated image (Codex or Meshy) follows **Code first, images by approval**: commit the prompt file and a provenance line, and a person picks from a contact sheet before it ships.

**Pipeline fit.** Bake on load until there are more than ~4 tiles or the bake passes ~50 ms. After that, move the bake into `npm run assets` and emit KTX2 through the existing `ktx` path. Recipes stay the source of truth, and KTX2 files are build outputs with hashes in the manifest. [M]

## 5. Smallest proof: timber, four ways

Rock is already proved procedurally in the cove, and wood is the next most visible family, so the proof is timber.

**Fixture**: one log pile, one rail segment with sleepers and one station beam, in a fixed town shot with Buddy beside them. Same light, exposure and camera.

| Cell | What | Cost to make |
| --- | --- | --- |
| A | Current flat `timber` (control) | 0 |
| B | Runtime TSL grain in object space (2 noise octaves) | Code only |
| C | B's recipe baked to a 512² tile, KTX2, object-projected | Code + bake |
| D | Meshy-sourced: 4 text-to-image swatches (`nano-banana-2`, 6 cr each). Pick 1 and repair its tiling into a 512² tile. Also 1 Retexture of the log mesh (`meshy-6`, 2K, `enable_pbr`, `remove_lighting`, 10 cr) as a unique-UV comparison | **~34 credits; cap 50** |

**Measure**: download bytes, GPU bytes (renderer info and the allocation estimate already used in graphics notes), added pipelines and draws, and frame time on a quiet Mac at fixed resolution. Compare the four matched stills plus a 5-second orbit. Owner gut question: **"Does the wood read as wood now, and does it still look like Boogle?"** [M]

**For approval before D**: about **34 credits** (cap 50; roughly **$0.70–$1.00** at the Pro rate of $20 per 1,000). It needs a **paid plan** for output ownership; on Free there is no API and outputs need attribution. Task IDs and costs are recorded. A Codex-image swatch (cell D′) can run alongside D at no credit cost, so Meshy is judged against the free route rather than against nothing. [H prices / L estimate]

## 6. Risks and what stays unverified

- **Not measured**: the runtime TSL noise cost on iPhone and iPad; which compressed format `KTX2Loader` picks under WebGPU on each device; transcoder startup time; the in-browser CPU bake time (96 ms was Node). [H]
- **Style drift**: textured surfaces beside flat Buddy and props can look like two games. Mitigation: low-contrast pigment multiplying the existing colours, palettes kept as the colour authority, and a control cell in every comparison. [M]
- **Repetition**: tiles at 2–4 m repeat visibly from the high camera. Mitigation: macro tint from vertex colour or low-frequency noise. Per-tile random offset/rotation ([Quílez, texture repetition](https://iquilezles.org/articles/texturerepetition/)) costs extra samples and is only worth it if macro tint fails. [M]
- **Meshy**: no tile output; PBR-realist bias; 2K default; vendor deprecations move quickly ([agent-model-pipelines](agent-model-pipelines.md)); output may lack IP protection and is not guaranteed unique; ownership requires a paid plan. [H]
- **Data-tile quality**: UASTC+RDO on the noisy data tile reached 34.6 dB with up to 45/255 error. Normal or height detail derived from it may band. Lower the RDO setting or use 256² low-frequency data. [H measured / M effect]
- **Talks not watched**: Sea of Thieves, Genshin and BotW technique details are from abstracts and summaries; texture resolutions in those games are unknown. [M]
- **No game change, no generation, no device test.** The proof above is a proposal.
