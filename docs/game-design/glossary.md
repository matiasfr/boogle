# 11. Glossary

| Term | Meaning |
|---|---|
| Adapter | The render and input side of a lockstep system; reacts through `onApplied`, `onAfterTick`, `onSnapshot`. |
| Cell | One 1.25 m square of the world grid, `(i, j)` at x = i × 1.25 − 255, z = 255 − j × 1.25. |
| Edit | A small op (`mush.plant`, `gift.toss` ...) a client submits; the host stamps and broadcasts it. |
| Epoch | The ball ownership counter; the highest claim wins. |
| Host | The browser holding `boogle-<room>-host`; authority for lockstep stamping, the Boogler and server saves. |
| HOME | The −80..80 m square where wash-ups exist. `HOME_KEEP` (22 m) is the untouched core. |
| Host field | Host-kind state published in the host's presence (`addHostField`). |
| Key item | A catalog item the Boogler refuses (ball). |
| Local / Owner / Host / Lockstep | The four sync kinds (DESIGN.md). |
| Perch | A spot that always gets its item back (the frisbee on the lighthouse deck). |
| POI | Point of interest: a folder in `src/pois/` with a site and content. |
| Presence | Each player's small JSON state, sent 20 times a second, latest wins. |
| Proto flag | A room-wide toggle for an experimental feature. |
| Rules module | The lockstep half of a system in `src/world/rules/`. |
| Snapshot | The serialized world (every registered state, tick, seed, versions), for joiners and saves. |
| Stamp | A terrain shape a POI applies to the ground. |
| Tick | 100 ms of lockstep time. |
| Wary | The Boogler's state after 3 unforgiven launches: he runs from you. |

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
