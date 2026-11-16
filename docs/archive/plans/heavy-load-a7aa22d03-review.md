# Independent heavy-load fix3 review

**Fix first.** Part A reviews `a7aa22d03` against `73add587f`, with the requested detached checkout.
Part B rebases it onto fetched `origin/main` **`ac8059924a9751863171c492a573962af3f98bad`** on
`review-integration`. Read AGENTS.md, the requested contracts and nested instructions, the fix3 plan,
and all three previous review reports. Node **26.13.0**, checkout-local dependencies. No push or ship;
the `heavy-load-fix3` branch is unchanged. No author briefing or delegated review was used.

## Findings

### P2 — Drop's new height guard breaks the real-host loop runner

**Location: `src/world/railway-server.ts:200`**, together with `dev/loop/host.ts:26` and
`dev/loop/run.ts:157`.

The runner's ordinary ground positions omit `y`. Its actor's `height()` returns false for every such
position, while `clearBack()` submits drops with `y: 0`. The new `height(e.y!)` condition consequently
refuses those drops. The canonical solo loop reaches T2 carrying spare logs, cannot clear them to mine
stone, and exhausts its policy at **tick 24,134**, with **2,400 refusals**. The full command reports T2
SOFTLOCK/GRAPH BUG for every modeled 1–4-player order. This is a broken verification tool, **not a claim
that players are stuck at T2**: the real two-client browser route completes T2.

Failing test: **`review fix3: the real-host loop can clear its back and finish T2`** in
`test/review-heavy-load-fix3.test.ts`. It runs the actual host-backed `playOrder(['wake', 'T1', 'T2'])`
and fails on the returned softlock. Keep the production height check; align the runner's ground pose
with its submitted drop height. The runner currently prints failure while its CLI exits zero, so the
exit code alone is not a pass. The same reduced run passes on `73add587f` at tick **1,248**;
it fails on both detached `a7aa22d03` and the integration. This is introduced by fix3, not the rebase.

### P3 — A safe whole-pile pickup is refused at saturation

**Location: `src/sim/railway-queries.ts:107`**, applied before inspecting the source by
`src/sim/railway-sys-line1.ts:222`.

With 128 one-piece piles, no existing reservations, and eight logs carried, an in-range pickup of one
whole pile is refused (`accepted: 0`). Taking it would remove a pile and add one excess piece:
**127 piles + 1 reservation = 128**. The new reservation therefore fits, with no effect on anybody
else's stock or escape space. The source-independent `free()` returns zero before `rail.take` can
account for the slot it would free. This is an unnecessary saturation refusal, not lost cargo or a
mobility trap. The conservative one-slot-per-piece policy need not change to permit this transfer.

Failing test: **`review fix3: taking a whole one-piece pile can reserve the slot that pickup frees`**
in `test/review-heavy-load-fix3.test.ts`. It first verifies conservation and actual JSON reload for both
the starting boundary fixture and the independently constructed expected transfer, then fails on
the real command's refusal. Reproduced on both the original reviewed head and the integrated tree.

## Reservation, locality and lifecycle review

- New passing test **`review fix3: only one of two predictions gets the last reservation; renewal and reload
  retain cargo`**: both clients can predict the last slot from one snapshot, but serialized application
  accepts exactly one. The losing player's ordinary drop cannot steal it. JSON reload and session
  renewal retain the loaded inventory and its reservation; the winning drop releases the reservation
  without changing any original pile.
- Reservations are derived from all saved accounts, not live presence. A disconnected loaded account
  retaining its reservation is required by the design, not a leak. Epoch renewal only changes session
  fields; the cargo remains. Leg-kit absence release clears kit attribution, not carried inventory.
- Boarding/seat state and fall/unstuck respawn do not mutate the small-cargo account. `backToSpawn()`
  changes pose and velocity only. These lifecycle conclusions are source review plus existing server
  tests, not a new live saturated-room disconnect/death/boarding experiment.
