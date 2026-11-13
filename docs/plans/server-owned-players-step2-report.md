# Server-owned players, step 2: flip seats

Implemented 13 November 2026 in `codex/server-players-step-2`, based on local `origin/main` at `d50f514c5`.
Initial implementation and check-fix tip: **ba29e0b2**. Initial review stamp: **6c2eb947767b** (`--no-fetch`).
The network-harness follow-up is **a2ed92de**, with review stamp **d5acdddd1cd3**.
The replica-phase and quiet-seat follow-up is **de7d63e4**, **fa733c8d**, with review stamp **71275b90226c**.
No push or ship. Step 2 is built; **Checkpoint S is incomplete**. The initial browser broker predated v40;
the direct network-harness follow-up below supersedes the original network verification limit.
DESIGN.md: **Clear authority**, **Server hosts every room**, **Enjoyable alone and together**, **Small and readable**.

## Change and deletions

The server's transient global `seat { pid }` row is authoritative, one seat per pid. Clients consume complete mirrors,
including late joins and empty refills, and the seat kind participates in mirror hashes. `WORLD_NS` is **v41**, with
a dated history entry. A real-socket host test proves a v40 room request is refused cleanly. Seats are not checkpointed.

Sit and stand still show on the press. The local seat session tracks the command's epoch/request and reconciles once
a second while the adapter is ready. Only a matching `taken` refusal steps the rider off; rate, unknown and storage
outcomes retain the prediction. Reclaims keep the ordered reachable alternatives, including after reconnect/restart.
The existing platform-carry order 21 is unchanged. Remote seating follows the server row even with stale or missing
Owner `placeSeatPose`; a fresh uncontested Owner pose can bridge a rowless prediction. Standing clears the Owner
pose immediately, and friends stop the confirmed pose when its row clears. Offline/prototype seats remain local.

Deleted `placeSeatGrants`, `placeSeatRequest`, lead `assignSeats`/`assign`, request tickets and grant bookkeeping,
the lead/connection-change stand-ups, the host shadow comparison/status, `src/entities/railway/seat-claims.ts`,
`src/entities/railway/seat-shadow.ts` and `test/seat-claims.test.ts`. The old shadow command helper is replaced by
`seat-session.ts`, whose corrections are exercised through the real host/adapter tests.

Per-peer recording follows the roster: budgeted `seat.player` changes (stand has `id: null`) and complete
`seat.begin`/`seat.player`/`seat.end` snapshots on a fixed 30-second trailing window. The actual recorder's flood
test retains all 1,000 unrelated events, has zero drops and stays below 1,020 queued events after sit/refill floods.

**Still uses the lead:** The Boogler's `g` Host field and brain selection; server election and its wire messages;
`addHostField`/`hostField`, presence resend and transport/debug consumers. None of those were changed beyond deleting
the host's seat shadow reader. No Boogler files, prefab lint/debt/tests or ROM data were changed. No new suspect copy;
the plan's existing unreachable frisbee-line finding remains for the owner.

## Tests first, fixtures and harness

New server mirror tests were observed failing before projection existed; the new client acceptance tests failed
before `seat-session.ts` existed. They now prove rate hold/retry, full-window retry, ordered alternatives, stale
receipt isolation, first-arrival contention, third-player refusal at two stools, hostile nonfatal refusals, duplicate
requests, socket grace, departure/pause cleanup, late join, partial-packet publication, actual restart and friend-in-gap
reclaim. A timeout or ack without an outcome is not acceptance.

- `server/test/helpers/rail-tune.ts` now recreates the real host against its existing store, retaining disconnected
  client adapters. This tests a real restart instead of pretending that clearing a map is one.
- `server/test/host.test.ts` replaces observational lead-shadow assertions with actual client mirror and 1.5-second
  grace assertions. `seats-host.test.ts` removes the obsolete shadow comparison and tests visible correction callbacks.
- `test/railway-cart.test.ts` updates its namespace expectation to v41; no cart behavior or old-column rejection changed.
- Seat recorder tests isolate each tab's real binder/mark module. Literal source URLs and the explicit dynamic-import
  inventory in `test/change-class.test.ts` keep those dependencies in CI's server closure.
- The railway bot, workshop chair, bench, passenger-car, two-player passenger-car and ring-crossing evals now assert
  authoritative occupants by pid. No existing scenario asserted the deleted grants. The seat atlas story is updated.
- The existing network harness adds late join, contention, third-player refusal, hiding/lead transfer, grace reconnect,
  actual first-page closure, restart/friend reclaim and stand cases. The old trusted broker did not execute these
  added cases. The follow-up uses the worktree's direct `npm run test:net`, as CI does. No new browser harness was added.
