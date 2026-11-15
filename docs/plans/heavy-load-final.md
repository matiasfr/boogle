# Heavy-load final integration — 15 November 2026

Authorized implementation follow-up to `06001b821` and the independent
[fix3 review](heavy-load-a7aa22d03-review.md). Branch `heavy-load-final`, commits only;
no push or ship. Node 26.13.0, checkout-local dependencies.

## Base and fixes

Fetched and created the requested branch at `06001b821`, then rebased cleanly onto
`f3dd950db` (`origin/main`). This preserves the review's conflict resolutions and
main's forge rack reason/copy correction. No Q4 camera-shot change was present in
that fetched main. The inherited namespace is **v49**: main already shipped v48
for authenticated admission, while heavy load needs its own fresh checkpoint
domain for expanded cargo and the pile/reservation invariant. No new bump or migration.

- P2: change the **loop runner's Actor**, whose documented heightless ground pose
  now means `y = 0`, matching `clearBack`'s drop. Explicit heights still use the
  same reach test. Production `railValid` and real-client height validation stay
  intact; unspecified height is not a bypass for raised targets.
- P3: inspect the source pile before computing take capacity. The shared query
  may credit one slot only if the entire pile fits both the carry ceiling and
  `spare slots + 1`. Partial takes receive no slot credit. Comfort-first pickup,
  big-object exclusions and other players' reservations stay in force. The same
  function runs for authority and prediction, with no stored reservation state.

Principles: **Clear authority**, **Communal world, personal things**, and
**Determinism from day one**.

## M12 prediction before regeneration

The retained fixture is main's fly-first trace. Keep its seeded stages, inputs,
RNG, frame sampling, event assertions and coverage. The integrated tree retains
fly-first; heavy load is the intentional rule difference:

1. The old `free` stops at 8/16 pieces. The integrated `free` stops at comfort
   first, then permits a deliberate second take up to 12/24. Additional accepted
   chops/mines/rack/pile transfers alter carried cargo and source stock, later
   drops/deposits, world hashes, predicted/confirmed/corrected events and remaps.
   Random pile selection depends on current piles, so downstream scripted inputs
   can also diverge after a different accepted transfer. Fresh remains asleep
   within this short script and is expected to remain equal. Frame counts should
   remain equal because the harness schedule and transport delays do not change.
2. Reservations bound excess by `128 - piles - other excess`; new drops consume
   only unreserved slots or release their own excess. Whole-pile takes can now
   reclaim their deleted source slot. If this short trace never approaches that
   boundary, reservation enforcement should cause no additional differences.
   Exact-position top-ups and deterministic pile order may change remaps if the
   script reaches competing partial piles; any such difference must be isolated.
3. `WORLD_NS` changes checkpoint/routing envelopes, but M12 hashes ECS world
   state/next id, ticks, adapter status and action/reset events, not the namespace
   envelope. Namespace alone should cause **no M12 changes**. The host trace and
   golden metadata already carry the review's separately audited v49 update.

Procedure: preserve the old JSON under `.look/heavy-load-final/`, use the test's
documented `M12_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test
test/railway-m12.test.ts`, recursively compare all entries and marks, and run
without record mode afterward. Diagnostic import hooks can isolate the old
comfort-only pickup rule, reservation enforcement and namespace without editing
production files or changing the committed test assertions. Stop and report any
unexplained class instead of committing the fixture.

## M12 audit results

All 82 entry names and their order remain identical. All frame counts and mark
array lengths are identical. Exactly **78 final hashes** and **1,069 checkpoint
marks** change. `fresh/a`, `fresh/b`, `fresh/c` and `press/a` are byte-equivalent
entries; all three clients in each of the 26 non-fresh seeded runs differ.

The diagnostic preload rewrote only in-memory modules and redirected each
recording to `.look/heavy-load-final/m12-<mode>.json`. Four independent runs:

| Control | Result |
| --- | --- |
| Current integrated rules | 32 tests pass in record mode; captures candidate trace |
| Replace only `free` with main's comfort-only pickup rule | Every entry exactly matches the retained main fixture |
| Disable the pickup reservation limit | Every entry exactly matches current integrated rules |
| Replace only `WORLD_NS` v49 with v48 | Every entry exactly matches current integrated rules |

The current and reservation-disabled runs each observe 8,082 heavy-capacity
queries, at least **96 spare slots**, and 1,521 whole-pile credit eligibility
checks (including prediction/replay calls, not unique authoritative actions).
With so much space, the credit never expands what can be taken. This explains
why reservation enforcement and the saturation fix have no independent M12
hash effect. Saturation itself is covered by the review and boundary tests.

All changed hashes/marks therefore belong to the additional accepted-pickup
class and its downstream state/event/input consequences. Exact equality under
the comfort-only control also excludes separate differences from local pile
ordering, recovery, drop height, fly-first integration, and the namespace in
this trace. No trace field, assertion, stage, input generator or coverage
requirement was removed. No unexplained difference remains. Diagnostic source,
four captures, logs and recursive comparison summary are retained locally in
`.look/heavy-load-final/`.

## Evidence and results

Pending full validation.
