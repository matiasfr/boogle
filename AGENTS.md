# Boogle: agent instructions

The single source of truth for any coding agent (Claude Code, Codex, Cursor, ...). `CLAUDE.md` imports this file; put shared rules here, not there.

Boogle is a multiplayer browser game: three.js + cannon-es, bundled with Vite, networked with PeerJS (one browser is the host). `server/` is the signaling/snapshot server. Several friends and their agents ship at the same time; `main` only takes PRs, which merge themselves once CI is green, and `main` auto-deploys to https://matiasfr.github.io/boogle/.

## Read first
- [DESIGN.md](DESIGN.md): play and technical principles. Follow them; if a request conflicts with one, say which and ask before bending it. Every feature names the principle it serves (commit body or PR).
- [PLAN.md](PLAN.md): the roadmap. Tick its checkboxes in the same commit that finishes an item.
- [src/net/README.md](src/net/README.md) (room interface) before touching multiplayer; [src/world/README.md](src/world/README.md) (world contract) before touching shared state.

## Rules that are easy to miss
- **Pick a sync kind per piece of state:** Local, Owner, Host or Lockstep (table in DESIGN.md, "Pick how each feature shares state"). Physics is never Lockstep.
- **Deterministic shared sim** (Lockstep: water, terrain edits, mushrooms, weather, tide): integers for conserved quantities, floats only with `+ - * /` and `Math.sqrt`, fixed update order, fixed tick, seeded RNG (`mulberry32` from `src/sim/rng.js`). Never `Math.random()`, `Date.now()`, `Math.sin`/`cos`/`pow`/`exp`/`log`/`atan2`/`hypot` or `**` (browsers round them differently), or three.js/cannon-es math in it. ESLint enforces this for `LOCKSTEP_FILES` (`eslint.config.js`); a new lockstep module outside `src/sim/` joins that list.
- **Cosmetic stays separate.** Particles, ripples, sounds may use floats and `Math.random()`, in their own modules, never read by the sim.
- **Sync edits, not state** (Lockstep). Clients `submitEdit`; the host stamps and broadcasts. Bulk state travels only as host snapshots. Authority table: DESIGN.md, "Clear authority".
- **Room interface only.** Game code talks to `createPeerRoom` (`src/net/README.md`), never to PeerJS directly. No alternate transports, no claude.ai artifact build.
- **Small and readable.** Plain modules, no new dependencies without a reason in the commit message.
- **Style.** ESLint + Prettier (single quotes, 120 columns). The repo is Prettier-clean; format the files you touch (`npx prettier --write <files>`), never the whole repo in a feature commit.

## Features plug in; they don't edit shared files
- New feature = new file `src/features/<name>.js`, auto-loaded by `main.js`. Register work with `onFrame(fn, { phase, order })` and `onStart(fn)` from `src/loop.js` (phases and ordering are documented at the top of that file).
- Its CSS is `src/features/<name>.css`, imported by the feature. Its DOM is created in JS (append to `.hud` or `body`), not added to `index.html`.
- Every control is playable on a Backbone-style gamepad: a new key or touch button also calls `registerAction` (`src/controls.js`) with a free pad slot. If none is left, rethink the layout instead of adding a key-only control.
- Shared state uses the API for its sync kind: `addPresenceField` (Owner) or `addHostField` (Host) in `src/net.js`, smoothed with `createSnaps` (`src/snaps.js`). Cosmetic helpers needing sin/pow/random stay with their feature.
- Lockstep state is four files (`src/world/README.md`, "Adding a lockstep system"): `src/sim/<x>.js` (pure, no three.js or DOM, lockstep-safe math) plus its test; `src/world/rules/<x>.js`, which registers the ops, state and ticks and exports `edits` (a seeded edit generator per op, for `test/world-replay.test.mjs`); one appended line in `src/world/rules/index.js`; and a `src/features/<x>.js` adapter that uses `submitEdit`, `onApplied`, `onAfterTick`, `onSnapshot`. Lint bans `registerOp`/`registerState`/`onTick` everywhere else.
- Hotspots: `src/main.js`, `src/style.css`, `index.html`, `PLAN.md`, `src/world/rules/index.js` (append only). Keep edits there to a line or two.

## Commands
- `npm run dev`: local game at http://localhost:5173 (`?room=<name>`, `?netdebug=1`).
- `npm run check`: lint + unit tests + build, a few seconds. Run before every push.
- `npm run check:full`: adds server tests and the headless network test (~30 s). Run when you touch `src/net*`, `src/world/sync.js`, `src/world/rules/`, `src/world/game-world.js` or `server/`.
- `npm run perf`: draw calls and triangles, then ms per lockstep tick per handler (idle and busy water), in about a
  minute or more on a loaded machine; compare before/after changes that add meshes, lights or sim work (`-- --render` /
  `-- --sim` for one half).
- `npm run ship`: how you ship (below). `cd server && npm test`: server tests alone.

## Tests stay light
- Unit tests (`test/*.test.mjs`, `node:test`) cover pure logic only (`src/sim/*`, `src/world/*` state, validation, serialize/load/hash): no three.js, DOM, browser or network. Each file well under a second; shrink grids and tick counts until it is.
- Test what would silently break: determinism (same inputs, same hash), conservation, ordering, validation, serialize/load round-trips. Not visuals or tuning numbers.
- Networking changes: `npm run test:net`; new room-interface behavior gets a check in `dev/peer-test/`.
- Visual and feel changes: validate in the running game with `npm run look` (stills, motion sheets, heatmaps, motion score) and scenario checks (`npm run scenario -- <name>`, `dev/scenarios/`; see `.claude/skills/look/SKILL.md`): write or extend a scenario, run it, read the images, iterate. Scenarios are not part of `check`; CI runs the main ones on every PR (`scenarios` job in `.github/workflows/ci.yml`; `world-inputs`, `smoke`, `two-player-dig`, `reconnect-dig` and `shared-kinds` must pass, the rest are informational), so a local run is optional: use it to iterate, or read the failing leg's `scenario-<name>` artifact. Don't commit ad-hoc Playwright scripts as tests.

## Shipping
- Commit small, focused changes with imperative messages ("Add splashes for the ball"), then run **`npm run ship`**. It rebases onto the latest `main`, runs `check`, and pushes to a new `ship/<you>-<sha>` branch, then returns. `main` itself refuses pushes.
- CI runs on that branch (including `check:full`'s server and network tests, and the browser scenarios). Green: `automerge.yml` opens the PR, merges it with a merge commit and deploys. Red, or in conflict with `main`: `ci-autofix.yml` has Claude push one fix commit to the branch, twice at most, then @mentions you on the PR. `npm run ship -- --wait` waits until it's on `main`.
- Shipping again before the last one merged is fine: the new PR carries both, and the older PR is closed once its commits are on `main`.
- Networking, sync and persistence changes ship the same way; no human review needed.
- On a rebase conflict, keep **both** sides' changes (they are usually independent features). `ship` asks Claude Code to do this automatically; if it can't, resolve, `git add`, `git rebase --continue`, `npm run ship` again.
- A session that can only push its own `claude/` branch pushes it and opens a non-draft PR; `automerge.yml` squash-merges it when green. Draft or `no-automerge` label: nothing merges it.
- Never force-push or skip hooks (`--no-verify`) unless a human asks.
- If CI is red on `main` (two PRs that pass alone but break together), `ci-autofix.yml` opens a fix PR; if you're around, fixing it beats starting something new.
