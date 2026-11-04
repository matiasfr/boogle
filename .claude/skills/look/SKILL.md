---
name: look
description: Inspect a feature in the running game with targeted stills and real-time motion; use scenario assertions for sync contracts. Use after visual, feel, physics or multiplayer changes to close the loop on your work.
---

# Look and validate

Use `dev/look/` for visual evidence and `dev/scenarios/` for assertions on sync contracts. The harness starts Vite and a local game server, drives Chromium and cleans up after itself. Output goes to `.look/` (gitignored). Open the generated images and watch real-time recordings when judging motion. A visible change puts an inspected still on its PR (`scripts/pr-shot.sh <png>...`; docs/agents/shipping.md, "Shipping", required by AGENTS.md). Evidence and measurement rationale: `docs/research/visual-validation.md`.

Before capturing, name one question, the action that reveals it, the camera/device that frames it, and the expected visible result. A generic island capture only checks startup. Report the observation separately from the command's exit status; never call a low pixel-change score a visual pass.

## Read the relevant reference

Read capture-health for every capture, then only the details used by the task. AGENTS.md and tests.md decide required checks; examples here do not add checks.

- Setting up a capture (camera, eval, action, warm-up): [capture](references/capture.md).
- Owner contact sheets (`npm run sheet`), pacing, checkpoints, filmstrips or motion curves: [playthrough-motion](references/playthrough-motion.md).
- Before/after evidence or two-player captures: [comparison-multiplayer](references/comparison-multiplayer.md).
- Live sessions, first-time playtests or heatmaps: [session-diagnostics](references/session-diagnostics.md).
- Every capture: health, backend and inspection limits: [capture-health](references/capture-health.md).
- Running or writing sync scenarios: [scenarios](references/scenarios.md).
- Measuring render/simulation cost: [performance](references/performance.md).
- Producing clips or video: [video](references/video.md).

## Loop for a feature
Name the visual question, set up the action and view, capture, inspect and fix what is off (up to three rounds per docs/agents/verification.md). Include a concrete observation and any unverified behavior in the handoff. Only add a scenario when a sync contract needs one; visual changes use targeted evidence rather than another test suite.

## Asset motion review

Anything with motion gets an agent motion review in `/character/` before the owner's final check. Use the existing stage and broker/local look path through `node dev/look/asset-motion.ts`; its command help lists asset, clip, pose and camera options. Declare motion in the catalogue, including explicit `none` for static assets. Reuse the game's actual clip or procedural formula; an inspection-only spin must be labelled diagnostic and must never be reported as a production rate.

```sh
node dev/look/asset-motion.ts --broker --asset conductor-cap --clip Walk_Loop --mode played --pose carrying --name cap-carry
node dev/look/asset-motion.ts --broker --asset buddy --clip Walk_Loop --mode raw --name buddy-control
node dev/look/asset-motion.ts --broker --asset feeder-roller --spin-rate 6.283185307179586 --name roller-probe
# Outside a brokered job, replace --broker with --local to use the same local look harness.
```

The cap descriptor resolves to its Buddy attachment. The roller command explicitly requests an inspection probe of one revolution per second; omit `--spin-rate` to verify its declared `none`. JSON retains bone transforms, relative attachment transforms, nearest sampled surface locations and exact Raw clip endpoint differences; CSV retains scalar curves. `*-outliers.json` lists frame numbers, thresholds and units. `*-motion-manifest.json` links the broker manifest and supplemental outputs. Closest-body diagnostics sample up to 96 vertices per attachment mesh against nearby actual posed triangles; signed nearest-face distance identifies candidates, not a watertight intersection proof.

Frame one question with a fixed camera, normal playback speed and no turntable. Keep the consecutive **rendered-frame** sheet, lower-rate full-cycle sheet, real-time video and stage-owned curves together. Curves must come from the visible stage figure, not the background game's player. Inspect attachment-to-bone transforms and posed-body clearance, bone/root steps and loop seams, or angular rate and pivot/axis drift as applicable. Read the frame-numbered outliers and open the sheets; compare a suspect clip against the accepted Buddy Walk_Loop control. Report the frames you actually inspected and distinguish intended attachment seating from a visible penetration defect.

Preserve a failed run and asset version before a targeted repair, then recapture the affected motion on the final source tree. No score or capture-success message approves an asset. Consecutive encoded-video frames can contain repeated or skipped stage frames; stage render IDs establish continuity. Numeric diagnostics, canvas capture and video encoding add overhead and cannot establish display presentation smoothness. State that limit explicitly; the owner retains the final check. Do not add unit tests or scenarios for this review.
