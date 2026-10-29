# Agent instructions

For any coding agent (Claude Code, Codex, Cursor, …) working in this repo. Claude Code also reads [CLAUDE.md](CLAUDE.md); keep the two consistent.

## Before you change anything
- Read [DESIGN.md](DESIGN.md) (play + technical principles), [PLAN.md](PLAN.md) (roadmap), and [CONTRIBUTING.md](CONTRIBUTING.md) (workflow + testing).
- Game code talks to the room interface in `src/net/README.md` and the world contract in `src/world/README.md`, never to PeerJS directly.
- Shared simulation is deterministic: integers, fixed order, seeded RNG from `src/sim/rng.js`, no `Math.random`/`Date.now` in shared logic.

## Shipping (several people push to `main` at the same time)
- Commit small, focused changes, then run **`npm run ship`** instead of `git push`. It rebases onto the latest `main`, runs `npm run check` (or `check:full` when `src/net*`, `src/world/sync.js` or `server/` changed), pushes, and retries if someone pushed meanwhile.
- On a rebase conflict, ship asks Claude Code (if installed) to resolve it keeping both sides, then the checks verify the result. If that fails: resolve it yourself keeping both sides' intent, `git add`, `git rebase --continue`, `npm run ship` again. Speed beats perfect safety here: we accept the small risk of an occasional lost line rather than reviewing every merge by hand.
- A plain `git push` to main is guarded by the pre-push hook (installed by `npm install`): it runs `npm run check` and refuses if `main` moved on.
- `main` auto-deploys to the live site. If CI goes red on main, `ci-autofix.yml` has Claude open a fix PR that auto-merges when green; if you're around, fixing it beats starting anything new.
- Risky changes (networking protocol, sync, persistence) go on a branch with a PR instead.

## Tests
Keep them light (CONTRIBUTING.md, Testing): unit tests in `test/` for pure logic only, each file well under a second. Visual and feel changes are verified by running the game, not by committed browser tests.

## Avoiding conflicts: features plug in, they don't edit shared files
- **New feature = new file in `src/features/`.** It's loaded automatically (no `main.js` edit). It registers per-frame work with `onFrame(fn, { phase, order })` and startup work with `onStart(fn)` from `src/loop.js`.
- **Its CSS lives next to it** (`src/features/<name>.css`, imported by the feature), not in `src/style.css`.
- **Its DOM is created in JS** by the feature (append to `.hud` or `body`), not added to `index.html`.
- Shared simulation goes behind `src/world/` (`registerOp`/`registerState`/`onTick`), so features don't touch each other's code.
- `src/main.js`, `src/style.css`, `index.html` and `PLAN.md` are hotspots: keep edits there to a line or two. Ship often.
