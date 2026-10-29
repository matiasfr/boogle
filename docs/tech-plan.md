# Tech plan: safety nets before features

Groundwork so friends (and their agents) can keep adding features to `main` without silently breaking each other. Every
item serves DESIGN.md's technical principles ("Determinism from day one", "Sync edits, not state", "Small and readable")
and play principle 9 ("Leave something for the next visitor"). Tick items here as they land.

Order matters: the rules split (B1) unlocks the replay test (B2) and snapshot versions (B3); the folder reshuffle (C2)
and code splitting (C3) touch import paths everywhere, so they go last, in one quiet window.

## Wave A: independent, small

- [ ] **A1. Determinism lint.** ESLint bans `Math.random`, `Math.sin/cos/tan/pow/exp/log/atan2/hypot/...`, `**`,
      `Date.now`, `performance.now` and `new Date()` in lockstep code (`src/sim/**`, `src/world/terrain-logic.js`, and
      the rules modules from B1). Cosmetic helpers that live in `src/sim/` today (`honkFreq`, the moon's `illum`) move
      out or are marked cosmetic. A tiny test proves the rule fires.
- [x] **A2. Reports to the server.** `POST /report` on `server/` (small JSON, rate-limited, appended to a daily JSONL
      file) and `GET /reports` behind a token. A plug-in feature (`src/features/telemetry.js`) sends JS errors, desyncs
      (which state key, which tick), snapshot load failures and connection failures, only when `VITE_BOOGLE_SERVER` is
      set. Nothing personal: room, kind, short detail, build, coarse browser.
- [ ] **A3. Nightly live smoke test.** A scheduled GitHub Actions job opens two headless tabs on the deployed site, digs
      and throws the ball, checks the world hashes agree, and opens (or updates) an issue on failure.
- [ ] **A4. Server deploy job + TURN measurement (PLAN Phase 1).** A workflow deploys `server/` to Fly.io on changes
      to `server/` when a `FLY_API_TOKEN` secret exists (skips cleanly otherwise). Connection reports from A2 say
      whether a failed join had a relay candidate, so "how many connections fail without TURN" has an answer.
      *Needs a human:* create the Fly app and volume, set the secrets and the `VITE_BOOGLE_SERVER` repo variable.
- [ ] **A5. Measure the sim.** `npm run perf` also reports ms per lockstep tick (water, terrain, gifts, mushrooms) with
      busy water. The result decides C4.

## Wave B: the world rules (sequential)

- [ ] **B1. Split shared rules from rendering.** Each Lockstep system (terrain, water, mushrooms, gifts, proto flags)
      gets a three.js-free rules module that registers its ops, state and tick functions on a sync instance it is
      given; the existing files become render/input adapters that subscribe through `onApplied`/`onSnapshot`. Pure
      helpers the rules need (island base heights, noise) move out of three.js-importing modules. No behavior change:
      scenarios `dig-channel`, `two-player-dig`, `hotbar`, `caves`, `lighthouse` and `npm run check:full` stay green.
- [ ] **B2. Replay test.** One Node test builds a host and clients from the real rules, feeds a seeded random stream
      of every op (each rules module exports an edit generator; the test fails if a registered op has none), kills the
      host midway, adds a late joiner, reloads a snapshot, and requires identical per-state hashes everywhere. Under a
      second.
- [ ] **B3. Snapshot versions.** `registerState(key, { version, migrate })`; snapshots record each state's version;
      loaders run migrations in order. Fixture snapshots in `test/fixtures/` (including the old 129-cell grid) must
      keep loading; malformed input must not throw.

## Wave C: structure and load time

- [ ] **C1. Thin `main.js`.** Ball and player frame logic (respawn, auto-claim, visual sync) move onto `onFrame`
      hooks so `main.js` only wires modules together.
- [ ] **C2. Folders.** Move-only commit: `src/boogler/`, `src/terrain/`, `src/water/`, `src/items/`, ... (no code
      changes), done in one quiet window and merged fast.
- [ ] **C3. Faster first load.** Code-split what isn't needed to stand on the island (caves, POI decor, Boogler
      dialogue, debug tools); compare bundle size and `npm run perf` before and after.
- [ ] **C4. Sim worker, only if A5 says so.** DESIGN.md: measure first, sleep settled regions before workers.

## Docs that follow the code

AGENTS.md, `src/world/README.md` and the `/new-feature` skill describe the rules-module pattern and the edit-generator
requirement once B1 and B2 land.
