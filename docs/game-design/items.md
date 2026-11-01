# 7.1 Items (gift catalog)

From [src/sim/gift-catalog.ts](../../src/sim/gift-catalog.ts), in catalog order. The index is on the wire (`gifts` items,
`gift.toss`, presence `hd`): it is renumbered only with a `WORLD_NS` bump (the last one was v02). Points are the
friendship value of a first present.

| # | Id | Name | Source | Weight (chance) | Boogler taste | Points |
|---|---|---|---|---|---|---|
| 0 | seeds | mushroom seed | stall | | like | 7 |
| 1 | can | watering can | stall | | meh | 3 |
| 2 | frisbee | frisbee | perch (lighthouse deck) | | like | 7 |
| 3 | ball | beach ball | ball (key: refused) | | meh | n/a |

Every item has a line he says when you hand it over (or why he refuses it).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
