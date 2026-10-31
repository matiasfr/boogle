# 6.2 Sand digging and the shovel

Removed 2026-10-30 ([plans/cleanup-dig-water-junk.md](../plans/cleanup-dig-water-junk.md)). The ground is fixed. The
`terrain` stub state that stood in for it was retired with the 0.1 namespace (2026-10-31), when `RULES` restarted
([src/world/rules/index.ts](../../src/world/rules/index.ts)). `GIFTS[24]` (the shovel) stays in the catalog as
`retired` so item indices do not shift.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
