# Plan: the asset pipeline (authored models)

> **Status: proposal (2026-11-01), first cut built.** Started on the owner's call of 1 November
> ([boogle-2.md](../proposals/boogle-2.md), "Process"): a pipeline ready for Blender (and later Blender MCP) to feed,
> including animated construction. The rule in "Models or code" is a proposal for the director to adopt; nothing here
> replaces a shipped code-built object. Architecture: [architecture.md](architecture.md) phase 4,
> [open-world.md](open-world.md) section 2, [boogle-2-architecture-fit.md](boogle-2-architecture-fit.md) section 3.
> Lowest target: an M4 iPad Pro on Safari 26 (WebGPU). Research read on 2026-11-01; sources at the end.

## Best practices we follow

1. **glTF 2.0 binary (`.glb`), one file per asset or kit.** Pieces of a kit are named nodes; code looks them up.
2. **Geometry: meshopt (`EXT_meshopt_compression`) with `KHR_mesh_quantization`, not Draco.** Meshopt decodes several
   times faster than Draco (three.js ships a 29 KB decoder; Draco's glTF decoder is ~250 KB of WASM and wrapper), also compresses animation
   and morph-target data (Draco only compresses mesh geometry), and lands within ~10% of Draco's size once the server
   gzips it. Draco only if a single huge static mesh ever dominates a download; none does.
3. **Quantize everything** (positions 14 bit, normals 10, UVs 12; gltf-transform's defaults): about half the vertex
   memory on the GPU too, not just on the wire.
4. **Textures: KTX2 / Basis Universal (`KHR_texture_basisu`) over ~256 px.** ETC1S for colour (base colour,
   emissive) at the smallest size; UASTC + Zstandard for normal, roughness/metal/occlusion and other data maps
   (ETC1S smears their channels). Mipmaps generated at build time. Power-of-two sizes, multiples of 4, max 1024 px
   unless an asset asks (2048 for a hero only). They stay compressed in GPU memory (ASTC on iPad and Apple GPUs, BC on
   desktops): a 1024² map is ~1.4 MB in VRAM instead of ~5.6 MB as RGBA8. Small icons and UI stay PNG/WebP.
5. **Flat colours as material factors, not textures.** Boogle's look is flat-shaded vertex and material colour; a
   texture is the exception and needs a reason.
6. **One build tool: gltf-transform** (dedup, weld, prune, resample animations, simplify on request, resize textures,
   meshopt). Run as a library from a TypeScript script, not by hand.
7. **Blender exports headless, from a script, with fixed settings** (`-b --factory-startup`; Y up, modifiers applied,
   no cameras or lights, Draco off). Nobody clicks an export dialog, so every output is reproducible.
8. **Outputs committed, budgets checked in CI** (per asset and in total), hashed file names from Vite.
9. **Load once, clone many.** Decoders set up once after `renderer.init()`; each `.glb` loaded once and cached;
   instances clone (SkeletonUtils for skinned). Repeated pieces at scale go into `InstancedMesh`/`BatchedMesh`.
10. **Animation: glTF clips for crafted motion, code for timing.** One `AnimationMixer` per animated instance, updated
    from one frame hook, dropped when its clips end. Skinning and morph targets run on `WebGPURenderer` as nodes.
11. **Materials become node materials** on load, the same conversion the renderer does, so TSL patches
    (`patchNode`) and the linear-colour contract ([src/render/README.md](../../src/render/README.md)) hold.
12. **Measure on the target.** `npm run perf` before and after, and frame time on the iPad. Safari kills a tab over
    its memory limit without warning, so texture memory is the budget that matters most.

## Models or code

**The rule (proposed): code is the default; a model earns its place by being something code draws badly or slowly.**

| Stays code | Becomes a model | Hybrid: a modelled kit, placed and timed by code |
| --- | --- | --- |
| Parametric or repeated along data: terrain, rails and sleepers along a route, fences, the sea and water, sky, clouds | Organic or hand-shaped: characters, The Boogler, critters, hats | Construction: scaffolding (pole, plank, clamp), beams, roof tiles, a bridge's spans, each piece modelled, the sequence and timing in code |
| Effects: particles, splashes, toon and other shading (TSL), post | Rigged animation: walk cycles, The Boogler's gestures, a crane's arm | A crafted motion as a glTF clip (a plank's drop and squash, a door swinging), started, sped up and chained by code |
| Physics props that are boxes, cylinders and spheres (the ball, logs, crates), so the collider is the shape | Hero vehicles: the steam wagon, a locomotive (once the greybox has proved the feel) | Era buildings: a modelled silhouette and trim kit; footprints, height and placement from data |
| Anything we're still finding the fun of (greybox first) | Era buildings' silhouettes, landmarks seen from across the sea (with LODs) | Decor scattered by code (rocks, plants): a few modelled variants, instanced |

Why:

- **Code is quicker to change** while the design moves (a tuning number, not a re-export), costs no download, and is
  readable in one sitting. Greybox stays code until a playtest says the thing stays.
- **Models win on shape**: a silhouette, a face, a rig, a worn edge. Code-built organic shapes are slow to write and
  look like code.
- **Construction is the hybrid case**: what appears, when and where is game state and timing (Lockstep sites, or
  Local decoration), so it stays code; what each piece looks like and how it lands is art.
- **Collision stays code**: Rapier colliders are boxes, capsules and hulls built from numbers; a model never brings
  its own physics.
- **What agents can do fast**: Blender's Python builds models from code too (`assets/src/scaffold-kit.py` is one).
  An agent can write a script for a kit piece, export it headless and look at it in the game in minutes. That makes
  "model" no slower than "code" for simple hard-surface pieces; the reason to pick a model is then reuse by
  artists, hand-tuning in Blender later, and clips. Organic shapes still need a person in Blender (or Blender MCP).

In six lines:

1. Code by default; greybox anything whose fun isn't proven yet.
2. Code for whatever follows data or repeats: terrain, routes, water, sky, particles, shading, physics props.
3. Models for hand-shaped and organic things: characters, The Boogler, hero vehicles, landmark silhouettes.
4. Construction is a kit: modelled pieces, code places and times them.
5. Crafted motion is a glTF clip; when it plays, how fast and what follows is code.
6. Colliders are always code; a model is only what you see.

## The pipeline

```
assets/src/<name>.py | .blend | .glb   (+ optional <name>.json sidecar)
        │  npm run assets   (dev/assets/build.ts)
        │    1. Blender -b --factory-startup   (.py runs the script; .blend exports with fixed settings)
        │    2. gltf-transform: dedup, weld, resample, prune, [simplify], resize textures to maxTexture
        │    3. KTX2 via KTX-Software `ktx create`: ETC1S + mips for sRGB maps, UASTC + Zstd + mips for data maps
        │    4. meshopt (reorder, KHR_mesh_quantization, EXT_meshopt_compression)
        ▼
assets/built/<name>.glb + manifest.json  (committed)
        │  import url from '../../assets/built/<name>.glb?url'   (Vite hashes it on build)
        ▼
src/render/assets.ts: loadAsset(url) → instance(node) / clip(name, node) / play(instance, clip)
```

- **Commands.** `npm run assets` builds every source whose hash changed; `npm run assets -- <name>` builds one;
  `--force` all. `npm run assets -- --check` (in `npm run check`) needs neither Blender nor `ktx`: every source has an
  output, its hash matches (so a changed source can't ship a stale model), the output matches the manifest, sizes fit
  the budget, and no texture over 256 px skipped KTX2. It reads a few files and takes milliseconds.
- **Commit outputs, don't build in CI.** CI has no Blender and no KTX-Software, and installing Blender on every run
  costs minutes for files that change rarely. Outputs are small (meshopt), the manifest records the source hash, and
  `--check` fails a PR whose source changed without its output. The cost: whoever changes a source needs Blender (and
  `ktx` for textures) on their machine.
- **Budgets** (in `dev/assets/build.ts`, raised per asset by its sidecar's `budgetKB`): 1 MB per asset, 12 MB for all
  assets, 1024 px textures. To revisit with the first real era kit and the first character, measured on the iPad.
- **Sidecar** (`<name>.json`, optional): `maxTexture`, `simplify` (a ratio, meshoptimizer's simplifier), `budgetKB`,
  and room for a licence line for a bought or downloaded `.glb`.
- **Dependencies** (dev only): `@gltf-transform/core`, `extensions`, `functions` and `meshoptimizer` (the encoder; the
  same package three's `meshopt_decoder` types already pull in). KTX-Software is a system tool
  (`brew install ktx-software`), found on `PATH` like Blender; without it, textures stay PNG and `--check` flags any
  over 256 px.
- **Later:** `KHR_meshopt_compression` (the ratified Khronos version of the meshopt extension; three r187's
  `GLTFLoader` already reads it) once gltf-transform writes it; LODs (`simplify` into extra levels, `THREE.LOD`) with
  the first thing seen across the sea; instancing helpers when a kit is placed by the hundred.

## Runtime (`src/render/assets.ts`)

- `loadAsset(url)` waits for `rendererReady`, sets up `GLTFLoader` with `MeshoptDecoder` and a `KTX2Loader` that has
  read the device's formats (`detectSupport(renderer)`; three r181+ wants it after `renderer.init()`, and
  `WebGPURenderer` already requests every compressed-texture feature the adapter has). The Basis transcoder
  (~530 KB WASM, ~250 KB gzipped) is emitted by Vite as a hashed file through the loader's own
  `new URL(..., import.meta.url)`, and only fetched when a KTX2 texture is first loaded.
- Materials go through `renderer.library.fromMaterial()`: a `MeshStandardMaterial` from glTF becomes a
  `MeshStandardNodeMaterial` with the same values. glTF base colours are linear and colour textures sRGB, which is
  three's convention too, so the linear-colour contract holds with no conversion. A toon or stylised look is applied
  the same way as on code-built meshes, through node slots or `patchNode`.
- `instance(node)` returns a `Group` holding a clone of one node (or the whole scene); geometry and materials are
  shared. The holder is what code positions: a clip's keys are absolute local values of the node inside it.
- `clip(name, node)` returns a clip, cut down to one node's tracks when a kit shares one clip across pieces (one NLA
  track name in Blender becomes one glTF animation over all pieces).
- `play(instance, clip, { loop, speed, done })` starts a clip; one frame hook (update phase, order -150) advances every
  mixer that has something running and drops it when its clips end.
- The module is imported lazily (`import()`): GLTFLoader, KTX2Loader and the meshopt decoder are a 135 KB chunk that
  the first load doesn't pay for.

## Authoring

- **A Blender script** (`assets/src/<name>.py`) builds the asset from an empty scene and exports to the path after
  `--`. Conventions: metres, Z up in Blender (Y up in glTF); each piece is one object named as code looks it up, its
  origin where code places it; flat colours as Principled BSDF base colours (picked in sRGB hex, stored linear);
  faceted (flat) shading to match the code-built props; a clip is one NLA track name across objects, exported with
  `export_animation_mode='NLA_TRACKS'`.
- **A `.blend` file** exports with `export_animation_mode='ACTIONS'` (every action is a clip) and the fixed settings in
  `dev/assets/build.ts`. Apply scale and rotation before saving; name the objects code will look up.
- **Blender MCP** (later, not set up): it drives a live Blender over a socket, which suits shaping and looking. It
  plugs in at the source end: the agent saves `assets/src/<name>.blend` (or writes the `.py`) and runs
  `npm run assets`, which exports headless with the fixed settings. Exporting from inside the MCP session is not part of
  the pipeline (reports say long glTF exports time out over MCP, and settings would drift).
- **Checking it**: `?proto=assets` shows the kit beside its code-built twin; `npm run look` stills for anything a
  player sees, as for code.

## The proof: a scaffold kit

`assets/src/scaffold-kit.py` builds a pole (3 m, tapered, with a lashing band), a plank (2.4 × 0.3 m, chamfered
ends) and an iron clamp, plus a 0.6 s "drop" clip (fall 2.5 m with a tilt, squash on landing, settle).
`?proto=assets` raises two scaffold bays near spawn piece by piece, clears them and raises them again: the left one
from the kit with its glTF clip, the right one from the same shapes built in code with a hand-written tween. Code
places and times both.

| | Raw Blender export | Optimized (meshopt + quantization) |
| --- | --- | --- |
| `scaffold-kit.glb` | 12.0 KB (2.9 KB gzipped) | 8.6 KB (2.9 KB gzipped); 152 triangles, 3 pieces, 1 clip |

Honest result: for a kit this small, meshopt saves nothing over the gzip the server already applies; most of the file
is the glTF JSON and the clip's keys. Its saving (and quantization's GPU-memory saving) shows on dense meshes:
characters, buildings, anything with UVs and skin weights. The proof is that the path works end to end, not the
ratio.

`npm run perf -- --render` (Mac, Metal, shared GPU, so the CPU numbers are indicative): the island without the
prototype 134 draw calls, 43 shadow calls, 207,705 triangles, 108 geometries, 78 programs; with both bays standing
151 / 50 / 209,177 / 114 / 80 (each piece is its own mesh; instancing would fold them). Frame CPU 0.85 ms vs 1.08 ms
average.

## Open questions for the owner

1. **Adopt the rule** in "Models or code" (DESIGN.md has no "build shapes in code first" section yet; this would be
   its text)?
2. **KTX-Software on the Mac** (`brew install ktx-software`): the KTX2 build step is written but unexercised, because
   the first asset needs no textures and `ktx` isn't installed. Install it when the first textured asset comes.
3. **Budgets**: 1 MB per asset, 12 MB in all, 1024 px textures: right for an M4 iPad? Revisit with the first
   character.
4. **Who models**: Blender scripts by agents for hard-surface kits now; organic shapes (characters, The Boogler) by a
   person or through Blender MCP later?
5. **First real asset**: the steam wagon (boogle-2-architecture-fit.md suggests it, after its greybox proves the feel)
   or the construction kit for the work sites?

## Sources

- glTF Transform: [CLI](https://gltf-transform.dev/cli), [EXT_meshopt_compression](https://gltf-transform.dev/modules/extensions/classes/EXTMeshoptCompression)
  ("considerably faster than Draco decoding"; covers geometry, morph targets and animation)
- meshoptimizer: [gltfpack and the glTF extension](https://meshoptimizer.org/gltf/)
- Khronos: [KTX artist guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)
  (ETC1S vs UASTC per map, mipmaps, sizes multiple of 4, ≤ 2048 px),
  [KHR_texture_basisu](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_texture_basisu),
  [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_mesh_quantization),
  [KHR_meshopt_compression sample assets](https://github.com/KhronosGroup/glTF-Sample-Assets/pull/257)
- Draco vs meshopt measurements: [svilenkovic.com](https://www.svilenkovic.com/3d/draco-vs-meshopt),
  [elf3d: faster first pixels or smaller downloads?](https://elf3d.pages.dev/blog/blog-25-008.html)
- Babylon.js: [KTX2 compression](https://doc.babylonjs.com/features/featuresDeepDive/materials/using/ktx2Compression)
  (ETC1S for colour, UASTC for any map)
- three.js: [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html), and r187's source
  (`KTX2Loader.detectSupport` reads `renderer.hasFeature('texture-compression-astc' | 'etc2' | 'bc')`; `GLTFLoader`
  handles both meshopt extensions; `WebGPUBackend` requests every supported feature)
- Safari memory: [WebKit bug 300782](https://bugs.webkit.org/show_bug.cgi?id=300782) (texture-heavy pages killed and
  reloaded with no JavaScript signal), [WebKit bug 303203](https://bugs.webkit.org/show_bug.cgi?id=303203)
- Blender headless export and MCP: [blender-mcp skill notes](https://skills.cat/skills/vladmdgolam/agent-skills/blender-mcp)
  (headless CLI export, MCP export timeouts); the exporter options read from Blender 5.2's `export_scene.gltf`
