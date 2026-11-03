Before choosing task-specific reading, use this route map; the root table and the dated decision in README.md supersede the old universal-reading sentences below.

## Required reading by task

Read this entire file for every task, in every tool. The routes below add requirements; they never exempt a rule here. Combine routes when a task crosses kinds, follow the owning code and dependencies, and read any contract the change touches. Start with `npm run map -- --kind <kind>` using the exact kinds below; its owners, examples and companion docs supplement this index. If none fits, list kinds with `npm run map -- --kind`, then map the affected folder.

**Default:** DESIGN.md and docs/plans/find-the-fun.md above remain mandatory. **Pure tooling or documentation** with no game behavior, design, level, art or character decision is exempt from the full DESIGN.md and find-the-fun reads; read DESIGN.md's [Understandable at a glance](../../DESIGN.md#understandable-at-a-glance) and [Small and readable](../../DESIGN.md#small-and-readable) for that work. If scope reaches the game, take its route and the default reads. This is routing by relevance; all necessary reading and verification still apply.

| Task / map kind | Required sections and contracts beyond the default |
| --- | --- |
| HUD: `hud` | A feature is a plug-in; Shared registries; [entity lifecycle](../../src/entity/entity.ts); map's HUD chapters; verification below. |
| Objects: `entity`, `critter`, `hat` | A feature is a plug-in; Rendering; Pick a sync kind; Shared registries; [entity lifecycle](../../src/entity/entity.ts), [render contract](../../src/render/README.md), map's asset/system docs; decision log for character/art/design. |
| Controls: `control`, `interactable`; tuning: `tuning` | Shared registries; Pick a sync kind; [controls contract](../../src/player/controls.ts), [hands](../../src/player/hands.ts); map's player/system chapters. Physics also requires replay below. |
| Shared simulation: `lockstep-op`, `lockstep-system` | Pick a sync kind (including Lockstep math); Shared registries; Lint boundaries; Don't; Mixed builds; [rules recipe](../../src/world/rules/README.md), [world contract](../../src/world/README.md); map's system chapters. |
| Networking: `presence-field`, `one-off-message` | Pick a sync kind; Shared registries; Don't; Mixed builds; [room contract](../../src/net/README.md), [world contract](../../src/world/README.md) for sync/persistence; map's multiplayer chapters. Transport/server work also maps its affected folder. |
| Level: `poi`; experiment: `prototype` | A feature is a plug-in; Rendering; Pick a sync kind; [island recipe](../../src/island/README.md) for level work; map's companion docs; decision log. |
| Rendering/art: `entity` (or the affected object's kind) | Rendering; [render contract](../../src/render/README.md); decision log; map's system/asset docs; verification's performance and GPU triggers. |
| Tooling: `tooling`; documentation: `docs` | The explicit default-read exception above; map's companion docs; the contracts whose guidance or tooling changes. Game-design documentation also takes the relevant game route. |

**Before design, level, art or character work:** read the [current-decision index](../proposals/boogle-2.md#current-decision-index) and every dated section it routes for the task, including its precedence notes. The full log remains available; an index does not turn an open question into a decision.

**Before choosing checks or changing game code:** read [docs/agents/tests.md, Tests](tests.md#tests). **Before a player-visible or feel change:** also read its [See it before you ship](verification.md#see-it-before-you-ship) procedure and the [look skill](../../.claude/skills/look/SKILL.md). **Before using tools or writing a shot, script or workaround:** read [docs/agents/tools.md, Tools and skills](tools.md#tools-and-skills); **for Codex work**, also read [Codex](codex.md#codex). **Before substantial work, committing or shipping:** read [docs/agents/shipping.md, Shipping](shipping.md#shipping). These linked procedures are binding, with the obligations below always in force.
