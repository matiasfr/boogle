# Agent guidance

Owner decision, 2026-11-03: start with little and pull mandatory detail when relevant. AGENTS.md is at most 3,000 bytes; CLAUDE.md's own text is at most 1,000 bytes (wc -c), with only its AGENTS.md import permitted at launch. No topic imports or path-free Claude rules. Skills are discovered by description. Full standing calls remain binding.

The root trigger table replaces the former universal-reading requirements preserved in context.md and routes.md for traceability. DESIGN.md is required for game/design/level/art/character work; find-the-fun.md for game/prototype work. Pure docs/tooling read only DESIGN.md's Understandable at a glance and Small and readable. Routes combine; read the contracts and map companions for the affected kind. Paths in prose/code are repository-relative; Markdown links resolve from their file.

| Topic | Mandatory when |
| --- | --- |
| [routes](routes.md) | Before choosing task-specific reading, use this route map; the root table and the dated decision in README.md supersede the old universal-reading sentences below. |
| [owner-calls](owner-calls.md) | Apply these standing calls whenever their subject arises; the root summaries do not weaken the full calls. |
| [typescript](typescript.md) | Before adding or changing code, read this TypeScript contract. |
| [plugins](plugins.md) | Before adding or changing features, entities, HUD or level objects, read this plug-in contract. |
| [rendering](rendering.md) | Before rendering or art work, read this and src/render/README.md. |
| [sync](sync.md) | Before choosing or changing any state or event delivery, read this sync contract. |
| [registries](registries.md) | Before controls, interactions, particles or shared registrations change, read this registry contract. |
| [lint-boundaries](lint-boundaries.md) | Before changing module dependencies, services or lockstep boundaries, read this lint contract. |
| [room-safety](room-safety.md) | Before changing rules, adapters, presence, room transport or persistence, read these room safety rules. |
| [mixed-builds](mixed-builds.md) | Before changing wire state, ops, messages, catalog entries or persistence, read this mixed-build contract. |
| [tests](tests.md) | Before choosing checks or changing game code, read these test requirements. |
| [verification](verification.md) | Before any player-visible or feel change, read this verification procedure and the look skill. |
| [tools](tools.md) | Before using tools or writing a shot, script or workaround, read this tool table. |
| [shipping](shipping.md) | Before substantial work, committing or shipping, read this shipping procedure. |
| [context](context.md) | For game work, design, level, art or character work, read this context; the root table narrows the old universal-reading sentence to those tasks, and find-the-fun to game/prototype work. |
| [lockstep](lockstep.md) | Before touching src/sim or src/world/rules (including cosmetic helpers), read this and the rules/world contracts. |
| [codex](codex.md) | For Codex work, read this tool mapping before using tools. |
| [claude](claude.md) | For Claude setup, skills, delegation, bot runs or GitHub Actions, read the relevant section here. |

Migration baseline: local origin/main and HEAD both 0c5676206372a6d7ce99c647f1037fefe8524437; AGENTS.md 25,311 bytes and CLAUDE.md 6,310 bytes, 31,621 combined. No network refresh was authorized. The original owner-playtest bullet is unchanged.

Before reviewing enforcement gaps, read the [safety audit](safety-audit.md). It maps every Don't, math, sync, mixed-build and lint-boundary obligation to evidence, path reminders and director follow-ups.

Registry enforces the byte budgets and launch-import restriction, including its JSON mode. Claude path rules use `paths:` followed by quoted, directory-scoped YAML list entries; empty, universal or missing scopes fail. Alternate root launch memories also fail rather than silently bypassing the budget. Ordinary Markdown links are pointers, not imports. Each registry run reports the added milliseconds.
