Read the safety reminders below before edits or reviews here. Follow AGENTS.md’s literal triggers for the detailed contracts: [sync](../../docs/agents/sync.md), [room-safety](../../docs/agents/room-safety.md), [mixed-builds](../../docs/agents/mixed-builds.md), [lint-boundaries](../../docs/agents/lint-boundaries.md). Read the owning contract section only when changing or reviewing that contract; links are not recursive reading lists.

- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- During development, assume current builds: no compatibility fences or save migrations. A wire/state/catalog clean break needs WORLD_NS and a dated history entry. Keep deterministic registration order and validate messages, presence and saves; malformed input must never crash a room.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Keep transport headless; preserve null deletion and missing-as-off semantics.
