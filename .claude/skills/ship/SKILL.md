---
name: ship
description: Commit the current work and ship it with npm run ship (rebase, checks, push a ship/ branch that merges itself into main once CI is green).
argument-hint: '[commit message]'
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *) Bash(npm run ship) Bash(npm run ship -- --wait) Bash(git rebase --continue)
---

Ship the current work to `main` (it auto-deploys) through a PR that merges itself once CI is green. Follow the Shipping section of AGENTS.md.

1. `git status` and `git diff`. Leave out unrelated or half-finished changes and anything that looks like another person's work in progress; ask if unsure.
2. Commit in small logical commits with imperative messages. Use `$ARGUMENTS` as the message if given. The body names the DESIGN.md principle a new feature serves. Tick any finished PLAN.md item in the same commit.
3. Run `npm run ship`. If it stops on a rebase conflict, resolve it keeping both sides' changes, `git add` the files, `git rebase --continue`, and run `npm run ship` again. If the checks fail, fix the cause (don't skip them), commit, and ship again.
4. Report what was shipped in one or two lines, with the CI and PR links `ship` printed. Add `-- --wait` if the user wants to know when it's live.
