# Boogle

Multiplayer browser game: three.js + cannon-es, bundled with Vite, networked with PeerJS (one browser is the host). Server code is in `server/`.

Before designing or implementing a feature, read:
- `DESIGN.md`: the play and technical principles. Follow them; if a request conflicts with one, say which and ask before bending it.
- `PLAN.md`: the phased roadmap. Tick checkboxes when you finish an item.
- `src/net/README.md`: the room interface. Game code talks to that interface, never to PeerJS directly.

Rules that are easy to miss:
- Shared simulation (water, terrain edits, crops, weather, tide) must be deterministic: integers, fixed update order, seeded RNG from `src/sim/rng.js`, no `Math.random()`.
- Clients send edit events; the host stamps and broadcasts them. Don't sync bulk state except host snapshots.
- No claude.ai artifact build or alternate transports.

Commands: `npm run dev`; `npm run check` (lint + unit tests + build, a few seconds, run before every push); `npm run check:full` (adds server tests and the headless network test, for changes to `src/net*`, `src/world/sync.js` or `server/`).

Tests stay light for rapid iteration (see CONTRIBUTING.md, Testing): unit tests in `test/` for pure logic only (no three.js/DOM/browser/network), each file well under a second; test determinism, conservation, ordering and validation, not visuals or tuning. Don't commit Playwright scripts as tests unless asked.

Contributing workflow: `CONTRIBUTING.md`. We commit straight to `main` once `npm run check` passes (it auto-deploys); use a branch/PR only for risky changes.

When running as the GitHub Action (@claude): commit to a `claude/` branch and open a PR with `gh pr create` (imperative title; body says what changed and which DESIGN.md principle it serves). Run `npm ci && npm run check` first. `.github/workflows/automerge.yml` squash-merges `claude/*` PRs once CI passes; open a draft or add the `no-automerge` label when a human should review first (risky changes to networking, sync or persistence).
