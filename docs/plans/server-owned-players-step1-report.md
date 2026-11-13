# Server-owned players, step 1: shadow seats

Implemented 13 November 2026 on `codex/server-players-step-1`. Code commits: `f09619997` (pure seat rules) and
`b8293959` (host, client shadow sends and proofs). DESIGN.md: **Clear authority**, **Server hosts every room**.
No push or ship. Current review-fix commit: **8ca94fbc**. Review stamp: **6ecd353f1336**.
The independent review found two P2s; both are fixed below. The fixes are self-reviewed, not independently re-reviewed.

## Review follow-up, 13 November 2026

Ported the reviewer's `/tmp/seat-review-regressions.test.ts` cases first. Both failed before the fixes:
the rapid re-sit left an empty shadow row, and the disconnect grace produced one false mismatch
(`.look/step1-review-red.log`).

- `src/entities/railway/seat-shadow.ts:43` retries an unresolved claim about once per second, preserving its
  alternates; accepted receipts stop retries, `taken` ends the claim, and a full request window retries later.
  `src/entities/railway/seat.ts:151` binds the helper to the command session and `:255` runs it in the existing
  update hook. Rate refusals never change the visible pose or the lead's grant. Reconnect resets confirmation.
  The server row is deliberately unreplicated: acceptance confirms it, and a new whole mirror invalidates that
  confirmation. This repairs rate/window loss without adding a client-consumed seat projection.
- `server/src/host/hosted-room.ts:149` resolves a grant's peer from active clients **or** the `gone` grace set.
  A disconnected follower's unchanged grant now agrees with its held chair throughout the 1.5-second grace.
- `server/test/seats-host.test.ts:14` pins the rapid sequence, retry termination, full-window alternatives,
  `taken`, reconnect and disposal. `server/test/host.test.ts:65` pins the real-socket grace regression.

### Receipt-adapter answer

The original change at `src/adapters/railway-session.ts:258` preserves `taken` and `rate` in command refusal
callbacks (previously normalized to `refused`). At `:338`, only `order` or `session` sets `sessionLost`, which
calls `lose()` at `:374`; previously every wire reason other than `refused` did so. Thus a seat's ordinary
rate/occupancy refusal no longer clears the epoch/pending work and opens a new command session.

Existing roster and rail-tuning validators return ordinary `refused`, including roster rate limiting; railway
requests use `refused`, `order` or `session`. Their behavior is unchanged: ordinary refusal keeps the epoch and
ready state; order/session still invalidates them. New tests at `server/test/seats-host.test.ts:106` and `:132`
pin roster, tuning set/commit, railway call refusal, and both session-invalidating reasons. The change also
means an unrecognized wire reason would no longer invalidate the session; existing hosts do not emit such
reasons for those ops. No adapter code was changed again in this follow-up.

### Current verification

All runtime/test/eval edits were formatted with Prettier before these runs. No runtime edits followed them.

| Check | Result after review fixes |
| --- | --- |
| `npm run check` | Pass: 1,720 tests, one existing TODO; lint/typecheck/registry/levels/assets/prefabs/build pass |
| Server tests | 237/237; dedicated seat host/adapter suite 11/11 |
| Worktree `npm run test:net` | 140/140, run directly in this worktree |
| `node dev/ship-check.ts` | Pass: 655 assertions, 59 affected test files, 13 lint files, typecheck/registry |
| `npm run registry` | Pass; unchanged debt: 20 suppressions, zero knots, 15 allowances / 24 maximum |
| Shadow comparisons | 4/4 agreements after sit/stand, zero natural mismatches, in-process and real sockets; one injected mismatch logged/counted once |
| Review stamp | `6ecd353f1336` (`--no-fetch`, local-only network constraint) |

Logs: `.look/step1-review-{check,server,net,ship-check,registry}.log`. No remaining check failures.

Visual question: does rapid sit/stand/sit leave both players visibly seated while the shadow recovers?
The existing two-player bench eval, with `seatShadowReview=1`, passed: one rate refusal, two accepted sits
(initial sit plus retry), and seated-pose assertions at refusal and acceptance. No bot assertion failed.
[New broker manifest](../../.look/evidence/1794597755463-2059/evidence.json) records unchanged runtime during capture.
Actually opened both `seat-shadow-review-still.png` and `p2-seat-shadow-review-still.png` beside it: both show
seated Buddies on the bench, the partner partly occluded, neither visibly standing or displaced. Execution
success and these seating observations do not establish real-time visual quality or smoothness. Both peers
saw their partner; WebGPU checks passed, graphics errors were empty. The 5x warp reported a transient 2.752
game-second follower deficit and caught up at capture. The broker still identifies trusted harness `d87c05719`;
the new eval assertions executed against this worktree. Not tested on a device.

The following initial-run details are historical; the current results and stamp above supersede them.

## What changed

The lead still decides every visible seat grant. The client additionally queues `seat.sit { id, alt }` and
`seat.stand {}` through the existing command adapter and ignores their receipts for seating. The server binds the
socket's pid, chooses the first free chair in the list, permits one chair per pid, never displaces a sitter, and
limits accepted sits to one per 400 ms of host time. Standing is unrestricted by cadence, but requires a held chair.
Invalid commands are nonfatal. Refusals distinguish `taken` and `rate`; neither changes the shadow row. Receipt
detail survives ordinary duplicate requests in the live session's bounded retry history.

