# Tool procedures

Binding procedures routed by [AGENTS.md](AGENTS.md#required-reading-by-task). Read Tools and skills before using tools or writing a shot, script or workaround; Codex work also reads Codex. Paths are relative to the repository root.

## Tools and skills
Start ownership discovery with `npm run map -- --kind <kind>` (bare `--kind` lists routes); `--docs <text>` searches docs with authority labels and current replacement pointers.
**Check here before writing a shot, a script or a workaround.** Details: `.claude/skills/look/SKILL.md`.
| You want to | Use |
|---|---|
| See a beat of the run | `npm run look -- --at "<beat>"` (`--at list` names them); warm-ups are warped, so `--warm` costs little |
| Pacing, what never happened, on-screen text | `npm run playthrough` (about 90 s); new beats go in `dev/look/bots/place.ts` |
| Ask several questions of the running game | `npm run session -- start`, then `keys`, `press`, `state`, `still` (under a second each) |
| Judge motion or feel from evidence | `look --curves`, `--target glide`; `look --filmstrip N` for exact frames |
| Compare with an earlier build | `npm run before-after -- <ref>` |
| Two players | `look --players 2` (warped at 5x) |
| Know a folder without reading it | `npm run map -- <folder>`, then `grep` and line ranges |
| Make many edits at once | `npm run patch -- <file>` |
| See where a session's time and tokens went | `npm run transcript -- <id>` |

- `npm run friends-report -- [--since YYYY-MM-DD]` lists friends’ merged PRs and flags sensitive paths; it remembers the last report date in `.look/`.
- `npm run transcript -- <path|id>` summarizes a finished Claude or Codex session; `--latest claude|codex`, `--compare a b`, and `--json` select other views.
- `.agents/skills` links to `.claude/skills`, so Codex and other agents that read it get the same skills: the workflows plus `threejs-*` (use the WebGPU/TSL parts), `game-feel`, `camera-systems` and `audio-design`. They're written for Claude Code; "Codex" below maps the names.
- `npm run concepts`: painted concept images. `npm run clip`, `npm run reel`: clips and trailers. `npm run playtest`: what `?proto=` sessions did, uploaded on their own (`-- latest` prints the summary and a heat map; prototypes add beats with `playMark` from `src/proto/mark.ts`). `npm run verdicts`: the owner's notes from the prototype bar; read them from a checkout with the token rather than asking the owner to paste them.
- `npm run patch -- <file>`: many edits across files in one go. Nothing is written if any edit's text is missing or appears twice, then it runs Prettier, ESLint and a typecheck. Use it instead of a throwaway script, whose `replace` misses in silence and which skips the format hook. The format is at the top of `dev/patch.ts`.
- One Mac GPU is shared: `look` runs are fine in parallel but slower; `perf` and `hitches` numbers need the machine to themselves.

### Codex
Codex can do what Claude Code does here; `.codex/` sets it up (config, `rules/boogle.rules`, `hooks.json`, `agents/`, the desktop app's `environments/`). Setup details: [CONTRIBUTING.md](CONTRIBUTING.md#codex-local-and-worktree-tasks).
- **Running things.** `.codex/rules/boogle.rules` lets the project's commands run outside the sandbox with no prompt: `look`, `playthrough`, `check`, `ship`, Git, `gh`. A rule only sees plain commands, or pipes into `tail`, `grep` and the like. A leading `X=1` or a `> file` stays in the sandbox, where Chromium can't start and a worktree's Git can't write: use `--query` instead of `BOOGLE_QUERY`, and pipe instead of redirecting.
- **Seeing.** Open PNGs with `view_image`. You can't watch a video: judge motion from the motion sheet and `--curves`, and say that real-time motion is unverified.
- **Claude's names.** `/look` is `npm run look`, `/ship` is `npm run ship`, a skill's `$ARGUMENTS` or `$0` is the user's task text or feature name, "Read" a PNG means `view_image`. `/simplify` means review and simplify the diff; `/code-review` means Codex's `/review`. Claude agent and model names aren't Codex's: `.codex/agents/` has `planner` and `implementer`, which read the same briefs, keeping the plan's approval gate.
- **Parallel work.** For a piece reviewed in the same sitting, spawn a subagent; it shares this checkout, so give it files no one else is touching. For a track on its own branch and worktree, the way a Claude worker uses `isolation: "worktree"`: `node dev/codex/run.ts task <topic> "<brief>"` (the `codex` skill), then review and ship it. Use `--base-ref` for a committed branch or `--snapshot` for the caller's working files. The provided `.look/see-client.ts` supports captures, bot playthroughs and existing scenarios through the browser broker; read `handoff.md` before shipping ([dev/codex/README.md](dev/codex/README.md)).
- **Checkouts.** Start with `git status --short --branch`. Use Node 24 (`.nvmrc`). A fresh checkout needs `npm ci`, which includes the server's dependencies and the pre-push hook; the desktop app and `run.ts` do this for their worktrees. Don't share `node_modules`, Vite caches or `.boogle-data/` between active checkouts. Run `npm run inflight` before substantial work; don't reset, stash or commit someone else's changes.
- **Formatting.** If the format hook hasn't run on your edit, run `npx prettier --write` and `npx eslint` on the files you changed, or use `npm run patch`.
- **Test diet.** It applies if an older skill asks for broader tests: use the `look` harness, with no new UI unit tests or scenarios unless a sync contract needs one.
- **Shipping.** `npm run ship` hands a rebase conflict back to you rather than starting Claude Code. Resolve it keeping both changes and rerun. A push, green CI, merge and deployment are separate states; report only the ones verified.
