# Agent instructions

For any coding agent (Claude Code, Codex, Cursor, …) working in this repo. Claude Code also reads [CLAUDE.md](CLAUDE.md); keep the two consistent.

## Before you change anything
- Read [DESIGN.md](DESIGN.md) (play + technical principles), [PLAN.md](PLAN.md) (roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md) (workflow + testing).
- Game code talks to the room interface in `src/net/README.md` and the world contract in `src/world/README.md`, never to PeerJS directly.
- Shared simulation is deterministic: integers, fixed order, seeded RNG from `src/sim/rng.js`, no `Math.random`/`Date.now` in shared logic.

## Shipping (several people push to `main` at the same time)
- Commit small, focused changes, then run **`npm run ship`** instead of `git push`. It rebases onto the latest `main`, runs `npm run check` (or `check:full` when `src/net*`, `src/world/sync.js` or `server/` changed), pushes, and retries if someone pushed meanwhile.
- If ship stops on a rebase conflict: resolve it keeping both sides' intent (never drop a collaborator's change), `git add` the files, `git rebase --continue`, run `npm run ship` again.
- A plain `git push` to main is guarded by the pre-push hook (installed by `npm install`): it runs `npm run check` and refuses if `main` moved on.
- `main` auto-deploys to the live site. If CI goes red on main, fix or revert before starting anything new.
- Risky changes (networking protocol, sync, persistence) go on a branch with a PR instead.

## Tests
Keep them light (CONTRIBUTING.md, Testing): unit tests in `test/` for pure logic only, each file well under a second. Visual and feel changes are verified by running the game, not by committed browser tests.

## Avoiding conflicts
Hotspots are `src/main.js`, `src/style.css`, `index.html` and `PLAN.md`. Prefer new modules over growing shared files, keep edits to hotspots to a few lines, and pull/ship often.
