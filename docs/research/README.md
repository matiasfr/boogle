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
- [controls-guide-and-pause-menu.md](controls-guide-and-pause-menu.md): one registry that describes every control and generates the guide, a pause view as a local overlay over a world that keeps running, paper-card presentation sized for the couch, and a phased plan.
- [progression-feel-exploration.md](progression-feel-exploration.md): incremental/idle design (Pecorella, Lantz, Candy Box, A Dark Room), communal progression (Stardew bundles), vehicle feel (Lonely Mountains, Mario Kart Wii, TotK, cannon-es suspension maths), exploration in social games (Journey, BotW, Outer Wilds, Tunic). Feeds [docs/proposals/](../proposals/README.md).
- [hub-and-minigames.md](hub-and-minigames.md): Club Penguin, Toontown, Habbo, Splatoon, Animal Crossing, Jackbox and Fall Guys on hub spaces, mini-games, personal economies and drop-in play. Feeds [docs/proposals/hub-and-minigames.md](../proposals/hub-and-minigames.md).
- [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md): House House on Big Walk (short-range voice, tools to reconnect, folk games, the ritualized goodbye) and Untitled Goose Game (mundane stakes, moments-then-systems, music as narrator), plus Journey. Feeds [docs/proposals/story-and-finale.md](../proposals/story-and-finale.md).
- [_primary-source-notes.md](_primary-source-notes.md): raw fetched facts and quotes behind the reports, with fetch status. No proposals.

- [0.1/](0.1/): the 0.1 direction (2026-10-30/31; the briefs say "v2"): what is settled ([SETTLED.md](0.1/SETTLED.md)), the haul-stack resource loop ([7-resource-loop.md](0.1/7-resource-loop.md)), sources, contribution tiers and casual play ([8-collecting-tiers.md](0.1/8-collecting-tiers.md)), rarity done kindly ([9-brainrot-hooks.md](0.1/9-brainrot-hooks.md)), and identity, persistence and the groundwork milestones ([10-groundwork.md](0.1/10-groundwork.md)). Plan: [docs/plans/0.1-groundwork.md](../plans/0.1-groundwork.md).

New report: add a file here named by topic, start it with an italic date-and-scope line, keep it to what was checked, and add a line to this list.
