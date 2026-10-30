@AGENTS.md

## Claude Code only

### Setup
- `.claude/settings.json` (shared): allowlist for routine npm/git commands, denies force-push and `--no-verify`, and a hook (`.claude/hooks/format-lint.mjs`) that runs Prettier on each file you edit (plus ESLint for JS). Lint errors come back to you; fix them. Personal tweaks go in `.claude/settings.local.json` or `CLAUDE.local.md` (both gitignored).

### Project skills
- `/ship`: commit and ship with `npm run ship`.
- `/new-feature <name>`: one self-contained plug-in in `src/features/`.
- `/feature <name> <request>`: for work spanning several files or shared state. The `planner` agent writes `docs/plans/<name>.md`, you wait for approval, then the `implementer` agent builds it.
- `/look`: see the running game (stills, motion, scenarios). Use it for any visual, feel, physics or multiplayer change.
- `/video`: clips, GIFs, trailers and patch-notes videos. `/playtest-notes`: log a play session to `docs/playtests.md`.
- Reference skills load on their own when relevant: `threejs-*`, `game-feel`, `camera-systems`, `audio-design`.

### As the GitHub Action (`@claude` in `claude.yml`, or `ci-autofix.yml`)
- `npm ci && npm run check` before committing (`check:full` per AGENTS.md, "Tests").
- Push a `claude/<topic>` branch and open a non-draft PR with `gh pr create` (AGENTS.md, "Shipping"): imperative title; body says what changed and which DESIGN.md principle it serves.