- No replay/schema golden or land fixture was regenerated. Contract prose was shortened/repositioned to keep the
  existing required-reading budgets; no safety contract or lint budget was relaxed.

## Checks

All changed TypeScript files were formatted with `npx prettier --write` before the final checks. Runtime code did
not change after the captures. The final change after these checks is this report and the plan's status only.

| Check | Verified result |
| --- | --- |
| `npm run check` | Pass: 1,712 passed, one existing TODO; lint, typecheck, registry, levels/assets/prefabs and build pass |
| `npm --prefix server test` | 250/250 pass |
| Check-fix tests | 52/52 pass, including the recorder test after its URL isolation adjustment |
| `node dev/ship-check.ts` | Pass: 668 assertions, 70 affected test files, 29 lint files, typecheck and registry |
| `npm run registry` | Pass; unchanged debt: 20 suppressions, zero knots, 15 allowances / 24 maximum |
| `npm run loop -- run` | Pass; no bill, supply, cue or route change |
| Independent Astra review | No actionable P1/P2/P3 findings; 25 focused tests passed; no independent visual review |
| `npm run review-stamp -- . --no-fetch` | `6c2eb947767b` |
| Broker network check | Failed before game tests: stale trusted host imports deleted `src/world/rules/index.ts` |
| Broker `scenario world-inputs` | Failed waiting for the retired gifts layout; current worktree scenario has already removed that requirement |
| Broker two-player T2 segment | Pass: both finish, mirrors agree at 95 sampled server steps, no graphics errors |

Logs: `.look/step2-check-final.log`, `step2-server.log`, `step2-fixes.log`, `step2-ship-check.log`,
`step2-registry.log`, `step2-loop.log`, `step2-review-stamp.log`. The initial `step2-check.log` failed on the v40
literal, recording dependency inventory and a tracked-file scan during unstaged deletions; the final check passes.

## Browser evidence actually inspected

The manifests distinguish the worker build from trusted harness **d87c05719**. Every run reports
`changedDuringRun: false`. Both successful bench looks run against **ba29e0b2**.

1. [Initial combined contention/rate probe](../../.look/evidence/1794599918401-45247/evidence.json): failure,
   `loser remains in the alternate chair`. The two independent probes overlapped: one requested a held chair while
   its occupant stood/re-sat. This confounds the contention assertion; no still was produced. The probes were then
   run separately, without changing runtime code.
2. [Contested bench](../../.look/evidence/1794600368169-51220/evidence.json): pass. Question: do both riders remain
   seated when the server resolves a contested bench chair? Both board by real jumps, sit, then the second requests
   the occupied chair with its own neighbour as fallback. The first occupant is not displaced. Opened
   `server-seat-contest-still.png` and `p2-server-seat-contest-still.png`: the local Buddy is seated in each view;
   the partner sits on the opposite side, partly occluded. Neither is standing or visibly displaced. Under load,
   transient page-two warp deficit 1.052 game seconds, caught up at capture; not timing/feel evidence.
3. [Rapid re-sit](../../.look/evidence/1794600943110-63667/evidence.json): pass. Question: does a rate-refused rapid
   re-sit remain seated while its row recovers? One `rate`, two accepted sits (initial plus retry), seated on the press,
   at refusal and after acceptance. Opened `server-seat-rate-still.png` and `p2-server-seat-rate-still.png`: both show
   seated Buddies on opposite sides, partner partly hidden, no visible displacement. WebGPU, frame health and remote
   pose checks pass; graphics errors empty. These stills do not establish real-time smoothness or reaction latency.
4. [Two-player route through T2](../../.look/evidence/1794600786917-62611/evidence.json): read `run/report.txt` and
   `run/verdict.json`; opened `run/end-still.png` and `run/p2-end-still.png`. Both show the players at the completed
   station with the route's T2 completion overlay. No missed beat or bot assertion failure. Warp transient deficits
   reached 2.920/7.073 game seconds and caught up; no timing or smoothness claim.
5. [World-input failure](../../.look/evidence/1794600785733-62604/evidence.json): opened
   `world-inputs/inputs-final-still.png`. The game is drawn outside the shop; graphics errors are empty. The stale
   gifts-layout predicate timed out before parity assertions, so this is not a world-input pass.
6. [Network launcher failure](../../.look/evidence/1794600439240-52458/evidence.json): module load error before
   network assertions, no image. This does not test the current worktree network harness.

## Direct network follow-up (13 November 2026)

