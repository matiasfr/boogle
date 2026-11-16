## 3. Render and sim cost: `npm run perf`

About a minute, or more on a loaded machine. Prints draw calls, shadow-pass calls, triangles, geometries and shader
programs, for the island as you enter it (`dev/look/perf.ts`; `-- --url` for a running game). The counts are exact;
headless fps is not, so it isn't reported. The legacy `--sim` section uses browser-side tick/hash instrumentation through `profileTicks`;
shared gameplay rules run on the server, so this is not their CPU cost. Render timings are wall-clock observations:
compare before/after on the same machine, with quiet-machine evidence required for a performance claim. `-- --render` or `-- --sim` runs one half. Run it before and after anything that adds meshes,
lights or per-tick sim work, and compare.
