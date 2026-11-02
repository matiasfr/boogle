# 9. Tech and tooling

Brief; the rules for contributors are in [AGENTS.md](../../AGENTS.md) (imported by [CLAUDE.md](../../CLAUDE.md)) and the
folder map in [src/README.md](../../src/README.md).

- **Stack.** three.js 0.187 (`WebGPURenderer`, WebGPU only; shaders in TSL, see
  [src/render/README.md](../../src/render/README.md)), Rapier 0.19.3 (physics, WASM, loaded behind the splash), WebSocket to our server (`ws` 8 on Node 24), TypeScript (strict, converting from JavaScript), bundled with Vite ([package.json](../../package.json));
  the build splits three into a vendor chunk; Rapier is its own chunk and WASM file ([vite.config.js](../../vite.config.js)).
  The server ([server/README.md](../../server/README.md)) is Node with Express and `ws`, and runs hosted
  rooms with the game's own `src/world/` and `src/sim/` code (section 8).
- **Layout.** `src/` is grouped by domain: `features/` (auto-loaded plug-ins), `world/` and `world/rules/` (lockstep),
  `sim/` (pure logic), `net/` and `netplay/`, `island/` and `pois/`, `adapters/` (the game side of lockstep state),
  `physics/`, `player/`, `render/`, `boogler/`, `guest/` and `decomp/` (the dino's guest), `boot/` (the loading
  screen), `debug/`.
- **Plug-ins.** A feature registers `onFrame(fn, { phase, order })` and `onStart(fn)` ([src/loop.ts](../../src/loop.ts),
  which lists the core hooks' orders; features use −10 and up). `main.ts` only wires modules and renders. Heavy or
  rarely used parts load with a dynamic `import()` ("Lazy parts" in `loop.ts`): today the caves, the Boogler's
  conversations and the debug tools; never sync ops, state, rules or anything seen in the first seconds. Shared
  registries: controls (`registerAction`), interactables (`registerInteractable`) and particles (`emit(...)` in
  [src/render/particles.ts](../../src/render/particles.ts)).
- **Checks.** `npm run check`: lint (determinism rules on lockstep files, import boundaries, `registerOp`/
  `registerState`/`onTick` only in `world/rules/`), `tsc` typecheck, unit tests (`node:test`, pure logic only), the
  registry check (`npm run registry`: wire shapes against `main`, for mixed builds) and build.
  `npm run check:full` adds server tests and the headless network tests (`dev/peer-test/run.mjs` for peer rooms,
  `ws-run.ts` for server-hosted rooms and the room picker). Key tests:
  [test/world-replay.test.mjs](../../test/world-replay.test.mjs) (seeded edits for every op, host killed midway, late
  joiner, identical hashes) and [test/world-snapshots.test.mjs](../../test/world-snapshots.test.mjs).
- **Scenarios.** `npm run scenario -- <name>` and `npm run look` (stills, motion sheets, heatmaps). Scenarios in
  [dev/scenarios/](../../dev/scenarios/): atlas, boogler-tag, caves, controls-guide, dino, falls, first-run,
  guest-play, haul-loop, hotbar, interact, lighthouse, particles, pause, reconnect-edit, shared-kinds, smoke, splash,
  world-inputs. PR CI runs single-player
  scenarios only (`world-inputs`, must pass; two software-rendered tabs are too slow there); seven others (reconnect-edit,
  shared-kinds, hotbar, interact, caves, lighthouse, atlas) run nightly in `scenarios-nightly.yml` and never block; the
  rest run only by hand. `smoke` needs a GPU: `npm run check:gpu` runs it in `npm run ship` on a
  Mac, and `smoke.yml` runs it against the live site after every deploy and nightly. Every run is WebGPU (SwiftShader on Linux and CI, Metal on a Mac). `npm run island-map` renders the composed island.
- **Perf.** `npm run perf`: draw calls, shadow calls, triangles, shader stages, main-thread CPU per frame section and ms per lockstep tick, with rows tagged by handler. `?prof=1` shows the frame sections live (any build).
- **Atlas.** An internal map of how the code fits together, served at `/atlas/` beside the game (its own page and
  chunks; d3 never reaches the game bundle). Facts are read from `src/` with the TypeScript compiler API on every build
  (`npm run atlas` prints them, [dev/atlas/](../../dev/atlas/)); the explanations live in
  [docs/atlas/](../atlas/) and `atlas.yml` keeps them current daily. Not part of the game.
- **Video.** `npm run clip`, `reel`, `video:changes`, `video:publish` ([dev/video/](../../dev/video/)).
- **Shipping.** `npm run ship` and self-merging PRs; the steps are in AGENTS.md, "Shipping". `smoke.yml` runs the
  nightly live two-tab test; `deploy-server.yml` deploys `server/` when a token exists, on changes to `server/` and to
  what its image carries (`src/world/`, `src/sim/`, `src/net/ids.ts`, `src/net/ws-wire.ts`), since the server runs the
  same rules as the tabs.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
