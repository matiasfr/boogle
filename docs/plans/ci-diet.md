# CI diet: test at checkpoints, not on every ship

**Goal.** The owner, 11 November: "evaluate if there's any other sort of CI or tests that we can cut down on or be more
conservative with because we're iterating so quickly, and just handle those in later batches", then "My goal is that we
should be developing and implementing and spending a lot less time testing. That should happen more rarely at bigger
checkpoints. And even then, it should be pretty swift and targeted." Principle: iterate fast (tests guard lockstep
correctness and the boot; everything else is a checkpoint's job).

**Builds on, not re-proposed:** `ci/unit-speed` (on main with #1598: four unit shards in `--ci` mode, local runs
unaudited and sampled, `unit-long.yml` nightly: ship-pipeline.md, "Unit test settings"), superseded main runs
cancelling, batched ships, Node 26, and the ECS plan's X1 to X4 deleting about 4,350 lines of differential tests
(ecs-m12-m13.md, section 6). This plan supplies the "exact gates" that owner-calls.md's "Build more, test less" (11
November) says it waits for; that call's review rules (a) to (d) stand and are implemented here, not reopened.

## What was measured (11 November, `gh run list` / `gh run view --json jobs`, no runs started)

- **Ship CI** (49 push runs on `ship/**`, 08:25 to 20:01 UTC): wall p50 423 s, p90 752 s. Jobs p50 / p90: `unit` 473 /
  730 s (max 950: world v27's fuzz), `server` 114 / 142 (tests 46, image build 47, boot 2), `net` 93 / 688 (`test:net`
  itself 56), `registry` 34 / 40, `lint` 30 / 35, `build` 22 / 25, `changes` 18, `docs` 21. Queue waits p50 2 s, p90 3 s.
  `unit` is the whole critical path; every other job ends inside 2.5 minutes.
