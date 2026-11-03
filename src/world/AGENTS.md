Before touching src/world, read [lockstep](../../docs/agents/lockstep.md), [room-safety](../../docs/agents/room-safety.md), [sync](../../docs/agents/sync.md), [mixed-builds](../../docs/agents/mixed-builds.md) and the owning contract found by npm run map.

- Conserved quantities are integers; floats only use + - * / and Math.sqrt. Use seeded mulberry32, fixed order and ticks, never per-peer counters, wall time or native trig. Cosmetic sin/random helpers belong outside src/sim, without three.js, and never feed the sim. Any additional lockstep module joins LOCKSTEP_FILES.
- Apply changes state and returns a result. Put sounds, splashes and inventory in onApplied. submitEdit means queued, not accepted: never spend or play success effects until onApplied.
- Persist only hash-verified ticks; never save or serve a failed-load fresh fallback as the host save. Preserve both guards.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
- Host-only validation facts enter through setEnv / ctx.env. Ops, state and ticks register in rules only; exports supply edits and invariants for replay. Keep world headless.
- Never silence the replay test to hide nondeterminism.
