# 6.14 First-run card

- **What.** The first time you play with each input kind (keyboard, pad, touch) a small paper card lists the basics
  (groups move, camera, ball, hands, from the registry) and points at the menu. Only its close button takes clicks; it
  leaves after 3 s of walking, 15 s, a click on the close button, or when the menu opens. It sits at the lower left (above
  the hotbar on screens under 1180 px wide; mid-left on touch). On short screens (under 520 px tall) and upright phones
  it drops the hands group and sits higher, clear of the held-item buttons.
- **Sync kind.** Local (localStorage `boogle.firstRun.<kind>`).
- **Files.** [src/features/first-run.js](../../src/features/first-run.js).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
