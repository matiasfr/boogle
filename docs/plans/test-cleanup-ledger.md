# Test cleanup campaign: ledger

**Goal** (owner, 17 November 2026): make every retained test earn its execution and maintenance cost. Remove obsolete
tests, implementation-mirroring assertions, duplicate coverage, unused fixtures and unnecessary mocks; consolidate
overlapping tests around the strongest behavior checks; repair valuable flaky tests. Deletion and consolidation are
deliverables; no deletion percentage is chased and no replacement tests are added to keep a count up. No releases.

**Budget.** The repository has no numeric test-line budget. The binding rule is the test diet
([tests](../agents/tests.md), owner call "Fast iteration over test coverage"): tests exist where lockstep needs them
(`src/sim`, `src/world/rules`: determinism, conservation, ordering, validation, round-trips), plus the server's
durability and admission contracts and the entity-core exception. So every area must end at or below its starting
line count, and a new test is justified in its commit body by the contract it alone protects.

**Baseline** (main at `d2abaf31`): 349 test files, 59,614 lines (288 in `test/`, 61 in `server/test/`), 3,021 lines
of `test/helpers`, unit weights totalling 5,484 s (`dev/ci/unit-weights.json`).

## Rules for every worker

1. Read the production code a test exercises before the test. Name the behavior contract and the realistic regression
   it guards. A test stays only if it would fail for that regression and no stronger retained test already does.
2. Delete: tests of code or milestones that no longer exist; assertions that restate the implementation (a constant
   compared with itself, a mock's own return value, call counts with no observable effect); a case fully implied by a
   stronger retained case; fixtures, helpers and mocks no retained test imports. Review- and milestone-named files
   (`*-review`, `m10*`, `r3*`, `review-*`) are folded into the suite that owns the contract, or deleted when that
   suite already holds it.
3. Never delete the only guard of a contract, and never delete a failing test to make a failure go away: a red test is
   reported, then fixed or kept. Lockstep determinism, conservation, ordering, validation and save round-trip guards,
   the goldens, the server's durability, admission and malformed-input guards, and platform boundaries that protect
   distinct behavior stay. One independent safety contract is never traded for another area's growth.
4. A flaky or timing-dependent test worth keeping is repaired (a fake clock, a seeded source, an awaited event instead
   of a sleep), not retried.
5. Proof, where practical: for each consolidated cluster, break the production behavior on purpose (a temporary edit,
   never committed), run the retained test, and record that it fails; restore and rerun green. For each deleted test,
   the report names the retained test holding the same contract, or says why the contract is gone.
6. Keep the tooling consistent: remove deleted files' keys from `dev/ci/unit-weights.json`, and fix any doc or script
   that names a deleted file (`git grep` the basename; archived plans under `docs/archive` are left alone).
7. Run the affected files (`UNIT_ONLY="test/a.test.ts test/b.test.ts" npm run test:unit`, or, in `server/`,
   `node --import ../test/helpers/rail-no-audit.ts --test --test-timeout=120000 test/a.test.ts`), then `node dev/ship-check.ts`. Commit per coherent cluster; the body lists removed, merged
   and retained contracts and the mutation results. No push, no ship: the orchestrator reviews and ships.

## Areas

Status: `todo`, `out` (dispatched), `review` (built, awaiting review or merge), `done`, `blocked`.

| # | Area | Files (pattern) | Start: files / lines | Status | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Dev tooling and CI tests | `test/` tests of `dev/**`, `scripts/**`: change-class, unit-*, review-stamp, decisions, development-backlog, device-*, deploy-wait, models, bot-queue, lint-determinism, scratch-git, verdict, report-format, *-warnings, atlas, loop-*, last-launch, server-image, zfight*, wgsl-portability, tune*, *-trace, *-recording-budget, railway-lint-review, railway-census | | todo | |
| 2 | Prefab data and level | `test/prefab-*`, `test/fixtures/prefab-*`, `test/helpers/prefab-*` | 20 / 5,049 | todo | |
| 3 | Review- and milestone-named sim tests | `test/railway-*-review`, `railway-m10*`, `railway-m11*`, `railway-m12*`, `railway-r3*`, `railway-r4*`, `test/review-*`, `town-*-review` | | todo | |
| 4 | Railway sim: trains, lines, routes, ring, steel, works | `test/railway-{train,trains,line*,lines,route*,ring*,running-side,platform-transition,steel,works*,jump,heavy-load,hook-path,glide-*,marks,placement,departure-origin,end-path,arrival,away}`, `train-*`, `consist*`, `turnout`, `track-*`, `rail-*` | | todo | |
| 5 | Railway sim: economy, persistence, replication | `test/railway{,-trade,-supply,-install,-loader,-adapter,-replicate,-read-*,-golden-*,-tick-order,-ops,-schema,-boiler,-cart*,-check*,-set-down,-profile,-opening,-story,-finds,-retained-blocks}`, `replicate*`, `ecs*`, `world-*`, `room-*` | | todo | |
| 6 | Server: accounts, rooms, saves, transport | `server/test/*` except `railway-*` | | todo | |
| 7 | Server: railway hosts | `server/test/railway-*`, `rail-tune*`, `seats-host`, `boogler-*`, fixtures and helpers | | todo | |
| 8 | Client and world logic | the rest of `test/`: boogler-*, town-*, economy*, garage-*, ring-*, return-*, home-*, voice-mesh, seats, meadow-*, path-*, controls, wardrobe, and single-file suites | | todo | |

## Log

One entry per merged PR: area, PR, files and lines removed, what was consolidated, what contract coverage remains,
mutation evidence, unresolved risks.

- 2026-11-17: campaign opened; ledger written. Nothing removed yet.

## Unresolved risks

None recorded yet.