- **Main CI**: 56 dispatches (one per merge), 38 green, 16 cancelled as superseded pending runs, none red. `unit` p50 512 s.
- **Failures** on ship pushes: 3 of 57. One real (`registry`: a must-read budget, fixed by a later commit, #1553). Two
  infrastructure: `net`'s `playwright install --with-deps` stalled 605 s on apt, in 16 of 73 net jobs between 14:47 and
  16:51 UTC, failing two ships outright. No unit, lint, build or server failure on a ship in the sample.
- **Per merge, outside CI**: `deploy` 120 runs in 20 h, all green, p50 67 s (31 s of it a second `npm run lint`);
  `smoke` 120 runs, 100 green, 11 red (5 the same apt stall, 6 identity or round-trip while Pages deploys hung), 9
  cancelled; `atlas` 120 dispatches, 24 s each, advisory; `automerge` 120, 60 s; `deploy-server` 115 green in 9 days, 4
  red (all `flyctl deploy` itself); `ci-autofix` 109 skipped, 11 ran.
- **One code ship triggers** about ten workflow runs: CI on the ship push (10 jobs with the unit shards), its
  `pull_request` run (no job), automerge twice (one skips), ci-autofix twice (skip), deploy (3 jobs), smoke, atlas, CI
  on main (10 jobs, about 0.7 of a run after cancellations) and, for 30% of ships, deploy-server (2 jobs). About 38
  runner-minutes. The repo is public, so minutes are free; what costs is wall time and job slots (GitHub's concurrent-job
  cap: 20 on the Free plan, 40 on Pro; I could not read which plan). With unit shards one code ship plus its main run
  holds 20 slots.
- **What the 190 merges on main since 10 November touched** (`git diff` of each first-parent commit): 70 docs, 120 code.
  Of the code: 39 touch the server tests' static import closure (172 files), 32 the net test's (136 files), 36 the
  server image's paths (`dev/server-build.ts`), 32 the review paths (5 of those only test files), 23 lockstep code
  (`src/sim`, `src/world`, `src/ecs`), 31 only tests, dev tools or CI. A lockstep merge's transitive test set is a median
  89 of 191 test files (32 import a changed file directly); any other code merge's is a median of one file (43 of 97: none).
- **Slowest tests** (main's unit log, 1,518 tests, 2,266 s of test time on a 946 s run): the M10e differential
  `waitsForTrainOn` 83 s (X3/X4 delete it); R3a's every-tick-offset sweeps 67 + 34 + 23 s; three Ring Island world
  fuzz seeds 60 to 66 s each; "footings conserved under 5,000 random ring ops" 59 s; "trains run end to end" 55 s;
  "the seeds' rows give the rests" 41 s; M12's disconnect review 40 s; each ring op refused before its gate 39 s.
  Files: `railway-train` 153 s, `-ring` 134, `-r3a-adversarial` 124, `-line2` 117, `-m10c-review` 103, `-works` 78,
  `-r3b2-review` 72, `-m12-review` 58. Review-named files: 299 s.
- **The live boot works on a runner**: the latest Smoke logs "PASS live boot ... interactive in 29.0s (WebGPU adapter:
  google swiftshader)" (install 14 s, boot 33 s). The state file's "Unproven: the boot check on a GitHub runner" is out
  of date, and a startup throw like v27's would fail it.

## Findings, ranked by minutes saved per ship

Minutes are wall time on the ship's path, averaged over code ships unless stated. "Caught" is from the run history and
the incident notes (state file: the 10 November crash-loop, the 11 November outage, the hung `room-close` test, the
six lockstep and server changes merged with only their authors' checks on 9 November).

| # | Finding | Cost per ship | What it caught | Recommendation | Risk | Size |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Full unit suite on every code ship | 4 to 5 min after unit-speed (16 min unsharded), 4 job slots | Nothing in 57 ship runs; its own timeouts | Tier 1: affected tests plus a core (below); full suite on main. Saves about 3 min on the 80% of code ships that are not lockstep | A test reached only dynamically is proven after merge | M |
| 2 | Agents run full `npm run check` per step and before reporting, then the pre-push gate, then CI | 2 to 4 min of local CPU per job on a loaded Mac (one `check` is about 70 s of unit tests plus build) | Nothing CI did not also catch | Briefs ask for `node dev/ship-check.ts` (changed lint, typecheck, affected tests); `check` belongs to the orchestrator's checkpoint and `ship --full` | None: CI and main run the rest | S |
| 3 | `net` and Smoke install Chromium `--with-deps` | 10 s normally; 10 min in 22% of net jobs on 11 November | Nothing: the libraries are on the image (the fallback proved it) | Plain `playwright install chromium` | A new image without the libraries fails loudly at launch | S |
| 4 | Review trigger is `^(src/(sim\|net\|world)\|server)/`, tests and prose included; `src/ecs` missing | About 15 min (a fresh reviewer; not measured) on 5 of 32 risky merges, 0.6 min averaged | The 9 November unreviewed merges were production code | Put the owner's rule (c) in the tools: a stamp only for `src/sim`, `src/net`, `src/world`, `server/src` and `src/ecs` (lockstep and in the server image, missing from the call's list); a test-only diff there takes `--orchestrator-read "<what changed in its assertions>"`; one shared list | The orchestrator misjudges a weakened assertion (CI still runs it) | S |
| 5 | `server` job on every code ship | 114 to 146 s, 1 slot; the critical path once unit is short | The hung `room-close` (a server-test change) and the image boot (the crash-loop): both inside the closure | Run when the server tests' closure or the image's paths change; boot only for image paths. Saves about 1 min on 67% of code ships | A dynamic import outside the walk: fallback below | M |
| 6 | Sampled sweeps and fuzz run in full on each ship | About 280 s of CPU per ship in `--ci` mode | Nothing on a ship | Ship CI uses the local stride (every 16th offset) and one fuzz seed; main CI and `unit-long` run them all | An offset-specific deadlock is found minutes after merge | S |
| 7 | Seed worlds rebuilt by replay in every test file | Most of unit-speed's 749 of 1,794 audited CPU s in the M10 to M12 and R4 files | Their replay is also the goldens' proof | One snapshot per seed stage per run, keyed by a hash of `src/sim`, `src/world`, `src/ecs`; goldens keep replaying | A stale cache: the key covers every source the replay reads | M |
| 8 | `net` on every code ship | 93 s, 1 slot | Only infrastructure in the sample | Run when its closure (`dev/peer-test` imports) changes; main always | As 5 | M |
| 9 | `deploy.yml` lints again | 31 s to live per merge | Never red | Remove the step; add the pre-deploy boot (12) | None: CI lints the same tree | S |
| 10 | `ship-branch.sh` runs `npm ci` every ship | Not measured; 20 to 60 s of local CPU | Symlinked `node_modules` (9 November) | Keep the symlink removal; `npm ci` only when the lockfiles differ from `node_modules/.package-lock.json` | None | S |
| 11 | Atlas citation report dispatched per merge | 24 s, 1 slot, 120 a day | Advisory only; atlas is off (owner, 10 November) | Stop automerge's dispatch; on command only | None | S |
| 12 | Missing: nothing stops a build that cannot boot from reaching players | The 11 November outage: 2 h 15 min down; Smoke boots only after the deploy | | Boot the built `dist` with `vite preview` and `dev/live-boot.ts` before `deploy-pages`; red keeps the old site live | SwiftShader flake holds a deploy (none seen in about 25 runs) | S |
| 13 | Missing: risky ships keep merging onto a red main | | Red combinations are why main CI exists | ship-queue holds review-path ships while a `red-main` issue is open, unless `--main-known` says why | None | S |
| 14 | Missing: a red main after many merges has no bisect step | | | ci-autofix's main prompt: rerun the failing file with `git bisect run` over first-parent merges since the last green main | None | S |

Kept as they are: `lint`/typecheck (30 s), `build` (22 s), `registry`, level and assets (34 s), the docs-only class, the
server image boot before every server deploy, Smoke after every deploy (pending runs already coalesce), deploy-server's
own tests, `unit-long` nightly, the timing budgets (owner's hard limits, 11 November; cheap and inside the affected set).

## Tier 1: every ship (about 3 minutes of CI, under a minute locally)

- **Local, pre-push** (`dev/ship-check.ts`, as today): changed-file lint, `tsc -p .`, affected tests in local mode. One
  change: on a lockstep diff it runs the test files that import a changed file directly, not the transitive set (89
  files would take minutes).
- **CI on the ship** (all parallel; `changes` publishes the classes):
  - `lint` (lint, typecheck), `registry` (registry, level-check, assets check): unchanged.
  - `build`: build, then boot the built `dist` once in headless Chromium (12). About 75 s.
  - `unit`: the affected test files (the pre-push walk) in a ship mode (rail audit on, sampled sweeps, one fuzz seed),
    plus the always-on core: the light tests that read source files rather than import them (`lint-determinism`,
    `change-class`, `models`, `decisions`, `server-image`, `railway-schema`, `railway-tick-order` and the rest of that
    list under 2 s each), and on a lockstep diff the nine golden shards (every seed stage's hash). One job unless the
    diff is lockstep; then four shards. Full suite instead when the diff touches `test/helpers/`, `dev/test-env.ts`,
    package or lock files, `tsconfig`, or `vite.config`.
  - `server`: when the server tests' closure changed; image build and boot only when `dev/server-build.ts`'s paths did.
  - `net`: when the closure of `dev/peer-test/` changed (32 of 120 code merges), plus package, lock and vite files.
- **What a Tier 1 merge no longer proves:** that tests outside its affected set still pass (main CI says so within
  about 5 minutes); every tick offset and fuzz seed; for a lockstep diff, tests that reach the change only transitively
  (Batch 3).

## Tier 2: checkpoints

| Checkpoint | What runs | Trigger | Where, how long |
| --- | --- | --- | --- |
| Rolling | Full unit suite `--ci` in 4 shards, `server`, `net`, everything else | Every merge burst on main (pending runs coalesce) | Main CI, about 5 min; never blocks a ship |
| Nightly | `npm run test:long` (audit, every offset, five seeds, 2,500-tick saves) | Daily | `unit-long.yml`, 3 shards |
| Milestone | `npm run checks-for -- --run` over the range, a bot segment or one look per changed area, the live boot | End of a plan or milestone; a change to what loads at startup (`src/main.ts`, `src/boot/`, a feature's mount); the owner's ask | HOTBOX (or the Mac when the look needs its screen); target under 20 min |
| World reset | Full CI dispatched on the branch before the merge | A `WORLD_NS` bump (saves reset; no long run, owner, 10 November) | CI, about 5 min |
| Weekly | The scenarios (owner, 10 November) | Sunday; on command after a fix | The Mac |

**Red after 15 merges.** The red job names the failing file. ci-autofix's main job reruns that file alone with
`git bisect run` over main's first-parent merges since the last green run (four steps for 15 merges, each under 2
minutes), then opens its `claude/fix-main-*` PR; `npm run heartbeat` leads with RED MAIN and the orchestrator owns it at
the next check-in. Pages and the server keep deploying (each gated by its own boot), except as Batch 3 says; review-path
ships wait (13).

## Agents' habits under this plan

- A build brief asks for: `node dev/ship-check.ts` (changed lint, typecheck, the changed files' tests) and, for a
  player-visible change, its one proof look (owner call "Fast ships"; seeing it is not testing, so it stays). Not
  `npm run check`, bots, `test:net` or extra looks: those are checkpoints. `implementer.md` step 2 and `planner.md`'s
  "each step leaves `npm run check` green" change to the same.
- The orchestrator runs `npm run check` or `ship --full` only at a checkpoint, not per branch.
- **Independent review** (review, not testing; owner-calls.md, "Build more, test less", (a) to (d)): before main, per
  batch, on source and wire changes under `src/sim`, `src/net`, `src/world`, `server/src`, plus `src/ecs` (the one
  addition this plan makes, for the reason in finding 4); a test-only diff there is read by the orchestrator (4). The
  reviewer's failing test is written only for a defect it found, as the call says. After the fix it stays only when it states a
  lockstep invariant (determinism, conservation, validation) and runs under 2 seconds; otherwise it is folded into the
  file that owns the rule or deleted, and the commit message keeps the record.

## Batch 1: safe, no loss of coverage, can ship today

Built on `ci/diet-batch-1` (11 November); `.github/workflows` changes are unproven until their first GitHub runs.

- [x] 1. Drop `--with-deps` from `net`, Smoke and Counts (3).
- [x] 2. Path-scope `server`, its boot and `net` by their static import closures with the fallback list, and a test in the
   style of `change-class.test.ts` that fails when a server test or a peer-test file imports outside its walk (5, 8).
   Orchestrator's reading of "Fast ships"' "server and net tests for code changes": a test cannot be affected by a file
   outside its import closure; record it under that call.
- [x] 3. `deploy.yml`: drop the second lint; boot the built `dist` before `deploy-pages` (9, 12). Correct the state file's
   "Unproven" line.
- [x] 4. Review trigger: the owner's rule (c) plus `src/ecs`, in one list read by `dev/review-stamp.ts` and `ship-queue.sh`;
   `--orchestrator-read` for test-only diffs under those paths (4).
- [x] 5. ship-queue holds review-path ships on an open `red-main` issue (13); ci-autofix bisects (14).
- [x] 6. Stop the atlas dispatch (11); `npm ci` in `ship-branch.sh` only when lockfiles changed (10).
- [x] 7. Briefs: `implementer.md`, `planner.md`, tests.md and the orchestrate skill ask for `ship-check`, not `check` (2).
- [x] 8. Seed snapshots shared within a run (7), measured before and after per file; no step may raise a file's time.
   Built per test file (one process): `test/helpers/rail.ts` replays each seed stage once and hands out copies through
   a save. Cross-file sharing (a disk cache keyed by the sources) is left for later: a stale-cache risk for little more.
   Measured on the Mac under load 6 to 11, one file at a time, CPU seconds: local mode, the 26 files that take seeds
   through the helper 187.8 to 174.8, none slower; `--ci` mode, seven of them 313 to 238 (`railway-line2` 58 to 43,
   `-m10c-review` 68 to 47, `-train` 71 to 63, `-trains` 27 to 19, `-boiler` 18 to 12, `-works` 31 to 25,
   `-m10e-review` 39 to 28). Shard balancing: the plan names no method; Node still deals files by index.

## Batch 2: moves coverage later (the orchestrator's call)

1. **Tier 1 unit for non-lockstep ships** (1): the affected set plus the core instead of all four shards. A merge no
   longer proves that unaffected tests pass; main CI proves it about 5 minutes later, and the only way to miss is a
   dynamic import or a file read outside the core.
2. **Ship mode for sweeps and fuzz** (6): every 16th offset and one seed per ship. A merge no longer proves every tick
   offset of R3a's sweeps or Ring Island's three fuzz seeds; main CI does, and `unit-long` adds five seeds nightly.
3. **Review tests retire on the rule above**: `railway-r3b2-review` (72 s), `-m12-review` (58 s), `-m11-review`,
   `review-v25` (11 s), `review-v26` (5 s): each case is kept (if it is an invariant under 2 s), moved to its rule's file,
   or deleted. What goes: a direct pin on those past bugs; the goldens and the rules' own tests still cover the
   behaviour.
4. Tier 2's milestone checkpoint replaces per-branch `check:full` in tests.md for `src/net*` and `server/` work; CI's
   path-scoped `server` and `net` still run on those ships.

## Batch 3: answered, not built

**The owner, 11 November: "lockstep ships can keep the unit suite for now."** So ships that change lockstep code
(`src/sim`, `src/world`, `src/ecs`) keep the full unit suite (all four shards, audit on), and deploys are not gated on
main's CI. "For now": it can be asked again once the suite is cheaper. Batch 1 assumes none of it; Batch 2 stays the
orchestrator's to schedule after Batch 1 lands. The proposal as it was put:

**Lockstep ships run Tier 1 too: goldens plus the tests that import a changed file directly, not the whole suite.**
This supersedes the line in "Fast ships" that deliberately kept "unit tests ... for every code change" in full. What he
gives up: a merge touching `src/sim`, `src/world` or `src/ecs` no longer proves that every rail rule test passes (the 23
lockstep merges since 10 November each reached about 89 test files; Tier 1 runs about 32 of them plus the goldens).
Lockstep code runs in every client and on the server, so a regression there is a save or sync risk, not a cosmetic
one. The call I'd make to cover it: after a lockstep merge, Pages and deploy-server start from main CI's green result
(ci.yml dispatches them) rather than from the merge, so players get the change about 5 minutes later and never get a
red one. A red main then holds the live site at its last green build until it is fixed. Merges and agents never wait
on any of this. His 11 November goal reads as a yes, but it reverses a recorded call, so it needs his word.

## Could not measure

- Jobs for about 30 of the last 120 CI runs (GitHub returned 502 for each of them): per-job figures come from 49 ship
  and 37 main runs.
- Local times: the pre-push gate, `tsc`, `ship-branch`'s `npm ci` and the ship-queue lock waits (no local runs; the
  machine is busy). The 20 to 25 minutes end to end is the brief's figure, not rebuilt here.
- How long an independent review takes, and the golden shards' own time (their seed builds run outside the timed tests).
- Tier 1's unit time on a lockstep diff: to be measured in Batch 1 by listing the selection for the last 23 lockstep
  merges before relying on the 3-minute target.
- Whether `net` ever caught a real regression: the sample shows only infrastructure failures.
- The account's plan, so the concurrent-job cap.
