Before changing wire state, ops, messages, catalog entries or persistence, read this mixed-build contract.

## Mixed builds
**Dev phase (until public playtests), owner call "No old builds in development":** assume every client is current; an old tab may hit bugs, and that is accepted. Write no compatibility code, version fences, capability gates, save or localStorage migrations, or mixed-build tests, and cut such code where you find it. To remove or reshape ops, states or catalog entries, bump `WORLD_NS` in `src/world/namespace.ts` in the same commit with a dated history line, so the durable world starts fresh instead of being migrated. Registry checks current-tree collisions and architectural debt; it does not compare builds' wire contracts.

The server still validates every message and must not crash on malformed input (room safety). Current checkpoint integrity, verified-save guards, ordered replay and request idempotency remain required. Update notices bring tabs onto the current build without promising compatibility. Revisit a supported-build policy when public playtests start; no dormant migration framework is maintained now.
