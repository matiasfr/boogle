# src/ map

Start with `npm run map -- --kind <kind>` for task owners, safe examples, companion docs, sync and checks; bare `--kind` lists the routes.
Use `npm run unused` (or `-- --json`) for advisory file/export/CSS/asset/dependency evidence; flags are not deletion authority.

Top level: `main.ts` (boot once the renderer is ready, then the frame loop), `loop.ts` (`onFrame`/`onStart` phases), `style.css`, `constants.ts`,
`math.ts` and `math-pure.ts` (the pure half, also used in Node), `build-id.ts` (this page's build, read from the page
so hashed file names don't depend on it).

- `boot/`: the page's entry and the loading screen (key art, progress bar), shown before the game downloads; the boot timeline (`timeline.ts`) and the service worker (`sw*.ts`; docs/plans/loading.md).
- `features/`: plug-in entry registration, auto-loaded by `main.ts` (`import.meta.glob('./features/*.{js,ts}')`). Keep feature-owned implementation here; reusable code belongs to its domain below, long-lived objects to `entities/`, and POI content to `pois/`.
- `world/`: shared state, edit sync and snapshots (see [world/README.md](world/README.md)); `world/rules/` holds the
  lockstep rules modules.
- `sim/`: pure, deterministic logic (no three.js, no DOM), unit-tested in `test/`.
- `net/`: the room interface, a WebSocket to our server, which hosts every room (see [net/README.md](net/README.md)).
- `netplay/`: game networking on top of the room: `net.ts` (presence, the remotes table, peer lifecycle hooks; pure
  infrastructure, lint-enforced), `owner-sync.ts` (an Owner object that changes hands) and its pure helpers (snapshot buffer, presence fields, build tags, report scrubbing,
  smooth shared time).
- `entity/`: the entity core, for anything new in the world or on screen: `entity.ts` (`defineKind`, `spawn`, `despawn`; the
  lifecycle contract is at its top) and `walker.ts`, its pure logic, tested in Node.
- `components/`: typed behaviours explicitly owned and called by entities; see the [owned-behaviour convention](../docs/agents/plugins.md#a-feature-is-a-plug-in). `name-label/view.ts` shares remote-player and arrival-preview label maintenance.
- `entities/`: game objects (docs/plans/entity-architecture.md). `ball/`: the beach ball, the worked example of a
  long-lived entity (`index.ts` runs it, `state.ts`, `view.ts`, `sync.ts`); `features/ping.ts` is the short-lived one. `player/` and
  `camera/`: the local player and camera as entities, over `player/`. `remote-player/`: other players as this tab
  draws them, avatars, labels, bodies and interpolation, plus riding a shared platform. Most other kinds live in the feature
  that owns them; `npm run registry -- --json` lists them with their orders.
- `blueprints/`: static world objects as pure data, kept apart from how they're drawn (`blueprint.ts`; `props.ts`: the palms, round trees and rocks, and where they go). `entities/props/` makes their colliders, `render/props.ts` draws them.
- `island/`, `pois/`: the classic island (at the world's origin, in the current game's world) and its points of interest (caves, lighthouse, ...); `island/heights.ts`
  is the fixed ground's heights (`groundHeight`, `cellX`/`cellZ`), `island/terrain.ts` its mesh.
- `fall/`: a first visit's fall into the world, loaded only then by `features/fall.ts`.
- `adapters/`: the game side of lockstep state: gifts, piles; and mushrooms, which aren't lockstep but other modules call. They submit edits and react
  to `world/rules/`; they never register lockstep state themselves. A new adapter is a feature file, unless other
  modules must import it.
- `physics/`: the physics facade (`engine.ts`; `backend-rapier.ts` is the only module that imports Rapier), step hooks, thrown-item flights, the water-field bridge (sea and cave pond).
- `player/`: the local player and camera, avatars, hands and what you hold, input, the control registry, glyphs, the controls
  guide, modal, HUD, item icons and models. `state.ts` (`me`, `cam`, poses), `dom.ts` and `input-state.ts` are leaf
  modules. `entities/player/state.ts` owns the movement controller; `player.ts` is a small facade, not the driver. `buddy/` owns the Buddy body, animation and follow camera; `input.ts` feeds intent without owning movement.
- `render/`: the WebGPU renderer, render pipeline and camera, lights pool, sky, sea, props, particles, splashes,
  node-material patching (`patchNode`), and the shared (cosmetic) audio context. How to draw things:
  [render/README.md](render/README.md).
- `ui/`: the HUD's shared kit (Local, cosmetic): UI sounds (`ui-sound.ts`), motion and colour tokens (`ui-kit.css`),
  and the one notification lane (`notify.ts`). Features import it; it imports nothing from `features/`.
- `debug/`: dev-only tools behind URL flags (`?netdebug=1`, `?debugcam=1`), loaded lazily by their stubs in `features/`.
- `boogler/`: The Boogler NPC: brain and model (`boogler.ts`), play, talk, lines, dialogue box, memory, HUD, fx.
- `decomp/`: shared pieces for characters run by an engine and files the player brings (the files dialog, the
  IndexedDB store); the plan for more is [docs/plans/decomp-characters.md](../docs/plans/decomp-characters.md).
- `guest/`: playing as the guest (engine glue in `native/guest/`), and the dino who offers it; the eager glue is
  `features/dino.ts`. Working on it: [guest/README.md](guest/README.md).
- `place/`: the village's land and layout (metres), terrain, cove and shore, folk, signs, building plans and the shared
  look kit that several entities draw with; moved out of Place's prototype (docs/plans/ecs-migration-railway.md, M5).
- `proto/`: find-the-fun prototypes too big for one feature file, loaded behind their `?proto=` flag by a stub in
  `features/` that asks `proto/flags.ts` (`protoOn`, `protoV`); Place is also the default entry. `proto/session.ts`
  starts spawn placement, counters and traces without an in-game panel (docs/plans/find-the-fun.md).
