The command fails on page or console errors (including graphics errors), a non-WebGPU backend, an unavailable completed-frame counter or no completed game frames during its final one-second sample. `prof.last.frames` counts frames after the game's render call returns, not browser rAF callbacks or GPU presentation. Old deployed builds without that counter fail explicitly; use an updated build. A successful run only establishes capture health. State what the inspected evidence does and does not establish.

**Graphics backend.** The game is WebGPU only, and so is every run: Metal on a Mac, SwiftShader over
Vulkan on Linux. Rendered scenarios, including `world-inputs`, run on the owner's Mac weekly or on command rather than CI; `smoke` also runs
with `npm run check:gpu` or `npm run ship -- --gpu`. `?dpr=fixed` (always passed) keeps adaptive resolution off. Every
run prints `renderer backend: ...` and `gfx errors: ...`; an entry there is a bug to fix. Rendering rules:
`src/render/README.md`.

To ask what's in the world rather than see it: `npm run inspect -- --browser`, or `window.boogle.inspect()` from `--eval` and `g.eval`, not reads of the rest of the `window.boogle` grab bag.
