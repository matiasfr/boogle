# 6.17 The dino and the guest

- **What.** A dino stands just outside the wine cellar's cave mouth on the north cliff, facing out along the trench
  ([src/guest/dino.ts](../../src/guest/dino.ts)). Talk to him (E, pad X) and you become the guest: a character with its
  own full move set and controller (run, long jump, backflip, ground pound, punch and kick, ledge grabs, swimming),
  run by the guest engine. Talk to him again to be yourself. A puff of sparks and a "Rawr!" mark each switch. The
  hands, hotbar and ball still work: a punch or kick that reaches the ball knocks it away (10 m/s, 14 for a kick).
- **Bring your own ROM.** The guest needs two files the game never ships or uploads: the guest engine
  (`engine.wasm`, built from [native/guest/](../../native/guest/README.md)) and the player's own ROM it is built for (8 MB,
  checked by SHA-1), from which the guest's animations and the textures are cut. The first talk fetches the owner's
  hosted engine quietly and opens a dialog asking for the ROM (and for the engine too, only if that fetch failed);
  drop, pick or paste a link to each file. This browser keeps both in IndexedDB. A local dev build can name the engine with
  `VITE_DINO_ENGINE_URL` instead. Without both files the feature stays dormant: the dino is built from primitives,
  breathes and hops when spoken to, and talking only opens the dialog.
- **How it plays.** While you are the guest, the engine runs at 30 Hz inside the physics step and your body turns
  kinematic and follows it, so the camera, interact targets, the ball and presence keep working. The engine collides
  with the terrain and every static body within 5 m, using the body's collision mask (so the caves work). Jump is
  Space or pad A; punch, kick and dive are click, pad D-pad → or pad X with nothing in reach, with empty hands (near the ball, click punches and E / pad X grab);
  crouch, ground pound, long jump and backflip use Shift or LT.
- **Sync kind.** Owner: presence `mr` carries your guest's pose (24 numbers). Other players with both files see your
  guest; without them they see your usual avatar.
- **Files.** [src/features/dino.ts](../../src/features/dino.ts) (eager: the dino, the files flow, controls, presence),
  [src/guest/](../../src/guest/) (lazy: `play.js`, `engine.js`, `model.js`, `collision.js`, `rom.js`), the shared
  [src/decomp/](../../src/decomp/) (files dialog, IndexedDB store), [native/guest/](../../native/guest/README.md).
- **Known issues.** Not yet tried with two players, on the lighthouse stair, in the caves, on a gamepad or on touch.
  The plan for more such characters is [plans/decomp-characters.md](../plans/decomp-characters.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
