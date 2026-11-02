# Plan: a game loop built for an open world

> **Status: approved direction (2026-10-31), part of [architecture.md](architecture.md).** Today's loop is not slow (see the baseline in
> [open-world.md](open-world.md), "Frame-loop audit"). This plan puts the structure in place now, so that growth
> lands on a loop that measures itself, doesn't allocate, batches by default and can move work off the main thread.
> Each step is one PR that leaves `main` green. Re-check code references before starting; read on 2026-10-31.

## What stays

The bones are already right; the steps build on them rather than replacing them.

- **One loop, three clocks.** `renderer.setAnimationLoop(frame)` in `src/main.ts` drives a variable-rate render, a fixed
  60 Hz cannon-es step (`world.step(FIXED, dt, 4)`; the game reads `interpolatedPosition`), and the 10 Hz lockstep tick
  (`updateWorld` in `src/world/sync.ts`, an accumulator with catch-up). `dt` is clamped to 50 ms.
- **Plug-in hooks.** `onFrame(fn, { phase, order })` in `src/loop.ts`: features never edit the loop. Every step below
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

**Measured (2026-10-31, `npm run hitches -- --allocs`, Mac, WebGPU):** about 130 KB of JS heap per frame, a GC every
~150 frames, no hitch from it on the Mac. Roughly 60 KB is cannon-es inside `world.step` (its narrowphase allocates
vectors: `vadd`, `vmult`, `vsub`, `calculateWorldAABB`), about 15 KB is three.js's per-frame render bookkeeping
(`painterSortStable`, `equals`, `update`), and about 15 KB is ours, spread thin (the biggest: fish flocking 6 KB,
interact targets 2 KB, gulls and fireflies under 1 KB each).

- Done: `hitches` reports heap per frame and GCs per tour step; `--allocs` lists allocation sites, charging library
  allocations to the game code that called them. The profiler and the frame context allocate nothing; the fish hook lost its per-frame array and
  iterators (still ~6 KB/frame, see the open lead below).
- Solved lead (2026-11-01): the fish hook's ~6 KB/frame was V8 boxing doubles (HeapNumbers), not objects: `Math.hypot`
  and `Math.random` return boxed results, and so does every double passed to or returned from a call TurboFan did not
  inline (its inlining budget runs out in a big hook). Safari and Firefox keep doubles unboxed, so this garbage is V8's
  alone. `Math.sqrt(dx * dx + dz * dz)` instead of `Math.hypot` in hot loops halved the fish.
- Done (2026-11-01): `hitches` ends with a warm measurement of every hook (six seconds of day and night after the
  tour, CDP's sampling heap profiler), objects and V8 numbers apart, and fails over a budget of objects (4 KB/frame, a
  ratchet). Objects 6.6 -> 3.3 KB/frame, V8 numbers ~19 -> ~11, the whole JS heap 85 -> 72 KB/frame. The fixes:
  interact providers run once a frame (`interactTarget()` is shared by a frame's hooks) and return `NO_TARGETS` when
  nothing is in reach; gulls, lights, the Boogler's visitors and limbs, gift visuals, piles, the sky state and the
  Boogler's screen position reuse their objects; `blockedAt` lost its `?? []`.
- Done (2026-11-01): presence sends 1.0 -> 0.25 KB/frame of objects (all hooks ~3.9 -> ~3.1, budget now 3.6). The
  room patches its presence in place and stringifies it once per send, reused for the frame; net.ts refills one
  presence object; the peer table keeps just the frozen entry. Same bytes on the wire. What's left there is the JSON string itself, the
  fields' own values and the peer table's frozen copy of my presence (setSelf).
- Left (objects, KB/frame): a long tail under 0.3 each: `remotes.values()` iterators, `worldStatus()` objects, HUD
  transform strings, `navigator.getGamepads()`.
- The physics engine is the real cost: cannon-es can't be made allocation-free from outside. Decided 2026-10-31:
  move to Rapier ([rapier.md](done/rapier.md)), which also fits the physics worker of step 7.

**Done when** our own hooks allocate under 1 KB of objects per frame, warm (`npm run hitches`; physics: done/rapier.md).

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

Done (2026-10-31): `src/render/instances.ts` (`createPool`, `push`/`pushMatrix`, kept bounds, `freezeStatic`). Fish,
gulls, tree fruit and blob shadows use it with frustum culling on; terrain, props, caves and the windmill and lighthouse
statics are frozen. Today's decor was already merged into few meshes, so draw calls moved only 148 -> 146.

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

### 8. TypeScript everywhere

Policy since 2026-10-31 (AGENTS.md, "TypeScript everywhere"; DESIGN.md, "Small and readable"): every new file is
`.ts`, and the existing JavaScript converts.

**8a. Tooling (done).** `tsconfig.json` (`strict`, `erasableSyntaxOnly`, `.ts` import extensions, unconverted JS
allowed in but not checked); `npm run typecheck` in `check`; typescript-eslint on `.ts`; lint globs, the registry, the
feature, POI and site auto-loaders and the profiler's hook names accept `.ts`; Node 24 (`.nvmrc`) runs `.ts` tests and
tools directly. `src/sim/rng.ts` is the first module.

**8b. Convert, one folder per PR**, in this order (most shared state first): `src/sim/`, `src/world/rules/`,
`src/world/`, `src/netplay/`, `src/net/`, `src/loop.ts` and `src/main.ts`, `src/physics/`, `src/player/`,
`src/render/`, `src/adapters/`, `src/boogler/`, `src/pois/`, `src/island/`, `src/features/`, the rest of `src/`, then
`test/`, `dev/`, `server/` (its Dockerfile to Node 24) and the config files. Each PR renames and adds types only: no
behavior change, and `check` (plus `check:full` for `src/world*`, `src/net*`, `server/`) passes unchanged. Exported
types for wire messages, presence payloads and op/state shapes come with their folder.

**Done when** no `.js` or `.mjs` is left outside `node_modules`, `allowJs` is off, and a wrong wire-message field
fails `npm run check`.

## Order

1 → 8a → 2 → 3, then 4 and 8b alongside, then 5 and 6. 7 only on evidence. Steps 1, 2 and 8 change no
player-visible behavior. Steps 3 and 4 need a `/look` still in their PR, since they redraw things.

## Open questions for the user

1. **Target device for the frame budget.** Which is the weakest device we promise to run well on (an iPad model, a
   mid-range Android phone)? Step 1's budget and every later "done when" is measured there.
2. **Hosting headers.** Physics in a worker (step 7), and some WebGPU/worker sharing, need COOP/COEP. GitHub Pages
   can't send them. Move the static site to Cloudflare Pages or Fly when that step comes, or keep Pages and skip
   shared memory?
3. **ECS.** OK to use instance pools without a full ECS library (step 3), revisiting only if entity logic becomes the cost?
