# Server-owned state: step 9 retirement report

13 November 2026. Implementation tip: `b66e9536ead0b76b901088d59d9a186e3316e71c`, on
`codex/server-state-step-9`, based on `721fcffca`. Step 9 is implemented; checkpoint B
is **not** complete. No push or ship. Development is live, without a flag.

## Authority and deletion

The first commit (`75852d2a9`) removes the eight unused haul tunables and the final
classic roster/tune registrations. The live roster and all 30 rail tune keys already
use Server authority. No lockstep state remains registered, including in prototypes.
`WORLD_NS` is now **v40**, with a dated history entry. Existing namespace admission
refuses a v39 client cleanly before room creation/welcome; no compatibility transport
was added. The reset is intentional under the owner's save-reset call.

The transport commit (`e72255117`) removes `w:edit`, `w:edits`, `w:hash`, `w:need`,
`w:snap`, `w:rejected`, `DELAY`, `LAG`, `LEAD`, `HOST_TYPES`, held edits, operation
registration/submission, hash consensus, desync/snapshot-failure callbacks and the
recovery tail. Hosted rooms drop all client `w:*` messages. The server's `w:c` clock
remains, and clients accept that clock only from `SERVER_ID`. Clients do not execute
server ticks or register server state.

`src/world/sync.ts` goes from 1,074 to 457 lines: 159 added, 776 removed, net **617
lines removed**. Across the implementation through `b66e9536e`: **88 files changed,
1,298 additions, 4,068 deletions, net 2,770 lines removed**. These counts exclude this
report and the plan's final status update.

| Deleted file | Original lines |
| --- | ---: |
| `src/features/proto-haul.ts` | 7 |
| `src/world/rules/edit-gen.ts` | 37 |
| `src/world/rules/index.ts` | 30 |
| `test/classic-trace.test.ts` | 51 |
| `test/fixtures/classic-trace-tune-roster.json` | 346 |
| `test/fixtures/world-inputs.json` | 5 |
| `test/helpers/classic-roster-oracle.ts` | 59 |
| `test/helpers/classic-trace.ts` | 104 |
| `test/helpers/classic-tune-oracle.ts` | 45 |
| `test/sync-recovery.test.ts` | 254 |
| **10 files** | **938** |

## Retained boundaries

- The room clock and fixed server tick remain. Ordinary rooms can persist their
  clock with an empty state registry; railway rooms register roster, rail tuning and
  railway state directly.
- `registerState` requires `{ server: true }`. The server checkpoint retains exact
  namespace/catalog/state-key checks, bounded input, checksum, state-load validation,
  immutable writes, readiness/write failure guards and the sticky failed-load guard.
  Its hash now covers every server state and is verified after restore. The envelope
  contains version, namespace, catalog, checkpoint, hash and checksum; no edit tail.
- Fatal command guards still prohibit new checkpoints after partial mutation, even
  while another durable command waits for a previous write. An already-started
  immutable good checkpoint may finish. Durable roster/tune receipts still wait for
  storage. Periodic checkpoints retain the existing crash window.
- Seats (`addHostField('placeSeatGrants')`) and The Boogler (`addHostField('g')`) stay
  **Host kind on the lead tab**. Owner movement, presence and ball ownership remain.
  Moving seats/Boogler is separate work after checkpoint B.
- Boogler source/copy, `src/sim/gift-catalog.ts`, seat implementation, `DESIGN.md`,
  `dev/lint`, `dev/registry/prefab-debt.ts` and `test/prefab-*` are unchanged against
  the base. No suspect copy was found in the changed files. No ROM data was added.

## Determinism and fixtures

There is no remaining cross-client lockstep authority or classic trace oracle to
pin: **the classic trace oracle is explicitly retired**, not regenerated. The
focused frozen fixture and its test-only old registrations are deleted. Server replay
now compares full state and all 24 railway replica schema rows, including roster and
rail tuning, across two peers, late join, reconnect and checkpoint restart. Explicit
semantic assertions cover the current tune/roster command rules and accepted railway
wake/chop actions. They do not claim an independent old-code oracle.

The five-line classic `world-inputs` registry fixture is replaced by explicit empty
client-state and catalog parity assertions. Host/helper fixtures now install server
rules and use server commands; ordinary-room tests assert clocks instead of classic
edits. The cart namespace assertion changes v39 to v40. The old recovery-width test
now bounds the checkpoint itself: maximum railway/tune/roster state is **100,981 of
128,000 UTF-8 bytes**. No rail default, bound, ordering or golden behavior fixture was
re-pinned. Removing haul keys shifts rail catalog indices down eight, covered by v40.
The final test-only commit (`b66e9536e`) replaces the obsolete background `w:need`
retry expectation with server-clock readiness and sparse-frame advancement.

The plan's proposed broad trig-ban shrink was **not applied**. Railway authority is
server-ticked, but `railway-predict.ts` still invokes shared `railApply`; prediction
must agree sufficiently with server rules for reconciliation, and repeatable server
replay still needs deterministic ordering/arithmetic. Cross-client bitwise float
identity is no longer an authority requirement. Existing math restrictions are kept
conservatively, including those shared prediction paths; no prefab/lint files were
touched. Narrowing the lint scope safely is separate work, not a claim made here.

## Proposed DESIGN sync table (owner commits)

