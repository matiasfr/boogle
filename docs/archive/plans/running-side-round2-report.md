# Running-side second review fixes (14 November 2026)

Follow-up to d1e1eb0b6 and review-running-side-5. No push or ship. The three first-round P1 fixes remain.

## P1: retained block protection

This was a Server signalling defect, not just view geometry. `endMoved` left the accepted departure on its old
physical path, while `blockFree` and `planLeg` immediately discarded the old block/signal. A leg could also pass
through that former end without ending inside it. The accepted row now derives its retained end block, including
an inbound `turn` committed before arrival sets `origin`. Planning and tick spacing checks include it until the
whole `TRAIN_EXTENT` clears. Old signals remain available as legal holds. No new field or namespace bump.

The reviewer deck test failed first (2.204 m penetration with zero headway); the normal-headway port now passes
with 1.790 m minimum clearance over 300 ticks. Fourteen transition sweeps each run 1,000 ticks, restore rows after
40, check spacing, compare drawn decks before the waiter releases and assert eventual clearance/release:
Q6, Q7, bents 1–7, rivet, Ring Island / stack 1, stack 2–4. The old waiter releases one tick after clearance in
every case. Separate assertions cover inbound `turn` arrivals and legs crossing the whole old block.
The focused block suite passes 17/17; the combined initial origin/path/review set passed 16/16.

The seed golden changes only 15 downstream stage entries: q6-done, works-arrive/open/stocked, deck-laid,
gap-footed, leaf-raised, ring-joined, steel-kit/lit/home, boiler-long and gorge-open/mid/reached. Q6+ no longer releases
a competing train into its old occupied block; later head/wagon availability shifts deterministically. The schema,
seed inputs and WORLD_NS stay v45. Regenerated stage/after hashes and any resulting seed-tick shifts belong to
this rule change, not a hash-only schema update. The 103 golden tests pass. Related trace changes are accounted for below.


## P2: platform authority follows clearance

Shared accepted-row queries choose platform, terminal direction and boarding availability for both the live
levers and server `rail.call` validation. A train still standing at its former end, or committed to arrive with
`turn`, answers the original-side homeward lever. After departure begins, neither lever invites a future train
on the opposite platform until the retained block clears. Then normal middle-halt authority resumes; the Pier
remains homeward-only. `trainServes` selects the committed train before its arrival and returns -1 during the
uncleared departure gap. Views contain no remembered platform state; cloned/late readers agree.

The two reviewer regressions failed first (wrong west platform and accepted west-only reach). A third regression
failed first for accepting an east ask after its train had left. The fixed focused run passes 34/34, scoped lint
has zero problems. Its 18 new cases include 14 transition sweeps for retained authority, clones, last-centimetre
occupancy and full clearance, plus pending-turn and post-departure service. Growing stop lists also check outbound
suppression. Existing Q6 service tests now wait for actual clearance before asserting ordinary middle-side service;
existing lever/server parity tests use availability and the actual seed tick. No extra state or new/changed string.

Golden detail: the first four changed stages alter only their stage hash; the other 11 change both hashes and
finish exactly one tick later. The other 32 of 47 stage entries remain byte-identical in meaning.


## Recorded outputs and review

P1 also changes the downstream replay traces, because these are accepted signalling rules, not view-only geometry:

- `railway-m12-trace.json`: six stages (q6-done, works-arrive/open/stocked, deck-laid, ring-joined), each a/b/c:
  18 mirror hashes and 276 hash marks. Keys, frame counts and mark lengths stay the same.
- `railway-tick-order.json`: only deck-laid and ring-joined; each starts one tick later and changes 300 hashes.
- `railway-tick-order-heads.json`: only ring-joined at 0/40/100 headway; each starts one tick later and changes
  1,200 hashes. System sequences, per-tick indices and replay lengths are unchanged.
- P2 `prefab-halts.json`: only q6-done's live halts, plaque-text redraw list and targets. The old-end lever keeps
  its authority through clearance; two prompts disappear during the departure gap. Static catalogs, meshes,
  box values, bodies, up-platforms and every other state stay unchanged. The request golden is unchanged.

The initial broader runs exposed 12 recorded-output mismatches. Each was checked against the new rules above
before regeneration; no unrelated goldens were replaced. M12 recording passed 32 tests, tick-order recording
23, and prefab recording one. An independent Astra review found no correctness findings, ran 51 focused tests,
and checked the fixture scope independently. No browser/device conclusions were inferred from that review.

## Fresh browser evidence

All four final runs used the broker, with no source edits while a run was active. The launcher harness still stamps
`d87c05719`; manifests record the worker's dirty runtime before its final commits. The later report, formatting and
commit organization do not change the captured runtime logic.

