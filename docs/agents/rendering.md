Before changing materials, lights, shaders or the render pipeline, read this and only the affected sections of src/render/README.md.

## Rendering
`WebGPURenderer`, WebGPU only (no WebGL 2 fallback), one `RenderPipeline` (linear HDR, Neutral tone mapping), all custom shading in TSL node materials. Contract and pitfalls: [src/render/README.md](../../src/render/README.md).
- Custom looks go in node slots (`colorNode`, `positionNode`, `maskNode`, ...) of a `*NodeMaterial` from `three/webgpu`; extend someone else's material with `patchNode` (`src/render/material-patch.ts`). No GLSL, `ShaderMaterial`, `onBeforeCompile` or `THREE.Points` (lint fails them).
- Colours are linear; draw through `renderFrame()`; post effects extend `pipeline.outputNode`. Compute shaders, storage buffers and the rest of WebGPU are fair game, with no fallback path.
- Prefer `material()` in `src/render/materials.ts` for the six named presets when opting an asset in. Cached materials and maps are shared: never mutate or dispose them. Explicitly `.clone()` before per-player colour, previews or `patchNode()` extensions. Preserve existing values, authored glTF materials and special terrain/water graphs; a preset migration is not permission to retune the look.
