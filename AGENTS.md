# Boogle: agent instructions

The single source of truth for any coding agent (Claude Code, Codex, Cursor, ...); `CLAUDE.md` imports it. Boogle is a multiplayer browser game: three.js + cannon-es, Vite, PeerJS (one browser is the host); `server/` is the signaling/snapshot server. Several friends and their agents ship at once; `main` only takes PRs, which merge themselves when CI is green, and auto-deploys to https://matiasfr.github.io/boogle/.

Read [DESIGN.md](DESIGN.md) (principles; every feature names the one it serves, and asks before bending one) and [PLAN.md](PLAN.md) (roadmap; tick an item in the commit that finishes it). [src/README.md](src/README.md) maps the folders.

## A feature is a plug-in
`src/features/<name>.js`, auto-loaded by `main.js`. Frame work: `onFrame(fn, { phase, order })`, `onStart(fn)` (`src/loop.js` lists phases and taken orders). CSS in `src/features/<name>.css`, imported by the feature; DOM built in JS (append to `.hud` or `body`), never in `index.html`. Hotspots (`src/main.js`, `src/style.css`, `index.html`, `PLAN.md`, `src/world/rules/index.js`): a line or two at most. Plain modules; a new dependency needs a reason in the commit.

## Pick a sync kind for each piece of state
Cheapest that works (table: DESIGN.md, "Pick how each feature shares state"). Physics is never Lockstep.
- **Local** (only this tab sees it, or it decorates): no API. Floats, `Math.random()`, GPU, all fine.
- **Owner** (one player drives it; physics): `addPresenceField(key, getter)` + `onRemotePresence((r, pr, time) => ...)` in `src/netplay/net.js`; smooth with `createSnaps()` (`src/netplay/snaps.js`, sample at `now - INTERP_MS`). Rides presence at 20 Hz, latest wins: a few numbers, a short key not taken (`grep -rn addPresenceField src`). Example: the ball (`src/physics/ball.js`).
- **Host** (shared, small, changing; restarts with the next host): `addHostField(key, getter, onValue)`. Example: The Boogler.
- **Lockstep** (shared grid or many cells, persists): four files, recipe in [src/world/rules/README.md](src/world/rules/README.md): `src/sim/<x>.js` + test, `src/world/rules/<x>.js` (ops, state, ticks; exports `edits` and optionally `invariants` for `test/world-replay.test.mjs`; `version` + `migrate` when a state's shape changes; host-only facts for validate via `setEnv` → `ctx.env`), one appended line in `rules/index.js`, and a `src/features/<x>.js` adapter (`submitEdit`, `onApplied`, `onAfterTick`, `onSnapshot`). Example: mushrooms (`rules/mushrooms.js`, `src/adapters/mushroom-garden.js`). Sync contract: [src/world/README.md](src/world/README.md).
- **One-off events** (a honk, a ping) are messages, not state: `onRoomReady(room => room.onMessage(...))`, `room.send(msg)` (reliable, ordered, every other peer; validate and rate-limit on receipt). Examples: `honk.js`, `ping.js`. Room interface: [src/net/README.md](src/net/README.md); never PeerJS directly.

**Lockstep math** (`src/sim/`, `src/world/rules/`, anything else in `LOCKSTEP_FILES`): integers for conserved quantities; floats only with `+ - * /` and `Math.sqrt`; seeded `mulberry32` (`src/sim/rng.js`); fixed order and tick. Never `Math.random`, `Date.now`, `sin`/`cos`/`pow`/`exp`/`log`/`atan2`/`hypot`, `**`, or three.js/cannon-es math. Cosmetic effects stay Local, in their own modules, never read by the sim.

## Shared registries
- **Controls** (`src/player/controls.js`, contract at its top): every key or touch button is a `registerAction(id, { pad, key, touch, label, detail, group, down, up, held })` on a free pad slot (`freeSlots()`); the guide row (pause view, first-run card) is generated from it. No free slot: rethink the layout, don't add a key-only control. A key with no pad action of its own (hotbar digits, dive) uses `onKey` plus a `describeControl` guide row. To change another module's action, `wrapAction(id, { down, up })` from `onStart`.
- **Interact button** (E, pad B, touch action): `registerInteractable(fn)` (`src/player/hands.js`); `fn()` returns targets in reach `{ id, verb, at, run | blocked }`, `[]` for none. Never a new key.
- **Particles**: `emit('soft' | 'clump', { x, y, z, vx, vy, vz, life, size, color, ... })` from `src/render/particles.js`; don't build your own pool.

## Lint boundaries (`eslint.config.js`)
- Determinism rules on `LOCKSTEP_FILES`: a new lockstep module outside `src/sim/` and `src/world/rules/` joins that list.
- `registerOp`/`registerState`/`onTick` only in `src/world/rules/` (and `game-world.js`, which installs them): one place owns wire order and hashing.
- Rules import only `src/sim/`, `../grid.js`, `../terrain-logic.js` and sibling rules; `src/sim/` imports nothing from `src/`.
- Features don't import other features: shared code moves to `src/` (an adapter, `src/player/`, ...).
- No `peerjs` outside `src/net/`.

## Don't (each one broke a room recently)
- **Effects in `apply`.** Apply changes state and returns a result; splashes, sounds, inventory go in the adapter's `onApplied(e, tick, result)`.
- **Treat `submitEdit` as done.** It returns true when *queued*: the host may reject it, and edits held while reconnecting can be dropped. Take items, spend inventory, play the effect in `onApplied`.
- **Change ground outside the terrain ops.** Water copies ground only from ops in `TERRAIN_OPS` (`src/world/terrain-logic.js`) whose apply returns changed cells; anything else leaves the water sim on stale ground and desyncs.
- **Save or serve unverified state.** A client persists only hash-verified ticks; a state that failed to load starts as a fresh fallback, which must never be uploaded as the host's save. Keep these guards in `sync.js` when you touch persistence.
- **Leave a presence field set.** The getter returns `null` when the thing stops (deletes the key); receivers treat a missing key as "off".
- **Patch another module's action by string id** (`actionById(id).down = ...`): use `wrapAction`.
- **`Math.random`, wall clock or per-peer counters in apply or ticks.** The replay test catches most of these; don't silence it.

## Mixed builds
Tabs reload onto new deploys (`src/features/updates.js`), but a visible tab waits until hidden, so rooms run mixed builds for a while. Wire changes are additive: new ops, states, presence keys and message types are fine (old tabs ignore them). Never change the shape or meaning of an existing one without a version: a state's `version` + `migrate`, or a new op/key/message name.

## Tests
- Unit tests (`test/*.test.mjs`, `node:test`) cover pure logic only: determinism (same inputs, same hash), conservation, ordering, validation, serialize/load round-trips. No three.js, DOM or network; well under a second each.
- `npm run check` (lint, unit tests, build; seconds): before every push.
- `npm run check:full` (+ server tests, headless network test, ~30 s): when you touch `src/net*`, `src/world/sync.js`, `src/world/rules/`, `src/world/game-world.js` or `server/`. New room-interface behavior gets a check in `dev/peer-test/`.
- Browser scenarios (`dev/scenarios/`, `npm run scenario -- <name>`, `npm run look`; see `.claude/skills/look/SKILL.md`): CI runs `world-inputs`, `smoke` and `two-player-dig` on every PR (must pass); the rest run nightly and never block. Local runs are optional, for iterating on visuals and feel; a failing leg's images are its `scenario-<name>` artifact. Commit scenarios, not ad-hoc Playwright scripts.
- `npm run perf`: before/after anything adding meshes, lights or per-tick sim work.

## Shipping
- Style: ESLint + Prettier (single quotes, 120 columns); `npx prettier --write <your files>`, never the whole repo.
- Small commits, imperative subject; the body names the DESIGN.md principle served. Then `npm run ship`: rebases on `main`, runs `check`, pushes `ship/<you>-<sha>`. Green CI merges and deploys; red or conflicting, `ci-autofix.yml` pushes up to two fixes, then @mentions you. `-- --wait` waits for `main`.
- A session that can only push its `claude/<topic>` branch pushes it and opens a non-draft PR; `automerge.yml` squash-merges it when green (draft or `no-automerge` label: nothing merges). Networking and persistence changes too; no human review.
- On a rebase conflict keep **both** sides (usually independent features), `git add`, `git rebase --continue`, ship again.
- Never force-push, skip hooks (`--no-verify`) or push to `main` unless a human asks. Red `main`: fixing it beats starting something new.
