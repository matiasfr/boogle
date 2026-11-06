## Pick checks from the diff

Run `npm run checks-for` before choosing browser work. It reads the local `origin/main...HEAD` diff plus staged,
unstaged and untracked files, without fetching. `-- --base <ref>` changes the comparison; `-- --json` prints a machine
plan; `-- --run` executes the printed commands sequentially and stops on failure. `-- --files a,b` previews a sample
diff and cannot execute it. This routing is a minimum: read the applicable contracts above too.

- Render/material/shader/assets changes: a restored cove still and a short cove-to-wake segment.
- `src/sim`, `src/world`, `src/net*` or `server`: co-op cove-through-T2 and the existing `world-inputs` scenario.
- Terrain/layout changes: cove-through-T1. Audio changes: three walk, jump and dry-landing repetitions (inspect/listen;
  this is action coverage, not an audio quality verdict).
- Other gameplay or browser-harness changes: cove-through-T1; docs and unrelated tooling need no browser.

`npm run checkpoints` regenerates disposable solo fixtures through the pier using current saves and real route actions;
`npm run checkpoints -- --players 2` generates the separate pair. In a broker job these use `.look/see-client.ts`.
Regenerate when the world or route changes; no old-save migrations or compatibility checks. Fixtures live under
`.look/checkpoints/{solo,coop}` and are only published after a successful regeneration. Held-item and transient animation
states are not invented: `beam-in-hand` is not a fixture because the existing durable save does not promise that state.

`playthrough --from at-cove` resumes at the machine before waking it, through T1; `--from t1-done` goes through T2;
`--from t2-funded` checks T2's laying/completion; `--from pier-ending` finishes the pier.
Add `--to wake|t1-done|t2-funded|T2|T3|jump|forge-lit|Q1|Q2|hook|Q3|Q4|Q5|glider|trains|pier-ending|Q6|pier|audio-loop`
to choose a later end. `--players 2` uses the co-op pair and coordinator. `--saves <directory>` selects fixtures explicitly.
The entry pose is restored once, progress is checked against the live owners, and earlier route actions are skipped;
there are no recovery teleports during co-op. Segment evidence does not prove a fresh full route or interruptions outside
that segment. Read `report.txt`, `verdict.json` and the images even on failure.

All harness browser launches share the machine queue at `/tmp/boogle-bots-<uid>` (across worktrees).
Default capacity is 1; set `BOOGLE_BOT_CONCURRENCY` on launchers to raise it. Use the same setting everywhere;
mixed settings take the smaller active limit. `BOOGLE_BOT_QUEUE_DIR` may select a shared path, never a per-worktree path.
The queue names the blocking job; a dead PID's unique ticket is reclaimed. Broker deadlines and co-op clock samples start
after acquisition, and the slot lasts until browser/child cleanup. A timeout with a final observed expected beat can pass
with a note; missing beats, health errors and co-op convergence/clock failures still fail. Timeouts are reported separately.

The trusted broker and its Node harness come from the launcher checkout. Worker edits do not upgrade that process.
New flags and queue-aware deadlines require review and a launcher restart. A rejected flag is a verification blocker,
not permission to bypass the broker. Set queue environment variables before launching it. The client prints queue progress
while waiting; the browser budget starts only when the broker records slot acquisition.
