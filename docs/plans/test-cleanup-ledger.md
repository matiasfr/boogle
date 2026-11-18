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

Status: `todo`, `out` (dispatched, building), `review` (built, in review or merging), `done`, `blocked`.

| # | Area | Start: files / lines | Status | Result |
| --- | --- | --- | --- | --- |
| 1 | Dev tooling and CI tests (`test/` tests of `dev/**`, `scripts/**`) | 34 / 4,279 | done | #2062: 33 / 4,210 |
| 2 | Prefab data and level (`test/prefab-*`, fixtures, helpers) | 20 / 5,077 | done | #2063: 18 files, net 90 lines lighter |
| 3 | Review- and milestone-named sim tests | 36 / 6,191 | done | #2075 (the commits of #2066, rebased): 34 / 5,691 |
| 4 | Railway sim: trains, lines, routes, ring, steel, works | 43 / 10,063 | done | #2073: 33 files, about 1,000 lines lighter |
| 5a | Railway sim: trade, adapter, read session | 3 / about 2,900 | done | #2070: 225 lines lighter |
| 5b | Railway sim: supply, install, loader, replicate, goldens, tick order, cart, check, schema, boiler, opening | about 36 / 6,000 | done | #2084: about 310 lines lighter and one fixture deleted |
| 5c | The eight files 5b only skimmed: replicate, replicate-budget, ecs, world-replay, world-reset, world-sync, room-clock, the bad-worlds fixture | 8 / about 1,650 | done | #2094: every test judged by name; 33 lines lighter, five files unchanged |
| 6 | Server: accounts, rooms, saves, transport (`server/test/*` except area 7) | 38 / 6,928 | done | #2076: 30 / 6,366 |
| 7 | Server: railway hosts (`server/test/railway-*`, `rail-tune*`, `seats-host`, `boogler-*`) | 26 / 7,513 | done | #2068: 24 / 7,292 |
| 8 | Client and world logic (the rest of `test/`) | 94 / 10,828 | done | #2064: 89 files, about 690 lines lighter |
| 9 | Runtime-helper tests area 1 handed back (device-id, tune, namespace, sw-worker, zfight and others) | 21 / 1,617 | done | #2061: 21 / about 1,380 |

Fixture kept on purpose: `test/fixtures/boogler-parked-copy.ts` is imported by no test since #2064. It is The Boogler's
parked copy, kept for the owner's narrative pass (docs/reviews/boogler-narrative-followup.md); rule 2 does not apply to it.

## Closed (18 November 2026)

Every area is checked, reviewed by a fresh reviewer and merged. Main went from 349 test files and 59,614 lines to 320
files and 56,297 lines (other work added files meanwhile), in eleven cleanup PRs and one follow-up PR. No game or server
code changed except three comment lines. What the numbers do not show: every merged deletion names a retained guard,
nearly all with a recorded mutation, and the independent reviews restored twelve guards that builders had removed
or weakened and that only a mutation exposed. CI time saved is not measured: `dev/ci/unit-weights.json` (total 5,465 s
against 5,484 s at the start) still holds pre-campaign timings for every suite that changed, so a refresh from a full
CI run (`node dev/ci/unit-weights.ts <shard logs>`) is the first follow-up.

## Log

One entry per merged PR: area, PR, files and lines removed, what was consolidated, what contract coverage remains,
mutation evidence, unresolved risks.

- 2026-11-17: campaign opened; ledger written. Nothing removed yet.
- 2026-11-17: all eight areas dispatched. Codex reached capacity (until Thursday 19 November); the owner approved Claude
  Opus builders for this campaign only ("Claude builds, this campaign"), with reviews by a different fresh reviewer. The
  standing rule (a Codex usage limit pauses the work; it does not move to Claude) is unchanged.
- 2026-11-18, area 9, #2061 (runtime-helper tests). 14 files, 368 lines removed and 91 added before review fixes.
  Removed: literal pins (tune defaults and key positions, device heat-drift percentages, browser-name rows, Continue
  label text), a 1,000-id sweep, a constant compared with itself, per-key admission run on 30 server worlds (admission
  has no per-key branch: one run plus an all-keys min/max replication case). Strengthened: the service worker test's
  fake cache now fails when the worker re-creates a cache the kill switch deleted. Review (fresh Opus) proved two lost
  guards, both restored: the railway re-export scan in `railway-census` (lint matches import paths as text, so a
  re-exported system file would pass) and the tune URL readiness gate (`tune-startup`, first case only). Mutations: 58
  by the builder, each failing a retained test; the two restorations re-proven. Retained untouched: sw-worker contract,
  protos, zfight geometry, roster-trace, both recording budgets, decomp-link, guest-rom, scratch-git.
