# Claude → Codex → gameplay evidence

Run from the checkout whose tools you want to use. `run.ts` starts a worker and its browser broker; it never pushes.
At launch it warns loudly if this checkout is behind the locally known `origin/main` in `dev/` (with the commit
count) or has uncommitted `dev/` paths, including untracked tools. It still launches. The warning suggests using
an up-to-date checkout: a newer worker build does not update the launcher's trusted broker or bots. It prints in
the caller before detaching, and repeats in the supervisor log after any normal fetch. The warning
does not fetch; ordinary launches keep their existing fetch behavior, while dry runs and resumes remain offline.

```sh
# A committed Claude branch, rather than origin/main (which remains the default).
node dev/codex/run.ts task inspect-forge --base-ref HEAD "Evaluate the forge reveal. Run the bot, inspect its checkpoint and report what reads clearly."

# Exactly the caller's current working files, without changing its index, branch or files.
node dev/codex/run.ts task inspect-wip --snapshot "Evaluate this working version. Do not change source. Run the place bot, inspect the forge checkpoint, and report findings."
```

Give every new job a new topic; use `resume` for follow-up work on the same job. `--snapshot` uses HEAD plus tracked changes/deletions and nonignored untracked files; it cannot
be combined with `--base-ref`. Ignored assets are not copied. It creates a snapshot commit on the worker's branch, not the
caller's. Review that snapshot along with the worker's changes before shipping: it contains the caller's unfinished work.
`meta.json` records the selected source ref and exact starting commit. Dependencies are installed separately from that
build's lockfile. Don't edit the caller while a snapshot is being made; detected changes stop it rather than mix versions.

## Jobs outlive sessions

Every job (including `resume`) runs in a detached supervisor, reparented to launchd, with its own session. Closing or
killing the caller leaves the worktree setup, Codex and browser broker running. The caller waits and prints the final
report and exit status; `--detach` returns once the supervisor starts. `--dry` starts nothing. Supervisor output goes to
`.look/codex/<topic>/launcher.txt`. Atomic `meta.json` updates include the supervisor `pid`, `codexPid`, `brokerPid`,
`state`, timestamps, exit `status` and a heartbeat every 30 seconds, starting before worktree creation and dependency setup.

Start a director session with `npm run codex-status`: it reads jobs from every Git worktree, newest first. It shows
running, stale (alive but no heartbeat for five minutes), dead (including any surviving child PIDs), failed, unknown
legacy jobs, and successful jobs finished in the last 24 hours. Use `-- --all` for history and `-- --json` for machine
output. This command only reads; nothing watches jobs between sessions. Stop a job with `kill <pid>` using the supervisor
PID from metadata or JSON status: it stops Codex and the broker and records exit 130. SIGINT does the same. A forced
`kill -9` cannot clean up; status lists surviving children so you can inspect them before resuming.

## Follow-up feedback

From the original launching checkout, after the job finishes:

```sh
node dev/codex/run.ts resume inspect-forge "The forge is cropped in the capture. Fix the framing, inspect the new PNGs, and rerun the affected checks."
```

This resumes the recorded **session ID**, with the same conversation, worktree, branch, files and bot checkpoints. It
restarts the browser broker and reminds Codex to fix the feedback and repeat affected checks. It never chooses the CLI's
global `--last` session, fetches a new build, or resets the worker. Caller edits made since the original handoff aren't
copied into the worker: describe the needed changes in the feedback, or start a new snapshot job.

The model, effort and permissions carry forward; optionally override `--model` or `--effort`. `--dry` previews the exact
resume command. Task, research and previz jobs can resume; review jobs need a new task for fixes. Keep the original
worktree/output folder and local Codex session storage until follow-ups are finished. Older jobs can resume if their
`log.txt` contains the CLI's explicit `session id:` header.

Only one launcher can run a job at once. A failed turn with a recorded session ID can resume too. `resume` automatically
reclaims `.look/codex/<topic>/active/` when its recorded PID is dead; live locks still fail immediately. Interrupted browser
requests return a failure on restart; ask Codex to rerun them.

Latest reports remain at the job root. Before each follow-up replaces them, the prior turn's metadata, feedback, report,
log, JSON events and evidence summary are preserved under `turns/001/`, `turns/002/`, etc. Copied capture artifacts stay
in the shared `evidence/` directory. The latest handoff includes earlier runs too, marking those whose source tree no
longer matches. A later pass doesn't erase an earlier failure.

Run jobs in the background in Claude Code. The worker receives `.look/see-client.ts`, a copy of the launcher's client, so
even an older `--base-ref` can use today's broker. From the worker's checkout:

