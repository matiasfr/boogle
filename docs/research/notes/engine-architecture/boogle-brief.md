# Codebase brief: what the checks were tested against

Read at `39392fac` (2 Nov 2026 04:34 UTC, branch `architecture-research`), 1 November 2026 Pacific. Every number below
came from a command run in the worktree or a file read there. Static value imports only (type-only imports excluded,
as in `dev/scan/read.ts:305`). `src/proto/` counted apart.

## Size and rate

- 281 `.ts` files in `src/`, 42k lines. Eager closure (`src/main.ts`, every `src/features/*.ts`, `src/pois/*/index.ts`
  except caves): 199 files, 23.8k lines. Lazy outside proto: 24 files, 5.3k lines. Proto: 13.1k lines.
- History starts 2026-10-28. Squash merges per day: 13 (10-29), 45, 82, 160 (11-01), 41 so far on 11-02. Commits on
  11-01: 464.
- Built: `three` 1.13 MB, `main` 139 KB, `ball` 107 KB, Rapier WASM 1.6 MB, before gzip. Budgets and gzip numbers are
  in `docs/plans/loading.md` and `docs/plans/perf-baseline-2026-11-02.md`.

## Import graph

Folder to folder (non-proto sources):

- `sim` imports nothing. `net` imports nothing. `world` imports only `sim`. `boot` nothing.
- `physics/engine.ts` and `backend-rapier.ts` import only `constants.ts`. The rest of `physics/` is game code
  (`ball.ts` imports `netplay/net.ts`, `player/player.ts`, `player/throw.ts`).
- Mutual folder pairs: `adapters`-`player`, `island`-`render`, `netplay`-`physics`, `netplay`-`player`,
  `physics`-`player`, `physics`-`render`.
- Strongly connected components: two.
  - Nine files: `src/adapters/gifts.ts`, `src/adapters/mushroom-garden.ts`, `src/netplay/net.ts`, `src/physics/ball.ts`,
    `src/player/hands.ts`, `src/player/hud.ts`, `src/player/input.ts`, `src/player/player.ts`, `src/player/throw.ts`.
  - Two files: `src/pois/caves/decor.ts`, `src/pois/caves/index.ts`.
- Top fan-in (all sources): `loop.ts` 92, `render/scene.ts` 81, `player/player.ts` 66, `constants.ts` 63,
  `island/terrain.ts` 54 (28 non-proto), `netplay/net.ts` 47.
- Non-proto static imports of `src/proto/`: `flags.ts` (many), `mark.ts` (`src/features/feel.ts:23`,
  `src/features/haul-stack.ts:24`). Nothing else. Non-debug static imports of `src/debug/`: none.
- Proto importing features: `src/proto/haul/barrow.ts:32`, `src/proto/haul/magnet.ts:23`, `src/proto/grind/index.ts:24`.
  Out of scope.

## Frame hooks

59 non-proto `onFrame` calls: `update` 31, `late` 24, `world` 4. (A first count of 65 wrongly matched
`requestAnimationFrame(`.) Ties: `update`/0 has 11 (`src/features/gifts.ts`, `hotbar.ts`, `dino.ts`, `critter-fish.ts`,
`critter-fireflies.ts`, `critter-gulls.ts`, `ball-rest.ts`, `boogler.ts` twice, windmills, lighthouse), `late`/0 has 9,
`late`/40, `update`/-5 and `update`/30 two each. `onFrame` has no unregister (`src/loop.ts:109-114`).
The registry checks order against core hooks only (`dev/registry/scan.ts:89-91`).

## Time

- `src/main.ts`: `dt` clamped to 50 ms, rAF timestamp used.
- `src/physics/backend-rapier.ts:304-314`: accumulator, 4 steps at most, leftover dropped, alpha interpolation.
- Force writes outside the backend: `src/features/feel.ts:92` (inside `onPreStep` at :78), `src/physics/physics.ts:185`,
  `:231-233` (inside `onPreStep` at :122). `pull()` zeroes force each step. Clean.
- Per-frame constant smoothing: none found outside proto. `src/features/adaptive-res.ts:62` is an EMA of frame time.
  `src/features/critter-fish.ts:130-134` looks like it but feeds an acceleration scaled by `dt` at `:168-169`.
- `src/render/motion.ts` has `damp`, `dampK`, `springStep`.

## Hidden tab

- `src/world/background.ts` + `clock-worker.ts`: worker `setInterval` drives `updateWorld` only while hidden. Header
  comment still says this protects a tab "if this is the host", which predates the server.
- `src/netplay/net.ts:254`: presence carries `v`. `server/src/host/hosted-room.ts:79,145`: a lead hidden for 5 s hands off.
- `src/net/ws-room.ts:30,210-217`: `hb` on a main-thread 1 s `setInterval`. `server/src/host/hosted-room.ts:78,158,295`:
  `c.seen` updated on any message, terminated after 5000 ms. A hidden tab sends no presence (rAF), and `hb` is the only
  regular send. Under Chrome's once-a-minute level this would mean termination then reconnect each minute. Not tried in
  a browser. An audible tab is exempt.
