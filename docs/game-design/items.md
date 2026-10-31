# 7.1 Items (gift catalog)

From [src/sim/gift-catalog.js](../../src/sim/gift-catalog.js), in catalog order (the index is the wire id: append only).
Source `sea` items (5 to 21) used to wash up on the beach. Wash-ups went 2026-10-30, and the 17 seashore finds were
retired 2026-10-31: each is a bare stub (`id`, `src`, `retired`) kept for its index, with no model, name or line;
saved hotbars drop them and nobody can throw them. Points are the friendship value of a first present.

| # | Id | Name | Source | Weight (chance) | Boogler taste | Points |
|---|---|---|---|---|---|---|
| 0 | coconut | coconut | tree (3 of 7 palms' cycle slots) | | meh | 3 |
| 1 | mango | mango | tree | | like | 7 |
| 2 | banana | banana | tree | | like | 7 |
| 3 | pomegranate | pomegranate | tree | | love | 12 |
| 4 | apricot | apricot | tree | | love | 12 |
| 5 | shell | (retired) | sea (retired 2026-10-31) | | | n/a |
| 6 | starfish | (retired) | sea (retired 2026-10-31) | | | n/a |
| 7 | driftwood | (retired) | sea (retired 2026-10-31) | | | n/a |
| 8 | seaweed | (retired) | sea (retired 2026-10-31) | | | n/a |
| 9 | flipflop | (retired) | sea (retired 2026-10-31) | | | n/a |
| 10 | boot | (retired) | sea (retired 2026-10-31) | | | n/a |
| 11 | duck | (retired) | sea (retired 2026-10-31) | | | n/a |
| 12 | sunglasses | (retired) | sea (retired 2026-10-31) | | | n/a |
| 13 | sponge | (retired) | sea (retired 2026-10-31) | | | n/a |
| 14 | float | (retired) | sea (retired 2026-10-31) | | | n/a |
| 15 | bottle | (retired) | sea (retired 2026-10-31) | | | n/a |
| 16 | card | (retired) | sea (retired 2026-10-31) | | | n/a |
| 17 | melon | (retired) | sea (retired 2026-10-31) | | | n/a |
| 18 | teacup | (retired) | sea (retired 2026-10-31) | | | n/a |
| 19 | book | (retired) | sea (retired 2026-10-31) | | | n/a |
| 20 | abacus | (retired) | sea (retired 2026-10-31) | | | n/a |
| 21 | doppi | (retired) | sea (retired 2026-10-31) | | | n/a |
| 22 | seeds | mushroom seed | stall | | like | 7 |
| 23 | can | watering can | stall | | meh | 3 |
| 24 | shovel | shovel | tool (retired 2026-10-30: not obtainable, dropped from saved hotbars) | | meh | n/a |
| 25 | frisbee | frisbee | perch (lighthouse deck) | | like | 7 |
| 26 | ball | beach ball | ball (key: refused) | | meh | n/a |

Every live item has a line he says when you hand it over (or why he refuses it).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
