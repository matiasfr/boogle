Read the safety reminders below before edits or reviews here. Follow AGENTS.md’s literal triggers for the detailed contracts: [lockstep](../../docs/agents/lockstep.md), [room-safety](../../docs/agents/room-safety.md), [sync](../../docs/agents/sync.md), [mixed-builds](../../docs/agents/mixed-builds.md). Read the owning contract section only when changing or reviewing that contract; links are not recursive reading lists.

- Conserved quantities are integers; floats only use + - * / and Math.sqrt. Use seeded mulberry32, fixed order and ticks, never per-peer counters, wall time or native trig. Cosmetic sin/random helpers belong outside src/sim, without three.js, and never feed the sim. Any additional lockstep module joins LOCKSTEP_FILES.
- Apply changes state and returns a result. Put sounds, splashes and inventory in onApplied. submitEdit means queued, not accepted: never spend or play success effects until onApplied.
- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- During development, assume current builds: no compatibility fences or save migrations. A wire/state/catalog clean break needs WORLD_NS and a dated history entry. Keep deterministic registration order and validate messages, presence and saves; malformed input must never crash a room.
- Host-only validation facts enter through setEnv / ctx.env. Ops, state and ticks register in rules only; exports supply edits and invariants for replay. Keep world headless.
- Never silence the replay test to hide nondeterminism.
