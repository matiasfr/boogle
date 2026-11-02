# Contributing to Boogle

Boogle is a friends' project: keep changes small, readable and fun. [DESIGN.md](DESIGN.md) says how we decide, [docs/proposals/boogle-2.md](docs/proposals/boogle-2.md) records the owner's decisions, [docs/plans/find-the-fun.md](docs/plans/find-the-fun.md) tracks what we're prototyping now, and [AGENTS.md](AGENTS.md) holds the code, testing and shipping rules. AGENTS.md is written for coding agents but applies to humans too; it's short, read it once.

## Setup

Use Node 24 (`.nvmrc`; `nvm use` if you use nvm). Run `npm ci`, then `npm run dev` and open the URL Vite prints. Installation includes the server dependencies and pre-push hook. The dev server starts the game server automatically; no production secrets are needed. The `?room=` / `?netdebug=1` options are in [README.md](README.md#multiplayer).

For browser checks, install the pinned Playwright browser with `npx playwright install chromium` (Linux: `npx playwright install --with-deps chromium`). Start with `npm run check`; the change-specific checks are in [AGENTS.md](AGENTS.md#tests).

## How we work

We're in rapid iteration: a few people (mostly through Claude Code) building and playtesting many times a day. Everything lands on `main` through a PR, but nobody has to open or review one.

1. **Commit (on `main` or any branch), then `npm run ship`.** It rebases onto what friends shipped, runs the fast checks and pushes your commits to a new `ship/<you>-<sha>` branch, then returns. On a rebase conflict it asks Claude Code to keep both changes. We don't hand-review merges: we accept the small risk of losing a line now and then.
2. CI runs on that branch (a minute or two). Green: a bot opens the PR, merges it with a merge commit (your commits land as they are, so your next ship rebases cleanly) and deploys. Red, or in conflict with `main`: Claude pushes one fix commit to the branch, twice at most, then @mentions you on the PR. `ship` prints links to the CI run and the PR; `npm run ship -- --wait` waits until it's on `main`.
3. `main` refuses direct pushes (the pre-push hook here, a ruleset on GitHub). `main` auto-deploys, so it must always be playable. After shipping, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main` anyway (two PRs that pass alone but break together), Claude opens a fix PR automatically and it merges when green. If you're around, fixing it beats starting something new; revert if the fix isn't quick.
5. Want a review first? Push a branch and open a draft PR, or add the `no-automerge` label. Ask `@claude` or a friend to review.
6. Changes to networking, world sync and saves, the server, CI or dependencies (`src/net/`, `src/netplay/`, `src/world/`, `src/sim/`, `server/`, `scripts/`, `.github/`, `eslint.config.js`, `package*.json`) wait for the owner's approval unless the owner made them: the PR gets a `needs-owner` label and a comment listing the files, and merges as soon as the owner approves its latest commit with CI green. Everything else still merges itself.

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

Open this repository in Codex. `AGENTS.md` is the shared entry point; `.agents/skills` is a committed relative symlink, so the same skills are available in a fresh worktree. There is no separate Codex copy to maintain. Read `src/README.md` for the code map, `docs/game-design.md` for what is built, and `docs/proposals/boogle-2.md` before design work.

Use a worktree for an independent task and install dependencies there. For automatic setup in the desktop app, configure a project local environment with the following setup script after making Node 24 available to its shell:

```sh
npm ci
npx playwright install chromium
```

Use the Linux browser-install command above on Linux. The app saves the generated environment configuration under `.codex/`; it can be committed for the team. This is optional desktop configuration, not a prerequisite for CLI tasks. See [OpenAI's local environment documentation](https://learn.chatgpt.com/docs/environments/local-environment).

Useful desktop actions are `npm run dev`, `npm run check` and `npm run look -- --view hill`. The look harness starts and stops its own local stack on free ports and writes to `.look/`, so it does not need an already-running dev server. A default hill capture checks startup. For a visual change, name the question with `--question`, frame the feature, use `--action` after setup/warm-up and inspect the still and sheet; add `--video` for real-time motion. Heatmaps are optional (`--heatmap --region x,y,w,h`). The command fails on page/console errors or stopped game frames; a successful capture still needs a visual judgment (the shared `look` skill).

Claude's edit hooks do not run in Codex: format the files you changed with `npx prettier --write <files>`, and run `npx eslint <changed TypeScript files>`. Do not format the whole repository. If a sandbox blocks setup or checks, request access for that command. In particular, `npm ci` can install dependencies successfully while its `prepare` step reports a Git config permission error; verify `git config --get core.hooksPath` is `.githooks`, and rerun `npm run prepare` with the required access if it is not.

Commit only the task's files and use `SHIP_NO_AI=1 npm run ship` for Codex-managed conflict resolution. This uses the same `ship/` branch, CI and owner-gate workflow as every other agent. Follow [AGENTS.md](AGENTS.md#shipping) for review and verification, and distinguish a pushed branch from a verified merge or deployment in the handoff.
