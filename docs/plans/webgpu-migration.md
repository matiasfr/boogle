# WebGPU migration (phase 1: parity port; phases 2 and 3 sketched)

## Goal

Move Boogle from `THREE.WebGLRenderer` to `WebGPURenderer` (`three/webgpu`, three ^0.187) for everyone, with no flag:
WebGPU where the browser has it, three's own WebGL 2 backend everywhere else. Phase 1 is plumbing only: the island
looks the same as today (`NoToneMapping`, today's sRGB palette), so before and after stills can be compared. A high
quality tier can then use TSL, compute, post-processing and clustered lighting without another port.

Principles served: **Small and readable** (one renderer and one material system, node slots instead of string-patched
GLSL, no new dependency) and **Measure before optimizing** (parity first, measured with `npm run perf`, stills and
on-device frame time, before any new looks). This deliberately reverses the "Moving to WebGPU and TSL is not needed"
call in [docs/research/stylized-rendering-on-a-budget.md](../research/stylized-rendering-on-a-budget.md). That doc
stays the floor tier, and phase 1 keeps its rule of no extra full-screen pass (see "Output colour" below). No play
principle is bent.

## What the three.js source says

Checked in three r186 source (`node_modules` is still 0.186.1 while `package-lock.json` pins 0.187.0: **run `npm ci`
first and re-check each item against r187**; the grep commands are in step 0).

| Fact | Where | Consequence |
|---|---|---|
| `renderer.render()` throws until `await renderer.init()` resolves. A failed WebGPU init falls back to the WebGL 2 backend inside `init()`, including when `navigator.gpu` is missing | `renderers/common/Renderer.js` `init()`, `WebGPURenderer.js` `getFallback` | Start-up waits for one promise. A construction failure no longer exists; failure arrives as a rejected `init()` |
| A material with no node mapping (`ShaderMaterial`) logs `NodeBuilder: Material "ShaderMaterial" is not compatible.` and draws with a blank `NodeMaterial`. `onBeforeCompile` and `customProgramCacheKey` are never called | `nodes/core/NodeBuilder.js` ~3628, `NodeLibrary.fromMaterial` | Unported shaders draw wrong but don't throw. Every one must be ported before the swap is shipped |
| Legacy materials (`MeshStandardMaterial`, `MeshLambertMaterial`, `MeshBasicMaterial`, `SpriteMaterial`, `PointsMaterial`) map to node equivalents automatically. Their uniforms are read from the original material every frame | `StandardNodeLibrary`, `MaterialReferenceNode` | Most files need no change: `sky.js` writing `cm.emissiveIntensity` each frame keeps working |
| With `outputColorSpace = SRGBColorSpace`, the default path renders into a linear HalfFloat target and converts in one full-screen pass. Blending and fog then happen in linear space, and MSAA moves to that target | `Renderer.needsFrameBufferTarget`, `_getFrameBufferTarget` | Visible changes: the sea's 50 % alpha over sand, soft particles, additive beams and the fog ramp. It also adds the extra full-screen store/load the research doc warns against on iPad |
| `DirectRenderPipeline` (exported from `three/webgpu`) applies the output transform in each material's shader. There is no intermediate target, MSAA stays on the canvas, and blending happens in sRGB like WebGL today. The transform is applied only on the `colorNode` path, **not** when a material sets `fragmentNode` | `renderers/common/DirectRenderPipeline.js`, `NodeMaterial.setup` (the `getOutput` call sits in the `fragmentNode === null` branch) | Phase 1 renders through `DirectRenderPipeline`. Custom materials use `colorNode` and never `fragmentNode` |
| Node materials mix fog **before** the output transform (linear). WebGL mixes it **after** encoding to sRGB (`colorspace_fragment` then `fog_fragment`, with the fog colour uploaded as sRGB) | `NodeMaterial.setupFog`, `WebGLMaterials.refreshFogUniforms` | A custom `scene.fogNode` that mixes in sRGB keeps the fog ramp identical |
| `NodeMaterial.fog` defaults to `true` (`ShaderMaterial`'s default was `false`) | `NodeMaterial` constructor | Every ported custom material sets `fog: false` (the sea does its own fog) |
| `THREE.Points` draws 1 px points: WebGPU has no point size. Sized points are a `Sprite` with `sprite.count = n` instances, using `PointsNodeMaterial` (sized like `PointsMaterial`) or `SpriteNodeMaterial` (sized in world units) | `PointsNodeMaterial.js` header, `Sprite.count` | Three users: soft particles, fireflies, throw-preview dots |
| `renderer.info` resets once per animation frame in the renderer's own rAF loop, not per `render()` call. `info.render.drawCalls`/`triangles` are per frame, `info.render.calls` counts `render()` calls, and `info.memory.programs` counts shader **stages** (vertex and fragment separately, deduplicated) | `renderers/common/Info.js`, `Animation.start` | `npm run perf` must call `info.reset()` itself and read different fields. "programs" gets a new meaning and a new baseline |
| `renderer.shadowMap` is a plain `{ enabled, transmitted, type }`, with no `autoUpdate` or `needsUpdate`. Per-light `light.shadow.autoUpdate` and `needsUpdate` are honoured by both `ShadowNode` and today's `WebGLShadowMap` (line 170) | `Renderer.js` ~713, `ShadowNode.js` ~800 | Switch to `sun.shadow.autoUpdate` while still on WebGL (a prep step) |
| No `readRenderTargetPixels`. `readRenderTargetPixelsAsync(rt, x, y, w, h)` returns a new array. On the WebGPU backend rows are padded to 256 bytes and run top-down; on WebGL they are tight and bottom-up. `WebGLRenderer.readRenderTargetPixelsAsync` exists but takes a `buffer` as its 6th argument | `WebGPUTextureUtils.copyTextureToBuffer`, `WebGLRenderer.js` ~3245 | Item icons go async, and the stride and flip are worked out per backend. `WebGLRenderer`'s readers also require `renderTarget.isWebGLRenderTarget` (~3247), so the icon target stays a `WebGLRenderTarget` (a `RenderTarget` subclass from core, which the node renderer accepts) |
| TSL `mod` is GLSL `mod` (floored) on WGSL too; `dFdx`/`dFdy`, `Discard`, `Loop`, `If`, `uniformArray` (re-read every render), `instanceIndex`, `sRGBTransferEOTF`/`OETF` all exist | `WGSLNodeBuilder` polyfills, `nodes/**` | Line-by-line ports work. In WGSL, texture samples and derivatives must sit in uniform control flow (before any `If`/`Discard`) |
| `three.webgpu.js` imports `three.core.js` and `three.tsl.js`; `three` (`three.module.js`) imports the same `three.core.js`. `package.json` `sideEffects` is only `./src/nodes/**` | `node_modules/three/build/*` | Files may keep `import * as THREE from 'three'` for core classes. Only files that need node classes import `three/webgpu` / `three/tsl`. No codemod, and core classes aren't duplicated |
| `WebGPUBackend.init` asks for `featureLevel: 'compatibility'` | `WebGPUBackend.js` ~215 | Older WebGPU devices still get the WebGPU backend |
| `positionWorld` is `modelWorldMatrix * positionLocal` taken after `positionNode` is applied | `nodes/accessors/Position.js` ~62 | The sea's `colorNode` sees the displaced surface through `positionWorld`, as `vWorld` did |
| `PointsNodeMaterial.alphaToCoverage` is documented as defaulting to `true` (in r186 the field is never initialised) | `PointsNodeMaterial.js` ~185 | Set `alphaToCoverage: false` explicitly, or MSAA dithers the dot edges that WebGL alpha-blended |
| `main.js` exposes `import * as THREE from 'three'` as `window.boogle.THREE`. A namespace object that escapes keeps every export, so `three.module.js` (with `WebGLRenderer` and `ShaderChunk`) is never tree-shaken | `src/main.js` | Step 6 switches that one import to `three/webgpu`; nothing in `dev/` or `src/` reads `window.boogle.THREE` |

## Design

### Sync kind

Everything here is **Local** (rendering only). No ops, states, presence keys or message types change, so mixed-build
rooms are unaffected: an old tab on WebGL and a new tab on WebGPU share no render state. Nothing in `src/sim/`,
`src/world/rules/` or `test/` changes. No controls, so no action ids, pad slots or guide rows.

### Start-up order (no top-level await)

- `src/render/scene.js` builds the renderer synchronously, as now, so the 29 importers keep their synchronous
  `renderer`/`scene`/`camera` exports. It also exports:
  - `rendererReady`: the `renderer.init()` promise. On rejection it writes the "can't draw" message into the lobby and
    rethrows (`telemetry.js` reports the `unhandledrejection`).
  - `renderFrame()`: `pipeline.render(scene, camera)` (a `DirectRenderPipeline`).
- `src/main.js` changes three lines in step 2: import `renderFrame`/`rendererReady`, call `renderFrame()` instead of
  `renderer.render(scene, camera)`, and replace the final `start();` with `rendererReady.then(start);`. Step 6 changes
  a fourth: `import * as THREE from 'three'` becomes `'three/webgpu'` (bundle size, see the facts table).
- **No top-level await.** Vite 6's default build target (es2020 + safari14) rejects it. TLA in a module imported by 29
  others would also hold up the whole graph, and a failure would leave modules in an errored state. A promise plus
  `.then(start)` needs no build-target change.
- **Loop: keep `main.js`'s own `requestAnimationFrame` loop.** `renderer.init()` starts three's internal rAF loop
  (`Animation.start`: `info.reset()`, `nodeFrame.update()`) before `start()` registers ours. rAF callbacks run in
  registration order, and each loop re-registers at the top of its callback, so three's reset always runs just before
  our frame. `setAnimationLoop` would also work, but it costs four more lines in a hotspot and buys nothing until XR
  or the three inspector are wanted.
- **Loading screen: the existing lobby.** `index.html` already starts with the Enter button disabled and labelled
  "Loading island". `initLobby()` (inside `start`) enables it, so it now waits for the GPU. No `index.html` change.
- **No backend works:** the `rendererReady` rejection handler sets `#lobby-sub` to "This browser can't start WebGPU
  or WebGL 2, which Boogle needs to draw the island." and `#enter` to "Can't draw the island" (still disabled). This
  rewords today's "cannot start WebGL" message. WebGLRenderer has needed WebGL 2 since r163, so no device loses
  support.
- **Device lost** (iOS backgrounding, GPU reset; three does not recover WebGPU devices, nor WebGL contexts on its
  WebGL 2 backend): `renderer.onDeviceLost` reloads the page as soon as it is visible, at most once a minute (a
  `sessionStorage` timestamp under `boogle.gfxReload`). Otherwise it leaves the lobby message "The graphics device
  was reset. Reload to keep playing.".

### Output colour: sRGB math, linear output

Every custom shader today computes in sRGB numbers (`srgbVec`, the `C` palette, the sea's literal `vec3`s) and writes
them raw. Under `DirectRenderPipeline` each material's output is treated as linear and encoded to sRGB. The rule for
phase 1 ports is:

- Keep every colour computation exactly as written (sRGB numbers), then return
  `vec4(sRGBTransferEOTF(col), alpha)` from `colorNode`. The pipeline's encode undoes it (float round trip), so the
  pixel, the blend and the alpha are what WebGL wrote.
- Use `MeshBasicNodeMaterial` (unlit, `colorNode` replaces `color` and `map`, alpha = `colorNode.a * opacity`) or
  `SpriteNodeMaterial`/`PointsNodeMaterial`. **Never `fragmentNode`**: it skips the per-material encode.
- Set `fog: false` on every ported material that was a `ShaderMaterial`.
- Particles store linear colour instead (`p.color.getRGB(rgb)` without `SRGBColorSpace`) and need no EOTF.
- **Fog:** `scene.fogNode` mixes in sRGB, reading `scene.fog.color`, `.near` and `.far` live (`sky.js` and the caves
  mutate them in place):
  `vec4(sRGBTransferEOTF(mix(sRGBTransferOETF(output.rgb), sRGBTransferOETF(fogColor), smoothstep(near, far, -positionView.z))), output.a)`.
  That is three transfers per fogged fragment. Phase 2 deletes it.

Phase 2 removes all of this at once (linear inputs, `RenderPipeline` + AgX). Until then the EOTF wrapper marks every
place that still thinks in sRGB.

### Material inventory (complete) and what replaces each

"Breaks" says what happens on `WebGPURenderer` if the file is not ported: **wrong** = blank-material draw plus a
console error; **silent** = the patch is ignored; **throws** = an exception in a frame hook.

| File | Today | Breaks | Node replacement | Step |
|---|---|---|---|---|
| `src/main.js` | `import * as THREE from 'three'` exposed as `window.boogle.THREE` | n/a (bundle keeps `WebGLRenderer`) | `import * as THREE from 'three/webgpu'` | 6 |
| `src/render/scene.js` | `WebGLRenderer`; placeholder sky `ShaderMaterial` (replaced in `createSky` before the first frame) | n/a | `WebGPURenderer`; placeholder becomes a plain `MeshBasicMaterial` in prep | 5, 6 |
| `src/render/water-render.js` | Sea `ShaderMaterial`: vertex wave, 16-bit height texture, depth ramp, fresnel, foam, 8 ripple rings, own fog, alpha | wrong | `MeshBasicNodeMaterial`: `positionNode` (wave), `colorNode` (everything else); `seaU` uniforms, `seaRipples` → `uniformArray` | 6 |
| `src/render/sky.js` | Sky dome `ShaderMaterial` (gradient, glow, moon glow, hashed stars); moon `ShaderMaterial` (phase shading, `discard`); `renderer.shadowMap.autoUpdate` | wrong; flag ignored | Two `MeshBasicNodeMaterial`s with `colorNode`; `skyU`/`moonU` uniform objects; `sun.shadow.autoUpdate` | 3, 5, 6 |
| `src/render/particles.js` | `Points` + `ShaderMaterial` (`gl_PointSize` from world size, round soft dot, `discard`) | wrong (1 px) | Instanced `Sprite` + `SpriteNodeMaterial` (`positionNode`/`scaleNode`/`colorNode` from `InstancedBufferAttribute`s); `sprite.count = live` | 6 |
| `src/pois/lighthouse/index.js` | Beam `ShaderMaterial` (additive cone, `pow(uv.y, 1.6)`) | wrong | `MeshBasicNodeMaterial` additive, `colorNode`; `uOn` → exported uniform | 5, 6 |
| `src/adapters/terrain.js:154` | `onBeforeCompile`: `discard` inside up to 6 hole capsules (cave mouths) | silent: **cave mouths sealed** (gameplay) | `MeshStandardNodeMaterial` + `maskNode` over `uniformArray(holeA/holeB)` | 6 |
| `src/player/item-icons.js` | `WebGLRenderTarget` + sync `readRenderTargetPixels` | **throws** in the hotbar hook | same `WebGLRenderTarget` + `readRenderTargetPixelsAsync`; `setIcon(img, id)` | 4, 6 |
| `src/features/blob-shadows.js` | reads `renderer.shadowMap.autoUpdate` | silent (blobs never show) | reads `sun.shadow.autoUpdate` | 3 |
| `src/features/critter-fireflies.js` | `Points` + `PointsMaterial` (size 0.45, map, vertex colours, additive) | silent (1 px) | Instanced `Sprite` + `PointsNodeMaterial` (same size maths as WebGL) | 7 |
| `src/player/player.js` | throw-preview `Points` + `PointsMaterial` (size 0.2, map, alphaTest) | silent (1 px; aim feedback) | Instanced `Sprite` + `PointsNodeMaterial` | 7 |
| `src/render/material-patch.js` | `patchMaterial` chains `onBeforeCompile` and cache keys | silent | `patchNode(mat, slot, fn)`: wraps one node slot | 8 |
| `src/features/critter-fish.js` | `patchMaterial` tail wiggle using `gl_InstanceID`, `waterMat.uniforms.uTime` | silent (no wiggle) | `MeshStandardNodeMaterial` + `patchNode(..., 'positionNode')` with a per-fish side vector | 8 |
| `src/pois/caves/index.js` | `withCaveAmbient` (patches `lights_fragment_begin` via `THREE.ShaderChunk` to scale hemisphere light by `aAmb`); `brickMaterial` (`dFdx` normal, mortar in `color_fragment`) | silent (bright caves, no bricks) | `patchNode(mat, 'aoNode', ...)` with `attribute('aAmb')`; bricks as `colorNode` | 9 |
| `src/pois/caves/decor.js:521` | calls `withCaveAmbient(new MeshStandardMaterial(...))` | silent | passes a `MeshStandardNodeMaterial` | 9 |
| `src/guest/model.js:53` | `onBeforeCompile`: atlas texture by `guestUv/guestRect/guestMix` replacing `color_fragment` | silent (vertex colours only) | `MeshStandardNodeMaterial` (`vertexColors: false`) + `colorNode` | 10 |
| `src/features/telemetry.js` | n/a | n/a | adds `gfx: 'webgpu' \| 'webgl2'` to the ok-connect report | 11 |
| `dev/look/perf.mjs` | `info.render.calls`, `info.programs.length`, `renderer.shadowMap.needsUpdate` | throws | `info.reset()` + `drawCalls`, `memory.programs`, `sun.shadow.needsUpdate` | 3 |

Grepped and found **nothing** else WebGL-only in `src/`: no `capabilities`, `getContext('webgl*')`, `preserveDrawingBuffer`,
`.glsl` files, `customDepthMaterial`, `onBeforeRender`, `defines`, `clippingPlanes` or `LineSegments`. `getContext('2d')`
and `toDataURL` only touch 2D canvases (textures, icons). `three/addons/utils/BufferGeometryUtils.js` and the
MarchingCubes tables are renderer-free. The `Sprite`s (honk, impact, gifts, avatars, Boogler hearts, lighthouse halo)
and `CanvasTexture`s auto-map unchanged. `PointLight`s in `lights.js` work as they are.

### Uniform handles

Consumers stop reaching into `material.uniforms`. Each module exports a plain object whose entries have a `.value`.
In prep (step 5) these are `{ value }` objects passed as the `ShaderMaterial`'s `uniforms`; in the swap they become
TSL `uniform(...)` nodes with the same `.value` shape. Consumers don't change twice.

- `water-render.js`: `export const seaU = { uTime, uSun, uSky, uLight, uSpecCol, uFog, uFogNear, uFogFar }` and
  `export const seaRipples` (the 8 `Vector4`s; `splash.js` mutates them in place).
- `sky.js`: `const skyU = { uTop, uHorizon, uSun, uMoon, uGlow, uMoonGlow, uStars, uStarRot, uTime }`,
  `const moonU = { uL, uNight, uFade }` (module-private; `updateSky` does `const u = skyU`).
- `lighthouse/index.js`: `beams.userData.on` (the `uOn` handle).

### Shared material patches: `patchNode`

`src/render/material-patch.js` becomes:

```js
// Several modules extend the same node material (terrain, props, critters, caves). patchNode wraps whatever is in one
// node slot (positionNode, colorNode, emissiveNode, aoNode, ...) with fn(prev) and returns the material. prev is null
// when the slot is empty: fn supplies the default (positionLocal for positionNode, materialColor for colorNode, ...).
// No program cache keys: three keys node materials by their node graph.
export function patchNode(mat, slot, fn) {
  if (!mat) return mat;
  mat[slot] = fn(mat[slot] ?? null);
  mat.needsUpdate = true;
  return mat;
}
```

It is renamed rather than kept as `patchMaterial`, so a stale GLSL-style call fails loudly at import.

### Lint guard

Step 5 adds one block to `eslint.config.js`, placed after the `src/sim` block and before the `LOCKSTEP_FILES` block,
with `ignores: [...LOCKSTEP_FILES, ...UNPORTED]`. Lockstep files keep their own `no-restricted-syntax`; "later blocks
replace the rule".

```js
// WebGPURenderer (docs/plans/webgpu-migration.md) never calls onBeforeCompile, can't draw ShaderMaterial and draws
// THREE.Points as 1 px dots. UNPORTED shrinks to [] as the migration lands.
const GL_ONLY = 'WebGL-only: use a NodeMaterial with TSL node slots (docs/plans/webgpu-migration.md).';
const UNPORTED = [ /* step 5: the files still listed in the inventory table; each later step deletes its own */ ];
// ...
{
  files: ['src/**/*.js'],
  ignores: [...LOCKSTEP_FILES, ...UNPORTED],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'MemberExpression[property.name=/^(ShaderMaterial|RawShaderMaterial|ShaderChunk|ShaderLib|UniformsLib|UniformsUtils|WebGLRenderer|Points)$/]',
        message: GL_ONLY,
      },
      {
        selector: 'MemberExpression[property.name=/^(onBeforeCompile|customProgramCacheKey|readRenderTargetPixels)$/]',
        message: GL_ONLY,
      },
    ],
  },
},
```

This also stops the agent working on gameplay in parallel from adding a new `ShaderMaterial` mid-migration. Lint
already allows `three/webgpu` and `three/tsl` everywhere except `src/sim/` and `src/world/rules/`, which must stay
three-free anyway. ESLint's `ecmaVersion: 2022` is fine.

### Tooling and CI

- **Backend in headless runs.** CI runs Chromium on SwiftShader GL, where WebGPU is either missing or a slow
  SwiftShader-Vulkan adapter. The harness picks the backend from outside the game, with **no flag in game code**:
  `Game.open` (`dev/look/lib.mjs`) adds an init script that hides `navigator.gpu`
  (`Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined, configurable: true })`) unless
  `opts.webgpu` or `BOOGLE_GFX=webgpu`. Three then takes its WebGL 2 fallback deterministically (`navigator.gpu.requestAdapter`
  throws, `init()` falls back) and logs one `console.warn`. Scenarios fail only on `pageerror`, and `smoke.mjs`
  only on console errors containing `[world]`, so the warning is harmless. CI keeps covering a path real players use:
  Firefox Android/Linux and older iOS get the same backend.
- `launch({ gpu, webgpu })`: `webgpu` on macOS adds `['--use-angle=metal', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist']`,
  and on Linux `['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist']`.
  Verify by printing the backend (below). If headless macOS returns no adapter, `look.mjs --webgpu` passes
  `headless: false`.
- Every `Game.open` logs the active backend once: `(await import('/src/render/scene.js')).renderer.backend.isWebGPUBackend`.
  Against a built site (`--url`), read `window.boogle.gfx` instead (set in step 11 via `debug-handle.js`). It also
  collects console errors starting with `THREE.` into `g.gfxErrors`; `run.mjs` and `look.mjs` print them but don't
  fail on them in phase 1. Unported materials show up there.
- `look.mjs` gains `--webgpu`, `--gpu` (as `clip.mjs` already has) and `--root <dir>` (passes through to the
  existing `startStack({ root })`, so a worktree of the pre-migration commit can render the "before" stills with this
  harness). Add a `garden` view to `VIEWS`: `{ cam: [30, 7, 15], look: [30, 1, 2.5] }` (patch centre i 228, j 202).
- `dev/look/evals/sunset.js` (`window.boogle.sky.preview(0.55);`), `night.js` (`window.boogle.sky.preview(0.8, 0.5);`)
  and `particles.js` (emits 200 long-lived soft particles beside the court, as below) are small committed eval files,
  so phase 2 can reuse the same comparisons.
- `dev/look/diff.mjs` (`npm run look:diff -- a.png b.png [out.png]`) loads two PNGs into a scratch page, the same
  way `lib.mjs`'s `analyse` does, and prints the mean absolute difference (0-255), the share of pixels off by more
  than 8, and writes a heat image. This gives parity a number as well as a look.
- `npm run perf` reads, for both renderers:
  `const draw = () => { renderer.info.reset(); renderFrame(); return { ...renderer.info.render }; }`. Shadow calls
  are counted by rendering once with `sun.shadow.needsUpdate = true` and once with `autoUpdate = needsUpdate = false`
  (no `castShadow` toggle, so nothing recompiles). Fields: `calls = drawCalls ?? calls`, `tris = triangles`,
  `programs = memory.programs ?? programs.length` (printed as "shader stages" once on the node renderer), and
  `backend`.

### Parity risks and how to check each

Each check pairs a "before" still from the pre-migration worktree (`--root ../boogle-before`) with an "after" still,
both on SwiftShader (`npm run look` defaults). Run `npm run look:diff` on the pair and **open both PNGs**. Expect
mean diff under ~2 where nothing should change. On a Mac, repeat the views that matter with `--gpu` (before) vs
`--webgpu` (after).

| Risk | Why it could break | Check |
|---|---|---|
| Sea alpha over sand | Linear blending if the default pipeline sneaks in; EOTF forgotten | `--view shore`: turquoise shelf brightness and sand showing through match |
| Fog ramp | Node fog mixes linear; `fogNode` not picking up `sky.js` changes | `--view overview` (far hills fade identically); `--eval dev/look/evals/sunset.js --view overview` (fog follows the horizon colour); caves scenario (fog closes in underground) |
| `srgbVec` / raw sRGB maths | Missing `sRGBTransferEOTF`, so everything comes out too dark or too bright | `--view hill` sky gradient and sun glow; sunset and night evals (stars visible, moon disc phase) |
| Shadow bias and filter | Node PCF kernel and WebGPU's [0, 1] clip depth; `bias -0.0004`/`normalBias 0.03` may acne or peter-pan | `--view hill` and `--view court` at noon: no stripes on slopes, palms grounded. Tune `sun.shadow.bias` only if acne shows, and only then |
| Night shadow pass | `autoUpdate` moved to the light | night eval: blob shadows under player and ball (`blob-shadows`) |
| `discard` | Terrain holes, moon edge, particle disc | `npm run scenario -- caves` stills (mouths open); night eval (round moon); particles scenario (round dots) |
| Points to sprites | Size maths | `npm run scenario -- particles` stills and `--eval dev/look/evals/particles.js --view court`; night + `--view garden` (fireflies); hold-throw still in `hotbar` scenario (preview dots) |
| Height texture v axis | DataTexture orientation per backend | `--view shore`: foam hugs the beach, not mirrored offshore |
| Icon readback | Row stride and flip per backend; premultiplied alpha | `npm run scenario -- hotbar` stills with HUD: icons upright, no garbage rows, soft edges |
| Transparent order | Sun/moon billboards at `renderOrder -0.5` must stay under the sea | sunset eval, `--cam` looking at the low sun over the sea: the sea covers the setting sun |
| Screen projection | `toScreen` after the WebGPU coordinate system switch | `two-player-edit` stills with `hud: true` (name tags, prompts where they were) |
| Flat shading / vertex colours | Auto-mapped `MeshStandardNodeMaterial` | `--view hill` terrain facets and colours |
| Cave ambient | `aoNode` stands in for the hemisphere scaling | caves scenario: deep tunnel darker than the mouth |
| MSAA | Must stay on the canvas | `--view court` edges of the stall and palms |

## Steps

Ship each step on its own (`npm run ship`), in this order. Steps 1 to 5 run on today's `WebGLRenderer` and change
nothing on screen; they exist so the swap (step 6) is as small as it can be. Step 6 can't be "the renderer plus one
material": an unported `ShaderMaterial` draws as a blank material, and terrain holes vanish (sealed caves), so every
`ShaderMaterial` and the holes ship together. Steps 7 to 10 are cosmetic ports, one module each; ship them the same
session. `npm run check:full` is only needed if a step touches `src/net*` or `src/world/` (none does).

- [ ] **0. Install and baseline (no commit).**
  - `npm ci` (node_modules is 0.186.1, the lock says 0.187.0). Re-check the facts table on r187:
    `grep -n "DirectRenderPipeline\|PointsNodeMaterial\|SpriteNodeMaterial" node_modules/three/build/three.webgpu.js | head`,
    `grep -n "readRenderTargetPixelsAsync\|needsFrameBufferTarget\|this.shadowMap = {" node_modules/three/src/renderers/common/Renderer.js`,
    `grep -n "fromMaterial" -A12 node_modules/three/src/nodes/core/NodeBuilder.js`. If `DirectRenderPipeline` is gone
    or renamed in r187, stop and ask (it decides the output colour design).
  - `git worktree add ../boogle-before HEAD && npm --prefix ../boogle-before ci`. This is the "before" checkout for
    every comparison; keep it until step 11.
  - `npm run perf` in this checkout and save the table (baseline: 123 calls, 50 shadow, 223k triangles, 37 programs).
    `npm run build` and record `ls -l dist/assets/three-*.js` plus `gzip -c dist/assets/three-*.js | wc -c`.

- [ ] **1. Tooling (`dev/look/lib.mjs`, `dev/look/look.mjs`, `dev/look/diff.mjs`, `dev/look/evals/*.js`,
  `package.json` script `look:diff`, `.claude/skills/look/SKILL.md`).**
  - `lib.mjs`: `launch({ gpu, webgpu })` flags as in Design; `Game.open` options `webgpu` (default
    `process.env.BOOGLE_GFX === 'webgpu'`), the `navigator.gpu`-hiding init script when false, the backend log line
    (guard with `?.`: on today's `WebGLRenderer` `renderer.backend` is undefined, so print `webgl (WebGLRenderer)`),
    `g.gfxErrors`, and the `garden` view.
  - `look.mjs`: `--webgpu`, `--gpu`, `--root <dir>` (into `startStack({ url, root })`), listed in `--help`. Print
    `g.gfxErrors` at the end.
  - `diff.mjs`: as in Design. Reuse `startStack`-free `chromium.launch()` and a `page.setContent('<canvas>')` scratch
    page; read the PNGs with `fs` as base64 data URLs.
  - `evals/particles.js`:
    `const { emit } = await import('/src/render/particles.js'); const C = window.boogle.THREE.Color; for (let k = 0; k < 200; k++) emit('soft', { x: 11 + Math.random() * 3, y: 1 + Math.random() * 2, z: 22 + Math.random() * 3, life: 60, size: 0.25 + Math.random() * 0.3, color: new C('#f4fbff'), alpha: 0.85 });`
  - SKILL.md: a short "Renderer backends" paragraph (default WebGL 2 fallback in headless runs, `--webgpu`/`BOOGLE_GFX`,
    `--root` for before/after, `look:diff`), and in section 3 say "programs" means shader stages after the migration.
  - Verify: `npm run look -- --view hill` still works and prints the backend; `npm run look:diff -- .look/hill-still.png .look/hill-still.png` prints 0; `npm run check`.

- [ ] **2. Start-up order on WebGL (`src/render/scene.js`, `src/main.js`).**
  - `scene.js`, after `camera` is declared: `export const rendererReady = Promise.resolve(renderer);` and
    `export const renderFrame = () => renderer.render(scene, camera);` with a comment saying step 6 makes them real.
  - `main.js`, exactly three edits: the import line becomes
    `import { scene, camera, rendererReady, renderFrame } from './render/scene.js';`, `renderer.render(scene, camera);`
    becomes `renderFrame();`, and the last line `start();` becomes `rendererReady.then(start);`.
  - Verify: `npm run check`; `npm run scenario -- world-inputs`; a `--view hill` still is pixel-identical to before
    (`look:diff` mean 0 to within SwiftShader noise).

- [ ] **3. Per-light shadow toggle and backend-neutral perf (`src/render/sky.js`, `src/features/blob-shadows.js`,
  `dev/look/perf.mjs`).**
  - `sky.js:341`: `sun.shadow.autoUpdate = sun.intensity > 0.01;` (comment unchanged).
  - `blob-shadows.js`: import `sun` instead of `renderer`; `const night = proto.on('shadows') && !sun.shadow.autoUpdate;`.
  - `perf.mjs` `STATS`: import `{ renderer, renderFrame, sun }`. Then:
    ```js
    const draw = () => { renderer.info.reset(); renderFrame(); return { ...renderer.info.render }; };
    const keep = sun.shadow.autoUpdate;
    sun.shadow.autoUpdate = false;
    sun.shadow.needsUpdate = true;
    const a = draw();                  // with the shadow pass
    const b = draw();                  // needsUpdate cleared by the pass: no shadow pass
    sun.shadow.autoUpdate = keep;
    const r = renderer.info;
    return {
      backend: renderer.backend ? (renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2') : 'webgl',
      calls: a.drawCalls ?? a.calls, shadowCalls: (a.drawCalls ?? a.calls) - (b.drawCalls ?? b.calls),
      tris: a.triangles, geometries: r.memory.geometries, programs: r.memory.programs ?? r.programs.length,
    };
    ```
    Update the header comment ("programs" = WebGL programs, or shader stages on the node renderer).
  - Verify: `npm run perf -- --render` gives the baseline numbers (123 / 50 / 223k / 37); night eval still
    (`npm run look -- --eval dev/look/evals/night.js --view court`) shows blob shadows; `npm run check`.

- [ ] **4. Async item icons (`src/player/item-icons.js`, `src/features/hotbar.js:172`, `src/boogler/dialogue.js:188`).**
  - Replace `iconFor` with `export function setIcon(img, id)`. It sets `img.dataset.icon = id`; if the URL is cached
    it sets `img.src` now, otherwise it queues the render and sets `img.src` when ready if `img.dataset.icon` still
    equals `id`. Renders run one at a time: `let queue = Promise.resolve(); const pending = new Map();`, and
    `pending.get(id) ?? pending.set(id, (queue = queue.then(() => render(id)))).get(id)`.
  - `render(id)` is today's body, made async. Keep `new THREE.WebGLRenderTarget(ICON, ICON)`: `WebGLRenderer`'s
    readers throw on a plain `RenderTarget` (`isWebGLRenderTarget` check), and the node renderer accepts the subclass.
    Pixels come from one helper so step 6 changes one line:
    `const readIcon = (t) => renderer.readRenderTargetPixelsAsync(t, 0, 0, ICON, ICON, new Uint8Array(ICON * ICON * 4));`
    (the WebGL signature).
  - Unpack with a stride and flip that work for both backends:
    `const stride = (px.length - ICON * 4) / (ICON - 1);` (tight on WebGL, 256-byte rows on WebGPU) and
    `const flip = !renderer.backend?.isWebGPUBackend;` (WebGL rows run bottom-up). Source row for output row y:
    `flip ? ICON - 1 - y : y`; byte offset `row * stride + x * 4`.
  - Callers: `if (s) setIcon(img, s.id);` and `setIcon(img, gift.id);`.
  - Verify: `npm run scenario -- hotbar` with the HUD stills (icons upright and identical to before); `npm run check`.

- [ ] **5. Uniform handles, placeholder sky, lint guard (`src/render/water-render.js`, `src/render/splash.js`,
  `src/features/critter-fish.js`, `src/render/sky.js`, `src/render/scene.js`, `src/pois/lighthouse/index.js`,
  `eslint.config.js`).**
  - `water-render.js`: `export const seaRipples = Array.from({ length: 8 }, () => new THREE.Vector4())` and
    `export const seaU = { uTime: { value: 0 }, uRip: { value: seaRipples }, uHeight: { value: heightTex }, ... }` (all
    of today's entries). Pass `uniforms: seaU`. In step 6 `uRip`/`uHeight` leave `seaU`; consumers never use them.
  - `splash.js`: `import { seaRipples } from './water-render.js'; const ripples = seaRipples;`.
  - `critter-fish.js`: `sh.uniforms.uT = seaU.uTime;` (import `seaU`).
  - `sky.js`: `const skyU = {...}` and `const moonU = { uMap: { value: null }, uL, uNight, uFade }`, passed as
    `uniforms`. `updateSky` uses `const u = skyU`, `moonU.uL.value...`, `moonU.uNight.value`, `moonU.uFade.value`,
    and `const w = seaU`.
  - `scene.js`: the placeholder sky material becomes
    `new THREE.MeshBasicMaterial({ color: FOG_HEX, side: THREE.BackSide, depthWrite: false, fog: false })`. Drop the
    now-unused `srgbVec` and `SUN_DIR` imports if nothing else uses them.
  - `lighthouse/index.js`: `beams.userData.on = beamMat.uniforms.uOn;` and line 312 becomes
    `beams.userData.on.value = n;`.
  - `eslint.config.js`: the guard block from Design, with `UNPORTED` = `src/render/scene.js`,
    `src/render/water-render.js`, `src/render/sky.js`, `src/render/particles.js`, `src/render/material-patch.js`,
    `src/adapters/terrain.js`, `src/pois/lighthouse/index.js`, `src/pois/caves/index.js`,
    `src/features/critter-fish.js`, `src/features/critter-fireflies.js`, `src/player/player.js`, `src/guest/model.js`.
    `npm run lint` must pass (if it flags a file not on the list, that file was missed in the inventory: add it to
    the table in this doc and to a step).
  - Verify: `npm run check`; `look:diff` of `--view shore` and the sunset eval against step 4 shows no change;
    `npm run scenario -- lighthouse`.

- [ ] **6. The swap: renderer, async init, every `ShaderMaterial`, terrain holes (`src/render/scene.js`,
  `src/render/water-render.js`, `src/render/sky.js`, `src/render/particles.js`, `src/pois/lighthouse/index.js`,
  `src/adapters/terrain.js`, `src/player/item-icons.js`, `src/main.js`, `eslint.config.js`, `vite.config.js`).** The riskiest commit. Port
  the sea first and check it before doing the others.
  - `scene.js`:
    ```js
    import * as THREE from 'three/webgpu';
    import { Fn, vec4, mix, output, uniform, reference, positionView, smoothstep, sRGBTransferEOTF, sRGBTransferOETF } from 'three/tsl';

    export const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    // ...setPixelRatio, shadowMap.enabled/type, NoToneMapping as today...
    renderer.onDeviceLost = () => { /* reload when visible, at most once a minute (Design) */ };
    export const rendererReady = renderer.init().catch((e) => {
      document.getElementById('lobby-sub').textContent =
        "This browser can't start WebGPU or WebGL 2, which Boogle needs to draw the island.";
      document.getElementById('enter').textContent = "Can't draw the island";
      throw e;
    });
    // ...scene, fog, camera as today, then the sRGB fog (Design, "Output colour"):
    const fogColor = uniform(scene.fog.color);
    const fogNear = reference('near', 'float', scene.fog), fogFar = reference('far', 'float', scene.fog);
    scene.fogNode = Fn(() => {
      const f = smoothstep(fogNear, fogFar, positionView.z.negate());
      return vec4(sRGBTransferEOTF(mix(sRGBTransferOETF(output.rgb), sRGBTransferOETF(fogColor), f)), output.a);
    })();
    // Phase 1 renders through DirectRenderPipeline: sRGB encode in each material, blending in sRGB as WebGL did, no
    // full-screen pass. Phase 2 swaps this for a RenderPipeline (linear HDR + AgX).
    const pipeline = new THREE.DirectRenderPipeline(renderer);
    export const renderFrame = () => pipeline.render(scene, camera);
    ```
    `scene.fog` must stay the same object (never reassign it): the uniforms hold references.
  - `water-render.js`: `MeshBasicNodeMaterial({ transparent: true, fog: false })` (depthWrite stays true, as today).
    `seaU` entries become `uniform(...)` nodes with the same initial values; `const uRip = uniformArray(seaRipples, 'vec4')`;
    `texture(heightTex, uv)` inside the Fn. `positionNode`: `vec3(p.x, p.y.add(wave), p.z)` from `positionLocal`,
    with the comment "the sea plane never moves, so local = world". `colorNode`: a line-by-line `Fn` port of the
    fragment shader, reading `positionWorld` (displaced) and `cameraPosition`, with every constant kept. The ring loop is
    `Loop(8, ({ i }) => { const rp = uRip.element(i); If(rp.w.greaterThan(0), () => { ... ring.addAssign(...) }) })`
    with `ring = float(0).toVar()`. Sample the height texture first, before any `If`. Return
    `vec4(sRGBTransferEOTF(mix(col, seaU.uFog, f)), mix(alpha, 1, f))`. Check the shore view now, before continuing.
  - `sky.js`: `skyU`/`moonU` entries become `uniform(...)` (`uStarRot: uniform(new THREE.Matrix3())`). The sky is a
    `MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false })` with `colorNode` = a port of the
    fragment shader using `normalize(positionGeometry)` for `vDir`. `hash` becomes a `Fn(([p]) => ...)`. Write the
    reversed `smoothstep(0.24, 0.04, dd)` as `smoothstep(0.04, 0.24, dd).oneMinus()` (identical; WGSL is stricter
    about reversed edges). End with `vec4(sRGBTransferEOTF(min(col, 1)), 1)`. Build the moon material inside
    `createSky` as `makeMoonMat(moonFaceTexture())` (so `texture(map, uv())` has its texture), `transparent: true`,
    `depthWrite: false`, `fog: false`. Sample the texture first, then `Discard(edge.lessThanEqual(0))`, then the
    phase maths; return `vec4(sRGBTransferEOTF(col), a)`.
  - `particles.js`: `emit` stores linear colour (`p.color.getRGB(rgb)`; fix the comment). Four
    `THREE.InstancedBufferAttribute`s wrap the existing arrays (`soft.pos`, `soft.color`, `softSize`, `softAlpha`),
    `setUsage(THREE.DynamicDrawUsage)`. `softMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false })`
    with `positionNode = instancedDynamicBufferAttribute(posAttr)` (centres, world), `scaleNode = instancedDynamicBufferAttribute(sizeAttr)`
    (world diameter, which is what `aSize * uScale / depth` drew), and `colorNode = Fn(() => { const d = length(uv().sub(0.5)).mul(2); Discard(d.greaterThan(1)); return vec4(colorAttrNode, alphaAttrNode.mul(d.mul(d).oneMinus())); })()`.
    `softPoints = new THREE.Sprite(softMat)`, `frustumCulled = false`, `renderOrder = 5`. In the late hook, replace
    `setDrawRange` and the `uScale` line with `softPoints.count = ns;` plus `needsUpdate = true` on the four
    attributes. Drop the `renderer` import.
  - `lighthouse/index.js`: `const beamOn = uniform(0)`; `MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })`,
    `colorNode = vec4(color(new THREE.Color().setRGB(1, 0.9, 0.6, THREE.SRGBColorSpace)), pow(uv().y, 1.6).mul(beamOn).mul(0.42))`;
    `beams.userData.on = beamOn`.
  - `terrain.js`: `terrainMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })`
    (from `three/webgpu`). `const uHoleA = uniformArray(holeA, 'vec4'), uHoleB = uniformArray(holeB, 'vec4');` and
    `terrainMat.maskNode = Fn(() => { const keep = bool(true).toVar(); const g = positionGeometry; Loop(MAX_HOLES, ({ i }) => { const a = uHoleA.element(i), b = uHoleB.element(i); If(a.w.greaterThan(0), () => { const pa = g.sub(a.xyz), ba = b.xyz.sub(a.xyz); const t = clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1); If(length(pa.sub(ba.mul(t))).lessThan(a.w).and(g.y.greaterThan(b.w)), () => keep.assign(false)); }); }); return keep; })();`.
    Delete the `onBeforeCompile` block. The shadow pass ignores `maskNode`, as the WebGL depth material ignored the
    patch (parity).
  - `item-icons.js`: `readIcon` becomes `(t) => renderer.readRenderTargetPixelsAsync(t, 0, 0, ICON, ICON)`.
  - `main.js`: `import * as THREE from 'three';` becomes `import * as THREE from 'three/webgpu';` (the only `main.js`
    line in this step). `window.boogle.THREE` then exposes the node classes for console use.
  - `eslint.config.js`: drop `scene.js`, `water-render.js`, `sky.js`, `particles.js`, `lighthouse/index.js` and
    `terrain.js` from `UNPORTED`.
  - `vite.config.js`: `chunkSizeWarningLimit` to fit the new three chunk (measure; about 1600), with the comment
    updated ("three.js with the WebGPU renderer and TSL is ~N kB minified").
  - Verify, in this order:
    1. `npm run check` (lint, unit tests, build). In `dist/assets/three-*.js`, `grep -c "THREE.WebGLRenderer:"` must
       be 0 (WebGLRenderer tree-shaken). Record the size and gzip size next to step 0's.
    2. `npm run dev`, open the game in desktop Chrome (WebGPU) and Firefox or `navigator.gpu`-less Chrome (WebGL 2):
       the console has no `THREE.` errors and no "Multiple instances of Three.js".
    3. `npm run scenario -- world-inputs smoke two-player-edit` (CI's set) and `caves lighthouse particles hotbar`.
       They must pass **and** print an empty `gfxErrors` list: CI only fails on `pageerror`, so a `NodeBuilder`
       "not compatible" error would otherwise go unnoticed.
    4. Every row of the parity table except fireflies, preview, caves interior, fish and guest (still pending), as
       before/after `look:diff` pairs against `../boogle-before`. Mean diff under ~2 per view. Open every image.
    5. `npm run perf -- --render`: calls within a few of 123, shadow calls 50, triangles 223k plus 2 per live sprite
       instance; record the new "programs" (shader stages) as the baseline.
    6. Compare CI scenario leg times with the last green run on `main`. If a leg is >50 % slower, see Risks.

- [ ] **7. Sized points as instanced sprites (`src/features/critter-fireflies.js`, `src/player/player.js`,
  `eslint.config.js`).**
  - Fireflies: wrap `pos` and `col` in `InstancedBufferAttribute`s (`DynamicDrawUsage`).
    `new THREE.Sprite(new THREE.PointsNodeMaterial({ size: FLIES.size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, alphaToCoverage: false }))`
    (keep `sizeAttenuation` true and fog true, as `PointsMaterial` had them), with
    `positionNode = instancedDynamicBufferAttribute(posAttr)` and `colorNode = texture(glow).mul(vec4(instancedDynamicBufferAttribute(colAttr), 1))`
    (`colorNode` replaces `map`, so the glow is multiplied in here). Set `flies.count = FLIES.count` and the two
    `needsUpdate` flags on the instanced attributes. `alphaToCoverage: false` keeps WebGL's plain alpha blend at
    the edges (MSAA would otherwise dither them). `PointsNodeMaterial` on a sprite scales like WebGL's
    `PointsMaterial` (half the canvas height, no fov term), so the size number stays.
  - Throw preview: the same with `new THREE.PointsNodeMaterial({ map: dotTex, size: 0.2, transparent: true, opacity: 0.9, alphaTest: 0.3, depthWrite: false, alphaToCoverage: false })`
    and no `colorNode` (the map applies). `previewGeo.setDrawRange(0, n)` becomes `preview.count = n`.
  - Remove both files from `UNPORTED`.
  - Verify: night eval + `--view garden` before/after (fireflies the same size and glow); hold-throw stills in the
    `hotbar` scenario (preview dots visible, same spacing); `npm run check`.

- [ ] **8. `patchNode` and the fish (`src/render/material-patch.js`, `src/features/critter-fish.js`, `eslint.config.js`).**
  - `material-patch.js`: replace the file body with `patchNode` from Design.
  - Fish: `mat = new THREE.MeshStandardNodeMaterial({ color: '#ff6a1a', emissive: '#7a2a00', roughness: 0.6, flatShading: true })`.
    Add a per-fish side vector, `const side = new THREE.InstancedBufferAttribute(new Float32Array(FISH.count * 3), 3).setUsage(THREE.DynamicDrawUsage)`.
    Where the matrix is composed (line ~167) write the fish's local +x in world space:
    `tmp.set(1, 0, 0).applyQuaternion(q); side.setXYZ(k, tmp.x, tmp.y, tmp.z);`, and set `side.needsUpdate = true`
    next to `instanceMatrix.needsUpdate`. Then:
    `patchNode(mat, 'positionNode', (prev) => (prev ?? positionLocal).add(instancedDynamicBufferAttribute(side).mul(sin(seaU.uTime.mul(13).add(float(instanceIndex).mul(1.7))).mul(max(0, positionGeometry.z.negate())).mul(0.35))))`.
    `positionNode` runs after three has applied the instance matrix, so the offset must already be in mesh space;
    that is why the side vector exists. If the wiggle looks wrong, drop it (cosmetic, behind the `fish` flag) and say
    so in the commit.
  - Remove both files from `UNPORTED`.
  - Verify: a `--view shore` motion sheet (`--frames 8 --seconds 2`) with the `fish` flag on shows wiggling tails;
    `npm run check`.

- [ ] **9. Caves (`src/pois/caves/index.js`, `src/pois/caves/decor.js`, `eslint.config.js`).**
  - Delete `HEMI_LINE`, `HEMI_SCALED` and the `ShaderChunk` warning. `withCaveAmbient(mat)` becomes
    `patchNode(mat, 'aoNode', (prev) => (prev ? prev.mul(aAmb) : aAmb))` with `const aAmb = attribute('aAmb', 'float')`.
    This is exact: the hemisphere light is the only indirect light, and `aoNode` scales `indirectDiffuse` (see
    `PhysicalLightingModel.ambientOcclusion`). With no environment map, indirect specular is zero either way.
  - `brickMaterial()`: `new THREE.MeshStandardNodeMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })`
    with `colorNode` = a `Fn` that computes `n = normalize(cross(dFdx(w), dFdy(w)))` from `w = positionGeometry`
    **before** any branch, then `p` with `select(...)`, `row = floor(p.y)`, `p.x += mod(row, 2) * 0.5`, mortar and
    tint exactly as the GLSL, and returns `vec4(vec3(select(aBrick.greaterThan(0.5), k, 1)), 1)` with
    `aBrick = attribute('aBrick', 'float')`. Vertex colours still multiply it (`vertexColors: true`), as
    `color_fragment` did. WebGPU's `dFdy` has the opposite sign, which only flips `n`; the code uses `abs(n)`.
  - The material at index.js line ~210 and `decor.js:521`: `MeshStandardNodeMaterial` with the same options.
  - Remove `caves/index.js` from `UNPORTED`.
  - Verify: `npm run scenario -- caves` before/after stills (brickwork, darkening with depth, mouths still open);
    `npm run check`.

- [ ] **10. Guest model (`src/guest/model.js`, `eslint.config.js`).**
  - `modelMaterial()`: `new THREE.MeshStandardNodeMaterial({ vertexColors: false, roughness: 0.7, metalness: 0 })`.
    The vertex colour is folded in by hand, because the old patch replaced `color_fragment`:
    ```js
    const vc = attribute('color', 'vec3'), gUv = attribute('guestUv', 'vec2');
    const gRect = attribute('guestRect', 'vec4'), gMix = attribute('guestMix', 'float');
    mat.colorNode = Fn(() => {
      const t = texture(atlas, gRect.xy.add(clamp(gUv, 0, 1).mul(gRect.zw))); // sampled first: uniform control flow
      const col = vc.toVar();
      If(gMix.greaterThan(0.5), () => {
        If(gMix.lessThan(1.5), () => col.assign(mix(vc, t.rgb, t.a)))
          .ElseIf(gMix.lessThan(2.5), () => col.assign(t.rgb))
          .Else(() => col.assign(vc.mul(t.rgb)));
      });
      return vec4(col, 1);
    })();
    ```
    The atlas is `SRGBColorSpace` and the vertex colours are linear (`lin()`), as before.
  - Remove `model.js` from `UNPORTED`; `UNPORTED` is now `[]`. Leave the empty list and its comment for one release,
    then delete it.
  - Verify: `npm run scenario -- guest-play` and `dino` stills before/after (textured guest); `npm run check`.

- [ ] **11. Close out (`src/features/telemetry.js`, `src/features/debug-handle.js`, `AGENTS.md`, `src/README.md`,
  `docs/research/stylized-rendering-on-a-budget.md`, `.claude/skills/look/SKILL.md`).**
  - `telemetry.js`: add `gfx: renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2'` to the ok-connect report.
    That is its 10th key; the server keeps 12 (`server/src/server.js` ~94).
  - `debug-handle.js`: `window.boogle.gfx` (same value), for scripts against a built site.
  - `AGENTS.md`, under "Shared registries", one bullet: materials are node materials (TSL slots, `three/webgpu` +
    `three/tsl`); shared slots go through `patchNode` (`src/render/material-patch.js`); in phase 1, custom colours are
    sRGB maths wrapped in `sRGBTransferEOTF` with `fog: false`. No `ShaderMaterial`/`onBeforeCompile` (lint).
  - `src/README.md` `render/` line: "scene, renderer (WebGPU with a WebGL 2 fallback) and camera, ...".
  - Research doc: a dated note under the WebGPU sentence (2026-10-30: Boogle moved to `WebGPURenderer` for a future
    high tier; the floor tier still follows this doc; see docs/plans/webgpu-migration.md). Don't rewrite the doc.
  - `git worktree remove ../boogle-before`.
  - Commit body: "Small and readable / Measure before optimizing; deliberately revisits the research doc's 'WebGPU
    not needed' call." `docs/game-design.md` needs no change: nothing a player can see or do changes.

- [ ] **12. On-device check (manual, no commit).** Real frame time, since headless numbers mean nothing. The Mac
  Safari/Chrome devtools performance panel, or a `?netdebug=1` frame-time readout if one exists, on:
  - iPhone or iPad on iOS 26 Safari (WebGPU),
  - an older iOS (WebGL 2 backend),
  - Android Chrome (WebGPU),
  - Firefox Android or Linux (WebGL 2).

  Compare with `boogle.club` from before the swap on the same device. Note the results in `docs/playtests.md`. A
  >10 % frame-time regression on the WebGL 2 backend is a phase-2 blocker (see Risks).

## Risks

- **Hotspots:** `src/main.js` gets three one-line edits in step 2 and one (the `three/webgpu` import) in step 6. `index.html`, `src/style.css`, `PLAN.md` and
  `src/world/rules/index.js` are untouched. `eslint.config.js` gets one block, then deletions.
- **Files the gameplay agent may edit at the same time:** `src/player/player.js` (step 7), `src/features/hotbar.js`
  (step 4, one line), `src/boogler/dialogue.js` (step 4, one line), `src/features/blob-shadows.js` (step 3). Keep
  those edits minimal and ship them in their own commits; on a rebase conflict keep both sides.
- **Don'ts (AGENTS.md) that apply:** no `Math.random` concerns (all Local); don't patch another module's material by
  reaching into it, use `patchNode`; lazy modules (`caves`, `lighthouse`, `guest`) import `three/webgpu` themselves,
  which is fine because the three chunk is shared.
- **Mixed builds:** none. No wire change: no ops, states, presence keys or messages. The telemetry field is additive.
- **Bundle size:** `three.webgpu.js` + `three.tsl.js` + core is much larger than core + `three.module.js` (unminified
  1.35 + 1.07 + 1.47 MB vs 0.66 + 1.47 MB; today's chunk is 746 kB minified). Expect several hundred kB more
  minified on first load. Measured in steps 0 and 6; a slow first load on phones is the cost of the owner's goal.
  Watch it.
- **Shader compile hitch:** node materials build on first draw. The WebGL 2 backend compiles synchronously, so the
  first frame and the first time the caves, guest or lighthouse appear may stutter. If it is noticeable on device,
  phase 2 can `await renderer.compileAsync(scene, camera)` while the lobby still says "Loading island".
- **CI speed on SwiftShader:** WebGPURenderer's WebGL 2 backend has bigger shaders (UBOs, node prelude) than
  WebGLRenderer, and scenarios already run at a few fps. If step 6 makes a CI leg >50 % slower or time out, raise
  that scenario's `timeout` first (no behaviour change). Don't drop the WebGL 2 backend in CI: it is the fallback
  players use.
- **WebGL 2 backend performance on real devices:** the fallback is less mature than WebGLRenderer. Step 12 measures
  it; a regression there hurts exactly the low-end players the floor tier is for.
- **Performance tooling:** `npm run perf` before (step 0) and after (step 6). Draw calls must not grow. "programs"
  changes meaning, so record the new baseline in the step 6 commit body.
- **r187 drift:** every API above was read in r186. Step 0 re-checks the ones the design rests on.
- **Device loss on iOS:** handled by reload in step 6; watch telemetry for repeated reloads.

## Phase 2 (outline only): linear HDR, AgX, re-tuned palette, adaptive resolution

- Replace `DirectRenderPipeline` with a `RenderPipeline` (linear HalfFloat target, one output pass) and
  `renderer.toneMapping = THREE.AgXToneMapping` (or `NeutralToneMapping` if AgX greys the toy palette). Delete the
  sRGB `scene.fogNode` (three's own range fog then mixes in linear). Remove every `sRGBTransferEOTF` wrapper, turn
  `srgbVec` palettes into linear `THREE.Color`s, and re-tune by eye against phase-1 stills: `sky.js` `C` (day, sunset
  and night tops and horizons, glows), the sea's shallow, mid and deep colours, `uSky`, foam, the `L` light palette
  and the hemisphere/sun intensities.
- This adds the full-screen pass the research doc warns about: measure it on iPad before and after, and keep the
  phase-1 pipeline as the low rung if it costs too much.
- Adaptive resolution: a Local `src/features/adaptive-res.js` keeps a frame-time EMA and steps
  `renderer.setPixelRatio` between `0.6 * min(dpr, 2)` and `min(dpr, 2)` by 10 %. Step down after 2 s above 18.5 ms,
  step up after 5 s under 14 ms, at most once every 2 s, and never in the first 5 s. With a `RenderPipeline`, scaling
  only the scene pass is an option.

## Phase 3 (outline only): a quality ladder

- A Local setting `boogle.quality` (`auto | low | medium | high`) in localStorage, shown in the pause view, with a
  `docs/game-design.md` section. `auto` picks by backend (`renderer.backend.isWebGPUBackend`), `isTouch` and measured
  frame time. Every rung change is measured with `npm run perf` and on device.
- Low: the phase-1/2 floor (research-doc looks inside materials, MSAA, no extra passes).
- Medium:
  - compute particles behind the unchanged `emit()` API in `src/render/particles.js` (storage buffers plus a compute
    update; the WebGL 2 backend keeps the CPU pool);
  - TRAA in place of MSAA;
  - bloom for the sun, lanterns and lighthouse;
  - ClusteredLighting for night lanterns, replacing the 2-light pool in `src/render/lights.js` (WebGPU only);
  - CSM shadows (`CSMShadowNode`) for a longer shadow range.
- High: GTAO, SSGI, SSR on the sea, god rays, and a LightProbeGrid for the caves.

## Open questions

1. **DirectRenderPipeline for phase 1.** It is what makes parity possible (sRGB blending, no full-screen pass,
   canvas MSAA). Confirm it is fine that phase 1 deliberately doesn't use three's default output path.
2. **Exact fog.** The sRGB `scene.fogNode` costs three colour transfers per fogged fragment until phase 2 deletes it.
   The alternative is accepting linear fog now (a visibly hazier mid-distance) and re-tuning it in phase 2. The plan
   keeps exact parity.
3. **Backend override.** The plan keeps game code flag-free: the test harness hides `navigator.gpu` to get the WebGL 2
   backend. The cost is that there's no way to A/B both backends on one phone for step 12. Add a `?gl=1` URL param
   (one line in `scene.js`: `forceWebGL`) for that, or keep it flag-free?
4. **Shipping cadence.** Steps 1 to 5 ship invisibly. Step 6 is one larger commit; steps 7 to 10 leave fireflies,
   preview dots, caves interior, fish and the guest degraded on the live site for a few hours. OK, or hold steps 6
   to 10 on one branch and ship them as one PR?
5. **Device lost.** An automatic reload when visible (at most once a minute) vs only showing a message.
6. **Docs and roadmap.** Amend the research doc with a dated note (planned) or leave it untouched; and add phases 2
   and 3 to `PLAN.md` (a hotspot, one line each)?
7. **WebGPU in CI.** Phase 1 tests the WebGPU backend only locally (`--webgpu` on a Mac). Add a non-blocking nightly
   leg on SwiftShader-Vulkan later?

## Owner's decisions (30 October 2026): these override the plan above

- **No parity.** Phase 1 and phase 2 land together as one change, on branch `claude/webgpu-migration`, as one PR.
  Today's exact look doesn't need to survive: we're prototyping and will improve it.
  - Render through a `RenderPipeline` (linear HDR, one output pass) with `renderer.toneMapping = THREE.AgXToneMapping`
    (fall back to `NeutralToneMapping` if AgX greys the toy palette). This is the base that later post effects (TRAA,
    bloom, GTAO, SSGI) plug into.
  - No `DirectRenderPipeline`, no sRGB `scene.fogNode` (three's own fog), no `sRGBTransferEOTF` wrappers.
  - Ported shaders compute in linear: palettes become linear `THREE.Color`s (or `srgbVec` converted once), and are
    re-tuned by eye with `/look` until the island reads bright, warm and toy-like at noon, sunset and night.
- The before/after `look:diff` parity machinery (`--root ../boogle-before`, diff.mjs, mean-diff thresholds) is
  dropped. Stills are still checked by eye.
- One PR for everything; no per-step shipping.
- The rest of the plan stands: async init through `rendererReady`, a device-lost reload at most once a minute,
  sized points as instanced sprites, `patchNode`, async icon readback, the lint guard, and the backend switch in the
  test harness that hides `navigator.gpu`.
- Adaptive resolution (phase 2 outline) is part of this change. The phase 3 quality ladder is not.
