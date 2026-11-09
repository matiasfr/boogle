# GPU failure recovery, 5 November 2026

> **Verdict:** GPU failure recovery that does not stop play on every uncaptured error.
> **Top recommendations:** none; record of the GPU failure recovery work.
> **Status:** adopted. See [plan round-4-notes](../plans/round-4-notes.md).

Local work on `codex/gpu-recovery`, under the owner's early-start exception. Not pushed or shipped.
Serves DESIGN.md **Show, don't tell**, **Leave something for the next visitor**, and **Small and readable**.

## Follow-up: isolated errors remain playable

The coordinator correctly identified a regression in the first patch: every uncaptured GPU error stopped play.
Commit `fb86cfb1` replaces that policy. One error, or many errors in one turn, retains the mark and console error
and lets rendering continue. Device loss and a thrown game callback still immediately show Reload.

After an uncaptured error, subsequent callbacks receive GPU validation/internal/out-of-memory scopes and a
submitted-work fence. Results are processed in submission order without awaiting them inside the game loop.
Only **60 consecutive checked callbacks that submit a render and report GPU errors** stop graphics. This counts
repeated failing submissions, not messages, rAF callbacks, elapsed time or throughput. Sixty is a conservative
policy allowance, not a measured device timeout. A clean checked submission resets the streak and marks
`graphics recovered`; two 40-error runs separated by a clean draw remain playable.

At most eight checks are pending. An unchecked draw, unavailable check or visibility transition invalidates the
streak: contention cannot turn missing evidence into failure. Normal never-errored frames add no scopes/fences;
no render passes or draw calls were added. Clean scopes/completion prove API-level recovery, not pixel
presentation. A GPU that never resolves checks cannot be declared failed from elapsed time by this policy.
Telemetry now includes real draw-call counts, the failed-draw streak and recovery marks alongside the existing
bounded error/visibility/loss/reload context. Room ownership and the manual same-URL Reload are unchanged.

### Cached playdata

This worktree has no `.look/playtest`. The existing cache in `../boogle-daily/.look/playtest` was read without
modification or network download.

- Grant session `mw1kz9dd-y00icjb2`: instance-buffer overflow at session t=19.1. After it: 48 position records
  (10 distinct rounded positions), 10 perf records and 7 input records, then hides at t=67.2 and 74.6. Simulation
  and recording continued; that does **not** establish visible rendering recovery. The existing video review
  describes a frozen world. The next session, `mw1l0y9o-1aphq1mf`, has no recorded errors after reload.
- iPhone session `mw390tiz-5ucocwxd`: hide at t=2873.7, show and `InvalidStateError` from
  `GPUDevice.createCommandEncoder` at t=2897.2 (48:17). No later position, perf or gameplay records exist, only
  a two-touch input batch and the final hide/end at t=2901.1. The cache does not show play carrying on.
- `src/proto/playdata/record.ts` deduplicates error text with `seen`. One logged record does not prove one
  occurrence, so neither recording establishes a repetition rate or successful GPU recovery.

**Grant's freeze remains unexplained by this patch.** Its relationship to the iPhone error is unproven.

### Fresh checks and visual inspection

All runs used the broker against this worktree's local build, with `changedDuringRun=false` and no concurrent
source edits. These probes cover final production code; the final two-burst probe also covers the last test-only
edit increasing each burst from 12 to 40. Full bot/scenarios/Reload tested clean `fb86cfb1`; later edits only
update this report and the round-4 tracker.

