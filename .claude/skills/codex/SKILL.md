---
name: codex
description: Hand work to Codex CLI (GPT-6-Astra, on the owner's ChatGPT subscription) and review what comes back. Previz of a prototype, game moment or effect at its idealized look; deep research docs; a second-opinion code review; or a self-contained task on its own branch. Use when the user says /codex, asks to use Codex or Astra, wants previz or a visual brainstorm of how something could look, or wants work spread across their Codex usage.
---

# Codex jobs

Jobs outlive the session that started them. A director runs `npm run codex-status` first to find running and finished jobs.

For exact-build handoffs and gameplay evidence, see [dev/codex/README.md](../../../dev/codex/README.md).
Task jobs accept `--base-ref HEAD` (or another commit/branch) and `--snapshot` (the caller's working files, leaving its
index untouched). Default remains `origin/main`. Each job installs its own dependencies. The returned `handoff.md` links
the worker's assessment, machine evidence and copied artifacts; read it before shipping. A snapshot includes unfinished
caller changes: review those too.

For follow-up feedback, run `node dev/codex/run.ts resume <topic> "<feedback and checks to repeat>"` in the original
launching checkout, in the background as before. This keeps the explicit session ID, conversation, worktree and bot
checkpoints, and restarts the broker. Review the latest handoff after every turn; previous reports are in `turns/` and
earlier failures remain in the evidence. Keep the worktree and local Codex session until done. Do not start a new topic
or use `codex exec resume --last` for a follow-up. Caller edits aren't recopied; describe the fix or start a new snapshot.

The worker's `.look/see-client.ts` supports `playthrough`, `look` and named existing `scenario` operations. Ask it to run the
relevant bot, open the generated PNGs, explain what it saw, and report failures and unverified feel. `look --at` reads this
job's own bot checkpoints. The broker is already running; the worker should not start another or run Chromium directly.

From inside Codex this is how you start a worker on its own branch and worktree: run it in the background and carry on.

`node dev/codex/run.ts <mode> <topic> [--effort ...] [--ref a.png] "<brief>"` runs one Codex job and prints its final message. Always start it with Bash `run_in_background: true` (jobs take 5-40 minutes) and carry on; you're notified when it ends. Log, report and meta: `.look/codex/<topic>/`. `--dry` prints the prompt and command without running.

Codex reads AGENTS.md and DESIGN.md like you do, and can't push. A `task` job can see the game through `node dev/codex/see.ts` (below): stills, motion sheets, video as extracted frames, curves, and scripted play through `--action`. You are the director: brief it, then review and ship what it made.

| Mode | Effort default | Where it works | What you get |
|---|---|---|---|
| `previz` | medium (`high` for a hard art-direction call) | `.look/previz/<topic>/` (gitignored) | `shot-<n>.png` (`--shots`, default 4) and `board.md`: pitch, per-shot camera, light, palette, the prompt, and how we'd build it in TSL, particles and post |
| `research` | xhigh, live web search | worktree `../boogle-codex/<topic>`, branch `codex/<topic>` | `docs/research/<topic>.md` committed, not pushed |
| `task` | high | same worktree setup | commits on `codex/<topic>`, `npm run check` run, not pushed |
| `review` | xhigh | detached worktree at `--ref-branch` (default HEAD) | `codex exec review` against `origin/main`; an optional brief focuses it |

Effort: previz is mostly image prompts, so `medium` (or `high`) is enough; `xhigh` for research and review; `high` for implementation; `max` only for one hard question. For straightforward implementation with a clear shape, use `--model gpt-6.1-terra --effort low` first (AGENTS.md, "Codex first").

## Previz

Previz is not concept art: it pictures *this* game at its best (DESIGN.md, the real places and characters, the game's camera), pushed in light, colour, composition and juice, and stays buildable in our renderer. Use it before building a prototype or effect, to pick a direction, or to brainstorm several looks for one moment.
1. Grab what the game looks like today with `/look` at a pose that frames the subject (`BOOGLE_QUERY='proto=<id>'` for a prototype) and pass the still as `--ref`, so Codex raises today's look instead of inventing another game.
2. Brief the moment, not the picture: what the player does, the feel target, and what to vary across shots ("3 alternative directions for the dig splash", or "a sequence: pull away, mid-ride, jump off").
3. Read every `shot-<n>.png` and `board.md`. Show the user the board (an artifact or the PNGs), with your own one-line take per shot on what's worth chasing.
4. Previz never ships and is never committed. What carries over is the "how we'd build it" notes: cite them in the plan or brief for the build.

## Research, task, review

Put what you already know in the brief (paths, errors, the snippet, the decision), so it doesn't explore the repo again; its report is all that comes back into your context, so ask for a short one.

- Research: name the facet and the questions. Read the doc when it lands; it ships like any other change (from the worktree: `npm run ship`).
- Task: lockstep logic with tests (`src/sim/`, rules), JS-to-TS conversion, tooling, docs, and visuals it can judge from stills and motion sheets. Not feel: it reads frames and numbers, and doesn't play or watch in real time. A task's sandbox can't start Chromium, so `dev/codex/see.ts` runs the job's server and Vite inside it, and `dev/codex/look-broker.ts`, started by `run.ts`, runs this checkout's harness and the browser outside it. That takes network access in the job's sandbox; the brief limits it to the local server, and `--eyes off` turns it all off. Before starting, `npm run inflight` so it doesn't collide with in-flight work. Read its diff (`git -C ../boogle-codex/<topic> log -p origin/main..`), run `/look` yourself if a player could see it, then ship from the worktree.
- Review: run it on branches touching `src/world/`, `src/net*`, `src/sim/` or `server/` before shipping. Verify each finding against the code before acting on it.

Clean up a finished worktree with `git worktree remove ../boogle-codex/<topic>` (and `git branch -D codex/<topic>` once it's merged).

Run a queue with `npm run queue -- jobs.json [--max 3]`; dependencies can name another topic or `{ "onMain": "path" }`. It exits on failure, stall, or a Codex usage limit.

Use `--base <ref>` (also `--base-ref`) to start a task at an existing commit or branch.
