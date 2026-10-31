# Plan: the architecture overhaul

> **Status: active (2026-10-31).** The one ordered checklist for moving Boogle toward a large, open world. Detail lives
> in [game-loop.md](game-loop.md) (loop, pools, compute, workers, TypeScript) and [open-world.md](open-world.md)
> (server, assets, chunks and LOD, the frame-loop baseline). Tick a box in the PR that finishes it. Every item is one or
> a few PRs that each leave `main` green and ship with `npm run ship`.

## Assumptions until answered

The open questions in the two plans have working answers so work can start; change them here if they are wrong.

- **Target device:** a 2021 iPad (A13/A14 class) and a mid-range Android phone. Frame budget: 4 ms main-thread CPU,
  60 fps at the adaptive resolution floor.
- **Hosting:** stay on GitHub Pages until shared memory (`SharedArrayBuffer`) is needed, then move the static site to
  Cloudflare Pages (COOP/COEP headers). Nothing before phase 4 needs it.
- **ECS:** instance pools, no ECS library.
- **Server transport:** WebSocket first (as [server-host.md](server-host.md) chose); unreliable datagrams only on
  evidence.

## Phase 0: WebGPU only (done)

- [x] Drop the WebGL 2 fallback; every harness and CI run on WebGPU; live `smoke` after every deploy (#86); `smoke`
      before every ship on the Mac's GPU (#89).
- [x] Fix the nightly `hotbar` and `interact` scenarios (failing since at least 2026-10-29), so nightly is a signal
      again.

## Phase 1: a loop that measures itself (no player-visible change)

- [x] Per-hook profiling and `?prof=1`; `perf` prints the top hooks, `hitches` names the slowest hook per hitch
      (game-loop.md, step 1).
- [ ] `tsconfig.json` with `checkJs` + `strict` on the core; `tsc` in `npm run check`; JSDoc for wire messages,
      presence, ops and states (step 8a).
- [ ] Allocation-free hot path, heap tracking in `hitches` (step 2).
- [ ] Baseline on the target devices: `hitches` and `perf` on the iPad and the Android phone, numbers recorded in
      open-world.md next to the Mac ones.
- [ ] Unreliable presence channel (native `RTCDataChannel`, `maxRetransmits: 0`), before/after `npm run load`
      (open-world.md, section 1, "Until then").

**Done when** a frame's cost is visible per hook on the live site and on the target devices.

## Phase 2: batching and the GPU

- [ ] Instance pools (`src/render/instances.js`); move critters, gifts and blob shadows onto them; freeze static
      decor matrices (step 3).
- [ ] Shadow pass trimmed (tighter shadow camera, fewer casters): the 52 shadow draw calls are the cheapest GPU win.
- [ ] Compute particles behind `emit()`; compute-driven pools (step 4).
- [ ] TypeScript tooling PR, then `src/sim/` and `src/world/rules/` to `.ts` (step 8b, first folders).

**Done when** draw calls stay flat as content grows and particles and critters cost no main-thread time.

## Phase 3: the sim off the main thread, then the server

- [ ] The lockstep sim in a worker (step 5), shaped so the same module runs in Node.
- [ ] Remaining core folders to `.ts` (`src/world/`, `src/netplay/`, `src/net/`, `src/loop.js`).
- [ ] Dedicated server: pick up [server-host.md](server-host.md), with the server running the sim worker module and
      sending each client only nearby state. Bends DESIGN.md "PeerJS only" on purpose, in its first PR.
- [ ] Client-side prediction and reconciliation for your own player, once the server checks movement.

**Done when** the main room is server-hosted and a client's bandwidth depends on what is near it, not the world size.

## Phase 4: a world bigger than the camera

- [ ] Asset pipeline: `npm run assets` (glTF + meshopt, KTX2), hashed outputs, a size budget in CI (open-world.md,
      section 2). Start with the first authored model.
- [ ] Chunk grid (`src/world/chunks.js`), chunk-aware hooks and pools (step 6).
- [ ] `THREE.LOD` levels and impostors for authored models; GPU culling with indirect draws for large pools.
- [ ] Chunk streaming of shared state from the server (open-world.md, section 3).
- [ ] Physics in a worker, only if phase 1 profiling shows physics in the top hooks (step 7; needs the hosting move).

**Done when** the world can grow past what one device simulates or draws, and frame time stays flat.

## Rules for every item

- Measure before and after (`perf`, `hitches`, `load`) and paste the numbers in the PR.
- Wire changes stay additive for mixed builds (AGENTS.md, "Mixed builds").
- Anything a player can see gets a `/look` still in its PR; anything in `src/net*`, `src/world/` or `server/` runs
  `check:full` and `/code-review`.
