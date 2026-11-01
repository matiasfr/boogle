# Tech plan: safety nets before features

Groundwork so friends (and their agents) can keep adding features to `main` without silently breaking each other. Every
item serves DESIGN.md's technical principles ("Determinism from day one", "Sync edits, not state", "Small and readable")
and play principle 9 ("Leave something for the next visitor"). Tick items here as they land.

Order matters: the rules split (B1) unlocks the replay test (B2) and snapshot versions (B3); the folder reshuffle (C2)
and code splitting (C3) touch import paths everywhere, so they go last, in one quiet window.

## Wave A: independent, small

- [x] **A1. Determinism lint.** ESLint bans `Math.random`, `Math.sin/cos/tan/pow/exp/log/atan2/hypot/...`, `**`,
      `Date.now`, `performance.now`, `new Date()` and `Date()` in lockstep code (`src/sim/**`,
      and the rules modules from B1). Cosmetic helpers that live in `src/sim/` today
      (`honkFreq`, the moon's `illum`) move out or are marked cosmetic. A tiny test proves the rule fires.
- [x] **A2. Reports to the server.** `POST /report` on `server/` (small JSON, rate-limited, appended to a daily JSONL
      file) and `GET /reports` behind a token. A plug-in feature (`src/features/telemetry.ts`) sends JS errors, desyncs
      (which state key, which tick), snapshot load failures and connection failures, only when `VITE_BOOGLE_SERVER` is
      set. Nothing personal: room, kind, short detail, build, coarse browser.
- [x] **A3. Nightly live smoke test.** (historical: digging removed 2026-10-30) A scheduled GitHub Actions job opens two headless tabs on the deployed site, digs
      and throws the ball, checks the world hashes agree, and opens (or updates) an issue on failure.
- [x] **A4. Server deploy job + TURN measurement (PLAN Phase 1).** A workflow deploys `server/` to Fly.io on changes
      to `server/` when a `FLY_API_TOKEN` secret exists (skips cleanly otherwise). Connection reports from A2 say
      whether a failed join had a relay candidate, so "how many connections fail without TURN" has an answer.
      *Needs a human:* create the Fly app and volume, set the secrets and the `VITE_BOOGLE_SERVER` repo variable.
      *2026-10-29:* deploy job done (`.github/workflows/deploy-server.yml`). Connection reports carry `hadTurn` only
      (our ICE config listed a TURN server); whether a relay candidate was gathered or used is not observed yet. The
      human steps in server/README.md remain. *Since #57:* a good join also reports `links`, `relayed` (through TURN)
      and `rttMs`; the server runs on Fly with Cloudflare TURN (#55, #56).
- [x] **A5. Measure the sim.** (historical: the water sim was removed 2026-10-30) `npm run perf` also reports ms per lockstep tick (water, terrain, gifts, mushrooms) with
      busy water. The result decides C4.
      *2026-10-29:* `npm run perf -- --sim` (`profileTicks` in `src/world/sync.ts`, opt-in wrappers, nothing in normal
      play). Headless Chromium, swiftshader, 4 cores shared with other agents (load 5 to 10), ticks run back to back;
      runs vary widely. Idle island: whole tick avg 0.3 to 1.0 ms, p95 0.7 to 4 ms. Busy water (6511 home cells
      flooded 40 cm, ~6400 of 13287 cells active, a channel dug at the rate limit): in four runs, whole tick avg 2.3
      to 3.7 ms, p95 6.4 to 11 ms, of which the sim alone (water step + sea pin, ops, gifts, mushrooms, hashes) p95
      about 3.5 ms (water step p95 1.8 to 4.9 ms); a reviewer's run on the same loaded box measured sim-only p95
      9.5 ms and the render-side water surface scan p95 15 ms. Max values (up to ~100 ms) are GC, JIT warm-up and
      preemption on the loaded box, not the sim. Hashes (host, every 20 ticks) cost ~2 to 5 ms for water, once.
      **C4: no worker for now.** The render-side surface scan, not the sim, is the larger cost, and it feeds the mesh
      on the main thread, so a sim worker would not remove it. Cheaper next step: spread the surface scan and the
      water hash over several ticks, and keep sleeping settled cells. Revisit if sim-only p95 passes ~6 ms on a real
      laptop or the simulated region grows past the home square.
- [x] **A6. Mixed builds.** Tabs poll `version.json` and reload onto a new deploy; presence carries each build.

## Wave B: the world rules (sequential)

- [x] **B1. Split shared rules from rendering.** Each Lockstep system (terrain, water, mushrooms, gifts, proto flags)
      gets a three.js-free rules module that registers its ops, state and tick functions on a sync instance it is
      given; the existing files become render/input adapters that subscribe through `onApplied`/`onSnapshot`. Pure
      helpers the rules need (island base heights, noise) move out of three.js-importing modules. No behavior change:
      scenarios `dig-channel`, `two-player-dig` (now `two-player-edit`), `hotbar`, `caves`, `lighthouse` and `npm run check:full` stay green.
- [x] **B2. Replay test.** One Node test builds a host and clients from the real rules, feeds a seeded random stream
      of every op (each rules module exports an edit generator; the test fails if a registered op has none), kills the
      host midway, adds a late joiner, reloads a snapshot, and requires identical per-state hashes everywhere. Under a
      second.
      *2026-10-30:* `test/world-replay.test.mjs` (two runs of the same seed, about 0.5 s on a loaded box). Modules
      also export `invariants` (sand and water conserved, gift ids unique, mushroom spacing). Injected bugs it caught:
      `Math.random` in `mush.plant`'s apply, a counter shared across peers in `gift.take`'s apply, and a slosh gated
      on the per-peer clock (after the slosh generator moved off the pinned open sea, where the pin erased any effect).
- [x] **B3. Snapshot versions.** `registerState(key, { version, migrate })`; snapshots record each state's version;
      loaders run migrations in order. Fixture snapshots in `test/fixtures/` (including the old 129-cell grid) must
      keep loading; malformed input must not throw.
      *2026-10-30:* snapshots carry `vers` (missing = 0). Each state loads inside try/catch: a bad one starts fresh,
      counts in `stats.loadErrors` and reports `onSnapFail({ from: 'state' })`. A state from a newer build is skipped
      and the tab stops persisting. `test/fixtures/snap-pre-version.json` (captured before versions) must keep loading
      to its hashes (`test/world-snapshots.test.mjs`). The 129-cell grid fixture was dropped with the migration itself
      (owner decision below): those saves now load fresh sand and mushrooms; their loose items (gifts without `v`)
      stay at the old cells, now far-corner sea, until they rot. Every state is still at version 0.

## Wave C: structure and load time

- [x] **C1. Thin `main.js`.** Ball and player frame logic (respawn, auto-claim, visual sync) move onto `onFrame`
      hooks so `main.js` only wires modules together.
      *Done:* 130 to 65 lines; the core hooks' orders, which keep the old frame sequence, are listed in `src/loop.ts`.
- [x] **C2. Folders.** Move-only commit: `src/boogler/`, `src/terrain/`, `src/water/`, `src/items/`, ... (no code
      changes), done in one quiet window and merged fast.
      *2026-10-30:* `src/boogler/`, `player/`, `render/`, `netplay/`, `physics/`, `adapters/`; map in `src/README.md`.
- [x] **C3. Faster first load.** Code-split what isn't needed to stand on the island (caves, POI decor, Boogler
      dialogue, debug tools); compare bundle size and `npm run perf` before and after.
- [x] **C4. Sim worker, only if A5 says so.** (historical: the water sim was removed 2026-10-30) DESIGN.md: measure first, sleep settled regions before workers.
      *Decided: no worker.* A5 measured the sim at about 1 ms per tick on average; the render-side water surface scan
      is the bigger cost, and a worker would not help it. If it is ever needed, spread the surface scan and the hash
      over several ticks first.

## Docs that follow the code

AGENTS.md, `src/world/README.md`, the `/new-feature` skill and DESIGN.md's "In code" paragraph (under "Pick how each
feature shares state") describe the rules-module pattern and the edit-generator requirement once B1 and B2 land.

## Decided (owner, 2026-10-30)

Reviews and cut lists respect these until the owner changes them.

- **Keep:** the caves (audit look and walk-in/out before adding more), The Boogler (a playtest hit), the video pipeline
  (useful; improve it: stop committing per-video reel scripts once published, drive shots through `window.boogle` and
  actions instead of importing game internals).
- **Remove unused legacy code:** the 129-cell save migration (`src/world/legacy-grid.js` and its call sites), the dead
  water spring API (`setSource`/`srcMap` in `src/sim/water.js`) and `dev/water-lab/`, unused exports. After B1 lands. *Done: #28, #31; sim/world/net exports swept 2026-10-30.*
- **Server stack:** Deployed on Fly (#55–#57). Since 9579d93 the server hosts every room over WebSocket; PeerJS and
  TURN are gone ([docs/plans/server-host.md](plans/server-host.md)).
- **ROMs only** (e0f9410): names of characters, games and companies are fine in copy, docs, code and commits. The
  hard line is ROM data: never commit, bundle, deploy or fetch anything from a ROM
  ([src/guest/README.md](../src/guest/README.md)).
