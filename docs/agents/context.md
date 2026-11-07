# Boogle: agent instructions

Project context for design decisions, new mechanics and prototype work. Boogle is a multiplayer browser game: three.js (`WebGPURenderer`, shaders in TSL) + Rapier (WASM physics, through `src/physics/engine.ts`), Vite; our server (`server/`) hosts every room over WebSocket and runs its lockstep world. Friends and their agents ship at once through self-merging PRs; `main` auto-deploys to https://boogle.club/.

For those tasks read [DESIGN.md](../../DESIGN.md) (principles; every feature names the one it serves, and asks before bending one) and [docs/plans/find-the-fun.md](../plans/find-the-fun.md) (relevant sections for the proposed mechanic or prototype; tick a box in the commit that finishes it). PLAN.md, SETTLED.md, the vertical slice and older proposals are historical: they bind no one. [src/README.md](../../src/README.md) maps the folders. [docs/game-design.md](../game-design.md) describes the game as built: a change that adds, changes or removes something a player can see or do (a system, control, item, tuning number, place) updates its file in `docs/game-design/` in the same commit (a new system adds a file and a line in the index); refactors and tooling don't.

[docs/proposals/boogle-2.md](../proposals/boogle-2.md) is the owner's decision log for where the game is heading: read its current-decision index, then only the routed topics by heading or line range when making those decisions (nothing in it is built unless `docs/game-design.md` says so).

[docs/ideas.md](../ideas.md) is a parking lot, not a task list: never implement from it unless asked; you may append an idea you notice but won't act on.

## Principle index

Commit bodies name the principle served. Names are listed here so a tuning fix, review or tooling change need not read the design corpus. Read a principle's section when deciding how it applies; design decisions, new mechanics and prototypes require DESIGN.md.

- 1. Toys before chores
- 2. Physics toys are optional fun
- 3. Side activities are never required
- 4. Cooperation is automatic, not negotiated
- 6. Communal world, personal things
- 7. Telegraph everything
- 8. Designed for drop-in, drop-out
- 9. Leave something for the next visitor
- 10. Slapstick over precision
- 11. Show, don't tell
- Pick how each feature shares state
- Determinism from day one
- Sync edits, not state
- Clear authority
- Server hosts every room
- Understandable at a glance
- Small and readable
- Code first, images by approval
