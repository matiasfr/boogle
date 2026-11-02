# Headless runs

`npm run sim -- <name>` runs `dev/sim/<name>.ts` in Node: the game's own state and Rapier, with no browser, GPU or scene code, hundreds of times faster than real time. Use it to test gameplay without the shared Mac GPU. It isn't a replacement for `npm run look`, which is how you see a change.

- `hooks.ts` does for Node what Vite does for the browser, with no change to game code: it loads Rapier's WASM (the same files the browser runs) and expands `import.meta.glob` and `import.meta.env`.
- `world.ts` is the game without its drawing: `await headless()`, then `frame()`. A frame is `main.ts`'s prePhysics, fixed steps and world phase, then the lockstep tick. Update and late never run.
- One world per process, because the game's state is module-level. Two players are two processes (`ball-handoff.ts` forks them; `joinRoom()` puts each in a room).

## Runs

- `drop`: Rapier alone, a ball dropped on a floor.
- `ball`: the ball thrown, settling, respawned off the island and floating, checked against numbers from the real game.
- `ball-handoff`: two players in two processes through the real local server (no browser, in real time, about 8 s): picking up an orphaned ball, a steal, a throw the other follows, a lockstep edit, the owner leaving.

`ball-course.ts` is the course itself, with no Node or browser API. `node dev/sim/ball-browser.ts` runs that same file in the real game on the GPU and rewrites `ball-browser.json`: do that after changing the ball's physics, the ground or the course. A difference you didn't mean is a bug in the headless world, or in your change.

## An entity in a headless run

An entity runs headless once it has a `headless.ts` (`src/entities/ball/` is the example). That file spawns the kinds with no view, and reaches neither the scene nor the DOM. `index.ts` imports it and adds the view as its own kind, so the game and the run share one code path. `world.ts` loads every `src/entities/*/headless.ts`, and `test/entity-state-node.test.ts` holds them to it.

## What's in the world, and what isn't

In: the real ground, Rapier, the ball, the lockstep rules on the server's land, and the net code.

Not yet:

- **The player.** `src/entities/player/index.ts` is still one blob with its mesh, and `me.body` stays null. It runs headless once its state and view are split, as the ball's are. Until then a run calls `grabBall()` and `throwBall()` itself.
- **Other entities and most features**: they have no `headless.ts`, and many reach the DOM or the scene as they load.
- **Static colliders other than the ground.** Trees and rocks (`src/render/props.ts`), POI structures and mushrooms are built with what draws them, so a ball flies through them here. Pick a course that misses them; a comparison with the browser shows it if one does not.
