@AGENTS.md

## Claude Code only

- Shared project settings are in `.claude/settings.json`: an allowlist for routine commands and a hook that runs Prettier and ESLint on each JS/CSS file you edit. Personal tweaks go in `.claude/settings.local.json` (gitignored).
- Project skills: `/ship` (commit and ship), `/new-feature <name>` (scaffold a plug-in), `/playtest-notes` (log a playtest).

### As the GitHub Action (@claude, ci-autofix)
- Run `npm ci && npm run check` before committing (plus `npm run test:net` if you touched networking).
- Commit to a `claude/<topic>` branch and open a PR with `gh pr create`: imperative title; body says what changed and which DESIGN.md principle it serves. Never push to `main`.
- `automerge.yml` squash-merges non-draft `claude/*` PRs once CI passes. Networking, sync and persistence changes need no human review; open them as normal PRs (run `npm run check:full` first).
