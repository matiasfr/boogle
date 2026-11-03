---
name: feature
description: Build a feature in two stages, planned by the planner agent (Opus, high effort) and implemented by the implementer agent (Opus, medium effort). Use when the user asks for a feature that spans several files or touches shared state.
argument-hint: '<name> <what it does>'
---

Build the feature `$0`. Request: $ARGUMENTS

1. **Plan.** Run the `planner` agent with the feature name and the full request. It writes `docs/plans/$0.md`.
2. **Approve.** Show the user the plan's summary, open questions and the path. Stop and wait for their approval or changes. If they ask for changes, send them to the planner (continue the same agent) and show the revised plan.
3. **Implement.** Once approved, run the `implementer` agent with the plan path.
4. **Verify.** Read the diff yourself. Check it against AGENTS.md (sync kind, "Don't" list, lint boundaries, hotspot files), and that the plan's checkboxes are ticked. Run `/simplify` on the diff (and `/code-review` if it touches `src/net*`, `src/world/` or `server/`). Run `npm run check` (`npm run check:full` locally only if `src/net*`, `src/world/sync.ts`, `src/world/game-world.ts` or `server/` changed). Follow AGENTS.md's test diet: new tests for lockstep logic only, new scenarios only for sync contracts, plus its named entity-core exception. For visual or feel changes, use `/look`.
5. **Report.** Tell the user what changed and what to try, and offer `/ship`. If anything deviated from the plan or looks risky in sync, sim or networking code, say so.
