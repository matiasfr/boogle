## Materials

- **Built-in materials** (`MeshStandardMaterial`, `MeshLambertMaterial`, `MeshBasicMaterial`, `SpriteMaterial`) work
  as they are: the renderer maps them to node materials. Use them when there's nothing custom.
- **Custom looks** are node materials from `three/webgpu` (`MeshStandardNodeMaterial`, `MeshBasicNodeMaterial`,
  `SpriteNodeMaterial`, `PointsNodeMaterial`, ...) with TSL in their node slots: `colorNode`, `positionNode`,
  `normalNode`, `emissiveNode`, `aoNode`, `maskNode` (cut-outs, like the cave mouths in `island/terrain.ts`),
  `opacityNode`. Use `colorNode`, not `fragmentNode`: `fragmentNode` skips lighting, fog and the output transform.
- **Extending a material another module owns** (sway, wiggle, tint): `patchNode(mat, slot, prev => node)` from
  [`material-patch.ts`](../material-patch.ts). It wraps what is in the slot, so several patches compose.
- **Uniforms** are TSL `uniform(value)` nodes. A module that others drive exports them as a plain object of handles
  (`seaU` and `seaRipples` in `water-render.ts`); consumers set `.value` and never reach into a material.
  Per-instance data is an `InstancedBufferAttribute` read with `instancedDynamicBufferAttribute` or `attribute()`.
- **Sized points are sprites.** WebGPU has no point size, so `THREE.Points` draws 1 px dots. Draw many dots as one
  `Sprite` with `sprite.count = n` and instanced attributes (`particles.ts`, fireflies, the throw preview). For
  particles, call `emit()` from `particles.ts`; don't build a pool.
- **Lint bans the WebGL-only APIs** in `src/`: `ShaderMaterial`, `RawShaderMaterial`, `ShaderChunk`, `ShaderLib`,
  `UniformsLib`, `UniformsUtils`, `WebGLRenderer`, `THREE.Points`, `onBeforeCompile`, `customProgramCacheKey` and
  `readRenderTargetPixels` (use `readRenderTargetPixelsAsync`; `player/item-icons.ts` shows a readback that goes
  through the game's tone mapping; WebGPU reads rows top first).
