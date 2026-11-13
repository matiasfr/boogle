# Server-owned players, step 2: flip seats

Implemented 13 November 2026 in `codex/server-players-step-2`, based on local `origin/main` at `d50f514c5`.
Implementation and check-fix tip: **ba29e0b2**. Review stamp: **6c2eb947767b** (`--no-fetch`).
No push or ship. Step 2 is built; **Checkpoint S is incomplete** because the trusted browser broker predates v40.
DESIGN.md: **Clear authority**, **Server hosts every room**, **Enjoyable alone and together**, **Small and readable**.

## Change and deletions

The server's transient global `seat { pid }` row is authoritative, one seat per pid. Clients consume complete mirrors,
including late joins and empty refills, and the seat kind participates in mirror hashes. `WORLD_NS` is **v41**, with
a dated history entry. A real-socket host test proves a v40 room request is refused cleanly. Seats are not checkpointed.

Sit and stand still show on the press. The local seat session tracks the command's epoch/request and reconciles once
a second while the adapter is ready. Only a matching `taken` refusal steps the rider off; rate, unknown and storage
outcomes retain the prediction. Reclaims keep the ordered reachable alternatives, including after reconnect/restart.
The existing platform-carry order 21 is unchanged. Remote seating requires both the row's pid and Owner
`placeSeatPose`; standing clears the pose immediately. Offline/prototype seats remain local.

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
  actual first-page closure, restart/friend reclaim and stand cases. **Those added harness cases are not executed by
  the old trusted broker**; they require a launcher refresh. No new browser harness was added.
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

## Remaining verification and departures

- Worktree `npm run test:net`, current `world-inputs` and the literal first-tab-close mid-ride look remain unverified.
  The required broker is stale; direct Chromium was prohibited. Its two-player look also requires both pages open
  for final screenshots/health and remote counts, and exposes no close-first-page operation. No bypass or compatibility
  shim was added. Checkpoint S stays open for these proofs after a trusted launcher refresh.
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
