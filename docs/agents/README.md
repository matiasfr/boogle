# Agent guidance

Owner decision, 2026-11-03: start with little and pull mandatory detail when relevant. AGENTS.md is at most 3,000 bytes; CLAUDE.md's own text is at most 1,000 bytes (wc -c), with only its AGENTS.md import permitted at launch. No topic imports or path-free Claude rules. Skills are discovered by description. Full standing calls remain binding.

Owner call, 3 November 2026 (narrow routes): AGENTS.md's literal behavior triggers replace broad category and recursive-companion reading. DESIGN.md and relevant find-the-fun sections are required only for design decisions, new mechanics or prototype work. A tuning change, bug fix, review, tooling task or existing recipe does not trigger them by itself. Read the decision log's routing table and only the touched topics' Current rules. Dated decisions and all safety obligations still bind.

[Routes](routes.md) explains section reads and costs. `npm run map -- --kind <kind>` is the maintained task index, separating must-read from read-if-relevant; registry checks references and per-route character budgets. [Context](context.md#principle-index) lists principle names for commits. [Tests](tests.md) and the [look skill](../../.claude/skills/look/SKILL.md) use linked details. [Owner calls](owner-calls.md) apply whenever their subject arises. Root triggers link the remaining contracts.

Migration baseline: local origin/main and HEAD both 0c5676206372a6d7ce99c647f1037fefe8524437; AGENTS.md 25,311 bytes and CLAUDE.md 6,310 bytes, 31,621 combined. No network refresh was authorized. The original owner-playtest bullet is unchanged.

Before reviewing enforcement gaps, read the [safety audit](safety-audit.md). It maps every Don't, math, sync, mixed-build and lint-boundary obligation to evidence, path reminders and director follow-ups.

Registry enforces the byte budgets and launch-import restriction, including its JSON mode. Claude path rules use `paths:` followed by quoted, directory-scoped YAML list entries; empty, universal or missing scopes fail. Alternate root launch memories also fail rather than silently bypassing the budget. Ordinary Markdown links are pointers, not imports. Each registry run reports the added milliseconds.
