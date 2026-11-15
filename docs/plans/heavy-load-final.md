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
recording to `.look/heavy-load-final/m12-<mode>.json`. Five independent runs:

| Control | Result |
| --- | --- |
| Current integrated rules | 32 tests pass in record mode; captures candidate trace |
| Replace only `free` with main's comfort-only pickup rule | Every entry exactly matches the retained main fixture |
| Disable the pickup reservation limit | Every entry exactly matches current integrated rules |
| Disable `spareDropSlots` enforcement for pickups and new drops | Every entry exactly matches current integrated rules; 24,083 queries, actual spare minimum 96 |
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
five captures, logs and recursive comparison summary are retained locally in
`.look/heavy-load-final/`.

## Evidence and results

The first full check found one additional integration oversight:
`test/railway-cart.test.ts` still pinned room ids to v48 after the review moved
the integrated namespace to v49. Updated that exact expected prefix to v49;
the independent malformed cart-column rejection assertion is unchanged. This
is a stale test expectation, not a new save behavior or an M12 difference.

Implementation commits: `983fbd4e9` (fixes, boundary regression and audited M12),
`04fad88da` (stale namespace assertion). No push or ship.

| Check | Result |
| --- | --- |
| Before changes: fix3 review + M12 | Reproduced 28 failures: two review findings and 26 M12 seed comparisons; 7 passed |
| All heavy-load suites, all earlier review suites and added boundary cases | 97 passed |
| Railway golden shards and op streams | 109 passed, no golden/ops fixture changes |
| M12 normal assertion run after recording | 32 passed; all trace and event coverage assertions retained |
| Server suite | 396 passed, including the unchanged 8,596-record ordered host trace |
| `npm run level-check` | Passed, 16 reports; existing report-only level diagnostics remain |
| `npm run loop -- run` | All 20 modeled orders finish (canonical plus four alternate orders for each of 1–4 players); no SOFTLOCK or GRAPH BUG; solo T2 at the reported 2:05 with zero refusals |
| Cart suite after namespace expectation repair | 7 passed |
| Scoped formatting, lint, whitespace | Passed |
| `npm run check` | Final rerun passed: 2,287 unit tests, zero failures, one existing TODO; lint, typecheck, registry, level, assets/prefabs and production build passed. First run's sole failure was the corrected stale namespace expectation |
| `npm run checkpoints` | All 25 stages passed through the real host save path |
| Network checks | Passed, 198/198 |
| Two-player T2 route | Passed: both finish; mirrored hashes agree at 235 sampled server steps; WebGPU, no graphics errors |
| Sea-jamb/summit overload probe | Passed at both landings: heavy hook/glide refused with Drop explanation; all 12 logs shed into local 8+4 piles; jump/glide restored |
| `world-inputs` | Passed: browser/Node numeric catalogs agree and client shared-state registry is empty; no graphics errors |

Commands (Node 26.13.0):

```sh
node --import ./test/helpers/rail-no-audit.ts --test \
  test/review-heavy-load*.test.ts test/railway-heavy-load.test.ts \
  test/railway-golden-*.test.ts test/railway-ops*.test.ts
M12_RECORD=1 node --import ./test/helpers/rail-no-audit.ts --test test/railway-m12.test.ts
node --import ./test/helpers/rail-no-audit.ts --test test/railway-m12.test.ts
node --import ./test/helpers/rail-no-audit.ts --test test/railway-cart.test.ts
npm --prefix server test
npm run test:net
npm run level-check
npm run loop -- run
npm run checkpoints
node dev/look/playthrough.ts --players 2 --to T2 --warp-speed 3 --name heavy-load-final-coop
npm run look -- --real --rail-seed q4-done \
  --eval dev/look/evals/review-heavy-load-integration.ts --warm 0 --hud \
  --cam 1023,107,3 --look 1015,103,-6 --name heavy-load-final-integration \
  --question 'Do the sea jamb and summit allow local unloading to restore jump and glide after overload refusal?'
node dev/scenarios/run.ts world-inputs
npm run check
```

Logs and the full 1,147-leaf M12 old/new diff are in `.look/heavy-load-final/`.
The normally recorded, formatted fixture equals the audited current-rules
candidate structurally. Old fixture SHA-256:
`f400b917b6009133ad73161b896f0dc5a8e5f75c05d6c619059eca9bc36bae19`;
new fixture SHA-256:
`cc29c1cd41633599f1996e3108de9f670af588dda3c99f61644538e940f832fe`.

## Browser evidence and limits

Inspected both co-op end stills in `.look/playthrough/heavy-load-final-coop/`:
both players are by the completed T2 reward, and the overlaid route log reaches
T2 on each. `report.txt` and `verdict.json` report a pass and 235 matching sampled
server steps. The 3x run has peak page-clock deficits of 4.876 / 4.478 game
seconds, caught up by the end; this is route/sync evidence, not smoothness.

The overload probe obtains the first-climb glider before Q5, then exercises
accepted overload pickup, refusal, local Drop and actual jump/glide input at
the sea jamb and summit. Its location assertions record all 12 logs at each
landing's height (38.0 m and 102.4 m), no cargo left carried. Teleports isolate
the landings; this is not a traversal of the entire overloaded climb.

Inspected `.look/heavy-load-final-integration-still.png` and all eight frames
of `heavy-load-final-integration-motion.png`: Buddy and the retained log piles
are together on the summit deck, with the pickup prompt; the earlier refusal
toast fades over the sheet. These are aftermath images. The movement/recovery
claims come from the executed input/state assertions. Capture health passed:
WebGPU, advancing game frames, zero console/page/graphics errors. The jamb is
verified by assertions; the framed visual evidence is the summit.

The queue stamped co-op/probe manifests at enqueue as `6d47eb9d` plus eight
working edits, subsequently committed in `983fbd4e9`. `world-inputs` is stamped
`983fbd4e9`, clean. No runtime source changed afterward: `04fad88da` only repairs
the cart test's expected namespace and updates this report. These are
working-tree/earlier-commit evidence stamps, not a new independent review of
the final head. All three browser verdicts have `underLoad: false`.

No device, real-time smoothness, complete route beyond T2, saturated-room live
lifecycle sweep or human-fun claim. The existing draft refusal strings remain
owner-copy candidates, unchanged: `Too heavy to jump. Drop cargo to travel light.`,
`Too heavy to hook. Drop cargo to travel light.`, and
`Too heavy to glide. Drop cargo to travel light.`

Review stamp for the final source/test diff: **c35dc8c00750**. This identifies
the diff for the caller's next review; it does not assert review approval.