`DESIGN.md` is untouched. Proposed replacement for its current sync-table description:

| Kind | Authority and delivery | Current examples |
| --- | --- | --- |
| Local | This client only; no shared authority. | Camera, UI and presentation. |
| Owner | The owning peer publishes its state through presence. | Player movement and owner-driven ball state. |
| Host | The lead tab publishes host fields. | Seat grants and The Boogler; migration is subsequent work. |
| Server | The room server accepts authenticated commands in arrival order, applies pure rules, ticks the world and publishes replicas. Clients render replicas and may predict selected actions with shared rules. | Railway, rail tuning and live roster. |

Server state persists through verified checkpoints, normally every two seconds and
on close; durable roster/tune commands acknowledge only after their checkpoint is
stored. Clients follow the room clock but do not replay authoritative state or compare
cross-client hashes. A non-durable action may roll back within the checkpoint window.
Prediction is reconciled with server state. Shared authoritative physics and migration
of the remaining Host fields are not part of this step.

## Verification

Tests were added first for real-host convergence and malformed legacy input before
production retirement. Current tests cover join, late join, reconnect, checkpoint
restore after restart, roster/tune/railway convergence, legacy/malformed `w:*` survival
and no checkpoint after fatal command. The docs/tests commit is `68859ff14`.

| Gate | Verified result |
| --- | --- |
| Changed-file Prettier | Run; repository ignores Markdown formatting. |
| `npm run check` | Pass: 1,716 passing tests, one existing train-wait TODO; lint, types, registry, levels, assets and build pass. [Log](../../.look/step9-check.log). |
| `npm --prefix server test` | Pass: 224/224. [Log](../../.look/step9-server.log). |
| `node dev/ship-check.ts` | Pass: 888 assertions, 79 affected test files, 67 lint files. [Log](../../.look/step9-ship-check.log). |
| `npm run registry` | Pass: 22 presence fields, 9 messages, 3 ops, 2 rules-owned states; debt unchanged. [Log](../../.look/step9-registry.log). |
| `npm run level-check` | Pass. [Log](../../.look/step9-level.log). |
| `npm run loop -- run` | Pass. [Log](../../.look/step9-loop.log). |
| `npm run review-stamp -- . --no-fetch --base 721fcffca` | **5defc05d9ebc**, 58 files. [Log](../../.look/step9-stamp.log). |
| Independent review | Fresh Astra high-risk review of implementation plus final test fix: no concrete findings; static review, not device proof. |

The first full check caught the stale snapshot-retry test, fixed before the passing
rerun. The first server pass exposed missing mock callback stubs and an unrelated
playdata 404 failure; focused tests and the complete rerun passed. No playdata code
was changed. Reviews/stats use the required local base explicitly; no fetch, external
network, push or ship was used.

### Browser evidence and limits

All browser work used the supplied broker. Worker provenance is in each manifest;
the broker's own internal verdict commit is its older harness, `d87c05719`.

- [Two-player T2 bot](../../.look/evidence/1794592213983-99394/evidence.json): **pass**,
  both finish, no missed beats, agreement at 96 sampled server steps and no graphics
  errors. Opened `run/end-still.png` and `run/p2-end-still.png`: both avatars, laid
  track, rack and T2 completion overlays are visible.
- [Two-player look](../../.look/evidence/1794592400621-6117/evidence.json): **pass**.
  Visual question: do both peers show completed T2 track and each other after the
  retirement? Opened `step9-two-player-still.png` and `p2-step9-two-player-still.png`:
  track and completion overlays are present in both; the second clearly shows both
  players by the rack. Both report one peer and completion, with no graphics errors.
  The diagnostic overlay obscures part of the first view. No claim that the unopened
  motion contact sheet was inspected.
- [Broker net](../../.look/evidence/1794591993468-92528/evidence.json): **failed before
  assertions** because the old launcher host imports deleted `rules/index.ts` from
  the worker. This is the requested `test:net` route; it is not a pass. The updated
  net harness in this branch requires caller review/relaunch. No obsolete harness
  chase or direct Chromium bypass was attempted.
- [World-inputs](../../.look/evidence/1794592468281-6585/evidence.json): **failed** its
  initial old "game is up with the gifts layout" readiness check after 94.7 seconds;
  no graphics errors. It never reached the replacement registry assertions. The
  earlier scenario attempt was canceled before source edits; it is superseded by
  this completed failure. The first checkpoint-list request failed the broker's
  two-player clock requirement; retrying with two players succeeded but listed no
  checkpoints, so the successful look used the existing T2 route evaluation.

Both successful visual runs tested clean `b66e9536e` / tree
`b0d073b9665bb4222448d409d7e2275ad3de968f`, without source edits during execution.
The bot used 3x warp and the look used the broker's 5x default. Clock drift was
reported (bot maxima 3.563/8.855 game seconds; look 15.835/15.938), so these prove
execution/appearance, not real-time smoothness or timing. No bot beat failed.

**Unverified:** updated trusted net/scenario harness execution; two-device join,
reconnect and restart; real-time feel/smoothness; performance on a quiet machine;
the outstanding tuning-panel browser look from step 3. **Not tested on a device.**
Checkpoint A's earlier gaps and checkpoint B remain open; passing unit/server tests
do not close them. No `check:full` or deployment was claimed.