| Check | Verified result and manifest |
| --- | --- |
| Single real validation error | Recovery mark, continued rendering, no Reload. [Manifest](../../.look/evidence/1793901170893-62116/evidence.json). |
| 80 errors in one turn | Continued rendering, no Reload. [Manifest](../../.look/evidence/1793901194636-62774/evidence.json). |
| Two 40-error runs | 80 injections, two recovery marks (`recoveredAfter=39` each), continued rendering, no Reload. [Manifest](../../.look/evidence/1793901379719-67998/evidence.json). |
| Sustained errors | 61 injections (initial error plus 60 checked failing draws); stop at streak 60, zero later render calls, usable Reload. [Manifest](../../.look/evidence/1793901252924-65052/evidence.json). |
| Hide/restore | Zero hidden render calls, resumes without failure UI; health passes. [Manifest](../../.look/evidence/1793901269559-65507/evidence.json). |
| Hidden device loss | Real destruction, three's lost flag, zero later render calls, same URL/room, usable Reload. [Manifest](../../.look/evidence/1793901286848-65754/evidence.json). |
| Thrown callback | Immediate fallback assertions pass. Injected exception, not Safari's native cause. [Manifest](../../.look/evidence/1793901302953-66234/evidence.json). |
| Actual Reload | Accepted gift ID 2 remains ID 2 after Reload and rejoining the same URL. [Manifest](../../.look/evidence/1793901958957-80530/evidence.json). |
| `world-inputs` | All 7 assertions pass; no GPU errors. [Manifest](../../.look/evidence/1793901954466-80253/evidence.json). |
| `smoke` | All 8 assertions pass, matching world hashes; no GPU errors. [Manifest](../../.look/evidence/1793901945485-79927/evidence.json). |
| Full place bot | Finished with every expected beat and no GPU errors. [Manifest](../../.look/evidence/1793901511994-73014/evidence.json), [report](../../.look/evidence/1793901511994-73014/run/report.txt). |

Fault-injection assertions pass but generic capture health exits 1 because injected console errors remain,
including survivable-error and successful Reload checks. Errors were not filtered to make health green.
Ordinary visibility, both scenarios and the full bot exit 0.

Opened fresh images: `gpu-final-error-still.png`, `gpu-final-burst-still.png`, `gpu-final-recovered-still.png`,
`gpu-final-sustained-still.png`, `gpu-final-hidden-still.png`, `gpu-final-hidden-loss-still.png`,
`gpu-final-throw-still.png`, `gpu-final-reload-still.png`, bot `run/end-still.png`, and smoke `Alice-still.png` /
`Bob-still.png`, beside the linked manifests. Visual question: does a survivable error leave the island visible,
while a terminal failure gives a readable Reload instruction? Survivable/burst/recovered/ordinary-hidden stills
show the island without Reload. Sustained/loss/throw show a centered, unclipped Reload card. The Reload still
shows the island and welcome-back message; smoke shows both peers. The bot end still shows the avatar on a
platform and `THE END` in its debug overlay. These are still observations, not motion-quality judgments.

`npx prettier --write` ran on changed files. `npm run check` passed after the last code/test edit: lint, typecheck,
**330/330 tests**, registries, levels, assets and build. [Check log](../../.look/check-gpu-revised.log).

### Earlier pier cutoff

The earlier failed run used the default harness budget. `dev/look/playthrough.ts` grants 300 seconds by default,
1800 with `--long`. The pier's `THE JOB IS DONE` is not `bot.finish()`: the place bot still rides home, visits town
and tours secrets before setting `__placeDone`. `no way yet to (1364, -164)` is a partial-route diagnostic, not
a terminal failure.

The available comparison, `../final-tree-bots/.look/evidence/1793898623828-80489/evidence.json`, tested base
`1b19093f` with `--long --stall 1800 --query 'proto=place&shot=play'`. It logged the same route diagnostic, then
completed. This branch changes no bot/navigation code, and its earlier run contained no GPU error or graphics
stop. The fresh run with those exact flags completes every expected beat. The earlier failure is explained by
the shorter harness budget, not a demonstrated branch regression. These budget/code-path facts are not a
performance comparison; shared-machine timings and frame numbers are not evidence of speed or smoothness.

### Remaining limits

Visibility is synthetic Page Visibility, not real OS suspension/eviction. Real Safari background/restore, device
loss behavior and original-failure attribution remain unverified. A quiet device rerun is needed for real-time
feel and background recovery; bot completion itself is now verified. No push or ship command ran.
No Boogler copy was edited; no suspect Boogler lines were found in scope. No ROM data. Stop here;
not tested on a device.

