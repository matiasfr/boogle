# Heavy-load local drop repair — 15 November 2026

Authorized implementation on `heavy-load-fix3`, based on `526db96dd`, with review `73add587f`
cherry-picked as `29fb761d0`. Commit only; no push or ship.

## Chosen design

Serve **Small and readable**, **Communal world, personal things** and **Telegraph everything**:
dropping cannot remove somebody else's work-site stock or teleport materials into a store.
Keep 128 piles, at most eight small pieces per pile (one for a footing), and derive each client's
small-piece draw capacity as `128 * 8 = 1,024`. Exact-position local top-ups remain allowed.

A full table with full piles cannot accept another conserved piece. Merely merging nearby piles or
naming a frame/rack/cart is insufficient: those can also be full, absent or inaccessible on foot.
Instead reserve one free pile slot per **excess carried piece**, summed over all accounts, including
disconnected ones. The invariant is `pile count + total excess <= 128`. No stored reservation row:
derive it from existing inventories, comfort and piles, identically for prediction and after reload.
Each excess piece can therefore be dropped separately, in any material order, at any allowed local
drop point. A drop consuming a new slot must preserve the remaining reservations; a local top-up
consumes no slot. Extra pickup stops at the space that can be reserved, while comfortable pickup
remains available. At saturation, optional overfill is unavailable until a pile is collected or used.
Comfort/max remain 8/12 and 16/24; ordinary play below saturation is unchanged.

This is deliberately conservative: reserve one slot per piece rather than infer locations or future
material grouping. It guarantees mobility recovery without a new op, target, store or remote mutation.
Whole-back Drop can stop at comfort when ordinary storage is full; the heavy player is then mobile.
Existing validated position, request cadence and entity-id exhaustion rules still apply to commands.

## Implementation and acceptance

1. Share pile count/piece bounds; derive reservations in the existing queries; apply them in every
   pickup through `free`, and in Drop. Remove all overflow recovery writes. Validate the same invariant
   on checkpoint load. Update the existing unshipped v48 domain note, with no migration.
   Apply the server's existing height reach as well as horizontal reach to the drop point, so a
   pile on another floor is not a local target. At coincident partial piles, choose creation order,
   including temporary negative prediction ids after confirmed ids.
2. Keep aged recovery separate from Drop; do not recover rails into a forge that would exceed 4,096.
   Preserve the pile for a later pulse. Other recovery stores are already bounded by conservation.
3. Rewrite old recycling assertions as locality/refusal/reservation assertions, preserving conservation,
   replay, prediction (including temporary ids), mixed-kind and replication coverage. Exercise saturated
   slots, partial top-ups, mixed overloaded accounts, contested pickups and reload.
4. Run the earlier reviews, railway goldens, server tests, network checks, level-check, loop and
   checkpoints. Inspect the live maximum-pile draw repro and the existing heavy-load recovery probe.
   Record actual results and limits below. No fixture refresh without explaining changed inputs.

## Risks and scope

All cargo remains Server state; apply has no effects, time source or new transport. The maximum-pile
bound comes from the owner's brief and the review's measured 1,025th-log rendering loss. No materials,
terrain, colliders, bills or Boogler dialogue change. Reservation queries scan bounded piles and the
existing account table only on pickups/drops. They do not add tick work. This replaces the prior
overflow policy; historical review reports remain unchanged. The saturation trade-off is logged in
`docs/agent-calls.md` for the owner to revisit.

## Results

Implementation: `c097ad918` (local bounded drops/reservations), `e5c5fd123` (vertical reach).
Node 26.13.0 and checkout-local `npm ci`. No push, ship, golden regeneration or Boogler-copy edit.

The safety argument is small: with `P + E <= 128`, dropping one excess piece creates at most
one pile and reduces `E` by one. Thus it always fits at a valid local point. A top-up only reduces
`E`; new extra pickup may increase `E` only by the unreserved slots. Ordinary drops preserve
every other account's reservation. Deleting/collecting a pile and granting the pack only free
space. All pile creation goes through this drop system. Normal request cadence, valid positions
and the existing entity-id domain still apply.

| Check | Result |
| --- | --- |
| Both new review defects | Pass: saturated drops preserve the 4,096 forge rack, cargo and reloadability; Home spam preserves every remote pile and the victim's pickup target |
| Earlier review suites, supply, set-down, replication and heavy load | 117 passed in the initial combined run; all included again in the full unit run |
| Final locality, latest review, line authority, heavy load and set-down selection | 39 passed, including two additional prediction/mixed-reservation regressions and vertical/horizontal drop reach |
| Railway goldens | All nine shards and the op-stream goldens pass unchanged; no fixture regenerated |
| Full unit run | 2,259 passed, zero failed, one existing TODO |
| Full lint, typecheck, registry, asset/prefab freshness, production build | Pass within `npm run check:full`; scoped lint and typecheck pass again after the final vertical guard |
| Server tests | 377/377 passed before the height guard. Final fixture-aligned run: 376/377, one unrelated presence timeout; the entire 30-test host file passed on isolated retry, zero failures |
| Network checks (`npm run test:net`, within `check:full`) | 190/190 pass, with the final vertical guard present |
| `npm run level-check` (within `check:full`) | Pass, 15 reports; existing report-only diagnostics remain |
| `npm run loop -- run` | Pass, all modeled orders; unchanged deliberate-overfill regression reaches Gorge at tick 3,615, idle 1,129 / 560 / 363 / 363 |
| `npm run checkpoints` | All 25 stages build through the real host save path |
| Live maximum-pile render repro | Pass: 128 piles, 1,024 accepted logs, mesh draws 1,024 / capacity 1,024, zero recovered; refused eight logs remain carried; WebGPU, no graphics errors |
| Existing heavy movement/recovery probe | Pass: packed 24, blocked jump/air-jump/hook/glide, swimming ascent retained, hold Drop sheds all 24 locally on the raised landing, then jump and glide work |
| Two-player production route through T2 | Pass: both finish, mirrors agree at 227 sampled server steps, no graphics errors; covers the opening/T1 route too |
| `world-inputs` | Pass: browser/Node catalogs agree; client shared-state registry empty |
| Scoped formatting and `git diff --check` | Pass |

