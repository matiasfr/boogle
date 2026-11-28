Before changing wire state, ops, catalogs or persistence, read this contract.

## Mixed builds
Until public playtests, develop for the current build. Remove compatibility shims, capability gates, save/localStorage migrations and mixed-build tests. Live deploy admission is the exception. Reject a missing or mismatched server build or world before joining. Supported pages reload once Pages and the host agree. See the [handover proof](../plans/live-deploy.md#local-handover-proof).

When removing or reshaping ops, state or catalog entries, bump WORLD_NS in src/world/namespace.ts with a dated history line in the same commit. A wipe starts a new save. Registry checks current-tree collisions and architectural debt. Validate all messages and retain verified checkpoints, failed-load guards, ordered replay and request idempotency. Revisit supported builds at public playtests.
