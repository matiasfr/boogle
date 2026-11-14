# Works bot: stale input assumptions (14 November 2026)

**Case (a): bot defect, not a missing player stop request.** Base: local `origin/main` and starting HEAD
`a69d19aa3e7b54ac3b637d4c243976f203cdff95`, clean, branch `codex/works-bot-fix`. No fetch: external network was
forbidden. All browser work used the existing broker and local servers, bounded by `timeout 1800`.

## Cause and repair

The unchanged bot failed twice waiting for `railway-request-aboard` / `Request stop: Quarry`. The diagnostic repeat
observed support `railway:train2-1`, with `place-sit` / **Sit** selected throughout the wait. Its read-only train
query reported Quarry requestable at the Village. The repeat HUD still visibly shows **E Sit**.

[seat.ts](../../src/entities/railway/seat.ts) intentionally lets a nearby chair compete with the aboard request.
[train-view.ts](../../src/entities/railway/train-view.ts) still constructs `Request stop: ${halt.name}` for all
cars of the rider's train. The seated `also` chip preserves that target; `inEngineCab` controls the cab cutaway,
not the request. [halts-view.ts](../../src/entities/railway/halts-view.ts) uses the separate platform wording
`Request stop: to ${label(x)}` and guards it with [lever-place.ts](../../src/entities/railway/lever-place.ts)'s
platform reach/height test. Changing aboard wording to the platform wording would be wrong.

The shared [ride bot](../../dev/look/bots/railway-ride.ts) now turns away from a selected **Sit** until the existing
aboard request wins. It presses through the normal input helper, retains the destination-name assertion and
observes accepted arrival. The same selection handling covers `askEach`.

That exposed two further stale approaches: straight disembarkation stopped below Quarry's platform lip; the old
3 m lever approach stopped below the platform beside the relocated lever. Reuse the existing real-jump `hopTo`
helper to disembark, and finish a planned 0.6 m lever approach before `use`. No recovery, teleport, direct command,
shared-state write, game prompt or player-facing string changed. No game defect was established or P1–P3 game
finding assigned. Principle: **Small and readable**.

## Runs and inspected evidence

Initial machine load averages: **20.45 / 25.03 / 18.43**. The broker initially queued behind another job, then
load-gated (observed as high as 104). Loads below are the trusted harness's acquisition → end one-minute averages;
the manifests identify the actual worker tree separately from the launcher harness. No duration is performance
or feel evidence. No source changed during a run.

| Run                                            | Result                                                     | Load          | Manifest                                                           |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Unchanged main, exact requested segment        | FAIL: missing Quarry prompt at 86.6 s                      | 29.43 → 14.97 | [baseline](../../.look/evidence/1794674222853-71864/evidence.json) |
| Unchanged main, read-only prompt probe and HUD | FAIL: same prompt at 86.7 s; Sit selected                  | 9.81 → 4.78   | [repeat](../../.look/evidence/1794674836181-83453/evidence.json)   |
| Turn past Sit                                  | Quarry request/arrival passed; FAIL disembarkation         | 10.35 → 8.33  | [turn](../../.look/evidence/1794675037940-84055/evidence.json)     |
| Add platform hops                              | Throat, kiln and first footing passed; FAIL lever approach | 7.77 → 20.60  | [hop](../../.look/evidence/1794675201565-84886/evidence.json)      |
| Final bot: full works-arrive → wagon coupled   | PASS, 314.4 s; no recovery or missed beats                 | 29.39 → 6.33  | [complete](../../.look/evidence/1794675427082-88765/evidence.json) |
| Routed production playthrough through T1       | PASS; all expected beats, zero errors                      | 4.56 → 3.58   | [T1](../../.look/evidence/1794675838529-89584/evidence.json)       |

Every run used WebGPU, advanced completed frames and reported no graphics errors. The complete run used the
original `dev/look/evals/railway-works-bot.ts`, original seed and stop query. At its final checkpoint: `shed.stall=2`,
`cradleRails=8`, `table=1`, and train slot 1 has `wagon=true`. Both footing trips, cradle fit and table turn precede
the final checkpoint. Its source tree is `f1d4ec5f94572315205f1f6969cd59764942c021`; only this report was added later.
The read-only diagnostic eval is retained beside the repeat evidence as `works-probe.ts`.

Visual question: does the bot get past the aboard request and complete the intended works sequence? Opened the
baseline and repeat end stills, both intermediate failure stills, the final works still **and motion sheet**, and
the T1 end still. Also opened the original rotunda report's first Works failure still. The repeat visibly selects
Sit; the intermediate stills show Buddy below the platform edges; the final still shows Buddy at the table with
an empty back and the train beyond. The wagon/coupling is distant and partly covered by bot notes: accepted rows,
not this framing alone, establish coupling. T1 ends with Buddy wearing the conductor hat beside the completed
opening work. Sparse final frames do not establish real-time smoothness. Not tested on a device.

## Other bots

- `railway-ride.ts`: owns the failed exact aboard expectation; repaired here. Platform requests already match the
  `^Request stop` prefix, so the added `to ...` words were not the failed wording assertion.
- `railway-legs.ts`: shares `line2Rides`, including `askEach`; inherits the repair. Its full route was not rerun.
  Ring and steel routes share this helper too; not rerun.
- `railway.ts`: its earlier `boilerToPier` ride helper also uses `^Request stop` at platform levers, but only rides
  to line ends and explicitly requests nothing aboard. It retains its own approach/disembarkation code; no claim
  that those later rides passed. Its later Works route calls the repaired helper.
- Forge-lit playthrough: `railway-job.ts` and `railway-forge-lights.ts` run `railway.ts`; the forge-lit checkpoint
  precedes boiler fitting and trains. It does not exercise this expectation. Forge-lit was not rerun.
- The separate `railway-request-stop.ts` eval also passively waits for the aboard ID; it has the same potential
  chair-selection exposure, but was not changed or rerun in this task.

## Validation and boundaries

Scoped Prettier and lint passed. `timeout 900 npm run check` passed (exit 0): lint, typecheck, registry, level,
assets, prefabs and production build; 2,052 unit cases, 2,051 passed, zero failed, one existing TODO. The TODO is
the longer-fleet `b011e7` wait bound (1,146 ticks against 1,050), explicitly marked TODO in
`test/railway-install.test.ts`, not a new passing assertion. [Full log](../../.look/works-check.log).

`timeout 600 node dev/ship-check.ts` passed (exit 0): registry, one lint file, typecheck and 19 affected test files
(164 cases passed, zero failed or TODO). [Log](../../.look/works-ship-check.log). `git diff --check` passed.
No new unit test or scenario: this is input automation, with the existing real-input route as its regression proof.
No sync/server/performance change, so no net or perf run. `npm run inflight` was skipped because it fetches from
GitHub; local remote-tracking refs were inspected instead. No ROM data. No push or ship.
