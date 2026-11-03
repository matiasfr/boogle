# 12. Doc and code mismatches found while writing this

Rechecked 2026-11-03 against the owning code:

- Every room uses `src/net/ws-room.ts`, called by `src/netplay/net.ts`; the server defaults to hosting all rooms and `server/fly.toml` sets `SERVER_ROOMS = "*"`. There is no PeerJS fallback.
- `src/` contains TypeScript, with no remaining `.js` source files. Stack versions live in `package.json`.
- PR CI runs `world-inputs`; `smoke` runs separately. AGENTS.md already describes this correctly and correctly names Space, E and R as the hand-bound keys.
- DESIGN.md no longer names weather in its authority table or promises elapsed-time growth in principle 9. The helper bank is the explicit offline-time system (`src/world/rules/bank.ts`).

The old PLAN version pin is historical, not a mismatch in current guidance. Current work is in [find-the-fun.md](../plans/find-the-fun.md); owner decisions are in [boogle-2.md](../proposals/boogle-2.md). Recipes and ownership pointers corrected in this pass are in [src/README.md](../../src/README.md), [world rules](../../src/world/rules/README.md), [island](../../src/island/README.md), [glossary](glossary.md) and [tech](tech.md).

This is a bounded recheck of the navigation audit's claims, not proof that every document matches the code.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
