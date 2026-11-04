# Boogle

Goofy co-op browser game: three.js WebGPU + TSL, Rapier and Vite; a WebSocket server hosts lockstep rooms. Main auto-deploys to boogle.club.

- Keep The Boogler's copy; list suspect lines for the owner.
- No ROM data or anything cut from it, on any branch or in builds.
- Codex first; pause and tell the owner at a usage limit.
- Stop at the owner's playtest; full exceptions are in owner-calls.
- Usage is no reason to hold back: read and verify what the work needs.
- Decisions live in the repo and bind every agent.
- Never force-push, skip hooks or push main unless a human asks.
- Ship with npm run ship; report only verified states.

Start with `npm run map -- --kind <kind>`. Read its must-read sections. A row applies only when its trigger is literally met, including in a review; read-if-relevant becomes required at its stated trigger. Use `map -- --section <file> <heading>` or line ranges; links are not recursive reading lists.

| When the task actually does this | Read |
| --- | --- |
| Applies an owner preference; researches or decides architecture | [owner-calls](docs/agents/owner-calls.md), applicable calls |
| Picks a milestone, makes a design decision, adds a mechanic, or prototypes | game-direction skill; [context](docs/agents/context.md), DESIGN.md, relevant find-the-fun sections; [decision index](docs/proposals/boogle-2.md#current-decision-index), then only routed topics |
| Adds or edits code | [typescript](docs/agents/typescript.md) |
| Changes imports, module boundaries or service/loop ownership | [lint-boundaries](docs/agents/lint-boundaries.md) |
| Adds or changes feature/entity lifecycle, DOM or loading | [plugins](docs/agents/plugins.md) |
| Changes materials, lights, shaders or render pipeline | [rendering](docs/agents/rendering.md), affected contract sections |
| Chooses/changes state ownership or event delivery | [sync](docs/agents/sync.md) |
| Changes apply, accepted effects, presence, transport or saves | [room-safety](docs/agents/room-safety.md) |
| Changes wire shapes/meaning, ops, catalogs or persistence | [mixed-builds](docs/agents/mixed-builds.md) |
| Touches or reviews lockstep math (including cosmetic helpers in sim) | [lockstep](docs/agents/lockstep.md) |
| Changes actions, interactions, particles or shared registrations | [registries](docs/agents/registries.md) |
| Chooses checks | [tests](docs/agents/tests.md), triggered references only |
| Changes what a player sees or feels | [verification](docs/agents/verification.md), look skill; update owning game-design section |
| Uses tools/scripts; runs as Codex | [tools](docs/agents/tools.md); [codex](docs/agents/codex.md) |
| Substantial work, commit or ship | [shipping](docs/agents/shipping.md); principle names in [context](docs/agents/context.md#principle-index) |

Read nested AGENTS.md before high-risk edits or reviews (Codex too). For src/adapters and src/player read .claude/rules/state-consumers.md. Safety rules stay binding.
