# Headless runs

`dev/sim/` runs the game's own state and Rapier in Node, with no browser, GPU or scene code. It isn't a replacement for `npm run look`, which is how you see a change.

- `hooks.ts` does for Node what Vite does for the browser, with no change to game code: it loads Rapier's WASM (the same files the browser runs) and expands `import.meta.glob` and `import.meta.env`. `npm run inspect`, `npm run level-check` and the Node tests that load the real world import it.
- `world.ts` is the game without its drawing: `await headless()`, then `frame()`. A frame is `main.ts`'s prePhysics, fixed steps and world phase, then the lockstep tick. Update and late never run.
- One world per process, because the game's state is module-level. Two players are two processes (`joinRoom()` puts each in a room).
- `run.ts` (`npm run sim -- <name>`) runs any other `dev/sim/<name>.ts`. There are none at present.

The headless ball and player runs (`ball`, `ball-tree`, `ball-handoff`, `drop`, `player`, `player-support`, `replay` and their browser twins) and the golden replay were retired on 9 November 2026 (docs/brainstorms/loop-graph.md): player and ball physics are vestigial to the rail loop. For the loop itself, `npm run loop` reads the graph, `-- run` plays it through the real host rules in Node and `-- trace` compares it with a playtest. The game's `?record=1` recorder (`src/debug/record.ts`) stays; nothing plays its recordings back headless now.

## What's in it: `npm run inspect`

`npm run inspect` starts this headless world, runs 240 frames and prints every entity: kind, phases and orders, positions, state from `describe()`, cost. It ends by listing each kind the source defines that a headless run doesn't have. `-- --browser` asks the real game through the look harness instead, `-- --json` prints the data. In a run or a page, `inspect()` from `src/entity/inspect.ts` (`window.boogle.inspect()`) returns the same thing.

## An entity in a headless run

An entity runs headless once it has a `headless.ts` (`src/entities/ball/` is the example). That file spawns the kinds with no view, and reaches neither the scene nor the DOM. `index.ts` imports it and adds the view as its own kind, so the game and the run share one code path. `world.ts` loads every `src/entities/*/headless.ts`, and `test/entity-state-node.test.ts` holds them to it.

## What's in the world, and what isn't

In: the real ground, Rapier, the ball, the trees and rocks, the player once a run calls `enterIsland()` (`src/entities/player/state.ts`; it drives the player by writing to `input` and `cam`), the lockstep rules on the server's land, and the net code.

Not yet:

- **Other entities and most features**: they have no `headless.ts`, and many reach the DOM or the scene as they load.
- **POI structures and mushrooms.** They're built with what draws them, so a ball flies through them here. Trees and rocks are in: their colliders are data (`src/blueprints/props.ts`, `src/entities/props/`).
