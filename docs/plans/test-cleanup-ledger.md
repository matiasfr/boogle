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
| 2 | Prefab data and level (`test/prefab-*`, fixtures, helpers) | 20 / 5,077 | review | #2063 (CI green, merging): 18 files, net 90 lines lighter |
| 3 | Review- and milestone-named sim tests | 36 / 6,191 | review | built: 34 / 5,691; independent review out |
| 4 | Railway sim: trains, lines, routes, ring, steel, works | about 42 / 9,500 | out | |
| 5a | Railway sim: trade, adapter, read session | 3 / about 2,900 | review | built: 260 lines lighter; independent review out |
| 5b | Railway sim: supply, install, loader, replicate, goldens, tick order, ecs, world, room (the 43 files 5a did not check test by test) | about 43 / 8,200 | out | |
| 6 | Server: accounts, rooms, saves, transport (`server/test/*` except area 7) | about 38 | out | Codex stopped twice at capacity; a Claude builder audits its commits and finishes |
| 7 | Server: railway hosts (`server/test/railway-*`, `rail-tune*`, `seats-host`, `boogler-*`) | 26 / 7,513 | review | built: 24 / 7,292; independent review out |
| 8 | Client and world logic (the rest of `test/`) | 94 / 10,828 | review | #2064 (CI green, merging): 89 files, about 690 lines lighter |
| 9 | Runtime-helper tests area 1 handed back (device-id, tune, namespace, sw-worker, zfight and others) | 21 / 1,617 | done | #2061: 21 / about 1,380 |

Fixture kept on purpose: `test/fixtures/boogler-parked-copy.ts` is imported by no test since #2064. It is The Boogler's
parked copy, kept for the owner's narrative pass (docs/reviews/boogler-narrative-followup.md); rule 2 does not apply to it.

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

## Findings worth keeping

- Review- and milestone-named sim tests are not duplicates by default. In area 3 the owning suites (`railway-adapter`,
  `railway-trains`, `railway-heavy-load`, `railway-steel`) stayed green under mutations that only the review-named test
  caught (whole-state latching, bounded dwell, last-slot pickup, in-transit steel reload). Those tests were renamed after
  their contracts; moving the cases into the owning suites waits for areas 4 and 5.
- A deletion justified as "a count or snapshot only fails on legitimate edits" needs a mutation before it merges. Three
  of the first four reviews found a retired count or snapshot had been the only guard of a real defect (drawn meshes
  attached to the scene; a level check silently no longer running; a stop's name missing from the map).

## Unresolved risks

- `server/test/accounts-review.test.ts:37` (an account crash child expecting `SIGKILL`) is red on Windows before any
  campaign edit; CI is Linux and green. Two other server tests skip on Windows. Area 6 owns the file.
- unit-budget (#2062): on Windows the detached fixture helper can outlive a run whose runner is killed during the two
  seconds before the budget kill; it is an idle process. A self-exit timer in `test/fixtures/unit-budget/interval.ts`
  would bound it.
- Prefab (#2063): the Gorge test does not assert its two drawn meshes are visible or placed, and its count bound is an
  upper limit; nothing pins the 3 m rim threshold in `dev/level/route-leg2.ts`; the comment on the new check-list test
  overstates its masking (a 0.25 to 1 m sideways nudge of Bell Rock changes the report's shape). The first two predate
  the campaign; a follow-up fixes the comment and adds the two cheap assertions.
- Client (#2064): `path-refuge` does not catch a snap on wake in any band (not caught on main either). The roughly 70
  suites the area left unchanged were judged by each file's main contract, not assertion by assertion.
- Copy-pinning assertions removed in #2064, for the owner to see (no authored line changed): "Hey! No free rides!",
  the first-menu thread prompts, the parked-copy counts, the arrival name wording, the garage pill strings.
- Golden shards: `yard-built` is rebuilt in three processes (about 90 s of CI) and the twelve shards run from 15 s to
  181 s. Area 5b is looking at regrouping without touching a golden.
