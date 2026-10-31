# 11. Glossary

| Term | Meaning |
|---|---|
| Adapter | The render and input side of a lockstep system; reacts through `onApplied`, `onAfterTick`, `onSnapshot`. |
| Cell | One 1.25 m square of the world grid, `(i, j)` at x = i × 1.25 − 255, z = 255 − j × 1.25. |
| Edit | A small op (`mush.plant`, `gift.toss`, `pile.take` ...) a client submits; the host stamps and broadcasts it. |
| Epoch | The ball ownership counter; the highest claim wins. |
| Host | The lockstep authority that stamps edits: our server for a room it hosts, otherwise the browser holding `boogle-<room>-host`, which also saves to the server. |
| HOME | The −80..80 m square (`HOME` in `grid.ts`) where wash-ups used to be. `HOME_KEEP` (22 m) is the untouched core. |
| Host field | Host-kind state published in the lead's presence (`addHostField`). |
| Lead | The tab that runs Host-kind fields (the Boogler): the host on a peer room, the tab the server picks on a server-hosted one. |
| Key item | A catalog item the Boogler refuses (ball). |
| Local / Owner / Host / Lockstep | The four sync kinds (DESIGN.md). |
| Perch | A spot that always gets its item back (the frisbee on the lighthouse deck). |
| POI | Point of interest: a folder in `src/pois/` with a site and content. |
| Presence | Each player's small JSON state, sent 20 times a second, latest wins. |
| Room picker | `src/net/room.ts`: joins the server's room, a peer room or the fallback, and moves between them. |
| Rules module | The lockstep half of a system in `src/world/rules/`. |
| Snapshot | The serialized world (every registered state, tick, seed, versions), for joiners and saves. |
| Stamp | A terrain shape a POI applies to the ground. |
| Tick | 100 ms of lockstep time. |
| Wary | The Boogler's state after 3 unforgiven launches: he runs from you. |

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
