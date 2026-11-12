## The frame

- [`scene.ts`](../scene.ts) builds `renderer`, `scene`, `camera`, `sun` and the sky placeholder synchronously, so
  modules can import them at load. `renderer.render()` throws until `renderer.init()` resolves: the network and lobby start at once, and
  `main.ts` waits for `rendererReady` only for the frame loop and the Enter button ("Loading island" is the loading
  screen); it also waits for `drawable`, the canvas's first non-zero box, so a load into a hidden or 0x0 pane builds
  no screen target until it is shown ([`drawable-size.ts`](../drawable-size.ts): the drawing buffer, the scene pass
  and scaled targets such as water bloom never size below 1x1). Behind it, [`precompile.ts`](../precompile.ts) builds what the lobby view draws (its real frame, with Buddy
  in it so his shadow pipelines build too, plus the `warmUp()` objects that are not deferred); the rest of the scene
  builds after the loading screen lifts, in rings out from the camera: compileAsync for the camera pass, then the
  ring's shadow casters unculled a batch a frame (compileAsync builds only the camera pass). From the end of the first
  pass nothing in the scene builds a shader or pipeline synchronously in a frame: an object first drawn without a
  shader is held out of the frame and compiled, and a missing pipeline is built with createRenderPipelineAsync while
  three skips the object, so a miss appears a moment late instead of stalling (docs/research/cold-start.md, 5b and 5c).
  The boot marks `shaders-ring-<n>` and `shaders-all` time it. The audio context is built there
  too, suspended, and the first gesture only resumes it (`src/features/audio-prepare.ts`). A lazy part calls
  `precompile(object)` as it builds its meshes. On iOS 27 Safari a `compileAsync` after the first frames can throw
  "Texture already initialized" for the shadow map (three.js #35069, a WebKit bug); `precompile.ts` skips the second
  create and warns once (`[precompile] three.js #35069`), so look for that line in Web Inspector on an iPad. `main.ts` hands the frame to `renderer.setAnimationLoop`, so three
  resets `renderer.info`, ticks the TSL `time` and then runs ours, in that order; `renderer.info.render` holds the
  last frame's counts until the next one starts. `guardGraphicsFrame` skips hidden callbacks, and latches device loss,
  thrown callbacks and sustained GPU errors into a visible Reload instruction. Isolated uncaptured errors only arm
  bounded, ordered error-scope/queue checks: 60 consecutive checked failing draw submissions are required to stop.
  A clean draw resets and disarms; an unchecked gap, unavailable check or visibility transition breaks the streak.
  No wall-time threshold or normal-frame GPU check is added. It preserves three's lost-device guard.
  The page never automatically navigates or resets the room; the existing background world clock is unchanged.
- Every frame goes through one `RenderPipeline`: `scenePass` (`pass(scene, camera)`, a linear HDR target with MSAA)
  whose 4x samples are stored (the default). Discarding them (`storeMultisampled*Buffer: false`, which makes three use a
  `TRANSIENT_ATTACHMENT` memoryless texture on Safari 27) blanked the scene on iPad Safari 27 (1 Nov 2026: only the clear
  colour; Safari 27 on an M1 Mac was fine), so it stays off until tested on an iPad;
  then one output pass that tone maps and encodes sRGB. Every route uses `water/post.ts`: underwater HDR,
  authored fixed gain from `exposure.ts`, Neutral, then sRGB; no meter draws or history copy. Draw with
  `renderFrame()`. It renders the scene once per animation frame; a second call in the same frame only redraws the
  output quad, so don't call it twice to measure anything.
- **Post effects** (bloom, TRAA, GTAO, SSGI, god rays, DoF: `three/addons/tsl/display/`) extend that chain: build a
  node from `scenePass` (`scenePass.getTextureNode()`, MRT outputs), assign `pipeline.outputNode`, and set
  `pipeline.needsUpdate = true`. Each full-screen effect costs fill on phones: measure it on a real device, and plan
  for a quality setting rather than turning it on for everyone.
- [`quality.ts`](../quality.ts) owns resolution after scene initialization. Adaptive resolution requests 0.6x–1x
  of `min(devicePixelRatio, 2)` and water requests its ceiling: the scene uses their minimum, never their product.
  Dev can override the adaptive request with a fixed scale. Output post retains the canvas resolution. Do not call
  `setPixelRatio` or `scenePass.setResolutionScale` from other owners. The Local frame cap gates only the final
  `renderFrame()`; every callback still runs physics, input, networking, water FFT/queries and the adaptive observer.
  Skipped draws close profiling's callback state without incrementing its completed-render count.

## Known: TRAA and the warm-up compile race on the sea's opaque depth (three r187)

Found 11 November on Windows (Edge, D3D12, RTX 3080); not fixed. The default game is clean, because every context
that draws the sea is 4x. It bites the look lab's `high`, `ultra` and `+ssgi` presets and `fx=taa` in real time:
`renderPipeline_sea: Binding multisampled flag (1) doesn't match the layout's multisampled flag (0)`.

- **Repro** (about 20 s; needs `--real`, a warped warm-up does not fail; with MSAA off it does not fail):
  `LOOK_CHANNEL=msedge npm run look -- --real --view court --seconds 2 --query 'proto=look&lookpanel=0&fx=taa'`
- **Cause.** The binding is the sea's opaque depth, `viewportDepthTexture` in
  [`water/surface.ts`](../water/surface.ts):
  1. The depth node keeps one depth copy per render target; its `.value` is whichever copy the last draw used.
  2. three picks `texture_depth_2d` or `texture_depth_multisampled_2d` from `.value` when it builds the shader, and
     builds the bind group layout later from the copy for the context being compiled.
  3. With TRAA on, the lab's scene pass is 1-sample; drawing the sea leaves the 1-sample copy in `.value`.
  4. The warm-up's `compileAsync` ([`precompile.ts`](../precompile.ts)) builds the sea for the 4x frame-buffer
     target across several frames; a lab frame in between puts the 1-sample copy back in `.value`.
  5. The shader declares a plain depth texture, the layout holds the 4x copy and pipeline creation fails.
- **Why Windows only so far:** timing. The check is Dawn's and shared with Metal; the Mac was not tested.
- **Fix options, neither taken yet:**
  - Give the sea's depth nodes a `value` getter that returns
    `getTextureForReference(renderer.getRenderTarget() ?? renderer.getCanvasTarget())`. It removed the error for
    every preset in a scratch run, but it overrides a three internal; the proper fix is upstream.
  - Keep warm-up compiles from running while TRAA is on (lab only).
