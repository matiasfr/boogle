# 7.1 Items (gift catalog)

From [src/sim/gift-catalog.js](../../src/sim/gift-catalog.js), in catalog order (the index is the wire id: append only).
Source `sea` items used to wash up on the beach (retired 2026-10-30: they no longer appear, but held ones can still be given and thrown). Points are the friendship value of a first present.

| # | Id | Name | Source | Weight (chance) | Boogler taste | Points |
|---|---|---|---|---|---|---|
| 0 | coconut | coconut | tree (3 of 7 palms' cycle slots) | | meh | 3 |
| 1 | mango | mango | tree | | like | 7 |
| 2 | banana | banana | tree | | like | 7 |
| 3 | pomegranate | pomegranate | tree | | love | 12 |
| 4 | apricot | apricot | tree | | love | 12 |
| 5 | shell | seashell | sea (retired: no longer washes up) | | like | 7 |
| 6 | starfish | starfish | sea (retired: no longer washes up) | | like | 7 |
| 7 | driftwood | piece of driftwood | sea (retired: no longer washes up) | | meh | 3 |
| 8 | seaweed | clump of seaweed | sea (retired: no longer washes up) | | dislike | −3 |
| 9 | flipflop | flip-flop | sea (retired: no longer washes up) | | meh | 3 |
| 10 | boot | old boot | sea (retired: no longer washes up) | | dislike | −3 |
| 11 | duck | rubber duck | sea (retired: no longer washes up) | | like | 7 |
| 12 | sunglasses | pair of sunglasses | sea (retired: no longer washes up) | | like | 7 |
| 13 | sponge | sea sponge | sea (retired: no longer washes up) | | meh | 3 |
| 14 | float | glass float | sea (retired: no longer washes up) | | like | 7 |
| 15 | bottle | message in a bottle | sea (retired: no longer washes up) | | like | 7 |
| 16 | card | soggy business card | sea (retired: no longer washes up) | | like | 7 |
| 17 | melon | melon | sea (retired: no longer washes up) | | love | 12 |
| 18 | teacup | tea bowl (piyola) | sea (retired: no longer washes up) | | love | 12 |
| 19 | book | waterlogged book ("Business for Beginners") | sea (retired: no longer washes up) | | love | 12 |
| 20 | abacus | little abacus (cho't) | sea (retired: no longer washes up) | | love | 12 |
| 21 | doppi | embroidered cap (doppi) | sea (retired: no longer washes up) | | love, bonus 10 | 22 |
| 22 | seeds | mushroom seed | stall | | like | 7 |
| 23 | can | watering can | stall | | meh | 3 |
| 24 | shovel | shovel | tool (retired 2026-10-30: not obtainable, dropped from saved hotbars) | | meh | n/a |
| 25 | frisbee | frisbee | perch (lighthouse deck) | | like | 7 |
| 26 | ball | beach ball | ball (key: refused) | | meh | n/a |

Every item has a line he says when you hand it over (or why he refuses it).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
