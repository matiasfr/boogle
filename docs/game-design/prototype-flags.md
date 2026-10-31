# 6.16 Prototype flags

Removed 2026-10-31. The features they gated (controller feel, fish, gulls, fireflies, blob shadows) are always on, and
`?proto=` / `?off=` do nothing. The `proto` state key stays in `RULES` as a stub with no ops
([src/world/rules/proto.js](../../src/world/rules/proto.js)): it keeps any bitmask a save or an older host sends and
hashes it as older builds do, so mixed-build rooms agree; nothing reads it.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
