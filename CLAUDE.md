@AGENTS.md

## Claude Code only

### Setup
- `.claude/settings.json` (shared): allowlist for routine npm/git commands, denies force-push and `--no-verify`, and a hook (`.claude/hooks/format-lint.mjs`) that runs Prettier on each file you edit (plus ESLint for JS and TS). Lint errors come back to you; fix them. Personal tweaks go in `.claude/settings.local.json` or `CLAUDE.local.md` (both gitignored).

### Project skills
- `/ship`: commit and ship with `npm run ship`.
- `/simplify` before shipping a change over ~3 files or ~150 lines (PRs merge without review, so this is the cleanup pass); add `/code-review` for `src/net*`, `src/world/` or `server/`. Skip both in the GitHub Action flows below.
- `/new-feature <name>`: one self-contained plug-in in `src/features/`.
- `/feature <name> <request>`: for work spanning several files or shared state. The `planner` agent writes `docs/plans/<name>.md`, you wait for approval, then the `implementer` agent builds it.
- `/look`: see the running game (stills, motion, scenarios). Use it for any visual, feel, physics or multiplayer change.
- `/concept-art`: painted concept images from prompts (`npm run concepts`, OpenAI key or Codex CLI) for design exploration.
- `/codex`: hand a job to Codex (GPT-6-Astra on the owner's subscription): previz of a prototype or effect at its idealized look, a research doc, a second-opinion review, or a self-contained task on its own branch.
- `/idea <text>`: park an idea for later in `docs/ideas.md`.
- `/video`: clips, GIFs, trailers and patch-notes videos. `/playtest-notes`: log a play session to `docs/playtests.md`.
- Reference skills load on their own when relevant: `threejs-*`, `game-feel`, `camera-systems`, `audio-design`. The `threejs-*` skills cover WebGL and WebGPU; Boogle is WebGPU + TSL only, so use their WebGPU/TSL parts and [src/render/README.md](src/render/README.md).

### Working in parallel
- One session directs; implementation runs in parallel. A **subagent** (Agent tool, `isolation: "worktree"`, Opus at medium effort) suits one piece whose result the director reviews in the same sitting; subagents can't start their own. A **session** of its own (one per track, in its own worktree) can run its own subagents and lasts across days; use it for a track like a prototype.
- Split work so tracks don't touch the same files; `npm run inflight` shows what's in flight. Owner-gated paths go in their own small PRs.
- Each worker sees its own result before shipping (AGENTS.md, "See it before you ship") and ships itself. The director reads the diff and the stills afterwards.
- A facet with real depth (level design, vehicle handling, rendering, construction, pipelines) gets a deep-research subagent first: web sources, GDC talks, postmortems, summarised in `docs/research/<topic>.md` with sources and numbered recommendations. Builders cite it.
- One Mac GPU is shared: `/look` runs are fine in parallel but slower; `perf` and `hitches` numbers need the machine to themselves.

### As the GitHub Action (`@claude` in `claude.yml`, or `ci-autofix.yml`)
- `npm ci && npm run check` before committing (`check:full` per AGENTS.md, "Tests"). The runner has no GPU, so `check:gpu` (smoke) can't run there; for networking or rendering changes say so in the PR, and the live smoke after the deploy (`smoke.yml`) is the check.
- Push a `claude/<topic>` branch and open a non-draft PR with `gh pr create` (AGENTS.md, "Shipping"): imperative title; body says what changed and which DESIGN.md principle it serves, plus a screenshot (`scripts/pr-shot.sh`) for anything a player can see.
