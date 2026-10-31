# 6.16 Prototype flags

Room-wide toggles for experimental features: `feel`, `fish`, `gulls`, `fireflies`, `shadows`, all on by default.
`?proto=0` turns all off, `?off=feel,gulls` turns some off. The host's URL wins: the bitmask is the Lockstep state
`proto` (no ops), adopted by joiners with the snapshot. Files: [src/sim/proto.js](../../src/sim/proto.js),
[src/world/rules/proto.js](../../src/world/rules/proto.js), [src/adapters/proto-flags.js](../../src/adapters/proto-flags.js).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