```sh
node .look/see-client.ts playthrough
node .look/see-client.ts look --at list
node .look/see-client.ts look --at "forge lit" --hud --question "Can I see what the train delivery built?"
node .look/see-client.ts scenario world-inputs
node .look/see-client.ts net
node .look/see-client.ts perf
```

`dev/codex/see.ts` is the same client in an updated checkout. Omitting `look` keeps its old capture syntax working.

- **Playthrough:** runs the full existing bot. `--query`, `--eval`, `--stall` and `--full` are accepted. Each run gets its own
  reports, session, bot log, end still and saved checkpoints. Missing expected beats, runtime errors and stopped frames
  fail the operation. A failed run still returns its evidence. Bot pathfinding can vary: preserve a failure and rerun
  before calling it a consistent gameplay regression.
- **Look:** accepts the normal capture/action/curve options, including `--query`. `--at` reads the most recent playthrough
  from **this job**, including a partial failed run; `--saves <directory>` selects another run explicitly. Never infer
  full completion from a checkpoint. Open the images with `view_image` and state the observation separately from status.
  Frame-exact `--filmstrip` remains a direct-harness operation: it does not support the broker's `--url` transport.
- **Scenario:** accepts names of existing scenarios from the launcher's trusted checkout, plus `--no-trace`. It runs them
  against the worker's game and server. New or edited worker scenario code does not execute outside the sandbox; promote
  it through the normal review workflow first. A scenario may need a matching build's interfaces.
- **Net:** run for sync or server changes. Runs the trusted `test:net` harness with its browser probe bundled against
  the worker's `src/`. The worker's server runs inside its sandbox; a loopback control endpoint lets the trusted test
  start, save, restart and stop it. Accepts no flags or `WS_LOAD` runs. The normal standalone `npm run test:net` is unchanged.
- **Perf:** run for performance changes. Runs the trusted `perf` harness against the worker's running game. Accepts
  `--render`, `--sim`, `--hardware`, `--seconds`, `--view`, `--size` and `--query`. The broker saves render counts in
  `render.json` (unless sim-only) and all console tables in `output.txt`. Workers cannot choose `--json` output paths.
  Timings require a quiet machine; counts and successful execution alone do not establish device performance.

Both operations use the machine-wide bot queue and the same commit/tree, status, log and artifact manifests as captures.
The copied client supports them even when the worker's build predates these broker operations. Harness changes still
need a reviewed launcher restart; never run a worker-edited harness outside the sandbox.

The broker owns `--url`, `--root`, `--data-dir` and `--out`. The worker starts Vite and the game server in its sandbox;
the trusted launcher's harness runs Chromium on the local GPU. Only page eval/action code crosses into the browser.
Operations have a seven-minute timeout. Do not edit source or launch simultaneous commands while collecting evidence.

`npm run cold-start -- --runs 3 --mode paired --video-probe` starts a worker-side
production build and asks an updated trusted broker for headed Metal measurements (35-minute cap). The trusted
launcher must contain `dev/cold-start.ts`; an already-running older broker reports `Unknown operation`.
`node dev/codex/see.ts look --production ...` inspects that production build through the ordinary look operation.
The [cold-start procedure](../../docs/research/water-cold-start.md) documents cache ownership, explicit failed Metal
isolation, Safari limitations, output, and owner-side commands. A completed measurement is not a proven true-cold run.

## What Claude gets

`.look/codex/<topic>/` contains:

- `report.md`: the worker's short assessment, including the images it opened, concrete visual observations, bot findings,
  and what remains unverified.
- `handoff.md`: links to that assessment and the captured evidence, with statuses and stale-build flags.
- `evidence.json`: final commit/tree plus every operation's commit/tree before and after, arguments, query, timestamps,
  exit status, artifact paths, the trusted harness's commit/tree, and whether it matches the final source tree.
- `evidence/<request>/`: copies of each run's logs, images, curves, video, reports, checkpoints and traces. These survive
  removing the worker worktree; assessment links are repointed to these copies. `output.txt` includes renderer/runtime
  diagnostics; `evidence.json` describes the run.
- `meta.json`, `log.txt` and `events.jsonl`: job provenance (including session ID, turn and feedback), full worker log,
  and CLI JSON events. The session ID is saved as soon as the CLI announces it, even if the turn subsequently fails.

Each operation also returns its manifest immediately in the worker's `.look/evidence/`. A build that changes during a run
fails verification. Committing identical files keeps the tree fingerprint, so valid evidence stays valid. Changes after
the run are flagged in the final handoff; rerun affected checks. Ignored files and external dependencies are outside this
source fingerprint.

An exit-zero capture proves execution health, not visual quality. Warped bots establish scripted completion and reveal
missed beats; they don't establish first-timer pacing or subjective feel. Sampled frames and curves don't prove real-time
smoothness. Claude reviews the evidence and uses the normal shipping workflow; no extra approval step is added here.
