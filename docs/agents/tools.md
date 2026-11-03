Before using tools or writing a shot, script or workaround, read this tool table.

## Tools and skills
Start ownership discovery with `npm run map -- --kind <kind>` (bare `--kind` lists routes); `--docs <text>` searches docs with authority labels and current replacement pointers.
Before using tools or writing a shot, script or workaround, read the table and details in [docs/agents/tools.md](tools.md#tools-and-skills). Codex work also requires its [Codex section](codex.md#codex).

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
