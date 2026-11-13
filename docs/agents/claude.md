For Claude setup, skills, delegation, bot runs or GitHub Actions, read the relevant section here.

## Claude Code only

### Setup

- `.claude/settings.json` (shared): allowlist for routine npm/git commands, denies force-push and `--no-verify`, and a hook (`.claude/hooks/format-lint.ts`) that runs Prettier on each file you edit (plus the full lint runner for JS and TS: Oxlint, type-aware rules and Boogle's parser protections). Lint errors come back to you; fix them. Personal tweaks go in `.claude/settings.local.json` or `CLAUDE.local.md` (both gitignored).

### Project skills

- `/orchestrate`: run the studio loop (decide, dispatch Codex jobs, review, merge, playtest cycle, record the owner's calls). State lives in [orchestrator-state](orchestrator-state.md).
- `/ship`: commit and ship with `npm run ship`.
- `/simplify` is the cleanup pass and `/code-review` the code review required by docs/agents/shipping.md, "Shipping" (procedure: docs/agents/shipping.md).
- `/new-feature <name>`: one self-contained plug-in in `src/features/`.
- `/brainstorm <name> <idea>`: flesh out a seeded idea before it's built. Light by default (one agent, three lenses: play designer, systems architect, creative director); `--panel` runs three panelists for a big new area. Models per `npm run models`. It writes `docs/brainstorms/<name>.md` with suggestions and at most five open questions, and the brief goes straight to building. `/idea` still parks a line without any of that. The `planner` and `implementer` agents remain for when the owner asks for a written plan.
- `/look`: see the running game (stills, motion, scenarios). Use it for any visual, feel, physics or multiplayer change.
- `/asset-author`: measured small props and rigid attachments, canonical Blender recipes, built-GLB inspection and Buddy stage review.
- `/concept-art`: painted concept images from prompts (`npm run concepts`, OpenAI key or Codex CLI) for design exploration.
- `/codex`: hand a job to Codex (GPT-6.1-Sol by default, Astra for the hardest calls, on the owner's subscription): previz of a prototype or effect at its idealized look, a research doc, a second-opinion review, or a self-contained task on its own branch.
- `/architecture-review`: read-only check for architecture drift, at most three findings; decisions go in `docs/architecture-review/ledger.md`.
- `/idea <text>`: park an idea for later in `docs/ideas.md`.
- `/video`: clips, GIFs, trailers and patch-notes videos. `/playtest-notes`: log a play session to `docs/playtests.md`.
- Reference skills load on their own when relevant: `threejs-*`, `game-feel`, `camera-systems`, `audio-design`. The `threejs-*` skills cover WebGL and WebGPU; Boogle is WebGPU + TSL only, so use their WebGPU/TSL parts and [src/render/README.md](../../src/render/README.md). Codex sees these skills through the `.agents/skills` symlink, so keep them in `.claude/skills`.

### Codex: bot runs, visual checks and follow-ups

Which model does which work is in `npm run models` ([models](models.md)); in normal mode (Claude only) use Claude subagents instead of Codex. The complete command and evidence
contract is [dev/codex/README.md](../../dev/codex/README.md); visual framing and motion guidance is in
[the look skill](../../.claude/skills/look/SKILL.md). Run the launcher in the background with Bash `run_in_background: true`.

From the checkout containing the work, start a job with a unique topic:

```sh
node dev/codex/run.ts task inspect-forge --base-ref HEAD --model gpt-6.1-sol --effort medium "Run the place bot, inspect the forge reveal from its checkpoint, open the images, and report failures and visual findings. Do not change source."
```

Use `--snapshot` instead of `--base-ref HEAD` only when the job should include uncommitted work; it includes all
nonignored untracked files too. Choose Astra for harder work. Ask the worker to use its already-running broker:

```sh
node .look/see-client.ts playthrough
node .look/see-client.ts look --at list
node .look/see-client.ts look --at "forge lit" --curves --question "Does the forge read clearly at its reveal?"
node .look/see-client.ts scenario world-inputs
```

Read `.look/codex/<topic>/handoff.md`, `report.md` and `evidence.json`. Require the worker to open the PNGs, name what it
saw and report failed or stale runs. A passing capture proves execution health; bot completion, visual quality and
real-time feel are separate findings. Use `--action` to exercise the feature and `--video` for motion evidence; sampled
frames and curves cannot establish smoothness. Repeat affected checks after fixes; don't edit source during a run.

Send feedback from the **original launching checkout**, after the previous turn finishes:

```sh
node dev/codex/run.ts resume inspect-forge "Improve the framing, inspect the new images, and rerun the affected checks."
```

This keeps the session, worktree and bot checkpoints, restarts the broker, and archives earlier reports in `turns/`.
Keep the worktree and local Codex session until follow-ups are done. Never use global `--last` to select a job. Caller
edits aren't recopied on resume: describe the fix or start a new snapshot job. Review the returned diff and evidence,
then ship through the normal workflow; Codex task workers commit but don't push or ship themselves.

For a direct local check outside a Codex worker, `/look` documents `npm run playthrough`, `npm run look -- --at list`,
targeted captures and `npm run session -- start` for interactive inspection. A live **game** session is separate from
resuming a Codex **conversation**. Sandboxed task workers use the broker commands above for browser checks.

### Working in parallel

- One session directs; implementation runs in parallel. A **subagent** (Agent tool, `isolation: "worktree"`, model and effort per `npm run models`) suits one piece whose result the director reviews in the same sitting; subagents can't start their own. A **session** of its own (one per track, in its own worktree) can run its own subagents and lasts across days; use it for a track like a prototype.
- Give each agent a concrete stage and include the files, errors and decisions in its brief. Resume the same Codex job for feedback, fixes and repeated checks; use a new job for independent work or a new starting snapshot.
- Each worker sees its own result (docs/agents/verification.md, "See it before you ship", required by AGENTS.md). The director reviews Codex task reports, diffs and stills before shipping their commits; other workers follow their assigned shipping workflow.
- Research before deep facets (docs/agents/owner-calls.md, "Owner's standing calls") runs as a deep-research subagent.

### As the GitHub Action (`@claude` in `claude.yml`, or `ci-autofix.yml`)

- `npm ci && npm run check` before committing (`check:full` per docs/agents/tests.md, "Tests"). The runner has no GPU, so `check:gpu` (smoke) can't run there; for networking or rendering changes say so in the PR, and the live smoke after the deploy (`smoke.yml`) is the check.
- Push a `claude/<topic>` branch and open a non-draft PR with `gh pr create` (docs/agents/shipping.md, "Shipping", required by AGENTS.md): imperative title; body says what changed and which DESIGN.md principle it serves, plus a screenshot (`scripts/pr-shot.sh`) for anything a player can see.
