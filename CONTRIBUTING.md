# Contributing to Boogle

Boogle is a friends' project: keep changes small, readable and fun. [DESIGN.md](DESIGN.md) says how we decide, [PLAN.md](PLAN.md) what we build next, and [AGENTS.md](AGENTS.md) holds the code, testing and shipping rules. AGENTS.md is written for coding agents but applies to humans too; it's short, read it once.

## Setup

Node 22 or newer (`.nvmrc`). `npm install` (also installs the pre-push hook), then `npm run dev` and open http://localhost:5173. Running our own signaling server locally, and the `?room=` / `?netdebug=1` options, are in [README.md](README.md#multiplayer).

## How we work

We're in rapid iteration: a few people (mostly through Claude Code) building and playtesting many times a day. Everything lands on `main` through a PR, but nobody has to open or review one.

1. **Commit (on `main` or any branch), then `npm run ship`.** It rebases onto what friends shipped, runs the fast checks and pushes your commits to a new `ship/<you>-<sha>` branch, then returns. On a rebase conflict it asks Claude Code to keep both changes. We don't hand-review merges: we accept the small risk of losing a line now and then.
2. CI runs on that branch (a minute or two). Green: a bot opens the PR, merges it with a merge commit (your commits land as they are, so your next ship rebases cleanly) and deploys. Red, or in conflict with `main`: Claude pushes one fix commit to the branch, twice at most, then @mentions you on the PR. `ship` prints links to the CI run and the PR; `npm run ship -- --wait` waits until it's on `main`.
3. `main` refuses direct pushes (the pre-push hook here, a ruleset on GitHub). `main` auto-deploys, so it must always be playable. After shipping, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main` anyway (two PRs that pass alone but break together), Claude opens a fix PR automatically and it merges when green. If you're around, fixing it beats starting something new; revert if the fix isn't quick.
5. Want a review first? Push a branch and open a draft PR, or add the `no-automerge` label. Ask `@claude` or a friend to review.

Repo settings this relies on (owner only): Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests", and a ruleset on `main`: require a pull request (0 approvals), require the `client`, `server` and `net` checks, block force pushes. Leave "require branches to be up to date" off; it would restart everyone's CI whenever anyone merges.

## Design rules

- Every feature names the DESIGN.md principle it serves and flags any it bends (commit message body, or the PR).
- If a change conflicts with a principle, change the idea, or change the principle in DESIGN.md with the reason, in its own commit.
- Pick work from PLAN.md and tick its checkboxes in the same commit.

## Playtesting

The playtest is the real test. Whenever something new lands, jump on https://matiasfr.github.io/boogle/?room=<name> with whoever is around. Each PLAN.md phase ends with a question; jot the answer and anything fun or broken in [docs/playtests.md](docs/playtests.md) (or run `/playtest-notes` in Claude Code). File broken things with the bug report template and `?netdebug=1` logs.

## Working with AI agents

- **Claude Code** loads `CLAUDE.md`, which imports `AGENTS.md`. Committed project settings (`.claude/settings.json`) pre-approve routine commands and format/lint every file Claude edits. Skills: `/ship`, `/new-feature <name>`, `/playtest-notes`.
- **Other agents** (Codex, Cursor, ...) read `AGENTS.md` directly. Change shared rules there, never in `CLAUDE.md`.
- **On GitHub**, mention `@claude` in an issue or PR ([claude.yml](.github/workflows/claude.yml)). It opens a PR from a `claude/` branch that [automerge.yml](.github/workflows/automerge.yml) squash-merges once CI is green. Add the `no-automerge` label or ask for a draft to review first. [ci-autofix.yml](.github/workflows/ci-autofix.yml) fixes a red `main` and red or conflicting `ship/` and `claude/` branches.
- Treat AI-written code like any other: play it, skim the diff, and push back on slow or browser-based tests for things a unit test or a playtest covers.
