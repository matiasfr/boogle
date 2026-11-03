# Required reading by task

Start with `npm run map -- --kind <kind>`; bare `--kind` lists kinds. Pick the route for what changes, then map the affected folder before source reads. Owners and examples locate code, not additional universal reading.

Read must-read sections; read-if-relevant entries become required only when their stated trigger is met. Apply AGENTS.md's literal triggers and the affected nested AGENTS.md, including for reviews. A one-line review or tuning change does not become a design decision because it lives in game code. Follow an existing recipe without re-opening the design corpus; read any contract actually affected. Links are not recursive reading lists. Read more whenever needed to understand and verify the work.

Only making a design decision, adding a mechanic or prototype work requires DESIGN.md, relevant find-the-fun sections, context and the current-decision index. From that index read only the topics it routes, by heading or line range. Dated decisions still bind; an unresolved question is not approval.

`npm run map -- --section <file> '<heading-or-anchor>'` prints a heading and its children, stopping at the next peer/ancestor. Missing or ambiguous headings fail. Use line ranges for individual facts inside a long section. The map validates section references and reports unique Unicode characters in its must-read sections, including AGENTS.md once; nested path rules and conditional reads are separately triggered, not hidden in the cost. Route budgets are in dev/scan/task-routes.ts and enforced by registry. They measure required guidance, not a cap on investigation.

A player-visible behavior change updates the owning docs/game-design section in the same commit; a new system adds a chapter and index line. Refactors and tooling do not. Reviews select the contract being reviewed and do not run implementation checks unless needed for evidence.
