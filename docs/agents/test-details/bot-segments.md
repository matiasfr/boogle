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
The stages live in `src/sim/railway-seeds.ts` (`SEED_STAGES`, `buildSeedWorld`; the route builders are in
`railway-seed-route.ts` and `railway-seed-works.ts`), shared by `--rail-seed`, the tests' `test/helpers/railway-*.ts`
re-exports and the server's playtest jump-ins (`server/src/seeds/`, prebuilt into the image). To add a stage, follow the
"Adding a stage" steps at the top of `src/sim/railway-seeds.ts`; to offer it as a jump-in, add a row to
`src/world/railway-jump.ts` with a `land` you have checked in a still.
`npm run checkpoints` checks that the stages the routes use (`awake`, `q5-done`, `trains-on`) still build after a world or
route change; `npm run checkpoints -- <stage> ...` checks others.

`playthrough --to <beat>` plays the production route from a fresh room and stops after that beat (`?botTo=`; names and
bot beats in `dev/look/segments.ts`, `RAIL_STOPS`):
`audio-loop|wake|t1-done|t2-funded|T2|T3|jump|forge-lit|Q1|Q2|hook|Q3|Q4|Q5|trains|Q6|pier` (`pier` is the whole route).
`--from q5-done` (to `trains|Q6|pier`) and `--from trains-on` (to `Q6|pier`) write that seed and run the seeded
`railway-b5b8-bot.ts` (`railFrom=boiler|q6`, `railStop`); the full bot cannot yet resume from earlier seeds.
`--players 2` runs both peers (`&player=1` leads, `&player=2` follows) in one fresh room at 5x warp (`--warp-speed 3` when two peers can't hold 5x: the routed check uses 3), from fresh, to
`wake|t1-done|t2-funded|T2|T3|Q4|Q5|Q6|pier`, and passes when both finish and their mirrored railway hashes agree at every
server step both sampled. Real inputs only: no recovery teleports. Segment evidence does not prove a fresh full route.
Read `report.txt`, `verdict.json` and the images even on failure. The full production proof is
`npm run playthrough -- --long --stall 6000` (the same as `--query 'shot=play' --eval dev/look/evals/railway-job.ts`).

All harness browser launches share the machine queue at `/tmp/boogle-bots-<uid>` (across worktrees). Short runs go ahead of waiting `--long` playthroughs until a long one has waited 20 minutes (`BOOGLE_BOT_YIELD_MS`); a running job is never interrupted.
Light runs share the machine: a plain `npm run look` still (no `--video`, `--curves`, `--real`, `--players 2` or
`--long`) may run beside one other light run (`BOOGLE_BOT_CONCURRENCY`, default 2; 1 restores one run at a time).
Everything else is exclusive: every playthrough, scenario, net test, perf and bench, and any look that measures time or
motion. An exclusive run starts only once the running light ones finish and nobody is ahead of it, and no light run
starts beside it or past it, except past a waiting `--long` run inside its 20-minute yield. A verdict taken while
another run held a slot says `shared: true`. Use the same setting everywhere; mixed settings take the smaller active
limit, and a ticket from an older checkout turns the whole queue back to first come, first served (it runs alone).
`BOOGLE_BOT_RANK=1|2|3` (default 2) is the work's P rank: among waiting runs of the same length, the lower rank goes
first, then first come, first served. A run that has waited 30 minutes (`BOOGLE_BOT_RANK_WAIT_MS`) counts as P1, so a
P3 is never stuck behind later arrivals. Tickets carry `rank`, `light` and `shared` for `npm run heartbeat`. `BOOGLE_BOT_QUEUE_DIR` may select a shared path, never a per-worktree path.
The queue names the blocking job; a dead PID's unique ticket is reclaimed. Broker deadlines and co-op clock samples start
after acquisition, and the slot lasts until browser/child cleanup. A timeout with a final observed expected beat can pass
with a note; missing beats, health errors and co-op convergence/clock failures still fail. Timeouts are reported separately.

The queue also waits for the machine: a free slot is not granted while the 1-minute load average is above
`BOOGLE_BOT_MAX_LOAD` (default 30; `0` turns the gate off), and queue progress says so ("waiting for load 41 → 30").
After `BOOGLE_BOT_LOAD_WAIT_MS` (default 20 minutes) at the front of the queue the run goes ahead and is marked under
load. The gate is on acquisition only: a running job's own load never stops it, and the load wait comes before the
browser budget and co-op clock samples start. So don't poll `uptime` or wait for the load yourself: enqueue the run and
end your turn, naming the queued run.

Every playthrough, look and scenario writes a verdict (`.look/playthrough/<name>/verdict.json`,
`<out>/<label>-verdict.json` for look, `.look/scenarios/verdict.json`) through `dev/look/verdict.ts`. It reads
`"running"` with the pid and start time from the start: a `running` verdict whose pid is gone did not finish, which is
not a pass. The final verdict is stamped with `commit` (HEAD), `tree` (HEAD^{tree}), `dirty` (uncommitted file count),
`loadAtStart`, `loadAtEnd`, `underLoad`, `queueWaitMs`, `startedAt`, `endedAt` and `command` (the exact command line,
with any `BOOGLE_BOT_*`, `BOOGLE_QUERY` and `LOOK_*` settings), and the same in one line of `report.txt`. `underLoad`
is true when either load is above the limit (30 when the gate is off) or the gate gave up waiting; a pass under load
says "passed under load: not evidence of timing or feel". A run stopped from outside (SIGTERM, SIGINT or SIGHUP, or its
browser, context or page closed under it) is `"killed"` with a `reason` (and the `outcome` its caller saw), exit code 3;
a game failure stays a failure, exit 1. Rerun a killed run; it says nothing about the game. A brokered harness stamps
the broker's queue wait only once the launcher checkout has this queue.

The trusted broker and its Node harness come from the launcher checkout. Worker edits do not upgrade that process.
New flags and queue-aware deadlines require review and a launcher restart. A rejected flag is a verification blocker,
not permission to bypass the broker. Set queue environment variables before launching it. The client prints queue progress
while waiting; the browser budget starts only when the broker records slot acquisition.
