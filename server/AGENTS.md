Read the safety reminders below before edits or reviews here. Follow AGENTS.md’s literal triggers for the detailed contracts: [sync](../docs/agents/sync.md), [room-safety](../docs/agents/room-safety.md), [mixed-builds](../docs/agents/mixed-builds.md), [tests](../docs/agents/tests.md). Read the owning contract section only when changing or reviewing that contract; links are not recursive reading lists.

- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- During development, assume current builds: no compatibility fences or save migrations. A wire/state/catalog clean break needs WORLD_NS and a dated history entry. Keep deterministic registration order and validate messages, presence and saves; malformed input must never crash a room.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Bind authenticated session/player identity and validation facts in the server command context. Commands use `ops.define`; apply changes state and returns a result. Keep deterministic ordering and ticks, never per-peer counters. Pure logic belongs in sim and registration in world/rules. Register only Server-kind checkpoint state; seats and accepted reaction events remain transient.
- Never silence the replay test to hide nondeterminism.
