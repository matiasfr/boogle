# Independent review: heavy load

Reviewed `a91bd86636840d8c8f62661dc2bab87aea3c6124` against parent
`303e30a8a663f2e64f78510f66ba3975990ce74d`, including all 37 changed files and the committed plan.
Review stamp against that parent: `1a0ca5725646`. No production edits, push or ship.

## Finding

**P2 — Heavy-load feeding breaches the existing High Gorge delivery bound, hidden by the new test policy.**

Location: `test/railway-route-rules.test.ts:119-120`; the behavior being excluded is the additional take
enabled by `src/sim/railway-queries.ts:89-92`.

Start at the existing `ringRivetSequence` fixture. While each section wants stock, both players take depot
logs, take depot rails, then feed the frame, every tick. This is the parent's original accepted input
sequence. With the new heavy allowance it reaches High Gorge after **5,438 ticks**, with frame-idle samples
`1129, 560, 717, 1832`. The identical reduced test run against an exported copy of the parent passes at
**3,618 ticks**, with `1129, 559, 363, 363`. The binding gate in
`docs/plans/greybox-route.md:1688-1689` requires at most 3,700 total and at most 600 for each later frame.

The added guard makes the checked-in transport suite skip the second pickup at comfort, so it no longer
exercises this supported overfill sequence. The separate heavy-load tests cover balances and movement
queries, not this transport guarantee. Preserve the original workload in the gate and address the changed
delivery schedule. Progression still completes and conservation holds; this finding is a rule-level timing
regression, not a measured human travel-time result or a permanent soft-lock.

Failing test: `review: deliberate mixed overfill retains the existing High Gorge delivery timing bound`,
in `test/review-heavy-load-route.test.ts`.

```sh
node --import ./test/helpers/rail-no-audit.ts --test test/review-heavy-load-route.test.ts
```

This fails on the reviewed commit and passes on its parent with the same test file. Parent source was
exported read-only to `/tmp/boogle-heavy-load-parent.WcJu1h`; no shared dependencies or author checkout edits.

## Other checks and evidence

- 92 existing tests passed: `railway-heavy-load`, `railway-read-session`, `railway-replicate`,
  `railway-line-authority`, `railway-cart`, and `railway-route-rules` (the commit's comfort-only version).
- 23 tests passed together: the five new checks in `test/review-heavy-load.test.ts`, plus
  `railway-boiler` and `railway-set-down`. New checks cover packed forge/depot/shelf boundaries and
  prediction, a two-player contested extra pile, and every overloaded packed/unpacked count through
  save/load and session renewal.
- Seven tests passed: the actual server host-trace replay and `server-image` checks.
- `npm run loop -- run` passed. It uses straight-line walking and does not model heavy movement or terrain.
- The host-trace binary comparison independently found exactly 205 namespace changes, 205 checksum changes
  and 2,518 `snapBytes` changes. All 8,596 ordered records otherwise match their parent.
- Re-running the parent's original route test file against the new code produced 43 passes and two failures.
  The meaningful failure was reduced above. The other expected train slot 4 but got 5 after the altered
  feeding schedule; the boarding wait still passed, so train identity alone is not reported as a defect.
- Scoped formatting, lint and typecheck passed for the review additions.

Runtime probe:

```sh
npm run look -- --real --rail-seed glide-earned --eval dev/look/evals/review-heavy-load.ts --warm 0 --hud --name review-heavy-load-2 --question 'Do heavy movement gates preserve swim ascent and does hold Drop restore mobility?'
```

Passed with WebGPU, advancing frames and no page/console/graphics errors. Accepted live operations acquired
the pack, air-jump ability and 24 logs. Walking measured 3.35944 m/s. Ground jump, air jump and glide were
blocked; the hook press did not start a pull. Swimming remained available (`vy=4.80314` while overloaded).
Holding Drop removed all 24, and ground jump and glide worked afterward. The first attempt failed in the
probe's reward-dismissal setup: it used the world Interact action instead of the menu key. The corrected
second attempt passed.

Artifacts are `.look/review-heavy-load-2-verdict.json`, `-still.png`, and `-motion.png`. Both images were
inspected; they frame the terrain after the assertions, not the movement sequence. Runtime claims above
come from executed assertions and state samples, not from those images. No real-time motion/feel judgment.

Code inspection also checked the seat exit ordering (seat handler 21 precedes the heavy gate 23), shared
carry exclusivity, every resource source's `free`/`roomFor` use, 24-count transfer validation, and normal
bot travel loads. No additional reproduced defect in those paths. Movement is Owner state; server-owned
counts and shared pure arithmetic determine its local scale. There is no new cross-client float equality
requirement under the current sync contract.

## Glider/hook branch interaction and limits

`hook-shot.ts:87` and `glide.ts:50` reject overload regardless of where or when the abilities are granted;
`view.ts:432` also clears dry-land jump input. An earlier first-climb glider, jamb switch and one-pull route
still require cargo at or below comfort (8, or 16 with the pack). Preserve reachable drop recovery before
that climb/flight and at its landings. This is an integration condition, not a reproduced defect in the
other branch; its combined code was not reviewed or run.

This review did not traverse every ledge, water edge, summit or train boarding point while overloaded;
teleports isolated the runtime controller checks. Active hook/glide cancellation, a live two-client
heavy-cargo trip/help-carry, a browser reload mid-overload, and device input remain unverified at runtime.
Save/session and multiplayer state behavior were exercised in the tests above. The runtime hook assertion
did not include a successful light-load pull at the same pose, so it is weaker evidence than the code check.
The existing exhausted-pile-pool drop refusal remains as disclosed in the implementation plan.
