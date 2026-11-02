# 6.6 Hotbar and items

- **What and how it plays.** Five slots; whatever is selected is drawn in your hand and everyone sees it. New players
  start empty-handed. Pick-ups go into a free slot; the ball takes a slot while you
  hold it and leaves when ownership does. Using what you hold: a bag of seeds sprouts mushrooms, anything
  else winds up a throw. A full hotbar greys the prompt ("Hotbar full").
- **Controls.** 1-5 (same key again for empty hands), pad LB / RB, tap a slot; use (click / pad RT); Toss on touch.
- **Sync kind.** Local for the contents (localStorage `boogle.hotbar`); Owner for what is in your hand (presence `hd`,
  a catalog index or −1). Items cross into the world only through `gift.take` and `gift.toss`.
- **On touch.** Only filled slots show; in portrait they make a column on the right. Toss appears only when the main
  button would do something other than throw.
- **Files.** [src/player/inventory.ts](../../src/player/inventory.ts), [src/player/hands.ts](../../src/player/hands.ts), [src/features/hotbar.ts](../../src/features/hotbar.ts),
  [src/player/item-models.ts](../../src/player/item-models.ts), [src/player/item-icons.ts](../../src/player/item-icons.ts), [src/features/prompt.ts](../../src/features/prompt.ts),
  [src/sim/interact-pick.ts](../../src/sim/interact-pick.ts).
- **Feedback.** A select ticks (one soft tone) and the slot bounces; a note ("Hotbar full") goes to the shared
  notification lane above the hotbar; the prompt pops in, squashes on a press and shakes on a refusal: [hud.md](hud.md).
- **The interact pick.** Every provider (ball, gifts and palms, stall, Boogler) lists targets in reach each frame;
  something that would act beats something blocked, then the nearest wins with a nudge toward where you look.
- **Known issues and limits.** One `boogle.hotbar` key for every room: you are global, the world is per room. Every item is listed in 7.1.
- **Prototype: one thing in your hands** (`?proto=onehand`, [src/proto/onehand/](../../src/proto/onehand/index.ts), its own room). No slots on screen, and LB, RB and 1-5 do nothing; the held thing's name and button still fade in. Picking something up replaces what you hold, which lands a step ahead through the usual toss (`gift.toss`, or the ball's throw). The Boogler is offered what's in your hand, as always. Your saved hotbar sits it out and comes back on the normal game. No new state or wire change.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