- Drop searches only exact x/y/z and material matches, respects 3.2 m horizontal and 2.6 m height reach,
  caps small piles at eight, and preserves other reservations. No remaining remote pile write reproduced.
  Existing regression coverage includes mixed cargo, temporary prediction IDs, local top-ups, forged
  checkpoints, bounded forge recovery and save/replay equality.
- Live maximum-pile repro: **128 piles, 1,024 accepted loose logs, 1,024 actual mesh instances drawn**;
  no recovered cargo, eight refused logs still carried, no graphics errors. This checks draw capacity
  and reload, not frame-rate or visibility through occluding geometry.

## Integration conflicts

Git skipped already-applied `dfeb7cc7d` and `303e30a8a`. Replayed commits stopped on the following files:

| File | Resolution |
| --- | --- |
| `docs/brainstorms/first-line-decisions.md` | Kept main's later design corrections and appended review in conflicting blocks; retained non-conflicting branch additions. |
| `docs/plans/forge-call-handoff.md` | Kept main's corrected facts, implementation status and design review over the earlier proposal. |
| `docs/plans/grant-1114-queue.md` | Kept recorded owner answers and later queue status instead of unanswered draft questions. |
| `docs/plans/round-4-notes.md` | Kept the fuller transcript/history and ranked table; did not restore superseded preliminary wording. |
| `src/entities/railway/view.ts` (two stops) | Combined main's boiler/works/engine-start imports with heavy-load's heavyLoad/notify imports; removed an unused rail alias exposed by final lint. Preserved the camp-resident opening and heavy travel gate. |
| `src/entities/railway/line2-view.ts` | Kept both `LINE2_BOILER` and the new depot-offset import: forge hand-off plus moved racks. |
| `docs/agent-calls.md` (two stops) | Kept both fly-first copy notes and heavy-load tuning/reservation entries. |
| `src/world/namespace.ts` | Preserved authentication and heavy-load history; assigned the integrated heavy-load checkpoint domain v49 because main already shipped v48. |
| `server/test/world-host-trace.test.ts` | Preserved both history notes; retained main's test body. |
| `server/test/fixtures/world-host-trace.jsonl.gz` | Kept main's fixture, including the 380 boiler-speed update, then updated only the integrated namespace envelope as audited below. |
| `test/fixtures/railway-m12-trace.json` | Kept main's full fly-first trace instead of mixing incompatible hashes from two rule sets. Its 26 failing comparisons are reported below; no assertions removed or hashes blindly refreshed. |

No other code conflict occurred. Source comparison against main confirms the first-climb glider,
Q4 sea-jamb location, 6 m forge pickup prompt/authority allowance, 380 boiler haul tuning and camp
resident's starter axe remain. The namespace adjustment is an integration resolution, not a finding
against the original head.

## Live sea-jamb and summit test

New committed probe: `dev/look/evals/review-heavy-load-integration.ts`, seeded at **q4-done**.
It takes the usable summit glider before Q5, acquires the overload using accepted chop commands, and
checks both the sea-gate jamb and summit. At each, hook and glide are refused with the Drop explanation;
holding Drop sheds the cargo into local piles at the landing height; a real jump followed by the glide
input opens the glider. Both locations passed, including the framed repeat. Teleports isolate the
locations: this is not a claim of traversing the complete climb while overloaded.

Inspected the framed summit still and all eight motion-sheet frames: Buddy and the retained log stacks
are together on the deck; the refusal toast fades. These show the aftermath, not the movement sequence.
Movement claims come from the executed input/state assertions. The first capture used the harness's
default camera and was rejected as visual evidence; the repeat supplies explicit summit framing.
Both co-op end stills show the players at the completed T2 reward. No device or real-time smoothness claim.

## Checks and evidence

