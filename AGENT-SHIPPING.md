# Shipping procedures

Binding procedures routed by [AGENTS.md](AGENTS.md#required-reading-by-task). Read before substantial work, committing or shipping.

## Shipping
- Before starting something larger, `npm run inflight` lists unmerged `wip/`, `ship/` and `claude/` branches and the files they touch (`!` = files you changed too); split work so parallel tracks don't touch the same files. Work that spans sessions: `npm run wip -- <topic>` pushes it to `wip/<you>/<topic>` (no CI) so others see it; `ship` removes it once shipped.
- A large or risky change (several files with shared state, or `src/sim/`, `src/world/`, `src/net*`, `server/`) can start from a plan in `docs/plans/<name>.md` when asked for one, using the format in `.claude/agents/planner.md`; wait for approval before building it.
- PRs merge without review, so over ~3 files or ~150 lines, re-read your diff and simplify it before shipping; for `src/net*`, `src/world/` or `server/`, also run your tool's code review. The GitHub Action flows skip this.
- Style: ESLint + Prettier (single quotes, 120 columns). Run `npx prettier --write <your files>` and `npx eslint <your files>` on what you edit, never the whole repo: CI doesn't check formatting, and only Claude Code does this for you (a hook).
- A new `?proto=` prototype adds or updates its entry in `protos/protos.ts` (the list at boogle.club/protos/) in the same PR (one gut question and one line on what's new: no checklists, the owner plays it and knows), and flips it to `live` when it ships.
- A change a player can see (a model, a hat, UI, an effect) shows it in its PR: a still from `npm run look` or a scenario (look at it first), uploaded with `scripts/pr-shot.sh <png>...`, which prints Markdown. Paste that into the commit body (`ship` PRs are built from commit messages) or the `gh pr create` body; already merged, `gh pr comment`.
- Small commits, imperative subject; the body names the DESIGN.md principle served. Then `npm run ship`: rebases on `main`, runs `check` (`-- --gpu` adds `check:gpu`), pushes `ship/<you>-<sha>`. Green CI merges and deploys; red or conflicting, `ci-autofix.yml` pushes up to two fixes, then @mentions you. `-- --wait` waits for `main`.
- A session that can only push its `claude/<topic>` branch pushes it and opens a non-draft PR; `automerge.yml` squash-merges it when green (draft or `no-automerge` label: nothing merges). Networking changes don't need a human review for their own sake: run `check:full` and open them as normal PRs, without a draft or that label. Other agents, Codex included, use `npm run ship` rather than opening a PR from their own branch prefix: `ci-autofix.yml` and `inflight` don't see a `codex/*` branch.
- **Friends ship:** PRs from branches in this repository merge when CI is green; fork PRs never automerge. `npm run friends-report` lists friends’ merged work and flags sensitive paths.
- On a rebase conflict keep **both** sides (usually independent features), `git add`, `git rebase --continue`, ship again.
- Never force-push, skip hooks (`--no-verify`) or push to `main` unless a human asks. Red `main`: fixing it beats starting something new.