Harness fix: **a2ed92de**. This is a **proof/fixture defect**, not a server seat-authority defect. Direct
`npm run test:net` reproduced the owner's exact failure: **116 passes**, then `first seat request wins`.
The test page had never set its actor pose, so `railEdit` omitted `at`; the host correctly returned `rej: refused`
before invoking the seat rule. The corrected proof first asserts that refusal and unchanged empty mirrors, then
supplies valid actor facts. `ws-page.ts` exposes explicit `ok` receipts, and `ws-railway.ts` requires `accepted: 1`
before sending the competitor. An ack watermark is not acceptance. Mirror assertions poll replicated rows; no
sleep was added to order requests. Sessions also use the server's returned next request number.

The first fixture correction got through contention, alternatives, third-player refusal, hiding, reconnect and
departure (**133 passes**), then exposed another raw-page fixture omission at restart: without the production
adapter, the page never called `rail.refill()` on disconnect. A fresh snapshot omitting transient seats therefore
left its old seat row behind. The raw page now follows the production adapter's refill lifecycle, retaining the
visible rows until the complete replacement arrives. All existing assertions remain; four checks were added.
Only the two network-harness files have source changes. Production code and **v41 are unchanged**.

The final five-run series passed consecutively on the unchanged harness now committed as **a2ed92de**:
**175/175, 175/175, 175/175, 175/175, 175/175**. The pre-branch total was **140**; this branch adds 35 checks.
The shared browser queue serialized these runs with other agents' debug, scenario and net jobs. No bypass was used.
There are no remaining failures in this final series. Logs:
[original reproduction](../../.look/step2-net-reproduce.log),
[intermediate fixture failure](../../.look/step2-net-fixture-attempt.log),
[run 1](../../.look/step2-net-fixed-1.log), [run 2](../../.look/step2-net-fixed-2.log),
[run 3](../../.look/step2-net-fixed-3.log), [run 4](../../.look/step2-net-fixed-4.log),
[run 5](../../.look/step2-net-fixed-5.log).

After the final harness edit: `npm run check` passed (1,712 passed, one existing TODO), server tests passed 250/250.
`node dev/ship-check.ts` passed 668 assertions across 70 affected test files, with lint and typecheck; registry passed
with unchanged debt (20 suppressions, zero knots, 15 allowances / 24 maximum). The final review stamp is
**d5acdddd1cd3**, using `--no-fetch`. These checks were rerun after the five network passes.
The follow-up logs are `.look/step2-followup-{check,server,ship-check,registry,review-stamp}.log`.
The [follow-up evidence index](../../.look/evidence/step2-net-followup/evidence.json) collects copied logs and the three
opened stills. It is a manual index of direct command results, not a broker-generated execution manifest.

No captures, looks or bots were launched in this follow-up. Opened three existing PNGs produced by the separate
Claude runner: [A mid-ride](../../.look/runner/seats-explore/c1-A-mid-ride-still.png),
[B mid-ride](../../.look/runner/seats-explore/c1-B-mid-ride-still.png), and
[B after the lead closed](../../.look/runner/seats-explore/c2-B-after-lead-closed-still.png).
Both mid-ride views show two Buddies seated side by side on the bench; the post-close frame shows one Buddy seated
on the bench with the other chair empty. These are visual observations of saved frames, not an independent verdict
on the runner's execution, continuous motion or device performance. The runner's untracked debug harness is not
part of this fix and was left untouched.

## Replica phase and quiet-seat follow-up (13 November 2026)

**Cause and fixes.** The idle sample mismatch was a pre-existing server scheduling defect: a client's first whole
snapshot scheduled its hash at that send step plus 120. Staggered joins, resync or a deferred hash established
independent phases indefinitely. Ordinary deltas and private receipts did not reset that timer. Step 1 already had
this scheduler; empty seat registration adds no packet, and the seated reconcile sends nothing when desired and
held rows agree. Seat changes can add shared deltas, but no change in failure probability was measured.

`src/world/replicate-server.ts:267` now schedules the next global multiple of 120. A backpressured client receives
its overdue hash when writable, then returns to the common phase. The regression in `test/replicate.test.ts:387`
failed first, and covers staggered joins, a private receipt, backpressure and resync. The strict scenario helper is
unchanged: railway, roster, tuning and seats are compared at one server step (the composite hash includes seats).

`src/entities/railway/seat-view.ts:12` selects authoritative rows independently of presence age.
`src/entities/railway/seat.ts:256` applies that selection before remote animation, then anchors the avatar at its
chair at line 282. This removes the 200 ms expiry that made a retained chair look like a stand-up. Fresh Owner
prediction also bridges a rate-refused re-sit while the row is absent, excluding server occupants, competing fresh
poses and the local predicted sitter. All three view-model tests failed against the former rule before the fix.
The known opaque-id tradeoff is updated: a hostile claimant of a known chair can now be drawn there.

