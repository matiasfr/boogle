# 12. Doc and code mismatches found while writing this

Still open:

- PLAN Phase 0 says three.js 0.160.0 is pinned; `package.json` has 0.187.
- DESIGN.md's authority table names "weather", which does not exist yet.
- DESIGN principle 9 says growth is computed from elapsed time; only the helper bank reads `world.epochMs` (as
  `src/world/README.md` now says), and mushrooms, fruit and the day count ticks.
- DESIGN.md's "Server hosts every room" describes [plans/server-host.md](../plans/server-host.md) step 9, which is not
  built: the code still has peer-hosted rooms, host migration and the fallback (`src/net/room.ts`), the server hosts
  only the rooms in `SERVER_ROOMS`, and `server/fly.toml` sets none. AGENTS.md's first paragraph ("PeerJS with one
  browser as host") is closer to today.
- DESIGN.md's "Small and readable" says everything is TypeScript; 103 files in `src/` are still `.js` (59 are `.ts`).
- AGENTS.md and CLAUDE.md say PR CI runs `world-inputs`, `smoke` and `two-player-dig`; `ci.yml` runs only
  `world-inputs`, and there is no `two-player-dig` scenario. AGENTS.md also lists F, Q and Z as keys `input.ts` binds
  by hand; it binds Space, E and R.

Fixed since: the Boogler friendship is now global, like the hotbar; `src/world/README.md` now says what reads `world.epochMs`; the spring API and `dev/water-lab/` are gone (#31), frame logic left `main.ts` (#29); the lighthouse
header, DESIGN's Lockstep examples, PLAN Phase 4's slosh and worker items and the tech plan's legacy-code line now match
the code.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
