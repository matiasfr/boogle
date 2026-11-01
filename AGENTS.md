# Boogle: agent instructions

Shared rules for every coding agent (`CLAUDE.md` imports this file). Boogle is a multiplayer browser game: three.js (`WebGPURenderer`, shaders in TSL) + Rapier (WASM physics, through `src/physics/engine.ts`), Vite; our server (`server/`) hosts every room over WebSocket and runs its lockstep world. Friends and their agents ship at once through self-merging PRs; `main` auto-deploys to https://boogle.club/.

Read [DESIGN.md](DESIGN.md) (principles; every feature names the one it serves, and asks before bending one) and [PLAN.md](PLAN.md) (roadmap; tick an item in the commit that finishes it). [src/README.md](src/README.md) maps the folders. [docs/game-design.md](docs/game-design.md) describes the game as built: a change that adds, changes or removes something a player can see or do (a system, control, item, tuning number, place) updates its file in `docs/game-design/` in the same commit (a new system adds a file and a line in the index); refactors and tooling don't.

## TypeScript everywhere
Every new file is `.ts` (`src/`, `server/`, `dev/`, `test/`); never add a `.js` or `.mjs` file. Existing JavaScript converts folder by folder ([docs/plans/game-loop.md](docs/plans/game-loop.md), step 8); a module you change a lot is a good moment to convert it, in its own commit. `tsconfig.json` is `strict`; `npm run typecheck` (in `check`) must pass. No build step of our own: Vite and Node 24 strip the types, so use only erasable syntax (no `enum`, `namespace` or parameter properties; `import type` for types) and import files by their real name (`./rng.ts`). Wire messages, presence payloads and op/state shapes get exported types next to the code that owns them.

## A feature is a plug-in
`src/features/<name>.ts`, auto-loaded by `main.js`. Frame work: `onFrame(fn, { phase, order })`, `onStart(fn)` (`src/loop.js` lists phases and taken orders; features use `order` -10 and up). CSS in `src/features/<name>.css`, imported by the feature; DOM built in JS (append to `.hud` or `body`), never in `index.html`. Heavy or rarely used parts (far-off decor, dialogue, debug tools) load with a dynamic `import()` from the small eager feature file ("Lazy parts" in `src/loop.js`); never lazy: sync ops or state, `src/world/rules/`, or anything visible in the first seconds. Hotspots (`src/main.js`, `src/style.css`, `index.html`, `PLAN.md`, `src/world/rules/index.ts`): a line or two at most. Plain modules (TypeScript); a new dependency needs a reason in the commit.

## Rendering
`WebGPURenderer`, WebGPU only (no WebGL 2 fallback), one `RenderPipeline` (linear HDR, Neutral tone mapping), all custom shading in TSL node materials. Contract and pitfalls: [src/render/README.md](src/render/README.md).
- Custom looks go in node slots (`colorNode`, `positionNode`, `maskNode`, ...) of a `*NodeMaterial` from `three/webgpu`; extend someone else's material with `patchNode` (`src/render/material-patch.js`). No GLSL, `ShaderMaterial`, `onBeforeCompile` or `THREE.Points` (lint fails them).
- Colours are linear; draw through `renderFrame()`; post effects extend `pipeline.outputNode`. Compute shaders, storage buffers and the rest of WebGPU are fair game, with no fallback path.

