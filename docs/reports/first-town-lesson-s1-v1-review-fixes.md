> Historical evidence: superseded by the [four-place rework](first-town-four-place-rework.md).
> Current S1 keeps four rider places and v54; eight await the dedicated coach.

# First-town S1/V1: independent-review fixes

16 November 2026. Follow-up to the independent review of `00a52d8f2`, on the same branch,
`t3/first-town-rider-places`. Fetched and rebased cleanly onto `origin/main` at `746fa9539`; the original
implementation rebased to `7eb276367`. The final handoff names the new committed tip. No push or ship.

## Findings fixed

1. **Economy model.** Removed `six` from `SEAT_STEPS`, its tunable, material and Boogle bills, runtime flag,
   catalog offer, install/selection branches and playable-page label. Capacity always uses `riders.perCar`;
   the remaining second-car and express steps add capacity. Regenerated both economy pages from their builders.
   No prior test assertion was weakened. The new test traverses the catalog's town purchases and every town's
   hauled installs, asserting that capacity never falls. It failed before the fix with
   `seat.village.six lowers rider capacity`, then passed. S1's as-built note records the orchestrator's ruling:
   the fit-out waits for the dedicated rider-car design; added rider cars remain a later hub's garage pick.
2. **Rider fit.** Eight roots now occupy the two diagonally opposite end corners where the player seats stop at
   |z|=0.45. They face outward and overlap along the deck, in two heavily crowded groups of four. This is still
   temporary art: eight distinct silhouettes are not legible in the overlapping hats. The body/boots stay upright
   in the car frame, taking its pitch and shudder without the ground folk's additional idle lean. Inspection also
   exposed a one-frame lag: `opening.update` posed folk before the train's `owner.animate` drew the current car.
   Folk now run at animation order 9, after train frames at 7 and kit at 8; roots remain at their intended local
   coordinates as the car accelerates. No car geometry, seats, pet spots or colliders changed.
3. **Anchors.** Updated the three links in `game-design.md`, `town-choice.md` and `town-plots-scarce.md`, including
   the index's v55 label. A repository-wide Markdown search found no remaining old v54 town-economy anchor, and
   the three new links match the current heading.
4. **Plan.** Replaced the S1 “No WORLD_NS bump” paragraph and the contradictory order/bump paragraph with the
   actual v55 rule. S1/V1 remain a pair. L1 needs the next free namespace after v55; C1 can share L1's number only
   when built on that same branch. The owning game-design section describes the corrected view.

No sim rules, namespace value or golden fixtures changed in this follow-up. S1's deliberately changed golden
and v55 bump remain as independently reviewed. `till-view.ts` is untouched, including its pre-existing cap display.
No new player-facing copy; the original garage placeholders remain placeholders. No L1/L2/V2/A/R work.

## Exact rider places

Car-local metres, at the same deck height as before. Positive x faces +π/2; negative x faces −π/2.

| Rider index | x | z | Facing |
| --- | ---: | ---: | --- |
| 0 | −0.77 | −1.145 | −π/2 |
| 1 | −0.77 | −1.09 | −π/2 |
| 2 | +0.77 | +1.145 | +π/2 |
| 3 | +0.77 | +1.09 | +π/2 |
| 4 | −0.77 | −1.035 | −π/2 |
| 5 | −0.77 | −0.98 | −π/2 |
| 6 | +0.77 | +1.035 | +π/2 |
| 7 | +0.77 | +0.98 | +π/2 |

## Opened replacement stills

All paths below are in this checkout's `.look/first-town-review-fixes/`. All five final stills were opened.
As before, the car shots dress **eight local figures over three authoritative riders**; this is a fit proof,
not a new server boarding proof. The pet is granted locally for the capture.

| Requested view | Artifact | Inspected result |
| --- | --- | --- |
| Boarding/halt | [boarding-still.png](../../.look/first-town-review-fixes/boarding-still.png) | Two crowded end groups inside the car, with the bench empty. Hands and hats remain inside the end fittings; no figure visibly passes through a panel, rail or post. |
| Seated player | [seated-still.png](../../.look/first-town-review-fixes/seated-still.png) | Pink Buddy in confirmed seat 1, legs facing out; the standing crowd is beyond the seat and legs. No rider/car intersection. A foreground pole is beside the car, not over the seated player. |
| Pet aboard | [pet-verified-still.png](../../.look/first-town-review-fixes/pet-verified-still.png) | Above-bench view shows the orange pet between Buddy and the crowd, in its unchanged spot. The figures overlap each other, not the pet or fittings. The numerical triangle check below includes the pet. |
| Walking deck length | [walk-mid.png](../../.look/first-town-review-fixes/walk-mid.png) | Frame at 0.65 s of the action-started recording: orange Buddy mid-stride over the deck's middle, away from the end groups. The walk logs local z −1.5 → +1.580, still aboard, with no rider within the 0.55 m crossing probe. |
| Cars tab | [cars-still.png](../../.look/first-town-review-fixes/cars-still.png) | “Four seats, eight riders”, its description, Seats 4 and Riders 8 are legible. |