**Current-tree checks.** All five direct `npm run test:net` runs passed **175/175** each (35 more than the pre-branch
140). Five direct `npm run scenario -- smoke reconnect-edit` runs each passed all **15 assertions**: smoke **5/5**,
reconnect-edit **5/5**. Their matched server steps, respectively: **840/840, 840/840, 840/865, 842/889, 858/841**.
The helper may catch a shared delta before the periodic boundary; equality is still exact at the same step.
`npm run check` passed **1,716 tests**, with one existing TODO; server tests **250/250**; focused tests **17/17**;
ship-check **758 assertions**, 81 affected test files and 33 lint files; registry passed with unchanged debt.
Independent Astra code review found no actionable defects. Review stamp: **71275b90226c**, with `--no-fetch`.

The [evidence index](../../.look/evidence/step2-seat-followup2/evidence.json) preserves the five net logs, five
scenario logs, final scenario verdict/stills and check logs. It is a manual index of direct command results, not a
broker-generated manifest. All ten scenarios and the looks tested clean **fa733c8d**, tree
**dd2e5136d5c3393d233a8894c55a81a992a7ba25**. The following changes only correct this report and the plan's risk prose.

**Browser execution versus visual result.** The [broker scenario attempt](../../.look/evidence/1794605785900-47185/evidence.json)
failed both scenarios before replica comparison: trusted harness **d87c05719** expected the retired host-role model
and rejected `client,client`. The worktree's existing npm scenario runner was used as a fallback, under the shared
queue; no new scenario or browser harness was written. The first look invocation also rejected unsupported `--wall`
before launch; it was retried without that flag.

The [first quiet-seat look](../../.look/evidence/1794605697083-44214/evidence.json) and
[second camera attempt](../../.look/evidence/1794605896712-50918/evidence.json) passed state/capture checks, but their
opened watcher stills hid the remote sitter behind the local player and bench. The second attempt's action only
ran on the first page in the old harness. Neither supplied an adequate remote visual verdict.

The [third, final look](../../.look/evidence/1794606731552-62639/evidence.json) used the existing bench eval with a
camera-only wrapper on the watcher. Both players boarded and sat; sender presence stayed paused through capture.
At 1x, the watcher measured **3,133.1 ms** without a presence update while its seated animation input stayed current
(**8.5 ms**). Opened both `seat-quiet-watcher-still.png` and `p2-seat-quiet-watcher-still.png`: the exposed yellow friend
has hips at bench height, bent knees and feet forward, visibly seated rather than standing. Independent visual
review agreed. Capture health passed, with no page, console or graphics errors. The wrapper is saved beside the
manifest. No additional capture round was needed.

Also opened the final smoke `Alice-still.png` and reconnect-edit `other-still.png`: both show the players outside
the shop, without a loading or error overlay. These saved frames do not establish motion quality. No bot playthrough
was run in this follow-up. Current direct checks have no remaining failures; stale broker failures remain recorded.

## Remaining verification and departures

- Current `world-inputs` and continuous first-tab-close mid-ride behavior remain unverified by this agent. The initial
  report incorrectly treated the broker restriction as preventing the direct worktree network test; the owner
  explicitly authorized it for the follow-up. The earlier broker required both pages open for final health checks
  and exposed no close-first-page operation. The separate Claude runner supplied the earlier close-tab evidence;
  the latest follow-up adds the quiet-presence look described above. Checkpoint S stays open pending the remaining
  world-input and continuous close-tab evidence.
- Own reconnect and actual server restart are proven with real host/client adapters, and grace with real sockets;
  the corresponding seated avatar transitions have not been captured in a browser.
- Immediate input is implemented in the press path and the rate look asserts its pose; sub-100 ms end-to-end reaction
  latency and real-time motion/feel are unmeasured. No full production route, deployment or two-device test.
- Network access was restricted to local servers. `inflight` fetches and calls GitHub, so it was not run; only cached
  local branch/ref information was read. Review stamp used `--no-fetch`. Fresh remote state is unverified.
- **Not tested on a device.**

## Commits

`82d28cb0` Replicate authoritative transient seats; `15b38eca` Record seat changes within session budgets;
`1802f8c5` Predict and reconcile seats against server rows; `ba29e0b2` Align seat proof fixtures and reading budgets.
The following documentation commit records this assessment. No push or ship.
