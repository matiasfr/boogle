---
name: look
description: Inspect a feature in the running game with targeted stills and real-time motion; use scenario assertions for sync contracts. Use after visual, feel, physics or multiplayer changes to close the loop on your work.
---

# Look and validate

Use `dev/look/` for visual evidence and `dev/scenarios/` for assertions on sync contracts. The harness starts Vite and a local game server, drives Chromium and cleans up after itself. Output goes to `.look/` (gitignored). Open the generated images and watch real-time recordings when judging motion. A visible change puts an inspected still on its PR (`scripts/pr-shot.sh <png>...`; docs/agents/shipping.md, "Shipping", required by AGENTS.md). Evidence and measurement rationale: `docs/research/visual-validation.md`.

Before capturing, name one question, the action that reveals it, the camera/device that frames it, and the expected visible result. A generic island capture only checks startup. Report the observation separately from the command's exit status; never call a low pixel-change score a visual pass.

## Read the relevant reference

Read capture-health for every capture, then only the details used by the task. AGENTS.md and tests.md decide required checks; old broad examples do not add checks.

- Setting up a capture (camera, eval, action, warm-up): [capture](references/capture.md).
- Pacing changes, checkpoints, filmstrips or motion curves: [playthrough-motion](references/playthrough-motion.md).
- Before/after evidence or two-player captures: [comparison-multiplayer](references/comparison-multiplayer.md).
- Live sessions, first-time playtests or heatmaps: [session-diagnostics](references/session-diagnostics.md).
- Every capture: health, backend and inspection limits: [capture-health](references/capture-health.md).
- Running or writing sync scenarios: [scenarios](references/scenarios.md).
- Measuring render/simulation cost: [performance](references/performance.md).
- Producing clips or video: [video](references/video.md).

## Loop for a feature
Name the visual question, set up the action and view, capture, inspect and fix what is off (up to three rounds per AGENTS.md). Include a concrete observation and any unverified behavior in the handoff. Only add a scenario when a sync contract needs one; visual changes use targeted evidence rather than another test suite.
