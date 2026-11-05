# GPU failure recovery, 5 November 2026

Local work on `codex/gpu-recovery`, under the owner's early-start exception. Not pushed or shipped.
Serves DESIGN.md **Show, don't tell**, **Leave something for the next visitor**, and **Small and readable**.

## Finding and scope

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

## Regression evidence

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

## Reproduce and limits

```sh
node .look/see-client.ts look --real --warm 1 --hud --query 'proto=place&gpuCase=hidden-loss' --action dev/look/evals/gpu-recovery.ts --name gpu-loss --question 'Is Reload readable after hidden device loss?'
# Other gpuCase values: hidden, loss, error, throw. gpuBaseline=1 records rather than asserts.
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
