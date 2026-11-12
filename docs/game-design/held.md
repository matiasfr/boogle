# 6.6 What you hold

- **What and how it plays.** One thing in your hands, or nothing; it is drawn in your hand and everyone sees it. New
  visits start empty-handed: what you hold isn't saved. Picking something up replaces what you hold, which lands a step
  or two ahead through the usual toss (`gift.toss`, or the ball's own throw), in reach to swap back. The ball is in your
  hand while you own it and leaves when ownership does. Using what you hold: a bag of seeds sprouts mushrooms, anything
  else winds up a throw. Winding up a throw, you pick up nothing: an item already on its way goes back on the ground.
  The live game (the production railway room) offers no throw until replication R3 makes island throwing work, since
  its server refuses `gift.toss` (owner, 9 November, [decisions.md](../decisions.md)): there the click and RT wind up
  nothing, and neither the name tag, the touch main button nor Toss says Throw, the ball included.
- **Controls.** E / pad X picks up; use (click / pad RT); Toss on touch. No keys or buttons to change what you hold: no
  1-5, LB or RB (the owner cut the hotbar, 2 November: [decisions.md](../decisions.md)).
- **Sync kind.** Local for what you hold; Owner for what others see (presence `hd`, a catalog index or −1). Items cross
  into the world only through `gift.take` and `gift.toss`.
- **On screen.** No slots. The held thing's name and what its button does fade in for 2.4 s when it changes, at the
  bottom centre; on touch, name only, at the top (top right in portrait). Toss appears only when the main button would
  do something other than throw.
- **Files.** [src/player/inventory.ts](../../src/player/inventory.ts), [src/player/hands.ts](../../src/player/hands.ts), [src/features/held.ts](../../src/features/held.ts),
  [src/player/item-models.ts](../../src/player/item-models.ts), [src/player/item-icons.ts](../../src/player/item-icons.ts) (The Boogler's gift answer), [src/features/prompt.ts](../../src/features/prompt.ts),
  [src/sim/interact-pick.ts](../../src/sim/interact-pick.ts).
- **Feedback.** Something new in your hand ticks (one soft tone) and the tag bounces; a note ("Can't grow here") goes to
  the shared notification lane where the tag is; the prompt pops in, squashes on a press and shakes on a refusal:
  [hud.md](hud.md).
- **The interact pick.** Every provider (ball, gifts and palms, stall, Boogler) lists targets in reach each frame;
  something that would act beats something blocked, then the nearest wins with a nudge toward where you look.
- **Known issues and limits.** A toss that can't be sent (the room down long enough to fill its queue of held edits)
  loses what it pushed out. Every item is listed in 7.1.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
