@AGENTS.md

## Claude Code only

### Setup
- `.claude/settings.json` (shared): allowlist for routine npm/git commands, denies force-push and `--no-verify`, and a hook (`.claude/hooks/format-lint.ts`) that runs Prettier on each file you edit (plus ESLint for JS and TS). Lint errors come back to you; fix them. Personal tweaks go in `.claude/settings.local.json` or `CLAUDE.local.md` (both gitignored).

### Project skills
- `/ship`: commit and ship with `npm run ship`.
- `/simplify` is the cleanup pass and `/code-review` the code review from AGENTS.md, "Shipping".
- `/new-feature <name>`: one self-contained plug-in in `src/features/`.
- `/feature <name> <request>`: for work spanning several files or shared state. The `planner` agent writes `docs/plans/<name>.md`, you wait for approval, then the `implementer` agent builds it.
- `/look`: see the running game (stills, motion, scenarios). Use it for any visual, feel, physics or multiplayer change.
- `/concept-art`: painted concept images from prompts (`npm run concepts`, OpenAI key or Codex CLI) for design exploration.
- `/codex`: hand a job to Codex (GPT-6-Astra on the owner's subscription): previz of a prototype or effect at its idealized look, a research doc, a second-opinion review, or a self-contained task on its own branch.
- `/architecture-review`: read-only check for architecture drift, at most three findings; decisions go in `docs/architecture-review/ledger.md`.
- `/idea <text>`: park an idea for later in `docs/ideas.md`.
- `/video`: clips, GIFs, trailers and patch-notes videos. `/playtest-notes`: log a play session to `docs/playtests.md`.
- Reference skills load on their own when relevant: `threejs-*`, `game-feel`, `camera-systems`, `audio-design`. The `threejs-*` skills cover WebGL and WebGPU; Boogle is WebGPU + TSL only, so use their WebGPU/TSL parts and [src/render/README.md](src/render/README.md). Codex sees these skills through the `.agents/skills` symlink, so keep them in `.claude/skills`.

### Working in parallel
- One session directs; implementation runs in parallel. A **subagent** (Agent tool, `isolation: "worktree"`, Opus at medium effort) suits one piece whose result the director reviews in the same sitting; subagents can't start their own. A **session** of its own (one per track, in its own worktree) can run its own subagents and lasts across days; use it for a track like a prototype.
- Keep each agent to one stage, under about an hour, and start the next stage fresh from its handover rather than resuming it: every message re-reads the whole context, and one agent at 846k tokens used 57M in cache reads. Put the files, errors and decisions in the brief, so it doesn't have to go and find them.
- Each worker sees its own result before shipping (AGENTS.md, "See it before you ship") and ships itself. The director reads the diff and the stills afterwards.
- Research before deep facets (AGENTS.md, "Owner's standing calls") runs as a deep-research subagent.

### As the GitHub Action (`@claude` in `claude.yml`, or `ci-autofix.yml`)
- `npm ci && npm run check` before committing (`check:full` per AGENTS.md, "Tests"). The runner has no GPU, so `check:gpu` (smoke) can't run there; for networking or rendering changes say so in the PR, and the live smoke after the deploy (`smoke.yml`) is the check.
- Push a `claude/<topic>` branch and open a non-draft PR with `gh pr create` (AGENTS.md, "Shipping"): imperative title; body says what changed and which DESIGN.md principle it serves, plus a screenshot (`scripts/pr-shot.sh`) for anything a player can see.
