Before touching src/netplay, read [sync](../../docs/agents/sync.md), [room-safety](../../docs/agents/room-safety.md), [mixed-builds](../../docs/agents/mixed-builds.md) and the owning contract found by npm run map.

- Physics is never Lockstep. Owner state uses descriptive untaken presence keys, createSnaps at now - INTERP_MS (20 Hz latest wins); sweep departed peers. Return null when a field stops; missing means off. Use createOwnerSync for handoffs, preserving wire shape and holding semantics. Host fields restart with the next host.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
