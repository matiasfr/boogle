# Missing railway visuals, 8 November 2026

> **Verdict:** Two missing railway visuals confirmed in Chromium too; WebKit report not reproduced.
> **Top recommendations:** 1. Commit depot logs with commitPieces, including the zero-stock path. 2. Restore the prototype's existing 14-glint burst on the production player's second jump. 3. Report thrown precompile failures with console.error, including the first-frame compile path.
> **Status:** open. See [plan line2-b5-b8](../plans/line2-b5-b8.md).

The owner's iPad report is not yet reproduced on WebKit. Two production presentation omissions are confirmed
in this checkout. They also occur in Chromium and must not be described as Safari shader fixes.

## Draw paths compared

| Piece | Actual draw path | Distinguishing evidence |
| --- | --- | --- |
| Depot logs | `logStackMesh` / `kitLogs`, an instanced mesh with matrix and RGB instance buffers; kit wood node material | Factory starts hidden. Production `drawDepot` only assigned count and matrices, never visibility or colour upload. `commitPieces` already supplies all three, as it does for loose piles. |
| Rail shelf | Ordinary box meshes with `flat()` node material; kit-instanced rails | Structure does not require instancing. The restricted-device still shows structure and steel stock. |
| Cart | Cloned meshopt/quantized GLB meshes with authored standard materials; instanced cargo | Restricted-device still shows the empty cart's shell, handle, bed and wheels. The fixture reports an empty cart at camp; this is not proof of a loaded trip. |
| Second-jump glints | Existing `sparkleBurst` caller should feed the shared compute pool | Production `tools.fixedPre` spent charge and incremented `jumps` but never emitted or played the sound; prototype `moves-view` did both. Corrected before capture increments 0 to 1 without under-foot glints. |
| Far Head rockets | `far-head-view` emits round trails and bursts through that same pool, on the live Q5 completion edge | Restoring a completed seed intentionally does not replay them. Need a live `q5-finishing` fixture and a camera maintained after look's setup. |
| Grass patches | Ground shader/contact scenery | No shared material with the cart, shelf and particle pool has been established. This task does not claim a fix for those patches. |

Both `boiler-cart.glb` and `place-kit.glb` list `EXT_meshopt_compression` and `KHR_mesh_quantization` and have
**zero textures**: KTX2 decoding is not involved in these props. `makeProp` preserves decode-node transforms.
Kit geometry is baked to floats before instancing. Working station geometry uses the same kit/material path.

The particle pool uses one packed state buffer plus three draw buffers (four update storage bindings, two spawn
bindings). The three draw buffers become vertex attributes through `toAttribute()`, rather than vertex-stage
storage reads. One instanced `SpriteNodeMaterial` draws all shapes: no `Points`, alpha-to-coverage off,
alpha blending on, depth writing off. Stars use fragment derivatives before shape-dependent branches; dust
samples a procedural RGBA8 texture. Existing round particles draw in the jump baseline. All these objects share
the existing scene HDR/depth/output path; no suspect-only float render target or depth format was found.

## Repairs and check

1. Commit depot logs with `commitPieces`, including the zero-stock path. This restores visibility and uploads
   colour changes without changing stock, allocation, geometry, materials, physics or state ownership.
2. Restore the prototype's existing 14-glint burst on the production player's second jump. Use the
   existing intensity compensation once and respect reduced motion; no new material, pool or presence field.
3. Report thrown precompile failures with `console.error`, including the first-frame compile path. Installed
   three.js r187 already reports native render/compute pipeline failures as errors and skips failed pipelines;
   our catch-all warnings must not turn an exception into a healthy look.
4. Add a development-only portable device and targeted evals through the trusted broker. The effective device
   on this Mac exposes only `core-features-and-limits`, 8 storage buffers/stage, 8 vertex buffers, 32 colour bytes,
   with scene MSAA off. No float32-filterable, float32-blendable, compression, f16 or subgroups. These are baseline
   WebGPU limits, **not measured Safari limits**. Device requests cannot impose an arbitrary lower maximum.

No materials or shaders are retuned. Device timings, peer-visible second-jump feedback and real-time smoothness
are not established by these captures. Browser queue contention precludes performance conclusions.

## Reproduce through the existing broker

All examples use the production railway, not `proto=place`. No second browser or harness is started by an eval.

```sh
node .look/see-client.ts look --rail-seed q5-stocked --real --query 'gpuProfile=portable&gpuShot=depot&dev=1&graphics=msaa:false' --eval dev/look/evals/gpu-portability.ts --warm 0 --name portable-depot --frames 4 --seconds 1
node .look/see-client.ts look --rail-seed q5-stocked --real --query 'gpuProfile=portable&gpuShot=cart&dev=1&graphics=msaa:false' --eval dev/look/evals/gpu-portability.ts --warm 0 --name portable-cart --frames 4 --seconds 1
node .look/see-client.ts look --rail-seed q4-done --real --query 'gpuProfile=portable&gpuShot=jump&dev=1&graphics=msaa:false' --eval dev/look/evals/gpu-portability.ts --action dev/look/evals/gpu-portability-action.ts --warm 0 --name portable-jump --frames 12 --seconds 0.8 --video --curves
node .look/see-client.ts look --rail-seed q5-finishing --real --query 'gpuProfile=portable&gpuShot=rockets&dev=1&graphics=msaa:false' --eval dev/look/evals/gpu-portability.ts --warm 0 --name portable-rockets --frames 12 --seconds 5 --video --curves
```

`gpuTour=1` on the depot view alternates depot/cart every 1.25 seconds; a three-second video includes both.
Omit `gpuProfile=portable` for a native-feature control. `gpuShot=compile-error` deliberately rejects
`compileAsync` once and restores it: that look **must fail** on `Injected GPU precompile failure` even though
frames continue. It is an error-reporting probe, not a healthy capture or a new scenario.

The first jump setup failed because action dispatch did not dismiss the reveal's capture-phase key listener;
the corrected setup uses the existing bot's keyboard dismissal. The first rocket capture framed the wrong
island after look reset its camera; its image was rejected despite healthy frames. Some earlier runs also failed
the broker's source check because the trusted harness changed while queued/running; the worker tree stayed fixed.

## Remaining Safari investigation

This task's network restriction prevented refreshing online WebKit/three.js issues. The repo's existing
[iPad research](webgpu-on-ipad.md) records #35069 (initialized shadow texture) and the reverted memoryless-MSAA
experiment; these are historical references, not current online verification. Neither is proven to cause this report.
The existing broker exposes no WebKit/browser-selection flag, so Playwright WebKit and its `navigator.gpu` were
not probed by bypassing it. Restricting Chromium features cannot reproduce WebKit's compiler or iPad tile storage.

On the iPad, verify the depot, loaded cart, shelf, second-jump stars and live Far Head completion; collect its
`gpuinfo=1` limits/features plus pipeline errors. Until then the Safari-specific portion remains open.
