# Unit shard time, 13 and 16 November 2026

> **Status:** adopted (reconciled 17 November 2026). **Verdict:** Process-tree supervisor and shard-drift follow-up shipped in #1984 after the original #1723/#1724 work.
> **Recommendation:** Use the follow-up rather than the superseded thread-only watchdog or original timing estimates.

## Review follow-up: process trees, route partitions and drift

Rebased the implementation onto `origin/main` at `945c695546c626db2b6e926cefc788eb963e5afe` before applying the
independent review. This section supersedes the first implementation's thread-only watchdog and timing estimates
below. No source-game, server, golden fixture, dev/ship entry point or merge-policy change is included.

### Finding 1: terminate the process tree

The original descendant regression failed in both CI and ship modes: a file spawned an interval-running Node
child, wrote its PID, then blocked synchronously; the deadline failed the file but the child remained alive.
The regression's finally block cleaned up those probe processes.

The preload now keeps a supervising process outside the test's blocked event loop. It re-executes the selected
Node test file with the same arguments and test IPC in a new POSIX process group (`detached: true`). The
supervisor's 480s deadline kills the **group**, including ordinary spawned descendants; exit and signal paths
also clean up the owned group. Other files retain independent supervisors and keep running. The Windows branch
uses taskkill /T /F; it is not exercised on this Mac. Linux and macOS use the same POSIX group/signalling path;
the live descendant regression was run on macOS, not a Linux runner.

The committed [budget regression](../../test/unit-budget.test.ts) verifies descendant disappearance with
`kill(pid, 0)` returning ESRCH, a healthy file's successful completion **after** the killed file with concurrency
one, and synchronous-loop/open-interval deadlines. Both CI and ship modes are covered. Before/after logs:
[before](../../.look/evidence/ci-unit-review-fixes/budget-before.log),
[after](../../.look/evidence/ci-unit-review-fixes/budget-after.log).

### Finding 2a: split route rules without losing cases

Moved the original route body into [the shared registration factory](../../test/helpers/railway-route-rules.ts).
Four entry files invoke partitions 0 to 3. The normal cases retain registration order within each partition;
index modulo four selects **12 / 12 / 11 / 11** cases, **46 total**, exactly once. Entire original-body ASTs match,
including fixture setup, helpers, conditions, seeds, offsets and loop bounds; each case's callback AST and options
also match. No assertion body changes. The opt-in LEG_ASK_FUZZ producers and their distribution check share mutable
accumulated results, so all 33 stay together in partition 0. With that flag the case lists are **45 / 12 / 11 / 11**,
**79 total**, again with identical callbacks/options and no missing or duplicate case.

Proof: [normal case lists](../../.look/evidence/ci-unit-review-fixes/route-case-lists.json),
[optional case lists](../../.look/evidence/ci-unit-review-fixes/route-optional-case-lists.json),
[whole-body AST proof](../../.look/evidence/ci-unit-review-fixes/route-body-proof.json).
These are registration/body comparisons; the optional long fuzz bodies were not rerun for this tooling change.
All normal route cases execute in the eight CI-mode shards below.

An isolated audited split run passed all 46 cases in 100.6s. Files 0/1/2/3 took **99.244 / 66.775 / 100.524 /
92.944s**, versus the original file's 410.338s CI observation. Initial replacement weights are those local
observations times 1.5, conservatively rounded up. The twelve golden entry files and their 53 stages retain the
reviewed partitions and assertions and are included in the full rerun below.

The only remaining **observed CI files over 240s** in the 16 November source measurements are:

| Unchanged file | Observed CI seconds | Margin to 480s file budget |
| --- | ---: | ---: |
| railway-loader | 241.986 | 238.014 |
| prefab-halts | 240.927 | 239.073 |

For completeness, the same local planning factor puts **railway-loader at 284.380s** (195.620s file-budget
margin) and **railway-r3b2-review at 246.132s** (233.868s margin), so the latter is also flagged as a projected
>240s file despite its 229.142s historical CI observation. Prefab-halts projects 175.896s; its historical CI
240.927s observation is the conservative value above. No new route or golden partition projects above 240s
(the largest is golden 11 at 238.813s, leaving 241.187s to the file budget).

