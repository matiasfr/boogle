# 6.6 Hotbar and items

- **What and how it plays.** Eight slots; whatever is selected is drawn in your hand and everyone sees it. New players
  start empty-handed. Pick-ups go into a free slot (seeds stack to 20); the ball takes a slot while you
  hold it and leaves when ownership does. Using what you hold: the can waters, seeds plant, anything
  else winds up a throw. A full hotbar greys the prompt ("Hotbar full").
- **Controls.** 1-8 (same key again for empty hands), pad LB / RB, tap a slot; use (click / X); Toss on touch.
- **Sync kind.** Local for the contents (localStorage `boogle.hotbar`); Owner for what is in your hand (presence `hd`,
  a catalog index or −1). Items cross into the world only through `gift.take` and `gift.toss`.
- **On touch.** Only filled slots show; in portrait they make a column on the right. Toss appears only when the main
  button would do something other than throw.
- **Files.** [src/player/inventory.js](../../src/player/inventory.js), [src/player/hands.js](../../src/player/hands.js), [src/features/hotbar.js](../../src/features/hotbar.js),
  [src/player/item-models.js](../../src/player/item-models.js), [src/player/item-icons.js](../../src/player/item-icons.js), [src/features/prompt.js](../../src/features/prompt.js),
  [src/sim/interact-pick.ts](../../src/sim/interact-pick.ts).
- **The interact pick.** Every provider (ball, gifts and palms, stall, Boogler) lists targets in reach each frame;
  something that would act beats something blocked, then the nearest wins with a nudge toward where you look.
- **Known issues and limits.** The hotbar is not per room (one `boogle.hotbar` key for every room), unlike the Boogler
  friendship. An old `boogle.pocket` save migrates once. Every item is listed in 7.1.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