Also opened the [walk motion sheet](../../.look/first-town-review-fixes/walk-action-motion.png). It shows the
walk starting at one end and finishing at the other while both crowds stay with the car. The existing non-solid
bench still lies across the walk; this does not establish a physical aisle through its geometry. No rider crossing
was observed or logged. [Video retained](../../.look/first-town-review-fixes/walk-action-realtime.webm), not claimed
as watched in real time; smoothness and device performance remain unverified.

**Car intersection check:** the diagnostic reads the actual posed head, coat/hat and limb instance triangles,
transforms them into the current car frame, and tests the recipe's side/end panels, rails, posts, conservative
knob boxes and bench boxes. The final four car runs have eight samples each: **32 sampled poses, zero hits**.
The pet run also compares the rider triangles against the visible pet's transformed triangles: zero hits.
Across those samples, the complete rider meshes fit within about |x| ≤ 1.0671 and |z| ≤ 1.4664; hats are above
the side rails, and hands stop inside the end panels at |z|=1.5. These are sampled rendered-geometry results,
not a proof over every possible pose or a GPU performance measurement.
[Probe source](../../.look/first-town-review-fixes/clearance.ts),
[sample summary](../../.look/first-town-review-fixes/clearance-summary.json).

**Rejected attempts:** an initial diagnostic chose an unrelated limb mesh, producing nonfinite bounds; those
results were discarded and the probe now selects the matching instance capacity and refuses nonfinite geometry.
The first valid inward layout still touched waist rails and then end fittings because of idle lean and the
one-frame lag; it was rejected. A shorter upright trial cleared sampled fittings, then the update order was
fixed and the end groups spread out again to the final positions above. Initial pet framings hid its spot behind
a pole or the bench; the above-bench view replaces them. The first walk completed during warm-up, so its images
are excluded: `first-town-walk.ts` now starts the walk as the capture action, after warm-up.

## Checks and results

Node 26.13.0. Logs below live in `.look/first-town-review-fixes/`; full capture commands and source stamps are in
the corresponding look logs. Source edits were formatted; no existing assertions, hooks or checks were bypassed.

| Check | Result |
| --- | --- |
| `git fetch origin && git rebase origin/main` | PASS; clean rebase onto `746fa9539`. |
| `npm run map -- --kind feature-fix`; `npm run inflight`; `npm run checks-for` | PASS discovery. In-flight decision-log work did not overlap these edits. The check selector includes the original pair's rules/server diff, already tested and independently reviewed; this follow-up changes the offline model and view. |
| New monotonic-capacity regression before the fix | Expected FAIL: `seat.village.six lowers rider capacity`; full output below, `economy-before.log`. |
| `node dev/economy/build-trade-page.ts`; `node dev/economy/build-prototype.ts` | PASS; both generated pages refreshed, `build-trade.log`, `build-prototype.log`. |
| `node --test test/economy-trade.test.ts test/economy-playable-trade.test.ts test/economy-prototype.test.ts` | **31 PASS**, zero failures; includes the new regression and generated-page source hashes. `economy-after.log`. |
| `node --import ./test/helpers/rail-no-audit.ts --test test/economy*.test.ts test/railway-trade.test.ts` | **108 PASS**, zero failures/skips/todos. `affected.log`. |
| Scoped `npm run lint -- <edited TS files>` | PASS in each iteration; final run covers eight TS files, `lint-complete.log`. |
| `npm run typecheck` | PASS in each iteration, `types-complete.log`. |
| Five final `npm run look` captures | PASS capture health: WebGPU, advancing completed frames, no graphics/page/console errors. `look-boarding.log`, `look-seated.log`, `look-pet-verified.log`, `look-walk-action.log`, `look-cars.log`. Opened and judged above. |
| Other look attempts | Capture health passed, but invalid diagnostic/geometry and weak-framing/warm-up attempts were rejected as described above. The intermediate pet-top view was inspected and then supplemented by the final pet triangle check. All logs retained. |
| Rendered-geometry summary | PASS: 32 final sampled poses, no rider/car hits; pet run also has no rider/pet hits. `clearance-summary.json`. |
| Anchor and stale-line assertions; `git diff --check` | PASS: three current links, no old anchor, both contradictory lines removed, no whitespace errors. |
| `npx prettier --write <edited TS files>` | PASS; `format.log`, `format-view.log`, `format-eval.log`. |
| `node dev/ship-check.ts` | Run last on the committed tip; result supplied in the final handoff and `ship-check.log`. |

No new rule change, golden regeneration, full server/network rerun, independent re-review, push or ship in this
follow-up. The original pair's prior full-suite results remain historical; the final gate checks the new tip.

## Expected regression failure before the fix

The following is the complete emitted failing-test block from `economy-before.log`.

```text
✖ failing tests:

test at test/economy-trade.test.ts:29:1
✖ trade: every offered rider-capacity purchase and hauled install preserves or increases capacity (1.171334ms)
  AssertionError [ERR_ASSERTION]: seat.village.six lowers rider capacity
      at TestContext.<anonymous> (file:///Users/matiasfranco/.t3/worktrees/boogle/t3-79075968-07d2dc860060b044/test/economy-trade.test.ts:35:12)
      at Test.runInAsyncScope (node:async_hooks:226:14)
      at Test.run (node:internal/test_runner/test:1402:25)
      at Test.start (node:internal/test_runner/test:1262:17)
      at startSubtestAfterBootstrap (node:internal/test_runner/harness:387:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```
