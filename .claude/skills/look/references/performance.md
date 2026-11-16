## 3. Render and sim cost: `npm run perf`

About a minute, or more on a loaded machine. Prints draw calls, shadow-pass calls, triangles, geometries and shader
programs, for the island as you enter it (`dev/look/perf.ts`; `-- --url` for a running game). The counts are exact;
headless fps is not, so it isn't reported. Then CPU ms per rule tick (avg, p95, max), split per `onTick` handler and
state hash, on the idle island: name your handler with `onTick(fn, 'label')`. Those are wall-clock times on a software-rendering machine: compare before/after
on the same machine. `-- --render` or `-- --sim` runs one half. Run it before and after anything that adds meshes,
lights or per-tick sim work, and compare.
