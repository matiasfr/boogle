Before substantial work, committing or shipping, read this shipping procedure.

## Shipping

For CI/ship changes, read [pipeline ordering, optional hardening and live smoke](ship-pipeline.md).

- Before starting something larger, `npm run inflight` lists unmerged `wip/`, `ship/` and `claude/` branches and the files they touch (`!` = files you changed too); split work so parallel tracks don't touch the same files. Work that spans sessions: `npm run wip -- <topic>` pushes it to `wip/<you>/<topic>` (no CI) so others see it; `ship` removes it once shipped.
- A large or risky change (several files with shared state, or `src/sim/`, `src/world/`, `src/net*`, `server/`) can start from a plan in `docs/plans/<name>.md` when asked for one, using the format in `.claude/agents/planner.md`; wait for approval before building it.
- PRs merge without review, so over ~3 files or ~150 lines, re-read your diff and simplify it before shipping; for `src/net*`, `src/world/` or `server/`, also run the code review on the code-review row of `npm run models` (withCodex: an Astra review job on the committed branch; normal: `/code-review medium` in an Opus subagent). The GitHub Action flows skip this.
- Style: Oxlint + Prettier (single quotes, 120 columns). Run `npx prettier --write <your files>` and `npm run lint -- <your files>` on what you edit, never format the whole repo: CI doesn't check formatting. Claude Code and Codex share the format/lint hook; the lint runner also checks Boogle's parser protections.
- A new `?proto=` prototype adds or updates its entry in `protos/protos.ts` (the list at boogle.club/protos/) in the same PR (one gut question and one line on what's new: no checklists, the owner plays it and knows), and flips it to `live` when it ships.
- A change a player can see (a model, a hat, UI, an effect) shows it in its PR: a still from `npm run look` or a scenario (look at it first), uploaded with `scripts/pr-shot.sh <png>...`, which prints Markdown. Paste that into the commit body (`ship` PRs are built from commit messages) or the `gh pr create` body; already merged, `gh pr comment`.
- Small commits, imperative subject; body names the DESIGN.md principle. `npm run ship` rebases on main, pushes `ship/<you>-<sha>` through the fast pre-push gate (`node dev/ship-check.ts`, also what a build step runs before it reports); `--full` adds `check`, which is a checkpoint's (owner-calls.md, "Build more, test less"), `--gpu` adds `check:gpu`. Ship and ship-branch enqueue without waiting; `--wait` explicitly waits for main. The first green run merges and deploys, even if main moved (only shared code files get main merged in and fresh CI); docs-only diffs run just the docs checks. Red/conflicting: autofix tries twice, then @mentions you. See pipeline prerequisites above.


- A session that can only push its `claude/<topic>` branch pushes it and opens a non-draft PR; `automerge.yml` squash-merges it when green (draft or `no-automerge` label: nothing merges). Networking changes don't need a human review for their own sake: run `check:full` and open them as normal PRs, without a draft or that label. Other agents, Codex included, use `npm run ship` rather than opening a PR from their own branch prefix: `ci-autofix.yml` and `inflight` don't see a `codex/*` branch.
- **Friends ship:** PRs from branches in this repository merge when CI is green; fork PRs never automerge. `npm run friends-report` lists friends’ merged work and flags sensitive paths.
- On a rebase conflict keep **both** sides (usually independent features), `git add`, `git rebase --continue`, ship again.
- Never force-push, skip hooks (`--no-verify`) or push to `main` unless a human asks. Red `main`: fixing it beats starting something new.
