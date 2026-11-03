Before touching src/sim, read [lockstep](../../docs/agents/lockstep.md), [lint-boundaries](../../docs/agents/lint-boundaries.md), [sync](../../docs/agents/sync.md), [mixed-builds](../../docs/agents/mixed-builds.md) and the owning contract found by npm run map.

- Conserved quantities are integers; floats only use + - * / and Math.sqrt. Use seeded mulberry32, fixed order and ticks, never per-peer counters, wall time or native trig. Cosmetic sin/random helpers belong outside src/sim, without three.js, and never feed the sim. Any additional lockstep module joins LOCKSTEP_FILES.
- Keep pure logic here; no renderer, physics or other src imports. Local cosmetics cannot affect conserved state.
- Never silence the replay test to hide nondeterminism.
- Wire changes are additive: preserve existing shapes and meanings, or use a new name/version plus migration. During dev, a clean break needs WORLD_NS and a dated history entry; RULES stays append-only within a namespace. Validate messages, presence and saves from other builds; never crash on them. Skip one-off localStorage migrations.