The first full run found an error-message ordering regression for invalid footing piles. Restored
the existing footing-specific validator; all 108 validation/latest-review tests and the next full
unit run passed. The height guard subsequently exposed three server fixtures that sent `at.y=0`
but dropped at `y=3000`; their drop points now match their actor's feet. All existing assertions
remain. The full check's unit/static/build phases preceded that final one-line authority guard;
its follow-up verification is the scoped 39-test run, typecheck/lint, server rerun and network run.
This is not a claim that every full-suite phase was rerun on the final commit.

The final server run's sole failure was `no special tab: 3 players hide, then leave in order acb`,
`Error: a: no match in 2000 ms`. With the other verification jobs finished,
`node --import ../test/helpers/rail-no-audit.ts --test test/host.test.ts` from `server/` passed
all 30 tests unchanged, including that case. The full `check:full` invocation exited 0, including
190 network checks. The final fixture-only edits then passed scoped lint, typecheck and whitespace
checks. The untouched 8,596-record host trace passes byte for byte.

### Files touched

- Rule/storage owners: `src/sim/railway-supply.ts`, `railway-queries.ts`, `railway-check.ts`,
  `railway-sys-line1.ts`, `railway-sys-line2.ts`, `railway-sys-steel.ts`, `railway-sys-away.ts`.
- Authority/domain note: `src/world/railway-server.ts`, `src/world/namespace.ts`.
- Pure-rule regressions: `test/railway-heavy-load.test.ts`, `test/review-heavy-load-arrival.test.ts`,
  `test/review-heavy-load-fix2.test.ts`. Old recycling assertions now check local acceptance/refusal,
  retained stock, reservations, prediction, replay and reload. The 2,048-attempt test retains full
  late-client row/packet comparisons at the bounded maximum.
- Host-fixture positions: `server/test/fixtures/railway-supply-fixture.ts`,
  `server/test/railway-host.test.ts`, `server/test/railway-supply-order.test.ts`.
- Runtime repro: `dev/look/review-heavy-load-piles.ts`.
- Documentation: this plan, `docs/agent-calls.md`, `docs/game-design/place.md`.
- Cherry-pick also adds `docs/plans/heavy-load-526db96dd-review.md`, preserved as review history.

### Evidence and limits

Evidence is local and ignored, under `.look/`:

- `heavy-fix3-check-full-final.log`, `heavy-fix3-locality.log`, `heavy-fix3-locality-lint.log`,
  `heavy-fix3-typecheck.log`, `heavy-fix3-regressions.log`, `heavy-fix3-validation.log`.
- `heavy-fix3-server-verified.log`, `heavy-fix3-host-retry.log`, `heavy-fix3-fixture-lint.log`,
  `heavy-fix3-final-typecheck.log`, `heavy-fix3-loop.log`, `heavy-fix3-checkpoints.log`.
- `heavy-fix3-piles.log`, `review-pile-draw.json`.
- `heavy-fix3-movement.log`, `heavy-fix3-framed.log`, `heavy-fix3-framed-still.png`,
  `heavy-fix3-framed-motion.png`, and their verdict JSON files.
- `playthrough/heavy-fix3-coop/` (report, verdict, warp samples, both end stills),
  `heavy-fix3-world-inputs.log`, `scenarios/verdict.json`.

Inspected the framed landing still and all eight motion-sheet frames: Buddy, the retained local log
stacks, full packed bundle and heavy/refusal text are visible together on the raised landing.
The probe refills the player after its successful drop/recovery assertions, so these are aftermath
and UI images, not images of the transfer itself. The first automatic-camera images only framed
terrain/HUD and were rejected as feature evidence. Both co-op end stills show the players at the
completed T2 reward. Movement/recovery claims come from executed live assertions; saturation and
interleaved mixed loads are verified at the rule/prediction/reload layer, not in a live saturated room.

Queued browser manifests identify the working tree when enqueued (`29fb761d0` plus implementation
edits); `world-inputs` identifies `c097ad918` plus the vertical-guard edits. They are not final-head
review stamps. The first movement run finished under load; its framed repeat passed without a load
warning. The 3x co-op route has peak page-clock deficits of 4.182 / 7.921 game seconds despite
matching mirrors and both finish flags. No device, real-time smoothness, human-fun or independent
review claim. Existing draft heavy-refusal strings remain suspect owner copy, unchanged here.
