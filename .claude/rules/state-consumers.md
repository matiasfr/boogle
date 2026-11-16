---
paths:
  - "src/adapters/**"
  - "src/player/**"
---

Read these safety reminders before edits or reviews in adapters/player. Read [room safety](../../docs/agents/room-safety.md), [sync](../../docs/agents/sync.md), [mixed builds](../../docs/agents/mixed-builds.md) and [registries](../../docs/agents/registries.md) when changing or reviewing the corresponding acceptance, ownership/delivery, wire compatibility or registration contract.

- Apply changes server state and returns a result. Effects follow authoritative receipts or replicated events; declared reversible prediction may show on the press and must not repeat on confirmation. A queued command is not acceptance; a timeout is never success. Follow the feature's correction policy for refusals and unknown outcomes.
- Physics stays Owner. Owner state uses descriptive untaken presence keys, createSnaps at now - INTERP_MS (20 Hz latest wins); sweep departed peers. Return null when a field stops; missing means off. Use createOwnerSync for handoffs, preserving wire shape and holding semantics. Shared outcomes use Server commands and replicas. No tab leads the room; effective prototype seats and Boogler remain Local.
- One-off events use the room interface, never a direct WebSocket; validate and rate-limit each receipt.
- During development, assume current builds: no compatibility fences or save migrations. A wire/state/catalog clean break needs WORLD_NS and a dated history entry. Keep deterministic registration order and validate messages, presence and saves; malformed input must never crash a room.
- Patch actions with wrapAction from onStart; never assign to actionById.