## Pick a sync kind for each piece of state
Cheapest that works (table: DESIGN.md, "Pick how each feature shares state"). Physics is never Lockstep.
- **Local** (only this tab sees it, or it decorates): no API. Floats, `Math.random()`, GPU, all fine.
- **Owner** (one player drives it; physics): `addPresenceField(key, getter)` + `onRemotePresence((r, pr, time) => ...)` (`src/netplay/net.ts`), smoothed with `createSnaps()` (`src/netplay/snaps.ts`, sample at `now - INTERP_MS`). 20 Hz, latest wins: a few numbers under an untaken key that names the feature (`boogler`, not `b`; existing short keys stay as they are; taken keys: `npm run registry -- --json`). A peer that leaves just drops out of `remotes`: sweep your per-remote meshes. Example: the ball (`src/physics/ball.js`).
- **Host** (shared, small, changing; restarts with the next host): `addHostField(key, getter, onValue)`. Example: The Boogler.
- **Lockstep** (shared grid or many cells, persists): four files, recipe in [src/world/rules/README.md](src/world/rules/README.md): `src/sim/<x>.ts` + test, `src/world/rules/<x>.ts` (ops, state, ticks; exports `edits` and optionally `invariants` for `test/world-replay.test.mjs`; `version` + `migrate` when a state's shape changes; host-only facts for validate via `setEnv` → `ctx.env`), one appended line in `rules/index.ts`, and a `src/features/<x>.ts` adapter (`submitEdit`, `onApplied`, `onAfterTick`, `onSnapshot`). Example: mushrooms (`rules/mushrooms.ts`, `src/adapters/mushroom-garden.js`). Sync contract: [src/world/README.md](src/world/README.md).
- **One-off events** (a honk, a ping) are messages, not state: `onRoomReady(room => room.onMessage(...))`, `room.send(msg)` (reliable, ordered, every other peer; validate and rate-limit on receipt). Examples: `honk.js`, `ping.js`. Room interface: [src/net/README.md](src/net/README.md); never the WebSocket directly.

**Lockstep math** (`LOCKSTEP_FILES`: `src/sim/`, `src/world/rules/`, ...): integers for conserved quantities; floats only with `+ - * /` and `Math.sqrt`; seeded `mulberry32` (`src/sim/rng.ts`); fixed order and tick. Never `Math.random`, `Date.now`, `sin`/`cos`/`pow`/`exp`/`log`/`atan2`/`hypot`, `**`, or three.js or physics-engine math. Cosmetic code is Local and never read by the sim; a tested cosmetic helper that needs `sin` or `Math.random` goes in a three.js-free module outside `src/sim/` (like `src/math-pure.js`); lint fails it anywhere in `src/sim/`, even beside cosmetic code.

## Shared registries
`npm run registry` (in `check` and CI) fails on a presence key, message type or pad slot taken twice, or a feature `onFrame` order equal to a core one; and, against `main`, on a reordered `RULES`, a removed op or state, or a state whose saved shape changed without a `version` bump. `-- --json` lists what's taken.
- **Controls** (`src/player/controls.js`, contract at its top): every key or touch button is a `registerAction(id, { pad, key, touch, label, detail, group, down, up, held })` on a free pad slot; it also generates the guide row (pause view, first-run card). Taken slots: `npm run registry -- --json`; at least one must stay unclaimed in `src/`, since `updates.js` takes `freeSlots()[0]` at runtime. `group` is an id from `GROUPS`. `src/player/input.js` binds Space, E, R and the move keys by hand. No slot left: rethink the layout, no key-only controls. A key with no pad action of its own (hotbar digits) is `onKey` plus a `describeControl` row. To change another module's action: `wrapAction(id, { down, up })` from `onStart`.
- **Interact button** (E, pad B, touch action): `registerInteractable(fn)` (`src/player/hands.js`); `fn()` returns targets in reach `{ id, verb, at, run | blocked }`, `[]` for none. Never a new key.
- **Particles**: `emit({ x, y, z, vx, vy, vz, life, size, color, ... })` from `src/render/particles.js`; don't build your own pool.

## Lint boundaries (`eslint.config.js`)
- Determinism rules on `LOCKSTEP_FILES`: a new lockstep module outside `src/sim/` and `src/world/rules/` joins that list.
- `registerOp`/`registerState`/`onTick` only in `src/world/rules/` (and `game-world.ts`, which installs them): one place owns wire order and hashing.
- Rules import only `src/sim/`, `../grid.ts` and sibling rules; `src/sim/` imports nothing from `src/`.
- Features don't import other features: shared code moves to `src/` (an adapter, `src/player/`, ...).
- No WebGL-only three.js APIs in `src/` (list in `src/render/README.md`, "Materials").

## Don't (each of these has broken a room)
- **Effects in `apply`.** Apply changes state and returns a result; splashes, sounds, inventory go in the adapter's `onApplied(e, tick, result)`.
- **Treat `submitEdit` as done.** It returns true when *queued*: the host may reject it, and edits held while reconnecting can be dropped. Take items, spend inventory, play the effect in `onApplied`.
- **Save or serve unverified state.** A client persists only hash-verified ticks, and a state that failed to load (a fresh fallback) must never be uploaded as the host's save. Keep these guards when you touch `sync.ts`.
- **Leave a presence field set.** The getter returns `null` when the thing stops (deletes the key); receivers treat a missing key as "off".
- **Patch another module's action by string id** (`actionById(id).down = ...`): use `wrapAction`.
- **`Math.random`, wall clock or per-peer counters in apply or ticks.** The replay test catches these; don't silence it.

## Mixed builds
Tabs reload onto new deploys (`src/features/updates.js`), but a visible tab waits until hidden, so rooms mix builds for a while. Wire changes are additive (new ops, states, presence keys, message types; old tabs ignore them). Never change an existing one's shape or meaning without a version: a state's `version` + `migrate`, or a new name.

**Dev phase (until public playtests):** progress may be lost, so prefer a clean break over compatibility code. To remove or reshape ops, states or catalog entries, bump `WORLD_NS` in `src/world/namespace.ts` in the same commit and add a dated line to its history comment. Old tabs then live in a different room and never meet the new world, and `npm run registry` skips its mixed-build comparison; this is the only way past that check. Skip one-off localStorage migrations (a new key, or ignoring the old one, is fine). Still binding: `RULES` is append-only within a namespace, a shape change without a bump needs `version` + `migrate`, and nothing may crash on another build's messages, presence or saves.

## Tests
- Unit tests (`test/*.test.ts`, older ones `.test.mjs`; `node:test`): pure logic only (determinism, conservation, ordering, validation, serialize/load round-trips); no three.js, DOM or network; well under a second each.
- `npm run check` (lint, typecheck, unit tests, registry, build; seconds): before every push.
- `npm run check:full` (+ server tests, headless network test, ~30 s): when you touch `src/net*`, `src/world/sync.ts`, `src/world/rules/`, `src/world/game-world.ts` or `server/`. New room-interface behavior gets a check in `dev/peer-test/`.
- Browser scenarios (`dev/scenarios/`, `npm run scenario -- <name>`, `npm run look`; `.claude/skills/look/SKILL.md`): PR CI runs single-player scenarios only (`world-inputs`; must pass): it can't run two rendering tabs reliably, and `SCENARIO_GATE=pr` makes the runner refuse a second one. Multiplayer scenarios run on a device (`check:gpu`, below) or nightly (never block). Other local runs are optional, for iterating on visuals and feel; a failed leg's images and Playwright traces (`npx playwright show-trace <zip>`) are its `scenario-<name>` artifact. Commit scenarios, not ad-hoc Playwright scripts.
- `npm run load`: an 8-player room (the cap) for 30 s; prints host upload, CPU and presence latency. Before/after changes to presence, the room or the relay.
- `npm run perf`: before/after anything adding meshes, lights, post passes or per-tick sim work.
- Every harness run is WebGPU (SwiftShader over Vulkan on Linux and CI, Metal on a Mac; `?dpr=fixed`). A `gfx errors` line with entries is a bug.
- `smoke` is the backbone, but two tabs on CI's software WebGPU are too slow for it, so it runs where there is a GPU: `npm run check:gpu` (smoke on the Mac's GPU, a minute or so) runs in `npm run ship` on a Mac, and `smoke.yml` runs it against the live site after every deploy and nightly (a failure opens a `smoke` issue). Off a Mac, `SHIP_NO_GPU=1 npm run ship` skips the local run on purpose; the live run still catches it after the deploy.
- **Atlas** (internal, boogle.club/atlas; docs/atlas/README.md): shipping a new sync system or a big feature, add or update a story in docs/atlas/stories/. `npm run atlas -- --check` lists citations your change broke; fixing them is welcome but never blocks (the daily agent fixes what's left).

## Shipping
- Before starting something larger, `npm run inflight` lists unmerged `wip/`, `ship/` and `claude/` branches and the files they touch (`!` = files you changed too). Work that spans sessions: `npm run wip -- <topic>` pushes it to `wip/<you>/<topic>` (no CI) so others see it; `ship` removes it once shipped.
- Style: ESLint + Prettier (single quotes, 120 columns); `npx prettier --write <your files>`, never the whole repo.
- A change a player can see (a model, a hat, UI, an effect) shows it in its PR: a still from `npm run look` or a scenario (Read it first), uploaded with `scripts/pr-shot.sh <png>...`, which prints Markdown. Paste that into the commit body (`ship` PRs are built from commit messages) or the `gh pr create` body; already merged, `gh pr comment`.
- Small commits, imperative subject; the body names the DESIGN.md principle served. Then `npm run ship`: rebases on `main`, runs `check` (and `check:gpu` on a Mac), pushes `ship/<you>-<sha>`. Green CI merges and deploys; red or conflicting, `ci-autofix.yml` pushes up to two fixes, then @mentions you. `-- --wait` waits for `main`.
- A session that can only push its `claude/<topic>` branch pushes it and opens a non-draft PR; `automerge.yml` squash-merges it when green (draft or `no-automerge` label: nothing merges).
- **Owner gate:** a change by anyone but the owner (`OWNERS` in `automerge.yml`) that touches `src/net/`, `src/netplay/`, `src/world/`, `src/sim/`, `server/`, `scripts/`, `.github/`, `eslint.config.js` or `package*.json` gets the `needs-owner` label and waits for the owner to approve its latest commit; CI and `ci-autofix.yml` still run. Everything else merges itself when green. Keep such changes in their own small PR so the rest of your work isn't held with them.
- On a rebase conflict keep **both** sides (usually independent features), `git add`, `git rebase --continue`, ship again.
- Never force-push, skip hooks (`--no-verify`) or push to `main` unless a human asks. Red `main`: fixing it beats starting something new.
