# Plan: the architecture overhaul

> **Status: active (2026-10-31).** The one ordered checklist for moving Boogle toward a large, open world. Detail lives
> in [game-loop.md](game-loop.md) (loop, pools, compute, workers, TypeScript) and [open-world.md](open-world.md)
> (server, assets, chunks and LOD, the frame-loop baseline). A proposed re-ordering of phases 3-4 for Boogle 2.0
> (multi-island world first) is in [boogle-2-architecture-fit.md](boogle-2-architecture-fit.md), awaiting the owner.
> Tick a box in the PR that finishes it. Every item is one or a few PRs that each leave `main` green and ship with
> `npm run ship`.

## Assumptions until answered

The open questions in the two plans have working answers so work can start; change them here if they are wrong.

- **Target device:** a 2021 iPad (A13/A14 class) and a mid-range Android phone. Frame budget: 4 ms main-thread CPU,
  60 fps at the adaptive resolution floor.
- **Hosting:** stay on GitHub Pages until shared memory (`SharedArrayBuffer`) is needed, then move the static site to
  Cloudflare Pages (COOP/COEP headers). Nothing before phase 4 needs it.
- **ECS:** instance pools, no ECS library.
- **Physics engine:** move from cannon-es to Rapier (decided 2026-10-31; [rapier.md](done/rapier.md)).
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
- [x] TypeScript everywhere: the policy, strict `tsconfig.json`, `npm run typecheck` in `check`, `.ts`-aware lint,
      registry and loaders, Node 24 (step 8a).
- [ ] Allocation-free hot path (step 2). `hitches` measures each hook warm and splits objects from V8's boxed
      numbers (Safari has none); 2026-11-01 took our hooks from 6.6 to 3.3 KB/frame of objects and from ~19 to ~11 of
      boxed numbers, with a 4 KB budget that fails `hitches`. Physics moved to Rapier ([rapier.md](done/rapier.md)).
      Remaining: under 1 KB/frame of objects (the biggest left: presence sends, 0.9).
- [ ] Baseline on the target devices (skipped for now, 2026-10-31: needs the devices in hand): `hitches` and `perf` on the iPad and the Android phone, numbers recorded in
      open-world.md next to the Mac ones.
- [x] Unreliable presence channel (native `RTCDataChannel`, `maxRetransmits: 0`), before/after `npm run load`
      (open-world.md, section 1, "Until then").

**Done when** a frame's cost is visible per hook on the live site and on the target devices.

## Phase 2: batching and the GPU

- [x] Physics on Rapier ([rapier.md](done/rapier.md)): spike and measure (done: Rapier 0.19.3, 6× faster steps, ~2 KB
      vs ~62 KB garbage per step, 584 KB WASM), a physics facade on cannon-es (done), a Rapier backend
      behind `?physics=rapier`, feel tuning, then the switch and removing cannon-es.
- [x] Instance pools (`src/render/instances.ts`); move critters, gifts and blob shadows onto them; freeze static
      decor matrices (step 3).
- [x] Shadow pass trimmed (tighter shadow camera, fewer casters): the 52 shadow draw calls are the cheapest GPU win.
- [x] Compute particles behind `emit()` (step 4): storage buffers, a spawn pass and an update pass on the GPU.
- [ ] Compute-driven pools (step 4): when a pool shows up in `?prof=1` (today the biggest, fish, costs 0.02 ms/frame).
- [x] Convert `src/sim/`, `src/world/rules/`, `src/world/`, `src/netplay/` and `src/net/` to `.ts`, with exported
      types for wire messages, presence, ops and states (step 8b; done 2026-10-31).

**Done when** draw calls stay flat as content grows and particles and critters cost no main-thread time.

## Phase 3: the server, then state by relevance

Decided 2026-10-31 ([shared-state-at-scale.md](../research/shared-state-at-scale.md)): no client-side sim worker. The
server becomes the only simulator of shared state and, after it lands, sends each client only the state near it.

- [x] Dedicated server ([server-host.md](server-host.md)): the server hosts every room's lockstep world, with no
      PeerJS fallback (the switch, #144; DESIGN.md's "PeerJS only" was rewritten for it).
- [ ] Interest-managed state: rules states serialize by chunk, the server sends each client the dirty chunks near it
      against an acknowledged baseline, and clients keep a read-only mirror instead of running ticks.
- [ ] Edits predicted on the client (a cosmetic preview until the server's delta arrives).
- [x] Convert the rest of `src/` to `.ts` (step 8b order).
- [ ] Client-side prediction and reconciliation for your own player, once the server checks movement.

**Done when** the main room is server-hosted and a client's bandwidth depends on what is near it, not the world size.

## Phase 4: a world bigger than the camera

- [ ] Convert `test/`, `dev/`, `server/` and the config files to `.ts`; turn `allowJs` off (step 8b).
- [x] Asset pipeline: `npm run assets` (glTF + meshopt, KTX2), hashed outputs, a size budget in CI (open-world.md,
      section 2), proved with a Blender-scripted scaffold kit behind `?proto=assets`
      ([asset-pipeline.md](asset-pipeline.md); its KTX2 step runs once KTX-Software is installed).
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