- 23 non-proto, non-debug, non-boot, non-net timers listed: UI, telemetry, updates, reconnect, idle prefetch, cave build
  slices. None drives gameplay.

## Edits

`submitEdit` return used at: `src/features/log-sources.ts:75` (pending), `src/adapters/gifts.ts:295` (pending),
`src/adapters/piles.ts:69` (pending plus cosmetic fly), `src/adapters/gifts.ts:177` (returns true),
`src/adapters/mushroom-garden.ts:384` (then `useOne()` at :386). `src/player/hands.ts:152-153` spends with `useOne()`
then refunds only if the edit could not be queued. `src/world/sync.ts:23,90`: held edits older than 5 s are dropped.
No rejection or drop callback reaches the adapter. Inventory is personal, in localStorage.

## Snapshots

`onSnapshot` users outside `world/`: `src/features/ball-rest.ts:33`, `helper-bank.ts:11`, `hut-build.ts:126`. Gifts, piles
and mushrooms have none and redraw from rules state per frame or by `rev`, so a grep for missing `onSnapshot` would
misfire. `src/features/work-sites.ts:289` builds its cache key from `sites.rev`, `names`, `tune.rev`, `run`.
Rules-side `onApplied`: `src/world/rules/wagon.ts:56`, `opening.ts:62` (allowed: "sim-side listeners").
`test/world-replay.test.ts:58,155-163` compares `stateHashes()`. A field in `serialize` but not `hash` is invisible to it.

## Services with one door

`new WebSocket`: `src/net/ws-room.ts:101` only. `new AudioContext`: `src/render/audio.ts` only. `requestAnimationFrame`
outside `three`: `src/main.ts:82` (one frame), `src/boot/splash.ts`, `src/features/welcome-back.ts:80` (CSS),
`src/player/pad-diagram.ts:248` (one-shot). Key listeners: `src/player/input.ts`, `controls.ts`, `modal.ts`,
`you-editor.ts`. `window.boogle` is written by features as a console handle; no game code reads it.
Direct `InstancedMesh`: `src/features/track-machine.ts`, `haul-stack.ts`, `hut-build.ts`, `src/render/haul-pieces.ts`,
besides the pool in `src/render/instances.ts`.

## GPU objects

`precompile(` callers: `src/main.ts`, `src/render/precompile.ts`, `src/pois/caves/index.ts`. `.dispose()` in 7 non-proto
files, for per-event or per-remote objects (`src/features/ping.ts`, `honk.ts`, `src/netplay/net.ts:309`,
`src/guest/play.ts`, `src/render/sky.ts`, `src/debug/`). `src/adapters/gifts.ts:207` drops visuals with no dispose;
`src/player/item-models.ts:64-71` clones shared templates, so that is correct.

## Physics

`src/physics/backend-rapier.ts:153`: `setCanSleep(false)` on every non-static body ("a woken body would skip a step").
`:286-294`: push and pull every body each step. `pull` (`:271-285`) crosses WASM four times per non-static body. Baseline: physics
0.18 ms of 0.94 ms CPU per frame (Mac, `perf`).

## Gates and where they run

- CI `client` job (`.github/workflows/ci.yml`): lint, build, `test:unit`, `registry`. Not `typecheck`, not
  `assets -- --check`. `npx tsc -p .` is clean at this commit.
- `npm run check` (lint, typecheck, unit, registry, assets check, build) runs in `scripts/ship.sh:67` and by instruction
  in the GitHub Action prompts.
- `perf`, `hitches`, `boot-time`: no workflow runs them.
- `dev/look/hitches.ts:54` budget 3.2 KB/frame; `docs/plans/game-loop.md` says 3.6.
- `eslint.config.js:44` ignores `server/`. `:59` leaves `src/net/**` out of the module-boundary block.
- The "features stay independent" pattern matches `./*` only (`eslint.config.js:98-101`). No `../features/` import
  exists inside `src/features/` today.

## Conflicts between binding docs

- Target device: `docs/plans/architecture.md` "Assumptions" says a 2021 iPad and a mid-range Android phone.
  `docs/proposals/boogle-2.md:144` replaces them with an M4 iPad Pro ("likely"), and `:143` says not to over-index on
  the iPad. `perf-baseline-2026-11-02.md` measures desktop first, with an iPad estimate.
- Alloc budget: code 3.2, plan 3.6.

## Float precision (computed)

32-bit float step: 0.03 mm at 510 m, 0.06 mm at 1 km, 0.5 mm at 8 km, 2 mm at 32 km. At 60 Hz, the slowest speed that
still moves a coordinate at 8 km is about 0.03 m/s. Boogle's world today is ±255 m (`src/world/grid.ts`).