New partition durations are local observations and calibrated estimates, not post-change CI observations.

### Finding 2b: make stale weights visible and refreshable

Weights now live in [unit-weights.json](../../dev/ci/unit-weights.json), including measured cheap files rather than
omitting every small observation. A truly new/renamed file still gets assigned once with a 1s fallback, and now
emits an Actions **warning at file start** when no weight exists. Completion emits a machine-readable
`unit timing {file,seconds,weight,passed}` record in addition to the existing human-readable duration.
A measured time greater than both **2x its weight and 10s** emits a drift **warning** naming both values.
Warnings tolerate scheduler/load variation and do not discard coverage or turn a new test into a flaky gate.
The **480s whole-file deadline remains a failure**, because it must stop a blocked process tree before job cancellation.

One command to refresh from all eight downloaded CI logs (default scale 1):

```sh
node dev/ci/unit-weights.ts .look/evidence/my-ci-run/shard*.log
```

For the loaded-Mac planning factor used here, add `--scale=1.5`. The tool takes the maximum completed observation
per file across its inputs, drops deleted files, preserves untouched weights, and refuses failed-file timings
without editing the table. Refreshing weights can change every shard's membership: rerun the shards afterwards.
[Drift probes](../../.look/evidence/ci-unit-review-fixes/drift-probes.log) verify unknown/overweight warnings,
short-duration tolerance, start-before-import warning order and JSON records;
[refresh probes](../../.look/evidence/ci-unit-review-fixes/refresh-probes.log) verify rejection of failed timings.

### Finding 3: projected CI wall time and the final rerun

Full CI mode now explicitly defaults to **three file workers per shard**, matching the observed GitHub jobs and
making local measurements independent of the Mac's automatic nine-worker default. An explicit concurrency flag
still wins (the process-tree regression uses one). Local, selected-ship and nightly defaults retain their settings.
The eight-job count and ten-minute job ceiling remain unchanged. No coverage moves to nightly.

Planning estimate per shard: **1.5 x measured loaded-Mac runner wall time + 30s setup**. This is a wall-time
projection, not the sum of file weights and not a successful GitHub run. Two shard commands run concurrently on
this Mac, each with the same three-worker CI mode. The 120s safety requirement means every projection must remain
below **480s**, leaving at least two minutes of the 600s job ceiling.

| Shard | Files | Local runner seconds | Projected CI job seconds | Margin to 600s |
| --- | ---: | ---: | ---: | ---: |
| 1 | 36 | 199.7 | 329.55 | 270.45 |
| 2 | 36 | 159.5 | 269.25 | 330.75 |
| 3 | 35 | 190.8 | 316.20 | 283.80 |
| 4 | 35 | 150.5 | 255.75 | 344.25 |
| 5 | 35 | 161.2 | 271.80 | 328.20 |
| 6 | 36 | 164.7 | 277.05 | 322.95 |
| 7 | 36 | 148.6 | 252.90 | 347.10 |
| 8 | 37 | 130.6 | 225.90 | 374.10 |

**Eight shards suffice under this planning model.** Worst projected job: **329.55s**,
leaving **270.45s** to the ten-minute ceiling and **150.45s** below the
480s planning threshold. No ninth shard or longer timeout is needed by these measurements. Actual GitHub
post-change wall time remains unverified.

### Final verification

- All eight CI-mode shards passed: **286 files exactly once, 2,310 passes, zero failures/cancellations**, 65 existing skips and one existing TODO. This includes the new home-cart file from the rebase, three route entry files and the explicit budget regression. Start/completion sets match each saved assignment; the weights hash stayed unchanged throughout the final run. No drift warnings occurred.
- All **12 golden files / 53 stages** passed. Reviewed golden partitions and the pinned fixture are unchanged. Golden wall seconds, numerically by file suffix 0 to 11: **11.635 / 12.641 / 15.343 / 14.615 / 19.718 / 14.890 / 11.379 / 7.621 / 40.686 / 89.346 / 115.782 / 159.209**.
- Final route partitions 0/1/2/3 passed in **99.946 / 69.092 / 100.612 / 92.717s**. Normal and optional registration comparisons, complete-body AST equality and resolved-import equality passed. Optional long fuzz bodies were not executed.
- Committed watchdog regression: **3/3 passed**; descendant disappearance and healthy-after-killed completion in CI and ship modes, plus synchronous loop and open interval. The original watchdog failed both descendant checks before the fix. These process probes ran on macOS; Linux runtime execution remains unverified locally.
- Missing-weight-at-start, >2x/>10s drift warning, low-duration tolerance, machine-readable timing, failed-timing rejection and successful refresh probes passed. Every discovered file and a future unweighted file are assigned exactly once; reversing discovery order produces the same assignment.
- `npm run lint`: zero problems. `npm run typecheck`: passed.
- `npm run check -- --unit-only` with the budget/select/mode tests: passed lint, types, selected audited units, registry, level, assets, prefab and production build gates. The full CI-mode suite is separately reported above.
- `node dev/ship-check.ts`: passed registry, 20 lint files, project types and **36 affected files / 332 tests**, 75.96s.
- Prettier and `git diff --check`: passed.


