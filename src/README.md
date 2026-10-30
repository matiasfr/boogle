# src/ map

Top level: `main.js` (boot and render), `loop.js` (`onFrame`/`onStart` phases), `style.css`, `constants.js`,
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
  They submit edits and react to `world/rules/`; they never register lockstep state themselves.
- `physics/`: cannon-es world and step hooks, the beach ball, thrown-item flights, the water-field bridge.
- `player/`: the local player and camera, avatars, hands and hotbar, input, the control registry, glyphs, the controls
  guide, modal, HUD, item icons and models.
- `render/`: scene, renderer and camera, lights pool, sky, sea shader and sim-water surface, props, particles,
  splashes, material patching, and the shared (cosmetic) audio context.
- `boogler/`: The Boogler NPC: brain and model (`boogler.js`), play, talk, lines, dialogue box, friendship, HUD, fx.
