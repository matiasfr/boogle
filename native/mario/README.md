# native/mario

`src/mario/sm64.wasm` is built here: Mario's simulation (every action, collision, animation playback) and the
Mario and Yoshi models, compiled from the [Super Mario 64 decompilation](https://github.com/n64decomp/sm64) with a
small shim. The game loads it lazily (`src/mario/sim.js`); CI does not rebuild it, so commit the `.wasm` with any
change here.

## Build

Needs clang with the `wasm32` target and `wasm-ld` (macOS: `brew install lld`; Apple's clang works), Node, and a
checkout of the decomp. A ROM is not needed: the build compiles only what the decomp keeps as source.

```bash
SM64_DECOMP=/path/to/sm64 node native/mario/build.mjs
```

`CLANG` and `WASM_LD` override the tool paths.

## What is compiled, what comes from the ROM

- From the decomp: `src/game/mario*.c`, `interaction.c`, the engine's collision, math, graph node and geo layout
  code, Mario's and Yoshi's geometry and geo layouts, and Yoshi's animations.
- From the player's own ROM at runtime (`src/mario/rom.js`, kept in IndexedDB): Mario's animation bank and the
  Mario and Yoshi textures. The build writes each texture as its index in `src/mario/textures.js` instead.
- Shim:
  - `shim.c`: the globals and memory Mario's code expects, animation loading, and the exported API.
  - `stubs.c`: inert stand-ins for music, dialog, saving, warps, the camera and objects.
  - `surfaces.c`: loads the triangles `src/mario/collision.js` gathers into the decomp's spatial partition.
  - `render.c`: walks a model's graph nodes and turns its Fast3D display lists into a flat triangle list.
  - `model.c`: compiles the Mario and Yoshi actor sources.

Everything runs in SM64 units (100 per metre) in a frame `src/mario/mario.js` keeps centred near Mario, since the
decomp's collision covers ±8192 units.
