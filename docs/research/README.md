# Research

Background reports that design and technical decisions lean on. Each file states its date, what it covers and how much of it was verified. When a decision in [DESIGN.md](../../DESIGN.md) or [PLAN.md](../../PLAN.md) rests on one, link it from there.

- [water-farming-multiplayer.md](water-farming-multiplayer.md): what makes small drop-in shared worlds fun, water and farming precedents, the deterministic water sim. The source of the "tide-and-garden" direction.
- [netcode-browser-physics.md](netcode-browser-physics.md): netcode models, cross-browser float determinism, NetplayJS, WebRTC vs WebSocket vs WebTransport. Why physics stays host-authoritative and the shared sim stays on integers.

Deep-research reports from 2026-10-29. Each has its working notes (sources, codebase briefs) in [notes/](notes/) under the same name.

- [ambitious-mechanics.md](ambitious-mechanics.md): twelve ambitious mechanics ranked against DESIGN.md; recommends one telegraphed storm-tide cycle (tide, wet slumping sand, ball-breached sea walls, squalls, a two-pusher crate) and ends with a prototype prompt.
- [character-controller-feel.md](character-controller-feel.md): jump shape (fall multiplier, jump cut), spring-driven squash on the capsule, ground snapping, why not active ragdolls.
- [communal-progression.md](communal-progression.md): a short, finite restoration of the island's landmarks, progress shown only as world state, the honk chord as the template for together moments, growth while nobody hosts.
- [creature-ai-and-ecosystems.md](creature-ai-and-ecosystems.md): many cheap cosmetic critters plus at most two real AIs; boids, utility AI and sky-clock schedules, habitat spawn tables, four authority tiers.
- [deterministic-procedural-worldgen.md](deterministic-procedural-worldgen.md): a per-room seeded island built from integer fields, thermal erosion and Priority-Flood drainage, with a timed prototype and blue-noise placement of points of interest.
- [deterministic-sim-at-scale.md](deterministic-sim-at-scale.md): lessons from shipped lockstep games: per-system desync diagnosis, dirty-region hashing and resync, sleeping regions, a GGPO-style sync test instead of rollback.
- [stylized-rendering-on-a-budget.md](stylized-rendering-on-a-budget.md): stylized looks inside the existing shaders on tile-based iPad GPUs: outlines, vertex wind, fog and sky palettes, baked AO, water foam, five ranked prototypes.

New report: add a file here named by topic, start it with an italic date-and-scope line, keep it to what was checked, and add a line to this list.
