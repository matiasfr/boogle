Before changing module dependencies, services or lockstep boundaries, read this lint contract.

## Lint boundaries (`eslint.config.js`)
- Determinism rules on `LOCKSTEP_FILES`: a new lockstep module outside `src/sim/` and `src/world/rules/` joins that list.
- `registerOp`/`registerState`/`onTick` only in `src/world/rules/` (and `game-world.ts`, which installs them): one place owns wire order and hashing.
- Rules import only `src/sim/`, `../grid.ts` and sibling rules; `src/sim/` imports nothing from `src/`.
- Features don't import other features: shared code moves to `src/` (an adapter, `src/player/`, ...).
- `src/world/*.ts` and `src/net/` stay headless: no `three`, `src/render/`, `src/player/` or `src/features/`.
- Outside `src/proto/` and `src/debug/`, reach them with `import()`; the only static ways in are `proto/flags.ts` and `proto/mark.ts`.
- One door: `new WebSocket`, `AudioContext` and `requestAnimationFrame` only on `DOORS`' allow-lists; a second frame loop is an `onFrame`.
- No WebGL-only three.js APIs in `src/` (list in `src/render/README.md`, "Materials").
