# Final replay tree verification, 5 November 2026

The full solo bot passed. Continuous co-op failed once during a seated ride, then passed a fresh full 1x repeat. Actual first-stage worker framing passed desktop and touch-profile portrait/landscape inspection. **The first passenger detachment is not conclusively explained by load.** No game code, dialogue or harness source changed; no speculative fix is proposed from one non-reproducing failure.

## Exact boundary

Branch `codex/final-tree-bots`, tested commit **`1b19093f8986b95098dd8e3d33e61b654bbb637b`**, tree **`6ce5e90cbeddbeb33887d0316372a45ba008c6c8`**. This matched cached `origin/main` at task entry and contains both restored input/HUD commits. Every operation manifest below records that clean tree before and after, the same trusted harness tree, and `changedDuringRun: false`.

Local `main` was and remains `c0ba1419`; it is an older local ref. During the runs another job advanced cached `origin/main` to at least `ab86ab75`. Those later changes are **not tested here**. No fetch, checkout, rebase, push or ship was performed. The owner requested staying on this branch and preserving the replay tree. This report's documentation commit follows the tested game tree.

All browser work used the launcher's `.look/see-client.ts` broker. Clients used Node 26.13.0. Dependencies were already installed. `npm run inflight` was omitted because it fetches origin, contrary to the task's local-network-only boundary. An initial unsupported `map --kind verification` was corrected to `review`; documentation work used `docs`.

## Full runs, including the failure

| Run / manifest                                                                              | Result and retained evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Solo](../../.look/evidence/1793898623828-80489/evidence.json)                              | **PASS**, all expected beats, 84 saved checkpoints, zero water falls, zero page/graphics errors. [Full report](../../.look/evidence/1793898623828-80489/run/report.txt), [bot](../../.look/evidence/1793898623828-80489/run/bot.txt).                                                                                                                                                                                                                                        |
| [Continuous co-op, 1.5x cap](../../.look/evidence/1793899013056-94554/evidence.json)        | **FAIL**, last released checkpoint 20/trains. Both interruptions passed. P1 threw `Passenger detached during the ride` before checkpoint 21. P2 reached Far Head dry. The operation also reports `TypeError: fetch failed`; no graphics errors. [Full report](../../.look/evidence/1793899013056-94554/run/report.txt), [complete output](../../.look/evidence/1793899013056-94554/output.txt), [P1 state](../../.look/evidence/1793899013056-94554/run/p1-last-state.json). |
| [Fresh continuous co-op repeat, 1x](../../.look/evidence/1793900161716-26393/evidence.json) | **PASS**, all 23 checkpoints, both interruptions, both dry arrivals, positive contributions and final agreement; zero water falls across all four telemetry segments, zero page/graphics errors. [Full report](../../.look/evidence/1793900161716-26393/run/report.txt), [checkpoints](../../.look/evidence/1793900161716-26393/run/checkpoints.json), [final paired state](../../.look/evidence/1793900161716-26393/run/final-state.json).                                  |

Commands:

```sh
node .look/see-client.ts playthrough --long --stall 1800 --query 'proto=place&shot=play'
node .look/see-client.ts playthrough --players 2 --long --warp-speed 1.5 --stall 1800 --query 'proto=place&shot=play'
node .look/see-client.ts playthrough --players 2 --long --real --stall 1800 --query 'proto=place&shot=play'
```

All three reports were read in full. There are **zero `NEVER` assertions** in the solo and both co-op bot logs; the failed co-op uses a thrown ride assertion instead. Solo leaves `found a crystal` and `did something together` unmarked, not failed required beats. Co-op's per-segment missing-beat lists reset on navigation and omit the solo town tour; they are not whole-route absence claims. Solo records seven `no way yet` planner warnings, failed co-op one, successful co-op three; the passing runs subsequently reach their goals. Telemetry `missed train` marks are retained and are not substitutes for the explicit dry-passenger arrival checks.

The standard solo bot includes its existing staged optional-secret tour after the job and town visits. Only the continuous co-op run claims no skips, fixture poses or recovery teleports. P2 reloads after Q2; P1 navigates away for five seconds and rejoins after Q4, rather than using the menu Leave button. Both entries reported `already playing`.

Successful final co-op state: distinct player identities, one remote each, `ended=true`, `atPier=true`, contributions **153 / 161**, line stages **3 / 6**, all station bills paid, rack disabled with **0 logs / 0 rails**, matching rungs/abilities/gates and **$14,480 / 280 logs / 102 rails / 8 stone / 896 metres**. Both trains are running with matching targets. Final paired position gaps are **0.0068 / 0.0102 m**, inside the existing 2 m tolerance. Both cargo records show line 1 empty, eight ordinary stone crates on line 2, `crane=false`, `kitSent=8`; Q6 has its **32 logs / 32 rails**. This is not a conservation audit or a reload-with-cargo test.

## What the failed ride establishes

