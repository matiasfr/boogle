# WebGPU migration (done)

> **2026-10-31:** the WebGL 2 fallback described below is gone; the game and every test run are WebGPU only
> ([src/render/README.md](../../../src/render/README.md)).

> A record, not a plan. Landed 30 October 2026 in #65, simplified in #69, shader precompile behind the lobby in #70.
> The living contract is [src/render/README.md](../../../src/render/README.md); what is left (a quality setting) is the
> "Graphics quality tiers" item in [PLAN.md](../../../PLAN.md). The full plan is in this file's git history.

**What landed.** `WebGLRenderer` became `WebGPURenderer` (`three/webgpu`, three 0.187) for everyone, with no flag:
WebGPU where the browser has it, three's own WebGL 2 backend elsewhere. Every custom shader (sea, sky, moon, lighthouse
beam, terrain cave-mouth holes, cave ambient and bricks, fish wiggle, guest atlas) is a node material written in TSL.
Sized points (particles, fireflies, the throw preview) are instanced sprites, since WebGPU has no point size. Item icons
read back with `readRenderTargetPixelsAsync`. Adaptive resolution (`src/features/adaptive-res.ts`) and the backend in
the telemetry connect report came with it. Lint bans the WebGL-only APIs in `src/` (`eslint.config.js`, `GL_ONLY`).

**Key decisions** (the owner's, 30 October 2026):
- **No parity port.** The planned sRGB-exact phase 1 and the linear-HDR phase 2 landed together as one PR; the island's
  old look did not need to survive, and stills were checked by eye with `/look` instead of diffed.
- **Neutral over AgX tone mapping.** One `RenderPipeline` (linear HDR scene pass with MSAA, one output pass). AgX
  greyed the toy palette, so the output pass uses `NeutralToneMapping`; palettes are linear and were re-tuned by eye.
- **No top-level await.** `scene.js` builds the renderer synchronously and exports `rendererReady`; the lobby's
  "Loading island" is the loading screen. A lost device reloads the page once visible, at most once a minute.
- **One way to extend a material:** `patchNode(mat, slot, fn)` wraps a node slot, so patches compose (it replaced
  the GLSL-style `patchMaterial`, renamed so stale calls fail at import).
- **Backend chosen from outside the game:** scenarios run the WebGL 2 backend (`?gfx=webgl2`), the path Firefox
  Android players take; `--webgpu --gpu` on a Mac sees the real WebGPU backend.
- This bent [research/stylized-rendering-on-a-budget.md](../../research/stylized-rendering-on-a-budget.md)'s "WebGPU is
  not needed" on purpose; its looks-inside-materials ideas stay the floor every device gets.
