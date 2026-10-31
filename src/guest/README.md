# src/guest: working on the guest and the dino

For agents changing this feature or adding another character like it. The player-facing description is
[docs/game-design/dino-and-guest.md](../../docs/game-design/dino-and-guest.md). The plan for a second character is
[docs/plans/decomp-characters.md](../../docs/plans/decomp-characters.md).

## Rules that are not negotiable

- **Naming the character is fine.** Copy, docs, comments, commits and PRs may name the character, the games and
  Nintendo (an owner decision, after #63 wrongly scrubbed The Boogler's lines). The code uses neutral names ("the
  guest", "the dino") only because that is what it is called today; don't rename or reword anything to remove a
  reference. The one hard line is ROMs, below.
- **No ROM in the public repo.** Never commit ROM data or anything cut from it (any branch, `pr-shots` included), and
  so never bundle it into the build. Fetching a ROM from somewhere else may be allowed later; that is the owner's
  call. Today the player brings it through the files dialog.
- **The engine is the owner's hosted build.** It is never committed or bundled either, but the game fetches it
  (`ENGINE_URL` in `src/guest/engine.js`, an owner decision) the first time a player talks to the dino, and asks for it in the dialog only if that fails. This browser keeps both in IndexedDB.
  Before that first talk the feature requests nothing. The `dino` scenario checks this.
- **Only our glue in `native/guest/`.** Upstream code is compiled from a local checkout the build points at.
- **The Boogler's copy is the owner's.** The starstruck lines (`src/boogler/lines.js`, `talk.js`) name Mario on
  purpose. Don't reword them unless the owner asks.

## Map

| File | Loads | What it does |
| --- | --- | --- |
| `src/features/dino.js` | eager | The dino's interactable, the files flow, controls (`guest-crouch` on LT, `guest-punch` row, a `use` wrap), presence `mr`, drawing remote guests |
| `dino.js` | eager | The dino: the primitive model, the word bubble, and the swap to the engine's model (`showRealDino`) |
| `state.js` | eager | `guest`: `active`, `pose`, and B/Z presses shared by the eager and lazy halves |
| `engine.js` | eager (small) | Finds, checks and instantiates the engine (`findEngine`, `takeEngineFile`, `getSim`), defines the pose wire format |
| `rom.js` | eager | Checks the ROM (SHA-1, byte order) and cuts out the animations and textures (MIO0) |
| `textures.js` | eager | Where each texture sits in the ROM, in atlas order |
| `play.js` | lazy | Being the guest: the engine at 30 Hz in `preStep`, the kinematic body follow, input, ball hits, remote guests |
| `model.js` | lazy | Meshes from the engine's vertex buffer, with the atlas and the combiner shader |
| `collision.js` | lazy | Terrain and static bodies as triangles around the guest, for the engine |
| `../decomp/` | eager | Shared by any such character: `files-dialog.js`, `store.js` |
| `native/guest/` | build only | The C glue and `build.mjs`; see its README |

## Set up locally

1. Get an engine. Either build one (`GUEST_DECOMP=/path/to/checkout node native/guest/build.mjs`, see
   `native/guest/README.md`) or ask the owner for a local build. It goes in `native/guest/out/engine.wasm`, which git
   ignores. Its exports must be the `guest_*` names `engine.js` lists in `NEEDS`, because a build from before the
   rename is refused.
2. Get the ROM from the owner. Its SHA-1 must equal `ROM_SHA1` in `rom.js`. Never copy it into the repo.
3. Run the `dev-guest` launch config, or `VITE_DINO_ENGINE_URL=/native/guest/out/engine.wasm npm run dev`, so the
   engine loads without the dialog. Then talk to the dino and drop the ROM in.

## Test

- `npm run check` (lint, unit tests including `test/guest-rom.test.mjs`, build).
- `npm run scenario -- dino`: the dormant path, with no files. It runs in CI.
- `GUEST_ROM=/path/to/rom.z64 npm run scenario -- guest-play`: the real path. It gives both files through the picker,
  becomes the guest, runs, jumps, switches back and reloads. It is skipped without `GUEST_ROM`, so CI never runs it.
  Run it locally after any change to `play.js`, `engine.js`, `model.js`, `collision.js` or the glue, and look at its
  stills in `.look/scenarios/guest-play/`.
- Not covered yet: two players, the lighthouse stair, inside the caves, gamepad and touch. Add scenario checks rather
  than ad-hoc scripts.

## Changing things safely

- **The engine's interface.** `engine.js` reads the structs in `native/guest/include/shim.h` by offset (`STATE_LEN`,
  `POSE_LEN`) and calls the `guest_*` exports. Change both sides together, rebuild, and add any new required export to
  `NEEDS`.
- **The pose (`mr`).** It is a wire format, so other builds read it. Keep its shape, or add a new presence key
  (AGENTS.md "Mixed builds"). `isPose` and `quantisePose` are the only places that know the layout.
- **The texture table.** `textures.js` and `TEXTURE_FILES` in `build.mjs` must stay in the same order. The build
  throws if their lengths differ.
- **Saved files.** IndexedDB `boogle-decomp` / `files`, keys `guest-engine` and `guest-rom`. If the cut ROM data
  changes shape, use a new key so old saves are asked for again rather than misread.
- **Player internals.** `play.js` writes `me.coyote`, `me.swimming`, `me.yaw`, `me.jumpQueued`, the body's type and
  mass, and hides the avatar. Keep those writes in `play.js`; a second character should use the shared body driver from
  the plan, not a copy.
- **Lazy parts.** Anything heavy (three.js meshes, the engine instance, per-tick work) stays behind the `import()` in
  `features/dino.js`.
- **Controls.** These go through `registerAction` and `wrapAction`. At least one pad slot must stay free
  (`grep -rn "pad: '" src`).
