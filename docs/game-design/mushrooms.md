# 6.4 Mushrooms and the seed stand

- **What and how it plays.** Take a bag of seeds at the stand (one at a time). Use it: five big flat-topped mushrooms
  pop up in a loose zig-zag ahead of you, on whatever spots are dry and open, and the bag is spent. They bounce players
  and the ball, and wilt away after 20 s. Where nothing can grow it says so and you keep the bag. A bag can also be
  thrown like anything else, or given to The Boogler, who likes it. Mushrooms are a toy: nothing is gated on them.
- **Controls.** E / pad X "Take" at the stand; click / pad X (nothing in reach) / D-pad → "Sprout" with the bag in hand.
- **Sync kind.** Local, started by a one-off message `{ t: 'mush', s: [x, z, ...] }` (validated; you can send one a second, and tabs accept one per 0.8 s per
  sender): each tab draws its own mushrooms and colliders. Nothing is saved; someone joining after the message misses
  that cluster, and it is gone in 20 s anyway. A mushroom's collider waits until you are not standing in it.
- **Tuning.** Life 20 s, pop 0.5 s, wilt 0.6 s. At most 40 alive on a tab (the oldest goes first). Spots in metres
  [right, ahead] of you: (0, 4.5), (−4.5, 8), (4, 9.5), (−2, 13.5), (3, 16.5), each jittered ±0.4. Cap radius 1.9 m,
  stem 0.85 m. Player bounce 15 m/s.
- **Files.** [src/adapters/mushrooms.ts](../../src/adapters/mushrooms.ts), [src/features/mushrooms.ts](../../src/features/mushrooms.ts).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
