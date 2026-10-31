# Plan: a game loop built for an open world

> **Status: approved direction (2026-10-31), part of [architecture.md](architecture.md).** Today's loop is not slow (see the baseline in
> [open-world.md](open-world.md), "Frame-loop audit"). This plan puts the structure in place now, so that growth
> lands on a loop that measures itself, doesn't allocate, batches by default and can move work off the main thread.
> Each step is one PR that leaves `main` green. Re-check code references before starting; read on 2026-10-31.

## What stays

The bones are already right; the steps build on them rather than replacing them.

- **One loop, three clocks.** `renderer.setAnimationLoop(frame)` in `src/main.js` drives a variable-rate render, a fixed
  60 Hz cannon-es step (`world.step(FIXED, dt, 4)`; the game reads `interpolatedPosition`), and the 10 Hz lockstep tick
  (`updateWorld` in `src/world/sync.js`, an accumulator with catch-up). `dt` is clamped to 50 ms.
- **Plug-in hooks.** `onFrame(fn, { phase, order })` in `src/loop.js`: features never edit the loop. Every step below
  keeps that contract.
- **Pure sim.** `src/sim/` imports nothing from `src/` and has no three.js, so it can run in a worker or on a server
  unchanged.

## Steps

### 1. The loop measures itself

Everything after this is judged against these numbers, so it comes first.

- `runFrame` times each hook (`performance.now()` around each call, summed per frame into a ring buffer; cost about
  0.1 µs per hook). `?prof=1`, or `window.boogle.prof`, shows the top hooks, the physics step, the sim tick and
  `renderFrame` as ms/frame (avg, p95).
- Each hook gets a name: its module file, taken from the stack once at registration.
- `npm run perf` prints the top 10 hooks. `npm run hitches` names the hook that ran longest in each hitch frame.
- **A frame budget:** about 4 ms of main-thread CPU for physics + world + update + late on the target device (open
  question 1). Over budget is a warning in `perf`, not a CI failure: headless numbers are noisy.

**Done when** `?prof=1` on the live site shows where every millisecond of a frame goes.

### 2. A hot path that doesn't allocate

- Module-scope scratch objects (`const _v = new THREE.Vector3()`) instead of `new` inside `onFrame` callbacks. About
  10 files in `src/features`, `src/player` and `src/boogler` allocate three.js math objects; fix the ones on the hot path.
- A GC counter in the harness (CDP `HeapProfiler` / `Performance.getMetrics`, `JSHeapUsedSize` sampled per tour step)
  printed by `hitches`, so a change that starts allocating every frame shows up as a rising line.
- An ESLint rule (`no-restricted-syntax` on `new THREE.Vector3|Quaternion|Matrix4|Color` inside a function passed to
  `onFrame`), if it can be written without false positives; otherwise a note in AGENTS.md.

**Done when** a 60 s idle tour allocates about nothing per frame (heap flat between GCs).

### 3. Instance pools: the `emit()` of meshes

Anything that comes in dozens or more (decor, critters, items on the ground, later remote players and enemies) draws as
one instanced batch.

- `src/render/instances.js`: `createPool({ geometry, material, max })` returns `add() -> handle`, `set(handle, pos,
  quat, scale, color)`, `remove(handle)`, backed by one `InstancedMesh` (or `BatchedMesh` for mixed shapes) with typed
  arrays the GPU reads directly. Dirty ranges upload once per frame. Bounds stay correct, so `frustumCulled` stays on.
- Move the hand-rolled instancing in `critter-fish`, `critter-gulls`, `gifts` and `blob-shadows` onto it, then the
  repeated decor that `perf` shows in draw calls.
- Static decor: `matrixAutoUpdate = false` plus one `updateMatrix()` at build time (only one file does this today).
- Not a full ECS library (bitECS and the like): features are plug-ins that own their state, and pools give the
  data-oriented part (typed arrays, one pass, one draw) without changing how features are written. Revisit if entity
  logic itself (not drawing) becomes the cost.

**Done when** draw calls stay flat as decor counts grow, and adding a hundred of something is one pool.

### 4. Bulk per-frame work on the GPU

WebGPU only now, so no second path.

- **Particles:** `emit()` keeps its signature; the pool becomes a storage buffer updated by a TSL compute node
  (integration, fade, size). PLAN.md "Graphics quality tiers" already lists this.