Final [assignments](../../.look/evidence/ci-unit-review-fixes/final-assignment.json),
[shard wall times](../../.look/evidence/ci-unit-review-fixes/final-shards.json),
[per-file timings](../../.look/evidence/ci-unit-review-fixes/final-file-timings.json) and
[validation summary](../../.look/evidence/ci-unit-review-fixes/final-summary.json) are local ignored artifacts.
No push, ship, automatic retry or merge-policy change was performed. Post-change CI remains unverified.

## 16 November investigation

**Finding:** the two reported full-suite timeouts are slow audited seed construction in
`test/railway-golden-8.test.ts`, not an observed open-handle hang. The docs-only incident is unrelated:
checkout stalled in `git fetch` before a test process existed. Keep the ten-minute job ceiling; split the large
golden, refresh all measured weights, and enforce a separate whole-file deadline.

### Incident reconstruction

Fetched/rebased this branch onto `origin/main` at `b6e5603968b95717b02870ab21f4a2ed0c4da724` and used Node 26.13.0 with a real `npm ci`.
The requested 60-run listing covered only 16 November. A paginated CI API query from 13 November returned
614 runs at the investigation snapshot. Inspected first-attempt jobs for cancelled, retried and failed runs;
short main supersessions are distinct from the eight jobs below that reached about 600 seconds.
The sampled check-run annotations explicitly say "The job has exceeded the maximum execution time of 10m0s".
Raw job logs and metadata are in [local evidence](../../.look/evidence/ci-unit-2026-11-16/).

| Run, attempt 1 | Shard; job seconds | What was running / evidence |
| --- | --- | --- |
| 43934315669, PR #1961 | 1; 603 | **No test file**: checkout's fetch began 18:58:16Z and was cancelled 19:08:14Z. Setup-node, install and unit steps never ran. The retry finished the job in 34s. |
| 43969300712, PR #1977 | 3; 606 | **railway-golden-8**: all other assigned files finished. Its 67 assertions finally printed successfully at 22:32:08Z, file duration 553.511s, immediately before cancellation (shard 588.8s). Retry: file 420.279s; unit command 441.2s; job 462s. |
| 43980461186, Home proof | 3; 616 | **railway-golden-8**: the only assigned file without a completion event. Last other completion was review-heavy-load-route at 23:39:52Z; cancellation at 23:45:41Z. |
| 43967820886, main | 3; 615 | **railway-golden-8**: same assignment as #1977; sole unfinished file after steel-review. |
| 43776981017, 15 November ship | 2; 615 | **review-heavy-load-arrival**: sole unfinished assigned file. Today's existing code already samples its offset sweep and puts 65 funding-delay cases behind LONG_REVIEWS. This change does not move any coverage to nightly. |
| 43407237171, 13 November ship | 1/4; 606 | No unfinished test: all 434 passed in 589.139s; setup pushed the job over its ceiling. This is the incident the original study below describes. |
| 43409813360, 13 November ship | 4/4; 616 | Ordered output stops after railway-ring-layout. **railway-route-rules** is the next assigned file, blocking output. These pre-timing logs cannot prove it was the only active child. |
| 43414764385, 13 November main | 1/4; 615 | Same ordered-output boundary and next file, **railway-route-rules**. No file-start/completion trace existed yet; attribution is an inference. |

