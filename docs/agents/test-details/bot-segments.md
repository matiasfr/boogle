## Pick checks from the diff

Run `npm run checks-for` before choosing browser work. It reads the local `origin/main...HEAD` diff plus staged,
unstaged and untracked files, without fetching. `-- --base <ref>` changes the comparison; `-- --json` prints a machine
plan; `-- --run` executes the printed commands sequentially and stops on failure. `-- --files a,b` previews a sample
diff and cannot execute it. This routing is a minimum: read the applicable contracts above too.

Every route is the production railway bot (`dev/look/bots/railway.ts`) on the production entry, from a fresh room.

- Render/material/shader/assets changes: a `--rail-seed awake` still and a short opening-to-wake segment.
- `src/sim`, `src/world`, `src/net*` or `server`: two peers through T2 and the existing `world-inputs` scenario.
- Terrain/layout changes: through T1. Audio changes: three walk, jump and dry-landing repetitions on the opening path
  (inspect/listen; this is action coverage, not an audio quality verdict).
- Other gameplay or browser-harness changes: through T1; docs and unrelated tooling need no browser.

The railway is shared server state, so production checkpoints are accepted server saves, not client fixtures:
`dev/look/rail-seed.ts` builds each `--rail-seed` stage from the lockstep sim and writes it through the real host's save
path into the run's fresh data directory. Nothing is kept between runs and there is nothing to migrate.
`npm run checkpoints` checks that the stages the routes use (`awake`, `q5-done`, `trains-on`) still build after a world or
route change; `npm run checkpoints -- <stage> ...` checks others.

`playthrough --to <beat>` plays the production route from a fresh room and stops after that beat (`?botTo=`; names and
bot beats in `dev/look/segments.ts`, `RAIL_STOPS`):
`audio-loop|wake|t1-done|t2-funded|T2|T3|jump|forge-lit|Q1|Q2|hook|Q3|Q4|Q5|trains|Q6|pier` (`pier` is the whole route).
`--from q5-done` (to `trains|Q6|pier`) and `--from trains-on` (to `Q6|pier`) write that seed and run the seeded
`railway-b5b8-bot.ts` (`railFrom=boiler|q6`, `railStop`); the full bot cannot yet resume from earlier seeds.
`--players 2` runs both peers (`&player=1` leads, `&player=2` follows) in one fresh room at 5x warp, from fresh, to
`wake|t1-done|t2-funded|T2|T3|Q4|Q5|Q6|pier`, and passes when both finish and their mirrored railway hashes agree at every
server step both sampled. Real inputs only: no recovery teleports. Segment evidence does not prove a fresh full route.
Read `report.txt`, `verdict.json` and the images even on failure. The full production proof is
`npm run playthrough -- --long --stall 6000` (the same as `--query 'shot=play' --eval dev/look/evals/railway-job.ts`).

`--query 'proto=place&shot=play'` keeps the legacy Place route with its `.look/checkpoints/{solo,coop}` fixtures,
`--from at-cove|t1-done|t2-funded|pier-ending` and `--regenerate`, until D1 deletes it; no routed check uses it.

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
