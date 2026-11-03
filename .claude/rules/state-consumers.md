---
paths:
  - "src/adapters/**"
  - "src/player/**"
---

Read these safety reminders before edits or reviews in adapters/player. Read [room safety](../../docs/agents/room-safety.md), [sync](../../docs/agents/sync.md), [mixed builds](../../docs/agents/mixed-builds.md) and [registries](../../docs/agents/registries.md) when changing or reviewing the corresponding acceptance, ownership/delivery, wire compatibility or registration contract.

- Apply changes state and returns a result. Put sounds, splashes and inventory in onApplied. submitEdit means queued, not accepted: never spend or play success effects until onApplied.
- Physics is never Lockstep. Owner state uses descriptive untaken presence keys, createSnaps at now - INTERP_MS (20 Hz latest wins); sweep departed peers. Return null when a field stops; missing means off. Use createOwnerSync for handoffs, preserving wire shape and holding semantics. Host fields restart with the next host.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
- Patch actions with wrapAction from onStart; never assign to actionById.
