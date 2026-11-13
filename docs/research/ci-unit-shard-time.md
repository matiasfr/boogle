# Unit shard time, 13 November 2026

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

## Measurements

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
| railway-m10d-review | 14.412 | 8 |

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

## Assignment and estimate

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

## Local evidence and validation

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
