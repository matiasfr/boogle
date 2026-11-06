# Development compatibility inventory: tuning and registries

5 November 2026. Inventory against local `origin/main` at `a2df1b35`, before this cleanup, implementing the owner's "No old builds in development" call.

| Machinery | Decision | Reason |
| --- | --- | --- |
| `src/sim/tune.ts`: `tuneCatalog`, `TUNE_CATALOG`, save catalog field and catalog hash seed | Cut | Fingerprints only distinguish builds. Current values and revision already enter the deterministic hash. |
| `src/sim/tune.ts`: retired keys, override-only migration, frozen published-v1 bounds and migration | Cut | Old saves are discarded by the single namespace reset. |
| `src/world/rules/tune.ts`: version/migrate metadata and commit catalog field | Cut | No old profiles or builds are supported. |
| Complete effective tuning values and revision; keys, integer bounds, cost-fit constraints, controller authorization, request IDs and stale-revision rejection | Keep | Current-room deterministic agreement and malformed-input safety. |
| `src/net/ws-room.ts`, `ws-wire.ts`: `tc`, incompatible-catalog refusal and close code | Cut | Obsolete client half of an admission fence already removed from the server in Slice 3. |
| `src/debug/dev/tunables.ts`, `dev/playtest/summary.ts`: exported/recorded fingerprint | Simplify | Keep build, values, configured-value digest, revision and setup evidence without compatibility identity. |
| `test/tune.test.ts`, `server/test/world-host.test.ts`, old main tuning fixture, `dev/look/evals/tunables-proof.ts` | Simplify | Delete migration/mismatch proofs; retain current round-trip, malformed save, controller and stale-revision checks. |
| `dev/registry/scan.ts`: `compareRegistries`, saved shape inspection and version metadata | Cut | These enforce support for older builds. |
| `dev/registry/check.ts`: loading historical source and `.js`/`.mjs` fallbacks; `debt.ts` old linter filename fallback | Cut | Only current registrations and current debt file names are needed. |
| Current-tree registration collisions, frame order boundaries, import knots, debt budgets and local base archive | Keep/simplify | Current architecture protections, not compatibility. Archive debt files only; no fetch or historical code import. |
| `test/registry.test.ts`: mixed-build/version/removed-op assertions | Cut | Current-tree collision tests remain. |

The namespace reset is coordinated once for the complete cleanup. Gameplay values, controller rights, accepted edit ordering and The Boogler's copy are unchanged. World hash numbers change with the removed catalog identity; deterministic behavior does not.
