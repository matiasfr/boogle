# 6.14 First-run card

- **What.** The first time you play with each input kind (keyboard, pad, touch) a small paper card lists the basics
  (groups move, camera, ball, hands, from the registry) and points at the menu. Only its close button takes clicks; it
  leaves after 3 s of walking, 15 s, a click on the close button, or when the menu opens. It sits at the lower left (above
  the hotbar on screens under 1180 px wide; mid-left on touch). On short screens (under 520 px tall) and upright phones
  it drops the hands group and sits higher, clear of the held-item buttons.
- **Prototype.** `?proto=arrive` ([src/proto/arrive/](../../src/proto/arrive/index.ts); wordless-onboarding recs 1, 2,
  3, 8) skips the lobby (a friendly random name, your colour; change both on the pause view's Room page), lands you
  south of the court at (12.6, 31) facing up the line (court, open work site and lighthouse in one view) with the ball
  rolled toward you at 2.6 m/s, and shows this card on every visit with only Getting around and Camera, gone after
  0.8 s of walking. It times page open to in the world, first input, first move, first ball touch and first logs on
  the prototype bar. `&v=lobby` is today's flow, timed.
- **Sync kind.** Local (localStorage `boogle.firstRun.<kind>`).
- **Files.** [src/features/first-run.ts](../../src/features/first-run.ts).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