For the balanced runs, read each head's `git ls-tree` test list and its `dev/ci/unit-shards.ts`, then subtract
all `unit file <path>:` completions from that shard's assignment. The unmeasured new files change tie allocation
as they are added: use the incident's head, not today's assignment. For example, #1977's shard had 33 files,
including golden 8, boiler, golden 0/3, m10a-review and steel-review; Home had a different 33-file set with those
same expensive files and heavy-load-route. Node executes several files concurrently, so the last completed file
is not the predecessor of a single serial culprit. The completion reporter receives file-wrapper events out of
order even while spec output waits behind an earlier file.

### Hang versus CPU time

The unmodified golden file passed locally twice, in **373.933s** alone and **375.878s** inside old shard 3
(shard command 376.6s). Both runs overlapped other measurements; the file process remained CPU-active.
Together with #1977's complete assertions at 553.511s and its 420.279s successful rerun, this reproduces legitimate
slowness rather than an observed timer, server, worker or handle leak. The Home file was cancelled before it
reported; an independent hang in that exact run cannot be excluded retrospectively.

Golden 8 held 33 late stages, including four expensive loader-yard variants. A direct per-stage profile
separately measured yard-ready 40.455s, yard-built 40.678s and yard-wagon 46.866s on this loaded Mac; these build
worlds by running audited simulation ticks until stock and fares arrive. The golden then also checks each
built world's load validity and advances an unaudited copy by the same 1,200 ticks as before.
Node 26.13.0's built-in `internal/test_runner/runner` sets `FileTest.timeout = null`; the CLI's 5s timeout does
not bound synchronous module-scope work. Its event-loop timer also cannot interrupt a synchronous test body.

### Measurements and balance

Fresh whole-file CI measurements came from all eight jobs in Home's first attempt: 276 completed files,
plus golden 8's successful #1977 rerun (420.279s). Sum: **5,205.112 file-seconds**, versus the original study's
2,698.691, on different machines/builds. These are observed wall durations under contention, not CPU seconds.
The old table still predicted about 338 seconds per bin and assigned new reviews only one second.

