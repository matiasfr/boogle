Before touching server, read [sync](../docs/agents/sync.md), [room-safety](../docs/agents/room-safety.md), [mixed-builds](../docs/agents/mixed-builds.md), [tests](../docs/agents/tests.md) and the owning contract found by npm run map.

- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Validate host-only facts through setEnv / ctx.env; deterministic ordering and ticks, never per-peer counters. Pure logic belongs in sim and registration in world/rules.
- Never silence the replay test to hide nondeterminism.
