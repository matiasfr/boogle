# Tests

Run `npm run checks-for`; see [bot checks](test-details/bot-segments.md). Read triggered references. No browser for docs/tooling with no player-visible effect.

- Unit tests (`test/*.test.ts`, `node:test`): pure logic only (determinism, conservation, ordering, validation, serialize/load round-trips); no three.js, DOM or network; well under a second each.
- Local unit and `server/` runs skip the rail audit and sample the offset sweeps; CI runs both in full on main and lockstep ships: [settings](ship-pipeline.md#unit-test-settings).
- A build step runs `node dev/ship-check.ts` (registry, changed lint, typecheck, affected tests). `npm run check` (+ unit tests, level, assets, build) is a checkpoint's or `ship --full`'s; CI is the full merge gate.
- Pre-push: scoped lint, typecheck and affected unit tests; `ship --full` adds full checks. CI has no rendered scenarios; `world-inputs` runs daily on the Mac. [CI scope](ship-pipeline.md#ci-scope).
- `npm run check:full` (+ server tests, headless network test): a checkpoint's for `src/net*`, `src/world/sync.ts`, `src/world/game-world.ts` or `server/` (CI's `server` and `net` still run). New room-interface behavior gets a check in `dev/peer-test/`.
- **Test diet.** Iteration speed matters more than coverage this early. Write new tests only for lockstep code (`src/sim/`, `src/world/rules/`: determinism, conservation, validation). Features, UI, tuning and feel get no unit tests and no new scenario; they get looked at ("See it before you ship"). A new scenario only when a sync contract needs one. The owner's one exception: the entity core's `test/entity-walker.test.ts` and `test/entity-state-node.test.ts`, for walker ordering bugs no still can show; no precedent for testing features.

| Trigger | Required details |
| --- | --- |
| Choosing/running browser scenarios or GPU checks | [scenarios](test-details/scenarios.md) |
| Headless world, the rail loop in Node, or inspecting state | [simulation](test-details/simulation.md) |
| Presence, room or relay changes | [load](test-details/load.md) |
| Many meshes, lights or post passes; count diagnostics | [performance](test-details/performance.md) |
| Any harness run; networking or render-pipeline changes | [gpu](test-details/gpu.md) |
| New level or static object | [level](test-details/level.md) |
| New sync system or big feature | [atlas](test-details/atlas.md) |
