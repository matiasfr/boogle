# 12. Doc and code mismatches found while writing this

Still open:

- PLAN Phase 0 says three.js 0.160.0 is pinned; `package.json` has 0.187. The peer-room header cites peerjs 1.5.4;
  the package has 1.5.5.
- DESIGN.md's authority table names "weather", which does not exist yet.
- DESIGN principle 9 and `src/world/README.md` mention offline growth through `world.epochMs`; nothing reads it.
- The hotbar is global while the Boogler friendship is per room; nothing documents whether that is intended.

Fixed since: the spring API and `dev/water-lab/` are gone (#31), frame logic left `main.js` (#29); the lighthouse
header, DESIGN's Lockstep examples, PLAN Phase 4's slosh and worker items and the tech plan's legacy-code line now match
the code.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
