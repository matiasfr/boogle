# 6.3 Water sim

Removed 2026-10-30 ([plans/cleanup-dig-water-junk.md](../plans/cleanup-dig-water-junk.md)). The sea (a shader and the
`SEA` level) and the cave pond stay: swimming, buoyancy, ball floating, splashes and fish all read the surface through
[src/physics/water-field.js](../../src/physics/water-field.js) (`surfaceAt`, the sea, plus the cave pond at 3.0 m). The `slosh`
op is gone, and the `water` stub state that stood in for the sim was retired with the 0.1 namespace (2026-10-31), when
`RULES` restarted ([src/world/rules/index.ts](../../src/world/rules/index.ts)).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
