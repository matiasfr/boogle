# 11. Glossary

| Term | Meaning |
|---|---|
| Adapter | The render and input side of a lockstep system; reacts through `onApplied`, `onAfterTick`, `onSnapshot`. |
| Cell | One 1.25 m square of the world grid, `(i, j)` at x = i × 1.25 − 255, z = 255 − j × 1.25. |
| Edit | A small op (`gift.toss`, `pile.take` ...) a client submits; the host stamps and broadcasts it. |
| Epoch | The ball ownership counter; the highest claim wins. |
| Host | The server that runs the lockstep world, stamps edits and saves snapshots for every room. |
| Host field | Host-kind state published in the lead's presence (`addHostField`). |
| Lead | The tab the server picks to run Host-kind fields (the Boogler); it does not host the lockstep world. |
| Key item | A catalog item the Boogler refuses (ball). |
| Local / Owner / Host / Lockstep | The four sync kinds (DESIGN.md). |
| Perch | A spot that always gets its item back (the frisbee on the lighthouse deck). |
| POI | Point of interest: a folder in `src/pois/` with a site and content. |
| Presence | Each player's small JSON state, sent 20 times a second, latest wins. |
| Room transport | `src/net/ws-room.ts`: joins a server-hosted room over WebSocket; reconnects after disconnection. Game presence and peer lifecycle live in `src/netplay/net.ts`. |
| Rules module | The lockstep half of a system in `src/world/rules/`. |
| Snapshot | The serialized world (every registered state, tick, seed, versions), for joiners and saves. |
| Stamp | A terrain shape a POI applies to the ground. |
| Tick | 100 ms of lockstep time. |
| Wary | The Boogler's state after 3 unforgiven launches: he runs from you. |

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