- 2026-11-18, area 1, #2062 (dev tooling). `unit-select-review` folded into `unit-select`; `railway-lint-review` split
  into `lint-determinism` (import boundaries) and a new `railway-migrate` (census skip counting, kill table without
  GOLDEN, now proving the probe ran); `deploy-wait` restart, 503 and missing-identity cases merged; `look-wall` on a
  fake clock; `zfight-tech-source` three cases into one census; `loop.ts` fixture deleted. Flake repair: the unit-budget
  probe waits for a readiness marker instead of reading a PID file. Guard repair found by review: the Windows budget
  kill was never asserted (a non-detached child dies with its parent's job object, on main too); the fixture helper is
  now detached on Windows and dropping `taskkill /t` fails both whole-file budget cases. Mutations recorded for every
  cluster. Untouched and why: change-class, unit-modes, review-stamp, decisions, development-backlog, device-launch,
  -read, -report, -runs, models, bot-queue, verdict, asset-size-warnings, atlas, loop-graph, loop-trace, server-image,
  registry, wgsl-portability, chroma, clock-progress, knots, level-flood, ground-collider, rail-map (each a distinct
  gate or parser contract).
- 2026-11-18, area 2, #2063 (prefab). `prefab-consolidation` folded into `prefab-portability`; `prefab-review-4` and
  two real-project cases of `prefab-dynamic` folded into `prefab-lint`; duplicate quarter-turn and roundoff cases
  removed in favour of the workshop round-trip table; the three `*-counts.json` goldens became diagnostics (owner call
  "No limits ahead of a measured problem"). Review proved two lost guards by mutation, both restored: the counts were
  the only check that the box meshes are attached to the scene (now asserted directly for Bell, West and Gorge), and
  the report snapshot was the only check that a level check still runs (the fixture stays; kinds and messages are
  compared with measurements masked). Untouched: edges, furnishing, halts, ordinary, records, scenery-review, seats,
  specifiers, trees, validate.
- 2026-11-18, area 8, #2064 (client and world logic). Deleted as presentation under the test diet: `crane-aim`,
  `crossing-show`, `far-head-show`, `garage-data`, `swim-pose` (review confirmed none held a shared rule). Trimmed 17
  suites of literals and self-checking transforms, each with a failing mutation for what stayed. Review found two
  weakened assertions, both restored: per-stage map name counts (`island-labels`) and presence key order.
- 2026-11-18, area 7, #2068 (server railway hosts). `railway-buy-review` and `railway-buy-review-ws` folded into
  `railway-buy-host` (all five cases survive, the stale-epoch refusal now exact); the host's duplicate credit-curve
  sweep removed (the unit test holds the arithmetic); four pairs of long scenarios merged (device takes, held Ring,
  footing carrier, shared double jump). Flake repairs: `boogler-host`, `railway-eviction` and
  `railway-supply-durability` wait on real events instead of polling or resending (18 of 18 review runs green).
  Strengthened: no unit test catches a purchase of an unstaked plot; the host case now does. Untouched: actor-checks,
  beam-absence, crash, host, ring-host, supply-order, tuning-budget, rail-tune, seats-host, boogler-authority, -land.
- 2026-11-18, area 5a, #2070 (railway trade, adapter, read session). `railway-trade` 1,646 to about 1,450 lines:
  duplicate seed-stage and played-sequence tests removed against named guards, two stale gate 3 tests removed (they
  passed under their own mutation), literal pins replaced by relations. Review restored four things: the box cap is
  worked out in the test, not with `boxCap`; the R2b twin run is back (a hidden-state mutant passed goldens 9 to 11 and
  failed only it); the unplayed gate 2 worlds are world-checked; the price floor (`railPricePct` refuses 0) is tested.
- 2026-11-18, area 4, #2073 (railway trains, lines, routes). Deleted under the test diet as client feel or render code
  the sim never imports: the three `railway-glide-*` files, `rail-top`, `consist`, `consist-cache`, `track-chunks`,
  `track-wing`, `turnout`, `railway-end-path` (its contract is held by `platform-transition` and `retained-blocks`,
  shown by mutation). Trimmed eight suites: literal coordinate and tuning pins, version-named cases rewritten as
  relations, five six-hold clause tests merged into one 13-row table. Review restored `train-wheel-rail`: it was the
  only guard that wheels stay on the drawn rails at every pose. Cost: `railway-running-side` builds a lighter seed
  (40 s to 5 s locally); route-rules gate 10 uses the three-lap helper. Ten mutations recorded, each caught.
- 2026-11-18, area 3, #2075 (review- and milestone-named sim tests). Late-join cases of `m10a-views`, `m10d`, `m10e`
  merged into one all-rows comparison at the served step; R3b2's last-held-tick fixture folded into R3b1's worst case;
  R4a and R4b view copies replaced by one joined-client table; `review-heavy-load-fix3` folded into the whole-pile
  case. Deleted with no replacement, confirmed presentation by review: `review-town-a3`, `review-town-b2-build`, an
  M10a catalog snapshot, M10f's build counter. Renamed after their contracts: `railway-whole-state-latch`,
  `railway-frame-tick`, `railway-footing-replication`, `town-late-join`, `town-plot-projection`. Review: ship as is, six
  mutations caught. Kept whole and why: first-five, m10c, m11, m12, m12-review, r3a-adversarial, r4c-leaf,
  ring-reach, route-review, gorge-seams, the four heavy-load reviews, m12c, m3b, town-b2, town-buy, v25, v26,
  garage-upgrade (each holds a distinct authority, ordering, save or late-join case).
- 2026-11-18, area 6, #2076 (server: accounts, rooms, saves, transport). Deleted or folded: `seat-recording` and
  `roster-recording` into their flood suites, `accounts-review` into `accounts`, `replace-proxy` into
  `client-address` and `replace-admission`, `replace-wire` into `replace`, `review-shutdown-drain` into `room-close`,
  `review-town-b2-reach-ws` into the socket host suite, `land` (its subject, `loadHomeLand` in
  `server/src/host/land.ts`, has no caller). Eight departure orders became four that still hold every pairwise
  order. Flake repairs: fixed sleeps replaced by heartbeat echoes in `voice-relay`, `malformed-messages` and host
  tests, the replication flush asserted on the next room step, the jump sweep on a mocked clock, playdata retention
  on a controlled clock. Review broke seven replace-admission contracts on purpose and each was caught; the
  forged-announcement check now waits for the receiving peer's echo. Untouched: server-ops, save-cleanup,
  save-inventory, room-ids, world-host, world-host-trace, loader-save, room-clock-host, step-meter,
  credential-evidence, account-admission, seat-replication, client-address.
- 2026-11-18, area 5b, #2084 (railway persistence and replication). `railway-replicate`: seed-room and predictor
  setup shared, three count pins removed against named guards. `railway-install`: three malformed-input sweeps merged
  (one validation line serves every part), tuning rows deleted, the braking-distance pin rewritten as three functions
  agreeing. `railway-tick-order`: nine default-hold rows and their fixture deleted (a conversion proof against a tick
  that no longer exists; system order is still checked every tick). `railway-cart`: the cut call-cart op's test and a
  v24 save-shape test deleted (old save shapes are unsupported by owner call), its extra-column refusal moved to
  `ecs`. `ecs-budget`: the pre-ECS comparison model removed. `railway-loader` builds `yard-built` once; a new test
  ties its derived fixtures to the golden's hashes. One golden stage moved between shards; no golden regenerated.
- 2026-11-18, area 5c, #2094 (replicate, ecs, world replay, reset, sync, room clock). Judged test by test. Removed: the
  four-client prediction run (two and six stay: review showed two catches a confirm that waits for a first refusal,
  six does not), the `STEP_HZ` and `RULE_STEPS` literal pins (five behaviour tests fail for any change, a consistent
  12 steps at 120 Hz included), four reset tests merged into one table. Unchanged with a live mutation each:
  `replicate-budget`, `ecs`, `world-replay`, `world-sync`, the bad-worlds fixture (98 entries, one per rejection).
- 2026-11-18, follow-ups, #2095. Seven guards the reviews proved missing, each failing under its mutation: a funded
  buy of an unstaked plot is refused (`railway-trade`); a five-second absence credits exactly the documented amount
  (`railway-away` host case); the shared-unlock crash phase runs before the orderly restart, so it needs a checkpoint;
  the Gorge's two drawn meshes are visible and the untrimmed count exact; the unit-budget helper exits by itself after
  30 s; two comments corrected.

## Findings worth keeping

- Review- and milestone-named sim tests are not duplicates by default. In area 3 the owning suites (`railway-adapter`,
  `railway-trains`, `railway-heavy-load`, `railway-steel`) stayed green under mutations that only the review-named test
  caught (whole-state latching, bounded dwell, last-slot pickup, in-transit steel reload). Those tests were renamed after
  their contracts; moving the cases into the owning suites waits for areas 4 and 5.
- A deletion justified as "a count or snapshot only fails on legitimate edits" needs a mutation before it merges. Three
  of the first four reviews found a retired count or snapshot had been the only guard of a real defect (drawn meshes
  attached to the scene; a level check silently no longer running; a stop's name missing from the map).
- A twin run and a golden guard different things. A golden compares one world with a recording; only two worlds
  ticked in one process see state kept outside the world. `railway-trade`'s R1 and R2b twins and
  `railway-steel-review`'s save twin are load-bearing; do not fold them into a golden.
- When a pin is replaced by "the relation it stood for", the expected side must not call the function under test.
  The box cap compared with `boxCap()` passed with the demand term zeroed.
- `railway-train`'s "with no brake every leg is v26's, bit for bit" stays: flooring instead of rounding in
  `trainLegAlong` passes everything else, two goldens included, because train rows store a leg's ends, not the
  position along it.

## Unresolved risks

Coverage that is missing (found by mutation during the campaign; none was removed by it):

- Replication: a predictor whose `invalidate()` does nothing, a mirror refill that ignores partial field changes and a
  mirror that drops despawns in replay each pass every test. A confirm that is inert unless the window is full passes
  too. The ECS budget catches "touch every entity" only by time (5.5 ms against a 4 ms limit).
- `path-refuge` does not catch a snap on wake in any band. Nothing pins the 3 m rim threshold in
  `dev/level/route-leg2.ts`. `prefab-gorge` checks the untrimmed mesh's slot count, not that each slot was written.
- The till label's over-cap clamp (`src/entities/railway/till-view.ts`) and the town reader's cache key have no test;
  both are cosmetic. A late joiner's first snapshot of an occupied seat table and the actor's own recording are
  asserted only through the shared code path.

Judgement calls for the owner:

- Retired as presentation though they sweep more poses than a look: `track-wing`, `track-chunks`. Kept though
  client-side, as requested regressions: `railway-arrival`, `train-car-clearance`, `train-wheel-capacity`,
  `train-wheel-rail`, `railway-hook-path`, `railway-marks`.
- Copy-pinning assertions removed (no authored line changed): "Hey! No free rides!", the first-menu thread prompts,
  the parked-copy counts, the arrival name wording, the garage pill strings.
- Area 8 left about 70 client suites unchanged after judging each file's main contract, not every assertion.
- Route-rules gate 10 averages three laps, not eight. The retired tick-order rows hashed every tick on five stages
  and at the default hold; the golden hashes them every 1,200 ticks.

Left for later work:

- Refresh `dev/ci/unit-weights.json` from a full CI run, then rebalance: the route-rules shards, golden shards 6 to
  8, railway-loader, railway-tick-order and ecs-budget changed most. The larger golden duplication (yard and gorge
  stages each replaying from an earlier seed) needs chained seed caches in `src/sim`.
- Move the renamed contract tests of area 3 (`railway-whole-state-latch`, `railway-frame-tick`,
  `railway-footing-replication`, `town-late-join`, `town-plot-projection`) into their owning suites.
- Dead code: `loadHomeLand`, `HOME_LAND` and the `HomeLand` type in `server/src/host/land.ts`.
- Windows only: the account crash child test (`server/test/accounts.test.ts`, expecting `SIGKILL`) is red, as before
  the campaign; `host.test` "one player, two tabs" timed out once in five runs under load; the new event waits in
  the server railway suites rely on the 120 s test timeout.
- `railway-away`'s new assertion should also require `rails > 0`; its message hardcodes today's numbers.
