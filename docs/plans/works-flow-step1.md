# Works flow step 1 — 15 November 2026

Implements [the approved step](works-flow.md#steps): the accepted boiler fit casts the breaker, with no game camera
cut; its call, plume and hoist follow the 3.1 s train wake. The save check requires the breaker exactly when the
boiler is fitted. Q6 never recasts it. Both seams keep their cues and can be struck in either order. A pier show
cuts to the forge only if the breaker still waits, rechecking after its reward-card/rocket delay.

Owner answers recorded: Q1 yes, Q2 yes, Q3 no; the 8 November after-Q6 call is superseded in part. Step 3 is dropped.
Step 2 was a separate approved build (now merged on main; see the rebase note below). Decisions are recorded in the core-loop topic, per decisions.md's routing
rule; the process topic retains the historical entry with a partial-supersession note. Ruled agent calls moved
verbatim to the archive.

## Scope and checks

- Branch: `t3/forge-breaker-trains`.
- Worktree: `/Users/matiasfranco/.t3/worktrees/boogle/t3-01c1cc55-9fac7b722663bbd2`.
- Starting main: `54b8b4f128be76cfcdc39dbd1a84ac14b003b00a`. The requested hard reset was rejected by approval policy;
  the clean branch was 16 commits behind with no local commits, so `git merge --ff-only origin/main` reached the
  same state without discarding anything.
- `WORLD_NS` v51: main was v49 and the owner reserved v50 for terrain benches. No migration.
- `npm run loop -- run`: every proposed order for 1–4 players finished (24 runs, plus canonical calibration).
  The new `table before Q6` order explicitly waits for a loaded wagon at Far Head and then back at Village and
  refuses any pier stock before Q6. The canonical order keeps Q6 first; throat-first also finishes.
- Focused Works and malformed-world tests: 124 passed. The corpus now rejects both an early breaker before the fit
  and a missing breaker after it. The fit test saves/reloads before Q6, strikes throat-first, and proves away credit
  finishing Q6 does not recast a taken breaker.
- `npm run checkpoints`: all 11 configured stages passed.
- `npm run test:net`: 208/208 passed, including reload, restart, accepted commands and mirrored state.
- Two-player production route through T2: passed; mirrored hashes agree at 232 sampled server steps. Opened both
  end stills. This also covers the routed T1 segment.
- `world-inputs`: passed, no graphics errors.
- `npm run check`: passed, including lint, types, registry, units, level, assets and build. Units: 2,224 passed,
  zero failed, 65 skipped and one todo (the normal local suite settings).
- `npm run decisions`: passed the no-loss and link checks. Review stamp is reported in the final handoff after
  committing (the tool hashes the committed diff); independent review remains the parent's next step.

## Fixture audit

Only repository regeneration entrypoints were used, with the standard local `rail-no-audit` preload (it changes no
state). Golden shards ran serially because each rewrites the same JSON. Prettier restored repository formatting.

| Fixture | Command flag and test | Changed values and reason |
| --- | --- | --- |
| `railway-golden.json` | `GOLDEN=1 node --import ./test/helpers/rail-no-audit.ts --test --test-concurrency=1 test/railway-golden-*.test.ts` | Metadata v49→v51; stage and after hashes for trains-on, freight-running, fares-running, q6-stocked; stage hash only for q6-finishing. These worlds now have breaker 1 before Q6. Q6-finishing's after hash already had the breaker and stays equal. All ticks, stage order and later stages unchanged. |
| `railway-ops-golden.json` | `GOLDEN=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-ops.test.ts` | Only the 199 hashes in the call trace change: it starts at trains-on, now with breaker 1. Every operation label, result, trace length and other trace is unchanged. |
| `railway-tick-order.json` (`railway-tick-order.json` and `TICK_ORDER=1` were retired in the test cleanup of 18 November 2026; only the heads fixture is recorded now) | `TICK_ORDER=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-tick-order.test.ts` | Only trains-on's 300 hashes change. Tick count and the complete system-order arrays are unchanged. |
| `railway-tick-order-heads.json` | `TICK_ORDER_HEADS=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-tick-order.test.ts` | Only trains-on at 0%, 40%, 100% headway: 1,200 hashes each. System order and every other seed stay equal. |
| `railway-m12-trace.json` | `M12_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-m12.test.ts` | Only trains-on and q6-finishing, clients a/b/c: six final hashes and 92 cumulative marks. Frame counts and the other 76 traces stay equal. These are the two pre-Q6 fitted seeds, so the mirrored breaker and earlier accepted Works actions intentionally change their traces. |

`railway-cart.test.ts`'s explicit namespace assertion advances to v51; its rejection of the obsolete cart column
is unchanged. The bad-world fixture edits are test cases, not recorded hash pins.

## Opened proof and limits

Command:

```sh
npm run look -- --real --rail-seed boiler-camp --query handoff=fit \
  --action dev/look/evals/forge-handoff.ts --video --seconds 20 --hud --name handoff-fit-proof \
  --question 'Does the fit cast the breaker, with its call and hoist after the train wake and no game camera cut?'
```

Artifacts under this worktree's `.look/`:

- `handoff-fit-proof-still.png`
- `handoff-fit-proof-motion.png`
- `handoff-fit-proof-realtime.webm`
- `handoff-fit-proof-verdict.json`

Opened both PNGs. The sheet shows the fitted red train and crew, then the breaker standing upright on the crane,
with steam at its base. The final still clearly shows its head, handle and suspension. The eval observed breaker 1
at Q=5, the call at 3.098 s after the accepted fit, one hoist to 1.6 m, and no active game-camera shot. The harness
deliberately reframes from the train to the distant forge after the call; that is an observer view, not a gameplay
cut. WebGPU, advancing completed frames, no graphics/page/console errors. The first attempt was interrupted by a
page reload during a source edit; only the replacement above is proof. Its verdict identifies the base commit and
dirty implementation tree. Sound quality and real-time smoothness were not judged. Not tested on a device.

The production bot now takes the breaker on its first Village pass before Q6; its later Works leg skips a duplicate
take. The full production route through the Works and the pier's conditional cut were not separately looked at.
The loop proof covers both gameplay orders, not human pathfinding or the next first-timer's comprehension.

## Copy

The Boogler's copy is untouched. The plan's suspect street notice remains unchanged:
“That big hammer's for cracks. One by the turntable, and a jealous one past the quarry.” It still fits the near
crack's first strike and retained glow; no replacement is proposed. No ROM data was used or added.

## Rebase onto terrain v50 — 15 November 2026

Rebased onto `3c8b7ea68` (terrain #1882). Main's dated v50 entry is retained, followed by this step's v51 entry.
Main's completed step-2 evidence is retained in the plan, alongside the owner answers and dropped step 3.
The parent reported no findings from the independent Astra high review of the previous stamp `e673cc6ad2ec`;
that review applies to the previous tree. The new HEAD and review stamp are reported in the final handoff.

All five conflicting railway JSON fixtures were restored from main as generator inputs, then regenerated with
the same repository commands listed above (golden shards serially; both tick-order flags together). None was
hand-merged. The non-fixture range-diff preserves the reviewed implementation; its only resolution differences
are the retained step-2 evidence, namespace history and the v50-to-v51 assertion base.

Two keyed comparisons check every JSON leaf, key order and array length:

- Against v50 main, changed paths exactly equal the original breaker change against v49: golden namespace and
  nine hashes in five stages; 199 call-operation hashes; six M12 final hashes and 92 marks in trains-on and
  q6-finishing; 300 trains-on tick hashes; 3,600 trains-on headway hashes. No other values change.
- Against the reviewed branch, changed paths exactly equal main's terrain changes against the original v49 base,
  excluding the already-v51 namespace: 94 golden hashes, 277 operation hashes, 1,326 M12 hashes/marks, 2,700 tick
  hashes and 14,400 headway hashes. Main's prefab-halts, prefab-trees and compressed host-trace fixtures remain
  byte-identical. The catalogue's documented M12 source-selection/heavy-load interaction remains as described in
  [terrain-clean](terrain-clean.md); this rebase introduces no additional fixture cause.

The non-recording fixture/Works/cart/validation run passed **295/295**, with no skips or failures. Every loop order
passed again for 1–4 players (24 runs plus canonical calibration), including table-before-Q6 and throat-first.
`npm run check` passed again: lint, types, registry, 2,227 passing units (65 skips, one todo, zero failures), level,
assets and build. The check's existing geometry diagnostics are report-only; this is not a new visual clearance claim.
Audit script, keyed results and command logs are saved under `.look/works-flow-rebase/`. Browser and network proof
above is from the pre-rebase tree; neither was rerun for this rebase follow-up. Nothing was pushed or shipped.

## Server host-trace follow-up — 15 November 2026

CI run `43800101384` on ship PR #1886 exposed the missing server check: the rebase had retained the v50
host-trace fixture byte-for-byte, while the accepted checkpoint namespace is v51. The earlier railway tests and
root `check` did not run the server suite. This follow-up starts from `52d32cea0` on `t3/forge-breaker-trains`;
it changes the fixture and its documentation, with no production-code or test-assertion logic changes.

Regenerated `server/test/fixtures/world-host-trace.jsonl.gz` using its own writer only:

```sh
HOST_TRACE_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test server/test/world-host-trace.test.ts
```

The decompressed, ordered JSONL comparison checks every key, array length and leaf across **8,596 records**:

- All **205** checkpoint namespaces change from `rail-v50` to `rail-v51`, with **205** changed checksums.
- **1,842** of the 5,667 `snapBytes` samples change with the checksum's decimal width. Every old and new envelope
  checksum was independently recomputed; every byte count matches its serialized envelope, including three
  samples that report a queued checkpoint before its write is recorded.
- Every other value is identical: checkpoint simulation state and hashes, command inputs/results, messages,
  replication packets, record order and trace lengths. This trace never fits the boiler, so there is **no breaker
  state change** in it. No extra gameplay change or terrain repin is hidden in this fixture update.

As a control, an import hook changes only the runtime namespace back to v50 and points the unchanged trace
assertion at a saved copy of the old fixture. The complete decompressed byte stream matches exactly. Production
files and the regenerated v51 fixture are untouched by this control. Evidence, both audit scripts and logs are
under `.look/works-flow-host-trace/` (`audit.json`, `v50-control.log`, `regen.log`).

The requested `cd server && npm ci && npm test` passed **396/396**, with no skips or failures; this includes the
host trace without the recording flag. The install and full suite logs are saved alongside the audit.
`npm run check` also passed: lint, types, registry, 2,227 passing units (65 skips, one todo, zero failures), level,
assets and build. The fresh review stamp is reported with the committed HEAD in the handoff. No push or ship.
