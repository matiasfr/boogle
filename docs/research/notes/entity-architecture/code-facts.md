# Code facts: what the report was checked against

Read at `adbf06eb` and rechecked at `54f5e2d4`, 1 November 2026 Pacific. Counts exclude `src/proto/` and `src/debug/`
unless stated.

## Frame hooks

- 64 `onFrame(` call sites in 50 files; 38 more in `src/proto/`. `npm run registry -- --json` sees 34 with a literal
  order or phase. Core orders are in `src/loop.ts:10-19`.
- Files with two hooks in one phase: `src/physics/ball.ts` (`world` -300, -280), `src/player/player.ts` (`update` -290,
  -200). The second becomes the camera's own kind in step 12; the first has no such way out.
- The pre-step section interleaves the ball and the player, `src/main.ts:47-50`:
  `updateRemotes, resolveBallOwner, updateIntent, prepareBall`.
  - `resolveBallOwner` can call `releaseBall`, which writes `me.holding` (`src/physics/ball.ts:120`).
  - `updateIntent` reads `me.holding` and writes `me.yaw` (`src/player/player.ts:116-119`).
  - `prepareBall` reads both through `carryPosition` (`src/physics/ball.ts:260`, `src/player/player.ts:56-57`).
- `runFrame` has no try/catch (`src/loop.ts:121-127`). three requests the next animation frame before running the loop
  (`node_modules/three/src/renderers/common/Animation.js:75,93`, three 0.187.0), so a hook that always throws skips the
  rest of the hooks and render on every frame while the loop keeps running. Read, not reproduced. `src/features/telemetry.ts:60`
  reports uncaught errors.
- `onFrame` pushes and sorts the live list (`src/loop.ts:110-113`) while `runFrame` walks it by index, so a registration
  from inside a hook could repeat or skip one. A dynamic `import()` always lands between frames, because microtasks wait
  for the stack to empty. Indented `onFrame(` calls: `adaptive-res.ts:55`, `proto-soapbox.ts:18`, `pause.ts:441`; not
  traced further.
- Seven hooks read `elapsed`: `src/features/splash.ts:8`, `impact.ts:336`, `feel.ts:304`, `critter-fireflies.ts:67`,
  `critter-gulls.ts:152`, `src/render/water-render.ts:146`, `src/player/player.ts:207` (the title-screen camera).

## Fixed-step hooks

- `onPreStep` and `onPostStep` run around every fixed step, in registration order, with no number and no unregister
  (`src/physics/engine.ts:15`, `backend-rapier.ts:253-254`).
- Twelve registrations: `src/physics/platforms.ts:106`, `src/features/feel.ts:78`, `src/adapters/mushroom-garden.ts:110,141`,
  `src/guest/play.ts:198`, `src/physics/physics.ts:122,238`, `src/boogler/boogler.ts:510`, `src/boogler/play.ts:119,131`,
  `src/pois/caves/index.ts:357`, `src/pois/windmills/index.ts:258`.
- `installStepHooks` (`src/physics/physics.ts:113-249`) holds remote body targeting, the player's whole controller, the
  ball's friction and surf, and the fall-through net. `src/main.ts:34` calls it after every eager module has evaluated, so
  those hooks run after the module-level ones (platforms, feel, mushrooms, guest) and before ones registered later.

## The ball (`src/physics/ball.ts`, 316 lines)

- `ball.disp` is gameplay state. Read in `src/player/hands.ts:91`, `src/features/impact.ts`, `ping.ts:35`, `bump.ts:28`,
  `ball-rest.ts:19,25`, `src/render/splash.ts:99`, `src/guest/play.ts:134`, and the ball's own `ballInReach`, walk-in claim
  and `claimBall`. Written by `src/features/bump.ts:48`, and `src/proto/minis/golf.ts:152`.
- `placeBall` writes `ball.mesh.position` directly (`:160`): the one state-to-view write.
- Blockers for the plan's `state.ts` lint: `document.hidden` (`:232`); `performance.now()` (`:122`, `:243`) is fine in Node.
- Per-remote data lives on the shared `Remote` object (`BallRemote`, `:36`).
- `src/` importers outside proto and debug: 22. With proto, `dev/` and `test/`: 32. The plan says 18.

## Who owns what

- 21 files own a body or a mesh and also have a frame hook; the plan's number holds.
- Files with several bodies per object: `src/pois/lighthouse/index.ts` (2 static), `src/pois/windmills/index.ts` (3
  `createBody` sites), `src/adapters/mushroom-garden.ts` (2).
- Ten lines of `src/physics/backend-rapier.ts` handle bodies made before Rapier is ready: mirrors, built on ready (`:83`).
- `src/features/ping.ts` is a small dynamic object: several live at once, spawned by an action or a room message, removed
  during its own walk (`:178-181`), with a mesh and DOM. `honk.ts` is similar.
- `src/features/first-run.ts`, `welcome-back.ts`: one-shot cards whose hooks run for the whole session.

## Tooling that knows about hooks

- `dev/scan/read.ts:368` collects `onFrame` for both the registry and the atlas.
- `dev/look/hitches.ts:194-204` charges allocations to each callee of `runFrame`, keyed by source `url:line`. Every kind
  walked by one shared function would land on one row.
- `vite.config.ts:56-62` rewrites `onFrame(` to carry the file name. A shared walker has to pass `name` itself; `opts.name`
  wins (`src/loop.ts:116`).
- `.claude/skills/new-feature/SKILL.md` tells agents to copy `honk.ts`, `bump.ts` and `gifts.ts` and use `onFrame`.

## Budgets

- `dev/look/hitches.ts:54`: 3.2 KB/frame of hook objects. `docs/plans/game-loop.md`: under 1 KB is the goal.
- [perf-baseline-2026-11-02.md](../../../plans/perf-baseline-2026-11-02.md): 0.94 ms main-thread CPU per frame on an M1 Max,
  0.55 ms render, 0.18 ms physics, 168 draw calls.

## The plan at `54f5e2d4`

- The first read of this report used the copy at `adbf06eb`. Main then moved the AGENTS.md rule to step 11, replaced `madge`
  with the knot ratchet (`dev/registry/knots.ts`), detailed step 7, and fixed the budget risk. The report is written against
  the newer copy.
- Step 7 keeps `updateRemotes` as a named call in `main.ts`, and no later step removes it. `installStepHooks` appears in no
  step. Step 7's `declare module` fields on `Remote` have no step that removes them.
- `docs/proposals/boogle-2.md`, 2026-11-02: the owner says the controls and motion are right on today's direct controller.

## Headless blockers found while reading

- `src/constants.ts:26-27`: `matchMedia` at import.
- `src/physics/physics.ts:20`, `src/netplay/net.ts:92`: `location.search`.
- `three` and `three/webgpu` both load in plain Node 24 (run here).