| Check | Result |
| --- | --- |
| Original head: existing heavy-load and previous review suites | **93 passed**. |
| New independent regressions, original and integrated trees | **1 passed, 2 intentional failures**, the findings above. |
| Integrated railway goldens, nine shards plus op streams | **109/109 passed**, including after v49. Only the golden file's `worldNs` metadata changed for v49; no seed hash or op result refreshed. |
| Integrated server tests | **396/396 passed**, including the final v49 rerun. |
| Integrated network checks | **198/198 passed**, including the final v49 rerun. |
| `npm run level-check` | **Passed, 16 reports**, with existing report-only diagnostics. |
| `npm run loop -- run` | **Fails its route verdict** at T2 for all 1–4-player orders (CLI exits 0). See P2 above. |
| `npm run checkpoints` | **25/25 passed**, including the final v49 rerun. |
| Existing heavy-load and earlier review suites on integration | **93/93 passed**. |
| M12 integrated trace comparisons | **6 passed, 26 failed** against the retained main fixture. Together with the new review tests: 7 passed, 28 failed. |
| Max-pile live draw repro | **Passed**: all 1,024 accepted logs drawn after host save/reload; no remote recovery or graphics errors. |
| New sea-jamb/summit movement probe | **Passed twice**; both refusals, local drops and restored jump/glide asserted. |
| Two-player production route through T2 | **Passed**; both finish, mirrors agree at **231 sampled server steps**, no graphics errors. Covers the new opening. |
| `world-inputs` scenario | **Passed**; browser/Node catalogs agree; client shared-state registry empty. |
| Scoped lint, typecheck, registry | **Passed** on final changes; lint first caught the unused import from conflict resolution, which was removed. |

The M12 fixture conflict cannot be resolved by combining its hashes line by line. Main's fixture captures
fly-first and the branch's captures heavy-load acceptance; the integrated rules combine them. Retained the
main oracle and ran the original assertions: every non-fresh seed comparison fails, while fresh and the
remaining M12 assertions pass. This is an explicitly **unresolved integration fixture**, not evidence by
itself of a prediction/desync defect and not a green integration. No trace assertions were removed or
auto-recorded to erase this discrepancy.

The final host trace was regenerated solely for the reviewed namespace conflict, then compared recursively
against the retained main fixture: **8,596 ordered records**, exactly **205 `/1/data/namespace`**, **205
`/1/data/checksum`**, and **1,877 `/1/status/snapBytes`** differences. Namespaces change `rail-v48` to
`rail-v49`. Every other input, state field, state hash, command result and replication packet is identical.
The audit output is `.look/review-integration-host-trace-audit.txt`.

Commands (all with Node 26.13.0):

```sh
node --import ./test/helpers/rail-no-audit.ts --test test/review-heavy-load-fix3.test.ts
node --import ./test/helpers/rail-no-audit.ts --test test/railway-golden-*.test.ts test/railway-ops*.test.ts
node --import ./test/helpers/rail-no-audit.ts --test test/railway-m12.test.ts
npm --prefix server test
npm run test:net
npm run level-check
npm run loop -- run
npm run checkpoints
node --import ./test/helpers/rail-no-audit.ts dev/look/review-heavy-load-piles.ts
npm run look -- --real --rail-seed q4-done \
  --eval dev/look/evals/review-heavy-load-integration.ts --warm 0 --hud \
  --cam 1023,107,3 --look 1015,103,-6 --name review-heavy-integration-framed
node dev/look/playthrough.ts --players 2 --to T2 --warp-speed 3 --name review-integration-coop
node dev/scenarios/run.ts world-inputs
```

Browser evidence identifies **`bca5492fc2f1e339c6b1065bedf2224cfd66faf1` plus the two new test/probe files**,
before the namespace-only integration adjustment and review document. No gameplay changed afterward.
These are working-tree manifests, not claims of final-commit browser verification. The framed summit
still/motion sheet, co-op report/end stills, scenario verdict, draw JSON and copied command logs remain
locally under `.look/`. No full production route beyond T2, live saturated-room lifecycle sweep, device
performance or human-fun verification. Existing heavy-refusal strings remain suspect draft owner copy;
The Boogler's dialogue was not edited.
