# Development state and recovery cleanup, 5 November 2026

> **Verdict:** State and recovery cleanup; load current state only.
> **Top recommendations:** none; inventory of what was cut under the "No old builds in development" call.
> **Status:** adopted.

The owner's **No old builds in development** call supersedes historical recovery and migration requirements. This inventory was made against local `origin/main` at `a2df1b35`, after Slice 3; the branch uses one dated `WORLD_NS` break for changed save shapes.

| Disposition | Machinery | Reason |
| --- | --- | --- |
| Cut | `server/src/host/railway-v0-code.ts`, `railway-v0-migration.ts`, `server/src/legacy/`, frozen `src/sim/railway-v0.ts`, `railway-frozen-v1.ts`, `railway-supply-frozen-v1.ts`, `tune-v0.ts`, `tune-supply-v1.ts`, and corresponding frozen world rules/indexes | These source hashes, old simulations and replay registries exist solely to upgrade old saves. |
| Cut | `server/test/railway-supply-migration.test.ts`, historical recovery JSON fixtures, `test/fixtures/snap-v02.json`, old-version snapshot tests | They prove historical compatibility, not current room safety. |
| Cut | `RAILWAY_LEGACY_PLAY_NS`, `isLegacyPlayableRailwayRoom`, old `t1v02` dispatch and its extra test matrix | Only current production and the still-used isolated headless proof need railway hosts. |
| Simplify | `StateHandlers`, `sync.ts`, current railway/tune state registration | Save and load current state directly: remove `version`, `migrate`, snapshot `vers`, newer-save skipping and partial mixed-registry hash comparison. Compare the complete current world hash. |
| Simplify | `world-host.ts`, `hosted-room.ts`, world READMEs, `world-inputs` | Load current recovery directly; status reports bad-load safety. Production input parity compares actual registration/catalog data without per-state versions. |
| Keep | Current recovery schema discriminator, namespace/catalog identity, exact registry, checkpoint hash, checksum, bounded ordered tail, durable-before-publish barrier, atomic replacement | Validate the document and accepted work; malformed or corrupted data must not become a healthy fresh fallback. These are room safety and current durability. |
| Keep | `badSave`, verified client hashes, rejected-edit handling, malformed-data tests, current round-trips, server crash/restart and conservation tests | They protect current rooms and prove current rules, not older builds. |
| Keep | `t1v01-proto-*` isolated T1 rooms and current classic route | Still-used test/experiment behavior with separate current authority; not old-build compatibility. |

Gameplay rules, arithmetic and Boogler copy stay unchanged. Historical dated evidence remains historical; current contracts now describe current-state loading.
