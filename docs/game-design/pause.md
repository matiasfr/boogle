# 6.13 Pause view and controls guide

- **What.** A local overlay (the island keeps running) with Resume, Controls (the generated guide with Keyboard,
  Gamepad and Touch tabs, starting on your input kind; the Gamepad tab is a drawn controller with labelled callouts,
  see [controls.md](controls.md), with Show as a list for the old list), Room (who is here and an invite link; `?room=` is left out for
  the default room), Fullscreen (toggles the whole page, so the HUD stays; it reads Exit fullscreen while on, and is
  hidden where the page can't go fullscreen, such as iPhone Safari or a frame without it, and in the installed app,
  which is already fullscreen; a gamepad press is refused by the browser, so the button asks for a click or tap; on
  iPad the first press explains that Safari's fullscreen there turns off the keyboard's letter keys (WebKit grants
  iPad fullscreen without keyboard access: only Space, the arrows, Tab, Enter and the modifiers reach the page, so
  W A S D, E, R, H, the digits and Esc go dead) and a controller's shoulder buttons and triggers (WebKit bug 311151),
  and suggests Add to Home Screen; the button then reads Fullscreen anyway (touch only)) and
  Leave (press twice within 3 s; it reloads the page). The title is the room id. It opens on Esc (when the pointer
  lock ends), H (on the Controls page), pad Menu and the corner menu button. Behind `?proto=arrive` (no lobby) the
  Room page also has a You section: a name box and the colour swatches, saved as you type or tap.
- **Sync kind.** Local, through [src/player/modal.ts](../../src/player/modal.ts) (one modal at a time; it takes keys and pad).
- **Files.** [src/features/pause.ts](../../src/features/pause.ts), [src/player/guide.ts](../../src/player/guide.ts),
  [src/player/pad-diagram.ts](../../src/player/pad-diagram.ts),
  [src/player/glyphs.ts](../../src/player/glyphs.ts), [src/player/controls.ts](../../src/player/controls.ts).
- **Related research.** [research/controls-guide-and-pause-menu.md](../research/controls-guide-and-pause-menu.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