## Historical first-patch finding and scope

The sections below retain the first patch's evidence. Its fatal-single-error policy and incomplete bot result
are superseded by the follow-up above; they are not the current behavior or verification status.

**This does not explain Grant's freeze.** His recorded instance-buffer overflow and the iPhone's background-return
`createCommandEncoder` error remain distinct observations; their relationship is unproven. The original Safari error
was not reproduced. What was reproduced and repaired is a silent graphics-failure path.

- `main.ts` gives three.js one animation callback. Browser suspension normally stops rAF; Boogle previously had no
  explicit hidden guard around the callback's physics, water compute and draw work. Input clears on hide, quality
  resets its draw deadline, and playdata records hide/show and flushes on hide. `world/background.ts` independently
  advances the shared world while hidden; it is unchanged. The server remains the room's authority.
- Installed three.js `WebGPUBackend.js` forwards uncaptured errors to `onError`, and device loss to `onDeviceLost`,
  except intentional `reason=destroyed`. Its default lost handler sets `_isDeviceLost`. Boogle's replacement omitted
  that handler, automatically reloaded visible tabs, and otherwise relied on a visibility event. A repeat within a
  minute only showed a lobby note. GPU validation errors were logged without a player-facing failure action.
- The baseline action destroyed the real GPUDevice after a synthetic hide. There was no loss mark, no Reload
  instruction, and further render calls continued with `_isDeviceLost=false`. Capture health still passed: callbacks
  returning are not GPU presentation evidence. The opened still showed the retained island without any failure UI.

`scene.ts` now preserves three's lost handler, observes deliberate destruction too, and latches device loss,
uncaptured GPU errors or a thrown game callback into a Reload instruction. `main.ts` uses the guarded callback:
hidden callbacks and callbacks after a failure do no game-frame work. There is no additional loop, render pass,
renderer, mesh or normal-frame telemetry allocation. The existing lobby supplies the failure UI; original startup
failure copy is retained. No Boogler copy was edited; no suspect Boogler lines were found in this scope. No ROM data.

The state is **Local**. Failure does not navigate, reset the room, change its URL, disconnect it deliberately, or
change saves, ops or wire formats. Reload is an explicit same-URL browser reload. Server-owned progress survives;
this is not a promise to restore unsaved personal state. No reconstruction of a live three.js renderer is attempted.

Session marks now include `graphics visibility`, `graphics device lost`, `graphics stopped` and `graphics reload`.
They retain cause/reason, a bounded message, visibility, time since the last visibility transition, draw calls and
triangles; `gpu error` gains the same context. They use the existing bounded playdata queue and upload path. Console
errors remain visible to the harness. No frame-rate or timing threshold decides that the GPU failed.

## Historical first-patch regression evidence

All browser work used the already-running broker against this worktree's local server. No source was edited during
a run. Manifests retain tested commit/tree and `changedDuringRun=false`. Production `src/` is unchanged since
`e16fcac8`; subsequent commits add regression actions and this report. The final check covers those actions too.

