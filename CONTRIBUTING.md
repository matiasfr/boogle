# Contributing to Boogle

Boogle is a friends' project: keep changes small, readable and fun. [DESIGN.md](DESIGN.md) says how we decide, [PLAN.md](PLAN.md) what we build next, and [AGENTS.md](AGENTS.md) holds the code, testing and shipping rules. AGENTS.md is written for coding agents but applies to humans too; it's short, read it once.

## Setup

Node 22 or newer (`.nvmrc`). `npm install` (also installs the pre-push hook), then `npm run dev` and open http://localhost:5173. Running our own signaling server locally, and the `?room=` / `?netdebug=1` options, are in [README.md](README.md#multiplayer).

## How we work

We're in rapid iteration: a few people (mostly through Claude Code) building and playtesting many times a day, straight on `main`.

1. **Commit to `main`, then `npm run ship`** instead of `git push`. It rebases onto what friends pushed, runs the checks, pushes, and retries if `main` moved. On a conflict it asks Claude Code to keep both changes, and the checks verify the result. We don't hand-review merges: we accept the small risk of losing a line now and then.
2. A plain `git push` to `main` is guarded by the pre-push hook: it runs `npm run check` and refuses if `main` has new commits. `git push --no-verify` skips it in an emergency.
3. `main` auto-deploys in about a minute, so it must always be playable. After shipping, open the live site in two tabs (or with a friend) and check your change.
4. If CI goes red on `main`, Claude opens a fix PR automatically and it merges when green. If you're around, fixing it beats starting something new; revert if the fix isn't quick.
5. Use a branch and PR only for risky or large changes (networking protocol, sync, persistence). Ask `@claude` or a friend to review.

## Design rules

- Every feature names the DESIGN.md principle it serves and flags any it bends (commit message body, or the PR).
- If a change conflicts with a principle, change the idea, or change the principle in DESIGN.md with the reason, in its own commit.
- Pick work from PLAN.md and tick its checkboxes in the same commit.

## Playtesting

The playtest is the real test. Whenever something new lands, jump on https://matiasfr.github.io/boogle/?room=<name> with whoever is around. Each PLAN.md phase ends with a question; jot the answer and anything fun or broken in [docs/playtests.md](docs/playtests.md) (or run `/playtest-notes` in Claude Code). File broken things with the bug report template and `?netdebug=1` logs.

## Working with AI agents

- **Claude Code** loads `CLAUDE.md`, which imports `AGENTS.md`. Committed project settings (`.claude/settings.json`) pre-approve routine commands and format/lint every file Claude edits. Skills: `/ship`, `/new-feature <name>`, `/playtest-notes`.
- **Other agents** (Codex, Cursor, ...) read `AGENTS.md` directly. Change shared rules there, never in `CLAUDE.md`.
- **On GitHub**, mention `@claude` in an issue or PR ([claude.yml](.github/workflows/claude.yml)). It opens a PR from a `claude/` branch that [automerge.yml](.github/workflows/automerge.yml) squash-merges once CI is green. Add the `no-automerge` label or ask for a draft to review first. [ci-autofix.yml](.github/workflows/ci-autofix.yml) fixes a red `main`.
- Treat AI-written code like any other: play it, skim the diff, and push back on slow or browser-based tests for things a unit test or a playtest covers.
