# Loader yard: four review fixes

16 November 2026. Follow-up to the owner's independent Opus high review of `c4563eca9` (verdict: ship).
Branch `t3/loader-yard` was fetched and rebased onto `50d45b10f` before editing; the implementation became
`0e049b820`. The sole conflict was the backlog row: both the loader status and main's newer coach-plan sequence
were retained. Main still has v54, including its later documentation-only `00570fa51`; this branch keeps v55.
No namespace, fixture, rule behavior, rider-place count or player-facing copy changes in this follow-up.

## Findings addressed

1. **Uncapped rider assertion.** The fares test now also requires `townBuildings(w, 0, PIER.t) === 4` with
   both houses and the yard built. Temporarily changing the yard's `riders` from 0 to 1 makes that exact assertion
   fail (`5 !== 4`); restoring 0 passes. The four-place fares remain 36/54/72/72. Full deliberate-failure output
   is recorded below and in `.look/loader-yard-review/fares-mutant.log`.
2. **Frame allocations.** The loader hook reuses its offset vector and finds the first eligible flight with a
   loop. One reused typed array counts inbound flights by train in one pass at the start of each wagon draw;
   the rack's total query still reads current flights directly, so it cannot see a stale draw cache. The Works
   arm starts grey, and its private paint is set again only when the built state changes in either direction.
3. **One built query.** `loaderBuilt(w, tick)` scans plots in fixed index order, using integer completion ticks.
   `loaderOn` is `loaderBuilt && wagonSlot(w) >= 0`; the Works view calls `loaderBuilt`. The existing loader test
   now explicitly asserts false immediately before completion and true at completion before coupling.
4. **One deck-slot calculation.** `deckSlot(tr, k)` sits beside `kitCar` and `footingCar`. Flight destinations,
   wagon stacks and kit-deck stacks all use it. Its scratch vector is consumed immediately. Both original
   height expressions and the two-stack offsets are preserved; no car-role refactor is included.

No loading still or clip was retaken. This is a behavior-preserving refactor: the flight predicates and their
order, deck coordinates, animation timing and colour transitions are unchanged. The arm builder owns private
paint per instance, so setting it only on transitions cannot be overwritten by the town jib. Existing inspected
stills and motion evidence remain in [the implementation report](loader-yard-l1-v2.md); no fresh visual or
performance measurement is claimed. No new strings or design changes.

## Checks

Node 26.13.0. Logs are under `.look/loader-yard-review/`. No fixture writer or recording mode was used.
The rail no-audit import is the repository's prescribed local test mode.

| Command/check | Result |
| --- | --- |
| Fares test only, `--test-name-pattern='S1/L1: q6-done payoff'`, with plot 2 temporarily set to one rider | Expected failure at the new assertion; source restored in `finally`. `fares-mutant.log`. |
| Same fares test after restoring zero riders | PASS, 1/1. `fares-restored.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test --test-concurrency=1 test/railway-loader.test.ts test/railway-trade.test.ts test/town-facts.test.ts test/railway-jump.test.ts` | PASS, 83/83. `focused.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test test/railway-loader.test.ts` after adding the explicit built-query assertions | PASS, 9/9. `loader-final.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test --test-concurrency=1 'test/railway-golden-*.test.ts' test/railway-schema.test.ts` | PASS, 117/117. All 53 stages retain their ticks and both hashes. `goldens.log`. |
| `git diff --exit-code c4563eca9 -- test/fixtures server/test/fixtures` | PASS: every fixture byte unchanged, including the railway/schema goldens and host trace. |
| `node --import ./test/helpers/rail-no-audit.ts --test --test-concurrency=1 server/test/loader-save.test.ts server/test/world-host-trace.test.ts` | PASS, 2/2. Real checkpoint reload conserves the non-wagon load; all 8,600 host-trace records match byte for byte. `server.log`. |
| `npm run lint` | PASS, 0 problems. `lint.log`. |
| `npm run typecheck` | PASS. `types.log`. |
| `NODE_OPTIONS="--import=$PWD/test/helpers/rail-no-audit.ts" npm run checkpoints -- yard-ready yard-built yard-wagon yard-deck` | PASS, 4/4 through the host save path. `checkpoints.log`. |
| `git diff --check` | PASS. |
| `node dev/ship-check.ts` | PASS, exit 0: registry, 42 lint files, typecheck, prefab build check, 200 affected test files; 1,839 passes, 65 skips, 1 todo, 0 failures; 97.68 s. `ship-check.log`. |

`npm run checks-for` was also read: its 52-file plan includes the original implementation, whose broader loop,
town-buy, network and two-peer checks are recorded in the implementation report. This follow-up reruns the
reviewer's requested checks above. No push, ship or additional independent review is claimed.

## Deliberate regression failure

```text
✖ S1/L1: q6-done payoff: plots 1 and 3 land 72 a minute at four places; yard adds no riders (477.660291ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4129.806083

✖ failing tests:

test at test/railway-trade.test.ts:1351:1
✖ S1/L1: q6-done payoff: plots 1 and 3 land 72 a minute at four places; yard adds no riders (477.660291ms)
  AssertionError [ERR_ASSERTION]: the yard adds no rider house

  5 !== 4

      at file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b0957ebe-d0df64b00bc55dd9/test/railway-trade.test.ts:1367:35
      at Array.map (<anonymous>)
      at TestContext.<anonymous> (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-b0957ebe-d0df64b00bc55dd9/test/railway-trade.test.ts:1352:46)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 5,
    expected: 4,
    operator: 'strictEqual',
    diff: 'simple'
  }
```
