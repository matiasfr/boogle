# Headless runs

`npm run sim -- <name>` runs `dev/sim/<name>.ts` in Node: the game's own state and Rapier, with no browser, GPU or scene code, hundreds of times faster than real time. Use it to test gameplay without the shared Mac GPU. It isn't a replacement for `npm run look`, which is how you see a change.

- `hooks.ts` does for Node what Vite does for the browser, with no change to game code: it loads Rapier's WASM (the same files the browser runs) and expands `import.meta.glob` and `import.meta.env`.
- `world.ts` is the game without its drawing: `await headless()`, then `frame()`. A frame is `main.ts`'s prePhysics, fixed steps and world phase, then the lockstep tick. Update and late never run.
- One world per process, because the game's state is module-level. Two players are two processes (`ball-handoff.ts` forks them; `joinRoom()` puts each in a room).

## Runs

- `drop`: Rapier alone, a ball dropped on a floor.
- `ball`: the ball thrown, settling, respawned off the island and floating, checked against numbers from the real game.
- `ball-tree`: the ball thrown at a palm, bouncing off a trunk whose colliders come from pure data (`src/blueprints/`).
- `ball-handoff`: two players in two processes through the real local server (no browser, in real time, about 8 s): picking up an orphaned ball, a steal, a throw the other follows, a lockstep edit, the owner leaving.

`ball-course.ts` is the course itself, with no Node or browser API. `node dev/sim/ball-browser.ts` runs that same file in the real game on the GPU and rewrites `ball-browser.json`: do that after changing the ball's physics, the ground or the course. A difference you didn't mean is a bug in the headless world, or in your change.

## What's in it: `npm run inspect`

`npm run inspect` starts this headless world, runs 240 frames and prints every entity: kind, phases and orders, positions, state from `describe()`, cost. It ends by listing each kind the source defines that a headless run doesn't have. `-- --browser` asks the real game through the look harness instead, `-- --json` prints the data. In a run or a page, `inspect()` from `src/entity/inspect.ts` (`window.boogle.inspect()`) returns the same thing.

## An entity in a headless run

An entity runs headless once it has a `headless.ts` (`src/entities/ball/` is the example). That file spawns the kinds with no view, and reaches neither the scene nor the DOM. `index.ts` imports it and adds the view as its own kind, so the game and the run share one code path. `world.ts` loads every `src/entities/*/headless.ts`, and `test/entity-state-node.test.ts` holds them to it.

## What's in the world, and what isn't

In: the real ground, Rapier, the ball, the trees and rocks, the player once a run calls `enterIsland()` (`src/entities/player/state.ts`; it drives the player by writing to `input` and `cam`), the lockstep rules on the server's land, and the net code.

Not yet:

- **Other entities and most features**: they have no `headless.ts`, and many reach the DOM or the scene as they load.
- **POI structures and mushrooms.** They're built with what draws them, so a ball flies through them here. Pick a course that misses them; a comparison with the browser shows it if one does not. Trees and rocks are in: their colliders are data (`src/blueprints/props.ts`, `src/entities/props/`).
