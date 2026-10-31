# 6.4 Mushrooms and the stall

- **What and how it plays.** Take seeds and a watering can from the stall. Use seeds to plant one in front of you on
  dry, open ground (the patch or anywhere else); use the can to water the nearest buried seed in reach. A watered seed
  grows into a big flat-topped mushroom that bounces players and the ball, and shoves you out from under it as it grows.
  A thrown seed plants itself where it lands. The Boogler likes seeds as a present.
- **Controls.** E / pad B "Take" at the stall; click / pad X with seeds (Plant) or can (Water).
- **Sync kind.** Lockstep. Ops `mush.plant`, `mush.water`; state `mushrooms` (`[i, j, g]` per plot). The host's
  render-side spot check (no water, rock, tree or cap) is passed in through `setEnv` as `env.canPlantAt`.
- **Tuning.** Growth 120 ticks (12 s) after watering; a dry seed waits forever. At most 60 plots, at least 3 cells
  apart (Chebyshev). 5 seeds per take, stack of 20. Cap radius 1.9 m, stem 0.85 m. Player bounce 15 × (0.55 + 0.45 ×
  growth) m/s; growth push at least 5.5 m/s. Pour animation 600 ms. A second seed waits 500 ms for the first to land.
- **Files.** [src/sim/mushrooms.js](../../src/sim/mushrooms.js), [src/world/rules/mushrooms.js](../../src/world/rules/mushrooms.js),
  [src/adapters/mushroom-garden.js](../../src/adapters/mushroom-garden.js), [src/features/mushroom-garden.js](../../src/features/mushroom-garden.js).
- **Known issues and limits.** Watering is only by can (not sim water or the ball). Growth counts ticks, which only run
  while someone is online, so nothing grows while the island is empty (see 8.7). Mushrooms never wilt or get
  harvested. The rest of Phase 5 (soil, crops, visitor bonus) is on hold.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
