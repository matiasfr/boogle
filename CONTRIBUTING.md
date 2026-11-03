# Contributing to Boogle

Boogle is a friends' project: keep changes small, readable and fun. [DESIGN.md](DESIGN.md) says how we decide, [docs/proposals/boogle-2.md](docs/proposals/boogle-2.md) records the owner's decisions, [docs/plans/find-the-fun.md](docs/plans/find-the-fun.md) tracks what we're prototyping now, and [AGENTS.md](AGENTS.md) holds the code, testing and shipping rules. AGENTS.md is written for coding agents but applies to humans too; it's short, read it once.

## Setup

Use Node 24 (`.nvmrc`; `nvm use` if you use nvm). Run `npm ci`, then `npm run dev` and open the URL Vite prints. Installation includes the server dependencies and pre-push hook. The dev server starts the game server automatically; no production secrets are needed. The `?room=` / `?netdebug=1` options are in [README.md](README.md#multiplayer).

For browser checks, install the pinned Playwright browser with `npx playwright install chromium` (Linux: `npx playwright install --with-deps chromium`). Start with `npm run check`; the change-specific checks are in [AGENTS.md](docs/agents/tests.md#tests).

## How we work

We're in rapid iteration: a few people (mostly through Claude Code) building and playtesting many times a day. Everything lands on `main` through a PR, but nobody has to open or review one.

1. **Commit (on `main` or any branch), then `npm run ship`.** It rebases onto what friends shipped, runs the fast checks and pushes your commits to a new `ship/<you>-<sha>` branch, then returns. On a rebase conflict it asks Claude Code to keep both changes. We don't hand-review merges: we accept the small risk of losing a line now and then.
2. CI runs on that branch (a minute or two). Green: a bot opens the PR, merges it with a merge commit (your commits land as they are, so your next ship rebases cleanly) and deploys. Red, or in conflict with `main`: Claude pushes one fix commit to the branch, twice at most, then @mentions you on the PR. `ship` prints links to the CI run and the PR; `npm run ship -- --wait` waits until it's on `main`.
3. `main` refuses direct pushes (the pre-push hook here, a ruleset on GitHub). `main` auto-deploys, so it must always be playable. After shipping, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main` anyway (two PRs that pass alone but break together), Claude opens a fix PR automatically and it merges when green. If you're around, fixing it beats starting something new; revert if the fix isn't quick.
5. Want a review first? Push a branch and open a draft PR, or add the `no-automerge` label. Ask `@claude` or a friend to review.
6. Friends’ PRs from branches in this repository merge when CI is green, including changes to networking and tooling. Fork PRs do not automerge. Run `npm run friends-report` to see friends’ merged work and sensitive paths.

Repo settings this relies on (owner only): Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests", and a ruleset on `main`: require a pull request (0 approvals), require the `client`, `server` and `net` checks, block force pushes. Leave "require branches to be up to date" off; it would restart everyone's CI whenever anyone merges.

## Design rules

- Every feature names the DESIGN.md principle it serves and flags any it bends (commit message body, or the PR).
- If a change conflicts with a principle, change the idea, or change the principle in DESIGN.md with the reason, in its own commit.
- Use [DESIGN.md](DESIGN.md) and [docs/proposals/boogle-2.md](docs/proposals/boogle-2.md) for current design; pick prototype work from [docs/plans/find-the-fun.md](docs/plans/find-the-fun.md) and tick its checkboxes in the same commit.

## Playtesting

The playtest is the real test. Whenever something new lands, jump on https://boogle.club/?room=<name> with whoever is around. Each prototype in [docs/plans/find-the-fun.md](docs/plans/find-the-fun.md) has a question; jot the answer and anything fun or broken in [docs/playtests.md](docs/playtests.md) (or run `/playtest-notes` in Claude Code). File broken things with the bug report template and `?netdebug=1` logs.

## Working with AI agents

- **Claude Code** loads `CLAUDE.md`, which imports `AGENTS.md`. Committed project settings (`.claude/settings.json`) pre-approve routine commands and format/lint every file Claude edits. Skills: `/ship`, `/new-feature <name>`, `/playtest-notes`.
- **Other agents** (Codex, Cursor, ...) read `AGENTS.md` directly. Change shared rules there, never in `CLAUDE.md`. Codex also gets the skills through `.agents/skills`, a link to `.claude/skills`.
- **On GitHub**, mention `@claude` in an issue or PR ([claude.yml](.github/workflows/claude.yml)). It opens a PR from a `claude/` branch that [automerge.yml](.github/workflows/automerge.yml) squash-merges once CI is green. Add the `no-automerge` label or ask for a draft to review first. [ci-autofix.yml](.github/workflows/ci-autofix.yml) fixes a red `main` and red or conflicting `ship/` and `claude/` branches.
- Treat AI-written code like any other: play it, skim the diff, and push back on slow or browser-based tests for things a unit test or a playtest covers.

### Codex local and worktree tasks

Open this repository in Codex and trust it. `AGENTS.md` is the shared entry point, `.agents/skills` links to the same skills, and `.codex/` holds the rest, committed so every worktree gets it:

- `config.toml`: workspace-write with network, live web search, and room for all of `AGENTS.md` (the default cuts it off at 32 KB).
- `rules/boogle.rules`: the project's commands, Git and `gh` run outside the sandbox with no prompt; force-pushing and skipping hooks are refused. macOS's sandbox won't let Chromium start and a worktree's Git data is outside it, so these can't work from inside. Restart Codex after changing rules.
- `hooks.json`: Prettier and ESLint on each edit, the same `.claude/hooks/format-lint.ts` Claude Code runs. Codex skips a project hook until you trust it: run `/hooks` once in a session. In our tests the project's copy didn't fire under `codex exec`; `dev/codex/run.ts` jobs pass the hook themselves.
- `agents/`: `planner` and `implementer`, which read the same briefs as Claude's.
- `environments/environment.toml`: the desktop app's setup script for a new worktree (Node 24, `npm ci`, Chromium) and its top-bar buttons.

The look harness starts and stops its own local stack on free ports and writes to `.look/`, so it needs no running dev server. Name the question with `--question`, frame the feature, use `--action` after warm-up and open the still and sheet with `view_image`. A successful capture still needs a visual judgment (the shared `look` skill).

Commit only the task's files and ship with `npm run ship`, with the same `ship/` branch, CI and automerge rules as every other agent. Follow [AGENTS.md](docs/agents/shipping.md#shipping) for review and verification.
