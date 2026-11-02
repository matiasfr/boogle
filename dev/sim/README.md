# Headless runs

`npm run sim -- <name>` runs `dev/sim/<name>.ts` in Node: the game's own state and Rapier, with no browser, GPU or scene code, hundreds of times faster than real time. Use it to test gameplay without the shared Mac GPU. It isn't a replacement for `npm run look`, which is how you see a change.

- `hooks.ts` does for Node what Vite does for the browser, with no change to game code: it loads Rapier's WASM (the same files the browser runs) and expands `import.meta.glob` and `import.meta.env`.
- `world.ts` is the game without its drawing: `await headless()`, then `frame()`. A frame is `main.ts`'s prePhysics, fixed steps and world phase, then the lockstep tick. Update and late never run.
- One world per process, because the game's state is module-level. Two players are two processes (`ball-handoff.ts` forks them; `joinRoom()` puts each in a room).

## Runs

- `drop`: Rapier alone, a ball dropped on a floor.
- `ball`: the ball thrown, settling, respawned off the island and floating, checked against numbers from the real game.
- `ball-tree`: the ball thrown at a palm, bouncing off a trunk whose colliders come from pure data (`src/blueprints/`).
- `player`: the local player walking, sprinting, stopping, jumping, hopping, swimming and caught by the fall-through net, every sample checked against the real game.
- `replay`: a real play session played back on this build, frame by frame, and compared (below).
- `ball-handoff`: two players in two processes through the real local server (no browser, in real time, about 8 s): picking up an orphaned ball, a steal, a throw the other follows, a lockstep edit, the owner leaving.

`ball-course.ts` is the course itself, with no Node or browser API. `node dev/sim/ball-browser.ts` runs that same file in the real game on the GPU and rewrites `ball-browser.json`: do that after changing the ball's physics, the ground or the course. A difference you didn't mean is a bug in the headless world, or in your change. `player-course.ts` and `player-browser.ts` are the same pair for the player.

## Replays: a real session, on a new build

`npm run sim -- replay` plays every recording in `replays/` and compares each with its `<name>.trace.json`, in about 0.7 s. Run it when you touch player or ball physics. It isn't in `npm run check`, since a change you mean makes it fail until you write a new trace.

```
golden.json: 1103 frames, 18.4 s of game in 104 ms (176x real time), recorded on build dev-mvz6cnzc
  golden.trace.json: same within 0.01. No difference at all
  the browser session: same within 0.01. No difference at all
```

And with `JUMP.fallGravity` at 1.6 instead of 1.7:

```
  golden.trace.json: DIFFERENT. First past 0.01: player.vy at frame 43: -0.531 here, -0.561 there, off by 0.030
    the last press before it: none yet. Worst: player.vy at frame 601: -9.826 here, 0.356 there, off by 10.182
```

- **Record:** open the game with `?record=1` and play. The pill at the top stops and downloads it (Esc first if the mouse is locked), or `boogle.record.stop()` returns it to a script, and `.start()` starts over. Off, it's one line that reads the address. A frame holds its `dt`, what changed in `input`, `inputState`, the camera's yaw and pitch, and the presses since the frame before; the file also holds where everything started and what the browser did (a row a frame). About 110 bytes a frame.
- **Replay:** `npm run sim -- replay <file>` compares with `<file>.trace.json` if there is one, or `--expect <trace>`. `--write` saves a new trace, `--tolerance` changes the 0.01 (m, m/s). It also prints how far it is from the session itself. That's for information: a recording stays as it was played, and physics can change on purpose.
- **A difference you meant:** `node dev/sim/replay-record.ts` plays the golden session again in the real game (real keys and mouse, about a minute), then `npm run sim -- replay --write`. That way "the browser session" still means this build.
- **A difference you didn't:** the first frame and field, and the press before it, are where to start.

### What a replay can and can't check

The golden session is walking to the ball, grabbing it, throwing it, walking, sprinting, jumping, hopping, sprinting up a slope and over its crest, and swimming. Played back headless it matches the browser in every field of every frame, to the millimetre the trace keeps, including the ball rolling down to the sea and bobbing there. A session that does none of the things below should too, and that's the check to run on your own recording.

It only checks what its session did: the crest is in the golden run because without it, turning off the ground snap went unnoticed. On that, it catches a change to: the controller, the jump's shape, swimming, the ground and its colliders, trees and rocks, the ball's physics and surf, reach, the throw's curve, and anything in Rapier.

It doesn't run, so doesn't catch a change to:

- **`hands.ts` and `input.ts`.** They reach the DOM and the scene. `replay.ts` does what a press did with the same functions (`pressJump`, `ballInReach`, `grabBall`, `throwBall`, `launchVelocity`), and only for the ball. What a press picked, how long a throw charged and where the camera aimed are read from the recording.
- **The camera.** A recording has its yaw and pitch as played, and the aim of each throw.

Things the browser has and a headless world doesn't. A session that meets one differs from there on, so that's a real difference in the world, not one to tolerate: record a session that keeps clear, as the golden one does.

- **The Boogler.** He bumps you and the ball, you can ride him, and he wanders by the spawn. Talking to him is listed as skipped, and `held` plays back as input, so you stand still as you did.
- **POI structures, the stall, mushrooms and their bounce, caves and their ponds, moving decks.** `turnWithDeck` runs after every frame as the view would, but there's no deck to turn you yet.
- **Other players.** The file says how many there were; a replay prints it. Ball ownership changes play back, a remote ball's movement doesn't.
- **Features that push you or the ball.** Punching, diving, ground pound, being knocked flat. Presses with no effect here are listed as skipped.
- **The hotbar.** Only the ball. A slot change is listed as skipped, and the throw from the touch Toss button isn't recorded at all.

The recording lands input at frame starts. A press made inside a frame's hooks lands on the next frame, and the touch grab button's throw can be a tick of the clock off (100 us of charge). A replay runs on the recorded `dt`s and the recorded physics clock, so sea state and the steps per frame match.

## What's in it: `npm run inspect`

`npm run inspect` starts this headless world, runs 240 frames and prints every entity: kind, phases and orders, positions, state from `describe()`, cost. It ends by listing each kind the source defines that a headless run doesn't have. `-- --browser` asks the real game through the look harness instead, `-- --json` prints the data. In a run or a page, `inspect()` from `src/entity/inspect.ts` (`window.boogle.inspect()`) returns the same thing.

## An entity in a headless run

An entity runs headless once it has a `headless.ts` (`src/entities/ball/` is the example). That file spawns the kinds with no view, and reaches neither the scene nor the DOM. `index.ts` imports it and adds the view as its own kind, so the game and the run share one code path. `world.ts` loads every `src/entities/*/headless.ts`, and `test/entity-state-node.test.ts` holds them to it.

## What's in the world, and what isn't

In: the real ground, Rapier, the ball, the trees and rocks, the player once a run calls `enterIsland()` (`src/entities/player/state.ts`; it drives the player by writing to `input` and `cam`), the lockstep rules on the server's land, and the net code.

Not yet:

- **Other entities and most features**: they have no `headless.ts`, and many reach the DOM or the scene as they load.
- **POI structures and mushrooms.** They're built with what draws them, so a ball flies through them here. Pick a course that misses them; a comparison with the browser shows it if one does not. Trees and rocks are in: their colliders are data (`src/blueprints/props.ts`, `src/entities/props/`).