| Check | Result and manifest |
| --- | --- |
| Baseline hidden device destruction | Silent dead-device path; [manifest](../../.look/evidence/1793898757385-86997/evidence.json). Health status 0 is not a recovery pass. |
| Hidden loss | Assertions pass: zero render calls while hidden and after fault, renderer lost flag set, same room/URL, usable Reload. [Manifest](../../.look/evidence/1793898963738-91412/evidence.json). |
| Ordinary hide/restore | Assertions and capture health pass: zero hidden render calls, calls resume on restore, no failure UI. [Manifest](../../.look/evidence/1793899023162-94650/evidence.json). |
| Real GPU validation error | Invalid buffer usage reaches the real uncaptured-error path; assertions pass, no further render calls, Reload visible. [Manifest](../../.look/evidence/1793899069963-96198/evidence.json). |
| Thrown callback | Injected synchronous exception passes fallback assertions. This tests the exception path, not Safari's native `createCommandEncoder` cause. [Manifest](../../.look/evidence/1793899149982-99527/evidence.json). |
| Visible loss | Real device destruction passes the same loss/room/UI assertions without a hide. [Manifest](../../.look/evidence/1793899213362-1541/evidence.json). |
| Actual Reload | In a disposable classic room, submit the smoke scenario's gift edit, wait for acceptance, force loss, click Reload, rejoin and verify gift ID 2 remains ID 2 at the same URL. Assertions pass; the reopened scene draws. [Manifest](../../.look/evidence/1793899814606-16926/evidence.json). |
| `world-inputs` | All 7 assertions pass; no graphics errors. [Manifest](../../.look/evidence/1793899899623-20202/evidence.json). |
| `smoke` | All 8 assertions pass: two players, accepted gift, moving ball, matching world hashes, no world or graphics errors. [Manifest](../../.look/evidence/1793900089877-21331/evidence.json). |
| Full place bot | **Failed to finish.** Reached the pier and the end screen, then logged `no way yet to (1364, -164)` before the harness wall cutoff. No graphics errors; do not call the route green. [Manifest](../../.look/evidence/1793899257074-2499/evidence.json), [read report](../../.look/evidence/1793899257074-2499/run/report.txt). |

The four direct fault captures intentionally exit 1: retained errors and zero completed game frames fail generic
capture health even though the recovery assertions pass. The successful Reload check also exits 1 because its
earlier injected device-loss error is retained. No errors were filtered to make a capture green. An initial Reload
probe checked the button before the injected module action completed and failed; the action now waits for an
explicit assertion-completion marker. [Retained failed probe](../../.look/evidence/1793899727936-10947/evidence.json).

Opened images: `gpu-before-still.png`, `gpu-after-still.png`, `gpu-hidden-still.png`, `gpu-error-still.png`,
`gpu-throw-still.png`, `gpu-visible-loss-still.png`, `gpu-reload-still.png`, bot `run/end-still.png`, and smoke
`Alice-still.png` / `Bob-still.png`, each beside its manifest. The visual question was whether graphics failure gives
a readable instruction and usable Reload instead of silently retaining the island. The four fault stills show the
centered card and Reload button without clipping at 960×600. Ordinary restore shows the island without that card;
the reload still shows a newly drawn classic island. Smoke shows both peers; the bot still shows “Thanks for
playing!” despite its incomplete harness result. These are still observations, not motion/smoothness judgments.

`npx prettier --write` ran on changed files. `npm run check` passed: lint, typecheck, **330/330 unit tests**, registry,
level checks, asset checks and production build. [Check log](../../.look/check-gpu.log). The two production-file diff
and regression actions were re-read for scope and simplification. `inflight` was skipped because it fetches remotely,
contrary to this task's network restriction; only cached branch refs were inspected. No push or ship command ran.

## Reproduce and historical limits

```sh
node .look/see-client.ts look --real --warm 1 --hud --query 'proto=place&gpuCase=hidden-loss' --action dev/look/evals/gpu-recovery.ts --name gpu-loss --question 'Is Reload readable after hidden device loss?'
# Other gpuCase values: hidden, loss, error, burst, recovered, sustained, throw. gpuBaseline=1 records rather than asserts.
node .look/see-client.ts look --real --warm 1 --hud --action dev/look/evals/gpu-reload.ts --name gpu-reload --question 'Does accepted room progress survive Reload?'
node .look/see-client.ts scenario world-inputs
node .look/see-client.ts scenario smoke
```

Visibility here is a synthetic Page Visibility sequence, not real OS suspension, eviction or Safari's driver reset.
Forced loss uses the real GPUDevice and `lost` promise; the validation error is real, while the frame exception is
injected. Neither establishes the original error's cause. Shared-machine timings and frame numbers were not used
as performance evidence. A quiet rerun is needed for the unfinished bot; actual background/restore on Safari and
mobile, real-time feel and original-failure attribution remain unverified. Stop here pending that verification;
not tested on a device.
