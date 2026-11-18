# The forge's furnace mouth

The south outlet from the rail rack: [before](before.png), [after](after.png), and [six details from the real-time clip](motion.png), sampled 0.2 s apart. The flame tips trade height while the coal bed and soot-dark rim stay put. The 2.8 x 1.8 m box, its placement and its existing lit-state gate are unchanged.

Same accepted `q1-done` seed, D3 south camera (`railway-forge-inside.ts`, `view=south`), 1200 x 750 WebGPU capture. Sampled `renderer.info.render` after a drawn frame with shadows enabled:

| Rack-side scene | Before | After |
| --- | ---: | ---: |
| Draw calls | 476 | 476 |
| Triangles | 825,332 | 825,332 |
| Typical frame time, taken under load | 18.0 ms | 18.1 ms |

One box, one material, no new light or particles. Its emissive map is a 12-frame atlas painted once; animation changes the texture offset, not the texture pixels. Reduced motion keeps one frame. Timings are not a performance comparison; not tested on a device. Real-time capture: `.look/furnace-final-realtime.webm` (local only).
