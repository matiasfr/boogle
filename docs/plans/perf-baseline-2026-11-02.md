# Perf baseline, 2 November 2026: the normal game before and after the prototype night

**Yes, the normal game (no `?proto=`) got heavier, on the CPU side.** Draw calls are up **27-31 %** (132 -> 168 in
`perf`; the shadow pass alone 42 -> 60, +43 %), and the main thread pays for it: render encoding +20 %, `perf`'s
CPU per frame +15 % (render +19 %). **GPU frame time did not move** (1.00 -> 0.99 ms at the court, 1.17 -> 1.16 ms on
the overview, at 2420x1668). First-load JS is **+40 KB gzip (+8.5 %)**, in 43 requests instead of 12; first frame and
"Jump in" in a production build are flat to +5 %. Garbage went the other way: JS heap allocated per frame -5 %, our
onFrame hooks' objects -47 %.

Two causes, both in the normal game by design or by accident:

1. **The new track machine** (e2ee984, "Add the laying-run prototype: a juicier, rideable, pushable track machine").
   It is not behind a flag: it parks visibly at the open section, built from about 16 separate meshes that each cast a
   shadow, where the old placeholder was 2 meshes, hidden until a run. About 30 of the ~35 added draw calls.
2. **The era swap prototype leaked into the normal game** (7ce81a9). `src/features/pois.ts` eagerly loads every
   `src/pois/*/index`, and `src/pois/era/` landed there, so its greybox huts, platform and "Start opening day" prompt
   stood around the court for everyone, against `era-swap.ts` and `docs/game-design/haul.md` ("With `?proto=era`").
   **Fixed in this PR** (its own commit): one glob exclusion, -4/-5 draw calls, -2 shader programs, one onFrame hook
   and ~8 KB gzip of first-load JS. `?proto=era` is unchanged.

Desktop numbers are the baseline; the M4 iPad is one target among several, with an estimate where it helps.

## How it was measured

