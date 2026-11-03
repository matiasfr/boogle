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

Start ownership discovery: `npm run map -- --kind <kind>` (bare `--kind` lists kinds). Follow its companion docs and affected contracts. Combine matching rows below; each is mandatory at its trigger. Topic paths below are under `docs/agents/`; [index](docs/agents/README.md).

| Before | Read |
| --- | --- |
| Applying owner preferences; research, architecture, prototypes | [owner-calls](docs/agents/owner-calls.md) (full calls bind) |
| Game/design/level/art/character work | [DESIGN.md](DESIGN.md), [context](docs/agents/context.md), [routes](docs/agents/routes.md) |
| Game or prototype work | [find-the-fun](docs/plans/find-the-fun.md) |
| Pure docs/tooling | DESIGN.md: Understandable at a glance; Small and readable |
| Design/level/art/characters | [decision index](docs/proposals/boogle-2.md#current-decision-index) and routed dated sections |
| Adding/changing code or module boundaries | [typescript](docs/agents/typescript.md), [lint-boundaries](docs/agents/lint-boundaries.md) |
| Features/entities/HUD/level objects | [plugins](docs/agents/plugins.md) |
| Rendering/art | [rendering](docs/agents/rendering.md) |
| State/events, net*, server, adapters | [sync](docs/agents/sync.md), [room-safety](docs/agents/room-safety.md), [mixed-builds](docs/agents/mixed-builds.md) |
| Touching src/sim or src/world/rules | [lockstep](docs/agents/lockstep.md), sync, room-safety, mixed-builds |
| Controls/interactions/particles/shared registrations | [registries](docs/agents/registries.md) |
| Choosing checks or changing game code | [tests](docs/agents/tests.md) |
| Player-visible/feel changes | [verification](docs/agents/verification.md), look skill |
| Tools/scripts; Codex work | [tools](docs/agents/tools.md); [codex](docs/agents/codex.md) |
| Substantial work/commit/ship | [shipping](docs/agents/shipping.md) |

Before touching high-risk folders, read their nested AGENTS.md; Codex at root must do this explicitly.
