# Plan: more engine-run characters

## Goal

The guest (PR #49, renamed since) is the first character run by an engine the player brings, with animations and
textures from the player's own ROM. More may follow. Each should be one folder plus a short feature file, without
copying the guest's code or touching the player, physics or networking modules. Serves DESIGN.md 1 (toys before
chores) and "Small and readable".

This is a plan, not built yet. Do it with the **second** character, when there are two real cases to fit. Until then,
new work on the guest keeps to the boundaries below so the split stays cheap.

## Rules every such character keeps

- **Names are fine.** Copy, docs and code may name the character, its games and Nintendo; don't reword anything to
  remove a reference. The hard line is ROM data (next rule).
- **No ROM in the public repo.** No ROM data, or anything cut from it, in the repo or the build made from it. Fetching
  one from elsewhere may be allowed later (the owner's call).
- **Bring your own engine and ROM, for now.** No engine build in the repo or the build. The player drops or picks
  them once (`src/decomp/files-dialog.js`) and this browser keeps them (`src/decomp/store.js`); a local dev build may
  name the engine with a `VITE_..._ENGINE_URL`. Without both files the feature is dormant and fetches nothing.
- **Only our glue in `native/`.** Upstream source is compiled from a local checkout the build script points at.
- Heavy parts load lazily; controls through `registerAction` with at least one pad slot left free.

## Where things stand

Already shared or generic:

- `src/decomp/files-dialog.js`: the dialog, with a checklist of what is needed. The caller passes the text.
- `src/decomp/store.js`: IndexedDB `loadFile(key)` / `saveFile(key, data)`.
- `triggerAction(id, edge)` (`src/player/controls.ts`): mouse clicks go through the `use` action, so a character's
  `wrapAction('use', ...)` covers them. Touch and pad already did.
- The pose wire format is defined in one place, `src/guest/engine.js` (`POSE_LEN`, `isPose`, `quantisePose`).

Still guest-shaped (all in `src/guest/` and `src/features/dino.js`):

| Piece | Today | Generic part |
| --- | --- | --- |
| `engine.js` | finding, checking and instantiating the brought wasm | the find / check / keep part |
| `rom.js` | SHA-1 check, byte order, MIO0, the cut | byte order, SHA-1 |
| `collision.js` | terrain + static bodies as triangles in engine units, around a moving origin | all of it; take units and the buffer as arguments |
| `play.js` | kinematic body follow at 30 Hz, avatar hiding, teleport detection, stick/buttons, ball hits | the body follow (see "Driving the player body") |
| `model.js` | atlas + the N64 combiner shader | engine-specific; another engine ships its own |
| `features/dino.js` | the dino trigger, files flow, controls, presence `mr`, remote drawing | files flow, presence, remote drawing |

## Proposed layout

```
src/decomp/
  files-dialog.js, store.js   (done)
  rom.js               readRomFile(file, { sha1, size }) -> bytes | null (byte order + SHA-1)
  engine.js            findEngine(key, devUrl, needs) / takeEngineFile(file): the find / check / keep part
  triangles.js         collision.js, with units and buffer passed in
  characters.js        registry: registerCharacter(def), characterById(id)
src/player/drive.js    driveBody(driver) / releaseBody(): see below
src/guest/             the guest's engine wrapper, model, ROM cut, play, the dino
src/features/decomp.js the eager glue: files flow, presence, remote drawing for every registered character
src/features/<npc>.js  each trigger NPC (the dino): an interactable that asks for a character by id
```

## The character contract

Kept small. Every member exists for the guest today:

```js
registerCharacter({
  id: 'guest',              // also the presence tag
  files,                    // what the dialog asks for: engine key + checks, ROM sha1 + cut(bytes) -> data
  load(data),               // async: engine, animations, textures (lazy import inside)
  start(body), stop(),      // become / stop being this character; start receives the body to drive
  step(input) -> { x, y, z, vx, vy, vz, yaw, grounded, swimming },  // one engine tick, world metres
  pose() -> number[],       // this player's pose for presence, quantised
  isPose(p),                // validates a remote pose
  drawPose(mesh, p), createMesh(),
  rate: 30,                 // ticks per second
});
```

Controls stay outside the contract: each character file registers its own actions from `onStart` (the guest's crouch
on LT, the punch row). A new character needs a free pad slot like any feature.

## Driving the player body

The guest's `preStep` listener flips the body to kinematic, interpolates it toward the engine's position at 30 Hz,
writes `me.coyote`, `me.swimming` and `me.yaw`, hides the avatar every frame, and guesses at teleports (the body is
more than 0.75 m from where it was sent). The Boogler's ride (`src/boogler/play.js`) also moves the body. A second
character would copy all of this.

`src/player/drive.js` would own it once: `driveBody({ rate, step })` takes over the body, calls `step` at `rate`, moves
the body there over the physics steps in between, and sets `me.*` from the result; `releaseBody()` gives it back with
the last velocity. Respawn and the caves' safety net call `teleportPlayer()` (or `drive.js` keeps the distance check)
so the driver hears about it. One driver at a time; the Boogler ride should check it.

## Presence

Today: key `mr`, a bare 24-number pose. For a second character use a new key, `dc`: `[characterId, ...pose]`, drawn
through `characterById`. That is a new key, so it is additive (AGENTS.md "Mixed builds"); send `mr` as well for a while
so older builds still draw the guest, then drop it.

## Steps (when the second character lands)

1. `src/decomp/rom.js` and `src/decomp/engine.js` out of `src/guest/`. Keep the store keys so saved files survive.
   Extend `test/guest-rom.test.mjs`.
2. `src/decomp/triangles.js` out of `src/guest/collision.js`.
3. `src/player/drive.js` out of `src/guest/play.js`; the guest becomes a `step` function.
4. Registry + `src/features/decomp.js`.
5. `dc` presence key alongside `mr`.
6. The new character.

Each step is testable only with an engine build and a ROM in the browser: run the guest through the lighthouse, the
caves and the sea, and with two players, before and after.

## Not in this plan

- Performance work in the guest's step (regathering collision only when the guest moves, building body triangles off
  the physics step, copying the mesh once per frame): worth doing, separately, measured with `npm run perf`.
