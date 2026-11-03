For game work, design, level, art or character work, read this context; the root table narrows the old universal-reading sentence to those tasks, and find-the-fun to game/prototype work.

# Boogle: agent instructions

Shared rules for every coding agent (`CLAUDE.md` imports this file). Boogle is a multiplayer browser game: three.js (`WebGPURenderer`, shaders in TSL) + Rapier (WASM physics, through `src/physics/engine.ts`), Vite; our server (`server/`) hosts every room over WebSocket and runs its lockstep world. Friends and their agents ship at once through self-merging PRs; `main` auto-deploys to https://boogle.club/.

Read [DESIGN.md](../../DESIGN.md) (principles; every feature names the one it serves, and asks before bending one) and [docs/plans/find-the-fun.md](../plans/find-the-fun.md) (what's being prototyped now; tick a box in the commit that finishes it). PLAN.md, SETTLED.md, the vertical slice and older proposals are historical: they bind no one. [src/README.md](../../src/README.md) maps the folders. [docs/game-design.md](../game-design.md) describes the game as built: a change that adds, changes or removes something a player can see or do (a system, control, item, tuning number, place) updates its file in `docs/game-design/` in the same commit (a new system adds a file and a line in the index); refactors and tooling don't.

[docs/proposals/boogle-2.md](../proposals/boogle-2.md) is the owner's decision log for where the game is heading: read it before design, level, art or character work (nothing in it is built unless `docs/game-design.md` says so).

[docs/ideas.md](../ideas.md) is a parking lot, not a task list: never implement from it unless asked; you may append an idea you notice but won't act on.