`status().seats` exposes `{ id, pid }` rows. `status().seatShadow` exposes `checks`, `agreements`, and `mismatches`.
The hosted room reads only the elected lead's grants and resolves peer ids to authenticated pids. A changed pair
of lead/server tables must remain stable for 400 ms before comparison; each stable mismatch is logged/counts once.
This avoids counting ordinary presence/command transit as a disagreement. Departure after the reconnect grace
releases a chair, replacement sessions preserve it, and pause clears all chairs.

No seat component, projection, checkpoint registration or WORLD_NS bump. Ordinary request watermarks/outcomes
still use the existing command bookkeeping. No prefab lint/debt/tests or Boogler files changed; no ROM data.
No new suspect copy was found in the changed files; the plan's existing unreachable frisbee-line finding remains.

## Files

- `src/sim/seats.ts`, `test/seats.test.ts`: pure maps, validation, choice/movement and invariant/id census tests.
- `src/world/rules/seats.ts`, `src/world/rules/README.md`: transient op registration and its documented contract.
- `src/world/server-ops.ts`, `server/src/host/railway-requests.ts`: reasoned validation and bounded duplicate receipt detail.
- `server/src/host/world-host.ts`, `hosted-room.ts`: lifecycle, status and observational shadow comparison.
- `src/entities/railway/seat.ts`: shadow sends only; existing lead grants, prediction, exits and stand-up rules retained.
- `src/adapters/railway-session.ts`: preserve refusal detail and only reopen sessions for `order`/`session` errors.
- `server/test/seats-host.test.ts`, `server/test/host.test.ts`: host/adapter and real-socket acceptance proofs.
- This report and `server-owned-players.md`: step 1 implementation status.

## Tests and evidence

Tests were written and observed failing before production implementation. The real-adapter regression also failed
before the receipt fix: it collapsed `rate` to `refused`, and the general settlement loop treated it as session loss.

| Check | Verified result |
| --- | --- |
| Pure seats plus dedicated host/adapter tests | 9/9 pass; 5,000 seeded operations preserve inverse maps |
| Current id census | All 31 ids accepted: two machine chairs, four seats on each of seven train slots, `forge-workshop` |
| Prefab census | Enumerates the built prefab definitions and every built level placement using the runtime's single/multiple attachment naming rule; no pattern widening needed |
| Two-player headless shadow | 4/4 comparisons agree after the four sit/stand actions, both in-process and over real WebSockets; 0 natural mismatches |
| Mismatch diagnostic | One deliberately wrong lead table produces exactly one logged/counted mismatch; another unchanged sample does not increment it |
| Real socket grace | Reconnect inside the grace retains the row past the cancelled departure timer; actual departure releases it |
| Refusals and persistence | Malformed ids/lists, spam, double sits and forged identity remain nonfatal; the 100 ms re-sit retains its row; later durable checkpoint succeeds; no seat state registered/saved |
| `npm run check` | Pass: 1,720 unit tests, one existing TODO; lint, typecheck, registry, level/assets/prefabs and build pass |
| `npm --prefix server test` | 230/230 pass, including fatal-checkpoint guard regressions |
| `npm run test:net` in this worktree | 140/140 pass; ran the current harness directly, not broker net |
| `node dev/ship-check.ts` | Pass: 655 assertions, 59 affected test files, 11 lint files, typecheck and registry |
| `npm run registry` | Pass; unchanged debt: 20 suppressions, zero knots, 15 allowances / 24 maximum |
| `npm run review-stamp -- . --no-fetch` | `b4a27d9ff54b` |

Local logs: `.look/step1-{seats,check,server,net,ship-check,registry}.log`.
The accepted-duplicate assertion was added after the full server run; the affected nine-test suite passed again.
The final full check passed again after that assertion. Runtime source did not change after the net/visual runs.

Visual question: do both players remain visibly seated on the train's back-to-back bench while the lead still
arbitrates? Used the existing `railway-passenger-car-two.ts` eval, two players, `trains-on` seed, real boarding jumps,
each player's close camera. [Broker manifest](../../.look/evidence/1794596732238-72762/evidence.json).

Actually opened `seat-shadow-bench-still.png` and `p2-seat-shadow-bench-still.png` beside that manifest. Both views
show seated Buddies on opposite sides of the bench, the farther rider partly occluded. Neither is standing or
obviously displaced from the car. The eval completed, each peer saw its partner, WebGPU/frame checks passed and
graphics errors were empty. No bot assertion failed. These images do not measure server agreement: the headless
tests above establish that separately.

## Departures and limits

- Network was restricted to local servers. The plan exists in the local `origin/main` ref and the initial tip
  `4e9d639fc`; a fresh remote fetch is unverified. The required inflight command attempted its implicit fetch and
  was stopped at the sandbox's FETCH_HEAD write; no escalation/retry for remote network was made.
- The shadow rule takes `(ops, now)` rather than an unused replication argument: step 1 has no projection.
- Refusal reasons require the existing request coordinator and client adapter changes described above. This is
  necessary to prevent a seat refusal from reopening a session; it does not flip seat authority.
- The first bench invocation was rejected for unsupported broker `--wall`; retry without it passed. The initial
  direct net run could not launch Chromium in the sandbox; the authorized local harness passed outside it.
- The broker's trusted harness is `d87c05719`; its manifest fingerprints this worktree's tested runtime and reports
  no changes during the run. Later changes were tests/docs and commits only. It reported 2.777 game seconds of
  transient page-two warp drift, caught up at capture; real-time motion/feel and performance remain unverified.
- Deliberate races can differ from the lead's peer-order/group-order choices. The review follow-up adds shadow-only
  once-per-second retry for rate/window loss now; authority still belongs to the lead until step 2. No claim that
  arbitrary shadow traffic always agrees.
- Not tested on a device. No full production playthrough or deployment; review fixes await independent re-review.
