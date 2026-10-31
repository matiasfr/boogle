# 9. Tech and tooling

Brief; the rules for contributors are in [AGENTS.md](../../AGENTS.md) (imported by [CLAUDE.md](../../CLAUDE.md)) and the
folder map in [src/README.md](../../src/README.md).

- **Stack.** three.js 0.187 (`WebGPURenderer`, WebGPU only; shaders in TSL, see
  [src/render/README.md](../../src/render/README.md)), cannon-es 0.20.0, PeerJS 1.5.5, TypeScript (strict, converting from JavaScript), bundled with Vite ([package.json](../../package.json));
  the build splits three, cannon-es and peerjs into vendor chunks ([vite.config.js](../../vite.config.js)).
- **Layout.** `src/` is grouped by domain: `features/` (auto-loaded plug-ins), `world/` and `world/rules/` (lockstep),
  `sim/` (pure logic), `net/` and `netplay/`, `island/` and `pois/`, `adapters/` (the game side of lockstep state),
  `physics/`, `player/`, `render/`, `boogler/`, `debug/`.
- **Plug-ins.** A feature registers `onFrame(fn, { phase, order })` and `onStart(fn)` ([src/loop.js](../../src/loop.js),
  which lists the core hooks' orders; features use −10 and up). `main.js` only wires modules and renders. Heavy or
  rarely used parts load with a dynamic `import()` ("Lazy parts" in `loop.js`): today the caves, the Boogler's
  conversations and the debug tools; never sync ops, state, rules or anything seen in the first seconds. Shared
  registries: controls (`registerAction`), interactables (`registerInteractable`) and particles (`emit(...)` in
  [src/render/particles.js](../../src/render/particles.js)).
- **Checks.** `npm run check`: lint (determinism rules on lockstep files, import boundaries, `registerOp`/
  `registerState`/`onTick` only in `world/rules/`), unit tests (`node:test`, pure logic only) and build.
  `npm run check:full` adds server tests and the headless network test. Key tests:
  [test/world-replay.test.mjs](../../test/world-replay.test.mjs) (seeded edits for every op, host killed midway, late
  joiner, identical hashes) and [test/world-snapshots.test.mjs](../../test/world-snapshots.test.mjs).
- **Scenarios.** `npm run scenario -- <name>` and `npm run look` (stills, motion sheets, heatmaps). Scenarios in
  [dev/scenarios/](../../dev/scenarios/): caves, controls-guide, hotbar, interact,
  lighthouse, particles, pause, reconnect-edit, shared-kinds, smoke, world-inputs. PR CI runs single-player
  scenarios only (`world-inputs`, must pass; two software-rendered tabs are too slow there); the rest run nightly in
  `scenarios-nightly.yml` and never block. `smoke` needs a GPU: `npm run check:gpu` runs it in `npm run ship` on a
  Mac, and `smoke.yml` runs it against the live site after every deploy and nightly. Every run is WebGPU (SwiftShader on Linux and CI, Metal on a Mac). `npm run island-map` renders the composed island.
- **Perf.** `npm run perf`: draw calls, shadow calls, triangles, shader stages, main-thread CPU per frame section and ms per lockstep tick, with rows tagged by handler. `?prof=1` shows the frame sections live (any build).
- **Video.** `npm run clip`, `reel`, `video:changes`, `video:publish` ([dev/video/](../../dev/video/)).
- **Shipping.** `npm run ship` and self-merging PRs; the steps are in AGENTS.md, "Shipping". `smoke.yml` runs the
  nightly live two-tab test; `deploy-server.yml` deploys `server/` when a token exists.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
