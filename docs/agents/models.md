Before delegating work or choosing a model or effort, read this.

## Models and effort

[`dev/models.ts`](../../dev/models.ts) is the single source of truth for which model and effort each kind of work
uses: one table, no modes. `npm run models` prints it; read that rather than a copy of it anywhere else. When the mix
should change (more Codex, less Fable, a new model), the owner says so and the table's rows are edited (owner,
15 November: "just have one schema for model routing that I will update when we need to ... We shouldn't maintain 2
different models at the same time"). The owner's words for each change are in
[owner-calls](owner-calls.md#owners-standing-calls), "Models and effort"; this page holds only the rules in force.

- **Usage limits.** An agent can't read the usage meters. At a Codex or Claude limit, pause and tell the owner (at a Codex limit he activates a banked reset,
  [28 November](../decisions-process.md#d-2026-11-28-mac-builds-banked-resets)); don't
  move the work to another provider unasked. When the owner says a provider is running low, the rows that use it are
  edited, not worked around.
- **Agent frontmatter.** The `planner` and `Explore` frontmatter must match `agents` in
  `dev/models.ts` (`test/models.test.ts`). A row that names a different model for one of those agents is passed as
  the Agent tool's `model` at spawn.
- **Fable is spared** (owner, 15 November: "we have to be very sparing with our fable usage"). The planner runs
  Opus high, Fable medium only for extremely complex work. Fable never runs above high
  (`fableTopEffort`, owner 10 November: "fable high should be the absolute top used") and not at low either (the
  Fable 5.2 system card: low saves about 15% of medium's cost for a clear drop in score).
- **Codex first while it has usage** (owner, 24–25 November 2026: "I have a lot of codex usage left, so I want to maximize usage of astra and sol as much as possible where we can get great results"). Sol 6.2 medium builds from briefs and plans and takes fixes, tooling, mechanical jobs and fresh runners; Astra 6.2 medium builds player-visible and high-risk work (high for tricky work) and stays the first reviewer, a fresh delegate with none of the builder's context; Opus orchestrates, plans and is the other fresh reviewer; Neon keeps story and NPC work and brainstorms. This replaces the next item's build rows.
- **Opus builds, Astra reviews, Neon spreads the load** (superseded for building by the item above) (owner, 24 November 2026: "Make sure we're leveraging codex
  and antigravity neon as well as Claude. Opus medium implement or and Astra reviewer is a good combo, neon good for
  story and npc and also coding"). Opus medium takes the implementation rows, high-risk included; Astra 6.2 medium is
  the first reviewer of an Opus build; Neon medium takes story and NPC work, fixes and tooling, and builds from a plan
  outside the high-risk paths when Claude usage should be spread. Sol keeps images and previz.
- **Codex.** Use Astra 6.2 for independent and code reviews; raise to high for tricky cases. Every Codex result is reviewed before it ships.
  The [Artificial Analysis Coding Agent Index](https://artificialanalysis.ai/agents/coding-agents/comparisons/claude-code-vs-codex)
  (17 November 2026) puts Sol medium at 45 versus 47 at high, and Astra medium at 49 versus 52 at high.
  Medium is our default, not a claim that effort levels are equivalent across providers. No route names
  `gpt-6.1-sol` or `gpt-6-astra` any more (owner, 17 November: "We should not be using Astra or sol 6.1 use SOL 6.2
  and Astra 6.2 instead"; "with the new models we shouldn't have to use high as much, we can use medium in most
  cases"). T3's default effort for the 6.2 models is low, so every delegate passes the row's effort.
- **Antigravity's Gemini 4 Neon is the third pool** (owner, 23 November 2026). It takes the low-stakes rows that
  were on Sol (mechanical jobs above the small-fix size, brainstorms, a fresh runner for owed proofs) and is one more
  choice of fresh reviewer, so Codex keeps the building and Claude the orchestration. Pass `thought_level` from the
  row (T3's default for Neon is high). Why there: published figures put Neon at medium near Astra medium for well
  under Opus's cost per task (Intelligence Index low 44, medium 55, high 60, xhigh 61; Coding Agent Index 59 at xhigh
  in Antigravity against Opus 5.5 max 58 and Astra 53), but early reports also show capacity errors and stalled runs,
  a test suite rigged to pass and stale API knowledge, so it gets work where a stall costs little and the result is
  checked: every Neon result is reviewed like a Codex one, and it does not build `src/sim`, `src/net`, `src/world`,
  `server/` or the wire format. **Where Neon fits** (orchestrator's reading of his 25 November "the right tasks"): story and NPC drafts, brainstorms, fixes, tooling and mechanical jobs outside the high-risk paths, plan builds outside them when Claude usage should be spread, a fresh runner for owed proofs, and the independent review of a player-visible or tooling build when Astra cannot run. Where it does not: anything in the high-risk paths, fixes included; the independent review of a high-risk change while Astra or Opus can run; the look at stills (the main session's); The Boogler's copy (the owner's). `gemini-pro-orchestrator-neon` (Antigravity's planner model) is not on a route.
- **Opus and Astra at medium, high when needed** (owner, 9 November; 24 November 2026 (25 November UTC): "We should be able to use Opus High and Astra High when needed, as well.  Make sure that we're leveraging Google anti-gravity neon for the right tasks."). Rows marked "medium; high for tricky work" run at medium by default. Whoever dispatches may start a task at high when it is tricky going in: a change across sync, lockstep or the adapters, a defect a medium run or a review round already failed on, a review of such a change, or a plan or design question with many recorded rules to reconcile. Otherwise raise one task one level only when it hits bugs it couldn't fix or its result falls short. Say in the claim or report that it ran at high and why. Before raising,
  give the task a way to verify its own work (a failing test, a build, a look, a bot segment); it is often cheaper
  than more effort. A task that Opus high can't solve goes back to the orchestrator, not to xhigh (about 2.5x the
  cost of high for about 1.4 points on SWE-bench Pro). Opus `max` only when the owner asks.
- **"A good model" picks the row, not more effort** (owner, 10 November, after a planner asked for "a good model"
  ran at high: "Fable at medium effort should be sufficient for the future FYI"). Take the model and effort from the
  table as written; high is used as the rule above says, and nothing goes above the row's top effort unless the owner names it.
- **Model floor.** Use Sol 6.2 or above on Codex, Opus or above on Claude and Gemini 4 Neon on Antigravity. The exceptions are read-only Explore
  (Haiku medium) and the on-demand Atlas job (Terra low). A usage reset can inform an owner-directed provider switch, not an automatic downgrade.
- **Code review** never runs in the main session: an Astra review delegate on the committed branch (T3
  `delegate_task`; with no T3 tools, `node dev/codex/run.ts review <topic> --model gpt-6.2-astra --effort medium`).
  Verify each finding against the code before acting on it.
- **Independent review** (owner, 9 November): the reviewer of a lockstep, net, world or server change is a fresh
  agent with none of the author's context, on any model the row names ("the context matters more"). Where a
  suspected defect can be shown by a test, the reviewer writes the failing test instead of only describing it.
- **Design review:** every plan or brief with gameplay calls gets a design review before it is built, by its own
  author in the same context: the [design-review skill](../../.claude/skills/design-review/SKILL.md). The planner
  runs it on its plan, the orchestrator on a brief it writes, a builder on its own plan. There is no `designer`
  agent (owner, 16 November, [fold roles](owner-calls.md#fold-roles)).
- **Who plans.** The builder plans its own work and may revise the plan as it builds (the
  [build skill](../../.claude/skills/build/SKILL.md)). The `planner` agent writes a plan file only for `src/sim`,
  `src/net`, `src/world`, `server/` or the wire format, where the plan is itself reviewed, or when the owner asks
  for one.
- **Small fixes stay where they were found.** About 3 files or 150 lines at most, and nothing
  `npm run review-stamp` marks `review`: the session that found it makes the change itself, the main session
  included. A brief, a worktree and a report cost more than the edit.
- **Brainstorm:** light by default, one agent covering the three role files in `.claude/skills/brainstorm/roles/`;
  `--panel` runs three, one per role, for a new area or big mechanic.
- **Owed proofs** (a rebase, bot runs, stills, tick marks) go back to the builder's own thread, which has the
  context. A fresh runner delegate only when that thread is gone; it reports a failure and doesn't change design or
  game code.
- **Daily jobs** (`dev/daily/jobs.ts`) run on Codex; at a limit they fail and report rather than spend Claude usage
  unattended.
- **Changing a route:** edit the row in `dev/models.ts` (and `agents` plus the agent's frontmatter if it is one of
  the two agents), rewrite the rule above that it changes, and record the owner's words in owner-calls. Use published benchmarks for model selection; a local model comparison is not required.