P1 first rode Far Head to Village successfully, then sat again for the return. The monitor requires the same car's `carry.on` and no swimming, and throws after more than 250 ms of lost contact (`dev/look/bots/place.ts`, `ride`). The saved end image shows P1 **standing on a train deck with Sit offered**, while P2's image shows a dry Far Head arrival. Zero water falls does not make the failed seated-contact assertion a pass.

The failed final segment has substantial clock drift and sampled train-position gaps, with maxima **17.124 / 29.663 m**. The 1x repeat retains the strict monitor and completes every ride, but still records transient maxima **1.909 / 15.004 m** before final convergence. These are sequential samples including network lag/read skew, not simultaneous visual divergence measurements. Final convergence does not establish smooth remote presentation.

Classification: **real failed assertion, not reproduced on the required fresh rerun; load-associated cause remains unproven**. The two restored UI/input commits are not demonstrated to cause it. A quiet same-tree rerun with paired seat/car-contact evidence is needed to distinguish a game detach from overloaded scheduling/presentation. Do not relax the monitor or add a physics epsilon without that evidence. There is no established smallest game fix to commit from these results, and no scope expansion into train tuning.

## First-stage worker framing

Visual question: **does the actual pre-wake shore worker remain visible above a complete dialogue card, without clipping?** Restored the solo `ask heard` checkpoint and used ordinary bot walking/Interact to open `place-talk-shore`, not a synthetic `startTalk` card. The worker is the pre-wake `Worker` in `residents.ts`, authored at local `(-95,12)` in `shore-layout.ts`. The diagnostic asserts `awake=false`, the actual speaker name and full card containment. Gameplay conversation camera is retained. No new scenario or harness was added.

| Manifest                                                                          | Opened image and observation                                                                                                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Desktop 1180x820](../../.look/evidence/1793901859303-78455/evidence.json)        | `worker-desktop-still.png`: worker and Buddy fully visible above the card; entire line and Bye button readable.                                           |
| [Touch portrait 440x796](../../.look/evidence/1793901992635-81753/evidence.json)  | `worker-touch-portrait-still.png`: actual touch mode confirmed; worker clear above the card, full-width Bye and tap hint visible, no clipping or overlap. |
| [Touch landscape 796x440](../../.look/evidence/1793902019986-83113/evidence.json) | `worker-touch-landscape-still.png`: worker is smaller but fully visible above the card; line, Bye and tap hint remain inside the viewport.                |

All three accepted captures pass WebGPU/capture health with no page/console/graphics errors. This verifies those framings, not every camera angle, physical input or camera-transition smoothness. The talk hides the ordinary Talk prompt; simultaneous bark/prompt separation was not measured by this check. Copy is unchanged, and no suspect Boogler line was identified for editing.

Diagnostic attempts remain visible:

- [Initial phone attempt](../../.look/evidence/1793901890634-79137/evidence.json): failed before interaction because production's diagnostic import map does not expose `shore-layout.ts`. The corrected scratch eval uses its verified authored coordinate; no game or import-map change. The original eval is retained beside this manifest.
- [Narrow keyboard capture](../../.look/evidence/1793901945512-79873/evidence.json): capture health passed and its `worker-portrait-still.png` was opened, but `touch=false` means this is **not phone-touch acceptance**. `BOOGLE_BOOT_FAULTS=1` enables the existing local production proxy; both accepted touch captures then assert `touch=true`. The mistake is preserved, not relabelled a touch pass.

The accepted touch runs use `--production`, `--at 'ask heard'`, the solo save directory, `--query 'proto=place&phoneStartup=1'`, and the existing `--action` seam. [Final diagnostic source](../../.look/evidence/1793902019986-83113/first-worker.ts) is copied alongside the landscape evidence. It changes neither game state ownership nor production code.

## Images opened, checks and limits

Nine PNGs were actually opened with `view_image`: solo `run/end-still.png`; failed and successful co-op `run/end-still.png` and `run/p2-end-still.png`; desktop worker, narrow keyboard portrait, touch portrait and touch landscape stills. Solo ends dry on its optional ledge. Successful co-op images show both players together and dry on the Far Head platform, partly covered by the bot overlay. Failed co-op observations are above. No video, consecutive-frame sheet or curves were inspected; no real-time feel/smoothness claim is made.

The shared machine invalidates timing/frame comparisons as performance evidence. The solo warp's three-call samples reflect skipped draws, not normal gameplay rendering cost. No rendering-cost regression was measured or ruled out here. Quiet reruns remain necessary for timing, remote train motion and the non-reproducing detach; prior background-GPU/grounding risks are not closed by these passes.

`npm run check` passed: lint, TypeScript, 330 unit tests, registry, level and asset checks, and production build. [Check log](../../.look/evidence/1793902019986-83113/check.txt). Prettier was run on both changed Markdown files and the scratch diagnostic, with the ignore file overridden because this repository normally excludes Markdown. No new tests or scenarios; no source changes requiring `check:full`. This report and the tracker link are the only tracked changes. No push or ship. Launcher `handoff.md` and aggregate `evidence.json` are generated after the worker returns; the linked operation manifests already exist.

Not tested on a device.
