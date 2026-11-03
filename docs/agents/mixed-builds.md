Before changing wire state, ops, messages, catalog entries or persistence, read this mixed-build contract.

## Mixed builds
Tabs reload onto new deploys (`src/features/updates.ts`), but a visible tab waits until hidden, so rooms mix builds for a while. Wire changes are additive (new ops, states, presence keys, message types; old tabs ignore them). Never change an existing one's shape or meaning without a version: a state's `version` + `migrate`, or a new name.

**Dev phase (until public playtests):** progress may be lost, so prefer a clean break over compatibility code. To remove or reshape ops, states or catalog entries, bump `WORLD_NS` in `src/world/namespace.ts` in the same commit and add a dated line to its history comment. Old tabs then live in a different room and never meet the new world, and `npm run registry` skips its mixed-build comparison; this is the only way past that check. Skip one-off localStorage migrations (a new key, or ignoring the old one, is fine). Still binding: `RULES` is append-only within a namespace, a shape change without a bump needs `version` + `migrate`, and nothing may crash on another build's messages, presence or saves.
