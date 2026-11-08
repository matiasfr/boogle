For Codex work, read this tool mapping before using tools.

### Codex

Codex can do what Claude Code does here; `.codex/` sets it up (config, `rules/boogle.rules`, `hooks.json`, `agents/`, the desktop app's `environments/`). Setup details: [CONTRIBUTING.md](../../CONTRIBUTING.md#codex-local-and-worktree-tasks).

- **Running things.** `.codex/rules/boogle.rules` lets the project's commands run outside the sandbox with no prompt: `look`, `playthrough`, `check`, `ship`, Git, `gh`. A rule only sees plain commands, or pipes into `tail`, `grep` and the like. A leading `X=1` or a `> file` stays in the sandbox, where Chromium can't start and a worktree's Git can't write: use `--query` instead of `BOOGLE_QUERY`, and pipe instead of redirecting.
- **Seeing.** Open PNGs with `view_image`. You can't watch a video: judge motion from the motion sheet and `--curves`, and say that real-time motion is unverified.
- **Claude's names.** `/look` is `npm run look`, `/ship` is `npm run ship`, a skill's `$ARGUMENTS` or `$0` is the user's task text or feature name, "Read" a PNG means `view_image`. `/simplify` means review and simplify the diff; `/code-review` means Codex's `/review`. Claude agent and model names aren't Codex's: `.codex/agents/` has `planner` and `implementer`, which read the same briefs, keeping the plan's approval gate.
- **Parallel work.** For a piece reviewed in the same sitting, spawn a subagent; it shares this checkout, so give it files no one else is touching. For a track on its own branch and worktree, the way a Claude worker uses `isolation: "worktree"`: `node dev/codex/run.ts task <topic> "<brief>"` (the `codex` skill), then review and ship it. Use `--base-ref` for a committed branch or `--snapshot` for the caller's working files. The provided `.look/see-client.ts` supports captures, bot playthroughs and existing scenarios through the browser broker; read `handoff.md` before shipping ([dev/codex/README.md](../../dev/codex/README.md)).
- **Checkouts.** Start with `git status --short --branch`. Use Node 26 (`.nvmrc`). A fresh checkout needs `npm ci`, which includes the server's dependencies and the pre-push hook; the desktop app and `run.ts` do this for their worktrees. Don't share `node_modules`, Vite caches or `.boogle-data/` between active checkouts. Run `npm run inflight` before substantial work; don't reset, stash or commit someone else's changes.
- **Formatting.** If the format hook hasn't run on your edit, run `npx prettier --write <your files>` and `npm run lint -- <your files>`, or use `npm run patch`. The lint runner includes Oxlint, type-aware rules and Boogle's parser protections.
- **Test diet.** It applies if an older skill asks for broader tests: use the `look` harness, with no new UI unit tests or scenarios unless a sync contract needs one.
- **Pick checks first.** `npm run checks-for` prints the diff's minimum plan; `-- --run` executes it through the broker.
  Workers can and should run `node .look/see-client.ts net` for sync/server changes (`npm run test:net`), and
  `node .look/see-client.ts perf` for performance changes (`npm run perf`). The broker runs trusted harnesses
  against the worker's tree, shares the bot queue, and returns manifests with status, logs, artifacts and commit/tree.
  `net` accepts no flags; `perf` accepts `--render`, `--sim`, `--hardware`, `--seconds`, `--view`, `--size` and `--query`.
  The broker owns perf's JSON output path. Timings still require a quiet machine.
  Read [bot checks](test-details/bot-segments.md) for segments and fixtures. Worker harness edits need a reviewed launcher
  restart; a broker rejecting new flags leaves that browser proof unverified. Never bypass it with Chromium.
- **Shipping.** `npm run ship` hands a rebase conflict back to you rather than starting Claude Code. Resolve it keeping both changes and rerun. A push, green CI, merge and deployment are separate states; report only the ones verified.

Codex discovers AGENTS.md only along the path from the repository root to its working directory; touching a deeper file does not load its nested instructions. Root-started workers must follow the root trigger table and explicitly read the matching nested AGENTS.md. Claude path rules provide matching-file pointers; none are launch imports.
