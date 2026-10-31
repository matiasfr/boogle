# 6.3 Water sim

Removed 2026-10-30 ([plans/cleanup-dig-water-junk.md](../plans/cleanup-dig-water-junk.md)). The sea (a shader and the
`SEA` level) and the cave pond stay: swimming, buoyancy, ball floating, splashes and fish all read the surface through
[src/physics/water-field.js](../../src/physics/water-field.js) (`surfaceAt`, the sea, plus the cave pond at 3.0 m). The
`water` state key stays in `RULES` as a stub (loads any save, ignores the cells, hashes a constant), and the `slosh` op
is gone.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