- **Before:** `7b35f74`, the last `main` commit before 2026-11-01 00:00 Pacific (21:00 on 31 October, PR #161).
  **After:** `4aa5159` (PR #276), today's `main`, 95 merges later. Two worktrees, `npm ci` in each.
- **Machine:** MacBook Pro, Apple M1 Max (32-core GPU), headless Chromium (Playwright 1.64.1) on Metal, WebGPU. Nothing
  else rendering during the runs; an idle Vite dev server from another checkout was up.
- `npm run perf`, `npm run hitches` and `npm run load`, three runs per side, alternating before/after. `perf` and `load`
  ran from each checkout (the scripts are identical); `hitches` ran today's script against both (`--root`), since its
  tour changed.
- **Frame cost** (not in any npm script): a scratch bench using the look lab's method (`src/debug/look-lab.ts`,
  `bench()`; `docs/proposals/visual-target.md`, "How it was measured"), which works on both commits: a 1210x834 page at
  pixel ratio 2 (2420x1668), sky pinned at noon, 20 frames rendered back to back, wait for the GPU queue, median of 7
  batches; `encode` is the CPU part of that. Same page: draw calls, triangles, three's memory counters, main-thread CPU
  per frame (`window.boogle.prof`, `frame` row), JS heap and heap allocated per frame over 5 s. Court and overview
  views, three runs per side.
- **Bundle and first frame:** `npm run build` in each, then the production build under `vite preview`; the normal game
  opened four times (the first discarded), recording every asset fetched before "Jump in" is enabled, the time of the
  first GPU submit (first frame) and of "Jump in" enabled. Sizes are gzip -9 of the built files.
- Numbers are averages of the three runs unless a range is given. Run-to-run noise: GPU ms ±0.05, CPU ms ±15 %, heap
  ±8 MB (it depends on where GC fell), dev-server load times ±20 %.

## The normal game, before and after

| Measure | Before (7b35f74) | After (4aa5159) | Change |
| --- | --- | --- | --- |
| Frame cost, court / overview (ms, 2420x1668) | 1.00 / 1.17 | 0.99 / 1.16 | flat |
| Render encode, court / overview (ms) | 0.39 / 0.38 | 0.47 / 0.45 | **+20 %** |
| Draw calls, `perf` (scene + shadow) | 132 | 168 | **+27 %** |
| Shadow-pass draw calls, `perf` | 42 | 60 | **+43 %** |
| Draw calls, court / overview (bench) | 117 / 120 | 152 / 157 | **+30 %** |
| Triangles, `perf` | 209k | 215k | +3 % |
| Geometries / shader programs / textures | 106 / 76 / 47 | 118 / 82 / 48 | +12 / +6 / +1 |
| Main-thread CPU per frame, `perf` (ms avg) | 0.82 | 0.94 | **+15 %** |
| of which render (CPU) / physics (ms) | 0.46 / 0.16 | 0.55 / 0.18 | +19 % / +8 % |
| Main-thread CPU per frame, bench court / overview (ms) | 1.55 / 1.69 | 1.70 / 1.83 | +9 % |
| Lockstep tick, idle (ms avg) | 0.007 | 0.009 | noise-level |
| JS heap in play, court / overview (MB) | 53 / 50 | 63 / 52 | +10 / +2 (noisy) |
| JS heap allocated per frame, `hitches` tour (KB) | 81.7 | 77.9 | -5 % |
| onFrame hooks' objects, warm (KB/frame) | 6.41 (over the 3.6 budget) | 3.42 | -47 % |
| V8 boxed numbers, warm (KB/frame) | 17.4 | 8.7 | -50 % |
| `hitches`: frames over 33 ms (all in the `enter` step) | 2 / 2 / 2 | 3 / 2 / 2 | flat |
| `hitches`: worst frame (`enter`, the harness's click) | 217 / 533 / 183 ms | 583 / 183 / 217 ms | flat (noisy) |
| `hitches`: median / p99 frame | 16.7 / 16.8 ms | 16.7 / 16.8 ms | flat |
| "Jump in" enabled, dev server (`hitches`, ms) | 1189 | 1406 | +18 % (dev server, noisy) |
| First-load JS, production (KB gzip) | 467 | 507 (499 with the era fix) | **+8.5 %** |
| First-load WASM (KB gzip) | 573 (Rapier) | 591 (Rapier SIMD) | +3 % |
| First-load CSS (KB gzip) | 8.0 | 11.1 | +3 KB |
| Requests before "Jump in" | 12 | 43 (40 with the fix) | chunking |
| Largest app chunk (`main-*.js`, KB gzip) | 107 | 48 | split, not smaller in total |
| All built JS, incl. lazy chunks (KB gzip) | 551 | 815 | +48 % (mostly prototypes, lazy) |
| First frame (first GPU submit), production (ms) | 496 | 500 | flat |
| "Jump in" enabled, production (ms) | 853 | 895 | +5 % |
| JS heap at the lobby, production (MB) | 46.6 | 51.8 | +5 (noisy) |
| `load`: server CPU, 8 pages, 20 s (% of a core) | 5.9 | 7.0 | noise (5.0-8.6 both sides) |
| `load`: presence delivered / p50 latency | 100 % / 10-11 ms | 100 % / 10-11 ms | flat |
| `load`: room checks | 23/23 | 23/23 | flat |

What did not regress: the GPU (the added meshes are small and mostly off-screen or in the shadow map), hitches, the
sim tick, the network and first frame. What did: everything that scales with draw calls, which is CPU encoding today
and, on a tile GPU, pass overhead too.

## Each prototype on today's main

One run each, the same bench (2420x1668, noon, court / overview), today's `main` before the era fix. Normal game for
reference: 1.00 / 1.17 ms, 153 / 157 draw calls, 118 geometries, 82 programs, CPU 1.5-1.7 ms, ~95 / ~80 KB allocated
per frame. Heap varies ±8 MB run to run, so only big differences count. **iPad est.** is the GPU column times 3 (the
look lab's M1 Max -> M4 estimate, 2.5-3.5x; not measured on a device).

| `?proto=` (room) | Frame ms court / overview | iPad est. ms | Encode ms | Draw calls court / overview | Tris (k) | Geo / progs | CPU ms | Alloc KB/frame | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| *(none)* | 1.00 / 1.17 | 3.0-3.5 | 0.47 | 153 / 157 | 182 | 118 / 82 | 1.5 | 98 / 80 | baseline |
| `haul` | 0.99 / 1.21 | 3-3.6 | 0.53 | 155 / 158 | 190 | 118 / 82 | 1.7 | 99 / 83 | light |
| `ride` | 0.96 / 1.16 | 3-3.5 | 0.47 | 150 / 169 | 180 | 124 / 82 | 1.6 | 95 / 88 | light |
| `wagon` | 0.98 / 1.19 | 3-3.6 | 0.53 | 155 / 159 | 190 | 154 / 82 | 1.6 | 104 / 87 | light |
| `wagon&grind=1&laid=3` | 1.09 / 1.23 | 3.3-3.7 | **0.86** | **306 / 312** | 194 | 154 / 82 | **2.3** | **153 / 137** | **heavy on CPU** |
| `moves&jump2=1&glide=1` | 1.09 / 1.21 | 3.3-3.6 | 0.54 | 153 / 157 | 182 | 118 / 82 | 1.7 | 92 / 84 | light |
| `lay&v=crawl` | 0.96 / 1.16 | 3-3.5 | 0.46 | 155 / 158 | 190 | 118 / 82 | 2.0 | 101 / 83 | light |
| `era` | 0.88 / 1.14 | 2.6-3.4 | 0.48 | 142 / 151 | 213 | 118 / 84 | 1.6 | 95 / 82 | light |
| `soapbox` | 0.89 / 1.12 | 2.7-3.4 | 0.49 | 154 / 128 | 191 | 130 / 84 | 1.6 | 104 / 89 | light |
| `build` | 0.98 / 1.18 | 3-3.5 | 0.46 | 155 / 158 | 187 | 119 / 83 | 1.7 | 101 / 87 | light |
| `uisfx` | 1.10 / 1.28 | 3.3-3.8 | 0.49 | 153 / 157 | 182 | 118 / 82 | 1.7 | 97 / 80 | light |
| `board&v=hop` | 1.11 / 1.30 | 3.3-3.9 | 0.50 | 162 / 165 | 182 | 148 / 84 | 1.7 | 99 / 91 | light |
| `groove` | 1.05 / 1.26 | 3.2-3.8 | 0.46 | 148 / 155 | 180 | 154 / 82 | 1.6 | 96 / 89 | light |
| `look&look=ipad` | **1.93 / 2.05** | 5.8-6.2 | 0.49 | 155 / 158 | **582** | 119 / 90 | 1.7 | 97 / 81 | GPU x2, as designed |
| `look&look=high` | **6.14 / 5.29** | 16-18 | **1.40** | **307 / 265** | **794** | 119 / 154 | **2.9** | **182 / 156** | **heavy everywhere** (the desktop ceiling) |
| `assets` | 1.00 / 1.19 | 3-3.6 | 0.56 | **202 / 190** | 183 | 124 / 83 | 1.6-1.8 | 106 / 96 | draw calls +30 % |
| `minis` | 1.10 / 1.23 | 3.3-3.7 | 0.66 | **216 / 290** | 184 | 174 / 82 | **2.0-2.4** | 117 / 122 | **draw calls +40-85 %** |
| `layout=lighthouse-line` | 1.01 / 1.20 | 3-3.6 | 0.46 | 151 / 157 | 181 | 118 / 82 | 1.5 | 97 / 81 | light |
| `arrive&v=direct` | not measured | | | | | | | | the harness waits for the lobby, which this variant skips |

Every page was GPU-light except the two look presets, which are render experiments and cost what
`docs/proposals/visual-target.md` says. No gfx errors on any page. Three prototypes are heavy in draw calls and CPU,
which matters on every device, not only the iPad:

- **`wagon` with `grind=1`** doubles the draw calls (306 vs 155) and adds ~55 KB of garbage per frame: the laid-rail
  grind (097a27a) draws its rails as many meshes. Fine for a playtest; merge or instance before it leaves the flag.
- **`minis`** adds 60-130 draw calls (most on the overview: the three toys' pieces are separate meshes) and 56
  geometries.
- **`assets`** adds 35-50 draw calls: the scaffold kit's glTF parts draw one call each.

## Recommendations

1. **Merge the track machine's parts** (`src/features/track-machine.ts`, the `part()` meshes): one mesh per material
   (wood, paint, iron, brass: 4 calls) or the wheels as one `InstancedMesh`, and consider `castShadow` on the deck and
   boiler only. That takes back most of the +35 draw calls. Its frame hook is also the largest allocator now
   (0.4 KB/frame of objects: the closure passed to `drawRailway` each frame, among others), worth a look in the
   allocation-free hot path (`docs/plans/game-loop.md`, step 2). **Done** (the follow-up PR): the static parts are one
   mesh (finishes per vertex, the boiler and funnel squash in its vertex shader), the wheels and the rails one
   `InstancedMesh` each; `perf` 164 -> 137 draw calls (shadow 59 -> 45), the hook 0.16 -> 0 KB/frame of objects.
2. **Keep prototypes out of eager globs.** The era leak came from `src/features/pois.ts` loading every folder under
   `src/pois/`; a prototype that is a point of interest needs an exclusion there (done for `era`). A cheap guard: the
   `npm run perf` draw-call count on the normal game in the PR description of any prototype that touches `src/pois/`,
   `src/features/` or `src/render/`.
3. **Re-baseline after the track machine merge.** Keep using this document's method: `perf`, `hitches` and `load`
   three times, plus the frame-cost bench (worth adding to `perf` as a `--frame` option, since `perf` reports no frame
   time and the look lab's `bench()` only exists behind `?proto=look`).
4. **First load:** three.js and Rapier's JS are unchanged (304 and 30 KB gzip); our own code that loads before
   "Jump in" grew from 134 to 173 KB gzip, now split across ~35 chunks (the named new ones include `track-machine`
   and `model`, the glTF loader from 5f754bb), and Rapier's WASM is the SIMD build (+18 KB, ecacab1). It is +5 % on time
   to "Jump in" here; no action needed unless the CDN numbers say otherwise. 43 requests over HTTP/2 cost little.
5. **The iPad** stays a target among others: nothing in the normal game is close to its budget on the GPU (~3 ms
   estimated against 10), and the CPU-side growth above is worth fixing for every device. `look=high` and
   `wagon&grind=1` are the only pages here that would need care before they could run on one.

Scratch scripts used for the bench and the load timing are not committed; the method above is enough to repeat them.
