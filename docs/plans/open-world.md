# Plan: toward a bigger, open world

> **Status: future (noted 2026-10-31).** Not started. A record of the direction and of which outside advice applies to
> Boogle, so nobody redoes the audit. Each section names what has to be true before it starts. The order matters: the
> server comes first, because chunk streaming and a bigger world depend on it. Re-check code references before
> starting; they were read on 2026-10-31.

## Already done (don't redo)

- **WebGPU + TSL.** `WebGPURenderer` WebGPU only (no fallback since 2026-10-31), every shader in TSL
  ([webgpu-migration.md](webgpu-migration.md), [src/render/README.md](../../src/render/README.md)).
- **WebRTC transport.** PeerJS data channels, one browser as host ([src/net/peer-room.js](../../src/net/peer-room.js)).
- **No prediction needed for your own movement.** Each player owns their own physics, so input never waits on the host.
  Remote players and the ball are interpolated (`createSnaps()`, `INTERP_MS`).

## 1. Dedicated server (first, and the blocker for everything else)

Picks up the shelved [server-host.md](server-host.md). That plan's triggers still apply; "rooms past 8" and a world
too big for every peer to simulate are now the expected ones.

- The server runs the shared sim: `src/sim/` and `src/world/rules/` are already three.js-free and deterministic, so they
  run in Node as-is. Determinism stops being the sync mechanism and becomes a test tool (replay, save/load equivalence).
- Clients receive only the state near them (interest management), not the whole world. That is what lets chunks
  unload (section 3).
- Transport: WebSocket first ([server-host.md](server-host.md) already chose it). Add an unreliable channel only if
  `npm run load` and telemetry show head-of-line stalls: WebTransport datagrams, or server-side WebRTC (geckos.io or
  `node-datachannel`). Geckos.io fits only once a server exists; it does not fit the peer-host model.
- Once the server owns movement checks (anti-cheat, public rooms), add client-side prediction and reconciliation for the
  local player. Not before: while each player owns their physics, prediction adds nothing.
- Bends DESIGN.md ("PeerJS only", "Clear authority"): change the principle on purpose in the step that starts this.

**Until then, one cheap fix in the peer model:** PeerJS's `reliable:false` still retransmits (note at the top of
`peer-room.js`). Opening the presence channel as a native `RTCDataChannel` with `maxRetransmits: 0` gives true
unreliable delivery. Stays inside `src/net/`, additive for mixed builds, needs `check:full`, a `dev/peer-test/` check
and a before/after `npm run load`.

## 2. Asset pipeline (when assets arrive)

Today shapes are code-built and images are small (DESIGN.md, "Build shapes in code first"), so there is nothing to pack.
Start this when the first authored models land.

- Models: binary glTF (`.glb`) with meshopt compression (`gltfpack`, `EXT_meshopt_compression`). Prefer meshopt to Draco:
  smaller decoder, fast decode, and it also compresses animations and instancing data. Draco only if a mesh is far
  smaller with it.
- Textures: KTX2 / Basis Universal (`KTX2Loader`) for anything over ~256 px or with many copies. It cuts VRAM and
  upload time, which matters most on iPad tile GPUs. Small icons and UI images can stay PNG/WebP.
- A build step (`npm run assets`) that converts sources into hashed outputs, with a size budget in CI.
- Garbage-collection stutters come from allocating every frame, not from file formats; fix those with `npm run perf`.

## 3. Chunk streaming and LOD (after the server)

- **Visual-only first, no server needed:** instance repeated decor (`InstancedMesh`, or `BatchedMesh` for mixed shapes)
  where `npm run perf` shows draw calls, distance-cull far decor (lazy decor already exists), and `THREE.LOD` with
  low-poly and impostor levels once authored models exist. These are Local and need no sync changes.
- **Streaming the world itself:** a 2D chunk grid keyed by position, loading and unloading terrain, decor and shared
  state around the player. This needs section 1. In lockstep every peer must simulate every cell to match the hash,
  so a peer cannot drop chunks. With a server, a client only needs the state of the chunks around it.
- From [docs/research/deterministic-sim-at-scale.md](../research/deterministic-sim-at-scale.md): per-chunk dirty
  tracking, per-chunk hashes and partial resync. These are useful in both models and can come before the server.

## Lockstep systems and the garden

The garden is not the obstacle. It is already deterministic, and the farming phase is on hold (PLAN.md, Phase 5). The
obstacle is lockstep over the whole world: `RULES` is `terrain, mushrooms, gifts, proto, water` (terrain, proto and water retired stubs). Removing
the garden would not unblock chunking, since terrain and gifts are also lockstep. Under a server, these become chunked
server state that clients subscribe to. Decide which to keep when section 1 starts, not before.

## WebGPU only (decided 2026-10-31)

The WebGL 2 fallback is gone ([src/render/README.md](../../src/render/README.md)), so GPU compute, storage buffers
and indirect draws are available to every section above without a second path: compute particles, GPU culling and
GPU-driven instancing for a large world. Browsers without WebGPU (Firefox on Android and Linux, iOS before 26) see a
lobby note instead. Watch `gfx` in telemetry `connect` reports for how many players that turns away.

## Frame-loop audit (baseline 2026-10-31)

Rerun this as the world grows; compare against these numbers, not against generic advice. Mac, real GPU:

| Check | Result |
|---|---|
| `npm run hitches` (WebGPU, island tour, day to night) | 3,144 frames, median 16.7 ms, p99 16.8 ms; only hitches are the harness's pointer-lock click on "enter" |
| `npm run perf` (WebGL 2 at the time, headless) | 128 draw calls (52 in the shadow pass), 224k triangles, 176 geometries, 64 programs |
| Shared sim, idle island | 0.004 ms per tick on average |

Already in place: clamped delta (`src/main.js`, 50 ms cap), fixed physics step with up to 4 substeps, one
`RenderPipeline` (scene pass, then one output pass), frustum culling on by default.

What to do as complexity increases, in order of expected payoff:

1. **Measure on the weakest device first.** Run `hitches` and `perf` against an iPad or phone (`--url`); the Mac
   numbers above say nothing about tile GPUs.
2. **Shadows.** The shadow pass is about 40% of draw calls. Tighten the shadow camera to the player's surroundings and
   cast shadows only from objects that need them.
3. **Instancing** of repeated decor once draw calls grow (section 3).
4. **Static matrices.** Only one file sets `matrixAutoUpdate = false`, so three.js recomputes every static decor
   matrix each frame. Freeze static decor (`matrixAutoUpdate = false` plus one `updateMatrix()`) once object counts
   grow.
5. **Compute particles** behind `emit()` (PLAN.md, "Graphics quality tiers"), replacing the CPU pool.
6. **Culling audit.** Eight files turn `frustumCulled` off (critters, sprites, sky, gifts, blob shadows, lighthouse,
   precompile), mostly instanced or shader-moved meshes whose bounds three.js can't know. Fine while they are small; give
   large ones real bounds (`computeBoundingSphere` over the instances) before the world grows.

Doesn't apply: moving player movement or physics to GPU compute (cannon-es, collisions and the network need positions
on the CPU, and readback costs more than it saves), and any "drop-in" loop rewrite (features plug in through the
`onFrame` phases and orders in `src/loop.js`).
