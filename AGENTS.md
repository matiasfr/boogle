# Boogle: agent instructions

The single source of truth for any coding agent (Claude Code, Codex, Cursor, ...). `CLAUDE.md` imports this file; put shared rules here, not there.

Boogle is a multiplayer browser game: three.js + cannon-es, bundled with Vite, networked with PeerJS (one browser is the host). `server/` is the signaling/snapshot server. Several friends and their agents push to `main` at the same time, and `main` auto-deploys to https://matiasfr.github.io/boogle/.

## Read first
- [DESIGN.md](DESIGN.md): play and technical principles. Follow them; if a request conflicts with one, say which and ask before bending it. Every feature names the principle it serves (commit body or PR).
- [PLAN.md](PLAN.md): the roadmap. Tick its checkboxes in the same commit that finishes an item.
- [src/net/README.md](src/net/README.md) (room interface) before touching multiplayer; [src/world/README.md](src/world/README.md) (world contract) before touching shared state.

## Rules that are easy to miss
- **Deterministic shared sim** (water, terrain edits, mushrooms, weather, tide): integers, fixed update order, fixed tick, seeded RNG (`mulberry32` from `src/sim/rng.js`). Never `Math.random()`, `Date.now()` or floats that feed back into shared state.
- **Cosmetic stays separate.** Particles, ripples, sounds may use floats and `Math.random()`, in their own modules, never read by the sim.
- **Sync edits, not state.** Clients `submitEdit`; the host stamps and broadcasts. Bulk state travels only as host snapshots. Authority table: DESIGN.md, "Clear authority".
- **Room interface only.** Game code talks to `createPeerRoom` (`src/net/README.md`), never to PeerJS directly. No alternate transports, no claude.ai artifact build.
- **Small and readable.** Plain modules, no new dependencies without a reason in the commit message.
- **Style.** ESLint + Prettier (single quotes, 120 columns). The repo is Prettier-clean; format the files you touch (`npx prettier --write <files>`), never the whole repo in a feature commit.

## Features plug in; they don't edit shared files
- New feature = new file `src/features/<name>.js`, auto-loaded by `main.js`. Register work with `onFrame(fn, { phase, order })` and `onStart(fn)` from `src/loop.js` (phases and ordering are documented at the top of that file).
- Its CSS is `src/features/<name>.css`, imported by the feature. Its DOM is created in JS (append to `.hud` or `body`), not added to `index.html`.
- Shared state goes through `src/world/sync.js` (`registerOp`, `registerState`, `onTick`); pure logic lives in `src/sim/` (no three.js, no DOM) so it can be unit-tested.
- Hotspots: `src/main.js`, `src/style.css`, `index.html`, `PLAN.md`. Keep edits there to a line or two.

## Commands
- `npm run dev`: local game at http://localhost:5173 (`?room=<name>`, `?netdebug=1`).
- `npm run check`: lint + unit tests + build, a few seconds. Run before every push.
- `npm run check:full`: adds server tests and the headless network test (~30 s). Run when you touch `src/net*`, `src/world/sync.js` or `server/`.
- `npm run ship`: how you push (below). `cd server && npm test`: server tests alone.

## Tests stay light
- Unit tests (`test/*.test.mjs`, `node:test`) cover pure logic only (`src/sim/*`, `src/world/*` state, validation, serialize/load/hash): no three.js, DOM, browser or network. Each file well under a second; shrink grids and tick counts until it is.
- Test what would silently break: determinism (same inputs, same hash), conservation, ordering, validation, serialize/load round-trips. Not visuals or tuning numbers.
- Networking changes: `npm run test:net`; new room-interface behavior gets a check in `dev/peer-test/`.
- Visual and feel changes: validate in the running game with `npm run look` (stills, motion sheets, heatmaps, motion score) and scenario checks (`npm run scenario -- <name>`, `dev/scenarios/`; see `.claude/skills/look/SKILL.md`): write or extend a scenario, run it, read the images, iterate. Scenarios are not part of `check`. Don't commit ad-hoc Playwright scripts as tests.

## Shipping
- Commit small, focused changes with imperative messages ("Add splashes for the ball"), then run **`npm run ship`**, not `git push`. It rebases onto the latest `main`, runs `check` (or `check:full` for networking/sync/server), pushes, and retries if `main` moved.
- On a rebase conflict, keep **both** sides' changes (they are usually independent features). `ship` asks Claude Code to do this automatically; if it can't, resolve, `git add`, `git rebase --continue`, `npm run ship` again.
- Never force-push `main` or skip hooks (`--no-verify`) unless a human asks.
- Networking, sync and persistence changes ship the same way; no human review needed. `ship` runs `check:full` for them.
- If CI is red on `main`, `ci-autofix.yml` opens a fix PR; if you're around, fixing it beats starting something new.
