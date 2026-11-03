# Any harness run; networking or render-pipeline changes

- Every harness run is WebGPU (SwiftShader over Vulkan on Linux and CI, Metal on a Mac; `?dpr=fixed`). A `gfx errors` line with entries is a bug.
- `smoke` is the backbone, but two tabs on CI's software WebGPU are too slow for it, so it runs against the live site after every deploy and nightly (`smoke.yml`; a failure opens a `smoke` issue, and fixing it beats new work). `npm run ship -- --gpu` (or `npm run check:gpu`) also runs it on a Mac before shipping: do that for networking or render-pipeline changes, not every ship.
