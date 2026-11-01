---
name: codex
description: Hand work to Codex CLI (GPT-6-Astra, on the owner's ChatGPT subscription) and review what comes back. Previz of a prototype, game moment or effect at its idealized look; deep research docs; a second-opinion code review; or a self-contained task on its own branch. Use when the user says /codex, asks to use Codex or Astra, wants previz or a visual brainstorm of how something could look, or wants work spread across their Codex usage.
---

# Codex jobs

`node dev/codex/run.ts <mode> <topic> [--effort ...] [--ref a.png] "<brief>"` runs one Codex job and prints its final message. Always start it with Bash `run_in_background: true` (jobs take 5-40 minutes) and carry on; you're notified when it ends. Log, report and meta: `.look/codex/<topic>/`. `--dry` prints the prompt and command without running.

Codex reads AGENTS.md and DESIGN.md like you do, but it can't see the running game, can't push and has no `/look`. You are the director: brief it, then review and ship what it made.

| Mode | Effort default | Where it works | What you get |
|---|---|---|---|
| `previz` | medium (`high` for a hard art-direction call) | `.look/previz/<topic>/` (gitignored) | `shot-<n>.png` (`--shots`, default 4) and `board.md`: pitch, per-shot camera, light, palette, the prompt, and how we'd build it in TSL, particles and post |
| `research` | xhigh, live web search | worktree `../boogle-codex/<topic>`, branch `codex/<topic>` | `docs/research/<topic>.md` committed, not pushed |
| `task` | high | same worktree setup | commits on `codex/<topic>`, `npm run check` run, not pushed |
| `review` | xhigh | detached worktree at `--ref-branch` (default HEAD) | `codex exec review` against `origin/main`; an optional brief focuses it |

Effort: previz is mostly image prompts, so `medium` (or `high`) is enough; `xhigh` for research and review; `high` for implementation; `max` only for one hard question.

## Previz

Previz is not concept art: it pictures *this* game at its best (DESIGN.md, the real places and characters, the game's camera), pushed in light, colour, composition and juice, and stays buildable in our renderer. Use it before building a prototype or effect, to pick a direction, or to brainstorm several looks for one moment.
1. Grab what the game looks like today with `/look` at a pose that frames the subject (`BOOGLE_QUERY='proto=<id>'` for a prototype) and pass the still as `--ref`, so Codex raises today's look instead of inventing another game.
2. Brief the moment, not the picture: what the player does, the feel target, and what to vary across shots ("3 alternative directions for the dig splash", or "a sequence: pull away, mid-ride, jump off").
3. Read every `shot-<n>.png` and `board.md`. Show the user the board (an artifact or the PNGs), with your own one-line take per shot on what's worth chasing.
4. Previz never ships and is never committed. What carries over is the "how we'd build it" notes: cite them in the plan or brief for the build.

## Research, task, review

- Research: name the facet and the questions. Read the doc when it lands; it ships like any other change (from the worktree: `npm run ship`).
- Task: give it work that doesn't need eyes on the game: lockstep logic with tests (`src/sim/`, rules), JS-to-TS conversion, tooling, docs. Not visuals or feel. Before starting, `npm run inflight` so it doesn't collide with in-flight work. Read its diff (`git -C ../boogle-codex/<topic> log -p origin/main..`), run `/look` yourself if a player could see it, then ship from the worktree.
- Review: run it on branches touching `src/world/`, `src/net*`, `src/sim/` or `server/` before shipping. Verify each finding against the code before acting on it.

Clean up a finished worktree with `git worktree remove ../boogle-codex/<topic>` (and `git branch -D codex/<topic>` once it's merged).
