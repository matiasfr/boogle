# src/ map

Top level: `main.js` (boot once the renderer is ready, then the frame loop), `loop.js` (`onFrame`/`onStart` phases), `style.css`, `constants.js`,
`math.js` and `math-pure.js` (the pure half, also used in Node).

- `features/`: self-contained plug-ins, auto-loaded by `main.js` (`import.meta.glob('./features/*.js')`). Add new
  features here, not in the folders below.
- `world/`: shared state, edit sync and snapshots (see [world/README.md](world/README.md)); `world/rules/` holds the
  lockstep rules modules.
- `sim/`: pure, deterministic logic (no three.js, no DOM), unit-tested in `test/`.
- `net/`: the room interface over PeerJS (see [net/README.md](net/README.md)).
- `netplay/`: game networking on top of the room: `net.js` (presence, remote players, interpolation) and its pure
  helpers (snapshot buffer, presence fields, build tags, report scrubbing, smooth shared time).
- `island/`, `pois/`: the island's base ground and its points of interest (caves, lighthouse, ...).
- `adapters/`: the game side of lockstep state: terrain mesh and heights, gifts, mushroom garden, prototype flags.
  They submit edits and react to `world/rules/`; they never register lockstep state themselves. A new adapter is a
  feature file, unless other modules must import it.
- `physics/`: cannon-es world and step hooks, the beach ball, thrown-item flights, the water-field bridge (sea and cave pond).
- `player/`: the local player and camera, avatars, hands and hotbar, input, the control registry, glyphs, the controls
  guide, modal, HUD, item icons and models.
- `render/`: the WebGPU renderer, render pipeline and camera, lights pool, sky, sea, props, particles, splashes,
  node-material patching (`patchNode`), and the shared (cosmetic) audio context. How to draw things:
  [render/README.md](render/README.md).
- `debug/`: dev-only tools behind URL flags (`?netdebug=1`, `?debugcam=1`), loaded lazily by their stubs in `features/`.
- `boogler/`: The Boogler NPC: brain and model (`boogler.js`), play, talk, lines, dialogue box, friendship, HUD, fx.
- `decomp/`: shared pieces for characters run by an engine and files the player brings (the files dialog, the
  IndexedDB store); the plan for more is [docs/plans/decomp-characters.md](../docs/plans/decomp-characters.md).
- `guest/`: playing as the guest (engine glue in `native/guest/`), and the dino who offers it; the eager glue is
  `features/dino.js`. Working on it: [guest/README.md](guest/README.md).
