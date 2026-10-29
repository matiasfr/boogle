@AGENTS.md

## Claude Code only

### Setup
- `.claude/settings.json` (shared): allowlist for routine npm/git commands, denies force-push and `--no-verify`, and a hook (`.claude/hooks/format-lint.mjs`) that runs Prettier on each file you edit (plus ESLint for JS). Lint errors come back to you; fix them. Personal tweaks go in `.claude/settings.local.json` or `CLAUDE.local.md` (both gitignored).

### Project skills
- `/ship`: commit and ship with `npm run ship` (pushes a `ship/` branch that merges itself once CI is green).
- `/new-feature <name>`: scaffold a plug-in in `src/features/`.
- `/look`: see the running game (stills, motion, scenarios). Use it to check any visual, feel, physics or multiplayer change.
- `/video`: record clips and GIFs of the game and cut them into trailers or patch-notes videos.
- `/playtest-notes`: log a play session to `docs/playtests.md`.
- Reference skills load on their own when relevant: `threejs-*`, `game-feel`, `camera-systems`, `audio-design`.

### As the GitHub Action (`@claude` in `claude.yml`, or `ci-autofix.yml`)
- Run `npm ci && npm run check` before committing; `npm run check:full` if you touched `src/net*`, `src/world/sync.js` or `server/`.
- Never push to `main`. Commit to a `claude/<topic>` branch and open a PR with `gh pr create`: imperative title; body says what changed and which DESIGN.md principle it serves.
- `automerge.yml` squash-merges non-draft PRs from this repo once CI passes, then deploys; `ci-autofix.yml` fixes red or conflicting `claude/*` and `ship/*` branches. Open networking, sync and persistence PRs the same way: no draft, no `no-automerge` label.
