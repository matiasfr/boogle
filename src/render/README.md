# Rendering

Boogle draws with three.js's `WebGPURenderer` (`three/webgpu`) and writes every custom shader in TSL (`three/tsl`).
The renderer uses WebGPU where the browser has it (Chrome and Edge, Safari 26 on iOS, iPadOS and macOS, Firefox on
Windows and Apple Silicon) and falls back to its own WebGL 2 backend everywhere else (Firefox on Android and Linux,
older iOS, headless CI). One codebase serves both: never write backend-specific code unless a feature is WebGPU-only
on purpose, and then check `renderer.backend.isWebGPUBackend` and keep a fallback. The migration and its reasoning:
[docs/plans/webgpu-migration.md](../../docs/plans/webgpu-migration.md).

## The frame

- [`scene.js`](scene.js) builds `renderer`, `scene`, `camera`, `sun` and the sky placeholder synchronously, so
  modules can import them at load. `renderer.render()` throws until `renderer.init()` resolves: `main.js` starts the
  game from `rendererReady`, and the lobby's "Loading island" button is the loading screen. A lost GPU device
  reloads the page once it is visible, at most once a minute.
- Every frame goes through one `RenderPipeline`: `scenePass` (`pass(scene, camera)`, a linear HDR target with MSAA)
  then one output pass that tone maps (`NeutralToneMapping`, exposure 0.9) and encodes sRGB. Draw with
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
  `readRenderTargetPixels` (use `readRenderTargetPixelsAsync`; see `player/item-icons.js` for row padding and the
  per-backend flip).

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
- `npm run look` and the scenarios run on the WebGL 2 backend by default: the harness hides `navigator.gpu`, the
  same path Firefox Android players take. Pass `--webgpu --gpu` (on a Mac) to see the real WebGPU backend. Every run
  prints the backend and any `THREE.` console errors (`gfx errors`); a "Material ... is not compatible" error means
  a material slipped through as WebGL-only.
- `window.boogle.gfx` is `'webgpu'` or `'webgl2'`; telemetry reports it with each connection.
- Headless frame rates mean nothing. Judge frame time on a real iPhone, iPad and a mid-range Android.

## Where this is going

Phase 3 of the migration plan: a quality setting in the pause view (auto, low, medium, high), with compute
particles behind `emit()`, TRAA, bloom, clustered lights for night lanterns (in place of the two-light pool in
`lights.js`), cascaded shadows, and GTAO, SSGI, SSR and god rays on the high tier. The look-inside-the-materials
ideas in [docs/research/stylized-rendering-on-a-budget.md](../../docs/research/stylized-rendering-on-a-budget.md)
remain the floor every device gets.
