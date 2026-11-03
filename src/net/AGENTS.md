Read the safety reminders below before edits or reviews here. Follow AGENTS.md’s literal triggers for the detailed contracts: [sync](../../docs/agents/sync.md), [room-safety](../../docs/agents/room-safety.md), [mixed-builds](../../docs/agents/mixed-builds.md), [lint-boundaries](../../docs/agents/lint-boundaries.md). Read the owning contract section only when changing or reviewing that contract; links are not recursive reading lists.

- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Keep transport headless; preserve null deletion and missing-as-off semantics.
