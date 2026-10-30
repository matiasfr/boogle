# native/guest

The guest engine: a wasm with the guest's simulation (every action, collision, animation playback) and the guest and
dino models, built from a local checkout of the upstream N64 decompilation (https://github.com/n64decomp/sm64) and the
glue in this folder. Only the glue is in this repo. The engine is never committed, deployed or fetched by the game:
each player brings their own build, like the ROM (`src/guest/engine.js`).

## Build

Needs clang with the `wasm32` target and `wasm-ld` (macOS: `brew install lld`; Apple's clang works), Node, and the upstream checkout.
A ROM is not needed: the build compiles only what upstream keeps as source.

```bash
GUEST_DECOMP=/path/to/checkout node native/guest/build.mjs
```

`CLANG` and `WASM_LD` override the tool paths. The result is `native/guest/out/engine.wasm` (gitignored).

## Use it

- In the game: talk to the dino by the wine cellar, then drop or pick `engine.wasm` and the ROM in the dialog. This
  browser keeps both in IndexedDB.
- On a local dev server: `VITE_DINO_ENGINE_URL=/native/guest/out/engine.wasm npm run dev` loads it without the
  dialog. Never set this for a deploy.

## What is compiled, what comes from the ROM

- From the upstream checkout (listed in `build.mjs`): the character's actions and step code, its interaction code, the
  engine's collision, math, graph node and geo layout code, the guest's and the dino's geometry and geo layouts, and
  the dino's animations.
- From the player's own ROM at runtime (`src/guest/rom.js`): the guest's animation bank and the guest and dino
  textures. The build writes each texture as its index in `src/guest/textures.js` instead.
- The glue, ours:
  - `shim.c`: the globals and memory the character code expects, animation loading, and the exported API.
  - `stubs.c`: inert stand-ins for music, dialog, saving, warps, the camera and objects.
  - `surfaces.c`: loads the triangles `src/guest/collision.js` gathers into the engine's spatial partition.
  - `render.c`: walks a model's graph nodes and turns its display lists into a flat triangle list.
  - `model.c`: compiles the upstream model sources.

The glue calls upstream by its own names (headers, structs, globals), and the exports are ours, prefixed `guest_`. Everything runs in engine units (100 per metre) in a frame `src/guest/play.js` keeps centred near the
guest, since the engine's collision covers ±8192 units.
