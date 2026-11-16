# Boogle: agent instructions

Project context for design decisions, new mechanics and prototype work. Boogle is a multiplayer browser game: three.js (`WebGPURenderer`, shaders in TSL) + Rapier (WASM physics, through `src/physics/engine.ts`), Vite; our server (`server/`) hosts every room over WebSocket and runs its lockstep world. Friends and their agents ship at once through self-merging PRs; `main` auto-deploys to https://boogle.club/.

For those tasks read [DESIGN.md](../../DESIGN.md) (principles; every feature names the one it serves, and asks before bending one) and the [design-work rules](#design-work-rules) below. PLAN.md, SETTLED.md, the vertical slice and older proposals are historical: they bind no one. [src/README.md](../../src/README.md) maps the folders. [docs/game-design.md](../game-design.md) describes the game as built: a change that adds, changes or removes something a player can see or do (a system, control, item, tuning number, place) updates its file in `docs/game-design/` in the same commit (a new system adds a file and a line in the index); refactors and tooling don't.

[docs/decisions.md](../decisions.md) is the owner's decision log for where the game is heading: read its routing table, then only the Current rules of the topic you are deciding in (`npm run map -- --section docs/decisions-<topic>.md current-rules`), opening a dated entry for its full words (nothing in it is built unless `docs/game-design.md` says so).

[docs/ideas.md](../ideas.md) is a parking lot, not a task list: never implement from it unless asked; you may append an idea you notice but won't act on.

## Design-work rules

Still-valid rules copied verbatim from the 1 November plan's “Rules for every prototype” on 16 November. The current work is the live game ([direction](../direction.md)); later [owner calls](owner-calls.md#how-the-owner-works) govern delivery and proof timing. Replaced flag, card and playtest-gate requirements are listed in the [archive report](../archive/README.md#find-the-fun-rule-reconciliation), not imported as requirements here.

- **Solo and co-op alongside each other** (owner, 7 November). Evaluate solo viability and cooperative quality together. A cooperative question needs players cooperating; a solo run alone cannot answer it. Judge actions in the context of the project and its payoff. Solo support remains required, with a separately scoped approach where needed.
- **Evidence before a playtest.** The builder looks at its own `/look` stills and motion sheets and iterates before
  shipping ([AGENT-VERIFICATION.md, See it before you ship](../agents/verification.md#see-it-before-you-ship), required by AGENTS.md). Tests only for lockstep code; `perf` only for heavy rendering.
- **No twice → change it or cut it.** The former blanket ban on reward-dependent mechanics is retired with DESIGN principle 1 (owner, 7 November); evaluate the proposed experience in its progression context.


## Principle index

Commit bodies name the principle served. Names are listed here so a tuning fix, review or tooling change need not read the design corpus. Read a principle's section when deciding how it applies; design decisions, new mechanics and prototypes require DESIGN.md.

- 2. Physics toys are optional fun
- 3. Side activities are never required
- 6. Communal world, personal things
- 7. Telegraph everything
- 8. Enjoyable alone and together
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
