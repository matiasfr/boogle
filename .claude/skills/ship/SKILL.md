---
name: ship
description: Commit the current work and ship it with npm run ship (rebase, checks, push a ship/ branch that merges itself into main once CI is green).
argument-hint: '[commit message]'
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *) Bash(npm run ship) Bash(npm run ship -- --wait) Bash(git rebase --continue)
---

Ship the current work to `main` (it auto-deploys) through a PR that merges itself once CI is green. Follow the Shipping section of AGENTS.md.

1. `git status` and `git diff`. Leave out unrelated or half-finished changes and anything that looks like another person's work in progress; ask if unsure.
   If the change spans more than ~3 files or ~150 lines, run `/simplify` on it first (and `/code-review` if it touches `src/net*`, `src/world/` or `server/`), then re-read the diff.
2. Commit in small logical commits with imperative messages. Use `$ARGUMENTS` as the message if given. The body names the DESIGN.md principle a new feature serves. Tick any finished PLAN.md item, and update its file in `docs/game-design/` for a player-facing change (AGENTS.md), in the same commit. For a change a player can see, take a still (`/look`), upload it with `scripts/pr-shot.sh <png>...` and paste the printed Markdown into the commit body, so it shows on the PR.
3. Run `npm run ship`. If it stops on a rebase conflict, resolve it keeping both sides' changes, `git add` the files, `git rebase --continue`, and run `npm run ship` again. If the checks fail, fix the cause (don't skip them), commit, and ship again.
4. A session that can only push its own `claude/` branch (a cloud session, the GitHub Action) pushes that branch and opens a non-draft PR instead; it merges itself when green.
5. Report what was shipped in one or two lines, with the CI and PR links `ship` printed. Add `-- --wait` if the user wants to know when it's live.
