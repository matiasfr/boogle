# src/ map

Top level: `main.ts` (boot once the renderer is ready, then the frame loop), `loop.ts` (`onFrame`/`onStart` phases), `style.css`, `constants.ts`,
`math.ts` and `math-pure.ts` (the pure half, also used in Node).

- `boot/`: the page's entry and the loading screen (key art, progress bar), shown before the game downloads; the boot timeline (`timeline.ts`) and the service worker (`sw*.ts`; docs/plans/loading.md).
- `features/`: self-contained plug-ins, auto-loaded by `main.ts` (`import.meta.glob('./features/*.{js,ts}')`). Add new
  features here, not in the folders below.
- `world/`: shared state, edit sync and snapshots (see [world/README.md](world/README.md)); `world/rules/` holds the
  lockstep rules modules.
- `sim/`: pure, deterministic logic (no three.js, no DOM), unit-tested in `test/`.
- `net/`: the room interface, a WebSocket to our server, which hosts every room (see [net/README.md](net/README.md)).
- `netplay/`: game networking on top of the room: `net.ts` (presence, remote players, interpolation) and its pure
  helpers (snapshot buffer, presence fields, build tags, report scrubbing, smooth shared time).
- `island/`, `pois/`: the island's base ground and its points of interest (caves, lighthouse, ...); `island/terrain.ts`
  is the fixed ground's heightfield and mesh (`groundHeight`, `cellX`/`cellZ`).
- `adapters/`: the game side of lockstep state: gifts, mushroom garden, piles. They submit edits and react
  to `world/rules/`; they never register lockstep state themselves. A new adapter is a feature file, unless other
  modules must import it.
- `physics/`: the physics facade (`engine.ts`; `backend-rapier.ts` is the only module that imports Rapier), step hooks, the beach ball, thrown-item flights, the water-field bridge (sea and cave pond).
- `player/`: the local player and camera, avatars, hands and hotbar, input, the control registry, glyphs, the controls
  guide, modal, HUD, item icons and models.
- `render/`: the WebGPU renderer, render pipeline and camera, lights pool, sky, sea, props, particles, splashes,
  node-material patching (`patchNode`), and the shared (cosmetic) audio context. How to draw things:
  [render/README.md](render/README.md).
- `ui/`: the HUD's shared kit (Local, cosmetic): UI sounds (`ui-sound.ts`), motion and colour tokens (`ui-kit.css`),
  and the one notification lane (`notify.ts`). Features import it; it imports nothing from `features/`.
- `debug/`: dev-only tools behind URL flags (`?netdebug=1`, `?debugcam=1`), loaded lazily by their stubs in `features/`.
- `boogler/`: The Boogler NPC: brain and model (`boogler.ts`), play, talk, lines, dialogue box, friendship, HUD, fx.
- `decomp/`: shared pieces for characters run by an engine and files the player brings (the files dialog, the
  IndexedDB store); the plan for more is [docs/plans/decomp-characters.md](../docs/plans/decomp-characters.md).
- `guest/`: playing as the guest (engine glue in `native/guest/`), and the dino who offers it; the eager glue is
  `features/dino.ts`. Working on it: [guest/README.md](guest/README.md).
- `proto/`: find-the-fun prototypes too big for one feature file, loaded only behind their `?proto=` flag (or the
  `?play` island) by a stub in `features/` that asks `proto/flags.ts` (`protoOn`, `protoV`, `onVariant`); the
  prototype bar and playlist in `proto/bar/` (`proto/soapbox/`: the soapbox cart; docs/plans/find-the-fun.md).
