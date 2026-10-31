# 6.13 Pause view and controls guide

- **What.** A local overlay (the island keeps running) with Resume, Controls (the generated guide with Keyboard,
  Gamepad and Touch tabs, starting on your input kind), Room (who is here and an invite link; `?room=` is left out for
  the default room) and Leave (press twice within 3 s; it reloads the page). The title is the room id. It opens on Esc
  (when the pointer lock ends), H (on the Controls page), pad Menu and the corner menu button.
- **Sync kind.** Local, through [src/player/modal.js](../../src/player/modal.js) (one modal at a time; it takes keys and pad).
- **Files.** [src/features/pause.js](../../src/features/pause.js), [src/player/guide.js](../../src/player/guide.js),
  [src/player/glyphs.js](../../src/player/glyphs.js), [src/player/controls.js](../../src/player/controls.js).
- **Related research.** [research/controls-guide-and-pause-menu.md](../research/controls-guide-and-pause-menu.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
