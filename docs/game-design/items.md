# 7.1 Items (gift catalog)

From [src/sim/gift-catalog.ts](../../src/sim/gift-catalog.ts), in catalog order. The index is on the wire (`gifts` items,
`gift.toss`, presence `hd`): it is renumbered only with a `WORLD_NS` bump (the last one was v02). His taste determines
his reaction; presents have no progression score.

| # | Id | Name | Source | Weight (chance) | Boogler taste |
|---|---|---|---|---|---|
| 0 | seeds | bag of mushroom seeds (catalog name: mushroom seed) | stand | | like |
| 1 | frisbee | frisbee | perch (lighthouse deck) | | like |
| 2 | ball | beach ball | ball (key: refused) | | meh |

Every item has a line he says when you hand it over (or why he refuses it).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
