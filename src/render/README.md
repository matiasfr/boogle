# Rendering

Boogle draws with three.js's `WebGPURenderer` (`three/webgpu`) and writes every custom shader in TSL (`three/tsl`).
**WebGPU only** (since 2026-10-31): Chrome and Edge, Safari 26 on iOS, iPadOS and macOS, Firefox on Windows and Apple
Silicon. There is no WebGL 2 fallback (`scene.js` turns three's off), so a browser without WebGPU gets a note in the
lobby instead of the island. In return any feature may use compute shaders, storage buffers, storage textures and
indirect draws directly, with no second path and no `isWebGPUBackend` check. CI runs WebGPU too (SwiftShader over
Vulkan). How the migration went: [docs/plans/webgpu-migration.md](../../docs/plans/webgpu-migration.md).

## The frame

- [`scene.js`](scene.js) builds `renderer`, `scene`, `camera`, `sun` and the sky placeholder synchronously, so
  modules can import them at load. `renderer.render()` throws until `renderer.init()` resolves: the network and lobby start at once, and
  `main.js` waits for `rendererReady` only for the frame loop and the Enter button ("Loading island" is the loading
  screen). Behind it, [`precompile.js`](precompile.js) builds every pipeline (hidden and off-screen objects too, plus
  `warmUp()` objects such as a new player's avatar) so no frame stalls on a shader compile. A lazy part calls
  `precompile(object)` as it builds its meshes. `main.js` hands the frame to `renderer.setAnimationLoop`, so three
  resets `renderer.info`, ticks the TSL `time` and then runs ours, in that order; `renderer.info.render` holds the
  last frame's counts until the next one starts. A lost GPU device
  reloads the page once it is visible, at most once a minute.
- Every frame goes through one `RenderPipeline`: `scenePass` (`pass(scene, camera)`, a linear HDR target with MSAA)
  then one output pass that tone maps (`NeutralToneMapping`; exposure is one base value in `scene.js`, which `sky.js` raises a little at night, like eyes
  adapting) and encodes sRGB. Draw with
  `renderFrame()`. It renders the scene once per animation frame; a second call in the same frame only redraws the
  output quad, so don't call it twice to measure anything.
- **Post effects** (bloom, TRAA, GTAO, SSGI, god rays, DoF: `three/addons/tsl/display/`) extend that chain: build a
  node from `scenePass` (`scenePass.getTextureNode()`, MRT outputs), assign `pipeline.outputNode`, and set
  `pipeline.needsUpdate = true`. Each full-screen effect costs fill on phones: measure it on a real device, and plan
  for a quality setting rather than turning it on for everyone.
- [`features/adaptive-res.js`](../features/adaptive-res.js) moves the pixel ratio between 0.6x and 1x of
  `min(devicePixelRatio, 2)` from the frame time. Don't call `setPixelRatio` elsewhere.

## Colour

Everything is linear. Lights, materials and palettes are physical-ish linear values; the output pass does tone
mapping and sRGB. `THREE.Color` set from a hex string converts sRGB to linear for you; a raw `vec3` literal in TSL
is linear. three's own fog (`scene.fog`) applies to node materials; set `fog: false` on a material that does its own.
The day/night palettes live in [`sky.js`](sky.js) (`C`, `L`).

## Materials

- **Built-in materials** (`MeshStandardMaterial`, `MeshLambertMaterial`, `MeshBasicMaterial`, `SpriteMaterial`) work
  as they are: the renderer maps them to node materials. Use them when there's nothing custom.
- **Custom looks** are node materials from `three/webgpu` (`MeshStandardNodeMaterial`, `MeshBasicNodeMaterial`,
  `SpriteNodeMaterial`, `PointsNodeMaterial`, ...) with TSL in their node slots: `colorNode`, `positionNode`,
  `normalNode`, `emissiveNode`, `aoNode`, `maskNode` (cut-outs, like the cave mouths in `adapters/terrain.js`),
  `opacityNode`. Use `colorNode`, not `fragmentNode`: `fragmentNode` skips lighting, fog and the output transform.
- **Extending a material another module owns** (sway, wiggle, tint): `patchNode(mat, slot, prev => node)` from
  [`material-patch.js`](material-patch.js). It wraps what is in the slot, so several patches compose.
- **Uniforms** are TSL `uniform(value)` nodes. A module that others drive exports them as a plain object of handles
  (`seaU` and `seaRipples` in `water-render.js`); consumers set `.value` and never reach into a material.
  Per-instance data is an `InstancedBufferAttribute` read with `instancedDynamicBufferAttribute` or `attribute()`.
- **Sized points are sprites.** WebGPU has no point size, so `THREE.Points` draws 1 px dots. Draw many dots as one
  `Sprite` with `sprite.count = n` and instanced attributes (`particles.js`, fireflies, the throw preview). For
  particles, call `emit()` from `particles.js`; don't build a pool.
- **Lint bans the WebGL-only APIs** in `src/`: `ShaderMaterial`, `RawShaderMaterial`, `ShaderChunk`, `ShaderLib`,
  `UniformsLib`, `UniformsUtils`, `WebGLRenderer`, `THREE.Points`, `onBeforeCompile`, `customProgramCacheKey` and
  `readRenderTargetPixels` (use `readRenderTargetPixelsAsync`; `player/item-icons.js` shows a readback that goes
  through the game's tone mapping and probes the row order once).

## TSL pitfalls (each cost us time)

- `vec3(someColor)` with a `THREE.Color` silently renders black: use `vec3(c.r, c.g, c.b)` or `color(c)`.
- WGSL needs texture samples and derivatives (`dFdx`, `dFdy`) in uniform control flow: sample before any `If`,
  `Loop` with a data-dependent exit, or `Discard`.
- Don't import a TSL function under the same name as a helper from `../math.js` (`clamp`, `lerp`, `smoothstep`):
  alias it (`clamp as tslClamp`), or the module fails to load.
- `smoothstep` with reversed edges is undefined in WGSL: write `smoothstep(a, b, x).oneMinus()`.
- Node graphs compile once per material. Change a uniform's `.value` per frame, never rebuild the node.

## Cost and checks

- `npm run perf -- --render` prints draw calls, shadow calls, triangles, geometries and shader stages (vertex and
  fragment counted apart, so the number is not comparable with the old "programs"). Run it before and after
  anything that adds meshes, lights, passes or per-frame GPU work.
- `npm run look` and the scenarios run WebGPU: SwiftShader over Vulkan on Linux and CI (a few fps with two tabs, so
  PR CI runs only the single-tab or light scenarios), Metal on a Mac. `npm run check:gpu` (smoke on the GPU) runs in
  `npm run ship` on a Mac, and `smoke.yml` runs smoke against the live site after every deploy. The harness
  passes `?dpr=fixed`, which keeps [adaptive-res](../features/adaptive-res.js) off so images stay comparable, and a
  scenario fails if a player's renderer isn't WebGPU. Every run
  prints the backend and any `THREE.` console errors (`gfx errors`); a "Material ... is not compatible" error means
  a material slipped through as WebGL-only.
- `?prof=1` (any build, live site included) overlays the frame's main-thread CPU per section: each `onFrame` hook by
  module, plus `main: physics` and `main: render (CPU)`; `window.boogle.prof.table()` returns the same rows.
  `npm run perf` prints them, and `npm run hitches` names the slowest section of each hitch frame. `npm run hitches -- --allocs` adds JS heap
  allocated per frame and the functions that allocate most (library allocations charged to the game code calling them).
- `npm run hitches` flies a tour (views, caves, lighthouse, sunset and night, particles, a held throw, the hotbar) and
  lists every frame over 33 ms with what changed in it (programs, geometries, textures); use it after touching
  materials or anything lazily built.
- `window.boogle.gfx` (`gfx()` in `scene.js`) is `'webgpu'` once `rendererReady` resolves, null before; telemetry
  reports it with each connection.
- Headless frame rates mean nothing. Judge frame time on a real iPhone, iPad and a mid-range Android.

## Where this is going

The "Graphics quality tiers" item in [PLAN.md](../../PLAN.md): a quality setting in the pause view (auto, low,
medium, high), with compute particles behind `emit()`, TRAA, bloom, clustered lights for night lanterns (in place of
the two-light pool in `lights.js`), cascaded shadows, and GTAO, SSGI, SSR and god rays on the high tier. The look-inside-the-materials
ideas in [docs/research/stylized-rendering-on-a-budget.md](../../docs/research/stylized-rendering-on-a-budget.md)
remain the floor every device gets.
