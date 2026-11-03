# Tests

Read this core when choosing checks, then only the references whose triggers are met. No browser for docs/tooling changes with no player-visible effect.

- Unit tests (`test/*.test.ts`, `node:test`): pure logic only (determinism, conservation, ordering, validation, serialize/load round-trips); no three.js, DOM or network; well under a second each.
- `npm run check` (lint, typecheck, unit tests, registry, build; seconds): before every push.
- `npm run check:full` (+ server tests, headless network test, ~30 s): CI runs it on every PR anyway; run it locally only when you touch `src/net*`, `src/world/sync.ts`, `src/world/game-world.ts` or `server/`. New room-interface behavior gets a check in `dev/peer-test/`.
- **Test diet.** Iteration speed matters more than coverage this early. Write new tests only for lockstep code (`src/sim/`, `src/world/rules/`: determinism, conservation, validation). Features, UI, tuning and feel get no unit tests and no new scenario; they get looked at ("See it before you ship"). A new scenario only when a sync contract needs one. The owner's one exception: the entity core's `test/entity-walker.test.ts` and `test/entity-state-node.test.ts`, for walker ordering bugs no still can show; no precedent for testing features.

| Trigger | Required details |
| --- | --- |
| Choosing/running browser scenarios or GPU checks | [scenarios](test-details/scenarios.md) |
| Headless simulation, player/ball physics or inspecting state | [simulation](test-details/simulation.md) |
| Presence, room or relay changes | [load](test-details/load.md) |
| Many meshes, lights or post passes; count diagnostics | [performance](test-details/performance.md) |
| Any harness run; networking or render-pipeline changes | [gpu](test-details/gpu.md) |
| New level or static object | [level](test-details/level.md) |
| New sync system or big feature | [atlas](test-details/atlas.md) |