| File (test/*.test.ts) | Old weight, seconds | 16 November CI seconds |
| --- | ---: | ---: |
| railway-golden-8, before split | 158 | 420.279 successful retry; 553.511 first attempt |
| railway-route-rules | 270 | 410.338 |
| railway-loader | 1 | 241.986 |
| prefab-halts | 1 | 240.927 |
| railway-running-side | 1 | 143.069 |
| railway-steel-review | 63 | 136.227 |
| review-heavy-load-route | 1 | 106.677 |
| town-facts | 25 | 104.092 |

The Home assignment's freshly measured bin sums were **898.9 / 494.1 / 942.2 / 692.4 / 433.3 / 519.9 /
786.1 / 438.2s**. New rounded-weight sums are **669 / 669 / 668 / 668 / 668 / 668 / 668 / 668s**.
These sums describe work distribution, not predicted job wall times.

The golden split keeps all 33 stages exactly once: file 8 retains boiler/trains/early trade; file 9 covers
loader-yard purchases; file 10 covers loader-yard wagon/deck branches; file 11 retains the shared-cache
works/ring/steel/Gorge family. No fixture, hash, tick count, audit, assertion, seed or sweep setting changes.
The four files passed all 70 tests together in **161.5s** (the old 67 assertions plus three partition checks).
Whole-file times: **41.929 / 94.089 / 107.729 / 161.426s**. Their initial balance weights are these observations
scaled by `420.279 / 374.0`, the successful CI/local old-golden ratio, then rounded: **47 / 106 / 121 / 181s**.
These four weights are calibrated estimates; post-change CI remains unverified. All other measured weights come
from the fresh CI run; unmeasured future files still cost one second and cannot be excluded by table membership.

| Shard | Before: Home CI job seconds | Before: local runner seconds | After: local runner seconds |
| --- | ---: | ---: | ---: |
| 1 | 459 | 247.7 | 271.9 |
| 2 | 289 | not run | 201.3 |
| 3 | 616 (cancelled) | 376.6 | 119.6 |
| 4 | 284 | not run | 186.9 |
| 5 | 203 | not run | 96.6 |
| 6 | 212 | not run | 175.0 |
| 7 | 302 | not run | 82.6 |
| 8 | 181 | not run | 103.9 |

The local baseline shards 1 and 3 passed in **247.7s / 376.6s** before edits. The after runs use exactly
`npm run test:unit -- --ci --test-shard=N/8`, two shard commands at a time on a 10-core Mac. Node chooses its normal
local concurrency; GitHub's VM concurrency and load differ. Local columns use the runner clock (excluding npm
startup); CI job times also include checkout/install/cleanup. These are loaded local wall times, not evidence that
production CI has passed. Rebalancing changes membership, so shard numbers no longer identify the same file sets.

### Runner and ship behavior

The [reporter](../../dev/ci/unit-timing.ts) now prints `unit file start <path>` on the supervising process's file-wrapper dequeue,
before imports execute. CI and selected-ship runs preload [unit-budget.ts](../../dev/ci/unit-budget.ts): only Node's isolated file
child (`NODE_TEST_CONTEXT=child-v8`) starts an unreferenced watchdog thread. After **480 seconds** it writes an
Actions error naming the file and kills that file process; Node reports failure and the runner exits nonzero.
The thread can interrupt blocked synchronous code and remains alive for leaked handles, but does not keep a
healthy file alive. Local mode and the nightly's existing ten-minute per-test setting keep their settings.
The shard warning remains 420s and the job limit remains ten minutes. Setup/network stalls remain subject to
the job limit because no file process exists yet.

The ship behavior is expected from today's code: automerge opens the ship PR for a cancelled push run but only
merges on an eligible successful exact-head run. ci-autofix's branch/main guards accept **failure**, not
**cancelled**. ship.sh and ship-queue enqueue/wait; neither retries a failed Actions attempt. The bot's separate
pull_request run is deliberately skipped and can show `action_required`; it is never the eligible ship check.
Automerge deletes those approval-only PR runs after merge (the Home PR run 43982092708 was present in the initial
listing and returned 404 later). Rerunning the push's failed jobs produces the eligible green workflow_run.
The approval-only PR run is a separate symptom, not the reason the push could not merge.

**Proposal only, for the orchestrator:** add one bounded retry in a separate ship-policy commit, in a small
workflow_run handler with actions:write. Require same-repository ship/* push/dispatch, unchanged current head,
run_attempt=1, and a cancelled unit job with the explicit check annotation "The job has exceeded the maximum
execution time", with no failed jobs. The two sampled incidents have that annotation; elapsed time alone cannot
distinguish a manual cancellation. Recheck the PR's open/non-draft/no-automerge guards before `gh run rerun <id> --failed`. Do not retry a
manual cancellation, main supersession, assertion failure or a second timeout. Record the retry in the workflow
summary. This would recover the checkout stall too; file budget failures should remain failures for diagnosis.
No retry or other merge-policy change is implemented here.

### Verification

- All eight full-audit CI-mode shards passed: **2305 passes**, **0 failures**, **0 cancellations**, 65 existing long-mode skips and 1 existing TODO. Verified start and completion events against each assignment: **281 files exactly once**.
- Repeated golden timings, every-stage partition/load/hash assertions, input-order independence and an unmeasured future file's inclusion passed. The pinned golden fixture is unchanged.
- Watchdog smoke: both a synchronous infinite loop and a leaked interval failed with exit 1, file-start records and named 0.3s budget errors; a healthy file exited 0 promptly. These temporary probes live only in ignored evidence.
- `npm run lint`: passed, zero problems. `npm run typecheck`: passed.
- `npm run check -- --unit-only` with `UNIT_ONLY='test/unit-select.test.ts test/unit-modes.test.ts'`: passed (lint, types, selected audited units, registry, level, assets, prefab check and production build). The entire CI-mode unit suite was separately exercised above.
- `node dev/ship-check.ts`: passed, registry, 8 lint files, project types and 31 affected test files / 283 assertions; final rerun 61.93s.
- Prettier on edited files and `git diff --check`: passed. No post-change GitHub run, push, ship or deployment is claimed.

Evidence: [before assignments](../../.look/evidence/ci-unit-2026-11-16/before-assignment.json),
[after assignments](../../.look/evidence/ci-unit-2026-11-16/after-assignment.json),
[CI file timings](../../.look/evidence/ci-unit-2026-11-16/ci-timings.json),
[all fresh local file timings](../../.look/evidence/ci-unit-2026-11-16/after-file-timings.json),
[incident assignments](../../.look/evidence/ci-unit-2026-11-16/incident-assignments.json),
[split golden run](../../.look/evidence/ci-unit-2026-11-16/golden-split.log),
[watchdog smoke](../../.look/evidence/ci-unit-2026-11-16/budget-smoke.log),
[final ship-check](../../.look/evidence/ci-unit-2026-11-16/final-ship-check.log),
[after-shard wall times](../../.look/evidence/ci-unit-2026-11-16/after-shards.json).
These ignored artifacts are local evidence; the measurements and conclusions above are committed in this report.
No browser or player-visible behavior changed. No push or ship was performed.

## 13 November study (historical)

> **Verdict:** balance selected unit files across eight CI shards while preserving full coverage and explicit selection.
> **Top recommendations:** retain the shard-union coverage assertion; treat the timings below as loaded-Mac observations.
> **Status:** adopted in #1723 and #1724; historical timing report, not current CI performance evidence.

**Rebase follow-up:** `codex/ci-unit-shard-time-2` rebases the two original commits onto `origin/main` at
`505f62f40` (world v35). The runner first honors explicit `UNIT_ONLY` in every mode, then consumes CI's shard flag
and balances that selected set. Main's opt-in scoped flags in `dev/check.ts` and `dev/ship-check.ts` are preserved.
The unit discovery now finds 200 files, including `classic-trace`; a committed test asserts the eight shards'
union equals that discovered set with no duplicates. The [fresh local manifest](../../.look/evidence/ci-unit-shard-time-2/manifest.json)
records the assignment, regression smoke checks and requested validation on this base. Measurements and CI
projections below are historical evidence from the original base; v35 and its expanded route tests were not reprofiled.

The reported incident passed 434 tests in 589s, then hit the **job's** ten-minute ceiling including setup.
This worktree starts at `66d902242` (199 files, 1,693 tests), so it is not the incident's exact build. No network
was used. No `src/` files, game assertions, audit settings, fuzz lengths, offsets or seeds change.

### Measurements

`timeout 1200 npm run test:unit -- --ci --test-shard=1/4` passed **466/466**, first in 162.553s, then with
file timing in 162.669s (runner: 162.7s). These are loaded-Mac wall times, not CI predictions. The ten slowest
files in that second run follow; every one was in native shard 1/4. Paths are `test/<name>.test.ts`.

| File | Whole-file seconds | New shard / 8 |
| --- | ---: | ---: |
| railway-r3b2-review | 161.166 | 2 |
| railway-steel | 61.574 | 7 |
| railway-trade | 52.472 | 6 |
| railway-works | 45.455 | 7 |
| railway-m12-review | 38.433 | 2 |
| railway-check | 37.476 | 4 |
| railway-boiler | 24.013 | 3 |
| railway-golden-5 | 16.759 | 4 |
| railway-golden-1 | 15.563 | 7 |
| railway-m10d-review (now split across footing replication, late join and adapter guards) | 14.412 | 8 |

A full `timeout 1200 npm run test:unit -- --ci` measured all 199 files in one comparable run: 405.830s elapsed,
2,698.691s summed file time, 1,692 passes, zero failures/cancellations/skips, one existing TODO (the documented
`railway-install` b011e7 train-wait bound). A preliminary run also exited zero (387.748s) but its summary-only
file timings were discarded: Node's `test:summary` misses work before the first `test()` registration.
The final reporter uses the file-wrapper `test:complete`, including imports, seeded-world setup and process exit.
For example, golden 8 actually costs 158.286s, despite millisecond assertions.

The full run's slowest files (different contention from the isolated shard above):

| File | Seconds | Old shard / 4 | New shard / 8 |
| --- | ---: | ---: | ---: |
| railway-route-rules | 269.826 | 4 | 1 |
| railway-r3b2-review | 219.282 | 1 | 2 |
| railway-golden-8 | 158.286 | 4 | 3 |
| railway-train | 143.806 | 2 | 4 |
| railway-ring | 138.767 | 2 | 5 |
| railway-m12 | 109.074 | 2 | 6 |
| railway-install | 103.366 | 2 | 7 |
| railway-line2 | 100.757 | 3 | 8 |
| railway-trains | 84.793 | 3 | 8 |
| railway-steel | 78.518 | 1 | 7 |

### Assignment and estimate

Previously Node sorted all file paths and dealt every fourth file; it does not hash them. CI's `changes` job runs
`dev/ci/unit-select.ts`, which emits `unit_full` and `unit_shards`. Its full/selected decision stays the same;
full now emits `[1,2,3,4,5,6,7,8]`, selected still `[1]`. The workflow uses that matrix and its job total.
`test-unit.ts` consumes CI's shard flag and selects one bin before spawning Node, avoiding double sharding.

`dev/ci/unit-shards.ts` assigns longest files first to the lightest bin, using rounded full-run seconds for the
60 files above 1.5s, otherwise 1s (including future files). Path order breaks ties. Every globbed file is assigned
exactly once; table membership never selects or excludes tests. Local, selected ship and nightly modes keep their
settings; the nightly still uses three native shards. This adds four full-suite CI jobs.

Old four-shard summed file times were **623.682 / 724.925 / 496.804 / 853.280s**. Estimate each new CI job as
`589 * new summed file seconds / 623.682 + 30`: calibrate to the reported old shard 1, then add a conservative
30s checkout/install allowance (589 already includes some overhead). This assumes relative file costs and effective
parallelism transfer; it is an estimate, not a measured GitHub result. A five-way native deal still clusters heavy
files; even ideal duration balancing projects five at 540s, six at 455s and seven at 394s under this model.
Eight is the smallest modeled count near six minutes including setup:

| Shard | Files | Summed measured seconds | Estimated CI job seconds |
| --- | ---: | ---: | ---: |
| 1 | 24 | 337.096 | 348 |
| 2 | 26 | 337.169 | 348 |
| 3 | 24 | 338.855 | 350 |
| 4 | 27 | 336.653 | 348 |
| 5 | 25 | 336.670 | 348 |
| 6 | 26 | 336.075 | 347 |
| 7 | 23 | 338.395 | 350 |
| 8 | 24 | 337.778 | 349 |

The runner prints file and shard seconds and emits a non-failing Actions warning above **420s**. The workflow
limit remains **10 minutes**. On a warning, remeasure whole files and refresh the weights/count; future world growth
and a single file exceeding the target still need attention. Real CI timing and runner-slot contention remain unverified.

### Local evidence and validation

The [local tooling manifest](../../.look/evidence/ci-unit-shard-time/manifest.json) links command logs and both full
file listings: [before](../../.look/evidence/ci-unit-shard-time/before.json),
[after](../../.look/evidence/ci-unit-shard-time/after.json),
[per-file timings](../../.look/evidence/ci-unit-shard-time/timings.json). These are local artifacts, not broker/browser evidence.
Coverage checks assert 199 files exactly once, input-order independence and inclusion of a future file.
Reproduce the new listing with:

```sh
node --input-type=module -e 'import fs from "node:fs"; import {unitShards,CI_UNIT_SHARDS} from "./dev/ci/unit-shards.ts"; console.log(JSON.stringify(unitShards(fs.globSync("test/**/*.test.ts").sort(),CI_UNIT_SHARDS),null,2))'
```

Validation passed: YAML parse (`actionlint` unavailable), Prettier on changed files, `npm run check`, and
`node dev/ship-check.ts` (165/165 tests, 19 affected files). The first check attempt exposed a required-reading
budget overflow from an added tests-doc sentence; folding the count into the existing sentence fixed it without
raising a budget. Warning smoke checks: 420s stays silent; 421s warns and exits zero; a child error still exits one.
Both shard-flag syntaxes execute the expected files without double sharding.

Post-change audited shard **3/8 passed 185/185 in 113.6s**, with its 24 executed files matching the saved assignment.
The other seven new shard jobs were not executed separately; the full audited run above and the exact-once
assignment checks cover their unchanged files. Actual GitHub timings remain unverified. The manifest records all logs.
This tooling-only change needs no visual question, images or bot run. No push, ship, stash, fetch or other network
operation was performed. `inflight` was omitted because it fetches; only cached local refs were inspected.
