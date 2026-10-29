---
name: ship
description: Commit the current work and push it to main with npm run ship (rebase, checks, push, retry).
argument-hint: '[commit message]'
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *) Bash(npm run ship) Bash(git rebase --continue)
---

Ship the current work to `main` (it auto-deploys). Follow the Shipping section of AGENTS.md.

1. `git status` and `git diff`. If you're not on `main`, stop and say so (branches go through a PR). Leave out unrelated or half-finished changes and anything that looks like another person's work in progress; ask if unsure.
2. Commit in small logical commits with imperative messages. Use `$ARGUMENTS` as the message if given. The body names the DESIGN.md principle a new feature serves. Tick any finished PLAN.md item in the same commit.
3. Run `npm run ship`. If it stops on a rebase conflict, resolve it keeping both sides' changes, `git add` the files, `git rebase --continue`, and run `npm run ship` again. If the checks fail, fix the cause (don't skip them), commit, and ship again.
4. Report what was pushed in one or two lines.
