# Visual validation: evidence before a pass

> **Verdict:** Separate capture health from visual judgment; state the question first.
> **Top recommendations:** 1. Separate capture health from visual judgment. 2. State a question, action, view/device and expected visible result. 3. Keep stills and contact sheets for composition and coarse poses.
> **Status:** adopted.

2 November 2026. Serves DESIGN.md's "Small and readable" and "Light tests, real playtests".

## Observed failure

The old `look` command sampled eight screenshots over two seconds and reported their mean pixel variation. In a disposable tab, stopping `renderer.setAnimationLoop` and emitting an uncaught page error plus a `THREE.` console error still produced exit 0, a zero motion score and 60.6 "fps". The FPS helper counted its own rAF callbacks. An ordinary shoreline heatmap mainly showed intended water animation. Neither result established visual correctness or smoothness.

## Precedents and differences

- [Unreal's Screenshot Comparison Tool](https://dev.epicgames.com/documentation/en-us/unreal-engine/screenshot-comparison-tool-in-unreal-engine) compares captured images across builds, with camera/resolution settings, tolerances, controls for noisy rendering, and separate local/global error. Boogle's temporal heatmap has no reference image or expected result: it is a diagnostic, not that kind of regression test. We keep manual targeted inspection during rapid iteration instead of adding reference-image maintenance.
- [Unity's Performance testing API](https://docs.unity3d.com/6000.0/Documentation/Manual/com.unity.test-framework.performance.html) adds performance measurement and configuration metadata to its test framework. Boogle keeps performance questions in its existing perf/hitches tools; capture success makes no claim about a device's performance budget.
- [Godot's Performance monitors](https://docs.godotengine.org/en/stable/classes/class_performance.html) define FPS in terms of rendered frames and expose process time separately. Boogle can count completed game frames through the existing profiler. This checks that its render loop advances; it does not prove GPU presentation or good frame pacing.
- [Playwright Screencast](https://playwright.dev/docs/api/class-screencast#screencast-start) can start/stop a recording around actions, with a chosen size and encoding cadence. It is already in the pinned Playwright version. Boogle uses it with normal wall time, unlike its existing virtual-time promo recorder. Recording has overhead and a finite frame cadence, so use the game and hitches profiler for performance judgments.

## Recommendations

1. Separate capture health from visual judgment. Fail captures on page/console errors, a wrong backend, missing frame instrumentation or a stopped game loop. Keep artifacts for diagnosis.
2. State a question, action, view/device and expected visible result. A default hill capture only checks startup. The agent reports the observation and what remains unverified.
3. Keep stills and contact sheets for composition and coarse poses. Observe real-time motion for feel and timing; do not infer smoothness from sparse samples or virtual-time footage.
4. Make heatmaps opt-in for a selected region and a stability question. Variance discards frame order and mixes intended movement with defects; there is no universal good score. Preserve existing scenario diagnostics without making them acceptance criteria for unrelated features.
5. Reuse the harness, profiler and Playwright. Add no dependency, permanent scenario or general screenshot-baseline suite for this tooling repair. Validate it with disposable fault-injection evals and the existing world-inputs scenario.
