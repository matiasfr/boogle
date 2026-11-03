Before touching src/render, read [rendering](../../docs/agents/rendering.md), [lint-boundaries](../../docs/agents/lint-boundaries.md), [verification](../../docs/agents/verification.md) and the owning contract found by npm run map.

- Use WebGPU + TSL node materials, one linear-HDR RenderPipeline and renderFrame. Extend materials through patchNode; colours are linear. No second audio context or frame loop. Local cosmetic randomness or trig must never feed lockstep state.