- [Old-signal motion manifest](../../../.look/evidence/1794681244822-59026/evidence.json): pass. Opened
  `q7-signal-still.png`, `q7-signal-motion.png` and three consecutive encoded frames (`frames/frame-01.png`
  through `frame-03.png`, extracted from video frames 10–12). Question: does the old signal protect the retained
  departure through clearance? The sheet shows separate decks through the crossing and the waiter moving after
  clearance; no visible intersection. At tick 7610 the old waiter is at 527.8 m, the departing reference is at
  569.43 m, and both Pier levers are chained during the departure gap. This is visual separation evidence, not
  a real-time smoothness or performance verdict.
- [Pier authority manifest](../../../.look/evidence/1794681502919-63132/evidence.json): pass. Opened
  `q7-platform-still.png`. Question: after Q7, can a player request the retained train from its own platform?
  The train is beside the east deck and the player sees `Request stop: to Village` there; the west deck is empty.
  Accepted-state diagnostics record east live/west chained at tick 7090, train origin 72650, phase STAND.
  The west chain itself is not clearly readable from this camera. Two earlier capture attempts failed their
  too-early standing assertion (manifests 1794680722823-52068 and 1794681243574-58952); the final eval waits for
  actual arrival. The first attempt queued under load; the second proves queue time alone was not the cause.
- [Two-peer T2 manifest](../../../.look/evidence/1794681562553-64790/evidence.json): pass, both expected end beats,
  hashes agree at 226 sampled server steps. Opened `run/end-still.png` and `run/p2-end-still.png`: both peers
  appear together beside the completed track and T2 rack. Read `run/report.txt`. Browser-clock drift was logged;
  world-tick comparisons passed. No timing or feel claim.
- [world-inputs manifest](../../../.look/evidence/1794681561162-64582/evidence.json): **failure**, waiting for
  “the game is up with the gifts layout”. Opened `world-inputs/inputs-final-still.png`: the game rendered at Home.
  The trusted scenario still checks the retired classic gifts fixture; this worktree's scenario already removes
  that dependency. This is a remaining harness mismatch, not a passing production registry proof. No bypass.

The look seeds use accepted deposits and normal train ticks; only the camera and player are positioned for framing.
They do not inject train rows. Net is intentionally left to the orchestrator. Full-route, late-join riders, real-time
feel and device proof remain unverified. Not tested on a device.

## Scope and departures

The single unshipped v45 covers the rotunda 1a/1b (Home anchors, pallet/table bridge, staged blockout, town plan and
stone yard), running-side steps 3/4/5, replicated departure origin, the complete retained car path and Pier west
platform, plus these accepted old-block and platform-authority fixes. No second bump, migration or new row field.
Other tracks naming the shared reset are not claimed landed by this report.

The deliberate departures are retaining the old block in accepted signalling rather than patching the view, and
chaining both levers after the old departure starts until clearance. This corrects the prior immediate Q7 authority
switch; normal middle-halt service resumes after clearance. Wait schedules now intentionally differ from the base
at the downstream fixture stages above. Both defects were swept at Q6, Q7, every bent 1–7, the rivet, Ring Island
(stack section 1) and stack sections 2–4; all 14 block sweeps and all 14 platform sweeps pass.

No player-facing string was added or changed; The Boogler's copy is preserved. The existing draft prompt template
`Request stop: to ${label(x)}` remains at `src/entities/railway/halts-view.ts:552`. No ROM data. No push or ship.


## Final checks

All commands had explicit timeouts: 900 s for check/ship-check, 600 s for server/loop, 180 s for registry/level,
1,500 s for looks/scenario and 1,800 s for the two-peer run. `npx prettier --write` ran on changed files; the final
pass left every source and fixture byte unchanged (Markdown follows the repository's ignore policy).

- `npm run check`: pass, 2,100 tests = 2,099 pass, zero fail, one existing TODO (fleet wait bound).
- `node dev/ship-check.ts`: pass, 1,675 tests = 1,674 pass, zero fail, the same TODO; registry, 91 lint files,
  typecheck and 168 affected test files.
- `npm --prefix server test`: 371/371 pass.
- `npm run registry`: pass, 19 presence keys, nine message types, three ops, two states.
- `npm run loop -- run`: canonical plus five alternative orders for 1–4 players, 24 orders, zero softlocks;
  areas 4–9 remain modelled stand-ins. Timings under load are not evidence.
- `npm run level-check`: 14 reports pass, 18 tracks and seven joins. Planned/non-drawn track warnings remain;
  no new production geometry failures.

Logs, including the initial red regression and replaced fixture failures, are copied to
[.look/verification](../../../.look/verification). The post-commit review stamp output is saved there as
`round2-review-stamp.txt` (whole branch) and `round2-review-stamp-fixes.txt` (this follow-up only).
The only remaining required browser gap is the trusted world-inputs fixture mismatch described above; net is
explicitly reserved for the orchestrator. No claim of deployment, device testing, real-time feel or a rider proof.