- **Pools on the GPU:** a pool can take a compute node that writes its instance buffer (sway, bobbing, flocking), so
  critters and foliage motion leave the CPU entirely.
- **GPU culling for large pools:** a compute pass that distance- and frustum-culls instances and writes indirect draw
  arguments. Only for pools in the thousands; measure first.
- Never for anything the CPU must read back each frame: player movement, physics, anything sent over the network.

**Done when** particles and critter motion cost no measurable main-thread time in `?prof=1`.

### 5. The shared sim in a worker

The lockstep sim grows with the world (more cells, more ops), and it is the easiest thing to move: pure, deterministic,
and already talking through messages (edits in, applied results and hashes out).

- `src/world/sim-worker.js` runs `sync`'s tick, apply and hash; the main thread keeps the adapters (`onApplied`,
  `onAfterTick`, `onSnapshot`) and gets results as messages. The rules and the replay test don't change.
- Ticks are stamped by the host, so a frame of worker latency changes nothing a player sees.
- This is also the shape a dedicated server needs ([open-world.md](open-world.md), section 1): the same worker module
  runs in Node.

**Done when** a 10x bigger grid in `npm run perf` costs the main thread nothing extra.

### 6. Chunk-aware hooks

- `src/world/chunks.js`: a 2D chunk grid over the world (size from the grid, e.g. 32 m), with `activeChunks()` near the
  camera and `onChunkEnter` / `onChunkLeave`.
- Pools and features update only active chunks; far chunks sleep (the "sleeping regions" lesson in
  [deterministic-sim-at-scale.md](../research/deterministic-sim-at-scale.md)). Visual only until the server exists.

**Done when** frame time stays flat as the island grows beyond the camera's reach.

### 7. Physics in a worker (only if step 1 shows it's needed)

cannon-es on the main thread is cheap today. A worker adds a frame of latency to your own movement unless positions
are shared, and sharing them without copies needs `SharedArrayBuffer`, which needs cross-origin isolation (COOP and
COEP headers). GitHub Pages can't set those (open question 2). Leave this until physics shows up in the top hooks.

### 8. TypeScript on the core, in two stages

**8a. Type-check the JS (one PR, no renames).** `tsconfig.json` with `allowJs`, `checkJs`, `strict`, `noEmit`, scoped
to `src/loop.js`, `src/sim/`, `src/world/`, `src/net/`, `src/netplay/` and `src/render/instances.js`; `tsc` joins
`npm run check`. JSDoc types first where bugs come from: wire messages, presence payloads, op and state shapes, the
`onFrame` context. `typescript` is the new dev dependency (the reason goes in the commit).

**8b. Convert the core to `.ts` (one PR per folder, `src/sim/` first).** Before the first rename, one tooling PR:
- ESLint globs: `'**/*.{js,ts}'` in every `files` entry and in `LOCKSTEP_FILES`, with `typescript-eslint`'s parser.
- `npm run registry`, the feature auto-loader (`import.meta.glob('./features/*.{js,ts}')`) and any script that walks
  `src/` for `.js` accept `.ts`.
- Unit tests import `.ts` directly: bump `.nvmrc` to 24 (Node strips types natively), no build step for tests.
- Vite builds `.ts` already. Features may stay `.js`: plug-ins don't need to convert.

Then rename folder by folder, in its own PR each: `src/sim/`, `src/world/rules/`, `src/world/`, `src/netplay/`,
`src/net/`, `src/loop.js` and `src/render/instances.js`. Each PR only renames and adds types; no behavior change, and
the replay test plus `check:full` must pass unchanged.

**Done when** the core is `.ts` under `strict`, and a wrong wire-message field fails `npm run check`.

## Order

1 → 8a → 2 → 3, then 4 and 8b in either order, then 5 and 6. 7 only on evidence. Steps 1, 2 and 8 change no
player-visible behavior. Steps 3 and 4 need a `/look` still in their PR, since they redraw things.

## Open questions for the user

1. **Target device for the frame budget.** Which is the weakest device we promise to run well on (an iPad model, a
   mid-range Android phone)? Step 1's budget and every later "done when" is measured there.
2. **Hosting headers.** Physics in a worker (step 7), and some WebGPU/worker sharing, need COOP/COEP. GitHub Pages
   can't send them. Move the static site to Cloudflare Pages or Fly when that step comes, or keep Pages and skip
   shared memory?
3. **ECS.** OK to use instance pools without a full ECS library (step 3), revisiting only if entity logic becomes the cost?
